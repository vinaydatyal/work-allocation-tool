import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Task, TeamMember } from '../types';
import { rankCandidatesForTask } from '../utils/matchingEngine';
import confetti from 'canvas-confetti';
import { 
  X, 
  Sparkles, 
  Award, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Send
} from 'lucide-react';

interface MatchModalProps {
  task: Task | null;
  teamMembers: TeamMember[];
  allTasks: Task[];
  onClose: () => void;
  onDispatchTask: (taskId: string, memberId: string) => void;
}

export const MatchModal: React.FC<MatchModalProps> = ({
  task,
  teamMembers,
  allTasks,
  onClose,
  onDispatchTask
}) => {
  const rankedCandidates = task ? rankCandidatesForTask(task, teamMembers, allTasks) : [];
  const topCandidate = rankedCandidates[0];
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>('');

  useEffect(() => {
    setSelectedCandidateId(topCandidate?.member.id ?? '');
  }, [task?.id, topCandidate?.member.id]);

  if (!task) return null;

  const handleDispatch = () => {
    if (!selectedCandidateId) return;

    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch {
      // ignore
    }

    onDispatchTask(task.id, selectedCandidateId);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">AI Smart Matchmaker Recommendation</h3>
              <p className="text-xs text-slate-400">
                Multi-factor algorithm ranking candidates by Quality, Efficiency &amp; Open Capacity
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Task Briefing Box */}
        <div className="p-6 bg-slate-950/60 border-b border-slate-800/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                {task.clientName}
              </span>
              <h4 className="text-lg font-bold text-white mt-0.5">{task.title}</h4>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
                Required Skill: {task.requiredSkill}
              </span>
              <span className="px-3 py-1 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Est: {task.estimatedHours}h</span>
              </span>
            </div>
          </div>
        </div>

        {/* Candidate Rankings List */}
        <div className="p-6 overflow-y-auto flex-1 min-h-[250px] space-y-4">
          <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Ranked Qualified Specialists ({rankedCandidates.length})
          </h5>

          {rankedCandidates.map((result) => {
            const isSelected = selectedCandidateId === result.member.id;
            const isTopPick = result.rank === 1 && !result.isOverloaded;

            return (
              <div
                key={result.member.id}
                onClick={() => setSelectedCandidateId(result.member.id)}
                className={`cursor-pointer rounded-2xl p-5 border transition-all ${
                  isSelected
                    ? 'bg-emerald-500/10 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                    : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <img
                      src={result.member.avatar}
                      alt={result.member.name}
                      className="w-12 h-12 rounded-xl object-cover ring-2 ring-slate-700"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-white">{result.member.name}</h4>
                        {isTopPick && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
                            <Award className="w-3 h-3" />
                            <span>Top Pick</span>
                          </span>
                        )}
                        {result.isOverloaded && (
                          <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 font-semibold text-[10px] uppercase tracking-wider flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Overload Risk</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{result.member.role}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                        Weighted Fit Score
                      </span>
                      <span className="text-xl font-black text-emerald-400">
                        {result.fitScore}
                        <span className="text-xs font-normal text-slate-400">/10</span>
                      </span>
                    </div>
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        isSelected
                          ? 'border-emerald-400 bg-emerald-500 text-slate-950'
                          : 'border-slate-700'
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <p className="text-slate-300 italic">{result.justification}</p>
                  <div className="flex items-center gap-3 shrink-0 text-slate-400">
                    <span>Quality: {result.qualityScore}/10</span>
                    <span>•</span>
                    <span className="text-emerald-400 font-semibold">
                      Speed: {result.speedFactor}/10
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleDispatch}
            disabled={!selectedCandidateId}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>Assign &amp; Dispatch Task</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
