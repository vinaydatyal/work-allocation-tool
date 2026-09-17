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

export function setClickUpToken(token: string, userName?: string): void {
  localStorage.setItem(STORAGE_KEY, token);
  if (userName) {
    localStorage.setItem(USER_KEY, userName);
  }
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
  // Use our serverless proxy route to bypass browser CORS restrictions
  const proxyUrl = `/api/clickup/proxy?endpoint=${encodeURIComponent(path)}`;
  
  let res: Response;
  try {
    res = await fetch(proxyUrl, {
      headers: { Authorization: token },
    });
  } catch (netErr) {
    // If running in pure local dev where serverless functions aren't active, try Vite proxy
    res = await fetch(`/api/clickup${path}`, {
      headers: { Authorization: token },
    });
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`ClickUp API error ${res.status}: ${errText}`);
  }
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

export interface ClickUpSpace {
  id: string;
  name: string;
  color?: string;
  private?: boolean;
}

export interface ClickUpFolder {
  id: string;
  name: string;
  task_count?: number | string;
  space?: { id: string; name: string };
  lists?: ClickUpList[];
}

export interface ClickUpList {
  id: string;
  name: string;
  task_count?: number;
  folder?: { id: string; name: string };
  space?: { id: string; name: string };
}

export interface ClickUpTeamMember {
  id: number;
  username: string;
  email: string;
  profilePicture: string | null;
  role: string;
  color?: string;
}

export interface ClickUpTimeEntry {
  id: string;
  task?: { id: string; name: string };
  wid: string;
  user: { id: number; username: string; email: string };
  start: number;
  end: number;
  duration: number; // milliseconds
  description?: string;
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

export async function fetchClickUpSpaces(token: string, teamId: string): Promise<ClickUpSpace[]> {
  const data = await clickupFetch(`/team/${teamId}/space`, token);
  return (data.spaces || []).map((s: any) => ({
    id: s.id,
    name: s.name,
    color: s.color,
    private: s.private,
  }));
}

export async function fetchClickUpFolders(token: string, spaceId: string): Promise<ClickUpFolder[]> {
  const data = await clickupFetch(`/space/${spaceId}/folder?archived=false`, token);
  const folders: ClickUpFolder[] = (data.folders || []).map((f: any) => ({
    id: f.id,
    name: f.name,
    space: f.space,
    task_count: f.task_count,
    lists: (f.lists || []).map((l: any) => ({
      id: l.id,
      name: l.name,
      task_count: l.task_count,
      folder: { id: f.id, name: f.name },
      space: f.space,
    })),
  }));

  // Backfill lists for any folder where ClickUp didn't return them inline
  await Promise.all(
    folders.map(async (folder) => {
      if (!folder.lists || folder.lists.length === 0) {
        try {
          const childLists = await fetchClickUpLists(token, folder.id, true);
          folder.lists = childLists;
        } catch {
          // keep existing empty array
        }
      }
    })
  );

  return folders;
}

export async function fetchClickUpLists(
  token: string,
  parentId: string,
  isFolder = false
): Promise<ClickUpList[]> {
  const endpoint = isFolder ? `/folder/${parentId}/list` : `/space/${parentId}/list`;
  const data = await clickupFetch(endpoint, token);
  return (data.lists || []).map((l: any) => ({
    id: l.id,
    name: l.name,
    task_count: l.task_count,
    folder: l.folder,
    space: l.space,
  }));
}

export async function fetchClickUpListTasks(token: string, listId: string): Promise<ClickUpTask[]> {
  const data = await clickupFetch(`/list/${listId}/task?subtasks=true`, token);
  return data.tasks || [];
}

export async function fetchClickUpTeamMembers(token: string, teamId: string): Promise<ClickUpTeamMember[]> {
  const data = await clickupFetch('/team', token);
  const team = (data.teams || []).find((t: any) => String(t.id) === String(teamId)) || data.teams?.[0];
  if (!team || !team.members) return [];
  return team.members.map((m: any) => {
    const u = m.user || {};
    let roleStr = 'Member';
    if (m.role === 1) roleStr = 'Owner';
    else if (m.role === 2) roleStr = 'Admin';
    else if (m.role === 4) roleStr = 'Guest';
    return {
      id: u.id,
      username: u.username || 'ClickUp User',
      email: u.email || '',
      profilePicture: u.profilePicture || null,
      color: u.color,
      role: roleStr,
    };
  });
}

export async function fetchClickUpTimeEntries(
  token: string,
  teamId: string,
  startDate?: number,
  endDate?: number
): Promise<ClickUpTimeEntry[]> {
  const params = new URLSearchParams();
  if (startDate) params.set('start_date', String(startDate));
  if (endDate) params.set('end_date', String(endDate));
  const queryString = params.toString() ? `?${params.toString()}` : '';
  const data = await clickupFetch(`/team/${teamId}/time_entries${queryString}`, token);
  return (data.data || []).map((entry: any) => ({
    id: entry.id,
    task: entry.task ? { id: entry.task.id, name: entry.task.name } : undefined,
    wid: entry.wid,
    user: entry.user || {},
    start: Number(entry.start),
    end: Number(entry.end),
    duration: Number(entry.duration),
    description: entry.description,
  }));
}

export async function createClickUpTimeEntry(
  token: string,
  teamId: string,
  entry: { task_id?: string; duration: number; start: number; description?: string }
): Promise<any> {
  const proxyUrl = `/api/clickup/proxy?endpoint=${encodeURIComponent(`/team/${teamId}/time_entries`)}`;
  const res = await fetch(proxyUrl, {
    method: 'POST',
    headers: {
      Authorization: token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(entry),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Failed to log time to ClickUp: ${errText}`);
  }
  return res.json();
}

export async function createClickUpTask(
  token: string,
  listId: string,
  taskData: {
    name: string;
    description?: string;
    assignees?: number[];
    time_estimate?: number; // in milliseconds
    due_date?: number; // epoch ms
    priority?: number; // 1: Urgent, 2: High, 3: Normal, 4: Low
  }
): Promise<ClickUpTask> {
  const proxyUrl = `/api/clickup/proxy?endpoint=${encodeURIComponent(`/list/${listId}/task`)}`;
  const res = await fetch(proxyUrl, {
    method: 'POST',
    headers: {
      Authorization: token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(taskData),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Failed to create task in ClickUp: ${errText}`);
  }
  return res.json();
}

export async function updateClickUpTaskStatus(
  token: string,
  taskId: string,
  status: string
): Promise<any> {
  const proxyUrl = `/api/clickup/proxy?endpoint=${encodeURIComponent(`/task/${taskId}`)}`;
  const res = await fetch(proxyUrl, {
    method: 'PUT',
    headers: {
      Authorization: token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Failed to update ClickUp task status: ${errText}`);
  }
  return res.json();
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

