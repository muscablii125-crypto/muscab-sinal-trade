/**
 * MUSCAB CRT PRO - Fixed Risk Management Engine
 *
 * Immutable Risk Rules (Applies to both BUY and SELL):
 * 1. Fixed Stop Loss = 1RR (1R structural CRT risk distance)
 * 2. Fixed Take Profit = 3RR (3R target -> 1:3 Risk-to-Reward)
 * 3. Fixed Lot Size = 1.00 Standard Lot
 * 4. No trade may ever be confirmed, locked, or opened without valid 1RR SL & 3RR TP.
 * 5. Never automatically modify the 1RR SL, 3RR TP, or 1.00 Lot settings.
 */

import { InstrumentId } from '../types/trading';
import { SUPPORTED_INSTRUMENTS } from '../constants/instruments';

export const FIXED_SL_RR = 1 as const;
export const FIXED_TP_RR = 3 as const;
export const FIXED_RISK_REWARD = 3 as const;
export const FIXED_LOT_SIZE = 1 as const;

export const FIXED_RISK_CONFIG = Object.freeze({
  stopLossRR: FIXED_SL_RR,
  takeProfitRR: FIXED_TP_RR,
  riskRewardRatio: FIXED_RISK_REWARD,
  lotSize: FIXED_LOT_SIZE,
  locked: true,
});

const INSTRUMENT_1R_PIP_BOUNDS: Record<
  InstrumentId,
  { defaultPips: number; minPips: number; maxPips: number }
> = {
  EURUSD: { defaultPips: 15, minPips: 10, maxPips: 45 },
  XAUUSD: { defaultPips: 65, minPips: 30, maxPips: 180 },
  NASDAQ: { defaultPips: 50, minPips: 20, maxPips: 150 },
};

export interface FixedRiskLevels {
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  slRR: number;
  tpRR: number;
  riskReward: number;
  lotSize: number;
  pipsRisk: number;
  pipsReward: number;
  valid: boolean;
}

/**
 * Computes exact Fixed 1RR Stop Loss, Fixed 3RR Take Profit (1:3 R:R), and 1.00 Lot Size
 * from the actual entry price (anchored to 5M CRT structural invalidation when available).
 */
export function calculateFixedRiskLevels(
  entryPrice: number,
  direction: 'BUY' | 'SELL',
  instrument: InstrumentId,
  structuralSlPrice?: number
): FixedRiskLevels {
  const info = SUPPORTED_INSTRUMENTS[instrument];
  const decimals = info.decimals;
  const pip = info.pipSize;
  const bounds = INSTRUMENT_1R_PIP_BOUNDS[instrument];

  if (!Number.isFinite(entryPrice) || entryPrice <= 0) {
    return {
      entryPrice: 0,
      stopLoss: 0,
      takeProfit: 0,
      slRR: FIXED_SL_RR,
      tpRR: FIXED_TP_RR,
      riskReward: FIXED_RISK_REWARD,
      lotSize: FIXED_LOT_SIZE,
      pipsRisk: 0,
      pipsReward: 0,
      valid: false,
    };
  }

  const roundedEntry = Number(entryPrice.toFixed(decimals));
  let riskDistance = bounds.defaultPips * pip;

  if (
    structuralSlPrice !== undefined &&
    Number.isFinite(structuralSlPrice) &&
    structuralSlPrice > 0
  ) {
    const isProperSide =
      direction === 'BUY'
        ? structuralSlPrice < roundedEntry
        : structuralSlPrice > roundedEntry;

    if (isProperSide) {
      const rawDiff = Math.abs(roundedEntry - structuralSlPrice);
      const minDist = bounds.minPips * pip;
      const maxDist = bounds.maxPips * pip;
      riskDistance = Math.min(maxDist, Math.max(minDist, rawDiff));
    }
  }

  const rawSl =
    direction === 'BUY'
      ? roundedEntry - riskDistance
      : roundedEntry + riskDistance;
  const stopLoss = Number(rawSl.toFixed(decimals));

  const actualRiskDist = Math.abs(roundedEntry - stopLoss);
  const rawTp =
    direction === 'BUY'
      ? roundedEntry + FIXED_TP_RR * actualRiskDist
      : roundedEntry - FIXED_TP_RR * actualRiskDist;
  const takeProfit = Number(rawTp.toFixed(decimals));

  const pipsRisk = Number((actualRiskDist / pip).toFixed(1));
  const pipsReward = Number((Math.abs(takeProfit - roundedEntry) / pip).toFixed(1));

  const valid = hasValidFixedSlTp(roundedEntry, stopLoss, takeProfit, direction);

  return {
    entryPrice: roundedEntry,
    stopLoss,
    takeProfit,
    slRR: FIXED_SL_RR,
    tpRR: FIXED_TP_RR,
    riskReward: FIXED_RISK_REWARD,
    lotSize: FIXED_LOT_SIZE,
    pipsRisk,
    pipsReward,
    valid,
  };
}

/**
 * Strictly validates that Entry, Stop Loss (1RR), and Take Profit (3RR) exist,
 * are positive finite numbers, sit on the proper side for BUY or SELL,
 * and preserve the 1:3 Risk-to-Reward ratio.
 */
export function hasValidFixedSlTp(
  entryPrice: number,
  stopLoss: number,
  takeProfit: number,
  direction: 'BUY' | 'SELL'
): boolean {
  if (
    !Number.isFinite(entryPrice) ||
    !Number.isFinite(stopLoss) ||
    !Number.isFinite(takeProfit) ||
    entryPrice <= 0 ||
    stopLoss <= 0 ||
    takeProfit <= 0
  ) {
    return false;
  }

  if (direction === 'BUY') {
    if (!(stopLoss < entryPrice && takeProfit > entryPrice)) return false;
  } else {
    if (!(stopLoss > entryPrice && takeProfit < entryPrice)) return false;
  }

  const slDist = Math.abs(entryPrice - stopLoss);
  const tpDist = Math.abs(takeProfit - entryPrice);
  if (slDist <= 0 || tpDist <= 0) return false;

  const actualRR = tpDist / slDist;
  return Math.abs(actualRR - FIXED_RISK_REWARD) <= 0.15;
}
