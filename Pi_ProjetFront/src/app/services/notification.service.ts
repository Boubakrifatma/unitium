import { Injectable, signal, computed, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject, interval, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';

export interface DeliverableNotification {
  id: number;
  title: string;
  message: string;
  eventType: string;
  deliverableId: number | null;
  createdAt: string;
  isRead: boolean;
}

@Injectable({ providedIn: 'root' })
export class NotificationService implements OnDestroy {

  private readonly baseUrl = 'http://localhost:8084/api/deliverable-notifications';

  private _notifications = signal<DeliverableNotification[]>([]);
  readonly notifications = this._notifications.asReadonly();
  readonly unreadCount = computed(() => this._notifications().filter(n => !n.isRead).length);
  readonly unreadNotifications = computed(() => this._notifications().filter(n => !n.isRead));

  private eventSource: EventSource | null = null;
  private pollingSub: Subscription | null = null;

  /** Émet chaque nouvelle notification reçue via SSE */
  readonly newNotification$ = new Subject<DeliverableNotification>();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  /** Call this once the user is authenticated */
  connect(): void {
    const token = this.authService.getToken();
    const userId = this.authService.currentUser()?.id ?? this.authService.getUserId();
    if (!token || !userId) {
      this.disconnect();
      return;
    }

    // Reset previous streams first.
    this.disconnect();

    // Charge immédiatement + poll toutes les 10 secondes
    this.startPolling(userId);

    // Tente aussi SSE pour le temps réel
    try {
      this.eventSource = new EventSource(`${this.baseUrl}/stream?userId=${userId}`);
      this.eventSource.addEventListener('notification', (event: MessageEvent) => {
        const notif: DeliverableNotification = JSON.parse(event.data);
        const exists = this._notifications().some(n => n.id === notif.id);
        if (!exists) {
          this._notifications.update(list => [{ ...notif, isRead: false }, ...list]);
          this.newNotification$.next({ ...notif, isRead: false });
        }
      });

      this.eventSource.onerror = () => {
        // Keep polling active as fallback when SSE stream fails (e.g. 401/CORS/proxy).
        if (this.eventSource) {
          this.eventSource.close();
          this.eventSource = null;
        }
      };
    } catch (e) {
      // SSE non supporté — polling suffit
    }
  }

  private startPolling(userId: number): void {
    if (this.pollingSub) return;
    // Charge immédiatement puis toutes les 10s
    const poll = () => this.http.get<DeliverableNotification[]>(`${this.baseUrl}?userId=${userId}`)
      .subscribe({
        next: notifs => {
          const current = this._notifications();
          const newOnes = notifs.filter(n => !current.some(c => c.id === n.id));
          if (newOnes.length > 0 || current.length === 0) {
            this._notifications.set(notifs);
            newOnes.filter(n => !n.isRead).forEach(n => this.newNotification$.next(n));
          }
        },
        error: (err) => {
          if (err?.status === 401) {
            this.disconnect();
          }
        },
      });
    poll();
    this.pollingSub = interval(10000).pipe(
      switchMap(() => this.http.get<DeliverableNotification[]>(`${this.baseUrl}?userId=${userId}`))
    ).subscribe({
      next: notifs => {
        const current = this._notifications();
        const newOnes = notifs.filter(n => !current.some(c => c.id === n.id));
        if (newOnes.length > 0) {
          this._notifications.set(notifs);
          newOnes.filter(n => !n.isRead).forEach(n => this.newNotification$.next(n));
        } else {
          // Mettre à jour les statuts isRead
          this._notifications.set(notifs);
        }
      },
      error: (err) => {
        if (err?.status === 401) {
          this.disconnect();
        }
      },
    });
  }

  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    if (this.pollingSub) {
      this.pollingSub.unsubscribe();
      this.pollingSub = null;
    }
  }

  markAsRead(notificationId: number): void {
    this.http.put(`${this.baseUrl}/${notificationId}/read`, {}).subscribe({
      next: () => {
        this._notifications.update(list =>
          list.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
        );
      },
      error: () => {
        // Ignore transient/network/auth failures here; UI will refresh on next poll.
      },
    });
  }

  /** POST /api/deliverable-notifications/manager-viewed/{deliverableId}?managerId=X */
  notifyManagerViewed(deliverableId: number, managerId: number): void {
    console.log(`[notifyManagerViewed] deliverableId=${deliverableId} managerId=${managerId}`);
    this.http.post<void>(
      `${this.baseUrl}/manager-viewed/${deliverableId}?managerId=${managerId}`, {}
    ).subscribe({
      next: () => console.log('[notifyManagerViewed] OK — statut mis à jour'),
      error: e => console.error('[notifyManagerViewed] ERREUR', e)
    });
  }

  markAllAsRead(): void {
    if (!this.authService.getToken()) return;
    const userId = this.authService.currentUser()?.id ?? this.authService.getUserId();
    if (!userId) return;
    this.http.put(`${this.baseUrl}/read-all?userId=${userId}`, {}).subscribe({
      next: () => {
        this._notifications.update(list => list.map(n => ({ ...n, isRead: true })));
      },
      error: () => {
        // Keep current UI state if server update fails.
      },
    });
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
