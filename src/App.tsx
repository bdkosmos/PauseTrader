import { useCallback, useMemo, useRef, useState } from 'react';
import type { IChartApi } from 'lightweight-charts';
import { Header } from './components/Header';
import { LeftToolbar, type Tool } from './components/LeftToolbar';
import { OHLCPanel } from './components/OHLCPanel';
import { PaperTradingPanel } from './components/PaperTradingPanel';
import { Sidebar } from './components/Sidebar';
import { TradingChart } from './components/TradingChart';
import { useBinanceChart, useSidebarTickers } from './hooks/useBinanceChart';
import { usePaperTrading } from './hooks/usePaperTrading';
import type { CrosshairOHLC, Timeframe } from './types';

function App() {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [timeframe, setTimeframe] = useState<Timeframe>('1h');
  const [activeTool, setActiveTool] = useState<Tool>('crosshair');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [tradingOpen, setTradingOpen] = useState(true);
  const [crosshair, setCrosshair] = useState<CrosshairOHLC | null>(null);

  const chartRef = useRef<IChartApi | null>(null);

  const { candles, loading, revision, wsConnected, refetch } = useBinanceChart(symbol, timeframe);
  const { items: sidebarItems, loading: sidebarLoading } = useSidebarTickers();
  const { portfolio, buy, sell, reset } = usePaperTrading();

  const current = useMemo(
    () => sidebarItems.find((w) => w.symbol === symbol),
    [sidebarItems, symbol],
  );

  const base = symbol.replace('USDT', '');
  const price = current?.price ?? candles.at(-1)?.close ?? 0;
  const change24h = current?.change24h ?? 0;

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
      <Header
        symbol={symbol}
        base={base}
        price={price}
        change24h={change24h}
        high24h={current?.high24h ?? 0}
        low24h={current?.low24h ?? 0}
        volume24h={current?.volume24h ?? 0}
        timeframe={timeframe}
        loading={loading}
        wsConnected={wsConnected}
        onTimeframe={setTimeframe}
        onRefresh={refetch}
        onFullscreen={fullscreen}
      />

      <div className="tv-workspace">
        <button
          type="button"
          className="tv-watchlist-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? '◀' : '▶'}
        </button>

        {sidebarOpen && (
          <div className="tv-watchlist-panel">
            <Sidebar
              items={sidebarItems}
              selected={symbol}
              onSelect={setSymbol}
              loading={sidebarLoading}
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
            revision={revision}
            activeTool={activeTool}
            isLoading={loading}
            onCrosshair={handleCrosshair}
            chartRef={chartRef}
          />
        </div>

        <button
          type="button"
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
              watchlist={sidebarItems}
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