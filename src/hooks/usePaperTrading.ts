import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PaperAccount, PaperPosition, PaperTrade } from '../types';

const STORAGE_KEY = 'pausetrader-paper-account';
const STARTING_BALANCE = 10_000;
const MAX_TRADES = 100;

const defaultAccount = (): PaperAccount => ({
  balanceUsdt: STARTING_BALANCE,
  positions: [],
  trades: [],
});

function loadAccount(): PaperAccount {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultAccount();
    const parsed = JSON.parse(raw) as PaperAccount;
    return {
      balanceUsdt: parsed.balanceUsdt ?? STARTING_BALANCE,
      positions: Array.isArray(parsed.positions) ? parsed.positions : [],
      trades: Array.isArray(parsed.trades) ? parsed.trades : [],
    };
  } catch {
    return defaultAccount();
  }
}

function saveAccount(account: PaperAccount) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(account));
}

function upsertPosition(
  positions: PaperPosition[],
  symbol: string,
  base: string,
  quantity: number,
  price: number,
): PaperPosition[] {
  const idx = positions.findIndex((p) => p.symbol === symbol);
  if (idx === -1) {
    return [...positions, { symbol, base, quantity, avgPrice: price }];
  }

  const current = positions[idx];
  const newQty = current.quantity + quantity;
  if (newQty <= 1e-10) {
    return positions.filter((p) => p.symbol !== symbol);
  }

  const avgPrice =
    (current.quantity * current.avgPrice + quantity * price) / newQty;

  return positions.map((p, i) =>
    i === idx ? { ...p, quantity: newQty, avgPrice } : p,
  );
}

function reducePosition(
  positions: PaperPosition[],
  symbol: string,
  quantity: number,
): PaperPosition[] {
  const current = positions.find((p) => p.symbol === symbol);
  if (!current) return positions;

  const remaining = current.quantity - quantity;
  if (remaining <= 1e-10) {
    return positions.filter((p) => p.symbol !== symbol);
  }

  return positions.map((p) =>
    p.symbol === symbol ? { ...p, quantity: remaining } : p,
  );
}

export function usePaperTrading() {
  const [account, setAccount] = useState<PaperAccount>(loadAccount);

  useEffect(() => {
    saveAccount(account);
  }, [account]);

  const buy = useCallback(
    (symbol: string, base: string, usdtAmount: number, price: number) => {
      if (price <= 0 || usdtAmount <= 0) {
        return { ok: false as const, error: 'Некорректная сумма или цена' };
      }
      if (usdtAmount < 1) {
        return { ok: false as const, error: 'Минимальная сделка — $1' };
      }

      let error: string | null = null;

      setAccount((prev) => {
        if (usdtAmount > prev.balanceUsdt + 1e-8) {
          error = 'Недостаточно USDT';
          return prev;
        }

        const quantity = usdtAmount / price;
        const trade: PaperTrade = {
          id: crypto.randomUUID(),
          symbol,
          base,
          side: 'buy',
          quantity,
          price,
          total: usdtAmount,
          timestamp: Date.now(),
        };

        return {
          balanceUsdt: prev.balanceUsdt - usdtAmount,
          positions: upsertPosition(prev.positions, symbol, base, quantity, price),
          trades: [trade, ...prev.trades].slice(0, MAX_TRADES),
        };
      });

      if (error) return { ok: false as const, error };
      return { ok: true as const };
    },
    [],
  );

  const sell = useCallback(
    (symbol: string, base: string, quantity: number, price: number) => {
      if (price <= 0 || quantity <= 0) {
        return { ok: false as const, error: 'Некорректное количество или цена' };
      }

      let error: string | null = null;

      setAccount((prev) => {
        const position = prev.positions.find((p) => p.symbol === symbol);
        if (!position || quantity > position.quantity + 1e-10) {
          error = 'Недостаточно монет для продажи';
          return prev;
        }

        const total = quantity * price;
        const trade: PaperTrade = {
          id: crypto.randomUUID(),
          symbol,
          base,
          side: 'sell',
          quantity,
          price,
          total,
          timestamp: Date.now(),
        };

        return {
          balanceUsdt: prev.balanceUsdt + total,
          positions: reducePosition(prev.positions, symbol, quantity),
          trades: [trade, ...prev.trades].slice(0, MAX_TRADES),
        };
      });

      if (error) return { ok: false as const, error };
      return { ok: true as const };
    },
    [],
  );

  const reset = useCallback(() => {
    setAccount(defaultAccount());
  }, []);

  const getPosition = useCallback(
    (symbol: string) => account.positions.find((p) => p.symbol === symbol),
    [account.positions],
  );

  const portfolio = useMemo(
    () => ({
      balanceUsdt: account.balanceUsdt,
      positions: account.positions,
      trades: account.trades,
      startingBalance: STARTING_BALANCE,
    }),
    [account],
  );

  return { portfolio, buy, sell, reset, getPosition };
}

export function calcPaperEquity(
  balanceUsdt: number,
  positions: PaperPosition[],
  prices: Record<string, number>,
) {
  const holdings = positions.reduce((sum, pos) => {
    const price = prices[pos.symbol] ?? pos.avgPrice;
    return sum + pos.quantity * price;
  }, 0);
  return balanceUsdt + holdings;
}

export function calcUnrealizedPnl(
  position: PaperPosition,
  currentPrice: number,
) {
  return (currentPrice - position.avgPrice) * position.quantity;
}