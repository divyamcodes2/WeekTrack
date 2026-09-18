import { useState, useEffect } from 'react';
import { Sun, Moon, Download, LogOut, Clock, User, Sparkles, Key, Eye, EyeOff, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { user, updateSettings, logout } = useAuth();
  const { darkMode, toggleTheme } = useTheme();
  const [pomodoroWork, setPomodoroWork] = useState(user?.settings?.pomodoroWork || 25);
  const [pomodoroBreak, setPomodoroBreak] = useState(user?.settings?.pomodoroBreak || 5);
  const [streakThreshold, setStreakThreshold] = useState(user?.settings?.streakThreshold || 20);
  const [saving, setSaving] = useState(false);

  // Gemini API Key state
  const [geminiKey, setGeminiKey] = useState('');
  const [geminiHasKey, setGeminiHasKey] = useState(false);
  const [geminiMasked, setGeminiMasked] = useState('');
  const [geminiSaving, setGeminiSaving] = useState(false);
  const [geminiError, setGeminiError] = useState('');
  const [geminiShowInput, setGeminiShowInput] = useState(false);
  const [geminiShowKey, setGeminiShowKey] = useState(false);
  const [geminiDeleting, setGeminiDeleting] = useState(false);

  // Check Gemini key status on mount
  useEffect(() => {
    checkGeminiKeyStatus();
  }, []);

  const checkGeminiKeyStatus = async () => {
    try {
      const { data } = await api.get('/users/gemini-key/status');
      setGeminiHasKey(data.hasKey);
      setGeminiMasked(data.maskedKey || '');
    } catch {
      // Silently fail — just show the input form
      setGeminiHasKey(false);
    }
  };

  const saveGeminiKey = async () => {
    if (!geminiKey.trim()) {
      setGeminiError('Please enter a valid API key');
      return;
    }
    setGeminiSaving(true);
    setGeminiError('');
    try {
      const { data } = await api.put('/users/gemini-key', { apiKey: geminiKey });
      setGeminiHasKey(true);
      setGeminiMasked(data.maskedKey || '');
      setGeminiKey('');
      setGeminiShowInput(false);
      toast.success('Gemini API key saved');
    } catch (err) {
      setGeminiError(err.response?.data?.message || 'Failed to save API key');
    } finally {
      setGeminiSaving(false);
    }
  };

  const deleteGeminiKey = async () => {
    setGeminiDeleting(true);
    setGeminiError('');
    try {
      await api.delete('/users/gemini-key');
      setGeminiHasKey(false);
      setGeminiMasked('');
      setGeminiKey('');
      setGeminiShowInput(false);
      toast.success('Gemini API key removed');
    } catch (err) {
      setGeminiError(err.response?.data?.message || 'Failed to remove API key');
    } finally {
      setGeminiDeleting(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await updateSettings({ pomodoroWork, pomodoroBreak, streakThreshold });
      toast.success('Settings saved');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const exportData = async (format) => {
    try {
      const { data } = await api.get(`/export/${format}`, {
        responseType: format === 'csv' ? 'text' : 'json',
      });
      const blob = new Blob(
        [format === 'csv' ? data : JSON.stringify(data, null, 2)],
        { type: format === 'csv' ? 'text/csv' : 'application/json' }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `weektrack-export.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch {
      toast.error('Export failed');
    }
  };

  return (
    <div className="animate-fade-in max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Profile */}
      <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-5">
        <div className="flex items-center gap-3 mb-4">
          <User size={16} className="text-[var(--color-text-secondary)]" />
          <h3 className="text-sm font-semibold">Account</h3>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--color-text-secondary)]">Name</span>
            <span className="text-sm font-medium">{user?.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--color-text-secondary)]">Email</span>
            <span className="text-sm font-medium">{user?.email}</span>
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-5">
        <h3 className="text-sm font-semibold mb-4">Appearance</h3>
        <button
          onClick={toggleTheme}
          className="w-full flex items-center justify-between p-3 rounded-[var(--radius-md)] border border-[var(--color-border)] hover:bg-[var(--color-bg)] transition-colors"
        >
          <div className="flex items-center gap-3">
            {darkMode ? <Moon size={18} /> : <Sun size={18} />}
            <span className="text-sm font-medium">{darkMode ? 'Dark Mode' : 'Light Mode'}</span>
          </div>
          <div className={`w-10 h-6 rounded-full p-0.5 transition-colors ${darkMode ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}`}>
            <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${darkMode ? 'translate-x-4' : ''}`} />
          </div>
        </button>
      </div>

      {/* Timer */}
      <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={16} className="text-[var(--color-accent)]" />
          <h3 className="text-sm font-semibold">Pomodoro Timer</h3>
        </div>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm">Work Duration</label>
              <span className="text-sm font-semibold text-[var(--color-accent)]">{pomodoroWork} min</span>
            </div>
            <input
              type="range" min="5" max="60" step="5"
              value={pomodoroWork}
              onChange={(e) => setPomodoroWork(parseInt(e.target.value))}
              className="w-full accent-[var(--color-accent)]"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm">Break Duration</label>
              <span className="text-sm font-semibold text-[var(--color-success)]">{pomodoroBreak} min</span>
            </div>
            <input
              type="range" min="1" max="30" step="1"
              value={pomodoroBreak}
              onChange={(e) => setPomodoroBreak(parseInt(e.target.value))}
              className="w-full accent-[var(--color-success)]"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm">Streak-at-risk after</label>
              <span className="text-sm font-semibold text-[var(--color-warning)]">{streakThreshold}:00</span>
            </div>
            <input
              type="range" min="12" max="23"
              value={streakThreshold}
              onChange={(e) => setStreakThreshold(parseInt(e.target.value))}
              className="w-full accent-[var(--color-warning)]"
            />
          </div>
          <button
            onClick={saveSettings}
            disabled={saving}
            className="w-full py-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-white text-sm font-medium hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* AI Coach — Gemini API Key */}
      <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={16} className="text-[var(--color-primary)]" />
          <h3 className="text-sm font-semibold">AI Coach</h3>
        </div>

        <p className="text-xs text-[var(--color-text-secondary)] mb-4 leading-relaxed">
          WeekTrack uses your own Gemini API key for AI-powered insights. Get a free key at{' '}
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-primary)] font-medium hover:underline"
          >
            aistudio.google.com/apikey
          </a>
        </p>

        {geminiHasKey && !geminiShowInput ? (
          /* Key is saved — show masked display */
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-[var(--radius-md)] bg-[var(--color-bg)] border border-[var(--color-border)]">
              <div className="flex items-center gap-2.5">
                <Key size={14} className="text-[var(--color-success)] shrink-0" />
                <div>
                  <span className="text-xs font-medium text-[var(--color-success)]">Key saved</span>
                  <p className="text-xs text-[var(--color-text-secondary)] font-mono mt-0.5">{geminiMasked}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setGeminiShowInput(true)}
                  className="text-xs px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] transition-colors"
                >
                  Replace
                </button>
                <button
                  onClick={deleteGeminiKey}
                  disabled={geminiDeleting}
                  className="p-1.5 rounded-[var(--radius-md)] text-[var(--color-danger)] hover:bg-[var(--color-danger-light)] transition-colors disabled:opacity-50"
                  title="Remove key"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* No key or replacing — show input */
          <div className="space-y-3">
            <div className="relative">
              <input
                type={geminiShowKey ? 'text' : 'password'}
                value={geminiKey}
                onChange={(e) => {
                  setGeminiKey(e.target.value);
                  setGeminiError('');
                }}
                placeholder="Paste your Gemini API key here"
                className="w-full px-3 py-2.5 pr-10 text-sm rounded-[var(--radius-md)] bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)] transition-colors"
              />
              <button
                type="button"
                onClick={() => setGeminiShowKey(!geminiShowKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors"
              >
                {geminiShowKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {geminiError && (
              <p className="text-xs text-[var(--color-danger)] flex items-center gap-1">
                {geminiError}
              </p>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={saveGeminiKey}
                disabled={geminiSaving || !geminiKey.trim()}
                className="px-4 py-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-white text-sm font-medium hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50"
              >
                {geminiSaving ? 'Saving...' : 'Save Key'}
              </button>
              {geminiHasKey && (
                <button
                  onClick={() => {
                    setGeminiShowInput(false);
                    setGeminiKey('');
                    setGeminiError('');
                  }}
                  className="px-3 py-2 rounded-[var(--radius-md)] text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Export */}
      <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-5">
        <div className="flex items-center gap-2 mb-4">
          <Download size={16} className="text-[var(--color-text-secondary)]" />
          <h3 className="text-sm font-semibold">Export Data</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => exportData('json')}
            className="py-2.5 rounded-[var(--radius-md)] border border-[var(--color-border)] text-sm font-medium hover:bg-[var(--color-bg)] transition-colors"
          >
            Export JSON
          </button>
          <button
            onClick={() => exportData('csv')}
            className="py-2.5 rounded-[var(--radius-md)] border border-[var(--color-border)] text-sm font-medium hover:bg-[var(--color-bg)] transition-colors"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={logout}
        className="w-full py-2.5 rounded-[var(--radius-md)] border border-[var(--color-danger)] text-[var(--color-danger)] text-sm font-medium hover:bg-[var(--color-danger-light)] transition-colors flex items-center justify-center gap-2"
      >
        <LogOut size={16} />
        Log Out
      </button>
    </div>
  );
}
