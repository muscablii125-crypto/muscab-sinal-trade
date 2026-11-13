/**
 * Full-Stack Server for MUSCAB CRT PRO
 * Express server providing REST endpoints, AI strategy analysis,
 * and high-frequency WebSocket streaming for live Bid, Ask, Mid, and Spread.
 */

import express from 'express';
import type { Request, Response } from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { getAllLiveQuotes, fetchLiveCandles } from './server/liveMarketData.ts';
import {
  registerWithEmail,
  loginWithEmail,
  loginWithGoogle,
  requestPasswordReset,
  resetPasswordWithToken,
  changePassword,
  updateProfile,
  getUserByToken,
  revokeToken,
  createSupportTicket,
} from './server/authBackend.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getPort(): number {
  // Check CLI arguments (e.g. tsx server.ts --port 3000)
  const portArgIndex = process.argv.indexOf('--port');
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    const p = Number(process.argv[portArgIndex + 1]);
    if (!isNaN(p) && p > 0) return p;
  }
  // Check container DEFAULT_APP_PORT (AI Studio sets this to 3000)
  if (process.env.DEFAULT_APP_PORT) {
    const p = Number(process.env.DEFAULT_APP_PORT);
    if (!isNaN(p) && p > 0) return p;
  }
  // If in development mode, dev server must run on 3000 (nginx is on 8080)
  if (process.env.NODE_ENV !== 'production') {
    return 3000;
  }
  return Number(process.env.PORT) || 3000;
}

