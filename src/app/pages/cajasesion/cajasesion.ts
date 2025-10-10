import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { CajasesionService } from '../../services/cajasesion.service';
import { CajaService } from '../../services/caja.service'; // Importa el servicio de Caja
import { UserService } from '../../services/user.service'; // Importa el servicio de Usuario
import { take } from 'rxjs/operators';
import { forkJoin } from 'rxjs';
@Component({
  selector: 'app-cajasesion',
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './cajasesion.html',
  styleUrl: './cajasesion.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  standalone: true,
})
export class Cajasesion implements OnInit {
  // Renombrando las variables para ser más claras
  allCajas: any[] = []; // lista completa (activa + inactiva)
  activeCajas: any[] = []; // solo las activas – para el <select>
  cajaSesiones: any[] = [];
  paginatedCajasesiones: any[] = [];
  filteredCajasesiones: any[] = [];
  cajas: any[] = []; // Para almacenar las cajas
  usuarios: any[] = []; // Para almacenar los usuarios
  originalCajaId: number | null = null;

  // Paginación y Filtro
  searchText: string = '';
  currentPage: number = 1;
  itemsPerPage: number = 7;
  totalCajasesiones: number = 0;
  private pagesToShow: number = 5;
  public Math = Math;

  selectedCajaId: number | null = null;
  selectedUsuarioAperturaId: number | null = null;
  selectedUsuarioCierreId: number | null = null;
  // Modal de Creación
  isCreateModalOpen: boolean = false;
  newCajaSesion: any = {
    //cajaSesionId: '',
    fechaApertura: '',
    montoApertura: '',
    fechaCierre: '',
    montoCierre: '',
    estado: true, // Por defecto, activo
    observacion: '',
    cajaId: null, // Se asignará más tarde
    usuarioAperturaId: null, // Se asignará más tarde
    usuarioCierreId: null, // Se asignará más tarde
  };

  // Modificar esta variable para guardar la lista original del servidor
  // En lugar de sobreescribir this.cajaSesiones, crearemos una nueva propiedad
  private originalCajaSesiones: any[] = [];

  validationErrors: string[] = [];

  // Modal de Edición
  isEditModalOpen: boolean = false;
  editedCajaSesion: any = {};
  editValidationErrors: string[] = [];

  // Modal de visualización de detalles
  isViewModalOpen: boolean = false;
  viewedCajaSesion: any = {};

  // Modal de Eliminación
  isDeleteModalOpen: boolean = false;
  cajasesionToDelete: any = {};

  constructor(
    private cajaSesionService: CajasesionService,
    private cajaService: CajaService, // Inyecta el servicio de Caja
    private userService: UserService // Inyecta el servicio de Usuario
  ) {}

