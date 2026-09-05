import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { MazeItem, captionAside, money, timer } from '../shared/models';

@Component({
  selector: 'app-maze-detail',
  imports: [RouterLink],
  template: `
    <main class="wrap">
      @if (loading()) {
        <div class="skeleton-page"><div class="sk sk-hero"></div></div>
      } @else if (error()) {
        <section class="state-screen">
          <h2>Circuito no encontrado</h2>
          <p class="muted">Ese pasillo no está en el plano.</p>
          <a class="btn btn-primary" routerLink="/laberintos">Volver a circuitos</a>
        </section>
      } @else if (maze(); as m) {
        <p class="kicker">{{ captionAside(m.caption, m.name) || 'Circuito' }}</p>
        <h1>{{ m.name }}</h1>
        <figure class="figure">
          <img [src]="m.photoUrl" [alt]="m.caption || m.name" />
          <figcaption>{{ captionAside(m.caption, m.name) || m.name }}</figcaption>
        </figure>
        <p>{{ m.description }}</p>
        <p class="muted">Par {{ timer(m.parSec) }} · tope {{ m.durationMin }} min · {{ m.freeTeamsNow }} / {{ m.maxTeams }} equipos libres</p>
        <p class="price">desde {{ money(m.fromPriceCents) }}</p>
        <h3>Tamaños</h3>
        <ul>
          @for (p of m.prices || []; track p.id) {
            <li>{{ p.teamMin }}–{{ p.teamMax }} personas · {{ money(p.priceCents) }}</li>
          }
        </ul>
        <h3>Estaciones</h3>
        <ol>
          @for (c of m.checkpoints || []; track c.id) {
            <li>{{ c.title }}</li>
          }
        </ol>
        <a class="btn btn-primary" [routerLink]="['/checkout', m.id]">Correr este circuito</a>
      }
    </main>
  `,
})
export class MazeDetailPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  readonly maze = signal<MazeItem | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly money = money;
  readonly timer = timer;
  readonly captionAside = captionAside;

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug') || '';
    this.api.maze(slug).subscribe({
      next: (m) => {
        this.maze.set(m);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }
}
