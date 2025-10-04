import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
// ⚠️ Servicios que debes crear:
import { ComprasService } from '../../services/compras.service';
import { ProveedorService } from '../../services/proveedor.service';

import { take } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-compras',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  providers: [DatePipe],
  templateUrl: './compras.html', // Asumiendo que usarás un template similar al de Inventario
  styleUrl: './compras.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class Compras implements OnInit {
  // 1. PROPIEDADES DE DATOS Y MAPPING
  compras: any[] = [];
  proveedores: any[] = [];
  proveedoresMap: { [key: number]: string } = {}; // Para mostrar Nombre de Proveedor

  // Lógica para Proveedores Activos (estado: 1)
  /**
   * Función de ayuda para determinar si un proveedor está activo.
   * Asumimos que el objeto proveedor tiene una propiedad 'estado'.
   * @param proveedor El objeto proveedor a verificar.
   * @returns true si el estado es 1 (activo), false en caso contrario.
   */
  esProveedorActivo(item: any): boolean {
    return item.estado === true; 
  }

  /**
   * Getter que retorna solo los proveedores con estado = 1.
   * Usaremos este en los <select> de crear y editar.
   */
  get activeProveedores(): any[] {
    // Filtra la lista completa de proveedores usando la función auxiliar.
    return this.proveedores.filter(this.esProveedorActivo);
  }

  // 2. ESTADO DE UI Y VALIDACIÓN
  public validationErrors: string[] = [];
  searchText: string = '';
  filteredCompras: any[] = [];
  activeFilters: { [key: string]: Set<any> } = {};

  // 3. PAGINACIÓN
  currentPage: number = 1;
  itemsPerPage: number = 7;
  totalCompras: number = 0;
  paginatedCompras: any[] = [];
  private pagesToShow: number = 5;
  public Math = Math;

  // 4. MODALES Y OBJETOS DE TRABAJO
  isCreateModalOpen: boolean = false;
  newCompra: any = {
    fechaCompra: null, // se asigna al crear (puede quedar null)
    observacion: '',
    nombre: '',
    descripcion: '',
    estado: true,
    stock: 0,
    precioAdquisicion: 0,
    precioVenta: 0,
    proveedorId: null,
    total: 0, // será calculado
  };

  isEditModalOpen: boolean = false;
  editedCompra: any = {};
  isViewModalOpen: boolean = false;
  viewedCompra: any = {};
  isDeleteModalOpen: boolean = false;
  compraToDelete: any = {};

  // Nota: Las propiedades selectedFile, selectedFilePreview, etc., han sido eliminadas.

  constructor(
    private comprasService: ComprasService,
    private proveedorService: ProveedorService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.getComprasWithProveedores();
  }

  // ----------------------------------------------------
  // 	MÉTODOS DE CARGA (KEY: Mapear ID a Nombre de Proveedor)
  // ----------------------------------------------------
  getComprasWithProveedores(): void {
    // Carga paralela de Compras y Proveedores
    forkJoin({
      compras: this.comprasService.getCompras(),
      proveedores: this.proveedorService.getProveedores(),
    })
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          this.proveedores = response.proveedores;

          // Crear el mapa: ProveedorId -> Nombre
          this.proveedores.forEach((proveedor: any) => {
            // Asumiendo que el proveedor tiene propiedades 'proveedorId' y 'nombre'
            this.proveedoresMap[proveedor.proveedorId] = proveedor.empresa;
          });

          // Mapear las compras para agregar el nombre del proveedor
          this.compras = response.compras.map((compra: any) => {
            const nombreProveedor =
              this.proveedoresMap[compra.proveedorId] || 'Sin Proveedor';
            return {
              ...compra,
              proveedorNombre: nombreProveedor,
            };
          });

          this.applyFiltersAndSearch();
        },
        error: (error) => {
          console.error('Error al cargar datos:', error);
          // Manejo de errores aquí
        },
      });
  }

  // ----------------------------------------------------
  // 	MÉTODOS DE CREACIÓN Y EDICIÓN (CRUD)
  // ----------------------------------------------------

  // Creación de una nueva compra
  async createCompra(): Promise<void> {
    this.validationErrors = [];

    // 1️⃣ Validaciones de campos obligatorios
    if (
      !this.newCompra.nombre ||
      this.newCompra.stock <= 0 ||
      this.newCompra.precioAdquisicion <= 0 ||
      this.newCompra.proveedorId === null
    ) {
      this.validationErrors.push(
        'Nombre, Stock, Precio de Adquisición y Proveedor son campos obligatorios y deben ser mayores a 0.'
      );
      return;
    }

    // 2️⃣ Construir el objeto y enviar al backend
    const compraToCreate = {
      ...this.newCompra,
      // Asegurar tipos numéricos y calcular el Total
      ...this.newCompra,
      stock: Number(this.newCompra.stock),
      precioAdquisicion: Number(this.newCompra.precioAdquisicion),
      precioVenta: Number(this.newCompra.precioVenta),
      proveedorId: Number(this.newCompra.proveedorId),
      // El back-end puede aceptar ya sea null o una fecha; si quieres enviar la fecha actual:
      // fechaCompra: new Date().toISOString(),
      total:
        Number(this.newCompra.stock) * Number(this.newCompra.precioAdquisicion),
      estado: this.newCompra.estado,
    };

    this.comprasService
      .addCompra(compraToCreate)
      .pipe(take(1))
      .subscribe({
        next: (resp) => {
          console.log('Compra creada', resp);
          this.closeCreateModal();
          this.getComprasWithProveedores();
        },
        error: (err) => {
          console.error(err);
          this.validationErrors = ['Ocurrió un error al crear la compra.'];
        },
      });
  }

  async updateCompra(): Promise<void> {
    this.validationErrors = [];

    // ---------- 	VALIDACIONES ----------
    if (
      !this.editedCompra.compraId ||
      !this.editedCompra.nombre ||
      this.editedCompra.stock <= 0 ||
      this.editedCompra.precioAdquisicion <= 0 ||
      this.editedCompra.proveedorId === null
    ) {
      this.validationErrors.push(
        'Asegúrese de llenar todos los campos obligatorios.'
      );
      return;
    }

    // ---------- 	PREPARAR OBJETO PARA EL BACKEND ----------
    const compraToUpdate = {
      // Copiamos todo lo que ya tenemos (incluye observacion, estado, descripción, etc.)
      ...this.editedCompra,

      // Nos aseguramos que los tipos sean correctos
      stock: Number(this.editedCompra.stock),
      precioAdquisicion: Number(this.editedCompra.precioAdquisicion),
      precioVenta: Number(this.editedCompra.precioVenta),
      proveedorId: Number(this.editedCompra.proveedorId),

      // Convertimos la fecha del input (yyyy-MM-dd) a ISO (yyyy-MM-ddTHH:mm:ssZ)
      fechaCompra: this.parseInputFecha(this.editedCompra.fechaCompra),

      // Re-calculamos el total (el back-end lo usa para persistir)
      total:
        Number(this.editedCompra.stock) *
        Number(this.editedCompra.precioAdquisicion),

      // Observación (puede venir vacía)
      observacion: this.editedCompra.observacion ?? '',
    };

    this.comprasService
      .updateCompra(this.editedCompra.compraId, compraToUpdate)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.closeEditModal();
          this.getComprasWithProveedores();
        },
        error: (err) => {
          console.error('Error al actualizar la compra:', err);
          // Mostramos el mensaje de error que nos devuelve el backend (si lo tiene)
          this.validationErrors = ['Ocurrió un error al actualizar la compra.'];
        },
      });
  }

  private parseInputFecha(value: string | null | undefined): string {
    if (!value) return '';
    const date = new Date(value); // interpreta como 00:00h en zona local
    return date.toISOString(); // 2025-10-02T00:00:00.000Z
  }

  // Eliminación de una compra
  deleteCompra(): void {
    if (!this.compraToDelete || !this.compraToDelete.compraId) {
      console.error('No se ha seleccionado ninguna compra para eliminar.');
      return;
    }

    this.comprasService
      .deleteCompra(this.compraToDelete.compraId)
      .pipe(take(1))
      .subscribe({
        next: () => {
          console.log('Compra eliminada exitosamente.');
          this.closeDeleteModal();
          this.getComprasWithProveedores();
        },
        error: (error) => {
          console.error('Error al eliminar compra:', error);
          this.validationErrors = ['Ocurrió un error al eliminar la compra.'];
        },
      });
  }

  // ----------------------------------------------------
  // 	MÉTODOS DE MODALES Y LIMPIEZA
  // ----------------------------------------------------

  openCreateModal(): void {
    this.isCreateModalOpen = true;
    this.validationErrors = [];
    // Reiniciar nueva compra
    this.newCompra = {
      observacion: '',
      nombre: '',
      descripcion: '',
      estado: true,
      stock: 0,
      precioAdquisicion: 0,
      precioVenta: 0,
      proveedorId: null,
      total: 0,
    };
  }

  closeCreateModal(): void {
    this.isCreateModalOpen = false;
    this.validationErrors = [];
  }

  // openEditModal(compra: any): void {
  //   console.log('>>> compra que llega a modal', compra);

  //   // Copiamos la compra y *renombramos* los campos a minúscula
  //   const copia = {
  //     compraId: compra.compraId,
  //     fechaCompra: this.formatFechaParaInput(compra.fechaCompra), // yyyy-MM-dd para <input type="date">
  //     observacion: compra.observacion,
  //     nombre: compra.nombre,
  //     descripcion: compra.descripcion,
  //     estado: compra.estado,
  //     stock: compra.stock,
  //     precioAdquisicion: compra.precioAdquisicion,
  //     precioVenta: compra.precioVenta,
  //     proveedorId: compra.proveedorId,
  //     total: compra.total,
  //     // Si deseas conservar el nombre del proveedor (solo para visualización)
  //     nombreProveedor: compra.nombreProveedor,
  //   };

  //   this.editedCompra = copia;
  //   this.isEditModalOpen = true;
  //   this.validationErrors = [];
  // }
  openEditModal(compra: any): void {
    console.log('>>> compra que llega a modal', compra);

    // Aseguramos que el proveedorId sea un número (o null si es null/undefined)
    const proveedorIdNumerico = compra.proveedorId ? Number(compra.proveedorId) : null; 
    
    // Copiamos la compra y *renombramos* los campos a minúscula
    const copia = {
        compraId: compra.compraId,
        fechaCompra: this.formatFechaParaInput(compra.fechaCompra),
        observacion: compra.observacion,
        nombre: compra.nombre,
        descripcion: compra.descripcion,
        estado: compra.estado,
        stock: compra.stock,
        precioAdquisicion: compra.precioAdquisicion,
        precioVenta: compra.precioVenta,
        
        // ¡CAMBIO CLAVE AQUÍ!
        proveedorId: proveedorIdNumerico, 
        
        total: compra.total,
        nombreProveedor: compra.nombreProveedor,
    };

    this.editedCompra = copia;
    
    // --- Lógica adicional de seguridad ---
    // Si la lista de proveedores activos está vacía, forzamos el ID a null
    // para que se muestre el mensaje "No hay proveedores disponibles".
    if (this.activeProveedores.length === 0) {
        this.editedCompra.proveedorId = null;
    }
    // -------------------------------------
    
    this.isEditModalOpen = true;
    this.validationErrors = [];
}

  private formatFechaParaInput(
    rawDate: string | Date | null | undefined
  ): string {
    if (!rawDate) return '';
    const dateObj = typeof rawDate === 'string' ? new Date(rawDate) : rawDate;
    const year = dateObj.getFullYear();
    const month = ('0' + (dateObj.getMonth() + 1)).slice(-2);
    const day = ('0' + dateObj.getDate()).slice(-2);
    return `${year}-${month}-${day}`; // <-- Opción A (solo fecha)
    // return `${year}-${month}-${day}T${hours}:${minutes}`; // Opción B datetime-local
  }

  closeEditModal(): void {
    this.isEditModalOpen = false;
    this.editedCompra = {};
    this.validationErrors = [];
  }

  openViewModal(compra: any): void {
    this.viewedCompra = { ...compra };
    this.isViewModalOpen = true;
  }

  closeViewModal(): void {
    this.isViewModalOpen = false;
    this.viewedCompra = {};
  }

  openDeleteModal(compra: any): void {
    this.compraToDelete = compra;
    this.isDeleteModalOpen = true;
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen = false;
    this.compraToDelete = {};
  }

  // ----------------------------------------------------
  // 	MÉTODOS DE FILTRADO Y PAGINACIÓN
  // ----------------------------------------------------

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
    let tempCompras = [...this.compras];
    if (this.searchText) {
      const lowerCaseSearchText = this.searchText.toLowerCase();
      tempCompras = tempCompras.filter((compra) => {
        // Filtrar por Nombre, Descripción o Proveedor
        const compraFields = `${compra.Nombre || ''} ${
          compra.Descripcion || ''
        } ${compra.proveedorNombre || ''}`;
        return compraFields.toLowerCase().includes(lowerCaseSearchText);
      });
    }

    for (const filterType in this.activeFilters) {
      if (this.activeFilters.hasOwnProperty(filterType)) {
        const filterSet = this.activeFilters[filterType];
        if (filterSet.size > 0) {
          tempCompras = tempCompras.filter((compra) => {
            return filterSet.has(compra[filterType]);
          });
        }
      }
    }
    this.filteredCompras = tempCompras;
    this.totalCompras = this.filteredCompras.length;
    this.currentPage = 1;
    this.paginateCompras();
  }

  paginateCompras(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedCompras = this.filteredCompras.slice(startIndex, endIndex);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.paginateCompras();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.paginateCompras();
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.paginateCompras();
    }
  }

  get totalPages(): number {
    return Math.ceil(this.totalCompras / this.itemsPerPage);
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
}