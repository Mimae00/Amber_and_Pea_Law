import type { DayOfWeek } from '../api/types';

const DAY_NAMES: DayOfWeek[] = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

/** Parses yyyy-MM-dd as a calendar date (UTC midnight) so arithmetic is timezone-independent. */
function parseDate(d: string): Date {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, day ?? 1));
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Calendar dates from min to max (inclusive) that fall on business days. */
export function businessDates(min: string, max: string, businessDays: DayOfWeek[]): string[] {
  const out: string[] = [];
  const end = parseDate(max);
  for (let d = parseDate(min); d <= end && out.length < 400; d.setUTCDate(d.getUTCDate() + 1)) {
    if (businessDays.includes(DAY_NAMES[d.getUTCDay()]!)) out.push(formatDate(d));
  }
  return out;
}

/** "Tue, Oct 6" for a calendar date. */
export function formatDayShort(date: string): { weekday: string; day: string; month: string; full: string } {
  const d = parseDate(date);
  const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-US', { ...o, timeZone: 'UTC' }).format(d);
  return {
    weekday: fmt({ weekday: 'short' }),
    day: fmt({ day: 'numeric' }),
    month: fmt({ month: 'short' }),
    full: fmt({ weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
  };
}

/** Time of an instant in the firm's timezone, e.g. "9:30 AM". */
export function formatTime(instant: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone }).format(new Date(instant));
}

/** Full date and time of an instant in the firm's timezone. */
export function formatDateTime(instant: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
    timeZoneName: 'short',
  }).format(new Date(instant));
}

/** Short date + time for tables. */
export function formatCompact(instant: string, timeZone?: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    ...(timeZone ? { timeZone } : {}),
  }).format(new Date(instant));
}

/** Readable zone name, e.g. "Central Time". */
export function zoneLabel(timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longGeneric' }).formatToParts(new Date());
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? timeZone;
  } catch {
    return timeZone;
  }
}
