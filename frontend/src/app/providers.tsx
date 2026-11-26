import type { ReactNode } from 'react';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { ToastProvider } from '@/components/ui/Toast';
import { FinanceDataProvider } from '@/hooks/FinanceDataProvider';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <FinanceDataProvider>{children}</FinanceDataProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
