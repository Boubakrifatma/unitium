import { Injectable, signal } from '@angular/core';

export interface ScheduledNotification {
  id: string;
  type: 'SCHEDULED_SENT' | 'SCHEDULED_REMINDER' | 'SCHEDULED_FAILED' | 'MEETING_REMINDER';
  icon: string;
  iconColor: string;
  message: string;
  roomId: number;
  roomName: string;
  timestamp: Date;
  read: boolean;
  nextSendAt?: string;
  originalContent?: string;
  recurrenceType?: string;
  scheduledAt?: string;
}

export interface ScheduledRetryRequest {
  content: string;
  recurrenceType: string;
  recurrenceDays?: string[];
  scheduledAt?: string;
  roomId: number;
}

@Injectable({ providedIn: 'root' })
export class ScheduledNotificationService {
  /** All received notifications, newest first. */
  notifications = signal<ScheduledNotification[]>([]);
  /** Badge count — increments on push, resets to 0 on markAllRead(). */
  unreadCount = signal<number>(0);
  /** Set by the notification panel "Retry" button; watched by ChatComponent via effect(). */
  retryRequest = signal<ScheduledRetryRequest | null>(null);
  /** True for 1 second after a new notification arrives (drives the badge pulse CSS class). */
  bellPulsing = signal<boolean>(false);

  push(n: ScheduledNotification): void {
    this.notifications.update(list => [n, ...list]);
    if (!n.read) {
      this.unreadCount.update(c => c + 1);
      this.bellPulsing.set(true);
      setTimeout(() => this.bellPulsing.set(false), 1000);
    }
  }

  markAllRead(): void {
    this.notifications.update(list => list.map(n => ({ ...n, read: true })));
    this.unreadCount.set(0);
  }

  requestRetry(req: ScheduledRetryRequest): void {
    this.retryRequest.set(req);
  }

  clearRetry(): void {
    this.retryRequest.set(null);
  }
}
