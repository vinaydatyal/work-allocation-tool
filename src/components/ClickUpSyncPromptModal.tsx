import React from 'react';
import { createPortal } from 'react-dom';
import { X, Zap, ShieldCheck, Layers, Clock } from 'lucide-react';
import type { Task, TeamMember } from '../types';

interface ClickUpSyncPromptModalProps {
  isOpen: boolean;
  task: Task | null;
  targetMember: TeamMember | null;
  targetListName?: string;
  onConfirm: (createInClickUp: boolean) => void;
  onClose: () => void;
}

export const ClickUpSyncPromptModal: React.FC<ClickUpSyncPromptModalProps> = ({
  isOpen,
  task,
  targetMember,
  targetListName,
  onConfirm,
  onClose
}) => {
  if (!isOpen || !task || !targetMember) return null;

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto border-t-purple-500/30">
        
        {/* Glow Accent */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 flex items-center justify-center shadow-lg shadow-purple-600/30 border border-purple-400/20">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Also Create in ClickUp?</span>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold uppercase tracking-wider">
                  Sync Prompt
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Choose whether this task should be pushed to your ClickUp workspace.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Task & Member Overview Card */}
        <div className="px-6 py-4">
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span className="font-semibold text-purple-400 uppercase tracking-wider text-[10px]">
                  {task.clientName || 'Internal Client'}
                </span>
                <span className="flex items-center gap-1 text-slate-400">
                  <Clock className="w-3 h-3" />
                  <span>Est: {task.estimatedHours}h</span>
                </span>
              </div>
              <h4 className="text-sm font-bold text-white line-clamp-2">
                {task.title}
              </h4>
            </div>

            <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
              <span className="text-slate-400">Assignee:</span>
              <div className="flex items-center gap-2">
                <img
                  src={targetMember.avatar}
                  alt={targetMember.name}
                  className="w-5 h-5 rounded-md object-cover ring-1 ring-slate-700"
                />
                <span className="font-semibold text-slate-200">{targetMember.name}</span>
              </div>
            </div>

            {targetListName && (
              <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
                <span className="text-slate-400">Target ClickUp List:</span>
                <span className="font-semibold text-purple-300 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-purple-400" />
                  <span>#{targetListName}</span>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Action Explanation */}
        <div className="px-6 pb-2 text-xs text-slate-400 space-y-2">
          <div className="flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <strong className="text-slate-200">Yes, Create in ClickUp:</strong> Creates the task in ClickUp, assigns it to {targetMember.name}, and syncs to DSR Tracker Desktop.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <Layers className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <span>
              <strong className="text-slate-200">No, Desktop Only:</strong> Keeps the task internal to DSR Tracker without adding a ticket to your ClickUp workspace.
            </span>
          </div>
        </div>

        {/* Modal Buttons */}
        <div className="px-6 py-5 bg-slate-950 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-end gap-3">
          <button
            onClick={() => onConfirm(false)}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-700 hover:border-slate-600 bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white font-medium text-xs transition-colors cursor-pointer"
          >
            Desktop Only (Skip ClickUp)
          </button>
          <button
            onClick={() => onConfirm(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-purple-200" />
            <span>Yes, Create in ClickUp</span>
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};
