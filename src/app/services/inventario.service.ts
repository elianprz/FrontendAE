import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class InventarioService {
  // Se cambia la URL a 'api/Inventario' para reflejar el nuevo endpoint
  private apiUrl = 'https://localhost:7182/api/Productos';
  private imageUploadUrl = 'https://localhost:7182/api/Productos/SubirImagen';

  constructor(private http: HttpClient) {}

  // Obtiene todos los productos del inventario
  getInventario(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  // Crea un nuevo producto
  createProduct(producto: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, producto);
  }

  // Obtiene un producto por su ID
  getProductById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  // Actualiza un producto existente
  updateProduct(id: number, producto: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, producto);
  }

  // Elimina un producto
  deleteProduct(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }

  // Método específico para subir una imagen
  uploadImage(imageFile: File): Observable<any> {
    const formData = new FormData();
    formData.append('image', imageFile);
    return this.http.post<any>(this.imageUploadUrl, formData);
  }

  /**
   * Actualiza la imagen de un producto específico.
   * @param id El ID del producto a actualizar.
   * @param imageFile El archivo de la nueva imagen.
   * @returns Un Observable que representa la respuesta del backend.
   */
  updateProductImage(id: number, imageFile: File): Observable<any> {
    const formData = new FormData();
    // ✅ CLAVE: 'image' debe coincidir con el nombre del parámetro del backend
    formData.append('image', imageFile, imageFile.name);

    // ✅ Llama al endpoint de tu backend que actualiza la imagen
    return this.http.put(`${this.apiUrl}/ActualizarImagen/${id}`, formData);
  }

}
