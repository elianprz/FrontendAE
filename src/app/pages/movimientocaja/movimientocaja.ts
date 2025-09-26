import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { MovimientoCajaService } from '../../services/movimientocaja.service';
import { CajasesionService } from '../../services/cajasesion.service';
import { UserService } from '../../services/user.service';
import { take } from 'rxjs/operators';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-movimientocaja',
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './movimientocaja.html',
  styleUrl: './movimientocaja.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  standalone: true,
})
export class Movimientocaja implements OnInit {
  // Renombrando las variables para ser más claras
  movimientoCajas: any[] = [];
  paginatedMovimientoCajas: any[] = [];
  filteredMovimientoCajas: any[] = [];
  // Ahora usaremos el servicio de CajaSesion para obtener las sesiones de caja
  cajaSesiones: any[] = [];
  usuarios: any[] = [];

  // Paginación y Filtro
  searchText: string = '';
  currentPage: number = 1;
  itemsPerPage: number = 7;
  totalMovimientoCajas: number = 0;
  private pagesToShow: number = 5;
  public Math = Math;

  selectedCajaSesionId: number | null = null;
  selectedUsuarioId: number | null = null;

  // Modal de Creación
  isCreateModalOpen: boolean = false;
  newMovimientoCaja: any = {
    tipo: '',
    concepto: '',
    monto: null,
    fecha: '',
    cajaSesionId: null,
    usuarioId: null,
  };

  private originalMovimientoCajas: any[] = [];

  validationErrors: string[] = [];

  // Modal de Edición
  isEditModalOpen: boolean = false;
  editedMovimientoCaja: any = {};
  editValidationErrors: string[] = [];

  // Modal de visualización de detalles
  isViewModalOpen: boolean = false;
  viewedMovimientoCaja: any = {};

  // Modal de Eliminación
  isDeleteModalOpen: boolean = false;
  movimientoCajaToDelete: any = {};

  constructor(
    private movimientoCajaService: MovimientoCajaService,
    private cajaSesionService: CajasesionService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.fetchData();
  }

