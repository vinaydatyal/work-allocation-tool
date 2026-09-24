import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Search,
  CheckCheck,
  MessageSquare,
  RefreshCw,
  Send,
  X,
  ExternalLink,
  ShieldCheck,
  TrendingUp
} from 'lucide-react';
import { toast as sonnerToast } from 'sonner';
import type { TeamMember } from '../types';
import {
  fetchDsrEntries,
  fetchTimeLogsForDsr,
  approveDsrEntry,
  requestDsrRevision,
  batchApproveDsrEntries
} from '../lib/supabase';

export interface DSRApprovalQueueProps {
  members: TeamMember[];
  onViewMemberProfile?: (member: TeamMember) => void;
}

export interface ReviewTimeLog {
  id: string;
  taskName: string;
  category: string;
  durationMs: number;
  notes?: string;
  source?: string;
}

export interface ReviewDsrItem {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  roleTitle: string;
  roleType: string;
  assignedTeamName: string;
  assignedTeamLead: string;
  teamColor: string;
  skills: string[];
  date: string;
  status: 'pending_review' | 'approved' | 'revision_requested';
  submittedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewerComment?: string;
  totalDurationMs: number;
  timeLogs: ReviewTimeLog[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getMemberPodInfo(memberName: string) {
  const n = (memberName || '').toLowerCase();
  if (n.includes('agam') || n.includes('manpreet')) {
    return { podName: 'Executive Leadership', leadName: 'Co-Founders', color: '#6366f1' };
  }
  if (n.includes('vinay') || n.includes('nidhi')) {
    return { podName: 'Operations & Management', leadName: 'Vinay Datyal', color: '#f59e0b' };
  }
  if (
    n.includes('khuvaish') ||
    n.includes('kamakshi') ||
    n.includes('anshita') ||
    n.includes('komal') ||
    n.includes('rushali') ||
    n.includes('siya')
  ) {
    return { podName: 'Strategy & SEO Pod', leadName: 'Khuvaish', color: '#06b6d4' };
  }
  if (
    n.includes('amrit') ||
    n.includes('aakash') ||
    n.includes('anu') ||
    n.includes('neeraj') ||
    n.includes('sahil') ||
    n.includes('vimla')
  ) {
    return { podName: 'SEO & Delivery Pod', leadName: 'Amrit Kaur', color: '#10b981' };
  }
  if (
    n.includes('vansh') ||
    n.includes('anshum') ||
    n.includes('navjeet') ||
    n.includes('himanshu') ||
    n.includes('raman') ||
    n.includes('shubham') ||
    n.includes('vivek')
  ) {
    return { podName: 'Web, Tech & Dev Pod', leadName: 'Vansh', color: '#3b82f6' };
  }
  return { podName: 'Cross-Functional Team', leadName: 'Operations Head', color: '#8b5cf6' };
}

function formatHours(ms: number): string {
  const totalMinutes = Math.round(ms / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

// ─── Initial Seed / Mock Submissions Generator ───────────────────────────────

function generateInitialMockDSRs(members: TeamMember[]): ReviewDsrItem[] {
  const todayStr = new Date().toISOString().split('T')[0];

  const templateSubmissions = [
    {
      name: 'Anshum',
      roleTitle: 'Developer',
      status: 'pending_review' as const,
      submittedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      timeLogs: [
        { id: 'tl-101', taskName: 'Apex Financial Portal — Core Web Vitals LCP Optimization', category: 'WordPress & Web Dev', durationMs: 3.5 * 3600000, notes: 'Minified critical CSS and deferred non-essential JavaScript.' },
        { id: 'tl-102', taskName: 'Shopify Checkout Liquid Template Setup for Nova Retail', category: 'Frontend Development', durationMs: 2.5 * 3600000, notes: 'Created staging duplicate and validated tracking scripts.' },
        { id: 'tl-103', taskName: 'Internal Tech Stack Upgrade & Node 20 Migration Docs', category: 'Internal Initiative', durationMs: 1.5 * 3600000, notes: 'Documented migration guidelines for web developers.' }
      ]
    },
    {
      name: 'Kamakshi Chopra',
      roleTitle: 'Senior SEO Executive',
      status: 'pending_review' as const,
      submittedAt: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
      timeLogs: [
        { id: 'tl-201', taskName: 'Q3 Perplexity & ChatGPT Search Engine Citation Audit', category: 'AEO (Answer Engine Opt)', durationMs: 4.0 * 3600000, notes: 'Benchmarked 25 target query citations across Perplexity Pro and SearchGPT.' },
        { id: 'tl-202', taskName: 'Competitor Knowledge Graph Entity Mapping & Schema Markup', category: 'Technical SEO', durationMs: 2.5 * 3600000, notes: 'Implemented Organization and Service nested schema.' },
        { id: 'tl-203', taskName: 'Client Strategy Call & Slide Deck Prep for Acme Corp', category: 'Client Communication', durationMs: 1.5 * 3600000, notes: 'Reviewed organic impressions surge with account leads.' }
      ]
    },
    {
      name: 'Navjeet kaur',
      roleTitle: 'Designer',
      status: 'approved' as const,
      submittedAt: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
      reviewedBy: 'Vansh (Team Lead)',
      reviewedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      timeLogs: [
        { id: 'tl-301', taskName: 'Mobile UI/UX Wireframes for Acme Redesign in Figma', category: 'UI/UX Design', durationMs: 4.5 * 3600000, notes: 'Completed 12 key high-fidelity screen templates for review.' },
        { id: 'tl-302', taskName: 'Social Media & Blog Infographic Assets for GEO Guide', category: 'Graphic Design', durationMs: 2.5 * 3600000, notes: 'Exported SVG and retina webp assets.' }
      ]
    },
    {
      name: 'Aakash',
      roleTitle: 'Executive',
      status: 'revision_requested' as const,
      submittedAt: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
      reviewedBy: 'Amrit Kaur (Team Lead)',
      reviewedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      reviewerComment: 'Please log the missing 1.5h on Acme SEO audit and specify which tier-1 directories were completed.',
      timeLogs: [
        { id: 'tl-401', taskName: 'Backlink Profile Cleanup & Disavow File Audit', category: 'Off-Page SEO', durationMs: 3.5 * 3600000, notes: 'Filtered 140 toxic linking domains.' },
        { id: 'tl-402', taskName: 'On-Page Meta Tags Optimization Batch 1', category: 'On-Page Optimization', durationMs: 2.0 * 3600000, notes: 'Optimized 30 category landing pages.' }
      ]
    },
    {
      name: 'Anshita',
      roleTitle: 'Executive',
      status: 'pending_review' as const,
      submittedAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
      timeLogs: [
        { id: 'tl-501', taskName: 'High-Intent Keyword Gap Analysis & SERP Intent Audit', category: 'Keyword Strategy', durationMs: 4.0 * 3600000, notes: 'Identified 18 commercial keywords with low KD.' },
        { id: 'tl-502', taskName: 'Content Brief Generation for Nova Retail Q3 Expansion', category: 'Content Strategy', durationMs: 3.5 * 3600000, notes: 'Structured 5 comprehensive 2,500-word content briefs.' }
      ]
    },
    {
      name: 'Sahil Attri',
      roleTitle: 'Executive',
      status: 'pending_review' as const,
      submittedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      timeLogs: [
        { id: 'tl-601', taskName: 'Broken Link & 404 Redirect Audit via Screaming Frog', category: 'Technical SEO', durationMs: 3.5 * 3600000, notes: 'Crawled 8,000 URLs and fixed 38 redirect chains.' },
        { id: 'tl-602', taskName: 'Citation Building & Local Directory Sync for Local Clients', category: 'Local SEO', durationMs: 3.5 * 3600000, notes: 'Synced NAP consistency across 15 priority business listings.' }
      ]
    },
    {
      name: 'Komal',
      roleTitle: 'Executive',
      status: 'pending_review' as const,
      submittedAt: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
      timeLogs: [
        { id: 'tl-701', taskName: 'Competitor Backlink Analysis & Outreach Target Discovery', category: 'Link Building', durationMs: 4.0 * 3600000, notes: 'Qualified 45 outreach domains with DR > 50.' },
        { id: 'tl-702', taskName: 'Guest Post Pitch Drafts & Follow-ups', category: 'Off-Page SEO', durationMs: 3.0 * 3600000, notes: 'Sent 20 personalized editorial outreach emails.' }
      ]
    },
    {
      name: 'Himanshu',
      roleTitle: 'Executive',
      status: 'pending_review' as const,
      submittedAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
      timeLogs: [
        { id: 'tl-801', taskName: 'WordPress Plugin Compatibility & PHP 8.2 Security Patches', category: 'WordPress & Web Dev', durationMs: 4.5 * 3600000, notes: 'Resolved conflict in custom WooCommerce checkout hook.' },
        { id: 'tl-802', taskName: 'Server Response Time (TTFB) Caching Optimization', category: 'Technical SEO', durationMs: 3.0 * 3600000, notes: 'Configured Redis object cache and Cloudflare edge rules.' }
      ]
    }
  ];

  return templateSubmissions.map((sub, idx) => {
    const member = members.find(m => m.name.toLowerCase() === sub.name.toLowerCase()) || {
      id: `mock-member-${idx}`,
      name: sub.name,
      role: sub.roleTitle,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      skills: ['SEO Campaign Execution', 'Technical Audits'],
      weeklyCapacityHours: 35
    };

    const podInfo = getMemberPodInfo(member.name);
    const totalMs = sub.timeLogs.reduce((acc, curr) => acc + curr.durationMs, 0);

    return {
      id: `dsr-${idx}-${sub.name.toLowerCase()}`,
      userId: member.id,
      userName: member.name,
      userAvatar: member.avatar,
      roleTitle: sub.roleTitle,
      roleType: 'EXECUTIVE',
      assignedTeamName: podInfo.podName,
      assignedTeamLead: podInfo.leadName,
      teamColor: podInfo.color,
      skills: (member.skills || ['SEO Execution', 'Client Delivery']) as string[],
      date: todayStr,
      status: sub.status,
      submittedAt: sub.submittedAt,
      reviewedBy: sub.reviewedBy,
      reviewedAt: sub.reviewedAt,
      reviewerComment: sub.reviewerComment,
      totalDurationMs: totalMs,
      timeLogs: sub.timeLogs
    };
  });
}

// ─── Main Component ──────────────────────────────────────────────────────────

export const DSRApprovalQueue: React.FC<DSRApprovalQueueProps> = ({
  members,
  onViewMemberProfile
}) => {
  const [dsrItems, setDsrItems] = useState<ReviewDsrItem[]>(() => generateInitialMockDSRs(members));
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Filters
  const [selectedLeadFilter, setSelectedLeadFilter] = useState<string>('All');
  const [selectedSkillFilter, setSelectedSkillFilter] = useState<string>('All');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'pending_review' | 'approved' | 'revision_requested'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // UI state
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set(['dsr-0-anshum', 'dsr-1-kamakshi chopra']));
  const [revisionModalTarget, setRevisionModalTarget] = useState<ReviewDsrItem | null>(null);
  const [revisionFeedback, setRevisionFeedback] = useState<string>('');
  const [isProcessingAction, setIsProcessingAction] = useState<boolean>(false);

  // ─── Load Live DSR Data from Supabase with Fallback ─────────────────────────
  const loadDsrSubmissions = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const { data, error } = await fetchDsrEntries({ date: selectedDate });
      if (!error && data && data.length > 0) {
        // Map live Supabase entries
        const mapped: ReviewDsrItem[] = await Promise.all(
          data.map(async (row: any) => {
            const member = members.find(m => m.id === row.user_id || m.name === row.profiles?.name) || {
              id: row.user_id,
              name: row.profiles?.name || 'Agency Specialist',
              role: row.profiles?.role_title || 'Executive',
              avatar: row.profiles?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
              skills: ['SEO Execution']
            };
            const podInfo = getMemberPodInfo(member.name);

            // Fetch time logs for this DSR
            const { data: logs } = await fetchTimeLogsForDsr(row.user_id, row.date);
            const timeLogs: ReviewTimeLog[] = (logs || []).map((tl: any) => ({
              id: tl.id,
              taskName: tl.task_name || 'Task',
              category: tl.category || 'General',
              durationMs: Number(tl.duration_ms) || 0,
              notes: tl.notes || undefined,
              source: tl.source || 'local'
            }));

            const totalDuration = timeLogs.reduce((sum, tl) => sum + tl.durationMs, 0);

            return {
              id: row.id,
              userId: row.user_id,
              userName: member.name,
              userAvatar: member.avatar,
              roleTitle: row.profiles?.role_title || member.role || 'Executive',
              roleType: row.profiles?.role_type || 'EXECUTIVE',
              assignedTeamName: podInfo.podName,
              assignedTeamLead: podInfo.leadName,
              teamColor: podInfo.color,
              skills: (member.skills || ['SEO']) as string[],
              date: row.date,
              status: row.status,
              submittedAt: row.submitted_at || new Date().toISOString(),
              reviewedBy: row.reviewed_by ? 'Team Lead' : undefined,
              reviewedAt: row.reviewed_at || undefined,
              reviewerComment: row.reviewer_comment || undefined,
              totalDurationMs: totalDuration,
              timeLogs
            };
          })
        );
        setDsrItems(mapped);
      } else {
        // Fallback to calibrated 23-person mock data
        setDsrItems(generateInitialMockDSRs(members));
      }
    } catch (err) {
      console.warn('Using local fallback for DSR approval queue:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedDate, members]);

  useEffect(() => {
    loadDsrSubmissions();
  }, [loadDsrSubmissions]);

  // ─── Extract dynamic filter options ─────────────────────────────────────────

  const availableLeads = useMemo(() => {
    return [
      'All',
      'Khuvaish (Strategy & SEO)',
      'Amrit Kaur (SEO & Delivery)',
      'Vansh (Web, Tech & Dev)',
      'Vinay Datyal (Operations & Management)',
      'Co-Founders (Executive Leadership)'
    ];
  }, []);

  const availableSkills = useMemo(() => {
    const set = new Set<string>();
    members.forEach(m => {
      (m.skills || []).forEach(s => set.add(typeof s === 'string' ? s : (s as any).skill));
    });
    return ['All', ...Array.from(set).sort()];
  }, [members]);

  // ─── Filtered DSR Items ─────────────────────────────────────────────────────

  const filteredItems = useMemo(() => {
    return dsrItems.filter(item => {
      // 1. Lead / Pod Filter
      if (selectedLeadFilter !== 'All') {
        const leadMatch =
          (selectedLeadFilter.includes('Khuvaish') && item.assignedTeamLead.includes('Khuvaish')) ||
          (selectedLeadFilter.includes('Amrit') && item.assignedTeamLead.includes('Amrit')) ||
          (selectedLeadFilter.includes('Vansh') && item.assignedTeamLead.includes('Vansh')) ||
          (selectedLeadFilter.includes('Vinay') && item.assignedTeamLead.includes('Vinay')) ||
          (selectedLeadFilter.includes('Co-Founders') && item.assignedTeamLead.includes('Co-Founders'));
        if (!leadMatch) return false;
      }

      // 2. Skill Category Filter (Multi-disciplinary flexibility)
      if (selectedSkillFilter !== 'All') {
        const hasSkill = item.skills.some(
          s => s.toLowerCase() === selectedSkillFilter.toLowerCase()
        ) || item.timeLogs.some(
          tl => tl.category.toLowerCase().includes(selectedSkillFilter.toLowerCase())
        );
        if (!hasSkill) return false;
      }

      // 3. Status Filter
      if (selectedStatusFilter !== 'all' && item.status !== selectedStatusFilter) {
        return false;
      }

      // 4. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.userName.toLowerCase().includes(q);
        const matchesRole = item.roleTitle.toLowerCase().includes(q);
        const matchesTask = item.timeLogs.some(tl => tl.taskName.toLowerCase().includes(q));
        if (!matchesName && !matchesRole && !matchesTask) return false;
      }

      return true;
    });
  }, [dsrItems, selectedLeadFilter, selectedSkillFilter, selectedStatusFilter, searchQuery]);

  // ─── Summary Metrics ────────────────────────────────────────────────────────

  const metrics = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let revision = 0;
    let totalMs = 0;

    filteredItems.forEach(item => {
      if (item.status === 'pending_review') pending++;
      else if (item.status === 'approved') approved++;
      else if (item.status === 'revision_requested') revision++;
      totalMs += item.totalDurationMs;
    });

    return {
      total: filteredItems.length,
      pending,
      approved,
      revision,
      totalHours: formatHours(totalMs)
    };
  }, [filteredItems]);

  // ─── Actions ────────────────────────────────────────────────────────────────

  const toggleExpand = (id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleApprove = async (item: ReviewDsrItem) => {
    setIsProcessingAction(true);
    try {
      await approveDsrEntry(item.id, 'lead_reviewer');
      setDsrItems(prev =>
        prev.map(i =>
          i.id === item.id
            ? {
                ...i,
                status: 'approved',
                reviewedBy: 'Team Lead / PM',
                reviewedAt: new Date().toISOString()
              }
            : i
        )
      );
      sonnerToast.success(`DSR Approved for ${item.userName}`, {
        description: `Verified ${formatHours(item.totalDurationMs)} logged across ${item.timeLogs.length} tasks.`
      });
    } catch (err: any) {
      sonnerToast.error(`Approval failed: ${err.message}`);
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleBatchApprovePending = async () => {
    const pendingItems = filteredItems.filter(i => i.status === 'pending_review');
    if (pendingItems.length === 0) {
      sonnerToast.info('No pending DSR submissions to approve in current view.');
      return;
    }

    setIsProcessingAction(true);
    try {
      const ids = pendingItems.map(i => i.id);
      await batchApproveDsrEntries(ids, 'lead_reviewer');
      setDsrItems(prev =>
        prev.map(i =>
          ids.includes(i.id)
            ? {
                ...i,
                status: 'approved',
                reviewedBy: 'Team Lead / PM',
                reviewedAt: new Date().toISOString()
              }
            : i
        )
      );
      sonnerToast.success(`Batch Approved ${pendingItems.length} DSR Submissions! 🎉`, {
        description: 'All submitted task hours verified and synced with cloud.'
      });
    } catch (err: any) {
      sonnerToast.error(`Batch approval failed: ${err.message}`);
    } finally {
      setIsProcessingAction(false);
    }
  };

  const openRevisionModal = (item: ReviewDsrItem) => {
    setRevisionModalTarget(item);
    setRevisionFeedback(item.reviewerComment || '');
  };

  const handleSubmitRevision = async () => {
    if (!revisionModalTarget) return;
    if (!revisionFeedback.trim()) {
      sonnerToast.error('Please specify feedback for the specialist.');
      return;
    }

    setIsProcessingAction(true);
    try {
      await requestDsrRevision(revisionModalTarget.id, 'lead_reviewer', revisionFeedback.trim());
      setDsrItems(prev =>
        prev.map(i =>
          i.id === revisionModalTarget.id
            ? {
                ...i,
                status: 'revision_requested',
                reviewerComment: revisionFeedback.trim(),
                reviewedBy: 'Team Lead',
                reviewedAt: new Date().toISOString()
              }
            : i
        )
      );
      sonnerToast.warning(`Revision requested for ${revisionModalTarget.userName}`, {
        description: `Feedback sent: "${revisionFeedback.trim()}"`
      });
      setRevisionModalTarget(null);
      setRevisionFeedback('');
    } catch (err: any) {
      sonnerToast.error(`Failed to request revision: ${err.message}`);
    } finally {
      setIsProcessingAction(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. HERO CONTROLS & BATCH APPROVAL BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-indigo-500" />
        
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-black uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Agency DSR Approval & Quality Hub</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              Daily Status Report Queue
              <span className="text-xs font-bold bg-slate-800/90 text-slate-300 px-3 py-1 rounded-lg border border-slate-700">
                {selectedDate}
              </span>
            </h2>
            <p className="text-slate-300 text-xs max-w-2xl leading-relaxed">
              Review, verify, and approve daily time logs submitted by agency executives and technical specialists.
              Agency work is fluid—filter by assigned <strong>Pod / Lead</strong> or by <strong>Multi-Disciplinary Skills</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={loadDsrSubmissions}
              disabled={isRefreshing}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
              title="Refresh queue from Supabase"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : 'text-slate-400'}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={handleBatchApprovePending}
              disabled={isProcessingAction || metrics.pending === 0}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-xl shadow-emerald-500/25 hover:scale-105 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <CheckCheck className="w-4 h-4 text-emerald-200" />
              <span>Approve All Pending ({metrics.pending})</span>
            </button>
          </div>
        </div>

        {/* METRIC PILLS */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-5 border-t border-slate-800/80">
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Submissions</div>
            <div className="text-xl font-black text-white mt-0.5">{metrics.total}</div>
          </div>
          <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              <span>Awaiting Review</span>
            </div>
            <div className="text-xl font-black text-amber-300 mt-0.5">{metrics.pending}</div>
          </div>
          <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3" />
              <span>Approved</span>
            </div>
            <div className="text-xl font-black text-emerald-300 mt-0.5">{metrics.approved}</div>
          </div>
          <div className="bg-rose-950/20 border border-rose-500/30 rounded-xl p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3" />
              <span>Needs Revision</span>
            </div>
            <div className="text-xl font-black text-rose-300 mt-0.5">{metrics.revision}</div>
          </div>
          <div className="bg-indigo-950/20 border border-indigo-500/30 rounded-xl p-3 col-span-2 sm:col-span-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
              <TrendingUp className="w-3 h-3" />
              <span>Total Hours</span>
            </div>
            <div className="text-xl font-black text-indigo-200 mt-0.5">{metrics.totalHours}</div>
          </div>
        </div>
      </div>

      {/* 2. DSR FILTER CONTROL BAR */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search member, role, or task keyword..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Pod / Lead Filter */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Lead / Pod:</span>
          <select
            value={selectedLeadFilter}
            onChange={e => setSelectedLeadFilter(e.target.value)}
            className="bg-slate-950/90 border border-slate-700/80 rounded-xl text-xs text-slate-200 px-3 py-2 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            {availableLeads.map(lead => (
              <option key={lead} value={lead}>{lead}</option>
            ))}
          </select>
        </div>

        {/* Skill Category Filter */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Skill Area:</span>
          <select
            value={selectedSkillFilter}
            onChange={e => setSelectedSkillFilter(e.target.value)}
            className="bg-slate-950/90 border border-slate-700/80 rounded-xl text-xs text-slate-200 px-3 py-2 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            {availableSkills.map(skill => (
              <option key={skill} value={skill}>{skill}</option>
            ))}
          </select>
        </div>

        {/* Status Pill Switchers */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-slate-800">
          {(['all', 'pending_review', 'approved', 'revision_requested'] as const).map(st => {
            const labels: Record<string, string> = {
              all: 'All',
              pending_review: '⏳ Pending',
              approved: '✅ Approved',
              revision_requested: '⚠️ Revision'
            };
            const active = selectedStatusFilter === st;
            return (
              <button
                key={st}
                onClick={() => setSelectedStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  active
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                {labels[st]}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. SUBMISSION CARDS LIST */}
      <div className="space-y-4">
        {filteredItems.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">No DSR Submissions Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              There are no submissions matching your selected filter criteria. All pending tasks for this date may already be reviewed.
            </p>
          </div>
        ) : (
          filteredItems.map(item => {
            const isExpanded = expandedCards.has(item.id);
            const isPending = item.status === 'pending_review';
            const isApproved = item.status === 'approved';
            const isRevision = item.status === 'revision_requested';

            return (
              <div
                key={item.id}
                className={`border rounded-2xl transition-all duration-300 overflow-hidden shadow-lg ${
                  isPending
                    ? 'bg-slate-900/90 border-amber-500/40 hover:border-amber-500/70 shadow-amber-950/20'
                    : isApproved
                    ? 'bg-slate-900/60 border-slate-800 hover:border-emerald-500/40'
                    : 'bg-slate-900/90 border-rose-500/40 hover:border-rose-500/70 shadow-rose-950/20'
                }`}
              >
                {/* CARD HEADER */}
                <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  {/* Specialist Identity */}
                  <div className="flex items-center gap-4">
                    <img
                      src={item.userAvatar}
                      alt={item.userName}
                      className="w-12 h-12 rounded-xl object-cover border-2 shadow-md shrink-0"
                      style={{ borderColor: item.teamColor }}
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-extrabold text-white text-base tracking-tight">
                          {item.userName}
                        </span>
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-indigo-300 border border-slate-700">
                          {item.roleTitle}
                        </span>
                        <span
                          className="text-[10px] font-black px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: `${item.teamColor}20`,
                            color: item.teamColor,
                            border: `1px solid ${item.teamColor}40`
                          }}
                        >
                          {item.assignedTeamName} • Lead: {item.assignedTeamLead}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span>Submitted {new Date(item.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span>•</span>
                        <span className="font-bold text-slate-200">
                          {formatHours(item.totalDurationMs)} logged across {item.timeLogs.length} tasks
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge & Actions */}
                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                    {/* Status Badge */}
                    {isPending && (
                      <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5 animate-pulse">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Awaiting Review</span>
                      </span>
                    )}
                    {isApproved && (
                      <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approved</span>
                      </span>
                    )}
                    {isRevision && (
                      <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Needs Revision</span>
                      </span>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      {isPending && (
                        <>
                          <button
                            onClick={() => handleApprove(item)}
                            disabled={isProcessingAction}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-md shadow-emerald-600/30 hover:scale-105 cursor-pointer disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => openRevisionModal(item)}
                            disabled={isProcessingAction}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/50 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Revision</span>
                          </button>
                        </>
                      )}

                      {isApproved && (
                        <button
                          onClick={() => openRevisionModal(item)}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-medium border border-slate-700 transition-all"
                          title="Change review decision"
                        >
                          Modify
                        </button>
                      )}

                      {isRevision && (
                        <button
                          onClick={() => handleApprove(item)}
                          disabled={isProcessingAction}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600/80 hover:bg-emerald-500 text-white text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve Now</span>
                        </button>
                      )}

                      <button
                        onClick={() => toggleExpand(item.id)}
                        className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition-all cursor-pointer"
                        title={isExpanded ? 'Collapse details' : 'Expand task details'}
                      >
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* REVISION COMMENTS BANNER (If Revision Requested) */}
                {isRevision && item.reviewerComment && (
                  <div className="mx-5 mb-4 p-3.5 bg-rose-950/40 border border-rose-500/40 rounded-xl flex items-start gap-3">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-rose-300">
                        Team Lead Feedback sent to {item.userName}:
                      </div>
                      <div className="text-xs text-rose-200/90 italic">
                        "{item.reviewerComment}"
                      </div>
                    </div>
                  </div>
                )}

                {/* EXPANDED TASK DETAILS ACCORDION */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-2 border-t border-slate-800/70 bg-slate-950/40 space-y-3">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <span>Logged Task Activities ({item.timeLogs.length})</span>
                      <span>Category & Duration</span>
                    </div>

                    <div className="space-y-2">
                      {item.timeLogs.map((tl, logIdx) => (
                        <div
                          key={tl.id || logIdx}
                          className="p-3 bg-slate-900/90 border border-slate-800/90 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition-all"
                        >
                          <div className="space-y-1">
                            <div className="text-xs font-bold text-white flex items-center gap-2">
                              <span>{tl.taskName}</span>
                            </div>
                            {tl.notes && (
                              <div className="text-[11px] text-slate-400 pl-2 border-l-2 border-slate-700 italic">
                                {tl.notes}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-lg bg-indigo-950/60 text-indigo-300 border border-indigo-500/30">
                              {tl.category}
                            </span>
                            <span className="text-xs font-mono font-black text-emerald-400 bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                              {formatHours(tl.durationMs)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Member Skills Pills */}
                    <div className="pt-2 flex items-center justify-between flex-wrap gap-2 text-xs">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Core Competencies:</span>
                        {item.skills.map((skill, sIdx) => (
                          <span
                            key={sIdx}
                            className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] border border-slate-700/80"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>

                      {onViewMemberProfile && (
                        <button
                          onClick={() => {
                            const found = members.find(m => m.name === item.userName);
                            if (found) onViewMemberProfile(found);
                          }}
                          className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <span>Open Monthly Matrix Profile</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 4. REVISION REQUEST FEEDBACK MODAL */}
      {revisionModalTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white">Request DSR Revision</h4>
                  <p className="text-[11px] text-slate-400">Specialist: {revisionModalTarget.userName}</p>
                </div>
              </div>
              <button
                onClick={() => setRevisionModalTarget(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-300 block">
                Required Adjustments & Feedback Note:
              </label>
              <textarea
                rows={4}
                value={revisionFeedback}
                onChange={e => setRevisionFeedback(e.target.value)}
                placeholder="e.g. Please log the missing 1.5h on Acme SEO audit and provide notes explaining discrepancy..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
              />

              {/* Quick Suggestion Chips */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Quick Suggestions:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Please log missing hours for Acme client tasks',
                    'Add detailed notes for internal initiative time',
                    'Time duration seems higher than task estimate',
                    'Verify that hours match ClickUp recorded timer'
                  ].map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setRevisionFeedback(chip)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] border border-slate-700 transition-all cursor-pointer"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setRevisionModalTarget(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitRevision}
                disabled={isProcessingAction || !revisionFeedback.trim()}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-lg shadow-rose-600/30 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Revision Request</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
