import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DetalleVentasService {
  private apiUrl = 'https://localhost:7182/api/DetalleVentas';

  constructor(private http: HttpClient) {}

  getDetalleVentas(): Observable<any> {
    return this.http.get<any>(this.apiUrl);
  }

  getDetalleVentaById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }
}