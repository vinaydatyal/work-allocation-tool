import React, { useState } from 'react';
import type { TeamMember, Task, DepartmentCategory, SeniorityLevel } from '../types';
import { calculateMemberAllocatedHours } from '../utils/matchingEngine';
import { 
  AlertTriangle, 
  Filter
} from 'lucide-react';

interface AllocatorGridProps {
  teamMembers: TeamMember[];
  tasks: Task[];
}

const DEPARTMENTS: DepartmentCategory[] = ['SEO', 'Web Development', 'Web Design', 'Social Media'];
const SENIORITIES: SeniorityLevel[] = ['Team Lead', 'Senior Resource', 'Executive', 'Intern'];

export const AllocatorGrid: React.FC<AllocatorGridProps> = ({
  teamMembers,
  tasks
}) => {
  const [selectedDepartment, setSelectedDepartment] = useState<string>('ALL');
  const [selectedSeniority, setSelectedSeniority] = useState<string>('ALL');

  const filteredMembers = teamMembers.filter((m) => {
    const matchesDept = selectedDepartment === 'ALL' || m.department === selectedDepartment;
    const matchesSen = selectedSeniority === 'ALL' || m.seniority === selectedSeniority;
    return matchesDept && matchesSen;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner & Department / Seniority Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <span>Executive &amp; Department Capacity Grid</span>
            <span className="text-xs font-normal px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {filteredMembers.length} Showing
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time capacity monitor across your agency hierarchy (Leads, Seniors, Executives, Interns &amp; Cross-Departments).
          </p>
        </div>

        {/* Filter Selectors */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="ALL">All Departments</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  Dept: {d}
                </option>
              ))}
            </select>
          </div>

          <select
            value={selectedSeniority}
            onChange={(e) => setSelectedSeniority(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="ALL">All Seniority Tiers</option>
            {SENIORITIES.map((s) => (
              <option key={s} value={s}>
                Tier: {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid of Team Member Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMembers.map((member) => {
          const allocatedHours = calculateMemberAllocatedHours(member.id, tasks);
          const capacityPercent = Math.min(
            100,
            Math.round((allocatedHours / member.weeklyCapacityHours) * 100)
          );
          const remainingHours = Number((member.weeklyCapacityHours - allocatedHours).toFixed(1));

          const isOverloaded = allocatedHours > member.weeklyCapacityHours;
          const isWarning = capacityPercent >= 85 && !isOverloaded;

          const memberTasks = tasks.filter(
            (t) => t.assignedUserId === member.id && t.status !== 'completed'
          );

          const avgQualityScore = (
            member.skillScores.reduce((acc, s) => acc + s.quality, 0) /
            (member.skillScores.length || 1)
          ).toFixed(1);

          return (
            <div
              key={member.id}
              className={`relative overflow-hidden rounded-2xl bg-slate-900/90 border transition-all duration-300 hover:shadow-xl ${
                isOverloaded
                  ? 'border-red-500/60 shadow-red-500/10'
                  : isWarning
                  ? 'border-amber-500/60 shadow-amber-500/10'
                  : 'border-slate-800 hover:border-slate-700'
              } p-5 flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img
                        src={member.avatar}
                        alt={member.name}
                        className="w-12 h-12 rounded-xl object-cover ring-2 ring-slate-700"
                      />
                      <span
                        className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-900"
                        style={{ backgroundColor: member.colorSwatch }}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-base font-bold text-white">{member.name}</h3>
                      </div>
                      <p className="text-xs text-slate-400 leading-tight">{member.role}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {member.department}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            member.seniority === 'Team Lead'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : member.seniority === 'Senior Resource'
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                              : member.seniority === 'Executive'
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          {member.seniority}
                        </span>
                      </div>
                      {member.generalCompetency && (
                        <div className="mt-1.5">
                          <span
                            className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase ${
                              member.generalCompetency.clientReadyTier.includes('Tier 1')
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : member.generalCompetency.clientReadyTier.includes('Tier 2')
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            🗣️ {member.generalCompetency.clientReadyTier.split(':')[0]} Client Ready
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-semibold">
                      Quality: {avgQualityScore}/10
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 mt-4">
                  {member.skills.map((skill) => (
                    <span
                      key={skill}
                      className="text-[11px] px-2 py-0.5 rounded-md bg-slate-950 text-slate-300 border border-slate-800 font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>

                <div className="mt-5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">
                      Booked: <strong className="text-white">{allocatedHours}</strong> / {member.weeklyCapacityHours} Hrs
                    </span>
                    <span
                      className={`font-bold ${
                        isOverloaded
                          ? 'text-red-400'
                          : isWarning
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {remainingHours >= 0
                        ? `${remainingHours} hrs free`
                        : `${Math.abs(remainingHours)} hrs OVERLOAD`}
                    </span>
                  </div>

                  <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isOverloaded
                          ? 'bg-gradient-to-r from-red-500 to-rose-600 animate-pulse'
                          : isWarning
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-500'
                          : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                      }`}
                      style={{ width: `${Math.min(100, capacityPercent)}%` }}
                    />
                  </div>
                </div>

                {isOverloaded && (
                  <div className="mt-3 flex items-center gap-2 p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>
                      <strong>Overload Guardrail!</strong> Exceeds target capacity by{' '}
                      {Math.abs(remainingHours)} hrs.
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-5 pt-3 border-t border-slate-800/80">
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
                  <span>Assigned Projects ({memberTasks.length})</span>
                  <span>Hours</span>
                </div>
                {memberTasks.length === 0 ? (
                  <div className="text-xs text-slate-500 italic py-1">
                    No active tasks assigned. Ready for dispatch.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {memberTasks.slice(0, 3).map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between bg-slate-950/60 px-2.5 py-1.5 rounded-lg border border-slate-800 text-xs"
                      >
                        <span className="text-slate-200 font-medium truncate pr-2">
                          {t.title}
                        </span>
                        <span className="text-slate-400 font-semibold shrink-0">
                          {t.estimatedHours}h
                        </span>
                      </div>
                    ))}
                    {memberTasks.length > 3 && (
                      <div className="text-[10px] text-slate-400 text-right">
                        + {memberTasks.length - 3} more deliverables
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
