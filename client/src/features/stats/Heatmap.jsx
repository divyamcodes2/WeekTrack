import { useState, useEffect } from 'react';
import api from '../../services/api';
import { DAY_LABELS } from '../../utils/helpers';
import toast from 'react-hot-toast';

/**
 * Custom SVG heatmap — GitHub contribution-style grid.
 * Rows = weeks, columns = Mon–Sun.
 * Cell color intensity = completion percentage.
 */
export default function Heatmap() {
  const [heatmapData, setHeatmapData] = useState([]);
  const [pomodoroData, setPomodoroData] = useState([]);
  const [habits, setHabits] = useState([]);
  const [selectedHabit, setSelectedHabit] = useState('');
  const [habitColor, setHabitColor] = useState(null);
  const [tooltip, setTooltip] = useState(null);
  const [showPomodoro, setShowPomodoro] = useState(false);

  useEffect(() => {
    fetchData();
  }, [selectedHabit]);

  useEffect(() => {
    api.get('/habits').then((res) => setHabits(res.data.habits)).catch(() => {});
  }, []);

  const fetchData = async () => {
    try {
      const params = new URLSearchParams({ months: '3' });
      if (selectedHabit) params.set('habitId', selectedHabit);
      const { data } = await api.get(`/stats/heatmap?${params}`);
      setHeatmapData(data.heatmap);
      setPomodoroData(data.pomodoroHeatmap);
      setHabitColor(data.habitColor);
    } catch {
      toast.error('Failed to load heatmap');
    }
  };

  const data = showPomodoro ? pomodoroData : heatmapData;

  // Group data into weeks (Mon–Sun rows)
  const weeks = [];
  let currentWeek = [];
  data.forEach((day) => {
    const d = new Date(day.date + 'T00:00:00');
    const dow = d.getDay();
    const normalizedDow = dow === 0 ? 6 : dow - 1; // Mon=0

    if (normalizedDow === 0 && currentWeek.length > 0) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push({ ...day, dow: normalizedDow });
  });
  if (currentWeek.length > 0) weeks.push(currentWeek);

  const cellSize = 14;
  const cellGap = 3;
  const labelWidth = 28;
  const gridWidth = labelWidth + weeks.length * (cellSize + cellGap);
  const gridHeight = 7 * (cellSize + cellGap);

  const baseColor = habitColor || 'var(--color-primary)';

  // Calculate cell opacity from value
  const getCellColor = (item) => {
    if (showPomodoro) {
      const max = Math.max(...data.map((d) => d.minutes || 0), 1);
      const intensity = Math.min((item.minutes || 0) / max, 1);
      if (intensity === 0) return 'var(--color-border)';
      return `color-mix(in srgb, var(--color-accent) ${Math.round(intensity * 100)}%, transparent)`;
    } else {
      const pct = item.percentage || 0;
      if (pct === 0) return 'var(--color-border)';
      const opacity = Math.max(0.2, pct / 100);
      // Use inline style with the habit/primary color
      return habitColor
        ? `${habitColor}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`
        : `color-mix(in srgb, var(--color-primary) ${Math.round(opacity * 100)}%, transparent)`;
    }
  };

  return (
    <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h3 className="text-sm font-semibold">Activity Heatmap</h3>
        <div className="flex items-center gap-2">
          <select
            value={selectedHabit}
            onChange={(e) => setSelectedHabit(e.target.value)}
            className="px-2.5 py-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all"
          >
            <option value="">All Habits</option>
            {habits.map((h) => (
              <option key={h._id} value={h._id}>
                {h.name}
              </option>
            ))}
          </select>
          <div className="flex rounded-[var(--radius-md)] border border-[var(--color-border)] overflow-hidden">
            <button
              onClick={() => setShowPomodoro(false)}
              className={`px-2.5 py-1.5 text-xs font-medium transition-all ${
                !showPomodoro
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)]'
              }`}
            >
              Habits
            </button>
            <button
              onClick={() => setShowPomodoro(true)}
              className={`px-2.5 py-1.5 text-xs font-medium transition-all ${
                showPomodoro
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)]'
              }`}
            >
              Focus
            </button>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto pb-2">
        <svg width={gridWidth + 20} height={gridHeight + 20} className="min-w-full">
          {/* Day labels */}
          {DAY_LABELS.map((label, i) => (
            <text
              key={label}
              x={0}
              y={i * (cellSize + cellGap) + cellSize - 2}
              className="text-[9px] fill-[var(--color-text-secondary)]"
            >
              {i % 2 === 0 ? label : ''}
            </text>
          ))}

          {/* Cells */}
          {weeks.map((week, wi) =>
            week.map((day) => (
              <rect
                key={day.date}
                x={labelWidth + wi * (cellSize + cellGap)}
                y={day.dow * (cellSize + cellGap)}
                width={cellSize}
                height={cellSize}
                rx={3}
                ry={3}
                fill={getCellColor(day)}
                className="cursor-pointer transition-all hover:opacity-80"
                onMouseEnter={(e) => {
                  const rect = e.target.getBoundingClientRect();
                  setTooltip({
                    x: rect.left + rect.width / 2,
                    y: rect.top - 10,
                    date: day.date,
                    count: day.count,
                    percentage: day.percentage,
                    minutes: day.minutes,
                  });
                }}
                onMouseLeave={() => setTooltip(null)}
              />
            ))
          )}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between mt-3">
        <span className="text-[10px] text-[var(--color-text-secondary)]">Less</span>
        <div className="flex gap-1">
          {[0, 0.25, 0.5, 0.75, 1].map((level) => (
            <div
              key={level}
              className="w-3 h-3 rounded-sm"
              style={{
                backgroundColor:
                  level === 0
                    ? 'var(--color-border)'
                    : showPomodoro
                    ? `color-mix(in srgb, var(--color-accent) ${level * 100}%, transparent)`
                    : habitColor
                    ? `${habitColor}${Math.round(level * 255).toString(16).padStart(2, '0')}`
                    : `color-mix(in srgb, var(--color-primary) ${level * 100}%, transparent)`,
              }}
            />
          ))}
        </div>
        <span className="text-[10px] text-[var(--color-text-secondary)]">More</span>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)] shadow-[var(--shadow-md)] px-3 py-2 text-xs pointer-events-none animate-fade-in"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="font-semibold">{new Date(tooltip.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
          {!showPomodoro ? (
            <>
              <div className="text-[var(--color-text-secondary)]">{tooltip.count} habits completed</div>
              <div className="text-[var(--color-text-secondary)]">{tooltip.percentage}% completion</div>
            </>
          ) : (
            <div className="text-[var(--color-text-secondary)]">{tooltip.minutes} min focus time</div>
          )}
        </div>
      )}
    </div>
  );
}
