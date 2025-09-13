import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class MovimientoCajaService {
  private apiUrl = 'https://localhost:7182/api/MovimientoCajas';

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los movimientos de caja.
   * @returns Un Observable con la lista de movimientos.
   */
  getMovimientos(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  /**
   * Crea un nuevo movimiento de caja.
   * @param movimiento Los datos del movimiento a crear.
   * @returns Un Observable con el movimiento creado.
   */
  createMovimiento(movimiento: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, movimiento);
  }

  /**
   * Obtiene un movimiento de caja por su ID.
   * @param id El ID del movimiento a consultar.
   * @returns Un Observable con los datos del movimiento.
   */
  getMovimientoById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  /**
   * Actualiza un movimiento de caja existente.
   * @param id El ID del movimiento a actualizar.
   * @param movimiento Los nuevos datos del movimiento.
   * @returns Un Observable con el movimiento actualizado.
   */
  updateMovimiento(id: number, movimiento: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, movimiento);
  }

  /**
   * Elimina un movimiento de caja por su ID.
   * @param id El ID del movimiento a eliminar.
   * @returns Un Observable con la respuesta de la operación.
   */
  deleteMovimiento(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}
