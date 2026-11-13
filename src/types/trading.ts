/**
 * MUSCAB CRT PRO - Domain Types & Strategy Interfaces
 */

export type InstrumentId = 'XAUUSD' | 'AUDUSD' | 'NASDAQ';

export interface InstrumentInfo {
  id: InstrumentId;
  name: string;
  ticker: string;
  category: 'Metals' | 'Forex' | 'Indices';
  pipSize: number;
  decimals: number;
  correlatedPair: string; // for SMT Divergence
  description: string;
  currentPrice: number;
  change24h: number;
  contractSize?: string;
  spreadPips?: number;
  tickValuePerLot?: number;
  cfdType?: string;
  provider?: string;
  dataProvider?: string;
  apiSymbol?: string;
  unit?: string;
  status?: 'LIVE' | 'DATA_UNAVAILABLE' | 'DATA_DISCONNECTED';
  lastUpdatedIso?: string;
}

export interface LiveQuoteTick {
  symbol: InstrumentId;
  instrumentName: string;
  price: number;
  midPrice: number;
  bid: number;
  ask: number;
  spreadPips: number;
  high24h: number;
  low24h: number;
  change24h: number;
  provider: string;
  apiSymbol: string;
  unit: string;
  lastUpdated: number;
  lastUpdatedIso: string;
  status: 'LIVE' | 'DATA_DISCONNECTED';
  broker: 'BINANCE' | 'OANDA';
  sourceNotice?: string;
}

export type Timeframe = '1M' | '1W' | '1D' | '4H' | '1H' | '30M' | '15M' | '5M';

export interface Candle {
  time: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export type SignalVerdict = 'BUY' | 'SELL' | 'WAIT';

export type SignalStatusType =
  | 'CONFIRMED_SIGNAL'
  | 'DETECTED_SETUP'
  | 'WAIT_FOR_SETUP'
  | 'ANALYZING';

// Professional 7-Period Session System (+ DEAD TIME)
export type ForexSessionPeriod =
  | 'PRE_ASIAN'
  | 'ASIAN_SESSION'
  | 'PRE_LONDON'
  | 'LONDON_SESSION'
  | 'PRE_NEW_YORK'
  | 'NEW_YORK_AM'
  | 'NEW_YORK_PM'
  | 'DEAD_TIME';

export interface SessionScheduleItem {
  id: ForexSessionPeriod;
  name: string;
  startHour: number; // In Somalia time (UTC+3)
  startMinute: number;
  endHour: number;
  endMinute: number;
  color: string;
  accentColor: string;
  description: string;
}

export interface TradingSessionState {
  currentSession: ForexSessionPeriod;
  sessionName: string;
  isOpen: boolean; // True if inside any active session
  openTimeSomalia: string;
  closeTimeSomalia: string;
  nextSessionName: string;
  timeToNextSessionSeconds: number;
  timeRemainingInCurrentSessionSeconds: number;
  somaliaTimeString: string;
  dstOffsetHours: number;
  color: string;
}

// Liquidity Target Levels (PDH, PDL, PWH, PWL, PMH, PML)
export interface LiquidityLevels {
  pdh: number; // Previous Day High
  pdl: number; // Previous Day Low
  pwh: number; // Previous Week High
  pwl: number; // Previous Week Low
  pmh: number; // Previous Month High
  pml: number; // Previous Month Low
  targetLevelName?: 'PDH' | 'PDL' | 'PWH' | 'PWL' | 'PMH' | 'PML';
  targetLevelPrice?: number;
  targetDistancePips?: number;
  targetDescription?: string;
}

// Trend Line Drawing Model for Manual Chart Tool
export interface TrendLine {
  id: string;
  instrument: InstrumentId;
  startTime: number;
  startPrice: number;
  endTime: number;
  endPrice: number;
  color: string;
  width: number;
  style: 'solid' | 'dashed' | 'dotted';
  extendRight: boolean;
  label?: string;
}

// Long & Short Position Drawing Model for Interactive Risk/Reward Analysis
export type PositionType = 'LONG' | 'SHORT';

export interface PositionDrawing {
  id: string;
  instrument: InstrumentId;
  type: PositionType; // 'LONG' or 'SHORT'
  startTime: number;
  endTime: number;
  entryPrice: number;
  takeProfitPrice: number;
  stopLossPrice: number;
  accountSize?: number;
  riskPercent?: number;
  lotSize?: number;
}

// Price Alert Notification Model
export interface PriceAlert {
  id: string;
  instrument: InstrumentId;
  targetPrice: number;
  condition: 'ABOVE' | 'BELOW';
  createdAt: number;
  triggered: boolean;
  triggeredAt?: number;
  note?: string;
}

// Trade History Log Model
export interface TradeHistoryItem {
  id: string;
  date: string;
  time: string;
  timestamp: number;
  instrument: InstrumentId;
  direction: 'BUY' | 'SELL';
  entryPrice: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  takeProfit3: number;
  targetLevel: string;
  targetPrice: number;
  result: 'WIN' | 'LOSS' | 'IN_PROGRESS';
  pnlPips: number;
  model: string;
}

// Custom CRT Strategy Configuration
export interface CrtStrategyConfig {
  // Turtle Soup (TS) Rules
  tsSweepMinPips: number;
  tsRequireRejectionClose: boolean;
  tsMaxWickBars: number;

  // Model 1 Rules
  model1DisplacementMultiplier: number;
  model1MinRiskReward: number;

