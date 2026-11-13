/**
 * Supported Trading Instruments & CRT Strategy Defaults
 * Strictly limited to XAUUSD, AUDUSD, and NASDAQ.
 * Live prices are dynamically populated by genuine institutional APIs.
 */

import { InstrumentId, InstrumentInfo, CrtStrategyConfig } from '../types/trading';

export const SUPPORTED_INSTRUMENTS: Record<InstrumentId, InstrumentInfo> = {
  XAUUSD: {
    id: 'XAUUSD',
    name: 'XAUUSD CFD – Gold / US Dollar',
    ticker: 'XAUUSD CFD',
    category: 'Metals',
    pipSize: 0.1,
    decimals: 2,
    correlatedPair: 'XAGUSD (Silver CFD)',
    description: 'Spot Gold CFD in USD per Troy Ounce (100 oz Standard Lot)',
    currentPrice: 4098.20, // Baseline updated continuously by live market API
    change24h: 1.01,
    contractSize: '100 Troy Oz',
    spreadPips: 1.6,
    tickValuePerLot: 10.0,
    cfdType: 'Spot Metal CFD (100 oz)',
    provider: 'Binance Spot Gold ECN (PAXG/USD · London Good Delivery 99.99%)',
    dataProvider: 'Binance Spot Gold ECN (PAXG/USD · London Good Delivery 99.99%)',
    apiSymbol: 'PAXGUSDT / GC=F',
    unit: 'USD per Troy Ounce',
  },
  AUDUSD: {
    id: 'AUDUSD',
    name: 'AUDUSD – Australian Dollar / US Dollar',
    ticker: 'AUDUSD',
    category: 'Forex',
    pipSize: 0.0001,
    decimals: 5,
    correlatedPair: 'NZDUSD (Kiwi)',
    description: 'Australian Dollar spot quote in USD (100,000 units)',
    currentPrice: 0.6902, // Baseline updated continuously by live market API
    change24h: -0.39,
    contractSize: '100,000 AUD',
    spreadPips: 0.8,
    tickValuePerLot: 10.0,
    cfdType: 'Major FX Spot',
    provider: 'Yahoo Finance FX ECN',
    dataProvider: 'Yahoo Finance FX ECN',
    apiSymbol: 'AUDUSD=X',
    unit: 'USD per AUD',
  },
  NASDAQ: {
    id: 'NASDAQ',
    name: 'NASDAQ – NAS100 / USTEC CFD',
    ticker: 'NAS100 CFD',
    category: 'Indices',
    pipSize: 1.0,
    decimals: 1,
    correlatedPair: 'US30 (Dow Jones CFD)',
    description: 'Nasdaq 100 Index / US Tech 100 CFD (1 Contract = $20 per point)',
    currentPrice: 27198.0, // Baseline updated continuously by live market API
    change24h: 0.42,
    contractSize: '1 Index Contract',
    spreadPips: 1.5,
    tickValuePerLot: 20.0,
    cfdType: 'Index CFD',
    provider: 'Yahoo Finance Index ECN',
    dataProvider: 'Yahoo Finance Index ECN',
    apiSymbol: 'NQ=F / ^IXIC',
    unit: 'USD Index Points',
  },
};

export const INSTRUMENT_LIST: InstrumentId[] = ['XAUUSD', 'AUDUSD', 'NASDAQ'];

export const DEFAULT_CRT_RULES: CrtStrategyConfig = {
  // Turtle Soup (TS) Rules
  tsSweepMinPips: 8,
  tsRequireRejectionClose: true,
  tsMaxWickBars: 3,

  // Model 1 Rules
  model1DisplacementMultiplier: 1.5,
  model1MinRiskReward: 2.0,

  // Order Block (OB) & Key Levels (KL) Rules
  requireWeeklyOBReturn: false, // Per prompt: "Do not require price to return to the Weekly OB unless the configured rules specifically require it."
  obMitigationTolerancePips: 5,
  obIncludeWicks: true,

  klRetestTolerancePips: 6,
  klLookbackBars: 24,

  // Purge Rules
  purgeMinLiquidityPoints: 10,
  purgeLookbackHours: 48,

  // SMT Divergence Rules
  smtLookbackBars: 20,
  smtSensitivity: 'BALANCED',

  // R:R Target Ratios
  tp1Ratio: 2.0,
  tp2Ratio: 3.5,
  tp3Ratio: 5.0,
  slBufferPips: 4.0,
};
