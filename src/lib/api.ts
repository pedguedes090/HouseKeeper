import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { TokenPair } from '@/lib/types';

const ACCESS_TOKEN_KEY = 'housekeeper.accessToken';
const REFRESH_TOKEN_KEY = 'housekeeper.refreshToken';

export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL ??
  'https://house-keeper.truyenlaunch.dev/api/v1'
).replace(/\/+$/, '');

let accessToken: string | null = null;
let refreshToken: string | null = null;
let refreshPromise: Promise<boolean> | null = null;

function webStorage() {
  if (Platform.OS !== 'web' || typeof globalThis.localStorage === 'undefined') {
    return null;
  }
  return globalThis.localStorage;
}

async function readToken(key: string) {
  const storage = webStorage();
  return storage ? storage.getItem(key) : SecureStore.getItemAsync(key);
}

async function writeToken(key: string, value: string) {
  const storage = webStorage();
  if (storage) {
    storage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function deleteToken(key: string) {
  const storage = webStorage();
  if (storage) {
    storage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly payload?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function hydrateTokens() {
  const values = await Promise.all([
    readToken(ACCESS_TOKEN_KEY),
    readToken(REFRESH_TOKEN_KEY),
  ]);
  [accessToken, refreshToken] = values;
  return Boolean(accessToken && refreshToken);
}

export async function saveTokens(tokens: TokenPair) {
  accessToken = tokens.accessToken;
  refreshToken = tokens.refreshToken;
  await Promise.all([
    writeToken(ACCESS_TOKEN_KEY, tokens.accessToken),
    writeToken(REFRESH_TOKEN_KEY, tokens.refreshToken),
  ]);
}

export async function clearTokens() {
  accessToken = null;
  refreshToken = null;
  await Promise.all([
    deleteToken(ACCESS_TOKEN_KEY),
    deleteToken(REFRESH_TOKEN_KEY),
  ]);
}

export function getRefreshToken() {
  return refreshToken;
}

export function getAccessToken() {
  return accessToken;
}

function extractMessage(payload: unknown, fallback: string) {
  if (typeof payload === 'object' && payload !== null) {
    const value = payload as Record<string, unknown>;
    if (typeof value.message === 'string') return value.message;
    if (typeof value.error === 'string') return value.error;
  }
  return fallback;
}

async function refreshAccessToken() {
  if (!refreshToken) return false;
  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) {
      await clearTokens();
      return false;
    }
    const tokens = (await response.json()) as TokenPair;
    await saveTokens(tokens);
    return true;
  } catch {
    return false;
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw new ApiError(
      response.status,
      extractMessage(payload, 'Không thể xử lý yêu cầu.'),
      payload,
    );
  }
  return payload as T;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  retryOnUnauthorized = true,
): Promise<T> {
  const headers = new Headers(options.headers);
  const isFormData = options.body instanceof FormData;
  if (!isFormData && options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  } catch (error) {
    throw new ApiError(
      0,
      'Không kết nối được máy chủ. Hãy kiểm tra backend và địa chỉ API.',
      error,
    );
  }

  if (response.status === 401 && retryOnUnauthorized && refreshToken) {
    refreshPromise ??= refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
    if (await refreshPromise) {
      return apiFetch<T>(path, options, false);
    }
  }

  return parseResponse<T>(response);
}

export function getApiErrorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Đã có lỗi xảy ra. Vui lòng thử lại.';
}

export function absoluteApiUrl(path: string | null | undefined) {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  const apiOrigin = API_BASE_URL.replace(/\/api\/v1$/, '');
  return `${apiOrigin}${path.startsWith('/') ? path : `/${path}`}`;
}
