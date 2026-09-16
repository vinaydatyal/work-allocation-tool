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
