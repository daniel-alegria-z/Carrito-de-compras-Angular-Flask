import { Producto } from './producto';

export interface ItemCarrito {
  producto: Producto;
  cantidad: number;
}

export interface RespuestaCarrito {
  ok: boolean;
  mensaje: string;
  codigo?: 'STOCK_INSUFICIENTE' | 'CANTIDAD_INVALIDA' | 'ITEM_NO_ENCONTRADO';
}

export interface ItemCarritoApi {
  id: number;
  cantidad: number;
}

export interface ItemValidado {
  id: number;
  nombre: string;
  precio: number;
  cantidad: number;
  subtotal: number;
}

export interface CarritoValidado {
  items: ItemValidado[];
  subtotal: number;
  iva: number;
  descuentoPrimeraCompra: number;
  total: number;
}

export interface RespuestaValidacionCarrito {
  success: boolean;
  carrito?: CarritoValidado;
  error?: string;
  code?: string;
}

export type MetodoPago = 'tarjeta' | 'transferencia';

export interface DatosUsuarioPago {
  nombre: string;
  email: string;
}

export interface SolicitudPago {
  items: ItemCarritoApi[];
  metodo: MetodoPago;
  datosUsuario: DatosUsuarioPago;
}

export interface OrdenPago {
  id: string;
  timestamp?: string;
  createdAt?: string;
  items: ItemValidado[];
  subtotal: number;
  iva: number;
  total: number;
  estado: string;
  metodo?: MetodoPago;
  referencia?: string;
}

export interface RespuestaPago {
  success: boolean;
  orden?: OrdenPago;
  redireccion?: {
    url: string;
    mensaje: string;
  };
  error?: string;
  code?: string;
  motivo?: string;
  orden_id?: string | null;
}
