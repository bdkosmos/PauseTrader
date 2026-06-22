import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchMarketScreener } from '../lib/screener';
import type { ScreenerSnapshot } from '../types';

const REFRESH_MS = 90_000;

export function useMarketScreener(enabled: boolean) {
  const [data, setData] = useState<ScreenerSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);

  const refresh = useCallback(async () => {
    if (!enabled || busy.current) return;
    busy.current = true;
    setLoading(true);
    setError(null);

    try {
      const snapshot = await fetchMarketScreener();
      setData(snapshot);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка скринера');
    } finally {
      setLoading(false);
      busy.current = false;
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    void refresh();
    const timer = setInterval(() => void refresh(), REFRESH_MS);
    return () => clearInterval(timer);
  }, [enabled, refresh]);

  return { data, loading, error, refresh };
}