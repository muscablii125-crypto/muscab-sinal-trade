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
import { InstrumentId, LiveQuoteTick, CrtSignalResult, PositionDrawing } from '../types/trading';
import { SUPPORTED_INSTRUMENTS } from '../constants/instruments';
import { MarketOrderTicketModal } from './MarketOrderTicketModal';
import { tradeHistoryService } from '../services/tradeHistory';
import { soundEffects } from '../services/soundEffects';
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
  Layers,
  Flame,
  Zap,
  ExternalLink,
} from 'lucide-react';

interface HomeScreenSignalCardProps {
  selectedInstrument: InstrumentId;
  onSelectInstrument: (id: InstrumentId) => void;
  quoteTick: LiveQuoteTick | null;
  connectionStatus: 'LIVE_CONNECTED' | 'DATA_DISCONNECTED';
  broker: 'BINANCE' | 'OANDA';
  onToggleBroker: (broker: 'BINANCE' | 'OANDA') => void;
  signal: CrtSignalResult | null;
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
  // AUTOMATIC SINGLE SIGNAL SELECTION LOGIC
  // Evaluates strictly: BUY only, SELL only, or WAIT.
  // Never asks user to choose. Never displays conflicting choices.
  // =========================================================================
  const isConfirmedSignal = signal?.status === 'CONFIRMED_SIGNAL';
  const rawVerdict = signal?.verdict || 'WAIT';

  // Only display BUY if bullish CRT conditions are fully confirmed
  // Only display SELL if bearish CRT conditions are fully confirmed
  // If neither or conflict: display WAIT
  const singleDecision: 'BUY' | 'SELL' | 'WAIT' =
    isConfirmedSignal && rawVerdict === 'BUY'
      ? 'BUY'
      : isConfirmedSignal && rawVerdict === 'SELL'
      ? 'SELL'
      : 'WAIT';

  const isBuy = singleDecision === 'BUY';
  const isSell = singleDecision === 'SELL';
  const isWait = singleDecision === 'WAIT';

  // Format Entry, SL, TP values
  const hasValidSignal = isBuy || isSell;
  const entryPriceFormatted = hasValidSignal && signal ? signal.entryPrice.toFixed(decimals) : '---';
  const stopLossFormatted = hasValidSignal && signal ? signal.stopLoss.toFixed(decimals) : '---';
  const tp1Formatted = hasValidSignal && signal ? signal.takeProfit1.toFixed(decimals) : '---';
  const tp2Formatted = hasValidSignal && signal ? signal.takeProfit2.toFixed(decimals) : '---';
  const tp3Formatted = hasValidSignal && signal ? signal.takeProfit3.toFixed(decimals) : '---';

  // Confirmation Time
  const confirmationTime = signal?.timestamp
    ? formatExactTime(signal.timestamp)
    : formatExactTime(Date.now());

