/**
 * MUSCAB CRT PRO - OFFICIAL TRADINGVIEW ADVANCED CHART WIDGET
 * Directly connects with TradingView's official real-time charting platform:
 * 1. Live streaming connection to TradingView servers (OANDA:AUDUSD, OANDA:XAUUSD, NASDAQ:NDX)
 * 2. Full official TradingView indicators (RSI, MACD, Moving Averages, Volume, Supertrend, etc.)
 * 3. Full native TradingView drawing tools (Fibonacci retracements, Trend lines, Pitchforks, Gann, Text)
 * 4. Exact broker feeds: OANDA Forex vs Binance Spot ECN
 * 5. Direct 1-click external link to open chart in TradingView.com
 */

import React, { useEffect, useRef, useState } from 'react';
import { InstrumentId, Timeframe } from '../types/trading';
import {
  ExternalLink,
  Wifi,
  Building2,
  Sliders,
  Layers,
  Activity,
  Maximize2,
  RefreshCw,
} from 'lucide-react';

interface OfficialTradingViewWidgetProps {
  instrument: InstrumentId;
  timeframe: Timeframe;
  broker: 'BINANCE' | 'OANDA';
  height?: number;
}

declare global {
  interface Window {
    TradingView?: {
      widget: new (config: any) => any;
    };
  }
}

