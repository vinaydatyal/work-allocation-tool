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
    source: task.source || 'allocated'
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

