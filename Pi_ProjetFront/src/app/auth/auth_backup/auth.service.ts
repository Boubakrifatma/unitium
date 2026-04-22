import { Injectable, signal, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { AuthResponse, LoginRequest, User } from './user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private readonly API = 'http://localhost:8084/api/auth';
  private readonly TOKEN_KEY = 'session_token';
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  currentUser = signal<User | null>(null);

  constructor(private http: HttpClient, private router: Router) {
    const token = this.getToken();
    if (token) {
      this.fetchMe().subscribe({ error: () => this.clearSession() });
    }
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API}/login`, credentials).pipe(
      tap(res => {
        this.setToken(res.token);
        this.currentUser.set({
          id: res.id,
          email: res.email,
          fullName: res.fullName,
          role: res.role as User['role']
        });
      })
    );
  }

  logout(): void {
    this.http.post(`${this.API}/logout`, {}).subscribe();
    this.clearSession();
    this.router.navigate(['/login']);
  }

  fetchMe(): Observable<AuthResponse> {
    return this.http.get<AuthResponse>(`${this.API}/me`).pipe(
      tap(res => this.currentUser.set({
        id: res.id,
        email: res.email,
        fullName: res.fullName,
        role: res.role as User['role']
      }))
    );
  }

  getToken(): string | null {
    if (!this.isBrowser) return null;
    return localStorage.getItem(this.TOKEN_KEY);
  }

  isLoggedIn(): boolean {
    return !!this.getToken() && !!this.currentUser();
  }

  private setToken(token: string): void {
    if (this.isBrowser) localStorage.setItem(this.TOKEN_KEY, token);
  }

  private clearSession(): void {
    if (this.isBrowser) localStorage.removeItem(this.TOKEN_KEY);
    this.currentUser.set(null);
  }
}
