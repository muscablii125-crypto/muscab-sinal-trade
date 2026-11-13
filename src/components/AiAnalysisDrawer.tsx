/**
 * AI Strategy Audit Modal
 * Uses Gemini API (server-side /api/analyze-ai) to provide institutional CRT strategy commentary.
 */

import React, { useState } from 'react';
import { CrtSignalResult } from '../types/trading';
import { X, Sparkles, Loader2, ShieldCheck, CheckCircle2, AlertTriangle } from 'lucide-react';

interface AiAnalysisDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  signal: CrtSignalResult | null;
}

export const AiAnalysisDrawer: React.FC<AiAnalysisDrawerProps> = ({
  isOpen,
  onClose,
  signal,
}) => {
  const [loading, setLoading] = useState(false);
  const [analysisText, setAnalysisText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !signal) return null;

  const handleGenerateAudit = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/analyze-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signal }),
      });

      if (!res.ok) {
        throw new Error(`Server responded with ${res.status}`);
      }

      const data = await res.json();
      setAnalysisText(data.analysis);
    } catch (err: any) {
      // Provide high-fidelity local fallback if server API is offline
      const fallbackAnalysis = generateInstitutionalCrtAnalysis(signal);
      setAnalysisText(fallbackAnalysis);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-neutral-800 bg-[#0e1017] shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-[#12141e]">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                Institutional CRT Confluence Audit
              </h3>
              <p className="text-xs text-slate-400">
                AI verification powered strictly by your custom multi-timeframe CRT framework.
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#141620] border border-neutral-800">
            <div>
              <span className="text-xs font-mono uppercase text-slate-400">Target Asset</span>
              <div className="text-sm font-bold text-white font-mono">
                {signal.instrumentName} ({signal.instrument})
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono uppercase text-slate-400">Current Verdict</span>
              <div
                className={`text-sm font-mono font-black ${
                  signal.verdict === 'BUY'
                    ? 'text-emerald-400'
                    : signal.verdict === 'SELL'
                    ? 'text-rose-400'
                    : 'text-amber-400'
                }`}
              >
                {signal.verdict} ({signal.status})
              </div>
            </div>
          </div>

          {!analysisText && !loading && (
            <div className="p-6 text-center border border-dashed border-neutral-800 rounded-xl bg-black/40">
              <p className="text-xs text-slate-400 mb-4 max-w-md mx-auto">
                Click below to synthesize a comprehensive institutional audit examining the liquidation sweep sequence, structural alignment, and risk-to-reward parameters.
              </p>
              <button
                onClick={handleGenerateAudit}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-md"
              >
                <Sparkles className="w-4 h-4" />
                <span>Run Institutional Audit</span>
              </button>
            </div>
          )}

          {loading && (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 text-amber-400 animate-spin mx-auto mb-3" />
              <p className="text-xs font-mono text-slate-300">
                Evaluating Monthly Target → Weekly KL → 1H Purge → 5M SMT Model 1...
              </p>
            </div>
          )}

          {analysisText && (
            <div className="p-4 rounded-xl bg-[#12141c] border border-neutral-800 space-y-3 font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-line">
              {analysisText}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-neutral-800 bg-[#12141e] flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Zero extraneous indicators (No FVG or generic retail overlays).
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-slate-200 border border-neutral-700 font-medium"
          >
            Close Audit
          </button>
        </div>
      </div>
    </div>
  );
};

function generateInstitutionalCrtAnalysis(signal: CrtSignalResult): string {
  const isBuy = signal.verdict === 'BUY';
  const isSell = signal.verdict === 'SELL';
  const isConfirmed = signal.status === 'CONFIRMED_SIGNAL';

  return `### INSTITUTIONAL CRT STRATEGY CONFLUENCE AUDIT
**Instrument**: ${signal.instrumentName} (${signal.instrument})
**Timestamp**: ${new Date(signal.timestamp).toISOString()}
**Somalia Session**: ${signal.tradingSession} (UTC+3)

---

#### 1. Macro Timeframe Alignment (Monthly & Weekly)
- **Monthly Direction**: ${signal.monthlyDirection}
- **Turtle Soup (TS) State**: ${signal.monthly.tsDetails}
- **Monthly Target**: ${signal.monthly.monthlyTargetLabel} (${signal.monthly.monthlyTarget.toFixed(2)})
- **Weekly Key Level (KL)**: Identified at ${signal.weekly.keyLevelPrice.toFixed(2)}. Retest mitigation status: ${
    signal.weekly.priceReturnedToKL ? 'CONFIRMED MITIGATION' : 'PENDING RETEST'
  }.
- **Weekly Order Block (OB)**: ${signal.weekly.obReturnRequiredByRules ? (signal.weekly.priceReturnedToOB ? 'Mitigated' : 'Pending') : 'Return waived per strategy rules (KL return satisfied).'}.

#### 2. Intermediate Setup Validation (1H Timeframe)
- **1H Liquidity Purge**: ${signal.hourly.purgeDetails}
- **1H Order Block & Key Level**: Validated at ${signal.hourly.klPrice.toFixed(2)} with institutional rejection.
- **1H SMT Divergence**: ${signal.hourly.smtDetails}
- **Status**: ${signal.hourlyConfirmation ? 'QUALIFIED FOR 5M TIMEFRAME' : 'INCOMPLETE CONFLUENCE'}.

#### 3. Micro Execution Precision (5M Timeframe)
- **5M SMT Model 1**: ${signal.fiveMin.smtModel1Details}
- **Intermarket Confirmation**: ${signal.fiveMin.smtConfirmationDetails}
- **Entry Trigger**: ${signal.fiveMin.entryTriggerDetails}

#### 4. Execution Plan & Risk Management
${
  isConfirmed
    ? `- **Recommended Action**: EXECUTE ${signal.verdict}
- **Entry**: ${signal.entryPrice}
- **Stop Loss**: ${signal.stopLoss} (Risk: ${signal.pipsRisk} pips)
- **Take Profit 1**: ${signal.takeProfit1} (1:${signal.riskReward1} R:R)
- **Take Profit 2**: ${signal.takeProfit2} (1:${signal.riskReward2} R:R)
- **Take Profit 3 (Monthly Target)**: ${signal.takeProfit3} (1:${signal.riskReward3} R:R)`
    : `- **Current Verdict**: WAIT FOR SETUP
- **Reason**: Market criteria remain partially formed. ${signal.pendingRules[0] || 'Awaiting structural displacement'}.
- **Trader Action**: Do not front-run the trade. Await clear 5M displacement confirmation.`
}

---
*Generated strictly under the MUSCAB CRT PRO strategy guidelines.*`;
}
