import { useEffect, useRef, useState } from 'react';
import {
  ColorType,
  CrosshairMode,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts';
import { computeEMA, computeMACD, computeRSI } from '../lib/indicators';
import type { Candle, ChartType, CrosshairOHLC, IndicatorState, Tool } from '../types';

interface TradingChartProps {
  candles: Candle[];
  chartType: ChartType;
  indicators: IndicatorState;
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
  ema9: '#2196f3',
  ema21: '#ff9800',
  ema50: '#e040fb',
};

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
    timeScale: { borderColor: TV.border, timeVisible: true, secondsVisible: false },
    crosshair: {
      mode: CrosshairMode.Normal,
      vertLine: { color: '#758696', width: 1 as const, style: 2 },
      horzLine: { color: '#758696', width: 1 as const, style: 2 },
    },
    handleScroll: { mouseWheel: true, pressedMouseMove: true },
    handleScale: { mouseWheel: true, pinch: true },
  };
}

export function TradingChart({
  candles, chartType, indicators, activeTool, isLoading, onCrosshair, chartRef,
}: TradingChartProps) {
  const mainRef = useRef<HTMLDivElement>(null);
  const volumeRef = useRef<HTMLDivElement>(null);
  const rsiRef = useRef<HTMLDivElement>(null);
  const macdRef = useRef<HTMLDivElement>(null);

  const mainSeriesRef = useRef<ISeriesApi<'Candlestick'> | ISeriesApi<'Line'> | ISeriesApi<'Area'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const emaSeriesRef = useRef<Record<string, ISeriesApi<'Line'>>>({});
  const hlinePriceRef = useRef<number | null>(null);
  const hlineRef = useRef<ReturnType<ISeriesApi<'Candlestick'>['createPriceLine']> | null>(null);

  const [chartsReady, setChartsReady] = useState(false);

  // Main chart init
  useEffect(() => {
    if (!mainRef.current) return;
    const el = mainRef.current;
    const chart = createChart(el, baseOptions(el.clientWidth, el.clientHeight));
    chartRef.current = chart;

    const onResize = () => {
      if (mainRef.current) {
        chart.applyOptions({ width: mainRef.current.clientWidth, height: mainRef.current.clientHeight });
      }
    };
    window.addEventListener('resize', onResize);
    setChartsReady(true);

    return () => {
      window.removeEventListener('resize', onResize);
      chart.remove();
      chartRef.current = null;
      mainSeriesRef.current = null;
      emaSeriesRef.current = {};
      setChartsReady(false);
    };
  }, [chartRef]);

  // Crosshair OHLC
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || candles.length === 0) return;

    const handler = (param: { time?: UTCTimestamp; seriesData: Map<unknown, unknown> }) => {
      if (!param.time) {
        const last = candles[candles.length - 1];
        onCrosshair({
          time: new Date(last.time).toLocaleString('ru-RU'),
          open: last.open, high: last.high, low: last.low, close: last.close,
          volume: last.volume,
          change: ((last.close - last.open) / last.open) * 100,
        });
        return;
      }

      const idx = candles.findIndex((c) => Math.floor(c.time / 1000) === param.time);
      if (idx < 0) return;
      const c = candles[idx];
      onCrosshair({
        time: new Date(c.time).toLocaleString('ru-RU'),
        open: c.open, high: c.high, low: c.low, close: c.close,
        volume: c.volume,
        change: ((c.close - c.open) / c.open) * 100,
      });
    };

    chart.subscribeCrosshairMove(handler);
    const last = candles[candles.length - 1];
    onCrosshair({
      time: new Date(last.time).toLocaleString('ru-RU'),
      open: last.open, high: last.high, low: last.low, close: last.close,
      volume: last.volume,
      change: ((last.close - last.open) / last.open) * 100,
    });

    return () => chart.unsubscribeCrosshairMove(handler);
  }, [candles, chartRef, onCrosshair, chartsReady]);

  // Main series + EMAs
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !chartsReady) return;

    if (mainSeriesRef.current) {
      chart.removeSeries(mainSeriesRef.current);
      mainSeriesRef.current = null;
    }
    Object.values(emaSeriesRef.current).forEach((s) => chart.removeSeries(s));
    emaSeriesRef.current = {};
    if (hlineRef.current && mainSeriesRef.current) {
      try { (mainSeriesRef.current as ISeriesApi<'Candlestick'>).removePriceLine(hlineRef.current); } catch { /* */ }
    }
    hlineRef.current = null;

    const times = candles.map((c) => Math.floor(c.time / 1000) as UTCTimestamp);
    const closes = candles.map((c) => c.close);

    let series: ISeriesApi<'Candlestick'> | ISeriesApi<'Line'> | ISeriesApi<'Area'>;

    if (chartType === 'candles') {
      series = chart.addCandlestickSeries({
        upColor: TV.up, downColor: TV.down,
        borderVisible: false, wickUpColor: TV.up, wickDownColor: TV.down,
      });
      series.setData(candles.map((c) => ({
        time: Math.floor(c.time / 1000) as UTCTimestamp,
        open: c.open, high: c.high, low: c.low, close: c.close,
      })));
    } else if (chartType === 'line') {
      series = chart.addLineSeries({ color: TV.ema9, lineWidth: 2 });
      series.setData(times.map((t, i) => ({ time: t, value: closes[i] })));
    } else {
      series = chart.addAreaSeries({
        lineColor: TV.ema9, topColor: 'rgba(33,150,243,0.4)', bottomColor: 'rgba(33,150,243,0.0)',
      });
      series.setData(times.map((t, i) => ({ time: t, value: closes[i] })));
    }
    mainSeriesRef.current = series;

    const emaConfig: [keyof IndicatorState, number, string][] = [
      ['ema9', 9, TV.ema9],
      ['ema21', 21, TV.ema21],
      ['ema50', 50, TV.ema50],
    ];

    for (const [key, period, color] of emaConfig) {
      if (!indicators[key]) continue;
      const ema = computeEMA(closes, period);
      const line = chart.addLineSeries({ color, lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
      line.setData(
        candles
          .map((c, i) => ema[i] !== null ? { time: Math.floor(c.time / 1000) as UTCTimestamp, value: ema[i] as number } : null)
          .filter(Boolean) as { time: UTCTimestamp; value: number }[],
      );
      emaSeriesRef.current[key] = line;
    }

    if (hlinePriceRef.current !== null && chartType === 'candles') {
      hlineRef.current = (series as ISeriesApi<'Candlestick'>).createPriceLine({
        price: hlinePriceRef.current,
        color: '#f59e0b',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: 'H-Line',
      });
    }

    chart.timeScale().fitContent();
  }, [candles, chartType, indicators.ema9, indicators.ema21, indicators.ema50, chartsReady, chartRef]);

  // Volume pane
  useEffect(() => {
    if (!indicators.volume) {
      volumeRef.current?.replaceChildren();
      volumeSeriesRef.current = null;
      return;
    }
    if (!volumeRef.current || candles.length === 0) return;

    volumeRef.current.replaceChildren();
    const el = volumeRef.current;
    const chart = createChart(el, { ...baseOptions(el.clientWidth, 100), rightPriceScale: { scaleMargins: { top: 0.8, bottom: 0 } } });
    const vol = chart.addHistogramSeries({ priceFormat: { type: 'volume' }, priceScaleId: '' });
    vol.setData(candles.map((c) => ({
      time: Math.floor(c.time / 1000) as UTCTimestamp,
      value: c.volume,
      color: c.close >= c.open ? 'rgba(38,166,154,0.5)' : 'rgba(239,83,80,0.5)',
    })));
    chart.timeScale().fitContent();
    volumeSeriesRef.current = vol;

    const chartMain = chartRef.current;
    if (chartMain) {
      const sync = (range: ReturnType<typeof chartMain.timeScale>['getVisibleLogicalRange'] extends () => infer R ? R : never) => {
        if (range) chart.timeScale().setVisibleLogicalRange(range);
      };
      chartMain.timeScale().subscribeVisibleLogicalRangeChange(sync);
      return () => {
        chartMain.timeScale().unsubscribeVisibleLogicalRangeChange(sync);
        chart.remove();
      };
    }
    return () => chart.remove();
  }, [candles, indicators.volume, chartsReady, chartRef]);

  // RSI pane
  useEffect(() => {
    if (!indicators.rsi) { rsiRef.current?.replaceChildren(); return; }
    if (!rsiRef.current || candles.length === 0) return;
    rsiRef.current.replaceChildren();
    const el = rsiRef.current;
    const chart = createChart(el, baseOptions(el.clientWidth, 100));
    const line = chart.addLineSeries({ color: '#b388ff', lineWidth: 2 });
    const rsi = computeRSI(candles.map((c) => c.close));
    line.setData(
      candles
        .map((c, i) => rsi[i] !== null ? { time: Math.floor(c.time / 1000) as UTCTimestamp, value: rsi[i] as number } : null)
        .filter(Boolean) as { time: UTCTimestamp; value: number }[],
    );
    chart.timeScale().fitContent();
    return () => chart.remove();
  }, [candles, indicators.rsi]);

  // MACD pane
  useEffect(() => {
    if (!indicators.macd) { macdRef.current?.replaceChildren(); return; }
    if (!macdRef.current || candles.length === 0) return;
    macdRef.current.replaceChildren();
    const el = macdRef.current;
    const chart = createChart(el, baseOptions(el.clientWidth, 100));
    const hist = chart.addHistogramSeries({ priceFormat: { type: 'price', precision: 4, minMove: 0.0001 } });
    const macdLine = chart.addLineSeries({ color: TV.up, lineWidth: 1 });
    const signalLine = chart.addLineSeries({ color: '#ff9800', lineWidth: 1 });
    const macd = computeMACD(candles.map((c) => c.close));
    hist.setData(candles.map((c, i) => ({
      time: Math.floor(c.time / 1000) as UTCTimestamp,
      value: macd[i].hist,
      color: macd[i].hist >= 0 ? 'rgba(38,166,154,0.6)' : 'rgba(239,83,80,0.6)',
    })));
    macdLine.setData(candles.map((c, i) => ({ time: Math.floor(c.time / 1000) as UTCTimestamp, value: macd[i].macd })));
    signalLine.setData(candles.map((c, i) => ({ time: Math.floor(c.time / 1000) as UTCTimestamp, value: macd[i].signal })));
    chart.timeScale().fitContent();
    return () => chart.remove();
  }, [candles, indicators.macd]);

  // Tool: horizontal line on click
  useEffect(() => {
    if (activeTool !== 'hline') return;
    const chart = chartRef.current;
    const series = mainSeriesRef.current;
    if (!chart || !series || chartType !== 'candles') return;

    const handler = (param: { point?: { y: number } }) => {
      if (!param.point) return;
      const price = (series as ISeriesApi<'Candlestick'>).coordinateToPrice(param.point.y);
      if (price === null) return;
      hlinePriceRef.current = price;
      if (hlineRef.current) {
        (series as ISeriesApi<'Candlestick'>).removePriceLine(hlineRef.current);
      }
      hlineRef.current = (series as ISeriesApi<'Candlestick'>).createPriceLine({
        price, color: '#f59e0b', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: 'H-Line',
      });
    };

    chart.subscribeClick(handler);
    return () => chart.unsubscribeClick(handler);
  }, [activeTool, chartType, chartsReady, chartRef]);

  // Pan mode disables scroll
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const pan = activeTool === 'pan';
    chart.applyOptions({
      handleScroll: { mouseWheel: !pan, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
      handleScale: { mouseWheel: activeTool !== 'pan', pinch: true },
    });
  }, [activeTool, chartRef, chartsReady]);

  return (
    <div className="tv-chart-area">
      <div className="tv-ohlc-bar">
        {isLoading && candles.length === 0 && <span className="tv-loading-tag">Загрузка...</span>}
        <span className="tv-watermark">BINANCE • {candles.length} свечей</span>
      </div>

      <div className="tv-main-chart" ref={mainRef}>
        {isLoading && candles.length === 0 && (
          <div className="tv-chart-loader"><div className="spinner" /></div>
        )}
      </div>

      {indicators.volume && (
        <div className="tv-sub-pane">
          <div className="tv-sub-title">Объём</div>
          <div ref={volumeRef} className="tv-sub-chart" />
        </div>
      )}
      {indicators.rsi && (
        <div className="tv-sub-pane">
          <div className="tv-sub-title">RSI 14</div>
          <div ref={rsiRef} className="tv-sub-chart" />
        </div>
      )}
      {indicators.macd && (
        <div className="tv-sub-pane">
          <div className="tv-sub-title">MACD 12,26,9</div>
          <div ref={macdRef} className="tv-sub-chart" />
        </div>
      )}
    </div>
  );
}