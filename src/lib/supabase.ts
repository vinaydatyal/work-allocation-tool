/**
 * Supabase Client — Work Allocation Tool
 *
 * TO ACTIVATE: Replace the two placeholder values below with your
 * Supabase Project URL and anon/public key from:
 *   Supabase Dashboard → Settings → API
 *
 * Then run: npm install @supabase/supabase-js
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON as string;

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.warn(
    '[Supabase] Missing env vars VITE_SUPABASE_URL or VITE_SUPABASE_ANON. ' +
    'Add them to your .env.local file to enable persistence.'
  );
}

export const supabase = createClient(
  SUPABASE_URL  || 'https://placeholder.supabase.co',
  SUPABASE_ANON || 'placeholder-anon-key'
);

// ─── Typed helpers ────────────────────────────────────────────────────────────

export type Profile     = Database['public']['Tables']['profiles']['Row'];
export type Team        = Database['public']['Tables']['teams']['Row'];
export type Task        = Database['public']['Tables']['tasks']['Row'];
export type TimeLog     = Database['public']['Tables']['time_logs']['Row'];
export type DsrEntry    = Database['public']['Tables']['dsr_entries']['Row'];
export type SyncItem    = Database['public']['Tables']['sync_queue']['Row'];
export type PresenceRow = Database['public']['Tables']['presence']['Row'];

// ─── Current user helper ──────────────────────────────────────────────────────

export async function getCurrentProfile(): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return data;
}

// ─── Real-time presence helper ────────────────────────────────────────────────

export async function upsertPresence(
  userId: string,
  taskName: string | null,
  status: 'active' | 'idle' | 'offline'
) {
  return supabase.from('presence').upsert({
    user_id: userId,
    task_name: taskName,
    status,
    last_seen: new Date().toISOString()
  }, { onConflict: 'user_id' });
}

// ─── Task dispatch helper ─────────────────────────────────────────────────────

export async function dispatchTaskToSupabase(task: {
  id?: string;
  title: string;
  client_name?: string;
  client_tier?: string;
  required_skill?: string;
  estimated_hours?: number;
  assigned_user_id: string;
  priority?: 'high' | 'medium' | 'low';
  due_date?: string;
  source?: 'allocated' | 'clickup' | 'local';
  clickup_task_id?: string;
  clickup_url?: string;
  clickup_status?: string;
}) {
  return supabase.from('tasks').upsert({
    id: task.id || crypto.randomUUID(),
    title: task.title,
    client_name: task.client_name || 'Internal',
    client_tier: task.client_tier || 'Tier 2',
    required_skill: task.required_skill || 'General',
    estimated_hours: task.estimated_hours || 1,
    assigned_user_id: task.assigned_user_id,
    priority: task.priority || 'medium',
    status: 'assigned',
    due_date: task.due_date || null,
    source: task.source || (task.clickup_task_id ? 'clickup' : 'allocated'),
    clickup_task_id: task.clickup_task_id || null,
    clickup_url: task.clickup_url || null,
    clickup_status: task.clickup_status || null,
    updated_at: new Date().toISOString()
  });
}

// ─── DSR Workflow Helpers ───────────────────────────────────────────────────

export interface DsrEntryWithDetails extends DsrEntry {
  profile?: Profile;
  team?: Team;
  time_logs?: TimeLog[];
  total_hours?: number;
}

export async function fetchDsrEntries(options?: {
  date?: string;
  startDate?: string;
  endDate?: string;
  status?: 'draft' | 'pending_review' | 'revision_requested' | 'approved';
  userId?: string;
  teamId?: string;
}) {
  let query = supabase
    .from('dsr_entries')
    .select(`
      *,
      profiles:user_id (
        id, name, role_type, role_title, avatar, team_id
      )
    `)
    .order('date', { ascending: false });

  if (options?.date) {
    query = query.eq('date', options.date);
  }
  if (options?.startDate) {
    query = query.gte('date', options.startDate);
  }
  if (options?.endDate) {
    query = query.lte('date', options.endDate);
  }
  if (options?.status) {
    query = query.eq('status', options.status);
  }
  if (options?.userId) {
    query = query.eq('user_id', options.userId);
  }

  const { data, error } = await query;
  return { data, error };
}

export async function fetchTimeLogsForDsr(userId: string, date: string) {
  // Date format: YYYY-MM-DD
  const startOfDay = `${date}T00:00:00.000Z`;
  const endOfDay = `${date}T23:59:59.999Z`;

  const { data, error } = await supabase
    .from('time_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('start_time', startOfDay)
    .lte('start_time', endOfDay)
    .order('start_time', { ascending: true });

  return { data, error };
}

export async function approveDsrEntry(dsrId: string, reviewerId: string) {
  return supabase
    .from('dsr_entries')
    .update({
      status: 'approved',
      approved_by: reviewerId,
      approved_at: new Date().toISOString(),
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString()
    })
    .eq('id', dsrId);
}

export async function requestDsrRevision(dsrId: string, reviewerId: string, comment: string) {
  return supabase
    .from('dsr_entries')
    .update({
      status: 'revision_requested',
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      reviewer_comment: comment
    })
    .eq('id', dsrId);
}

export async function batchApproveDsrEntries(dsrIds: string[], reviewerId: string) {
  return supabase
    .from('dsr_entries')
    .update({
      status: 'approved',
      approved_by: reviewerId,
      approved_at: new Date().toISOString(),
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString()
    })
    .in('id', dsrIds);
}

export async function submitDsr(userId: string, date: string) {
  return supabase
    .from('dsr_entries')
    .upsert({
      user_id: userId,
      date,
      status: 'pending_review',
      submitted_at: new Date().toISOString()
    }, { onConflict: 'user_id,date' });
}

// ─── Real-Time WebSockets Subscriptions (Phase 5: supabase.channel) ──────────

export function subscribeToDsrEntries(callback: (payload: any) => void) {
  return supabase
    .channel('realtime-dsr-entries')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'dsr_entries'
      },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();
}

export function subscribeToPresence(callback: (payload: any) => void) {
  return supabase
    .channel('realtime-presence')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'presence'
      },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();
}

export function subscribeToTasks(callback: (payload: any) => void, filterUserId?: string) {
  const filter = filterUserId ? `assigned_user_id=eq.${filterUserId}` : undefined;
  return supabase
    .channel(`realtime-tasks${filterUserId ? `-${filterUserId}` : ''}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tasks',
        filter
      },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();
}

// ─── DSR Tracker Project Notes Real-Time Two-Way Sync ────────────────────────

export interface ProjectNoteChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface ProjectNoteFollowUpItem {
  id: string;
  text: string;
  done: boolean;
  assignee?: string;
  due?: string;
}

export interface ProjectDailyNotePayload {
  projectId: string;
  projectName: string;
  clientName?: string;
  date: string; // YYYY-MM-DD
  notes: string;
  checklist?: ProjectNoteChecklistItem[];
  followUps?: ProjectNoteFollowUpItem[];
  updatedAt?: string;
}

/**
 * Saves or updates a project note to Supabase sync_queue.
 * DSR Tracker Desktop listens to this channel and syncs to local store in real-time.
 */
