import { RotateCcw, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  calcPaperEquity,
  calcUnrealizedPnl,
} from '../hooks/usePaperTrading';
import type { OrderSide, PaperAccount, WatchlistItem } from '../types';

interface PaperTradingPanelProps {
  symbol: string;
  base: string;
  price: number;
  portfolio: PaperAccount & { startingBalance: number };
  watchlist: WatchlistItem[];
  onBuy: (usdtAmount: number) => { ok: boolean; error?: string };
  onSell: (quantity: number) => { ok: boolean; error?: string };
  onReset: () => void;
}

const BUY_PRESETS = [100, 500, 1000, 5000];

function fmtUsd(n: number) {
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtQty(n: number) {
  if (n < 0.0001) return n.toExponential(2);
  if (n < 1) return n.toFixed(6);
  return n.toLocaleString('en-US', { maximumFractionDigits: 4 });
}

function fmtTime(ts: number) {
  return new Date(ts).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function PaperTradingPanel({
  symbol,
  base,
  price,
  portfolio,
  watchlist,
  onBuy,
  onSell,
  onReset,
}: PaperTradingPanelProps) {
  const [side, setSide] = useState<OrderSide>('buy');
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const prices = useMemo(() => {
    const map: Record<string, number> = { [symbol]: price };
    for (const item of watchlist) map[item.symbol] = item.price;
    return map;
  }, [watchlist, symbol, price]);

  const position = portfolio.positions.find((p) => p.symbol === symbol);
  const equity = calcPaperEquity(portfolio.balanceUsdt, portfolio.positions, prices);
  const totalPnl = equity - portfolio.startingBalance;
  const pnlPct = (totalPnl / portfolio.startingBalance) * 100;

  const sellMaxQty = position?.quantity ?? 0;

  const handleSubmit = () => {
    setMessage(null);
    const value = parseFloat(amount.replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0) {
      setMessage('Введите сумму');
      return;
    }

    if (side === 'buy') {
      const result = onBuy(value);
      if (!result.ok) {
        setMessage(result.error ?? 'Недостаточно USDT');
        return;
      }
      setAmount('');
      setMessage(`Куплено ${base} на ${fmtUsd(value)}`);
      return;
    }

    const result = onSell(value);
    if (!result.ok) {
      setMessage(result.error ?? 'Ошибка продажи');
      return;
    }
    setAmount('');
    setMessage(`Продано ${fmtQty(value)} ${base}`);
  };

  const applyPreset = (preset: number) => {
    if (side === 'buy') {
      const capped = Math.min(preset, portfolio.balanceUsdt);
      setAmount(capped > 0 ? capped.toFixed(2) : '');
      return;
    }
    if (!sellMaxQty) return;
    const qty = (sellMaxQty * preset) / 100;
    setAmount(qty.toFixed(8).replace(/\.?0+$/, ''));
  };

  return (
    <div className="paper-trading">
      <div className="paper-trading-header">
        <div className="paper-trading-title">
          <Wallet size={14} />
          <span>Демо-счёт</span>
        </div>
        <button
          className="paper-reset-btn"
          onClick={() => {
            if (confirm('Сбросить демо-счёт? Баланс вернётся к $10,000.')) {
              onReset();
              setAmount('');
              setMessage('Счёт сброшен');
            }
          }}
          title="Сбросить счёт"
        >
          <RotateCcw size={12} />
        </button>
      </div>

      <div className="paper-balance-card">
        <div className="paper-balance-row">
          <span>Баланс USDT</span>
          <strong>{fmtUsd(portfolio.balanceUsdt)}</strong>
        </div>
        <div className="paper-balance-row">
          <span>Капитал</span>
          <strong>{fmtUsd(equity)}</strong>
        </div>
        <div className="paper-balance-row">
          <span>P&L</span>
          <strong className={totalPnl >= 0 ? 'up' : 'down'}>
            {totalPnl >= 0 ? '+' : ''}
            {fmtUsd(totalPnl)} ({pnlPct >= 0 ? '+' : ''}
            {pnlPct.toFixed(2)}%)
          </strong>
        </div>
      </div>

      <div className="paper-order-form">
        <div className="paper-side-tabs">
          <button
            className={side === 'buy' ? 'active buy' : ''}
            onClick={() => { setSide('buy'); setAmount(''); setMessage(null); }}
          >
            Купить
          </button>
          <button
            className={side === 'sell' ? 'active sell' : ''}
            onClick={() => { setSide('sell'); setAmount(''); setMessage(null); }}
          >
            Продать
          </button>
        </div>

        <label className="paper-input-label">
          {side === 'buy' ? 'Сумма в USDT' : `Количество ${base}`}
          <input
            type="text"
            inputMode="decimal"
            placeholder={side === 'buy' ? '100.00' : '0.001'}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>

        <div className="paper-presets">
          {side === 'buy'
            ? BUY_PRESETS.map((p) => (
                <button key={p} onClick={() => applyPreset(p)}>
                  ${p >= 1000 ? `${p / 1000}k` : p}
                </button>
              ))
            : [25, 50, 75, 100].map((p) => (
                <button key={p} onClick={() => applyPreset(p)} disabled={!sellMaxQty}>
                  {p}%
                </button>
              ))}
          <button
            onClick={() => applyPreset(side === 'buy' ? portfolio.balanceUsdt : 100)}
            disabled={side === 'sell' && !sellMaxQty}
          >
            MAX
          </button>
        </div>

        {side === 'sell' && (
          <div className="paper-available">
            Доступно: {fmtQty(sellMaxQty)} {base}
          </div>
        )}

        <button
          className={`paper-submit ${side}`}
          onClick={handleSubmit}
          disabled={price <= 0}
        >
          {side === 'buy' ? `Купить ${base}` : `Продать ${base}`}
          <small>@{price < 1 ? price.toFixed(6) : price.toLocaleString('en-US', { maximumFractionDigits: 2 })}</small>
        </button>

        {message && <div className="paper-message">{message}</div>}
      </div>

      <div className="paper-section">
        <div className="paper-section-title">Позиции ({portfolio.positions.length})</div>
        <div className="paper-positions">
          {portfolio.positions.length === 0 ? (
            <div className="paper-empty">Нет открытых позиций</div>
          ) : (
            portfolio.positions.map((pos) => {
              const current = prices[pos.symbol] ?? pos.avgPrice;
              const pnl = calcUnrealizedPnl(pos, current);
              const pnlPercent = ((current - pos.avgPrice) / pos.avgPrice) * 100;
              return (
                <div key={pos.symbol} className={`paper-position ${pos.symbol === symbol ? 'active' : ''}`}>
                  <div className="paper-position-top">
                    <strong>{pos.base}</strong>
                    <span className={pnl >= 0 ? 'up' : 'down'}>
                      {pnl >= 0 ? '+' : ''}
                      {fmtUsd(pnl)}
                    </span>
                  </div>
                  <div className="paper-position-meta">
                    <span>{fmtQty(pos.quantity)} @ {fmtUsd(pos.avgPrice)}</span>
                    <span className={pnlPercent >= 0 ? 'up' : 'down'}>
                      {pnlPercent >= 0 ? '+' : ''}
                      {pnlPercent.toFixed(2)}%
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="paper-section paper-history">
        <div className="paper-section-title">История</div>
        <div className="paper-trades">
          {portfolio.trades.length === 0 ? (
            <div className="paper-empty">Сделок пока нет</div>
          ) : (
            portfolio.trades.slice(0, 12).map((trade) => (
              <div key={trade.id} className="paper-trade">
                <div className="paper-trade-top">
                  <span className={trade.side === 'buy' ? 'buy-tag' : 'sell-tag'}>
                    {trade.side === 'buy' ? 'BUY' : 'SELL'}
                  </span>
                  <strong>{trade.base}</strong>
                  <span className="paper-trade-time">{fmtTime(trade.timestamp)}</span>
                </div>
                <div className="paper-trade-meta">
                  {fmtQty(trade.quantity)} · {fmtUsd(trade.total)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="paper-disclaimer">
        Виртуальные деньги · без риска
      </div>
    </div>
  );
}