import { useCallback, useEffect, useState } from 'react';
import {
  activateLicense,
  apiEnabled,
  createCheckout,
  createStarsCheckout,
  fetchSubscription,
  verifyCheckout,
  type SubscriptionStatus,
} from '../lib/api';
import { getClientId } from '../lib/clientId';
import type { PlanId } from '../lib/plans';

export function useSubscription() {
  const clientId = getClientId();
  const [plan, setPlan] = useState<PlanId>('free');
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [loading, setLoading] = useState(apiEnabled());
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!apiEnabled()) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const data = await fetchSubscription(clientId);
      setStatus(data);
      setPlan(data.plan);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка проверки подписки');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5 * 60_000);
    return () => clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') !== 'success') return;

    const sessionId = params.get('session_id');
    params.delete('checkout');
    params.delete('session_id');
    const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}`;
    window.history.replaceState({}, '', next);

    const finalize = async () => {
      try {
        if (sessionId && apiEnabled()) {
          const data = await verifyCheckout(clientId, sessionId);
          setStatus(data);
          setPlan(data.plan);
          return;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка подтверждения оплаты');
      }
      await refresh();
    };

    void finalize();
  }, [clientId, refresh]);

  const isPro = plan === 'pro';

  const openPricing = useCallback(() => setPricingOpen(true), []);
  const closePricing = useCallback(() => setPricingOpen(false), []);

  const startCheckout = useCallback(async () => {
    if (!apiEnabled()) {
      setError('API не настроен. Задайте VITE_API_URL.');
      return;
    }
    const url = await createCheckout(clientId);
    window.location.href = url;
  }, [clientId]);

  const startStarsCheckout = useCallback(async () => {
    if (!apiEnabled()) {
      setError('API не настроен. Задайте VITE_API_URL.');
      return;
    }
    const { url } = await createStarsCheckout(clientId);
    window.open(url, '_blank', 'noopener,noreferrer');
    setPricingOpen(false);
    setError(null);
  }, [clientId]);

  const redeemLicense = useCallback(
    async (licenseKey: string) => {
      if (!apiEnabled()) throw new Error('API не настроен');
      const data = await activateLicense(clientId, licenseKey);
      setStatus(data);
      setPlan(data.plan);
      setPricingOpen(false);
      return data;
    },
    [clientId],
  );

  return {
    clientId,
    plan,
    isPro,
    status,
    loading,
    error,
    apiOnline: apiEnabled(),
    pricingOpen,
    openPricing,
    closePricing,
    refresh,
    startCheckout,
    startStarsCheckout,
    redeemLicense,
  };
}