  ngOnInit(): void {
    // Al iniciar, carga todos los datos necesarios en paralelo
    this.fetchData();
  }

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
      cajas: this.cajaService.getCajas(),
      usuarios: this.userService.getUsers(),
      cajaSesiones: this.cajaSesionService.getCajasesiones(),
    }).subscribe({
      next: (results) => {
        // 1️⃣  guardamos ambas colecciones
        this.allCajas = results.cajas;
        this.activeCajas = results.cajas.filter((c) => c.estado === true);

        this.usuarios = results.usuarios;

        // 2️⃣  datos de sesiones
        this.originalCajaSesiones = results.cajaSesiones;
        this.cajaSesiones = this.mapCajaSesiones(this.originalCajaSesiones);
        this.applySearchFilter();
      },
      //error: (err) => console.error('Error al cargar los datos:', err),
    });
  }

  // --- Nueva Lógica ---
  mapCajaSesiones(data: any[]): any[] {
    return data.map((sesion) => {
      const caja = this.allCajas.find((c) => c.cajaId === sesion.cajaId);
      const ua = this.usuarios.find(
        (u) => u.usuarioId === sesion.usuarioAperturaId
      );
      const uc = this.usuarios.find(
        (u) => u.usuarioId === sesion.usuarioCierreId
      );

      return {
        ...sesion,
        fechaApertura: this.formatDateForDisplay(sesion.fechaApertura),
        fechaCierre: this.formatDateForDisplay(sesion.fechaCierre),
        nombreCaja: caja ? caja.nombre : 'Desconocida',
        nombreUsuarioApertura: ua ? ua.nombreUsuario : 'Desconocido',
        nombreUsuarioCierre: uc ? uc.nombreUsuario : 'No Cerrada',
      };
    });
  }

  public isCajaActiva(id: number | null): boolean {
    if (id === null) return false;
    return this.activeCajas.some((c) => c.cajaId === id);
  }

  // Fin de la nueva Lógica

  applySearchFilter(): void {
    if (this.searchText) {
      const lt = this.searchText.toLowerCase();
      this.filteredCajasesiones = this.cajaSesiones.filter((s) => {
        return (
          (s.nombreCaja || '').toLowerCase().includes(lt) ||
          (s.nombreUsuarioApertura || '').toLowerCase().includes(lt)
        );
      });
    } else {
      this.filteredCajasesiones = [...this.cajaSesiones];
    }
    this.totalCajasesiones = this.filteredCajasesiones.length;
    this.currentPage = 1;
    this.paginateCajaSesiones();
  }

  paginateCajaSesiones(): void {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    this.paginatedCajasesiones = this.filteredCajasesiones.slice(start, end);
  }

  // Métodos de paginación... (el resto de tu lógica de paginación es correcta)

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.paginateCajaSesiones();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.paginateCajaSesiones();
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.paginateCajaSesiones();
    }
  }

  get totalPages(): number {
    return Math.ceil(this.totalCajasesiones / this.itemsPerPage);
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

  // Lógica de validación

  validateCajaSesion(cajaSesion: any, originalId?: number | null): string[] {
    const errors: string[] = [];

    /* ---------- 1️⃣  Validaciones básicas ------------ */
    const cajaId = Number(cajaSesion.cajaId);
    const usuarioAperturaId = Number(cajaSesion.usuarioAperturaId);
    const usuarioCierreId =
      cajaSesion.usuarioCierreId !== null &&
      cajaSesion.usuarioCierreId !== undefined &&
      cajaSesion.usuarioCierreId !== ''
        ? Number(cajaSesion.usuarioCierreId)
        : null;

    if (!cajaId || isNaN(cajaId) || cajaId <= 0) {
      errors.push('La caja es obligatoria.');
    }

    if (
      cajaSesion.montoApertura === null ||
      cajaSesion.montoApertura === '' ||
      isNaN(Number(cajaSesion.montoApertura)) ||
      Number(cajaSesion.montoApertura) < 0
    ) {
      errors.push(
        'El monto de apertura es obligatorio y debe ser un número positivo.'
      );
    }

    if (
      !cajaSesion.fechaApertura ||
      isNaN(Date.parse(cajaSesion.fechaApertura))
    ) {
      errors.push(
        'La fecha de apertura es obligatoria y debe ser una fecha válida.'
      );
    }

    if (
      !usuarioAperturaId ||
      isNaN(usuarioAperturaId) ||
      usuarioAperturaId <= 0
    ) {
      errors.push('El usuario que abre la caja es obligatorio.');
    }

    if (cajaSesion.fechaCierre) {
      const fechaCierre = Date.parse(cajaSesion.fechaCierre);
      const fechaApertura = Date.parse(cajaSesion.fechaApertura);

      if (isNaN(fechaCierre)) {
        errors.push('La fecha de cierre debe ser una fecha válida.');
      } else if (fechaCierre < fechaApertura) {
        errors.push(
          'La fecha de cierre no puede ser anterior a la fecha de apertura.'
        );
      }
    }

    if (
      cajaSesion.montoCierre !== null &&
      cajaSesion.montoCierre !== undefined &&
      cajaSesion.montoCierre !== ''
    ) {
      if (
        isNaN(Number(cajaSesion.montoCierre)) ||
        Number(cajaSesion.montoCierre) < 0
      ) {
        errors.push('El monto de cierre debe ser un número positivo.');
      }
    }

    if (usuarioCierreId !== null) {
      if (isNaN(usuarioCierreId) || usuarioCierreId <= 0) {
        errors.push('El usuario que cierra la caja debe ser válido.');
      }
    }

    if (cajaSesion.observacion && cajaSesion.observacion.length > 250) {
      errors.push('La observación no puede superar los 250 caracteres.');
    }

    /* ---------- 2️⃣  Regla extra para el modo *editar* ------------ */
    if (
      typeof originalId === 'number' &&
      (cajaId !== originalId || !this.isCajaActiva(cajaId))
    ) {
      // 2a.  La caja elegida está inactiva
      if (!this.isCajaActiva(cajaId)) {
        errors.push('Debe seleccionar una caja activa.');
      }
      // 2b.  La caja elegida es la misma que la original (inactiva)
      if (cajaId === originalId) {
        errors.push('Debe elegir otra caja que esté activa.');
      }
    }

    return errors;
  }

  // --- Lógica del Modal de Creación ---
  openCreateModal(): void {
    this.isCreateModalOpen = true;
  }

  closeCreateModal(): void {
    this.isCreateModalOpen = false;
    this.newCajaSesion = {
      cajaSesionId: '',
      fechaApertura: '',
      montoApertura: '',
      fechaCierre: '',
      montoCierre: '',
      estado: true, // Por defecto, activo
      observacion: '',
      cajaId: '',
      nombreCaja: '',
      usuarioAperturaId: '',
      usuarioCierreId: '',
    };
    this.validationErrors = [];
  }

  createCajaSesion(): void {
    this.validationErrors = this.validateCajaSesion(this.newCajaSesion);
    this.newCajaSesion.cajaId = this.selectedCajaId;
    this.newCajaSesion.usuarioAperturaId = this.selectedUsuarioAperturaId;
    this.newCajaSesion.usuarioCierreId = this.selectedUsuarioCierreId;

    this.validationErrors = this.validateCajaSesion(this.newCajaSesion);
    if (this.validationErrors.length > 0) {
      return;
    }

    this.cajaSesionService
      .createCajasesion(this.newCajaSesion)
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          //console.log('Sesión de caja creada exitosamente:', response);
          this.closeCreateModal();
          this.fetchData(); // Llama a fetchData para actualizar todos los datos
        },
        error: (error) => {
          //console.error('Error al crear la sesión de caja:', error);
          if (error.status === 400 && error.error.errors) {
            this.validationErrors = Object.values(
              error.error.errors
            ).flat() as string[];
          } else {
            this.validationErrors = [
              'Error al crear la sesión de caja. Intente de nuevo más tarde.',
            ];
          }
        },
      });
  }

  get activeUsers(): Array<any> {
  // Si tu flag es string ('1' / '0'), cambia a '1'
  return this.usuarios.filter(u => u.estado === true || u.estado === 1);
}

  // --- Lógica del Modal de Edición ---

  openEditModal(cajasesion: any): void {
    this.isEditModalOpen = true;

    // **Cambio clave aquí:**
    // 1. Busca el objeto original de la lista que no está formateada
    const originalSesion = this.originalCajaSesiones.find(
      (s) => s.cajaSesionId === cajasesion.cajaSesionId
    );

    // 2. Clona el objeto original para no modificar la lista, y formatea las fechas.
    this.editedCajaSesion = {
      ...originalSesion,
      fechaApertura: this.formatDateForInput(originalSesion.fechaApertura),
      fechaCierre: originalSesion.fechaCierre
        ? this.formatDateForInput(originalSesion.fechaCierre)
        : null,
    };

    // Asigna los IDs a las variables de los selects para que se muestren
    this.selectedCajaId = this.editedCajaSesion.cajaId;
    this.originalCajaId = this.editedCajaSesion.cajaId || null;
    this.selectedUsuarioAperturaId =
      this.editedCajaSesion.usuarioAperturaId || null;
    this.selectedUsuarioCierreId =
      this.editedCajaSesion.usuarioCierreId || null;
    this.selectedUsuarioAperturaId = this.editedCajaSesion.usuarioAperturaId;
    this.selectedUsuarioCierreId = this.editedCajaSesion.usuarioCierreId;
    this.editValidationErrors = [];
  }

  closeEditModal(): void {
    this.isEditModalOpen = false;
    this.editedCajaSesion = {}; // Limpia el objeto editado
    this.selectedCajaId = null;
    this.selectedUsuarioAperturaId = null;
    this.selectedUsuarioCierreId = null;
  }

  updateCajaSesion(): void {
    // 1. Asigna los IDs de los selects al objeto 'editedCajaSesion'
    this.editedCajaSesion.cajaId = this.selectedCajaId;
    this.editedCajaSesion.usuarioAperturaId = this.selectedUsuarioAperturaId;
    this.editedCajaSesion.usuarioCierreId = this.selectedUsuarioCierreId;

    // 2. Ejecuta la validación con el objeto actualizado
    this.editValidationErrors = this.validateCajaSesion(this.editedCajaSesion);
    if (this.editValidationErrors.length > 0) {
      return;
    }

    // 3. Crea una copia del objeto para no modificar las fechas en el formulario local
    const cajaSesionToUpdate = { ...this.editedCajaSesion };

    // 4. Formatea las fechas a formato ISO 8601 antes de enviarlas
    if (cajaSesionToUpdate.fechaApertura) {
      cajaSesionToUpdate.fechaApertura = new Date(
        cajaSesionToUpdate.fechaApertura
      ).toISOString();
    }
    if (cajaSesionToUpdate.fechaCierre) {
      cajaSesionToUpdate.fechaCierre = new Date(
        cajaSesionToUpdate.fechaCierre
      ).toISOString();
    }

    // 5. Llama al servicio para actualizar
    this.cajaSesionService
      .updateCajasesion(
        cajaSesionToUpdate.cajaSesionId, // Usa el ID correcto de la entidad
        cajaSesionToUpdate
      )
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          //console.log('Sesión de caja actualizada exitosamente:', response);
          this.closeEditModal();
          this.fetchData(); // Llama a fetchData para actualizar todos los datos
        },
        error: (error) => {
          //console.error('Error al actualizar la sesión de caja:', error);
          if (error.status === 400 && error.error.errors) {
            this.editValidationErrors = Object.values(
              error.error.errors
            ).flat() as string[];
          } else {
            this.editValidationErrors = [
              'Error al actualizar la sesión de caja. Intente de nuevo más tarde.',
            ];
          }
        },
      });
  }

  openViewModal(cajasesion: any): void {
    // Busca la caja en la lista *completa* (active + inactiva)
    const caja = this.allCajas.find((c) => c.cajaId === cajasesion.cajaId);

    // Usuarios (no cambian)
    const usuarioApertura = this.usuarios.find(
      (u) => u.usuarioId === cajasesion.usuarioAperturaId
    );
    const usuarioCierre = this.usuarios.find(
      (u) => u.usuarioId === cajasesion.usuarioCierreId
    );

    // Nombre que se mostrará en el modal
    const nombreCaja =
      caja && caja.estado === true ? caja.nombre : 'Sin relación';

    // El objeto que ves en el modal
    this.viewedCajaSesion = {
      ...cajasesion,
      nombre: nombreCaja, // <‑‑ esta es la que el template usa
      cajaCompleta: caja, // (opcional, si necesitas más datos de la caja)
      usuarioApertura: usuarioApertura,
      usuarioCierre: usuarioCierre,
    };

    this.isViewModalOpen = true;
  }

  closeViewModal(): void {
    this.isViewModalOpen = false;
    this.viewedCajaSesion = {};
  }

  // --- Lógica del Modal de Eliminación ---
  openDeleteModal(cajasesion: any): void {
    this.isDeleteModalOpen = true;

    // 1. Encuentra el objeto de usuario completo usando el ID
    const usuarioApertura = this.usuarios.find(
      (u) => u.usuarioId === cajasesion.usuarioAperturaId
    );

    // 2. Crea el objeto para el modal de eliminación, añadiendo el usuario completo
    this.cajasesionToDelete = {
      ...cajasesion,
      usuarioApertura: usuarioApertura, // Agrega el objeto de usuario aquí
    };
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen = false;
  }

  deleteCajaSesion(): void {
    if (!this.cajasesionToDelete || !this.cajasesionToDelete.cajaSesionId) {
      //console.error('No se ha seleccionado una sesión de caja para eliminar.');
      return;
    }
    this.cajaSesionService
      .deleteCajasesion(this.cajasesionToDelete.cajaSesionId)
      .pipe(take(1))
      .subscribe({
        next: () => {
          //console.log('Sesión de caja eliminada exitosamente.');
          this.closeDeleteModal();
          this.fetchData();
        },
        error: (error) => {
          //console.error('Error al eliminar la sesión de caja:', error);
          alert(
            'Error al eliminar la sesión de caja. Intente de nuevo más tarde.'
          );
        },
      });
  }
}
