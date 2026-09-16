import React from 'react';
import type { TeamMember, Task } from '../types';
import { calculateMemberAllocatedHours } from '../utils/matchingEngine';
import { Calendar, Clock, AlertTriangle } from 'lucide-react';

interface ResourceTimelineProps {
  teamMembers: TeamMember[];
  tasks: Task[];
  onSelectTask?: (task: Task) => void;
}

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

export const ResourceTimeline: React.FC<ResourceTimelineProps> = ({
  teamMembers,
  tasks
}) => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Calendar className="w-5 h-5 text-emerald-400" />
            <span>Weekly Resource Workload &amp; Schedule Timeline</span>
            <span className="text-xs font-normal px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Visual Capacity Map
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            See how your team&apos;s allocated hours are distributed across the work week. Quickly identify scheduling bottlenecks and open days.
          </p>
        </div>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {/* Timeline Header */}
        <div className="grid grid-cols-12 border-b border-slate-800 bg-slate-950/80 text-xs font-bold text-slate-400 py-3.5 px-6">
          <div className="col-span-4 md:col-span-3 text-slate-300">Team Specialist &amp; Capacity</div>
          <div className="col-span-8 md:col-span-9 grid grid-cols-5 text-center gap-2">
            {DAYS_OF_WEEK.map((day) => (
              <div key={day} className="py-1 rounded bg-slate-900 border border-slate-800/80 text-slate-300">
                {day}
              </div>
            ))}
          </div>
        </div>

        {/* Rows for each Team Member */}
        <div className="divide-y divide-slate-800">
          {teamMembers.map((member) => {
            const allocatedHours = calculateMemberAllocatedHours(member.id, tasks);
            const memberTasks = tasks.filter(
              (t) => t.assignedUserId === member.id && t.status !== 'completed'
            );
            const isOverbooked = allocatedHours > member.weeklyCapacityHours;
            const remainingHours = Number((member.weeklyCapacityHours - allocatedHours).toFixed(1));

            // Estimate daily average hours for visual timeline blocks
            const dailyAvg = (allocatedHours / 5).toFixed(1);

            return (
              <div key={member.id} className="p-6 transition-colors hover:bg-slate-800/30">
                <div className="grid grid-cols-12 items-center gap-4">
                  {/* Left Column: Member Profile */}
                  <div className="col-span-4 md:col-span-3 flex items-start gap-3">
                    <img
                      src={member.avatar}
                      alt={member.name}
                      className="w-11 h-11 rounded-xl object-cover ring-2 ring-slate-700 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white truncate">{member.name}</h4>
                      </div>
                      <p className="text-xs text-slate-400 truncate">{member.role}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          isOverbooked
                            ? 'bg-red-500/15 text-red-300 border-red-500/30'
                            : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        }`}>
                          {allocatedHours} / {member.weeklyCapacityHours}h Booked
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: 5-Day Visual Schedule Grid */}
                  <div className="col-span-8 md:col-span-9 grid grid-cols-5 gap-2.5">
                    {DAYS_OF_WEEK.map((day, idx) => {
                      const hasWork = parseFloat(dailyAvg) > 0;
                      const loadPercent = Math.min(100, Math.round((parseFloat(dailyAvg) / (member.weeklyCapacityHours / 5)) * 100));

                      return (
                        <div
                          key={day}
                          className={`rounded-xl p-3 border transition-all flex flex-col justify-between min-h-[85px] ${
                            !hasWork
                              ? 'bg-slate-950/40 border-slate-800/60 text-slate-500'
                              : isOverbooked
                              ? 'bg-red-950/20 border-red-500/40'
                              : 'bg-slate-950 border-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-semibold text-slate-400">{day}</span>
                            {hasWork && (
                              <span className="flex items-center gap-0.5 text-emerald-400 font-bold">
                                <Clock className="w-2.5 h-2.5" />
                                <span>~{dailyAvg}h</span>
                              </span>
                            )}
                          </div>

                          {memberTasks[idx % memberTasks.length] ? (
                            <div className="mt-2 bg-slate-900 border border-slate-700/60 rounded-lg p-1.5">
                              <p className="text-[10px] font-medium text-slate-200 truncate">
                                {memberTasks[idx % memberTasks.length].title}
                              </p>
                              <span className="text-[9px] text-emerald-400">
                                {memberTasks[idx % memberTasks.length].requiredSkill}
                              </span>
                            </div>
                          ) : hasWork ? (
                            <div className="mt-2 text-[10px] text-slate-400 italic">
                              Active sprint focus
                            </div>
                          ) : (
                            <div className="mt-2 text-[10px] text-slate-500 italic">
                              Open slot
                            </div>
                          )}

                          {/* Mini load bar */}
                          {hasWork && (
                            <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mt-2">
                              <div
                                className={`h-full rounded-full ${
                                  isOverbooked ? 'bg-red-500' : 'bg-emerald-400'
                                }`}
                                style={{ width: `${loadPercent}%` }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {isOverbooked && (
                  <div className="mt-4 flex items-center gap-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>
                      <strong>Scheduling Bottleneck Alert:</strong> {member.name} exceeds weekly capacity by{' '}
                      {Math.abs(remainingHours)} hours. Consider reassigning tasks to open slots.
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
