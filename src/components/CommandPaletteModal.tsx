import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { TeamMember, Task } from '../types';
import type { ActiveProjectItem } from './VisualAgencyHub';
import { navigate } from '../utils/router';
import {
  Search,
  Kanban,
  Calendar,
  Clock,
  FileSpreadsheet,
  Award,
  Bot,
  DollarSign,
  Bell,
  Sparkles,
  User,
  PlusCircle,
  Sun,
  Moon,
  Keyboard,
  Briefcase,
  ChevronRight
} from 'lucide-react';

export interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamMembers: TeamMember[];
  tasks: Task[];
  projects?: ActiveProjectItem[];
  isWhiteTheme: boolean;
  onToggleTheme: () => void;
  onOpenShortcutsGuide: () => void;
  onTriggerAddProject: () => void;
}

interface CommandItem {
  id: string;
  title: string;
  category: 'Navigation' | 'Team Members' | 'Quick Actions' | 'Projects';
  subtitle?: string;
  icon: React.ElementType;
  shortcut?: string;
  action: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  teamMembers,
  tasks: _tasks,
  projects = [],
  isWhiteTheme,
  onToggleTheme,
  onOpenShortcutsGuide,
  onTriggerAddProject
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const allCommands: CommandItem[] = useMemo(() => {
    const items: CommandItem[] = [];

    // Navigation Commands
    items.push(
      {
        id: 'nav-projects',
        title: 'Go to Active Projects',
        category: 'Navigation',
        subtitle: 'View agency roster, project status & squads',
        icon: Kanban,
        shortcut: '1',
        action: () => {
          navigate('/projects');
          onClose();
        }
      },
      {
        id: 'nav-calendar',
        title: 'Go to Activity Calendar',
        category: 'Navigation',
        subtitle: 'Sprint timeline & milestone deadlines',
        icon: Calendar,
        shortcut: '2',
        action: () => {
          navigate('/calendar');
          onClose();
        }
      },
      {
        id: 'nav-hours',
        title: 'Go to Workload & Capacity',
        category: 'Navigation',
        subtitle: 'Bandwidth utilization & allocations',
        icon: Clock,
        shortcut: '3',
        action: () => {
          navigate('/hours');
          onClose();
        }
      },
      {
        id: 'nav-dsr',
        title: 'Go to DSR Tracker Studio',
        category: 'Navigation',
        subtitle: 'Daily status report tracking & hours',
        icon: FileSpreadsheet,
        shortcut: '4',
        action: () => {
          navigate('/dsr');
          onClose();
        }
      },
      {
        id: 'nav-skills',
        title: 'Go to Skills Matrix',
        category: 'Navigation',
        subtitle: 'Team competency scores & calibration',
        icon: Award,
        shortcut: '5',
        action: () => {
          navigate('/skills');
          onClose();
        }
      },
      {
        id: 'nav-bot',
        title: 'Go to Job Delivery Bot',
        category: 'Navigation',
        subtitle: 'Smart auto-matching & dispatch',
        icon: Bot,
        shortcut: '6',
        action: () => {
          navigate('/bot');
          onClose();
        }
      },
      {
        id: 'nav-finances',
        title: 'Go to Financial & Payments',
        category: 'Navigation',
        subtitle: 'Invoices, retainers & billing status',
        icon: DollarSign,
        shortcut: '7',
        action: () => {
          navigate('/finances');
          onClose();
        }
      },
      {
        id: 'nav-notifications',
        title: 'Go to Notifications',
        category: 'Navigation',
        subtitle: 'System alerts & delivery pings',
        icon: Bell,
        shortcut: '8',
        action: () => {
          navigate('/notifications');
          onClose();
        }
      },
      {
        id: 'nav-brief',
        title: 'Go to Project Brief Analyzer',
        category: 'Navigation',
        subtitle: 'Claude AI brief parsing & work slice estimator',
        icon: Sparkles,
        shortcut: '9',
        action: () => {
          navigate('/brief');
          onClose();
        }
      }
    );

    // Quick Actions
    items.push(
      {
        id: 'action-add-project',
        title: 'Create New Project',
        category: 'Quick Actions',
        subtitle: 'Open new project creation wizard',
        icon: PlusCircle,
        shortcut: 'N',
        action: () => {
          onClose();
          onTriggerAddProject();
        }
      },
      {
        id: 'action-toggle-theme',
        title: isWhiteTheme ? 'Switch to Dark Mode' : 'Switch to Clean Light Mode',
        category: 'Quick Actions',
        subtitle: 'Toggle global color theme',
        icon: isWhiteTheme ? Moon : Sun,
        shortcut: 'D',
        action: () => {
          onToggleTheme();
          onClose();
        }
      },
      {
        id: 'action-shortcuts-guide',
        title: 'Keyboard Shortcuts Guide',
        category: 'Quick Actions',
        subtitle: 'View cheatsheet of all keyboard shortcuts',
        icon: Keyboard,
        shortcut: '?',
        action: () => {
          onClose();
          onOpenShortcutsGuide();
        }
      }
    );

    // Team Members
    teamMembers.forEach((m) => {
      items.push({
        id: `member-${m.id}`,
        title: m.name,
        category: 'Team Members',
        subtitle: `${m.role} • ${m.department} (${m.weeklyCapacityHours}h cap)`,
        icon: User,
        action: () => {
          navigate(`/member/${m.id}`);
          onClose();
        }
      });
    });

    // Active Projects (Top 15)
    projects.slice(0, 15).forEach((p) => {
      items.push({
        id: `proj-${p.id}`,
        title: p.name,
        category: 'Projects',
        subtitle: `${p.client} • ${p.status || 'Active'} • ${p.activeHours || 10}h allocated`,
        icon: Briefcase,
        action: () => {
          navigate('/projects');
          onClose();
        }
      });
    });

    return items;
  }, [teamMembers, projects, isWhiteTheme, onToggleTheme, onOpenShortcutsGuide, onTriggerAddProject, onClose]);

