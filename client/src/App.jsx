import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import ProtectedRoute from './features/auth/ProtectedRoute';
import LoginPage from './features/auth/LoginPage';
import SignupPage from './features/auth/SignupPage';
import TodayView from './features/habits/TodayView';
import WeekGrid from './features/habits/WeekGrid';
import StatsDashboard from './features/stats/StatsDashboard';
import PomodoroTimer from './features/pomodoro/PomodoroTimer';
import HistoryPage from './features/history/HistoryPage';
import InsightsPage from './features/insights/InsightsPage';
import SettingsPage from './features/settings/SettingsPage';

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          {/* Toast notifications */}
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3000,
              style: {
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                fontSize: '14px',
                boxShadow: 'var(--shadow-md)',
              },
            }}
          />

          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            {/* Protected routes with layout */}
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<TodayView />} />
              <Route path="/week" element={<WeekGrid />} />
              <Route path="/stats" element={<StatsDashboard />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/insights" element={<InsightsPage />} />
              <Route path="/timer" element={<PomodoroTimer />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
