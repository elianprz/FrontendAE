import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
//import { environment } from '../../environments/environment';
import { environment } from '../../environments/environment.prod';
@Injectable({
  providedIn: 'root',
})
export class CatalogoService {
  //private apiUrl = 'https://localhost:7182/api/Productos';
  private apiUrl = `${environment.apiUrl}/Productos`;

  constructor(private http: HttpClient) {}

  getProductos(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

//   createProducto(producto: any): Observable<any> {
//     return this.http.post<any>(this.apiUrl, producto);
//   }

  getProductoById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

//   updateProducto(id: number, producto: any): Observable<any> {
//     return this.http.put<any>(`${this.apiUrl}/${id}`, producto);
//   }

//   deleteProducto(id: number): Observable<any> {
//     return this.http.delete<any>(`${this.apiUrl}/${id}`);
//   }
}