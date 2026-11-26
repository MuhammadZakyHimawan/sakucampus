import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function jsonResponse(payload: unknown): Response {
  return {
    ok: true,
    status: 200,
    headers: {
      get: (name: string) =>
        name.toLowerCase() === 'content-type' ? 'application/json' : null,
    },
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  } as unknown as Response;
}

describe('analytics service (HTTP mode)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('VITE_USE_MOCK_API', 'false');
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test/v1');
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('fetches dashboard and report data from the backend', async () => {
    const dashboardPayload = { transactionCount: 4 };
    const reportPayload = { transactionCount: 3 };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(dashboardPayload))
      .mockResolvedValueOnce(jsonResponse(reportPayload));
    vi.stubGlobal('fetch', fetchMock);

    const { fetchDashboardData, fetchReportData } = await import(
      './analytics.service'
    );

    await expect(
      fetchDashboardData({
        user: {
          id: 'user-1',
          name: 'Andi',
          email: 'andi@example.com',
          currency: 'IDR',
          initialBalance: 0,
          minBalance: 0,
        },
        transactions: [],
        budgets: [],
        preset: '7d',
        reference: new Date(2026, 10, 19),
      }),
    ).resolves.toEqual(dashboardPayload);

    await expect(
      fetchReportData({ transactions: [], preset: '30d' }),
    ).resolves.toEqual(reportPayload);

    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.example.test/v1/analytics/dashboard?preset=7d&reference=2026-11-19',
    );
    expect(fetchMock.mock.calls[1][0]).toBe(
      'https://api.example.test/v1/analytics/report?preset=30d',
    );
  });
});
