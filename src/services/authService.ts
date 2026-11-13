/**
 * Complete Client Authentication & Support Service for MUSCAB CRT PRO
 * Communicates directly with backend Express routes:
 * - /api/auth/google
 * - /api/auth/signup
 * - /api/auth/login
 * - /api/auth/forgot-password
 * - /api/auth/reset-password
 * - /api/auth/change-password
 * - /api/auth/profile
 * - /api/auth/me
 * - /api/support/ticket
 */

import { UserAccount, Mt5Broker, SupportTicketSubmission, SupportTicketResponse } from '../types/auth';

const TOKEN_KEY = 'muscab_crt_auth_token';
const USER_KEY = 'muscab_crt_auth_user';

type AuthListener = (user: UserAccount | null) => void;

class AuthService {
  private currentUser: UserAccount | null = null;
  private token: string | null = null;
  private listeners: Set<AuthListener> = new Set();

  constructor() {
    this.init();
  }

  private init() {
    try {
      this.token = localStorage.getItem(TOKEN_KEY);
      const userRaw = localStorage.getItem(USER_KEY);
      if (userRaw) {
        this.currentUser = JSON.parse(userRaw);
      }
      if (this.token) {
        // Validate / refresh user session from backend
        this.fetchProfile().catch(() => {
          // Keep cached user if offline
        });
      }
    } catch (e) {
      console.warn('[AuthService] Init error:', e);
    }
  }

  public getCurrentUser(): UserAccount | null {
    return this.currentUser;
  }

  public getToken(): string | null {
    return this.token;
  }

  public isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  public subscribe(listener: AuthListener): () => void {
    this.listeners.add(listener);
    listener(this.currentUser);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((fn) => fn(this.currentUser));
  }

  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  /**
   * 1. Google (Gmail) Sign-In
   */
  public async loginWithGoogle(email: string = 'zoyarita188@gmail.com', name?: string, avatarUrl?: string): Promise<UserAccount> {
    const cleanEmail = email.trim().toLowerCase();
    const res = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, name, avatarUrl }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Google sign-in failed');
    }

    const data = await res.json();
    this.token = data.token;
    this.currentUser = data.user;
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    this.notify();
    return data.user;
  }

  /**
   * 2. Sign Up with Email and Password
   */
  public async signUp(
    name: string,
    email: string,
    password: string,
    preferredBroker: Mt5Broker = 'OANDA_MT5'
  ): Promise<UserAccount> {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, preferredBroker }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Registration failed');
    }

    const data = await res.json();
    this.token = data.token;
    this.currentUser = data.user;
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    this.notify();
    return data.user;
  }

  /**
   * 3. Sign In with Email and Password
   */
  public async loginWithEmail(email: string, password: string): Promise<UserAccount> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Invalid credentials');
    }

    const data = await res.json();
    this.token = data.token;
    this.currentUser = data.user;
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    this.notify();
    return data.user;
  }

  /**
   * 4. Forgot Password - Request Reset Code
   */
  public async forgotPassword(email: string): Promise<{ success: boolean; message: string; resetToken?: string }> {
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to request reset token');
    }

    return await res.json();
  }

  /**
   * 5. Reset Password using Code
   */
  public async resetPassword(email: string, resetToken: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, resetToken, newPassword }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Password reset failed');
    }

    return await res.json();
  }

  /**
   * 6. Change Password (Authenticated)
   */
  public async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update password');
    }

    return await res.json();
  }

  /**
   * 7. Fetch Profile from server
   */
  public async fetchProfile(): Promise<UserAccount | null> {
    if (!this.token) return null;
    const res = await fetch('/api/auth/me', {
      headers: this.getAuthHeaders(),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.user) {
        this.currentUser = data.user;
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        this.notify();
        return data.user;
      }
    }
    return null;
  }

  /**
   * 8. Update Profile (Name, Avatar, Preferred MT5 Broker)
   */
  public async updateProfile(updates: { name?: string; avatarUrl?: string; preferredBroker?: Mt5Broker }): Promise<UserAccount> {
    const res = await fetch('/api/auth/profile', {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(updates),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Profile update failed');
    }

    const data = await res.json();
    this.currentUser = data.user;
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    this.notify();
    return data.user;
  }

  /**
   * 9. Submit Support Ticket (Targeting muscablii125@gmail.com)
   */
  public async submitSupportTicket(ticketData: SupportTicketSubmission): Promise<SupportTicketResponse> {
    const res = await fetch('/api/support/ticket', {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(ticketData),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to submit support ticket');
    }

    return await res.json();
  }

  /**
   * 10. Logout
   */
  public async logout(): Promise<void> {
    try {
      if (this.token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: this.getAuthHeaders(),
        }).catch(() => {});
      }
    } finally {
      this.token = null;
      this.currentUser = null;
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      this.notify();
    }
  }
}

export const authService = new AuthService();