export const OfficialTradingViewWidget: React.FC<OfficialTradingViewWidgetProps> = ({
  instrument,
  timeframe,
  broker,
  height = 520,
}) => {
  const containerId = useRef(`tradingview_${Math.random().toString(36).substring(2, 9)}`);
  const [isScriptLoaded, setIsScriptLoaded] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<boolean>(false);
  const [selectedFeed, setSelectedFeed] = useState<string>(() => {
    if (instrument === 'AUDUSD') return broker === 'OANDA' ? 'OANDA:AUDUSD' : 'FX:AUDUSD';
    if (instrument === 'XAUUSD') return broker === 'OANDA' ? 'OANDA:XAUUSD' : 'BINANCE:XAUUSDT';
    return 'NASDAQ:NDX';
  });

  // Map timeframe to TradingView interval string
  const getIntervalString = (tf: Timeframe): string => {
    switch (tf) {
      case '5M':
        return '5';
      case '15M':
        return '15';
      case '30M':
        return '30';
      case '1H':
        return '60';
      case '4H':
        return '240';
      case '1D':
        return 'D';
      case '1W':
        return 'W';
      case '1M':
        return 'M';
      default:
        return '5';
    }
  };

  // Determine standard default symbol for instrument & broker
  useEffect(() => {
    if (instrument === 'AUDUSD') {
      setSelectedFeed(broker === 'OANDA' ? 'OANDA:AUDUSD' : 'FX:AUDUSD');
    } else if (instrument === 'XAUUSD') {
      setSelectedFeed(broker === 'OANDA' ? 'OANDA:XAUUSD' : 'BINANCE:XAUUSDT');
    } else {
      setSelectedFeed('NASDAQ:NDX');
    }
  }, [instrument, broker]);

  // Load s3.tradingview.com/tv.js script once
  useEffect(() => {
    if (window.TradingView) {
      setIsScriptLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.id = 'tradingview-widget-script';
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      setIsScriptLoaded(true);
    };
    script.onerror = () => {
      console.warn('Failed to load TradingView tv.js script, falling back to embedded iframe');
      setLoadError(true);
    };

    document.head.appendChild(script);

    return () => {
      // Do not remove script to avoid re-fetching on unmount
    };
  }, []);

  // Initialize or re-create widget when symbol or timeframe changes
  useEffect(() => {
    if (!isScriptLoaded || !window.TradingView || loadError) return;

    const currentContainer = document.getElementById(containerId.current);
    if (!currentContainer) return;

    currentContainer.innerHTML = '';

    try {
      new window.TradingView.widget({
        autosize: true,
        symbol: selectedFeed,
        interval: getIntervalString(timeframe),
        timezone: 'Africa/Mogadishu', // Somalia UTC+3 matching MUSCAB CRT PRO
        theme: 'dark',
        style: '1', // Candlesticks
        locale: 'en',
        toolbar_bg: '#08080a',
        enable_publishing: false,
        hide_top_toolbar: false,
        hide_side_toolbar: false,
        allow_symbol_change: true,
        save_image: true,
        container_id: containerId.current,
        hide_volume: false,
        studies: [
          'RSI@tv-basicstudies',
          'MASimple@tv-basicstudies',
        ],
        overrides: {
          'paneProperties.background': '#08080a',
          'paneProperties.vertGridProperties.color': 'rgba(255, 255, 255, 0.05)',
          'paneProperties.horzGridProperties.color': 'rgba(255, 255, 255, 0.05)',
          'symbolWatermarkProperties.transparency': 90,
          'scalesProperties.textColor': '#94a3b8',
          'mainSeriesProperties.candleStyle.upColor': '#10b981',
          'mainSeriesProperties.candleStyle.downColor': '#ef4444',
          'mainSeriesProperties.candleStyle.wickUpColor': '#10b981',
          'mainSeriesProperties.candleStyle.wickDownColor': '#ef4444',
          'mainSeriesProperties.candleStyle.borderUpColor': '#10b981',
          'mainSeriesProperties.candleStyle.borderDownColor': '#ef4444',
        },
      });
    } catch (e) {
      console.warn('Error initializing TradingView widget:', e);
      setLoadError(true);
    }
  }, [isScriptLoaded, selectedFeed, timeframe, loadError]);

  // Direct link to TradingView.com
  const tradingViewUrl = `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(selectedFeed)}`;

  // Available feeds for active instrument
  const feedOptions: Record<InstrumentId, { symbol: string; label: string }[]> = {
    AUDUSD: [
      { symbol: 'OANDA:AUDUSD', label: 'OANDA MT5 Feed (Direct)' },
      { symbol: 'FX:AUDUSD', label: 'FX Interbank ECN' },
      { symbol: 'FOREXCOM:AUDUSD', label: 'FOREX.com Retail' },
      { symbol: 'BINANCE:AUDUSDT', label: 'Binance USDT' },
    ],
    XAUUSD: [
      { symbol: 'OANDA:XAUUSD', label: 'OANDA Gold CFD' },
      { symbol: 'BINANCE:XAUUSDT', label: 'Binance Spot Gold ECN' },
      { symbol: 'TVC:GOLD', label: 'TradingView Spot Gold' },
      { symbol: 'FOREXCOM:XAUUSD', label: 'FOREX.com Gold' },
    ],
    NASDAQ: [
      { symbol: 'NASDAQ:NDX', label: 'Nasdaq 100 Cash Index' },
      { symbol: 'CME_MINI:NQ1!', label: 'CME E-mini Futures (NQ)' },
      { symbol: 'CAPITALCOM:US100', label: 'Capital.com US100 CFD' },
      { symbol: 'OANDA:NAS100USD', label: 'OANDA NAS100 CFD' },
    ],
  };

  return (
    <div className="w-full rounded-2xl border border-neutral-800 bg-[#08080a] overflow-hidden shadow-2xl flex flex-col">
      {/* TRADINGVIEW TOP CONNECTIVITY HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-neutral-800 bg-[#0a0b12] text-xs font-mono">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-black text-xs">
              TV
            </div>
            <div>
              <span className="font-extrabold text-white text-sm tracking-wide">
                TradingView Real-Time Terminal
              </span>
              <span className="text-[10px] text-slate-400 block sm:inline sm:ml-2">
                Official Live Streaming Connection
              </span>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 font-bold text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <Wifi className="w-3 h-3" />
            <span>CONNECTED TO TRADINGVIEW</span>
          </div>
        </div>

        {/* FEED SELECTOR & EXTERNAL LINK */}
        <div className="flex items-center gap-2.5">
          {/* Feed Selector Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[11px] hidden md:inline">Feed Source:</span>
            <select
              value={selectedFeed}
              onChange={(e) => setSelectedFeed(e.target.value)}
              className="bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1 text-slate-200 font-bold text-[11px] focus:outline-none focus:border-amber-500"
            >
              {feedOptions[instrument].map((opt) => (
                <option key={opt.symbol} value={opt.symbol}>
                  {opt.label} ({opt.symbol})
                </option>
              ))}
            </select>
          </div>

          {/* Open in TradingView.com Link */}
          <a
            href={tradingViewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 hover:text-white transition-all font-bold text-[11px]"
            title="Open symbol chart directly on TradingView.com"
          >
            <span>Open in TradingView.com</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* CHART CANVAS CONTAINER */}
      <div className="relative w-full" style={{ height: `${height}px` }}>
        {/* Fallback iframe if script is blocked, or primary container */}
        {loadError ? (
          <iframe
            title={`TradingView Chart ${selectedFeed}`}
            src={`https://s.tradingview.com/widgetembed/?frameElementId=tradingview_widget&symbol=${encodeURIComponent(
              selectedFeed
            )}&interval=${getIntervalString(
              timeframe
            )}&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=08080a&studies=%5B%22RSI%40tv-basicstudies%22%5D&theme=dark&style=1&timezone=Africa%2FMogadishu&locale=en`}
            style={{ width: '100%', height: '100%', border: 'none' }}
            allowFullScreen
          />
        ) : (
          <div
            id={containerId.current}
            className="w-full h-full"
            style={{ minHeight: `${height}px` }}
          />
        )}

        {/* Loading Spinner overlay before script mounts */}
        {!isScriptLoaded && !loadError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#08080a] text-slate-400 font-mono text-xs space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
            <span>Connecting to TradingView live servers...</span>
          </div>
        )}
      </div>

      {/* TRADINGVIEW STATUS FOOTER */}
      <div className="px-4 py-2 border-t border-neutral-800 bg-[#070709] flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-blue-400" />
          <span>Active Symbol:</span>
          <strong className="text-white">{selectedFeed}</strong>
          <span>·</span>
          <span>Timeframe:</span>
          <strong className="text-amber-400">{timeframe}</strong>
        </div>

        <div className="flex items-center gap-2 text-slate-500">
          <span>Live Data Feed provided directly by TradingView & OANDA</span>
        </div>
      </div>
    </div>
  );
};
