/**
 * Top Navigation Bar for MUSCAB CRT PRO
 * Follows the 3-Zone Top Bar Contract from the Universal Frontend Design Constitution
 * Includes Broker Switcher (Binance Spot Gold ECN vs OANDA CFD),
 * Sound Notification toggle, and Custom Price Alerts launcher.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  SlidersHorizontal,
  Bell,
  Volume2,
  VolumeX,
  Building2,
  User,
  LogOut,
  ChevronDown,
  ShieldCheck,
  Sparkles,
  LifeBuoy,
  Settings,
} from 'lucide-react';
import { UserAccount } from '../types/auth';

interface HeaderProps {
  onOpenRules: () => void;
  onOpenAiAudit: () => void;
  onOpenAlerts: () => void;
  alertsCount: number;
  soundEnabled: boolean;
  onToggleSound: (enabled: boolean) => void;
  broker: 'BINANCE' | 'OANDA';
  onToggleBroker: (broker: 'BINANCE' | 'OANDA') => void;
  currentUser: UserAccount | null;
  onOpenAuth: (mode?: 'LOGIN' | 'SIGNUP') => void;
  onOpenProfile: () => void;
  onOpenSupport: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenRules,
  onOpenAlerts,
  alertsCount,
  soundEnabled,
  onToggleSound,
  broker,
  onToggleBroker,
  currentUser,
  onOpenAuth,
  onOpenProfile,
  onOpenSupport,
  onLogout,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  return (
    <header className="w-full border-b border-neutral-800 bg-[#090a0f] sticky top-0 z-40 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 px-4 sm:px-6 py-3">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-2 whitespace-nowrap shrink-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black text-sm shadow-[0_0_12px_rgba(245,158,11,0.3)]">
            M
          </div>
          <a
            href="/"
            className="text-lg font-black tracking-wider text-white uppercase font-sans hover:text-amber-400 transition-colors"
          >
            MUSCAB <span className="text-amber-400">CRT PRO</span>
          </a>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden lg:flex items-center gap-6 text-xs font-mono font-medium text-slate-400">
          <a
            href="#dashboard"
            className="text-slate-200 hover:text-amber-400 transition-colors whitespace-nowrap"
          >
            Signals
          </a>
          <a
            href="#chart-view"
            className="hover:text-slate-200 transition-colors whitespace-nowrap"
          >
            Interactive Chart
          </a>
          <a
            href="#sessions"
            className="hover:text-slate-200 transition-colors whitespace-nowrap"
          >
            Somalia Sessions (UTC+3)
          </a>
          <a
            href="#history"
            className="hover:text-slate-200 transition-colors whitespace-nowrap"
          >
            Trade History
          </a>
          <a
            href="#timeframe-breakdown"
            className="hover:text-slate-200 transition-colors whitespace-nowrap"
          >
            CRT Confluence
          </a>
          <button
            onClick={onOpenSupport}
            className="hover:text-amber-400 text-slate-400 transition-colors whitespace-nowrap flex items-center gap-1"
          >
            <LifeBuoy className="w-3.5 h-3.5 text-amber-400" />
            <span>Support</span>
          </button>
        </nav>

        {/* Zone 3: Actions & Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* CFD Broker Switcher: Binance ECN Spot vs OANDA CFD */}
          <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-lg p-0.5 text-[11px] font-mono">
            <button
              onClick={() => onToggleBroker('BINANCE')}
              className={`px-2 py-1 rounded transition-colors flex items-center gap-1 ${
                broker === 'BINANCE'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Binance Spot Gold ECN (PAXG/USDT London Good Delivery)"
            >
              <Building2 className="w-3 h-3" />
              <span className="hidden sm:inline">Binance</span>
            </button>
            <button
              onClick={() => onToggleBroker('OANDA')}
              className={`px-2 py-1 rounded transition-colors flex items-center gap-1 ${
                broker === 'OANDA'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="OANDA XAU/USD CFD Broker execution"
            >
              <Building2 className="w-3 h-3" />
              <span className="font-semibold">OANDA</span>
            </button>
          </div>

          {/* Sound Notification Chime Toggle */}
          <button
            onClick={() => onToggleSound(!soundEnabled)}
            className={`p-2 rounded-lg border text-xs font-mono transition-colors flex items-center gap-1 ${
              soundEnabled
                ? 'bg-neutral-900 border-neutral-700 text-emerald-400 hover:bg-neutral-800'
                : 'bg-neutral-900/60 border-neutral-800 text-slate-500 hover:text-slate-300'
            }`}
            title={soundEnabled ? 'Chime sound is active on Signals & Alerts' : 'Sound is muted'}
          >
            {soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5" />
            ) : (
              <VolumeX className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Price Alerts Button with Badge */}
          <button
            onClick={onOpenAlerts}
            className="relative p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 text-slate-300 transition-colors"
            title="Manage Target Price Alerts"
          >
            <Bell className="w-3.5 h-3.5 text-amber-400" />
            {alertsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-slate-950 text-[9px] font-mono font-black flex items-center justify-center">
                {alertsCount}
              </span>
            )}
          </button>

          {/* Contact Support Button (Official Support: muscablii125@gmail.com) */}
          <button
            onClick={onOpenSupport}
            className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 text-slate-300 hover:text-amber-400 transition-colors flex items-center gap-1 text-xs font-mono"
            title="Contact Support: muscablii125@gmail.com"
          >
            <LifeBuoy className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden xl:inline text-slate-300">Support</span>
          </button>

          {/* CRT Rules Configuration */}
          <button
            onClick={onOpenRules}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-mono font-semibold text-slate-300 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 rounded-lg transition-colors whitespace-nowrap"
            title="Configure Strategy Rules"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">CRT Rules</span>
          </button>

          {/* User Account / Login & Sign Up */}
          {currentUser ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 transition-all text-xs font-mono"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-bold text-[11px] shrink-0 overflow-hidden shadow-sm">
                  {currentUser.avatarUrl ? (
                    <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-full h-full object-cover" />
                  ) : (
                    currentUser.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="hidden md:flex flex-col text-left">
                  <span className="font-bold text-white leading-tight max-w-[100px] truncate">
                    {currentUser.name}
                  </span>
                  <span className="text-[10px] text-amber-400/90 leading-tight">
                    {currentUser.tier === 'CRT_INSTITUTIONAL_PRO' ? 'CRT Pro' : 'Trader'}
                  </span>
                </div>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {/* Profile Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-xl border border-neutral-800 bg-[#0d0f17] shadow-2xl p-3 text-xs font-mono z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="pb-3 border-b border-neutral-800">
                    <div className="font-bold text-white text-sm truncate">{currentUser.name}</div>
                    <div className="text-[11px] text-slate-400 truncate mt-0.5">{currentUser.email}</div>
                    <div className="mt-2 flex items-center gap-1.5 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                      <span>Institutional CRT Pro Trader</span>
                    </div>
                  </div>

                  <div className="py-2.5 space-y-1 text-slate-400 text-[11px]">
                    <div className="flex items-center justify-between py-1">
                      <span>Auth Provider:</span>
                      <strong className="text-white capitalize">{currentUser.provider === 'google' ? 'Google (Gmail)' : 'Email'}</strong>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span>Preferred Broker:</span>
                      <strong className="text-amber-400">{currentUser.preferredBroker}</strong>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span>Trading Session:</span>
                      <strong className="text-slate-200">Somalia (UTC+3)</strong>
                    </div>
                  </div>

                  {/* Profile Actions */}
                  <div className="pt-2 border-t border-neutral-800 space-y-1">
                    <button
                      onClick={() => {
                        setIsDropdownOpen(false);
                        onOpenProfile();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-neutral-800/80 text-slate-200 hover:text-white transition-colors"
                    >
                      <Settings className="w-3.5 h-3.5 text-amber-400" />
                      <span>Profile & MT5 Settings</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsDropdownOpen(false);
                        onOpenSupport();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-neutral-800/80 text-slate-200 hover:text-white transition-colors"
                    >
                      <LifeBuoy className="w-3.5 h-3.5 text-amber-400" />
                      <span>Contact Support</span>
                    </button>

                    <div className="px-3 py-1 text-[10px] text-slate-500 truncate">
                      muscablii125@gmail.com
                    </div>
                  </div>

                  <div className="pt-2 border-t border-neutral-800">
                    <button
                      onClick={() => {
                        setIsDropdownOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-bold transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onOpenAuth('LOGIN')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs font-sans transition-all shadow-md active:scale-95 whitespace-nowrap"
                title="Sign in with Google (Gmail) or Email"
              >
                {/* Colored Google G Icon */}
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Sign In</span>
              </button>

              <button
                onClick={() => onOpenAuth('SIGNUP')}
                className="hidden sm:flex items-center gap-1 px-3 py-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-bold text-xs font-mono transition-colors whitespace-nowrap"
              >
                <span>Sign Up</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
