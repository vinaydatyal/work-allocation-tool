import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ToastProvider, QuickFAB, KeyboardShortcutsModal } from './components/TopTierUI';
import { Navbar } from './components/Navbar';
import { VisualAgencyHub } from './components/VisualAgencyHub';
import { MemberProfilePage } from './components/MemberProfilePage';
import { ProjectBriefAnalyzer } from './components/ProjectBriefAnalyzer';
import { ProjectAllocationWizard } from './components/ProjectAllocationWizard';
import { AllocatorGrid } from './components/AllocatorGrid';
import { TaskBacklog } from './components/TaskBacklog';
import { ResourceTimeline } from './components/ResourceTimeline';
import { SprintKanban } from './components/SprintKanban';
import { TeamRosterStudio } from './components/TeamRosterStudio';
import { OrgMapStudio } from './components/OrgMapStudio';
import { MondayAllocationWarRoom } from './components/MondayAllocationWarRoom';
import { SkillGapHiringMatrix } from './components/SkillGapHiringMatrix';
import { SkillEvaluationCenter } from './components/SkillEvaluationCenter';
import { SlaRiskRadar } from './components/SlaRiskRadarModal';
import { ClickUpBatchSyncModal } from './components/ClickUpBatchSyncModal';
import { CommandPaletteModal } from './components/CommandPaletteModal';
import { initialTeamMembers, initialTasks } from './data/mockData';
import { appUserProfiles } from './data/userProfiles';
import type { TeamMember, Task, SkillCategory, TaskStatus, AppUserProfile, ProjectResourceBlock, ClientReadyTier } from './types';
import { calculateMemberAllocatedHours } from './utils/matchingEngine';
import { daysFromToday } from './utils/dateUtils';
import { useAppRouter, navigate } from './utils/router';
import { supabase } from './lib/supabase';

import { Toaster } from 'sonner';

