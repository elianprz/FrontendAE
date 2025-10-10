import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { jwtDecode } from 'jwt-decode';
import { JwtHelperService } from '@auth0/angular-jwt';

@Injectable({
  providedIn: 'root',
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
    if (isPlatformBrowser(this.platformId)) {
      // <‑‑  Cambiado `token` → `auth_token`
      const token = localStorage.getItem('auth_token');

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
          this.loadCurrentUser(); // <‑‑  añadido
        }
      })
    );
  }

  private logDecodedToken(): void {
    const token = this.getToken();
    if (!token) {
      //console.warn('🔴 No hay token en localStorage');
      return;
    }
    try {
      const decoded: any = jwtDecode(token);
      //console.groupCollapsed('🔎 Payload del JWT');
      //console.log(decoded);
      //console.groupEnd();
    } catch (e) {
      //console.error('❌ Error decoding JWT', e);
    }
  }

  getToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('auth_token');
    }
    return null;
  }

  // ✅ Método simple para obtener el valor del rol actual
  public getUserRole(): string | null {
    return this.userRoleSubject.value;
  }

  getCurrentUserName(): string | null {
    const token = this.getToken();
    if (token) {
      try {
        const decodedToken: any = jwtDecode(token);
        return decodedToken.unique_name;
      } catch (error) {
        //console.error('Error decodificando el token:', error);
        return null;
      }
    }
    return null;
  }

  // AuthService
  public get currentUser(): any | null {
    return this.userSubject.value; // getValue() is equivalent
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
      //console.error('Invalid token', error);
      this.userRoleSubject.next(null);
    }
  }

  getCurrentUserId(): number {
    const token = this.getToken();

    if (!token) {
      throw new Error('No se encontró el token en localStorage.');
    }

    let decoded: any;
    try {
      decoded = jwtDecode(token);
    } catch (e) {
      //console.error('Error decoding JWT (getCurrentUserId)', e);
      throw new Error('El token no pudo ser decodificado.');
    }

    /* ------------------------------------------------------------
     * 1️⃣  Nombres de claim donde puede estar el id.
     *    - Añadimos "nameid" (el que lleva tu backend).
     *    - Mantenemos los demás por si cambias de versión.
     * ------------------------------------------------------------ */
    const candidateKeys = [
      'nameid', // <-- el que tiene tu token
      'usuarioId', // posibles nombres en otros proyectos
      'id',
      'sub',
      'userId',
      'uid',
      'UserId',
      'userid',
      'user_id',
      // <-- si en el futuro ves otro nombre, añádelo aquí
    ];

    /* ------------------------------------------------------------
     * 2️⃣  Búsqueda recursiva (por si el id está dentro de un objeto
     *     anidado). La búsqueda termina en la primera coincidencia.
     * ------------------------------------------------------------ */
    const findId = (obj: any): any => {
      if (!obj || typeof obj !== 'object') return undefined;

      // ① Busca en las claves directas del objeto
      for (const key of candidateKeys) {
        if (
          Object.prototype.hasOwnProperty.call(obj, key) &&
          obj[key] != null
        ) {
          return obj[key];
        }
      }

      // ② Si no lo encontró, recorre los valores (profundidad 2‑3)
      for (const value of Object.values(obj)) {
        const nested = findId(value);
        if (nested !== undefined) return nested;
      }

      return undefined;
    };

    const rawId = findId(decoded);
    const numericId = Number(rawId);

    /* ------------------------------------------------------------
     * 3️⃣  Validación final
     * ------------------------------------------------------------ */
    if (!rawId || isNaN(numericId) || numericId <= 0) {
      const keysFound = Object.keys(decoded).join(', ');
      throw new Error(
        `El token no contiene un identificador válido (se obtuvo "${rawId}"). ` +
          `Claves disponibles en el payload: ${keysFound}`
      );
    }

    return numericId; // <-- número entero que puedes usar en tus rutas
  }

  hasRole(role: string): boolean {
    return this.userRoleSubject.value === role;
  }
}
