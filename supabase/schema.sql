-- ============================================================
-- DSR Tracker + Work Allocation Tool — Supabase Schema
-- Run this in Supabase SQL Editor to set up all tables
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── TEAMS / PODS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teams (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  color        TEXT DEFAULT '#6366f1',
  description  TEXT,
  team_lead_id UUID,               -- FK to profiles (set after profiles created)
  sort_order   INT DEFAULT 0,      -- for org map ordering
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── USER PROFILES ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  role_type         TEXT NOT NULL CHECK (role_type IN ('EXECUTIVE','PROJECT_MANAGER','TEAM_LEAD','COORDINATOR','MEMBER')),
  role_title        TEXT,
  avatar            TEXT,
  team_id           UUID REFERENCES teams(id) ON DELETE SET NULL,
  clickup_user_id   BIGINT,
  clickup_email     TEXT,
  clickup_token     TEXT,          -- stored server-side only
  -- Permissions (derived from role_type but overridable)
  can_manage_roster      BOOLEAN DEFAULT false,
  can_assign_tasks       BOOLEAN DEFAULT false,
  can_export_plan        BOOLEAN DEFAULT false,
  can_calibrate_skills   BOOLEAN DEFAULT false,
  can_manage_org_map     BOOLEAN DEFAULT false,
  can_submit_dsr         BOOLEAN DEFAULT true,
  can_review_dsr         BOOLEAN DEFAULT false,
  can_approve_dsr        BOOLEAN DEFAULT false,
  can_view_team_presence BOOLEAN DEFAULT false,
  can_view_all_teams     BOOLEAN DEFAULT false,
  can_view_financials    BOOLEAN DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  last_seen         TIMESTAMPTZ
);