  // Reason for selecting that direction
  let selectionReason = '';
  if (isBuy) {
    selectionReason =
      signal?.summaryMessage ||
      'Bullish CRT conditions fully confirmed: Monthly Bullish expansion aligned with Weekly Key Level mitigation, 1H Liquidity Purge of sell-side liquidity, and 5M SMT Model 1 upward displacement.';
  } else if (isSell) {
    selectionReason =
      signal?.summaryMessage ||
      'Bearish CRT conditions fully confirmed: Monthly Bearish expansion aligned with Weekly Key Level mitigation, 1H Liquidity Purge of buy-side liquidity, and 5M SMT Model 1 downward displacement.';
  } else {
    // WAIT Reason
    selectionReason =
      signal?.summaryMessage ||
      'Awaiting 1H Key Level Purge or Turtle Soup sweep and 5M SMT Model 1 displacement. Conditions are not yet fully aligned. The engine does not guess or force trades.';
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
    floatingUsd = Number((floatingPips * pipValPerLot * (activeTrade.lotSize || 1.0)).toFixed(2));

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

  // Open the Market Order Ticket Modal for the single confirmed direction
  const handleOpenConfirmedOrderModal = () => {
    if (!hasValidSignal) return;
    setIsOrderModalOpen(true);
  };

  // Order Executed callback from modal
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
    // 1. Log to Trade History as IN_PROGRESS
    const tradeItem = tradeHistoryService.addFromSignal({
      instrument: selectedInstrument,
      instrumentName: instrumentInfo.name,
      verdict: order.direction,
      status: 'CONFIRMED_SIGNAL',
      timestamp: Date.now(),
      entryPrice: order.entryPrice,
      stopLoss: order.stopLoss,
      takeProfit1: order.takeProfit1,
      takeProfit2: order.takeProfit2,
      takeProfit3: order.takeProfit3,
      riskReward1: 2,
      riskReward2: 3,
      riskReward3: 5,
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
    if (!signal) return;
    const text = `MUSCAB CRT PRO - ${signal.instrument} SIGNAL
Decision: ${singleDecision}
Confirmation Time: ${confirmationTime}
Reason: ${selectionReason}
Live Market Mid: ${currentMid.toFixed(decimals)}
Live Bid: ${currentBid.toFixed(decimals)}
Live Ask: ${currentAsk.toFixed(decimals)}
Entry Price: ${entryPriceFormatted}
Stop Loss: ${stopLossFormatted} (Risk: ${signal.pipsRisk} pips)
TP1 (1:${signal.riskReward1}): ${tp1Formatted} (+${signal.pipsReward1} pips)
TP2 (1:${signal.riskReward2}): ${tp2Formatted}
TP3 (1:${signal.riskReward3}): ${tp3Formatted}
Target Pool: ${signal.targetLiquidityName} (${signal.targetLiquidityPrice.toFixed(decimals)})
Broker: ${broker}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogTradeClick = () => {
    if (signal && onLogTrade) {
      onLogTrade(signal);
      setLogged(true);
      setTimeout(() => setLogged(false), 2500);
    }
  };

  return (
    <div className="w-full rounded-3xl border border-neutral-800 bg-gradient-to-b from-[#0c0d14] via-[#08090d] to-[#050608] shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden">
      {/* =========================================================================
          TOP BAR: Quick Market Tabs, Connection Status & Broker Feed
          ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-neutral-800/80 bg-black/60 text-xs font-mono">
        {/* Left: Quick Switcher (AUD/USD is default primary) */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider hidden sm:inline">
            Active Market:
          </span>
          <div className="flex items-center bg-[#10121a] border border-neutral-800 rounded-xl p-1">
            <button
              onClick={() => onSelectInstrument('AUDUSD')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                selectedInstrument === 'AUDUSD'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 ring-1 ring-amber-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>AUD/USD</span>
              <span
                className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                  selectedInstrument === 'AUDUSD' ? 'bg-black/30 text-slate-950' : 'bg-neutral-800 text-slate-400'
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
              selectedInstrument === 'AUDUSD'
                ? 'OANDA%3AAUDUSD'
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
          SECTION 1: ACTUAL AUD/USD LIVE MARKET PRICE DISPLAY
          ========================================================================= */}
      <div className="p-6 lg:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-neutral-800/80">
          {/* LEFT: Prominent Real Live Market Price Display */}
          <div className="flex flex-col space-y-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded bg-amber-500/15 border border-amber-500/40 text-amber-400 text-xs font-mono font-bold tracking-wider uppercase">
                {selectedInstrument === 'AUDUSD'
                  ? 'AUD/USD SPOT FOREX'
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
                    {selectedInstrument === 'AUDUSD' ? 'USD per AUD' : selectedInstrument === 'XAUUSD' ? 'USD/oz' : 'Points'}
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
                <span className="text-[10px] text-slate-500 block uppercase">Distance to TP1</span>
                <span className="font-bold text-emerald-400">{distanceToTp1} Pips Remaining</span>
              </div>
              <div className="p-2 rounded-lg bg-black/40 border border-neutral-800">
                <span className="text-[10px] text-slate-500 block uppercase">Stop Loss Buffer</span>
                <span className="font-bold text-rose-300">{distanceToSl} Pips Buffer</span>
              </div>
              <div className="p-2 rounded-lg bg-black/40 border border-neutral-800">
                <span className="text-[10px] text-slate-500 block uppercase">Take Profit Target</span>
                <span className="font-bold text-white">{activeTrade.takeProfit1.toFixed(decimals)}</span>
              </div>
              <div className="p-2 rounded-lg bg-black/40 border border-neutral-800">
                <span className="text-[10px] text-slate-500 block uppercase">Protection Stop Loss</span>
                <span className="font-bold text-white">{activeTrade.stopLoss.toFixed(decimals)}</span>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            SECTION 2: AUTOMATIC SINGLE TRADING DECISION (BUY OR SELL OR WAIT)
            NEVER displays competing choices. NEVER asks user to choose.
            ========================================================================= */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-mono tracking-widest text-slate-400 font-bold flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>AUTOMATIC CRT STRATEGY DECISION</span>
              <span className="text-neutral-600">·</span>
              <span className="text-amber-400/90 font-normal">Engine Automatically Selects Single Valid Direction</span>
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              Rule Compliance: Single Active Signal Only
            </span>
          </div>

          {/* -------------------------------------------------------------------
              CASE 1: BUY DECISION ONLY (BULLISH CRT FULLY CONFIRMED)
              ------------------------------------------------------------------- */}
          {isBuy && (
            <div className="w-full rounded-2xl p-6 sm:p-7 border border-emerald-400 bg-gradient-to-br from-emerald-950/80 via-emerald-900/30 to-[#070e0a] shadow-[0_0_45px_rgba(16,185,129,0.3)] ring-2 ring-emerald-400/40 space-y-6 animate-in fade-in duration-300">
              {/* Decision Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-emerald-500/30">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-white text-emerald-800 flex items-center justify-center shrink-0 shadow-xl shadow-emerald-500/20">
                    <TrendingUp className="w-8 h-8 stroke-[3]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-3xl sm:text-4xl font-black font-mono text-white tracking-tight uppercase">
                        BUY
                      </span>
                      <span className="px-3 py-1 rounded-full bg-white text-emerald-900 text-xs font-black uppercase font-mono shadow-md animate-pulse">
                        CONFIRMED SIGNAL
                      </span>
                    </div>
                    <div className="text-xs font-mono text-emerald-200/90 mt-1 flex items-center gap-2">
                      <span className="font-bold">BULLISH CRT EXPANSION VALIDATED</span>
                      <span>·</span>
                      <span>Confirmation Time: <strong className="text-white">{confirmationTime}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Primary Action Button */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleOpenConfirmedOrderModal}
                    className="py-3 px-6 rounded-xl font-mono font-black text-sm uppercase tracking-wider bg-white hover:bg-emerald-100 text-emerald-950 shadow-lg shadow-emerald-500/30 transition-all active:scale-95 flex items-center gap-2"
                  >
                    <TrendingUp className="w-4 h-4 stroke-[3]" />
                    <span>CONNECT & EXECUTE BUY @ {currentAsk.toFixed(decimals)}</span>
                  </button>
                </div>
              </div>

              {/* Reason for Selecting BUY */}
              <div className="p-4 rounded-xl bg-black/50 border border-emerald-500/30 space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-300 uppercase">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Reason for Selecting BUY:</span>
                </div>
                <p className="text-xs text-slate-200 font-sans leading-relaxed">
                  {selectionReason}
                </p>
                <div className="pt-2 border-t border-emerald-500/20 flex flex-wrap items-center gap-3 text-[11px] font-mono text-emerald-300/80">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Monthly Bullish Expansion
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Weekly KL Mitigation
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    1H Purge Completed
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    5M SMT Model 1 Trigger
                  </span>
                </div>
              </div>

              {/* Exact Setup Parameters Grid: Entry, SL, TP1, TP2, TP3 */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono">
                {/* BUY ENTRY PRICE */}
                <div className="p-4 rounded-xl bg-black/60 border border-emerald-500/40 flex flex-col justify-between">
                  <span className="text-[11px] uppercase tracking-wider text-emerald-300 font-bold">
                    BUY Entry Price
                  </span>
                  <div className="my-1 text-2xl font-black text-white tabular-nums">
                    {entryPriceFormatted}
                  </div>
                  <span className="text-[10px] text-emerald-200/70">Institutional Trigger</span>
                </div>

                {/* STOP LOSS */}
                <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/40 flex flex-col justify-between">
                  <span className="text-[11px] uppercase tracking-wider text-rose-400 font-bold">
                    Stop Loss (SL)
                  </span>
                  <div className="my-1 text-2xl font-black text-rose-300 tabular-nums">
                    {stopLossFormatted}
                  </div>
                  <span className="text-[10px] text-rose-400/80">Risk: {signal?.pipsRisk} Pips</span>
                </div>

                {/* TP1 */}
                <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-wider text-emerald-400 font-bold">
                      TP1 (1:2)
                    </span>
                    <span className="text-[10px] text-emerald-300 bg-emerald-500/20 px-1 rounded font-bold">
                      +{signal?.pipsReward1} Pips
                    </span>
                  </div>
                  <div className="my-1 text-2xl font-black text-emerald-300 tabular-nums">
                    {tp1Formatted}
                  </div>
                  <span className="text-[10px] text-emerald-400/80">Initial Target</span>
                </div>

                {/* TP2 */}
                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/50 flex flex-col justify-between">
                  <span className="text-[11px] uppercase tracking-wider text-emerald-400 font-bold">
                    TP2 (1:3)
                  </span>
                  <div className="my-1 text-2xl font-black text-emerald-300 tabular-nums">
                    {tp2Formatted}
                  </div>
                  <span className="text-[10px] text-emerald-400/80">Weekly Key Level</span>
                </div>

                {/* TP3 */}
                <div className="col-span-2 sm:col-span-1 p-4 rounded-xl bg-amber-950/30 border border-amber-500/40 flex flex-col justify-between">
                  <span className="text-[11px] uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1">
                    <Target className="w-3.5 h-3.5" /> TP3 (1:5)
                  </span>
                  <div className="my-1 text-2xl font-black text-amber-300 tabular-nums">
                    {tp3Formatted}
                  </div>
                  <span className="text-[10px] text-amber-400/80 truncate">Macro Pool Target</span>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopySetup}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-black/60 hover:bg-neutral-900 border border-emerald-500/30 text-emerald-200 transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy Setup'}</span>
                  </button>

                  {onLogTrade && (
                    <button
                      onClick={handleLogTradeClick}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-black/60 hover:bg-neutral-900 border border-emerald-500/30 text-emerald-200 transition-colors"
                    >
                      {logged ? <Check className="w-3.5 h-3.5 text-amber-400" /> : <BookmarkPlus className="w-3.5 h-3.5" />}
                      <span>{logged ? 'Logged' : 'Log Trade'}</span>
                    </button>
                  )}
                </div>

                <div className="text-[11px] text-emerald-300/80">
                  Target Pool: <strong className="text-white">{signal?.targetLiquidityName} ({signal?.targetLiquidityPrice.toFixed(decimals)})</strong>
                </div>
              </div>
            </div>
          )}

          {/* -------------------------------------------------------------------
              CASE 2: SELL DECISION ONLY (BEARISH CRT FULLY CONFIRMED)
              ------------------------------------------------------------------- */}
          {isSell && (
            <div className="w-full rounded-2xl p-6 sm:p-7 border border-rose-400 bg-gradient-to-br from-rose-950/80 via-rose-900/30 to-[#120709] shadow-[0_0_45px_rgba(239,68,68,0.3)] ring-2 ring-rose-400/40 space-y-6 animate-in fade-in duration-300">
              {/* Decision Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-rose-500/30">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-white text-rose-800 flex items-center justify-center shrink-0 shadow-xl shadow-rose-500/20">
                    <TrendingDown className="w-8 h-8 stroke-[3]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-3xl sm:text-4xl font-black font-mono text-white tracking-tight uppercase">
                        SELL
                      </span>
                      <span className="px-3 py-1 rounded-full bg-white text-rose-900 text-xs font-black uppercase font-mono shadow-md animate-pulse">
                        CONFIRMED SIGNAL
                      </span>
                    </div>
                    <div className="text-xs font-mono text-rose-200/90 mt-1 flex items-center gap-2">
                      <span className="font-bold">BEARISH CRT EXPANSION VALIDATED</span>
                      <span>·</span>
                      <span>Confirmation Time: <strong className="text-white">{confirmationTime}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Primary Action Button */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleOpenConfirmedOrderModal}
                    className="py-3 px-6 rounded-xl font-mono font-black text-sm uppercase tracking-wider bg-white hover:bg-rose-100 text-rose-950 shadow-lg shadow-rose-500/30 transition-all active:scale-95 flex items-center gap-2"
                  >
                    <TrendingDown className="w-4 h-4 stroke-[3]" />
                    <span>CONNECT & EXECUTE SELL @ {currentBid.toFixed(decimals)}</span>
                  </button>
                </div>
              </div>

              {/* Reason for Selecting SELL */}
              <div className="p-4 rounded-xl bg-black/50 border border-rose-500/30 space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-rose-300 uppercase">
                  <ShieldCheck className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>Reason for Selecting SELL:</span>
                </div>
                <p className="text-xs text-slate-200 font-sans leading-relaxed">
                  {selectionReason}
                </p>
                <div className="pt-2 border-t border-rose-500/20 flex flex-wrap items-center gap-3 text-[11px] font-mono text-rose-300/80">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-rose-400" />
                    Monthly Bearish Expansion
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-rose-400" />
                    Weekly KL Mitigation
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-rose-400" />
                    1H Purge Completed
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-rose-400" />
                    5M SMT Model 1 Trigger
                  </span>
                </div>
              </div>

              {/* Exact Setup Parameters Grid: Entry, SL, TP1, TP2, TP3 */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono">
                {/* SELL ENTRY PRICE */}
                <div className="p-4 rounded-xl bg-black/60 border border-rose-500/40 flex flex-col justify-between">
                  <span className="text-[11px] uppercase tracking-wider text-rose-300 font-bold">
                    SELL Entry Price
                  </span>
                  <div className="my-1 text-2xl font-black text-white tabular-nums">
                    {entryPriceFormatted}
                  </div>
                  <span className="text-[10px] text-rose-200/70">Institutional Trigger</span>
                </div>

                {/* STOP LOSS */}
                <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/40 flex flex-col justify-between">
                  <span className="text-[11px] uppercase tracking-wider text-rose-400 font-bold">
                    Stop Loss (SL)
                  </span>
                  <div className="my-1 text-2xl font-black text-rose-300 tabular-nums">
                    {stopLossFormatted}
                  </div>
                  <span className="text-[10px] text-rose-400/80">Risk: {signal?.pipsRisk} Pips</span>
                </div>

                {/* TP1 */}
                <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/40 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-wider text-rose-400 font-bold">
                      TP1 (1:2)
                    </span>
                    <span className="text-[10px] text-rose-300 bg-rose-500/20 px-1 rounded font-bold">
                      +{signal?.pipsReward1} Pips
                    </span>
                  </div>
                  <div className="my-1 text-2xl font-black text-rose-300 tabular-nums">
                    {tp1Formatted}
                  </div>
                  <span className="text-[10px] text-rose-400/80">Initial Target</span>
                </div>

                {/* TP2 */}
                <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/50 flex flex-col justify-between">
                  <span className="text-[11px] uppercase tracking-wider text-rose-400 font-bold">
                    TP2 (1:3)
                  </span>
                  <div className="my-1 text-2xl font-black text-rose-300 tabular-nums">
                    {tp2Formatted}
                  </div>
                  <span className="text-[10px] text-rose-400/80">Weekly Key Level</span>
                </div>

                {/* TP3 */}
                <div className="col-span-2 sm:col-span-1 p-4 rounded-xl bg-amber-950/30 border border-amber-500/40 flex flex-col justify-between">
                  <span className="text-[11px] uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1">
                    <Target className="w-3.5 h-3.5" /> TP3 (1:5)
                  </span>
                  <div className="my-1 text-2xl font-black text-amber-300 tabular-nums">
                    {tp3Formatted}
                  </div>
                  <span className="text-[10px] text-amber-400/80 truncate">Macro Pool Target</span>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopySetup}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-black/60 hover:bg-neutral-900 border border-rose-500/30 text-rose-200 transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-rose-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy Setup'}</span>
                  </button>

                  {onLogTrade && (
                    <button
                      onClick={handleLogTradeClick}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-black/60 hover:bg-neutral-900 border border-rose-500/30 text-rose-200 transition-colors"
                    >
                      {logged ? <Check className="w-3.5 h-3.5 text-amber-400" /> : <BookmarkPlus className="w-3.5 h-3.5" />}
                      <span>{logged ? 'Logged' : 'Log Trade'}</span>
                    </button>
                  )}
                </div>

                <div className="text-[11px] text-rose-300/80">
                  Target Pool: <strong className="text-white">{signal?.targetLiquidityName} ({signal?.targetLiquidityPrice.toFixed(decimals)})</strong>
                </div>
              </div>
            </div>
          )}

          {/* -------------------------------------------------------------------
              CASE 3: WAIT DECISION (NO CONFIRMED SETUP / CONDITIONS CONFLICT)
              ------------------------------------------------------------------- */}
          {isWait && (
            <div className="w-full rounded-2xl p-6 sm:p-7 border border-amber-500/50 bg-gradient-to-br from-amber-950/40 via-amber-900/15 to-[#0b0c10] shadow-[0_0_35px_rgba(245,158,11,0.15)] space-y-6 animate-in fade-in duration-300">
              {/* Decision Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-amber-500/30">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-xl shadow-amber-500/20">
                    <PauseCircle className="w-8 h-8 stroke-[2.5]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-3xl sm:text-4xl font-black font-mono text-amber-400 tracking-tight uppercase">
                        WAIT
                      </span>
                      <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold uppercase font-mono">
                        CAPITAL PRESERVATION
                      </span>
                    </div>
                    <div className="text-xs font-mono text-slate-300 mt-1 flex items-center gap-2">
                      <span>NO VALID SETUP CONFIRMED</span>
                      <span>·</span>
                      <span>Evaluation Time: <strong className="text-slate-100">{confirmationTime}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={onSearchSignal}
                    disabled={isSearching}
                    className="py-3 px-5 rounded-xl font-mono font-bold text-xs uppercase tracking-wider bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 transition-all active:scale-95 flex items-center gap-2"
                  >
                    {isSearching ? <Loader2 className="w-4 h-4 animate-spin text-slate-950" /> : <Search className="w-4 h-4" />}
                    <span>Scan Market for Setup</span>
                  </button>
                </div>
              </div>

              {/* Reason for Selecting WAIT */}
              <div className="p-4 rounded-xl bg-black/60 border border-amber-500/30 space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-400 uppercase">
                  <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Reason for Selecting WAIT:</span>
                </div>
                <p className="text-xs text-slate-200 font-sans leading-relaxed">
                  {selectionReason}
                </p>
                <div className="pt-2 border-t border-amber-500/20 flex flex-wrap items-center gap-3 text-[11px] font-mono text-slate-400">
                  <span className="flex items-center gap-1.5 text-amber-300">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    Strict Strategy Rule: Never guess, force trades, or present competing BUY vs SELL options
                  </span>
                  <span>·</span>
                  <span>Awaiting clean institutional liquidity purge & 5M displacement</span>
                </div>
              </div>

              {/* Setup Parameters in WAIT State */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono">
                {/* Entry Price */}
                <div className="p-4 rounded-xl bg-black/50 border border-neutral-800 flex flex-col justify-between">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                    Entry Price
                  </span>
                  <div className="my-1 text-xl font-bold text-slate-300">
                    ---
                  </div>
                  <span className="text-[10px] text-amber-400">No Trade Permitted</span>
                </div>

                {/* Stop Loss */}
                <div className="p-4 rounded-xl bg-black/50 border border-neutral-800 flex flex-col justify-between">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                    Stop Loss (SL)
                  </span>
                  <div className="my-1 text-xs text-slate-300 font-mono">
                    Calculated on 5M close
                  </div>
                  <span className="text-[10px] text-slate-500">Awaiting Invalidation Wick</span>
                </div>

                {/* TP1 */}
                <div className="p-4 rounded-xl bg-black/50 border border-neutral-800 flex flex-col justify-between">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                    Take Profit 1
                  </span>
                  <div className="my-1 text-xs text-slate-300 font-mono">
                    Target: 1:2 R:R
                  </div>
                  <span className="text-[10px] text-slate-500">Liquidity Target</span>
                </div>

                {/* TP2 */}
                <div className="p-4 rounded-xl bg-black/50 border border-neutral-800 flex flex-col justify-between">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                    Take Profit 2
                  </span>
                  <div className="my-1 text-xs text-slate-300 font-mono">
                    Target: 1:3 R:R
                  </div>
                  <span className="text-[10px] text-slate-500">Weekly Key Level</span>
                </div>

                {/* TP3 */}
                <div className="col-span-2 sm:col-span-1 p-4 rounded-xl bg-black/50 border border-neutral-800 flex flex-col justify-between">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1">
                    <Target className="w-3.5 h-3.5 text-amber-400" /> TP3 (Monthly)
                  </span>
                  <div className="my-1 text-xs text-slate-300 font-mono">
                    Target: 1:5 R:R
                  </div>
                  <span className="text-[10px] text-slate-500 truncate">Macro Target Pool</span>
                </div>
              </div>

              {/* Status Note */}
              <div className="pt-2 flex items-center justify-between text-xs font-mono text-slate-400">
                <span>The app makes the signal decision automatically. The user only receives the selected trading direction.</span>
                <span className="text-amber-400 font-bold">{selectedInstrument} · Status: WAIT</span>
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
        signal={signal}
        broker={broker}
        onOrderExecuted={handleOrderExecuted}
      />
    </div>
  );
};
