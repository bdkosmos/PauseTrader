import {
  BarChart3, CandlestickChart, LineChart, Maximize2, RefreshCw,
  TrendingUp, Activity,
} from 'lucide-react';
import type { ChartType, IndicatorState, Timeframe } from '../types';

const TIMEFRAMES: Timeframe[] = ['1m', '5m', '15m', '1h', '4h', '1d', '1w'];

interface TopBarProps {
  symbol: string;
  base: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  timeframe: Timeframe;
  chartType: ChartType;
  indicators: IndicatorState;
  loading: boolean;
  onTimeframe: (tf: Timeframe) => void;
  onChartType: (type: ChartType) => void;
  onIndicator: (key: keyof IndicatorState) => void;
  onRefresh: () => void;
  onFullscreen: () => void;
}

export function TopBar({
  symbol, base, price, change24h, high24h, low24h, volume24h,
  timeframe, chartType, indicators, loading,
  onTimeframe, onChartType, onIndicator, onRefresh, onFullscreen,
}: TopBarProps) {
  const fmt = (n: number) =>
    n < 1 ? n.toFixed(6) : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
          <h1>{base}<span>/USDT</span></h1>
          <div className="tv-exchange">Binance Spot</div>
        </div>

        <div className="tv-quote">
          <div className="tv-quote-price">{fmt(price)}</div>
          <div className={`tv-quote-change ${change24h >= 0 ? 'up' : 'down'}`}>
            {change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}%
          </div>
        </div>

        <div className="tv-stats">
          <div><label>Макс 24ч</label><span>{fmt(high24h)}</span></div>
          <div><label>Мин 24ч</label><span>{fmt(low24h)}</span></div>
          <div><label>Объём 24ч</label><span>${(volume24h / 1e6).toFixed(1)}M</span></div>
        </div>
      </div>

      <div className="tv-topbar-center">
        <div className="tv-timeframes">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              className={timeframe === tf ? 'active' : ''}
              onClick={() => onTimeframe(tf)}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      <div className="tv-topbar-right">
        <div className="tv-chart-types">
          <button className={chartType === 'candles' ? 'active' : ''} onClick={() => onChartType('candles')} title="Свечи">
            <CandlestickChart size={16} />
          </button>
          <button className={chartType === 'line' ? 'active' : ''} onClick={() => onChartType('line')} title="Линия">
            <LineChart size={16} />
          </button>
          <button className={chartType === 'area' ? 'active' : ''} onClick={() => onChartType('area')} title="Область">
            <BarChart3 size={16} />
          </button>
        </div>

        <div className="tv-indicators-menu">
          <button className="tv-indicators-btn"><Activity size={14} /> Индикаторы</button>
          <div className="tv-indicators-dropdown">
            {([
              ['volume', 'Объём'],
              ['ema9', 'EMA 9'],
              ['ema21', 'EMA 21'],
              ['ema50', 'EMA 50'],
              ['rsi', 'RSI 14'],
              ['macd', 'MACD'],
            ] as [keyof IndicatorState, string][]).map(([key, label]) => (
              <label key={key}>
                <input
                  type="checkbox"
                  checked={indicators[key]}
                  onChange={() => onIndicator(key)}
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        <button className="tv-icon-btn" onClick={onRefresh} disabled={loading} title="Обновить">
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
        </button>
        <button className="tv-icon-btn" onClick={onFullscreen} title="Полный экран">
          <Maximize2 size={16} />
        </button>
      </div>
    </header>
  );
}