  // Order Block (OB) Rules
  requireWeeklyOBReturn: boolean;
  obMitigationTolerancePips: number;
  obIncludeWicks: boolean;

  // Key Levels (KL) Rules
  klRetestTolerancePips: number;
  klLookbackBars: number;

  // Purge Rules
  purgeMinLiquidityPoints: number;
  purgeLookbackHours: number;

  // SMT Divergence Rules
  smtLookbackBars: number;
  smtSensitivity: 'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE';

  // Execution
  tp1Ratio: number;
  tp2Ratio: number;
  tp3Ratio: number;
  slBufferPips: number;
}

// Timeframe-Specific Analysis Results
export interface MonthlyAnalysis {
  direction: 'BULLISH' | 'BEARISH' | 'CONSOLIDATION';
  tsDetected: boolean;
  tsDetails: string;
  tsLevel?: number;
  model1Valid: boolean;
  model1Details: string;
  monthlyTarget: number;
  monthlyTargetLabel: string;
  smtAvailable: boolean;
  smtDetected: boolean;
  smtDetails: string;
  notes: string;
}

export interface WeeklyAnalysis {
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  tsDetected: boolean;
  tsDetails: string;
  obIdentified: boolean;
  obDetails?: string;
  obZone?: { high: number; low: number; type?: string };
  keyLevelIdentified: boolean;
  keyLevelPrice: number;
  priceReturnedToKL: boolean;
  priceReturnedToOB: boolean;
  obReturnRequiredByRules: boolean;
  smtAvailable: boolean;
  smtDetected: boolean;
  smtDetails: string;
  notes: string;
}

export interface DailyAnalysis {
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  pdh: number;
  pdl: number;
  dayRangePips: number;
  isInsideBar: boolean;
  notes: string;
}

export interface FourHourAnalysis {
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  structureBroken?: boolean;
  sweepDetected?: boolean;
  obValid?: boolean;
  obZone?: { high: number; low: number; type?: string };
  klValid?: boolean;
  klPrice?: number;
  tsDetected?: boolean;
  purgeDetected?: boolean;
  purgeLevel?: number;
  purgeDetails?: string;
  tsDetails?: string;
  smtDetected?: boolean;
  smtDetails?: string;
  notes: string;
}

export interface HourlyAnalysis {
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  obValid: boolean;
  obZone?: { high: number; low: number; type?: string };
  klValid: boolean;
  klPrice: number;
  tsDetected: boolean;
  tsDetails: string;
  purgeDetected: boolean;
  purgeLevel: number;
  purgeDetails: string;
  smtDetected: boolean;
  smtDetails: string;
  all1HConditionsMet: boolean;
  notes: string;
}

export interface ThirtyMinAnalysis {
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  subStructureShift?: boolean;
  liquidityClean?: boolean;
  purgeDetected?: boolean;
  purgeDetails?: string;
  smtDetected?: boolean;
  smtDetails?: string;
  klPrice?: number;
  notes: string;
}

export interface FifteenMinAnalysis {
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  marketStructureShift: boolean;
  purgeDetails: string;
  smtDetected: boolean;
  smtDetails: string;
  notes: string;
}

export interface FiveMinAnalysis {
  smtModel1Valid: boolean;
  smtModel1Details: string;
  smtConfirmation: boolean;
  smtConfirmationDetails: string;
  entryConfirmed: boolean;
  entryTriggerDetails: string;
  triggerPrice: number;
  invalidationPrice: number;
  notes: string;
  tsDetected: boolean;
  tsDetails: string;
}

export interface CrtSignalResult {
  instrument: InstrumentId;
  instrumentName: string;
  verdict: SignalVerdict; // BUY | SELL | WAIT
  status: SignalStatusType;
  timestamp: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  takeProfit3: number;
  riskReward1: number;
  riskReward2: number;
  riskReward3: number;
  pipsRisk: number;
  pipsReward1: number;

  // Confirmations
  monthlyDirection: 'BULLISH' | 'BEARISH' | 'CONSOLIDATION';
  weeklyDirection: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  hourlyConfirmation: boolean;
  fiveMinModel1Confirmation: boolean;

  // 5M CRT Core
  fiveMinTsConfirmation: boolean;
  fiveMinSmtConfirmation: boolean;

  // Liquidity Targets (PDH, PDL, PWH, PWL, PMH, PML)
  liquidityLevels: LiquidityLevels;
  targetLiquidityName: string;
  targetLiquidityPrice: number;
  targetLiquidityReason: string;

  // Detailed Analysis steps
  monthly: MonthlyAnalysis;
  weekly: WeeklyAnalysis;
  daily?: DailyAnalysis;
  fourHour?: FourHourAnalysis;
  hourly: HourlyAnalysis;
  thirtyMin?: ThirtyMinAnalysis;
  fifteenMin?: FifteenMinAnalysis;
  fiveMin: FiveMinAnalysis;

  // Trading Session
  tradingSession: string;
  sessionPeriod: ForexSessionPeriod;
  isInsideSession: boolean;

  // Checklist for display
  satisfiedRules: string[];
  pendingRules: string[];
  summaryMessage: string;

  // Live Market Data Provider & Status
  dataProvider?: string;
  apiSymbol?: string;
  liveFeedStatus?: 'LIVE_CONNECTED' | 'DATA_UNAVAILABLE' | 'DATA_DISCONNECTED';
  lastUpdatedIso?: string;
}
