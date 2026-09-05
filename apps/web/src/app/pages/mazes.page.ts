import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { MazeItem, money, timer } from '../shared/models';

@Component({
  selector: 'app-mazes',
  imports: [RouterLink],
  template: `
    <main class="wrap">
      <p class="kicker">Circuitos</p>
      <h1>Elige pasillo</h1>
      @if (loading()) {
        <div class="skeleton-page"><div class="sk sk-hero"></div></div>
      } @else if (error()) {
        <section class="state-screen">
          <h2>No cargaron los circuitos</h2>
          <p class="muted">El azogue a veces se empaña.</p>
          <button class="btn btn-primary" type="button" (click)="load()">Reintentar</button>
        </section>
      } @else if (!mazes().length) {
        <section class="state-screen">
          <h2>No hay circuitos</h2>
          <p class="muted">Vuelve cuando abran el umbral.</p>
        </section>
      } @else {
        <div class="grid-shows maze-list">
          @for (m of mazes(); track m.id) {
            <a class="card" [routerLink]="['/laberintos', m.slug]">
              <img [src]="m.photoUrl" [alt]="m.caption || m.name" />
              <figcaption>{{ m.caption || m.name }}</figcaption>
              <h3>{{ m.name }}</h3>
              <p class="muted">Par {{ timer(m.parSec) }} · {{ m.freeTeamsNow }} equipos libres</p>
              <p class="price">desde {{ money(m.fromPriceCents) }}</p>
            </a>
          }
        </div>
      }
    </main>
  `,
})
export class MazesPage implements OnInit {
  private readonly api = inject(ApiService);
  readonly mazes = signal<MazeItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly money = money;
  readonly timer = timer;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.api.mazes().subscribe({
      next: (rows) => {
        this.mazes.set(rows);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }
}