  // Filter items by search query
  const filteredCommands = useMemo(() => {
    if (!query.trim()) return allCommands;
    const q = query.toLowerCase().trim();
    return allCommands.filter(
      (cmd) =>
        cmd.title.toLowerCase().includes(q) ||
        (cmd.subtitle && cmd.subtitle.toLowerCase().includes(q)) ||
        cmd.category.toLowerCase().includes(q)
    );
  }, [allCommands, query]);

  // Keyboard navigation inside the palette
  useEffect(() => {
    const handlePaletteKey = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handlePaletteKey);
    return () => window.removeEventListener('keydown', handlePaletteKey);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  // Group commands by category for display
  const groupedCommands = useMemo(() => {
    const groups: { category: string; items: CommandItem[] }[] = [];
    const catMap = new Map<string, CommandItem[]>();

    filteredCommands.forEach((cmd) => {
      if (!catMap.has(cmd.category)) {
        catMap.set(cmd.category, []);
      }
      catMap.get(cmd.category)!.push(cmd);
    });

    catMap.forEach((items, category) => {
      groups.push({ category, items });
    });

    return groups;
  }, [filteredCommands]);

  if (!isOpen) return null;

  let flatIndexCounter = -1;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[75vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-800 bg-slate-900/90">
          <Search className="w-5 h-5 text-cyan-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command, search member, project, or tab... (Esc to exit)"
            className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none font-medium"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-xs text-slate-500 hover:text-slate-300 font-bold px-1.5 py-0.5 rounded bg-slate-800 cursor-pointer"
            >
              Clear
            </button>
          )}
          <span className="text-[10px] text-slate-500 font-mono px-1.5 py-0.5 rounded border border-slate-800 bg-slate-950/60 shrink-0">
            ESC
          </span>
        </div>

        {/* Results List */}
        <div ref={listRef} className="overflow-y-auto p-2 space-y-3 max-h-[55vh]">
          {filteredCommands.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <Search className="w-8 h-8 mx-auto text-slate-600" />
              <p className="text-sm font-semibold text-slate-400">No matching commands or members found</p>
              <p className="text-xs">Try searching for "Vivek", "Projects", "Skills", or "Theme"</p>
            </div>
          ) : (
            groupedCommands.map((group) => (
              <div key={group.category} className="space-y-1">
                <div className="px-3 py-1 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  {group.category}
                </div>
                {group.items.map((cmd) => {
                  flatIndexCounter++;
                  const isSelected = flatIndexCounter === selectedIndex;
                  const Icon = cmd.icon;

                  return (
                    <button
                      key={cmd.id}
                      type="button"
                      onClick={() => cmd.action()}
                      onMouseEnter={() => setSelectedIndex(flatIndexCounter)}
                      className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-cyan-500/20 text-white border border-cyan-500/40 shadow-sm'
                          : 'text-slate-300 hover:bg-slate-800/60 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-cyan-500/30 text-cyan-300' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate text-white">{cmd.title}</div>
                          {cmd.subtitle && (
                            <div className="text-[10px] text-slate-400 truncate">{cmd.subtitle}</div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {cmd.shortcut && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 border border-slate-700 text-slate-300">
                            {cmd.shortcut}
                          </span>
                        )}
                        <ChevronRight className={`w-3.5 h-3.5 ${isSelected ? 'text-cyan-400' : 'text-slate-600'}`} />
                      </div>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span><strong className="text-slate-200">↑↓</strong> to navigate</span>
            <span><strong className="text-slate-200">↵</strong> to select</span>
            <span><strong className="text-slate-200">Esc</strong> to close</span>
          </div>
          <div className="text-[10px] text-slate-500">
            Universal Command Palette (Ctrl+K)
          </div>
        </div>
      </div>
    </div>
  );
};
