import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { DetalleVentasService } from '../../services/detalleventa.service';
import { VentasService } from '../../services/ventas.service';
import { CatalogoService } from '../../services/catalogo.service';
import { take, forkJoin } from 'rxjs';

@Component({
  selector: 'app-detalleventas',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './detalleventas.html',
  styleUrl: './detalleventas.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class Detalleventas implements OnInit {
  detalleVentas: any[] = [];
  paginatedDetalleVentas: any[] = [];
  filteredDetalleVentas: any[] = [];

  // Paginación y Filtro
  searchText: string = '';
  currentPage: number = 1;
  itemsPerPage: number = 7;
  totalDetalleVentas: number = 0;
  private pagesToShow: number = 5;
  public Math = Math;

  // Variables para el modal de visualización
  isViewModalOpen = false;
  viewedDetalleVenta: any = null;

  constructor(
    private detalleVentasService: DetalleVentasService,
    private ventasService: VentasService,
    private catalogoService: CatalogoService
  ) {}

  ngOnInit(): void {
    this.fetchDetalleVentas();
  }

  fetchDetalleVentas(): void {
    forkJoin({
      ventas: this.ventasService.getVentas().pipe(take(1)),
      productos: this.catalogoService.getProductos().pipe(take(1)),
      detalleVentas: this.detalleVentasService.getDetalleVentas().pipe(take(1)),
    }).subscribe({
      next: (results) => {
        // En este punto, los datos de los 3 servicios ya han llegado.
        //console.log('Ventas del backend:', results.ventas);
        //console.log('Productos del backend:', results.productos);
        //console.log('Detalles de ventas del backend:', results.detalleVentas);

        // Mapeamos las ventas para un acceso rápido por VentaId
        const ventasMap = new Map(
          results.ventas.map((v: any) => [v.ventaId, v])
        );

        const productosMap = new Map(
          results.productos.map((p: any) => [p.productoId, p])
        );

        this.detalleVentas = results.detalleVentas.map((dv: any) => {
          // Si tu API de DetalleVentas no retorna el ventaId, este es el problema.
          // Aquí es donde el código busca el ventaId en el objeto dv.
          const venta = ventasMap.get(dv.ventaId);
          const producto = productosMap.get(dv.productoId);

          // Si ventaId no existe en el objeto dv, venta será 'undefined'
          const fechaVenta = venta
            ? this.formatDateForDisplay(venta.fechaVenta)
            : 'N/A';

          if (!venta) {
            //console.warn(
            //  `Venta con ID ${dv.ventaId} no encontrada. Esto indica que la API de detalles de venta no está retornando el VentaId.`
            //);
          }

          return {
            ...dv,
            fechaVenta: fechaVenta,
            productoNombre: producto
              ? producto.nombre
              : 'Producto no encontrado',
          };
        });

        //console.log(
        //  'Detalles de venta listos para mostrar:',
        //  this.detalleVentas
        //);

        this.applySearchFilter();
      },
      error: (error) => {
        //console.error('Error al cargar los datos:', error);
      },
    });
  }

  // Métodos para el modal de visualización
  openViewModal(detalle: any): void {
    this.viewedDetalleVenta = detalle;
    this.isViewModalOpen = true;
  }

  closeViewModal(): void {
    this.isViewModalOpen = false;
    this.viewedDetalleVenta = null;
  }

  // Helper para convertir fecha de YYYY-MM-DD a DD-MM-YYYY
  formatDateForDisplay(dateString: string): string {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Formato de fecha inválido';
      }
      const day = ('0' + date.getDate()).slice(-2);
      const month = ('0' + (date.getMonth() + 1)).slice(-2);
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    } catch (e) {
      //console.error('Error al formatear la fecha:', e);
      return 'N/A';
    }
  }

  // Lógica de Paginación y Filtro
  applySearchFilter(): void {
    if (this.searchText) {
      const lowerCaseSearchText = this.searchText.toLowerCase();
      this.filteredDetalleVentas = this.detalleVentas.filter((detalle) => {
        return (detalle.productoNombre || '')
          .toLowerCase()
          .includes(lowerCaseSearchText);
      });
    } else {
      this.filteredDetalleVentas = [...this.detalleVentas];
    }
    this.totalDetalleVentas = this.filteredDetalleVentas.length;
    this.currentPage = 1;
    this.paginateDetalleVentas();
  }

  paginateDetalleVentas(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedDetalleVentas = this.filteredDetalleVentas.slice(
      startIndex,
      endIndex
    );
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.paginateDetalleVentas();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.paginateDetalleVentas();
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.paginateDetalleVentas();
    }
  }

  get totalPages(): number {
    return Math.ceil(this.totalDetalleVentas / this.itemsPerPage);
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
