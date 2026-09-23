export type SkillCategory = string;

export type DepartmentCategory = string;

export type SeniorityLevel = string;

export type ClientReadyTier =
  | 'Tier 1: Client-Facing Lead'
  | 'Tier 2: Direct Email Capable'
  | 'Tier 3: Internal Execution Only';

export type ClientTier = 'TIER_S_VIP' | 'TIER_A_AGENCY' | 'TIER_B_LOCAL';

export interface ClientTierMeta {
  tier: ClientTier;
  label: string;
  shortLabel: string;
  tag: string;
  badgeClass: string;
  borderClass: string;
  glowClass: string;
  icon: string;
  description: string;
  targetSla: string;
  priorityWeight: number; // For sorting and allocation priority (3.0 for VIP, 2.0 for Agency, 1.0 for Local)
  recommendedStaffing: string;
}

export const CLIENT_TIER_CONFIG: Record<ClientTier, ClientTierMeta> = {
  TIER_S_VIP: {
    tier: 'TIER_S_VIP',
    label: 'VIP / High-Ticket (International & E-commerce)',
    shortLabel: 'VIP High-Ticket',
    tag: '💎 VIP',
    badgeClass: 'bg-purple-950/70 text-purple-200 border-purple-500/50 shadow-[0_0_12px_rgba(168,85,247,0.35)]',
    borderClass: 'border-purple-500/40',
    glowClass: 'from-purple-600/20 via-cyan-500/10 to-transparent',
    icon: '💎',
    description: 'High retainer ($1,500 - $10,000+/mo), high ROI expectations. Requires Senior Leads & Tier 1 communicators.',
    targetSla: '24h Turn-around / Proactive Weekly Comms',
    priorityWeight: 3.0,
    recommendedStaffing: 'Tier 1 Client-Facing Lead + Senior Specialists'
  },
  TIER_A_AGENCY: {
    tier: 'TIER_A_AGENCY',
    label: 'Agency Partner (White-Label & Volume)',
    shortLabel: 'Agency Partner',
    tag: '🏢 Agency',
    badgeClass: 'bg-blue-950/70 text-blue-200 border-blue-500/50 shadow-[0_0_12px_rgba(59,130,246,0.35)]',
    borderClass: 'border-blue-500/40',
    glowClass: 'from-blue-600/20 via-indigo-500/10 to-transparent',
    icon: '🏢',
    description: 'High volume recurring pipeline. Managed via Pod/Squad leads with strict SLA compliance.',
    targetSla: 'Strict Batch Turn-around / Standardized SOPs',
    priorityWeight: 2.0,
    recommendedStaffing: 'Pod Lead + Direct Email Capable (Tier 1/2)'
  },
  TIER_B_LOCAL: {
    tier: 'TIER_B_LOCAL',
    label: 'Local / Budget-Conscious Standard',
    shortLabel: 'Local / Standard',
    tag: '📍 Local',
    badgeClass: 'bg-slate-800/80 text-emerald-300 border-slate-700/60',
    borderClass: 'border-slate-700/50',
    glowClass: 'from-slate-700/20 to-transparent',
    icon: '📍',
    description: 'Low-to-moderate retainer ($200 - $800/mo). Routed to Junior / Tier 3 internal specialists to preserve high agency margin.',
    targetSla: '48-72h Turn-around / Templated Reporting',
    priorityWeight: 1.0,
    recommendedStaffing: 'Tier 3 Internal Specialists + QA Sign-off'
  }
};

export type PriorityLevel = 'High' | 'Medium' | 'Low';

export type TaskStatus = 'backlog' | 'assigned' | 'in_progress' | 'review' | 'completed';

/**
 * Role hierarchy (highest to lowest):
 *   EXECUTIVE      — Board/Director level. Read-only overview, no task management.
 *   PROJECT_MANAGER— Full control: roster, assignments, DSR approval, reports.
 *   TEAM_LEAD      — Manages a fixed sub-team pod. Reviews DSRs for their members.
 *   COORDINATOR    — Operational role. Can assign tasks, cannot manage roster.
 *   MEMBER         — Individual contributor. Tracks time, submits DSR.
 */
export type UserRoleType =
  | 'CEO'
  | 'EXECUTIVE'
  | 'PROJECT_MANAGER'
  | 'TEAM_LEAD'
  | 'COORDINATOR'
  | 'MEMBER';

export interface AppUserProfile {
  id: string;
  name: string;
  roleTitle: string;   // e.g. "SEO Lead", "Performance Manager", "Jr. Designer"
  roleType: UserRoleType;
  avatar: string;
  teamId?: string;            // Sub-team/pod this user belongs to
  managedMemberIds?: string[]; // TEAM_LEAD: IDs of direct reports
  clickUpUserId?: number;
  clickUpEmail?: string;
  permissions: {
    // Roster & Planning
    canManageRoster: boolean;         // PROJECT_MANAGER
    canAssignTasks: boolean;          // PROJECT_MANAGER + COORDINATOR + TEAM_LEAD
    canExportPlan: boolean;           // PROJECT_MANAGER + EXECUTIVE
    canCalibrateSkills: boolean;      // PROJECT_MANAGER + TEAM_LEAD
    canManageOrgMap: boolean;         // PROJECT_MANAGER only — drag-drop org structure
    // DSR Workflow
    canSubmitDSR: boolean;            // MEMBER + COORDINATOR
    canReviewDSR: boolean;            // TEAM_LEAD + PROJECT_MANAGER
    canApproveDSR: boolean;           // PROJECT_MANAGER only
    // Visibility
    canViewTeamPresence: boolean;     // TEAM_LEAD + PROJECT_MANAGER + EXECUTIVE
    canViewAllTeams: boolean;         // PROJECT_MANAGER + EXECUTIVE (vs. own pod only)
    canViewFinancials: boolean;       // PROJECT_MANAGER + EXECUTIVE
  };
}

