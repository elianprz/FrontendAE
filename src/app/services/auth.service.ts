import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { jwtDecode } from 'jwt-decode';
import { JwtHelperService } from '@auth0/angular-jwt';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = 'https://localhost:7182/api/Auth';
  private userRoleSubject = new BehaviorSubject<string | null>(null);

  userRole$ = this.userRoleSubject.asObservable();

  private userSubject = new BehaviorSubject<any | null>(null);
  public currentUser$: Observable<any | null> = this.userSubject.asObservable();

  // Inyectar PLATFORM_ID
  private platformId = inject(PLATFORM_ID);
  private http = inject(HttpClient);

  constructor(private jwtHelper: JwtHelperService) {
    // Check if the platform is a browser before using localStorage
    if (isPlatformBrowser(this.platformId)) {
      this.loadUserRoleFromToken();
      this.loadCurrentUser(); // This will now safely run in the browser
    } else {
      // Handle the server-side rendering (SSR) case, preventing errors
      this.userSubject.next(null);
      this.userRoleSubject.next(null);
    }
  }

  // Carga el usuario al inicializar el servicio
  private loadCurrentUser(): void {
    // ✅ Wrap localStorage access with the platform check
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('token');
      if (token && !this.jwtHelper.isTokenExpired(token)) {
        const decodedToken = this.jwtHelper.decodeToken(token);
        this.userSubject.next(decodedToken);
      } else {
        this.userSubject.next(null);
      }
    }
  }

  // ✅ Método para obtener el usuario actual
  public getCurrentUser(): any | null {
    return this.userSubject.value;
  }

  login(username: string, password: string): Observable<any> {
    const credentials = { username, password };
    return this.http.post(`${this.apiUrl}/login`, credentials).pipe(
      tap((response: any) => {
        const token = response.token;
        if (token && isPlatformBrowser(this.platformId)) {
          localStorage.setItem('auth_token', token);
          this.decodeAndSetRole(token);
        }
      })
    );
  }

  getToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('auth_token');
    }
    return null;
  }

  getCurrentUserName(): string | null {
    const token = this.getToken();
    if (token) {
      try {
        const decodedToken: any = jwtDecode(token);
        return decodedToken.unique_name;
      } catch (error) {
        console.error('Error decodificando el token:', error);
        return null;
      }
    }
    return null;
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('auth_token');
      this.userRoleSubject.next(null);
    }
  }

  private loadUserRoleFromToken(): void {
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('auth_token');
      if (token) {
        this.decodeAndSetRole(token);
      }
    }
  }

  private decodeAndSetRole(token: string): void {
    try {
      const decoded: any = jwtDecode(token);
      const role = decoded.role || null;
      this.userRoleSubject.next(role);
    } catch (error) {
      console.error('Invalid token', error);
      this.userRoleSubject.next(null);
    }
  }

  hasRole(role: string): boolean {
    return this.userRoleSubject.value === role;
  }
}