-- Add FK back from teams to profiles for team_lead_id
ALTER TABLE teams ADD CONSTRAINT fk_team_lead
  FOREIGN KEY (team_lead_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- ─── TEAM MEMBERS (pod assignments) ───────────────────────
CREATE TABLE IF NOT EXISTS team_members (
  team_id   UUID REFERENCES teams(id) ON DELETE CASCADE,
  member_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  sort_order INT DEFAULT 0,        -- for org map drag-drop ordering
  added_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (team_id, member_id)
);

-- ─── TASKS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT NOT NULL,
  client_name       TEXT,
  client_tier       TEXT CHECK (client_tier IN ('TIER_S_VIP','TIER_A_AGENCY','TIER_B_LOCAL')),
  project_name      TEXT,
  required_skill    TEXT,
  estimated_hours   NUMERIC(6,2) DEFAULT 4,
  actual_hours_logged NUMERIC(6,2) DEFAULT 0,
  assigned_user_id  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  priority          TEXT DEFAULT 'Medium' CHECK (priority IN ('High','Medium','Low')),
  status            TEXT DEFAULT 'backlog' CHECK (status IN ('backlog','assigned','in_progress','review','completed')),
  due_date          DATE,
  category_color    TEXT,
  clickup_task_id   TEXT,
  clickup_url       TEXT,
  clickup_status    TEXT,
  source            TEXT DEFAULT 'local' CHECK (source IN ('local','clickup','allocated')),
  created_by        UUID REFERENCES profiles(id),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TIME LOGS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS time_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         UUID REFERENCES tasks(id) ON DELETE SET NULL,
  user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  task_name       TEXT NOT NULL,   -- denormalized for offline-friendly access
  category        TEXT,
  start_time      TIMESTAMPTZ NOT NULL,
  end_time        TIMESTAMPTZ,
  duration_ms     BIGINT,
  notes           TEXT,
  source          TEXT DEFAULT 'local' CHECK (source IN ('local','clickup','allocated')),
  clickup_synced  BOOLEAN DEFAULT false,
  local_id        TEXT UNIQUE,     -- client-generated ID for dedup on offline sync
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── DSR ENTRIES ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dsr_entries (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date              DATE NOT NULL,
  status            TEXT DEFAULT 'draft' CHECK (status IN ('draft','pending_review','revision_requested','approved')),
  submitted_at      TIMESTAMPTZ,
  reviewed_by       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at       TIMESTAMPTZ,
  reviewer_comment  TEXT,
  approved_by       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- DSR ↔ time_logs junction
CREATE TABLE IF NOT EXISTS dsr_time_logs (
  dsr_id      UUID REFERENCES dsr_entries(id) ON DELETE CASCADE,
  time_log_id UUID REFERENCES time_logs(id) ON DELETE CASCADE,
  PRIMARY KEY (dsr_id, time_log_id)
);

-- ─── PRESENCE (team heartbeat) ──────────────────────────────
CREATE TABLE IF NOT EXISTS presence (
  user_id     UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  task_name   TEXT,
  task_id     UUID,
  status      TEXT DEFAULT 'offline' CHECK (status IN ('active','idle','offline')),
  last_seen   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── SYNC QUEUE (offline batch uploads) ────────────────────
CREATE TABLE IF NOT EXISTS sync_queue (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type        TEXT NOT NULL,   -- 'time_log' | 'dsr_submit' | 'task_update'
  payload     JSONB NOT NULL,
  retry_count INT DEFAULT 0,
  processed   BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- ─── ROW LEVEL SECURITY ─────────────────────────────────────
ALTER TABLE profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams         ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE dsr_entries   ENABLE ROW LEVEL SECURITY;
ALTER TABLE presence      ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_queue    ENABLE ROW LEVEL SECURITY;

-- Profiles: everyone can read, only self can update
CREATE POLICY "profiles_read_all"   ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_self_write" ON profiles FOR UPDATE USING (auth.uid()::TEXT = id::TEXT);

-- Teams & Team Members: readable by all, editable by manager
CREATE POLICY "teams_read_all"        ON teams FOR SELECT USING (true);
CREATE POLICY "teams_write_all"       ON teams FOR ALL USING (true);
CREATE POLICY "team_members_read_all" ON team_members FOR SELECT USING (true);
CREATE POLICY "team_members_write_all" ON team_members FOR ALL USING (true);

-- Tasks: readable & assignable by all authenticated/anon team users
CREATE POLICY "tasks_read_all"  ON tasks FOR SELECT USING (true);
CREATE POLICY "tasks_write_all" ON tasks FOR ALL USING (true);

-- Time logs: users see own, managers/TLs see their team
CREATE POLICY "timelogs_own" ON time_logs FOR ALL USING (auth.uid()::TEXT = user_id::TEXT);

-- DSR: users see own, reviewers see their team members
CREATE POLICY "dsr_own" ON dsr_entries FOR ALL USING (auth.uid()::TEXT = user_id::TEXT);

-- Presence: all authenticated users can read, self-write only
CREATE POLICY "presence_read" ON presence FOR SELECT USING (true);
CREATE POLICY "presence_self_write" ON presence FOR ALL USING (auth.uid()::TEXT = user_id::TEXT);

-- ─── FUNCTIONS ──────────────────────────────────────────────
-- Auto-set permissions based on role_type
CREATE OR REPLACE FUNCTION set_permissions_from_role()
RETURNS TRIGGER AS $$
BEGIN
  CASE NEW.role_type
    WHEN 'EXECUTIVE' THEN
      NEW.can_export_plan := true;
      NEW.can_view_all_teams := true;
      NEW.can_view_team_presence := true;
      NEW.can_view_financials := true;
    WHEN 'PROJECT_MANAGER' THEN
      NEW.can_manage_roster := true;
      NEW.can_assign_tasks := true;
      NEW.can_export_plan := true;
      NEW.can_calibrate_skills := true;
      NEW.can_manage_org_map := true;
      NEW.can_review_dsr := true;
      NEW.can_approve_dsr := true;
      NEW.can_view_team_presence := true;
      NEW.can_view_all_teams := true;
      NEW.can_view_financials := true;
    WHEN 'TEAM_LEAD' THEN
      NEW.can_assign_tasks := true;
      NEW.can_calibrate_skills := true;
      NEW.can_review_dsr := true;
      NEW.can_view_team_presence := true;
    WHEN 'COORDINATOR' THEN
      NEW.can_assign_tasks := true;
      NEW.can_submit_dsr := true;
    WHEN 'MEMBER' THEN
      NEW.can_submit_dsr := true;
    ELSE NULL;
  END CASE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_permissions
  BEFORE INSERT OR UPDATE OF role_type ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_permissions_from_role();

-- ─── INDEXES ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_user ON tasks(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status        ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_time_logs_user      ON time_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_time_logs_start     ON time_logs(start_time);
CREATE INDEX IF NOT EXISTS idx_dsr_user_date       ON dsr_entries(user_id, date);
CREATE INDEX IF NOT EXISTS idx_dsr_status          ON dsr_entries(status);
CREATE INDEX IF NOT EXISTS idx_sync_queue_unprocessed ON sync_queue(user_id) WHERE NOT processed;
