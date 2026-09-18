import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  Trophy,
  AlertTriangle,
  Clock,
  Sunrise,
  Sun,
  Moon,
  Flame,
  CalendarCheck,
  RefreshCw,
  ArrowRight,
  Check,
  X,
  Info,
  Settings,
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function InsightsPage() {
  // ─── Metrics State (Sections 2-6) ──────────────────────────
  const [metrics, setMetrics] = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [streakSortKey, setStreakSortKey] = useState('current'); // 'current' | 'longest'

  // ─── AI Coach State (Section 1) ────────────────────────────
  const [aiInsights, setAiInsights] = useState([]);
  const [aiLoading, setAiLoading] = useState(true);
  const [aiRefreshing, setAiRefreshing] = useState(false);
  const [aiAvailable, setAiAvailable] = useState(true);
  const [aiMessage, setAiMessage] = useState('');
  const [dismissedAiIds, setDismissedAiIds] = useState(new Set());
  const [applyingHabitId, setApplyingHabitId] = useState(null);
  const [aiStatus, setAiStatus] = useState(''); // '', 'no_api_key', 'invalid_key', 'error'
  const navigate = useNavigate();

  useEffect(() => {
    // Load pure computation metrics instantly
    fetchMetrics();
    // Load AI Coach asynchronously
    fetchAiCoach();
  }, []);

  // Fetch pure computation metrics
  const fetchMetrics = async () => {
    try {
      setMetricsLoading(true);
      const res = await api.get('/insights/metrics');
      setMetrics(res.data);
    } catch (err) {
      console.error('Failed to load insight metrics:', err);
      toast.error('Failed to load metrics');
    } finally {
      setMetricsLoading(false);
    }
  };

  // Fetch Gemini AI coach insights
  const fetchAiCoach = async () => {
    try {
      setAiLoading(true);
      const res = await api.get('/insights');
      if (res.data.available === false) {
        setAiAvailable(false);
        setAiStatus(res.data.status || '');
        setAiMessage(res.data.message || 'Insights unavailable right now');
        setAiInsights([]);
      } else {
        setAiAvailable(true);
        setAiStatus('');
        setAiInsights(res.data.insights || []);
      }
    } catch (err) {
      console.warn('AI coach fetch failed:', err.message);
      setAiAvailable(false);
      setAiStatus('error');
      setAiMessage(
        err.response?.data?.message || 'AI insights are temporarily unavailable. Please try again later.'
      );
    } finally {
      setAiLoading(false);
    }
  };

  const handleRefreshAiCoach = async () => {
    if (aiRefreshing) return;
    try {
      setAiRefreshing(true);
      const res = await api.post('/insights/refresh');
      if (res.data.available === false) {
        setAiAvailable(false);
        setAiStatus(res.data.status || '');
        setAiMessage(res.data.message || 'Insights unavailable right now');
        setAiInsights([]);
      } else {
        setAiAvailable(true);
        setAiStatus('');
        setAiInsights(res.data.insights || []);
        setDismissedAiIds(new Set());
        toast.success('AI Coach insights refreshed');
      }
    } catch (err) {
      console.warn('Refresh failed:', err.message);
      const msg = err.response?.data?.message || 'Could not refresh AI insights';
      toast.error(msg);
    } finally {
      setAiRefreshing(false);
    }
  };

  const handleDismissAiInsight = async (habitId) => {
    setDismissedAiIds((prev) => new Set([...prev, habitId]));
    try {
      await api.patch(`/insights/${habitId}/dismiss`);
    } catch (err) {
      console.warn('Failed to dismiss insight on server:', err.message);
    }
  };

  const handleApplyAiSuggestion = async (insight) => {
    if (!insight.suggestedChange || !insight.suggestedChange.field) return;
    try {
      setApplyingHabitId(insight.habitId);
      const res = await api.get(`/habits/${insight.habitId}`);
      const habit = res.data.habit;
      if (!habit) {
        toast.error('Habit not found');
        return;
      }

      const payload = {
        name: habit.name,
        description: habit.description || '',
        category: habit.category || 'General',
        frequency: habit.frequency,
        color: habit.color,
        pomodorosRequired: habit.pomodorosRequired || 1,
      };

      if (insight.suggestedChange.field === 'frequency') {
        payload.frequency = insight.suggestedChange.newValue;
      } else if (insight.suggestedChange.field === 'pomodorosRequired') {
        payload.pomodorosRequired = Number(insight.suggestedChange.newValue);
      } else {
        payload[insight.suggestedChange.field] = insight.suggestedChange.newValue;
      }

      await api.put(`/habits/${insight.habitId}`, payload);
      toast.success(`Updated schedule for "${habit.name}"!`);
      handleDismissAiInsight(insight.habitId);
      // Also refresh metrics to reflect updated target
      fetchMetrics();
    } catch (err) {
      console.error('Failed to apply suggestion:', err);
      toast.error(err.response?.data?.message || 'Failed to update habit schedule');
    } finally {
      setApplyingHabitId(null);
    }
  };

  const visibleAiInsights = aiInsights.filter((item) => !dismissedAiIds.has(item.habitId));

  // Sorted streaks for Section 5
  const sortedStreaks = [...(metrics?.streaks || [])].sort((a, b) => {
    if (streakSortKey === 'longest') {
      return (b.longestStreak || 0) - (a.longestStreak || 0);
    }
    return (b.currentStreak || 0) - (a.currentStreak || 0);
  });

  return (
    <div className="animate-fade-in space-y-8 pb-12">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Insights</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          Deep habit analytics, comparative trends, and AI-powered coaching
        </p>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* SECTION 1: AI Coach (Gemini-powered)                        */}
      {/* ──────────────────────────────────────────────────────────── */}
      <section className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-6 space-y-4">
        {/* Section Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[var(--color-text)]">1. AI Coach</h2>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Proactive adjustments powered by Gemini to rescue declining habits
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRefreshAiCoach}
            disabled={aiRefreshing}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh AI Insights"
          >
            <RefreshCw size={13} className={aiRefreshing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">{aiRefreshing ? 'Analyzing…' : 'Refresh Insights'}</span>
          </button>
        </div>

        {/* AI Content */}
        {aiLoading ? (
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
              <Sparkles size={14} className="text-[var(--color-primary)] animate-pulse" />
              <span>Analyzing your recent habit consistency…</span>
            </div>
            <div className="h-24 animate-shimmer rounded-[var(--radius-md)]" />
          </div>
        ) : !aiAvailable ? (
          /* Graceful degradation based on status */
          aiStatus === 'no_api_key' ? (
            <div className="bg-[var(--color-bg)] rounded-[var(--radius-md)] border border-[var(--color-border)] p-5 flex flex-col items-center text-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center">
                <Sparkles size={20} />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--color-text)] mb-1">
                  Add your Gemini API key to unlock AI-powered coaching
                </p>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  Get personalized insights and actionable suggestions for your declining habits.
                </p>
              </div>
              <button
                onClick={() => navigate('/settings')}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition-colors cursor-pointer"
              >
                <Settings size={13} />
                Go to Settings
              </button>
            </div>
          ) : aiStatus === 'invalid_key' ? (
            <div className="bg-[var(--color-bg)] rounded-[var(--radius-md)] border border-[var(--color-warning)]/30 p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs">
                <AlertTriangle size={15} className="shrink-0 text-[var(--color-warning)]" />
                <span className="text-[var(--color-text)]">
                  Your Gemini API key seems invalid — please check it in Settings.
                </span>
              </div>
              <button
                onClick={() => navigate('/settings')}
                className="text-[var(--color-primary)] text-xs font-medium hover:underline cursor-pointer whitespace-nowrap"
              >
                Open Settings
              </button>
            </div>
          ) : (
            <div className="bg-[var(--color-bg)] rounded-[var(--radius-md)] border border-[var(--color-border)] p-4 flex items-center justify-between gap-3 text-xs text-[var(--color-text-secondary)]">
              <div className="flex items-center gap-2">
                <Info size={15} className="shrink-0 text-[var(--color-text-secondary)]" />
                <span>AI insights are temporarily unavailable. Please try again later.</span>
              </div>
              <button
                onClick={handleRefreshAiCoach}
                disabled={aiRefreshing}
                className="text-[var(--color-primary)] font-medium hover:underline cursor-pointer"
              >
                Retry
              </button>
            </div>
          )
        ) : visibleAiInsights.length === 0 ? (
          /* Positive empty state */
          <div className="bg-[var(--color-bg)] rounded-[var(--radius-md)] border border-[var(--color-border)] p-5 flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-full bg-[var(--color-success-light)] text-[var(--color-success)] flex items-center justify-center shrink-0">
              <Check size={18} />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--color-text)]">
                You're doing great — no habits need attention right now 🎉
              </p>
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                All your tracked habits are maintaining healthy consistency week-over-week.
              </p>
            </div>
          </div>
        ) : (
          /* At-Risk Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {visibleAiInsights.map((insight) => {
              const isNudge = insight.riskType === 'nudge';
              return (
                <div
                  key={insight.habitId}
                  className={`bg-[var(--color-surface)] rounded-[var(--radius-lg)] border-l-4 ${
                    isNudge ? 'border-l-[var(--color-primary)]' : 'border-l-[var(--color-warning)]'
                  } border border-[var(--color-border)] p-4 shadow-sm flex flex-col justify-between space-y-3 transition-all hover:shadow-md`}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: insight.habitColor || 'var(--color-primary)' }}
                      />
                      <span className="text-sm font-semibold text-[var(--color-text)] truncate">
                        {insight.habitName}
                      </span>
                      <span
                        className={`text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded ${
                          isNudge
                            ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)]'
                            : 'bg-[var(--color-warning-light)] text-[var(--color-warning)]'
                        }`}
                      >
                        {isNudge ? 'Momentum Nudge' : 'Needs Attention'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDismissAiInsight(insight.habitId)}
                      className="p-1 rounded text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-border)] transition-colors cursor-pointer"
                      title="Dismiss"
                      aria-label="Dismiss"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Risk summary */}
                  <div className="flex items-start gap-2 text-xs text-[var(--color-text-secondary)]">
                    {isNudge ? (
                      <Sparkles size={14} className="text-[var(--color-primary)] shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle size={14} className="text-[var(--color-warning)] shrink-0 mt-0.5" />
                    )}
                    <p>{insight.riskSummary}</p>
                  </div>

                  {/* Concrete suggestion callout */}
                  <div
                    className={`rounded-[var(--radius-md)] p-3 border text-xs text-[var(--color-text)] leading-relaxed ${
                      isNudge
                        ? 'bg-[var(--color-primary-light)]/50 border-[var(--color-primary)]/20'
                        : 'bg-[var(--color-warning-light)] border-[var(--color-warning)]/20'
                    }`}
                  >
                    <p className="font-semibold text-[var(--color-text)] mb-0.5">
                      {isNudge ? 'Momentum Reminder:' : 'Recommended Adjustment:'}
                    </p>
                    <p>{insight.suggestion}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleDismissAiInsight(insight.habitId)}
                      className="text-xs px-3 py-1.5 rounded-[var(--radius-md)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] transition-colors cursor-pointer"
                    >
                      Dismiss
                    </button>
                    {insight.suggestedChange && (
                      <button
                        type="button"
                        disabled={applyingHabitId === insight.habitId}
                        onClick={() => handleApplyAiSuggestion(insight)}
                        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {applyingHabitId === insight.habitId ? (
                          'Applying…'
                        ) : (
                          <>
                            <span>Apply Suggestion</span>
                            <ArrowRight size={12} />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* SECTION 2: This Week vs Last Week (Pure Computation)        */}
      {/* ──────────────────────────────────────────────────────────── */}
      <section className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-6 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center">
              <TrendingUp size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[var(--color-text)]">2. This Week vs Last Week</h2>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Rolling 7-day completion rate compared with the preceding 7 days
              </p>
            </div>
          </div>

          {/* Overall Average Trend Badge */}
          {metrics?.weekComparison?.overall && (
            <div className="flex items-center gap-3 bg-[var(--color-bg)] px-3.5 py-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)]">
              <span className="text-xs text-[var(--color-text-secondary)]">Overall Average:</span>
              <span className="text-sm font-bold text-[var(--color-text)]">
                {metrics.weekComparison.overall.thisWeekRate}%
              </span>
              <span
                className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                  metrics.weekComparison.overall.trend === 'up'
                    ? 'bg-[var(--color-success-light)] text-[var(--color-success)]'
                    : metrics.weekComparison.overall.trend === 'down'
                    ? 'bg-[var(--color-danger-light)] text-[var(--color-danger)]'
                    : 'bg-[var(--color-border)] text-[var(--color-text-secondary)]'
                }`}
              >
                {metrics.weekComparison.overall.trend === 'up' && <TrendingUp size={12} />}
                {metrics.weekComparison.overall.trend === 'down' && <TrendingDown size={12} />}
                {metrics.weekComparison.overall.trend === 'neutral' && <Minus size={12} />}
                {metrics.weekComparison.overall.diff > 0 ? `+${metrics.weekComparison.overall.diff}%` : `${metrics.weekComparison.overall.diff}%`}
              </span>
            </div>
          )}
        </div>

        {metricsLoading ? (
          <div className="h-32 animate-shimmer rounded-[var(--radius-md)]" />
        ) : !metrics?.weekComparison?.habits?.length ? (
          <p className="text-xs text-[var(--color-text-secondary)]">No habits available for comparison.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-[var(--color-text-secondary)]">
                  <th className="pb-3 font-medium">Habit</th>
                  <th className="pb-3 font-medium text-center">This Week</th>
                  <th className="pb-3 font-medium text-center">Last Week</th>
                  <th className="pb-3 font-medium text-right">Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {metrics.weekComparison.habits.map((item) => (
                  <tr key={item.habitId} className="hover:bg-[var(--color-bg)] transition-colors">
                    <td className="py-3 pr-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.color || 'var(--color-primary)' }}
                        />
                        <span className="font-medium text-[var(--color-text)]">{item.name}</span>
                        <span className="text-[10px] text-[var(--color-text-secondary)] hidden sm:inline">
                          ({item.category})
                        </span>
                      </div>
                    </td>
                    <td className="py-3 text-center">
                      <span className="font-semibold text-[var(--color-text)]">{item.thisWeekRate}%</span>
                      <span className="text-[10px] text-[var(--color-text-secondary)] block">
                        {item.thisWeekCompleted}/{item.targetCount} days
                      </span>
                    </td>
                    <td className="py-3 text-center">
                      <span className="font-medium text-[var(--color-text-secondary)]">{item.lastWeekRate}%</span>
                      <span className="text-[10px] text-[var(--color-text-secondary)] block">
                        {item.prevWeekCompleted}/{item.targetCount} days
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <span
                        className={`inline-flex items-center gap-1 font-semibold px-2 py-1 rounded-[var(--radius-sm)] ${
                          item.trend === 'up'
                            ? 'bg-[var(--color-success-light)] text-[var(--color-success)]'
                            : item.trend === 'down'
                            ? 'bg-[var(--color-danger-light)] text-[var(--color-danger)]'
                            : 'bg-[var(--color-border)] text-[var(--color-text-secondary)]'
                        }`}
                      >
                        {item.trend === 'up' && <TrendingUp size={12} />}
                        {item.trend === 'down' && <TrendingDown size={12} />}
                        {item.trend === 'neutral' && <Minus size={12} />}
                        <span>{item.diff > 0 ? `+${item.diff}%` : `${item.diff}%`}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* SECTION 3: Best & Worst Performers (Pure Computation)        */}
      {/* ──────────────────────────────────────────────────────────── */}
      <section className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center">
            <Trophy size={18} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[var(--color-text)]">3. Best & Worst Performers</h2>
            <p className="text-xs text-[var(--color-text-secondary)]">
              All-time consistency leaders and habits that could use extra focus
            </p>
          </div>
        </div>

        {metricsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-28 animate-shimmer rounded-[var(--radius-md)]" />
            <div className="h-28 animate-shimmer rounded-[var(--radius-md)]" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Most Consistent Habit */}
            <div className="bg-[var(--color-bg)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-4 flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-success)] flex items-center gap-1.5">
                  <Trophy size={14} />
                  Most Consistent Habit
                </span>
                <span className="text-xl font-bold text-[var(--color-success)]">
                  {metrics?.performers?.best?.allTimeRate ?? 0}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: metrics?.performers?.best?.color || 'var(--color-success)' }}
                />
                <span className="text-base font-semibold text-[var(--color-text)] truncate">
                  {metrics?.performers?.best?.name || 'None yet'}
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Highest all-time completion rate across tracked days ({metrics?.performers?.best?.totalCompletions || 0} total sessions).
              </p>
            </div>

            {/* Needs Attention */}
            <div className="bg-[var(--color-bg)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-4 flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-warning)] flex items-center gap-1.5">
                  <AlertTriangle size={14} />
                  Needs Attention
                </span>
                <span className="text-xl font-bold text-[var(--color-warning)]">
                  {metrics?.performers?.worst?.allTimeRate ?? 0}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: metrics?.performers?.worst?.color || 'var(--color-warning)' }}
                />
                <span className="text-base font-semibold text-[var(--color-text)] truncate">
                  {metrics?.performers?.worst?.name || 'None'}
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Lowest all-time completion rate. Consider simplifying the schedule or reducing targets.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* SECTION 4: Best Time of Day (Pure Computation)              */}
      {/* ──────────────────────────────────────────────────────────── */}
      <section className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center">
              <Clock size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[var(--color-text)]">4. Best Time of Day</h2>
              <p className="text-xs text-[var(--color-text-secondary)]">
                When you most frequently complete habits based on timestamp logs
              </p>
            </div>
          </div>

          {metrics?.timeOfDay?.bestBucket && (
            <div className="bg-[var(--color-primary-light)] text-[var(--color-primary)] text-xs font-semibold px-3 py-1.5 rounded-full">
              Peak Focus: {metrics.timeOfDay.bestBucket}
            </div>
          )}
        </div>

        {metricsLoading ? (
          <div className="h-28 animate-shimmer rounded-[var(--radius-md)]" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            {metrics?.timeOfDay?.buckets?.map((bucket) => {
              const Icon =
                bucket.name === 'Morning' ? Sunrise : bucket.name === 'Afternoon' ? Sun : Moon;
              return (
                <div
                  key={bucket.name}
                  className="bg-[var(--color-bg)] rounded-[var(--radius-md)] border border-[var(--color-border)] p-4 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                    <span className="flex items-center gap-1.5 font-medium text-[var(--color-text)]">
                      <Icon size={15} className="text-[var(--color-primary)]" />
                      {bucket.name}
                    </span>
                    <span>{bucket.timeRange}</span>
                  </div>

                  <div className="flex items-baseline justify-between pt-1">
                    <span className="text-2xl font-bold text-[var(--color-text)]">
                      {bucket.percentage}%
                    </span>
                    <span className="text-xs text-[var(--color-text-secondary)]">
                      {bucket.count} completed
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2 bg-[var(--color-border)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[var(--color-primary)] rounded-full transition-all duration-300"
                      style={{ width: `${bucket.percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* SECTION 5: Streak Leaderboard (Pure Computation)            */}
      {/* ──────────────────────────────────────────────────────────── */}
      <section className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center">
              <Flame size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[var(--color-text)]">5. Streak Leaderboard</h2>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Ranked habit streaks celebrating your sustained consistency
              </p>
            </div>
          </div>

          {/* Sort Toggle: Current vs Longest */}
          <div className="flex items-center bg-[var(--color-bg)] p-1 rounded-[var(--radius-md)] border border-[var(--color-border)] text-xs">
            <button
              type="button"
              onClick={() => setStreakSortKey('current')}
              className={`px-3 py-1 rounded-[var(--radius-sm)] font-medium transition-colors cursor-pointer ${
                streakSortKey === 'current'
                  ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
              }`}
            >
              Current Streak
            </button>
            <button
              type="button"
              onClick={() => setStreakSortKey('longest')}
              className={`px-3 py-1 rounded-[var(--radius-sm)] font-medium transition-colors cursor-pointer ${
                streakSortKey === 'longest'
                  ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
              }`}
            >
              Longest Streak
            </button>
          </div>
        </div>

        {metricsLoading ? (
          <div className="h-32 animate-shimmer rounded-[var(--radius-md)]" />
        ) : sortedStreaks.length === 0 ? (
          <p className="text-xs text-[var(--color-text-secondary)]">No habits found.</p>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {sortedStreaks.map((habit, index) => {
              const streakCount =
                streakSortKey === 'longest' ? habit.longestStreak || 0 : habit.currentStreak || 0;
              return (
                <div
                  key={habit.habitId}
                  className="py-3 flex items-center justify-between gap-3 hover:bg-[var(--color-bg)] px-2 rounded-[var(--radius-md)] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        index === 0
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                          : index === 1
                          ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          : index === 2
                          ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300'
                          : 'bg-[var(--color-border)] text-[var(--color-text-secondary)]'
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: habit.color || 'var(--color-primary)' }}
                    />
                    <div className="min-w-0">
                      <span className="text-sm font-semibold text-[var(--color-text)] truncate block">
                        {habit.name}
                      </span>
                      <span className="text-[10px] text-[var(--color-text-secondary)]">
                        {habit.category || 'General'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-sm font-bold text-[var(--color-warning)] shrink-0">
                    <Flame size={16} />
                    <span>{streakCount} {streakCount === 1 ? 'day' : 'days'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* SECTION 6: Consistency Summary (Pure Computation)           */}
      {/* ──────────────────────────────────────────────────────────── */}
      <section className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center">
            <CalendarCheck size={18} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[var(--color-text)]">6. Consistency Summary</h2>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Broad habit follow-through record over the past 30 days
            </p>
          </div>
        </div>

        {metricsLoading ? (
          <div className="h-24 animate-shimmer rounded-[var(--radius-md)]" />
        ) : (
          <div className="bg-[var(--color-bg)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-lg sm:text-xl font-bold text-[var(--color-text)]">
                {metrics?.consistency?.headline || "You've completed at least one habit on 0 of the last 30 days"}
              </h3>
              <p className="text-xs text-[var(--color-text-secondary)]">
                {metrics?.consistency?.percentage || 0}% active day rate over the rolling 30-day window.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <span className="text-2xl font-extrabold text-[var(--color-primary)]">
                  {metrics?.consistency?.activeDaysLast30 || 0}
                </span>
                <span className="text-xs text-[var(--color-text-secondary)]"> / 30 Days</span>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
