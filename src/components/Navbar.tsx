import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { AppUserProfile } from '../types';
import { ClickUpOAuthModal } from './ClickUpOAuthModal';
import { handleClickUpCallback, isClickUpConnected, getClickUpUser } from '../services/clickupOAuth';
import { 
  BarChart3, 
  Kanban, 
  Users, 
  Download, 
  Activity,
  ShieldCheck,
  ChevronDown,
  Sparkles,
  DollarSign,
  Bell,
  Calendar,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  totalCapacity: number;
  totalAllocated: number;
  onExportPlan: () => void;
  currentProfile: AppUserProfile;
  allProfiles: AppUserProfile[];
  onSwitchProfile: (profile: AppUserProfile) => void;
  isWhiteTheme?: boolean;
  onToggleTheme?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  totalCapacity,
  totalAllocated,
  onExportPlan,
  currentProfile,
  allProfiles,
  onSwitchProfile,
  isWhiteTheme,
  onToggleTheme
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showClickUpModal, setShowClickUpModal] = useState(false);
  const [clickupConnected, setClickupConnected] = useState(isClickUpConnected());
  const [clickupUser, setClickupUser] = useState(getClickUpUser());
  const overallUtilization = Math.round((totalAllocated / totalCapacity) * 100) || 0;

  // Handle ClickUp OAuth callback on page load
  useEffect(() => {
    const result = handleClickUpCallback();
    if (result.token) {
      setClickupConnected(true);
      setClickupUser(result.user || null);
      setShowClickUpModal(true); // Auto-open modal to show connected state
    } else if (result.error) {
      console.error('ClickUp OAuth error:', result.error);
    }
  }, []);

  const NAV_ITEMS: {
    id: 'projects' | 'calendar' | 'hours' | 'dsr' | 'skills' | 'bot' | 'finances' | 'notifications' | 'brief';
    label: string;
    icon: React.ElementType;
    highlight?: boolean;
    badge?: number;
  }[] = [
    {
      id: 'projects',
      label: '1. Active Projects',
      icon: Kanban,
      highlight: true
    },
    {
      id: 'calendar',
      label: 'Activity Calendar',
      icon: Calendar,
      highlight: true
    },
    {
      id: 'hours',
      label: '2. Employee Hours',
      icon: BarChart3
    },
    {
      id: 'dsr',
      label: '3. DSR Tracker & Plan',
      icon: Calendar,
      highlight: true
    },
    {
      id: 'skills',
      label: '4. Employee Skills',
      icon: Users
    },
    {
      id: 'bot',
      label: '5. Job Delivery Bot',
      icon: Sparkles
    },
    {
      id: 'finances',
      label: '6. Finances & Payments',
      icon: DollarSign
    },
    {
      id: 'notifications',
      label: '7. Notifications',
      icon: Bell,
      badge: 4
    },
    {
      id: 'brief',
      label: 'Advanced Studio',
      icon: Activity
    }
  ];

  return (
    <aside
      className={`${
        isCollapsed
          ? 'w-24 min-w-[96px] max-w-[96px] p-3'
          : 'w-64 min-w-[256px] max-w-[256px] p-4'
      } h-screen sticky top-0 flex flex-col justify-between border-r border-slate-700/80 bg-gradient-to-b from-[#0d121f] via-[#0b0f1a] to-[#070b14] backdrop-blur-2xl shadow-2xl z-40 shrink-0 overflow-y-auto no-scrollbar transition-all duration-300 relative`}
    >
      {/* SECTION 1: TOP BRAND & USER PROFILE / STATS */}
      <div className="space-y-4 shrink-0">
        {/* Brand Identity & Collapse Toggle */}
        <div className={`flex items-center justify-between gap-3 border-b border-slate-700/80 pb-4 ${isCollapsed ? 'flex-col' : ''}`}>
          <div className={`flex items-center gap-3 min-w-0 ${isCollapsed ? 'justify-center w-full' : ''}`}>
            <div
              onClick={() => isCollapsed && setIsCollapsed(false)}
              className={`w-10 h-10 rounded-xl bg-gradient-to-br from-slate-800 via-slate-900 to-[#111827] border border-emerald-500/40 flex items-center justify-center shadow-lg shadow-emerald-500/15 shrink-0 group ${
                isCollapsed ? 'cursor-pointer hover:scale-105 transition-transform' : ''
              }`}
              title={isCollapsed ? 'Click to Expand Sidebar' : 'Smart Allocation Hub'}
            >
              <Activity className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <div className="text-sm font-extrabold text-white tracking-tight truncate flex items-center gap-1.5">
                  <span>Smart Allocation</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                </div>
                <div className="inline-flex items-center px-2 py-0.5 text-[10px] font-extrabold tracking-wide rounded bg-gradient-to-r from-emerald-500/25 to-cyan-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm mt-0.5">
                  ClickUp Hub
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Collapse/Expand & Theme Toggle Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer shrink-0 shadow-sm"
                title={isWhiteTheme ? 'Switch to Dark Theme' : 'Switch to White Theme'}
              >
                {isWhiteTheme ? <Sun className="w-4 h-4 text-amber-500 animate-spin" /> : <Moon className="w-4 h-4 text-cyan-400" />}
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer shrink-0 shadow-sm"
              title={isCollapsed ? 'Expand Navigation Sidebar' : 'Collapse Sidebar to Icon Rail'}
            >
              {isCollapsed ? <PanelLeftOpen className="w-4 h-4 text-emerald-400" /> : <PanelLeftClose className="w-4 h-4 text-slate-300" />}
            </button>
          </div>
        </div>

        {/* Live Capacity Pulse Monitor (Only shown when expanded) */}
        {!isCollapsed && (
          <div className="bg-gradient-to-br from-slate-900 via-[#0e1422] to-slate-900 border border-slate-700/90 p-3.5 rounded-xl shadow-sm shrink-0 space-y-2.5 relative overflow-hidden group hover:border-emerald-500/50 transition-all duration-300">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-300 font-semibold flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                <span>Live Bandwidth:</span>
              </span>
              <div className="flex items-center gap-3">
                <span className="text-white font-extrabold">{totalAllocated}/{totalCapacity}h</span>
                <span className={`px-2.5 py-1 rounded text-xs font-black tracking-wider ${overallUtilization > 85 ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50' : 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/50 shadow-sm'}`}>
                  {overallUtilization}%
                </span>
              </div>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-indigo-500 rounded-full transition-all duration-500 shadow-sm"
                style={{ width: `${Math.min(100, overallUtilization)}%` }}
              />
            </div>
          </div>
        )}

        {/* Profile Switcher & Quick Alert / Export Strip */}
        <div className={`flex items-center justify-between gap-3 border-b border-slate-700/80 pb-4 ${isCollapsed ? 'flex-col' : ''}`}>
          {/* User Profile Switcher */}
          <div className="relative flex-1 min-w-0 w-full">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className={`w-full flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 transition-all cursor-pointer text-left ${
                isCollapsed ? 'justify-center px-2' : ''
              }`}
              title={isCollapsed ? `Switch Profile (${currentProfile.name})` : undefined}
            >
              <div className="flex items-center gap-4 min-w-0">
                <img
                  src={currentProfile.avatar}
                  alt={currentProfile.name}
                  className="w-7 h-7 rounded-md object-cover ring-1 ring-slate-600 shrink-0 mx-auto"
                />
                {!isCollapsed && (
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">
                      {currentProfile.name}
                    </div>
                    <div className="text-[11px] font-semibold text-emerald-300 truncate">
                      {currentProfile.roleTitle}
                    </div>
                  </div>
                )}
              </div>
              {!isCollapsed && <ChevronDown className="w-4 h-4 text-slate-300 shrink-0" />}
            </button>

            {/* Profile Dropdown Menu */}
            {showProfileMenu && (
              <div
                className={`absolute z-50 mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 w-64 ${
                  isCollapsed ? 'left-16 top-0' : 'left-0'
                }`}
              >
                <div className="text-[11px] font-bold tracking-wider uppercase text-slate-300 px-2 py-1 border-b border-slate-800 mb-1">
                  Switch Role / Persona
                </div>
                <div className="space-y-1 max-h-60 overflow-y-auto no-scrollbar">
                  {allProfiles.map((prof) => {
                    const isActive = prof.id === currentProfile.id;
                    return (
                      <button
                        key={prof.id}
                        onClick={() => {
                          onSwitchProfile(prof);
                          setShowProfileMenu(false);
                        }}
                        className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-slate-800 border border-slate-600'
                            : 'hover:bg-slate-800/80'
                        }`}
                      >
                        <img
                          src={prof.avatar}
                          alt={prof.name}
                          className="w-7 h-7 rounded-md object-cover shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white truncate">
                              {prof.name}
                            </span>
                            {isActive && (
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                            )}
                          </div>
                          <span className="text-[11px] text-slate-300 block truncate">
                            {prof.roleTitle}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions (Notifications Bell & Export) */}
          <div className={`flex items-center gap-1.5 shrink-0 ${isCollapsed ? 'flex-col w-full' : ''}`}>
            <button
              type="button"
              onClick={() => setActiveTab('notifications')}
              className={`relative p-2 rounded-lg border transition-all cursor-pointer ${isCollapsed ? 'w-full flex justify-center' : ''} ${
                activeTab === 'notifications'
                  ? 'bg-slate-800 border-slate-600 text-cyan-300 shadow-sm font-bold'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700'
              }`}
              title="Open Notifications & Agency Alert Center"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-cyan-400 ring-2 ring-slate-950" />
            </button>

            <button
              onClick={onExportPlan}
              className={`p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer ${
                isCollapsed ? 'w-full flex justify-center' : ''
              }`}
              title="Export ClickUp Schedule Summary"
            >
              <Download className="w-4 h-4 text-slate-300 hover:text-emerald-400" />
            </button>
          </div>
        </div>

        {/* SECTION 2: NAVIGATION */}
        <div className="flex-1 min-h-0 mt-4 shrink-0">
          <div className="h-full flex flex-col">
            {!isCollapsed && (
              <div className="text-xs font-bold tracking-wider text-slate-300 px-2 mb-2.5 uppercase block">
                Navigation
              </div>
            )}
            <nav className="flex flex-col gap-2 overflow-y-auto no-scrollbar pb-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    title={isCollapsed ? item.label : undefined}
                    className={`relative flex items-center justify-between rounded-xl transition-all duration-200 cursor-pointer text-left w-full group overflow-hidden ${
                      isCollapsed ? 'px-0 py-3 justify-center' : 'px-4 py-3.5 text-sm'
                    } ${
                      isActive
                        ? 'text-white font-extrabold scale-[1.01]'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/80 border border-transparent font-semibold hover:translate-x-1'
                    }`}
                  >
                    {/* Spring Physics Sliding Indicator */}
                    {isActive && (
                      <motion.div
                        layoutId="sidebarActiveTabIndicator"
                        className="absolute inset-0 bg-gradient-to-r from-emerald-500/25 via-slate-800/95 to-transparent border border-emerald-500/50 border-l-4 border-l-emerald-400 rounded-xl shadow-lg shadow-emerald-500/15 pointer-events-none"
                        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                      />
                    )}

                    <div className={`relative z-10 flex items-center gap-3 min-w-0 ${isCollapsed ? 'justify-center' : ''}`}>
                      <Icon className={`w-4 h-4 shrink-0 transition-transform duration-200 ${isActive ? 'text-emerald-300 scale-110' : 'text-slate-400 group-hover:text-white group-hover:scale-110'}`} />
                      {!isCollapsed && <span className="truncate">{item.label}</span>}
                    </div>
                    {item.badge && item.badge > 0 && (
                      <span
                        className={`relative z-10 rounded-full bg-cyan-400 text-slate-950 font-extrabold leading-none shrink-0 shadow-sm ${
                          isCollapsed
                            ? 'absolute right-1 top-1 w-2 h-2 p-0 animate-pulse'
                            : 'ml-2 px-2 py-0.5 text-[10px]'
                        }`}
                      >
                        {!isCollapsed && item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* SECTION 3: BOTTOM SIDEBAR FOOTER */}
      <div className="block mt-6 pt-4 border-t border-slate-800/60 space-y-2 shrink-0">
        {!isCollapsed ? (
          <>
            {/* ClickUp Connect Button */}
            <button
              type="button"
              onClick={() => setShowClickUpModal(true)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                clickupConnected
                  ? 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20'
                  : 'bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/20'
              }`}
            >
              <div className={`w-6 h-6 rounded-md flex items-center justify-center text-white font-black text-xs shrink-0 ${
                clickupConnected ? 'bg-emerald-600' : 'bg-gradient-to-br from-purple-600 to-pink-600'
              }`}>
                C
              </div>
              <div className="min-w-0">
                <div className={`text-xs font-bold ${
                  clickupConnected ? 'text-emerald-400' : 'text-purple-400'
                }`}>
                  {clickupConnected ? '● Connected' : 'Connect ClickUp'}
                </div>
                <div className="text-[10px] text-slate-500 truncate">
                  {clickupConnected ? (clickupUser || 'ClickUp Account') : 'Login with OAuth'}
                </div>
              </div>
            </button>
            <div className="text-[10px] font-medium text-slate-500 text-center">
              Smart Allocation Hub v2.6
            </div>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setShowClickUpModal(true)}
              title={clickupConnected ? `ClickUp: ${clickupUser}` : 'Connect ClickUp'}
              className={`w-full flex justify-center p-2 rounded-lg border transition-all cursor-pointer ${
                clickupConnected
                  ? 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20'
                  : 'bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/20'
              }`}
            >
              <span className={`w-5 h-5 rounded flex items-center justify-center text-white font-black text-xs ${
                clickupConnected ? 'bg-emerald-600' : 'bg-gradient-to-br from-purple-600 to-pink-600'
              }`}>C</span>
            </button>
            <button
              type="button"
              onClick={() => setIsCollapsed(false)}
              className="w-full flex justify-center p-2 rounded-lg bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800/80 text-slate-400 hover:text-white transition-all cursor-pointer"
              title="Expand Sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* ClickUp OAuth Modal */}
      <ClickUpOAuthModal
        isOpen={showClickUpModal}
        onClose={() => {
          setShowClickUpModal(false);
          setClickupConnected(isClickUpConnected());
          setClickupUser(getClickUpUser());
        }}
      />
    </aside>
  );
};
