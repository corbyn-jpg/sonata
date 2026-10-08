// Calendar helpers in the user's local time. Pure, so they're easy to test.

/** Local calendar day*/
export function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** The date a day key stands for (the reverse of dayKey), at local midnight. */
export function fromDayKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function startOfDay(date: Date): Date {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  return day;
}

/** Calendar days, so it stays correct across daylight-saving changes. */
export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Monday 00:00 of the week containing `date`. */
export function startOfWeek(date: Date): Date {
  const day = startOfDay(date);
  const sinceMonday = (day.getDay() + 6) % 7; // getDay(): Sunday = 0
  return addDays(day, -sinceMonday);
}

/**
 Consecutive days with at least one check-in, ending today. If today isn't logged yet the run ends yesterday, so the streak doesn't reset each morning.
 */
export function streakLength(dates: Date[], today = new Date()): number {
  const logged = new Set(dates.map(dayKey));
  let day = startOfDay(today);
  if (!logged.has(dayKey(day))) day = addDays(day, -1);

  let count = 0;
  while (logged.has(dayKey(day))) {
    count++;
    day = addDays(day, -1);
  }
  return count;
}
