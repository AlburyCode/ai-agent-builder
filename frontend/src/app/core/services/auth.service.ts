import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { AuthResponse, User } from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  private readonly TOKEN_KEY = 'aiagentbuilder_token';
  private readonly USER_KEY = 'aiagentbuilder_user';

  private currentUser$ = new BehaviorSubject<User | null>(
    JSON.parse(localStorage.getItem('aiagentbuilder_user') || 'null')
  );

  readonly isLoggedIn$: Observable<boolean> = this.currentUser$.pipe(
    map(user => user !== null)
  );

  login(email: string, password: string): Observable<AuthResponse> {
    return this.api.post<AuthResponse>('/auth/login', { email, password }).pipe(
      tap(response => {
        localStorage.setItem(this.TOKEN_KEY, response.token);
        localStorage.setItem(this.USER_KEY, JSON.stringify(response.user));
        this.currentUser$.next(response.user);
      })
    );
  }

  register(email: string, password: string): Observable<AuthResponse> {
    return this.api.post<AuthResponse>('/auth/register', { email, password }).pipe(
      tap(response => {
        localStorage.setItem(this.TOKEN_KEY, response.token);
        localStorage.setItem(this.USER_KEY, JSON.stringify(response.user));
        this.currentUser$.next(response.user);
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUser$.next(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  get currentUser(): User | null {
    return this.currentUser$.getValue();
  }
}
