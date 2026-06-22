import { Crown, ExternalLink, Maximize2, RefreshCw, TrendingUp } from 'lucide-react';
import { PRO_PRICE, type PlanId } from '../lib/plans';
import type { Timeframe } from '../types';

const TIMEFRAMES: Timeframe[] = ['1m', '5m', '15m', '1h', '4h', '1d'];
const BINANCE_REF_URL = 'https://www.binance.com/register?ref=PAUSE';

interface HeaderProps {
  symbol: string;
  base: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  timeframe: Timeframe;
  loading: boolean;
  wsConnected: boolean;
  plan: PlanId;
  onTimeframe: (tf: Timeframe) => void;
  onRefresh: () => void;
  onFullscreen: () => void;
  onUpgrade: () => void;
}

export function Header({
  symbol,
  base,
  price,
  change24h,
  high24h,
  low24h,
  volume24h,
  timeframe,
  loading,
  wsConnected,
  plan,
  onTimeframe,
  onRefresh,
  onFullscreen,
  onUpgrade,
}: HeaderProps) {
  const fmt = (n: number) =>
    n < 1
      ? n.toFixed(6)
      : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <header className="tv-topbar">
      <div className="tv-topbar-left">
        <div className="tv-logo">
          <TrendingUp size={18} />
          <div className="tv-logo-text">
            <span>PauseTrader</span>
            <small>Константин Андреев</small>
          </div>
        </div>

        <div className="tv-symbol-block">
          <h1>
            {base}
            <span>/USDT</span>
          </h1>
          <div className="tv-exchange">Binance Spot · {symbol}</div>
        </div>

        <div className="tv-quote">
          <div className="tv-quote-price">{fmt(price)}</div>
          <div className={`tv-quote-change ${change24h >= 0 ? 'up' : 'down'}`}>
            {change24h >= 0 ? '+' : ''}
            {change24h.toFixed(2)}%
          </div>
        </div>

        <div className="tv-stats">
          <div>
            <label>Макс 24ч</label>
            <span>{fmt(high24h)}</span>
          </div>
          <div>
            <label>Мин 24ч</label>
            <span>{fmt(low24h)}</span>
          </div>
          <div>
            <label>Объём 24ч</label>
            <span>${(volume24h / 1e6).toFixed(1)}M</span>
          </div>
        </div>
      </div>

      <div className="tv-topbar-center">
        <div className="tv-timeframes">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              type="button"
              className={timeframe === tf ? 'active' : ''}
              onClick={() => onTimeframe(tf)}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      <div className="tv-topbar-right">
        {plan === 'pro' ? (
          <span className="tv-plan-badge pro">
            <Crown size={12} />
            Pro
          </span>
        ) : (
          <button type="button" className="tv-plan-badge free" onClick={onUpgrade}>
            Free · Pro ${PRO_PRICE}/мес
          </button>
        )}

        <a
          href={BINANCE_REF_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="tv-binance-btn"
          title="Регистрация на Binance"
        >
          <ExternalLink size={14} />
          <span className="tv-binance-btn-text">Торговля на Binance</span>
        </a>

        <span className={`tv-live-badge ${wsConnected ? 'on' : ''}`}>
          {wsConnected ? '● Live' : '○ Offline'}
        </span>

        <button
          type="button"
          className="tv-icon-btn"
          onClick={onRefresh}
          disabled={loading}
          title="Обновить"
        >
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
        </button>
        <button
          type="button"
          className="tv-icon-btn"
          onClick={onFullscreen}
          title="Полный экран"
        >
          <Maximize2 size={16} />
        </button>
      </div>
    </header>
  );
}