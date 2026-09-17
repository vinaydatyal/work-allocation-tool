import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Zap, 
  CheckCircle2, 
  AlertCircle, 
  LogOut, 
  Users, 
  ListTodo, 
  ExternalLink, 
  Loader2, 
  RefreshCw, 
  Key
} from 'lucide-react';
import {
  initiateClickUpOAuth,
  isClickUpConnected,
  getClickUpUser,
  getClickUpToken,
  setClickUpToken,
  disconnectClickUp,
  fetchClickUpWorkspaces,
  fetchClickUpTasks,
  fetchClickUpUser,
  setClickUpWorkspaceId,
  getClickUpWorkspaceId,
  type ClickUpWorkspace,
  type ClickUpTask,
} from '../services/clickupOAuth';

interface ClickUpOAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete?: (tasks: ClickUpTask[]) => void;
}

export const ClickUpOAuthModal: React.FC<ClickUpOAuthModalProps> = ({ 
  isOpen, 
  onClose,
  onSyncComplete 
}) => {
  const [connected, setConnected]           = useState(isClickUpConnected());
  const [connectedUser, setConnectedUser]   = useState(getClickUpUser());
  const [workspaces, setWorkspaces]         = useState<ClickUpWorkspace[]>([]);
  const [selectedWs, setSelectedWs]         = useState<string | null>(getClickUpWorkspaceId());
  const [tasks, setTasks]                   = useState<ClickUpTask[]>([]);
  const [loadingWs, setLoadingWs]           = useState(false);
  const [loadingTasks, setLoadingTasks]     = useState(false);
  const [error, setError]                   = useState<string | null>(null);
  const [oauthLoading, setOauthLoading]     = useState(false);
  const [connectTab, setConnectTab]         = useState<'oauth' | 'token'>('oauth');
  const [manualToken, setManualToken]       = useState('');
  const [verifyingToken, setVerifyingToken] = useState(false);
  const [syncToast, setSyncToast]           = useState<string | null>(null);

  // Check if env CLIENT_ID is set
  const clientIdConfigured = !!import.meta.env.VITE_CLICKUP_CLIENT_ID;

  // Sync state whenever modal opens
  useEffect(() => {
    if (isOpen) {
      const isConn = isClickUpConnected();
      setConnected(isConn);
      setConnectedUser(getClickUpUser());
      setSelectedWs(getClickUpWorkspaceId());
      if (isConn) {
        loadWorkspaces();
      }
    }
  }, [isOpen]);

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
      const existing = getClickUpWorkspaceId();
      if (existing && ws.some(w => w.id === existing)) {
        setSelectedWs(existing);
      } else if (ws.length > 0) {
        setSelectedWs(ws[0].id);
        setClickUpWorkspaceId(ws[0].id);
      }
    } catch (err: any) {
      setError('Could not load workspaces. Token may be invalid or expired.');
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
      setTasks(t.slice(0, 30));
    } catch (err: any) {
      setError('Could not load tasks for workspace ' + wsId);
    } finally {
      setLoadingTasks(false);
    }
  }

  function handleConnectOAuth() {
    if (!clientIdConfigured) {
      setError('VITE_CLICKUP_CLIENT_ID is not configured yet in Vercel. You can use the "API Token" tab below for instant connection!');
      setConnectTab('token');
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

  async function handleConnectToken() {
    const trimmed = manualToken.trim();
    if (!trimmed) {
      setError('Please paste your ClickUp Personal API Token (starts with pk_).');
      return;
    }
    setVerifyingToken(true);
    setError(null);
    try {
      const user = await fetchClickUpUser(trimmed);
      const username = user?.username || user?.email || 'ClickUp User';
      setClickUpToken(trimmed, username);
      setConnected(true);
      setConnectedUser(username);
      setManualToken('');
      setSyncToast(`Connected successfully as ${username}!`);
      setTimeout(() => setSyncToast(null), 4000);
      await loadWorkspaces();
    } catch (err: any) {
      setError('Invalid API Token or ClickUp API connection error. Please verify your token.');
    } finally {
      setVerifyingToken(false);
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

  function handleTriggerSync() {
    if (onSyncComplete && tasks.length > 0) {
      onSyncComplete(tasks);
    }
    setSyncToast(`Synced ${tasks.length} live tasks from ClickUp into your active board!`);
    setTimeout(() => setSyncToast(null), 4000);
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
            className="fixed inset-0 z-[120] bg-black/75 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 15 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="fixed inset-0 z-[121] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="bg-[#0b0f19] border border-slate-700/90 rounded-2xl shadow-2xl w-full max-w-xl pointer-events-auto overflow-hidden flex flex-col max-h-[85vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="relative px-6 pt-5 pb-4 border-b border-slate-800 shrink-0 bg-slate-950/70">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500" />
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 via-purple-700 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30 shrink-0 border border-purple-400/40">
                      <span className="text-white font-black text-xl leading-none">C</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-extrabold text-white tracking-tight">
                          ClickUp Live Integration & Sync
                        </h2>
                        {connected && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Connected
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Bi-directional synchronization of Workspaces, Lists, Tasks &amp; Capacity
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Scrollable Body */}
              <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">

                {/* Toast Notification */}
                {syncToast && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-semibold"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{syncToast}</span>
                  </motion.div>
                )}

                {/* Error Banner */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs"
                  >
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </motion.div>
                )}

                {/* NOT CONNECTED STATE */}
                {!connected && (
                  <div className="space-y-4">
                    {/* Method Selector Tabs */}
                    <div className="flex rounded-xl bg-slate-900/90 p-1 border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setConnectTab('oauth')}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          connectTab === 'oauth'
                            ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>OAuth 2.0 (Login with ClickUp)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setConnectTab('token')}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          connectTab === 'token'
                            ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Key className="w-3.5 h-3.5" />
                        <span>Personal API Token (Direct)</span>
                      </button>
                    </div>

                    {/* TAB 1: OAuth Login */}
                    {connectTab === 'oauth' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-2.5">
                          {[
                            { icon: ListTodo, label: 'Sync open tasks & time', color: 'text-purple-400' },
                            { icon: Users,    label: 'Map assignees to team', color: 'text-cyan-400' },
                            { icon: Zap,      label: 'Zero password sharing', color: 'text-amber-400' },
                            { icon: RefreshCw,label: 'Auto-refresh token', color: 'text-emerald-400' },
                          ].map(({ icon: Icon, label, color }) => (
                            <div
                              key={label}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800"
                            >
                              <Icon className={`w-4 h-4 shrink-0 ${color}`} />
                              <span className="text-xs text-slate-300 font-medium">{label}</span>
                            </div>
                          ))}
                        </div>

                        {!clientIdConfigured && (
                          <div className="px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-1.5">
                            <div className="font-bold flex items-center gap-1.5">
                              <AlertCircle className="w-4 h-4" />
                              OAuth Credentials Not Yet Configured in Vercel
                            </div>
                            <p className="text-slate-300">
                              To use 1-click OAuth, add <code className="text-amber-200">VITE_CLICKUP_CLIENT_ID</code> and <code className="text-amber-200">CLICKUP_CLIENT_SECRET</code> to Vercel.
                            </p>
                            <button
                              type="button"
                              onClick={() => setConnectTab('token')}
                              className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-bold underline cursor-pointer"
                            >
                              Or switch to the "Personal API Token" tab for instant connection →
                            </button>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={handleConnectOAuth}
                          disabled={oauthLoading}
                          className="w-full flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 via-purple-700 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-extrabold text-sm transition-all shadow-lg shadow-purple-600/30 hover:shadow-purple-600/50 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 cursor-pointer"
                        >
                          {oauthLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Zap className="w-4 h-4" />
                          )}
                          {oauthLoading ? 'Redirecting to ClickUp…' : 'Login with ClickUp Account'}
                        </button>
                      </div>
                    )}

                    {/* TAB 2: Personal API Token */}
                    {connectTab === 'token' && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                            <span>ClickUp Personal API Token</span>
                            <a
                              href="https://app.clickup.com/settings/apps"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1"
                            >
                              Get Token in ClickUp <ExternalLink className="w-3 h-3" />
                            </a>
                          </label>
                          <div className="relative">
                            <input
                              type="password"
                              value={manualToken}
                              onChange={(e) => setManualToken(e.target.value)}
                              placeholder="pk_12345678_ABCD..."
                              className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500 font-mono"
                            />
                          </div>
                          <p className="text-[11px] text-slate-400">
                            Navigate to ClickUp <strong>Settings → Apps → Generate API Token</strong>. Token is stored strictly in your browser's localStorage.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={handleConnectToken}
                          disabled={verifyingToken || !manualToken.trim()}
                          className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs transition-all shadow-md shadow-purple-600/20 disabled:opacity-50 cursor-pointer"
                        >
                          {verifyingToken ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4" />
                          )}
                          {verifyingToken ? 'Verifying with ClickUp…' : 'Connect & Verify Token'}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* CONNECTED STATE */}
                {connected && (
                  <div className="space-y-4">
                    {/* User profile banner */}
                    <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-black text-xs flex items-center justify-center">
                          {connectedUser?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                            <span>Connected Account</span>
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                          </div>
                          <div className="text-xs font-medium text-slate-300">{connectedUser || 'ClickUp User'}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleDisconnect}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-slate-700/80 transition-all cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Disconnect
                      </button>
                    </div>

                    {/* Workspace Selector */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                        Select Workspace / Team
                      </label>
                      {loadingWs ? (
                        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-900 border border-slate-800">
                          <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                          <span className="text-xs text-slate-400">Loading ClickUp workspaces…</span>
                        </div>
                      ) : workspaces.length === 0 ? (
                        <div className="px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400">
                          No workspaces found. Click refresh to retry.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {workspaces.map((ws) => (
                            <button
                              key={ws.id}
                              type="button"
                              onClick={() => handleWorkspaceSelect(ws.id)}
                              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left text-xs transition-all border cursor-pointer ${
                                selectedWs === ws.id
                                  ? 'bg-purple-500/20 border-purple-500/50 text-purple-200 ring-1 ring-purple-500/30'
                                  : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:border-slate-700'
                              }`}
                            >
                              <span className="font-bold truncate">{ws.name}</span>
                              <span className="text-[10px] text-slate-500 shrink-0 ml-2">{ws.members} members</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Live Task Preview & Sync Trigger */}
                    {selectedWs && (
                      <div className="space-y-2.5 pt-1 border-t border-slate-800/80">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <span>Open Tasks ({tasks.length})</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => loadTasks(selectedWs)}
                            className="flex items-center gap-1 text-[11px] text-purple-400 hover:text-purple-300 font-semibold cursor-pointer"
                          >
                            <RefreshCw className="w-3 h-3" />
                            Refresh
                          </button>
                        </div>

                        {loadingTasks ? (
                          <div className="flex items-center justify-center gap-2 py-6 rounded-xl bg-slate-900/60 border border-slate-800">
                            <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                            <span className="text-xs text-slate-400">Fetching workspace tasks…</span>
                          </div>
                        ) : tasks.length === 0 ? (
                          <div className="py-4 text-center text-xs text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800">
                            No open tasks found in this workspace.
                          </div>
                        ) : (
                          <div className="space-y-1.5 max-h-44 overflow-y-auto no-scrollbar">
                            {tasks.map((task) => (
                              <div
                                key={task.id}
                                className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-900/70 border border-slate-800/90 text-xs"
                              >
                                <span
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ backgroundColor: task.status?.color || '#64748b' }}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-slate-200 truncate">{task.name}</div>
                                  <div className="text-[10px] text-slate-500 truncate">
                                    {task.list?.name} · {task.assignees?.map(a => a.username).join(', ') || 'Unassigned'}
                                  </div>
                                </div>
                                <a
                                  href={task.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-slate-500 hover:text-purple-400 transition-colors shrink-0"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Action: Run Sync */}
                        <button
                          type="button"
                          onClick={handleTriggerSync}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-extrabold text-xs transition-all shadow-lg shadow-emerald-600/25 cursor-pointer mt-2"
                        >
                          <Zap className="w-4 h-4" />
                          <span>⚡ Sync Live ClickUp Tasks with Board</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0">
                <span className="text-[11px] text-slate-500">
                  {connected ? '● ClickUp Connected' : 'OAuth 2.0 & Personal API Token supported'}
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
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
