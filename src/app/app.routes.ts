import { Routes } from '@angular/router';
import { CatalogoInicioComponent } from './components/catalogo/catalogo-inicio/catalogo-inicio';
import { CarritoListarComponent } from './components/carrito/carrito-listar/carrito-listar';
import { CheckoutResumenComponent } from './components/checkout/checkout-resumen/checkout-resumen';
import { OrdenConfirmacionComponent } from './components/checkout/orden-confirmacion/orden-confirmacion';

export const routes: Routes = [
  { path: '', component: CatalogoInicioComponent },
  { path: 'carrito', component: CarritoListarComponent },
  { path: 'checkout/resumen', component: CheckoutResumenComponent },
  { path: 'checkout/confirmacion/:id', component: OrdenConfirmacionComponent },
  { path: '**', redirectTo: '' }
];
