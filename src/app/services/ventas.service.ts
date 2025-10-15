import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
//import { environment } from '../../environments/environment';
import { environment } from '../../environments/environment.prod';
// ❌ Eliminado: import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class VentasService {
  //private apiUrl = 'https://localhost:7182/api/Ventas';
  private apiUrl = `${environment.apiUrl}/Ventas`;

  // ❌ ELIMINADO: La propiedad de estado global (carrito$)
  // public carrito$ = new BehaviorSubject<any[]>([]);

  constructor(private http: HttpClient) {}

  /**
   * Obtiene una lista de todas las ventas desde el API.
   * @returns Un Observable con un array de ventas.
   */
  getVentas(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  // ✅ Obtiene una venta específica por su ID.
  getVentaById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  // ✅ Actualiza una venta existente.
  updateVenta(id: number, venta: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, venta);
  }

  updateVentaEstado(codigoVenta: string, nuevoEstado: string): Observable<any> {
    const payload = { estadoVenta: nuevoEstado };
    return this.http.put<any>(`${this.apiUrl}/estado/${codigoVenta}`, payload);
  }

  // ✅ Elimina una venta por su ID.
  deleteVenta(codigoVenta: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/transaccion/${codigoVenta}`);
  }

  // ✅ Crea una venta (lote/encabezado + detalles)
  // El componente Catalogo le envía el DTO completo.
  createVenta(ventaLoteDTO: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, ventaLoteDTO);
  }

  /* * ❌ MÉTODOS DE MANEJO DE CARRITO ELIMINADOS 
   * (Ahora deben residir SÓLO en el componente Catalogo)
   */
  // ❌ deleteVenta(id: number): Observable<any> { ... }
  // ❌ addToCarrito(producto: any, cantidad: number): void { ... }
  // ❌ getCarritoTotal(): number { ... }
  // ❌ clearCarrito(): void { ... }
}