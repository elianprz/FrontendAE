import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CatalogoService } from '../../services/catalogo.service';
import { VentasService } from '../../services/ventas.service';
import { CajasesionService } from '../../services/cajasesion.service';
import { LucideAngularModule } from 'lucide-angular';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { take } from 'rxjs/operators';
@Component({
  selector: 'app-catalogo',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './catalogo.html',
  styleUrl: './catalogo.css',
})
export class Catalogo implements OnInit, OnDestroy {
  // Variables existentes
  productos: any[] = [];
  filteredproductos: any[] = [];
  searchText: string = '';
  currentPage: number = 1;
  totalproductos: number = 0;

  // Nuevas variables para la venta
  carrito: any[] = [];
  totalVenta: number = 0;
  efectivoRecibido: number = 0;
  cambio: number = 0;
  estadoVenta: string = 'Finalizada'; // O el estado por defecto que desees
  usuarioId: number = 1; // Reemplazar con el ID del usuario logueado

  // Nuevo: Mapa para almacenar la cantidad de cada producto
  cantidadProducto: { [key: number]: number } = {};

  // Sidebar
  sidebarVisible: boolean = false;

  // Suscripciones
  private carritoSubscription!: Subscription;

  //More
  cajaSesiones: any[] = []; // ✅ Propiedad para almacenar las sesiones de caja
  cajaSesionId: number | null = null; // ✅ Propiedad para el ID de la sesión seleccionada

  toastVisible: boolean = false;
  toastMessage: string = '';
  toastType: 'success' | 'error' = 'success';

  constructor(
    private catalogoService: CatalogoService,
    private ventasService: VentasService,
    private CajaSesionService: CajasesionService,
    private authService: AuthService
  ) {
    // ✅ Cambio de `user.usuarioId` a `user.userId`
    const user = this.authService.getCurrentUser();
    this.usuarioId = user ? user.userId : 0;
  }

  ngOnInit(): void {
    this.fetchProductos();
    this.carritoSubscription = this.ventasService.carrito$.subscribe(
      (items) => {
        this.carrito = items;
        this.totalVenta = this.ventasService.getCarritoTotal();
        this.calcularCambio();
      }
    );
    this.getCajaSesionesAbiertas();
  }

  ngOnDestroy(): void {
    if (this.carritoSubscription) {
      this.carritoSubscription.unsubscribe();
    }
  }

  private esActivo(p: any): boolean {
    return p.estado === true || p.estado === 1;
  }

  private showToast(message: string, type: 'success' | 'error'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.toastVisible = true;
    // Ocultar la notificación automáticamente después de 5 segundos
    setTimeout(() => {
      this.toastVisible = false;
    }, 5000);
  }

  private getCajaSesionesAbiertas(): void {
    this.CajaSesionService.getCajasesiones()
      .pipe(take(1))
      .subscribe({
        next: (sesiones) => {
          this.cajaSesiones = sesiones;
          if (this.cajaSesiones.length > 0) {
            this.cajaSesionId = this.cajaSesiones[0].cajaSesionId;
          }
        },
        error: (error) => {
          console.error('Error al obtener sesiones de caja:', error);
          // ✅ Añade la llamada a showToast aquí
          this.showToast(
            'Error al obtener sesiones de caja. Intente de nuevo más tarde.',
            'error'
          );
        },
      });
  }

  // fetchProductos(): void {
  //   this.catalogoService.getProductos().subscribe({
  //     next: (data) => {
  //       this.productos = data;
  //       this.applySearchFilter();
  //     },
  //     error: (error) => {
  //       console.error('Error al cargar los productos:', error);
  //       // ✅ Añade la llamada a showToast aquí
  //       this.showToast('Error al cargar los productos.', 'error');
  //     },
  //   });
  // }
  fetchProductos(): void {
    this.catalogoService.getProductos().subscribe({
      next: (data) => {
        this.productos = data; // Guardamos **todas** las entradas
        this.applySearchFilter(); // El filtro activo hace la parte “activa”
      },
      error: (e) => {
        console.error('Error al cargar los productos:', e);
        this.showToast('Error al cargar los productos.', 'error');
      },
    });
  }

  private isProductoActivo(p: any): boolean {
    // Si el servidor devuelve `estado` como string 'Activo' / 'Inactivo'
    if (typeof p.estado === 'string') {
      return p.estado.trim().toLowerCase() === 'activo';
    }

    // Si el servidor devuelve `estado` como booleano true/false
    return !!p.estado;
  }

  // Busqueda

  // applySearchFilter(): void {
  //   if (this.searchText) {
  //     const lowerCaseSearchText = this.searchText.toLowerCase();

  //     this.filteredproductos = this.productos.filter((caja) => {
  //       return (caja.nombre || '').toLowerCase().includes(lowerCaseSearchText);
  //     });
  //   } else {
  //     this.filteredproductos = [...this.productos];
  //   }

