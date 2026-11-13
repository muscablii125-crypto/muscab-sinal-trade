/**
 * Trade History Section Component for MUSCAB CRT PRO
 * Displays executed signals in a high-density, institutional-grade analytics table
 * Computes live win/loss percentage, cumulative pips, and detailed liquidity targets.
 */

import React, { useState, useEffect } from 'react';
import { TradeHistoryItem, InstrumentId } from '../types/trading';
import { tradeHistoryService } from '../services/tradeHistory';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  XCircle,
  Hourglass,
  Trash2,
  RotateCcw,
  BarChart3,
  Target,
  Sparkles,
} from 'lucide-react';

interface TradeHistorySectionProps {
  onTradeCountChange?: () => void;
}

export const TradeHistorySection: React.FC<TradeHistorySectionProps> = ({ onTradeCountChange }) => {
  const [history, setHistory] = useState<TradeHistoryItem[]>(() => tradeHistoryService.getHistory());
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | InstrumentId>('ALL');

  const refreshHistory = () => {
    setHistory(tradeHistoryService.getHistory());
    onTradeCountChange?.();
  };

  useEffect(() => {
    // Listen for custom storage event or external changes
    const handleStorage = () => refreshHistory();
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const stats = tradeHistoryService.getStatistics();

  const filteredHistory = history.filter((item) => {
    if (selectedFilter === 'ALL') return true;
    return item.instrument === selectedFilter;
  });

  const last10Trades = filteredHistory.slice(0, 10);

  const handleMarkResult = (id: string, result: 'WIN' | 'LOSS') => {
    tradeHistoryService.updateResult(id, result);
    refreshHistory();
  };

  const handleDelete = (id: string) => {
    tradeHistoryService.deleteTrade(id);
    refreshHistory();
  };

  const handleReset = () => {
    tradeHistoryService.resetToDefault();
    refreshHistory();
  };

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear trade history?')) {
      tradeHistoryService.clearAll();
      refreshHistory();
    }
  };

  return (
    <div className="w-full rounded-2xl border border-neutral-800 bg-[#0a0c12] overflow-hidden shadow-2xl">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b border-neutral-800/80 bg-black/40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
              <span>Dashboard Trade History</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-800 text-slate-300 border border-neutral-700">
                Last 10 Outcomes
              </span>
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Live CRT Model Performance & Historical Strategy Executions
            </p>
          </div>
        </div>

        {/* Filter & Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Instrument Filters */}
          <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-lg p-0.5 text-xs font-mono">
            {(['ALL', 'XAUUSD', 'AUDUSD', 'NASDAQ'] as const).map((inst) => (
              <button
                key={inst}
                onClick={() => setSelectedFilter(inst)}
                className={`px-2.5 py-1 rounded transition-colors ${
                  selectedFilter === inst
                    ? 'bg-amber-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {inst}
              </button>
            ))}
          </div>

          <button
            onClick={handleReset}
            className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-slate-400 hover:text-amber-400 transition-colors"
            title="Reset to default sample trades"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-6 border-b border-neutral-800/60 bg-[#07090d]/60">
        {/* Win Rate */}
        <div className="p-3.5 rounded-xl bg-neutral-900/60 border border-neutral-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
              Win Rate %
            </span>
            <div className="text-2xl font-mono font-extrabold text-emerald-400 tabular-nums mt-0.5">
              {stats.winRate}%
            </div>
            <span className="text-[10px] font-mono text-slate-500">
              {stats.wins} Won / {stats.losses} Lost
            </span>
          </div>
          <div className="w-10 h-10 rounded-full border-2 border-emerald-500/40 bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-bold text-xs font-mono">
            {stats.winRate}%
          </div>
        </div>

        {/* Total Trades */}
        <div className="p-3.5 rounded-xl bg-neutral-900/60 border border-neutral-800">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
            Total Executed
          </span>
          <div className="text-2xl font-mono font-extrabold text-white tabular-nums mt-0.5">
            {stats.total}
          </div>
          <span className="text-[10px] font-mono text-slate-500">
            {stats.inProgress > 0 ? `${stats.inProgress} In Progress` : 'All Decided'}
          </span>
        </div>

        {/* Cumulative PnL Pips */}
        <div className="p-3.5 rounded-xl bg-neutral-900/60 border border-neutral-800">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
            Cumulative PnL
          </span>
          <div
            className={`text-2xl font-mono font-extrabold tabular-nums mt-0.5 ${
              stats.totalPnlPips >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {stats.totalPnlPips >= 0 ? `+${stats.totalPnlPips}` : stats.totalPnlPips} pips
          </div>
          <span className="text-[10px] font-mono text-slate-500">Strategy Net Yield</span>
        </div>

        {/* Strategy Verification */}
        <div className="p-3.5 rounded-xl bg-neutral-900/60 border border-neutral-800">
          <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> CRT Precision
          </span>
          <div className="text-sm font-mono font-bold text-slate-200 mt-1">
            5M TS + 5M SMT
          </div>
          <span className="text-[10px] font-mono text-emerald-400/90">
            Strict Rule Enforced
          </span>
        </div>
      </div>

      {/* History Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs font-mono">
          <thead>
            <tr className="border-b border-neutral-800 bg-neutral-950/60 text-slate-400 text-[11px] uppercase tracking-wider">
              <th className="py-3 px-4">Date / Time (UTC+3)</th>
              <th className="py-3 px-3">Instrument</th>
              <th className="py-3 px-3">Direction</th>
              <th className="py-3 px-3">Entry Price</th>
              <th className="py-3 px-3">Stop Loss</th>
              <th className="py-3 px-4">Liquidity Target</th>
              <th className="py-3 px-3 text-center">Result</th>
              <th className="py-3 px-3 text-right">PnL (Pips)</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/60 text-slate-300">
            {last10Trades.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-500 font-mono">
                  No trade history records found for the selected filter.
                </td>
              </tr>
            ) : (
              last10Trades.map((trade) => {
                const isBuy = trade.direction === 'BUY';
                const isWin = trade.result === 'WIN';
                const isLoss = trade.result === 'LOSS';
                const isInProgress = trade.result === 'IN_PROGRESS';

                return (
                  <tr
                    key={trade.id}
                    className="hover:bg-neutral-900/40 transition-colors"
                  >
                    {/* Date / Time */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-200">{trade.date}</div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        <span>{trade.time}</span>
                      </div>
                    </td>

                    {/* Instrument */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        {trade.instrument}
                      </span>
                    </td>

                    {/* Direction */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-extrabold text-[11px] ${
                          isBuy
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {isBuy ? (
                          <TrendingUp className="w-3 h-3 stroke-[2.5]" />
                        ) : (
                          <TrendingDown className="w-3 h-3 stroke-[2.5]" />
                        )}
                        <span>{trade.direction}</span>
                      </span>
                    </td>

                    {/* Entry Price */}
                    <td className="py-3 px-3 whitespace-nowrap font-mono font-bold text-white tabular-nums">
                      {trade.entryPrice.toFixed(trade.instrument === 'AUDUSD' ? 5 : 2)}
                    </td>

                    {/* Stop Loss */}
                    <td className="py-3 px-3 whitespace-nowrap font-mono text-rose-400 tabular-nums">
                      {trade.stopLoss.toFixed(trade.instrument === 'AUDUSD' ? 5 : 2)}
                    </td>

                    {/* Target Level */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="text-slate-200 flex items-center gap-1 font-semibold">
                        <Target className="w-3 h-3 text-amber-400 shrink-0" />
                        <span>{trade.targetLevel}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        Target Price: {trade.targetPrice.toFixed(trade.instrument === 'AUDUSD' ? 5 : 2)}
                      </div>
                    </td>

                    {/* Result */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      {isWin && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 font-black border border-emerald-500/40">
                          <CheckCircle2 className="w-3 h-3 stroke-[2.5]" /> WIN
                        </span>
                      )}
                      {isLoss && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-rose-500/20 text-rose-300 font-black border border-rose-500/40">
                          <XCircle className="w-3 h-3 stroke-[2.5]" /> LOSS
                        </span>
                      )}
                      {isInProgress && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                          <Hourglass className="w-3 h-3 animate-spin" /> ACTIVE
                        </span>
                      )}
                    </td>

                    {/* PnL */}
                    <td className="py-3 px-3 text-right whitespace-nowrap font-bold tabular-nums">
                      <span
                        className={
                          trade.pnlPips > 0
                            ? 'text-emerald-400'
                            : trade.pnlPips < 0
                            ? 'text-rose-400'
                            : 'text-slate-400'
                        }
                      >
                        {trade.pnlPips > 0 ? `+${trade.pnlPips}` : trade.pnlPips} pips
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {isInProgress && (
                          <>
                            <button
                              onClick={() => handleMarkResult(trade.id, 'WIN')}
                              className="px-2 py-1 rounded bg-emerald-950/60 hover:bg-emerald-800 text-emerald-300 text-[10px] font-bold border border-emerald-600/40 transition-colors"
                              title="Mark as WIN"
                            >
                              WIN
                            </button>
                            <button
                              onClick={() => handleMarkResult(trade.id, 'LOSS')}
                              className="px-2 py-1 rounded bg-rose-950/60 hover:bg-rose-800 text-rose-300 text-[10px] font-bold border border-rose-600/40 transition-colors"
                              title="Mark as LOSS"
                            >
                              LOSS
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDelete(trade.id)}
                          className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                          title="Delete trade record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer bar */}
      <div className="flex items-center justify-between px-6 py-3 border-t border-neutral-800/80 bg-black/40 text-[11px] font-mono text-slate-500">
        <div>
          Showing last 10 outcomes · Stored locally
        </div>
        <button
          onClick={handleClear}
          className="text-slate-500 hover:text-rose-400 transition-colors"
        >
          Clear History
        </button>
      </div>
    </div>
  );
};
