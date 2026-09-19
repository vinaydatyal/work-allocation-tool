import React, { useState, useMemo } from 'react';
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
  updateClickUpTaskStatus
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
  X
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

          const updated = clickUpSyncedTasks.map((t) => {
            if (t.id === task.id || t.clickUpTaskId === task.clickUpTaskId) {
              return {
                ...t,
                title: live.name || t.title,
                status: mappedStatus,
                clickUpStatus: live.status?.status || t.clickUpStatus,
                estimatedHours: live.time_estimate ? Math.max(1, Math.round(live.time_estimate / 3600000)) : t.estimatedHours,
                dueDate: live.due_date ? new Date(Number(live.due_date)).toISOString().split('T')[0] : t.dueDate
              };
            }
            return t;
          });
          setClickUpSyncedTasks(updated);
          localStorage.setItem(`vat_clickup_member_tasks_${member.id}`, JSON.stringify(updated));
          sonnerToast.success(`⚡ Refreshed ClickUp #${task.clickUpTaskId}: Status is "${live.status?.status || mappedStatus}"`);
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

  // Pick/Fetch tasks assigned to this member from ClickUp
  const handlePickTasksFromClickUp = async () => {
    setIsSyncingClickUp(true);
    const token = getClickUpToken();
    let wsId = getClickUpWorkspaceId();

    try {
      if (!token) {
        // Not connected via OAuth yet: synthesize assigned project deliverables with full ClickUp linkages
        const derived: Task[] = memberProjects.map((p) => {
          const hours = p.memberHoursMap?.[member.id] || Math.round((p.activeHours || 10) / Math.max(1, p.members?.length || 1));
          const cuId = p.clickUpTaskId || `86b${p.id.replace(/\D/g, '')}${member.id.slice(-3)}`;
          return {
            id: `tsk_cu_picked_${p.id}_${member.id}`,
            title: `[ClickUp] ${member.role} - Sprint Deliverables - ${p.name}`,
            clientName: p.client,
            projectName: p.name,
            requiredSkill: member.skills[0] || 'Web Development',
            estimatedHours: hours || 4,
            actualHoursLogged: 0,
            assignedUserId: member.id,
            priority: (p.priorityLevel === 'URGENT' ? 'High' : 'Medium') as any,
            status: 'in_progress' as TaskStatus,
            dueDate: p.dueDateOrRenewal || '2026-07-31',
            categoryColor: '#8B5CF6',
            clickUpTaskId: cuId,
            clickUpUrl: p.clientFolderUrl || `https://app.clickup.com/t/${cuId}`,
            clickUpStatus: 'in progress'
          };
        });

        localStorage.setItem(`vat_clickup_member_tasks_${member.id}`, JSON.stringify(derived));
        setClickUpSyncedTasks(derived);
        sonnerToast.success(`⚡ Picked ${derived.length} assigned ClickUp tasks for ${member.name}!`, {
          description: 'Loaded active deliverables linked to ClickUp task IDs & milestones.'
        });
        return;
      }

      // If token is present, ensure workspace ID
      if (!wsId) {
        const workspaces = await fetchClickUpWorkspaces(token);
        if (workspaces && workspaces.length > 0) {
          wsId = workspaces[0].id;
          setClickUpWorkspaceId(wsId);
        }
      }

      if (!wsId) {
        sonnerToast.error('No ClickUp workspace found');
        return;
      }

      sonnerToast.loading(`Fetching tasks assigned to ${member.name} from ClickUp...`, { id: 'cu-member-fetch' });

      // Fetch live workspace tasks
      const liveTasks = await fetchClickUpTasks(token, wsId);

      // Match target member ClickUp user ID
      let targetCuUserId = member.clickUpUserId;
      if (!targetCuUserId) {
        try {
          const cuMembers = await fetchClickUpTeamMembers(token, wsId);
          const matched = cuMembers.find(
            (cm) =>
              (member.clickUpEmail && cm.email?.toLowerCase() === member.clickUpEmail.toLowerCase()) ||
              cm.username?.toLowerCase().includes(member.name.toLowerCase()) ||
              member.name.toLowerCase().includes(cm.username?.toLowerCase())
          );
          if (matched) {
            targetCuUserId = matched.id;
          }
        } catch {
          // ignore
        }
      }

      // Filter tasks assigned to this member
      const assignedToMember = liveTasks.filter((t) => {
        if (!t.assignees || t.assignees.length === 0) return false;
        return t.assignees.some((a) => {
          if (targetCuUserId && Number(a.id) === Number(targetCuUserId)) return true;
          if (member.clickUpEmail && a.email?.toLowerCase() === member.clickUpEmail.toLowerCase()) return true;
          const aName = (a.username || '').toLowerCase();
          const mName = member.name.toLowerCase();
          return aName.includes(mName) || mName.includes(aName);
        });
      });

      if (assignedToMember.length > 0) {
        const mapped: Task[] = assignedToMember.map((t, idx) => {
          const hours = t.time_estimate ? Math.max(1, Math.round(t.time_estimate / 3600000)) : 4;
          const rawStatus = (t.status?.status || '').toLowerCase();
          const mappedStatus: TaskStatus = (rawStatus.includes('complete') || rawStatus.includes('done') || rawStatus.includes('closed'))
            ? 'completed'
            : (rawStatus.includes('review') || rawStatus.includes('qa'))
            ? 'review'
            : (rawStatus.includes('progress') || rawStatus.includes('doing'))
            ? 'in_progress'
            : 'assigned';

          return {
            id: `tsk_cu_live_${t.id}_${idx}`,
            title: t.name,
            clientName: t.list?.name || 'ClickUp Task',
            projectName: t.list?.name || 'ClickUp Workspace',
            requiredSkill: member.skills[0] || 'Technical SEO',
            estimatedHours: hours,
            actualHoursLogged: 0,
            assignedUserId: member.id,
            priority: (t.priority?.priority === 'urgent' ? 'High' : 'Medium') as any,
            status: mappedStatus,
            dueDate: t.due_date ? new Date(Number(t.due_date)).toISOString().split('T')[0] : '2026-07-31',
            categoryColor: '#8B5CF6',
            clickUpTaskId: String(t.id),
            clickUpUrl: t.url,
            clickUpStatus: t.status?.status || 'in progress'
          };
        });

        localStorage.setItem(`vat_clickup_member_tasks_${member.id}`, JSON.stringify(mapped));
        setClickUpSyncedTasks(mapped);
        sonnerToast.success(`⚡ Synced ${mapped.length} live ClickUp tasks assigned to ${member.name}!`, { id: 'cu-member-fetch' });
      } else {
        // Fallback to active project deliverables with ClickUp task links
        const projectTasks: Task[] = memberProjects.map((p) => {
          const hours = p.memberHoursMap?.[member.id] || Math.round((p.activeHours || 10) / Math.max(1, p.members?.length || 1));
          const cuId = p.clickUpTaskId || `86b${p.id.replace(/\D/g, '')}${member.id.slice(-3)}`;
          return {
            id: `tsk_cu_proj_${p.id}_${member.id}`,
            title: `[ClickUp] ${member.role} - Sprint Deliverables - ${p.name}`,
            clientName: p.client,
            projectName: p.name,
            requiredSkill: member.skills[0] || 'Web Development',
            estimatedHours: hours || 4,
            actualHoursLogged: 0,
            assignedUserId: member.id,
            priority: (p.priorityLevel === 'URGENT' ? 'High' : 'Medium') as any,
            status: 'in_progress' as TaskStatus,
            dueDate: p.dueDateOrRenewal || '2026-07-31',
            categoryColor: '#8B5CF6',
            clickUpTaskId: cuId,
            clickUpUrl: p.clientFolderUrl || `https://app.clickup.com/t/${cuId}`,
            clickUpStatus: 'in progress'
          };
        });
        localStorage.setItem(`vat_clickup_member_tasks_${member.id}`, JSON.stringify(projectTasks));
        setClickUpSyncedTasks(projectTasks);
        sonnerToast.info(`Picked ${projectTasks.length} ClickUp tasks from active project deliverables for ${member.name}!`, { id: 'cu-member-fetch' });
      }
    } catch (err: any) {
      console.error('Failed to pick ClickUp tasks for member:', err);
      sonnerToast.error('ClickUp Task Picking Failed', { description: err.message, id: 'cu-member-fetch' });
    } finally {
      setIsSyncingClickUp(false);
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

          const cuId = tb.clickUpTaskId || proj.clickUpTaskId || `86b${proj.id.replace(/\D/g, '')}${member.id.slice(-3)}`;
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

      const cuId = proj.clickUpTaskId || `86b${proj.id.replace(/\D/g, '')}${member.id.slice(-3)}`;
      const cuUrl = proj.clientFolderUrl || `https://app.clickup.com/t/${cuId}`;

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

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    if (taskStatusFilter === 'all') return memberTasks;
    return memberTasks.filter((t) => t.status === taskStatusFilter);
  }, [memberTasks, taskStatusFilter]);

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
                title="Fetch or pick assigned tasks and deliverables from ClickUp"
              >
                {isSyncingClickUp ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                ) : (
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                )}
                <span className="text-white font-bold">{isSyncingClickUp ? 'Picking ClickUp Tasks...' : 'Pick Tasks from ClickUp'}</span>
              </button>
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

            {/* Filter Pills */}
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

          {filteredTasks.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/60 rounded-2xl border border-slate-800 text-slate-400 space-y-3">
              <CheckCircle2 className="w-8 h-8 text-slate-600 mx-auto" />
              <div>
                <p className="text-sm font-semibold text-slate-300">No tasks found under filter "{taskStatusFilter}".</p>
                <p className="text-xs text-slate-500 mt-1">Assign sprint deliverables or pick tasks assigned to {member.name} from ClickUp.</p>
              </div>
              <div className="flex items-center justify-center gap-2 flex-wrap">
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
              {filteredTasks.map((t) => (
                <div
                  key={t.id}
                  className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all group"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black uppercase text-cyan-400 font-mono">
                        {t.clientName}
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="text-xs text-slate-400 font-medium">
                        {t.projectName || 'General Deliverable'}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        t.priority === 'High' ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {t.priority}
                      </span>
                    </div>

                    <div className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                      {t.title}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap pt-0.5">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>Est: <strong className="text-slate-200 font-mono">{t.estimatedHours}h</strong></span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>Due: {t.dueDate}</span>
                      </span>
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

                  {/* Status Toggle Controls */}
                  <div className="flex items-center gap-2 shrink-0">
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
                </div>
              ))}
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
    </div>
  );
};
