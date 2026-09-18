import React, { useState, useMemo } from 'react';
import type { TeamMember, Task, TaskStatus } from '../types';
import type { ActiveProjectItem } from './VisualAgencyHub';
import { navigate } from '../utils/router';
import { toast as sonnerToast } from 'sonner';
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
  Award
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

  // Retrieve projects from props or fallback to localStorage
  const projects: ActiveProjectItem[] = useMemo(() => {
    if (passedProjects && passedProjects.length > 0) return passedProjects;
    try {
      const saved = localStorage.getItem('vat_projects_list_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  }, [passedProjects]);

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
    return projects.filter(
      (p) =>
        p.projectLeadId === member.id ||
        p.clientCallAssigneeId === member.id ||
        p.members?.some((m) => m.id === member.id)
    );
  }, [projects, member.id]);

  // Tasks assigned to member
  const memberTasks = useMemo(() => {
    return allTasks.filter((t) => t.assignedUserId === member.id);
  }, [allTasks, member.id]);

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

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
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
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200">
              Active Projects Involving {member.name} ({memberProjects.length})
            </h3>
            <span className="text-xs text-slate-400">
              {assignedHours} estimated allocated hours
            </span>
          </div>

          {memberProjects.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/60 rounded-2xl border border-slate-800 text-slate-400">
              <Briefcase className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-semibold">No active projects assigned to {member.name}.</p>
              <p className="text-xs text-slate-500 mt-1">Assign this member as Team Lead, Call Lead, or Specialist on the Projects dashboard.</p>
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
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-200">
                Tasks Assigned to {member.name} ({filteredTasks.length})
              </h3>
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
            <div className="p-8 text-center bg-slate-900/60 rounded-2xl border border-slate-800 text-slate-400">
              <CheckCircle2 className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-semibold">No tasks found under filter "{taskStatusFilter}".</p>
              <p className="text-xs text-slate-500 mt-1">Assign sprint deliverables or sync ClickUp tasks for {member.name}.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTasks.map((t) => (
                <div
                  key={t.id}
                  className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
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
                      <span className={`px-2 py-0.2 rounded text-[10px] font-bold ${
                        t.priority === 'High' ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {t.priority}
                      </span>
                    </div>

                    <div className="text-sm font-bold text-white">
                      {t.title}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>Est: <strong className="text-slate-200 font-mono">{t.estimatedHours}h</strong></span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>Due: {t.dueDate}</span>
                      </span>
                      {t.clickUpTaskId && (
                        <a
                          href={t.clickUpUrl || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-purple-400 hover:text-purple-300 font-bold underline text-[11px]"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>ClickUp #{t.clickUpTaskId}</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Status Toggle Controls */}
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={t.status}
                      onChange={(e) => {
                        const newStatus = e.target.value as TaskStatus;
                        onUpdateTaskStatus?.(t.id, newStatus);
                        sonnerToast.success(`Updated task status to ${newStatus}`);
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
    </div>
  );
};
