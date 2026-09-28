# Phase 3: DSR Approval Workflow & Full Agency Roster Calibration

This phase establishes the end-to-end Daily Status Report (DSR) lifecycle: specialists/executives submit their day's tracked hours from the **DSR Tracker** desktop app into Supabase, and Team Leads / Project Managers review, provide feedback on, and approve them inside the **Work Allocation Tool**.

It also calibrates the official **23-person agency roster** across the database, Org Map Studio, and desktop app.

---

## Calibrated 23-Person Agency Structure

```
                      [ CEOs & Co-Founders ]
                 Agam Grover  ·  Manpreet S. Nagpal
                               │
                               ▼
               [ SEO Manager / Operations Manager ]
                          Vinay Datyal
                               │
         ┌─────────────────────┼─────────────────────┐
         ▼                     ▼                     ▼
  [ Team Lead ]         [ Team Lead ]         [ Team Lead ]
    Khuvaish              Amrit Kaur              Vansh
         │                     │                     │
         └──────────────┐      │      ┌──────────────┘
                        ▼      ▼      ▼
               [ Project Coordinator: Nidhi Verma ]
                               │
                               ▼
         [ Assigned Team Executives & Specialists (via Org Map) ]
  • Aakash (Executive)              • Rushali Manchanda (Executive)
  • Anshita (Executive)             • Sahil Attri (Executive)
  • Anshum (Developer)              • Shubham Tisawer (Executive)
  • Anu Rana (Executive)            • Siya (Executive)
  • Himanshu (Executive)            • Vimla Chauhan (Executive)
  • Kamakshi Chopra (Sr. Exec)      • Vivek kumar (Executive)
  • Komal (Executive)               • Navjeet kaur (Designer)
  • Neeraj Panwar (Executive)       • Raman (Executive)
```

> [!NOTE]
> **Dual-Structure Integration (Org Map + Skills)**:
> 1. **Org Map Roster**: Executives are assigned under their respective Team Leads as their permanent core team, easily reorganized via the drag-and-drop Org Map.
> 2. **Flexible Skills**: Because real-world work is dynamic (*Amrit* does strategy, *Khuvaish* reviews deliveries, *Vansh* handles web/tech/SEO), DSRs can be filtered both by **Assigned Team** and by **Skill Category**.

---

## Role Matrix Definition

> [!IMPORTANT]
> **Role Matrix Specification**:
> - `CEO`: Agam Grover, Manpreet S. Nagpal (read-only strategic overview & financials).
> - `PROJECT_MANAGER`: Vinay Datyal (full control: roster, assignments, DSR approval, org map, reports).
> - `TEAM_LEAD`: Khuvaish, Amrit Kaur, Vansh (manages assigned executives, reviews DSRs for their team + cross-functional skill reviews).
> - `COORDINATOR`: Nidhi Verma (task dispatch & coordination).
> - `EXECUTIVE`: All 16 specialists/executives (time tracking, DSR submission, personal view).

---

## Components & Architecture

### Component 1: Full Roster Calibration in Supabase & Web App

#### [supabase/schema.sql](file:///e:/Antigravity/Work%20Allocation%20Tool/supabase/schema.sql) & [supabase/seed.sql](file:///e:/Antigravity/Work%20Allocation%20Tool/supabase/seed.sql)
- Role check constraint updated to support `'CEO'` alongside `'PROJECT_MANAGER'`, `'TEAM_LEAD'`, `'COORDINATOR'`, `'EXECUTIVE'`, `'MEMBER'`.
- Author comprehensive seed with all 23 team members, correct titles, and initial team assignments under Khuvaish, Amrit, and Vansh.

#### [src/types.ts](file:///e:/Antigravity/Work%20Allocation%20Tool/src/types.ts) & [src/data/userProfiles.ts](file:///e:/Antigravity/Work%20Allocation%20Tool/src/data/userProfiles.ts)
- `UserRoleType = 'CEO' | 'PROJECT_MANAGER' | 'TEAM_LEAD' | 'COORDINATOR' | 'EXECUTIVE' | 'MEMBER'`.
- Populate `appUserProfiles` with all 23 members and correct designations.

