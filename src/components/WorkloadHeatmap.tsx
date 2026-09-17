import React, { useState } from 'react';
import {
  ShieldCheck,
  Flame,
  UserCheck,
  ArrowRightLeft,
  Sparkles,
  X
} from 'lucide-react';
import { toast as sonnerToast } from 'sonner';

export interface WorkloadMemberStats {
  member: any;
  allocatedHours: number;
  maxCapacity: number;
  utilization: number;
  overloadHours: number;
  status: 'overload' | 'optimal' | 'healthy' | 'available';
  assignedTasks: Array<{
    projectId: string;
    projectName: string;
    client: string;
    deliverableId: string;
    taskType: string;
    hours: number;
    clickUpUrl?: string;
  }>;
}

export const WorkloadHeatmap: React.FC<{
  members: any[];
  projects: any[];
  onReassignDeliverable: (projectId: string, deliverableId: string, newAssigneeId: string) => void;
}> = ({ members, projects, onReassignDeliverable }) => {
  const [filterMode, setFilterMode] = useState<'all' | 'overload' | 'available'>('all');
  const [selectedTaskToReassign, setSelectedTaskToReassign] = useState<{
    projectId: string;
    projectName: string;
    client: string;
    deliverableId: string;
    taskType: string;
    hours: number;
    currentAssigneeId: string;
  } | null>(null);

  // 1. Calculate stats per member
  const memberStats: WorkloadMemberStats[] = members.map((m) => {
    const maxCapacity = m.maxHoursPerWeek || 40;
    const assignedTasks: WorkloadMemberStats['assignedTasks'] = [];
    let allocatedHours = 0;

    projects.forEach((p) => {
      (p.taskBreakdown || []).forEach((tb: any) => {
        if (tb.assigneeId === m.id) {
          const taskHrs = tb.hours || 0;
          allocatedHours += taskHrs;
          assignedTasks.push({
            projectId: p.id,
            projectName: p.name,
            client: p.client,
            deliverableId: tb.id,
            taskType: tb.taskType,
            hours: taskHrs,
            clickUpUrl: tb.clickUpUrl
          });
        }
      });
    });

    const utilization = Math.round((allocatedHours / (maxCapacity || 1)) * 100);
    const overloadHours = Math.max(0, allocatedHours - maxCapacity);

    let status: WorkloadMemberStats['status'] = 'healthy';
    if (utilization > 100) status = 'overload';
    else if (utilization >= 85) status = 'optimal';
    else if (utilization < 55) status = 'available';

    return {
      member: m,
      allocatedHours,
      maxCapacity,
      utilization,
      overloadHours,
      status,
      assignedTasks
    };
  });

  // Agency Global Summary
  const totalCapacity = memberStats.reduce((acc, ms) => acc + ms.maxCapacity, 0);
  const totalAllocated = memberStats.reduce((acc, ms) => acc + ms.allocatedHours, 0);
  const overloadedCount = memberStats.filter((ms) => ms.status === 'overload').length;
  const availableCount = memberStats.filter((ms) => ms.status === 'available').length;
  const agencyUtilization = Math.round((totalAllocated / (totalCapacity || 1)) * 100);

  // Filtered members list
  const filteredMembers = memberStats.filter((ms) => {
    if (filterMode === 'overload') return ms.status === 'overload';
    if (filterMode === 'available') return ms.status === 'available';
    return true;
  });

  // Candidate pool for rebalancing a selected task
  const compatibleCandidates = selectedTaskToReassign
    ? memberStats.filter((ms) => ms.member.id !== selectedTaskToReassign.currentAssigneeId)
    : [];

  const handleExecuteTransfer = (newAssigneeId: string) => {
    if (!selectedTaskToReassign) return;
    const targetMember = members.find((m) => m.id === newAssigneeId);
    onReassignDeliverable(
      selectedTaskToReassign.projectId,
      selectedTaskToReassign.deliverableId,
      newAssigneeId
    );
    sonnerToast.success(
      `Rebalanced "${selectedTaskToReassign.taskType}" (${selectedTaskToReassign.hours}h) to ${targetMember?.name || 'teammate'}!`
    );
    setSelectedTaskToReassign(null);
  };

  return (
    <div className="space-y-6">
      {/* 1. Executive Summary & Burnout Shield KPI Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Agency Capacity</span>
            <span className="text-cyan-400 text-xs font-black">{agencyUtilization}% Loaded</span>
          </div>
          <div className="text-2xl font-black text-white">
            {totalAllocated} <span className="text-sm font-normal text-slate-400">/ {totalCapacity}h</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full transition-all ${
                agencyUtilization > 95
                  ? 'bg-rose-500'
                  : agencyUtilization > 80
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, agencyUtilization)}%` }}
            />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-rose-500/30 space-y-1 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">Burnout Hazard</span>
            <Flame className="w-4 h-4 text-rose-400 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-rose-300">
            {overloadedCount}{' '}
            <span className="text-sm font-normal text-rose-400/80">Staff Over capacity</span>
          </div>
          <p className="text-[11px] text-slate-400">Allocations exceeding 100% weekly limit</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-emerald-500/30 space-y-1 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Surplus Capacity</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-300">
            {Math.max(0, totalCapacity - totalAllocated)}h{' '}
            <span className="text-sm font-normal text-slate-400">Available</span>
          </div>
          <p className="text-[11px] text-slate-400">{availableCount} specialists ready for new retainers</p>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-950/40 to-indigo-950/40 border border-purple-500/40 space-y-1 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">Burnout Shield</span>
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-sm font-black text-white pt-1">
            {overloadedCount > 0 ? (
              <span className="text-rose-300">⚡ Rebalance Recommended</span>
            ) : (
              <span className="text-emerald-400">🛡️ All Staff Safe & Balanced</span>
            )}
          </div>
          <p className="text-[11px] text-slate-300">
            {overloadedCount > 0
              ? 'Click "Shield Rebalance" to redistribute hours.'
              : 'Workload distribution is within safe operational limits.'}
          </p>
        </div>
      </div>

      {/* 2. Heatmap Filter & View Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer border ${
              filterMode === 'all'
                ? 'bg-slate-800 text-white border-slate-600 shadow-sm'
                : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            All Team Members ({memberStats.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('overload')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer border ${
              filterMode === 'overload'
                ? 'bg-rose-950/80 text-rose-200 border-rose-500 shadow-md ring-1 ring-rose-500/50'
                : 'bg-rose-950/20 text-rose-400 border-rose-900/40 hover:bg-rose-950/40'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>🚨 Overloaded ({overloadedCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('available')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer border ${
              filterMode === 'available'
                ? 'bg-emerald-950/80 text-emerald-200 border-emerald-500 shadow-md'
                : 'bg-emerald-950/20 text-emerald-400 border-emerald-900/40 hover:bg-emerald-950/40'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>🔵 High Spare Capacity ({availableCount})</span>
          </button>
        </div>

        <span className="text-xs text-slate-400 font-medium">
          Color spectrum: 🟢 &lt;75% • 🟡 75–99% • 🔵 100% • 🔴 &gt;100% (Burnout)
        </span>
      </div>

      {/* 3. Heatmap Grid */}
      <div className="space-y-3">
        {filteredMembers.map((ms) => {
          const isOverloaded = ms.status === 'overload';

          return (
            <div
              key={ms.member.id}
              className={`p-4 rounded-2xl border transition-all duration-200 space-y-3 ${
                isOverloaded
                  ? 'bg-rose-950/20 border-rose-500/50 shadow-lg shadow-rose-950/30 ring-1 ring-rose-500/30'
                  : ms.status === 'optimal'
                  ? 'bg-slate-900/90 border-amber-500/30'
                  : 'bg-slate-900/80 border-slate-800'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Member Identity */}
                <div className="flex items-center gap-3">
                  <img
                    src={ms.member.avatar}
                    alt={ms.member.name}
                    className={`w-11 h-11 rounded-xl object-cover ring-2 ${
                      isOverloaded
                        ? 'ring-rose-500'
                        : ms.status === 'optimal'
                        ? 'ring-amber-400'
                        : 'ring-emerald-500/50'
                    }`}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black text-white">{ms.member.name}</h4>
                      {isOverloaded && (
                        <span className="px-2 py-0.5 rounded-md bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] font-black uppercase flex items-center gap-1 animate-pulse">
                          <Flame className="w-3 h-3" />
                          <span>+{ms.overloadHours}h Overload</span>
                        </span>
                      )}
                      {ms.status === 'available' && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
                          Spare Capacity
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">{ms.member.role}</p>
                  </div>
                </div>

                {/* Utilization & Metrics */}
                <div className="flex items-center gap-4 sm:text-right">
                  <div>
                    <div className="flex items-center sm:justify-end gap-1.5">
                      <span
                        className={`text-sm font-black ${
                          isOverloaded
                            ? 'text-rose-400'
                            : ms.status === 'optimal'
                            ? 'text-amber-300'
                            : 'text-emerald-400'
                        }`}
                      >
                        {ms.allocatedHours}h
                      </span>
                      <span className="text-xs text-slate-500">/ {ms.maxCapacity}h</span>
                    </div>
                    <span className="text-[11px] font-bold text-slate-400 block">
                      {ms.utilization}% Capacity Loaded
                    </span>
                  </div>
                </div>
              </div>

              {/* Visual Heatmap Bar */}
              <div className="space-y-1">
                <div className="w-full h-3 rounded-full bg-slate-950 overflow-hidden p-0.5 border border-slate-800 flex">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isOverloaded
                        ? 'bg-gradient-to-r from-rose-600 to-rose-400 shadow-md shadow-rose-500/50'
                        : ms.status === 'optimal'
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                        : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                    }`}
                    style={{ width: `${Math.min(100, ms.utilization)}%` }}
                  />
                </div>
              </div>

              {/* Assigned Deliverables Pills & 1-Click Shield Rebalance Triggers */}
              <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                  <span className="text-[11px] font-bold text-slate-400 mr-1">
                    Assigned Tasks ({ms.assignedTasks.length}):
                  </span>
                  {ms.assignedTasks.length === 0 ? (
                    <span className="text-[11px] text-slate-500 italic">No tasks assigned this week</span>
                  ) : (
                    ms.assignedTasks.map((t) => (
                      <div
                        key={t.deliverableId}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs font-semibold text-slate-200"
                      >
                        <span className="text-cyan-300 font-bold truncate max-w-[140px]">
                          {t.projectName}
                        </span>
                        <span className="text-slate-400 text-[11px]">({t.taskType})</span>
                        <span className="text-emerald-400 font-bold text-[11px]">+{t.hours}h</span>

                        {/* Rebalance Task Button */}
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedTaskToReassign({
                              projectId: t.projectId,
                              projectName: t.projectName,
                              client: t.client,
                              deliverableId: t.deliverableId,
                              taskType: t.taskType,
                              hours: t.hours,
                              currentAssigneeId: ms.member.id
                            })
                          }
                          title="🛡️ Reassign this task to an available teammate"
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-purple-300 transition-colors cursor-pointer ml-1"
                        >
                          <ArrowRightLeft className="w-3 h-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Burnout Shield Rebalancer Modal */}
      {selectedTaskToReassign && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4 sm:p-6"
          style={{ zIndex: 99999 }}
        >
          <div
            onClick={() => setSelectedTaskToReassign(null)}
            className="absolute inset-0 bg-slate-950/85 backdrop-blur-md"
            style={{ zIndex: 1 }}
          />

          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg bg-[#0c1427] border border-purple-500/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col p-6 space-y-5"
            style={{ zIndex: 10 }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <span className="px-2.5 py-0.5 rounded-md bg-purple-500/20 text-purple-300 text-xs font-black uppercase flex items-center gap-1.5 w-fit">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Burnout Shield Rebalancer</span>
                </span>
                <h3 className="text-base font-black text-white">
                  Transfer Task: {selectedTaskToReassign.taskType}
                </h3>
                <p className="text-xs text-slate-400">
                  Project: <strong className="text-white">{selectedTaskToReassign.projectName}</strong> ({selectedTaskToReassign.client}) • Impact: <strong className="text-cyan-400">{selectedTaskToReassign.hours} hrs/wk</strong>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTaskToReassign(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Select Available Teammate:
              </span>

              <div className="max-h-60 overflow-y-auto space-y-2 scrollbar-thin">
                {compatibleCandidates.map((cand) => {
                  const projectedHours = cand.allocatedHours + selectedTaskToReassign.hours;
                  const projectedUtil = Math.round((projectedHours / cand.maxCapacity) * 100);
                  const isSafe = projectedUtil <= 100;

                  return (
                    <button
                      key={cand.member.id}
                      type="button"
                      onClick={() => handleExecuteTransfer(cand.member.id)}
                      className={`w-full p-3 rounded-xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
                        isSafe
                          ? 'bg-slate-900 hover:bg-slate-800/90 border-slate-700/80 hover:border-purple-500/60'
                          : 'bg-rose-950/20 border-rose-500/30 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={cand.member.avatar}
                          alt={cand.member.name}
                          className="w-9 h-9 rounded-xl object-cover"
                        />
                        <div>
                          <h5 className="text-xs font-bold text-white">{cand.member.name}</h5>
                          <span className="text-[11px] text-slate-400">{cand.member.role}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={`text-xs font-black ${isSafe ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {projectedHours}h / {cand.maxCapacity}h
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          ({projectedUtil}% after transfer)
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedTaskToReassign(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
