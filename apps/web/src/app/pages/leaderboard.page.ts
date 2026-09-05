import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { MazeItem, RunItem, money, timer } from '../shared/models';

@Component({
  selector: 'app-leaderboard',
  imports: [FormsModule, RouterLink],
  template: `
    <main class="wrap">
      <p class="kicker">Tiempos</p>
      <h1>Clasificación del día</h1>
      <label class="form-field">
        Circuito
        <select [ngModel]="mazeId()" (ngModelChange)="mazeId.set($event); load()">
          <option value="">Todos</option>
          @for (m of mazes(); track m.id) {
            <option [value]="m.id">{{ m.name }}</option>
          }
        </select>
      </label>
      @if (loading()) {
        <div class="skeleton-page"><div class="sk sk-hero"></div></div>
      } @else if (error()) {
        <section class="state-screen">
          <h2>No cargó la clasificación</h2>
          <button class="btn btn-primary" type="button" (click)="load()">Reintentar</button>
        </section>
      } @else if (!rows().length) {
        <section class="state-screen">
          <h2>Aún no hay metas hoy</h2>
          <p class="muted">El primer equipo que corte la cinta abre la tabla.</p>
          <a class="btn btn-primary" routerLink="/laberintos">Correr</a>
        </section>
      } @else {
        <ol class="run-list">
          @for (r of rows(); track r.id; let i = $index) {
            <li>
              <a class="card" [routerLink]="['/carrera', r.code]">
                <strong>#{{ i + 1 }} {{ r.mazeName }}</strong>
                <p class="timer">{{ timer(r.elapsedSec) }}</p>
                <p class="muted">{{ r.code }} · {{ money(r.totalCents) }}</p>
              </a>
            </li>
          }
        </ol>
      }
    </main>
  `,
})
export class LeaderboardPage implements OnInit {
  private readonly api = inject(ApiService);
  readonly mazes = signal<MazeItem[]>([]);
  readonly mazeId = signal('');
  readonly rows = signal<RunItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly timer = timer;
  readonly money = money;

  ngOnInit(): void {
    this.api.mazes().subscribe({ next: (m) => this.mazes.set(m) });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.api.leaderboard(this.mazeId() || undefined).subscribe({
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
