import { CommonModule, CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OrdenPago } from '../../../core/modelo/carrito';
import { PagoService } from '../../../core/services/pago';
import { ToastService } from '../../../shared/toast/toast.service';

@Component({
  selector: 'app-orden-confirmacion',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, RouterLink],
  templateUrl: './orden-confirmacion.html',
  styleUrl: './orden-confirmacion.css'
})
export class OrdenConfirmacionComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly pagoService = inject(PagoService);
  private readonly toast = inject(ToastService);

  cargando = true;
  orden: OrdenPago | null = null;
  fechaOrden = '';

  ngOnInit(): void {
    const codigo = this.route.snapshot.paramMap.get('id');
    if (!codigo) {
      this.cargando = false;
      this.toast.mostrar('error', 'No se encontro el id de la orden.');
      return;
    }

    this.pagoService.obtenerOrden(codigo).subscribe({
      next: (response) => {
        this.cargando = false;
        if (!response.success || !response.orden) {
          this.toast.mostrar('error', response.error ?? 'No se pudo cargar la orden.');
          return;
        }

        this.orden = response.orden;
        this.fechaOrden = this.formatearFecha(response.orden.timestamp ?? response.orden.createdAt);
      },
      error: (error: HttpErrorResponse) => {
        this.cargando = false;
        const msg =
          typeof error.error?.error === 'string'
            ? error.error.error
            : 'No se pudo cargar la orden.';
        this.toast.mostrar('error', msg);
      },
    });
  }

  private formatearFecha(fechaIso?: string): string {
    if (!fechaIso) {
      return 'Fecha no disponible';
    }

    const fecha = new Date(fechaIso);
    if (Number.isNaN(fecha.getTime())) {
      return fechaIso;
    }

    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'long',
      timeStyle: 'short',
    }).format(fecha);
  }
}
