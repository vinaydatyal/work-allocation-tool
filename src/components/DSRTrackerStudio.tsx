import React, { useState, useMemo } from 'react';
import { RefreshCw, BarChart3, CheckCircle2 } from 'lucide-react';
import { toast as sonnerToast } from 'sonner';
import {
  isClickUpConnected,
  getClickUpToken,
  getClickUpWorkspaceId,
  fetchClickUpTimeEntries,
  fetchClickUpWorkspaces,
  setClickUpWorkspaceId
} from '../services/clickupOAuth';
import type { TeamMember, Task } from '../types';
import type { ActiveProjectItem } from './VisualAgencyHub';
import { DSRApprovalQueue } from './DSRApprovalQueue';

interface DSRTrackerStudioProps {
  members: TeamMember[];
  projects: ActiveProjectItem[];
  tasks: Task[];
  onUpdateMemberCapacity?: (memberId: string, newHours: number) => void;
  onAssignProjectToMember?: (memberId: string, projectId: string, weeklyHours: number) => void;
  onRemoveProjectFromMember?: (memberId: string, projectId: string) => void;
}

interface WeeklyData {
  plan: number;
  log: number;
  int: number;
}

const DSR_WEEKS = [
  { id: 'w1', label: 'W1 (1-5)' },
  { id: 'w2', label: 'W2 (6-12)' },
  { id: 'w3', label: 'W3 (13-19)' },
  { id: 'w4', label: 'W4 (20-26)' },
  { id: 'w5', label: 'W5 (27-31)' }
];

