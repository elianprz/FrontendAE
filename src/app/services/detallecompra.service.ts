import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
//import { environment } from '../../environments/environment';
import { environment } from '../../environments/environment.prod';

@Injectable({
  providedIn: 'root',
})
export class DetalleComprasService {
  // Asegúrate de que esta URL sea la correcta para tu API de DetalleCompras
  private apiUrl = `${environment.apiUrl}/DetalleCompras`;

  constructor(private http: HttpClient) {}
  /**
   * Obtiene una lista de todos los detalles de compra.
   * @returns Un Observable con un array de detalles de compra.
   */

  getDetalleCompras(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }
  /**
   * Obtiene un detalle de compra específico por su ID.
   * @param id El ID del detalle de compra.
   * @returns Un Observable con los datos del detalle de compra.
   */

  getDetalleCompraById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }
}
