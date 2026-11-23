/**
 * Trade History Storage & Statistics Engine for MUSCAB CRT PRO
 * Tracks executed signals with Win/Loss analytics, pips, and liquidity target records.
 */

import { TradeHistoryItem, CrtSignalResult } from '../types/trading';
import { SUPPORTED_INSTRUMENTS } from '../constants/instruments';
import { FIXED_LOT_SIZE, calculateFixedRiskLevels, hasValidFixedSlTp } from './fixedRiskManagement';

const STORAGE_KEY = 'muscab_trade_history';

const DEFAULT_SEEDED_TRADES: TradeHistoryItem[] = [
  {
    id: 'trade_sample_1',
    date: '2026-11-08',
    time: '14:25 UTC+3',
    timestamp: Date.now() - 1000 * 60 * 45,
    instrument: 'XAUUSD',
    direction: 'BUY',
    entryPrice: 4058.40,
    stopLoss: 4051.90,
    takeProfit1: 4077.90,
    takeProfit2: 4077.90,
    takeProfit3: 4077.90,
    targetLevel: '3RR Target (1:3)',
    targetPrice: 4077.90,
    result: 'WIN',
    pnlPips: 195.0,
    model: '5M TS + 5M SMT Model 1 (1RR SL / 3RR TP · 1 Lot)',
  },
  {
    id: 'trade_sample_2',
    date: '2026-11-08',
    time: '11:10 UTC+3',
    timestamp: Date.now() - 1000 * 60 * 230,
    instrument: 'EURUSD',
    direction: 'SELL',
    entryPrice: 1.08580,
    stopLoss: 1.08730,
    takeProfit1: 1.08130,
    takeProfit2: 1.08130,
    takeProfit3: 1.08130,
    targetLevel: '3RR Target (1:3)',
    targetPrice: 1.08130,
    result: 'WIN',
    pnlPips: 45.0,
    model: '1H Purge + Asian High Sweep (1RR SL / 3RR TP · 1 Lot)',
  },
  {
    id: 'trade_sample_3',
    date: '2026-11-07',
    time: '20:15 UTC+3',
    timestamp: Date.now() - 1000 * 60 * 60 * 18,
    instrument: 'NASDAQ',
    direction: 'BUY',
    entryPrice: 21455.0,
    stopLoss: 21405.0,
    takeProfit1: 21605.0,
    takeProfit2: 21605.0,
    takeProfit3: 21605.0,
    targetLevel: '3RR Target (1:3)',
    targetPrice: 21605.0,
    result: 'WIN',
    pnlPips: 150.0,
    model: '5M SMT + NY AM Displacement (1RR SL / 3RR TP · 1 Lot)',
  },
  {
    id: 'trade_sample_4',
    date: '2026-11-07',
    time: '13:40 UTC+3',
    timestamp: Date.now() - 1000 * 60 * 60 * 25,
    instrument: 'XAUUSD',
    direction: 'SELL',
    entryPrice: 4048.20,
    stopLoss: 4054.70,
    takeProfit1: 4028.70,
    takeProfit2: 4028.70,
    takeProfit3: 4028.70,
    targetLevel: '3RR Target (1:3)',
    targetPrice: 4028.70,
    result: 'LOSS',
    pnlPips: -65.0,
    model: '1H KL Retest Rejection (1RR SL / 3RR TP · 1 Lot)',
  },
  {
    id: 'trade_sample_5',
    date: '2026-11-06',
    time: '16:05 UTC+3',
    timestamp: Date.now() - 1000 * 60 * 60 * 46,
    instrument: 'EURUSD',
    direction: 'BUY',
    entryPrice: 1.08310,
    stopLoss: 1.08160,
    takeProfit1: 1.08760,
    takeProfit2: 1.08760,
    takeProfit3: 1.08760,
    targetLevel: '3RR Target (1:3)',
    targetPrice: 1.08760,
    result: 'WIN',
    pnlPips: 45.0,
    model: 'London Open Purge + Model 1 (1RR SL / 3RR TP · 1 Lot)',
  },
  {
    id: 'trade_sample_6',
    date: '2026-11-06',
    time: '09:30 UTC+3',
    timestamp: Date.now() - 1000 * 60 * 60 * 53,
    instrument: 'XAUUSD',
    direction: 'BUY',
    entryPrice: 4022.50,
    stopLoss: 4016.00,
    takeProfit1: 4042.00,
    takeProfit2: 4042.00,
    takeProfit3: 4042.00,
    targetLevel: '3RR Target (1:3)',
    targetPrice: 4042.00,
    result: 'WIN',
    pnlPips: 195.0,
    model: 'Asian Session Turtle Soup Sweep (1RR SL / 3RR TP · 1 Lot)',
  },
  {
    id: 'trade_sample_7',
    date: '2026-11-05',
    time: '21:00 UTC+3',
    timestamp: Date.now() - 1000 * 60 * 60 * 69,
    instrument: 'NASDAQ',
    direction: 'SELL',
    entryPrice: 21640.0,
    stopLoss: 21690.0,
    takeProfit1: 21490.0,
    takeProfit2: 21490.0,
    takeProfit3: 21490.0,
    targetLevel: '3RR Target (1:3)',
    targetPrice: 21490.0,
    result: 'WIN',
    pnlPips: 150.0,
    model: 'Weekly OB Mitigation + SMT (1RR SL / 3RR TP · 1 Lot)',
  },
  {
    id: 'trade_sample_8',
    date: '2026-11-05',
    time: '14:50 UTC+3',
    timestamp: Date.now() - 1000 * 60 * 60 * 75,
    instrument: 'XAUUSD',
    direction: 'SELL',
    entryPrice: 4034.00,
    stopLoss: 4040.50,
    takeProfit1: 4014.50,
    takeProfit2: 4014.50,
    takeProfit3: 4014.50,
    targetLevel: '3RR Target (1:3)',
    targetPrice: 4014.50,
    result: 'WIN',
    pnlPips: 195.0,
    model: '5M TS Displacement + 1H Purge (1RR SL / 3RR TP · 1 Lot)',
  },
];

