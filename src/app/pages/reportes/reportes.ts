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
import { VentasService } from '../../services/ventas.service';
import { CatalogoService } from '../../services/catalogo.service';
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
  ventas: any[] = [];
  compras: any[] = [];

  // Paginación y Filtro con sufijo 4
  searchText4: string = '';
  filteredVentas: any[] = [];
  paginatedVentas: any[] = [];

  //Detalle compras
  paginatedDetalleCompras: any[] = [];
  filteredDetalleCompras: any[] = [];

  currentPage4: number = 1;
  itemsPerPage4: number = 7;
  totalVentas: number = 0;
  private pagesToShow4: number = 5;
  public Math4 = Math;

  searchText5: string = '';
  filteredCompras: any[] = [];
  paginatedCompras: any[] = [];
  currentPage5: number = 1;
  itemsPerPage5: number = 7;
  totalCompras: number = 0;
  private pagesToShow5: number = 5;
  public Math5 = Math;

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
  public ventasChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [], // ← nombres de producto
    datasets: [], // ← tres datasets
  };

  /* ----------------------------------------------------------------- */
  // 5️⃣  Opciones comunes (las usamos para las tres gráficas)
  public productosMasCarosBarData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: [],
  };

  public totalPorFechaLineData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: [],
  };
  public comprasChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: [],
  };

  /* ---------- OPCIONES COMUNES (para los gráficos) ---------- */
  public barraChartOptions5: ChartConfiguration<'bar'>['options'] = {
    responsive: false,
    animation: false,
    scales: {
        // Eje Y primario (para Cantidad y Total)
        y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
                display: true,
                text: 'Cantidad / Total'
            }
        },
        // Eje Y secundario (para Precio Promedio)
        y1: { 
            type: 'linear',
            display: true,
            position: 'right', // Coloca el eje a la derecha
            grid: {
                drawOnChartArea: false, // Solo dibuja el eje, no las líneas de rejilla
            },
            title: {
                display: true,
                text: 'Precio de adquisición'
            }
        },
    },
    plugins: { legend: { display: true } },
  };

  public lineChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: false,
    animation: false,
    scales: {
      x: { ticks: { autoSkip: false, maxRotation: 90, minRotation: 45 } },
      y: { beginAtZero: true, ticks: { precision: 0 } },
    },
    plugins: { legend: { position: 'top' } },
  };

  // Inicializamos la variable en 'menu' para mostrar el menú al inicio
  private readonly validReports = [
    'menu',
    'usuarios',
    'sesionesCaja',
    'movimientosCaja',
    'ventas',
    'compras',
  ];

  currentReport: string | null = 'menu';

  constructor(
    private userService: UserService,
    private roleService: RoleService,
    private cajaSesionService: CajasesionService,
    private movimientoCajaService: MovimientoCajaService,
    private ventasService: VentasService,
    private catalogoService: CatalogoService,
    private comprasService: ComprasService
  ) {}

  ngOnInit(): void {
    this.getUsersWithRoles();
    this.fetchData();
    this.fetchDataSimple();
    this.loadVentasConProductos();
    //this.loadComprasConProductos();
    this.loadCompras();
  }

  // Menu
  // Método para cambiar la vista
  showReport(reportName: string): void {
    // Verifica si el nombre del reporte es válido
    if (this.validReports.includes(reportName)) {
      this.currentReport = reportName;
    } else {
      //console.error(`Reporte no válido: ${reportName}`);
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
          //console.error('Error al cargar datos:', error);
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
          //console.error('Error al cargar las sesiones de caja:', error);
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
          //console.error('Error al cargar los movimientos de caja:', error);
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
  loadVentasConProductos(): void {
    forkJoin({
      ventas: this.ventasService.getVentas().pipe(take(1)), // <-- tabla única
      productos: this.catalogoService.getProductos().pipe(take(1)),
    }).subscribe({
      next: ({ ventas, productos }) => {
        // Mapa rápido de productoId → nombre
        const productosMap = new Map(
          productos.map((p: any) => [p.productoId, p])
        );

        // Enriquecemos cada venta con su nombre de producto y formatamos la fecha.
        this.ventas = ventas.map((v: any) => {
          const producto = productosMap.get(v.productoId);
          return {
            ...v,
            productoNombre: producto
              ? producto.nombre
              : 'Producto no encontrado',
            fechaVenta: this.formatDateForDisplay(v.fechaVenta),
          };
        });

        // -------------------- GRÁFICAS --------------------
        this.prepareProductosCharts(); // Cantidad + Subtotal
        this.prepareDetalleVentasChart(); // 3 datasets (cant., unit., subtotal)

        // -------------------- FILTRO / PAGINADO --------------------
        this.applySearchFilter4(); // <-- usa this.ventas → filteredVentas
      },
      //error: (err) => console.error('Error al cargar ventas y productos:', err),
    });
  }

  private prepareDetalleVentasChart(): void {
    const agrupa: {
      [nombre: string]: {
        cantidad: number;
        subtotal: number;
        precioSum: number;
        precioCnt: number;
      };
    } = {};

    this.ventas.forEach((v) => {
      const nombre = v.productoNombre;
      if (!agrupa[nombre]) {
        agrupa[nombre] = {
          cantidad: 0,
          subtotal: 0,
          precioSum: 0,
          precioCnt: 0,
        };
      }
      agrupa[nombre].cantidad += Number(v.cantidadVendida);
      agrupa[nombre].subtotal += Number(v.subTotal);
      agrupa[nombre].precioSum += Number(v.precioUnitario);
      agrupa[nombre].precioCnt += 1;
    });

    const labels = Object.keys(agrupa);
    const cantidades = labels.map((l) => agrupa[l].cantidad);
    const subtotales = labels.map((l) => agrupa[l].subtotal);
    const precioProm = labels.map((l) =>
      agrupa[l].precioCnt ? agrupa[l].precioSum / agrupa[l].precioCnt : 0
    );

    this.ventasChartData = {
      labels,
      datasets: [
        {
          label: 'Cantidad',
          data: cantidades,
          backgroundColor: '#3B82F6',
          borderColor: '#3B82F6',
          borderWidth: 1,
        },
        {
          label: 'Precio unitario (prom.)',
          data: precioProm,
          backgroundColor: '#F59E0B',
          borderColor: '#F59E0B',
          borderWidth: 1,
        },
        {
          label: 'Total',
          data: subtotales,
          backgroundColor: '#EF4444',
          borderColor: '#EF4444',
          borderWidth: 1,
        },
      ],
    };
  }

  // Export data excel
  private getExportDataVentas(ventas: any[]): any[] {
    return ventas.map((v) => ({
      Fecha: v.fechaVenta,
      Producto: v.productoNombre,
      Cantidad: Number(v.cantidadVendida),
      PrecioUnitario: Number(v.precioUnitario),
      Subtotal: Number(v.subTotal),
    }));
  }

  onExportVentas(format: 'excel' | 'csv'): void {
    const data = this.getExportDataVentas(this.ventas);
    const fileName = 'ReporteVentas';

    if (format === 'excel') this.exportToExcelVentas(data, fileName);
    else this.exportToCSVVentas(data, fileName);
  }

  exportToExcelVentas(data: any[], fileName: string): void {
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Datos');
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  }

  exportToCSVVentas(data: any[], fileName: string): void {
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${fileName}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    const agrupa: { [nombre: string]: { cantidad: number; subtotal: number } } =
      {};

    this.ventas.forEach((v) => {
      const nombre = v.productoNombre;
      if (!agrupa[nombre]) agrupa[nombre] = { cantidad: 0, subtotal: 0 };
      agrupa[nombre].cantidad += Number(v.cantidadVendida); // <-- campo de la tabla
      agrupa[nombre].subtotal += Number(v.subTotal);
    });

    const labels = Object.keys(agrupa);
    const cantidades = labels.map((l) => agrupa[l].cantidad);
    const subtotales = labels.map((l) => agrupa[l].subtotal);

    // --- Gráfica 1 – Cantidad ---
    this.productosCantidadChartData = {
      labels,
      datasets: [
        {
          label: 'Cantidad vendida',
          data: cantidades,
          backgroundColor: '#3B82F6',
          borderColor: '#3B82F6',
          borderWidth: 1,
        },
      ],
    };

    // --- Gráfica 2 – Subtotal ---
    this.productosSubtotalChartData = {
      labels,
      datasets: [
        {
          label: 'Total vendido',
          data: subtotales,
          backgroundColor: '#10B981',
          borderColor: '#10B981',
          borderWidth: 1,
        },
      ],
    };
  }

  private prepareventasChart(): void {
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

    this.ventas.forEach((dv) => {
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

    this.ventasChartData = {
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

  downloadventasCharts(): void {
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

    // 3️⃣  ventas (cantidad, precio‑unitario, subtotal)
    this.downloadChartAsPng(
      'bar',
      this.ventasChartData,
      this.barraChartOptions,
      'detalle-ventas'
    );
  }

  // Lógica de Paginación y Filtro con sufijo 4
  applySearchFilter4(): void {
    // 1️⃣ Filtrar
    const term = this.searchText4.trim().toLowerCase();
    this.filteredVentas = this.ventas.filter((v) => {
      return (
        v.productoNombre?.toLowerCase().includes(term) ||
        v.fechaVenta?.toLowerCase().includes(term) ||
        String(v.cantidadVendida).includes(term) ||
        String(v.subTotal).includes(term)
      );
    });

    // 2️⃣ Paginación
    this.totalVentas = this.filteredVentas.length;
    const start = (this.currentPage4 - 1) * this.itemsPerPage4;
    const end = start + this.itemsPerPage4;
    this.paginatedVentas = this.filteredVentas.slice(start, end);
  }

  paginateventas4(): void {
    const startIndex = (this.currentPage4 - 1) * this.itemsPerPage4;
    const endIndex = startIndex + this.itemsPerPage4;
    this.paginatedVentas = this.filteredVentas.slice(startIndex, endIndex);
  }

  goToPage4(page: number): void {
    if (page >= 1 && page <= this.totalPages4) {
      this.currentPage4 = page;
      this.paginateventas4();
    }
  }

  nextPage4(): void {
    if (this.currentPage4 < this.totalPages4) {
      this.currentPage4++;
      this.paginateventas4();
    }
  }

  prevPage4(): void {
    if (this.currentPage4 > 1) {
      this.currentPage4--;
      this.paginateventas4();
    }
  }

  get totalPages4(): number {
    return Math.ceil(this.totalVentas / this.itemsPerPage4);
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
  loadCompras(): void {
    this.comprasService
      .getCompras() // ← SOLO LA tabla Compras
      .pipe(take(1))
      .subscribe({
        next: (compras: any[]) => {
          /* -----------------------------------------------------------------
           * Enriquecemos cada registro:
           *   – `fechaCompra`  → formato legible (DD‑MM‑YYYY)
           *   – `productoNombre` → usamos el campo `Nombre` (si no, `Descripcion`)
           * ----------------------------------------------------------------- */
          this.compras = compras.map((c: any) => ({
            ...c,
            fechaCompra: this.formatDateForDisplay(c.fechaCompra),
            // Si tu tabla tiene “Nombre” del producto, úsalo. Si no, usa “Descripcion”.
            productoNombre: c.nombre ?? c.descripcion ?? 'Producto sin nombre',
          }));

          // ---- GRÁFICAS ----
          this.generateAllComprasCharts();

          // ---- FILTRO / PAGINACIÓN ----
          this.applySearchFilter5();
        },
        error: (err) =>
          console.error('Error al cargar la lista de compras:', err),
      });
  }
  private getExportDataCompras(compras: any[]): any[] {
    return compras.map((c) => ({
      fechaCompra: c.fechaCompra,
      productoNombre: c.productoNombre,
      Cantidad: Number(c.stock),
      precioAdquisicion: Number(c.precioAdquisicion),
      total: Number(c.total),
      // Si quieres exportar más columnas:
      // Observacion: c.Observacion,
      // Estado: c.Estado,
      // ProveedorId: c.ProveedorId,
    }));
  }

  onExportCompras(format: 'excel' | 'csv'): void {
    const data = this.getExportDataCompras(this.compras);
    const fileName = 'ReporteCompras';

    if (format === 'excel') this.exportToExcel(data, fileName);
    else this.exportToCSV(data, fileName);
  }


  private prepareProductosMasCarosChart(): void {
    const preciosMaximos: { 
        [nombre: string]: number; // Guardará el precio de adquisición máximo para cada producto
    } = {};

    // 1. Encontrar el precio máximo de adquisición por producto
    this.compras.forEach((c) => {
        // Usamos 'nombre' y 'precioAdquisicion' con la convención de minúsculas
        const nombre = c.nombre; 
        const precio = Number(c.precioAdquisicion);

        if (!nombre || isNaN(precio)) return; // Ignorar registros inválidos

        if (!preciosMaximos[nombre] || precio > preciosMaximos[nombre]) {
            preciosMaximos[nombre] = precio;
        }
    });

    // 2. Convertir a un array para ordenar
    const ordered = Object.entries(preciosMaximos)
        .map(([nombre, precio]) => ({ nombre, precio }))
        // Ordenamos DESCENDENTEMENTE por precio
        .sort((a, b) => b.precio - a.precio); 

    // 3. Seleccionar el Top N (ej. los 10 productos más caros)
    const topN = 10;
    const dataForChart = ordered.slice(0, topN);

    //console.log(`✅ Data Productos Más Caros (Top ${topN})`, dataForChart);

    // 4. Mapear los datos al formato de Chart.js
    this.productosMasCarosBarData = {
        labels: dataForChart.map((d) => d.nombre),
        datasets: [
            {
                label: 'Precio de Adquisición Unitario Máximo',
                data: dataForChart.map((d) => d.precio),
                backgroundColor: [
                    '#EF4444', // Rojo para el más caro
                    '#F59E0B', // Naranja
                    '#3B82F6', // Azul
                    '#10B981', // Verde
                    '#6366F1', // Indigo
                    '#EC4899', // Rosa
                    '#9CA3AF', // Gris
                    // Puedes añadir más colores si necesitas un Top N mayor
                ],
                borderColor: '#fff',
                borderWidth: 1,
            },
        ],
    };
}

  downloadDetalleComprasCharts(): void {
    // 1️⃣  Productos más caros (barra)
    this.downloadChartAsPng(
      'bar',
      this.productosMasCarosBarData,
      this.barraChartOptions,
      'productos-mas-caros'
    );

    // 2️⃣  Subtotal por fecha (línea)
    this.downloadChartAsPng(
      'line',
      this.totalPorFechaLineData,
      this.lineChartOptions,
      'total-por-fecha'
    );

    // 3️⃣  Detalle compras (cantidad, precio‑unitario, total) – barra
    this.downloadChartAsPng(
      'bar',
      this.comprasChartData,
      this.barraChartOptions5,
      'detalle-compras'
    );
  }

  private prepareSubtotalPorFechaLineChart(): void {
    const totalPorFecha: { [fecha: string]: number } = {};

    this.compras.forEach((c) => {
      const fecha = c.fechaCompra; // <-- DD‑MM‑YYYY (ya formateada)
      if (!totalPorFecha[fecha]) totalPorFecha[fecha] = 0;
      totalPorFecha[fecha] += Number(c.total);
    });

    // Ordenamos cronológicamente
    const ordered = Object.entries(totalPorFecha)
      .map(([fecha, total]) => ({
        fecha,
        total,
        // Convertimos la fecha “DD‑MM‑YYYY” a milisegundos para ordenar
        sortKey: new Date(fecha.split('-').reverse().join('-')).getTime(),
      }))
      .sort((a, b) => a.sortKey - b.sortKey);

    //console.log('✅ Data total‑por‑fecha (ordered)', ordered);
    /* ----------------------------------------------------------
     *  GUARDAMOS EL RESULTADO EN LA PROPIEDAD QUE USARÁ EL CHART
     * ---------------------------------------------------------- */
    this.totalPorFechaLineData = {
      labels: ordered.map((o) => o.fecha),
      datasets: [
        {
          label: 'Total por día',
          data: ordered.map((o) => o.total),
          fill: false,
          borderColor: '#3B82F6', // azul
          tension: 0.1,
        },
      ],
    };
  }
  //Export to excel
  private getExportDataDetalleCompras(compras: any[]): any[] {
    return compras.map((c) => ({
      stock: Number(c.stock),
      precioAdqusicion: Number(c.precioAdqusicion),
      total: Number(c.total),
    }));
  }

  onExportDetalleCompras(format: 'excel' | 'csv'): void {
    const dataToExport = this.getExportDataDetalleCompras(this.compras);
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
  private prepareDetalleComprasChart(): void {
    const agrupa: {
        [nombre: string]: {
            cantidad: number; // Stock acumulado
            subtotal: number; // Total acumulado
            precioSum: number; // PrecioAdquisicion acumulado
            precioCnt: number; // Contador de registros
        };
    } = {};

    this.compras.forEach((c) => {
        // 🚨 CORRECCIÓN 1: Usar 'nombre' (asumido) o 'Nombre' (si mantiene mayúscula)
        const nombre = c.nombre; 
        
        // Verifica si la propiedad 'nombre' existe y tiene un valor válido
        if (!nombre) return; 

        if (!agrupa[nombre]) {
            agrupa[nombre] = {
                cantidad: 0,
                subtotal: 0,
                precioSum: 0,
                precioCnt: 0,
            };
        }
        
        // 🚨 CORRECCIÓN 2: Usar c.stock, c.total, c.precioAdquisicion (minúscula)
        agrupa[nombre].cantidad += Number(c.stock);
        agrupa[nombre].subtotal += Number(c.total);
        agrupa[nombre].precioSum += Number(c.precioAdquisicion);
        agrupa[nombre].precioCnt += 1;
    });

    const labels = Object.keys(agrupa);
    const cantidades = labels.map((l) => agrupa[l].cantidad);
    const subtotales = labels.map((l) => agrupa[l].subtotal);
    const precioProm = labels.map((l) =>
        agrupa[l].precioCnt ? agrupa[l].precioSum / agrupa[l].precioCnt : 0
    );

    // Asignación de datos al gráfico (Mantenemos esta estructura, ya que es la que quieres)
    this.comprasChartData = {
        labels,
        datasets: [
            {
                label: 'Cantidad (stock)',
                data: cantidades,
                backgroundColor: '#3B82F6',
                borderColor: '#3B82F6',
                borderWidth: 1,
            },
            {
                label: 'Precio unitario (prom.)',
                data: precioProm,
                backgroundColor: '#F59E0B',
                borderColor: '#F59E0B',
                borderWidth: 1,
            },
            {
                label: 'Total',
                data: subtotales,
                backgroundColor: '#EF4444',
                borderColor: '#EF4444',
                borderWidth: 1,
            },
        ],
    };

    //console.log('✅ Data Detalle Compras', agrupa);
}

  private generateAllComprasCharts(): void {
    this.prepareDetalleComprasChart(); // barra detalle compras
    this.prepareSubtotalPorFechaLineChart(); // línea subtotal por fecha
    this.prepareProductosMasCarosChart(); // barra productos más caros
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
      //console.error('Error al formatear la fecha:', e);
      return 'N/A';
    }
  }

  // Lógica de Paginación y Filtro con sufijo 5
  applySearchFilter5(): void {
    if (this.searchText5) {
      const lowerCaseSearchText = this.searchText5.toLowerCase();
      this.filteredDetalleCompras = this.compras.filter((detalle) => {
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
      this.filteredDetalleCompras = [...this.compras];
    }
    this.totalCompras = this.filteredDetalleCompras.length;
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
    return Math.ceil(this.totalCompras / this.itemsPerPage5);
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
