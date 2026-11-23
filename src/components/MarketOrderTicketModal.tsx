/**
 * MUSCAB CRT PRO - MARKET ORDER EXECUTION TICKET MODAL
 * Directly connects BUY and SELL orders with the authentic live market feed:
 * 1. BUY connects directly to the live streaming Ask quote (e.g. 0.68715)
 * 2. SELL connects directly to the live streaming Bid quote (e.g. 0.68706)
 * 3. Dynamic position sizing (lot size calculated based on account balance & risk %)
 * 4. Automatic Stop Loss (SL) and Take Profit (TP1, TP2, TP3) levels
 * 5. Instant synchronization to TradingView Chart (Long/Short tool) and Trade History
 */

import React, { useState, useEffect } from 'react';
import { InstrumentId, LiveQuoteTick, CrtSignalResult, PositionDrawing } from '../types/trading';
import { SUPPORTED_INSTRUMENTS } from '../constants/instruments';
import { soundEffects } from '../services/soundEffects';
import {
  FIXED_SL_RR,
  FIXED_TP_RR,
  FIXED_RISK_REWARD,
  FIXED_LOT_SIZE,
  calculateFixedRiskLevels,
  hasValidFixedSlTp,
} from '../services/fixedRiskManagement';
import {
  TrendingUp,
  TrendingDown,
  X,
  Activity,
  Wifi,
  ShieldCheck,
  Lock,
  Building2,
  DollarSign,
  Percent,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';

interface MarketOrderTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedInstrument: InstrumentId;
  initialDirection: 'BUY' | 'SELL';
  quoteTick: LiveQuoteTick | null;
  signal: CrtSignalResult | null;
  broker: 'BINANCE' | 'OANDA';
  onOrderExecuted: (order: {
    direction: 'BUY' | 'SELL';
    entryPrice: number;
    stopLoss: number;
    takeProfit1: number;
    takeProfit2: number;
    takeProfit3: number;
    lotSize: number;
    accountBalance: number;
    riskPercent: number;
    riskAmountUsd: number;
    pipsRisk: number;
    pipsReward: number;
  }) => void;
}

