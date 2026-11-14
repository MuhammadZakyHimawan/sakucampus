import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';
import { AppLayout } from '@/layouts/AppLayout';
import { PublicLayout } from '@/layouts/PublicLayout';
import { NotFoundPage } from './NotFoundPage';

const LoginPage = lazy(() =>
  import('@/features/auth/LoginPage').then((module) => ({
    default: module.LoginPage,
  })),
);
const RegisterPage = lazy(() =>
  import('@/features/auth/RegisterPage').then((module) => ({
    default: module.RegisterPage,
  })),
);
const ForgotPasswordPage = lazy(() =>
  import('@/features/auth/ForgotPasswordPage').then((module) => ({
    default: module.ForgotPasswordPage,
  })),
);
const LandingPage = lazy(() =>
  import('@/features/landing/LandingPage').then((module) => ({
    default: module.LandingPage,
  })),
);
const DashboardPage = lazy(() =>
  import('@/features/dashboard/DashboardPage').then((module) => ({
    default: module.DashboardPage,
  })),
);
const TransactionsPage = lazy(() =>
  import('@/features/transactions/TransactionsPage').then((module) => ({
    default: module.TransactionsPage,
  })),
);
const BudgetsPage = lazy(() =>
  import('@/features/budgets/BudgetsPage').then((module) => ({
    default: module.BudgetsPage,
  })),
);
const GoalsPage = lazy(() =>
  import('@/features/goals/GoalsPage').then((module) => ({
    default: module.GoalsPage,
  })),
);
const ReportsPage = lazy(() =>
  import('@/features/reports/ReportsPage').then((module) => ({
    default: module.ReportsPage,
  })),
);
const NotificationsPage = lazy(() =>
  import('@/features/notifications/NotificationsPage').then((module) => ({
    default: module.NotificationsPage,
  })),
);
const EducationPage = lazy(() =>
  import('@/features/education/EducationPage').then((module) => ({
    default: module.EducationPage,
  })),
);
const ProfilePage = lazy(() =>
  import('@/features/profile/ProfilePage').then((module) => ({
    default: module.ProfilePage,
  })),
);
const TelegramSettingsPage = lazy(() =>
  import('@/features/telegram/TelegramSettingsPage').then((module) => ({
    default: module.TelegramSettingsPage,
  })),
);
const FinanceSettingsPage = lazy(() =>
  import('@/features/finance/FinanceSettingsPage').then((module) => ({
    default: module.FinanceSettingsPage,
  })),
);

export const appRoutes: RouteObject[] = [
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <LandingPage /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/transactions', element: <TransactionsPage /> },
          { path: '/budgets', element: <BudgetsPage /> },
          { path: '/goals', element: <GoalsPage /> },
          { path: '/reports', element: <ReportsPage /> },
          { path: '/notifications', element: <NotificationsPage /> },
          { path: '/education', element: <EducationPage /> },
          { path: '/settings/profile', element: <ProfilePage /> },
          { path: '/settings/telegram', element: <TelegramSettingsPage /> },
          { path: '/settings/finance', element: <FinanceSettingsPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
];
