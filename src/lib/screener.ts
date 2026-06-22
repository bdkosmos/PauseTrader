import type { ScreenerRow, ScreenerSnapshot } from '../types';

const API = 'https://api.binance.com/api/v3';
const MIN_QUOTE_VOL = 300_000;
const SCAN_POOL = 55;
const LISTING_WINDOW_MS = 60 * 24 * 60 * 60 * 1000;

const STABLE_BASES = new Set([
  'USDC', 'BUSD', 'TUSD', 'FDUSD', 'DAI', 'USDP', 'EUR', 'USDD', 'AEUR', 'UST', 'SUSD',
]);

type RawKline = [
  number,
  string,
  string,
  string,
  string,
  string,
  number,
  string,
  number,
  string,
  string,
  string,
];

interface Ticker24h {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  quoteVolume: string;
}



function isTradableUsdt(symbol: string) {
  if (!symbol.endsWith('USDT')) return false;
  const base = symbol.slice(0, -4);
  if (STABLE_BASES.has(base)) return false;
  if (/(UP|DOWN|BULL|BEAR)$/.test(base)) return false;
  return base.length >= 2 && base.length <= 12;
}

async function mapPool<T, R>(
  items: T[],
  fn: (item: T) => Promise<R | null>,
  concurrency = 6,
): Promise<R[]> {
  const out: R[] = [];
  let i = 0;

  async function worker() {
    while (i < items.length) {
      const idx = i++;
      const result = await fn(items[idx]);
      if (result !== null) out.push(result);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return out;
}

async function fetchKlines(
  symbol: string,
  interval: '1h' | '1d' = '1h',
  limit = 25,
): Promise<RawKline[] | null> {
  try {
    const res = await fetch(`${API}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
    if (!res.ok) return null;
    return (await res.json()) as RawKline[];
  } catch {
    return null;
  }
}

async function fetchListingDate(symbol: string): Promise<number | undefined> {
  try {
    const res = await fetch(`${API}/klines?symbol=${symbol}&interval=1d&limit=1&startTime=0`);
    if (!res.ok) return undefined;
    const klines = (await res.json()) as RawKline[];
    return klines[0]?.[0];
  } catch {
    return undefined;
  }
}

function median(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function analyzeSymbol(
  ticker: Ticker24h,
  klines: RawKline[],
  listedAt?: number,
): Omit<ScreenerRow, 'score'> | null {
  if (klines.length < 6) return null;

  const price = parseFloat(ticker.lastPrice);
  const change24h = parseFloat(ticker.priceChangePercent);
  const volume24h = parseFloat(ticker.quoteVolume);

  const current = klines[klines.length - 1];
  const prev = klines[klines.length - 2];
  const prevClose = parseFloat(prev[4]);
  const close4hAgo = parseFloat(klines[klines.length - 5][4]);

  if (!prevClose || !close4hAgo) return null;

  const change1h = ((price - prevClose) / prevClose) * 100;
  const change4h = ((price - close4hAgo) / close4hAgo) * 100;

  const currentQuoteVol = parseFloat(current[7]);
  const history = klines.slice(0, -1).map((k) => parseFloat(k[7]));
  const avgHourlyVol = median(history.slice(-24));
  const volumeRatio = avgHourlyVol > 0 ? currentQuoteVol / avgHourlyVol : 1;

  return {
    symbol: ticker.symbol,
    base: ticker.symbol.replace('USDT', ''),
    price,
    change1h,
    change4h,
    change24h,
    volume24h,
    volumeRatio,
    listedAt,
  };
}

function rankGainers(rows: Omit<ScreenerRow, 'score'>[]): ScreenerRow[] {
  return rows
    .filter((r) => r.change1h > 0.3)
    .sort((a, b) => b.change1h - a.change1h)
    .slice(0, 15)
    .map((r) => ({ ...r, score: r.change1h }));
}

function rankVolumeSpikes(rows: Omit<ScreenerRow, 'score'>[]): ScreenerRow[] {
  return rows
    .filter((r) => r.volumeRatio >= 2 && r.volume24h >= MIN_QUOTE_VOL)
    .sort((a, b) => b.volumeRatio - a.volumeRatio)
    .slice(0, 15)
    .map((r) => ({ ...r, score: r.volumeRatio }));
}

function rankTrends(rows: Omit<ScreenerRow, 'score'>[]): ScreenerRow[] {
  return rows
    .map((r) => {
      const sameDir =
        (r.change1h > 0 && r.change4h > 0) || (r.change1h < 0 && r.change4h < 0);
      const magnitude = Math.abs(r.change4h) + Math.abs(r.change1h) * 0.35;
      const volBoost = Math.min(r.volumeRatio, 4) * 0.5;
      const score = sameDir ? magnitude + volBoost : 0;
      return { ...r, score };
    })
    .filter((r) => r.score >= 5 && Math.abs(r.change4h) >= 3)
    .sort((a, b) => b.score - a.score)
    .slice(0, 15);
}

function rankNewListings(rows: Omit<ScreenerRow, 'score'>[]): ScreenerRow[] {
  const cutoff = Date.now() - LISTING_WINDOW_MS;
  return rows
    .filter((r) => r.listedAt && r.listedAt >= cutoff && r.volume24h >= 50_000)
    .sort((a, b) => (b.listedAt ?? 0) - (a.listedAt ?? 0))
    .slice(0, 15)
    .map((r) => ({
      ...r,
      score: r.listedAt ? (Date.now() - r.listedAt) / 86_400_000 : 0,
    }));
}

export async function fetchMarketScreener(): Promise<ScreenerSnapshot> {
  const tickerRes = await fetch(`${API}/ticker/24hr`);
  if (!tickerRes.ok) throw new Error('Не удалось загрузить рынок');

  const allUsdt = ((await tickerRes.json()) as Ticker24h[]).filter((t) =>
    isTradableUsdt(t.symbol),
  );

  const tickers = allUsdt
    .filter((t) => parseFloat(t.quoteVolume) >= MIN_QUOTE_VOL)
    .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
    .slice(0, SCAN_POOL);

  const listingCandidates = allUsdt
    .filter((t) => {
      const vol = parseFloat(t.quoteVolume);
      return vol >= 30_000 && vol <= 8_000_000;
    })
    .sort((a, b) => parseFloat(a.quoteVolume) - parseFloat(b.quoteVolume))
    .slice(0, 28);

  const analyzed = await mapPool(tickers, async (ticker) => {
    const klines = await fetchKlines(ticker.symbol, '1h', 25);
    if (!klines) return null;
    return analyzeSymbol(ticker, klines);
  });

  const listingRows = await mapPool(listingCandidates, async (ticker) => {
    const listedAt = await fetchListingDate(ticker.symbol);
    if (!listedAt) return null;
    const klines = await fetchKlines(ticker.symbol, '1h', 25);
    if (!klines) return null;
    return analyzeSymbol(ticker, klines, listedAt);
  });

  return {
    gainers1h: rankGainers(analyzed),
    volumeSpike: rankVolumeSpikes(analyzed),
    trend: rankTrends(analyzed),
    newListing: rankNewListings(listingRows),
    updatedAt: Date.now(),
    scanned: tickers.length,
  };
}

export function fmtPrice(n: number) {
  if (n < 0.0001) return n.toExponential(2);
  if (n < 1) return n.toFixed(6);
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

export function fmtPct(n: number, digits = 2) {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(digits)}%`;
}

export function fmtVolRatio(n: number) {
  return `${n.toFixed(1)}×`;
}

export function fmtListedDays(listedAt?: number) {
  if (!listedAt) return '—';
  const days = Math.max(1, Math.floor((Date.now() - listedAt) / 86_400_000));
  if (days === 1) return '1 дн.';
  if (days < 30) return `${days} дн.`;
  return `${Math.floor(days / 30)} мес.`;
}