// src/app/auth/auth.interceptor.ts

import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Obtener el token del localStorage
  const authToken = localStorage.getItem('auth_token');

  // Si el token existe, clonar la petición y añadir el encabezado de autorización
  if (authToken) {
    const authReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${authToken}`)
    });
    return next(authReq);
  }

  // Si no hay token, pasar la petición original sin modificar
  return next(req);
};