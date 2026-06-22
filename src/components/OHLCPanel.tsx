import type { CrosshairOHLC } from '../types';

interface OHLCPanelProps {
  data: CrosshairOHLC | null;
  base: string;
}

export function OHLCPanel({ data, base }: OHLCPanelProps) {
  const fmt = (n: number) =>
    n < 1 ? n.toFixed(6) : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <footer className="tv-ohlc-panel">
      {data && (
        <>
          <span className="tv-ohlc-time">{data.time}</span>
          <span className="tv-ohlc-item"><label>O</label><b>{fmt(data.open)}</b></span>
          <span className="tv-ohlc-item"><label>H</label><b className="up">{fmt(data.high)}</b></span>
          <span className="tv-ohlc-item"><label>L</label><b className="down">{fmt(data.low)}</b></span>
          <span className="tv-ohlc-item"><label>C</label><b>{fmt(data.close)}</b></span>
          <span className={`tv-ohlc-item ${data.change >= 0 ? 'up' : 'down'}`}>
            <label>Δ</label><b>{data.change >= 0 ? '+' : ''}{data.change.toFixed(2)}%</b>
          </span>
          <span className="tv-ohlc-item"><label>Vol</label><b>{data.volume.toFixed(2)} {base}</b></span>
        </>
      )}

      <span className="tv-ohlc-status">● Live • Binance</span>

      <div className="tv-brand">
        <span className="tv-brand-product">PauseTrader</span>
        <span className="tv-brand-author">Константин Андреев</span>
        <a href="https://t.me/AiKtg" target="_blank" rel="noopener noreferrer" className="tv-brand-contact">
          Telegram @AiKtg
        </a>
      </div>
    </footer>
  );
}