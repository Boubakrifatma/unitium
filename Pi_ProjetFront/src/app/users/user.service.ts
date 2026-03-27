import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface UserDTO {
  id: number;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  avatarUrl: string | null;
  createdAt: string;
  orgType?: 'enterprise' | 'academic';
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);
  private base = 'http://localhost:8084/api/users';

  getAll(): Observable<UserDTO[]> {
    return this.http.get<UserDTO[]>(this.base);
  }

  create(body: { fullName: string; email: string; password: string; role: string }): Observable<UserDTO> {
    return this.http.post<UserDTO>(this.base, body);
  }

  getById(id: number): Observable<UserDTO> {
    return this.http.get<UserDTO>(`${this.base}/${id}`);
  }

  update(id: number, body: { fullName?: string; email?: string; avatarUrl?: string }): Observable<UserDTO> {
    return this.http.put<UserDTO>(`${this.base}/${id}`, body);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.base}/${id}`);
  }

  changeRole(id: number, role: string): Observable<UserDTO> {
    return this.http.patch<UserDTO>(`${this.base}/${id}/role`, { role });
  }

  changeStatus(id: number, isActive: boolean): Observable<UserDTO> {
    return this.http.patch<UserDTO>(`${this.base}/${id}/status`, { isActive });
  }
}
