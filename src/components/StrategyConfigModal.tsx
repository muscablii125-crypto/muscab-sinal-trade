/**
 * Strategy Configuration Modal
 * Allows customization of exact TS, Model 1, OB, KL, Purge, and SMT rules.
 */

import React, { useState } from 'react';
import { CrtStrategyConfig } from '../types/trading';
import { DEFAULT_CRT_RULES } from '../constants/instruments';
import { X, SlidersHorizontal, RotateCcw, Check, ShieldCheck, Info } from 'lucide-react';

interface StrategyConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: CrtStrategyConfig;
  onSaveConfig: (newConfig: CrtStrategyConfig) => void;
}

export const StrategyConfigModal: React.FC<StrategyConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
}) => {
  const [formData, setFormData] = useState<CrtStrategyConfig>(config);
  const [activeSection, setActiveSection] = useState<'ALL' | 'TS' | 'OB_KL' | 'PURGE_SMT' | 'EXEC'>('ALL');

  if (!isOpen) return null;

  const handleChange = <K extends keyof CrtStrategyConfig>(
    key: K,
    value: CrtStrategyConfig[K]
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setFormData(DEFAULT_CRT_RULES);
  };

  const handleSave = () => {
    onSaveConfig(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl border border-neutral-800 bg-[#0e1017] shadow-2xl overflow-hidden text-slate-100">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-[#12141e]">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                CRT Strategy Configuration
              </h3>
              <p className="text-xs text-slate-400">
                Configure exact parameters for Turtle Soup, Model 1, OB, KL, Purge, and SMT.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body with Scroll */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 1. Turtle Soup (TS) & Model 1 */}
          <div className="rounded-xl border border-neutral-800 bg-[#12141c] p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Turtle Soup (TS) & Model 1 Rules
              </span>
              <span className="text-[11px] font-mono text-slate-400">Monthly / Weekly / 1H</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-slate-300 font-medium block mb-1">
                  Min Wick Sweep Threshold (Pips)
                </label>
                <input
                  type="number"
                  min="2"
                  max="50"
                  step="1"
                  value={formData.tsSweepMinPips}
                  onChange={(e) => handleChange('tsSweepMinPips', Number(e.target.value))}
                  className="w-full bg-[#181a24] border border-neutral-700 rounded-lg px-3 py-2 text-white font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Minimum wick extension past previous high/low to qualify as Turtle Soup.
                </span>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">
                  Model 1 Displacement Factor
                </label>
                <input
                  type="number"
                  min="1.0"
                  max="3.0"
                  step="0.1"
                  value={formData.model1DisplacementMultiplier}
                  onChange={(e) => handleChange('model1DisplacementMultiplier', Number(e.target.value))}
                  className="w-full bg-[#181a24] border border-neutral-700 rounded-lg px-3 py-2 text-white font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Displacement expansion velocity required after sweep.
                </span>
              </div>

              <div className="sm:col-span-2 flex items-center justify-between p-3 rounded-lg bg-[#181a24] border border-neutral-700/60">
                <div>
                  <div className="text-slate-200 font-medium">Require Rejection Candle Close Inside Range</div>
                  <div className="text-[11px] text-slate-400">
                    Candle must close back within previous candle range to confirm Turtle Soup.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.tsRequireRejectionClose}
                  onChange={(e) => handleChange('tsRequireRejectionClose', e.target.checked)}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* 2. Order Block (OB) & Key Levels (KL) */}
          <div className="rounded-xl border border-neutral-800 bg-[#12141c] p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Order Block (OB) & Key Levels (KL) Rules
              </span>
              <span className="text-[11px] font-mono text-slate-400">Weekly & 1H Mitigation</span>
            </div>

            <div className="space-y-3 text-xs">
              {/* Important: Weekly OB return toggle */}
              <div className="flex items-start justify-between p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <div className="pr-3">
                  <div className="text-amber-300 font-semibold flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-amber-400" />
                    Require Price to Return to Weekly OB
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5">
                    User rule constraint: By default, price is only required to return to Weekly Key Level (KL). Toggle this ON if you want the algorithm to mandate Weekly Order Block mitigation as well.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.requireWeeklyOBReturn}
                  onChange={(e) => handleChange('requireWeeklyOBReturn', e.target.checked)}
                  className="w-5 h-5 accent-amber-500 rounded cursor-pointer mt-0.5"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">
                    KL Retest Tolerance (Pips)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    step="1"
                    value={formData.klRetestTolerancePips}
                    onChange={(e) => handleChange('klRetestTolerancePips', Number(e.target.value))}
                    className="w-full bg-[#181a24] border border-neutral-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Acceptable pip distance from Key Level to count as mitigated.
                  </span>
                </div>

                <div>
                  <label className="text-slate-300 font-medium block mb-1">
                    OB Mitigation Tolerance (Pips)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    step="1"
                    value={formData.obMitigationTolerancePips}
                    onChange={(e) => handleChange('obMitigationTolerancePips', Number(e.target.value))}
                    className="w-full bg-[#181a24] border border-neutral-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Acceptable touch margin into Order Block boundary.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Purge & SMT Divergence Rules */}
          <div className="rounded-xl border border-neutral-800 bg-[#12141c] p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                1H Purge & 5M SMT Model 1 Rules
              </span>
              <span className="text-[11px] font-mono text-slate-400">Lower Timeframe Execution</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-slate-300 font-medium block mb-1">
                  Min Purge Liquidity Points
                </label>
                <input
                  type="number"
                  min="5"
                  max="40"
                  step="1"
                  value={formData.purgeMinLiquidityPoints}
                  onChange={(e) => handleChange('purgeMinLiquidityPoints', Number(e.target.value))}
                  className="w-full bg-[#181a24] border border-neutral-700 rounded-lg px-3 py-2 text-white font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Minimum depth of 1H sweep into pool before displacement.
                </span>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">
                  SMT Divergence Sensitivity
                </label>
                <select
                  value={formData.smtSensitivity}
                  onChange={(e) => handleChange('smtSensitivity', e.target.value as any)}
                  className="w-full bg-[#181a24] border border-neutral-700 rounded-lg px-3 py-2 text-white font-mono"
                >
                  <option value="CONSERVATIVE">Conservative (Strict Extremes)</option>
                  <option value="BALANCED">Balanced (Standard CRT)</option>
                  <option value="AGGRESSIVE">Aggressive (Early Inflection)</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Sensitivity of intermarket high/low divergence detection.
                </span>
              </div>
            </div>
          </div>

          {/* 4. Risk / Reward Ratios & Execution */}
          <div className="rounded-xl border border-neutral-800 bg-[#12141c] p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Target Ratios & Stop Loss Buffer
              </span>
              <span className="text-[11px] font-mono text-slate-400">TP1 / TP2 / TP3</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-slate-300 font-medium block mb-1">
                  Take Profit 1 Ratio (R:R)
                </label>
                <input
                  type="number"
                  min="1.5"
                  max="4.0"
                  step="0.5"
                  value={formData.tp1Ratio}
                  onChange={(e) => handleChange('tp1Ratio', Number(e.target.value))}
                  className="w-full bg-[#181a24] border border-neutral-700 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">
                  Take Profit 2 Ratio (R:R)
                </label>
                <input
                  type="number"
                  min="2.5"
                  max="6.0"
                  step="0.5"
                  value={formData.tp2Ratio}
                  onChange={(e) => handleChange('tp2Ratio', Number(e.target.value))}
                  className="w-full bg-[#181a24] border border-neutral-700 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">
                  SL Invalidation Buffer (Pips)
                </label>
                <input
                  type="number"
                  min="1"
                  max="15"
                  step="1"
                  value={formData.slBufferPips}
                  onChange={(e) => handleChange('slBufferPips', Number(e.target.value))}
                  className="w-full bg-[#181a24] border border-neutral-700 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-800 bg-[#12141e]">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-slate-400 hover:text-slate-200 border border-neutral-700 text-xs font-mono transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Strategy Defaults</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-slate-400 hover:text-slate-200 text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold tracking-wide transition-all shadow-md"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Apply & Save Rules</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
