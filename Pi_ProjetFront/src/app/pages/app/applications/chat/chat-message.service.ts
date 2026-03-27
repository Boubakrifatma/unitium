import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';

export interface ReactionDTO {
  emoji: string;
  userId: number;
}

export interface MessageDTO {
  id: number;
  roomId: number;
  senderId: number;
  senderName: string;
  contentText?: string;
  contentType: string;
  createdAt: string; // ISO-8601, e.g. "2026-03-27T14:32:05"
  reactions?: ReactionDTO[];
  // file attachment fields (all optional)
  fileName?: string;
  fileUrl?: string;
  fileType?: string;
  fileSize?: number;
  // pin fields
  isPinned?: boolean;
  pinnedAt?: string;
  pinnedById?: number;
  pinnedByName?: string;
}

@Injectable({ providedIn: 'root' })
export class ChatMessageService {
  private readonly BASE_URL = 'http://localhost:8084';
  private client!: Client;

  /** Fires each time the STOMP client successfully connects (or reconnects). */
  private readonly connect$ = new Subject<void>();

  /** Emits an error message when the connection is lost, empty string when it recovers. */
  readonly connectionError$ = new BehaviorSubject<string>('');

  constructor(private http: HttpClient) {}

  /**
   * Create and activate a STOMP client using native WebSocket.
   * Spring's SockJS endpoint also accepts native WS at /ws/websocket.
   * Call once after login; the client reconnects automatically.
   */
  connect(token: string): void {
    if (this.client?.active) {
      this.client.deactivate();
    }

    this.client = new Client({
      brokerURL: `ws://localhost:8084/ws/websocket`,
      connectHeaders: { Authorization: 'Bearer ' + token },
      reconnectDelay: 5000,
      onConnect: () => {
        this.connectionError$.next('');
        this.connect$.next();
      },
      onDisconnect: () => {
        this.connectionError$.next('Connection lost. Reconnecting…');
      },
      onStompError: () => {
        this.connectionError$.next('Connection lost. Reconnecting…');
      },
    });

    this.client.activate();
  }

  /**
   * Returns an Observable that emits every MessageDTO published to
   * /topic/rooms/{roomId}.  Handles initial connection and reconnects
   * transparently.  The STOMP subscription is cleaned up on unsubscribe.
   */
  subscribeToRoom(roomId: number): Observable<MessageDTO> {
    return new Observable<MessageDTO>(observer => {
      let stompSub: StompSubscription | null = null;

      const doSubscribe = () => {
        stompSub?.unsubscribe();
        stompSub = this.client.subscribe(
          `/topic/rooms/${roomId}`,
          (msg: IMessage) => {
            try {
              observer.next(JSON.parse(msg.body) as MessageDTO);
            } catch { /* ignore malformed frames */ }
          },
        );
      };

      // Subscribe immediately if already connected
      if (this.client?.connected) {
        doSubscribe();
      }

      // Re-subscribe after each (re)connect
      const reconnectSub = this.connect$.subscribe(() => doSubscribe());

      return () => {
        stompSub?.unsubscribe();
        reconnectSub.unsubscribe();
      };
    });
  }

  /**
   * Publish a message to /app/rooms/{roomId}/send.
   * The server broadcasts the persisted MessageDTO to /topic/rooms/{roomId}.
   */
  sendMessage(roomId: number, content: string): void {
    if (this.client?.connected) {
      this.client.publish({
        destination: `/app/rooms/${roomId}/send`,
        body: JSON.stringify({ content }),
      });
    }
  }

  /** Gracefully close the WebSocket. */
  disconnect(): void {
    this.client?.deactivate();
  }

  /** REST: load message history for a room. */
  getHistory(roomId: number): Observable<MessageDTO[]> {
    return this.http.get<MessageDTO[]>(
      `${this.BASE_URL}/api/chat/rooms/${roomId}/messages`,
    );
  }

  /** REST: upload a file message (multipart/form-data). */
  uploadMessage(roomId: number, formData: FormData): Observable<MessageDTO> {
    return this.http.post<MessageDTO>(
      `${this.BASE_URL}/api/chat/rooms/${roomId}/messages/upload`,
      formData,
      // Do NOT set Content-Type — browser sets it with the correct boundary
    );
  }

  /** REST: toggle an emoji reaction on a message. */
  toggleReaction(roomId: number, messageId: number, emoji: string): Observable<any> {
    return this.http.post<any>(
      `${this.BASE_URL}/api/chat/rooms/${roomId}/messages/${messageId}/reactions`,
      { emoji },
    );
  }

  /** REST: pin a message. */
  pinMessage(roomId: number, messageId: number): Observable<any> {
    return this.http.post<any>(
      `${this.BASE_URL}/api/chat/rooms/${roomId}/messages/${messageId}/pin`, {},
    );
  }

  /** REST: unpin a message. */
  unpinMessage(roomId: number, messageId: number): Observable<any> {
    return this.http.delete<any>(
      `${this.BASE_URL}/api/chat/rooms/${roomId}/messages/${messageId}/pin`,
    );
  }

  /** REST: get all pinned messages in a room. */
  getPinnedMessages(roomId: number): Observable<MessageDTO[]> {
    return this.http.get<MessageDTO[]>(
      `${this.BASE_URL}/api/chat/rooms/${roomId}/messages/pinned`,
    );
  }

  /**
   * Real-time pin updates: subscribe to /topic/rooms/{roomId}/pinned.
   * Emits a MessageDTO whenever a message is pinned or unpinned.
   */
  subscribeToPinUpdates(roomId: number): Observable<MessageDTO> {
    return new Observable<MessageDTO>(observer => {
      let stompSub: StompSubscription | null = null;

      const doSubscribe = () => {
        stompSub?.unsubscribe();
        stompSub = this.client.subscribe(
          `/topic/rooms/${roomId}/pinned`,
          (msg: IMessage) => {
            try { observer.next(JSON.parse(msg.body) as MessageDTO); } catch { /* ignore */ }
          },
        );
      };

      if (this.client?.connected) doSubscribe();
      const reconnectSub = this.connect$.subscribe(() => doSubscribe());

      return () => {
        stompSub?.unsubscribe();
        reconnectSub.unsubscribe();
      };
    });
  }
}
