import type { TeamMember, Task } from '../types';

/**
 * Standard Loaded Hourly Cost Rates by Specialist Seniority
 * Represents salary + payroll overhead + benefits
 */
export const SENIORITY_HOURLY_COST_RATES: Record<string, number> = {
  Senior: 58,
  Lead: 58,
  Mid: 36,
  Junior: 22
};

export function getMemberCostPerHour(member: TeamMember): number {
  const sen = (member.seniority || '').toLowerCase();
  const tier = (member.generalCompetency?.clientReadyTier || '').toLowerCase();

  if (sen.includes('senior') || sen.includes('lead') || tier.includes('tier 1')) {
    return SENIORITY_HOURLY_COST_RATES.Senior;
  }
  if (sen.includes('mid') || tier.includes('tier 2')) {
    return SENIORITY_HOURLY_COST_RATES.Mid;
  }
  return SENIORITY_HOURLY_COST_RATES.Junior;
}

export interface SpecialistCostItem {
  member: TeamMember;
  hours: number;
  hourlyCost: number;
  totalMonthlyCost: number;
  sharePercent: number;
}

export interface SeniorityMismatchAlert {
  hasMismatch: boolean;
  seniorMemberName?: string;
  hoursAllocated: number;
  marginLeakDollars: number;
  potentialMarginGainPercent: number;
  recommendation: string;
}

export interface ProjectFinancialAnalysis {
  monthlyRetainerRevenue: number;
  totalMonthlySquadCost: number;
  grossProfitDollars: number;
  grossMarginPercent: number;
  marginTier: 'high' | 'standard' | 'low';
  seniorityMismatch: SeniorityMismatchAlert;
  specialistBreakdown: SpecialistCostItem[];
  paymentHoldActive: boolean;
}

/**
 * Computes exact gross margin, loaded internal cost, and seniority balance for any active project
 */
