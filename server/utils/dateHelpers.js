/**
 * Date helper utilities for streak calculation and week boundaries.
 * All dates are handled as 'YYYY-MM-DD' strings for consistency.
 */

/**
 * Format a Date object to 'YYYY-MM-DD' string.
 */
function formatDate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get today's date as 'YYYY-MM-DD'.
 */
function getToday() {
  return formatDate(new Date());
}

/**
 * Get the Monday of the week containing the given date (ISO week).
 */
function getWeekStart(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Adjust so Monday is start
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  return formatDate(monday);
}

/**
 * Get the Sunday of the week containing the given date.
 */
function getWeekEnd(dateStr) {
  const monday = getWeekStart(dateStr);
  const sunday = new Date(monday + 'T00:00:00');
  sunday.setDate(sunday.getDate() + 6);
  return formatDate(sunday);
}

/**
 * Get the day of week index (0=Monday, 6=Sunday) for a date string.
 */
function getDayOfWeek(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  const day = date.getDay();
  return day === 0 ? 6 : day - 1; // Convert: Sun=0 → 6, Mon=1 → 0, etc.
}

/**
 * Generate an array of date strings from startDate to endDate inclusive.
 */
function getDateRange(startDate, endDate) {
  const dates = [];
  const current = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  while (current <= end) {
    dates.push(formatDate(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

/**
 * Subtract N days from a date string.
 */
function subtractDays(dateStr, days) {
  const date = new Date(dateStr + 'T00:00:00');
  date.setDate(date.getDate() - days);
  return formatDate(date);
}

/**
 * Add N days to a date string.
 */
function addDays(dateStr, days) {
  const date = new Date(dateStr + 'T00:00:00');
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

module.exports = {
  formatDate,
  getToday,
  getWeekStart,
  getWeekEnd,
  getDayOfWeek,
  getDateRange,
  subtractDays,
  addDays,
};
