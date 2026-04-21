import { Injectable, signal, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { AuthOrganization, AuthResponse, LoginRequest, OrganizationContext, OrganizationOption, User } from './user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private readonly API = 'http://localhost:8084/api/auth';
  private readonly TOKEN_KEY   = 'session_token';
  private readonly USER_ID_KEY = 'session_user_id';
  private readonly USER_KEY    = 'session_user';
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  currentUser = signal<User | null>(null);
  currentOrganization = signal<OrganizationContext | null>(null);

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

  /**
   * Envoie un magic link à l'adresse email (reset de mot de passe).
   */
  sendMagicLink(email: string): Observable<any> {
    return this.http.post(`${this.API}/magic-link`, { email });
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

  fetchOrganizationContext(): Observable<OrganizationContext> {
    return this.http.get<OrganizationContext>(`${this.API}/me/organization`).pipe(
      tap(org => this.currentOrganization.set(org))
    );
  }

  fetchOrganizationOptions(): Observable<OrganizationOption[]> {
    return this.http.get<OrganizationOption[]>(`${this.API}/me/organizations`).pipe(
      tap(orgs => this.setOrganizationFromOptions(orgs))
    );
  }

  getToken(): string | null {
    if (!this.isBrowser) return null;
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getUserId(): number | null {
    if (!this.isBrowser) return null;
    const raw = localStorage.getItem(this.USER_ID_KEY);
    return raw ? Number(raw) : null;
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
    this.currentOrganization.set(null);
  }

  private setOrganizationFromResponse(res: AuthResponse): void {
    const orgs = res.organizations;
    if (orgs && orgs.length > 0) {
      const first: AuthOrganization = orgs[0];
      this.currentOrganization.set({
        organizationId: first.id,
        organizationName: first.name,
        organizationSlug: first.slug,
        organizationType: first.orgType,
        membershipRole: first.memberRole,
      });
    } else {
      this.currentOrganization.set(null);
    }
  }

  private setOrganizationFromOptions(orgs: OrganizationOption[]): void {
    if (orgs && orgs.length > 0) {
      const first = orgs[0];
      this.currentOrganization.set({
        organizationId: first.organizationId,
        organizationName: first.organizationName,
        organizationSlug: first.organizationSlug,
        organizationType: first.organizationType,
        membershipRole: first.membershipRole,
      });
    }
  }
}
