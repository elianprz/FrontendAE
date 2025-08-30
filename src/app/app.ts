import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink } from '@angular/router'; // 👈 Importa RouterOutlet y RouterLink

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink], // 👈 Añádelos a los imports
  template: `
    <router-outlet></router-outlet>
  `,
  styleUrl: './app.css'
})
export class App {}