// src/app/app.config.ts

import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './auth-interceptor';
// ✅ Importa el módulo completo
import { JwtModule } from '@auth0/angular-jwt'; 

// 1. Importa el módulo de Lucide y los íconos
import {
  LucideAngularModule,
  Home,
  Settings,
  Mail,
  User,
  Users,
  Database,
  Percent,
  HandCoins,
  UserCog,
  DoorOpen,
  Notebook,
  Menu,
  X,
  ShoppingCart,
  Warehouse,
  ShoppingBag,
  ChartArea,
  Wrench,
  Landmark,
  PencilRuler,
  Package,
  PackageSearch,
  UserLock,
  UserRoundPlus,
  UserPen,
  Search,
  UserRoundX,
  ListFilter,
  ChevronRight,
  ChevronLeft,
  UserRoundSearch,
  Inbox,
  Package2,
  ArchiveRestore,
  FileBox,
  ArchiveX,
  Boxes,
  BookPlus,
  BookOpenText,
  BookOpenCheck ,
  BookMinus,
  ShoppingBasket,
  CreditCard,
  DollarSign,
  ArrowLeft,
  DatabaseZap,
  DatabaseBackup,
  Trash,
  FileSpreadsheet,
  ImageUp ,
  CircleQuestionMark,
  NotebookTabs,
  Handshake,
  BookUser 
} from 'lucide-angular';

// 2. Desestructura los providers del módulo de Lucide y asigna un array vacío como valor por defecto
const { providers = [] } = LucideAngularModule.pick({
  Home,
  Settings,
  Mail,
  User,
  Database,
  Percent,
  HandCoins,
  UserCog,
  DoorOpen,
  Notebook,
  Users,
  Menu,
  X,
  ShoppingCart,
  Warehouse,
  ShoppingBag,
  ChartArea,
  Wrench,
  Landmark,
  PencilRuler,
  Package,
  PackageSearch,
  UserLock,
  UserRoundPlus,
  UserPen,
  Search,
  UserRoundX,
  ListFilter,
  ChevronRight,
  ChevronLeft,
  UserRoundSearch,
  Inbox,
  Package2,
  ArchiveRestore,
  FileBox,
  ArchiveX,
  Boxes,
  BookPlus,
  BookOpenText,
  BookOpenCheck,
  BookMinus,
  ShoppingBasket,
  CreditCard,
  DollarSign,
  ArrowLeft ,
  DatabaseZap,
  DatabaseBackup,
  Trash ,
  FileSpreadsheet,
  ImageUp ,
  CircleQuestionMark,
  NotebookTabs,
  Handshake,
  BookUser 
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(),
    provideHttpClient(withInterceptors([authInterceptor])),
    // 3. Usa el spread operator con el array desestructurado
    ...providers,
    // ✅ Configura el JwtModule para proporcionar el JwtHelperService
    ...JwtModule.forRoot({
      config: {
        tokenGetter: () => localStorage.getItem('token'),
        allowedDomains: ["localhost:7182"],
        disallowedRoutes: [],
      }
    }).providers!
  ],
};
