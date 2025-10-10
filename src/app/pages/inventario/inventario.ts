import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { InventarioService } from '../../services/inventario.service';
import { CateproductoService } from '../../services/cateproducto.service';
import { take } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './inventario.html',
  styleUrl: './inventario.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class Inventario implements OnInit {
  products: any[] = [];
  categorias: any[] = [];
  categoriasMap: { [key: number]: string } = {};

  // Validaciones
  public validationErrors: string[] = [];

  searchText: string = '';
  filteredProducts: any[] = [];
  activeFilters: { [key: string]: Set<any> } = {};

  currentPage: number = 1;
  itemsPerPage: number = 7;
  totalProducts: number = 0;
  paginatedProducts: any[] = [];

  isCreateModalOpen: boolean = false;
  newProduct: any = {
    nombre: '',
    descripcion: '',
    estado: true,
    stock: 0,
    precioAdquisicion: 0,
    precioVenta: 0,
    imagenUrl: null,
    sku: '',
    categoriasId: null,
  };

  private pagesToShow: number = 5;
  public Math = Math;

  isEditModalOpen: boolean = false;
  editedProduct: any = {};

  // Variable para la imagen seleccionada
  selectedFile: File | null = null;

  isViewModalOpen: boolean = false;
  viewedProduct: any = {};

  isDeleteModalOpen: boolean = false;
  productToDelete: any = {};

  // Imagen
  selectedFilePreview: string | ArrayBuffer | null = null;

  editingProduct: any = {};

  constructor(
    private inventarioService: InventarioService,
    private CateproductoService: CateproductoService,
    private http: HttpClient // Inyecta el servicio HttpClient
  ) {}

  ngOnInit(): void {
    this.getInventarioWithcategoriass();
  }

  // Se eliminan los helpers de fecha, ya que no son necesarios para el inventario.

  getInventarioWithcategoriass(): void {
    forkJoin({
      products: this.inventarioService.getInventario(),
      categorias: this.CateproductoService.getProductos(),
    })
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          this.categorias = response.categorias;
          this.categorias.forEach((categoria: any) => {
            // ✅ CAMBIO 1: Usa 'categoria.categoriaId' para el ID
            // ✅ CAMBIO 2: Usa 'categoria.nombre' para el nombre (ajustar si el backend usa 'Nombre')
            this.categoriasMap[categoria.categoriaId] = categoria.nombre;
          });

          this.products = response.products.map((product: any) => {
            // Usa el ID de la categoría del producto para buscar en el mapa
            const nombre =
              this.categoriasMap[product.categoriaId] || 'Sin Categoría';
            return {
              ...product,
              categoriasNombre: nombre,
            };
          });

          this.applyFiltersAndSearch();
        },
        error: (error) => {
          //console.error('Error al cargar datos:', error);
        },
      });
  }
  // Métodos de búsqueda, paginación y filtros adaptados
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
    let tempProducts = [...this.products];
    if (this.searchText) {
      const lowerCaseSearchText = this.searchText.toLowerCase();
      tempProducts = tempProducts.filter((product) => {
        const productFields = `${product.nombre || ''} ${
          product.descripcion || ''
        } ${product.sku || ''}`;
        return productFields.toLowerCase().includes(lowerCaseSearchText);
      });
    }

    for (const filterType in this.activeFilters) {
      if (this.activeFilters.hasOwnProperty(filterType)) {
        const filterSet = this.activeFilters[filterType];
        if (filterSet.size > 0) {
          tempProducts = tempProducts.filter((product) => {
            return filterSet.has(product[filterType]);
          });
        }
      }
    }
    this.filteredProducts = tempProducts;
    this.totalProducts = this.filteredProducts.length;
    this.currentPage = 1;
    this.paginateProducts();
  }

  paginateProducts(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedProducts = this.filteredProducts.slice(startIndex, endIndex);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.paginateProducts();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.paginateProducts();
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.paginateProducts();
    }
  }

  get totalPages(): number {
    return Math.ceil(this.totalProducts / this.itemsPerPage);
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

  // Lógica para los modales
  openCreateModal(): void {
    this.isCreateModalOpen = true;
    //this.validationErrors = [];
    this.selectedFile = null;
    this.selectedFilePreview = null;
    this.newProduct.categoriaId = null;
  }

  closeCreateModal(): void {
    this.isCreateModalOpen = false;
    this.newProduct = {
      nombre: '',
      descripcion: '',
      estado: true,
      stock: 0,
      precioAdquisicion: 0,
      precioVenta: 0,
      imagenUrl: null,
      //sku: '',
      categoriasId: null,
    };
    this.validationErrors = [];
    this.selectedFile = null;
  }

  openEditModal(product: any): void {
    this.editedProduct = { ...product };
    this.isEditModalOpen = true;
    this.selectedFilePreview = product.imagenUrl;
    this.validationErrors = [];
    //this.selectedFile = null;
  }

  closeEditModal(): void {
    this.isEditModalOpen = false;
    this.editedProduct = {};
    this.validationErrors = [];
    this.selectedFile = null;
  }

  openViewModal(product: any): void {
    this.viewedProduct = { ...product };
    this.isViewModalOpen = true;
  }

  closeViewModal(): void {
    this.isViewModalOpen = false;
    this.viewedProduct = {};
  }

  openDeleteModal(product: any): void {
    this.productToDelete = product;
    this.isDeleteModalOpen = true;
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen = false;
    this.productToDelete = {};
  }

  // Evento para capturar el archivo de la imagen
  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];
    this.validationErrors = []; // Limpia errores previos

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

          // ✅ Validación: El ancho y alto deben estar entre MIN_DIMENSION y MAX_DIMENSION
          if (
            width < MIN_DIMENSION ||
            height < MIN_DIMENSION ||
            width > MAX_DIMENSION ||
            height > MAX_DIMENSION
          ) {
            this.validationErrors.push(
              `La imagen debe tener dimensiones entre ${MIN_DIMENSION}x${MIN_DIMENSION} y ${MAX_DIMENSION}x${MAX_DIMENSION} píxeles. Dimensiones actuales: ${width}x${height}`
            );
            this.selectedFile = null; // Anula la selección
            this.selectedFilePreview = null; // Borra la previsualización
          }
          // Opcional: Puedes añadir una validación extra si la imagen final debe ser 1000x1000 (aunque el backend la redimensiona)
          // else if (width !== height) {
          //   this.validationErrors.push('La imagen debe ser cuadrada (ancho igual a alto).');
          //   this.selectedFile = null;
          //   this.selectedFilePreview = null;
          // }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(this.selectedFile);
    }
  }

  async uploadImageAndGetUrl(): Promise<string | null> {
    if (!this.selectedFile) {
      return null;
    }

    try {
      // ✅ CORRECCIÓN: Llama al servicio para subir la imagen
      const response: any = await this.inventarioService
        .uploadImage(this.selectedFile)
        .toPromise();
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

  // Nuevo método para crear un producto
  // async createProduct(): Promise<void> {
  //   this.validationErrors = [];

  //   // Validaciones básicas antes de subir la imagen
  //   if (
  //     !this.newProduct.nombre ||
  //     this.newProduct.stock === undefined ||
  //     this.newProduct.precioVenta === undefined ||
  //     this.newProduct.precioAdquisicion === undefined || // ✅ Añade esta validación
  //     this.newProduct.categoriaId === null

  //   ) {
  //     this.validationErrors.push(
  //       'Todos los campos obligatorios deben ser llenados.'
  //     );
  //     return;
  //   }

  //   let imageUrl = this.newProduct.imagenUrl;
  //   if (this.selectedFile) {
  //     // Sube la imagen y obtiene la URL
  //     imageUrl = await this.uploadImageAndGetUrl();
  //     if (!imageUrl) {
  //       return; // Detiene la ejecución si falla la subida de imagen
  //     }
  //   }

  //   const productToCreate = {
  //     ...this.newProduct,
  //     imagenUrl: imageUrl,
  //     // Asegúrate de que los valores numéricos sean del tipo correcto
  //     stock: Number(this.newProduct.stock),
  //     precioAdquisicion: Number(this.newProduct.precioAdquisicion),
  //     precioVenta: Number(this.newProduct.precioVenta),
  //     categoriasId: Number(this.newProduct.categoriasId),
  //   };

  //   this.inventarioService
  //     .createProduct(productToCreate)
  //     .pipe(take(1))
  //     .subscribe({
  //       next: (response) => {
  //         console.log('Producto creado exitosamente:', response);
  //         this.closeCreateModal();
  //         this.getInventarioWithcategoriass();
  //       },
  //       error: (error) => {
  //         console.error('Error al crear producto:', error);
  //         if (error.status === 400 && error.error) {
  //           if (typeof error.error === 'string') {
  //             this.validationErrors = [error.error];
  //           } else {
  //             this.validationErrors = ['Error de validación.'];
  //           }
  //         } else {
  //           this.validationErrors = [
  //             'Ocurrió un error inesperado al crear el producto.',
  //           ];
  //         }
  //       },
  //     });
  // }
  async createProduct(): Promise<void> {
    this.validationErrors = [];

    /* ─── 1️⃣  Validaciones de campos obligatorios ──────────────────────────── */
    if (
      !this.newProduct.nombre ||
      this.newProduct.stock === undefined ||
      this.newProduct.precioVenta === undefined ||
      this.newProduct.precioAdquisicion === undefined ||
      this.newProduct.categoriaId === null
    ) {
      this.validationErrors.push(
        'Todos los campos obligatorios deben ser llenados.'
      );
      return;
    }

    /* ─── 2️⃣  Validación de la imagen ────────────────────────────────────── */
    if (!this.selectedFile && !this.newProduct.imagenUrl) {
      this.validationErrors.push('La imagen del producto es obligatoria.');
      return;
    }

    /* ─── 3️⃣  Sube la imagen (si se seleccionó) ──────────────────────────── */
    let imageUrl = this.newProduct.imagenUrl;
    if (this.selectedFile) {
      imageUrl = await this.uploadImageAndGetUrl();
      if (!imageUrl) {
        // La subida de la imagen falló → ya está en la UI
        return;
      }
    }

    /* ─── 4️⃣  Construir el objeto y enviarlo al backend ────────────────────── */
    const productToCreate = {
      ...this.newProduct,
      imagenUrl: imageUrl,
      stock: Number(this.newProduct.stock),
      precioAdquisicion: Number(this.newProduct.precioAdquisicion),
      precioVenta: Number(this.newProduct.precioVenta),
    };

    this.inventarioService
      .createProduct(productToCreate)
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          //console.log('Producto creado exitosamente:', response);
          this.closeCreateModal();
          this.getInventarioWithcategoriass();
        },
        error: (error) => {
          //console.error('Error al crear producto:', error);
        },
      });
  }

  get filteredCategorias(): Array<any> {
    return this.categorias.filter((c) => c.estado === true);
  }

  // async updateImage(): Promise<void> {
  //   if (!this.editedProduct.productoId || !this.selectedFile) {
  //     return; // No hay producto o imagen seleccionada
  //   }

  //   try {
  //     await this.inventarioService
  //       .updateProductImage(this.editedProduct.productoId, this.selectedFile)
  //       .toPromise();

  //     console.log('Imagen actualizada exitosamente.');
  //   } catch (error) {
  //     console.error('Error al actualizar la imagen:', error);
  //     this.validationErrors.push(
  //       'Error al actualizar la imagen. Inténtelo de nuevo.'
  //     );
  //     throw error; // Propaga el error para detener el proceso principal
  //   }
  // }
  async updateImage(): Promise<void> {
    if (!this.editedProduct.productoId) {
      this.validationErrors.push(
        'Falta el identificador del producto a actualizar.'
      );
      return;
    }

    if (!this.selectedFile) {
      // No se seleccionó ninguna nueva foto
      this.validationErrors.push(
        'Debe seleccionar una nueva imagen antes de actualizar.'
      );
      return;
    }

    try {
      // `lastValueFrom` reemplaza el viejo `toPromise()`
      await lastValueFrom(
        this.inventarioService.updateProductImage(
          this.editedProduct.productoId,
          this.selectedFile
        )
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

  // ✅ Nuevo método para actualizar el producto completo
  async updateProduct(): Promise<void> {
    this.validationErrors = [];

    // Paso 1: Valida que los campos obligatorios estén llenos
    if (
      !this.editedProduct.nombre ||
      this.editedProduct.stock === undefined ||
      this.editedProduct.precioVenta === undefined ||
      this.editedProduct.precioAdquisicion === undefined ||
      this.editedProduct.categoriaId === null
    ) {
      this.validationErrors.push(
        'Todos los campos obligatorios deben ser llenados.'
      );
      return;
    }

    // Paso 2: Si el usuario seleccionó una nueva imagen, la subimos primero y obtenemos la nueva URL.
    if (this.selectedFile) {
      try {
        const response: any = await this.inventarioService
          .updateProductImage(this.editedProduct.productoId, this.selectedFile)
          .toPromise();

        // ✅ CLAVE: Actualiza el campo imagenUrl en tu objeto de edición
        this.editedProduct.imagenUrl = response.url;

        //console.log('Imagen actualizada exitosamente:', response.url);
      } catch (error) {
        //console.error('Error al actualizar la imagen:', error);
        this.validationErrors.push(
          'Error al actualizar la imagen. Inténtelo de nuevo.'
        );
        return; // Detiene la ejecución si falla la actualización de la imagen
      }
    }

    // Paso 3: Prepara los datos para actualizar los demás campos del producto
    const productToUpdate = {
      ...this.editedProduct,
      stock: Number(this.editedProduct.stock),
      precioAdquisicion: Number(this.editedProduct.precioAdquisicion),
      precioVenta: Number(this.editedProduct.precioVenta),
      categoriasId: Number(this.editedProduct.categoriaId),
    };

    // Paso 4: Llama al servicio para actualizar los demás campos del producto (incluyendo la nueva URL)
    this.inventarioService
      .updateProduct(this.editedProduct.productoId, productToUpdate)
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          //console.log('Producto actualizado exitosamente:', response);
          this.closeEditModal();
          this.getInventarioWithcategoriass();
        },
        error: (error) => {
          //console.error('Error al actualizar el producto:', error);
          this.validationErrors = [
            'Ocurrió un error inesperado al actualizar el producto.',
          ];
        },
      });
  }

  // Nuevo método para eliminar un producto
  deleteProduct(): void {
    if (!this.productToDelete || !this.productToDelete.productoId) {
      //console.error('No se ha seleccionado ningún producto para eliminar.');
      return;
    }

    this.inventarioService
      .deleteProduct(this.productToDelete.productoId)
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          //console.log('Producto eliminado exitosamente:', response);
          this.closeDeleteModal();
          this.getInventarioWithcategoriass();
        },
        error: (error) => {
          //console.error('Error al eliminar producto:', error);
          this.validationErrors = ['Ocurrió un error al eliminar el producto.'];
        },
      });
  }
}
