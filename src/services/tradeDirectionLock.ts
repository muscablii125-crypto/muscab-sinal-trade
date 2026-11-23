/**
 * MUSCAB CRT PRO - Fixed AI Trade Direction Lock & Progress Service
 *
 * Enforces strict single-direction locking:
 * 1. Once Stage 2 confirms BUY or SELL, locks that decision per instrument.
 * 2. Never automatically switches BUY <-> SELL while the locked setup remains valid.
 * 3. Tracks real-time progress (Entry, SL, TP1, TP2, TP3) from live Bid/Ask quotes.
 * 4. Transitions ONLY to CLOSED (TP3 hit / manual close) or INVALIDATED (SL hit / CRT structure broken).
 * 5. Requires a completely new Stage 1 -> Stage 2 CRT setup before issuing a new direction.
 */

import {
  InstrumentId,
  CrtSignalResult,
  LiveQuoteTick,
  LockedTradeDecision,
  TradeLockStatus,
} from '../types/trading';
import { SUPPORTED_INSTRUMENTS } from '../constants/instruments';
import {
  FIXED_SL_RR,
  FIXED_TP_RR,
  FIXED_RISK_REWARD,
  FIXED_LOT_SIZE,
  calculateFixedRiskLevels,
  hasValidFixedSlTp,
} from './fixedRiskManagement';

const LOCK_STORAGE_PREFIX = 'muscab_ai_locked_decision_';
const LAST_CLOSED_CANDLE_PREFIX = 'muscab_ai_last_finished_candle_';

class TradeDirectionLockService {
  private getStorageKey(instrument: InstrumentId): string {
    return `${LOCK_STORAGE_PREFIX}${instrument}`;
  }

  private getLastFinishedKey(instrument: InstrumentId): string {
    return `${LAST_CLOSED_CANDLE_PREFIX}${instrument}`;
  }

