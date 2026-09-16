/**
 * ClickUp OAuth 2.0 Frontend Service
 *
 * Handles:
 * - Initiating the OAuth redirect to ClickUp
 * - Parsing the token/error from the callback URL
 * - Storing/retrieving the access token from localStorage
 * - Fetching ClickUp user, workspaces, and tasks
 */

const STORAGE_KEY   = 'clickup_access_token';
const USER_KEY      = 'clickup_user_name';
const WORKSPACE_KEY = 'clickup_workspace_id';

// ─── Token Management ──────────────────────────────────────────────────────────

export function getClickUpToken(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export function getClickUpUser(): string | null {
  return localStorage.getItem(USER_KEY);
}

export function getClickUpWorkspaceId(): string | null {
  return localStorage.getItem(WORKSPACE_KEY);
}

export function setClickUpWorkspaceId(id: string): void {
  localStorage.setItem(WORKSPACE_KEY, id);
}

export function isClickUpConnected(): boolean {
  return !!getClickUpToken();
}

export function disconnectClickUp(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(WORKSPACE_KEY);
}

// ─── OAuth Initiation ──────────────────────────────────────────────────────────

/**
 * Redirects the user to the ClickUp authorization page.
 * CLIENT_ID must be available as VITE_CLICKUP_CLIENT_ID environment variable.
 */
export function initiateClickUpOAuth(): void {
  const clientId = import.meta.env.VITE_CLICKUP_CLIENT_ID;

  if (!clientId) {
    throw new Error(
      'VITE_CLICKUP_CLIENT_ID is not set. Add it to your .env file or Vercel environment variables.'
    );
  }

  const redirectUri = `${window.location.origin}/api/clickup/callback`;
  const authUrl =
    `https://app.clickup.com/api?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}`;

  window.location.href = authUrl;
}

// ─── Callback URL Parser ───────────────────────────────────────────────────────

export interface ClickUpCallbackResult {
  token?: string;
  user?: string;
  error?: string;
}

/**
 * Call this on app load to check if we've just returned from ClickUp OAuth.
 * Reads token/error from URL query params, saves to localStorage, cleans URL.
 */
export function handleClickUpCallback(): ClickUpCallbackResult {
  const params = new URLSearchParams(window.location.search);
  const token  = params.get('clickup_token');
  const user   = params.get('clickup_user');
  const error  = params.get('clickup_error');

  if (token) {
    localStorage.setItem(STORAGE_KEY, token);
    if (user) localStorage.setItem(USER_KEY, user);

    // Clean URL — remove OAuth params without page reload
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);

    return { token, user: user || undefined };
  }

  if (error) {
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);
    return { error };
  }

  return {};
}

// ─── ClickUp API Helpers ───────────────────────────────────────────────────────

async function clickupFetch(path: string, token: string) {
  const res = await fetch(`https://api.clickup.com/api/v2${path}`, {
    headers: { Authorization: token },
  });
  if (!res.ok) throw new Error(`ClickUp API error ${res.status} on ${path}`);
  return res.json();
}

export interface ClickUpUser {
  id: number;
  username: string;
  email: string;
  profilePicture: string | null;
}

export interface ClickUpWorkspace {
  id: string;
  name: string;
  members: number;
}

export interface ClickUpTask {
  id: string;
  name: string;
  status: { status: string; color: string };
  assignees: { id: number; username: string; email: string; profilePicture: string | null }[];
  due_date: string | null;
  time_estimate: number | null;
  list: { id: string; name: string };
  url: string;
}

export async function fetchClickUpUser(token: string): Promise<ClickUpUser> {
  const data = await clickupFetch('/user', token);
  return data.user;
}

export async function fetchClickUpWorkspaces(token: string): Promise<ClickUpWorkspace[]> {
  const data = await clickupFetch('/team', token);
  return (data.teams || []).map((t: any) => ({
    id: t.id,
    name: t.name,
    members: t.members?.length || 0,
  }));
}

export async function fetchClickUpTasks(
  token: string,
  teamId: string,
  options: { assignees?: string[]; dueDateGt?: number; dueDateLt?: number } = {}
): Promise<ClickUpTask[]> {
  const params = new URLSearchParams();
  params.set('subtasks', 'true');
  params.set('include_closed', 'false');
  if (options.dueDateGt) params.set('due_date_gt', String(options.dueDateGt));
  if (options.dueDateLt) params.set('due_date_lt', String(options.dueDateLt));
  if (options.assignees?.length) {
    options.assignees.forEach((a) => params.append('assignees[]', a));
  }

  const data = await clickupFetch(`/team/${teamId}/task?${params}`, token);
  return data.tasks || [];
}
