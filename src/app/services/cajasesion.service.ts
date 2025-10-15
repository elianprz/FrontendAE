import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
//import { environment } from '../../environments/environment';
import { environment } from '../../environments/environment.prod';
@Injectable({
  providedIn: 'root',
})
export class CajasesionService {
  //private apiUrl = 'https://localhost:7182/api/CajaSesiones'; 
  private apiUrl = `${environment.apiUrl}/CajaSesiones`; 
  constructor(private http: HttpClient) {}
  getCajasesiones(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }
  createCajasesion(cajasesion: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, cajasesion);
  }
  getCajasesionById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }
  updateCajasesion(id: number, cajasesion: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, cajasesion);
  }
  deleteCajasesion(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}
