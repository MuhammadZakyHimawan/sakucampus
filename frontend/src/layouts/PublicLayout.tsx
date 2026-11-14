import { Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { LoadingState } from '@/components/ui/LoadingState';

export function PublicLayout() {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const target = document.getElementById(location.hash.slice(1));

      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      return;
    }

    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [location.hash, location.pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <PublicNavbar />
      <div className="flex-1">
        <Suspense
          fallback={
            <LoadingState
              message="Memuat halaman..."
              className="min-h-[60vh]"
            />
          }
        >
          <Outlet />
        </Suspense>
      </div>
      <PublicFooter />
    </div>
  );
}
