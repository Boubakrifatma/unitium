import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type RoomType = 'general' | 'task_thread' | 'deliverable_review' | 'private_room' | 'meeting';

export interface ChatRoomDTO {
  id: number;
  projectId: string;
  name: string;
  description?: string;
  roomType: RoomType;
  createdById: number;
  createdByName: string;
  startTime?: string;
  endTime?: string;
  meetingLink?: string;
}

export interface ChatRoomRequest {
  name: string;
  description?: string;
  roomType: RoomType;
  projectId: string;
  startTime?: string;
  endTime?: string;
  meetingLink?: string;
}

export interface ProjectDTO {
  id: string; // UUID
  name: string;
}

// Backwards-compat aliases used by chat.component.ts
export type ChatRoom = ChatRoomDTO;
export type ChatRoomPayload = ChatRoomRequest;

@Injectable({ providedIn: 'root' })
export class ChatRoomService {
  private readonly API = 'http://localhost:8084/api/chat/rooms';
  private readonly PROJECTS_API = 'http://localhost:8084/api/projects';

  constructor(private http: HttpClient) {}

  getProjects(): Observable<ProjectDTO[]> {
    return this.http.get<ProjectDTO[]>(this.PROJECTS_API);
  }

  getRooms(): Observable<ChatRoomDTO[]> {
    return this.http.get<ChatRoomDTO[]>(this.API);
  }

  createRoom(payload: ChatRoomRequest): Observable<ChatRoomDTO> {
    return this.http.post<ChatRoomDTO>(this.API, payload);
  }

  updateRoom(id: number, payload: ChatRoomRequest): Observable<ChatRoomDTO> {
    return this.http.put<ChatRoomDTO>(`${this.API}/${id}`, payload);
  }

  deleteRoom(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API}/${id}`);
  }

  getMyRooms(): Observable<ChatRoomDTO[]> {
    return this.http.get<ChatRoomDTO[]>('http://localhost:8084/api/chat/members/my-rooms');
  }

  // ── Dashboard API ────────────────────────────────────────────────────
  private readonly DASH = 'http://localhost:8084/api/chat/dashboard';

  getDashboardOverview(): Observable<any> {
    return this.http.get<any>(`${this.DASH}/overview`);
  }

  getDashboardMembers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.DASH}/members`);
  }

  getDashboardRooms(): Observable<any[]> {
    return this.http.get<any[]>(`${this.DASH}/rooms`);
  }

  getDashboardActivity(): Observable<any[]> {
    return this.http.get<any[]>(`${this.DASH}/activity`);
  }

  getDashboardChart(): Observable<any[]> {
    return this.http.get<any[]>(`${this.DASH}/chart`);
  }

  getDashboardLeaderboard(): Observable<any[]> {
    return this.http.get<any[]>(`${this.DASH}/leaderboard`);
  }
}