#### [src/data/mockData.ts](file:///e:/Antigravity/Work%20Allocation%20Tool/src/data/mockData.ts)
- Synchronize `initialTeamMembers` with the complete 23-person roster, skills, and capacities.

---

### Component 2: DSR Tracker Desktop Submission Engine

#### [main.js](file:///e:/Antigravity/DSR%20Tracker/main.js) (Desktop Electron App)
- Add IPC Handler `submit-dsr`:
  - Flushes today's completed time logs to Supabase `time_logs`.
  - Upserts record in Supabase `dsr_entries` for today's date (`status: 'pending_review'`).
- Add IPC Handler `get-dsr-status`:
  - Queries `dsr_entries` for `currentUser.id` for today and past 7 days.

#### [dashboard.html](file:///e:/Antigravity/DSR%20Tracker/dashboard.html) & [dashboard.js](file:///e:/Antigravity/DSR%20Tracker/dashboard.js)
- Add **"Submit DSR"** button in `.header-actions`:
  - Displays instant state feedback: `[ ⏳ DSR Pending Review ]` / `[ ✅ DSR Approved ]` / `[ ⚠️ Revision Requested ]`.
- Update profile selector in desktop to dynamically list all 23 team members fetched from Supabase.
- Add **My DSRs History Modal (`#dsrHistoryModal`)** to view reviewer comments and approval history.

---

### Component 3: Work Allocation Tool DSR Approval Hub

#### [src/lib/supabase.ts](file:///e:/Antigravity/Work%20Allocation%20Tool/src/lib/supabase.ts)
- Typed helper functions:
  - `fetchDsrEntries`: Queries `dsr_entries` joined with profiles and time logs.
  - `approveDsrEntry(dsrId, reviewerId)`: Updates status to `'approved'`.
  - `requestDsrRevision(dsrId, reviewerId, comment)`: Updates status to `'revision_requested'` with feedback.
  - `batchApproveDsrEntries(dsrIds, reviewerId)`: 1-click batch approval for Project Managers.

#### [src/components/DSRTrackerStudio.tsx](file:///e:/Antigravity/Work%20Allocation%20Tool/src/components/DSRTrackerStudio.tsx) & [src/components/DSRApprovalQueue.tsx](file:///e:/Antigravity/Work%20Allocation%20Tool/src/components/DSRApprovalQueue.tsx)
- Primary Mode Switcher at top of DSR Studio:
  - Tab 1: **"📋 DSR Approval & Review Queue"** (Live Supabase review workflow).
  - Tab 2: **"📊 Monthly Plan vs Actual Matrix"** (Bi-directional allocation matrix).
- **DSR Approval & Review Queue View**:
  - Filter by **Team Lead / Assigned Team** (Khuvaish, Amrit, Vansh, Vinay, or All).
  - Filter by **Skill / Activity** (Technical SEO, Strategy, Web Dev, Content, Delivery).
  - Filter by **Status** (`Pending Review`, `Revision Requested`, `Approved`).
  - Expandable DSR Cards: shows executive name, total hours, and granular time logs breakdown with task notes.
  - Actions: **✅ Approve**, **💬 Request Revision** with feedback comments, and **Batch Approve All Pending**.

---

## Verification & Execution Checklist

1. **Automated Tests**:
   - Run `npm test` in `Work Allocation Tool` (all 36 unit tests pass).
   - Verify TypeScript types & build via `npm run build`.
2. **Desktop DSR Submission**:
   - In DSR Tracker desktop app, select an executive profile (e.g. *Aakash* or *Sahil Attri*).
   - Click **"Submit DSR"**. Check confirmation toast.
3. **Web App Review**:
   - In Work Allocation Tool, switch role to *Vinay Datyal* (SEO Manager) or a Team Lead (*Khuvaish* / *Amrit* / *Vansh*).
   - In DSR Tracker Studio, review the submission, request revision or approve.
   - Verify the desktop app immediately reflects the updated state.
