import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { UserService } from '../../services/user.service';
import { CajasesionService } from '../../services/cajasesion.service';
import { MovimientoCajaService } from '../../services/movimientocaja.service';
import { take } from 'rxjs/operators';
import { RoleService } from '../../services/role.service';
import { forkJoin } from 'rxjs';
@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './reportes.html',
  styleUrl: './reportes.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class Reportes implements OnInit {
  users: any[] = [];
  roles: any[] = [];
  rolesMap: { [key: number]: string } = {};

  // Validaciones
  public validationErrors: string[] = [];

  // Paginación
  searchText: string = '';
  filteredUsers: any[] = [];
  activeFilters: { [key: string]: Set<any> } = {};

  currentPage: number = 1;
  itemsPerPage: number = 7;
  totalUsers: number = 0;
  paginatedUsers: any[] = [];

  private pagesToShow: number = 5;
  public Math = Math;

  // Caja Sesión
  cajaSesiones: any[] = [];
  paginatedCajasesiones: any[] = [];
  filteredCajasesiones: any[] = [];
  // Paginación y Filtro
  searchText2: string = '';
  currentPage2: number = 1;
  itemsPerPage2: number = 7;
  totalCajasesiones: number = 0;
  private pagesToShow2: number = 5;
  public Math2 = Math;
  // Movimientos caja
  movimientoCajas: any[] = [];
  paginatedMovimientoCajas: any[] = [];
  filteredMovimientoCajas: any[] = [];
  searchText3: string = '';
  currentPage3: number = 1;
  itemsPerPage3: number = 7;
  totalMovimientoCajas: number = 0;
  private pagesToShow3: number = 5;
  public Math3 = Math;

  usuarios: any[] = [];

  constructor(
    private userService: UserService,
    private roleService: RoleService,
    private cajaSesionService: CajasesionService,
    private movimientoCajaService: MovimientoCajaService
  ) {}

  ngOnInit(): void {
    this.getUsersWithRoles();
    this.fetchData();
    this.fetchDataSimple();
  }

  // Fechas
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

  //
  getUsersWithRoles(): void {
    forkJoin({
      users: this.userService.getUsers(),
      roles: this.roleService.getRoles(),
    })
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          this.roles = response.roles;
          this.roles.forEach((role: any) => {
            const roleId = role.rolId || role.id;
            if (roleId) {
              this.rolesMap[roleId] = role.rolNombre;
            }
          });

          this.users = response.users.map((user: any) => {
            const rolNombre = this.rolesMap[user.rolId] || 'Sin Rol';
            return {
              ...user,
              rolNombre: rolNombre,
            };
          });

          this.applyFiltersAndSearch();
        },
        error: (error) => {
          console.error('Error al cargar datos:', error);
        },
      });
  }

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
    let tempUsers = [...this.users];
    if (this.searchText) {
      const lowerCaseSearchText = this.searchText.toLowerCase();
      tempUsers = tempUsers.filter((user) => {
        const userFields = `${user.primerNombre || ''} ${
          user.segundoNombre || ''
        } ${user.primerApellido || ''} ${user.segundoApellido || ''} ${
          user.nombreUsuario || ''
        } ${user.email || ''} ${user.cui || ''} ${user.nit || ''} ${
          user.telefono || ''
        } ${user.direccion || ''}`;
        return userFields.toLowerCase().includes(lowerCaseSearchText);
      });
    }

    for (const filterType in this.activeFilters) {
      if (this.activeFilters.hasOwnProperty(filterType)) {
        const filterSet = this.activeFilters[filterType];
        if (filterSet.size > 0) {
          tempUsers = tempUsers.filter((user) => {
            return filterSet.has(user[filterType]);
          });
        }
      }
    }
    this.filteredUsers = tempUsers;
    this.totalUsers = this.filteredUsers.length;
    this.currentPage = 1;
    this.paginateUsers();
  }

  // Paginación
  paginateUsers(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedUsers = this.filteredUsers.slice(startIndex, endIndex);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.paginateUsers();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.paginateUsers();
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.paginateUsers();
    }
  }

  get totalPages(): number {
    return Math.ceil(this.totalUsers / this.itemsPerPage);
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
  // Caja Sesión
  fetchData(): void {
    this.cajaSesionService
      .getCajasesiones()
      .pipe(take(1))
      .subscribe({
        next: (cajaSesiones) => {
          this.cajaSesiones = cajaSesiones.map((sesion) => {
            return {
              ...sesion,
              fechaApertura: this.formatDateForDisplay(sesion.fechaApertura),
              fechaCierre: this.formatDateForDisplay(sesion.fechaCierre),
            };
          });

          this.applySearchFilter2();
        },
        error: (error) => {
          console.error('Error al cargar las sesiones de caja:', error);
        },
      });
  }
  // Paginación y Filtro Caja Sesión
  applySearchFilter2(): void {
    if (this.searchText2) {
      const lowerCaseSearchText = this.searchText2.toLowerCase();
      this.filteredCajasesiones = this.cajaSesiones.filter((sesion) => {
        return (
          (sesion.nombreCaja || '')
            .toLowerCase()
            .includes(lowerCaseSearchText) ||
          (sesion.nombreUsuarioApertura || '')
            .toLowerCase()
            .includes(lowerCaseSearchText)
        );
      });
    } else {
      this.filteredCajasesiones = [...this.cajaSesiones];
    }

    this.totalCajasesiones = this.filteredCajasesiones.length;
    this.currentPage2 = 1;
    this.paginateCajaSesiones();
  }

  paginateCajaSesiones(): void {
    const startIndex = (this.currentPage2 - 1) * this.itemsPerPage2;
    const endIndex = startIndex + this.itemsPerPage2;
    this.paginatedCajasesiones = this.filteredCajasesiones.slice(
      startIndex,
      endIndex
    );
  }

  goToPage2(page: number): void {
    if (page >= 1 && page <= this.totalPages2) {
      this.currentPage2 = page;
      this.paginateCajaSesiones();
    }
  }

  nextPage2(): void {
    if (this.currentPage2 < this.totalPages2) {
      this.currentPage2++;
      this.paginateCajaSesiones();
    }
  }

  prevPage2(): void {
    if (this.currentPage2 > 1) {
      this.currentPage2--;
      this.paginateCajaSesiones();
    }
  }

  get totalPages2(): number {
    return Math.ceil(this.totalCajasesiones / this.itemsPerPage2);
  }

  get pages2(): (number | string)[] {
    const pages: (number | string)[] = [];
    const total = this.totalPages2;
    const current = this.currentPage2;
    const numPagesToShow = this.pagesToShow2;

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
  handlePageClick2(page: number | string): void {
    if (typeof page === 'number') {
      this.goToPage2(page); // <-- corregido
    }
  }
  // Movimientos caja
  fetchDataSimple(): void {
    this.movimientoCajaService
      .getMovimientos()
      .pipe(take(1))
      .subscribe({
        next: (movimientoCajas) => {
          // Mapea y formatea las fechas directamente
          this.movimientoCajas = movimientoCajas.map((movimiento) => {
            return {
              ...movimiento,
              fecha: this.formatDateForDisplay(movimiento.fecha),
            };
          });

          // Aplica el filtro (si lo tienes)
          this.applySearchFilter3();
        },
        error: (error) => {
          console.error('Error al cargar los movimientos de caja:', error);
        },
      });
  }

  // Paginación y Filtro Movimientos caja
  applySearchFilter3(): void {
    if (this.searchText3) {
      const lowerCaseSearchText = this.searchText3.toLowerCase();
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
    this.currentPage3 = 1;
    this.paginateMovimientoCajas3();
  }

  paginateMovimientoCajas3(): void {
    const startIndex = (this.currentPage3 - 1) * this.itemsPerPage3;
    const endIndex = startIndex + this.itemsPerPage3;
    this.paginatedMovimientoCajas = this.filteredMovimientoCajas.slice(
      startIndex,
      endIndex
    );
  }

  goToPage3(page: number): void {
    if (page >= 1 && page <= this.totalPages3) {
      this.currentPage3 = page;
      this.paginateMovimientoCajas3();
    }
  }

  nextPage3(): void {
    if (this.currentPage3 < this.totalPages3) {
      this.currentPage3++;
      this.paginateMovimientoCajas3();
    }
  }

  prevPage3(): void {
    if (this.currentPage3 > 1) {
      this.currentPage3--;
      this.paginateMovimientoCajas3();
    }
  }

  get totalPages3(): number {
    return Math.ceil(this.totalMovimientoCajas / this.itemsPerPage3);
  }
  get pages3(): (number | string)[] {
    const pages3: (number | string)[] = [];
    const total3 = this.totalPages3;
    const current3 = this.currentPage3;
    const numPagesToShow3 = this.pagesToShow3;

    if (total3 <= numPagesToShow3 + 2) {
      for (let i = 1; i <= total3; i++) {
        pages3.push(i);
      }
    } else {
      let start = Math.max(1, current3 - Math.floor(numPagesToShow3 / 2));
      let end = Math.min(total3, start + numPagesToShow3 - 1);

      if (end === total3) {
        start = Math.max(1, total3 - numPagesToShow3 + 1);
      }

      if (start > 1) {
        pages3.push(1);
        if (start > 2) {
          pages3.push('...');
        }
      }

      for (let i = start; i <= end; i++) {
        pages3.push(i);
      }

      if (end < total3) {
        if (end < total3 - 1) {
          pages3.push('...');
        }
        pages3.push(total3);
      }
    }

    return pages3;
  }

  handlePageClick3(page3: number | string): void {
    if (typeof page3 === 'number') {
      this.goToPage3(page3);
    }
  }
}
