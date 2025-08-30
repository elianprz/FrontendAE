import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { Dashboard } from './pages/dashboard/dashboard';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';
import { AdminLayout } from './layouts/admin-layout/admin-layout';
import { EmployeeLayout } from './layouts/employee-layout/employee-layout';
import { UserList } from './administration/user-list/user-list';

export const routes: Routes = [
   { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: Login },
  {
    path: 'admin',
    component: AdminLayout, // Este será el componente "layout" para admins
    canActivate: [authGuard, roleGuard],
    data: { role: 'Admin' }, // Rol esperado para esta ruta
    children: [
      { path: 'dashboard', component: Dashboard }, // Ejemplo de ruta de admin
      {
        path: 'administration', // Nueva ruta padre para Administración
        children: [
          { path: 'users', component: UserList }, // Ruta para la lista de usuarios
          // { path: 'roles', component: RoleListComponent } // Ruta para la lista de roles
        ]
      },
      // Agrega aquí todas las rutas específicas de Admin
    ]
  },
  {
    path: 'employee',
    component: EmployeeLayout, // Este será el componente "layout" para empleados
    canActivate: [authGuard, roleGuard],
    data: { role: 'Empleado' }, // Rol esperado para esta ruta
    children: [
      { path: 'dashboard', component: Dashboard }, // Ejemplo de ruta de empleado
      // Agrega aquí todas las rutas específicas de Empleado
    ]
  },
  { path: '**', redirectTo: '/login' }
];