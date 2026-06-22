export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w';
export type ChartType = 'candles' | 'line' | 'area';

export interface WatchlistItem {
  symbol: string;
  base: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
}

export interface IndicatorState {
  volume: boolean;
  ema9: boolean;
  ema21: boolean;
  ema50: boolean;
  rsi: boolean;
  macd: boolean;
}

export interface CrosshairOHLC {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  change: number;
}