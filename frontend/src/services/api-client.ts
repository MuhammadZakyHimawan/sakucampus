import { CSRF_HEADER_NAME } from '@/lib/config';
import { getCsrfToken } from './session-storage';

const DEFAULT_API_BASE_URL = 'http://localhost:8000/api/v1';

export class ApiError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

function extractErrorMessage(payload: unknown): string | null {
  if (typeof payload === 'string') {
    return payload.trim() || null;
  }

  if (typeof payload !== 'object' || payload === null) {
    return null;
  }

  const candidate = payload as { detail?: unknown; message?: unknown };

  if (typeof candidate.detail === 'string' && candidate.detail.trim()) {
    return candidate.detail;
  }

  if (Array.isArray(candidate.detail)) {
    const details = candidate.detail
      .map((item) => {
        if (typeof item === 'string') {
          return item;
        }

        if (typeof item === 'object' && item !== null) {
          const message = (item as { msg?: unknown }).msg;

          return typeof message === 'string' ? message : null;
        }

        return null;
      })
      .filter((item): item is string => Boolean(item));

    if (details.length > 0) {
      return details.join(' ');
    }
  }

  if (typeof candidate.message === 'string' && candidate.message.trim()) {
    return candidate.message;
  }

  return null;
}

async function parseResponseBody(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return undefined;
  }

  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch {
      return undefined;
    }
  }

  const text = await response.text();

  return text.length > 0 ? text : undefined;
}

export function getApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();

  return (configured && configured.length > 0
    ? configured
    : DEFAULT_API_BASE_URL
  ).replace(/\/+$/, '');
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { body, headers: customHeaders, ...rest } = options;
  const url = `${getApiBaseUrl()}/${path.replace(/^\/+/, '')}`;
  const headers = new Headers(customHeaders);
  const method = (options.method ?? 'GET').toUpperCase();

  headers.set('Accept', 'application/json');

  if (body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
    const csrfToken = getCsrfToken();

    if (csrfToken) {
      headers.set(CSRF_HEADER_NAME, csrfToken);
    }
  }

  let response: Response;

  try {
    response = await fetch(url, {
      ...rest,
      method,
      credentials: 'include',
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    throw new ApiError(
      'Tidak dapat terhubung ke server. Periksa koneksi dan alamat API.',
      0,
      error,
    );
  }

  const payload = await parseResponseBody(response);

  if (!response.ok) {
    const message =
      extractErrorMessage(payload) ??
      `Permintaan gagal dengan status ${response.status}.`;

    throw new ApiError(message, response.status, payload);
  }

  return payload as T;
}
