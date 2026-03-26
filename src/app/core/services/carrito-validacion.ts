import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ItemCarritoApi, RespuestaValidacionCarrito } from '../modelo/carrito';

@Injectable({ providedIn: 'root' })
export class CarritoValidacionService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = 'http://127.0.0.1:5000/api';

  validarCarrito(items: ItemCarritoApi[]): Observable<RespuestaValidacionCarrito> {
    // Delega validacion de stock y totales al backend (fuente de verdad).
    return this.http.post<RespuestaValidacionCarrito>(`${this.apiBase}/carrito/validar`, { items });
  }
}
