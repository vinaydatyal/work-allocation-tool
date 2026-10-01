import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  ExternalLink,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Calendar,
  CloudCheck,
  RefreshCw,
  X,
  Sparkles,
  Clock,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import type {
  ProjectDailyNotePayload,
  ProjectNoteChecklistItem,
  ProjectNoteFollowUpItem
} from '../lib/supabase';
import {
  saveProjectNoteToSupabase,
  fetchProjectNotes,
  subscribeToProjectNotes
} from '../lib/supabase';
import { openDSRProjectNotes } from '../utils/dsrProtocol';
import { getLocalDateString } from '../utils/dateUtils';

interface ProjectNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: {
    id: string;
    name: string;
    client?: string;
    billingType?: string;
    price?: string;
  } | null;
  onNoteSavedLocally?: (projectId: string, noteText: string, updatedAt: string) => void;
}

export const ProjectNotesModal: React.FC<ProjectNotesModalProps> = ({
  isOpen,
  onClose,
  project,
  onNoteSavedLocally
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(getLocalDateString(new Date()));
  const [notesText, setNotesText] = useState<string>('');
  const [checklist, setChecklist] = useState<ProjectNoteChecklistItem[]>([]);
  const [followUps, setFollowUps] = useState<ProjectNoteFollowUpItem[]>([]);
  const [activeTab, setActiveTab] = useState<'notes' | 'checklist' | 'followups'>('notes');
  const [syncStatus, setSyncStatus] = useState<'synced' | 'saving' | 'offline'>('synced');
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(null);

  // New item inputs
  const [newChecklistText, setNewChecklistText] = useState('');
  const [newFollowUpText, setNewFollowUpText] = useState('');
  const [newFollowUpAssignee, setNewFollowUpAssignee] = useState('');
  const [newFollowUpDue, setNewFollowUpDue] = useState('');

  const autoSaveTimerRef = useRef<any>(null);
  const isInitialLoadRef = useRef<boolean>(true);

  // Load note from local storage fallback or Supabase
  useEffect(() => {
    if (!isOpen || !project) return;

    isInitialLoadRef.current = true;
    const localKey = `wat_project_note_${project.id}_${selectedDate}`;
    const cached = localStorage.getItem(localKey);

    if (cached) {
      try {
        const parsed = JSON.parse(cached) as ProjectDailyNotePayload;
        setNotesText(parsed.notes || '');
        setChecklist(Array.isArray(parsed.checklist) ? parsed.checklist : []);
        setFollowUps(Array.isArray(parsed.followUps) ? parsed.followUps : []);
        if (parsed.updatedAt) setLastSyncedTime(new Date(parsed.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      } catch (e) {
        // ignore
      }
    } else {
      setNotesText('');
      setChecklist([]);
      setFollowUps([]);
    }

    // Attempt to fetch from Supabase
    fetchProjectNotes(project.id, selectedDate).then(({ data }) => {
      if (data && data.length > 0) {
        const latest = data[0];
        setNotesText(latest.notes || '');
        setChecklist(Array.isArray(latest.checklist) ? latest.checklist : []);
        setFollowUps(Array.isArray(latest.followUps) ? latest.followUps : []);
        if (latest.updatedAt) setLastSyncedTime(new Date(latest.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        localStorage.setItem(localKey, JSON.stringify(latest));
      }
      setTimeout(() => {
        isInitialLoadRef.current = false;
      }, 200);
    });

    // Realtime Supabase Subscription
    const subscription = subscribeToProjectNotes((incomingNote) => {
      if (incomingNote.projectId === project.id && incomingNote.date === selectedDate) {
        setNotesText(incomingNote.notes || '');
        setChecklist(Array.isArray(incomingNote.checklist) ? incomingNote.checklist : []);
        setFollowUps(Array.isArray(incomingNote.followUps) ? incomingNote.followUps : []);
        if (incomingNote.updatedAt) setLastSyncedTime(new Date(incomingNote.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        localStorage.setItem(localKey, JSON.stringify(incomingNote));
        toast.info('⚡ Note synced in real-time from DSR Tracker Desktop');
      }
    });

    return () => {
      if (subscription && typeof (subscription as any).unsubscribe === 'function') {
        (subscription as any).unsubscribe();
      }
    };
  }, [isOpen, project?.id, selectedDate]);

  // Debounced Auto-Save to Supabase & LocalStorage
  const triggerAutoSave = (
    updatedNotes: string,
    updatedChecklist: ProjectNoteChecklistItem[],
    updatedFollowUps: ProjectNoteFollowUpItem[]
  ) => {
    if (isInitialLoadRef.current || !project) return;

    setSyncStatus('saving');
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    autoSaveTimerRef.current = setTimeout(async () => {
      const payload: ProjectDailyNotePayload = {
        projectId: project.id,
        projectName: project.name,
        clientName: project.client,
        date: selectedDate,
        notes: updatedNotes,
        checklist: updatedChecklist,
        followUps: updatedFollowUps,
        updatedAt: new Date().toISOString()
      };

      // 1. Save locally
      const localKey = `wat_project_note_${project.id}_${selectedDate}`;
      localStorage.setItem(localKey, JSON.stringify(payload));

      if (onNoteSavedLocally && updatedNotes) {
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        onNoteSavedLocally(project.id, updatedNotes, timeStr);
      }

      // 2. Save to Supabase (propagates to DSR Tracker Desktop)
      try {
        await saveProjectNoteToSupabase(payload);
        setSyncStatus('synced');
        setLastSyncedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      } catch (err) {
        setSyncStatus('offline');
      }
    }, 600);
  };

  if (!isOpen || !project) return null;

  const todayStr = getLocalDateString(new Date());
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterdayDate);

  const completedChecklistCount = checklist.filter((c) => c.done).length;
  const completedFollowUpsCount = followUps.filter((f) => f.done).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                <FileText className="w-4 h-4" />
              </span>
              <h2 className="text-lg font-black text-white truncate tracking-tight">
                {project.name}
              </h2>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
              <span className="font-semibold text-slate-300">Client: {project.client || 'Agency Client'}</span>
              <span>•</span>
              <span className="text-cyan-400 font-medium">{project.billingType || 'Retainer'}</span>
              <span>•</span>
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Two-Way Realtime Sync Active
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Deep link button directly to DSR Tracker Desktop */}
            <button
              type="button"
              onClick={() => openDSRProjectNotes(project.id, project.name)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/20 transition-all cursor-pointer group"
              title="Launch native DSR Tracker Project Notes window via dsr-tracker://notes protocol"
            >
              <span>⚡ Open in DSR Desktop</span>
              <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Date Selector & Sync Status Bar */}
        <div className="px-6 py-2.5 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-semibold flex items-center gap-1 mr-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Date:</span>
            </span>

            <button
              type="button"
              onClick={() => setSelectedDate(todayStr)}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                selectedDate === todayStr
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(yesterdayStr)}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                selectedDate === yesterdayStr
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Yesterday
            </button>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-2.5 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-xs font-mono font-medium focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center gap-2">
            {syncStatus === 'saving' ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-amber-300 font-medium">
                <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
                <span>Saving to Supabase & DSR Tracker...</span>
              </span>
            ) : syncStatus === 'synced' ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                <CloudCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>All changes synced {lastSyncedTime ? `(${lastSyncedTime})` : ''}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                <span>Cached locally</span>
              </span>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-800 bg-slate-900/50">
          <button
            type="button"
            onClick={() => setActiveTab('notes')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'notes'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Communications & Meeting Notes</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('checklist')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'checklist'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Action Checklist ({completedChecklistCount}/{checklist.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('followups')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'followups'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Follow-ups & Deliverables ({completedFollowUpsCount}/{followUps.length})</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-4">
          {activeTab === 'notes' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold text-slate-300">Daily Log & Client Communication Context:</span>
                <span>Auto-saves as you type</span>
              </div>
              <textarea
                value={notesText}
                onChange={(e) => {
                  const val = e.target.value;
                  setNotesText(val);
                  triggerAutoSave(val, checklist, followUps);
                }}
                rows={10}
                placeholder="Log call updates, client feedback, blockers, asset requests, or sprint goals for this project... (Synchronizes directly with DSR Tracker Desktop)"
                className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl p-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 font-sans leading-relaxed transition-colors resize-none"
              />
            </div>
          )}

          {activeTab === 'checklist' && (
            <div className="space-y-4">
              {/* Add checklist item */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newChecklistText}
                  onChange={(e) => setNewChecklistText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newChecklistText.trim()) {
                      const updated = [
                        ...checklist,
                        { id: 'chk_' + Date.now(), text: newChecklistText.trim(), done: false }
                      ];
                      setChecklist(updated);
                      setNewChecklistText('');
                      triggerAutoSave(notesText, updated, followUps);
                    }
                  }}
                  placeholder="Add a new checklist item (e.g. Audit Canonical tags)... press Enter"
                  className="flex-1 bg-slate-950/80 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newChecklistText.trim()) return;
                    const updated = [
                      ...checklist,
                      { id: 'chk_' + Date.now(), text: newChecklistText.trim(), done: false }
                    ];
                    setChecklist(updated);
                    setNewChecklistText('');
                    triggerAutoSave(notesText, updated, followUps);
                  }}
                  className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>

              {/* Checklist items */}
              <div className="space-y-2">
                {checklist.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs italic bg-slate-950/30 rounded-xl border border-dashed border-slate-800">
                    No checklist items logged for {selectedDate}. Type an item above and press Enter.
                  </div>
                ) : (
                  checklist.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between gap-3 px-3 py-2 rounded-xl border transition-all ${
                        item.done
                          ? 'bg-emerald-950/20 border-emerald-500/30 text-slate-400'
                          : 'bg-slate-950/60 border-slate-800 text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          const updated = checklist.map((c) =>
                            c.id === item.id ? { ...c, done: !c.done } : c
                          );
                          setChecklist(updated);
                          triggerAutoSave(notesText, updated, followUps);
                        }}
                        className="flex items-center gap-2 flex-1 text-left cursor-pointer"
                      >
                        {item.done ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-500 shrink-0" />
                        )}
                        <span className={`text-xs font-medium ${item.done ? 'line-through text-slate-400' : 'text-slate-200'}`}>
                          {item.text}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const updated = checklist.filter((c) => c.id !== item.id);
                          setChecklist(updated);
                          triggerAutoSave(notesText, updated, followUps);
                        }}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'followups' && (
            <div className="space-y-4">
              {/* Add Follow-up Item */}
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-2">
                <input
                  type="text"
                  value={newFollowUpText}
                  onChange={(e) => setNewFollowUpText(e.target.value)}
                  placeholder="Deliverable / Follow-up requirement (e.g., Deliver GTM conversion setup)..."
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newFollowUpAssignee}
                    onChange={(e) => setNewFollowUpAssignee(e.target.value)}
                    placeholder="Assignee (e.g. Neeraj, Kamakshi)"
                    className="flex-1 bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none"
                  />
                  <input
                    type="date"
                    value={newFollowUpDue}
                    onChange={(e) => setNewFollowUpDue(e.target.value)}
                    className="bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs text-slate-200 font-mono focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newFollowUpText.trim()) return;
                      const updated = [
                        ...followUps,
                        {
                          id: 'flw_' + Date.now(),
                          text: newFollowUpText.trim(),
                          done: false,
                          assignee: newFollowUpAssignee.trim() || undefined,
                          due: newFollowUpDue || undefined
                        }
                      ];
                      setFollowUps(updated);
                      setNewFollowUpText('');
                      setNewFollowUpAssignee('');
                      setNewFollowUpDue('');
                      triggerAutoSave(notesText, checklist, updated);
                    }}
                    className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1 shadow-sm shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Follow-up</span>
                  </button>
                </div>
              </div>

              {/* Follow-up list */}
              <div className="space-y-2">
                {followUps.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs italic bg-slate-950/30 rounded-xl border border-dashed border-slate-800">
                    No follow-ups logged for {selectedDate}.
                  </div>
                ) : (
                  followUps.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                        item.done
                          ? 'bg-emerald-950/20 border-emerald-500/30 text-slate-400'
                          : 'bg-slate-950/60 border-slate-800 text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          const updated = followUps.map((f) =>
                            f.id === item.id ? { ...f, done: !f.done } : f
                          );
                          setFollowUps(updated);
                          triggerAutoSave(notesText, checklist, updated);
                        }}
                        className="flex items-center gap-2 flex-1 text-left cursor-pointer"
                      >
                        {item.done ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-500 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className={`text-xs font-medium ${item.done ? 'line-through text-slate-400' : 'text-slate-200'}`}>
                            {item.text}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5 font-mono">
                            {item.assignee && <span>👤 {item.assignee}</span>}
                            {item.due && <span>📅 Due: {item.due}</span>}
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const updated = followUps.filter((f) => f.id !== item.id);
                          setFollowUps(updated);
                          triggerAutoSave(notesText, checklist, updated);
                        }}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs">
          <div className="text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Bi-directional cloud synchronization with DSR Tracker Desktop</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openDSRProjectNotes(project.id, project.name)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>Focus Desktop DSR App</span>
              <ArrowRight className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
