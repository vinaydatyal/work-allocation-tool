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

export async function clickupRequest(path: string, token: string, options: RequestInit = {}) {
  const proxyUrl = `/api/clickup/proxy?endpoint=${encodeURIComponent(path)}`;

  let res: Response;
  try {
    res = await fetch(proxyUrl, {
      ...options,
      headers: {
        Authorization: token,
        ...(options.headers || {}),
      },
    });
    // In local dev without serverless proxy, fallback to Vite proxy if 404
    if (!res.ok && res.status === 404) {
      res = await fetch(`/api/clickup${path}`, {
        ...options,
        headers: {
          Authorization: token,
          ...(options.headers || {}),
        },
      });
    }
  } catch {
    res = await fetch(`/api/clickup${path}`, {
      ...options,
      headers: {
        Authorization: token,
        ...(options.headers || {}),
      },
    });
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`ClickUp API error ${res.status}: ${errText}`);
  }
  return res.json();
}

async function clickupFetch(path: string, token: string) {
  return clickupRequest(path, token, { method: 'GET' });
}

export interface ClickUpCommentUser {
  id: number;
  username: string;
  email?: string;
  profilePicture?: string | null;
  color?: string;
  initials?: string;
}

export interface ClickUpCommentItem {
  id: string;
  comment_text?: string;
  comment?: Array<{ text?: string; type?: string; [key: string]: any }>;
  user?: ClickUpCommentUser;
  date: string | number;
  resolved?: boolean;
  assignee?: ClickUpCommentUser | null;
  assigned_by?: ClickUpCommentUser | null;
  reactions?: Array<{ reaction: string; date: number; user: ClickUpCommentUser }>;
}

export function getCommentPlainText(c: ClickUpCommentItem): string {
  if (c.comment_text && typeof c.comment_text === 'string') return c.comment_text;
  if (Array.isArray(c.comment)) {
    return c.comment.map((part) => part.text || '').join('');
  }
  return '';
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
  priority?: { priority: string; color: string } | null;
  assignees: { id: number; username: string; email: string; profilePicture: string | null }[];
  due_date: string | null;
  start_date?: string | null;
  time_estimate: number | null;
  list: { id: string; name: string };
  url: string;
  custom_fields?: Array<{ id: string; name: string; value: any; type?: string }>;
  description?: string;
  text_content?: string;
  parent?: string | null;
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

export type ClickUpSubtaskFilter = 'tasks' | 'subtasks' | 'both';

export async function fetchClickUpListTasks(
  token: string, 
  listId: string, 
  subtaskFilter: ClickUpSubtaskFilter = 'both'
): Promise<ClickUpTask[]> {
  const data = await clickupFetch(`/list/${listId}/task?subtasks=true&include_closed=true`, token);
  const tasks: ClickUpTask[] = (data.tasks || []).map((t: any) => ({
    id: t.id,
    name: t.name,
    status: t.status,
    priority: t.priority,
    assignees: t.assignees,
    due_date: t.due_date,
    start_date: t.start_date,
    time_estimate: t.time_estimate,
    list: t.list,
    url: t.url,
    custom_fields: t.custom_fields,
    description: t.description,
    text_content: t.text_content,
    parent: t.parent || null
  }));

  if (subtaskFilter === 'tasks') {
    return tasks.filter((t) => !t.parent);
  }
  if (subtaskFilter === 'subtasks') {
    return tasks.filter((t) => !!t.parent);
  }
  return tasks;
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
  return clickupRequest(`/team/${teamId}/time_entries`, token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  });
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
  return clickupRequest(`/list/${listId}/task`, token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(taskData),
  });
}

export function mapTaskStatusToClickUp(status: string): string {
  const normalized = status.toLowerCase().trim();
  switch (normalized) {
    case 'backlog':
    case 'assigned':
    case 'to do':
    case 'todo':
      return 'to do';
    case 'in_progress':
    case 'in progress':
    case 'doing':
      return 'in progress';
    case 'review':
    case 'quality review':
    case 'in review':
      return 'in review';
    case 'completed':
    case 'done':
    case 'complete':
    case 'closed':
      return 'complete';
    default:
      return status;
  }
}

