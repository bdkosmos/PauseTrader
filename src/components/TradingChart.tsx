import { useEffect, useRef, useState } from 'react';
import {
  ColorType,
  CrosshairMode,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type LogicalRange,
  type UTCTimestamp,
} from 'lightweight-charts';
import { computeEMA, computeRSI } from '../lib/indicators';
import type { Candle, CrosshairOHLC } from '../types';
import type { Tool } from './LeftToolbar';

interface TradingChartProps {
  candles: Candle[];
  revision: number;
  activeTool: Tool;
  isLoading: boolean;
  onCrosshair: (data: CrosshairOHLC | null) => void;
  chartRef: React.MutableRefObject<IChartApi | null>;
}

const TV = {
  bg: '#131722',
  grid: '#1e222d',
  text: '#d1d4dc',
  border: '#2a2e39',
  up: '#26a69a',
  down: '#ef5350',
  ema20: '#2196f3',
  ema50: '#ff9800',
  ema200: '#e040fb',
};

const EMA_PERIODS = [
  { period: 20, color: TV.ema20, title: 'EMA 20' },
  { period: 50, color: TV.ema50, title: 'EMA 50' },
  { period: 200, color: TV.ema200, title: 'EMA 200' },
] as const;

function toTime(candle: Candle): UTCTimestamp {
  return Math.floor(candle.time / 1000) as UTCTimestamp;
}

function baseOptions(width: number, height: number) {
  return {
    width,
    height,
    layout: {
      background: { type: ColorType.Solid, color: TV.bg },
      textColor: TV.text,
      fontSize: 12,
    },
    grid: {
      vertLines: { color: TV.grid },
      horzLines: { color: TV.grid },
    },
    rightPriceScale: { borderColor: TV.border },
    timeScale: {
      borderColor: TV.border,
      timeVisible: true,
      secondsVisible: false,
    },
    crosshair: {
      mode: CrosshairMode.Normal,
      vertLine: { color: '#758696', width: 1 as const, style: 2 },
      horzLine: { color: '#758696', width: 1 as const, style: 2 },
    },
    handleScroll: { mouseWheel: true, pressedMouseMove: true },
    handleScale: { mouseWheel: true, pinch: true },
  };
}

function toCrosshair(c: Candle): CrosshairOHLC {
  return {
    time: new Date(c.time).toLocaleString('ru-RU'),
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    volume: c.volume,
    change: c.open ? ((c.close - c.open) / c.open) * 100 : 0,
  };
}

function buildEmaData(candles: Candle[], closes: number[], period: number) {
  const ema = computeEMA(closes, period);
  return candles
    .map((c, i) =>
      ema[i] !== null
        ? { time: toTime(c), value: ema[i] as number }
        : null,
    )
    .filter(Boolean) as { time: UTCTimestamp; value: number }[];
}

