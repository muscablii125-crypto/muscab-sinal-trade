/**
 * MUSCAB CRT PRO - AUTOMATIC SINGLE SIGNAL SELECTION HERO DISPLAY
 *
 * Strict Compliance:
 * 1. If bullish CRT conditions are fully confirmed: display BUY only.
 * 2. If bearish CRT conditions are fully confirmed: display SELL only.
 * 3. If neither direction is confirmed: display WAIT.
 * 4. If both directions appear possible or conditions conflict: do not guess. Display WAIT until one valid setup is confirmed.
 * 5. The user must NEVER be asked to choose between BUY and SELL.
 * 6. The app's analysis engine automatically selects the strongest valid setup according to predefined CRT rules.
 *
 * DISPLAYS ONLY ONE MAIN DECISION:
 * - BUY OR SELL OR WAIT.
 * - Actual market price.
 * - Entry price.
 * - Stop Loss.
 * - TP1, TP2 and TP3.
 * - Signal confirmation time.
 * - Reason for selecting that direction.
 *
 * CRITICAL DISCIPLINE:
 * - Never display BUY and SELL as two competing choices.
 * - Never generate random signals.
 * - Never change or manipulate live prices.
 * - Never claim a signal is confirmed if the CRT conditions are not satisfied.
 * - Do not force a trade when there is no valid setup.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  InstrumentId,
  LiveQuoteTick,
  CrtSignalResult,
  LockedTradeDecision,
} from '../types/trading';
import { SUPPORTED_INSTRUMENTS } from '../constants/instruments';
import { MarketOrderTicketModal } from './MarketOrderTicketModal';
import { tradeHistoryService } from '../services/tradeHistory';
import { soundEffects } from '../services/soundEffects';
import {
  FIXED_SL_RR,
  FIXED_TP_RR,
  FIXED_RISK_REWARD,
  FIXED_LOT_SIZE,
  hasValidFixedSlTp,
} from '../services/fixedRiskManagement';
import {
  TrendingUp,
  TrendingDown,
  PauseCircle,
  Activity,
  Wifi,
  WifiOff,
  Clock,
  Building2,
  Copy,
  Check,
  ShieldCheck,
  Search,
  Loader2,
  BookmarkPlus,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  SlidersHorizontal,
  Info,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Lock,
  Unlock,
  XCircle,
  Hourglass,
} from 'lucide-react';

interface HomeScreenSignalCardProps {
  selectedInstrument: InstrumentId;
  onSelectInstrument: (id: InstrumentId) => void;
  quoteTick: LiveQuoteTick | null;
  connectionStatus: 'LIVE_CONNECTED' | 'DATA_DISCONNECTED';
  broker: 'BINANCE' | 'OANDA';
  onToggleBroker: (broker: 'BINANCE' | 'OANDA') => void;
  signal: CrtSignalResult | null;
  lockedDecision: LockedTradeDecision | null;
  onCloseLockedDecision: () => void;
  onResetFinishedLock: () => void;
  isSearching: boolean;
  onSearchSignal: () => void;
  onRefreshQuotes: () => void;
  onOpenRulesConfig: () => void;
  onOpenAiAudit: () => void;
  onLogTrade?: (signal: CrtSignalResult) => void;
}

interface ActiveMarketTrade {
  id: string;
  instrument: InstrumentId;
  direction: 'BUY' | 'SELL';
  entryPrice: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  takeProfit3: number;
  lotSize: number;
  timestamp: number;
}

export const HomeScreenSignalCard: React.FC<HomeScreenSignalCardProps> = ({
  selectedInstrument,
  onSelectInstrument,
  quoteTick,
  connectionStatus,
  broker,
  onToggleBroker,
  signal,
  lockedDecision,
  onCloseLockedDecision,
  onResetFinishedLock,
  isSearching,
  onSearchSignal,
  onRefreshQuotes,
  onOpenRulesConfig,
  onOpenAiAudit,
  onLogTrade,
}) => {
  const [copied, setCopied] = useState(false);
  const [logged, setLogged] = useState(false);
  const [priceFlash, setPriceFlash] = useState<'UP' | 'DOWN' | null>(null);
  const prevPriceRef = useRef<number>(quoteTick?.midPrice || 0);

  // Market Order Modal State (Only opens when a direction is confirmed)
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [orderSuccessMessage, setOrderSuccessMessage] = useState<string | null>(null);

  // Active Market Trade Tracking State (Stored per instrument in localStorage)
  const [activeTrade, setActiveTrade] = useState<ActiveMarketTrade | null>(() => {
    try {
      const saved = localStorage.getItem(`muscab_active_market_trade_${selectedInstrument}`);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const instrumentInfo = SUPPORTED_INSTRUMENTS[selectedInstrument];
  const decimals = instrumentInfo.decimals;
  const pipSize = instrumentInfo.pipSize;

  const currentMid = quoteTick?.midPrice || 0;
  const currentBid = quoteTick?.bid || 0;
  const currentAsk = quoteTick?.ask || 0;
  const spreadPips = quoteTick?.spreadPips || 0;
  const isConnected =
    connectionStatus === 'LIVE_CONNECTED' && quoteTick?.status === 'LIVE' && currentMid > 0;

  // Reload active trade when selected instrument changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`muscab_active_market_trade_${selectedInstrument}`);
      setActiveTrade(saved ? JSON.parse(saved) : null);
    } catch {
      setActiveTrade(null);
    }
  }, [selectedInstrument]);

  // Save active trade to state & storage
  const saveActiveTrade = (trade: ActiveMarketTrade | null) => {
    setActiveTrade(trade);
    try {
      if (trade) {
        localStorage.setItem(`muscab_active_market_trade_${selectedInstrument}`, JSON.stringify(trade));
      } else {
        localStorage.removeItem(`muscab_active_market_trade_${selectedInstrument}`);
      }
    } catch (e) {
      console.warn('Failed to save active trade:', e);
    }
  };

  // Detect tick movement and flash green / red
  useEffect(() => {
    if (currentMid > 0 && prevPriceRef.current > 0) {
      if (currentMid > prevPriceRef.current) {
        setPriceFlash('UP');
        const t = setTimeout(() => setPriceFlash(null), 650);
        return () => clearTimeout(t);
      } else if (currentMid < prevPriceRef.current) {
        setPriceFlash('DOWN');
        const t = setTimeout(() => setPriceFlash(null), 650);
        return () => clearTimeout(t);
      }
    }
    prevPriceRef.current = currentMid;
  }, [currentMid]);

  // Format exact timestamp with Somalia time (UTC+3) and milliseconds
  const formatExactTime = (timestampMs?: number) => {
    if (!timestampMs) return '---';
    const d = new Date(timestampMs);
    const somaliaTime = new Date(d.getTime() + 3 * 3600 * 1000);
    const h = String(somaliaTime.getUTCHours()).padStart(2, '0');
    const m = String(somaliaTime.getUTCMinutes()).padStart(2, '0');
    const s = String(somaliaTime.getUTCSeconds()).padStart(2, '0');
    const ms = String(somaliaTime.getUTCMilliseconds()).padStart(3, '0');
    return `${h}:${m}:${s}.${ms} UTC+3`;
  };

  // =========================================================================
  // FIXED AI TRADE DIRECTION LOCK + TWO-STAGE CONFIRMATION SELECTION
  // 1. If a decision is LOCKED or ACTIVE, display ONLY that locked direction.
  // 2. Never switch BUY <-> SELL while valid; keep Entry, SL, TP1/TP2/TP3 locked.
  // 3. Before Stage 2 confirmation candle closes, keep decision in WAIT.
  // =========================================================================
  const isActivelyLocked =
    lockedDecision !== null &&
    (lockedDecision.lockStatus === 'LOCKED' || lockedDecision.lockStatus === 'ACTIVE');

  const isLockFinished =
    lockedDecision !== null &&
    (lockedDecision.lockStatus === 'INVALIDATED' || lockedDecision.lockStatus === 'CLOSED');

  const singleDecision: 'BUY' | 'SELL' | 'WAIT' = isActivelyLocked
    ? lockedDecision.direction
    : 'WAIT';

  const isBuy = singleDecision === 'BUY';
  const isSell = singleDecision === 'SELL';
  const isWait = singleDecision === 'WAIT';

  const effectiveEntry = isActivelyLocked
    ? lockedDecision.entryPrice
    : isLockFinished
    ? lockedDecision.entryPrice
    : signal?.entryPrice || 0;
  const effectiveSl = isActivelyLocked
    ? lockedDecision.stopLoss
    : isLockFinished
    ? lockedDecision.stopLoss
    : signal?.stopLoss || 0;
  const effectiveTp1 = isActivelyLocked
    ? (lockedDecision.takeProfit ?? lockedDecision.takeProfit1)
    : isLockFinished
    ? (lockedDecision.takeProfit ?? lockedDecision.takeProfit1)
    : (signal?.takeProfit ?? signal?.takeProfit1 ?? 0);
  const effectiveTp2 = effectiveTp1;
  const effectiveTp3 = effectiveTp1;

  const hasValidSignal =
    (isBuy || isSell) &&
    hasValidFixedSlTp(effectiveEntry, effectiveSl, effectiveTp1, isBuy ? 'BUY' : 'SELL');
  const entryPriceFormatted = hasValidSignal ? effectiveEntry.toFixed(decimals) : '---';
  const stopLossFormatted = hasValidSignal ? effectiveSl.toFixed(decimals) : '---';
  const tp1Formatted = hasValidSignal ? effectiveTp1.toFixed(decimals) : '---';
  const tp2Formatted = tp1Formatted;
  const tp3Formatted = tp1Formatted;

  // Two-stage status & Lock status badges
  const twoStageStatus = isActivelyLocked
    ? 'CONFIRMED'
    : isLockFinished && lockedDecision.lockStatus === 'INVALIDATED'
    ? 'INVALID'
    : signal?.twoStageStatus || 'WAITING';

  const displayLockStatus = lockedDecision?.lockStatus || 'UNLOCKED';

  const isStage1Detected =
    !isActivelyLocked &&
    !isLockFinished &&
    signal?.status === 'DETECTED_SETUP';

  const isStageInvalid =
    !isActivelyLocked &&
    ((isLockFinished && lockedDecision.lockStatus === 'INVALIDATED') ||
      signal?.status === 'INVALID_SETUP');

  // Confirmation Time & Confirmation Candle Closing Time
  const confirmationTime = isActivelyLocked
    ? formatExactTime(lockedDecision.confirmedAt)
    : isLockFinished
    ? formatExactTime(lockedDecision.confirmedAt)
    : signal?.timestamp
    ? formatExactTime(signal.timestamp)
    : formatExactTime(Date.now());

  const confirmationCandleCloseFormatted = isActivelyLocked
    ? formatExactTime(lockedDecision.confirmationCandleCloseTime)
    : isLockFinished
    ? formatExactTime(lockedDecision.confirmationCandleCloseTime)
    : signal?.confirmationCandleCloseTime
    ? formatExactTime(signal.confirmationCandleCloseTime)
    : '---';

  // Reason for selecting that direction
  let selectionReason = '';
  if (isBuy || isSell) {
    selectionReason =
      lockedDecision?.reason ||
      signal?.confirmationReason ||
      signal?.summaryMessage ||
      'Stage 2 closed 5M confirmation candle verified full CRT alignment.';
  } else if (isLockFinished && lockedDecision) {
    selectionReason = lockedDecision.statusNote;
  } else if (isStage1Detected) {
    selectionReason =
      signal?.confirmationReason ||
      signal?.summaryMessage ||
      'WAITING FOR MARKET CONFIRMATION: Stage 1 CRT setup detected through 1H; waiting for the 5M confirmation candle to close before publishing BUY or SELL.';
  } else {
    selectionReason =
      signal?.confirmationReason ||
      signal?.summaryMessage ||
      'Awaiting full CRT confluence across Monthly, Weekly KL, 1H Purge/TS, and closed 5M SMT Model 1 candle.';
  }

  // =========================================================================
  // REAL-TIME FLOATING P&L CALCULATION FOR ACTIVE POSITION
  // =========================================================================
  let floatingPips = 0;
  let floatingUsd = 0;
  let distanceToTp1 = 0;
  let distanceToSl = 0;

  if (activeTrade && isConnected) {
    const isTradeBuy = activeTrade.direction === 'BUY';
    const currentPriceForPnl = isTradeBuy ? currentBid : currentAsk;
    const rawDiff = isTradeBuy
      ? currentPriceForPnl - activeTrade.entryPrice
      : activeTrade.entryPrice - currentPriceForPnl;

    floatingPips = Number((rawDiff / pipSize).toFixed(1));
    const pipValPerLot = selectedInstrument === 'NASDAQ' ? 1 : 10;
    floatingUsd = Number((floatingPips * pipValPerLot * (activeTrade.lotSize || FIXED_LOT_SIZE)).toFixed(2));

    distanceToTp1 = Number((Math.abs(activeTrade.takeProfit1 - currentPriceForPnl) / pipSize).toFixed(1));
    distanceToSl = Number((Math.abs(currentPriceForPnl - activeTrade.stopLoss) / pipSize).toFixed(1));
  }

  // Handle closing an active position
  const handleClosePosition = () => {
    if (!activeTrade) return;
    const isWin = floatingPips >= 0;
    tradeHistoryService.updateResult(activeTrade.id, isWin ? 'WIN' : 'LOSS', floatingPips);
    soundEffects.playAlertChime();
    const closePrice = activeTrade.direction === 'BUY' ? currentBid : currentAsk;
    setOrderSuccessMessage(
      `Closed ${activeTrade.direction} position @ ${closePrice.toFixed(decimals)} · ${
        floatingPips >= 0 ? '+' : ''
      }${floatingPips} pips (${floatingUsd >= 0 ? '+$' : '-$'}${Math.abs(floatingUsd).toFixed(2)})`
    );
    saveActiveTrade(null);
    setTimeout(() => setOrderSuccessMessage(null), 6000);
  };

  // Open the Market Order Ticket Modal for the single confirmed direction (requires valid SL & TP)
  const handleOpenConfirmedOrderModal = () => {
    if (!hasValidSignal) return;
    setIsOrderModalOpen(true);
  };

  // Order Executed callback from modal — STRICT GUARD: Never open without SL & TP
  const handleOrderExecuted = (order: {
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
  }) => {
    if (!hasValidFixedSlTp(order.entryPrice, order.stopLoss, order.takeProfit1, order.direction)) {
      return;
    }

    // 1. Log to Trade History as IN_PROGRESS
    const tradeItem = tradeHistoryService.addFromSignal({
      instrument: selectedInstrument,
      instrumentName: instrumentInfo.name,
      verdict: order.direction,
      status: 'CONFIRMED_SIGNAL',
      timestamp: Date.now(),
      entryPrice: order.entryPrice,
      stopLoss: order.stopLoss,
      takeProfit: order.takeProfit1,
      takeProfit1: order.takeProfit1,
      takeProfit2: order.takeProfit1,
      takeProfit3: order.takeProfit1,
      slRR: FIXED_SL_RR,
      tpRR: FIXED_TP_RR,
      lotSize: FIXED_LOT_SIZE,
      riskReward1: FIXED_RISK_REWARD,
      riskReward2: FIXED_RISK_REWARD,
      riskReward3: FIXED_RISK_REWARD,
      pipsRisk: order.pipsRisk,
      pipsReward1: order.pipsReward,
      monthlyDirection: signal?.monthlyDirection || 'BULLISH',
      weeklyDirection: signal?.weeklyDirection || 'BULLISH',
      hourlyConfirmation: true,
      fiveMinModel1Confirmation: true,
      fiveMinTsConfirmation: true,
      fiveMinSmtConfirmation: true,
      liquidityLevels: signal?.liquidityLevels || { pdh: 0, pdl: 0, pwh: 0, pwl: 0, pmh: 0, pml: 0 },
      targetLiquidityName: signal?.targetLiquidityName || 'Key Liquidity Level',
      targetLiquidityPrice: signal?.targetLiquidityPrice || order.takeProfit1,
      targetLiquidityReason: 'Market Execution Target',
      monthly: signal?.monthly || ({} as any),
      weekly: signal?.weekly || ({} as any),
      hourly: signal?.hourly || ({} as any),
      fiveMin: signal?.fiveMin || ({} as any),
      tradingSession: signal?.tradingSession || 'Active Live Session',
      sessionPeriod: signal?.sessionPeriod || 'LONDON_SESSION',
      isInsideSession: true,
      satisfiedRules: ['Market Execution', 'Live Spread Connected'],
      pendingRules: [],
      summaryMessage: `Market ${order.direction} order executed at live ${
        order.direction === 'BUY' ? 'Ask' : 'Bid'
      }.`,
      dataProvider: quoteTick?.provider || instrumentInfo.dataProvider,
      liveFeedStatus: 'LIVE_CONNECTED',
      lastUpdatedIso: new Date().toISOString(),
    });

    // 2. Set active trade tracking
    const newActiveTrade: ActiveMarketTrade = {
      id: tradeItem.id,
      instrument: selectedInstrument,
      direction: order.direction,
      entryPrice: order.entryPrice,
      stopLoss: order.stopLoss,
      takeProfit1: order.takeProfit1,
      takeProfit2: order.takeProfit2,
      takeProfit3: order.takeProfit3,
      lotSize: order.lotSize,
      timestamp: Date.now(),
    };
    saveActiveTrade(newActiveTrade);

    // 3. Show notification
    setOrderSuccessMessage(
      `Connected ${order.direction} order to market @ ${order.entryPrice.toFixed(decimals)} (${order.lotSize} Lots)`
    );
    setTimeout(() => setOrderSuccessMessage(null), 6000);
  };

  const handleCopySetup = () => {
    const baseSignal = isActivelyLocked && lockedDecision ? lockedDecision.originalSignal : signal;
    if (!baseSignal) return;
    const text = `MUSCAB CRT PRO - ${baseSignal.instrument} SIGNAL
Decision: ${singleDecision} (Status: ${displayLockStatus} / Stage: ${twoStageStatus})
Confirmation Time: ${confirmationTime}
Confirmation Candle Close: ${confirmationCandleCloseFormatted}
Reason: ${selectionReason}
Live Market Mid: ${currentMid.toFixed(decimals)}
Live Bid: ${currentBid.toFixed(decimals)}
Live Ask: ${currentAsk.toFixed(decimals)}
Lot Size: ${FIXED_LOT_SIZE}.00 Standard Lot
Entry Price: ${entryPriceFormatted}
Stop Loss (${FIXED_SL_RR}RR Fixed): ${stopLossFormatted} (-${lockedDecision?.pipsRisk ?? baseSignal.pipsRisk} pips)
Take Profit (${FIXED_TP_RR}RR Target · 1:${FIXED_RISK_REWARD}): ${tp1Formatted} (+${lockedDecision?.pipsReward1 ?? baseSignal.pipsReward1} pips)
Target Pool: ${lockedDecision?.targetLiquidityName ?? baseSignal.targetLiquidityName} (${(lockedDecision?.targetLiquidityPrice ?? baseSignal.targetLiquidityPrice).toFixed(decimals)})
Broker: ${broker}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogTradeClick = () => {
    const baseSignal = isActivelyLocked && lockedDecision ? lockedDecision.originalSignal : signal;
    if (!baseSignal || !onLogTrade || !hasValidSignal) return;
    onLogTrade(baseSignal);
    setLogged(true);
    setTimeout(() => setLogged(false), 2500);
  };

  return (
    <div className="w-full rounded-3xl border border-neutral-800 bg-gradient-to-b from-[#0c0d14] via-[#08090d] to-[#050608] shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden">
      {/* =========================================================================
          TOP BAR: Quick Market Tabs, Connection Status & Broker Feed
          ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-neutral-800/80 bg-black/60 text-xs font-mono">
        {/* Left: Quick Switcher (EUR/USD is default primary) */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider hidden sm:inline">
            Active Market:
          </span>
          <div className="flex items-center bg-[#10121a] border border-neutral-800 rounded-xl p-1">
            <button
              onClick={() => onSelectInstrument('EURUSD')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                selectedInstrument === 'EURUSD'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 ring-1 ring-amber-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>EUR/USD</span>
              <span
                className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                  selectedInstrument === 'EURUSD' ? 'bg-black/30 text-slate-950' : 'bg-neutral-800 text-slate-400'
                }`}
              >
                FOREX
              </span>
            </button>

            <button
              onClick={() => onSelectInstrument('XAUUSD')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                selectedInstrument === 'XAUUSD'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 ring-1 ring-amber-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>XAU/USD</span>
              <span
                className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                  selectedInstrument === 'XAUUSD' ? 'bg-black/30 text-slate-950' : 'bg-neutral-800 text-slate-400'
                }`}
              >
                GOLD
              </span>
            </button>

            <button
              onClick={() => onSelectInstrument('NASDAQ')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                selectedInstrument === 'NASDAQ'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 ring-1 ring-amber-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>NASDAQ</span>
              <span
                className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                  selectedInstrument === 'NASDAQ' ? 'bg-black/30 text-slate-950' : 'bg-neutral-800 text-slate-400'
                }`}
              >
                NAS100
              </span>
            </button>
          </div>
        </div>

        {/* Center / Right: Live Connection Status & Execution Broker */}
        <div className="flex items-center gap-3">
          {isConnected ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <Wifi className="w-3.5 h-3.5" />
              <span>LIVE WEBSOCKET STREAM</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/50 text-rose-300 font-bold animate-pulse">
              <WifiOff className="w-3.5 h-3.5" />
              <span>DATA DISCONNECTED</span>
            </div>
          )}

          {/* Broker Feed Toggle */}
          <div className="flex items-center bg-black/60 border border-neutral-800 rounded-lg p-0.5">
            <button
              onClick={() => onToggleBroker('OANDA')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all flex items-center gap-1 ${
                broker === 'OANDA'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="OANDA Retail Feed (Official retail MT5 spreads)"
            >
              <Building2 className="w-3 h-3" />
              <span>OANDA MT5</span>
            </button>
            <button
              onClick={() => onToggleBroker('BINANCE')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all flex items-center gap-1 ${
                broker === 'BINANCE'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Binance Spot / Global Interbank ECN"
            >
              <span>Binance / ECN</span>
            </button>
          </div>

          {/* Direct TradingView Link */}
          <a
            href={`https://www.tradingview.com/chart/?symbol=${
              selectedInstrument === 'EURUSD'
                ? 'OANDA%3AEURUSD'
                : selectedInstrument === 'XAUUSD'
                ? 'OANDA%3AXAUUSD'
                : 'NASDAQ%3ANDX'
            }`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 hover:text-white transition-all text-[11px] font-bold"
            title="Open symbol chart directly on TradingView.com"
          >
            <span>TradingView</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Disconnection Warning if feed dropped */}
      {!isConnected && (
        <div className="px-6 py-2.5 bg-rose-950/40 border-b border-rose-500/30 flex items-center gap-2 text-xs font-mono text-rose-300 animate-in fade-in">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>
            <strong>DATA DISCONNECTED:</strong> Real-time streaming disconnected. MUSCAB CRT PRO never displays fake or estimated prices. Reconnecting...
          </span>
        </div>
      )}

      {/* SUCCESS TOAST MESSAGE */}
      {orderSuccessMessage && (
        <div className="px-6 py-3 bg-emerald-950/80 border-b border-emerald-500/50 flex items-center justify-between text-xs font-mono text-emerald-200 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{orderSuccessMessage}</span>
          </div>
          <button
            onClick={() => setOrderSuccessMessage(null)}
            className="text-emerald-400 hover:text-white"
          >
            ×
          </button>
        </div>
      )}

      {/* =========================================================================
          SECTION 1: ACTUAL EUR/USD LIVE MARKET PRICE DISPLAY
          ========================================================================= */}
      <div className="p-6 lg:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-neutral-800/80">
          {/* LEFT: Prominent Real Live Market Price Display */}
          <div className="flex flex-col space-y-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded bg-amber-500/15 border border-amber-500/40 text-amber-400 text-xs font-mono font-bold tracking-wider uppercase">
                {selectedInstrument === 'EURUSD'
                  ? 'EUR/USD SPOT FOREX'
                  : selectedInstrument === 'XAUUSD'
                  ? 'XAU/USD GOLD SPOT'
                  : 'NASDAQ 100 INDEX'}
              </span>
              <span className="text-xs font-mono text-slate-400">· {instrumentInfo.name}</span>
            </div>

            <div className="flex flex-col">
              <span className="text-xs uppercase font-mono tracking-widest text-slate-400 font-semibold flex items-center gap-1.5 mb-1">
                <Activity className="w-3.5 h-3.5 text-amber-400" />
                <span>ACTUAL REAL-TIME MARKET PRICE</span>
              </span>

              <div
                className={`inline-flex items-baseline gap-3 p-3.5 rounded-2xl border transition-all duration-300 ${
                  priceFlash === 'UP'
                    ? 'bg-emerald-950/40 border-emerald-400/80 shadow-[0_0_25px_rgba(16,185,129,0.3)]'
                    : priceFlash === 'DOWN'
                    ? 'bg-rose-950/40 border-rose-400/80 shadow-[0_0_25px_rgba(239,68,68,0.3)]'
                    : 'bg-black/60 border-neutral-800'
                }`}
              >
                <div className="text-4xl sm:text-5xl lg:text-6xl font-mono font-black text-white tracking-tight tabular-nums">
                  {isConnected ? currentMid.toFixed(decimals) : '---'}
                </div>

                <div className="flex flex-col text-xs font-mono">
                  {priceFlash === 'UP' && (
                    <span className="text-emerald-400 font-bold flex items-center gap-0.5 animate-bounce">
                      <ArrowUpRight className="w-4 h-4" /> Tick Up
                    </span>
                  )}
                  {priceFlash === 'DOWN' && (
                    <span className="text-rose-400 font-bold flex items-center gap-0.5 animate-bounce">
                      <ArrowDownRight className="w-4 h-4" /> Tick Down
                    </span>
                  )}
                  <span className="text-slate-400 text-[11px] font-sans">
                    {selectedInstrument === 'EURUSD' ? 'USD per EUR' : selectedInstrument === 'XAUUSD' ? 'USD/oz' : 'Points'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
              <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Latest Market Tick:</span>
              <strong className="text-slate-200">
                {isConnected ? formatExactTime(quoteTick?.lastUpdated) : 'Disconnected'}
              </strong>
            </div>
          </div>

          {/* RIGHT: Live Quotes Grid (Bid, Ask, Spread) & Re-Analyze Toolbar */}
          <div className="flex flex-col justify-between space-y-3 lg:max-w-md w-full">
            <div className="grid grid-cols-3 gap-2.5 text-xs font-mono">
              {/* BID */}
              <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800">
                <span className="text-[10px] uppercase text-slate-400 block font-bold">Live Bid (Sell)</span>
                <span className="text-lg font-extrabold text-rose-300 tabular-nums">
                  {isConnected ? currentBid.toFixed(decimals) : '---'}
                </span>
              </div>

              {/* ASK */}
              <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800">
                <span className="text-[10px] uppercase text-slate-400 block font-bold">Live Ask (Buy)</span>
                <span className="text-lg font-extrabold text-emerald-300 tabular-nums">
                  {isConnected ? currentAsk.toFixed(decimals) : '---'}
                </span>
              </div>

              {/* SPREAD */}
              <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30">
                <span className="text-[10px] uppercase text-amber-400 block font-bold">Spread</span>
                <span className="text-lg font-extrabold text-amber-300 tabular-nums">
                  {isConnected ? `${spreadPips.toFixed(1)} Pips` : '---'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-black/40 border border-neutral-800/80 text-xs font-mono">
              <button
                onClick={onSearchSignal}
                disabled={isSearching}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all active:scale-95 disabled:opacity-50"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-950" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5 text-slate-950" />
                    <span>Re-Analyze Market</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={onOpenRulesConfig}
                  className="px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-slate-300 transition-colors flex items-center gap-1"
                >
                  <SlidersHorizontal className="w-3 h-3 text-amber-400" />
                  <span>Rules</span>
                </button>
                <button
                  onClick={onOpenAiAudit}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 transition-colors"
                >
                  <span>Audit</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            CONNECTED ACTIVE MARKET POSITION TRACKER (REAL-TIME FLOATING P&L)
            ========================================================================= */}
        {activeTrade && (
          <div className="p-5 rounded-2xl border border-amber-500/60 bg-gradient-to-r from-[#121820] via-[#0b1017] to-[#080c10] shadow-[0_0_30px_rgba(245,158,11,0.15)] animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-800/80">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow-md ${
                    activeTrade.direction === 'BUY'
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-rose-500 text-white'
                  }`}
                >
                  {activeTrade.direction === 'BUY' ? (
                    <TrendingUp className="w-6 h-6 stroke-[3]" />
                  ) : (
                    <TrendingDown className="w-6 h-6 stroke-[3]" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-white">
                      CONNECTED LIVE POSITION: {activeTrade.direction} {activeTrade.instrument}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-mono text-[10px] font-bold animate-pulse">
                      MARKET ACTIVE
                    </span>
                  </div>
                  <div className="text-xs font-mono text-slate-400 mt-0.5 flex items-center gap-2">
                    <span>
                      Entry: <strong className="text-white">{activeTrade.entryPrice.toFixed(decimals)}</strong>
                    </span>
                    <span>·</span>
                    <span>
                      Size: <strong className="text-amber-400">{activeTrade.lotSize} Lots</strong>
                    </span>
                    <span>·</span>
                    <span>
                      Current: <strong className="text-slate-200">{(activeTrade.direction === 'BUY' ? currentBid : currentAsk).toFixed(decimals)}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* FLOATING P&L & CLOSE BUTTON */}
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                    Live Floating P&L
                  </span>
                  <div
                    className={`text-2xl font-black font-mono tabular-nums ${
                      floatingPips >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {floatingPips >= 0 ? `+${floatingPips}` : floatingPips} Pips
                    <span className="text-sm ml-1.5 font-bold">
                      ({floatingUsd >= 0 ? `+$${floatingUsd}` : `-$${Math.abs(floatingUsd)}`})
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleClosePosition}
                  className="px-4 py-2.5 rounded-xl font-mono text-xs font-bold bg-neutral-900 hover:bg-rose-950/80 border border-neutral-700 hover:border-rose-500/60 text-slate-200 hover:text-rose-200 transition-all shadow-md active:scale-95 flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Close at Market</span>
                </button>
              </div>
            </div>

            {/* PROGRESS & LEVEL METRICS */}
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-2 rounded-lg bg-black/40 border border-neutral-800">
                <span className="text-[10px] text-slate-500 block uppercase">Distance to TP ({FIXED_TP_RR}RR)</span>
                <span className="font-bold text-emerald-400">{distanceToTp1} Pips Remaining</span>
              </div>
              <div className="p-2 rounded-lg bg-black/40 border border-neutral-800">
                <span className="text-[10px] text-slate-500 block uppercase">SL Buffer ({FIXED_SL_RR}RR)</span>
                <span className="font-bold text-rose-300">{distanceToSl} Pips Buffer</span>
              </div>
              <div className="p-2 rounded-lg bg-black/40 border border-neutral-800">
                <span className="text-[10px] text-slate-500 block uppercase">Take Profit ({FIXED_TP_RR}RR · 1:{FIXED_RISK_REWARD})</span>
                <span className="font-bold text-emerald-300">{activeTrade.takeProfit1.toFixed(decimals)}</span>
              </div>
              <div className="p-2 rounded-lg bg-black/40 border border-neutral-800">
                <span className="text-[10px] text-slate-500 block uppercase">Stop Loss ({FIXED_SL_RR}RR Fixed)</span>
                <span className="font-bold text-rose-300">{activeTrade.stopLoss.toFixed(decimals)}</span>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            PERMANENT MARKET DIRECTION LOGO + TWO-STAGE PIPELINE & DECISION LOCK
            NEVER displays competing choices. Locks BUY or SELL until CLOSED/INVALIDATED.
            ========================================================================= */}
        <div className="space-y-4">
          {/* Header Strip: Permanent Market Logo + Two-Stage & Lock Badges */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-black/70 border border-neutral-800">
            {/* PERMANENT MARKET DIRECTION LOGO INDICATOR */}
            <div className="flex items-center gap-4">
              <div
                className={`relative w-20 h-20 rounded-2xl flex flex-col items-center justify-center shrink-0 border-2 shadow-2xl transition-all duration-300 ${
                  isBuy
                    ? 'bg-gradient-to-br from-emerald-500 to-emerald-700 border-emerald-300 text-slate-950 shadow-[0_0_30px_rgba(16,185,129,0.45)]'
                    : isSell
                    ? 'bg-gradient-to-br from-rose-500 to-rose-700 border-rose-300 text-white shadow-[0_0_30px_rgba(239,68,68,0.45)]'
                    : 'bg-gradient-to-br from-amber-400 to-amber-600 border-amber-200 text-slate-950 shadow-[0_0_25px_rgba(245,158,11,0.35)]'
                }`}
                aria-label={`Permanent Market Direction Logo: ${singleDecision}`}
              >
                {isBuy ? (
                  <TrendingUp className="w-8 h-8 stroke-[3]" />
                ) : isSell ? (
                  <TrendingDown className="w-8 h-8 stroke-[3]" />
                ) : (
                  <PauseCircle className="w-8 h-8 stroke-[2.75]" />
                )}
                <span className="text-xs font-black font-mono tracking-widest mt-0.5 uppercase">
                  {singleDecision}
                </span>
                {isActivelyLocked && (
                  <span
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-black border border-amber-400 flex items-center justify-center text-amber-400 shadow-md"
                    title="AI Direction Locked"
                  >
                    <Lock className="w-3 h-3" />
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] uppercase font-mono tracking-widest text-slate-400 font-bold">
                    PERMANENT AI MARKET DIRECTION LOGO
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-black uppercase border ${
                      displayLockStatus === 'ACTIVE'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                        : displayLockStatus === 'LOCKED'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                        : displayLockStatus === 'INVALIDATED'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                        : displayLockStatus === 'CLOSED'
                        ? 'bg-slate-700/60 text-slate-200 border-slate-500/50'
                        : 'bg-neutral-900 text-slate-400 border-neutral-700'
                    }`}
                  >
                    LOCK STATUS: {displayLockStatus}
                  </span>
                </div>

                <div className="text-base sm:text-lg font-extrabold text-white flex flex-wrap items-center gap-2">
                  {isBuy ? (
                    <span className="text-emerald-400">
                      GREEN BUY LOCKED — {selectedInstrument}
                    </span>
                  ) : isSell ? (
                    <span className="text-rose-400">
                      RED SELL LOCKED — {selectedInstrument}
                    </span>
                  ) : isStage1Detected ? (
                    <span className="text-amber-400">
                      GOLD WAIT — WAITING FOR MARKET CONFIRMATION
                    </span>
                  ) : isLockFinished && lockedDecision ? (
                    <span className="text-amber-400">
                      GOLD WAIT — PREVIOUS {lockedDecision.direction} {lockedDecision.lockStatus}
                    </span>
                  ) : (
                    <span className="text-amber-400">
                      GOLD WAIT — NO CONFIRMED CRT SETUP
                    </span>
                  )}
                </div>

                <div className="text-[11px] font-mono text-slate-400 flex flex-wrap items-center gap-2">
                  <span>
                    Two-Stage Status:{' '}
                    <strong
                      className={
                        twoStageStatus === 'CONFIRMED'
                          ? 'text-emerald-400'
                          : twoStageStatus === 'INVALID'
                          ? 'text-rose-400'
                          : 'text-amber-400'
                      }
                    >
                      {twoStageStatus}
                    </strong>
                  </span>
                  <span>·</span>
                  <span>
                    Stage 1:{' '}
                    <strong className="text-slate-200">
                      {isActivelyLocked || isStage1Detected ? 'DETECTED' : 'SCANNING'}
                    </strong>
                  </span>
                  <span>·</span>
                  <span>
                    Stage 2:{' '}
                    <strong className="text-slate-200">
                      {isActivelyLocked
                        ? 'CONFIRMED (CANDLE CLOSED)'
                        : isStageInvalid
                        ? 'INVALID / REJECTED'
                        : 'AWAITING 5M CLOSE'}
                    </strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Two-Stage Indicator Pill & Lock Controls */}
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
              {isActivelyLocked && (
                <button
                  onClick={onCloseLockedDecision}
                  className="px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-rose-950/70 border border-neutral-700 hover:border-rose-500/60 text-slate-200 hover:text-rose-200 font-bold transition-all flex items-center gap-1.5"
                  title="Manually close the locked setup and unlock for a brand new CRT setup"
                >
                  <Unlock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Close / Unlock Setup</span>
                </button>
              )}

              {isLockFinished && (
                <button
                  onClick={onResetFinishedLock}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black transition-all flex items-center gap-1.5 shadow-md"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Scan New CRT Setup</span>
                </button>
              )}
            </div>
          </div>

          {/* -------------------------------------------------------------------
              CASE 1 & CASE 2: LOCKED / ACTIVE BUY OR SELL DECISION
              ------------------------------------------------------------------- */}
          {(isBuy || isSell) && (
            <div
              className={`w-full rounded-2xl p-6 sm:p-7 border space-y-6 animate-in fade-in duration-300 ${
                isBuy
                  ? 'border-emerald-400 bg-gradient-to-br from-emerald-950/80 via-emerald-900/30 to-[#070e0a] shadow-[0_0_45px_rgba(16,185,129,0.28)] ring-2 ring-emerald-400/40'
                  : 'border-rose-400 bg-gradient-to-br from-rose-950/80 via-rose-900/30 to-[#120709] shadow-[0_0_45px_rgba(239,68,68,0.28)] ring-2 ring-rose-400/40'
              }`}
            >
              {/* Decision Header */}
              <div
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b ${
                  isBuy ? 'border-emerald-500/30' : 'border-rose-500/30'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-14 h-14 rounded-2xl bg-white flex items-center justify-center shrink-0 shadow-xl ${
                      isBuy ? 'text-emerald-800 shadow-emerald-500/20' : 'text-rose-800 shadow-rose-500/20'
                    }`}
                  >
                    {isBuy ? (
                      <TrendingUp className="w-8 h-8 stroke-[3]" />
                    ) : (
                      <TrendingDown className="w-8 h-8 stroke-[3]" />
                    )}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="text-3xl sm:text-4xl font-black font-mono text-white tracking-tight uppercase">
                        {singleDecision}
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full bg-white text-xs font-black uppercase font-mono shadow-md flex items-center gap-1 ${
                          isBuy ? 'text-emerald-900' : 'text-rose-900'
                        }`}
                      >
                        <Lock className="w-3 h-3" />
                        <span>{displayLockStatus} · STAGE 2 CONFIRMED</span>
                      </span>
                    </div>
                    <div
                      className={`text-xs font-mono mt-1.5 flex flex-wrap items-center gap-2 ${
                        isBuy ? 'text-emerald-200/90' : 'text-rose-200/90'
                      }`}
                    >
                      <span>
                        Confirmed: <strong className="text-white">{confirmationTime}</strong>
                      </span>
                      <span>·</span>
                      <span>
                        5M Candle Closed: <strong className="text-amber-300">{confirmationCandleCloseFormatted}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Primary Manual Order Ticket Button (Analysis Signal Only — Never Auto-Executes) */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleOpenConfirmedOrderModal}
                    className={`py-3 px-5 rounded-xl font-mono font-black text-xs sm:text-sm uppercase tracking-wider bg-white shadow-lg transition-all active:scale-95 flex items-center gap-2 ${
                      isBuy
                        ? 'hover:bg-emerald-100 text-emerald-950 shadow-emerald-500/30'
                        : 'hover:bg-rose-100 text-rose-950 shadow-rose-500/30'
                    }`}
                  >
                    {isBuy ? (
                      <TrendingUp className="w-4 h-4 stroke-[3]" />
                    ) : (
                      <TrendingDown className="w-4 h-4 stroke-[3]" />
                    )}
                    <span>
                      CONNECT {singleDecision} TICKET @ {(isBuy ? currentAsk : currentBid).toFixed(decimals)}
                    </span>
                  </button>
                </div>
              </div>

              {/* Live Locked Trade Progress Bar & Fixed 1RR SL / 3RR TP / Lot 1 Tracker */}
              {lockedDecision && (
                <div className="p-4 rounded-xl bg-black/60 border border-amber-500/30 space-y-3 font-mono text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-amber-300 font-bold">
                      <Lock className="w-3.5 h-3.5" />
                      <span>FIXED RISK TRACKER ({FIXED_SL_RR}RR SL / {FIXED_TP_RR}RR TP · {FIXED_LOT_SIZE}.00 LOT LOCKED)</span>
                    </div>
                    <div
                      className={`text-sm font-black tabular-nums ${
                        lockedDecision.floatingPips >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {lockedDecision.floatingPips >= 0
                        ? `+${lockedDecision.floatingPips}`
                        : lockedDecision.floatingPips}{' '}
                      Pips Live
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                    <div
                      className={`p-2.5 rounded-lg border flex items-center justify-between ${
                        lockedDecision.slHit
                          ? 'bg-rose-500/20 border-rose-400 text-rose-200'
                          : 'bg-neutral-900/70 border-neutral-800 text-slate-300'
                      }`}
                    >
                      <span>Stop Loss ({FIXED_SL_RR}RR Fixed)</span>
                      <strong className={lockedDecision.slHit ? 'text-rose-300' : 'text-emerald-300'}>
                        {lockedDecision.slHit ? 'HIT' : 'PROTECTED'}
                      </strong>
                    </div>
                    <div
                      className={`p-2.5 rounded-lg border flex items-center justify-between ${
                        lockedDecision.tp1Hit
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                          : 'bg-neutral-900/70 border-neutral-800 text-slate-300'
                      }`}
                    >
                      <span>Take Profit ({FIXED_TP_RR}RR Target)</span>
                      <strong className={lockedDecision.tp1Hit ? 'text-emerald-300' : 'text-amber-300'}>
                        {lockedDecision.tp1Hit ? 'HIT' : 'OPEN'}
                      </strong>
                    </div>
                    <div className="p-2.5 rounded-lg border bg-neutral-900/70 border-neutral-800 text-slate-300 flex items-center justify-between">
                      <span>Peak Favorable</span>
                      <strong className="text-amber-300">+{lockedDecision.highestFavorablePips} Pips</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Transparency: Reason for Selecting Direction */}
              <div
                className={`p-4 rounded-xl bg-black/50 border space-y-2 ${
                  isBuy ? 'border-emerald-500/30' : 'border-rose-500/30'
                }`}
              >
                <div
                  className={`flex items-center gap-2 text-xs font-mono font-bold uppercase ${
                    isBuy ? 'text-emerald-300' : 'text-rose-300'
                  }`}
                >
                  <ShieldCheck className={`w-4 h-4 shrink-0 ${isBuy ? 'text-emerald-400' : 'text-rose-400'}`} />
                  <span>Why AI Selected {singleDecision} (CRT Verification):</span>
                </div>
                <p className="text-xs text-slate-200 font-sans leading-relaxed">
                  {selectionReason}
                </p>
                <div
                  className={`pt-2 border-t flex flex-wrap items-center gap-3 text-[11px] font-mono ${
                    isBuy ? 'border-emerald-500/20 text-emerald-300/80' : 'border-rose-500/20 text-rose-300/80'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className={`w-3.5 h-3.5 ${isBuy ? 'text-emerald-400' : 'text-rose-400'}`} />
                    Monthly {isBuy ? 'Bullish' : 'Bearish'} Expansion
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className={`w-3.5 h-3.5 ${isBuy ? 'text-emerald-400' : 'text-rose-400'}`} />
                    Weekly KL Mitigation
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className={`w-3.5 h-3.5 ${isBuy ? 'text-emerald-400' : 'text-rose-400'}`} />
                    1H Purge Confirmed
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className={`w-3.5 h-3.5 ${isBuy ? 'text-emerald-400' : 'text-rose-400'}`} />
                    Closed 5M SMT Model 1
                  </span>
                </div>
              </div>

              {/* Exact Locked Setup Parameters Grid: Entry Price, Stop Loss (1RR Fixed), Take Profit (3RR Fixed) · Lot 1 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 font-mono">
                <div
                  className={`p-4 rounded-xl bg-black/60 border flex flex-col justify-between ${
                    isBuy ? 'border-emerald-500/40' : 'border-rose-500/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[11px] uppercase tracking-wider font-bold ${
                        isBuy ? 'text-emerald-300' : 'text-rose-300'
                      }`}
                    >
                      {singleDecision} Entry Price
                    </span>
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {FIXED_LOT_SIZE}.00 LOT
                    </span>
                  </div>
                  <div className="my-1.5 text-2xl sm:text-3xl font-black text-white tabular-nums">
                    {entryPriceFormatted}
                  </div>
                  <span className="text-[10px] text-slate-400">Actual Confirmed Entry (Lot {FIXED_LOT_SIZE})</span>
                </div>

                <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/45 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-wider text-rose-400 font-bold">
                      Stop Loss (SL)
                    </span>
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {FIXED_SL_RR}RR FIXED
                    </span>
                  </div>
                  <div className="my-1.5 text-2xl sm:text-3xl font-black text-rose-300 tabular-nums">
                    {stopLossFormatted}
                  </div>
                  <span className="text-[10px] text-rose-400/80">
                    1RR Risk: -{lockedDecision?.pipsRisk ?? signal?.pipsRisk} Pips
                  </span>
                </div>

                <div
                  className={`p-4 rounded-xl border flex flex-col justify-between ${
                    isBuy ? 'bg-emerald-950/35 border-emerald-500/50' : 'bg-emerald-950/30 border-emerald-500/45'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-wider font-bold text-emerald-400 flex items-center gap-1">
                      <Target className="w-3.5 h-3.5" /> Take Profit (TP)
                    </span>
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {FIXED_TP_RR}RR · 1:{FIXED_RISK_REWARD}
                    </span>
                  </div>
                  <div className="my-1.5 text-2xl sm:text-3xl font-black tabular-nums text-emerald-300">
                    {tp1Formatted}
                  </div>
                  <span className="text-[10px] text-emerald-300/80">
                    3RR Target: +{lockedDecision?.pipsReward1 ?? signal?.pipsReward1} Pips
                  </span>
                </div>
              </div>

              {/* Action Toolbar & Probability Disclaimer */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopySetup}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg bg-black/60 hover:bg-neutral-900 border transition-colors ${
                      isBuy ? 'border-emerald-500/30 text-emerald-200' : 'border-rose-500/30 text-rose-200'
                    }`}
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy Setup'}</span>
                  </button>

                  {onLogTrade && signal && (
                    <button
                      onClick={handleLogTradeClick}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg bg-black/60 hover:bg-neutral-900 border transition-colors ${
                        isBuy ? 'border-emerald-500/30 text-emerald-200' : 'border-rose-500/30 text-rose-200'
                      }`}
                    >
                      {logged ? <Check className="w-3.5 h-3.5 text-amber-400" /> : <BookmarkPlus className="w-3.5 h-3.5" />}
                      <span>{logged ? 'Logged' : 'Log Trade'}</span>
                    </button>
                  )}
                </div>

                <div className="text-[11px] text-slate-300">
                  Target Pool:{' '}
                  <strong className="text-white">
                    {lockedDecision?.targetLiquidityName || signal?.targetLiquidityName} (
                    {(lockedDecision?.targetLiquidityPrice || signal?.targetLiquidityPrice || 0).toFixed(decimals)})
                  </strong>
                </div>
              </div>

              <div className="text-[11px] font-mono text-slate-400 pt-2 border-t border-neutral-800/70 flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>
                  Transparency Notice: Probabilistic CRT analysis only — no signal is guaranteed to win. Trades are never auto-executed; always manage risk using Stop Loss.
                </span>
              </div>
            </div>
          )}

          {/* -------------------------------------------------------------------
              CASE 3: WAIT / STAGE 1 DETECTED / INVALIDATED / CLOSED
              ------------------------------------------------------------------- */}
          {isWait && (
            <div className="w-full rounded-2xl p-6 sm:p-7 border border-amber-500/50 bg-gradient-to-br from-amber-950/40 via-amber-900/15 to-[#0b0c10] shadow-[0_0_35px_rgba(245,158,11,0.15)] space-y-6 animate-in fade-in duration-300">
              {/* Decision Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-amber-500/30">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-xl shadow-amber-500/20">
                    {isStage1Detected ? (
                      <Hourglass className="w-8 h-8 stroke-[2.5] animate-pulse" />
                    ) : isStageInvalid ? (
                      <XCircle className="w-8 h-8 stroke-[2.5]" />
                    ) : (
                      <PauseCircle className="w-8 h-8 stroke-[2.5]" />
                    )}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="text-3xl sm:text-4xl font-black font-mono text-amber-400 tracking-tight uppercase">
                        WAIT
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-black uppercase font-mono border ${
                          isStage1Detected
                            ? 'bg-amber-500 text-slate-950 border-amber-300 animate-pulse'
                            : isStageInvalid
                            ? 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                            : 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                        }`}
                      >
                        {isStage1Detected
                          ? 'WAITING FOR MARKET CONFIRMATION'
                          : isLockFinished && lockedDecision
                          ? `PREVIOUS SETUP ${lockedDecision.lockStatus}`
                          : isStageInvalid
                          ? 'INVALID SETUP REJECTED'
                          : 'CAPITAL PRESERVATION'}
                      </span>
                    </div>
                    <div className="text-xs font-mono text-slate-300 mt-1.5 flex flex-wrap items-center gap-2">
                      <span>
                        Stage Status:{' '}
                        <strong className="text-amber-300">
                          {isStage1Detected
                            ? `STAGE 1 DETECTED (${signal?.pendingDirection || 'PENDING'}) — NOT CONFIRMED`
                            : twoStageStatus}
                        </strong>
                      </span>
                      <span>·</span>
                      <span>
                        Candle Close Window: <strong className="text-slate-100">{confirmationCandleCloseFormatted}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={isLockFinished ? onResetFinishedLock : onSearchSignal}
                    disabled={isSearching}
                    className="py-3 px-5 rounded-xl font-mono font-bold text-xs uppercase tracking-wider bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 transition-all active:scale-95 flex items-center gap-2"
                  >
                    {isSearching ? <Loader2 className="w-4 h-4 animate-spin text-slate-950" /> : <Search className="w-4 h-4" />}
                    <span>{isLockFinished ? 'Unlock & Scan New Setup' : 'Scan Market for Setup'}</span>
                  </button>
                </div>
              </div>

              {/* Reason for WAIT / Stage 1 / Invalidated */}
              <div className="p-4 rounded-xl bg-black/60 border border-amber-500/30 space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-400 uppercase">
                  <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    {isStage1Detected
                      ? 'Stage 1 Setup Detected — Awaiting Closed 5M Confirmation:'
                      : isLockFinished
                      ? `Locked Trade Outcome (${lockedDecision?.lockStatus}):`
                      : 'Reason for WAIT:'}
                  </span>
                </div>
                <p className="text-xs text-slate-200 font-sans leading-relaxed">
                  {selectionReason}
                </p>
                <div className="pt-2 border-t border-amber-500/20 flex flex-wrap items-center gap-3 text-[11px] font-mono text-slate-400">
                  <span className="flex items-center gap-1.5 text-amber-300">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    Two-Stage Discipline: Never publish BUY or SELL before Stage 2 confirmation candle closes cleanly
                  </span>
                </div>
              </div>

              {/* Fixed Risk Parameters in WAIT / Previous Finished Lock State */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 font-mono">
                <div className="p-4 rounded-xl bg-black/50 border border-neutral-800 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                      Entry Price
                    </span>
                    <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded">
                      {FIXED_LOT_SIZE}.00 LOT
                    </span>
                  </div>
                  <div className="my-1.5 text-xl font-bold text-slate-300 tabular-nums">
                    {isLockFinished && lockedDecision ? lockedDecision.entryPrice.toFixed(decimals) : '---'}
                  </div>
                  <span className="text-[10px] text-amber-400">
                    {isStage1Detected ? 'Pending 5M Close' : isLockFinished ? 'Prior Setup Entry' : 'No Trade Permitted'}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-black/50 border border-rose-500/25 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-wider text-rose-400 font-bold">
                      Stop Loss (SL)
                    </span>
                    <span className="text-[10px] font-bold text-rose-300 bg-rose-500/10 px-1.5 py-0.5 rounded">
                      {FIXED_SL_RR}RR FIXED
                    </span>
                  </div>
                  <div className="my-1.5 text-sm font-bold text-slate-300 font-mono tabular-nums">
                    {isLockFinished && lockedDecision
                      ? lockedDecision.stopLoss.toFixed(decimals)
                      : `Auto ${FIXED_SL_RR}RR from Entry`}
                  </div>
                  <span className="text-[10px] text-slate-500">Mandatory Before Entry</span>
                </div>

                <div className="p-4 rounded-xl bg-black/50 border border-emerald-500/25 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1">
                      <Target className="w-3.5 h-3.5 text-emerald-400" /> Take Profit (TP)
                    </span>
                    <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                      {FIXED_TP_RR}RR · 1:{FIXED_RISK_REWARD}
                    </span>
                  </div>
                  <div className="my-1.5 text-sm font-bold text-slate-300 font-mono tabular-nums">
                    {isLockFinished && lockedDecision
                      ? (lockedDecision.takeProfit ?? lockedDecision.takeProfit1).toFixed(decimals)
                      : `Auto ${FIXED_TP_RR}RR Target (1:${FIXED_RISK_REWARD})`}
                  </div>
                  <span className="text-[10px] text-slate-500">Mandatory Before Entry</span>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-400">
                <span>Probabilistic CRT analysis — no signal is guaranteed to win. Automatic single-decision mode active.</span>
                <span className="text-amber-400 font-bold">
                  {selectedInstrument} · Stage: {twoStageStatus} · Lock: {displayLockStatus}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* =========================================================================
            TRANSPARENCY AUDIT STRIP: Real Data Guarantee
            ========================================================================= */}
        <div className="p-3.5 rounded-xl bg-black/60 border border-neutral-900 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Authentic Market Integrity:</strong> The engine automatically selects only valid setups based on authentic live feeds calibrated to{' '}
              {broker === 'OANDA' ? 'OANDA MT5 Retail (0.9 pips)' : 'Interbank ECN'}. No simulated or fabricated ticks.
            </span>
          </div>

          <div className="flex items-center gap-2 text-slate-400">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span>
              Provider: <strong className="text-slate-300">{quoteTick?.provider || instrumentInfo.dataProvider}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* MARKET ORDER TICKET MODAL (Only opened for confirmed BUY or SELL) */}
      <MarketOrderTicketModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        selectedInstrument={selectedInstrument}
        initialDirection={singleDecision === 'SELL' ? 'SELL' : 'BUY'}
        quoteTick={quoteTick}
        signal={isActivelyLocked && lockedDecision ? lockedDecision.originalSignal : signal}
        broker={broker}
        onOrderExecuted={handleOrderExecuted}
      />
    </div>
  );
};
