/**
 * User Profile Modal for MUSCAB CRT PRO
 * Requirements:
 * 1. Profile picture (editable / avatar selector)
 * 2. Full name
 * 3. Email address
 * 4. Account settings (Preferred MT5 broker, Somalia UTC+3 session)
 * 5. Change password (authenticated with current password check)
 * 6. Logout button
 */

import React, { useState } from 'react';
import { UserAccount, Mt5Broker } from '../types/auth';
import { authService } from '../services/authService';
import { soundEffects } from '../services/soundEffects';
import {
  X,
  User,
  Mail,
  Lock,
  Building2,
  ShieldCheck,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Camera,
  KeyRound,
  Sliders,
  Check,
} from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount | null;
  onProfileUpdated: (user: UserAccount) => void;
  onLogout: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onProfileUpdated,
  onLogout,
}) => {
  if (!isOpen || !currentUser) return null;

  const [activeTab, setActiveTab] = useState<'PROFILE' | 'SETTINGS' | 'SECURITY'>('PROFILE');
  const [name, setName] = useState(currentUser.name);
  const [preferredBroker, setPreferredBroker] = useState<Mt5Broker>(currentUser.preferredBroker || 'OANDA_MT5');
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl || '');

  // Change password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const updated = await authService.updateProfile({
        name,
        preferredBroker,
        avatarUrl,
      });
      onProfileUpdated(updated);
      soundEffects.playAlertChime();
      setSuccessMsg('Profile settings updated successfully!');
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (newPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('New passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authService.changePassword(currentPassword, newPassword);
      soundEffects.playAlertChime();
      setSuccessMsg(res.message || 'Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  const avatarPresets = [
    'https://api.dicebear.com/7.x/initials/svg?seed=GoldTrader&backgroundColor=f59e0b&textColor=090a0f',
    'https://api.dicebear.com/7.x/initials/svg?seed=ForexMaster&backgroundColor=10b981&textColor=090a0f',
    'https://api.dicebear.com/7.x/initials/svg?seed=CRTPro&backgroundColor=06b6d4&textColor=090a0f',
    'https://api.dicebear.com/7.x/initials/svg?seed=MacroLiquidity&backgroundColor=a855f7&textColor=090a0f',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg rounded-2xl border border-neutral-800 bg-[#0c0e15] shadow-2xl overflow-hidden font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800/80 bg-neutral-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black text-sm shadow-[0_0_15px_rgba(245,158,11,0.3)]">
              M
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">User Profile & Account</h3>
              <p className="text-[11px] font-mono text-slate-400">Institutional Private Account</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1.5 mx-6 mt-4 bg-neutral-900/90 rounded-xl border border-neutral-800 text-xs font-mono">
          <button
            onClick={() => setActiveTab('PROFILE')}
            className={`flex-1 py-1.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'PROFILE'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Profile</span>
          </button>
          <button
            onClick={() => setActiveTab('SETTINGS')}
            className={`flex-1 py-1.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'SETTINGS'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Settings</span>
          </button>
          <button
            onClick={() => setActiveTab('SECURITY')}
            className={`flex-1 py-1.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'SECURITY'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Security</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Notifications */}
          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-mono flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* TAB 1: Profile Details */}
          {activeTab === 'PROFILE' && (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              {/* Profile Picture Header Card */}
              <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 flex items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-amber-500/60 shadow-lg bg-black">
                    <img
                      src={avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=f59e0b&textColor=090a0f`}
                      alt={name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow">
                    <Camera className="w-3 h-3" />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold">
                      PRO
                    </span>
                  </div>
                  <div className="text-xs font-mono text-slate-400">{currentUser.email}</div>
                  <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Verified Private Account</span>
                  </div>
                </div>
              </div>

              {/* Avatar Preset Selector */}
              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 mb-2">
                  Select Profile Avatar Preset
                </label>
                <div className="flex items-center gap-3">
                  {avatarPresets.map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setAvatarUrl(url)}
                      className={`w-10 h-10 rounded-full overflow-hidden border-2 transition-transform hover:scale-105 ${
                        avatarUrl === url ? 'border-amber-400 scale-110 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'border-neutral-700'
                      }`}
                    >
                      <img src={url} alt={`Preset ${i}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 focus:border-amber-500 text-sm text-white focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Email Address (Read-Only) */}
              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    value={currentUser.email}
                    disabled
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-neutral-900/50 border border-neutral-800 text-sm text-slate-400 cursor-not-allowed"
                  />
                </div>
                <p className="mt-1 text-[10px] font-mono text-slate-500">
                  Primary identifier registered via {currentUser.provider === 'google' ? 'Google' : 'Email'}
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs font-mono transition-all shadow-md active:scale-[0.99] disabled:opacity-50"
              >
                Save Profile Changes
              </button>
            </form>
          )}

          {/* TAB 2: Account Settings (MT5 Broker & Session Preferences) */}
          {activeTab === 'SETTINGS' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 mb-2">
                  Select Your MT5 Broker Price Feed
                </label>
                <div className="space-y-2">
                  {[
                    { id: 'OANDA_MT5', label: 'OANDA MT5', desc: '0.9 pip retail forex spread calibration & 100 oz Gold' },
                    { id: 'IC_MARKETS_MT5', label: 'IC Markets MT5', desc: '0.2 pip raw spread ECN liquidity calibration' },
                    { id: 'EXNESS_MT5', label: 'Exness MT5', desc: '0.1 pip zero spread tier pricing calibration' },
                    { id: 'BINANCE', label: 'Binance ECN', desc: 'London Good Delivery 99.99% physical gold custody' },
                  ].map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        setPreferredBroker(b.id as Mt5Broker);
                        authService.updateProfile({ preferredBroker: b.id as Mt5Broker }).then(onProfileUpdated);
                      }}
                      className={`w-full p-3 rounded-xl border text-left transition-all flex items-start justify-between gap-3 ${
                        preferredBroker === b.id
                          ? 'bg-amber-500/15 border-amber-500 text-white shadow-sm'
                          : 'bg-neutral-900/60 border-neutral-800 text-slate-400 hover:bg-neutral-900'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-sm text-white flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 text-amber-400" />
                          <span>{b.label}</span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 mt-0.5">{b.desc}</div>
                      </div>
                      {preferredBroker === b.id && <Check className="w-4 h-4 text-amber-400 shrink-0 mt-1" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Timezone Info */}
              <div className="p-3.5 rounded-xl bg-neutral-900/60 border border-neutral-800 text-xs font-mono space-y-1">
                <div className="font-bold text-slate-200">CRT Session Region</div>
                <div className="text-[11px] text-slate-400">
                  Calculated against Somalia Local Time (UTC+3) 8-period institutional session windows.
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Security & Change Password */}
          {activeTab === 'SECURITY' && (
            <form onSubmit={handleChangePassword} className="space-y-3.5">
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs font-mono text-amber-300">
                <div className="font-bold flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <span>Account Security & Password</span>
                </div>
                <p className="text-[11px] text-slate-300 mt-1">
                  Change your password anytime. If your account was authenticated with Google, you can establish an independent password here.
                </p>
              </div>

              {currentUser.provider !== 'google' && (
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                    Current Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 focus:border-amber-500 text-sm text-white focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="•••••••• (Min 6 characters)"
                    required
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 focus:border-amber-500 text-sm text-white focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 focus:border-amber-500 text-sm text-white focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs font-mono transition-all shadow-md active:scale-[0.99] disabled:opacity-50"
              >
                Update Password
              </button>
            </form>
          )}

          {/* Logout Section */}
          <div className="pt-4 border-t border-neutral-800/80 flex items-center justify-between">
            <div className="text-[11px] font-mono text-slate-500">
              Session ID: {currentUser.id.substring(0, 14)}...
            </div>
            <button
              onClick={() => {
                onLogout();
                onClose();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-bold text-xs font-mono transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
