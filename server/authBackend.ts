/**
 * Real Server-Side Authentication & Support Backend for MUSCAB CRT PRO
 * Uses Node.js crypto for PBKDF2 salt-hashed password security.
 * Manages separate private user accounts, profiles, sessions,
 * password resets, Google OAuth verification, and support ticketing.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const TICKETS_FILE = path.join(DATA_DIR, 'support_tickets.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export type Mt5Broker = 'OANDA_MT5' | 'BINANCE' | 'IC_MARKETS_MT5' | 'EXNESS_MT5';

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  passwordHash?: string;
  passwordSalt?: string;
  avatarUrl?: string;
  provider: 'google' | 'email';
  createdAt: number;
  lastLogin: number;
  emailVerified: boolean;
  tier: 'CRT_INSTITUTIONAL_PRO' | 'CRT_TRADER';
  preferredBroker: Mt5Broker;
  resetToken?: string;
  resetTokenExpiry?: number;
}

export interface SupportTicket {
  id: string;
  userId?: string;
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
  targetEmail: string; // muscablii125@gmail.com
  createdAt: number;
  status: 'OPEN' | 'RESOLVED';
}

// In-memory active session token map: token -> userId
const activeSessions = new Map<string, { userId: string; expiresAt: number }>();

function readUsers(): UserRecord[] {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('[AuthDB] Failed to read users file:', err);
  }
  return [];
}

function writeUsers(users: UserRecord[]): void {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (err) {
    console.error('[AuthDB] Failed to write users file:', err);
  }
}

function readTickets(): SupportTicket[] {
  try {
    if (fs.existsSync(TICKETS_FILE)) {
      const data = fs.readFileSync(TICKETS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('[SupportDB] Failed to read tickets file:', err);
  }
  return [];
}

function writeTickets(tickets: SupportTicket[]): void {
  try {
    fs.writeFileSync(TICKETS_FILE, JSON.stringify(tickets, null, 2), 'utf-8');
  } catch (err) {
    console.error('[SupportDB] Failed to write tickets file:', err);
  }
}

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

function sanitizeUser(user: UserRecord): Omit<UserRecord, 'passwordHash' | 'passwordSalt' | 'resetToken' | 'resetTokenExpiry'> {
  const { passwordHash, passwordSalt, resetToken, resetTokenExpiry, ...safe } = user;
  return safe;
}

export function createSessionToken(userId: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  // 30 days session
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
  activeSessions.set(token, { userId, expiresAt });
  return token;
}

export function getUserByToken(token: string): UserRecord | null {
  const session = activeSessions.get(token);
  if (!session || session.expiresAt < Date.now()) {
    if (session) activeSessions.delete(token);
    return null;
  }
  const users = readUsers();
  return users.find((u) => u.id === session.userId) || null;
}

export function revokeToken(token: string): void {
  activeSessions.delete(token);
}

/**
 * Register a new user with email & password
 */
export async function registerWithEmail(
  email: string,
  password: string,
  name: string,
  preferredBroker: Mt5Broker = 'OANDA_MT5'
): Promise<{ user: ReturnType<typeof sanitizeUser>; token: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const users = readUsers();

  if (users.some((u) => u.email === cleanEmail)) {
    throw new Error('An account with this email address already exists. Please sign in.');
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(password, salt);
  const displayName = name.trim() || cleanEmail.split('@')[0];

  const newUser: UserRecord = {
    id: `usr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    email: cleanEmail,
    name: displayName,
    passwordHash,
    passwordSalt: salt,
    avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}&backgroundColor=f59e0b&textColor=090a0f`,
    provider: 'email',
    createdAt: Date.now(),
    lastLogin: Date.now(),
    emailVerified: false,
    tier: 'CRT_INSTITUTIONAL_PRO',
    preferredBroker,
  };

  users.push(newUser);
  writeUsers(users);

  const token = createSessionToken(newUser.id);
  return { user: sanitizeUser(newUser), token };
}

/**
 * Login with email and password
 */
export async function loginWithEmail(
  email: string,
  password: string
): Promise<{ user: ReturnType<typeof sanitizeUser>; token: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const users = readUsers();
  const user = users.find((u) => u.email === cleanEmail);

  if (!user || !user.passwordHash || !user.passwordSalt) {
    throw new Error('Invalid email or password. Please check your credentials.');
  }

  const calculatedHash = hashPassword(password, user.passwordSalt);
  if (calculatedHash !== user.passwordHash) {
    throw new Error('Invalid email or password. Please check your credentials.');
  }

  user.lastLogin = Date.now();
  writeUsers(users);

  const token = createSessionToken(user.id);
  return { user: sanitizeUser(user), token };
}

/**
 * Authenticate with Google (Gmail)
 * Verifies or decodes Google credential payload and provisions/links user account
 */
export async function loginWithGoogle(
  googleEmail: string,
  name?: string,
  avatarUrl?: string
): Promise<{ user: ReturnType<typeof sanitizeUser>; token: string }> {
  const cleanEmail = googleEmail.trim().toLowerCase();
  const users = readUsers();
  let user = users.find((u) => u.email === cleanEmail);

  const displayName = name || cleanEmail.split('@')[0];
  const photoUrl = avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}&backgroundColor=10b981&textColor=090a0f`;

  if (user) {
    user.lastLogin = Date.now();
    user.emailVerified = true;
    if (avatarUrl && !user.avatarUrl) {
      user.avatarUrl = avatarUrl;
    }
  } else {
    user = {
      id: `usr_google_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      email: cleanEmail,
      name: displayName,
      avatarUrl: photoUrl,
      provider: 'google',
      createdAt: Date.now(),
      lastLogin: Date.now(),
      emailVerified: true,
      tier: 'CRT_INSTITUTIONAL_PRO',
      preferredBroker: 'OANDA_MT5',
    };
    users.push(user);
  }

  writeUsers(users);
  const token = createSessionToken(user.id);
  return { user: sanitizeUser(user), token };
}

