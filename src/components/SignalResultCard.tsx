/**
 * Signal Results Display Component
 * Renders BUY, SELL, or WAIT FOR SETUP with exact parameters:
 * Entry, SL, TP1, TP2, TP3, Monthly/Weekly/1H/5M confirmations,
 * 5M TS & 5M SMT badges, Liquidity Target Pool (PDH, PDL, PWH, PWL, PMH, PML),
 * and 1-Click "Log to Trade History".
 */

import React, { useState } from 'react';
import { CrtSignalResult } from '../types/trading';
import { SUPPORTED_INSTRUMENTS } from '../constants/instruments';
import {
  TrendingUp,
  TrendingDown,
  PauseCircle,
  Copy,
  Check,
  AlertCircle,
  CheckCircle2,
  Clock,
  Compass,
  Layers,
  ShieldCheck,
  Target,
  BookmarkPlus,
  Flame,
  Zap,
} from 'lucide-react';

interface SignalResultCardProps {
  signal: CrtSignalResult | null;
  onOpenAiAudit: () => void;
  onLogTrade?: (signal: CrtSignalResult) => void;
}

export const SignalResultCard: React.FC<SignalResultCardProps> = ({
  signal,
  onOpenAiAudit,
  onLogTrade,
}) => {
  const [copied, setCopied] = useState(false);
  const [logged, setLogged] = useState(false);

  if (!signal) {
    return (
      <div className="w-full rounded-2xl border border-dashed border-neutral-800 bg-[#0a0b10] p-8 text-center text-slate-400">
        <Compass className="w-8 h-8 mx-auto text-amber-500/60 mb-2 animate-pulse" />
        <h4 className="text-sm font-bold text-slate-200">No Signal Analyzed Yet</h4>
        <p className="text-xs text-slate-400 mt-1">
          Select an instrument above and click <span className="text-amber-400 font-bold">SEARCH SIGNAL</span> to execute multi-timeframe analysis.
        </p>
      </div>
    );
  }

  if (signal.liveFeedStatus === 'DATA_DISCONNECTED' || signal.liveFeedStatus === 'DATA_UNAVAILABLE') {
    const isDisconnected = signal.liveFeedStatus === 'DATA_DISCONNECTED';
    return (
      <div className="w-full rounded-2xl border border-rose-500/60 bg-gradient-to-b from-[#18080a] to-[#0a0b10] p-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-rose-500/30">
          <div className="flex items-center gap-3">
            <div className="px-3.5 py-1.5 rounded-xl bg-rose-500 text-white font-black text-sm uppercase tracking-wider flex items-center gap-2 shadow-lg animate-pulse">
              <AlertCircle className="w-4 h-4 stroke-[2.5]" />
              <span>{isDisconnected ? 'DATA DISCONNECTED' : 'DATA UNAVAILABLE'}</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {signal.instrumentName} ({signal.instrument})
              </h3>
              <p className="text-xs text-rose-300/80 font-mono">
                {isDisconnected ? 'Streaming market connection offline — no stale prices displayed' : 'Authentic live market feed required for CRT evaluation'}
              </p>
            </div>
          </div>
          <div className="text-xs font-mono text-slate-400">
            <span>Provider: </span>
            <span className="text-rose-300 font-bold">{signal.dataProvider || 'Live Financial API'}</span>
          </div>
        </div>

        <div className="mt-4 p-4 rounded-xl bg-black/50 border border-rose-900/40 text-xs font-mono space-y-2">
          <div className="text-rose-400 font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{signal.summaryMessage}</span>
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Per strict institutional strategy rules, MUSCAB CRT PRO never fabricates signals using hardcoded, simulated, or outdated prices. Trading signals remain locked until genuine market data is streaming.
          </p>
        </div>
      </div>
    );
  }

  const isBuy = signal.verdict === 'BUY';
  const isSell = signal.verdict === 'SELL';
  const isWait = signal.verdict === 'WAIT';
  const isConfirmed = signal.status === 'CONFIRMED_SIGNAL';
  const isDetected = signal.status === 'DETECTED_SETUP';

  const instrumentInfo = SUPPORTED_INSTRUMENTS[signal.instrument];
  const decimals = instrumentInfo.decimals;

  const handleCopy = () => {
    const text = `MUSCAB CRT PRO - FOREX SIGNAL
Instrument: ${signal.instrumentName} (${signal.instrument})
Verdict: ${signal.verdict} (${isConfirmed ? 'CONFIRMED SIGNAL' : 'DETECTED SETUP'})
Session: ${signal.tradingSession}
Target Pool: ${signal.targetLiquidityName} (${signal.targetLiquidityPrice})
Entry Price: ${signal.entryPrice}
Stop Loss: ${signal.stopLoss}
TP1 (1:${signal.riskReward1}): ${signal.takeProfit1}
TP2 (1:${signal.riskReward2}): ${signal.takeProfit2}
TP3 (1:${signal.riskReward3} / Monthly): ${signal.takeProfit3}
Risk: ${signal.pipsRisk} pips | TP1: ${signal.pipsReward1} pips
5M TS: ${signal.fiveMinTsConfirmation ? 'CONFIRMED' : 'WAITING'}
5M SMT: ${signal.fiveMinSmtConfirmation ? 'CONFIRMED' : 'WAITING'}
Confirmations:
- Monthly: ${signal.monthlyDirection}
- Weekly: ${signal.weeklyDirection}
- 1H Confirmed: ${signal.hourlyConfirmation ? 'YES' : 'NO'}
- 5M SMT Model 1: ${signal.fiveMinModel1Confirmation ? 'YES' : 'NO'}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogTrade = () => {
    if (onLogTrade) {
      onLogTrade(signal);
      setLogged(true);
      setTimeout(() => setLogged(false), 2500);
    }
  };

  const liq = signal.liquidityLevels;

  return (
    <div
      className={`w-full rounded-2xl border transition-all duration-300 overflow-hidden shadow-2xl ${
        isBuy
          ? 'bg-gradient-to-b from-[#0a1812] to-[#07090d] border-emerald-500/60 shadow-[0_0_30px_rgba(16,185,129,0.12)]'
          : isSell
          ? 'bg-gradient-to-b from-[#1a0a0c] to-[#07090d] border-rose-500/60 shadow-[0_0_30px_rgba(239,68,68,0.12)]'
          : 'bg-gradient-to-b from-[#14120a] to-[#07090d] border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.08)]'
      }`}
    >
      {/* Top Banner: Verdict & Instrument Badge */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b border-neutral-800/80 bg-black/40">
        <div className="flex items-center gap-3">
          {/* Main Verdict Badge */}
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-lg font-black tracking-wider uppercase shadow-md ${
              isBuy
                ? 'bg-emerald-500 text-slate-950 ring-2 ring-emerald-400/40'
                : isSell
                ? 'bg-rose-500 text-white ring-2 ring-rose-400/40'
                : 'bg-amber-500 text-slate-950 ring-2 ring-amber-400/40'
            }`}
          >
            {isBuy && <TrendingUp className="w-5 h-5 stroke-[2.5]" />}
            {isSell && <TrendingDown className="w-5 h-5 stroke-[2.5]" />}
            {isWait && <PauseCircle className="w-5 h-5 stroke-[2.5]" />}
            <span>{isWait ? 'WAIT FOR SETUP' : `${signal.verdict} SIGNAL`}</span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold text-white">
                {signal.instrumentName}
              </span>
              <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                {signal.instrument}
              </span>
            </div>
            <div className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Session: <strong className="text-slate-200">{signal.tradingSession}</strong></span>
              <span className="text-neutral-600">·</span>
              <span>
                {signal.isInsideSession ? (
                  <span className="text-emerald-400 font-semibold">Inside Active Session</span>
                ) : (
                  <span className="text-amber-400/80">Outside Session</span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Status Distinction Badge & Actions */}
        <div className="flex items-center gap-2.5">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">
              Signal Status
            </span>
            <span
              className={`text-xs font-mono font-bold px-2 py-1 rounded inline-block mt-0.5 border ${
                isConfirmed
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                  : isDetected
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                  : 'bg-neutral-800 text-slate-400 border-neutral-700'
              }`}
            >
              {isConfirmed
                ? 'CONFIRMED TRADING SIGNAL'
                : isDetected
                ? 'DETECTED SETUP (PENDING CONFIRMATION)'
                : 'WAIT FOR SETUP'}
            </span>
          </div>

          {/* Log to Trade History Button */}
          {onLogTrade && (
            <button
              onClick={handleLogTrade}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-mono font-bold transition-all shadow-md shadow-amber-500/20 active:scale-95"
              title="Record this setup outcome in Trade History"
            >
              {logged ? (
                <>
                  <Check className="w-3.5 h-3.5 text-slate-950" />
                  <span>Logged!</span>
                </>
              ) : (
                <>
                  <BookmarkPlus className="w-3.5 h-3.5 text-slate-950" />
                  <span>Log Trade</span>
                </>
              )}
            </button>
          )}

          {/* Copy Setup */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-slate-300 text-xs font-mono transition-colors"
            title="Copy trade setup parameters"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-bold">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy Setup</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Trade Parameters Grid (Entry, SL, TP1, TP2, TP3) */}
      <div className="p-6">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
          {/* Entry Price */}
          <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-3.5 flex flex-col">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
              Entry Price
            </span>
            <span className="text-xl font-mono font-extrabold text-white tabular-nums mt-1">
              {signal.entryPrice.toFixed(decimals)}
            </span>
            <span className="text-[10px] font-mono text-slate-400 mt-1">Market Trigger</span>
          </div>

          {/* Stop Loss (SL) */}
          <div className="bg-rose-950/20 border border-rose-500/30 rounded-xl p-3.5 flex flex-col">
            <span className="text-[11px] font-mono uppercase tracking-wider text-rose-400">
              Stop Loss (SL)
            </span>
            <span className="text-xl font-mono font-extrabold text-rose-400 tabular-nums mt-1">
              {signal.stopLoss.toFixed(decimals)}
            </span>
            <span className="text-[10px] font-mono text-rose-300/70 mt-1">
              Risk: {signal.pipsRisk} pips
            </span>
          </div>

          {/* TP 1 */}
          <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-3.5 flex flex-col">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400">
                Take Profit 1
              </span>
              <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-500/10 px-1 rounded">
                1:{signal.riskReward1}
              </span>
            </div>
            <span className="text-xl font-mono font-extrabold text-emerald-400 tabular-nums mt-1">
              {signal.takeProfit1.toFixed(decimals)}
            </span>
            <span className="text-[10px] font-mono text-emerald-300/70 mt-1">
              Gain: +{signal.pipsReward1} pips
            </span>
          </div>

          {/* TP 2 */}
          <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-xl p-3.5 flex flex-col">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400">
                Take Profit 2
              </span>
              <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-500/10 px-1 rounded">
                1:{signal.riskReward2}
              </span>
            </div>
            <span className="text-xl font-mono font-extrabold text-emerald-400 tabular-nums mt-1">
              {signal.takeProfit2.toFixed(decimals)}
            </span>
            <span className="text-[10px] font-mono text-emerald-300/70 mt-1">Weekly KL Target</span>
          </div>

          {/* TP 3 (Monthly Target) */}
          <div className="col-span-2 sm:col-span-1 bg-amber-950/30 border border-amber-500/40 rounded-xl p-3.5 flex flex-col">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 flex items-center gap-1">
                <Target className="w-3 h-3" /> TP 3 (Monthly)
              </span>
              <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-500/10 px-1 rounded">
                1:{signal.riskReward3}
              </span>
            </div>
            <span className="text-xl font-mono font-extrabold text-amber-400 tabular-nums mt-1">
              {signal.takeProfit3.toFixed(decimals)}
            </span>
            <span className="text-[10px] font-mono text-amber-300/70 mt-1 truncate">
              Macro Target Pool
            </span>
          </div>
        </div>

        {/* Dedicated Liquidity Target Pool & 5M CRT Engine Bar */}
        <div className="mb-4 rounded-xl border border-neutral-800 bg-[#090b11] p-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-neutral-800/80">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold block">
                  Active Liquidity Target Pool
                </span>
                <span className="text-sm font-bold text-amber-300 font-mono">
                  {signal.targetLiquidityName || 'Key Level Pool'} — {signal.targetLiquidityPrice ? signal.targetLiquidityPrice.toFixed(decimals) : '---'}
                </span>
              </div>
            </div>

            {/* 5M TS & 5M SMT Badges */}
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${
                  signal.fiveMinTsConfirmation
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/10'
                    : 'bg-neutral-900 text-slate-400 border-neutral-800'
                }`}
              >
                <Flame className={`w-3.5 h-3.5 ${signal.fiveMinTsConfirmation ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span>5M TS: {signal.fiveMinTsConfirmation ? 'DETECTED' : 'WAITING'}</span>
              </span>

              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${
                  signal.fiveMinSmtConfirmation
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/10'
                    : 'bg-neutral-900 text-slate-400 border-neutral-800'
                }`}
              >
                <Zap className={`w-3.5 h-3.5 ${signal.fiveMinSmtConfirmation ? 'text-amber-400' : 'text-slate-500'}`} />
                <span>5M SMT: {signal.fiveMinSmtConfirmation ? 'CONFIRMED' : 'WAITING'}</span>
              </span>
            </div>
          </div>

          {/* Completed Liquidity Levels Snapshot (PDH, PDL, PWH, PWL, PMH, PML) */}
          <div className="mt-3">
            <div className="text-[10px] font-mono uppercase text-slate-400 mb-2 flex items-center justify-between">
              <span>Authentic Historical Completed Bar Liquidity Pools</span>
              <span className="text-slate-400">{signal.targetLiquidityReason}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs font-mono">
              {/* PDH */}
              <div className={`p-2 rounded-lg border ${signal.targetLiquidityName === 'PDH' ? 'bg-cyan-500/15 border-cyan-400 text-cyan-200 ring-1 ring-cyan-400/30' : 'bg-neutral-900/60 border-neutral-800 text-slate-300'}`}>
                <div className="text-[10px] text-cyan-400 font-bold">PDH (Day High)</div>
                <div className="font-extrabold tabular-nums mt-0.5">{liq?.pdh ? liq.pdh.toFixed(decimals) : '---'}</div>
              </div>

              {/* PDL */}
              <div className={`p-2 rounded-lg border ${signal.targetLiquidityName === 'PDL' ? 'bg-cyan-500/15 border-cyan-400 text-cyan-200 ring-1 ring-cyan-400/30' : 'bg-neutral-900/60 border-neutral-800 text-slate-300'}`}>
                <div className="text-[10px] text-cyan-400 font-bold">PDL (Day Low)</div>
                <div className="font-extrabold tabular-nums mt-0.5">{liq?.pdl ? liq.pdl.toFixed(decimals) : '---'}</div>
              </div>

              {/* PWH */}
              <div className={`p-2 rounded-lg border ${signal.targetLiquidityName === 'PWH' ? 'bg-purple-500/15 border-purple-400 text-purple-200 ring-1 ring-purple-400/30' : 'bg-neutral-900/60 border-neutral-800 text-slate-300'}`}>
                <div className="text-[10px] text-purple-400 font-bold">PWH (Week High)</div>
                <div className="font-extrabold tabular-nums mt-0.5">{liq?.pwh ? liq.pwh.toFixed(decimals) : '---'}</div>
              </div>

              {/* PWL */}
              <div className={`p-2 rounded-lg border ${signal.targetLiquidityName === 'PWL' ? 'bg-purple-500/15 border-purple-400 text-purple-200 ring-1 ring-purple-400/30' : 'bg-neutral-900/60 border-neutral-800 text-slate-300'}`}>
                <div className="text-[10px] text-purple-400 font-bold">PWL (Week Low)</div>
                <div className="font-extrabold tabular-nums mt-0.5">{liq?.pwl ? liq.pwl.toFixed(decimals) : '---'}</div>
              </div>

              {/* PMH */}
              <div className={`p-2 rounded-lg border ${signal.targetLiquidityName === 'PMH' ? 'bg-amber-500/15 border-amber-400 text-amber-200 ring-1 ring-amber-400/30' : 'bg-neutral-900/60 border-neutral-800 text-slate-300'}`}>
                <div className="text-[10px] text-amber-400 font-bold">PMH (Month High)</div>
                <div className="font-extrabold tabular-nums mt-0.5">{liq?.pmh ? liq.pmh.toFixed(decimals) : '---'}</div>
              </div>

              {/* PML */}
              <div className={`p-2 rounded-lg border ${signal.targetLiquidityName === 'PML' ? 'bg-amber-500/15 border-amber-400 text-amber-200 ring-1 ring-amber-400/30' : 'bg-neutral-900/60 border-neutral-800 text-slate-300'}`}>
                <div className="text-[10px] text-amber-400 font-bold">PML (Month Low)</div>
                <div className="font-extrabold tabular-nums mt-0.5">{liq?.pml ? liq.pml.toFixed(decimals) : '---'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Required Confluence Checks in sequence: Monthly -> Weekly -> 1H -> 5M */}
        <div className="rounded-xl border border-neutral-800 bg-[#0a0c12] p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              Multi-Timeframe Confirmations Checklist
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              Strict Sequence Verification
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Monthly Direction */}
            <div className="p-3 rounded-lg bg-neutral-900/60 border border-neutral-800">
              <div className="flex items-center justify-between text-slate-400 font-mono text-[11px] mb-1">
                <span>1. Monthly Direction</span>
                {signal.monthlyDirection !== 'CONSOLIDATION' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                )}
              </div>
              <div className="font-bold text-slate-100 font-mono text-sm">
                {signal.monthlyDirection}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 truncate">
                TS: {signal.monthly.tsDetected ? 'Detected' : 'Model 1 Active'}
              </div>
            </div>

            {/* Weekly Direction & KL Return */}
            <div className="p-3 rounded-lg bg-neutral-900/60 border border-neutral-800">
              <div className="flex items-center justify-between text-slate-400 font-mono text-[11px] mb-1">
                <span>2. Weekly Key Level (KL)</span>
                {signal.weekly.priceReturnedToKL ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                )}
              </div>
              <div className="font-bold text-slate-100 font-mono text-sm">
                {signal.weekly.priceReturnedToKL ? 'KL RETURN CONFIRMED' : 'WAITING FOR KL RETEST'}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 truncate">
                Level: {signal.weekly.keyLevelPrice.toFixed(decimals)}
              </div>
            </div>

            {/* 1H Confirmation (Purge, OB, KL, TS, SMT) */}
            <div className="p-3 rounded-lg bg-neutral-900/60 border border-neutral-800">
              <div className="flex items-center justify-between text-slate-400 font-mono text-[11px] mb-1">
                <span>3. 1H Confluence</span>
                {signal.hourlyConfirmation ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                )}
              </div>
              <div className="font-bold text-slate-100 font-mono text-sm">
                {signal.hourlyConfirmation ? '1H CONDITIONS MET' : 'PENDING 1H PURGE'}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 truncate">
                Purge / TS: {signal.hourly.purgeDetected ? 'Purge Valid' : signal.hourly.tsDetected ? 'TS Valid' : 'Waiting'}
              </div>
            </div>

            {/* 5M SMT Model 1 Confirmation */}
            <div className="p-3 rounded-lg bg-neutral-900/60 border border-neutral-800">
              <div className="flex items-center justify-between text-slate-400 font-mono text-[11px] mb-1">
                <span>4. 5M SMT Model 1</span>
                {signal.fiveMinModel1Confirmation ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                )}
              </div>
              <div className="font-bold text-slate-100 font-mono text-sm">
                {signal.fiveMinModel1Confirmation ? 'SMT MODEL 1 VALID' : 'WAITING SMT DIVERGENCE'}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 truncate">
                Entry: {signal.fiveMin.entryConfirmed ? 'Trigger Closed' : 'Waiting Candle'}
              </div>
            </div>
          </div>
        </div>

        {/* Diagnostic Summary Message */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-black/60 border border-neutral-800 text-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-slate-300 font-mono">
              {signal.summaryMessage}
            </span>
          </div>

          <button
            onClick={onOpenAiAudit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-semibold font-mono text-[11px] transition-colors whitespace-nowrap shrink-0"
          >
            <span>Deep CRT Audit</span>
          </button>
        </div>

        {/* Live Market Data Provider & Timestamp Audit Trail */}
        <div className="mt-3 pt-3 border-t border-neutral-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Market Provider:</span>
            <strong className="text-slate-200">
              {signal.dataProvider || instrumentInfo.dataProvider}
            </strong>
            <span className="text-neutral-600">·</span>
            <span>Ticker:</span>
            <strong className="text-amber-400/90">
              {signal.apiSymbol || instrumentInfo.apiSymbol}
            </strong>
          </div>

          <div className="flex items-center gap-2 text-slate-400">
            <span>Last Updated:</span>
            <span className="text-slate-200">
              {signal.lastUpdatedIso
                ? new Date(signal.lastUpdatedIso).toLocaleTimeString()
                : new Date(signal.timestamp).toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
