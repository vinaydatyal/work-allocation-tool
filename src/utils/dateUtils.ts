const toLocalDateParts = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return { year, month, day };
};

export const formatLocalDate = (date: Date): string => {
  const { year, month, day } = toLocalDateParts(date);
  return `${year}-${month}-${day}`;
};

export const todayLocal = (): string => formatLocalDate(new Date());

export const daysFromToday = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return formatLocalDate(date);
};

export const firstDayOfCurrentMonth = (): string => {
  const now = new Date();
  return formatLocalDate(new Date(now.getFullYear(), now.getMonth(), 1));
};

export const monthOption = (monthOffset: number) => {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  return {
    id: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
    label: date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  };
};

export interface DeliverableDueInfo {
  label: string;
  daysRemaining: number | null;
  urgency: 'overdue' | 'due_today' | 'urgent' | 'upcoming' | 'completed' | 'none';
  badgeColor: string;
  taskName?: string;
}

export const getNextDeliverableDueInfo = (project: {
  dueDateOrRenewal?: string;
  taskBreakdown?: Array<{
    taskType: string;
    status?: string;
    clickUpStatus?: string;
    dueDate?: string;
  }>;
}): DeliverableDueInfo => {
  const isDone = (status?: string) => {
    const s = (status || '').toLowerCase();
    return s.includes('done') || s.includes('complete') || s.includes('closed');
  };

  const activeTasks = (project.taskBreakdown || []).filter(
    (tb) => !isDone(tb.clickUpStatus || tb.status)
  );

  if ((project.taskBreakdown || []).length > 0 && activeTasks.length === 0) {
    return {
      label: 'All deliverables complete',
      daysRemaining: null,
      urgency: 'completed',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
    };
  }

  // Find next active task name
  const nextTaskName = activeTasks.length > 0 ? activeTasks[0].taskType : undefined;

  // Resolve target due date string
  const rawDateStr = activeTasks.find((t) => t.dueDate)?.dueDate || project.dueDateOrRenewal || '';

  if (!rawDateStr) {
    return {
      label: nextTaskName ? `Next: ${nextTaskName}` : 'No due date',
      daysRemaining: null,
      urgency: 'none',
      badgeColor: 'bg-slate-800/80 text-slate-400 border-slate-700',
      taskName: nextTaskName
    };
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const dayMatch = rawDateStr.match(/(\d{1,2})(?:st|nd|rd|th)?/i);
  let targetDate: Date | null = null;

  const parsedMs = Date.parse(rawDateStr);
  if (!isNaN(parsedMs) && !rawDateStr.toLowerCase().includes('renewal:')) {
    targetDate = new Date(parsedMs);
    targetDate.setHours(0, 0, 0, 0);
  } else if (dayMatch) {
    const targetDay = parseInt(dayMatch[1], 10);
    if (targetDay >= 1 && targetDay <= 31) {
      const year = now.getFullYear();
      const month = now.getMonth();
      let candidate = new Date(year, month, targetDay);
      candidate.setHours(0, 0, 0, 0);
      if (candidate.getTime() < now.getTime()) {
        candidate = new Date(year, month + 1, targetDay);
        candidate.setHours(0, 0, 0, 0);
      }
      targetDate = candidate;
    }
  }

  if (!targetDate) {
    return {
      label: nextTaskName ? `🎯 ${nextTaskName} (${rawDateStr})` : rawDateStr,
      daysRemaining: null,
      urgency: 'upcoming',
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      taskName: nextTaskName
    };
  }

  const diffMs = targetDate.getTime() - now.getTime();
  const daysDiff = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (daysDiff < 0) {
    return {
      label: nextTaskName ? `⚠️ ${nextTaskName} (${Math.abs(daysDiff)}d past due)` : `⚠️ ${Math.abs(daysDiff)}d past due`,
      daysRemaining: daysDiff,
      urgency: 'overdue',
      badgeColor: 'bg-rose-500/25 text-rose-300 border-rose-500/50',
      taskName: nextTaskName
    };
  }
  if (daysDiff === 0) {
    return {
      label: nextTaskName ? `🚨 ${nextTaskName} (Due today)` : `🚨 Due today`,
      daysRemaining: 0,
      urgency: 'due_today',
      badgeColor: 'bg-rose-500/25 text-rose-300 border-rose-500/50 animate-pulse',
      taskName: nextTaskName
    };
  }
  if (daysDiff <= 3) {
    return {
      label: nextTaskName ? `⚡ ${nextTaskName} (Due in ${daysDiff}d)` : `⚡ Due in ${daysDiff}d`,
      daysRemaining: daysDiff,
      urgency: 'urgent',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      taskName: nextTaskName
    };
  }
  return {
    label: nextTaskName ? `🎯 ${nextTaskName} (Due in ${daysDiff}d)` : `🎯 Due in ${daysDiff}d`,
    daysRemaining: daysDiff,
    urgency: 'upcoming',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    taskName: nextTaskName
  };
};

