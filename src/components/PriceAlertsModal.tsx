/**
 * Custom Price Alerts Management Modal for MUSCAB CRT PRO
 * Allows setting target price notifications for XAUUSD, AUDUSD, and NASDAQ.
 */

import React, { useState } from 'react';
import { InstrumentId, PriceAlert } from '../types/trading';
import { priceAlertsService } from '../services/priceAlerts';
import { soundEffects } from '../services/soundEffects';
import { SUPPORTED_INSTRUMENTS } from '../constants/instruments';
import {
  Bell,
  X,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Volume2,
  VolumeX,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface PriceAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPrices: Record<InstrumentId, number>;
  onAlertsUpdated: () => void;
  soundEnabled: boolean;
  onToggleSound: (enabled: boolean) => void;
}

export const PriceAlertsModal: React.FC<PriceAlertsModalProps> = ({
  isOpen,
  onClose,
  currentPrices,
  onAlertsUpdated,
  soundEnabled,
  onToggleSound,
}) => {
  const [selectedInstrument, setSelectedInstrument] = useState<InstrumentId>('XAUUSD');
  const [condition, setCondition] = useState<'ABOVE' | 'BELOW'>('ABOVE');
  const [targetPriceStr, setTargetPriceStr] = useState<string>(() => {
    const cur = currentPrices['XAUUSD'] || 4065;
    return (cur + 5).toFixed(2);
  });
  const [note, setNote] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isOpen) return null;

  const currentPrice = currentPrices[selectedInstrument] || 0;
  const instrumentInfo = SUPPORTED_INSTRUMENTS[selectedInstrument];
  const alerts = priceAlertsService.getAlerts();

  const handleInstrumentChange = (inst: InstrumentId) => {
    setSelectedInstrument(inst);
    const p = currentPrices[inst] || 0;
    const decimals = SUPPORTED_INSTRUMENTS[inst].decimals;
    const offset = inst === 'AUDUSD' ? 0.001 : inst === 'NASDAQ' ? 20 : 5;
    setTargetPriceStr((p + offset).toFixed(decimals));
    setErrorMsg('');
  };

  const handleQuickOffset = (pips: number) => {
    const p = currentPrices[selectedInstrument] || 0;
    const offset = pips * instrumentInfo.pipSize;
    const newPrice = p + offset;
    setTargetPriceStr(newPrice.toFixed(instrumentInfo.decimals));
    setCondition(offset >= 0 ? 'ABOVE' : 'BELOW');
    setErrorMsg('');
  };

  const handleCreateAlert = (e: React.FormEvent) => {
    e.preventDefault();
    const targetPrice = parseFloat(targetPriceStr);

    if (isNaN(targetPrice) || targetPrice <= 0) {
      setErrorMsg('Please enter a valid numeric target price.');
      return;
    }

    priceAlertsService.addAlert(
      selectedInstrument,
      targetPrice,
      condition,
      note || undefined
    );

    setNote('');
    setErrorMsg('');
    onAlertsUpdated();
    // Play test ping to confirm
    soundEffects.playAlertChime();
  };

  const handleDeleteAlert = (id: string) => {
    priceAlertsService.deleteAlert(id);
    onAlertsUpdated();
  };

  const handleClearTriggered = () => {
    priceAlertsService.clearTriggeredAlerts();
    onAlertsUpdated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-2xl border border-neutral-800 bg-[#0b0d13] text-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800/80 bg-black/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                Price Target Alerts
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Real-time audio chime & visual notifications when price crosses threshold
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Audio Toggle */}
            <button
              onClick={() => onToggleSound(!soundEnabled)}
              className={`p-2 rounded-lg border text-xs font-mono flex items-center gap-1.5 transition-colors ${
                soundEnabled
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-neutral-900 border-neutral-800 text-slate-500'
              }`}
              title={soundEnabled ? 'Mute Alert Chimes' : 'Unmute Alert Chimes'}
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Chime On</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Muted</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Create Alert Form */}
          <form onSubmit={handleCreateAlert} className="space-y-4">
            <div className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
              Create New Target Alert
            </div>

            {/* Instrument Tabs */}
            <div className="grid grid-cols-3 gap-2">
              {(['XAUUSD', 'AUDUSD', 'NASDAQ'] as InstrumentId[]).map((inst) => {
                const isSelected = selectedInstrument === inst;
                const price = currentPrices[inst] || 0;
                const decimals = SUPPORTED_INSTRUMENTS[inst].decimals;
                return (
                  <button
                    key={inst}
                    type="button"
                    onClick={() => handleInstrumentChange(inst)}
                    className={`p-2.5 rounded-xl border text-left font-mono transition-all ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500/60 text-white shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                        : 'bg-neutral-900/60 border-neutral-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-bold text-xs">{inst}</div>
                    <div className="text-xs font-extrabold text-amber-400 tabular-nums mt-0.5">
                      ${price > 0 ? price.toFixed(decimals) : '---'}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Condition & Target Price Input */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Condition */}
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">
                  Trigger Condition
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCondition('ABOVE')}
                    className={`py-2 px-3 rounded-lg border text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-colors ${
                      condition === 'ABOVE'
                        ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300'
                        : 'bg-neutral-900 border-neutral-800 text-slate-400'
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Crosses ABOVE</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCondition('BELOW')}
                    className={`py-2 px-3 rounded-lg border text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-colors ${
                      condition === 'BELOW'
                        ? 'bg-rose-500/20 border-rose-500/60 text-rose-300'
                        : 'bg-neutral-900 border-neutral-800 text-slate-400'
                    }`}
                  >
                    <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                    <span>Crosses BELOW</span>
                  </button>
                </div>
              </div>

              {/* Target Price */}
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">
                  Target Price
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    value={targetPriceStr}
                    onChange={(e) => setTargetPriceStr(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm font-mono font-bold text-white focus:outline-none focus:border-amber-400 tabular-nums"
                    placeholder="Enter target price..."
                  />
                  <span className="absolute right-3 top-2 text-xs font-mono text-slate-500">
                    {selectedInstrument === 'XAUUSD' ? 'USD/oz' : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Offset Buttons */}
            <div>
              <div className="text-[10px] font-mono text-slate-500 mb-1.5">
                Quick Pips Presets:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[+10, +25, +50, -10, -25, -50].map((pips) => (
                  <button
                    key={pips}
                    type="button"
                    onClick={() => handleQuickOffset(pips)}
                    className="px-2 py-1 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-[11px] font-mono text-slate-300 transition-colors"
                  >
                    {pips > 0 ? `+${pips} pips` : `${pips} pips`}
                  </button>
                ))}
              </div>
            </div>

            {/* Note & Submit Button */}
            <div className="flex gap-2">
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional alert label (e.g. PDH sweep watch)..."
                className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-bold text-xs flex items-center gap-1.5 transition-colors shadow-lg shadow-amber-500/20"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Set Alert</span>
              </button>
            </div>

            {errorMsg && (
              <div className="text-xs text-rose-400 font-mono flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </form>

          {/* Active Alerts List */}
          <div className="space-y-3 pt-4 border-t border-neutral-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
                Configured Price Alerts ({alerts.length})
              </span>
              {alerts.some((a) => a.triggered) && (
                <button
                  type="button"
                  onClick={handleClearTriggered}
                  className="text-[11px] font-mono text-amber-400 hover:underline"
                >
                  Clear Triggered
                </button>
              )}
            </div>

            {alerts.length === 0 ? (
              <div className="p-6 rounded-xl border border-dashed border-neutral-800 text-center text-slate-500 text-xs font-mono">
                No price alerts configured. Set an alert above to get notified in real time.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {alerts.map((alert) => {
                  const isAbove = alert.condition === 'ABOVE';
                  return (
                    <div
                      key={alert.id}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs font-mono transition-colors ${
                        alert.triggered
                          ? 'bg-neutral-900/40 border-neutral-800 text-slate-500 opacity-60'
                          : 'bg-neutral-900/80 border-neutral-800 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
                          {alert.instrument}
                        </span>

                        <span
                          className={`flex items-center gap-1 font-bold ${
                            isAbove ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isAbove ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          <span>{isAbove ? '≥' : '≤'}</span>
                          <span className="tabular-nums">
                            {alert.targetPrice.toFixed(
                              SUPPORTED_INSTRUMENTS[alert.instrument].decimals
                            )}
                          </span>
                        </span>

                        {alert.note && (
                          <span className="text-slate-400 text-[11px] truncate max-w-[140px]">
                            · {alert.note}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {alert.triggered ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" /> Triggered
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                            Active
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeleteAlert(alert.id)}
                          className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-neutral-800 transition-colors"
                          title="Delete alert"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-neutral-800 bg-black/40 flex items-center justify-between text-xs font-mono text-slate-500">
          <span>Target crosses trigger instant visual toast + audio chime</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-slate-300 border border-neutral-800 font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
