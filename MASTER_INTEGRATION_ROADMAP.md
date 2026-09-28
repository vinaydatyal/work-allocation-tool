# Master Implementation Plan & Integration Roadmap: Work Allocation Tool + DSR Tracker

This document represents the complete, comprehensive multi-phase implementation plan and architectural roadmap designed for the **Work Allocation Tool** (React/Vite web application) and **DSR Tracker** (Electron desktop application), powered by **Supabase PostgreSQL** and **ClickUp API v2**.

---

## 🗺️ Master Phased Roadmap Overview (>5 Phases)

```
Phase 0: Foundations, Relational Schema & 5-Role Identity Matrix     [ ✅ COMPLETED ]
Phase 1: Interactive Drag-and-Drop Org Map Studio (Pods)             [ ✅ COMPLETED ]
Phase 2: Two-Way Synchronization Engine (Desktop ↔ Cloud ↔ ClickUp)  [ ✅ COMPLETED ]
Phase 3: DSR Approval Queue & 23-Person Agency Roster Calibration    [ ✅ COMPLETED ]
Phase 4: Native OS Deep Linking (dsr-tracker://) & Presence Pulse    [ ✅ COMPLETED ]
Phase 5: Real-Time WebSockets & Direct ClickUp Webhook Automation    [ ✅ COMPLETED ]
Phase 6: Manager Mini Pill Heartbeat & Push Notification Engine       [ 📋 UPCOMING ]
Phase 7: Full Cross-Tab ClickUp Sync Suite (Calendar, Bot, Matrix)   [ 📋 UPCOMING ]
Phase 8: Financial Intelligence & Guardrails (P&L, Hour Banking)     [ 📋 UPCOMING / ENHANCED ]
Phase 9: Managerial Power Suite (Morning Huddle, Leads Pipeline CRM) [ 📋 UPCOMING / ENHANCED ]
```

---

## Detailed Phase Breakdown & Improvisations

### Phase 0: Foundations & Enterprise Role Hierarchy [ ✅ COMPLETED ]
- **Relational Schema**: Authored in `supabase/schema.sql` with tables for `profiles`, `teams`, `team_members`, `tasks`, `time_logs`, `dsr_entries`, `dsr_time_logs`, `presence`, and `sync_queue`.
- **5-Role Enterprise Permission Matrix**:
  - `CEO`: Agam Grover, Manpreet S. Nagpal (read-only strategic and financial overview).
  - `PROJECT_MANAGER`: Vinay Datyal (full administrative authority: roster calibration, org map editing, DSR review, allocations).
  - `TEAM_LEAD`: Khuvaish, Amrit Kaur, Vansh (reviews team DSRs + cross-functional skill oversight).
  - `COORDINATOR`: Nidhi Verma (task dispatch, schedule tracking, coordination).
  - `EXECUTIVE`: All 16 specialists/executives (daily time logging, personal bucket, DSR submission).
- **Secure ClickUp Token Storage**: Server-side ClickUp OAuth token persistence in `api/clickup/callback.js` saving directly to Supabase `profiles.clickup_token` (no browser URL token leaks).
- **Client SDKs**: Initialized typed clients in `src/lib/supabase.ts` and `src/lib/database.types.ts`.

---

### Phase 1: Interactive Drag-and-Drop Org Map Studio [ ✅ COMPLETED ]
- **Visual Pods**: Dynamic team cards for the 3 core delivery teams (Strategy & SEO, SEO & Delivery, Web/Tech/Dev) plus Management & Coordination.
- **Native HTML5 Drag-and-Drop**: Project Managers can reassign specialists between pods in real-time.
- **Dynamic Role Badge Customization**: Inline role changer granting or revoking administrative rights instantly.
- **Direct Member Profile Routing**: Clicking team member avatars or names routes directly to their dedicated profile page (`/member/:id`).
- **Cloud Persistence**: Background synchronization to Supabase `teams` and `team_members`.

---

