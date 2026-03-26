import { CommonModule, CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DoCheck, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CarritoService } from '../../../core/services/carrito';
import {
  DatosUsuarioPago,
  ItemCarrito,
  ItemCarritoApi,
  MetodoPago,
  RespuestaPago,
} from '../../../core/modelo/carrito';
import { CarritoValidacionService } from '../../../core/services/carrito-validacion';
import { PagoService } from '../../../core/services/pago';
import { ToastService } from '../../../shared/toast/toast.service';

@Component({
  selector: 'app-checkout-resumen',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, FormsModule, RouterLink],
  templateUrl: './checkout-resumen.html',
  styleUrl: './checkout-resumen.css'
})
export class CheckoutResumenComponent implements DoCheck {
  private readonly carritoService = inject(CarritoService);
  private readonly validacionService = inject(CarritoValidacionService);
  private readonly pagoService = inject(PagoService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private firmaItems = '';

  items: ItemCarrito[] = [];
  subtotal = 0;
  iva = 0;
  descuento = 0;
  totalFinal = 0;
  validando = false;
  procesandoPago = false;
  metodo: MetodoPago = 'tarjeta';
  usuario: DatosUsuarioPago = {
    nombre: '',
    email: '',
  };

  ngDoCheck(): void {
    this.items = this.carritoService.getCarrito();
    // Evita llamadas repetidas: solo revalida cuando cambia el contenido del carrito.
    const firmaActual = JSON.stringify(this.mapearItemsApi());
    if (firmaActual !== this.firmaItems) {
      this.firmaItems = firmaActual;
      this.validarEnServidor();
    }
  }

  confirmarCompra(): void {
    if (this.items.length === 0) {
      this.toast.mostrar('error', 'No puedes confirmar una compra sin productos.');
      return;
    }

    if (!this.usuario.nombre.trim() || !this.usuario.email.trim()) {
      this.toast.mostrar('error', 'Completa nombre y correo antes de pagar.');
      return;
    }

    // Construye payload compatible con backend y dispara proceso de pago.
    const payload = {
      items: this.mapearItemsApi(),
      metodo: this.metodo,
      datosUsuario: {
        nombre: this.usuario.nombre.trim(),
        email: this.usuario.email.trim(),
      },
    };

    this.procesandoPago = true;
    this.pagoService.procesarPago(payload).subscribe({
      next: (response) => {
        this.procesandoPago = false;
        if (!response.success || !response.orden?.id) {
          this.toast.mostrar('error', response.error ?? 'No se pudo procesar el pago.');
          return;
        }

        // Compra confirmada: limpia carrito local y navega a confirmacion.
        this.carritoService.confirmarCompra();
        this.carritoService.limpiar();
        this.toast.mostrar('exito', response.redireccion?.mensaje ?? 'Pago exitoso.');
        void this.router.navigate(['/checkout/confirmacion', response.orden.id]);
      },
      error: (error: HttpErrorResponse) => {
        this.procesandoPago = false;
        this.toast.mostrar('error', this.obtenerMensajeError(error));
      },
    });
  }

  private validarEnServidor(): void {
    // Sin items no hay nada que validar.
    if (this.items.length === 0) {
      this.subtotal = 0;
      this.iva = 0;
      this.descuento = 0;
      this.totalFinal = 0;
      return;
    }

    // Totales y stock se validan con backend para mantener consistencia.
    this.validando = true;
    this.validacionService.validarCarrito(this.mapearItemsApi()).subscribe({
      next: (response) => {
        this.validando = false;
        if (!response.success || !response.carrito) {
          this.toast.mostrar('error', response.error ?? 'No se pudo validar el carrito.');
          return;
        }

        this.subtotal = response.carrito.subtotal;
        this.iva = response.carrito.iva;
        this.descuento = response.carrito.descuentoPrimeraCompra;
        this.totalFinal = response.carrito.total;
      },
      error: (error: HttpErrorResponse) => {
        this.validando = false;
        this.toast.mostrar('error', this.obtenerMensajeError(error));
      },
    });
  }

  private mapearItemsApi(): ItemCarritoApi[] {
    // Convierte modelo local de carrito a shape esperado por API.
    return this.items.map((item) => ({
      id: item.producto.id,
      cantidad: item.cantidad,
    }));
  }

  private obtenerMensajeError(error: HttpErrorResponse): string {
    // Prioriza mensaje de negocio retornado por backend si existe.
    if (!error.error) {
      return 'No fue posible conectar con el servidor.';
    }

    const data = error.error as RespuestaPago;
    if (typeof data.error === 'string' && data.error.length > 0) {
      return data.motivo ? `${data.error}: ${data.motivo}` : data.error;
    }

    return 'No se pudo completar la operacion.';
  }
}
