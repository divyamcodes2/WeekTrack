import { useState, useEffect, useMemo } from 'react';
import {
  History,
  Calendar,
  CalendarDays,
  CheckCircle2,
  XCircle,
  Timer,
  Pencil,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Filter,
  Sparkles,
  Clock,
  Check,
  RotateCcw,
  CheckSquare,
} from 'lucide-react';
import api from '../../services/api';
import { getToday, subtractDays } from '../../utils/helpers';
import toast from 'react-hot-toast';

export default function HistoryPage() {
  const today = getToday();
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [filterRange, setFilterRange] = useState('30d'); // '7d' | '30d' | 'all' | 'custom'
  const [customStart, setCustomStart] = useState(subtractDays(today, 14));
  const [customEnd, setCustomEnd] = useState(today);
  const [journalOnly, setJournalOnly] = useState(false);
  const [showInactiveDays, setShowInactiveDays] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Expandable days tracking (set of date strings)
  const [expandedDates, setExpandedDates] = useState(new Set());

  // Fetch history data
  const fetchHistory = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterRange === 'custom') {
        params.startDate = customStart;
        params.endDate = customEnd;
      } else {
        params.range = filterRange;
      }
      if (journalOnly) {
        params.hasJournal = 'true';
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const res = await api.get('/history', { params });
      setDays(res.data.days || []);
    } catch {
      toast.error('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [filterRange, journalOnly]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchHistory();
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleCustomRangeApply = (e) => {
    e.preventDefault();
    if (customStart > customEnd) {
      toast.error('Start date cannot be after end date');
      return;
    }
    fetchHistory();
  };

  const toggleExpand = (date) => {
    setExpandedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  };

  const expandAll = () => {
    const all = new Set(filteredDays.map((d) => d.date));
    setExpandedDates(all);
  };

  const collapseAll = () => {
    setExpandedDates(new Set());
  };

  const resetFilters = () => {
    setFilterRange('30d');
    setJournalOnly(false);
    setShowInactiveDays(false);
    setSearchQuery('');
  };

  // Filter out days without activity unless showInactiveDays is checked or search is active
  const filteredDays = useMemo(() => {
    if (showInactiveDays || searchQuery.trim() || journalOnly) {
      return days;
    }
    return days.filter((d) => d.hasActivity);
  }, [days, showInactiveDays, searchQuery, journalOnly]);

  // Highlight search text helper
  const renderHighlighted = (text, query) => {
    if (!query || !query.trim() || !text) return text;
    const q = query.trim();
    const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark
          key={i}
          className="bg-amber-400/40 text-[var(--color-text)] font-semibold rounded px-1 py-0.5"
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  // Format date helper: "Tuesday, Sep 16, 2026"
  const formatFullDate = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getRelativeDay = (dateStr) => {
    if (dateStr === today) return 'Today';
    const dToday = new Date(today + 'T00:00:00');
    const d = new Date(dateStr + 'T00:00:00');
    const diffTime = dToday - d;
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 1) return 'Yesterday';
    if (diffDays > 1 && diffDays <= 7) return `${diffDays} days ago`;
    return null;
  };

  return (
    <div className="animate-fade-in space-y-7 max-w-4xl mx-auto pb-12">
      {/* ─── Page Title Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-primary-light)] text-xs font-semibold text-[var(--color-primary)] mb-2">
            <History size={14} />
            <span>Activity Log</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-text)]">
            History
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Browse your past habit achievements, reflections, and focus sessions over time.
          </p>
        </div>

        {/* Global Expand / Collapse All */}
        {filteredDays.length > 0 && (
          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              onClick={expandAll}
              className="text-xs font-medium px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] hover:bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="text-xs font-medium px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] hover:bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors"
            >
              Collapse All
            </button>
          </div>
        )}
      </div>

      {/* ─── Control Bar: Filters & Search ─── */}
      <div className="bg-[var(--color-surface)] rounded-[var(--radius-xl)] border border-[var(--color-border)] p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Quick Date Range Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-[var(--color-bg)] p-1 rounded-[var(--radius-lg)] border border-[var(--color-border)]/60 self-start md:self-auto">
            {[
              { id: '7d', label: 'Last 7 days' },
              { id: '30d', label: 'Last 30 days' },
              { id: 'all', label: 'All time' },
              { id: 'custom', label: 'Custom range' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterRange(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-[var(--radius-md)] transition-all cursor-pointer ${
                  filterRange === tab.id
                    ? 'bg-[var(--color-surface)] text-[var(--color-text)] font-semibold shadow-xs'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Journal-only toggle */}
          <button
            onClick={() => setJournalOnly((prev) => !prev)}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-[var(--radius-lg)] border transition-all cursor-pointer self-start md:self-auto ${
              journalOnly
                ? 'bg-amber-500/10 border-amber-500/50 text-amber-600 dark:text-amber-400 font-semibold'
                : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)]'
            }`}
          >
            <BookOpen size={14} className={journalOnly ? 'text-amber-500' : ''} />
            <span>With Reflections only</span>
          </button>
        </div>

        {/* Custom Date Range Picker Form */}
        {filterRange === 'custom' && (
          <form
            onSubmit={handleCustomRangeApply}
            className="flex flex-wrap items-center gap-3 pt-3 border-t border-[var(--color-border)]/60 text-xs"
          >
            <div className="flex items-center gap-2">
              <span className="text-[var(--color-text-secondary)] font-medium">From:</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-2.5 py-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[var(--color-text-secondary)] font-medium">To:</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-2.5 py-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
              />
            </div>
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-[var(--radius-md)] bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-medium cursor-pointer transition-colors shadow-xs"
            >
              Apply Range
            </button>
          </form>
        )}

        {/* Search Bar for Reflections */}
        <div className="pt-2">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search past reflections and journal notes..."
              className="w-full pl-9 pr-9 py-2.5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg)] text-xs sm:text-sm text-[var(--color-text)] placeholder-[var(--color-text-secondary)]/70 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Status bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs text-[var(--color-text-secondary)]">
          <div>
            Showing <strong className="text-[var(--color-text)]">{filteredDays.length}</strong> day
            {filteredDays.length === 1 ? '' : 's'} with history
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showInactiveDays}
                onChange={(e) => setShowInactiveDays(e.target.checked)}
                className="rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-0 cursor-pointer"
              />
              <span>Include inactive days</span>
            </label>
            {(journalOnly || searchQuery || filterRange !== '30d') && (
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-1 text-[var(--color-primary)] hover:underline font-medium cursor-pointer"
              >
                <RotateCcw size={12} />
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── Timeline Content Area ─── */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-32 animate-shimmer rounded-[var(--radius-xl)] border border-[var(--color-border)]"
            />
          ))}
        </div>
      ) : filteredDays.length === 0 ? (
        /* Empty State */
        <div className="text-center py-16 px-6 bg-[var(--color-surface)] rounded-[var(--radius-xl)] border border-[var(--color-border)] space-y-3">
          <div className="w-14 h-14 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center mx-auto mb-2">
            <History size={26} />
          </div>
          <h3 className="text-lg font-bold text-[var(--color-text)]">No history records found</h3>
          <p className="text-sm text-[var(--color-text-secondary)] max-w-md mx-auto">
            {searchQuery
              ? `No journal reflections matched "${searchQuery}". Try a different search keyword or clear filters.`
              : journalOnly
              ? 'No reflections recorded in this timeframe. Reflect on Today to start logging your thoughts!'
              : 'No activity was recorded in this time range. As you check off habits and write reflections, your timeline will fill up here.'}
          </p>
          {(searchQuery || journalOnly || filterRange !== 'all') && (
            <button
              onClick={resetFilters}
              className="mt-2 px-4 py-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-medium transition-colors shadow-xs"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        /* Timeline Cards List */
        <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-2.5 sm:before:left-3 before:top-4 before:bottom-4 before:w-0.5 before:bg-[var(--color-border)]">
          {filteredDays.map((day) => {
            const isExpanded = expandedDates.has(day.date);
            const relativeTag = getRelativeDay(day.date);
            const hasJournal = day.journal && day.journal.trim().length > 0;
            const hasFocus = day.focusMinutes > 0;

            return (
              <div key={day.date} className="relative">
                {/* Timeline node marker */}
                <div
                  className={`absolute -left-6 sm:-left-8 top-6 -translate-x-1/2 w-5 h-5 rounded-full border-2 border-[var(--color-surface)] flex items-center justify-center z-10 transition-colors ${
                    day.completionRate === 100
                      ? 'bg-[var(--color-success)] text-white'
                      : day.completionRate > 0
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-[var(--color-border)] text-[var(--color-text-secondary)]'
                  }`}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                </div>

                {/* Day Card Container */}
                <div
                  className={`rounded-[var(--radius-xl)] border transition-all duration-200 overflow-hidden ${
                    day.hasActivity
                      ? 'bg-[var(--color-surface)] border-[var(--color-border)] shadow-xs hover:border-[var(--color-border)]/90'
                      : 'bg-[var(--color-surface)]/60 border-[var(--color-border)]/50 opacity-75'
                  }`}
                >
                  {/* Card Header (Click to toggle expansion) */}
                  <div
                    onClick={() => toggleExpand(day.date)}
                    className="p-5 sm:p-6 cursor-pointer hover:bg-[var(--color-bg)]/40 transition-colors select-none"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Date & Relative info */}
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-base sm:text-lg font-bold text-[var(--color-text)]">
                            {formatFullDate(day.date)}
                          </h2>
                          {relativeTag && (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)]">
                              {relativeTag}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Summary Metrics Badges */}
                      <div className="flex items-center gap-2.5 flex-wrap">
                        {/* Completion Rate Pill */}
                        <div
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            day.completionRate >= 80
                              ? 'bg-[var(--color-success-light)] text-[var(--color-success)]'
                              : day.completionRate >= 50
                              ? 'bg-[var(--color-warning-light)] text-[var(--color-warning)]'
                              : 'bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-secondary)]'
                          }`}
                        >
                          <CheckCircle2 size={13} />
                          <span>
                            {day.completionRate}% ({day.completedCount}/{day.totalHabits})
                          </span>
                        </div>

                        {/* Focus Minutes Badge */}
                        {hasFocus && (
                          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] text-xs font-semibold">
                            <Timer size={13} />
                            <span>{day.focusMinutes}m focus</span>
                          </div>
                        )}

                        {/* Journal Indicator Badge */}
                        {hasJournal && (
                          <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold">
                            <BookOpen size={13} />
                            <span className="hidden sm:inline">Reflected</span>
                          </div>
                        )}

                        {/* Expand / Collapse Icon */}
                        <div className="p-1 rounded-md text-[var(--color-text-secondary)] hover:text-[var(--color-text)] ml-1">
                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </div>
                      </div>
                    </div>

                    {/* Compact Habits Summary List */}
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      {day.habits.length === 0 ? (
                        <span className="text-xs text-[var(--color-text-secondary)] italic">
                          No habits scheduled
                        </span>
                      ) : (
                        day.habits.map((habit) => (
                          <span
                            key={habit.habitId}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                              habit.completed
                                ? 'bg-[var(--color-bg)] text-[var(--color-text)] border border-[var(--color-border)]'
                                : 'bg-[var(--color-bg)]/40 text-[var(--color-text-secondary)] border border-dashed border-[var(--color-border)]'
                            }`}
                          >
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: habit.color }}
                            />
                            <span className="truncate max-w-[130px]">{habit.name}</span>
                            {habit.completed ? (
                              <Check
                                size={12}
                                className="text-[var(--color-success)] stroke-[3]"
                              />
                            ) : (
                              <X
                                size={12}
                                className="text-[var(--color-text-secondary)] opacity-50"
                              />
                            )}
                          </span>
                        ))
                      )}
                    </div>

                    {/* Journal Preview (First 1-2 lines) */}
                    {hasJournal && (
                      <div className="mt-3.5 p-3 rounded-[var(--radius-lg)] bg-[var(--color-bg)]/60 border border-[var(--color-border)]/60 text-xs text-[var(--color-text-secondary)] flex items-start gap-2.5">
                        <Pencil size={13} className="text-amber-500 shrink-0 mt-0.5" />
                        <p className="line-clamp-2 italic leading-relaxed">
                          "{renderHighlighted(day.journal, searchQuery)}"
                        </p>
                      </div>
                    )}
                  </div>

                  {/* ─── Expanded Day Detail Panel ─── */}
                  {isExpanded && (
                    <div className="p-5 sm:p-6 border-t border-[var(--color-border)] bg-[var(--color-bg)]/30 space-y-6 animate-fade-in">
                      {/* Section: Full Habit List */}
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)] mb-3 flex items-center gap-1.5">
                          <CheckSquare size={14} className="text-[var(--color-primary)]" />
                          <span>Habit Status Details</span>
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {day.habits.map((habit) => (
                            <div
                              key={habit.habitId}
                              className={`p-3 rounded-[var(--radius-lg)] border flex items-center justify-between gap-3 ${
                                habit.completed
                                  ? 'bg-[var(--color-surface)] border-[var(--color-border)]'
                                  : 'bg-[var(--color-surface)]/50 border-[var(--color-border)]/60 text-[var(--color-text-secondary)]'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div
                                  className="w-3 h-3 rounded-full shrink-0"
                                  style={{ backgroundColor: habit.color }}
                                />
                                <div className="truncate">
                                  <div
                                    className={`text-xs sm:text-sm font-semibold truncate ${
                                      habit.completed
                                        ? 'text-[var(--color-text)]'
                                        : 'text-[var(--color-text-secondary)]'
                                    }`}
                                  >
                                    {habit.name}
                                  </div>
                                  <div className="text-[10px] text-[var(--color-text-secondary)]">
                                    {habit.category || 'General'}
                                  </div>
                                </div>
                              </div>

                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                  habit.completed
                                    ? 'bg-[var(--color-success-light)] text-[var(--color-success)]'
                                    : 'bg-[var(--color-bg)] text-[var(--color-text-secondary)]'
                                }`}
                              >
                                {habit.completed ? 'Completed' : 'Missed'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Section: Full Journal Reflection */}
                      {hasJournal && (
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)] mb-3 flex items-center gap-1.5">
                            <BookOpen size={14} className="text-amber-500" />
                            <span>Daily Reflection Note</span>
                          </h4>
                          <div className="p-4 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-text)] leading-relaxed whitespace-pre-wrap">
                            {renderHighlighted(day.journal, searchQuery)}
                          </div>
                        </div>
                      )}

                      {/* Section: Full Pomodoro Sessions Breakdown */}
                      {day.pomodoroSessions && day.pomodoroSessions.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)] mb-3 flex items-center gap-1.5">
                            <Clock size={14} className="text-[var(--color-accent)]" />
                            <span>Pomodoro Focus Sessions</span>
                          </h4>
                          <div className="space-y-2">
                            {day.pomodoroSessions.map((session) => (
                              <div
                                key={session._id}
                                className="p-3 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-between text-xs"
                              >
                                <div className="flex items-center gap-2">
                                  <div className="p-1 rounded bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
                                    <Timer size={14} />
                                  </div>
                                  <div>
                                    <span className="font-semibold text-[var(--color-text)] capitalize">
                                      {session.type} Session
                                    </span>
                                    {session.habit && (
                                      <span className="text-[var(--color-text-secondary)] ml-1.5">
                                        • {session.habit.name}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="font-bold text-[var(--color-text)]">
                                    {session.duration} min
                                  </span>
                                  <div className="text-[10px] text-[var(--color-text-secondary)]">
                                    {new Date(session.completedAt).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
