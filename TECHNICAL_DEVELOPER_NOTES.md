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
- `src/services/clickupOAuth.ts` — Client-side OAuth service, token storage, and ClickUp API callers
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

