import type { PlanId } from './plans';

const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '');

export interface SubscriptionStatus {
  plan: PlanId;
  expiresAt: number | null;
  source: string | null;
  email: string | null;
  hasTelegram: boolean;
}

export function apiEnabled() {
  return Boolean(API_URL) || import.meta.env.DEV;
}

function apiBase() {
  if (API_URL) return API_URL;
  if (import.meta.env.DEV) return '';
  return null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const base = apiBase();
  if (base === null) throw new Error('API не настроен');

  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return data as T;
}

export async function fetchSubscription(clientId: string): Promise<SubscriptionStatus> {
  return request<SubscriptionStatus>(
    `/api/v1/subscription/status?clientId=${encodeURIComponent(clientId)}`,
  );
}

export async function createCheckout(clientId: string): Promise<string> {
  const data = await request<{ url: string }>('/api/v1/checkout/create', {
    method: 'POST',
    body: JSON.stringify({ clientId }),
  });
  return data.url;
}

export async function activateLicense(
  clientId: string,
  licenseKey: string,
): Promise<SubscriptionStatus> {
  return request<SubscriptionStatus>('/api/v1/license/activate', {
    method: 'POST',
    body: JSON.stringify({ clientId, licenseKey }),
  });
}

export async function getTelegramLinkUrl(clientId: string): Promise<{
  url: string;
  enabled: boolean;
  ntfyUrl: string;
  ntfyEnabled: boolean;
}> {
  return request(`/api/v1/telegram/link-url?clientId=${encodeURIComponent(clientId)}`);
}

export async function syncAlerts(
  clientId: string,
  alerts: Array<{
    id: string;
    symbol: string;
    base: string;
    price: number;
    direction: 'above' | 'below';
  }>,
) {
  return request<{ ok: boolean; synced: number }>('/api/v1/alerts/sync', {
    method: 'POST',
    body: JSON.stringify({ clientId, alerts }),
  });
}