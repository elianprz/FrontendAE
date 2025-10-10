// import { Component, signal } from '@angular/core';
// import { HttpClientModule } from '@angular/common/http';
// import { RouterOutlet, Router } from '@angular/router';
// import { AuthService } from '../../services/auth.service';
// import Swal from 'sweetalert2'; // 👈 Importa SweetAlert2

// @Component({
//   selector: 'app-login',
//   imports: [RouterOutlet, HttpClientModule],
//   templateUrl: './login.html',
//   styleUrl: './login.css'
// })
// export class Login {
//   protected readonly title = signal('libreriaAE');
//   constructor(private authService: AuthService, private router: Router) {}

//   login(event: Event) {
//     event.preventDefault();
//     const target = event.target as any;
//     const username = target['NombreUsuario'].value;
//     const password = target['contraseña'].value;   

//     this.authService.login(username, password).subscribe({
//       next: (response) => {
//         //console.log('Login exitoso', response);

//         // 🚀 Lógica para mostrar alerta de éxito con Swal
//         Swal.fire({
//           icon: 'success',
//           title: '¡Bienvenido!',
//           text: 'Inicio de sesión exitoso',
//           timer: 1500, // La alerta se cierra automáticamente en 1.5 segundos
//           showConfirmButton: false
//         }).then(() => {
//           // 🚀 Lógica de redirección basada en el rol
//           const role = this.authService.hasRole('Admin') ? 'Admin' : 'Empleado';
          
//           if (role === 'Admin') {
//             this.router.navigate(['/admin/dashboard']);
//           } else if (role === 'Empleado') {
//             this.router.navigate(['/employee/dashboard']);
//           }
//         });
//       },
//       error: (err) => {
//         console.error('Error de login', err);

//         // 🔴 Lógica para mostrar alerta de error con Swal
//         Swal.fire({
//           icon: 'error',
//           title: 'Credenciales incorrectas',
//           text: 'Usuario o contraseña inválidos'
//         });
//       }
//     });
//   }

// }
import { Component, signal } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { RouterOutlet, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import Swal from 'sweetalert2'; 

@Component({
  selector: 'app-login',
  imports: [RouterOutlet, HttpClientModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  protected readonly title = signal('libreriaAE');
  constructor(private authService: AuthService, private router: Router) {}

  login(event: Event) {
    event.preventDefault();
    const target = event.target as any;
    // Usa .trim() para eliminar los espacios en blanco del principio y del final
    const username = target['NombreUsuario'].value.trim();
    const password = target['contraseña'].value.trim();   

    this.authService.login(username, password).subscribe({
      next: (response) => {
        Swal.fire({
          icon: 'success',
          title: '¡Bienvenido!',
          text: 'Inicio de sesión exitoso',
          timer: 1500,
          showConfirmButton: false
        }).then(() => {
          const role = this.authService.hasRole('Admin') ? 'Admin' : 'Empleado';
          
          if (role === 'Admin') {
            this.router.navigate(['/admin/dashboard']);
          } else if (role === 'Empleado') {
            this.router.navigate(['/employee/dashboard']);
          }
        });
      },
      error: (err) => {
        //console.error('Error de login', err);

        Swal.fire({
          icon: 'error',
          title: 'Credenciales incorrectas',
          text: 'Usuario o contraseña inválidos'
        });
      }
    });
  }
}