  // Los helpers para formatear fechas están bien, no los he modificado.
  // Helper para convertir fecha de YYYY-MM-DD a DD-MM-YYYY
  formatDateForDisplay(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = ('0' + date.getDate()).slice(-2);
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }
  // Helper para convertir fecha de YYYY-MM-DD a YYYY-MM-DD para inputs tipo date
  private formatDateForInput(dateString: string): string {
    if (!dateString) {
      return '';
    }
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  // Helper para convertir fecha de DD-MM-YYYY a YYYY-MM-DD
  formatDateForBackend(dateString: string): string {
    if (!dateString) return '';
    const parts = dateString.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateString;
  }

  fetchData(): void {
    forkJoin({
      cajaSesiones: this.cajaSesionService.getCajasesiones(),
      usuarios: this.userService.getUsers(),
      movimientoCajas: this.movimientoCajaService.getMovimientos(),
    }).subscribe({
      next: (results) => {
        this.cajaSesiones = results.cajaSesiones;
        this.usuarios = results.usuarios;

        this.originalMovimientoCajas = results.movimientoCajas;

        // Mapea la data para la tabla, usando la lista cruda.
        this.movimientoCajas = this.mapMovimientoCajas(
          this.originalMovimientoCajas
        );

        this.applySearchFilter();
      },
      error: (error) => {
        console.log('Error al cargar los datos:', error);
      },
    });
  }

  // --- Nueva lógica de mapeo para MovimientoCaja ---
  mapMovimientoCajas(data: any[]): any[] {
    return data.map((movimiento) => {
      // Encuentra la sesión de caja
      const sesion = this.cajaSesiones.find(
        (s) => s.cajaSesionId === movimiento.cajaSesionId
      );
      // Encuentra el usuario
      const usuario = this.usuarios.find(
        (u) => u.usuarioId === movimiento.usuarioId
      );

      return {
        ...movimiento,
        // Formatea la fecha solo para la visualización en la tabla
        fecha: this.formatDateForDisplay(movimiento.fecha),
        // Obtiene el nombre del usuario de apertura de la sesión de caja
        nombreCajaSesion: sesion
          ? this.usuarios.find((u) => u.usuarioId === sesion.usuarioAperturaId)
              ?.nombreCompleto || 'Desconocido'
          : 'Desconocida',
        nombreUsuario: usuario ? usuario.nombreCompleto : 'Desconocido',
      };
    });
  }

  get filteredCajaSesiones(): Array<any> {
    // Se asume que `cajaSesion.estado` es booleano o 1/0
    return this.cajaSesiones.filter((s) => s.estado === true || s.estado === 1);
  }

  get filteredUsuarios(): Array<any> {
    // Se asume que `usuario.estado` es booleano o 1/0
    return this.usuarios.filter((u) => u.estado === true || u.estado === 1);
  }

  // En tu componente .ts
  getUsuarioNombre(usuarioId: number): string {
    const usuario = this.usuarios.find((u) => u.usuarioId === usuarioId);
    return usuario ? usuario.nombreUsuario : 'Desconocido';
  }

  // Lógica de Paginación y Filtrado
  applySearchFilter(): void {
    if (this.searchText) {
      const lowerCaseSearchText = this.searchText.toLowerCase();
      this.filteredMovimientoCajas = this.movimientoCajas.filter((mov) => {
        return (
          (mov.nombreCajaSesion || '')
            .toLowerCase()
            .includes(lowerCaseSearchText) ||
          (mov.nombreUsuario || '').toLowerCase().includes(lowerCaseSearchText)
        );
      });
    } else {
      this.filteredMovimientoCajas = [...this.movimientoCajas];
    }
    this.totalMovimientoCajas = this.filteredMovimientoCajas.length;
    this.currentPage = 1;
    this.paginatemovimientoCajas();
  }

  paginatemovimientoCajas(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedMovimientoCajas = this.filteredMovimientoCajas.slice(
      startIndex,
      endIndex
    );
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.paginatemovimientoCajas();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.paginatemovimientoCajas();
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.paginatemovimientoCajas();
    }
  }

  get totalPages(): number {
    return Math.ceil(this.totalMovimientoCajas / this.itemsPerPage);
  }

  // Los métodos 'pages' y 'handlePageClick' son correctos.
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
  // Lógica de validación
  validateMovimientoCaja(movimiento: any): string[] {
    const errors: string[] = [];

    const cajaSesionId = Number(movimiento.cajaSesionId);
    const usuarioId = Number(movimiento.usuarioId);

    if (!cajaSesionId || isNaN(cajaSesionId) || cajaSesionId <= 0) {
      errors.push('La sesión de caja es obligatoria.');
    }

    if (
      movimiento.monto === null ||
      movimiento.monto === '' ||
      isNaN(Number(movimiento.monto)) ||
      Number(movimiento.monto) <= 0
    ) {
      errors.push('El monto es obligatorio y debe ser un número positivo.');
    }

    if (!movimiento.tipo) {
      errors.push('El tipo de movimiento es obligatorio.');
    }

    if (!movimiento.concepto || movimiento.concepto.length > 120) {
      errors.push(
        'El concepto es obligatorio y no puede superar los 120 caracteres.'
      );
    }

    if (!movimiento.fecha || isNaN(Date.parse(movimiento.fecha))) {
      errors.push('La fecha es obligatoria y debe ser una fecha válida.');
    }

    if (!usuarioId || isNaN(usuarioId) || usuarioId <= 0) {
      errors.push('El usuario que registra el movimiento es obligatorio.');
    }

    return errors;
  }

  // Lógica del Modal de Creación
  openCreateModal(): void {
    this.isCreateModalOpen = true;
  }

  closeCreateModal(): void {
    this.isCreateModalOpen = false;
    this.newMovimientoCaja = {
      tipo: '',
      concepto: '',
      monto: null,
      fecha: '',
      cajaSesionId: null,
      usuarioId: null,
    };
    this.selectedCajaSesionId = null;
    this.selectedUsuarioId = null;
    this.validationErrors = [];
  }

