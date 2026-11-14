import { Suspense, useCallback, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { MobileNavigation } from '@/components/layout/MobileNavigation';
import { LoadingState } from '@/components/ui/LoadingState';

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const openMenu = useCallback(() => {
    setMobileOpen(true);
  }, []);

  const closeMenu = useCallback(() => {
    setMobileOpen(false);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <MobileNavigation open={mobileOpen} onClose={closeMenu} />

      <div className="lg:pl-64">
        <AppHeader onOpenMenu={openMenu} />
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Suspense fallback={<LoadingState message="Memuat halaman..." />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
