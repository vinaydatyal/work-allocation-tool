/**
 * Vercel Serverless Function: /api/clickup/webhook
 *
 * ClickUp Webhook Ingestion Engine (Phase 5)
 *
 * Captures real-time ClickUp task events and synchronizes deliverable states:
 * - taskStatusUpdated: Closes tasks, marks deliverables completed, restores team capacity.
 * - taskTimeTrackedUpdated: Ingests ClickUp time tracking entries directly into Supabase time_logs.
 * - taskAssigneeUpdated: Re-maps assignees to internal agency specialists.
 *
 * Environment variables:
 *   VITE_SUPABASE_URL     — Supabase Project URL
 *   SUPABASE_SECRET_KEY   — Service role / admin key (preferred) or VITE_SUPABASE_ANON
 *   CLICKUP_WEBHOOK_SECRET — Optional ClickUp webhook secret for HMAC SHA256 verification
 */

import crypto from 'crypto';

export default async function handler(req, res) {
  // CORS & Health check
  if (req.method === 'GET') {
    return res.status(200).json({ status: 'ok', endpoint: 'ClickUp Webhook Listener' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://xqfihbxihlufglrqalyd.supabase.co';
  const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.VITE_SUPABASE_ANON || 'sb_publishable_3m8gmqelS2hnhi199n3-bA_ZIEBL9p5';
  const WEBHOOK_SECRET = process.env.CLICKUP_WEBHOOK_SECRET;

  const payload = req.body || {};
  const eventName = payload.event;
  const taskId = payload.task_id;
  const historyItems = payload.history_items || [];

  // Optional: Verify signature if secret configured
  const signature = req.headers['x-signature'];
  if (WEBHOOK_SECRET && signature) {
    try {
      const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
      const computed = hmac.update(rawBody).digest('hex');
      if (computed !== signature) {
        console.warn('[ClickUp Webhook] Invalid signature match');
        return res.status(401).json({ error: 'Invalid webhook signature' });
      }
    } catch (e) {
      console.warn('[ClickUp Webhook] Signature verification error:', e.message);
    }
  }

  console.log(`[ClickUp Webhook] Received event: "${eventName}" for task "${taskId}"`);

  try {
    // ─── 1. Task Status Updated ───────────────────────────────────────────────
    if (eventName === 'taskStatusUpdated') {
      const statusItem = historyItems.find(h => h.field === 'status') || {};
      const newStatusObj = statusItem.after || {};
      const newStatusName = (newStatusObj.status || '').toLowerCase();
      const statusType = (newStatusObj.type || '').toLowerCase();

      const isCompleted = statusType === 'closed' || 
                          newStatusName.includes('complete') || 
                          newStatusName.includes('closed') || 
                          newStatusName.includes('done');

      const mappedStatus = isCompleted ? 'completed' : 
                           newStatusName.includes('review') ? 'review' :
                           newStatusName.includes('progress') ? 'in_progress' : 'assigned';

      // Update task in Supabase tasks table
      const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/tasks?clickup_task_id=eq.${taskId}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          status: mappedStatus,
          clickup_status: newStatusObj.status || newStatusName,
          updated_at: new Date().toISOString()
        })
      });

      const updatedTasks = patchRes.ok ? await patchRes.json() : [];
      return res.status(200).json({
        success: true,
        event: eventName,
        taskId,
        mappedStatus,
        matchedTasksCount: updatedTasks.length
      });
    }

    // ─── 2. Task Time Tracked Updated ─────────────────────────────────────────
    if (eventName === 'taskTimeTrackedUpdated') {
      const timeItem = historyItems.find(h => h.field === 'time_spent') || {};
      const durationMs = Number(timeItem.after) || 0;
      const userItem = payload.history_items?.[0]?.user || {};

      // Match user profile by clickup_email
      let userId = null;
      if (userItem.email) {
        try {
          const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?clickup_email=eq.${encodeURIComponent(userItem.email)}&select=id`, {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
          });
          if (profileRes.ok) {
            const rows = await profileRes.json();
            if (rows && rows[0]) userId = rows[0].id;
          }
        } catch (e) {}
      }

      if (userId && durationMs > 0) {
        const localId = `clickup_${taskId}_${Date.now()}`;
        await fetch(`${SUPABASE_URL}/rest/v1/time_logs?on_conflict=local_id`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify({
            user_id: userId,
            task_name: `[ClickUp] Task #${taskId}`,
            category: 'Clickup Management',
            start_time: new Date(Date.now() - durationMs).toISOString(),
            end_time: new Date().toISOString(),
            duration_ms: durationMs,
            source: 'clickup',
            clickup_synced: true,
            local_id: localId
          })
        });
      }

      return res.status(200).json({
        success: true,
        event: eventName,
        taskId,
        durationMs,
        syncedToUser: userId
      });
    }

    // ─── 3. Task Assignee Updated ─────────────────────────────────────────────
    if (eventName === 'taskAssigneeUpdated') {
      const assigneeItem = historyItems.find(h => h.field === 'assignee') || {};
      const newAssignee = assigneeItem.after || {};
      const assigneeEmail = newAssignee.email;

      if (assigneeEmail) {
        // Resolve profile ID from Supabase
        const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?clickup_email=eq.${encodeURIComponent(assigneeEmail)}&select=id`, {
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
        if (profileRes.ok) {
          const rows = await profileRes.json();
          if (rows && rows[0]) {
            const assignedUserId = rows[0].id;
            await fetch(`${SUPABASE_URL}/rest/v1/tasks?clickup_task_id=eq.${taskId}`, {
              method: 'PATCH',
              headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                assigned_user_id: assignedUserId,
                updated_at: new Date().toISOString()
              })
            });
            return res.status(200).json({
              success: true,
              event: eventName,
              taskId,
              assignedUserId
            });
          }
        }
      }

      return res.status(200).json({
        success: true,
        event: eventName,
        taskId,
        message: 'No matching internal specialist found for assignee email'
      });
    }

    // Default response for unhandled ClickUp events
    return res.status(200).json({
      success: true,
      event: eventName,
      message: 'Event acknowledged'
    });
  } catch (err) {
    console.error('[ClickUp Webhook] Execution error:', err);
    return res.status(500).json({ error: err.message });
  }
}
