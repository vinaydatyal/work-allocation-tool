// ClickUp API v2 Client & Mapping Helpers
// Maps ClickUp Workspaces, Spaces, Lists, and Tasks to our Agency Hub state

export interface ClickUpWorkspace {
  id: string;
  name: string;
  color: string;
  avatar: string;
}

export interface ClickUpList {
  id: string;
  name: string;
  task_count: number;
}

export interface ClickUpTask {
  id: string;
  name: string;
  status: {
    status: string;
    color: string;
  };
  assignees: Array<{
    id: number;
    username: string;
    email: string;
    profilePicture?: string;
  }>;
  time_estimate?: number; // milliseconds
  time_spent?: number; // milliseconds
  custom_fields?: Array<{
    id: string;
    name: string;
    value?: any;
  }>;
}

/**
 * ClickUp API v2 Base Service
 * Uses Vite proxy (/api/clickup) in dev to prevent browser CORS blocks
 */
export class ClickUpApiService {
  private apiToken: string;
  private baseUrl = '/api/clickup';

  constructor(apiToken: string) {
    this.apiToken = apiToken;
  }

  private async fetchClickUp(endpoint: string, options: RequestInit = {}) {
    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        Authorization: this.apiToken,
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`ClickUp API Error (${res.status}): ${errText}`);
    }

    return res.json();
  }

  /**
   * Fetch all Workspaces (Teams) accessible by the API token
   */
  async getWorkspaces(): Promise<ClickUpWorkspace[]> {
    const data = await this.fetchClickUp('/team');
    return (data.teams || []).map((t: any) => ({
      id: t.id,
      name: t.name,
      color: t.color,
      avatar: t.avatar
    }));
  }

  /**
   * Fetch Spaces in a Workspace
   */
  async getSpaces(workspaceId: string): Promise<any[]> {
    const data = await this.fetchClickUp(`/team/${workspaceId}/space`);
    return data.spaces || [];
  }

  /**
   * Fetch Lists inside a Space
   */
  async getListsInSpace(spaceId: string): Promise<ClickUpList[]> {
    const data = await this.fetchClickUp(`/space/${spaceId}/list`);
    return (data.lists || []).map((l: any) => ({
      id: l.id,
      name: l.name,
      task_count: l.task_count || 0
    }));
  }

  /**
   * Fetch Tasks in a specific ClickUp List
   */
  async getTasksInList(listId: string): Promise<ClickUpTask[]> {
    const data = await this.fetchClickUp(`/list/${listId}/task?subtasks=true&include_closed=false`);
    return data.tasks || [];
  }

  /**
   * Helper: Convert ClickUp millisecond estimates into weekly hours
   */
  static millisecondsToHours(ms?: number): number {
    if (!ms || ms <= 0) return 4; // default 4 hours if no time estimate set
    return Math.max(1, Math.round((ms / (1000 * 60 * 60)) * 10) / 10);
  }
}
