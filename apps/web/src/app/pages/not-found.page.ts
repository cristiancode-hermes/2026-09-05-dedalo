import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `
    <main class="wrap">
      <section class="state-screen">
        <h2>Pasillo sin salida</h2>
        <p class="muted">Esa ruta no está en el plano del laberinto.</p>
        <a class="btn btn-primary" routerLink="/">Volver al umbral</a>
      </section>
    </main>
  `,
})
export class NotFoundPage {}
