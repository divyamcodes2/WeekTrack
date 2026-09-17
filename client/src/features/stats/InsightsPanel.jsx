import { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, AlertTriangle, Check, X, ArrowRight, Info } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function InsightsPanel() {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [available, setAvailable] = useState(true);
  const [unavailableMessage, setUnavailableMessage] = useState('');
  const [dismissedIds, setDismissedIds] = useState(new Set());
  const [applyingId, setApplyingId] = useState(null);

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      const res = await api.get('/insights');
      if (res.data.available === false) {
        setAvailable(false);
        setUnavailableMessage(res.data.message || 'Insights unavailable right now');
        setInsights([]);
      } else {
        setAvailable(true);
        setInsights(res.data.insights || []);
      }
    } catch (err) {
      console.warn('Could not fetch habit insights:', err.message);
      setAvailable(false);
      setUnavailableMessage('Insights unavailable right now');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (refreshing) return;
    try {
      setRefreshing(true);
      const res = await api.post('/insights/refresh');
      if (res.data.available === false) {
        setAvailable(false);
        setUnavailableMessage(res.data.message || 'Insights unavailable right now');
        setInsights([]);
      } else {
        setAvailable(true);
        setInsights(res.data.insights || []);
        // Reset client-side dismissed IDs on manual refresh
        setDismissedIds(new Set());
        toast.success('Habit insights refreshed');
      }
    } catch (err) {
      console.warn('Failed to refresh insights:', err.message);
      toast.error('Could not refresh insights right now');
    } finally {
      setRefreshing(false);
    }
  };

  const handleDismiss = async (habitId) => {
    // Hide client-side immediately
    setDismissedIds((prev) => new Set([...prev, habitId]));
    try {
      await api.patch(`/insights/${habitId}/dismiss`);
    } catch (err) {
      console.warn('Failed to record insight dismissal on server:', err.message);
    }
  };

  const handleApplySuggestion = async (insight) => {
    if (!insight.suggestedChange || !insight.suggestedChange.field) return;
    try {
      setApplyingId(insight.habitId);

      // Fetch full habit document to preserve all fields
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
      handleDismiss(insight.habitId);
    } catch (err) {
      console.error('Failed to apply suggestion:', err);
      toast.error(err.response?.data?.message || 'Failed to update habit schedule');
    } finally {
      setApplyingId(null);
    }
  };

  // Filter out dismissed cards
  const visibleInsights = insights.filter((item) => !dismissedIds.has(item.habitId));

  // 1. Loading state
  if (loading) {
    return (
      <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-[var(--color-primary)] animate-pulse" />
            <span className="text-sm font-semibold text-[var(--color-text)]">AI Habit Insights</span>
          </div>
          <span className="text-xs text-[var(--color-text-secondary)]">Analyzing patterns…</span>
        </div>
        <div className="h-20 animate-shimmer rounded-[var(--radius-md)]" />
      </div>
    );
  }

  // 2. Unavailable state (e.g. GEMINI_API_KEY missing or failed)
  if (!available) {
    return (
      <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-4 flex items-center justify-between gap-3 text-xs text-[var(--color-text-secondary)]">
        <div className="flex items-center gap-2">
          <Info size={15} className="text-[var(--color-text-secondary)] shrink-0" />
          <span>{unavailableMessage || 'Insights unavailable right now'}</span>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-1 text-[var(--color-primary)] hover:underline cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header with Refresh button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-[var(--radius-md)] bg-[var(--color-primary-light)] flex items-center justify-center text-[var(--color-primary)]">
            <Sparkles size={15} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[var(--color-text)] flex items-center gap-1.5">
              AI Habit Insights
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Proactive suggestions to protect your streaks and prevent burnout
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors cursor-pointer disabled:opacity-50"
          title="Refresh insights"
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">{refreshing ? 'Analyzing…' : 'Refresh'}</span>
        </button>
      </div>

      {/* Empty State: No habits need attention */}
      {visibleInsights.length === 0 ? (
        <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[var(--color-success-light)] flex items-center justify-center text-[var(--color-success)] shrink-0">
            <Check size={16} />
          </div>
          <p className="text-xs sm:text-sm text-[var(--color-text)]">
            You're doing great — no habits need attention right now 🎉
          </p>
        </div>
      ) : (
        /* Insight Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {visibleInsights.map((insight) => (
            <div
              key={insight.habitId}
              className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border-l-4 border-l-[var(--color-warning)] border border-[var(--color-border)] p-4 shadow-sm flex flex-col justify-between space-y-3 transition-all hover:shadow-md"
            >
              {/* Card Header: Habit tag & Dismiss */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: insight.habitColor || 'var(--color-primary)' }}
                  />
                  <span className="text-sm font-semibold text-[var(--color-text)] truncate">
                    {insight.habitName}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded bg-[var(--color-warning-light)] text-[var(--color-warning)]">
                    Needs Attention
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDismiss(insight.habitId)}
                  className="p-1 rounded text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-border)] transition-colors cursor-pointer"
                  title="Dismiss this insight"
                  aria-label="Dismiss"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Risk Summary */}
              <div className="flex items-start gap-2 text-xs text-[var(--color-text-secondary)]">
                <AlertTriangle size={14} className="text-[var(--color-warning)] shrink-0 mt-0.5" />
                <p>{insight.riskSummary}</p>
              </div>

              {/* Concrete Suggestion Callout */}
              <div className="bg-[var(--color-warning-light)] rounded-[var(--radius-md)] p-3 border border-[var(--color-warning)]/20 text-xs text-[var(--color-text)] leading-relaxed">
                <p className="font-medium text-[var(--color-text)] mb-0.5">Recommended Adjustment:</p>
                <p>{insight.suggestion}</p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleDismiss(insight.habitId)}
                  className="text-xs px-3 py-1.5 rounded-[var(--radius-md)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] transition-colors cursor-pointer"
                >
                  Dismiss
                </button>
                {insight.suggestedChange && (
                  <button
                    type="button"
                    disabled={applyingId === insight.habitId}
                    onClick={() => handleApplySuggestion(insight)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {applyingId === insight.habitId ? (
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
          ))}
        </div>
      )}
    </div>
  );
}
