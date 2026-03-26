import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, OnDestroy, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CarritoService } from '../../../core/services/carrito';
import { ProductoService } from '../../../core/services/producto';
import { Producto } from '../../../core/modelo/producto';
import { ToastService } from '../../../shared/toast/toast.service';

@Component({
  selector: 'app-catalogo-inicio',
  standalone: true,
  imports: [CommonModule, CurrencyPipe],
  templateUrl: './catalogo-inicio.html',
  styleUrl: './catalogo-inicio.css'
})
export class CatalogoInicioComponent implements OnInit, OnDestroy {
  // Configuracion de frecuencia para mensajes de nudge.
  private readonly nudgeIntervalMs = 25000;
  private readonly nudgeFirstDelayMs = 5000;
  private readonly productoService = inject(ProductoService);
  private readonly carritoService = inject(CarritoService);
  private readonly toast = inject(ToastService);
  private readonly platformId = inject(PLATFORM_ID);
  private nudgeIntervalId: number | undefined;
  private nudgeFirstDelayId: number | undefined;
  private nudgeHideId: number | undefined;
  private ultimoMensaje = -1;
  private audioCtx: AudioContext | null = null;
  private audioDesbloqueado = false;
  private audioIntentado = false;
  private pendingNudgeSound = false;
  private pendingNudgeDisplay = false;
  private onUserInteraction?: () => void;

  readonly productos = signal<Producto[]>([]);
  readonly cargando = signal(true);
  readonly mostrarNudge = signal(false);
  readonly mensajeNudge = signal('');
  readonly skeletonItems = Array.from({ length: 8 }, (_, i) => i);
  private readonly mensajesMotivacion = [
    'Tu equipo necesita un lider: suma tu primer Avenger hoy.',
    'Un escuadron completo empieza con una sola figura heroica.',
    'Oferta de cuartel: tu primera compra desbloquea descuento premium.',
    'Haz despegar la mision: agrega un heroe al carrito ahora.',
    'Tony Stark aprueba esta compra: elige tu pieza favorita.'
  ];

  ngOnInit(): void {
    // Inicia hooks de UX (audio + nudge) y luego carga catalogo desde servicio.
    this.instalarDesbloqueoAudio();
    this.iniciarNudgePeriodico();

    this.productoService.obtenerProductos().subscribe({
      next: (items) => {
        this.productos.set(items);
        this.cargando.set(false);
      },
      error: () => {
        this.toast.mostrar('error', 'No se pudo cargar el catálogo.');
        this.cargando.set(false);
      }
    });
  }

  ngOnDestroy(): void {
    this.limpiarTimersNudge();
    this.desinstalarDesbloqueoAudio();
  }

  agregar(producto: Producto): void {
    // Desbloquea audio en primera interaccion y agrega al carrito.
    this.desbloquearAudio(true);

    const res = this.carritoService.agregar(producto, 1);
    this.toast.mostrar(res.ok ? 'exito' : 'error', res.mensaje);
    this.reproducirSonido(res.ok ? 'exito' : 'error');
  }

  desbloquearAudio(forzarCreacion = false): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (this.audioDesbloqueado) {
      if (this.pendingNudgeSound && this.mostrarNudge()) {
        this.pendingNudgeSound = !this.reproducirSonido('nudge');
      }
      return;
    }

    if (!this.audioIntentado && forzarCreacion) {
      this.audioIntentado = true;
      const AudioCtor = globalThis.AudioContext ?? (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtor) {
        return;
      }

      this.audioCtx = new AudioCtor();
    }

    if (!this.audioCtx) {
      return;
    }

