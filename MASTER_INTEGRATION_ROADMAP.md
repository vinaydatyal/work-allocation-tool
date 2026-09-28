# Master Integration Roadmap: Work Allocation Tool + DSR Tracker

This roadmap documents the multi-phase integration between the **Work Allocation Tool** (React/Vite web application) and the **DSR Tracker** (Electron desktop application) powered by **Supabase PostgreSQL**.

---

## 🗺️ Multi-Phase Integration Overview

```
Phase 0: Foundations, Relational Schema & 5-Role Identity Matrix     [ ✅ COMPLETED ]
Phase 1: Interactive Drag-and-Drop Org Map Studio (Pods)             [ ✅ COMPLETED ]
Phase 2: Two-Way Data Sync (Desktop Bucket ↔ Supabase Cloud)         [ ✅ COMPLETED ]
Phase 3: DSR Approval Queue & 23-Person Agency Roster Calibration     [ ✅ COMPLETED ]
Phase 4: Native Deep Linking (dsr-tracker://) & Live Presence Pulse  [ 🚀 READY TO START ]
Phase 5: Real-Time WebSockets & Direct ClickUp Webhook Automation     [ 📋 UPCOMING ]
```

---

## Detailed Phase Breakdown

### Phase 0: Foundations & Identity Architecture [ ✅ COMPLETED ]
- [x] Defined 5 enterprise roles: `CEO`, `PROJECT_MANAGER`, `TEAM_LEAD`, `COORDINATOR`, `EXECUTIVE/MEMBER` in `src/types.ts`.
- [x] Designed relational database schema in `supabase/schema.sql` (`profiles`, `teams`, `team_members`, `tasks`, `time_logs`, `dsr_entries`, `presence`, `sync_queue`).
- [x] Server-side ClickUp OAuth token persistence in `api/clickup/callback.js` (tokens stored directly in Supabase `profiles.clickup_token`).
- [x] Configured Supabase client in `src/lib/supabase.ts` and `src/lib/database.types.ts`.

---

### Phase 1: Interactive Drag-and-Drop Org Map Studio [ ✅ COMPLETED ]
- [x] Built `src/components/OrgMapStudio.tsx` with dynamic Pod cards for all 5 agency teams.
- [x] Native HTML5 drag-and-drop mechanism enabling Project Managers to reassign specialists between pods.
- [x] Live role badge modifier and instant privilege updates.
- [x] Automatic background persistence to Supabase `teams` and `team_members`.
- [x] Integrated internal navigation from specialist cards directly to individual Member Profile pages.

---

### Phase 2: Two-Way Data Sync (Desktop ↔ Supabase) [ ✅ COMPLETED ]
- [x] **DSR Tracker Desktop Source Filter Strip (`#bucketSourceFilterStrip`)**:
  - Filter pills: `[ All | Local | Allocated | ClickUp ]` in `dashboard.html`.
- [x] **Allocated Task Ingestion (`fetch-supabase-tasks`)**:
  - Queries tasks assigned to `currentUser.id`, merging them into `data.todos` with unique `alloc_${t.id}` prefix. Local tasks are never overwritten.
- [x] **Real-Time Time Log Pushing (`sync-time-log-to-supabase`)**:
  - Pushes completed work sessions to Supabase `time_logs` upon timer stop.
- [x] **Resilient Offline Sync Queue (`flushSyncQueue`)**:
  - Background processor running every 30s to batch-flush offline logs and gracefully resolve duplicates.
- [x] **Profile & Sync Status Header Pill (`#userProfileBtn`)**:
  - Live connection status dot (green when connected, gray when offline) with Electron `safeStorage`.

---

### Phase 3: DSR Approval Queue & 23-Person Roster Calibration [ ✅ COMPLETED ]
- [x] **Official 23-Person Agency Roster**:
  - Calibrated all 23 members across `userProfiles.ts`, `schema.sql`, `seed.sql`, and `mockData.ts`.
- [x] **Desktop DSR Submission Engine (`main.js`, `dashboard.js`)**:
  - `submit-dsr` IPC handler flushes completed time logs and upserts `dsr_entries` with `status: 'pending_review'`.
  - `#submitDsrBtn` with live status changes (`Submit DSR` ➔ `⏳ Pending Review` ➔ `✅ DSR Approved` ➔ `⚠️ Re-Submit DSR`).
  - `#dsrStatusBanner` displaying live submission timestamp and reviewer feedback.
- [x] **Work Allocation Tool DSR Approval Hub (`DSRApprovalQueue.tsx`)**:
  - Mode switcher in `DSRTrackerStudio.tsx` (`📋 DSR Approval & Review Queue` vs `📊 Monthly Plan vs Actual Matrix`).
  - Filtering by Pod Lead (*Khuvaish*, *Amrit*, *Vansh*, *Vinay*, *Co-Founders*), Skill Category, and Status.
  - Actions: **✅ Approve**, **💬 Request Revision** with customizable feedback comments, and **Batch Approve All Pending**.

---

### Phase 4: Native Deep Links (`dsr-tracker://`) & Live Presence Pulse [ 🚀 READY TO START ]
1. **OS Deep Link Protocol (`dsr-tracker://`)**:
   - Register custom protocol `dsr-tracker://` in Electron `main.js` and `package.json`.
   - Web "Start" button on allocated tasks deep-links: `dsr-tracker://start?taskId=...&taskName=...&client=...`.
   - Desktop app focuses window, selects the task in To-Do basket, and triggers timer automatically.
2. **60s Presence Heartbeat**:
   - Desktop sends lightweight periodic ping to Supabase `presence` table.
   - States: `active` (with current task/client), `idle` (if >3 min without mouse/keyboard input), `offline`.
3. **Live "Who's Active" Ambient Presence Strip**:
   - Visual pulse bar in `VisualAgencyHub.tsx` and Navigation Header.
   - Shows live specialist avatars with glowing activity rings, current active client, and elapsed duration.

---

### Phase 5: Real-Time WebSockets & ClickUp Automation [ 📋 UPCOMING IMPROVISATIONS ]
1. **Supabase Realtime Channel Listeners**:
   - Replace 30s polling with instant WebSocket broadcasts for DSR submissions, approvals, and pod reassignments.
2. **ClickUp Bi-directional Webhooks**:
   - Listen for subtask status changes in ClickUp and automatically update retainer hours and deliverables in the web tool.
3. **One-Click Client PDF Delivery & ROI Reports**:
   - Export executive summaries for monthly client reporting.
