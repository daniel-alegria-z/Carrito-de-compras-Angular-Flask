import { Injectable, signal } from '@angular/core';

export type TipoToast = 'exito' | 'error' | 'info';

export interface ToastItem {
  id: number;
  tipo: TipoToast;
  mensaje: string;
  cerrando: boolean;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly _toasts = signal<ToastItem[]>([]);
  private secuencia = 0;

  readonly toasts = this._toasts.asReadonly();

  mostrar(tipo: TipoToast, mensaje: string, duracionMs = 2600): void {
    // Inserta toast al final de la cola y programa autocierre.
    const id = ++this.secuencia;
    const item: ToastItem = { id, tipo, mensaje, cerrando: false };
    this._toasts.update((actual) => [...actual, item]);

    setTimeout(() => this.ocultar(id), duracionMs);
  }

  ocultar(id: number): void {
    // Primero marca como cerrando para permitir animacion de salida.
    let existe = false;
    this._toasts.update((actual) =>
      actual.map((item) => {
        if (item.id !== id) {
          return item;
        }

        existe = true;
        if (item.cerrando) {
          return item;
        }

        return { ...item, cerrando: true };
      })
    );

    if (!existe) {
      return;
    }

    // Remocion definitiva tras el tiempo de animacion.
    setTimeout(() => {
      this._toasts.update((actual) => actual.filter((item) => item.id !== id));
    }, 220);
  }
}
