import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { MazeItem, captionAside, money, timer } from '../shared/models';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  template: `
    <main class="wrap">
      @if (loading()) {
        <div class="skeleton-page">
          <div class="sk sk-title"></div>
          <div class="sk sk-hero"></div>
        </div>
      } @else if (error()) {
        <section class="state-screen">
          <h2>No pudimos abrir el pasillo</h2>
          <p class="muted">Revisa la conexión e inténtalo otra vez.</p>
          <button class="btn btn-primary" type="button" (click)="load()">Reintentar</button>
        </section>
      } @else if (!featured()) {
        <section class="state-screen">
          <h2>Hoy no hay circuitos abiertos</h2>
          <p class="muted">Vuelve más tarde. El azogue se limpia al anochecer.</p>
        </section>
      } @else {
        <section class="hero">
          <div>
            <p class="kicker">El hilo se sigue</p>
            <h1>El laberinto no se retiene. Se corre.</h1>
            <p class="muted">Tres circuitos de espejos de barrio. Pagas al momento, el dorsal es un QR real, el cronómetro arranca en el umbral.</p>
            <a class="btn btn-primary" routerLink="/laberintos">Ver circuitos</a>
          </div>
          <figure class="figure featured">
            <img [src]="featured()!.photoUrl" [alt]="featured()!.caption || featured()!.name" />
            <figcaption>{{ captionAside(featured()!.caption, featured()!.name) || featured()!.name }}</figcaption>
          </figure>
        </section>
        <section>
          <h2>Circuitos</h2>
          <div class="grid-shows maze-list">
            @for (m of mazes(); track m.id) {
              <a class="card" [routerLink]="['/laberintos', m.slug]">
                <img [src]="m.photoUrl" [alt]="m.caption || m.name" />
                @if (captionAside(m.caption, m.name); as aside) {
                  <figcaption>{{ aside }}</figcaption>
                }
                <h3>{{ m.name }}</h3>
                <p class="muted">Par {{ timer(m.parSec) }} · {{ m.freeTeamsNow }} equipos libres</p>
                <p class="price">desde {{ money(m.fromPriceCents) }}</p>
              </a>
            }
          </div>
        </section>
        <section class="times-strip">
          <h2>Hoy en el pasillo</h2>
          <p class="muted">Clasificación viva de las metas de este día civil (Madrid).</p>
          <a class="btn btn-secondary" routerLink="/clasificacion">Ver tiempos</a>
        </section>
      }
    </main>
  `,
})
export class HomePage implements OnInit {
  private readonly api = inject(ApiService);
  readonly mazes = signal<MazeItem[]>([]);
  readonly featured = signal<MazeItem | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly money = money;
  readonly timer = timer;
  readonly captionAside = captionAside;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.api.mazes().subscribe({
      next: (rows) => {
        this.mazes.set(rows);
        this.featured.set(rows.find((m) => m.slug === 'espejo-mayor') || rows[0] || null);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }
}
