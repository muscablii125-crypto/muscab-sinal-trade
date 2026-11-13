/**
 * High-Contrast Instrument Selector
 * Strictly supports ONLY: XAUUSD, AUDUSD, NASDAQ
 */

import React from 'react';
import { InstrumentId } from '../types/trading';
import { SUPPORTED_INSTRUMENTS, INSTRUMENT_LIST } from '../constants/instruments';
import { TrendingUp, TrendingDown, ShieldAlert } from 'lucide-react';

interface InstrumentSelectorProps {
  selectedInstrument: InstrumentId;
  onSelectInstrument: (id: InstrumentId) => void;
  livePrices: Record<InstrumentId, number>;
}

export const InstrumentSelector: React.FC<InstrumentSelectorProps> = ({
  selectedInstrument,
  onSelectInstrument,
  livePrices,
}) => {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs uppercase font-mono tracking-wider text-slate-400">
          Select Trading Instrument (Exclusive Portfolio)
        </label>
        <span className="text-[11px] font-mono text-amber-400/90 flex items-center gap-1">
          <ShieldAlert className="w-3 h-3" /> 3 Authorized Assets Only
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {INSTRUMENT_LIST.map((id) => {
          const info = SUPPORTED_INSTRUMENTS[id];
          const isSelected = selectedInstrument === id;
          const currentPrice = livePrices[id] || info.currentPrice;
          const isPositive = info.change24h >= 0;

          return (
            <button
              key={id}
              onClick={() => onSelectInstrument(id)}
              className={`relative flex flex-col p-3.5 rounded-xl text-left transition-all border ${
                isSelected
                  ? 'bg-gradient-to-b from-[#181a24] to-[#10121a] border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/40'
                  : 'bg-[#0f1118] border-neutral-800 hover:border-neutral-700 hover:bg-[#131520]'
              }`}
            >
              {/* Top Row: Symbol & Category */}
              <div className="flex items-center justify-between w-full mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-base tracking-wide text-white">
                    {info.ticker}
                  </span>
                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-neutral-800 text-slate-400 border border-neutral-700/60">
                    {info.category}
                  </span>
                </div>
                {isSelected && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                )}
              </div>

              {/* Sub-name */}
              <div className="text-xs text-slate-400 truncate mb-2">
                {info.name}
              </div>

              {/* Price & Change */}
              <div className="flex items-baseline justify-between w-full mt-auto pt-2 border-t border-neutral-800/60 font-mono">
                {currentPrice > 0 ? (
                  <>
                    <span className="text-lg font-bold text-slate-100 tabular-nums">
                      {currentPrice.toFixed(info.decimals)}
                    </span>
                    <span
                      className={`flex items-center gap-0.5 text-xs font-semibold tabular-nums ${
                        isPositive ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isPositive ? (
                        <TrendingUp className="w-3.5 h-3.5" />
                      ) : (
                        <TrendingDown className="w-3.5 h-3.5" />
                      )}
                      {isPositive ? '+' : ''}
                      {info.change24h}%
                    </span>
                  </>
                ) : (
                  <span className="text-xs font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                    DATA DISCONNECTED
                  </span>
                )}
              </div>

              {/* SMT Correlated info badge */}
              <div className="mt-2 text-[10px] font-mono text-slate-400 truncate">
                SMT: <span className="text-amber-400/90">{info.correlatedPair}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
