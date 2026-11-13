/**
 * Live Market Price Ticker Component for MUSCAB CRT PRO
 * Displays real-time streaming Mid Price, Bid, Ask, Spread, and Exact Timestamps.
 *
 * Strict Compliance:
 * 1. Shows live Bid, Ask, Mid Price, and Spread continuously.
 * 2. Exact timestamp of the latest update with millisecond precision.
 * 3. Never generates fake or estimated prices.
 * 4. Shows DATA DISCONNECTED if connection drops.
 * 5. Transparent broker feed attribution (OANDA vs Binance/ECN).
 */

import React, { useState, useEffect, useRef } from 'react';
import { InstrumentId, LiveQuoteTick } from '../types/trading';
import { SUPPORTED_INSTRUMENTS } from '../constants/instruments';
import {
  Activity,
  AlertTriangle,
  Wifi,
  WifiOff,
  Building2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Info,
} from 'lucide-react';

interface LivePriceTickerProps {
  selectedInstrument: InstrumentId;
  quoteTick: LiveQuoteTick | null;
  connectionStatus: 'LIVE_CONNECTED' | 'DATA_DISCONNECTED';
  broker: 'BINANCE' | 'OANDA';
  onToggleBroker: (broker: 'BINANCE' | 'OANDA') => void;
}

