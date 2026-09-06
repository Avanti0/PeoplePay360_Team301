// Shared month-navigation helpers for attendance logs, kept to a single
// calendar month at a time (like a monthly statement) rather than an
// unbounded, ever-growing history.

const MONTH_KEY_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function parseMonthKey(raw: string | null): string {
  return raw && MONTH_KEY_RE.test(raw) ? raw : currentMonthKey();
}

export function monthRange(monthKey: string): { dateFrom: string; dateTo: string } {
  const [year, month] = monthKey.split('-').map(Number);
  const dateFrom = `${monthKey}-01`;
  const lastDay = new Date(year, month, 0).getDate(); // day 0 of next month = last day of this one
  const dateTo = `${monthKey}-${String(lastDay).padStart(2, '0')}`;
  return { dateFrom, dateTo };
}

export function shiftMonth(monthKey: string, delta: number): string {
  const [year, month] = monthKey.split('-').map(Number);
  const d = new Date(year, month - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function isCurrentMonth(monthKey: string): boolean {
  return monthKey === currentMonthKey();
}