export function calculateProjectFinancials(
  project: any,
  allMembers: TeamMember[]
): ProjectFinancialAnalysis {
  // Determine monthly retainer revenue
  let monthlyRetainerRevenue = 0;
  if (project.monthlyPrice && !isNaN(Number(project.monthlyPrice))) {
    monthlyRetainerRevenue = Number(project.monthlyPrice);
  } else if (project.estimatedValueNumeric && !isNaN(Number(project.estimatedValueNumeric))) {
    monthlyRetainerRevenue = Number(project.estimatedValueNumeric);
  } else if (project.budget && typeof project.budget === 'string') {
    const parsed = Number(project.budget.replace(/[^0-9.]/g, ''));
    if (!isNaN(parsed) && parsed > 0) monthlyRetainerRevenue = parsed;
  }

  // Fallback: estimate based on hours * target agency billable rate ($85/h)
  if (!monthlyRetainerRevenue || monthlyRetainerRevenue === 0) {
    const hours = Number(project.totalHours) || Number(project.activeHours) || 20;
    monthlyRetainerRevenue = hours * 85;
  }

  // Identify assigned squad members and hours distribution
  const memberHoursMap: Record<string, number> = project.memberHoursMap || {};
  const squadMemberIds: string[] = project.members && Array.isArray(project.members)
    ? project.members.map((m: any) => (typeof m === 'string' ? m : m.id))
    : [];

  // Ensure project lead is counted
  if (project.projectLeadId && !squadMemberIds.includes(project.projectLeadId)) {
    squadMemberIds.push(project.projectLeadId);
  }
  if (project.clientCallAssigneeId && !squadMemberIds.includes(project.clientCallAssigneeId)) {
    squadMemberIds.push(project.clientCallAssigneeId);
  }

  const totalProjectHours = Number(project.activeHours) || Number(project.totalHours) || 20;
  const defaultHoursPerMember = squadMemberIds.length > 0
    ? Math.max(2, Math.round(totalProjectHours / squadMemberIds.length))
    : totalProjectHours;

  let totalMonthlySquadCost = 0;
  const specialistBreakdown: SpecialistCostItem[] = [];

  squadMemberIds.forEach((mId) => {
    const member = allMembers.find((m) => m.id === mId);
    if (!member) return;

    const hours = memberHoursMap[mId] || defaultHoursPerMember;
    const hourlyCost = getMemberCostPerHour(member);
    const totalMonthlyCost = hours * hourlyCost;
    totalMonthlySquadCost += totalMonthlyCost;

    specialistBreakdown.push({
      member,
      hours,
      hourlyCost,
      totalMonthlyCost,
      sharePercent: totalProjectHours > 0 ? Math.round((hours / totalProjectHours) * 100) : 0
    });
  });

  // If no members explicitly in squad, assign general blended execution cost
  if (specialistBreakdown.length === 0) {
    totalMonthlySquadCost = totalProjectHours * 35;
  }

  const grossProfitDollars = Math.round(monthlyRetainerRevenue - totalMonthlySquadCost);
  const grossMarginPercent = monthlyRetainerRevenue > 0
    ? Math.round((grossProfitDollars / monthlyRetainerRevenue) * 100)
    : 0;

  let marginTier: ProjectFinancialAnalysis['marginTier'] = 'standard';
  if (grossMarginPercent >= 60) marginTier = 'high';
  else if (grossMarginPercent < 45) marginTier = 'low';

  // Seniority Misalignment Detection:
  // Flags if a high-ticket Senior ($58/h) is assigned >35% of hours on low-fee account (<$1,200) or TIER_B_LOCAL
  const isBudgetAccount = monthlyRetainerRevenue <= 1200 || project.clientTier === 'TIER_B_LOCAL';
  let seniorityMismatch: SeniorityMismatchAlert = {
    hasMismatch: false,
    hoursAllocated: 0,
    marginLeakDollars: 0,
    potentialMarginGainPercent: 0,
    recommendation: ''
  };

  const seniorSpecialist = specialistBreakdown.find(
    (s) => getMemberCostPerHour(s.member) >= 55 && s.sharePercent >= 30
  );

  if (isBudgetAccount && seniorSpecialist) {
    // Calculate potential savings if swapped with a Mid ($36/h) or Junior ($22/h)
    const savingsPerHour = seniorSpecialist.hourlyCost - 28; // average junior/mid
    const marginLeak = Math.round(seniorSpecialist.hours * savingsPerHour);
    const newProfit = grossProfitDollars + marginLeak;
    const newMargin = Math.min(85, Math.round((newProfit / monthlyRetainerRevenue) * 100));

    seniorityMismatch = {
      hasMismatch: true,
      seniorMemberName: seniorSpecialist.member.name,
      hoursAllocated: seniorSpecialist.hours,
      marginLeakDollars: marginLeak,
      potentialMarginGainPercent: Math.max(8, newMargin - grossMarginPercent),
      recommendation: `Senior Lead (${seniorSpecialist.member.name.split(' ')[0]}) is allocated ${seniorSpecialist.hours}h on this budget account. Swapping with a Junior/Mid specialist saves $${marginLeak}/mo and boosts margin by +${Math.max(8, newMargin - grossMarginPercent)}%.`
    };
  }

  // Cash-Flow Guardrail: Overdue invoices trigger a deliverable hold warning
  const paymentHoldActive = (project.paymentStatus || '').toLowerCase().includes('overdue');

  return {
    monthlyRetainerRevenue,
    totalMonthlySquadCost,
    grossProfitDollars,
    grossMarginPercent,
    marginTier,
    seniorityMismatch,
    specialistBreakdown,
    paymentHoldActive
  };
}

export interface AgencyFinancialSummary {
  totalMonthlyRevenue: number;
  totalMonthlyPayroll: number;
  netProjectedProfit: number;
  blendedGrossMarginPercent: number;
  lowMarginCount: number;
  mismatchCount: number;
}

/**
 * Aggregates financials across all active agency retainers
 */
export function calculateAgencyOverallFinancials(
  projects: any[],
  allMembers: TeamMember[]
): AgencyFinancialSummary {
  let totalMonthlyRevenue = 0;
  let totalMonthlyPayroll = 0;
  let lowMarginCount = 0;
  let mismatchCount = 0;

  projects.forEach((proj) => {
    const fin = calculateProjectFinancials(proj, allMembers);
    totalMonthlyRevenue += fin.monthlyRetainerRevenue;
    totalMonthlyPayroll += fin.totalMonthlySquadCost;
    if (fin.marginTier === 'low') lowMarginCount++;
    if (fin.seniorityMismatch.hasMismatch) mismatchCount++;
  });

  const netProjectedProfit = totalMonthlyRevenue - totalMonthlyPayroll;
  const blendedGrossMarginPercent = totalMonthlyRevenue > 0
    ? Math.round((netProjectedProfit / totalMonthlyRevenue) * 100)
    : 0;

  return {
    totalMonthlyRevenue,
    totalMonthlyPayroll,
    netProjectedProfit,
    blendedGrossMarginPercent,
    lowMarginCount,
    mismatchCount
  };
}

