import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, DoCheck, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CarritoService } from '../../core/services/carrito';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, CurrencyPipe],
  templateUrl: './header.html',
  styleUrl: './header.css'
})
export class HeaderComponent implements DoCheck {
  private readonly carritoService = inject(CarritoService);
  private cantidadPrev = 0;

  cantidad = 0;
  total = 0;
  rebote = false;

  ngDoCheck(): void {
    this.carritoService.revision();
    this.cantidad = this.carritoService.cantidad();
    this.total = this.carritoService.total();

    if (this.cantidad > this.cantidadPrev) {
      this.rebote = true;
      setTimeout(() => {
        this.rebote = false;
      }, 280);
    }

    this.cantidadPrev = this.cantidad;
  }
}
