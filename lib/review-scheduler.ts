// D1/D3/D7 复测调度 — 按真实日期计算，绝不用"连续答对次数"替代

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function toDateStr(d: Date): string {
  // YYYY-MM-DD 本地时区
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDate(s: string): Date {
  // 把 YYYY-MM-DD 解析为本地时区的 Date
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function todayStr(): string {
  return toDateStr(new Date());
}

export interface ReviewSchedule {
  d1: string;
  d3: string;
  d7: string;
}

export function scheduleReview(firstErrorDateStr: string): ReviewSchedule {
  const base = parseDate(firstErrorDateStr);
  return {
    d1: toDateStr(addDays(base, 1)),
    d3: toDateStr(addDays(base, 3)),
    d7: toDateStr(addDays(base, 7)),
  };
}

// D1 失败重排：失败当天 +1
export function rescheduleOnFailure(failureDateStr: string): string {
  const base = parseDate(failureDateStr);
  return toDateStr(addDays(base, 1));
}

export type Interval = 1 | 3 | 7;

export function nextInterval(current: Interval): Interval | null {
  if (current === 1) return 3;
  if (current === 3) return 7;
  return null; // D7 之后不再排
}
