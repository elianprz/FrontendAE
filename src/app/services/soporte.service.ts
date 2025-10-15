import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
//import { environment } from '../../environments/environment';
import { environment } from '../../environments/environment.prod';
@Injectable({
  providedIn: 'root'
})
export class SoporteService {
  private apiUrl = `${environment.apiUrl}/Soporte/enviar-mensaje`;

  constructor(private http: HttpClient) { }

  enviarMensaje(data: any): Observable<any> {
    return this.http.post(this.apiUrl, data, { responseType: 'text' });
  }
}