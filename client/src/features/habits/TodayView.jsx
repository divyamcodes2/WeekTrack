import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Flame,
  Timer,
  Pencil,
  CheckCircle2,
  Plus,
  Sparkles,
  Calendar,
  ArrowUpRight,
  Sun,
  Sunrise,
  Moon,
  BookOpen,
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { getToday, formatDisplayDate } from '../../utils/helpers';
import StreakBadge from './StreakBadge';
import HabitForm from './HabitForm';
import toast from 'react-hot-toast';

export default function TodayView() {
  const { user } = useAuth();
  const [habits, setHabits] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [momentumStreak, setMomentumStreak] = useState(0);
  const [focusTodayMinutes, setFocusTodayMinutes] = useState(0);
  const [focusTodaySessions, setFocusTodaySessions] = useState(0);
  const [journal, setJournal] = useState('');
  const [journalSaving, setJournalSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const today = getToday();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [habitsRes, compRes, streaksRes, journalRes, pomodoroRes] = await Promise.all([
        api.get('/habits'),
        api.get(`/completions?startDate=${today}&endDate=${today}`),
        api.get('/stats/streaks'),
        api.get(`/journal/${today}`),
        api.get(`/pomodoro?startDate=${today}&endDate=${today}`),
      ]);
      setHabits(habitsRes.data.habits);
      setCompletions(compRes.data.completions);
      setMomentumStreak(streaksRes.data.momentumStreak);
      setJournal(journalRes.data.entry?.content || '');

      // Compute today's focus stats from pomodoro sessions
      const workSessions = (pomodoroRes.data.sessions || []).filter((s) => s.type === 'work');
      setFocusTodaySessions(workSessions.length);
      setFocusTodayMinutes(workSessions.reduce((sum, s) => sum + (s.duration || 0), 0));
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const toggleCompletion = async (habitId) => {
    const existing = completions.find((c) => c.habitId === habitId);

    // Optimistic update
    if (existing) {
      setCompletions((prev) => prev.filter((c) => c._id !== existing._id));
    } else {
      setCompletions((prev) => [...prev, { _id: `temp-${Date.now()}`, habitId, date: today }]);
    }

    try {
      const { data } = await api.post('/completions', { habitId, date: today });
      setHabits((prev) =>
        prev.map((h) =>
          h._id === habitId
            ? { ...h, currentStreak: data.streak.currentStreak, longestStreak: data.streak.longestStreak }
            : h
        )
      );
      const compRes = await api.get(`/completions?startDate=${today}&endDate=${today}`);
      setCompletions(compRes.data.completions);
      const streaksRes = await api.get('/stats/streaks');
      setMomentumStreak(streaksRes.data.momentumStreak);

      if (data.action === 'added') {
        const milestones = [7, 14, 30, 50, 100, 365];
        if (milestones.includes(data.streak.currentStreak)) {
          toast.success(`🔥 ${data.streak.currentStreak}-day streak!`, { icon: '🎉', duration: 4000 });
        }
      }
    } catch {
      toast.error('Failed to update');
      fetchData();
    }
  };

  const saveJournal = async () => {
    setJournalSaving(true);
    try {
      await api.put(`/journal/${today}`, { content: journal });
      toast.success('Journal saved');
    } catch {
      toast.error('Failed to save');
    } finally {
      setJournalSaving(false);
    }
  };

  const isCompleted = (habitId) => completions.some((c) => c.habitId === habitId);
  const completedCount = completions.length;
  const totalCount = habits.length;
  const rate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Greeting based on time of day
  const getGreetingInfo = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return { text: 'Good morning', Icon: Sunrise, color: 'text-amber-500' };
    }
    if (hour >= 12 && hour < 17) {
      return { text: 'Good afternoon', Icon: Sun, color: 'text-amber-500' };
    }
    return { text: 'Good evening', Icon: Moon, color: 'text-indigo-400' };
  };

  const greeting = getGreetingInfo();
  const GreetingIcon = greeting.Icon;
  const userName = user?.name ? user.name.split(' ')[0] : 'there';

  // Dynamic motivational subtext based on completion %
  const getMotivationalSubtext = (completedRate, total) => {
    if (total === 0) return 'Add your habits below to start your daily momentum.';
    if (completedRate === 100) return "You're on track! All habits completed today 🎉";
    if (completedRate >= 75) return 'Almost there! Finish strong today.';
    if (completedRate >= 50) return 'Halfway through — keep the momentum going!';
    if (completedRate > 0) return 'Great start! Keep ticking them off.';
    return "Let's get moving — small steps today lead to big changes.";
  };

  const isMomentumHighlight = momentumStreak > 3;

  if (loading) {
    return (
      <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
        {/* Header Skeleton */}
        <div className="space-y-2">
          <div className="h-5 w-40 animate-shimmer rounded-[var(--radius-full)]" />
          <div className="h-8 w-48 animate-shimmer rounded-[var(--radius-md)]" />
          <div className="h-4 w-64 animate-shimmer rounded-[var(--radius-md)]" />
        </div>

        {/* Overview Skeleton */}
        <div className="bg-[var(--color-surface)] rounded-[var(--radius-xl)] border border-[var(--color-border)] p-6 sm:p-7 space-y-4">
          <div className="h-4 w-24 animate-shimmer rounded-[var(--radius-md)]" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 animate-shimmer rounded-[var(--radius-lg)]" />
            ))}
          </div>
        </div>

        {/* Daily Tasks Skeleton */}
        <div className="bg-[var(--color-surface)] rounded-[var(--radius-xl)] border border-[var(--color-border)] p-6 sm:p-7 space-y-4">
          <div className="h-5 w-32 animate-shimmer rounded-[var(--radius-md)]" />
          <div className="h-16 animate-shimmer rounded-[var(--radius-lg)]" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-shimmer rounded-[var(--radius-lg)]" />
            ))}
          </div>
        </div>

        {/* Journal Skeleton */}
        <div className="bg-[var(--color-surface)] rounded-[var(--radius-xl)] border border-[var(--color-border)] p-6 sm:p-7 space-y-4">
          <div className="h-5 w-28 animate-shimmer rounded-[var(--radius-md)]" />
          <div className="h-24 animate-shimmer rounded-[var(--radius-md)]" />
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8 max-w-4xl mx-auto pb-10">
      {/* ─── Friendly Greeting & Today Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-primary-light)] text-xs font-semibold text-[var(--color-primary)] mb-2 transition-all">
            <GreetingIcon size={14} className={greeting.color} />
            <span>
              {greeting.text}, {userName}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-text)]">Today</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="flex items-center gap-1 text-sm font-medium text-[var(--color-text-secondary)]">
              <Calendar size={14} />
              {formatDisplayDate(today)}
            </span>
            <span className="text-[var(--color-border)]">•</span>
            <span className="text-sm font-medium text-[var(--color-primary)] flex items-center gap-1.5">
              <Sparkles size={13} className="text-amber-500 shrink-0" />
              {getMotivationalSubtext(rate, totalCount)}
            </span>
          </div>
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-[var(--radius-lg)] bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-sm font-medium shadow-xs hover:shadow-sm transition-all duration-200 active:scale-[0.98] self-start sm:self-center shrink-0 cursor-pointer"
        >
          <Plus size={16} />
          <span>New Habit</span>
        </button>
      </div>

      {/* ─── SECTION 1: Overview ─── */}
      <section className="bg-[var(--color-surface)] rounded-[var(--radius-xl)] border border-[var(--color-border)] p-6 sm:p-7 shadow-xs space-y-5 transition-all">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-primary)]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
              Overview
            </h2>
          </div>
          <span className="text-xs text-[var(--color-text-secondary)] font-medium">Daily Metrics</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Completed % Card */}
          <div className="relative rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg)]/40 p-5 transition-all duration-200 hover:border-[var(--color-primary)] hover:bg-[var(--color-bg)]/70 hover:shadow-xs group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                Completed
              </span>
              <div className="p-1.5 rounded-md bg-[var(--color-primary-light)] text-[var(--color-primary)]">
                <CheckCircle2 size={16} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-[var(--color-text)] tracking-tight">{rate}%</span>
              <span className="text-xs text-[var(--color-text-secondary)] font-medium">
                ({completedCount}/{totalCount})
              </span>
            </div>
            <div className="mt-2 text-xs text-[var(--color-text-secondary)]">
              {rate === 100
                ? 'All finished for today!'
                : `${totalCount - completedCount} habit${totalCount - completedCount === 1 ? '' : 's'} remaining`}
            </div>
          </div>

          {/* Momentum Streak Card */}
          <div
            className={`relative rounded-[var(--radius-lg)] border p-5 transition-all duration-200 hover:shadow-xs ${
              isMomentumHighlight
                ? 'border-amber-400/80 bg-amber-500/5 dark:border-amber-400/60 dark:bg-amber-400/10 ring-1 ring-amber-400/30'
                : 'border-[var(--color-border)] bg-[var(--color-bg)]/40 hover:border-amber-400/60 hover:bg-[var(--color-bg)]/70'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                Momentum
              </span>
              <div className="p-1.5 rounded-md bg-amber-500/15 text-amber-500">
                <Flame size={16} className={momentumStreak > 0 ? 'fill-amber-500 text-amber-500' : 'text-amber-500'} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-[var(--color-text)] tracking-tight">{momentumStreak}</span>
              <span className="text-xs text-[var(--color-text-secondary)] font-medium">
                day{momentumStreak === 1 ? '' : 's'} streak
              </span>
            </div>
            <div className="mt-2 text-xs text-[var(--color-text-secondary)] flex items-center gap-1">
              {isMomentumHighlight ? (
                <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                  🔥 Streak on fire!
                </span>
              ) : momentumStreak > 0 ? (
                'Great daily consistency'
              ) : (
                'Complete habits to build momentum'
              )}
            </div>
          </div>

          {/* Focus Card (Pomodoro) — shows real today stats */}
          <Link
            to="/timer"
            className="relative rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg)]/40 p-5 transition-all duration-200 hover:border-[var(--color-accent)] hover:bg-[var(--color-bg)]/70 hover:shadow-xs group cursor-pointer block"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                Focus
              </span>
              <div className="p-1.5 rounded-md bg-[var(--color-accent)]/15 text-[var(--color-accent)] group-hover:scale-110 transition-transform">
                <Timer size={16} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-[var(--color-text)] tracking-tight">
                {focusTodayMinutes}m
              </span>
              <span className="text-xs text-[var(--color-text-secondary)] font-medium">
                ({focusTodaySessions} session{focusTodaySessions === 1 ? '' : 's'})
              </span>
            </div>
            <div className="mt-2 text-xs text-[var(--color-accent)] font-medium flex items-center gap-1">
              {focusTodaySessions > 0 ? (
                <span>Today's focus time</span>
              ) : (
                <span>Start focus session →</span>
              )}
              <ArrowUpRight
                size={13}
                className="text-[var(--color-text-secondary)] group-hover:text-[var(--color-accent)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all"
              />
            </div>
          </Link>
        </div>
      </section>

      {/* ─── SECTION 2: Daily Tasks ─── */}
      <section className="bg-[var(--color-surface)] rounded-[var(--radius-xl)] border border-[var(--color-border)] p-6 sm:p-7 shadow-xs space-y-6 transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[var(--color-border)]/60">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-success)]" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                Daily Tasks
              </h2>
            </div>
            <p className="text-lg font-bold text-[var(--color-text)]">Habit Checklist</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium px-3 py-1 rounded-full bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-secondary)]">
              {completedCount} of {totalCount} completed
            </span>
          </div>
        </div>

        {/* Habit Progress Bar Container */}
        <div className="bg-[var(--color-bg)]/50 rounded-[var(--radius-lg)] border border-[var(--color-border)] p-4 sm:p-5">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs sm:text-sm font-semibold text-[var(--color-text)]">
              Overall Today Progress
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)]">
              {rate}%
            </span>
          </div>
          <div className="h-2.5 bg-[var(--color-surface)] rounded-full overflow-hidden border border-[var(--color-border)]/60">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${rate}%`,
                backgroundColor:
                  rate >= 80
                    ? 'var(--color-success)'
                    : rate >= 50
                    ? 'var(--color-warning)'
                    : 'var(--color-primary)',
              }}
            />
          </div>
        </div>

        {/* Habit Checklist Rows */}
        {habits.length === 0 ? (
          <div className="text-center py-12 px-4 bg-[var(--color-bg)]/30 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)]">
            <div className="w-12 h-12 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center mx-auto mb-3">
              <Plus size={24} />
            </div>
            <h3 className="text-base font-semibold mb-1 text-[var(--color-text)]">No habits added yet</h3>
            <p className="text-sm text-[var(--color-text-secondary)] max-w-sm mx-auto mb-5">
              Start building your daily routine by creating your first habit.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-sm font-medium transition-colors shadow-xs"
            >
              Create First Habit
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {habits.map((habit) => {
              const completed = isCompleted(habit._id);
              return (
                <button
                  key={habit._id}
                  onClick={() => toggleCompletion(habit._id)}
                  className={`w-full flex items-center gap-4 py-4 px-4 sm:px-5 rounded-[var(--radius-lg)] border text-left transition-all duration-200 cursor-pointer group ${
                    completed
                      ? 'border-transparent shadow-xs'
                      : 'bg-[var(--color-bg)]/30 border-[var(--color-border)] hover:border-[var(--color-primary)]/70 hover:bg-[var(--color-bg)]/60 hover:shadow-xs active:scale-[0.99]'
                  }`}
                  style={
                    completed
                      ? {
                          backgroundColor: habit.color + '14',
                          borderColor: habit.color + '40',
                          borderWidth: '1px',
                          borderStyle: 'solid',
                        }
                      : {}
                  }
                >
                  {/* Checkbox */}
                  <div
                    className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all duration-200 ${
                      completed
                        ? 'border-transparent shadow-xs'
                        : 'border-[var(--color-border)] bg-[var(--color-surface)] group-hover:border-[var(--color-primary)]'
                    }`}
                    style={completed ? { backgroundColor: habit.color } : {}}
                  >
                    {completed && (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path
                          d="M3.5 8.5L6.5 11.5L13 4.5"
                          stroke="white"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-sm sm:text-base font-semibold leading-snug transition-colors ${
                        completed
                          ? 'line-through text-[var(--color-text-secondary)] opacity-80'
                          : 'text-[var(--color-text)]'
                      }`}
                    >
                      {habit.name}
                    </div>
                    {habit.description && (
                      <div className="text-xs text-[var(--color-text-secondary)] truncate mt-0.5">
                        {habit.description}
                      </div>
                    )}
                  </div>

                  {/* Streak Flame Badge */}
                  <div className="shrink-0 flex items-center">
                    <StreakBadge current={habit.currentStreak} longest={habit.longestStreak} compact />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* ─── SECTION 3: Journal ─── */}
      <section className="bg-[var(--color-surface)] rounded-[var(--radius-xl)] border border-[var(--color-border)] p-6 sm:p-7 shadow-xs space-y-4 transition-all">
        <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]/60">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-accent)]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
              Journal
            </h2>
          </div>
          {journalSaving ? (
            <span className="text-xs text-[var(--color-primary)] font-medium animate-pulse">Saving...</span>
          ) : (
            <span className="text-xs text-[var(--color-text-secondary)]">Auto-saves on blur</span>
          )}
        </div>

        <div>
          <div className="flex items-center gap-2">
            <Pencil size={18} className="text-[var(--color-accent)]" />
            <h3 className="text-lg font-bold text-[var(--color-text)]">Daily Reflection</h3>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">
            Capture your thoughts, milestones, or learnings from today to build mindfulness.
          </p>
        </div>

        <div className="pt-2">
          <textarea
            value={journal}
            onChange={(e) => setJournal(e.target.value)}
            onBlur={saveJournal}
            placeholder="How was your day? Any small wins, challenges, or thoughts you want to remember..."
            rows={4}
            maxLength={500}
            className="w-full px-4 py-3.5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg)]/50 text-sm text-[var(--color-text)] placeholder-[var(--color-text-secondary)]/60 resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all leading-relaxed"
          />
          <div className="flex items-center justify-between mt-2.5 px-1 text-xs text-[var(--color-text-secondary)]">
            <span>Take a moment to reflect before closing your day</span>
            <span className="font-medium">{journal.length}/500</span>
          </div>
        </div>
      </section>

      {/* Habit Creation Modal */}
      {showForm && (
        <HabitForm
          onSubmit={async (data) => {
            await api.post('/habits', data);
            setShowForm(false);
            toast.success('Habit created!');
            fetchData();
          }}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
