import { Maximize2, RefreshCw, TrendingUp } from 'lucide-react';
import type { Timeframe } from '../types';

const TIMEFRAMES: Timeframe[] = ['1m', '5m', '15m', '1h', '4h', '1d'];

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
  onTimeframe: (tf: Timeframe) => void;
  onRefresh: () => void;
  onFullscreen: () => void;
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
  onTimeframe,
  onRefresh,
  onFullscreen,
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