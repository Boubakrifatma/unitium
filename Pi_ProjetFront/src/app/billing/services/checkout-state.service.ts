import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CheckoutState, OrgType } from '../models/billing.models';

const CHECKOUT_KEY = 'cmp_checkout_state';

@Injectable({ providedIn: 'root' })
export class CheckoutStateService {
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  checkoutState = signal<CheckoutState | null>(null);

  constructor() {
    this.restore();
  }

  save(state: CheckoutState): void {
    this.checkoutState.set(state);
    if (this.isBrowser) {
      localStorage.setItem(CHECKOUT_KEY, JSON.stringify(state));
    }
  }

  restore(): void {
    if (!this.isBrowser) return;
    const raw = localStorage.getItem(CHECKOUT_KEY);
    if (raw) {
      try {
        this.checkoutState.set(JSON.parse(raw));
      } catch {
        localStorage.removeItem(CHECKOUT_KEY);
      }
    }
  }

  clear(): void {
    this.checkoutState.set(null);
    if (this.isBrowser) {
      localStorage.removeItem(CHECKOUT_KEY);
    }
  }

  hasState(): boolean {
    return !!this.checkoutState();
  }
}
