/**
 * Forex Trading Sessions Engine (7 Periods + DEAD TIME)
 * Timezone: Somalia Local Time (UTC+3, East Africa Time)
 * Fully covers 24-hour continuous analysis.
 */

import {
  ForexSessionPeriod,
  SessionScheduleItem,
  TradingSessionState,
} from '../types/trading';

export const DEFAULT_SESSION_SCHEDULES: SessionScheduleItem[] = [
  {
    id: 'DEAD_TIME',
    name: 'DEAD TIME',
    startHour: 1,
    startMinute: 0,
    endHour: 6,
    endMinute: 0,
    color: '#64748b',
    accentColor: 'rgba(100, 116, 139, 0.2)',
    description: 'Post-NY rollover spread expansion & low liquidity zone',
  },
  {
    id: 'PRE_ASIAN',
    name: 'PRE-ASIAN',
    startHour: 6,
    startMinute: 0,
    endHour: 8,
    endMinute: 0,
    color: '#818cf8',
    accentColor: 'rgba(129, 140, 248, 0.2)',
    description: 'Pre-Tokyo positioning & early Asian liquidity accumulation',
  },
  {
    id: 'ASIAN_SESSION',
    name: 'ASIAN SESSION',
    startHour: 8,
    startMinute: 0,
    endHour: 11,
    endMinute: 0,
    color: '#06b6d4',
    accentColor: 'rgba(6, 182, 212, 0.2)',
    description: 'Tokyo / Sydney active interbank range expansion',
  },
  {
    id: 'PRE_LONDON',
    name: 'PRE-LONDON',
    startHour: 11,
    startMinute: 0,
    endHour: 13,
    endMinute: 0,
    color: '#f59e0b',
    accentColor: 'rgba(245, 158, 11, 0.2)',
    description: 'Frankfurt open & London Judas sweep preparation',
  },
  {
    id: 'LONDON_SESSION',
    name: 'LONDON SESSION',
    startHour: 13,
    startMinute: 0,
    endHour: 16,
    endMinute: 0,
    color: '#10b981',
    accentColor: 'rgba(16, 185, 129, 0.2)',
    description: 'High volume institutional London trend & CRT displacement',
  },
  {
    id: 'PRE_NEW_YORK',
    name: 'PRE-NEW YORK',
    startHour: 16,
    startMinute: 0,
    endHour: 19,
    endMinute: 0,
    color: '#f97316',
    accentColor: 'rgba(249, 115, 22, 0.2)',
    description: 'London afternoon / US macro data releases & positioning',
  },
  {
    id: 'NEW_YORK_AM',
    name: 'NEW YORK AM SESSION',
    startHour: 19,
    startMinute: 0,
    endHour: 22,
    endMinute: 0,
    color: '#22c55e',
    accentColor: 'rgba(34, 197, 94, 0.2)',
    description: 'Peak volume London-NY overlap & 5M CRT model triggers',
  },
  {
    id: 'NEW_YORK_PM',
    name: 'NEW YORK PM SESSION',
    startHour: 22,
    startMinute: 0,
    endHour: 1, // Wraps to 01:00 next day
    endMinute: 0,
    color: '#38bdf8',
    accentColor: 'rgba(56, 189, 248, 0.2)',
    description: 'Late NY equity close, macro target delivery & rebalancing',
  },
];

/**
 * Automatically determine if US/UK DST is in effect
 */
export function getAutoDstOffset(): number {
  const now = new Date();
  // US DST runs second Sunday in March to first Sunday in November
  const month = now.getUTCMonth(); // 0-indexed (2 = March, 10 = Nov)
  if (month > 2 && month < 10) return 1;
  return 0;
}

/**
 * Calculate the exact current Somalia session metrics and countdowns
 */
