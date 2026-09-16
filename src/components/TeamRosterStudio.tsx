import React, { useState } from 'react';
import type { TeamMember, SkillCategory, AppUserProfile } from '../types';
import { Users, Plus, Award, Check, Lock, ShieldCheck } from 'lucide-react';

interface TeamRosterStudioProps {
  teamMembers: TeamMember[];
  currentProfile: AppUserProfile;
  onAddMember: (member: TeamMember) => void;
  onUpdateMemberScores: (memberId: string, skill: SkillCategory, quality: number, speed: number, comm: number) => void;
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

export const TeamRosterStudio: React.FC<TeamRosterStudioProps> = ({
  teamMembers,
  currentProfile,
  onAddMember,
  onUpdateMemberScores
}) => {
  const [selectedMemberId, setSelectedMemberId] = useState<string>(teamMembers[0]?.id || '');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('Technical SEO Specialist');
  const [newCapacity, setNewCapacity] = useState('35');
  const [newDepartment, setNewDepartment] = useState<'SEO' | 'Web Design' | 'Web Development' | 'Social Media'>('SEO');
  const [newSeniority, setNewSeniority] = useState<'Team Lead' | 'Senior Resource' | 'Executive' | 'Intern'>('Executive');
  const [selectedSkills, setSelectedSkills] = useState<SkillCategory[]>(['Technical SEO']);

  const currentMember = teamMembers.find((m) => m.id === selectedMemberId);
  const canEdit = currentProfile.permissions.canCalibrateSkills;

  const toggleSkillSelection = (skill: SkillCategory) => {
    if (selectedSkills.includes(skill)) {
      if (selectedSkills.length > 1) {
        setSelectedSkills(selectedSkills.filter((s) => s !== skill));
      }
    } else {
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  const handleCreateMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !canEdit) return;

    const newMember: TeamMember = {
      id: `usr_${Date.now()}`,
      name: newName,
      role: newRole,
      department: newDepartment,
      seniority: newSeniority,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      weeklyCapacityHours: parseInt(newCapacity, 10) || 35,
      skills: selectedSkills,
      completedSprintTasks: 0,
      colorSwatch: '#10B981',
      generalCompetency: {
        englishProficiency: 8.5,
        clientCommunication: 8.5,
        requirementUnderstanding: 8.5,
        proactivityReliability: 8.5,
        clientReadyTier: 'Tier 2: Direct Email Capable',
        lastTestedDate: new Date().toISOString().split('T')[0]
      },
      skillScores: selectedSkills.map((sk) => ({
        skill: sk,
        quality: 9.0,
        speedEfficiency: 8.8,
        communication: 9.0
      }))
    };

    onAddMember(newMember);
    setSelectedMemberId(newMember.id);
    setNewName('');
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Users className="w-5 h-5 text-emerald-400" />
            <span>Agency Team Roster &amp; Skill Matrix Studio</span>
            <span className="text-xs font-normal px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {teamMembers.length} Active Specialists
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {canEdit
              ? 'Full SEO Manager Capability: Define team roster, weekly capacities, and calibrate proficiency weights for AI matching.'
              : 'Project Coordinator View: Read-only roster and capacity view. Skill calibration and domain weightings are governed by the SEO Manager.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedMemberId}
            onChange={(e) => setSelectedMemberId(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            {teamMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.role})
              </option>
            ))}
          </select>

          {canEdit ? (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Specialist</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-400">
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span>SEO Manager Calibration Only</span>
            </div>
          )}
        </div>
      </div>

      {!canEdit && (
        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-2xl p-4 flex items-center justify-between text-xs text-cyan-200">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0" />
            <span>
              <strong>Coordinator Roster Mode:</strong> You can inspect specialist domain ratings and weekly hours to guide your AI Smart Matching. To modify quality weights or add specialists, switch to the SEO Manager profile.
            </span>
          </div>
        </div>
      )}

      {showAddModal && canEdit && (
        <form
          onSubmit={handleCreateMember}
          className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-6 space-y-5 animate-fade-in shadow-xl"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Add New Team Specialist</h3>
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Specialist Name</label>
              <input
                type="text"
                placeholder="e.g. Elena Rostova"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl p focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500/30 transition-all shadow-innerx-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Job Role</label>
              <input
                type="text"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl p focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500/30 transition-all shadow-innerx-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Weekly Capacity (Hrs)</label>
              <input
                type="number"
                value={newCapacity}
                onChange={(e) => setNewCapacity(e.target.value)}
                className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl p focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500/30 transition-all shadow-innerx-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Department</label>
              <select
                value={newDepartment}
                onChange={(e) => setNewDepartment(e.target.value as any)}
                className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl p focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500/30 transition-all shadow-innerx-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="SEO">SEO Department</option>
                <option value="Web Development">Web Development</option>
                <option value="Web Design">Web Design</option>
                <option value="Social Media">Social Media</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Seniority Tier</label>
              <select
                value={newSeniority}
                onChange={(e) => setNewSeniority(e.target.value as any)}
                className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl p focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500/30 transition-all shadow-innerx-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="Team Lead">Team Lead</option>
                <option value="Senior Resource">Senior Resource</option>
                <option value="Executive">Executive</option>
                <option value="Intern">Intern</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-2">Select Primary Skills</label>
            <div className="flex flex-wrap gap-2">
              {ALL_SKILLS.map((sk) => {
                const isSelected = selectedSkills.includes(sk);
                return (
                  <button
                    type="button"
                    key={sk}
                    onClick={() => toggleSkillSelection(sk)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                    <span>{sk}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-sm shadow-md cursor-pointer"
            >
              Save Team Specialist
            </button>
          </div>
        </form>
      )}

      {currentMember && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {currentMember.skillScores.map((score) => {
            const fitScore = (
              score.quality * 0.5 +
              score.speedEfficiency * 0.3 +
              score.communication * 0.2
            ).toFixed(1);

            return (
              <div
                key={score.skill}
                className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                        <Award className="w-3.5 h-3.5" />
                        <span>Skill Domain Rating</span>
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {currentMember.department}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        {currentMember.seniority}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white mt-1">{score.skill}</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                      Weighted Fit Score
                    </span>
                    <span className="text-2xl font-black text-emerald-400">{fitScore}</span>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-800">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-slate-300 font-medium">Quality &amp; Precision (Weight: 50%)</span>
                      <span className="font-bold text-white">{score.quality} / 10</span>
                    </div>
                    {canEdit ? (
                      <input
                        type="range"
                        min="1"
                        max="10"
                        step="0.1"
                        value={score.quality}
                        onChange={(e) =>
                          onUpdateMemberScores(
                            currentMember.id,
                            score.skill,
                            parseFloat(e.target.value),
                            score.speedEfficiency,
                            score.communication
                          )
                        }
                        className="w-full accent-emerald-500 cursor-pointer"
                      />
                    ) : (
                      <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${(score.quality / 10) * 100}%` }}
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-slate-300 font-medium">Delivery Speed &amp; Efficiency (Weight: 30%)</span>
                      <span className="font-bold text-cyan-400">{score.speedEfficiency} / 10</span>
                    </div>
                    {canEdit ? (
                      <input
                        type="range"
                        min="1"
                        max="10"
                        step="0.1"
                        value={score.speedEfficiency}
                        onChange={(e) =>
                          onUpdateMemberScores(
                            currentMember.id,
                            score.skill,
                            score.quality,
                            parseFloat(e.target.value),
                            score.communication
                          )
                        }
                        className="w-full accent-cyan-500 cursor-pointer"
                      />
                    ) : (
                      <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="h-full bg-cyan-400 rounded-full"
                          style={{ width: `${(score.speedEfficiency / 10) * 100}%` }}
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-slate-300 font-medium">Communication &amp; Clarity (Weight: 20%)</span>
                      <span className="font-bold text-white">{score.communication} / 10</span>
                    </div>
                    {canEdit ? (
                      <input
                        type="range"
                        min="1"
                        max="10"
                        step="0.1"
                        value={score.communication}
                        onChange={(e) =>
                          onUpdateMemberScores(
                            currentMember.id,
                            score.skill,
                            score.quality,
                            score.speedEfficiency,
                            parseFloat(e.target.value)
                          )
                        }
                        className="w-full accent-emerald-500 cursor-pointer"
                      />
                    ) : (
                      <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${(score.communication / 10) * 100}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
