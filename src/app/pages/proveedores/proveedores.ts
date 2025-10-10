import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { HttpClient } from '@angular/common/http';
import { forkJoin, lastValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';

// 🛑 IMPORTACIONES MODIFICADAS
import { ProveedorService } from '../../services/proveedor.service'; // Usar el nuevo servicio de Proveedores
import { CateproveedorService } from '../../services/cateproveedor.service'; // Usar el servicio de Categorías de Proveedores

// ⚠️ NOTA: Asegúrate de que los servicios ProveedorService y CateproveedorService
// estén ubicados correctamente en '../../services/'

@Component({
  selector: 'app-proveedores', // Selector acoplado
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './proveedores.html', // Template acoplado
  styleUrl: './proveedores.css', // Estilo acoplado
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class Proveedores implements OnInit {
  // 🛑 DATA MODIFICADA
  proveedores: any[] = []; // Array principal de proveedores
  categorias: any[] = []; // Categorías de proveedores
  categoriasMap: { [key: number]: string } = {}; // Mapa para obtener el Nombre de la categoría

  // Validaciones
  public validationErrors: string[] = [];

  searchText: string = '';
  filteredProveedores: any[] = []; // Proveedores filtrados
  activeFilters: { [key: string]: Set<any> } = {};

  currentPage: number = 1;
  itemsPerPage: number = 7;
  totalProveedores: number = 0; // Total de proveedores
  paginatedProveedores: any[] = []; // Proveedores paginados

  isCreateModalOpen: boolean = false;
  // 🛑 MODELO MODIFICADO: Adaptado a los campos de Proveedor
  newProveedor: any = {
    nombreEncargado: '', // [NombreEncargado]
    empresa: '', // [Empresa]
    telefono: '', // [Telefono]
    imagenUrl: null, // [ImagenUrl]
    estado: true, // [Estado]
    catProveedorId: null, // [CatProveedorId]
  };

  private pagesToShow: number = 5;
  public Math = Math;

  isEditModalOpen: boolean = false;
  editedProveedor: any = {}; // Proveedor a editar

  // Variable para la imagen seleccionada
  selectedFile: File | null = null;

  isViewModalOpen: boolean = false;
  viewedProveedor: any = {}; // Proveedor a ver

  isDeleteModalOpen: boolean = false;
  proveedorToDelete: any = {}; // Proveedor a eliminar

  // Imagen
  selectedFilePreview: string | ArrayBuffer | null = null;

  constructor(
    // 🛑 SERVICIOS MODIFICADOS
    private proveedorService: ProveedorService,
    private cateproveedorService: CateproveedorService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.getProveedoresWithCategorias(); // Llama a la nueva función de carga
  }

  // 🛑 FUNCIÓN DE CARGA PRINCIPAL MODIFICADA
  /**
   * Carga los proveedores y sus categorías asociadas.
   */
  getProveedoresWithCategorias(): void {
    forkJoin({
      // Llama al servicio de Proveedores
      proveedores: this.proveedorService.getProveedores(),
      // Llama al servicio de Categorías de Proveedores
      categorias: this.cateproveedorService.getCategorias(), // ⚠️ Asegúrate de que tu servicio CateproveedorService tenga el método getCategorias()
    })
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          this.categorias = response.categorias;
          this.categorias.forEach((categoria: any) => {
            // ✅ Mapeo de Categoría: Usamos CatProveedorId y Nombre de la categoría.
            // ⚠️ Ajusta 'CatProveedorId' y 'Nombre' si tu backend usa nombres diferentes (ej: 'id', 'nombre')
            this.categoriasMap[categoria.catProveedorId] = categoria.nombre;
          });

          this.proveedores = response.proveedores.map((proveedor: any) => {
            // Usa el ID de la categoría del proveedor para buscar en el mapa
            const nombre =
              this.categoriasMap[proveedor.catProveedorId] || 'Sin Categoría';
            return {
              ...proveedor,
              // Nuevo campo: 'categoriaNombre' (para mostrar en la tabla/vista)
              categoriaNombre: nombre,
            };
          });

          this.applyFiltersAndSearch();
        },
        error: (error) => {
          //console.error('Error al cargar datos:', error);
        },
      });
  }

  // --- Lógica de Búsqueda y Paginación (Se mantiene, solo se adapta la variable) ---

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

  // 🛑 FUNCIÓN DE FILTRADO Y BÚSQUEDA MODIFICADA
  applyFiltersAndSearch(): void {
    let tempProveedores = [...this.proveedores];
    if (this.searchText) {
      const lowerCaseSearchText = this.searchText.toLowerCase();
      tempProveedores = tempProveedores.filter((proveedor) => {
        // 🛑 Búsqueda por los campos de Proveedor
        const fieldsToSearch = `${proveedor.nombreEncargado || ''} ${
          proveedor.empresa || ''
        } ${proveedor.telefono || ''} ${proveedor.categoriaNombre || ''}`;
        return fieldsToSearch.toLowerCase().includes(lowerCaseSearchText);
      });
    }

    for (const filterType in this.activeFilters) {
      if (this.activeFilters.hasOwnProperty(filterType)) {
        const filterSet = this.activeFilters[filterType];
        if (filterSet.size > 0) {
          tempProveedores = tempProveedores.filter((proveedor) => {
            return filterSet.has(proveedor[filterType]);
          });
        }
      }
    }
    this.filteredProveedores = tempProveedores;
    this.totalProveedores = this.filteredProveedores.length;
    this.currentPage = 1;
    this.paginateProveedores();
  }

  paginateProveedores(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedProveedores = this.filteredProveedores.slice(
      startIndex,
      endIndex
    );
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.paginateProveedores();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.paginateProveedores();
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.paginateProveedores();
    }
  }

  get totalPages(): number {
    return Math.ceil(this.totalProveedores / this.itemsPerPage);
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

  // --- Lógica de Modales ---

  openCreateModal(): void {
    this.isCreateModalOpen = true;
    this.selectedFile = null;
    this.selectedFilePreview = null;
    this.newProveedor.catProveedorId = null; // Reinicia el campo de categoría
  }

  closeCreateModal(): void {
    this.isCreateModalOpen = false;
    // 🛑 Reinicia el modelo al cerrar
    this.newProveedor = {
      nombreEncargado: '',
      empresa: '',
      telefono: '',
      imagenUrl: null,
      estado: true,
      catProveedorId: null,
    };
    this.validationErrors = [];
    this.selectedFile = null;
  }

  // 🛑 MODALES ADAPTADOS A Proveedor
  openEditModal(proveedor: any): void {
    this.editedProveedor = { ...proveedor };
    // Aseguramos que el ID de la categoría sea el correcto para el select
    this.editedProveedor.catProveedorId = proveedor.catProveedorId;
    this.isEditModalOpen = true;
    this.selectedFilePreview = proveedor.imagenUrl;
    this.validationErrors = [];
  }

  closeEditModal(): void {
    this.isEditModalOpen = false;
    this.editedProveedor = {};
    this.validationErrors = [];
    this.selectedFile = null;
  }

  openViewModal(proveedor: any): void {
    this.viewedProveedor = { ...proveedor };
    this.isViewModalOpen = true;
  }

  closeViewModal(): void {
    this.isViewModalOpen = false;
    this.viewedProveedor = {};
  }

  openDeleteModal(proveedor: any): void {
    this.proveedorToDelete = proveedor;
    this.isDeleteModalOpen = true;
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen = false;
    this.proveedorToDelete = {};
  }

  // --- Lógica de Imagen (Mantiene la validación de 1000x1000) ---

  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];
    this.validationErrors = [];

    // Definimos las constantes para las dimensiones
    const MIN_DIMENSION = 40;
    const MAX_DIMENSION = 5000;

    if (this.selectedFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.selectedFilePreview = reader.result;

        const img = new Image();
        img.onload = () => {
          const width = img.width;
          const height = img.height;

          // ✅ Modificamos la validación para verificar el rango (mínimo 40px, máximo 5000px)
          if (
            width < MIN_DIMENSION ||
            height < MIN_DIMENSION ||
            width > MAX_DIMENSION ||
            height > MAX_DIMENSION
          ) {
            this.validationErrors.push(
              `La imagen debe tener dimensiones entre ${MIN_DIMENSION}x${MIN_DIMENSION} y ${MAX_DIMENSION}x${MAX_DIMENSION} píxeles. Dimensiones actuales: ${width}x${height}`
            );
            this.selectedFile = null;
            this.selectedFilePreview = null;
          }
          // Opcional: Si quieres que además de estar en el rango, deba ser cuadrada (lo que se sugiere en tu backend)
          // else if (width !== height) {
          //   this.validationErrors.push(
          //     'La imagen debe ser cuadrada (ancho igual a alto).'
          //   );
          //   this.selectedFile = null;
          //   this.selectedFilePreview = null;
          // }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(this.selectedFile);
    }
  }

  // 🛑 FUNCIÓN DE SUBIDA DE IMAGEN MODIFICADA
  async uploadImageAndGetUrl(): Promise<string | null> {
    if (!this.selectedFile) {
      return null;
    }

    try {
      // ✅ Llama al servicio de Proveedor para subir la imagen (asume que existe este método)
      const response: any = await lastValueFrom(
        this.proveedorService.uploadImage(this.selectedFile) // ⚠️ Asegúrate de implementar uploadImage en ProveedorService
      );
      // Asume que la respuesta del backend tiene una propiedad 'url'
      return response.url;
    } catch (error) {
      //console.error('Error al subir la imagen:', error);
      this.validationErrors.push(
        'Error al subir la imagen. Inténtelo de nuevo.'
      );
      return null;
    }
  }

  // --- CRUD (Crear, Actualizar, Eliminar) ---

  // 🛑 FUNCIÓN DE CREACIÓN MODIFICADA
  async createProveedor(): Promise<void> {
    this.validationErrors = [];

    /* ─── 1️⃣ Validaciones de campos obligatorios ──────────────────────────── */
    /* ─── 1️⃣ Validaciones de campos obligatorios ──────────────────────────── */
    if (
      !this.newProveedor.nombreEncargado ||
      !this.newProveedor.empresa ||
      !this.newProveedor.telefono ||
      !this.newProveedor.catProveedorId // ¡CAMBIO CLAVE! Verifica si es falsy (null, undefined, "", 0)
    ) {
      this.validationErrors.push(
        'Los campos Encargado, Empresa, Teléfono y Categoría son obligatorios.'
      );
      return;
    }

    /* ─── 2️⃣ Validación de la imagen ────────────────────────────────────── */
    if (!this.selectedFile && !this.newProveedor.imagenUrl) {
      this.validationErrors.push('La imagen del proveedor es obligatoria.');
      return;
    }

    /* ─── 3️⃣ Sube la imagen (si se seleccionó) ──────────────────────────── */
    let imageUrl = this.newProveedor.imagenUrl;
    if (this.selectedFile) {
      imageUrl = await this.uploadImageAndGetUrl();
      if (!imageUrl) {
        return;
      }
    }

    /* ─── 4️⃣ Construir el objeto y enviarlo al backend ────────────────────── */
    const proveedorToCreate = {
      ...this.newProveedor,
      imagenUrl: imageUrl,
      // No hay stock/precios, solo pasamos los campos del proveedor
      // Aseguramos que CatProveedorId sea un número
      catProveedorId: Number(this.newProveedor.catProveedorId),
    };

    this.proveedorService
      .createProveedor(proveedorToCreate)
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          //console.log('Proveedor creado exitosamente:', response);
          this.closeCreateModal();
          this.getProveedoresWithCategorias();
        },
        error: (error) => {
          //console.error('Error al crear proveedor:', error);
          this.validationErrors.push(
            'Ocurrió un error inesperado al crear el proveedor.'
          );
        },
      });
  }

  // 🛑 GETTER MODIFICADO
  get filteredCategorias(): Array<any> {
    // Filtra las categorías de proveedor que están activas
    return this.categorias.filter((c) => c.estado === true);
  }

  // 🛑 FUNCIÓN DE ACTUALIZACIÓN DE IMAGEN MODIFICADA (Mantiene la lógica pero con el servicio de Proveedor)
  async updateProveedorImage(): Promise<void> {
    if (!this.editedProveedor.proveedorId) {
      // ⚠️ Asume que el ID se llama 'proveedorId'
      this.validationErrors.push(
        'Falta el identificador del proveedor a actualizar.'
      );
      return;
    }

    if (!this.selectedFile) {
      this.validationErrors.push(
        'Debe seleccionar una nueva imagen antes de actualizar.'
      );
      return;
    }

    try {
      await lastValueFrom(
        // ✅ Llama al método de actualización de imagen en ProveedorService
        this.proveedorService.updateProveedorImage(
          this.editedProveedor.proveedorId,
          this.selectedFile
        )
        // ⚠️ Asegúrate de implementar updateProveedorImage en ProveedorService
      );

      //console.log('Imagen actualizada exitosamente.');
    } catch (error) {
      //console.error('Error al actualizar la imagen:', error);
      this.validationErrors.push(
        'Error al actualizar la imagen. Inténtelo de nuevo.'
      );
      throw error;
    }
  }

  // 🛑 FUNCIÓN DE ACTUALIZACIÓN MODIFICADA
  async updateProveedor(): Promise<void> {
    this.validationErrors = [];

    // Paso 1: Valida que los campos obligatorios estén llenos
    if (
      !this.editedProveedor.nombreEncargado ||
      !this.editedProveedor.empresa ||
      !this.editedProveedor.telefono ||
      this.editedProveedor.catProveedorId === null
    ) {
      this.validationErrors.push(
        'Los campos Encargado, Empresa, Teléfono y Categoría son obligatorios.'
      );
      return;
    }

    // Paso 2: Si el usuario seleccionó una nueva imagen, la subimos/actualizamos primero.
    if (this.selectedFile) {
      try {
        // ✅ Llama al servicio de Proveedor para actualizar la imagen
        const response: any = await lastValueFrom(
          this.proveedorService.updateProveedorImage(
            this.editedProveedor.proveedorId,
            this.selectedFile
          )
        );

        // ✅ CLAVE: Actualiza el campo imagenUrl en tu objeto de edición con la nueva URL
        this.editedProveedor.imagenUrl = response.url;

        //console.log('Imagen actualizada exitosamente:', response.url);
      } catch (error) {
        //console.error('Error al actualizar la imagen:', error);
        this.validationErrors.push(
          'Error al actualizar la imagen. Inténtelo de nuevo.'
        );
        return;
      }
    }

    // Paso 3: Prepara los datos para actualizar los demás campos del proveedor
    const proveedorToUpdate = {
      ...this.editedProveedor,
      // Aseguramos que CatProveedorId sea un número
      catProveedorId: Number(this.editedProveedor.catProveedorId),
    };

    // Paso 4: Llama al servicio para actualizar los demás campos del proveedor
    this.proveedorService
      .updateProveedor(this.editedProveedor.proveedorId, proveedorToUpdate) // ⚠️ Asume que el ID se llama 'proveedorId'
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          //console.log('Proveedor actualizado exitosamente:', response);
          this.closeEditModal();
          this.getProveedoresWithCategorias();
        },
        error: (error) => {
          //console.error('Error al actualizar el proveedor:', error);
          this.validationErrors = [
            'Ocurrió un error inesperado al actualizar el proveedor.',
          ];
        },
      });
  }

  // 🛑 FUNCIÓN DE ELIMINACIÓN MODIFICADA
  deleteProveedor(): void {
    if (!this.proveedorToDelete || !this.proveedorToDelete.proveedorId) {
      // ⚠️ Asume que el ID se llama 'proveedorId'
      //console.error('No se ha seleccionado ningún proveedor para eliminar.');
      return;
    }

    this.proveedorService
      .deleteProveedor(this.proveedorToDelete.proveedorId)
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          //console.log('Proveedor eliminado exitosamente:', response);
          this.closeDeleteModal();
          this.getProveedoresWithCategorias();
        },
        error: (error) => {
          //console.error('Error al eliminar proveedor:', error);
          this.validationErrors = [
            'Ocurrió un error al eliminar el proveedor.',
          ];
        },
      });
  }
}