export function getSomaliaSessionState(
  dstOffsetHours = 0,
  schedules: SessionScheduleItem[] = DEFAULT_SESSION_SCHEDULES
): TradingSessionState {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  // Somalia is UTC+3. If DST offset is applied, shift accordingly.
  const somaliaTotalOffsetHours = 3 + dstOffsetHours;
  const somaliaDate = new Date(utcMs + somaliaTotalOffsetHours * 3600000);

  const hours = somaliaDate.getHours();
  const minutes = somaliaDate.getMinutes();
  const seconds = somaliaDate.getSeconds();

  const currentSecondOfDay = hours * 3600 + minutes * 60 + seconds;
  const pad = (n: number) => String(n).padStart(2, '0');
  const somaliaTimeString = `${pad(hours)}:${pad(minutes)}:${pad(seconds)} (UTC+3)`;

  // Match current active period among the 8 contiguous segments
  let activeItem: SessionScheduleItem | null = null;

  for (const item of schedules) {
    const startSec = item.startHour * 3600 + item.startMinute * 60;
    let endSec = item.endHour * 3600 + item.endMinute * 60;

    if (item.endHour < item.startHour || (item.endHour === 1 && item.startHour === 22)) {
      // Midnight crossing (e.g. 22:00 to 01:00)
      if (currentSecondOfDay >= startSec || currentSecondOfDay < endSec) {
        activeItem = item;
        break;
      }
    } else {
      if (currentSecondOfDay >= startSec && currentSecondOfDay < endSec) {
        activeItem = item;
        break;
      }
    }
  }

  // Fallback to DEAD_TIME if no match
  if (!activeItem) {
    activeItem = schedules[0];
  }

  // Find next session in sequential order
  const currentIndex = schedules.findIndex((s) => s.id === activeItem!.id);
  const nextIndex = (currentIndex + 1) % schedules.length;
  const nextItem = schedules[nextIndex];

  // Calculate remaining seconds in current session
  let closeSec = activeItem.endHour * 3600 + activeItem.endMinute * 60;
  if (activeItem.endHour < activeItem.startHour && currentSecondOfDay >= activeItem.startHour * 3600) {
    closeSec += 86400; // Close is after midnight
  }
  let timeRemainingInCurrentSessionSeconds = closeSec - currentSecondOfDay;
  if (timeRemainingInCurrentSessionSeconds < 0) {
    timeRemainingInCurrentSessionSeconds += 86400;
  }

  // Calculate seconds until next session opens
  let nextOpenSec = nextItem.startHour * 3600 + nextItem.startMinute * 60;
  if (nextOpenSec <= currentSecondOfDay) {
    nextOpenSec += 86400;
  }
  const timeToNextSessionSeconds = nextOpenSec - currentSecondOfDay;

  const isMarketSession = activeItem.id !== 'DEAD_TIME';

  return {
    currentSession: activeItem.id,
    sessionName: activeItem.name,
    isOpen: isMarketSession,
    openTimeSomalia: `${pad(activeItem.startHour)}:${pad(activeItem.startMinute)}`,
    closeTimeSomalia: `${pad(activeItem.endHour)}:${pad(activeItem.endMinute)}`,
    nextSessionName: nextItem.name,
    timeToNextSessionSeconds,
    timeRemainingInCurrentSessionSeconds,
    somaliaTimeString,
    dstOffsetHours,
    color: activeItem.color,
  };
}

export function formatCountdown(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  if (h > 0) {
    return `${pad(h)}h ${pad(m)}m ${pad(s)}s`;
  }
  return `${pad(m)}m ${pad(s)}s`;
}

/**
 * Helper to calculate candle countdown for a given timeframe
 */
export function getCandleCountdownSeconds(timeframe: string, latestCandleTime: number): number {
  const nowSec = Math.floor(Date.now() / 1000);
  const tfSecMap: Record<string, number> = {
    '5M': 300,
    '15M': 900,
    '30M': 1800,
    '1H': 3600,
    '4H': 14400,
    '1D': 86400,
    '1W': 604800,
    '1M': 2592000,
  };

  const periodSec = tfSecMap[timeframe] || 300;
  const candleStart = latestCandleTime > 0 ? latestCandleTime : Math.floor(nowSec / periodSec) * periodSec;
  const candleEnd = candleStart + periodSec;
  const remaining = candleEnd - nowSec;

  return remaining > 0 ? remaining : periodSec - (nowSec % periodSec);
}
