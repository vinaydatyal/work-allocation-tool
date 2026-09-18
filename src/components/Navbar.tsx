import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AppUserProfile } from '../types';
import { ClickUpOAuthModal } from './ClickUpOAuthModal';
import { handleClickUpCallback, isClickUpConnected, getClickUpUser } from '../services/clickupOAuth';
import { navigate } from '../utils/router';
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
  CalendarCheck,
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
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const [showCapacityTooltip, setShowCapacityTooltip] = useState(false);
  const [showClickUpModal, setShowClickUpModal] = useState(false);
  const [clickupConnected, setClickupConnected] = useState(isClickUpConnected());
  const [clickupUser, setClickupUser] = useState(getClickUpUser());
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const overallUtilization = Math.round((totalAllocated / totalCapacity) * 100) || 0;

  // Handle ClickUp OAuth callback on page load
  useEffect(() => {
    const result = handleClickUpCallback();
    if (result.token) {
      setClickupConnected(true);
      setClickupUser(result.user || null);
      setShowClickUpModal(true);
    } else if (result.error) {
      console.error('ClickUp OAuth error:', result.error);
    }
  }, []);

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    if (showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileMenu]);

  // Keyboard shortcut listener (1-9 for tabs)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const keyMap: Record<string, string> = {
        '1': 'projects',
        '2': 'calendar',
        '3': 'hours',
        '4': 'dsr',
        '5': 'skills',
        '6': 'bot',
        '7': 'finances',
        '8': 'notifications',
        '9': 'brief'
      };

      if (keyMap[e.key]) {
        setActiveTab(keyMap[e.key]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveTab]);

  const NAV_ITEMS: {
    id: 'projects' | 'calendar' | 'hours' | 'dsr' | 'skills' | 'bot' | 'finances' | 'notifications' | 'brief';
    label: string;
    shortLabel: string;
    shortcut: string;
    icon: React.ElementType;
    badge?: number;
  }[] = [
    {
      id: 'projects',
      label: '1. Active Projects',
      shortLabel: 'Projects',
      shortcut: '1',
      icon: Kanban
    },
    {
      id: 'calendar',
      label: 'Activity Calendar',
      shortLabel: 'Calendar',
      shortcut: '2',
      icon: Calendar
    },
    {
      id: 'hours',
      label: '2. Employee Hours',
      shortLabel: 'Hours',
      shortcut: '3',
      icon: BarChart3
    },
    {
      id: 'dsr',
      label: '3. DSR Tracker & Plan',
      shortLabel: 'DSR',
      shortcut: '4',
      icon: CalendarCheck
    },
    {
      id: 'skills',
      label: '4. Employee Skills',
      shortLabel: 'Skills',
      shortcut: '5',
      icon: Users
    },
    {
      id: 'bot',
      label: '5. Job Delivery Bot',
      shortLabel: 'Delivery Bot',
      shortcut: '6',
      icon: Sparkles
    },
    {
      id: 'finances',
      label: '6. Finances & Payments',
      shortLabel: 'Finances',
      shortcut: '7',
      icon: DollarSign
    },
    {
      id: 'notifications',
      label: '7. Notifications',
      shortLabel: 'Alerts',
      shortcut: '8',
      icon: Bell,
      badge: 4
    },
    {
      id: 'brief',
      label: 'Advanced Studio',
      shortLabel: 'Studio',
      shortcut: '9',
      icon: Activity
    }
  ];

  return (
    <>
      {/* FLOATING BOTTOM COMMAND DOCK */}
      <div 
        className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 pointer-events-auto"
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 50
        }}
        role="navigation"
        aria-label="Bottom Navigation Dock"
      >
        <div
          className="flex items-center gap-1.5 px-3 py-2 rounded-2xl border shadow-2xl backdrop-blur-2xl transition-all duration-300"
          style={{
            backgroundColor: isWhiteTheme ? 'rgba(255, 255, 255, 0.88)' : 'rgba(11, 15, 25, 0.88)',
            borderColor: isWhiteTheme ? 'rgba(226, 232, 240, 0.95)' : 'rgba(30, 41, 59, 0.85)',
            boxShadow: isWhiteTheme
              ? '0 20px 45px -10px rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(255, 255, 255, 0.8) inset'
              : '0 20px 50px -10px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(16, 185, 129, 0.18) inset'
          }}
        >
          {/* SECTION 1: LOGO & LIVE CAPACITY PULSE */}
          <div className="flex items-center gap-2 pr-2 border-r"
            style={{ borderColor: isWhiteTheme ? '#e2e8f0' : '#1e293b' }}
          >
            {/* Brand Icon */}
            <div 
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-800 via-slate-900 to-[#111827] border border-emerald-500/40 flex items-center justify-center shadow-lg shadow-emerald-500/15 shrink-0 group hover:scale-105 transition-transform cursor-pointer"
              title="Smart Allocation Hub"
              onClick={() => {
                setActiveTab('projects');
                navigate('/projects');
              }}
            >
              <Activity className="w-4.5 h-4.5 text-emerald-400 group-hover:scale-110 transition-transform" />
            </div>

            {/* Capacity Pulse Pill */}
            <div 
              className="relative"
              onMouseEnter={() => setShowCapacityTooltip(true)}
              onMouseLeave={() => setShowCapacityTooltip(false)}
            >
              <div 
                className="flex items-center gap-1.5 px-2 py-1 rounded-xl border text-[11px] font-black cursor-pointer transition-all hover:border-emerald-500/60"
                style={{
                  backgroundColor: isWhiteTheme ? '#f1f5f9' : 'rgba(15, 23, 42, 0.65)',
                  borderColor: isWhiteTheme ? '#cbd5e1' : '#334155',
                  color: isWhiteTheme ? '#0f172a' : '#ffffff'
                }}
              >
                <span className={`w-2 h-2 rounded-full ${overallUtilization > 85 ? 'bg-amber-400' : 'bg-emerald-400'} animate-pulse`} />
                <span>{overallUtilization}%</span>
              </div>

              {/* Capacity Details Floating Popover */}
              <AnimatePresence>
                {showCapacityTooltip && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute bottom-full mb-3 left-0 p-3 rounded-xl border shadow-2xl backdrop-blur-xl w-48 pointer-events-none z-50"
                    style={{
                      backgroundColor: isWhiteTheme ? '#ffffff' : '#0f172a',
                      borderColor: isWhiteTheme ? '#cbd5e1' : '#334155',
                      color: isWhiteTheme ? '#0f172a' : '#ffffff'
                    }}
                  >
                    <div className="flex items-center justify-between text-xs font-bold mb-1">
                      <span className="text-slate-400">Team Capacity:</span>
                      <span className="text-emerald-400 font-extrabold">{overallUtilization}%</span>
                    </div>
                    <div className="text-[11px] font-bold text-slate-300 mb-2">
                      {totalAllocated}h / {totalCapacity}h allocated
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden border border-slate-700">
                      <div 
                        className="h-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-indigo-500 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, overallUtilization)}%` }}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* SECTION 2: PRIMARY NAVIGATION ICONS */}
          <div className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const isHovered = hoveredTab === item.id;

              return (
                <div key={item.id} className="relative">
                  <motion.button
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      navigate('/' + item.id);
                    }}
                    onMouseEnter={() => setHoveredTab(item.id)}
                    onMouseLeave={() => setHoveredTab(null)}
                    whileHover={{ scale: 1.15, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                    className={`relative p-2.5 rounded-xl transition-colors cursor-pointer flex items-center justify-center ${
                      isActive
                        ? isWhiteTheme
                          ? 'text-emerald-700 font-extrabold'
                          : 'text-emerald-400 font-extrabold'
                        : isWhiteTheme
                        ? 'text-slate-600 hover:text-slate-900'
                        : 'text-slate-400 hover:text-slate-100'
                    }`}
                  >
                    {/* Animated Sliding Background Pill for Active Tab */}
                    {isActive && (
                      <motion.div
                        layoutId="activeDockTab"
                        className={`absolute inset-0 rounded-xl border ${
                          isWhiteTheme
                            ? 'bg-emerald-500/15 border-emerald-500/40 shadow-sm'
                            : 'bg-emerald-500/20 border-emerald-500/50 shadow-lg shadow-emerald-500/15'
                        }`}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}

                    <Icon className={`w-5 h-5 relative z-10 transition-transform ${isActive ? 'scale-110' : ''}`} />

                    {/* Unread Alert Dot / Number Badge */}
                    {item.badge && item.badge > 0 && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-cyan-400 ring-2 ring-slate-950 animate-pulse z-20" />
                    )}
                  </motion.button>

                  {/* Micro Floating Tooltip on Hover */}
                  <AnimatePresence>
                    {isHovered && (
                      <motion.div
                        initial={{ opacity: 0, y: 5, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 5, scale: 0.9 }}
                        transition={{ duration: 0.12 }}
                        className="absolute bottom-full mb-2.5 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap shadow-xl border pointer-events-none z-50 flex items-center gap-1.5"
                        style={{
                          backgroundColor: isWhiteTheme ? '#ffffff' : '#0f172a',
                          borderColor: isWhiteTheme ? '#cbd5e1' : '#334155',
                          color: isWhiteTheme ? '#0f172a' : '#ffffff'
                        }}
                      >
                        <span>{item.label}</span>
                        <span className="text-[10px] px-1 py-0.2 rounded font-mono bg-slate-800/80 text-slate-400 border border-slate-700">
                          {item.shortcut}
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {/* SECTION 3: DIVIDER */}
          <div 
            className="h-6 w-px mx-1"
            style={{ backgroundColor: isWhiteTheme ? '#e2e8f0' : '#1e293b' }}
          />

          {/* SECTION 4: ACTIONS & UTILITIES */}
          <div className="flex items-center gap-1">
            {/* ClickUp Sync Trigger */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.15, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowClickUpModal(true)}
              className={`relative p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                clickupConnected
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                  : 'bg-purple-900/30 border-purple-500/30 text-purple-300 hover:border-purple-400/50'
              }`}
              title={clickupConnected ? `ClickUp Connected (${clickupUser || 'Synced'})` : 'Connect ClickUp'}
            >
              <div className={`w-4 h-4 rounded text-[10px] font-black text-white flex items-center justify-center ${
                clickupConnected ? 'bg-emerald-600' : 'bg-gradient-to-br from-purple-600 to-pink-600'
              }`}>
                C
              </div>
              <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${clickupConnected ? 'bg-emerald-400' : 'bg-purple-400'} ring-2 ring-slate-950`} />
            </motion.button>

            {/* Export Weekly Plan */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.15, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={onExportPlan}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                isWhiteTheme
                  ? 'border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900'
                  : 'border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-emerald-400'
              }`}
              title="Export Work Allocation Plan (.txt)"
            >
              <Download className="w-4 h-4" />
            </motion.button>

            {/* Theme Toggle (Sun/Moon) */}
            {onToggleTheme && (
              <motion.button
                type="button"
                whileHover={{ scale: 1.15, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={onToggleTheme}
                className={`p-2 rounded-xl border transition-all cursor-pointer ${
                  isWhiteTheme
                    ? 'border-slate-200 hover:bg-slate-100 text-amber-500'
                    : 'border-slate-800 hover:bg-slate-800 text-cyan-400'
                }`}
                title={isWhiteTheme ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              >
                {isWhiteTheme ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-cyan-400" />}
              </motion.button>
            )}

            {/* User Profile Flyup Menu */}
            <div className="relative" ref={profileMenuRef}>
              <motion.button
                type="button"
                whileHover={{ scale: 1.12, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-1 p-1 rounded-xl border border-slate-700/80 hover:border-emerald-500/50 transition-all cursor-pointer"
                title={`Active Profile: ${currentProfile.name} (${currentProfile.roleTitle})`}
              >
                <img
                  src={currentProfile.avatar}
                  alt={currentProfile.name}
                  className="w-6 h-6 rounded-lg object-cover ring-1 ring-emerald-500/40"
                />
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </motion.button>

              {/* Profile Selection Popover (Flies Up from Dock) */}
              <AnimatePresence>
                {showProfileMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute bottom-full mb-3 right-0 rounded-2xl shadow-2xl p-2 w-64 border backdrop-blur-2xl z-50"
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
                            type="button"
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
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
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
    </>
  );
};
