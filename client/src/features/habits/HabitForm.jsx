import { useState } from 'react';
import { X } from 'lucide-react';
import { HABIT_COLORS, DAY_LABELS } from '../../utils/helpers';

/**
 * HabitForm — modal for creating or editing a habit.
 */
export default function HabitForm({ habit = null, onSubmit, onClose }) {
  const isEdit = Boolean(habit);
  const [form, setForm] = useState({
    name: habit?.name || '',
    description: habit?.description || '',
    category: habit?.category || 'General',
    frequencyType: habit?.frequency?.type || 'daily',
    frequencyDays: habit?.frequency?.days || [],
    timesPerWeek: habit?.frequency?.timesPerWeek || 3,
    color: habit?.color || HABIT_COLORS[0],
    pomodorosRequired: habit?.pomodorosRequired || 1,
  });
  const [errors, setErrors] = useState({});

  const toggleDay = (dayIndex) => {
    setForm((prev) => ({
      ...prev,
      frequencyDays: prev.frequencyDays.includes(dayIndex)
        ? prev.frequencyDays.filter((d) => d !== dayIndex)
        : [...prev.frequencyDays, dayIndex],
    }));
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (form.frequencyType === 'specific_days' && form.frequencyDays.length === 0) {
      errs.days = 'Select at least one day';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      name: form.name.trim(),
      description: form.description.trim(),
      category: form.category.trim() || 'General',
      frequency: {
        type: form.frequencyType,
        days: form.frequencyDays,
        timesPerWeek: form.timesPerWeek,
      },
      color: form.color,
      pomodorosRequired: form.pomodorosRequired,
    });
  };

  const CATEGORIES = ['General', 'Health', 'Learning', 'Wellness', 'Work', 'Creative', 'Social', 'Finance'];

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-[var(--color-surface)] rounded-[var(--radius-xl)] shadow-[var(--shadow-lg)] w-full max-w-md max-h-[90vh] overflow-y-auto animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-lg font-semibold">
            {isEdit ? 'Edit Habit' : 'New Habit'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-[var(--radius-md)] hover:bg-[var(--color-bg)] text-[var(--color-text-secondary)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Morning Exercise"
              className="w-full px-3.5 py-2.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
            />
            {errors.name && (
              <p className="text-xs text-[var(--color-danger)] mt-1">{errors.name}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional description..."
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Category</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setForm({ ...form, category: cat })}
                  className={`px-3 py-1.5 rounded-[var(--radius-full)] text-xs font-medium border transition-all ${
                    form.category === cat
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)]'
                      : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Frequency</label>
            <div className="flex gap-2 mb-3">
              {[
                { value: 'daily', label: 'Daily' },
                { value: 'specific_days', label: 'Specific Days' },
                { value: 'x_per_week', label: 'X per Week' },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm({ ...form, frequencyType: value })}
                  className={`flex-1 py-2 rounded-[var(--radius-md)] text-xs font-medium border transition-all ${
                    form.frequencyType === value
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)]'
                      : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Specific days selector */}
            {form.frequencyType === 'specific_days' && (
              <div>
                <div className="flex gap-1.5">
                  {DAY_LABELS.map((day, i) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(i)}
                      className={`flex-1 py-2 rounded-[var(--radius-md)] text-xs font-medium border transition-all ${
                        form.frequencyDays.includes(i)
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                          : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]'
                      }`}
                    >
                      {day.charAt(0)}
                    </button>
                  ))}
                </div>
                {errors.days && (
                  <p className="text-xs text-[var(--color-danger)] mt-1">{errors.days}</p>
                )}
              </div>
            )}

            {/* X per week slider */}
            {form.frequencyType === 'x_per_week' && (
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="1"
                  max="7"
                  value={form.timesPerWeek}
                  onChange={(e) =>
                    setForm({ ...form, timesPerWeek: parseInt(e.target.value) })
                  }
                  className="flex-1 accent-[var(--color-primary)]"
                />
                <span className="text-sm font-semibold text-[var(--color-primary)] min-w-[60px]">
                  {form.timesPerWeek}x / week
                </span>
              </div>
            )}
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Color</label>
            <div className="flex gap-2">
              {HABIT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setForm({ ...form, color })}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    form.color === color
                      ? 'border-[var(--color-text)] scale-110'
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Pomodoros Required */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Pomodoros to auto-complete
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="1"
                max="10"
                value={form.pomodorosRequired}
                onChange={(e) =>
                  setForm({ ...form, pomodorosRequired: parseInt(e.target.value) })
                }
                className="flex-1 accent-[var(--color-accent)]"
              />
              <span className="text-sm font-semibold text-[var(--color-accent)] min-w-[30px]">
                {form.pomodorosRequired}
              </span>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full py-2.5 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-white text-sm font-semibold hover:bg-[var(--color-primary-hover)] transition-colors"
          >
            {isEdit ? 'Save Changes' : 'Create Habit'}
          </button>
        </form>
      </div>
    </div>
  );
}
