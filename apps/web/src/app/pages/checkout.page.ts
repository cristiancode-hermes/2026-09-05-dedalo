import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { MazeItem, humanizeApiError, money } from '../shared/models';

@Component({
  selector: 'app-checkout',
  imports: [FormsModule, RouterLink],
  template: `
    <main class="wrap">
      @if (loading()) {
        <div class="skeleton-page"><div class="sk sk-hero"></div></div>
      } @else if (errorLoad()) {
        <section class="state-screen">
          <h2>No se pudo abrir el cobro</h2>
          <p class="muted">Vuelve al circuito e inténtalo de nuevo.</p>
          <a class="btn btn-primary" routerLink="/laberintos">Circuitos</a>
        </section>
      } @else if (maze(); as m) {
        <p class="kicker">Checkout</p>
        <h1>{{ m.name }}</h1>
        <p class="muted">{{ m.freeTeamsNow }} equipos libres ahora. Sin retención: pagas y el dorsal sale.</p>
        <label class="form-field">
          Tamaño del equipo
          <select name="teamSize" [ngModel]="teamSize()" (ngModelChange)="teamSize.set(+$event)">
            @for (n of sizes(); track n) {
              <option [value]="n">{{ n }} {{ n === 1 ? 'persona' : 'personas' }}</option>
            }
          </select>
        </label>
        <aside class="summary">
          <h3>Resumen</h3>
          <p>{{ m.name }}</p>
          <p>{{ teamSize() }} en el pasillo</p>
          <p class="price">Total {{ money(liveTotal()) }}</p>
        </aside>
        <div id="pay-action">
          @if (payError()) {
            <p class="cta-error">{{ payError() }}</p>
          }
          <button class="btn btn-primary" type="button" (click)="pay()" [disabled]="paying()">Pagar ahora</button>
        </div>
      }
    </main>
  `,
})
export class CheckoutPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly maze = signal<MazeItem | null>(null);
  readonly loading = signal(true);
  readonly errorLoad = signal(false);
  readonly teamSize = signal(2);
  readonly paying = signal(false);
  readonly payError = signal('');
  readonly money = money;
  readonly sizes = computed(() => {
    const prices = this.maze()?.prices || [];
    const out: number[] = [];
    for (const p of prices) {
      for (let n = p.teamMin; n <= p.teamMax; n += 1) out.push(n);
    }
    return out.length ? out : [1, 2, 3, 4, 5, 6];
  });
  readonly liveTotal = computed(() => {
    const m = this.maze();
    const n = this.teamSize();
    const band = (m?.prices || []).find((p) => n >= p.teamMin && n <= p.teamMax);
    return band?.priceCents ?? m?.fromPriceCents ?? 0;
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('mazeId') || '';
    this.api.mazes().subscribe({
      next: (rows) => {
        const found = rows.find((r) => r.id === id);
        if (!found) {
          this.errorLoad.set(true);
          this.loading.set(false);
          return;
        }
        this.api.maze(found.slug).subscribe({
          next: (detail) => {
            this.maze.set(detail);
            const first = detail.prices?.[0];
            if (first) this.teamSize.set(first.teamMin);
            this.loading.set(false);
          },
          error: () => {
            this.errorLoad.set(true);
            this.loading.set(false);
          },
        });
      },
      error: () => {
        this.errorLoad.set(true);
        this.loading.set(false);
      },
    });
  }

  pay(): void {
    const m = this.maze();
    if (!m) return;
    this.paying.set(true);
    this.payError.set('');
    this.api.checkout(m.id, this.teamSize()).subscribe({
      next: (run) => {
        this.paying.set(false);
        void this.router.navigate(['/confirmacion', run.code]);
      },
      error: (err) => {
        this.paying.set(false);
        this.payError.set(humanizeApiError(err));
        queueMicrotask(() => document.getElementById('pay-action')?.scrollIntoView({ block: 'center' }));
      },
    });
  }
}
