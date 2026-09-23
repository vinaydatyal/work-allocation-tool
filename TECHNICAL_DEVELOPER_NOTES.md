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

8. **Live ClickUp Ticket Discussion, Commenting & Activity Audit Modal (`ClickUpTaskActivityModal.tsx`)**:
   - **Full Bi-Directional Discussion Engine**:
     - Allows managers and specialists to view live conversation threads, client ticket updates, and internal discussions directly from the Work Allocation dashboard without switching browser tabs.
     - **Post Comments**: Users can type updates or client responses directly in the modal. Includes hotkey support (`Ctrl+Enter` / `Cmd+Enter`), real-time posting state indicators, and instant thread refresh.
     - **Comment Formatting & User Attributions**: Automatically parses ClickUp comment text and rich-text blocks (`getCommentPlainText`), displaying commenter avatars, user initials, exact formatted timestamps (`formatCommentDate`), and quick 1-click clipboard copying.
   - **Task Lifecycle Audit & Time in Status**:
     - Tabbed navigation allows switching between **💬 Comments & Discussion** and **⏱️ Activity & Time in Status**.
     - Integrates with ClickUp API (`fetchClickUpTaskTimeInStatus`) to display total time spent in each workflow status stage (e.g., In Progress, Review, Completed) with visual distribution progress bars.
     - Displays comprehensive task metadata: Status, Priority, Assignees, Due Date, Estimated vs. Tracked Hours, and parent project context.
   - **Dashboard-Wide Deep Integration Points**:
     - **360° Visual Project Detail Modal**: Added `💬 Ticket Discussion` button in the header and inline `MessageSquare` conversation icons on each deliverable task row.
     - **Table View**: Added `MessageSquare` discussion trigger button in the row action controls for all ClickUp-linked projects.
     - **Executive Grid Cards**: Added `Discussion` badge in the project card header and inline discussion buttons on each deliverable task pill.
     - **Tab 4 (Job Delivery Bot)**: Added `💬 Ticket Discussion` button in the squad verification and package dispatcher controls.
   - **Data Privacy Guard**:
     - Prominently displays privacy badge confirming that internal financial retainers, milestone calculations, and sensitive client access notes remain local and are never exposed or transmitted when interacting with ClickUp discussions.

9. **Executive Project Health & Churn Radar + Team Workload Heatmap & Reassignment Shield**:
   - **Multi-Factor Project Health & Churn Radar (`ProjectHealthRadar.tsx`)**:
     - **Deterministic Risk Scoring Algorithm**: Calculates project health score (0-100) across 5 weighted operational dimensions:
       1. *Burn Rate & Capacity Utilization*: Checks if allocated weekly deliverable hours exceed contract scope or if zero hours are assigned.
       2. *Payment & Invoicing Health*: Evaluates payment status (`Paid` = +0, `Pending` with past due date = -35, `Overdue` = -45).
       3. *Account Access Governance*: Scans GA4, GBP, GSC, GTM, and Backend Login statuses. Flags missing or unverified access credentials (-10 to -20 penalty).
       4. *Lifecycle & Progress Stagnation*: Evaluates `INITIAL STAGE` or `REVALUATION` duration, missing communication channels, and inactive task breakdowns.
       5. *Leadership Accountability*: Flags unassigned Team Lead (`projectLeadId`) or Call Lead (`clientCallAssigneeId`) with a -20 risk penalty.
     - **Dynamic Health Tiers**: Categorizes projects into `🟢 Thriving (85-100)`, `🟡 Attention Needed (70-84)`, `🟠 At Risk (50-69)`, and `🔴 Critical / Churn Hazard (<50)`.
     - **Quick Radar Capsule Filter Bar (`ProjectHealthRadarFilterBar`)**:
       - Embedded seamlessly in Tab 1 (Filter & Analytics Studio) right above status pills.
       - Allows one-click isolation of `Critical (Churn Hazard)`, `At Risk`, `Attention Needed`, or `Thriving` portfolios with live counts.
     - **Interactive Health Badges & 360° Diagnostic Slideover Modal (`ProjectHealthDiagnosticModal`)**:
       - Rendered on both Table rows, Grid cards, and the 360° Project Detail modal header.
       - Clicking any health badge opens a deep diagnostic dossier showing:
         - Circular SVG health score gauge with animated glow and status indicators.
         - Active Risk Factor Breakdown with severity tags, point impact, and explanation.
         - Actionable Resolution Steps with immediate 1-click execution guides.
         - Instant Slack/WhatsApp Client Alert Generator with 1-click clipboard copying.
   - **Team Workload Heatmap & Reassignment Shield (`WorkloadHeatmap.tsx`)**:
     - **Interactive View Switcher**: Tab 2 (Employee Hours & Resource Management) features a toggle between `👥 Member Cards` (classic roster view) and `🔥 Workload Heatmap & Shield`.
     - **Utilization & Capacity Color Coding**:
       - `Overloaded (>100% capacity)`: Red/Rose gradient with animated flame pulse.
       - `Optimal Load (75-100%)`: Emerald/Cyan active efficiency.
       - `Under-Utilized (<75%)`: Amber/Purple indicator for available bandwidth.
     - **Interactive Deliverable Reassignment Shield Modal**:
       - Allows managers to click `Reassign` on any deliverable belonging to an overloaded member.
       - Displays candidate team members with available hours and real-time preview of their new capacity before confirming.
       - Updating reallocates the task immediately across all active projects and state stores.

10. **High-Contrast Modal Architecture, Permanent Project Deletion Engine & Custom Column Preservation**:
    - **Ultra-High Contrast & Typography Accessibility in Modal Overlays**:
      - Introduced centralized CSS design tokens in `index.css`: `.modal-tab-active`, `.modal-tab-inactive`, `.modal-save-btn`, `.modal-delete-btn`, and `.modal-cancel-btn`.
      - `.modal-tab-active` enforces solid cyan `#06b6d4` with pure white `#ffffff` bold text and subtle border glow, ensuring tab names and step indicators are 100% visible and never washed out on any monitor.
      - `.modal-save-btn` enforces solid emerald `#059669` background with crisp white `#ffffff` text, preventing low-contrast dark text on bright buttons.
      - `.modal-delete-btn` provides high-contrast rose `#e11d48` destructive styling with clear warning icons.
      - Applied universally across **Edit Project Drawer**, **Add Project Drawer**, and **360° Visual Project Detail Modal**.
    - **Full Project Deletion Engine & Safety Confirmation Flow**:
      - Implemented `handleDeleteProject(projectId: string)` in `VisualAgencyHub.tsx` that removes the target project from `projectsList`, closes all open editing/viewing slideout states, recalculates assigned member hours across the team roster, and persists the updated roster to `localStorage`.
      - **Dedicated Confirmation Modal Portal**: Triggering delete opens a high-contrast confirmation modal mounted via `createPortal(..., document.body)` with `z-[100000]` and `backdrop-blur-md`, displaying client name, retainer amount, deliverable count, and weekly allocated hours before requiring explicit deletion confirmation.
      - **Ubiquitous Delete Entrypoints**: Added Delete buttons across:
        - Edit Project Drawer footer (`Delete Project`)
        - 360° Visual Project Detail Modal header and footer (`Delete Project`)
        - Executive Table View row actions (`Trash2` icon)
        - Executive Grid View card header actions (`Trash2` icon)
    - **Custom Column Preservation Guarantee**:
      - **Confirmation**: Confirmed that native application custom columns (`communicationChannel`, `billingAccount`, `ga4Access`, `gbpAccess`, `gscAccess`, `gtmAccess`, `guestPostIncluded`, `backendLoginsNote`, `reportingNote`, `reportingPlatform`, `serviceLabels`, `monthlyHistory`, `clientTier`, etc.) were **never deleted or removed**.
      - **Non-Destructive Ingestion**: During ClickUp imports, matched existing projects retain 100% of their local custom column data, merging incoming ClickUp fields without wiping local operational audit details.
    - **Unassigned / Blank Field Support**:
      - All leadership dropdowns (`Assignee (Team Lead)`, `Client Face (Call Lead)`, `Dev / Tech Lead`) and deliverable rows now support `-- Unassigned (Leave Blank) --` (`value=""`).
      - ClickUp tasks with no assignees are cleanly ingested as unassigned without forcing arbitrary fallback team members.

