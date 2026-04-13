import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, BehaviorSubject, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';

export interface ReactionDTO {
  emoji: string;
  userId: number;
}

// ── Scheduled Messages ────────────────────────────────────────────────────
export interface ScheduledMessageDTO {
  id: number;
  roomId: number;
  roomName: string;
  senderId: number;
  senderName: string;
  content: string;
  scheduledAt: string;
  nextSendAt: string;
  recurrenceType: 'ONCE' | 'DAILY' | 'WEEKDAYS' | 'WEEKLY' | 'CUSTOM';
  recurrenceDays: string[];
  status: 'PENDING' | 'SENT' | 'CANCELLED' | 'FAILED';
  createdAt: string;
}

export interface ScheduledPayload {
  content: string;
  scheduledAt: string;
  recurrenceType: 'ONCE' | 'DAILY' | 'WEEKDAYS' | 'WEEKLY' | 'CUSTOM';
  recurrenceDays?: string[];
}

export interface ScheduledRoomEvent {
  type: 'CANCELLED';
  scheduledMessageId: number;
}

export interface ScheduledNotificationEvent {
  type: 'SCHEDULED_SENT' | 'SCHEDULED_REMINDER' | 'SCHEDULED_FAILED';
  roomId: number;
  roomName: string;
  messagePreview: string;
  sentAt?: string;
  nextSendAt?: string;
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
  // shared content fields
  category?: 'IMAGE' | 'FILE' | 'LINK';
  extractedUrl?: string;
  deleted?: boolean;
  isSystemMessage?: boolean;
  isEdited?: boolean;
  isAgendaItem?: boolean;
  agendaDuration?: number;
  agendaOrder?: number;
  agendaDone?: boolean;
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

  /** REST: get all shared content (images, files, links) for a room. */
  getSharedContent(roomId: number): Observable<MessageDTO[]> {
    return this.http.get<MessageDTO[]>(
      `${this.BASE_URL}/api/chat/rooms/${roomId}/shared`,
    );
  }

  /** REST: edit a message's content. */
  editMessage(roomId: number, messageId: number, content: string): Observable<any> {
    return this.http.put<any>(
      `${this.BASE_URL}/api/chat/rooms/${roomId}/messages/${messageId}`,
      { content },
    );
  }