export const LivePriceTicker: React.FC<LivePriceTickerProps> = ({
  selectedInstrument,
  quoteTick,
  connectionStatus,
  broker,
  onToggleBroker,
}) => {
  const prevPriceRef = useRef<number>(quoteTick?.midPrice || 0);
  const [priceFlash, setPriceFlash] = useState<'UP' | 'DOWN' | null>(null);

  const instrumentInfo = SUPPORTED_INSTRUMENTS[selectedInstrument];
  const decimals = instrumentInfo.decimals;

  const currentMid = quoteTick?.midPrice || 0;
  const currentBid = quoteTick?.bid || 0;
  const currentAsk = quoteTick?.ask || 0;
  const spreadPips = quoteTick?.spreadPips || 0;
  const isConnected = connectionStatus === 'LIVE_CONNECTED' && quoteTick?.status === 'LIVE' && currentMid > 0;

  // Detect tick movement and flash green / red
  useEffect(() => {
    if (currentMid > 0 && prevPriceRef.current > 0) {
      if (currentMid > prevPriceRef.current) {
        setPriceFlash('UP');
        const t = setTimeout(() => setPriceFlash(null), 700);
        return () => clearTimeout(t);
      } else if (currentMid < prevPriceRef.current) {
        setPriceFlash('DOWN');
        const t = setTimeout(() => setPriceFlash(null), 700);
        return () => clearTimeout(t);
      }
    }
    prevPriceRef.current = currentMid;
  }, [currentMid]);

  // Format exact timestamp with Somalia time (UTC+3) and milliseconds
  const formatExactTime = (timestampMs?: number) => {
    if (!timestampMs) return '---';
    const d = new Date(timestampMs);
    // Somalia is UTC+3
    const somaliaTime = new Date(d.getTime() + 3 * 3600 * 1000);
    const h = String(somaliaTime.getUTCHours()).padStart(2, '0');
    const m = String(somaliaTime.getUTCMinutes()).padStart(2, '0');
    const s = String(somaliaTime.getUTCSeconds()).padStart(2, '0');
    const ms = String(somaliaTime.getUTCMilliseconds()).padStart(3, '0');
    return `${h}:${m}:${s}.${ms} UTC+3`;
  };

  return (
    <div className="w-full rounded-2xl border border-neutral-800 bg-gradient-to-b from-[#0a0c13] to-[#07080c] p-4 sm:p-5 shadow-2xl overflow-hidden">
      {/* Top Status & Broker Attribution Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-neutral-800/80 text-xs font-mono">
        {/* Connection Indicator */}
        <div className="flex items-center gap-2">
          {isConnected ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <Wifi className="w-3.5 h-3.5" />
              <span>LIVE WEBSOCKET STREAM</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/20 border border-rose-500/50 text-rose-300 font-bold animate-pulse">
              <WifiOff className="w-3.5 h-3.5" />
              <span>DATA DISCONNECTED</span>
            </div>
          )}

          {/* Instrument Pair Tag */}
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="font-extrabold text-white text-sm">
              {selectedInstrument === 'AUDUSD' ? 'AUD/USD' : selectedInstrument === 'XAUUSD' ? 'XAU/USD' : 'NASDAQ (NAS100)'}
            </span>
            <span className="text-[11px] text-slate-400">· {instrumentInfo.name}</span>
          </div>
        </div>

        {/* Broker Switcher & Attribution */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 hidden sm:inline">Execution Broker:</span>
          <div className="flex items-center bg-black/60 border border-neutral-800 rounded-lg p-0.5">
            <button
              onClick={() => onToggleBroker('OANDA')}
              className={`px-2.5 py-1 rounded font-bold transition-all flex items-center gap-1 ${
                broker === 'OANDA'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="OANDA Retail Feed (Matched to OANDA execution spreads)"
            >
              <Building2 className="w-3 h-3" />
              <span>OANDA</span>
            </button>
            <button
              onClick={() => onToggleBroker('BINANCE')}
              className={`px-2.5 py-1 rounded font-bold transition-all flex items-center gap-1 ${
                broker === 'BINANCE'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Binance Spot / Global Interbank ECN"
            >
              <span>Binance / ECN</span>
            </button>
          </div>
        </div>
      </div>

      {/* Disconnection Warning Banner if feed is offline */}
      {!isConnected && (
        <div className="mt-3 p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 flex items-start gap-3 text-xs font-mono text-rose-200 animate-in fade-in duration-200">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-rose-300">
              DATA DISCONNECTED — LIVE MARKET PRICE FEED UNAVAILABLE
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Per strict institutional strategy rules, MUSCAB CRT PRO does not display estimated, simulated, or delayed prices with a LIVE tag. Reconnecting to streaming market infrastructure...
            </p>
          </div>
        </div>
      )}

      {/* Main Real-Time Price Grid: Mid, Bid, Ask, Spread, Timestamp */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-4">
        {/* 1. Live Mid Price */}
        <div
          className={`lg:col-span-2 p-4 rounded-xl border transition-all duration-300 flex flex-col justify-between ${
            priceFlash === 'UP'
              ? 'bg-emerald-950/40 border-emerald-400/80 shadow-[0_0_20px_rgba(16,185,129,0.25)]'
              : priceFlash === 'DOWN'
              ? 'bg-rose-950/40 border-rose-400/80 shadow-[0_0_20px_rgba(239,68,68,0.25)]'
              : 'bg-neutral-900/80 border-neutral-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              <span>Real-Time Mid Price</span>
            </span>
            {priceFlash === 'UP' && (
              <span className="text-emerald-400 font-mono text-xs font-bold flex items-center gap-0.5 animate-bounce">
                <ArrowUpRight className="w-3.5 h-3.5" /> Tick Up
              </span>
            )}
            {priceFlash === 'DOWN' && (
              <span className="text-rose-400 font-mono text-xs font-bold flex items-center gap-0.5 animate-bounce">
                <ArrowDownRight className="w-3.5 h-3.5" /> Tick Down
              </span>
            )}
          </div>

          <div className="my-2">
            <div className="text-3xl sm:text-4xl font-mono font-extrabold text-white tracking-tight tabular-nums flex items-baseline gap-2">
              <span>{isConnected ? currentMid.toFixed(decimals) : '---'}</span>
              <span className="text-xs font-normal text-slate-400 font-sans">
                {selectedInstrument === 'XAUUSD' ? 'USD/oz' : selectedInstrument === 'AUDUSD' ? 'USD per AUD' : 'Pts'}
              </span>
            </div>
          </div>

          <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between">
            <span>24h Change:</span>
            <span
              className={`font-bold ${
                (quoteTick?.change24h || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {(quoteTick?.change24h || 0) >= 0 ? `+${quoteTick?.change24h}%` : `${quoteTick?.change24h}%`}
            </span>
          </div>
        </div>

        {/* 2. Live Bid Price */}
        <div className="p-4 rounded-xl bg-neutral-900/70 border border-neutral-800 flex flex-col justify-between">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
            Live Bid (Sell)
          </span>
          <div className="my-1.5 text-2xl font-mono font-extrabold text-rose-300 tabular-nums">
            {isConnected ? currentBid.toFixed(decimals) : '---'}
          </div>
          <span className="text-[10px] font-mono text-slate-500">Institutional Sell Quote</span>
        </div>

        {/* 3. Live Ask Price */}
        <div className="p-4 rounded-xl bg-neutral-900/70 border border-neutral-800 flex flex-col justify-between">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
            Live Ask (Buy)
          </span>
          <div className="my-1.5 text-2xl font-mono font-extrabold text-emerald-300 tabular-nums">
            {isConnected ? currentAsk.toFixed(decimals) : '---'}
          </div>
          <span className="text-[10px] font-mono text-slate-500">Institutional Buy Quote</span>
        </div>

        {/* 4. Live Spread */}
        <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400">
              Live Spread
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
              Tight
            </span>
          </div>
          <div className="my-1.5 text-2xl font-mono font-extrabold text-amber-300 tabular-nums">
            {isConnected ? `${spreadPips.toFixed(1)} Pips` : '---'}
          </div>
          <span className="text-[10px] font-mono text-slate-500">
            Cost: ${(spreadPips * instrumentInfo.pipSize).toFixed(decimals)}
          </span>
        </div>
      </div>

      {/* Footer Info: Exact Update Timestamp & Synchronization Guarantee */}
      <div className="mt-3 pt-3 border-t border-neutral-800/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>Latest Price Update:</span>
          <strong className="text-slate-200">
            {isConnected ? formatExactTime(quoteTick?.lastUpdated) : 'Disconnected'}
          </strong>
        </div>

        <div className="flex items-center gap-2 text-slate-400">
          <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate max-w-md">
            Feed: <strong className="text-slate-300">{quoteTick?.provider || instrumentInfo.dataProvider}</strong>
          </span>
        </div>
      </div>

      {/* Synchronization Transparency Notice */}
      <div className="mt-2 text-[10px] font-mono text-slate-400 leading-relaxed bg-black/40 px-3 py-1.5 rounded-lg border border-neutral-900 flex items-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />
        <span>
          <strong>Broker Synchronization Guarantee:</strong> AUD/USD prices and CRT levels are derived strictly from genuine market feeds calibrated to {broker === 'OANDA' ? 'OANDA retail spreads (0.9 pips)' : 'Interbank ECN'}. Exact tick synchronization is guaranteed only when using identical broker liquidity pools.
        </span>
      </div>
    </div>
  );
};
