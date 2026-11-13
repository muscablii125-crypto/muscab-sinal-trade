/**
 * MUSCAB CRT PRO - ADVANCED FOREX SIGNAL ANALYSIS APP
 * Primary Application Entry & Orchestration
 * Real-Time WebSocket Streaming & Authentic Market Feeds
 * Includes:
 * 1. Real-time AUD/USD Forex Feed with live Bid, Ask, Mid Price and Spread
 * 2. High-Frequency WebSocket Streaming with live millisecond timestamps
 * 3. Exact chart candle synchronization with live market ticks
 * 4. Transparent broker selection: OANDA Retail Forex vs Binance Spot Gold ECN
 * 5. Strict DATA DISCONNECTED status without generating fake or delayed prices
 * 6. 8-Period Somalia Time (UTC+3) Sessions & 5M CRT Liquidity Targets
 * 7. Dashboard Trade History with Win/Loss Statistics
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  InstrumentId,
  Timeframe,
  CrtStrategyConfig,
  CrtSignalResult,
  Candle,
  PriceAlert,
  LiveQuoteTick,
} from './types/trading';
import { SUPPORTED_INSTRUMENTS, DEFAULT_CRT_RULES } from './constants/instruments';
import {
  fetchLiveMarketDataset,
  MarketDataset,
} from './services/marketData';
import { evaluateCrtSignal } from './services/crtAnalysisEngine';
import { soundEffects } from './services/soundEffects';
import { priceAlertsService } from './services/priceAlerts';
import { tradeHistoryService } from './services/tradeHistory';
import { marketStreaming } from './services/marketStreaming';
import { Header } from './components/Header';
import { HomeScreenSignalCard } from './components/HomeScreenSignalCard';
import { SessionBanner } from './components/SessionBanner';
import { InstrumentSelector } from './components/InstrumentSelector';
import { SignalSearchSection } from './components/SignalSearchSection';
import { SignalResultCard } from './components/SignalResultCard';
import { TradeHistorySection } from './components/TradeHistorySection';
import { PriceAlertsModal } from './components/PriceAlertsModal';
import { TradingViewChart } from './components/TradingViewChart';
import { OfficialTradingViewWidget } from './components/OfficialTradingViewWidget';
import { MultiTimeframeBreakdown } from './components/MultiTimeframeBreakdown';
import { StrategyConfigModal } from './components/StrategyConfigModal';
import { AiAnalysisDrawer } from './components/AiAnalysisDrawer';
import { GoldCfdSpecsCard } from './components/GoldCfdSpecsCard';
import { AuthModal } from './components/AuthModal';
import { UserProfileModal } from './components/UserProfileModal';
import { SupportModal } from './components/SupportModal';
import { authService } from './services/authService';
import { UserAccount } from './types/auth';
import { Activity, ShieldAlert, Bell, X, Building2, LifeBuoy, Mail, ExternalLink, Sliders } from 'lucide-react';

interface AlertToast {
  id: string;
  alert: PriceAlert;
  price: number;
}

export default function App() {
  // Primary State
  const [selectedInstrument, setSelectedInstrument] = useState<InstrumentId>('AUDUSD');
  const [activeTimeframe, setActiveTimeframe] = useState<Timeframe>('5M');
  const [strategyConfig, setStrategyConfig] = useState<CrtStrategyConfig>(DEFAULT_CRT_RULES);
  const [dstOffsetHours, setDstOffsetHours] = useState<number>(0);
  const [broker, setBroker] = useState<'BINANCE' | 'OANDA'>('OANDA');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => soundEffects.isEnabled());
  const [chartMode, setChartMode] = useState<'TRADINGVIEW' | 'CRT_ENGINE'>('TRADINGVIEW');

  // Real-Time Streaming State
  const [connectionStatus, setConnectionStatus] = useState<'LIVE_CONNECTED' | 'DATA_DISCONNECTED'>(() =>
    marketStreaming.getStatus()
  );
  const [quoteTicks, setQuoteTicks] = useState<Record<InstrumentId, LiveQuoteTick> | null>(() =>
    marketStreaming.getLatestQuotes()
  );

  // Live Real-Time Market Quotes
  const [livePrices, setLivePrices] = useState<Record<InstrumentId, number>>({
    XAUUSD: SUPPORTED_INSTRUMENTS.XAUUSD.currentPrice,
    AUDUSD: SUPPORTED_INSTRUMENTS.AUDUSD.currentPrice,
    NASDAQ: SUPPORTED_INSTRUMENTS.NASDAQ.currentPrice,
  });

  // Current Signal Result
  const [signalResult, setSignalResult] = useState<CrtSignalResult | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [chartLoading, setChartLoading] = useState<boolean>(false);

  // Modals & Panels
  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);
  const [isAiAuditOpen, setIsAiAuditOpen] = useState<boolean>(false);
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState<boolean>(false);
  const [alertsCount, setAlertsCount] = useState<number>(() => priceAlertsService.getActiveAlertsCount());

  // User Authentication & Profile & Support State
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => authService.getCurrentUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState<boolean>(false);

  // Active chart dataset
  const [chartCandles, setChartCandles] = useState<Candle[]>([]);
  const [correlatedCandles, setCorrelatedCandles] = useState<Candle[]>([]);

  // Visual Alert Toasts
  const [toasts, setToasts] = useState<AlertToast[]>([]);

  // Track current execution to avoid race conditions
  const searchIdRef = useRef<number>(0);
  const prevVerdictRef = useRef<string>('WAIT');

  const handleToggleSound = (enabled: boolean) => {
    soundEffects.setEnabled(enabled);
    setSoundEnabled(enabled);
    if (enabled) {
      soundEffects.playAlertChime();
    }
  };

  const handleBrokerChange = (newBroker: 'BINANCE' | 'OANDA') => {
    if (newBroker !== broker) {
      setBroker(newBroker);
      marketStreaming.setBroker(newBroker);
    }
  };

  const handleOpenAuth = (authMode: 'LOGIN' | 'SIGNUP' = 'LOGIN') => {
    setAuthModalMode(authMode);
    setIsAuthModalOpen(true);
  };

  const handleLogout = () => {
    authService.logout();
    soundEffects.playAlertChime();
  };

  const handleAuthSuccess = (user: UserAccount) => {
    setCurrentUser(user);
    if (user.preferredBroker) {
      if (user.preferredBroker === 'BINANCE') {
        handleBrokerChange('BINANCE');
      } else {
        handleBrokerChange('OANDA');
      }
    }
  };

  // Subscribe to auth state changes
  useEffect(() => {
    const unsubAuth = authService.subscribe((user) => {
      setCurrentUser(user);
    });
    return unsubAuth;
  }, []);

  // Initial quote fetch on mount
  useEffect(() => {
    marketStreaming.pollHttpQuotes();
  }, []);

  /**
   * 1. Subscribe to real-time WebSocket tick stream
   * Updates prices continuously with Bid, Ask, Mid, Spread and millisecond timestamps
   */
  useEffect(() => {
    const unsubQuotes = marketStreaming.subscribeQuotes((ticks) => {
      setQuoteTicks(ticks);
      setLivePrices((prev) => {
        const updatedPrices: Record<InstrumentId, number> = {
          XAUUSD: ticks.XAUUSD?.midPrice > 0 ? ticks.XAUUSD.midPrice : prev.XAUUSD,
          AUDUSD: ticks.AUDUSD?.midPrice > 0 ? ticks.AUDUSD.midPrice : prev.AUDUSD,
          NASDAQ: ticks.NASDAQ?.midPrice > 0 ? ticks.NASDAQ.midPrice : prev.NASDAQ,
        };

        // Check price target alerts
        const triggered = priceAlertsService.checkAlerts(updatedPrices);
        if (triggered.length > 0) {
          setAlertsCount(priceAlertsService.getActiveAlertsCount());
          soundEffects.playAlertChime();

          const newToasts: AlertToast[] = triggered.map((alt) => ({
            id: `toast_${Date.now()}_${alt.id}`,
            alert: alt,
            price: updatedPrices[alt.instrument],
          }));

          setToasts((toastsList) => [...toastsList, ...newToasts]);

          newToasts.forEach((t) => {
            setTimeout(() => {
              setToasts((toastsList) => toastsList.filter((item) => item.id !== t.id));
            }, 7000);
          });
        }

        return updatedPrices;
      });
    });

    const unsubStatus = marketStreaming.subscribeStatus((status) => {
      setConnectionStatus(status);
    });

    return () => {
      unsubQuotes();
      unsubStatus();
    };
  }, []);

  /**
   * 2. Load genuine live market candles for chart whenever instrument, timeframe, or broker changes
   */
  const loadChartData = useCallback(
    async (instrument: InstrumentId, timeframe: Timeframe, currentBroker: 'BINANCE' | 'OANDA') => {
      setChartLoading(true);
      try {
        const dataset: MarketDataset = await fetchLiveMarketDataset(instrument, timeframe, currentBroker);
        if (dataset && dataset.candles && dataset.candles.length > 0) {
          setChartCandles(dataset.candles);
          setCorrelatedCandles(dataset.correlatedCandles || []);
        } else {
          setChartCandles([]);
          setCorrelatedCandles([]);
        }
      } catch (err) {
        console.error('[App] Failed to load chart candles:', err);
        setChartCandles([]);
      } finally {
        setChartLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadChartData(selectedInstrument, activeTimeframe, broker);
  }, [selectedInstrument, activeTimeframe, broker, loadChartData]);

  /**
   * 3. Evaluate CRT Signal across all timeframes:
   * Monthly -> Weekly -> 1D -> 4H -> 1H -> 30M -> 15M -> 5M
   */
  const runCrtAnalysis = useCallback(
    async (instrument: InstrumentId, config: CrtStrategyConfig, currentBroker: 'BINANCE' | 'OANDA') => {
      const currentRun = ++searchIdRef.current;
      setIsSearching(true);

      try {
        const result = await evaluateCrtSignal(instrument, config, currentBroker);
        if (currentRun === searchIdRef.current) {
          setSignalResult(result);

          // Audio chime on new BUY/SELL signal
          if (
            (result.verdict === 'BUY' || result.verdict === 'SELL') &&
            result.verdict !== prevVerdictRef.current
          ) {
            soundEffects.playSignalChime(result.verdict);
          }
          prevVerdictRef.current = result.verdict;

          if (result.entryPrice > 0 && result.liveFeedStatus === 'LIVE_CONNECTED') {
            setLivePrices((prev) => ({
              ...prev,
              [instrument]: result.entryPrice,
            }));
          }
        }
      } catch (err) {
        console.error('[App] CRT Signal evaluation error:', err);
      } finally {
        if (currentRun === searchIdRef.current) {
          setIsSearching(false);
        }
      }
    },
    []
  );

  // Re-run analysis when instrument, strategyConfig, or broker changes
  useEffect(() => {
    runCrtAnalysis(selectedInstrument, strategyConfig, broker);
  }, [selectedInstrument, strategyConfig, broker, runCrtAnalysis]);

  // Manual Refresh / Search Signal Button Click
  const handleSearchSignal = () => {
    marketStreaming.pollHttpQuotes();
    loadChartData(selectedInstrument, activeTimeframe, broker);
    runCrtAnalysis(selectedInstrument, strategyConfig, broker);
  };

  const handleSelectInstrument = (id: InstrumentId) => {
    if (id !== selectedInstrument) {
      setSelectedInstrument(id);
    }
  };

  const handleLogCurrentTrade = (signal: CrtSignalResult) => {
    tradeHistoryService.addFromSignal(signal);
  };

  const isGoldSelected = selectedInstrument === 'XAUUSD';
  const currentGoldPrice = livePrices.XAUUSD;
  const activeQuoteTick = quoteTicks?.[selectedInstrument] || null;

  return (
    <div className="min-h-screen bg-[#08080a] text-slate-100 flex flex-col font-sans selection:bg-amber-500/20 selection:text-amber-200">
      {/* 3-Zone Top Bar Header with Broker & Audio Controls */}
      <Header
        onOpenRules={() => setIsConfigOpen(true)}
        onOpenAiAudit={() => setIsAiAuditOpen(true)}
        onOpenAlerts={() => setIsAlertsModalOpen(true)}
        alertsCount={alertsCount}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        broker={broker}
        onToggleBroker={handleBrokerChange}
        currentUser={currentUser}
        onOpenAuth={handleOpenAuth}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onOpenSupport={() => setIsSupportModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Workspace Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* PRIMARY HERO: Home Screen AUD/USD Live Market Price & BUY / SELL / WAIT Display */}
        <section id="home-signal-hero">
          <HomeScreenSignalCard
            selectedInstrument={selectedInstrument}
            onSelectInstrument={handleSelectInstrument}
            quoteTick={activeQuoteTick}
            connectionStatus={connectionStatus}
            broker={broker}
            onToggleBroker={handleBrokerChange}
            signal={signalResult}
            isSearching={isSearching}
            onSearchSignal={handleSearchSignal}
            onRefreshQuotes={() => marketStreaming.pollHttpQuotes()}
            onOpenRulesConfig={() => setIsConfigOpen(true)}
            onOpenAiAudit={() => setIsAiAuditOpen(true)}
            onLogTrade={handleLogCurrentTrade}
          />
        </section>

        {/* Section 2: Forex Trading Sessions (Somalia UTC+3) */}
        <section id="sessions">
          <SessionBanner
            dstOffsetHours={dstOffsetHours}
            onDstChange={setDstOffsetHours}
          />
        </section>

        {/* Section 3: Instrument Selector (XAUUSD, AUDUSD, NASDAQ) */}
        <section id="instruments">
          <InstrumentSelector
            selectedInstrument={selectedInstrument}
            onSelectInstrument={handleSelectInstrument}
            livePrices={livePrices}
          />
        </section>

        {/* Section 4: Prominent SEARCH SIGNAL Button */}
        <section id="search-section">
          <SignalSearchSection
            selectedInstrument={selectedInstrument}
            onSearchSignal={handleSearchSignal}
            onRefreshLiveQuotes={() => marketStreaming.pollHttpQuotes()}
            isSearching={isSearching}
            signal={signalResult}
            onOpenRulesConfig={() => setIsConfigOpen(true)}
          />
        </section>

        {/* Section 5: Signal Results (BUY, SELL, or WAIT FOR SETUP) */}
        <section id="dashboard" className="space-y-4">
          <SignalResultCard
            signal={signalResult}
            onOpenAiAudit={() => setIsAiAuditOpen(true)}
            onLogTrade={handleLogCurrentTrade}
          />

          {/* Specialized XAUUSD CFD Hub & Risk Calculator (when Gold is selected) */}
          {isGoldSelected && (
            <GoldCfdSpecsCard
              currentGoldPrice={currentGoldPrice}
              signal={signalResult}
              onQuickSearchGold={handleSearchSignal}
            />
          )}
        </section>

        {/* Section 6: Dashboard Trade History (Last 10 Executed Signal Outcomes) */}
        <section id="history">
          <TradeHistorySection />
        </section>

        {/* Section 7: TradingView Terminal & CRT Strategy Chart Integration */}
        <section id="chart-view" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h3 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-400" />
                <span>TradingView Charting Center</span>
              </h3>

              {/* View Switcher: Official TradingView vs CRT Engine */}
              <div className="flex items-center bg-[#10121a] border border-neutral-800 rounded-xl p-1">
                <button
                  onClick={() => setChartMode('TRADINGVIEW')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                    chartMode === 'TRADINGVIEW'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-1 ring-blue-400'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Official TradingView Advanced Chart with real-time indicators and full toolkit"
                >
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  <span>TradingView Live Terminal</span>
                </button>

                <button
                  onClick={() => setChartMode('CRT_ENGINE')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                    chartMode === 'CRT_ENGINE'
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 ring-1 ring-amber-300'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="MUSCAB CRT Key Level overlays (PDH, PDL, PWH, PWL) & Long/Short tool"
                >
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>CRT Strategy Overlays</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
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
                className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-900/20 hover:bg-blue-900/40 border border-blue-500/30 text-blue-300 hover:text-white transition-colors"
                title="Launch full chart on TradingView.com"
              >
                <span>TradingView.com</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              {connectionStatus === 'DATA_DISCONNECTED' || signalResult?.liveFeedStatus === 'DATA_DISCONNECTED' ? (
                <span className="text-rose-400 flex items-center gap-1 font-bold animate-pulse">
                  <ShieldAlert className="w-3.5 h-3.5" /> DATA DISCONNECTED
                </span>
              ) : (
                <span className="text-slate-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="hidden md:inline">Feed:</span>
                  <strong className="text-emerald-400 font-bold">
                    {broker === 'OANDA' ? 'OANDA MT5' : 'Binance ECN'}
                  </strong>
                </span>
              )}
            </div>
          </div>

          {/* RENDER CHOSEN CHART MODE */}
          {chartMode === 'TRADINGVIEW' ? (
            <OfficialTradingViewWidget
              instrument={selectedInstrument}
              timeframe={activeTimeframe}
              broker={broker}
              height={520}
            />
          ) : (
            <TradingViewChart
              instrument={selectedInstrument}
              timeframe={activeTimeframe}
              onTimeframeChange={setActiveTimeframe}
              candles={chartCandles}
              correlatedCandles={correlatedCandles}
              signal={signalResult}
              height={520}
              liveMidPrice={activeQuoteTick?.midPrice}
              connectionStatus={connectionStatus}
            />
          )}
        </section>

        {/* Section 8: Sequential Multi-Timeframe Breakdown (Monthly → Weekly → 1D → 4H → 1H → 30M → 15M → 5M) */}
        <section id="timeframe-breakdown">
          <MultiTimeframeBreakdown signal={signalResult} />
        </section>
      </main>

      {/* Custom Price Alerts Management Modal */}
      <PriceAlertsModal
        isOpen={isAlertsModalOpen}
        onClose={() => setIsAlertsModalOpen(false)}
        currentPrices={livePrices}
        onAlertsUpdated={() => setAlertsCount(priceAlertsService.getActiveAlertsCount())}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
      />

      {/* Strategy Configuration Modal */}
      <StrategyConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        config={strategyConfig}
        onSaveConfig={(newConfig) => {
          setStrategyConfig(newConfig);
          runCrtAnalysis(selectedInstrument, newConfig, broker);
        }}
      />

      {/* AI Strategy Confluence Audit Modal */}
      <AiAnalysisDrawer
        isOpen={isAiAuditOpen}
        onClose={() => setIsAiAuditOpen(false)}
        signal={signalResult}
      />

      {/* Login & Sign Up Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
        initialMode={authModalMode}
      />

      {/* User Profile & MT5 Settings Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={currentUser}
        onProfileUpdated={(updated) => {
          setCurrentUser(updated);
          if (updated.preferredBroker) {
            if (updated.preferredBroker === 'BINANCE') {
              handleBrokerChange('BINANCE');
            } else {
              handleBrokerChange('OANDA');
            }
          }
        }}
        onLogout={handleLogout}
      />

      {/* Support System Modal (Official Support: muscablii125@gmail.com) */}
      <SupportModal
        isOpen={isSupportModalOpen}
        onClose={() => setIsSupportModalOpen(false)}
        currentUser={currentUser}
        currentDiagnostics={{
          instrument: selectedInstrument,
          broker: currentUser?.preferredBroker || (broker === 'OANDA' ? 'OANDA MT5' : 'Binance ECN'),
          timeframe: activeTimeframe,
          connectionStatus,
        }}
      />

      {/* Floating Price Alert Toast Notifications */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto p-4 rounded-xl border border-amber-500/50 bg-[#0d0f17] text-slate-100 shadow-2xl flex items-start justify-between gap-3 animate-in slide-in-from-bottom-5 duration-300"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <Bell className="w-4 h-4 animate-bounce" />
              </div>
              <div className="text-xs font-mono">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <span className="text-amber-400">{toast.alert.instrument}</span>
                  <span>Price Target Reached!</span>
                </div>
                <div className="text-slate-300 mt-0.5">
                  Live Price crossed {toast.alert.condition === 'ABOVE' ? '≥' : '≤'}{' '}
                  <strong className="text-amber-300 font-bold">
                    {toast.alert.targetPrice.toFixed(
                      SUPPORTED_INSTRUMENTS[toast.alert.instrument].decimals
                    )}
                  </strong>
                </div>
                {toast.alert.note && (
                  <div className="text-slate-400 text-[11px] mt-1 italic">
                    "{toast.alert.note}"
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="p-1 text-slate-500 hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Clean Unboxed Footer with Official Support info */}
      <footer className="w-full border-t border-neutral-900 bg-[#070709] py-6 px-4 text-xs font-mono text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-300">MUSCAB CRT PRO</span>
            <span>·</span>
            <span>Institutional Candle Range Theory Terminal</span>
            <span>·</span>
            <span>Somalia Local Time (UTC+3)</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-slate-400">
            <div className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-amber-400" />
              <span>Official Support:</span>
              <a
                href="mailto:muscablii125@gmail.com"
                className="text-amber-400 hover:text-amber-300 font-bold underline decoration-amber-500/50"
              >
                muscablii125@gmail.com
              </a>
            </div>

            <button
              onClick={() => setIsSupportModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-slate-300 hover:text-white transition-colors"
            >
              <LifeBuoy className="w-3 h-3 text-amber-400" />
              <span>Contact Support</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
