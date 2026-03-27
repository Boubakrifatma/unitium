import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface RoomMemberDTO {
  id: number;
  userId: number;
  userFullName: string;
  userEmail: string;
  userRole: string;
  joinedAt: string; // ISO-8601 LocalDateTime
}

@Injectable({ providedIn: 'root' })
export class ChatRoomMemberService {
  private readonly BASE = 'http://localhost:8084/api/chat/rooms';

  constructor(private http: HttpClient) {}

  getMembers(roomId: number): Observable<RoomMemberDTO[]> {
    return this.http.get<RoomMemberDTO[]>(`${this.BASE}/${roomId}/members`);
  }

  addMember(roomId: number, userId: number): Observable<RoomMemberDTO> {
    return this.http.post<RoomMemberDTO>(`${this.BASE}/${roomId}/members`, { userId });
  }

  removeMember(roomId: number, userId: number): Observable<void> {
    return this.http.delete<void>(`${this.BASE}/${roomId}/members/${userId}`);
  }
}
