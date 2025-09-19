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

  // Métodos del API
  createVenta(venta: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, venta);
  }

  // Métodos para la lógica del carrito
  addToCarrito(producto: any, cantidad: number): void {
    const currentCarrito = this.carrito$.getValue();
    const existingItem = currentCarrito.find((item) => item.productoId === producto.productoId);

    if (existingItem) {
      existingItem.cantidad += cantidad;
    } else {
      currentCarrito.push({ ...producto, cantidad });
    }
    this.carrito$.next(currentCarrito);
  }

  getCarritoTotal(): number {
    const carrito = this.carrito$.getValue();
    return carrito.reduce((total, item) => total + item.precioVenta * item.cantidad, 0);
  }

  clearCarrito(): void {
    this.carrito$.next([]);
  }
}