import React, { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  Crown,
  GripVertical,
  Check,
  Search,
  Sparkles,
  ChevronDown,
  Lock,
  Layers,
  CheckCircle2,
  RefreshCw,
  Clock
} from 'lucide-react';
import type { AppUserProfile, UserRoleType, TeamMember, Task } from '../types';
import { supabase } from '../lib/supabase';
import { calculateMemberAllocatedHours } from '../utils/matchingEngine';

export interface PodData {
  id: string;
  name: string;
  color: string;
  description: string;
  teamLeadId: string | null;
  sortOrder: number;
}

export interface PodMember {
  id: string;
  name: string;
  roleType: UserRoleType;
  roleTitle: string;
  avatar: string;
  teamId: string;
  weeklyCapacityHours: number;
  presenceStatus?: 'active' | 'idle' | 'offline';
  pendingDsrCount?: number;
}

interface OrgMapStudioProps {
  currentProfile: AppUserProfile;
  teamMembers: TeamMember[];
  tasks: Task[];
  isWhiteTheme?: boolean;
  onUpdateMemberRole?: (memberId: string, newRole: UserRoleType) => void;
}

const DEFAULT_PODS: PodData[] = [
  {
    id: 'team_strategy',
    name: 'SEO & Strategy Pod',
    color: '#06B6D4', // Cyan
    description: 'High-impact enterprise accounts, AEO/GEO strategy, and technical roadmaps',
    teamLeadId: 'usr_priya',
    sortOrder: 0
  },
  {
    id: 'team_delivery',
    name: 'SEO & Delivery Pod',
    color: '#10B981', // Emerald
    description: 'On-page audits, technical fixes, backlink campaigns, and monthly deliverables',
    teamLeadId: 'usr_amrit',
    sortOrder: 1
  },
  {
    id: 'team_web',
    name: 'Web & Tech Pod',
    color: '#3B82F6', // Blue
    description: 'WordPress engineering, Core Web Vitals, and complex CMS site migrations',
    teamLeadId: 'usr_elena',
    sortOrder: 2
  },
  {
    id: 'team_operations',
    name: 'Operations & Management',
    color: '#F59E0B', // Amber
    description: 'Resource allocation, project coordination, workflow tracking, and billing',
    teamLeadId: 'usr_rohan',
    sortOrder: 3
  },
  {
    id: 'team_executive',
    name: 'Executive Leadership',
    color: '#6366F1', // Indigo
    description: 'Agency co-founders, long-term agency vision, and strategic partnerships',
    teamLeadId: 'usr_alex',
    sortOrder: 4
  }
];

const ROLE_CONFIG: Record<UserRoleType, { label: string; color: string; bg: string; icon: React.ComponentType<{ className?: string }> }> = {
  EXECUTIVE: {
    label: 'Executive',
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10 border-indigo-500/20',
    icon: Crown
  },
  PROJECT_MANAGER: {
    label: 'Project Manager',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
    icon: Shield
  },
  TEAM_LEAD: {
    label: 'Team Lead',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10 border-cyan-500/20',
    icon: Sparkles
  },
  COORDINATOR: {
    label: 'Coordinator',
    color: 'text-pink-400',
    bg: 'bg-pink-500/10 border-pink-500/20',
    icon: Layers
  },
  MEMBER: {
    label: 'Specialist',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    icon: Users
  }
};

