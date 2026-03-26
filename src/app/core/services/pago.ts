import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RespuestaPago, SolicitudPago } from '../modelo/carrito';

@Injectable({ providedIn: 'root' })
export class PagoService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = 'http://127.0.0.1:5000/api';

  procesarPago(payload: SolicitudPago): Observable<RespuestaPago> {
    // Ejecuta checkout: validacion final + pasarela simulada + creacion de orden.
    return this.http.post<RespuestaPago>(`${this.apiBase}/pagar`, payload);
  }

  obtenerOrden(codigoOrden: string): Observable<RespuestaPago> {
    // Trae detalle para la pantalla de confirmacion.
    return this.http.get<RespuestaPago>(`${this.apiBase}/orden/${encodeURIComponent(codigoOrden)}`);
  }
}
