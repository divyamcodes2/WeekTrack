import { Flame, Snowflake, Trophy } from 'lucide-react';

/**
 * StreakBadge — displays current streak with visual indicators.
 * Changes color based on streak status: normal, at-risk (warning), broken (danger).
 */
export default function StreakBadge({ current = 0, longest = 0, atRisk = false, compact = false }) {
  const getColor = () => {
    if (current === 0) return 'text-[var(--color-text-secondary)]';
    if (atRisk) return 'text-[var(--color-warning)]';
    if (current >= 30) return 'text-[var(--color-success)]';
    return 'text-[var(--color-primary)]';
  };

  const getBgColor = () => {
    if (current === 0) return 'bg-[var(--color-bg)]';
    if (atRisk) return 'bg-[var(--color-warning-light)]';
    if (current >= 30) return 'bg-[var(--color-success-light)]';
    return 'bg-[var(--color-primary-light)]';
  };

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${getColor()} ${
          current > 0 ? 'bg-[var(--color-bg)] border border-[var(--color-border)]' : 'text-[var(--color-text-secondary)]'
        } shrink-0 transition-colors`}
      >
        <Flame
          size={15}
          className={current > 0 ? 'text-amber-500 fill-amber-500/20 shrink-0' : 'shrink-0 text-[var(--color-text-secondary)]'}
        />
        <span>{current}</span>
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-full)] text-xs font-semibold ${getColor()} ${getBgColor()} transition-all`}
      >
        <Flame size={14} className={current > 0 ? 'animate-pulse' : ''} />
        <span>{current}d</span>
      </div>
      {longest > 0 && (
        <span className="text-[10px] text-[var(--color-text-secondary)] flex items-center gap-0.5">
          <Trophy size={10} />
          {longest}d best
        </span>
      )}
    </div>
  );
}
