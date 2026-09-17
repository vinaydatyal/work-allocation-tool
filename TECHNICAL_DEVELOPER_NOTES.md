# Work Allocation Tool — Technical Developer Notes

## 1. Overview
The **Work Allocation Tool** is an advanced agency resource and project allocation application built with React, TypeScript, Vite, Tailwind CSS, and Framer Motion. It provides real-time workload tracking, intelligent task allocation, Claude AI project brief analysis, and bi-directional synchronization with ClickUp.

---

## 2. Architecture & Tech Stack
- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS + custom CSS variables (supports dark mode and clean themes)
- **Animation**: Framer Motion
- **Icons**: Lucide React
- **Deployment**: Vercel (`work-allocation-tool.vercel.app`)
- **Serverless Backend**: Vercel Serverless Functions in `/api`

---

## 3. ClickUp OAuth 2.0 Integration

### 3.1 Overview
To enable secure connection without exposing the ClickUp Client Secret in the browser client, the app employs a hybrid OAuth 2.0 flow:
1. **Frontend Initiation**: `src/services/clickupOAuth.ts` directs the user to ClickUp's OAuth consent screen with `client_id` and redirect URI (`/api/clickup/callback`).
2. **Serverless Token Exchange**: `api/clickup/callback.js` catches the OAuth `code` parameter from ClickUp, performs a server-to-server POST request to `https://api.clickup.com/api/v2/oauth/token` using `CLICKUP_CLIENT_SECRET`, verifies user identity via `https://api.clickup.com/api/v2/user`, and redirects back to the SPA with the token.
3. **Frontend Session Storage**: `handleClickUpCallback()` parses the token from the query parameters, persists it to `localStorage`, strips parameters from the URL using `window.history.replaceState`, and activates the connected state.
4. **Modal Interface**: `src/components/ClickUpOAuthModal.tsx` provides workspace selection, connection status, live task previews, and disconnect controls.

### 3.2 Environment Variables Required

#### In Local `.env` / Frontend:
| Variable | Description |
|---|---|
| `VITE_CLICKUP_CLIENT_ID` | ClickUp App Client ID (public) |
| `VITE_CLAUDE_API_KEY` | Anthropic Claude API key for AI Brief Analysis |

#### In Vercel Project Settings (Environment Variables):
| Variable | Type in Vercel | Target | Description |
|---|---|---|---|
| `VITE_CLICKUP_CLIENT_ID` | **Config** | Production, Preview, Dev | ClickUp App Client ID (public, used in browser OAuth URL) |
| `CLICKUP_CLIENT_ID` | **Secret** or **Config** | Production, Preview, Dev | Same Client ID used by `/api` serverless functions |
| `CLICKUP_CLIENT_SECRET` | **Secret** | Production, Preview, Dev | ClickUp App Client Secret (**strictly private**, server-only) |
| `VITE_APP_URL` | **Config** | Production, Preview, Dev | Base URL (e.g., `https://work-allocation-tool.vercel.app`) |
| `VITE_CLAUDE_API_KEY` | **Config** | Production, Preview, Dev | Claude API Key for frontend analyzer |

> **Note on Vercel "Public Framework Prefix" Warning**:
> Variables starting with `VITE_` are bundled into the client browser build by Vite. Because a **Client ID** in OAuth is public by design, select the **"Config"** card (not "Secret") in Vercel to dismiss the warning. Only true secrets (like `CLICKUP_CLIENT_SECRET` without the `VITE_` prefix) should use the **"Secret"** type.

### 3.4 Dual Authentication Support (OAuth 2.0 & Personal API Token)
The integration supports two complementary connection methods:
1. **OAuth 2.0 (1-Click Login)**: Best for team accounts without exposing raw API keys. Uses `/api/clickup/callback` serverless exchange.
2. **Personal API Token (`pk_...`) Direct Connect**: Direct instant token verification against ClickUp API v2, useful for immediate setup or environments where OAuth callback hasn't yet been authorized. Tokens are verified via `/user` and saved to `localStorage`.

### 3.5 UI Entry Points & Visibility
- **Main Dashboard Header (`VisualAgencyHub.tsx`)**: High-visibility pill button displaying real-time status (`⚡ Connect & Sync ClickUp` or `● ClickUp Connected`) placed directly in the primary executive action bar.
- **Navigation Sidebar (`Navbar.tsx`)**: Prominent connection card situated directly below the profile/role switcher in Section 1 (always above the fold, regardless of viewport height) with an additional synchronized indicator in the bottom footer.

