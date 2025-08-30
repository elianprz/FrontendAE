import { Component, signal } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { RouterOutlet, Router } from '@angular/router'; // 👈 Importa Router
import { AuthService } from '../../services/auth.service';
@Component({
  // selector: 'app-login',
  // imports: [],
  // templateUrl: './login.html',
  // styleUrl: './login.css'
  selector: 'app-login',
  imports: [RouterOutlet, HttpClientModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  protected readonly title = signal('libreriaAE');
  constructor(private authService: AuthService, private router: Router) {}

  // login(event: Event) {
  //   event.preventDefault();
  //   const target = event.target as any;
  //   const username = target['NombreUsuario'].value; // Corregido: se accede con corchetes
  //   const password = target['contraseña'].value;   

  //   this.authService.login(username, password).subscribe({
  //     next: (response) => {
  //       // Maneja el éxito (guardar token, redirigir, etc.)
  //       console.log('Login exitoso', response);
  //     },
  //     error: (err) => {
  //       // Maneja el error
  //       console.error('Error de login', err);
  //     }
  //   });
  // }
  login(event: Event) {
    event.preventDefault();
    const target = event.target as any;
    const username = target['NombreUsuario'].value;
    const password = target['contraseña'].value;   

    this.authService.login(username, password).subscribe({
      next: (response) => {
        console.log('Login exitoso', response);
        
        // 🚀 Lógica de redirección basada en el rol
        const role = this.authService.hasRole('Admin') ? 'Admin' : 'Empleado';
        
        if (role === 'Admin') {
          this.router.navigate(['/admin/dashboard']);
        } else if (role === 'Empleado') {
          this.router.navigate(['/employee/dashboard']);
        }
      },
      error: (err) => {
        console.error('Error de login', err);
      }
    });
  }

}
