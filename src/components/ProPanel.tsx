import { Bell, Bookmark, Crown, LayoutGrid } from 'lucide-react';
import { useState } from 'react';
import type { ChartTemplate, Timeframe } from '../types';
import { ChartTemplates } from './ChartTemplates';
import { CoinScreener } from './CoinScreener';
import { TelegramAlerts } from './TelegramAlerts';

type ProTab = 'screener' | 'alerts' | 'templates';

interface ProPanelProps {
  isPro: boolean;
  clientId: string;
  hasTelegram: boolean;
  onAlertsRefresh?: () => void;
  symbol: string;
  base: string;
  price: number;
  timeframe: Timeframe;
  selected: string;
  onSelectSymbol: (symbol: string) => void;
  onApplyTemplate: (template: ChartTemplate) => void;
  onUpgrade: () => void;
}

const TABS: { id: ProTab; label: string; icon: typeof Crown }[] = [
  { id: 'screener', label: 'Скринер', icon: LayoutGrid },
  { id: 'alerts', label: 'Алерты', icon: Bell },
  { id: 'templates', label: 'Шаблоны', icon: Bookmark },
];

export function ProPanel({
  isPro,
  clientId,
  hasTelegram,
  onAlertsRefresh,
  symbol,
  base,
  price,
  timeframe,
  selected,
  onSelectSymbol,
  onApplyTemplate,
  onUpgrade,
}: ProPanelProps) {
  const [tab, setTab] = useState<ProTab>('screener');

  return (
    <div className="pro-panel">
      <div className="pro-panel-tabs">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={tab === id ? 'active' : ''}
            onClick={() => (isPro ? setTab(id) : onUpgrade())}
          >
            <Icon size={14} />
            {label}
            {!isPro && <span className="pro-lock">🔒</span>}
          </button>
        ))}
      </div>

      <div className="pro-panel-body">
        {!isPro && (
          <div className="pro-locked-overlay">
            <Crown size={28} />
            <h3>Pro — $2/мес</h3>
            <p>Скринер рынка, алерты, шаблоны и все монеты Binance</p>
            <button type="button" className="pricing-cta" onClick={onUpgrade}>
              Получить Pro
            </button>
          </div>
        )}

        {isPro && tab === 'screener' && (
          <CoinScreener enabled={isPro} selected={selected} onSelect={onSelectSymbol} />
        )}
        {isPro && tab === 'alerts' && (
          <TelegramAlerts
            clientId={clientId}
            symbol={symbol}
            base={base}
            price={price}
            hasTelegram={hasTelegram}
            onTelegramLinked={onAlertsRefresh}
          />
        )}
        {isPro && tab === 'templates' && (
          <ChartTemplates
            symbol={symbol}
            base={base}
            timeframe={timeframe}
            onApply={onApplyTemplate}
          />
        )}
      </div>
    </div>
  );
}