### 3.6 Serverless API Proxy (`api/clickup/proxy.js`)
Because ClickUp API v2 does not return permissive CORS headers to client browsers, direct browser calls to `https://api.clickup.com/api/v2/*` are blocked by web browsers. The app routes all authenticated ClickUp requests (`/team`, `/task`, etc.) through the same-origin serverless proxy:
```
Browser -> /api/clickup/proxy?endpoint=/team -> ClickUp API v2 -> Browser
```
This guarantees zero CORS errors and seamless workspace/task fetching on production and preview environments.

## 4. Vercel Routing Configuration (`vercel.json`)
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/$1"
    },
    {
      "source": "/((?!api/).*)",
      "destination": "/index.html"
    }
  ]
}
```
- Preserves `/api/*` for Vercel Serverless Functions.
- Directs all other client routes to `/index.html` for client-side routing.

---

## 5. Key File Tree
- `api/clickup/callback.js` — Serverless OAuth token exchange handler
- `api/clickup/proxy.js` — Serverless CORS proxy for ClickUp API v2 requests
- `src/services/clickupOAuth.ts` — Client-side OAuth service, token storage, and proxied ClickUp API callers
- `src/components/ClickUpOAuthModal.tsx` — Connection modal, workspace selector, and task overview
- `src/components/Navbar.tsx` — Sidebar navigation containing the live ClickUp status button
- `src/components/VisualAgencyHub.tsx` — Central dashboard view with team allocations, project grids, and modals


---

## 6. Deployment & Git Workflow
To deploy changes:
```bash
git add .
git commit -m "Your commit message"
git push origin main
```
Vercel automatically listens to pushes on `main` and redeploys the production environment.

### 6.1 Git Author Configuration & Vercel Linking
- Local Git author email is configured via `git config user.email` (set to `datyal.upwork@gmail.com`).
- Vercel and GitHub resolve the commit author by matching the commit email against registered emails in the GitHub account. All future commits will now automatically link to your GitHub profile and Vercel account.

---

## 7. Extended ClickUp Multi-Feature Integration & Synchronization

The Work Allocation Tool integrates 5 core feature modules connecting directly to ClickUp's v2 REST API via the serverless CORS proxy (`/api/clickup/proxy`):

### 7.1 Time Tracking & Timesheet Sync
- **Service Caller**: `fetchClickUpTimeEntries(teamId, startDate, endDate)`
- **Endpoint**: `GET /api/v2/team/{team_id}/time_entries`
- **Functionality**:
  - Fetches real-time logged hours over customizable date ranges (defaults to the last 7 days).
  - Displays a dedicated metric banner (Total Hours Logged, Active Loggers, Total Time Entries).
  - In `VisualAgencyHub.tsx`, `handleImportClickUpTimeEntries` parses durations (milliseconds to hours) and updates active project hours (`activeHours` & `actualHoursLogged`), instantly synchronizing the DSR Tracker and resource utilization analytics.
- **Manual Log Creation**: `createClickUpTimeEntry(teamId, { taskId, durationMs, description, startTimestamp })` allows pushing logged hours directly from agency tasks to ClickUp time entries.

### 7.2 Team Member & Assignee Roster Sync
- **Service Caller**: `fetchClickUpTeamMembers(teamId)`
- **Endpoint**: `GET /api/v2/team`
- **Functionality**:
  - Retrieves all active workspace users, emails, roles (Owner, Admin, Member), profile pictures, and custom color accents.
  - In `VisualAgencyHub.tsx`, `handleImportClickUpMembers` provides a one-click import into the internal squad roster. Members are mapped into `TeamMember` entities with custom color swatches (`colorSwatch`), initial skills, general competency scoring, and capacity tracking.

### 7.3 Spaces, Folders & Lists Dual-Hierarchy Browser
- **Service Callers**:
  - `fetchClickUpSpaces(teamId)`: `GET /api/v2/team/{team_id}/space`
  - `fetchClickUpFolders(spaceId)`: `GET /api/v2/space/{space_id}/folder?archived=false`
    - Parses folder task count and nested `lists: ClickUpList[]`.
    - Automated child list backfill: If ClickUp does not provide child lists inline for a folder, `fetchClickUpLists(token, folder.id, true)` is executed in parallel to guarantee complete sub-list population.
  - `fetchClickUpLists(folderOrSpaceId, isFolder)`: `GET /api/v2/folder/{folder_id}/list` or `GET /api/v2/space/{space_id}/list`
    - In ClickUp API v2, `GET /space/{space_id}/list` returns *only* folderless lists.
  - `fetchClickUpListTasks(listId)`: `GET /api/v2/list/{list_id}/task?subtasks=true`
- **Dual-Stream Hierarchy Engine (`loadHierarchy`)**:
  - Executes `fetchClickUpFolders` and `fetchClickUpLists` in parallel with `Promise.all` upon Space selection.
  - Separates entities into client/project **Folders** (`ClickUpFolder[]`) and **Space Lists (Folderless)** (`ClickUpList[]`).
  - Automatically expands all folders on initial load with interactive accordion toggle (`ChevronDown` / `ChevronRight`, `FolderOpen` / `FolderClosed`).
  - Aggregates all discovered lists into `lists` for global task count summaries and unified target selection.
  - In the "Create Task" tab, target lists are organized by `<optgroup label="📁 Folder: {name}">` and `<optgroup label="📄 Space Lists (Folderless)">` for effortless deliverable routing.
  - Direct Deep-Linking & Click-to-Open:
    - **Spaces**: Dedicated `[↗]` deep link opens `https://app.clickup.com/{workspace_id}/v/s/{space_id}` directly in ClickUp web app.
    - **Folders**: Dedicated `[↗]` deep link opens `https://app.clickup.com/{workspace_id}/v/f/{folder_id}` in ClickUp.
    - **Lists**: Dedicated `[↗]` deep link opens `https://app.clickup.com/{workspace_id}/v/li/{list_id}` in ClickUp.
    - **Tasks**: Clicking anywhere on the task card or clicking `Open [↗]` opens the task URL directly in ClickUp.
  - Automatically loads tasks for the first available list and renders them with pure white typography (`#ffffff`), status badges, and direct ClickUp deep-links.

### 7.4 Bi-Directional Task Creation (Deliverables -> ClickUp)
- **Service Caller**: `createClickUpTask(listId, taskData)`
- **Endpoint**: `POST /api/v2/list/{list_id}/task`
- **Payload Schema**:
  ```json
  {
    "name": "Deliverable Title",
    "description": "Task brief and requirements",
    "priority": 1, // 1: Urgent, 2: High, 3: Normal, 4: Low
    "status": "to do",
    "tags": ["SEO", "Agency-Hub"],
    "due_date": 1787126400000 // Epoch milliseconds
  }
  ```
- **Functionality**:
  - Embedded "Create Task" tab inside `ClickUpOAuthModal.tsx` allows agency managers to push new deliverables or project scopes directly to any selected ClickUp list without leaving the Work Allocation Tool.

### 7.5 Sprint Kanban Status Synchronization
- **Service Caller**: `updateClickUpTaskStatus(taskId, status)`
- **Endpoint**: `PUT /api/v2/task/{task_id}`
- **Payload Schema**:
  ```json
  {
    "status": "in progress"
  }
  ```
### 7.6 Modal UX Architecture, Backdrop Blur, Scrolling & Theme Protection
- **Guaranteed Backdrop Glassmorphism**:
  - Class `.clickup-modal-backdrop` uses fixed fullscreen positioning at `z-index: 99998` with `background-color: rgba(2, 6, 23, 0.85)` and `backdrop-filter: blur(16px)` to guarantee deep glassmorphic blur across both Dark and White themes.
  - Clicking the backdrop triggers `onClose()`.
- **Keyboard Dismissal**:
  - `useEffect` listens for the `Escape` key (`e.key === 'Escape'`) while the modal is open, immediately closing the modal.
- **Scroll Containment & Layout Stability**:
  - The modal card `.clickup-modal-card` is bounded to `max-height: 90vh` with fixed header `.clickup-modal-header` and fixed footer `.clickup-modal-footer`.
  - Task and item lists use `.clickup-task-scroll` and `.clickup-list-scroll` with a strict `max-height: 280px` constraint and custom slim webkit scrollbars. This prevents large ClickUp workspaces (with dozens of tasks) from stretching off-screen or pushing the header/footer out of view.
- **Theme Protection & Contrast**:
  - In White Theme (`body.theme-white`), the modal preserves its deep command-center styling (`#0b1120` card, `#070b16` header/footer, `#141c2e` item cards) with high-contrast text (`#f8fafc` titles, `#94a3b8` metadata, `#a855f7` purple badges).
  - **White Typography Override Prevention**: Global `body.theme-white .text-white` and `.text-slate-100` rules in `index.css` previously forced text colors to dark `#0f172a`. Dedicated CSS overrides (`body.theme-white .clickup-modal-card * { color: #ffffff !important; }`) and explicit inline styles (`style={{ color: '#ffffff' }}`) are applied across task titles, headers, spaces, and list cards, guaranteeing bright, crisp white text regardless of the parent theme state.
- **Header & Footer Cancel Controls**:
  - **Header**: Top-right `[Esc] Close` button with a visible red hover accent and keyboard hint badge.
  - **Footer**: Dedicated `Cancel / Close` button with clear border and icon, alongside the `Disconnect` button (for connected accounts) and `Done` confirmation button.

### 7.7 Implemented Full-Power ClickUp Integrations (Features A, B, E, F)

#### A. Real-Time Two-Way Sprint Kanban Drag-and-Drop Sync
- **Service Caller**: `updateClickUpTaskStatus(token, taskId, status)`
- **Endpoint**: `PUT /api/v2/task/{task_id}`
- **Status Mapping Table**:
  | Work Allocation Status | Canonical ClickUp Status |
  | :--- | :--- |
  | `backlog` / `assigned` | `to do` |
  | `in_progress` | `in progress` |
  | `review` | `in review` |
  | `completed` | `complete` |
- **Components Integrated**:
  - `SprintKanban.tsx` (`handleStatusTransition`): Automatically triggers `updateClickUpTaskStatus` when a task transitions between columns, with Sonner toast feedback confirming sync to ClickUp.
  - `VisualAgencyHub.tsx` (`handleUpdateTaskAllocation`): When a deliverable's status is toggled, dispatches immediate status updates to ClickUp.

#### B. Direct Task Deep Links Across Views
- **Deliverable Ledgers**: Interactive `[CU ↗]` badges rendered on project card deliverable pills in `VisualAgencyHub.tsx`.
- **Kanban Cards**: `[CU ↗]` external link badge in `SprintKanban.tsx` directly opening the ClickUp task URL in a new tab.
- **360° Project Inspection Drawer**: Detailed `[ClickUp #taskId ↗]` badge beside the task category selector, enabling one-click drill-down to the native ClickUp issue.

#### E. Smart Assignee & Capacity Mirroring
- **Service Caller**: `updateClickUpTaskAssignees(token, taskId, addAssigneeIds, remAssigneeIds)`
- **Endpoint**: `PUT /api/v2/task/{task_id}`
- **Matching Algorithm**:
  1. `clickUpUserId` exact match
  2. `clickUpEmail` vs `assignee.email` case-insensitive match
  3. Lowercase username vs squad member `name` fallback
- **Capacity Impact**:
  - When ClickUp tasks are synced or imported, the assignee's weekly allocated hours and utilization bars automatically reflect the ClickUp work scope.
  - Reassigning a deliverable inside `VisualAgencyHub.tsx` sends real-time assignee modifications (`assignees.add` and `assignees.rem`) directly to ClickUp.

#### F. Automated Background Sync & Webhook Subscriptions
- **Silent Background Polling Loop**:
  - Automatically activates in `VisualAgencyHub.tsx` when `isClickUpConnected()` is true.
  - Runs every 60 seconds (`setInterval` with cleanup on unmount) calling `fetchClickUpTasks(token, workspaceId)`.
  - Reconciles live statuses, names, and estimates with local project deliverables.
- **Executive Command Bar Status Pill**:
  - Displays `🟢 Live Sync Active (Synced Xm ago)` with an animated ping indicator.
  - Includes an instant manual refresh icon button (`<RefreshCw />`) for immediate polling.
### 7.8 Implemented Cross-Tab ClickUp Feature Architecture

1. **Tab 1: Active Projects (`projects` view in `VisualAgencyHub.tsx`)**:
   - **ClickUp List & Space Linking**: `ActiveProjectItem` extended with `clickUpListId`, `clickUpListName`, `clickUpSpaceId`, `clickUpFolderId`.
   - **ClickUp List Auto-Import Wizard**: In Add Project Modal (Step 1), "⚡ Select ClickUp List" queries `fetchClickUpSpaces` and `fetchClickUpLists`, allowing managers to pick any list. Auto-fills Project Name, Client, and populates all deliverable tasks with matching squad members and hours.
   - **ClickUp List Deep Link on Cards**: Project cards show an interactive `📁 ClickUp: [ListName ↗]` link opening the list in ClickUp.
   - **360° Inspection Drawer "🚀 Push to ClickUp"**: Pushes un-synced project deliverables into ClickUp tasks using `createClickUpTask`, returning IDs and URLs.

2. **Tab 2: Activity Calendar (`ActivityCalendar.tsx`)**:
   - **Due Date Ingestion**: Queries `fetchClickUpTasks(token, wsId)` and transforms tasks with `due_date` into calendar events with `[CU ↗]` deep-link badges.
   - **Modal Deep Link**: Opening any ClickUp event displays direct "Open in ClickUp [↗]" button in the modal header.

3. **Tab 3: Employee Hours (`VisualAgencyHub.tsx`)**:
   - **ClickUp Linked Badges**: Specialists linked via `clickUpUserId` display a high-contrast `CU Linked` badge on capacity roster cards and workload stacks.

4. **Tab 4: DSR Tracker & Plan (`DSRTrackerStudio.tsx`)**:
   - **Live Time Sync**: "⚡ Sync ClickUp DSR Time" button queries `fetchClickUpTimeEntries` for the workspace, aggregates actual tracked durations into hours, maps to matched specialists by ID/email/name, and populates weekly logged hours (`log`) across W1–W5.
   - **Sync Status**: Displays timestamp of last time sync (`⚡ Synced (HH:MM)`).

5. **Tab 6: Job Delivery Bot (`VisualAgencyHub.tsx`)**:
   - **1-Click Deploy to ClickUp**: Added "🚀 Deploy Scope to ClickUp" in the Job Delivery Bot dispatch footer, creating all generated deliverables into ClickUp tasks via `createClickUpTask`.

6. **Tab 9: Task Backlog (`TaskBacklog.tsx`)**:
   - **ClickUp Backlog Ingestion**: "⚡ Import ClickUp Backlog" button fetches unassigned tasks from ClickUp, maps required skills and estimates, and appends them to the backlog.
   - **Direct Task Deep Links**: Backlog cards render `[CU #task ↗]` badges opening the native ClickUp task URL.

### 7.9 ClickUp CRM Accounts/Clients Ingestion & Active Projects Roster Replacement

#### Overview & Problem Addressed
Agencies frequently maintain their complete client roster inside a specific ClickUp list, e.g., **`Growth > CRM > Accounts/Clients`** (holding 60 client retainer accounts). Previously, the application only synced ClickUp tasks as deliverable line items (`taskBreakdown`) within pre-existing projects. Section 7.9 introduces full **Client Roster Ingestion**, converting each ClickUp account/task into an autonomous `ActiveProjectItem` and allowing managers to completely replace or append to the active projects roster with 1-click.

#### Technical Implementation Details:
1. **API Enhancements (`src/services/clickupOAuth.ts`)**:
   - `fetchClickUpListTasks`: Extended with `subtasks=true&include_closed=true` parameter so all accounts (including archived, completed, or multi-status client accounts) are fetched without pagination omissions.
   - `ClickUpTask` Interface: Expanded with `priority`, `start_date`, `custom_fields`, `description`, and `text_content`.

2. **Modal Roster Sync Action Banner (`src/components/ClickUpOAuthModal.tsx`)**:
   - In the Spaces & Lists hierarchy viewer (`featureTab === 'hierarchy'`), lists containing client accounts (e.g., `Accounts/Clients`) receive a prominent `CRM Roster` badge.
   - When inspecting any list with tasks, a dedicated **Active Client Roster Ingestion** banner renders above the task cards:
     - **`⚡ Replace Active Projects ({N})`**: Prompts confirmation to prevent accidental loss, transforms all `{N}` ClickUp accounts into `ActiveProjectItem` records, and cleanly replaces the existing `projectsList`.
     - **`➕ Add to Projects ({N})`**: Merges new accounts into active projects avoiding duplicate `id` / `clickUpTaskId`.

3. **Smart Field Mapping Algorithm (`src/components/VisualAgencyHub.tsx` - `handleImportProjectsFromClickUpList`)**:
   - **ID**: `prj_cu_${task.id}` (persisting ClickUp task identifier).
   - **Client & Name**: Cleaned of separators (` - `, ` | `, `:`), deriving client name and retainer title.
   - **Retainer Pricing & Budget**: Dynamically parses ClickUp `custom_fields` (`budget`, `retainer`, `amount`, `fee`, `value`) or regex matches `$[0-9,]+` in task titles. Defaults to `$3,500 / mo` (numeric: 3500) if unspecified.
   - **Client Tiering**: Processed through `classifyClientTier`, categorizing accounts into `TIER_S_VIP`, `TIER_A_AGENCY`, or `TIER_B_LOCAL`.
   - **Status Mapping**:
     - `done` / `complete` / `closed` $\rightarrow$ `'COMPLETED'` (100% progress, 4 milestones).
     - `pause` / `hold` $\rightarrow$ `'PAUSED'` (25% progress, 1 milestone).
     - `reval` / `risk` / `issue` $\rightarrow$ `'REVALUATION'` (30% progress, 1 milestone).
     - `lead` / `new` / `initial` / `onboard` $\rightarrow$ `'INITIAL STAGE'` (20% progress, 1 milestone).
     - `review` / `qa` / `progress` / `open` $\rightarrow$ `'ON TRACK'` (50–75% progress, 2–3 milestones).
   - **Priority Mapping**: ClickUp `urgent` $\rightarrow$ `'URGENT'`, `high` $\rightarrow$ `'HIGH'`, `low` $\rightarrow$ `'LOW'`, default $\rightarrow$ `'NORMAL'`.
   - **Hours**: Derived from `task.time_estimate` (or default 20h total, 15h active).
   - **Assignee Resolution**: Automatically matches ClickUp task assignees against `customMembers` via `clickUpUserId`, `clickUpEmail`, or username, allocating Lead and Client Call Assignees.
   - **Deliverables**: Auto-creates 3 default deliverables (Technical SEO, On-Page SEO, Client Communications) equipped with ClickUp deep links (`clickUpTaskId`, `clickUpUrl`, `clickUpStatus`).

4. **Interactive Import Scope Selection (Tasks vs. Subtasks vs. Both)**:
   - **Service Layer (`src/services/clickupOAuth.ts`)**:
     - `ClickUpTask` model updated with `parent?: string | null`.
     - `fetchClickUpListTasks`: Accepts `subtaskFilter: 'tasks' | 'subtasks' | 'both'`. When querying ClickUp API, `subtasks=true` fetches both, and client filtering differentiates root accounts (`!t.parent`) from nested subtasks (`!!t.parent`).
   - **Hierarchy Task Preview Filter Tabs (`ClickUpOAuthModal.tsx`)**:
     - Live counter tabs for `All ({N})`, `📌 Tasks Only ({N})`, and `↳ Subtasks Only ({N})`.
     - Visual badge `↳ Subtask` attached to subtask line items.
   - **Confirmation Scope Dialog (`ClickUpOAuthModal.tsx` & `VisualAgencyHub.tsx`)**:
     - Triggered on clicking "⚡ Replace Active Projects" or "➕ Add to Projects", or using the executive "⚡ Sync CRM Accounts" shortcut.
     - Prompts the user with three interactive visual cards:
       1. **📌 Tasks Only (Parent Accounts)**: Imports only top-level client accounts, skipping subtasks (ideal for client retainers).
       2. **↳ Subtasks Only**: Imports nested subtasks as individual project items.
       3. **⚡ Both Tasks & Subtasks**: Imports all parent tasks and all nested subtasks.
     - Includes dynamic count calculation and selection of "Replace" vs. "Append" modes before execution.

5. **1-Click Executive Command Bar Shortcut**:
   - Located directly in the top executive action bar beside `Live Sync`:
     - **`⚡ Sync CRM Accounts`**: Automatically scans ClickUp spaces for `Growth > CRM > Accounts/Clients`, fetches tasks, triggers the Scope Selection Dialog, and executes instant roster synchronization and replacement according to the manager's chosen scope.

6. **High-Contrast Portaled Modal Architecture & Deep Backdrop Blur Isolation**:
   - **Full Viewport Portal Escaping**:
     - Both `ClickUpOAuthModal.tsx` and `crmImportScopeModal` in `VisualAgencyHub.tsx` are portaled directly to `document.body` via React's `createPortal`.
     - This escapes the CSS transform stacking context created by `<motion.div key={activeTab}>` inside `<main>`, ensuring the backdrop seamlessly covers the entire screen, including the left `<Navbar>` and top headers.
   - **Frosted Glass Backdrop & Stacking Fix**:
     - Container `.clickup-scope-container` is fixed at `z-index: 99999`.
     - Backdrop `.clickup-scope-backdrop` is set to `z-index: 1`, and `.clickup-scope-card` is explicitly set to `z-index: 10` with `pointer-events: auto` and `onClick={(e) => e.stopPropagation()}`.
     - **Root Cause & Fix**: Previously, an inner backdrop element with fixed `z-index: 99998` overlapped the modal card (which had `z-index: auto`), causing all pointer events/clicks to be intercepted by the backdrop and rendering an 88% dark blur veil over the modal content. Placing the backdrop behind the card at `z-index: 1` and elevating the card to `z-index: 10` restored full clickability and pristine crisp rendering.
   - **Solid Theme Isolation & Typography Contrast**:
     - Modal shells `.clickup-scope-card` use 100% solid surface `#0c1427` with multi-layered drop shadows (`box-shadow: 0 30px 70px -10px rgba(0,0,0,0.95)`) and radiant glowing borders (`border: 1px solid rgba(16, 185, 129, 0.45)`).
     - Radio selection cards use `.clickup-scope-item` with solid `#121a2d` backgrounds, eliminating any translucent bleed-through. Selected states feature gradient accents (`is-selected-tasks`, `is-selected-subtasks`, `is-selected-both`) with matching neon pills.
     - Pure white headings (`#ffffff`) and slate subtitles (`#cbd5e1`) are reinforced both with CSS `!important` rules and explicit inline styles (`style={{ color: '#ffffff' }}`), preventing global `body.theme-white` overrides from inverting text to dark navy/black on dark modal surfaces.

7. **Unassigned / Blank Assignee Support & Custom Column Preservation During Ingestion**:
   - **Blank / Unassigned Support Across All Drawers & Modals**:
     - Added `-- Unassigned (Leave Blank) --` (`value=""`) option to Leadership dropdowns: `Assignee (Team Lead)` (`projectLeadId`), `Client Face (Call Lead)` (`clientCallAssigneeId`), and `Dev / Tech Lead` (`devTechAssigneeId`) in both Add Project Drawer and Edit Project Drawer.
     - Added `-- None / Blank --` option to `Communication Channel` and `Reporting Platform` select menus.
     - Added `-- Unassigned --` option to granular Deliverable Specialist rows in both Drawers and the 360° Project Detail modal.
     - Removed artificial fallbacks (such as `editingProject.projectLeadId || customMembers[0]?.id`) so empty string values render the blank option cleanly.
     - Updated `handleCreateProject` and `handleSaveEditedProject` to sanitize empty strings to `undefined` and calculate active hours and member hour maps safely without crashing.
     - Enhanced table and grid views to render clean placeholder avatars (circular dashed `?` pills) and italicized `"Unassigned"` labels when leadership roles are left blank.
   - **ClickUp Ingestion Assignee Behavior**:
     - In `handleImportProjectsFromClickUpList`, eliminated automatic fallback team assignment (`customMembers[idx % customMembers.length]`). Tasks without assignees in ClickUp remain completely unassigned (`projectLeadId: undefined`, `clientCallAssigneeId: undefined`, `squadMembers: []`).
   - **Custom Column Preservation Architecture**:
     - **Verification**: Clarified that existing application custom columns in `ActiveProjectItem` (`ga4Access`, `gbpAccess`, `gscAccess`, `gtmAccess`, `backendLoginsNote`, `communicationChannel`, `billingAccount`, `guestPostIncluded`, `reportingNote`, `reportingPlatform`, `serviceLabels`, `monthlyHistory`, `clientTier`, etc.) were **never deleted or removed**.
     - **Non-Destructive Ingestion Merge**: When ClickUp lists or tasks are imported (in either "Replace" or "Append" mode), the ingestion engine performs an existing project lookup (`projectsList.find(p => p.id === prjId || p.client.toLowerCase() === clientName.toLowerCase())`).
     - Any matched project retains 100% of its previously configured operational audit credentials, login notes, access statuses, and monthly history, merging incoming ClickUp fields without wiping local custom column data.