export function TradingChart({
  candles,
  revision,
  activeTool,
  isLoading,
  onCrosshair,
  chartRef,
}: TradingChartProps) {
  const mainRef = useRef<HTMLDivElement>(null);
  const volumeRef = useRef<HTMLDivElement>(null);
  const rsiRef = useRef<HTMLDivElement>(null);

  const volumeChartRef = useRef<IChartApi | null>(null);
  const rsiChartRef = useRef<IChartApi | null>(null);

  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const rsiSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const emaSeriesRef = useRef<ISeriesApi<'Line'>[]>([]);

  const prevRevisionRef = useRef(-1);
  const prevLenRef = useRef(0);
  const hlinePriceRef = useRef<number | null>(null);
  const hlineRef = useRef<ReturnType<ISeriesApi<'Candlestick'>['createPriceLine']> | null>(null);

  const [chartsReady, setChartsReady] = useState(false);

  useEffect(() => {
    if (!mainRef.current || !volumeRef.current || !rsiRef.current) return;

    const mainEl = mainRef.current;
    const volEl = volumeRef.current;
    const rsiEl = rsiRef.current;

    const mainChart = createChart(mainEl, baseOptions(mainEl.clientWidth, mainEl.clientHeight));
    const volumeChart = createChart(volEl, {
      ...baseOptions(volEl.clientWidth, 100),
      rightPriceScale: { scaleMargins: { top: 0.8, bottom: 0 } },
    });
    const rsiChart = createChart(rsiEl, baseOptions(rsiEl.clientWidth, 100));

    chartRef.current = mainChart;
    volumeChartRef.current = volumeChart;
    rsiChartRef.current = rsiChart;

    candleSeriesRef.current = mainChart.addCandlestickSeries({
      upColor: TV.up,
      downColor: TV.down,
      borderVisible: false,
      wickUpColor: TV.up,
      wickDownColor: TV.down,
    });

    emaSeriesRef.current = EMA_PERIODS.map(({ color, title }) =>
      mainChart.addLineSeries({
        color,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        title,
      }),
    );

    volumeSeriesRef.current = volumeChart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    });

    rsiSeriesRef.current = rsiChart.addLineSeries({
      color: '#b388ff',
      lineWidth: 2,
      priceLineVisible: false,
    });

    const syncRange = (range: LogicalRange | null) => {
      if (!range) return;
      volumeChart.timeScale().setVisibleLogicalRange(range);
      rsiChart.timeScale().setVisibleLogicalRange(range);
    };

    mainChart.timeScale().subscribeVisibleLogicalRangeChange(syncRange);

    const onResize = () => {
      if (mainRef.current) {
        mainChart.applyOptions({
          width: mainRef.current.clientWidth,
          height: mainRef.current.clientHeight,
        });
      }
      if (volumeRef.current) {
        volumeChart.applyOptions({ width: volumeRef.current.clientWidth, height: 100 });
      }
      if (rsiRef.current) {
        rsiChart.applyOptions({ width: rsiRef.current.clientWidth, height: 100 });
      }
    };

    window.addEventListener('resize', onResize);
    setChartsReady(true);

    return () => {
      window.removeEventListener('resize', onResize);
      mainChart.timeScale().unsubscribeVisibleLogicalRangeChange(syncRange);
      mainChart.remove();
      volumeChart.remove();
      rsiChart.remove();
      chartRef.current = null;
      volumeChartRef.current = null;
      rsiChartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
      rsiSeriesRef.current = null;
      emaSeriesRef.current = [];
      setChartsReady(false);
    };
  }, [chartRef]);

  useEffect(() => {
    const chart = chartRef.current;
    const candleSeries = candleSeriesRef.current;
    if (!chart || !candleSeries || candles.length === 0) return;

    const handler = (param: { time?: UTCTimestamp }) => {
      if (!param.time) {
        onCrosshair(toCrosshair(candles[candles.length - 1]));
        return;
      }

      const idx = candles.findIndex((c) => toTime(c) === param.time);
      if (idx >= 0) onCrosshair(toCrosshair(candles[idx]));
    };

    chart.subscribeCrosshairMove(handler);
    onCrosshair(toCrosshair(candles[candles.length - 1]));

    return () => chart.unsubscribeCrosshairMove(handler);
  }, [candles, chartRef, onCrosshair, chartsReady]);

  useEffect(() => {
    const candleSeries = candleSeriesRef.current;
    const volumeSeries = volumeSeriesRef.current;
    const rsiSeries = rsiSeriesRef.current;
    const emaSeries = emaSeriesRef.current;

    if (!chartsReady || !candleSeries || !volumeSeries || !rsiSeries || candles.length === 0) {
      return;
    }

    const closes = candles.map((c) => c.close);
    const isFullReload = revision !== prevRevisionRef.current;
    const isAppend = candles.length > prevLenRef.current && !isFullReload;
    prevRevisionRef.current = revision;
    prevLenRef.current = candles.length;

    const candleData = candles.map((c) => ({
      time: toTime(c),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    const volumeData = candles.map((c) => ({
      time: toTime(c),
      value: c.volume,
      color: c.close >= c.open ? 'rgba(38,166,154,0.5)' : 'rgba(239,83,80,0.5)',
    }));

    const rsiValues = computeRSI(closes);
    const rsiData = candles
      .map((c, i) =>
        rsiValues[i] !== null
          ? { time: toTime(c), value: rsiValues[i] as number }
          : null,
      )
      .filter(Boolean) as { time: UTCTimestamp; value: number }[];

    if (isFullReload) {
      candleSeries.setData(candleData);
      volumeSeries.setData(volumeData);
      rsiSeries.setData(rsiData);
      emaSeries.forEach((series, i) => {
        series.setData(buildEmaData(candles, closes, EMA_PERIODS[i].period));
      });
      chartRef.current?.timeScale().fitContent();
      volumeChartRef.current?.timeScale().fitContent();
      rsiChartRef.current?.timeScale().fitContent();
      return;
    }

    const lastCandle = candleData[candleData.length - 1];
    const lastVolume = volumeData[volumeData.length - 1];
    const lastRsi = rsiData[rsiData.length - 1];

    if (isAppend) {
      candleSeries.update(lastCandle);
      volumeSeries.update(lastVolume);
      if (lastRsi) rsiSeries.update(lastRsi);
      emaSeries.forEach((series, i) => {
        const emaData = buildEmaData(candles, closes, EMA_PERIODS[i].period);
        const lastEma = emaData[emaData.length - 1];
        if (lastEma) series.update(lastEma);
      });
    } else {
      candleSeries.update(lastCandle);
      volumeSeries.update(lastVolume);
      if (lastRsi) rsiSeries.update(lastRsi);
      emaSeries.forEach((series, i) => {
        const emaData = buildEmaData(candles, closes, EMA_PERIODS[i].period);
        const lastEma = emaData[emaData.length - 1];
        if (lastEma) series.update(lastEma);
      });
    }
  }, [candles, revision, chartsReady, chartRef]);

  useEffect(() => {
    if (activeTool !== 'hline') return;

    const chart = chartRef.current;
    const series = candleSeriesRef.current;
    if (!chart || !series) return;

    const handler = (param: { point?: { y: number } }) => {
      if (!param.point) return;
      const price = series.coordinateToPrice(param.point.y);
      if (price === null) return;

      hlinePriceRef.current = price;
      if (hlineRef.current) series.removePriceLine(hlineRef.current);
      hlineRef.current = series.createPriceLine({
        price,
        color: '#f59e0b',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: 'H-Line',
      });
    };

    chart.subscribeClick(handler);
    return () => chart.unsubscribeClick(handler);
  }, [activeTool, chartsReady, chartRef]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const pan = activeTool === 'pan';
    chart.applyOptions({
      handleScroll: {
        mouseWheel: !pan,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
      handleScale: { mouseWheel: activeTool !== 'pan', pinch: true },
    });
  }, [activeTool, chartRef, chartsReady]);

  return (
    <div className="tv-chart-area">
      <div className="tv-ohlc-bar">
        {isLoading && candles.length === 0 && (
          <span className="tv-loading-tag">Загрузка...</span>
        )}
        <span className="tv-legend">
          <span className="tv-legend-item" style={{ color: TV.ema20 }}>EMA 20</span>
          <span className="tv-legend-item" style={{ color: TV.ema50 }}>EMA 50</span>
          <span className="tv-legend-item" style={{ color: TV.ema200 }}>EMA 200</span>
        </span>
        <span className="tv-watermark">BINANCE · {candles.length} свечей</span>
      </div>

      <div className="tv-main-chart" ref={mainRef}>
        {isLoading && candles.length === 0 && (
          <div className="tv-chart-loader">
            <div className="spinner" />
          </div>
        )}
      </div>

      <div className="tv-sub-pane">
        <div className="tv-sub-title">Объём</div>
        <div ref={volumeRef} className="tv-sub-chart" />
      </div>

      <div className="tv-sub-pane">
        <div className="tv-sub-title">RSI 14</div>
        <div ref={rsiRef} className="tv-sub-chart" />
      </div>
    </div>
  );
}