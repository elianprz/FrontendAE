// src/app/pages/dashboard/dashboard.ts

import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { Router } from '@angular/router';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { RouterOutlet, RouterLink } from '@angular/router';
import { jwtDecode } from 'jwt-decode';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, RouterOutlet, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class Dashboard implements OnInit {
  //Current User
  currentUserName: string | null = null;

  isAdministrationOpen: boolean = false;
  isAdmin: boolean = false;
  isSidebarOpen: boolean = false; // Estado del sidebar

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.authService.userRole$.subscribe((role) => {
      this.isAdmin = role === 'Admin';
    });
    this.currentUserName = this.authService.getCurrentUserName();
  }

  toggleAdministrationMenu(): void {
    this.isAdministrationOpen = !this.isAdministrationOpen;
  }

  // Método para abrir y cerrar el sidebar
  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  getCurrentUserName(): string | null {
    const token = this.getToken();

    if (token) {
      try {
        const decodedToken: any = jwtDecode(token);

        // El nombre del usuario en tu payload se llama "unique_name"

        return decodedToken.unique_name;
      } catch (error) {
        console.error('Error decodificando el token:', error);

        return null;
      }
    }

    return null;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