    void this.audioCtx.resume()
      .then(() => {
        this.audioDesbloqueado = true;
        // Si habia nudge pendiente por bloqueo de autoplay, se dispara al desbloquear audio.
        if (this.pendingNudgeDisplay && this.carritoService.cantidad() === 0) {
          this.pendingNudgeDisplay = false;
          this.dispararNudge();
          return;
        }

        if (this.pendingNudgeSound && this.mostrarNudge()) {
          this.pendingNudgeSound = !this.reproducirSonido('nudge');
        }
      })
      .catch(() => {
        // Si el navegador bloquea audio por politicas de autoplay, se reintentara en el siguiente gesto.
        this.audioDesbloqueado = false;
      });
  }

  private instalarDesbloqueoAudio(): void {
    if (!isPlatformBrowser(this.platformId) || this.onUserInteraction) {
      return;
    }

    this.onUserInteraction = () => {
      this.desbloquearAudio(true);
    };

    document.addEventListener('pointerdown', this.onUserInteraction, { passive: true });
    document.addEventListener('keydown', this.onUserInteraction, { passive: true });
    document.addEventListener('touchstart', this.onUserInteraction, { passive: true });
  }

  private desinstalarDesbloqueoAudio(): void {
    if (!isPlatformBrowser(this.platformId) || !this.onUserInteraction) {
      return;
    }

    document.removeEventListener('pointerdown', this.onUserInteraction);
    document.removeEventListener('keydown', this.onUserInteraction);
    document.removeEventListener('touchstart', this.onUserInteraction);
    this.onUserInteraction = undefined;
  }

  private iniciarNudgePeriodico(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Primer nudge con delay corto y luego repeticion cada nudgeIntervalMs.
    this.nudgeFirstDelayId = window.setTimeout(() => {
      this.dispararNudge();
      this.nudgeIntervalId = window.setInterval(() => {
        this.dispararNudge();
      }, this.nudgeIntervalMs);
    }, this.nudgeFirstDelayMs);
  }

  private limpiarTimersNudge(): void {
    if (this.nudgeFirstDelayId !== undefined) {
      clearTimeout(this.nudgeFirstDelayId);
      this.nudgeFirstDelayId = undefined;
    }

    if (this.nudgeIntervalId !== undefined) {
      clearInterval(this.nudgeIntervalId);
      this.nudgeIntervalId = undefined;
    }

    if (this.nudgeHideId !== undefined) {
      clearTimeout(this.nudgeHideId);
      this.nudgeHideId = undefined;
    }
  }

  private dispararNudge(): void {
    // El nudge solo aparece cuando el carrito sigue vacio.
    if (!isPlatformBrowser(this.platformId) || this.carritoService.cantidad() > 0) {
      this.mostrarNudge.set(false);
      this.pendingNudgeDisplay = false;
      return;
    }

    this.desbloquearAudio(false);

    if (!this.audioDesbloqueado) {
      this.pendingNudgeDisplay = true;
      return;
    }

    const idx = this.obtenerIndiceMensaje();
    this.mensajeNudge.set(this.mensajesMotivacion[idx]);
    this.mostrarNudge.set(true);
    this.pendingNudgeSound = !this.reproducirSonido('nudge');

    if (this.nudgeHideId !== undefined) {
      clearTimeout(this.nudgeHideId);
    }

    this.nudgeHideId = window.setTimeout(() => {
      this.mostrarNudge.set(false);
      this.pendingNudgeSound = false;
    }, 5000);
  }

  private obtenerIndiceMensaje(): number {
    if (this.mensajesMotivacion.length === 1) {
      return 0;
    }

    let idx = Math.floor(Math.random() * this.mensajesMotivacion.length);
    if (idx === this.ultimoMensaje) {
      idx = (idx + 1) % this.mensajesMotivacion.length;
    }

    this.ultimoMensaje = idx;
    return idx;
  }

  private reproducirSonido(tipo: 'exito' | 'error' | 'nudge'): boolean {
    // Sintesiza un beep simple con WebAudio para feedback sin assets externos.
    if (!isPlatformBrowser(this.platformId) || !this.audioCtx || !this.audioDesbloqueado) {
      return false;
    }

    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = tipo === 'error' ? 'triangle' : 'sine';
    const frecuencia = tipo === 'exito' ? 660 : tipo === 'error' ? 220 : 520;
    const duracion = tipo === 'nudge' ? 0.14 : 0.18;
    const gananciaPico = tipo === 'nudge' ? 0.075 : 0.035;
    osc.frequency.setValueAtTime(frecuencia, now);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(gananciaPico, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duracion);

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start(now);
    osc.stop(now + duracion);
    return true;
  }
}
