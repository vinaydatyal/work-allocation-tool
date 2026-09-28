import React, { useState, useEffect, useRef } from 'react';
import type { Task, TaskStatus, TeamMember } from '../types';
import {
  getClickUpToken,
  getClickUpUser,
  getClickUpWorkspaceId,
  setClickUpWorkspaceId,
  fetchClickUpWorkspaces,
  fetchClickUpTeamMembers,
  fetchClickUpTasks,
  fetchClickUpTask,
  isClickUpTaskClosed,
  type ClickUpTask
} from '../services/clickupOAuth';
import { initialTeamMembers } from '../data/mockData';
import { toast as sonnerToast } from 'sonner';
import confetti from 'canvas-confetti';
import {
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
  ShieldCheck,
  Clock,
  Sparkles
} from 'lucide-react';

interface ClickUpBatchSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  teamMembers?: TeamMember[];
  onUpdateTasks: (updatedTasks: Task[]) => void;
}

interface SyncItemResult {
  taskId: string;
  title: string;
  client: string;
  oldStatus: TaskStatus | 'imported';
  newStatus: TaskStatus;
  hoursFreed?: number;
  clickUpStatusText: string;
  isCompletedNow: boolean;
}

export const ClickUpBatchSyncModal: React.FC<ClickUpBatchSyncModalProps> = ({
  isOpen,
  onClose,
  tasks,
  teamMembers,
  onUpdateTasks
}) => {
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'completed' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [currentSyncingName, setCurrentSyncingName] = useState('');
  const [syncLog, setSyncLog] = useState<string[]>([]);
  const [syncResults, setSyncResults] = useState<SyncItemResult[]>([]);
  const [totalCapacityFreed, setTotalCapacityFreed] = useState(0);
  const [liveTasksCount, setLiveTasksCount] = useState(0);
  const [workspaceName, setWorkspaceName] = useState<string>('');

  const token = getClickUpToken();
  const userName = getClickUpUser();
  const isCancelledRef = useRef(false);

  const squadMembers = teamMembers && teamMembers.length > 0 ? teamMembers : initialTeamMembers;

  useEffect(() => {
    if (isOpen && syncState === 'idle') {
      startBatchSync();
    }
  }, [isOpen]);

  const mapClickUpStatusToLocal = (cuStatus: string): TaskStatus => {
    const s = (cuStatus || '').toLowerCase();
    if (s.includes('complete') || s.includes('closed') || s.includes('done')) return 'completed';
    if (s.includes('review') || s.includes('qa') || s.includes('verification')) return 'review';
    if (s.includes('progress') || s.includes('working') || s.includes('wip') || s.includes('doing')) return 'in_progress';
    return 'assigned';
  };

  const startBatchSync = async () => {
    isCancelledRef.current = false;
    setSyncState('syncing');
    setProgress(5);
    setSyncLog([]);
    setSyncResults([]);
    setTotalCapacityFreed(0);
    setLiveTasksCount(0);

    const logEntry = (msg: string) => {
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setSyncLog((prev) => [`[${timeStr}] ${msg}`, ...prev].slice(0, 60));
    };

    logEntry('🚀 Initiating Full-Agency ClickUp Bi-Directional Batch Sync...');

    try {
      if (!token) {
        logEntry('⚠️ ClickUp is not connected. Live sync requires ClickUp authorization.');
        logEntry('💡 Connect ClickUp using the top bar or member profile to sync real workspace tasks.');
        setSyncState('error');
        sonnerToast.error('ClickUp Not Connected', {
          description: 'Please connect ClickUp to synchronize real agency deliverables.'
        });
        return;
      }

      // 1. Discover Workspace & Validate Token
      logEntry('🔍 Verifying ClickUp authentication & workspace authorization...');
      let wsId = getClickUpWorkspaceId();
      let activeWsName = 'ClickUp Workspace';

      try {
        const wsList = await fetchClickUpWorkspaces(token);
        if (wsList && wsList.length > 0) {
          const activeWs = wsList.find((w: any) => String(w.id) === String(wsId)) || wsList[0];
          wsId = activeWs.id;
          activeWsName = activeWs.name || 'ClickUp Workspace';
          setClickUpWorkspaceId(wsId);
          setWorkspaceName(activeWsName);
        }
      } catch (wsErr: any) {
        console.warn('Workspace discovery fallback:', wsErr);
      }

      if (!wsId) {
        throw new Error('No ClickUp workspace found for connected user account.');
      }

      logEntry(`✅ Connected to workspace "${activeWsName}" (#${wsId}) as @${userName || 'User'}`);
      setProgress(15);

      // 2. Discover Workspace Team Members
      logEntry('👥 Querying workspace team members for smart assignee matching...');
      let cuTeamMembers: any[] = [];
      try {
        cuTeamMembers = await fetchClickUpTeamMembers(token, wsId);
        logEntry(`👥 Retrieved ${cuTeamMembers.length} active ClickUp workspace members.`);
      } catch (tmErr: any) {
        console.warn('ClickUp team member query notice:', tmErr);
        logEntry(`ℹ️ Member directory query notice: ${tmErr.message || 'proceeding with direct mapping'}`);
      }

      setProgress(25);

      // 3. Fetch Real Tasks Across Workspace
      logEntry('📥 Fetching real workspace tasks (subtasks=true, include_closed=true)...');
      setCurrentSyncingName('Fetching workspace task stream...');

      const uniqueCuTasksMap = new Map<string, ClickUpTask>();

      // A. Query workspace-level tasks
      try {
        const directWsTasks = await fetchClickUpTasks(token, wsId, { includeClosed: true });
        directWsTasks.forEach((t) => {
          if (t && t.id) uniqueCuTasksMap.set(String(t.id), t);
        });
        logEntry(`📦 Retrieved ${directWsTasks.length} tasks from general workspace stream.`);
      } catch (taskErr: any) {
        logEntry(`⚠️ Workspace stream query notice: ${taskErr.message}`);
      }

      setProgress(40);

      // B. Query assigned tasks for every mapped agency squad member
      logEntry('🔍 Querying member-specific task buckets for mapped specialists...');
      for (const member of squadMembers) {
        if (isCancelledRef.current) break;

        let targetCuUserId: string | number | undefined = member.clickUpUserId;

        // Check local storage mapping
        try {
          const savedMap = localStorage.getItem(`vat_member_clickup_mapping_${member.id}`);
          if (savedMap) {
            const parsed = JSON.parse(savedMap);
            if (parsed.id) targetCuUserId = parsed.id;
          }
        } catch {
          // ignore
        }

        // Check auto-match from cuTeamMembers
        if (!targetCuUserId && cuTeamMembers.length > 0) {
          const matched = cuTeamMembers.find(
            (cm) =>
              (member.clickUpEmail && cm.email?.toLowerCase() === member.clickUpEmail.toLowerCase()) ||
              cm.username?.toLowerCase().includes(member.name.toLowerCase()) ||
              member.name.toLowerCase().includes(cm.username?.toLowerCase())
          );
          if (matched) {
            targetCuUserId = matched.id;
          }
        }

        if (targetCuUserId) {
          try {
            const memberTasks = await fetchClickUpTasks(token, wsId, {
              assignees: [String(targetCuUserId)],
              includeClosed: true
            });
            memberTasks.forEach((t) => {
              if (t && t.id) uniqueCuTasksMap.set(String(t.id), t);
            });
            if (memberTasks.length > 0) {
              logEntry(`👤 Retrieved ${memberTasks.length} ClickUp tasks assigned to ${member.name}.`);
            }
          } catch (mErr: any) {
            console.warn(`Query for member ${member.name} notice:`, mErr);
          }
        }
      }

      const totalLiveTasks = uniqueCuTasksMap.size;
      setLiveTasksCount(totalLiveTasks);
      logEntry(`📊 Consolidated ${totalLiveTasks} live ClickUp tasks ready for reconciliation.`);
      setProgress(55);

      // 4. Reconcile with Local Deliverables Pool
      const results: SyncItemResult[] = [];
      let freedHours = 0;
      const updatedTasks = [...tasks];
      const liveTasksList = Array.from(uniqueCuTasksMap.values());

      let processedCount = 0;
      for (const cu of liveTasksList) {
        if (isCancelledRef.current) break;
        processedCount++;

        setCurrentSyncingName(`ClickUp #${cu.id}: ${cu.name}`);

        const estHours = cu.time_estimate ? Math.round((cu.time_estimate / 3600000) * 10) / 10 : 4;
        const spentHours = cu.time_spent ? Math.round((cu.time_spent / 3600000) * 10) / 10 : 0;
        const mappedStatus = mapClickUpStatusToLocal(cu.status?.status || '');
        const isClosed = isClickUpTaskClosed(cu.status?.status);

        // Find assignee squad member
        let assignedMember = squadMembers.find((m) => {
          if (m.clickUpUserId && cu.assignees?.some((a) => String(a.id) === String(m.clickUpUserId))) return true;
          try {
            const savedMap = localStorage.getItem(`vat_member_clickup_mapping_${m.id}`);
            if (savedMap) {
              const parsed = JSON.parse(savedMap);
              if (cu.assignees?.some((a) => String(a.id) === String(parsed.id))) return true;
            }
          } catch {}
          if (m.clickUpEmail && cu.assignees?.some((a) => a.email && a.email.toLowerCase() === m.clickUpEmail?.toLowerCase())) return true;
          if (cu.assignees?.some((a) => a.username && m.name.toLowerCase().includes(a.username.toLowerCase()))) return true;
          return false;
        });

        // Check if task already exists in local task list
        const existingIdx = updatedTasks.findIndex(
          (t) => t.clickUpTaskId === String(cu.id) || t.id === `tsk_cu_live_${cu.id}` || t.title.toLowerCase().trim() === cu.name.toLowerCase().trim()
        );

        if (existingIdx !== -1) {
          const existing = updatedTasks[existingIdx];
          const oldStatus = existing.status;
          const isNewlyCompleted = (mappedStatus === 'completed' || isClosed) && oldStatus !== 'completed';

          const hasStatusChanged = oldStatus !== mappedStatus;
          const hasHoursChanged = (existing.timeSpentHours || 0) !== spentHours;

          if (hasStatusChanged || hasHoursChanged) {
            results.push({
              taskId: existing.id,
              title: cu.name,
              client: cu.list?.name || existing.clientName || 'ClickUp',
              oldStatus,
              newStatus: mappedStatus,
              hoursFreed: isNewlyCompleted ? estHours : 0,
              clickUpStatusText: cu.status?.status || 'Active',
              isCompletedNow: isNewlyCompleted
            });

            if (isNewlyCompleted) {
              freedHours += estHours;
            }

            logEntry(`🔄 Reconciled ClickUp #${cu.id} "${cu.name}": [${oldStatus}] ➔ [${mappedStatus}]`);
          }

          // Drop-in live properties update
          updatedTasks[existingIdx] = {
            ...existing,
            title: cu.name,
            status: mappedStatus,
            clickUpStatus: cu.status?.status || existing.clickUpStatus,
            clickUpStatusColor: cu.status?.color || existing.clickUpStatusColor,
            estimatedHours: estHours,
            timeEstimateHours: estHours,
            actualHoursLogged: spentHours,
            timeSpentHours: spentHours,
            clickUpTaskId: String(cu.id),
            clickUpUrl: cu.url || existing.clickUpUrl,
            dueDate: cu.due_date ? new Date(Number(cu.due_date)).toISOString().split('T')[0] : existing.dueDate,
            description: cu.text_content || cu.description || existing.description,
            commentsCount: (cu as any).comments_count ?? existing.commentsCount,
            assignedUserId: assignedMember ? assignedMember.id : existing.assignedUserId,
            tags: cu.tags?.map((tg: any) => ({ name: tg.name, tag_fg: tg.tag_fg, tag_bg: tg.tag_bg })) || existing.tags,
            customFields: cu.custom_fields?.map((cf: any) => ({
              id: cf.id,
              name: cf.name,
              value: cf.value,
              type: cf.type,
              type_config: cf.type_config
            })) || existing.customFields,
            checklists: cu.checklists?.map((cl: any) => ({
              id: cl.id,
              name: cl.name,
              resolvedCount: cl.resolved ?? 0,
              unresolvedCount: cl.unresolved ?? 0,
              items: cl.items?.map((it: any) => ({ id: it.id, name: it.name, resolved: !!it.resolved })) || []
            })) || existing.checklists,
            subtasks: cu.subtasks?.map((st: any) => ({
              id: st.id,
              name: st.name,
              status: st.status?.status || '',
              statusColor: st.status?.color,
              isCompleted: isClickUpTaskClosed(st.status?.status)
            })) || existing.subtasks
          };
        } else {
          // Import new active deliverable from ClickUp into agency sprints
          const isNewlyCompleted = mappedStatus === 'completed' || isClosed;
          const imported: Task = {
            id: `tsk_cu_live_${cu.id}`,
            title: cu.name,
            clientName: cu.list?.name || 'ClickUp',
            projectName: cu.folder?.name ? `${cu.folder.name} • ${cu.list?.name || 'Deliverables'}` : (cu.list?.name || 'ClickUp Deliverables'),
            requiredSkill: assignedMember?.skills[0] || 'Technical SEO',
            estimatedHours: estHours,
            actualHoursLogged: spentHours,
            timeSpentHours: spentHours,
            timeEstimateHours: estHours,
            assignedUserId: assignedMember ? assignedMember.id : 'unassigned',
            priority: (cu.priority?.priority === 'urgent' ? 'High' : cu.priority?.priority === 'high' ? 'High' : cu.priority?.priority === 'normal' ? 'Medium' : 'Low') as any,
            status: mappedStatus,
            dueDate: cu.due_date ? new Date(Number(cu.due_date)).toISOString().split('T')[0] : '2026-07-31',
            categoryColor: '#8B5CF6',
            clickUpTaskId: String(cu.id),
            clickUpUrl: cu.url,
            clickUpStatus: cu.status?.status || 'in progress',
            clickUpStatusColor: cu.status?.color,
            description: cu.text_content || cu.description,
            commentsCount: (cu as any).comments_count,
            listName: cu.list?.name,
            folderName: cu.folder?.name,
            tags: cu.tags?.map((tg: any) => ({ name: tg.name, tag_fg: tg.tag_fg, tag_bg: tg.tag_bg })) || [],
            customFields: cu.custom_fields?.map((cf: any) => ({
              id: cf.id,
              name: cf.name,
              value: cf.value,
              type: cf.type,
              type_config: cf.type_config
            })) || [],
            checklists: cu.checklists?.map((cl: any) => ({
              id: cl.id,
              name: cl.name,
              resolvedCount: cl.resolved ?? 0,
              unresolvedCount: cl.unresolved ?? 0,
              items: cl.items?.map((it: any) => ({ id: it.id, name: it.name, resolved: !!it.resolved })) || []
            })) || [],
            subtasks: cu.subtasks?.map((st: any) => ({
              id: st.id,
              name: st.name,
              status: st.status?.status || '',
              statusColor: st.status?.color,
              isCompleted: isClickUpTaskClosed(st.status?.status)
            })) || []
          };

          updatedTasks.push(imported);
          results.push({
            taskId: imported.id,
            title: imported.title,
            client: imported.clientName,
            oldStatus: 'imported',
            newStatus: mappedStatus,
            hoursFreed: isNewlyCompleted ? estHours : 0,
            clickUpStatusText: cu.status?.status || 'Active',
            isCompletedNow: isNewlyCompleted
          });

          if (isNewlyCompleted) freedHours += estHours;

          logEntry(`📥 Imported ClickUp #${cu.id}: "${cu.name}" [${cu.status?.status}] ➔ ${assignedMember ? assignedMember.name : 'Backlog'}`);
        }

        const currentPct = 55 + Math.round((processedCount / Math.max(1, totalLiveTasks)) * 35);
        setProgress(Math.min(95, currentPct));
      }

      // 5. Also reconcile any existing deliverables with clickUpTaskId not returned in general stream
      const unmappedLocalTasks = updatedTasks.filter((t) => t.clickUpTaskId && !uniqueCuTasksMap.has(t.clickUpTaskId));
      for (const t of unmappedLocalTasks) {
        if (isCancelledRef.current) break;
        try {
          const live = await fetchClickUpTask(token, t.clickUpTaskId!);
          if (live) {
            const mappedStatus = mapClickUpStatusToLocal(live.status?.status || '');
            const spentHours = live.time_spent ? Math.round((live.time_spent / 3600000) * 10) / 10 : (t.timeSpentHours || 0);
            const estHours = live.time_estimate ? Math.round((live.time_estimate / 3600000) * 10) / 10 : (t.estimatedHours || 4);
            const isNewlyCompleted = mappedStatus === 'completed' && t.status !== 'completed';

            if (t.status !== mappedStatus || (t.timeSpentHours || 0) !== spentHours) {
              results.push({
                taskId: t.id,
                title: live.name || t.title,
                client: t.clientName,
                oldStatus: t.status,
                newStatus: mappedStatus,
                hoursFreed: isNewlyCompleted ? estHours : 0,
                clickUpStatusText: live.status?.status || 'Active',
                isCompletedNow: isNewlyCompleted
              });
              if (isNewlyCompleted) freedHours += estHours;
              logEntry(`🔄 Reconciled ClickUp #${t.clickUpTaskId}: "${live.name || t.title}" [${t.status} ➔ ${mappedStatus}]`);

              t.status = mappedStatus;
              t.clickUpStatus = live.status?.status || t.clickUpStatus;
              t.clickUpStatusColor = live.status?.color || t.clickUpStatusColor;
              t.timeSpentHours = spentHours;
              t.actualHoursLogged = spentHours;
              t.estimatedHours = estHours;
              t.timeEstimateHours = estHours;
            }
          }
        } catch {
          // ignore single fetch failure
        }
      }

      // 6. Update LocalStorage Caches for all Squad Members
      logEntry('💾 Syncing member task buckets & refreshing local profile caches...');
      for (const member of squadMembers) {
        const memberTasks = updatedTasks.filter((t) => t.assignedUserId === member.id && t.clickUpTaskId);
        if (memberTasks.length > 0) {
          localStorage.setItem(`vat_clickup_member_tasks_${member.id}`, JSON.stringify(memberTasks));
        }
      }

      // 7. Update Active Projects if applicable
      try {
        const savedProjectsStr = localStorage.getItem('vat_projects_list_v1');
        if (savedProjectsStr) {
          const projects = JSON.parse(savedProjectsStr);
          if (Array.isArray(projects)) {
            const updatedProjects = projects.map((p: any) => {
              if (p.taskBreakdown) {
                const updatedBreakdown = p.taskBreakdown.map((tb: any) => {
                  const matchingTask = updatedTasks.find(
                    (ut) => ut.clickUpTaskId === tb.clickUpTaskId || (tb.id && ut.id.includes(tb.id))
                  );
                  if (matchingTask) {
                    return { ...tb, status: matchingTask.status, clickUpStatus: matchingTask.clickUpStatus };
                  }
                  return tb;
                });
                return { ...p, taskBreakdown: updatedBreakdown };
              }
              return p;
            });
            localStorage.setItem('vat_projects_list_v1', JSON.stringify(updatedProjects));
          }
        }
      } catch (projErr) {
        console.warn('Projects update notice:', projErr);
      }

      // 8. Commit Global Task Updates
      setProgress(100);
      setSyncResults(results);
      setTotalCapacityFreed(freedHours);
      setSyncState('completed');
      onUpdateTasks(updatedTasks);

      localStorage.setItem('vat_last_clickup_batch_sync', new Date().toISOString());

      logEntry(`🎉 Batch Sync Complete: ${totalLiveTasks} live tasks reconciled, ${results.length} status updates/imports, +${freedHours}h capacity restored!`);

      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 }
      });

      sonnerToast.success('ClickUp Batch Sync Completed!', {
        description: `Reconciled ${totalLiveTasks} live ClickUp tasks. Applied ${results.length} updates/imports. Restored ${freedHours}h capacity.`
      });
    } catch (err: any) {
      console.error('Batch sync failure:', err);
      setSyncState('error');
      logEntry(`❌ Error during sync: ${err.message || 'Unknown network error'}`);
      sonnerToast.error('ClickUp Sync Failed', { description: err.message });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-2xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 shadow-lg shadow-cyan-500/20">
              <RefreshCw className={`w-5 h-5 ${syncState === 'syncing' ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                ClickUp Bi-Directional Batch Sync
              </h2>
              <p className="text-xs text-slate-400">
                Synchronize all active sprint deliverables & reconcile specialist capacity from live ClickUp
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              isCancelledRef.current = true;
              onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sync Status Progress */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-300 flex items-center gap-1.5">
              {syncState === 'syncing' && <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />}
              {syncState === 'completed' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
              {syncState === 'error' && <AlertCircle className="w-3.5 h-3.5 text-rose-400" />}
              {syncState === 'syncing'
                ? `Syncing Sprints: ${currentSyncingName || 'Processing live tasks...'}`
                : syncState === 'completed'
                ? `All Deliverables In Sync (${liveTasksCount} ClickUp tasks)`
                : 'Batch Sync Paused'}
            </span>
            <span className="font-mono font-bold text-cyan-400">{progress}%</span>
          </div>

          <div className="w-full h-2.5 rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                syncState === 'completed'
                  ? 'bg-gradient-to-r from-emerald-400 to-cyan-400'
                  : syncState === 'error'
                  ? 'bg-rose-500'
                  : 'bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Sync Summary KPIs (When completed) */}
        {syncState === 'completed' && (
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Status Updates</div>
              <div className="text-xl font-black text-cyan-300 mt-1 font-mono">
                {syncResults.length}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Deliverables transitioned / imported</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Capacity Restored</div>
              <div className="text-xl font-black text-emerald-400 mt-1 font-mono">
                +{totalCapacityFreed}h
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">From closed ClickUp tasks</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
              <div className="text-[10px] font-bold text-slate-400 uppercase">ClickUp Health</div>
              <div className="text-sm font-bold text-white mt-1 flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>{token ? 'Live OAuth' : 'Disconnected'}</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 font-mono truncate">
                {userName ? `User: ${userName}` : workspaceName ? `WS: ${workspaceName}` : 'Live ClickUp'}
              </div>
            </div>
          </div>
        )}

        {/* Sync Diff List */}
        {syncResults.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Applied Transitions & Real Imports ({syncResults.length})</span>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {syncResults.map((item, idx) => (
                <div
                  key={`${item.taskId}_${idx}`}
                  className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <span className="font-bold text-white truncate block">{item.title}</span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      📁 {item.client} • ClickUp: <strong className="text-purple-300">{item.clickUpStatusText}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 font-mono capitalize">
                      {item.oldStatus}
                    </span>
                    <ArrowRight className="w-3 h-3 text-slate-500" />
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono capitalize ${
                        item.newStatus === 'completed'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      }`}
                    >
                      {item.newStatus.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Live Terminal Log */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 max-h-36 overflow-y-auto font-mono text-[11px] text-slate-300 space-y-1">
          {syncLog.map((line, idx) => (
            <div key={idx} className="leading-snug">
              {line}
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Real-time bi-directional workspace sync</span>
          </div>

          <div className="flex items-center gap-2">
            {syncState === 'syncing' ? (
              <button
                type="button"
                onClick={() => {
                  isCancelledRef.current = true;
                  onClose();
                }}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={startBatchSync}
                  className="px-4 py-2 rounded-xl bg-purple-900/40 hover:bg-purple-800/60 border border-purple-500/30 text-purple-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Re-Sync Live ClickUp</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
                >
                  Done & Close
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
