import { describe, it, expect } from 'vitest';
import {
  formatLocalDate,
  todayLocal,
  daysFromToday,
  firstDayOfCurrentMonth,
  monthOption
} from '../src/utils/dateUtils';

describe('dateUtils', () => {
  it('should format a date to YYYY-MM-DD correctly', () => {
    const d = new Date(2026, 8, 20); // Sept 20, 2026
    expect(formatLocalDate(d)).toBe('2026-09-20');
  });

  it('should format todayLocal in YYYY-MM-DD pattern', () => {
    const today = todayLocal();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should compute daysFromToday correctly', () => {
    const todayStr = todayLocal();
    const futureStr = daysFromToday(5);
    const pastStr = daysFromToday(-5);

    expect(futureStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(pastStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const todayMs = new Date(todayStr).getTime();
    const futureMs = new Date(futureStr).getTime();
    expect(futureMs).toBeGreaterThanOrEqual(todayMs);
  });

  it('should get firstDayOfCurrentMonth as YYYY-MM-01', () => {
    const firstDay = firstDayOfCurrentMonth();
    expect(firstDay).toMatch(/^\d{4}-\d{2}-01$/);
  });

  it('should format monthOption with correct ID and label', () => {
    const currentOption = monthOption(0);
    expect(currentOption.id).toMatch(/^\d{4}-\d{2}$/);
    expect(currentOption.label.length).toBeGreaterThan(3);

    const nextOption = monthOption(1);
    expect(nextOption.id).toMatch(/^\d{4}-\d{2}$/);
  });
});
