import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  Key,
  Clock,
  Layers,
  PlusCircle,
  Send,
  FolderKanban,
  UserCheck,
  FolderOpen,
  FolderClosed,
  ChevronDown,
  ChevronRight,
  FileText,
  Radio
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
  fetchClickUpSpaces,
  fetchClickUpFolders,
  fetchClickUpLists,
  fetchClickUpListTasks,
  fetchClickUpTeamMembers,
  fetchClickUpTimeEntries,
  createClickUpTask,
  registerClickUpWebhook,
  type ClickUpWorkspace,
  type ClickUpTask,
  type ClickUpSpace,
  type ClickUpFolder,
  type ClickUpList,
  type ClickUpTeamMember,
  type ClickUpTimeEntry
} from '../services/clickupOAuth';

interface ClickUpOAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete?: (tasks: ClickUpTask[]) => void;
  onImportMembers?: (members: ClickUpTeamMember[]) => void;
  onImportTimeEntries?: (entries: ClickUpTimeEntry[]) => void;
  onImportProjectsFromList?: (
    list: { id: string; name: string; folderName?: string; spaceName?: string },
    tasks: ClickUpTask[],
    replaceExisting: boolean
  ) => void;
}

type ActiveFeatureTab = 'overview' | 'hierarchy' | 'time' | 'members' | 'create' | 'webhooks';

