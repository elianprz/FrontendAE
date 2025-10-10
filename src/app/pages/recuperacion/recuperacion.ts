// recuperacion.ts
import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-recuperacion',
  templateUrl: './recuperacion.html',
  styleUrls: ['./recuperacion.css']
})
export class Recuperacion {
  
  constructor(private http: HttpClient, private router: Router) { }

  recuperarContrasena(event: Event) {
    event.preventDefault();
    const target = event.target as any;
    const email = target['email'].value;

    if (!email) {
      Swal.fire({
        icon: 'warning',
        title: 'Campo obligatorio',
        text: 'Por favor, introduce tu correo electrónico.'
      });
      return;
    }

    const apiUrl = 'https://localhost:7182/api/Usuarios/recuperar-contrasena';
    
    // Agrega { responseType: 'text' } para que HttpClient no espere un JSON
    this.http.post(apiUrl, { email: email }, { responseType: 'text' }).subscribe({
      next: (response) => {
        Swal.fire({
          icon: 'success',
          title: 'Correo enviado',
          text: response // Utiliza el mensaje de respuesta del backend
        }).then(() => {
          this.router.navigate(['/login']);
        });
      },
      error: (err) => {
        //console.error('Error de la solicitud:', err);
        Swal.fire({
          icon: 'error',
          title: 'Error de conexión',
          text: 'No se pudo conectar con el servidor. Por favor, inténtalo de nuevo más tarde.'
        });
      }
    });
  }
}