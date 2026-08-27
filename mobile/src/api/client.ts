import axios from 'axios';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

// Resolve the API base URL: env var wins, then app.json extra, then a safe default.
const fromExtra = (Constants.expoConfig?.extra as any)?.apiBaseUrl as string | undefined;
export const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  fromExtra ||
  'https://invoice-locked.preview.emergentagent.com/api';

const TOKEN_KEY = 'bill4pe_token';

export async function getToken() {
  return SecureStore.getItemAsync(TOKEN_KEY);
}
export async function setToken(t: string) {
  return SecureStore.setItemAsync(TOKEN_KEY, t);
}
export async function clearToken() {
  return SecureStore.deleteItemAsync(TOKEN_KEY);
}

const api = axios.create({ baseURL: API_BASE, timeout: 60000 });

api.interceptors.request.use(async (config) => {
  const t = await getToken();
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    if (err?.response?.status === 401) {
      await clearToken();
      onUnauthorized?.();
    }
    // Normalise FastAPI 422 detail arrays into a readable string.
    const d = err?.response?.data?.detail;
    if (d != null && typeof d !== 'string') {
      try {
        err.response.data.detail = Array.isArray(d)
          ? d.map((e: any) => e?.msg || e?.message || JSON.stringify(e)).join(', ')
          : d.msg || d.message || JSON.stringify(d);
      } catch {
        /* ignore */
      }
    }
    return Promise.reject(err);
  }
);

export function apiError(e: any, fallback = 'Something went wrong') {
  return e?.response?.data?.detail || e?.message || fallback;
}

export default api;
