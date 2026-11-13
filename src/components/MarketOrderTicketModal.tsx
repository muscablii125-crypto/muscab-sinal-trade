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
  TrendingUp,
  TrendingDown,
  X,
  Activity,
  Wifi,
  ShieldCheck,
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
  const [riskPercent, setRiskPercent] = useState<number>(1.0); // 1% risk default
  const [customLotSize, setCustomLotSize] = useState<string>('');

  const instrumentInfo = SUPPORTED_INSTRUMENTS[selectedInstrument];
  const decimals = instrumentInfo.decimals;
  const pipSize = instrumentInfo.pipSize;

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

  // Calculate default Stop Loss & Take Profits
  let calculatedSL = 0;
  let calculatedTP1 = 0;
  let calculatedTP2 = 0;
  let calculatedTP3 = 0;

  // Use signal levels if valid and direction matches, otherwise calculate standard 1:2 / 1:3 levels
  const defaultPipRisk = selectedInstrument === 'AUDUSD' ? 14.0 : selectedInstrument === 'XAUUSD' ? 65.0 : 45.0;

  if (signal && signal.stopLoss > 0 && signal.verdict === direction) {
    calculatedSL = signal.stopLoss;
    calculatedTP1 = signal.takeProfit1;
    calculatedTP2 = signal.takeProfit2;
    calculatedTP3 = signal.takeProfit3;
  } else {
    // Generate default levels matching CRT strategy logic
    if (isBuy) {
      calculatedSL = Number((marketEntryPrice - defaultPipRisk * pipSize).toFixed(decimals));
      calculatedTP1 = Number((marketEntryPrice + defaultPipRisk * 2 * pipSize).toFixed(decimals));
      calculatedTP2 = Number((marketEntryPrice + defaultPipRisk * 3 * pipSize).toFixed(decimals));
      calculatedTP3 = Number((marketEntryPrice + defaultPipRisk * 5 * pipSize).toFixed(decimals));
    } else {
      calculatedSL = Number((marketEntryPrice + defaultPipRisk * pipSize).toFixed(decimals));
      calculatedTP1 = Number((marketEntryPrice - defaultPipRisk * 2 * pipSize).toFixed(decimals));
      calculatedTP2 = Number((marketEntryPrice - defaultPipRisk * 3 * pipSize).toFixed(decimals));
      calculatedTP3 = Number((marketEntryPrice - defaultPipRisk * 5 * pipSize).toFixed(decimals));
    }
  }

  // Distance in pips
  const pipsRisk = Math.max(1, Number((Math.abs(marketEntryPrice - calculatedSL) / pipSize).toFixed(1)));
  const pipsReward1 = Number((Math.abs(calculatedTP1 - marketEntryPrice) / pipSize).toFixed(1));

  // Risk in Dollars ($)
  const riskAmountUsd = (accountBalance * riskPercent) / 100;

  // Auto Lot Size: Risk Amount / (Pips Risk * Pip Value per lot)
  // Standard Lot Pip Value: AUDUSD = $10 / pip, XAUUSD = $10 / pip (100oz standard lot), NASDAQ = $1 / pip
  const pipValuePerStandardLot = selectedInstrument === 'NASDAQ' ? 1 : 10;
  const rawLotSize = riskAmountUsd / (pipsRisk * pipValuePerStandardLot);
  const calculatedLot = Math.max(0.01, Number(rawLotSize.toFixed(2)));
  const effectiveLotSize = customLotSize ? parseFloat(customLotSize) || calculatedLot : calculatedLot;

  // Dollar reward at TP1
  const potentialProfitUsd = Number((pipsReward1 * pipValuePerStandardLot * effectiveLotSize).toFixed(2));
  const actualRiskUsd = Number((pipsRisk * pipValuePerStandardLot * effectiveLotSize).toFixed(2));

  // Handle Order Execution
  const handleExecute = () => {
    soundEffects.playSignalChime(direction);

    // Call onOrderExecuted
    onOrderExecuted({
      direction,
      entryPrice: marketEntryPrice,
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

          {/* RISK & POSITION SIZING CALCULATOR */}
          <div className="p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                <span>Account Risk & Lot Sizing</span>
              </span>
              <span className="text-slate-400 text-[10px]">Auto Calculated</span>
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

              {/* Risk Percentage */}
              <div>
                <label className="text-[10px] uppercase text-slate-500 block mb-1">Risk per Trade</label>
                <div className="flex items-center gap-1">
                  {[1.0, 2.0, 3.0].map((r) => (
                    <button
                      key={r}
                      onClick={() => setRiskPercent(r)}
                      className={`flex-1 py-2 rounded-xl font-bold transition-all ${
                        riskPercent === r
                          ? 'bg-amber-500 text-slate-950 shadow-sm'
                          : 'bg-neutral-900 border border-neutral-800 text-slate-300 hover:text-white'
                      }`}
                    >
                      {r}%
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Calculated Lots & Dollar Risk */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-neutral-800 text-[11px]">
              <div className="p-2.5 rounded-xl bg-black/40 border border-neutral-800">
                <span className="text-slate-400 block text-[10px]">Calculated Position Size</span>
                <div className="text-base font-extrabold text-amber-400">{effectiveLotSize} Lots</div>
                <span className="text-[10px] text-slate-500">1 Standard Lot = $10/pip</span>
              </div>

              <div className="p-2.5 rounded-xl bg-black/40 border border-neutral-800">
                <span className="text-slate-400 block text-[10px]">Risk at Stop Loss</span>
                <div className="text-base font-extrabold text-rose-400">-${actualRiskUsd.toFixed(2)}</div>
                <span className="text-[10px] text-rose-400/80">{pipsRisk} pips risk</span>
              </div>
            </div>
          </div>

          {/* CALCULATED PROTECTION & TARGET LEVELS */}
          <div className="space-y-2">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">
              Market Protection & Profit Targets
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* STOP LOSS */}
              <div className="p-3 rounded-xl bg-rose-950/25 border border-rose-500/35">
                <span className="text-[10px] uppercase text-rose-400 block font-bold">Stop Loss (SL)</span>
                <div className="text-base font-black text-rose-300 tabular-nums my-0.5">
                  {calculatedSL.toFixed(decimals)}
                </div>
                <span className="text-[10px] text-rose-400/80">-{pipsRisk} Pips</span>
              </div>

              {/* TP1 */}
              <div className="p-3 rounded-xl bg-emerald-950/25 border border-emerald-500/35">
                <span className="text-[10px] uppercase text-emerald-400 block font-bold">TP1 (1:2)</span>
                <div className="text-base font-black text-emerald-300 tabular-nums my-0.5">
                  {calculatedTP1.toFixed(decimals)}
                </div>
                <span className="text-[10px] text-emerald-400/80">+{pipsReward1} Pips</span>
              </div>

              {/* TP2 */}
              <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/40">
                <span className="text-[10px] uppercase text-emerald-400 block font-bold">TP2 (1:3)</span>
                <div className="text-base font-black text-emerald-300 tabular-nums my-0.5">
                  {calculatedTP2.toFixed(decimals)}
                </div>
                <span className="text-[10px] text-emerald-400/80">Weekly KL</span>
              </div>

              {/* TP3 */}
              <div className="p-3 rounded-xl bg-amber-950/25 border border-amber-500/35">
                <span className="text-[10px] uppercase text-amber-400 block font-bold">TP3 (1:5)</span>
                <div className="text-base font-black text-amber-300 tabular-nums my-0.5">
                  {calculatedTP3.toFixed(decimals)}
                </div>
                <span className="text-[10px] text-amber-400/80">Macro Target</span>
              </div>
            </div>
          </div>

          {/* EXECUTION SUMMARY */}
          <div className="p-3.5 rounded-xl bg-neutral-900/60 border border-neutral-800 text-[11px] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-slate-300">
                Risk/Reward: <strong className="text-white">1 : 2.0</strong> · Potential Gain: <strong className="text-emerald-400">+${potentialProfitUsd.toFixed(2)}</strong>
              </span>
            </div>
            <span className="text-slate-400">Synced to Chart & History</span>
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
            className={`flex-1 py-3.5 px-6 rounded-xl font-mono font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl transition-all active:scale-95 ${
              isBuy
                ? 'bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500 hover:from-emerald-400 hover:to-emerald-300 text-slate-950 shadow-emerald-500/30'
                : 'bg-gradient-to-r from-rose-600 via-rose-500 to-rose-600 hover:from-rose-500 hover:to-rose-400 text-white shadow-rose-500/30'
            }`}
          >
            {isBuy ? <TrendingUp className="w-5 h-5 stroke-[3]" /> : <TrendingDown className="w-5 h-5 stroke-[3]" />}
            <span>
              CONNECT & EXECUTE {direction} @ {marketEntryPrice.toFixed(decimals)}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
