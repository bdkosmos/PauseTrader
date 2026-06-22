import { Lock } from 'lucide-react';
import { FREE_SYMBOLS } from '../lib/plans';
import type { SidebarItem } from '../types';

interface SidebarProps {
  items: SidebarItem[];
  allItems: SidebarItem[];
  selected: string;
  isPro: boolean;
  onSelect: (symbol: string) => void;
  onLockedSelect: () => void;
  loading: boolean;
}

export function Sidebar({
  items,
  allItems,
  selected,
  isPro,
  onSelect,
  onLockedSelect,
  loading,
}: SidebarProps) {
  const fmtPrice = (n: number) =>
    n < 1
      ? n.toFixed(6)
      : n.toLocaleString('en-US', { maximumFractionDigits: 2 });

  const freeSet = new Set<string>(FREE_SYMBOLS);
  const displayItems = isPro ? items : allItems;

  const handleClick = (item: SidebarItem) => {
    if (!isPro && !freeSet.has(item.symbol)) {
      onLockedSelect();
      return;
    }
    onSelect(item.symbol);
  };

  return (
    <aside className="watchlist">
      <div className="watchlist-header">
        <span>Рынки</span>
        <span className="watchlist-count">
          {isPro ? items.length : `${FREE_SYMBOLS.length} / ${allItems.length}`}
        </span>
      </div>

      {!isPro && (
        <div className="sidebar-free-hint">
          Бесплатно: 4 монеты · <button type="button" onClick={onLockedSelect}>Pro → все</button>
        </div>
      )}

      <div className="watchlist-table-head">
        <span>Тикер</span>
        <span>Цена</span>
        <span>24ч %</span>
      </div>

      <div className="watchlist-body">
        {loading && displayItems.length === 0 ? (
          <div className="watchlist-empty">Загрузка...</div>
        ) : (
          displayItems.map((item) => {
            const locked = !isPro && !freeSet.has(item.symbol);
            return (
              <button
                key={item.symbol}
                type="button"
                className={`watchlist-row ${selected === item.symbol ? 'active' : ''} ${locked ? 'locked' : ''}`}
                onClick={() => handleClick(item)}
              >
                <div className="watchlist-symbol">
                  <strong>{item.base}</strong>
                  <small>/USDT</small>
                  {locked && <Lock size={10} className="watchlist-lock" />}
                </div>
                <div className="watchlist-price">{fmtPrice(item.price)}</div>
                <div className={`watchlist-change ${item.change24h >= 0 ? 'up' : 'down'}`}>
                  {item.change24h >= 0 ? '+' : ''}
                  {item.change24h.toFixed(2)}%
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}