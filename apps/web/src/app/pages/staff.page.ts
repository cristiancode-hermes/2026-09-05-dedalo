import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { DailyPoint, RunItem, humanizeApiError, madridAt, statusLabel, timer } from '../shared/models';

@Component({
  selector: 'app-staff',
  imports: [FormsModule],
  template: `
    <main class="wrap">
      <p class="kicker">Pasillo</p>
      <h1>Escanear dorsal</h1>
      <label class="form-field">
        Código o URL
        <input name="code" [ngModel]="code()" (ngModelChange)="code.set($event)" autocomplete="off" />
      </label>
      <div id="pay-action">
        @if (actionError()) {
          <p class="cta-error">{{ actionError() }}</p>
        }
        <button class="btn btn-primary" type="button" (click)="scan()">Leer QR</button>
      </div>
      @if (run(); as r) {
        <section class="card" style="margin-top:24px">
          <h2>{{ r.mazeName }} · {{ r.code }}</h2>
          <p>{{ statusLabel(r.status) }} · {{ timer(r.elapsedSec) }}</p>
          <p class="muted">{{ madridAt(r.startedAt) }}</p>
          @if (r.suggestedAction === 'start') {
            <button class="btn btn-primary" type="button" (click)="start()">Pistoletazo</button>
          }
          @if (r.suggestedAction === 'checkpoint' && r.nextCheckpoint) {
            <button class="btn btn-primary" type="button" (click)="stamp()">Sellar {{ r.nextCheckpoint.title }}</button>
          }
          @if (r.suggestedAction === 'finish') {
            <button class="btn btn-primary" type="button" (click)="finish()">Cortar meta</button>
          }
        </section>
      }
      <section>
        <h2>Carreras / 14 días</h2>
        @if (!daily().length) {
          <p class="muted">Sin series todavía.</p>
        } @else {
          <svg class="chart" viewBox="0 0 640 240" role="img" aria-label="Carreras por día">
            <line x1="48" y1="16" x2="48" y2="200" stroke="currentColor" />
            <line x1="48" y1="200" x2="620" y2="200" stroke="currentColor" />
            @for (g of yTicks(); track g.label) {
              <line [attr.x1]="48" [attr.y1]="g.y" x2="620" [attr.y2]="g.y" stroke="currentColor" opacity="0.18" />
              <text x="8" [attr.y]="g.y + 4" font-size="11">{{ g.label }}</text>
            }
            @for (p of bars(); track p.date) {
              <rect
                [attr.x]="p.x"
                [attr.y]="p.y"
                [attr.width]="p.w"
                [attr.height]="p.h"
                fill="var(--color-primary)"
              >
                <title>{{ p.date }} · {{ p.count }} carreras</title>
              </rect>
              @if (p.showLabel) {
                <text [attr.x]="p.x + p.w / 2" y="216" text-anchor="middle" font-size="10">{{ p.label }}</text>
              }
            }
          </svg>
        }
      </section>
    </main>
  `,
})
export class StaffPage implements OnInit {
  private readonly api = inject(ApiService);
  readonly code = signal('');
  readonly run = signal<RunItem | null>(null);
  readonly actionError = signal('');
  readonly daily = signal<DailyPoint[]>([]);
  readonly timer = timer;
  readonly madridAt = madridAt;
  readonly statusLabel = statusLabel;

  readonly maxCount = signal(1);
  readonly yTicks = signal<Array<{ y: number; label: string }>>([]);
  readonly bars = signal<Array<{ date: string; count: number; x: number; y: number; w: number; h: number; label: string; showLabel: boolean }>>([]);

  ngOnInit(): void {
    this.api.daily().subscribe({
      next: (rows) => {
        this.daily.set(rows);
        const max = Math.max(1, ...rows.map((r) => r.count));
        this.maxCount.set(max);
        const unique = [...new Set([0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f)))];
        this.yTicks.set(
          unique.map((v) => ({
            y: 200 - (v / max) * 160,
            label: String(v),
          })),
        );
        const w = 36;
        this.bars.set(
          rows.map((r, i) => ({
            date: r.date,
            count: r.count,
            x: 56 + i * 40,
            w,
            h: (r.count / max) * 160,
            y: 200 - (r.count / max) * 160,
            label: r.date.slice(8),
            showLabel: i % 3 === 0,
          })),
        );
      },
    });
  }

  scan(): void {
    this.actionError.set('');
    this.api.scan(this.code()).subscribe({
      next: (r) => this.run.set(r),
      error: (err) => {
        this.actionError.set(humanizeApiError(err));
        queueMicrotask(() => document.getElementById('pay-action')?.scrollIntoView({ block: 'center' }));
      },
    });
  }

  start(): void {
    const r = this.run();
    if (!r) return;
    this.api.start(r.code).subscribe({
      next: () => this.api.scan(r.code).subscribe({ next: (u) => this.run.set(u) }),
      error: (err) => this.actionError.set(humanizeApiError(err)),
    });
  }

  stamp(): void {
    const r = this.run();
    const cp = r?.nextCheckpoint;
    if (!r || !cp) return;
    this.api.stamp(r.code, cp.id).subscribe({
      next: () => this.api.scan(r.code).subscribe({ next: (u) => this.run.set(u) }),
      error: (err) => this.actionError.set(humanizeApiError(err)),
    });
  }

  finish(): void {
    const r = this.run();
    if (!r) return;
    this.api.finish(r.code).subscribe({
      next: () => this.api.scan(r.code).subscribe({ next: (u) => this.run.set(u) }),
      error: (err) => this.actionError.set(humanizeApiError(err)),
    });
  }
}
