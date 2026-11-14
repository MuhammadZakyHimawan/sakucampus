import { Suspense } from 'react';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEYS } from '@/lib/config';
import { DEMO_USER } from '@/mocks/users';
import { AppProviders } from './providers';
import { appRoutes } from './routes';

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
});

function renderRoute(route: string) {
  return render(
    <AppProviders>
      <Suspense fallback={<p>Memuat halaman...</p>}>
        <RouterProvider
          router={createMemoryRouter(appRoutes, {
            initialEntries: [route],
          })}
        />
      </Suspense>
    </AppProviders>,
  );
}

function authenticateAsDemoUser() {
  window.localStorage.setItem(
    STORAGE_KEYS.auth,
    JSON.stringify(DEMO_USER),
  );
  window.localStorage.setItem(
    STORAGE_KEYS.profile,
    JSON.stringify(DEMO_USER),
  );
}

describe('public routes', () => {
  it('renders the landing page', async () => {
    renderRoute('/');

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: /Atur Uang Saku/i,
      }),
    ).toBeInTheDocument();
  });

  it('renders the login page', async () => {
    renderRoute('/login');

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Masuk ke SakuCampus',
      }),
    ).toBeInTheDocument();
  });

  it('renders the register page', async () => {
    renderRoute('/register');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Daftar akun' }),
    ).toBeInTheDocument();
  });

  it('renders the forgot password page', async () => {
    renderRoute('/forgot-password');

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Lupa password',
      }),
    ).toBeInTheDocument();
  });
});

describe('route protection', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('redirects unauthenticated visitors from a protected route', async () => {
    renderRoute('/settings/finance');

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Masuk ke SakuCampus',
      }),
    ).toBeInTheDocument();
  });

  it('renders a protected route for an authenticated demo user', async () => {
    authenticateAsDemoUser();
    renderRoute('/settings/finance');

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Pengaturan Keuangan',
      }),
    ).toBeInTheDocument();
  });

  it('renders the education page for an authenticated demo user', async () => {
    authenticateAsDemoUser();
    renderRoute('/education');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Edukasi' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'Membangun Dana Darurat dari Uang Saku',
      }),
    ).toBeInTheDocument();
  });
});
