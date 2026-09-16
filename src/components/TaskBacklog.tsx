import React, { useState } from 'react';
import type { Task, TeamMember, SkillCategory, PriorityLevel } from '../types';
import { MatchModal } from './MatchModal';
import { 
  Sparkles, 
  Plus, 
  Filter, 
  Clock, 
  CheckCircle2, 
  Layers
} from 'lucide-react';

interface TaskBacklogProps {
  tasks: Task[];
  teamMembers: TeamMember[];
  onDispatchTask: (taskId: string, memberId: string) => void;
  onAddTask: (task: Task) => void;
}

const ALL_SKILLS: SkillCategory[] = [
  'Technical SEO',
  'Content Writing',
  'On-Page Optimization',
  'Link Building',
  'Core Web Vitals',
  'Site Architecture',
  'UI/UX Design',
  'Client Strategy'
];

export const TaskBacklog: React.FC<TaskBacklogProps> = ({
  tasks,
  teamMembers,
  onDispatchTask,
  onAddTask
}) => {
  const [selectedTaskForMatch, setSelectedTaskForMatch] = useState<Task | null>(null);
  const [skillFilter, setSkillFilter] = useState<string>('ALL');

  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newClient] = useState('Apex Enterprise Global');
  const [newSkill, setNewSkill] = useState<SkillCategory>('Technical SEO');
  const [newHours, setNewHours] = useState('8');
  const [newPriority] = useState<PriorityLevel>('High');

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const created: Task = {
      id: `tsk_${Date.now()}`,
      title: newTitle,
      clientName: newClient,
      requiredSkill: newSkill,
      estimatedHours: parseFloat(newHours) || 6,
      actualHoursLogged: 0,
      assignedUserId: null,
      priority: newPriority,
      status: 'backlog',
      dueDate: '2026-07-20',
      categoryColor: '#10B981'
    };

    onAddTask(created);
    setNewTitle('');
    setShowAddForm(false);
  };

  const unassignedTasks = tasks
    .filter((t) => t.status === 'backlog')
    .filter((t) => (skillFilter === 'ALL' ? true : t.requiredSkill === skillFilter));

  const assignedTasks = tasks
    .filter((t) => t.status !== 'backlog')
    .filter((t) => (skillFilter === 'ALL' ? true : t.requiredSkill === skillFilter));

  const findMember = (id: string | null) => teamMembers.find((m) => m.id === id);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Controls Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <span>Sprint Backlog &amp; AI Smart Matchmaker</span>
            <span className="text-xs font-normal px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {unassignedTasks.length} Ready to Allocate
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Click &ldquo;AI Smart Match Candidate&rdquo; to execute multi-factor skill fit and available capacity ranking.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={skillFilter}
              onChange={(e) => setSkillFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="ALL">All Skills</option>
              {ALL_SKILLS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Backlog Task</span>
          </button>
        </div>
      </div>

      {showAddForm && (
        <form
          onSubmit={handleCreateTask}
          className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-6 space-y-4 animate-fade-in shadow-xl shadow-emerald-500/5"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Create New Backlog Task</h3>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <label className="text-xs text-slate-400 block mb-1">Task Title</label>
              <input
                type="text"
                placeholder="e.g. Multi-Regional Hreflang Tag Resolution..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Required Skill</label>
              <select
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value as SkillCategory)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                {ALL_SKILLS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Estimated Hours</label>
              <input
                type="number"
                step="0.5"
                value={newHours}
                onChange={(e) => setNewHours(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-sm shadow-md cursor-pointer"
            >
              Add to Backlog
            </button>
          </div>
        </form>
      )}

      {/* Unassigned Backlog Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-400" />
          <span>Unassigned Task Backlog ({unassignedTasks.length})</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {unassignedTasks.map((task) => (
            <div
              key={task.id}
              className="group bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-5 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-slate-400 font-medium">{task.clientName}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      task.priority === 'High'
                        ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {task.priority} Priority
                  </span>
                </div>

                <h4 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
                  {task.title}
                </h4>

                <div className="flex items-center gap-3 mt-3">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs font-semibold">
                    Skill: {task.requiredSkill}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Est: {task.estimatedHours} Hrs</span>
                  </span>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-end">
                <button
                  onClick={() => setSelectedTaskForMatch(task)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500 hover:to-teal-500 text-emerald-300 hover:text-slate-950 font-bold text-xs border border-emerald-500/40 transition-all cursor-pointer shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI Smart Match Candidate</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Assigned Tasks Section */}
      <div className="space-y-4 pt-6 border-t border-slate-800">
        <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-cyan-400" />
          <span>Assigned Specialist Workload ({assignedTasks.length})</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assignedTasks.map((task) => {
            const assignee = findMember(task.assignedUserId);
            return (
              <div
                key={task.id}
                className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-400">{task.clientName}</span>
                    <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-[10px] font-semibold uppercase">
                      Assigned Workload
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-white">{task.title}</h4>

                  <div className="flex items-center gap-3 mt-3 text-xs">
                    <span className="text-slate-400">Skill: {task.requiredSkill}</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-300 font-medium">
                      Est: {task.estimatedHours}h
                    </span>
                  </div>
                </div>

                {assignee && (
                  <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={assignee.avatar}
                        alt={assignee.name}
                        className="w-7 h-7 rounded-lg object-cover"
                      />
                      <span className="text-xs font-semibold text-white">{assignee.name}</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">
                      Allocated
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <MatchModal
        task={selectedTaskForMatch}
        teamMembers={teamMembers}
        allTasks={tasks}
        onClose={() => setSelectedTaskForMatch(null)}
        onDispatchTask={onDispatchTask}
      />
    </div>
  );
};
