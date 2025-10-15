import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
//import { environment } from '../../environments/environment';
import { environment } from '../../environments/environment.prod';

@Injectable({
  providedIn: 'root',
})
export class CateproductoService {
  //private apiUrl = 'https://localhost:7182/api/CategoriaProducto'; 
  private apiUrl = `${environment.apiUrl}/CategoriaProducto`;

  constructor(private http: HttpClient) {}

  getProductos(): Observable<any> {
    return this.http.get<any>(this.apiUrl);
  }

  getProductosById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  createProductos(producto: any): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<any>(this.apiUrl, producto, { headers });
  }

  updateProducto(id: number, producto: any): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.put<any>(`${this.apiUrl}/${id}`, producto, { headers });
  }

  deleteProducto(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}