import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, CheckCircle2, AlertCircle, LogOut, Users, ListTodo, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import {
  initiateClickUpOAuth,
  isClickUpConnected,
  getClickUpUser,
  getClickUpToken,
  disconnectClickUp,
  fetchClickUpWorkspaces,
  fetchClickUpTasks,
  setClickUpWorkspaceId,
  getClickUpWorkspaceId,
  type ClickUpWorkspace,
  type ClickUpTask,
} from '../services/clickupOAuth';

interface ClickUpOAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ClickUpOAuthModal: React.FC<ClickUpOAuthModalProps> = ({ isOpen, onClose }) => {
  const [connected, setConnected]           = useState(isClickUpConnected());
  const [connectedUser, setConnectedUser]   = useState(getClickUpUser());
  const [workspaces, setWorkspaces]         = useState<ClickUpWorkspace[]>([]);
  const [selectedWs, setSelectedWs]         = useState<string | null>(getClickUpWorkspaceId());
  const [tasks, setTasks]                   = useState<ClickUpTask[]>([]);
  const [loadingWs, setLoadingWs]           = useState(false);
  const [loadingTasks, setLoadingTasks]     = useState(false);
  const [error, setError]                   = useState<string | null>(null);
  const [oauthLoading, setOauthLoading]     = useState(false);

  // Check if env CLIENT_ID is set
  const clientIdConfigured = !!import.meta.env.VITE_CLICKUP_CLIENT_ID;

  // Load workspaces when connected
  useEffect(() => {
    if (connected && isOpen) {
      loadWorkspaces();
    }
  }, [connected, isOpen]);

  // Load tasks when workspace selected
  useEffect(() => {
    if (selectedWs && connected) {
      loadTasks(selectedWs);
    }
  }, [selectedWs]);

  async function loadWorkspaces() {
    const token = getClickUpToken();
    if (!token) return;
    setLoadingWs(true);
    setError(null);
    try {
      const ws = await fetchClickUpWorkspaces(token);
      setWorkspaces(ws);
      if (ws.length === 1) {
        setSelectedWs(ws[0].id);
        setClickUpWorkspaceId(ws[0].id);
      }
    } catch (err: any) {
      setError('Could not load workspaces. Your token may have expired.');
    } finally {
      setLoadingWs(false);
    }
  }

  async function loadTasks(wsId: string) {
    const token = getClickUpToken();
    if (!token) return;
    setLoadingTasks(true);
    setError(null);
    try {
      const t = await fetchClickUpTasks(token, wsId);
      setTasks(t.slice(0, 20)); // show latest 20
    } catch (err: any) {
      setError('Could not load tasks. Check your workspace permissions.');
    } finally {
      setLoadingTasks(false);
    }
  }

  function handleConnect() {
    if (!clientIdConfigured) {
      setError('VITE_CLICKUP_CLIENT_ID is not configured. Add it to your Vercel environment variables.');
      return;
    }
    setOauthLoading(true);
    try {
      initiateClickUpOAuth();
    } catch (err: any) {
      setError(err.message);
      setOauthLoading(false);
    }
  }

  function handleDisconnect() {
    disconnectClickUp();
    setConnected(false);
    setConnectedUser(null);
    setWorkspaces([]);
    setTasks([]);
    setSelectedWs(null);
    setError(null);
  }

  function handleWorkspaceSelect(wsId: string) {
    setSelectedWs(wsId);
    setClickUpWorkspaceId(wsId);
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="bg-[#0d1117] border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-lg pointer-events-auto overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="relative px-6 pt-6 pb-5 border-b border-slate-800">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400" />
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {/* ClickUp logo mark */}
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30 shrink-0">
                      <span className="text-white font-black text-lg leading-none">C</span>
                    </div>
                    <div>
                      <h2 className="text-base font-extrabold text-white tracking-tight">
                        Connect ClickUp
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Sync tasks, track time, and align team workload
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto no-scrollbar">

                {/* Error Banner */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </motion.div>
                )}