export interface MemberRoiStats {
  monthlySalaryCost: number;
  monthlyRetainerValueGenerated: number;
  roiMultiplier: number; // e.g. 4.2
  billableHours: number;
  billableUtilizationPercent: number;
}

/**
 * Computes specialist salary vs revenue generated multiplier and billable utilization
 */
export function calculateMemberROI(
  member: TeamMember,
  projects: any[],
  tasks: Task[]
): MemberRoiStats {
  const hourlyCost = getMemberCostPerHour(member);
  const monthlySalaryCost = member.weeklyCapacityHours * 4 * hourlyCost;

  // Compute billable client hours assigned to member across tasks and projects
  let billableHours = 0;
  tasks.forEach((t) => {
    if (t.assignedUserId === member.id && t.status !== 'backlog') {
      billableHours += Number(t.estimatedHours) || 0;
    }
  });

  // Also include project squad hours share
  let monthlyRetainerValueGenerated = 0;
  projects.forEach((p) => {
    const fin = calculateProjectFinancials(p, [member]);
    const isAssigned = (p.members || []).some((m: any) => (typeof m === 'string' ? m === member.id : m.id === member.id)) ||
      p.projectLeadId === member.id ||
      p.clientCallAssigneeId === member.id;

    if (isAssigned) {
      const share = 1 / Math.max(1, p.members?.length || 1);
      monthlyRetainerValueGenerated += Math.round(fin.monthlyRetainerRevenue * share);
    }
  });

  if (monthlyRetainerValueGenerated === 0) {
    monthlyRetainerValueGenerated = Math.round(billableHours * 4 * 85);
  }

  const roiMultiplier = monthlySalaryCost > 0
    ? Number((monthlyRetainerValueGenerated / monthlySalaryCost).toFixed(1))
    : 3.5;

  const billableUtilizationPercent = member.weeklyCapacityHours > 0
    ? Math.min(100, Math.round((billableHours / member.weeklyCapacityHours) * 100))
    : 80;

  return {
    monthlySalaryCost,
    monthlyRetainerValueGenerated,
    roiMultiplier,
    billableHours,
    billableUtilizationPercent
  };
}

import { getNextDeliverableDueInfo } from './dateUtils';

export interface ProjectAttentionAnalysis {
  needsAttention: boolean;
  isOverScope: boolean;
  isHighBurn: boolean;
  hasOverdueDeliverable: boolean;
  hasPaymentHold: boolean;
  isCriticalHealth: boolean;
  overageHours: number;
  reasons: string[];
}

export function checkProjectNeedsAttention(project: any): ProjectAttentionAnalysis {
  const budget = Math.max(1, project.activeHours || project.totalHours || 1);
  const logged = project.actualHoursLogged || 0;
  const isOverScope = logged > budget || (project.progress || 0) > 100;
  const burnPercent = logged > 0 ? Math.round((logged / budget) * 100) : (project.progress || 0);
  const isHighBurn = !isOverScope && burnPercent >= 85;
  const overageHours = logged > budget
    ? Math.round((logged - budget) * 10) / 10
    : burnPercent > 100
    ? Math.round(((burnPercent - 100) / 100) * budget * 10) / 10
    : 0;

  const dueInfo = getNextDeliverableDueInfo(project);
  const hasOverdueDeliverable = dueInfo.urgency === 'overdue' || dueInfo.urgency === 'due_today';
  const hasPaymentHold = project.paymentStatus === 'Overdue';
  const isCriticalHealth =
    (project.projectHealthEmoji || '').includes('Critical') ||
    project.projectHealthEmoji === '☺☺☺';

  const reasons: string[] = [];
  if (isOverScope) reasons.push(`+${overageHours}h over scope`);
  if (hasOverdueDeliverable) reasons.push(dueInfo.label);
  if (hasPaymentHold) reasons.push(`Invoice ${project.paymentInvoiceId || 'payment'} overdue`);
  if (isHighBurn) reasons.push(`High burn (${burnPercent}%)`);
  if (isCriticalHealth) reasons.push('Critical health alert');

  return {
    needsAttention: isOverScope || hasOverdueDeliverable || hasPaymentHold || isCriticalHealth || isHighBurn,
    isOverScope,
    isHighBurn,
    hasOverdueDeliverable,
    hasPaymentHold,
    isCriticalHealth,
    overageHours,
    reasons
  };
}
