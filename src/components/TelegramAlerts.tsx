import { Bell, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { TELEGRAM_PAY_URL } from '../lib/plans';
import type { PriceAlert } from '../types';

const STORAGE_KEY = 'pausetrader-alerts';

function loadAlerts(): PriceAlert[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PriceAlert[]) : [];
  } catch {
    return [];
  }
}

interface TelegramAlertsProps {
  symbol: string;
  base: string;
  price: number;
}

export function TelegramAlerts({ symbol, base, price }: TelegramAlertsProps) {
  const [alerts, setAlerts] = useState<PriceAlert[]>(loadAlerts);
  const [targetPrice, setTargetPrice] = useState('');
  const [direction, setDirection] = useState<'above' | 'below'>('above');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
  }, [alerts]);

  const addAlert = () => {
    const value = parseFloat(targetPrice.replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0) return;

    const alert: PriceAlert = {
      id: crypto.randomUUID(),
      symbol,
      base,
      price: value,
      direction,
      createdAt: Date.now(),
    };

    setAlerts((prev) => [alert, ...prev].slice(0, 20));
    setTargetPrice('');
  };

  const removeAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const symbolAlerts = alerts.filter((a) => a.symbol === symbol);

  return (
    <div className="pro-feature alerts">
      <div className="pro-feature-head">
        <h3>Алерты Telegram</h3>
        <span className="pro-feature-badge">Pro</span>
      </div>

      <p className="pro-feature-desc">
        Уведомления приходят в Telegram через{' '}
        <a href={TELEGRAM_PAY_URL} target="_blank" rel="noopener noreferrer">@AiKtg</a>
      </p>

      <div className="alert-form">
        <label>
          {base} цена
          <input
            type="text"
            inputMode="decimal"
            placeholder={price.toFixed(2)}
            value={targetPrice}
            onChange={(e) => setTargetPrice(e.target.value)}
          />
        </label>
        <div className="alert-direction">
          <button
            type="button"
            className={direction === 'above' ? 'active' : ''}
            onClick={() => setDirection('above')}
          >
            Выше
          </button>
          <button
            type="button"
            className={direction === 'below' ? 'active' : ''}
            onClick={() => setDirection('below')}
          >
            Ниже
          </button>
        </div>
        <button type="button" className="alert-add-btn" onClick={addAlert}>
          <Bell size={14} />
          Добавить алерт
        </button>
      </div>

      <div className="alert-list">
        {symbolAlerts.length === 0 ? (
          <div className="pro-empty">Нет алертов для {base}</div>
        ) : (
          symbolAlerts.map((alert) => (
            <div key={alert.id} className="alert-row">
              <span>
                {alert.direction === 'above' ? '▲' : '▼'} {alert.base}{' '}
                {alert.direction === 'above' ? '>' : '<'} {alert.price}
              </span>
              <button type="button" onClick={() => removeAlert(alert.id)} aria-label="Удалить">
                <Trash2 size={12} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}