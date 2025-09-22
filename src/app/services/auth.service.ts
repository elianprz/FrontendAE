// // src/app/services/auth.service.ts
// import { Injectable } from '@angular/core';
// import { HttpClient } from '@angular/common/http';
// import { Observable } from 'rxjs';
// import { tap } from 'rxjs/operators';
// import { Router } from '@angular/router';

// @Injectable({
//   providedIn: 'root'
// })
// export class AuthService {
//   // Update this line with the correct backend URL
//   private apiUrl = 'https://localhost:7182/api/Auth'; 
  
//   constructor(private http: HttpClient, private router: Router) { }

  
//   private setToken(token: string): void {
//     localStorage.setItem('jwt_token', token);
//   }
  
//   login(username: string, password: string): Observable<any> {
//   const body = { username, password };
//   return this.http.post<any>(`${this.apiUrl}/login`, body).pipe(
//     tap(response => {
//       if (response.token) {
//         this.setToken(response.token); // Llama al nuevo método
//       }
//     })
//   );
// }


//   isLoggedIn(): boolean {
//     const token = localStorage.getItem('jwt_token');
//     return !!token;
//   }

//   logout(): void {
//     localStorage.removeItem('jwt_token');
//     this.router.navigate(['/login']);
//   }
// }
import { Injectable, PLATFORM_ID, inject  } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { jwtDecode } from 'jwt-decode'; // Necesitas instalar esta librería: npm install jwt-decode

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = 'https://localhost:7182/api/Auth';
  private userRoleSubject = new BehaviorSubject<string | null>(null);

  userRole$ = this.userRoleSubject.asObservable();

  // Inyectar PLATFORM_ID
  private platformId = inject(PLATFORM_ID); 
  private http = inject(HttpClient);

  constructor() {
    // Comprobar si la plataforma es un navegador antes de usar localStorage
    if (isPlatformBrowser(this.platformId)) { 
      this.loadUserRoleFromToken();
    }
  }

  login(username: string, password: string): Observable<any> {
    const credentials = { username, password };
    return this.http.post(`${this.apiUrl}/login`, credentials).pipe(
      tap((response: any) => {
        const token = response.token;
        if (token) {
          localStorage.setItem('auth_token', token);
          this.decodeAndSetRole(token);
        }
      })
    );
  }

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  getCurrentUserName(): string | null {
    const token = this.getToken();
    if (token) {
      try {
        const decodedToken: any = jwtDecode(token);
        // El nombre del usuario en tu payload se llama "unique_name"
        return decodedToken.unique_name;
      } catch (error) {
        console.error('Error decodificando el token:', error);
        return null;
      }
    }
    return null;
  }

  logout(): void {
    localStorage.removeItem('auth_token');
    this.userRoleSubject.next(null);
  }

  private loadUserRoleFromToken(): void {
    const token = localStorage.getItem('auth_token');
    if (token) {
      this.decodeAndSetRole(token);
    }
  }

  private decodeAndSetRole(token: string): void {
    try {
      const decoded: any = jwtDecode(token);
      const role = decoded.role || null; // El nombre de la propiedad 'role' puede variar
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