  /// Logica de creación de movimiento con validaciones adicionales
  createMovimiento(): void {
    // Aseguramos que los IDs se asignen ANTES de la validación
    this.newMovimientoCaja.cajaSesionId = this.selectedCajaSesionId;
    this.newMovimientoCaja.usuarioId = this.selectedUsuarioId;

    // Realizamos la validación inicial de los campos del formulario
    this.validationErrors = this.validateMovimientoCaja(this.newMovimientoCaja);
    if (this.validationErrors.length > 0) {
      return;
    }

    // **Cambio clave aquí:** Convertimos el ID a un número antes de buscar.
    const cajaSesionIdNumber = Number(this.newMovimientoCaja.cajaSesionId);

    // Ahora, buscamos la sesión de caja usando el ID numérico.
    const sesion = this.cajaSesiones.find(
      (s) => s.cajaSesionId === cajaSesionIdNumber
    );

    // Validación crucial: Si no se encontró la sesión, muestra el error y detiene la ejecución.
    if (!sesion) {
      this.validationErrors.push(
        'La sesión de caja seleccionada no es válida.'
      );
      return;
    }

    // El resto de la lógica de negocio para los montos y la actualización
    const montoActualizado = this.calculateNewMonto(
      sesion.montoCierre,
      this.newMovimientoCaja.monto,
      this.newMovimientoCaja.tipo
    );

    if (this.newMovimientoCaja.tipo === 'Egreso' && montoActualizado < 0) {
      this.validationErrors.push(
        'No es posible realizar el egreso. Fondos insuficientes.'
      );
      return;
    }

    const sesionToUpdate = {
      ...sesion,
      montoCierre: montoActualizado,
    };

    // Se procede a actualizar la sesión de caja y luego a crear el movimiento
    this.cajaSesionService
      .updateCajasesion(sesionToUpdate.cajaSesionId, sesionToUpdate)
      .pipe(take(1))
      .subscribe({
        next: () => {
          // Después de actualizar la sesión, crea el movimiento
          this.movimientoCajaService
            .createMovimiento(this.newMovimientoCaja)
            .pipe(take(1))
            .subscribe({
              next: (response) => {
                console.log(
                  'Movimiento de caja creado exitosamente:',
                  response
                );
                this.closeCreateModal();
                this.fetchData();
              },
              error: (error) => {
                console.error('Error al crear el movimiento de caja:', error);
                // Lógica de manejo de errores
              },
            });
        },
        error: (error) => {
          console.error('Error al actualizar la sesión de caja:', error);
          // Lógica de manejo de errores
        },
      });
  }
  // Lógica del Modal de Edición
  openEditModal(movimiento: any): void {
    this.isEditModalOpen = true;

    const originalMovimiento = this.originalMovimientoCajas.find(
      (m) => m.movimientoCajaId === movimiento.movimientoCajaId
    );

    this.editedMovimientoCaja = {
      ...originalMovimiento,
      fecha: this.formatDateForInput(originalMovimiento.fecha),
    };

    this.selectedCajaSesionId = this.editedMovimientoCaja.cajaSesionId;
    this.selectedUsuarioId = this.editedMovimientoCaja.usuarioId;

    this.editValidationErrors = [];
  }

  closeEditModal(): void {
    this.isEditModalOpen = false;
    this.editedMovimientoCaja = {};
    this.selectedCajaSesionId = null;
    this.selectedUsuarioId = null;
  }

