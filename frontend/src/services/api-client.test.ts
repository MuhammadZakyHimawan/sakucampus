import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  apiDownloadBlob,
  apiRequest,
  getAccessToken,
  getApiBaseUrl,
  parseFilenameFromDisposition,
  setAccessToken,
  setOnUnauthorizedHandler,
} from './api-client';

interface MockResponseOptions {
  status?: number;
  payload?: unknown;
  contentType?: string;
  disposition?: string;
}

function createResponse({
  status = 200,
  payload,
  contentType = 'application/json',
  disposition,
}: MockResponseOptions = {}): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string) => {
        const lower = name.toLowerCase();
        if (lower === 'content-type') {
          return contentType;
        }
        if (lower === 'content-disposition') {
          return disposition ?? null;
        }
        return null;
      },
    },
    json: async () => payload,
    blob: async () => new Blob(['%PDF-1.4 mock'], { type: contentType }),
    text: async () =>
      typeof payload === 'string' ? payload : JSON.stringify(payload),
  } as unknown as Response;
}

afterEach(() => {
  setOnUnauthorizedHandler(null);
  setAccessToken(null);
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

  it('injects Authorization Bearer token automatically and handles 401 logout', async () => {
    setAccessToken('jwt-token-123');
    const onUnauthorized = vi.fn();
    setOnUnauthorizedHandler(onUnauthorized);

    const fetchMock = vi.fn().mockResolvedValue(
      createResponse({
        status: 401,
        payload: { detail: 'Token kedaluwarsa' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiRequest('/auth/me')).rejects.toMatchObject({
      status: 401,
      message: 'Token kedaluwarsa',
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Headers).get('Authorization')).toBe(
      'Bearer jwt-token-123',
    );
    expect(getAccessToken()).toBeNull();
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('returns undefined for an empty 204 response', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(createResponse({ status: 204, payload: undefined })),
    );

    await expect(
      apiRequest('/transactions/trx-1', { method: 'DELETE' }),
    ).resolves.toBeUndefined();
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

describe('apiDownloadBlob', () => {
  it('downloads PDF blob with Bearer token and parses filename from Content-Disposition', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://127.0.0.1:8000/api/v1');
    setAccessToken('jwt-pdf-token');

    const fetchMock = vi.fn().mockResolvedValue(
      createResponse({
        status: 200,
        contentType: 'application/pdf',
        disposition:
          'attachment; filename="SakuCampus_Laporan_2026-11-01_2026-11-27.pdf"',
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { blob, filename } = await apiDownloadBlob('/reports/pdf', {
      preset: 'month',
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://127.0.0.1:8000/api/v1/reports/pdf?preset=month');
    expect((init.headers as Headers).get('Authorization')).toBe(
      'Bearer jwt-pdf-token',
    );
    expect(filename).toBe('SakuCampus_Laporan_2026-11-01_2026-11-27.pdf');
    expect(blob.type).toBe('application/pdf');
    expect(parseFilenameFromDisposition(null, 'fallback.pdf')).toBe(
      'fallback.pdf',
    );
  });
});
