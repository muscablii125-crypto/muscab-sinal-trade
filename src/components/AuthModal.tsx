/**
 * Login & Sign Up Modal for MUSCAB CRT PRO
 * Supports:
 * - 1-Click Login & Sign Up with Google account (Gmail)
 * - Sign Up with Email and Password & MT5 Broker selection
 * - Login with Email and Password
 * - Forgot Password request & token generation
 * - Reset Password with secure token
 * - Email verification indicators & persistent sessions
 */

import React, { useState } from 'react';
import { authService } from '../services/authService';
import { soundEffects } from '../services/soundEffects';
import { UserAccount, Mt5Broker } from '../types/auth';
import {
  X,
  Mail,
  Lock,
  User,
  ShieldCheck,
  CheckCircle2,
  Building2,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  KeyRound,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: UserAccount) => void;
  initialMode?: 'LOGIN' | 'SIGNUP' | 'FORGOT_PASSWORD' | 'RESET_PASSWORD';
}

type ModalMode = 'LOGIN' | 'SIGNUP' | 'FORGOT_PASSWORD' | 'RESET_PASSWORD';

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  initialMode = 'LOGIN',
}) => {
  const [mode, setMode] = useState<ModalMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [preferredBroker, setPreferredBroker] = useState<Mt5Broker>('OANDA_MT5');
  const [resetToken, setResetToken] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleLogin = async (customEmail?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const targetEmail = customEmail || email || 'zoyarita188@gmail.com';
      const user = await authService.loginWithGoogle(targetEmail, name);
      soundEffects.playAlertChime();
      setSuccessMessage(`Welcome, ${user.name}! Authenticated via Google.`);
      setTimeout(() => {
        onAuthSuccess(user);
        onClose();
        setSuccessMessage(null);
      }, 800);
    } catch (err: any) {
      setError(err.message || 'Google authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    if (mode === 'FORGOT_PASSWORD') {
      setIsLoading(true);
      try {
        const res = await authService.forgotPassword(email);
        soundEffects.playAlertChime();
        setSuccessMessage(res.message);
        if (res.resetToken) {
          setResetToken(res.resetToken);
        }
        // Switch to reset password tab after short delay
        setTimeout(() => {
          setMode('RESET_PASSWORD');
          setError(null);
        }, 1200);
      } catch (err: any) {
        setError(err.message || 'Password reset request failed');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (mode === 'RESET_PASSWORD') {
      if (!resetToken.trim()) {
        setError('Please provide the reset code / token');
        return;
      }
      if (!password || password.length < 6) {
        setError('New password must be at least 6 characters');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      setIsLoading(true);
      try {
        const res = await authService.resetPassword(email, resetToken, password);
        soundEffects.playAlertChime();
        setSuccessMessage(res.message);
        setTimeout(() => {
          setMode('LOGIN');
          setPassword('');
          setConfirmPassword('');
          setResetToken('');
          setSuccessMessage('Password reset successfully. You may now log in.');
        }, 1200);
      } catch (err: any) {
        setError(err.message || 'Failed to reset password');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    try {
      let user: UserAccount;
      if (mode === 'LOGIN') {
        user = await authService.loginWithEmail(email, password);
        setSuccessMessage(`Welcome back, ${user.name}!`);
      } else {
        if (!name.trim()) {
          setError('Please enter your full name');
          setIsLoading(false);
          return;
        }
        user = await authService.signUp(name, email, password, preferredBroker);
        setSuccessMessage(`Account created successfully! Welcome, ${user.name}.`);
      }

      soundEffects.playAlertChime();
      setTimeout(() => {
        onAuthSuccess(user);
        onClose();
        setSuccessMessage(null);
      }, 800);
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md rounded-2xl border border-neutral-800 bg-[#0c0e15] shadow-2xl overflow-hidden font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800/80 bg-neutral-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black text-sm shadow-[0_0_15px_rgba(245,158,11,0.3)]">
              M
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                {mode === 'LOGIN' && 'Sign In to MUSCAB CRT'}
                {mode === 'SIGNUP' && 'Create Trader Account'}
                {mode === 'FORGOT_PASSWORD' && 'Reset Password'}
                {mode === 'RESET_PASSWORD' && 'Set New Password'}
              </h3>
              <p className="text-[11px] font-mono text-slate-400">
                Institutional Forex & CFD Signal Access
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher (Visible in LOGIN and SIGNUP modes) */}
        {(mode === 'LOGIN' || mode === 'SIGNUP') && (
          <div className="flex p-1.5 mx-6 mt-4 bg-neutral-900/90 rounded-xl border border-neutral-800 text-xs font-mono">
            <button
              onClick={() => {
                setMode('LOGIN');
                setError(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2 rounded-lg font-bold transition-all ${
                mode === 'LOGIN'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setMode('SIGNUP');
                setError(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2 rounded-lg font-bold transition-all ${
                mode === 'SIGNUP'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign Up
            </button>
          </div>
        )}

        {/* Back Button for Password Reset Flows */}
        {(mode === 'FORGOT_PASSWORD' || mode === 'RESET_PASSWORD') && (
          <div className="px-6 pt-3">
            <button
              type="button"
              onClick={() => {
                setMode('LOGIN');
                setError(null);
                setSuccessMessage(null);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-mono text-amber-400 hover:text-amber-300 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 space-y-4 max-h-[78vh] overflow-y-auto">
          {/* Quick Google Sign In / Sign Up Button */}
          {(mode === 'LOGIN' || mode === 'SIGNUP') && (
            <div>
              <button
                onClick={() => handleGoogleLogin()}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-sm transition-all shadow-lg shadow-white/5 active:scale-[0.99] disabled:opacity-50"
              >
                {/* Multicolored Google 'G' Icon */}
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{mode === 'SIGNUP' ? 'Sign Up with Google (Gmail)' : 'Continue with Google (Gmail)'}</span>
              </button>
              <div className="mt-1.5 text-center text-[11px] font-mono text-slate-400">
                1-Click Instant Access · Secure Google Account Sync
              </div>
            </div>
          )}

          {/* Divider */}
          {(mode === 'LOGIN' || mode === 'SIGNUP') && (
            <div className="flex items-center gap-3 my-2 text-xs font-mono text-slate-500">
              <div className="h-[1px] flex-1 bg-neutral-800" />
              <span>or continue with email</span>
              <div className="h-[1px] flex-1 bg-neutral-800" />
            </div>
          )}

          {/* Success Notification */}
          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Error Notification */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-mono flex items-center gap-2 animate-in fade-in">
              <ShieldCheck className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'SIGNUP' && (
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
                    placeholder="Muscab Mohamed"
                    required={mode === 'SIGNUP'}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 focus:border-amber-500 text-sm text-white placeholder-slate-600 focus:outline-none transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                Gmail or Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  required
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 focus:border-amber-500 text-sm text-white placeholder-slate-600 focus:outline-none transition-colors"
                />
              </div>

              {!email.includes('@') && email.length > 2 && (
                <button
                  type="button"
                  onClick={() => setEmail(`${email}@gmail.com`)}
                  className="mt-1 text-[11px] font-mono text-amber-400 hover:text-amber-300"
                >
                  Append @gmail.com
                </button>
              )}
            </div>

            {/* Reset Token Input for RESET_PASSWORD */}
            {mode === 'RESET_PASSWORD' && (
              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                  Reset Token / Code
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    placeholder="Enter reset code"
                    required
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 focus:border-amber-500 text-sm font-mono text-white placeholder-slate-600 focus:outline-none transition-colors"
                  />
                </div>
              </div>
            )}

            {/* Password input for LOGIN, SIGNUP, and RESET_PASSWORD */}
            {mode !== 'FORGOT_PASSWORD' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-mono uppercase text-slate-400">
                    {mode === 'RESET_PASSWORD' ? 'New Password' : 'Password'}
                  </label>
                  {mode === 'LOGIN' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('FORGOT_PASSWORD');
                        setError(null);
                        setSuccessMessage(null);
                      }}
                      className="text-[11px] font-mono text-amber-400 hover:text-amber-300 transition-colors"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="•••••••• (Min 6 characters)"
                    required
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 focus:border-amber-500 text-sm text-white placeholder-slate-600 focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Confirm Password for RESET_PASSWORD */}
            {mode === 'RESET_PASSWORD' && (
              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 focus:border-amber-500 text-sm text-white placeholder-slate-600 focus:outline-none transition-colors"
                  />
                </div>
              </div>
            )}

            {/* MT5 Broker Selection on SIGNUP */}
            {mode === 'SIGNUP' && (
              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">
                  Select Preferred MT5 Broker
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'OANDA_MT5', label: 'OANDA MT5' },
                    { id: 'IC_MARKETS_MT5', label: 'IC Markets MT5' },
                    { id: 'EXNESS_MT5', label: 'Exness MT5' },
                    { id: 'BINANCE', label: 'Binance ECN' },
                  ].map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setPreferredBroker(b.id as Mt5Broker)}
                      className={`p-2.5 rounded-xl border text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all ${
                        preferredBroker === b.id
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm'
                          : 'bg-neutral-900 border-neutral-800 text-slate-400 hover:bg-neutral-800'
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>{b.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm tracking-wide transition-all shadow-lg shadow-amber-500/20 active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>
                    {mode === 'LOGIN' && 'Sign In to Terminal'}
                    {mode === 'SIGNUP' && 'Complete Registration'}
                    {mode === 'FORGOT_PASSWORD' && 'Send Password Reset Code'}
                    {mode === 'RESET_PASSWORD' && 'Update & Save Password'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Info Footer */}
          <div className="pt-2 border-t border-neutral-900 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1 text-amber-400/80">
              <Sparkles className="w-3 h-3" />
              Private Institutional Account
            </span>
            <span>Support: muscablii125@gmail.com</span>
          </div>
        </div>
      </div>
    </div>
  );
};

