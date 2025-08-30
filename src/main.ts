import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { LucideAngularModule, Home, Settings, Mail } from 'lucide-angular';

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
