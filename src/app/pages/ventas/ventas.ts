import {
  Component,
  OnInit,
  OnDestroy,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  ViewChild,
  PLATFORM_ID,
  Inject,
} from '@angular/core';
import { CommonModule, DatePipe, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VentasService } from '../../services/ventas.service';
// ✅ Importa el servicio para obtener productos
import { CatalogoService } from '../../services/catalogo.service';
import { Subscription, Observable, of } from 'rxjs'; // ✅ Importa 'of' para el manejo de errores
import { take, tap, catchError } from 'rxjs/operators'; // ✅ Importa 'tap' y 'catchError'
import { LucideAngularModule } from 'lucide-angular';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

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
    private catalogoService: CatalogoService,
    @Inject(PLATFORM_ID) private platformId: Object
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

  //@ViewChild('pdfContent', {static: false}) pdfContent!: ElementRef<HTMLDivElement>;
  @ViewChild('pdfContent') pdfContent!: ElementRef;

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

    // Iteramos sobre el array plano de registros de Venta (cada registro es un producto)
    this.ventas.forEach((registroVenta) => {
      const codigoVenta = registroVenta.codigoVenta;

      if (codigoVenta) {
        // 1. Crear el grupo si no existe
        if (!grupos[codigoVenta]) {
          // Almacenamos la información del encabezado de la venta (que se repite)
          // Usamos el primer registro de la venta para obtener los datos generales
          grupos[codigoVenta] = {
            ventaId: registroVenta.ventaId, // NOTA: Esto tomará el VentaId del primer registro.
            codigoVenta: codigoVenta,
            fecha: registroVenta.fechaVenta,
            total: registroVenta.total,
            efectivoRecibido: registroVenta.efectivoRecibido,
            cambio: registroVenta.cambio,
            estado: registroVenta.estadoVenta,
            detalles: [], // Inicializamos el array de detalles
          };
        }

        // 2. Crear el objeto de detalle y añadirlo al grupo
        const producto = this.productosMap[registroVenta.productoId];

        // Creamos un objeto que simula la antigua estructura de DetalleVentas
        const detalle = {
          // Campos de detalle extraídos del registro de venta unificado
          productoId: registroVenta.productoId,
          cantidad: registroVenta.cantidadVendida, // ✅ Usamos cantidadVendida
          precioUnitario: registroVenta.precioUnitario,
          subTotal: registroVenta.subTotal,

          // Información adicional para la vista (producto)
          producto: producto
            ? {
                nombre: producto.nombre,
                descripcion: producto.descripcion,
                imagenUrl: producto.imagenUrl,
                precioVenta: producto.precioVenta,
              }
            : null,
        };

        grupos[codigoVenta].detalles.push(detalle);
      }
    });

    this.ventasAgrupadas = Object.values(grupos);
    this.getEstadosDesdeBackend();
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

  // Métodos para el diálogo de Ver
  openViewModal(venta: any): void {
    this.viewedVenta = { ...venta };
    this.isViewModalOpen = true;
  }

  closeViewModal(): void {
    this.isViewModalOpen = false;
    this.viewedVenta = null;
  }

  downloadPdf(): void {
    if (isPlatformBrowser(this.platformId)) {
      const element = this.pdfContent.nativeElement;

      // 1. Clonar el elemento original
      const clonedElement = element.cloneNode(true) as HTMLElement;

      // 2. Ocultar (eliminar) los elementos con la clase 'no-print' del CLON
      const elementsToHide = clonedElement.querySelectorAll('.no-print');
      elementsToHide.forEach((el) => el.remove());

      // 💥 CLAVE 1: Mover y AÑADIR el clon al DOM
      clonedElement.style.position = 'fixed';
      clonedElement.style.top = '-9999px';
      clonedElement.style.left = '-9999px';

      // 🚀 CLAVE 2: FORZAR UN ANCHO RAZONABLE.
      // 750px es un buen ancho para que el contenido se vea bien en una página 'Letter'.
      clonedElement.style.width = '750px';
      clonedElement.style.padding = '3rem'; // Puedes ajustar el padding si es necesario

      document.body.appendChild(clonedElement); // Añádelo al DOM

      const canvasOptions = {
        scale: 2, // Mantenemos la escala en 2 para alta resolución
        useCORS: true,
        backgroundColor: '#ffffff',
        dpi: 300,
      };

      html2canvas(clonedElement, canvasOptions) // Pasa el CLON al html2canvas
        .then((canvas) => {
          // ⚠️ QUITAR el clon del DOM inmediatamente después
          clonedElement.remove();

          const imgData = canvas.toDataURL('image/jpeg', 0.98);
          const doc = new jsPDF('portrait', 'in', 'letter');

          // CÁLCULOS DE DIMENSIONES (Estos son correctos y deben mantenerse)
          const margin = 0.4;
          const imgWidth = 8.5 - 2 * margin; // Ancho de 7.7 pulgadas
          const pageHeight = 11 - 2 * margin; // Alto de 10.2 pulgadas
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          let heightLeft = imgHeight;
          let position = margin;

          // Lógica de adición de imagen y paginación
          doc.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
          // ... (el resto de tu lógica de paginación)
          while (heightLeft > 0) {
            position = heightLeft - imgHeight + margin;
            doc.addPage();
            doc.addImage(
              imgData,
              'JPEG',
              margin,
              position,
              imgWidth,
              imgHeight
            );
            heightLeft -= pageHeight;
          }

          doc.save(`Factura_${this.viewedVenta.codigoVenta}.pdf`);
        })
        .catch((err: any) => {
          clonedElement.remove();
          console.error('[PDF] Error al generar', err);
          this.showToast('Error al generar el PDF.', 'error');
        });
    } else {
      console.warn(
        'La generación de PDF no se puede realizar en el servidor (SSR).'
      );
    }
  }
  onFacturaClick(venta: Ventas): void {
    this.viewedVenta = venta;
    this.downloadPdf(); // genera PDF sin mostrar el modal
    // Si también quieres abrir el modal, llama a openViewModal(venta) antes
  }

  // Métodos para el diálogo de Editar
  openEditModal(venta: any): void {
    this.editedVenta = { ...venta };
    this.editValidationErrors = [];
    this.isEditModalOpen = true;
  }

  updateVenta(): void {
    if (!this.editedVenta || !this.editedVenta.codigoVenta) {
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
      detalleVentas: this.editedVenta.detalles, // La API podría necesitar los detalles para validación
    };

    this.ventasService
      // .updateVenta(this.editedVenta.ventaId, payload)
      .updateVentaEstado(this.editedVenta.codigoVenta, this.editedVenta.estado)
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

  // deleteVenta(): void {
  //   if (!this.ventaToDelete || !this.ventaToDelete.ventaId) {
  //     return;
  //   }

  //   this.ventasService
  //     .deleteVenta(this.ventaToDelete.ventaId)
  //     .pipe(take(1))
  //     .subscribe({
  //       next: () => {
  //         this.showToast('Venta eliminada con éxito.', 'success');
  //         this.closeDeleteModal();
  //         this.fetchVentas(); // Recarga la lista para reflejar el cambio
  //       },
  //       error: (error) => {
  //         console.error('Error al eliminar la venta:', error);
  //         this.showToast('Error al eliminar la venta.', 'error');
  //       },
  //     });
  // }
  deleteVenta(): void {
    // 1. Nos aseguramos de tener el objeto y el codigoVenta
    if (!this.ventaToDelete || !this.ventaToDelete.codigoVenta) {
      return;
    }

    // 2. Extraemos el código de la venta almacenada
    const codigoVenta = this.ventaToDelete.codigoVenta;

    // 3. Llamamos al servicio con el codigoVenta
    this.ventasService
      .deleteVenta(codigoVenta) // Llama al servicio con el codigoVenta (string)
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

  eliminarVenta(venta: any): void {
    if (
      confirm(
        '¿Estás seguro de que deseas eliminar esta VENTA COMPLETA? Esta acción no se puede deshacer.'
      )
    ) {
      // ⚠️ CLAVE: Usamos el codigoVenta del objeto agrupado
      const codigoVenta = venta.codigoVenta;

      this.ventasService
        // ✅ Llamamos al servicio con el string codigoVenta
        .deleteVenta(codigoVenta)
        .pipe(take(1))
        .subscribe({
          next: () => {
            this.showToast('Venta completa eliminada con éxito.', 'success');
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

  closeDeleteModal(): void {
    this.isDeleteModalOpen = false;
    this.ventaToDelete = null;
  }
}
