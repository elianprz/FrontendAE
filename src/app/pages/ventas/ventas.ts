import {
  Component,
  OnInit,
  OnDestroy,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VentasService } from '../../services/ventas.service';
// ✅ Importa el servicio para obtener productos
import { CatalogoService } from '../../services/catalogo.service';
import { Subscription, Observable, of } from 'rxjs'; // ✅ Importa 'of' para el manejo de errores
import { take, tap, catchError } from 'rxjs/operators'; // ✅ Importa 'tap' y 'catchError'
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-ventas',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, DatePipe],
  templateUrl: './ventas.html',
  styleUrl: './ventas.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class Ventas implements OnInit, OnDestroy {
  ventas: any[] = [];
  ventasAgrupadas: any[] = [];
  filteredVentas: any[] = [];
  paginatedVentas: any[] = [];

  productos: any[] = [];
  productosMap: { [key: number]: any } = {};

  searchText: string = '';
  currentPage: number = 1;
  itemsPerPage: number = 5;
  totalVentas: number = 0;
  pagesToShow: number = 5;

  // ✅ Nuevas variables para controlar los modales
  isViewModalOpen: boolean = false;
  isEditModalOpen: boolean = false;
  isDeleteModalOpen: boolean = false;

  // ✅ Variables para almacenar los datos de la venta seleccionada
  viewedVenta: any | null = null;
  editedVenta: any | null = null;
  ventaToDelete: any | null = null;
  editValidationErrors: string[] = [];

  // ✅ Lista de estados de venta predefinidos
  estadosVenta: string[] = [];

  public Math = Math;
  private ventasSubscription!: Subscription;

  toastVisible: boolean = false;
  toastMessage: string = '';
  toastType: 'success' | 'error' = 'success';

  constructor(
    private ventasService: VentasService,
    // ✅ CLAVE: Asegúrate de que CatalogoService está inyectado en el constructor
    private catalogoService: CatalogoService
  ) {}

  ngOnInit(): void {
    this.fetchProductos().subscribe(() => {
      this.fetchVentas();
    });
  }

  ngOnDestroy(): void {
    if (this.ventasSubscription) {
      this.ventasSubscription.unsubscribe();
    }
  }

  private showToast(message: string, type: 'success' | 'error'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.toastVisible = true;
    setTimeout(() => {
      this.toastVisible = false;
    }, 5000);
  }

  fetchProductos(): Observable<any> {
    return this.catalogoService
      .getProductos()
      .pipe(take(1))
      .pipe(
        tap((data) => {
          this.productos = data;
          this.productosMap = this.productos.reduce((map, producto) => {
            map[producto.productoId] = producto;
            return map;
          }, {});
        }),
        catchError((error) => {
          console.error('Error al cargar los productos:', error);
          this.showToast(
            'Error al cargar los productos. Intente de nuevo.',
            'error'
          );
          return of([]);
        })
      );
  }

  fetchVentas(): void {
    this.ventasService
      .getVentas()
      .pipe(take(1))
      .subscribe({
        next: (data) => {
          this.ventas = data;
          this.agruparVentasPorCodigo();
        },
        error: (error) => {
          console.error('Error al cargar las ventas:', error);
          this.showToast('Error al cargar el historial de ventas.', 'error');
        },
      });
  }

  getEstadosDesdeBackend(): void {
    const estadosDesdeBackend = this.ventas
      .map((v) => v.estadoVenta)
      .filter((value, index, self) => value && self.indexOf(value) === index);
    const estadosPredefinidos = ['Pendiente', 'Finalizada', 'Cancelada'];
    this.estadosVenta = [
      ...new Set([...estadosPredefinidos, ...estadosDesdeBackend]),
    ];
  }

  agruparVentasPorCodigo(): void {
    const grupos: { [key: string]: any } = {};

    this.ventas.forEach((venta) => {
      const codigoVenta = venta.codigoVenta;

      // Combina los detalles de la venta con la información del producto
      const detallesConProductos = venta.detalleVentas.map((detalle: any) => {
        const producto = this.productosMap[detalle.productoId];
        return {
          ...detalle,
          producto: producto
            ? {
                nombre: producto.nombre,
                descripcion: producto.descripcion,
                imagenUrl: producto.imagenUrl,
              }
            : null,
        };
      });

      if (codigoVenta) {
        if (!grupos[codigoVenta]) {
          grupos[codigoVenta] = {
            ventaId: venta.ventaId,
            codigoVenta: codigoVenta,
            fecha: venta.fechaVenta,
            total: venta.total,
            efectivoRecibido: venta.efectivoRecibido,
            cambio: venta.cambio,
            estado: venta.estadoVenta, // Usa la propiedad estadoVenta del backend
            detalles: detallesConProductos,
          };
        } else {
          // Si ya existe la venta agrupada, simplemente agrega los detalles
          grupos[codigoVenta].detalles.push(...detallesConProductos);
        }
      }
    });

    this.ventasAgrupadas = Object.values(grupos);
    this.getEstadosDesdeBackend(); // ✅ Carga los estados después de agrupar
    this.applyFiltersAndSearch();
  }

  applyFiltersAndSearch(): void {
    let tempVentas = [...this.ventasAgrupadas];

    if (this.searchText) {
      const lowerCaseSearchText = this.searchText.toLowerCase();
      tempVentas = tempVentas.filter((venta) => {
        const ventaFields = `
          ${venta.codigoVenta || ''}
          ${venta.fecha || ''}
          ${venta.estado || ''}
          ${venta.total || ''}
        `;
        return ventaFields.toLowerCase().includes(lowerCaseSearchText);
      });
    }

    this.filteredVentas = tempVentas;
    this.totalVentas = this.filteredVentas.length;
    this.currentPage = 1;
    this.paginateVentas();
  }

  paginateVentas(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedVentas = this.filteredVentas.slice(startIndex, endIndex);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.paginateVentas();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.paginateVentas();
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.paginateVentas();
    }
  }

  get totalPages(): number {
    return Math.ceil(this.totalVentas / this.itemsPerPage);
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

  eliminarVenta(ventaId: number): void {
    if (
      confirm(
        '¿Estás seguro de que deseas eliminar esta venta? Esta acción no se puede deshacer.'
      )
    ) {
      this.ventasService
        .deleteVenta(ventaId)
        .pipe(take(1))
        .subscribe({
          next: () => {
            this.showToast('Venta eliminada con éxito.', 'success');
            this.fetchVentas();
          },
          error: (error) => {
            console.error('Error al eliminar la venta:', error);
            this.showToast(
              'Error al eliminar la venta. Inténtalo de nuevo.',
              'error'
            );
          },
        });
    }
  }

  // Métodos para el diálogo de Ver
  openViewModal(venta: any): void {
    this.viewedVenta = { ...venta };
    this.isViewModalOpen = true;
  }

  closeViewModal(): void {
    this.isViewModalOpen = false;
    this.viewedVenta = null;
  }

  // Métodos para el diálogo de Editar
  openEditModal(venta: any): void {
    this.editedVenta = { ...venta };
    this.editValidationErrors = [];
    this.isEditModalOpen = true;
  }

  updateVenta(): void {
    if (!this.editedVenta || !this.editedVenta.ventaId) {
      return;
    }

    this.editValidationErrors = [];

    // ✅ Validación de los campos
    if (!this.editedVenta.estado || this.editedVenta.estado.trim() === '') {
      this.editValidationErrors.push(
        'El estado de la venta no puede estar vacío.'
      );
    }

    if (this.editValidationErrors.length > 0) {
      return;
    }

    // ✅ Crea un objeto para el payload con los campos que el backend necesita.
    // Esto es crucial para evitar el error 400.
    const payload = {
    ventaId: this.editedVenta.ventaId,
    codigoVenta: this.editedVenta.codigoVenta,
    fechaVenta: this.editedVenta.fecha, // Asegúrate de que el formato de fecha sea correcto
    total: this.editedVenta.total,
    efectivoRecibido: this.editedVenta.efectivoRecibido,
    cambio: this.editedVenta.cambio,
    estadoVenta: this.editedVenta.estado, // Esto es lo que estás cambiando
    detalleVentas: this.editedVenta.detalles // La API podría necesitar los detalles para validación
};

    this.ventasService
      .updateVenta(this.editedVenta.ventaId, payload)
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          this.showToast('Venta actualizada con éxito.', 'success');
          this.closeEditModal();
          this.fetchVentas();
        },
        error: (error) => {
          console.error('Error al actualizar la venta:', error);
          this.showToast('Error al actualizar la venta.', 'error');
        },
      });
  }

  closeEditModal(): void {
    this.isEditModalOpen = false;
    this.editedVenta = null;
    this.editValidationErrors = [];
  }

  // ✅ Métodos para el diálogo de Eliminar
  openDeleteModal(venta: any): void {
    this.ventaToDelete = { ...venta };
    this.isDeleteModalOpen = true;
  }

  deleteVenta(): void {
    if (!this.ventaToDelete || !this.ventaToDelete.ventaId) {
      return;
    }

    this.ventasService
      .deleteVenta(this.ventaToDelete.ventaId)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.showToast('Venta eliminada con éxito.', 'success');
          this.closeDeleteModal();
          this.fetchVentas(); // Recarga la lista para reflejar el cambio
        },
        error: (error) => {
          console.error('Error al eliminar la venta:', error);
          this.showToast('Error al eliminar la venta.', 'error');
        },
      });
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen = false;
    this.ventaToDelete = null;
  }
}
