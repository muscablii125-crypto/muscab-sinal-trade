/**
 * Trade History Storage & Statistics Engine for MUSCAB CRT PRO
 * Tracks executed signals with Win/Loss analytics, pips, and liquidity target records.
 */

import { TradeHistoryItem, CrtSignalResult } from '../types/trading';
import { SUPPORTED_INSTRUMENTS } from '../constants/instruments';

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
    stopLoss: 4051.80,
    takeProfit1: 4065.00,
    takeProfit2: 4071.60,
    takeProfit3: 4085.00,
    targetLevel: 'PDH (Previous Day High)',
    targetPrice: 4071.60,
    result: 'WIN',
    pnlPips: 66.0,
    model: '5M TS + 5M SMT Model 1',
  },
  {
    id: 'trade_sample_2',
    date: '2026-11-08',
    time: '11:10 UTC+3',
    timestamp: Date.now() - 1000 * 60 * 230,
    instrument: 'AUDUSD',
    direction: 'SELL',
    entryPrice: 0.65140,
    stopLoss: 0.65230,
    takeProfit1: 0.64960,
    takeProfit2: 0.64850,
    takeProfit3: 0.64600,
    targetLevel: 'PDL (Previous Day Low)',
    targetPrice: 0.64960,
    result: 'WIN',
    pnlPips: 18.0,
    model: '1H Purge + Asian High Sweep',
  },
  {
    id: 'trade_sample_3',
    date: '2026-11-07',
    time: '20:15 UTC+3',
    timestamp: Date.now() - 1000 * 60 * 60 * 18,
    instrument: 'NASDAQ',
    direction: 'BUY',
    entryPrice: 21455.0,
    stopLoss: 21415.0,
    takeProfit1: 21535.0,
    takeProfit2: 21615.0,
    takeProfit3: 21750.0,
    targetLevel: 'PWH (Previous Week High)',
    targetPrice: 21615.0,
    result: 'WIN',
    pnlPips: 80.0,
    model: '5M SMT + NY AM Displacement',
  },
  {
    id: 'trade_sample_4',
    date: '2026-11-07',
    time: '13:40 UTC+3',
    timestamp: Date.now() - 1000 * 60 * 60 * 25,
    instrument: 'XAUUSD',
    direction: 'SELL',
    entryPrice: 4048.20,
    stopLoss: 4054.60,
    takeProfit1: 4035.40,
    takeProfit2: 4022.60,
    takeProfit3: 4005.00,
    targetLevel: 'PWL (Previous Week Low)',
    targetPrice: 4035.40,
    result: 'LOSS',
    pnlPips: -64.0,
    model: '1H KL Retest Rejection',
  },
  {
    id: 'trade_sample_5',
    date: '2026-11-06',
    time: '16:05 UTC+3',
    timestamp: Date.now() - 1000 * 60 * 60 * 46,
    instrument: 'AUDUSD',
    direction: 'BUY',
    entryPrice: 0.64820,
    stopLoss: 0.64730,
    takeProfit1: 0.65000,
    takeProfit2: 0.65180,
    takeProfit3: 0.65450,
    targetLevel: 'PMH (Previous Month High)',
    targetPrice: 0.65000,
    result: 'WIN',
    pnlPips: 18.0,
    model: 'London Open Purge + Model 1',
  },
  {
    id: 'trade_sample_6',
    date: '2026-11-06',
    time: '09:30 UTC+3',
    timestamp: Date.now() - 1000 * 60 * 60 * 53,
    instrument: 'XAUUSD',
    direction: 'BUY',
    entryPrice: 4022.50,
    stopLoss: 4014.50,
    takeProfit1: 4038.50,
    takeProfit2: 4054.50,
    takeProfit3: 4075.00,
    targetLevel: 'PDH (Previous Day High)',
    targetPrice: 4038.50,
    result: 'WIN',
    pnlPips: 160.0,
    model: 'Asian Session Turtle Soup Sweep',
  },
  {
    id: 'trade_sample_7',
    date: '2026-11-05',
    time: '21:00 UTC+3',
    timestamp: Date.now() - 1000 * 60 * 60 * 69,
    instrument: 'NASDAQ',
    direction: 'SELL',
    entryPrice: 21640.0,
    stopLoss: 21695.0,
    takeProfit1: 21530.0,
    takeProfit2: 21420.0,
    takeProfit3: 21250.0,
    targetLevel: 'PDL (Previous Day Low)',
    targetPrice: 21530.0,
    result: 'WIN',
    pnlPips: 110.0,
    model: 'Weekly OB Mitigation + SMT',
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
    takeProfit1: 4021.00,
    takeProfit2: 4008.00,
    takeProfit3: 3990.00,
    targetLevel: 'PDL (Previous Day Low)',
    targetPrice: 4021.00,
    result: 'WIN',
    pnlPips: 130.0,
    model: '5M TS Displacement + 1H Purge',
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
        this.history = JSON.parse(stored);
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
    const inst = SUPPORTED_INSTRUMENTS[signal.instrument];
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
      direction: signal.verdict === 'SELL' ? 'SELL' : 'BUY',
      entryPrice: signal.entryPrice,
      stopLoss: signal.stopLoss,
      takeProfit1: signal.takeProfit1,
      takeProfit2: signal.takeProfit2,
      takeProfit3: signal.takeProfit3,
      targetLevel: signal.targetLiquidityName || 'Key Liquidity Pool',
      targetPrice: signal.targetLiquidityPrice || signal.takeProfit1,
      result: 'IN_PROGRESS',
      pnlPips: 0,
      model: `${signal.fiveMinTsConfirmation ? '5M TS' : '5M Model 1'}${signal.fiveMinSmtConfirmation ? ' + 5M SMT' : ''}`,
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