export async function updateClickUpTaskStatus(
  token: string,
  taskId: string,
  status: string
): Promise<any> {
  const normalizedStatus = mapTaskStatusToClickUp(status);
  return clickupRequest(`/task/${taskId}`, token, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: normalizedStatus }),
  });
}

export async function updateClickUpTaskAssignees(
  token: string,
  taskId: string,
  addAssigneeIds: number[] = [],
  remAssigneeIds: number[] = []
): Promise<any> {
  return clickupRequest(`/task/${taskId}`, token, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      assignees: {
        add: addAssigneeIds,
        rem: remAssigneeIds,
      },
    }),
  });
}

export async function registerClickUpWebhook(
  token: string,
  teamId: string,
  endpointUrl: string,
  events: string[] = ['taskCreated', 'taskUpdated', 'taskStatusUpdated']
): Promise<any> {
  return clickupRequest(`/team/${teamId}/webhook`, token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoint: endpointUrl,
      events,
    }),
  });
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

/**
 * Fetch a single ClickUp task with full details (watchers, checklists, description, etc.)
 */
export async function fetchClickUpTask(token: string, taskId: string): Promise<any> {
  return clickupFetch(`/task/${taskId}`, token);
}

/**
 * Fetch comments for a ClickUp task
 */
export async function fetchClickUpTaskComments(token: string, taskId: string): Promise<ClickUpCommentItem[]> {
  try {
    const data = await clickupFetch(`/task/${taskId}/comment`, token);
    return data.comments || [];
  } catch (err) {
    console.warn(`Error fetching comments for task ${taskId}:`, err);
    return [];
  }
}

/**
 * Post a new comment to a ClickUp task
 */
export async function createClickUpTaskComment(
  token: string,
  taskId: string,
  commentText: string,
  notifyAll: boolean = false
): Promise<ClickUpCommentItem> {
  return clickupRequest(`/task/${taskId}/comment`, token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      comment_text: commentText,
      notify_all: notifyAll,
    }),
  });
}

/**
 * Fetch time in status breakdown for a ClickUp task
 */
export async function fetchClickUpTaskTimeInStatus(token: string, taskId: string): Promise<any> {
  try {
    return await clickupFetch(`/task/${taskId}/time_in_status`, token);
  } catch (err) {
    console.warn(`Time in status not available for task ${taskId}:`, err);
    return null;
  }
}

/**
 * Check if a status string represents a completed or closed task
 */
export function isClickUpTaskClosed(statusName?: string): boolean {
  if (!statusName) return false;
  const s = statusName.toLowerCase().trim();
  return ['done', 'complete', 'completed', 'closed', 'resolved', 'delivered'].includes(s);
}

/**
 * Batch fetch multiple ClickUp tasks with concurrency limit
 */
export async function batchFetchClickUpTasks(
  token: string,
  taskIds: string[],
  concurrency = 5
): Promise<Map<string, any>> {
  const results = new Map<string, any>();
  if (!taskIds.length) return results;

  const uniqueIds = Array.from(new Set(taskIds.filter(Boolean)));
  for (let i = 0; i < uniqueIds.length; i += concurrency) {
    const chunk = uniqueIds.slice(i, i + concurrency);
    const chunkResults = await Promise.allSettled(
      chunk.map(async (id) => {
        const task = await clickupFetch(`/task/${id}`, token);
        return { id, task };
      })
    );

    chunkResults.forEach((res) => {
      if (res.status === 'fulfilled' && res.value.task && res.value.task.id) {
        results.set(res.value.id, res.value.task);
      }
    });
  }

  return results;
}

export interface DeliverableSyncReport {
  updatedProjectsCount: number;
  syncedTasksCount: number;
  newlyCompletedTasksCount: number;
  changedTasksCount: number;
}

