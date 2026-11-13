/**
 * Forex Trading Sessions Component
 * Somalia Local Time (UTC+3)
 * Implements the 7 Specific Trading Periods + DEAD TIME:
 * 1. PRE-ASIAN
 * 2. ASIAN SESSION
 * 3. PRE-LONDON
 * 4. LONDON SESSION
 * 5. PRE-NEW YORK
 * 6. NEW YORK AM SESSION
 * 7. NEW YORK PM SESSION
 * 8. DEAD TIME
 */

import React, { useState, useEffect } from 'react';
import {
  getSomaliaSessionState,
  formatCountdown,
  DEFAULT_SESSION_SCHEDULES,
} from '../services/sessionClock';
import { TradingSessionState } from '../types/trading';
import { Clock, Globe, ArrowRight, Zap, Shield, Sparkles } from 'lucide-react';

interface SessionBannerProps {
  dstOffsetHours: number;
  onDstChange: (offset: number) => void;
}

export const SessionBanner: React.FC<SessionBannerProps> = ({
  dstOffsetHours,
  onDstChange,
}) => {
  const [sessionState, setSessionState] = useState<TradingSessionState>(() =>
    getSomaliaSessionState(dstOffsetHours)
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setSessionState(getSomaliaSessionState(dstOffsetHours));
    }, 1000);
    return () => clearInterval(timer);
  }, [dstOffsetHours]);

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="w-full rounded-2xl border border-neutral-800 bg-gradient-to-b from-[#0f1118] to-[#090a0f] p-4 text-slate-100 shadow-xl">
      {/* Top Row: Current Session Banner & Real-Time Countdown */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-neutral-800/80">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-xl font-black text-sm shadow-md"
            style={{
              backgroundColor: `${sessionState.color}25`,
              color: sessionState.color,
              border: `1px solid ${sessionState.color}50`,
            }}
          >
            <Clock className="w-5 h-5 animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">
                Somalia Local Time (UTC+3)
              </span>
              <span className="text-amber-400 font-mono text-sm font-bold tabular-nums">
                {sessionState.somaliaTimeString}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono mt-0.5">
              <span>Active Period:</span>
              <span
                className="px-2 py-0.5 rounded font-bold text-xs"
                style={{
                  backgroundColor: `${sessionState.color}25`,
                  color: sessionState.color,
                  border: `1px solid ${sessionState.color}60`,
                }}
              >
                ● {sessionState.sessionName} ({sessionState.openTimeSomalia} – {sessionState.closeTimeSomalia})
              </span>
              <span className="text-neutral-600 hidden sm:inline">·</span>
              <span className="text-slate-400 hidden sm:inline text-[11px]">
                Closes in: <strong className="text-white">{formatCountdown(sessionState.timeRemainingInCurrentSessionSeconds)}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Right: Next Upcoming Session & Continuous 24h Status */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
              Next Upcoming Session
            </div>
            <div className="text-sm font-mono font-bold text-amber-400 tabular-nums">
              {formatCountdown(sessionState.timeToNextSessionSeconds)}
            </div>
            <div className="text-[11px] text-slate-300 font-medium">
              <span className="text-slate-500">Target:</span> {sessionState.nextSessionName}
            </div>
          </div>

          <div className="h-8 w-[1px] bg-neutral-800 hidden sm:block" />

          {/* 24-Hour Trading Indicator */}
          <div className="hidden md:flex flex-col items-end text-[11px] font-mono">
            <span className="flex items-center gap-1 text-emerald-400 font-bold">
              <Zap className="w-3.5 h-3.5" /> 24/7 Scanning
            </span>
            <span className="text-slate-400 text-[10px]">Unrestricted by Session</span>
          </div>

          {/* DST Toggle */}
          <div className="flex items-center gap-1 bg-[#14161f] px-2 py-1 rounded-lg border border-neutral-800 text-xs">
            <span className="text-slate-400 text-[11px] font-mono">DST:</span>
            <button
              onClick={() => onDstChange(dstOffsetHours === 0 ? 1 : 0)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                dstOffsetHours !== 0
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle Daylight Saving Time +1h offset"
            >
              {dstOffsetHours > 0 ? '+1h (ON)' : 'STD (OFF)'}
            </button>
          </div>
        </div>
      </div>

      {/* 8 Contiguous Periods Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 pt-3">
        {DEFAULT_SESSION_SCHEDULES.map((sched) => {
          const isActive = sessionState.currentSession === sched.id;
          const isNext = sessionState.nextSessionName === sched.name;

          return (
            <div
              key={sched.id}
              className={`relative rounded-xl p-2.5 transition-all border flex flex-col justify-between ${
                isActive
                  ? 'ring-1 shadow-lg'
                  : isNext
                  ? 'border-amber-500/40 bg-[#12141c]'
                  : 'border-neutral-800/80 bg-[#0d0e14]/80 opacity-75 hover:opacity-100'
              }`}
              style={{
                borderColor: isActive ? sched.color : undefined,
                boxShadow: isActive ? `0 0 15px ${sched.color}25` : undefined,
                background: isActive
                  ? `linear-gradient(180deg, ${sched.color}15 0%, #0d0f17 100%)`
                  : undefined,
              }}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span
                    className="font-black text-[11px] tracking-wide truncate"
                    style={{ color: isActive ? sched.color : '#cbd5e1' }}
                  >
                    {sched.name}
                  </span>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                  )}
                </div>

                <div className="text-[10px] font-mono text-slate-400">
                  {pad(sched.startHour)}:{pad(sched.startMinute)} – {pad(sched.endHour)}:{pad(sched.endMinute)}
                </div>
              </div>

              <div className="mt-2 pt-1 border-t border-neutral-800/60">
                {isActive ? (
                  <span
                    className="text-[10px] font-mono font-bold block truncate"
                    style={{ color: sched.color }}
                  >
                    ACTIVE NOW
                  </span>
                ) : isNext ? (
                  <span className="text-[10px] font-mono text-amber-400 font-semibold block truncate">
                    UP NEXT
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-slate-500 block truncate">
                    STANDBY
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