11. **Comprehensive Past Projects Archive & Trash Safety Management Engine**:
    - **Archived Data Model (`ArchivedProjectItem`)**:
      - Extends `ActiveProjectItem` with non-destructive archival telemetry:
        - `archivedAt`: ISO 8601 timestamp recording when the project was retired or trashed.
        - `archiveCategory`: Distinct separation between `'past_project'` (historical client retainers & completed deliverables) and `'trash'` (soft-deleted items awaiting permanent removal).
        - `archiveReason`: User or system reason (e.g., "Moved to Past Projects folder", "Moved to Trash").
      - Persisted locally under `wat_agency_archived_projects_v1` with error resilience and instant sync.
    - **Tri-Choice Project Retirement & Deletion Workflow**:
      - Replaced destructive one-way deletion dialogs with a comprehensive, user-friendly **"Project Retirement & Trash"** modal dialog mounted via `createPortal(..., document.body)`:
        1. **📁 Move to Past Projects Folder**: Safely retires the project, frees active team workload, and archives complete client records, deliverable breakdowns, GA4/GBP/GSC access history, and invoice history.
        2. **🗑️ Move to Trash Folder**: Soft-deletes the project into the Trash holding bin, immediately restorable back into active roster with 1 click.
        3. **⚠️ Delete Permanently**: Irreversibly purges the project without saving to archive.
      - **Dedicated Action Buttons**: Added high-contrast `.modal-archive-btn` (indigo `#4f46e5`) and `.modal-trash-btn` (amber/orange `#d97706`) buttons to:
        - Edit Project Drawer sticky footer
        - 360° Visual Project Detail Modal sticky footer
        - Project Retirement confirmation dialog
    - **Dedicated Sub-Hub Tab 4 (`Past Projects & Trash`) & Toolbar Trigger**:
      - **Toolbar Shortcut**: Added `Past Projects & Trash` button with folder icon and live count badge directly in the primary agency header toolbar.
      - **Segmented Sub-Hub Tab**: Integrated Sub-Tab 4 into the primary sub-hub navigation bar alongside `Projects & Retainers`, `Squad Workload & Heatmap`, and `VIP & Financial Pulse`.
      - **Filtering & Search Studio**:
        - Segmented filter controls: `All (${count})`, `📁 Past Projects (${count})`, `🗑️ Trash (${count})`.
        - Real-time search filter matching project name, client, or team lead.
        - `Empty Trash` button with bulk removal for trashed items.
      - **Interactive Archive Grid**:
        - High-contrast card display with category badges (`Past Project` vs. `In Trash`), contract retainer price, deliverable counts, freed weekly hours, and archive timestamp.
        - **🔄 1-Click Restore**: Moves project back into the active roster and recalculates employee workload instantly with toast notification.
        - **👁️ 360° Inspection**: Full access to historic audit records, invoices, and deliverable notes.
        - **⇄ Category Switching**: Easily move items between Trash and Past Projects folders.
  12. **Weekly Hourly Billing Auto-Calculation & Dynamic Pricing Engine**:
    - **Business Logic & Formula Specification**:
      - For contracts billed on an hourly basis (`Weekly Hourly Billing`), the financial price is determined by the hourly rate multiplied by the allocated weekly deliverable hours:
        $$\text{Weekly Billing Amount} = \text{Hourly Rate} \times \text{Allocated Weekly Hours}$$
        $$\text{Monthly Billing Estimate} = \text{Weekly Billing Amount} \times 4 = \text{Hourly Rate} \times \text{Allocated Weekly Hours} \times 4$$
    - **Real-Time Dynamic Form Experience**:
      - **Dynamic Form Labels**: When `Weekly Hourly Billing ($/hr)` is selected as the billing method in either Add Project Drawer or Edit Project Drawer, the price field label dynamically transitions from `Price Tag ($ / mo)` to `Hourly Rate ($ / hr)`, with helpful placeholder guidance (`e.g. 17 or $17/hr`).
      - **Interactive 4-Metric Calculation Banner**:
        - Displays in real-time beneath the billing inputs in Tab 2:
          1. **Hourly Rate**: Extracted `$X/hr`.
          2. **Assigned Scope**: Sum of weekly allocated hours across specialists (or base hours if no deliverables specified yet).
          3. **Weekly Billing**: `Weekly Rate × Assigned Scope` formatted as `$X / wk`.
          4. **Monthly Estimate (4 wks)**: `Weekly Rate × 4` formatted as `$Y / mo`.
        - Features interactive warnings if 0 deliverable hours are currently assigned.
      - **Live Auto-Calc Badges in Tab 3 (Deliverables)**:
        - When managers adjust deliverable hours across SEO, AEO, Dev, or Content specialists, a live badge `⚡ Auto-Calc: $X/wk ($Y/mo)` updates synchronously in the deliverable allocation header.
    - **ClickUp Ingestion Auto-Resolution**:
      - In `handleImportProjectsFromClickUpList`, tasks marked with hourly billing indicators (via title `hourly`, `/hr`, `per hour` or custom fields) automatically detect `Weekly Hourly Billing`.
      - Extracts the numeric rate and computes formatted pricing strings (e.g., `$17/hr ($170/wk • $680/mo)`) and populates `paymentAmountNumeric` with the monthly equivalent for revenue reporting.
    - **Financial Rollup & Revenue Analytics Integration**:
      - Project cards, tables, and financial pulse tabs seamlessly recognize hourly rate breakdowns while aggregating projected monthly agency revenue accurately.
  13. **Unassigned / Blank Leadership & Deliverable Assignee Support**:
    - **Context & Motivation**:
      - Previously, leadership selection dropdowns (`Assignee (Team Lead)`, `Client Face (Call Lead)`, `Tech / Dev Lead`) and deliverable allocation dropdowns forced a team member selection, or defaulted to the first team member (e.g., Vinay) when importing from ClickUp tasks without assigned users.
    - **Implementation**:
      - Added high-contrast `-- Unassigned / Leave Blank --` (`value=""`) option at the top of:
        - `newProjectLeadId` (Add Project Drawer)
        - `newClientCallAssigneeId` (Add Project Drawer)
        - `newDevTechAssigneeId` (Add Project Drawer)
        - `tb.assigneeId` (Deliverable allocations in Add Project Drawer)
        - `editingProject.projectLeadId` (Edit Project Drawer)
        - `editingProject.clientCallAssigneeId` (Edit Project Drawer)
        - `editingProject.devTechAssigneeId` (Edit Project Drawer)
        - `editingProject.taskBreakdown[].assigneeId` (Deliverable allocations in Edit Project Drawer)
      - Updated card and table view renders to gracefully show empty/unassigned states (`Unassigned` dashed pill or neutral placeholder) rather than breaking or displaying missing member errors.
  14. **ClickUp Ingestion & Custom Column Preservation Architecture**:
    - **Audit of Custom Columns**:
      - **Confirmation**: Existing custom columns and operational tracking fields were **NEVER deleted**. All fields defined in `ActiveProjectItem` remain active, queryable, and editable:
        - Audit & Setup Access: `ga4Access`, `gbpAccess`, `gscAccess`, `gtmAccess`, `backendLoginsNote`
        - Client Relations & Operations: `communicationChannel`, `billingAccount`, `guestPostIncluded`, `reportingNote`, `reportingPlatform`, `serviceLabels`
        - Time & Capacity Tracking: `weeklyHoursOffPage`, `weeklyHoursOnPage`, `weeklyHoursTech`, `actualHoursLogged`
        - Tiering & History: `clientTier`, `monthlyHistory`
    - **Smart Field Merge on Re-Import / Ingestion**:
      - During `handleImportProjectsFromClickUpList`:
        - If a project being imported already exists in the system (matched by ClickUp Task ID, internal ID, or client name), the importer performs a **non-destructive field merge**:
          - Preserves existing custom column values (`ga4Access`, `communicationChannel`, `billingAccount`, `backendLoginsNote`, `guestPostIncluded`, `serviceLabels`, `monthlyHistory`, etc.).
          - Merges newly incoming ClickUp custom fields or scope without overwriting already audited operational parameters.
        - Tasks in ClickUp with no assignees are left **unassigned/blank** (`projectLeadId: undefined`, `clientCallAssigneeId: undefined`, `members: []`) rather than artificially assigning fallback team leads.
  15. **Conversation Export & Audit Log Generation**:
    - **Overview**: Generated clean, structured chronological Markdown chat export parsing all 170 conversation turns from IDE transcript telemetry.
    - **Artifacts**: Exported to both root workspace file [`CHAT_EXPORT.md`](file:///e:/Antigravity/Work%20Allocation%20Tool/CHAT_EXPORT.md) and IDE artifact directory for offline reference and compliance audit.
  16. **Executive Business Leads & Pipeline Modal Architecture**:
    - **Root Cause of Background Ghosting / Bleed-Through**:
      - In light/white theme (`.theme-white`), generic Tailwind utility classes like `bg-slate-950/80` and `bg-slate-900` were being forcibly overridden by global stylesheet rules (`background-color: #f8fafc !important;`), stripping out alpha opacity and backdrop blur. As a consequence, underlying sidebar navigation menu links and page elements bled directly through modal input fields.
    - **Frosted Isolation & Layer Hierarchy**:
      - Implemented an explicit backdrop element positioned with `fixed inset-0`, `zIndex: 1`, and forced inline styles: `backgroundColor: 'rgba(2, 6, 23, 0.85)'`, `backdropFilter: 'blur(16px)'`, completely insulating the dialog from any stylesheet resets.
    - **Structured 3-Card Intelligence Form**:
      - Re-architected raw 2-column input fields into 3 logically separated glassmorphic cards:
        1. **🏢 Prospect & Contact Intelligence**: Company name (required), contact person, email, and phone with dedicated Lucide icon prefixes.
        2. **💼 Deal Architecture & Team Allocation**: Color-badged pipeline stages (`NEW`, `DISCOVERY`, `PROPOSAL`, `NEGOTIATION`, `WON`, `LOST`), assigned sales/tech lead owner (supporting `-- Unassigned (Leave Blank) --`), estimated value, billing preference, and acquisition lead source.
        3. **📅 Follow-Up Schedule & Project Scope**: Next contact date and formatted multi-line scope notes.
    - **Fast-Track Conversion to Active Retainer**:
      - Integrated a 1-click `⚡ Convert to Active Retainer` action in the modal footer when editing existing prospects, immediately transitioning the prospect into active project allocations without re-entering parameters.
  17. **Interactive Auto-Open / Auto-Close & Pin Navigation Rail Architecture**:
    - **Problem Statement**:
      - A permanently expanded 256px sidebar crowded the main application workspace. In auto mode, floating overlay was tested.
    - **Zero-Reflow Layout Spacer**:
      - Introduced a persistent layout spacer (`<div aria-hidden="true" />`) in the flex row to keep base layout stable.
  18. **Floating Bottom Island Dock Architecture (Idea 5 Implementation)**:
    - **Observed Problem in Production**:
      - In the previous auto-hover sidebar overlay (`w-64 fixed top-0 left-0 z-50`), moving the cursor anywhere near the left side swung out a 256px solid panel that blinded 20–25% of the active dashboard, completely obscuring project counts, Churn Radar, search inputs, and primary project cards.
    - **Structural Refactoring**:
      - **100% Full-Screen Dashboard**: Removed the left spacer (`w-[72px]`) and fixed vertical `aside`. The entire workspace container transitioned from `flex flex-row` to `flex flex-col relative w-full`, unlocking 100% edge-to-edge width for project cards, data tables, and headers.
      - **Scroll Clearance**: Configured `<main>` with `pt-5 pb-32 overflow-y-auto` to provide generous 128px bottom clearance so cards at the bottom of the roster are never covered by the dock.
    - **Floating Bottom Dock Component (`Navbar.tsx`)**:
      - **Placement & Elevation**: Anchored at `fixed bottom-5 left-1/2 -translate-x-1/2 z-50 pointer-events-auto`.
      - **Glassmorphism Design Tokens**:
        - Ambient backdrop blur: `backdrop-blur-2xl`.
        - Theme adaptive backgrounds: `rgba(11, 15, 25, 0.88)` (Dark) vs. `rgba(255, 255, 255, 0.88)` (White theme).
        - Multi-layer shadow: `0 20px 50px -10px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(16, 185, 129, 0.18) inset`.
      - **Dock Sections & Features**:
        1. *Agency Pulse Pill*: Mini brand icon with pulse ring, real-time allocation percentage, and hover popover detailing total allocated vs. capacity hours with visual gradient progress bar.
        2. *Primary Nav Items*: 9 items (`projects`, `calendar`, `hours`, `dsr`, `skills`, `bot`, `finances`, `notifications` with badge 4, `brief`).
        3. *Framer Motion Physics*:
           - Smooth macOS-style hover scale: `whileHover={{ scale: 1.15, y: -2 }}`.
           - Sliding active background pill: `layoutId="activeDockTab"` with spring physics (`stiffness: 400, damping: 30`).
           - Micro floating tooltips: Centered above icons (`bottom-full mb-2.5`) with keyboard shortcut tags.
        4. *Actions & Utilities*:
           - ClickUp OAuth connection status indicator & modal trigger.
           - Weekly plan export button (.txt format).
           - Theme toggle (Sun / Moon) for switching between Dark and Light modes.
           - User persona / profile switcher with upward-opening flyup menu.
        5. *Keyboard Navigation*: Hotkeys `1` through `9` map directly to respective tabs for rapid keyboard-driven navigation.
  19. **Continuous Chat & Technical Log Synchronization Protocol**:
    - **Protocol Established**:
      - [`CHAT_EXPORT.md`](file:///e:/Antigravity/Work%20Allocation%20Tool/CHAT_EXPORT.md) maintains complete chronological history across conversation sessions.
      - Integrated Turns 171 through 174 capturing:
        - Work Allocation Tool status review.
        - Problem analysis and 5 layout solutions for the sidebar dashboard overlap issue.
        - Complete architectural implementation of Idea 5 (Floating Bottom Island Dock) with Framer Motion physics and full-screen unblocked dashboard.
        - Synchronous chat log updates.
  20. **Workflow Optimization Suite (5 Core Workflow Improvements)**:
    - **Objective**: Accelerate day-to-day project management operations, eliminate context switching, prevent team member overload, and improve sync visibility without introducing bloated tabs or external modules.
    - **Enhancement 1: In-Line Member Capacity in All Selection Dropdowns**:
      - Implemented `getMemberCapacityLabel(m: TeamMember)` utility.
      - Calculates assigned workload hours from all active project allocations (`activeHours * (pct / 100)`).
      - Renders exact workload metrics inside all `<option>` dropdown labels: `[${assigned}/${cap}h • ${pct}%]`.
      - Adds real-time overload indicator: displays `⚠️ OVERLOAD` when assigned hours exceed capacity.
      - Integrated in both "Add Project Drawer" and "Edit Project Drawer" for Team Lead, Call Lead, and team member selectors.
    - **Enhancement 2: Fast In-Place Click-to-Edit on Project Cards**:
      - Replaced mandatory 3-tab drawer opening with instantaneous micro-popovers directly on the project card:
        - **Status Pill Popover**: Clicking status opens an instant micro-dropdown to change status to `ON TRACK`, `INITIAL STAGE`, `REVALUATION`, `PAUSED`, or `COMPLETED`.
        - **In-Line Price / Retainer Editor**: Clicking the price activates an in-place input with save (Check) and cancel (X) buttons, updating both `price` and `paymentAmountNumeric`.
        - **Quick Lead & Call Lead Popovers**: Hovering/clicking avatar pills allows instant re-assignment of Team Lead or Client Call Assignee from a filtered dropdown.
    - **Enhancement 3: ClickUp Sync Delta Feedback**:
      - Enhanced `handleImportProjectsFromClickUpList` with delta tracking:
        - Tracks newly imported vs. updated vs. unchanged projects.
        - Displays dynamic sync summary alert banner at the top of the Projects roster.
        - Adds pulsing `⚡ Synced Just Now` badge on modified project cards via `recentlySyncedProjectIds` state.
    - **Enhancement 4: Actionable Everyday Filter Presets**:
      - Extended Filter Studio with 4 high-priority 1-click operational filter buttons:
        1. `🚨 Needs Call Lead`: Highlights projects missing client call assignment (`!p.clientCallAssigneeId`).
        2. `⏱️ Hourly Retainers`: Filters to `Weekly Hourly Billing` projects for fast timecard checks.
        3. `💎 $3k+ Retainers`: Surfaces high-value clients with `>= $3,000` monthly payment volume.
        4. `⚠️ Over Budget`: Flags projects where logged hours exceed total allocated capacity (`actualHoursLogged > totalHours`).
    - **Enhancement 5: Multi-Select Floating Bulk Action Strip**:
      - Added card header multi-select checkbox on every project card (`handleToggleSelectProject`).
      - Renders an elevated floating action strip (`fixed bottom-24 left-1/2 -translate-x-1/2 z-40 bg-slate-950/95 border border-emerald-500/50 rounded-2xl shadow-2xl`) when 1 or more cards are selected.
      - Features:
        - Live selected count badge with pulse indicator.
        - `Select All ({filteredCount})` / `Deselect All` toggle button.
        - Bulk Reassign Team Lead dropdown.
        - Bulk Update Status dropdown.
        - Bulk Archive to Past Projects button.
    21. **Navigation Placement & CSS Stacking Context Resolution**:
    - **Issue Identified**:
      - Floating dock was appearing at the top-left of the viewport, overlapping the dashboard header (`Projects 68 Active - Capacity, ownership and financial health in one place`).
    - **Root Cause Analysis**:
      - The project uses custom vanilla CSS utilities (`src/index.css`) rather than standard Tailwind compilation.
      - Classes `.bottom-5`, `.left-1/2`, and `.-translate-x-1/2` were missing from `src/index.css`.
      - In standard CSS specifications, a `position: fixed` element without explicit `top`, `bottom`, `left`, or `right` properties remains at its static document position (top-left 0,0).
      - Furthermore, `<motion.div>` in `App.tsx` applies CSS `transform` during animations, which creates a new CSS containing block for all descendants and traps nested `fixed` elements.
    - **Resolution Implemented**:
      - **CSS Utilities (`src/index.css`)**: Added `.bottom-0`, `.bottom-4`, `.bottom-5`, `.bottom-6`, `.bottom-20`, `.bottom-24`, `.bottom-full`, `.left-1/2`, `.-translate-x-1/2`, `.max-w-fit`, `.mx-auto`, `.z-30`, `.z-40`, `.z-49`, `.z-50`.
      - **Dock Positioning (`src/components/Navbar.tsx`)**: Applied explicit inline positioning styles (`position: 'fixed'`, `bottom: '20px'`, `left: '50%'`, `transform: 'translateX(-50%)'`, `zIndex: 50`) to guarantee viewport anchoring across all environments.
      - **Bulk Action Dock Portaling (`src/components/VisualAgencyHub.tsx`)**: Portaled the multi-select bulk action strip to `document.body` using `createPortal`, completely escaping the `<motion.div>` transform containing block, with inline position `bottom: 88px; left: 50%; transform: translateX(-50%); zIndex: 49`.
  22. **URL-Based Routing Architecture & Dedicated Member Profile System**:
    - **Architectural Motivation**:
      - Replaced internal in-memory tab state with standard browser URL-driven routing (`window.history.pushState` + `popstate`).
      - Every view has a bookmarkable, shareable URL: `/projects`, `/calendar`, `/hours`, `/dsr`, `/skills`, `/bot`, `/finances`, `/notifications`, `/brief`, and `/member/:id`.
      - Supports native browser back/forward navigation and direct link sharing.
    - **Router Implementation (`src/utils/router.ts`)**:
      - `parseRoute(pathname, search)`: Normalizes paths and segments.
      - `navigate(path, options)`: Dispatches custom `app:navigate` event alongside `history.pushState`.
      - `useAppRouter()`: Reactive hook listening to `popstate` and `app:navigate` events.
      - Full SPA routing verified with `vercel.json` rewrite rule (`/((?!api/).*)` -> `/index.html`).
    - **Dedicated Member Profile Page (`src/components/MemberProfilePage.tsx`)**:
      - Accessible at `/member/:id`, `/member/:id/projects`, `/member/:id/tasks`, `/member/:id/skills`.
      - **Hero Header**: Member avatar with live capacity pulse indicator, Name, Role, Department, Seniority pill, Client-Ready Tier badge, and 1-click shareable profile link.
      - **Capacity & Utilization Gauge**: Live calculation of allocated hours vs. weekly capacity with color-coded overload indicators.
      - **Sub-View 1: Active Projects**: Displays all projects where the member is Squad Lead, Call Lead, or Specialist, complete with client name, status badge, billing type, and project hours.
      - **Sub-View 2: Active Tasks**: Lists all tasks assigned to the member, filterable by status (`all`, `assigned`, `in_progress`, `review`, `completed`), priority badges, due dates, and ClickUp task deep links.
      - **Sub-View 3: Skills & Competencies**: Technical skill calibration radar scores (Quality, Speed, Communication) and general readiness ratings (English Fluency, Client Comms, Requirement Clarity, Reliability).
    - **Universal Member Click-to-Profile Links**:
      - Project card Squad Lead and Call Lead preview avatars navigate directly to `/member/${member.id}`.
      - Expanded Project card Executive Leadership cards navigate to `/member/${member.id}`.
      - Assigned deliverables capsules navigate to `/member/${assignee.id}`.
      - Squad Workload & Heatmap cards feature direct profile navigation and a "Profile ➔" button.
  23. **ClickUp Assigned Task Picking & Deliverable Synchronization Engine**:
    - **Problem Addressed**:
      - Viewing a specialist's profile (e.g. Vivek Kumar with 6 active projects and 24h allocated) showed 0 active tasks because `initialTasks` mock data only tracked an initial sample of sprint tasks for leads, and active project deliverables were disconnected from member task counts.
    - **Resolution Implemented**:
      - **Unified Deliverable Derivation (`src/components/MemberProfilePage.tsx`)**:
        - Automatically derives member sprint deliverables for all active projects where they are assigned as Squad Lead, Call Lead, or Specialist.
        - Calculates individual allocated hours based on `project.memberHoursMap[member.id]` or team distribution.
        - Attaches ClickUp task IDs (`#86b...`) and clickable ClickUp deep-links (`https://app.clickup.com/t/...`) to every task card.
        - Integrates direct sprint tasks from `allTasks`, live ClickUp synced tasks, and active project deliverables with deduplication.
      - **"⚡ Pick Tasks from ClickUp" Action Button**:
        - Positioned in the Active Tasks tab header and within empty state views.
        - When ClickUp OAuth is connected: Queries ClickUp API (`fetchClickUpTasks`) for tasks assigned to the member (matching by `clickUpUserId`, email, or username similarity), converts them to `Task` objects, persists them in `localStorage` (`vat_clickup_member_tasks_${member.id}`), and updates state.
        - When offline / in Deliverables Mode: Synthesizes and loads active project deliverables with generated ClickUp linkages, giving instant feedback and populating active tasks without requiring OAuth configuration.
      - **Two-Way Status Synchronization**:
        - Task cards feature status dropdown selectors (`Backlog`, `Assigned`, `In Progress`, `In Review`, `Completed`).
        - Changing status updates the local state, persists in `localStorage`, and triggers `updateClickUpTaskStatus` to update the task in ClickUp when an OAuth token is present.
      - **Live ClickUp Connection Pill**:
        - Displays a live status badge (`ClickUp Connected` with glowing green pulse or `Deliverables Mode`) next to the action button.
      - **Mock Data Expansion (`src/data/mockData.ts`)**:
        - Added `clickUpUserId: 864201` and `clickUpEmail: 'vivek@rankharvest.com'` to Vivek Kumar.
        - Added initial sprint tasks `tsk_06`, `tsk_07`, `tsk_08`, `tsk_09` for Vivek Kumar with ClickUp task linkages and estimated hours.
  24. **Member Profile 1-Click Assignment, Universal Command Palette, Shortcuts Guide & Single-Card Refresh**:
    - **1-Click "Assign to Project" Directly from Member Profiles**:
      - Added `+ Assign to Project` button in the Active Projects sub-tab header on `/member/:id`.
      - Opens an interactive modal allowing instant assignment of the member to any active agency project from `projectsList`.
      - Configurable role (`Specialist`, `Team Lead`, `Call Lead`) and custom allocated hours/week.
      - Automatically recalculates member weekly workload and updates `vat_projects_list_v1` in `localStorage`.
    - **1-Click "Assign Task" Directly from Member Profiles**:
      - Added `+ Assign Task` button in the Active Tasks sub-tab header on `/member/:id`.
      - Opens an interactive modal to dispatch deliverables directly to the member with fields for Task Title, Client, Project, Est. Hours, Priority (`Urgent`, `High`, `Medium`, `Low`), Due Date, and optional ClickUp Task ID.
      - Immediately updates `clickUpSyncedTasks` state and persists to `vat_clickup_member_tasks_${member.id}` in `localStorage`.
    - **Single-Card ClickUp Refresh for Projects & Tasks**:
      - Integrated individual refresh buttons (`🔄`) on every project card and task card on member profiles.
      - Calls `fetchClickUpTask(token, taskId)` to retrieve fresh status, title, and details on demand without triggering full workspace refetches.
      - Provides immediate spinner animations and Sonner toast confirmations for each synced item.
    - **Universal Command Palette (`Ctrl + K` / `Cmd + K` & `/`)**:
      - Created `src/components/CommandPaletteModal.tsx` providing universal spotlight search across all tabs, active projects, and team members.
      - Global hotkey listener mounted in `App.tsx` responding to `Ctrl+K`, `Cmd+K`, and `/`.
      - Offers quick keyboard navigation with instant query filtering, highlighting, and route navigation.
    - **Interactive Keyboard Shortcuts & Command Guide (`?`)**:
      - Enhanced `KeyboardShortcutsModal` in `src/components/TopTierUI.tsx` with clear, categorized sections:
        - **Tab Navigation**: Number keys `1` through `9` for direct tab switching, plus `0` for Monday War-Room.
        - **Search & Commands**: `Ctrl + K` / `Cmd + K` for Command Palette, `/` for Quick Search.
        - **Quick Actions**: `D` (Toggle Dark Mode), `N` (Quick Notes), `?` (Shortcuts Guide).
        - **General**: `Esc` (Dismiss active modal/palette).
  25. **Manager Leverage System: Monday War-Room, Scope Creep & Retainer Burn Meters, and Skill Gap Hiring Matrix**:
    - **Monday Morning Allocation War-Room (`/war-room`, Hotkey `0`)**:
      - Implemented `src/components/MondayAllocationWarRoom.tsx` as an operational cockpit for sprint allocation.
      - **Agency Cockpit KPIs**: Live meters for Agency Bandwidth (Allocated vs. Total Capacity), Unassigned Backlog Deliverables, Specialist Overload/Burnout Risk alerts, and Client-Facing Lead readiness count.
      - **Two-Column Command Interface**:
        - *Left Column*: Unassigned sprint deliverables queue with skill filtering, priority badges, and top-candidate recommendation chip based on free weekly bandwidth.
        - *Right Column*: Specialist allocation cards detailing role, seniority, live workload gauge, and assigned deliverables with 1-click unassign.
      - **Algorithmic Solver ("⚡ Auto-Balance Week")**:
        - Automatically matches unassigned tasks to available specialists with matching domain skills who have sufficient remaining capacity.
        - Prioritizes higher-priority tasks first, updates allocations in real-time, and fires celebratory confetti on completion.
      - **Schedule Export**:
        - 1-click export of the sprint schedule formatted in structured Markdown for Slack/email pasting or direct `.md` file download.
    - **Scope Creep & Retainer Burn-Rate Alert Engine**:
      - Integrated into `src/components/VisualAgencyHub.tsx` across active project cards.
      - **Real-Time Burn Consumption Meter**:
        - Compares `actualHoursLogged` against `totalHours` with progress gauge and percentage badge.
        - Color-coded: `< 85%` Emerald (Safe), `85% - 99%` Amber (`Caution: Approaching Cap`), `>= 100%` Rose (`🚨 Scope Creep Risk / Over Budget`).
      - **1-Click Upsell & Retainer Extension Draft**:
        - Interactive modal generating personalized client messaging warning of scope creep and offering pre-calculated retainer hour top-ups or billable extensions.
        - 1-click clipboard copy to immediately send to the client.
      - **Quick Filter (`'scope_creep_risk'`)**:
        - Added dedicated button in the manager filter bar `"🔥 Scope Creep / High Burn"` with live account count badge to instantly triage accounts operating near or past retainer thresholds.
    - **Smart Skill Gap & Hiring Forecast Matrix (`/matrix`, `/hiring`)**:
      - Implemented `src/components/SkillGapHiringMatrix.tsx` tracking demand versus capacity across 8 agency core competencies (Technical SEO, Content Writing, Site Migration, AEO & GEO Strategy, Core Web Vitals, Link Building, WordPress Dev, UI/UX Redesign).
      - Computes net hours (Demand vs. Capacity), identifies critical/moderate deficits, and surfaces hiring recommendations (e.g., "Demand exceeds capacity by 28h/wk. Prioritize hiring Senior Specialist").
      - Highlights sales surplus headroom indicating how many new client accounts can be pitched in high-margin domains.
      - Surfaces candidate upskilling pathways to cross-train internal specialists to bridge gaps before hiring.
      - Direct routing added to `AppRoute`, `ROUTE_MAP`, Command Palette (`Ctrl + K`), and header navigation in the Monday War-Room.
  26. **Deliverable Deadline & SLA Risk Radar and 1-Click ClickUp Bi-Directional Batch Sync**:
    - **Deliverable Deadline & SLA Risk Radar (`/sla`, `/radar`)**:
      - Implemented `src/components/SlaRiskRadarModal.tsx` as an operational watchdog monitoring all client deliverables for impending due-date breaches.
      - **Predictive Risk Algorithm**:
        - Calculates `hoursRemaining = (dueDate - now) / 3600000` and `progressPercent = (logged / estimated) * 100`.
        - Categorizes tasks into 🔴 **Critical Breach Risk** (`<24h` remaining with `<40%` logged or past due), 🟡 **High Risk** (`<48h` with `<50%` logged), 🟠 **Moderate Risk** (`<72h` with `<20%` logged), and 🟢 **Safe**.
      - **Interactive Triage Center**:
        - Summary KPI metrics for critical breaches, high-risk delays, total hours at risk, and deliverables on pace.
        - Risk filtering (`All At-Risk`, `Critical`, `High Risk`) with visual countdown timer badges (`🚨 PAST DUE`, `⏳ Due in 14h`, `⚠️ Due in 2 days`).
      - **⚡ 1-Click Rescue Reassignment**:
        - Algorithmic matching identifies specialists with matching domain skills, high speed ratings, and free weekly capacity.
        - 1-click reassigns deliverable to rescue specialist with instant capacity update and celebratory Sonner notification.
      - **1-Click Slack/Client Escalation Draft**:
        - Auto-generates structured Slack or client SLA alerts ready for clipboard copying.
      - **Universal Access & Alert Badging**:
        - Live animated flame indicator on Navbar displaying real-time count of SLA-threatened deliverables (`🔥 X SLA Risk`).
        - Header button in Monday Allocation War-Room with live badge count.
        - Command Palette item (`nav-sla-radar`).
    - **1-Click Full Agency ClickUp Bi-Directional Batch Sync**:
      - Implemented `src/components/ClickUpBatchSyncModal.tsx` providing agency-wide sprint synchronization.
      - **Batched Execution Engine**:
        - Sweeps all deliverables across active agency projects in batches of 3 to prevent API rate-limit throttling.
        - Interfaces with `fetchClickUpTask(token, taskId)` when OAuth token is present, mapping ClickUp statuses (`closed`, `in progress`, `review`) to local statuses.
        - Features high-fidelity offline/demo simulation for frictionless development and workspace previews.
      - **Interactive Sync Audit Dialog**:
        - Live animated progress bar (`0% -> 100%`) with item-by-item activity stream.
        - Audit cards displaying total status updates applied, specialist capacity hours restored from completed deliverables, and ClickUp API health.
        - Applied transitions diff list highlighting old vs. new statuses.
      - **Trigger Points**:
        - Dedicated `RefreshCw` quick sync icon and ClickUp pill button in the top Navbar.
        - "Sync ClickUp" action button in the Monday Allocation War-Room header.
        - Universal Command Palette shortcut (`action-sync-all-clickup`).
  27. **In-Workflow Business & Financial Intelligence Suite (Ideas 1 to 8)**:
    - **Architecture & Foundation (`src/utils/projectFinancials.ts`)**:
      - Centralized mathematical and financial telemetry engine calculating loaded specialist payroll rates ($58/h Senior/Lead, $36/h Mid, $22/h Junior).
      - Computes project gross margins, dollar profit, retainer revenue, squad labor cost distribution, and margin health tiers (`high` ≥60%, `standard` 45-59%, `low` <45%).
      - Computes aggregate agency blended gross margin, total retainer revenue, loaded payroll overhead, and net projected agency profit.
      - Calculates individual specialist ROI multipliers (e.g. `4.2x ROI`) comparing retainer revenue generated to loaded salary cost, alongside billable utilization percentage.
    - **Idea 1: Interactive Real-Time Gross Margin & Profit Badge (`VisualAgencyHub.tsx`)**:
      - Embedded directly on project cards next to hours burn meters (`💰 X% Margin (+$X net)`).
      - Dynamically colored by margin tier (emerald for high, cyan for standard, rose pulse for low margin).
      - Clicking the badge opens the 1-Click Client P&L and Staffing Optimizer modal.
    - **Idea 2: Seniority Misalignment Warning Chip (`VisualAgencyHub.tsx`)**:
      - Telemetry automatically flags when Tier 1 or Senior specialists ($58/h) consume >30% of hours on budget/local retainers (≤$1,200/mo).
      - Surfaces interactive warning chip on the project card highlighting margin leak and potential margin gain.
      - 1-click opens P&L Staffing Optimizer.
    - **Idea 3: 1-Click Client P&L & Staffing Optimizer Modal (`src/components/ClientPnLModal.tsx`)**:
      - Full client financial inspection modal displaying Monthly Retainer Revenue, Loaded Squad Cost, Gross Margin %, and Gross Profit $.
      - Features Seniority Misalignment alert banner with calculated monthly margin leak and 1-click "Optimize Staffing" button to swap expensive senior specialists with available Junior/Mid team members.
      - Complete assigned squad breakdown table showing specialist roles, assigned hours, loaded cost per hour, monthly cost, and squad share %.
    - **Idea 4: Cash-Flow Risk & "Deliverable Hold" Guardrail (`VisualAgencyHub.tsx`)**:
      - Real-time financial guardrail that detects accounts with overdue invoices.
      - Renders high-visibility animated banner (`🛑 Payment Hold: Retainer Invoice Overdue - Pause Sprints`) preventing agency labor leakage on unpaid accounts.
    - **Idea 5: Profit-Margin Impact on Task Dispatch (`MondayAllocationWarRoom.tsx`)**:
      - War-room matching algorithm incorporates specialist loaded hourly rates into candidate matching.
      - Displays loaded cost per hour (`$22/h`, `$36/h`, `$58/h`) alongside available hours on the "Best match" recommendation chip and manual assignment dropdowns to prevent margin degradation during sprint planning.
    - **Idea 6: Executive Revenue & Agency Blended Margin KPI Cockpit (`MondayAllocationWarRoom.tsx`)**:
      - Added 5th executive metric card to the top cockpit meters: **BLENDED MARGIN** (`X% margin`, `$Xk rev`, `+$Xk net profit`).
      - Provides managers immediate financial health feedback during weekly deliverable dispatch.
    - **Idea 7: Specialist Revenue Generation & ROI Multiplier (`MemberProfilePage.tsx`)**:
      - Expanded Quick Metrics Grid in specialist profile header from 4 to 6 metric cards.
      - Added **ROI Multiplier Card** (e.g., `4.2x ROI` with `$X/mo` retainer value generated).
      - Added **Billable Ratio Card** (e.g., `85% Billable` direct client work).
    - **Idea 8: Executive Triage Quick-Filters (`VisualAgencyHub.tsx`)**:
      - Added 3 one-click triage filter presets to the Project Hub toolbar with live dynamic account counter badges:
        - `"💰 Low Margin (<45%)"`
        - `"✨ High Margin (≥60%)"`
        - `"🩺 At-Risk (<65 Health)"`
      - Allows leadership to instantly isolate margin leaks or celebrate high-margin accounts without navigating away from the project hub.
  28. **Retainer Hour Banking & Managerial Workflow Smoothness Suite**:
    - **Feature 6: Retainer Hour Banking & Rollover Tracker (`ActiveProjectItem` & `VisualAgencyHub.tsx`)**:
      - Added `bankedRolloverHours?: number` state to `ActiveProjectItem`.
      - On Monthly Retainer accounts with unutilized hours and healthy burn, renders an in-card rollover banking control (`📦 Bank Rollover`).
      - Managers can bank unused hours with 1 click, rolling them into the next billing cycle, or release them with a single click (`✕`).
      - Prevents surprise hours loss and preserves agency-client trust during contract reconciliation.
    - **Workflow Smoothness: Unified Manager Action Strip**:
      - Eliminated fragmented, stacked alert banners (Payment Hold, Scope Creep, Seniority Mismatch) that previously bloated card heights.
      - Consolidated all urgent signals into a single compact, high-contrast action strip located directly below the Retainer Burn Meter.
      - Integrates instant 1-click action triggers:
        - `Rebalance ⚡`: Directly launches the Client P&L & Staffing Optimizer.
        - `Draft Upsell ✉️`: Opens the Scope Upsell email template generator.
        - `🛑 Hold`: Displays pulsing payment alert.
    - **UI Polish: Segmented Toolbar Pill Groups**:
      - Reorganized project toolbar buttons into clear visual segments:
        - **Segment 1 (Account Overview)**: `All Projects`, `🔥 Retainers`, `🚨 Needs Attention`.
        - **Segment 2 (Financial Triage)**: `✨ High Margin (≥60%)`, `💰 Low Margin (<45%)`.
        - **Reset Trigger**: `↺ Reset` button dynamically appears whenever active filters deviate from default.
    - **Search & Bandwidth in Quick Lead Reassign Popovers**:
      - Added instant search input (`Search specialist...`) to the Squad Lead and Call Lead reassign popovers.
      - Displays real-time free bandwidth badge (`🟢 Xh free`) next to each candidate's name to ensure managers never assign an overbooked specialist.

  29. **Specialist Spotlight Clustering, Collapsible Deliverables & High-Velocity Hotkeys**:
    - **Specialist Spotlight & Dynamic Reactive Clustering (`VisualAgencyHub.tsx`)**:
      - Implemented `spotlightSpecialistId` state connected to the Squad Workload & Bandwidth Heatmap and project cards.
      - Dynamic React Sorting & Clustering: When a specialist is spotlighted, all projects involving that specialist (as Squad Lead, Call Lead, or assigned in `taskBreakdown`) are sorted to the front of `filteredProjectsList`. Framer Motion's `layout` prop dynamically glides matching project cards right next to each other in row 1, 2, etc., clustering them snugly.
      - Non-matching projects are dimmed (`opacity-35 grayscale-[35%]`) with smooth hover recovery.
      - Added `items-start` to the project card grid container (`grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 items-start`) so each card sizes to its natural content without stretching adjacent column rows.
      - Surfaces a vibrant executive Spotlight Banner above the project roster showing the specialist's avatar, matching account count, and an instant `[Clear Spotlight ✕]` or `[Esc]` button.
    - **Collapsible Deliverables Pocket Section**:
      - Automatically partitions `taskBreakdown` into active deliverables (`!isDone`) and completed deliverables (`isDone`).
      - Only active deliverables are displayed by default, keeping cards compact and avoiding tall vertical scroll bloat on projects with 10+ deliverables.
      - Features an inline collapsible drawer (`+X done ▾` / `Hide completed ▴`) allowing managers to reveal completed items on demand with muted, line-through styling.
    - **High-Velocity Keyboard Shortcuts (Hotkeys)**:
      - Quick Search: Pressing `/` instantly focuses the project search bar with autofocus and a visible `<kbd>/</kbd>` cue.
      - Triage Hotkeys: Pressing `1` (All), `2` (On-Track), `3` (Needs Attention), `4` (High Margin), `5` (Low Margin) triggers instant filtering.
      - Quick Reset: Pressing `Escape` clears active specialist spotlight, resets filters to all, or blurs input.
      - Filter buttons and reset actions display subtle hotkey tags (`[1]`, `[2]`, `[3]`, `[4]`, `[5]`, `[Esc]`).

  30. **Accordion Focus Mode & Tactical Drag-and-Drop Lead Reassignment**:
    - **Idea A: Accordion Focus Mode (`VisualAgencyHub.tsx`)**:
      - Added `accordionFocusMode` state with persistent client memory via `localStorage` (`agency_accordion_focus_mode`).
      - Added interactive toggle button directly in the project toolbar adjacent to the Table/Grid switcher (`⚡ Focus: ON` / `Focus: OFF`).
      - When active, opening any project card's details automatically collapses all other open cards, eliminating vertical page sprawl and keeping the manager focused on one account at a time.
    - **Idea B: Drag-and-Drop & 1-Click Quick-Swap Reassignment**:
      - Specialist cards in the Squad Workload section are now HTML5 `draggable` (`cursor-grab active:cursor-grabbing`).
      - Squad Lead and Call Lead preview slots on each project card act as drag-and-drop drop targets with active pulsing border highlights (`ring-2 ring-cyan-400` / `ring-2 ring-purple-400`).
      - Managers can simply drag any specialist avatar or card onto a project card to instantly reassign Squad Lead or Call Lead without clicking through dropdowns.
      - In Spotlight mode, project cards where the spotlighted specialist is not yet assigned surface 1-click **`+ Lead`** and **`+ Calls`** quick-swap chips for instantaneous single-tap role assignment.

  31. **Instant 1-Click Pocket Deliverable Completion Toggle**:
    - **1-Click Done Checkbox (`VisualAgencyHub.tsx`)**:
      - Added `handleToggleDeliverableStatus(projId, taskAllocationId)` to toggle deliverable completion directly from the project card without opening ClickUp or editing the account.
      - In-flight active deliverables feature an inline checkmark button (`✓`) that instantly moves the deliverable to completed status and triggers an immediate celebratory toast showing freed bandwidth hours (`+Xh freed up in sprint bandwidth`).
      - On milestone delivery projects, automatically updates `milestonesCompleted` count in real-time.
      - Completed items in the collapsible drawer feature a checked emerald button (`✓`) allowing managers to reopen or revert a task back to active in a single tap.

  32. **Filter Predicate Return Value Fix (`VisualAgencyHub.tsx`)**:
    - **Issue**: The project card list was rendering `0 matching projects` (`Showing 0 of 68 master projects`) even when the "All" filter was selected.
    - **Root Cause**: An accidental omission of `return true;` at the end of the `filteredProjectsList = projectsList.filter(...)` predicate caused JavaScript to return `undefined` (falsy) for accounts when no negative filter criteria matched.
    - **Resolution**: Restored explicit `return true;` at line 2825, restoring full visibility of all master projects across all filter presets.

  33. **Vitest Automated Test Suite Implementation**:
    - Configured native Vite test runner via `vitest.config.ts` and updated `package.json` with `npm test` (`vitest run`) and `npm run test:watch`.
    - Implemented 5 test suites covering 22 core unit tests across all business-critical engines:
      1. **`tests/projectFinancials.test.ts` (6 tests)**:
         - Seniority loaded hourly cost rates (`Senior: $58`, `Mid: $36`, `Junior: $22`).
         - `getMemberCostPerHour` resolution for client-ready tiers and seniority roles.
         - Exact gross margin percent and gross profit calculation.
         - Margin tier classification (`high`, `standard`, `low`).
         - Payment hold status identification.
      2. **`tests/matchingEngine.test.ts` (4 tests)**:
         - Active vs. completed task hours allocation.
         - Candidate ranking with skill match and speed/quality weights.
         - VIP Talent Guard scoring bonus for Senior Tier 1 specialists on VIP accounts.
      3. **`tests/projectAllocationEngine.test.ts` (2 tests)**:
         - Multi-block intake proposal squad composition.
         - Automated overload risk detection when tasks exceed specialist weekly capacity.
      4. **`tests/dateUtils.test.ts` (5 tests)**:
         - Local calendar date formatting (`YYYY-MM-DD`).
         - Relative date calculations (`daysFromToday`).
         - First day of month and month offset selector IDs.
      5. **`tests/router.test.ts` (5 tests)**:
         - Hash/Path route parsing and default fallback to `projects`.
         - Dynamic member profile route extraction (`/member/:id/:tab`).
         - Search query parameter preservation.
    - Test execution speed: **22/22 tests passing in 265ms**.

  34. **1-Click Quick Memo on Project Cards & Precise Retainer Overage Indicator**:
    - **1-Click "Quick Memo" on Project Cards (with Date & Time)**:
      - Added `quickMemo?: string` and `quickMemoUpdatedAt?: string` to `ActiveProjectItem`.
      - Implemented inline 1-click memo editor directly below project cards' title rows in `VisualAgencyHub.tsx` with `editingMemoProjId` and `memoInputText` state.
      - Auto-timestamps notes upon save: `e.g. Sep 20, 2:37 AM`.
      - Sleek amber badge display (`📝 [memo] · 🕒 [timestamp]`) with inline edit pencil and clear (`✕`) button.
      - Integrated into universal search query filter so managers can search projects by memo contents.
      - Added compact memo indicator badge to Compact Table view.
    - **Precise Retainer Overage Indicator (+Xh over scope)**:
      - Upgraded Retainer Burn Meter in `VisualAgencyHub.tsx` to compute exact overage hours: `overageHours = logged > budget ? Math.round((logged - budget) * 10) / 10 : ...`.
      - Computes unbilled revenue value based on effective retainer hourly rate (or $85/h agency fallback): `unbilledDollars = Math.round(overageHours * effectiveRate)`.
      - Replaced generic scope creep pill with high-contrast alert badge: `+{overageHours}h over scope (~$X unbilled)` with pulsing indicator.
      - High Burn state (85%–99%) now displays exact remaining bandwidth hours: `⚠️ High Burn (X%) (Y.Yh left)`.
      - Meter bar applies vibrant overage gradient glow: `bg-gradient-to-r from-rose-500 via-rose-600 to-amber-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]`.
      - Synchronized with the Unified Manager Action Strip to display `🚨 +{overageHours}h over scope (~$X)`.
      - Added `+{over}h over` indicator in Compact Table view.
    - **Vitest Unit Test Suite Expansion (`tests/retainerAndMemo.test.ts`)**:
      - Added 6 automated unit tests validating overage hours calculations, unbilled dollar computation, healthy/high burn boundary conditions, and quick memo timestamping/clearing.
      - Full test suite now features **28/28 tests passing in ~280ms**.

  35. **Next Deliverable Due Pill & Specialist Deliverable Reassignment (Drag-Drop & 1-Click Popover)**:
    - **Feature 2: "Next Deliverable Due" Pill (`src/utils/dateUtils.ts` & `VisualAgencyHub.tsx`)**:
      - Created `getNextDeliverableDueInfo` helper in `dateUtils.ts` returning `{ label, daysRemaining, urgency, badgeColor, taskName }`.
      - Supports intelligent parsing across task due dates, ISO dates (`YYYY-MM-DD`), and recurring monthly renewals (`Monthly Renewal: 30th`).
      - Urgency tiering:
        - `overdue`: `⚠️ [Task] (Xd past due)` (rose badge with high-contrast border).
        - `due_today`: `🚨 [Task] (Due today)` (pulsing rose alert).
        - `urgent` (≤3 days): `⚡ [Task] (Due in Xd)` (amber pill).
        - `upcoming` (>3 days): `🎯 [Task] (Due in Xd)` (cyan pill).
        - `completed`: `All deliverables complete` (emerald badge).
      - Displayed in:
        1. Deliverables list header in the card drawer.
        2. Project card preview snapshot header next to hours utilization.
        3. Compact Table view under the status/priority column.
    - **Feature 4: Specialist Deliverable Reassignment (1-Click Popover & Drag-Drop Target)**:
      - Made each open deliverable capsule an interactive drag-and-drop drop target (`onDragOver`, `onDrop`).
      - Managers can drag any specialist avatar from the top team bar or squad and drop directly onto the deliverable pill to reassign immediately.
      - 1-Click Specialist Picker Popover: clicking on the deliverable assignee opens a floating menu with search filter and real-time free bandwidth counters (`✅ Xh free`, `⚠️ Near Cap`, `🔴 Overload`).
      - Updates `taskBreakdown` and synchronizes the project's `members` roster in real-time.
    - **Automated Vitest Test Suite Expansion**:
      - Expanded `tests/retainerAndMemo.test.ts` with 4 new tests covering deliverable due calculation, overdue math, near-term alert thresholds, and specialist squad re-allocation.
      - Total test suite now stands at **32/32 tests passing across 6 test suites in ~300ms**.

  36. **Daily "Morning Huddle" Command Drawer & Comprehensive Attention Analysis**:
    - **Feature 3: Daily Morning Huddle Command & Attention Engine (`src/utils/projectFinancials.ts` & `VisualAgencyHub.tsx`)**:
      - Created `checkProjectNeedsAttention` in `src/utils/projectFinancials.ts` returning `{ needsAttention, isOverScope, isHighBurn, hasOverdueDeliverable, hasPaymentHold, isCriticalHealth, overageHours, reasons }`.
      - Comprehensive multi-vector triage:
        1. **Retainer Scope Creep**: Logged hours exceeding budget or burn percent > 100%.
        2. **Deliverables Overdue / Due Today**: Evaluates in-flight deliverables using `getNextDeliverableDueInfo`.
        3. **Cashflow Holds**: Unpaid or overdue invoices (`paymentStatus === 'Overdue'`).
        4. **High Burn Warning**: Retainers exceeding 85% utilization before month-end.
        5. **Critical Account Health**: Proactive alert overrides.
      - **Interactive Morning Huddle Command Drawer**:
        - Toggleable with prominent header button: `🌅 Morning Huddle` showing live count badge.
        - Triage summary bar with instant breakdown badges: `🚨 X Scope Creep` · `⚠️ Y Deliverables Due/Overdue` · `🛑 Z Invoices Overdue` · `🔥 W High Burn`.
        - 1-Click **"📋 Copy Huddle Agenda"**: Automatically compiles flagged accounts, team leads, active blockers, and latest quick memos into a formatted Slack / Teams / WhatsApp Markdown briefing.
      - Upgraded `everydayQuickFilter === 'needs_attention'` (Hotkey: 3) to filter accounts dynamically against the comprehensive attention engine.
    - **Automated Vitest Test Suite Expansion**:
      - Added 4 unit tests in `tests/retainerAndMemo.test.ts` validating scope creep detection, deliverable urgency alerts, invoice holds, and healthy account pass-through.
      - Full test suite now features **36/36 tests passing in 313ms**.

  37. **DSR Tracker + Work Allocation Tool Integration (Master Plan v3 — Phase 0 & Phase 1)**:
    - **Supabase PostgreSQL & Real-Time Backend Foundation**:
      - Integrated `@supabase/supabase-js` into the web application and configured environment connection in `.env.local` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON`).
      - Created typed interface definitions in `src/lib/database.types.ts` and initialized typed client in `src/lib/supabase.ts` with helper utilities (`getCurrentProfile`, `upsertPresence`).
      - Engineered complete relational database schema in `supabase/schema.sql`:
        - `profiles`: Multi-role identity (`EXECUTIVE`, `PROJECT_MANAGER`, `TEAM_LEAD`, `COORDINATOR`, `MEMBER`), permission flags, and server-side `clickup_token`.
        - `teams`: Fixed pods with team lead foreign key, hex color swatch, sort order, and metadata.
        - `team_members`: Drag-and-drop pod membership junction with ordering.
        - `tasks`: Dual-sourced work items (`local`, `clickup`, `allocated`) with status and priority indexing.
        - `time_logs`: High-frequency execution logs with client-side deduplication key (`local_id`).
        - `dsr_entries` & `dsr_time_logs`: Structured multi-tiered DSR approval workflow.
        - `presence`: Live 60s heartbeat tracking for team member task state (`active`, `idle`, `offline`).
        - `sync_queue`: Local-first offline batch synchronization with retry tracking.
        - Row Level Security (RLS) policies and PostgreSQL trigger `trg_set_permissions` for automated role privilege assignment.
      - Authored `supabase/seed.sql` for 1-click database population of pods, executive profiles, and specialist assignments.
    - **Server-Side ClickUp OAuth Token Persistence (`api/clickup/callback.js`)**:
      - Upgraded the serverless OAuth callback handler: upon token exchange with ClickUp API v2, writes `access_token` directly to `profiles.clickup_token` in Supabase using the service/secret key.
      - Eliminates sensitive token exposure in frontend browser URL query strings. Defaults first-time ClickUp users to the `MEMBER` role for Project Manager triage.
    - **5-Role Enterprise Permission Model (`src/types.ts` & `src/data/userProfiles.ts`)**:
      - Structured hierarchical role matrix: `EXECUTIVE` (read-only strategic overview & financials), `PROJECT_MANAGER` (full roster, allocation, org map, and DSR approval), `TEAM_LEAD` (pod management and member DSR review), `COORDINATOR` (task assignment & dispatch), `MEMBER` (time tracking & DSR submission).
    - **Interactive Drag-and-Drop Org Map Studio (`src/components/OrgMapStudio.tsx`)**:
      - Created dedicated Org Map command view accessible from the bottom navigation dock (`id: 'org'`).
      - Features dynamic pod cards with aggregate load bars, team lead badges, and member capacity breakdowns.
      - Native HTML5 drag-and-drop mechanism enabling Project Managers to reassign specialists between pods seamlessly.
      - Live role badge modifier: click any specialist's role badge to assign new system roles on the fly.
      - Automatic background persistence to Supabase `teams` and `team_members` with optimistic UI feedback.
    - **DSR Tracker Desktop Companion Engine (`main.js`)**:
      - Connected native Electron main process with Supabase project endpoint and publishable key.
      - Wired IPC channels: `get-current-user`, `set-current-user`, `logout-user`, `fetch-supabase-tasks`, `sync-time-log-to-supabase`, and `update-presence`.
      - Automatic allocated task merging into local bucket (`source: 'allocated'`) without overriding local user tasks.
    - **Database Verification & Pod Leadership Calibration**:
      - Verified live database state on Supabase: 5 Pods, 11 Profiles, and 11 Team Member pod assignments confirmed active via API checks.
      - Calibrated official pod leadership assignments across database and frontend:
        - `Executive Leadership` (`#6366F1`): CEOs *Agam Grover* & *Manpreet S. Nagpal*
        - `Operations & Management` (`#F59E0B`): Lead *Vinay Datyal* (Project Manager)
        - `SEO & Strategy Pod` (`#06B6D4`): Lead *Khuvaish*
        - `SEO & Delivery Pod` (`#10B981`): Lead *Amrit Kaur*
        - `Web & Tech Pod` (`#3B82F6`): Lead *Vansh*
      - Configured permissive SELECT/WRITE policies for `teams`, `team_members`, and `tasks` to ensure client application access across anon and authenticated roles.
    - **Master Regression Defense Protocol & Verification Standard**:
      - Established strict non-regression protocol across both projects: before and after any feature build, all 15 core architectural systems (Priorities Banner, Mini Pill Auto-switch, Contextual Dropdown, Notification focus, 3-min Idle/Sustained Input check, Pulse card flex, Bucket Search & 2-tier sort, Note timestamp carry-forward, Subtask note persistence, Timeline live hours, Zen Mode blur, Category migration, Multi-dir sync, and Supabase cloud IPC) must be cross-verified against the Master Feature Registry.
      - Enforces zero-tolerance for silent overrides or case-sensitivity regressions.

  38. **Dual-Application State Preservation & Anti-Chaos Audit Protocol**:
    - **DSR Tracker Desktop Standalone Git Repository**:
      - Initialized git tracking at `E:\Antigravity\DSR Tracker\.git` with clean `.gitignore` (ignoring `node_modules/`, `dist/`, `.agents/`, logs, and `.exe` binaries).
      - Committed baseline snapshot `d973cee` containing all 15 verified desktop systems and the `REGRESSION_DEFENSE_MATRIX.md`.
    - **Today's Priorities Banner & Mini Pill Case-Sensitivity Defense**:
      - Root cause diagnosed: `globalTodos` stores priority as lowercase (`'high'`), whereas desktop UI evaluated `t.priority === 'High'`.
      - Sanitized all priority comparisons to `(t.priority || '').toLowerCase() === 'high'` in `dashboard.js` (line 2042) and `mini.js` (line 64).
      - Updated `#prioritiesBanner` in `dashboard.html` to maintain stable flex layout with non-collapsing empty state indicator rather than disappearing.
      - Compiled fresh production binary: `E:\Antigravity\DSR Tracker\dist\DSR Tracker Setup 1.0.0.exe`.
    - **Status of Both Applications (Strict Verification)**:
      - **Work Allocation Tool**: All 36 automated unit tests passing (`npm test`). Build passes (`npm run build`). Clean git status synced with `origin/main` on commit `07fa82c`.
      - **DSR Tracker Desktop**: All 15 core systems documented in `REGRESSION_DEFENSE_MATRIX.md` and committed in local git `d973cee`.
