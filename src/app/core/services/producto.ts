import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, catchError, of } from 'rxjs';
import { Producto } from '../modelo/producto';
import { PRODUCTOS_DATA } from '../data/productos.data';

@Injectable({ providedIn: 'root' })
export class ProductoService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly apiUrl = 'http://127.0.0.1:5000/api/productos';

  obtenerProductos(): Observable<Producto[]> {
    if (!isPlatformBrowser(this.platformId)) {
      return of(PRODUCTOS_DATA);
    }

    return this.http.get<Producto[]>(this.apiUrl).pipe(
      catchError(() => of(PRODUCTOS_DATA))
    );
  }
}
