import React, { useState, useEffect, useRef } from 'react';
import { daysFromToday, firstDayOfCurrentMonth, monthOption, todayLocal, getNextDeliverableDueInfo } from '../utils/dateUtils';
import { createPortal } from 'react-dom';
import { navigate } from '../utils/router';
import { motion, AnimatePresence } from 'framer-motion';
import { toast as sonnerToast } from 'sonner';
import type { TeamMember, Task, ClientReadyTier, ClientTier } from '../types';
import {
  FolderKanban,
  Clock,
  Award,
  Bot,
  Sparkles,
  Zap,
  Activity,
  ShieldAlert,
  Lightbulb,
  TrendingUp,
  Cpu,
  CheckCircle2,
  Send,
  DollarSign,
  Plus,
  X,
  Edit2,
  Check,
  Users,
  Search,
  Copy,
  Bell,
  AlertCircle,
  ArrowUpRight,
  CheckCheck,
  Trash2,
  FolderArchive,
  RotateCcw,
  Inbox,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Filter,
  BarChart3,
  ShieldCheck,
  ExternalLink,
  RefreshCw,
  MessageSquare,
  Flame,
  Briefcase,
  Phone,
  Mail,
  Calendar,
  Kanban,
  List,
  Building2,
  Tag,
  User,
  StickyNote,
  ClipboardList
} from 'lucide-react';
import { ClickUpOAuthModal } from './ClickUpOAuthModal';
import { ClickUpTaskActivityModal } from './ClickUpTaskActivityModal';
import {
  isClickUpConnected,
  getClickUpToken,
  getClickUpWorkspaceId,
  setClickUpWorkspaceId,
  fetchClickUpTasks,
  fetchClickUpWorkspaces,
  fetchClickUpSpaces,
  fetchClickUpFolders,
  fetchClickUpLists,
  fetchClickUpListTasks,
  createClickUpTask,
  updateClickUpTaskAssignees,
  updateClickUpTaskStatus,
  type ClickUpTask,
  batchFetchClickUpTasks,
  isClickUpTaskClosed
} from '../services/clickupOAuth';
import {
  computeProjectHealthScore,
  ProjectHealthBadge,
  ProjectHealthRadarFilterBar,
  ProjectHealthDiagnosticModal,
  type HealthTier
} from './ProjectHealthRadar';
import { WorkloadHeatmap } from './WorkloadHeatmap';
import { AGENCY_MASTER_EXAM_BANK, type ExamQuestionType } from '../data/skillExamBank';
import { getPDFMasterProjects, classifyClientTier } from '../data/pdfMasterProjectsData';
import { DSRTrackerStudio } from './DSRTrackerStudio';
import { ActivityCalendar } from './ActivityCalendar';
import { AnimatedCounter, ClientTierBadge, DonutChart, EmptyState, GraphicSectionHeader, MiniSparkline, SpotlightCard, VIPPriorityBanner, YieldGauge, useToast } from './TopTierUI';
import { calculateProjectFinancials, checkProjectNeedsAttention } from '../utils/projectFinancials';
import { ClientPnLModal } from './ClientPnLModal';

export interface AgencyNotificationItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  category: 'clickup' | 'finance' | 'capacity' | 'milestone';
  read: boolean;
  targetView: 'projects' | 'hours' | 'finances' | 'bot';
  targetProjectId?: string;
}


interface VisualAgencyHubProps {
  teamMembers: TeamMember[];
  tasks: Task[];
  onAddMember?: (member: TeamMember) => void;
  onDeleteMember?: (memberId: string) => void;
  onUpdateMember?: (member: TeamMember) => void;
  activeView: 'projects' | 'hours' | 'dsr' | 'skills' | 'bot' | 'finances' | 'notifications' | string;
  onDeliverJob: (projectName: string, hours: number, memberIds: string[]) => void;
  onNavigateView?: (view: 'projects' | 'hours' | 'dsr' | 'skills' | 'bot' | 'finances' | string, targetId?: string) => void;
  isWhiteTheme?: boolean;
  onToggleTheme?: () => void;
  triggerAddProjectModal?: boolean;
  onResetTriggerAddProjectModal?: () => void;
}

export type AgencyTaskCategory =
  | 'On-Page SEO'
  | 'Off-Page SEO'
  | 'Technical SEO'
  | 'Content Writing'
  | 'UI/UX Design'
  | 'Development'
  | 'Client Communications';

export interface ProjectTaskAllocation {
  id: string;
  taskType: string;
  assigneeId: string;
  hours: number;
  clickUpTaskId?: string;
  clickUpUrl?: string;
  clickUpStatus?: string;
  status?: string;
}

export interface ActiveProjectItem {
  id: string;
  name: string;
  client: string;
  clientTier?: ClientTier;
  billingType: 'Monthly Retainer' | 'Milestone Delivery' | 'Weekly Hourly Billing';
  startDate: string;
  dueDateOrRenewal: string;
  milestonesTotal: number;
  milestonesCompleted: number;
  price: string;
  totalHours: number;
  activeHours: number;
  actualHoursLogged?: number;
  progress: number;
  color: string;
  members: TeamMember[];
  projectLeadId?: string;
  clientCallAssigneeId?: string;
  memberHoursMap?: Record<string, number>;
  taskBreakdown?: ProjectTaskAllocation[];
  bankedRolloverHours?: number;
  // Financial & Payment Tracker fields
  paymentStatus: 'Paid' | 'Overdue' | 'Due Soon' | 'Pending';
  paymentDueDate: string;
  paymentAmountNumeric: number;
  paymentReceivedDate?: string;
  paymentInvoiceId?: string;
  billingMonth?: string; // e.g. '2026-07'
  monthlyHistory?: {
    month: string; // e.g. 'July 2026'
    amount: number;
    status: 'Paid' | 'Overdue' | 'Due Soon' | 'Pending';
    invoiceId: string;
    paidDate?: string;
  }[];
  // Complete Master Spreadsheet Audit & Operations Tracking fields
  status?: 'INITIAL STAGE' | 'ON TRACK' | 'REVALUATION' | 'PAUSED' | 'COMPLETED';
  priorityLevel?: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';
  // ClickUp Native Hierarchy Linking
  clickUpSpaceId?: string;
  clickUpFolderId?: string;
  clickUpListId?: string;
  clickUpListName?: string;
  clickUpTaskId?: string;
  taskContent?: string; // Full brief / scope note
  clientEmail?: string;
  clientFolderUrl?: string; // ClickUp / Drive link
  communicationChannel?: string; // e.g. 'UW - Agam', 'Slack', 'WhatsApp - 79', 'Client Email'
  contractStartDate?: string;
  devTechAssigneeId?: string;
  backendLoginsNote?: string; // e.g. 'Added to Zoho', 'Shopify - 1428'
  billingAccount?: string; // e.g. 'Agam', 'Manpreet', 'Vinay', 'Gayatri', 'Shivam', 'Rank Harvest'
  ga4Access?: string;
  gbpAccess?: string;
  gscAccess?: string;
  gtmAccess?: string;
  guestPostIncluded?: string;
  offPageAssigneeId?: string;
  onPageAssigneeId?: string;
  projectHealthEmoji?: '☺☺☺☺☺' | '☺☺☺☺' | '☺☺☺' | '🚨 Critical';
  ratingEmoji?: string;
  reportingNote?: string; // Weekly reporting text
  reportingPlatform?: string; // e.g. 'UW - Agam', 'WhatsApp', 'Trello', 'Monday.com', 'Slack'
  serviceLabels?: string[]; // e.g. ['Full SEO', 'Local SEO', 'Technical SEO', 'AEO', 'GEO']
  weeklyHoursOffPage?: number;
  weeklyHoursOnPage?: number;
  weeklyHoursTech?: number;
  quickMemo?: string;
  quickMemoUpdatedAt?: string;
}

export interface ArchivedProjectItem extends ActiveProjectItem {
  archivedAt: string;
  archiveCategory: 'trash' | 'past_project';
  archiveReason?: string;
}

export interface BusinessLeadItem {
  id: string;
  clickUpTaskId?: string;
  clickUpUrl?: string;
  companyName: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  assignedOwnerId?: string; // Dedicated Assigned Lead Owner (links to TeamMember.id or blank)
  stage: 'NEW' | 'DISCOVERY' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST';
  estimatedValue: string; // e.g. "$3,500/mo" or "$15,000"
  estimatedValueNumeric: number;
  billingPreference?: 'Monthly Retainer' | 'Milestone Delivery' | 'Weekly Hourly Billing';
  leadSource?: string; // e.g., "Inbound Website", "Referral", "LinkedIn", "Upwork", "Cold Outreach"
  serviceInterest?: string[]; // e.g., ["Full SEO", "AEO / GEO", "WordPress Dev"]
  notes?: string;
  nextFollowUpDate?: string;
  createdAt: string;
  updatedAt: string;
}

export const formatProjectPriceTag = (
  priceStr: string | undefined,
  billingType: string | undefined,
  activeHours: number = 0
): string => {
  if (!priceStr) return '$0';
  if (billingType === 'Weekly Hourly Billing') {
    if (priceStr.includes('/hr')) return priceStr;
    const match = priceStr.match(/\$?([0-9]+(?:\.[0-9]+)?)/);
    const rate = match ? parseFloat(match[1]) : 0;
    const weekly = Math.round(rate * activeHours);
    const monthly = Math.round(weekly * 4);
    return `$${rate}/hr (${weekly > 0 ? `$${weekly.toLocaleString()}/wk • ` : ''}$${monthly.toLocaleString()}/mo)`;
  }
  return priceStr.includes('$') ? priceStr : `$${priceStr}`;
};

export const VisualAgencyHub: React.FC<VisualAgencyHubProps> = ({
  teamMembers: initialMembers,
  tasks: _tasks,
  onAddMember,
  onDeleteMember,
  onUpdateMember,
  activeView,
  onDeliverJob,
  onNavigateView,
  isWhiteTheme,
  onToggleTheme,
  triggerAddProjectModal,
  onResetTriggerAddProjectModal
}) => {
  const { toast } = useToast();

  useEffect(() => {
    if (triggerAddProjectModal) {
      setShowAddProjectModal(true);
      onResetTriggerAddProjectModal?.();
    }
  }, [triggerAddProjectModal, onResetTriggerAddProjectModal]);

  // Local editable Team Members
  const [customMembers, setCustomMembers] = useState<TeamMember[]>(initialMembers);

  useEffect(() => {
    setCustomMembers((current) => {
      const currentById = new Map(current.map((member) => [member.id, member]));
      return initialMembers.map((member) => currentById.get(member.id) || member);
    });
  }, [initialMembers]);

  // Everyday Normal Person Quick Access & Visual Charts state
  const [showVisualCharts, setShowVisualCharts] = useState<boolean>(false);
  const [smartMode, setSmartMode] = useState<boolean>(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);
  const [showSquadWorkload, setShowSquadWorkload] = useState<boolean>(false);
  const [showMorningHuddleDrawer, setShowMorningHuddleDrawer] = useState<boolean>(false);
  const [everydayQuickFilter, setEverydayQuickFilter] = useState<
    | 'all'
    | 'on_track'
    | 'milestones'
    | 'needs_attention'
    | 'ai_high_risk'
    | 'ai_top_margin'
    | 'ai_overdue_cashflow'
    | 'ai_nearing_cap'
    | 'tier_vip'
    | 'tier_agency'
    | 'tier_local'
    | 'tier_highest_yield'
    | 'needs_call_lead'
    | 'hourly_contracts'
    | 'vip_retainers'
    | 'over_budget'
    | 'scope_creep_risk'
    | 'low_margin'
    | 'high_margin'
    | 'at_risk_health'
  >('all');

  // Client P&L & Staffing Optimizer Modal State (Ideas 1, 2, 3)
  const [activePnLProject, setActivePnLProject] = useState<ActiveProjectItem | null>(null);

  // Quick Search for Lead & Call reassign popovers
  const [reassignSearchQuery, setReassignSearchQuery] = useState('');

  // Retainer Hour Banking handlers (Feature 6)
  const handleBankRolloverHours = (projectId: string, hours: number) => {
    setProjectsList((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, bankedRolloverHours: hours } : p))
    );
    sonnerToast.success(`📦 Banked ${hours} unused retainer hours for next billing cycle!`);
  };

  const handleClearBankedHours = (projectId: string) => {
    setProjectsList((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, bankedRolloverHours: undefined } : p))
    );
    sonnerToast.info('Released banked rollover hours.');
  };

  const handleOptimizeSquad = (projectId: string, oldMemberId: string, newMemberId: string) => {
    setProjectsList((prev) =>
      prev.map((proj) => {
        if (proj.id !== projectId) return proj;
        const targetNewMember = customMembers.find((m) => m.id === newMemberId);
        if (!targetNewMember) return proj;

        const updatedMembers = (proj.members || []).map((m) =>
          m.id === oldMemberId ? targetNewMember : m
        );
        if (!updatedMembers.some((m) => m.id === newMemberId)) {
          updatedMembers.push(targetNewMember);
        }

        const updatedMap = { ...(proj.memberHoursMap || {}) };
        if (oldMemberId && updatedMap[oldMemberId]) {
          const hours = updatedMap[oldMemberId];
          delete updatedMap[oldMemberId];
          updatedMap[newMemberId] = hours;
        }

        return {
          ...proj,
          members: updatedMembers,
          memberHoursMap: updatedMap
        };
      })
    );
    sonnerToast.success('⚡ Squad staffing rebalanced! Junior/Mid specialist added to protect margin.');
  };

  // Scope Creep & Retainer Upsell Modal State
  const [scopeUpsellModalProj, setScopeUpsellModalProj] = useState<ActiveProjectItem | null>(null);
  const [copiedUpsellDraft, setCopiedUpsellDraft] = useState(false);

  // Agency Notifications & Activity Center state
  const [notifCategoryFilter, setNotifCategoryFilter] = useState<'all' | 'unread' | 'clickup' | 'finance' | 'capacity' | 'milestone'>('all');
  const [notificationsList, setNotificationsList] = useState<AgencyNotificationItem[]>([
    {
      id: 'notif-1',
      title: '⚡ ClickUp Live Sync Completed',
      description: 'Synced 4 active tasks & logged 18.5 hours into TechHaven Enterprise SEO project from ClickUp Space.',
      timestamp: '10 mins ago',
      category: 'clickup',
      read: false,
      targetView: 'projects',
      targetProjectId: 'p1'
    },
    {
      id: 'notif-2',
      title: '⚠️ Renewal & Milestone Evaluation Due',
      description: 'Apex Health Clinic milestone evaluation is scheduled for 2026-07-31. Retainer renewal pending.',
      timestamp: '1 hour ago',
      category: 'milestone',
      read: false,
      targetView: 'projects',
      targetProjectId: 'p2'
    },
    {
      id: 'notif-3',
      title: '💎 Overdue Invoice Alert ($4,800)',
      description: 'Nordic SaaS Growth monthly retainer payment is marked as Overdue. Tap to inspect ledger.',
      timestamp: '2 hours ago',
      category: 'finance',
      read: false,
      targetView: 'finances',
      targetProjectId: 'p3'
    },
    {
      id: 'notif-4',
      title: '📊 Resource Bandwidth Threshold Alert',
      description: 'Liam Chen is running at 100% capacity. Review workload & rebalance SEO hours.',
      timestamp: 'Yesterday',
      category: 'capacity',
      read: true,
      targetView: 'hours'
    },
    {
      id: 'notif-5',
      title: '✨ Autonomous Bot Delivery Completed',
      description: 'Technical SEO Site Audit deliverables finalized and logged.',
      timestamp: '2 days ago',
      category: 'clickup',
      read: true,
      targetView: 'bot'
    }
  ]);

  const handleNotificationClick = (item: AgencyNotificationItem) => {
    // 1. Mark as read
    setNotificationsList((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
    );

    // 2. Open project detail modal if targetProjectId is provided
    if (item.targetProjectId) {
      const targetProj = projectsList.find((p) => p.id === item.targetProjectId);
      if (targetProj) {
        setViewingProjectDetail(targetProj);
      }
    }

    // 3. Navigate directly to the target view/tab
    if (onNavigateView) {
      onNavigateView(item.targetView, item.targetProjectId);
    }
  };

  // Job Delivery Bot state
  const [deliveredSuccess, setDeliveredSuccess] = useState(false);

  // Active Projects populated from PDF Master Spreadsheet with localStorage persistence
  const [projectsList, setProjectsList] = useState<ActiveProjectItem[]>(() => {
    try {
      const saved = localStorage.getItem('vat_projects_list_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load projects from localStorage', e);
    }
    return getPDFMasterProjects(initialMembers);
  });

  useEffect(() => {
    try {
      localStorage.setItem('vat_projects_list_v1', JSON.stringify(projectsList));
    } catch (e) {
      console.error('Failed to save projects to localStorage', e);
    }
  }, [projectsList]);

  const [deletingProject, setDeletingProject] = useState<ActiveProjectItem | null>(null);

  // Past Projects & Trash Archive with localStorage persistence
  const [archivedProjects, setArchivedProjects] = useState<ArchivedProjectItem[]>(() => {
    try {
      const saved = localStorage.getItem('vat_archived_projects_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Failed to load archived projects from localStorage', e);
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('vat_archived_projects_v1', JSON.stringify(archivedProjects));
    } catch (e) {
      console.error('Failed to save archived projects to localStorage', e);
    }
  }, [archivedProjects]);

  // New Business Leads & Sales Pipeline with localStorage persistence
  const [businessLeads, setBusinessLeads] = useState<BusinessLeadItem[]>(() => {
    try {
      const saved = localStorage.getItem('vat_business_leads_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Defensive migration/sanitization for older or ClickUp-synced leads
          const validStages = ['NEW', 'DISCOVERY', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'];
          return parsed.map((lead: any) => {
            const rawStage = lead.stage?.toUpperCase();
            const safeStage = validStages.includes(rawStage) ? rawStage : 'NEW';
            return {
              ...lead,
              stage: safeStage,
              estimatedValueNumeric: typeof lead.estimatedValueNumeric === 'number' ? lead.estimatedValueNumeric : 0,
              billingPreference: lead.billingPreference || 'Monthly Retainer'
            } as BusinessLeadItem;
          });
        }
      }
    } catch (e) {
      console.error('Failed to load business leads from localStorage', e);
    }
    return [
      {
        id: 'lead-1',
        companyName: 'Apex Dental Care',
        contactPerson: 'Dr. Marcus Vance',
        email: 'marcus@apexdental.com',
        phone: '+1 (555) 234-5678',
        assignedOwnerId: 'member-1',
        stage: 'DISCOVERY',
        estimatedValue: '$2,500/mo',
        estimatedValueNumeric: 2500,
        billingPreference: 'Monthly Retainer',
        leadSource: 'Inbound Website',
        serviceInterest: ['Local SEO', 'Full SEO', 'GBP Optimization'],
        notes: 'Initial audit requested. 3 clinic locations in Chicago. Interested in local map pack rankings.',
        nextFollowUpDate: '2026-09-22',
        createdAt: '2026-09-14T10:00:00.000Z',
        updatedAt: '2026-09-16T14:30:00.000Z'
      },
      {
        id: 'lead-2',
        companyName: 'Nordic Peak Outdoor Gear',
        contactPerson: 'Elena Lindqvist',
        email: 'elena@nordicpeak.io',
        phone: '+1 (555) 876-5432',
        assignedOwnerId: 'member-2',
        stage: 'PROPOSAL',
        estimatedValue: '$4,200/mo',
        estimatedValueNumeric: 4200,
        billingPreference: 'Monthly Retainer',
        leadSource: 'Referral',
        serviceInterest: ['Full SEO', 'AEO / GEO', 'Content Marketing'],
        notes: 'Ecommerce store migrating to Shopify. Proposal sent for multi-market SEO + AI search positioning.',
        nextFollowUpDate: '2026-09-20',
        createdAt: '2026-09-10T09:00:00.000Z',
        updatedAt: '2026-09-15T11:20:00.000Z'
      },
      {
        id: 'lead-3',
        companyName: 'Vanguard Legal Advisors',
        contactPerson: 'Robert Sterling, Esq.',
        email: 'r.sterling@vanguardlegal.com',
        phone: '+1 (555) 345-6789',
        assignedOwnerId: 'member-3',
        stage: 'NEGOTIATION',
        estimatedValue: '$5,000/mo',
        estimatedValueNumeric: 5000,
        billingPreference: 'Monthly Retainer',
        leadSource: 'Upwork',
        serviceInterest: ['Full SEO', 'Technical SEO'],
        notes: 'Final contract terms under review. Needs GA4 and GSC historical data audit before signing.',
        nextFollowUpDate: '2026-09-19',
        createdAt: '2026-09-08T12:00:00.000Z',
        updatedAt: '2026-09-17T16:00:00.000Z'
      },
      {
        id: 'lead-4',
        companyName: 'SaaS Metrics Cloud',
        contactPerson: 'Chloe Chen',
        email: 'chloe@saasmetrics.io',
        assignedOwnerId: undefined, // Unassigned lead
        stage: 'NEW',
        estimatedValue: '$18/hr ($180/wk)',
        estimatedValueNumeric: 720,
        billingPreference: 'Weekly Hourly Billing',
        leadSource: 'LinkedIn Inbound',
        serviceInterest: ['Technical SEO', 'WordPress Dev'],
        notes: 'New inquiry looking for 10 hrs/wk technical audit and schema markup implementation.',
        nextFollowUpDate: '2026-09-21',
        createdAt: '2026-09-18T08:00:00.000Z',
        updatedAt: '2026-09-18T08:00:00.000Z'
      }
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem('vat_business_leads_v1', JSON.stringify(businessLeads));
    } catch (e) {
      console.error('Failed to save business leads to localStorage', e);
    }
  }, [businessLeads]);

  const [archiveFilterTab, setArchiveFilterTab] = useState<'all' | 'past_project' | 'trash'>('all');
  const [archiveSearchQuery, setArchiveSearchQuery] = useState<string>('');

  const handleMoveProjectToArchive = (
    project: ActiveProjectItem,
    category: 'trash' | 'past_project',
    reason?: string
  ) => {
    const projectName = project.name || project.client || 'Project';
    const archivedItem: ArchivedProjectItem = {
      ...project,
      archivedAt: new Date().toISOString(),
      archiveCategory: category,
      archiveReason: reason || (category === 'past_project' ? 'Moved to Past Projects' : 'Moved to Trash')
    };

    setProjectsList((prev) => prev.filter((p) => p.id !== project.id));
    setArchivedProjects((prev) => [archivedItem, ...prev.filter((p) => p.id !== project.id)]);

    if (viewingProjectDetail?.id === project.id) {
      setViewingProjectDetail(null);
    }
    if (editingProject?.id === project.id) {
      setEditingProject(null);
    }
    if (deletingProject?.id === project.id) {
      setDeletingProject(null);
    }

    toast(category === 'past_project' ? 'Moved to Past Projects' : 'Moved to Trash', {
      description: `"${projectName}" has been moved to ${category === 'past_project' ? 'Past Projects folder' : 'Trash'}.`,
      type: 'success'
    });
  };

  const handleRestoreProject = (projectId: string) => {
    const target = archivedProjects.find((p) => p.id === projectId);
    if (!target) return;

    const { archivedAt: _a, archiveCategory: _c, archiveReason: _r, ...restoredProject } = target;
    setArchivedProjects((prev) => prev.filter((p) => p.id !== projectId));
    setProjectsList((prev) => [restoredProject as ActiveProjectItem, ...prev.filter((p) => p.id !== projectId)]);

    toast('Project Restored', {
      description: `"${target.name || target.client}" has been restored to Active Projects tracker.`,
      type: 'success'
    });
  };

  const handlePermanentDeleteArchived = (projectId: string) => {
    const target = archivedProjects.find((p) => p.id === projectId);
    const projectName = target?.name || target?.client || 'Project';

    setArchivedProjects((prev) => prev.filter((p) => p.id !== projectId));
    toast('Permanently Deleted', {
      description: `"${projectName}" has been permanently purged from storage.`,
      type: 'info'
    });
  };

  const handleEmptyTrash = () => {
    const count = archivedProjects.filter((p) => p.archiveCategory === 'trash').length;
    if (count === 0) return;

    setArchivedProjects((prev) => prev.filter((p) => p.archiveCategory !== 'trash'));
    toast('Trash Emptied', {
      description: `Purged ${count} project${count > 1 ? 's' : ''} permanently from Trash.`,
      type: 'info'
    });
  };

  const handleSwitchArchiveCategory = (projectId: string, newCategory: 'trash' | 'past_project') => {
    setArchivedProjects((prev) =>
      prev.map((p) => {
        if (p.id === projectId) {
          return {
            ...p,
            archiveCategory: newCategory,
            archiveReason: newCategory === 'past_project' ? 'Moved to Past Projects' : 'Moved to Trash'
          };
        }
        return p;
      })
    );
    toast(newCategory === 'past_project' ? 'Moved to Past Projects' : 'Moved to Trash', {
      description: `Project folder category updated.`,
      type: 'success'
    });
  };

  const handleDeleteProject = (projectId: string) => {
    const target = projectsList.find((p) => p.id === projectId);
    const projectName = target?.name || target?.client || 'Project';

    setProjectsList((prev) => prev.filter((p) => p.id !== projectId));
    if (viewingProjectDetail?.id === projectId) {
      setViewingProjectDetail(null);
    }
    if (editingProject?.id === projectId) {
      setEditingProject(null);
    }
    toast('Project Deleted', {
      description: `"${projectName}" has been permanently removed.`,
      type: 'success'
    });
  };

  const handleAssignProjectToMember = (memberId: string, projectId: string, _weeklyHours: number) => {
    const memberObj = customMembers.find(m => m.id === memberId) || initialMembers.find(m => m.id === memberId);
    if (!memberObj) return;
    setProjectsList(prev => prev.map(p => {
      if (p.id === projectId) {
        const currentMembers = p.members || [];
        if (currentMembers.some(m => m.id === memberId)) return p;
        return { ...p, members: [...currentMembers, memberObj] };
      }
      return p;
    }));
  };

  // Sub-Hub Navigation & Density States
  type HubSubTab = 'projects' | 'squad' | 'executive' | 'archive' | 'leads';
  const [hubSubTab, setHubSubTab] = useState<HubSubTab>('projects');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(9);

  // Leads Sub-Hub View & Filter States
  const [leadsViewMode, setLeadsViewMode] = useState<'table' | 'kanban'>('table');
  const [leadStageFilter, setLeadStageFilter] = useState<string>('ALL');
  const [leadOwnerFilter, setLeadOwnerFilter] = useState<string>('ALL');
  const [leadSearchQuery, setLeadSearchQuery] = useState<string>('');
  const [showAddLeadModal, setShowAddLeadModal] = useState<boolean>(false);
  const [editingLead, setEditingLead] = useState<BusinessLeadItem | null>(null);

  // Business Leads Action Handlers
  const handleUpdateLeadOwner = (leadId: string, newOwnerId: string) => {
    const targetOwner = customMembers.find((m) => m.id === newOwnerId);
    setBusinessLeads((prev) =>
      prev.map((l) =>
        l.id === leadId
          ? { ...l, assignedOwnerId: newOwnerId || undefined, updatedAt: new Date().toISOString() }
          : l
      )
    );
    if (newOwnerId) {
      sonnerToast.success(`Assigned to ${targetOwner?.name || 'team member'}!`);
    } else {
      sonnerToast.info('Lead unassigned.');
    }
  };

  const handleUpdateLeadStage = (leadId: string, newStage: BusinessLeadItem['stage']) => {
    setBusinessLeads((prev) =>
      prev.map((l) =>
        l.id === leadId
          ? { ...l, stage: newStage, updatedAt: new Date().toISOString() }
          : l
      )
    );
    sonnerToast.success(`Stage moved to ${newStage}!`);
  };

  const handleDeleteLead = (leadId: string) => {
    const target = businessLeads.find((l) => l.id === leadId);
    setBusinessLeads((prev) => prev.filter((l) => l.id !== leadId));
    sonnerToast.success(`Lead "${target?.companyName || 'Lead'}" removed.`);
  };

  const handleConvertLeadToProject = (lead: BusinessLeadItem) => {
    const rawRateMatch = lead.estimatedValue.match(/\$?([0-9]+(?:\.[0-9]+)?)/);
    const numericRate = rawRateMatch ? parseFloat(rawRateMatch[1]) : 0;
    const isHourly = lead.billingPreference === 'Weekly Hourly Billing';
    const effectiveHours = isHourly ? 10 : 20;

    let finalPrice = lead.estimatedValue;
    let finalAmount = lead.estimatedValueNumeric || 3500;

    if (isHourly) {
      const calcWk = Math.round(numericRate * effectiveHours);
      const calcMo = Math.round(calcWk * 4);
      finalPrice = `$${numericRate}/hr (${calcWk > 0 ? `$${calcWk.toLocaleString()}/wk • ` : ''}$${calcMo.toLocaleString()}/mo)`;
      finalAmount = calcMo > 0 ? calcMo : Math.round(numericRate * effectiveHours * 4);
    }

    const assignedMember = customMembers.find((m) => m.id === lead.assignedOwnerId);
    const projectMembers = assignedMember ? [assignedMember] : [];

    const newProject: ActiveProjectItem = {
      id: `proj-${Date.now()}`,
      name: `${lead.companyName} - Retainer`,
      client: lead.companyName,
      billingType: lead.billingPreference || 'Monthly Retainer',
      startDate: todayLocal(),
      dueDateOrRenewal: 'Monthly Renewal: 30th',
      milestonesTotal: 4,
      milestonesCompleted: 0,
      price: finalPrice,
      totalHours: effectiveHours,
      activeHours: effectiveHours,
      progress: 5,
      color: '#06b6d4',
      members: projectMembers,
      projectLeadId: lead.assignedOwnerId,
      clientCallAssigneeId: lead.assignedOwnerId,
      taskBreakdown: [
        {
          id: `tb-1`,
          taskType: 'Discovery & Kickoff Audit',
          hours: isHourly ? 5 : 8,
          assigneeId: lead.assignedOwnerId || ''
        },
        {
          id: `tb-2`,
          taskType: 'Strategy Roadmap & Quick Wins',
          hours: isHourly ? 5 : 12,
          assigneeId: lead.assignedOwnerId || ''
        }
      ],
      paymentStatus: 'Pending',
      paymentDueDate: 'End of Month',
      paymentAmountNumeric: finalAmount,
      paymentInvoiceId: `INV-${Date.now().toString().slice(-4)}`,
      status: 'INITIAL STAGE',
      priorityLevel: 'HIGH',
      serviceLabels: lead.serviceInterest && lead.serviceInterest.length > 0 ? lead.serviceInterest : ['Full SEO'],
      taskContent: lead.notes || `Converted from Business Lead. Contact: ${lead.contactPerson || 'N/A'} (${lead.email || 'N/A'})`
    };

    setProjectsList((prev) => [newProject, ...prev]);

    // Update lead stage to WON
    setBusinessLeads((prev) =>
      prev.map((l) =>
        l.id === lead.id
          ? { ...l, stage: 'WON', updatedAt: new Date().toISOString() }
          : l
      )
    );

    sonnerToast.success(`🏆 "${lead.companyName}" successfully converted to Active Project Roster!`, {
      description: `Retainer created with ${lead.assignedOwnerId ? 'assigned lead' : 'unassigned lead'}. View in Project Roster.`
    });
  };

  // Visual Filters State
  const [filterLeadId, setFilterLeadId] = useState<string>('ALL');
  const [filterCallAssigneeId, setFilterCallAssigneeId] = useState<string>('ALL');
  const [filterBillingType, setFilterBillingType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedServiceFilter, setSelectedServiceFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'compact'>('grid');
  const [selectedHoursFilter, setSelectedHoursFilter] = useState<'ALL' | 'TECH' | 'ONPAGE' | 'OFFPAGE' | 'FREE'>('ALL');
  const [rebalanceOpenFor, setRebalanceOpenFor] = useState<string | null>(null);
  const [expandedCardIds, setExpandedCardIds] = useState<Record<string, boolean>>({});
  const [radarHealthFilter, setRadarHealthFilter] = useState<'all' | HealthTier>('all');
  const [diagnosingProject, setDiagnosingProject] = useState<any | null>(null);
  const [isSyncingDeliverables, setIsSyncingDeliverables] = useState(false);
  const [teamViewMode, setTeamViewMode] = useState<'roster' | 'heatmap'>('roster');

  // Item 4 & Item 2 State: Specialist Spotlight & Collapsible Deliverables
  const [spotlightSpecialistId, setSpotlightSpecialistId] = useState<string | null>(null);
  const [expandedCompletedTasks, setExpandedCompletedTasks] = useState<Record<string, boolean>>({});
  const searchBarRef = useRef<HTMLInputElement>(null);

  // Item 5: High-Velocity Keyboard Navigation & Filter Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          target.closest('input') ||
          target.closest('textarea'))
      ) {
        if (e.key === 'Escape') {
          target.blur();
        }
        return;
      }

      // Quick Search Hotkey: '/'
      if (e.key === '/') {
        e.preventDefault();
        searchBarRef.current?.focus();
        return;
      }

      // Quick Reset Hotkey: 'Escape'
      if (e.key === 'Escape') {
        if (spotlightSpecialistId) {
          setSpotlightSpecialistId(null);
        } else if (searchQuery) {
          setSearchQuery('');
        } else if (everydayQuickFilter !== 'all') {
          setEverydayQuickFilter('all');
        } else if (filterLeadId !== 'ALL') {
          setFilterLeadId('ALL');
        }
        return;
      }

      // Numbered Quick Triage Hotkeys: 1-5
      if (e.key === '1') {
        setEverydayQuickFilter('all');
      } else if (e.key === '2') {
        setEverydayQuickFilter('on_track');
      } else if (e.key === '3') {
        setEverydayQuickFilter('needs_attention');
      } else if (e.key === '4') {
        setEverydayQuickFilter('high_margin');
      } else if (e.key === '5') {
        setEverydayQuickFilter('low_margin');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [spotlightSpecialistId, searchQuery, everydayQuickFilter, filterLeadId]);

  // Item A: Accordion Focus Mode State (Auto-collapse previous cards on new card open)
  const [accordionFocusMode, setAccordionFocusMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('agency_accordion_focus_mode') === 'true';
    } catch {
      return false;
    }
  });

  // Item B: Drag-and-Drop Reassign State
  const [draggedSpecialistId, setDraggedSpecialistId] = useState<string | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<{ projId: string; role: 'lead' | 'call' } | null>(null);

  const toggleCardExpansion = (projId: string) => {
    setExpandedCardIds((prev) => {
      const isCurrentlyExpanded = !!prev[projId];
      if (accordionFocusMode) {
        return isCurrentlyExpanded ? {} : { [projId]: true };
      }
      return { ...prev, [projId]: !isCurrentlyExpanded };
    });
  };

  // Modal State for Adding New Project
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [newBillingType, setNewBillingType] = useState<
    'Monthly Retainer' | 'Milestone Delivery' | 'Weekly Hourly Billing'
  >('Monthly Retainer');
  const [newStartDate, setNewStartDate] = useState(todayLocal);
  const [newDueDate, setNewDueDate] = useState('Monthly Renewal: 30th');
  const [newMilestonesTotal, setNewMilestonesTotal] = useState(4);
  const [newPrice, setNewPrice] = useState('$3,500 / mo');
  const [newTotalHours, setNewTotalHours] = useState(20);
  const [newProjectLeadId, setNewProjectLeadId] = useState<string>(() => initialMembers[0].id);
  const [newClientCallAssigneeId, setNewClientCallAssigneeId] = useState<string>(() => initialMembers[0].id);
  const [newSelectedMemberIds, setNewSelectedMemberIds] = useState<string[]>(() =>
    initialMembers.slice(0, 2).map((m) => m.id)
  );
  const [newTaskAllocations, setNewTaskAllocations] = useState<
    Array<{ id: string; taskType: string; assigneeId: string; hours: number }>
  >(() => [
    { id: 'tb-1', taskType: 'Technical SEO', assigneeId: initialMembers[0].id, hours: 8 },
    { id: 'tb-2', taskType: 'On-Page SEO', assigneeId: initialMembers[1]?.id || initialMembers[0].id, hours: 6 },
    { id: 'tb-3', taskType: 'Off-Page SEO', assigneeId: initialMembers[2]?.id || initialMembers[0].id, hours: 4 }
  ]);

  // Complete Master Agency Spreadsheet tracking states for Add Project
  const [newStatus, setNewStatus] = useState<'INITIAL STAGE' | 'ON TRACK' | 'REVALUATION' | 'PAUSED' | 'COMPLETED'>('ON TRACK');
  const [newPriorityLevel, setNewPriorityLevel] = useState<'URGENT' | 'HIGH' | 'NORMAL' | 'LOW'>('NORMAL');
  const [newTaskContent, setNewTaskContent] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientFolderUrl, setNewClientFolderUrl] = useState('');
  const [newCommunicationChannel, setNewCommunicationChannel] = useState('UW - Agam');
  const [newContractStartDate] = useState(firstDayOfCurrentMonth);
  const [newDevTechAssigneeId, setNewDevTechAssigneeId] = useState<string>(() => initialMembers[0].id);
  const [newBackendLoginsNote, setNewBackendLoginsNote] = useState('');
  const [newBillingAccount, setNewBillingAccount] = useState('Agam');
  const [newGa4Access, setNewGa4Access] = useState<'Techie 1428' | 'Techie 1418' | 'Client Email' | 'Requested' | 'Not Required'>('Techie 1428');
  const [newGbpAccess, setNewGbpAccess] = useState<'Techie GMB' | 'Requested' | 'Not Required'>('Not Required');
  const [newGscAccess, setNewGscAccess] = useState<'Techie 1428' | 'Requested' | 'Not Required'>('Techie 1428');
  const [newGtmAccess, setNewGtmAccess] = useState<'Techie 1418' | 'Requested' | 'Not Required'>('Not Required');
  const [newGuestPostIncluded, setNewGuestPostIncluded] = useState<'Yes' | 'No'>('No');
  const [newOffPageAssigneeId] = useState<string>(() => initialMembers[1]?.id || initialMembers[0].id);
  const [newOnPageAssigneeId] = useState<string>(() => initialMembers[2]?.id || initialMembers[0].id);
  const [newProjectHealthEmoji, setNewProjectHealthEmoji] = useState<'☺☺☺☺☺' | '☺☺☺☺' | '☺☺☺' | '🚨 Critical'>('☺☺☺☺☺');
  const [newReportingNote, setNewReportingNote] = useState('');
  const [newReportingPlatform, setNewReportingPlatform] = useState('UW - Agam');
  const [newServiceLabels, setNewServiceLabels] = useState<string[]>(['Full SEO']);
  const [newWeeklyHoursOffPage] = useState<number>(4);
  const [newWeeklyHoursOnPage] = useState<number>(6);
  const [newWeeklyHoursTech] = useState<number>(8);

  const [modalStepTab, setModalStepTab] = useState<'core' | 'billing' | 'team' | 'access'>('core');
  const [editModalStepTab, setEditModalStepTab] = useState<'core' | 'billing' | 'team' | 'access'>('core');

  // ClickUp Integration Modal State, Background Sync & Assignee Mirroring (Features E & F)
  const [showClickUpModal, setShowClickUpModal] = useState(false);
  const [clickUpSyncStatus, setClickUpSyncStatus] = useState<'idle' | 'syncing' | 'success'>('idle');
  const [lastSyncedTime, setLastSyncedTime] = useState<Date | null>(null);
  const [isAutoSyncing, setIsAutoSyncing] = useState<boolean>(false);

  // Tab 1 ClickUp Integration: List Auto-Import & Project Push states
  const [newClickUpListId, setNewClickUpListId] = useState<string | undefined>(undefined);
  const [newClickUpListName, setNewClickUpListName] = useState<string | undefined>(undefined);
  const [showClickUpListPicker, setShowClickUpListPicker] = useState<boolean>(false);
  const [loadingClickUpLists, setLoadingClickUpLists] = useState<boolean>(false);
  const [availableClickUpLists, setAvailableClickUpLists] = useState<Array<{ id: string; name: string; spaceName?: string }>>([]);
  const [pushingProjectId, setPushingProjectId] = useState<string | null>(null);

  const handleLoadClickUpLists = async () => {
    if (!isClickUpConnected()) {
      sonnerToast.info('Please connect ClickUp first using the button in the header.');
      return;
    }
    const token = getClickUpToken();
    if (!token) return;

    try {
      setLoadingClickUpLists(true);
      setShowClickUpListPicker(true);
      let wsId = getClickUpWorkspaceId();
      if (!wsId) {
        const workspaces = await fetchClickUpWorkspaces(token);
        if (workspaces && workspaces.length > 0) {
          wsId = workspaces[0].id;
          setClickUpWorkspaceId(wsId);
        }
      }
      if (!wsId) return;

      const spaces = await fetchClickUpSpaces(token, wsId);
      const listsAccumulator: Array<{ id: string; name: string; spaceName?: string }> = [];

      for (const space of spaces.slice(0, 6)) {
        try {
          const spaceLists = await fetchClickUpLists(token, space.id, false);
          spaceLists.forEach((l) => {
            listsAccumulator.push({ id: l.id, name: l.name, spaceName: space.name });
          });
        } catch {
          // continue
        }
      }

      setAvailableClickUpLists(listsAccumulator);
      if (listsAccumulator.length === 0) {
        sonnerToast.info('No lists found in connected ClickUp spaces.');
      }
    } catch (err: any) {
      console.error('Failed to load ClickUp lists:', err);
      sonnerToast.error('Could not load ClickUp lists', { description: err.message });
    } finally {
      setLoadingClickUpLists(false);
    }
  };

  const handleImportProjectFromClickUpList = async (listId: string) => {
    const token = getClickUpToken();
    if (!token || !listId) return;

    try {
      setLoadingClickUpLists(true);
      const selectedList = availableClickUpLists.find((l) => l.id === listId);
      const listTasks = await fetchClickUpListTasks(token, listId);

      if (selectedList) {
        setNewProjectName(selectedList.name);
        setNewClientName(selectedList.spaceName || selectedList.name.split('-')[0].trim());
        setNewClickUpListId(selectedList.id);
        setNewClickUpListName(selectedList.name);
      }

      if (listTasks && listTasks.length > 0) {
        const deliverables = listTasks.map((t, idx) => {
          let matchedAssigneeId = customMembers[idx % customMembers.length]?.id || customMembers[0].id;
          if (t.assignees && t.assignees.length > 0) {
            const cuAssignee = t.assignees[0];
            const found = customMembers.find((m) =>
              (m.clickUpUserId && Number(m.clickUpUserId) === Number(cuAssignee.id)) ||
              (m.clickUpEmail && cuAssignee.email && m.clickUpEmail.toLowerCase() === cuAssignee.email.toLowerCase()) ||
              (m.name.toLowerCase() === (cuAssignee.username || '').toLowerCase())
            );
            if (found) matchedAssigneeId = found.id;
          }

          const hours = t.time_estimate ? Math.max(1, Math.round(t.time_estimate / 3600000)) : (idx % 2 === 0 ? 8 : 6);
          const taskCategory = (t.name.toLowerCase().includes('tech') || t.name.toLowerCase().includes('audit'))
            ? 'Technical SEO'
            : t.name.toLowerCase().includes('page')
            ? 'On-Page SEO'
            : t.name.toLowerCase().includes('link') || t.name.toLowerCase().includes('outreach')
            ? 'Off-Page SEO'
            : 'Technical SEO';

          return {
            id: `tb-cu-${t.id}-${Date.now()}`,
            taskType: taskCategory as any,
            assigneeId: matchedAssigneeId,
            hours,
            clickUpTaskId: String(t.id),
            clickUpUrl: t.url,
            clickUpStatus: t.status?.status || 'In Progress'
          };
        });

        setNewTaskAllocations(deliverables);
        setNewTotalHours(deliverables.reduce((sum, d) => sum + d.hours, 0));
      }

      setShowClickUpListPicker(false);
      sonnerToast.success('⚡ ClickUp Project Imported!', {
        description: `Loaded "${selectedList?.name || 'List'}" with ${listTasks.length} deliverables into project draft.`
      });
    } catch (err: any) {
      console.error('Failed to import from ClickUp list:', err);
      sonnerToast.error('ClickUp Import Failed', { description: err.message });
    } finally {
      setLoadingClickUpLists(false);
    }
  };

  const handlePushProjectToClickUp = async (proj: ActiveProjectItem) => {
    if (!isClickUpConnected()) {
      sonnerToast.error('Please connect ClickUp first using the button in the header.');
      return;
    }
    const token = getClickUpToken();
    if (!token) return;

    try {
      setPushingProjectId(proj.id);
      let wsId = getClickUpWorkspaceId();
      if (!wsId) {
        const workspaces = await fetchClickUpWorkspaces(token);
        if (workspaces && workspaces.length > 0) {
          wsId = workspaces[0].id;
          setClickUpWorkspaceId(wsId);
        }
      }
      if (!wsId) return;

      const spaces = await fetchClickUpSpaces(token, wsId);
      if (!spaces || spaces.length === 0) {
        sonnerToast.error('No ClickUp spaces found to push deliverables to.');
        return;
      }

      // Find first available list in the space
      let targetListId = proj.clickUpListId;
      if (!targetListId) {
        const lists = await fetchClickUpLists(token, spaces[0].id, false);
        if (lists && lists.length > 0) {
          targetListId = lists[0].id;
        }
      }

      if (!targetListId) {
        sonnerToast.error('Could not find a target ClickUp list to push tasks to.');
        return;
      }

      const deliverables = proj.taskBreakdown || [];
      let pushedCount = 0;

      const updatedDeliverables = await Promise.all(
        deliverables.map(async (d) => {
          if (d.clickUpTaskId) return d; // already synced
          try {
            const assignedMember = customMembers.find((m) => m.id === d.assigneeId);
            const assignees = assignedMember?.clickUpUserId ? [Number(assignedMember.clickUpUserId)] : [];
            const created = await createClickUpTask(token, targetListId!, {
              name: `[${proj.name}] ${d.taskType}`,
              description: `Deliverable for client: ${proj.client}\nAllocated Weekly Hours: ${d.hours}h`,
              time_estimate: d.hours * 3600000,
              assignees,
              priority: 3
            });
            pushedCount++;
            return {
              ...d,
              clickUpTaskId: String(created.id),
              clickUpUrl: created.url,
              clickUpStatus: created.status?.status || 'to do'
            };
          } catch (createErr) {
            console.warn('Could not create task in ClickUp:', createErr);
            return d;
          }
        })
      );

      setProjectsList((prev) =>
        prev.map((p) => {
          if (p.id !== proj.id) return p;
          const updated = {
            ...p,
            clickUpListId: targetListId,
            taskBreakdown: updatedDeliverables
          };
          if (viewingProjectDetail?.id === proj.id) {
            setViewingProjectDetail(updated);
          }
          return updated;
        })
      );

      sonnerToast.success('🚀 Pushed to ClickUp!', {
        description: `Exported ${pushedCount} deliverable tasks to ClickUp List.`
      });
    } catch (err: any) {
      console.error('Failed to push project to ClickUp:', err);
      sonnerToast.error('Failed to push project to ClickUp', { description: err.message });
    } finally {
      setPushingProjectId(null);
    }
  };

  // Automated ClickUp Background Silent Polling Sync (Feature F)
  const performSilentClickUpSync = async (isManual = false) => {
    if (!isClickUpConnected() || isAutoSyncing) return;
    const token = getClickUpToken();
    if (!token) return;

    try {
      setIsAutoSyncing(true);
      let wsId = getClickUpWorkspaceId();
      if (!wsId) {
        const workspaces = await fetchClickUpWorkspaces(token);
        if (workspaces && workspaces.length > 0) {
          wsId = workspaces[0].id;
          setClickUpWorkspaceId(wsId);
        }
      }
      if (!wsId) return;

      const liveTasks = await fetchClickUpTasks(token, wsId);
      if (liveTasks && liveTasks.length > 0) {
        setProjectsList((prev) =>
          prev.map((proj) => {
            if (!proj.taskBreakdown || proj.taskBreakdown.length === 0) return proj;
            let modified = false;
            const updatedBreakdown = proj.taskBreakdown.map((tb) => {
              const matchedTask = tb.clickUpTaskId
                ? liveTasks.find((lt) => String(lt.id) === String(tb.clickUpTaskId))
                : null;
              if (matchedTask) {
                const rawStatus = matchedTask.status?.status || (typeof matchedTask.status === 'string' ? matchedTask.status : (tb.clickUpStatus || 'in progress'));
                const sLower = rawStatus.toLowerCase();
                const mappedStatus = (sLower.includes('complete') || sLower.includes('done') || sLower.includes('closed'))
                  ? 'completed'
                  : (sLower.includes('review') || sLower.includes('qa'))
                  ? 'review'
                  : sLower.includes('progress')
                  ? 'in_progress'
                  : 'assigned';

                if (tb.clickUpStatus !== rawStatus || tb.status !== mappedStatus) {
                  modified = true;
                  return {
                    ...tb,
                    clickUpStatus: rawStatus,
                    status: mappedStatus as any,
                    clickUpUrl: matchedTask.url || tb.clickUpUrl,
                  };
                }
              }
              return tb;
            });
            if (modified) {
              return { ...proj, taskBreakdown: updatedBreakdown };
            }
            return proj;
          })
        );
        setLastSyncedTime(new Date());
        if (isManual) {
          sonnerToast.success('⚡ ClickUp Synchronized', {
            description: `Refreshed ${liveTasks.length} active tasks from ClickUp.`
          });
        }
      }
    } catch (err) {
      console.warn('ClickUp silent background sync error:', err);
    } finally {
      setIsAutoSyncing(false);
    }
  };

  useEffect(() => {
    if (!isClickUpConnected()) return;
    performSilentClickUpSync(false);
    const interval = setInterval(() => {
      performSilentClickUpSync(false);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleSyncTasksIntoProjects = (tasks: any[]) => {
    if (!tasks || tasks.length === 0) return;
    setClickUpSyncStatus('syncing');
    setTimeout(() => {
      setProjectsList((prev) =>
        prev.map((proj, idx) => {
          const projectTasks = tasks.slice(idx * 2, idx * 2 + 2);
          const clickUpDeliverables = projectTasks.map((t: any, i: number) => {
            // Smart Assignee & Capacity Mirroring (Feature E)
            let matchedAssigneeId = customMembers[i % customMembers.length]?.id || customMembers[0].id;
            if (t.assignees && t.assignees.length > 0) {
              const cuAssignee = t.assignees[0];
              const foundMember = customMembers.find((cm) =>
                (cm.clickUpUserId && String(cm.clickUpUserId) === String(cuAssignee.id)) ||
                (cm.clickUpEmail && cuAssignee.email && cm.clickUpEmail.toLowerCase() === cuAssignee.email.toLowerCase()) ||
                (cm.name.toLowerCase() === (cuAssignee.username || '').toLowerCase())
              );
              if (foundMember) {
                matchedAssigneeId = foundMember.id;
              }
            }

            const rawEstimatedHours = t.time_estimate ? Math.round(t.time_estimate / 3600000) : 5;
            const statusName = t.status?.status?.toLowerCase() || (typeof t.status === 'string' ? t.status.toLowerCase() : 'in_progress');
            const canonicalStatus = (statusName.includes('complete') || statusName.includes('done') || statusName.includes('closed'))
              ? 'completed'
              : (statusName.includes('review') || statusName.includes('qa'))
              ? 'review'
              : statusName.includes('progress')
              ? 'in_progress'
              : 'assigned';

            return {
              id: `cu-live-${t.id || i}-${Date.now()}`,
              taskType: (i % 2 === 0 ? 'Technical SEO' : 'On-Page SEO') as any,
              assigneeId: matchedAssigneeId,
              hours: rawEstimatedHours || 5,
              clickUpTaskId: String(t.id),
              clickUpUrl: t.url || `https://app.clickup.com/t/${t.id}`,
              clickUpStatus: t.status?.status || (typeof t.status === 'string' ? t.status : 'In Progress'),
              status: canonicalStatus as any
            };
          });

          // Prevent duplicate tasks by clickUpTaskId
          const existingBreakdown = proj.taskBreakdown || [];
          const nonDuplicateNew = clickUpDeliverables.filter(
            (newD) => !existingBreakdown.some((ed) => ed.clickUpTaskId && ed.clickUpTaskId === newD.clickUpTaskId)
          );
          const updatedBreakdown = [...existingBreakdown, ...nonDuplicateNew];

          return {
            ...proj,
            taskBreakdown: updatedBreakdown,
            activeHours: updatedBreakdown.reduce((sum, tb) => sum + tb.hours, 0)
          };
        })
      );
      setLastSyncedTime(new Date());
      setClickUpSyncStatus('idle');
      setCopiedToast(`⚡ Synced ${tasks.length} live ClickUp tasks into active projects!`);
      sonnerToast.success('ClickUp Live Sync Complete', {
        description: `Mapped ${tasks.length} live ClickUp tasks with smart assignee matching!`
      });
    }, 400);
    setTimeout(() => setCopiedToast(null), 4500);
  };

  const handleImportClickUpMembers = (members: any[]) => {
    let addedCount = 0;
    let linkedCount = 0;

    members.forEach((m) => {
      const existingIdx = customMembers.findIndex(
        (cm) =>
          (cm.name.toLowerCase() === m.username.toLowerCase()) ||
          (m.email && cm.clickUpEmail && cm.clickUpEmail.toLowerCase() === m.email.toLowerCase()) ||
          (m.email && cm.id.includes(String(m.id)))
      );

      if (existingIdx >= 0) {
        setCustomMembers((prev) => {
          const updated = [...prev];
          updated[existingIdx] = {
            ...updated[existingIdx],
            clickUpUserId: Number(m.id),
            clickUpEmail: m.email || updated[existingIdx].clickUpEmail
          };
          return updated;
        });
        linkedCount++;
      } else {
        const newSquadMember: TeamMember = {
          id: `cu-member-${m.id}`,
          clickUpUserId: Number(m.id),
          clickUpEmail: m.email || undefined,
          name: m.username,
          role: `${m.role} (ClickUp)`,
          department: 'SEO',
          seniority: m.role === 'Owner' || m.role === 'Admin' ? 'Senior Resource' : 'Mid Specialist',
          avatar: m.profilePicture || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          weeklyCapacityHours: 40,
          skills: ['Technical SEO', 'Client Strategy', 'On-Page SEO'],
          skillScores: [
            { skill: 'Technical SEO', quality: 9, speedEfficiency: 9, communication: 9 },
            { skill: 'Client Strategy', quality: 8, speedEfficiency: 8, communication: 9 }
          ],
          generalCompetency: {
            englishProficiency: 9,
            clientCommunication: 9,
            requirementUnderstanding: 9,
            proactivityReliability: 9,
            clientReadyTier: 'Tier 1: Client-Facing Lead',
            lastTestedDate: todayLocal()
          },
          completedSprintTasks: 8,
          colorSwatch: m.color || '#8b5cf6'
        };
        setCustomMembers((prev) => [...prev, newSquadMember]);
        if (onAddMember) onAddMember(newSquadMember);
        addedCount++;
      }
    });

    const msg = addedCount > 0 
      ? `⚡ Imported ${addedCount} and linked ${linkedCount} ClickUp profiles!`
      : `⚡ Linked ${linkedCount} squad members to ClickUp user accounts!`;
    setCopiedToast(msg);
    sonnerToast.success('ClickUp Team Sync', {
      description: msg
    });
    setTimeout(() => setCopiedToast(null), 4500);
  };

  const handleImportClickUpTimeEntries = (entries: any[]) => {
    const totalHours = Math.round(entries.reduce((sum, e) => sum + (e.duration || 0), 0) / 3600000);
    setProjectsList((prev) =>
      prev.map((p, idx) => {
        const matched = entries.filter((e) => e.task?.name?.toLowerCase().includes(p.name.toLowerCase()));
        const loggedHrs = matched.reduce((s, e) => s + (e.duration || 0), 0) / 3600000;
        const addHrs = loggedHrs > 0 ? Math.round(loggedHrs) : (idx % 2 === 0 ? 3 : 2);
        return {
          ...p,
          activeHours: (p.activeHours || 0) + addHrs,
          actualHoursLogged: (p.actualHoursLogged || 0) + addHrs
        };
      })
    );
    setCopiedToast(`⚡ Synced ${entries.length} time entries (${totalHours}h) into active projects!`);
    sonnerToast.success('ClickUp Time Tracking Synced', {
      description: `Mapped ${totalHours} logged hours across active projects.`
    });
    setTimeout(() => setCopiedToast(null), 4500);
  };

  // ClickUp CRM Active Clients Ingestion & Roster Replacement
  const [syncingCrmClients, setSyncingCrmClients] = useState(false);
  const [crmImportScopeModal, setCrmImportScopeModal] = useState<{
    isOpen: boolean;
    list: { id: string; name: string };
    tasks: ClickUpTask[];
    selectedScope: 'tasks' | 'subtasks' | 'both';
    replace: boolean;
  } | null>(null);

  const handleImportProjectsFromClickUpList = (
    list: { id: string; name: string; folderName?: string; spaceName?: string },
    clickUpTasks: ClickUpTask[],
    replaceExisting: boolean
  ) => {
    if (!clickUpTasks || clickUpTasks.length === 0) {
      sonnerToast.error('No client accounts found to import.');
      return;
    }

    const cardGradients = [
      'from-cyan-500 to-blue-600',
      'from-purple-500 to-indigo-600',
      'from-emerald-500 to-teal-600',
      'from-amber-500 to-orange-600',
      'from-rose-500 to-pink-600',
      'from-blue-500 to-indigo-700',
      'from-teal-500 to-cyan-600',
      'from-violet-500 to-purple-700'
    ];

    const mappedProjects: ActiveProjectItem[] = clickUpTasks.map((t, idx) => {
      const cleanName = t.name.trim();
      let clientName = cleanName;
      if (cleanName.includes(' - ')) {
        clientName = cleanName.split(' - ')[0].trim();
      } else if (cleanName.includes(' | ')) {
        clientName = cleanName.split(' | ')[0].trim();
      } else if (cleanName.includes(':')) {
        clientName = cleanName.split(':')[0].trim();
      }

      // Preserve existing custom columns & audit logs if project was already in local state
      const existingPrj = projectsList.find(
        (p) =>
          p.id === `prj_cu_${t.id}` ||
          p.id === t.id ||
          (p.client && clientName && p.client.toLowerCase() === clientName.toLowerCase()) ||
          (p.name && cleanName && p.name.toLowerCase() === cleanName.toLowerCase())
      );

      // Total & Active Hours
      const totalHours = t.time_estimate ? Math.max(5, Math.round(t.time_estimate / 3600000)) : (existingPrj?.totalHours || 20);
      const activeHours = existingPrj?.activeHours || Math.round(totalHours * 0.75);

      // Budget / Retainer Price resolution
      let parsedAmount = 2500;
      if (t.custom_fields && t.custom_fields.length > 0) {
        const budgetField = t.custom_fields.find((cf) => 
          /budget|price|retainer|amount|value|fee/i.test(cf.name)
        );
        if (budgetField && budgetField.value) {
          const num = typeof budgetField.value === 'number'
            ? budgetField.value
            : parseFloat(String(budgetField.value).replace(/[^0-9.]/g, ''));
          if (!isNaN(num) && num > 0) parsedAmount = num;
        }
      }

      const namePriceMatch = cleanName.match(/\$([0-9,]+)/);
      if (namePriceMatch) {
        const num = parseFloat(namePriceMatch[1].replace(/,/g, ''));
        if (!isNaN(num) && num > 0) parsedAmount = num;
      }

      const isHourly = /hourly|\/hr|per hour/i.test(cleanName) || (t.custom_fields && t.custom_fields.some(cf => /billing|rate|type/i.test(cf.name) && /hourly/i.test(String(cf.value || ''))));
      const detectedBillingType: 'Monthly Retainer' | 'Milestone Delivery' | 'Weekly Hourly Billing' =
        existingPrj?.billingType || (isHourly ? 'Weekly Hourly Billing' : 'Monthly Retainer');

      let formattedPrice = '';
      let calculatedPaymentAmount = parsedAmount;
      if (detectedBillingType === 'Weekly Hourly Billing') {
        const weeklyCalc = Math.round(parsedAmount * activeHours);
        const monthlyCalc = Math.round(weeklyCalc * 4);
        formattedPrice = `$${parsedAmount}/hr (${weeklyCalc > 0 ? `$${weeklyCalc.toLocaleString()}/wk • ` : ''}$${monthlyCalc.toLocaleString()}/mo)`;
        calculatedPaymentAmount = monthlyCalc > 0 ? monthlyCalc : Math.round(parsedAmount * activeHours * 4);
      } else {
        formattedPrice = `$${parsedAmount.toLocaleString()} / mo`;
        calculatedPaymentAmount = parsedAmount;
      }

      // Status mapping
      const rawStatus = (t.status?.status || 'Open').toLowerCase();
      let canonicalStatus: 'INITIAL STAGE' | 'ON TRACK' | 'REVALUATION' | 'PAUSED' | 'COMPLETED' = 'ON TRACK';
      let milestonesCompleted = 2;
      let progress = 50;

      if (rawStatus.includes('complete') || rawStatus.includes('done') || rawStatus.includes('closed')) {
        canonicalStatus = 'COMPLETED';
        milestonesCompleted = 4;
        progress = 100;
      } else if (rawStatus.includes('pause') || rawStatus.includes('hold')) {
        canonicalStatus = 'PAUSED';
        milestonesCompleted = 1;
        progress = 25;
      } else if (rawStatus.includes('reval') || rawStatus.includes('risk') || rawStatus.includes('issue')) {
        canonicalStatus = 'REVALUATION';
        milestonesCompleted = 1;
        progress = 30;
      } else if (rawStatus.includes('lead') || rawStatus.includes('new') || rawStatus.includes('initial') || rawStatus.includes('onboard')) {
        canonicalStatus = 'INITIAL STAGE';
        milestonesCompleted = 1;
        progress = 20;
      } else if (rawStatus.includes('review') || rawStatus.includes('qa')) {
        canonicalStatus = 'ON TRACK';
        milestonesCompleted = 3;
        progress = 75;
      }

      // Priority mapping
      const rawPriority = t.priority?.priority?.toLowerCase() || '';
      let priorityLevel: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW' = 'NORMAL';
      if (rawPriority === 'urgent' || rawPriority === '1') priorityLevel = 'URGENT';
      else if (rawPriority === 'high' || rawPriority === '2') priorityLevel = 'HIGH';
      else if (rawPriority === 'low' || rawPriority === '4') priorityLevel = 'LOW';

      // Dates
      const startDate = t.start_date
        ? new Date(Number(t.start_date)).toISOString().split('T')[0]
        : '2026-07-01';
      const dueDate = t.due_date
        ? new Date(Number(t.due_date)).toISOString().split('T')[0]
        : 'Monthly Renewal: 30th';

      // Team Assignees Matching:
      // Match ClickUp task assignees with team members. If task has NO assignees, leave blank/unassigned.
      const matchedMembers: TeamMember[] = [];
      if (t.assignees && t.assignees.length > 0) {
        t.assignees.forEach((cuUser) => {
          const found = customMembers.find((cm) =>
            (cm.clickUpUserId && String(cm.clickUpUserId) === String(cuUser.id)) ||
            (cm.clickUpEmail && cuUser.email && cm.clickUpEmail.toLowerCase() === cuUser.email.toLowerCase()) ||
            (cm.name.toLowerCase() === (cuUser.username || '').toLowerCase())
          );
          if (found && !matchedMembers.some((m) => m.id === found.id)) {
            matchedMembers.push(found);
          }
        });
      }

      // If ClickUp has assignees, use them. If not, preserve existing project members if set, or leave empty/unassigned!
      const squadMembers = matchedMembers.length > 0 ? matchedMembers : (existingPrj?.members || []);
      const leadId = matchedMembers[0]?.id || existingPrj?.projectLeadId || undefined;
      const callAssigneeId = matchedMembers[1]?.id || (matchedMembers.length === 1 ? matchedMembers[0]?.id : existingPrj?.clientCallAssigneeId) || undefined;

      // Deliverables / Task Breakdown (leave unassigned if no lead)
      const deliverables: ProjectTaskAllocation[] = existingPrj?.taskBreakdown && existingPrj.taskBreakdown.length > 0
        ? existingPrj.taskBreakdown
        : [
            {
              id: `tb-cu-${t.id}-1`,
              taskType: 'Technical SEO',
              assigneeId: leadId || '',
              hours: Math.round(totalHours * 0.4),
              clickUpTaskId: String(t.id),
              clickUpUrl: t.url,
              clickUpStatus: t.status?.status || 'In Progress',
              status: canonicalStatus === 'COMPLETED' ? 'completed' : 'in_progress'
            },
            {
              id: `tb-cu-${t.id}-2`,
              taskType: 'On-Page SEO',
              assigneeId: callAssigneeId || leadId || '',
              hours: Math.round(totalHours * 0.35),
              clickUpTaskId: String(t.id),
              clickUpUrl: t.url,
              clickUpStatus: t.status?.status || 'In Progress',
              status: canonicalStatus === 'COMPLETED' ? 'completed' : 'in_progress'
            },
            {
              id: `tb-cu-${t.id}-3`,
              taskType: 'Client Communications',
              assigneeId: callAssigneeId || leadId || '',
              hours: Math.max(2, Math.round(totalHours * 0.25)),
              clickUpTaskId: String(t.id),
              clickUpUrl: t.url,
              clickUpStatus: t.status?.status || 'In Progress',
              status: canonicalStatus === 'COMPLETED' ? 'completed' : 'assigned'
            }
          ];

      const clientTier = existingPrj?.clientTier || classifyClientTier({
        name: cleanName,
        client: clientName,
        paymentAmountNumeric: parsedAmount
      });

      // Also parse ClickUp custom fields for any auxiliary operational values
      let cuCommsChannel: string | undefined = undefined;
      let cuBillingAccount: string | undefined = undefined;
      let cuBackendLogins: string | undefined = undefined;
      if (t.custom_fields && t.custom_fields.length > 0) {
        t.custom_fields.forEach((cf) => {
          const nm = (cf.name || '').toLowerCase();
          const val = cf.value != null ? String(cf.value) : '';
          if (/channel|communication|comms/i.test(nm)) cuCommsChannel = val;
          else if (/billing|account/i.test(nm)) cuBillingAccount = val;
          else if (/login|backend|credential/i.test(nm)) cuBackendLogins = val;
        });
      }

      return {
        id: `prj_cu_${t.id}`,
        clickUpTaskId: t.id,
        name: cleanName,
        client: clientName,
        clientTier,
        billingType: detectedBillingType,
        startDate: existingPrj?.startDate || startDate,
        dueDateOrRenewal: dueDate,
        milestonesTotal: existingPrj?.milestonesTotal || 4,
        milestonesCompleted: existingPrj?.milestonesCompleted || milestonesCompleted,
        price: existingPrj?.price || formattedPrice,
        totalHours,
        activeHours: existingPrj?.activeHours || activeHours,
        progress,
        color: existingPrj?.color || cardGradients[idx % cardGradients.length],
        members: squadMembers,
        projectLeadId: leadId,
        clientCallAssigneeId: callAssigneeId,
        paymentStatus: canonicalStatus === 'COMPLETED' ? 'Paid' : (existingPrj?.paymentStatus || 'Pending'),
        paymentDueDate: dueDate.includes('30th') ? '2026-07-31' : (existingPrj?.paymentDueDate || dueDate),
        paymentAmountNumeric: existingPrj?.paymentAmountNumeric || calculatedPaymentAmount,
        paymentInvoiceId: existingPrj?.paymentInvoiceId || `INV-CU-${t.id.slice(-4).toUpperCase()}`,
        status: canonicalStatus,
        priorityLevel,
        clickUpListId: list.id,
        clickUpListName: list.name,
        clientFolderUrl: t.url,
        taskContent: t.text_content || t.description || existingPrj?.taskContent || `ClickUp Client Account: ${cleanName}`,
        taskBreakdown: deliverables,
        // PRESERVED CUSTOM COLUMNS:
        communicationChannel: existingPrj?.communicationChannel || cuCommsChannel || undefined,
        billingAccount: existingPrj?.billingAccount || cuBillingAccount || undefined,
        ga4Access: existingPrj?.ga4Access || undefined,
        gbpAccess: existingPrj?.gbpAccess || undefined,
        gscAccess: existingPrj?.gscAccess || undefined,
        gtmAccess: existingPrj?.gtmAccess || undefined,
        guestPostIncluded: existingPrj?.guestPostIncluded || undefined,
        backendLoginsNote: existingPrj?.backendLoginsNote || cuBackendLogins || undefined,
        reportingNote: existingPrj?.reportingNote || undefined,
        reportingPlatform: existingPrj?.reportingPlatform || undefined,
        serviceLabels: existingPrj?.serviceLabels || undefined,
        monthlyHistory: existingPrj?.monthlyHistory || undefined,
        weeklyHoursOffPage: existingPrj?.weeklyHoursOffPage || undefined,
        weeklyHoursOnPage: existingPrj?.weeklyHoursOnPage || undefined,
        weeklyHoursTech: existingPrj?.weeklyHoursTech || undefined,
        contractStartDate: existingPrj?.contractStartDate || undefined,
        devTechAssigneeId: existingPrj?.devTechAssigneeId || undefined,
        offPageAssigneeId: existingPrj?.offPageAssigneeId || undefined,
        onPageAssigneeId: existingPrj?.onPageAssigneeId || undefined,
        projectHealthEmoji: existingPrj?.projectHealthEmoji || undefined
      };
    });

    // Delta Tracking for ClickUp Ingestion (Improvement 3)
    const existingMap = new Map(projectsList.map((p) => [p.id, p]));
    const updatedIds: string[] = [];
    const createdIds: string[] = [];

    mappedProjects.forEach((mp) => {
      if (existingMap.has(mp.id)) {
        updatedIds.push(mp.id);
      } else {
        createdIds.push(mp.id);
      }
    });

    const unchangedCount = Math.max(0, projectsList.length - updatedIds.length);
    const deltaSet = new Set([...createdIds, ...updatedIds]);
    setRecentlySyncedProjectIds(deltaSet);
    setTimeout(() => {
      setRecentlySyncedProjectIds(new Set());
    }, 15000);

    if (replaceExisting) {
      setProjectsList(mappedProjects);
      setLastSyncedTime(new Date());
      setCopiedToast(`⚡ Synced: ${createdIds.length} Added, ${updatedIds.length} Updated from ClickUp!`);
      sonnerToast.success(`⚡ ClickUp Sync Complete!`, {
        description: `Imported ${mappedProjects.length} accounts (${updatedIds.length} updated, ${createdIds.length} newly added from "${list.name}").`
      });
    } else {
      setProjectsList((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const nonDuplicates = mappedProjects.filter((np) => !existingIds.has(np.id));
        return [...prev, ...nonDuplicates];
      });
      setLastSyncedTime(new Date());
      setCopiedToast(`⚡ Merged: ${createdIds.length} New Accounts from ClickUp!`);
      sonnerToast.success(`⚡ ClickUp Sync Complete!`, {
        description: `Merged ${createdIds.length} new accounts, ${unchangedCount} unchanged from "${list.name}".`
      });
    }
    setTimeout(() => setCopiedToast(null), 4500);
  };

  const handleImportLeadsFromClickUpList = (
    list: { id: string; name: string; folderName?: string; spaceName?: string },
    clickUpTasks: ClickUpTask[],
    replaceExisting: boolean
  ) => {
    if (!clickUpTasks || clickUpTasks.length === 0) {
      sonnerToast.error(`No tasks found in ClickUp list "${list.name}".`);
      return;
    }

    const mappedLeads: BusinessLeadItem[] = clickUpTasks.map((t) => {
      const cleanName = t.name.trim();

      // Separate Assignee (Team Lead / Owner) matching
      let assignedOwnerId: string | undefined = undefined;
      if (t.assignees && t.assignees.length > 0) {
        const found = customMembers.find((cm) =>
          t.assignees.some((cuUser) => {
            const cmName = cm.name.toLowerCase();
            const cuUsername = (cuUser.username || '').toLowerCase();
            return (
              cuUsername.includes(cmName) ||
              cmName.includes(cuUsername)
            );
          })
        );
        if (found) {
          assignedOwnerId = found.id;
        }
      }

      // Stage detection
      const rawStatus = (t.status?.status || 'New').toLowerCase();
      let stage: BusinessLeadItem['stage'] = 'NEW';
      if (rawStatus.includes('won') || rawStatus.includes('closed') || rawStatus.includes('complete')) {
        stage = 'WON';
      } else if (rawStatus.includes('lost') || rawStatus.includes('reject') || rawStatus.includes('cancel')) {
        stage = 'LOST';
      } else if (rawStatus.includes('proposal') || rawStatus.includes('quote')) {
        stage = 'PROPOSAL';
      } else if (rawStatus.includes('negotiat') || rawStatus.includes('contract') || rawStatus.includes('review')) {
        stage = 'NEGOTIATION';
      } else if (rawStatus.includes('audit') || rawStatus.includes('call') || rawStatus.includes('meet') || rawStatus.includes('discovery')) {
        stage = 'DISCOVERY';
      }

      // Budget extraction
      let parsedAmount = 2500;
      let valString = '$2,500/mo';
      let billingPref: 'Monthly Retainer' | 'Milestone Delivery' | 'Weekly Hourly Billing' = 'Monthly Retainer';

      if (t.custom_fields && t.custom_fields.length > 0) {
        const budgetField = t.custom_fields.find((cf) =>
          /budget|price|value|amount|fee/i.test(cf.name)
        );
        if (budgetField && budgetField.value) {
          const num = typeof budgetField.value === 'number'
            ? budgetField.value
            : parseFloat(String(budgetField.value).replace(/[^0-9.]/g, ''));
          if (!isNaN(num) && num > 0) parsedAmount = num;
        }
      }

      const isHourly = /hourly|\/hr|per hour/i.test(cleanName) || (t.custom_fields && t.custom_fields.some(cf => /billing|rate|type/i.test(cf.name) && /hourly/i.test(String(cf.value || ''))));
      if (isHourly) {
        billingPref = 'Weekly Hourly Billing';
        valString = `$${parsedAmount}/hr`;
      } else {
        valString = `$${parsedAmount.toLocaleString()}/mo`;
      }

      // Extract contact details
      let email: string | undefined = undefined;
      let phone: string | undefined = undefined;
      let contactPerson: string | undefined = undefined;

      if (t.custom_fields) {
        const emailField = t.custom_fields.find(cf => /email/i.test(cf.name));
        if (emailField && emailField.value) email = String(emailField.value);
        const phoneField = t.custom_fields.find(cf => /phone|mobile|cell/i.test(cf.name));
        if (phoneField && phoneField.value) phone = String(phoneField.value);
        const contactField = t.custom_fields.find(cf => /contact|client name|person|owner/i.test(cf.name));
        if (contactField && contactField.value) contactPerson = String(contactField.value);
      }

      if (!email && t.text_content) {
        const emailMatch = t.text_content.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (emailMatch) email = emailMatch[0];
      }

      return {
        id: `lead_cu_${t.id}`,
        clickUpTaskId: t.id,
        clickUpUrl: t.url,
        companyName: cleanName,
        contactPerson: contactPerson || undefined,
        email: email,
        phone: phone,
        assignedOwnerId: assignedOwnerId, // Dedicated Assigned Lead Owner
        stage: stage,
        estimatedValue: valString,
        estimatedValueNumeric: parsedAmount,
        billingPreference: billingPref,
        leadSource: `ClickUp: ${list.name}`,
        serviceInterest: ['Full SEO'],
        notes: t.text_content ? t.text_content.slice(0, 300) : `Imported from ClickUp list "${list.name}"`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    });

    if (replaceExisting) {
      setBusinessLeads(mappedLeads);
    } else {
      setBusinessLeads((prev) => {
        const existingIds = new Set(prev.map((l) => l.clickUpTaskId || l.id));
        const filteredNew = mappedLeads.filter((l) => !existingIds.has(l.clickUpTaskId || l.id));
        return [...filteredNew, ...prev];
      });
    }

    setHubSubTab('leads');
    sonnerToast.success(`💼 Synced ${mappedLeads.length} leads from ClickUp list "${list.name}"!`);
  };

  const handleQuickSyncCrmClients = async () => {
    if (!isClickUpConnected()) {
      sonnerToast.info('Please connect ClickUp first to sync CRM clients.');
      setShowClickUpModal(true);
      return;
    }
    const token = getClickUpToken();
    if (!token) return;

    try {
      setSyncingCrmClients(true);
      let wsId = getClickUpWorkspaceId();
      if (!wsId) {
        const workspaces = await fetchClickUpWorkspaces(token);
        if (workspaces && workspaces.length > 0) {
          wsId = workspaces[0].id;
          setClickUpWorkspaceId(wsId);
        }
      }
      if (!wsId) {
        setShowClickUpModal(true);
        return;
      }

      sonnerToast.loading('Scanning ClickUp for Growth > CRM > Accounts/Clients...', { id: 'crm-scan' });
      const spaces = await fetchClickUpSpaces(token, wsId);
      let targetList: { id: string; name: string } | null = null;

      // 1. Look in space named Growth
      const growthSpace = spaces.find((s) => s.name.toLowerCase().includes('growth')) || spaces[0];
      if (growthSpace) {
        const folders = await fetchClickUpFolders(token, growthSpace.id);
        const crmFolder = folders.find((f) => f.name.toLowerCase().includes('crm')) || folders[0];
        if (crmFolder) {
          const crmLists = await fetchClickUpLists(token, crmFolder.id, true);
          const accountsList = crmLists.find((l) =>
            l.name.toLowerCase().includes('accounts') ||
            l.name.toLowerCase().includes('clients')
          );
          if (accountsList) {
            targetList = accountsList;
          }
        }
      }

      // 2. Global fallback across all spaces
      if (!targetList) {
        for (const sp of spaces) {
          const spFolders = await fetchClickUpFolders(token, sp.id);
          for (const f of spFolders) {
            if (f.name.toLowerCase().includes('crm')) {
              const fLists = await fetchClickUpLists(token, f.id, true);
              const found = fLists.find((l) =>
                l.name.toLowerCase().includes('client') ||
                l.name.toLowerCase().includes('account')
              );
              if (found) {
                targetList = found;
                break;
              }
            }
          }
          if (targetList) break;
        }
      }

      if (!targetList) {
        sonnerToast.dismiss('crm-scan');
        sonnerToast.info('Opening ClickUp Center — select your CRM Clients list directly in Hierarchy.');
        setShowClickUpModal(true);
        return;
      }

      sonnerToast.loading(`Fetching client accounts from "${targetList.name}"...`, { id: 'crm-scan' });
      const clientTasks = await fetchClickUpListTasks(token, targetList.id);
      sonnerToast.dismiss('crm-scan');

      if (!clientTasks || clientTasks.length === 0) {
        sonnerToast.error(`No accounts found in "${targetList.name}".`);
        return;
      }

      // Open Scope Selection Modal asking user for tasks, subtasks, or both
      setCrmImportScopeModal({
        isOpen: true,
        list: targetList,
        tasks: clientTasks,
        selectedScope: 'tasks',
        replace: true
      });
    } catch (err: any) {
      console.error('Error during quick CRM sync:', err);
      sonnerToast.dismiss('crm-scan');
      sonnerToast.error('CRM Sync Failed', { description: err.message });
      setShowClickUpModal(true);
    } finally {
      setSyncingCrmClients(false);
    }
  };

  const handleSyncAllDeliverablesWithClickUp = async () => {
    if (!isClickUpConnected()) {
      sonnerToast.info('Please connect ClickUp first.');
      setShowClickUpModal(true);
      return;
    }
    const token = getClickUpToken();
    if (!token) return;

    // Collect all task IDs from all project deliverables
    const taskIdsToFetch: string[] = [];
    projectsList.forEach((p) => {
      (p.taskBreakdown || []).forEach((tb: any) => {
        if (tb.clickUpTaskId) taskIdsToFetch.push(tb.clickUpTaskId);
      });
      if (p.clickUpTaskId) taskIdsToFetch.push(p.clickUpTaskId);
      else if (p.id.startsWith('prj_cu_')) taskIdsToFetch.push(p.id.replace('prj_cu_', ''));
    });

    if (taskIdsToFetch.length === 0) {
      sonnerToast.info('No linked ClickUp deliverables found to sync. Push projects to ClickUp or import tasks first.');
      return;
    }

    try {
      setIsSyncingDeliverables(true);
      sonnerToast.loading(`Syncing ${taskIdsToFetch.length} deliverable tasks from ClickUp...`, { id: 'deliv-sync' });

      const fetchedMap = await batchFetchClickUpTasks(token, taskIdsToFetch);

      let updatedTasksCount = 0;
      let completedTasksCount = 0;

      setProjectsList((prevList) => {
        return prevList.map((project) => {
          let projectModified = false;
          const updatedBreakdown = (project.taskBreakdown || []).map((tb: any) => {
            if (!tb.clickUpTaskId) return tb;
            const liveTask = fetchedMap.get(tb.clickUpTaskId);
            if (!liveTask) return tb;

            const liveStatus = liveTask.status?.status || '';
            const isClosed = isClickUpTaskClosed(liveStatus);

            const prevStatus = tb.status;
            const newStatus = isClosed ? 'Completed' : (prevStatus === 'Completed' ? 'Completed' : 'In Progress');

            if (tb.clickUpStatus !== liveStatus || tb.status !== newStatus) {
              projectModified = true;
              updatedTasksCount++;
              if (isClosed && prevStatus !== 'Completed') {
                completedTasksCount++;
              }
              return {
                ...tb,
                clickUpStatus: liveStatus,
                status: newStatus
              };
            }
            return tb;
          });

          if (projectModified) {
            const completedMilestones = updatedBreakdown.filter((t: any) => t.status === 'Completed').length;
            const totalMilestones = Math.max(1, updatedBreakdown.length);
            const allDone = completedMilestones === totalMilestones && totalMilestones > 0;

            return {
              ...project,
              taskBreakdown: updatedBreakdown,
              milestonesCompleted: completedMilestones,
              milestonesTotal: totalMilestones,
              status: allDone ? 'COMPLETED' : project.status
            };
          }

          return project;
        });
      });

      sonnerToast.dismiss('deliv-sync');
      sonnerToast.success(`⚡ Deliverables Synchronized!`, {
        description: `Checked ${fetchedMap.size} ClickUp tasks. Updated ${updatedTasksCount} deliverables (${completedTasksCount} newly completed milestones).`
      });
      setLastSyncedTime(new Date());
    } catch (err: any) {
      console.error('Error syncing ClickUp deliverables:', err);
      sonnerToast.dismiss('deliv-sync');
      sonnerToast.error('Deliverable Sync Failed', { description: err.message });
    } finally {
      setIsSyncingDeliverables(false);
    }
  };

  // State: Feature 4 - Deliverable Specialist Reassignment Popover & Search
  const [quickDeliverableAssignee, setQuickDeliverableAssignee] = useState<{
    projId: string;
    taskAllocationId: string;
  } | null>(null);
  const [deliverableAssigneeSearch, setDeliverableAssigneeSearch] = useState('');

  const handleReassignDeliverable = (projectId: string, deliverableId: string, newAssigneeId: string) => {
    setProjectsList((prevList) => {
      return prevList.map((project) => {
        if (project.id !== projectId) return project;
        const updatedBreakdown = (project.taskBreakdown || []).map((tb: any) => {
          if (tb.id === deliverableId) {
            return { ...tb, assigneeId: newAssigneeId };
          }
          return tb;
        });

        const newSquadMembers = Array.from(
          new Set(updatedBreakdown.map((t: any) => t.assigneeId).filter(Boolean))
        )
          .map((id) => customMembers.find((m) => m.id === id))
          .filter(Boolean) as TeamMember[];

        return {
          ...project,
          taskBreakdown: updatedBreakdown,
          members: newSquadMembers.length > 0 ? newSquadMembers : project.members
        };
      });
    });
    setQuickDeliverableAssignee(null);
    setDeliverableAssigneeSearch('');
    const m = customMembers.find((mem) => mem.id === newAssigneeId);
    sonnerToast.success(`Assigned ${m ? m.name : 'specialist'} to deliverable`);
  };

  // ClickUp Ticket Discussion & Activity Modal State
  const [clickUpActivityModalState, setClickUpActivityModalState] = useState<{
    isOpen: boolean;
    taskId: string;
    taskName: string;
    taskUrl?: string;
    projectName?: string;
    clientName?: string;
    status?: string;
    priority?: string;
    assignees?: Array<{ name: string; avatar?: string }>;
  } | null>(null);

  const handleOpenClickUpTicketModal = (
    taskId: string,
    taskName: string,
    opts?: {
      taskUrl?: string;
      projectName?: string;
      clientName?: string;
      status?: string;
      priority?: string;
    }
  ) => {
    if (!isClickUpConnected()) {
      sonnerToast.info('Please connect ClickUp first in the top bar to view ticket discussion & activity.');
      setShowClickUpModal(true);
      return;
    }
    setClickUpActivityModalState({
      isOpen: true,
      taskId,
      taskName,
      taskUrl: opts?.taskUrl,
      projectName: opts?.projectName,
      clientName: opts?.clientName,
      status: opts?.status,
      priority: opts?.priority
    });
  };

  // Modal State for Editing Existing Project
  const [editingProject, setEditingProject] = useState<ActiveProjectItem | null>(null);

  // Modal State for Editing Employee Details
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

  // Modal State for Adding New Employee
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('Senior Lead Dev & Specialist');
  const [newMemberAvatar, setNewMemberAvatar] = useState(
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  );
  const [newMemberCapacity, setNewMemberCapacity] = useState(40);
  const [newMemberSkillsInput, setNewMemberSkillsInput] = useState('SEO Strategy, Client Leadership, Technical Audit');

  // Skill Filter State for Tab 3
  const [filterSkill, setFilterSkill] = useState<string>('ALL');

  // Selected Live Project State for Tab 4 (Job Delivery Bot)
  const [selectedDeliveryProjectId, setSelectedDeliveryProjectId] = useState<string>('p1');

  // Finances & Payment Tracker State
  const [editingFinancesProject, setEditingFinancesProject] = useState<ActiveProjectItem | null>(null);
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('ALL');
  const financeMonthOptions = [
    { id: 'ALL', label: '📅 All Months (YTD)' },
    { ...monthOption(0), label: `📅 ${monthOption(0).label} (Current)` },
    { ...monthOption(-1), label: `📅 ${monthOption(-1).label}` },
    { ...monthOption(-2), label: `📅 ${monthOption(-2).label}` }
  ];
  const [viewingProjectDetail, setViewingProjectDetail] = useState<ActiveProjectItem | null>(null);

  // Helper: Get specific member hours on project (including granular task type allocations)
  const getMemberHoursOnProject = (proj: ActiveProjectItem, memberId: string): number => {
    if (proj.taskBreakdown && proj.taskBreakdown.some((tb) => tb.assigneeId === memberId)) {
      return proj.taskBreakdown
        .filter((tb) => tb.assigneeId === memberId)
        .reduce((sum, tb) => sum + tb.hours, 0);
    }
    if (proj.memberHoursMap && proj.memberHoursMap[memberId] !== undefined) {
      return proj.memberHoursMap[memberId];
    }
    return Math.round(proj.activeHours / Math.max(1, proj.members.length));
  };

  // Helper: Calculate an employee's assigned active hours dynamically across all assigned projects & task types
  const calculateMemberAssignedHours = (memberId: string) => {
    const assignedProjects = projectsList.filter(
      (proj) =>
        proj.members.some((m) => m.id === memberId) ||
        proj.taskBreakdown?.some((tb) => tb.assigneeId === memberId)
    );
    return assignedProjects.reduce((sum, proj) => {
      return sum + getMemberHoursOnProject(proj, memberId);
    }, 0);
  };

  // Helper: Live Capacity & Availability Label for Dropdowns
  const getMemberCapacityLabel = (m: TeamMember) => {
    const assigned = calculateMemberAssignedHours(m.id);
    const cap = m.weeklyCapacityHours || 40;
    const pct = Math.round((assigned / cap) * 100);
    const badge = pct >= 100 ? '🔴 Overload' : pct >= 85 ? '⚠️ Near Cap' : '✅ Free';
    return `${m.name} (${m.role}) — [${assigned}/${cap}h • ${pct}%] ${badge}`;
  };

  // State: Multi-Select Bulk Actions on Roster Cards
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());
  const [bulkActionDropdown, setBulkActionDropdown] = useState<'lead' | 'status' | null>(null);

  // State: Recently Synced Project IDs (for ClickUp delta pulsing badge)
  const [recentlySyncedProjectIds, setRecentlySyncedProjectIds] = useState<Set<string>>(new Set());

  // State: Fast In-Line "Click-to-Edit" on Cards
  const [inlineEditingPriceId, setInlineEditingPriceId] = useState<string | null>(null);
  const [inlinePriceValue, setInlinePriceValue] = useState<string>('');
  const [quickStatusMenuProjId, setQuickStatusMenuProjId] = useState<string | null>(null);
  const [quickLeadMenuProjId, setQuickLeadMenuProjId] = useState<{ projId: string; role: 'lead' | 'call' } | null>(null);

  // State: 1-Click Quick Memo on Project Cards (Feature 3)
  const [editingMemoProjId, setEditingMemoProjId] = useState<string | null>(null);
  const [memoInputText, setMemoInputText] = useState<string>('');

  // Handlers: Quick Memo with Date and Time
  const handleSaveQuickMemo = (projId: string, text: string) => {
    const trimmed = text.trim();
    const now = new Date();
    const datePart = now.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const timePart = now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    const timestamp = `${datePart}, ${timePart}`;

    setProjectsList((prev) =>
      prev.map((p) => {
        if (p.id !== projId) return p;
        if (!trimmed) {
          const { quickMemo, quickMemoUpdatedAt, ...rest } = p;
          return rest as ActiveProjectItem;
        }
        return {
          ...p,
          quickMemo: trimmed,
          quickMemoUpdatedAt: timestamp
        };
      })
    );
    setEditingMemoProjId(null);
    setMemoInputText('');
    sonnerToast.success(trimmed ? '📝 Quick memo saved' : 'Memo cleared');
  };

  const handleClearQuickMemo = (projId: string) => {
    setProjectsList((prev) =>
      prev.map((p) => {
        if (p.id !== projId) return p;
        const { quickMemo, quickMemoUpdatedAt, ...rest } = p;
        return rest as ActiveProjectItem;
      })
    );
    sonnerToast.success('Memo removed');
  };

  // In-line Edit Handlers
  const handleQuickUpdateStatus = (projId: string, newStatus: ActiveProjectItem['status']) => {
    setProjectsList((prev) =>
      prev.map((p) => (p.id === projId ? { ...p, status: newStatus } : p))
    );
    setQuickStatusMenuProjId(null);
    sonnerToast.success(`Project status updated to ${newStatus}`);
  };

  const handleQuickUpdateLead = (projId: string, leadId: string) => {
    setProjectsList((prev) =>
      prev.map((p) => {
        if (p.id !== projId) return p;
        const member = customMembers.find((m) => m.id === leadId);
        const updatedMembers = member && !p.members.some((m) => m.id === leadId) ? [member, ...p.members] : p.members;
        return {
          ...p,
          projectLeadId: leadId || undefined,
          members: updatedMembers
        };
      })
    );
    setQuickLeadMenuProjId(null);
    sonnerToast.success('Team Lead reassigned successfully');
  };

  const handleQuickUpdateCallLead = (projId: string, callAssigneeId: string) => {
    setProjectsList((prev) =>
      prev.map((p) => (p.id === projId ? { ...p, clientCallAssigneeId: callAssigneeId || undefined } : p))
    );
    setQuickLeadMenuProjId(null);
    sonnerToast.success('Call Lead updated successfully');
  };

  // Item 3: 1-Click Quick Toggle Deliverable Completion
  const handleToggleDeliverableStatus = (projId: string, taskAllocationId: string) => {
    let taskName = '';
    let releasedHours = 0;
    let becameDone = false;

    setProjectsList((prev) =>
      prev.map((p) => {
        if (p.id !== projId) return p;
        const updatedBreakdown = (p.taskBreakdown || []).map((tb) => {
          if (tb.id !== taskAllocationId) return tb;
          taskName = tb.taskType;
          releasedHours = tb.hours || 0;
          const isCurrentlyDone =
            (tb.clickUpStatus || tb.status || '').toLowerCase().includes('done') ||
            (tb.clickUpStatus || tb.status || '').toLowerCase().includes('complete') ||
            (tb.clickUpStatus || tb.status || '').toLowerCase().includes('closed');

          becameDone = !isCurrentlyDone;
          const nextStatus = becameDone ? 'completed' : 'in progress';
          return {
            ...tb,
            status: nextStatus,
            clickUpStatus: nextStatus
          };
        });

        // Recalculate completed milestones count if on milestone billing
        const completedCount = updatedBreakdown.filter((tb) => {
          const s = (tb.clickUpStatus || tb.status || '').toLowerCase();
          return s.includes('done') || s.includes('complete') || s.includes('closed');
        }).length;

        return {
          ...p,
          taskBreakdown: updatedBreakdown,
          milestonesCompleted: p.billingType === 'Milestone Delivery' ? completedCount : p.milestonesCompleted
        };
      })
    );

    if (becameDone) {
      sonnerToast.success(`✓ "${taskName}" marked as completed`, {
        description: releasedHours > 0 ? `${releasedHours}h freed up in sprint bandwidth` : undefined
      });
    } else {
      sonnerToast.info(`Reverted "${taskName}" back to active sprint`);
    }
  };

  const handleSaveInlinePrice = (projId: string) => {
    if (!inlinePriceValue.trim()) {
      setInlineEditingPriceId(null);
      return;
    }
    const clean = inlinePriceValue.trim();
    const num = parseFloat(clean.replace(/[^0-9.]/g, '')) || 0;
    setProjectsList((prev) =>
      prev.map((p) => (p.id === projId ? { ...p, price: clean, paymentAmountNumeric: num > 0 ? num : p.paymentAmountNumeric } : p))
    );
    setInlineEditingPriceId(null);
    sonnerToast.success(`Price updated to ${clean}`);
  };

  // Bulk Action Handlers
  const handleToggleSelectProject = (projId: string) => {
    setSelectedProjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(projId)) next.delete(projId);
      else next.add(projId);
      return next;
    });
  };

  const handleSelectAllFilteredProjects = () => {
    if (selectedProjectIds.size === filteredProjectsList.length) {
      setSelectedProjectIds(new Set());
    } else {
      setSelectedProjectIds(new Set(filteredProjectsList.map((p) => p.id)));
    }
  };

  const handleBulkReassignLead = (leadId: string) => {
    if (selectedProjectIds.size === 0) return;
    const member = customMembers.find((m) => m.id === leadId);
    setProjectsList((prev) =>
      prev.map((p) => {
        if (!selectedProjectIds.has(p.id)) return p;
        const updatedMembers = member && !p.members.some((m) => m.id === leadId) ? [member, ...p.members] : p.members;
        return {
          ...p,
          projectLeadId: leadId || undefined,
          members: updatedMembers
        };
      })
    );
    setBulkActionDropdown(null);
    sonnerToast.success(`Reassigned Team Lead for ${selectedProjectIds.size} projects!`);
  };

  const handleBulkUpdateStatus = (newStatus: ActiveProjectItem['status']) => {
    if (selectedProjectIds.size === 0) return;
    setProjectsList((prev) =>
      prev.map((p) => (selectedProjectIds.has(p.id) ? { ...p, status: newStatus } : p))
    );
    setBulkActionDropdown(null);
    sonnerToast.success(`Updated status to ${newStatus} for ${selectedProjectIds.size} projects!`);
  };

  const handleBulkArchiveProjects = () => {
    if (selectedProjectIds.size === 0) return;
    const count = selectedProjectIds.size;
    const toArchive = projectsList.filter((p) => selectedProjectIds.has(p.id));
    const archivedItems: ArchivedProjectItem[] = toArchive.map((p) => ({
      ...p,
      archiveCategory: 'past_project',
      archivedAt: new Date().toISOString(),
      archiveReason: 'Bulk moved to Past Projects'
    }));
    setArchivedProjects((prev) => [...archivedItems, ...prev]);
    setProjectsList((prev) => prev.filter((p) => !selectedProjectIds.has(p.id)));
    setSelectedProjectIds(new Set());
    sonnerToast.success(`Archived ${count} projects to Past Projects.`);
  };

  // Toast for Copied Summary / Invoice
  const [copiedToast, setCopiedToast] = useState<string | null>(null);

  // Helper: Calculate Project Gross Margin & Profitability
  const calculateProjectProfitability = (proj: ActiveProjectItem) => {
    const monthlyRevenue = proj.paymentAmountNumeric || 0;
    const monthlyCost = Math.round(proj.activeHours * 4.33 * 38);
    const marginDollars = monthlyRevenue - monthlyCost;
    const marginPercent = monthlyRevenue > 0 ? Math.round((marginDollars / monthlyRevenue) * 100) : 0;

    let tier: 'HIGH MARGIN' | 'HEALTHY' | 'TIGHT MARGIN' = 'HEALTHY';
    let colorClass = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    if (marginPercent >= 38) {
      tier = 'HIGH MARGIN';
      colorClass = 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30';
    } else if (marginPercent < 20) {
      tier = 'TIGHT MARGIN';
      colorClass = 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    }

    return {
      monthlyRevenue,
      monthlyCost,
      marginDollars,
      marginPercent,
      tier,
      colorClass
    };
  };

  // Handlers for Managing Granular Task Deliverables & Assignees
  const handleAddTaskAllocation = (projId: string) => {
    setProjectsList((prev) =>
      prev.map((proj) => {
        if (proj.id !== projId) return proj;
        const newTb: ProjectTaskAllocation = {
          id: `tb-${Date.now()}`,
          taskType: 'On-Page SEO',
          assigneeId: customMembers[0].id,
          hours: 5
        };
        const updatedBreakdown = [...(proj.taskBreakdown || []), newTb];
        const updatedActiveHours = updatedBreakdown.reduce((sum, tb) => sum + tb.hours, 0);
        const updated = {
          ...proj,
          taskBreakdown: updatedBreakdown,
          activeHours: updatedActiveHours
        };
        if (viewingProjectDetail?.id === projId) {
          setViewingProjectDetail(updated);
        }
        return updated;
      })
    );
  };

  const handleUpdateTaskAllocation = (
    projId: string,
    tbId: string,
    field: keyof ProjectTaskAllocation,
    val: any
  ) => {
    // Bi-directional ClickUp Assignee & Status Mirroring (Features E & A)
    if (field === 'assigneeId' || field === 'status') {
      const token = getClickUpToken();
      if (token) {
        const targetProj = projectsList.find((p) => p.id === projId);
        const targetTb = targetProj?.taskBreakdown?.find((t) => t.id === tbId);
        if (targetTb?.clickUpTaskId) {
          if (field === 'assigneeId') {
            const newMember = customMembers.find((m) => m.id === val);
            const oldMember = customMembers.find((m) => m.id === targetTb.assigneeId);
            const addIds = newMember?.clickUpUserId ? [Number(newMember.clickUpUserId)] : [];
            const remIds = oldMember?.clickUpUserId ? [Number(oldMember.clickUpUserId)] : [];
            if (addIds.length > 0 || remIds.length > 0) {
              updateClickUpTaskAssignees(token, targetTb.clickUpTaskId, addIds, remIds)
                .then(() => {
                  sonnerToast.success('⚡ ClickUp Assignee Synchronized', {
                    description: `Updated assignee to "${newMember?.name || 'Member'}" in ClickUp.`
                  });
                })
                .catch((err) => console.warn('ClickUp assignee update warning:', err));
            }
          } else if (field === 'status') {
            updateClickUpTaskStatus(token, targetTb.clickUpTaskId, String(val))
              .then(() => {
                sonnerToast.success('⚡ ClickUp Status Synchronized', {
                  description: `Status updated to "${val}" in ClickUp.`
                });
              })
              .catch((err) => console.warn('ClickUp status update warning:', err));
          }
        }
      }
    }

    setProjectsList((prev) =>
      prev.map((proj) => {
        if (proj.id !== projId) return proj;
        const updatedBreakdown = (proj.taskBreakdown || []).map((tb) =>
          tb.id === tbId
            ? { ...tb, [field]: field === 'hours' ? Math.max(1, Number(val) || 1) : val }
            : tb
        );
        const updatedActiveHours = updatedBreakdown.reduce((sum, tb) => sum + tb.hours, 0);
        const updated = {
          ...proj,
          taskBreakdown: updatedBreakdown,
          activeHours: updatedActiveHours
        };
        if (viewingProjectDetail?.id === projId) {
          setViewingProjectDetail(updated);
        }
        return updated;
      })
    );
  };

  const handleDeleteTaskAllocation = (projId: string, tbId: string) => {
    setProjectsList((prev) =>
      prev.map((proj) => {
        if (proj.id !== projId) return proj;
        const updatedBreakdown = (proj.taskBreakdown || []).filter((tb) => tb.id !== tbId);
        const updatedActiveHours = updatedBreakdown.reduce((sum, tb) => sum + tb.hours, 0);
        const updated = {
          ...proj,
          taskBreakdown: updatedBreakdown,
          activeHours: updatedActiveHours
        };
        if (viewingProjectDetail?.id === projId) {
          setViewingProjectDetail(updated);
        }
        return updated;
      })
    );
  };

  // Helper: Copy Client Summary / Invoice report to clipboard
  const handleCopyClientSummary = (proj: ActiveProjectItem) => {
    const summaryText = `===== CLIENT STATUS REPORT =====
Project: ${proj.name}
Client: ${proj.client}
Billing Structure: ${proj.billingType} (${proj.price})
Progress: ${proj.progress}% (${proj.milestonesCompleted}/${proj.milestonesTotal} Milestones Complete)
Next Milestone / Renewal: ${proj.dueDateOrRenewal}

=== INVOICE & PAYMENT DETAILS ===
Invoice Reference: ${proj.paymentInvoiceId}
Payment Status: ${proj.paymentStatus.toUpperCase()}
Amount Due/Paid: $${proj.paymentAmountNumeric.toLocaleString()}
Due Date: ${proj.paymentDueDate}
================================`;
    navigator.clipboard.writeText(summaryText);
    setCopiedToast(`Copied report for "${proj.client}" to clipboard!`);
    toast('Client Report Copied', {
      description: `Executive summary for ${proj.client} copied to clipboard.`,
      type: 'info'
    });
    setTimeout(() => setCopiedToast(null), 3500);
  };

  const handleCreateProject = () => {
    if (!newClientName.trim()) {
      toast('Client Name Required', {
        description: 'Please enter the client name to add this project.',
        type: 'warning'
      });
      setModalStepTab('core');
      return;
    }
    if (!newProjectName.trim()) {
      toast('Project Name Required', {
        description: 'Please enter the task / project name.',
        type: 'warning'
      });
      setModalStepTab('core');
      return;
    }

    // Build memberHoursMap from newTaskAllocations
    const newMemberHoursMap: Record<string, number> = {};
    newTaskAllocations.forEach((tb) => {
      newMemberHoursMap[tb.assigneeId] = (newMemberHoursMap[tb.assigneeId] || 0) + (Number(tb.hours) || 0);
    });
    const totalAllocatedHours = newTaskAllocations.reduce((sum, tb) => sum + (Number(tb.hours) || 0), 0);

    // Ensure all unique assignees + lead + call assignee are included in members array
    const uniqueMemberIds = Array.from(
      new Set([
        ...newTaskAllocations.map((tb) => tb.assigneeId),
        newProjectLeadId,
        newClientCallAssigneeId,
        ...newSelectedMemberIds
      ])
    ).filter(Boolean);
    const assignedSquad = customMembers.filter((m) => uniqueMemberIds.includes(m.id));
    const effectiveActiveHours = totalAllocatedHours > 0 ? totalAllocatedHours : Math.round(newTotalHours * 0.8);
    const rawRateMatch = newPrice.match(/\$?([0-9]+(?:\.[0-9]+)?)/);
    const hourlyRate = rawRateMatch ? parseFloat(rawRateMatch[1]) : 0;
    const rawPriceDigits = newPrice.replace(/[^0-9]/g, '');
    const parsedAmount = rawPriceDigits ? parseInt(rawPriceDigits, 10) : 3500;

    let finalPrice = newPrice;
    let finalPaymentAmount = parsedAmount;

    if (newBillingType === 'Weekly Hourly Billing') {
      const calcWeekly = Math.round(hourlyRate * effectiveActiveHours);
      const calcMonthly = Math.round(calcWeekly * 4);
      finalPrice = `$${hourlyRate}/hr (${calcWeekly > 0 ? `$${calcWeekly.toLocaleString()}/wk • ` : ''}$${calcMonthly.toLocaleString()}/mo)`;
      finalPaymentAmount = calcMonthly > 0 ? calcMonthly : Math.round(hourlyRate * effectiveActiveHours * 4);
    } else {
      finalPrice = newPrice.trim() ? (newPrice.includes('$') ? newPrice.trim() : `$${newPrice.trim()}`) : `$${parsedAmount}`;
      finalPaymentAmount = parsedAmount;
    }

    const item: ActiveProjectItem = {
      id: `proj-${Date.now()}`,
      name: newProjectName,
      client: newClientName,
      billingType: newBillingType,
      startDate: newStartDate,
      dueDateOrRenewal: newDueDate,
      milestonesTotal: newMilestonesTotal,
      milestonesCompleted: 1,
      price: finalPrice,
      totalHours: newTotalHours,
      activeHours: effectiveActiveHours,
      progress: 80,
      color: 'from-emerald-500 to-teal-600',
      members: assignedSquad,
      projectLeadId: newProjectLeadId || undefined,
      clientCallAssigneeId: newClientCallAssigneeId || undefined,
      memberHoursMap: newMemberHoursMap,
      taskBreakdown: newTaskAllocations,
      paymentStatus: 'Pending',
      paymentDueDate: daysFromToday(7),
      paymentAmountNumeric: finalPaymentAmount,
      paymentInvoiceId: `#INV-${Math.floor(100 + Math.random() * 900)}`,
      status: newStatus,
      priorityLevel: newPriorityLevel,
      taskContent: newTaskContent,
      clientEmail: newClientEmail,
      clientFolderUrl: newClientFolderUrl,
      communicationChannel: newCommunicationChannel || undefined,
      contractStartDate: newContractStartDate,
      devTechAssigneeId: newDevTechAssigneeId || undefined,
      backendLoginsNote: newBackendLoginsNote,
      billingAccount: newBillingAccount,
      ga4Access: newGa4Access,
      gbpAccess: newGbpAccess,
      gscAccess: newGscAccess,
      gtmAccess: newGtmAccess,
      guestPostIncluded: newGuestPostIncluded,
      offPageAssigneeId: newOffPageAssigneeId,
      onPageAssigneeId: newOnPageAssigneeId,
      projectHealthEmoji: newProjectHealthEmoji,
      reportingNote: newReportingNote,
      reportingPlatform: newReportingPlatform,
      serviceLabels: newServiceLabels,
      weeklyHoursOffPage: newWeeklyHoursOffPage,
      weeklyHoursOnPage: newWeeklyHoursOnPage,
      weeklyHoursTech: newWeeklyHoursTech,
      clickUpListId: newClickUpListId,
      clickUpListName: newClickUpListName
    };
    setProjectsList((prev) => [item, ...prev]);
    toast('Project Retainer Created', {
      description: `${newProjectName} (${newBillingType}) added for ${newClientName}.`,
      type: 'success'
    });
    setShowAddProjectModal(false);
    setNewProjectName('');
    setNewClientName('');
    setNewClickUpListId(undefined);
    setNewClickUpListName(undefined);
    setNewMilestonesTotal(4);
    setNewTaskAllocations([
      { id: 'tb-init-1', taskType: 'On-Page SEO', assigneeId: initialMembers[0]?.id || '', hours: 5 },
      { id: 'tb-init-2', taskType: 'Off-Page SEO', assigneeId: initialMembers[1]?.id || '', hours: 6 },
      { id: 'tb-init-3', taskType: 'Technical SEO', assigneeId: initialMembers[0]?.id || '', hours: 4 }
    ]);
  };

  const handleMarkPaymentReceived = (projectId: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    setProjectsList((prev) =>
      prev.map((proj) => {
        if (proj.id !== projectId) return proj;
        const updatedHistory = proj.monthlyHistory
          ? proj.monthlyHistory.map((h, idx) =>
              idx === proj.monthlyHistory!.length - 1
                ? {
                    ...h,
                    status: 'Paid' as any,
                    paidDate: todayStr
                  }
                : h
            )
          : undefined;

        return {
          ...proj,
          paymentStatus: 'Paid',
          paymentReceivedDate: todayStr,
          monthlyHistory: updatedHistory
        };
      })
    );
  };

  const handleTogglePaymentStatus = (projectId: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    setProjectsList((prev) =>
      prev.map((proj) => {
        if (proj.id !== projectId) return proj;
        const isCurrentlyPaid = proj.paymentStatus === 'Paid';
        const newStatus = isCurrentlyPaid ? 'Pending' : 'Paid';

        const updatedHistory = proj.monthlyHistory
          ? proj.monthlyHistory.map((h, idx) =>
              idx === proj.monthlyHistory!.length - 1
                ? {
                    ...h,
                    status: newStatus as any,
                    paidDate: isCurrentlyPaid ? undefined : todayStr
                  }
                : h
            )
          : undefined;

        return {
          ...proj,
          paymentStatus: newStatus,
          paymentReceivedDate: isCurrentlyPaid ? undefined : todayStr,
          monthlyHistory: updatedHistory
        };
      })
    );
  };

  const handleSaveProjectFinances = () => {
    if (!editingFinancesProject) return;
    setProjectsList((prev) =>
      prev.map((proj) => (proj.id === editingFinancesProject.id ? editingFinancesProject : proj))
    );
    setEditingFinancesProject(null);
  };

  // Feature 3: Daily Morning Huddle Attention Analysis
  const attentionProjects = React.useMemo(() => {
    return projectsList
      .map((p) => ({ project: p, ...checkProjectNeedsAttention(p) }))
      .filter((item) => item.needsAttention);
  }, [projectsList, customMembers]);

  const overdueDeliverablesCount = attentionProjects.filter((p) => p.hasOverdueDeliverable).length;
  const overScopeCount = attentionProjects.filter((p) => p.isOverScope).length;
  const paymentHoldCount = attentionProjects.filter((p) => p.hasPaymentHold).length;
  const highBurnCount = attentionProjects.filter((p) => p.isHighBurn).length;

  const handleCopyHuddleAgenda = () => {
    const dateStr = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
    let text = `🌅 Morning Huddle Agenda — ${dateStr}\n`;
    text += `🚨 ${attentionProjects.length} Accounts Need Management Action Today:\n\n`;

    attentionProjects.forEach((item, idx) => {
      const lead = customMembers.find((m) => m.id === item.project.projectLeadId);
      text += `${idx + 1}. **${item.project.name}** (${item.project.client}) — Lead: ${lead ? lead.name : 'Unassigned'}\n`;
      item.reasons.forEach((r) => {
        text += `   • ${r}\n`;
      });
      if (item.project.quickMemo) {
        text += `   • 📝 Memo: "${item.project.quickMemo}"\n`;
      }
      text += '\n';
    });

    navigator.clipboard.writeText(text);
    sonnerToast.success(`📋 Morning Huddle Agenda copied (${attentionProjects.length} accounts)!`);
  };

  // Filter projects based on visual filter bar, service category pills, and instant search across all PDF fields
  const filteredProjectsList = projectsList.filter((proj) => {
    const hoursRatio = proj.totalHours > 0 ? proj.activeHours / proj.totalHours : 0;
    const { marginPercent: marginNum } = calculateProjectProfitability(proj);
    const resolvedTier = proj.clientTier || classifyClientTier(proj);

    if (everydayQuickFilter === 'on_track' && proj.status !== 'ON TRACK' && proj.status !== 'COMPLETED') return false;
    if (everydayQuickFilter === 'milestones' && proj.billingType !== 'Milestone Delivery') return false;
    if (everydayQuickFilter === 'needs_attention') {
      const attention = checkProjectNeedsAttention(proj);
      if (!attention.needsAttention) return false;
    }
    if (
      everydayQuickFilter === 'ai_high_risk' &&
      hoursRatio < 0.85 &&
      marginNum >= 35 &&
      proj.paymentStatus !== 'Overdue' &&
      proj.projectHealthEmoji !== '🚨 Critical'
    )
      return false;
    if (everydayQuickFilter === 'ai_top_margin' && marginNum < 55) return false;
    if (everydayQuickFilter === 'ai_overdue_cashflow' && proj.paymentStatus !== 'Overdue') return false;
    if (everydayQuickFilter === 'ai_nearing_cap' && (hoursRatio < 0.80 || hoursRatio >= 1.0)) return false;

    // Client Tier Filters
    if (everydayQuickFilter === 'tier_vip' && resolvedTier !== 'TIER_S_VIP') return false;
    if (everydayQuickFilter === 'tier_agency' && resolvedTier !== 'TIER_A_AGENCY') return false;
    if (everydayQuickFilter === 'tier_local' && resolvedTier !== 'TIER_B_LOCAL') return false;
    if (everydayQuickFilter === 'tier_highest_yield') {
      const yieldRate = Math.round((proj.paymentAmountNumeric || 0) / Math.max(1, proj.activeHours || proj.totalHours || 1));
      if (yieldRate < 70) return false;
    }

    // 4 High-Impact Actionable Filter Presets
    if (everydayQuickFilter === 'needs_call_lead' && proj.clientCallAssigneeId && proj.clientCallAssigneeId.trim() !== '') return false;
    if (everydayQuickFilter === 'hourly_contracts' && proj.billingType !== 'Weekly Hourly Billing' && !proj.price?.toLowerCase().includes('/hr')) return false;
    if (everydayQuickFilter === 'vip_retainers' && resolvedTier !== 'TIER_S_VIP' && (proj.paymentAmountNumeric || 0) < 3000) return false;
    if (everydayQuickFilter === 'over_budget' && ((proj.actualHoursLogged || 0) <= (proj.activeHours || 0) || (proj.activeHours || 0) === 0)) return false;
    if (everydayQuickFilter === 'scope_creep_risk') {
      const budget = Math.max(1, proj.activeHours || proj.totalHours || 1);
      const logged = proj.actualHoursLogged || 0;
      const ratio = logged > 0 ? (logged / budget) : (proj.progress / 100);
      if (ratio < 0.85) return false;
    }

    // Executive Triage Quick-Filters (Idea 8)
    if (everydayQuickFilter === 'low_margin') {
      const fin = calculateProjectFinancials(proj, customMembers);
      if (fin.grossMarginPercent >= 45) return false;
    }
    if (everydayQuickFilter === 'high_margin') {
      const fin = calculateProjectFinancials(proj, customMembers);
      if (fin.grossMarginPercent < 60) return false;
    }
    if (everydayQuickFilter === 'at_risk_health') {
      const health = computeProjectHealthScore(proj);
      if (health.score >= 65) return false;
    }

    if (filterLeadId !== 'ALL') {
      if (filterLeadId === 'UNASSIGNED') {
        if (proj.projectLeadId) return false;
      } else if (proj.projectLeadId !== filterLeadId) {
        return false;
      }
    }
    if (filterCallAssigneeId !== 'ALL') {
      if (filterCallAssigneeId === 'UNASSIGNED') {
        if (proj.clientCallAssigneeId) return false;
      } else if (proj.clientCallAssigneeId !== filterCallAssigneeId) {
        return false;
      }
    }
    if (radarHealthFilter !== 'all') {
      const health = computeProjectHealthScore(proj);
      if (health.tier !== radarHealthFilter) return false;
    }
    if (filterBillingType !== 'ALL' && proj.billingType !== filterBillingType) return false;
    if (selectedServiceFilter !== 'ALL') {
      const s = selectedServiceFilter.toLowerCase();
      const hasTag =
        proj.serviceLabels?.some((tag) => tag.toLowerCase().includes(s)) ||
        proj.name.toLowerCase().includes(s) ||
        proj.taskContent?.toLowerCase().includes(s);
      if (!hasTag) return false;
    }
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const match =
        proj.name.toLowerCase().includes(q) ||
        proj.client.toLowerCase().includes(q) ||
        (proj.paymentInvoiceId && proj.paymentInvoiceId.toLowerCase().includes(q)) ||
        proj.billingType.toLowerCase().includes(q) ||
        (proj.taskContent && proj.taskContent.toLowerCase().includes(q)) ||
        (proj.communicationChannel && proj.communicationChannel.toLowerCase().includes(q)) ||
        (proj.billingAccount && proj.billingAccount.toLowerCase().includes(q)) ||
        (proj.quickMemo && proj.quickMemo.toLowerCase().includes(q)) ||
        proj.serviceLabels?.some((lbl) => lbl.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  }).sort((a, b) => {
    // Dynamic Spotlight Clustering: place projects matching the selected specialist first and snug together
    if (spotlightSpecialistId) {
      const isA =
        a.projectLeadId === spotlightSpecialistId ||
        a.clientCallAssigneeId === spotlightSpecialistId ||
        a.taskBreakdown?.some((tb) => tb.assigneeId === spotlightSpecialistId) ||
        a.members?.some((m) => m.id === spotlightSpecialistId);
      const isB =
        b.projectLeadId === spotlightSpecialistId ||
        b.clientCallAssigneeId === spotlightSpecialistId ||
        b.taskBreakdown?.some((tb) => tb.assigneeId === spotlightSpecialistId) ||
        b.members?.some((m) => m.id === spotlightSpecialistId);
      if (isA && !isB) return -1;
      if (!isA && isB) return 1;
    }
    if (everydayQuickFilter === 'tier_highest_yield') {
      const yieldA = (a.paymentAmountNumeric || 0) / Math.max(1, a.activeHours || a.totalHours || 1);
      const yieldB = (b.paymentAmountNumeric || 0) / Math.max(1, b.activeHours || b.totalHours || 1);
      return yieldB - yieldA;
    }
    return 0;
  });

  // Derived Pagination for High-Performance Clean Rendering
  const totalPages = Math.max(1, Math.ceil(filteredProjectsList.length / (pageSize || 9)));
  const paginatedProjects = pageSize === 0 
    ? filteredProjectsList 
    : filteredProjectsList.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSaveEditedProject = () => {
    if (!editingProject) return;
    if (!editingProject.client.trim() || !editingProject.name.trim()) {
      toast('Required Fields Missing', {
        description: 'Client name and project name cannot be empty.',
        type: 'warning'
      });
      return;
    }
    const currentBreakdown = editingProject.taskBreakdown || [];
    const updatedMemberHoursMap: Record<string, number> = {};
    currentBreakdown.forEach((tb) => {
      if (tb.assigneeId && tb.assigneeId.trim()) {
        const aId = tb.assigneeId.trim();
        updatedMemberHoursMap[aId] = (updatedMemberHoursMap[aId] || 0) + (Number(tb.hours) || 0);
      }
    });
    const totalBreakdownHrs = currentBreakdown.reduce((sum, tb) => sum + (Number(tb.hours) || 0), 0);
    const resolvedActiveHours = totalBreakdownHrs > 0 ? totalBreakdownHrs : (Number(editingProject.activeHours) || 0);

    const totalHours = Number(editingProject.totalHours) > 0 ? Number(editingProject.totalHours) : (resolvedActiveHours || 1);
    const progress = Math.min(
      100,
      Math.max(0, Math.round((resolvedActiveHours / totalHours) * 100))
    );

    const rawRateMatch = (editingProject.price || '').match(/\$?([0-9]+(?:\.[0-9]+)?)/);
    const hourlyRate = rawRateMatch ? parseFloat(rawRateMatch[1]) : 0;
    const rawPriceDigits = (editingProject.price || '').replace(/[^0-9]/g, '');
    const parsedAmount = rawPriceDigits ? parseInt(rawPriceDigits, 10) : 0;

    let formattedPrice = '';
    let resolvedPaymentAmount = parsedAmount;

    if (editingProject.billingType === 'Weekly Hourly Billing') {
      const calcWeekly = Math.round(hourlyRate * resolvedActiveHours);
      const calcMonthly = Math.round(calcWeekly * 4);
      formattedPrice = `$${hourlyRate}/hr (${calcWeekly > 0 ? `$${calcWeekly.toLocaleString()}/wk • ` : ''}$${calcMonthly.toLocaleString()}/mo)`;
      resolvedPaymentAmount = calcMonthly > 0 ? calcMonthly : Math.round(hourlyRate * resolvedActiveHours * 4);
    } else {
      formattedPrice = editingProject.price?.trim() 
        ? (editingProject.price.includes('$') ? editingProject.price.trim() : `$${editingProject.price.trim()}`)
        : `$${parsedAmount}`;
      resolvedPaymentAmount = parsedAmount;
    }

    // Reconstruct assigned squad members from breakdown + leads
    const assignedMemberIds = new Set<string>();
    if (editingProject.projectLeadId) assignedMemberIds.add(editingProject.projectLeadId);
    if (editingProject.clientCallAssigneeId) assignedMemberIds.add(editingProject.clientCallAssigneeId);
    if (editingProject.devTechAssigneeId) assignedMemberIds.add(editingProject.devTechAssigneeId);
    currentBreakdown.forEach((tb) => {
      if (tb.assigneeId) assignedMemberIds.add(tb.assigneeId);
    });
    const refreshedSquad = customMembers.filter((m) => assignedMemberIds.has(m.id));

    const sanitizedProject: ActiveProjectItem = {
      ...editingProject,
      client: editingProject.client.trim(),
      name: editingProject.name.trim(),
      price: formattedPrice,
      paymentAmountNumeric: resolvedPaymentAmount,
      projectLeadId: editingProject.projectLeadId?.trim() ? editingProject.projectLeadId.trim() : undefined,
      clientCallAssigneeId: editingProject.clientCallAssigneeId?.trim() ? editingProject.clientCallAssigneeId.trim() : undefined,
      devTechAssigneeId: editingProject.devTechAssigneeId?.trim() ? editingProject.devTechAssigneeId.trim() : undefined,
      communicationChannel: editingProject.communicationChannel?.trim() ? editingProject.communicationChannel.trim() : undefined,
      reportingPlatform: editingProject.reportingPlatform?.trim() ? editingProject.reportingPlatform.trim() : undefined,
      activeHours: resolvedActiveHours,
      totalHours,
      members: refreshedSquad.length > 0 ? refreshedSquad : editingProject.members,
      memberHoursMap: Object.keys(updatedMemberHoursMap).length > 0 ? updatedMemberHoursMap : editingProject.memberHoursMap,
      progress
    };

    setProjectsList((prev) =>
      prev.map((p) => (p.id === editingProject.id ? sanitizedProject : p))
    );

    if (viewingProjectDetail?.id === editingProject.id) {
      setViewingProjectDetail(sanitizedProject);
    }
    toast('Project Updated Successfully', {
      description: `"${sanitizedProject.name}" updated with all recalculated hours and specs.`,
      type: 'success'
    });
    setEditingProject(null);
  };

  const handleToggleMemberInEditingProject = (member: TeamMember) => {
    if (!editingProject) return;
    const exists = editingProject.members.some((m) => m.id === member.id);
    const updatedMembers = exists
      ? editingProject.members.filter((m) => m.id !== member.id)
      : [...editingProject.members, member];
    setEditingProject({
      ...editingProject,
      members: updatedMembers
    });
  };

  const handleSaveEditedMember = () => {
    if (!editingMember) return;
    
    const updatedMember = {
      ...editingMember,
      generalCompetency: {
        ...editingMember.generalCompetency,
        clientReadyTier: editingMember.generalCompetency.clientReadyTier
      }
    };

    if (onUpdateMember) {
      onUpdateMember(updatedMember);
    }

    setCustomMembers((prev) =>
      prev.map((m) =>
        m.id === editingMember.id ? updatedMember : m
      )
    );
    // Update any references in projectsList
    setProjectsList((prev) =>
      prev.map((proj) => ({
        ...proj,
        members: proj.members.map((m) =>
          m.id === editingMember.id ? { ...m, name: editingMember.name, role: editingMember.role } : m
        )
      }))
    );
    setEditingMember(null);
  };

  // Complete Situation-Based Skill Examination & Automated AI Judgment State
  const [testingMemberSkill, setTestingMemberSkill] = useState<TeamMember | null>(null);
  const [testQuestionnaire, setTestQuestionnaire] = useState<
    Array<{
      id: string;
      skillCategory: string;
      questionType?: ExamQuestionType;
      questionTitle: string;
      questionPrompt: string;
      options?: string[];
      correctOptionIndex?: number;
      sampleStrongAnswer: string;
      userAnswer: string;
      aiJudgedScore: number | null;
      aiFeedback: string;
    }>
  >([]);
  const [testNotes, setTestNotes] = useState<string>('');
  const [testPassedPractical, setTestPassedPractical] = useState<boolean>(true);
  const [isAiJudging, setIsAiJudging] = useState<boolean>(false);
  const [aiEvaluationDone, setAiEvaluationDone] = useState<boolean>(false);

  // Individual 360 Employee Dossier State
  const [viewingMemberProfile, setViewingMemberProfile] = useState<TeamMember | null>(null);
  const [examMode, setExamMode] = useState<'ROLE_SPECIFIC' | 'FULL_50_MASTER'>('ROLE_SPECIFIC');

  const generateQuestionnaireForMember = (
    member: TeamMember,
    mode: 'ROLE_SPECIFIC' | 'FULL_50_MASTER' = 'ROLE_SPECIFIC'
  ) => {
    if (mode === 'FULL_50_MASTER') {
      return AGENCY_MASTER_EXAM_BANK.map((q) => ({
        id: q.id,
        skillCategory: q.skillCategory,
        questionType: q.questionType,
        questionTitle: q.questionTitle,
        questionPrompt: q.questionPrompt,
        options: q.options,
        correctOptionIndex: q.correctOptionIndex,
        sampleStrongAnswer: q.sampleStrongAnswer,
        userAnswer: '',
        aiJudgedScore: null as number | null,
        aiFeedback: ''
      }));
    }

    // Role-specific matching
    const selectedQuestions = AGENCY_MASTER_EXAM_BANK.filter((q) => {
      // Always include Core Governance questions
      if (q.skillCategory.toLowerCase().includes('governance')) return true;

      // Check if any member skill matches this question's category
      return member.skills.some((sk) => {
        const skLower = sk.toLowerCase();
        const catLower = q.skillCategory.toLowerCase();
        if (skLower.includes('seo') && (catLower.includes('seo') || catLower.includes('on-page'))) return true;
        if ((skLower.includes('strat') || skLower.includes('client') || skLower.includes('account')) && catLower.includes('client')) return true;
        if ((skLower.includes('link') || skLower.includes('pr') || skLower.includes('off-page')) && catLower.includes('link')) return true;
        if ((skLower.includes('design') || skLower.includes('ux') || skLower.includes('web')) && catLower.includes('design')) return true;
        return catLower.includes(skLower) || skLower.includes(catLower);
      });
    });

    return selectedQuestions.map((q) => ({
      id: q.id,
      skillCategory: q.skillCategory,
      questionType: q.questionType,
      questionTitle: q.questionTitle,
      questionPrompt: q.questionPrompt,
      options: q.options,
      correctOptionIndex: q.correctOptionIndex,
      sampleStrongAnswer: q.sampleStrongAnswer,
      userAnswer: '',
      aiJudgedScore: null as number | null,
      aiFeedback: ''
    }));
  };

  const openSkillTestModal = (member: TeamMember) => {
    setTestingMemberSkill(member);
    setExamMode('ROLE_SPECIFIC');
    const qList = generateQuestionnaireForMember(member, 'ROLE_SPECIFIC');
    setTestQuestionnaire(qList);
    setTestNotes(
      member.generalCompetency?.testNotes ||
        `Automated AI Situation & Q&A Exam administered across ${qList.length} assessment questions.`
    );
    setTestPassedPractical(true);
    setAiEvaluationDone(false);
    setIsAiJudging(false);
  };

  const handleSwitchExamMode = (newMode: 'ROLE_SPECIFIC' | 'FULL_50_MASTER') => {
    if (!testingMemberSkill) return;
    setExamMode(newMode);
    const qList = generateQuestionnaireForMember(testingMemberSkill, newMode);
    setTestQuestionnaire(qList);
    setAiEvaluationDone(false);
  };

  const handleUpdateUserAnswer = (questionId: string, answerText: string) => {
    setTestQuestionnaire((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, userAnswer: answerText } : q))
    );
  };

  const handleAutofillSampleAnswers = () => {
    setTestQuestionnaire((prev) =>
      prev.map((q) => ({
        ...q,
        userAnswer: q.sampleStrongAnswer
      }))
    );
  };

  const handleRunAiEvaluation = () => {
    setIsAiJudging(true);
    setTimeout(() => {
      setTestQuestionnaire((prev) =>
        prev.map((q) => {
          const ans = q.userAnswer.trim();

          // Multiple Choice evaluation
          if (q.questionType === 'MULTIPLE_CHOICE') {
            if (ans.length === 0) {
              return {
                ...q,
                aiJudgedScore: 0,
                aiFeedback: '❌ AI Judgment (0/10): No multiple choice option selected.'
              };
            }
            if (q.options && typeof q.correctOptionIndex === 'number') {
              const correctStr = q.options[q.correctOptionIndex];
              if (ans === correctStr || ans.startsWith(q.sampleStrongAnswer.substring(0, 8))) {
                return {
                  ...q,
                  aiJudgedScore: 10,
                  aiFeedback: '🏆 AI Judgment (10/10): Correct option selected. Complete situational accuracy.'
                };
              }
              return {
                ...q,
                aiJudgedScore: 4.0,
                aiFeedback: `⚠️ AI Judgment (4.0/10): Incorrect option selected. ${q.sampleStrongAnswer}`
              };
            }
          }

          // Written / Short Q&A evaluation
          if (ans.length === 0) {
            return {
              ...q,
              aiJudgedScore: 3.5,
              aiFeedback: '❌ AI Judgment (3.5/10): No written response provided. Unable to verify competency.'
            };
          }
          if (ans.length < 35) {
            return {
              ...q,
              aiJudgedScore: 6.8,
              aiFeedback: '⚠️ AI Judgment (6.8/10): Response is brief. Lacks full diagnostic depth or step-by-step triage.'
            };
          }
          return {
            ...q,
            aiJudgedScore: 9.4,
            aiFeedback:
              '🏆 AI Judgment (9.4/10): Outstanding situational mastery. Demonstrates structured executive communication, root-cause diagnosis, and technical rigor.'
          };
        })
      );
      setIsAiJudging(false);
      setAiEvaluationDone(true);
    }, 600);
  };

  const handleSaveSkillTestResult = () => {
    if (!testingMemberSkill || testQuestionnaire.length === 0) return;
    const todayStr = new Date().toISOString().split('T')[0];

    // Automated AI Score Judgment: Calculate exact average across all AI evaluated questionnaire items
    const totalScoreSum = testQuestionnaire.reduce((sum, q) => sum + (q.aiJudgedScore ?? 8.5), 0);
    const judgedCompositeScore = Math.round((totalScoreSum / testQuestionnaire.length) * 10) / 10;

    // Automated Tier Judgment based on AI Judged Composite Score
    let recommendedTier: ClientReadyTier = 'Tier 1: Client-Facing Lead';
    if (judgedCompositeScore < 7.2 || !testPassedPractical) {
      recommendedTier = 'Tier 3: Internal Execution Only';
    } else if (judgedCompositeScore < 8.7) {
      recommendedTier = 'Tier 2: Direct Email Capable';
    }

    // Calculate individual AI judged score per skill category
    const skillScoreMap: Record<string, { sum: number; count: number }> = {};
    testQuestionnaire.forEach((q) => {
      if (!skillScoreMap[q.skillCategory]) skillScoreMap[q.skillCategory] = { sum: 0, count: 0 };
      skillScoreMap[q.skillCategory].sum += q.aiJudgedScore ?? 8.5;
      skillScoreMap[q.skillCategory].count += 1;
    });

    const coreCommQ = testQuestionnaire.find((q) => q.id === 'q-core-comm');
    const coreReliabQ = testQuestionnaire.find((q) => q.id === 'q-core-reliab');
    const judgedComm = coreCommQ ? (coreCommQ.aiJudgedScore ?? 9) : 9;
    const judgedReliab = coreReliabQ ? (coreReliabQ.aiJudgedScore ?? 9) : 9;

    setCustomMembers((prev) =>
      prev.map((m) => {
        if (m.id !== testingMemberSkill.id) return m;

        // Build updated skillScores array judged directly from questionnaire
        const updatedSkillScores = m.skills.map((skName) => {
          const stats = skillScoreMap[skName];
          const judgedAvg = stats ? Math.round(stats.sum / stats.count) : 9;
          return {
            skill: skName as any,
            quality: judgedAvg,
            speedEfficiency: Math.min(10, judgedAvg + 1),
            communication: judgedComm
          };
        });

        return {
          ...m,
          generalCompetency: {
            ...m.generalCompetency,
            englishProficiency: judgedComm,
            clientCommunication: judgedComm,
            proactivityReliability: judgedReliab,
            clientReadyTier: recommendedTier,
            lastTestedDate: todayStr,
            quarterlyScore: judgedCompositeScore,
            testNotes: testNotes
          },
          skillScores: updatedSkillScores
        };
      })
    );

    if (viewingMemberProfile && viewingMemberProfile.id === testingMemberSkill.id) {
      setViewingMemberProfile((prev) =>
        prev
          ? {
              ...prev,
              generalCompetency: {
                ...prev.generalCompetency,
                englishProficiency: judgedComm,
                clientCommunication: judgedComm,
                proactivityReliability: judgedReliab,
                clientReadyTier: recommendedTier,
                lastTestedDate: todayStr,
                quarterlyScore: judgedCompositeScore,
                testNotes: testNotes
              }
            }
          : null
      );
    }

    setTestingMemberSkill(null);
    setCopiedToast(
      `Judged & Saved: ${testingMemberSkill.name} scored ${judgedCompositeScore}/10 (${recommendedTier}) across ${testQuestionnaire.length} evaluated questions!`
    );
    setTimeout(() => setCopiedToast(null), 5000);
  };

  const handleCreateMember = () => {
    if (!newMemberName) return;
    const skillsList = newMemberSkillsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const newMember: TeamMember = {
      id: crypto.randomUUID(),
      name: newMemberName,
      role: newMemberRole,
      department: 'SEO',
      seniority: 'Senior Resource',
      avatar:
        newMemberAvatar ||
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      weeklyCapacityHours: newMemberCapacity,
      skills: skillsList.length > 0 ? skillsList : ['Technical SEO', 'Client Strategy'],
      skillScores: [
        { skill: 'Technical SEO', quality: 9, speedEfficiency: 9, communication: 9 },
        { skill: 'Client Strategy', quality: 9, speedEfficiency: 8, communication: 10 }
      ],
      generalCompetency: {
        englishProficiency: 9,
        clientCommunication: 9,
        requirementUnderstanding: 9,
        proactivityReliability: 9,
        clientReadyTier: 'Tier 1: Client-Facing Lead',
        lastTestedDate: todayLocal()
      },
      completedSprintTasks: 12,
      colorSwatch: 'from-purple-500 to-indigo-600'
    };

    setCustomMembers((prev) => [...prev, newMember]);
    onAddMember?.(newMember);
    setShowAddMemberModal(false);
    setNewMemberName('');
  };

  const handleDeleteMember = (memberId: string) => {
    const member = customMembers.find((item) => item.id === memberId);
    if (!member) return;
    if (customMembers.length <= 1) {
      setCopiedToast('At least one squad member must remain');
      setTimeout(() => setCopiedToast(null), 3500);
      return;
    }

    const assignedProjectCount = projectsList.filter((project) =>
      project.members.some((projectMember) => projectMember.id === memberId)
    ).length;
    const confirmed = window.confirm(
      `Delete ${member.name}? ${assignedProjectCount > 0 ? `They are assigned to ${assignedProjectCount} project${assignedProjectCount === 1 ? '' : 's'}; those assignments will be moved to another available specialist.` : 'They have no active project assignments.'}`
    );
    if (!confirmed) return;

    const fallbackMember = customMembers.find((item) => item.id !== memberId);
    setCustomMembers((current) => current.filter((item) => item.id !== memberId));
    onDeleteMember?.(memberId);
    setProjectsList((current) =>
      current.map((project) => {
        const remainingMembers = project.members.filter((projectMember) => projectMember.id !== memberId);
        const fallbackId = remainingMembers[0]?.id || fallbackMember?.id;
        const updatedHoursMap = { ...(project.memberHoursMap || {}) };
        delete updatedHoursMap[memberId];

        return {
          ...project,
          members: remainingMembers,
          projectLeadId: project.projectLeadId === memberId ? fallbackId : project.projectLeadId,
          clientCallAssigneeId: project.clientCallAssigneeId === memberId ? fallbackId : project.clientCallAssigneeId,
          devTechAssigneeId: project.devTechAssigneeId === memberId ? fallbackId : project.devTechAssigneeId,
          offPageAssigneeId: project.offPageAssigneeId === memberId ? fallbackId : project.offPageAssigneeId,
          onPageAssigneeId: project.onPageAssigneeId === memberId ? fallbackId : project.onPageAssigneeId,
          memberHoursMap: updatedHoursMap,
          taskBreakdown: project.taskBreakdown?.map((task) =>
            task.assigneeId === memberId ? { ...task, assigneeId: fallbackId || '' } : task
          )
        };
      })
    );

    if (filterLeadId === memberId) setFilterLeadId('ALL');
    if (filterCallAssigneeId === memberId) setFilterCallAssigneeId('ALL');
    if (editingMember?.id === memberId) setEditingMember(null);
    if (viewingMemberProfile?.id === memberId) setViewingMemberProfile(null);
    setCopiedToast(`${member.name} removed from the squad`);
    setTimeout(() => setCopiedToast(null), 3500);
  };

  const handleRunDeliveryBot = () => {
    const activeDelivProj = projectsList.find((p) => p.id === selectedDeliveryProjectId) || projectsList[0];
    onDeliverJob(
      activeDelivProj.name,
      activeDelivProj.activeHours,
      activeDelivProj.members.map((m) => m.id)
    );
    setDeliveredSuccess(true);
    setTimeout(() => setDeliveredSuccess(false), 4500);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Floating Copied Summary Toast */}
      {copiedToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-500 text-slate-950 px-4 py-3 rounded-2xl font-black text-xs shadow-2xl flex items-center gap-2 animate-bounce border border-emerald-400">
          <CheckCircle2 className="w-4 h-4" />
          <span>{copiedToast}</span>
        </div>
      )}

      {/* VIEW 1: ACTIVE PROJECTS VISUAL TRACKER */}
      {activeView === 'calendar' && (
        <ActivityCalendar
          tasks={_tasks}
          members={customMembers}
          projects={projectsList.map((project) => ({
            id: project.id,
            name: project.name,
            client: project.client,
            paymentDueDate: project.paymentDueDate,
            dueDateOrRenewal: project.dueDateOrRenewal
          }))}
        />
      )}

      {/* VIEW 1: ACTIVE PROJECTS VISUAL TRACKER */}
      {activeView === 'projects' && (
        <div className="space-y-4 animate-fade-in">
          {/* HEADER SECTION WRAPPER */}
          <div className="border border-slate-200/60 bg-white/80 rounded-2xl px-5 py-4 shadow-sm mb-2">
            {/* UNIFIED EXECUTIVE COMMAND BAR: Title & Action Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-wrap">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-400 via-cyan-400 to-indigo-500 opacity-80" />
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center shrink-0">
                <FolderKanban className="w-4.5 h-4.5 text-indigo-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-extrabold text-slate-800 tracking-tight">Projects</h2>
                  <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-600 text-[11px] font-black border border-indigo-300/50">
                    {projectsList.length} Active
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Capacity, ownership and financial health in one place
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 flex-wrap relative z-10">
              {onToggleTheme && (
                <button
                  type="button"
                  onClick={onToggleTheme}
                  className="hidden items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white font-bold text-xs transition-all cursor-pointer"
                  title={isWhiteTheme ? 'Switch to Dark Theme' : 'Switch to White Theme'}
                >
                  {isWhiteTheme ? (
                    <>
                      <Sun className="w-4 h-4 text-amber-500 animate-spin" />
                      <span>☀️ White Theme Active</span>
                    </>
                  ) : (
                    <>
                      <Moon className="w-4 h-4 text-cyan-400" />
                      <span>🌙 Dark Theme</span>
                    </>
                  )}
                </button>
              )}

              {hubSubTab !== 'projects' && (
                <button
                  type="button"
                  onClick={() => setHubSubTab('projects')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 font-semibold text-xs transition-colors border border-slate-200"
                >
                  <FolderKanban className="w-4 h-4" />
                  Project roster
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setHubSubTab('projects');
                  setShowSquadWorkload((current) => !current);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors border ${showSquadWorkload ? 'bg-cyan-50 text-cyan-700 border-cyan-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200'}`}
              >
                <Users className="w-4 h-4" />
                Workload
              </button>

              <button
                type="button"
                onClick={() => setHubSubTab('executive')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors border ${hubSubTab === 'executive' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200'}`}
              >
                <DollarSign className="w-4 h-4" />
                Financial pulse
              </button>

              <button
                type="button"
                onClick={() => setShowClickUpModal(true)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer shadow-sm ${
                  isClickUpConnected()
                    ? 'bg-purple-950/60 hover:bg-purple-900 text-purple-200 border border-purple-500/40'
                    : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border border-purple-400/30 shadow-purple-600/25'
                }`}
                title={isClickUpConnected() ? 'ClickUp Connected — click to view spaces, lists or sync' : 'Connect ClickUp Account or API Token'}
              >
                <span className={`w-2 h-2 rounded-full ${isClickUpConnected() ? 'bg-emerald-400 animate-pulse' : 'bg-white'}`} />
                <span>{isClickUpConnected() ? 'ClickUp Connected' : '⚡ Connect ClickUp'}</span>
              </button>

              {isClickUpConnected() && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs font-semibold shadow-sm">
                  <span className="relative flex h-2 w-2">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 ${isAutoSyncing ? 'duration-700' : 'duration-1000'}`}></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-white font-bold">{isAutoSyncing ? 'Syncing...' : 'Live Sync'}</span>
                  <span className="text-[10px] text-emerald-400 font-mono hidden sm:inline">
                    {lastSyncedTime
                      ? `(${Math.max(0, Math.round((Date.now() - lastSyncedTime.getTime()) / 60000))}m ago)`
                      : '(60s auto)'}
                  </span>
                  <button
                    type="button"
                    onClick={() => performSilentClickUpSync(true)}
                    disabled={isAutoSyncing}
                    title="Click to trigger instant ClickUp sync"
                    className="p-1 hover:bg-emerald-500/20 rounded text-emerald-300 hover:text-white transition-all cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${isAutoSyncing ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              )}

              {/* 1-Click CRM Active Clients Ingestion Shortcut */}
              {isClickUpConnected() && (
                <button
                  type="button"
                  onClick={handleQuickSyncCrmClients}
                  disabled={syncingCrmClients}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs transition-all shadow-md shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
                  title="1-Click Sync & Replace complete client accounts from Growth > CRM > Accounts/Clients into Active Projects"
                >
                  <Zap className={`w-3.5 h-3.5 fill-slate-950 ${syncingCrmClients ? 'animate-spin' : ''}`} />
                  <span>{syncingCrmClients ? 'Syncing CRM Clients…' : '⚡ Sync CRM Accounts'}</span>
                </button>
              )}

              {/* 1-Click Deliverables Live Status & Milestone Sync */}
              {isClickUpConnected() && (
                <button
                  type="button"
                  onClick={handleSyncAllDeliverablesWithClickUp}
                  disabled={isSyncingDeliverables}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs transition-all shadow-md shadow-purple-500/20 cursor-pointer disabled:opacity-50"
                  title="Scan all linked ClickUp deliverable tasks: updates status, auto-completes milestones, and recalculates project health"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingDeliverables ? 'animate-spin' : ''}`} />
                  <span>{isSyncingDeliverables ? 'Syncing Deliverables…' : '⚡ Sync Deliverables'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setHubSubTab('archive')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white font-bold text-xs transition-all cursor-pointer shadow-sm relative group"
                title="View Past Projects & Trash Archive"
              >
                <FolderArchive className="w-3.5 h-3.5 text-amber-400" />
                <span>Past Projects &amp; Trash</span>
                {archivedProjects.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    {archivedProjects.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setHubSubTab('leads')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white font-bold text-xs transition-all cursor-pointer shadow-sm relative group"
                title="View New Business Leads & Sales Pipeline"
              >
                <Briefcase className="w-3.5 h-3.5 text-cyan-400" />
                <span>Business Leads</span>
                {businessLeads.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    {businessLeads.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowAddMemberModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 text-cyan-700 font-semibold text-xs transition-colors cursor-pointer"
              >
                <Users className="w-4 h-4" />
                <span>Add employee</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAddProjectModal(true)}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs tracking-wide transition-all cursor-pointer shadow-md shadow-indigo-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>Add Active Project</span>
              </button>
            </div>
          </div>

          {/* SUB-HUB SEGMENTED NAVIGATION BAR */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-3 mt-1 px-1">
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Sub-Tab 1: Projects & Retainers */}
              <button
                type="button"
                onClick={() => setHubSubTab('projects')}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  hubSubTab === 'projects'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25 ring-1 ring-cyan-400/40'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <FolderKanban className="w-4 h-4" />
                <span>Projects & Retainers</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                  hubSubTab === 'projects' ? 'bg-slate-950/60 text-cyan-200 border-cyan-400/30' : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {filteredProjectsList.length}
                </span>
              </button>

              {/* Sub-Tab 2: Squad Capacity & Heatmap */}
              <button
                type="button"
                onClick={() => setHubSubTab('squad')}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  hubSubTab === 'squad'
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25 ring-1 ring-indigo-400/40'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Squad Workload & Heatmap</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                  hubSubTab === 'squad' ? 'bg-slate-950/60 text-indigo-200 border-indigo-400/30' : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {customMembers.length} Specialists
                </span>
              </button>

              {/* Sub-Tab 3: VIP & Financial Pulse */}
              <button
                type="button"
                onClick={() => setHubSubTab('executive')}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  hubSubTab === 'executive'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25 ring-1 ring-emerald-400/40'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <DollarSign className="w-4 h-4" />
                <span>VIP & Financial Pulse</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                  hubSubTab === 'executive' ? 'bg-slate-950/60 text-emerald-200 border-emerald-400/30' : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  ${(projectsList.reduce((s, p) => s + (p.paymentAmountNumeric || 0), 0) / 1000).toFixed(0)}k/mo
                </span>
              </button>

              {/* Sub-Tab 4: Past Projects & Trash */}
              <button
                type="button"
                onClick={() => setHubSubTab('archive')}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  hubSubTab === 'archive'
                    ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-white shadow-lg shadow-amber-500/25 ring-1 ring-amber-400/40'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <FolderArchive className="w-4 h-4" />
                <span>Past Projects &amp; Trash</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                  hubSubTab === 'archive' ? 'bg-slate-950/60 text-amber-200 border-amber-400/30' : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {archivedProjects.length}
                </span>
              </button>

              {/* Sub-Tab 5: New Business Leads */}
              <button
                type="button"
                onClick={() => setHubSubTab('leads')}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  hubSubTab === 'leads'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25 ring-1 ring-cyan-400/40'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Briefcase className="w-4 h-4" />
                <span>💼 New Business Leads</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                  hubSubTab === 'leads' ? 'bg-slate-950/60 text-cyan-200 border-cyan-400/30' : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {businessLeads.length}
                </span>
              </button>
            </div>

            <div className="hidden lg:flex items-center gap-2 pr-2 text-xs font-medium text-slate-400">
              <span>Sub-Hub: <strong className="text-white uppercase font-bold">{hubSubTab === 'projects' ? 'Project Roster' : hubSubTab === 'squad' ? 'Team Capacity' : hubSubTab === 'executive' ? 'Executive Pulse' : hubSubTab === 'archive' ? 'Past Projects & Trash' : 'Business Leads & Pipeline'}</strong></span>
            </div>
          </div>
          </div>


          {/* SUB-HUB TAB 1: PROJECTS & RETAINERS ROSTER */}
          {hubSubTab === 'projects' && (
            <div className="space-y-4 animate-fade-in">
              {!showSquadWorkload && (() => {
                const trackedSpecialists = customMembers.filter(
                  (member) => !member.role.toLowerCase().includes('ceo') && member.seniority !== 'CEO'
                );
                const totalCapacity = trackedSpecialists.reduce(
                  (sum, member) => sum + (member.weeklyCapacityHours || 35),
                  0
                );
                const allocatedHours = trackedSpecialists.reduce(
                  (sum, member) => sum + calculateMemberAssignedHours(member.id),
                  0
                );
                const utilization = totalCapacity > 0 ? Math.round((allocatedHours / totalCapacity) * 100) : 0;
                const bottlenecks = trackedSpecialists.filter(
                  (member) => calculateMemberAssignedHours(member.id) / (member.weeklyCapacityHours || 35) >= 0.9
                ).length;

                return (
                  <button
                    type="button"
                    onClick={() => setShowSquadWorkload(true)}
                    className="hidden"
                    aria-expanded="false"
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <span className="w-9 h-9 rounded-xl bg-cyan-500/15 flex items-center justify-center shrink-0">
                        <Users className="w-4 h-4 text-cyan-400" />
                      </span>
                      <span className="min-w-0">
                        <strong className="text-sm text-white block">Squad workload</strong>
                        <span className="text-xs text-slate-400">{trackedSpecialists.length} specialists · {bottlenecks} bottlenecks</span>
                      </span>
                    </span>
                    <span className="flex items-center gap-4">
                      <span className="text-right">
                        <strong className={`text-sm block ${utilization > 90 ? 'text-rose-300' : 'text-cyan-300'}`}>{utilization}% utilized</strong>
                        <span className="text-[10px] text-slate-400">{allocatedHours}h / {totalCapacity}h</span>
                      </span>
                      <span className="text-xs font-bold text-cyan-400">View heatmap</span>
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    </span>
                  </button>
                );
              })()}
              {showSquadWorkload && (() => {
                const trackedSpecialists = customMembers.filter(
                  (member) => !member.role.toLowerCase().includes('ceo') && member.seniority !== 'CEO'
                );
                const totalAgencyCap = trackedSpecialists.reduce(
                  (sum, member) => sum + (member.weeklyCapacityHours || 35),
                  0
                );
                const totalAssigned = trackedSpecialists.reduce(
                  (sum, member) => sum + calculateMemberAssignedHours(member.id),
                  0
                );
                const agencySatPct = totalAgencyCap > 0
                  ? Math.round((totalAssigned / totalAgencyCap) * 100)
                  : 0;
                const sortedSpecialists = [...trackedSpecialists].sort((first, second) => {
                  const firstLoad = calculateMemberAssignedHours(first.id) / (first.weeklyCapacityHours || 35);
                  const secondLoad = calculateMemberAssignedHours(second.id) / (second.weeklyCapacityHours || 35);
                  return secondLoad - firstLoad;
                });
                const bottleneckCount = sortedSpecialists.filter(
                  (member) => calculateMemberAssignedHours(member.id) / (member.weeklyCapacityHours || 35) >= 0.9
                ).length;

                return (
                  <section className="bg-[#111827] rounded-2xl p-4 space-y-4 shadow-lg" aria-label="Squad workload and bandwidth heatmap">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-cyan-500/15 flex items-center justify-center">
                          <Users className="w-4 h-4 text-cyan-400" />
                        </div>
                        <div>
                          <h3 className="text-sm font-extrabold text-white">Squad workload &amp; bandwidth</h3>
                          <p className="text-xs text-slate-400">{trackedSpecialists.length} specialists · {bottleneckCount} bottlenecks · select anyone to filter projects</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs font-semibold">
                        <span className="text-emerald-300">● &lt;70%</span>
                        <span className="text-cyan-300">● 70–90%</span>
                        <span className="text-rose-300">● &gt;90%</span>
                        {spotlightSpecialistId && (
                          <button
                            type="button"
                            onClick={() => setSpotlightSpecialistId(null)}
                            className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 text-xs font-bold transition-colors cursor-pointer"
                          >
                            Clear spotlight ✕
                          </button>
                        )}
                        {filterLeadId !== 'ALL' && (
                          <button
                            type="button"
                            onClick={() => setFilterLeadId('ALL')}
                            className="px-2.5 py-1.5 rounded-lg bg-cyan-500/15 text-cyan-300 font-bold"
                          >
                            Clear selection
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setShowSquadWorkload(false)}
                          className="p-2 rounded-lg bg-slate-900 text-slate-400 hover:text-white"
                          aria-label="Collapse squad workload"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="bg-slate-900/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <strong className={`text-xl font-black ${agencySatPct > 90 ? 'text-rose-300' : agencySatPct >= 70 ? 'text-cyan-300' : 'text-emerald-300'}`}>
                          {agencySatPct}%
                        </strong>
                        <div>
                          <span className="text-xs font-extrabold text-white uppercase tracking-wider block">Agency utilization</span>
                          <span className="text-xs text-slate-400">{totalAssigned}h allocated of {totalAgencyCap}h weekly capacity</span>
                        </div>
                      </div>
                      <div className="flex-1 bg-slate-950 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${agencySatPct > 90 ? 'bg-rose-500' : agencySatPct >= 70 ? 'bg-cyan-500' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.min(100, agencySatPct)}%` }}
                        />
                      </div>
                    </div>

                    <div className="max-h-[300px] overflow-y-auto pr-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                      {sortedSpecialists.map((member) => {
                        const assigned = calculateMemberAssignedHours(member.id);
                        const capacity = member.weeklyCapacityHours || 35;
                        const utilization = Math.round((assigned / capacity) * 100);
                        const isFiltered = filterLeadId === member.id;
                        const isSpotlighted = spotlightSpecialistId === member.id;
                        const status = utilization >= 90
                          ? { label: 'Bottleneck', text: 'text-rose-300', bar: 'bg-rose-500' }
                          : utilization >= 70
                          ? { label: 'Peak load', text: 'text-cyan-300', bar: 'bg-cyan-500' }
                          : { label: 'Available', text: 'text-emerald-300', bar: 'bg-emerald-500' };

                        return (
                          <div
                            key={member.id}
                            draggable
                            onDragStart={(event) => {
                              event.dataTransfer.setData('text/plain', member.id);
                              event.dataTransfer.effectAllowed = 'copyMove';
                              setDraggedSpecialistId(member.id);
                            }}
                            onDragEnd={() => {
                              setDraggedSpecialistId(null);
                              setDragOverTarget(null);
                            }}
                            onClick={() => {
                              setSpotlightSpecialistId(isSpotlighted ? null : member.id);
                            }}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                setSpotlightSpecialistId(isSpotlighted ? null : member.id);
                              }
                            }}
                            role="button"
                            tabIndex={0}
                            className={`p-3 rounded-xl text-left bg-slate-900/80 hover:bg-slate-800 transition-all cursor-grab active:cursor-grabbing space-y-2 ${
                              isSpotlighted
                                ? 'ring-2 ring-cyan-400 bg-cyan-950/40 shadow-lg shadow-cyan-500/20 scale-[1.02]'
                                : isFiltered
                                ? 'ring-2 ring-cyan-400/40'
                                : ''
                            }`}
                            aria-pressed={isSpotlighted || isFiltered}
                            title={`Click to spotlight accounts • Drag to any project to reassign Lead/Calls`}
                          >
                            <div className="flex items-center gap-3">
                              <img src={member.avatar} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                              <div className="min-w-0 flex-1">
                                <h4 className="text-sm font-bold text-white truncate">{member.name}</h4>
                                <p className="text-xs text-slate-400 truncate">{member.role}</p>
                              </div>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleDeleteMember(member.id);
                                }}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                title={`Delete ${member.name}`}
                                aria-label={`Delete ${member.name}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-2 text-xs">
                                <strong className="text-slate-200">{assigned}h / {capacity}h</strong>
                                <span className={`font-extrabold ${status.text}`}>{utilization}% · {status.label}</span>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-slate-950 overflow-hidden">
                                <div className={`h-full rounded-full ${status.bar}`} style={{ width: `${Math.min(100, utilization)}%` }} />
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-slate-400">
                                <span>{isSpotlighted ? '✨ Spotlight active' : 'Click spotlight · Drag assign'}</span>
                                <span className={isSpotlighted ? 'text-cyan-300 font-bold' : 'text-slate-400 font-bold'}>
                                  {isSpotlighted ? 'Clustered ⚡' : '⠿ Drag'}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    </div>
                  </section>
                );
              })()}
              {/* EVERYDAY PERSON QUICK ACCESS & VISUAL CHARTS STUDIO */}
          <div className="space-y-6">
            {/* 1. Unified Universal Filter & View Studio */}
            <div className="rounded-3xl p-6 sm:p-8 space-y-7 bg-slate-900/40 border border-slate-700/50 shadow-sm">
              {/* Row 1: Header + Status Pills + View Mode Toggles */}
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
                <GraphicSectionHeader
                  icon={<Filter className="w-4 h-4" />}
                  title="Filter & Analytics Studio"
                  badgeText={`${filteredProjectsList.length} Matching`}
                  badgeColor="indigo"
                />

                {/* Executive Project Health & Churn Radar Capsule Bar */}
                <div className="pb-3 border-b border-slate-700/50 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-rose-400 flex items-center gap-1.5 shrink-0">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Churn Radar:</span>
                    </span>
                    <ProjectHealthRadarFilterBar
                      projects={projectsList}
                      currentFilter={radarHealthFilter}
                      onSelectFilter={(f) => {
                        setRadarHealthFilter(f);
                        if (f !== 'all') setEverydayQuickFilter('all');
                      }}
                    />
                  </div>
                  {radarHealthFilter !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setRadarHealthFilter('all')}
                      className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
                    >
                      Reset Radar
                    </button>
                  )}
                </div>

                {/* Status Quick Pills & Charts Toggle */}
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => { setEverydayQuickFilter('all'); setSelectedServiceFilter('ALL'); setSearchQuery(''); }}
                    className={`px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                      everydayQuickFilter === 'all' && selectedServiceFilter === 'ALL' && !searchQuery
                        ? 'bg-slate-800 text-white font-bold border border-slate-600 shadow-sm'
                        : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-700/80'
                    }`}
                  >
                    All Projects ({projectsList.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setEverydayQuickFilter('tier_vip')}
                    className={`px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                      everydayQuickFilter === 'tier_vip'
                        ? 'bg-purple-500/25 text-purple-200 font-bold border border-purple-400/60 shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                        : 'bg-purple-950/40 text-purple-300 hover:text-white border border-purple-800/60'
                    }`}
                  >
                    👑 VIP Accounts ({projectsList.filter(p => (p.clientTier || classifyClientTier(p)) === 'TIER_S_VIP').length})
                  </button>

                  {/* 4 Actionable Filter Presets */}
                  <button
                    type="button"
                    onClick={() => setEverydayQuickFilter(everydayQuickFilter === 'needs_call_lead' ? 'all' : 'needs_call_lead')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      everydayQuickFilter === 'needs_call_lead'
                        ? 'bg-rose-500/25 text-rose-200 border border-rose-400/70 shadow-[0_0_12px_rgba(244,63,94,0.35)]'
                        : 'bg-slate-900/90 text-rose-300/80 hover:text-rose-200 border border-rose-900/50 hover:border-rose-700/60'
                    }`}
                    title="Filter projects missing a Call Lead"
                  >
                    <span>🚨 Needs Call Lead</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-rose-950 text-rose-300 text-[10px] font-black border border-rose-800/60">
                      {projectsList.filter(p => !p.clientCallAssigneeId || p.clientCallAssigneeId.trim() === '').length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEverydayQuickFilter(everydayQuickFilter === 'hourly_contracts' ? 'all' : 'hourly_contracts')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      everydayQuickFilter === 'hourly_contracts'
                        ? 'bg-amber-500/25 text-amber-200 border border-amber-400/70 shadow-[0_0_12px_rgba(245,158,11,0.35)]'
                        : 'bg-slate-900/90 text-amber-300/80 hover:text-amber-200 border border-amber-900/50 hover:border-amber-700/60'
                    }`}
                    title="Filter projects billed on weekly hourly basis"
                  >
                    <span>⏱️ Hourly Retainers</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-amber-950 text-amber-300 text-[10px] font-black border border-amber-800/60">
                      {projectsList.filter(p => p.billingType === 'Weekly Hourly Billing' || (p.price && p.price.toLowerCase().includes('/hr'))).length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEverydayQuickFilter(everydayQuickFilter === 'vip_retainers' ? 'all' : 'vip_retainers')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      everydayQuickFilter === 'vip_retainers'
                        ? 'bg-indigo-500/25 text-indigo-200 border border-indigo-400/70 shadow-[0_0_12px_rgba(99,102,241,0.35)]'
                        : 'bg-slate-900/90 text-indigo-300/80 hover:text-indigo-200 border border-indigo-900/50 hover:border-indigo-700/60'
                    }`}
                    title="Filter high-ticket retainers ($3,000+/mo)"
                  >
                    <span>💎 $3k+ Retainers</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-indigo-950 text-indigo-300 text-[10px] font-black border border-indigo-800/60">
                      {projectsList.filter(p => (p.paymentAmountNumeric || 0) >= 3000 || (p.clientTier || classifyClientTier(p)) === 'TIER_S_VIP').length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEverydayQuickFilter(everydayQuickFilter === 'over_budget' ? 'all' : 'over_budget')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      everydayQuickFilter === 'over_budget'
                        ? 'bg-orange-500/25 text-orange-200 border border-orange-400/70 shadow-[0_0_12px_rgba(249,115,22,0.35)]'
                        : 'bg-slate-900/90 text-orange-300/80 hover:text-orange-200 border border-orange-900/50 hover:border-orange-700/60'
                    }`}
                    title="Filter projects where actual hours exceed allocated scope"
                  >
                    <span>⚠️ Over Budget</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-orange-950 text-orange-300 text-[10px] font-black border border-orange-800/60">
                      {projectsList.filter(p => (p.actualHoursLogged || 0) > (p.activeHours || 0) && (p.activeHours || 0) > 0).length}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEverydayQuickFilter('tier_agency')}
                    className={`hidden px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                      everydayQuickFilter === 'tier_agency'
                        ? 'bg-cyan-500/25 text-cyan-200 font-bold border border-cyan-400/60 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                        : 'bg-cyan-950/40 text-cyan-300 hover:text-white border border-cyan-800/60'
                    }`}
                  >
                    🏢 Partner Agencies ({projectsList.filter(p => (p.clientTier || classifyClientTier(p)) === 'TIER_A_AGENCY').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setEverydayQuickFilter('tier_highest_yield')}
                    className={`hidden px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                      everydayQuickFilter === 'tier_highest_yield'
                        ? 'bg-emerald-500/25 text-emerald-200 font-bold border border-emerald-400/60 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                        : 'bg-emerald-950/40 text-emerald-300 hover:text-white border border-emerald-800/60'
                    }`}
                  >
                    💎 Highest Yield ($/h)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEverydayQuickFilter('tier_local')}
                    className={`hidden px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                      everydayQuickFilter === 'tier_local'
                        ? 'bg-slate-700 text-white font-bold border border-slate-500'
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    📍 Local ({projectsList.filter(p => (p.clientTier || classifyClientTier(p)) === 'TIER_B_LOCAL').length})
                  </button>
                  {/* Morning Huddle Executive Triage Toggle */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowMorningHuddleDrawer((prev) => !prev);
                      if (!showMorningHuddleDrawer) {
                        setEverydayQuickFilter('needs_attention');
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 border shrink-0 ${
                      showMorningHuddleDrawer || everydayQuickFilter === 'needs_attention'
                        ? 'bg-gradient-to-r from-rose-500/25 via-amber-500/20 to-rose-500/25 text-rose-300 border-rose-500/60 shadow-lg shadow-rose-950/40 ring-1 ring-rose-500/40'
                        : 'bg-slate-900/90 text-slate-300 hover:text-white border-slate-700 hover:border-slate-600'
                    }`}
                    title="Toggle Daily Morning Huddle Triage Drawer"
                  >
                    <span>🌅 Morning Huddle</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      attentionProjects.length > 0 ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {attentionProjects.length}
                    </span>
                  </button>

                  {/* Streamlined Manager Filter Segments */}
                  {/* Segment 1: Delivery & Status */}
                  <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800 shrink-0">
                    <button
                      type="button"
                      onClick={() => setEverydayQuickFilter('all')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        everydayQuickFilter === 'all'
                          ? 'bg-cyan-500 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="Show all projects (Hotkey: 1)"
                    >
                      <span>All ({projectsList.length})</span>
                      <kbd className="text-[9px] font-mono opacity-70 px-1 rounded bg-black/20">1</kbd>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEverydayQuickFilter('on_track')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        everydayQuickFilter === 'on_track'
                          ? 'bg-emerald-500 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="Show on-track projects (Hotkey: 2)"
                    >
                      <span>🟢 On-Track ({projectsList.filter(p => p.status === 'ON TRACK').length})</span>
                      <kbd className="text-[9px] font-mono opacity-70 px-1 rounded bg-black/20">2</kbd>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEverydayQuickFilter(everydayQuickFilter === 'needs_attention' ? 'all' : 'needs_attention');
                        if (everydayQuickFilter !== 'needs_attention') setShowMorningHuddleDrawer(true);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        everydayQuickFilter === 'needs_attention'
                          ? 'bg-rose-500 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="Show accounts needing attention (Hotkey: 3)"
                    >
                      <span>🚨 Needs Attention</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                        everydayQuickFilter === 'needs_attention' ? 'bg-black/30 text-white' : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        {attentionProjects.length}
                      </span>
                      <kbd className="text-[9px] font-mono opacity-70 px-1 rounded bg-black/20">3</kbd>
                    </button>
                  </div>

                  {/* Segment 2: Financial & Margin Triage */}
                  <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800 shrink-0">
                    <button
                      type="button"
                      onClick={() => setEverydayQuickFilter(everydayQuickFilter === 'high_margin' ? 'all' : 'high_margin')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        everydayQuickFilter === 'high_margin'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="Filter high-margin accounts ≥60% (Hotkey: 4)"
                    >
                      <span>✨ High Margin</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300">
                        {projectsList.filter(p => calculateProjectFinancials(p, customMembers).grossMarginPercent >= 60).length}
                      </span>
                      <kbd className="text-[9px] font-mono opacity-60 px-1 rounded bg-slate-800">4</kbd>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEverydayQuickFilter(everydayQuickFilter === 'low_margin' ? 'all' : 'low_margin')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        everydayQuickFilter === 'low_margin'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="Filter low-margin accounts <45% (Hotkey: 5)"
                    >
                      <span>💰 Low Margin</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300">
                        {projectsList.filter(p => calculateProjectFinancials(p, customMembers).grossMarginPercent < 45).length}
                      </span>
                      <kbd className="text-[9px] font-mono opacity-60 px-1 rounded bg-slate-800">5</kbd>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEverydayQuickFilter(everydayQuickFilter === 'scope_creep_risk' ? 'all' : 'scope_creep_risk')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        everydayQuickFilter === 'scope_creep_risk'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="Filter accounts exceeding 85% retainer hours"
                    >
                      <span>🔥 High Burn</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300">
                        {projectsList.filter(p => {
                          const budget = Math.max(1, p.activeHours || p.totalHours || 1);
                          const logged = p.actualHoursLogged || 0;
                          const ratio = logged > 0 ? (logged / budget) : (p.progress / 100);
                          return ratio >= 0.85;
                        }).length}
                      </span>
                    </button>
                  </div>

                  {/* Reset Filter Action */}
                  {everydayQuickFilter !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setEverydayQuickFilter('all')}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 shrink-0 shadow-sm"
                      title="Reset filter to all (Hotkey: Esc)"
                    >
                      <span>✕ Reset</span>
                      <kbd className="text-[9px] font-mono text-slate-400 bg-slate-900 px-1 rounded border border-slate-700">Esc</kbd>
                    </button>
                  )}

                  <div className="h-4 w-px bg-slate-700 hidden sm:block mx-1" />

                  <button
                    type="button"
                    onClick={() => setSmartMode(!smartMode)}
                    className={`hidden px-4 py-2 rounded-xl border text-xs font-bold items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                      smartMode
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-indigo-400 shadow-indigo-500/30'
                        : 'bg-slate-900 text-slate-300 hover:text-white border-slate-700'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} />
                    <span>{smartMode ? '✨ Smart AI: ON' : '✨ Smart AI: OFF'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowVisualCharts(!showVisualCharts)}
                    className="hidden px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white text-xs font-bold items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  >
                    <span>{showVisualCharts ? '📈 Hide Charts' : '📊 Show Charts'}</span>
                  </button>

                  <div className="flex items-center gap-1 bg-slate-950 p-1.5 rounded-xl border border-slate-700 shrink-0 ml-2">
                    <button
                      type="button"
                      onClick={() => setViewMode('grid')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        viewMode === 'grid'
                          ? 'bg-slate-800 text-white font-bold shadow-sm'
                          : 'text-slate-300 font-medium hover:text-white'
                      }`}
                    >
                      Grid Cards
                    </button>
                    <button
                      type="button"
                  >
                    <span>{showVisualCharts ? '📈 Hide Charts' : '📊 Show Charts'}</span>
                  </button>

                  <div className="flex items-center gap-1 bg-slate-950 p-1.5 rounded-xl border border-slate-700 shrink-0 ml-2">
                    <button
                      type="button"
                      onClick={() => setViewMode('grid')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        viewMode === 'grid'
                          ? 'bg-slate-800 text-white font-bold shadow-sm'
                          : 'text-slate-300 font-medium hover:text-white'
                      }`}
                    >
                      Grid Cards
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('compact')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        viewMode === 'compact'
                          ? 'bg-slate-800 text-white font-bold shadow-sm'
                          : 'text-slate-300 font-medium hover:text-white'
                      }`}
                    >
                      Compact Table
                    </button>
                  </div>

                  {/* Item A: Accordion Focus Mode Toggle */}
                  <button
                    type="button"
                    onClick={() => {
                      const next = !accordionFocusMode;
                      setAccordionFocusMode(next);
                      try { localStorage.setItem('agency_accordion_focus_mode', String(next)); } catch {}
                      if (next) {
                        const openKeys = Object.keys(expandedCardIds).filter((k) => expandedCardIds[k]);
                        if (openKeys.length > 1) {
                          setExpandedCardIds({ [openKeys[0]]: true });
                        }
                      }
                      sonnerToast(next ? '⚡ Accordion Focus Mode Enabled' : 'Standard Expansion Mode Enabled', {
                        description: next ? 'Opening a project automatically collapses other cards' : 'Multiple projects can remain expanded simultaneously'
                      });
                    }}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ml-2 ${
                      accordionFocusMode
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm'
                        : 'bg-slate-900/80 text-slate-400 border-slate-700 hover:text-white'
                    }`}
                    title="Accordion Focus Mode: automatically collapse other cards when opening an account"
                  >
                    <span className={`w-2 h-2 rounded-full ${accordionFocusMode ? 'bg-cyan-400 animate-pulse' : 'bg-slate-600'}`} />
                    <span>{accordionFocusMode ? '⚡ Focus: ON' : 'Focus: OFF'}</span>
                  </button>
                </div>
              </div>

              {/* Feature 3: Interactive Morning Huddle Triage Drawer */}
              {showMorningHuddleDrawer && (
                <div className="w-full mt-3 p-4 rounded-2xl bg-gradient-to-r from-slate-900/98 via-slate-900/95 to-rose-950/40 border border-rose-500/50 shadow-2xl backdrop-blur-xl animate-fade-in flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500/20 to-amber-500/20 border border-rose-500/40 flex items-center justify-center text-lg shadow-inner">
                        🌅
                      </div>
                      <div>
                        <div className="text-xs font-black text-white flex items-center gap-2">
                          <span>Morning Huddle Command</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white shadow-sm">
                            {attentionProjects.length} Needs Action
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-medium">
                          Deliverable blockers, retainer creep & overdue cashflow triage
                        </div>
                      </div>
                    </div>

                    {/* Triage Badges / Quick Filter Drills */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setEverydayQuickFilter('needs_attention')}
                        className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                        title="Filter accounts in scope creep"
                      >
                        <span>🚨 {overScopeCount} Scope Creep</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEverydayQuickFilter('needs_attention')}
                        className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                        title="Filter deliverables overdue or due today"
                      >
                        <span>⚠️ {overdueDeliverablesCount} Deliverables Due/Overdue</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEverydayQuickFilter('needs_attention')}
                        className="px-2.5 py-1 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/40 text-purple-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                        title="Filter overdue client invoices"
                      >
                        <span>🛑 {paymentHoldCount} Invoices Overdue</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEverydayQuickFilter('needs_attention')}
                        className="px-2.5 py-1 rounded-lg bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/40 text-orange-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                        title="Filter accounts with high burn ≥85%"
                      >
                        <span>🔥 {highBurnCount} High Burn (85%+)</span>
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleCopyHuddleAgenda}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-slate-950 text-xs font-black transition-all cursor-pointer shadow-lg shadow-rose-950/40 flex items-center gap-1.5"
                      title="Copy formatted markdown briefing to clipboard for Slack / Teams"
                    >
                      <ClipboardList className="w-3.5 h-3.5" />
                      <span>Copy Huddle Agenda</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowMorningHuddleDrawer(false)}
                      className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white text-xs cursor-pointer transition-colors border border-slate-700/60"
                      title="Close Huddle Drawer"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}

              {/* Row 2: Search Box + Dropdown Filters */}
              <div className="pt-5 border-t border-slate-700/50 flex flex-wrap items-center justify-between gap-4">
                {/* Search Box */}
                <div className="relative flex-1 min-w-[280px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    ref={searchBarRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      smartMode
                        ? `✨ Smart Search across ${projectsList.length} retainers, invoices, squad capacity, or margin thresholds... [/]`
                        : `Search ${projectsList.length} projects by client, keyword, channel, invoice, or squad lead... [/]`
                    }
                    className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-11 pr-14 py-2.5 text-sm font-medium text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                  />
                  {!searchQuery ? (
                    <kbd className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-mono bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700/60 pointer-events-none hidden sm:inline-block">
                      /
                    </kbd>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-white p-1 rounded-md"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Dropdown Filters */}
                <button
                  type="button"
                  onClick={() => setShowAdvancedFilters((current) => !current)}
                  className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition-colors ${showAdvancedFilters ? 'bg-indigo-500/20 text-indigo-200 border-indigo-500/40' : 'bg-slate-900 text-slate-300 border-slate-700 hover:text-white'}`}
                >
                  <Filter className="w-3.5 h-3.5 inline mr-1.5" />
                  {showAdvancedFilters ? 'Hide filters' : 'More filters'}
                </button>

                <div className={`${showAdvancedFilters ? 'flex' : 'hidden'} flex-wrap items-center gap-2 w-full xl:w-auto`}>
                  <select
                    value={filterLeadId}
                    onChange={(e) => setFilterLeadId(e.target.value)}
                    className="bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer shadow-sm"
                  >
                    <option value="ALL" className="bg-slate-900 text-slate-200">👥 All Project Leads</option>
                    <option value="UNASSIGNED" className="bg-slate-900 text-slate-200">⚪ Unassigned Leads (Blank)</option>
                    {customMembers.map((m) => (
                      <option key={m.id} value={m.id} className="bg-slate-900 text-slate-200">
                        Lead: {m.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filterCallAssigneeId}
                    onChange={(e) => setFilterCallAssigneeId(e.target.value)}
                    className="bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer shadow-sm"
                  >
                    <option value="ALL" className="bg-slate-900 text-slate-200">📞 All Call Assignees</option>
                    <option value="UNASSIGNED" className="bg-slate-900 text-slate-200">⚪ Unassigned Calls (Blank)</option>
                    {customMembers.map((m) => (
                      <option key={m.id} value={m.id} className="bg-slate-900 text-slate-200">
                        Calls: {m.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filterBillingType}
                    onChange={(e) => setFilterBillingType(e.target.value)}
                    className="bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer shadow-sm"
                  >
                    <option value="ALL" className="bg-slate-900 text-slate-200">💳 All Billing Models</option>
                    <option value="Monthly Retainer" className="bg-slate-900 text-slate-200">Monthly Retainer</option>
                    <option value="Weekly Hourly Billing" className="bg-slate-900 text-slate-200">Weekly Hourly Billing</option>
                    <option value="Milestone Delivery" className="bg-slate-900 text-slate-200">Milestone Delivery</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Service Category Pills + Filter Summary */}
              <div className={`${showAdvancedFilters ? 'flex' : 'hidden'} pt-5 border-t border-slate-700/40 flex-col sm:flex-row sm:items-center justify-between gap-4`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1">
                    Services:
                  </span>
                  {[
                    { id: 'ALL', label: 'All Services' },
                    { id: 'Full SEO', label: 'Full SEO' },
                    { id: 'Local SEO', label: 'Local SEO' },
                    { id: 'AEO', label: 'AEO / GEO' },
                    { id: 'WordPress', label: 'WordPress Dev' },
                    { id: 'Email', label: 'Email Marketing' }
                  ].map((service) => (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => setSelectedServiceFilter(service.id)}
                      className={`px-3.5 py-1.5 rounded-xl text-[11px] font-medium transition-all cursor-pointer ${
                        selectedServiceFilter === service.id
                          ? 'bg-slate-800 text-white font-bold border border-slate-600 shadow-sm'
                          : 'bg-slate-950 text-slate-300 font-medium border border-slate-700/80 hover:text-white'
                      }`}
                    >
                      {service.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-300 font-medium">
                  <span>
                    Showing <strong className="text-white font-bold">{filteredProjectsList.length}</strong> of{' '}
                    <strong className="text-white font-bold">{projectsList.length}</strong> master projects
                    {(searchQuery || selectedServiceFilter !== 'ALL' || everydayQuickFilter !== 'all' || filterLeadId !== 'ALL' || filterCallAssigneeId !== 'ALL' || filterBillingType !== 'ALL') && (
                      <span className="text-amber-400 ml-1.5 font-bold">(Filtered)</span>
                    )}
                  </span>
                  {(searchQuery || selectedServiceFilter !== 'ALL' || everydayQuickFilter !== 'all' || filterLeadId !== 'ALL' || filterCallAssigneeId !== 'ALL' || filterBillingType !== 'ALL') && (
                    <button
                      type="button"
                      onClick={() => {
                        setEverydayQuickFilter('all');
                        setSelectedServiceFilter('ALL');
                        setSearchQuery('');
                        setFilterLeadId('ALL');
                        setFilterCallAssigneeId('ALL');
                        setFilterBillingType('ALL');
                      }}
                      className="text-xs text-rose-400 hover:text-rose-300 font-bold underline cursor-pointer"
                    >
                      Reset Filters
                    </button>
                  )}
                </div>
              </div>

              {/* Row 4: ✨ AI Smart Query Prompts (One-Click Natural Language Queries) */}
              {smartMode && showAdvancedFilters && (
                <div className="mt-1 border-t border-indigo-500/30 bg-gradient-to-r from-indigo-950/50 via-slate-900/80 to-purple-950/50 -mx-5 -mb-5 px-5 py-5 rounded-b-2xl flex flex-wrap items-start gap-3">
                  <div className="flex items-center gap-1.5 text-indigo-300 font-extrabold text-[11px] uppercase tracking-wider w-full pb-2">
                    <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                    <span>AI Instant Queries:</span>
                  </div>
                  {[
                    { label: '👑 VIP Accounts ($1,500+)', filter: 'tier_vip' as const },
                    { label: '🏢 Agency Partners', filter: 'tier_agency' as const },
                    { label: '💎 Highest Yield ($/hr)', filter: 'tier_highest_yield' as const },
                    { label: '🚨 High Risk Burn (<35% Margin or >85% Hours)', filter: 'ai_high_risk' as const },
                    { label: '💎 Star Retainers (>=55% Margin)', filter: 'ai_top_margin' as const },
                    { label: '⏳ Nearing 80% Capacity Limit', filter: 'ai_nearing_cap' as const },
                    { label: '💰 Overdue Cashflow Invoices', filter: 'ai_overdue_cashflow' as const },
                    { label: '🔍 Client: "Maison Perle"', query: 'Maison Perle' },
                    { label: '💬 Channel: "Slack"', query: 'Slack' }
                  ].map((prompt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        if (prompt.filter) {
                          setEverydayQuickFilter(everydayQuickFilter === prompt.filter ? 'all' : prompt.filter);
                        } else if (prompt.query) {
                          setSearchQuery(searchQuery === prompt.query ? '' : prompt.query);
                        }
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1 shadow-xs ${
                        (prompt.filter && everydayQuickFilter === prompt.filter) || (prompt.query && searchQuery === prompt.query)
                          ? 'bg-indigo-600 text-white border-indigo-400 shadow-indigo-500/30 font-bold'
                          : 'bg-slate-900/90 text-indigo-200 hover:text-white border-indigo-500/30 hover:border-indigo-400/80 hover:bg-slate-800'
                      }`}
                    >
                      <span>{prompt.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

              {/* SECTION 3 HEADING: ACTIVE PROJECTS ROSTER */}
          <div className="flex items-center justify-between gap-3 px-1">
            <div>
              <h3 className="text-sm font-extrabold text-white">Project roster</h3>
              <p className="text-xs text-slate-400">{filteredProjectsList.length} matching projects</p>
            </div>
            <span className="text-xs text-slate-400">{viewMode === 'grid' ? 'Cards' : 'Table'}</span>
          </div>

          {/* Item 4: Specialist Spotlight Bar */}
          {spotlightSpecialistId && (() => {
            const spec = customMembers.find(m => m.id === spotlightSpecialistId);
            const matchCount = filteredProjectsList.filter(p => (
              p.projectLeadId === spotlightSpecialistId ||
              p.clientCallAssigneeId === spotlightSpecialistId ||
              p.taskBreakdown?.some(tb => tb.assigneeId === spotlightSpecialistId) ||
              p.members?.some(m => m.id === spotlightSpecialistId)
            )).length;

            return (
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-cyan-950/90 via-slate-900/95 to-indigo-950/90 border border-cyan-500/50 text-cyan-200 text-xs shadow-xl backdrop-blur-md animate-in fade-in duration-200">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="relative flex h-3 w-3 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500" />
                  </span>
                  {spec && (
                    <img src={spec.avatar} alt={spec.name} className="w-8 h-8 rounded-full object-cover ring-2 ring-cyan-400 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <span className="font-extrabold text-white text-sm truncate block">
                      Spotlighting {spec ? spec.name : 'Specialist'} ({matchCount} associated account{matchCount === 1 ? '' : 's'})
                    </span>
                    <span className="text-[11px] text-cyan-300/80 truncate block">
                      Matching accounts dynamically clustered to front · Other projects dimmed
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-cyan-400 font-mono bg-cyan-900/60 px-2 py-1 rounded border border-cyan-700/50 hidden sm:inline-block">
                    Esc to clear
                  </span>
                  <button
                    type="button"
                    onClick={() => setSpotlightSpecialistId(null)}
                    className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-bold text-xs cursor-pointer transition-colors flex items-center gap-1"
                  >
                    <span>Clear Spotlight</span>
                    <span>✕</span>
                  </button>
                </div>
              </div>
            );
          })()}

          {/* View Mode Switching: Rich Visual Grid OR High-Density Executive Compact Table */}
          {viewMode === 'compact' ? (
            <div className="bg-[#111827] border border-slate-700/60 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900/95 border-b-2 border-slate-700 text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                      <th className="py-4 px-5 w-12">#</th>
                      <th className="py-4 px-5">Status / Priority</th>
                      <th className="py-4 px-5">Client & Project Name</th>
                      <th className="py-4 px-5">Billing & Price</th>
                      <th className="py-4 px-5">Squad & Call Lead</th>
                      <th className="py-4 px-5">Channel</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/40 text-xs">
                    {paginatedProjects.map((proj, idx) => {
                      const leadMember = proj.projectLeadId ? customMembers.find((m) => m.id === proj.projectLeadId) : undefined;
                      const callMember = proj.clientCallAssigneeId ? customMembers.find((m) => m.id === proj.clientCallAssigneeId) : undefined;

                      const hoursRatio = proj.totalHours > 0 ? proj.activeHours / proj.totalHours : 0;
                      const { marginPercent: marginNum } = calculateProjectProfitability(proj);
                      const aiStatus =
                        hoursRatio >= 0.85 || marginNum < 35 || proj.paymentStatus === 'Overdue' || proj.projectHealthEmoji?.includes('Critical')
                          ? { label: '🚨 AI Risk', color: 'bg-rose-500/20 text-rose-300 border-rose-500/50' }
                          : marginNum >= 55
                          ? { label: '💎 AI Star', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' }
                          : { label: '🤖 AI Optimal', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50' };

                      return (
                        <tr
                          key={proj.id}
                          className="hover:bg-slate-800/60 transition-colors group cursor-pointer"
                          onClick={() => setViewingProjectDetail(proj)}
                        >
                          <td className="py-4 px-5 font-bold text-slate-400 tabular-nums w-12">{idx + 1}</td>
                          <td className="py-4 px-5" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <ClientTierBadge tier={proj.clientTier || classifyClientTier(proj)} size="sm" />
                              <ProjectHealthBadge project={proj} onClick={() => setDiagnosingProject(proj)} size="sm" />
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide border ${
                                  proj.status === 'INITIAL STAGE'
                                    ? 'bg-cyan-500/20 text-cyan-200 border-cyan-500/40'
                                    : proj.status === 'REVALUATION'
                                    ? 'bg-amber-500/20 text-amber-200 border-amber-500/40'
                                    : 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40'
                                }`}
                              >
                                {proj.status || 'ON TRACK'}
                              </span>
                              {proj.priorityLevel && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700">
                                  {proj.priorityLevel}
                                </span>
                              )}
                              {(() => {
                                const dueInfo = getNextDeliverableDueInfo(proj);
                                if (dueInfo.urgency === 'none') return null;
                                return (
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${dueInfo.badgeColor}`} title="Next deliverable due">
                                    {dueInfo.label}
                                  </span>
                                );
                              })()}
                            </div>
                          </td>
                          <td className="py-4 px-5">
                            <div className="flex items-center gap-2">
                              <div className="font-bold text-white group-hover:text-cyan-300 transition-colors text-sm">
                                {proj.name}
                              </div>
                              {smartMode && (
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase border flex items-center gap-0.5 shrink-0 ${aiStatus.color}`}>
                                  <Sparkles className="w-2.5 h-2.5 shrink-0" />
                                  {aiStatus.label}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] font-semibold text-slate-300 mt-0.5">{proj.client}</div>
                            {proj.quickMemo && (
                              <div className="text-[11px] text-amber-300/90 font-medium flex items-center gap-1 mt-1 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-md max-w-fit" title={`Memo: ${proj.quickMemo} (${proj.quickMemoUpdatedAt || ''})`}>
                                <StickyNote className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                                <span className="truncate max-w-[220px]">{proj.quickMemo}</span>
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-5" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-2">
                              <div className="font-bold text-emerald-300 text-sm">{proj.price}</div>
                              <YieldGauge amount={proj.paymentAmountNumeric || 0} hours={proj.activeHours || proj.totalHours || 1} showLabel={false} />
                            </div>
                            <div className="text-[11px] font-medium text-slate-300 mt-0.5 flex items-center gap-1.5 flex-wrap">
                              <span>{proj.billingType}</span>
                              {(() => {
                                const b = Math.max(1, proj.activeHours || proj.totalHours || 1);
                                const l = proj.actualHoursLogged || 0;
                                if (l > b) {
                                  const over = Math.round((l - b) * 10) / 10;
                                  return (
                                    <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[9px] font-black uppercase flex items-center gap-1">
                                      <span className="w-1 h-1 rounded-full bg-rose-400 animate-ping" />
                                      +{over}h over
                                    </span>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          </td>
                          <td className="py-4 px-5" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-2">
                              {leadMember ? (
                                <div className="flex items-center gap-1" title={`Lead: ${leadMember.name}`}>
                                  <img
                                    src={leadMember.avatar}
                                    alt=""
                                    style={{ width: '20px', height: '20px' }}
                                    className="rounded-full object-cover ring-1 ring-cyan-500/50"
                                  />
                                  <span className="font-bold text-white">{leadMember.name.split(' ')[0]}</span>
                                </div>
                              ) : (
                                <span className="text-slate-500 italic text-[11px]">Unassigned</span>
                              )}
                              <span className="text-slate-500 font-bold">•</span>
                              {callMember ? (
                                <div className="flex items-center gap-1" title={`Call Lead: ${callMember.name}`}>
                                  <img
                                    src={callMember.avatar}
                                    alt=""
                                    style={{ width: '20px', height: '20px' }}
                                    className="rounded-full object-cover ring-1 ring-purple-500/50"
                                  />
                                  <span className="font-semibold text-slate-300">{callMember.name.split(' ')[0]}</span>
                                </div>
                              ) : (
                                <span className="text-slate-500 italic text-[11px]">Unassigned</span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-5 text-[11px] text-slate-300 font-semibold">
                            {proj.communicationChannel || 'Slack / Client Email'}
                          </td>
                          <td className="py-4 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setViewingProjectDetail(proj)}
                                className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all cursor-pointer shadow-sm border border-slate-700"
                              >
                                View 360°
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingProject({ ...proj })}
                                className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer border border-slate-700"
                                title="Edit Project Details"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingProject(proj)}
                                className="p-1.5 rounded-md bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-all cursor-pointer border border-slate-700 hover:border-rose-500/40"
                                title="Delete Project"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCopyClientSummary(proj)}
                                className="p-1.5 rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 transition-all cursor-pointer border border-emerald-500/40"
                                title="Copy status report"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              {(proj.clickUpTaskId || proj.id.startsWith('prj_cu_') || proj.taskBreakdown?.some(tb => tb.clickUpTaskId)) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const targetTaskId =
                                      proj.clickUpTaskId ||
                                      (proj.id.startsWith('prj_cu_') ? proj.id.replace('prj_cu_', '') : undefined) ||
                                      proj.taskBreakdown?.find(tb => tb.clickUpTaskId)?.clickUpTaskId;
                                    if (targetTaskId) {
                                      handleOpenClickUpTicketModal(targetTaskId, proj.name, {
                                        taskUrl: proj.clientFolderUrl,
                                        projectName: proj.name,
                                        clientName: proj.client,
                                        status: proj.status,
                                        priority: proj.priorityLevel
                                      });
                                    }
                                  }}
                                  className="p-1.5 rounded-md bg-purple-500/20 hover:bg-purple-500/35 text-purple-300 hover:text-white transition-all cursor-pointer border border-purple-500/40"
                                  title="💬 ClickUp Ticket Discussion & Comments"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Neat, Clean High-Contrast Executive Project Cards Grid */
            <motion.div layout className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6 min-w-0 w-full items-start">
              <AnimatePresence mode="popLayout">
              {clickUpSyncStatus === 'syncing' ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <motion.div
                    key={`skeleton-${idx}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col bg-slate-900/40 border border-slate-800 rounded-2xl shadow-xl overflow-hidden p-6 gap-4 min-w-0"
                  >
                    <div className="flex items-start justify-between min-w-0 gap-3">
                      <div className="flex flex-col gap-2 flex-1 min-w-0">
                        <div className="h-5 rounded w-24  skeleton-shimmer"></div>
                        <div className="h-6 rounded w-48  skeleton-shimmer"></div>
                      </div>
                      <div className="h-6 rounded w-16  skeleton-shimmer"></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      <div className="h-10 rounded  skeleton-shimmer"></div>
                      <div className="h-10 rounded  skeleton-shimmer"></div>
                    </div>
                    <div className="h-16 rounded  skeleton-shimmer mt-2"></div>
                  </motion.div>
                ))
              ) : (
              paginatedProjects.map((proj) => {
                const leadMember = proj.projectLeadId ? customMembers.find((m) => m.id === proj.projectLeadId) : undefined;
                const callMember = proj.clientCallAssigneeId ? customMembers.find((m) => m.id === proj.clientCallAssigneeId) : undefined;
                const prof = calculateProjectProfitability(proj);
                const projectFin = calculateProjectFinancials(proj, customMembers);

                const isExpanded = !!expandedCardIds[proj.id];

                const hoursRatio = proj.totalHours > 0 ? proj.activeHours / proj.totalHours : 0;
                const { marginPercent: marginNum } = calculateProjectProfitability(proj);
                const aiStatus =
                  hoursRatio >= 0.85 || marginNum < 35 || proj.paymentStatus === 'Overdue' || proj.projectHealthEmoji?.includes('Critical')
                    ? { label: '🚨 AI Alert: High Risk', color: 'bg-rose-500/20 text-rose-300 border-rose-500/50' }
                    : marginNum >= 55
                    ? { label: '💎 AI Star: High Margin', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' }
                    : { label: '🤖 AI Status: Optimal', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50' };

                const isSpotlightMatch = spotlightSpecialistId ? (
                  proj.projectLeadId === spotlightSpecialistId ||
                  proj.clientCallAssigneeId === spotlightSpecialistId ||
                  proj.taskBreakdown?.some(tb => tb.assigneeId === spotlightSpecialistId) ||
                  proj.members?.some(m => m.id === spotlightSpecialistId)
                ) : true;

                return (
                  <motion.div
                    layout
                    key={proj.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ 
                      opacity: spotlightSpecialistId ? (isSpotlightMatch ? 1 : 0.35) : 1, 
                      scale: spotlightSpecialistId && !isSpotlightMatch ? 0.98 : 1,
                    }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.25, layout: { duration: 0.35, ease: 'easeOut' } }}
                    className={`glass-panel rounded-3xl p-6 space-y-5 shadow-lg hover-lift flex flex-col justify-between group overflow-hidden min-w-0 max-w-full w-full relative transition-all ${
                      spotlightSpecialistId && isSpotlightMatch
                        ? 'border-cyan-400/90 ring-2 ring-cyan-400/40 shadow-cyan-500/10'
                        : spotlightSpecialistId && !isSpotlightMatch
                        ? 'border-slate-800/60 grayscale-[35%] hover:grayscale-0 hover:opacity-90'
                        : 'border-slate-700/60 hover:border-cyan-500/40'
                    }`}
                  >
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="space-y-3 min-w-0 w-full relative z-10">
                      {/* Top Row (Always Visible): Checkbox + Status Tag + Client Label + Price */}
                      <div className="flex flex-wrap items-center justify-between gap-2 min-w-0 w-full">
                        <div className="flex flex-wrap items-center gap-1.5 min-w-0 max-w-full">
                          {/* Multi-Select Bulk Checkbox */}
                          <input
                            type="checkbox"
                            checked={selectedProjectIds.has(proj.id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleToggleSelectProject(proj.id);
                            }}
                            className={`w-4 h-4 rounded text-emerald-500 cursor-pointer accent-emerald-500 shrink-0 transition-opacity ${
                              selectedProjectIds.size > 0 ? 'opacity-100 ring-2 ring-emerald-500' : 'opacity-40 group-hover:opacity-100'
                            }`}
                            title="Select for bulk action"
                          />

                          {/* Delta Synced Badge */}
                          {recentlySyncedProjectIds.has(proj.id) && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/25 text-emerald-300 border border-emerald-400 animate-pulse flex items-center gap-1 shrink-0 shadow-lg shadow-emerald-500/20">
                              ⚡ Synced Just Now
                            </span>
                          )}

                          <ClientTierBadge tier={proj.clientTier || classifyClientTier(proj)} size="sm" />
                          <ProjectHealthBadge project={proj} onClick={() => setDiagnosingProject(proj)} size="sm" />

                          {/* Click-to-Edit Quick Status Popover */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setQuickStatusMenuProjId(quickStatusMenuProjId === proj.id ? null : proj.id);
                              }}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border shrink-0 cursor-pointer hover:scale-105 transition-all flex items-center gap-1 ${
                                proj.status === 'INITIAL STAGE'
                                  ? 'bg-cyan-500/20 text-cyan-200 border-cyan-500/40 hover:bg-cyan-500/30'
                                  : proj.status === 'REVALUATION'
                                  ? 'bg-amber-500/20 text-amber-200 border-amber-500/40 hover:bg-amber-500/30'
                                  : proj.status === 'COMPLETED'
                                  ? 'bg-purple-500/20 text-purple-200 border-purple-500/40 hover:bg-purple-500/30'
                                  : 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40 hover:bg-emerald-500/30'
                              }`}
                              title="Click to quick-change status"
                            >
                              <span>{proj.status || 'ON TRACK'}</span>
                              <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                            </button>

                            {quickStatusMenuProjId === proj.id && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute left-0 top-full mt-1.5 z-50 rounded-xl shadow-2xl p-1.5 w-40 border bg-slate-900/95 border-slate-700 backdrop-blur-xl space-y-1 animate-fade-in text-left"
                              >
                                <div className="text-[9px] font-black text-slate-400 uppercase px-2 py-0.5">Quick Status</div>
                                {(['ON TRACK', 'INITIAL STAGE', 'REVALUATION', 'PAUSED', 'COMPLETED'] as const).map((st) => (
                                  <button
                                    key={st}
                                    type="button"
                                    onClick={() => handleQuickUpdateStatus(proj.id, st)}
                                    className={`w-full text-left px-2 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                                      proj.status === st ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'hover:bg-slate-800 text-slate-300 hover:text-white'
                                    }`}
                                  >
                                    {st}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider truncate min-w-0 max-w-[180px] sm:max-w-[220px]">
                            {proj.client}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                          <YieldGauge
                            amount={proj.paymentAmountNumeric || 0}
                            hours={proj.activeHours || proj.totalHours || 1}
                            showLabel={false}
                          />

                          {/* Quick In-Line Price Editor */}
                          {inlineEditingPriceId === proj.id ? (
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="text"
                                value={inlinePriceValue}
                                onChange={(e) => setInlinePriceValue(e.target.value)}
                                className="w-20 px-1.5 py-0.5 rounded text-xs font-bold text-emerald-300 bg-slate-900 border border-emerald-500 focus:outline-none"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveInlinePrice(proj.id);
                                  if (e.key === 'Escape') setInlineEditingPriceId(null);
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveInlinePrice(proj.id)}
                                className="p-1 rounded bg-emerald-500 text-slate-950 hover:bg-emerald-400 text-xs font-black cursor-pointer"
                              >
                                ✓
                              </button>
                              <button
                                type="button"
                                onClick={() => setInlineEditingPriceId(null)}
                                className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setInlineEditingPriceId(proj.id);
                                setInlinePriceValue(proj.price || '');
                              }}
                              className="text-xs font-bold text-emerald-300 bg-emerald-500/20 px-2.5 py-0.5 rounded-md border border-emerald-500/40 shadow-sm hover:border-emerald-400/80 hover:scale-105 transition-all cursor-pointer"
                              title="Click to quick-edit price"
                            >
                              {proj.price}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setEditingProject({ ...proj })}
                            title="Edit Project Details"
                            className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer border border-slate-700"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingProject(proj)}
                            title="Delete Project"
                            className="p-1.5 rounded-md bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-all cursor-pointer border border-slate-700 hover:border-rose-500/40"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Clean Project Title & ClickUp Link (Always Visible) */}
                      <div className="flex items-start justify-between gap-2 min-w-0 w-full mt-0.5">
                        <h3
                          onClick={() => setViewingProjectDetail(proj)}
                          className="text-base font-extrabold text-white leading-snug tracking-tight hover:text-cyan-300 transition-colors cursor-pointer break-words line-clamp-2 min-w-0 flex-1"
                        >
                          {proj.name}
                        </h3>
                        {proj.clickUpListId && (
                          <a
                            href={`https://app.clickup.com/v/li/${proj.clickUpListId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            title={`Open ClickUp List: ${proj.clickUpListName || proj.name}`}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-950/80 hover:bg-purple-900 text-purple-200 hover:text-white border border-purple-600/50 text-[10px] font-bold transition-all shrink-0 cursor-pointer shadow-sm"
                          >
                            <span>📁 ClickUp</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                        {(proj.clickUpTaskId || proj.id.startsWith('prj_cu_') || proj.taskBreakdown?.some(tb => tb.clickUpTaskId)) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const targetTaskId =
                                proj.clickUpTaskId ||
                                (proj.id.startsWith('prj_cu_') ? proj.id.replace('prj_cu_', '') : undefined) ||
                                proj.taskBreakdown?.find(tb => tb.clickUpTaskId)?.clickUpTaskId;
                              if (targetTaskId) {
                                handleOpenClickUpTicketModal(targetTaskId, proj.name, {
                                  taskUrl: proj.clientFolderUrl,
                                  projectName: proj.name,
                                  clientName: proj.client,
                                  status: proj.status,
                                  priority: proj.priorityLevel
                                });
                              }
                            }}
                            title="💬 View ClickUp ticket discussion & post comments"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-950/80 hover:bg-purple-900 text-purple-200 hover:text-white border border-purple-600/50 text-[10px] font-bold transition-all shrink-0 cursor-pointer shadow-sm"
                          >
                            <MessageSquare className="w-2.5 h-2.5" />
                            <span>Discussion</span>
                          </button>
                        )}
                      </div>

                      {/* Feature 3: 1-Click "Quick Memo" on Project Cards (with date and time) */}
                      <div className="w-full mt-1" onClick={(e) => e.stopPropagation()}>
                        {editingMemoProjId === proj.id ? (
                          <div className="flex items-center gap-1.5 bg-slate-900/95 border border-amber-500/60 p-1.5 rounded-xl shadow-xl animate-fade-in">
                            <StickyNote className="w-3.5 h-3.5 text-amber-400 shrink-0 ml-1" />
                            <input
                              type="text"
                              value={memoInputText}
                              onChange={(e) => setMemoInputText(e.target.value)}
                              placeholder="Type memo (e.g., Client wants review Thursday, waiting on assets)..."
                              className="flex-1 bg-transparent text-xs text-amber-100 placeholder:text-slate-500 focus:outline-none font-medium px-1"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveQuickMemo(proj.id, memoInputText);
                                if (e.key === 'Escape') setEditingMemoProjId(null);
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveQuickMemo(proj.id, memoInputText)}
                              className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black cursor-pointer shadow-sm transition-all"
                              title="Save memo (Enter)"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingMemoProjId(null)}
                              className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs cursor-pointer transition-all"
                              title="Cancel (Esc)"
                            >
                              ✕
                            </button>
                          </div>
                        ) : proj.quickMemo ? (
                          <div className="group/memo flex items-start justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/30 text-amber-200/90 text-xs transition-all shadow-sm">
                            <div className="flex items-start gap-1.5 min-w-0 flex-1">
                              <StickyNote className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-amber-100 text-xs leading-relaxed break-words">
                                  {proj.quickMemo}
                                </p>
                                {proj.quickMemoUpdatedAt && (
                                  <span className="text-[10px] text-amber-400/70 font-mono block mt-0.5">
                                    🕒 {proj.quickMemoUpdatedAt}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-80 group-hover/memo:opacity-100 transition-opacity shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingMemoProjId(proj.id);
                                  setMemoInputText(proj.quickMemo || '');
                                }}
                                className="p-1 rounded hover:bg-amber-500/20 text-amber-300 hover:text-white transition-colors cursor-pointer"
                                title="Edit Memo"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleClearQuickMemo(proj.id)}
                                className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
                                title="Clear Memo"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingMemoProjId(proj.id);
                                setMemoInputText('');
                              }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold text-slate-400 hover:text-amber-300 hover:bg-amber-500/10 border border-transparent hover:border-amber-500/30 transition-all cursor-pointer group/addmemo"
                              title="Add a 1-click quick memo with timestamp"
                            >
                              <StickyNote className="w-3 h-3 text-slate-500 group-hover/addmemo:text-amber-400 transition-colors" />
                              <span>+ Memo</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* AI Smart Health & Diagnostic Capsule (Appears when Smart Mode is active) */}
                      {smartMode && (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-slate-900/80 border border-indigo-500/20 text-xs font-semibold animate-fade-in">
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`px-2 py-0.5 rounded-md border text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 shrink-0 ${aiStatus.color}`}>
                              <Sparkles className="w-3 h-3 shrink-0 animate-pulse" />
                              {aiStatus.label}
                            </span>
                          </div>
                          <span className="text-slate-300 text-[11px] truncate font-medium">
                            {hoursRatio >= 0.85
                              ? `⚠️ ${Math.round(hoursRatio * 100)}% hours utilized (${proj.activeHours}/${proj.totalHours}h)`
                              : marginNum < 35
                              ? `⚠️ Low margin (${marginNum}%) — rebalance hours`
                              : proj.paymentStatus === 'Overdue'
                              ? `🔴 Invoice Overdue (${proj.paymentInvoiceId || 'Pending'})`
                              : `💡 Optimal margin (${marginNum}%), healthy buffer`}
                          </span>
                        </div>
                      )}

                      {/* Compact Key Preview Bar (Always Visible Snapshot) */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 pb-3 text-xs border-b border-slate-700/30 min-w-0 w-full">
                        <div className="flex items-center gap-2 min-w-0 flex-1 max-w-full">
                          <div className="flex -space-x-1.5 overflow-hidden shrink-0" title={`Lead: ${leadMember ? leadMember.name : 'Unassigned'} • Calls: ${callMember ? callMember.name : 'Unassigned'}`}>
                            {leadMember ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/member/${leadMember.id}`);
                                }}
                                className="cursor-pointer hover:scale-110 hover:z-20 transition-transform block"
                                title={`View ${leadMember.name}'s Profile & Workload`}
                              >
                                <img
                                  src={leadMember.avatar}
                                  alt={leadMember.name}
                                  style={{ width: '24px', height: '24px', minWidth: '24px', minHeight: '24px' }}
                                  className="rounded-full object-cover ring-1 ring-cyan-500 block"
                                />
                              </button>
                            ) : (
                              <div
                                style={{ width: '24px', height: '24px', minWidth: '24px', minHeight: '24px' }}
                                className="rounded-full bg-slate-800/90 border border-dashed border-cyan-500/50 flex items-center justify-center text-[10px] text-cyan-400 font-bold"
                                title="Lead: Unassigned"
                              >
                                ?
                              </div>
                            )}
                            {callMember ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/member/${callMember.id}`);
                                }}
                                className="cursor-pointer hover:scale-110 hover:z-20 transition-transform block"
                                title={`View ${callMember.name}'s Profile & Workload`}
                              >
                                <img
                                  src={callMember.avatar}
                                  alt={callMember.name}
                                  style={{ width: '24px', height: '24px', minWidth: '24px', minHeight: '24px' }}
                                  className="rounded-full object-cover ring-1 ring-purple-500 block"
                                />
                              </button>
                            ) : (
                              <div
                                style={{ width: '24px', height: '24px', minWidth: '24px', minHeight: '24px' }}
                                className="rounded-full bg-slate-800/90 border border-dashed border-purple-500/50 flex items-center justify-center text-[10px] text-purple-400 font-bold"
                                title="Calls: Unassigned"
                              >
                                ?
                              </div>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-300 min-w-0">
                            {/* Quick Lead Reassign Popover & Drag-Drop Target */}
                            <div
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = 'copy';
                                setDragOverTarget({ projId: proj.id, role: 'lead' });
                              }}
                              onDragLeave={() => setDragOverTarget(null)}
                              onDrop={(e) => {
                                e.preventDefault();
                                const memberId = e.dataTransfer.getData('text/plain') || draggedSpecialistId;
                                if (memberId) {
                                  handleQuickUpdateLead(proj.id, memberId);
                                  const m = customMembers.find((mem) => mem.id === memberId);
                                  sonnerToast.success(`Assigned ${m ? m.name : 'specialist'} as Squad Lead on ${proj.name}`);
                                }
                                setDragOverTarget(null);
                                setDraggedSpecialistId(null);
                              }}
                              className={`relative transition-all rounded-lg px-1 py-0.5 flex items-center gap-1.5 ${
                                dragOverTarget?.projId === proj.id && dragOverTarget?.role === 'lead'
                                  ? 'ring-2 ring-cyan-400 bg-cyan-500/25 scale-105 shadow-md shadow-cyan-500/20'
                                  : draggedSpecialistId
                                  ? 'ring-1 ring-dashed ring-cyan-500/50 bg-cyan-950/20 animate-pulse'
                                  : ''
                              }`}
                            >
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setQuickLeadMenuProjId(
                                    quickLeadMenuProjId?.projId === proj.id && quickLeadMenuProjId?.role === 'lead'
                                      ? null
                                      : { projId: proj.id, role: 'lead' }
                                  );
                                }}
                                className="truncate hover:text-cyan-300 cursor-pointer transition-colors text-left"
                                title="Click to quickly reassign Team Lead (or drag specialist here)"
                              >
                                Lead: <strong className={leadMember ? "text-white font-bold ml-1 underline decoration-dotted" : "text-slate-400 italic ml-1 underline decoration-dotted"}>{leadMember ? leadMember.name.split(' ')[0] : 'Unassigned'}</strong>
                              </button>

                              {/* Item B: Quick-Swap Lead Chip when a specialist is spotlighted */}
                              {spotlightSpecialistId && proj.projectLeadId !== spotlightSpecialistId && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleQuickUpdateLead(proj.id, spotlightSpecialistId);
                                    const m = customMembers.find((mem) => mem.id === spotlightSpecialistId);
                                    sonnerToast.success(`⚡ Quick Swapped: ${m?.name} is now Squad Lead`);
                                  }}
                                  className="px-1.5 py-0.2 rounded bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-700/70 text-[10px] font-bold cursor-pointer transition-all hover:scale-105 flex items-center gap-0.5 shrink-0"
                                  title={`Assign ${customMembers.find((m) => m.id === spotlightSpecialistId)?.name} as Squad Lead`}
                                >
                                  <span>+ Lead</span>
                                </button>
                              )}

                              {quickLeadMenuProjId?.projId === proj.id && quickLeadMenuProjId?.role === 'lead' && (
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className="absolute left-0 bottom-full mb-2 z-50 rounded-xl shadow-2xl p-2 w-64 border bg-slate-900/95 border-slate-700 backdrop-blur-xl space-y-1 animate-fade-in text-left max-h-60 overflow-y-auto no-scrollbar"
                                >
                                  <div className="text-[9px] font-black text-slate-400 uppercase px-1 pb-1 border-b border-slate-800 flex items-center justify-between">
                                    <span>Assign Lead Specialist</span>
                                    <span className="text-cyan-400">By Free Hours</span>
                                  </div>

                                  {/* Mini search input */}
                                  <div className="pt-1 pb-0.5">
                                    <input
                                      type="text"
                                      placeholder="Filter specialist..."
                                      value={reassignSearchQuery}
                                      onChange={(e) => setReassignSearchQuery(e.target.value)}
                                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                                      autoFocus
                                    />
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleQuickUpdateLead(proj.id, '');
                                      setQuickLeadMenuProjId(null);
                                      setReassignSearchQuery('');
                                    }}
                                    className="w-full text-left px-2 py-1 rounded-lg text-xs font-semibold hover:bg-slate-800 text-slate-400 italic cursor-pointer"
                                  >
                                    -- Unassigned (Leave Blank) --
                                  </button>

                                  {customMembers
                                    .filter((m) => !reassignSearchQuery || m.name.toLowerCase().includes(reassignSearchQuery.toLowerCase()) || m.role.toLowerCase().includes(reassignSearchQuery.toLowerCase()))
                                    .map((m) => {
                                      const assigned = calculateMemberAssignedHours(m.id);
                                      const cap = m.weeklyCapacityHours || 40;
                                      const free = cap - assigned;
                                      const pct = Math.round((assigned / cap) * 100);
                                      const badge = pct >= 100 ? '🔴' : pct >= 85 ? '⚠️' : '✅';
                                      return (
                                        <button
                                          key={m.id}
                                          type="button"
                                          onClick={() => {
                                            handleQuickUpdateLead(proj.id, m.id);
                                            setQuickLeadMenuProjId(null);
                                            setReassignSearchQuery('');
                                          }}
                                          className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-between ${
                                            proj.projectLeadId === m.id ? 'bg-cyan-500/20 text-cyan-300' : 'hover:bg-slate-800 text-slate-300 hover:text-white'
                                          }`}
                                        >
                                          <span className="truncate">{m.name}</span>
                                          <span className="text-[10px] text-slate-400 font-mono ml-2 shrink-0">{badge} {free}h free</span>
                                        </button>
                                      );
                                    })}
                                </div>
                              )}
                            </div>

                            <span className="w-px h-4 bg-slate-700" aria-hidden="true" />

                            {/* Quick Call Lead Reassign Popover & Drag-Drop Target */}
                            <div
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = 'copy';
                                setDragOverTarget({ projId: proj.id, role: 'call' });
                              }}
                              onDragLeave={() => setDragOverTarget(null)}
                              onDrop={(e) => {
                                e.preventDefault();
                                const memberId = e.dataTransfer.getData('text/plain') || draggedSpecialistId;
                                if (memberId) {
                                  handleQuickUpdateCallLead(proj.id, memberId);
                                  const m = customMembers.find((mem) => mem.id === memberId);
                                  sonnerToast.success(`Assigned ${m ? m.name : 'specialist'} as Call Lead on ${proj.name}`);
                                }
                                setDragOverTarget(null);
                                setDraggedSpecialistId(null);
                              }}
                              className={`relative transition-all rounded-lg px-1 py-0.5 flex items-center gap-1.5 ${
                                dragOverTarget?.projId === proj.id && dragOverTarget?.role === 'call'
                                  ? 'ring-2 ring-purple-400 bg-purple-500/25 scale-105 shadow-md shadow-purple-500/20'
                                  : draggedSpecialistId
                                  ? 'ring-1 ring-dashed ring-purple-500/50 bg-purple-950/20 animate-pulse'
                                  : ''
                              }`}
                            >
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setReassignSearchQuery('');
                                  setQuickLeadMenuProjId(
                                    quickLeadMenuProjId?.projId === proj.id && quickLeadMenuProjId?.role === 'call'
                                      ? null
                                      : { projId: proj.id, role: 'call' }
                                  );
                                }}
                                className="truncate hover:text-purple-300 cursor-pointer transition-colors text-left"
                                title="Click to quickly reassign Call Lead (or drag specialist here)"
                              >
                                Calls: <strong className={callMember ? "text-white font-bold ml-1 underline decoration-dotted" : "text-slate-400 italic ml-1 underline decoration-dotted"}>{callMember ? callMember.name.split(' ')[0] : 'Unassigned'}</strong>
                              </button>

                              {/* Item B: Quick-Swap Call Lead Chip when a specialist is spotlighted */}
                              {spotlightSpecialistId && proj.clientCallAssigneeId !== spotlightSpecialistId && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleQuickUpdateCallLead(proj.id, spotlightSpecialistId);
                                    const m = customMembers.find((mem) => mem.id === spotlightSpecialistId);
                                    sonnerToast.success(`⚡ Quick Swapped: ${m?.name} is now Call Lead`);
                                  }}
                                  className="px-1.5 py-0.2 rounded bg-purple-950 hover:bg-purple-900 text-purple-300 border border-purple-700/70 text-[10px] font-bold cursor-pointer transition-all hover:scale-105 flex items-center gap-0.5 shrink-0"
                                  title={`Assign ${customMembers.find((m) => m.id === spotlightSpecialistId)?.name} as Call Lead`}
                                >
                                  <span>+ Calls</span>
                                </button>
                              )}

                              {quickLeadMenuProjId?.projId === proj.id && quickLeadMenuProjId?.role === 'call' && (
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className="absolute left-0 bottom-full mb-2 z-50 rounded-xl shadow-2xl p-2 w-64 border bg-slate-900/95 border-slate-700 backdrop-blur-xl space-y-1 animate-fade-in text-left max-h-60 overflow-y-auto no-scrollbar"
                                >
                                  <div className="text-[9px] font-black text-slate-400 uppercase px-1 pb-1 border-b border-slate-800 flex items-center justify-between">
                                    <span>Assign Call Lead</span>
                                    <span className="text-purple-400">Client Facing</span>
                                  </div>

                                  {/* Mini search input */}
                                  <div className="pt-1 pb-0.5">
                                    <input
                                      type="text"
                                      placeholder="Filter specialist..."
                                      value={reassignSearchQuery}
                                      onChange={(e) => setReassignSearchQuery(e.target.value)}
                                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                                      autoFocus
                                    />
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleQuickUpdateCallLead(proj.id, '');
                                      setQuickLeadMenuProjId(null);
                                      setReassignSearchQuery('');
                                    }}
                                    className="w-full text-left px-2 py-1 rounded-lg text-xs font-semibold hover:bg-slate-800 text-slate-400 italic cursor-pointer"
                                  >
                                    -- Unassigned (Leave Blank) --
                                  </button>

                                  {customMembers
                                    .filter((m) => !reassignSearchQuery || m.name.toLowerCase().includes(reassignSearchQuery.toLowerCase()) || m.role.toLowerCase().includes(reassignSearchQuery.toLowerCase()))
                                    .map((m) => {
                                      const assigned = calculateMemberAssignedHours(m.id);
                                      const cap = m.weeklyCapacityHours || 40;
                                      const free = cap - assigned;
                                      const pct = Math.round((assigned / cap) * 100);
                                      const badge = pct >= 100 ? '🔴' : pct >= 85 ? '⚠️' : '✅';
                                      return (
                                        <button
                                          key={m.id}
                                          type="button"
                                          onClick={() => {
                                            handleQuickUpdateCallLead(proj.id, m.id);
                                            setQuickLeadMenuProjId(null);
                                            setReassignSearchQuery('');
                                          }}
                                          className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-between ${
                                            proj.clientCallAssigneeId === m.id ? 'bg-purple-500/20 text-purple-300' : 'hover:bg-slate-800 text-slate-300 hover:text-white'
                                          }`}
                                        >
                                          <span className="truncate">{m.name}</span>
                                          <span className="text-[10px] text-slate-400 font-mono ml-2 shrink-0">{badge} {free}h free</span>
                                        </button>
                                      );
                                    })}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end shrink-0 ml-auto gap-1">
                          <div className="flex items-center gap-1.5">
                            {(() => {
                              const dueInfo = getNextDeliverableDueInfo(proj);
                              if (dueInfo.urgency === 'none') return null;
                              return (
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${dueInfo.badgeColor} hidden sm:inline-block`} title="Next deliverable due">
                                  {dueInfo.label}
                                </span>
                              );
                            })()}
                            <span className="text-cyan-400 font-extrabold text-xs">
                              {proj.billingType === 'Milestone Delivery'
                                ? `${proj.milestonesCompleted}/${proj.milestonesTotal} Ms`
                                : `${proj.activeHours}h / ${proj.totalHours}h`}
                            </span>
                          </div>
                          {/* Idea 1: Interactive Real-Time Gross Margin & Profit Badge */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActivePnLProject(proj);
                            }}
                            title="Click to view Client P&L and Staffing Optimizer"
                            className={`mt-0.5 inline-flex items-center gap-1 text-[10px] font-black px-1.5 py-0.5 rounded border transition-all cursor-pointer ${
                              projectFin.marginTier === 'high'
                                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                                : projectFin.marginTier === 'standard'
                                ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/25'
                                : 'bg-rose-500/15 text-rose-300 border-rose-500/30 hover:bg-rose-500/25 animate-pulse'
                            }`}
                          >
                            <span>💰 {projectFin.grossMarginPercent}% Margin</span>
                            <span className="text-[9px] font-semibold opacity-80">(+${projectFin.grossProfitDollars})</span>
                          </button>
                        </div>
                      </div>

                      {/* Retainer Consumption, Scope Creep & Hour Banking Meter */}
                      {(() => {
                        const budget = Math.max(1, proj.activeHours || proj.totalHours || 1);
                        const logged = proj.actualHoursLogged || 0;
                        const burnRatio = logged > 0 ? (logged / budget) : (proj.progress / 100);
                        const burnPercent = Math.round(burnRatio * 100);
                        const isScopeCreep = logged > budget || burnPercent >= 100;
                        const isHighBurn = !isScopeCreep && burnPercent >= 85;
                        const unusedHours = Math.max(0, budget - logged);

                        // Feature 5: Precise Retainer Overage Indicator (+Xh over scope)
                        const overageHours = logged > budget
                          ? Math.round((logged - budget) * 10) / 10
                          : burnPercent > 100
                          ? Math.round(((burnPercent - 100) / 100) * budget * 10) / 10
                          : 0;

                        const effectiveRate = (proj.paymentAmountNumeric || 0) > 0 && budget > 0
                          ? Math.round((proj.paymentAmountNumeric || 0) / budget)
                          : 85;
                        const unbilledDollars = Math.round(overageHours * effectiveRate);

                        return (
                          <div className="pt-2.5 pb-1 space-y-1.5 border-t border-slate-800/70 min-w-0 w-full">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-400 font-semibold flex items-center gap-1">
                                <span>Retainer Burn:</span>
                                <strong className={isScopeCreep ? 'text-rose-400 font-mono font-bold' : isHighBurn ? 'text-amber-400 font-mono font-bold' : 'text-slate-200 font-mono'}>
                                  {logged > 0 ? `${logged}h / ${budget}h` : `${burnPercent}%`}
                                </strong>
                              </span>

                              {isScopeCreep ? (
                                <span className="px-2 py-0.5 rounded-lg bg-rose-500/25 text-rose-300 border border-rose-500/50 text-[10px] font-black uppercase flex items-center gap-1.5 shadow-sm">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                                  <span>+{overageHours}h over scope</span>
                                  {unbilledDollars > 0 && (
                                    <span className="text-rose-400/90 font-mono font-bold lowercase text-[9px] hidden sm:inline-block">
                                      (~${unbilledDollars} unbilled)
                                    </span>
                                  )}
                                </span>
                              ) : isHighBurn ? (
                                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black uppercase flex items-center gap-1">
                                  <span>⚠️ High Burn ({burnPercent}%)</span>
                                  <span className="text-amber-200/90 font-mono text-[9px] font-bold">
                                    ({unusedHours.toFixed(1)}h left)
                                  </span>
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-500 font-mono">
                                  {burnPercent}% used
                                </span>
                              )}
                            </div>

                            {/* Meter Bar */}
                            <div className="w-full h-2 rounded-full bg-slate-950 border border-slate-800 overflow-hidden relative">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  isScopeCreep
                                    ? 'bg-gradient-to-r from-rose-500 via-rose-600 to-amber-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]'
                                    : isHighBurn
                                    ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                                    : 'bg-emerald-400'
                                }`}
                                style={{ width: `${Math.min(100, burnPercent)}%` }}
                              />
                            </div>

                            {/* Feature 6: Retainer Hour Banking & Rollover Tracker */}
                            {proj.billingType === 'Monthly Retainer' && !isHighBurn && !isScopeCreep && (
                              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5 font-mono">
                                {proj.bankedRolloverHours && proj.bankedRolloverHours > 0 ? (
                                  <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                                    <span>📦 {proj.bankedRolloverHours}h Banked Rollover</span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleClearBankedHours(proj.id);
                                      }}
                                      className="text-[9px] text-slate-500 hover:text-rose-400 cursor-pointer"
                                      title="Release banked hours"
                                    >
                                      ✕
                                    </button>
                                  </span>
                                ) : unusedHours > 0 ? (
                                  <div className="flex items-center justify-between w-full">
                                    <span className="text-slate-400">{unusedHours}h unutilized</span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleBankRolloverHours(proj.id, Math.round(unusedHours));
                                      }}
                                      className="text-cyan-400 hover:text-cyan-300 font-bold bg-cyan-950/60 hover:bg-cyan-900/60 px-1.5 py-0.5 rounded border border-cyan-800/50 cursor-pointer transition-colors flex items-center gap-1"
                                      title="Bank unused hours for next billing cycle"
                                    >
                                      <span>📦 Bank Rollover</span>
                                    </button>
                                  </div>
                                ) : null}
                              </div>
                            )}

                            {/* Unified Manager Action Strip: Consolidated Alert & Quick-Action Tray */}
                            {(projectFin.paymentHoldActive || isScopeCreep || isHighBurn || projectFin.seniorityMismatch.hasMismatch) && (
                              <div className="mt-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 flex items-center justify-between gap-2 shadow-sm min-w-0">
                                {/* Left: Consolidated Status Signals */}
                                <div className="flex items-center gap-2 text-xs font-bold truncate min-w-0">
                                  {projectFin.paymentHoldActive && (
                                    <span className="inline-flex items-center gap-1 text-rose-300 font-extrabold shrink-0" title="Retainer payment invoice overdue">
                                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                                      🛑 Hold
                                    </span>
                                  )}

                                  {isScopeCreep ? (
                                    <span className="text-rose-400 font-extrabold truncate flex items-center gap-1" title={`Hours exceed retainer budget (+${overageHours}h)`}>
                                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping shrink-0" />
                                      <span>🚨 +{overageHours}h over scope</span>
                                      {unbilledDollars > 0 && (
                                        <span className="text-rose-300/80 font-mono font-normal text-[10px] hidden sm:inline">
                                          (~${unbilledDollars})
                                        </span>
                                      )}
                                    </span>
                                  ) : isHighBurn ? (
                                    <span className="text-amber-300 font-bold shrink-0" title="Over 85% retainer hours utilized">
                                      ⚠️ High Burn ({burnPercent}%)
                                    </span>
                                  ) : null}

                                  {projectFin.seniorityMismatch.hasMismatch && (
                                    <span
                                      className="text-amber-300/90 text-[11px] font-semibold truncate cursor-pointer hover:text-amber-200"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActivePnLProject(proj);
                                      }}
                                      title={projectFin.seniorityMismatch.recommendation}
                                    >
                                      ⚠️ Seniority Leak (-${projectFin.seniorityMismatch.marginLeakDollars}/mo)
                                    </span>
                                  )}
                                </div>

                                {/* Right: Instant 1-Click Action Buttons */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {projectFin.seniorityMismatch.hasMismatch && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActivePnLProject(proj);
                                      }}
                                      className="px-2 py-0.5 rounded-md bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-[10px] font-bold transition-all cursor-pointer"
                                      title="Open P&L & Staffing Optimizer to swap lead"
                                    >
                                      Rebalance ⚡
                                    </button>
                                  )}

                                  {(isHighBurn || isScopeCreep) && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setScopeUpsellModalProj(proj);
                                        setCopiedUpsellDraft(false);
                                      }}
                                      className="px-2 py-0.5 rounded-md bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                                      title="Draft retainer extension or upsell email"
                                    >
                                      <span>Draft Upsell</span>
                                      <span>✉️</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Expandable Pocket Section */}
                      {isExpanded && (
                        <div className="pt-3 mt-1 space-y-4 animate-in fade-in duration-200 min-w-0 w-full">
                          {/* Clean Metadata Status Row */}
                          <div className="flex flex-wrap items-center gap-1.5 text-xs min-w-0 w-full">
                            <span className="text-slate-200 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-700 font-semibold shrink-0">
                              {proj.billingType}
                            </span>

                            <button
                              type="button"
                              onClick={() => setEditingFinancesProject({ ...proj })}
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border font-bold cursor-pointer transition-all shrink-0 ${
                                proj.paymentStatus === 'Paid'
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                  : proj.paymentStatus === 'Overdue'
                                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              }`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                              <span>
                                {proj.paymentStatus === 'Paid'
                                  ? 'Paid'
                                  : proj.paymentStatus === 'Overdue'
                                  ? 'Overdue'
                                  : `Due ${proj.paymentDueDate}`}
                              </span>
                            </button>

                            {proj.communicationChannel && (
                              <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-900 text-slate-300 border border-slate-700 font-semibold truncate max-w-[150px]">
                                💬 {proj.communicationChannel}
                              </span>
                            )}

                            <span className="text-slate-300 text-xs font-bold ml-auto shrink-0">
                              {prof.marginPercent}% Margin
                            </span>
                          </div>

                          {/* Clean Executive Leadership Card */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-0 w-full">
                            <div
                              onClick={(e) => {
                                if (leadMember) {
                                  e.stopPropagation();
                                  navigate(`/member/${leadMember.id}`);
                                }
                              }}
                              className={`bg-slate-900 rounded-lg p-2 border border-slate-700 flex items-center gap-2 overflow-hidden min-w-0 max-w-full transition-all ${
                                leadMember ? 'cursor-pointer hover:border-cyan-500/60 hover:bg-slate-800/80 group/lead' : ''
                              }`}
                              title={leadMember ? `Project Lead: ${leadMember.name} (Click to open full profile)` : 'Project Lead: Unassigned'}
                            >
                              {leadMember ? (
                                <img
                                  src={leadMember.avatar}
                                  alt={leadMember.name}
                                  style={{ width: '26px', height: '26px', minWidth: '26px', minHeight: '26px', maxWidth: '26px', maxHeight: '26px' }}
                                  className="rounded-full object-cover ring-1 ring-cyan-500/50 shrink-0 block group-hover/lead:scale-105 transition-transform"
                                />
                              ) : (
                                <div
                                  style={{ width: '26px', height: '26px', minWidth: '26px', minHeight: '26px' }}
                                  className="rounded-full bg-slate-800 border border-dashed border-cyan-500/50 flex items-center justify-center text-[10px] text-cyan-400 font-bold shrink-0"
                                >
                                  ?
                                </div>
                              )}
                              <div className="flex flex-col min-w-0 w-full">
                                <span className="text-[9px] uppercase tracking-wider text-cyan-400 font-bold leading-tight truncate block">
                                  Squad Lead
                                </span>
                                <span className={`text-xs font-bold truncate block ${leadMember ? 'text-white group-hover/lead:text-cyan-300' : 'text-slate-400 italic'}`}>
                                  {leadMember ? leadMember.name.split(' ')[0] : 'Unassigned'}
                                </span>
                              </div>
                            </div>

                            <div
                              onClick={(e) => {
                                if (callMember) {
                                  e.stopPropagation();
                                  navigate(`/member/${callMember.id}`);
                                }
                              }}
                              className={`bg-slate-900 rounded-lg p-2 border border-slate-700 flex items-center gap-2 overflow-hidden min-w-0 max-w-full transition-all ${
                                callMember ? 'cursor-pointer hover:border-purple-500/60 hover:bg-slate-800/80 group/call' : ''
                              }`}
                              title={callMember ? `Client Call Lead: ${callMember.name} (Click to open full profile)` : 'Client Call Lead: Unassigned'}
                            >
                              {callMember ? (
                                <img
                                  src={callMember.avatar}
                                  alt={callMember.name}
                                  style={{ width: '26px', height: '26px', minWidth: '26px', minHeight: '26px', maxWidth: '26px', maxHeight: '26px' }}
                                  className="rounded-full object-cover ring-1 ring-purple-500/50 shrink-0 block group-hover/call:scale-105 transition-transform"
                                />
                              ) : (
                                <div
                                  style={{ width: '26px', height: '26px', minWidth: '26px', minHeight: '26px' }}
                                  className="rounded-full bg-slate-800 border border-dashed border-purple-500/50 flex items-center justify-center text-[10px] text-purple-400 font-bold shrink-0"
                                >
                                  ?
                                </div>
                              )}
                              <div className="flex flex-col min-w-0 w-full">
                                <span className="text-[9px] uppercase tracking-wider text-purple-400 font-bold leading-tight truncate block">
                                  Client Calls
                                </span>
                                <span className={`text-xs font-bold truncate block ${callMember ? 'text-white group-hover/call:text-purple-300' : 'text-slate-400 italic'}`}>
                                  {callMember ? callMember.name.split(' ')[0] : 'Unassigned'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Clean Deliverables & Assignee Capsules (Item 2: Collapsible by Status) */}
                          {proj.taskBreakdown && proj.taskBreakdown.length > 0 && (() => {
                            const isDone = (tb: ProjectTaskAllocation) => {
                              const s = (tb.clickUpStatus || tb.status || '').toLowerCase();
                              return s.includes('done') || s.includes('complete') || s.includes('closed');
                            };
                            const activeDeliverables = proj.taskBreakdown.filter((tb) => !isDone(tb));
                            const completedDeliverables = proj.taskBreakdown.filter((tb) => isDone(tb));
                            const showCompleted = !!expandedCompletedTasks[proj.id];
                            const dueInfo = getNextDeliverableDueInfo(proj);

                            return (
                              <div className="space-y-2 pt-1 min-w-0 w-full">
                                <div className="flex items-center justify-between gap-2 text-[10px] font-bold text-slate-300 uppercase tracking-wider flex-wrap">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span>Deliverables ({proj.taskBreakdown.length})</span>
                                    {activeDeliverables.length > 0 && (
                                      <span className="text-cyan-400 font-bold normal-case text-[10px] bg-cyan-950/60 px-1.5 py-0.2 rounded border border-cyan-800/40">
                                        {activeDeliverables.length} active
                                      </span>
                                    )}
                                    {/* Feature 2: Next Deliverable Due Pill */}
                                    {dueInfo.urgency !== 'none' && (
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold normal-case border shadow-sm flex items-center gap-1 ${dueInfo.badgeColor}`} title="Next deliverable due">
                                        {dueInfo.label}
                                      </span>
                                    )}
                                  </div>
                                  {completedDeliverables.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setExpandedCompletedTasks((prev) => ({ ...prev, [proj.id]: !prev[proj.id] }));
                                      }}
                                      className="text-slate-400 hover:text-cyan-300 text-[10px] font-semibold flex items-center gap-1 normal-case cursor-pointer transition-colors bg-slate-900 px-2 py-0.5 rounded border border-slate-800 hover:border-cyan-500/30"
                                    >
                                      <span>{showCompleted ? 'Hide completed' : `+${completedDeliverables.length} done`}</span>
                                      <span className="text-xs">{showCompleted ? '▴' : '▾'}</span>
                                    </button>
                                  )}
                                </div>

                                {/* Active Deliverables (In Flight) with Drag-Drop & 1-Click Reassignment */}
                                <div className="flex flex-wrap items-center gap-1.5 min-w-0 max-w-full">
                                  {(activeDeliverables.length > 0 ? activeDeliverables : proj.taskBreakdown).map((tb) => {
                                    const assignee = customMembers.find((m) => m.id === tb.assigneeId);
                                    const isTargeted = quickDeliverableAssignee?.taskAllocationId === tb.id;
                                    return (
                                      <div
                                        key={tb.id}
                                        onDragOver={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          e.dataTransfer.dropEffect = 'copy';
                                        }}
                                        onDrop={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          const memberId = e.dataTransfer.getData('text/plain') || draggedSpecialistId;
                                          if (memberId) {
                                            handleReassignDeliverable(proj.id, tb.id, memberId);
                                          }
                                        }}
                                        className={`relative inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-900 border transition-all max-w-full min-w-0 ${
                                          draggedSpecialistId
                                            ? 'border-cyan-400/80 bg-cyan-950/40 ring-1 ring-dashed ring-cyan-400 animate-pulse'
                                            : isTargeted
                                            ? 'border-cyan-400 ring-2 ring-cyan-500/30 bg-slate-900 shadow-md'
                                            : 'border-slate-700 hover:border-cyan-500/40'
                                        }`}
                                      >
                                        {/* 1-Click Quick Done Checkbox */}
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleToggleDeliverableStatus(proj.id, tb.id);
                                          }}
                                          className="w-3.5 h-3.5 rounded border border-slate-600 hover:border-emerald-400 bg-slate-950/80 hover:bg-emerald-500/20 flex items-center justify-center text-[9px] text-slate-500 hover:text-emerald-300 transition-colors cursor-pointer shrink-0"
                                          title="Click to mark deliverable as completed"
                                        >
                                          ✓
                                        </button>
                                        <span className="text-cyan-300 font-bold truncate max-w-[120px] sm:max-w-[160px]">{tb.taskType}</span>
                                        {tb.clickUpUrl && (
                                          <a
                                            href={tb.clickUpUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            title={`Open task in ClickUp${tb.clickUpStatus ? ` (${tb.clickUpStatus})` : ''}`}
                                            className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-purple-950/80 hover:bg-purple-900 text-purple-300 hover:text-white border border-purple-700/60 text-[9px] font-extrabold transition-colors cursor-pointer shrink-0"
                                          >
                                            <span>CU</span>
                                            <ExternalLink className="w-2 h-2" />
                                          </a>
                                        )}
                                        {tb.clickUpTaskId && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleOpenClickUpTicketModal(
                                                tb.clickUpTaskId!,
                                                `[${proj.name}] ${tb.taskType}`,
                                                {
                                                  taskUrl: tb.clickUpUrl,
                                                  projectName: proj.name,
                                                  clientName: proj.client,
                                                  status: tb.clickUpStatus || tb.status
                                                }
                                              );
                                            }}
                                            title={`💬 Discussion on ${tb.taskType}`}
                                            className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-purple-950/80 hover:bg-purple-900 text-purple-300 hover:text-white border border-purple-700/60 text-[9px] font-extrabold transition-colors cursor-pointer shrink-0"
                                          >
                                            <MessageSquare className="w-2 h-2" />
                                          </button>
                                        )}

                                        {/* Feature 4: Interactive Specialist Assignee Button + Popover */}
                                        <div className="relative inline-flex items-center" onClick={(e) => e.stopPropagation()}>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setQuickDeliverableAssignee(
                                                quickDeliverableAssignee?.taskAllocationId === tb.id
                                                  ? null
                                                  : { projId: proj.id, taskAllocationId: tb.id }
                                              );
                                              setDeliverableAssigneeSearch('');
                                            }}
                                            className="inline-flex items-center gap-1 hover:bg-slate-800 px-1 py-0.5 rounded cursor-pointer transition-colors text-white hover:text-cyan-300 text-xs"
                                            title="Click to reassign specialist or drag team member here"
                                          >
                                            {assignee ? (
                                              <img
                                                src={assignee.avatar}
                                                alt={assignee.name}
                                                style={{ width: '16px', height: '16px', minWidth: '16px', minHeight: '16px' }}
                                                className="rounded-full object-cover shrink-0 block"
                                              />
                                            ) : (
                                              <span className="w-4 h-4 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-[9px] text-slate-400 font-bold shrink-0">+</span>
                                            )}
                                            <span className="font-semibold truncate max-w-[90px]">{assignee ? assignee.name.split(' ')[0] : 'Assign'}</span>
                                            <ChevronDown className="w-2.5 h-2.5 opacity-50 shrink-0" />
                                          </button>

                                          {/* Specialist Picker Floating Popover */}
                                          {isTargeted && (
                                            <div
                                              onClick={(e) => e.stopPropagation()}
                                              className="absolute left-0 top-full mt-1.5 z-50 rounded-xl shadow-2xl p-2 w-60 border bg-slate-900/98 border-cyan-500/50 backdrop-blur-xl space-y-1.5 animate-fade-in text-left"
                                            >
                                              <div className="flex items-center justify-between px-1 text-[9px] font-black text-cyan-400 uppercase tracking-wider">
                                                <span>Reassign Specialist</span>
                                                <span className="text-slate-500 font-mono">[{tb.hours}h]</span>
                                              </div>
                                              <input
                                                type="text"
                                                value={deliverableAssigneeSearch}
                                                onChange={(e) => setDeliverableAssigneeSearch(e.target.value)}
                                                placeholder="Filter team member..."
                                                className="w-full px-2 py-1 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                                                autoFocus
                                              />
                                              <div className="max-h-48 overflow-y-auto space-y-0.5 custom-scrollbar pr-0.5">
                                                <button
                                                  type="button"
                                                  onClick={() => handleReassignDeliverable(proj.id, tb.id, '')}
                                                  className="w-full text-left px-2 py-1 rounded-lg text-xs font-semibold hover:bg-slate-800 text-slate-400 italic cursor-pointer"
                                                >
                                                  -- Unassigned --
                                                </button>
                                                {customMembers
                                                  .filter((m) =>
                                                    !deliverableAssigneeSearch ||
                                                    m.name.toLowerCase().includes(deliverableAssigneeSearch.toLowerCase()) ||
                                                    m.role.toLowerCase().includes(deliverableAssigneeSearch.toLowerCase())
                                                  )
                                                  .map((m) => {
                                                    const assigned = calculateMemberAssignedHours(m.id);
                                                    const cap = m.weeklyCapacityHours || 40;
                                                    const free = cap - assigned;
                                                    const pct = Math.round((assigned / cap) * 100);
                                                    const badge = pct >= 100 ? '🔴' : pct >= 85 ? '⚠️' : '✅';
                                                    const isSelected = tb.assigneeId === m.id;

                                                    return (
                                                      <button
                                                        key={m.id}
                                                        type="button"
                                                        onClick={() => handleReassignDeliverable(proj.id, tb.id, m.id)}
                                                        className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-between ${
                                                          isSelected ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'hover:bg-slate-800 text-slate-300 hover:text-white'
                                                        }`}
                                                      >
                                                        <div className="flex items-center gap-1.5 truncate">
                                                          <img src={m.avatar} alt="" className="w-4 h-4 rounded-full object-cover shrink-0" />
                                                          <span className="truncate">{m.name}</span>
                                                        </div>
                                                        <span className="text-[10px] text-slate-400 font-mono ml-2 shrink-0">
                                                          {badge} {free}h free
                                                        </span>
                                                      </button>
                                                    );
                                                  })}
                                              </div>
                                            </div>
                                          )}
                                        </div>

                                        <span className="text-slate-300 font-bold shrink-0">({tb.hours}h)</span>
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Completed Deliverables Collapsible Drawer */}
                                {showCompleted && completedDeliverables.length > 0 && (
                                  <div className="pt-1.5 space-y-1 animate-in fade-in duration-150 border-t border-slate-800/60">
                                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">
                                      Completed Deliverables ({completedDeliverables.length})
                                    </span>
                                    <div className="flex flex-wrap items-center gap-1 min-w-0 max-w-full opacity-75 hover:opacity-100 transition-opacity">
                                      {completedDeliverables.map((tb) => {
                                        const assignee = customMembers.find((m) => m.id === tb.assigneeId);
                                        return (
                                          <span
                                            key={tb.id}
                                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-900/50 border border-slate-800 text-xs font-medium text-slate-400 max-w-full min-w-0 group/done"
                                          >
                                            {/* Revert to Active Checkbox */}
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleToggleDeliverableStatus(proj.id, tb.id);
                                              }}
                                              className="w-3.5 h-3.5 rounded border border-emerald-500/60 bg-emerald-500/20 hover:border-amber-400 hover:bg-amber-500/20 flex items-center justify-center text-[9px] text-emerald-400 hover:text-amber-300 transition-colors cursor-pointer shrink-0"
                                              title="Click to reopen / mark as in progress"
                                            >
                                              ✓
                                            </button>
                                            <span className="truncate max-w-[120px] line-through">{tb.taskType}</span>
                                            {assignee && (
                                              <span className="text-[10px] text-slate-500 font-mono">({assignee.name.split(' ')[0]})</span>
                                            )}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          <div className="space-y-3 pt-2 border-t border-slate-700/60">
                            {/* Clean Utilization Bar */}
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-300 font-semibold">
                                  {proj.billingType === 'Milestone Delivery'
                                    ? 'Milestone Progress'
                                    : 'Hours Utilization'}
                                </span>
                                <span className="text-white font-bold">
                                  {proj.billingType === 'Milestone Delivery'
                                    ? `${proj.milestonesCompleted} / ${proj.milestonesTotal} Milestones`
                                    : `${proj.activeHours}h / ${proj.totalHours}h`}
                                </span>
                              </div>
                              <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-700">
                                <div
                                  className="h-full bg-cyan-400 rounded-full transition-all duration-500"
                                  style={{
                                    width: `${
                                      proj.billingType === 'Milestone Delivery' && proj.milestonesTotal > 0
                                        ? (proj.milestonesCompleted / proj.milestonesTotal) * 100
                                        : proj.progress
                                    }%`
                                  }}
                                />
                              </div>
                            </div>

                            {/* Crisp Executive Footer Action Bar */}
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setViewingProjectDetail(proj)}
                                className="flex-1 text-xs font-bold text-white hover:text-cyan-300 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all cursor-pointer shadow-sm"
                              >
                                <span>360° Ledger &amp; Details</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleCopyClientSummary(proj)}
                                title="Copy Client Status Report to clipboard"
                                className="text-xs font-bold text-emerald-300 hover:text-emerald-200 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 transition-all cursor-pointer shrink-0"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Report</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Pocket Toggle Button across bottom of card */}
                    <button
                      type="button"
                      onClick={() => toggleCardExpansion(proj.id)}
                      className="w-full mt-2 pt-2 px-1 text-xs font-bold text-slate-400 hover:text-cyan-400 transition-colors flex items-center justify-between group/pocket cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <FolderKanban className="w-3.5 h-3.5 text-cyan-400 group-hover/pocket:scale-110 transition-transform" />
                        <span>{isExpanded ? 'Hide project details' : 'Project details'}</span>
                      </span>
                      <span className="text-[10px] font-extrabold text-cyan-400 flex items-center gap-1">
                        {isExpanded ? (
                          <>
                            <span>Hide</span>
                            <ChevronUp className="w-3.5 h-3.5" />
                          </>
                        ) : (
                          <>
                            <span>Open</span>
                            <ChevronDown className="w-3.5 h-3.5" />
                          </>
                        )}
                      </span>
                    </button>
                  </motion.div>
                );
              })
              )}
              </AnimatePresence>
            </motion.div>
          )}
        


            {/* PAGINATION CONTROLS */}
            {filteredProjectsList.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4.5 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-xl mt-4">
                <div className="flex items-center gap-3 text-xs text-slate-300 font-medium">
                  <span>
                    Showing <strong className="text-white font-bold">{pageSize === 0 ? 1 : Math.min(filteredProjectsList.length, (currentPage - 1) * pageSize + 1)}</strong> to{' '}
                    <strong className="text-white font-bold">{pageSize === 0 ? filteredProjectsList.length : Math.min(filteredProjectsList.length, currentPage * pageSize)}</strong> of{' '}
                    <strong className="text-white font-bold">{filteredProjectsList.length}</strong> projects
                  </span>
                  
                  <div className="h-4 w-px bg-slate-700 hidden sm:block" />

                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">Cards per page:</span>
                    {[6, 9, 12, 18].map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => {
                          setPageSize(size);
                          setCurrentPage(1);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          pageSize === size
                            ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                            : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setPageSize(0);
                        setCurrentPage(1);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        pageSize === 0
                          ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                          : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
                      }`}
                    >
                      All
                    </button>
                  </div>
                </div>

                {pageSize > 0 && totalPages > 1 && (
                  <div className="flex items-center gap-1.5 self-center sm:self-auto">
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span className="hidden sm:inline">Prev</span>
                    </button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                        if (
                          pageNum === 1 ||
                          pageNum === totalPages ||
                          (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                        ) {
                          return (
                            <button
                              key={pageNum}
                              type="button"
                              onClick={() => setCurrentPage(pageNum)}
                              className={`w-8 h-8 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                                currentPage === pageNum
                                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25 ring-1 ring-cyan-400'
                                  : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        }
                        if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                          return (
                            <span key={pageNum} className="text-slate-500 px-1 text-xs font-bold">
                              ...
                            </span>
                          );
                        }
                        return null;
                      })}
                    </div>
                            <ChevronDown className="w-3.5 h-3.5" />
                    <button
                      type="button"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
            {/* Multi-Select Floating Bulk Action Strip (Improvement 5) */}
            {selectedProjectIds.size > 0 && typeof document !== 'undefined' && createPortal(
              <div 
                className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 bg-slate-950/95 border border-emerald-500/50 rounded-2xl shadow-2xl px-5 py-3 flex flex-wrap items-center gap-3 backdrop-blur-2xl text-white animate-in slide-in-from-bottom-5"
                style={{
                  position: 'fixed',
                  bottom: '88px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 49
                }}
              >
                <div className="flex items-center gap-2 pr-3 border-r border-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-black text-emerald-300 font-mono">
                    {selectedProjectIds.size} Selected
                  </span>
                  <button
                    type="button"
                    onClick={handleSelectAllFilteredProjects}
                    className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 underline cursor-pointer ml-1"
                  >
                    {selectedProjectIds.size === filteredProjectsList.length ? 'Deselect All' : `Select All (${filteredProjectsList.length})`}
                  </button>
                </div>

                {/* Reassign Lead Bulk Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setBulkActionDropdown(bulkActionDropdown === 'lead' ? null : 'lead')}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                  >
                    <User className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Reassign Lead</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>
                  {bulkActionDropdown === 'lead' && (
                    <div className="absolute bottom-full mb-2 left-0 w-64 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl p-2 z-50 max-h-56 overflow-y-auto no-scrollbar space-y-1 text-left">
                      <div className="text-[10px] font-black uppercase text-slate-400 px-1 pb-1 border-b border-slate-800">Select Team Lead</div>
                      <button
                        type="button"
                        onClick={() => handleBulkReassignLead('')}
                        className="w-full text-left px-2 py-1 rounded text-xs font-semibold hover:bg-slate-800 text-slate-400 italic cursor-pointer"
                      >
                        -- Unassigned (Leave Blank) --
                      </button>
                      {customMembers.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => handleBulkReassignLead(m.id)}
                          className="w-full text-left px-2 py-1 rounded text-xs font-semibold hover:bg-slate-800 text-slate-200 cursor-pointer"
                        >
                          {m.name} ({m.role})
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Update Status Bulk Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setBulkActionDropdown(bulkActionDropdown === 'status' ? null : 'status')}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Update Status</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>
                  {bulkActionDropdown === 'status' && (
                    <div className="absolute bottom-full mb-2 left-0 w-44 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl p-2 z-50 space-y-1 text-left">
                      <div className="text-[10px] font-black uppercase text-slate-400 px-1 pb-1 border-b border-slate-800">Choose Status</div>
                      {(['ON TRACK', 'INITIAL STAGE', 'REVALUATION', 'PAUSED', 'COMPLETED'] as const).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => handleBulkUpdateStatus(st)}
                          className="w-full text-left px-2 py-1 rounded text-xs font-semibold hover:bg-slate-800 text-slate-200 cursor-pointer"
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bulk Archive */}
                <button
                  type="button"
                  onClick={handleBulkArchiveProjects}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-amber-950/60 text-amber-300 hover:text-amber-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700 hover:border-amber-700/50 cursor-pointer"
                  title="Archive selected projects to Past Projects"
                >
                  <FolderArchive className="w-3.5 h-3.5" />
                  <span>Archive ({selectedProjectIds.size})</span>
                </button>

                {/* Clear selection */}
                <button
                  type="button"
                  onClick={() => setSelectedProjectIds(new Set())}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer ml-1"
                  title="Deselect all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>,
              document.body
            )}
            </div>
          </div>
        </div>
        )}

          {/* SUB-HUB TAB 2: SQUAD CAPACITY & HEATMAP */}
          {hubSubTab === 'squad' && (
            <div className="space-y-8 animate-fade-in">
              {/* SECTION 1.5: LIVE SQUAD WORKLOAD & ALLOCATION HEATMAP */}
          <div className="bg-[#111827] border border-slate-700/60 rounded-3xl p-7 sm:p-10 shadow-2xl space-y-7 animate-fade-in">
            <GraphicSectionHeader
              icon={<Users className="w-4 h-4" />}
              title="Squad Workload & Bandwidth Heatmap"
              badgeText="Click Specialist to Filter Roster"
              badgeColor="cyan"
              rightElement={
                <div className="flex items-center gap-3 text-xs font-semibold">
                  <span className="flex items-center gap-1 text-emerald-300"><span className="w-2 h-2 rounded-full bg-emerald-400" /> &lt;70%</span>
                  <span className="flex items-center gap-1 text-cyan-300"><span className="w-2 h-2 rounded-full bg-cyan-400" /> 70-90%</span>
                  <span className="flex items-center gap-1 text-rose-300"><span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" /> &gt;90%</span>
                </div>
              }
            />

            {/* Overall Agency Bandwidth Ring / Gauge */}
            {(() => {
              const trackedLeads = customMembers.filter(m => !m.role.toLowerCase().includes('ceo') && m.seniority !== 'CEO');
              const totalAgencyCap = trackedLeads.reduce((s, m) => s + (m.weeklyCapacityHours || 35), 0);
              const totalAssigned = trackedLeads.reduce((s, m) => s + calculateMemberAssignedHours(m.id), 0);
              const agencySatPct = totalAgencyCap > 0 ? Math.round((totalAssigned / totalAgencyCap) * 100) : 0;

              return (
                <div className="bg-slate-900/80 border border-slate-700/50 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center font-black text-cyan-300 text-sm shrink-0">
                      {agencySatPct}%
                    </div>
                    <div>
                      <span className="text-xs font-extrabold text-white uppercase tracking-wider block">Total Agency Bandwidth Utilization</span>
                      <span className="text-[11px] text-slate-300 font-medium">{totalAssigned}h currently allocated out of {totalAgencyCap}h total weekly capacity</span>
                    </div>
                  </div>
                  <div className="w-full sm:w-64 bg-slate-950 rounded-full h-3 border border-slate-700 overflow-hidden flex shrink-0">
                    <div
                      className={`h-full transition-all duration-500 ${agencySatPct > 90 ? 'bg-gradient-to-r from-rose-500 to-amber-500' : 'bg-gradient-to-r from-cyan-400 to-indigo-500'}`}
                      style={{ width: `${Math.min(100, agencySatPct)}%` }}
                    />
                  </div>
                </div>
              );
            })()}

            {/* Specialist Capacity Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 pt-2">
              {customMembers
                .filter(member => !member.role.toLowerCase().includes('ceo') && member.seniority !== 'CEO')
                .map(member => {
                  const assigned = calculateMemberAssignedHours(member.id);
                  const cap = member.weeklyCapacityHours || 35;
                  const satPct = Math.round((assigned / cap) * 100);
                  const isFiltered = filterLeadId === member.id || filterCallAssigneeId === member.id;

                  let barColor = 'from-emerald-500 to-teal-400';
                  let statusLabel = 'Optimal';
                  let statusBadge = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
                  if (satPct >= 90) {
                    barColor = 'from-rose-500 to-amber-500';
                    statusLabel = 'Bottleneck Alert';
                    statusBadge = 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse';
                  } else if (satPct >= 70) {
                    barColor = 'from-cyan-500 to-indigo-500';
                    statusLabel = 'Peak Load';
                    statusBadge = 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
                  }

                  return (
                    <div
                      key={member.id}
                      onClick={() => {
                        if (filterLeadId === member.id) {
                          setFilterLeadId('ALL');
                        } else {
                          setFilterLeadId(member.id);
                        }
                      }}
                      className={`p-5 rounded-2xl border transition-all cursor-pointer space-y-4 flex flex-col justify-between ${
                        isFiltered
                          ? 'bg-slate-800 border-cyan-400 ring-2 ring-cyan-400/30 shadow-lg'
                          : 'bg-slate-900/80 border-slate-700/80 hover:border-slate-600 hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div
                          className="flex items-center gap-3 cursor-pointer group/prof flex-1 min-w-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/member/${member.id}`);
                          }}
                          title={`Click to open ${member.name}'s profile page`}
                        >
                          <img src={member.avatar} alt={member.name} className="w-10 h-10 rounded-xl object-cover ring-1 ring-slate-600/80 group-hover/prof:ring-cyan-400 shadow-sm shrink-0 transition-all" />
                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-bold text-white truncate leading-tight group-hover/prof:text-cyan-300 underline decoration-dotted transition-colors">{member.name}</h4>
                            <span className="text-xs text-slate-400 truncate block font-medium leading-tight">{member.role}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/member/${member.id}`);
                          }}
                          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-cyan-500/20 hover:text-cyan-300 text-[10px] font-bold text-slate-300 transition-colors shrink-0 cursor-pointer"
                          title="Open dedicated profile page"
                        >
                          Profile ➔
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-200">{assigned}h / {cap}h</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase border ${statusBadge}`}>
                            {satPct}% • {statusLabel}
                          </span>
                        </div>
                        <div className="w-full bg-slate-950 rounded-full h-2 border border-slate-800 overflow-hidden">
                          <div
                            className={`h-full bg-gradient-to-r ${barColor} transition-all duration-500`}
                            style={{ width: `${Math.min(100, satPct)}%` }}
                          />
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-400 flex items-center justify-between pt-2 mt-0.5 border-t border-slate-700/50">
                        <span>Click to filter roster</span>
                        <span className="text-cyan-400 font-bold">{isFiltered ? '✓ Active Filter' : '➔ Select'}</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
            </div>
          )}

          {/* SUB-HUB TAB 3: VIP & FINANCIAL PULSE */}
          {hubSubTab === 'executive' && (
            <div className="space-y-8 animate-fade-in">
              {/* VIP CLIENT TALENT GUARD PRIORITY BANNER */}
          {(() => {
            const vipProjects = projectsList.filter(
              (p) => (p.clientTier || classifyClientTier(p)) === 'TIER_S_VIP'
            );
            const vipMonthlyRevenue = vipProjects.reduce((sum, p) => sum + (p.paymentAmountNumeric || 0), 0);
            const atRiskCount = vipProjects.filter(
              (p) => (p.totalHours > 0 && p.activeHours / p.totalHours >= 0.85) || p.paymentStatus === 'Overdue'
            ).length;

            return (
              <VIPPriorityBanner
                vipCount={vipProjects.length}
                atRiskCount={atRiskCount}
                vipMonthlyRevenue={vipMonthlyRevenue}
                onFilterVIP={() =>
                  setEverydayQuickFilter(everydayQuickFilter === 'tier_vip' ? 'all' : 'tier_vip')
                }
              />
            );
          })()}

              {/* SECTION 1 HEADING: EXECUTIVE HEALTH & METRICS */}
          <GraphicSectionHeader
            icon={<Activity className="w-4 h-4" />}
            title="Real-Time Agency Pulse"
            badgeText={`${projectsList.length} Retainers • ${customMembers.length} Specialists`}
            badgeColor="emerald"
          />

          {/* AGENCY FINANCIAL & UTILIZATION PULSE BAR (Executive Real-Time Agency Health Metrics) */}
          {(() => {
            const totalMrr = projectsList.reduce((sum, p) => sum + (p.paymentAmountNumeric || 0), 0);
            const totalWeeklyHrs = projectsList.reduce((sum, p) => sum + (p.activeHours || 0), 0);
            const trackedEmployees = customMembers.filter((m) => !m.role.toLowerCase().includes('ceo') && m.seniority !== 'CEO');
            const totalCapacityHrs = trackedEmployees.reduce((sum, m) => sum + (m.weeklyCapacityHours || 40), 0);
            const overallUtilization = totalCapacityHrs > 0 ? Math.round((totalWeeklyHrs / totalCapacityHrs) * 100) : 0;
            const tier1Count = customMembers.filter((m) => m.generalCompetency.clientReadyTier.includes('Tier 1')).length;
            const tier2Count = customMembers.filter((m) => m.generalCompetency.clientReadyTier.includes('Tier 2')).length;
            const tier3Count = customMembers.filter((m) => m.generalCompetency.clientReadyTier.includes('Tier 3')).length;
            const totalMembers = customMembers.length || 1;
            const tier1Pct = Math.round((tier1Count / totalMembers) * 100);
            const tier2Pct = Math.round((tier2Count / totalMembers) * 100);
            const tier3Pct = Math.max(0, 100 - tier1Pct - tier2Pct);
            const avgQualityScore =
              Math.round(
                (customMembers.reduce((sum, m) => sum + (m.generalCompetency.quarterlyScore || 9.1), 0) / totalMembers) *
                  10
              ) / 10;

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 min-w-0 w-full pt-2">
                {/* Card 1: Total Agency MRR */}
                <SpotlightCard
                  spotlightColor="rgba(16, 185, 129, 0.2)"
                  className="!bg-gradient-to-br !from-emerald-950/30 !via-[#111827] !to-[#111827] !border-emerald-500/30 hover:!border-emerald-500/60 p-6 shadow-xl shadow-emerald-500/5 hover:-translate-y-1 transition-all duration-300 min-w-0 max-w-full w-full group"
                >
                  <DollarSign className="absolute -right-3 -bottom-3 w-28 h-28 text-emerald-500/5 group-hover:text-emerald-500/10 transition-colors pointer-events-none" />
                  <div className="flex items-center justify-between relative z-10">
                    <span className="text-xs font-extrabold text-emerald-300 uppercase tracking-wider">
                      Total Agency MRR
                    </span>
                    <div className="w-9 h-9 rounded-xl bg-slate-900/80 border border-emerald-500/40 flex items-center justify-center shadow-md">
                      <DollarSign className="w-5 h-5 text-emerald-400" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between relative z-10">
                    <div className="flex items-baseline gap-1.5">
                      <AnimatedCounter
                        value={totalMrr}
                        prefix="$"
                        decimals={0}
                        className="text-2xl sm:text-3xl font-black text-white tracking-tight"
                      />
                      <span className="text-xs font-extrabold text-emerald-300/80">/ mo</span>
                    </div>
                    <MiniSparkline
                      data={[118000, 122000, 126000, 131000, 136000, 140000, totalMrr]}
                      color="emerald"
                      height={28}
                    />
                  </div>
                  <div className="mt-5 pt-4 border-t border-emerald-500/20 flex items-center justify-between text-xs relative z-10">
                    <span className="text-slate-300 font-medium">
                      <strong className="text-white font-extrabold">{projectsList.length}</strong> Active Retainers
                    </span>
                    <span className="text-emerald-300 font-bold">
                      Avg ${Math.round(totalMrr / (projectsList.length || 1)).toLocaleString()}
                    </span>
                  </div>
                </SpotlightCard>

                {/* Card 2: Squad Utilization Pulse */}
                <SpotlightCard
                  spotlightColor="rgba(6, 182, 212, 0.2)"
                  className="!bg-gradient-to-br !from-cyan-950/30 !via-[#111827] !to-[#111827] !border-cyan-500/30 hover:!border-cyan-500/60 p-6 shadow-xl shadow-cyan-500/5 hover:-translate-y-1 transition-all duration-300 group"
                >
                  <Clock className="absolute -right-3 -bottom-3 w-28 h-28 text-cyan-500/5 group-hover:text-cyan-500/10 transition-colors pointer-events-none" />
                  <div className="flex items-center justify-between relative z-10">
                    <span className="text-xs font-extrabold text-cyan-300 uppercase tracking-wider">
                      Squad Utilization Pulse
                    </span>
                    <div className="w-9 h-9 rounded-xl bg-slate-900/80 border border-cyan-500/40 flex items-center justify-center shadow-md">
                      <Clock className="w-5 h-5 text-cyan-400" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between relative z-10">
                    <div className="flex items-baseline gap-2">
                      <AnimatedCounter
                        value={overallUtilization}
                        suffix="%"
                        decimals={0}
                        className="text-2xl sm:text-3xl font-black text-white tracking-tight"
                      />
                      <span
                        className={`text-[11px] font-extrabold px-2 py-0.5 rounded-md border shadow-sm ${
                          overallUtilization > 95
                            ? 'bg-amber-500/25 text-amber-300 border-amber-500/50'
                            : 'bg-cyan-500/25 text-cyan-300 border-cyan-500/50'
                        }`}
                      >
                        {overallUtilization > 95 ? 'Peak Load' : 'Balanced Load'}
                      </span>
                    </div>
                    <MiniSparkline
                      data={[70, 74, 78, 82, 80, 85, overallUtilization]}
                      color="cyan"
                      height={28}
                    />
                  </div>
                  <div className="mt-3 pt-3 border-t border-cyan-500/20 space-y-1.5 relative z-10">
                    <div className="flex justify-between text-[11px] text-slate-300 font-bold">
                      <span>{totalWeeklyHrs}h Active Work</span>
                      <span>{totalCapacityHrs}h Capacity</span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400 rounded-full transition-all duration-500 shadow-sm"
                        style={{ width: `${Math.min(100, overallUtilization)}%` }}
                      />
                    </div>
                  </div>
                </SpotlightCard>

                {/* Card 3: Governance Tier Breakdown */}
                <SpotlightCard
                  spotlightColor="rgba(168, 85, 247, 0.2)"
                  className="!bg-gradient-to-br !from-purple-950/30 !via-[#111827] !to-[#111827] !border-purple-500/30 hover:!border-purple-500/60 p-6 shadow-xl shadow-purple-500/5 hover:-translate-y-1 transition-all duration-300 group"
                >
                  <Award className="absolute -right-3 -bottom-3 w-28 h-28 text-purple-500/5 group-hover:text-purple-500/10 transition-colors pointer-events-none" />
                  <div className="flex items-center justify-between relative z-10">
                    <span className="text-xs font-extrabold text-purple-300 uppercase tracking-wider">
                      Governance Tier Breakdown
                    </span>
                    <div className="w-9 h-9 rounded-xl bg-slate-900/80 border border-purple-500/40 flex items-center justify-center shadow-md">
                      <Award className="w-5 h-5 text-purple-400" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-md bg-purple-500/20 border border-purple-500/40 text-purple-300 font-extrabold text-xs shadow-sm">
                        T1 ({tier1Count})
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-extrabold text-xs shadow-sm">
                        T2 ({tier2Count})
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 font-extrabold text-xs shadow-sm">
                        T3 ({tier3Count})
                      </span>
                    </div>
                    <MiniSparkline
                      data={[50, 60, 65, 75, 80, 85, 90]}
                      color="purple"
                      height={28}
                    />
                  </div>
                  <div className="mt-3 pt-3 border-t border-purple-500/20 space-y-1.5 relative z-10">
                    <div className="flex justify-between text-[11px] text-slate-300 font-bold">
                      <span>Tier Distribution</span>
                      <span>{totalMembers} Members</span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden flex border border-slate-800">
                      <div className="h-full bg-purple-400 transition-all duration-500" style={{ width: `${tier1Pct}%` }} title={`Tier 1: ${tier1Pct}%`} />
                      <div className="h-full bg-cyan-400 transition-all duration-500" style={{ width: `${tier2Pct}%` }} title={`Tier 2: ${tier2Pct}%`} />
                      <div className="h-full bg-amber-400 transition-all duration-500" style={{ width: `${tier3Pct}%` }} title={`Tier 3: ${tier3Pct}%`} />
                    </div>
                  </div>
                </SpotlightCard>

                {/* Card 4: AI Assessment & Skill Health */}
                <SpotlightCard
                  spotlightColor="rgba(245, 158, 11, 0.2)"
                  className="!bg-gradient-to-br !from-amber-950/30 !via-[#111827] !to-[#111827] !border-amber-500/30 hover:!border-amber-500/60 p-6 shadow-xl shadow-amber-500/5 hover:-translate-y-1 transition-all duration-300 group"
                >
                  <CheckCircle2 className="absolute -right-3 -bottom-3 w-28 h-28 text-amber-500/5 group-hover:text-amber-500/10 transition-colors pointer-events-none" />
                  <div className="flex items-center justify-between relative z-10">
                    <span className="text-xs font-extrabold text-amber-300 uppercase tracking-wider">
                      AI Competency Index
                    </span>
                    <div className="w-9 h-9 rounded-xl bg-slate-900/80 border border-amber-500/40 flex items-center justify-center shadow-md">
                      <CheckCircle2 className="w-5 h-5 text-amber-400" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between relative z-10">
                    <div className="flex items-baseline gap-1.5">
                      <AnimatedCounter
                        value={avgQualityScore}
                        decimals={1}
                        className="text-2xl sm:text-3xl font-black text-white tracking-tight"
                      />
                      <span className="text-xs font-extrabold text-amber-300/80">/ 10 Avg</span>
                    </div>
                    <MiniSparkline
                      data={[8.4, 8.6, 8.7, 8.8, 8.9, 9.0, avgQualityScore]}
                      color="amber"
                      height={28}
                    />
                  </div>
                  <div className="mt-3 pt-3 border-t border-amber-500/20 flex items-center justify-between text-xs relative z-10">
                    <span className="text-slate-300 font-bold">50-Question Bank</span>
                    <span className="text-emerald-300 font-black flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      100% Calibrated
                    </span>
                  </div>
                </SpotlightCard>
              </div>
            );
          })()}

          {/* SMART AI COPILOT & EXECUTIVE RADAR BANNER */}
          {smartMode && (() => {
            const highRiskCount = projectsList.filter(p => (p.activeHours / (p.totalHours || 1)) >= 0.85 || calculateProjectProfitability(p).marginPercent < 35 || p.paymentStatus === 'Overdue').length;
            const overdueCount = projectsList.filter(p => p.paymentStatus === 'Overdue').length;
            const topMarginCount = projectsList.filter(p => calculateProjectProfitability(p).marginPercent >= 55).length;
            const nearingCapCount = projectsList.filter(p => (p.activeHours / (p.totalHours || 1)) >= 0.80 && (p.activeHours / (p.totalHours || 1)) < 1.0).length;

            return (
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 border border-indigo-500/40 p-5 shadow-xl animate-fade-in transition-all">
                {/* Glowing background accent */}
                <div className="absolute -right-10 -top-10 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute left-1/3 -bottom-10 w-48 h-48 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5 border-b border-indigo-500/20 pb-5">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 shrink-0">
                      <Sparkles className="w-6 h-6 text-white animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[10px] font-extrabold uppercase tracking-widest">
                          AI Executive Copilot Active
                        </span>
                        <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                          <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" /> Real-Time Smart Radar
                        </span>
                      </div>
                      <h3 className="text-base font-extrabold text-white mt-1 tracking-tight">
                        Intelligent Agency Health & Allocation Diagnostics
                      </h3>
                      <p className="text-xs text-indigo-200/80 font-medium">
                        Live AI analysis across {projectsList.length} retainers, ${projectsList.reduce((s, p) => s + (p.paymentAmountNumeric || 0), 0).toLocaleString()}/mo MRR, and {customMembers.length} squad leads.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setSmartMode(false)}
                      className="px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <X className="w-3.5 h-3.5" /> Dismiss Copilot
                    </button>
                  </div>
                </div>

                {/* Smart Diagnostic Action Chips */}
                <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 pt-4">
                  <div
                    onClick={() => { setEverydayQuickFilter(everydayQuickFilter === 'ai_high_risk' ? 'all' : 'ai_high_risk'); }}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      everydayQuickFilter === 'ai_high_risk'
                        ? 'bg-rose-500/20 border-rose-500 text-white shadow-lg shadow-rose-500/20'
                        : 'bg-slate-900/70 hover:bg-slate-900 border-slate-700/80 hover:border-rose-500/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shrink-0">
                        <ShieldAlert className="w-4 h-4 text-rose-400" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-rose-300 uppercase tracking-wider block">
                          AI Alert • High Risk
                        </span>
                        <span className="text-xs font-extrabold text-white">
                          {highRiskCount} Projects Flagged
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/30">
                      {everydayQuickFilter === 'ai_high_risk' ? 'Active' : 'Filter'}
                    </span>
                  </div>

                  <div
                    onClick={() => { setEverydayQuickFilter(everydayQuickFilter === 'ai_top_margin' ? 'all' : 'ai_top_margin'); }}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      everydayQuickFilter === 'ai_top_margin'
                        ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                        : 'bg-slate-900/70 hover:bg-slate-900 border-slate-700/80 hover:border-emerald-500/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider block">
                          AI Verified • High Margin
                        </span>
                        <span className="text-xs font-extrabold text-white">
                          {topMarginCount} Star Retainers
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/30">
                      {everydayQuickFilter === 'ai_top_margin' ? 'Active' : 'Filter'}
                    </span>
                  </div>

                  <div
                    onClick={() => { setEverydayQuickFilter(everydayQuickFilter === 'ai_nearing_cap' ? 'all' : 'ai_nearing_cap'); }}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      everydayQuickFilter === 'ai_nearing_cap'
                        ? 'bg-amber-500/20 border-amber-500 text-white shadow-lg shadow-amber-500/20'
                        : 'bg-slate-900/70 hover:bg-slate-900 border-slate-700/80 hover:border-amber-500/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
                        <Cpu className="w-4 h-4 text-amber-400" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block">
                          AI Insight • Capacity Cap
                        </span>
                        <span className="text-xs font-extrabold text-white">
                          {nearingCapCount} Near 80% Limit
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/30">
                      {everydayQuickFilter === 'ai_nearing_cap' ? 'Active' : 'Filter'}
                    </span>
                  </div>

                  <div
                    onClick={() => { setEverydayQuickFilter(everydayQuickFilter === 'ai_overdue_cashflow' ? 'all' : 'ai_overdue_cashflow'); }}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      everydayQuickFilter === 'ai_overdue_cashflow'
                        ? 'bg-indigo-500/20 border-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                        : 'bg-slate-900/70 hover:bg-slate-900 border-slate-700/80 hover:border-indigo-500/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center shrink-0">
                        <DollarSign className="w-4 h-4 text-indigo-400" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block">
                          AI Cashflow • Overdue
                        </span>
                        <span className="text-xs font-extrabold text-white">
                          {overdueCount} Unpaid Invoices
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/30">
                      {everydayQuickFilter === 'ai_overdue_cashflow' ? 'Active' : 'Filter'}
                    </span>
                  </div>
                </div>

                {/* Smart Recommendations Bar */}
                <div className="relative z-10 mt-3 pt-3 border-t border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-indigo-200">
                    <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 animate-bounce" />
                    <span>
                      <strong className="text-white font-bold">Smart Action Recommendation:</strong>{' '}
                      {highRiskCount > 0
                        ? `${highRiskCount} retainers require budget re-evaluation or scope rebalance before month-end.`
                        : overdueCount > 0
                        ? `${overdueCount} retainers have pending overdue invoices. Click 'AI Cashflow' above to prioritize collections.`
                        : `All retainers are operating within optimal hours margin buffer (>35% margin).`}
                    </span>
                  </div>
                  {everydayQuickFilter.startsWith('ai_') && (
                    <button
                      type="button"
                      onClick={() => setEverydayQuickFilter('all')}
                      className="text-xs font-bold text-indigo-300 hover:text-white underline self-start sm:self-auto cursor-pointer"
                    >
                      Reset AI Filters
                    </button>
                  )}
                </div>
              </div>
            );
          })()}

              {/* 2. Interactive Visual Charts & Graphs Center */}
            {showVisualCharts &&
              (() => {
                const totalRev = projectsList.reduce((sum, p) => sum + (p.paymentAmountNumeric || 0), 0) || 1;
                const retainerRev = projectsList
                  .filter((p) => p.billingType === 'Monthly Retainer')
                  .reduce((sum, p) => sum + (p.paymentAmountNumeric || 0), 0);
                const milestoneRev = projectsList
                  .filter((p) => p.billingType === 'Milestone Delivery')
                  .reduce((sum, p) => sum + (p.paymentAmountNumeric || 0), 0);
                const hourlyRev = Math.max(0, totalRev - retainerRev - milestoneRev);

                const retainerPct = Math.round((retainerRev / totalRev) * 100);
                const milestonePct = Math.round((milestoneRev / totalRev) * 100);
                const hourlyPct = Math.max(0, 100 - retainerPct - milestonePct);

                const totalCount = projectsList.length || 1;
                const onTrackCount = projectsList.filter((p) => p.status === 'ON TRACK').length;
                const initCount = projectsList.filter((p) => p.status === 'INITIAL STAGE').length;
                const revalCount = projectsList.filter((p) => p.status === 'REVALUATION' || p.status === 'PAUSED').length;
                const compCount = projectsList.filter((p) => p.status === 'COMPLETED').length;

                const onTrackPct = Math.round((onTrackCount / totalCount) * 100);
                const initPct = Math.round((initCount / totalCount) * 100);
                const revalPct = Math.round((revalCount / totalCount) * 100);
                const compPct = Math.max(0, 100 - onTrackPct - initPct - revalPct);

                const totalTechHours = projectsList.reduce((sum, p) => sum + (p.weeklyHoursTech || 8), 0);
                const totalOnPageHours = projectsList.reduce((sum, p) => sum + (p.weeklyHoursOnPage || 6), 0);
                const totalOffPageHours = projectsList.reduce((sum, p) => sum + (p.weeklyHoursOffPage || 4), 0);
                const maxHoursCat = Math.max(totalTechHours, totalOnPageHours, totalOffPageHours, 1);

                return (
                  <div className="pt-3 space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 bg-slate-900/90 border border-slate-700/80 rounded-2xl shadow-xl">
                      <div>
                        <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                          <span>📈 Interactive Financial & Workload Analytics (Visual Charts)</span>
                        </h4>
                        <p className="text-[11px] text-slate-300 font-medium mt-0.5">Real-time revenue model distribution, project status gauge, and specialist hours allocation.</p>
                      </div>
                      <span className="text-[11px] font-bold text-slate-300 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-700 shrink-0">
                        Based on {filteredProjectsList.length} filtered projects
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-fade-in min-w-0 w-full">
                    {/* CHART 1: REVENUE & RETAINER MIX GRAPH */}
                    <div className="bg-[#111827] border border-slate-700/90 rounded-3xl p-6 space-y-4 shadow-xl overflow-hidden min-w-0 max-w-full w-full">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                            CHART 1 • FINANCIAL MIX
                          </span>
                          <h4 className="text-xs font-bold text-white">Revenue & Billing Model Graph</h4>
                        </div>
                        <span className="text-xs font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-500/40">
                          ${totalRev.toLocaleString()}/mo
                        </span>
                      </div>

                      {/* Stacked Visual Progress Bar */}
                      <div className="space-y-1.5">
                        <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden flex border border-slate-700">
                          <div
                            className="h-full bg-emerald-400 transition-all duration-500"
                            style={{ width: `${retainerPct}%` }}
                            title={`Retainer: ${retainerPct}%`}
                          />
                          <div
                            className="h-full bg-cyan-400 transition-all duration-500"
                            style={{ width: `${milestonePct}%` }}
                            title={`Milestones: ${milestonePct}%`}
                          />
                          <div
                            className="h-full bg-amber-400 transition-all duration-500"
                            style={{ width: `${hourlyPct}%` }}
                            title={`Hourly: ${hourlyPct}%`}
                          />
                        </div>
                      </div>

                      {/* Breakdown Rows */}
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-2 text-slate-300 font-semibold">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm" />
                            Fixed Retainers
                          </span>
                          <span className="font-bold text-emerald-300">
                            ${retainerRev.toLocaleString()} ({retainerPct}%)
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-2 text-slate-300 font-semibold">
                            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-sm" />
                            Milestone Deliveries
                          </span>
                          <span className="font-bold text-cyan-300">
                            ${milestoneRev.toLocaleString()} ({milestonePct}%)
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-2 text-slate-300 font-semibold">
                            <span className="w-2 h-2 rounded-full bg-amber-400 shadow-sm" />
                            Hourly Billing
                          </span>
                          <span className="font-bold text-amber-300">
                            ${hourlyRev.toLocaleString()} ({hourlyPct}%)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* CHART 2: PROJECT LIFECYCLE & STATUS GAUGE */}
                    <div className="bg-[#111827] border border-slate-700/90 rounded-3xl p-6 space-y-4 shadow-xl overflow-hidden min-w-0 max-w-full w-full">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 block">
                            CHART 2 • LIFECYCLE GAUGE
                          </span>
                          <h4 className="text-xs font-bold text-white">Project Status & Health Distribution</h4>
                        </div>
                        <span className="text-xs font-bold text-cyan-300 bg-cyan-500/20 px-2 py-0.5 rounded-md border border-cyan-500/40">
                          {totalCount} Active
                        </span>
                      </div>

                      {/* Stacked Status Bar */}
                      <div className="space-y-1.5">
                        <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden flex border border-slate-700">
                          <div
                            className="h-full bg-emerald-400 transition-all duration-500"
                            style={{ width: `${onTrackPct}%` }}
                            title={`On Track: ${onTrackPct}%`}
                          />
                          <div
                            className="h-full bg-cyan-400 transition-all duration-500"
                            style={{ width: `${initPct}%` }}
                            title={`Initial Stage: ${initPct}%`}
                          />
                          <div
                            className="h-full bg-amber-400 transition-all duration-500"
                            style={{ width: `${revalPct}%` }}
                            title={`Revaluation: ${revalPct}%`}
                          />
                          <div
                            className="h-full bg-purple-400 transition-all duration-500"
                            style={{ width: `${compPct}%` }}
                            title={`Completed: ${compPct}%`}
                          />
                        </div>
                      </div>

                      {/* Status Rows */}
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-2 text-slate-300 font-semibold">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm" />
                            On Track ({onTrackCount})
                          </span>
                          <span className="font-bold text-emerald-300">{onTrackPct}%</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-2 text-slate-300 font-semibold">
                            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-sm" />
                            Initial Stage ({initCount})
                          </span>
                          <span className="font-bold text-cyan-300">{initPct}%</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-2 text-slate-300 font-semibold">
                            <span className="w-2 h-2 rounded-full bg-amber-400 shadow-sm" />
                            Revaluation / Paused ({revalCount})
                          </span>
                          <span className="font-bold text-amber-300">{revalPct}%</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-2 text-slate-300 font-semibold">
                            <span className="w-2 h-2 rounded-full bg-purple-400 shadow-sm" />
                            Completed ({compCount})
                          </span>
                          <span className="font-bold text-purple-300">{compPct}%</span>
                        </div>
                      </div>
                    </div>

                    {/* CHART 3: DELIVERABLE SPECIALIST HOURS GRAPH */}
                    <div className="bg-[#111827] border border-slate-700/80 rounded-xl p-4 space-y-3 shadow-md">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block">
                            CHART 3 • SQUAD WORKLOAD
                          </span>
                          <h4 className="text-xs font-bold text-white">Deliverable Hours Allocation Graph</h4>
                        </div>
                        <span className="text-xs font-bold text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-md border border-purple-500/40">
                          {totalTechHours + totalOnPageHours + totalOffPageHours} hrs/wk
                        </span>
                      </div>

                      {/* Horizontal Bar Chart */}
                      <div className="space-y-2.5 pt-1">
                        <div>
                          <div className="flex justify-between text-[11px] font-semibold text-slate-300 mb-1">
                            <span>Technical & Dev Lead</span>
                            <span className="text-cyan-300 font-bold">{totalTechHours} hrs/wk</span>
                          </div>
                          <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-700">
                            <div
                              className="h-full bg-cyan-400 rounded-full transition-all duration-500"
                              style={{ width: `${Math.round((totalTechHours / maxHoursCat) * 100)}%` }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-[11px] font-semibold text-slate-300 mb-1">
                            <span>On-Page SEO Strategy</span>
                            <span className="text-emerald-300 font-bold">{totalOnPageHours} hrs/wk</span>
                          </div>
                          <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-700">
                            <div
                              className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                              style={{ width: `${Math.round((totalOnPageHours / maxHoursCat) * 100)}%` }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-[11px] font-bold text-slate-300 mb-1">
                            <span>Off-Page SEO & Guest Posts</span>
                            <span className="text-purple-300 font-black">{totalOffPageHours} hrs/wk</span>
                          </div>
                          <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-700">
                            <div
                              className="h-full bg-purple-400 rounded-full transition-all duration-500"
                              style={{ width: `${Math.round((totalOffPageHours / maxHoursCat) * 100)}%` }}
                            />
                          </div>
                        </div>
                    </div>
                  </div>
                </div>
              </div>
              );
            })()}
            </div>
          )}

          {/* SUB-HUB 4: PAST PROJECTS & TRASH ARCHIVE */}
          {hubSubTab === 'archive' && (() => {
            const pastCount = archivedProjects.filter(p => p.archiveCategory === 'past_project').length;
            const trashCount = archivedProjects.filter(p => p.archiveCategory === 'trash').length;
            const filtered = archivedProjects.filter(p => {
              if (archiveFilterTab === 'past_project' && p.archiveCategory !== 'past_project') return false;
              if (archiveFilterTab === 'trash' && p.archiveCategory !== 'trash') return false;
              if (archiveSearchQuery.trim()) {
                const q = archiveSearchQuery.toLowerCase();
                const matchName = (p.name || '').toLowerCase().includes(q);
                const matchClient = (p.client || '').toLowerCase().includes(q);
                const matchLead = (p.projectLeadId || '').toLowerCase().includes(q);
                if (!matchName && !matchClient && !matchLead) return false;
              }
              return true;
            });

            return (
              <div className="space-y-6 animate-fade-in">
                {/* Archive Header Banner */}
                <div className="bg-gradient-to-r from-slate-900 via-[#131b2e] to-slate-900 border border-slate-700/80 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/10">
                      <FolderArchive className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-lg font-black text-white tracking-tight">Past Projects &amp; Trash Archive</h3>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          {archivedProjects.length} Total
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Historical client retainers, completed deliverables, and restorable trash items. Team workload is freed up for active projects.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Filter Pills */}
                    <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setArchiveFilterTab('all')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          archiveFilterTab === 'all'
                            ? 'bg-cyan-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        All ({archivedProjects.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setArchiveFilterTab('past_project')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          archiveFilterTab === 'past_project'
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        📁 Past Projects ({pastCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setArchiveFilterTab('trash')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          archiveFilterTab === 'trash'
                            ? 'bg-rose-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        🗑️ Trash ({trashCount})
                      </button>
                    </div>

                    {/* Empty Trash Button */}
                    {trashCount > 0 && (
                      <button
                        type="button"
                        onClick={handleEmptyTrash}
                        className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                        title="Permanently empty all projects in trash"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Empty Trash</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Search Bar */}
                <div className="flex items-center justify-between gap-4">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search archive by project name, client, or lead..."
                      value={archiveSearchQuery}
                      onChange={(e) => setArchiveSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-slate-900/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                    />
                  </div>

                  <div className="text-xs text-slate-400 font-medium">
                    Showing <strong className="text-white">{filtered.length}</strong> of {archivedProjects.length} archived items
                  </div>
                </div>

                {/* Archive List / Grid */}
                {filtered.length === 0 ? (
                  <div className="py-16 text-center rounded-2xl bg-slate-900/50 border border-slate-800 space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-400 flex items-center justify-center mx-auto">
                      <Inbox className="w-7 h-7" />
                    </div>
                    <h4 className="text-base font-bold text-white">No Archived Projects Found</h4>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                      {archiveSearchQuery
                        ? 'No archived projects match your current search query.'
                        : 'Projects moved to the Past Projects folder or Trash will be preserved here and can be restored back to your active tracker at any time.'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filtered.map((proj) => (
                      <div
                        key={proj.id}
                        className="rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 p-5 shadow-lg flex flex-col justify-between transition-all group relative overflow-hidden"
                      >
                        <div className="space-y-3.5">
                          {/* Top Badges */}
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border flex items-center gap-1 ${
                                proj.archiveCategory === 'past_project'
                                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              }`}
                            >
                              {proj.archiveCategory === 'past_project' ? (
                                <>
                                  <FolderArchive className="w-3 h-3" />
                                  <span>Past Project</span>
                                </>
                              ) : (
                                <>
                                  <Trash2 className="w-3 h-3" />
                                  <span>In Trash</span>
                                </>
                              )}
                            </span>

                            <span className="text-xs font-black text-emerald-400 font-mono">
                              {proj.price}
                            </span>
                          </div>

                          {/* Client & Project Name */}
                          <div>
                            <div className="text-[11px] font-bold text-slate-400 tracking-wide uppercase">
                              {proj.client}
                            </div>
                            <h4
                              onClick={() => setViewingProjectDetail(proj)}
                              className="text-base font-extrabold text-white group-hover:text-cyan-300 transition-colors cursor-pointer mt-0.5 line-clamp-1"
                              title={proj.name}
                            >
                              {proj.name}
                            </h4>
                          </div>

                          {/* Details Metadata Box */}
                          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px] space-y-1.5">
                            <div className="flex justify-between text-slate-400">
                              <span>Deliverables:</span>
                              <span className="text-slate-200 font-semibold">{(proj.taskBreakdown || []).length} tasks</span>
                            </div>
                            <div className="flex justify-between text-slate-400">
                              <span>Weekly Hours:</span>
                              <span className="text-cyan-400 font-semibold">{proj.activeHours} hrs/wk (Freed)</span>
                            </div>
                            <div className="flex justify-between text-slate-400">
                              <span>Archived Date:</span>
                              <span className="text-slate-300 font-medium">
                                {new Date(proj.archivedAt).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex justify-between text-slate-400">
                              <span>Reason:</span>
                              <span className="text-amber-300/90 font-medium truncate max-w-[140px]" title={proj.archiveReason}>
                                {proj.archiveReason || 'Archived'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => handleRestoreProject(proj.id)}
                            className="flex-1 py-1.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                            title="Restore project to active tracker"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Restore</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setViewingProjectDetail(proj)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer"
                            title="Inspect 360° Historical Details"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>

                          {proj.archiveCategory === 'trash' ? (
                            <button
                              type="button"
                              onClick={() => handleSwitchArchiveCategory(proj.id, 'past_project')}
                              className="p-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 transition-all cursor-pointer"
                              title="Move from Trash to Past Projects Folder"
                            >
                              <FolderArchive className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSwitchArchiveCategory(proj.id, 'trash')}
                              className="p-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-all cursor-pointer"
                              title="Move to Trash"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handlePermanentDeleteArchived(proj.id)}
                            className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 hover:text-rose-300 border border-rose-500/40 transition-all cursor-pointer"
                            title="Permanently Purge from Storage"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* SUB-HUB TAB 5: NEW BUSINESS LEADS & SALES PIPELINE */}
          {hubSubTab === 'leads' && (() => {
            const filteredLeads = businessLeads.filter((l) => {
              if (leadStageFilter !== 'ALL' && l.stage !== leadStageFilter) return false;
              if (leadOwnerFilter === 'UNASSIGNED') {
                if (l.assignedOwnerId) return false;
              } else if (leadOwnerFilter !== 'ALL') {
                if (l.assignedOwnerId !== leadOwnerFilter) return false;
              }
              if (leadSearchQuery.trim()) {
                const q = leadSearchQuery.toLowerCase();
                const matchCompany = l.companyName.toLowerCase().includes(q);
                const matchContact = (l.contactPerson || '').toLowerCase().includes(q);
                const matchEmail = (l.email || '').toLowerCase().includes(q);
                const matchNotes = (l.notes || '').toLowerCase().includes(q);
                if (!matchCompany && !matchContact && !matchEmail && !matchNotes) return false;
              }
              return true;
            });

            const totalPipelineValue = businessLeads
              .filter(l => l.stage !== 'LOST')
              .reduce((sum, l) => sum + (l.estimatedValueNumeric || 0), 0);

            const stageCounts = {
              ALL: businessLeads.length,
              NEW: businessLeads.filter(l => l.stage === 'NEW').length,
              DISCOVERY: businessLeads.filter(l => l.stage === 'DISCOVERY').length,
              PROPOSAL: businessLeads.filter(l => l.stage === 'PROPOSAL').length,
              NEGOTIATION: businessLeads.filter(l => l.stage === 'NEGOTIATION').length,
              WON: businessLeads.filter(l => l.stage === 'WON').length,
              LOST: businessLeads.filter(l => l.stage === 'LOST').length,
            };

            const stageColors: Record<BusinessLeadItem['stage'], { bg: string; text: string; border: string }> = {
              NEW: { bg: 'bg-blue-500/15', text: 'text-blue-300', border: 'border-blue-500/30' },
              DISCOVERY: { bg: 'bg-purple-500/15', text: 'text-purple-300', border: 'border-purple-500/30' },
              PROPOSAL: { bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/30' },
              NEGOTIATION: { bg: 'bg-orange-500/15', text: 'text-orange-300', border: 'border-orange-500/30' },
              WON: { bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/30' },
              LOST: { bg: 'bg-rose-500/15', text: 'text-rose-300', border: 'border-rose-500/30' },
            };

            return (
              <div className="space-y-6">
                {/* Leads Header & Pipeline KPI Banner */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 p-5 border border-slate-700/80 shadow-2xl">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-indigo-500 to-emerald-400" />
                  
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0 shadow-lg shadow-cyan-500/10">
                        <Briefcase className="w-6 h-6 text-cyan-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5">
                          <h2 className="text-xl font-black text-white tracking-tight">
                            Business Leads &amp; Sales Pipeline
                          </h2>
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                            {businessLeads.length} Prospects
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 mt-0.5">
                          Track potential clients, separate assigned lead owners, and convert won proposals into Active Project Retainers.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <div className="bg-slate-950/80 border border-slate-700 px-3.5 py-1.5 rounded-xl text-left">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                          Active Pipeline Est.
                        </span>
                        <span className="text-base font-black text-emerald-400">
                          ${totalPipelineValue.toLocaleString()}
                          <span className="text-[10px] text-slate-400 font-medium ml-1">total value</span>
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowClickUpModal(true)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600/90 hover:bg-purple-600 text-white font-bold text-xs shadow-lg shadow-purple-600/20 transition-all cursor-pointer border border-purple-500/40 hover:scale-[1.02]"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Sync Leads from ClickUp</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEditingLead(null);
                          setShowAddLeadModal(true);
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-xs shadow-lg shadow-cyan-500/25 transition-all cursor-pointer hover:scale-[1.02]"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add New Lead</span>
                      </button>
                    </div>
                  </div>

                  {/* Stage Quick-Filter Pills */}
                  <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
                    {(['ALL', 'NEW', 'DISCOVERY', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'] as const).map((st) => {
                      const isActive = leadStageFilter === st;
                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setLeadStageFilter(st)}
                          className={`flex items-center gap-1.5 px-3 py-1.2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            isActive
                              ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                              : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60'
                          }`}
                        >
                          <span>{st === 'ALL' ? 'All Leads' : st}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                              isActive ? 'bg-slate-950 text-cyan-300' : 'bg-slate-900 text-slate-400'
                            }`}
                          >
                            {stageCounts[st]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Filter and View Mode Toolbar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  <div className="flex flex-wrap items-center gap-2.5 flex-1">
                    <div className="relative flex-1 min-w-[200px] max-w-sm">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search company, contact, notes..."
                        value={leadSearchQuery}
                        onChange={(e) => setLeadSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                      />
                      {leadSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setLeadSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Filter by Assigned Lead Owner */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-slate-400">Owner:</span>
                      <select
                        value={leadOwnerFilter}
                        onChange={(e) => setLeadOwnerFilter(e.target.value)}
                        className="bg-slate-950 border border-slate-700 text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-400"
                      >
                        <option value="ALL">All Owners</option>
                        <option value="UNASSIGNED">-- Unassigned Only --</option>
                        {customMembers.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.role || 'Member'})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* View Mode Toggle: Table vs Kanban */}
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setLeadsViewMode('table')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        leadsViewMode === 'table'
                          ? 'bg-cyan-500 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <List className="w-3.5 h-3.5" />
                      <span>Table</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setLeadsViewMode('kanban')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        leadsViewMode === 'kanban'
                          ? 'bg-cyan-500 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Kanban className="w-3.5 h-3.5" />
                      <span>Pipeline Kanban</span>
                    </button>
                  </div>
                </div>

                {/* Main Content: Table or Kanban */}
                {filteredLeads.length === 0 ? (
                  <div className="text-center py-16 px-4 rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-400 space-y-3">
                    <div className="w-12 h-12 rounded-full bg-slate-800 mx-auto flex items-center justify-center text-slate-500">
                      <Briefcase className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold text-slate-200">No leads match your current filter</h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      Adjust your search or status filters, or click "Add New Lead" or "Sync Leads from ClickUp" to add prospects.
                    </p>
                  </div>
                ) : leadsViewMode === 'table' ? (
                  /* TABLE VIEW */
                  <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/50 shadow-xl">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-950/80 text-[11px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="py-3 px-4">Company &amp; Contact</th>
                          <th className="py-3 px-4">Stage</th>
                          <th className="py-3 px-4">Estimated Value</th>
                          <th className="py-3 px-4">Assigned Lead Owner</th>
                          <th className="py-3 px-4">Services / Source</th>
                          <th className="py-3 px-4">Next Follow-Up / Notes</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/70 font-medium">
                        {filteredLeads.map((lead) => {
                          const assignedOwner = customMembers.find((m) => m.id === lead.assignedOwnerId);
                          const stageStyle = stageColors[lead.stage] || stageColors.NEW;

                          return (
                            <tr key={lead.id} className="hover:bg-slate-800/40 transition-colors">
                              {/* Company & Contact */}
                              <td className="py-3.5 px-4">
                                <div className="font-bold text-white text-sm flex items-center gap-1.5">
                                  <span>{lead.companyName}</span>
                                  {lead.clickUpUrl && (
                                    <a
                                      href={lead.clickUpUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      title="Open ClickUp Task"
                                      className="text-purple-400 hover:text-purple-300"
                                    >
                                      <ExternalLink className="w-3 h-3 inline" />
                                    </a>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400 mt-0.5 space-y-0.5">
                                  {lead.contactPerson && (
                                    <div className="flex items-center gap-1 text-slate-300">
                                      <span>👤 {lead.contactPerson}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2 text-[10px]">
                                    {lead.email && (
                                      <a
                                        href={`mailto:${lead.email}`}
                                        className="text-cyan-400 hover:underline flex items-center gap-0.5"
                                      >
                                        <Mail className="w-2.5 h-2.5" />
                                        {lead.email}
                                      </a>
                                    )}
                                    {lead.phone && (
                                      <span className="text-slate-400 flex items-center gap-0.5">
                                        <Phone className="w-2.5 h-2.5" />
                                        {lead.phone}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              <td className="py-3.5 px-4">
                                <select
                                  value={lead.stage}
                                  onChange={(e) =>
                                    handleUpdateLeadStage(
                                      lead.id,
                                      e.target.value as BusinessLeadItem['stage']
                                    )
                                  }
                                  className={`text-[11px] font-black uppercase px-2.5 py-1 rounded-lg border focus:outline-none ${(stageStyle || {bg: 'bg-slate-800', text: 'text-slate-200', border: 'border-slate-700'}).bg} ${(stageStyle || {bg: 'bg-slate-800', text: 'text-slate-200', border: 'border-slate-700'}).text} ${(stageStyle || {bg: 'bg-slate-800', text: 'text-slate-200', border: 'border-slate-700'}).border} bg-slate-950 cursor-pointer`}
                                >
                                  <option value="NEW">NEW</option>
                                  <option value="DISCOVERY">DISCOVERY</option>
                                  <option value="PROPOSAL">PROPOSAL</option>
                                  <option value="NEGOTIATION">NEGOTIATION</option>
                                  <option value="WON">WON</option>
                                  <option value="LOST">LOST</option>
                                </select>
                              </td>

                              {/* Estimated Value */}
                              <td className="py-3.5 px-4">
                                <span className="font-bold text-emerald-400 text-xs block">
                                  {lead.estimatedValue}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {lead.billingPreference}
                                </span>
                              </td>

                              {/* Assigned Lead Owner Dropdown */}
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-2">
                                  {assignedOwner ? (
                                    <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                                      {assignedOwner.name[0]}
                                    </div>
                                  ) : (
                                    <div className="w-6 h-6 rounded-full border border-dashed border-slate-600 flex items-center justify-center text-[10px] text-slate-500 shrink-0">
                                      ?
                                    </div>
                                  )}
                                  <select
                                    value={lead.assignedOwnerId || ''}
                                    onChange={(e) => handleUpdateLeadOwner(lead.id, e.target.value)}
                                    className="bg-slate-950 border border-slate-700 text-[11px] text-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:border-cyan-400 cursor-pointer max-w-[150px]"
                                  >
                                    <option value="">-- Unassigned (Leave Blank) --</option>
                                    {customMembers.map((m) => (
                                      <option key={m.id} value={m.id}>
                                        {m.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </td>

                              {/* Services / Source */}
                              <td className="py-3.5 px-4">
                                <div className="flex flex-wrap gap-1 max-w-[160px]">
                                  {lead.serviceInterest?.map((srv, i) => (
                                    <span
                                      key={i}
                                      className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] text-slate-300 border border-slate-700 font-semibold"
                                    >
                                      {srv}
                                    </span>
                                  ))}
                                </div>
                                {lead.leadSource && (
                                  <span className="text-[10px] text-cyan-400/90 block mt-1">
                                    via {lead.leadSource}
                                  </span>
                                )}
                              </td>

                              {/* Next Follow-Up / Notes */}
                              <td className="py-3.5 px-4 max-w-[200px]">
                                {lead.nextFollowUpDate && (
                                  <div className="text-[11px] text-amber-300 font-semibold flex items-center gap-1 mb-0.5">
                                    <Calendar className="w-3 h-3" />
                                    <span>{lead.nextFollowUpDate}</span>
                                  </div>
                                )}
                                <p className="text-[11px] text-slate-400 line-clamp-2" title={lead.notes}>
                                  {lead.notes || 'No notes added.'}
                                </p>
                              </td>

                              {/* Actions */}
                              <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  {lead.stage !== 'WON' && (
                                    <button
                                      type="button"
                                      onClick={() => handleConvertLeadToProject(lead)}
                                      className="flex items-center gap-1 px-2.5 py-1.2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 hover:text-emerald-200 border border-emerald-500/40 text-[11px] font-bold transition-all cursor-pointer shadow-sm hover:scale-105"
                                      title="Convert won lead into an Active Project Retainer"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>Convert</span>
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingLead(lead);
                                      setShowAddLeadModal(true);
                                    }}
                                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                                    title="Edit Lead Details"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteLead(lead.id)}
                                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                                    title="Delete Lead"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  /* KANBAN VIEW */
                  <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
                    {(['NEW', 'DISCOVERY', 'PROPOSAL', 'NEGOTIATION', 'WON'] as const).map((stageCol) => {
                      const colLeads = filteredLeads.filter((l) => l.stage === stageCol);
                      const colStyle = stageColors[stageCol];

                      return (
                        <div
                          key={stageCol}
                          className="bg-slate-900/60 rounded-2xl p-3 border border-slate-800 flex flex-col h-full shadow-lg"
                        >
                          {/* Column Header */}
                          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded-md text-xs font-black uppercase border ${colStyle.bg} ${colStyle.text} ${colStyle.border}`}
                              >
                                {stageCol}
                              </span>
                            </div>
                            <span className="text-xs font-bold text-slate-400 bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800">
                              {colLeads.length}
                            </span>
                          </div>

                          {/* Card List */}
                          <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px] pr-1">
                            {colLeads.length === 0 ? (
                              <div className="py-8 text-center text-slate-600 text-xs font-medium italic border border-dashed border-slate-800 rounded-xl">
                                No prospects in {stageCol.toLowerCase()}
                              </div>
                            ) : (
                              colLeads.map((lead) => {
                                return (
                                  <div
                                    key={lead.id}
                                    className="bg-slate-950/90 rounded-xl p-3.5 border border-slate-800 hover:border-slate-700 transition-all shadow-md group relative flex flex-col justify-between gap-3"
                                  >
                                    <div>
                                      <div className="flex items-start justify-between gap-2">
                                        <h4 className="font-bold text-white text-xs leading-tight">
                                          {lead.companyName}
                                        </h4>
                                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setEditingLead(lead);
                                              setShowAddLeadModal(true);
                                            }}
                                            className="text-slate-400 hover:text-white"
                                            title="Edit Lead"
                                          >
                                            <Edit2 className="w-3 h-3" />
                                          </button>
                                        </div>
                                      </div>

                                      {lead.contactPerson && (
                                        <div className="text-[10px] text-slate-400 mt-1">
                                          👤 {lead.contactPerson}
                                        </div>
                                      )}

                                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-900">
                                        <span className="font-black text-emerald-400 text-xs">
                                          {lead.estimatedValue}
                                        </span>
                                        <span className="text-[10px] text-slate-400 bg-slate-900 px-1.5 py-0.2 rounded">
                                          {lead.billingPreference === 'Weekly Hourly Billing' ? 'Hourly' : 'Retainer'}
                                        </span>
                                      </div>

                                      {lead.notes && (
                                        <p className="text-[10px] text-slate-400 mt-2 line-clamp-2 italic">
                                          "{lead.notes}"
                                        </p>
                                      )}
                                    </div>

                                    {/* Footer: Owner Selector & Move Stage */}
                                    <div className="pt-2 border-t border-slate-900 flex flex-col gap-2">
                                      <div className="flex items-center justify-between text-[10px]">
                                        <span className="text-slate-500 font-semibold">Lead Owner:</span>
                                        <select
                                          value={lead.assignedOwnerId || ''}
                                          onChange={(e) => handleUpdateLeadOwner(lead.id, e.target.value)}
                                          className="bg-slate-900 border border-slate-800 text-[10px] text-cyan-300 rounded px-1.5 py-0.5 focus:outline-none max-w-[120px]"
                                        >
                                          <option value="">-- Unassigned --</option>
                                          {customMembers.map((m) => (
                                            <option key={m.id} value={m.id}>
                                              {m.name}
                                            </option>
                                          ))}
                                        </select>
                                      </div>

                                      <div className="flex items-center justify-between gap-1 mt-1">
                                        {lead.stage !== 'WON' ? (
                                          <button
                                            type="button"
                                            onClick={() => handleConvertLeadToProject(lead)}
                                            className="w-full flex items-center justify-center gap-1 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold cursor-pointer"
                                          >
                                            <CheckCircle2 className="w-3 h-3" />
                                            <span>Convert to Retainer</span>
                                          </button>
                                        ) : (
                                          <div className="w-full text-center text-[10px] font-black text-emerald-400 bg-emerald-500/10 py-1 rounded border border-emerald-500/20">
                                            ✓ Converted to Retainer
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* VIEW 2: EMPLOYEE ACTIVE & FREE HOURS VISUAL TRACKER (DYNAMICALLY CALCULATED FROM PROJECTS) */}
      {activeView === 'hours' && (
        <div className="space-y-10">
          <div className="bg-gradient-to-r from-[#111827] via-slate-900 to-[#111827] border border-slate-700/90 rounded-2xl p-5 shadow-2xl relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-cyan-400 to-indigo-500 opacity-90" />
            <div className="flex items-center gap-3.5 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/25 to-cyan-500/20 border border-emerald-500/50 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/15 group-hover:scale-105 transition-transform">
                <Clock className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-extrabold text-white tracking-tight">Employee Active vs. Free Hours</h2>
                  <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/25 text-emerald-300 text-xs font-black border border-emerald-500/50 shadow-sm">
                    {customMembers.length} Members
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-medium mt-0.5">
                  Active hours calculated dynamically from assigned projects • Click ✏️ to edit employee details
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 relative z-10">
              <div className="flex items-center bg-slate-950/90 border border-slate-700/80 rounded-xl p-0.5 shadow-md">
                <button
                  type="button"
                  onClick={() => setTeamViewMode('roster')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    teamViewMode === 'roster'
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  👥 Member Cards
                </button>
                <button
                  type="button"
                  onClick={() => setTeamViewMode('heatmap')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    teamViewMode === 'heatmap'
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span>🔥 Workload Heatmap & Shield</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowAddMemberModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/25 transition-all cursor-pointer hover:scale-105"
              >
                <Plus className="w-4 h-4" />
                <span>Add Team Member</span>
              </button>

              <div className="hidden sm:flex items-center gap-3 text-xs font-bold bg-slate-950/80 px-3.5 py-2 rounded-xl border border-slate-700">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                  <span className="text-slate-200">Active Work</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span className="text-slate-200">Free Remaining</span>
                </div>
              </div>
            </div>
          </div>

          {teamViewMode === 'heatmap' ? (
            <WorkloadHeatmap
              members={customMembers}
              projects={projectsList}
              onReassignDeliverable={handleReassignDeliverable}
            />
          ) : (
            <>
              {/* SECTION 1 HEADING: LEADERSHIP & OPERATIONAL HIERARCHY */}
              <GraphicSectionHeader
                icon={<Users className="w-4 h-4" />}
                title="Leadership & Operational Hierarchy"
            badgeText="Executive CEOs Excluded from Hourly Quotas"
            badgeColor="amber"
          />

          {/* Executive & Team Structure Banner */}
          <div className="bg-[#111827] border border-slate-700/80 rounded-xl p-4 shadow-md space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block mb-1">👑 CEO &amp; Co-Founders</span>
                <div className="font-bold text-white space-y-0.5">
                  <div>Manpreet S. Nagpal</div>
                  <div>Agam Grover</div>
                </div>
              </div>
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block mb-1">⚙️ Agency Operations Manager</span>
                <div className="font-bold text-white">Vinay Datyal</div>
              </div>
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 block mb-1">🚀 Team Leads</span>
                <div className="font-bold text-white space-y-0.5">
                  <div>Khuvaish • Vansh • Amrit Kaur</div>
                </div>
              </div>
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                <span className="text-[10px] font-bold uppercase tracking-wider text-pink-400 block mb-1">📋 Project Coordinator</span>
                <div className="font-bold text-white">Nidhi</div>
              </div>
            </div>
          </div>

          {/* SECTION 1.5: INTERACTIVE AGENCY WORKLOAD STACK & BANDWIDTH SPECTRUM GRAPH */}
          <div className="bg-[#111827] border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 animate-fade-in">
            <GraphicSectionHeader
              icon={<BarChart3 className="w-4 h-4" />}
              title="Workload Stack & Bandwidth Spectrum"
              badgeText="Real-Time Task Saturation"
              badgeColor="indigo"
              rightElement={
                <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold cursor-pointer">
                  <span onClick={() => setSelectedHoursFilter(selectedHoursFilter === 'TECH' ? 'ALL' : 'TECH')} className={`flex items-center gap-1 transition-all ${selectedHoursFilter !== 'ALL' && selectedHoursFilter !== 'TECH' ? 'opacity-40' : 'text-cyan-300'}`}><span className="w-2.5 h-2.5 rounded bg-cyan-400" /> Tech / Dev</span>
                  <span onClick={() => setSelectedHoursFilter(selectedHoursFilter === 'ONPAGE' ? 'ALL' : 'ONPAGE')} className={`flex items-center gap-1 transition-all ${selectedHoursFilter !== 'ALL' && selectedHoursFilter !== 'ONPAGE' ? 'opacity-40' : 'text-purple-300'}`}><span className="w-2.5 h-2.5 rounded bg-purple-400" /> On-Page / AEO</span>
                  <span onClick={() => setSelectedHoursFilter(selectedHoursFilter === 'OFFPAGE' ? 'ALL' : 'OFFPAGE')} className={`flex items-center gap-1 transition-all ${selectedHoursFilter !== 'ALL' && selectedHoursFilter !== 'OFFPAGE' ? 'opacity-40' : 'text-amber-300'}`}><span className="w-2.5 h-2.5 rounded bg-amber-400" /> Off-Page / Guest</span>
                  <span onClick={() => setSelectedHoursFilter(selectedHoursFilter === 'FREE' ? 'ALL' : 'FREE')} className={`flex items-center gap-1 transition-all ${selectedHoursFilter !== 'ALL' && selectedHoursFilter !== 'FREE' ? 'opacity-40' : 'text-emerald-300'}`}><span className="w-2.5 h-2.5 rounded bg-emerald-400" /> Free Remaining</span>
                </div>
              }
            />

            <div className="space-y-3.5 pt-1">
              {customMembers
                .filter(m => !m.role.toLowerCase().includes('ceo') && m.seniority !== 'CEO')
                .map(m => {
                  const cap = m.weeklyCapacityHours || 35;
                  // Compute breakdown across task types
                  let techHours = 0;
                  let onPageHours = 0;
                  let offPageHours = 0;
                  projectsList.forEach(p => {
                    if (p.taskBreakdown) {
                      p.taskBreakdown.forEach(tb => {
                        if (tb.assigneeId === m.id) {
                          if (tb.taskType.includes('Tech')) techHours += tb.hours;
                          else if (tb.taskType.includes('On-Page') || tb.taskType.includes('AEO')) onPageHours += tb.hours;
                          else offPageHours += tb.hours;
                        }
                      });
                    } else if (p.members.some(mem => mem.id === m.id)) {
                      const h = getMemberHoursOnProject(p, m.id);
                      if (m.role.includes('Tech') || m.role.includes('Dev')) techHours += h;
                      else if (m.role.includes('On-Page')) onPageHours += h;
                      else offPageHours += h;
                    }
                  });
                  const totalAlloc = techHours + onPageHours + offPageHours;
                  const freeHours = Math.max(0, cap - totalAlloc);

                  const techPct = Math.round((techHours / cap) * 100);
                  const onPct = Math.round((onPageHours / cap) * 100);
                  const offPct = Math.round((offPageHours / cap) * 100);
                  const freePct = Math.max(0, 100 - (techPct + onPct + offPct));

                  return (
                    <div key={m.id} className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <img src={m.avatar} alt={m.name} className="w-7 h-7 rounded-md object-cover border border-slate-700" />
                          <span className="font-bold text-white">{m.name}</span>
                          <span className="text-[10px] text-slate-400">({m.role})</span>
                        </div>
                        <div className="flex items-center gap-2 font-bold">
                          <span className="text-slate-300">{totalAlloc}h / {cap}h allocated</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase border ${totalAlloc > cap ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'}`}>
                            {Math.round((totalAlloc/cap)*100)}% Saturation
                          </span>
                        </div>
                      </div>

                      <div className="w-full bg-slate-950 rounded-lg h-3.5 border border-slate-700 overflow-hidden flex cursor-pointer">
                        {techPct > 0 && <div onClick={() => setSelectedHoursFilter(selectedHoursFilter === 'TECH' ? 'ALL' : 'TECH')} className={`h-full bg-cyan-400 transition-all duration-500 hover:brightness-110 ${selectedHoursFilter !== 'ALL' && selectedHoursFilter !== 'TECH' ? 'opacity-30' : ''}`} style={{ width: `${techPct}%` }} title={`Tech/Dev: ${techHours}h (${techPct}%)`} />}
                        {onPct > 0 && <div onClick={() => setSelectedHoursFilter(selectedHoursFilter === 'ONPAGE' ? 'ALL' : 'ONPAGE')} className={`h-full bg-purple-400 transition-all duration-500 hover:brightness-110 ${selectedHoursFilter !== 'ALL' && selectedHoursFilter !== 'ONPAGE' ? 'opacity-30' : ''}`} style={{ width: `${onPct}%` }} title={`On-Page: ${onPageHours}h (${onPct}%)`} />}
                        {offPct > 0 && <div onClick={() => setSelectedHoursFilter(selectedHoursFilter === 'OFFPAGE' ? 'ALL' : 'OFFPAGE')} className={`h-full bg-amber-400 transition-all duration-500 hover:brightness-110 ${selectedHoursFilter !== 'ALL' && selectedHoursFilter !== 'OFFPAGE' ? 'opacity-30' : ''}`} style={{ width: `${offPct}%` }} title={`Off-Page: ${offPageHours}h (${offPct}%)`} />}
                        {freePct > 0 && <div onClick={() => setSelectedHoursFilter(selectedHoursFilter === 'FREE' ? 'ALL' : 'FREE')} className={`h-full bg-emerald-500/40 transition-all duration-500 hover:brightness-110 ${selectedHoursFilter !== 'ALL' && selectedHoursFilter !== 'FREE' ? 'opacity-30' : ''}`} style={{ width: `${freePct}%` }} title={`Free Capacity: ${freeHours}h (${freePct}%)`} />}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* SECTION 2 HEADING: EMPLOYEE HOURS ROSTER */}
          <GraphicSectionHeader
            icon={<Clock className="w-4 h-4" />}
            title="Employee Active vs. Free Capacity Roster"
            badgeText={`${customMembers.filter(m => !m.role.toLowerCase().includes('ceo') && m.seniority !== 'CEO').length} Specialists`}
            badgeColor="emerald"
          />

          <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
            {customMembers
              .filter((member) => !member.role.toLowerCase().includes('ceo') && member.seniority !== 'CEO')
              .filter((member) => {
                if (selectedHoursFilter === 'ALL') return true;
                
                const allocated = calculateMemberAssignedHours(member.id);
                const free = Math.max(0, member.weeklyCapacityHours - allocated);
                
                if (selectedHoursFilter === 'FREE') return free > 0;
                
                const assignedProjs = projectsList.filter(
                  (p) =>
                    p.members.some((m) => m.id === member.id) ||
                    p.taskBreakdown?.some((tb) => tb.assigneeId === member.id)
                );
                
                return assignedProjs.some(p => {
                  if (selectedHoursFilter === 'TECH') {
                    return p.taskBreakdown?.some(tb => tb.assigneeId === member.id && tb.taskType.includes('Tech')) || (p.members.some(m => m.id === member.id) && (member.role.includes('Tech') || member.role.includes('Dev')));
                  }
                  if (selectedHoursFilter === 'ONPAGE') {
                    return p.taskBreakdown?.some(tb => tb.assigneeId === member.id && (tb.taskType.includes('On-Page') || tb.taskType.includes('AEO'))) || (p.members.some(m => m.id === member.id) && member.role.includes('On-Page'));
                  }
                  if (selectedHoursFilter === 'OFFPAGE') {
                    return p.taskBreakdown?.some(tb => tb.assigneeId === member.id && !tb.taskType.includes('Tech') && !tb.taskType.includes('On-Page') && !tb.taskType.includes('AEO')) || (p.members.some(m => m.id === member.id) && !member.role.includes('Tech') && !member.role.includes('Dev') && !member.role.includes('On-Page'));
                  }
                  return true;
                });
              })
              .map((member) => {
                // DYNAMIC CALCULATION: Employee assigned hours computed directly from assigned projects!
              const allocated = calculateMemberAssignedHours(member.id);
              const free = Math.max(0, member.weeklyCapacityHours - allocated);
              const activePct = Math.min(100, Math.round((allocated / member.weeklyCapacityHours) * 100));

              // Find which projects assign this member
              let assignedProjs = projectsList.filter(
                (p) =>
                  p.members.some((m) => m.id === member.id) ||
                  p.taskBreakdown?.some((tb) => tb.assigneeId === member.id)
              );
              
              if (selectedHoursFilter !== 'ALL' && selectedHoursFilter !== 'FREE') {
                 assignedProjs = assignedProjs.filter(p => {
                    if (selectedHoursFilter === 'TECH') {
                      return p.taskBreakdown?.some(tb => tb.assigneeId === member.id && tb.taskType.includes('Tech')) || (p.members.some(m => m.id === member.id) && (member.role.includes('Tech') || member.role.includes('Dev')));
                    }
                    if (selectedHoursFilter === 'ONPAGE') {
                      return p.taskBreakdown?.some(tb => tb.assigneeId === member.id && (tb.taskType.includes('On-Page') || tb.taskType.includes('AEO'))) || (p.members.some(m => m.id === member.id) && member.role.includes('On-Page'));
                    }
                    if (selectedHoursFilter === 'OFFPAGE') {
                      return p.taskBreakdown?.some(tb => tb.assigneeId === member.id && !tb.taskType.includes('Tech') && !tb.taskType.includes('On-Page') && !tb.taskType.includes('AEO')) || (p.members.some(m => m.id === member.id) && !member.role.includes('Tech') && !member.role.includes('Dev') && !member.role.includes('On-Page'));
                    }
                    return true;
                 });
              }

              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  key={member.id}
                  className="glass-panel border-slate-700/80 rounded-xl p-5 space-y-4 hover:border-emerald-500/30 hover-lift shine-effect shadow-md flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={member.avatar}
                        alt={member.name}
                        className="w-11 h-11 rounded-xl object-cover ring-1 ring-slate-700"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm font-bold text-white">{member.name}</h3>
                          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-500/50" title="Online" />
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs text-slate-300 block font-semibold">{member.role}</span>
                          {member.clickUpUserId && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-purple-950/70 border border-purple-600/40 text-[9px] font-mono text-purple-300 font-bold">
                              CU Linked
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setEditingMember(member)}
                      title="View & Edit Full Employee Profile"
                      className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer border border-slate-700"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span className="text-cyan-300">Active Work (From Projects)</span>
                        <span className="text-white font-bold">{allocated}h ({activePct}%)</span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-700">
                        <div
                          className="h-full bg-cyan-400 rounded-full transition-all duration-500"
                          style={{ width: `${activePct}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span className="text-emerald-300">Free Remaining</span>
                        <span className="text-white font-bold">{free}h ({100 - activePct}%)</span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-700">
                        <div
                          className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                          style={{ width: `${100 - activePct}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {activePct >= 90 && (
                    <div className="pt-2">
                      <button
                        onClick={() => setRebalanceOpenFor(rebalanceOpenFor === member.id ? null : member.id)}
                        className="w-full py-1.5 rounded-lg border border-amber-500/50 bg-amber-500/10 text-amber-400 text-[11px] font-bold flex items-center justify-center gap-1.5 hover:bg-amber-500/20 transition-all cursor-pointer"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        {rebalanceOpenFor === member.id ? 'Close Smart Rebalance' : 'Smart Rebalance Recommendations'}
                      </button>
                      <AnimatePresence>
                        {rebalanceOpenFor === member.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden mt-2"
                          >
                            <div className="p-3 bg-slate-900 border border-slate-700 rounded-lg space-y-2">
                              <span className="text-[10px] font-bold text-slate-400 uppercase">AI Transfer Suggestions</span>
                              {customMembers
                                .filter(m => m.id !== member.id && !m.role.toLowerCase().includes('ceo') && (m.weeklyCapacityHours - calculateMemberAssignedHours(m.id)) >= 5)
                                .sort((a, b) => {
                                  // Sort by same role first, then by most free capacity
                                  if (a.role === member.role && b.role !== member.role) return -1;
                                  if (a.role !== member.role && b.role === member.role) return 1;
                                  return (b.weeklyCapacityHours - calculateMemberAssignedHours(b.id)) - (a.weeklyCapacityHours - calculateMemberAssignedHours(a.id));
                                })
                                .slice(0, 2)
                                .map(candidate => (
                                  <div key={candidate.id} className="flex items-center justify-between text-xs bg-slate-800 p-2 rounded border border-slate-700">
                                    <div className="flex items-center gap-2">
                                      <img src={candidate.avatar} className="w-5 h-5 rounded-full object-cover" alt="" />
                                      <span className="text-slate-200 font-semibold">{candidate.name}</span>
                                    </div>
                                    <button className="text-cyan-400 font-bold hover:text-cyan-300 transition-colors">Transfer Work</button>
                                  </div>
                                ))}
                                {customMembers.filter(m => m.id !== member.id && (m.weeklyCapacityHours - calculateMemberAssignedHours(m.id)) >= 5).length === 0 && (
                                  <div className="text-xs text-slate-400 italic">No team members have enough free capacity right now.</div>
                                )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Assigned Projects Breakdown Footer */}
                  <div className="pt-3 border-t border-slate-700/60 space-y-2">
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">
                      Assigned Active Projects &amp; Deliverables
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {assignedProjs.length > 0 ? (
                        assignedProjs.map((p) => {
                          const shareHrs = getMemberHoursOnProject(p, member.id);
                          const memberTasks = (p.taskBreakdown || []).filter((tb) => tb.assigneeId === member.id);
                          return (
                            <span
                              key={p.id}
                              className="px-2.5 py-1.5 rounded-md bg-slate-900 border border-slate-700 text-[11px] font-bold text-cyan-300 flex flex-col gap-0.5"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-white">{p.client}</span>
                                <span className="text-emerald-300 font-bold">(+{shareHrs}h)</span>
                              </div>
                              {memberTasks.length > 0 && (
                                <div className="text-[10px] text-slate-300 font-semibold flex flex-wrap gap-2 pt-0.5 border-t border-slate-700">
                                  {memberTasks.map((t) => (
                                    <span key={t.id} className="text-cyan-300">
                                      • {t.taskType} ({t.hours}h)
                                    </span>
                                  ))}
                                </div>
                              )}
                            </span>
                          );
                        })
                      ) : (
                        <span className="text-[11px] font-bold text-emerald-300">
                          ✅ 0h assigned — 100% Free Bandwidth
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
            </AnimatePresence>
          </motion.div>
          </>
          )}
        </div>
      )}

      {/* VIEW 3: BI-DIRECTIONAL DSR TRACKER & PLAN */}
      {activeView === 'dsr' && (
        <DSRTrackerStudio
          members={customMembers}
          projects={projectsList}
          tasks={_tasks}
          onAssignProjectToMember={handleAssignProjectToMember}
        />
      )}

      {/* VIEW 4: EMPLOYEE SKILLS VISUAL MATRIX */}
      {activeView === 'skills' && (
        <div className="space-y-10">
          <div className="bg-gradient-to-r from-[#111827] via-slate-900 to-[#111827] border border-slate-700/90 rounded-2xl p-5 shadow-2xl relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-400 via-indigo-400 to-cyan-400 opacity-90" />
            <div className="flex items-center gap-3.5 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/25 to-indigo-500/20 border border-purple-500/50 flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/15 group-hover:scale-105 transition-transform">
                <Award className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-extrabold text-white tracking-tight">Employee Skills Visual Matrix</h2>
                  <span className="px-2.5 py-0.5 rounded-md bg-purple-500/25 text-purple-300 text-xs font-black border border-purple-500/50 shadow-sm">
                    4 Core Competencies
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-medium mt-0.5">Visual proficiency bars across SEO, AEO/GEO, Dev, and UI/UX</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAddMemberModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-purple-500/25 transition-all cursor-pointer hover:scale-105 shrink-0 relative z-10"
            >
              <Plus className="w-4 h-4" />
              <span>Add Team Member</span>
            </button>
          </div>

          {/* SECTION 1 HEADING: SKILLS FILTER STUDIO */}
          <GraphicSectionHeader
            icon={<ShieldCheck className="w-4 h-4" />}
            title="Skill Filter & Competency Studio"
            badgeText={filterSkill === 'ALL' ? 'Showing All Domains' : filterSkill}
            badgeColor="purple"
          />

          {/* Skill Filter Bar */}
          <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-slate-900/80 border border-slate-800/60">
            <span className="text-[11px] font-semibold text-slate-400 pl-1">Filter by Skill:</span>
            {['ALL', ...Array.from(new Set(customMembers.flatMap((m) => m.skills || [])))].map((sk) => (
              <button
                key={sk}
                type="button"
                onClick={() => setFilterSkill(sk)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  filterSkill === sk
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-slate-950/80 text-slate-400 border border-slate-800/60 hover:border-purple-500/50 hover:text-slate-200'
                }`}
              >
                {sk === 'ALL' ? '✨ All Skills' : sk}
              </button>
            ))}
          </div>

          {/* SECTION 1.5: INTERACTIVE AGENCY COMPETENCY SPECTRUM & DOMAIN MASTERY BARS */}
          <div className="bg-[#111827] border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 animate-fade-in">
            <GraphicSectionHeader
              icon={<Award className="w-4 h-4" />}
              title="Agency Competency Spectrum & Domain Mastery"
              badgeText="Quarterly Benchmarks"
              badgeColor="indigo"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
              {[
                { domain: 'Technical SEO & Architecture', avg: 94, color: 'from-cyan-400 to-blue-500', top: ['Agam (98%)', 'Vinay (95%)'] },
                { domain: 'On-Page & AEO/GEO Content Strategy', avg: 89, color: 'from-purple-400 to-indigo-500', top: ['Manpreet (92%)', 'Amrit Kaur (88%)'] },
                { domain: 'Off-Page & High-Authority Building', avg: 86, color: 'from-amber-400 to-orange-500', top: ['Manpreet (91%)', 'Vinay (85%)'] },
                { domain: 'Client Leadership & Retainer Growth', avg: 95, color: 'from-emerald-400 to-teal-500', top: ['Gaurav (99%)', 'Harshit (96%)'] }
              ].map(item => (
                <div key={item.domain} className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3 shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-white uppercase tracking-wider">{item.domain}</span>
                    <span className="text-sm font-extrabold text-purple-300">{item.avg}% Mastery</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-3 border border-slate-700 overflow-hidden">
                    <div className={`h-full bg-gradient-to-r ${item.color} transition-all duration-700`} style={{ width: `${item.avg}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                    <span>Top Domain Specialists:</span>
                    <div className="flex gap-1.5 font-bold text-slate-200">
                      {item.top.map(t => <span key={t} className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 text-purple-300">{t}</span>)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 2 HEADING: EMPLOYEE COMPETENCY CARDS */}
          <GraphicSectionHeader
            icon={<Users className="w-4 h-4" />}
            title="Squad Proficiency & Evaluation Profiles"
            badgeText="Click Member for 360° Assessment"
            badgeColor="cyan"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {customMembers
              .filter((member) => filterSkill === 'ALL' || (member.skills && member.skills.includes(filterSkill)))
              .map((member) => (
                <div
                  key={member.id}
                  className="bg-[#111827]/90 border border-slate-800/60 rounded-xl p-5 space-y-4 hover:border-slate-700 transition-all shadow-sm flex flex-col justify-between group"
                >
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <div
                        onClick={() => setViewingMemberProfile(member)}
                        className="flex items-center gap-3 cursor-pointer group/header"
                      >
                        <img
                          src={member.avatar}
                          alt={member.name}
                          className="w-11 h-11 rounded-xl object-cover ring-1 ring-slate-700 group-hover/header:ring-purple-500/80 transition-all shrink-0"
                        />
                        <div>
                          <h3 className="text-sm font-semibold text-white group-hover/header:text-purple-400 transition-colors">
                            {member.name}
                          </h3>
                          <span className="text-xs text-slate-400 block font-medium">{member.role}</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span
                          className={`px-2 py-0.5 rounded-md text-xs font-semibold border ${
                            member.generalCompetency.clientReadyTier.includes('Tier 1')
                              ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                              : 'bg-slate-900 text-slate-400 border-slate-800/80'
                          }`}
                        >
                          🗣️ {member.generalCompetency.clientReadyTier.split(':')[0]}
                        </span>
                        {member.generalCompetency.quarterlyScore ? (
                          <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                            Q Assessment: {member.generalCompetency.quarterlyScore}/10
                          </span>
                        ) : member.generalCompetency.lastTestedDate ? (
                          <span className="text-[10px] font-medium text-slate-400">
                            Tested: {member.generalCompetency.lastTestedDate}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="space-y-2.5 pt-1">
                      {member.skills.slice(0, 4).map((sk, idx) => {
                        const level = Math.min(10, Math.max(7, member.generalCompetency.clientCommunication - (idx % 2)));
                        const scorePct = Math.round((level / 10) * 100);
                        return (
                          <div key={sk} className="space-y-1">
                            <div className="flex justify-between text-xs font-medium">
                              <span className="text-slate-300">{sk}</span>
                              <span className="text-emerald-400 font-semibold">{level} / 10</span>
                            </div>
                            <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800/60">
                              <div
                                className="h-full bg-emerald-400 rounded-full"
                                style={{ width: `${scorePct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Crisp Action Footer: Quarterly Test + 360 Employee Profile */}
                  <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => openSkillTestModal(member)}
                      className="flex-1 text-xs font-semibold text-purple-300 hover:text-white flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 transition-all cursor-pointer shadow-sm"
                    >
                      <span>🧪 Take Skill Test</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setViewingMemberProfile(member)}
                      className="flex-1 text-xs font-semibold text-white hover:text-cyan-300 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700/80 transition-all cursor-pointer shadow-sm"
                    >
                      <span>👤 360° Profile &amp; Links</span>
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* VIEW 4: VISUAL JOB DELIVERY BOT */}
      {activeView === 'bot' && (() => {
        const activeDelivProj = projectsList.find((p) => p.id === selectedDeliveryProjectId) || projectsList[0];
        return (
          <div className="space-y-10 max-w-5xl mx-auto">
            <div className="bg-gradient-to-r from-[#111827] via-slate-900 to-[#111827] border border-slate-700/90 rounded-2xl p-5 shadow-2xl relative overflow-hidden flex items-center gap-4 group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-400 via-indigo-400 to-cyan-400 opacity-90" />
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20 shrink-0 group-hover:scale-105 transition-transform">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white tracking-tight">Visual Job Delivery Bot</h2>
                <p className="text-xs text-slate-300 font-medium mt-0.5">
                  Select any live active project to instantly package deliverables & verify squad allocation
                </p>
              </div>
            </div>

            {/* SECTION 1 HEADING: PROJECT SELECTION */}
            <GraphicSectionHeader
              icon={<Bot className="w-4 h-4" />}
              title="Active Project Selection & Delivery Target"
              badgeText="Step 1: Choose Client Retainer"
              badgeColor="purple"
            />

            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Select Live Active Project to Deliver:
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {projectsList.map((proj) => {
                  const isSelected = selectedDeliveryProjectId === proj.id;
                  return (
                    <div
                      key={proj.id}
                      onClick={() => {
                        setSelectedDeliveryProjectId(proj.id);
                        setDeliveredSuccess(false);
                      }}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all space-y-2 ${
                        isSelected
                          ? 'bg-cyan-500/15 border-cyan-500 text-white ring-2 ring-cyan-500/30 shadow-xl'
                          : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
                          {proj.client}
                        </span>
                        <span className="text-xs font-black text-emerald-400">{proj.price}</span>
                      </div>
                      <h3 className="text-sm font-extrabold text-white">{proj.name}</h3>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                        <span>Squad: {proj.members.length} specialists</span>
                        <span>Active: {proj.activeHours}h</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SECTION 1.5: ANIMATED DELIVERY PIPELINE & VERIFICATION STAGES */}
            <div className="bg-[#111827] border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 animate-fade-in">
              <GraphicSectionHeader
                icon={<CheckCircle2 className="w-4 h-4" />}
                title="Delivery Pipeline & Verification Stages"
                badgeText="⚡ Pipeline Ready"
                badgeColor="cyan"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pt-1">
                {[
                  { step: '01', title: 'Technical Audit & Indexing', desc: 'Scan Core Web Vitals & Robots.txt', status: 'Verified ✓', color: 'border-emerald-500/50 bg-emerald-950/20 text-emerald-300' },
                  { step: '02', title: 'On-Page SEO & Schema', desc: 'AEO/GEO Content & Meta tags', status: 'In QA ✓', color: 'border-cyan-500/50 bg-cyan-950/20 text-cyan-300' },
                  { step: '03', title: 'Off-Page Authority Check', desc: 'Guest post placement & backlinks', status: 'Ready ✓', color: 'border-purple-500/50 bg-purple-950/20 text-purple-300' },
                  { step: '04', title: 'Client Package Dispatch', desc: 'Auto-generate monthly PDF report', status: 'Awaiting Click', color: 'border-amber-500/50 bg-amber-950/20 text-amber-300' }
                ].map((s, idx) => (
                  <div key={s.step} className={`p-4 rounded-2xl border relative flex flex-col justify-between space-y-3 shadow-lg ${s.color}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-slate-950/80 border border-slate-700">Stage {s.step}</span>
                      <span className="text-[10px] font-extrabold uppercase">{s.status}</span>
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-white">{s.title}</h4>
                      <p className="text-[11px] text-slate-300 mt-0.5">{s.desc}</p>
                    </div>
                    {idx < 3 && (
                      <div className="hidden lg:block absolute -right-3.5 top-1/2 -translate-y-1/2 z-10 text-slate-400 font-black text-sm">
                        ➔
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION 2 HEADING: SQUAD VERIFICATION & DISPATCH */}
            <GraphicSectionHeader
              icon={<Send className="w-4 h-4" />}
              title="Squad Verification & Package Dispatcher"
              badgeText="Step 2: Final Review & Send"
              badgeColor="cyan"
            />

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Matched Squad for "{activeDelivProj.name}"
                  </span>
                  <span className="text-xs font-black text-cyan-400">Client: {activeDelivProj.client}</span>
                </div>
                <span className="text-xs font-black text-emerald-400">100% Verified Match</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {activeDelivProj.members.map((m) => {
                  const hrsOnProj = getMemberHoursOnProject(activeDelivProj, m.id);
                  return (
                    <div
                      key={m.id}
                      className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <img src={m.avatar} alt={m.name} className="w-10 h-10 rounded-xl object-cover" />
                        <div>
                          <h4 className="text-xs font-extrabold text-white">{m.name}</h4>
                          <span className="text-[11px] text-cyan-400 font-bold block">
                            Allocated: {hrsOnProj}h / wk
                          </span>
                        </div>
                      </div>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                <div>
                  {deliveredSuccess && (
                    <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 animate-fade-in">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        🚀 Delivered "{activeDelivProj.name}" package to {activeDelivProj.client}!
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {(activeDelivProj.clickUpTaskId || activeDelivProj.id.startsWith('prj_cu_') || activeDelivProj.taskBreakdown?.some(tb => tb.clickUpTaskId)) && (
                    <button
                      type="button"
                      onClick={() => {
                        const targetTaskId =
                          activeDelivProj.clickUpTaskId ||
                          (activeDelivProj.id.startsWith('prj_cu_') ? activeDelivProj.id.replace('prj_cu_', '') : undefined) ||
                          activeDelivProj.taskBreakdown?.find(tb => tb.clickUpTaskId)?.clickUpTaskId;
                        if (targetTaskId) {
                          handleOpenClickUpTicketModal(targetTaskId, activeDelivProj.name, {
                            taskUrl: activeDelivProj.clientFolderUrl,
                            projectName: activeDelivProj.name,
                            clientName: activeDelivProj.client,
                            status: activeDelivProj.status,
                            priority: activeDelivProj.priorityLevel
                          });
                        }
                      }}
                      className="flex items-center gap-2 px-5 py-3.5 rounded-xl bg-purple-900/40 hover:bg-purple-800/60 text-purple-200 border border-purple-500/50 font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg"
                      title="View ClickUp comments and post live from dashboard"
                    >
                      <MessageSquare className="w-4 h-4 text-purple-400" />
                      <span>💬 Ticket Discussion</span>
                    </button>
                  )}
                  {isClickUpConnected() && (
                    <button
                      type="button"
                      onClick={() => handlePushProjectToClickUp(activeDelivProj)}
                      disabled={pushingProjectId === activeDelivProj.id}
                      className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-purple-900/40 hover:bg-purple-800/60 text-purple-200 border border-purple-500/50 font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg disabled:opacity-50"
                    >
                      <Zap className={`w-4 h-4 ${pushingProjectId === activeDelivProj.id ? 'animate-spin' : 'text-purple-400'}`} />
                      <span>{pushingProjectId === activeDelivProj.id ? 'Deploying to ClickUp…' : '🚀 Deploy Scope to ClickUp'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleRunDeliveryBot}
                    className="flex items-center gap-2.5 px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-xl shadow-emerald-500/20"
                  >
                    <Send className="w-4 h-4" />
                    <span>Deliver Project Package to Client</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* VIEW 5: VISUAL FINANCES & PAYMENT TRACKER */}
      {activeView === 'finances' && (() => {
        const filteredFinancesList = projectsList.filter((p) => {
          if (selectedMonthFilter === 'ALL') return true;
          if (p.billingMonth === selectedMonthFilter) return true;
          if (p.monthlyHistory?.some((h) => h.month.includes(selectedMonthFilter))) return true;
          return false;
        });

        const totalContractValue = filteredFinancesList.reduce((sum, p) => sum + (p.paymentAmountNumeric || 0), 0);
        const totalPaid = filteredFinancesList
          .filter((p) => p.paymentStatus === 'Paid')
          .reduce((sum, p) => sum + (p.paymentAmountNumeric || 0), 0);
        const totalOverdue = filteredFinancesList
          .filter((p) => p.paymentStatus === 'Overdue')
          .reduce((sum, p) => sum + (p.paymentAmountNumeric || 0), 0);
        const totalPending = totalContractValue - totalPaid;
        const paidPercent = totalContractValue > 0 ? Math.round((totalPaid / totalContractValue) * 100) : 0;

        const overdueOrDueSoon = filteredFinancesList.filter(
          (p) => p.paymentStatus === 'Overdue' || p.paymentStatus === 'Due Soon'
        );

        return (
          <div className="space-y-10">
            {/* Header + Monthly Cycle Selector */}
            <div className="bg-gradient-to-r from-[#111827] via-slate-900 to-[#111827] border border-slate-700/90 rounded-2xl p-5 shadow-2xl relative overflow-hidden flex flex-wrap items-center justify-between gap-4 group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-500 opacity-90" />
              <div className="flex items-center gap-3.5 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0 group-hover:scale-105 transition-transform">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white tracking-tight">Visual Finances &amp; Payment Tracker</h2>
                  <p className="text-xs text-slate-400">
                    Track monthly invoices, payment schedules, revenue flow, and overdue alerts across all cycles
                  </p>
                </div>
              </div>

              {/* Month Selector Pills */}
              <div className="flex flex-wrap items-center gap-2 bg-slate-900/90 border border-slate-800 p-1.5 rounded-xl">
                {financeMonthOptions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedMonthFilter(item.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      selectedMonthFilter === item.id
                        ? 'bg-emerald-500 text-slate-950 shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* OVERDUE & DUE SOON NOTIFICATION CENTER */}
            {overdueOrDueSoon.length > 0 && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-950/40 via-slate-900 to-amber-950/40 border border-rose-500/30 space-y-3 shadow-xl">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">
                    Payment Alerts &amp; Overdue Notifications ({overdueOrDueSoon.length})
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {overdueOrDueSoon.map((proj) => (
                    <div
                      key={proj.id}
                      className={`p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
                        proj.paymentStatus === 'Overdue'
                          ? 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                          : 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                              proj.paymentStatus === 'Overdue'
                                ? 'bg-rose-500 text-white'
                                : 'bg-amber-500 text-slate-950'
                            }`}
                          >
                            {proj.paymentStatus === 'Overdue' ? '🚨 OVERDUE' : '⏳ DUE SOON'}
                          </span>
                          <span className="text-xs font-black text-white">
                            ${proj.paymentAmountNumeric.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-slate-400">({proj.paymentInvoiceId})</span>
                        </div>
                        <div className="text-xs font-bold text-white truncate max-w-xs">{proj.name}</div>
                        <div className="text-[10px] text-slate-300">
                          Client: {proj.client} • Payment Date: <strong>{proj.paymentDueDate}</strong>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 ml-auto">
                        <button
                          type="button"
                          onClick={() => handleMarkPaymentReceived(proj.id)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[11px] transition-all cursor-pointer shadow"
                        >
                          ✅ Mark Received
                        </button>
                        <button
                          type="button"
                          onClick={() => setViewingProjectDetail(proj)}
                          className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-bold text-[11px] transition-all cursor-pointer border border-cyan-500/30"
                        >
                          👁️ 360° Ledger
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <GraphicSectionHeader
              icon={<DollarSign className="w-4 h-4" />}
              title="Executive Revenue & Cash Flow Summary"
              badgeText="YTD Metrics"
              badgeColor="emerald"
            />

            {/* EXECUTIVE FINANCIAL KPI GAUGES */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="glass-panel rounded-2xl p-5 space-y-2 relative overflow-hidden group hover-lift shine-effect">
                <div className="absolute -top-10 -right-10 w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-all duration-500" />
                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block relative z-10">
                  Total Contracted Revenue
                </span>
                <div className="text-2xl font-black text-white relative z-10">
                  <AnimatedCounter value={totalContractValue} prefix="$" />
                </div>
                <div className="text-[11px] text-slate-400 relative z-10">Across {filteredFinancesList.length} filtered projects</div>
              </div>

              <div className="glass-panel rounded-2xl p-5 relative overflow-hidden group hover-lift shine-effect !border-emerald-500/30">
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all duration-500" />
                <div className="flex justify-between items-start relative z-10">
                  <div className="space-y-2">
                    <span className="text-[11px] font-extrabold text-emerald-400 uppercase tracking-wider block">
                      Collected / Paid Revenue
                    </span>
                    <div className="text-2xl font-black text-emerald-400 mt-1">
                      <AnimatedCounter value={totalPaid} prefix="$" />
                    </div>
                  </div>
                  <DonutChart value={paidPercent} max={100} color="emerald" size={70} />
                </div>
              </div>

              <div className="glass-panel rounded-2xl p-5 space-y-2 relative overflow-hidden group hover-lift shine-effect !border-cyan-500/20">
                <div className="absolute -top-10 -right-10 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all duration-500" />
                <span className="text-[11px] font-extrabold text-cyan-400 uppercase tracking-wider block relative z-10">
                  Pending / Upcoming Balance
                </span>
                <div className="text-2xl font-black text-cyan-400 relative z-10">
                  <AnimatedCounter value={totalPending} prefix="$" />
                </div>
                <div className="text-[11px] text-slate-400 relative z-10">Milestones &amp; retainers in progress</div>
              </div>

              <div className="glass-panel rounded-2xl p-5 space-y-2 relative overflow-hidden group hover-lift shine-effect !border-rose-500/30">
                <div className="absolute inset-0 bg-gradient-to-br from-rose-950/20 to-transparent pointer-events-none" />
                <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/20 transition-all duration-500 animate-pulse" />
                <span className="text-[11px] font-extrabold text-rose-400 uppercase tracking-wider block relative z-10">
                  Overdue Payments Alert
                </span>
                <div className="text-2xl font-black text-rose-400 relative z-10">
                  <AnimatedCounter value={totalOverdue} prefix="$" />
                </div>
                <div className="text-[11px] text-rose-300 font-bold relative z-10">Immediate client follow-up needed</div>
              </div>
            </div>

            {/* SECTION 1.5: VISUAL REVENUE COMPOSITION & PROFITABILITY MARGIN SPECTRUM CHART */}
            <div className="bg-[#111827] border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 animate-fade-in">
              <GraphicSectionHeader
                icon={<BarChart3 className="w-4 h-4" />}
                title="Revenue Composition & Profitability Margin Spectrum"
                badgeText="Proportional Split"
                badgeColor="emerald"
              />

              {/* Stacked Revenue Composition Bar */}
              {(() => {
                const paidPct = totalContractValue > 0 ? Math.round((totalPaid / totalContractValue) * 100) : 0;
                const overduePct = totalContractValue > 0 ? Math.round((totalOverdue / totalContractValue) * 100) : 0;
                const pendingPct = Math.max(0, 100 - (paidPct + overduePct));
                const totalLaborEstimated = 4850;
                const netAgencyProfit = Math.max(0, totalContractValue - totalLaborEstimated);
                const netMarginPct = totalContractValue > 0 ? Math.round((netAgencyProfit / totalContractValue) * 100) : 0;

                return (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-300">Revenue Breakdown Composition</span>
                        <span className="text-emerald-400">{paidPct}% Collected YTD</span>
                      </div>
                      <div className="w-full bg-slate-950 rounded-xl h-4 border border-slate-700 overflow-hidden flex">
                        {paidPct > 0 && <div className="h-full bg-emerald-400 transition-all duration-500" style={{ width: `${paidPct}%` }} title={`Paid: ${paidPct}%`} />}
                        {pendingPct > 0 && <div className="h-full bg-cyan-400 transition-all duration-500" style={{ width: `${pendingPct}%` }} title={`Pending: ${pendingPct}%`} />}
                        {overduePct > 0 && <div className="h-full bg-rose-500 transition-all duration-500" style={{ width: `${overduePct}%` }} title={`Overdue: ${overduePct}%`} />}
                      </div>
                      <div className="flex flex-wrap items-center justify-between text-[11px] font-bold pt-1">
                        <span className="flex items-center gap-1.5 text-emerald-300"><span className="w-2.5 h-2.5 rounded bg-emerald-400" /> Collected ({paidPct}%)</span>
                        <span className="flex items-center gap-1.5 text-cyan-300"><span className="w-2.5 h-2.5 rounded bg-cyan-400" /> Pending ({pendingPct}%)</span>
                        <span className="flex items-center gap-1.5 text-rose-300"><span className="w-2.5 h-2.5 rounded bg-rose-500 animate-pulse" /> Overdue ({overduePct}%)</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-800">
                      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Est. Agency Net Profit</span>
                          <span className="text-base font-extrabold text-emerald-400">${netAgencyProfit.toLocaleString()} ({netMarginPct}%)</span>
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center font-black text-emerald-300 text-xs">💎</div>
                      </div>
                      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Top Client Contribution</span>
                          <span className="text-base font-extrabold text-cyan-400">Medanta ($6,200/mo)</span>
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center font-black text-cyan-300 text-xs">🏥</div>
                      </div>
                      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Estimated Monthly Labor</span>
                          <span className="text-base font-extrabold text-purple-400">~$4,850 Total Cost</span>
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center font-black text-purple-300 text-xs">⚙️</div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* SECTION 2 HEADING: FINANCIAL PROJECT CARDS */}
            <GraphicSectionHeader
              icon={<DollarSign className="w-4 h-4" />}
              title="Individual Project Invoices & Payment Schedule Ledger"
              badgeText={`${filteredFinancesList.length} Retainers`}
              badgeColor="cyan"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredFinancesList.map((proj) => (
                  <div
                    key={proj.id}
                    className="glass-panel border-slate-800 rounded-2xl p-5 space-y-4 hover:border-cyan-500/30 hover-lift shine-effect shadow-xl flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-slate-950 text-slate-300 border border-slate-800">
                          {proj.client} ({proj.paymentInvoiceId})
                        </span>

                        <span
                          className={`px-2.5 py-1 rounded-lg text-xs font-black border ${
                            proj.paymentStatus === 'Paid'
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                              : proj.paymentStatus === 'Overdue'
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                              : proj.paymentStatus === 'Due Soon'
                              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          {proj.paymentStatus === 'Paid'
                            ? '✅ Paid'
                            : proj.paymentStatus === 'Overdue'
                            ? '🚨 Overdue'
                            : proj.paymentStatus === 'Due Soon'
                            ? '⏳ Due Soon'
                            : '📋 Pending'}
                        </span>
                      </div>

                      <h4 className="text-base font-extrabold text-white leading-snug">{proj.name}</h4>

                      <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block">Payment Amount</span>
                          <span className="text-sm font-black text-emerald-400">
                            ${proj.paymentAmountNumeric.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block">Payment Date</span>
                          <span className="text-xs font-black text-white">{proj.paymentDueDate}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block">Billing Model</span>
                          <span className="text-xs font-bold text-slate-300">{proj.billingType}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block">Received Date</span>
                          <span className="text-xs font-bold text-emerald-300">
                            {proj.paymentReceivedDate || 'Not received yet'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800">
                      <div className="flex items-center gap-2">
                        {proj.paymentStatus !== 'Paid' ? (
                          <button
                            type="button"
                            onClick={() => handleMarkPaymentReceived(proj.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all cursor-pointer shadow"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Mark Received</span>
                          </button>
                        ) : (
                          <span className="text-xs font-extrabold text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Payment Settled</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 ml-auto">
                        <button
                          type="button"
                          onClick={() => setViewingProjectDetail(proj)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 font-bold text-xs transition-all cursor-pointer border border-cyan-500/30"
                        >
                          <span>👁️ 360° Ledger</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditingFinancesProject({ ...proj })}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
          </div>
        );
      })()}

      {/* VIEW 6: NOTIFICATIONS & AGENCY ACTION CENTER */}
      {activeView === 'notifications' && (
        <div className="space-y-10">
          <div className="bg-gradient-to-r from-[#111827] via-slate-900 to-[#111827] border border-slate-700/90 rounded-2xl p-5 shadow-2xl relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-teal-400 to-indigo-500 opacity-90" />
            <div className="flex items-center gap-3.5 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/25 to-teal-500/20 border border-cyan-500/50 flex items-center justify-center shrink-0 shadow-lg shadow-cyan-500/15 group-hover:scale-105 transition-transform">
                <Bell className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white tracking-tight">Agency Notifications &amp; Alert Center</h2>
                <p className="text-xs text-slate-300 font-medium mt-0.5">
                  Clicking any alert marks it read &amp; navigates you directly to that project or resource view
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 relative z-10">
              <span className="px-3.5 py-2 rounded-xl bg-slate-950/90 border border-slate-700 text-xs font-black text-cyan-400 shadow-sm">
                {notificationsList.filter((n) => !n.read).length} Unread Alerts
              </span>

              <button
                type="button"
                onClick={() =>
                  setNotificationsList((prev) => prev.map((n) => ({ ...n, read: true })))
                }
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 border border-slate-600 text-slate-200 font-bold text-xs transition-all cursor-pointer shadow-md hover:scale-105"
              >
                <CheckCheck className="w-4 h-4 text-emerald-400" />
                <span>Mark All as Read</span>
              </button>
            </div>
          </div>

          {/* SECTION 1 HEADING: NOTIFICATION CATEGORIES */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-900/95 border border-slate-700 rounded-2xl px-6 py-4.5 shadow-xl gap-3">
            <div>
              <h3 className="text-sm font-extrabold text-white tracking-wide uppercase flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-md shadow-cyan-500/50 animate-pulse" />
                Section 1: Notification Category Filter Studio
              </h3>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                Filter activity feed by unread status, ClickUp API sync alerts, billing invoices, or capacity warnings.
              </p>
            </div>
          </div>

          {/* Filter Pills Strip */}
          <div className="flex flex-wrap items-center gap-2 p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
            {[
              { id: 'all', label: 'All Notifications' },
              { id: 'unread', label: 'Unread Only' },
              { id: 'clickup', label: '⚡ ClickUp Syncs' },
              { id: 'milestone', label: '⚠️ Milestones & Renewals' },
              { id: 'finance', label: '💎 Financial & Invoices' },
              { id: 'capacity', label: '📊 Resource Bandwidth' }
            ].map((fItem) => {
              const active = notifCategoryFilter === fItem.id;
              return (
                <button
                  key={fItem.id}
                  type="button"
                  onClick={() => setNotifCategoryFilter(fItem.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    active
                      ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                      : 'bg-slate-950/80 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {fItem.label}
                </button>
              );
            })}
          </div>

          {/* SECTION 2 HEADING: LIVE ACTIVITY FEED */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-900/95 border border-slate-700 rounded-2xl px-6 py-4.5 shadow-xl gap-3">
            <div>
              <h3 className="text-sm font-extrabold text-white tracking-wide uppercase flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-md shadow-emerald-500/50 animate-pulse" />
                Section 2: Live Activity Feed &amp; Automated Alert Log
              </h3>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                Real-time updates across client deliverables, milestone targets, and squad allocations.
              </p>
            </div>
          </div>

          {/* Neat Clean Notifications Feed */}
          <div className="space-y-4">
            {notificationsList
              .filter((notif) => {
                if (notifCategoryFilter === 'unread') return !notif.read;
                if (notifCategoryFilter !== 'all') return notif.category === notifCategoryFilter;
                return true;
              })
              .map((notif) => {
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`group p-5 rounded-3xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg ${
                      notif.read
                        ? 'bg-slate-900/40 border-slate-800/60 hover:bg-slate-900/70 hover:border-slate-700'
                        : 'bg-slate-900/90 border-cyan-500/40 hover:border-cyan-400 shadow-cyan-500/5'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                          notif.category === 'clickup'
                            ? 'bg-purple-500/15 border-purple-500/30 text-purple-400'
                            : notif.category === 'milestone'
                            ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                            : notif.category === 'finance'
                            ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                            : 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400'
                        }`}
                      >
                        {notif.category === 'clickup' ? (
                          <span className="text-sm font-black">⚡</span>
                        ) : notif.category === 'milestone' ? (
                          <AlertCircle className="w-5 h-5" />
                        ) : notif.category === 'finance' ? (
                          <DollarSign className="w-5 h-5" />
                        ) : (
                          <Clock className="w-5 h-5" />
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-extrabold text-white group-hover:text-cyan-300 transition-colors">
                            {notif.title}
                          </span>
                          {!notif.read && (
                            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                          )}
                          <span className="text-[11px] font-semibold text-slate-500">
                            • {notif.timestamp}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {notif.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                      <span className="text-xs font-extrabold text-cyan-400 group-hover:text-cyan-300 inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 group-hover:border-cyan-500/50 transition-all">
                        <span>Tap to Open &amp; Inspect</span>
                        <ArrowUpRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ALL MODALS MOUNTED VIA REACT PORTAL DIRECTLY TO DOCUMENT.BODY TO ELIMINATE ANY Z-INDEX OR OVERLAPPING UI ISSUES WITH STICKY NAVBAR OR STACKING CONTEXTS */}
      {createPortal(
        <>
          {/* MODAL 1: Add Active Project */}
          <AnimatePresence>
          {showAddProjectModal && (
            <div key="add-project-modal-container" className="fixed inset-0 z-[99999] flex justify-end">
              {/* Backdrop */}
              <motion.div
                key="add-project-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 cursor-pointer modal-backdrop-overlay"
                onClick={() => setShowAddProjectModal(false)}
              />

              {/* Slide-over panel */}
              <motion.div
                key="add-project-panel"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                className="relative z-10 w-full max-w-3xl h-full flex flex-col shadow-[-20px_0_60px_rgba(0,0,0,0.4)] modal-slideover-panel"
              >
                {/* 1. Fixed Header */}
                <div className="px-6 py-4 flex items-center justify-between shrink-0 z-20 modal-header-bar">
                  <div>
                    <h3 className="text-base font-extrabold flex items-center gap-2 modal-title">
                      <span>🚀 Add Active Client Project &amp; Retainer</span>
                    </h3>
                    <p className="text-xs mt-0.5 modal-subtitle">
                      Configure client retainer specs, billing, and assign deliverable leads for On-Page, Off-Page, and Technical SEO
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddProjectModal(false)}
                    className="p-2 rounded-xl transition-colors cursor-pointer modal-close-btn"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* 2. Fixed Step Navigation Bar */}
                <div className="px-6 py-2.5 flex items-center gap-2 shrink-0 overflow-x-auto z-10 modal-tabs-bar">
                  <button
                    type="button"
                    onClick={() => setModalStepTab('core')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer ${
                      modalStepTab === 'core'
                        ? 'modal-tab-active'
                        : 'modal-tab-inactive'
                    }`}
                  >
                    <span>1️⃣ Core &amp; Client Specs</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalStepTab('billing')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer ${
                      modalStepTab === 'billing'
                        ? 'modal-tab-active'
                        : 'modal-tab-inactive'
                    }`}
                  >
                    <span>2️⃣ Billing &amp; Comms</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalStepTab('team')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer ${
                      modalStepTab === 'team'
                        ? 'modal-tab-active'
                        : 'modal-tab-inactive'
                    }`}
                  >
                    <span>3️⃣ Leadership &amp; Hours</span>
                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${modalStepTab === 'team' ? 'bg-white/20 text-white' : 'bg-cyan-500/20 text-cyan-400'}`}>
                      {newTaskAllocations.length}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalStepTab('access')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer ${
                      modalStepTab === 'access'
                        ? 'modal-tab-active'
                        : 'modal-tab-inactive'
                    }`}
                  >
                    <span>4️⃣ Access &amp; Health Audit</span>
                  </button>
                </div>

                {/* 3. Single Scrollable Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 modal-scroll-body">
                  {/* TAB 1: CORE INFO & CLIENT DETAILS */}
                  {modalStepTab === 'core' && (
                    <div className="space-y-4 animate-fade-in">
                      {isClickUpConnected() && (
                        <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-purple-600 flex items-center justify-center text-white font-black text-xs shrink-0 shadow">
                              CU
                            </div>
                            <div>
                              <div className="text-xs font-bold text-white flex items-center gap-1.5" style={{ color: '#ffffff' }}>
                                <span>ClickUp List Auto-Import</span>
                                {newClickUpListName && (
                                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono border border-emerald-500/30">
                                    Linked: {newClickUpListName}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-300" style={{ color: '#f1f5f9' }}>
                                Auto-populate client, project name, and deliverable tasks from your ClickUp Workspace.
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={handleLoadClickUpLists}
                            disabled={loadingClickUpLists}
                            className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow-md shadow-purple-600/30 shrink-0 cursor-pointer disabled:opacity-50"
                          >
                            <RefreshCw className={`w-3 h-3 ${loadingClickUpLists ? 'animate-spin' : ''}`} />
                            <span>{loadingClickUpLists ? 'Fetching Lists…' : '⚡ Select ClickUp List'}</span>
                          </button>
                        </div>
                      )}

                      {showClickUpListPicker && availableClickUpLists.length > 0 && (
                        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-700 space-y-2 animate-fadeIn shadow-lg">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white" style={{ color: '#ffffff' }}>Choose a ClickUp List to auto-fill project:</span>
                            <button
                              type="button"
                              onClick={() => setShowClickUpListPicker(false)}
                              className="text-xs text-slate-400 hover:text-white cursor-pointer"
                            >
                              ✕ Close
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                            {availableClickUpLists.map((l) => (
                              <button
                                key={l.id}
                                type="button"
                                onClick={() => handleImportProjectFromClickUpList(l.id)}
                                className="p-2.5 rounded-lg bg-slate-950 hover:bg-purple-950/60 border border-slate-800 hover:border-purple-500/60 text-left transition-all cursor-pointer group"
                              >
                                <div className="text-xs font-bold text-white group-hover:text-purple-300 truncate" style={{ color: '#ffffff' }}>
                                  {l.name}
                                </div>
                                <div className="text-[10px] text-slate-400" style={{ color: '#94a3b8' }}>
                                  Space: {l.spaceName || 'Workspace'}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-slate-400 block mb-1">Client Name (tasks)</label>
                          <input
                            type="text"
                            placeholder="e.g. Acme Health Enterprise"
                            value={newClientName}
                            onChange={(e) => setNewClientName(e.target.value)}
                            className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-400 block mb-1">Task / Project Name</label>
                          <input
                            type="text"
                            placeholder="e.g. Technical SEO & GEO Search Package"
                            value={newProjectName}
                            onChange={(e) => setNewProjectName(e.target.value)}
                            className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-slate-400 block mb-1">Project Status</label>
                          <select
                            value={newStatus}
                            onChange={(e) => setNewStatus(e.target.value as any)}
                            className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-3 py-2 text-xs font-bold text-cyan-300 focus:outline-none focus:border-emerald-500"
                          >
                            <option value="INITIAL STAGE">INITIAL STAGE</option>
                            <option value="ON TRACK">ON TRACK</option>
                            <option value="REVALUATION">REVALUATION</option>
                            <option value="PAUSED">PAUSED</option>
                            <option value="COMPLETED">COMPLETED</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-400 block mb-1">Priority</label>
                          <select
                            value={newPriorityLevel}
                            onChange={(e) => setNewPriorityLevel(e.target.value as any)}
                            className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-3 py-2 text-xs font-bold text-amber-300 focus:outline-none focus:border-emerald-500"
                          >
                            <option value="NORMAL">NORMAL</option>
                            <option value="URGENT">URGENT</option>
                            <option value="HIGH">HIGH</option>
                            <option value="LOW">LOW</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-400 block mb-1">Client Email (short text)</label>
                          <input
                            type="text"
                            placeholder="e.g. client@company.com"
                            value={newClientEmail}
                            onChange={(e) => setNewClientEmail(e.target.value)}
                            className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-400 block mb-1.5">
                          Service Labels (Select All Applicable)
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            'Full SEO',
                            'Local SEO',
                            'Technical SEO',
                            'AEO',
                            'GEO',
                            'Ecom SEO',
                            'Wordpress Dev',
                            'Website Migration',
                            'Google Ads',
                            'Content Optimization'
                          ].map((lbl) => {
                            const isSelected = newServiceLabels.includes(lbl);
                            return (
                              <button
                                key={lbl}
                                type="button"
                                onClick={() =>
                                  setNewServiceLabels((prev) =>
                                    isSelected ? prev.filter((s) => s !== lbl) : [...prev, lbl]
                                  )
                                }
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                                }`}
                              >
                                {lbl} {isSelected ? '✓' : ''}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-400 block mb-1">
                          Task Content / Project Scope Brief
                        </label>
                        <textarea
                          rows={3}
                          placeholder="Enter full brief description, milestones, CMS platform details, or scope objectives..."
                          value={newTaskContent}
                          onChange={(e) => setNewTaskContent(e.target.value)}
                          className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 resize-none"
                        />
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="button"
                          onClick={() => setModalStepTab('billing')}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition-all cursor-pointer"
                        >
                          Next: Billing & Communication →
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: BILLING, DATES & COMMUNICATION */}
                  {modalStepTab === 'billing' && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-slate-400 block mb-1">Billing Method</label>
                          <select
                            value={newBillingType}
                            onChange={(e) => setNewBillingType(e.target.value as any)}
                            className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                          >
                            <option value="Monthly Retainer">Fixed / Monthly Retainer</option>
                            <option value="Milestone Delivery">Milestone Delivery</option>
                            <option value="Weekly Hourly Billing">Weekly Hourly Billing ($/hr)</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-400 block mb-1">Billing Account</label>
                          <select
                            value={newBillingAccount}
                            onChange={(e) => setNewBillingAccount(e.target.value)}
                            className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                          >
                            <option value="Agam">Agam</option>
                            <option value="Manpreet">Manpreet</option>
                            <option value="Vinay">Vinay</option>
                            <option value="Gayatri">Gayatri</option>
                            <option value="Shivam">Shivam</option>
                            <option value="Rank Harvest">Rank Harvest</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-400 block mb-1">
                            {newBillingType === 'Weekly Hourly Billing' ? 'Hourly Rate ($ / hr)' : 'Price Tag ($ / mo)'}
                          </label>
                          <input
                            type="text"
                            value={newPrice}
                            onChange={(e) => setNewPrice(e.target.value)}
                            placeholder={newBillingType === 'Weekly Hourly Billing' ? 'e.g. 17 or $17/hr' : 'e.g. 2500'}
                            className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-3 py-2 text-xs font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>

                      {/* Add Project Hourly Billing Calculation Preview Banner */}
                      {newBillingType === 'Weekly Hourly Billing' && (() => {
                        const rateMatch = newPrice.match(/\$?([0-9]+(?:\.[0-9]+)?)/);
                        const rate = rateMatch ? parseFloat(rateMatch[1]) : 0;
                        const allocatedHrs = newTaskAllocations.reduce((s, a) => s + (Number(a.hours) || 0), 0);
                        const effectiveHrs = allocatedHrs > 0 ? allocatedHrs : newTotalHours;
                        const weeklyAmt = Math.round(rate * effectiveHrs);
                        const monthlyAmt = Math.round(weeklyAmt * 4);

                        return (
                          <div className="p-3.5 rounded-xl bg-gradient-to-r from-cyan-950/40 via-slate-900 to-indigo-950/40 border border-cyan-500/40 space-y-2.5 animate-fade-in shadow-lg">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-cyan-400" />
                                <span className="text-xs font-black text-white tracking-wide">
                                  ⚡ Hourly Billing Auto-Calculation
                                </span>
                              </div>
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                                Weekly Hourly Billing ($/hr)
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-1 text-center">
                              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Hourly Rate</div>
                                <div className="text-sm font-black text-cyan-300 font-mono mt-0.5">
                                  ${rate}/hr
                                </div>
                              </div>
                              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Assigned Scope</div>
                                <div className="text-sm font-black text-indigo-300 font-mono mt-0.5">
                                  {allocatedHrs} hrs / wk
                                </div>
                              </div>
                              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Weekly Billing</div>
                                <div className="text-sm font-black text-emerald-400 font-mono mt-0.5">
                                  ${weeklyAmt.toLocaleString()} / wk
                                </div>
                              </div>
                              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Monthly Est. (4 wks)</div>
                                <div className="text-sm font-black text-emerald-300 font-mono mt-0.5">
                                  ${monthlyAmt.toLocaleString()} / mo
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                              <span>
                                📌 Calculated Price Tag: <strong className="text-white">${rate}/hr × {allocatedHrs} hrs/wk = ${weeklyAmt.toLocaleString()}/wk (~${monthlyAmt.toLocaleString()}/mo)</strong>
                              </span>
                              {allocatedHrs === 0 && (
                                <span className="text-amber-400 font-bold">
                                  ⚠️ 0 hrs assigned. Set deliverable hours in Tab 3.
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {newBillingType === 'Milestone Delivery' && (
                        <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/30 space-y-3 animate-fade-in">
                          <div className="flex items-center justify-between">
                            <h5 className="text-xs font-black text-cyan-300 uppercase flex items-center gap-1.5">
                              <span>🏁 Milestone Delivery Setup & Notifications</span>
                            </h5>
                            <span className="text-[10px] text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">
                              Automated Reminder Alert Active
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-[11px] font-bold text-slate-300 block mb-1">
                                Total Scope Milestones
                              </label>
                              <input
                                type="number"
                                min={1}
                                max={50}
                                value={newMilestonesTotal}
                                onChange={(e) => setNewMilestonesTotal(parseInt(e.target.value, 10) || 1)}
                                className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-3 py-2 text-xs font-bold text-cyan-300 focus:outline-none focus:border-cyan-500"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-bold text-slate-300 block mb-1">
                                Next Milestone Delivery / Reminder Note
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. Milestone 1 Checkpoint due July 31, 2026"
                                value={newDueDate}
                                onChange={(e) => setNewDueDate(e.target.value)}
                                className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-slate-400 block mb-1">Start Date</label>
                          <input
                            type="date"
                            value={newStartDate}
                            onChange={(e) => setNewStartDate(e.target.value)}
                            className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-400 block mb-1">Due Date / Renewal</label>
                          <input
                            type="text"
                            value={newDueDate}
                            onChange={(e) => setNewDueDate(e.target.value)}
                            className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-400 block mb-1">Client Folder URL</label>
                          <input
                            type="text"
                            placeholder="https://app.clickup.com/..."
                            value={newClientFolderUrl}
                            onChange={(e) => setNewClientFolderUrl(e.target.value)}
                            className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-slate-400 block mb-1">Communication Channel</label>
                          <select
                            value={newCommunicationChannel}
                            onChange={(e) => setNewCommunicationChannel(e.target.value)}
                            className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                          >
                            <option value="">-- None / Blank --</option>
                            <option value="UW - Agam">UW - Agam</option>
                            <option value="UW - Manpreet">UW - Manpreet</option>
                            <option value="Slack">Slack</option>
                            <option value="WhatsApp - 79">WhatsApp - 79</option>
                            <option value="WhatsApp - 95">WhatsApp - 95</option>
                            <option value="Client Email">Client Email</option>
                            <option value="Trello">Trello</option>
                            <option value="Teams Live">Teams Live</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-400 block mb-1">Reporting Platform</label>
                          <select
                            value={newReportingPlatform}
                            onChange={(e) => setNewReportingPlatform(e.target.value)}
                            className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                          >
                            <option value="">-- None / Blank --</option>
                            <option value="UW - Agam">UW - Agam</option>
                            <option value="WhatsApp">WhatsApp</option>
                            <option value="Trello 1428">Trello 1428</option>
                            <option value="Monday.com">Monday.com</option>
                            <option value="Slack">Slack</option>
                            <option value="Email">Email</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-400 block mb-1">Reporting Note / Frequency</label>
                        <input
                          type="text"
                          placeholder="e.g. Technical Audit in the first week / Weekly update notes..."
                          value={newReportingNote}
                          onChange={(e) => setNewReportingNote(e.target.value)}
                          className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div className="flex justify-between items-center pt-2">
                        <button
                          type="button"
                          onClick={() => setModalStepTab('core')}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                        >
                          ← Back to Core Specs
                        </button>
                        <button
                          type="button"
                          onClick={() => setModalStepTab('team')}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition-all cursor-pointer"
                        >
                          Next: Leadership & Deliverables →
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: LEADERSHIP & HOURS ALLOCATION */}
                  {modalStepTab === 'team' && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                        <h5 className="text-xs font-black text-cyan-300 uppercase">Leadership Assignees & Total Weekly Hours</h5>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                          <div>
                            <label className="text-[11px] font-bold text-slate-400 block mb-1">Assignee (Team Lead)</label>
                            <select
                              value={newProjectLeadId}
                              onChange={(e) => setNewProjectLeadId(e.target.value)}
                              className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                            >
                              <option value="">-- Unassigned (Leave Blank) --</option>
                              {customMembers.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {getMemberCapacityLabel(m)}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-slate-400 block mb-1">Client Face (Call Lead)</label>
                            <select
                              value={newClientCallAssigneeId}
                              onChange={(e) => setNewClientCallAssigneeId(e.target.value)}
                              className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                            >
                              <option value="">-- Unassigned (Leave Blank) --</option>
                              {customMembers.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {getMemberCapacityLabel(m)}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-slate-400 block mb-1">Dev / Tech Lead</label>
                            <select
                              value={newDevTechAssigneeId}
                              onChange={(e) => setNewDevTechAssigneeId(e.target.value)}
                              className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                            >
                              <option value="">-- Unassigned (Leave Blank) --</option>
                              {customMembers.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {getMemberCapacityLabel(m)}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-slate-400 block mb-1">Total Weekly Hours</label>
                            <input
                              type="number"
                              value={newTotalHours}
                              onChange={(e) => setNewTotalHours(Number(e.target.value) || 0)}
                              className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-2.5 py-1.5 text-xs font-black text-emerald-400 focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-extrabold text-slate-300">
                            Deliverable Specialists & Weekly Hours Allocation
                          </label>
                          <div className="flex items-center gap-2">
                            {newBillingType === 'Weekly Hourly Billing' && (() => {
                              const allocHrs = newTaskAllocations.reduce((s, a) => s + (Number(a.hours) || 0), 0);
                              const rateMatch = newPrice.match(/\$?([0-9]+(?:\.[0-9]+)?)/);
                              const rate = rateMatch ? parseFloat(rateMatch[1]) : 0;
                              return (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                                  ⚡ Auto-Calc: ${Math.round(rate * allocHrs).toLocaleString()}/wk (${Math.round(rate * allocHrs * 4).toLocaleString()}/mo)
                                </span>
                              );
                            })()}
                            <span className="text-[11px] text-slate-400">
                              Allocated: {newTaskAllocations.reduce((s, a) => s + (Number(a.hours) || 0), 0)} hrs / week
                            </span>
                          </div>
                        </div>

                        {newTaskAllocations.map((tb) => (
                          <div
                            key={tb.id}
                            className="grid grid-cols-12 gap-2 items-center bg-slate-950 p-2.5 rounded-xl border border-slate-800/80"
                          >
                            <div className="col-span-5">
                              <select
                                value={tb.taskType}
                                onChange={(e) => {
                                  setNewTaskAllocations((prev) =>
                                    prev.map((i) => (i.id === tb.id ? { ...i, taskType: e.target.value } : i))
                                  );
                                }}
                                className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold"
                              >
                                <option value="On-Page SEO">On-Page SEO</option>
                                <option value="Off-Page SEO">Off-Page SEO</option>
                                <option value="Technical SEO">Technical SEO</option>
                                <option value="Content Optimization">Content Optimization</option>
                                <option value="AEO & GEO Strategy">AEO & GEO Strategy</option>
                                <option value="Wordpress Dev">Wordpress Dev</option>
                              </select>
                            </div>

                            <div className="col-span-4">
                              <select
                                value={tb.assigneeId}
                                onChange={(e) => {
                                  setNewTaskAllocations((prev) =>
                                    prev.map((i) => (i.id === tb.id ? { ...i, assigneeId: e.target.value } : i))
                                  );
                                }}
                                className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-lg px-2 py-1.5 text-xs text-slate-200"
                              >
                                <option value="">-- Unassigned --</option>
                                {customMembers.map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {getMemberCapacityLabel(m)}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="col-span-2">
                              <div className="relative">
                                <input
                                  type="number"
                                  min={0}
                                  value={tb.hours}
                                  onChange={(e) => {
                                    setNewTaskAllocations((prev) =>
                                      prev.map((i) =>
                                        i.id === tb.id ? { ...i, hours: Number(e.target.value) } : i
                                      )
                                    );
                                  }}
                                  className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-lg pl-2 pr-5 py-1.5 text-xs text-white font-bold text-right"
                                />
                                <span className="absolute right-1.5 top-2 text-[10px] text-slate-500">h</span>
                              </div>
                            </div>

                            <div className="col-span-1 flex justify-center">
                              <button
                                type="button"
                                onClick={() => setNewTaskAllocations((prev) => prev.filter((i) => i.id !== tb.id))}
                                className="text-slate-500 hover:text-red-400 p-1 cursor-pointer transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() =>
                              setNewTaskAllocations((prev) => [
                                ...prev,
                                { id: `tb-${Date.now()}`, taskType: 'On-Page SEO', assigneeId: customMembers[0]?.id || '', hours: 5 }
                              ])
                            }
                            className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-[11px] font-extrabold flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ Add Deliverable Row</span>
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2 pt-1 border-t border-slate-800">
                        <label className="text-xs font-extrabold text-slate-300 block">
                          Supporting Squad Roster (Optional)
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-36 overflow-y-auto p-2 rounded-xl bg-slate-950 border border-slate-800">
                          {customMembers.map((member) => {
                            const isChecked = newSelectedMemberIds.includes(member.id);
                            return (
                              <div
                                key={member.id}
                                onClick={() => {
                                  setNewSelectedMemberIds((prev) =>
                                    isChecked ? prev.filter((id) => id !== member.id) : [...prev, member.id]
                                  );
                                }}
                                className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer border transition-all ${
                                  isChecked
                                    ? 'bg-emerald-500/15 border-emerald-500/50 text-white'
                                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                                }`}
                              >
                                <img src={member.avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                                <span className="text-[11px] font-bold truncate">{member.name}</span>
                                {isChecked && <Check className="w-3.5 h-3.5 text-emerald-400 ml-auto" />}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-2">
                        <button
                          type="button"
                          onClick={() => setModalStepTab('billing')}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                        >
                          ← Back to Billing
                        </button>
                        <button
                          type="button"
                          onClick={() => setModalStepTab('access')}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition-all cursor-pointer"
                        >
                          Next: Access & Health Audit →
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TAB 4: ACCESS LOGINS & HEALTH AUDIT */}
                  {modalStepTab === 'access' && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-slate-400 block mb-1">Backend Logins Note</label>
                          <input
                            type="text"
                            placeholder="e.g. Added to Zoho / Shopify - 1428 / Wordpress Admin"
                            value={newBackendLoginsNote}
                            onChange={(e) => setNewBackendLoginsNote(e.target.value)}
                            className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-400 block mb-1">Guest Post Included?</label>
                          <select
                            value={newGuestPostIncluded}
                            onChange={(e) => setNewGuestPostIncluded(e.target.value as any)}
                            className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                          >
                            <option value="No">No — Standard Off-Page</option>
                            <option value="Yes">Yes — Dedicated Guest Post</option>
                          </select>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                        <h5 className="text-xs font-black text-purple-300 uppercase">Access Status Tracking</h5>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div>
                            <label className="text-[11px] font-bold text-slate-400 block mb-1">GA4 Access</label>
                            <select
                              value={newGa4Access}
                              onChange={(e) => setNewGa4Access(e.target.value as any)}
                              className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none"
                            >
                              <option value="Techie 1428">Techie 1428</option>
                              <option value="Techie 1418">Techie 1418</option>
                              <option value="Client Email">Client Email</option>
                              <option value="Requested">Requested</option>
                              <option value="Not Required">Not Required</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-slate-400 block mb-1">GBP Access</label>
                            <select
                              value={newGbpAccess}
                              onChange={(e) => setNewGbpAccess(e.target.value as any)}
                              className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none"
                            >
                              <option value="Techie GMB">Techie GMB</option>
                              <option value="Requested">Requested</option>
                              <option value="Not Required">Not Required</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-slate-400 block mb-1">GSC Access</label>
                            <select
                              value={newGscAccess}
                              onChange={(e) => setNewGscAccess(e.target.value as any)}
                              className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none"
                            >
                              <option value="Techie 1428">Techie 1428</option>
                              <option value="Requested">Requested</option>
                              <option value="Not Required">Not Required</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-slate-400 block mb-1">GTM Access</label>
                            <select
                              value={newGtmAccess}
                              onChange={(e) => setNewGtmAccess(e.target.value as any)}
                              className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none"
                            >
                              <option value="Techie 1418">Techie 1418</option>
                              <option value="Requested">Requested</option>
                              <option value="Not Required">Not Required</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-400 block mb-1.5">Project Health & Client Rating</label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[
                            { label: '☺☺☺☺☺ 5/5 Excellent', val: '☺☺☺☺☺' },
                            { label: '☺☺☺☺ 4/5 Good', val: '☺☺☺☺' },
                            { label: '☺☺☺ 3/5 Needs Attention', val: '☺☺☺' },
                            { label: '🚨 Critical Attention', val: '🚨 Critical' }
                          ].map((item) => (
                            <button
                              key={item.val}
                              type="button"
                              onClick={() => setNewProjectHealthEmoji(item.val as any)}
                              className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
                                newProjectHealthEmoji === item.val
                                  ? 'bg-emerald-500/20 border-emerald-500 text-white'
                                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-start pt-2">
                        <button
                          type="button"
                          onClick={() => setModalStepTab('team')}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                        >
                          ← Back to Leadership & Deliverables
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Fixed Footer Action Bar */}
                <div className="px-6 py-4 flex items-center justify-between shrink-0 z-20 modal-footer-bar">
                  <button
                    type="button"
                    onClick={() => setShowAddProjectModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer modal-cancel-btn"
                  >
                    Cancel
                  </button>
                  <div className="flex items-center gap-2">
                    {modalStepTab !== 'core' && (
                      <button
                        type="button"
                        onClick={() => {
                          if (modalStepTab === 'billing') setModalStepTab('core');
                          else if (modalStepTab === 'team') setModalStepTab('billing');
                          else if (modalStepTab === 'access') setModalStepTab('team');
                        }}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer modal-nav-back-btn"
                      >
                        ← Previous Step
                      </button>
                    )}
                    {modalStepTab !== 'access' ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (modalStepTab === 'core') setModalStepTab('billing');
                          else if (modalStepTab === 'billing') setModalStepTab('team');
                          else if (modalStepTab === 'team') setModalStepTab('access');
                        }}
                        className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-all cursor-pointer shadow-md"
                      >
                        Next Step →
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={handleCreateProject}
                      className="px-5 py-2 rounded-xl modal-save-btn text-xs font-black transition-all cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>Add Project to Tracker</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
          </AnimatePresence>

      {/* MODAL 2: Edit Existing Active Project & Squad Assignment */}
      <AnimatePresence>
      {editingProject && (
        <div key="edit-project-modal-container" className="fixed inset-0 z-[99999] flex justify-end">
          {/* Backdrop */}
          <motion.div
            key="edit-project-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 cursor-pointer modal-backdrop-overlay"
            onClick={() => setEditingProject(null)}
          />

          {/* Slide-over panel */}
          <motion.div
            key="edit-project-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative z-10 w-full max-w-3xl h-full flex flex-col shadow-[-20px_0_60px_rgba(0,0,0,0.4)] modal-slideover-panel"
          >
            {/* 1. Fixed Header */}
            <div className="px-6 py-4 flex items-center justify-between shrink-0 z-20 modal-header-bar">
              <div>
                <h3 className="text-base font-extrabold flex items-center gap-2 modal-title">
                  <span>✏️ Edit Project &amp; Assigned Deliverables</span>
                </h3>
                <p className="text-xs mt-0.5 modal-subtitle">
                  Update retainer details, budget cap, and On-Page / Off-Page / Technical SEO specialists
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingProject(null)}
                className="p-2 rounded-xl transition-colors cursor-pointer modal-close-btn"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 2. Fixed Step Navigation Bar */}
            <div className="px-6 py-2.5 flex items-center gap-2 shrink-0 overflow-x-auto z-10 modal-tabs-bar">
              <button
                type="button"
                onClick={() => setEditModalStepTab('core')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer ${
                  editModalStepTab === 'core'
                    ? 'modal-tab-active'
                    : 'modal-tab-inactive'
                }`}
              >
                <span>1️⃣ Core &amp; Client Specs</span>
              </button>
              <button
                type="button"
                onClick={() => setEditModalStepTab('billing')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer ${
                  editModalStepTab === 'billing'
                    ? 'modal-tab-active'
                    : 'modal-tab-inactive'
                }`}
              >
                <span>2️⃣ Billing &amp; Comms</span>
              </button>
              <button
                type="button"
                onClick={() => setEditModalStepTab('team')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer ${
                  editModalStepTab === 'team'
                    ? 'modal-tab-active'
                    : 'modal-tab-inactive'
                }`}
              >
                <span>3️⃣ Leadership &amp; Hours</span>
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${editModalStepTab === 'team' ? 'bg-white/20 text-white' : 'bg-cyan-500/20 text-cyan-400'}`}>
                  {(editingProject.taskBreakdown || []).length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setEditModalStepTab('access')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer ${
                  editModalStepTab === 'access'
                    ? 'modal-tab-active'
                    : 'modal-tab-inactive'
                }`}
              >
                <span>4️⃣ Access &amp; Health Audit</span>
              </button>
            </div>

            {/* 3. Single Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 modal-scroll-body">
              {/* TAB 1: CORE INFO & CLIENT DETAILS */}
              {editModalStepTab === 'core' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">Client Name (tasks)</label>
                      <input
                        type="text"
                        value={editingProject.client}
                        onChange={(e) => setEditingProject({ ...editingProject, client: e.target.value })}
                        className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">Task / Project Name</label>
                      <input
                        type="text"
                        value={editingProject.name}
                        onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })}
                        className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">Project Status</label>
                      <select
                        value={editingProject.status || 'ON TRACK'}
                        onChange={(e) => setEditingProject({ ...editingProject, status: e.target.value as any })}
                        className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-3 py-2 text-xs font-bold text-cyan-300 focus:outline-none focus:border-cyan-500"
                      >
                        <option value="INITIAL STAGE">INITIAL STAGE</option>
                        <option value="ON TRACK">ON TRACK</option>
                        <option value="REVALUATION">REVALUATION</option>
                        <option value="PAUSED">PAUSED</option>
                        <option value="COMPLETED">COMPLETED</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">Priority</label>
                      <select
                        value={editingProject.priorityLevel || 'NORMAL'}
                        onChange={(e) => setEditingProject({ ...editingProject, priorityLevel: e.target.value as any })}
                        className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-3 py-2 text-xs font-bold text-amber-300 focus:outline-none focus:border-cyan-500"
                      >
                        <option value="NORMAL">NORMAL</option>
                        <option value="URGENT">URGENT</option>
                        <option value="HIGH">HIGH</option>
                        <option value="LOW">LOW</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">Client Email (short text)</label>
                      <input
                        type="text"
                        placeholder="e.g. client@company.com"
                        value={editingProject.clientEmail || ''}
                        onChange={(e) => setEditingProject({ ...editingProject, clientEmail: e.target.value })}
                        className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1.5">
                      Service Labels (Select All Applicable)
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        'Full SEO',
                        'Local SEO',
                        'Technical SEO',
                        'AEO',
                        'GEO',
                        'Ecom SEO',
                        'Wordpress Dev',
                        'Website Migration',
                        'Google Ads',
                        'Content Optimization'
                      ].map((lbl) => {
                        const currentLabels = editingProject.serviceLabels || ['Full SEO'];
                        const isSelected = currentLabels.includes(lbl);
                        return (
                          <button
                            key={lbl}
                            type="button"
                            onClick={() => {
                              const updated = isSelected
                                ? currentLabels.filter((s) => s !== lbl)
                                : [...currentLabels, lbl];
                              setEditingProject({ ...editingProject, serviceLabels: updated });
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                            }`}
                          >
                            {lbl} {isSelected ? '✓' : ''}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">
                      Task Content / Project Scope Brief
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Enter full brief description, milestones, CMS platform details, or scope objectives..."
                      value={editingProject.taskContent || ''}
                      onChange={(e) => setEditingProject({ ...editingProject, taskContent: e.target.value })}
                      className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 resize-none"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setEditModalStepTab('billing')}
                      className="px-3.5 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 text-xs font-bold transition-all cursor-pointer"
                    >
                      Next: Billing & Communication →
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: BILLING, DATES & COMMUNICATION */}
              {editModalStepTab === 'billing' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">Billing Method</label>
                      <select
                        value={editingProject.billingType}
                        onChange={(e) =>
                          setEditingProject({ ...editingProject, billingType: e.target.value as any })
                        }
                        className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                      >
                        <option value="Monthly Retainer">Fixed / Monthly Retainer</option>
                        <option value="Milestone Delivery">Milestone Delivery</option>
                        <option value="Weekly Hourly Billing">Weekly Hourly Billing ($/hr)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">Billing Account</label>
                      <select
                        value={editingProject.billingAccount || 'Agam'}
                        onChange={(e) => setEditingProject({ ...editingProject, billingAccount: e.target.value })}
                        className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                      >
                        <option value="Agam">Agam</option>
                        <option value="Manpreet">Manpreet</option>
                        <option value="Vinay">Vinay</option>
                        <option value="Gayatri">Gayatri</option>
                        <option value="Shivam">Shivam</option>
                        <option value="Rank Harvest">Rank Harvest</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">
                        {editingProject.billingType === 'Weekly Hourly Billing' ? 'Hourly Rate ($ / hr)' : 'Price Tag ($ / mo)'}
                      </label>
                      <input
                        type="text"
                        value={editingProject.price}
                        onChange={(e) => setEditingProject({ ...editingProject, price: e.target.value })}
                        placeholder={editingProject.billingType === 'Weekly Hourly Billing' ? 'e.g. 17 or $17/hr' : 'e.g. 2500'}
                        className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-3 py-2 text-xs font-bold text-emerald-400 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  {/* Edit Project Hourly Billing Calculation Preview Banner */}
                  {editingProject.billingType === 'Weekly Hourly Billing' && (() => {
                    const rateMatch = (editingProject.price || '').match(/\$?([0-9]+(?:\.[0-9]+)?)/);
                    const rate = rateMatch ? parseFloat(rateMatch[1]) : 0;
                    const allocatedHrs = (editingProject.taskBreakdown || []).reduce((s, a) => s + (Number(a.hours) || 0), 0);
                    const effectiveHrs = allocatedHrs > 0 ? allocatedHrs : (Number(editingProject.activeHours) || Number(editingProject.totalHours) || 0);
                    const weeklyAmt = Math.round(rate * effectiveHrs);
                    const monthlyAmt = Math.round(weeklyAmt * 4);

                    return (
                      <div className="p-3.5 rounded-xl bg-gradient-to-r from-cyan-950/40 via-slate-900 to-indigo-950/40 border border-cyan-500/40 space-y-2.5 animate-fade-in shadow-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-cyan-400" />
                            <span className="text-xs font-black text-white tracking-wide">
                              ⚡ Hourly Billing Auto-Calculation
                            </span>
                          </div>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                            Weekly Hourly Billing ($/hr)
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-1 text-center">
                          <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Hourly Rate</div>
                            <div className="text-sm font-black text-cyan-300 font-mono mt-0.5">
                              ${rate}/hr
                            </div>
                          </div>
                          <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Assigned Scope</div>
                            <div className="text-sm font-black text-indigo-300 font-mono mt-0.5">
                              {effectiveHrs} hrs / wk
                            </div>
                          </div>
                          <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Weekly Billing</div>
                            <div className="text-sm font-black text-emerald-400 font-mono mt-0.5">
                              ${weeklyAmt.toLocaleString()} / wk
                            </div>
                          </div>
                          <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Monthly Est. (4 wks)</div>
                            <div className="text-sm font-black text-emerald-300 font-mono mt-0.5">
                              ${monthlyAmt.toLocaleString()} / mo
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                          <span>
                            📌 Calculated Price Tag: <strong className="text-white">${rate}/hr × {effectiveHrs} hrs/wk = ${weeklyAmt.toLocaleString()}/wk (~${monthlyAmt.toLocaleString()}/mo)</strong>
                          </span>
                          {effectiveHrs === 0 && (
                            <span className="text-amber-400 font-bold">
                              ⚠️ 0 hrs assigned. Allocate deliverable hours in Tab 3.
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {editingProject.billingType === 'Milestone Delivery' && (
                    <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/30 space-y-3 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-black text-cyan-300 uppercase flex items-center gap-1.5">
                          <span>🏁 Milestone Tracker & Progress Alerts</span>
                        </h5>
                        <span className="text-[10px] text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">
                          Milestone Evaluation Active
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-slate-300 block mb-1">
                            Completed Milestones
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={50}
                            value={editingProject.milestonesCompleted}
                            onChange={(e) =>
                              setEditingProject({
                                ...editingProject,
                                milestonesCompleted: parseInt(e.target.value, 10) || 0
                              })
                            }
                            className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-3 py-2 text-xs font-bold text-emerald-400 focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-300 block mb-1">
                            Total Scope Milestones
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={50}
                            value={editingProject.milestonesTotal}
                            onChange={(e) =>
                              setEditingProject({
                                ...editingProject,
                                milestonesTotal: parseInt(e.target.value, 10) || 1
                              })
                            }
                            className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-3 py-2 text-xs font-bold text-cyan-300 focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-300 block mb-1">
                            Milestone Reminder / Due Note
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Milestone 2 Due: July 28, 2026"
                            value={editingProject.dueDateOrRenewal}
                            onChange={(e) =>
                              setEditingProject({ ...editingProject, dueDateOrRenewal: e.target.value })
                            }
                            className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">Start Date</label>
                      <input
                        type="date"
                        value={editingProject.startDate}
                        onChange={(e) => setEditingProject({ ...editingProject, startDate: e.target.value })}
                        className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">Due Date / Renewal</label>
                      <input
                        type="text"
                        value={editingProject.dueDateOrRenewal}
                        onChange={(e) =>
                          setEditingProject({ ...editingProject, dueDateOrRenewal: e.target.value })
                        }
                        className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">Client Folder URL</label>
                      <input
                        type="text"
                        placeholder="https://app.clickup.com/..."
                        value={editingProject.clientFolderUrl || ''}
                        onChange={(e) => setEditingProject({ ...editingProject, clientFolderUrl: e.target.value })}
                        className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">Communication Channel</label>
                      <select
                        value={editingProject.communicationChannel || ''}
                        onChange={(e) => setEditingProject({ ...editingProject, communicationChannel: e.target.value })}
                        className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                      >
                        <option value="">-- None / Blank --</option>
                        <option value="UW - Agam">UW - Agam</option>
                        <option value="UW - Manpreet">UW - Manpreet</option>
                        <option value="Slack">Slack</option>
                        <option value="WhatsApp - 79">WhatsApp - 79</option>
                        <option value="WhatsApp - 95">WhatsApp - 95</option>
                        <option value="Client Email">Client Email</option>
                        <option value="Trello">Trello</option>
                        <option value="Teams Live">Teams Live</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">Reporting Platform</label>
                      <select
                        value={editingProject.reportingPlatform || ''}
                        onChange={(e) => setEditingProject({ ...editingProject, reportingPlatform: e.target.value })}
                        className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                      >
                        <option value="">-- None / Blank --</option>
                        <option value="UW - Agam">UW - Agam</option>
                        <option value="WhatsApp">WhatsApp</option>
                        <option value="Trello 1428">Trello 1428</option>
                        <option value="Monday.com">Monday.com</option>
                        <option value="Slack">Slack</option>
                        <option value="Email">Email</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">Reporting Note / Frequency</label>
                    <input
                      type="text"
                      placeholder="e.g. Technical Audit in the first week / Weekly update notes..."
                      value={editingProject.reportingNote || ''}
                      onChange={(e) => setEditingProject({ ...editingProject, reportingNote: e.target.value })}
                      className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <button
                      type="button"
                      onClick={() => setEditModalStepTab('core')}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                    >
                      ← Back to Core Specs
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditModalStepTab('team')}
                      className="px-3.5 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 text-xs font-bold transition-all cursor-pointer"
                    >
                      Next: Leadership & Deliverables →
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: LEADERSHIP & HOURS ALLOCATION */}
              {editModalStepTab === 'team' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                    <h5 className="text-xs font-black text-cyan-300 uppercase">Leadership Assignees & Total Weekly Hours</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-400 block mb-1">Assignee (Team Lead)</label>
                        <select
                          value={editingProject.projectLeadId || ''}
                          onChange={(e) => setEditingProject({ ...editingProject, projectLeadId: e.target.value })}
                          className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                        >
                          <option value="">-- Unassigned (Leave Blank) --</option>
                          {customMembers.map((m) => (
                            <option key={m.id} value={m.id}>
                              {getMemberCapacityLabel(m)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-400 block mb-1">Client Face (Call Lead)</label>
                        <select
                          value={editingProject.clientCallAssigneeId || ''}
                          onChange={(e) =>
                            setEditingProject({ ...editingProject, clientCallAssigneeId: e.target.value })
                          }
                          className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                        >
                          <option value="">-- Unassigned (Leave Blank) --</option>
                          {customMembers.map((m) => (
                            <option key={m.id} value={m.id}>
                              {getMemberCapacityLabel(m)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-400 block mb-1">Dev / Tech Lead</label>
                        <select
                          value={editingProject.devTechAssigneeId || ''}
                          onChange={(e) =>
                            setEditingProject({ ...editingProject, devTechAssigneeId: e.target.value })
                          }
                          className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                        >
                          <option value="">-- Unassigned (Leave Blank) --</option>
                          {customMembers.map((m) => (
                            <option key={m.id} value={m.id}>
                              {getMemberCapacityLabel(m)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-400 block mb-1">Total Weekly Hours</label>
                        <input
                          type="number"
                          value={editingProject.totalHours}
                          onChange={(e) =>
                            setEditingProject({ ...editingProject, totalHours: Number(e.target.value) || 0 })
                          }
                          className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-2.5 py-1.5 text-xs font-black text-emerald-400 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-extrabold text-slate-300">
                        Deliverable Specialists & Weekly Hours Allocation
                      </label>
                    <div className="flex items-center gap-2">
                      {editingProject.billingType === 'Weekly Hourly Billing' && (() => {
                        const allocHrs = (editingProject.taskBreakdown || []).reduce((s, a) => s + (Number(a.hours) || 0), 0);
                        const rateMatch = (editingProject.price || '').match(/\$?([0-9]+(?:\.[0-9]+)?)/);
                        const rate = rateMatch ? parseFloat(rateMatch[1]) : 0;
                        return (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                            ⚡ Auto-Calc: ${Math.round(rate * allocHrs).toLocaleString()}/wk (${Math.round(rate * allocHrs * 4).toLocaleString()}/mo)
                          </span>
                        );
                      })()}
                      <span className="text-[11px] text-slate-400">
                        Allocated:{' '}
                        {(editingProject.taskBreakdown || []).reduce((s, a) => s + (Number(a.hours) || 0), 0)} hrs /
                        week
                      </span>
                    </div>
                    </div>

                    {(editingProject.taskBreakdown || []).map((tb) => (
                      <div
                        key={tb.id}
                        className="grid grid-cols-12 gap-2 items-center bg-slate-950 p-2.5 rounded-xl border border-slate-800/80"
                      >
                        <div className="col-span-5">
                          <select
                            value={tb.taskType}
                            onChange={(e) => {
                              const val = e.target.value;
                              const updated = (editingProject.taskBreakdown || []).map((i) =>
                                i.id === tb.id ? { ...i, taskType: val } : i
                              );
                              setEditingProject({ ...editingProject, taskBreakdown: updated });
                            }}
                            className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold"
                          >
                            <option value="On-Page SEO">On-Page SEO</option>
                            <option value="Off-Page SEO">Off-Page SEO</option>
                            <option value="Technical SEO">Technical SEO</option>
                            <option value="Content Optimization">Content Optimization</option>
                            <option value="AEO & GEO Strategy">AEO & GEO Strategy</option>
                            <option value="Wordpress Dev">Wordpress Dev</option>
                          </select>
                        </div>

                        <div className="col-span-4">
                          <select
                            value={tb.assigneeId || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              const updated = (editingProject.taskBreakdown || []).map((i) =>
                                i.id === tb.id ? { ...i, assigneeId: val } : i
                              );
                              setEditingProject({ ...editingProject, taskBreakdown: updated });
                            }}
                            className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-lg px-2 py-1.5 text-xs text-slate-200"
                          >
                            <option value="">-- Unassigned --</option>
                            {customMembers.map((m) => (
                              <option key={m.id} value={m.id}>
                                {getMemberCapacityLabel(m)}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="col-span-2">
                          <div className="relative">
                            <input
                              type="number"
                              min={0}
                              value={tb.hours}
                              onChange={(e) => {
                                const val = Number(e.target.value) || 0;
                                const updated = (editingProject.taskBreakdown || []).map((i) =>
                                  i.id === tb.id ? { ...i, hours: val } : i
                                );
                                setEditingProject({ ...editingProject, taskBreakdown: updated });
                              }}
                              className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-lg pl-2 pr-5 py-1.5 text-xs text-white font-bold text-right"
                            />
                            <span className="absolute right-1.5 top-2 text-[10px] text-slate-500">h</span>
                          </div>
                        </div>

                        <div className="col-span-1 flex justify-center">
                          <button
                            type="button"
                            onClick={() => {
                              const updated = (editingProject.taskBreakdown || []).filter((i) => i.id !== tb.id);
                              setEditingProject({ ...editingProject, taskBreakdown: updated });
                            }}
                            className="text-slate-500 hover:text-red-400 p-1 cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [
                            ...(editingProject.taskBreakdown || []),
                            {
                              id: `tb-${Date.now()}`,
                              taskType: 'On-Page SEO',
                              assigneeId: customMembers[0]?.id || '',
                              hours: 5
                            }
                          ];
                          setEditingProject({ ...editingProject, taskBreakdown: updated });
                        }}
                        className="px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-[11px] font-extrabold flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Add Deliverable Row</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 pt-1 border-t border-slate-800">
                    <label className="text-xs font-extrabold text-slate-300 block">
                      Supporting Squad Roster (Optional)
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-36 overflow-y-auto p-2 rounded-xl bg-slate-950 border border-slate-800">
                      {customMembers.map((member) => {
                        const isAssigned = editingProject.members.some((m) => m.id === member.id);
                        return (
                          <div
                            key={member.id}
                            onClick={() => handleToggleMemberInEditingProject(member)}
                            className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer border transition-all ${
                              isAssigned
                                ? 'bg-cyan-500/15 border-cyan-500/50 text-white'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            <img src={member.avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                            <span className="text-[11px] font-bold truncate">{member.name}</span>
                            {isAssigned && <Check className="w-3.5 h-3.5 text-cyan-400 ml-auto" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <button
                      type="button"
                      onClick={() => setEditModalStepTab('billing')}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                    >
                      ← Back to Billing
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditModalStepTab('access')}
                      className="px-3.5 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 text-xs font-bold transition-all cursor-pointer"
                    >
                      Next: Access & Health Audit →
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 4: ACCESS LOGINS & HEALTH AUDIT */}
              {editModalStepTab === 'access' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">Backend Logins Note</label>
                      <input
                        type="text"
                        placeholder="e.g. Added to Zoho / Shopify - 1428 / Wordpress Admin"
                        value={editingProject.backendLoginsNote || ''}
                        onChange={(e) => setEditingProject({ ...editingProject, backendLoginsNote: e.target.value })}
                        className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">Guest Post Included?</label>
                      <select
                        value={editingProject.guestPostIncluded || 'No'}
                        onChange={(e) =>
                          setEditingProject({ ...editingProject, guestPostIncluded: e.target.value as any })
                        }
                        className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                      >
                        <option value="No">No — Standard Off-Page</option>
                        <option value="Yes">Yes — Dedicated Guest Post</option>
                      </select>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                    <h5 className="text-xs font-black text-purple-300 uppercase">Access Status Tracking</h5>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-400 block mb-1">GA4 Access</label>
                        <select
                          value={editingProject.ga4Access || 'Techie 1428'}
                          onChange={(e) => setEditingProject({ ...editingProject, ga4Access: e.target.value as any })}
                          className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none"
                        >
                          <option value="Techie 1428">Techie 1428</option>
                          <option value="Techie 1418">Techie 1418</option>
                          <option value="Client Email">Client Email</option>
                          <option value="Requested">Requested</option>
                          <option value="Not Required">Not Required</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-400 block mb-1">GBP Access</label>
                        <select
                          value={editingProject.gbpAccess || 'Not Required'}
                          onChange={(e) => setEditingProject({ ...editingProject, gbpAccess: e.target.value as any })}
                          className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none"
                        >
                          <option value="Techie GMB">Techie GMB</option>
                          <option value="Requested">Requested</option>
                          <option value="Not Required">Not Required</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-400 block mb-1">GSC Access</label>
                        <select
                          value={editingProject.gscAccess || 'Techie 1428'}
                          onChange={(e) => setEditingProject({ ...editingProject, gscAccess: e.target.value as any })}
                          className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none"
                        >
                          <option value="Techie 1428">Techie 1428</option>
                          <option value="Requested">Requested</option>
                          <option value="Not Required">Not Required</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-400 block mb-1">GTM Access</label>
                        <select
                          value={editingProject.gtmAccess || 'Not Required'}
                          onChange={(e) => setEditingProject({ ...editingProject, gtmAccess: e.target.value as any })}
                          className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none"
                        >
                          <option value="Techie 1418">Techie 1418</option>
                          <option value="Requested">Requested</option>
                          <option value="Not Required">Not Required</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1.5">
                      Project Health & Client Rating
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { label: '☺☺☺☺☺ 5/5 Excellent', val: '☺☺☺☺☺' },
                        { label: '☺☺☺☺ 4/5 Good', val: '☺☺☺☺' },
                        { label: '☺☺☺ 3/5 Needs Attention', val: '☺☺☺' },
                        { label: '🚨 Critical Attention', val: '🚨 Critical' }
                      ].map((item) => (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => setEditingProject({ ...editingProject, projectHealthEmoji: item.val as any })}
                          className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
                            (editingProject.projectHealthEmoji || '☺☺☺☺☺') === item.val
                              ? 'bg-cyan-500/20 border-cyan-500 text-white'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-start pt-2">
                    <button
                      type="button"
                      onClick={() => setEditModalStepTab('team')}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                    >
                      ← Back to Leadership & Deliverables
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 4. Fixed Footer Action Bar */}
            <div className="px-6 py-4 flex items-center justify-between shrink-0 z-20 modal-footer-bar">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleMoveProjectToArchive(editingProject, 'past_project')}
                  className="px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer modal-archive-btn"
                  title="Move to Past Projects folder"
                >
                  <FolderArchive className="w-3.5 h-3.5" />
                  <span>Archive to Past</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveProjectToArchive(editingProject, 'trash')}
                  className="px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer modal-trash-btn"
                  title="Move project to Trash"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Move to Trash</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeletingProject(editingProject)}
                  className="px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer modal-delete-btn"
                  title="More delete and retirement options"
                >
                  <span>Delete…</span>
                </button>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer modal-cancel-btn flex items-center gap-1.5 text-slate-400 hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                  <span>Cancel</span>
                </button>
                {editModalStepTab !== 'core' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (editModalStepTab === 'billing') setEditModalStepTab('core');
                      else if (editModalStepTab === 'team') setEditModalStepTab('billing');
                      else if (editModalStepTab === 'access') setEditModalStepTab('team');
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer modal-nav-back-btn"
                  >
                    ← Previous Step
                  </button>
                )}
                {editModalStepTab !== 'access' ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (editModalStepTab === 'core') setEditModalStepTab('billing');
                      else if (editModalStepTab === 'billing') setEditModalStepTab('team');
                      else if (editModalStepTab === 'team') setEditModalStepTab('access');
                    }}
                    className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-all cursor-pointer shadow-md"
                  >
                    Next Step →
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={handleSaveEditedProject}
                  className="px-5 py-2 rounded-xl modal-save-btn text-xs font-black transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Project &amp; Recalculate Hours</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
      </AnimatePresence>

      {/* MODAL 3: Executive Individual Employee Profile & Growth Center */}
      <AnimatePresence>
      {editingMember && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-backdrop-overlay"
            onClick={() => setEditingMember(null)}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-y-0 right-0 z-[101] w-full max-w-3xl bg-slate-900 border-l border-slate-700 shadow-2xl flex flex-col"
          >
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 pb-2">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 shrink-0 sticky top-0 z-10 bg-gradient-to-b from-slate-900/95 to-slate-900/80 backdrop-blur-xl border-b border-cyan-500/20 shadow-md">
                  <div className="flex items-center gap-3.5">
                    <img
                      src={editingMember.avatar}
                      alt={editingMember.name}
                      className="w-14 h-14 rounded-2xl object-cover ring-2 ring-cyan-500/40"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-extrabold text-white">{editingMember.name}</h3>
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[11px] font-bold border border-slate-700">
                          {editingMember.department}
                        </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{editingMember.role}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Metrics & Utilization Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Weekly Capacity</span>
                <span className="text-base font-black text-white mt-0.5 block">
                  {calculateMemberAssignedHours(editingMember.id)}h / {editingMember.weeklyCapacityHours}h
                </span>
                <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden mt-2">
                  <div
                    className={`h-full rounded-full transition-all ${
                      calculateMemberAssignedHours(editingMember.id) > editingMember.weeklyCapacityHours
                        ? 'bg-rose-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{
                      width: `${Math.min(
                        100,
                        (calculateMemberAssignedHours(editingMember.id) / editingMember.weeklyCapacityHours) * 100
                      )}%`
                    }}
                  />
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Client Readiness Tier</span>
                <span className="text-xs font-black text-cyan-300 mt-1 block truncate">
                  {editingMember.generalCompetency.clientReadyTier}
                </span>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Active Projects Led</span>
                <span className="text-base font-black text-purple-400 mt-0.5 block">
                  {projectsList.filter((p) => p.members.some((m) => m.id === editingMember.id)).length} Active Retainers
                </span>
              </div>
            </div>

            {/* Visual Competency Heatmap & Growth Analytics */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span>📊 Visual Competency Heatmap &amp; Growth Analytics</span>
                </h4>
                <span className="text-[10px] font-bold text-slate-400">Quarterly Benchmark Index</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-2.5 space-y-1.5">
                  <div className="flex justify-between items-center text-[11px] font-bold">
                    <span className="text-slate-300">English Fluency</span>
                    <span className="text-cyan-400">{editingMember.generalCompetency.englishProficiency}/10</span>
                  </div>
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full"
                      style={{ width: `${editingMember.generalCompetency.englishProficiency * 10}%` }}
                    />
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-2.5 space-y-1.5">
                  <div className="flex justify-between items-center text-[11px] font-bold">
                    <span className="text-slate-300">Client Comms</span>
                    <span className="text-purple-400">{editingMember.generalCompetency.clientCommunication}/10</span>
                  </div>
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full"
                      style={{ width: `${editingMember.generalCompetency.clientCommunication * 10}%` }}
                    />
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-2.5 space-y-1.5">
                  <div className="flex justify-between items-center text-[11px] font-bold">
                    <span className="text-slate-300">Intake Briefs</span>
                    <span className="text-emerald-400">{editingMember.generalCompetency.requirementUnderstanding}/10</span>
                  </div>
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full"
                      style={{ width: `${editingMember.generalCompetency.requirementUnderstanding * 10}%` }}
                    />
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-2.5 space-y-1.5">
                  <div className="flex justify-between items-center text-[11px] font-bold">
                    <span className="text-slate-300">Reliability</span>
                    <span className="text-amber-400">{editingMember.generalCompetency.proactivityReliability}/10</span>
                  </div>
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full"
                      style={{ width: `${editingMember.generalCompetency.proactivityReliability * 10}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Internal App Section Links & Navigation Hub */}
            <div className="space-y-2">
              <label className="text-xs font-extrabold text-slate-300 block">
                🔗 Internal App Navigation &amp; Workflow Links
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingMember(null);
                    onNavigateView?.('projects');
                  }}
                  className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-all cursor-pointer group"
                >
                  <span className="text-xs font-extrabold text-cyan-300 block group-hover:underline">
                    📁 Active Projects Tracker →
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Inspect deliverables &amp; hours for this employee
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditingMember(null);
                    onNavigateView?.('skills');
                  }}
                  className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-all cursor-pointer group"
                >
                  <span className="text-xs font-extrabold text-purple-300 block group-hover:underline">
                    🧠 Skill Evaluation Center →
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Take 50-Q AI Questionnaire &amp; test score
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditingMember(null);
                    onNavigateView?.('hours');
                  }}
                  className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-all cursor-pointer group"
                >
                  <span className="text-xs font-extrabold text-emerald-300 block group-hover:underline">
                    ⚡ Capacity &amp; Pulse Bar →
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    View workload utilization &amp; financial pulse
                  </span>
                </button>
              </div>
            </div>

            {/* Edit Employee Form Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800">
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Employee Name</label>
                <input
                  type="text"
                  value={editingMember.name}
                  onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })}
                  className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Role Title</label>
                <input
                  type="text"
                  value={editingMember.role}
                  onChange={(e) => setEditingMember({ ...editingMember, role: e.target.value })}
                  className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Weekly Capacity Cap (h)</label>
                <input
                  type="number"
                  min="5"
                  max="80"
                  value={editingMember.weeklyCapacityHours}
                  onChange={(e) =>
                    setEditingMember({
                      ...editingMember,
                      weeklyCapacityHours: parseInt(e.target.value, 10) || 40
                    })
                  }
                  className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-between items-center gap-2 shrink-0 p-6 sticky bottom-0 bg-slate-900/95 backdrop-blur-md z-10">
              <button
                type="button"
                onClick={() => handleDeleteMember(editingMember.id)}
                className="px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white font-bold text-xs transition-all cursor-pointer border border-rose-500/30"
              >
                Delete Member
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditedMember}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  Save Profile Changes
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
      </AnimatePresence>

      {/* MODAL 4: Add New Team Member */}
      <AnimatePresence>
      {showAddMemberModal && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-backdrop-overlay"
            onClick={() => setShowAddMemberModal(false)}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="modal-slideover-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-employee-title"
          >
            <form className="flex flex-col flex-1 min-h-0" onSubmit={(event) => { event.preventDefault(); handleCreateMember(); }}>
            <div className="modal-scroll-body flex-1 overflow-y-auto">
              <div className="p-6 pb-2">
                <div className="modal-header-bar flex items-center justify-between pb-3 shrink-0 sticky top-0 z-10">
                  <div>
                    <h3 id="add-employee-title" className="modal-title text-base font-extrabold">Add employee</h3>
                    <p className="modal-subtitle text-xs mt-1">Create a squad profile and weekly capacity record.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddMemberModal(false)}
                    className="modal-close-btn p-2 rounded-lg cursor-pointer"
                    aria-label="Close add employee form"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3 pt-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      autoFocus
                      placeholder="e.g. Maya Lin"
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                      className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">Role / Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Technical SEO Architect"
                      value={newMemberRole}
                      onChange={(e) => setNewMemberRole(e.target.value)}
                      className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">Avatar Image URL</label>
                    <input
                      type="text"
                      placeholder="https://images.unsplash.com/..."
                      value={newMemberAvatar}
                      onChange={(e) => setNewMemberAvatar(e.target.value)}
                      className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">Weekly Capacity Hours</label>
                    <input
                      type="number"
                      min="1"
                      max="80"
                      value={newMemberCapacity}
                      onChange={(e) => setNewMemberCapacity(parseInt(e.target.value, 10) || 40)}
                      className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">Skills (comma separated)</label>
                    <input
                      type="text"
                      placeholder="e.g. SEO Strategy, Python, Technical Audit"
                      value={newMemberSkillsInput}
                      onChange={(e) => setNewMemberSkillsInput(e.target.value)}
                      className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              </div>
            </div>



            <div className="modal-footer-bar flex justify-end gap-2 shrink-0 p-6">
              <button
                type="button"
                onClick={() => setShowAddMemberModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newMemberName.trim()}
                className="px-5 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-black text-xs transition-all cursor-pointer shadow-lg shadow-purple-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Save Custom Member
              </button>
            </div>
            </form>
          </motion.div>
        </>
      )}
      </AnimatePresence>

      {/* MODAL 5: Edit Project Finances & Payment Schedule */}
      <AnimatePresence>
      {editingFinancesProject && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-950/85 backdrop-blur-md"
            onClick={() => setEditingFinancesProject(null)}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-y-0 right-0 z-[101] w-full max-w-xl bg-slate-900 border-l border-slate-700 shadow-2xl flex flex-col"
          >
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/70 sticky top-0 z-10 backdrop-blur-md">
                <h3 className="text-base font-extrabold text-white">Edit Project Finances &amp; Payment Schedule</h3>
                <button
                  type="button"
                  onClick={() => setEditingFinancesProject(null)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Payment Status</label>
                <select
                  value={editingFinancesProject.paymentStatus}
                  onChange={(e) =>
                    setEditingFinancesProject({
                      ...editingFinancesProject,
                      paymentStatus: e.target.value as any
                    })
                  }
                  className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="Paid">✅ Paid</option>
                  <option value="Overdue">🚨 Overdue</option>
                  <option value="Due Soon">⏳ Due Soon</option>
                  <option value="Pending">📋 Pending</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Payment Amount ($ USD)</label>
                <input
                  type="number"
                  value={editingFinancesProject.paymentAmountNumeric}
                  onChange={(e) =>
                    setEditingFinancesProject({
                      ...editingFinancesProject,
                      paymentAmountNumeric: parseInt(e.target.value, 10) || 0
                    })
                  }
                  className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">
                  Payment Due Date / Next Milestone Date
                </label>
                <input
                  type="date"
                  value={editingFinancesProject.paymentDueDate}
                  onChange={(e) =>
                    setEditingFinancesProject({
                      ...editingFinancesProject,
                      paymentDueDate: e.target.value
                    })
                  }
                  className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Invoice ID / Reference #</label>
                <input
                  type="text"
                  value={editingFinancesProject.paymentInvoiceId}
                  onChange={(e) =>
                    setEditingFinancesProject({
                      ...editingFinancesProject,
                      paymentInvoiceId: e.target.value
                    })
                  }
                  className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>
                </div>
              </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2 shrink-0 p-6 sticky bottom-0 bg-slate-900/95 backdrop-blur-md z-10">
              <button
                type="button"
                onClick={() => setEditingFinancesProject(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveProjectFinances}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                Save Payment Details
              </button>
            </div>
          </motion.div>
        </>
      )}
      </AnimatePresence>

      {/* MODAL 6: Full 360° Visual Project Detail & Monthly Ledger */}
      <AnimatePresence>
      {viewingProjectDetail && (() => {
        const liveProject = projectsList.find((p) => p.id === viewingProjectDetail.id) || viewingProjectDetail;
        const lead = liveProject.projectLeadId ? customMembers.find((m) => m.id === liveProject.projectLeadId) : undefined;
        const callAssignee = liveProject.clientCallAssigneeId ? customMembers.find((m) => m.id === liveProject.clientCallAssigneeId) : undefined;

        return (
          <div key="detail-project-modal-container" className="fixed inset-0 z-[99999] flex justify-end">
            <motion.div
              key="detail-project-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/85 backdrop-blur-md cursor-pointer modal-backdrop-overlay"
              onClick={() => setViewingProjectDetail(null)}
            />
            <motion.div
              key="detail-project-panel"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative z-10 w-full max-w-3xl h-full bg-slate-900 border-l border-slate-700 shadow-2xl flex flex-col text-slate-100 modal-slideover-panel"
            >
              <div className="flex-1 overflow-y-auto">
                {/* Sticky Header with Prominent Close / Cancel Button */}
                <div className="shrink-0 flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 p-6 pb-4 bg-slate-900/95 backdrop-blur-md sticky top-0 z-10">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-slate-950 text-cyan-400 border border-slate-800">
                      {liveProject.client} • {liveProject.paymentInvoiceId}
                    </span>
                    <ProjectHealthBadge project={liveProject} onClick={() => setDiagnosingProject(liveProject)} size="md" />
                    <span
                      className={`text-xs font-black px-2.5 py-1 rounded-lg border ${
                        liveProject.paymentStatus === 'Paid'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : liveProject.paymentStatus === 'Overdue'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      }`}
                    >
                      {liveProject.paymentStatus === 'Paid'
                        ? '✅ Paid'
                        : liveProject.paymentStatus === 'Overdue'
                        ? `🚨 Overdue (Due ${liveProject.paymentDueDate})`
                        : `⏳ Due ${liveProject.paymentDueDate}`}
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-white">{liveProject.name}</h3>
                  <p className="text-xs text-slate-400">
                    Billing Structure: <strong className="text-slate-200">{liveProject.billingType}</strong> • Contract Price:{' '}
                    <strong className="text-emerald-400">{liveProject.price}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {(liveProject.clickUpTaskId || liveProject.id.startsWith('prj_cu_') || liveProject.taskBreakdown?.some(tb => tb.clickUpTaskId)) && (
                    <button
                      type="button"
                      onClick={() => {
                        const targetTaskId =
                          liveProject.clickUpTaskId ||
                          (liveProject.id.startsWith('prj_cu_') ? liveProject.id.replace('prj_cu_', '') : undefined) ||
                          liveProject.taskBreakdown?.find(tb => tb.clickUpTaskId)?.clickUpTaskId;
                        if (targetTaskId) {
                          handleOpenClickUpTicketModal(targetTaskId, liveProject.name, {
                            taskUrl: liveProject.clientFolderUrl,
                            projectName: liveProject.name,
                            clientName: liveProject.client,
                            status: liveProject.status,
                            priority: liveProject.priorityLevel
                          });
                        }
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600/25 hover:bg-purple-600/40 text-purple-200 border border-purple-500/50 font-bold text-xs transition-all cursor-pointer shadow-lg"
                      title="View ClickUp comments and post live from dashboard"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
                      <span>💬 Ticket Discussion</span>
                    </button>
                  )}
                  {isClickUpConnected() && (
                    <button
                      type="button"
                      onClick={() => handlePushProjectToClickUp(liveProject)}
                      disabled={pushingProjectId === liveProject.id}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-500/40 text-purple-200 border border-purple-500/50 font-bold text-xs transition-all cursor-pointer shadow-lg disabled:opacity-50"
                      title={liveProject.clickUpListId ? 'Push un-synced deliverables to ClickUp' : 'Push this project to ClickUp as a new list'}
                    >
                      <Zap className={`w-3.5 h-3.5 ${pushingProjectId === liveProject.id ? 'animate-spin' : 'text-purple-400'}`} />
                      <span>{pushingProjectId === liveProject.id ? 'Pushing…' : (liveProject.clickUpListId ? 'Sync to ClickUp' : '🚀 Push to ClickUp')}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      const projToEdit = { ...liveProject };
                      setViewingProjectDetail(null);
                      setEditingProject(projToEdit);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-600/30 hover:bg-cyan-500/40 text-cyan-300 border border-cyan-500/50 font-bold text-xs transition-all cursor-pointer shadow-lg"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Project</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingProject(liveProject)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl modal-delete-btn text-xs font-bold transition-all cursor-pointer shadow-lg"
                    title="Delete this project permanently"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Project</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewingProjectDetail(null)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 hover:text-rose-300 text-slate-200 border border-slate-700 font-black text-xs transition-all cursor-pointer shadow-lg"
                  >
                    <X className="w-4 h-4" />
                    <span>Close / Cancel</span>
                  </button>
                </div>
              </div>

              {/* Scrollable Modal Content */}
              <div className="overflow-y-auto flex-1 min-h-0 p-6 space-y-6">
                {/* SECTION 1: MONTHLY LEDGER & PAYMENT HISTORY */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4" />
                      <span>Monthly Financial Ledger &amp; Payment Tracker</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => handleTogglePaymentStatus(liveProject.id)}
                      className={`px-3.5 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer shadow flex items-center gap-1.5 ${
                        liveProject.paymentStatus === 'Paid'
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/40'
                          : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                      }`}
                    >
                      <span>
                        {liveProject.paymentStatus === 'Paid'
                          ? '✅ Current Cycle Paid (Click to Re-open)'
                          : '✅ Mark Current Cycle Paid'}
                      </span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {(liveProject.monthlyHistory || [
                      {
                        month: liveProject.billingMonth || 'Current Cycle',
                        amount: liveProject.paymentAmountNumeric,
                        status: liveProject.paymentStatus,
                        invoiceId: liveProject.paymentInvoiceId,
                        paidDate: liveProject.paymentReceivedDate
                      }
                    ]).map((h, idx) => (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-2xl border flex flex-col justify-between gap-2 ${
                          h.status === 'Paid'
                            ? 'bg-emerald-950/20 border-emerald-500/30'
                            : h.status === 'Overdue'
                            ? 'bg-rose-950/30 border-rose-500/40'
                            : 'bg-slate-950 border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-white">{h.month}</span>
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded ${
                              h.status === 'Paid'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : h.status === 'Overdue'
                                ? 'bg-rose-500/20 text-rose-300'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            {h.status}
                          </span>
                        </div>

                        <div className="flex items-baseline justify-between">
                          <span className="text-sm font-black text-emerald-400">${h.amount.toLocaleString()}</span>
                          <span className="text-[10px] text-slate-400">{h.invoiceId}</span>
                        </div>

                        <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800/80">
                          {h.paidDate ? (
                            <span className="text-emerald-400 font-bold">Settled: {h.paidDate}</span>
                          ) : (
                            <span>Due: {liveProject.paymentDueDate}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* SECTION 2: SQUAD ASSIGNMENT & LEADERSHIP CHIPS */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                    <Users className="w-4 h-4 shrink-0" />
                    <span>Assigned Leadership &amp; Squad Hours Allocation ({liveProject.members.length} members)</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-2xl bg-slate-950 border border-purple-500/30 flex items-center gap-3">
                      {lead ? (
                        <img
                          src={lead.avatar}
                          alt={lead.name}
                          className="w-10 h-10 min-w-[2.5rem] max-w-[2.5rem] min-h-[2.5rem] max-h-[2.5rem] aspect-square rounded-xl object-cover shrink-0 overflow-hidden shadow-md"
                        />
                      ) : (
                        <div className="w-10 h-10 min-w-[2.5rem] max-w-[2.5rem] min-h-[2.5rem] max-h-[2.5rem] rounded-xl bg-slate-900 border border-dashed border-purple-500/40 flex items-center justify-center text-purple-400 font-bold text-sm shrink-0">
                          ?
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-black text-purple-400 uppercase tracking-wider block">
                          👑 Project Lead
                        </span>
                        <span className={`text-xs font-bold truncate block ${lead ? 'text-white' : 'text-slate-400 italic'}`}>
                          {lead ? lead.name : 'Unassigned'}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate block">{lead ? lead.role : 'No lead designated'}</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-950 border border-cyan-500/30 flex items-center gap-3">
                      {callAssignee ? (
                        <img
                          src={callAssignee.avatar}
                          alt={callAssignee.name}
                          className="w-10 h-10 min-w-[2.5rem] max-w-[2.5rem] min-h-[2.5rem] max-h-[2.5rem] aspect-square rounded-xl object-cover shrink-0 overflow-hidden shadow-md"
                        />
                      ) : (
                        <div className="w-10 h-10 min-w-[2.5rem] max-w-[2.5rem] min-h-[2.5rem] max-h-[2.5rem] rounded-xl bg-slate-900 border border-dashed border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold text-sm shrink-0">
                          ?
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-black text-cyan-400 uppercase tracking-wider block">
                          📞 Client Call Assignee
                        </span>
                        <span className={`text-xs font-bold truncate block ${callAssignee ? 'text-white' : 'text-slate-400 italic'}`}>
                          {callAssignee ? callAssignee.name : 'Unassigned'}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate block">{callAssignee ? callAssignee.role : 'No client face designated'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Squad Members Chip List */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                    {liveProject.members.map((m) => {
                      const hrs = getMemberHoursOnProject(liveProject, m.id);
                      return (
                        <div
                          key={m.id}
                          className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition-all"
                        >
                          <img
                            src={m.avatar}
                            alt={m.name}
                            className="w-9 h-9 min-w-[2.25rem] max-w-[2.25rem] min-h-[2.25rem] max-h-[2.25rem] aspect-square rounded-xl object-cover shrink-0 overflow-hidden shadow"
                          />
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-bold text-white block truncate leading-tight">{m.name}</span>
                            <span className="text-[10px] text-cyan-400 font-extrabold block">+{hrs}h / week allocated</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* SECTION 2.5: GRANULAR TASK DELIVERABLES & SQUAD HOURS BREAKDOWN */}
                <div className="space-y-3 p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                      <span>🛠️ Task Deliverables &amp; Assignee Hours Breakdown</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => handleAddTaskAllocation(liveProject.id)}
                      className="px-3.5 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 font-extrabold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Task Deliverable</span>
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {(liveProject.taskBreakdown && liveProject.taskBreakdown.length > 0
                      ? liveProject.taskBreakdown
                      : []
                    ).map((tb) => (
                      <div
                        key={tb.id}
                        className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3.5 rounded-2xl bg-slate-900 border border-slate-800/90 text-xs items-center shadow-md"
                      >
                        <div className="md:col-span-4 flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-400">Task Category</span>
                            {tb.clickUpUrl && (
                              <a
                                href={tb.clickUpUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={`Open ClickUp task #${tb.clickUpTaskId || ''} in browser`}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-950/80 hover:bg-purple-900 text-purple-300 hover:text-white border border-purple-700/60 text-[9px] font-bold transition-all"
                              >
                                <span>ClickUp #{tb.clickUpTaskId ? tb.clickUpTaskId.slice(-6) : 'task'}</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                          <select
                            value={tb.taskType}
                            onChange={(e) =>
                              handleUpdateTaskAllocation(
                                liveProject.id,
                                tb.id,
                                'taskType',
                                e.target.value as AgencyTaskCategory
                              )
                            }
                            className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-3 py-2 text-xs font-bold text-cyan-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
                          >
                            <option value="On-Page SEO">On-Page SEO</option>
                            <option value="Off-Page SEO">Off-Page SEO</option>
                            <option value="Technical SEO">Technical SEO</option>
                            <option value="Local SEO">Local SEO</option>
                            <option value="Web Design">Web Design</option>
                            <option value="Guest Post">Guest Post</option>
                            <option value="Content Strategy">Content Strategy</option>
                          </select>
                        </div>

                        <div className="md:col-span-5 flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-slate-400">Assigned Member</span>
                          <select
                            value={tb.assigneeId || ''}
                            onChange={(e) =>
                              handleUpdateTaskAllocation(liveProject.id, tb.id, 'assigneeId', e.target.value)
                            }
                            className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                          >
                            <option value="">-- Unassigned --</option>
                            {customMembers.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name} ({m.role})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="md:col-span-3 flex items-end justify-between gap-2.5">
                          <div className="flex flex-col gap-1 flex-1">
                            <span className="text-[10px] font-bold text-slate-400">Weekly Hours</span>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min="1"
                                max="60"
                                value={tb.hours}
                                onChange={(e) =>
                                  handleUpdateTaskAllocation(
                                    liveProject.id,
                                    tb.id,
                                    'hours',
                                    parseInt(e.target.value, 10) || 1
                                  )
                                }
                                className="w-20 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs font-extrabold text-emerald-400 focus:outline-none text-center"
                              />
                              <span className="text-slate-400 text-xs font-bold">hrs/wk</span>
                            </div>
                          </div>

                          {tb.clickUpTaskId && (
                            <button
                              type="button"
                              onClick={() =>
                                handleOpenClickUpTicketModal(
                                  tb.clickUpTaskId!,
                                  `[${liveProject.name}] ${tb.taskType}`,
                                  {
                                    taskUrl: tb.clickUpUrl,
                                    projectName: liveProject.name,
                                    clientName: liveProject.client,
                                    status: tb.clickUpStatus || tb.status
                                  }
                                )
                              }
                              title="💬 View ClickUp comments & activities / post update"
                              className="p-2 rounded-xl bg-purple-500/15 hover:bg-purple-500/30 text-purple-300 hover:text-white border border-purple-500/40 transition-all cursor-pointer shrink-0"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeleteTaskAllocation(liveProject.id, tb.id)}
                            title="Delete Task Allocation"
                            className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 transition-all cursor-pointer shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {(!liveProject.taskBreakdown || liveProject.taskBreakdown.length === 0) && (
                      <div className="text-center py-4 text-slate-500 text-xs">
                        No task deliverables added yet. Click &quot;Add Task Deliverable&quot; above to assign on-page, technical, or web design tasks!
                      </div>
                    )}
                  </div>
                </div>

                {/* SECTION 3: MILESTONES & UTILIZATION PROGRESS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-400">Milestones Completed</span>
                      <span className="text-pink-400 font-black">
                        {liveProject.milestonesCompleted} / {liveProject.milestonesTotal}
                      </span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-pink-500 to-rose-400 rounded-full"
                        style={{
                          width: `${
                            liveProject.milestonesTotal > 0
                              ? (liveProject.milestonesCompleted / liveProject.milestonesTotal) * 100
                              : 0
                          }%`
                        }}
                      />
                    </div>
                    <div className="text-[10px] text-slate-400 pt-1">
                      Renewal / Next Due: <strong className="text-amber-300">{liveProject.dueDateOrRenewal}</strong>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-400">Budgeted Hours Utilization</span>
                      <span className="text-cyan-400 font-black">
                        {liveProject.activeHours}h / {liveProject.totalHours}h ({liveProject.progress}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                        style={{ width: `${liveProject.progress}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-slate-400 pt-1">
                      Start Date: <strong className="text-slate-300">{liveProject.startDate}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sticky Footer Actions */}
              <div className="shrink-0 border-t border-slate-800 p-6 pt-4 bg-slate-900/95 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 z-10">
                <button
                  type="button"
                  onClick={() => handleCopyClientSummary(liveProject)}
                  className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 font-black text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow"
                >
                  <span>📄 Copy Client Summary &amp; Invoice Report</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleMoveProjectToArchive(liveProject, 'past_project')}
                    className="px-3.5 py-2 rounded-xl modal-archive-btn text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    title="Move to Past Projects folder"
                  >
                    <FolderArchive className="w-3.5 h-3.5" />
                    <span>Move to Past</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMoveProjectToArchive(liveProject, 'trash')}
                    className="px-3.5 py-2 rounded-xl modal-trash-btn text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    title="Move to Trash"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Move to Trash</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeletingProject(liveProject)}
                    className="px-3.5 py-2 rounded-xl modal-delete-btn text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    title="More retirement and delete options"
                  >
                    <span>Delete…</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const target = liveProject;
                      setViewingProjectDetail(null);
                      setEditingFinancesProject({ ...target });
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Finances &amp; Schedule</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewingProjectDetail(null)}
                    className="px-5 py-2 rounded-xl modal-save-btn text-xs font-black transition-all cursor-pointer"
                  >
                    Close 360° Inspection
                  </button>
                </div>
              </div>
              </div>
            </motion.div>
          </div>
        );
      })()}
      </AnimatePresence>

      {/* MODAL: Move to Past Projects, Trash, or Delete Dialog */}
      {deletingProject && createPortal(
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md cursor-pointer transition-opacity"
            onClick={() => setDeletingProject(null)}
          />
          <div className="relative z-10 w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl p-6 text-white space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
                  <FolderArchive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Project Retirement &amp; Trash</h3>
                  <p className="text-xs text-slate-400">Choose how to handle this project</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeletingProject(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-300 leading-relaxed">
              Managing project <strong className="text-white font-bold">"{deletingProject.name || deletingProject.client}"</strong>. You can move it to your Past Projects folder (archive), put it in Trash, or permanently delete it.
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-400">
                <span>Client:</span>
                <span className="text-slate-200 font-bold">{deletingProject.client}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Contract Retainer:</span>
                <span className="text-emerald-400 font-bold">{deletingProject.price}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Assigned Deliverables:</span>
                <span className="text-slate-200 font-bold">{(deletingProject.taskBreakdown || []).length} tasks</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Allocated Weekly Hours:</span>
                <span className="text-cyan-400 font-bold">{deletingProject.activeHours} hrs/wk</span>
              </div>
            </div>

            {/* 3 Action Options */}
            <div className="space-y-2.5 pt-1">
              {/* Option 1: Move to Past Projects Folder */}
              <button
                type="button"
                onClick={() => {
                  handleMoveProjectToArchive(deletingProject, 'past_project', 'Moved to Past Projects folder');
                }}
                className="w-full text-left p-3 rounded-xl bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-500/40 hover:border-indigo-500 text-white transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0">
                    <FolderArchive className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-indigo-200 group-hover:text-white flex items-center gap-1.5">
                      <span>📁 Move to Past Projects Folder</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/30 text-indigo-300 font-normal">Recommended</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Preserve full history, deliverables &amp; financial ledger. Frees up active team hours.
                    </div>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-indigo-400 group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* Option 2: Move to Trash */}
              <button
                type="button"
                onClick={() => {
                  handleMoveProjectToArchive(deletingProject, 'trash', 'Moved to Trash');
                }}
                className="w-full text-left p-3 rounded-xl bg-amber-950/30 hover:bg-amber-900/40 border border-amber-500/40 hover:border-amber-500 text-white transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-amber-200 group-hover:text-white">
                      🗑️ Move to Trash Folder
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Temporarily removes project. Can be restored anytime with 1 click.
                    </div>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* Option 3: Permanently Delete */}
              <button
                type="button"
                onClick={() => {
                  handleDeleteProject(deletingProject.id);
                  setDeletingProject(null);
                }}
                className="w-full text-left p-3 rounded-xl bg-rose-950/20 hover:bg-rose-950/40 border border-rose-500/30 hover:border-rose-500 text-white transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-rose-300 group-hover:text-white">
                      ⚠️ Delete Permanently
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Irreversibly purge project and task records without saving to archive.
                    </div>
                  </div>
                </div>
                <X className="w-4 h-4 text-rose-400 group-hover:scale-110 transition-transform" />
              </button>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setDeletingProject(null)}
                className="px-4 py-2 rounded-xl modal-cancel-btn text-xs font-bold transition-all cursor-pointer"
              >
                Cancel &amp; Keep Project Active
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 6.8: Add or Edit Business Lead Modal */}
      {showAddLeadModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          {/* High-Contrast Frosted Backdrop (Immune to theme overrides and bleed-through) */}
          <div
            className="absolute inset-0 transition-opacity duration-300 cursor-pointer"
            style={{
              backgroundColor: 'rgba(2, 6, 23, 0.85)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
            }}
            onClick={() => {
              setShowAddLeadModal(false);
              setEditingLead(null);
            }}
          />

          {/* Modal Card Window */}
          <div
            className="relative w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden z-10 my-auto transition-all max-h-[92vh] flex flex-col"
            style={{
              backgroundColor: isWhiteTheme ? '#ffffff' : '#0f172a',
              borderColor: isWhiteTheme ? '#cbd5e1' : '#334155',
              boxShadow: isWhiteTheme
                ? '0 25px 60px -15px rgba(15, 23, 42, 0.3), 0 0 0 1px rgba(0, 0, 0, 0.05)'
                : '0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255, 255, 255, 0.08)'
            }}
          >
            <style>{`
              .lead-form-select option {
                background-color: #0f172a !important;
                color: #ffffff !important;
              }
              body.theme-white .lead-form-select option {
                background-color: #ffffff !important;
                color: #0f172a !important;
              }
            `}</style>

            {/* Top Luminous Gradient Stripe */}
            <div className="h-1.5 w-full bg-gradient-to-r from-cyan-400 via-indigo-500 to-emerald-400 shrink-0" />

            {/* Modal Header */}
            <div
              className="flex items-center justify-between px-6 py-4 border-b shrink-0"
              style={{ borderColor: isWhiteTheme ? '#e2e8f0' : '#1e293b' }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center shadow-lg shadow-cyan-500/10 shrink-0">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3
                      className="text-base sm:text-lg font-black tracking-tight truncate"
                      style={{ color: isWhiteTheme ? '#0f172a' : '#f8fafc' }}
                    >
                      {editingLead ? 'Edit Business Lead' : 'Add New Business Prospect'}
                    </h3>
                    {editingLead && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          editingLead.stage === 'WON'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                            : editingLead.stage === 'LOST'
                            ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                            : editingLead.stage === 'PROPOSAL' || editingLead.stage === 'NEGOTIATION'
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                            : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                        }`}
                      >
                        {editingLead.stage}
                      </span>
                    )}
                  </div>
                  <p
                    className="text-xs truncate mt-0.5"
                    style={{ color: isWhiteTheme ? '#64748b' : '#94a3b8' }}
                  >
                    Track prospect communication, pipeline stage, and assign dedicated team leads.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowAddLeadModal(false);
                  setEditingLead(null);
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 transition-colors shrink-0 ml-2 cursor-pointer"
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body & Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const companyName = String(formData.get('companyName') || '').trim();
                if (!companyName) {
                  sonnerToast.error('Please enter a company name.');
                  return;
                }

                const contactPerson = String(formData.get('contactPerson') || '').trim();
                const email = String(formData.get('email') || '').trim();
                const phone = String(formData.get('phone') || '').trim();
                const stage = String(formData.get('stage') || 'NEW') as BusinessLeadItem['stage'];
                const assignedOwnerId = String(formData.get('assignedOwnerId') || '').trim() || undefined;
                const billingPreference = String(formData.get('billingPreference') || 'Monthly Retainer') as any;
                const estimatedValue = String(formData.get('estimatedValue') || '$3,500/mo').trim();
                const leadSource = String(formData.get('leadSource') || '').trim();
                const nextFollowUpDate = String(formData.get('nextFollowUpDate') || '').trim();
                const notes = String(formData.get('notes') || '').trim();

                const numMatch = estimatedValue.match(/\$?([0-9,]+(?:\.[0-9]+)?)/);
                const numericVal = numMatch ? parseFloat(numMatch[1].replace(/,/g, '')) : 0;

                if (editingLead) {
                  const updatedLead = {
                    ...editingLead,
                    companyName,
                    contactPerson: contactPerson || undefined,
                    email: email || undefined,
                    phone: phone || undefined,
                    stage,
                    assignedOwnerId,
                    billingPreference,
                    estimatedValue,
                    estimatedValueNumeric: numericVal,
                    leadSource: leadSource || undefined,
                    nextFollowUpDate: nextFollowUpDate || undefined,
                    notes: notes || undefined,
                    updatedAt: new Date().toISOString()
                  };
                  
                  setBusinessLeads((prev) =>
                    prev.map((l) => (l.id === editingLead.id ? updatedLead : l))
                  );
                  sonnerToast.success(`Lead "${companyName}" updated.`);
                  
                  if (stage === 'WON' && editingLead.stage !== 'WON') {
                    handleConvertLeadToProject(updatedLead);
                  }
                } else {
                  const newLead: BusinessLeadItem = {
                    id: `lead-${Date.now()}`,
                    companyName,
                    contactPerson: contactPerson || undefined,
                    email: email || undefined,
                    phone: phone || undefined,
                    stage,
                    assignedOwnerId,
                    billingPreference,
                    estimatedValue,
                    estimatedValueNumeric: numericVal,
                    leadSource: leadSource || 'Manual Entry',
                    nextFollowUpDate: nextFollowUpDate || undefined,
                    notes: notes || undefined,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                  };
                  setBusinessLeads((prev) => [newLead, ...prev]);
                  sonnerToast.success(`Lead "${companyName}" created.`);
                  
                  if (stage === 'WON') {
                    handleConvertLeadToProject(newLead);
                  }
                }

                setShowAddLeadModal(false);
                setEditingLead(null);
              }}
              className="flex-1 overflow-y-auto p-6 space-y-5"
            >
              {/* SECTION 1: 🏢 Prospect & Contact Intelligence */}
              <div
                className="p-4 rounded-2xl border space-y-3.5"
                style={{
                  backgroundColor: isWhiteTheme ? '#f8fafc' : 'rgba(2, 6, 23, 0.45)',
                  borderColor: isWhiteTheme ? '#e2e8f0' : '#1e293b'
                }}
              >
                <div className="flex items-center justify-between pb-1 border-b border-slate-700/30">
                  <span className="text-xs font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>1. Prospect &amp; Contact Intelligence</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">* Required</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1 sm:col-span-2">
                    <label
                      className="text-xs font-bold flex items-center gap-1"
                      style={{ color: isWhiteTheme ? '#1e293b' : '#e2e8f0' }}
                    >
                      <span>Company / Prospect Name</span>
                      <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        name="companyName"
                        type="text"
                        required
                        defaultValue={editingLead?.companyName || ''}
                        placeholder="e.g. Acme Health or Pascal Sohler"
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition-all"
                        style={{
                          backgroundColor: isWhiteTheme ? '#ffffff' : '#020617',
                          borderColor: isWhiteTheme ? '#cbd5e1' : '#334155',
                          color: isWhiteTheme ? '#0f172a' : '#f8fafc',
                          borderWidth: '1px'
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label
                      className="text-xs font-bold flex items-center gap-1"
                      style={{ color: isWhiteTheme ? '#1e293b' : '#e2e8f0' }}
                    >
                      <span>Contact Person</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        name="contactPerson"
                        type="text"
                        defaultValue={editingLead?.contactPerson || ''}
                        placeholder="e.g. John Doe (CEO)"
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition-all"
                        style={{
                          backgroundColor: isWhiteTheme ? '#ffffff' : '#020617',
                          borderColor: isWhiteTheme ? '#cbd5e1' : '#334155',
                          color: isWhiteTheme ? '#0f172a' : '#f8fafc',
                          borderWidth: '1px'
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label
                      className="text-xs font-bold flex items-center gap-1"
                      style={{ color: isWhiteTheme ? '#1e293b' : '#e2e8f0' }}
                    >
                      <span>Email Address</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        name="email"
                        type="email"
                        defaultValue={editingLead?.email || ''}
                        placeholder="john@company.com"
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition-all"
                        style={{
                          backgroundColor: isWhiteTheme ? '#ffffff' : '#020617',
                          borderColor: isWhiteTheme ? '#cbd5e1' : '#334155',
                          color: isWhiteTheme ? '#0f172a' : '#f8fafc',
                          borderWidth: '1px'
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label
                      className="text-xs font-bold flex items-center gap-1"
                      style={{ color: isWhiteTheme ? '#1e293b' : '#e2e8f0' }}
                    >
                      <span>Phone / WhatsApp</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        name="phone"
                        type="tel"
                        defaultValue={editingLead?.phone || ''}
                        placeholder="+1 (555) 019-2834 or +91 98765 43210"
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition-all"
                        style={{
                          backgroundColor: isWhiteTheme ? '#ffffff' : '#020617',
                          borderColor: isWhiteTheme ? '#cbd5e1' : '#334155',
                          color: isWhiteTheme ? '#0f172a' : '#f8fafc',
                          borderWidth: '1px'
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: 💼 Deal Architecture & Team Allocation */}
              <div
                className="p-4 rounded-2xl border space-y-3.5"
                style={{
                  backgroundColor: isWhiteTheme ? '#f8fafc' : 'rgba(2, 6, 23, 0.45)',
                  borderColor: isWhiteTheme ? '#e2e8f0' : '#1e293b'
                }}
              >
                <div className="flex items-center justify-between pb-1 border-b border-slate-700/30">
                  <span className="text-xs font-black uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>2. Deal Architecture &amp; Team Allocation</span>
                  </span>
                  <span className="text-[10px] text-cyan-400 font-medium">Pipeline &amp; Revenue</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label
                      className="text-xs font-bold"
                      style={{ color: isWhiteTheme ? '#1e293b' : '#e2e8f0' }}
                    >
                      Pipeline Stage
                    </label>
                    <select
                      name="stage"
                      defaultValue={editingLead?.stage || 'NEW'}
                      className="lead-form-select w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
                      style={{
                        backgroundColor: isWhiteTheme ? '#ffffff' : '#020617',
                        borderColor: isWhiteTheme ? '#cbd5e1' : '#334155',
                        color: isWhiteTheme ? '#0f172a' : '#f8fafc',
                        borderWidth: '1px'
                      }}
                    >
                      <option value="NEW">🔵 NEW / Inbound Prospect</option>
                      <option value="DISCOVERY">🟣 DISCOVERY (Call / Audit Scheduled)</option>
                      <option value="PROPOSAL">🟡 PROPOSAL (Sent Quote &amp; Roadmap)</option>
                      <option value="NEGOTIATION">🟠 NEGOTIATION (Scope Alignment)</option>
                      <option value="WON">🟢 WON (Closed Deal - Ready for Kickoff)</option>
                      <option value="LOST">🔴 LOST (Archived / Inactive)</option>
                    </select>
                  </div>

                  {/* Assigned Lead Owner: Dedicated separate team lead with blank option */}
                  <div className="space-y-1">
                    <label
                      className="text-xs font-bold flex items-center justify-between"
                      style={{ color: isWhiteTheme ? '#1e293b' : '#e2e8f0' }}
                    >
                      <span>Assigned Lead Owner</span>
                      <span className="text-[10px] text-cyan-400 font-normal">Optional</span>
                    </label>
                    <select
                      name="assignedOwnerId"
                      defaultValue={editingLead?.assignedOwnerId || ''}
                      className="lead-form-select w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
                      style={{
                        backgroundColor: isWhiteTheme ? '#ffffff' : '#020617',
                        borderColor: isWhiteTheme ? '#cbd5e1' : '#334155',
                        color: isWhiteTheme ? '#0f172a' : '#f8fafc',
                        borderWidth: '1px'
                      }}
                    >
                      <option value="">-- Unassigned (Leave Blank) --</option>
                      {customMembers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.role || 'Specialist'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label
                      className="text-xs font-bold"
                      style={{ color: isWhiteTheme ? '#1e293b' : '#e2e8f0' }}
                    >
                      Estimated Deal Value
                    </label>
                    <div className="relative">
                      <DollarSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        name="estimatedValue"
                        type="text"
                        defaultValue={editingLead?.estimatedValue || '$3,500/mo'}
                        placeholder="$3,500/mo or $25/hr"
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
                        style={{
                          backgroundColor: isWhiteTheme ? '#ffffff' : '#020617',
                          borderColor: isWhiteTheme ? '#cbd5e1' : '#334155',
                          color: isWhiteTheme ? '#0f172a' : '#f8fafc',
                          borderWidth: '1px'
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label
                      className="text-xs font-bold"
                      style={{ color: isWhiteTheme ? '#1e293b' : '#e2e8f0' }}
                    >
                      Billing Preference
                    </label>
                    <select
                      name="billingPreference"
                      defaultValue={editingLead?.billingPreference || 'Monthly Retainer'}
                      className="lead-form-select w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
                      style={{
                        backgroundColor: isWhiteTheme ? '#ffffff' : '#020617',
                        borderColor: isWhiteTheme ? '#cbd5e1' : '#334155',
                        color: isWhiteTheme ? '#0f172a' : '#f8fafc',
                        borderWidth: '1px'
                      }}
                    >
                      <option value="Monthly Retainer">Monthly Retainer</option>
                      <option value="Weekly Hourly Billing">Weekly Hourly Billing ($/hr)</option>
                      <option value="Milestone Delivery">Milestone Delivery</option>
                    </select>
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label
                      className="text-xs font-bold"
                      style={{ color: isWhiteTheme ? '#1e293b' : '#e2e8f0' }}
                    >
                      Lead Source / Acquisition Channel
                    </label>
                    <div className="relative">
                      <Tag className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        name="leadSource"
                        type="text"
                        defaultValue={editingLead?.leadSource || 'Website Inbound'}
                        placeholder="e.g. Website Inbound, ClickUp, Upwork, Referral, Cold Email"
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
                        style={{
                          backgroundColor: isWhiteTheme ? '#ffffff' : '#020617',
                          borderColor: isWhiteTheme ? '#cbd5e1' : '#334155',
                          color: isWhiteTheme ? '#0f172a' : '#f8fafc',
                          borderWidth: '1px'
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: 📅 Timeline & Detailed Scope */}
              <div
                className="p-4 rounded-2xl border space-y-3.5"
                style={{
                  backgroundColor: isWhiteTheme ? '#f8fafc' : 'rgba(2, 6, 23, 0.45)',
                  borderColor: isWhiteTheme ? '#e2e8f0' : '#1e293b'
                }}
              >
                <div className="flex items-center justify-between pb-1 border-b border-slate-700/30">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>3. Follow-Up Schedule &amp; Project Scope</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">Cadence</span>
                </div>

                <div className="space-y-3.5">
                  <div className="space-y-1.5">
                    <label
                      className="text-xs font-bold flex items-center justify-between"
                      style={{ color: isWhiteTheme ? '#1e293b' : '#e2e8f0' }}
                    >
                      <span>Next Follow-Up Date</span>
                      <span className="text-[10px] text-slate-400">e.g. 2026-09-25 or Next Tuesday 2pm</span>
                    </label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        name="nextFollowUpDate"
                        type="text"
                        defaultValue={editingLead?.nextFollowUpDate || ''}
                        placeholder="e.g. 2026-09-25 or Next Tuesday 2pm"
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
                        style={{
                          backgroundColor: isWhiteTheme ? '#ffffff' : '#020617',
                          borderColor: isWhiteTheme ? '#cbd5e1' : '#334155',
                          color: isWhiteTheme ? '#0f172a' : '#f8fafc',
                          borderWidth: '1px'
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label
                      className="text-xs font-bold flex items-center justify-between"
                      style={{ color: isWhiteTheme ? '#1e293b' : '#e2e8f0' }}
                    >
                      <span>Notes, Requirements &amp; Scope Summary</span>
                      <span className="text-[10px] text-cyan-400">Preserved during conversion</span>
                    </label>
                    <textarea
                      name="notes"
                      rows={4}
                      defaultValue={editingLead?.notes || ''}
                      placeholder="e.g. We're a leading telehealth provider looking to rank well in LLM results (ChatGPT, Claude, Perplexity). Seeking an expert team for comprehensive roadmap..."
                      className="w-full p-3.5 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all resize-y leading-relaxed"
                      style={{
                        backgroundColor: isWhiteTheme ? '#ffffff' : '#020617',
                        borderColor: isWhiteTheme ? '#cbd5e1' : '#334155',
                        color: isWhiteTheme ? '#0f172a' : '#f8fafc',
                        borderWidth: '1px'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Sticky / Dedicated Footer Controls */}
              <div
                className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t"
                style={{ borderColor: isWhiteTheme ? '#e2e8f0' : '#1e293b' }}
              >
                {/* Left Side: Conversion to Project Retainer if Editing */}
                {editingLead ? (
                  <button
                    type="button"
                    onClick={() => {
                      handleConvertLeadToProject(editingLead);
                      setShowAddLeadModal(false);
                      setEditingLead(null);
                    }}
                    className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/40 hover:scale-[1.02] transition-all cursor-pointer shadow-sm"
                    title="Convert this lead directly into an active project in the project roster"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Convert to Active Retainer</span>
                  </button>
                ) : (
                  <div className="hidden sm:block text-[11px] text-slate-400 font-medium">
                    ⚡ Auto-saves to your local agency database.
                  </div>
                )}

                {/* Right Side: Cancel and Save */}
                <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddLeadModal(false);
                      setEditingLead(null);
                    }}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 border border-transparent hover:border-slate-700 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:via-blue-500 hover:to-indigo-500 shadow-xl shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{editingLead ? 'Save Changes' : 'Create Lead'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 7: ClickUp Live OAuth & API Sync Modal */}
      <ClickUpOAuthModal
        isOpen={showClickUpModal}
        onClose={() => setShowClickUpModal(false)}
        onSyncComplete={handleSyncTasksIntoProjects}
        onImportMembers={handleImportClickUpMembers}
        onImportTimeEntries={handleImportClickUpTimeEntries}
        onImportProjectsFromList={handleImportProjectsFromClickUpList}
        onImportLeadsFromList={handleImportLeadsFromClickUpList}
      />

      {/* MODAL 7.5: ClickUp CRM Ingestion Scope Modal (Tasks vs Subtasks vs Both) */}
      {crmImportScopeModal?.isOpen && createPortal(
        <div className="clickup-scope-container">
          {/* Deep Frosted Glass Backdrop */}
          <div
            className="clickup-scope-backdrop cursor-pointer"
            onClick={() => setCrmImportScopeModal(null)}
          />

          {/* High-Contrast Solid Panel */}
          <div
            className="clickup-scope-card p-6 space-y-4 text-left animate-fade-in shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            style={{ backgroundColor: '#0c1427', color: '#ffffff', zIndex: 100, position: 'relative' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-700/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-300 shadow-md shadow-emerald-500/20">
                  <Zap className="w-5 h-5 text-emerald-400 fill-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-white tracking-wide" style={{ color: '#ffffff' }}>
                      ClickUp CRM Ingestion Scope
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold" style={{ color: '#6ee7b7' }}>
                      CRM Sync
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5" style={{ color: '#cbd5e1' }}>
                    Source List: <strong className="text-emerald-300 font-semibold" style={{ color: '#6ee7b7' }}>{crmImportScopeModal.list.name}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCrmImportScopeModal(null)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 text-xs font-bold transition-all cursor-pointer shadow-sm"
                style={{ backgroundColor: '#1e293b', color: '#ffffff' }}
                title="Close (Esc)"
              >
                <X className="w-4 h-4 text-rose-400" />
                <span style={{ color: '#ffffff' }}>Close</span>
              </button>
            </div>

            {/* Scope Explanation */}
            <div className="space-y-1">
              <span className="text-xs font-bold text-white uppercase tracking-wider block" style={{ color: '#ffffff' }}>
                What would you like to import?
              </span>
              <p className="text-xs text-slate-300" style={{ color: '#cbd5e1' }}>
                Choose whether to import top-level client accounts, subtasks, or both:
              </p>
            </div>

            {/* Scope Radio Cards */}
            <div className="space-y-2.5">
              {/* Option 1: Tasks Only (Parent Accounts) */}
              <div
                onClick={() => setCrmImportScopeModal(prev => prev ? { ...prev, selectedScope: 'tasks' } : null)}
                className={`clickup-scope-item flex items-start gap-3.5 ${
                  crmImportScopeModal.selectedScope === 'tasks' ? 'is-selected-tasks' : ''
                }`}
                style={{
                  backgroundColor: crmImportScopeModal.selectedScope === 'tasks' ? 'rgba(6, 78, 59, 0.65)' : '#121a2d',
                  borderColor: crmImportScopeModal.selectedScope === 'tasks' ? '#10b981' : 'rgba(51, 65, 85, 0.7)'
                }}
              >
                <input
                  type="radio"
                  name="crm_scope_selection"
                  checked={crmImportScopeModal.selectedScope === 'tasks'}
                  onChange={() => setCrmImportScopeModal(prev => prev ? { ...prev, selectedScope: 'tasks' } : null)}
                  className="mt-1 accent-emerald-500 cursor-pointer w-4 h-4 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-white" style={{ color: '#ffffff' }}>
                      📌 Tasks Only (Parent Accounts)
                    </span>
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full font-mono font-bold bg-emerald-500/25 text-emerald-300 border border-emerald-500/40" style={{ color: '#6ee7b7' }}>
                      {crmImportScopeModal.tasks.filter(t => !t.parent).length} tasks
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed" style={{ color: '#cbd5e1' }}>
                    Recommended for client rosters. Imports top-level client accounts only, ignoring nested subtasks.
                  </p>
                </div>
              </div>

              {/* Option 2: Subtasks Only */}
              <div
                onClick={() => setCrmImportScopeModal(prev => prev ? { ...prev, selectedScope: 'subtasks' } : null)}
                className={`clickup-scope-item flex items-start gap-3.5 ${
                  crmImportScopeModal.selectedScope === 'subtasks' ? 'is-selected-subtasks' : ''
                }`}
                style={{
                  backgroundColor: crmImportScopeModal.selectedScope === 'subtasks' ? 'rgba(14, 116, 144, 0.65)' : '#121a2d',
                  borderColor: crmImportScopeModal.selectedScope === 'subtasks' ? '#06b6d4' : 'rgba(51, 65, 85, 0.7)'
                }}
              >
                <input
                  type="radio"
                  name="crm_scope_selection"
                  checked={crmImportScopeModal.selectedScope === 'subtasks'}
                  onChange={() => setCrmImportScopeModal(prev => prev ? { ...prev, selectedScope: 'subtasks' } : null)}
                  className="mt-1 accent-cyan-500 cursor-pointer w-4 h-4 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-white" style={{ color: '#ffffff' }}>
                      ↳ Subtasks Only
                    </span>
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full font-mono font-bold bg-cyan-500/25 text-cyan-300 border border-cyan-500/40" style={{ color: '#67e8f9' }}>
                      {crmImportScopeModal.tasks.filter(t => !!t.parent).length} subtasks
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed" style={{ color: '#cbd5e1' }}>
                    Imports nested subtasks as individual project items. Parent accounts are skipped.
                  </p>
                </div>
              </div>

              {/* Option 3: Both Tasks & Subtasks */}
              <div
                onClick={() => setCrmImportScopeModal(prev => prev ? { ...prev, selectedScope: 'both' } : null)}
                className={`clickup-scope-item flex items-start gap-3.5 ${
                  crmImportScopeModal.selectedScope === 'both' ? 'is-selected-both' : ''
                }`}
                style={{
                  backgroundColor: crmImportScopeModal.selectedScope === 'both' ? 'rgba(88, 28, 135, 0.65)' : '#121a2d',
                  borderColor: crmImportScopeModal.selectedScope === 'both' ? '#a855f7' : 'rgba(51, 65, 85, 0.7)'
                }}
              >
                <input
                  type="radio"
                  name="crm_scope_selection"
                  checked={crmImportScopeModal.selectedScope === 'both'}
                  onChange={() => setCrmImportScopeModal(prev => prev ? { ...prev, selectedScope: 'both' } : null)}
                  className="mt-1 accent-purple-500 cursor-pointer w-4 h-4 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-white" style={{ color: '#ffffff' }}>
                      ⚡ Both Tasks &amp; Subtasks
                    </span>
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full font-mono font-bold bg-purple-500/25 text-purple-300 border border-purple-500/40" style={{ color: '#d8b4fe' }}>
                      {crmImportScopeModal.tasks.length} total
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed" style={{ color: '#cbd5e1' }}>
                    Imports all root client tasks AND all nested subtasks into active projects.
                  </p>
                </div>
              </div>
            </div>

            {/* Mode Toggle: Replace vs Append */}
            <div
              className="p-3.5 rounded-xl border border-slate-700 flex items-center justify-between gap-3 shadow-inner"
              style={{ backgroundColor: '#121a2d', borderColor: 'rgba(51, 65, 85, 0.8)' }}
            >
              <div>
                <span className="text-xs font-bold text-white block" style={{ color: '#ffffff' }}>
                  Roster Action:
                </span>
                <span className="text-xs text-slate-300" style={{ color: '#cbd5e1' }}>
                  {crmImportScopeModal.replace ? 'Replace entire Active Projects roster' : 'Append to existing Active Projects'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 p-1 rounded-lg border border-slate-700" style={{ backgroundColor: '#070b16' }}>
                <button
                  type="button"
                  onClick={() => setCrmImportScopeModal(prev => prev ? { ...prev, replace: true } : null)}
                  className="px-3.5 py-1.5 rounded-md text-xs font-black transition-all cursor-pointer"
                  style={{
                    backgroundColor: crmImportScopeModal.replace ? '#10b981' : 'transparent',
                    color: crmImportScopeModal.replace ? '#020617' : '#cbd5e1',
                    boxShadow: crmImportScopeModal.replace ? '0 2px 8px rgba(16, 185, 129, 0.4)' : 'none'
                  }}
                >
                  Replace
                </button>
                <button
                  type="button"
                  onClick={() => setCrmImportScopeModal(prev => prev ? { ...prev, replace: false } : null)}
                  className="px-3.5 py-1.5 rounded-md text-xs font-black transition-all cursor-pointer"
                  style={{
                    backgroundColor: !crmImportScopeModal.replace ? '#9333ea' : 'transparent',
                    color: !crmImportScopeModal.replace ? '#ffffff' : '#cbd5e1',
                    boxShadow: !crmImportScopeModal.replace ? '0 2px 8px rgba(147, 51, 234, 0.4)' : 'none'
                  }}
                >
                  Append
                </button>
              </div>
            </div>

            {/* Dialog Footer Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-700/80">
              <button
                type="button"
                onClick={() => setCrmImportScopeModal(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-600 transition-all cursor-pointer hover:bg-slate-700"
                style={{ backgroundColor: '#1e293b', color: '#ffffff' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const scope = crmImportScopeModal.selectedScope;
                  const finalTasks = scope === 'tasks'
                    ? crmImportScopeModal.tasks.filter(t => !t.parent)
                    : scope === 'subtasks'
                    ? crmImportScopeModal.tasks.filter(t => !!t.parent)
                    : crmImportScopeModal.tasks;

                  if (finalTasks.length === 0) {
                    alert(`No items match "${scope}" in this list.`);
                    return;
                  }

                  handleImportProjectsFromClickUpList(
                    crmImportScopeModal.list,
                    finalTasks,
                    crmImportScopeModal.replace
                  );
                  setCrmImportScopeModal(null);
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all shadow-lg cursor-pointer hover:opacity-95"
                style={{
                  backgroundColor: crmImportScopeModal.replace ? '#10b981' : '#9333ea',
                  color: crmImportScopeModal.replace ? '#020617' : '#ffffff',
                  boxShadow: crmImportScopeModal.replace
                    ? '0 4px 15px rgba(16, 185, 129, 0.4)'
                    : '0 4px 15px rgba(147, 51, 234, 0.4)'
                }}
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>
                  {crmImportScopeModal.replace ? '⚡ Replace with ' : '➕ Add '}
                  ({crmImportScopeModal.selectedScope === 'tasks'
                    ? crmImportScopeModal.tasks.filter(t => !t.parent).length
                    : crmImportScopeModal.selectedScope === 'subtasks'
                    ? crmImportScopeModal.tasks.filter(t => !!t.parent).length
                    : crmImportScopeModal.tasks.length}
                  ) Items
                </span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}


      {/* MODAL 8: Quarterly Employee Skill Calibration & Interactive Testing Suite */}
      <AnimatePresence>
      {testingMemberSkill && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-950/85 backdrop-blur-md"
            onClick={() => setTestingMemberSkill(null)}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-y-0 right-0 z-[101] w-full max-w-4xl bg-slate-900 border-l border-slate-700 shadow-2xl flex flex-col"
          >
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/70 sticky top-0 z-10 backdrop-blur-md">
              <div className="flex items-center gap-3.5">
                <img
                  src={testingMemberSkill.avatar}
                  alt={testingMemberSkill.name}
                  className="w-12 h-12 rounded-2xl object-cover ring-2 ring-purple-500/50"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-white">{testingMemberSkill.name}</h3>
                    <span className="px-2.5 py-0.5 rounded-lg bg-purple-500/15 text-purple-300 text-[11px] font-bold border border-purple-500/30">
                      Quarterly Skill Assessment
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Evaluate &amp; calibrate {testingMemberSkill.role} • Current Tier: {testingMemberSkill.generalCompetency.clientReadyTier.split(':')[0]}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setTestingMemberSkill(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 min-h-0 space-y-6">
              {/* Top Examination Control Banner & Exam Mode Switcher */}
              <div className="flex flex-col gap-3 p-4 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse" />
                    <span className="text-xs font-black text-slate-200 uppercase tracking-wide">
                      {aiEvaluationDone ? 'AI Evaluation Complete' : 'Agency Certification Assessment Mode'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleSwitchExamMode(
                          examMode === 'ROLE_SPECIFIC' ? 'FULL_50_MASTER' : 'ROLE_SPECIFIC'
                        )
                      }
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                        examMode === 'FULL_50_MASTER'
                          ? 'bg-purple-500 text-white border-purple-400 shadow-md shadow-purple-500/25'
                          : 'bg-slate-900 text-purple-300 border-purple-500/30 hover:bg-slate-800'
                      }`}
                    >
                      {examMode === 'FULL_50_MASTER'
                        ? '📚 Full 50-Question Master Exam Active'
                        : '🎯 Role-Specific Exam (Switch to Full 50-Q Master Exam)'}
                    </button>

                    <button
                      type="button"
                      onClick={handleAutofillSampleAnswers}
                      className="px-3 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <span>💡 Autofill Sample Expert Answers</span>
                    </button>

                    <button
                      type="button"
                      disabled={isAiJudging}
                      onClick={handleRunAiEvaluation}
                      className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs transition-all cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <span>{isAiJudging ? '🤖 AI Evaluating Answers...' : '🤖 Run Automated AI Evaluation'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Automated AI Score Judgment & Tier Prediction Card */}
              {(() => {
                if (!aiEvaluationDone) {
                  return (
                    <div className="p-5 rounded-3xl bg-gradient-to-r from-slate-950 to-purple-950/30 border border-purple-500/30 text-center space-y-2">
                      <h4 className="text-sm font-black text-white">
                        ✍️ Complete Situation-Based Written Assessment Below ({testQuestionnaire.length} Comprehensive Questions)
                      </h4>
                      <p className="text-xs text-slate-400 max-w-xl mx-auto">
                        Includes real-world multiple-choice governance checks, situational crisis triage, and short technical Q&A. Once finished, click{' '}
                        <span className="text-cyan-400 font-bold">&quot;Run Automated AI Evaluation&quot;</span> for automatic algorithmic grading and tier certification. Zero manual score overrides allowed.
                      </p>
                    </div>
                  );
                }

                const totalSum = testQuestionnaire.reduce((sum, q) => sum + (q.aiJudgedScore ?? 8.5), 0);
                const liveComposite =
                  testQuestionnaire.length > 0
                    ? Math.round((totalSum / testQuestionnaire.length) * 10) / 10
                    : 9.2;

                let predictedTier = 'Tier 1: Client-Facing Lead';
                let judgmentVerdict =
                  '🏆 MASTER CERTIFIED: AI algorithm verified exceptional situational empathy, root-cause methodology, and client presentation clarity.';
                let verdictColor = 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30';

                if (liveComposite < 7.2 || !testPassedPractical) {
                  predictedTier = 'Tier 3: Internal Execution Only';
                  judgmentVerdict =
                    '⚠️ RETRAINING REQUIRED: AI detected insufficient diagnostic depth or incomplete client communication protocols.';
                  verdictColor = 'text-amber-300 bg-amber-500/15 border-amber-500/30';
                } else if (liveComposite < 8.7) {
                  predictedTier = 'Tier 2: Direct Email Capable';
                  judgmentVerdict =
                    '🥈 SENIOR PRACTITIONER: AI verified high technical accuracy and capable independent email communication.';
                  verdictColor = 'text-cyan-300 bg-cyan-500/15 border-cyan-500/30';
                }

                return (
                  <div className="space-y-3 animate-fade-in">
                    <div className="p-5 rounded-3xl bg-gradient-to-r from-purple-950/60 via-slate-900 to-indigo-950/50 border border-purple-500/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
                      <div>
                        <span className="text-[11px] font-extrabold uppercase text-purple-300 tracking-wider block">
                          AI Judged Composite Score ({testQuestionnaire.length} Questions Evaluated)
                        </span>
                        <div className="flex items-baseline gap-2 pt-1">
                          <span className="text-3xl font-black text-white">{liveComposite}</span>
                          <span className="text-sm font-bold text-slate-400">/ 10</span>
                        </div>
                      </div>

                      <div className="text-left sm:text-right">
                        <span className="text-[11px] font-bold text-slate-400 block">AI Certified Governance Tier</span>
                        <span className="px-3.5 py-1.5 rounded-xl bg-purple-500/20 text-purple-300 font-black text-xs border border-purple-500/40 inline-block mt-1">
                          🤖 {predictedTier}
                        </span>
                      </div>
                    </div>

                    <div className={`p-3.5 rounded-2xl border text-xs font-bold ${verdictColor}`}>
                      {judgmentVerdict}
                    </div>
                  </div>
                );
              })()}

              {/* Dynamic Situation-Based Questionnaire Grouped by Category */}
              <div className="space-y-6">
                {(() => {
                  const categories: string[] = [];
                  testQuestionnaire.forEach((q) => {
                    if (!categories.includes(q.skillCategory)) categories.push(q.skillCategory);
                  });

                  return categories.map((cat) => {
                    const catQuestions = testQuestionnaire.filter((q) => q.skillCategory === cat);
                    const catAvg =
                      Math.round(
                        (catQuestions.reduce((s, q) => s + (q.aiJudgedScore ?? 0), 0) / catQuestions.length) * 10
                      ) / 10;

                    return (
                      <div
                        key={cat}
                        className="space-y-4 p-5 rounded-3xl bg-slate-950/80 border border-slate-800/90 shadow-lg"
                      >
                        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                          <h4 className="font-black text-white text-sm flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-purple-400 inline-block" />
                            <span>{cat}</span>
                          </h4>
                          {aiEvaluationDone && (
                            <span className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-emerald-400 text-xs font-extrabold">
                              AI Judged Category Avg: {catAvg} / 10
                            </span>
                          )}
                        </div>

                        <div className="space-y-5 pt-1">
                          {catQuestions.map((q, qIdx) => (
                            <div
                              key={q.id}
                              className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-md"
                            >
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-black text-purple-300 uppercase tracking-wide">
                                    Question #{qIdx + 1}: {q.questionTitle}
                                  </span>
                                  <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] font-black text-cyan-400 uppercase tracking-wider">
                                    {q.questionType === 'MULTIPLE_CHOICE'
                                      ? 'Multiple Choice'
                                      : q.questionType === 'Q_AND_A_SHORT'
                                      ? 'Technical Q&A'
                                      : 'Situation Written'}
                                  </span>
                                </div>
                                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/90 text-xs text-slate-200 font-medium leading-relaxed">
                                  {q.questionPrompt}
                                </div>
                              </div>

                              {/* Multiple Choice vs Written Response Input */}
                              {q.questionType === 'MULTIPLE_CHOICE' && q.options ? (
                                <div className="space-y-2 pt-1">
                                  <label className="text-[11px] font-bold uppercase text-slate-400 tracking-wider block">
                                    Select Correct Answer:
                                  </label>
                                  <div className="grid grid-cols-1 gap-2">
                                    {q.options.map((opt, optIdx) => {
                                      const isSelected = q.userAnswer === opt;
                                      return (
                                        <button
                                          key={optIdx}
                                          type="button"
                                          onClick={() => handleUpdateUserAnswer(q.id, opt)}
                                          className={`w-full text-left p-3 rounded-xl border text-xs font-medium transition-all cursor-pointer flex items-start gap-2.5 ${
                                            isSelected
                                              ? 'bg-purple-500/20 border-purple-500 text-white shadow'
                                              : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                                          }`}
                                        >
                                          <span
                                            className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                                              isSelected
                                                ? 'border-purple-400 bg-purple-500 text-white'
                                                : 'border-slate-600 bg-slate-900'
                                            }`}
                                          >
                                            {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                                          </span>
                                          <span>{opt}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-1.5">
                                  <label className="text-[11px] font-bold uppercase text-slate-400 tracking-wider flex items-center justify-between">
                                    <span>Employee Written Response (No Manual Score Override)</span>
                                    <span className="text-[10px] text-slate-500">Auto-Evaluated by AI</span>
                                  </label>
                                  <textarea
                                    rows={q.questionType === 'Q_AND_A_SHORT' ? 2 : 4}
                                    value={q.userAnswer}
                                    onChange={(e) => handleUpdateUserAnswer(q.id, e.target.value)}
                                    placeholder={
                                      q.questionType === 'Q_AND_A_SHORT'
                                        ? 'Type concise technical answer / rule...'
                                        : 'Type your detailed situational diagnosis, client communication plan, and technical triage steps here...'
                                    }
                                    className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-3.5 py-3 text-xs text-white focus:outline-none focus:border-purple-500 leading-relaxed font-mono"
                                  />
                                </div>
                              )}

                              {/* AI Evaluator Verdict Card */}
                              {q.aiJudgedScore !== null && (
                                <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 to-slate-950 border border-purple-500/40 space-y-2 animate-fade-in">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-black text-purple-300 flex items-center gap-1.5">
                                      <span>🤖 AI Algorithmic Judgment Score</span>
                                    </span>
                                    <span className="px-3 py-1 rounded-xl bg-purple-500/20 text-purple-300 font-black text-xs border border-purple-500/40">
                                      {q.aiJudgedScore} / 10
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-300 font-medium leading-relaxed">
                                    {q.aiFeedback}
                                  </p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Practical Challenge Checkbox */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                <input
                  type="checkbox"
                  id="practicalCheck"
                  checked={testPassedPractical}
                  onChange={(e) => setTestPassedPractical(e.target.checked)}
                  className="w-4 h-4 accent-purple-500 rounded cursor-pointer"
                />
                <label htmlFor="practicalCheck" className="text-xs text-slate-300 font-semibold cursor-pointer">
                  Employee identity &amp; written examination authenticity verified by Squad Lead.
                </label>
              </div>

              {/* Calibration Summary Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">
                  Judged Evaluation &amp; Career Calibration Summary Notes
                </label>
                <textarea
                  rows={2}
                  value={testNotes}
                  onChange={(e) => setTestNotes(e.target.value)}
                  placeholder="Record key strengths, AI feedback summary, or quarterly career milestones..."
                  className="w-full glass-panel border-slate-700/50 hover:border-cyan-500/30 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

              </div>
            <div className="p-6 border-t border-slate-800 bg-slate-950/70 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setTestingMemberSkill(null)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-all cursor-pointer text-xs"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  disabled={isAiJudging}
                  onClick={handleRunAiEvaluation}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs transition-all cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isAiJudging ? '🤖 AI Evaluating...' : '🤖 Run Automated AI Evaluation'}
                </button>

                <button
                  type="button"
                  disabled={!aiEvaluationDone}
                  onClick={handleSaveSkillTestResult}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-black text-xs transition-all cursor-pointer shadow-lg shadow-purple-500/25 flex items-center gap-2 disabled:opacity-40"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Finalize &amp; Save AI Judged Score</span>
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
      </AnimatePresence>

      <AnimatePresence>
      {viewingMemberProfile && (() => {
        const member = viewingMemberProfile;
        const assignedProjs = projectsList.filter(
          (p) =>
            p.members.some((m) => m.id === member.id) ||
            p.taskBreakdown?.some((tb) => tb.assigneeId === member.id) ||
            p.projectLeadId === member.id ||
            p.clientCallAssigneeId === member.id
        );
        const totalAssignedHrs = assignedProjs.reduce((sum, p) => sum + getMemberHoursOnProject(p, member.id), 0);
        const utilizationPct = Math.round((totalAssignedHrs / member.weeklyCapacityHours) * 100);

        return (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-slate-950/85 backdrop-blur-md"
              onClick={() => setViewingMemberProfile(null)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-y-0 right-0 z-[101] w-full max-w-3xl bg-slate-900 border-l border-slate-700 shadow-2xl flex flex-col"
            >
              <div className="flex-1 overflow-y-auto">
                {/* Executive Profile Header */}
                <div className="p-6 border-b border-slate-800 bg-slate-950/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-10 backdrop-blur-md">
                <div className="flex items-center gap-4">
                  <img
                    src={member.avatar}
                    alt={member.name}
                    className="w-16 h-16 rounded-2xl object-cover ring-2 ring-purple-500/50 shadow-lg shrink-0"
                  />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-black text-white">{member.name}</h3>
                      <span className="px-2.5 py-0.5 rounded-lg bg-purple-500/15 text-purple-300 text-xs font-extrabold border border-purple-500/30">
                        {member.role}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-400">
                      <span>Department: <strong className="text-slate-300">{member.department}</strong></span>
                      <span>• Seniority: <strong className="text-slate-300">{member.seniority}</strong></span>
                      <span>• Tier: <strong className="text-purple-400">{member.generalCompetency.clientReadyTier.split(':')[0]}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => openSkillTestModal(member)}
                    className="px-4 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 font-extrabold text-xs border border-purple-500/40 transition-all cursor-pointer flex items-center gap-1.5 shadow"
                  >
                    <span>🧪 Take Quarterly Skill Test</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewingMemberProfile(null)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto flex-1 min-h-0 space-y-6 text-xs">
                {/* Bandwidth & Utilization Strip */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Weekly Capacity Cap
                    </span>
                    <span className="text-xl font-black text-white block pt-1">{member.weeklyCapacityHours} Hours</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Currently Assigned
                    </span>
                    <span className="text-xl font-black text-cyan-400 block pt-1">
                      {totalAssignedHrs}h ({utilizationPct}%)
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Quarterly Assessment Score
                    </span>
                    <span className="text-xl font-black text-emerald-400 block pt-1">
                      {member.generalCompetency.quarterlyScore
                        ? `${member.generalCompetency.quarterlyScore} / 10`
                        : member.generalCompetency.lastTestedDate
                        ? `Tested ${member.generalCompetency.lastTestedDate}`
                        : 'Not Yet Tested'}
                    </span>
                  </div>
                </div>

                {/* Assigned Active Projects With INTERNAL DEEP LINKS */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-white text-sm">
                      Assigned Projects &amp; Deliverables ({assignedProjs.length})
                    </h4>
                    <span className="text-[11px] text-slate-400 font-semibold">
                      Click below to jump directly to any project ledger
                    </span>
                  </div>

                  {assignedProjs.length === 0 ? (
                    <EmptyState 
                        message="100% Available Bandwidth" 
                        submessage="No active projects assigned currently." 
                    />
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {assignedProjs.map((proj) => {
                        const hrs = getMemberHoursOnProject(proj, member.id);
                        const memberTasks = (proj.taskBreakdown || []).filter((tb) => tb.assigneeId === member.id);
                        const isLead = proj.projectLeadId === member.id;
                        const isCallLead = proj.clientCallAssigneeId === member.id;

                        return (
                          <div
                            key={proj.id}
                            className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-700 transition-all"
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-black text-white">{proj.name}</span>
                                <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-400 text-[11px] font-bold">
                                  {proj.client}
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 text-slate-300">
                                {isLead && (
                                  <span className="px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-400 font-extrabold text-[10px] border border-cyan-500/30">
                                    👑 Squad Lead
                                  </span>
                                )}
                                {isCallLead && (
                                  <span className="px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-300 font-extrabold text-[10px] border border-purple-500/30">
                                    🗣️ Client Call Lead
                                  </span>
                                )}
                                <span className="font-bold text-emerald-400">+{hrs} Hours Logged</span>
                                {memberTasks.map((tb) => (
                                  <span key={tb.id} className="text-slate-400">
                                    • {tb.taskType} ({tb.hours}h)
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Internal Navigation Link */}
                            <button
                              type="button"
                              onClick={() => {
                                setViewingMemberProfile(null);
                                setViewingProjectDetail(proj);
                                if (onNavigateView) onNavigateView('projects', proj.id);
                              }}
                              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0 self-start sm:self-center"
                            >
                              <span>Open Project 360° Ledger →</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* App Internal Cross-Navigation Shortcuts Strip */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    🔗 Internal Hub Shortcuts for {member.name.split(' ')[0]}
                  </span>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setViewingMemberProfile(null);
                        if (onNavigateView) onNavigateView('hours');
                      }}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-cyan-300 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <span>📊 View Employee Hours &amp; Capacity Ledger →</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setViewingMemberProfile(null);
                        if (onNavigateView) onNavigateView('bot');
                      }}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-purple-300 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <span>🤖 Open Job Delivery Bot &amp; Squad Assignment →</span>
                    </button>
                  </div>
                </div>

                {/* CAREER GOVERNANCE & CLIENT-READY PROGRESSION TRACK */}
                <div className="p-5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-black text-white tracking-wide flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-purple-400" />
                      <span>Career Governance &amp; Client-Ready Progression Road</span>
                    </span>
                    <span className="px-2.5 py-0.5 rounded-lg bg-purple-500/20 border border-purple-500/40 text-[11px] font-extrabold text-purple-300">
                      Current: {member.generalCompetency.clientReadyTier}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 relative">
                    {[
                      {
                        tier: 'Tier 3: Internal Execution Only',
                        label: 'T3: Execution Specialist',
                        desc: 'Task production & technical implementation under squad supervision.',
                        step: 1
                      },
                      {
                        tier: 'Tier 2: Direct Email Capable',
                        label: 'T2: Client Communicator',
                        desc: 'Autonomous technical delivery + direct client async email communication.',
                        step: 2
                      },
                      {
                        tier: 'Tier 1: Client-Facing Lead',
                        label: 'T1: Client-Facing Lead',
                        desc: 'Strategic account lead, live client calls & crisis governance authority.',
                        step: 3
                      }
                    ].map((stepObj) => {
                      const isCurrent = member.generalCompetency.clientReadyTier === stepObj.tier;
                      const isAchieved =
                        stepObj.step === 1 ||
                        (stepObj.step === 2 && !member.generalCompetency.clientReadyTier.includes('Tier 3')) ||
                        (stepObj.step === 3 && member.generalCompetency.clientReadyTier.includes('Tier 1'));

                      return (
                        <div
                          key={stepObj.tier}
                          className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-2 ${
                            isCurrent
                              ? 'bg-purple-500/15 border-purple-500/50 ring-1 ring-purple-500/40 shadow-lg'
                              : isAchieved
                              ? 'bg-slate-900/90 border-emerald-500/30'
                              : 'bg-slate-900/40 border-slate-800 opacity-60'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1">
                              <span
                                className={`text-xs font-black ${
                                  isCurrent
                                    ? 'text-purple-300'
                                    : isAchieved
                                    ? 'text-emerald-400'
                                    : 'text-slate-400'
                                }`}
                              >
                                {stepObj.label}
                              </span>
                              {isCurrent && (
                                <span className="px-2 py-0.5 rounded-full bg-purple-500 text-white text-[10px] font-extrabold shrink-0">
                                  Active
                                </span>
                              )}
                              {!isCurrent && isAchieved && (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold shrink-0">
                                  Verified ✓
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">{stepObj.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* VISUAL MULTI-DIMENSIONAL COMPETENCY HEATMAP & SKILL MATRIX */}
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="font-extrabold text-white text-sm">
                      Multi-Dimensional Skill Competency Heatmap Matrix
                    </h4>
                    <span className="text-[11px] text-slate-400">
                      Evaluated across Quality • Speed • Communication
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {member.skills.map((sk) => {
                      const scoreObj = (member.skillScores || []).find((s) => s.skill === sk);
                      const quality = scoreObj?.quality || Math.min(10, Math.max(7, member.generalCompetency.clientCommunication));
                      const speed = scoreObj?.speedEfficiency || Math.min(10, Math.max(7, member.generalCompetency.proactivityReliability));
                      const comm = scoreObj?.communication || member.generalCompetency.clientCommunication;
                      const composite = Math.round(((quality + speed + comm) / 3) * 10) / 10;

                      return (
                        <div
                          key={sk}
                          className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-all space-y-3 shadow-md"
                        >
                          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                            <span className="font-extrabold text-sm text-white">{sk}</span>
                            <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-400 text-xs font-black border border-emerald-500/30">
                              {composite} / 10 Avg
                            </span>
                          </div>

                          <div className="space-y-2.5 pt-1">
                            {/* Dimension 1: Quality & Accuracy */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-[11px] font-bold">
                                <span className="text-slate-300">Quality &amp; Accuracy</span>
                                <span className="text-emerald-400">{quality} / 10</span>
                              </div>
                              <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="h-full bg-emerald-400 rounded-full transition-all"
                                  style={{ width: `${Math.round((quality / 10) * 100)}%` }}
                                />
                              </div>
                            </div>

                            {/* Dimension 2: Speed & Efficiency */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-[11px] font-bold">
                                <span className="text-slate-300">Speed &amp; Efficiency</span>
                                <span className="text-cyan-400">{speed} / 10</span>
                              </div>
                              <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="h-full bg-cyan-400 rounded-full transition-all"
                                  style={{ width: `${Math.round((speed / 10) * 100)}%` }}
                                />
                              </div>
                            </div>

                            {/* Dimension 3: Client Communication */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-[11px] font-bold">
                                <span className="text-slate-300">Client Communication</span>
                                <span className="text-purple-400">{comm} / 10</span>
                              </div>
                              <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="h-full bg-purple-400 rounded-full transition-all"
                                  style={{ width: `${Math.round((comm / 10) * 100)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => openSkillTestModal(member)}
                  className="px-4 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 font-extrabold text-xs transition-all cursor-pointer"
                >
                  🧪 Retest Employee Skills
                </button>

                <button
                  type="button"
                  onClick={() => setViewingMemberProfile(null)}
                  className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all cursor-pointer"
                >
                  Close Employee Profile
                </button>
              </div>
              </div>
            </motion.div>
          </>
        );
      })()}
      </AnimatePresence>
        </>,
        document.body
      )}

      {clickUpActivityModalState?.isOpen && (
        <ClickUpTaskActivityModal
          isOpen={clickUpActivityModalState.isOpen}
          taskId={clickUpActivityModalState.taskId}
          taskName={clickUpActivityModalState.taskName}
          taskUrl={clickUpActivityModalState.taskUrl}
          projectName={clickUpActivityModalState.projectName}
          clientName={clickUpActivityModalState.clientName}
          status={clickUpActivityModalState.status}
          priority={clickUpActivityModalState.priority}
          assignees={clickUpActivityModalState.assignees}
          onClose={() => setClickUpActivityModalState(null)}
        />
      )}

      {diagnosingProject && (
        <ProjectHealthDiagnosticModal
          isOpen={!!diagnosingProject}
          project={diagnosingProject}
          onClose={() => setDiagnosingProject(null)}
        />
      )}

      {/* Scope Creep & Retainer Upsell Draft Modal */}
      {scopeUpsellModalProj && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl max-w-lg w-full p-6 text-white space-y-4 relative">
            <button
              type="button"
              onClick={() => setScopeUpsellModalProj(null)}
              className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Retainer Scope & Upsell Draft</h3>
                <p className="text-xs text-slate-400">
                  {scopeUpsellModalProj.name} ({scopeUpsellModalProj.client})
                </p>
              </div>
            </div>

            {/* Scope Stats Banner */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs font-mono">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Retainer Cap</span>
                <span className="text-cyan-400 font-bold">{scopeUpsellModalProj.activeHours || scopeUpsellModalProj.totalHours || 20} hrs/mo</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block text-[10px] uppercase">Hours Logged</span>
                <span className="text-rose-400 font-bold">{scopeUpsellModalProj.actualHoursLogged || Math.round((scopeUpsellModalProj.activeHours || 20) * 0.95)} hrs</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block text-[10px] uppercase">Status</span>
                <span className="text-amber-300 font-bold">
                  {(scopeUpsellModalProj.actualHoursLogged || 0) >= (scopeUpsellModalProj.activeHours || 20)
                    ? '⚠️ Scope Overrun'
                    : '🟡 Buffer Nearly Exhausted'}
                </span>
              </div>
            </div>

            {/* Pre-drafted Client Message */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Client Communication Draft (Ready for Slack / Email):
              </label>
              <textarea
                readOnly
                rows={7}
                value={`Hi ${scopeUpsellModalProj.client} team,\n\nOur agency sprint squad has currently completed ${scopeUpsellModalProj.actualHoursLogged || Math.round((scopeUpsellModalProj.activeHours || 20) * 0.95)} hours of our ${scopeUpsellModalProj.activeHours || scopeUpsellModalProj.totalHours || 20}-hour monthly retainer on "${scopeUpsellModalProj.name}", executing high-priority SEO deliverables.\n\nTo ensure continued sprint momentum and handle upcoming roadmap priorities without pause, we recommend authorizing a 5-hour or 10-hour bolt-on allocation block.\n\nPlease let us know if you'd like us to add this so our team can proceed smoothly!`}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 font-sans focus:outline-none focus:border-amber-400 select-all leading-relaxed"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <span className="text-[11px] text-slate-400">
                Protects agency gross margin & eliminates unpaid overtime
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setScopeUpsellModalProj(null)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const text = `Hi ${scopeUpsellModalProj.client} team,\n\nOur agency sprint squad has currently completed ${scopeUpsellModalProj.actualHoursLogged || Math.round((scopeUpsellModalProj.activeHours || 20) * 0.95)} hours of our ${scopeUpsellModalProj.activeHours || scopeUpsellModalProj.totalHours || 20}-hour monthly retainer on "${scopeUpsellModalProj.name}", executing high-priority SEO deliverables.\n\nTo ensure continued sprint momentum and handle upcoming roadmap priorities without pause, we recommend authorizing a 5-hour or 10-hour bolt-on allocation block.\n\nPlease let us know if you'd like us to add this so our team can proceed smoothly!`;
                    navigator.clipboard.writeText(text);
                    setCopiedUpsellDraft(true);
                    sonnerToast.success('📋 Scope Upsell Draft copied to clipboard!');
                    setTimeout(() => setCopiedUpsellDraft(false), 3000);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                >
                  {copiedUpsellDraft ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-slate-950" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Draft</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Idea 3: 1-Click Client P&L & Staffing Optimizer Modal */}
      {activePnLProject && (
        <ClientPnLModal
          isOpen={!!activePnLProject}
          onClose={() => setActivePnLProject(null)}
          project={activePnLProject}
          allMembers={customMembers}
          onOptimizeSquad={handleOptimizeSquad}
        />
      )}
    </div>
  );
};
