import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FREE_SYMBOLS,
  getSymbolsForPlan,
  PRO_SYMBOLS,
  type PlanId,
} from '../lib/plans';
import type { Candle, SidebarItem, Timeframe } from '../types';

export { FREE_SYMBOLS, PRO_SYMBOLS };

const LIMIT = 500;
const WS_BASE = 'wss://stream.binance.com:9443/ws';

function parseKlineRow(k: (string | number)[]): Candle {
  return {
    time: Number(k[0]),
    open: parseFloat(String(k[1])),
    high: parseFloat(String(k[2])),
    low: parseFloat(String(k[3])),
    close: parseFloat(String(k[4])),
    volume: parseFloat(String(k[5])),
  };
}

function parseWsKline(k: {
  t: number;
  o: string;
  h: string;
  l: string;
  c: string;
  v: string;
}): Candle {
  return {
    time: k.t,
    open: parseFloat(k.o),
    high: parseFloat(k.h),
    low: parseFloat(k.l),
    close: parseFloat(k.c),
    volume: parseFloat(k.v),
  };
}

export function useBinanceChart(symbol: string, timeframe: Timeframe) {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [wsConnected, setWsConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);

  const fetchCandles = useCallback(async () => {
    try {
      setError(null);
      const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${timeframe}&limit=${LIMIT}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Не удалось загрузить свечи');

      const data = await response.json();
      const parsed: Candle[] = data.map(parseKlineRow);
      setCandles(parsed);
      setRevision((r) => r + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [symbol, timeframe]);

  useEffect(() => {
    setLoading(true);
    setCandles([]);
    fetchCandles();
  }, [fetchCandles]);

  useEffect(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const stream = `${symbol.toLowerCase()}@kline_${timeframe}`;
    const ws = new WebSocket(`${WS_BASE}/${stream}`);
    wsRef.current = ws;

    ws.onopen = () => setWsConnected(true);
    ws.onclose = () => setWsConnected(false);
    ws.onerror = () => setWsConnected(false);

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data as string) as { k: Parameters<typeof parseWsKline>[0] };
        const candle = parseWsKline(payload.k);

        setCandles((prev) => {
          if (prev.length === 0) return prev;

          const last = prev[prev.length - 1];
          if (candle.time === last.time) {
            const next = [...prev];
            next[next.length - 1] = candle;
            return next;
          }

          if (candle.time > last.time) {
            return [...prev.slice(-(LIMIT - 1)), candle];
          }

          return prev;
        });
      } catch {
        /* ignore malformed frames */
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
      setWsConnected(false);
    };
  }, [symbol, timeframe]);

  return { candles, loading, error, revision, wsConnected, refetch: fetchCandles };
}

export function useSidebarTickers(plan: PlanId) {
  const [items, setItems] = useState<SidebarItem[]>([]);
  const [allItems, setAllItems] = useState<SidebarItem[]>([]);
  const [loading, setLoading] = useState(true);

  const symbols = getSymbolsForPlan(plan);

  useEffect(() => {
    const fetchTickers = async () => {
      try {
        const symbolsJson = JSON.stringify([...PRO_SYMBOLS]);
        const url = `https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(symbolsJson)}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Ticker error');

        const data = await response.json();
        const order = new Map(PRO_SYMBOLS.map((s, i) => [s, i]));

        const list: SidebarItem[] = data.map((t: Record<string, string>) => ({
          symbol: t.symbol,
          base: t.symbol.replace('USDT', ''),
          price: parseFloat(t.lastPrice),
          change24h: parseFloat(t.priceChangePercent),
          high24h: parseFloat(t.highPrice),
          low24h: parseFloat(t.lowPrice),
          volume24h: parseFloat(t.quoteVolume),
        }));

        list.sort(
          (a, b) =>
            (order.get(a.symbol as (typeof PRO_SYMBOLS)[number]) ?? 99) -
            (order.get(b.symbol as (typeof PRO_SYMBOLS)[number]) ?? 99),
        );

        setAllItems(list);
        const allowed = new Set(symbols);
        setItems(list.filter((item) => allowed.has(item.symbol)));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTickers();
    const interval = setInterval(fetchTickers, 10_000);
    return () => clearInterval(interval);
  }, [symbols]);

  return { items, allItems, loading };
}