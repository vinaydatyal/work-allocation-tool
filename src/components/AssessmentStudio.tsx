import React, { useState } from 'react';
import type { TeamMember, SkillCategory } from '../types';

interface AssessmentStudioProps {
  teamMembers: TeamMember[];
  onUpdateMemberScores: (memberId: string, skill: SkillCategory, quality: number, speed: number, comm: number) => void;
}

export const AssessmentStudio: React.FC<AssessmentStudioProps> = ({
  teamMembers,
  onUpdateMemberScores
}) => {
  const [selectedMemberId, setSelectedMemberId] = useState<string>(teamMembers[0]?.id || '');
  const currentMember = teamMembers.find((m) => m.id === selectedMemberId);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
              <span>Skill Assessment &amp; Calibration Studio</span>
              <span className="text-xs font-normal px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Closed-Loop Fit Weights
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Configure baseline quality and communication ratings. Speed &amp; efficiency scores are auto-calibrated from DSR Tracker timer logs.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400">Select Specialist:</label>
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
          </div>
        </div>
      </div>

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
                    <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">
                      Skill Domain
                    </span>
                    <h3 className="text-lg font-bold text-white mt-0.5">{score.skill}</h3>
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
                      <span className="text-slate-300 font-medium">Quality of Work (Weight: 50%)</span>
                      <span className="font-bold text-white">{score.quality} / 10</span>
                    </div>
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
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-slate-300 font-medium flex items-center gap-1.5">
                        <span>DSR Speed &amp; Efficiency (Weight: 30%)</span>
                        <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 text-[10px]">
                          Auto-Synced
                        </span>
                      </span>
                      <span className="font-bold text-cyan-400">{score.speedEfficiency} / 10</span>
                    </div>
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
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-slate-300 font-medium">
                        Communication &amp; Documentation (Weight: 20%)
                      </span>
                      <span className="font-bold text-white">{score.communication} / 10</span>
                    </div>
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