### Phase 2: Two-Way Synchronization Engine [ ✅ COMPLETED ]
- **Desktop Companion Ingestion (`main.js`)**:
  - `fetch-supabase-tasks`: Automatically queries tasks assigned to `currentUser.id` where `status != 'completed'` and merges into local To-Dos with `alloc_${t.id}` prefix.
  - Non-destructive sync guarantees existing personal tasks are never overwritten or deleted.
- **Live Time Log Pushing**:
  - Real-time POST to Supabase `time_logs` upon task timer stop.
- **Resilient 30-Second Offline Sync Queue (`flushSyncQueue`)**:
  - Background processor flushes unsent time logs from `data.syncQueue` in `dsr_data.json` upon network recovery with automatic 409 conflict handling.
- **Desktop UI Source Filters**:
  - Header pill with connection status dot (`#syncStatusDot`).
  - Bucket filter strip: `[ All | Local | Allocated | ClickUp ]` with visual source chips (`🎯 Allocated`, `⚡ ClickUp`, `📌 Local`).
- **Web Allocation Dispatch**:
  - `dispatchTaskToSupabase`: Enables managers to push allocated tasks directly to an executive's desktop bucket.

---

### Phase 3: DSR Approval Workflow & 23-Person Agency Calibration [ 🎯 IN PROGRESS / REFINED ]
- **Official 23-Person Agency Roster Calibration**:
  - Exact roster populated across `userProfiles.ts`, `schema.sql`, `seed.sql`, and `mockData.ts`:
    - **CEOs (2)**: Agam Grover, Manpreet S. Nagpal
    - **SEO / Operations Manager (1)**: Vinay Datyal
    - **Team Leads (3)**: Khuvaish, Amrit Kaur, Vansh
    - **Project Coordinator (1)**: Nidhi Verma
    - **Specialists & Executives (16)**: Anshum (Developer), Navjeet kaur (Designer), Kamakshi Chopra (Senior SEO Executive), and Executives: Aakash, Anshita, Anu Rana, Himanshu, Komal, Neeraj Panwar, Raman, Rushali Manchanda, Sahil Attri, Shubham Tisawer, Siya, Vimla Chauhan, Vivek kumar.
- **Desktop DSR Submission Engine (`main.js` & `dashboard.html`)**:
  - `submit-dsr` IPC handler: Flushes day's completed time logs to Supabase and marks `dsr_entries` as `pending_review`.
  - `#submitDsrBtn` in header with live visual states (`Submit DSR` → `⏳ Pending Review` → `✅ DSR Approved` → `⚠️ Re-Submit DSR`).
  - `#dsrStatusBanner` with submission timestamps and reviewer feedback.
- **Work Allocation Tool DSR Approval Hub (`DSRApprovalQueue.tsx`)**:
  - Mode Switcher: **`📋 DSR Approval & Review Queue`** vs **`📊 Monthly Plan vs Actual Matrix`**.
  - Multi-lead filtering: Filter by Pod or assigned Team Lead (Khuvaish, Amrit, Vansh, Vinay, All).
  - Cross-functional skill filtering (Technical SEO, Strategy, Web Dev, Content, Delivery).
  - Status filtering (`Pending Review`, `Revision Requested`, `Approved`).
  - Granular expandable cards showing total hours, task notes, and timestamps.
  - Actions: **✅ Approve**, **💬 Request Revision** with comments, and **Batch Approve All Pending**.

---

### Phase 4: Native Deep Linking (`dsr-tracker://`) & Live Presence Pulse [ ✅ COMPLETED ]
- **Desktop OS Protocol Registration**:
  - Registered `dsr-tracker://` protocol in Electron (`main.cjs`) using `app.setAsDefaultProtocolClient('dsr-tracker')`.
  - Single-instance lock URL parser with support for Windows command-line arguments.
  - URL schemas supported:
    - `dsr-tracker://track?title=...&category=...&taskId=...&client=...` (Starts timer on target task).
    - `dsr-tracker://open` (Unminimizes and focuses window).
    - `dsr-tracker://mini` (Toggles compact floating mini widget).
    - `dsr-tracker://sync` (Forces offline log queue synchronization).
