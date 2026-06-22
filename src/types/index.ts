export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

export interface SidebarItem {
  symbol: string;
  base: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
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

export type OrderSide = 'buy' | 'sell';

export interface PaperPosition {
  symbol: string;
  base: string;
  quantity: number;
  avgPrice: number;
}

export interface PaperTrade {
  id: string;
  symbol: string;
  base: string;
  side: OrderSide;
  quantity: number;
  price: number;
  total: number;
  timestamp: number;
}

export interface PaperAccount {
  balanceUsdt: number;
  positions: PaperPosition[];
  trades: PaperTrade[];
}

export interface PriceAlert {
  id: string;
  symbol: string;
  base: string;
  price: number;
  direction: 'above' | 'below';
  createdAt: number;
}

export interface ChartTemplate {
  id: string;
  name: string;
  symbol: string;
  timeframe: Timeframe;
  createdAt: number;
}

export type ScreenerCategory = 'gainers1h' | 'volumeSpike' | 'trend' | 'newListing';

export interface ScreenerRow {
  symbol: string;
  base: string;
  price: number;
  change1h: number;
  change4h: number;
  change24h: number;
  volume24h: number;
  volumeRatio: number;
  listedAt?: number;
  score: number;
}

export interface ScreenerSnapshot {
  gainers1h: ScreenerRow[];
  volumeSpike: ScreenerRow[];
  trend: ScreenerRow[];
  newListing: ScreenerRow[];
  updatedAt: number;
  scanned: number;
}