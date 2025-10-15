import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
//import { environment } from '../../environments/environment';
import { environment } from '../../environments/environment.prod';
@Injectable({
  providedIn: 'root',
})
export class DetalleVentasService {
  private apiUrl = `${environment.apiUrl}/api/DetalleVentas`;

  constructor(private http: HttpClient) {}

  getDetalleVentas(): Observable<any> {
    return this.http.get<any>(this.apiUrl);
  }

  getDetalleVentaById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }
}