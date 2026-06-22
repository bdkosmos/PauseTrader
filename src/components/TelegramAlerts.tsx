import { Bell, CheckCircle2, Link2, Send, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { apiEnabled, getTelegramLinkUrl, syncAlerts, testAlert } from '../lib/api';
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
  clientId: string;
  symbol: string;
  base: string;
  price: number;
  hasTelegram: boolean;
  onTelegramLinked?: () => void;
}

export function TelegramAlerts({
  clientId,
  symbol,
  base,
  price,
  hasTelegram,
  onTelegramLinked,
}: TelegramAlertsProps) {
  const [alerts, setAlerts] = useState<PriceAlert[]>(loadAlerts);
  const [targetPrice, setTargetPrice] = useState('');
  const [direction, setDirection] = useState<'above' | 'below'>('above');
  const [telegramUrl, setTelegramUrl] = useState<string | null>(null);
  const [ntfyUrl, setNtfyUrl] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
  }, [alerts]);

  useEffect(() => {
    if (!apiEnabled()) return;
    getTelegramLinkUrl(clientId)
      .then((data) => {
        setTelegramUrl(data.enabled ? data.url : null);
        setNtfyUrl(data.ntfyEnabled ? data.ntfyUrl : null);
      })
      .catch(() => {
        setTelegramUrl(null);
        setNtfyUrl(null);
      });
  }, [clientId]);

  const pushToServer = useCallback(
    async (list: PriceAlert[]) => {
      if (!apiEnabled()) return;
      try {
        await syncAlerts(
          clientId,
          list.map((a) => ({
            id: a.id,
            symbol: a.symbol,
            base: a.base,
            price: a.price,
            direction: a.direction,
          })),
        );
        setSyncStatus('Синхронизировано с сервером');
      } catch (err) {
        setSyncStatus(err instanceof Error ? err.message : 'Не удалось синхронизировать');
      }
    },
    [clientId],
  );

  useEffect(() => {
    void pushToServer(alerts);
  }, [alerts, pushToServer]);

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

  const handleTest = async () => {
    setBusy(true);
    setTestStatus(null);
    try {
      const result = await testAlert(clientId);
      setTestStatus(
        result.channel === 'telegram'
          ? 'Тест отправлен в Telegram'
          : 'Тест отправлен через ntfy',
      );
      onTelegramLinked?.();
    } catch (err) {
      setTestStatus(err instanceof Error ? err.message : 'Ошибка теста');
    } finally {
      setBusy(false);
    }
  };

  const symbolAlerts = alerts.filter((a) => a.symbol === symbol);
  const channelReady = hasTelegram || Boolean(ntfyUrl);

  return (
    <div className="pro-feature alerts">
      <div className="pro-feature-head">
        <h3>Алерты цены</h3>
        <span className="pro-feature-badge">Pro</span>
      </div>

      <div className="alert-setup">
        <div className={`alert-setup-step ${hasTelegram ? 'done' : ''}`}>
          <span className="alert-step-num">1</span>
          <div>
            <strong>Канал уведомлений</strong>
            {hasTelegram ? (
              <p className="alert-step-ok">
                <CheckCircle2 size={14} /> Telegram подключён
              </p>
            ) : (
              <div className="alert-links">
                {telegramUrl ? (
                  <a
                    href={telegramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="telegram-link-btn"
                    onClick={() => setTimeout(() => onTelegramLinked?.(), 3000)}
                  >
                    <Link2 size={14} />
                    Подключить Telegram
                  </a>
                ) : null}
                {ntfyUrl ? (
                  <a
                    href={ntfyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="telegram-link-btn"
                  >
                    <Bell size={14} />
                    Подписаться на ntfy
                  </a>
                ) : null}
              </div>
            )}
          </div>
        </div>

        <div className={`alert-setup-step ${symbolAlerts.length > 0 ? 'done' : ''}`}>
          <span className="alert-step-num">2</span>
          <div>
            <strong>Добавь алерт</strong>
            <p className="pro-feature-desc">Сервер проверяет цены каждые 30 сек</p>
          </div>
        </div>
      </div>

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

      {channelReady && (
        <button type="button" className="alert-test-btn" onClick={handleTest} disabled={busy}>
          <Send size={14} />
          {busy ? 'Отправка…' : 'Тестовое уведомление'}
        </button>
      )}

      {syncStatus && <p className="pro-sync-status">{syncStatus}</p>}
      {testStatus && <p className="pro-sync-status">{testStatus}</p>}

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