export async function saveProjectNoteToSupabase(note: ProjectDailyNotePayload) {
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || '00000000-0000-0000-0000-000000000000';

  const fullPayload: ProjectDailyNotePayload = {
    ...note,
    updatedAt: new Date().toISOString()
  };

  return supabase.from('sync_queue').insert({
    user_id: userId,
    type: 'project_daily_note',
    payload: fullPayload as any,
    processed: false,
    created_at: new Date().toISOString()
  });
}

/**
 * Fetches recent project notes from Supabase sync_queue.
 */
export async function fetchProjectNotes(projectId?: string, date?: string) {
  let query = supabase
    .from('sync_queue')
    .select('*')
    .eq('type', 'project_daily_note')
    .order('created_at', { ascending: false })
    .limit(100);

  const { data, error } = await query;
  if (error || !data) return { data: [], error };

  const parsedNotes: ProjectDailyNotePayload[] = [];
  for (const row of data) {
    try {
      const p = (typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload) as ProjectDailyNotePayload;
      if (projectId && p.projectId !== projectId) continue;
      if (date && p.date !== date) continue;
      parsedNotes.push(p);
    } catch (e) {
      // ignore malformed items
    }
  }

  return { data: parsedNotes, error: null };
}

/**
 * Subscribes to real-time project notes updates dispatched by DSR Tracker Desktop or WAT.
 */
export function subscribeToProjectNotes(callback: (payload: ProjectDailyNotePayload) => void) {
  return supabase
    .channel('realtime-project-notes')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'sync_queue',
        filter: 'type=eq.project_daily_note'
      },
      (payload) => {
        try {
          const item = payload.new;
          if (item && item.payload) {
            const parsed = (typeof item.payload === 'string' ? JSON.parse(item.payload) : item.payload) as ProjectDailyNotePayload;
            callback(parsed);
          }
        } catch (err) {
          console.warn('[Realtime] Failed to parse project note event:', err);
        }
      }
    )
    .subscribe();
}



