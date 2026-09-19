import { describe, it, expect } from 'vitest';

export interface RetainerOverageResult {
  isScopeCreep: boolean;
  isHighBurn: boolean;
  burnPercent: number;
  overageHours: number;
  unusedHours: number;
  unbilledDollars: number;
}

export function computeRetainerBurn(params: {
  activeHours?: number;
  totalHours?: number;
  actualHoursLogged?: number;
  progress?: number;
  paymentAmountNumeric?: number;
}): RetainerOverageResult {
  const budget = Math.max(1, params.activeHours || params.totalHours || 1);
  const logged = params.actualHoursLogged || 0;
  const burnRatio = logged > 0 ? (logged / budget) : ((params.progress || 0) / 100);
  const burnPercent = Math.round(burnRatio * 100);
  const isScopeCreep = logged > budget || burnPercent >= 100;
  const isHighBurn = !isScopeCreep && burnPercent >= 85;
  const unusedHours = Math.max(0, budget - logged);

  const overageHours = logged > budget
    ? Math.round((logged - budget) * 10) / 10
    : burnPercent > 100
    ? Math.round(((burnPercent - 100) / 100) * budget * 10) / 10
    : 0;

  const effectiveRate = (params.paymentAmountNumeric || 0) > 0 && budget > 0
    ? Math.round((params.paymentAmountNumeric || 0) / budget)
    : 85;
  const unbilledDollars = Math.round(overageHours * effectiveRate);

  return {
    isScopeCreep,
    isHighBurn,
    burnPercent,
    overageHours,
    unusedHours,
    unbilledDollars
  };
}

export function applyQuickMemo(
  project: { id: string; quickMemo?: string; quickMemoUpdatedAt?: string },
  text: string,
  timestamp: string
) {
  const trimmed = text.trim();
  if (!trimmed) {
    const { quickMemo, quickMemoUpdatedAt, ...rest } = project;
    return rest;
  }
  return {
    ...project,
    quickMemo: trimmed,
    quickMemoUpdatedAt: timestamp
  };
}

describe('Feature 5: Precise Retainer Overage Indicator', () => {
  it('detects healthy burn below 85% with 0 overage', () => {
    const result = computeRetainerBurn({
      activeHours: 20,
      actualHoursLogged: 12,
      paymentAmountNumeric: 2000
    });

    expect(result.isScopeCreep).toBe(false);
    expect(result.isHighBurn).toBe(false);
    expect(result.burnPercent).toBe(60);
    expect(result.overageHours).toBe(0);
    expect(result.unusedHours).toBe(8);
    expect(result.unbilledDollars).toBe(0);
  });

  it('detects high burn (85% to 99%) and reports remaining hours', () => {
    const result = computeRetainerBurn({
      activeHours: 20,
      actualHoursLogged: 18,
      paymentAmountNumeric: 2000
    });

    expect(result.isScopeCreep).toBe(false);
    expect(result.isHighBurn).toBe(true);
    expect(result.burnPercent).toBe(90);
    expect(result.overageHours).toBe(0);
    expect(result.unusedHours).toBe(2);
  });

  it('accurately calculates scope creep (+Xh over scope) and unbilled value', () => {
    const result = computeRetainerBurn({
      activeHours: 20,
      actualHoursLogged: 24.5,
      paymentAmountNumeric: 2000 // effective rate $100/hr
    });

    expect(result.isScopeCreep).toBe(true);
    expect(result.isHighBurn).toBe(false);
    expect(result.burnPercent).toBe(123);
    expect(result.overageHours).toBe(4.5);
    expect(result.unbilledDollars).toBe(450); // 4.5h * $100
  });

  it('uses default $85/hr agency rate when payment amount is missing', () => {
    const result = computeRetainerBurn({
      activeHours: 10,
      actualHoursLogged: 12.2
    });

    expect(result.isScopeCreep).toBe(true);
    expect(result.overageHours).toBe(2.2);
    expect(result.unbilledDollars).toBe(187); // 2.2h * $85 = 187
  });
});

describe('Feature 3: 1-Click Quick Memo on Project Cards', () => {
  it('saves quick memo with custom timestamp and trims input', () => {
    const initialProject = { id: 'p1' };
    const updated = applyQuickMemo(initialProject, '  Client requested sync on Friday  ', 'Sep 20, 2:30 AM');

    expect(updated.quickMemo).toBe('Client requested sync on Friday');
    expect(updated.quickMemoUpdatedAt).toBe('Sep 20, 2:30 AM');
  });

  it('clears quick memo when empty string is submitted', () => {
    const projectWithMemo = {
      id: 'p1',
      quickMemo: 'Old memo',
      quickMemoUpdatedAt: 'Sep 19, 10:00 AM'
    };
    const cleared = applyQuickMemo(projectWithMemo, '   ', 'Sep 20, 2:30 AM');

    expect(cleared.quickMemo).toBeUndefined();
    expect(cleared.quickMemoUpdatedAt).toBeUndefined();
  });
});

import { getNextDeliverableDueInfo, daysFromToday } from '../src/utils/dateUtils';

