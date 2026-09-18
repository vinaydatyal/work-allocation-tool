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
  PanelLeftOpen,
  Pin,
  PinOff,
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
  
  // Persisted pin preference: false means Auto-Open on hover / Auto-Close on leave; true means Permanently Pinned Open
  const [isPinned, setIsPinned] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('vat_sidebar_pinned');
      return saved !== null ? JSON.parse(saved) : false; // Default to sleek Auto mode
    } catch {
      return false;
    }
  });

  const [isHovered, setIsHovered] = useState<boolean>(false);
  const hoverTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // The effective visual expanded state:
  const isExpanded = isPinned || isHovered;

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

  const handleMouseEnter = () => {
    if (isPinned) return;
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    if (isPinned) return;
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
      setShowProfileMenu(false);
    }, 180);
  };

  const handleTogglePin = () => {
    const next = !isPinned;
    setIsPinned(next);
    try {
      localStorage.setItem('vat_sidebar_pinned', JSON.stringify(next));
    } catch {}
    if (!next) {
      setIsHovered(false);
    }
  };

  const handleNavItemClick = (id: any) => {
    setActiveTab(id);
    if (!isPinned) {
      setIsHovered(false);
    }
  };

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
    <>
      {/* Layout Spacer: Reserves stable screen width so main page content never jerks or reflows on hover */}
      <div
        className={`shrink-0 h-screen transition-all duration-300 pointer-events-none ${
          isPinned ? 'w-64 min-w-[256px] max-w-[256px]' : 'w-[72px] min-w-[72px] max-w-[72px]'
        }`}
        aria-hidden="true"
      />

      {/* Floating Interactive Navigation Sidebar */}
      <aside
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`h-screen fixed top-0 left-0 flex flex-col justify-between border-r shadow-2xl transition-all duration-300 overflow-y-auto no-scrollbar ${
          isExpanded
            ? 'w-64 min-w-[256px] max-w-[256px] p-4 z-50'
            : 'w-[72px] min-w-[72px] max-w-[72px] p-2.5 z-40'
        }`}
        style={{
          backgroundColor: isWhiteTheme ? '#ffffff' : '#0b0f1a',
          borderColor: isWhiteTheme ? '#e2e8f0' : '#1e293b',
          boxShadow: isExpanded && !isPinned
            ? isWhiteTheme
              ? '12px 0 35px -5px rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(0,0,0,0.05)'
              : '14px 0 45px -5px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255,255,255,0.08)'
            : undefined
        }}
      >
        {/* SECTION 1: TOP BRAND & USER PROFILE / STATS */}
        <div className="space-y-3.5 shrink-0">
          {/* Brand Identity, Auto-Pin & Theme Toggles */}
          <div className={`flex items-center justify-between gap-2 border-b pb-3.5 ${!isExpanded ? 'flex-col' : ''}`}
            style={{ borderColor: isWhiteTheme ? '#f1f5f9' : '#1e293b' }}
          >
            <div
              className={`flex items-center gap-2.5 min-w-0 ${!isExpanded ? 'justify-center w-full' : ''}`}
            >
              <div
                onClick={() => {
                  if (!isExpanded) {
                    setIsHovered(true);
                  } else {
                    handleTogglePin();
                  }
                }}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-800 via-slate-900 to-[#111827] border border-emerald-500/40 flex items-center justify-center shadow-lg shadow-emerald-500/15 shrink-0 group cursor-pointer hover:scale-105 transition-transform"
                title={isPinned ? 'Sidebar Pinned Open (Click to unpin)' : 'Click to Toggle Pin / Expand'}
              >
                <Activity className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
              </div>
              {isExpanded && (
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-extrabold text-white tracking-tight truncate flex items-center gap-1.5">
                    <span style={{ color: isWhiteTheme ? '#0f172a' : '#ffffff' }}>Smart Allocation</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  </div>
                  <div className="inline-flex items-center px-2 py-0.5 text-[10px] font-extrabold tracking-wide rounded bg-gradient-to-r from-emerald-500/25 to-cyan-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm mt-0.5">
                    ClickUp Hub
                  </div>
                </div>
              )}
            </div>

            {/* Controls: Pin/Lock & Theme */}
            <div className={`flex items-center gap-1.5 shrink-0 ${!isExpanded ? 'flex-col' : ''}`}>
              {onToggleTheme && (
                <button
                  type="button"
                  onClick={onToggleTheme}
                  className="p-1.5 rounded-lg border text-slate-300 hover:text-white transition-all cursor-pointer shrink-0 shadow-sm"
                  style={{
                    backgroundColor: isWhiteTheme ? '#f1f5f9' : '#1e293b',
                    borderColor: isWhiteTheme ? '#cbd5e1' : '#334155'
                  }}
                  title={isWhiteTheme ? 'Switch to Dark Theme' : 'Switch to White Theme'}
                >
                  {isWhiteTheme ? <Sun className="w-4 h-4 text-amber-500 animate-spin" /> : <Moon className="w-4 h-4 text-cyan-400" />}
                </button>
              )}

              {/* Pin / Lock Mode Toggle Button */}
              <button
                type="button"
                onClick={handleTogglePin}
                className={`p-1.5 rounded-lg border transition-all cursor-pointer shrink-0 shadow-sm ${
                  isPinned
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-emerald-500/10'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 border-slate-700/80'
                }`}
                style={{
                  backgroundColor: !isPinned && isWhiteTheme ? '#f1f5f9' : undefined,
                  borderColor: !isPinned && isWhiteTheme ? '#cbd5e1' : undefined
                }}
                title={
                  isPinned
                    ? 'Sidebar is PINNED (Locked open). Click to enable Auto Open on hover / Auto Close on leave.'
                    : 'Sidebar is in AUTO-HOVER mode. Hover opens, mouse leave closes. Click to Pin Open.'
                }
              >
                {isPinned ? <Pin className="w-4 h-4" /> : <PinOff className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Live Capacity Pulse Monitor */}
          {isExpanded ? (
            <div
              className="border p-3 rounded-xl shadow-sm shrink-0 space-y-2 relative overflow-hidden group transition-all duration-300"
              style={{
                backgroundColor: isWhiteTheme ? '#f8fafc' : 'rgba(15, 23, 42, 0.65)',
                borderColor: isWhiteTheme ? '#e2e8f0' : '#1e293b'
              }}
            >
              <div className="flex items-center justify-between text-xs">
                <span
                  className="font-semibold flex items-center gap-1.5"
                  style={{ color: isWhiteTheme ? '#475569' : '#94a3b8' }}
                >
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span>Bandwidth:</span>
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className="font-black"
                    style={{ color: isWhiteTheme ? '#0f172a' : '#ffffff' }}
                  >
                    {totalAllocated}/{totalCapacity}h
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black ${overallUtilization > 85 ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50' : 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/50 shadow-sm'}`}>
                    {overallUtilization}%
                  </span>
                </div>
              </div>
              <div
                className="w-full rounded-full h-1.5 overflow-hidden border"
                style={{
                  backgroundColor: isWhiteTheme ? '#e2e8f0' : '#020617',
                  borderColor: isWhiteTheme ? '#cbd5e1' : '#1e293b'
                }}
              >
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, overallUtilization)}%` }}
                />
              </div>
            </div>
          ) : (
            <div
              className="flex flex-col items-center justify-center p-1.5 rounded-xl border group hover:border-emerald-500/50 cursor-pointer transition-all"
              style={{
                backgroundColor: isWhiteTheme ? '#f8fafc' : 'rgba(15, 23, 42, 0.65)',
                borderColor: isWhiteTheme ? '#e2e8f0' : '#1e293b'
              }}
              title={`Live Bandwidth: ${totalAllocated}/${totalCapacity}h (${overallUtilization}%)`}
              onClick={() => setIsHovered(true)}
            >
              <span className={`text-[10px] font-black ${overallUtilization > 85 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {overallUtilization}%
              </span>
            </div>
          )}

          {/* Profile Switcher & Quick Alert / Export Strip */}
          <div
            className={`flex items-center justify-between gap-2 border-b pb-3 ${!isExpanded ? 'flex-col' : ''}`}
            style={{ borderColor: isWhiteTheme ? '#f1f5f9' : '#1e293b' }}
          >
            {/* User Profile Switcher */}
            <div className="relative flex-1 min-w-0 w-full">
              <button
                type="button"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className={`w-full flex items-center justify-between gap-2 p-2 rounded-xl border transition-all cursor-pointer text-left ${
                  !isExpanded ? 'justify-center p-1.5' : ''
                }`}
                style={{
                  backgroundColor: isWhiteTheme ? '#f8fafc' : 'rgba(15, 23, 42, 0.65)',
                  borderColor: isWhiteTheme ? '#e2e8f0' : '#1e293b'
                }}
                title={!isExpanded ? `Switch Profile (${currentProfile.name})` : undefined}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={currentProfile.avatar}
                    alt={currentProfile.name}
                    className="w-7 h-7 rounded-lg object-cover ring-1 ring-slate-600 shrink-0 mx-auto"
                  />
                  {isExpanded && (
                    <div className="min-w-0">
                      <div
                        className="text-xs font-bold truncate"
                        style={{ color: isWhiteTheme ? '#0f172a' : '#ffffff' }}
                      >
                        {currentProfile.name}
                      </div>
                      <div className="text-[10px] font-semibold text-emerald-400 truncate">
                        {currentProfile.roleTitle}
                      </div>
                    </div>
                  )}
                </div>
                {isExpanded && <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
              </button>

              {/* Profile Dropdown Menu */}
              {showProfileMenu && (
                <div
                  className={`absolute z-50 mt-2 rounded-2xl shadow-2xl p-2 w-64 border ${
                    !isExpanded ? 'left-16 top-0' : 'left-0'
                  }`}
                  style={{
                    backgroundColor: isWhiteTheme ? '#ffffff' : '#0f172a',
                    borderColor: isWhiteTheme ? '#cbd5e1' : '#334155'
                  }}
                >
                  <div className="text-[10px] font-black tracking-wider uppercase text-slate-400 px-2 py-1 border-b border-slate-700/40 mb-1">
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
                          className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-left transition-colors cursor-pointer ${
                            isActive
                              ? 'bg-slate-800 text-white border border-slate-700'
                              : 'hover:bg-slate-800/50 text-slate-300 hover:text-white'
                          }`}
                        >
                          <img
                            src={prof.avatar}
                            alt={prof.name}
                            className="w-7 h-7 rounded-lg object-cover shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold truncate">
                                {prof.name}
                              </span>
                              {isActive && (
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 block truncate">
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
            <div className={`flex items-center gap-1 shrink-0 ${!isExpanded ? 'flex-col w-full' : ''}`}>
              <button
                type="button"
                onClick={() => handleNavItemClick('notifications')}
                className={`relative p-2 rounded-xl border transition-all cursor-pointer ${!isExpanded ? 'w-full flex justify-center' : ''} ${
                  activeTab === 'notifications'
                    ? 'bg-slate-800 border-slate-600 text-cyan-300 shadow-sm font-bold'
                    : 'hover:bg-slate-800 text-slate-400 hover:text-white border-transparent'
                }`}
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-cyan-400 ring-2 ring-slate-950" />
              </button>

              <button
                type="button"
                onClick={onExportPlan}
                className={`p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-emerald-400 border border-transparent transition-all cursor-pointer ${
                  !isExpanded ? 'w-full flex justify-center' : ''
                }`}
                title="Export Work Allocation Plan"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* CLICKUP STATUS CARD */}
          <div>
            <button
              type="button"
              onClick={() => setShowClickUpModal(true)}
              className={`w-full flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer group text-left ${
                clickupConnected
                  ? 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20'
                  : 'bg-purple-900/30 border-purple-500/30 hover:border-purple-400/50'
              } ${!isExpanded ? 'justify-center p-1.5' : ''}`}
              title={clickupConnected ? `ClickUp Connected (${clickupUser || 'Account'})` : 'Connect ClickUp Account'}
            >
              <div className={`flex items-center gap-2 min-w-0 ${!isExpanded ? 'justify-center' : ''}`}>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs text-white shrink-0 shadow-sm ${
                  clickupConnected ? 'bg-emerald-600' : 'bg-gradient-to-br from-purple-600 to-pink-600'
                }`}>
                  C
                </div>
                {isExpanded && (
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-extrabold truncate ${clickupConnected ? 'text-emerald-400' : 'text-purple-300'}`}>
                        {clickupConnected ? 'ClickUp Connected' : 'Connect ClickUp'}
                      </span>
                      <span className={`w-1.5 h-1.5 rounded-full ${clickupConnected ? 'bg-emerald-400 animate-pulse' : 'bg-purple-400'}`} />
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {clickupConnected ? (clickupUser || 'Workspace Synced') : 'OAuth & API Sync'}
                    </div>
                  </div>
                )}
              </div>
              {isExpanded && (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-transform group-hover:translate-x-0.5 shrink-0" />
              )}
            </button>
          </div>

          {/* SECTION 2: NAVIGATION */}
          <div className="flex-1 min-h-0 mt-2 shrink-0">
            <div className="h-full flex flex-col">
              {isExpanded && (
                <div className="text-[10px] font-black tracking-wider text-slate-400 px-2 mb-2 uppercase block">
                  Navigation
                </div>
              )}
              <nav className="flex flex-col gap-1.5 overflow-y-auto no-scrollbar pb-1">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavItemClick(item.id)}
                      title={!isExpanded ? item.label : undefined}
                      className={`relative flex items-center justify-between rounded-xl transition-all duration-200 cursor-pointer text-left w-full group overflow-hidden ${
                        !isExpanded ? 'px-0 py-2.5 justify-center' : 'px-3.5 py-2.5 text-xs'
                      } ${
                        isActive
                          ? 'text-white font-extrabold scale-[1.01]'
                          : isWhiteTheme
                          ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/80 font-semibold'
                      }`}
                    >
                      {/* Spring Physics Sliding Indicator */}
                      {isActive && (
                        <motion.div
                          layoutId="sidebarActiveTabIndicator"
                          className="absolute inset-0 bg-gradient-to-r from-emerald-500/25 via-slate-800/90 to-transparent border border-emerald-500/50 border-l-4 border-l-emerald-400 rounded-xl shadow-lg shadow-emerald-500/15 pointer-events-none"
                          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                        />
                      )}

                      <div className={`relative z-10 flex items-center gap-3 min-w-0 ${!isExpanded ? 'justify-center' : ''}`}>
                        <Icon className={`w-4 h-4 shrink-0 transition-transform duration-200 ${isActive ? 'text-emerald-400 scale-110' : 'text-slate-400 group-hover:text-emerald-400 group-hover:scale-110'}`} />
                        {isExpanded && <span className="truncate font-bold">{item.label}</span>}
                      </div>
                      {item.badge && item.badge > 0 && (
                        <span
                          className={`relative z-10 rounded-full bg-cyan-400 text-slate-950 font-black leading-none shrink-0 shadow-sm ${
                            !isExpanded
                              ? 'absolute right-1.5 top-1.5 w-2 h-2 p-0 animate-pulse'
                              : 'ml-2 px-1.5 py-0.5 text-[9px]'
                          }`}
                        >
                          {isExpanded && item.badge}
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
        <div
          className="block mt-4 pt-3 border-t space-y-2 shrink-0"
          style={{ borderColor: isWhiteTheme ? '#f1f5f9' : '#1e293b' }}
        >
          {isExpanded ? (
            <>
              <button
                type="button"
                onClick={() => setShowClickUpModal(true)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition-all cursor-pointer ${
                  clickupConnected
                    ? 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20'
                    : 'bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/20'
                }`}
              >
                <div className={`w-5 h-5 rounded-md flex items-center justify-center text-white font-black text-[10px] shrink-0 ${
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
                  <div className="text-[10px] text-slate-400 truncate">
                    {clickupConnected ? (clickupUser || 'Workspace Synced') : 'Login with OAuth'}
                  </div>
                </div>
              </button>
              <div className="text-[10px] font-medium text-slate-400 text-center">
                Smart Allocation Hub v2.6
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-1.5">
              <button
                type="button"
                onClick={handleTogglePin}
                className="w-full flex justify-center p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-emerald-400 transition-all cursor-pointer"
                title="Pin Navigation Open"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            </div>
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
    </>
  );
};
