/**
 * Price Alert Manager for MUSCAB CRT PRO
 * Allows setting custom price target alerts for XAUUSD, AUDUSD, and NASDAQ.
 * Detects threshold crossings and triggers visual toasts + audio chimes.
 */

import { InstrumentId, PriceAlert } from '../types/trading';

const STORAGE_KEY = 'muscab_price_alerts';

class PriceAlertsService {
  private alerts: PriceAlert[] = [];

  constructor() {
    this.loadAlerts();
  }

  private loadAlerts(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.alerts = JSON.parse(stored);
      } else {
        this.alerts = [];
      }
    } catch {
      this.alerts = [];
    }
  }

  private saveAlerts(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.alerts));
    } catch {
      // Ignore write errors
    }
  }

  public getAlerts(): PriceAlert[] {
    return [...this.alerts];
  }

  public getActiveAlertsCount(): number {
    return this.alerts.filter((a) => !a.triggered).length;
  }

  public addAlert(
    instrument: InstrumentId,
    targetPrice: number,
    condition: 'ABOVE' | 'BELOW',
    note?: string
  ): PriceAlert {
    const newAlert: PriceAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      instrument,
      targetPrice,
      condition,
      createdAt: Date.now(),
      triggered: false,
      note: note?.trim() || undefined,
    };

    this.alerts = [newAlert, ...this.alerts];
    this.saveAlerts();
    return newAlert;
  }

  public deleteAlert(id: string): void {
    this.alerts = this.alerts.filter((a) => a.id !== id);
    this.saveAlerts();
  }

  public clearTriggeredAlerts(): void {
    this.alerts = this.alerts.filter((a) => !a.triggered);
    this.saveAlerts();
  }

  public clearAllAlerts(): void {
    this.alerts = [];
    this.saveAlerts();
  }

  /**
   * Check live quotes against active alerts.
   * If condition satisfied, marks alert as triggered and returns all newly triggered alerts.
   */
  public checkAlerts(currentPrices: Record<InstrumentId, number>): PriceAlert[] {
    const newlyTriggered: PriceAlert[] = [];
    let stateChanged = false;

    this.alerts = this.alerts.map((alert) => {
      if (alert.triggered) return alert;

      const current = currentPrices[alert.instrument];
      if (!current || current <= 0) return alert;

      let isCrossed = false;
      if (alert.condition === 'ABOVE' && current >= alert.targetPrice) {
        isCrossed = true;
      } else if (alert.condition === 'BELOW' && current <= alert.targetPrice) {
        isCrossed = true;
      }

      if (isCrossed) {
        const triggeredAlert: PriceAlert = {
          ...alert,
          triggered: true,
          triggeredAt: Date.now(),
        };
        newlyTriggered.push(triggeredAlert);
        stateChanged = true;
        return triggeredAlert;
      }

      return alert;
    });

    if (stateChanged) {
      this.saveAlerts();
    }

    return newlyTriggered;
  }
}

export const priceAlertsService = new PriceAlertsService();
