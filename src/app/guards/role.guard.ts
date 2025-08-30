import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map } from 'rxjs/operators';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const expectedRole = route.data['role']; // Obtiene el rol esperado de la configuración de la ruta

  return authService.userRole$.pipe(
    map(role => {
      if (role === expectedRole) {
        return true; // El rol coincide, permite el acceso
      } else {
        // Redirige a una página de acceso denegado o al dashboard
        // Aquí redirigimos al dashboard, que ya está protegido
        return router.createUrlTree(['/dashboard']);
      }
    })
  );
};