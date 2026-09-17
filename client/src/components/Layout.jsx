import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

/**
 * App shell layout with responsive sidebar/bottom nav.
 */
export default function Layout() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <Navbar />
      {/* Main content area — offset for sidebar on desktop, top/bottom nav on mobile */}
      <main className="lg:ml-[220px] pt-14 lg:pt-0 pb-20 lg:pb-0 min-h-screen">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
