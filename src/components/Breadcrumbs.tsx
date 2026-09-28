import React from 'react';
import { motion } from 'framer-motion';
import {
  ChevronRight,
  Home,
  Building2,
  FolderKanban,
  Calendar,
  Clock,
  ClipboardList,
  Award,
  Bot,
  DollarSign,
  Bell,
  Sparkles,
  Flame,
  Kanban,
  Inbox,
  Users,
  Network,
  Wand2,
  GraduationCap,
  Grid3X3,
  CalendarRange,
  ShieldAlert,
  UserCheck
} from 'lucide-react';
import type { TeamMember, AppUserProfile } from '../types';

export interface BreadcrumbsProps {
  activeTab: string;
  route: string;
  memberId?: string;
  memberTab?: string;
  teamMembers: TeamMember[];
  currentProfile: AppUserProfile;
  isWhiteTheme?: boolean;
  onNavigateTab: (tab: string) => void;
}

interface CrumbConfig {
  category: string;
  title: string;
  icon: React.ReactNode;
  hotkey?: string;
}

const TAB_CONFIGS: Record<string, CrumbConfig> = {
  projects: {
    category: 'Agency Workspace',
    title: 'Active Projects Portfolio',
    icon: <FolderKanban className="w-3.5 h-3.5 text-cyan-400" />,
    hotkey: '1'
  },
  calendar: {
    category: 'Timeline & Milestones',
    title: 'Activity & Sprint Calendar',
    icon: <Calendar className="w-3.5 h-3.5 text-indigo-400" />,
    hotkey: '2'
  },
  hours: {
    category: 'Team Capacity',
    title: 'Employee Active vs. Free Hours',
    icon: <Clock className="w-3.5 h-3.5 text-emerald-400" />,
    hotkey: '3'
  },
  dsr: {
    category: 'Reporting & Operations',
    title: 'DSR Tracker & Weekly Matrix',
    icon: <ClipboardList className="w-3.5 h-3.5 text-amber-400" />,
    hotkey: '4'
  },
  skills: {
    category: 'Talent & Mastery',
    title: 'Employee Skills Visual Matrix',
    icon: <Award className="w-3.5 h-3.5 text-purple-400" />,
    hotkey: '5'
  },
  bot: {
    category: 'Automation & Dispatch',
    title: 'Job Delivery Bot & Scope Dispatcher',
    icon: <Bot className="w-3.5 h-3.5 text-teal-400" />,
    hotkey: '6'
  },
  finances: {
    category: 'Financial Intelligence',
    title: 'Visual Finances & Payment Tracker',
    icon: <DollarSign className="w-3.5 h-3.5 text-emerald-400" />,
    hotkey: '7'
  },
  notifications: {
    category: 'Alert Center',
    title: 'Agency Notifications & Alert Center',
    icon: <Bell className="w-3.5 h-3.5 text-rose-400" />,
    hotkey: '8'
  },
  brief: {
    category: 'Intelligent Scoping',
    title: 'Project Brief Analyzer',
    icon: <Sparkles className="w-3.5 h-3.5 text-pink-400" />,
    hotkey: '9'
  },
  'war-room': {
    category: 'Executive Triage',
    title: 'Monday Allocation War-Room',
    icon: <Flame className="w-3.5 h-3.5 text-amber-400" />,
    hotkey: '0'
  },
  kanban: {
    category: 'Sprint Execution',
    title: 'Sprint Kanban Board',
    icon: <Kanban className="w-3.5 h-3.5 text-cyan-400" />
  },
  backlog: {
    category: 'Resource Backlog',
    title: 'Task Backlog Dispatch',
    icon: <Inbox className="w-3.5 h-3.5 text-blue-400" />
  },
  roster: {
    category: 'Team Management',
    title: 'Team Roster Studio',
    icon: <Users className="w-3.5 h-3.5 text-purple-400" />
  },
  org: {
    category: 'Agency Topology',
    title: 'Org Map Studio & Live Presence',
    icon: <Network className="w-3.5 h-3.5 text-emerald-400" />
  },
  wizard: {
    category: 'Allocation Engine',
    title: 'Project Allocation Wizard',
    icon: <Wand2 className="w-3.5 h-3.5 text-teal-400" />
  },
  testing: {
    category: 'Assessment Center',
    title: 'Skill Evaluation Center',
    icon: <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
  },
  macro: {
    category: 'Macro Planning',
    title: 'Allocator Grid Matrix',
    icon: <Grid3X3 className="w-3.5 h-3.5 text-indigo-400" />
  },
  timeline: {
    category: 'Resource Planning',
    title: 'Resource Timeline',
    icon: <CalendarRange className="w-3.5 h-3.5 text-blue-400" />
  },
  matrix: {
    category: 'Talent Acquisition',
    title: 'Skill Gap & Hiring Matrix',
    icon: <UserCheck className="w-3.5 h-3.5 text-rose-400" />
  },
  hiring: {
    category: 'Talent Acquisition',
    title: 'Skill Gap & Hiring Matrix',
    icon: <UserCheck className="w-3.5 h-3.5 text-rose-400" />
  },
  sla: {
    category: 'Risk Governance',
    title: 'SLA Risk Radar & Guardrails',
    icon: <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
  },
  radar: {
    category: 'Risk Governance',
    title: 'SLA Risk Radar & Guardrails',
    icon: <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
  }
};

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  activeTab,
  route,
  memberId,
  memberTab,
  teamMembers,
  currentProfile,
  isWhiteTheme,
  onNavigateTab
}) => {
  const isMemberRoute = route === 'member' && Boolean(memberId);
  const activeMember = isMemberRoute ? teamMembers.find((m) => m.id === memberId) : null;
  const crumbConfig = TAB_CONFIGS[activeTab] || {
    category: 'Agency Workspace',
    title: 'Overview',
    icon: <Building2 className="w-3.5 h-3.5 text-cyan-400" />
  };

  return (
    <motion.nav
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      aria-label="Breadcrumb Navigation"
      className={`mb-5 px-4 py-2.5 rounded-2xl flex items-center justify-between gap-3 text-xs font-medium border shadow-lg backdrop-blur-md transition-colors ${
        isWhiteTheme
          ? 'bg-white/80 border-slate-200 text-slate-700 shadow-slate-200/50'
          : 'bg-[#111827]/75 border-slate-800/90 text-slate-300 shadow-black/40'
      }`}
    >
      {/* Left: Hierarchical Breadcrumb Trail */}
      <ol className="flex items-center gap-1.5 flex-wrap min-w-0">
        {/* Root: Agency Hub / Home */}
        <li className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onNavigateTab('projects')}
            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all cursor-pointer font-bold ${
              isWhiteTheme
                ? 'hover:bg-slate-100 text-slate-700 hover:text-slate-950'
                : 'hover:bg-slate-800/80 text-slate-300 hover:text-white'
            }`}
            title="Return to Agency Hub (Projects)"
          >
            <Home className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="hidden sm:inline">Agency Hub</span>
          </button>
        </li>

        <ChevronRight className="w-3.5 h-3.5 text-slate-500 opacity-60 shrink-0" />

        {isMemberRoute && activeMember ? (
          <>
            {/* Mid Crumb: Team Roster */}
            <li className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onNavigateTab('hours')}
                className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                  isWhiteTheme
                    ? 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
                    : 'hover:bg-slate-800/80 text-slate-400 hover:text-slate-200'
                }`}
              >
                Team Roster
              </button>
            </li>

            <ChevronRight className="w-3.5 h-3.5 text-slate-500 opacity-60 shrink-0" />

            {/* Member Leaf */}
            <li className="flex items-center gap-1.5 truncate">
              <img
                src={activeMember.avatar}
                alt={activeMember.name}
                className="w-4 h-4 rounded-full object-cover ring-1 ring-emerald-500/50 shrink-0"
              />
              <span className="font-bold text-emerald-400 truncate max-w-[140px] sm:max-w-[200px]">
                {activeMember.name}
              </span>
              {memberTab && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider shrink-0">
                  {memberTab}
                </span>
              )}
            </li>
          </>
        ) : (
          <>
            {/* Category / Grouping */}
            <li className="hidden md:flex items-center gap-1">
              <span
                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                  isWhiteTheme
                    ? 'text-slate-500 bg-slate-100'
                    : 'text-slate-400 bg-slate-900/80 border border-slate-800/80'
                }`}
              >
                {crumbConfig.category}
              </span>
            </li>

            <li className="hidden md:flex items-center">
              <ChevronRight className="w-3.5 h-3.5 text-slate-500 opacity-60 shrink-0" />
            </li>

            {/* Current Active Page Leaf */}
            <li className="flex items-center gap-1.5 truncate">
              <span className="shrink-0">{crumbConfig.icon}</span>
              <span
                className={`font-black tracking-tight truncate ${
                  isWhiteTheme ? 'text-slate-950' : 'text-white'
                }`}
              >
                {crumbConfig.title}
              </span>
            </li>
          </>
        )}
      </ol>

      {/* Right: Quick Context Badges */}
      <div className="flex items-center gap-2 shrink-0">
        {crumbConfig.hotkey && (
          <span
            className={`hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${
              isWhiteTheme
                ? 'bg-slate-100 border-slate-300 text-slate-600'
                : 'bg-slate-900 border-slate-700/80 text-cyan-300'
            }`}
            title={`Press '${crumbConfig.hotkey}' to quick switch to this tab`}
          >
            <kbd className="opacity-60">key</kbd>
            <span>{crumbConfig.hotkey}</span>
          </span>
        )}

        <div
          className={`flex items-center gap-1.5 px-2 py-1 rounded-xl text-[11px] font-medium border ${
            isWhiteTheme
              ? 'bg-slate-50 border-slate-200 text-slate-600'
              : 'bg-slate-900/80 border-slate-800 text-slate-400'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-500/50 animate-pulse" />
          <span className="hidden lg:inline text-[10px] font-semibold text-slate-400">Session:</span>
          <span className="font-bold text-slate-200 truncate max-w-[100px]">{currentProfile.name}</span>
        </div>
      </div>
    </motion.nav>
  );
};
