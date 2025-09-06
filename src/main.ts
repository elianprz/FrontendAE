import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
// Importa la biblioteca de elementos de Tailwind CSS
import '@tailwindplus/elements';

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
