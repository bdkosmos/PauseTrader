import { Search } from 'lucide-react';
import { useState } from 'react';
import type { WatchlistItem } from '../types';

interface WatchlistProps {
  items: WatchlistItem[];
  selected: string;
  onSelect: (symbol: string) => void;
  loading: boolean;
}

export function Watchlist({ items, selected, onSelect, loading }: WatchlistProps) {
  const [query, setQuery] = useState('');

  const filtered = items.filter(
    (item) =>
      item.base.toLowerCase().includes(query.toLowerCase()) ||
      item.symbol.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="watchlist">
      <div className="watchlist-header">
        <span>Список наблюдения</span>
        <span className="watchlist-count">{filtered.length}</span>
      </div>

      <div className="watchlist-search">
        <Search size={14} />
        <input
          type="text"
          placeholder="Поиск тикера..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
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
          filtered.map((item) => (
            <button
              key={item.symbol}
              className={`watchlist-row ${selected === item.symbol ? 'active' : ''}`}
              onClick={() => onSelect(item.symbol)}
            >
              <div className="watchlist-symbol">
                <strong>{item.base}</strong>
                <small>/USDT</small>
              </div>
              <div className="watchlist-price">
                {item.price < 1
                  ? item.price.toFixed(6)
                  : item.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </div>
              <div className={`watchlist-change ${item.change24h >= 0 ? 'up' : 'down'}`}>
                {item.change24h >= 0 ? '+' : ''}
                {item.change24h.toFixed(2)}%
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}