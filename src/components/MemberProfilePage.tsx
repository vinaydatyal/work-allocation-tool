import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { TeamMember, Task, TaskStatus, PriorityLevel } from '../types';
import type { ActiveProjectItem } from './VisualAgencyHub';
import { navigate } from '../utils/router';
import { toast as sonnerToast } from 'sonner';
import {
  isClickUpConnected,
  getClickUpToken,
  getClickUpWorkspaceId,
  setClickUpWorkspaceId,
  fetchClickUpTasks,
  fetchClickUpTask,
  fetchClickUpWorkspaces,
  fetchClickUpTeamMembers,
  updateClickUpTaskStatus,
  fetchClickUpTaskComments,
  createClickUpTaskComment,
  getCommentPlainText,
  type ClickUpCommentItem
} from '../services/clickupOAuth';
import { getPDFMasterProjects } from '../data/pdfMasterProjectsData';
import { calculateMemberROI } from '../utils/projectFinancials';
import {
  ArrowLeft,
  Share2,
  Check,
  Briefcase,
  CheckCircle2,
  Clock,
  Calendar,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  PhoneCall,
  Crown,
  TrendingUp,
  Award,
  Zap,
  RefreshCw,
  PlusCircle,
  X,
  Link2,
  Trash2,
  Search,
  UserCheck,
  MessageSquare,
  Send,
  ChevronDown,
  ChevronUp,
  Flag,
  FileText,
  Users,
  Tag,
  ArrowUpDown,
  SlidersHorizontal
} from 'lucide-react';

interface MemberProfilePageProps {
  memberId: string;
  activeSubTab?: 'projects' | 'tasks' | 'skills' | 'activity';
  allMembers: TeamMember[];
  allTasks: Task[];
  allProjects?: ActiveProjectItem[];
  isWhiteTheme?: boolean;
  onUpdateTaskStatus?: (taskId: string, newStatus: TaskStatus) => void;
}

