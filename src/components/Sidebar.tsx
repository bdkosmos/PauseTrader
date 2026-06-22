import type { SidebarItem } from '../types';

interface SidebarProps {
  items: SidebarItem[];
  selected: string;
  onSelect: (symbol: string) => void;
  loading: boolean;
}

export function Sidebar({ items, selected, onSelect, loading }: SidebarProps) {
  const fmtPrice = (n: number) =>
    n < 1
      ? n.toFixed(6)
      : n.toLocaleString('en-US', { maximumFractionDigits: 2 });

  return (
    <aside className="watchlist">
      <div className="watchlist-header">
        <span>Рынки</span>
        <span className="watchlist-count">{items.length}</span>
      </div>

      <div className="watchlist-table-head">
        <span>Тикер</span>
        <span>Цена</span>
        <span>24ч %</span>
      </div>

      <div className="watchlist-body">
        {loading && items.length === 0 ? (
          <div className="watchlist-empty">Загрузка...</div>
        ) : (
          items.map((item) => (
            <button
              key={item.symbol}
              type="button"
              className={`watchlist-row ${selected === item.symbol ? 'active' : ''}`}
              onClick={() => onSelect(item.symbol)}
            >
              <div className="watchlist-symbol">
                <strong>{item.base}</strong>
                <small>/USDT</small>
              </div>
              <div className="watchlist-price">{fmtPrice(item.price)}</div>
              <div className={`watchlist-change ${item.change24h >= 0 ? 'up' : 'down'}`}>
                {item.change24h >= 0 ? '+' : ''}
                {item.change24h.toFixed(2)}%
              </div>
            </button>
          ))
        )}
      </div>
    </aside>
  );
}