import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { RunItem, money, statusLabel, timer } from '../shared/models';

@Component({
  selector: 'app-my-runs',
  imports: [RouterLink],
  template: `
    <main class="wrap">
      <h1>Mis carreras</h1>
      @if (loading()) {
        <div class="skeleton-page"><div class="sk sk-hero"></div></div>
      } @else if (error()) {
        <section class="state-screen">
          <h2>No cargaron tus dorsales</h2>
          <p class="muted">Inténtalo de nuevo en un momento.</p>
          <button class="btn btn-primary" type="button" (click)="load()">Reintentar</button>
        </section>
      } @else if (!rows().length) {
        <section class="state-screen">
          <h2>Aún no has corrido</h2>
          <p class="muted">Elige un circuito y paga al momento.</p>
          <a class="btn btn-primary" routerLink="/laberintos">Ver circuitos</a>
        </section>
      } @else {
        <ul class="run-list">
          @for (r of rows(); track r.id) {
            <li>
              <a class="card" [routerLink]="['/mis-carreras', r.code]">
                <strong>{{ r.mazeName }}</strong>
                <span class="badge">{{ statusLabel(r.status) }}</span>
                <p class="muted">{{ r.code }} · {{ money(r.totalCents) }} · {{ timer(r.elapsedSec) }}</p>
              </a>
            </li>
          }
        </ul>
      }
    </main>
  `,
})
export class MyRunsPage implements OnInit {
  private readonly api = inject(ApiService);
  readonly rows = signal<RunItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly money = money;
  readonly timer = timer;
  readonly statusLabel = statusLabel;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.api.mine().subscribe({
      next: (rows) => {
        this.rows.set(rows);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }
}
