import { useCallback, useMemo, useRef, useState } from 'react';
import type { IChartApi } from 'lightweight-charts';
import { LeftToolbar, type Tool } from './components/LeftToolbar';
import { OHLCPanel } from './components/OHLCPanel';
import { PaperTradingPanel } from './components/PaperTradingPanel';
import { TopBar } from './components/TopBar';
import { TradingChart } from './components/TradingChart';
import { Watchlist } from './components/Watchlist';
import { useBinanceChart, useWatchlist } from './hooks/useBinanceChart';
import { usePaperTrading } from './hooks/usePaperTrading';
import type { ChartType, CrosshairOHLC, IndicatorState, Timeframe } from './types';

const DEFAULT_INDICATORS: IndicatorState = {
  volume: true,
  ema9: true,
  ema21: true,
  ema50: false,
  rsi: true,
  macd: false,
};

function App() {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [timeframe, setTimeframe] = useState<Timeframe>('1h');
  const [chartType, setChartType] = useState<ChartType>('candles');
  const [indicators, setIndicators] = useState<IndicatorState>(DEFAULT_INDICATORS);
  const [activeTool, setActiveTool] = useState<Tool>('crosshair');
  const [watchlistOpen, setWatchlistOpen] = useState(true);
  const [tradingOpen, setTradingOpen] = useState(true);
  const [crosshair, setCrosshair] = useState<CrosshairOHLC | null>(null);

  const chartRef = useRef<IChartApi | null>(null);

  const { candles, loading, refetch } = useBinanceChart(symbol, timeframe);
  const { items: watchlist, loading: wlLoading } = useWatchlist();
  const { portfolio, buy, sell, reset } = usePaperTrading();

  const current = useMemo(
    () => watchlist.find((w) => w.symbol === symbol),
    [watchlist, symbol],
  );

  const base = symbol.replace('USDT', '');
  const price = current?.price ?? candles.at(-1)?.close ?? 0;
  const change24h = current?.change24h ?? 0;

  const toggleIndicator = (key: keyof IndicatorState) => {
    setIndicators((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCrosshair = useCallback((data: CrosshairOHLC | null) => {
    setCrosshair(data);
  }, []);

  const zoom = (factor: number) => {
    const chart = chartRef.current;
    if (!chart) return;
    const ts = chart.timeScale();
    const range = ts.getVisibleLogicalRange();
    if (!range) return;
    const center = (range.from + range.to) / 2;
    const half = (range.to - range.from) / 2 / factor;
    ts.setVisibleLogicalRange({ from: center - half, to: center + half });
  };

  const resetZoom = () => chartRef.current?.timeScale().fitContent();

  const fullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const handleBuy = useCallback(
    (usdtAmount: number) => buy(symbol, base, usdtAmount, price),
    [buy, symbol, base, price],
  );

  const handleSell = useCallback(
    (quantity: number) => sell(symbol, base, quantity, price),
    [sell, symbol, base, price],
  );

  return (
    <div className="tv-app">
      <TopBar
        symbol={symbol}
        base={base}
        price={price}
        change24h={change24h}
        high24h={current?.high24h ?? 0}
        low24h={current?.low24h ?? 0}
        volume24h={current?.volume24h ?? 0}
        timeframe={timeframe}
        chartType={chartType}
        indicators={indicators}
        loading={loading}
        onTimeframe={setTimeframe}
        onChartType={setChartType}
        onIndicator={toggleIndicator}
        onRefresh={refetch}
        onFullscreen={fullscreen}
      />

      <div className="tv-workspace">
        <button
          className="tv-watchlist-toggle"
          onClick={() => setWatchlistOpen(!watchlistOpen)}
        >
          {watchlistOpen ? '◀' : '▶'}
        </button>

        {watchlistOpen && (
          <div className="tv-watchlist-panel">
            <Watchlist
              items={watchlist}
              selected={symbol}
              onSelect={setSymbol}
              loading={wlLoading}
            />
          </div>
        )}

        <div className="tv-chart-workspace">
          <LeftToolbar
            activeTool={activeTool}
            onTool={setActiveTool}
            onZoomIn={() => zoom(1.4)}
            onZoomOut={() => zoom(0.7)}
            onReset={resetZoom}
          />

          <TradingChart
            candles={candles}
            chartType={chartType}
            indicators={indicators}
            activeTool={activeTool}
            isLoading={loading}
            onCrosshair={handleCrosshair}
            chartRef={chartRef}
          />
        </div>

        <button
          className="tv-trading-toggle"
          onClick={() => setTradingOpen(!tradingOpen)}
        >
          {tradingOpen ? '▶' : '◀'}
        </button>

        {tradingOpen && (
          <div className="tv-trading-panel">
            <PaperTradingPanel
              symbol={symbol}
              base={base}
              price={price}
              portfolio={portfolio}
              watchlist={watchlist}
              onBuy={handleBuy}
              onSell={handleSell}
              onReset={reset}
            />
          </div>
        )}
      </div>

      <OHLCPanel data={crosshair} base={base} />
    </div>
  );
}

export default App;