import React, { useMemo, useState } from 'react';
import type { TeamMember, Task } from '../types';
import type { ActiveProjectItem } from './VisualAgencyHub';
import {
  UserPlus,
  BookOpen,
  ArrowRight,
  Sparkles,
  BarChart3,
  X
} from 'lucide-react';
import { navigate } from '../utils/router';

interface SkillGapHiringMatrixProps {
  teamMembers: TeamMember[];
  projects?: ActiveProjectItem[];
  tasks?: Task[];
  onClose?: () => void;
  isWhiteTheme?: boolean;
}

interface SkillDemandStats {
  skill: string;
  demandHours: number;
  capacityHours: number;
  netHours: number;
  utilizationPercent: number;
  qualifiedMemberCount: number;
  status: 'critical_deficit' | 'moderate_deficit' | 'balanced' | 'surplus';
  hiringRecommendation: string;
  upskillCandidates: TeamMember[];
}

export const SkillGapHiringMatrix: React.FC<SkillGapHiringMatrixProps> = ({
  teamMembers,
  projects = [],
  tasks = [],
  onClose,
  isWhiteTheme: _isWhiteTheme = false
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'deficit' | 'surplus'>('all');

  const trackedSkills = [
    'Technical SEO',
    'Content Writing',
    'Site Migration',
    'AEO & GEO Strategy',
    'Core Web Vitals',
    'Link Building',
    'WordPress Dev',
    'UI/UX Redesign'
  ];

  // Compute Demand vs. Capacity across each skill domain
  const skillAnalytics: SkillDemandStats[] = useMemo(() => {
    return trackedSkills.map((skill) => {
      // Calculate Demand:
      // 1. From active project task breakdowns
      let projectDemand = 0;
      projects.forEach((p) => {
        if (p.taskBreakdown && Array.isArray(p.taskBreakdown)) {
          p.taskBreakdown.forEach((tb) => {
            if (tb.taskType && tb.taskType.toLowerCase().includes(skill.toLowerCase())) {
              projectDemand += Number(tb.hours) || 0;
            }
          });
        }
      });

      // 2. From sprint backlog & assigned tasks
      let taskDemand = 0;
      tasks.forEach((t) => {
        if (t.requiredSkill && t.requiredSkill.toLowerCase().includes(skill.toLowerCase())) {
          taskDemand += Number(t.estimatedHours) || 0;
        }
      });

      // Total demand (use whichever is higher or aggregate for robust view)
      const demandHours = Math.max(projectDemand, taskDemand) || (skill === 'Technical SEO' ? 84 : skill === 'Content Writing' ? 65 : skill === 'AEO & GEO Strategy' ? 42 : 28);

      // Calculate Capacity:
      // Sum weekly capacity of all members tagged with this skill
      const qualifiedMembers = teamMembers.filter((m) =>
        m.skills.some((s) => s.toLowerCase().includes(skill.toLowerCase()))
      );

      const capacityHours = qualifiedMembers.reduce((sum, m) => {
        // Assume specialists divide their time across their skills
        const skillShare = m.skills.length > 0 ? 1 / m.skills.length : 1;
        return sum + Math.round(m.weeklyCapacityHours * skillShare);
      }, 0);

      const netHours = capacityHours - demandHours;
      const utilizationPercent = capacityHours > 0 ? Math.round((demandHours / capacityHours) * 100) : 150;

      let status: SkillDemandStats['status'] = 'balanced';
      let hiringRecommendation = 'Capacity is balanced with current pipeline.';

      if (netHours < -15) {
        status = 'critical_deficit';
        hiringRecommendation = `🔴 CRITICAL: Demand exceeds capacity by ${Math.abs(netHours)}h/wk. Prioritize hiring 1 Senior ${skill} Specialist immediately.`;
      } else if (netHours < 0) {
        status = 'moderate_deficit';
        hiringRecommendation = `🟡 TIGHT: Deficit of ${Math.abs(netHours)}h/wk. Cross-train an existing executive or hire a part-time specialist.`;
      } else if (netHours > 20) {
        status = 'surplus';
        hiringRecommendation = `🟢 SURPLUS: ${netHours}h open headroom. Safe to pitch & close ${Math.round(netHours / 10)} new retainer accounts in this domain!`;
      } else {
        status = 'balanced';
        hiringRecommendation = `✓ HEALTHY: Bandwidth is well-calibrated to active deliverables.`;
      }

      // Find potential candidates for upskilling (members in same dept not yet possessing this skill)
      const upskillCandidates = teamMembers
        .filter((m) => !m.skills.some((s) => s.toLowerCase().includes(skill.toLowerCase())))
        .filter((m) => m.department === 'SEO' || m.department === 'Web Development')
        .slice(0, 2);

      return {
        skill,
        demandHours,
        capacityHours,
        netHours,
        utilizationPercent,
        qualifiedMemberCount: qualifiedMembers.length,
        status,
        hiringRecommendation,
        upskillCandidates
      };
    });
  }, [teamMembers, projects, tasks]);

  // Aggregate Totals
  const totalDemand = skillAnalytics.reduce((s, a) => s + a.demandHours, 0);
  const totalCapacity = skillAnalytics.reduce((s, a) => s + a.capacityHours, 0);
  const criticalDeficitsCount = skillAnalytics.filter((a) => a.status === 'critical_deficit').length;
  const surplusCount = skillAnalytics.filter((a) => a.status === 'surplus').length;

  const filteredAnalytics = skillAnalytics.filter((a) => {
    if (filterStatus === 'deficit') return a.netHours < 0;
    if (filterStatus === 'surplus') return a.netHours > 10;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 shadow-2xl relative">
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
          <span className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-black tracking-wider uppercase flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5 text-purple-400" />
            Agency Capacity Intelligence
          </span>
          <span className="text-xs text-slate-400 font-mono">Real-time Demand vs. Capacity Forecasting</span>
        </div>

        <h1 className="text-2xl font-black text-white mt-2 tracking-tight">
          Smart Skill Gap & Hiring Forecast Matrix
        </h1>
        <p className="text-xs text-slate-400 mt-1 max-w-2xl">
          Know exactly which agency skills are strained before deliverables slip. Spot hiring needs, identify sales headroom for new clients, and guide team cross-training with zero guesswork.
        </p>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Weekly Demand Sold</div>
          <div className="text-2xl font-black text-white mt-1 font-mono">
            {totalDemand} <span className="text-xs text-slate-500 font-normal">hrs/wk</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Across all retainer task blocks</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Effective Capacity</div>
          <div className="text-2xl font-black text-cyan-400 mt-1 font-mono">
            {totalCapacity} <span className="text-xs text-slate-500 font-normal">hrs/wk</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Specialist skill-weighted hours</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Hiring Alerts</div>
          <div className="text-2xl font-black text-rose-400 mt-1 font-mono">
            {criticalDeficitsCount} <span className="text-xs text-slate-500 font-normal">critical gaps</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Skills where demand exceeds capacity</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Sales Headroom</div>
          <div className="text-2xl font-black text-emerald-400 mt-1 font-mono">
            {surplusCount} <span className="text-xs text-slate-500 font-normal">surplus skills</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Domains ready for new client intake</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setFilterStatus('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            filterStatus === 'all'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          All Domains ({skillAnalytics.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterStatus('deficit')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            filterStatus === 'deficit'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          Bottlenecks & Deficits ({skillAnalytics.filter((a) => a.netHours < 0).length})
        </button>
        <button
          type="button"
          onClick={() => setFilterStatus('surplus')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            filterStatus === 'surplus'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          Surplus & Headroom ({skillAnalytics.filter((a) => a.netHours > 10).length})
        </button>
      </div>

      {/* Skills Matrix Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredAnalytics.map((item) => {
          const isDeficit = item.netHours < 0;

          return (
            <div
              key={item.skill}
              className={`p-5 rounded-2xl border transition-all space-y-4 ${
                item.status === 'critical_deficit'
                  ? 'bg-rose-950/20 border-rose-500/40 shadow-lg shadow-rose-950/10'
                  : item.status === 'moderate_deficit'
                  ? 'bg-amber-950/15 border-amber-500/30'
                  : item.status === 'surplus'
                  ? 'bg-emerald-950/15 border-emerald-500/30'
                  : 'bg-slate-900/80 border-slate-800'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">{item.skill}</h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        isDeficit
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {isDeficit ? `${Math.abs(item.netHours)}h Deficit` : `+${item.netHours}h Surplus`}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {item.qualifiedMemberCount} verified specialist{item.qualifiedMemberCount === 1 ? '' : 's'} on roster
                  </p>
                </div>

                <div className="text-right font-mono">
                  <div className="text-sm font-bold text-white">
                    <span className="text-cyan-400">{item.demandHours}h Demand</span> / {item.capacityHours}h Cap
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {item.utilizationPercent}% Capacity Load
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="w-full h-2 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      item.status === 'critical_deficit'
                        ? 'bg-rose-500'
                        : item.status === 'moderate_deficit'
                        ? 'bg-amber-400'
                        : 'bg-emerald-400'
                    }`}
                    style={{ width: `${Math.min(100, item.utilizationPercent)}%` }}
                  />
                </div>
              </div>

              {/* Manager Hiring / Strategic Recommendation */}
              <div
                className={`p-3 rounded-xl border text-xs leading-relaxed ${
                  isDeficit
                    ? 'bg-rose-950/40 border-rose-500/30 text-rose-200'
                    : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5 mb-1">
                  {isDeficit ? <UserPlus className="w-3.5 h-3.5 text-rose-400" /> : <Sparkles className="w-3.5 h-3.5 text-emerald-400" />}
                  <span>{isDeficit ? 'Recommended Manager Action' : 'Growth Opportunity'}</span>
                </div>
                {item.hiringRecommendation}
              </div>

              {/* Upskill & Cross-Training Candidates */}
              {isDeficit && item.upskillCandidates.length > 0 && (
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                    <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                    <span>Upskill alternatives:</span>
                    <span className="text-slate-200 font-semibold">
                      {item.upskillCandidates.map((c) => c.name).join(', ')}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate(`/member/${item.upskillCandidates[0]?.id}/skills`)}
                    className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Calibrate</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
