import { Injectable, signal, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PaymentRequest, PaymentResponse } from '../models/billing.models';

export interface PendingPayment {
  payment: PaymentResponse;
  request: PaymentRequest;
  submittedAt: string;
}

const KEY = 'cmp_pending_payments';

@Injectable({ providedIn: 'root' })
export class PendingPaymentsService {
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  pendingPayments = signal<PendingPayment[]>([]);

  constructor() { this.load(); }

  private load() {
    if (!this.isBrowser) return;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) this.pendingPayments.set(JSON.parse(raw));
    } catch { localStorage.removeItem(KEY); }
  }

  private save() {
    if (this.isBrowser)
      localStorage.setItem(KEY, JSON.stringify(this.pendingPayments()));
  }

  addPending(payment: PaymentResponse, request: PaymentRequest) {
    const list = [...this.pendingPayments(), { payment, request, submittedAt: new Date().toISOString() }];
    this.pendingPayments.set(list);
    this.save();
  }

  accept(paymentId: string): PendingPayment | undefined {
    const item = this.pendingPayments().find(p => p.payment.paymentId === paymentId);
    this.remove(paymentId);
    return item;
  }

  reject(paymentId: string) { this.remove(paymentId); }

  private remove(paymentId: string) {
    this.pendingPayments.set(this.pendingPayments().filter(p => p.payment.paymentId !== paymentId));
    this.save();
  }
}