  updateMovimiento(): void {
    // Aseguramos que los IDs se asignen ANTES de la validación
    this.editedMovimientoCaja.cajaSesionId = this.selectedCajaSesionId;
    this.editedMovimientoCaja.usuarioId = this.selectedUsuarioId;

    // Realizamos la validación inicial
    this.editValidationErrors = this.validateMovimientoCaja(
      this.editedMovimientoCaja
    );
    if (this.editValidationErrors.length > 0) {
      return;
    }

    // 1. Preparamos el objeto para la actualización
    // No necesitamos buscar el movimiento original ni la sesión de caja
    // porque no se modificará el saldo.
    const movimientoToUpdate = {
      ...this.editedMovimientoCaja,
      fecha: new Date(this.editedMovimientoCaja.fecha).toISOString(),
      // Aseguramos que el tipo y el monto no se modifiquen
      tipo: this.originalMovimientoCajas.find(
        (m) => m.movimientoCajaId === this.editedMovimientoCaja.movimientoCajaId
      )?.tipo,
      monto: this.originalMovimientoCajas.find(
        (m) => m.movimientoCajaId === this.editedMovimientoCaja.movimientoCajaId
      )?.monto,
    };

    // 2. Llamamos al servicio para actualizar el movimiento de caja
    this.movimientoCajaService
      .updateMovimiento(movimientoToUpdate.movimientoCajaId, movimientoToUpdate)
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          console.log('Movimiento de caja actualizado exitosamente:', response);
          this.closeEditModal();
          this.fetchData();
        },
        error: (error) => {
          console.error('Error al actualizar el movimiento de caja:', error);
          // Lógica de manejo de errores
        },
      });
  }
  // Helper para calcular el nuevo monto de cierre
  private calculateNewMonto(
    currentMonto: number,
    movimientoMonto: number,
    tipo: string
  ): number {
    if (tipo === 'Ingreso') {
      return currentMonto + movimientoMonto;
    } else if (tipo === 'Egreso') {
      return currentMonto - movimientoMonto;
    }
    return currentMonto;
  }
  // Lógica del Modal de Visualización de Detalles
  openViewModal(movimiento: any): void {
    // Encuentra los objetos completos usando los IDs
    const sesion = this.cajaSesiones.find(
      (s) => s.cajaSesionId === movimiento.cajaSesionId
    );
    const usuario = this.usuarios.find(
      (u) => u.usuarioId === movimiento.usuarioId
    );
    // Para el usuario de la sesión de caja
    const usuarioAperturaSesion = sesion
      ? this.usuarios.find((u) => u.usuarioId === sesion.usuarioAperturaId)
      : null;

    // Crea el objeto para la vista, añadiendo los objetos completos
    this.viewedMovimientoCaja = {
      ...movimiento,
      sesion: sesion,
      usuario: usuario,
      usuarioAperturaSesion: usuarioAperturaSesion,
    };

    this.isViewModalOpen = true;
  }

  closeViewModal(): void {
    this.isViewModalOpen = false;
    this.viewedMovimientoCaja = {};
  }

  // Lógica del Modal de Eliminación
  openDeleteModal(movimiento: any): void {
    this.isDeleteModalOpen = true;

    // 1. Encuentra los objetos completos
    const sesion = this.cajaSesiones.find(
      (s) => s.cajaSesionId === movimiento.cajaSesionId
    );
    const usuario = this.usuarios.find(
      (u) => u.usuarioId === movimiento.usuarioId
    );

    // 2. Crea el objeto para el modal de eliminación, añadiendo los objetos completos
    this.movimientoCajaToDelete = {
      ...movimiento,
      sesion: sesion,
      usuario: usuario,
    };
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen = false;
  }

  deleteMovimiento(): void {
    if (
      !this.movimientoCajaToDelete ||
      !this.movimientoCajaToDelete.movimientoCajaId
    ) {
      console.error(
        'No se ha seleccionado un movimiento de caja para eliminar.'
      );
      return;
    }
    this.movimientoCajaService
      .deleteMovimiento(this.movimientoCajaToDelete.movimientoCajaId)
      .pipe(take(1))
      .subscribe({
        next: () => {
          console.log('Movimiento de caja eliminado exitosamente.');
          this.closeDeleteModal();
          this.fetchData();
        },
        error: (error) => {
          console.error('Error al eliminar el movimiento de caja:', error);
          alert(
            'Error al eliminar el movimiento de caja. Intente de nuevo más tarde.'
          );
        },
      });
  }
}
