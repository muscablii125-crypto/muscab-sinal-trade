/**
 * Search Signal Action Section
 * Houses the prominent, large "SEARCH SIGNAL" button and live feed telemetry.
 * Strictly strictly utilizes genuine live market data.
 */

import React from 'react';
import { InstrumentId, CrtSignalResult } from '../types/trading';
import { SUPPORTED_INSTRUMENTS } from '../constants/instruments';
import { Search, Loader2, SlidersHorizontal, RefreshCw, Radio, AlertTriangle } from 'lucide-react';

interface SignalSearchSectionProps {
  selectedInstrument: InstrumentId;
  onSearchSignal: () => void;
  onRefreshLiveQuotes: () => void;
  isSearching: boolean;
  signal: CrtSignalResult | null;
  onOpenRulesConfig: () => void;
}

export const SignalSearchSection: React.FC<SignalSearchSectionProps> = ({
  selectedInstrument,
  onSearchSignal,
  onRefreshLiveQuotes,
  isSearching,
  signal,
  onOpenRulesConfig,
}) => {
  const instrumentInfo = SUPPORTED_INSTRUMENTS[selectedInstrument];
  const isDataUnavailable = signal?.liveFeedStatus === 'DATA_UNAVAILABLE';
  const provider = signal?.dataProvider || instrumentInfo.dataProvider;
  const lastUpdate = signal?.lastUpdatedIso
    ? new Date(signal.lastUpdatedIso).toLocaleTimeString()
    : 'Live Streaming';

  return (
    <div className="w-full rounded-2xl border border-neutral-800 bg-gradient-to-b from-[#10121a] to-[#0a0b10] p-5 shadow-xl">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Summary and market mode */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs uppercase font-mono tracking-widest text-amber-400 font-semibold">
              MUSCAB CRT PRO Engine
            </span>
            <span className="text-neutral-600">·</span>
            <span className="text-xs font-mono text-slate-300">
              Analysis Sequence:{' '}
              <strong className="text-slate-100">
                Monthly → Weekly → 4H → 1H → 30M → 15M → 5M
              </strong>
            </span>
          </div>

          <h3 className="text-xl font-bold text-white tracking-tight">
            Analyze {instrumentInfo.name} ({instrumentInfo.ticker})
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Calculates Turtle Soup, Order Blocks, Key Levels, 1H Purge, and 5M SMT Model 1
            strictly from genuine live market candlestick data.
          </p>

          {/* Genuine Market Data Status Indicator */}
          <div className="flex flex-wrap items-center gap-3 mt-3 text-xs font-mono">
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md border text-xs font-semibold ${
                isDataUnavailable
                  ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                  : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
              }`}
            >
              {isDataUnavailable ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  <span>DATA UNAVAILABLE</span>
                </>
              ) : (
                <>
                  <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  <span>GENUINE LIVE MARKET FEED</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] truncate">
              <span>Provider:</span>
              <strong className="text-slate-200">{provider}</strong>
            </div>

            <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
              <span>Last Quote:</span>
              <span className="text-amber-400/90">{lastUpdate}</span>
            </div>

            <button
              onClick={onRefreshLiveQuotes}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-amber-300 transition-colors px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800"
              title="Refresh live prices from provider"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Sync</span>
            </button>
          </div>
        </div>

        {/* Right: Large SEARCH SIGNAL Button & Config Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            onClick={onOpenRulesConfig}
            className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-slate-200 text-xs font-semibold tracking-wide transition-all shadow-sm"
            title="Configure exact CRT rules (TS, OB, KL, Purge, SMT)"
          >
            <SlidersHorizontal className="w-4 h-4 text-amber-400" />
            <span>Configure Rules</span>
          </button>

          {/* LARGE SEARCH SIGNAL BUTTON */}
          <button
            onClick={onSearchSignal}
            disabled={isSearching}
            className="group relative flex items-center justify-center gap-3 px-8 py-4 rounded-xl font-extrabold text-sm tracking-wider uppercase transition-all duration-200 shadow-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 hover:shadow-[0_0_25px_rgba(245,158,11,0.4)] active:scale-[0.98] disabled:opacity-75 disabled:pointer-events-none"
          >
            {isSearching ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-slate-950" />
                <span>ANALYZING LIVE TIMEFRAMES...</span>
              </>
            ) : (
              <>
                <Search className="w-5 h-5 text-slate-950 transition-transform group-hover:scale-110" />
                <span className="text-base font-black">SEARCH SIGNAL</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Progress Scan Bar during search */}
      {isSearching && (
        <div className="mt-4 pt-3 border-t border-neutral-800/80">
          <div className="flex items-center justify-between text-xs font-mono text-amber-400 mb-1.5">
            <span className="flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Evaluating {selectedInstrument}: Monthly → Weekly → 4H → 1H → 30M → 15M → 5M
            </span>
            <span>Checking Rule Criteria with Live Market OHLC...</span>
          </div>
          <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full animate-pulse w-full" />
          </div>
        </div>
      )}
    </div>
  );
};
