import { STORAGE_KEYS } from '@/lib/config';

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
  params?: Record<string, string | number | boolean | undefined | null>;
  skipAuth?: boolean;
}

export interface DownloadedBlob {
  blob: Blob;
  filename: string;
}

type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setOnUnauthorizedHandler(
  handler: UnauthorizedHandler | null,
): void {
  unauthorizedHandler = handler;
}

export function getAccessToken(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEYS.token);
  } catch {
    return null;
  }
}

export function setAccessToken(token: string | null): void {
  try {
    if (token) {
      window.localStorage.setItem(STORAGE_KEYS.token, token);
    } else {
      window.localStorage.removeItem(STORAGE_KEYS.token);
    }
  } catch {
    // Abaikan bila localStorage tidak tersedia.
  }
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

          return typeof message === 'string'
            ? message.replace(/^Value error,\s*/i, '')
            : null;
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

function buildUrl(
  path: string,
  params?: Record<string, string | number | boolean | undefined | null>,
): string {
  const base = `${getApiBaseUrl()}/${path.replace(/^\/+/, '')}`;

  if (!params) {
    return base;
  }

  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  });

  const query = searchParams.toString();

  return query ? `${base}?${query}` : base;
}

function handleUnauthorizedIfNeeded(status: number, skipAuth?: boolean): void {
  if (status === 401 && !skipAuth) {
    const hadToken = Boolean(getAccessToken());
    setAccessToken(null);
    try {
      window.localStorage.removeItem(STORAGE_KEYS.auth);
    } catch {
      // Abaikan bila localStorage tidak tersedia.
    }

    if (hadToken && unauthorizedHandler) {
      unauthorizedHandler();
    }
  }
}

export function parseFilenameFromDisposition(
  disposition: string | null,
  fallback = 'SakuCampus_Laporan.pdf',
): string {
  if (!disposition) {
    return fallback;
  }

  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1].trim());
    } catch {
      return utf8Match[1].trim();
    }
  }

  const simpleMatch = disposition.match(/filename="?([^";]+)"?/i);
  if (simpleMatch?.[1]?.trim()) {
    return simpleMatch[1].trim();
  }

  return fallback;
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { body, headers: customHeaders, params, skipAuth, ...rest } = options;
  const url = buildUrl(path, params);
  const headers = new Headers(customHeaders);

  headers.set('Accept', 'application/json');

  if (!skipAuth && !headers.has('Authorization')) {
    const token = getAccessToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  if (body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;

  try {
    response = await fetch(url, {
      ...rest,
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
    handleUnauthorizedIfNeeded(response.status, skipAuth);
    const message =
      extractErrorMessage(payload) ??
      `Permintaan gagal dengan status ${response.status}.`;

    throw new ApiError(message, response.status, payload);
  }

  return payload as T;
}

export async function apiDownloadBlob(
  path: string,
  params?: Record<string, string | number | boolean | undefined | null>,
  fallbackFilename = 'SakuCampus_Laporan.pdf',
): Promise<DownloadedBlob> {
  const url = buildUrl(path, params);
  const headers = new Headers();
  headers.set('Accept', 'application/pdf, application/octet-stream');

  const token = getAccessToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;

  try {
    response = await fetch(url, { method: 'GET', headers });
  } catch (error) {
    throw new ApiError(
      'Tidak dapat terhubung ke server untuk mengunduh dokumen.',
      0,
      error,
    );
  }

  if (!response.ok) {
    const payload = await parseResponseBody(response);
    handleUnauthorizedIfNeeded(response.status, false);
    const message =
      extractErrorMessage(payload) ??
      `Gagal mengunduh dokumen (status ${response.status}).`;
    throw new ApiError(message, response.status, payload);
  }

  const blob = await response.blob();
  const filename = parseFilenameFromDisposition(
    response.headers.get('content-disposition'),
    fallbackFilename,
  );

  return { blob, filename };
}
