import React, { useState, useMemo } from 'react';
import type { TeamMember, Task, PriorityLevel, TaskStatus } from '../types';
import type { ActiveProjectItem } from './VisualAgencyHub';
import { calculateMemberAllocatedHours } from '../utils/matchingEngine';
import { calculateAgencyOverallFinancials, getMemberCostPerHour } from '../utils/projectFinancials';
import { navigate } from '../utils/router';
import { toast as sonnerToast } from 'sonner';
import confetti from 'canvas-confetti';
import {
  Zap,
  Users,
  CheckCircle2,
  Clock,
  Briefcase,
  AlertTriangle,
  Sparkles,
  Download,
  Plus,
  X,
  ShieldCheck,
  BarChart3,
  Flame,
  RefreshCw
} from 'lucide-react';

interface MondayAllocationWarRoomProps {
  teamMembers: TeamMember[];
  tasks: Task[];
  onDispatchTask: (taskId: string, memberId: string) => void;
  onAddTask: (newTask: Task) => void;
  onUpdateTaskStatus?: (taskId: string, newStatus: TaskStatus) => void;
  isWhiteTheme?: boolean;
  projects?: ActiveProjectItem[];
  onOpenBatchSync?: () => void;
}

export const MondayAllocationWarRoom: React.FC<MondayAllocationWarRoomProps> = ({
  teamMembers,
  tasks,
  onDispatchTask,
  onAddTask,
  onUpdateTaskStatus,
  isWhiteTheme: _isWhiteTheme = false,
  projects = [],
  onOpenBatchSync
}) => {
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [taskFilterSkill, setTaskFilterSkill] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  // Quick Add Task Form State
  const [newTitle, setNewTitle] = useState('');
  const [newClient, setNewClient] = useState('');
  const [newSkill, setNewSkill] = useState('Technical SEO');
  const [newHours, setNewHours] = useState(4);
  const [newPriority, setNewPriority] = useState<PriorityLevel>('High');

  // Agency Overall Financials & Blended Margin (Idea 6)
  const agencyFinancials = useMemo(() => {
    return calculateAgencyOverallFinancials(projects, teamMembers);
  }, [projects, teamMembers]);

  // Derive unassigned tasks (backlog)
  const unassignedTasks = useMemo(() => {
    return tasks.filter(
      (t) =>
        !t.assignedUserId ||
        t.status === 'backlog' ||
        teamMembers.every((m) => m.id !== t.assignedUserId)
    );
  }, [tasks, teamMembers]);

  // Derive count of deliverables with impending SLA risk (<48h)
  const atRiskCount = useMemo(() => {
    const now = Date.now();
    return tasks.filter((t) => {
      if (t.status === 'completed') return false;
      const due = t.dueDate ? new Date(t.dueDate).getTime() : now + 24 * 3600000;
      const diffHours = (due - now) / 3600000;
      const est = Number(t.estimatedHours) || 1;
      const log = Number(t.actualHoursLogged) || 0;
      return diffHours <= 48 && (log / est) < 0.5;
    }).length;
  }, [tasks]);

  // Aggregate Agency Capacity Metrics
  const totalCapacityHours = useMemo(() => {
    return teamMembers.reduce((sum, m) => sum + m.weeklyCapacityHours, 0);
  }, [teamMembers]);

  const totalAllocatedHours = useMemo(() => {
    return teamMembers.reduce(
      (sum, m) => sum + calculateMemberAllocatedHours(m.id, tasks),
      0
    );
  }, [teamMembers, tasks]);

  const agencyUtilizationPercent = totalCapacityHours > 0
    ? Math.round((totalAllocatedHours / totalCapacityHours) * 100)
    : 0;

  const overloadedMembers = useMemo(() => {
    return teamMembers.filter((m) => {
      const allocated = calculateMemberAllocatedHours(m.id, tasks);
      return allocated > m.weeklyCapacityHours;
    });
  }, [teamMembers, tasks]);

  // Filtered Team Members by Department & Search
  const filteredMembers = useMemo(() => {
    return teamMembers.filter((m) => {
      const matchDept = selectedDept === 'all' || m.department === selectedDept;
      const matchSearch =
        !searchFilter ||
        m.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        m.role.toLowerCase().includes(searchFilter.toLowerCase()) ||
        m.skills.some((s) => s.toLowerCase().includes(searchFilter.toLowerCase()));
      return matchDept && matchSearch;
    });
  }, [teamMembers, selectedDept, searchFilter]);

  // Filtered Unassigned Tasks
  const filteredUnassignedTasks = useMemo(() => {
    return unassignedTasks.filter((t) => {
      const matchSkill = taskFilterSkill === 'all' || t.requiredSkill === taskFilterSkill;
      return matchSkill;
    });
  }, [unassignedTasks, taskFilterSkill]);

  // Top recommendation candidate for an unassigned task (Idea 5: margin-aware matching)
  const getTopCandidateForTask = (task: Task) => {
    const qualified = teamMembers
      .filter((m) => m.skills.includes(task.requiredSkill))
      .map((m) => {
        const allocated = calculateMemberAllocatedHours(m.id, tasks);
        const freeHours = m.weeklyCapacityHours - allocated;
        const costRate = getMemberCostPerHour(m);
        return { member: m, allocated, freeHours, costRate };
      })
      .sort((a, b) => {
        if (b.freeHours !== a.freeHours) return b.freeHours - a.freeHours;
        return a.costRate - b.costRate;
      });

    return qualified[0] || null;
  };

  // 1-Click Fast Assign
  const handleQuickAssign = (taskId: string, memberId: string) => {
    const targetMember = teamMembers.find((m) => m.id === memberId);
    const targetTask = tasks.find((t) => t.id === taskId);
    if (!targetMember || !targetTask) return;

    onDispatchTask(taskId, memberId);
    sonnerToast.success(`⚡ Assigned to ${targetMember.name}!`, {
      description: `"${targetTask.title}" (${targetTask.estimatedHours}h allocated)`
    });
  };

  // Unassign / Move back to backlog
  const handleUnassignTask = (taskId: string) => {
    const targetTask = tasks.find((t) => t.id === taskId);
    if (!targetTask) return;
    onDispatchTask(taskId, '');
    if (onUpdateTaskStatus) {
      onUpdateTaskStatus(taskId, 'backlog');
    }
    sonnerToast.info(`Moved "${targetTask.title}" back to Monday backlog queue.`);
  };

  // ⚡ Algorithm: Auto-Balance Week
  const handleAutoBalanceWeek = () => {
    if (unassignedTasks.length === 0) {
      sonnerToast.info('All tasks are already assigned for this week!');
      return;
    }

    let assignedCount = 0;
    let currentTasks = [...tasks];

    // Work through unassigned tasks sorted by priority (High first)
    const priorityWeight: Record<PriorityLevel, number> = {
      High: 3,
      Medium: 2,
      Low: 1
    };

    const sortedQueue = [...unassignedTasks].sort(
      (a, b) => (priorityWeight[b.priority] || 1) - (priorityWeight[a.priority] || 1)
    );

    sortedQueue.forEach((task) => {
      // Find eligible candidates with matching skill
      const eligible = teamMembers
        .map((m) => {
          const allocated = currentTasks
            .filter((t) => t.assignedUserId === m.id && t.status !== 'backlog')
            .reduce((sum, t) => sum + (Number(t.estimatedHours) || 0), 0);
          const freeHours = m.weeklyCapacityHours - allocated;
          const hasSkill = m.skills.includes(task.requiredSkill);
          return { member: m, freeHours, hasSkill };
        })
        .filter((c) => c.hasSkill && c.freeHours >= task.estimatedHours)
        .sort((a, b) => b.freeHours - a.freeHours);

      if (eligible.length > 0) {
        const chosen = eligible[0].member;
        onDispatchTask(task.id, chosen.id);
        currentTasks = currentTasks.map((t) =>
          t.id === task.id ? { ...t, assignedUserId: chosen.id, status: 'assigned' } : t
        );
        assignedCount++;
      }
    });

    if (assignedCount > 0) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {
        // ignore
      }

      sonnerToast.success(`⚡ Auto-balanced ${assignedCount} tasks across your team!`, {
        description: 'All assignments optimized against skills and open weekly hours.'
      });
    } else {
      sonnerToast.warning('Could not auto-balance remaining tasks without exceeding capacity.', {
        description: 'Review specialist hours or create a new team capacity slot.'
      });
    }
  };

  // Export Monday Morning Schedule Plan
  const handleExportPlan = () => {
    const dateStr = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    let plan = `# 🎯 Monday Morning Work Allocation Plan\n`;
    plan += `Date: ${dateStr}\n`;
    plan += `Agency Bandwidth: ${totalAllocatedHours}h / ${totalCapacityHours}h (${agencyUtilizationPercent}% Utilized)\n\n`;
    plan += `## 👥 Team Workload & Task Schedule\n\n`;

    teamMembers.forEach((m) => {
      const allocated = calculateMemberAllocatedHours(m.id, tasks);
      const memberTasks = tasks.filter((t) => t.assignedUserId === m.id && t.status !== 'backlog');
      const util = Math.round((allocated / m.weeklyCapacityHours) * 100);

      plan += `### ${m.name} (${m.role} • ${m.department})\n`;
      plan += `Capacity: ${allocated}h / ${m.weeklyCapacityHours}h (${util}%)\n`;
      if (memberTasks.length === 0) {
        plan += `- (No tasks assigned for this week - Open bandwidth: ${m.weeklyCapacityHours - allocated}h)\n`;
      } else {
        memberTasks.forEach((t) => {
          plan += `- [${t.priority.toUpperCase()}] ${t.title} (${t.clientName || 'Client'}) • ${t.estimatedHours}h • Due: ${t.dueDate || 'Sprint'}\n`;
        });
      }
      plan += `\n`;
    });

    if (unassignedTasks.length > 0) {
      plan += `## ⚠️ Unassigned Backlog Deliverables (${unassignedTasks.length} items)\n`;
      unassignedTasks.forEach((t) => {
        plan += `- ${t.title} (${t.clientName}) • ${t.estimatedHours}h • Skill: ${t.requiredSkill}\n`;
      });
    }

    navigator.clipboard.writeText(plan);
    sonnerToast.success('📋 Monday Schedule Plan copied to clipboard!', {
      description: 'Ready to paste into Slack, ClickUp, or agency docs.'
    });

    // Also offer text file download
    const blob = new Blob([plan], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Monday_Allocation_Plan_${new Date().toISOString().slice(0, 10)}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Handle Quick Add Task Submit
  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newTask: Task = {
      id: `task_${Date.now()}`,
      title: newTitle.trim(),
      clientName: newClient.trim() || 'Client Deliverable',
      projectName: 'Sprint Delivery',
      requiredSkill: newSkill as any,
      estimatedHours: Number(newHours) || 4,
      actualHoursLogged: 0,
      assignedUserId: null,
      priority: newPriority,
      status: 'backlog',
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      categoryColor: '#06B6D4'
    };

    onAddTask(newTask);
    sonnerToast.success(`Added "${newTask.title}" to Monday Backlog!`);
    setNewTitle('');
    setNewClient('');
    setIsQuickAddOpen(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Cockpit Top Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 shadow-2xl">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-black tracking-wider uppercase flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              Monday War-Room
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Week of {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
          <h1 className="text-2xl font-black text-white mt-1.5 tracking-tight flex items-center gap-2">
            Weekly Allocation Cockpit
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Eliminate mental math • Rebalance agency capacity in real-time • Dispatch deliverables to the right specialists
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsQuickAddOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-cyan-400" />
            <span>+ Deliverable</span>
          </button>

          <button
            type="button"
            onClick={handleAutoBalanceWeek}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-slate-950" />
            <span>⚡ Auto-Balance Week</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/matrix')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-bold transition-all cursor-pointer"
            title="Open Skill Gap & Hiring Forecast Matrix"
          >
            <BarChart3 className="w-3.5 h-3.5 text-purple-400" />
            <span>Skill Matrix</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/sla')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              atRiskCount > 0
                ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 shadow-sm'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
            title="Open Deliverable Deadline & SLA Risk Radar"
          >
            <Flame className={`w-3.5 h-3.5 ${atRiskCount > 0 ? 'text-rose-400' : 'text-slate-400'}`} />
            <span>SLA Radar</span>
            {atRiskCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-[10px] text-white font-black">
                {atRiskCount}
              </span>
            )}
          </button>

          {onOpenBatchSync && (
            <button
              type="button"
              onClick={onOpenBatchSync}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-bold transition-all cursor-pointer"
              title="1-Click Batch Sync All ClickUp Tasks"
            >
              <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
              <span>Sync ClickUp</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportPlan}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export Plan</span>
          </button>
        </div>
      </div>

      {/* Cockpit KPI Meters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
            <span>AGENCY BANDWIDTH</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-white mt-1.5 font-mono">
            {totalAllocatedHours} <span className="text-xs font-normal text-slate-400">/ {totalCapacityHours}h</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden mt-2">
            <div
              className={`h-full rounded-full ${
                agencyUtilizationPercent >= 90
                  ? 'bg-amber-400'
                  : agencyUtilizationPercent >= 75
                  ? 'bg-cyan-400'
                  : 'bg-emerald-400'
              }`}
              style={{ width: `${Math.min(100, agencyUtilizationPercent)}%` }}
            />
          </div>
          <div className="text-[10px] text-slate-400 mt-1 font-mono">
            {agencyUtilizationPercent}% Agency Utilization
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
            <span>UNASSIGNED QUEUE</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-300 mt-1.5 font-mono">
            {unassignedTasks.length} <span className="text-xs font-normal text-slate-400">deliverables</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-2">
            {unassignedTasks.reduce((s, t) => s + (Number(t.estimatedHours) || 0), 0)}h waiting for assignment
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
            <span>BURNOUT ALERTS</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-300 mt-1.5 font-mono">
            {overloadedMembers.length} <span className="text-xs font-normal text-slate-400">overloaded</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-2">
            {overloadedMembers.length === 0 ? '✓ All members within buffer' : 'Action needed: rebalance hours'}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
            <span>CLIENT READY LEADS</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-300 mt-1.5 font-mono">
            {teamMembers.filter((m) => m.generalCompetency?.clientReadyTier === 'Tier 1: Client-Facing Lead').length}
            <span className="text-xs font-normal text-slate-400"> Tier 1</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-2">
            Available for client call handling
          </div>
        </div>

        {/* Idea 6: Executive Gross Margin & Net Profit Cockpit Bar */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
            <span>BLENDED MARGIN</span>
            <span className="text-xs">💰</span>
          </div>
          <div className="text-2xl font-black text-emerald-300 mt-1.5 font-mono">
            {agencyFinancials.blendedGrossMarginPercent}% <span className="text-xs font-normal text-slate-400">margin</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-2 flex items-center justify-between font-mono">
            <span>${Math.round(agencyFinancials.totalMonthlyRevenue / 1000)}k rev</span>
            <span className="text-emerald-400 font-bold">+${Math.round(agencyFinancials.netProjectedProfit / 1000)}k net</span>
          </div>
        </div>
      </div>

      {/* Main Two-Column War-Room Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Unassigned Deliverables Queue (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Unassigned Backlog</h2>
                  <p className="text-[11px] text-slate-400">
                    {filteredUnassignedTasks.length} deliverables to dispatch
                  </p>
                </div>
              </div>

              {/* Skill Filter */}
              <select
                value={taskFilterSkill}
                onChange={(e) => setTaskFilterSkill(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none"
              >
                <option value="all">All Skills</option>
                <option value="Technical SEO">Technical SEO</option>
                <option value="Content Writing">Content Writing</option>
                <option value="Core Web Vitals">Core Web Vitals</option>
                <option value="AEO & GEO Strategy">AEO & GEO</option>
                <option value="Site Migration">Site Migration</option>
                <option value="WordPress Dev">WordPress Dev</option>
              </select>
            </div>

            {/* Task List */}
            <div className="space-y-2.5 max-h-[750px] overflow-y-auto pr-1">
              {filteredUnassignedTasks.length === 0 ? (
                <div className="text-center py-12 px-4 rounded-xl border border-dashed border-slate-800 text-slate-500 space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-300">Queue is Clear!</p>
                  <p className="text-[11px]">All sprint deliverables have been allocated to specialists.</p>
                </div>
              ) : (
                filteredUnassignedTasks.map((task) => {
                  const topCandidate = getTopCandidateForTask(task);

                  return (
                    <div
                      key={task.id}
                      className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/90 hover:border-slate-700 transition-all space-y-2.5 group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-bold text-slate-300">
                              {task.clientName || 'Client'}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                task.priority === 'High'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : task.priority === 'Medium'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              }`}
                            >
                              {task.priority}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-white mt-1 group-hover:text-cyan-300 transition-colors">
                            {task.title}
                          </h4>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-mono font-bold text-cyan-400">
                            {task.estimatedHours}h
                          </span>
                        </div>
                      </div>

                      {/* Required Skill Pill */}
                      <div className="flex items-center gap-1 text-[10px] text-slate-400">
                        <span>Required Skill:</span>
                        <span className="font-semibold text-slate-300">{task.requiredSkill}</span>
                      </div>

                      {/* 1-Click Assignment Bar (Idea 5: Profit-Margin Aware Dispatch) */}
                      <div className="pt-2 border-t border-slate-900 flex items-center justify-between gap-2">
                        {topCandidate ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-400">Best match:</span>
                            <button
                              type="button"
                              onClick={() => handleQuickAssign(task.id, topCandidate.member.id)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-[11px] font-bold text-cyan-300 transition-all cursor-pointer"
                              title={`Assign to ${topCandidate.member.name} (${topCandidate.freeHours}h free • $${topCandidate.costRate}/h loaded rate)`}
                            >
                              <Sparkles className="w-3 h-3 text-cyan-400" />
                              <span>{topCandidate.member.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">({topCandidate.freeHours}h • ${topCandidate.costRate}/h)</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-amber-400">No candidate with free hours</span>
                        )}

                        {/* Dropdown for manual assign with cost transparency */}
                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value) handleQuickAssign(task.id, e.target.value);
                          }}
                          className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-300 focus:outline-none cursor-pointer"
                        >
                          <option value="">Assign to ▾</option>
                          {teamMembers.map((m) => {
                            const alloc = calculateMemberAllocatedHours(m.id, tasks);
                            const free = m.weeklyCapacityHours - alloc;
                            const rate = getMemberCostPerHour(m);
                            return (
                              <option key={m.id} value={m.id}>
                                {m.name} ({free}h free • ${rate}/h)
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Specialists Capacity Cockpit (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Department Filter & Search */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {(['all', 'SEO', 'Web Development', 'Design', 'Social Media'] as const).map((dept) => (
                <button
                  key={dept}
                  type="button"
                  onClick={() => setSelectedDept(dept)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    selectedDept === dept
                      ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {dept === 'all' ? 'All Specialists' : dept}
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder="Search specialist or skill..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 w-full sm:w-48"
            />
          </div>

          {/* Member Workload Cards */}
          <div className="space-y-3 max-h-[750px] overflow-y-auto pr-1">
            {filteredMembers.map((member) => {
              const allocatedHours = calculateMemberAllocatedHours(member.id, tasks);
              const capacityHours = member.weeklyCapacityHours;
              const remainingHours = capacityHours - allocatedHours;
              const percent = capacityHours > 0 ? Math.round((allocatedHours / capacityHours) * 100) : 0;
              const isOverloaded = allocatedHours > capacityHours;
              const memberTasks = tasks.filter(
                (t) => t.assignedUserId === member.id && t.status !== 'backlog'
              );

              return (
                <div
                  key={member.id}
                  className={`p-4 rounded-2xl border transition-all space-y-3 ${
                    isOverloaded
                      ? 'bg-rose-950/20 border-rose-500/40 shadow-lg shadow-rose-950/20'
                      : percent >= 85
                      ? 'bg-amber-950/15 border-amber-500/30'
                      : 'bg-slate-900/85 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Member Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img
                          src={member.avatar}
                          alt={member.name}
                          className="w-10 h-10 rounded-xl object-cover border border-slate-700 shadow-sm"
                        />
                        <span
                          className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-950 flex items-center justify-center text-[8px] font-black ${
                            isOverloaded
                              ? 'bg-rose-500 text-white'
                              : percent >= 85
                              ? 'bg-amber-400 text-slate-950'
                              : 'bg-emerald-400 text-slate-950'
                          }`}
                        >
                          {isOverloaded ? '!' : '✓'}
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h3
                            onClick={() => navigate(`/member/${member.id}`)}
                            className="text-sm font-bold text-white hover:text-cyan-400 transition-colors cursor-pointer"
                          >
                            {member.name}
                          </h3>
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-semibold text-slate-300">
                            {member.seniority}
                          </span>
                          {member.generalCompetency?.clientReadyTier === 'Tier 1: Client-Facing Lead' && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-bold">
                              Tier 1 Lead
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400">
                          {member.role} • <span className="text-slate-500">{member.department}</span>
                        </p>
                      </div>
                    </div>

                    {/* Capacity Indicator */}
                    <div className="text-right">
                      <div className="text-sm font-mono font-bold text-white">
                        <span className={isOverloaded ? 'text-rose-400' : percent >= 85 ? 'text-amber-400' : 'text-cyan-400'}>
                          {allocatedHours}h
                        </span>{' '}
                        <span className="text-slate-500 font-normal">/ {capacityHours}h</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {isOverloaded ? (
                          <span className="text-rose-400 font-bold">+{Math.abs(remainingHours)}h Overload</span>
                        ) : (
                          `${remainingHours}h available buffer`
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Capacity Progress Bar */}
                  <div className="space-y-1">
                    <div className="w-full h-2 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isOverloaded
                            ? 'bg-rose-500'
                            : percent >= 85
                            ? 'bg-amber-400'
                            : 'bg-gradient-to-r from-emerald-500 to-cyan-400'
                        }`}
                        style={{ width: `${Math.min(100, percent)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>{percent}% allocated</span>
                      <span>Target: {capacityHours}h/wk</span>
                    </div>
                  </div>

                  {/* Member Assigned Deliverables List */}
                  {memberTasks.length > 0 && (
                    <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Allocated Deliverables ({memberTasks.length})
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {memberTasks.map((t) => (
                          <div
                            key={t.id}
                            className="p-2 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between text-[11px] group"
                          >
                            <div className="truncate pr-2">
                              <span className="font-semibold text-slate-200 truncate block">
                                {t.title}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {t.clientName} • <span className="font-mono text-cyan-400">{t.estimatedHours}h</span>
                              </span>
                            </div>

                            {/* Unassign button */}
                            <button
                              type="button"
                              onClick={() => handleUnassignTask(t.id)}
                              className="p-1 rounded text-slate-500 hover:text-amber-400 hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                              title="Move back to Unassigned Backlog"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick Add Deliverable Modal */}
      {isQuickAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl max-w-md w-full p-6 text-white space-y-4 relative">
            <button
              type="button"
              onClick={() => setIsQuickAddOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Plus className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Add Monday Deliverable</h3>
                <p className="text-[11px] text-slate-400">Adds an unassigned task to this week's war-room queue</p>
              </div>
            </div>

            <form onSubmit={handleQuickAddSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Deliverable Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Technical SEO Audit & Core Web Vitals"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Client Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Acme Health"
                    value={newClient}
                    onChange={(e) => setNewClient(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Estimated Hours</label>
                  <input
                    type="number"
                    min="1"
                    max="40"
                    value={newHours}
                    onChange={(e) => setNewHours(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Required Skill</label>
                  <select
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none cursor-pointer"
                  >
                    <option value="Technical SEO">Technical SEO</option>
                    <option value="Content Writing">Content Writing</option>
                    <option value="Core Web Vitals">Core Web Vitals</option>
                    <option value="AEO & GEO Strategy">AEO & GEO</option>
                    <option value="Site Migration">Site Migration</option>
                    <option value="WordPress Dev">WordPress Dev</option>
                    <option value="Link Building">Link Building</option>
                    <option value="UI/UX Redesign">UI/UX Redesign</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as PriorityLevel)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none cursor-pointer"
                  >
                    <option value="Urgent">Urgent</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsQuickAddOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 transition-all cursor-pointer"
                >
                  Add to Queue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