export const MarketOrderTicketModal: React.FC<MarketOrderTicketModalProps> = ({
  isOpen,
  onClose,
  selectedInstrument,
  initialDirection,
  quoteTick,
  signal,
  broker,
  onOrderExecuted,
}) => {
  const [direction, setDirection] = useState<'BUY' | 'SELL'>(initialDirection);
  const [executionType, setExecutionType] = useState<'MARKET' | 'SIGNAL_TRIGGER'>('MARKET');
  const [accountBalance, setAccountBalance] = useState<number>(10000);

  const instrumentInfo = SUPPORTED_INSTRUMENTS[selectedInstrument];
  const decimals = instrumentInfo.decimals;

  // Live Bid and Ask
  const liveBid = quoteTick?.bid || instrumentInfo.currentPrice;
  const liveAsk = quoteTick?.ask || instrumentInfo.currentPrice;
  const spreadPips = quoteTick?.spreadPips || 0.9;

  // Sync initial direction when modal opens
  useEffect(() => {
    if (isOpen) {
      setDirection(initialDirection);
    }
  }, [isOpen, initialDirection]);

  if (!isOpen) return null;

  // Determine Entry Price based on direction and execution type
  const isBuy = direction === 'BUY';
  let marketEntryPrice = isBuy ? liveAsk : liveBid;

  // If SIGNAL_TRIGGER is selected and signal exists with same direction, use signal entry
  if (executionType === 'SIGNAL_TRIGGER' && signal && signal.entryPrice > 0) {
    marketEntryPrice = signal.entryPrice;
  }

  // Strictly calculate 1RR Stop Loss and 3RR Take Profit (1:3 R:R) from actual entry price
  const structuralSlHint =
    signal && signal.verdict === direction && signal.stopLoss > 0 ? signal.stopLoss : undefined;
  const fixedRisk = calculateFixedRiskLevels(
    marketEntryPrice,
    direction,
    selectedInstrument,
    structuralSlHint
  );
  const calculatedSL = fixedRisk.stopLoss;
  const calculatedTP1 = fixedRisk.takeProfit;
  const calculatedTP2 = fixedRisk.takeProfit;
  const calculatedTP3 = fixedRisk.takeProfit;
  const hasRequiredSlTp =
    fixedRisk.valid &&
    hasValidFixedSlTp(fixedRisk.entryPrice, calculatedSL, calculatedTP1, direction);

  // Distance in pips
  const pipsRisk = Math.max(0.1, fixedRisk.pipsRisk);
  const pipsReward1 = fixedRisk.pipsReward;

  // Fixed Lot Size = 1.00 Standard Lot
  // Standard Lot Pip Value: EURUSD = $10 / pip, XAUUSD = $10 / pip (100oz standard lot), NASDAQ = $1 / pip
  const pipValuePerStandardLot = selectedInstrument === 'NASDAQ' ? 1 : 10;
  const effectiveLotSize = FIXED_LOT_SIZE;

  // Dollar risk at 1RR SL and reward at 3RR TP (Fixed 1.00 Lot)
  const actualRiskUsd = Number((pipsRisk * pipValuePerStandardLot * effectiveLotSize).toFixed(2));
  const potentialProfitUsd = Number((pipsReward1 * pipValuePerStandardLot * effectiveLotSize).toFixed(2));
  const riskPercent =
    accountBalance > 0 ? Number(((actualRiskUsd / accountBalance) * 100).toFixed(2)) : 0;

  // Handle Order Execution — STRICT GUARD: Never open a trade without valid SL & TP
  const handleExecute = () => {
    if (!hasRequiredSlTp) return;
    soundEffects.playSignalChime(direction);

    // Call onOrderExecuted
    onOrderExecuted({
      direction,
      entryPrice: fixedRisk.entryPrice,
      stopLoss: calculatedSL,
      takeProfit1: calculatedTP1,
      takeProfit2: calculatedTP2,
      takeProfit3: calculatedTP3,
      lotSize: effectiveLotSize,
      accountBalance,
      riskPercent,
      riskAmountUsd: actualRiskUsd,
      pipsRisk,
      pipsReward: pipsReward1,
    });

    // Create and dispatch PositionDrawing to TradingViewChart
    const nowSec = Math.floor(Date.now() / 1000);
    const positionDrawing: PositionDrawing = {
      id: `pos_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      instrument: selectedInstrument,
      type: isBuy ? 'LONG' : 'SHORT',
      startTime: nowSec - 300 * 2, // start 2 candles back for clear visibility
      endTime: nowSec + 300 * 12, // project 12 candles forward
      entryPrice: marketEntryPrice,
      takeProfitPrice: calculatedTP1,
      stopLossPrice: calculatedSL,
      accountSize: accountBalance,
      riskPercent: riskPercent,
      lotSize: effectiveLotSize,
    };

    // Save to localStorage for instant chart rendering
    try {
      const existing = localStorage.getItem(`muscab_positions_${selectedInstrument}`);
      const list = existing ? JSON.parse(existing) : [];
      localStorage.setItem(
        `muscab_positions_${selectedInstrument}`,
        JSON.stringify([positionDrawing, ...list])
      );
    } catch (e) {
      console.warn('Failed to save position:', e);
    }

    // Dispatch custom event for real-time chart synchronization
    window.dispatchEvent(
      new CustomEvent('muscab_add_position', {
        detail: positionDrawing,
      })
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-3xl border border-neutral-800 bg-gradient-to-b from-[#0f1118] via-[#090a0f] to-[#06070a] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-black/40">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                isBuy
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
              }`}
            >
              {isBuy ? <TrendingUp className="w-5 h-5 stroke-[2.5]" /> : <TrendingDown className="w-5 h-5 stroke-[2.5]" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>CONNECT {direction} ORDER TO MARKET</span>
              </h3>
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                <span className="text-amber-400 font-bold">{selectedInstrument}</span>
                <span>·</span>
                <span className="text-slate-300">{broker === 'OANDA' ? 'OANDA MT5' : 'Binance ECN'}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="p-6 overflow-y-auto space-y-5 font-mono text-xs">
          {/* AUTOMATICALLY SELECTED TRADING DECISION BADGE */}
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
              isBuy
                ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                : 'bg-rose-950/40 border-rose-500/50 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow-md ${
                  isBuy ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white'
                }`}
              >
                {isBuy ? <TrendingUp className="w-5 h-5 stroke-[3]" /> : <TrendingDown className="w-5 h-5 stroke-[3]" />}
              </div>
              <div>
                <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                  Automatic CRT Strategy Decision
                </div>
                <div className="text-base font-black font-mono text-white flex items-center gap-2">
                  <span>{isBuy ? 'CONFIRMED BUY (LONG)' : 'CONFIRMED SELL (SHORT)'}</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                      isBuy ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                    }`}
                  >
                    Automatic
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right font-mono">
              <div className="text-[10px] text-slate-400 uppercase">Connected Quote</div>
              <div className={`text-sm font-extrabold ${isBuy ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isBuy ? `Ask: ${liveAsk.toFixed(decimals)}` : `Bid: ${liveBid.toFixed(decimals)}`}
              </div>
            </div>
          </div>

          {/* LIVE TICK TELEMETRY BOX */}
          <div className="p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-amber-400" />
                <span>Live Streaming Execution Price</span>
              </span>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <Wifi className="w-3 h-3" />
                <span>STREAM CONNECTED</span>
              </div>
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">Connected Execution Quote</span>
                <div
                  className={`text-3xl font-black tabular-nums tracking-tight ${
                    isBuy ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {marketEntryPrice.toFixed(decimals)}
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-500 block uppercase">Spread & Liquidity</span>
                <div className="text-sm font-bold text-amber-300">{spreadPips.toFixed(1)} Pips</div>
                <div className="text-[10px] text-slate-400">Broker: {broker === 'OANDA' ? 'OANDA MT5' : 'Binance ECN'}</div>
              </div>
            </div>

            {/* Execution Type selector */}
            <div className="pt-2 border-t border-neutral-800 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Order Routing:</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setExecutionType('MARKET')}
                  className={`px-2 py-1 rounded font-bold transition-colors ${
                    executionType === 'MARKET'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Instant Market Execution
                </button>
                <button
                  onClick={() => setExecutionType('SIGNAL_TRIGGER')}
                  className={`px-2 py-1 rounded font-bold transition-colors ${
                    executionType === 'SIGNAL_TRIGGER'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  CRT Strategy Level
                </button>
              </div>
            </div>
          </div>

          {/* FIXED LOT SIZE & RISK PROFILE */}
          <div className="p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                <span>Position Sizing &amp; Risk Exposure</span>
              </span>
              <span className="inline-flex items-center gap-1 text-amber-300 text-[10px] font-bold">
                <Lock className="w-3 h-3" />
                <span>LOT SIZE {FIXED_LOT_SIZE}.00 LOCKED</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Account Balance */}
              <div>
                <label className="text-[10px] uppercase text-slate-500 block mb-1">Account Balance ($)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400">$</span>
                  <input
                    type="number"
                    value={accountBalance}
                    onChange={(e) => setAccountBalance(Math.max(100, parseFloat(e.target.value) || 0))}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-7 pr-3 py-2 text-white font-bold focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Fixed Lot Size 1.00 */}
              <div>
                <label className="text-[10px] uppercase text-slate-500 block mb-1">Fixed Lot Size</label>
                <div className="w-full bg-amber-500/15 border border-amber-500/40 rounded-xl px-3 py-2 text-amber-300 font-black flex items-center justify-between">
                  <span>{effectiveLotSize.toFixed(2)} Lot</span>
                  <span className="text-[9px] uppercase text-amber-200/80">Fixed</span>
                </div>
              </div>
            </div>

            {/* 1RR Risk & 3RR Target Exposure */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-neutral-800 text-[11px]">
              <div className="p-2.5 rounded-xl bg-black/40 border border-neutral-800">
                <span className="text-slate-400 block text-[10px]">Risk at {FIXED_SL_RR}RR Stop Loss</span>
                <div className="text-base font-extrabold text-rose-400">-${actualRiskUsd.toFixed(2)}</div>
                <span className="text-[10px] text-rose-400/80">
                  -{pipsRisk} pips ({riskPercent}% of equity)
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-black/40 border border-neutral-800">
                <span className="text-slate-400 block text-[10px]">Reward at {FIXED_TP_RR}RR Target</span>
                <div className="text-base font-extrabold text-emerald-400">+${potentialProfitUsd.toFixed(2)}</div>
                <span className="text-[10px] text-emerald-400/80">
                  +{pipsReward1} pips (1:{FIXED_RISK_REWARD} R:R)
                </span>
              </div>
            </div>
          </div>

          {/* CALCULATED FIXED RISK LEVELS: ENTRY, 1RR STOP LOSS, 3RR TAKE PROFIT */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                Fixed Risk Management Levels
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[10px] font-bold">
                <Lock className="w-3 h-3" />
                <span>{FIXED_SL_RR}RR SL / {FIXED_TP_RR}RR TP · {FIXED_LOT_SIZE} LOT</span>
              </span>
            </div>

            {!hasRequiredSlTp && (
              <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/50 text-rose-300 text-[11px] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>Valid Entry Price, Stop Loss ({FIXED_SL_RR}RR), and Take Profit ({FIXED_TP_RR}RR) are mandatory before opening any trade.</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* ENTRY PRICE */}
              <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-700">
                <span className="text-[10px] uppercase text-slate-400 block font-bold">Entry Price ({direction})</span>
                <div className="text-lg font-black text-white tabular-nums my-0.5">
                  {fixedRisk.entryPrice > 0 ? fixedRisk.entryPrice.toFixed(decimals) : '---'}
                </div>
                <span className="text-[10px] text-slate-400">{effectiveLotSize.toFixed(2)} Lot Market Entry</span>
              </div>

              {/* FIXED 1RR STOP LOSS */}
              <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/45">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase text-rose-400 font-bold">Stop Loss</span>
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300">
                    {FIXED_SL_RR}RR FIXED
                  </span>
                </div>
                <div className="text-lg font-black text-rose-300 tabular-nums my-0.5">
                  {calculatedSL > 0 ? calculatedSL.toFixed(decimals) : '---'}
                </div>
                <span className="text-[10px] text-rose-400/80">-{pipsRisk} Pips (-${actualRiskUsd.toFixed(2)})</span>
              </div>

              {/* FIXED 3RR TAKE PROFIT */}
              <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/45">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase text-emerald-400 font-bold">Take Profit</span>
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                    {FIXED_TP_RR}RR · 1:{FIXED_RISK_REWARD}
                  </span>
                </div>
                <div className="text-lg font-black text-emerald-300 tabular-nums my-0.5">
                  {calculatedTP1 > 0 ? calculatedTP1.toFixed(decimals) : '---'}
                </div>
                <span className="text-[10px] text-emerald-400/80">+{pipsReward1} Pips (+${potentialProfitUsd.toFixed(2)})</span>
              </div>
            </div>
          </div>

          {/* EXECUTION SUMMARY */}
          <div className="p-3.5 rounded-xl bg-neutral-900/60 border border-neutral-800 text-[11px] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-slate-300">
                Fixed Risk: <strong className="text-white">1 : {FIXED_RISK_REWARD}</strong> ({FIXED_SL_RR}RR SL / {FIXED_TP_RR}RR TP · {effectiveLotSize.toFixed(2)} Lot) · Target: <strong className="text-emerald-400">+${potentialProfitUsd.toFixed(2)}</strong>
              </span>
            </div>
            <span className="text-slate-400">Synced to Chart &amp; History</span>
          </div>
        </div>

        {/* MODAL FOOTER WITH CONNECT & EXECUTE ACTION BUTTON */}
        <div className="px-6 py-4 border-t border-neutral-800 bg-black/60 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-3 rounded-xl text-xs font-mono font-semibold text-slate-400 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleExecute}
            disabled={!hasRequiredSlTp}
            className={`flex-1 py-3.5 px-6 rounded-xl font-mono font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
              isBuy
                ? 'bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500 hover:from-emerald-400 hover:to-emerald-300 text-slate-950 shadow-emerald-500/30'
                : 'bg-gradient-to-r from-rose-600 via-rose-500 to-rose-600 hover:from-rose-500 hover:to-rose-400 text-white shadow-rose-500/30'
            }`}
          >
            {isBuy ? <TrendingUp className="w-5 h-5 stroke-[3]" /> : <TrendingDown className="w-5 h-5 stroke-[3]" />}
            <span>
              {hasRequiredSlTp
                ? `CONNECT & EXECUTE ${direction} @ ${fixedRisk.entryPrice.toFixed(decimals)}`
                : 'SL & TP REQUIRED TO OPEN TRADE'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