                {/* NOT CONNECTED STATE */}
                {!connected && (
                  <div className="space-y-4">
                    {/* Feature highlights */}
                    <div className="grid grid-cols-2 gap-2.5">
                      {[
                        { icon: ListTodo, label: 'Sync open tasks', color: 'text-purple-400' },
                        { icon: Users,    label: 'Map to your team', color: 'text-cyan-400' },
                        { icon: Zap,      label: 'Live status updates', color: 'text-amber-400' },
                        { icon: RefreshCw,label: 'Auto-refresh workload', color: 'text-emerald-400' },
                      ].map(({ icon: Icon, label, color }) => (
                        <div
                          key={label}
                          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800"
                        >
                          <Icon className={`w-4 h-4 shrink-0 ${color}`} />
                          <span className="text-xs text-slate-300 font-medium">{label}</span>
                        </div>
                      ))}
                    </div>

                    {/* Config warning */}
                    {!clientIdConfigured && (
                      <div className="px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs space-y-1.5">
                        <div className="font-bold flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Setup Required
                        </div>
                        <p>Add these to your Vercel environment variables:</p>
                        <div className="font-mono bg-black/40 rounded-lg px-3 py-2 space-y-1 text-[11px] text-amber-300">
                          <div>VITE_CLICKUP_CLIENT_ID = <span className="text-slate-400">your_client_id</span></div>
                          <div>CLICKUP_CLIENT_SECRET = <span className="text-slate-400">your_client_secret</span></div>
                        </div>
                        <a
                          href="https://app.clickup.com/settings/apps"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 underline underline-offset-2"
                        >
                          Get credentials at app.clickup.com/settings/apps
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}

                    {/* Connect Button */}
                    <button
                      type="button"
                      onClick={handleConnect}
                      disabled={oauthLoading}
                      className="w-full flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-sm transition-all shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {oauthLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Zap className="w-4 h-4" />
                      )}
                      {oauthLoading ? 'Redirecting to ClickUp…' : 'Login with ClickUp'}
                    </button>

                    <p className="text-center text-[11px] text-slate-500">
                      You'll be redirected to ClickUp to authorize access.
                      <br />No password is shared with this app.
                    </p>
                  </div>
                )}

                {/* CONNECTED STATE */}
                {connected && (
                  <div className="space-y-4">
                    {/* Connected badge */}
                    <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <div>
                          <div className="text-xs font-bold text-emerald-400">Connected</div>
                          <div className="text-xs text-slate-400">{connectedUser || 'ClickUp Account'}</div>
                        </div>
                      </div>
                      <button
                        onClick={handleDisconnect}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-slate-700 transition-all"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Disconnect
                      </button>
                    </div>

                    {/* Workspace Selector */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Workspace
                      </label>
                      {loadingWs ? (
                        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-900 border border-slate-800">
                          <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                          <span className="text-xs text-slate-400">Loading workspaces…</span>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {workspaces.map((ws) => (
                            <button
                              key={ws.id}
                              onClick={() => handleWorkspaceSelect(ws.id)}
                              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-left text-xs transition-all border ${
                                selectedWs === ws.id
                                  ? 'bg-purple-500/15 border-purple-500/40 text-purple-300'
                                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                              }`}
                            >
                              <span className="font-semibold">{ws.name}</span>
                              <span className="text-slate-500">{ws.members} members</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Task Preview */}
                    {selectedWs && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            Latest Tasks
                          </label>
                          <button
                            onClick={() => loadTasks(selectedWs)}
                            className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-white transition-colors"
                          >
                            <RefreshCw className="w-3 h-3" />
                            Refresh
                          </button>
                        </div>

                        {loadingTasks ? (
                          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-900 border border-slate-800">
                            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                            <span className="text-xs text-slate-400">Loading tasks…</span>
                          </div>
                        ) : tasks.length === 0 ? (
                          <div className="px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-500 text-center">
                            No open tasks found in this workspace.
                          </div>
                        ) : (
                          <div className="space-y-1.5 max-h-48 overflow-y-auto no-scrollbar">
                            {tasks.map((task) => (
                              <div
                                key={task.id}
                                className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800"
                              >
                                <span
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ backgroundColor: task.status?.color || '#64748b' }}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs text-slate-200 font-medium truncate">{task.name}</div>
                                  <div className="text-[10px] text-slate-500">
                                    {task.list?.name} · {task.assignees?.map(a => a.username).join(', ') || 'Unassigned'}
                                  </div>
                                </div>
                                <a
                                  href={task.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-slate-600 hover:text-purple-400 transition-colors shrink-0"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between">
                <span className="text-[11px] text-slate-600">
                  OAuth 2.0 · Secure · No passwords stored
                </span>
                <button
                  onClick={onClose}
                  className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