export const OrgMapStudio: React.FC<OrgMapStudioProps> = ({
  currentProfile,
  teamMembers,
  tasks,
  isWhiteTheme = false,
  onUpdateMemberRole
}) => {
  const [pods, setPods] = useState<PodData[]>(DEFAULT_PODS);
  const [memberAssignments, setMemberAssignments] = useState<Record<string, string>>({});
  const [memberRoles, setMemberRoles] = useState<Record<string, UserRoleType>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [draggedMemberId, setDraggedMemberId] = useState<string | null>(null);
  const [dragOverPodId, setDragOverPodId] = useState<string | null>(null);
  const [editingRoleMemberId, setEditingRoleMemberId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');

  const canManage = currentProfile.permissions.canManageOrgMap;

  // Initialize member assignments and roles from teamMembers list
  useEffect(() => {
    const initialAssignments: Record<string, string> = {};
    const initialRoles: Record<string, UserRoleType> = {};

    teamMembers.forEach((m) => {
      // Determine initial pod based on department/seniority
      if (m.seniority === 'CEO' || m.department === 'Executive Leadership') {
        initialAssignments[m.id] = 'team_executive';
        initialRoles[m.id] = 'EXECUTIVE';
      } else if (m.role.includes('Operations Manager') || m.department === 'Operations & Management') {
        initialAssignments[m.id] = 'team_operations';
        initialRoles[m.id] = 'PROJECT_MANAGER';
      } else if (m.seniority === 'Project Coordinator') {
        initialAssignments[m.id] = 'team_operations';
        initialRoles[m.id] = 'COORDINATOR';
      } else if (m.seniority === 'Team Lead') {
        initialRoles[m.id] = 'TEAM_LEAD';
        if (m.name.includes('Amrit')) initialAssignments[m.id] = 'team_delivery';
        else if (m.name.includes('Vansh')) initialAssignments[m.id] = 'team_web';
        else if (m.name.includes('Khuvaish')) initialAssignments[m.id] = 'team_strategy';
        else if (m.department.includes('Web')) initialAssignments[m.id] = 'team_web';
        else if (m.department.includes('Strategy')) initialAssignments[m.id] = 'team_strategy';
        else initialAssignments[m.id] = 'team_delivery';
      } else {
        initialRoles[m.id] = 'MEMBER';
        if (m.department.includes('Web')) initialAssignments[m.id] = 'team_web';
        else if (m.department.includes('Strategy') || m.skills.includes('AEO (Answer Engine Opt)')) {
          initialAssignments[m.id] = 'team_strategy';
        } else {
          initialAssignments[m.id] = 'team_delivery';
        }
      }
    });

    setMemberAssignments(initialAssignments);
    setMemberRoles(initialRoles);

    // Attempt to load live org map from Supabase if table exists
    loadFromSupabase();
  }, [teamMembers]);

  const loadFromSupabase = async () => {
    try {
      const { data: dbTeams, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .order('sort_order', { ascending: true });

      if (teamsError || !dbTeams || dbTeams.length === 0) return;

      const loadedPods: PodData[] = dbTeams.map((t) => ({
        id: t.id,
        name: t.name,
        color: t.color || '#6366f1',
        description: t.description || '',
        teamLeadId: t.team_lead_id,
        sortOrder: t.sort_order
      }));
      setPods(loadedPods);

      // Load team members
      const { data: dbMembers } = await supabase.from('team_members').select('*');
      if (dbMembers && dbMembers.length > 0) {
        const assignments: Record<string, string> = {};
        dbMembers.forEach((row) => {
          assignments[row.member_id] = row.team_id;
        });
        setMemberAssignments((prev) => ({ ...prev, ...assignments }));
      }
    } catch (e) {
      // Supabase table not created yet; gracefully rely on local state
    }
  };

  const handleDragStart = (e: React.DragEvent, memberId: string) => {
    if (!canManage) return;
    setDraggedMemberId(memberId);
    e.dataTransfer.setData('text/plain', memberId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, podId: string) => {
    if (!canManage) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverPodId !== podId) {
      setDragOverPodId(podId);
    }
  };

  const handleDragLeave = () => {
    setDragOverPodId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetPodId: string) => {
    if (!canManage) return;
    e.preventDefault();
    setDragOverPodId(null);
    const memberId = e.dataTransfer.getData('text/plain') || draggedMemberId;
    if (!memberId) return;

    // Optimistic state update
    const previousPod = memberAssignments[memberId];
    if (previousPod === targetPodId) return;

    setMemberAssignments((prev) => ({ ...prev, [memberId]: targetPodId }));
    setDraggedMemberId(null);
    setSyncStatus('syncing');

    // Persist to Supabase if available
    try {
      await supabase
        .from('team_members')
        .delete()
        .eq('member_id', memberId);

      await supabase
        .from('team_members')
        .insert({ team_id: targetPodId, member_id: memberId, sort_order: 0 });

      await supabase
        .from('profiles')
        .update({ team_id: targetPodId })
        .eq('id', memberId);

      setSyncStatus('synced');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (err) {
      setSyncStatus('idle');
    }
  };

  const handleChangeRole = async (memberId: string, newRole: UserRoleType) => {
    if (!canManage) return;
    setMemberRoles((prev) => ({ ...prev, [memberId]: newRole }));
    setEditingRoleMemberId(null);
    if (onUpdateMemberRole) onUpdateMemberRole(memberId, newRole);

    try {
      await supabase
        .from('profiles')
        .update({ role_type: newRole })
        .eq('id', memberId);
    } catch (e) {
      // Ignored if local
    }
  };

  const handleSetTeamLead = async (podId: string, memberId: string) => {
    if (!canManage) return;
    setPods((prev) =>
      prev.map((p) => (p.id === podId ? { ...p, teamLeadId: memberId } : p))
    );
    // Also promote member to TEAM_LEAD if they are currently MEMBER
    if (memberRoles[memberId] === 'MEMBER') {
      handleChangeRole(memberId, 'TEAM_LEAD');
    }

    try {
      await supabase
        .from('teams')
        .update({ team_lead_id: memberId })
        .eq('id', podId);
    } catch (e) {}
  };

  // Filter members based on search
  const filteredMembers = teamMembers.filter((m) => {
    const q = searchQuery.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      m.role.toLowerCase().includes(q) ||
      m.department.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      {/* Header Banner */}
      <div
        className={`p-6 rounded-2xl border backdrop-blur-xl flex flex-col lg:flex-row lg:items-center justify-between gap-5 transition-all ${
          isWhiteTheme
            ? 'bg-white/90 border-slate-200 shadow-sm'
            : 'bg-slate-900/80 border-slate-800 shadow-xl'
        }`}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h1 className={`text-xl font-bold ${isWhiteTheme ? 'text-slate-900' : 'text-white'}`}>
                Org Map &amp; Pod Hierarchy Studio
              </h1>
              <p className={`text-xs ${isWhiteTheme ? 'text-slate-500' : 'text-slate-400'}`}>
                Interactive drag-and-drop team pod management • Defines DSR review routing and live presence visibility
              </p>
            </div>
          </div>
        </div>

        {/* Action Bar & Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search specialists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`pl-9 pr-3 py-1.5 rounded-xl text-xs font-medium border outline-none transition-all w-52 ${
                isWhiteTheme
                  ? 'bg-slate-100 border-slate-200 text-slate-800 focus:border-cyan-500'
                  : 'bg-slate-800/80 border-slate-700 text-slate-200 focus:border-cyan-400'
              }`}
            />
          </div>

          {/* Sync indicator */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border ${
              syncStatus === 'synced'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : syncStatus === 'syncing'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : isWhiteTheme
                ? 'bg-slate-100 border-slate-200 text-slate-600'
                : 'bg-slate-800/60 border-slate-700 text-slate-400'
            }`}
          >
            {syncStatus === 'syncing' ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : syncStatus === 'synced' ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
            <span>
              {syncStatus === 'syncing'
                ? 'Saving to Supabase...'
                : syncStatus === 'synced'
                ? 'Saved'
                : 'Supabase Connected'}
            </span>
          </div>

          {/* Permission Badge */}
          {!canManage && (
            <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-medium">
              <Lock className="w-3.5 h-3.5" />
              <span>Read-Only View</span>
            </div>
          )}
        </div>
      </div>

      {/* Drag Notice for Managers */}
      {canManage && (
        <div
          className={`px-4 py-2.5 rounded-xl border text-xs flex items-center justify-between gap-3 ${
            isWhiteTheme
              ? 'bg-cyan-50/70 border-cyan-200 text-cyan-800'
              : 'bg-cyan-950/30 border-cyan-500/30 text-cyan-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              <strong>Drag &amp; Drop Active:</strong> Grab any specialist card and drop them into a new pod to reassign. Click a member’s role badge to promote or change their permissions.
            </span>
          </div>
          <span className="text-[11px] opacity-75 hidden sm:inline">Changes persist automatically</span>
        </div>
      )}

      {/* Pods Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {pods.map((pod) => {
          const podMembers = filteredMembers.filter(
            (m) => (memberAssignments[m.id] || 'team_delivery') === pod.id
          );
          const teamLead = teamMembers.find((m) => m.id === pod.teamLeadId);
          const isOver = dragOverPodId === pod.id;

          // Compute pod aggregate capacity & allocated hours
          const podCapacity = podMembers.reduce((sum, m) => sum + (m.weeklyCapacityHours || 0), 0);
          const podAllocated = podMembers.reduce(
            (sum, m) => sum + calculateMemberAllocatedHours(m.id, tasks),
            0
          );
          const podUtilization = podCapacity > 0 ? Math.round((podAllocated / podCapacity) * 100) : 0;

          return (
            <div
              key={pod.id}
              onDragOver={(e) => handleDragOver(e, pod.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, pod.id)}
              className={`rounded-2xl border flex flex-col transition-all duration-200 ${
                isOver
                  ? 'border-cyan-400 ring-2 ring-cyan-400/30 scale-[1.01] bg-cyan-950/20'
                  : isWhiteTheme
                  ? 'bg-white border-slate-200 shadow-sm hover:shadow-md'
                  : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Pod Card Header */}
              <div className="p-4 border-b border-slate-800/60 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: pod.color }}
                    />
                    <h3
                      className={`text-sm font-bold truncate ${
                        isWhiteTheme ? 'text-slate-900' : 'text-white'
                      }`}
                      title={pod.name}
                    >
                      {pod.name}
                    </h3>
                  </div>
                  <span
                    className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${
                      isWhiteTheme
                        ? 'bg-slate-100 border-slate-200 text-slate-600'
                        : 'bg-slate-800 border-slate-700 text-slate-300'
                    }`}
                  >
                    {podMembers.length}
                  </span>
                </div>

                <p
                  className={`text-[11px] line-clamp-2 leading-relaxed ${
                    isWhiteTheme ? 'text-slate-500' : 'text-slate-400'
                  }`}
                >
                  {pod.description}
                </p>

                {/* Team Lead Ribbon */}
                <div
                  className={`p-2 rounded-xl border flex items-center justify-between gap-2 ${
                    isWhiteTheme
                      ? 'bg-slate-50 border-slate-200'
                      : 'bg-slate-950/60 border-slate-800/80'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[10px] text-slate-400 block leading-tight">Team Lead</span>
                      <span
                        className={`text-xs font-semibold truncate block ${
                          isWhiteTheme ? 'text-slate-800' : 'text-slate-200'
                        }`}
                      >
                        {teamLead ? teamLead.name : 'Unassigned'}
                      </span>
                    </div>
                  </div>

                  {canManage && podMembers.length > 0 && (
                    <select
                      value={pod.teamLeadId || ''}
                      onChange={(e) => handleSetTeamLead(pod.id, e.target.value)}
                      className={`text-[10px] py-1 px-1.5 rounded-lg border outline-none cursor-pointer ${
                        isWhiteTheme
                          ? 'bg-white border-slate-300 text-slate-700'
                          : 'bg-slate-800 border-slate-700 text-slate-300'
                      }`}
                      title="Set Pod Team Lead"
                    >
                      <option value="" disabled>Change Lead</option>
                      {podMembers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Pod Capacity Bar */}
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">Pod Load:</span>
                    <span
                      className={`font-semibold font-mono ${
                        podUtilization > 100
                          ? 'text-rose-400'
                          : podUtilization > 85
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {podAllocated} / {podCapacity}h ({podUtilization}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        podUtilization > 100
                          ? 'bg-rose-500'
                          : podUtilization > 85
                          ? 'bg-amber-400'
                          : 'bg-emerald-400'
                      }`}
                      style={{ width: `${Math.min(podUtilization, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Members Drop Area */}
              <div className="p-3 flex-1 space-y-2 min-h-[300px] overflow-y-auto max-h-[550px]">
                {podMembers.length === 0 ? (
                  <div
                    className={`h-40 rounded-xl border border-dashed flex flex-col items-center justify-center p-4 text-center ${
                      isWhiteTheme
                        ? 'border-slate-200 text-slate-400'
                        : 'border-slate-800 text-slate-600'
                    }`}
                  >
                    <Users className="w-6 h-6 mb-1.5 opacity-40" />
                    <span className="text-xs">No members in this pod</span>
                    {canManage && (
                      <span className="text-[10px] text-cyan-400 mt-1">Drag members here</span>
                    )}
                  </div>
                ) : (
                  podMembers.map((member) => {
                    const role = memberRoles[member.id] || 'MEMBER';
                    const roleCfg = ROLE_CONFIG[role] || ROLE_CONFIG.MEMBER;
                    const RoleIcon = roleCfg.icon;
                    const allocatedHours = calculateMemberAllocatedHours(member.id, tasks);
                    const isLeadOfThisPod = pod.teamLeadId === member.id;

                    return (
                      <div
                        key={member.id}
                        draggable={canManage}
                        onDragStart={(e) => handleDragStart(e, member.id)}
                        className={`p-3 rounded-xl border transition-all select-none ${
                          canManage ? 'cursor-grab active:cursor-grabbing hover:scale-[1.02]' : ''
                        } ${
                          isLeadOfThisPod
                            ? 'ring-1 ring-amber-400/40'
                            : ''
                        } ${
                          isWhiteTheme
                            ? 'bg-slate-50 hover:bg-white border-slate-200 shadow-sm'
                            : 'bg-slate-950/70 hover:bg-slate-900 border-slate-800/90'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {canManage && (
                              <GripVertical className="w-3.5 h-3.5 text-slate-500 shrink-0 cursor-grab" />
                            )}
                            <div className="relative">
                              <img
                                src={member.avatar}
                                alt={member.name}
                                className="w-8 h-8 rounded-full object-cover border border-slate-700"
                              />
                              {isLeadOfThisPod && (
                                <Crown className="w-3.5 h-3.5 text-amber-400 absolute -top-1.5 -right-1.5 drop-shadow" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <span
                                className={`text-xs font-semibold truncate block ${
                                  isWhiteTheme ? 'text-slate-900' : 'text-slate-100'
                                }`}
                              >
                                {member.name}
                              </span>
                              <span
                                className={`text-[10px] truncate block ${
                                  isWhiteTheme ? 'text-slate-500' : 'text-slate-400'
                                }`}
                              >
                                {member.role}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Interactive Role Badge */}
                        <div className="mt-2.5 flex items-center justify-between gap-2">
                          <div className="relative">
                            <button
                              type="button"
                              disabled={!canManage}
                              onClick={() =>
                                setEditingRoleMemberId(
                                  editingRoleMemberId === member.id ? null : member.id
                                )
                              }
                              className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border transition-colors ${roleCfg.bg} ${roleCfg.color} ${
                                canManage ? 'hover:brightness-125 cursor-pointer' : 'cursor-default'
                              }`}
                            >
                              <RoleIcon className="w-3 h-3" />
                              <span>{roleCfg.label}</span>
                              {canManage && <ChevronDown className="w-2.5 h-2.5 opacity-60" />}
                            </button>

                            {/* Role Selection Dropdown */}
                            {canManage && editingRoleMemberId === member.id && (
                              <div
                                className={`absolute left-0 mt-1 w-44 rounded-xl border shadow-2xl z-50 p-1.5 backdrop-blur-2xl ${
                                  isWhiteTheme
                                    ? 'bg-white border-slate-200'
                                    : 'bg-slate-900 border-slate-700'
                                }`}
                              >
                                <span className="text-[10px] font-semibold text-slate-400 px-2 py-1 block">
                                  Assign System Role
                                </span>
                                {(Object.keys(ROLE_CONFIG) as UserRoleType[]).map((rKey) => {
                                  const r = ROLE_CONFIG[rKey];
                                  const Icon = r.icon;
                                  const isSelected = role === rKey;
                                  return (
                                    <button
                                      key={rKey}
                                      onClick={() => handleChangeRole(member.id, rKey)}
                                      className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-colors ${
                                        isSelected
                                          ? 'bg-cyan-500/20 text-cyan-400 font-semibold'
                                          : isWhiteTheme
                                          ? 'hover:bg-slate-100 text-slate-700'
                                          : 'hover:bg-slate-800 text-slate-300'
                                      }`}
                                    >
                                      <div className="flex items-center gap-1.5">
                                        <Icon className="w-3 h-3" />
                                        <span>{r.label}</span>
                                      </div>
                                      {isSelected && <Check className="w-3 h-3 text-cyan-400" />}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Member load */}
                          <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5 text-slate-500" />
                            <span>{allocatedHours}h</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OrgMapStudio;