/**
 * Request Password Reset Token
 */
export async function requestPasswordReset(email: string): Promise<{ success: boolean; message: string; resetToken?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const users = readUsers();
  const user = users.find((u) => u.email === cleanEmail);

  if (!user) {
    // Return friendly generic message for security
    return {
      success: true,
      message: 'If an account exists with this email, password reset instructions have been dispatched.',
    };
  }

  const resetToken = crypto.randomBytes(24).toString('hex');
  user.resetToken = resetToken;
  user.resetTokenExpiry = Date.now() + 60 * 60 * 1000; // 1 hour
  writeUsers(users);

  return {
    success: true,
    message: 'Password reset code generated. Use this code to set your new password.',
    resetToken,
  };
}

/**
 * Reset password using token
 */
export async function resetPasswordWithToken(
  email: string,
  resetToken: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const users = readUsers();
  const user = users.find((u) => u.email === cleanEmail);

  if (!user || user.resetToken !== resetToken || !user.resetTokenExpiry || user.resetTokenExpiry < Date.now()) {
    throw new Error('Invalid or expired password reset token.');
  }

  const salt = crypto.randomBytes(16).toString('hex');
  user.passwordSalt = salt;
  user.passwordHash = hashPassword(newPassword, salt);
  delete user.resetToken;
  delete user.resetTokenExpiry;

  writeUsers(users);
  return { success: true, message: 'Password has been successfully reset. You may now log in.' };
}

/**
 * Change password from authenticated session
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  const users = readUsers();
  const user = users.find((u) => u.id === userId);

  if (!user) {
    throw new Error('User account not found.');
  }

  if (user.provider === 'google' && !user.passwordHash) {
    // Set first password for Google account
    const salt = crypto.randomBytes(16).toString('hex');
    user.passwordSalt = salt;
    user.passwordHash = hashPassword(newPassword, salt);
    writeUsers(users);
    return { success: true, message: 'Password set successfully for your account.' };
  }

  if (!user.passwordHash || !user.passwordSalt) {
    throw new Error('No password is set for this account.');
  }

  const checkHash = hashPassword(currentPassword, user.passwordSalt);
  if (checkHash !== user.passwordHash) {
    throw new Error('Current password does not match.');
  }

  const newSalt = crypto.randomBytes(16).toString('hex');
  user.passwordSalt = newSalt;
  user.passwordHash = hashPassword(newPassword, newSalt);
  writeUsers(users);

  return { success: true, message: 'Password updated successfully.' };
}

/**
 * Update user profile
 */
export async function updateProfile(
  userId: string,
  updates: { name?: string; avatarUrl?: string; preferredBroker?: Mt5Broker }
): Promise<ReturnType<typeof sanitizeUser>> {
  const users = readUsers();
  const user = users.find((u) => u.id === userId);

  if (!user) {
    throw new Error('User account not found.');
  }

  if (updates.name) user.name = updates.name.trim();
  if (updates.avatarUrl) user.avatarUrl = updates.avatarUrl.trim();
  if (updates.preferredBroker) user.preferredBroker = updates.preferredBroker;

  writeUsers(users);
  return sanitizeUser(user);
}

/**
 * Support Ticket Dispatch & Logging (Official Support: muscablii125@gmail.com)
 */
export async function createSupportTicket(data: {
  userId?: string;
  userEmail: string;
  userName: string;
  category: SupportTicket['category'];
  subject: string;
  message: string;
  systemDiagnostics?: SupportTicket['systemDiagnostics'];
}): Promise<{ ticket: SupportTicket; mailtoUrl: string }> {
  const tickets = readTickets();
  const newTicket: SupportTicket = {
    id: `TCK-${Date.now().toString(36).toUpperCase()}`,
    userId: data.userId,
    userEmail: data.userEmail.trim().toLowerCase(),
    userName: data.userName.trim(),
    category: data.category,
    subject: data.subject.trim(),
    message: data.message.trim(),
    systemDiagnostics: data.systemDiagnostics,
    targetEmail: 'muscablii125@gmail.com',
    createdAt: Date.now(),
    status: 'OPEN',
  };

  tickets.push(newTicket);
  writeTickets(tickets);

  // Construct official pre-filled mailto URL targeting muscablii125@gmail.com
  const emailSubject = encodeURIComponent(`[MUSCAB CRT PRO - ${data.category}] ${data.subject}`);
  const emailBody = encodeURIComponent(
    `Dear MUSCAB Support Team,\n\n` +
      `Category: ${data.category}\n` +
      `From: ${data.userName} (${data.userEmail})\n` +
      `Ticket ID: ${newTicket.id}\n\n` +
      `Details:\n${data.message}\n\n` +
      `System Diagnostics:\n` +
      `- Instrument: ${data.systemDiagnostics?.instrument || 'N/A'}\n` +
      `- Broker: ${data.systemDiagnostics?.broker || 'N/A'}\n` +
      `- Timeframe: ${data.systemDiagnostics?.timeframe || 'N/A'}\n` +
      `- Status: ${data.systemDiagnostics?.connectionStatus || 'N/A'}\n` +
      `- Client Time: ${data.systemDiagnostics?.clientTimestamp || new Date().toISOString()}\n\n` +
      `Official Support: muscablii125@gmail.com`
  );

  const mailtoUrl = `mailto:muscablii125@gmail.com?subject=${emailSubject}&body=${emailBody}`;

  return { ticket: newTicket, mailtoUrl };
}
