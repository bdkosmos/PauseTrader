import { Crown, KeyRound, Loader2, X } from 'lucide-react';
import { useState } from 'react';
import {
  FREE_FEATURES,
  PRO_FEATURES,
  PRO_PRICE,
  PRO_STARS,
  TELEGRAM_PAY_URL,
  type PlanId,
} from '../lib/plans';

interface PricingModalProps {
  open: boolean;
  plan: PlanId;
  clientId: string;
  apiOnline: boolean;
  loading: boolean;
  onClose: () => void;
  onCheckout: () => Promise<void>;
  onStarsCheckout: () => Promise<void>;
  onRedeemLicense: (key: string) => Promise<void>;
}

export function PricingModal({
  open,
  plan,
  clientId,
  apiOnline,
  loading,
  onClose,
  onCheckout,
  onStarsCheckout,
  onRedeemLicense,
}: PricingModalProps) {
  const [licenseKey, setLicenseKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!open) return null;

  const handleCheckout = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await onCheckout();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Ошибка оплаты');
      setBusy(false);
    }
  };

  const handleStarsCheckout = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await onStarsCheckout();
      setMessage('Откройте Telegram и оплатите звёздами. Затем обновите страницу.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Ошибка оплаты звёздами');
    } finally {
      setBusy(false);
    }
  };

  const handleLicense = async () => {
    if (!licenseKey.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      await onRedeemLicense(licenseKey.trim());
      setLicenseKey('');
      setMessage('Pro активирован!');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Неверный ключ');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pricing-overlay" onClick={onClose} role="presentation">
      <div
        className="pricing-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="pricing-title"
      >
        <button type="button" className="pricing-close" onClick={onClose} aria-label="Закрыть">
          <X size={18} />
        </button>

        <h2 id="pricing-title" className="pricing-title">
          <Crown size={20} />
          Тарифы PauseTrader
        </h2>

        <div className="pricing-grid">
          <div className={`pricing-card ${plan === 'free' ? 'current' : ''}`}>
            <div className="pricing-card-head">
              <h3>Бесплатно</h3>
              <div className="pricing-price">$0</div>
            </div>
            <ul>
              {FREE_FEATURES.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            {plan === 'free' && <span className="pricing-current-tag">Текущий план</span>}
          </div>

          <div className={`pricing-card pro ${plan === 'pro' ? 'current' : ''}`}>
            <div className="pricing-card-head">
              <h3>Pro</h3>
              <div className="pricing-price">
                ${PRO_PRICE}
                <small>/мес</small>
              </div>
            </div>
            <ul>
              {PRO_FEATURES.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            {plan === 'pro' ? (
              <span className="pricing-current-tag pro-tag">Активен</span>
            ) : apiOnline ? (
              <div className="pricing-cta-group">
                <button
                  type="button"
                  className="pricing-cta stars"
                  onClick={handleStarsCheckout}
                  disabled={busy}
                >
                  {busy ? <Loader2 size={14} className="spin" /> : null}
                  Оплатить звёздами · {PRO_STARS} ⭐
                </button>
                <button
                  type="button"
                  className="pricing-cta secondary"
                  onClick={handleCheckout}
                  disabled={busy}
                >
                  Картой (Stripe)
                </button>
              </div>
            ) : (
              <a
                href={TELEGRAM_PAY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="pricing-cta"
              >
                Оплатить в Telegram
              </a>
            )}
          </div>
        </div>

        {plan === 'free' && (
          <div className="pricing-license-block">
            <label>
              <KeyRound size={14} />
              Есть лицензионный ключ?
              <div className="pricing-license-row">
                <input
                  type="text"
                  placeholder="PT-XXXX-XXXX-XXXX"
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                />
                <button type="button" onClick={handleLicense} disabled={busy || !apiOnline}>
                  Активировать
                </button>
              </div>
            </label>
          </div>
        )}

        <p className="pricing-note">
          ID устройства: <code>{clientId.slice(0, 8)}…</code>
          {loading && ' · проверка…'}
          {!apiOnline && (
            <>
              {' '}
              · API офлайн — оплата через{' '}
              <a href={TELEGRAM_PAY_URL} target="_blank" rel="noopener noreferrer">
                @AiKtg
              </a>
            </>
          )}
        </p>

        {message && <p className="pricing-message">{message}</p>}
      </div>
    </div>
  );
}