export function App() {
  const router = useAppRouter();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(initialTeamMembers);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [currentProfile, setCurrentProfile] = useState<AppUserProfile>(appUserProfiles[0]);

  // Sync activeTab with router.route (or default to 'projects')
  const activeTab = router.route === 'member' ? 'projects' : (router.route || 'projects');
  const [isWhiteTheme, setIsWhiteTheme] = useState<boolean>(true);
  const [showShortcutsModal, setShowShortcutsModal] = useState<boolean>(false);
  const [showCommandPalette, setShowCommandPalette] = useState<boolean>(false);
  const [showBatchSyncModal, setShowBatchSyncModal] = useState<boolean>(false);
  const [triggerAddProjectModal, setTriggerAddProjectModal] = useState<boolean>(false);

  // Compute live count of deliverables with impending SLA risk (<48h)
  const slaRiskCount = useMemo(() => {
    const now = Date.now();
    return tasks.filter((t) => {
      if (t.status === 'completed') return false;
      const due = t.dueDate ? new Date(t.dueDate).getTime() : now + 24 * 3600000;
      const diffHours = (due - now) / 3600000;
      const est = Number(t.estimatedHours) || 1;
      const log = Number(t.actualHoursLogged) || 0;
      return diffHours <= 48 && (log / est) < 0.5;
    }).length;
  }, [tasks]);

  const handleNavigateTab = (tab: string) => {
    navigate('/' + tab);
  };

  useEffect(() => {
    const fetchTeamMembers = async () => {
      const { data, error } = await supabase.from('profiles').select('*');
      if (data && !error) {
        setTeamMembers((prev) => {
          // Merge supabase profiles with mockData (using mockData for fields like skills, capacity if missing in db)
          const merged = prev.map(m => {
            const dbProf = data.find(p => p.id === m.id);
            if (dbProf) {
              return { ...m, name: dbProf.name, role: dbProf.role_title || m.role, avatar: dbProf.avatar || m.avatar };
            }
            return m;
          });
          // Add any new profiles from DB that are not in mockData
          const newProfs = data.filter(p => !prev.some(m => m.id === p.id)).map(p => ({
            id: p.id,
            name: p.name,
            role: p.role_title || 'Executive',
            department: 'SEO' as const,
            seniority: 'Executive' as const,
            avatar: p.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
            weeklyCapacityHours: 40,
            skills: ['Technical SEO'] as any,
            completedSprintTasks: 0,
            colorSwatch: '#10B981',
            generalCompetency: {
              englishProficiency: 8,
              clientCommunication: 8,
              requirementUnderstanding: 8,
              proactivityReliability: 8,
              clientReadyTier: 'Tier 2: Direct Email Capable',
              lastTestedDate: new Date().toISOString().split('T')[0]
            },
            skillScores: []
          }));
          return [...merged, ...newProfs];
        });
      }
    };
    fetchTeamMembers();
  }, []);

  useEffect(() => {
    if (isWhiteTheme) {
      document.body.classList.add('theme-white');
    } else {
      document.body.classList.remove('theme-white');
    }
  }, [isWhiteTheme]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Global hotkey: Ctrl + K or Cmd + K opens Command Palette everywhere
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
        return;
      }

      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (e.key === '/') {
        e.preventDefault();
        setShowCommandPalette(true);
      } else if (e.key === '1') {
        navigate('/projects');
      } else if (e.key === '2') {
        navigate('/calendar');
      } else if (e.key === '3') {
        navigate('/hours');
      } else if (e.key === '4') {
        navigate('/dsr');
      } else if (e.key === '5') {
        navigate('/skills');
      } else if (e.key === '6') {
        navigate('/bot');
      } else if (e.key === '7') {
        navigate('/finances');
      } else if (e.key === '8') {
        navigate('/notifications');
      } else if (e.key === '9') {
        navigate('/brief');
      } else if (e.key === '0') {
        navigate('/war-room');
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        handleNavigateTab('projects');
        setTriggerAddProjectModal(true);
      } else if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        setIsWhiteTheme((prev) => !prev);
      } else if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        setShowShortcutsModal((prev) => !prev);
      } else if (e.key === 'Escape') {
        setShowShortcutsModal(false);
        setShowCommandPalette(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const totalCapacity = teamMembers.reduce((sum, m) => sum + m.weeklyCapacityHours, 0);
  const totalAllocated = Number(
    teamMembers.reduce((sum, m) => sum + calculateMemberAllocatedHours(m.id, tasks), 0).toFixed(1)
  );

  const handleDispatchTask = (taskId: string, memberId: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, assignedUserId: memberId, status: 'assigned' } : t))
    );
  };

  const handleAddTask = (newTask: Task) => {
    setTasks((prev) => [newTask, ...prev]);
  };

  const handleAddMember = async (newMember: TeamMember) => {
    setTeamMembers((prev) => [...prev, newMember]);
    await supabase.from('profiles').insert({
      id: newMember.id,
      name: newMember.name,
      role_type: 'MEMBER',
      role_title: newMember.role,
      avatar: newMember.avatar,
    });
  };

  const handleDeleteMember = async (memberId: string) => {
    setTeamMembers((prev) => prev.filter((member) => member.id !== memberId));
    setTasks((prev) =>
      prev.map((task) =>
        task.assignedUserId === memberId
          ? { ...task, assignedUserId: null, status: 'backlog' }
          : task
      )
    );
    await supabase.from('profiles').delete().eq('id', memberId);
  };

  const handleUpdateMember = async (member: TeamMember) => {
    setTeamMembers((prev) => prev.map((m) => m.id === member.id ? member : m));
    await supabase.from('profiles').update({
      name: member.name,
      role_title: member.role,
    }).eq('id', member.id);
  };

  const handleUpdateTaskStatus = (taskId: string, newStatus: TaskStatus) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
  };

  const handleUpdateMemberScores = (
    memberId: string,
    skill: SkillCategory,
    quality: number,
    speed: number,
    comm: number
  ) => {
    setTeamMembers((prev) =>
      prev.map((m) => {
        if (m.id === memberId) {
          const updatedScores = m.skillScores.map((s) =>
            s.skill === skill
              ? { ...s, quality, speedEfficiency: speed, communication: comm }
              : s
          );
          return { ...m, skillScores: updatedScores };
        }
        return m;
      })
    );
  };

  const handleUpdateGeneralCompetency = (
    memberId: string,
    englishProficiency: number,
    clientCommunication: number,
    requirementUnderstanding: number,
    proactivityReliability: number,
    clientReadyTier: ClientReadyTier
  ) => {
    setTeamMembers((prev) =>
      prev.map((m) =>
        m.id === memberId
          ? {
              ...m,
              generalCompetency: {
                englishProficiency,
                clientCommunication,
                requirementUnderstanding,
                proactivityReliability,
                clientReadyTier,
                lastTestedDate: new Date().toISOString().split('T')[0]
              }
            }
          : m
      )
    );
  };

  const handleConfirmProjectAllocation = (
    projectName: string,
    clientName: string,
    items: { block: ProjectResourceBlock; memberId: string }[]
  ) => {
    const newTasks: Task[] = items.map((item, idx) => ({
      id: `tsk_prj_${Date.now()}_${idx}`,
      title: `[${projectName}] ${item.block.title}`,
      clientName,
      requiredSkill: item.block.skill,
      estimatedHours: item.block.hours,
      actualHoursLogged: 0,
      assignedUserId: item.memberId,
      priority: item.block.priority,
      status: 'assigned',
      dueDate: daysFromToday(7),
      categoryColor: '#10B981'
    }));

    setTasks((prev) => [...newTasks, ...prev]);
  };

  const handleExportPlan = () => {
    const lines: string[] = [
      '==============================================================',
      '        SMART WORK ALLOCATION & RESOURCE PLAN SUMMARY         ',
      '==============================================================',
      `Generated By: ${currentProfile.name} (${currentProfile.roleTitle})`,
      `Total Agency Capacity: ${totalCapacity} Hrs / Week`,
      `Total Assigned Workload: ${totalAllocated} Hrs / Week`,
      `Overall Agency Utilization: ${Math.round((totalAllocated / totalCapacity) * 100)}%`,
      '',
      '--- TEAM SPECIALIST BREAKDOWN ---'
    ];

    teamMembers.forEach((m) => {
      const allocated = calculateMemberAllocatedHours(m.id, tasks);
      lines.push(`• ${m.name} (${m.role}) — ${allocated}/${m.weeklyCapacityHours} Hrs Booked`);
      const mTasks = tasks.filter((t) => t.assignedUserId === m.id && t.status !== 'completed');
      mTasks.forEach((t) => {
        lines.push(`    - [${t.priority}] ${t.title} (${t.estimatedHours}h - Skill: ${t.requiredSkill})`);
      });
      lines.push('');
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Weekly_Work_Allocation_Plan_${currentProfile.roleType}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleConfirmBriefAllocation = (
    projectName: string,
    clientName: string,
    assignments: { memberId: string; title: string; skill: any; hours: number }[]
  ) => {
    const newTasks: Task[] = assignments.map((item, idx) => ({
      id: `tsk_brf_${Date.now()}_${idx}`,
      title: `${projectName} — ${item.title}`,
      clientName,
      requiredSkill: item.skill,
      estimatedHours: item.hours,
      actualHoursLogged: 0,
      assignedUserId: item.memberId,
      priority: 'High',
      status: 'assigned',
      dueDate: daysFromToday(7),
      categoryColor: '#10B981'
    }));

    setTasks((prev) => [...newTasks, ...prev]);
  };

  return (
    <ToastProvider>
      <Toaster theme="dark" position="bottom-right" />
      <div className="borderless-ui min-h-screen bg-[#0b0f19] text-slate-100 selection:bg-emerald-500 selection:text-slate-950 flex flex-col font-sans overflow-hidden relative">
        <Navbar
          activeTab={router.route === 'member' ? '' : activeTab}
          setActiveTab={handleNavigateTab}
          totalCapacity={totalCapacity}
          totalAllocated={totalAllocated}
          onExportPlan={handleExportPlan}
          currentProfile={currentProfile}
          allProfiles={appUserProfiles}
          onSwitchProfile={setCurrentProfile}
          isWhiteTheme={isWhiteTheme}
          onToggleTheme={() => setIsWhiteTheme(!isWhiteTheme)}
          onOpenBatchSync={() => setShowBatchSyncModal(true)}
          slaRiskCount={slaRiskCount}
        />

        <div className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
          <main className="flex-1 min-w-0 w-full px-5 sm:px-8 lg:px-10 pt-5 pb-32 overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={router.route === 'member' ? `member-${router.memberId}-${router.memberTab}` : activeTab}
                initial={{ opacity: 0, y: 15, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.99 }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              >
                {router.route === 'member' && router.memberId ? (
                  <MemberProfilePage
                    memberId={router.memberId}
                    activeSubTab={router.memberTab}
                    allMembers={teamMembers}
                    allTasks={tasks}
                    isWhiteTheme={isWhiteTheme}
                    onUpdateTaskStatus={handleUpdateTaskStatus}
                  />
                ) : (
                  <>
                    {(activeTab === 'projects' ||
                      activeTab === 'calendar' ||
                      activeTab === 'hours' ||
                      activeTab === 'dsr' ||
                      activeTab === 'skills' ||
                      activeTab === 'bot' ||
                      activeTab === 'finances' ||
                      activeTab === 'notifications') && (
                      <VisualAgencyHub
                        teamMembers={teamMembers}
                        tasks={tasks}
                        onAddMember={handleAddMember}
                        onDeleteMember={handleDeleteMember}
                        onUpdateMember={handleUpdateMember}
                        activeView={activeTab as any}
                        onNavigateView={(view) => handleNavigateTab(view)}
                    isWhiteTheme={isWhiteTheme}
                    onToggleTheme={() => setIsWhiteTheme(!isWhiteTheme)}
                    triggerAddProjectModal={triggerAddProjectModal}
                    onResetTriggerAddProjectModal={() => setTriggerAddProjectModal(false)}
                    onDeliverJob={(pName, hours, memberIds) => {
                      const newTasks: Task[] = memberIds.map((mId, idx) => ({
                        id: `bot-${Date.now()}-${idx}`,
                        title: `${pName} Deliverable`,
                        clientName: pName.split(' ')[0],
                        projectName: pName,
                        requiredSkill: 'Technical SEO' as any,
                        estimatedHours: Math.round(hours / memberIds.length),
                        actualHoursLogged: 0,
                        dueDate: daysFromToday(7),
                        categoryColor: 'emerald',
                        status: 'assigned',
                        priority: 'High',
                        assignedUserId: mId
                      }));
                      setTasks((prev) => [...newTasks, ...prev]);
                    }}
                  />
                )}

                {activeTab === 'brief' && (
                  <ProjectBriefAnalyzer
                    teamMembers={teamMembers}
                    tasks={tasks}
                    currentProfile={currentProfile}
                    onConfirmAllocation={handleConfirmBriefAllocation}
                  />
                )}

                {activeTab === 'war-room' && (
                  <MondayAllocationWarRoom
                    teamMembers={teamMembers}
                    tasks={tasks}
                    onDispatchTask={handleDispatchTask}
                    onAddTask={handleAddTask}
                    onUpdateTaskStatus={handleUpdateTaskStatus}
                    isWhiteTheme={isWhiteTheme}
                    onOpenBatchSync={() => setShowBatchSyncModal(true)}
                  />
                )}

                {activeTab === 'wizard' && (
                  <ProjectAllocationWizard
                    teamMembers={teamMembers}
                    tasks={tasks}
                    currentProfile={currentProfile}
                    onConfirmProjectAllocation={handleConfirmProjectAllocation}
                  />
                )}

                {activeTab === 'testing' && (
                  <SkillEvaluationCenter
                    teamMembers={teamMembers}
                    currentProfile={currentProfile}
                    onUpdateGeneralCompetency={handleUpdateGeneralCompetency}
                  />
                )}

                {activeTab === 'macro' && (
                  <AllocatorGrid teamMembers={teamMembers} tasks={tasks} />
                )}

                {activeTab === 'timeline' && (
                  <ResourceTimeline teamMembers={teamMembers} tasks={tasks} />
                )}

                {activeTab === 'backlog' && (
                  <TaskBacklog
                    tasks={tasks}
                    teamMembers={teamMembers}
                    onDispatchTask={handleDispatchTask}
                    onAddTask={handleAddTask}
                  />
                )}

                {activeTab === 'kanban' && (
                  <SprintKanban
                    tasks={tasks}
                    teamMembers={teamMembers}
                    currentProfile={currentProfile}
                    onUpdateTaskStatus={handleUpdateTaskStatus}
                  />
                )}

                {activeTab === 'roster' && (
                  <TeamRosterStudio
                    teamMembers={teamMembers}
                    currentProfile={currentProfile}
                    onAddMember={handleAddMember}
                    onUpdateMemberScores={handleUpdateMemberScores}
                  />
                )}

                {activeTab === 'org' && (
                  <OrgMapStudio
                    currentProfile={currentProfile}
                    teamMembers={teamMembers}
                    tasks={tasks}
                    isWhiteTheme={isWhiteTheme}
                  />
                )}

                {(activeTab === 'matrix' || activeTab === 'hiring') && (
                  <SkillGapHiringMatrix
                    teamMembers={teamMembers}
                    tasks={tasks}
                    isWhiteTheme={isWhiteTheme}
                  />
                )}

                {(activeTab === 'sla' || activeTab === 'radar') && (
                  <SlaRiskRadar
                    tasks={tasks}
                    teamMembers={teamMembers}
                    onReassignTask={handleDispatchTask}
                  />
                )}
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </main>

          <footer className="border-t border-slate-900/80 bg-slate-950/90 py-3.5 px-6 text-center text-xs text-slate-500 shrink-0">
            <p>
              Smart Work Allocation Hub v2.0 • ClickUp Companion Decision Engine • Session: <strong className="text-slate-400">{currentProfile.name}</strong> • Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-cyan-300 font-mono text-[10px]">?</kbd> for shortcuts
            </p>
          </footer>
        </div>
      </div>

      {/* Floating Action Button */}
      <QuickFAB
        onAddProject={() => {
          handleNavigateTab('projects');
          setTriggerAddProjectModal(true);
        }}
        onToggleTheme={() => setIsWhiteTheme((prev) => !prev)}
        isWhiteTheme={isWhiteTheme}
        onOpenShortcuts={() => setShowShortcutsModal(true)}
      />

      {/* Keyboard Shortcuts Reference Modal */}
      <KeyboardShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />

      {/* Universal Command Palette (Ctrl+K) */}
      <CommandPaletteModal
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        teamMembers={teamMembers}
        tasks={tasks}
        isWhiteTheme={isWhiteTheme}
        onToggleTheme={() => setIsWhiteTheme((prev) => !prev)}
        onOpenShortcutsGuide={() => setShowShortcutsModal(true)}
        onTriggerAddProject={() => {
          handleNavigateTab('projects');
          setTriggerAddProjectModal(true);
        }}
        onTriggerBatchSync={() => setShowBatchSyncModal(true)}
      />

      {/* 1-Click Full Agency ClickUp Bi-Directional Batch Sync Modal */}
      <ClickUpBatchSyncModal
        isOpen={showBatchSyncModal}
        onClose={() => setShowBatchSyncModal(false)}
        tasks={tasks}
        onUpdateTasks={(updated) => setTasks(updated)}
      />
    </ToastProvider>
  );
}

export default App;
