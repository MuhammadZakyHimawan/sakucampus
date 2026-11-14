import { Suspense } from 'react';
import { LoadingState } from '@/components/ui/LoadingState';
import { AppProviders } from './providers';
import { AppRouter } from './router';

export default function App() {
  return (
    <AppProviders>
      <Suspense
        fallback={<LoadingState fullPage message="Memuat halaman..." />}
      >
        <AppRouter />
      </Suspense>
    </AppProviders>
  );
}