- **Web App 1-Click "Start in Desktop Tracker" Trigger**:
  - `launchDSRTracker()`, `openDSRTrackerDashboard()`, `openDSRTrackerMini()`, and `triggerDSRSync()` in `src/utils/dsrProtocol.ts`.
  - Integrated into:
    - **Task Backlog**: ⚡ "Track in DSR" buttons on unassigned tasks and specialist workload drawers.
    - **Sprint Kanban**: ⚡ Quick-Track action button on every Kanban card across all columns.
    - **Command Palette (`Ctrl/Cmd + K`)**: "Open DSR Tracker Desktop App" (`T`), "Switch DSR Desktop to Mini Bar", and "Sync DSR Desktop & Offline Logs".
- **Live Team Presence Pulse (60s Heartbeat)**:
  - Background ping from desktop app every 60s updating Supabase `presence` table (`is_active`, `current_task_name`, `last_seen`).
  - Real-time task statuses and active timer durations.

---

### Phase 5: Real-Time WebSockets & Direct ClickUp Webhook Automation [ ✅ COMPLETED ]
- **Supabase Realtime WebSockets (`supabase.channel`)**:
  - Replace polling with bi-directional push events for instantaneous UI updates:
    - `dsr_entries`: Instant notification when a specialist submits a DSR or a manager approves it.
    - `tasks`: Instant card appearance in desktop bucket when allocated in web app.
    - `presence`: Real-time status dot transitions (Online, In Focus, Idle).
- **Direct ClickUp Webhook Ingestion**:
  - Webhook listener endpoint (`api/clickup/webhook.js`) to capture ClickUp task events (`taskStatusUpdated`, `taskTimeTrackedUpdated`, `taskAssigneeUpdated`).
  - Automatically updates local deliverable progress and restores team hours when tasks close.

---

### Phase 6: Manager Mini Pill Heartbeat & Push Notification Engine [ ✅ COMPLETED ]
- **Floating Mini Pill Manager View (`mini.html` / `mini.js`)**:
  - Dedicated manager compact mode showing live active team count (`👥 8 / 16 Active`) and real-time total hours logged today across agency.
  - Subtle ticker showing the most recently completed task across the entire agency with client name and specialist attribution.
  - 1-click mode toggle button switching seamlessly between Personal Focus Timer and Manager Team Pulse HUD.
- **Native OS Push Notifications (`main.js`)**:
  - Windows toast notification on desktop when:
    - An executive submits a DSR requiring review (alerting leads/managers with 1-click focus).
    - A team lead approves or requests revision on a submitted DSR (alerting submitting specialist).
    - A project deliverable is approaching SLA breach (<24h) via `setupSlaBreachMonitor`.
- **IPC Endpoints**:
  - `get-team-heartbeat`: Real-time presence aggregation, active/idle count, today's agency total hours, and recent deliverables ticker.

---

### Phase 7: Full Cross-Tab ClickUp Integration Suite [ ✅ COMPLETED ]
Tab-by-tab synchronization expanding ClickUp across all modules:
1. **Tab 1: Active Projects**: CRM list ingestion, auto-import with custom column preservation, 1-click push deliverables to ClickUp tasks (`handlePushProjectToClickUp`, `handleLoadClickUpLists`).
2. **Tab 2: Activity Calendar**: ClickUp milestone due dates and sprint deadlines mapped onto interactive calendar with deep links (`clickUpActivities`, `clickUpUrl` in `ActivityCalendar.tsx`).
3. **Tab 3: Employee Hours**: ClickUp linked badges (`CU Linked`), 1-click `⚡ Sync ClickUp Capacity` button, synced capacity hours, and live workload spectrum.
4. **Tab 4: DSR Tracker & Plan**: `⚡ Sync ClickUp DSR Time` aggregating API time entries directly into weekly W1–W5 matrices (`DSRTrackerStudio.tsx`).
5. **Tab 5: Employee Skills**: ClickUp task activity mapped to skill growth (`⚡ X CU Tasks Done` badge) and competency scores.
6. **Tab 6: Job Delivery Bot**: 1-click "Deploy Scope to ClickUp" creating deliverables as subtasks with assignees.
7. **Tab 7: Finances & Payments**: Hourly billing automation, retainer overage rate calculators ($/hr: `⚠️ +Xh Overage (+$$)`), and 1-click `Client P&L Optimizer` modal sync.
8. **Tab 8: Notifications Hub**: SLA countdowns, payment hold alerts (`🛑 Hold`), ClickUp sync category filter, and overdue task escalations.
9. **Tab 9: Monday War-Room**: 1-click agency batch sync (`ClickUpBatchSyncModal`), backlog dispatch solver, and ClickUp task status reconciler.

