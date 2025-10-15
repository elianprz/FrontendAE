// src/app/services/user.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
//import { environment } from '../../environments/environment';
import { environment } from '../../environments/environment.prod';
@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = `${environment.apiUrl}/Usuarios`; 

  constructor(private http: HttpClient) {}

  getUsers(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  createUser(user: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, user);
  }

  getUserById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  updateUser(id: number, user: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, user);
  }

  // Método para el PATCH de la contraseña
  // changePassword(id: number, newPassword: any): Observable<any> {
  //   const payload = { contraseña: newPassword }; // Asegúrate de que la propiedad coincida con tu backend
  //   return this.http.patch<any>(`${this.apiUrl}/${id}/cambiar-contrasena`, payload);
  // }
  changePassword(
    id: number,
    actualPassword: string,
    newPassword: string
  ): Observable<any> {
    const payload = {
      contrasenaActual: actualPassword,
      nuevaContrasena: newPassword
    };

    // Ejemplo: PATCH /usuarios/{id}/cambiar-contrasena
    return this.http.patch<any>(`${this.apiUrl}/${id}/cambiar-contrasena`, payload);
  }

  deleteUser(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }

  toggleEstado(id: number): Observable<{ usuarioId: number; estado: boolean }> {
    // No enviamos cuerpo, el endpoint simplemente flips
    return this.http.patch<{ usuarioId: number; estado: boolean }>(
      `${this.apiUrl}/${id}/estado`,
      {}
    );
  }
}