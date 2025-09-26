// import { Component } from '@angular/core';

// @Component({
//   selector: 'app-detallecompras',
//   imports: [],
//   templateUrl: './detallecompras.html',
//   styleUrl: './detallecompras.css'
// })
// export class Detallecompras {

// }
import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { DetalleComprasService } from '../../services/detallecompra.service';
import { ComprasService } from '../../services/compras.service';
import { CatalogoService } from '../../services/catalogo.service';
import { take, forkJoin } from 'rxjs';

@Component({
  selector: 'app-detallecompras',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './detallecompras.html',
  styleUrl: './detallecompras.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class Detallecompras implements OnInit {
  detalleCompras: any[] = [];
  paginatedDetalleCompras: any[] = [];
  filteredDetalleCompras: any[] = [];

  // Paginación y Filtro con sufijo 5
  searchText5: string = '';
  currentPage5: number = 1;
  itemsPerPage5: number = 7;
  totalDetalleCompras: number = 0;
  private pagesToShow5: number = 5;
  public Math5 = Math;

  // Variables para el modal de visualización (similares a DetalleVentas)
  isViewModalOpen = false;
  viewedDetalleCompra: any = null;

  constructor(
    private detalleComprasService: DetalleComprasService,
    private comprasService: ComprasService,
    private catalogoService: CatalogoService
  ) {}

  ngOnInit(): void {
    this.fetchDetalleCompras();
  }

  fetchDetalleCompras(): void {
    forkJoin({
      compras: this.comprasService.getCompras().pipe(take(1)),
      productos: this.catalogoService.getProductos().pipe(take(1)),
      detalleCompras: this.detalleComprasService.getDetalleCompras().pipe(take(1)),
    }).subscribe({
      next: (results) => {
        // Mapeamos las compras para un acceso rápido por CompraId
        const comprasMap = new Map(
          results.compras.map((c: any) => [c.compraId, c])
        );

        const productosMap = new Map(
          results.productos.map((p: any) => [p.productoId, p])
        );

        this.detalleCompras = results.detalleCompras.map((dc: any) => {
          const compra = comprasMap.get(dc.compraId);
          const producto = productosMap.get(dc.productoId);

          const fechaCompra = compra
            ? this.formatDateForDisplay(compra.fechaCompra)
            : 'N/A';

          return {
            ...dc,
            fechaCompra: fechaCompra,
            productoNombre: producto
              ? producto.nombre
              : 'Producto no encontrado',
          };
        });

        this.applySearchFilter5();
      },
      error: (error) => {
        console.error('Error al cargar los datos:', error);
      },
    });
  }

  // Métodos para el modal de visualización
  openViewModal(detalle: any): void {
    this.viewedDetalleCompra = detalle;
    this.isViewModalOpen = true;
  }

  closeViewModal(): void {
    this.isViewModalOpen = false;
    this.viewedDetalleCompra = null;
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
      console.error('Error al formatear la fecha:', e);
      return 'N/A';
    }
  }

  // Lógica de Paginación y Filtro con sufijo 5
  applySearchFilter5(): void {
    if (this.searchText5) {
      const lowerCaseSearchText = this.searchText5.toLowerCase();
      this.filteredDetalleCompras = this.detalleCompras.filter((detalle) => {
        return (
          (detalle.productoNombre || '').toLowerCase().includes(lowerCaseSearchText) ||
          (detalle.fechaCompra || '').toLowerCase().includes(lowerCaseSearchText)
        );
      });
    } else {
      this.filteredDetalleCompras = [...this.detalleCompras];
    }
    this.totalDetalleCompras = this.filteredDetalleCompras.length;
    this.currentPage5 = 1;
    this.paginateDetalleCompras5();
  }

  paginateDetalleCompras5(): void {
    const startIndex = (this.currentPage5 - 1) * this.itemsPerPage5;
    const endIndex = startIndex + this.itemsPerPage5;
    this.paginatedDetalleCompras = this.filteredDetalleCompras.slice(
      startIndex,
      endIndex
    );
  }

  goToPage5(page: number): void {
    if (page >= 1 && page <= this.totalPages5) {
      this.currentPage5 = page;
      this.paginateDetalleCompras5();
    }
  }

  nextPage5(): void {
    if (this.currentPage5 < this.totalPages5) {
      this.currentPage5++;
      this.paginateDetalleCompras5();
    }
  }

  prevPage5(): void {
    if (this.currentPage5 > 1) {
      this.currentPage5--;
      this.paginateDetalleCompras5();
    }
  }

  get totalPages5(): number {
    return Math.ceil(this.totalDetalleCompras / this.itemsPerPage5);
  }

  get pages5(): (number | string)[] {
    const pages: (number | string)[] = [];
    const total = this.totalPages5;
    const current = this.currentPage5;
    const numPagesToShow = this.pagesToShow5;

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

  handlePageClick5(page: number | string): void {
    if (typeof page === 'number') {
      this.goToPage5(page);
    }
  }
}