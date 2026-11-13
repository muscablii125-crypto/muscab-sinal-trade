/**
 * Professional TradingView-Style Interactive Candlestick Chart
 * Equipped with:
 * 1. 8 Distinct Timeframes (1M, 1W, 1D, 4H, 1H, 30M, 15M, 5M)
 * 2. Real-Time Candle Countdown Timer (e.g. 5M Bar Closes in: 02:45)
 * 3. CRT Liquidity Lines (PDH, PDL, PWH, PWL, PMH, PML) with exact labels & prices
 * 4. Interactive Manual Trend Line Drawing Tool (Move, Resize, Custom Colors, Extend Ray, Undo/Redo, LocalStorage persistence)
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  Time,
  LineStyle,
  CandlestickSeries,
} from 'lightweight-charts';
import {
  InstrumentId,
  Timeframe,
  Candle,
  CrtSignalResult,
  TrendLine,
  PositionDrawing,
  PositionType,
} from '../types/trading';
import { SUPPORTED_INSTRUMENTS } from '../constants/instruments';
import { getCandleCountdownSeconds, formatCountdown } from '../services/sessionClock';
import { soundEffects } from '../services/soundEffects';
import {
  Maximize2,
  Activity,
  Clock,
  PenTool,
  Move,
  Trash2,
  RotateCcw,
  RotateCw,
  Eye,
  EyeOff,
  Palette,
  Check,
  TrendingUp,
  TrendingDown,
  Target,
  ArrowUpDown,
  Sliders,
  ExternalLink,
} from 'lucide-react';

interface TradingViewChartProps {
  instrument: InstrumentId;
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
  candles: Candle[];
  correlatedCandles?: Candle[];
  signal?: CrtSignalResult | null;
  height?: number;
  liveMidPrice?: number;
  connectionStatus?: 'LIVE_CONNECTED' | 'DATA_DISCONNECTED';
}

export const TradingViewChart: React.FC<TradingViewChartProps> = ({
  instrument,
  timeframe,
  onTimeframeChange,
  candles,
  correlatedCandles = [],
  signal,
  height = 440,
  liveMidPrice,
  connectionStatus = 'LIVE_CONNECTED',
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const priceLinesRef = useRef<any[]>([]);

  // Candle Countdown State
  const [countdownSeconds, setCountdownSeconds] = useState<number>(0);

  // OHLC Hover Header State
  const [hoverData, setHoverData] = useState<{
    open: number;
    high: number;
    low: number;
    close: number;
    change: number;
  } | null>(null);

  // CRT Overlay toggles
  const [showOverlays, setShowOverlays] = useState({
    liquidityLevels: true, // PDH, PDL, PWH, PWL, PMH, PML
    keyLevels: true,
    tsLevels: true,
    tradeLevels: true,
  });

  // Chart Drawing Tool Modes
  const [activeTool, setActiveTool] = useState<'NONE' | 'TREND_LINE' | 'LONG_POSITION' | 'SHORT_POSITION'>('NONE');
  const isDrawingMode = activeTool === 'TREND_LINE';
  const [drawStep, setDrawStep] = useState<0 | 1>(0); // 0 = idle/ready, 1 = point 1 placed
  const [startPoint, setStartPoint] = useState<{ time: number; price: number; x: number; y: number } | null>(null);
  const [currentMousePoint, setCurrentMousePoint] = useState<{ x: number; y: number } | null>(null);

  // Trend Lines Collection (Stored in localStorage per instrument)
  const [trendLines, setTrendLines] = useState<TrendLine[]>(() => {
    try {
      const saved = localStorage.getItem(`muscab_trendlines_${instrument}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Long & Short Positions Collection (Stored in localStorage per instrument)
  const [positions, setPositions] = useState<PositionDrawing[]>(() => {
    try {
      const saved = localStorage.getItem(`muscab_positions_${instrument}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Selected item IDs for editing
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [selectedPositionId, setSelectedPositionId] = useState<string | null>(null);
  const [showDrawings, setShowDrawings] = useState<boolean>(true);

  // Dragging existing trendline or endpoint state
  const [dragState, setDragState] = useState<{
    type: 'BODY' | 'START_HANDLE' | 'END_HANDLE';
    lineId: string;
    originX: number;
    originY: number;
    initialStartPrice: number;
    initialEndPrice: number;
    initialStartTime: number;
    initialEndTime: number;
  } | null>(null);

  // Dragging existing Long/Short position state
  const [positionDrag, setPositionDrag] = useState<{
    id: string;
    part: 'BODY' | 'TP_HANDLE' | 'SL_HANDLE' | 'ENTRY_HANDLE' | 'WIDTH_HANDLE';
    originX: number;
    originY: number;
    initialEntry: number;
    initialTP: number;
    initialSL: number;
    initialStartTime: number;
    initialEndTime: number;
  } | null>(null);

  // Unified Undo / Redo History Stack (Trend lines + Long/Short positions)
  interface HistorySnapshot {
    trendLines: TrendLine[];
    positions: PositionDrawing[];
  }
  const [history, setHistory] = useState<HistorySnapshot[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Style attributes for new / selected line
  const [activeColor, setActiveColor] = useState<string>('#f59e0b'); // Gold default
  const [activeWidth, setActiveWidth] = useState<number>(2);
  const [activeStyle, setActiveStyle] = useState<'solid' | 'dashed' | 'dotted'>('solid');
  const [activeExtendRight, setActiveExtendRight] = useState<boolean>(false);

  const instrumentInfo = SUPPORTED_INSTRUMENTS[instrument];

  // Save trend lines & positions to localStorage when changed
  useEffect(() => {
    try {
      localStorage.setItem(`muscab_trendlines_${instrument}`, JSON.stringify(trendLines));
    } catch (e) {
      console.warn('Failed saving trend lines:', e);
    }
  }, [trendLines, instrument]);

  useEffect(() => {
    try {
      localStorage.setItem(`muscab_positions_${instrument}`, JSON.stringify(positions));
    } catch (e) {
      console.warn('Failed saving positions:', e);
    }
  }, [positions, instrument]);

  // Load trend lines and positions when instrument changes
  useEffect(() => {
    try {
      const savedLines = localStorage.getItem(`muscab_trendlines_${instrument}`);
      const savedPos = localStorage.getItem(`muscab_positions_${instrument}`);
      setTrendLines(savedLines ? JSON.parse(savedLines) : []);
      setPositions(savedPos ? JSON.parse(savedPos) : []);
      setSelectedLineId(null);
      setSelectedPositionId(null);
      setHistory([]);
      setHistoryIndex(-1);
    } catch {
      setTrendLines([]);
      setPositions([]);
    }
  }, [instrument]);

  // Synchronize externally executed BUY/SELL positions directly onto the chart
  useEffect(() => {
    const handleAddPositionEvent = (e: Event) => {
      const customEvent = e as CustomEvent<PositionDrawing>;
      if (customEvent.detail && customEvent.detail.instrument === instrument) {
        setPositions((prev) => [customEvent.detail, ...prev.filter((p) => p.id !== customEvent.detail.id)]);
        setSelectedPositionId(customEvent.detail.id);
        setShowDrawings(true);
      }
    };
    window.addEventListener('muscab_add_position', handleAddPositionEvent);
    return () => {
      window.removeEventListener('muscab_add_position', handleAddPositionEvent);
    };
  }, [instrument]);

  // Push state to undo stack
  const pushHistory = useCallback(
    (newLines: TrendLine[], newPositions: PositionDrawing[]) => {
      setHistory((prev) => {
        const sliced = prev.slice(0, historyIndex + 1);
        return [...sliced, { trendLines: newLines, positions: newPositions }];
      });
      setHistoryIndex((prev) => prev + 1);
    },
    [historyIndex]
  );

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setTrendLines(history[newIndex].trendLines);
      setPositions(history[newIndex].positions);
    } else if (historyIndex === 0) {
      setHistoryIndex(-1);
      setTrendLines([]);
      setPositions([]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setTrendLines(history[newIndex].trendLines);
      setPositions(history[newIndex].positions);
    }
  };

  // Helper: Initial stop distance per instrument
  const getInitialStopDistance = (inst: InstrumentId, currentPrice: number): number => {
    if (inst === 'AUDUSD') return 0.0015; // 15 pips
    if (inst === 'XAUUSD') return 12.0;   // $12 gold move
    if (inst === 'NASDAQ') return 50.0;   // 50 index points
    return currentPrice * 0.005;
  };

  // Create new Long or Short Position
  const handleCreatePosition = (type: 'LONG' | 'SHORT', time: number, price: number) => {
    const stopDist = getInitialStopDistance(instrument, price);
    const intervalSec =
      candles.length > 1
        ? Math.max(60, candles[candles.length - 1].time - candles[candles.length - 2].time)
        : 300;
    const endTime = time + 16 * intervalSec;

    const isLong = type === 'LONG';
    const newPos: PositionDrawing = {
      id: `pos_${type.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      instrument,
      type,
      startTime: time,
      endTime,
      entryPrice: price,
      takeProfitPrice: isLong ? price + stopDist * 2 : price - stopDist * 2,
      stopLossPrice: isLong ? price - stopDist : price + stopDist,
      accountSize: 10000,
      riskPercent: 1,
    };

    const updatedPositions = [...positions, newPos];
    setPositions(updatedPositions);
    pushHistory(trendLines, updatedPositions);
    setSelectedPositionId(newPos.id);
    setSelectedLineId(null);
    setActiveTool('NONE');
    soundEffects.playAlertChime();
  };

  // Invert Position (Long <-> Short)
  const handleInvertPosition = (posId: string) => {
    setPositions((prev) => {
      const updated = prev.map((pos) => {
        if (pos.id !== posId) return pos;
        const isCurrentlyLong = pos.type === 'LONG';
        const newType: PositionType = isCurrentlyLong ? 'SHORT' : 'LONG';
        const rewardDist = Math.abs(pos.takeProfitPrice - pos.entryPrice);
        const riskDist = Math.abs(pos.stopLossPrice - pos.entryPrice);

        return {
          ...pos,
          type: newType,
          takeProfitPrice: newType === 'LONG' ? pos.entryPrice + rewardDist : pos.entryPrice - rewardDist,
          stopLossPrice: newType === 'LONG' ? pos.entryPrice - riskDist : pos.entryPrice + riskDist,
        };
      });
      pushHistory(trendLines, updated);
      return updated;
    });
    soundEffects.playAlertChime();
  };

  // Snap position entry to live mid price
  const handleSnapPositionToLive = (posId: string) => {
    if (!liveMidPrice || liveMidPrice <= 0) return;
    setPositions((prev) => {
      const updated = prev.map((pos) => {
        if (pos.id !== posId) return pos;
        const rewardDist = Math.abs(pos.takeProfitPrice - pos.entryPrice);
        const riskDist = Math.abs(pos.stopLossPrice - pos.entryPrice);
        const isLong = pos.type === 'LONG';

        return {
          ...pos,
          entryPrice: liveMidPrice,
          takeProfitPrice: isLong ? liveMidPrice + rewardDist : liveMidPrice - rewardDist,
          stopLossPrice: isLong ? liveMidPrice - riskDist : liveMidPrice + riskDist,
        };
      });
      pushHistory(trendLines, updated);
      return updated;
    });
    soundEffects.playAlertChime();
  };

  // Apply CRT Signal entry, TP, and SL to position
  const handleApplyCrtSignalToPosition = (posId: string) => {
    if (!signal || signal.entryPrice <= 0) return;
    setPositions((prev) => {
      const updated = prev.map((pos) => {
        if (pos.id !== posId) return pos;
        const isBuy = signal.verdict === 'BUY';
        const newType: PositionType = isBuy ? 'LONG' : 'SHORT';
        const tp = signal.takeProfit1 || (isBuy ? signal.entryPrice * 1.01 : signal.entryPrice * 0.99);
        const sl = signal.stopLoss || (isBuy ? signal.entryPrice * 0.995 : signal.entryPrice * 1.005);

        return {
          ...pos,
          type: newType,
          entryPrice: signal.entryPrice,
          takeProfitPrice: tp,
          stopLossPrice: sl,
        };
      });
      pushHistory(trendLines, updated);
      return updated;
    });
    soundEffects.playAlertChime();
  };

  // Delete Position
  const handleDeletePosition = (posId: string) => {
    const updated = positions.filter((p) => p.id !== posId);
    setPositions(updated);
    pushHistory(trendLines, updated);
    if (selectedPositionId === posId) {
      setSelectedPositionId(null);
    }
  };

  // Candle Countdown Timer Loop (Ticks every second)
  useEffect(() => {
    const updateCountdown = () => {
      const lastCandle = candles[candles.length - 1];
      const lastTime = lastCandle ? lastCandle.time : Math.floor(Date.now() / 1000);
      const remaining = getCandleCountdownSeconds(timeframe, lastTime);
      setCountdownSeconds(remaining);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [candles, timeframe]);

  // Initialize and update Lightweight Charts canvas
  useEffect(() => {
    if (!chartContainerRef.current) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const container = chartContainerRef.current;
    const chart = createChart(container, {
      width: container.clientWidth,
      height: height,
      layout: {
        background: { color: '#08090d' },
        textColor: '#94a3b8',
        fontSize: 12,
        fontFamily: "'JetBrains Mono', monospace",
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.03)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.03)' },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: 'rgba(245, 158, 11, 0.45)',
          width: 1,
          style: LineStyle.Dashed,
        },
        horzLine: {
          color: 'rgba(245, 158, 11, 0.45)',
          width: 1,
          style: LineStyle.Dashed,
        },
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.08)',
        scaleMargins: {
          top: 0.08,
          bottom: 0.12,
        },
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.08)',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
      priceFormat: {
        type: 'price',
        precision: instrumentInfo.decimals,
        minMove: instrumentInfo.pipSize,
      },
    });

    seriesRef.current = candlestickSeries;

    // Hover Crosshair tracking
    chart.subscribeCrosshairMove((param) => {
      if (!param || !param.time || !param.seriesData) {
        if (candles.length > 0) {
          const last = candles[candles.length - 1];
          const chg = Number((((last.close - last.open) / last.open) * 100).toFixed(2));
          setHoverData({
            open: last.open,
            high: last.high,
            low: last.low,
            close: last.close,
            change: chg,
          });
        }
        return;
      }

      const data = param.seriesData.get(candlestickSeries) as any;
      if (data && 'open' in data) {
        const chg = Number((((data.close - data.open) / data.open) * 100).toFixed(2));
        setHoverData({
          open: data.open,
          high: data.high,
          low: data.low,
          close: data.close,
          change: chg,
        });
      }
    });

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [instrument, height, instrumentInfo.decimals, instrumentInfo.pipSize]);

  // Set candles and redraw price lines
  useEffect(() => {
    if (!seriesRef.current || !chartRef.current || candles.length === 0) return;

    // Format and sort candles ascending by time
    const formattedData: CandlestickData<Time>[] = candles
      .slice()
      .sort((a, b) => a.time - b.time)
      .map((c) => ({
        time: (c.time as unknown) as Time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }));

    seriesRef.current.setData(formattedData);
    chartRef.current.timeScale().fitContent();

    // Initial hover
    const last = candles[candles.length - 1];
    setHoverData({
      open: last.open,
      high: last.high,
      low: last.low,
      close: last.close,
      change: Number((((last.close - last.open) / last.open) * 100).toFixed(2)),
    });
  }, [candles, instrumentInfo.decimals]);

  // Synchronize the latest active candle with live streaming mid price
  useEffect(() => {
    if (!seriesRef.current || !liveMidPrice || liveMidPrice <= 0 || candles.length === 0) return;
    const last = candles[candles.length - 1];
    const nowSec = Math.floor(Date.now() / 1000);

    let intervalSec = 300;
    if (timeframe === '15M') intervalSec = 900;
    else if (timeframe === '30M') intervalSec = 1800;
    else if (timeframe === '1H') intervalSec = 3600;
    else if (timeframe === '4H') intervalSec = 14400;
    else if (timeframe === '1D') intervalSec = 86400;
    else if (timeframe === '1W') intervalSec = 604800;
    else if (timeframe === '1M') intervalSec = 2592000;

    const currentBucket = Math.floor(nowSec / intervalSec) * intervalSec;
    const isNewBar = currentBucket > last.time && (nowSec - last.time) >= intervalSec;

    const barTime = isNewBar ? currentBucket : last.time;
    const openPrice = isNewBar ? liveMidPrice : last.open;
    const highPrice = isNewBar ? liveMidPrice : Math.max(last.high, liveMidPrice);
    const lowPrice = isNewBar ? liveMidPrice : Math.min(last.low, liveMidPrice);

    const updatedBar: CandlestickData<Time> = {
      time: (barTime as unknown) as Time,
      open: openPrice,
      high: highPrice,
      low: lowPrice,
      close: liveMidPrice,
    };
    try {
      seriesRef.current.update(updatedBar);
      setHoverData((prev) =>
        prev
          ? {
              ...prev,
              open: openPrice,
              high: highPrice,
              low: lowPrice,
              close: liveMidPrice,
              change: Number((((liveMidPrice - openPrice) / openPrice) * 100).toFixed(2)),
            }
          : null
      );
    } catch {
      // ignore
    }
  }, [liveMidPrice, timeframe, candles]);

  // Redraw price lines when signal or overlays change
  useEffect(() => {
    if (!seriesRef.current) return;
    const series = seriesRef.current;

    // Clear previous price lines
    priceLinesRef.current.forEach((line) => {
      try {
        series.removePriceLine(line);
      } catch (e) {
        // ignore
      }
    });
    priceLinesRef.current = [];

    // 1. Draw Liquidity Levels (PDH, PDL, PWH, PWL, PMH, PML)
    if (signal && showOverlays.liquidityLevels && signal.liquidityLevels) {
      const { pdh, pdl, pwh, pwl, pmh, pml } = signal.liquidityLevels;

      // Previous Day (Cyan)
      if (pdh > 0) {
        priceLinesRef.current.push(
          seriesRef.current.createPriceLine({
            price: pdh,
            color: '#06b6d4',
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: `PDH: ${pdh.toFixed(instrumentInfo.decimals)}`,
          })
        );
      }
      if (pdl > 0) {
        priceLinesRef.current.push(
          seriesRef.current.createPriceLine({
            price: pdl,
            color: '#06b6d4',
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: `PDL: ${pdl.toFixed(instrumentInfo.decimals)}`,
          })
        );
      }

      // Previous Week (Purple / Violet)
      if (pwh > 0) {
        priceLinesRef.current.push(
          seriesRef.current.createPriceLine({
            price: pwh,
            color: '#a855f7',
            lineWidth: 2,
            lineStyle: LineStyle.Solid,
            axisLabelVisible: true,
            title: `PWH: ${pwh.toFixed(instrumentInfo.decimals)}`,
          })
        );
      }
      if (pwl > 0) {
        priceLinesRef.current.push(
          seriesRef.current.createPriceLine({
            price: pwl,
            color: '#a855f7',
            lineWidth: 2,
            lineStyle: LineStyle.Solid,
            axisLabelVisible: true,
            title: `PWL: ${pwl.toFixed(instrumentInfo.decimals)}`,
          })
        );
      }

      // Previous Month (Amber / Gold)
      if (pmh > 0) {
        priceLinesRef.current.push(
          seriesRef.current.createPriceLine({
            price: pmh,
            color: '#f59e0b',
            lineWidth: 2,
            lineStyle: LineStyle.Solid,
            axisLabelVisible: true,
            title: `PMH: ${pmh.toFixed(instrumentInfo.decimals)}`,
          })
        );
      }
      if (pml > 0) {
        priceLinesRef.current.push(
          seriesRef.current.createPriceLine({
            price: pml,
            color: '#f59e0b',
            lineWidth: 2,
            lineStyle: LineStyle.Solid,
            axisLabelVisible: true,
            title: `PML: ${pml.toFixed(instrumentInfo.decimals)}`,
          })
        );
      }
    }

    // 2. Draw CRT Key Levels (KL)
    if (signal && showOverlays.keyLevels && signal.weekly.keyLevelPrice > 0) {
      priceLinesRef.current.push(
        seriesRef.current.createPriceLine({
          price: signal.weekly.keyLevelPrice,
          color: '#eab308',
          lineWidth: 2,
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
          title: 'WEEKLY KL',
        })
      );
    }

    // 3. Draw Trade Levels (Entry, SL, TP)
    if (signal && showOverlays.tradeLevels && signal.status === 'CONFIRMED_SIGNAL') {
      priceLinesRef.current.push(
        seriesRef.current.createPriceLine({
          price: signal.entryPrice,
          color: signal.verdict === 'BUY' ? '#10b981' : '#ef4444',
          lineWidth: 2,
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
          title: `${signal.verdict} ENTRY`,
        })
      );

      priceLinesRef.current.push(
        seriesRef.current.createPriceLine({
          price: signal.stopLoss,
          color: '#ef4444',
          lineWidth: 2,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: 'STOP LOSS',
        })
      );

      priceLinesRef.current.push(
        seriesRef.current.createPriceLine({
          price: signal.takeProfit1,
          color: '#10b981',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `TP1 (1:${signal.riskReward1})`,
        })
      );

      priceLinesRef.current.push(
        seriesRef.current.createPriceLine({
          price: signal.takeProfit2,
          color: '#10b981',
          lineWidth: 2,
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
          title: `TP2 (${signal.targetLiquidityName || 'KL'})`,
        })
      );
    }
  }, [candles, signal, showOverlays, instrumentInfo.decimals]);

  // Convert Time & Price into Chart Pixel Coordinates
  const getCoordinates = useCallback(
    (time: number, price: number): { x: number; y: number } | null => {
      if (!chartRef.current || !seriesRef.current) return null;
      try {
        const x = chartRef.current.timeScale().timeToCoordinate((time as unknown) as Time);
        const y = seriesRef.current.priceToCoordinate(price);
        if (x === null || y === null) return null;
        return { x, y };
      } catch {
        return null;
      }
    },
    []
  );

  // Convert Screen Coordinates (x, y) into Time & Price
  const getPointFromScreen = useCallback(
    (x: number, y: number): { time: number; price: number } | null => {
      if (!chartRef.current || !seriesRef.current || candles.length === 0) return null;
      try {
        const timeVal = chartRef.current.timeScale().coordinateToTime(x);
        const priceVal = seriesRef.current.coordinateToPrice(y);

        let resolvedTime = typeof timeVal === 'number' ? timeVal : 0;
        if (!resolvedTime) {
          // Snap to nearest candle
          const idx = Math.min(
            candles.length - 1,
            Math.max(0, Math.floor((x / (chartContainerRef.current?.clientWidth || 800)) * candles.length))
          );
          resolvedTime = candles[idx]?.time || Math.floor(Date.now() / 1000);
        }

        const resolvedPrice = typeof priceVal === 'number' ? priceVal : candles[candles.length - 1]?.close || 1000;
        return { time: resolvedTime, price: resolvedPrice };
      } catch {
        return null;
      }
    },
    [candles]
  );

  // Click on SVG Drawing Canvas to Create Trend Lines or Long/Short Positions
  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!chartContainerRef.current) return;

    const rect = chartContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pt = getPointFromScreen(x, y);
    if (!pt) return;

    // 1. Create Long Position
    if (activeTool === 'LONG_POSITION') {
      handleCreatePosition('LONG', pt.time, pt.price);
      return;
    }

    // 2. Create Short Position
    if (activeTool === 'SHORT_POSITION') {
      handleCreatePosition('SHORT', pt.time, pt.price);
      return;
    }

    // 3. Create Trend Line
    if (activeTool === 'TREND_LINE') {
      if (drawStep === 0) {
        setStartPoint({ time: pt.time, price: pt.price, x, y });
        setDrawStep(1);
      } else {
        if (!startPoint) return;
        const newLine: TrendLine = {
          id: `tl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          instrument,
          startTime: startPoint.time,
          startPrice: startPoint.price,
          endTime: pt.time,
          endPrice: pt.price,
          color: activeColor,
          width: activeWidth,
          style: activeStyle,
          extendRight: activeExtendRight,
        };

        const updated = [...trendLines, newLine];
        setTrendLines(updated);
        pushHistory(updated, positions);
        setSelectedLineId(newLine.id);
        setSelectedPositionId(null);

        // Reset drawing state
        setStartPoint(null);
        setDrawStep(0);
        setActiveTool('NONE');
        soundEffects.playAlertChime();
      }
      return;
    }

    // If clicking on empty canvas without drawing mode, deselect
    setSelectedLineId(null);
    setSelectedPositionId(null);
  };

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!chartContainerRef.current) return;
    const rect = chartContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCurrentMousePoint({ x, y });

    // Handle Trend Line Dragging
    if (dragState) {
      setTrendLines((prev) =>
        prev.map((line) => {
          if (line.id !== dragState.lineId) return line;

          if (dragState.type === 'START_HANDLE') {
            const pt = getPointFromScreen(x, y);
            if (!pt) return line;
            return { ...line, startTime: pt.time, startPrice: pt.price };
          } else if (dragState.type === 'END_HANDLE') {
            const pt = getPointFromScreen(x, y);
            if (!pt) return line;
            return { ...line, endTime: pt.time, endPrice: pt.price };
          } else {
            const startPt = getPointFromScreen(x, y);
            if (!startPt) return line;
            const priceDiff = startPt.price - dragState.initialStartPrice;
            return {
              ...line,
              startPrice: dragState.initialStartPrice + priceDiff,
              endPrice: dragState.initialEndPrice + priceDiff,
            };
          }
        })
      );
    }

    // Handle Long/Short Position Dragging
    if (positionDrag) {
      const pt = getPointFromScreen(x, y);
      if (pt) {
        setPositions((prev) =>
          prev.map((pos) => {
            if (pos.id !== positionDrag.id) return pos;

            if (positionDrag.part === 'TP_HANDLE') {
              return { ...pos, takeProfitPrice: pt.price };
            } else if (positionDrag.part === 'SL_HANDLE') {
              return { ...pos, stopLossPrice: pt.price };
            } else if (positionDrag.part === 'ENTRY_HANDLE') {
              const diff = pt.price - positionDrag.initialEntry;
              return {
                ...pos,
                entryPrice: pt.price,
                takeProfitPrice: positionDrag.initialTP + diff,
                stopLossPrice: positionDrag.initialSL + diff,
              };
            } else if (positionDrag.part === 'WIDTH_HANDLE') {
              return {
                ...pos,
                endTime: Math.max(pos.startTime + 60, pt.time),
              };
            } else if (positionDrag.part === 'BODY') {
              const priceDiff = pt.price - positionDrag.initialEntry;
              const timeDiff = pt.time - positionDrag.initialStartTime;
              return {
                ...pos,
                entryPrice: positionDrag.initialEntry + priceDiff,
                takeProfitPrice: positionDrag.initialTP + priceDiff,
                stopLossPrice: positionDrag.initialSL + priceDiff,
                startTime: positionDrag.initialStartTime + timeDiff,
                endTime: positionDrag.initialEndTime + timeDiff,
              };
            }
            return pos;
          })
        );
      }
    }
  };

  const handleMouseUp = () => {
    if (dragState) {
      pushHistory(trendLines, positions);
      setDragState(null);
    }
    if (positionDrag) {
      pushHistory(trendLines, positions);
      setPositionDrag(null);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedLineId) {
      const updated = trendLines.filter((l) => l.id !== selectedLineId);
      setTrendLines(updated);
      pushHistory(updated, positions);
      setSelectedLineId(null);
    } else if (selectedPositionId) {
      handleDeletePosition(selectedPositionId);
    }
  };

  const handleClearAll = () => {
    setTrendLines([]);
    setPositions([]);
    pushHistory([], []);
    setSelectedLineId(null);
    setSelectedPositionId(null);
  };

  const selectedLine = trendLines.find((l) => l.id === selectedLineId);
  const selectedPosition = positions.find((p) => p.id === selectedPositionId);

  return (
    <div className="flex flex-col rounded-xl border border-neutral-800 bg-[#090a0e] overflow-hidden shadow-2xl">
      {/* Top Bar: Ticker, Timeframes & Countdown */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-b border-neutral-800/80 bg-[#0c0d12]">
        {/* Left: Ticker & Timeframe Tabs */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm text-white tracking-wide">
              {instrumentInfo.ticker}
            </span>
            <span className="text-[11px] text-amber-400 font-mono">
              {instrumentInfo.category}
            </span>
          </div>

          <div className="h-4 w-[1px] bg-neutral-800" />

          {/* Timeframe Switcher: 1M, 1W, 1D, 4H, 1H, 30M, 15M, 5M */}
          <div className="flex items-center bg-[#13151c] rounded-lg p-0.5 border border-neutral-800/80 overflow-x-auto">
            {(['1M', '1W', '1D', '4H', '1H', '30M', '15M', '5M'] as Timeframe[]).map((tf) => {
              const labelMap: Record<Timeframe, string> = {
                '1M': 'Monthly',
                '1W': 'Weekly',
                '1D': 'Daily',
                '4H': '4 Hour',
                '1H': '1 Hour',
                '30M': '30 Min',
                '15M': '15 Min',
                '5M': '5 Min',
              };
              const isActive = timeframe === tf;
              return (
                <button
                  key={tf}
                  onClick={() => onTimeframeChange(tf)}
                  className={`px-2.5 py-1 text-xs font-mono font-medium rounded-md transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold shadow-md'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-neutral-800/40'
                  }`}
                  title={`${labelMap[tf]} (${tf}) Candle Timeframe`}
                >
                  {tf}
                </button>
              );
            })}
          </div>

          {/* Candle Countdown Timer */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-[11px]">
            <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>{timeframe} Close in:</span>
            <strong className="text-white font-bold tabular-nums">
              {formatCountdown(countdownSeconds)}
            </strong>
          </div>

          {/* External Link directly to TradingView.com */}
          <a
            href={`https://www.tradingview.com/chart/?symbol=${
              instrument === 'AUDUSD'
                ? 'OANDA%3AAUDUSD'
                : instrument === 'XAUUSD'
                ? 'OANDA%3AXAUUSD'
                : 'NASDAQ%3ANDX'
            }`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:flex items-center gap-1 px-2 py-1 text-[11px] font-mono rounded-md bg-blue-900/20 hover:bg-blue-900/40 border border-blue-500/30 text-blue-300 hover:text-white transition-colors"
            title="Open symbol chart directly on TradingView.com"
          >
            <span>TradingView</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Center: Live OHLC Display */}
        {hoverData && (
          <div className="hidden lg:flex items-center gap-4 text-xs font-mono text-slate-400">
            <div>
              <span className="text-slate-500 mr-1">O</span>
              <span className="text-slate-200 tabular-nums">
                {hoverData.open.toFixed(instrumentInfo.decimals)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 mr-1">H</span>
              <span className="text-emerald-400 tabular-nums">
                {hoverData.high.toFixed(instrumentInfo.decimals)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 mr-1">L</span>
              <span className="text-rose-400 tabular-nums">
                {hoverData.low.toFixed(instrumentInfo.decimals)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 mr-1">C</span>
              <span
                className={`tabular-nums font-semibold ${
                  hoverData.close >= hoverData.open ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {hoverData.close.toFixed(instrumentInfo.decimals)}
              </span>
            </div>
            <div>
              <span
                className={`tabular-nums px-1.5 py-0.5 rounded text-[11px] ${
                  hoverData.change >= 0
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}
              >
                {hoverData.change >= 0 ? '+' : ''}
                {hoverData.change}%
              </span>
            </div>
          </div>
        )}

        {/* Right: Drawing Tools (Trend Line, Long Position, Short Position) & Overlays */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Trend Line Drawing Toggle */}
          <button
            onClick={() => {
              setActiveTool(activeTool === 'TREND_LINE' ? 'NONE' : 'TREND_LINE');
              setDrawStep(0);
              setStartPoint(null);
              setSelectedPositionId(null);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded-lg border transition-all ${
              activeTool === 'TREND_LINE'
                ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.4)] animate-pulse'
                : 'bg-neutral-900 border-neutral-700 text-slate-300 hover:bg-neutral-800'
            }`}
            title="Manual Trend Line Drawing Tool (Click start, click end, drag anytime)"
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>{activeTool === 'TREND_LINE' ? (drawStep === 0 ? 'Click Start' : 'Click End') : 'Trend Line'}</span>
          </button>

          {/* Long Position Drawing Tool */}
          <button
            onClick={() => {
              setActiveTool(activeTool === 'LONG_POSITION' ? 'NONE' : 'LONG_POSITION');
              setSelectedLineId(null);
              setSelectedPositionId(null);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded-lg border transition-all ${
              activeTool === 'LONG_POSITION'
                ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.4)] animate-pulse'
                : 'bg-neutral-900 border-neutral-700 text-emerald-400 hover:bg-neutral-800'
            }`}
            title="Long Position Tool: Click anywhere on chart to place a Buy order setup with risk/reward calculation"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{activeTool === 'LONG_POSITION' ? 'Click Chart to Place' : 'Long Position'}</span>
          </button>

          {/* Short Position Drawing Tool */}
          <button
            onClick={() => {
              setActiveTool(activeTool === 'SHORT_POSITION' ? 'NONE' : 'SHORT_POSITION');
              setSelectedLineId(null);
              setSelectedPositionId(null);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded-lg border transition-all ${
              activeTool === 'SHORT_POSITION'
                ? 'bg-rose-500 text-white font-bold border-rose-400 shadow-[0_0_12px_rgba(239,68,68,0.4)] animate-pulse'
                : 'bg-neutral-900 border-neutral-700 text-rose-400 hover:bg-neutral-800'
            }`}
            title="Short Position Tool: Click anywhere on chart to place a Sell order setup with risk/reward calculation"
          >
            <TrendingDown className="w-3.5 h-3.5" />
            <span>{activeTool === 'SHORT_POSITION' ? 'Click Chart to Place' : 'Short Position'}</span>
          </button>

          <div className="h-4 w-[1px] bg-neutral-800 hidden sm:block" />

          {/* Liquidity Lines Toggle (PDH, PDL, PWH, PWL, PMH, PML) */}
          <button
            onClick={() =>
              setShowOverlays((prev) => ({
                ...prev,
                liquidityLevels: !prev.liquidityLevels,
              }))
            }
            className={`px-2 py-1 text-[11px] font-mono rounded border transition-colors ${
              showOverlays.liquidityLevels
                ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-300 font-semibold'
                : 'bg-neutral-900 border-neutral-800 text-slate-500'
            }`}
            title="Toggle PDH, PDL, PWH, PWL, PMH, PML Liquidity Lines"
          >
            PDH/PDL
          </button>

          {/* Key Levels Toggle */}
          <button
            onClick={() =>
              setShowOverlays((prev) => ({ ...prev, keyLevels: !prev.keyLevels }))
            }
            className={`px-2 py-1 text-[11px] font-mono rounded border transition-colors ${
              showOverlays.keyLevels
                ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
                : 'bg-neutral-900 border-neutral-800 text-slate-500'
            }`}
            title="Toggle Weekly / 1H Key Level Lines"
          >
            KL
          </button>

          {/* Trade Levels Toggle */}
          <button
            onClick={() =>
              setShowOverlays((prev) => ({ ...prev, tradeLevels: !prev.tradeLevels }))
            }
            className={`px-2 py-1 text-[11px] font-mono rounded border transition-colors ${
              showOverlays.tradeLevels
                ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                : 'bg-neutral-900 border-neutral-800 text-slate-500'
            }`}
            title="Toggle Entry, SL, TP1, TP2, TP3"
          >
            Trade Levels
          </button>

          {/* Show/Hide Drawings Toggle */}
          <button
            onClick={() => setShowDrawings(!showDrawings)}
            className={`p-1.5 rounded text-slate-400 hover:text-slate-200 transition-colors ${
              showDrawings ? 'text-amber-400' : 'text-slate-600'
            }`}
            title={showDrawings ? 'Hide drawings' : 'Show drawings'}
          >
            {showDrawings ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>

          {/* Fit View */}
          <button
            onClick={() => chartRef.current?.timeScale().fitContent()}
            className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-neutral-800 transition-colors"
            title="Fit content to view"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Position Inspector Toolbar (Visible when Long/Short position is selected) */}
      {selectedPosition && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 bg-[#0e121b] border-b border-neutral-800 text-xs font-mono animate-in fade-in">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`font-bold flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs ${
                selectedPosition.type === 'LONG'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
              }`}
            >
              {selectedPosition.type === 'LONG' ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              <span>{selectedPosition.type} POSITION</span>
            </span>

            <span className="text-amber-400 font-extrabold flex items-center gap-1">
              <span>Risk/Reward:</span>
              <strong className="text-white text-sm">
                1:
                {(
                  Math.abs(selectedPosition.takeProfitPrice - selectedPosition.entryPrice) /
                  Math.max(0.000001, Math.abs(selectedPosition.entryPrice - selectedPosition.stopLossPrice))
                ).toFixed(2)}
              </strong>
            </span>

            <span className="text-slate-400">
              Entry: <strong className="text-white font-bold">{selectedPosition.entryPrice.toFixed(instrumentInfo.decimals)}</strong>
            </span>
            <span className="text-emerald-400">
              TP: <strong className="text-emerald-300 font-bold">{selectedPosition.takeProfitPrice.toFixed(instrumentInfo.decimals)}</strong>
            </span>
            <span className="text-rose-400">
              SL: <strong className="text-rose-300 font-bold">{selectedPosition.stopLossPrice.toFixed(instrumentInfo.decimals)}</strong>
            </span>

            {/* Invert Long <-> Short */}
            <button
              onClick={() => handleInvertPosition(selectedPosition.id)}
              className="flex items-center gap-1 px-2 py-1 rounded bg-neutral-900 hover:bg-neutral-800 text-slate-300 border border-neutral-700 text-[11px] transition-colors"
              title="Invert position between Long and Short"
            >
              <ArrowUpDown className="w-3 h-3 text-amber-400" />
              <span>Invert Setup</span>
            </button>

            {/* Snap to Live Price */}
            {liveMidPrice && liveMidPrice > 0 && (
              <button
                onClick={() => handleSnapPositionToLive(selectedPosition.id)}
                className="flex items-center gap-1 px-2 py-1 rounded bg-neutral-900 hover:bg-neutral-800 text-slate-300 border border-neutral-700 text-[11px] transition-colors"
                title="Align entry with live streaming market mid-price"
              >
                <span>Snap to Live ({liveMidPrice.toFixed(instrumentInfo.decimals)})</span>
              </button>
            )}

            {/* Match CRT Signal */}
            {signal && signal.entryPrice > 0 && (
              <button
                onClick={() => handleApplyCrtSignalToPosition(selectedPosition.id)}
                className="flex items-center gap-1 px-2 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 text-[11px] font-bold transition-colors"
                title={`Match active CRT Signal: ${signal.verdict} Entry ${signal.entryPrice}`}
              >
                <Target className="w-3 h-3 text-amber-400" />
                <span>Match CRT Signal ({signal.verdict})</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleUndo}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-neutral-800"
              title="Undo"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleRedo}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-neutral-800"
              title="Redo"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => handleDeletePosition(selectedPosition.id)}
              className="flex items-center gap-1 px-2 py-1 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              <span>Delete Position</span>
            </button>

            <button
              onClick={() => setSelectedPositionId(null)}
              className="px-2 py-1 rounded bg-neutral-900 text-slate-400 hover:text-white border border-neutral-800 text-[11px]"
            >
              Deselect
            </button>
          </div>
        </div>
      )}

      {/* Trend Line Drawing Toolbar (Visible when Trend Line is selected or in drawing mode) */}
      {(isDrawingMode || selectedLine) && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 bg-[#10121a] border-b border-neutral-800 text-xs font-mono">
          <div className="flex items-center gap-3">
            <span className="text-amber-400 font-bold flex items-center gap-1">
              <PenTool className="w-3 h-3" />
              {selectedLine ? 'Edit Selected Trend Line' : 'Drawing New Trend Line'}
            </span>

            {/* Color Palette */}
            <div className="flex items-center gap-1.5">
              {['#f59e0b', '#10b981', '#06b6d4', '#ef4444', '#ffffff', '#a855f7'].map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setActiveColor(c);
                    if (selectedLineId) {
                      setTrendLines((prev) =>
                        prev.map((l) => (l.id === selectedLineId ? { ...l, color: c } : l))
                      );
                    }
                  }}
                  className={`w-4 h-4 rounded-full border transition-transform ${
                    activeColor === c ? 'scale-125 border-white shadow-sm' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                  title={`Color: ${c}`}
                />
              ))}
            </div>

            {/* Thickness Selector */}
            <div className="flex items-center gap-1 bg-neutral-900 p-0.5 rounded border border-neutral-800">
              {[1, 2, 3].map((w) => (
                <button
                  key={w}
                  onClick={() => {
                    setActiveWidth(w);
                    if (selectedLineId) {
                      setTrendLines((prev) =>
                        prev.map((l) => (l.id === selectedLineId ? { ...l, width: w } : l))
                      );
                    }
                  }}
                  className={`px-1.5 py-0.5 text-[11px] rounded ${
                    activeWidth === w ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400'
                  }`}
                >
                  {w}px
                </button>
              ))}
            </div>

            {/* Style Selector */}
            <div className="flex items-center gap-1 bg-neutral-900 p-0.5 rounded border border-neutral-800">
              {(['solid', 'dashed', 'dotted'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => {
                    setActiveStyle(st);
                    if (selectedLineId) {
                      setTrendLines((prev) =>
                        prev.map((l) => (l.id === selectedLineId ? { ...l, style: st } : l))
                      );
                    }
                  }}
                  className={`px-2 py-0.5 text-[10px] uppercase rounded ${
                    activeStyle === st ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Extend Ray Toggle */}
            <button
              onClick={() => {
                const next = !activeExtendRight;
                setActiveExtendRight(next);
                if (selectedLineId) {
                  setTrendLines((prev) =>
                    prev.map((l) => (l.id === selectedLineId ? { ...l, extendRight: next } : l))
                  );
                }
              }}
              className={`px-2 py-0.5 rounded text-[11px] border ${
                activeExtendRight
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                  : 'bg-neutral-900 border-neutral-800 text-slate-400'
              }`}
            >
              Extend Right Ray
            </button>
          </div>

          {/* Action buttons: Undo, Redo, Delete, Clear All */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleUndo}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-neutral-800"
              title="Undo last line action"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleRedo}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-neutral-800"
              title="Redo"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>

            {selectedLine && (
              <button
                onClick={handleDeleteSelected}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30"
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete Line</span>
              </button>
            )}

            {(trendLines.length > 0 || positions.length > 0) && (
              <button
                onClick={handleClearAll}
                className="px-2 py-0.5 rounded bg-neutral-900 text-slate-400 hover:text-rose-400 border border-neutral-800 text-[11px]"
              >
                Clear All ({trendLines.length + positions.length})
              </button>
            )}
          </div>
        </div>
      )}

      {/* Chart Canvas & SVG Drawing Layer */}
      <div
        className="relative w-full select-none"
        style={{ height: `${height}px` }}
        onMouseUp={handleMouseUp}
      >
        <div ref={chartContainerRef} className="w-full h-full" />

        {/* Interactive SVG Drawing Overlay */}
        {showDrawings && (
          <svg
            className={`absolute inset-0 w-full h-full ${
              activeTool !== 'NONE' ? 'cursor-crosshair pointer-events-auto' : 'pointer-events-none'
            }`}
            onClick={handleSvgClick}
            onMouseMove={handleSvgMouseMove}
          >
            {/* Render Long & Short Positions */}
            {positions.map((pos) => {
              const isSelected = pos.id === selectedPositionId;
              const isLong = pos.type === 'LONG';
              const dec = instrumentInfo.decimals;
              const pipSize = instrumentInfo.pipSize;

              const pStart = getCoordinates(pos.startTime, pos.entryPrice);
              const pEnd = getCoordinates(pos.endTime, pos.entryPrice);
              const pTP = getCoordinates(pos.startTime, pos.takeProfitPrice);
              const pSL = getCoordinates(pos.startTime, pos.stopLossPrice);

              const x1 = pStart ? pStart.x : 100;
              const x2 = pEnd ? Math.max(x1 + 60, pEnd.x) : x1 + 180;
              const boxWidth = Math.max(60, x2 - x1);
              const yEntry = pStart ? pStart.y : 220;
              const yTP = pTP ? pTP.y : (isLong ? yEntry - 80 : yEntry + 80);
              const ySL = pSL ? pSL.y : (isLong ? yEntry + 50 : yEntry - 50);

              // For LONG: Profit box is above entry, Stop box is below entry
              // For SHORT: Stop box is above entry, Profit box is below entry
              const targetTop = isLong ? Math.min(yTP, yEntry) : Math.min(yEntry, yTP);
              const targetHeight = Math.max(6, Math.abs(yTP - yEntry));

              const stopTop = isLong ? Math.min(yEntry, ySL) : Math.min(ySL, yEntry);
              const stopHeight = Math.max(6, Math.abs(ySL - yEntry));

              const riskDist = Math.abs(pos.entryPrice - pos.stopLossPrice);
              const rewardDist = Math.abs(pos.takeProfitPrice - pos.entryPrice);
              const rr = (rewardDist / Math.max(0.000001, riskDist)).toFixed(2);
              const rewardPips = (rewardDist / pipSize).toFixed(1);
              const riskPips = (riskDist / pipSize).toFixed(1);

              return (
                <g key={pos.id} className="pointer-events-auto">
                  {/* Target (Profit) Shaded Box */}
                  <rect
                    x={x1}
                    y={targetTop}
                    width={boxWidth}
                    height={targetHeight}
                    fill="rgba(16, 185, 129, 0.22)"
                    stroke="rgba(16, 185, 129, 0.85)"
                    strokeWidth={isSelected ? 2 : 1}
                    className="cursor-move"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPositionId(pos.id);
                      setSelectedLineId(null);
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setSelectedPositionId(pos.id);
                      setSelectedLineId(null);
                      setPositionDrag({
                        id: pos.id,
                        part: 'BODY',
                        originX: e.clientX,
                        originY: e.clientY,
                        initialEntry: pos.entryPrice,
                        initialTP: pos.takeProfitPrice,
                        initialSL: pos.stopLossPrice,
                        initialStartTime: pos.startTime,
                        initialEndTime: pos.endTime,
                      });
                    }}
                  />

                  {/* Target Label */}
                  <text
                    x={x1 + 8}
                    y={targetTop + Math.min(16, targetHeight - 4)}
                    fill="#10b981"
                    fontSize="11"
                    fontFamily="JetBrains Mono, monospace"
                    fontWeight="bold"
                    className="select-none pointer-events-none"
                  >
                    Target: {pos.takeProfitPrice.toFixed(dec)} (+{rewardPips} pips)
                  </text>

                  {/* Stop Loss (Risk) Shaded Box */}
                  <rect
                    x={x1}
                    y={stopTop}
                    width={boxWidth}
                    height={stopHeight}
                    fill="rgba(239, 68, 68, 0.22)"
                    stroke="rgba(239, 68, 68, 0.85)"
                    strokeWidth={isSelected ? 2 : 1}
                    className="cursor-move"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPositionId(pos.id);
                      setSelectedLineId(null);
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setSelectedPositionId(pos.id);
                      setSelectedLineId(null);
                      setPositionDrag({
                        id: pos.id,
                        part: 'BODY',
                        originX: e.clientX,
                        originY: e.clientY,
                        initialEntry: pos.entryPrice,
                        initialTP: pos.takeProfitPrice,
                        initialSL: pos.stopLossPrice,
                        initialStartTime: pos.startTime,
                        initialEndTime: pos.endTime,
                      });
                    }}
                  />

                  {/* Stop Loss Label */}
                  <text
                    x={x1 + 8}
                    y={stopTop + Math.max(14, stopHeight - 6)}
                    fill="#ef4444"
                    fontSize="11"
                    fontFamily="JetBrains Mono, monospace"
                    fontWeight="bold"
                    className="select-none pointer-events-none"
                  >
                    Stop: {pos.stopLossPrice.toFixed(dec)} (-{riskPips} pips)
                  </text>

                  {/* Middle Entry Line */}
                  <line
                    x1={x1}
                    y1={yEntry}
                    x2={x1 + boxWidth}
                    y2={yEntry}
                    stroke="#ffffff"
                    strokeWidth={2}
                    strokeDasharray="4,4"
                    className="pointer-events-none"
                  />

                  {/* Entry Label */}
                  <text
                    x={x1 + 8}
                    y={yEntry - 4}
                    fill="#ffffff"
                    fontSize="11"
                    fontFamily="JetBrains Mono, monospace"
                    fontWeight="bold"
                    className="select-none pointer-events-none"
                  >
                    Entry: {pos.entryPrice.toFixed(dec)}
                  </text>

                  {/* Centered R:R Ratio Badge */}
                  <g
                    transform={`translate(${x1 + boxWidth / 2 - 65}, ${Math.max(6, Math.min(targetTop, stopTop) - 22)})`}
                    className="pointer-events-none select-none"
                  >
                    <rect
                      width={130}
                      height={18}
                      rx={4}
                      fill={isLong ? '#064e3b' : '#881337'}
                      stroke={isLong ? '#10b981' : '#ef4444'}
                      strokeWidth={1}
                      opacity={0.95}
                    />
                    <text
                      x={65}
                      y={13}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="10"
                      fontFamily="JetBrains Mono, monospace"
                      fontWeight="bold"
                    >
                      {pos.type} · R:R 1:{rr}
                    </text>
                  </g>

                  {/* Interactive Handles when Selected */}
                  {isSelected && (
                    <>
                      {/* TP Handle */}
                      <circle
                        cx={x1 + boxWidth / 2}
                        cy={yTP}
                        r={6}
                        fill="#10b981"
                        stroke="#ffffff"
                        strokeWidth={2}
                        className="cursor-ns-resize hover:scale-125 transition-transform"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setPositionDrag({
                            id: pos.id,
                            part: 'TP_HANDLE',
                            originX: e.clientX,
                            originY: e.clientY,
                            initialEntry: pos.entryPrice,
                            initialTP: pos.takeProfitPrice,
                            initialSL: pos.stopLossPrice,
                            initialStartTime: pos.startTime,
                            initialEndTime: pos.endTime,
                          });
                        }}
                      />

                      {/* SL Handle */}
                      <circle
                        cx={x1 + boxWidth / 2}
                        cy={ySL}
                        r={6}
                        fill="#ef4444"
                        stroke="#ffffff"
                        strokeWidth={2}
                        className="cursor-ns-resize hover:scale-125 transition-transform"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setPositionDrag({
                            id: pos.id,
                            part: 'SL_HANDLE',
                            originX: e.clientX,
                            originY: e.clientY,
                            initialEntry: pos.entryPrice,
                            initialTP: pos.takeProfitPrice,
                            initialSL: pos.stopLossPrice,
                            initialStartTime: pos.startTime,
                            initialEndTime: pos.endTime,
                          });
                        }}
                      />

                      {/* Entry Handle */}
                      <circle
                        cx={x1 + boxWidth / 2}
                        cy={yEntry}
                        r={6}
                        fill="#f59e0b"
                        stroke="#ffffff"
                        strokeWidth={2}
                        className="cursor-ns-resize hover:scale-125 transition-transform"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setPositionDrag({
                            id: pos.id,
                            part: 'ENTRY_HANDLE',
                            originX: e.clientX,
                            originY: e.clientY,
                            initialEntry: pos.entryPrice,
                            initialTP: pos.takeProfitPrice,
                            initialSL: pos.stopLossPrice,
                            initialStartTime: pos.startTime,
                            initialEndTime: pos.endTime,
                          });
                        }}
                      />

                      {/* Width Handle on Right Edge */}
                      <rect
                        x={x1 + boxWidth - 3}
                        y={yEntry - 12}
                        width={6}
                        height={24}
                        rx={3}
                        fill="#38bdf8"
                        stroke="#ffffff"
                        strokeWidth={1.5}
                        className="cursor-ew-resize hover:scale-125 transition-transform"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setPositionDrag({
                            id: pos.id,
                            part: 'WIDTH_HANDLE',
                            originX: e.clientX,
                            originY: e.clientY,
                            initialEntry: pos.entryPrice,
                            initialTP: pos.takeProfitPrice,
                            initialSL: pos.stopLossPrice,
                            initialStartTime: pos.startTime,
                            initialEndTime: pos.endTime,
                          });
                        }}
                      />
                    </>
                  )}
                </g>
              );
            })}

            {/* Render saved trend lines */}
            {trendLines.map((line) => {
              const p1 = getCoordinates(line.startTime, line.startPrice);
              const p2 = getCoordinates(line.endTime, line.endPrice);
              if (!p1 || !p2) return null;

              const isSelected = line.id === selectedLineId;
              const strokeDash =
                line.style === 'dashed' ? '6,6' : line.style === 'dotted' ? '2,4' : undefined;

              // Calculate extended ray if enabled
              let x2 = p2.x;
              let y2 = p2.y;
              if (line.extendRight && chartContainerRef.current) {
                const w = chartContainerRef.current.clientWidth;
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                if (Math.abs(dx) > 0.001) {
                  const slope = dy / dx;
                  x2 = w;
                  y2 = p1.y + slope * (w - p1.x);
                }
              }

              return (
                <g key={line.id} className="pointer-events-auto">
                  {/* Invisible thicker stroke for easy clicking/dragging */}
                  <line
                    x1={p1.x}
                    y1={p1.y}
                    x2={x2}
                    y2={y2}
                    stroke="transparent"
                    strokeWidth={16}
                    className="cursor-move"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedLineId(line.id);
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setSelectedLineId(line.id);
                      setDragState({
                        type: 'BODY',
                        lineId: line.id,
                        originX: e.clientX,
                        originY: e.clientY,
                        initialStartPrice: line.startPrice,
                        initialEndPrice: line.endPrice,
                        initialStartTime: line.startTime,
                        initialEndTime: line.endTime,
                      });
                    }}
                  />

                  {/* Visible Trend Line */}
                  <line
                    x1={p1.x}
                    y1={p1.y}
                    x2={x2}
                    y2={y2}
                    stroke={line.color}
                    strokeWidth={line.width}
                    strokeDasharray={strokeDash}
                    strokeLinecap="round"
                    className="transition-all"
                  />

                  {/* Handles for selected line */}
                  {isSelected && (
                    <>
                      {/* Start Handle */}
                      <circle
                        cx={p1.x}
                        cy={p1.y}
                        r={6}
                        fill={line.color}
                        stroke="#ffffff"
                        strokeWidth={2}
                        className="cursor-pointer hover:scale-125 transition-transform"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setDragState({
                            type: 'START_HANDLE',
                            lineId: line.id,
                            originX: e.clientX,
                            originY: e.clientY,
                            initialStartPrice: line.startPrice,
                            initialEndPrice: line.endPrice,
                            initialStartTime: line.startTime,
                            initialEndTime: line.endTime,
                          });
                        }}
                      />

                      {/* End Handle */}
                      <circle
                        cx={p2.x}
                        cy={p2.y}
                        r={6}
                        fill={line.color}
                        stroke="#ffffff"
                        strokeWidth={2}
                        className="cursor-pointer hover:scale-125 transition-transform"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setDragState({
                            type: 'END_HANDLE',
                            lineId: line.id,
                            originX: e.clientX,
                            originY: e.clientY,
                            initialStartPrice: line.startPrice,
                            initialEndPrice: line.endPrice,
                            initialStartTime: line.startTime,
                            initialEndTime: line.endTime,
                          });
                        }}
                      />
                    </>
                  )}
                </g>
              );
            })}

            {/* Live Drawing Preview Line */}
            {isDrawingMode && drawStep === 1 && startPoint && currentMousePoint && (
              <g className="pointer-events-none">
                <line
                  x1={startPoint.x}
                  y1={startPoint.y}
                  x2={currentMousePoint.x}
                  y2={currentMousePoint.y}
                  stroke={activeColor}
                  strokeWidth={activeWidth}
                  strokeDasharray={
                    activeStyle === 'dashed'
                      ? '6,6'
                      : activeStyle === 'dotted'
                      ? '2,4'
                      : undefined
                  }
                  strokeLinecap="round"
                />
                <circle cx={startPoint.x} cy={startPoint.y} r={5} fill={activeColor} />
                <circle cx={currentMousePoint.x} cy={currentMousePoint.y} r={5} fill={activeColor} />
              </g>
            )}
          </svg>
        )}

        {/* SMT Watermark & Active Timeframe Badge */}
        <div className="absolute bottom-2 left-3 pointer-events-none flex items-center gap-2 text-[11px] font-mono text-slate-400 bg-neutral-950/80 backdrop-blur-md px-3 py-1 rounded-lg border border-neutral-800">
          <Activity className="w-3.5 h-3.5 text-amber-400" />
          <span>SMT Benchmark: <strong className="text-white">{instrumentInfo.correlatedPair}</strong></span>
          <span className="text-neutral-600">·</span>
          <span>Timeframe: <strong className="text-amber-400">{timeframe}</strong></span>
          <span className="text-neutral-600">·</span>
          <span>{candles.length} Live Bars</span>
        </div>
      </div>
    </div>
  );
};
