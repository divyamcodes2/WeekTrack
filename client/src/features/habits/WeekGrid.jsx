import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Plus, CalendarDays } from 'lucide-react';
import api from '../../services/api';
import {
  getToday,
  getWeekStart,
  getWeekDates,
  addDays,
  subtractDays,
  getDayName,
  getDayNumber,
  getMonthName,
  isToday,
  isFuture,
  formatDisplayDate,
} from '../../utils/helpers';
import StreakBadge from './StreakBadge';
import HabitForm from './HabitForm';
import toast from 'react-hot-toast';

export default function WeekGrid() {
  const [currentWeekStart, setCurrentWeekStart] = useState(getWeekStart(getToday()));
  const [habits, setHabits] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);

  const weekDates = getWeekDates(currentWeekStart);
  const weekEnd = weekDates[6];
  const isCurrentWeek = currentWeekStart === getWeekStart(getToday());

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [habitsRes, completionsRes] = await Promise.all([
        api.get('/habits'),
        api.get(`/completions?startDate=${currentWeekStart}&endDate=${weekEnd}`),
      ]);
      setHabits(habitsRes.data.habits);
      setCompletions(completionsRes.data.completions);
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [currentWeekStart, weekEnd]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Toggle completion (optimistic)
  const toggleCompletion = async (habitId, date) => {
    if (isFuture(date)) return;

    const existing = completions.find(
      (c) => c.habitId === habitId && c.date === date
    );

    // Optimistic update
    if (existing) {
      setCompletions((prev) => prev.filter((c) => c._id !== existing._id));
    } else {
      const temp = { _id: `temp-${Date.now()}`, habitId, date, userId: '', isFreezeDay: false };
      setCompletions((prev) => [...prev, temp]);
    }

    try {
      const { data } = await api.post('/completions', { habitId, date });

      // Update habit streaks
      setHabits((prev) =>
        prev.map((h) =>
          h._id === habitId
            ? { ...h, currentStreak: data.streak.currentStreak, longestStreak: data.streak.longestStreak }
            : h
        )
      );

      // Refresh completions to get real data
      const completionsRes = await api.get(
        `/completions?startDate=${currentWeekStart}&endDate=${weekEnd}`
      );
      setCompletions(completionsRes.data.completions);

      // Check milestones
      const milestones = [7, 14, 30, 50, 100, 365];
      if (data.action === 'added' && milestones.includes(data.streak.currentStreak)) {
        toast.success(`🔥 ${data.streak.currentStreak}-day streak! Keep going!`, {
          duration: 4000,
          icon: '🎉',
        });
      }
    } catch {
      // Rollback on failure
      toast.error('Failed to update, rolling back');
      fetchData();
    }
  };

  // Habit CRUD
  const createHabit = async (habitData) => {
    try {
      await api.post('/habits', habitData);
      setShowForm(false);
      toast.success('Habit created!');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create habit');
    }
  };

  const updateHabit = async (habitData) => {
    try {
      await api.put(`/habits/${editingHabit._id}`, habitData);
      setEditingHabit(null);
      toast.success('Habit updated!');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update habit');
    }
  };

  // Navigation
  const goToPrevWeek = () => setCurrentWeekStart(subtractDays(currentWeekStart, 7));
  const goToNextWeek = () => setCurrentWeekStart(addDays(currentWeekStart, 7));
  const goToCurrentWeek = () => setCurrentWeekStart(getWeekStart(getToday()));

  // Get completion for a specific habit+date
  const isCompleted = (habitId, date) =>
    completions.some((c) => c.habitId === habitId && c.date === date);

  // Daily completion percentage
  const getDayCompletionRate = (date) => {
    if (habits.length === 0) return 0;
    const dayCompletions = completions.filter((c) => c.date === date).length;
    return Math.round((dayCompletions / habits.length) * 100);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-12 animate-shimmer rounded-[var(--radius-md)]" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-shimmer rounded-[var(--radius-md)]" />
        ))}
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header with week navigation */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Weekly View</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {formatDisplayDate(currentWeekStart)} — {formatDisplayDate(weekEnd)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevWeek}
            className="p-2 rounded-[var(--radius-md)] border border-[var(--color-border)] hover:bg-[var(--color-bg)] transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          {!isCurrentWeek && (
            <button
              onClick={goToCurrentWeek}
              className="px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] hover:bg-[var(--color-bg)] text-xs font-medium transition-colors flex items-center gap-1"
            >
              <CalendarDays size={14} />
              Today
            </button>
          )}
          <button
            onClick={goToNextWeek}
            className="p-2 rounded-[var(--radius-md)] border border-[var(--color-border)] hover:bg-[var(--color-bg)] transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Week Grid */}
      {habits.length === 0 ? (
        <div className="text-center py-16 bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)]">
          <CalendarDays size={48} className="mx-auto text-[var(--color-text-secondary)] mb-4" />
          <h3 className="text-lg font-semibold mb-2">No habits yet</h3>
          <p className="text-sm text-[var(--color-text-secondary)] mb-4">
            Start tracking your habits by creating your first one.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-white text-sm font-medium hover:bg-[var(--color-primary-hover)] transition-colors"
          >
            Create Your First Habit
          </button>
        </div>
      ) : (
        <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] overflow-hidden">
          {/* Desktop Grid */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="text-left py-3 px-4 text-sm font-semibold w-[200px]">Habit</th>
                  {weekDates.map((date) => (
                    <th
                      key={date}
                      className={`py-3 px-2 text-center min-w-[56px] ${isToday(date)
                          ? 'bg-[var(--color-primary-light)]'
                          : ''
                        }`}
                    >
                      <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-secondary)] font-medium">
                        {getDayName(date)}
                      </div>
                      <div className={`text-sm font-semibold mt-0.5 ${isToday(date) ? 'text-[var(--color-primary)]' : ''}`}>
                        {getDayNumber(date)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {habits.map((habit) => (
                  <tr
                    key={habit._id}
                    className="border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-bg)] transition-colors group"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: habit.color }}
                        />
                        <div className="min-w-0">
                          <button
                            onClick={() => setEditingHabit(habit)}
                            className="text-sm font-medium truncate hover:text-[var(--color-primary)] transition-colors text-left"
                          >
                            {habit.name}
                          </button>
                          <StreakBadge
                            current={habit.currentStreak}
                            longest={habit.longestStreak}
                            compact
                          />
                        </div>
                      </div>
                    </td>
                    {weekDates.map((date) => {
                      const completed = isCompleted(habit._id, date);
                      const future = isFuture(date);
                      return (
                        <td
                          key={date}
                          className={`py-3 px-2 text-center ${isToday(date) ? 'bg-[var(--color-primary-light)]' : ''
                            }`}
                        >
                          <button
                            onClick={() => toggleCompletion(habit._id, date)}
                            disabled={future}
                            className={`w-9 h-9 mx-auto rounded-[var(--radius-md)] border-2 flex items-center justify-center transition-all duration-200 ${future
                                ? 'border-[var(--color-border)] opacity-30 cursor-not-allowed'
                                : completed
                                  ? 'border-transparent animate-check-pop'
                                  : 'border-[var(--color-border)] hover:border-[var(--color-primary)] cursor-pointer'
                              }`}
                            style={
                              completed
                                ? { backgroundColor: habit.color }
                                : {}
                            }
                          >
                            {completed && (
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M3 8l3.5 3.5L13 5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {/* Completion rate footer */}
                <tr className="bg-[var(--color-bg)]">
                  <td className="py-2 px-4 text-xs font-medium text-[var(--color-text-secondary)]">
                    Completion
                  </td>
                  {weekDates.map((date) => {
                    const rate = getDayCompletionRate(date);
                    return (
                      <td key={date} className={`py-2 px-2 text-center ${isToday(date) ? 'bg-[var(--color-primary-light)]' : ''}`}>
                        <span
                          className={`text-xs font-semibold ${rate >= 80
                              ? 'text-[var(--color-success)]'
                              : rate >= 50
                                ? 'text-[var(--color-warning)]'
                                : rate > 0
                                  ? 'text-[var(--color-danger)]'
                                  : 'text-[var(--color-text-secondary)]'
                            }`}
                        >
                          {isFuture(date) ? '—' : `${rate}%`}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Mobile Grid — stacked cards per day */}
          <div className="sm:hidden divide-y divide-[var(--color-border)]">
            {weekDates.map((date) => {
              if (isFuture(date)) return null;
              const rate = getDayCompletionRate(date);
              return (
                <div key={date} className={`p-4 ${isToday(date) ? 'bg-[var(--color-primary-light)]' : ''}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className={`text-sm font-semibold ${isToday(date) ? 'text-[var(--color-primary)]' : ''}`}>
                        {getDayName(date, false)} {getDayNumber(date)}
                      </span>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-[var(--radius-full)] ${rate >= 80 ? 'bg-[var(--color-success-light)] text-[var(--color-success)]'
                        : rate >= 50 ? 'bg-[var(--color-warning-light)] text-[var(--color-warning)]'
                          : 'bg-[var(--color-bg)] text-[var(--color-text-secondary)]'
                      }`}>
                      {rate}%
                    </span>
                  </div>
                  <div className="space-y-2">
                    {habits.map((habit) => {
                      const completed = isCompleted(habit._id, date);
                      return (
                        <button
                          key={habit._id}
                          onClick={() => toggleCompletion(habit._id, date)}
                          className={`w-full flex items-center gap-3 p-2.5 rounded-[var(--radius-md)] border transition-all ${completed
                              ? 'border-transparent bg-opacity-10'
                              : 'border-[var(--color-border)] hover:border-[var(--color-primary)]'
                            }`}
                          style={
                            completed
                              ? { backgroundColor: habit.color + '18', borderColor: habit.color + '40' }
                              : {}
                          }
                        >
                          <div
                            className={`w-6 h-6 rounded-[var(--radius-sm)] border-2 flex items-center justify-center shrink-0 transition-all ${completed ? 'border-transparent' : 'border-[var(--color-border)]'
                              }`}
                            style={completed ? { backgroundColor: habit.color } : {}}
                          >
                            {completed && (
                              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                                <path d="M3 8l3.5 3.5L13 5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </div>
                          <span className={`text-sm font-medium ${completed ? 'line-through text-[var(--color-text-secondary)]' : ''}`}>
                            {habit.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* FAB — Add Habit */}
      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-20 lg:bottom-6 right-4 lg:right-6 w-12 h-12 rounded-full bg-[var(--color-primary)] text-white shadow-[var(--shadow-lg)] flex items-center justify-center hover:bg-[var(--color-primary-hover)] transition-all animate-pulse-glow z-30"
      >
        <Plus size={24} />
      </button>

      {/* Modals */}
      {showForm && (
        <HabitForm onSubmit={createHabit} onClose={() => setShowForm(false)} />
      )}
      {editingHabit && (
        <HabitForm
          habit={editingHabit}
          onSubmit={updateHabit}
          onClose={() => setEditingHabit(null)}
        />
      )}
    </div>
  );
}
