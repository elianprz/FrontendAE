import { Component,CUSTOM_ELEMENTS_SCHEMA,OnInit } from '@angular/core';
import { UserService } from '../../services/user.service';
import { CommonModule} from '@angular/common'; // Requerido para *ngFor
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-list.html',
  styleUrl: './user-list.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class UserList implements OnInit {
  users: any[] = [];
  // Modals
  isCreateModalOpen: boolean = false;
  isUpdateModalOpen: boolean = false;
  isViewModalOpen: boolean = false;
  isDeleteModalOpen: boolean = false;

  selectedUser: any | null = null; // El usuario actualmente seleccionado
  newUser: any = {};
  updatedUser: any = {};
  
  currentUserName: string | null = null;
  constructor(private userService: UserService, private authService: AuthService) {}

  ngOnInit(): void {
    this.getUsers();
    this.currentUserName = this.authService.getCurrentUserName();
  }

  getUsers(): void {
    this.userService.getUsers().subscribe({
      next: (data) => {
        this.users = data;
        console.log('Usuarios cargados:', this.users);
      },
      error: (error) => {
        console.error('Error al cargar usuarios:', error);
      }
    });
  }

  // Métodos para abrir y cerrar los modales
  selectUser(user: any): void {
    this.selectedUser = user;
  }

  openCreateModal(): void {
    this.isCreateModalOpen = true;
    this.newUser = {
      primerNombre: '',
      segundoNombre: '',
      primerApellido: '',
      segundoApellido: '',
      email: '',
      rolId: 0,
      estado: true,
      nit: '',
      cui: '',
      telefono: '',
      direccion: '',
      fechaIngreso: this.getTodayForInput(), // YYYY-MM-DD for input
      fechaNacimiento: '', // YYYY-MM-DD from user
      genero: ''
    };
  }

  getTodayForInput(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  getTodayFormatted(): string {
    const today = new Date();
    const day = today.getDate().toString().padStart(2, '0');
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const year = today.getFullYear();
    return `${day}-${month}-${year}`;
  }


   createUser(): void {
    const userToCreate = { ...this.newUser };
    // Format dates for the backend (dd-MM-yyyy)
    userToCreate.fechaIngreso = this.formatDateForBackend(userToCreate.fechaIngreso);
    if (userToCreate.fechaNacimiento) {
      userToCreate.fechaNacimiento = this.formatDateForBackend(userToCreate.fechaNacimiento);
    }
    
    this.userService.createUser(userToCreate).subscribe({
      next: (response) => {
        console.log('Usuario creado con éxito:', response);
        this.closeModal();
        this.getUsers();
        alert('Usuario creado con éxito');
      },
      error: (error) => {
        console.error('Error al crear usuario:', error);
        alert('Hubo un error al crear el usuario. Por favor, revisa los datos.');
      }
    });
  }


formatDateForBackend(dateString: string | null): string {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}-${month}-${year}`;
  }

  
  openUpdateModal(): void {
    if (this.selectedUser) {
      this.isUpdateModalOpen = true;
      this.updatedUser = { ...this.selectedUser };

      // Format dates from backend to YYYY-MM-DD for input
      if (this.updatedUser.fechaIngreso) {
        this.updatedUser.fechaIngreso = this.formatDateForInput(this.updatedUser.fechaIngreso);
      }
      if (this.updatedUser.fechaNacimiento) {
        this.updatedUser.fechaNacimiento = this.formatDateForInput(this.updatedUser.fechaNacimiento);
      }
    } else {
      alert('Por favor, selecciona un usuario para actualizar.');
    }
  }

  // Nuevo método para formatear la fecha para la visualización
   formatDateForDisplay(dateString: string | null): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }

  // Método ya existente para formatear la fecha para los inputs
  formatDateForInput(dateString: string | null): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
 updateUser(): void {
    const userToUpdate = { ...this.updatedUser };
    // Format dates for the backend (dd-MM-yyyy)
    userToUpdate.fechaIngreso = this.formatDateForBackend(userToUpdate.fechaIngreso);
    if (userToUpdate.fechaNacimiento) {
        userToUpdate.fechaNacimiento = this.formatDateForBackend(userToUpdate.fechaNacimiento);
    }

    this.userService.updateUser(userToUpdate.usuarioId, userToUpdate).subscribe({
      next: (response) => {
        console.log('Usuario actualizado con éxito:', response);
        this.closeModal();
        this.getUsers();
        alert('Usuario actualizado con éxito');
      },
      error: (error) => {
        console.error('Error al actualizar usuario:', error);
        alert('Hubo un error al actualizar el usuario. Por favor, revisa los datos.');
      }
    });
  }
  
   openViewModal(): void {
    if (this.selectedUser) {
      this.isViewModalOpen = true;
    } else {
      alert('Por favor, selecciona un usuario para ver los detalles.');
    }
  }

    openDeleteModal(): void {
    if (this.selectedUser) {
      this.isDeleteModalOpen = true;
    } else {
      alert('Por favor, selecciona un usuario para eliminar.');
    }
  }

  deleteUser(): void {
    if (this.selectedUser) {
      this.userService.deleteUser(this.selectedUser.usuarioId).subscribe({
        next: () => {
          console.log('Usuario eliminado con éxito');
          this.closeModal();
          this.getUsers(); // Actualiza la tabla después de la eliminación
          alert('Usuario eliminado con éxito');
        },
        error: (error) => {
          console.error('Error al eliminar usuario:', error);
          alert('Hubo un error al eliminar el usuario.');
        }
      });
    }
  }


  closeModal(): void {
    this.isCreateModalOpen = false;
    this.isUpdateModalOpen = false;
    this.isViewModalOpen = false;
    this.isDeleteModalOpen = false;
    this.selectedUser = null;
    this.newUser = {};
  }

}
