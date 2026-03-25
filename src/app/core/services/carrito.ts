import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ItemCarrito, RespuestaCarrito } from '../modelo/carrito';
import { Producto } from '../modelo/producto';

@Injectable({ providedIn: 'root' })
export class CarritoService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly key = 'carrito-avengers';
  private readonly ivaRate = 0.19;
  private readonly _revision = signal(0);

  readonly revision = this._revision.asReadonly();

  getCarrito(): ItemCarrito[] {
    if (!isPlatformBrowser(this.platformId)) {
      return [];
    }

    const raw = sessionStorage.getItem(this.key);
    if (!raw) {
      return [];
    }

    try {
      const data = JSON.parse(raw) as ItemCarrito[];
      if (!Array.isArray(data)) {
        return [];
      }
      return data.filter((x) => !!x?.producto && Number.isFinite(x.cantidad) && x.cantidad > 0);
    } catch {
      return [];
    }
  }

  agregar(producto: Producto, cantidad = 1): RespuestaCarrito {
    if (!Number.isInteger(cantidad) || cantidad < 1) {
      return { ok: false, mensaje: 'La cantidad minima es 1.', codigo: 'CANTIDAD_INVALIDA' };
    }

    const carrito = this.getCarrito();
    const existente = carrito.find((i) => i.producto.id === producto.id);
    const nuevaCantidad = (existente?.cantidad ?? 0) + cantidad;

    if (nuevaCantidad > producto.stock) {
      return { ok: false, mensaje: 'No hay stock suficiente para esa cantidad.', codigo: 'STOCK_INSUFICIENTE' };
    }

    if (existente) {
      existente.cantidad = nuevaCantidad;
    } else {
      carrito.push({ producto, cantidad });
    }

    this.guardar(carrito);
    this.marcarCambio();
    return { ok: true, mensaje: 'Producto agregado al carrito.' };
  }

  actualizar(index: number, cantidad: number): RespuestaCarrito {
    if (!Number.isInteger(index) || index < 0) {
      return { ok: false, mensaje: 'Item no encontrado en el carrito.', codigo: 'ITEM_NO_ENCONTRADO' };
    }

    if (!Number.isInteger(cantidad) || cantidad < 1) {
      return { ok: false, mensaje: 'La cantidad minima es 1.', codigo: 'CANTIDAD_INVALIDA' };
    }

    const carrito = this.getCarrito();
    const item = carrito[index];

    if (!item) {
      return { ok: false, mensaje: 'Item no encontrado en el carrito.', codigo: 'ITEM_NO_ENCONTRADO' };
    }

    if (cantidad > item.producto.stock) {
      return { ok: false, mensaje: 'La cantidad supera el stock disponible.', codigo: 'STOCK_INSUFICIENTE' };
    }

    item.cantidad = cantidad;
    this.guardar(carrito);
    this.marcarCambio();
    return { ok: true, mensaje: 'Cantidad actualizada.' };
  }

  eliminar(index: number): RespuestaCarrito {
    if (!Number.isInteger(index) || index < 0) {
      return { ok: false, mensaje: 'Item no encontrado en el carrito.', codigo: 'ITEM_NO_ENCONTRADO' };
    }

    const carrito = this.getCarrito();
    if (index >= carrito.length) {
      return { ok: false, mensaje: 'Item no encontrado en el carrito.', codigo: 'ITEM_NO_ENCONTRADO' };
    }

    const nuevo = carrito.filter((_, i) => i !== index);

    this.guardar(nuevo);
    this.marcarCambio();
    return { ok: true, mensaje: 'Producto eliminado del carrito.' };
  }

  limpiar(): RespuestaCarrito {
    this.guardar([]);
    this.marcarCambio();
    return { ok: true, mensaje: 'Carrito vaciado.' };
  }

  cantidad(): number {
    return this.getCarrito().reduce((ac, it) => ac + it.cantidad, 0);
  }

  subtotal(): number {
    const value = this.getCarrito().reduce((ac, it) => ac + it.cantidad * it.producto.precio, 0);
    return this.round2(value);
  }

  iva(): number {
    return this.round2(this.subtotal() * this.ivaRate);
  }

  descuento(): number {
    return 0;
  }

  motivoDescuento(): string {
    return 'El descuento se valida en el servidor durante el checkout.';
  }

  confirmarCompra(): void {
    // Conservado para compatibilidad con componentes existentes.
  }

  totalFinal(): number {
    return this.round2(this.subtotal() + this.iva() - this.descuento());
  }

  total(): number {
    return this.totalFinal();
  }

  private guardar(items: ItemCarrito[]): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    sessionStorage.setItem(this.key, JSON.stringify(items));
  }

  private round2(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private marcarCambio(): void {
    this._revision.update((value) => value + 1);
  }
}
