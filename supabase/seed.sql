-- ============================================================
-- Seed Data: Initial Teams (Pods) & Profiles
-- Run after schema.sql in Supabase SQL Editor
-- ============================================================

-- ─── 1. INSERT INITIAL TEAMS / PODS ──────────────────────────
INSERT INTO teams (id, name, color, description, sort_order)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Executive Leadership', '#6366f1', 'Agency founders and executive leadership', 0),
  ('22222222-2222-2222-2222-222222222222', 'Operations & Management', '#f59e0b', 'Operations, planning, resource allocation, and project coordination', 1),
  ('33333333-3333-3333-3333-333333333333', 'SEO & Strategy Pod', '#06b6d4', 'Advanced SEO strategy, AEO, GEO, and high-impact accounts', 2),
  ('44444444-4444-4444-4444-444444444444', 'SEO & Delivery Pod', '#10b981', 'Technical audits, on-page optimization, backlink acquisition, and client deliverables', 3),
  ('55555555-5555-5555-5555-555555555555', 'Web & Tech Pod', '#3b82f6', 'WordPress development, site migrations, and Core Web Vitals engineering', 4)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  color = EXCLUDED.color,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order;

-- ─── 2. INSERT CORE PROFILES ─────────────────────────────────
INSERT INTO profiles (id, name, role_type, role_title, avatar, team_id)
VALUES
  -- Executives
  ('aaaa0001-aaaa-aaaa-aaaa-aaaaaaaa0001', 'Agam Grover', 'EXECUTIVE', 'CEO & Co-Founder', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', '11111111-1111-1111-1111-111111111111'),
  ('aaaa0002-aaaa-aaaa-aaaa-aaaaaaaa0002', 'Manpreet S. Nagpal', 'EXECUTIVE', 'CEO & Co-Founder', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80', '11111111-1111-1111-1111-111111111111'),

  -- Project Manager
  ('bbbb0001-bbbb-bbbb-bbbb-bbbbbbbb0001', 'Vinay Datyal', 'PROJECT_MANAGER', 'Agency Operations Manager', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', '22222222-2222-2222-2222-222222222222'),

  -- Team Leads
  ('cccc0001-cccc-cccc-cccc-cccccccc0001', 'Khuvaish', 'TEAM_LEAD', 'Senior Strategy Team Lead', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80', '33333333-3333-3333-3333-333333333333'),
  ('cccc0002-cccc-cccc-cccc-cccccccc0002', 'Vansh', 'TEAM_LEAD', 'Web & Tech Team Lead', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80', '55555555-5555-5555-5555-555555555555'),
  ('cccc0003-cccc-cccc-cccc-cccccccc0003', 'Amrit Kaur', 'TEAM_LEAD', 'SEO & Delivery Team Lead', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', '44444444-4444-4444-4444-444444444444'),

  -- Coordinator
  ('dddd0001-dddd-dddd-dddd-dddddddd0001', 'Nidhi', 'COORDINATOR', 'Project Coordinator', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80', '22222222-2222-2222-2222-222222222222'),

  -- Specialists / Members
  ('eeee0001-eeee-eeee-eeee-eeeeeeee0001', 'Aakash Jaggi', 'MEMBER', 'Technical SEO Specialist', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80', '44444444-4444-4444-4444-444444444444'),
  ('eeee0002-eeee-eeee-eeee-eeeeeeee0002', 'Abhishek Katariya', 'MEMBER', 'On-Page & AEO Specialist', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80', '33333333-3333-3333-3333-333333333333'),
  ('eeee0003-eeee-eeee-eeee-eeeeeeee0003', 'Akhil', 'MEMBER', 'SEO Operations Specialist', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', '44444444-4444-4444-4444-444444444444'),
  ('eeee0004-eeee-eeee-eeee-eeeeeeee0004', 'Rahul', 'MEMBER', 'SEO & Delivery Specialist', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80', '44444444-4444-4444-4444-444444444444')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  role_type = EXCLUDED.role_type,
  role_title = EXCLUDED.role_title,
  avatar = EXCLUDED.avatar,
  team_id = EXCLUDED.team_id;

-- ─── 3. ASSIGN TEAM LEADS TO TEAMS ───────────────────────────
UPDATE teams SET team_lead_id = 'cccc0001-cccc-cccc-cccc-cccccccc0001' WHERE id = '33333333-3333-3333-3333-333333333333';
UPDATE teams SET team_lead_id = 'cccc0003-cccc-cccc-cccc-cccccccc0003' WHERE id = '44444444-4444-4444-4444-444444444444';
UPDATE teams SET team_lead_id = 'cccc0002-cccc-cccc-cccc-cccccccc0002' WHERE id = '55555555-5555-5555-5555-555555555555';
UPDATE teams SET team_lead_id = 'bbbb0001-bbbb-bbbb-bbbb-bbbbbbbb0001' WHERE id = '22222222-2222-2222-2222-222222222222';

-- ─── 4. POPULATE TEAM MEMBERS JUNCTION ────────────────────────
INSERT INTO team_members (team_id, member_id, sort_order)
VALUES
  -- Strategy Pod
  ('33333333-3333-3333-3333-333333333333', 'cccc0001-cccc-cccc-cccc-cccccccc0001', 0),
  ('33333333-3333-3333-3333-333333333333', 'eeee0002-eeee-eeee-eeee-eeeeeeee0002', 1),

  -- Delivery Pod
  ('44444444-4444-4444-4444-444444444444', 'cccc0003-cccc-cccc-cccc-cccccccc0003', 0),
  ('44444444-4444-4444-4444-444444444444', 'eeee0001-eeee-eeee-eeee-eeeeeeee0001', 1),
  ('44444444-4444-4444-4444-444444444444', 'eeee0003-eeee-eeee-eeee-eeeeeeee0003', 2),
  ('44444444-4444-4444-4444-444444444444', 'eeee0004-eeee-eeee-eeee-eeeeeeee0004', 3),

  -- Web & Tech Pod
  ('55555555-5555-5555-5555-555555555555', 'cccc0002-cccc-cccc-cccc-cccccccc0002', 0),

  -- Operations Pod
  ('22222222-2222-2222-2222-222222222222', 'bbbb0001-bbbb-bbbb-bbbb-bbbbbbbb0001', 0),
  ('22222222-2222-2222-2222-222222222222', 'dddd0001-dddd-dddd-dddd-dddddddd0001', 1),

  -- Executive Leadership
  ('11111111-1111-1111-1111-111111111111', 'aaaa0001-aaaa-aaaa-aaaa-aaaaaaaa0001', 0),
  ('11111111-1111-1111-1111-111111111111', 'aaaa0002-aaaa-aaaa-aaaa-aaaaaaaa0002', 1)
ON CONFLICT (team_id, member_id) DO UPDATE SET
  sort_order = EXCLUDED.sort_order;
