import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { RoleService } from '../../services/role.service';
import { take } from 'rxjs';

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './roles.html',
  styleUrl: './roles.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class Roles implements OnInit {
  roles: any[] = [];
  paginatedRoles: any[] = [];
  filteredRoles: any[] = [];

  // Paginación y Filtro
  searchText: string = '';
  currentPage: number = 1;
  itemsPerPage: number = 7;
  totalRoles: number = 0;
  private pagesToShow: number = 5;

  public Math = Math;

  // Modales
  isCreateModalOpen: boolean = false;
  newRol: any = {
    RolNombre: '',
  };

  isEditModalOpen: boolean = false;
  editedRol: any = {};
  editValidationErrors: string[] = [];

  // Modal de eliminación
  isDeleteModalOpen: boolean = false;
  rolToDelete: any = {};

  // Validación
  validationErrors: string[] = [];

  constructor(private roleService: RoleService) {}

  ngOnInit(): void {
    this.fetchRoles();
  }

  fetchRoles(): void {
    this.roleService.getRoles().subscribe({
      next: (data) => {
        this.roles = data;
        this.applySearchFilter();
      },
      error: (error) => {
        //console.error('Error al cargar roles:', error);
      },
    });
  }

  // Lógica de Paginación y Filtrado
  applySearchFilter(): void {
    if (this.searchText) {
      const lowerCaseSearchText = this.searchText.toLowerCase();
      this.filteredRoles = this.roles.filter((rol) => {
        return (rol.rolNombre || '')
          .toLowerCase()
          .includes(lowerCaseSearchText);
      });
    } else {
      this.filteredRoles = [...this.roles];
    }
    this.totalRoles = this.filteredRoles.length;
    this.currentPage = 1; // Reinicia a la primera página con cada nueva búsqueda
    this.paginateRoles();
  }

  paginateRoles(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedRoles = this.filteredRoles.slice(startIndex, endIndex);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.paginateRoles();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.paginateRoles();
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.paginateRoles();
    }
  }

  get totalPages(): number {
    return Math.ceil(this.totalRoles / this.itemsPerPage);
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

  // End Paginación

  // Lógica de validación
  validateRol(rol: any): string[] {
    const errors: string[] = [];
    if (!rol.rolNombre || rol.rolNombre.trim() === '') {
      errors.push('El nombre del rol es obligatorio.');
    }
    return errors;
  }

  // Lógica del Modal
  openCreateModal(): void {
    this.isCreateModalOpen = true;
    this.newRol = { rolNombre: '' }; // Limpiar el formulario
    this.validationErrors = []; // Limpiar errores de validación
  }

  closeCreateModal(): void {
    this.isCreateModalOpen = false;
  }

  // Lógica de Creación del Rol
  createRol(): void {
    this.validationErrors = this.validateRol(this.newRol);
    if (this.validationErrors.length > 0) {
      return;
    }

    this.roleService
      .createRol(this.newRol)
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          //console.log('Rol creado exitosamente:', response);
          this.closeCreateModal();
          this.fetchRoles();
        },
        error: (error) => {
          //console.error('Error al crear rol:', error);
          if (error.status === 400 && error.error.errors) {
            // Solución: Usar 'as string[]' para forzar el tipo a string[].
            // Esto le dice a TypeScript que confíe en que el resultado es un arreglo de strings.
            this.validationErrors = Object.values(
              error.error.errors
            ).flat() as string[];
          } else {
            this.validationErrors = [
              'Error al crear el rol. Intente de nuevo más tarde.',
            ];
          }
        },
      });
  }

  updateRol(): void {
    // Usa la variable de errores del modal de edición
    this.editValidationErrors = this.validateRol(this.editedRol);
    if (this.editValidationErrors.length > 0) {
      return;
    }

    this.roleService
      .updateRol(this.editedRol.rolId, this.editedRol)
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          //console.log('Rol actualizado exitosamente:', response);
          this.closeEditModal();
          this.fetchRoles();
        },
        error: (error) => {
          //console.error('Error al actualizar rol:', error);
          if (error.status === 400 && error.error.errors) {
            this.editValidationErrors = Object.values(
              error.error.errors
            ).flat() as string[];
          } else {
            this.editValidationErrors = [
              'Error al actualizar el rol. Intente de nuevo más tarde.',
            ];
          }
        },
      });
  }

  deleteRol(): void {
    if (!this.rolToDelete || !this.rolToDelete.rolId) {
      //console.error('No se ha seleccionado un rol para eliminar.');
      return;
    }

    this.roleService
      .deleteRol(this.rolToDelete.rolId)
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          //console.log('Rol eliminado exitosamente:', response);
          this.closeDeleteModal();
          this.fetchRoles(); // Vuelve a cargar los datos
        },
        error: (error) => {
          //console.error('Error al eliminar rol:', error);
          // Puedes manejar un mensaje de error para el usuario si la eliminación falla
          this.closeDeleteModal();
          alert('Error al eliminar el rol. Intente de nuevo más tarde.');
        },
      });
  }

  openEditModal(rol: any): void {
    this.isEditModalOpen = true;
    this.editedRol = { ...rol }; // Copia el objeto para evitar modificar el original directamente
  }

  closeEditModal(): void {
    this.isEditModalOpen = false;
  }

  // Lógica del Modal de Eliminación
  openDeleteModal(rol: any): void {
    this.isDeleteModalOpen = true;
    this.rolToDelete = rol;
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen = false;
  }
}
