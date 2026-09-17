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
- **Webhook Registration Suite**:
  - New dedicated tab in `ClickUpOAuthModal.tsx` ("Live Sync & Webhooks").
  - Registers webhook subscriptions via `registerClickUpWebhook(token, teamId, endpointUrl, events)` to `POST /api/v2/team/{team_id}/webhook`.
  - Subscribed events: `taskCreated`, `taskUpdated`, `taskStatusUpdated`, `taskAssigneeUpdated`, `taskDeleted`.