export const ClickUpOAuthModal: React.FC<ClickUpOAuthModalProps> = ({ 
  isOpen, 
  onClose,
  onSyncComplete,
  onImportMembers,
  onImportTimeEntries,
  onImportProjectsFromList
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
  
  // Feature Tab state
  const [featureTab, setFeatureTab]         = useState<ActiveFeatureTab>('overview');

  // Hierarchy state
  const [spaces, setSpaces]                 = useState<ClickUpSpace[]>([]);
  const [loadingSpaces, setLoadingSpaces]   = useState(false);
  const [selectedSpace, setSelectedSpace]   = useState<string | null>(null);
  const [folders, setFolders]               = useState<ClickUpFolder[]>([]);
  const [folderlessLists, setFolderlessLists] = useState<ClickUpList[]>([]);
  const [lists, setLists]                   = useState<ClickUpList[]>([]);
  const [loadingHierarchy, setLoadingHierarchy] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [selectedList, setSelectedList]     = useState<string | null>(null);
  const [selectedListName, setSelectedListName] = useState<string>('');
  const [listTasks, setListTasks]           = useState<ClickUpTask[]>([]);
  const [loadingListTasks, setLoadingListTasks] = useState(false);
  const [listSubtaskFilter, setListSubtaskFilter] = useState<'all' | 'tasks' | 'subtasks'>('all');
  const [importScopeDialog, setImportScopeDialog] = useState<{
    isOpen: boolean;
    replace: boolean;
    scope: 'tasks' | 'subtasks' | 'both';
  } | null>(null);

  // Team Members state
  const [teamMembers, setTeamMembers]       = useState<ClickUpTeamMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Time Entries state
  const [timeEntries, setTimeEntries]       = useState<ClickUpTimeEntry[]>([]);
  const [loadingTime, setLoadingTime]       = useState(false);

  // Create Task form state
  const [newTaskName, setNewTaskName]       = useState('');
  const [newTaskDesc, setNewTaskDesc]       = useState('');
  const [newTaskHours, setNewTaskHours]     = useState('4');
  const [newTaskAssignee, setNewTaskAssignee] = useState<number | null>(null);
  const [newTaskPriority, setNewTaskPriority] = useState('3');
  const [creatingTask, setCreatingTask]     = useState(false);

  // Webhooks & Live Sync state (Feature F)
  const [webhookUrl, setWebhookUrl]         = useState(
    typeof window !== 'undefined' ? `${window.location.origin}/api/clickup/webhook` : ''
  );
  const [registeringWebhook, setRegisteringWebhook] = useState(false);
  const [webhookStatus, setWebhookStatus]   = useState<string | null>(null);

  const handleRegisterWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookUrl.trim() || !selectedWs) return;
    const token = getClickUpToken();
    if (!token) return;

    try {
      setRegisteringWebhook(true);
      setWebhookStatus(null);
      await registerClickUpWebhook(token, selectedWs, webhookUrl.trim(), [
        'taskCreated',
        'taskUpdated',
        'taskStatusUpdated',
        'taskAssigneeUpdated',
        'taskDeleted'
      ]);
      setWebhookStatus('✅ Webhook successfully registered with ClickUp API!');
      setSyncToast('⚡ ClickUp Webhook registered: Real-time bi-directional events active!');
      setTimeout(() => setSyncToast(null), 4000);
    } catch (err: any) {
      console.error('Webhook registration failed:', err);
      setWebhookStatus(`❌ Registration failed: ${err.message || 'Check endpoint or ClickUp permissions'}`);
    } finally {
      setRegisteringWebhook(false);
    }
  };

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

  // Handle ESC key to cancel/close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Load tasks & data when workspace changes
  useEffect(() => {
    if (selectedWs && connected) {
      loadTasks(selectedWs);
      if (featureTab === 'hierarchy') loadSpaces(selectedWs);
      if (featureTab === 'members') loadMembers(selectedWs);
      if (featureTab === 'time') loadTimeEntries(selectedWs);
      if (featureTab === 'create') {
        loadSpaces(selectedWs);
        loadMembers(selectedWs);
      }
    }
  }, [selectedWs, featureTab]);

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

  async function loadSpaces(wsId: string) {
    const token = getClickUpToken();
    if (!token) return;
    setLoadingSpaces(true);
    try {
      const sp = await fetchClickUpSpaces(token, wsId);
      setSpaces(sp);
      if (sp.length > 0) {
        const targetSpace = (selectedSpace && sp.some(s => s.id === selectedSpace))
          ? selectedSpace
          : sp[0].id;
        setSelectedSpace(targetSpace);
        loadHierarchy(targetSpace);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSpaces(false);
    }
  }

  async function loadHierarchy(spaceId: string) {
    const token = getClickUpToken();
    if (!token) return;
    setLoadingHierarchy(true);
    setFolders([]);
    setFolderlessLists([]);
    try {
      const [fldrs, fLists] = await Promise.all([
        fetchClickUpFolders(token, spaceId).catch(err => {
          console.warn('Error fetching folders:', err);
          return [] as ClickUpFolder[];
        }),
        fetchClickUpLists(token, spaceId, false).catch(err => {
          console.warn('Error fetching folderless lists:', err);
          return [] as ClickUpList[];
        })
      ]);

      setFolders(fldrs);
      setFolderlessLists(fLists);

      // Auto-expand all folders by default so user can immediately see everything
      const exp: Record<string, boolean> = {};
      fldrs.forEach(f => { exp[f.id] = true; });
      setExpandedFolders(exp);

      // Consolidate all lists for task creation, list lookup, and auto-selection
      const allLists: ClickUpList[] = [
        ...fLists,
        ...fldrs.flatMap(f => f.lists || [])
      ];
      setLists(allLists);

      // Auto-select first available list if exists
      if (allLists.length > 0) {
        setSelectedList(allLists[0].id);
        setSelectedListName(allLists[0].name);
        loadListTasks(allLists[0].id);
      } else {
        setSelectedList(null);
        setSelectedListName('');
        setListTasks([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHierarchy(false);
    }
  }

  async function loadListTasks(listId: string) {
    const token = getClickUpToken();
    if (!token) return;
    setLoadingListTasks(true);
    try {
      const lt = await fetchClickUpListTasks(token, listId);
      setListTasks(lt);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingListTasks(false);
    }
  }

  async function loadMembers(wsId: string) {
    const token = getClickUpToken();
    if (!token) return;
    setLoadingMembers(true);
    try {
      const m = await fetchClickUpTeamMembers(token, wsId);
      setTeamMembers(m);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMembers(false);
    }
  }

  async function loadTimeEntries(wsId: string) {
    const token = getClickUpToken();
    if (!token) return;
    setLoadingTime(true);
    try {
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const entries = await fetchClickUpTimeEntries(token, wsId, sevenDaysAgo, Date.now());
      setTimeEntries(entries);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTime(false);
    }
  }

  function handleConnectOAuth() {
    if (!clientIdConfigured) {
      setError('VITE_CLICKUP_CLIENT_ID is not configured yet. You can use the "API Token" tab below for instant connection!');
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

  function handleImportMembers() {
    if (onImportMembers && teamMembers.length > 0) {
      onImportMembers(teamMembers);
    }
    setSyncToast(`Imported ${teamMembers.length} members from ClickUp into your squad roster!`);
    setTimeout(() => setSyncToast(null), 4000);
  }

  function handleImportTimeEntries() {
    if (onImportTimeEntries && timeEntries.length > 0) {
      onImportTimeEntries(timeEntries);
    }
    const totalHours = Math.round(timeEntries.reduce((sum, e) => sum + e.duration, 0) / 3600000);
    setSyncToast(`Imported ${timeEntries.length} time entries (${totalHours}h) into DSR Tracker!`);
    setTimeout(() => setSyncToast(null), 4000);
  }

  async function handleCreateTaskSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newTaskName.trim() || !selectedList) {
      setError('Please provide a task name and target list.');
      return;
    }
    const token = getClickUpToken();
    if (!token) return;

    setCreatingTask(true);
    setError(null);
    try {
      const estHours = parseFloat(newTaskHours) || 4;
      const created = await createClickUpTask(token, selectedList, {
        name: newTaskName.trim(),
        description: newTaskDesc.trim() || undefined,
        assignees: newTaskAssignee ? [newTaskAssignee] : undefined,
        time_estimate: estHours * 3600000,
        priority: parseInt(newTaskPriority, 10) || 3
      });

      setSyncToast(`🚀 Task "${created.name}" pushed to ClickUp successfully!`);
      setNewTaskName('');
      setNewTaskDesc('');
      if (selectedList) loadListTasks(selectedList);
      if (selectedWs) loadTasks(selectedWs);
    } catch (err: any) {
      setError(err.message || 'Failed to create task in ClickUp.');
    } finally {
      setCreatingTask(false);
    }
  }

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop with Guaranteed Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="clickup-modal-backdrop cursor-pointer"
            onClick={onClose}
          />

          {/* Centered Modal Container */}
          <div className="clickup-modal-container">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              className="clickup-modal-card"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="clickup-modal-header">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500" />
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 via-purple-700 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30 shrink-0 border border-purple-400/40">
                      <span className="text-white font-black text-xl leading-none">C</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-extrabold text-white tracking-tight" style={{ color: '#ffffff' }}>
                          ClickUp Command &amp; Live Sync Center
                        </h2>
                        {connected ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold flex items-center gap-1" style={{ color: '#6ee7b7' }}>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Connected
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold" style={{ color: '#fcd34d' }}>
                            Not Connected
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5" style={{ color: '#94a3b8' }}>
                        {connected && connectedUser ? `Synced as ${connectedUser} · ` : ''}
                        Hierarchy, Real-Time Time Tracking, Team Mapping &amp; Deliverables Push
                      </p>
                    </div>
                  </div>

                  {/* Header Close Button with Esc shortcut indicator */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141c2e] hover:bg-slate-800 border border-slate-700/80 text-white hover:text-rose-300 text-xs font-bold transition-all cursor-pointer shadow-sm"
                      title="Close modal (Esc)"
                      style={{ color: '#ffffff' }}
                    >
                      <span className="text-[10px] uppercase tracking-wider bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 border border-slate-700">Esc</span>
                      <X className="w-3.5 h-3.5 text-rose-400" />
                      <span>Close</span>
                    </button>
                  </div>
                </div>

                {/* Connected Navigation Tabs */}
                {connected && (
                  <div className="flex items-center gap-1.5 mt-4 pt-2 border-t border-slate-800/80 overflow-x-auto">
                    {[
                      { id: 'overview', label: 'Overview & Sync', icon: Zap },
                      { id: 'hierarchy', label: 'Spaces & Lists', icon: Layers },
                      { id: 'time', label: 'Time Tracking', icon: Clock },
                      { id: 'members', label: 'Team Members', icon: Users },
                      { id: 'create', label: 'Create Task', icon: PlusCircle },
                      { id: 'webhooks', label: 'Live Sync & Webhooks', icon: Radio },
                    ].map((tab) => {
                      const Icon = tab.icon;
                      const isActive = featureTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setFeatureTab(tab.id as ActiveFeatureTab)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                            isActive
                              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/40 border border-purple-400/50'
                              : 'bg-[#141c2e] text-slate-200 hover:text-white hover:bg-[#1b263e] border border-slate-700'
                          }`}
                          style={{ color: isActive ? '#ffffff' : '#f1f5f9' }}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Scrollable Body with Guaranteed Height & Scroll */}
              <div className="clickup-modal-body space-y-4">

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
                            { icon: Clock,    label: 'Real-time time logs', color: 'text-amber-400' },
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

                {/* CONNECTED STATE: FEATURE TABS */}
                {connected && (
                  <div className="space-y-4">

                    {/* SUB-TAB 1: OVERVIEW & GENERAL SYNC */}
                    {featureTab === 'overview' && (
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
                            Active Workspace
                          </label>
                          {loadingWs ? (
                            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-900 border border-slate-800">
                              <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                              <span className="text-xs text-slate-400">Loading workspaces…</span>
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

                        {/* Open Tasks List Preview */}
                        {selectedWs && (
                          <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                Workspace Tasks ({tasks.length})
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
                              <div className="flex items-center justify-center gap-2 py-6 rounded-xl clickup-card-surface">
                                <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                                <span className="text-xs text-slate-400">Fetching workspace tasks…</span>
                              </div>
                            ) : tasks.length === 0 ? (
                              <div className="py-5 text-center text-xs text-slate-400 clickup-card-surface">
                                No open tasks found in this workspace.
                              </div>
                            ) : (
                              <div className="space-y-2 clickup-task-scroll">
                                {tasks.map((task) => (
                                  <div
                                    key={task.id}
                                    onClick={() => window.open(task.url, '_blank')}
                                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl clickup-card-surface text-xs hover:border-purple-500/50 hover:bg-[#19223a] transition-all cursor-pointer group"
                                  >
                                    <span
                                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                                      style={{ backgroundColor: task.status?.color || '#8b5cf6' }}
                                      title={task.status?.status || 'Open'}
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="font-bold text-white group-hover:text-purple-300 transition-colors truncate text-xs" style={{ color: '#ffffff' }}>{task.name}</div>
                                      <div className="text-[11px] text-slate-400 truncate flex items-center gap-2 mt-0.5" style={{ color: '#94a3b8' }}>
                                        {task.list?.name && (
                                          <span className="px-1.5 py-0.5 rounded bg-slate-800/90 text-slate-300 border border-slate-700/80 text-[10px] font-medium">
                                            {task.list.name}
                                          </span>
                                        )}
                                        <span>
                                          {task.assignees?.map((a) => a.username).join(', ') || 'Unassigned'}
                                        </span>
                                      </div>
                                    </div>
                                    <a
                                      href={task.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-purple-900/60 border border-slate-700/80 hover:border-purple-500/50 text-slate-300 hover:text-purple-200 text-[11px] font-semibold transition-all shrink-0 cursor-pointer"
                                      title="Open in ClickUp"
                                    >
                                      <span>Open</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  </div>
                                ))}
                              </div>
                            )}

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

                    {/* SUB-TAB 2: SPACES, FOLDERS & LISTS HIERARCHY */}
                    {featureTab === 'hierarchy' && (
                      <div className="space-y-4">
                        <div className="text-xs text-slate-400 flex items-center justify-between">
                          <span>Browse ClickUp Spaces, Folders &amp; Lists to inspect deliverable tasks:</span>
                          {selectedSpace ? (
                            <button
                              type="button"
                              onClick={() => loadHierarchy(selectedSpace)}
                              disabled={loadingHierarchy}
                              className="text-purple-400 hover:text-purple-300 flex items-center gap-1 font-semibold cursor-pointer disabled:opacity-50"
                            >
                              <RefreshCw className={`w-3 h-3 ${loadingHierarchy ? 'animate-spin' : ''}`} /> Refresh
                            </button>
                          ) : selectedWs ? (
                            <button
                              type="button"
                              onClick={() => loadSpaces(selectedWs)}
                              className="text-purple-400 hover:text-purple-300 flex items-center gap-1 font-semibold cursor-pointer"
                            >
                              <RefreshCw className="w-3 h-3" /> Refresh
                            </button>
                          ) : null}
                        </div>

                        {/* Spaces Horizontal Picker */}
                        {loadingSpaces ? (
                          <div className="py-4 text-center text-xs text-slate-400" style={{ color: '#94a3b8' }}>Loading ClickUp Spaces…</div>
                        ) : (
                          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                            {spaces.map((sp) => (
                              <div
                                key={sp.id}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 border ${
                                  selectedSpace === sp.id
                                    ? 'bg-purple-600 border-purple-400 text-white shadow-md shadow-purple-600/30'
                                    : 'bg-[#151d30] border-slate-700/80 text-slate-200 hover:text-white hover:bg-[#1c2742]'
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedSpace(sp.id);
                                    loadHierarchy(sp.id);
                                  }}
                                  className="flex items-center gap-1.5 cursor-pointer bg-transparent border-0 p-0 text-inherit"
                                  style={{ color: selectedSpace === sp.id ? '#ffffff' : '#f1f5f9' }}
                                >
                                  <FolderKanban className="w-3.5 h-3.5 text-purple-400" />
                                  <span style={{ color: selectedSpace === sp.id ? '#ffffff' : '#f1f5f9' }}>{sp.name}</span>
                                </button>
                                {selectedWs && (
                                  <a
                                    href={`https://app.clickup.com/${selectedWs}/v/s/${sp.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title={`Open "${sp.name}" Space in ClickUp`}
                                    className="p-0.5 rounded hover:bg-white/20 text-white/70 hover:text-white transition-colors cursor-pointer ml-1"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Hierarchy Content: Folders + Lists */}
                        {loadingHierarchy ? (
                          <div className="flex items-center justify-center gap-2 py-8 rounded-xl clickup-card-surface border border-slate-800">
                            <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                            <span className="text-xs text-slate-300">Loading Folders &amp; Lists from ClickUp…</span>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {/* Summary Counter Bar */}
                            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800/80 text-[11px] text-slate-300">
                              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                                <Layers className="w-3.5 h-3.5 text-purple-400" />
                                <span>Space Hierarchy:</span>
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold">
                                  📁 {folders.length} {folders.length === 1 ? 'Folder' : 'Folders'}
                                </span>
                                <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-bold">
                                  📄 {lists.length} {lists.length === 1 ? 'List' : 'Lists'}
                                </span>
                              </div>
                            </div>

                            {/* SECTION 1: FOLDERS & NESTED LISTS */}
                            {folders.length > 0 && (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-amber-400">
                                  <div className="flex items-center gap-1.5">
                                    <FolderKanban className="w-3.5 h-3.5 text-amber-400" />
                                    <span>Folders &amp; Nested Lists ({folders.length})</span>
                                  </div>
                                  <span className="text-[10px] text-slate-400 font-normal lowercase tracking-normal">
                                    click to inspect • ↗ to open in ClickUp
                                  </span>
                                </div>

                                <div className="space-y-2.5">
                                  {folders.map((folder) => {
                                    const isExpanded = expandedFolders[folder.id] ?? true;
                                    const folderLists = folder.lists || [];
                                    return (
                                      <div
                                        key={folder.id}
                                        className="rounded-xl border border-slate-800 bg-[#0e1526]/90 overflow-hidden transition-colors"
                                      >
                                        {/* Folder Header */}
                                        <div className="w-full flex items-center justify-between px-3.5 py-2.5 bg-[#141d33] hover:bg-[#18233d] transition-all text-left">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setExpandedFolders(prev => ({
                                                ...prev,
                                                [folder.id]: !prev[folder.id]
                                              }));
                                            }}
                                            className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer bg-transparent border-0 p-0 text-left"
                                          >
                                            {isExpanded ? (
                                              <ChevronDown className="w-4 h-4 text-amber-400 shrink-0" />
                                            ) : (
                                              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                                            )}
                                            {isExpanded ? (
                                              <FolderOpen className="w-4 h-4 text-amber-400 shrink-0" />
                                            ) : (
                                              <FolderClosed className="w-4 h-4 text-amber-400 shrink-0" />
                                            )}
                                            <span className="font-bold text-white text-xs truncate" style={{ color: '#ffffff' }}>
                                              {folder.name}
                                            </span>
                                          </button>

                                          <div className="flex items-center gap-2 shrink-0 ml-2">
                                            <span className="text-[10px] text-amber-300 font-semibold px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20">
                                              {folderLists.length} {folderLists.length === 1 ? 'list' : 'lists'}
                                            </span>
                                            {selectedWs && (
                                              <a
                                                href={`https://app.clickup.com/${selectedWs}/v/f/${folder.id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                title={`Open "${folder.name}" Folder in ClickUp`}
                                                className="p-1 rounded bg-slate-800/80 hover:bg-amber-500/20 text-slate-400 hover:text-amber-300 border border-slate-700/60 transition-colors cursor-pointer"
                                              >
                                                <ExternalLink className="w-3 h-3" />
                                              </a>
                                            )}
                                          </div>
                                        </div>

                                        {/* Folder Child Lists */}
                                        {isExpanded && (
                                          <div className="p-2.5 bg-[#0a0f1d]/60 border-t border-slate-800/80">
                                            {folderLists.length === 0 ? (
                                              <div className="py-2 px-3 text-[11px] text-slate-400 italic">
                                                No lists in this folder.
                                              </div>
                                            ) : (
                                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {folderLists.map((ls) => (
                                                  <div
                                                    key={ls.id}
                                                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs border transition-all ${
                                                      selectedList === ls.id
                                                        ? 'bg-purple-600/30 border-purple-500 text-purple-100 ring-1 ring-purple-500/40 shadow-sm'
                                                        : 'bg-[#121929] border-slate-700/70 text-slate-200 hover:border-purple-500/40 hover:bg-[#182238]'
                                                    }`}
                                                  >
                                                    <button
                                                      type="button"
                                                      onClick={() => {
                                                        setSelectedList(ls.id);
                                                        setSelectedListName(ls.name);
                                                        loadListTasks(ls.id);
                                                      }}
                                                      className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer bg-transparent border-0 p-0 text-inherit"
                                                    >
                                                      <ListTodo className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                                                      <span className="font-semibold text-white truncate text-xs" style={{ color: '#ffffff' }}>
                                                        {ls.name}
                                                      </span>
                                                      {(ls.name.toLowerCase().includes('client') || ls.name.toLowerCase().includes('account')) && (
                                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold shrink-0">
                                                          CRM Roster
                                                        </span>
                                                      )}
                                                    </button>
                                                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                                      <span className="text-[10px] text-slate-400" style={{ color: '#94a3b8' }}>
                                                        {ls.task_count ?? 0} tasks
                                                      </span>
                                                      {selectedWs && (
                                                        <a
                                                          href={`https://app.clickup.com/${selectedWs}/v/li/${ls.id}`}
                                                          target="_blank"
                                                          rel="noopener noreferrer"
                                                          title={`Open "${ls.name}" List in ClickUp`}
                                                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
                                                        >
                                                          <ExternalLink className="w-3 h-3" />
                                                        </a>
                                                      )}
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* SECTION 2: SPACE LISTS (FOLDERLESS) */}
                            {folderlessLists.length > 0 && (
                              <div className="space-y-2">
                                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-cyan-400 pt-1">
                                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                                  <span>Space Lists (Folderless) ({folderlessLists.length})</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {folderlessLists.map((ls) => (
                                    <div
                                      key={ls.id}
                                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs border transition-all ${
                                        selectedList === ls.id
                                          ? 'bg-purple-600/30 border-purple-500 text-purple-100 ring-1 ring-purple-500/40 shadow-sm'
                                          : 'bg-[#151d30] border-slate-700/80 text-slate-200 hover:border-slate-600 hover:bg-[#1c2742]'
                                      }`}
                                    >
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedList(ls.id);
                                          setSelectedListName(ls.name);
                                          loadListTasks(ls.id);
                                        }}
                                        className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer bg-transparent border-0 p-0 text-inherit"
                                      >
                                        <ListTodo className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                                        <span className="font-semibold text-white truncate text-xs" style={{ color: '#ffffff' }}>
                                          {ls.name}
                                        </span>
                                      </button>
                                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                        <span className="text-[10px] text-slate-400" style={{ color: '#94a3b8' }}>
                                          {ls.task_count ?? 0} tasks
                                        </span>
                                        {selectedWs && (
                                          <a
                                            href={`https://app.clickup.com/${selectedWs}/v/li/${ls.id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            title={`Open "${ls.name}" List in ClickUp`}
                                            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
                                          >
                                            <ExternalLink className="w-3 h-3" />
                                          </a>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* EMPTY STATE */}
                            {folders.length === 0 && folderlessLists.length === 0 && (
                              <div className="py-6 text-center text-xs text-slate-400 bg-slate-900/40 rounded-xl border border-slate-800" style={{ color: '#94a3b8' }}>
                                No folders or lists found in this space.
                              </div>
                            )}
                          </div>
                        )}

                        {/* Tasks in selected list */}
                        {selectedList && (
                          <div className="space-y-2 pt-2 border-t border-slate-800/80">
                            <div className="flex items-center justify-between">
                              <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5" style={{ color: '#e2e8f0' }}>
                                <span>Tasks in</span>
                                <span className="text-white font-extrabold px-1.5 py-0.5 rounded bg-purple-900/50 border border-purple-700/60" style={{ color: '#ffffff' }}>
                                  {selectedListName || 'Selected List'}
                                </span>
                                <span>({listTasks.length})</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => loadListTasks(selectedList)}
                                disabled={loadingListTasks}
                                className="flex items-center gap-1 text-[11px] text-purple-400 hover:text-purple-300 font-semibold cursor-pointer disabled:opacity-50"
                              >
                                <RefreshCw className={`w-3 h-3 ${loadingListTasks ? 'animate-spin' : ''}`} />
                                Refresh
                              </button>
                            </div>

                            {/* Client Accounts Roster Sync Action Banner */}
                            {!loadingListTasks && listTasks.length > 0 && onImportProjectsFromList && (
                              <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-950/70 via-indigo-950/60 to-purple-950/70 border border-emerald-500/40 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-3">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black uppercase tracking-wider">
                                      Active Client Roster Ingestion
                                    </span>
                                    <span className="text-xs font-extrabold text-white" style={{ color: '#ffffff' }}>
                                      {selectedListName} ({listTasks.length} Accounts)
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-300" style={{ color: '#cbd5e1' }}>
                                    Import and map ClickUp clients directly into Active Projects. Choose tasks, subtasks, or both.
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setImportScopeDialog({
                                        isOpen: true,
                                        replace: true,
                                        scope: 'tasks'
                                      });
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
                                    title="Choose tasks, subtasks, or both to replace active projects"
                                  >
                                    <Zap className="w-3.5 h-3.5 fill-slate-950" />
                                    <span>⚡ Replace Active Projects ({listTasks.length})</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setImportScopeDialog({
                                        isOpen: true,
                                        replace: false,
                                        scope: 'tasks'
                                      });
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all border border-slate-600 cursor-pointer"
                                    title="Choose tasks, subtasks, or both to append to active projects"
                                    style={{ color: '#ffffff' }}
                                  >
                                    <PlusCircle className="w-3.5 h-3.5 text-cyan-400" />
                                    <span>➕ Add to Projects</span>
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Subtask / Task Preview Filter Tabs */}
                            {!loadingListTasks && listTasks.length > 0 && (
                              <div className="flex items-center justify-between gap-2 pt-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mr-1">
                                    Display:
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setListSubtaskFilter('all')}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                      listSubtaskFilter === 'all'
                                        ? 'bg-purple-600 text-white shadow-sm'
                                        : 'bg-slate-800/80 text-slate-300 hover:text-white'
                                    }`}
                                  >
                                    All ({listTasks.length})
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setListSubtaskFilter('tasks')}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                      listSubtaskFilter === 'tasks'
                                        ? 'bg-purple-600 text-white shadow-sm'
                                        : 'bg-slate-800/80 text-slate-300 hover:text-white'
                                    }`}
                                  >
                                    📌 Tasks Only ({listTasks.filter(t => !t.parent).length})
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setListSubtaskFilter('subtasks')}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                      listSubtaskFilter === 'subtasks'
                                        ? 'bg-purple-600 text-white shadow-sm'
                                        : 'bg-slate-800/80 text-slate-300 hover:text-white'
                                    }`}
                                  >
                                    ↳ Subtasks Only ({listTasks.filter(t => !!t.parent).length})
                                  </button>
                                </div>
                                <span className="text-[11px] text-slate-400">
                                  Showing {
                                    listSubtaskFilter === 'tasks' 
                                      ? listTasks.filter(t => !t.parent).length 
                                      : listSubtaskFilter === 'subtasks' 
                                      ? listTasks.filter(t => !!t.parent).length 
                                      : listTasks.length
                                  } tasks
                                </span>
                              </div>
                            )}

                            {loadingListTasks ? (
                              <div className="py-6 text-center text-xs text-slate-400" style={{ color: '#94a3b8' }}>Loading tasks in list…</div>
                            ) : listTasks.length === 0 ? (
                              <div className="py-4 text-center text-xs text-slate-400 bg-slate-900/40 rounded-lg border border-slate-800" style={{ color: '#94a3b8' }}>
                                No tasks found in this list.
                              </div>
                            ) : (
                              <div className="space-y-2 clickup-list-scroll">
                                {listTasks
                                  .filter(t => {
                                    if (listSubtaskFilter === 'tasks') return !t.parent;
                                    if (listSubtaskFilter === 'subtasks') return !!t.parent;
                                    return true;
                                  })
                                  .map((t) => (
                                  <div
                                    key={t.id}
                                    onClick={() => window.open(t.url, '_blank')}
                                    className="flex items-center justify-between px-3.5 py-2.5 rounded-xl clickup-card-surface text-xs hover:border-purple-500/50 hover:bg-[#19223a] transition-all cursor-pointer group"
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <span
                                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                                        style={{ backgroundColor: t.status?.color || '#8b5cf6' }}
                                        title={t.status?.status || 'Open'}
                                      />
                                      <span className="font-semibold text-white group-hover:text-purple-300 transition-colors truncate text-xs" style={{ color: '#ffffff' }}>{t.name}</span>
                                      {t.parent && (
                                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold shrink-0">
                                          ↳ Subtask
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2.5 shrink-0 ml-2">
                                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 border border-slate-700 font-medium" style={{ color: '#f1f5f9' }}>
                                        {t.status?.status || 'Open'}
                                      </span>
                                      <a
                                        href={t.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-purple-900/60 border border-slate-700/80 hover:border-purple-500/50 text-slate-200 hover:text-purple-200 text-[11px] font-semibold transition-all shrink-0 cursor-pointer"
                                        title="Open in ClickUp"
                                        style={{ color: '#e2e8f0' }}
                                      >
                                        <span>Open</span>
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* SUB-TAB 3: TIME TRACKING LOGS */}
                    {featureTab === 'time' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span>Live time entries logged in ClickUp (Last 7 Days):</span>
                          {selectedWs && (
                            <button
                              type="button"
                              onClick={() => loadTimeEntries(selectedWs)}
                              className="text-purple-400 hover:text-purple-300 flex items-center gap-1 font-semibold cursor-pointer"
                            >
                              <RefreshCw className="w-3 h-3" /> Refresh Time
                            </button>
                          )}
                        </div>

                        {loadingTime ? (
                          <div className="py-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                            <span>Pulling time entries from ClickUp…</span>
                          </div>
                        ) : timeEntries.length === 0 ? (
                          <div className="py-6 text-center text-xs text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800">
                            No time entries found in the last 7 days.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="grid grid-cols-3 gap-2 text-center text-xs">
                              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                                <span className="text-slate-500 block text-[10px]">Total Logged</span>
                                <span className="text-lg font-black text-emerald-400">
                                  {(timeEntries.reduce((s, e) => s + e.duration, 0) / 3600000).toFixed(1)}h
                                </span>
                              </div>
                              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                                <span className="text-slate-500 block text-[10px]">Entries Count</span>
                                <span className="text-lg font-black text-cyan-400">{timeEntries.length}</span>
                              </div>
                              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                                <span className="text-slate-500 block text-[10px]">Active Trackers</span>
                                <span className="text-lg font-black text-purple-400">
                                  {new Set(timeEntries.map((e) => e.user.id)).size}
                                </span>
                              </div>
                            </div>

                            <div className="space-y-2 clickup-task-scroll pt-1">
                              {timeEntries.map((te) => (
                                <div
                                  key={te.id}
                                  className="flex items-center justify-between p-3 rounded-xl clickup-card-surface text-xs"
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="font-bold text-slate-100 truncate">
                                      {te.task?.name || te.description || 'General Task'}
                                    </div>
                                    <div className="text-[11px] text-slate-400 mt-0.5">
                                      Logged by <strong className="text-slate-200">{te.user.username}</strong>
                                    </div>
                                  </div>
                                  <div className="text-right shrink-0 ml-3">
                                    <span className="font-mono font-black text-emerald-400 text-sm">
                                      {(te.duration / 3600000).toFixed(2)} hrs
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>

                            <button
                              type="button"
                              onClick={handleImportTimeEntries}
                              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-500 hover:to-orange-500 text-white font-extrabold text-xs transition-all shadow-lg shadow-amber-600/25 cursor-pointer mt-2"
                            >
                              <Clock className="w-4 h-4" />
                              <span>⚡ Sync ClickUp Time Logs to DSR &amp; Workload</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* SUB-TAB 4: TEAM MEMBERS IMPORT */}
                    {featureTab === 'members' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span>Workspace members from ClickUp ({teamMembers.length}):</span>
                          {selectedWs && (
                            <button
                              type="button"
                              onClick={() => loadMembers(selectedWs)}
                              className="text-purple-400 hover:text-purple-300 flex items-center gap-1 font-semibold cursor-pointer"
                            >
                              <RefreshCw className="w-3 h-3" /> Refresh Members
                            </button>
                          )}
                        </div>

                        {loadingMembers ? (
                          <div className="py-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                            <span>Loading workspace team…</span>
                          </div>
                        ) : teamMembers.length === 0 ? (
                          <div className="py-6 text-center text-xs text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800">
                            No team members found.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="space-y-2 clickup-task-scroll">
                              {teamMembers.map((m) => (
                                <div
                                  key={m.id}
                                  className="flex items-center justify-between p-3 rounded-xl clickup-card-surface text-xs"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    {m.profilePicture ? (
                                      <img
                                        src={m.profilePicture}
                                        alt={m.username}
                                        className="w-8 h-8 rounded-lg object-cover ring-1 ring-slate-700 shrink-0"
                                      />
                                    ) : (
                                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 text-white font-black flex items-center justify-center shrink-0">
                                        {m.username.charAt(0).toUpperCase()}
                                      </div>
                                    )}
                                    <div className="min-w-0">
                                      <div className="font-bold text-slate-100 truncate">{m.username}</div>
                                      <div className="text-[11px] text-slate-400 truncate">{m.email}</div>
                                    </div>
                                  </div>
                                  <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-purple-950/80 text-purple-300 border border-purple-800/60 shrink-0">
                                    {m.role}
                                  </span>
                                </div>
                              ))}
                            </div>

                            <button
                              type="button"
                              onClick={handleImportMembers}
                              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-extrabold text-xs transition-all shadow-lg shadow-cyan-600/25 cursor-pointer mt-2"
                            >
                              <UserCheck className="w-4 h-4" />
                              <span>⚡ Import All ClickUp Members to Squad Roster</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* SUB-TAB 5: CREATE / PUSH TASK TO CLICKUP */}
                    {featureTab === 'create' && (
                      <form onSubmit={handleCreateTaskSubmit} className="space-y-3.5 text-xs">
                        <div className="text-xs text-slate-400">
                          Create and push a deliverable task directly into your ClickUp List:
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-slate-300">Deliverable Name *</label>
                          <input
                            type="text"
                            required
                            value={newTaskName}
                            onChange={(e) => setNewTaskName(e.target.value)}
                            placeholder="e.g. Technical SEO Audit & Core Web Vitals"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="font-bold text-slate-300">Target List *</label>
                            <select
                              required
                              value={selectedList || ''}
                              onChange={(e) => {
                                const lid = e.target.value;
                                setSelectedList(lid);
                                const found = lists.find(l => l.id === lid);
                                if (found) setSelectedListName(found.name);
                              }}
                              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                            >
                              <option value="" disabled>Select Target List</option>
                              {folders.map(f => (
                                (f.lists && f.lists.length > 0) ? (
                                  <optgroup key={f.id} label={`📁 Folder: ${f.name}`}>
                                    {f.lists.map(l => (
                                      <option key={l.id} value={l.id}>
                                        {l.name} ({l.task_count ?? 0} tasks)
                                      </option>
                                    ))}
                                  </optgroup>
                                ) : null
                              ))}
                              {folderlessLists.length > 0 && (
                                <optgroup label="📄 Space Lists (Folderless)">
                                  {folderlessLists.map(l => (
                                    <option key={l.id} value={l.id}>
                                      {l.name} ({l.task_count ?? 0} tasks)
                                    </option>
                                  ))}
                                </optgroup>
                              )}
                              {folders.length === 0 && folderlessLists.length === 0 && lists.map(l => (
                                <option key={l.id} value={l.id}>
                                  {l.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="font-bold text-slate-300">Estimated Hours</label>
                            <input
                              type="number"
                              min="0.5"
                              max="160"
                              step="0.5"
                              value={newTaskHours}
                              onChange={(e) => setNewTaskHours(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-purple-500"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="font-bold text-slate-300">Assignee</label>
                            <select
                              value={newTaskAssignee || ''}
                              onChange={(e) => setNewTaskAssignee(e.target.value ? parseInt(e.target.value, 10) : null)}
                              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                            >
                              <option value="">Unassigned</option>
                              {teamMembers.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.username} ({m.role})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="font-bold text-slate-300">Priority</label>
                            <select
                              value={newTaskPriority}
                              onChange={(e) => setNewTaskPriority(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                            >
                              <option value="1">🔴 Urgent (Priority 1)</option>
                              <option value="2">🟡 High (Priority 2)</option>
                              <option value="3">🔵 Normal (Priority 3)</option>
                              <option value="4">⚪ Low (Priority 4)</option>
                            </select>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-slate-300">Task Notes / Description</label>
                          <textarea
                            rows={2}
                            value={newTaskDesc}
                            onChange={(e) => setNewTaskDesc(e.target.value)}
                            placeholder="Deliverable specifications, client brief notes..."
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={creatingTask || !newTaskName.trim() || !selectedList}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs transition-all shadow-lg shadow-purple-600/30 disabled:opacity-50 cursor-pointer mt-1"
                        >
                          {creatingTask ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                          {creatingTask ? 'Pushing to ClickUp…' : '🚀 Push Task to ClickUp'}
                        </button>
                      </form>
                    )}

                    {/* TAB 6: LIVE SYNC & WEBHOOKS */}
                    {featureTab === 'webhooks' && (
                      <div className="space-y-4 text-xs">
                        {/* 1. Automated Polling Engine Status */}
                        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-md">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                              </span>
                              <h4 className="text-sm font-bold text-white" style={{ color: '#ffffff' }}>
                                Automated 60-Second Silent Sync Engine
                              </h4>
                            </div>
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                              🟢 ACTIVE & RUNNING
                            </span>
                          </div>
                          <p className="text-xs text-slate-200" style={{ color: '#ffffff' }}>
                            The tool silently polls ClickUp every 60 seconds while you work. Any changes made to task statuses, deliverables, or assignees in ClickUp are automatically mirrored into your active projects and Kanban board.
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                            <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                              <div className="text-[10px] font-bold text-purple-300 uppercase tracking-wider">Feature A</div>
                              <div className="text-xs font-bold text-white mt-0.5" style={{ color: '#ffffff' }}>Two-Way Kanban</div>
                              <div className="text-[10px] text-slate-300 mt-0.5" style={{ color: '#f1f5f9' }}>Drag & drop syncs ClickUp task status instantly</div>
                            </div>
                            <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                              <div className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider">Feature B</div>
                              <div className="text-xs font-bold text-white mt-0.5" style={{ color: '#ffffff' }}>Direct Deep Links</div>
                              <div className="text-[10px] text-slate-300 mt-0.5" style={{ color: '#f1f5f9' }}>[CU ↗] badges jump directly to ClickUp tasks</div>
                            </div>
                            <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                              <div className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">Feature E</div>
                              <div className="text-xs font-bold text-white mt-0.5" style={{ color: '#ffffff' }}>Assignee Mirroring</div>
                              <div className="text-[10px] text-slate-300 mt-0.5" style={{ color: '#f1f5f9' }}>Capacity linked to ClickUp user accounts</div>
                            </div>
                          </div>
                        </div>

                        {/* 2. Webhook Registration Suite */}
                        <form onSubmit={handleRegisterWebhook} className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3.5 shadow-md">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Radio className="w-4 h-4 text-purple-400" />
                              <h4 className="text-sm font-bold text-white" style={{ color: '#ffffff' }}>
                                Register Instant ClickUp Webhook
                              </h4>
                            </div>
                            <span className="text-[10px] font-bold text-slate-300" style={{ color: '#ffffff' }}>
                              POST /api/v2/team/webhook
                            </span>
                          </div>

                          <p className="text-xs text-slate-200 leading-relaxed" style={{ color: '#ffffff' }}>
                            For instant push notifications when tasks change in ClickUp (without waiting for the 60-second polling interval), register your public endpoint below:
                          </p>

                          <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-white" style={{ color: '#ffffff' }}>
                              Webhook Destination URL:
                            </label>
                            <input
                              type="url"
                              value={webhookUrl}
                              onChange={(e) => setWebhookUrl(e.target.value)}
                              placeholder="https://your-domain.com/api/clickup/webhook"
                              className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
                              style={{ color: '#ffffff' }}
                              required
                            />
                          </div>

                          <div className="space-y-1.5">
                            <span className="block text-xs font-bold text-white" style={{ color: '#ffffff' }}>
                              Active Subscribed Events:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {['taskCreated', 'taskUpdated', 'taskStatusUpdated', 'taskAssigneeUpdated', 'taskDeleted'].map((evt) => (
                                <span
                                  key={evt}
                                  className="px-2 py-0.5 rounded-md bg-purple-950/70 border border-purple-700/50 text-purple-200 text-[10px] font-mono font-bold"
                                  style={{ color: '#e9d5ff' }}
                                >
                                  ✓ {evt}
                                </span>
                              ))}
                            </div>
                          </div>

                          {webhookStatus && (
                            <div className={`p-3 rounded-xl text-xs font-bold border ${
                              webhookStatus.startsWith('✅')
                                ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
                                : 'bg-rose-950/60 border-rose-500/50 text-rose-200'
                            }`} style={{ color: '#ffffff' }}>
                              {webhookStatus}
                            </div>
                          )}

                          <button
                            type="submit"
                            disabled={registeringWebhook || !webhookUrl.trim() || !selectedWs}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs transition-all shadow-md shadow-purple-600/30 disabled:opacity-50 cursor-pointer"
                          >
                            {registeringWebhook ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Registering Webhook with ClickUp…</span>
                              </>
                            ) : (
                              <>
                                <Radio className="w-4 h-4" />
                                <span>Register Webhook with ClickUp API</span>
                              </>
                            )}
                          </button>
                        </form>
                      </div>
                    )}

                  </div>
                )}
              </div>

              {/* Modal Footer with Cancel & Done Controls */}
              <div className="clickup-modal-footer">
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
                  >
                    <X className="w-3.5 h-3.5 text-rose-400" />
                    <span>Cancel / Close</span>
                  </button>

                  {connected && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('Are you sure you want to disconnect ClickUp from this workspace?')) {
                          handleDisconnect();
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 text-rose-300 hover:text-rose-100 text-xs font-bold transition-all cursor-pointer"
                      title="Disconnect ClickUp account"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Disconnect</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-white hidden sm:inline" style={{ color: '#ffffff' }}>
                    {connected ? (
                      <>
                        Active Workspace: <strong style={{ color: '#c084fc' }}>{connectedUser || 'ClickUp Workspace'}</strong>
                      </>
                    ) : (
                      'Dual OAuth 2.0 & Token Auth'
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-extrabold transition-all shadow-md shadow-purple-600/30 cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            </motion.div>
          </div>

          {/* IMPORT SCOPE CONFIRMATION DIALOG (Tasks vs Subtasks vs Both) */}
          {importScopeDialog && (
            <div className="clickup-scope-container" style={{ zIndex: 100001 }}>
              {/* Frosted Glass Backdrop */}
              <div
                className="clickup-scope-backdrop cursor-pointer"
                onClick={() => setImportScopeDialog(null)}
              />

              {/* High-Contrast Solid Panel */}
              <div
                className="clickup-scope-card scope-purple p-6 space-y-4 text-left animate-fade-in shadow-2xl"
                onClick={(e) => e.stopPropagation()}
                style={{ backgroundColor: '#0c1427', color: '#ffffff', zIndex: 100, position: 'relative' }}
              >
                <div className="flex items-center justify-between pb-3.5 border-b border-slate-700/80">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/50 flex items-center justify-center text-purple-300 shadow-md shadow-purple-500/20">
                      <Zap className="w-5 h-5 text-purple-400 fill-purple-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-black text-white tracking-wide" style={{ color: '#ffffff' }}>
                          {importScopeDialog.replace ? '⚡ Replace Active Projects' : '➕ Add to Active Projects'}
                        </h3>
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] font-bold" style={{ color: '#d8b4fe' }}>
                          Import Scope
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5" style={{ color: '#cbd5e1' }}>
                        Target List: <strong className="text-purple-300 font-semibold" style={{ color: '#d8b4fe' }}>{selectedListName || 'Selected List'}</strong>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setImportScopeDialog(null)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 text-xs font-bold transition-all cursor-pointer shadow-sm"
                    style={{ backgroundColor: '#1e293b', color: '#ffffff' }}
                  >
                    <X className="w-4 h-4 text-rose-400" />
                    <span style={{ color: '#ffffff' }}>Close</span>
                  </button>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-bold text-white uppercase tracking-wider block" style={{ color: '#ffffff' }}>
                    What would you like to import?
                  </span>
                  <p className="text-xs text-slate-300" style={{ color: '#cbd5e1' }}>
                    Choose whether to import parent tasks, subtasks, or both from this list:
                  </p>
                </div>

                {/* Scope Radio Cards */}
                <div className="space-y-2.5">
                  {/* 1. Tasks Only (Parent Tasks) */}
                  <div
                    onClick={() => setImportScopeDialog(prev => prev ? { ...prev, scope: 'tasks' } : null)}
                    className={`clickup-scope-item flex items-start gap-3.5 ${
                      importScopeDialog.scope === 'tasks' ? 'is-selected-tasks' : ''
                    }`}
                    style={{
                      backgroundColor: importScopeDialog.scope === 'tasks' ? 'rgba(6, 78, 59, 0.65)' : '#121a2d',
                      borderColor: importScopeDialog.scope === 'tasks' ? '#10b981' : 'rgba(51, 65, 85, 0.7)'
                    }}
                  >
                    <input
                      type="radio"
                      name="scope_selection"
                      checked={importScopeDialog.scope === 'tasks'}
                      onChange={() => setImportScopeDialog(prev => prev ? { ...prev, scope: 'tasks' } : null)}
                      className="mt-1 accent-emerald-500 cursor-pointer w-4 h-4 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-black text-white" style={{ color: '#ffffff' }}>
                          📌 Tasks Only (Parent Accounts)
                        </span>
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full font-mono font-bold bg-emerald-500/25 text-emerald-300 border border-emerald-500/40" style={{ color: '#6ee7b7' }}>
                          {listTasks.filter(t => !t.parent).length} tasks
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed" style={{ color: '#cbd5e1' }}>
                        Recommended for client rosters &amp; retainers. Imports top-level client accounts only, ignoring nested subtasks.
                      </p>
                    </div>
                  </div>

                  {/* 2. Subtasks Only */}
                  <div
                    onClick={() => setImportScopeDialog(prev => prev ? { ...prev, scope: 'subtasks' } : null)}
                    className={`clickup-scope-item flex items-start gap-3.5 ${
                      importScopeDialog.scope === 'subtasks' ? 'is-selected-subtasks' : ''
                    }`}
                    style={{
                      backgroundColor: importScopeDialog.scope === 'subtasks' ? 'rgba(14, 116, 144, 0.65)' : '#121a2d',
                      borderColor: importScopeDialog.scope === 'subtasks' ? '#06b6d4' : 'rgba(51, 65, 85, 0.7)'
                    }}
                  >
                    <input
                      type="radio"
                      name="scope_selection"
                      checked={importScopeDialog.scope === 'subtasks'}
                      onChange={() => setImportScopeDialog(prev => prev ? { ...prev, scope: 'subtasks' } : null)}
                      className="mt-1 accent-cyan-500 cursor-pointer w-4 h-4 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-black text-white" style={{ color: '#ffffff' }}>
                          ↳ Subtasks Only
                        </span>
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full font-mono font-bold bg-cyan-500/25 text-cyan-300 border border-cyan-500/40" style={{ color: '#67e8f9' }}>
                          {listTasks.filter(t => !!t.parent).length} subtasks
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed" style={{ color: '#cbd5e1' }}>
                        Imports nested subtasks as individual project items. Parent accounts are skipped.
                      </p>
                    </div>
                  </div>

                  {/* 3. Both Tasks & Subtasks */}
                  <div
                    onClick={() => setImportScopeDialog(prev => prev ? { ...prev, scope: 'both' } : null)}
                    className={`clickup-scope-item flex items-start gap-3.5 ${
                      importScopeDialog.scope === 'both' ? 'is-selected-both' : ''
                    }`}
                    style={{
                      backgroundColor: importScopeDialog.scope === 'both' ? 'rgba(88, 28, 135, 0.65)' : '#121a2d',
                      borderColor: importScopeDialog.scope === 'both' ? '#a855f7' : 'rgba(51, 65, 85, 0.7)'
                    }}
                  >
                    <input
                      type="radio"
                      name="scope_selection"
                      checked={importScopeDialog.scope === 'both'}
                      onChange={() => setImportScopeDialog(prev => prev ? { ...prev, scope: 'both' } : null)}
                      className="mt-1 accent-purple-500 cursor-pointer w-4 h-4 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-black text-white" style={{ color: '#ffffff' }}>
                          ⚡ Both Tasks &amp; Subtasks
                        </span>
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full font-mono font-bold bg-purple-500/25 text-purple-300 border border-purple-500/40" style={{ color: '#d8b4fe' }}>
                          {listTasks.length} total
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed" style={{ color: '#cbd5e1' }}>
                        Imports all root client tasks AND all nested subtasks into active projects.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Warning note for Replace */}
                {importScopeDialog.replace && (
                  <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-xs text-amber-200 shadow-sm leading-relaxed">
                    ⚠️ <strong className="font-bold text-amber-300">Replace Roster Notice:</strong> Your current Active Projects list will be replaced with the {
                      importScopeDialog.scope === 'tasks'
                        ? listTasks.filter(t => !t.parent).length
                        : importScopeDialog.scope === 'subtasks'
                        ? listTasks.filter(t => !!t.parent).length
                        : listTasks.length
                    } selected items.
                  </div>
                )}

                {/* Buttons */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-700/80">
                  <button
                    type="button"
                    onClick={() => setImportScopeDialog(null)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-600 transition-all cursor-pointer hover:bg-slate-700"
                    style={{ backgroundColor: '#1e293b', color: '#ffffff' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const scope = importScopeDialog.scope;
                      const finalTasks = scope === 'tasks'
                        ? listTasks.filter(t => !t.parent)
                        : scope === 'subtasks'
                        ? listTasks.filter(t => !!t.parent)
                        : listTasks;

                      if (finalTasks.length === 0) {
                        alert(`No items match "${scope}" in this list.`);
                        return;
                      }

                      onImportProjectsFromList?.(
                        { id: selectedList!, name: selectedListName || 'Accounts/Clients' },
                        finalTasks,
                        importScopeDialog.replace
                      );
                      setImportScopeDialog(null);
                      onClose();
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all shadow-lg cursor-pointer hover:opacity-95"
                    style={{
                      backgroundColor: importScopeDialog.replace ? '#10b981' : '#9333ea',
                      color: importScopeDialog.replace ? '#020617' : '#ffffff',
                      boxShadow: importScopeDialog.replace
                        ? '0 4px 15px rgba(16, 185, 129, 0.4)'
                        : '0 4px 15px rgba(147, 51, 234, 0.4)'
                    }}
                  >
                    <Zap className="w-4 h-4 fill-current" />
                    <span>
                      {importScopeDialog.replace ? '⚡ Replace Active Projects (' : '➕ Add to Projects ('}
                      {importScopeDialog.scope === 'tasks'
                        ? listTasks.filter(t => !t.parent).length
                        : importScopeDialog.scope === 'subtasks'
                        ? listTasks.filter(t => !!t.parent).length
                        : listTasks.length}
                      )
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};
