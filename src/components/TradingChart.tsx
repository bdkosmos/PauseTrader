import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ColorType,
  CrosshairMode,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type LogicalRange,
  type UTCTimestamp,
} from 'lightweight-charts';
import { computeEMA, computeMACD, computeRSI } from '../lib/indicators';
import type { IndicatorConfig } from '../lib/plans';
import type { Candle, CrosshairOHLC } from '../types';
import type { Tool } from './LeftToolbar';

interface TradingChartProps {
  candles: Candle[];
  revision: number;
  indicators: IndicatorConfig;
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

const EMA_DEFS = [
  { key: 'ema20' as const, period: 20, color: TV.ema20, title: 'EMA 20' },
  { key: 'ema50' as const, period: 50, color: TV.ema50, title: 'EMA 50' },
  { key: 'ema200' as const, period: 200, color: TV.ema200, title: 'EMA 200' },
];

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
      ema[i] !== null ? { time: toTime(c), value: ema[i] as number } : null,
    )
    .filter(Boolean) as { time: UTCTimestamp; value: number }[];
}

export function TradingChart({
  candles,
  revision,
  indicators,
  activeTool,
  isLoading,
  onCrosshair,
  chartRef,
}: TradingChartProps) {
  const mainRef = useRef<HTMLDivElement>(null);
  const volumeRef = useRef<HTMLDivElement>(null);
  const rsiRef = useRef<HTMLDivElement>(null);
  const macdRef = useRef<HTMLDivElement>(null);

  const volumeChartRef = useRef<IChartApi | null>(null);
  const rsiChartRef = useRef<IChartApi | null>(null);
  const macdChartRef = useRef<IChartApi | null>(null);

  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const rsiSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const macdHistRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const macdLineRef = useRef<ISeriesApi<'Line'> | null>(null);
  const macdSignalRef = useRef<ISeriesApi<'Line'> | null>(null);
  const emaSeriesRef = useRef<{ period: number; series: ISeriesApi<'Line'> }[]>([]);

  const prevRevisionRef = useRef(-1);
  const prevLenRef = useRef(0);
  const hlineRef = useRef<ReturnType<ISeriesApi<'Candlestick'>['createPriceLine']> | null>(null);

  const [chartsReady, setChartsReady] = useState(false);

  const activeEmas = useMemo(
    () => EMA_DEFS.filter((d) => indicators[d.key]),
    [indicators],
  );

  const legend = useMemo(() => {
    const parts: string[] = [];
    if (indicators.ema20) parts.push('EMA 20');
    if (indicators.ema50) parts.push('EMA 50');
    if (indicators.ema200) parts.push('EMA 200');
    if (indicators.volume) parts.push('Vol');
    if (indicators.rsi) parts.push('RSI');
    if (indicators.macd) parts.push('MACD');
    return parts;
  }, [indicators]);

  useEffect(() => {
    if (!mainRef.current) return;

    const mainEl = mainRef.current;
    const mainChart = createChart(mainEl, baseOptions(mainEl.clientWidth, mainEl.clientHeight));
    chartRef.current = mainChart;

    candleSeriesRef.current = mainChart.addCandlestickSeries({
      upColor: TV.up,
      downColor: TV.down,
      borderVisible: false,
      wickUpColor: TV.up,
      wickDownColor: TV.down,
    });

    emaSeriesRef.current = activeEmas.map(({ period, color, title }) => ({
      period,
      series: mainChart.addLineSeries({
        color,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        title,
      }),
    }));

    let volumeChart: IChartApi | null = null;
    let rsiChart: IChartApi | null = null;
    let macdChart: IChartApi | null = null;

    if (indicators.volume && volumeRef.current) {
      const volEl = volumeRef.current;
      volumeChart = createChart(volEl, {
        ...baseOptions(volEl.clientWidth, 100),
        rightPriceScale: { scaleMargins: { top: 0.8, bottom: 0 } },
      });
      volumeChartRef.current = volumeChart;
      volumeSeriesRef.current = volumeChart.addHistogramSeries({
        priceFormat: { type: 'volume' },
        priceScaleId: '',
      });
    }

    if (indicators.rsi && rsiRef.current) {
      const rsiEl = rsiRef.current;
      rsiChart = createChart(rsiEl, baseOptions(rsiEl.clientWidth, 100));
      rsiChartRef.current = rsiChart;
      rsiSeriesRef.current = rsiChart.addLineSeries({
        color: '#b388ff',
        lineWidth: 2,
        priceLineVisible: false,
      });
    }

    if (indicators.macd && macdRef.current) {
      const macdEl = macdRef.current;
      macdChart = createChart(macdEl, baseOptions(macdEl.clientWidth, 100));
      macdChartRef.current = macdChart;
      macdHistRef.current = macdChart.addHistogramSeries({
        priceFormat: { type: 'price', precision: 4, minMove: 0.0001 },
      });
      macdLineRef.current = macdChart.addLineSeries({ color: TV.up, lineWidth: 1 });
      macdSignalRef.current = macdChart.addLineSeries({ color: '#ff9800', lineWidth: 1 });
    }

    const syncRange = (range: LogicalRange | null) => {
      if (!range) return;
      volumeChart?.timeScale().setVisibleLogicalRange(range);
      rsiChart?.timeScale().setVisibleLogicalRange(range);
      macdChart?.timeScale().setVisibleLogicalRange(range);
    };

    mainChart.timeScale().subscribeVisibleLogicalRangeChange(syncRange);

    const onResize = () => {
      if (mainRef.current) {
        mainChart.applyOptions({
          width: mainRef.current.clientWidth,
          height: mainRef.current.clientHeight,
        });
      }
      if (volumeRef.current && volumeChart) {
        volumeChart.applyOptions({ width: volumeRef.current.clientWidth, height: 100 });
      }
      if (rsiRef.current && rsiChart) {
        rsiChart.applyOptions({ width: rsiRef.current.clientWidth, height: 100 });
      }
      if (macdRef.current && macdChart) {
        macdChart.applyOptions({ width: macdRef.current.clientWidth, height: 100 });
      }
    };

    window.addEventListener('resize', onResize);
    setChartsReady(true);

    return () => {
      window.removeEventListener('resize', onResize);
      mainChart.timeScale().unsubscribeVisibleLogicalRangeChange(syncRange);
      mainChart.remove();
      volumeChart?.remove();
      rsiChart?.remove();
      macdChart?.remove();
      chartRef.current = null;
      volumeChartRef.current = null;
      rsiChartRef.current = null;
      macdChartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
      rsiSeriesRef.current = null;
      macdHistRef.current = null;
      macdLineRef.current = null;
      macdSignalRef.current = null;
      emaSeriesRef.current = [];
      setChartsReady(false);
    };
  }, [chartRef, indicators, activeEmas]);

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
    if (!chartsReady || !candleSeries || candles.length === 0) return;

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

    const applySeries = () => {
      candleSeries.setData(candleData);

      emaSeriesRef.current.forEach(({ period, series }) => {
        series.setData(buildEmaData(candles, closes, period));
      });

      if (indicators.volume && volumeSeriesRef.current) {
        volumeSeriesRef.current.setData(
          candles.map((c) => ({
            time: toTime(c),
            value: c.volume,
            color: c.close >= c.open ? 'rgba(38,166,154,0.5)' : 'rgba(239,83,80,0.5)',
          })),
        );
      }

      if (indicators.rsi && rsiSeriesRef.current) {
        const rsiValues = computeRSI(closes);
        rsiSeriesRef.current.setData(
          candles
            .map((c, i) =>
              rsiValues[i] !== null
                ? { time: toTime(c), value: rsiValues[i] as number }
                : null,
            )
            .filter(Boolean) as { time: UTCTimestamp; value: number }[],
        );
      }

      if (indicators.macd && macdHistRef.current && macdLineRef.current && macdSignalRef.current) {
        const macd = computeMACD(closes);
        macdHistRef.current.setData(
          candles.map((c, i) => ({
            time: toTime(c),
            value: macd[i].hist,
            color: macd[i].hist >= 0 ? 'rgba(38,166,154,0.6)' : 'rgba(239,83,80,0.6)',
          })),
        );
        macdLineRef.current.setData(
          candles.map((c, i) => ({ time: toTime(c), value: macd[i].macd })),
        );
        macdSignalRef.current.setData(
          candles.map((c, i) => ({ time: toTime(c), value: macd[i].signal })),
        );
      }

      chartRef.current?.timeScale().fitContent();
      volumeChartRef.current?.timeScale().fitContent();
      rsiChartRef.current?.timeScale().fitContent();
      macdChartRef.current?.timeScale().fitContent();
    };

    const updateLast = () => {
      const last = candleData[candleData.length - 1];
      candleSeries.update(last);

      emaSeriesRef.current.forEach(({ period, series }) => {
        const emaData = buildEmaData(candles, closes, period);
        const lastEma = emaData[emaData.length - 1];
        if (lastEma) series.update(lastEma);
      });

      if (indicators.volume && volumeSeriesRef.current) {
        const c = candles[candles.length - 1];
        volumeSeriesRef.current.update({
          time: toTime(c),
          value: c.volume,
          color: c.close >= c.open ? 'rgba(38,166,154,0.5)' : 'rgba(239,83,80,0.5)',
        });
      }

      if (indicators.rsi && rsiSeriesRef.current) {
        const rsiValues = computeRSI(closes);
        const i = candles.length - 1;
        if (rsiValues[i] !== null) {
          rsiSeriesRef.current.update({
            time: toTime(candles[i]),
            value: rsiValues[i] as number,
          });
        }
      }

      if (indicators.macd && macdHistRef.current && macdLineRef.current && macdSignalRef.current) {
        const macd = computeMACD(closes);
        const i = candles.length - 1;
        const t = toTime(candles[i]);
        macdHistRef.current.update({
          time: t,
          value: macd[i].hist,
          color: macd[i].hist >= 0 ? 'rgba(38,166,154,0.6)' : 'rgba(239,83,80,0.6)',
        });
        macdLineRef.current.update({ time: t, value: macd[i].macd });
        macdSignalRef.current.update({ time: t, value: macd[i].signal });
      }
    };

    if (isFullReload) applySeries();
    else updateLast();
  }, [candles, revision, chartsReady, chartRef, indicators]);

  useEffect(() => {
    if (activeTool !== 'hline') return;
    const chart = chartRef.current;
    const series = candleSeriesRef.current;
    if (!chart || !series) return;

    const handler = (param: { point?: { y: number } }) => {
      if (!param.point) return;
      const price = series.coordinateToPrice(param.point.y);
      if (price === null) return;
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
          {legend.map((item) => (
            <span key={item} className="tv-legend-item">{item}</span>
          ))}
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