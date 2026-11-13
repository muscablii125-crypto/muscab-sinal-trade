/**
 * XAUUSD CFD Market Intelligence & Lot Size Risk Calculator
 * Tailored specifically for Gold CFD trading using the CRT strategy.
 */

import React, { useState } from 'react';
import { CrtSignalResult } from '../types/trading';
import { SUPPORTED_INSTRUMENTS } from '../constants/instruments';
import {
  Coins,
  Calculator,
  Flame,
  Scale,
  Clock,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface GoldCfdSpecsCardProps {
  currentGoldPrice: number;
  signal: CrtSignalResult | null;
  onQuickSearchGold: () => void;
}

export const GoldCfdSpecsCard: React.FC<GoldCfdSpecsCardProps> = ({
  currentGoldPrice,
  signal,
  onQuickSearchGold,
}) => {
  // Calculator State
  const [accountBalance, setAccountBalance] = useState<number>(10000);
  const [riskPercent, setRiskPercent] = useState<number>(1.0);
  const customSlPips = signal && signal.instrument === 'XAUUSD' ? signal.pipsRisk : 12.0;
  const [slPips, setSlPips] = useState<number>(customSlPips);

  const goldInfo = SUPPORTED_INSTRUMENTS.XAUUSD;
  const spreadPips = goldInfo.spreadPips || 1.6;

  // Live Bid/Ask derivation
  const bidPrice = Number((currentGoldPrice - (spreadPips * goldInfo.pipSize) / 2).toFixed(2));
  const askPrice = Number((currentGoldPrice + (spreadPips * goldInfo.pipSize) / 2).toFixed(2));

  // Risk Math:
  // For XAUUSD CFD: 1 Standard Lot (100 oz) -> 1 pip ($0.10 price change) = $10.00 USD
  const dollarRisk = (accountBalance * riskPercent) / 100;
  const pipValuePerStandardLot = 10.0; // $10 per pip on 100 oz contract
  const calculatedLots = slPips > 0 ? Number((dollarRisk / (slPips * pipValuePerStandardLot)).toFixed(2)) : 0.5;

  const tp1Pips = slPips * 2.0;
  const tp2Pips = slPips * 3.5;
  const tp3Pips = slPips * 5.0;

  const expectedGainTp1 = (calculatedLots * tp1Pips * pipValuePerStandardLot).toFixed(2);
  const expectedGainTp2 = (calculatedLots * tp2Pips * pipValuePerStandardLot).toFixed(2);
  const expectedGainTp3 = (calculatedLots * tp3Pips * pipValuePerStandardLot).toFixed(2);

  return (
    <div className="w-full rounded-2xl border border-amber-500/30 bg-gradient-to-b from-[#14120c] via-[#0d0e14] to-[#090a0f] p-5 shadow-2xl">
      {/* Header with Gold CFD Branding */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black shadow-[0_0_20px_rgba(245,158,11,0.25)]">
            <Coins className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-white tracking-wide uppercase">
                XAUUSD CFD <span className="text-amber-400">Trading Hub</span>
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                100 OZ STANDARD CONTRACT
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Spot Gold Contract for Difference with real-time liquidity pools & institutional SMT.
            </p>
          </div>
        </div>

        {/* Live Bid / Ask / Spread Box */}
        <div className="flex items-center gap-3 bg-[#11131c] px-4 py-2.5 rounded-xl border border-neutral-800 font-mono">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">CFD Bid</span>
            <span className="text-base font-extrabold text-slate-100 tabular-nums">
              ${bidPrice.toFixed(2)}
            </span>
          </div>

          <div className="h-7 w-[1px] bg-neutral-800" />

          <div className="text-left">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">CFD Ask</span>
            <span className="text-base font-extrabold text-amber-400 tabular-nums">
              ${askPrice.toFixed(2)}
            </span>
          </div>

          <div className="h-7 w-[1px] bg-neutral-800" />

          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Spread</span>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
              {spreadPips} pips
            </span>
          </div>
        </div>
      </div>

      {/* Two-Column Grid: Left: Gold Institutional Liquidity Specs; Right: Lot Size Calculator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-4">
        {/* Left: Contract Specifications & CRT Liquidity Anchors */}
        <div className="lg:col-span-6 space-y-3">
          <div className="rounded-xl border border-neutral-800 bg-[#0f1118] p-4 text-xs font-mono">
            <div className="flex items-center justify-between text-slate-300 mb-3 font-sans font-bold">
              <span className="flex items-center gap-1.5 text-amber-400">
                <Flame className="w-4 h-4" /> XAUUSD CFD Institutional Profile
              </span>
              <span className="text-[11px] text-slate-400 font-mono">Spot Metals ECN</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-2.5 rounded-lg bg-[#141622] border border-neutral-800">
                <span className="text-slate-400 text-[10px] uppercase block">Contract Size</span>
                <span className="text-slate-100 font-bold text-xs mt-0.5 block">100 Troy Oz ($10/pip)</span>
              </div>

              <div className="p-2.5 rounded-lg bg-[#141622] border border-neutral-800">
                <span className="text-slate-400 text-[10px] uppercase block">Pip / Tick Scale</span>
                <span className="text-slate-100 font-bold text-xs mt-0.5 block">0.10 Pip = $0.10 / $0.01 Tick</span>
              </div>

              <div className="p-2.5 rounded-lg bg-[#141622] border border-neutral-800">
                <span className="text-slate-400 text-[10px] uppercase block">SMT Correlated Asset</span>
                <span className="text-amber-400 font-bold text-xs mt-0.5 block">XAGUSD (Silver Spot CFD)</span>
              </div>

              <div className="p-2.5 rounded-lg bg-[#141622] border border-neutral-800">
                <span className="text-slate-400 text-[10px] uppercase block">Gold/Silver Ratio</span>
                <span className="text-slate-100 font-bold text-xs mt-0.5 block">~81.65 (Bullish Divergence)</span>
              </div>
            </div>

            {/* Key Gold Liquidity Hours */}
            <div className="mt-3 pt-3 border-t border-neutral-800/80">
              <span className="text-[11px] text-slate-400 block mb-1.5 font-sans font-medium">
                High-Volatility XAUUSD CFD Session Windows:
              </span>
              <div className="space-y-1 text-[11px] text-slate-300">
                <div className="flex items-center justify-between">
                  <span>· London Gold AM Fix & Open:</span>
                  <strong className="text-amber-400">13:00 - 14:00 EAT</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>· New York Comex & US Open:</span>
                  <strong className="text-amber-400">19:00 - 20:30 EAT</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>· London Gold PM Fixing:</span>
                  <strong className="text-slate-300">18:00 EAT</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Interactive XAUUSD CFD Position & Risk Calculator */}
        <div className="lg:col-span-6 rounded-xl border border-neutral-800 bg-[#0f1118] p-4 text-xs font-mono">
          <div className="flex items-center justify-between text-slate-300 mb-3 font-sans font-bold">
            <span className="flex items-center gap-1.5 text-amber-400">
              <Calculator className="w-4 h-4" /> Gold CFD Lot Size & Risk Calculator
            </span>
            <span className="text-[11px] text-emerald-400 font-mono">1:2 to 1:5 R:R Targets</span>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Account ($)</label>
              <input
                type="number"
                min="100"
                step="500"
                value={accountBalance}
                onChange={(e) => setAccountBalance(Number(e.target.value))}
                className="w-full bg-[#161824] border border-neutral-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Risk (%)</label>
              <input
                type="number"
                min="0.25"
                max="5.0"
                step="0.25"
                value={riskPercent}
                onChange={(e) => setRiskPercent(Number(e.target.value))}
                className="w-full bg-[#161824] border border-neutral-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Stop Loss (Pips)</label>
              <input
                type="number"
                min="2.0"
                max="50.0"
                step="0.5"
                value={slPips}
                onChange={(e) => setSlPips(Number(e.target.value))}
                className="w-full bg-[#161824] border border-neutral-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs"
              />
            </div>
          </div>

          {/* Calculated Output Box */}
          <div className="p-3 rounded-lg bg-gradient-to-r from-amber-500/10 via-[#161824] to-[#12141f] border border-amber-500/30 mb-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase text-slate-400 block">Recommended Position Size</span>
                <span className="text-xl font-black text-amber-400 font-mono">
                  {calculatedLots} <span className="text-xs text-slate-300 font-normal">Lots (100 oz/lot)</span>
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase text-slate-400 block">Maximum Risk</span>
                <span className="text-base font-extrabold text-rose-400 font-mono">
                  -${dollarRisk.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Projected Target Gains */}
          <div className="grid grid-cols-3 gap-2 text-[11px] pt-1">
            <div className="p-2 rounded bg-[#131520] border border-neutral-800 text-center">
              <span className="text-slate-400 block text-[10px]">TP1 (1:2)</span>
              <strong className="text-emerald-400 block mt-0.5">+${expectedGainTp1}</strong>
            </div>

            <div className="p-2 rounded bg-[#131520] border border-neutral-800 text-center">
              <span className="text-slate-400 block text-[10px]">TP2 (1:3.5)</span>
              <strong className="text-emerald-400 block mt-0.5">+${expectedGainTp2}</strong>
            </div>

            <div className="p-2 rounded bg-[#131520] border border-neutral-800 text-center">
              <span className="text-slate-400 block text-[10px]">TP3 (Monthly)</span>
              <strong className="text-amber-400 block mt-0.5">+${expectedGainTp3}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
