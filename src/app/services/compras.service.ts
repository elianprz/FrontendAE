// src/app/services/compras.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
//import { environment } from '../../environments/environment';
import { environment } from '../../environments/environment.prod';

@Injectable({
  providedIn: 'root',
})
export class ComprasService {
  //private apiUrl = 'https://localhost:7182/api/Compras';
  private apiUrl = `${environment.apiUrl}/Compras`;

  constructor(private http: HttpClient) {}

  // Leer (Read): Obtener todas las compras
  getCompras(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  // Leer (Read): Obtener una compra por su ID
  getCompraById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  // Crear (Create): Agregar una nueva compra
  addCompra(compra: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, compra);
  }

  // Actualizar (Update): Modificar una compra existente
  updateCompra(id: number, compra: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, compra);
  }

  // Borrar (Delete): Eliminar una compra
  deleteCompra(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}