export interface SkillScore {
  skill: SkillCategory;
  quality: number; // 1-10
  speedEfficiency: number; // 1-10
  communication: number; // 1-10
}

export interface GeneralCompetencyScores {
  englishProficiency: number;       // 1-10
  clientCommunication: number;      // 1-10
  requirementUnderstanding: number; // 1-10
  proactivityReliability: number;   // 1-10
  clientReadyTier: ClientReadyTier;
  lastTestedDate?: string;
  quarterlyScore?: number;
  testNotes?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  department: DepartmentCategory;
  seniority: SeniorityLevel;
  avatar: string;
  weeklyCapacityHours: number; // e.g. 35, 40
  skills: (SkillCategory | string)[];
  skillScores: SkillScore[];
  generalCompetency: GeneralCompetencyScores;
  completedSprintTasks: number;
  colorSwatch: string;
  clickUpUserId?: number;
  clickUpEmail?: string;
}

export interface Task {
  id: string;
  title: string;
  clientName: string;
  clientTier?: ClientTier;
  projectName?: string;
  requiredSkill: SkillCategory;
  estimatedHours: number;
  actualHoursLogged: number;
  assignedUserId: string | null;
  priority: PriorityLevel;
  status: TaskStatus;
  dueDate: string;
  categoryColor: string;
  clickUpTaskId?: string;
  clickUpUrl?: string;
  clickUpStatus?: string;
}

/* --- BRIEF ANALYZER TYPES --- */

export interface ProjectBriefInput {
  clientName: string;
  clientTier?: ClientTier;
  projectName: string;
  totalFixedHours: number;
  requiresClientCommunication: boolean;
  briefDescription: string;
}

export interface AnalyzedRequirementSlice {
  id: string;
  title: string;
  skill: SkillCategory;
  recommendedHours: number;
  reasoning: string;
}

export interface AlternativeCandidate {
  member: TeamMember;
  fitScore: number;
  qualityScore: number;
  availableHoursBefore: number;
  remainingHoursAfter: number;
  isOverloadedAfter: boolean;
  justification: string;
}

export interface BriefSliceAssignment {
  slice: AnalyzedRequirementSlice;
  assignedMember: TeamMember;
  fitScore: number;
  qualityScore: number;
  availableHoursBefore: number;
  remainingHoursAfter: number;
  isOverloadedAfter: boolean;
  justification: string;
  alternatives: AlternativeCandidate[];
}

export interface BriefSquadProposal {
  projectInput: ProjectBriefInput;
  assignments: BriefSliceAssignment[];
  totalAllocatedHours: number;
  hasOverloadRisk: boolean;
  summaryRationale: string;
}

export interface MatchCandidateResult {
  member: TeamMember;
  fitScore: number;
  qualityScore: number;
  speedFactor: number;
  bandwidthBufferPercent: number;
  availableHours: number;
  isOverloaded: boolean;
  justification: string;
  rank: number;
}

export interface ProjectResourceBlock {
  id: string;
  skill: SkillCategory;
  hours: number;
  title: string;
  priority: PriorityLevel;
  clientTier?: ClientTier;
  preferredSeniority?: SeniorityLevel;
  requiresClientFacing?: boolean;
}

export interface ProjectIntakeRequest {
  id: string;
  projectName: string;
  clientName: string;
  clientTier?: ClientTier;
  priority: PriorityLevel;
  requiresClientCommunication?: boolean;
  blocks: ProjectResourceBlock[];
}

export interface SquadProposalItem {
  block: ProjectResourceBlock;
  assignedMember: TeamMember;
  fitScore: number;
  qualityScore: number;
  availableHoursBefore: number;
  remainingHoursAfter: number;
  isOverloadedAfter: boolean;
  justification: string;
  alternatives: AlternativeCandidate[];
}

export interface ProjectAllocationProposal {
  project: ProjectIntakeRequest;
  items: SquadProposalItem[];
  totalProjectHours: number;
  hasOverloadRisk: boolean;
}

/* --- BI-DIRECTIONAL DSR TRACKER & PER-EMPLOYEE CAPACITY TYPES --- */

export interface DSRWeeklyEntry {
  weekId: string; // e.g. "w1", "w2", "w3", "w4", "w5"
  weekLabel: string; // e.g. "W1 (1-5)", "W2 (6-12)", "W3 (13-19)", "W4 (20-26)", "W5 (27-31)"
  planHours: number; // Automatically calculated from assigned projects OR overridden
  loggedHours: number; // Approved project hours logged by employee
  internalHours: number; // Approved internal-activity hours (training, recruiting, admin)
  notes?: string;
}

export interface EmployeeDSRRecord {
  memberId: string;
  monthYear: string; // e.g. "Jul 2026"
  targetWeeklyHours: number; // e.g. 35
  weeklyEntries: DSRWeeklyEntry[];
}
