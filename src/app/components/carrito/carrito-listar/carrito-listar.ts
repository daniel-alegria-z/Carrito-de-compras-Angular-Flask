import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, DoCheck, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CarritoService } from '../../../core/services/carrito';
import { ItemCarrito } from '../../../core/modelo/carrito';
import { ToastService } from '../../../shared/toast/toast.service';

@Component({
  selector: 'app-carrito-listar',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, RouterLink],
  templateUrl: './carrito-listar.html',
  styleUrl: './carrito-listar.css'
})
export class CarritoListarComponent implements DoCheck {
  private readonly carritoService = inject(CarritoService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  items: ItemCarrito[] = [];
  total = 0;
  subtotal = 0;
  iva = 0;
  descuento = 0;
  motivoDescuento = '';

  ngDoCheck(): void {
    this.items = this.carritoService.getCarrito();
    this.subtotal = this.carritoService.subtotal();
    this.iva = this.carritoService.iva();
    this.descuento = this.carritoService.descuento();
    this.motivoDescuento = this.carritoService.motivoDescuento();
    this.total = this.carritoService.totalFinal();
  }

  eliminar(index: number): void {
    const res = this.carritoService.eliminar(index);
    this.toast.mostrar(res.ok ? 'info' : 'error', res.mensaje);
  }

  limpiar(): void {
    const res = this.carritoService.limpiar();
    this.toast.mostrar('info', res.mensaje);
  }

  disminuir(index: number): void {
    const item = this.items[index];
    if (!item) {
      return;
    }

    const nuevaCantidad = item.cantidad - 1;
    if (nuevaCantidad < 1) {
      const res = this.carritoService.eliminar(index);
      this.toast.mostrar(res.ok ? 'info' : 'error', res.mensaje);
      return;
    }

    const res = this.carritoService.actualizar(index, nuevaCantidad);
    this.toast.mostrar(res.ok ? 'info' : 'error', res.mensaje);
  }

  aumentar(index: number): void {
    const item = this.items[index];
    if (!item) {
      return;
    }

    const res = this.carritoService.actualizar(index, item.cantidad + 1);
    this.toast.mostrar(res.ok ? 'info' : 'error', res.mensaje);
  }

  irCheckout(): void {
    if (this.items.length === 0) {
      this.toast.mostrar('error', 'No hay productos para continuar al checkout.');
      return;
    }

    void this.router.navigate(['/checkout/resumen']);
  }
}