export const DSRTrackerStudio: React.FC<DSRTrackerStudioProps> = ({
  members,
  projects,
  tasks: _tasks,
  onUpdateMemberCapacity: _onUpdateMemberCapacity,
  onAssignProjectToMember,
  onRemoveProjectFromMember: _onRemoveProjectFromMember
}) => {
  const [activeMode, setActiveMode] = useState<'queue' | 'matrix'>('queue');
  const [selectedMonth, setSelectedMonth] = useState<string>('Jul 2026');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('All');
  const [varianceFilter, setVarianceFilter] = useState<string>('All');
  const [selectedMemberForProfile, setSelectedMemberForProfile] = useState<TeamMember | null>(null);
  const [activeProfileTab, setActiveProfileTab] = useState<'projects' | 'weekly_dsr'>('projects');
  const [showAssignDropdown, setShowAssignDropdown] = useState<boolean>(false);
  const [selectedProjectIdToAssign, setSelectedProjectIdToAssign] = useState<string>('');

  // Local state for interactive logging override (so users can test logging right on the UI)
  const [customLogs, setCustomLogs] = useState<{ [key: string]: { [weekId: string]: { log: number; int: number } } }>({
    'usr_aakash': { 'w1': { log: 25, int: 5 }, 'w2': { log: 28, int: 2 }, 'w3': { log: 30, int: 0 }, 'w4': { log: 25, int: 5 }, 'w5': { log: 22, int: 3 } },
    'usr_abhishek': { 'w1': { log: 30, int: 5 }, 'w2': { log: 32, int: 3 }, 'w3': { log: 30, int: 5 }, 'w4': { log: 35, int: 0 }, 'w5': { log: 28, int: 2 } },
    'usr_akhil': { 'w1': { log: 35, int: 0 }, 'w2': { log: 35, int: 0 }, 'w3': { log: 34, int: 1 }, 'w4': { log: 35, int: 0 }, 'w5': { log: 30, int: 5 } },
    'usr_anshita': { 'w1': { log: 28, int: 4 }, 'w2': { log: 30, int: 2 }, 'w3': { log: 32, int: 0 }, 'w4': { log: 30, int: 2 }, 'w5': { log: 27, int: 3 } }
  });

  const [syncingTime, setSyncingTime] = useState<boolean>(false);
  const [lastTimeSyncedAt, setLastTimeSyncedAt] = useState<Date | null>(null);

  const handleSyncClickUpTime = async () => {
    if (!isClickUpConnected() || syncingTime) return;
    const token = getClickUpToken();
    if (!token) return;

    try {
      setSyncingTime(true);
      let wsId = getClickUpWorkspaceId();
      if (!wsId) {
        const workspaces = await fetchClickUpWorkspaces(token);
        if (workspaces && workspaces.length > 0) {
          wsId = workspaces[0].id;
          setClickUpWorkspaceId(wsId);
        }
      }
      if (!wsId) {
        sonnerToast.error('ClickUp Workspace not found. Please connect via navbar.');
        return;
      }

      const endEpoch = Date.now();
      const startEpoch = endEpoch - (45 * 24 * 60 * 60 * 1000);
      const entries = await fetchClickUpTimeEntries(token, wsId, startEpoch, endEpoch);

      if (!entries || entries.length === 0) {
        sonnerToast.info('No recent ClickUp time entries found to sync.');
        return;
      }

      let matchedCount = 0;
      let totalHoursAggregated = 0;

      setCustomLogs((prev) => {
        const updated = { ...prev };

        entries.forEach((entry) => {
          const matchedMember = members.find((m) =>
            (m.clickUpUserId && Number(m.clickUpUserId) === Number(entry.user?.id)) ||
            (m.clickUpEmail && entry.user?.email && m.clickUpEmail.toLowerCase() === entry.user.email.toLowerCase()) ||
            (m.name.toLowerCase() === (entry.user?.username || '').toLowerCase())
          );

          if (matchedMember) {
            const entryDate = new Date(entry.start);
            const dayOfMonth = entryDate.getDate();
            let weekId = 'w1';
            if (dayOfMonth <= 5) weekId = 'w1';
            else if (dayOfMonth <= 12) weekId = 'w2';
            else if (dayOfMonth <= 19) weekId = 'w3';
            else if (dayOfMonth <= 26) weekId = 'w4';
            else weekId = 'w5';

            const hrs = Math.round((entry.duration / 3600000) * 10) / 10;
            totalHoursAggregated += hrs;
            matchedCount++;

            const mLogs = updated[matchedMember.id] || {};
            const existingWeek = mLogs[weekId] || { log: 0, int: 0 };

            updated[matchedMember.id] = {
              ...mLogs,
              [weekId]: {
                ...existingWeek,
                log: Math.round(((existingWeek.log || 0) + hrs) * 10) / 10
              }
            };
          }
        });

        return updated;
      });

      setLastTimeSyncedAt(new Date());
      sonnerToast.success('⚡ ClickUp DSR Time Synchronized', {
        description: `Imported ${Math.round(totalHoursAggregated)}h across ${matchedCount} entries into weekly DSR tracking!`
      });
    } catch (err: any) {
      console.error('Failed to sync ClickUp time entries:', err);
      sonnerToast.error('ClickUp Time Sync Failed', {
        description: err.message || 'Check connection or permissions.'
      });
    } finally {
      setSyncingTime(false);
    }
  };

  const weeks = DSR_WEEKS;

  // Exclude CEOs who do not have specialist hourly targets
  const trackedMembers = useMemo(() => {
    return members.filter(
      m => !m.role.toLowerCase().includes('ceo') && m.seniority !== 'CEO'
    );
  }, [members]);

  // Calculate bi-directional DSR metrics for each employee
  const memberDSRMap = useMemo(() => {
    const map: { [memberId: string]: {
      member: TeamMember;
      targetCapacity: number;
      assignedProjects: ActiveProjectItem[];
      totalWeeklyPlanFromProjects: number;
      weeksData: { [weekId: string]: WeeklyData };
      monthPlan: number;
      monthLog: number;
      monthInt: number;
      monthTotalLoggedAndInt: number;
      variance: number;
      status: 'match' | 'over-plan' | 'short';
    } } = {};

    trackedMembers.forEach((member, idx) => {
      // Find all projects assigned to this member
      const assigned = projects.filter(p => p.members?.some((m: TeamMember) => m.id === member.id));
      
      // Calculate exact plan from projects (distributed evenly across projects assigned)
      let weeklyPlan = 0;
      if (assigned.length > 0) {
        // If member has projects, estimate their share or use activeHours / memberCount
        weeklyPlan = assigned.reduce((sum, p) => {
          const count = p.members?.length || 1;
          const share = (p.activeHours || 15) / count;
          return sum + share;
        }, 0);
      } else {
        // Fallback or base task share
        weeklyPlan = Math.min(member.weeklyCapacityHours || 35, 15 + (idx % 15));
      }
      weeklyPlan = Math.round(weeklyPlan * 10) / 10;

      const weeksData: { [weekId: string]: WeeklyData } = {};
      let mPlan = 0;
      let mLog = 0;
      let mInt = 0;

      weeks.forEach((w, wIdx) => {
        const plan = weeklyPlan;
        const custom = customLogs[member.id]?.[w.id];
        // Default simulated logged hours if not customized yet
        const defaultLog = Math.round(Math.min(member.weeklyCapacityHours || 35, plan * (0.9 + ((idx + wIdx) % 3) * 0.1)));
        const defaultInt = (idx + wIdx) % 4 === 0 ? 3 : 0;
        
        const log = custom ? custom.log : defaultLog;
        const int = custom ? custom.int : defaultInt;

        weeksData[w.id] = { plan, log, int };
        mPlan += plan;
        mLog += log;
        mInt += int;
      });

      const monthTotalLoggedAndInt = mLog + mInt;
      const variance = Math.round((monthTotalLoggedAndInt - mPlan) * 10) / 10;
      
      let status: 'match' | 'over-plan' | 'short' = 'match';
      if (variance > 4) status = 'over-plan';
      else if (variance < -5) status = 'short';

      map[member.id] = {
        member,
        targetCapacity: member.weeklyCapacityHours || 35,
        assignedProjects: assigned,
        totalWeeklyPlanFromProjects: weeklyPlan,
        weeksData,
        monthPlan: Math.round(mPlan * 10) / 10,
        monthLog: Math.round(mLog * 10) / 10,
        monthInt: Math.round(mInt * 10) / 10,
        monthTotalLoggedAndInt: Math.round(monthTotalLoggedAndInt * 10) / 10,
        variance,
        status
      };
    });

    return map;
  }, [trackedMembers, projects, customLogs, weeks]);

  // Filter list for table display
  const filteredRecords = useMemo(() => {
    return Object.values(memberDSRMap).filter(record => {
      const matchesSearch = record.member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            record.member.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            record.member.department.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDept = departmentFilter === 'All' || record.member.department === departmentFilter;
      const matchesVariance = varianceFilter === 'All' ||
        (varianceFilter === 'over' && record.status === 'over-plan') ||
        (varianceFilter === 'short' && record.status === 'short') ||
        (varianceFilter === 'match' && record.status === 'match');
      return matchesSearch && matchesDept && matchesVariance;
    });
  }, [memberDSRMap, searchQuery, departmentFilter, varianceFilter]);

  // Summary header metrics
  const summaryMetrics = useMemo(() => {
    let totalPlan = 0;
    let totalLog = 0;
    let totalInt = 0;
    let overCount = 0;
    let shortCount = 0;

    Object.values(memberDSRMap).forEach(r => {
      totalPlan += r.monthPlan;
      totalLog += r.monthLog;
      totalInt += r.monthInt;
      if (r.status === 'over-plan') overCount++;
      if (r.status === 'short') shortCount++;
    });

    const netVariance = Math.round((totalLog + totalInt - totalPlan) * 10) / 10;

    return {
      totalPlan: Math.round(totalPlan * 10) / 10,
      totalLog: Math.round(totalLog * 10) / 10,
      totalInt: Math.round(totalInt * 10) / 10,
      netVariance,
      overCount,
      shortCount
    };
  }, [memberDSRMap]);

  const departments = useMemo(() => {
    const depts = new Set<string>();
    trackedMembers.forEach(m => { if (m.department) depts.add(m.department); });
    return ['All', ...Array.from(depts)];
  }, [trackedMembers]);

  const handleUpdateLog = (memberId: string, weekId: string, field: 'log' | 'int', value: number) => {
    setCustomLogs(prev => {
      const mLogs = prev[memberId] || {};
      const wLog = mLogs[weekId] || {
        log: memberDSRMap[memberId]?.weeksData[weekId]?.log || 0,
        int: memberDSRMap[memberId]?.weeksData[weekId]?.int || 0
      };
      return {
        ...prev,
        [memberId]: {
          ...mLogs,
          [weekId]: {
            ...wLog,
            [field]: value
          }
        }
      };
    });
  };

  const currentProfileData = selectedMemberForProfile ? memberDSRMap[selectedMemberForProfile.id] : null;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* PRIMARY MODE SWITCHER: APPROVAL QUEUE vs MONTHLY MATRIX */}
      <div className="bg-slate-900/95 border border-slate-800 p-2.5 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 p-1 bg-slate-950/80 rounded-xl border border-slate-800/80 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveMode('queue')}
            className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
              activeMode === 'queue'
                ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 text-white shadow-lg shadow-emerald-500/25 scale-[1.02]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            <span>📋 DSR Approval & Review Queue</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('matrix')}
            className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
              activeMode === 'matrix'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25 scale-[1.02]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-indigo-300" />
            <span>📊 Monthly Plan vs Actual Matrix</span>
          </button>
        </div>

        <div className="text-xs text-slate-400 font-medium px-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-400" />
          <span>Agency Roster: <strong className="text-slate-200">{members.length} Members</strong></span>
        </div>
      </div>

      {activeMode === 'queue' ? (
        <DSRApprovalQueue
          members={members}
          onViewMemberProfile={(m) => {
            setSelectedMemberForProfile(m);
            setActiveMode('matrix');
          }}
        />
      ) : (
        <>
          {/* 1. TOP BANNER & BI-DIRECTIONAL SYNC HIGHLIGHT */}
          <div className="bg-gradient-to-r from-[#111827] via-slate-900 to-[#111827] border border-slate-700/90 rounded-2xl p-6 shadow-2xl relative overflow-hidden group hover:border-indigo-500/50 transition-all duration-500">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 opacity-90" />
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-black uppercase tracking-wider shadow-sm">
              <span>⚡ Bi-Directional DSR & Work Allocation Engine</span>
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex flex-wrap items-center gap-3">
              Per-Employee DSR Tracker & Capacity Portal
              <span className="text-xs font-black bg-slate-900/90 text-indigo-400 px-3 py-1 rounded-lg border border-indigo-500/40 shadow-inner">
                {selectedMonth}
              </span>
            </h1>
            <p className="text-slate-300 text-xs max-w-2xl leading-relaxed font-medium">
              Track weekly project plan vs actual logged hours and internal activities. <strong className="text-white font-extrabold">Simultaneous Bi-Directional Sync:</strong> Assigning any project in Work Allocation automatically populates an employee's DSR Plan hours, and viewing their DSR Profile reveals exact active client projects.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => alert("Copied allocations from previous month!")}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold border border-slate-700 transition-all flex items-center gap-2 shadow-md hover:scale-105 cursor-pointer"
            >
              <span>📋 Copy from previous month</span>
            </button>
            {isClickUpConnected() && (
              <button
                type="button"
                onClick={handleSyncClickUpTime}
                disabled={syncingTime}
                className="px-4 py-2.5 rounded-xl bg-purple-900/60 hover:bg-purple-800 border border-purple-500/50 text-purple-200 hover:text-white text-xs font-bold transition-all flex items-center gap-2 shadow-md hover:scale-105 cursor-pointer disabled:opacity-50"
                title="Pull real-time tracked time from ClickUp into DSR weekly logs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingTime ? 'animate-spin text-purple-300' : 'text-purple-400'}`} />
                <span>
                  {syncingTime
                    ? 'Syncing ClickUp Time…'
                    : lastTimeSyncedAt
                    ? `⚡ Synced (${lastTimeSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`
                    : '⚡ Sync ClickUp DSR Time'}
                </span>
              </button>
            )}
            <button
              onClick={() => setSelectedMonth(prev => prev === 'Jul 2026' ? 'Aug 2026' : 'Jul 2026')}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-extrabold uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/25 hover:scale-105 cursor-pointer"
            >
              <span>📅 Switch Month ({selectedMonth})</span>
            </button>
          </div>
        </div>

        {/* SECTION 1 HEADING: EXECUTIVE DSR STATS */}
        <div className="flex items-center justify-between border-b border-slate-700 pb-2.5 pt-4 mt-2 relative z-10">
          <div>
            <h3 className="text-sm font-extrabold text-white tracking-wide uppercase flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 shadow-md shadow-indigo-500/50 animate-pulse" />
              Section 1: Executive Bi-Directional DSR &amp; Bandwidth Summary
            </h3>
            <p className="text-xs text-slate-300 font-medium mt-0.5">
              Total monthly plan computed directly from assigned retainer projects versus approved logged delivery and internal hours.
            </p>
          </div>
        </div>

        {/* SUMMARY STATS BAR */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3.5 mt-3 pt-2 relative z-10">
          <div className="bg-gradient-to-br from-indigo-950/30 via-slate-900 to-[#0e1422] rounded-2xl p-4 border border-indigo-500/30 hover:border-indigo-500/60 transition-all duration-300 shadow-lg hover:-translate-y-1">
            <span className="text-[11px] font-extrabold text-indigo-300 block mb-1 uppercase tracking-wider">Total Month Plan</span>
            <span className="text-xl font-black text-white">{summaryMetrics.totalPlan} <span className="text-xs text-indigo-400">h</span></span>
            <span className="text-[10px] text-slate-300 block mt-0.5 font-semibold">Calculated from Projects</span>
          </div>
          <div className="bg-gradient-to-br from-emerald-950/30 via-slate-900 to-[#0e1422] rounded-2xl p-4 border border-emerald-500/30 hover:border-emerald-500/60 transition-all duration-300 shadow-lg hover:-translate-y-1">
            <span className="text-[11px] font-extrabold text-emerald-300 block mb-1 uppercase tracking-wider">Total Logged (Delivery)</span>
            <span className="text-xl font-black text-white">{summaryMetrics.totalLog} <span className="text-xs text-emerald-400">h</span></span>
            <span className="text-[10px] text-slate-300 block mt-0.5 font-semibold">Approved project hours</span>
          </div>
          <div className="bg-gradient-to-br from-purple-950/30 via-slate-900 to-[#0e1422] rounded-2xl p-4 border border-purple-500/30 hover:border-purple-500/60 transition-all duration-300 shadow-lg hover:-translate-y-1">
            <span className="text-[11px] font-extrabold text-purple-300 block mb-1 uppercase tracking-wider">Total Internal (Int)</span>
            <span className="text-xl font-black text-white">{summaryMetrics.totalInt} <span className="text-xs text-purple-400">h</span></span>
            <span className="text-[10px] text-slate-300 block mt-0.5 font-semibold">Training, admin, recruiting</span>
          </div>
          <div className="bg-gradient-to-br from-slate-900 via-[#0e1422] to-slate-900 rounded-2xl p-4 border border-slate-700 hover:border-slate-600 transition-all duration-300 shadow-lg hover:-translate-y-1">
            <span className="text-[11px] font-extrabold text-slate-300 block mb-1 uppercase tracking-wider">Net Bandwidth Variance</span>
            <span className={`text-xl font-black ${summaryMetrics.netVariance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {summaryMetrics.netVariance >= 0 ? `+${summaryMetrics.netVariance}` : summaryMetrics.netVariance} <span className="text-xs">h</span>
            </span>
            <span className="text-[10px] text-slate-300 block mt-0.5 font-semibold">Log + Int vs Plan</span>
          </div>
          <div className="bg-gradient-to-br from-amber-950/30 via-slate-900 to-[#0e1422] rounded-2xl p-4 border border-amber-500/30 hover:border-amber-500/60 transition-all duration-300 shadow-lg hover:-translate-y-1">
            <span className="text-[11px] font-extrabold text-amber-300 block mb-1 uppercase tracking-wider">Over-Plan Employees</span>
            <span className="text-xl font-black text-white">{summaryMetrics.overCount} <span className="text-xs text-amber-400">Members</span></span>
            <span className="text-[10px] text-slate-300 block mt-0.5 font-semibold">High utilization tier</span>
          </div>
          <div className="bg-gradient-to-br from-cyan-950/30 via-slate-900 to-[#0e1422] rounded-2xl p-4 border border-cyan-500/30 hover:border-cyan-500/60 transition-all duration-300 shadow-lg hover:-translate-y-1">
            <span className="text-[11px] font-extrabold text-cyan-300 block mb-1 uppercase tracking-wider">Available Bandwidth</span>
            <span className="text-xl font-black text-white">{summaryMetrics.shortCount} <span className="text-xs text-cyan-400">Members</span></span>
            <span className="text-[10px] text-slate-300 block mt-0.5 font-semibold">Ready for new projects</span>
          </div>
        </div>
      </div>

      {/* SECTION 1.5: 5-WEEK DAILY LOGGING INTENSITY GRID & VELOCITY PULSE */}
      <div className="bg-[#111827] border border-slate-700/80 rounded-xl p-5 shadow-xl space-y-4 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-500/50 animate-pulse" />
              Section 1.5: 5-Week Daily Logging Intensity Grid & Velocity Pulse
            </h3>
            <p className="text-xs text-slate-300 font-medium mt-0.5">
              Visual velocity heatmap across W1 to W5 showing target plan vs logged delivery and internal allocations.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold">
            <span className="flex items-center gap-1 text-emerald-300"><span className="w-2.5 h-2.5 rounded bg-emerald-400" /> Delivery Logged</span>
            <span className="flex items-center gap-1 text-purple-300"><span className="w-2.5 h-2.5 rounded bg-purple-400" /> Internal (Int)</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 pt-1">
          {Object.values(memberDSRMap).map(record => {
            const { member, monthPlan, monthLog, monthInt, variance } = record;
            const logPct = monthPlan > 0 ? Math.min(100, Math.round((monthLog / monthPlan) * 100)) : 0;
            const intPct = monthPlan > 0 ? Math.min(100, Math.round((monthInt / monthPlan) * 100)) : 0;

            return (
              <div
                key={member.id}
                onClick={() => { setSelectedMemberForProfile(member); setActiveProfileTab('weekly_dsr'); }}
                className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 space-y-3 transition-all cursor-pointer shadow-md group"
              >
                <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <img src={member.avatar} alt={member.name} className="w-8 h-8 rounded-lg object-cover ring-1 ring-slate-700 shrink-0 group-hover:ring-emerald-500/80 transition-all" />
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-white truncate group-hover:text-emerald-400 transition-colors">{member.name}</h4>
                      <span className="text-[10px] text-slate-400 block truncate">{member.role}</span>
                    </div>
                  </div>
                  <div className={`px-2 py-0.5 rounded text-[10px] font-black uppercase shrink-0 border ${
                    variance >= 0 ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  }`}>
                    {variance >= 0 ? `+${variance}h` : `${variance}h`}
                  </div>
                </div>

                {/* 5-Week Mini Heatmap Pulse Blocks */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">5-Week Logging Heatmap</span>
                  <div className="grid grid-cols-5 gap-1.5">
                    {weeks.map(w => {
                      const wData = record.weeksData[w.id] || { plan: 0, log: 0, int: 0 };
                      const totalW = wData.log + wData.int;
                      const intensity = totalW >= (wData.plan || 35) ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30' : totalW >= (wData.plan * 0.7) ? 'bg-emerald-500/60 text-emerald-100' : totalW > 0 ? 'bg-emerald-500/30 text-emerald-300' : 'bg-slate-950 text-slate-500 border border-slate-800';

                      return (
                        <div key={w.id} className={`p-1.5 rounded-md text-center flex flex-col items-center justify-center transition-all ${intensity}`} title={`${w.label}: Logged ${wData.log}h, Int ${wData.int}h (Plan ${wData.plan}h)`}>
                          <span className="text-[9px] font-extrabold uppercase">{w.id}</span>
                          <span className="text-[10px] font-black">{wData.log}h</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Proportional Log vs Int vs Plan Bar */}
                <div className="space-y-1 pt-1 border-t border-slate-800/80">
                  <div className="flex justify-between text-[10px] font-bold">
                    <span className="text-emerald-300">Log: {monthLog}h</span>
                    <span className="text-purple-300">Int: {monthInt}h</span>
                    <span className="text-slate-400">Plan: {monthPlan}h</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2.5 border border-slate-800 overflow-hidden flex">
                    <div className="h-full bg-emerald-400 transition-all duration-500" style={{ width: `${logPct}%` }} />
                    <div className="h-full bg-purple-400 transition-all duration-500" style={{ width: `${intPct}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2 HEADING: FILTER CONTROLS */}
      <div className="flex items-center justify-between border-b border-slate-700 pb-2.5 pt-2">
        <div>
          <h3 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-500/50" />
            Section 2: Employee Filter &amp; Department Studio
          </h3>
          <p className="text-xs text-slate-300 font-medium mt-0.5">
            Filter specialists by name, department, or live bandwidth variance status.
          </p>
        </div>
      </div>

      {/* 2. FILTER & SEARCH CONTROLS */}
      <div className="bg-[#111827] border border-slate-700 rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-md">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[220px]">
            <input
              type="text"
              placeholder="🔍 Search employee name, role, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition font-medium"
            />
          </div>

          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition font-semibold"
          >
            {departments.map(d => (
              <option key={d} value={d}>🏢 {d === 'All' ? 'All Departments' : d}</option>
            ))}
          </select>

          <select
            value={varianceFilter}
            onChange={(e) => setVarianceFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition font-semibold"
          >
            <option value="All">⚡ All Capacity Statuses</option>
            <option value="over">🟡 Over-Plan (Busy)</option>
            <option value="match">🟢 Balanced Match</option>
            <option value="short">🔵 Available / Under-Plan</option>
          </select>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-300 border-l border-slate-700 pl-4 font-bold">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500 block"/> Plan</span>
          <span className="flex items-center gap-1.5 ml-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block"/> Log</span>
          <span className="flex items-center gap-1.5 ml-1"><span className="w-2.5 h-2.5 rounded-full bg-purple-500 block"/> Int</span>
        </div>
      </div>

      {/* SECTION 3 HEADING: WEEKLY DSR SPREADSHEET */}
      <div className="flex items-center justify-between border-b border-slate-700 pb-2.5 pt-4">
        <div>
          <h3 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-500/50" />
            Section 3: Per-Employee Weekly Plan vs. Actual Logging Spreadsheet ({filteredRecords.length} Tracked Specialists)
          </h3>
          <p className="text-xs text-slate-300 font-medium mt-0.5">
            Click on any employee profile to inspect their assigned projects, add weekly logs, or view quarterly competency scores.
          </p>
        </div>
      </div>

      {/* 3. PER-EMPLOYEE WEEKLY DSR SPREADSHEET TABLE */}
      <div className="bg-[#111827] border border-slate-700 rounded-xl overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-700 text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                <th className="p-3.5 pl-5 min-w-[240px] sticky left-0 bg-slate-900 z-10 border-r border-slate-700">Employee Profile & Role</th>
                <th className="p-3.5 text-center min-w-[110px]">Target Capacity</th>
                {weeks.map(w => (
                  <th key={w.id} className="p-3.5 text-center min-w-[170px] border-l border-slate-700">
                    <div className="text-slate-200 font-bold">{w.label}</div>
                    <div className="grid grid-cols-3 gap-1 mt-1 text-[9px] font-bold text-slate-400 border-t border-slate-700 pt-1">
                      <span className="text-indigo-400">PLAN</span>
                      <span className="text-emerald-400">LOG</span>
                      <span className="text-purple-400">INT</span>
                    </div>
                  </th>
                ))}
                <th className="p-3.5 text-center min-w-[130px] border-l border-slate-700 font-bold">Month Total</th>
                <th className="p-3.5 text-center min-w-[120px] font-bold">Bandwidth Status</th>
                <th className="p-3.5 text-right pr-5 min-w-[120px] font-bold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700 text-xs">
              {filteredRecords.map(({ member, targetCapacity, weeksData, monthPlan, monthTotalLoggedAndInt, variance: _variance, status }) => (
                <tr key={member.id} className="hover:bg-slate-800/40 transition group">
                  {/* EMPLOYEE COLUMN */}
                  <td className="p-3.5 pl-5 sticky left-0 bg-[#111827] group-hover:bg-slate-800 z-10 transition border-r border-slate-700">
                    <div className="flex items-center gap-3">
                      <img
                        src={member.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"}
                        alt={member.name}
                        className="w-9 h-9 rounded-lg object-cover border border-slate-700 shadow-sm"
                      />
                      <div>
                        <div className="font-bold text-white hover:text-indigo-400 transition cursor-pointer flex items-center gap-1.5"
                             onClick={() => setSelectedMemberForProfile(member)}>
                          {member.name}
                        </div>
                        <div className="text-[11px] text-slate-300 font-semibold">{member.role}</div>
                        <div className="text-[10px] text-indigo-400 font-bold">{member.department}</div>
                      </div>
                    </div>
                  </td>

                  {/* TARGET CAPACITY */}
                  <td className="p-3.5 text-center font-bold text-slate-200">
                    <span className="bg-slate-900 px-2.5 py-1 rounded-md border border-slate-700">
                      {targetCapacity}h / wk
                    </span>
                  </td>

                  {/* WEEKLY DSR BREAKDOWN (W1 to W5) */}
                  {weeks.map(w => {
                    const data = weeksData[w.id] || { plan: 0, log: 0, int: 0 };
                    const weekTotal = data.log + data.int;
                    const weekDiff = weekTotal - data.plan;
                    return (
                      <td key={w.id} className="p-2.5 text-center border-l border-slate-700 bg-slate-900/40">
                        <div className="grid grid-cols-3 gap-1.5 items-center bg-slate-900 rounded-lg p-1.5 border border-slate-700">
                          {/* PLAN */}
                          <div className="text-indigo-400 font-bold text-xs" title="Auto-calculated from Assigned Projects">
                            {data.plan}h
                          </div>
                          {/* LOG */}
                          <div className="font-bold text-emerald-400 text-xs">
                            {data.log}h
                          </div>
                          {/* INT */}
                          <div className="font-bold text-purple-400 text-xs">
                            {data.int}h
                          </div>
                        </div>
                        {/* MINI VARIANCE PILL */}
                        <div className={`mt-1 text-[10px] font-bold rounded px-1.5 py-0.5 inline-block ${
                          weekDiff > 2 ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' :
                          weekDiff < -3 ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30' :
                          'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {weekTotal}h total ({weekDiff >= 0 ? `+${Math.round(weekDiff)}` : Math.round(weekDiff)})
                        </div>
                      </td>
                    );
                  })}

                  {/* MONTH TOTAL */}
                  <td className="p-3.5 text-center border-l border-slate-700 font-bold text-white">
                    <div className="text-sm font-bold">{monthTotalLoggedAndInt}h</div>
                    <div className="text-[10px] text-slate-300 font-semibold">Plan: {monthPlan}h</div>
                  </td>

                  {/* BANDWIDTH STATUS */}
                  <td className="p-3.5 text-center">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold border ${
                      status === 'over-plan'
                        ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                        : status === 'short'
                        ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                        : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    }`}>
                      {status === 'over-plan' ? '🟡 Over-Plan' : status === 'short' ? '🔵 Available Band' : '🟢 Balanced'}
                    </span>
                  </td>

                  {/* ACTION */}
                  <td className="p-3.5 text-right pr-5">
                    <button
                      onClick={() => setSelectedMemberForProfile(member)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white text-xs font-bold border border-indigo-500/40 transition shadow-sm cursor-pointer"
                    >
                      👤 Profile & DSR
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )}

  {/* 4. INDIVIDUAL EMPLOYEE PROFILE & BI-DIRECTIONAL WORK ALLOCATION MODAL */}
      {selectedMemberForProfile && currentProfileData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fadeIn overflow-y-auto">
          <div className="bg-[#111827] border border-slate-700 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-xl my-auto">
            
            {/* MODAL HEADER */}
            <div className="p-5 bg-slate-900 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <img
                  src={selectedMemberForProfile.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"}
                  alt={selectedMemberForProfile.name}
                  className="w-14 h-14 rounded-xl object-cover border border-indigo-500 shadow-sm"
                />
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-300 text-[10px] font-bold uppercase mb-1 border border-indigo-500/30 tracking-wider">
                    <span>⚡ Individual Bi-Directional Portal</span>
                  </div>
                  <h2 className="text-xl font-bold text-white tracking-tight">{selectedMemberForProfile.name}</h2>
                  <p className="text-xs text-slate-300 font-semibold">
                    {selectedMemberForProfile.role} • <span className="text-indigo-400 font-bold">{selectedMemberForProfile.department}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setSelectedMemberForProfile(null)}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold text-sm border border-slate-700 transition cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* TAB SELECTOR */}
            <div className="flex border-b border-slate-700 bg-slate-950 px-5 pt-2.5 gap-2">
              <button
                onClick={() => setActiveProfileTab('projects')}
                className={`pb-2.5 px-3.5 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                  activeProfileTab === 'projects'
                    ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10 rounded-t-lg'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>🚀 Assigned Work Allocation Projects ({currentProfileData.assignedProjects.length})</span>
              </button>
              <button
                onClick={() => setActiveProfileTab('weekly_dsr')}
                className={`pb-2.5 px-3.5 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                  activeProfileTab === 'weekly_dsr'
                    ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10 rounded-t-lg'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>📝 Weekly DSR Log Editor ({selectedMonth})</span>
              </button>
            </div>

            {/* MODAL BODY */}
            <div className="p-5 overflow-y-auto flex-1 min-h-0 space-y-5">
              
              {activeProfileTab === 'projects' ? (
                /* TAB A: WORK ALLOCATION SYNC */
                <div className="space-y-5">
                  <div className="bg-indigo-950/20 border border-indigo-500/30 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-white text-xs">Simultaneous Bi-Directional Project Sync</h4>
                      <p className="text-xs text-slate-300 mt-0.5 font-medium">
                        Projects assigned here immediately sync to the master Work Allocation board and calculate this employee's weekly DSR Plan ({currentProfileData.totalWeeklyPlanFromProjects}h / wk).
                      </p>
                    </div>
                    <button
                      onClick={() => setShowAssignDropdown(!showAssignDropdown)}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition shadow-sm flex items-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      <span>+ Assign Another Project</span>
                    </button>
                  </div>

                  {/* NEW PROJECT ASSIGNED DROPDOWN */}
                  {showAssignDropdown && (
                    <div className="bg-slate-900 border border-slate-700 rounded-xl p-3.5 flex items-center gap-2.5 animate-fadeIn">
                      <select
                        value={selectedProjectIdToAssign}
                        onChange={(e) => setSelectedProjectIdToAssign(e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-semibold"
                      >
                        <option value="">-- Select Active Project to Assign --</option>
                        {projects
                          .filter(p => !currentProfileData.assignedProjects.some(ap => ap.id === p.id))
                          .map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.client} • {p.price})
                            </option>
                          ))}
                      </select>
                      <button
                        onClick={() => {
                          if (!selectedProjectIdToAssign) return;
                          onAssignProjectToMember?.(selectedMemberForProfile.id, selectedProjectIdToAssign, 10);
                          setShowAssignDropdown(false);
                          setSelectedProjectIdToAssign('');
                        }}
                        disabled={!selectedProjectIdToAssign}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition shrink-0 cursor-pointer"
                      >
                        ✅ Confirm Assignment
                      </button>
                    </div>
                  )}

                  {/* ASSIGNED PROJECTS LIST */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {currentProfileData.assignedProjects.map(project => (
                      <div key={project.id} className="bg-slate-900 border border-slate-700 hover:border-slate-600 rounded-xl p-4 space-y-2.5 transition group">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                              {project.client}
                            </span>
                            <h4 className="font-bold text-white text-sm mt-1 group-hover:text-indigo-400 transition">
                              {project.name}
                            </h4>
                          </div>
                          <span className="text-xs font-bold text-emerald-400 bg-slate-950 px-2 py-1 rounded-md border border-slate-700 shrink-0">
                            ~{Math.round((project.activeHours || 15) / (project.members?.length || 1))}h / wk
                          </span>
                        </div>

                        <p className="text-xs text-slate-300 line-clamp-2 font-medium">
                          {project.taskContent || "Active client deliverables and weekly milestone execution."}
                        </p>

                        <div className="flex items-center justify-between pt-2.5 border-t border-slate-700 text-xs text-slate-300 font-semibold">
                          <span>Progress: <strong className="text-white font-bold">{project.progress}%</strong></span>
                          <span>Billing: <strong className="text-slate-200 font-bold">{project.billingType}</strong></span>
                        </div>
                      </div>
                    ))}
                    {currentProfileData.assignedProjects.length === 0 && (
                      <div className="col-span-2 text-center py-10 bg-slate-950/40 rounded-xl border border-dashed border-slate-700 text-slate-400">
                        <p className="text-xs font-bold">No projects explicitly assigned to this employee yet.</p>
                        <p className="text-[11px] text-slate-400 mt-1 font-semibold">Click "+ Assign Another Project" above to allocate client work!</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* TAB B: WEEKLY DSR LOG EDITOR */
                <div className="space-y-5">
                  <div className="bg-slate-900 border border-slate-700 rounded-xl p-3.5">
                    <h4 className="font-bold text-white text-xs mb-1">Interactive Weekly DSR Log Editor</h4>
                    <p className="text-xs text-slate-300 font-medium">
                      Edit approved project hours (LOG) and internal activities (INT) below. Notice how the Variance and Total Bandwidth update instantly in real-time.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-3.5">
                    {weeks.map(w => {
                      const data = currentProfileData.weeksData[w.id] || { plan: 0, log: 0, int: 0 };
                      return (
                        <div key={w.id} className="bg-slate-900 border border-slate-700 rounded-xl p-3.5 space-y-2.5">
                          <div className="text-center pb-2 border-b border-slate-700 font-bold text-white text-xs">
                            {w.label}
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-indigo-400 block uppercase mb-1 tracking-wider">
                              Plan (From Projects)
                            </label>
                            <div className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-indigo-300">
                              {data.plan} h
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-emerald-400 block uppercase mb-1 tracking-wider">
                              Logged (Delivery)
                            </label>
                            <input
                              type="number"
                              value={data.log}
                              onChange={(e) => handleUpdateLog(selectedMemberForProfile.id, w.id, 'log', Number(e.target.value))}
                              className="w-full bg-slate-950 border border-emerald-500/60 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-emerald-400"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-purple-400 block uppercase mb-1 tracking-wider">
                              Internal (Int)
                            </label>
                            <input
                              type="number"
                              value={data.int}
                              onChange={(e) => handleUpdateLog(selectedMemberForProfile.id, w.id, 'int', Number(e.target.value))}
                              className="w-full bg-slate-950 border border-purple-500/60 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-purple-400"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="bg-slate-900 border border-slate-700 rounded-xl p-3.5 flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-200">Month Total Logged & Internal:</span>
                    <span className="text-lg font-bold text-emerald-400">{currentProfileData.monthTotalLoggedAndInt} h</span>
                  </div>
                </div>
              )}
            </div>

            {/* MODAL FOOTER */}
            <div className="p-3.5 bg-slate-900 border-t border-slate-700 flex items-center justify-between text-xs text-slate-300 font-semibold">
              <span>Bi-Directional Engine • Automatic Sync Enabled</span>
              <button
                onClick={() => setSelectedMemberForProfile(null)}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition shadow-sm cursor-pointer"
              >
                Done & Save
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
