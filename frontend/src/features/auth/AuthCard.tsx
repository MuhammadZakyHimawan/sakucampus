import { Wallet } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { APP_NAME } from '@/lib/config';

export interface AuthCardProps {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthCard({
  title,
  description,
  children,
  footer,
}: AuthCardProps) {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <Link
            to="/"
            className="flex items-center gap-2 text-lg font-extrabold"
            aria-label={`${APP_NAME} beranda`}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white">
              <Wallet className="h-5 w-5" aria-hidden="true" />
            </span>
            <span>{APP_NAME}</span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="max-w-sm text-sm text-ink-secondary">{description}</p>
        </div>

        <Card className="p-6">{children}</Card>

        {footer ? (
          <div className="mt-4 text-center text-sm text-ink-secondary">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
