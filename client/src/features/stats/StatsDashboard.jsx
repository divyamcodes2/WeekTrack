import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { Flame, Trophy, TrendingUp, Clock, Target } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import Heatmap from './Heatmap';
import InsightsPanel from './InsightsPanel';

export default function StatsDashboard() {
  const [overview, setOverview] = useState(null);
  const [streaks, setStreaks] = useState({ habits: [], momentumStreak: 0 });
  const [weeklyChart, setWeeklyChart] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const [overviewRes, streaksRes, chartRes] = await Promise.all([
        api.get('/stats/overview'),
        api.get('/stats/streaks'),
        api.get('/stats/weekly-chart'),
      ]);
      setOverview(overviewRes.data);
      setStreaks(streaksRes.data);
      setWeeklyChart(chartRes.data.weeks.map((w) => ({
        ...w,
        label: new Date(w.week + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      })));
    } catch {
      toast.error('Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 animate-shimmer rounded-[var(--radius-lg)]" />
        ))}
      </div>
    );
  }

  const customTooltipStyle = {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: '8px 12px',
    color: 'var(--color-text)',
    fontSize: '12px',
  };

  return (
    <div className="animate-fade-in space-y-6">
      <h1 className="text-2xl font-bold">Statistics</h1>

      {/* AI Habit Insights */}
      <InsightsPanel />

      {/* Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target size={16} className="text-[var(--color-primary)]" />
            <span className="text-xs text-[var(--color-text-secondary)]">Weekly Rate</span>
          </div>
          <div className="text-2xl font-bold">{overview?.weeklyRate || 0}%</div>
        </div>
        <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-[var(--color-success)]" />
            <span className="text-xs text-[var(--color-text-secondary)]">Monthly Rate</span>
          </div>
          <div className="text-2xl font-bold">{overview?.monthlyRate || 0}%</div>
        </div>
        <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Flame size={16} className="text-[var(--color-warning)]" />
            <span className="text-xs text-[var(--color-text-secondary)]">Momentum</span>
          </div>
          <div className="text-2xl font-bold">{streaks.momentumStreak}d</div>
        </div>
        <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={16} className="text-[var(--color-accent)]" />
            <span className="text-xs text-[var(--color-text-secondary)]">Focus Today</span>
          </div>
          <div className="text-2xl font-bold">{overview?.pomodoroStats?.todayMinutes || 0}m</div>
        </div>
      </div>

      {/* Weekly Completion Chart */}
      <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-5">
        <h3 className="text-sm font-semibold mb-4">Weekly Completion Rate</h3>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={weeklyChart}>
              <defs>
                <linearGradient id="primaryGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} unit="%" />
              <Tooltip contentStyle={customTooltipStyle} />
              <Area
                type="monotone"
                dataKey="rate"
                stroke="var(--color-primary)"
                strokeWidth={2}
                fill="url(#primaryGradient)"
                name="Completion %"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Heatmap */}
      <Heatmap />

      {/* Streaks Overview */}
      <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-5">
        <h3 className="text-sm font-semibold mb-4">Streak Leaderboard</h3>
        {streaks.habits.length === 0 ? (
          <p className="text-sm text-[var(--color-text-secondary)] text-center py-6">No habits to show</p>
        ) : (
          <div className="space-y-2">
            {streaks.habits.map((habit, i) => (
              <div
                key={habit._id}
                className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] bg-[var(--color-bg)]"
              >
                <span className="text-sm font-semibold text-[var(--color-text-secondary)] w-6">{i + 1}</span>
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: habit.color }} />
                <span className="text-sm font-medium flex-1 truncate">{habit.name}</span>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-sm">
                    <Flame size={14} className="text-[var(--color-warning)]" />
                    <span className="font-semibold">{habit.currentStreak}d</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)]">
                    <Trophy size={12} />
                    <span>{habit.longestStreak}d</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Category Breakdown */}
      {overview?.categoryBreakdown?.length > 0 && (
        <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-5">
          <h3 className="text-sm font-semibold mb-4">Category Consistency</h3>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={overview.categoryBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="category" tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} unit="%" />
                <Tooltip contentStyle={customTooltipStyle} />
                <Bar dataKey="rate" fill="var(--color-primary)" radius={[4, 4, 0, 0]} name="Consistency %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Pomodoro Stats */}
      <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-5">
        <h3 className="text-sm font-semibold mb-4">Focus Stats</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-4 bg-[var(--color-bg)] rounded-[var(--radius-md)]">
            <div className="text-2xl font-bold text-[var(--color-accent)]">
              {overview?.pomodoroStats?.thisWeek || 0}
            </div>
            <div className="text-xs text-[var(--color-text-secondary)] mt-1">Sessions This Week</div>
          </div>
          <div className="text-center p-4 bg-[var(--color-bg)] rounded-[var(--radius-md)]">
            <div className="text-2xl font-bold text-[var(--color-accent)]">
              {overview?.pomodoroStats?.weekMinutes || 0}m
            </div>
            <div className="text-xs text-[var(--color-text-secondary)] mt-1">Focus Minutes</div>
          </div>
        </div>
      </div>
    </div>
  );
}