  /** REST: delete a message. */
  deleteMessage(roomId: number, messageId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.BASE_URL}/api/chat/rooms/${roomId}/messages/${messageId}`,
    );
  }

  // ── Scheduled Messages REST ──────────────────────────────────────────────

  /** GET all pending scheduled messages for a room. */
  getScheduledMessages(roomId: number): Observable<ScheduledMessageDTO[]> {
    return this.http.get<ScheduledMessageDTO[]>(
      `${this.BASE_URL}/api/chat/rooms/${roomId}/scheduled`,
    );
  }

  /** POST create a new scheduled message. */
  createScheduled(roomId: number, body: ScheduledPayload): Observable<ScheduledMessageDTO> {
    return this.http.post<ScheduledMessageDTO>(
      `${this.BASE_URL}/api/chat/rooms/${roomId}/scheduled`, body,
    );
  }

  /** PUT update an existing scheduled message. */
  updateScheduled(roomId: number, id: number, body: ScheduledPayload): Observable<ScheduledMessageDTO> {
    return this.http.put<ScheduledMessageDTO>(
      `${this.BASE_URL}/api/chat/rooms/${roomId}/scheduled/${id}`, body,
    );
  }

  /** DELETE cancel a scheduled message. */
  deleteScheduled(roomId: number, id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.BASE_URL}/api/chat/rooms/${roomId}/scheduled/${id}`,
    );
  }

  // ── Scheduled Messages WebSocket ─────────────────────────────────────────

  /** Subscribe to room-level scheduled events (CANCELLED). */
  subscribeToScheduled(roomId: number): Observable<ScheduledRoomEvent> {
    return new Observable<ScheduledRoomEvent>(observer => {
      let stompSub: StompSubscription | null = null;
      const doSubscribe = () => {
        stompSub?.unsubscribe();
        stompSub = this.client.subscribe(
          `/topic/rooms/${roomId}/scheduled`,
          (msg: IMessage) => {
            try { observer.next(JSON.parse(msg.body) as ScheduledRoomEvent); } catch { /* ignore */ }
          },
        );
      };
      if (this.client?.connected) doSubscribe();
      const reconnectSub = this.connect$.subscribe(() => doSubscribe());
      return () => { stompSub?.unsubscribe(); reconnectSub.unsubscribe(); };
    });
  }

  /** Subscribe to user-scoped scheduled notification events (SENT / REMINDER / FAILED). */
  subscribeToUserNotifications(userId: number): Observable<ScheduledNotificationEvent> {
    return new Observable<ScheduledNotificationEvent>(observer => {
      let stompSub: StompSubscription | null = null;
      const doSubscribe = () => {
        stompSub?.unsubscribe();
        stompSub = this.client.subscribe(
          `/topic/notifications/${userId}`,
          (msg: IMessage) => {
            try { observer.next(JSON.parse(msg.body) as ScheduledNotificationEvent); } catch { /* ignore */ }
          },
        );
      };
      if (this.client?.connected) doSubscribe();
      const reconnectSub = this.connect$.subscribe(() => doSubscribe());
      return () => { stompSub?.unsubscribe(); reconnectSub.unsubscribe(); };
    });
  }

  /** Client-side only: translate text to English via Google Translate (no API key, auto-detects source language). */
  translateMessage(text: string): Observable<string> {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(text)}`;
    return this.http.get<any>(url).pipe(
      map(res => {
        // Response shape: [ [ ["translated","original",...], ... ], null, "detectedLang", ... ]
        const segments: string[] = (res[0] as any[]).map((seg: any) => seg[0] ?? '');
        const translated = segments.join('').trim();
        if (!translated) throw new Error('Translation unavailable');
        return translated;
      })
    );
  }

  /** REST: get all agenda items for a meeting room. */
  getAgendaItems(roomId: number): Observable<MessageDTO[]> {
    return this.http.get<MessageDTO[]>(
      `${this.BASE_URL}/api/chat/rooms/${roomId}/agenda`,
    );
  }

  /** REST: toggle agenda item done/undone. */
  toggleAgendaDone(roomId: number, messageId: number): Observable<any> {
    return this.http.patch<any>(
      `${this.BASE_URL}/api/chat/rooms/${roomId}/agenda/${messageId}/done`, {},
    );
  }

  /** REST: get all pinned messages in a room. */
  getPinnedMessages(roomId: number): Observable<MessageDTO[]> {
    return this.http.get<MessageDTO[]>(
      `${this.BASE_URL}/api/chat/rooms/${roomId}/messages/pinned`,
    );
  }

  private readonly GEMINI_API_KEY = 'AIzaSyDClEW2bKNcYKSpLEXuMh2vtDMmRa2vPz4';
  private readonly GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.GEMINI_API_KEY}`;

  /** Call Gemini via native fetch to bypass Angular interceptors. */
  private geminiPost(prompt: string): Observable<string> {
    return from(
      fetch(this.GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }).then(async res => {
        if (!res.ok) {
          const body = await res.text();
          throw new Error(`Gemini ${res.status}: ${body}`);
        }
        const json = await res.json();
        const text: string = json?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error('Gemini returned empty response');
        return text;
      })
    );
  }

  /** Summarize a consecutive group of messages using Gemini. */
  summarizeGroup(prompt: string): Observable<string> {
    return this.geminiPost(prompt);
  }

  /** Summarize a full conversation using Gemini. */
  summarizeMessages(messages: any[]): Observable<string> {
    const stripHtml = (html: string) => html?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() ?? '';
    const conversation = messages
      .filter(m => !m.isSystemMessage && !m.isAgendaItem && m.contentText)
      .slice(-50)
      .map(m => `${m.senderName}: ${stripHtml(m.contentText)}`)
      .filter(line => line.trim().length > 0)
      .join('\n');

    const prompt = `You are a professional meeting assistant. Summarize the following chat conversation in a clear, structured format with:
- A one-sentence overview
- 3-5 key discussion points as bullet points
- Any action items or decisions mentioned
- Overall sentiment (positive/neutral/concerns)

Keep it concise and professional.

Conversation:
${conversation}`;

    return this.geminiPost(prompt);
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