class TradeHistoryService {
  private history: TradeHistoryItem[] = [];

  constructor() {
    this.loadHistory();
  }

  private loadHistory(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          this.history = parsed.filter((t: TradeHistoryItem) => t.instrument in SUPPORTED_INSTRUMENTS);
          if (this.history.length !== parsed.length) {
            this.saveHistory();
          }
        } else {
          this.history = [...DEFAULT_SEEDED_TRADES];
        }
      } else {
        this.history = [...DEFAULT_SEEDED_TRADES];
        this.saveHistory();
      }
    } catch {
      this.history = [...DEFAULT_SEEDED_TRADES];
    }
  }

  private saveHistory(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.history));
    } catch {
      // Ignore storage errors
    }
  }

  public getHistory(): TradeHistoryItem[] {
    return [...this.history];
  }

  public addFromSignal(signal: CrtSignalResult): TradeHistoryItem {
    const direction: 'BUY' | 'SELL' = signal.verdict === 'SELL' ? 'SELL' : 'BUY';
    const fixed = calculateFixedRiskLevels(signal.entryPrice, direction, signal.instrument, signal.stopLoss);

    // Enforce Rule: Never open a trade without valid 1RR SL and 3RR TP
    if (
      !fixed.valid ||
      !hasValidFixedSlTp(fixed.entryPrice, fixed.stopLoss, fixed.takeProfit, direction) ||
      signal.stopLoss <= 0 ||
      (signal.takeProfit ?? signal.takeProfit1) <= 0
    ) {
      throw new Error('Cannot open or log trade without valid 1RR Stop Loss and 3RR Take Profit.');
    }

    const now = new Date();
    // Somalia Time is UTC+3
    const somaliaNow = new Date(now.getTime() + 3 * 3600 * 1000);
    const dateStr = somaliaNow.toISOString().split('T')[0];
    const timeStr = `${String(somaliaNow.getUTCHours()).padStart(2, '0')}:${String(somaliaNow.getUTCMinutes()).padStart(2, '0')} UTC+3`;

    const newItem: TradeHistoryItem = {
      id: `trade_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      date: dateStr,
      time: timeStr,
      timestamp: Date.now(),
      instrument: signal.instrument,
      direction,
      entryPrice: fixed.entryPrice,
      stopLoss: fixed.stopLoss,
      takeProfit1: fixed.takeProfit,
      takeProfit2: fixed.takeProfit,
      takeProfit3: fixed.takeProfit,
      targetLevel: '3RR Target (1:3)',
      targetPrice: fixed.takeProfit,
      result: 'IN_PROGRESS',
      pnlPips: 0,
      model: `${signal.fiveMinTsConfirmation ? '5M TS' : '5M Model 1'}${signal.fiveMinSmtConfirmation ? ' + 5M SMT' : ''} (1RR SL / 3RR TP · ${FIXED_LOT_SIZE} Lot)`,
    };

    this.history = [newItem, ...this.history];
    this.saveHistory();
    return newItem;
  }

  public updateResult(id: string, result: 'WIN' | 'LOSS' | 'IN_PROGRESS', pnlPips?: number): void {
    this.history = this.history.map((t) => {
      if (t.id === id) {
        let pnl = pnlPips;
        if (pnl === undefined) {
          const inst = SUPPORTED_INSTRUMENTS[t.instrument];
          const rawDiff = Math.abs(t.takeProfit1 - t.entryPrice);
          const pips = Number((rawDiff / inst.pipSize).toFixed(1));
          pnl = result === 'WIN' ? pips : result === 'LOSS' ? -Number((Math.abs(t.entryPrice - t.stopLoss) / inst.pipSize).toFixed(1)) : 0;
        }
        return { ...t, result, pnlPips: pnl };
      }
      return t;
    });
    this.saveHistory();
  }

  public deleteTrade(id: string): void {
    this.history = this.history.filter((t) => t.id !== id);
    this.saveHistory();
  }

  public clearAll(): void {
    this.history = [];
    this.saveHistory();
  }

  public resetToDefault(): void {
    this.history = [...DEFAULT_SEEDED_TRADES];
    this.saveHistory();
  }

  public getStatistics() {
    const total = this.history.length;
    const wins = this.history.filter((t) => t.result === 'WIN').length;
    const losses = this.history.filter((t) => t.result === 'LOSS').length;
    const inProgress = this.history.filter((t) => t.result === 'IN_PROGRESS').length;
    const decided = wins + losses;
    const winRate = decided > 0 ? Number(((wins / decided) * 100).toFixed(1)) : 0;
    const totalPnlPips = Number(this.history.reduce((acc, t) => acc + (t.pnlPips || 0), 0).toFixed(1));

    return {
      total,
      wins,
      losses,
      inProgress,
      winRate,
      totalPnlPips,
    };
  }
}

export const tradeHistoryService = new TradeHistoryService();
