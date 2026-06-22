import { useCallback, useEffect, useState } from 'react';
import type { Candle, Timeframe, WatchlistItem } from '../types';

export const WATCHLIST_SYMBOLS = [
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
  'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT', 'TONUSDT', 'LINKUSDT',
  'DOTUSDT', 'MATICUSDT', 'LTCUSDT', 'ATOMUSDT', 'NEARUSDT',
];

const LIMIT = 500;

export function useBinanceChart(symbol: string, timeframe: Timeframe) {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCandles = useCallback(async () => {
    try {
      setError(null);
      const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${timeframe}&limit=${LIMIT}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Не удалось загрузить свечи');
      const data = await response.json();

      const parsed: Candle[] = data.map((k: (string | number)[]) => ({
        time: Number(k[0]),
        open: parseFloat(String(k[1])),
        high: parseFloat(String(k[2])),
        low: parseFloat(String(k[3])),
        close: parseFloat(String(k[4])),
        volume: parseFloat(String(k[5])),
      }));

      setCandles(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [symbol, timeframe]);

  useEffect(() => {
    setLoading(true);
    fetchCandles();
    const interval = setInterval(fetchCandles, 5000);
    return () => clearInterval(interval);
  }, [fetchCandles]);

  return { candles, loading, error, refetch: fetchCandles };
}

export function useWatchlist() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWatchlist = async () => {
      try {
        const symbols = JSON.stringify(WATCHLIST_SYMBOLS);
        const url = `https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(symbols)}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Watchlist error');
        const data = await response.json();

        const list: WatchlistItem[] = data.map((t: Record<string, string>) => ({
          symbol: t.symbol,
          base: t.symbol.replace('USDT', ''),
          price: parseFloat(t.lastPrice),
          change24h: parseFloat(t.priceChangePercent),
          high24h: parseFloat(t.highPrice),
          low24h: parseFloat(t.lowPrice),
          volume24h: parseFloat(t.quoteVolume),
        }));

        setItems(list.sort((a, b) => b.volume24h - a.volume24h));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchWatchlist();
    const interval = setInterval(fetchWatchlist, 5000);
    return () => clearInterval(interval);
  }, []);

  return { items, loading };
}