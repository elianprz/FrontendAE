import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { UserService } from '../../services/user.service';
import { take } from 'rxjs/operators';
import { RoleService } from '../../services/role.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './usuarios.html',
  styleUrls: ['./usuarios.css'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class Usuarios implements OnInit {
  users: any[] = [];
  roles: any[] = [];
  rolesMap: { [key: number]: string } = {};

  // Validaciones
  public validationErrors: string[] = [];

  searchText: string = '';
  filteredUsers: any[] = [];
  activeFilters: { [key: string]: Set<any> } = {};

  currentPage: number = 1;
  itemsPerPage: number = 7;
  totalUsers: number = 0;
  paginatedUsers: any[] = [];

  isCreateModalOpen: boolean = false;
  newUser: any = {
    primerNombre: '',
    segundoNombre: '',
    primerApellido: '',
    segundoApellido: '',
    nit: '',
    cui: '',
    fechaIngreso: '',
    fechaNacimiento: '',
    telefono: '',
    direccion: '',
    genero: '',
    estado: true,
    email: '',
    rolId: null,
  };

  private pagesToShow: number = 5;
  public Math = Math;

  isEditModalOpen: boolean = false;
  editedUser: any = {};

  isViewModalOpen: boolean = false;
  viewedUser: any = {};

  isDeleteModalOpen: boolean = false;
  userToDelete: any = {};

  constructor(
    private userService: UserService,
    private roleService: RoleService
  ) {}

  ngOnInit(): void {
    this.getUsersWithRoles();
  }

  // Helper para convertir fecha de YYYY-MM-DD a DD-MM-YYYY
  formatDateForDisplay(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = ('0' + date.getDate()).slice(-2);
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }
  // Helper para convertir fecha de YYYY-MM-DD a YYYY-MM-DD para inputs tipo date
  private formatDateForInput(dateString: string): string {
    if (!dateString) {
      return '';
    }
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  // Helper para convertir fecha de DD-MM-YYYY a YYYY-MM-DD
  formatDateForBackend(dateString: string): string {
    if (!dateString) return '';
    const parts = dateString.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateString;
  }

  getUsersWithRoles(): void {
    forkJoin({
      users: this.userService.getUsers(),
      roles: this.roleService.getRoles(),
    })
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          this.roles = response.roles;
          this.roles.forEach((role: any) => {
            const roleId = role.rolId || role.id;
            if (roleId) {
              this.rolesMap[roleId] = role.rolNombre;
            }
          });

          this.users = response.users.map((user: any) => {
            const rolNombre = this.rolesMap[user.rolId] || 'Sin Rol';
            return {
              ...user,
              rolNombre: rolNombre,
              fechaIngreso: this.formatDateForDisplay(user.fechaIngreso),
              fechaNacimiento: this.formatDateForDisplay(user.fechaNacimiento),
            };
          });

          this.applyFiltersAndSearch();
        },
        error: (error) => {
          console.error('Error al cargar datos:', error);
        },
      });
  }

  applySearchFilter(): void {
    this.applyFiltersAndSearch();
  }

  applyFilter(filterType: string, value: any, isChecked: boolean): void {
    if (!this.activeFilters[filterType]) {
      this.activeFilters[filterType] = new Set();
    }

    if (isChecked) {
      this.activeFilters[filterType].add(value);
    } else {
      this.activeFilters[filterType].delete(value);
    }

    if (this.activeFilters[filterType].size === 0) {
      delete this.activeFilters[filterType];
    }
    this.applyFiltersAndSearch();
  }

  clearFilters(): void {
    this.activeFilters = {};
    this.applyFiltersAndSearch();
  }

  isFilterActive(filterType: string, value: any): boolean {
    return !!this.activeFilters[filterType]?.has(value);
  }

  applyFiltersAndSearch(): void {
    let tempUsers = [...this.users];
    if (this.searchText) {
      const lowerCaseSearchText = this.searchText.toLowerCase();
      tempUsers = tempUsers.filter((user) => {
        const userFields = `${user.primerNombre || ''} ${
          user.segundoNombre || ''
        } ${user.primerApellido || ''} ${user.segundoApellido || ''} ${
          user.nombreUsuario || ''
        } ${user.email || ''} ${user.cui || ''} ${user.nit || ''} ${
          user.telefono || ''
        } ${user.direccion || ''}`;
        return userFields.toLowerCase().includes(lowerCaseSearchText);
      });
    }

    for (const filterType in this.activeFilters) {
      if (this.activeFilters.hasOwnProperty(filterType)) {
        const filterSet = this.activeFilters[filterType];
        if (filterSet.size > 0) {
          tempUsers = tempUsers.filter((user) => {
            return filterSet.has(user[filterType]);
          });
        }
      }
    }
    this.filteredUsers = tempUsers;
    this.totalUsers = this.filteredUsers.length;
    this.currentPage = 1;
    this.paginateUsers();
  }

  paginateUsers(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedUsers = this.filteredUsers.slice(startIndex, endIndex);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.paginateUsers();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.paginateUsers();
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.paginateUsers();
    }
  }

  get totalPages(): number {
    return Math.ceil(this.totalUsers / this.itemsPerPage);
  }

  get pages(): (number | string)[] {
    const pages: (number | string)[] = [];
    const total = this.totalPages;
    const current = this.currentPage;
    const numPagesToShow = this.pagesToShow;

    if (total <= numPagesToShow + 2) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      let start = Math.max(1, current - Math.floor(numPagesToShow / 2));
      let end = Math.min(total, start + numPagesToShow - 1);

      if (end === total) {
        start = Math.max(1, total - numPagesToShow + 1);
      }

      if (start > 1) {
        pages.push(1);
        if (start > 2) {
          pages.push('...');
        }
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < total) {
        if (end < total - 1) {
          pages.push('...');
        }
        pages.push(total);
      }
    }
    return pages;
  }

  handlePageClick(page: number | string): void {
    if (typeof page === 'number') {
      this.goToPage(page);
    }
  }

  openCreateModal(): void {
    this.isCreateModalOpen = true;
  }

  closeCreateModal(): void {
    this.isCreateModalOpen = false;
    this.newUser = {
      primerNombre: '',
      segundoNombre: '',
      primerApellido: '',
      segundoApellido: '',
      nit: '',
      cui: '',
      fechaIngreso: '',
      fechaNacimiento: '',
      telefono: '',
      direccion: '',
      genero: '',
      estado: true,
      email: '',
      rolId: null,
    };
    this.validationErrors = [];
  }

  // En tu clase Usuarios, busca el método createUser()
  createUser(): void {
    // if (
    //   !this.newUser.primerNombre ||
    //   !this.newUser.primerApellido ||
    //   !this.newUser.email ||
    //   !this.newUser.rolId
    // ) {
    //   console.error('Por favor, completa los campos requeridos.');
    //   return;
    // }
    this.validationErrors = this.validateUser(this.newUser, true);
    if (this.validationErrors.length > 0) {
      // Si hay errores, detiene la ejecución.
      return;
    }

    // Crea una copia del objeto para no modificar el original
    const userToCreate = {
      ...this.newUser,
    };

    // Formatea las fechas al formato ISO 8601 antes de enviar al backend
    if (userToCreate.fechaIngreso) {
      userToCreate.fechaIngreso = new Date(
        userToCreate.fechaIngreso
      ).toISOString();
    }
    if (userToCreate.fechaNacimiento) {
      userToCreate.fechaNacimiento = new Date(
        userToCreate.fechaNacimiento
      ).toISOString();
    }

    this.userService
      .createUser(userToCreate)
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          console.log('Usuario creado exitosamente:', response);
          this.closeCreateModal();
          this.getUsersWithRoles();
        },
        error: (error) => {
          console.error('Error al crear usuario:', error);
        },
      });
  }

  openEditModal(user: any): void {
    // Copia el usuario para evitar mutar el original en la tabla
    this.editedUser = {
      ...user,
      // Formatea la fecha de ingreso para el input de tipo 'date'
      fechaIngreso: this.formatDateForInput(user.fechaIngreso),
      // Formatea la fecha de nacimiento de la misma manera
      fechaNacimiento: this.formatDateForInput(user.fechaNacimiento),
    };
    this.isEditModalOpen = true;
  }

  closeEditModal(): void {
    this.isEditModalOpen = false;
    this.editedUser = {};
    this.validationErrors = [];
  }

  // En la clase Usuarios, busca el método updateUser()
  updateUser(): void {
    // if (!this.editedUser.usuarioId) {
    //   console.error('No se ha seleccionado ningún usuario para editar.');
    //   return;
    // }
    this.validationErrors = this.validateUser(this.editedUser);

    if (this.validationErrors.length > 0) {
      console.warn('Errores de validación:', this.validationErrors);
      return; // <- ya no envía nada
    }

    if (!this.editedUser.usuarioId) {
      console.error('No se ha seleccionado ningún usuario para editar.');
      return;
    }

    // Crea una copia del objeto para no modificar el original
    const userToUpdate = { ...this.editedUser };

    // Formatea las fechas al formato ISO 8601 antes de enviar al backend
    if (userToUpdate.fechaIngreso) {
      userToUpdate.fechaIngreso = new Date(
        userToUpdate.fechaIngreso
      ).toISOString();
    }
    if (userToUpdate.fechaNacimiento) {
      userToUpdate.fechaNacimiento = new Date(
        userToUpdate.fechaNacimiento
      ).toISOString();
    }

    // Llama al servicio para actualizar el usuario con el objeto formateado
    this.userService
      .updateUser(userToUpdate.usuarioId, userToUpdate)
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          console.log('Usuario actualizado exitosamente:', response);
          this.closeEditModal();
          this.getUsersWithRoles(); // Recargar la lista de usuarios
        },
        error: (error) => {
          console.error('Error al actualizar usuario:', error);
        },
      });
  }

  // Validación de campos
  // Añade esta función a tu clase en usuarios.ts
  public validateUser(user: any, isNewUser: boolean = false): string[] {
    const errors: string[] = [];

    // Validación de campos obligatorios
    if (!user.primerNombre || user.primerNombre.trim() === '') {
      errors.push('El campo Primer Nombre es obligatorio.');
    }
    if (!user.primerApellido || user.primerApellido.trim() === '') {
      errors.push('El campo Primer Apellido es obligatorio.');
    }
    if (!user.email || user.email.trim() === '') {
      errors.push('El campo Correo Electrónico es obligatorio.');
    }
    if (!user.rolId) {
      errors.push('El campo Rol es obligatorio.');
    }

    // ✅ Haz obligatorios estos si aplica
    if (!user.nit || user.nit.trim() === '') {
      errors.push('El campo NIT es obligatorio.');
    }
    if (!user.cui || user.cui.trim() === '') {
      errors.push('El campo CUI es obligatorio.');
    }
    if (!user.telefono || user.telefono.trim() === '') {
      errors.push('El campo Teléfono es obligatorio.');
    }

    // Validación de longitud para NIT y CUI (deben ser de 13 caracteres)
    if (user.nit && user.nit.length !== 13) {
      errors.push('El campo NIT debe tener 13 caracteres.');
    }
    if (user.cui && user.cui.length !== 13) {
      errors.push('El campo CUI debe tener 13 caracteres.');
    }

    // Validación para teléfono (8 dígitos numéricos)
    if (user.telefono) {
      const telefonoRegex = /^\d{8}$/;
      if (!telefonoRegex.test(user.telefono)) {
        errors.push('El campo teléfono debe contener 8 dígitos numéricos.');
      }
    }

    return errors;
  }

  openViewModal(user: any): void {
    this.viewedUser = {
      ...user,
      fechaIngreso: this.formatDateForDisplay(user.fechaIngreso),
      fechaNacimiento: this.formatDateForDisplay(user.fechaNacimiento),
    };
    this.isViewModalOpen = true;
  }

  closeViewModal(): void {
    this.isViewModalOpen = false;
    this.viewedUser = {};
  }

  openDeleteModal(user: any): void {
    this.userToDelete = user;
    this.isDeleteModalOpen = true;
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen = false;
    this.userToDelete = {};
  }

  deleteUser(): void {
    if (!this.userToDelete.usuarioId) {
      console.error('No se ha seleccionado ningún usuario para eliminar.');
      return;
    }

    this.userService
      .deleteUser(this.userToDelete.usuarioId)
      .pipe(take(1))
      .subscribe({
        next: () => {
          console.log('Usuario eliminado exitosamente.');
          this.closeDeleteModal();
          this.getUsersWithRoles();
        },
        error: (error) => {
          console.error('Error al eliminar usuario:', error);
        },
      });
  }
}
