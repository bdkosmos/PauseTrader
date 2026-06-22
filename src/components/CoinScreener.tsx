import { Flame, RefreshCw, Rocket, TrendingUp, Zap } from 'lucide-react';
import { useState } from 'react';
import { useMarketScreener } from '../hooks/useMarketScreener';
import { fmtListedDays, fmtPct, fmtPrice, fmtVolRatio } from '../lib/screener';
import type { ScreenerCategory, ScreenerRow } from '../types';

interface CoinScreenerProps {
  enabled: boolean;
  selected: string;
  onSelect: (symbol: string) => void;
}

const CATEGORIES: {
  id: ScreenerCategory;
  label: string;
  hint: string;
  icon: typeof Flame;
}[] = [
  { id: 'gainers1h', label: 'Рост 1ч', hint: 'Топ роста за последний час', icon: Rocket },
  { id: 'volumeSpike', label: 'Объём', hint: 'Всплески объёма vs средний час', icon: Zap },
  { id: 'trend', label: 'Тренд', hint: 'Сильные тренды 1ч + 4ч', icon: TrendingUp },
  { id: 'newListing', label: 'Новые', hint: 'Листинги за 60 дней', icon: Flame },
];

function metricFor(category: ScreenerCategory, row: ScreenerRow) {
  switch (category) {
    case 'gainers1h':
      return { value: fmtPct(row.change1h), cls: row.change1h >= 0 ? 'up' : 'down' };
    case 'volumeSpike':
      return { value: fmtVolRatio(row.volumeRatio), cls: 'hot' };
    case 'trend':
      return { value: fmtPct(row.change4h), cls: row.change4h >= 0 ? 'up' : 'down' };
    case 'newListing':
      return { value: fmtListedDays(row.listedAt), cls: 'new' };
  }
}

export function CoinScreener({ enabled, selected, onSelect }: CoinScreenerProps) {
  const [category, setCategory] = useState<ScreenerCategory>('gainers1h');
  const { data, loading, error, refresh } = useMarketScreener(enabled);

  const rows = data?.[category] ?? [];
  const active = CATEGORIES.find((c) => c.id === category)!;

  return (
    <div className="pro-feature screener">
      <div className="pro-feature-head">
        <h3>Скринер рынка</h3>
        <div className="screener-head-actions">
          <span className="pro-feature-badge">Pro</span>
          <button
            type="button"
            className="screener-refresh"
            onClick={() => void refresh()}
            disabled={loading}
            title="Обновить"
          >
            <RefreshCw size={12} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      <p className="pro-feature-desc">{active.hint}</p>

      <div className="screener-filters">
        {CATEGORIES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={category === id ? 'active' : ''}
            onClick={() => setCategory(id)}
          >
            <Icon size={11} />
            {label}
          </button>
        ))}
      </div>

      {error && <p className="screener-error">{error}</p>}

      <div className="screener-list">
        {loading && rows.length === 0 && (
          <p className="pro-empty">Сканируем {data?.scanned ?? 55} пар…</p>
        )}

        {!loading && rows.length === 0 && !error && (
          <p className="pro-empty">Нет сигналов в этой категории</p>
        )}

        {rows.map((row, i) => {
          const metric = metricFor(category, row);
          return (
            <button
              key={row.symbol}
              type="button"
              className={`screener-row ${selected === row.symbol ? 'active' : ''}`}
              onClick={() => onSelect(row.symbol)}
            >
              <span className="screener-rank">{i + 1}</span>
              <span className="screener-symbol">{row.base}</span>
              <span className="screener-price">{fmtPrice(row.price)}</span>
              <span className={`screener-change ${metric.cls}`}>{metric.value}</span>
            </button>
          );
        })}
      </div>

      {data && (
        <p className="screener-meta">
          {data.scanned} пар · обновлено{' '}
          {new Date(data.updatedAt).toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      )}
    </div>
  );
}