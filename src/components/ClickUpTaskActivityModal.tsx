import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Send,
  RefreshCw,
  Clock,
  ExternalLink,
  X,
  ShieldCheck,
  Eye,
  ListChecks,
  Activity,
  AlertCircle,
  Copy,
  Check
} from 'lucide-react';
import {
  isClickUpConnected,
  getClickUpToken,
  fetchClickUpTaskComments,
  createClickUpTaskComment,
  fetchClickUpTask,
  fetchClickUpTaskTimeInStatus,
  type ClickUpCommentItem,
  getCommentPlainText
} from '../services/clickupOAuth';

export interface ClickUpTaskActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
  taskName: string;
  taskUrl?: string;
  projectName?: string;
  clientName?: string;
  status?: string;
  priority?: string;
  assignees?: Array<{ name: string; avatar?: string }>;
}

export const ClickUpTaskActivityModal: React.FC<ClickUpTaskActivityModalProps> = ({
  isOpen,
  onClose,
  taskId,
  taskName,
  taskUrl,
  projectName,
  clientName,
  status: initialStatus,
  priority: initialPriority,
  assignees: initialAssignees
}) => {
  const [activeTab, setActiveTab] = useState<'comments' | 'activity'>('comments');
  const [comments, setComments] = useState<ClickUpCommentItem[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [taskDetails, setTaskDetails] = useState<any>(null);
  const [timeInStatus, setTimeInStatus] = useState<any>(null);
  const [loadingTask, setLoadingTask] = useState(false);

  const [newCommentText, setNewCommentText] = useState('');
  const [notifyAll, setNotifyAll] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  const commentEndRef = useRef<HTMLDivElement>(null);

  // Load comments & task details whenever modal opens or taskId changes
  useEffect(() => {
    if (!isOpen || !taskId) return;
    loadAllTicketData();
  }, [isOpen, taskId]);

  const loadAllTicketData = async () => {
    if (!isClickUpConnected()) return;
    const token = getClickUpToken();
    if (!token) return;

    setLoadingComments(true);
    setLoadingTask(true);
    setPostError(null);

    try {
      // 1. Fetch Comments
      const fetchedComments = await fetchClickUpTaskComments(token, taskId);
      setComments(fetchedComments);
    } catch (err: any) {
      console.warn('Could not load ClickUp comments:', err);
    } finally {
      setLoadingComments(false);
    }

    try {
      // 2. Fetch Task Details (Watchers, Checklists, Dates, etc.)
      const details = await fetchClickUpTask(token, taskId);
      setTaskDetails(details);
    } catch (err: any) {
      console.warn('Could not load ClickUp task details:', err);
    } finally {
      setLoadingTask(false);
    }

    try {
      // 3. Fetch Time in Status if enabled
      const statusDurations = await fetchClickUpTaskTimeInStatus(token, taskId);
      setTimeInStatus(statusDurations);
    } catch (err) {
      console.warn('Time in status not available:', err);
    }
  };

  const handlePostComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newCommentText.trim();
    if (!trimmed || isPosting) return;

    const token = getClickUpToken();
    if (!token) {
      setPostError('ClickUp is not connected. Please connect via ClickUp in the top bar.');
      return;
    }

    setIsPosting(true);
    setPostError(null);

    try {
      await createClickUpTaskComment(token, taskId, trimmed, notifyAll);
      setNewCommentText('');
      // Reload comments to show the new comment with server timestamp & author
      const updatedComments = await fetchClickUpTaskComments(token, taskId);
      setComments(updatedComments);
      setTimeout(() => {
        commentEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    } catch (err: any) {
      console.error('Failed to post comment to ClickUp:', err);
      setPostError(err.message || 'Failed to post comment to ClickUp');
    } finally {
      setIsPosting(false);
    }
  };

  const handleCopyTaskId = () => {
    navigator.clipboard.writeText(taskId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (typeof document === 'undefined') return null;

  const resolvedUrl = taskUrl || `https://app.clickup.com/t/${taskId}`;
  const displayStatus = taskDetails?.status?.status || initialStatus || 'In Progress';
  const displayPriority = taskDetails?.priority?.priority || initialPriority || 'Normal';
  const statusColor = taskDetails?.status?.color || '#3b82f6';

  const formatTimestamp = (raw: string | number | undefined): string => {
    if (!raw) return '';
    try {
      const num = typeof raw === 'string' ? parseInt(raw, 10) : raw;
      const date = new Date(num > 1e11 ? num : num * 1000);
      if (isNaN(date.getTime())) return String(raw);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return String(raw);
    }
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex justify-end overflow-hidden" role="dialog" aria-modal="true">
          {/* Deep Blur Backdrop */}
          <motion.div
            key="ticket-activity-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-slate-950/85 backdrop-blur-md cursor-pointer"
            onClick={onClose}
          />

          {/* Slide-over Card Panel */}
          <motion.div
            key="ticket-activity-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative z-10 w-full max-w-2xl h-full flex flex-col bg-[#0b1326] border-l border-cyan-500/30 shadow-[-20px_0_60px_rgba(0,0,0,0.85)] text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 1. Header Bar */}
            <div className="px-6 py-4 border-b border-slate-800/80 bg-slate-900/90 flex flex-col gap-2 shrink-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40 shrink-0">
                    ⚡ ClickUp Ticket
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyTaskId}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer border border-slate-700 shrink-0"
                    title="Click to copy Task ID"
                  >
                    {copiedId ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                    <span>#{taskId}</span>
                  </button>
                  {clientName && (
                    <span className="text-xs text-slate-400 font-bold truncate">
                      • {clientName}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={resolvedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/35 border border-purple-500/40 text-purple-200 text-xs font-bold transition-all cursor-pointer shadow-sm"
                    title="Open task directly in ClickUp"
                  >
                    <span>ClickUp</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Task Title */}
              <h3 className="text-base font-extrabold text-white leading-snug line-clamp-2">
                {taskName || 'ClickUp Task'}
              </h3>

              {/* Metadata Pill Bar */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                <span
                  className="px-2 py-0.5 rounded-md font-bold uppercase text-[10px] border"
                  style={{
                    backgroundColor: `${statusColor}22`,
                    borderColor: `${statusColor}66`,
                    color: statusColor
                  }}
                >
                  {displayStatus}
                </span>

                {displayPriority && (
                  <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    Priority: {displayPriority}
                  </span>
                )}

                {projectName && (
                  <span className="text-slate-400 font-medium truncate">
                    📁 {projectName}
                  </span>
                )}

                {((taskDetails?.assignees && taskDetails.assignees.length > 0) || (initialAssignees && initialAssignees.length > 0)) && (
                  <div className="flex items-center gap-1">
                    {(taskDetails?.assignees || initialAssignees || []).slice(0, 3).map((a: any, idx: number) => (
                      <span key={idx} className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300">
                        {a.avatar ? (
                          <img src={a.avatar} alt={a.username || a.name} className="w-3.5 h-3.5 rounded-full object-cover" />
                        ) : (
                          <span className="w-3.5 h-3.5 rounded-full bg-purple-600 text-[9px] flex items-center justify-center font-bold">
                            {(a.username || a.name || 'U').charAt(0).toUpperCase()}
                          </span>
                        )}
                        <span>{(a.username || a.name || '').split(' ')[0]}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 2. Privacy Guarantee Banner */}
            <div className="px-6 py-2 bg-cyan-950/30 border-b border-cyan-500/20 flex items-center justify-between gap-2 shrink-0 text-[11px] text-cyan-200/90 font-medium">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>
                  <strong>Data Privacy Guard Active:</strong> Dashboard price, milestones & accounts stay strictly local and are never sent to ClickUp.
                </span>
              </div>
            </div>

            {/* 3. Tab Switcher */}
            <div className="px-6 py-2.5 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('comments')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'comments'
                      ? 'bg-cyan-500 text-slate-950 font-black shadow-md'
                      : 'bg-slate-900/80 text-slate-300 hover:text-white border border-slate-800'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Discussion & Comments</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-md text-[10px] font-extrabold ${
                      activeTab === 'comments' ? 'bg-slate-950/20 text-slate-950' : 'bg-cyan-500/20 text-cyan-300'
                    }`}
                  >
                    {comments.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('activity')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'activity'
                      ? 'bg-cyan-500 text-slate-950 font-black shadow-md'
                      : 'bg-slate-900/80 text-slate-300 hover:text-white border border-slate-800'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Ticket Activity & Audit</span>
                </button>
              </div>

              <button
                type="button"
                onClick={loadAllTicketData}
                disabled={loadingComments || loadingTask}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                title="Refresh ClickUp conversation and activity"
              >
                <RefreshCw className={`w-3 h-3 ${loadingComments || loadingTask ? 'animate-spin text-cyan-400' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>

            {/* 4. Tab Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* TAB 1: COMMENTS & LIVE DISCUSSION */}
              {activeTab === 'comments' && (
                <div className="space-y-4">
                  {/* Real-time Comments Feed */}
                  <div className="space-y-3">
                    {loadingComments && comments.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
                        <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
                        <span className="text-xs font-bold">Fetching comments from ClickUp...</span>
                      </div>
                    ) : comments.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 px-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-center gap-2">
                        <MessageSquare className="w-8 h-8 text-slate-600" />
                        <span className="text-xs font-bold text-slate-300">No comments on this ticket yet</span>
                        <p className="text-[11px] text-slate-500 max-w-sm">
                          Use the composer below to post comments, updates, or status notes directly to ClickUp from this dashboard.
                        </p>
                      </div>
                    ) : (
                      comments.map((comment) => {
                        const author = comment.user?.username || 'Team Member';
                        const avatar = comment.user?.profilePicture;
                        const text = getCommentPlainText(comment);
                        const dateStr = formatTimestamp(comment.date);

                        return (
                          <div
                            key={comment.id}
                            className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/90 flex items-start gap-3 hover:border-slate-700 transition-colors"
                          >
                            {/* Avatar */}
                            {avatar ? (
                              <img
                                src={avatar}
                                alt={author}
                                className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-cyan-500/40"
                              />
                            ) : (
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-sm"
                                style={{
                                  backgroundColor: comment.user?.color || '#06b6d4'
                                }}
                              >
                                {author.slice(0, 2).toUpperCase()}
                              </div>
                            )}

                            {/* Comment Body */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="text-xs font-extrabold text-white truncate">
                                  {author}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono shrink-0">
                                  {dateStr}
                                </span>
                              </div>

                              <div className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed break-words font-normal">
                                {text || <span className="italic text-slate-500">(Empty comment content)</span>}
                              </div>

                              {comment.resolved && (
                                <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                  ✓ Resolved
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={commentEndRef} />
                  </div>

                  {/* Post Error Banner */}
                  {postError && (
                    <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center gap-2 text-rose-300 text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{postError}</span>
                    </div>
                  )}

                  {/* New Comment Composer */}
                  <form
                    onSubmit={handlePostComment}
                    className="p-4 rounded-2xl bg-slate-950 border border-cyan-500/30 shadow-lg space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-cyan-300 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Write a Comment on ClickUp Ticket</span>
                      </label>
                      <span className="text-[10px] text-slate-400">
                        Synchronizes live with ClickUp
                      </span>
                    </div>

                    <textarea
                      rows={3}
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      placeholder={`Post an update, deliverable link, or question on #${taskId}...`}
                      className="w-full bg-slate-900 border border-slate-700/80 hover:border-cyan-500/40 focus:border-cyan-400 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none transition-all resize-none font-normal"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                          e.preventDefault();
                          handlePostComment();
                        }
                      }}
                    />

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 hover:text-white select-none">
                        <input
                          type="checkbox"
                          checked={notifyAll}
                          onChange={(e) => setNotifyAll(e.target.checked)}
                          className="rounded border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer"
                        />
                        <span className="text-[11px]">🔔 Notify assignees and watchers</span>
                      </label>

                      <div className="flex items-center gap-2 ml-auto">
                        <span className="text-[10px] text-slate-500 hidden sm:inline">
                          (Ctrl+Enter to post)
                        </span>
                        <button
                          type="submit"
                          disabled={!newCommentText.trim() || isPosting}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs transition-all cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Send className={`w-3.5 h-3.5 ${isPosting ? 'animate-spin' : ''}`} />
                          <span>{isPosting ? 'Posting to ClickUp...' : 'Post Comment'}</span>
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 2: TICKET ACTIVITY & AUDIT LOG */}
              {activeTab === 'activity' && (
                <div className="space-y-4">
                  {/* Task Key Timing & Lifecycle Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        📅 Created Date
                      </span>
                      <span className="text-xs font-bold text-white block">
                        {formatTimestamp(taskDetails?.date_created) || 'Not recorded'}
                      </span>
                      {taskDetails?.creator && (
                        <span className="text-[10px] text-cyan-400 block font-medium">
                          Created by: {taskDetails.creator.username}
                        </span>
                      )}
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        🔄 Last Updated
                      </span>
                      <span className="text-xs font-bold text-white block">
                        {formatTimestamp(taskDetails?.date_updated) || 'Recently active'}
                      </span>
                      {taskDetails?.date_closed && (
                        <span className="text-[10px] text-emerald-400 block font-medium">
                          Closed: {formatTimestamp(taskDetails.date_closed)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Time in Status Breakdown */}
                  {timeInStatus && timeInStatus.status_history && timeInStatus.status_history.length > 0 && (
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Time Spent in Each Status</span>
                        </span>
                        <span className="text-[10px] text-slate-400">ClickUp Time Tracking</span>
                      </div>

                      <div className="space-y-1.5">
                        {timeInStatus.status_history.map((sh: any, idx: number) => {
                          const minutes = sh.total_time?.by_minute || 0;
                          const hours = (minutes / 60).toFixed(1);
                          return (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800/80 text-xs"
                            >
                              <span className="font-bold text-white uppercase text-[10px]">
                                {sh.status}
                              </span>
                              <span className="font-mono text-cyan-400 font-bold">
                                {hours} hrs ({minutes}m)
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Checklists & Sub-items */}
                  {taskDetails?.checklists && taskDetails.checklists.length > 0 && (
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                      <span className="text-xs font-black text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                        <ListChecks className="w-3.5 h-3.5" />
                        <span>Ticket Checklists</span>
                      </span>

                      {taskDetails.checklists.map((cl: any) => (
                        <div key={cl.id} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                            <span>{cl.name}</span>
                            <span className="text-[10px] text-purple-400">
                              {cl.resolved}/{cl.unresolved + cl.resolved} done
                            </span>
                          </div>
                          <div className="space-y-1">
                            {(cl.items || []).map((item: any) => (
                              <div
                                key={item.id}
                                className="flex items-center gap-2 text-xs p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300"
                              >
                                <span className={item.resolved ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                                  {item.resolved ? '✓' : '○'}
                                </span>
                                <span className={item.resolved ? 'line-through text-slate-500' : 'text-white'}>
                                  {item.name}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Watchers */}
                  {taskDetails?.watchers && taskDetails.watchers.length > 0 && (
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-slate-400" />
                        <span className="text-xs font-bold text-slate-300">Watchers on this Ticket:</span>
                      </div>
                      <div className="flex items-center gap-1 flex-wrap">
                        {taskDetails.watchers.map((w: any) => (
                          <span
                            key={w.id}
                            className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-[11px] font-medium text-slate-200"
                          >
                            {w.username}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Raw Description / Scope Snippet */}
                  {taskDetails?.text_content && (
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                      <span className="text-xs font-black text-slate-400 uppercase tracking-wider block">
                        Scope Description
                      </span>
                      <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                        {taskDetails.text_content}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
