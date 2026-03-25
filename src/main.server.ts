import { bootstrapApplication } from '@angular/platform-browser';
import { BootstrapContext } from '@angular/platform-browser';
import { AppComponent } from './app/app';
import { config } from './app/app.config.server';

export default function bootstrap(context: BootstrapContext) {
  return bootstrapApplication(AppComponent, config, context);
}
