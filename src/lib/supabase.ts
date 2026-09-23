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

