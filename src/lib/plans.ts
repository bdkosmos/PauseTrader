export type PlanId = 'free' | 'pro';

export const PRO_PRICE = 2;
export const PRO_STARS = 150;

export const FREE_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'TONUSDT'] as const;

export const PRO_SYMBOLS = [
  ...FREE_SYMBOLS,
  'BNBUSDT',
  'XRPUSDT',
  'DOGEUSDT',
  'ADAUSDT',
  'AVAXUSDT',
  'LINKUSDT',
  'DOTUSDT',
  'MATICUSDT',
  'LTCUSDT',
  'ATOMUSDT',
  'NEARUSDT',
  'APTUSDT',
  'ARBUSDT',
  'OPUSDT',
] as const;

export const TELEGRAM_PAY_URL =
  'https://t.me/AiKtg?text=Хочу%20Pro%20PauseTrader%20(%242%2Fмес)';

export const FREE_FEATURES = [
  '4 монеты (BTC, ETH, SOL, TON)',
  'Базовый свечной график',
  '3 индикатора: EMA 20, Объём, RSI',
  'Демо-торговля',
] as const;

export const PRO_FEATURES = [
  'Все монеты Binance USDT',
  'Скринер: рост 1ч, объём, тренды, листинги',
  'Алерты в Telegram',
  'Сохранение шаблонов графика',
  'Доп. индикаторы: EMA 50, EMA 200, MACD',
] as const;

export interface IndicatorConfig {
  ema20: boolean;
  ema50: boolean;
  ema200: boolean;
  volume: boolean;
  rsi: boolean;
  macd: boolean;
}

export const FREE_INDICATORS: IndicatorConfig = {
  ema20: true,
  ema50: false,
  ema200: false,
  volume: true,
  rsi: true,
  macd: false,
};

export const PRO_INDICATORS: IndicatorConfig = {
  ema20: true,
  ema50: true,
  ema200: true,
  volume: true,
  rsi: true,
  macd: true,
};

export function getSymbolsForPlan(plan: PlanId): readonly string[] {
  return plan === 'pro' ? PRO_SYMBOLS : FREE_SYMBOLS;
}

export function getIndicatorsForPlan(plan: PlanId): IndicatorConfig {
  return plan === 'pro' ? PRO_INDICATORS : FREE_INDICATORS;
}

export function isSymbolAvailable(symbol: string, plan: PlanId): boolean {
  if (plan === 'pro') return /^[A-Z0-9]{2,12}USDT$/.test(symbol);
  return getSymbolsForPlan(plan).includes(symbol);
}