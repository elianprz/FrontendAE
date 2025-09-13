import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CajaService {
  private apiUrl = 'https://localhost:7182/api/Caja'; // Reemplaza con la URL de tu endpoint de Caja
  constructor(private http: HttpClient) {}

  /**
   * Obtiene todas las cajas.
   * @returns Un Observable que emite un array de cajas.
   */
  getCajas(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  /**
   * Crea una nueva caja.
   * @param caja Los datos de la caja a crear.
   * @returns Un Observable que emite la caja creada.
   */
  createCaja(caja: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, caja);
  }

  /**
   * Obtiene una caja por su ID.
   * @param id El ID de la caja a obtener.
   * @returns Un Observable que emite la caja con el ID especificado.
   */
  getCajaById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  /**
   * Actualiza una caja existente.
   * @param id El ID de la caja a actualizar.
   * @param caja Los nuevos datos de la caja.
   * @returns Un Observable que emite la caja actualizada.
   */
  updateCaja(id: number, caja: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, caja);
  }

  /**
   * Elimina una caja por su ID.
   * @param id El ID de la caja a eliminar.
   * @returns Un Observable que emite la respuesta de la operación.
   */
  deleteCaja(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}