  public getLockedDecision(instrument: InstrumentId): LockedTradeDecision | null {
    try {
      const raw = localStorage.getItem(this.getStorageKey(instrument));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as LockedTradeDecision;
      // Ensure any active/locked record strictly carries 1RR SL & 3RR TP (1:3 R:R) & Lot Size 1
      if (
        parsed &&
        parsed.entryPrice > 0 &&
        (parsed.lockStatus === 'LOCKED' || parsed.lockStatus === 'ACTIVE') &&
        !hasValidFixedSlTp(parsed.entryPrice, parsed.stopLoss, parsed.takeProfit1, parsed.direction)
      ) {
        const fixed = calculateFixedRiskLevels(parsed.entryPrice, parsed.direction, instrument, parsed.stopLoss);
        if (!fixed.valid) {
          this.saveLockedDecision(instrument, null);
          return null;
        }
        const normalized: LockedTradeDecision = {
          ...parsed,
          stopLoss: fixed.stopLoss,
          takeProfit: fixed.takeProfit,
          takeProfit1: fixed.takeProfit,
          takeProfit2: fixed.takeProfit,
          takeProfit3: fixed.takeProfit,
          slRR: FIXED_SL_RR,
          tpRR: FIXED_TP_RR,
          lotSize: FIXED_LOT_SIZE,
          riskReward1: FIXED_RISK_REWARD,
          riskReward2: FIXED_RISK_REWARD,
          riskReward3: FIXED_RISK_REWARD,
          pipsRisk: fixed.pipsRisk,
          pipsReward1: fixed.pipsReward,
        };
        this.saveLockedDecision(instrument, normalized);
        return normalized;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  private saveLockedDecision(instrument: InstrumentId, decision: LockedTradeDecision | null): void {
    try {
      if (decision) {
        localStorage.setItem(this.getStorageKey(instrument), JSON.stringify(decision));
      } else {
        localStorage.removeItem(this.getStorageKey(instrument));
      }
    } catch (e) {
      console.warn('[TradeDirectionLock] Storage error:', e);
    }
  }

  private getLastFinishedCandleTime(instrument: InstrumentId): number {
    try {
      const raw = localStorage.getItem(this.getLastFinishedKey(instrument));
      return raw ? Number(raw) : 0;
    } catch {
      return 0;
    }
  }

  private setLastFinishedCandleTime(instrument: InstrumentId, closeTimeMs: number): void {
    try {
      localStorage.setItem(this.getLastFinishedKey(instrument), String(closeTimeMs));
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Evaluate live price tick against an existing LOCKED or ACTIVE decision
   * without mutating the original Entry, SL, TP1, TP2, TP3, or Direction.
   */
  public evaluateTickOnLock(
    instrument: InstrumentId,
    quoteTick: LiveQuoteTick | null
  ): LockedTradeDecision | null {
    const existing = this.getLockedDecision(instrument);
    if (!existing) return null;

    if (existing.lockStatus !== 'LOCKED' && existing.lockStatus !== 'ACTIVE') {
      return existing;
    }

    if (!quoteTick || quoteTick.status !== 'LIVE' || quoteTick.midPrice <= 0) {
      return existing;
    }

    const info = SUPPORTED_INSTRUMENTS[instrument];
    const pip = info.pipSize;
    const isBuy = existing.direction === 'BUY';
    const evalPrice = isBuy ? quoteTick.bid : quoteTick.ask;

    const rawDiff = isBuy ? evalPrice - existing.entryPrice : existing.entryPrice - evalPrice;
    const floatingPips = Number((rawDiff / pip).toFixed(1));
    const highestFavorablePips = Math.max(existing.highestFavorablePips, floatingPips);

    let tp1Hit = existing.tp1Hit;
    let tp2Hit = existing.tp2Hit;
    let tp3Hit = existing.tp3Hit;
    let slHit = existing.slHit;

    const tpPrice = existing.takeProfit ?? existing.takeProfit1;

    if (isBuy) {
      if (evalPrice >= tpPrice && tpPrice > 0) {
        tp1Hit = true;
        tp2Hit = true;
        tp3Hit = true;
      }
      if (evalPrice <= existing.stopLoss && existing.stopLoss > 0) slHit = true;
    } else {
      if (evalPrice <= tpPrice && tpPrice > 0) {
        tp1Hit = true;
        tp2Hit = true;
        tp3Hit = true;
      }
      if (evalPrice >= existing.stopLoss && existing.stopLoss > 0) slHit = true;
    }

    let lockStatus: TradeLockStatus = existing.lockStatus;
    let statusNote = existing.statusNote;
    let closedOrInvalidatedAt = existing.closedOrInvalidatedAt;

    if (slHit) {
      lockStatus = 'INVALIDATED';
      closedOrInvalidatedAt = Date.now();
      statusNote = `Fixed ${FIXED_SL_RR}RR Stop Loss (${existing.stopLoss.toFixed(info.decimals)}) reached at ${evalPrice.toFixed(
        info.decimals
      )}. Decision unlocked; awaiting a completely new CRT setup.`;
      this.setLastFinishedCandleTime(instrument, existing.confirmationCandleCloseTime);
    } else if (tp1Hit || tp3Hit) {
      lockStatus = 'CLOSED';
      closedOrInvalidatedAt = Date.now();
      statusNote = `Fixed ${FIXED_TP_RR}RR Take Profit (${tpPrice.toFixed(info.decimals)}) reached at ${evalPrice.toFixed(
        info.decimals
      )}. Trade setup closed cleanly (+3R).`;
      this.setLastFinishedCandleTime(instrument, existing.confirmationCandleCloseTime);
    } else if (
      existing.lockStatus === 'LOCKED' &&
      (Math.abs(floatingPips) >= 0.5 || Date.now() - existing.confirmedAt > 15_000)
    ) {
      lockStatus = 'ACTIVE';
      statusNote = `ACTIVE (${existing.direction}): ${FIXED_SL_RR}RR SL / ${FIXED_TP_RR}RR TP (1:${FIXED_RISK_REWARD}) · Lot ${FIXED_LOT_SIZE}.00 locked. Monitoring live progress.`;
    } else if (lockStatus === 'ACTIVE') {
      statusNote = `ACTIVE (${existing.direction}): ${FIXED_SL_RR}RR SL / ${FIXED_TP_RR}RR TP (1:${FIXED_RISK_REWARD}) · Lot ${FIXED_LOT_SIZE}.00 locked. Monitoring live progress.`;
    }

    const updated: LockedTradeDecision = {
      ...existing,
      lockStatus,
      tp1Hit,
      tp2Hit,
      tp3Hit,
      slHit,
      floatingPips,
      highestFavorablePips,
      lastCheckedPrice: evalPrice,
      lastUpdatedAt: Date.now(),
      statusNote,
      closedOrInvalidatedAt,
    };

    this.saveLockedDecision(instrument, updated);
    return updated;
  }

  /**
   * Reconcile a fresh CRT Engine run with the Fixed Trade Direction Lock.
   * NEVER flips BUY <-> SELL on an active setup.
   * Only locks on a brand-new Stage 2 confirmed signal when no active lock exists.
   */
  public reconcileSignal(
    instrument: InstrumentId,
    signal: CrtSignalResult,
    quoteTick: LiveQuoteTick | null
  ): LockedTradeDecision | null {
    let existing = this.evaluateTickOnLock(instrument, quoteTick);

    // 1. If a trade is currently LOCKED or ACTIVE, preserve it unconditionally unless structurally invalidated
    if (existing && (existing.lockStatus === 'LOCKED' || existing.lockStatus === 'ACTIVE')) {
      // Check structural invalidation ONLY if higher timeframes & 1H completely broke against the original setup before TP1 hit
      const expectedBias = existing.direction === 'BUY' ? 'BULLISH' : 'BEARISH';
      const oppositeBias = existing.direction === 'BUY' ? 'BEARISH' : 'BULLISH';

      const originalCrtBroken =
        !existing.tp1Hit &&
        signal.liveFeedStatus === 'LIVE_CONNECTED' &&
        signal.monthlyDirection === oppositeBias &&
        signal.hourly.direction === oppositeBias &&
        existing.floatingPips < -(existing.pipsRisk * 0.75);

      if (originalCrtBroken) {
        const invalidated: LockedTradeDecision = {
          ...existing,
          lockStatus: 'INVALIDATED',
          closedOrInvalidatedAt: Date.now(),
          lastUpdatedAt: Date.now(),
          statusNote: `Original ${existing.direction} CRT setup invalidated by ${oppositeBias} HTF structural break before TP1. Unlocking — a brand new CRT setup is required.`,
        };
        this.setLastFinishedCandleTime(instrument, existing.confirmationCandleCloseTime);
        this.saveLockedDecision(instrument, invalidated);
        return invalidated;
      }

      return existing;
    }

    // 2. Enforce Stage 2 confirmation AND valid 1RR SL + 3RR TP before locking
    const isBuyOrSell = signal.verdict === 'BUY' || signal.verdict === 'SELL';
    const hasSlAndTp =
      isBuyOrSell &&
      hasValidFixedSlTp(
        signal.entryPrice,
        signal.stopLoss,
        signal.takeProfit ?? signal.takeProfit1,
        signal.verdict as 'BUY' | 'SELL'
      );

    const isStage2Confirmed =
      signal.liveFeedStatus === 'LIVE_CONNECTED' &&
      signal.status === 'CONFIRMED_SIGNAL' &&
      signal.twoStageStatus === 'CONFIRMED' &&
      hasSlAndTp;

    if (!isStage2Confirmed) {
      return existing;
    }

    // 3. Require a completely NEW confirmed candle (newer than any previously closed/invalidated setup)
    const candleCloseTime = signal.confirmationCandleCloseTime || signal.timestamp;
    const lastFinishedCandle = Math.max(
      this.getLastFinishedCandleTime(instrument),
      existing?.confirmationCandleCloseTime || 0
    );

    if (existing && (existing.lockStatus === 'CLOSED' || existing.lockStatus === 'INVALIDATED')) {
      const cooldownPassed =
        !existing.closedOrInvalidatedAt || Date.now() - existing.closedOrInvalidatedAt > 60_000;
      if (candleCloseTime <= lastFinishedCandle || !cooldownPassed) {
        return existing;
      }
    } else if (candleCloseTime <= lastFinishedCandle) {
      return null;
    }

    // 4. Lock the new Stage 2 confirmed direction with immutable 1RR SL, 3RR TP, and 1.00 Lot!
    const dir = signal.verdict as 'BUY' | 'SELL';
    const fixed = calculateFixedRiskLevels(signal.entryPrice, dir, instrument, signal.stopLoss);
    if (!fixed.valid) return existing;

    const newLock: LockedTradeDecision = {
      id: `lock_${instrument}_${candleCloseTime}`,
      instrument,
      direction: dir,
      lockStatus: 'LOCKED',
      entryPrice: fixed.entryPrice,
      stopLoss: fixed.stopLoss,
      takeProfit: fixed.takeProfit,
      takeProfit1: fixed.takeProfit,
      takeProfit2: fixed.takeProfit,
      takeProfit3: fixed.takeProfit,
      slRR: FIXED_SL_RR,
      tpRR: FIXED_TP_RR,
      lotSize: FIXED_LOT_SIZE,
      riskReward1: FIXED_RISK_REWARD,
      riskReward2: FIXED_RISK_REWARD,
      riskReward3: FIXED_RISK_REWARD,
      pipsRisk: fixed.pipsRisk,
      pipsReward1: fixed.pipsReward,
      confirmedAt: signal.timestamp || Date.now(),
      confirmationCandleCloseTime: candleCloseTime,
      confirmationCandleCloseIso: signal.confirmationCandleCloseIso || new Date(candleCloseTime).toISOString(),
      reason: signal.confirmationReason || signal.summaryMessage,
      targetLiquidityName: signal.targetLiquidityName,
      targetLiquidityPrice: signal.targetLiquidityPrice,
      tp1Hit: false,
      tp2Hit: false,
      tp3Hit: false,
      slHit: false,
      floatingPips: 0,
      highestFavorablePips: 0,
      lastCheckedPrice: quoteTick?.midPrice || fixed.entryPrice,
      lastUpdatedAt: Date.now(),
      statusNote: `LOCKED (${dir}): Stage 2 closed candle confirmed with ${FIXED_SL_RR}RR SL / ${FIXED_TP_RR}RR TP · Lot ${FIXED_LOT_SIZE}.00.`,
      originalSignal: {
        ...signal,
        entryPrice: fixed.entryPrice,
        stopLoss: fixed.stopLoss,
        takeProfit: fixed.takeProfit,
        takeProfit1: fixed.takeProfit,
        takeProfit2: fixed.takeProfit,
        takeProfit3: fixed.takeProfit,
        slRR: FIXED_SL_RR,
        tpRR: FIXED_TP_RR,
        lotSize: FIXED_LOT_SIZE,
        riskReward1: FIXED_RISK_REWARD,
        riskReward2: FIXED_RISK_REWARD,
        riskReward3: FIXED_RISK_REWARD,
        pipsRisk: fixed.pipsRisk,
        pipsReward1: fixed.pipsReward,
      },
    };

    this.saveLockedDecision(instrument, newLock);
    return newLock;
  }

  /**
   * Manually close an active locked trade (transitions to CLOSED)
   */
  public closeLockedDecision(instrument: InstrumentId, quoteTick: LiveQuoteTick | null): LockedTradeDecision | null {
    const existing = this.getLockedDecision(instrument);
    if (!existing) return null;

    const info = SUPPORTED_INSTRUMENTS[instrument];
    const evalPrice = quoteTick
      ? existing.direction === 'BUY'
        ? quoteTick.bid
        : quoteTick.ask
      : existing.lastCheckedPrice;

    const closed: LockedTradeDecision = {
      ...existing,
      lockStatus: 'CLOSED',
      lastCheckedPrice: evalPrice,
      lastUpdatedAt: Date.now(),
      closedOrInvalidatedAt: Date.now(),
      statusNote: `Trade closed manually at ${evalPrice.toFixed(info.decimals)} (${
        existing.floatingPips >= 0 ? '+' : ''
      }${existing.floatingPips} pips). Ready to scan for a new CRT setup.`,
    };
    this.setLastFinishedCandleTime(instrument, existing.confirmationCandleCloseTime);
    this.saveLockedDecision(instrument, closed);
    return closed;
  }

  /**
   * Clear a finished (CLOSED or INVALIDATED) trade record to return cleanly to WAIT / scanning mode
   */
  public unlockFinishedDecision(instrument: InstrumentId): void {
    const existing = this.getLockedDecision(instrument);
    if (existing && (existing.lockStatus === 'CLOSED' || existing.lockStatus === 'INVALIDATED')) {
      this.setLastFinishedCandleTime(instrument, existing.confirmationCandleCloseTime);
      this.saveLockedDecision(instrument, null);
    }
  }
}

export const tradeDirectionLock = new TradeDirectionLockService();
