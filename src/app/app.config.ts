// src/app/app.config.ts

import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './auth-interceptor';

// 1. Importa el módulo de Lucide y los íconos
import { LucideAngularModule, Home, Settings, Mail, User, Users , Database, Percent, HandCoins, UserCog, DoorOpen, Notebook } from 'lucide-angular';

// 2. Desestructura los providers del módulo de Lucide y asigna un array vacío como valor por defecto
const { providers = [] } = LucideAngularModule.pick({ Home, Settings, Mail, User, Database, Percent, HandCoins, UserCog, DoorOpen, Notebook, Users  });

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(),
    provideHttpClient(withInterceptors([authInterceptor])),
    // 3. Usa el spread operator con el array desestructurado
    ...providers
  ]
};