describe('Feature 2: Next Deliverable Due Pill', () => {
  it('returns completed status when all deliverables are done', () => {
    const project = {
      dueDateOrRenewal: '2026-10-01',
      taskBreakdown: [
        { taskType: 'SEO Audit', status: 'Completed', clickUpStatus: 'Complete' },
        { taskType: 'Content Brief', status: 'Done', clickUpStatus: 'Done' }
      ]
    };
    const info = getNextDeliverableDueInfo(project);
    expect(info.urgency).toBe('completed');
    expect(info.label).toBe('All deliverables complete');
  });

  it('detects past due deliverables and calculates negative days', () => {
    const project = {
      dueDateOrRenewal: daysFromToday(-3),
      taskBreakdown: [
        { taskType: 'Backlink Sprint', status: 'In Progress', clickUpStatus: 'Open' }
      ]
    };
    const info = getNextDeliverableDueInfo(project);
    expect(info.urgency).toBe('overdue');
    expect(info.daysRemaining).toBeLessThan(0);
    expect(info.label).toContain('past due');
  });

  it('detects urgent deliverables due in <= 3 days', () => {
    const project = {
      dueDateOrRenewal: daysFromToday(2),
      taskBreakdown: [
        { taskType: 'Technical Audit', status: 'In Progress', clickUpStatus: 'Active' }
      ]
    };
    const info = getNextDeliverableDueInfo(project);
    expect(info.urgency).toBe('urgent');
    expect(info.daysRemaining).toBe(2);
    expect(info.label).toContain('Due in 2d');
  });
});

describe('Feature 4: Specialist Reassignment on Deliverables', () => {
  function reassignDeliverable(
    project: {
      id: string;
      members: Array<{ id: string; name: string }>;
      taskBreakdown: Array<{ id: string; taskType: string; assigneeId: string }>;
    },
    taskId: string,
    newAssignee: { id: string; name: string }
  ) {
    const updatedTasks = project.taskBreakdown.map((t) =>
      t.id === taskId ? { ...t, assigneeId: newAssignee.id } : t
    );
    const updatedMembers = project.members.some((m) => m.id === newAssignee.id)
      ? project.members
      : [...project.members, newAssignee];

    return {
      ...project,
      taskBreakdown: updatedTasks,
      members: updatedMembers
    };
  }

  it('reassigns deliverable assignee and auto-adds member to project squad', () => {
    const project = {
      id: 'p1',
      members: [{ id: 'm1', name: 'Alice' }],
      taskBreakdown: [
        { id: 't1', taskType: 'On-Page SEO', assigneeId: 'm1' },
        { id: 't2', taskType: 'Content Brief', assigneeId: 'm1' }
      ]
    };
    const newSpecialist = { id: 'm2', name: 'Bob' };
    const updated = reassignDeliverable(project, 't2', newSpecialist);

    expect(updated.taskBreakdown.find((t) => t.id === 't2')?.assigneeId).toBe('m2');
    expect(updated.taskBreakdown.find((t) => t.id === 't1')?.assigneeId).toBe('m1');
    expect(updated.members.map((m) => m.id)).toContain('m2');
  });
});

import { checkProjectNeedsAttention } from '../src/utils/projectFinancials';

describe('Feature 3: Morning Huddle Attention Analysis', () => {
  it('flags accounts in scope creep with exact overage', () => {
    const project = {
      activeHours: 20,
      actualHoursLogged: 24,
      status: 'ON TRACK'
    };
    const analysis = checkProjectNeedsAttention(project);
    expect(analysis.needsAttention).toBe(true);
    expect(analysis.isOverScope).toBe(true);
    expect(analysis.overageHours).toBe(4);
    expect(analysis.reasons).toContain('+4h over scope');
  });

  it('flags accounts with overdue deliverables', () => {
    const project = {
      activeHours: 20,
      actualHoursLogged: 10,
      dueDateOrRenewal: daysFromToday(-2),
      taskBreakdown: [
        { taskType: 'Link Audit', status: 'In Progress' }
      ]
    };
    const analysis = checkProjectNeedsAttention(project);
    expect(analysis.needsAttention).toBe(true);
    expect(analysis.hasOverdueDeliverable).toBe(true);
  });

  it('flags accounts with overdue payment invoice holds', () => {
    const project = {
      activeHours: 20,
      actualHoursLogged: 10,
      paymentStatus: 'Overdue',
      paymentInvoiceId: 'INV-2024-88'
    };
    const analysis = checkProjectNeedsAttention(project);
    expect(analysis.needsAttention).toBe(true);
    expect(analysis.hasPaymentHold).toBe(true);
    expect(analysis.reasons).toContain('Invoice INV-2024-88 overdue');
  });

  it('passes healthy accounts with no alerts', () => {
    const project = {
      activeHours: 40,
      actualHoursLogged: 20,
      progress: 50,
      paymentStatus: 'Paid',
      dueDateOrRenewal: daysFromToday(15),
      taskBreakdown: [
        { taskType: 'Content Brief', status: 'In Progress' }
      ]
    };
    const analysis = checkProjectNeedsAttention(project);
    expect(analysis.needsAttention).toBe(false);
    expect(analysis.reasons).toHaveLength(0);
  });
});


