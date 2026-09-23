export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          role_type: 'CEO' | 'EXECUTIVE' | 'PROJECT_MANAGER' | 'TEAM_LEAD' | 'COORDINATOR' | 'MEMBER';
          role_title: string | null;
          avatar: string | null;
          team_id: string | null;
          clickup_user_id: number | null;
          clickup_email: string | null;
          clickup_token: string | null;
          can_manage_roster: boolean;
          can_assign_tasks: boolean;
          can_export_plan: boolean;
          can_calibrate_skills: boolean;
          can_manage_org_map: boolean;
          can_submit_dsr: boolean;
          can_review_dsr: boolean;
          can_approve_dsr: boolean;
          can_view_team_presence: boolean;
          can_view_all_teams: boolean;
          can_view_financials: boolean;
          created_at: string;
          last_seen: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          role_type: 'CEO' | 'EXECUTIVE' | 'PROJECT_MANAGER' | 'TEAM_LEAD' | 'COORDINATOR' | 'MEMBER';
          role_title?: string | null;
          avatar?: string | null;
          team_id?: string | null;
          clickup_user_id?: number | null;
          clickup_email?: string | null;
          clickup_token?: string | null;
          can_manage_roster?: boolean;
          can_assign_tasks?: boolean;
          can_export_plan?: boolean;
          can_calibrate_skills?: boolean;
          can_manage_org_map?: boolean;
          can_submit_dsr?: boolean;
          can_review_dsr?: boolean;
          can_approve_dsr?: boolean;
          can_view_team_presence?: boolean;
          can_view_all_teams?: boolean;
          can_view_financials?: boolean;
          created_at?: string;
          last_seen?: string | null;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      teams: {
        Row: {
          id: string;
          name: string;
          color: string | null;
          description: string | null;
          team_lead_id: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          color?: string | null;
          description?: string | null;
          team_lead_id?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['teams']['Insert']>;
      };
      team_members: {
        Row: {
          team_id: string;
          member_id: string;
          sort_order: number;
          added_at: string;
        };
        Insert: {
          team_id: string;
          member_id: string;
          sort_order?: number;
          added_at?: string;
        };
        Update: Partial<Database['public']['Tables']['team_members']['Insert']>;
      };
      tasks: {
        Row: {
          id: string;
          title: string;
          client_name: string | null;
          client_tier: 'TIER_S_VIP' | 'TIER_A_AGENCY' | 'TIER_B_LOCAL' | null;
          project_name: string | null;
          required_skill: string | null;
          estimated_hours: number;
          actual_hours_logged: number;
          assigned_user_id: string | null;
          priority: 'High' | 'Medium' | 'Low';
          status: 'backlog' | 'assigned' | 'in_progress' | 'review' | 'completed';
          due_date: string | null;
          category_color: string | null;
          clickup_task_id: string | null;
          clickup_url: string | null;
          clickup_status: string | null;
          source: 'local' | 'clickup' | 'allocated';
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          client_name?: string | null;
          client_tier?: 'TIER_S_VIP' | 'TIER_A_AGENCY' | 'TIER_B_LOCAL' | null;
          project_name?: string | null;
          required_skill?: string | null;
          estimated_hours?: number;
          actual_hours_logged?: number;
          assigned_user_id?: string | null;
          priority?: 'High' | 'Medium' | 'Low';
          status?: 'backlog' | 'assigned' | 'in_progress' | 'review' | 'completed';
          due_date?: string | null;
          category_color?: string | null;
          clickup_task_id?: string | null;
          clickup_url?: string | null;
          clickup_status?: string | null;
          source?: 'local' | 'clickup' | 'allocated';
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['tasks']['Insert']>;
      };
      time_logs: {
        Row: {
          id: string;
          task_id: string | null;
          user_id: string;
          task_name: string;
          category: string | null;
          start_time: string;
          end_time: string | null;
          duration_ms: number | null;
          notes: string | null;
          source: 'local' | 'clickup' | 'allocated';
          clickup_synced: boolean;
          local_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id?: string | null;
          user_id: string;
          task_name: string;
          category?: string | null;
          start_time: string;
          end_time?: string | null;
          duration_ms?: number | null;
          notes?: string | null;
          source?: 'local' | 'clickup' | 'allocated';
          clickup_synced?: boolean;
          local_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['time_logs']['Insert']>;
      };
      dsr_entries: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          status: 'draft' | 'pending_review' | 'revision_requested' | 'approved';
          submitted_at: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          reviewer_comment: string | null;
          approved_by: string | null;
          approved_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          status?: 'draft' | 'pending_review' | 'revision_requested' | 'approved';
          submitted_at?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          reviewer_comment?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['dsr_entries']['Insert']>;
      };
      dsr_time_logs: {
        Row: {
          dsr_id: string;
          time_log_id: string;
        };
        Insert: {
          dsr_id: string;
          time_log_id: string;
        };
        Update: Partial<Database['public']['Tables']['dsr_time_logs']['Insert']>;
      };
      presence: {
        Row: {
          user_id: string;
          task_name: string | null;
          task_id: string | null;
          status: 'active' | 'idle' | 'offline';
          last_seen: string;
        };
        Insert: {
          user_id: string;
          task_name?: string | null;
          task_id?: string | null;
          status?: 'active' | 'idle' | 'offline';
          last_seen?: string;
        };
        Update: Partial<Database['public']['Tables']['presence']['Insert']>;
      };
      sync_queue: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          payload: Json;
          retry_count: number;
          processed: boolean;
          created_at: string;
          processed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          payload: Json;
          retry_count?: number;
          processed?: boolean;
          created_at?: string;
          processed_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['sync_queue']['Insert']>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
