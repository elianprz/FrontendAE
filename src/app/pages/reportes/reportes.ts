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
import { DetalleVentasService } from '../../services/detalleventa.service';
import { VentasService } from '../../services/ventas.service';
import { CatalogoService } from '../../services/catalogo.service';
import { DetalleComprasService } from '../../services/detallecompra.service';
import { ComprasService } from '../../services/compras.service';
// Exportar a xlms
import * as XLSX from 'xlsx';
// Graficas
import {
  Chart,
  ChartConfiguration,
  ChartOptions,
  ChartType,
  registerables,
} from 'chart.js';

Chart.register(...registerables);

// ---- 2️⃣  PLUGIN que pinta el fondo blanco ----------------------
const whiteBackgroundPlugin = {
  id: 'whiteBackground',
  // `beforeDraw` se ejecuta **antes** de que Chart.js pinte los datasets
  beforeDraw: (chart: any) => {
    const ctx = chart.ctx;
    ctx.save();

    // “destination-over” dibuja *detrás* de todo lo que Chart.js dibuje después
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = '#ffffff'; // <-- color de fondo deseado
    ctx.fillRect(0, 0, chart.width, chart.height);

    ctx.restore();
  },
};

// Registramos el plugin **una sola vez** (al cargar el fichero)
Chart.register(whiteBackgroundPlugin);

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './reportes.html',
  styleUrl: './reportes.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class Reportes implements OnInit {
  // Usuarios
  users: any[] = [];
  roles: any[] = [];
  rolesMap: { [key: number]: string } = {};

  // Gráfica de usuarios
  public estadoPieChartData: ChartConfiguration<'pie'>['data'] = {
    labels: ['Activo', 'Inactivo'],
    datasets: [{ data: [0, 0], backgroundColor: ['#10B981', '#EF4444'] }],
  };

  public estadoPieChartOptions: ChartConfiguration<'pie'>['options'] = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const label = ctx.label ?? '';
            const value = ctx.parsed;
            const total = ctx.dataset.data.reduce(
              (s, c) => Number(s) + Number(c),
              0
            );
            const pct = total ? ((value / total) * 100).toFixed(1) : 0;
            return `${label}: ${value} (${pct} %)`;
          },
        },
      },
    },
  };

  /* -------------------------------------------------
   * 3️⃣  BARRA – TOTAL DE USUARIOS
   * ------------------------------------------------- */
  public usuariosBarChartData: ChartConfiguration<'bar'>['data'] = {
    labels: ['Usuarios'],
    datasets: [
      {
        label: 'Cantidad total',
        data: [0],
        backgroundColor: '#3B82F6',
        borderColor: '#3B82F6',
        borderWidth: 1,
      },
    ],
  };

  public usuariosBarChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0, // <-- correcto para Chart.js 4
        },
      },
    },
    plugins: { legend: { display: false } },
  };

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

  // Gráfica para Caja sesión
  // 2️⃣  Datos que alimentarán a los dos charts
  public aperturaBarChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [], // ← se rellenará con las fechas de apertura
    datasets: [], // ← dataset de Montos de apertura
  };

  public cierreBarChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [], // ← se rellenará con las fechas de cierre
    datasets: [], // ← dataset de Montos de cierre
  };

  // 3️⃣  Opciones comunes (se usan en ambas gráficas)
  public barraChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: false, // necesario porque el chart está "off‑screen"
    animation: false,
    scales: {
      x: {
        // Las fechas suelen ser largas → evitamos que se salten etiquetas
        ticks: { autoSkip: false, maxRotation: 90, minRotation: 45 },
      },
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0, // <-- correcto para Chart.js 4
        },
      },
    },
    plugins: {
      legend: { display: true },
    },
  };

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

  // Gráficas
  // 2️⃣  Datos de la **barra** (Tipo vs Monto por Fecha)
  public tipoFechaBarChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [], // ← fechas
    datasets: [], // ← un dataset por cada tipo
  };

  /* ----------------------------------------------------------------- */
  // 3️⃣  Datos de la **pie** (Concepto vs Monto)
  public conceptoPieChartData: ChartConfiguration<'pie'>['data'] = {
    labels: [], // ← conceptos (únicos)
    datasets: [], // ← un único dataset con colores diferentes
  };

  /* ----------------------------------------------------------------- */
  // 4️⃣  Opciones (las usamos para ambas, solo cambiamos lo que haga falta)
  public barraChartOptions2: ChartConfiguration<'bar'>['options'] = {
    responsive: false,
    animation: false,
    scales: {
      x: {
        ticks: { autoSkip: false, maxRotation: 90, minRotation: 45 },
      },
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0, // <-- correcto para Chart.js 4
        },
      },
    },
    plugins: { legend: { display: true } },
  };

  public pieChartOptions: ChartConfiguration<'pie'>['options'] = {
    responsive: false,
    animation: false,
    plugins: { legend: { position: 'right' } },
  };

  // Detalle ventas
  detalleVentas: any[] = [];
  // Paginación y Filtro con sufijo 4
  searchText4: string = '';
  filteredDetalleVentas: any[] = [];
  paginatedDetalleVentas: any[] = [];

  detalleCompras: any[] = [];
  paginatedDetalleCompras: any[] = [];
  filteredDetalleCompras: any[] = [];

  currentPage4: number = 1;
  itemsPerPage4: number = 7;
  totalDetalleVentas: number = 0;
  private pagesToShow4: number = 5;
  public Math4 = Math;
  // Gráficas
  // 2️⃣  Gráfica 1 – Cantidad por producto
  public productosCantidadChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [], // ← nombres de producto
    datasets: [], // ← un único dataset (cantidad)
  };

  // 3️⃣  Gráfica 2 – Subtotal por producto
  public productosSubtotalChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [], // ← nombres de producto
    datasets: [], // ← un único dataset (subtotal)
  };

  // 4️⃣  Gráfica 3 – Detalle ventas (cantidad, precio‑unitario, subtotal)
  public detalleVentasChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [], // ← nombres de producto
    datasets: [], // ← tres datasets
  };

  /* ----------------------------------------------------------------- */
  // 5️⃣  Opciones comunes (las usamos para las tres gráficas)
  public barraChartOptions3: ChartConfiguration<'bar'>['options'] = {
    responsive: false,
    animation: false,
    scales: {
      x: {
        ticks: { autoSkip: false, maxRotation: 90, minRotation: 45 },
      },
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0, // <-- correcto para Chart.js 4
        },
      },
    },
    plugins: { legend: { display: true } },
  };

  // Paginación y Filtro con sufijo 5
  searchText5: string = '';
  currentPage5: number = 1;
  itemsPerPage5: number = 7;
  totalDetalleCompras: number = 0;
  private pagesToShow5: number = 5;
  public Math5 = Math;

  // Gráficas compras
  /* 2️⃣  Gráfica 1 – Bar (productos más caros) */
  public productosMasCarosBarData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: [],
  };

  /* 3️⃣  Gráfica 2 – Line (subtotal por fecha de compra) */
  public subtotalPorFechaLineData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: [],
  };

  /* ----------------------------------------------------------------- */
  /* 4️⃣  Opciones comunes */
  public barraChartOptions5: ChartConfiguration<'bar'>['options'] = {
    responsive: false,
    animation: false,
    scales: {
      x: {
        ticks: { autoSkip: false, maxRotation: 90, minRotation: 45 },
      },
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0, // <-- correcto para Chart.js 4
        },
      },
    },
    plugins: { legend: { display: true } },
  };

  public lineChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: false,
    animation: false,
    scales: {
      x: {
        ticks: { autoSkip: false, maxRotation: 90, minRotation: 45 },
      },
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0, // <-- correcto para Chart.js 4
        },
      },
    },
    plugins: { legend: { position: 'top' } },
  };

  // Inicializamos la variable en 'menu' para mostrar el menú al inicio
  private readonly validReports = [
    'menu',
    'usuarios',
    'sesionesCaja',
    'movimientosCaja',
    'detalleVentas',
    'detalleCompras',
  ];

  currentReport: string | null = 'menu';

  constructor(
    private userService: UserService,
    private roleService: RoleService,
    private cajaSesionService: CajasesionService,
    private movimientoCajaService: MovimientoCajaService,
    private detalleVentasService: DetalleVentasService,
    private ventasService: VentasService,
    private catalogoService: CatalogoService,
    private detalleComprasService: DetalleComprasService,
    private comprasService: ComprasService
  ) {}

  ngOnInit(): void {
    this.getUsersWithRoles();
    this.fetchData();
    this.fetchDataSimple();
    this.fetchDetalleVentas();
    this.fetchDetalleCompras();
  }

  // Menu
  // Método para cambiar la vista
  showReport(reportName: string): void {
    // Verifica si el nombre del reporte es válido
    if (this.validReports.includes(reportName)) {
      this.currentReport = reportName;
    } else {
      console.error(`Reporte no válido: ${reportName}`);
      // Puedes manejar el error, por ejemplo, volviendo al menú
      this.currentReport = 'menu';
    }
  }

  // Método para volver al menú principal
  showMenu(): void {
    this.currentReport = 'menu';
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

  //Users with roles
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

          this.updateCharts();
          this.applyFiltersAndSearch();
        },
        error: (error) => {
          console.error('Error al cargar datos:', error);
        },
      });
  }

  // Graficar 1

  private updateCharts(filtered?: any[]): void {
    const src = filtered ?? this.users;

    const activos = src.filter((u) => u.estado).length;
    const inactivos = src.length - activos;
    this.estadoPieChartData.datasets[0].data = [activos, inactivos];

    this.usuariosBarChartData.datasets[0].data = [src.length];
  }

  // 5️⃣  MÉTODO GENÉRICO PARA GENERAR Y DESCARGAR UN PNG DE UN CHART
  private downloadChartAsPng(
    type: ChartType,
    data: ChartConfiguration['data'],
    options: ChartOptions | undefined,
    fileName: string
  ): void {
    // ----------- 1️⃣  Canvas en memoria -------------
    const canvas = document.createElement('canvas');
    canvas.width = 800; // tamaño que desees
    canvas.height = 600;

    const ctx = canvas.getContext('2d')!;

    // ----------- 2️⃣  Instanciar el Chart.js ----------
    // El plugin `whiteBackgroundPlugin` se ejecutará automáticamente
    const chart = new Chart(ctx, {
      type,
      data,
      options: {
        ...(options ?? {}),
        responsive: false, // forzamos tamaño fijo (no hay container)
        animation: false, // sin animaciones → instantáneo
      },
    });

    // ----------- 3️⃣  Obtener la imagen -------------
    const base64Image = chart.toBase64Image(); // data:image/png;base64,...

    // ----------- 4️⃣  Liberar recursos -------------
    chart.destroy();

    // ----------- 5️⃣  Forzar la descarga ------------
    const a = document.createElement('a');
    a.href = base64Image;
    a.download = `${fileName}.png`;
    a.click();
  }

  downloadAllCharts(): void {
    // PIE → usuarios‑estado.png
    this.downloadChartAsPng(
      'pie',
      this.estadoPieChartData,
      this.estadoPieChartOptions,
      'usuarios-estado'
    );

    // BARRA → total‑usuarios.png
    this.downloadChartAsPng(
      'bar',
      this.usuariosBarChartData,
      this.usuariosBarChartOptions,
      'total-usuarios'
    );
  }

  //

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

  // USUARIOS
  // Exportar a Excel
  // Función para transformar los datos
  getExportData(users: any[]): any[] {
    return users.map((user) => ({
      'Nombre Completo': `${user.primerNombre} ${user.segundoNombre} ${user.primerApellido} ${user.segundoApellido}`,
      Usuario: user.nombreUsuario,
      Correo: user.email,
      Rol: user.rolNombre, // Asumo que tienes rolNombre en el objeto
      Estado: user.estado ? 'Activo' : 'Inactivo',
      NIT: user.nit, // Incluyes todos los campos necesarios
      CUI: user.cui,
      // ... otros campos
    }));
  }

  exportToExcel(data: any[], fileName: string): void {
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'DatosUsuarios');

    // Exportar a XLSX
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  }

  exportToCSV(data: any[], fileName: string): void {
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);

    // Convertir la hoja a CSV y descargar
    const csv = XLSX.utils.sheet_to_csv(ws);

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${fileName}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  // Método a llamar desde el botón
  onExport(format: 'excel' | 'csv'): void {
    // Usa todos los datos, no solo los paginados si quieres la exportación completa
    const dataToExport = this.getExportData(this.users); // Usa allUsers
    const fileName = 'ReporteUsuarios';

    if (format === 'excel') {
      this.exportToExcel(dataToExport, fileName);
    } else {
      this.exportToCSV(dataToExport, fileName);
    }
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
  // End Usuarios

  // Caja Sesión
  fetchData(): void {
    this.cajaSesionService
      .getCajasesiones()
      .pipe(take(1))
      .subscribe({
        next: (cajaSesiones) => {
          // this.cajaSesiones = cajaSesiones.map((sesion) => {
          //   return {
          //     ...sesion,
          //     fechaApertura: this.formatDateForDisplay(sesion.fechaApertura),
          //     fechaCierre: this.formatDateForDisplay(sesion.fechaCierre),
          //   };
          // });
          // -------------------------------------------------
          // 1️⃣  Formateamos fechas (mantén tu método)
          this.cajaSesiones = cajaSesiones.map((sesion) => ({
            ...sesion,
            fechaApertura: this.formatDateForDisplay(sesion.fechaApertura),
            fechaCierre: this.formatDateForDisplay(sesion.fechaCierre),
          }));

          // -------------------------------------------------
          // 2️⃣  Preparar datos para la **gráfica Apertura**
          const aperturaLabels = this.cajaSesiones.map((s) => s.fechaApertura);
          const aperturaValues = this.cajaSesiones.map((s) =>
            Number(s.montoApertura)
          );

          this.aperturaBarChartData = {
            labels: aperturaLabels,
            datasets: [
              {
                label: 'Monto Apertura',
                data: aperturaValues,
                backgroundColor: '#3B82F6', // azul
                borderColor: '#3B82F6',
              },
            ],
          };

          // -------------------------------------------------
          // 3️⃣  Preparar datos para la **gráfica Cierre**
          const cierreLabels = this.cajaSesiones.map((s) => s.fechaCierre);
          const cierreValues = this.cajaSesiones.map((s) =>
            Number(s.montoCierre)
          );

          this.cierreBarChartData = {
            labels: cierreLabels,
            datasets: [
              {
                label: 'Monto Cierre',
                data: cierreValues,
                backgroundColor: '#10B981', // verde
                borderColor: '#10B981',
              },
            ],
          };

          this.applySearchFilter2();
        },
        error: (error) => {
          console.error('Error al cargar las sesiones de caja:', error);
        },
      });
  }

  // Graficar

  // ---- Descarga de ambas gráficas de CajaSesión ---------------------------
  downloadCajaCharts(): void {
    // Apertura
    this.downloadChartAsPng(
      'bar',
      this.aperturaBarChartData,
      this.barraChartOptions,
      'caja-apertura' // nombre del archivo (sin extensión)
    );

    // Cierre
    this.downloadChartAsPng(
      'bar',
      this.cierreBarChartData,
      this.barraChartOptions,
      'caja-cierre'
    );
  }

  // Excel
  private getExportDataCaja(cajas: any[]): any[] {
    return cajas.map((c) => ({
      'Fecha Apertura': c.fechaApertura, // ya está formateada en fetchData()
      'Monto Apertura': Number(c.montoApertura), // forzamos número
      'Fecha Cierre': c.fechaCierre,
      'Monto Cierre': Number(c.montoCierre),
      Estado: c.estado ? 'Activo' : 'Inactivo', // asumiendo que es boolean
      Observación: c.observacion ?? '', // campo opcional
    }));
  }

  exportToExcelCajaS(data: any[], fileName: string): void {
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Datos');
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  }

  exportToCSVCajaS(data: any[], fileName: string): void {
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${fileName}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  onExportCajaS(format: 'excel' | 'csv'): void {
    // Usa **todos** los registros (no sólo los paginados)
    const dataToExport = this.getExportDataCaja(this.cajaSesiones);
    const fileName = 'ReporteCajaSesion';

    if (format === 'excel') {
      this.exportToExcelCajaS(dataToExport, fileName);
    } else {
      this.exportToCSVCajaS(dataToExport, fileName);
    }
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

          // -------------------------------------------------
          // 2️⃣  ----- GRAFICA DE BARRAS : Tipo – Monto – Fecha -----
          this.prepareBarChartTipoFecha();

          // -------------------------------------------------
          // 3️⃣  ----- GRAFICA DE PIE : Concepto – Monto ----------
          this.preparePieChartConcepto();

          // Aplica el filtro (si lo tienes)
          this.applySearchFilter3();
        },
        error: (error) => {
          console.error('Error al cargar los movimientos de caja:', error);
        },
      });
  }

  // Gráficas 3
  private prepareBarChartTipoFecha(): void {
    // ---- 1️⃣  FECHAS ÚNICAS (ordenadas) ----
    const fechas = Array.from(
      new Set(this.movimientoCajas.map((m) => m.fecha))
    ).sort(); // si la fecha está en formato ISO “YYYY‑MM‑DD” el sort alfabético funciona

    // ---- 2️⃣  TIPOS ÚNICOS ----
    const tipos = Array.from(new Set(this.movimientoCajas.map((m) => m.tipo)));

    // ---- 3️⃣  CREAR UN DATASET POR CADA TIPO ----
    const datasets = tipos.map((tipo, idx) => {
      // datos alineados con el array de fechas
      const data = fechas.map((fecha) => {
        const total = this.movimientoCajas
          .filter((m) => m.tipo === tipo && m.fecha === fecha)
          .reduce((sum, cur) => sum + Number(cur.monto), 0);
        return total;
      });

      // color aleatorio (puedes usar una paleta fija si lo prefieres)
      const color = this.getRandomColor();

      return {
        label: tipo,
        data,
        backgroundColor: color,
        borderColor: color,
        borderWidth: 1,
      };
    });

    // ---- 4️⃣  ASIGNAR al chart data ----
    this.tipoFechaBarChartData = {
      labels: fechas,
      datasets,
    };
  }

  private preparePieChartConcepto(): void {
    // ---- 1️⃣  AGREGAR MONTOS POR CONCEPTO ----
    const acumuladoPorConcepto: { [concepto: string]: number } = {};

    this.movimientoCajas.forEach((m) => {
      const concepto = m.concepto;
      const monto = Number(m.monto);
      acumuladoPorConcepto[concepto] =
        (acumuladoPorConcepto[concepto] ?? 0) + monto;
    });

    // ---- 2️⃣  EXTRAER LABELS y DATA ----
    const labels = Object.keys(acumuladoPorConcepto);
    const data = Object.values(acumuladoPorConcepto);

    // ---- 3️⃣  COLORES (uno por sector) ----
    const backgroundColors = labels.map(() => this.getRandomColor());

    // ---- 4️⃣  ASIGNAR al chart data ----
    this.conceptoPieChartData = {
      labels,
      datasets: [
        {
          data,
          backgroundColor: backgroundColors,
        },
      ],
    };
  }

  private getRandomColor(): string {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }

  downloadMovimientoCharts(): void {
    // 1️⃣  BAR – Tipo / Fecha / Monto
    this.downloadChartAsPng(
      'bar',
      this.tipoFechaBarChartData,
      this.barraChartOptions,
      'movimientos-tipo-fecha' // nombre del archivo sin extensión
    );

    // 2️⃣  PIE – Concepto / Monto
    this.downloadChartAsPng(
      'pie',
      this.conceptoPieChartData,
      this.pieChartOptions,
      'movimientos-concepto'
    );
  }

  // Export XLXS or CSV
  private getExportDataMovimiento(movs: any[]): any[] {
    return movs.map((m) => ({
      Tipo: m.tipo,
      Concepto: m.concepto,
      Monto: Number(m.monto), // garantizamos número
      Fecha: m.fecha, // ya está formateada en fetchDataSimple()
    }));
  }

  exportToExcelMovimiento(data: any[], fileName: string): void {
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Datos');
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  }

  /** Exportar a CSV */
  exportToCSVMovimiento(data: any[], fileName: string): void {
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${fileName}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  onExportMovimiento(format: 'excel' | 'csv'): void {
    const dataToExport = this.getExportDataMovimiento(this.movimientoCajas);
    const fileName = 'ReporteMovimientoCaja';

    if (format === 'excel') {
      this.exportToExcelMovimiento(dataToExport, fileName);
    } else {
      this.exportToCSVMovimiento(dataToExport, fileName);
    }
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

  // Detalle ventas
  fetchDetalleVentas(): void {
    forkJoin({
      ventas: this.ventasService.getVentas().pipe(take(1)),
      productos: this.catalogoService.getProductos().pipe(take(1)),
      detalleVentas: this.detalleVentasService.getDetalleVentas().pipe(take(1)),
    }).subscribe({
      next: (results) => {
        // Mapeamos las ventas para un acceso rápido por VentaId
        const ventasMap = new Map(
          results.ventas.map((v: any) => [v.ventaId, v])
        );

        const productosMap = new Map(
          results.productos.map((p: any) => [p.productoId, p])
        );

        this.detalleVentas = results.detalleVentas.map((dv: any) => {
          const venta = ventasMap.get(dv.ventaId);
          const producto = productosMap.get(dv.productoId);

          const fechaVenta = venta
            ? this.formatDateForDisplay(venta.fechaVenta)
            : 'N/A';

          return {
            ...dv,
            fechaVenta: fechaVenta,
            productoNombre: producto
              ? producto.nombre
              : 'Producto no encontrado',
          };
        });

        this.prepareProductosCharts(); // Cantidad + Subtotal
        this.prepareDetalleVentasChart(); // 3 datasets

        this.applySearchFilter4();
      },
      error: (error) => {
        console.error('Error al cargar los datos:', error);
      },
    });
  }

  // Export data excel
  private getExportDataDetalleVentas(detalles: any[]): any[] {
    return detalles.map((d) => ({
      Cantidad: Number(d.cantidad), // aseguramos número
      PrecioUnitario: Number(d.precioUnitario),
      Subtotal: Number(d.subtotal),
    }));
  }

  onExportDetalleVentas(format: 'excel' | 'csv'): void {
    const dataToExport = this.getExportDataDetalleVentas(this.detalleVentas);
    const fileName = 'ReporteDetalleVentas';

    if (format === 'excel') {
      this.exportToExcelDetalleVenta(dataToExport, fileName);
    } else {
      this.exportToCSVDetalleVenta(dataToExport, fileName);
    }
  }

  exportToExcelDetalleVenta(data: any[], fileName: string): void {
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Datos');
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  }

  exportToCSVDetalleVenta(data: any[], fileName: string): void {
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${fileName}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  // Helper para convertir fecha
  // formatDateForDisplay(dateString: string): string {
  //   if (!dateString) return '';
  //   try {
  //     const date = new Date(dateString);
  //     if (isNaN(date.getTime())) {
  //       return 'Formato de fecha inválido';
  //     }
  //     const day = ('0' + date.getDate()).slice(-2);
  //     const month = ('0' + (date.getMonth() + 1)).slice(-2);
  //     const year = date.getFullYear();
  //     return `${day}-${month}-${year}`;
  //   } catch (e) {
  //     console.error('Error al formatear la fecha:', e);
  //     return 'N/A';
  //   }
  // }

  private prepareProductosCharts(): void {
    /* -------------------------------------------------
     * Agrupamos por nombre de producto
     * ------------------------------------------------- */
    const agrupa: {
      [nombre: string]: { cantidad: number; subtotal: number };
    } = {};

    this.detalleVentas.forEach((dv) => {
      const nombre = dv.productoNombre;
      if (!agrupa[nombre]) {
        agrupa[nombre] = { cantidad: 0, subtotal: 0 };
      }
      agrupa[nombre].cantidad += Number(dv.cantidad);
      agrupa[nombre].subtotal += Number(dv.subtotal);
    });

    const labels = Object.keys(agrupa);
    const cantidades = labels.map((l) => agrupa[l].cantidad);
    const subtotales = labels.map((l) => agrupa[l].subtotal);

    /* ---------- GRÁFICA 1 – CANTIDAD ---------- */
    this.productosCantidadChartData = {
      labels,
      datasets: [
        {
          label: 'Cantidad vendida',
          data: cantidades,
          backgroundColor: '#3B82F6', // azul
          borderColor: '#3B82F6',
          borderWidth: 1,
        },
      ],
    };

    /* ---------- GRÁFICA 2 – SUBTOTAL ---------- */
    this.productosSubtotalChartData = {
      labels,
      datasets: [
        {
          label: 'Total vendido',
          data: subtotales,
          backgroundColor: '#10B981', // verde
          borderColor: '#10B981',
          borderWidth: 1,
        },
      ],
    };
  }

  private prepareDetalleVentasChart(): void {
    /* -------------------------------------------------
     * Agrupamos por producto para obtener:
     *   – totalCantidad
     *   – totalSubtotal
     *   – precioUnitarioPromedio
     * ------------------------------------------------- */
    const agrupa: {
      [nombre: string]: {
        cantidad: number;
        subtotal: number;
        precioSum: number;
        precioCnt: number;
      };
    } = {};

    this.detalleVentas.forEach((dv) => {
      const nombre = dv.productoNombre;
      if (!agrupa[nombre]) {
        agrupa[nombre] = {
          cantidad: 0,
          subtotal: 0,
          precioSum: 0,
          precioCnt: 0,
        };
      }
      agrupa[nombre].cantidad += Number(dv.cantidad);
      agrupa[nombre].subtotal += Number(dv.subtotal);
      agrupa[nombre].precioSum += Number(dv.precioUnitario);
      agrupa[nombre].precioCnt += 1;
    });

    const labels = Object.keys(agrupa);
    const cantidades = labels.map((l) => agrupa[l].cantidad);
    const subtotales = labels.map((l) => agrupa[l].subtotal);
    const precioProm = labels.map((l) => {
      const info = agrupa[l];
      return info.precioCnt ? info.precioSum / info.precioCnt : 0;
    });

    this.detalleVentasChartData = {
      labels,
      datasets: [
        {
          label: 'Cantidad',
          data: cantidades,
          backgroundColor: '#3B82F6', // azul
          borderColor: '#3B82F6',
          borderWidth: 1,
        },
        {
          label: 'Precio unitario (prom.)',
          data: precioProm,
          backgroundColor: '#F59E0B', // ámbar
          borderColor: '#F59E0B',
          borderWidth: 1,
        },
        {
          label: 'Total',
          data: subtotales,
          backgroundColor: '#EF4444', // rojo
          borderColor: '#EF4444',
          borderWidth: 1,
        },
      ],
    };
  }

  downloadDetalleVentasCharts(): void {
    // 1️⃣  Cantidad por producto
    this.downloadChartAsPng(
      'bar',
      this.productosCantidadChartData,
      this.barraChartOptions,
      'productos-cantidad'
    );

    // 2️⃣  Subtotal por producto
    this.downloadChartAsPng(
      'bar',
      this.productosSubtotalChartData,
      this.barraChartOptions,
      'productos-total'
    );

    // 3️⃣  DetalleVentas (cantidad, precio‑unitario, subtotal)
    this.downloadChartAsPng(
      'bar',
      this.detalleVentasChartData,
      this.barraChartOptions,
      'detalle-ventas'
    );
  }

  // Lógica de Paginación y Filtro con sufijo 4
  applySearchFilter4(): void {
    if (this.searchText4) {
      const lowerCaseSearchText = this.searchText4.toLowerCase();
      this.filteredDetalleVentas = this.detalleVentas.filter((detalle) => {
        return (
          (detalle.productoNombre || '')
            .toLowerCase()
            .includes(lowerCaseSearchText) ||
          (detalle.fechaVenta || '').toLowerCase().includes(lowerCaseSearchText)
        );
      });
    } else {
      this.filteredDetalleVentas = [...this.detalleVentas];
    }
    this.totalDetalleVentas = this.filteredDetalleVentas.length;
    this.currentPage4 = 1;
    this.paginateDetalleVentas4();
  }

  paginateDetalleVentas4(): void {
    const startIndex = (this.currentPage4 - 1) * this.itemsPerPage4;
    const endIndex = startIndex + this.itemsPerPage4;
    this.paginatedDetalleVentas = this.filteredDetalleVentas.slice(
      startIndex,
      endIndex
    );
  }

  goToPage4(page: number): void {
    if (page >= 1 && page <= this.totalPages4) {
      this.currentPage4 = page;
      this.paginateDetalleVentas4();
    }
  }

  nextPage4(): void {
    if (this.currentPage4 < this.totalPages4) {
      this.currentPage4++;
      this.paginateDetalleVentas4();
    }
  }

  prevPage4(): void {
    if (this.currentPage4 > 1) {
      this.currentPage4--;
      this.paginateDetalleVentas4();
    }
  }

  get totalPages4(): number {
    return Math.ceil(this.totalDetalleVentas / this.itemsPerPage4);
  }

  get pages4(): (number | string)[] {
    const pages: (number | string)[] = [];
    const total = this.totalPages4;
    const current = this.currentPage4;
    const numPagesToShow = this.pagesToShow4;

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

  handlePageClick4(page: number | string): void {
    if (typeof page === 'number') {
      this.goToPage4(page);
    }
  }

  // Detalle compras
  fetchDetalleCompras(): void {
    forkJoin({
      compras: this.comprasService.getCompras().pipe(take(1)),
      productos: this.catalogoService.getProductos().pipe(take(1)),
      detalleCompras: this.detalleComprasService
        .getDetalleCompras()
        .pipe(take(1)),
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
            ? this.formatDateForDisplay5(compra.fechaCompra)
            : 'N/A';

          return {
            ...dc,
            fechaCompra: fechaCompra,
            productoNombre: producto
              ? producto.nombre
              : 'Producto no encontrado',
          };
        });

        this.prepareDetalleComprasCharts();

        this.applySearchFilter5();
      },
      error: (error) => {
        console.error('Error al cargar los datos:', error);
      },
    });
  }

  //Export to excel
  private getExportDataDetalleCompras(compras: any[]): any[] {
    return compras.map((c) => ({
      Cantidad: Number(c.cantidad),
      PrecioUnitario: Number(c.precioUnitario),
      Subtotal: Number(c.subtotal),
    }));
  }

  onExportDetalleCompras(format: 'excel' | 'csv'): void {
    const dataToExport = this.getExportDataDetalleCompras(this.detalleCompras);
    const fileName = 'ReporteDetalleCompras';

    if (format === 'excel') {
      this.exportToExcelDetalleCompra(dataToExport, fileName);
    } else {
      this.exportToCSVDetalleCompra(dataToExport, fileName);
    }
  }

  exportToExcelDetalleCompra(data: any[], fileName: string): void {
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Datos');
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  }

  exportToCSVDetalleCompra(data: any[], fileName: string): void {
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${fileName}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  /* 6️⃣  CÁLCULO DE LOS GRÁFICOS */
  private prepareDetalleComprasCharts(): void {
    /* ---------- 1️⃣  PRODUCTOS MÁS CAROS (por subtotal) ---------- */
    const porProducto: {
      [nombre: string]: {
        subtotal: number;
        cantidad: number;
        precioSum: number;
        cnt: number;
      };
    } = {};

    this.detalleCompras.forEach((dc) => {
      const nombre = dc.productoNombre;
      if (!porProducto[nombre]) {
        porProducto[nombre] = {
          subtotal: 0,
          cantidad: 0,
          precioSum: 0,
          cnt: 0,
        };
      }
      porProducto[nombre].subtotal += Number(dc.subtotal);
      porProducto[nombre].cantidad += Number(dc.cantidad);
      porProducto[nombre].precioSum += Number(dc.precioUnitario);
      porProducto[nombre].cnt += 1;
    });

    // Convertimos a array y ordenamos por subtotal descendente
    const ordenado = Object.entries(porProducto)
      .map(([nombre, v]) => ({
        nombre,
        totalSubtotal: v.subtotal,
        totalCantidad: v.cantidad,
        avgPrecio: v.cnt ? v.precioSum / v.cnt : 0,
      }))
      .sort((a, b) => b.totalSubtotal - a.totalSubtotal);

    // Opcional: mostrar solo los 5 primeros (puedes cambiar el número)
    const top = ordenado.slice(0, 5);
    this.productosMasCarosBarData = {
      labels: top.map((p) => p.nombre),
      datasets: [
        {
          label: 'Subtotal (más caro)',
          data: top.map((p) => p.totalSubtotal),
          backgroundColor: '#EF4444', // rojo
          borderColor: '#EF4444',
          borderWidth: 1,
        },
      ],
    };

    /* ---------- 2️⃣  SUBTOTAL POR FECHA DE COMPRA (línea) ---------- */
    const porFecha: { [fecha: string]: number } = {};

    this.detalleCompras.forEach((dc) => {
      const fecha = dc.fechaCompra; // ya está formateada como string
      porFecha[fecha] = (porFecha[fecha] ?? 0) + Number(dc.subtotal);
    });

    // Ordenamos cronológicamente (asumiendo formato ISO)
    const fechasOrdenadas = Object.keys(porFecha).sort(
      (a, b) => new Date(a).valueOf() - new Date(b).valueOf()
    );

    this.subtotalPorFechaLineData = {
      labels: fechasOrdenadas,
      datasets: [
        {
          label: 'Subtotal por fecha',
          data: fechasOrdenadas.map((f) => porFecha[f]),
          borderColor: '#3B82F6', // azul
          backgroundColor: '#3B82F6',
          fill: false,
          tension: 0.2,
        },
      ],
    };
  }

  downloadDetalleComprasCharts(): void {
    // 1️⃣  Bar – productos más caros
    this.downloadChartAsPng(
      'bar',
      this.productosMasCarosBarData,
      this.barraChartOptions,
      'productos-mas-caros'
    );

    // 2️⃣  Line – subtotal acumulado por fecha
    this.downloadChartAsPng(
      'line',
      this.subtotalPorFechaLineData,
      this.lineChartOptions,
      'subtotal-por-fecha'
    );
  }

  // Helper para convertir fecha de YYYY-MM-DD a DD-MM-YYYY
  formatDateForDisplay5(dateString: string): string {
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
          (detalle.productoNombre || '')
            .toLowerCase()
            .includes(lowerCaseSearchText) ||
          (detalle.fechaCompra || '')
            .toLowerCase()
            .includes(lowerCaseSearchText)
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