---

### Phase 8: Financial Intelligence & Guardrails Suite [ ✅ COMPLETED ]
- **Real-Time Gross Margin & Profit Badges**: On-card badges (`💰 X% Margin (+$X net)`) powered by loaded hourly cost rates ($58/h Lead, $36/h Mid, $22/h Junior).
- **Seniority Misalignment Warning Chips**: Real-time alert chips detecting when high-rate leads execute on low-budget accounts with negative margin leaks.
- **1-Click Client P&L & Staffing Optimizer**: Rebalance squads with available Junior/Mid specialists to elevate gross margin (`ClientPnLModal.tsx`).
- **Cash-Flow Risk & Deliverable Hold Guardrail**: Prominent `🛑 Payment Hold` warning pausing sprints on overdue invoices.
- **Retainer Hour Banking & Rollover Expiration Alert**: In-card hour rollover banking (`📦 Bank Rollover`) with expiration warnings and overage indicators.

---

### Phase 9: High-Velocity Managerial Power Suite [ ✅ COMPLETED ]
- **Specialist Spotlight & Reactive Clustering**: Dynamically clusters projects belonging to a spotlighted specialist to the front with Framer Motion layout animations (`spotlightSpecialistId`).
- **Collapsible Deliverables Pocket Section**: Groups active vs. completed deliverables with inline `+X done ▾` drawers.
- **Daily "Morning Huddle" Command Drawer**: Automated attention analysis triage (Scope Creep, Due Today, Overdue Invoices, High Burn) with 1-click **"📋 Copy Huddle Agenda"** for Slack/Teams.
- **New Business Leads CRM Space**: Dedicated sales pipeline space with ClickUp list sync, dedicated **Assigned Lead Owner** column, and 1-click conversion to active retainer accounts.
- **Zero-Reflow Auto-Open/Close Navigation Dock**: Floating navigation dock in `Navbar.tsx` with smooth spring transitions, layoutId indicators, and quick keyboard hotkeys (1-9, 0, K, ?, N, D).

---

## 🎯 Current Status & Master Completion Summary
- **Current Active State**: **All 10 Phases (Phase 0 through Phase 9) are fully implemented, verified, and synchronized** across the Electron native client (`DSR Tracker`) and the React web workspace (`Work Allocation Tool`).
- **System Architecture**:
  - Native Protocol Deep Linking (`dsr-tracker://track`, `dsr-tracker://open`, `dsr-tracker://mini`, `dsr-tracker://sync`).
  - Bi-Directional Supabase Realtime Channels (`tasks`, `dsr_entries`, `presence`, `team-heartbeat-presence`).
  - Direct ClickUp Webhooks (`taskStatusUpdated`, `taskTimeTrackedUpdated`, `taskAssigneeUpdated`).
  - Dual-Mode Mini Pill HUD with Live Team Pulse, Real-Time Agency Hours, and Activity Ticker.
  - Native Windows SLA Breach Warning Monitor (<24h).
  - Cross-Tab ClickUp Suite, Financial P&L Guardrails, and Managerial Power Huddle Suite.
