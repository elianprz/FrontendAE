import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { CateproductoService } from '../../services/cateproducto.service';
import { take } from 'rxjs';

@Component({
  selector: 'app-cateproducto',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './cateproducto.html',
  styleUrl: './cateproducto.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class Cateproducto implements OnInit {
  productos: any[] = [];
  paginatedproductos: any[] = [];
  filteredproductos: any[] = [];

  // Paginación y Filtro
  searchText: string = '';
  currentPage: number = 1;
  itemsPerPage: number = 7;
  totalproductos: number = 0;
  private pagesToShow: number = 5;
  public Math = Math;

  // Modal de Creación
  isCreateModalOpen: boolean = false;
  newCatproducto: any = {
    nombre: '',
    descripcion: '',
    estado: true, // Por defecto, activo
  };
  validationErrors: string[] = [];

  // Modal de Edición
  isEditModalOpen: boolean = false;
  editedCatproducto: any = {};
  editValidationErrors: string[] = [];

  // Modal de visualización de detalles
  isViewModalOpen: boolean = false;
  viewedCatproducto: any = {};

  // Modal de Eliminación
  isDeleteModalOpen: boolean = false;
  cateproductoToDelete: any = {};

  constructor(private CateproductoService: CateproductoService) {}

  ngOnInit(): void {
    this.fetchproductos();
  }

  fetchproductos(): void {
    this.CateproductoService.getProductos().subscribe({
      next: (data) => {
        this.productos = data;
        this.applySearchFilter();
      },
      error: (error) => {
        //console.error('Error al cargar las categorías de proveedores:', error);
      },
    });
  }

  // Lógica de Paginación y Filtrado
  applySearchFilter(): void {
    if (this.searchText) {
      const lowerCaseSearchText = this.searchText.toLowerCase();
      this.filteredproductos = this.productos.filter((Producto) => {
        return (Producto.nombre || '')
          .toLowerCase()
          .includes(lowerCaseSearchText);
      });
    } else {
      this.filteredproductos = [...this.productos];
    }
    this.totalproductos = this.filteredproductos.length;
    this.currentPage = 1; // Reinicia a la primera página con cada nueva búsqueda
    this.paginateRoles();
  }

  paginateRoles(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedproductos = this.filteredproductos.slice(
      startIndex,
      endIndex
    );
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
    return Math.ceil(this.totalproductos / this.itemsPerPage);
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
  validateCatproveedor(catproveedor: any, isNew: boolean = true): string[] {
    const errors: string[] = [];
    if (!catproveedor.nombre || catproveedor.nombre.trim() === '') {
      errors.push('El nombre de la categoría es obligatorio.');
    }
    if (!catproveedor.descripcion || catproveedor.descripcion.trim() === '') {
      errors.push('La descripción es obligatoria.');
    }
    return errors;
  }

  // --- Lógica del Modal de Creación ---
  openCreateModal(): void {
    this.isCreateModalOpen = true;
    // this.newCatproducto = { nombre: '', descripcion: '', estado: true };
    // this.validationErrors = [];
  }

  closeCreateModal(): void {
    this.isCreateModalOpen = false;
    this.newCatproducto = { nombre: '', descripcion: '', estado: true };
    this.validationErrors = [];
  }

  createCatproducto(): void {
    this.validationErrors = this.validateCatproveedor(this.newCatproducto);
    if (this.validationErrors.length > 0) {
      return;
    }
    this.CateproductoService.createProductos(this.newCatproducto)
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          //console.log('Categoría creada exitosamente:', response);
          this.closeCreateModal();
          this.fetchproductos();
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
  openEditModal(Producto: any): void {
    this.isEditModalOpen = true;
    this.editedCatproducto = { ...Producto };
    this.editValidationErrors = [];
  }

  closeEditModal(): void {
    this.isEditModalOpen = false;
  }

  updateCatproducto(): void {
    this.editValidationErrors = this.validateCatproveedor(
      this.editedCatproducto,
      false
    );
    if (this.editValidationErrors.length > 0) {
      return;
    }

    // --- Línea que debes corregir ---
    // Cambia `this.editedCatproducto.id` por `this.editedCatproducto.ProductoProveedorId`
    this.CateproductoService.updateProducto(
      this.editedCatproducto.categoriaId,
      this.editedCatproducto
    )
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          //console.log('Producto actualizada exitosamente:', response);
          this.closeEditModal();
          this.fetchproductos();
        },
        error: (error) => {
          //console.error('Error al actualizar el producto:', error);
          if (error.status === 400 && error.error.errors) {
            this.editValidationErrors = Object.values(
              error.error.errors
            ).flat() as string[];
          } else {
            this.editValidationErrors = [
              'Error al actualizar el producto. Intente de nuevo más tarde.',
            ];
          }
        },
      });
  }

  // --- Lógica del Modal de Visualización de Detalles ---
  // Lógica del Modal de Visualización
  openViewModal(Producto: any): void {
    this.isViewModalOpen = true;
    this.viewedCatproducto = { ...Producto }; // Copia el objeto para mostrar sus datos
  }

  closeViewModal(): void {
    this.isViewModalOpen = false;
    this.viewedCatproducto = {}; // Opcional: Limpia los datos al cerrar el modal
  }

  // --- Lógica del Modal de Eliminación ---
  openDeleteModal(Producto: any): void {
    this.isDeleteModalOpen = true;
    this.cateproductoToDelete = Producto;
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen = false;
  }

  deleteCatproducto(): void {
    if (!this.cateproductoToDelete || !this.cateproductoToDelete.categoriaId) {
      //console.error('No se ha seleccionado una categoría para eliminar.');
      return;
    }
    this.CateproductoService.deleteProducto(
      this.cateproductoToDelete.categoriaId
    )
      .pipe(take(1))
      .subscribe({
        next: () => {
          // La API no siempre devuelve un 'response' en DELETE, así que no lo usamos.
          //console.log('Categoría eliminada exitosamente.');
          this.closeDeleteModal();
          this.fetchproductos();
        },
        error: (error) => {
          //console.error('Error al eliminar la categoría:', error);
          alert('Error al eliminar la categoría. Intente de nuevo más tarde.');
          // No se cierra el modal aquí, para que el usuario pueda ver la alerta antes de que se cierre.
        },
      });
  }
}
