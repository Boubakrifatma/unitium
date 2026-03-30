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
  private readonly TOKEN_KEY   = 'session_token';
  private readonly USER_ID_KEY = 'session_user_id';
  private readonly USER_KEY    = 'session_user';
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  currentUser = signal<User | null>(null);

  constructor(private http: HttpClient, private router: Router) {
    // Restore user from cache on page refresh — makes guard skip fetchMe()
    if (this.isBrowser) {
      try {
        const stored = localStorage.getItem(this.USER_KEY);
        if (stored) this.currentUser.set(JSON.parse(stored));
      } catch { /* ignore corrupt data */ }
    }
  }

  login(credentials: LoginRequest): Observable<any> {
    return this.http.post<any>(`${this.API}/login`, credentials).pipe(
      tap(res => {
        // Si 2FA requis → ne pas stocker le token, juste retourner la réponse brute
        if (res.mfaRequired) return;
        this.setToken(res.token);
        this.setUserId(res.id);
        const user: User = {
          id: res.id,
          email: res.email,
          fullName: res.fullName,
          role: res.role as User['role'],
          mustChangePassword: res.mustChangePassword,
          avatarUrl: (res as any).avatarUrl ?? null
        };
        this.currentUser.set(user);
        if (this.isBrowser) localStorage.setItem(this.USER_KEY, JSON.stringify(user));
      })
    );
  }

  // ── 2FA : vérifier le code TOTP après login ───────────────────────────────
  verify2FA(userId: number, code: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API}/2fa/verify`, { userId, code }).pipe(
      tap(res => {
        this.setToken(res.token);
        this.setUserId(res.id);
        const user: User = {
          id: res.id,
          email: res.email,
          fullName: res.fullName,
          role: res.role as User['role'],
          mustChangePassword: res.mustChangePassword,
          avatarUrl: (res as any).avatarUrl ?? null
        };
        this.currentUser.set(user);
        if (this.isBrowser) localStorage.setItem(this.USER_KEY, JSON.stringify(user));
      })
    );
  }

  // ── 2FA : démarrer le setup (obtenir le secret + QR URI) ─────────────────
  setup2FA(): Observable<{ secret: string; otpAuthUri: string }> {
    return this.http.post<{ secret: string; otpAuthUri: string }>(`${this.API}/2fa/setup`, {});
  }

  // ── 2FA : activer après scan du QR + vérification du 1er code ───────────
  enable2FA(secret: string, code: string): Observable<any> {
    return this.http.post(`${this.API}/2fa/enable`, { secret, code });
  }

  // ── 2FA : désactiver (nécessite le code TOTP actuel) ─────────────────────
  disable2FA(code: string): Observable<any> {
    return this.http.post(`${this.API}/2fa/disable`, { code });
  }

  /**
   * Appelle POST /api/auth/change-password pour changer le mot de passe
   * après le premier login. Ne nécessite pas de token.
   */
  changePassword(userId: number, newPassword: string): Observable<any> {
    return this.http.post(`${this.API}/change-password`, { userId, newPassword });
  }

  logout(): void {
    this.http.post(`${this.API}/logout`, {}).subscribe();
    this.clearSession();
    this.router.navigate(['/auth/login']);
  }

  fetchMe(): Observable<AuthResponse> {
    return this.http.get<AuthResponse>(`${this.API}/me`).pipe(
      tap(res => {
        const user: User = {
          id: res.id,
          email: res.email,
          fullName: res.fullName,
          role: res.role as User['role'],
          mustChangePassword: res.mustChangePassword,
          avatarUrl: (res as any).avatarUrl ?? null
        };
        this.currentUser.set(user);
        if (this.isBrowser) localStorage.setItem(this.USER_KEY, JSON.stringify(user));
      })
    );
  }

  getToken(): string | null {
    if (!this.isBrowser) return null;
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getUserId(): number | null {
    if (!this.isBrowser) return null;
    const v = localStorage.getItem(this.USER_ID_KEY);
    return v ? Number(v) : null;
  }

  isLoggedIn(): boolean {
    return !!this.getToken() && !!this.currentUser();
  }

  private setToken(token: string): void {
    if (this.isBrowser) localStorage.setItem(this.TOKEN_KEY, token);
  }

  private setUserId(id: number): void {
    if (this.isBrowser) localStorage.setItem(this.USER_ID_KEY, String(id));
  }

  clearSession(): void {
    if (this.isBrowser) {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.USER_ID_KEY);
      localStorage.removeItem(this.USER_KEY);
    }
    this.currentUser.set(null);
  }
}
