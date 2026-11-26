import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { LoadingState } from '@/components/ui/LoadingState';
import { useAuth } from './auth-context';

export function ProtectedRoute() {
  const { isAuthenticated, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingState message="Memeriksa sesi akun..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate to="/login" replace state={{ from: location.pathname }} />
    );
  }

  return <Outlet />;
}
