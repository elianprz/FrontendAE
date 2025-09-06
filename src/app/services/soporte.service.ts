import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SoporteService {
  private apiUrl = 'https://localhost:7182/api/Soporte/enviar-mensaje';

  constructor(private http: HttpClient) { }

  enviarMensaje(data: any): Observable<any> {
    return this.http.post(this.apiUrl, data, { responseType: 'text' });
  }
}