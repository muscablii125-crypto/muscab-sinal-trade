/**
 * Multi-Timeframe Structural Breakdown (Monthly → Weekly → 1H → 5M)
 * Displays granular rules, levels, and rationale for every timeframe.
 */

import React, { useState } from 'react';
import { CrtSignalResult } from '../types/trading';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Target,
  ArrowRight,
} from 'lucide-react';

interface MultiTimeframeBreakdownProps {
  signal: CrtSignalResult | null;
}

export const MultiTimeframeBreakdown: React.FC<MultiTimeframeBreakdownProps> = ({ signal }) => {
  const [activeTab, setActiveTab] = useState<'ALL' | '1M' | '1W' | '4H' | '1H' | '30M' | '15M' | '5M'>('ALL');

  if (!signal) return null;

  const { monthly, weekly, fourHour, hourly, thirtyMin, fifteenMin, fiveMin } = signal;

  return (
    <div className="w-full rounded-2xl border border-neutral-800 bg-[#0b0c12] p-5 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-neutral-800/80">
        <div>
          <h4 className="text-base font-bold text-white tracking-wide">
            Multi-Timeframe CRT Strategy Breakdown
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Full Spectrum: <span className="text-amber-400 font-mono">Monthly → Weekly → 4H → 1H → 30M → 15M → 5M</span>
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 bg-[#141620] p-1 rounded-lg border border-neutral-800 text-xs font-mono overflow-x-auto">
          {(['ALL', '1M', '1W', '4H', '1H', '30M', '15M', '5M'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab === 'ALL' ? 'All' : tab}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {/* 1. MONTHLY TIMEFRAME */}
        {(activeTab === 'ALL' || activeTab === '1M') && (
          <div className="rounded-xl border border-neutral-800 bg-[#0f1118] p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-amber-500/10 text-amber-400 font-mono text-xs font-bold flex items-center justify-center border border-amber-500/20">
                  1M
                </span>
                <span className="font-bold text-sm text-slate-100">
                  Monthly Timeframe (Macro Bias & Targets)
                </span>
              </div>
              <span
                className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                  monthly.direction === 'BULLISH'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : monthly.direction === 'BEARISH'
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    : 'bg-neutral-800 text-slate-400 border-neutral-700'
                }`}
              >
                {monthly.direction}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-neutral-900/60 border border-neutral-800/80">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                  Monthly Turtle Soup (TS)
                </span>
                <div className="text-slate-200">{monthly.tsDetails}</div>
                {monthly.tsLevel && monthly.tsLevel > 0 ? (
                  <div className="mt-1 font-mono text-amber-400 text-[11px]">
                    Swept Level: {monthly.tsLevel.toFixed(2)}
                  </div>
                ) : null}
              </div>

              <div className="p-3 rounded-lg bg-neutral-900/60 border border-neutral-800/80">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                  Monthly Model 1
                </span>
                <div className="text-slate-200">{monthly.model1Details}</div>
              </div>

              <div className="p-3 rounded-lg bg-neutral-900/60 border border-neutral-800/80">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                  Monthly Target
                </span>
                <div className="text-amber-400 font-mono font-bold text-sm">
                  {monthly.monthlyTarget > 0 ? monthly.monthlyTarget.toFixed(2) : 'N/A'}
                </div>
                <div className="text-slate-400 text-[11px] mt-0.5">
                  {monthly.monthlyTargetLabel}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-neutral-900/60 border border-neutral-800/80">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                  Monthly SMT (Smart Money Technique)
                </span>
                <div className="text-slate-200">{monthly.smtDetails}</div>
              </div>
            </div>
          </div>
        )}

        {/* 2. WEEKLY TIMEFRAME */}
        {(activeTab === 'ALL' || activeTab === '1W') && (
          <div className="rounded-xl border border-neutral-800 bg-[#0f1118] p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-amber-500/10 text-amber-400 font-mono text-xs font-bold flex items-center justify-center border border-amber-500/20">
                  1W
                </span>
                <span className="font-bold text-sm text-slate-100">
                  Weekly Timeframe (Mitigation & Key Levels)
                </span>
              </div>
              <span className="text-xs font-mono text-slate-300">
                Return to KL:{' '}
                <strong
                  className={weekly.priceReturnedToKL ? 'text-emerald-400' : 'text-amber-400'}
                >
                  {weekly.priceReturnedToKL ? 'SATISFIED' : 'PENDING'}
                </strong>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-neutral-900/60 border border-neutral-800/80">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                  Weekly Key Levels (KL) & Retest
                </span>
                <div className="text-slate-200">
                  Key Level at <strong className="text-amber-400 font-mono">{weekly.keyLevelPrice.toFixed(2)}</strong>.
                </div>
                <div className="text-slate-400 text-[11px] mt-1">
                  Status: {weekly.priceReturnedToKL ? 'Price has returned and retested KL.' : 'Price has not yet reached weekly key level.'}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-neutral-900/60 border border-neutral-800/80">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                  Weekly Order Block (OB)
                </span>
                <div className="text-slate-200">
                  {weekly.obZone ? (
                    <>
                      Zone: {weekly.obZone.low.toFixed(2)} - {weekly.obZone.high.toFixed(2)} {weekly.obZone.type ? `(${weekly.obZone.type})` : ''}
                    </>
                  ) : (
                    'Standard institutional flow'
                  )}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Rule Check: {weekly.obReturnRequiredByRules ? (weekly.priceReturnedToOB ? 'Mitigated' : 'Awaiting mitigation') : 'Price return to Weekly OB waived by strategy rules (only KL required).'}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-neutral-900/60 border border-neutral-800/80">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                  Weekly Turtle Soup (TS)
                </span>
                <div className="text-slate-200">{weekly.tsDetails}</div>
              </div>

              <div className="p-3 rounded-lg bg-neutral-900/60 border border-neutral-800/80">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                  Weekly SMT
                </span>
                <div className="text-slate-200">{weekly.smtDetails}</div>
              </div>
            </div>
          </div>
        )}

        {/* 2.5. 4H TIMEFRAME */}
        {(activeTab === 'ALL' || activeTab === '4H') && fourHour && (
          <div className="rounded-xl border border-neutral-800 bg-[#0f1118] p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-amber-500/10 text-amber-400 font-mono text-xs font-bold flex items-center justify-center border border-amber-500/20">
                  4H
                </span>
                <span className="font-bold text-sm text-slate-100">
                  4-Hour Timeframe (Macro Intraday OB & Liquidity Purge)
                </span>
              </div>
              <span
                className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                  fourHour.direction === 'BULLISH'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : fourHour.direction === 'BEARISH'
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    : 'bg-neutral-800 text-slate-400 border-neutral-700'
                }`}
              >
                {fourHour.direction}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-neutral-900/60 border border-neutral-800/80">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                  4H Liquidity Purge
                </span>
                <div className="text-slate-200">{fourHour.purgeDetails}</div>
              </div>

              <div className="p-3 rounded-lg bg-neutral-900/60 border border-neutral-800/80">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                  4H Key Level (KL) & Order Block (OB)
                </span>
                <div className="text-slate-200">
                  KL Price: <strong className="text-amber-400 font-mono">{fourHour.klPrice !== undefined ? fourHour.klPrice.toFixed(2) : 'Active'}</strong> · OB: {fourHour.obValid ? 'Validated' : 'Neutral'}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-neutral-900/60 border border-neutral-800/80">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                  4H Turtle Soup (TS)
                </span>
                <div className="text-slate-200">{fourHour.tsDetails}</div>
              </div>

              <div className="p-3 rounded-lg bg-neutral-900/60 border border-neutral-800/80">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                  4H SMT Intermarket Correlation
                </span>
                <div className="text-slate-200">{fourHour.smtDetails}</div>
              </div>
            </div>
          </div>
        )}

        {/* 3. 1H TIMEFRAME */}
        {(activeTab === 'ALL' || activeTab === '1H') && (
          <div className="rounded-xl border border-neutral-800 bg-[#0f1118] p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-amber-500/10 text-amber-400 font-mono text-xs font-bold flex items-center justify-center border border-amber-500/20">
                  1H
                </span>
                <span className="font-bold text-sm text-slate-100">
                  1-Hour Timeframe (Purge, OB, KL, TS, SMT)
                </span>
              </div>
              <span
                className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                  hourly.all1HConditionsMet
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                }`}
              >
                {hourly.all1HConditionsMet ? 'QUALIFIED FOR 5M' : '1H CONDITIONS INCOMPLETE'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-neutral-900/60 border border-neutral-800/80">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                  1H Liquidity Purge
                </span>
                <div className="text-slate-200">{hourly.purgeDetails}</div>
              </div>

              <div className="p-3 rounded-lg bg-neutral-900/60 border border-neutral-800/80">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                  1H Order Block (OB) & Key Level (KL)
                </span>
                <div className="text-slate-200">
                  KL: <strong className="text-amber-400 font-mono">{hourly.klPrice.toFixed(2)}</strong> · OB:{' '}
                  {hourly.obValid ? 'Active Institutional Rejection Block' : 'In formation'}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-neutral-900/60 border border-neutral-800/80">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                  1H Turtle Soup (TS)
                </span>
                <div className="text-slate-200">{hourly.tsDetails}</div>
              </div>

              <div className="p-3 rounded-lg bg-neutral-900/60 border border-neutral-800/80">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                  1H SMT Divergence
                </span>
                <div className="text-slate-200">{hourly.smtDetails}</div>
              </div>
            </div>
          </div>
        )}

        {/* 3.2. 30M TIMEFRAME */}
        {(activeTab === 'ALL' || activeTab === '30M') && thirtyMin && (
          <div className="rounded-xl border border-neutral-800 bg-[#0f1118] p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-amber-500/10 text-amber-400 font-mono text-xs font-bold flex items-center justify-center border border-amber-500/20">
                  30M
                </span>
                <span className="font-bold text-sm text-slate-100">
                  30-Minute Timeframe (Internal Liquidity Purge)
                </span>
              </div>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded border bg-neutral-800 text-slate-300 border-neutral-700">
                {thirtyMin.direction}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-neutral-900/60 border border-neutral-800/80">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                  30M Internal Sweep
                </span>
                <div className="text-slate-200">{thirtyMin.purgeDetails}</div>
              </div>

              <div className="p-3 rounded-lg bg-neutral-900/60 border border-neutral-800/80">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                  30M SMT Relative Strength
                </span>
                <div className="text-slate-200">{thirtyMin.smtDetails}</div>
              </div>
            </div>
          </div>
        )}

        {/* 3.5. 15M TIMEFRAME */}
        {(activeTab === 'ALL' || activeTab === '15M') && fifteenMin && (
          <div className="rounded-xl border border-neutral-800 bg-[#0f1118] p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-amber-500/10 text-amber-400 font-mono text-xs font-bold flex items-center justify-center border border-amber-500/20">
                  15M
                </span>
                <span className="font-bold text-sm text-slate-100">
                  15-Minute Timeframe (Pre-Entry Market Structure Shift MSS)
                </span>
              </div>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded border bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                MSS CONFIRMED
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-neutral-900/60 border border-neutral-800/80">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                  15M Structural Shift (MSS)
                </span>
                <div className="text-slate-200">{fifteenMin.purgeDetails}</div>
              </div>

              <div className="p-3 rounded-lg bg-neutral-900/60 border border-neutral-800/80">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                  15M SMT Intermarket Crack
                </span>
                <div className="text-slate-200">{fifteenMin.smtDetails}</div>
              </div>
            </div>
          </div>
        )}

        {/* 4. 5M TIMEFRAME */}
        {(activeTab === 'ALL' || activeTab === '5M') && (
          <div className="rounded-xl border border-neutral-800 bg-[#0f1118] p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-amber-500/10 text-amber-400 font-mono text-xs font-bold flex items-center justify-center border border-amber-500/20">
                  5M
                </span>
                <span className="font-bold text-sm text-slate-100">
                  5-Minute Timeframe (SMT Model 1 & Entry Execution)
                </span>
              </div>
              <span
                className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                  fiveMin.entryConfirmed
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-neutral-800 text-slate-400 border-neutral-700'
                }`}
              >
                {fiveMin.entryConfirmed ? 'TRIGGER CONFIRMED' : 'WAITING FOR 5M TRIGGER'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-neutral-900/60 border border-neutral-800/80">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                  5M SMT Model 1
                </span>
                <div className="text-slate-200">{fiveMin.smtModel1Details}</div>
              </div>

              <div className="p-3 rounded-lg bg-neutral-900/60 border border-neutral-800/80">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                  SMT Intermarket Confirmation
                </span>
                <div className="text-slate-200">{fiveMin.smtConfirmationDetails}</div>
              </div>

              <div className="p-3 rounded-lg bg-neutral-900/60 border border-neutral-800/80">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                  Entry Trigger Candle
                </span>
                <div className="text-slate-200">{fiveMin.entryTriggerDetails}</div>
              </div>

              <div className="p-3 rounded-lg bg-neutral-900/60 border border-neutral-800/80">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                  Invalidation & Anchors
                </span>
                <div className="text-slate-200 font-mono">
                  Trigger Price: {fiveMin.triggerPrice > 0 ? fiveMin.triggerPrice.toFixed(2) : 'Awaiting'}
                  <br />
                  SL Anchor: {fiveMin.invalidationPrice > 0 ? fiveMin.invalidationPrice.toFixed(2) : 'Awaiting'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