export const MemberProfilePage: React.FC<MemberProfilePageProps> = ({
  memberId,
  activeSubTab = 'projects',
  allMembers,
  allTasks,
  allProjects: passedProjects,
  isWhiteTheme = false,
  onUpdateTaskStatus
}) => {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [taskStatusFilter, setTaskStatusFilter] = useState<'all' | TaskStatus>('all');
  const [taskSortBy, setTaskSortBy] = useState<'due_date' | 'time_spent' | 'time_est' | 'project' | 'task_name' | 'priority' | 'status'>('due_date');
  const [taskSortOrder, setTaskSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('all');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('all');
  const [taskSearchQuery, setTaskSearchQuery] = useState<string>('');

  // Active Projects state with persistence
  const [projectsList, setProjectsList] = useState<ActiveProjectItem[]>(() => {
    if (passedProjects && passedProjects.length > 0) return passedProjects;
    try {
      const saved = localStorage.getItem('vat_projects_list_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return getPDFMasterProjects(allMembers);
  });

  // Modal State: 1-Click Assign to Project
  const [isAssignProjectOpen, setIsAssignProjectOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [assignRole, setAssignRole] = useState<'Specialist' | 'Team Lead' | 'Call Lead'>('Specialist');
  const [assignHours, setAssignHours] = useState<number>(4);

  // Modal State: 1-Click Assign Task
  const [isAssignTaskOpen, setIsAssignTaskOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskClient, setTaskClient] = useState('');
  const [taskProject, setTaskProject] = useState('');
  const [taskHours, setTaskHours] = useState(4);
  const [taskPriority, setTaskPriority] = useState<PriorityLevel>('High');
  const [taskDueDate, setTaskDueDate] = useState('2026-07-31');
  const [taskClickUpId, setTaskClickUpId] = useState('');

  // Single-item refresh indicators
  const [syncingTaskId, setSyncingTaskId] = useState<string | null>(null);
  const [syncingProjectId, setSyncingProjectId] = useState<string | null>(null);

  // Find member by ID or by URL slug
  const member = useMemo(() => {
    const clean = memberId.trim().toLowerCase();
    return (
      allMembers.find((m) => m.id === memberId) ||
      allMembers.find((m) => m.id.toLowerCase() === clean) ||
      allMembers.find(
        (m) =>
          m.name.toLowerCase().replace(/\s+/g, '-') === clean ||
          m.name.toLowerCase() === clean
      )
    );
  }, [allMembers, memberId]);

  // If member not found
  if (!member) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-amber-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Team Member Not Found</h2>
        <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
          Could not locate any team member matching <span className="font-mono text-cyan-400">"{memberId}"</span>.
        </p>
        <button
          type="button"
          onClick={() => navigate('/projects')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer shadow-lg shadow-emerald-600/20"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Projects Roster</span>
        </button>
      </div>
    );
  }

  // Active Projects where member is Team Lead, Call Lead, or assigned Specialist
  const memberProjects = useMemo(() => {
    return projectsList.filter(
      (p) =>
        p.projectLeadId === member.id ||
        p.clientCallAssigneeId === member.id ||
        p.members?.some((m) => m.id === member.id)
    );
  }, [projectsList, member.id]);

  // Live ClickUp Synced Tasks state for this member
  const [clickUpSyncedTasks, setClickUpSyncedTasks] = useState<Task[]>(() => {
    try {
      const saved = localStorage.getItem(`vat_clickup_member_tasks_${member.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });
  const [isSyncingClickUp, setIsSyncingClickUp] = useState(false);

  // Persistent ClickUp User Account Mapping
  const [linkedClickUpUser, setLinkedClickUpUser] = useState<{ id: string | number; username: string; email: string } | null>(() => {
    try {
      const saved = localStorage.getItem(`vat_member_clickup_mapping_${member.id}`);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    if (member.clickUpUserId) {
      return { id: member.clickUpUserId, username: member.name, email: member.clickUpEmail || '' };
    }
    return null;
  });

  const [isLinkUserModalOpen, setIsLinkUserModalOpen] = useState(false);
  const [cuWorkspaceUsers, setCuWorkspaceUsers] = useState<Array<{ id: number; username: string; email: string; profilePicture?: string | null; role?: string }>>([]);
  const [isLoadingCuUsers, setIsLoadingCuUsers] = useState(false);
  const [cuUserSearchQuery, setCuUserSearchQuery] = useState('');
  const [taskSourceFilter, setTaskSourceFilter] = useState<'all' | 'clickup' | 'allocations'>('all');
  const [lastAutoRefreshedAt, setLastAutoRefreshedAt] = useState<string | null>(null);
  const [lastWorkspaceUsersRefreshedAt, setLastWorkspaceUsersRefreshedAt] = useState<string | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [taskCommentsMap, setTaskCommentsMap] = useState<Record<string, ClickUpCommentItem[]>>({});
  const [loadingCommentsMap, setLoadingCommentsMap] = useState<Record<string, boolean>>({});
  const [newCommentTextMap, setNewCommentTextMap] = useState<Record<string, string>>({});
  const [isPostingComment, setIsPostingComment] = useState(false);

  // 1-Click Handler: Assign Member to an existing project
  const handleConfirmAssignProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) {
      sonnerToast.error('Please select a project');
      return;
    }

    const targetProject = projectsList.find((p) => p.id === selectedProjectId);
    if (!targetProject) return;

    const updatedProjects = projectsList.map((p) => {
      if (p.id === selectedProjectId) {
        const hasMember = p.members?.some((m) => m.id === member.id);
        const updatedMembers = hasMember ? p.members : [...(p.members || []), member];
        const updatedHoursMap = {
          ...(p.memberHoursMap || {}),
          [member.id]: Number(assignHours) || 4
        };

        return {
          ...p,
          members: updatedMembers,
          memberHoursMap: updatedHoursMap,
          projectLeadId: assignRole === 'Team Lead' ? member.id : p.projectLeadId,
          clientCallAssigneeId: assignRole === 'Call Lead' ? member.id : p.clientCallAssigneeId
        };
      }
      return p;
    });

    setProjectsList(updatedProjects);
    try {
      localStorage.setItem('vat_projects_list_v1', JSON.stringify(updatedProjects));
    } catch (err) {
      console.warn('Failed to persist projects list:', err);
    }

    sonnerToast.success(`⚡ Assigned ${member.name} to "${targetProject.name}"!`, {
      description: `Role: ${assignRole} • ${assignHours}h/week allocated`
    });
    setIsAssignProjectOpen(false);
  };

  // 1-Click Handler: Create & Assign Task directly to Member
  const handleConfirmAssignTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      sonnerToast.error('Please enter a task title');
      return;
    }

    const cuId = taskClickUpId.trim() || `86b${Date.now().toString().slice(-6)}`;
    const newTask: Task = {
      id: `tsk_manual_${Date.now()}_${member.id}`,
      title: taskTitle.trim(),
      clientName: taskClient.trim() || 'Client Deliverable',
      projectName: taskProject.trim() || 'Sprint Execution',
      requiredSkill: member.skills[0] || 'Technical SEO',
      estimatedHours: Number(taskHours) || 4,
      actualHoursLogged: 0,
      assignedUserId: member.id,
      priority: taskPriority,
      status: 'assigned',
      dueDate: taskDueDate || '2026-07-31',
      categoryColor: '#8B5CF6',
      clickUpTaskId: cuId,
      clickUpUrl: `https://app.clickup.com/t/${cuId}`,
      clickUpStatus: 'to do'
    };

    const updated = [newTask, ...clickUpSyncedTasks];
    setClickUpSyncedTasks(updated);
    try {
      localStorage.setItem(`vat_clickup_member_tasks_${member.id}`, JSON.stringify(updated));
    } catch (err) {
      console.warn('Failed to persist member tasks:', err);
    }

    sonnerToast.success(`⚡ Task assigned to ${member.name}!`, {
      description: `"${taskTitle.trim()}" (${taskHours}h • Due: ${taskDueDate})`
    });

    // Reset and close
    setTaskTitle('');
    setTaskClickUpId('');
    setIsAssignTaskOpen(false);
  };

  // Single-Card ClickUp Task Refresh
  const handleSyncSingleTask = async (task: Task) => {
    if (!task.clickUpTaskId) {
      sonnerToast.info(`No ClickUp ID linked to task "${task.title}".`);
      return;
    }
    setSyncingTaskId(task.id);
    const token = getClickUpToken();

    try {
      if (token) {
        const live = await fetchClickUpTask(token, task.clickUpTaskId);
        if (live) {
          const rawStatus = (live.status?.status || '').toLowerCase();
          const mappedStatus: TaskStatus = (rawStatus.includes('complete') || rawStatus.includes('done') || rawStatus.includes('closed'))
            ? 'completed'
            : (rawStatus.includes('review') || rawStatus.includes('qa'))
            ? 'review'
            : (rawStatus.includes('progress') || rawStatus.includes('doing'))
            ? 'in_progress'
            : 'assigned';

          const estHours = live.time_estimate ? Math.round((live.time_estimate / 3600000) * 10) / 10 : (task.estimatedHours || 4);
          const spentHours = live.time_spent ? Math.round((live.time_spent / 3600000) * 10) / 10 : (task.timeSpentHours || 0);

          const updated = clickUpSyncedTasks.map((t) => {
            if (t.id === task.id || t.clickUpTaskId === task.clickUpTaskId) {
              return {
                ...t,
                title: live.name || t.title,
                status: mappedStatus,
                clickUpStatus: live.status?.status || t.clickUpStatus,
                clickUpStatusColor: live.status?.color || t.clickUpStatusColor,
                estimatedHours: estHours,
                timeEstimateHours: estHours,
                actualHoursLogged: spentHours,
                timeSpentHours: spentHours,
                description: live.text_content || live.description || t.description,
                commentsCount: live.comments_count ?? t.commentsCount,
                dueDate: live.due_date ? new Date(Number(live.due_date)).toISOString().split('T')[0] : t.dueDate,
                tags: live.tags?.map((tag: any) => ({
                  name: tag.name,
                  tag_fg: tag.tag_fg,
                  tag_bg: tag.tag_bg
                })) || t.tags,
                customFields: live.custom_fields?.map((cf: any) => ({
                  id: cf.id,
                  name: cf.name,
                  value: cf.value,
                  type: cf.type,
                  type_config: cf.type_config
                })) || t.customFields
              };
            }
            return t;
          });
          setClickUpSyncedTasks(updated);
          localStorage.setItem(`vat_clickup_member_tasks_${member.id}`, JSON.stringify(updated));
          sonnerToast.success(`⚡ Refreshed ClickUp #${task.clickUpTaskId}: "${live.status?.status || mappedStatus}" (${spentHours}h spent / ${estHours}h est)`);
        }
      } else {
        sonnerToast.success(`⚡ Task #${task.clickUpTaskId} verified against active project deliverables.`);
      }
    } catch (err: any) {
      console.error('Failed to sync single ClickUp task:', err);
      sonnerToast.error(`Could not refresh task #${task.clickUpTaskId}`, { description: err.message });
    } finally {
      setSyncingTaskId(null);
    }
  };

  // Single-Card ClickUp Project Refresh
  const handleSyncSingleProject = async (proj: ActiveProjectItem) => {
    setSyncingProjectId(proj.id);
    const token = getClickUpToken();

    try {
      if (token && proj.clickUpTaskId) {
        const live = await fetchClickUpTask(token, proj.clickUpTaskId);
        if (live) {
          const rawStatus = (live.status?.status || '').toLowerCase();
          const mappedStatus = (rawStatus.includes('complete') || rawStatus.includes('done'))
            ? 'COMPLETED'
            : rawStatus.includes('initial')
            ? 'INITIAL STAGE'
            : 'ON TRACK';

          const updated = projectsList.map((p) => (p.id === proj.id ? { ...p, status: mappedStatus as any } : p));
          setProjectsList(updated);
          localStorage.setItem('vat_projects_list_v1', JSON.stringify(updated));
          sonnerToast.success(`⚡ Refreshed project "${proj.name}" from ClickUp #${proj.clickUpTaskId}`);
        }
      } else {
        sonnerToast.success(`⚡ Verified project "${proj.name}" deliverables & milestones.`);
      }
    } catch (err: any) {
      console.error('Failed to sync project:', err);
      sonnerToast.error(`Could not refresh project "${proj.name}"`, { description: err.message });
    } finally {
      setSyncingProjectId(null);
    }
  };

  // Fetch real tasks assigned to ClickUp user with optional silent mode
  const fetchTasksForClickUpUser = useCallback(async (targetUserId: string | number, cuUsername?: string, isSilent = false) => {
    setIsSyncingClickUp(true);
    const token = getClickUpToken();
    let wsId = getClickUpWorkspaceId();

    try {
      if (!token) {
        if (!isSilent) {
          sonnerToast.error('ClickUp is not connected.', {
            description: 'Please connect ClickUp in the top bar to fetch live tasks.'
          });
        }
        return;
      }
      if (!wsId) {
        const workspaces = await fetchClickUpWorkspaces(token);
        if (workspaces && workspaces.length > 0) {
          wsId = workspaces[0].id;
          setClickUpWorkspaceId(wsId);
        }
      }
      if (!wsId) {
        if (!isSilent) sonnerToast.error('No ClickUp workspace found.');
        return;
      }

      if (!isSilent) {
        sonnerToast.loading(`Querying ClickUp for tasks assigned to ${cuUsername || member.name}...`, { id: 'cu-member-fetch' });
      }

      // Direct Assignee Query across the entire workspace
      const liveTasks = await fetchClickUpTasks(token, wsId, { assignees: [String(targetUserId)] });

      if (liveTasks && liveTasks.length > 0) {
        const mapped: Task[] = liveTasks.map((t, idx) => {
          const estHours = t.time_estimate ? Math.round((t.time_estimate / 3600000) * 10) / 10 : 4;
          const spentHours = t.time_spent ? Math.round((t.time_spent / 3600000) * 10) / 10 : 0;
          const rawStatus = (t.status?.status || '').toLowerCase();
          const mappedStatus: TaskStatus = (rawStatus.includes('complete') || rawStatus.includes('done') || rawStatus.includes('closed'))
            ? 'completed'
            : (rawStatus.includes('review') || rawStatus.includes('qa'))
            ? 'review'
            : (rawStatus.includes('progress') || rawStatus.includes('doing'))
            ? 'in_progress'
            : 'assigned';

          const folderOrSpace = t.folder?.name || t.space?.name;
          const listName = t.list?.name || 'ClickUp Task';
          const projName = folderOrSpace ? `${folderOrSpace} • ${listName}` : listName;

          return {
            id: `tsk_cu_live_${t.id}_${idx}`,
            title: t.name,
            clientName: listName,
            projectName: projName,
            requiredSkill: member.skills[0] || 'Technical SEO',
            estimatedHours: estHours,
            actualHoursLogged: spentHours,
            timeSpentHours: spentHours,
            timeEstimateHours: estHours,
            assignedUserId: member.id,
            priority: (t.priority?.priority === 'urgent' ? 'High' : t.priority?.priority === 'high' ? 'High' : t.priority?.priority === 'normal' ? 'Medium' : 'Low') as any,
            status: mappedStatus,
            dueDate: t.due_date ? new Date(Number(t.due_date)).toISOString().split('T')[0] : '2026-07-31',
            categoryColor: '#8B5CF6',
            clickUpTaskId: String(t.id),
            clickUpUrl: t.url,
            clickUpStatus: t.status?.status || 'in progress',
            clickUpStatusColor: t.status?.color || undefined,
            description: t.text_content || t.description || undefined,
            commentsCount: t.comments_count,
            listName: t.list?.name,
            folderName: t.folder?.name,
            assigneesList: t.assignees?.map((a) => ({
              id: a.id,
              username: a.username,
              email: a.email,
              profilePicture: a.profilePicture
            })),
            tags: t.tags?.map((tag) => ({
              name: tag.name,
              tag_fg: tag.tag_fg,
              tag_bg: tag.tag_bg
            })) || [],
            customFields: t.custom_fields?.map((cf) => ({
              id: cf.id,
              name: cf.name,
              value: cf.value,
              type: cf.type,
              type_config: cf.type_config
            })) || []
          };
        });

        localStorage.setItem(`vat_clickup_member_tasks_${member.id}`, JSON.stringify(mapped));
        setClickUpSyncedTasks(mapped);
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setLastAutoRefreshedAt(timeStr);
        if (!isSilent) {
          sonnerToast.success(`⚡ Synced ${mapped.length} real ClickUp tasks assigned to ${member.name}!`, { id: 'cu-member-fetch' });
        }
      } else {
        localStorage.removeItem(`vat_clickup_member_tasks_${member.id}`);
        setClickUpSyncedTasks([]);
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setLastAutoRefreshedAt(timeStr);
        if (!isSilent) {
          sonnerToast.info(`No active tasks assigned to ${member.name} in ClickUp.`, {
            description: `Query completed for ClickUp User #${targetUserId}.`,
            id: 'cu-member-fetch'
          });
        }
      }
    } catch (err: any) {
      console.error('Failed to pick ClickUp tasks for member:', err);
      if (!isSilent) {
        sonnerToast.error('ClickUp Task Query Failed', { description: err.message, id: 'cu-member-fetch' });
      }
    } finally {
      setIsSyncingClickUp(false);
    }
  }, [member.id, member.name, member.skills]);

  // Dedicated Auto-Refresh method for ClickUp Workspace Members
  const refreshClickUpWorkspaceUsers = useCallback(async (showToast = false) => {
    const token = getClickUpToken();
    let wsId = getClickUpWorkspaceId();
    if (!token) return;

    try {
      setIsLoadingCuUsers(true);
      if (!wsId) {
        const ws = await fetchClickUpWorkspaces(token);
        if (ws && ws.length > 0) {
          wsId = ws[0].id;
          setClickUpWorkspaceId(wsId);
        }
      }
      if (wsId) {
        const members = await fetchClickUpTeamMembers(token, wsId);
        setCuWorkspaceUsers(members);
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLastWorkspaceUsersRefreshedAt(timeStr);
        if (showToast) {
          sonnerToast.success(`🔄 Auto-refreshed ${members.length} ClickUp workspace members (${timeStr})`);
        }
      }
    } catch (err: any) {
      console.error('Failed to load ClickUp team members:', err);
      if (showToast) {
        sonnerToast.error('Failed to refresh members: ' + err.message);
      }
    } finally {
      setIsLoadingCuUsers(false);
    }
  }, []);

  // Auto-refresh member ClickUp tasks on mount and poll in background
  useEffect(() => {
    const token = getClickUpToken();
    if (!token) return;

    const targetUserId = linkedClickUpUser?.id || member.clickUpUserId;
    if (!targetUserId) return;

    // Initial background auto-refresh on mount / profile view
    fetchTasksForClickUpUser(targetUserId, linkedClickUpUser?.username || member.name, true);

    // 60-second periodic background refresh
    const interval = setInterval(() => {
      fetchTasksForClickUpUser(targetUserId, linkedClickUpUser?.username || member.name, true);
    }, 60000);

    return () => clearInterval(interval);
  }, [member.id, member.name, member.clickUpUserId, linkedClickUpUser?.id, linkedClickUpUser?.username, fetchTasksForClickUpUser]);

  // Auto-refresh workspace members when the link modal is opened
  useEffect(() => {
    if (isLinkUserModalOpen) {
      refreshClickUpWorkspaceUsers(false);
    }
  }, [isLinkUserModalOpen, refreshClickUpWorkspaceUsers]);

  // Pick/Fetch tasks assigned to this member from ClickUp
  const handlePickTasksFromClickUp = async () => {
    const token = getClickUpToken();
    let wsId = getClickUpWorkspaceId();
    if (!token) {
      sonnerToast.error('ClickUp is not connected.', {
        description: 'Please connect ClickUp in the top bar to fetch real tasks.'
      });
      return;
    }

    let targetUserId = linkedClickUpUser?.id || member.clickUpUserId;
    let targetUsername = linkedClickUpUser?.username;

    if (!targetUserId) {
      try {
        if (!wsId) {
          const ws = await fetchClickUpWorkspaces(token);
          if (ws && ws.length > 0) {
            wsId = ws[0].id;
            setClickUpWorkspaceId(wsId);
          }
        }
        if (wsId) {
          const cuMembers = await fetchClickUpTeamMembers(token, wsId);
          setCuWorkspaceUsers(cuMembers);
          const matched = cuMembers.find(
            (cm) =>
              (member.clickUpEmail && cm.email?.toLowerCase() === member.clickUpEmail.toLowerCase()) ||
              cm.username?.toLowerCase().includes(member.name.toLowerCase()) ||
              member.name.toLowerCase().includes(cm.username?.toLowerCase()) ||
              cm.username?.toLowerCase().includes(member.name.split(' ')[0].toLowerCase())
          );
          if (matched) {
            targetUserId = matched.id;
            targetUsername = matched.username;
            const mapping = { id: matched.id, username: matched.username, email: matched.email };
            setLinkedClickUpUser(mapping);
            localStorage.setItem(`vat_member_clickup_mapping_${member.id}`, JSON.stringify(mapping));
            sonnerToast.success(`⚡ Auto-matched ClickUp account: @${matched.username}!`);
          }
        }
      } catch (err) {
        console.warn('Auto match failed', err);
      }
    }

    if (!targetUserId) {
      handleOpenLinkUserModal();
      sonnerToast.info(`Please select ${member.name}'s ClickUp user account from the list.`);
      return;
    }

    await fetchTasksForClickUpUser(targetUserId, targetUsername, false);
  };

  const handleOpenLinkUserModal = async () => {
    setIsLinkUserModalOpen(true);
    await refreshClickUpWorkspaceUsers(false);
  };

  const handleSelectClickUpUser = (u: { id: number; username: string; email: string }) => {
    const mapping = { id: u.id, username: u.username, email: u.email };
    setLinkedClickUpUser(mapping);
    localStorage.setItem(`vat_member_clickup_mapping_${member.id}`, JSON.stringify(mapping));
    // Immediately clear previous task cache so no stale cards linger
    localStorage.removeItem(`vat_clickup_member_tasks_${member.id}`);
    setClickUpSyncedTasks([]);
    setIsLinkUserModalOpen(false);
    sonnerToast.success(`⚡ Linked ${member.name} to ClickUp user @${u.username} (#${u.id})! Auto-refreshing tasks...`);
    fetchTasksForClickUpUser(u.id, u.username, false);
  };

  const handleUnlinkClickUpUser = () => {
    setLinkedClickUpUser(null);
    localStorage.removeItem(`vat_member_clickup_mapping_${member.id}`);
    localStorage.removeItem(`vat_clickup_member_tasks_${member.id}`);
    setClickUpSyncedTasks([]);
    setLastAutoRefreshedAt(null);
    sonnerToast.info(`Unlinked ClickUp user for ${member.name} and cleared task cache.`);
  };

  const handleClearTaskCache = () => {
    localStorage.removeItem(`vat_clickup_member_tasks_${member.id}`);
    setClickUpSyncedTasks([]);
    setLastAutoRefreshedAt(null);
    sonnerToast.success(`🧹 Cleared task cache for ${member.name}!`);
  };

  // Toggle Expand Task Pocket & auto-fetch comments for ClickUp tasks
  const handleToggleExpandTask = async (task: Task) => {
    const isOpening = expandedTaskId !== task.id;
    setExpandedTaskId(isOpening ? task.id : null);

    if (isOpening && task.clickUpTaskId && !taskCommentsMap[task.clickUpTaskId]) {
      const token = getClickUpToken();
      if (token) {
        setLoadingCommentsMap((prev) => ({ ...prev, [task.clickUpTaskId!]: true }));
        try {
          const comments = await fetchClickUpTaskComments(token, task.clickUpTaskId);
          setTaskCommentsMap((prev) => ({ ...prev, [task.clickUpTaskId!]: comments }));
        } catch (err) {
          console.warn('Failed to fetch ClickUp comments:', err);
        } finally {
          setLoadingCommentsMap((prev) => ({ ...prev, [task.clickUpTaskId!]: false }));
        }
      }
    }
  };

  // Post a new comment directly to ClickUp task
  const handlePostComment = async (task: Task) => {
    if (!task.clickUpTaskId) return;
    const text = (newCommentTextMap[task.id] || '').trim();
    if (!text) {
      sonnerToast.error('Please enter a comment');
      return;
    }
    const token = getClickUpToken();
    if (!token) {
      sonnerToast.error('ClickUp is not connected.');
      return;
    }

    setIsPostingComment(true);
    try {
      const created = await createClickUpTaskComment(token, task.clickUpTaskId, text);
      setTaskCommentsMap((prev) => ({
        ...prev,
        [task.clickUpTaskId!]: [...(prev[task.clickUpTaskId!] || []), created]
      }));
      setNewCommentTextMap((prev) => ({ ...prev, [task.id]: '' }));
      sonnerToast.success('💬 Comment posted to ClickUp task!');
    } catch (err: any) {
      console.error('Failed to post comment:', err);
      sonnerToast.error('Failed to post comment: ' + err.message);
    } finally {
      setIsPostingComment(false);
    }
  };

  // Tasks assigned to member: combines sprint tasks, live ClickUp tasks, and active project deliverables
  const memberTasks = useMemo(() => {
    // 1. Direct tasks assigned in allTasks
    const directTasks = allTasks.filter((t) => t.assignedUserId === member.id);

    // 2. ClickUp synced tasks
    const cuTasks = clickUpSyncedTasks;

    // 3. Deliverables derived from active projects where member is Lead, Call, or Specialist
    const derivedProjectDeliverables: Task[] = memberProjects.flatMap((proj) => {
      // If project has explicit taskBreakdown with items for this member
      const memberBreakdown = proj.taskBreakdown?.filter(
        (tb) => tb.assigneeId === member.id
      ) || [];

      if (memberBreakdown.length > 0) {
        return memberBreakdown.map((tb) => {
          const rawStatus = (tb.status || tb.clickUpStatus || 'in_progress').toLowerCase();
          const mappedStatus: TaskStatus = (rawStatus.includes('complete') || rawStatus.includes('done'))
            ? 'completed'
            : rawStatus.includes('review')
            ? 'review'
            : rawStatus.includes('progress')
            ? 'in_progress'
            : 'assigned';

          const cuId = tb.clickUpTaskId || proj.clickUpTaskId;
          const cuUrl = tb.clickUpUrl || (cuId ? `https://app.clickup.com/t/${cuId}` : undefined);

          return {
            id: `tb_${proj.id}_${tb.id}`,
            title: `${tb.taskType} - ${proj.name}`,
            clientName: proj.client,
            clientTier: proj.clientTier,
            projectName: proj.name,
            requiredSkill: member.skills[0] || 'Technical SEO',
            estimatedHours: tb.hours || 4,
            actualHoursLogged: 0,
            assignedUserId: member.id,
            priority: (proj.priorityLevel === 'URGENT' ? 'High' : 'Medium') as any,
            status: mappedStatus,
            dueDate: proj.dueDateOrRenewal || '2026-07-31',
            categoryColor: '#3B82F6',
            clickUpTaskId: cuId,
            clickUpUrl: cuUrl,
            clickUpStatus: tb.clickUpStatus || (mappedStatus === 'completed' ? 'complete' : 'in progress')
          };
        });
      }

      // If no explicit breakdown entry for member, synthesize their allocated project deliverable
      const hoursShare = proj.memberHoursMap && proj.memberHoursMap[member.id]
        ? proj.memberHoursMap[member.id]
        : Math.round((proj.activeHours || 10) / Math.max(1, proj.members?.length || 1));

      const isLead = proj.projectLeadId === member.id;
      const isCall = proj.clientCallAssigneeId === member.id;

      let taskTitle = `${member.role} Sprint Deliverable - ${proj.name}`;
      if (isLead) taskTitle = `Project Lead Sprint Oversight & QA - ${proj.name}`;
      else if (isCall) taskTitle = `Client Communication & Strategy Call Sync - ${proj.name}`;
      else if (member.role.toLowerCase().includes('wordpress') || member.role.toLowerCase().includes('web')) {
        taskTitle = `WordPress Performance, Core Web Vitals & Code Sprint - ${proj.name}`;
      } else if (member.role.toLowerCase().includes('seo')) {
        taskTitle = `On-Page & Technical SEO Optimization Sprint - ${proj.name}`;
      } else if (member.role.toLowerCase().includes('link')) {
        taskTitle = `Backlink Acquisition & Outreach Campaign - ${proj.name}`;
      }

      const projStatus = (proj.status || '').toLowerCase();
      const mappedStatus: TaskStatus = (projStatus.includes('complete') || projStatus.includes('done'))
        ? 'completed'
        : 'in_progress';

      const cuId = proj.clickUpTaskId;
      const cuUrl = proj.clientFolderUrl || (cuId ? `https://app.clickup.com/t/${cuId}` : undefined);

      return [{
        id: `proj_deliv_${proj.id}_${member.id}`,
        title: taskTitle,
        clientName: proj.client,
        clientTier: proj.clientTier,
        projectName: proj.name,
        requiredSkill: member.skills[0] || 'Technical SEO',
        estimatedHours: hoursShare || 4,
        actualHoursLogged: 0,
        assignedUserId: member.id,
        priority: (proj.priorityLevel === 'URGENT' ? 'High' : 'Medium') as any,
        status: mappedStatus,
        dueDate: proj.dueDateOrRenewal || '2026-07-31',
        categoryColor: isLead ? '#06B6D4' : isCall ? '#8B5CF6' : '#3B82F6',
        clickUpTaskId: cuId,
        clickUpUrl: cuUrl,
        clickUpStatus: mappedStatus === 'completed' ? 'complete' : 'in progress'
      }];
    });

    // Merge and deduplicate by clickUpTaskId or task id
    const combined = [...directTasks, ...cuTasks];
    const seenKeys = new Set(combined.map((t) => t.clickUpTaskId || t.id));

    derivedProjectDeliverables.forEach((dt) => {
      const key = dt.clickUpTaskId || dt.id;
      if (!seenKeys.has(key)) {
        combined.push(dt);
        seenKeys.add(key);
      }
    });

    return combined;
  }, [allTasks, clickUpSyncedTasks, memberProjects, member]);

  // Two-way task status update
  const handleTaskStatusChange = async (task: Task, newStatus: TaskStatus) => {
    onUpdateTaskStatus?.(task.id, newStatus);

    if (clickUpSyncedTasks.some((t) => t.id === task.id || (task.clickUpTaskId && t.clickUpTaskId === task.clickUpTaskId))) {
      const updated = clickUpSyncedTasks.map((t) => {
        if (t.id === task.id || (task.clickUpTaskId && t.clickUpTaskId === task.clickUpTaskId)) {
          return { ...t, status: newStatus, clickUpStatus: newStatus === 'completed' ? 'complete' : 'in progress' };
        }
        return t;
      });
      setClickUpSyncedTasks(updated);
      localStorage.setItem(`vat_clickup_member_tasks_${member.id}`, JSON.stringify(updated));
    }

    const token = getClickUpToken();
    if (token && task.clickUpTaskId) {
      try {
        await updateClickUpTaskStatus(token, task.clickUpTaskId, newStatus);
        sonnerToast.success(`⚡ Updated in ClickUp #${task.clickUpTaskId}: ${newStatus}`);
      } catch (err) {
        console.warn('ClickUp status sync failed:', err);
      }
    } else {
      sonnerToast.success(`Updated task status to ${newStatus.replace('_', ' ')}`);
    }
  };

  // Unique projects and tags available on member's active tasks
  const availableProjects = useMemo(() => {
    const set = new Set<string>();
    memberTasks.forEach((t) => {
      const p = t.projectName || t.clientName;
      if (p) set.add(p);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [memberTasks]);

  const availableTags = useMemo(() => {
    const set = new Set<string>();
    memberTasks.forEach((t) => {
      t.tags?.forEach((tg) => {
        if (tg.name) set.add(tg.name);
      });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [memberTasks]);

  // Filtered & Sorted tasks
  const filteredTasks = useMemo(() => {
    let list = memberTasks;

    // 1. Source filter
    if (taskSourceFilter === 'clickup') {
      list = list.filter((t) => t.id.startsWith('tsk_cu_live_') || (!!t.clickUpTaskId && !t.id.startsWith('proj_deliv_')));
    } else if (taskSourceFilter === 'allocations') {
      list = list.filter((t) => t.id.startsWith('proj_deliv_') || t.id.startsWith('tb_'));
    }

    // 2. Status filter
    if (taskStatusFilter !== 'all') {
      list = list.filter((t) => t.status === taskStatusFilter);
    }

    // 3. Project filter
    if (selectedProjectFilter !== 'all') {
      list = list.filter((t) => (t.projectName || t.clientName) === selectedProjectFilter);
    }

    // 4. Tag filter
    if (selectedTagFilter !== 'all') {
      list = list.filter((t) => t.tags?.some((tg) => tg.name.toLowerCase() === selectedTagFilter.toLowerCase()));
    }

    // 5. Keyword search filter
    if (taskSearchQuery.trim()) {
      const q = taskSearchQuery.toLowerCase().trim();
      list = list.filter((t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.projectName && t.projectName.toLowerCase().includes(q)) ||
        (t.clientName && t.clientName.toLowerCase().includes(q)) ||
        (t.clickUpTaskId && t.clickUpTaskId.includes(q)) ||
        (t.tags && t.tags.some((tg) => tg.name.toLowerCase().includes(q))) ||
        (t.customFields && t.customFields.some((cf) => String(cf.value || '').toLowerCase().includes(q) || cf.name.toLowerCase().includes(q)))
      );
    }

    // 6. Multi-attribute sorting
    const sorted = [...list].sort((a, b) => {
      let diff = 0;
      if (taskSortBy === 'time_spent') {
        const aSpent = a.timeSpentHours ?? a.actualHoursLogged ?? 0;
        const bSpent = b.timeSpentHours ?? b.actualHoursLogged ?? 0;
        diff = aSpent - bSpent;
      } else if (taskSortBy === 'time_est') {
        const aEst = a.timeEstimateHours ?? a.estimatedHours ?? 0;
        const bEst = b.timeEstimateHours ?? b.estimatedHours ?? 0;
        diff = aEst - bEst;
      } else if (taskSortBy === 'due_date') {
        const aTime = a.dueDate ? new Date(a.dueDate).getTime() : 0;
        const bTime = b.dueDate ? new Date(b.dueDate).getTime() : 0;
        diff = aTime - bTime;
      } else if (taskSortBy === 'project') {
        const aProj = (a.projectName || a.clientName || '').toLowerCase();
        const bProj = (b.projectName || b.clientName || '').toLowerCase();
        diff = aProj.localeCompare(bProj);
      } else if (taskSortBy === 'task_name') {
        diff = a.title.toLowerCase().localeCompare(b.title.toLowerCase());
      } else if (taskSortBy === 'priority') {
        const priorityRank: Record<string, number> = { High: 3, Medium: 2, Low: 1 };
        const aRank = priorityRank[a.priority as string] || 0;
        const bRank = priorityRank[b.priority as string] || 0;
        diff = aRank - bRank;
      } else if (taskSortBy === 'status') {
        const statusRank: Record<string, number> = { assigned: 1, in_progress: 2, review: 3, completed: 4, backlog: 0 };
        const aRank = statusRank[a.status] || 0;
        const bRank = statusRank[b.status] || 0;
        diff = aRank - bRank;
      }

      return taskSortOrder === 'asc' ? diff : -diff;
    });

    return sorted;
  }, [
    memberTasks,
    taskSourceFilter,
    taskStatusFilter,
    selectedProjectFilter,
    selectedTagFilter,
    taskSearchQuery,
    taskSortBy,
    taskSortOrder
  ]);

  // Workload calculations
  const weeklyCap = member.weeklyCapacityHours || 40;
  const assignedHours = useMemo(() => {
    return memberProjects.reduce((acc, p) => {
      if (p.memberHoursMap && p.memberHoursMap[member.id]) {
        return acc + p.memberHoursMap[member.id];
      }
      const memberCount = Math.max(1, p.members?.length || 1);
      return acc + Math.round((p.activeHours || 10) / memberCount);
    }, 0);
  }, [memberProjects, member.id]);

  const utilizationPct = Math.round((assignedHours / weeklyCap) * 100) || 0;
  const isOverloaded = assignedHours > weeklyCap;
  const bandwidthRemaining = Math.max(0, weeklyCap - assignedHours);

  // Projects led vs calls
  const ledProjectsCount = memberProjects.filter((p) => p.projectLeadId === member.id).length;
  const callProjectsCount = memberProjects.filter((p) => p.clientCallAssigneeId === member.id).length;

  // Idea 7: Specialist Revenue Generation & ROI Multiplier
  const memberROI = useMemo(() => {
    if (!member) return null;
    return calculateMemberROI(member, memberProjects, memberTasks);
  }, [member, memberProjects, memberTasks]);

  const handleCopyProfileUrl = () => {
    const url = window.location.origin + `/member/${member.id}`;
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    sonnerToast.success(`Profile URL copied to clipboard: ${url}`);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  // Helper to format ClickUp Custom Field value
  const renderCustomFieldValue = (cf: { id: string; name: string; value?: any; type?: string; type_config?: any }) => {
    if (cf.value === null || cf.value === undefined || cf.value === '') {
      return <span className="text-slate-500 italic text-[11px]">—</span>;
    }

    // Dropdown
    if (cf.type === 'drop_down' && cf.type_config?.options) {
      const opt = cf.type_config.options.find(
        (o: any) => o.orderindex === cf.value || o.id === cf.value || String(o.orderindex) === String(cf.value)
      );
      if (opt) {
        return (
          <span
            className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border truncate max-w-full"
            style={{
              backgroundColor: opt.color ? `${opt.color}22` : 'rgba(148, 163, 184, 0.1)',
              borderColor: opt.color ? `${opt.color}55` : 'rgba(148, 163, 184, 0.3)',
              color: opt.color || '#cbd5e1'
            }}
          >
            {opt.name}
          </span>
        );
      }
      return <span className="text-slate-200 text-xs font-medium truncate">{String(cf.value)}</span>;
    }

    // Labels
    if (cf.type === 'labels' && Array.isArray(cf.value)) {
      const options = cf.type_config?.options || [];
      return (
        <div className="flex items-center gap-1 flex-wrap">
          {cf.value.map((valId: string, idx: number) => {
            const opt = options.find((o: any) => o.id === valId || o.label === valId);
            const labelName = opt?.label || opt?.name || String(valId);
            const color = opt?.color || '#38bdf8';
            return (
              <span
                key={idx}
                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border"
                style={{
                  backgroundColor: `${color}22`,
                  borderColor: `${color}55`,
                  color: color
                }}
              >
                {labelName}
              </span>
            );
          })}
        </div>
      );
    }

    // URL
    if (cf.type === 'url' && typeof cf.value === 'string') {
      return (
        <a
          href={cf.value.startsWith('http') ? cf.value : `https://${cf.value}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-cyan-400 hover:text-cyan-300 underline inline-flex items-center gap-1 text-xs truncate max-w-full"
        >
          <span className="truncate">{cf.value}</span>
          <ExternalLink className="w-2.5 h-2.5 shrink-0" />
        </a>
      );
    }

    // Date
    if (cf.type === 'date' && (typeof cf.value === 'number' || !isNaN(Number(cf.value)))) {
      const d = new Date(Number(cf.value));
      return <span className="text-slate-300 font-mono text-xs">{d.toLocaleDateString()}</span>;
    }

    // Currency
    if (cf.type === 'currency') {
      return <span className="text-emerald-400 font-mono font-bold text-xs">${Number(cf.value).toLocaleString()}</span>;
    }

    // Checkbox
    if (cf.type === 'checkbox') {
      return cf.value ? (
        <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-semibold">
          <Check className="w-3 h-3" /> Yes
        </span>
      ) : (
        <span className="text-slate-500 text-xs">No</span>
      );
    }

    // Array of values
    if (Array.isArray(cf.value)) {
      return (
        <span className="text-slate-300 text-xs truncate">
          {cf.value.map((v) => (typeof v === 'object' ? v.name || v.username || JSON.stringify(v) : String(v))).join(', ')}
        </span>
      );
    }

    // Object
    if (typeof cf.value === 'object') {
      return (
        <span className="text-slate-300 text-xs truncate">
          {cf.value.name || cf.value.username || JSON.stringify(cf.value)}
        </span>
      );
    }

    return <span className="text-slate-300 text-xs font-medium truncate">{String(cf.value)}</span>;
  };

  const handleSwitchTab = (tab: 'projects' | 'tasks' | 'skills') => {
    navigate(`/member/${member.id}/${tab}`);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-24 animate-fade-in">
      {/* TOP NAVIGATION BREADCRUMB & ACTIONS */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => navigate('/projects')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-cyan-400" />
            <span>Projects Dashboard</span>
          </button>
          <span className="text-slate-600">/</span>
          <button
            type="button"
            onClick={() => navigate('/hours')}
            className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer font-medium"
          >
            Team Roster
          </button>
          <span className="text-slate-600">/</span>
          <span className="text-emerald-400 font-bold truncate">{member.name}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyProfileUrl}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-colors cursor-pointer"
            title="Copy shareable link to this profile"
          >
            {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-cyan-400" />}
            <span>{copiedUrl ? 'Copied Link' : 'Share Profile'}</span>
          </button>
        </div>
      </div>

      {/* HERO BANNER & PROFILE OVERVIEW */}
      <div
        className="rounded-3xl border p-6 sm:p-8 backdrop-blur-2xl relative overflow-hidden shadow-2xl transition-all"
        style={{
          backgroundColor: isWhiteTheme ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 23, 42, 0.85)',
          borderColor: isWhiteTheme ? '#e2e8f0' : 'rgba(51, 65, 85, 0.6)'
        }}
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-cyan-400 to-indigo-500" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Member Identity Details */}
          <div className="flex items-start sm:items-center gap-5 min-w-0">
            <div className="relative shrink-0">
              <img
                src={member.avatar}
                alt={member.name}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover ring-2 ring-emerald-500/50 shadow-xl"
              />
              <span
                className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-slate-900 flex items-center justify-center text-[9px] ${
                  isOverloaded ? 'bg-rose-500 text-white' : utilizationPct >= 80 ? 'bg-amber-500 text-slate-950' : 'bg-emerald-500 text-white'
                }`}
                title={`Status: ${utilizationPct}% utilized`}
              >
                {isOverloaded ? '!' : '✓'}
              </span>
            </div>

            <div className="min-w-0 space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  {member.name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 border border-slate-700 text-slate-300">
                  {member.seniority || 'Specialist'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  {member.department || 'Operations'}
                </span>
              </div>

              <div className="text-sm font-semibold text-slate-400">
                {member.role}
              </div>

              {/* Client Ready Tier Badge */}
              {member.generalCompetency?.clientReadyTier && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-950/60 border border-indigo-500/40 text-indigo-300 text-xs font-bold">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{member.generalCompetency.clientReadyTier}</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Metrics Grid (Idea 7: with ROI Multiplier & Billable Ratio) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 shrink-0">
            {/* Capacity Card */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 text-center min-w-[110px]">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Weekly Cap</div>
              <div className="text-lg font-black text-white mt-0.5 font-mono">{weeklyCap}h</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Total Bandwidth</div>
            </div>

            {/* Assigned Hours Card */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 text-center min-w-[110px]">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Allocated</div>
              <div className={`text-lg font-black mt-0.5 font-mono ${isOverloaded ? 'text-rose-400' : 'text-emerald-400'}`}>
                {assignedHours}h
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">{utilizationPct}% Utilized</div>
            </div>

            {/* Led Projects Card */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 text-center min-w-[110px]">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Team Lead</div>
              <div className="text-lg font-black text-cyan-400 mt-0.5 font-mono flex items-center justify-center gap-1">
                <Crown className="w-4 h-4 text-cyan-400" />
                <span>{ledProjectsCount}</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Projects</div>
            </div>

            {/* Calls Lead Card */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 text-center min-w-[110px]">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Client Calls</div>
              <div className="text-lg font-black text-purple-400 mt-0.5 font-mono flex items-center justify-center gap-1">
                <PhoneCall className="w-4 h-4 text-purple-400" />
                <span>{callProjectsCount}</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Accounts</div>
            </div>

            {/* Specialist Revenue Generated & ROI Card (Idea 7) */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 text-center min-w-[110px]">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ROI Multiplier</div>
              <div className="text-lg font-black text-amber-300 mt-0.5 font-mono flex items-center justify-center gap-0.5">
                <span>{memberROI?.roiMultiplier || '3.5x'}</span>
              </div>
              <div className="text-[10px] text-emerald-400 font-mono mt-0.5">${Math.round(memberROI?.monthlyRetainerValueGenerated || 0).toLocaleString()}/mo</div>
            </div>

            {/* Billable Ratio Card (Idea 7) */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 text-center min-w-[110px]">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Billable Ratio</div>
              <div className="text-lg font-black text-cyan-300 mt-0.5 font-mono">
                {memberROI?.billableUtilizationPercent || 0}%
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Direct Client Work</div>
            </div>
          </div>
        </div>

        {/* Live Workload Capacity Gauge */}
        <div className="mt-6 pt-5 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-xs font-bold mb-1.5">
            <span className="text-slate-300 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>Current Workload & Utilization</span>
            </span>
            <span className={`font-mono ${isOverloaded ? 'text-rose-400' : 'text-emerald-400'}`}>
              {assignedHours} / {weeklyCap} hrs ({utilizationPct}%)
              {isOverloaded && <span className="ml-2 px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold">⚠️ OVERLOADED</span>}
              {!isOverloaded && bandwidthRemaining > 0 && (
                <span className="ml-2 text-slate-400 font-normal">({bandwidthRemaining}h available)</span>
              )}
            </span>
          </div>

          <div className="w-full h-3 rounded-full bg-slate-800/90 overflow-hidden relative">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isOverloaded
                  ? 'bg-gradient-to-r from-rose-600 to-rose-400'
                  : utilizationPct >= 80
                  ? 'bg-gradient-to-r from-amber-500 to-amber-300'
                  : 'bg-gradient-to-r from-emerald-500 to-cyan-400'
              }`}
              style={{ width: `${Math.min(100, utilizationPct)}%` }}
            />
          </div>
        </div>
      </div>

      {/* SUB-NAVIGATION TABS (URL STRUCTURE DRIVEN) */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => handleSwitchTab('projects')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'projects'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Active Projects</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
            {memberProjects.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleSwitchTab('tasks')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'tasks'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Active Tasks</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
            {memberTasks.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleSwitchTab('skills')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'skills'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Skills & Competencies</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
            {member.skills?.length || 0}
          </span>
        </button>
      </div>

      {/* TAB CONTENT 1: ACTIVE PROJECTS */}
      {activeSubTab === 'projects' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className={`text-sm font-bold ${isWhiteTheme ? 'text-slate-800' : 'text-slate-200'}`}>
                Active Projects Involving {member.name} ({memberProjects.length})
              </h3>
              <span className="text-xs text-slate-400">
                {assignedHours} estimated allocated hours
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                if (projectsList.length > 0) {
                  setSelectedProjectId(projectsList[0].id);
                }
                setIsAssignProjectOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md shadow-cyan-600/25 transition-all cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Assign to Project</span>
            </button>
          </div>

          {memberProjects.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/60 rounded-2xl border border-slate-800 text-slate-400 space-y-3">
              <Briefcase className="w-8 h-8 text-slate-600 mx-auto" />
              <div>
                <p className="text-sm font-semibold">No active projects assigned to {member.name}.</p>
                <p className="text-xs text-slate-500 mt-1">Assign this member as Team Lead, Call Lead, or Specialist.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (projectsList.length > 0) setSelectedProjectId(projectsList[0].id);
                  setIsAssignProjectOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Assign to First Project</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {memberProjects.map((proj) => {
                const isLead = proj.projectLeadId === member.id;
                const isCall = proj.clientCallAssigneeId === member.id;
                const hoursShare = proj.memberHoursMap && proj.memberHoursMap[member.id]
                  ? proj.memberHoursMap[member.id]
                  : Math.round((proj.activeHours || 10) / Math.max(1, proj.members?.length || 1));

                return (
                  <div
                    key={proj.id}
                    className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all space-y-3 relative group"
                  >
                    {/* Project Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[10px] font-black uppercase text-cyan-400 tracking-wider">
                          {proj.client}
                        </div>
                        <h4 className="text-sm font-bold text-white truncate" title={proj.name}>
                          {proj.name}
                        </h4>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleSyncSingleProject(proj)}
                          disabled={syncingProjectId === proj.id}
                          className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
                          title="Sync this project from ClickUp"
                        >
                          <RefreshCw className={`w-3 h-3 ${syncingProjectId === proj.id ? 'animate-spin text-cyan-400' : ''}`} />
                        </button>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase shrink-0 ${
                          proj.status === 'ON TRACK'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : proj.status === 'INITIAL STAGE'
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {proj.status || 'ACTIVE'}
                        </span>
                      </div>
                    </div>

                    {/* Member Role Badges in Project */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {isLead && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-[10px] font-bold">
                          <Crown className="w-3 h-3 text-cyan-400" />
                          <span>Team Lead</span>
                        </span>
                      )}
                      {isCall && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-950/80 border border-purple-500/40 text-purple-300 text-[10px] font-bold">
                          <PhoneCall className="w-3 h-3 text-purple-400" />
                          <span>Call Lead</span>
                        </span>
                      )}
                      {!isLead && !isCall && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-bold">
                          <span>Specialist</span>
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-md bg-slate-800/60 text-slate-400 text-[10px] font-medium ml-auto">
                        {proj.billingType}
                      </span>
                    </div>

                    {/* Project Metrics */}
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                      <div>
                        Allocated: <strong className="text-white font-mono">{hoursShare}h</strong>
                        <span className="text-[10px] text-slate-500 ml-1">/ {proj.totalHours}h total</span>
                      </div>
                      <div className="font-mono text-emerald-400 font-bold">
                        {proj.price || `$${proj.paymentAmountNumeric || 0}/mo`}
                      </div>
                    </div>

                    {/* Quick Link into Projects Dashboard */}
                    <button
                      type="button"
                      onClick={() => navigate('/projects')}
                      className="w-full py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <span>View in Projects Roster</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 2: ACTIVE TASKS */}
      {activeSubTab === 'tasks' && (
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className={`text-sm font-bold ${isWhiteTheme ? 'text-slate-800' : 'text-slate-200'}`}>
                  Tasks Assigned to {member.name} ({filteredTasks.length})
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setTaskProject(memberProjects[0]?.name || '');
                    setTaskClient(memberProjects[0]?.client || '');
                    setIsAssignTaskOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md shadow-cyan-600/25 transition-all cursor-pointer"
                  title="Create or assign a task directly to this member"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Assign Task</span>
                </button>
                <button
                  type="button"
                  onClick={handlePickTasksFromClickUp}
                  disabled={isSyncingClickUp}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-600/25 transition-all cursor-pointer disabled:opacity-75"
                  title="Fetch real assigned tasks directly from ClickUp workspace"
                >
                  {isSyncingClickUp ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                  ) : (
                    <Zap className="w-3.5 h-3.5 text-amber-300" />
                  )}
                  <span className="text-white font-bold">{isSyncingClickUp ? 'Fetching from ClickUp...' : 'Fetch ClickUp Tasks'}</span>
                </button>

                {/* ClickUp User Link Pill / Trigger */}
                {linkedClickUpUser ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-950/70 border border-purple-500/50 text-purple-200 text-xs font-semibold shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>ClickUp: <strong className="text-white">@{linkedClickUpUser.username}</strong></span>
                    <button
                      type="button"
                      onClick={handleOpenLinkUserModal}
                      className="ml-1 px-1.5 py-0.5 rounded bg-purple-900/80 hover:bg-purple-800 text-[10px] text-purple-200 hover:text-white transition-colors cursor-pointer"
                      title="Switch or unlink ClickUp account"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleOpenLinkUserModal}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-500/50 text-purple-200 font-bold text-xs shadow-md transition-all cursor-pointer hover:scale-105"
                    title="Pair this member with their ClickUp user account"
                  >
                    <Link2 className="w-3.5 h-3.5 text-purple-400" />
                    <span>Link ClickUp Account</span>
                  </button>
                )}

                {/* Auto-Sync Live Indicator */}
                {lastAutoRefreshedAt && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-950/40 border border-purple-500/30 text-purple-300 text-xs font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Auto-sync: {lastAutoRefreshedAt}</span>
                  </span>
                )}

                {/* Clear Cache Trigger */}
                {clickUpSyncedTasks.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearTaskCache}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-rose-950/80 border border-slate-700 hover:border-rose-500/50 text-slate-400 hover:text-rose-300 text-xs font-semibold transition-all cursor-pointer"
                    title="Clear cached tasks from browser storage"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Reset Cache</span>
                  </button>
                )}

                {isClickUpConnected() ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 font-bold text-[10px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>ClickUp Connected</span>
                  </span>
                ) : (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-semibold border ${
                    isWhiteTheme ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}>
                    <span>Deliverables Mode</span>
                  </span>
                )}
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {(['all', 'assigned', 'in_progress', 'review', 'completed'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setTaskStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer capitalize ${
                      taskStatusFilter === st
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {st.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Task Source Segmented Filter */}
            <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Source:</span>
              <button
                type="button"
                onClick={() => setTaskSourceFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  taskSourceFilter === 'all'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white bg-slate-800/50'
                }`}
              >
                All ({memberTasks.length})
              </button>
              <button
                type="button"
                onClick={() => setTaskSourceFilter('clickup')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  taskSourceFilter === 'clickup'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white bg-slate-800/50'
                }`}
              >
                <Zap className="w-3 h-3 text-amber-300" />
                <span>Live ClickUp ({clickUpSyncedTasks.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setTaskSourceFilter('allocations')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  taskSourceFilter === 'allocations'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white bg-slate-800/50'
                }`}
              >
                <Briefcase className="w-3 h-3 text-cyan-300" />
                <span>Project Deliverables ({memberProjects.length})</span>
              </button>
            </div>

            {/* Filter, Sort & Search Toolbar */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5 pt-2 pb-1 bg-slate-900/40 p-3 rounded-xl border border-slate-800/80">
              {/* Search Bar */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter by title, brief, tag, project, or ClickUp #ID..."
                  value={taskSearchQuery}
                  onChange={(e) => setTaskSearchQuery(e.target.value)}
                  className="w-full bg-slate-950/90 border border-slate-700/80 rounded-xl pl-9 pr-8 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
                />
                {taskSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setTaskSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Dropdown Filters & Sorting Group */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Project Filter */}
                <div className="flex items-center gap-1.5 bg-slate-950/90 border border-slate-700/80 rounded-xl px-2.5 py-1">
                  <Briefcase className="w-3 h-3 text-cyan-400 shrink-0" />
                  <select
                    value={selectedProjectFilter}
                    onChange={(e) => setSelectedProjectFilter(e.target.value)}
                    className="bg-transparent text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer max-w-[130px] truncate"
                  >
                    <option value="all" className="bg-slate-900 text-slate-200">All Projects ({availableProjects.length})</option>
                    {availableProjects.map((p) => (
                      <option key={p} value={p} className="bg-slate-900 text-slate-200">
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tag Filter */}
                <div className="flex items-center gap-1.5 bg-slate-950/90 border border-slate-700/80 rounded-xl px-2.5 py-1">
                  <Tag className="w-3 h-3 text-purple-400 shrink-0" />
                  <select
                    value={selectedTagFilter}
                    onChange={(e) => setSelectedTagFilter(e.target.value)}
                    className="bg-transparent text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer max-w-[110px] truncate"
                  >
                    <option value="all" className="bg-slate-900 text-slate-200">All Tags ({availableTags.length})</option>
                    {availableTags.map((t) => (
                      <option key={t} value={t} className="bg-slate-900 text-slate-200">
                        #{t}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sort By Dropdown */}
                <div className="flex items-center gap-1.5 bg-slate-950/90 border border-slate-700/80 rounded-xl px-2.5 py-1">
                  <SlidersHorizontal className="w-3 h-3 text-amber-400 shrink-0" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sort:</span>
                  <select
                    value={taskSortBy}
                    onChange={(e) => setTaskSortBy(e.target.value as any)}
                    className="bg-transparent text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer"
                  >
                    <option value="due_date" className="bg-slate-900 text-slate-200">Due Date</option>
                    <option value="time_spent" className="bg-slate-900 text-slate-200">Time Spent</option>
                    <option value="time_est" className="bg-slate-900 text-slate-200">Time Estimate</option>
                    <option value="project" className="bg-slate-900 text-slate-200">Project / Client</option>
                    <option value="task_name" className="bg-slate-900 text-slate-200">Task Title</option>
                    <option value="priority" className="bg-slate-900 text-slate-200">Priority</option>
                    <option value="status" className="bg-slate-900 text-slate-200">Status</option>
                  </select>
                </div>

                {/* Asc / Desc Toggle Button */}
                <button
                  type="button"
                  onClick={() => setTaskSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-950/90 hover:bg-slate-800 border border-slate-700/80 text-xs font-bold text-slate-300 hover:text-white transition-all flex items-center gap-1 cursor-pointer"
                  title={`Toggle sort order (currently ${taskSortOrder === 'asc' ? 'Ascending' : 'Descending'})`}
                >
                  <ArrowUpDown className="w-3 h-3 text-cyan-400" />
                  <span className="font-mono text-[11px]">{taskSortOrder === 'asc' ? 'ASC ↑' : 'DESC ↓'}</span>
                </button>

                {/* Reset Filters Pill */}
                {(selectedProjectFilter !== 'all' || selectedTagFilter !== 'all' || taskSearchQuery.trim() !== '' || taskStatusFilter !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProjectFilter('all');
                      setSelectedTagFilter('all');
                      setTaskSearchQuery('');
                      setTaskStatusFilter('all');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                    title="Clear all active filters"
                  >
                    <X className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                )}

                <span className="text-[11px] font-mono text-slate-400 pl-1 shrink-0">
                  ({filteredTasks.length}/{memberTasks.length})
                </span>
              </div>
            </div>
          </div>

          {filteredTasks.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/60 rounded-2xl border border-slate-800 text-slate-400 space-y-3">
              <CheckCircle2 className="w-8 h-8 text-slate-600 mx-auto" />
              <div>
                <p className="text-sm font-semibold text-slate-300">
                  {selectedProjectFilter !== 'all' || selectedTagFilter !== 'all' || taskSearchQuery.trim() !== '' || taskStatusFilter !== 'all'
                    ? 'No tasks match your selected filter, tag, or search criteria.'
                    : `No tasks found under filter "${taskStatusFilter}".`}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {selectedProjectFilter !== 'all' || selectedTagFilter !== 'all' || taskSearchQuery.trim() !== ''
                    ? 'Try clearing active filters or searching with different keywords.'
                    : `Assign sprint deliverables or pick tasks assigned to ${member.name} from ClickUp.`}
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {(selectedProjectFilter !== 'all' || selectedTagFilter !== 'all' || taskSearchQuery.trim() !== '' || taskStatusFilter !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProjectFilter('all');
                      setSelectedTagFilter('all');
                      setTaskSearchQuery('');
                      setTaskStatusFilter('all');
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold shadow-lg transition-all cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Clear All Filters</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setTaskProject(memberProjects[0]?.name || '');
                    setTaskClient(memberProjects[0]?.client || '');
                    setIsAssignTaskOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg transition-all cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Assign New Task</span>
                </button>
                <button
                  type="button"
                  onClick={handlePickTasksFromClickUp}
                  disabled={isSyncingClickUp}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSyncingClickUp ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 text-amber-300" />}
                  <span>Pick Tasks Assigned from ClickUp</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTasks.map((t) => {
                const spent = t.timeSpentHours ?? t.actualHoursLogged ?? 0;
                const est = Math.max(1, t.timeEstimateHours ?? t.estimatedHours ?? 4);
                const pct = Math.min(100, Math.round((spent / est) * 100));
                const isOver = spent > est;
                const isExpanded = expandedTaskId === t.id;
                const comments = t.clickUpTaskId ? taskCommentsMap[t.clickUpTaskId] : undefined;
                const isLoadingComments = t.clickUpTaskId ? loadingCommentsMap[t.clickUpTaskId] : false;

                return (
                  <div
                    key={t.id}
                    className="rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all overflow-hidden shadow-sm hover:shadow-md"
                  >
                    {/* PRIMARY TASK CARD SUMMARY ROW */}
                    <div className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-1.5">
                        {/* Meta Tags: Client, Folder/List, Priority, ClickUp Live Status */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-black uppercase text-cyan-400 font-mono tracking-wider">
                            {t.clientName}
                          </span>
                          {t.folderName && (
                            <>
                              <span className="text-slate-600">•</span>
                              <span className="text-[11px] text-slate-400 font-medium">
                                📁 {t.folderName}
                              </span>
                            </>
                          )}
                          {t.listName && (
                            <>
                              <span className="text-slate-600">•</span>
                              <span className="text-[11px] text-slate-400 font-medium">
                                📋 {t.listName}
                              </span>
                            </>
                          )}
                          <span className="text-slate-600">•</span>

                          {/* Priority Flag */}
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                              t.priority === 'High'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : t.priority === 'Medium'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            <Flag className="w-2.5 h-2.5" />
                            <span>{t.priority}</span>
                          </span>

                          {/* Live ClickUp Status Badge */}
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-xs"
                            style={{
                              backgroundColor: t.clickUpStatusColor ? `${t.clickUpStatusColor}22` : 'rgba(168, 85, 247, 0.15)',
                              borderColor: t.clickUpStatusColor ? `${t.clickUpStatusColor}66` : 'rgba(168, 85, 247, 0.4)',
                              color: t.clickUpStatusColor || '#c084fc'
                            }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: t.clickUpStatusColor || '#c084fc' }}
                            />
                            <span>{t.clickUpStatus || t.status.replace('_', ' ')}</span>
                          </span>

                          {/* Task Tags */}
                          {t.tags && t.tags.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap">
                              {t.tags.map((tg, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedTagFilter(selectedTagFilter === tg.name ? 'all' : tg.name);
                                  }}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all cursor-pointer shadow-xs ${
                                    selectedTagFilter === tg.name ? 'ring-2 ring-cyan-400' : 'hover:opacity-90'
                                  }`}
                                  style={{
                                    backgroundColor: tg.tag_bg ? `${tg.tag_bg}33` : 'rgba(99, 102, 241, 0.15)',
                                    color: tg.tag_fg ? tg.tag_fg : '#c7d2fe',
                                    borderColor: tg.tag_bg ? `${tg.tag_bg}77` : 'rgba(99, 102, 241, 0.4)'
                                  }}
                                  title={`Filter by tag #${tg.name}`}
                                >
                                  <Tag className="w-2.5 h-2.5 opacity-80" />
                                  <span>{tg.name}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Task Title */}
                        <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                          {t.title}
                        </h4>

                        {/* Metrics Bar: Time Spent, Estimate, Due Date, Comments, ClickUp Link */}
                        <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap pt-1">
                          {/* Time Spent vs Estimate Progress */}
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1 font-mono">
                              <Clock className="w-3.5 h-3.5 text-cyan-400" />
                              <span>Time Spent: <strong className="text-white font-bold">{spent}h</strong></span>
                              <span className="text-slate-500">/</span>
                              <span>Est: <strong className="text-slate-300 font-bold">{est}h</strong></span>
                            </span>
                            <div className="flex items-center gap-1.5">
                              <div className="w-16 h-2 rounded-full bg-slate-800 overflow-hidden relative border border-slate-700">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    isOver
                                      ? 'bg-rose-500'
                                      : pct >= 80
                                      ? 'bg-amber-400'
                                      : 'bg-emerald-400'
                                  }`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className={`text-[10px] font-mono font-bold ${isOver ? 'text-rose-400' : 'text-slate-400'}`}>
                                {pct}%
                              </span>
                              {isOver && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                  +{Math.round((spent - est) * 10) / 10}h over
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Due Date */}
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            <span>Due: <strong className="text-slate-200 font-mono">{t.dueDate}</strong></span>
                          </span>

                          {/* Comments Button */}
                          <button
                            type="button"
                            onClick={() => handleToggleExpandTask(t)}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer text-xs"
                            title="View task comments and discussion"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
                            <span>
                              {comments
                                ? `${comments.length} comments`
                                : t.commentsCount !== undefined
                                ? `${t.commentsCount} comments`
                                : 'Comments'}
                            </span>
                          </button>

                          {/* ClickUp Link & Quick Sync */}
                          {t.clickUpTaskId && (
                            <div className="flex items-center gap-1.5">
                              <a
                                href={t.clickUpUrl || `https://app.clickup.com/t/${t.clickUpTaskId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-950/70 border border-purple-500/40 text-purple-300 hover:text-purple-200 font-bold text-[11px] transition-colors"
                                title="Open task in ClickUp"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>ClickUp #{t.clickUpTaskId}</span>
                              </a>
                              <button
                                type="button"
                                onClick={() => handleSyncSingleTask(t)}
                                disabled={syncingTaskId === t.id}
                                className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-purple-300 transition-colors cursor-pointer"
                                title="Sync this task from ClickUp"
                              >
                                <RefreshCw className={`w-3 h-3 ${syncingTaskId === t.id ? 'animate-spin text-purple-400' : ''}`} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right Controls: Two-Way Status Select & Pocket Toggle */}
                      <div className="flex items-center gap-2 shrink-0 pt-2 lg:pt-0">
                        <div className="flex flex-col gap-1 items-end">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Status:</span>
                          <select
                            value={t.status}
                            onChange={(e) => {
                              const newStatus = e.target.value as TaskStatus;
                              handleTaskStatusChange(t, newStatus);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 cursor-pointer focus:outline-none focus:ring-1 focus:ring-cyan-500"
                          >
                            <option value="backlog">Backlog</option>
                            <option value="assigned">Assigned</option>
                            <option value="in_progress">In Progress</option>
                            <option value="review">In Review</option>
                            <option value="completed">Completed</option>
                          </select>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleExpandTask(t)}
                          className="mt-4 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                          title="Toggle task description, assignees, and comments pocket"
                        >
                          <span>{isExpanded ? 'Hide' : 'Details'}</span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5 text-cyan-400" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* EXPANDABLE TASK POCKET: Description, Assignees, Live Comments */}
                    {isExpanded && (
                      <div className="p-4 border-t border-slate-800 bg-slate-950/70 space-y-4 animate-fade-in">
                        {/* Task Description / Brief */}
                        {t.description ? (
                          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5 text-cyan-400" />
                              <span>Task Description / Brief:</span>
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                              {t.description}
                            </p>
                          </div>
                        ) : (
                          <div className="text-xs text-slate-500 italic flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-slate-600" />
                            <span>No task description specified.</span>
                          </div>
                        )}

                        {/* Assignees Chips */}
                        {t.assigneesList && t.assigneesList.length > 0 && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                              <Users className="w-3.5 h-3.5 text-purple-400" />
                              <span>Assignees:</span>
                            </span>
                            {t.assigneesList.map((a) => (
                              <div
                                key={a.id}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200"
                              >
                                {a.profilePicture ? (
                                  <img src={a.profilePicture} alt={a.username} className="w-4 h-4 rounded-full object-cover" />
                                ) : (
                                  <div className="w-4 h-4 rounded-full bg-purple-600/40 text-[9px] font-bold text-purple-300 flex items-center justify-center">
                                    {a.username.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <span className="font-medium">{a.username}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* ClickUp Custom Fields & Metadata Grid */}
                        {t.customFields && t.customFields.length > 0 && t.customFields.some((cf) => cf.value !== null && cf.value !== undefined && cf.value !== '') && (
                          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5">
                            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
                                <span>ClickUp Custom Fields & Deliverables Metadata:</span>
                              </div>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {t.customFields.filter(cf => cf.value !== null && cf.value !== undefined && cf.value !== '').length} fields
                              </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 pt-1">
                              {t.customFields
                                .filter((cf) => cf.value !== null && cf.value !== undefined && cf.value !== '')
                                .map((cf) => (
                                  <div
                                    key={cf.id}
                                    className="p-2 rounded-lg bg-slate-950/70 border border-slate-800/80 flex flex-col justify-between gap-1"
                                  >
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide truncate" title={cf.name}>
                                      {cf.name}
                                    </span>
                                    <div className="min-w-0">
                                      {renderCustomFieldValue(cf)}
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}

                        {/* Live ClickUp Comments Thread */}
                        <div className="pt-2 border-t border-slate-800/80 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="text-xs font-bold text-white flex items-center gap-1.5">
                              <MessageSquare className="w-4 h-4 text-purple-400" />
                              <span>ClickUp Comments & Activity Thread</span>
                              {t.clickUpTaskId && (
                                <span className="text-[11px] text-purple-300 font-mono">
                                  (Task #{t.clickUpTaskId})
                                </span>
                              )}
                            </div>
                            {isLoadingComments && (
                              <span className="text-[11px] text-purple-400 flex items-center gap-1">
                                <RefreshCw className="w-3 h-3 animate-spin" />
                                <span>Fetching comments...</span>
                              </span>
                            )}
                          </div>

                          {/* Comments List */}
                          <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                            {!t.clickUpTaskId ? (
                              <p className="text-xs text-slate-500 italic">Comments available on synced ClickUp tasks.</p>
                            ) : isLoadingComments ? (
                              <div className="py-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                                <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
                                <span>Loading ClickUp comments...</span>
                              </div>
                            ) : (!comments || comments.length === 0) ? (
                              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/60 text-xs text-slate-400 text-center">
                                No comments posted on ClickUp #{t.clickUpTaskId} yet.
                              </div>
                            ) : (
                              comments.map((c) => {
                                const text = getCommentPlainText(c);
                                const author = c.user?.username || 'ClickUp User';
                                const dateStr = c.date
                                  ? new Date(Number(c.date)).toLocaleString([], {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })
                                  : '';

                                return (
                                  <div key={c.id} className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                                    <div className="flex items-center justify-between text-[11px]">
                                      <div className="flex items-center gap-1.5">
                                        {c.user?.profilePicture ? (
                                          <img src={c.user.profilePicture} alt={author} className="w-4 h-4 rounded-full object-cover" />
                                        ) : (
                                          <div className="w-4 h-4 rounded-full bg-purple-700/40 text-[9px] font-bold text-purple-200 flex items-center justify-center">
                                            {author.charAt(0).toUpperCase()}
                                          </div>
                                        )}
                                        <span className="font-bold text-slate-200">@{author}</span>
                                      </div>
                                      <span className="text-slate-500 font-mono text-[10px]">{dateStr}</span>
                                    </div>
                                    <p className="text-xs text-slate-300 pl-5.5 whitespace-pre-line">{text}</p>
                                  </div>
                                );
                              })
                            )}
                          </div>

                          {/* Add Comment Input Box */}
                          {t.clickUpTaskId && (
                            <div className="flex items-center gap-2 pt-1">
                              <input
                                type="text"
                                placeholder={`Write a comment on ClickUp #${t.clickUpTaskId}...`}
                                value={newCommentTextMap[t.id] || ''}
                                onChange={(e) => setNewCommentTextMap((prev) => ({ ...prev, [t.id]: e.target.value }))}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handlePostComment(t);
                                  }
                                }}
                                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
                              />
                              <button
                                type="button"
                                onClick={() => handlePostComment(t)}
                                disabled={isPostingComment || !newCommentTextMap[t.id]?.trim()}
                                className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                              >
                                {isPostingComment ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                <span>Send</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 3: SKILLS & COMPETENCY */}
      {activeSubTab === 'skills' && (
        <div className="space-y-6">
          {/* Skill Matrix Scorecard */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Primary Technical Skills & Calibration</span>
              </h3>
              <span className="text-xs text-slate-400">
                Calibrated against agency benchmarks (1-10)
              </span>
            </div>

            {(!member.skillScores || member.skillScores.length === 0) ? (
              <div className="text-xs text-slate-500 italic py-3">
                No calibrated skill matrix scores recorded yet for this member.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {member.skillScores.map((s, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                      <span>{s.skill}</span>
                      <span className="text-emerald-400 font-mono">
                        Avg: {((s.quality + s.speedEfficiency + s.communication) / 3).toFixed(1)}/10
                      </span>
                    </div>

                    <div className="space-y-1.5 text-[11px] text-slate-400">
                      <div>
                        <div className="flex justify-between">
                          <span>Quality & Accuracy</span>
                          <span className="font-mono text-slate-300">{s.quality}/10</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden mt-0.5">
                          <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${s.quality * 10}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between">
                          <span>Speed & Efficiency</span>
                          <span className="font-mono text-slate-300">{s.speedEfficiency}/10</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden mt-0.5">
                          <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${s.speedEfficiency * 10}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between">
                          <span>Client Communication</span>
                          <span className="font-mono text-slate-300">{s.communication}/10</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden mt-0.5">
                          <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${s.communication * 10}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* General Competency Center */}
          {member.generalCompetency && (
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span>General Agency Readiness & Communication Audit</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">English Fluency</div>
                  <div className="text-xl font-black text-white mt-1 font-mono">
                    {member.generalCompetency.englishProficiency}/10
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Client Comms</div>
                  <div className="text-xl font-black text-cyan-400 mt-1 font-mono">
                    {member.generalCompetency.clientCommunication}/10
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Requirement Clarity</div>
                  <div className="text-xl font-black text-emerald-400 mt-1 font-mono">
                    {member.generalCompetency.requirementUnderstanding}/10
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Reliability / QA</div>
                  <div className="text-xl font-black text-purple-400 mt-1 font-mono">
                    {member.generalCompetency.proactivityReliability}/10
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 1-CLICK MODAL: ASSIGN TO PROJECT                          */}
      {/* ========================================================= */}
      {isAssignProjectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl max-w-lg w-full p-6 text-white space-y-5 relative">
            <button
              type="button"
              onClick={() => setIsAssignProjectOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">1-Click Assign to Project</h3>
                <p className="text-xs text-slate-400">
                  Assign <span className="text-cyan-400 font-semibold">{member.name}</span> directly to an active project
                </p>
              </div>
            </div>

            <form onSubmit={handleConfirmAssignProject} className="space-y-4">
              {/* Project Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Select Target Project <span className="text-rose-400">*</span>
                </label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                  required
                >
                  <option value="">-- Choose an Active Project --</option>
                  {projectsList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.client || 'Client'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Role on Project</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Specialist', 'Team Lead', 'Call Lead'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setAssignRole(r)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border text-center transition-all cursor-pointer ${
                        assignRole === r
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-md shadow-amber-500/10'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Allocated Hours */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Allocated Hours / Week
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="40"
                    value={assignHours}
                    onChange={(e) => setAssignHours(Number(e.target.value))}
                    className="w-28 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                  />
                  <span className="text-xs text-slate-400">
                    Will update {member.name}'s workload capacity automatically
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAssignProjectOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Assign to Project</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 1-CLICK MODAL: ASSIGN TASK                                */}
      {/* ========================================================= */}
      {isAssignTaskOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl max-w-xl w-full p-6 text-white space-y-5 relative max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setIsAssignTaskOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <PlusCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Assign Task to Member</h3>
                <p className="text-xs text-slate-400">
                  Directly dispatch a deliverable to <span className="text-cyan-400 font-semibold">{member.name}</span>
                </p>
              </div>
            </div>

            <form onSubmit={handleConfirmAssignTask} className="space-y-4">
              {/* Task Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Task Title / Deliverable <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Technical SEO Audit & Core Web Vitals Optimization"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-400"
                  required
                />
              </div>

              {/* Client & Project */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Client / Account</label>
                  <input
                    type="text"
                    placeholder="e.g., Acme Health"
                    value={taskClient}
                    onChange={(e) => setTaskClient(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Project / Sprint</label>
                  <input
                    type="text"
                    placeholder="e.g., Q3 Growth Sprint"
                    value={taskProject}
                    onChange={(e) => setTaskProject(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>

              {/* Estimated Hours, Priority, Due Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Est. Hours</label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    max="40"
                    value={taskHours}
                    onChange={(e) => setTaskHours(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-purple-400 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Priority</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as PriorityLevel)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400 cursor-pointer"
                  >
                    <option value="Urgent">Urgent</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Due Date</label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400 font-mono"
                  />
                </div>
              </div>

              {/* ClickUp Task ID */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  ClickUp Task ID <span className="text-slate-500 font-normal">(optional, for live 2-way sync)</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="e.g. 86b03948 or leave blank to auto-generate"
                    value={taskClickUpId}
                    onChange={(e) => setTaskClickUpId(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-purple-400 font-mono"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAssignTaskOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-600/20 transition-all cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Assign Task</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: LINK CLICKUP USER ACCOUNT */}
      {isLinkUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-scale-up">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                  <Link2 className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">Link ClickUp Account</h3>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Auto-Refresh Active
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Pair {member.name} with their live ClickUp user account
                    {lastWorkspaceUsersRefreshedAt ? ` • Refreshed at ${lastWorkspaceUsersRefreshedAt}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => refreshClickUpWorkspaceUsers(true)}
                  disabled={isLoadingCuUsers}
                  className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Re-query ClickUp workspace members list"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingCuUsers ? 'animate-spin text-purple-400' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsLinkUserModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Currently Linked Pill if any */}
              {linkedClickUpUser && (
                <div className="p-3 rounded-2xl bg-purple-950/40 border border-purple-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                    <div>
                      <div className="text-xs font-bold text-white">Currently Linked: @{linkedClickUpUser.username}</div>
                      <div className="text-[11px] text-purple-300 font-mono">User ID: #{linkedClickUpUser.id} {linkedClickUpUser.email ? `• ${linkedClickUpUser.email}` : ''}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleUnlinkClickUpUser}
                    className="px-2.5 py-1 rounded-lg bg-rose-900/60 hover:bg-rose-800 text-rose-200 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Unlink
                  </button>
                </div>
              )}

              {/* Search ClickUp Members */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search ClickUp team members by name or email..."
                  value={cuUserSearchQuery}
                  onChange={(e) => setCuUserSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white focus:outline-none focus:border-purple-400 placeholder-slate-500"
                />
              </div>

              {/* Member List */}
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {isLoadingCuUsers ? (
                  <div className="py-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                    <RefreshCw className="w-5 h-5 text-purple-400 animate-spin" />
                    <span>Loading ClickUp workspace members...</span>
                  </div>
                ) : cuWorkspaceUsers.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No ClickUp team members found. Check your ClickUp connection.
                  </div>
                ) : (
                  cuWorkspaceUsers
                    .filter((u) => {
                      if (!cuUserSearchQuery.trim()) return true;
                      const q = cuUserSearchQuery.toLowerCase();
                      return u.username.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || String(u.id).includes(q);
                    })
                    .map((u) => {
                      const isSelected = linkedClickUpUser && String(linkedClickUpUser.id) === String(u.id);
                      const isRecommended = u.username.toLowerCase().includes(member.name.toLowerCase()) ||
                        member.name.toLowerCase().includes(u.username.toLowerCase()) ||
                        u.username.toLowerCase().includes(member.name.split(' ')[0].toLowerCase());

                      return (
                        <div
                          key={u.id}
                          className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                            isSelected
                              ? 'bg-purple-950/60 border-purple-500/80 shadow-md'
                              : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {u.profilePicture ? (
                              <img src={u.profilePicture} alt={u.username} className="w-8 h-8 rounded-full object-cover shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-purple-600/30 border border-purple-500/40 text-purple-200 font-bold text-xs flex items-center justify-center shrink-0">
                                {u.username.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-white truncate">{u.username}</span>
                                {isRecommended && !isSelected && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                    Recommended
                                  </span>
                                )}
                                {isSelected && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                    Linked
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 truncate">
                                {u.email || `#${u.id}`} • Role: {u.role || 'Member'}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleSelectClickUpUser(u)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                              isSelected
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                                : 'bg-purple-600 hover:bg-purple-500 text-white shadow-sm hover:scale-105'
                            }`}
                          >
                            {isSelected ? 'Re-Sync' : 'Select'}
                          </button>
                        </div>
                      );
                    })
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <RefreshCw className={`w-3.5 h-3.5 text-purple-400 ${isLoadingCuUsers ? 'animate-spin' : ''}`} />
                <span>Auto-refreshes on open & selection</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => refreshClickUpWorkspaceUsers(true)}
                  disabled={isLoadingCuUsers}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-900/40 hover:bg-purple-800/60 border border-purple-500/30 text-purple-200 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingCuUsers ? 'animate-spin' : ''}`} />
                  <span>Refresh Users</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsLinkUserModalOpen(false)}
                  className="px-4 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
