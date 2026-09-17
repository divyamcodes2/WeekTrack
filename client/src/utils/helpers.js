/**
 * Client-side date utilities.
 */

export function formatDate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getToday() {
  return formatDate(new Date());
}

export function getWeekStart(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  return formatDate(monday);
}

export function getWeekEnd(dateStr) {
  const monday = getWeekStart(dateStr);
  const sunday = new Date(monday + 'T00:00:00');
  sunday.setDate(sunday.getDate() + 6);
  return formatDate(sunday);
}

export function getWeekDates(dateStr) {
  const start = getWeekStart(dateStr);
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start + 'T00:00:00');
    d.setDate(d.getDate() + i);
    dates.push(formatDate(d));
  }
  return dates;
}

export function addDays(dateStr, days) {
  const date = new Date(dateStr + 'T00:00:00');
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

export function subtractDays(dateStr, days) {
  return addDays(dateStr, -days);
}

export function getDayName(dateStr, short = true) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: short ? 'short' : 'long',
  });
}

export function getDayNumber(dateStr) {
  return new Date(dateStr + 'T00:00:00').getDate();
}

export function getMonthName(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
  });
}

export function isToday(dateStr) {
  return dateStr === getToday();
}

export function isFuture(dateStr) {
  return dateStr > getToday();
}

export function formatDisplayDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const HABIT_COLORS = [
  '#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#EC4899',
  '#8B5CF6', '#06B6D4', '#F97316', '#14B8A6', '#6366F1',
];

export const STREAK_MILESTONES = [7, 14, 30, 50, 100, 365];
