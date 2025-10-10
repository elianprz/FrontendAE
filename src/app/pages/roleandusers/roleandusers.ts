import { Component, OnInit  } from '@angular/core';
import { UserService } from '../../services/user.service';
import { CommonModule} from '@angular/common'; // Requerido para *ngFor
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-roleandusers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './roleandusers.html',
  styleUrl: './roleandusers.css'
})
export class Roleandusers implements OnInit {
  // Variables for get
  users: any[] = [];
  // Constructor
  constructor(private userService: UserService, private authService: AuthService) {}
  // OnInit
  ngOnInit(): void {
    this.getUsers();
  }
  // Get All Users
  getUsers(): void {
    this.userService.getUsers().subscribe({
      next: (data) => {
        this.users = data;
        //console.log('Usuarios cargados:', this.users);
      },
      error: (error) => {
        //console.error('Error al cargar usuarios:', error);
      }
    });
  }
  // Other methods (create, update, delete) would go here
}
