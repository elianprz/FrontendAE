import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { CajaService } from '../../services/caja.service';
import { AuthService } from '../../services/auth.service';
import { take } from 'rxjs';

@Component({
  selector: 'app-caja',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './caja.html',
  styleUrl: './caja.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class Caja implements OnInit {
  cajas: any[] = [];
  paginatedcajas: any[] = [];
  filteredcajas: any[] = [];

  // Paginación y Filtro
  searchText: string = '';
  currentPage: number = 1;
  itemsPerPage: number = 7;
  totalcajas: number = 0;
  private pagesToShow: number = 5;
  public Math = Math;

  // Modal de Creación
  isCreateModalOpen: boolean = false;
  newCajas: any = {
    nombre: '',
    descripcion: '',
    estado: true, // Por defecto, activo
  };
  validationErrors: string[] = [];

  // Modal de Edición
  isEditModalOpen: boolean = false;
  editedCajas: any = {};
  editValidationErrors: string[] = [];

  // Modal de visualización de detalles
  isViewModalOpen: boolean = false;
  viewedCajas: any = {};

  // Modal de Eliminación
  isDeleteModalOpen: boolean = false;
  CajasToDelete: any = {};

  isAdmin = false;

  constructor(
    private cajaService: CajaService,
    private authService: AuthService // <‑‑  NEW
  ) {}

  // ngOnInit(): void {
  //   this.fetchcajas();
  //   this.fetchRole();
  // }

  ngOnInit(): void {
    // 1️⃣  obtén el usuario y su rol mientras cambie
    this.authService.currentUser$.subscribe(user => {
      const role = user?.role ?? user?.Rol ?? null;
      this.isAdmin = role === 'Admin';
    });

    this.fetchcajas();   // <-- cargar la tabla
  }

  // fetchcajas(): void {
  //   this.cajaService.getCajas().subscribe({
  //     next: (data) => {
  //       this.cajas = data;
  //       this.applySearchFilter();
  //     },
  //     error: (error) => {
  //       console.error('Error al cargar las cajas:', error);
  //     },
  //   });
  // }
  fetchcajas(): void {
    this.cajaService.getCajas().subscribe({
      next: (data) => {
        this.cajas = data;
        this.applySearchFilter();
      },
      error: (error) => {
        //console.error('Error al cargar las cajas:', error);
      },
    });
  }

  // private fetchRole(): void {
  //   this.authService.currentUser$.pipe(take(1)).subscribe((u) => {
  //     const role = u?.role ?? u?.Rol ?? null;
  //     this.isAdmin = role === 'Admin';
  //   });
  // }

  // isAdminAccount(caja: any): boolean {
  //   return caja.CajaId === 1; //  (se suele usar el ID 1 para el “admin” en la tabla Caja)
  // }

  // toggleCajaEstado(caja: any): void {
  //   this.cajaService
  //     .toggleEstado(caja.cajaId)
  //     .pipe(take(1))
  //     .subscribe({
  //       next: (res) => (caja.Estado = res.estado),
  //       error: (err) => console.error('Error al cambiar estado', err),
  //     });
  // }

  toggleCajaEstado(caja: any): void {
    this.cajaService.toggleEstado(caja.cajaId).pipe(take(1)).subscribe({
      next: res => {
        caja.estado = res.estado;      // 1️⃣  actualiza el flag (minúscula)
        this.applySearchFilter();      // 2️⃣  vuelve a filtrar para que se re-evalue los *ngIf*
        // ‑‑ si usas ChangeDetectionStrategy.OnPush:
        // this.cdr.detectChanges();
      },
      //error: err => console.error('Error al cambiar estado', err)
    });
  }

  isAdminAccount(caja: any): boolean {
    return caja.cajaId === 1;   // <‑‑  lowercase!
  }

  // Lógica de Paginación y Filtrado
  applySearchFilter(): void {
    if (this.searchText) {
      const lowerCaseSearchText = this.searchText.toLowerCase();
      this.filteredcajas = this.cajas.filter((caja) => {
        return (caja.nombre || '').toLowerCase().includes(lowerCaseSearchText);
      });
    } else {
      this.filteredcajas = [...this.cajas];
    }
    this.totalcajas = this.filteredcajas.length;
    this.currentPage = 1; // Reinicia a la primera página con cada nueva búsqueda
    this.paginateRoles();
  }

  paginateRoles(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedcajas = this.filteredcajas.slice(startIndex, endIndex);
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
    return Math.ceil(this.totalcajas / this.itemsPerPage);
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
  validatecajas(cajas: any, isNew: boolean = true): string[] {
    const errors: string[] = [];
    if (!cajas.nombre || cajas.nombre.trim() === '') {
      errors.push('El nombre de la categoría es obligatorio.');
    }
    if (!cajas.descripcion || cajas.descripcion.trim() === '') {
      errors.push('La descripción es obligatoria.');
    }
    return errors;
  }

  // --- Lógica del Modal de Creación ---
  openCreateModal(): void {
    this.isCreateModalOpen = true;
    // this.newCajas = { nombre: '', descripcion: '', estado: true };
    // this.validationErrors = [];
  }

  closeCreateModal(): void {
    this.isCreateModalOpen = false;
    this.newCajas = { nombre: '', descripcion: '', estado: true };
    this.validationErrors = [];
  }

  createCajas(): void {
    this.validationErrors = this.validatecajas(this.newCajas);
    if (this.validationErrors.length > 0) {
      return;
    }
    this.cajaService
      .createCaja(this.newCajas)
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          //console.log('Categoría creada exitosamente:', response);
          this.closeCreateModal();
          this.fetchcajas();
        },
        error: (error) => {
          //console.error('Error al crear la categoría:', error);
          if (error.status === 400 && error.error.errors) {
            this.validationErrors = Object.values(
              error.error.errors
            ).flat() as string[];
          } else {
            this.validationErrors = [
              'Error al crear la categoría. Intente de nuevo más tarde.',
            ];
          }
        },
      });
  }

  // --- Lógica del Modal de Edición ---
  openEditModal(caja: any): void {
    this.isEditModalOpen = true;
    this.editedCajas = { ...caja };
    this.editValidationErrors = [];
  }

  closeEditModal(): void {
    this.isEditModalOpen = false;
  }

  updateCajas(): void {
    this.editValidationErrors = this.validatecajas(this.editedCajas, false);
    if (this.editValidationErrors.length > 0) {
      return;
    }

    // --- Línea que debes corregir ---
    // Cambia `this.editedCajas.id` por `this.editedCajas.cajaProveedorId`
    this.cajaService
      .updateCaja(this.editedCajas.cajaId, this.editedCajas)
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          //console.log('Caja actualizada exitosamente:', response);
          this.closeEditModal();
          this.fetchcajas();
        },
        error: (error) => {
          //console.error('Error al actualizar la caja:', error);
          if (error.status === 400 && error.error.errors) {
            this.editValidationErrors = Object.values(
              error.error.errors
            ).flat() as string[];
          } else {
            this.editValidationErrors = [
              'Error al actualizar la categoría. Intente de nuevo más tarde.',
            ];
          }
        },
      });
  }

  // --- Lógica del Modal de Visualización de Detalles ---
  // Lógica del Modal de Visualización
  openViewModal(caja: any): void {
    this.isViewModalOpen = true;
    this.viewedCajas = { ...caja }; // Copia el objeto para mostrar sus datos
  }

  closeViewModal(): void {
    this.isViewModalOpen = false;
    this.viewedCajas = {}; // Opcional: Limpia los datos al cerrar el modal
  }

  // --- Lógica del Modal de Eliminación ---
  openDeleteModal(caja: any): void {
    this.isDeleteModalOpen = true;
    this.CajasToDelete = caja;
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen = false;
  }

  deleteCajas(): void {
    if (!this.CajasToDelete || !this.CajasToDelete.cajaId) {
      //console.error('No se ha seleccionado una categoría para eliminar.');
      return;
    }
    this.cajaService
      .deleteCaja(this.CajasToDelete.cajaId)
      .pipe(take(1))
      .subscribe({
        next: () => {
          // La API no siempre devuelve un 'response' en DELETE, así que no lo usamos.
          //console.log('Categoría eliminada exitosamente.');
          this.closeDeleteModal();
          this.fetchcajas();
        },
        error: (error) => {
          //console.error('Error al eliminar la categoría:', error);
          alert('Error al eliminar la categoría. Intente de nuevo más tarde.');
          // No se cierra el modal aquí, para que el usuario pueda ver la alerta antes de que se cierre.
        },
      });
  }
}
