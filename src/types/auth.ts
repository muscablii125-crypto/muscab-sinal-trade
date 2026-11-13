/**
 * User Authentication & Support System Types for MUSCAB CRT PRO
 */

export type Mt5Broker = 'OANDA_MT5' | 'BINANCE' | 'IC_MARKETS_MT5' | 'EXNESS_MT5';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  provider: 'google' | 'email';
  createdAt: number;
  lastLogin: number;
  emailVerified: boolean;
  tier: 'CRT_INSTITUTIONAL_PRO' | 'CRT_TRADER';
  preferredBroker: Mt5Broker;
}

export interface AuthState {
  user: UserAccount | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface SupportTicketSubmission {
  userEmail: string;
  userName: string;
  category: 'BUG_REPORT' | 'TECHNICAL_PROBLEM' | 'PRICE_DISCREPANCY' | 'QUESTION' | 'FEEDBACK';
  subject: string;
  message: string;
  systemDiagnostics?: {
    instrument?: string;
    broker?: string;
    timeframe?: string;
    connectionStatus?: string;
    clientTimestamp?: string;
  };
}

export interface SupportTicketResponse {
  ticket: {
    id: string;
    userEmail: string;
    userName: string;
    category: string;
    subject: string;
    message: string;
    targetEmail: string;
    createdAt: number;
    status: string;
  };
  mailtoUrl: string;
}
