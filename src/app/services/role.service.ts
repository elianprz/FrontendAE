import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
//import { environment } from '../../environments/environment';
import { environment } from '../../environments/environment.prod';

@Injectable({
  providedIn: 'root',
})
export class RoleService {
  //private apiUrl = 'https://localhost:7182/api/Roles'; 
  private apiUrl =  `${environment.apiUrl}/Roles`; 

  constructor(private http: HttpClient) {}

  getRoles(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  createRol(rol: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, rol);
  }

  getRolById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  updateRol(id: number, rol: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, rol);
  }

  deleteRol(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}
