import React, { useState, useMemo } from 'react';
import type { TeamMember, Task } from '../types';
import { calculateMemberAllocatedHours } from '../utils/matchingEngine';
import { toast as sonnerToast } from 'sonner';
import {
  AlertTriangle,
  Clock,
  Zap,
  CheckCircle2,
  X,
  Share2,
  Copy,
  ShieldAlert,
  Flame
} from 'lucide-react';

export type SlaRiskLevel = 'critical' | 'high' | 'moderate' | 'safe';

export interface SlaTaskItem {
  task: Task;
  hoursRemaining: number;
  progressPercent: number;
  riskLevel: SlaRiskLevel;
  assignedMember?: TeamMember;
  recommendedRescueSpecialist?: {
    member: TeamMember;
    freeHours: number;
    skillScore: number;
  };
}

interface SlaRiskRadarProps {
  tasks: Task[];
  teamMembers: TeamMember[];
  onReassignTask: (taskId: string, newMemberId: string) => void;
  onClose?: () => void;
  isModal?: boolean;
}

export const SlaRiskRadar: React.FC<SlaRiskRadarProps> = ({
  tasks,
  teamMembers,
  onReassignTask,
  onClose,
  isModal = false
}) => {
  const [activeRiskFilter, setActiveRiskFilter] = useState<'all_at_risk' | 'critical' | 'high'>('all_at_risk');
  const [draftModalTask, setDraftModalTask] = useState<SlaTaskItem | null>(null);

  // Analyze all tasks against impending SLA deadlines
  const analyzedDeliverables: SlaTaskItem[] = useMemo(() => {
    const now = Date.now();

    return tasks.map((task) => {
      // Parse due date timestamp (defaults to 24h from now if missing)
      let dueTimestamp = now + 24 * 3600000;
      if (task.dueDate) {
        const parsed = new Date(task.dueDate).getTime();
        if (!isNaN(parsed)) dueTimestamp = parsed;
      }

      const diffMs = dueTimestamp - now;
      const hoursRemaining = Math.round(diffMs / (1000 * 60 * 60));

      const estimated = Number(task.estimatedHours) || 1;
      const logged = Number(task.actualHoursLogged) || 0;
      const progressPercent = Math.min(100, Math.round((logged / estimated) * 100));

      // Calculate risk classification
      let riskLevel: SlaRiskLevel = 'safe';
      if (task.status === 'completed') {
        riskLevel = 'safe';
      } else if (hoursRemaining <= 0 || (hoursRemaining <= 24 && progressPercent < 40)) {
        riskLevel = 'critical';
      } else if (hoursRemaining <= 48 && progressPercent < 50) {
        riskLevel = 'high';
      } else if (hoursRemaining <= 72 && progressPercent < 20) {
        riskLevel = 'moderate';
      }

      const assignedMember = teamMembers.find((m) => m.id === task.assignedUserId);

      // Find best rescue candidate (matching skill, high speed efficiency, open capacity)
      let recommendedRescueSpecialist: SlaTaskItem['recommendedRescueSpecialist'] = undefined;
      const candidates = teamMembers
        .filter((m) => m.id !== task.assignedUserId)
        .filter((m) => m.skills.some((s) => s.toLowerCase().includes(task.requiredSkill.toLowerCase())))
        .map((m) => {
          const allocated = calculateMemberAllocatedHours(m.id, tasks);
          const freeHours = Math.max(0, m.weeklyCapacityHours - allocated);
          const skillMatch = m.skillScores.find((sc) => sc.skill.toLowerCase().includes(task.requiredSkill.toLowerCase()));
          const speedScore = skillMatch ? skillMatch.speedEfficiency : 7;
          return { member: m, freeHours, skillScore: speedScore };
        })
        .filter((c) => c.freeHours >= Math.max(2, estimated - logged))
        .sort((a, b) => b.skillScore - a.skillScore || b.freeHours - a.freeHours);

      if (candidates.length > 0) {
        recommendedRescueSpecialist = candidates[0];
      }

      return {
        task,
        hoursRemaining,
        progressPercent,
        riskLevel,
        assignedMember,
        recommendedRescueSpecialist
      };
    });
  }, [tasks, teamMembers]);

  // Filtered deliverables
  const atRiskDeliverables = useMemo(() => {
    return analyzedDeliverables
      .filter((item) => item.task.status !== 'completed' && item.riskLevel !== 'safe')
      .filter((item) => {
        if (activeRiskFilter === 'critical') return item.riskLevel === 'critical';
        if (activeRiskFilter === 'high') return item.riskLevel === 'high';
        return true;
      })
      .sort((a, b) => a.hoursRemaining - b.hoursRemaining);
  }, [analyzedDeliverables, activeRiskFilter]);

  // Summary Metrics
  const criticalCount = analyzedDeliverables.filter((i) => i.riskLevel === 'critical' && i.task.status !== 'completed').length;
  const highRiskCount = analyzedDeliverables.filter((i) => i.riskLevel === 'high' && i.task.status !== 'completed').length;
  const totalHoursAtRisk = atRiskDeliverables.reduce((sum, i) => sum + (i.task.estimatedHours - i.task.actualHoursLogged), 0);

  // Handle Rescue Reassignment
  const handleRescueReassign = (item: SlaTaskItem) => {
    if (!item.recommendedRescueSpecialist) {
      sonnerToast.error('No specialist with open bandwidth and matching skill found.');
      return;
    }

    const newSpecialist = item.recommendedRescueSpecialist.member;
    onReassignTask(item.task.id, newSpecialist.id);
    sonnerToast.success(`⚡ Deliverable Rescued! Reassigned "${item.task.title}" to ${newSpecialist.name}`, {
      description: `${newSpecialist.name} has ${item.recommendedRescueSpecialist.freeHours}h free capacity and ${item.recommendedRescueSpecialist.skillScore}/10 speed rating.`
    });
  };

  // Pre-drafted internal escalation message
  const getEscalationDraft = (item: SlaTaskItem) => {
    return `🚨 [URGENT SLA NOTICE] Deliverable At-Risk: "${item.task.title}"
Client: ${item.task.clientName}
Due: ${item.hoursRemaining <= 0 ? 'PAST DUE' : `In ${item.hoursRemaining} hours`}
Current Progress: ${item.task.actualHoursLogged}h / ${item.task.estimatedHours}h (${item.progressPercent}%)
Assigned: ${item.assignedMember?.name || 'Unassigned'}
Recommended Action: Reassign or sprint-pair immediately to prevent client SLA breach.`;
  };

  const content = (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-rose-950/40 to-slate-900 border border-rose-900/40 shadow-2xl relative">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-2.5">
          <span className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-black tracking-wider uppercase flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            Predictive SLA Watchdog
          </span>
          <span className="text-xs text-slate-400 font-mono">Real-time Turn-around Monitoring</span>
        </div>

        <h1 className="text-2xl font-black text-white mt-2 tracking-tight flex items-center gap-2">
          Deliverable Deadline & SLA Risk Radar
        </h1>
        <p className="text-xs text-slate-400 mt-1 max-w-2xl">
          Catches impending deliverable delays before your clients do. Automatically analyzes hours remaining, time elapsed, and current progress—and offers 1-click rescue reassignments to fast specialists with open capacity.
        </p>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-rose-900/50">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
            <span>CRITICAL SLA BREACHES</span>
            <Flame className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-300 mt-1 font-mono">
            {criticalCount} <span className="text-xs font-normal text-slate-400">deliverables</span>
          </div>
          <div className="text-[10px] text-rose-400 mt-1">Due in &lt;24h with &lt;40% logged</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-amber-900/40">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
            <span>HIGH RISK DELAYS</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-300 mt-1 font-mono">
            {highRiskCount} <span className="text-xs font-normal text-slate-400">deliverables</span>
          </div>
          <div className="text-[10px] text-amber-400 mt-1">Due in &lt;48h with &lt;50% logged</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
            <span>HOURS AT RISK</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-white mt-1 font-mono">
            {totalHoursAtRisk} <span className="text-xs font-normal text-slate-500">hours</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Remaining to complete at-risk queue</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
            <span>DELIVERABLE HEALTH</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-1 font-mono">
            {Math.max(0, tasks.length - atRiskDeliverables.length)} <span className="text-xs font-normal text-slate-500">on track</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Deliverables meeting SLA pace</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveRiskFilter('all_at_risk')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeRiskFilter === 'all_at_risk'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            All At-Risk Deliverables ({atRiskDeliverables.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveRiskFilter('critical')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeRiskFilter === 'critical'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Critical (&lt;24h) ({criticalCount})
          </button>

          <button
            type="button"
            onClick={() => setActiveRiskFilter('high')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeRiskFilter === 'high'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            High Risk (&lt;48h) ({highRiskCount})
          </button>
        </div>

        <span className="text-[11px] text-slate-400 font-mono">
          Showing {atRiskDeliverables.length} SLA-threatened deliverables
        </span>
      </div>

      {/* Deliverable Risk Cards List */}
      <div className="space-y-3.5">
        {atRiskDeliverables.length === 0 ? (
          <div className="text-center py-16 px-4 rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <h3 className="text-base font-bold text-white">All Deliverables Are On Pace!</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              No tasks are currently facing SLA breach risks. All assigned deliverables have healthy time-buffers and progress logged.
            </p>
          </div>
        ) : (
          atRiskDeliverables.map((item) => {
            const isCritical = item.riskLevel === 'critical';
            const isPastDue = item.hoursRemaining <= 0;

            return (
              <div
                key={item.task.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isCritical
                    ? 'bg-slate-900/90 border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.15)]'
                    : 'bg-slate-900/80 border-amber-500/40'
                }`}
              >
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  {/* Left: Task Info & Countdown */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] font-bold text-slate-300">
                        {item.task.clientName || 'Client'}
                      </span>

                      {/* Urgency Badge */}
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                          isPastDue
                            ? 'bg-rose-600 text-white animate-pulse'
                            : isCritical
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        <Clock className="w-3 h-3" />
                        {isPastDue
                          ? '🚨 PAST DUE'
                          : item.hoursRemaining < 24
                          ? `Due in ${item.hoursRemaining}h`
                          : `Due in ${Math.round(item.hoursRemaining / 24)} days`}
                      </span>

                      <span className="px-2 py-0.5 rounded-md bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-[10px] font-bold">
                        {item.task.requiredSkill}
                      </span>
                    </div>

                    <h3 className="text-sm font-black text-white">{item.task.title}</h3>

                    {/* Progress Bar */}
                    <div className="flex items-center gap-3 pt-1">
                      <div className="w-48 h-2 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isCritical ? 'bg-rose-500' : 'bg-amber-400'
                          }`}
                          style={{ width: `${item.progressPercent}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">
                        {item.task.actualHoursLogged}h / {item.task.estimatedHours}h logged ({item.progressPercent}%)
                      </span>
                    </div>
                  </div>

                  {/* Middle: Currently Assigned Specialist */}
                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 min-w-[200px]">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-white">
                      {item.assignedMember?.name.slice(0, 2).toUpperCase() || 'UN'}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">
                        {item.assignedMember?.name || 'Unassigned'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {item.assignedMember ? `${item.assignedMember.role}` : 'Needs assignment'}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 self-stretch lg:self-auto justify-end flex-wrap">
                    {/* Reassign / Rescue Button */}
                    {item.recommendedRescueSpecialist ? (
                      <button
                        type="button"
                        onClick={() => handleRescueReassign(item)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
                        title={`1-Click Reassign to ${item.recommendedRescueSpecialist.member.name} (${item.recommendedRescueSpecialist.freeHours}h free)`}
                      >
                        <Zap className="w-3.5 h-3.5 text-slate-950" />
                        <span>⚡ Rescue with {item.recommendedRescueSpecialist.member.name.split(' ')[0]}</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-500 font-mono italic">
                        No free specialist found
                      </span>
                    )}

                    {/* Escalation Draft Button */}
                    <button
                      type="button"
                      onClick={() => setDraftModalTask(item)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
                      title="Generate Escalation Slack/Email Message"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Escalation Draft Modal */}
      {draftModalTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-400" />
                <h3 className="text-base font-bold text-white">Escalation Notification Draft</h3>
              </div>
              <button
                type="button"
                onClick={() => setDraftModalTask(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Copy this pre-drafted alert into your internal Slack channel or send it to the assigned team lead to prioritize this deliverable:
            </p>

            <textarea
              readOnly
              rows={7}
              value={getEscalationDraft(draftModalTask)}
              className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 leading-relaxed focus:outline-none resize-none"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDraftModalTask(null)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(getEscalationDraft(draftModalTask));
                  sonnerToast.success('Copied escalation draft to clipboard!');
                  setDraftModalTask(null);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Draft</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
        <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl bg-slate-950 border border-slate-800 shadow-2xl p-6">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {content}
    </div>
  );
};
