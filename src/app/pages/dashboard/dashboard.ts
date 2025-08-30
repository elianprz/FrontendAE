import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core'
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular'; 
import { Router } from '@angular/router'; // Importa el enrutador de Angular
import { AuthService } from '../../services/auth.service';
import { RouterOutlet, RouterLink } from '@angular/router'; // 👈 Importa RouterLink
@Component({
  selector: 'app-dashboard',
  imports: [CommonModule,
    LucideAngularModule, RouterOutlet, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class Dashboard implements OnInit{
  isAdministrationOpen: boolean = false;
  // Variable para controlar la visibilidad del menú principal de Admin
  isAdmin: boolean = false;

  constructor(
    private authService: AuthService, // Inyecta el servicio de autenticación
    private router: Router // Inyecta el servicio de enrutador
  ) {}

  
  ngOnInit(): void {
    // Suscribirse al rol del usuario para actualizar la visibilidad del menú
    this.authService.userRole$.subscribe(role => {
      this.isAdmin = role === 'Admin';
    });
  }

  toggleAdministrationMenu(): void {
    this.isAdministrationOpen = !this.isAdministrationOpen;
  }

  logout(): void {
    this.authService.logout(); // Llama al método de logout del servicio
    this.router.navigate(['/login']); // Redirige al usuario a la página de login
  }
}
