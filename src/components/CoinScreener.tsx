import { ArrowUpDown } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { SidebarItem } from '../types';

type SortKey = 'change24h' | 'volume24h' | 'price';

interface CoinScreenerProps {
  items: SidebarItem[];
  selected: string;
  onSelect: (symbol: string) => void;
}

export function CoinScreener({ items, selected, onSelect }: CoinScreenerProps) {
  const [sortKey, setSortKey] = useState<SortKey>('change24h');
  const [desc, setDesc] = useState(true);

  const sorted = useMemo(() => {
    const list = [...items];
    list.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      return desc ? bv - av : av - bv;
    });
    return list;
  }, [items, sortKey, desc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setDesc(!desc);
    else {
      setSortKey(key);
      setDesc(true);
    }
  };

  const fmtPrice = (n: number) =>
    n < 1 ? n.toFixed(6) : n.toLocaleString('en-US', { maximumFractionDigits: 2 });

  return (
    <div className="pro-feature screener">
      <div className="pro-feature-head">
        <h3>Скринер монет</h3>
        <span className="pro-feature-badge">Pro</span>
      </div>

      <div className="screener-filters">
        {([
          ['change24h', '24ч %'],
          ['volume24h', 'Объём'],
          ['price', 'Цена'],
        ] as [SortKey, string][]).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={sortKey === key ? 'active' : ''}
            onClick={() => toggleSort(key)}
          >
            <ArrowUpDown size={12} />
            {label}
          </button>
        ))}
      </div>

      <div className="screener-list">
        {sorted.map((item, i) => (
          <button
            key={item.symbol}
            type="button"
            className={`screener-row ${selected === item.symbol ? 'active' : ''}`}
            onClick={() => onSelect(item.symbol)}
          >
            <span className="screener-rank">{i + 1}</span>
            <span className="screener-symbol">{item.base}</span>
            <span className="screener-price">{fmtPrice(item.price)}</span>
            <span className={`screener-change ${item.change24h >= 0 ? 'up' : 'down'}`}>
              {item.change24h >= 0 ? '+' : ''}
              {item.change24h.toFixed(2)}%
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}