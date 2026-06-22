import { Crown, X } from 'lucide-react';
import {
  FREE_FEATURES,
  PRO_FEATURES,
  PRO_PRICE,
  TELEGRAM_PAY_URL,
  type PlanId,
} from '../lib/plans';

interface PricingModalProps {
  open: boolean;
  plan: PlanId;
  onClose: () => void;
  onActivateDemo: () => void;
}

export function PricingModal({ open, plan, onClose, onActivateDemo }: PricingModalProps) {
  if (!open) return null;

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

        <p className="pricing-note">
          После оплаты $2/мес напишите в{' '}
          <a href={TELEGRAM_PAY_URL} target="_blank" rel="noopener noreferrer">
            @AiKtg
          </a>
          {' '}— активируем Pro вручную. Или нажмите демо-кнопку ниже для теста.
        </p>

        {plan === 'free' && (
          <button type="button" className="pricing-demo-btn" onClick={onActivateDemo}>
            Активировать Pro (демо)
          </button>
        )}
      </div>
    </div>
  );
}