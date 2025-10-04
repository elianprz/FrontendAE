import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class VentasService {
  private apiUrl = 'https://localhost:7182/api/Ventas';

  public carrito$ = new BehaviorSubject<any[]>([]);

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
    const payload = { estadoVenta: nuevoEstado }; // Prepara el DTO minimalista

    // ✅ CLAVE: Apunta al nuevo endpoint que maneja el lote
    return this.http.put<any>(`${this.apiUrl}/estado/${codigoVenta}`, payload);
  }

  // ✅ Elimina una venta por su ID.
  // deleteVenta(id: number): Observable<any> {
  //   return this.http.delete<any>(`${this.apiUrl}/${id}`);
  // }
  deleteVenta(codigoVenta: string): Observable<any> {
    // El backend ahora usa el CodigoVenta para borrar todos los registros
    return this.http.delete<any>(`${this.apiUrl}/transaccion/${codigoVenta}`);
  }

  // Métodos del API
  // createVenta(venta: any): Observable<any> {
  //   return this.http.post<any>(this.apiUrl, venta);
  // }
  createVenta(ventaLoteDTO: any): Observable<any> {
  // Asegúrate de que el backend recibe el objeto completo, no solo la lista.
  return this.http.post<any>(this.apiUrl, ventaLoteDTO);
}

  // Métodos para la lógica del carrito
  addToCarrito(producto: any, cantidad: number): void {
    const currentCarrito = this.carrito$.getValue();
    const existingItem = currentCarrito.find(
      (item) => item.productoId === producto.productoId
    );

    if (existingItem) {
      existingItem.cantidad += cantidad;
    } else {
      currentCarrito.push({ ...producto, cantidad });
    }
    this.carrito$.next(currentCarrito);
  }

  getCarritoTotal(): number {
    const carrito = this.carrito$.getValue();
    return carrito.reduce(
      (total, item) => total + item.precioVenta * item.cantidad,
      0
    );
  }

  clearCarrito(): void {
    this.carrito$.next([]);
  }
}
