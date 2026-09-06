// Shared URL-driven pagination helpers, so every paginated list (Employees,
// Attendance, Time Off) behaves identically: same allowed page sizes, same
// safe clamping of invalid page/limit values, same page-number window.

export const ALLOWED_PAGE_LIMITS = [10, 25, 50, 100];
export const DEFAULT_PAGE_LIMIT = 10;

export function parsePage(raw: string | null): number {
  const n = parseInt(raw ?? '', 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

export function parseLimit(raw: string | null): number {
  const n = parseInt(raw ?? '', 10);
  return ALLOWED_PAGE_LIMITS.includes(n) ? n : DEFAULT_PAGE_LIMIT;
}

export function getPageNumbers(current: number, total: number): number[] {
  const maxButtons = 5;
  if (total <= maxButtons) return Array.from({ length: total }, (_, i) => i + 1);
  let start = Math.max(1, current - 2);
  const end = Math.min(total, start + maxButtons - 1);
  start = Math.max(1, end - maxButtons + 1);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}
