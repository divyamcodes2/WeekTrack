import { NavLink, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import {
  CalendarDays,
  LayoutGrid,
  BarChart3,
  Timer,
  Settings,
  Sun,
  Moon,
  LogOut,
  CheckCircle2,
  History,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', icon: CheckCircle2, label: 'Today' },
  { to: '/week', icon: CalendarDays, label: 'Week' },
  { to: '/stats', icon: BarChart3, label: 'Stats' },
  { to: '/history', icon: History, label: 'History' },
  { to: '/timer', icon: Timer, label: 'Timer' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Navbar() {
  const { darkMode, toggleTheme } = useTheme();
  const { logout, user } = useAuth();
  const location = useLocation();

  return (
    <>
      {/* ─── Desktop Sidebar ─────────────────────────────── */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-[220px] border-r border-[var(--color-border)] bg-[var(--color-surface)] z-40">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-[var(--color-border)]">
          <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--color-primary)] flex items-center justify-center">
            <LayoutGrid size={18} className="text-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight">WeekTrack</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)]'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text)]'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="px-3 py-4 border-t border-[var(--color-border)] space-y-2">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] text-sm font-medium w-full text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text)] transition-all"
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            {darkMode ? 'Light Mode' : 'Dark Mode'}
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] text-sm font-medium w-full text-[var(--color-danger)] hover:bg-[var(--color-danger-light)] transition-all"
          >
            <LogOut size={18} />
            Log Out
          </button>
        </div>
      </aside>

      {/* ─── Mobile Top Bar ──────────────────────────────── */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-[var(--color-surface)] border-b border-[var(--color-border)] flex items-center justify-between px-4 z-40">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-[var(--radius-sm)] bg-[var(--color-primary)] flex items-center justify-center">
            <LayoutGrid size={14} className="text-white" />
          </div>
          <span className="text-base font-semibold">WeekTrack</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-[var(--radius-md)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] transition-all"
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      {/* ─── Mobile Bottom Nav ───────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-[var(--color-surface)] border-t border-[var(--color-border)] flex items-center justify-around px-2 z-40 safe-bottom">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to;
          return (
            <NavLink
              key={to}
              to={to}
              className="flex flex-col items-center gap-0.5 py-1 px-3 min-w-[56px]"
            >
              <div
                className={`p-1.5 rounded-[var(--radius-md)] transition-all duration-150 ${
                  isActive
                    ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)]'
                    : 'text-[var(--color-text-secondary)]'
                }`}
              >
                <Icon size={20} />
              </div>
              <span
                className={`text-[10px] font-medium ${
                  isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'
                }`}
              >
                {label}
              </span>
            </NavLink>
          );
        })}
      </nav>
    </>
  );
}
