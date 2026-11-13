/**
 * Support System Modal for MUSCAB CRT PRO
 * Official Support Email: muscablii125@gmail.com
 * Allows users to report bugs, technical problems, ask questions, and send feedback.
 * Includes direct email launcher (mailto:muscablii125@gmail.com) and ticket logger.
 */

import React, { useState } from 'react';
import { authService } from '../services/authService';
import { soundEffects } from '../services/soundEffects';
import { UserAccount, SupportTicketSubmission } from '../types/auth';
import {
  X,
  LifeBuoy,
  Mail,
  Copy,
  Check,
  ExternalLink,
  Bug,
  HelpCircle,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Send,
  Cpu,
} from 'lucide-react';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount | null;
  currentDiagnostics?: {
    instrument?: string;
    broker?: string;
    timeframe?: string;
    connectionStatus?: string;
  };
}

export const SupportModal: React.FC<SupportModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  currentDiagnostics,
}) => {
  if (!isOpen) return null;

  const OFFICIAL_SUPPORT_EMAIL = 'muscablii125@gmail.com';

  const [category, setCategory] = useState<SupportTicketSubmission['category']>('BUG_REPORT');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [name, setName] = useState(currentUser?.name || '');
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticketSuccess, setTicketSuccess] = useState<{ id: string; mailtoUrl: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(OFFICIAL_SUPPORT_EMAIL);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleDirectEmail = () => {
    const mailto = `mailto:${OFFICIAL_SUPPORT_EMAIL}?subject=${encodeURIComponent(
      '[MUSCAB CRT PRO] Support Request'
    )}&body=${encodeURIComponent(
      `Hello Muscab Support Team,\n\nI need assistance with:\n\n---\nSystem info: ${currentDiagnostics?.instrument || 'N/A'}, ${currentDiagnostics?.broker || 'N/A'}`
    )}`;
    window.location.href = mailto;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email || !email.includes('@')) {
      setErrorMsg('Please provide a valid contact email');
      return;
    }
    if (!subject.trim()) {
      setErrorMsg('Please specify a subject');
      return;
    }
    if (!message.trim()) {
      setErrorMsg('Please describe the problem or question in detail');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await authService.submitSupportTicket({
        userEmail: email,
        userName: name || email.split('@')[0],
        category,
        subject,
        message,
        systemDiagnostics: {
          instrument: currentDiagnostics?.instrument,
          broker: currentDiagnostics?.broker,
          timeframe: currentDiagnostics?.timeframe,
          connectionStatus: currentDiagnostics?.connectionStatus,
          clientTimestamp: new Date().toISOString(),
        },
      });

      soundEffects.playAlertChime();
      setTicketSuccess({ id: res.ticket.id, mailtoUrl: res.mailtoUrl });

      // Trigger user's email client with pre-filled content
      setTimeout(() => {
        if (res.mailtoUrl) {
          window.location.href = res.mailtoUrl;
        }
      }, 600);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit support ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-xl rounded-2xl border border-neutral-800 bg-[#0c0e15] shadow-2xl overflow-hidden font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800/80 bg-neutral-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
              <LifeBuoy className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">Help & Technical Support</h3>
              <p className="text-[11px] font-mono text-slate-400">MUSCAB CRT PRO Engineering Team</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Official Support Email Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/30 via-neutral-900 to-neutral-900 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold block">
                Official Support Email
              </span>
              <div className="text-base font-mono font-extrabold text-white flex items-center gap-2">
                <Mail className="w-4 h-4 text-amber-400" />
                <span>{OFFICIAL_SUPPORT_EMAIL}</span>
              </div>
              <p className="text-[11px] font-mono text-slate-400">
                Direct engineer response for bugs, strategy, and broker feeds.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleCopyEmail}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-slate-300 font-mono text-xs transition-colors"
                title="Copy support email"
              >
                {copiedEmail ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                <span>{copiedEmail ? 'Copied' : 'Copy'}</span>
              </button>

              <button
                onClick={handleDirectEmail}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold font-mono text-xs transition-all shadow-md active:scale-95"
                title="Launch email to muscablii125@gmail.com"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Email</span>
              </button>
            </div>
          </div>

          {/* Ticket Success Banner */}
          {ticketSuccess ? (
            <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-xs font-mono space-y-2 animate-in fade-in">
              <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>Support Ticket Logged: {ticketSuccess.id}</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                Your report has been securely registered with our engineering desk and dispatched to{' '}
                <strong className="text-white">{OFFICIAL_SUPPORT_EMAIL}</strong>. If your email client did not automatically launch, you can click below:
              </p>
              <div className="pt-2 flex items-center gap-2">
                <a
                  href={ticketSuccess.mailtoUrl}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-all text-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Send Email in Mail App</span>
                </a>
                <button
                  onClick={() => setTicketSuccess(null)}
                  className="px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-slate-400 hover:text-white"
                >
                  Submit Another
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-mono flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Category Selector */}
              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">
                  Issue / Inquiry Category
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'BUG_REPORT', label: 'Report Bug', icon: Bug },
                    { id: 'TECHNICAL_PROBLEM', label: 'Technical Problem', icon: AlertTriangle },
                    { id: 'PRICE_DISCREPANCY', label: 'Price Feed Issue', icon: Cpu },
                    { id: 'QUESTION', label: 'Strategy Question', icon: HelpCircle },
                    { id: 'FEEDBACK', label: 'Feedback & Ideas', icon: MessageSquare },
                  ].map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id as any)}
                        className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2 text-xs font-mono ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                            : 'bg-neutral-900/60 border-neutral-800 text-slate-400 hover:bg-neutral-900 hover:text-slate-200'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Name and Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Trader Name"
                    className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 focus:border-amber-500 text-sm text-white focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                    Your Email (For Reply)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@gmail.com"
                    required
                    className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 focus:border-amber-500 text-sm text-white focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. AUD/USD MT5 Price latency or Chart Ray drawing question"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 focus:border-amber-500 text-sm text-white focus:outline-none transition-colors"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                  Description / Details
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  placeholder="Describe what occurred, any specific steps, or questions about the CRT engine..."
                  required
                  className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 focus:border-amber-500 text-sm text-white focus:outline-none transition-colors resize-none"
                />
              </div>

              {/* System Diagnostics Info Bar */}
              <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800 text-[11px] font-mono text-slate-400 flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <Cpu className="w-3.5 h-3.5 text-amber-400" />
                  <span>Auto-Attached Diagnostics:</span>
                </span>
                <span className="text-slate-400">
                  {currentDiagnostics?.instrument || 'AUDUSD'} · {currentDiagnostics?.broker || 'OANDA MT5'} · {currentDiagnostics?.timeframe || '5M'}
                </span>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm tracking-wide transition-all shadow-lg shadow-amber-500/20 active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>Submit Ticket & Open Email ({OFFICIAL_SUPPORT_EMAIL})</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
