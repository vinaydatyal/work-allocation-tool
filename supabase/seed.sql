-- ============================================================
-- Seed Data: Calibrated 23-Person Agency Roster & Teams
-- Run after schema.sql in Supabase SQL Editor
-- ============================================================

-- ─── 0. ENSURE CHECK CONSTRAINT INCLUDES 'CEO' & 'EXECUTIVE' ─
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_type_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_type_check 
  CHECK (role_type IN ('CEO','EXECUTIVE','PROJECT_MANAGER','TEAM_LEAD','COORDINATOR','MEMBER'));

-- Ensure RLS allows client writes for DSR entries, time logs, and presence
DROP POLICY IF EXISTS "dsr_write_all" ON dsr_entries;
CREATE POLICY "dsr_write_all" ON dsr_entries FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "timelogs_write_all" ON time_logs;
CREATE POLICY "timelogs_write_all" ON time_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "presence_self_write" ON presence;
CREATE POLICY "presence_self_write" ON presence FOR ALL USING (true) WITH CHECK (true);

-- Clean up any obsolete temporary profiles from initial testing
DELETE FROM team_members WHERE member_id IN (
  SELECT id FROM profiles WHERE id NOT LIKE 'aaaa%' AND id NOT LIKE 'bbbb%' AND id NOT LIKE 'cccc%' AND id NOT LIKE 'dddd%' AND id NOT LIKE 'eeee%'
);
DELETE FROM profiles WHERE id NOT LIKE 'aaaa%' AND id NOT LIKE 'bbbb%' AND id NOT LIKE 'cccc%' AND id NOT LIKE 'dddd%' AND id NOT LIKE 'eeee%';

-- ─── 1. INSERT INITIAL TEAMS / PODS ──────────────────────────
INSERT INTO teams (id, name, color, description, sort_order)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Executive Leadership', '#6366f1', 'Agency founders and CEOs', 0),
  ('22222222-2222-2222-2222-222222222222', 'Operations & Management', '#f59e0b', 'Agency operations, management, and project coordination', 1),
  ('33333333-3333-3333-3333-333333333333', 'Strategy & SEO Pod', '#06b6d4', 'Team Lead: Khuvaish — Strategy, AEO/GEO, and advanced client campaigns', 2),
  ('44444444-4444-4444-4444-444444444444', 'SEO & Delivery Pod', '#10b981', 'Team Lead: Amrit Kaur — SEO campaign execution, audits, and deliverables', 3),
  ('55555555-5555-5555-5555-555555555555', 'Web, Tech & Development Pod', '#3b82f6', 'Team Lead: Vansh — Web development, technical SEO, and design', 4)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  color = EXCLUDED.color,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order;

