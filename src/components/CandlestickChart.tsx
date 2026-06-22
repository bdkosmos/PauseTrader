import { useEffect, useRef, useState } from 'react';
import {
  ColorType,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts';

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface CandlestickChartProps {
  candles: Candle[];
  isLoading: boolean;
  pairName: string;
}

function computeRSI(closes: number[], period = 14): (number | null)[] {
  const result: (number | null)[] = new Array(closes.length).fill(null);
  if (closes.length <= period) return result;

  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change >= 0) avgGain += change;
    else avgLoss -= change;
  }
  avgGain /= period;
  avgLoss /= period;

  const rsiAt = (gain: number, loss: number) => {
    if (loss === 0) return 100;
    const rs = gain / loss;
    return 100 - 100 / (1 + rs);
  };

  result[period] = rsiAt(avgGain, avgLoss);

  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result[i] = rsiAt(avgGain, avgLoss);
  }

  return result;
}

function computeEMA(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const ema: number[] = [];
  values.forEach((v, i) => {
    if (i === 0) ema.push(v);
    else ema.push(v * k + ema[i - 1] * (1 - k));
  });
  return ema;
}

function computeMACD(closes: number[]) {
  const ema12 = computeEMA(closes, 12);
  const ema26 = computeEMA(closes, 26);
  const macdLine = closes.map((_, i) => ema12[i] - ema26[i]);
  const signalLine = computeEMA(macdLine, 9);
  return closes.map((_, i) => ({
    macd: macdLine[i],
    signal: signalLine[i],
    hist: macdLine[i] - signalLine[i],
  }));
}

const chartOptions = {
  layout: {
    background: { type: ColorType.Solid, color: '#0f172a' },
    textColor: '#cbd5e1',
  },
  grid: {
    vertLines: { color: '#1e293b' },
    horzLines: { color: '#1e293b' },
  },
  rightPriceScale: { borderColor: '#334155' },
  timeScale: { borderColor: '#334155', timeVisible: true },
  crosshair: { mode: 1 },
};

export function CandlestickChart({ candles, isLoading, pairName }: CandlestickChartProps) {
  const mainRef = useRef<HTMLDivElement>(null);
  const rsiRef = useRef<HTMLDivElement>(null);
  const macdRef = useRef<HTMLDivElement>(null);
  const mainChartRef = useRef<IChartApi | null>(null);
  const rsiChartRef = useRef<IChartApi | null>(null);
  const macdChartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  const [showRSI, setShowRSI] = useState(true);
  const [showMACD, setShowMACD] = useState(true);

  useEffect(() => {
    if (!mainRef.current) return;

    const chart = createChart(mainRef.current, {
      ...chartOptions,
      width: mainRef.current.clientWidth,
      height: mainRef.current.clientHeight,
    });
    const series = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    mainChartRef.current = chart;
    candleSeriesRef.current = series;

    const onResize = () => {
      if (mainRef.current) {
        chart.applyOptions({ width: mainRef.current.clientWidth, height: mainRef.current.clientHeight });
      }
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      chart.remove();
      mainChartRef.current = null;
      candleSeriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!candleSeriesRef.current || candles.length === 0) return;

    const chartData = candles.map((c) => ({
      time: Math.floor(c.time / 1000) as UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    candleSeriesRef.current.setData(chartData);
    mainChartRef.current?.timeScale().fitContent();
  }, [candles]);

  useEffect(() => {
    if (!showRSI) {
      rsiChartRef.current?.remove();
      rsiChartRef.current = null;
      return;
    }
    if (!rsiRef.current || candles.length === 0) return;

    rsiChartRef.current?.remove();
    const chart = createChart(rsiRef.current, {
      ...chartOptions,
      width: rsiRef.current.clientWidth,
      height: 120,
    });
    const line = chart.addLineSeries({ color: '#a78bfa', lineWidth: 2 });
    const closes = candles.map((c) => c.close);
    const rsi = computeRSI(closes);
    const rsiData = candles
      .map((c, i) =>
        rsi[i] !== null
          ? { time: Math.floor(c.time / 1000) as UTCTimestamp, value: rsi[i] as number }
          : null,
      )
      .filter(Boolean) as { time: UTCTimestamp; value: number }[];
    line.setData(rsiData);
    rsiChartRef.current = chart;

    return () => {
      chart.remove();
      rsiChartRef.current = null;
    };
  }, [candles, showRSI]);

  useEffect(() => {
    if (!showMACD) {
      macdChartRef.current?.remove();
      macdChartRef.current = null;
      return;
    }
    if (!macdRef.current || candles.length === 0) return;

    macdChartRef.current?.remove();
    const chart = createChart(macdRef.current, {
      ...chartOptions,
      width: macdRef.current.clientWidth,
      height: 120,
    });
    const hist = chart.addHistogramSeries({
      color: '#3b82f6',
      priceFormat: { type: 'price', precision: 4, minMove: 0.0001 },
    });
    const macdLine = chart.addLineSeries({ color: '#22c55e', lineWidth: 1 });
    const signalLine = chart.addLineSeries({ color: '#f59e0b', lineWidth: 1 });

    const macd = computeMACD(candles.map((c) => c.close));
    const histData = candles.map((c, i) => ({
      time: Math.floor(c.time / 1000) as UTCTimestamp,
      value: macd[i].hist,
      color: macd[i].hist >= 0 ? '#22c55e88' : '#ef444488',
    }));
    const macdData = candles.map((c, i) => ({
      time: Math.floor(c.time / 1000) as UTCTimestamp,
      value: macd[i].macd,
    }));
    const signalData = candles.map((c, i) => ({
      time: Math.floor(c.time / 1000) as UTCTimestamp,
      value: macd[i].signal,
    }));

    hist.setData(histData);
    macdLine.setData(macdData);
    signalLine.setData(signalData);
    macdChartRef.current = chart;

    return () => {
      chart.remove();
      macdChartRef.current = null;
    };
  }, [candles, showMACD]);

  return (
    <div className="chart-wrapper">
      <div className="indicator-controls">
        <label className="indicator-toggle">
          <input type="checkbox" checked={showRSI} onChange={(e) => setShowRSI(e.target.checked)} />
          RSI (14)
        </label>
        <label className="indicator-toggle">
          <input type="checkbox" checked={showMACD} onChange={(e) => setShowMACD(e.target.checked)} />
          MACD
        </label>
        <span className="indicator-pair">{pairName}/USDT • Binance</span>
      </div>

      <div className="chart-container" ref={mainRef}>
        {isLoading && candles.length === 0 && (
          <div className="loading-indicator">
            <div className="spinner" />
            <span>Loading chart data...</span>
          </div>
        )}
      </div>

      {showRSI && (
        <div className="indicator-panel">
          <div className="indicator-title">RSI (14)</div>
          <div ref={rsiRef} style={{ height: 120 }} />
        </div>
      )}

      {showMACD && (
        <div className="indicator-panel">
          <div className="indicator-title">MACD (12, 26, 9)</div>
          <div ref={macdRef} style={{ height: 120 }} />
        </div>
      )}
    </div>
  );
}