import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { apiBaseUrl } from './api.config';
import { AuthResponse } from './models';

const storageKey = 'fleetcar.session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly sessionState = signal<AuthResponse | null>(this.readSession());

  readonly session = this.sessionState.asReadonly();
  readonly user = computed(() => this.sessionState()?.user ?? null);
  readonly isAuthenticated = computed(() => !!this.sessionState()?.accessToken);

  login(username: string, password: string) {
    return this.http
      .post<AuthResponse>(`${apiBaseUrl}/auth/login`, { username, password })
      .pipe(tap((session) => this.persistSession(session)));
  }

  logout() {
    localStorage.removeItem(storageKey);
    this.sessionState.set(null);
    void this.router.navigate(['/login']);
  }

  accessToken() {
    return this.sessionState()?.accessToken ?? '';
  }

  hasAnyRole(roles: string[]) {
    const role = this.user()?.role;
    return !!role && roles.includes(role);
  }

  private persistSession(session: AuthResponse) {
    localStorage.setItem(storageKey, JSON.stringify(session));
    this.sessionState.set(session);
  }

  private readSession(): AuthResponse | null {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as AuthResponse;
      if (new Date(parsed.expiresAtUtc).getTime() <= Date.now()) {
        localStorage.removeItem(storageKey);
        return null;
      }

      return parsed;
    } catch {
      localStorage.removeItem(storageKey);
      return null;
    }
  }
}
