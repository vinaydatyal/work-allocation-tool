import React from 'react';
import type { Task, TeamMember, TaskStatus, AppUserProfile } from '../types';
import { ArrowRight, CheckCircle2, Clock, ShieldCheck, ExternalLink } from 'lucide-react';
import { toast as sonnerToast } from 'sonner';
import { isClickUpConnected, getClickUpToken, updateClickUpTaskStatus } from '../services/clickupOAuth';

interface SprintKanbanProps {
  tasks: Task[];
  teamMembers: TeamMember[];
  currentProfile: AppUserProfile;
  onUpdateTaskStatus: (taskId: string, newStatus: TaskStatus) => void;
}

const KANBAN_COLUMNS: { key: TaskStatus; label: string; badgeColor: string }[] = [
  { key: 'assigned', label: 'Assigned / Ready', badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
  { key: 'in_progress', label: 'In Progress', badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  { key: 'review', label: 'Quality Review (QA)', badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  { key: 'completed', label: 'Sprint Completed', badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' }
];

export const SprintKanban: React.FC<SprintKanbanProps> = ({
  tasks,
  teamMembers,
  currentProfile,
  onUpdateTaskStatus
}) => {
  const findAssignee = (userId: string | null) => teamMembers.find((m) => m.id === userId);
  const isSEOManager = currentProfile.roleType === 'ADMIN';

  const handleStatusTransition = async (taskId: string, newStatus: TaskStatus) => {
    onUpdateTaskStatus(taskId, newStatus);

    const task = tasks.find(t => t.id === taskId);
    if (isClickUpConnected()) {
      const token = getClickUpToken();
      const rawClickUpId = task?.clickUpTaskId || (taskId.startsWith('cu-') ? taskId.replace(/^cu-(live-)?/, '').split('-')[0] : null);
      if (token && rawClickUpId) {
        try {
          const clickUpStatusMap: Record<TaskStatus, string> = {
            backlog: 'to do',
            assigned: 'to do',
            in_progress: 'in progress',
            review: 'in review',
            completed: 'complete'
          };
          const cuStatus = clickUpStatusMap[newStatus];
          await updateClickUpTaskStatus(token, rawClickUpId, cuStatus);
          sonnerToast.success('⚡ ClickUp Status Synchronized', {
            description: `"${task?.title || 'Task'}" updated to "${cuStatus}" in ClickUp.`
          });
        } catch (err) {
          console.error('Failed to sync status to ClickUp:', err);
          sonnerToast.error('ClickUp Status Sync Failed', {
            description: 'Could not update status in ClickUp. Check connection or permissions.'
          });
        }
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <span>Active Sprint Kanban Board</span>
            <span className="text-xs font-normal px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Workload Execution Tracking
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {isSEOManager
              ? 'SEO Manager Governance: Review deliverables in QA and provide final sign-off to complete sprint items.'
              : 'Coordinator Dispatch Mode: Move tasks through execution to Quality Review awaiting SEO Manager sign-off.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {KANBAN_COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.key);

          return (
            <div
              key={col.key}
              className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between min-h-[420px]"
            >
              <div>
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                  <span className="text-sm font-bold text-white">{col.label}</span>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${col.badgeColor}`}>
                    {colTasks.length}
                  </span>
                </div>

                {/* Column Tasks */}
                <div className="space-y-3">
                  {colTasks.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-500 italic border border-dashed border-slate-800 rounded-xl">
                      No tasks in {col.label}
                    </div>
                  ) : (
                    colTasks.map((task) => {
                      const assignee = findAssignee(task.assignedUserId);
                      const clickUpUrl = task.clickUpUrl || (task.clickUpTaskId ? `https://app.clickup.com/t/${task.clickUpTaskId}` : (task.id.startsWith('cu-') ? `https://app.clickup.com/t/${task.id.replace(/^cu-(live-)?/, '').split('-')[0]}` : null));

                      return (
                        <div
                          key={task.id}
                          className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl p-4 space-y-3 transition-all shadow-sm"
                        >
                          <div>
                            <div className="flex items-center justify-between text-[10px] mb-1">
                              <span className="text-slate-400 font-semibold uppercase">{task.clientName}</span>
                              <div className="flex items-center gap-1.5">
                                {clickUpUrl && (
                                  <a
                                    href={clickUpUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    title="Open task in ClickUp"
                                    className="px-1.5 py-0.5 rounded bg-purple-950/80 hover:bg-purple-900 text-purple-300 hover:text-purple-100 border border-purple-800/60 text-[10px] font-bold flex items-center gap-0.5 transition-colors cursor-pointer"
                                  >
                                    <span>CU</span>
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                )}
                                <span
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: task.categoryColor }}
                                />
                              </div>
                            </div>
                            <h4 className="text-sm font-bold text-white leading-snug">{task.title}</h4>
                          </div>

                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-emerald-300 font-medium text-[10px]">
                              {task.requiredSkill}
                            </span>
                            <span className="flex items-center gap-1 text-[11px]">
                              <Clock className="w-3 h-3 text-slate-500" />
                              <span>{task.estimatedHours}h</span>
                            </span>
                          </div>

                          {assignee && (
                            <div className="pt-2 border-t border-slate-900 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <img
                                  src={assignee.avatar}
                                  alt={assignee.name}
                                  className="w-6 h-6 rounded-full object-cover"
                                />
                                <span className="text-xs font-semibold text-slate-200">{assignee.name}</span>
                              </div>

                              {/* Status progression button with Role Capability checks */}
                              <div className="flex items-center gap-1">
                                {col.key === 'assigned' && (
                                  <button
                                    onClick={() => handleStatusTransition(task.id, 'in_progress')}
                                    className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 font-bold text-[10px] flex items-center gap-1 transition-all cursor-pointer"
                                    title="Start execution"
                                  >
                                    <span>Start</span>
                                    <ArrowRight className="w-3 h-3" />
                                  </button>
                                )}

                                {col.key === 'in_progress' && (
                                  <button
                                    onClick={() => handleStatusTransition(task.id, 'review')}
                                    className="px-2 py-1 rounded bg-purple-500/20 hover:bg-purple-500 text-purple-300 hover:text-slate-950 font-bold text-[10px] flex items-center gap-1 transition-all cursor-pointer"
                                    title="Send for SEO Manager QA"
                                  >
                                    <span>To QA</span>
                                    <ArrowRight className="w-3 h-3" />
                                  </button>
                                )}

                                {col.key === 'review' && (
                                  isSEOManager ? (
                                    <button
                                      onClick={() => handleStatusTransition(task.id, 'completed')}
                                      className="px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[10px] flex items-center gap-1 transition-all cursor-pointer shadow-md"
                                      title="SEO Manager Final QA Sign-Off"
                                    >
                                      <CheckCircle2 className="w-3 h-3" />
                                      <span>QA Approve</span>
                                    </button>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded bg-purple-950/40 border border-purple-500/30 text-purple-300 text-[9px] font-semibold flex items-center gap-1">
                                      <ShieldCheck className="w-3 h-3" />
                                      <span>Pending SEO Lead QA</span>
                                    </span>
                                  )
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
