import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { Dashboard } from './pages/dashboard/dashboard'; // Este componente contendrá el <router-outlet>
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';
import { AdminLayout } from './layouts/admin-layout/admin-layout';
import { EmployeeLayout } from './layouts/employee-layout/employee-layout';
import { Caja } from './pages/caja/caja';
import { Compras } from './pages/compras/compras';
import { Proveedores } from './pages/proveedores/proveedores';
import { Ventas } from './pages/ventas/ventas';
import { Reportes } from './pages/reportes/reportes';
import { Soporte } from './pages/soporte/soporte';
import { Recuperacion } from './pages/recuperacion/recuperacion';
import { Catalogo } from './pages/catalogo/catalogo';
import { Inventario } from './pages/inventario/inventario';
import { Usuarios } from './pages/usuarios/usuarios';
import { Roles } from './pages/roles/roles';
import { Cateproducto } from './pages/cateproducto/cateproducto';
import { Cateproveedor } from './pages/cateproveedor/cateproveedor';
import { Cajasesion } from './pages/cajasesion/cajasesion';
import { Movimientocaja } from './pages/movimientocaja/movimientocaja';
import { Detalleventas } from './pages/detalleventas/detalleventas';
import { Detallecompras } from './pages/detallecompras/detallecompras';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: Login },
  {
    path: 'admin',
    component: AdminLayout,
    canActivate: [authGuard, roleGuard],
    data: { role: 'Admin' },
    children: [
      {
        path: 'dashboard',
        component: Dashboard, // El Dashboard se convierte en el padre
        children: [
          { path: '', redirectTo: 'caja', pathMatch: 'full'}, // Redirección a la primera sub-página
          { path: 'caja', component: Caja }, // Se renderiza el componente Caja dentro del Dashboard
          { path: 'ventas', component: Catalogo }, // Se renderiza el componente Catálogo (productos get, get id y hacer compra) dentro del Dashboard
          { path: 'compras', component: Compras }, // Se renderiza el componente Compras dentro del Dashboard
          { path: 'proveedores', component: Proveedores }, // Se renderiza el componente Proveedores dentro del Dashboard
          { path: 'historial-ventas', component: Ventas }, // Se renderiza el componente Ventas dentro del Dashboard
          // Ajustes del sistema
          { path: 'caja-sesion', component: Cajasesion }, // Se renderiza el componente Caja sesiones dentro del Dashboard
          { path: 'categoria-producto', component: Cateproducto }, // Se renderiza el componente Categoria Productos dentro del Dashboard
          { path: 'categoria-proveedor', component: Cateproveedor }, // Se renderiza el componente Categoria Proveedor dentro del Dashboard
          { path: 'movimiento-caja', component: Movimientocaja }, // Se renderiza el componente Movimiento Caja dentro del Dashboard
          { path: 'reportes', component: Reportes }, // Se renderiza el componente Reportes dentro del Dashboard
          { path: 'roles', component: Roles }, // Se renderiza el componente Reportes dentro del Dashboard
          { path: 'productos', component: Inventario }, // Se renderiza el componente Inventario (productos create, update and delete) dentro del Dashboard
          { path: 'usuarios', component: Usuarios }, // Se renderiza el componente Roleandusers dentro del Dashboard
          // { path: 'roles', component: RoleListComponent } // Para la lista de roles
        ]
      },
      // Agrega aquí otras rutas de nivel superior si es necesario (ej. /admin/reports)
    ]
  },
  {
    path: 'employee',
    component: EmployeeLayout,
    canActivate: [authGuard, roleGuard],
    data: { role: 'Empleado' },
    children: [
      { path: 'dashboard', component: Dashboard },
      // Agrega aquí todas las rutas específicas de Empleado
    ]
  },
  { path: 'recuperacion', component: Recuperacion },
  { path: 'soporte', component: Soporte },
  { path: '**', redirectTo: '/login' }
];