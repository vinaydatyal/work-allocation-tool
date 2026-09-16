import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ToastProvider, QuickFAB, KeyboardShortcutsModal } from './components/TopTierUI';
import { Navbar } from './components/Navbar';
import { VisualAgencyHub } from './components/VisualAgencyHub';
import { ProjectBriefAnalyzer } from './components/ProjectBriefAnalyzer';
import { ProjectAllocationWizard } from './components/ProjectAllocationWizard';
import { AllocatorGrid } from './components/AllocatorGrid';
import { TaskBacklog } from './components/TaskBacklog';
import { ResourceTimeline } from './components/ResourceTimeline';
import { SprintKanban } from './components/SprintKanban';
import { TeamRosterStudio } from './components/TeamRosterStudio';
import { SkillEvaluationCenter } from './components/SkillEvaluationCenter';
import { initialTeamMembers, initialTasks } from './data/mockData';
import { appUserProfiles } from './data/userProfiles';
import type { TeamMember, Task, SkillCategory, TaskStatus, AppUserProfile, ProjectResourceBlock, ClientReadyTier } from './types';
import { calculateMemberAllocatedHours } from './utils/matchingEngine';
import { daysFromToday } from './utils/dateUtils';

import { Toaster } from 'sonner';

export function App() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(initialTeamMembers);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [currentProfile, setCurrentProfile] = useState<AppUserProfile>(appUserProfiles[0]);

  const [activeTab, setActiveTab] = useState<string>('projects');
  const [isWhiteTheme, setIsWhiteTheme] = useState<boolean>(true);
  const [showShortcutsModal, setShowShortcutsModal] = useState<boolean>(false);
  const [triggerAddProjectModal, setTriggerAddProjectModal] = useState<boolean>(false);

  useEffect(() => {
    if (isWhiteTheme) {
      document.body.classList.add('theme-white');
    } else {
      document.body.classList.remove('theme-white');
    }
  }, [isWhiteTheme]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (e.key === '1') {
        setActiveTab('projects');
      } else if (e.key === '2') {
        setActiveTab('hours');
      } else if (e.key === '3') {
        setActiveTab('dsr');
      } else if (e.key === '4') {
        setActiveTab('skills');
      } else if (e.key === '5') {
        setActiveTab('bot');
      } else if (e.key === '6') {
        setActiveTab('finances');
      } else if (e.key === '7') {
        setActiveTab('notifications');
      } else if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        setShowShortcutsModal((prev) => !prev);
      } else if (e.key === 'Escape') {
        setShowShortcutsModal(false);
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

  const handleAddMember = (newMember: TeamMember) => {
    setTeamMembers((prev) => [...prev, newMember]);
  };

  const handleDeleteMember = (memberId: string) => {
    setTeamMembers((prev) => prev.filter((member) => member.id !== memberId));
    setTasks((prev) =>
      prev.map((task) =>
        task.assignedUserId === memberId
          ? { ...task, assignedUserId: null, status: 'backlog' }
          : task
      )
    );
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
      <div className="borderless-ui min-h-screen bg-[#0b0f19] text-slate-100 selection:bg-emerald-500 selection:text-slate-950 flex flex-row font-sans overflow-hidden">
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          totalCapacity={totalCapacity}
          totalAllocated={totalAllocated}
          onExportPlan={handleExportPlan}
          currentProfile={currentProfile}
          allProfiles={appUserProfiles}
          onSwitchProfile={setCurrentProfile}
          isWhiteTheme={isWhiteTheme}
          onToggleTheme={() => setIsWhiteTheme(!isWhiteTheme)}
        />

        <div className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
          <main className="flex-1 min-w-0 w-full px-5 sm:px-8 lg:px-10 py-6 overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 15, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.99 }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              >
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
                    activeView={activeTab as any}
                    onNavigateView={(view) => setActiveTab(view)}
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
          setActiveTab('projects');
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
    </ToastProvider>
  );
}

export default App;
