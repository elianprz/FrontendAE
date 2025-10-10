// src/app/pages/dashboard/dashboard.ts

import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { Router } from '@angular/router';
import { UserService } from '../../services/user.service';
import { InventarioService } from '../../services/inventario.service';
import { AuthService } from '../../services/auth.service';
import { RouterOutlet, RouterLink } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router'; // 👈 Importa este módulo

interface Producto {
  productoId: number;
  nombre: string;
  descripcion: string;
  estado: string;
  stock: number;
  precioAdquisicion: number;
  precioVenta: number;
  imagenUrl: string;
  sku: string;
  categoriaId: number;
}

interface NavItem {
  name: string;
  routerLink: string;
  iconName: string;
  roles: string[]; // <-- IMPORTANTE: Los roles que pueden ver este enlace
  separator?: string; // Para títulos de sección
}

// 💡 Lista completa de toda la navegación del sistema
const fullNavigation: NavItem[] = [
  // Enlaces principales
  {
    name: 'Caja',
    routerLink: 'caja',
    iconName: 'landmark',
    roles: ['Admin'],
  },
  {
    name: 'Compras',
    routerLink: 'compras',
    iconName: 'shopping-basket',
    roles: ['Admin'],
  },
  {
    name: 'Historial de ventas',
    routerLink: 'historial-ventas',
    iconName: 'percent',
    roles: ['Admin', 'Empleado'],
  },
  {
    name: 'Proveedores',
    routerLink: 'proveedores',
    iconName: 'warehouse',
    roles: ['Admin'],
  },
  {
    name: 'Ventas',
    routerLink: 'ventas',
    iconName: 'pencil-ruler',
    roles: ['Admin', 'Empleado'],
  },

  // Separador de Ajustes
  {
    name: 'Ajustes',
    routerLink: '',
    iconName: '',
    roles: ['Admin'],
    separator: 'Ajustes del sistema',
  },

  // Enlaces de ajustes del sistema (típicamente solo para Admin o Roles de Gerencia)
  {
    name: 'Categoría Productos',
    routerLink: 'categoria-producto',
    iconName: 'package-search',
    roles: ['Admin', 'Empleado'],
  },
  {
    name: 'Categoría Proveedores',
    routerLink: 'categoria-proveedor',
    iconName: 'package',
    roles: ['Admin'],
  },
  {
    name: 'Movimiento caja',
    routerLink: 'movimiento-caja',
    iconName: 'hand-coins',
    roles: ['Admin', 'Cajero'],
  },
  {
    name: 'Productos',
    routerLink: 'productos',
    iconName: 'database',
    roles: ['Admin', 'JefeCompras'],
  },
  {
    name: 'Reportes',
    routerLink: 'reportes',
    iconName: 'chart-area',
    roles: ['Admin'],
  },
  {
    name: 'Roles',
    routerLink: 'roles',
    iconName: 'user-lock',
    roles: ['Admin'],
  },
  {
    name: 'Sesiones de caja',
    routerLink: 'caja-sesion',
    iconName: 'inbox',
    roles: ['Admin'],
  },
  {
    name: 'Usuarios',
    routerLink: 'usuarios',
    iconName: 'users',
    roles: ['Admin'],
  },
];
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    RouterOutlet,
    RouterLink,
    FormsModule,
    RouterModule,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class Dashboard implements OnInit {
  // Define una propiedad para el rol base y la navegación filtrada
  userRole: string = ''; // 'Admin' o 'Empleado'
  navigation: NavItem[] = [];
  routeBase: string = ''; // /admin/dashboard o /employee/dashboard

  //Current User
  currentUserName: string | null = null;

  isAdministrationOpen: boolean = false;
  isAdmin: boolean = false;
  isSidebarOpen: boolean = false; // estado del sidebar
  isChangePasswordModalOpen = false; // dialog

  actualPassword: string = '';
  newPassword: string = '';
  validationErrors: string[] = [];

  // Productos
  // ✅ Lista de productos con inventario bajo
  productosConstockBajo: Producto[] = [];
  // ✅ Puntos de control de stock
  readonly lowstockThresholds: number[] = [35, 25, 13, 5, 2];
  notificaciones: { id: number; titulo: string; mensaje: string }[] = [];
  // 🔔 Nueva clave para localStorage para el control del tiempo
  // private readonly LAST_LOWSTOCK_CHECK_KEY = 'lastLowstockCheck';
  // 🔔 Tiempo en milisegundos para el intervalo de chequeo (1 hora)
  //private readonly CHECK_INTERVAL_MS = 60 * 60 * 1000; // 60 minutos * 60 segundos * 1000 ms

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private inventarioService: InventarioService,
    private router: Router
  ) {}

  // ngOnInit(): void {
  //   this.authService.userRole$.subscribe((role) => {
  //     this.isAdmin = role === 'Admin';
  //   });
  //   this.currentUserName = this.authService.getCurrentUserName();

  //   // this.checkLowstock();

  //   // Programar notificaciones recurrentes
  //   this.programarNotificaciones();
  // }
  ngOnInit(): void {
    // 1. OBTENER EL ROL SINCRÓNICAMENTE al inicio
    const userRoleValue = this.authService.getUserRole();
    if (userRoleValue) {
      this.userRole = userRoleValue; // 👈 Asignar el rol a la propiedad
    }

    // 2. INICIALIZAR LA NAVEGACIÓN
    this.setupNavigation(); // 👈 Llamar a la función que usa this.userRole

    // 3. (Opcional) Mantener la suscripción para reactividad futura si la necesitas
    this.authService.userRole$.subscribe((role) => {
      this.isAdmin = role === 'Admin';
    });

    this.currentUserName = this.authService.getCurrentUserName();

    // 4. Lógica de notificaciones con el nuevo requerimiento
    this.checkLowstock();
    // this.checkLowstockOnLogin(); // ✅ Chequeo inicial al cargar
    //this.programarNotificaciones(); // ✅ Recurrencia cada 1 hora
  }

  // 🔔 Nueva función para el chequeo inicial al iniciar sesión
  // checkLowstockOnLogin(): void {
  //   const lastCheckTime = localStorage.getItem(this.LAST_LOWSTOCK_CHECK_KEY);
  //   const ahora = new Date().getTime();
  //   const oneHour = 60 * 60 * 1000; // Constante local

  //   // Si NO hay registro (primera vez) O si ha pasado 1 hora desde el último chequeo, lo hacemos.
  //   if (!lastCheckTime || ahora - Number(lastCheckTime) >= oneHour) {
  //     console.log(
  //       '📢 Ejecutando chequeo de inventario (Primera vez o después de 1 hora de límite).'
  //     );
  //     this.checkLowstock();
  //     // Actualizar el tiempo de la última revisión
  //     localStorage.setItem(this.LAST_LOWSTOCK_CHECK_KEY, ahora.toString());
  //   } else {
  //     console.log(
  //       'Skipping checkLowstock: Ya se ejecutó en la última hora al cargar el dashboard.'
  //     );
  //   }
  // }

  setupNavigation(): void {
    const role = this.userRole;

    if (!role) {
      this.navigation = [];
      return;
    }

    // 1. Establecer la ruta base (prefijo para los enlaces del sidebar)
    if (role === 'Admin') {
      this.routeBase = '/admin/dashboard';
    } else if (role === 'Empleado') {
      // Asumo que tus rutas para empleado comienzan en /employee/dashboard
      this.routeBase = '/employee/dashboard';
    } else {
      this.routeBase = '/'; // Fallback seguro
    }

    // 2. Filtrar la navegación: solo mantiene los ítems que incluyen el rol del usuario
    this.navigation = fullNavigation.filter((item) =>
      item.roles.includes(role)
    );
  }

  // 1. Variable para controlar el estado del menú (abierto/cerrado)
  isOpen: boolean = false;

  checkLowstock(): void {
    this.inventarioService.getInventario().subscribe({
      next: (data: Producto[]) => {
        const productosConBajoStock = data.filter((product) =>
          this.lowstockThresholds.some(
            (threshold) => product.stock <= threshold
          )
        );

        // -----------------------------------------------------
        // ✅ LÓGICA: MENSAJE CONSOLIDADO (Más de 5 productos)
        // -----------------------------------------------------
        if (productosConBajoStock.length > 5) {
          // console.log(
          //   `⚠️ Alerta consolidada: ${productosConBajoStock.length} productos con stock bajo.`
          // );

          const consolidadaId = 0;
          const yaExisteConsolidada = this.notificaciones.some(
            (n) => n.id === consolidadaId
          );

          if (!yaExisteConsolidada) {
            const nuevaNotificacionConsolidada = {
              id: consolidadaId,
              titulo: `¡Alerta Masiva de Stock!`,
              mensaje: `<strong>${productosConBajoStock.length} productos</strong> están quedándose sin stock. Revisa el módulo de Productos.`,
            };
            this.notificaciones.push(nuevaNotificacionConsolidada);

            // ✅ Programamos auto-cierre a 30 segundos
            setTimeout(() => this.cerrarNotificacion(consolidadaId), 30 * 1000);
          }

          this.productosConstockBajo = productosConBajoStock;
          return;
        }

        // -----------------------------------------------------
        // LÓGICA EXISTENTE: Notificaciones individuales (Si son 5 o menos)
        // -----------------------------------------------------
        productosConBajoStock.sort((a, b) => a.stock - b.stock);

        productosConBajoStock.forEach((p) => {
          const yaExiste = this.notificaciones.some(
            (n) => n.id === p.productoId
          );
          if (!yaExiste) {
            const nuevaNotificacion = {
              id: p.productoId,
              titulo: `Alerta: ${p.nombre}`,
              mensaje: this.getLowstockMessage(p),
            };

            this.notificaciones.push(nuevaNotificacion);

            // console.log(
            //   '⚠️ Alerta agregada:',
            //   nuevaNotificacion.titulo,
            //   'Stock:',
            //   p.stock
            // );
            // ✅ Programar auto-cierre a 30 segundos
            setTimeout(() => this.cerrarNotificacion(p.productoId), 30 * 1000); // 👈 MODIFICADO a 30 segundos
          }
        });

        this.productosConstockBajo = productosConBajoStock;
      },
      error: (err) => {
        //console.error('Error al obtener el inventario:', err);
      },
    });
  }

  /**
   * Genera el mensaje de alerta para un producto específico.
   * @param producto El producto con bajo stock.
   * @returns El string del mensaje de alerta.
   */
  // getLowstockMessage(producto: Producto): string {
  //   const stock = producto.stock;

  //   if (stock === 0) {
  //     // Reemplazamos **...** por <strong>...</strong> y añadimos el tag 😱
  //     return '¡stock AGOTADO! 😱 <strong>Añadir a la orden de compra.</strong>';
  //   }
  //   if (stock === 1) {
  //     // Reemplazamos **...** por <strong>...</strong> y añadimos el tag 🚨
  //     return '¡PELIGRO! Queda <strong>1</strong> unidad. 🚨 <strong>Se debe reponer inmediatamente.</strong>';
  //   }

  //   // 1. Encontrar el umbral más bajo que el stock ha cruzado
  //   const lowestCrossedThreshold = this.lowstockThresholds
  //     .filter((t) => stock <= t)
  //     .sort((a, b) => a - b)[0]; // Tomar el primer elemento (el más bajo/crítico)

  //   if (stock === lowestCrossedThreshold) {
  //     // Usamos <strong> para el stock
  //     return `¡Alerta de stock! Quedan exactamente <strong>${stock}</strong> unidades.`;
  //   }

  //   // Si el stock es más bajo que el umbral crítico
  //   if (stock < lowestCrossedThreshold) {
  //     // Usamos <strong> para el stock
  //     return `¡stock crítico! Quedan <strong>${stock}</strong> unidades. (Pasó la marca de ${lowestCrossedThreshold})`;
  //   }

  //   // Caso por defecto
  //   return `Quedan ${stock} unidades.`;
  // }
  getLowstockMessage(producto: Producto): string {
    const stock = producto.stock;

    if (stock === 0) {
      return '¡stock AGOTADO! 😱 <strong>Añadir a la orden de compra.</strong>';
    }
    if (stock === 1) {
      return '¡PELIGRO! Queda <strong>1</strong> unidad. 🚨 <strong>Se debe reponer inmediatamente.</strong>';
    }

    // Usamos la lógica de umbral más alto para un mensaje más coherente
    const highestCrossedThreshold = this.lowstockThresholds
      .filter((t) => stock <= t)
      .sort((a, b) => b - a)[0];

    if (stock === highestCrossedThreshold) {
      return `¡Alerta de stock! Quedan exactamente <strong>${stock}</strong> unidades. (Alcanzó el límite de ${highestCrossedThreshold})`;
    }

    if (stock < highestCrossedThreshold) {
      return `¡stock crítico! Quedan <strong>${stock}</strong> unidades. (Pasó la marca de ${highestCrossedThreshold})`;
    }

    return `Quedan <strong>${stock}</strong> unidades.`;
  }

  removeLowstockProduct(productId: number): void {
    this.productosConstockBajo = this.productosConstockBajo.filter(
      (p) => p.productoId !== productId
    );
  }

  cerrarNotificacion(id: number): void {
    this.notificaciones = this.notificaciones.filter((n) => n.id !== id);
    this.removeLowstockProduct(id); // tu lógica ya borra el producto de la lista de stock bajo
  }

  // programarNotificaciones(): void {
  //   const mostrarNotificacion = () => {
  //     this.checkLowstock(); // refresca productos
  //     if (this.notificaciones.length > 0) {
  //       console.log('🔔 Mostrando notificaciones de stock bajo');
  //     }
  //   };

  //   const revisarYMostrar = () => {
  //     const ahora = new Date();
  //     const hora = ahora.getHours();
  //     const minutos = ahora.getMinutes();

  //     // Verificar si estamos exactamente en 10:00 o 13:00
  //     if ((hora === 10 || hora === 13) && minutos === 0) {
  //       // Verificar si toca el ciclo de cada 3 días
  //       const ultimo = localStorage.getItem('ultimoNotificacion');
  //       const hoy = new Date().toDateString();

  //       if (ultimo !== hoy) {
  //         const diasDesdeUltimo = ultimo
  //           ? Math.floor(
  //               (ahora.getTime() - new Date(ultimo).getTime()) /
  //                 (1000 * 60 * 60 * 24)
  //             )
  //           : 3;

  //         if (diasDesdeUltimo >= 3) {
  //           mostrarNotificacion();
  //           localStorage.setItem('ultimoNotificacion', hoy);
  //         }
  //       }
  //     }
  //   };

  //   // Revisa cada minuto si se cumple la condición
  //   setInterval(revisarYMostrar, 60 * 1000);
  // }
  // programarNotificaciones(): void {
  //   const mostrarNotificacion = () => {
  //     this.checkLowstock(); // refresca productos y llena this.notificaciones
  //     const ahora = new Date().getTime();
  //     // Actualizar el tiempo de la última revisión después de la verificación
  //     localStorage.setItem(this.LAST_LOWSTOCK_CHECK_KEY, ahora.toString());

  //     if (this.notificaciones.length > 0) {
  //       //console.log('🔔 Mostrando notificaciones de stock bajo');
  //     }
  //   };

  //   const revisarYMostrar = () => {
  //     const lastCheckTime = localStorage.getItem(this.LAST_LOWSTOCK_CHECK_KEY);
  //     const ahora = new Date().getTime();

  //     // Si ha pasado al menos el intervalo de chequeo (1 hora)
  //     if (
  //       !lastCheckTime ||
  //       ahora - Number(lastCheckTime) >= this.CHECK_INTERVAL_MS // 👈 Si esta condición es FALSE, el código termina aquí.
  //     ) {
  //       this.checkLowstock();
  //       localStorage.setItem(this.LAST_LOWSTOCK_CHECK_KEY, ahora.toString());
  //     }
  //   };

  //   // ✅ Revisa cada minuto si se cumple la condición de la hora (cada minuto es más eficiente
  //   //    que revisar cada 1 hora exactamente, para asegurarnos de no saltarnos el momento)
  //   //    OJO: Mantuve el intervalo de 60 segundos por costumbre, puedes subirlo a 5 minutos (300 * 1000)
  //   //    si no quieres tanto chequeo, ya que la lógica principal es cada 1 hora.
  //   setInterval(revisarYMostrar, 60 * 1000);
  // }

  getCurrentUserName(): string | null {
    const token = this.getToken();

    if (token) {
      try {
        const decodedToken: any = jwtDecode(token);

        // El nombre del usuario en tu payload se llama "unique_name"

        return decodedToken.unique_name;
      } catch (error) {
        //console.error('Error decodificando el token:', error);

        return null;
      }
    }

    return null;
  }
  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  toggleMenu() {
    this.isOpen = !this.isOpen;
  }

  toggleAdministrationMenu(): void {
    this.isAdministrationOpen = !this.isAdministrationOpen;
  }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // -------------------------------------------------
  // Dialog handling
  // -------------------------------------------------
  openChangePasswordModal(): void {
    this.isSidebarOpen = false;
    this.isOpen = false;
    this.resetPasswordForm();
    this.isChangePasswordModalOpen = true;
  }

  closeChangePasswordModal(): void {
    this.isChangePasswordModalOpen = false;
  }

  private resetPasswordForm(): void {
    this.actualPassword = '';
    this.newPassword = '';
    this.validationErrors = [];
  }

  /** ✅ Validar y enviar la petición de cambio de contraseña */
  submitChangePassword(): void {
    this.validationErrors = [];

    // ------------------- VALIDACIONES -------------------
    if (!this.actualPassword.trim() || !this.newPassword.trim()) {
      this.validationErrors.push('Los dos campos son obligatorios.');
    }
    if (this.newPassword.length < 6) {
      this.validationErrors.push(
        'La nueva contraseña debe tener al menos 6 caracteres.'
      );
    }
    if (this.validationErrors.length) return;

    // ------------------- OBTENER ID --------------------
    let userId: number;
    try {
      userId = this.authService.getCurrentUserId(); // <-- ahora sí funciona
    } catch (e: any) {
      this.validationErrors.push(
        e.message ?? 'No se pudo obtener el ID del usuario.'
      );
      return;
    }

    // ------------------- PETICIÓN ----------------------
    this.userService
      .changePassword(userId, this.actualPassword, this.newPassword)
      .subscribe({
        next: () => {
          alert('Contraseña cambiada correctamente.');
          this.closeChangePasswordModal();
        },
        error: (err) => {
          //console.error(err);
          const msg =
            err?.error?.message ?? 'No se pudo cambiar la contraseña.';
          this.validationErrors = [msg];
        },
      });
  }
}
