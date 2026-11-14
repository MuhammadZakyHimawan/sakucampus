import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiRequest, getApiBaseUrl } from './api-client';

interface MockResponseOptions {
  status?: number;
  payload?: unknown;
  contentType?: string;
}

function createResponse({
  status = 200,
  payload,
  contentType = 'application/json',
}: MockResponseOptions = {}): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string) =>
        name.toLowerCase() === 'content-type' ? contentType : null,
    },
    json: async () => payload,
    text: async () =>
      typeof payload === 'string' ? payload : JSON.stringify(payload),
  } as unknown as Response;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('getApiBaseUrl', () => {
  it('falls back to the default URL and strips trailing slashes', () => {
    vi.stubEnv('VITE_API_BASE_URL', '');

    expect(getApiBaseUrl()).toBe('http://localhost:8000/api/v1');

    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test/v1/');

    expect(getApiBaseUrl()).toBe('https://api.example.test/v1');
  });
});

describe('apiRequest', () => {
  it('sends a JSON request to the configured base URL and returns the body', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test/v1/');
    const fetchMock = vi
      .fn()
      .mockResolvedValue(createResponse({ payload: { id: 'trx-1' } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await apiRequest<{ id: string }>('/transactions', {
      method: 'POST',
      body: { amount: 20_000 },
    });

    expect(result).toEqual({ id: 'trx-1' });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];

    expect(url).toBe('https://api.example.test/v1/transactions');
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ amount: 20_000 }));

    const headers = init.headers as Headers;

    expect(headers.get('Accept')).toBe('application/json');
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('returns undefined for an empty 204 response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(createResponse({ status: 204, payload: undefined })),
    );

    await expect(apiRequest('/transactions/trx-1', { method: 'DELETE' })).resolves
      .toBeUndefined();
  });

  it('throws an ApiError with the server message on a failed response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        createResponse({
          status: 400,
          payload: { detail: 'Email sudah digunakan.' },
        }),
      ),
    );

    await expect(
      apiRequest('/auth/register', { method: 'POST', body: {} }),
    ).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
      message: 'Email sudah digunakan.',
    });
  });

  it('throws an ApiError with status 0 when the network fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('offline')),
    );

    const error = await apiRequest('/transactions').catch(
      (requestError: unknown) => requestError,
    );

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(0);
  });
});