-- ─── 2. INSERT ALL 23 TEAM PROFILES ──────────────────────────
INSERT INTO profiles (id, name, role_type, role_title, avatar, team_id)
VALUES
  -- 1 & 2: CEOs & Co-Founders
  ('aaaa0001-aaaa-aaaa-aaaa-aaaaaaaa0001', 'Agam Grover', 'CEO', 'CEO & Co-Founder', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', '11111111-1111-1111-1111-111111111111'),
  ('aaaa0002-aaaa-aaaa-aaaa-aaaaaaaa0002', 'Manpreet S. Nagpal', 'CEO', 'CEO & Co-Founder', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80', '11111111-1111-1111-1111-111111111111'),

  -- 3: SEO Manager / Operations Manager
  ('bbbb0001-bbbb-bbbb-bbbb-bbbbbbbb0001', 'Vinay Datyal', 'PROJECT_MANAGER', 'SEO Manager', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', '22222222-2222-2222-2222-222222222222'),

  -- 4, 5, 6: Team Leads
  ('cccc0001-cccc-cccc-cccc-cccccccc0001', 'Khuvaish', 'TEAM_LEAD', 'Team Lead', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80', '33333333-3333-3333-3333-333333333333'),
  ('cccc0002-cccc-cccc-cccc-cccccccc0002', 'Amrit Kaur', 'TEAM_LEAD', 'Team Lead', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', '44444444-4444-4444-4444-444444444444'),
  ('cccc0003-cccc-cccc-cccc-cccccccc0003', 'Vansh', 'TEAM_LEAD', 'Team Lead', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80', '55555555-5555-5555-5555-555555555555'),

  -- 7: Project Coordinator
  ('dddd0001-dddd-dddd-dddd-dddddddd0001', 'Nidhi Verma', 'COORDINATOR', 'Project Coordinator', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80', '22222222-2222-2222-2222-222222222222'),

  -- 8, 9, 10: Technical & Senior Specialists
  ('eeee0001-eeee-eeee-eeee-eeeeeeee0001', 'Anshum', 'EXECUTIVE', 'Developer', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80', '55555555-5555-5555-5555-555555555555'),
  ('eeee0002-eeee-eeee-eeee-eeeeeeee0002', 'Navjeet kaur', 'EXECUTIVE', 'Designer', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80', '55555555-5555-5555-5555-555555555555'),
  ('eeee0003-eeee-eeee-eeee-eeeeeeee0003', 'Kamakshi Chopra', 'EXECUTIVE', 'Senior SEO Executive', 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=150&auto=format&fit=crop&q=80', '33333333-3333-3333-3333-333333333333'),

  -- 11 to 23: Executives
  ('eeee0004-eeee-eeee-eeee-eeeeeeee0004', 'Aakash', 'EXECUTIVE', 'Executive', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80', '44444444-4444-4444-4444-444444444444'),
  ('eeee0005-eeee-eeee-eeee-eeeeeeee0005', 'Anshita', 'EXECUTIVE', 'Executive', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', '33333333-3333-3333-3333-333333333333'),
  ('eeee0006-eeee-eeee-eeee-eeeeeeee0006', 'Anu Rana', 'EXECUTIVE', 'Executive', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80', '44444444-4444-4444-4444-444444444444'),
  ('eeee0007-eeee-eeee-eeee-eeeeeeee0007', 'Himanshu', 'EXECUTIVE', 'Executive', 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80', '55555555-5555-5555-5555-555555555555'),
  ('eeee0008-eeee-eeee-eeee-eeeeeeee0008', 'Komal', 'EXECUTIVE', 'Executive', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80', '33333333-3333-3333-3333-333333333333'),
  ('eeee0009-eeee-eeee-eeee-eeeeeeee0009', 'Neeraj Panwar', 'EXECUTIVE', 'Executive', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', '44444444-4444-4444-4444-444444444444'),
  ('eeee0010-eeee-eeee-eeee-eeeeeeee0010', 'Raman', 'EXECUTIVE', 'Executive', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', '55555555-5555-5555-5555-555555555555'),
  ('eeee0011-eeee-eeee-eeee-eeeeeeee0011', 'Rushali Manchanda', 'EXECUTIVE', 'Executive', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', '33333333-3333-3333-3333-333333333333'),
  ('eeee0012-eeee-eeee-eeee-eeeeeeee0012', 'Sahil Attri', 'EXECUTIVE', 'Executive', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80', '44444444-4444-4444-4444-444444444444'),
  ('eeee0013-eeee-eeee-eeee-eeeeeeee0013', 'Shubham Tisawer', 'EXECUTIVE', 'Executive', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80', '55555555-5555-5555-5555-555555555555'),
  ('eeee0014-eeee-eeee-eeee-eeeeeeee0014', 'Siya', 'EXECUTIVE', 'Executive', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80', '33333333-3333-3333-3333-333333333333'),
  ('eeee0015-eeee-eeee-eeee-eeeeeeee0015', 'Vimla Chauhan', 'EXECUTIVE', 'Executive', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80', '44444444-4444-4444-4444-444444444444'),
  ('eeee0016-eeee-eeee-eeee-eeeeeeee0016', 'Vivek kumar', 'EXECUTIVE', 'Executive', 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80', '55555555-5555-5555-5555-555555555555')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  role_type = EXCLUDED.role_type,
  role_title = EXCLUDED.role_title,
  avatar = EXCLUDED.avatar,
  team_id = EXCLUDED.team_id;

-- ─── 3. ASSIGN TEAM LEADS TO TEAMS ───────────────────────────
UPDATE teams SET team_lead_id = 'cccc0001-cccc-cccc-cccc-cccccccc0001' WHERE id = '33333333-3333-3333-3333-333333333333';
UPDATE teams SET team_lead_id = 'cccc0002-cccc-cccc-cccc-cccccccc0002' WHERE id = '44444444-4444-4444-4444-444444444444';
UPDATE teams SET team_lead_id = 'cccc0003-cccc-cccc-cccc-cccccccc0003' WHERE id = '55555555-5555-5555-5555-555555555555';
UPDATE teams SET team_lead_id = 'bbbb0001-bbbb-bbbb-bbbb-bbbbbbbb0001' WHERE id = '22222222-2222-2222-2222-222222222222';

-- ─── 4. POPULATE TEAM MEMBERS JUNCTION ────────────────────────
INSERT INTO team_members (team_id, member_id, sort_order)
VALUES
  -- Executive Leadership
  ('11111111-1111-1111-1111-111111111111', 'aaaa0001-aaaa-aaaa-aaaa-aaaaaaaa0001', 0),
  ('11111111-1111-1111-1111-111111111111', 'aaaa0002-aaaa-aaaa-aaaa-aaaaaaaa0002', 1),

  -- Operations & Management
  ('22222222-2222-2222-2222-222222222222', 'bbbb0001-bbbb-bbbb-bbbb-bbbbbbbb0001', 0),
  ('22222222-2222-2222-2222-222222222222', 'dddd0001-dddd-dddd-dddd-dddddddd0001', 1),

  -- Strategy & SEO Pod (Lead: Khuvaish)
  ('33333333-3333-3333-3333-333333333333', 'cccc0001-cccc-cccc-cccc-cccccccc0001', 0),
  ('33333333-3333-3333-3333-333333333333', 'eeee0003-eeee-eeee-eeee-eeeeeeee0003', 1), -- Kamakshi
  ('33333333-3333-3333-3333-333333333333', 'eeee0005-eeee-eeee-eeee-eeeeeeee0005', 2), -- Anshita
  ('33333333-3333-3333-3333-333333333333', 'eeee0008-eeee-eeee-eeee-eeeeeeee0008', 3), -- Komal
  ('33333333-3333-3333-3333-333333333333', 'eeee0011-eeee-eeee-eeee-eeeeeeee0011', 4), -- Rushali
  ('33333333-3333-3333-3333-333333333333', 'eeee0014-eeee-eeee-eeee-eeeeeeee0014', 5), -- Siya

  -- SEO & Delivery Pod (Lead: Amrit Kaur)
  ('44444444-4444-4444-4444-444444444444', 'cccc0002-cccc-cccc-cccc-cccccccc0002', 0),
  ('44444444-4444-4444-4444-444444444444', 'eeee0004-eeee-eeee-eeee-eeeeeeee0004', 1), -- Aakash
  ('44444444-4444-4444-4444-444444444444', 'eeee0006-eeee-eeee-eeee-eeeeeeee0006', 2), -- Anu Rana
  ('44444444-4444-4444-4444-444444444444', 'eeee0009-eeee-eeee-eeee-eeeeeeee0009', 3), -- Neeraj Panwar
  ('44444444-4444-4444-4444-444444444444', 'eeee0012-eeee-eeee-eeee-eeeeeeee0012', 4), -- Sahil Attri
  ('44444444-4444-4444-4444-444444444444', 'eeee0015-eeee-eeee-eeee-eeeeeeee0015', 5), -- Vimla Chauhan

  -- Web, Tech & Development Pod (Lead: Vansh)
  ('55555555-5555-5555-5555-555555555555', 'cccc0003-cccc-cccc-cccc-cccccccc0003', 0),
  ('55555555-5555-5555-5555-555555555555', 'eeee0001-eeee-eeee-eeee-eeeeeeee0001', 1), -- Anshum (Developer)
  ('55555555-5555-5555-5555-555555555555', 'eeee0002-eeee-eeee-eeee-eeeeeeee0002', 2), -- Navjeet kaur (Designer)
  ('55555555-5555-5555-5555-555555555555', 'eeee0007-eeee-eeee-eeee-eeeeeeee0007', 3), -- Himanshu
  ('55555555-5555-5555-5555-555555555555', 'eeee0010-eeee-eeee-eeee-eeeeeeee0010', 4), -- Raman
  ('55555555-5555-5555-5555-555555555555', 'eeee0013-eeee-eeee-eeee-eeeeeeee0013', 5), -- Shubham Tisawer
  ('55555555-5555-5555-5555-555555555555', 'eeee0016-eeee-eeee-eeee-eeeeeeee0016', 6)  -- Vivek kumar
ON CONFLICT (team_id, member_id) DO UPDATE SET
  sort_order = EXCLUDED.sort_order;