  //   this.totalproductos = this.filteredproductos.length;

  //   this.currentPage = 1; // Reinicia a la primera página con cada nueva búsqueda
  // }
  applySearchFilter(): void {
  const term = this.searchText.trim().toLowerCase();

  if (term) {
    this.filteredproductos = this.activeProductos.filter((p) =>
      (p.nombre ?? '').toLowerCase().includes(term)
    );
  } else {
    this.filteredproductos = [...this.activeProductos];
  }

  this.totalproductos = this.filteredproductos.length;
  this.currentPage = 1;
}

  // Nuevo: Método para actualizar la cantidad
  onCantidadChange(productoId: number, cantidad: number): void {
    // Asegurarse de que la cantidad sea al menos 1
    this.cantidadProducto[productoId] = Math.max(1, cantidad);
  }

  addToCarrito(producto: any, cantidad: number) {
    // Busca si el producto ya está en el carrito
    const itemEnCarrito = this.carrito.find(
      (item) => item.productoId === producto.productoId
    );

    if (itemEnCarrito) {
      // Si el producto ya existe, actualiza su cantidad
      itemEnCarrito.cantidad += cantidad;
    } else {
      // Si el producto no existe, lo añade como un nuevo item
      this.carrito.push({
        ...producto,
        cantidad: cantidad,
      });
    }

    // Llama a la función que recalcula el total y el cambio
    this.calcularTotalVenta();
    this.calcularCambio();
  }

  // Generamos la venta
  generarVenta(): void {
    // 1. Validaciones
    if (this.carrito.length === 0) {
      this.showToast('El carrito está vacío.', 'error');
      return;
    }
    if (this.efectivoRecibido < this.totalVenta) {
      this.showToast('El efectivo recibido es insuficiente.', 'error');
      return;
    }
    if (this.cajaSesionId === null) {
      this.showToast('Debe seleccionar una sesión de caja.', 'error');
      return;
    }

    // Genera un único código de venta para toda la transacción
    const codigoVenta = this.generarCodigoVenta();

    // 2. Prepara los datos para el DTO
    const ventaData = {
      total: this.totalVenta,
      efectivoRecibido: this.efectivoRecibido,
      cambio: this.cambio,
      estadoVenta: this.estadoVenta,
      usuarioId: this.usuarioId,
      cajaSesionId: this.cajaSesionId,
      detalleVentas: this.carrito.map((item) => ({
        productoId: item.productoId,
        cantidad: item.cantidad,
        precioUnitario: item.precioVenta,
        codigoVenta: codigoVenta,
      })),
    };

    // 3. Llama al servicio para crear la venta
    this.ventasService
      .createVenta(ventaData)
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          console.log('Venta generada con éxito:', response);
          this.showToast('Venta realizada con éxito.', 'success');
          // ✅ MEJORA: Llama a limpiarCarrito() después de una venta exitosa
          this.limpiarCarrito();
        },
        error: (error) => {
          console.error('Error al generar la venta:', error);
          this.showToast(
            'Error al generar la venta. Por favor, intente de nuevo.',
            'error'
          );
        },
      });
  }

  // ✅ Método para limpiar el estado del carrito
  limpiarCarrito(): void {
    this.carrito = [];
    this.totalVenta = 0;
    this.efectivoRecibido = 0;
    this.cambio = 0;
    this.cantidadProducto = {}; // Limpia las cantidades del catálogo
    this.sidebarVisible = false; // ✅ Cierra el sidebar
  }

  // Métodos de utilidad
  generarCodigoVenta(): string {
    return 'VNT-' + Math.random().toString(36).substr(2, 9).toUpperCase();
  }

  calcularCambio(): void {
    if (this.efectivoRecibido >= this.totalVenta) {
      this.cambio = this.efectivoRecibido - this.totalVenta;
    } else {
      this.cambio = 0;
    }
  }

  // Sidebar
  toggleSidebar(): void {
    this.sidebarVisible = !this.sidebarVisible;
  }

  updateCantidad(item: any, nuevaCantidad: number) {
    if (nuevaCantidad > 0) {
      item.cantidad = nuevaCantidad;
    } else {
      // Si la cantidad es 0 o menor, elimina el producto del carrito
      this.removeFromCarrito(item);
    }

    // ✅ CLAVE: Recalcula el total y el cambio después de cada actualización
    this.calcularTotalVenta();
    this.calcularCambio();
  }

  get activeProductos(): Array<any> {
    return this.productos.filter(this.esActivo.bind(this));
  }

  removeFromCarrito(item: any) {
    this.carrito = this.carrito.filter(
      (producto) => producto.productoId !== item.productoId
    );

    // ✅ Recalcula el total y el cambio después de eliminar un producto
    this.calcularTotalVenta();
    this.calcularCambio();
  }

  calcularTotalVenta() {
    this.totalVenta = this.carrito.reduce(
      (total, item) => total + item.precioVenta * item.cantidad,
      0
    );
  }
}