async function startServer() {
  const app = express();
  const PORT = getPort();

  app.use(express.json());

  // Initialize Gemini AI client if key exists
  const apiKey = process.env.GEMINI_API_KEY;
  let ai: GoogleGenAI | null = null;
  if (apiKey) {
    ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  // Health check endpoint
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      time: new Date().toISOString(),
      appName: 'MUSCAB CRT PRO',
      aiConfigured: !!ai,
    });
  });

  // Auth helper: extract authenticated user from Bearer header
  const getAuthUser = (req: Request) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.substring(7);
    return getUserByToken(token);
  };

  // 1. Sign Up with Email and Password
  app.post('/api/auth/signup', async (req: Request, res: Response) => {
    try {
      const { email, password, name, preferredBroker } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }
      const result = await registerWithEmail(email, password, name, preferredBroker);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Registration failed' });
    }
  });

  // 2. Login with Email and Password
  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }
      const result = await loginWithEmail(email, password);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Login failed' });
    }
  });

  // 3. Login / Sign Up with Google (Gmail)
  app.post('/api/auth/google', async (req: Request, res: Response) => {
    try {
      const { email, name, avatarUrl } = req.body;
      if (!email) {
        return res.status(400).json({ error: 'Google email address is required' });
      }
      const result = await loginWithGoogle(email, name, avatarUrl);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Google authentication failed' });
    }
  });

  // 4. Forgot Password - Request Reset Code
  app.post('/api/auth/forgot-password', async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: 'Email address is required' });
      }
      const result = await requestPasswordReset(email);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to process password reset request' });
    }
  });

  // 5. Reset Password with Code / Token
  app.post('/api/auth/reset-password', async (req: Request, res: Response) => {
    try {
      const { email, resetToken, newPassword } = req.body;
      if (!email || !resetToken || !newPassword) {
        return res.status(400).json({ error: 'Email, reset token, and new password are required' });
      }
      const result = await resetPasswordWithToken(email, resetToken, newPassword);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Password reset failed' });
    }
  });

  // 6. Change Password (Authenticated)
  app.post('/api/auth/change-password', async (req: Request, res: Response) => {
    try {
      const user = getAuthUser(req);
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      const { currentPassword, newPassword } = req.body;
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters' });
      }
      const result = await changePassword(user.id, currentPassword || '', newPassword);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to change password' });
    }
  });

  // 7. Get Current User Profile (Authenticated)
  app.get('/api/auth/me', (req: Request, res: Response) => {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const { passwordHash, passwordSalt, resetToken, resetTokenExpiry, ...safeUser } = user;
    res.json({ user: safeUser });
  });

  // 8. Update User Profile (Authenticated)
  app.post('/api/auth/profile', async (req: Request, res: Response) => {
    try {
      const user = getAuthUser(req);
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      const { name, avatarUrl, preferredBroker } = req.body;
      const updated = await updateProfile(user.id, { name, avatarUrl, preferredBroker });
      res.json({ user: updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to update profile' });
    }
  });

  // 9. Logout
  app.post('/api/auth/logout', (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      revokeToken(authHeader.substring(7));
    }
    res.json({ success: true, message: 'Logged out successfully' });
  });

  // 10. Official Support Ticket & Contact Endpoint (muscablii125@gmail.com)
  app.post('/api/support/ticket', async (req: Request, res: Response) => {
    try {
      const { userEmail, userName, category, subject, message, systemDiagnostics } = req.body;
      if (!userEmail || !subject || !message) {
        return res.status(400).json({ error: 'Email, subject, and message are required' });
      }
      const user = getAuthUser(req);
      const result = await createSupportTicket({
        userId: user?.id,
        userEmail,
        userName: userName || userEmail.split('@')[0],
        category: category || 'QUESTION',
        subject,
        message,
        systemDiagnostics,
      });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to submit support ticket' });
    }
  });

  // Genuine live market quotes endpoint (supports ?broker=OANDA | BINANCE)
  app.get('/api/market/quotes', async (req: Request, res: Response) => {
    try {
      const broker = (req.query.broker as 'BINANCE' | 'OANDA') || 'OANDA';
      const quotes = await getAllLiveQuotes(broker);
      res.json({
        status: 'ok',
        quotes,
        timestamp: Date.now(),
      });
    } catch (err: any) {
      res.status(500).json({ status: 'DATA_DISCONNECTED', error: 'DATA DISCONNECTED: ' + err.message });
    }
  });

  // Genuine live market candles endpoint (Monthly, Weekly, 1D, 4H, 1H, 30M, 15M, 5M)
  app.get('/api/market/candles', async (req: Request, res: Response) => {
    try {
      const symbol = ((req.query.symbol || req.query.instrument) as 'XAUUSD' | 'AUDUSD' | 'NASDAQ') || 'XAUUSD';
      const timeframe = (req.query.timeframe as string) || '5M';
      const broker = (req.query.broker as 'BINANCE' | 'OANDA') || 'OANDA';
      const dataset = await fetchLiveCandles(symbol, timeframe, broker);
      res.json(dataset);
    } catch (err: any) {
      res.status(500).json({ status: 'DATA_DISCONNECTED', error: 'DATA DISCONNECTED: ' + err.message });
    }
  });

  // Server-side AI CRT Audit endpoint
  app.post('/api/analyze-ai', async (req: Request, res: Response) => {
    const { signal } = req.body;

    if (!signal) {
      return res.status(400).json({ error: 'Missing signal payload' });
    }

    if (!ai) {
      return res.json({
        analysis: `### INSTITUTIONAL CRT STRATEGY CONFLUENCE AUDIT
**Instrument**: ${signal.instrumentName} (${signal.instrument})
**Verdict**: ${signal.verdict} (${signal.status})
**Session**: ${signal.tradingSession} (Somalia UTC+3)

---

#### 1. Macro Timeframe Alignment (Monthly & Weekly)
- **Monthly Direction**: ${signal.monthlyDirection} (Target: ${signal.takeProfit3})
- **Weekly Key Level (KL)**: ${signal.weekly.keyLevelPrice} - ${signal.weekly.priceReturnedToKL ? 'Mitigated & Held' : 'Awaiting Retest'}
- **Weekly Order Block (OB)**: ${signal.weekly.obReturnRequiredByRules ? (signal.weekly.priceReturnedToOB ? 'Mitigated' : 'Pending') : 'Return waived per strategy rules (KL return satisfied)'}

#### 2. Intermediate Setup (1H)
- **1H Purge & TS**: ${signal.hourly.purgeDetails}
- **1H OB / KL**: ${signal.hourlyConfirmation ? 'Confirmed' : 'Pending'}

#### 3. Micro Entry Execution (5M)
- **5M SMT Model 1**: ${signal.fiveMin.smtModel1Details}
- **Entry Trigger**: ${signal.fiveMin.entryTriggerDetails}

#### 4. Summary & Invalidation
- **Entry**: ${signal.entryPrice}
- **Stop Loss**: ${signal.stopLoss}
- **TP1**: ${signal.takeProfit1} (1:${signal.riskReward1})
- **TP2**: ${signal.takeProfit2} (1:${signal.riskReward2})
- **TP3**: ${signal.takeProfit3} (1:${signal.riskReward3})

*Strictly adheres to MUSCAB CRT PRO rules without extraneous indicators.*`,
      });
    }

    try {
      const prompt = `You are the master analyst for MUSCAB CRT PRO, a specialized institutional trading terminal.
Analyze this trading setup strictly using Candle Range Theory (CRT) concepts:
- Turtle Soup (TS) sweeps
- Model 1 displacement
- Order Blocks (OB)
- Key Levels (KL)
- Liquidity Purge
- SMT (Smart Money Technique) divergence across Monthly, Weekly, 1H, and 5M.

CRITICAL RULES:
- DO NOT use generic indicators, FVG, or unrelated retail ICT concepts.
- Use ONLY the provided CRT parameters and timeframes.
- Write a crisp, professional institutional trade brief.

Setup Details:
- Instrument: ${signal.instrumentName} (${signal.instrument})
- Verdict: ${signal.verdict} (${signal.status})
- Session: ${signal.tradingSession}
- Entry Price: ${signal.entryPrice}
- Stop Loss: ${signal.stopLoss}
- TP1: ${signal.takeProfit1} (1:${signal.riskReward1})
- TP2: ${signal.takeProfit2} (1:${signal.riskReward2})
- TP3: ${signal.takeProfit3} (1:${signal.riskReward3})
- Monthly: ${signal.monthlyDirection} (Target: ${signal.monthly.monthlyTarget})
- Weekly KL Retest: ${signal.weekly.priceReturnedToKL ? 'Yes' : 'No'}
- 1H Purge: ${signal.hourly.purgeDetails}
- 5M SMT Model 1: ${signal.fiveMin.smtModel1Details}
- 5M Entry Trigger: ${signal.fiveMin.entryTriggerDetails}
- Satisfied Rules: ${signal.satisfiedRules.join('; ')}
- Pending Rules: ${signal.pendingRules.join('; ')}

Format in clean markdown with sections:
1. Macro Timeframe Alignment (Monthly & Weekly)
2. Intermediate Liquidity Purge (1H)
3. Precision 5M SMT Model 1 & Entry Trigger
4. Institutional Execution & Invalidation Level
`;

      const aiResponse = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      res.json({
        analysis: aiResponse.text,
      });
    } catch (err: any) {
      console.error('Error generating AI audit:', err);
      res.status(500).json({ error: err.message || 'Failed to generate AI audit' });
    }
  });

  // Mount Vite middlewares in development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  // Create unified HTTP server
  const server = http.createServer(app);

  // Initialize WebSocket server at path /ws
  const wss = new WebSocketServer({ server, path: '/ws' });

  // Map client socket to selected broker preference
  const clientBrokers = new Map<WebSocket, 'BINANCE' | 'OANDA'>();

  wss.on('connection', async (ws: WebSocket) => {
    clientBrokers.set(ws, 'OANDA');

    // Send immediate snapshot on connect
    try {
      const initialQuotes = await getAllLiveQuotes('OANDA');
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: 'INITIAL_QUOTES',
            quotes: initialQuotes,
            timestamp: Date.now(),
            serverTimeIso: new Date().toISOString(),
          })
        );
      }
    } catch (err) {
      console.warn('[WS] Failed to send initial quotes:', err);
    }

    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'SET_BROKER' && (data.broker === 'BINANCE' || data.broker === 'OANDA')) {
          clientBrokers.set(ws, data.broker);
        } else if (data.type === 'PING') {
          ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
        }
      } catch (e) {
        // Ignore malformed client frames
      }
    });

    ws.on('close', () => {
      clientBrokers.delete(ws);
    });

    ws.on('error', () => {
      clientBrokers.delete(ws);
    });
  });

  // Continuous background WebSocket streaming loop (every 1000ms)
  setInterval(async () => {
    if (wss.clients.size === 0) return;

    try {
      // Get quotes for both broker modes
      const [oandaQuotes, binanceQuotes] = await Promise.all([
        getAllLiveQuotes('OANDA'),
        getAllLiveQuotes('BINANCE'),
      ]);

      const now = Date.now();
      const nowIso = new Date(now).toISOString();

      const oandaPayload = JSON.stringify({
        type: 'PRICE_TICK',
        quotes: oandaQuotes,
        broker: 'OANDA',
        timestamp: now,
        timestampIso: nowIso,
      });

      const binancePayload = JSON.stringify({
        type: 'PRICE_TICK',
        quotes: binanceQuotes,
        broker: 'BINANCE',
        timestamp: now,
        timestampIso: nowIso,
      });

      for (const client of wss.clients) {
        if (client.readyState === WebSocket.OPEN) {
          const preferredBroker = clientBrokers.get(client) || 'OANDA';
          client.send(preferredBroker === 'OANDA' ? oandaPayload : binancePayload);
        }
      }
    } catch (err) {
      console.warn('[WS] Streaming broadcast tick error:', err);
      // If error occurs, broadcast feed error status to prevent stale display
      const errorPayload = JSON.stringify({
        type: 'FEED_STATUS',
        status: 'DATA_DISCONNECTED',
        error: 'Market data feed disconnected',
        timestamp: Date.now(),
      });
      for (const client of wss.clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(errorPayload);
        }
      }
    }
  }, 1000);

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[MUSCAB CRT PRO] Unified HTTP & WebSocket server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
