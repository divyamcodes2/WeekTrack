import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipForward, RotateCcw } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { getToday } from '../../utils/helpers';
import toast from 'react-hot-toast';

export default function PomodoroTimer() {
  const { user } = useAuth();
  const workDuration = (user?.settings?.pomodoroWork || 25) * 60; // seconds
  const breakDuration = (user?.settings?.pomodoroBreak || 5) * 60;

  const [timeLeft, setTimeLeft] = useState(workDuration);
  const [isRunning, setIsRunning] = useState(false);
  const [isWork, setIsWork] = useState(true);
  const [linkedHabitId, setLinkedHabitId] = useState('');
  const [habits, setHabits] = useState([]);
  const [sessionsToday, setSessionsToday] = useState(0);
  const [totalMinutesToday, setTotalMinutesToday] = useState(0);
  const intervalRef = useRef(null);
  const audioRef = useRef(null);

  // Load habits for linking
  useEffect(() => {
    api.get('/habits').then((res) => setHabits(res.data.habits)).catch(() => {});
    loadSessionStats();
  }, []);

  const loadSessionStats = async () => {
    try {
      const today = getToday();
      const { data } = await api.get(`/pomodoro?startDate=${today}&endDate=${today}`);
      const workSessions = data.sessions.filter((s) => s.type === 'work');
      setSessionsToday(workSessions.length);
      setTotalMinutesToday(workSessions.reduce((sum, s) => sum + s.duration, 0));
    } catch {}
  };

  // Timer tick
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            handleCycleEnd();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning]);

  const handleCycleEnd = useCallback(async () => {
    setIsRunning(false);
    playNotificationSound();
    sendBrowserNotification(isWork ? 'Work session complete! Time for a break.' : 'Break over! Ready to focus?');

    if (isWork) {
      // Log work session
      try {
        const { data } = await api.post('/pomodoro', {
          habitId: linkedHabitId || undefined,
          duration: user?.settings?.pomodoroWork || 25,
          type: 'work',
        });
        loadSessionStats();
        if (data.autoCompleted) {
          toast.success('🎯 Habit auto-completed via Pomodoro!', { icon: '✅' });
        }
        toast.success('Focus session completed!', { icon: '🍅' });
      } catch {}
    }

    // Switch to next phase
    const nextIsWork = !isWork;
    setIsWork(nextIsWork);
    setTimeLeft(nextIsWork ? workDuration : breakDuration);
  }, [isWork, linkedHabitId, workDuration, breakDuration, user]);

  const playNotificationSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      gain.gain.value = 0.3;
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        osc2.connect(gain);
        osc2.frequency.value = 1000;
        osc2.start();
        osc2.stop(ctx.currentTime + 0.3);
      }, 400);
    } catch {}
  };

  const sendBrowserNotification = (message) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('WeekTrack Timer', { body: message, icon: '🍅' });
    }
  };

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const toggleTimer = () => setIsRunning((prev) => !prev);
  const skipCycle = () => {
    clearInterval(intervalRef.current);
    handleCycleEnd();
  };
  const resetTimer = () => {
    clearInterval(intervalRef.current);
    setIsRunning(false);
    setIsWork(true);
    setTimeLeft(workDuration);
  };

  // Format time
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const totalDuration = isWork ? workDuration : breakDuration;
  const progress = ((totalDuration - timeLeft) / totalDuration) * 100;

  // SVG circle params
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="animate-fade-in max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-center">Focus Timer</h1>

      {/* Timer Circle */}
      <div className="flex justify-center mb-8">
        <div className="relative w-[280px] h-[280px]">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 280 280">
            {/* Background circle */}
            <circle
              cx="140" cy="140" r={radius}
              fill="none"
              stroke="var(--color-border)"
              strokeWidth="6"
            />
            {/* Progress circle */}
            <circle
              cx="140" cy="140" r={radius}
              fill="none"
              stroke={isWork ? 'var(--color-accent)' : 'var(--color-success)'}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-linear"
            />
          </svg>
          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-xs font-semibold uppercase tracking-widest mb-2 ${
              isWork ? 'text-[var(--color-accent)]' : 'text-[var(--color-success)]'
            }`}>
              {isWork ? 'Focus' : 'Break'}
            </span>
            <span className="text-5xl font-bold tabular-nums">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
            <span className="text-xs text-[var(--color-text-secondary)] mt-2">
              Session #{sessionsToday + 1}
            </span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 mb-8">
        <button
          onClick={resetTimer}
          className="p-3 rounded-full border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] transition-all"
        >
          <RotateCcw size={20} />
        </button>
        <button
          onClick={toggleTimer}
          className={`w-16 h-16 rounded-full flex items-center justify-center text-white transition-all shadow-[var(--shadow-md)] hover:scale-105 active:scale-95 ${
            isWork ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-success)]'
          }`}
        >
          {isRunning ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
        </button>
        <button
          onClick={skipCycle}
          className="p-3 rounded-full border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] transition-all"
        >
          <SkipForward size={20} />
        </button>
      </div>

      {/* Link to Habit */}
      <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-4 mb-4">
        <label className="block text-sm font-medium mb-2">Link to Habit (optional)</label>
        <select
          value={linkedHabitId}
          onChange={(e) => setLinkedHabitId(e.target.value)}
          className="w-full px-3 py-2.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all"
        >
          <option value="">No habit linked</option>
          {habits.map((h) => (
            <option key={h._id} value={h._id}>
              {h.name} ({h.pomodorosRequired} pomodoro{h.pomodorosRequired > 1 ? 's' : ''} to complete)
            </option>
          ))}
        </select>
      </div>

      {/* Today's Stats */}
      <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-4">
        <h3 className="text-sm font-semibold mb-3">Today's Focus</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 bg-[var(--color-bg)] rounded-[var(--radius-md)]">
            <div className="text-xl font-bold text-[var(--color-accent)]">{sessionsToday}</div>
            <div className="text-xs text-[var(--color-text-secondary)]">Sessions</div>
          </div>
          <div className="text-center p-3 bg-[var(--color-bg)] rounded-[var(--radius-md)]">
            <div className="text-xl font-bold text-[var(--color-accent)]">{totalMinutesToday}</div>
            <div className="text-xs text-[var(--color-text-secondary)]">Minutes</div>
          </div>
        </div>
      </div>
    </div>
  );
}
