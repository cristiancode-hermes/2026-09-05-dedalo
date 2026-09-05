import { Component, inject, OnInit, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { RunItem, humanizeApiError, madridAt, money, statusLabel, timer } from '../shared/models';

@Component({
  selector: 'app-my-run-detail',
  imports: [RouterLink],
  template: `
    <main class="wrap">
      @if (loading()) {
        <div class="skeleton-page"><div class="sk sk-hero"></div></div>
      } @else if (error()) {
        <section class="state-screen">
          <h2>Carrera no encontrada</h2>
          <p class="muted">Ese dorsal no está en tu hilo.</p>
          <a class="btn btn-primary" routerLink="/mis-carreras">Mis carreras</a>
        </section>
      } @else if (run(); as r) {
        <p class="kicker">{{ r.code }}</p>
        <h1>{{ r.mazeName }}</h1>
        <p>{{ statusLabel(r.status) }} · {{ money(r.totalCents) }} · {{ r.teamSize }} personas</p>
        <p class="timer">{{ timer(r.elapsedSec) }}</p>
        @if (qr()) {
          <div class="qr" [innerHTML]="qr()"></div>
        }
        <p><a [href]="r.qrUrl || '#'">{{ r.qrUrl }}</a></p>
        <ol class="timeline">
          @for (e of r.events; track e.at + e.status) {
            <li>
              <strong>{{ statusLabel(e.status) }}</strong>
              <span class="muted">{{ madridAt(e.at) }}</span>
              @if (e.note) { <span>{{ e.note }}</span> }
            </li>
          }
        </ol>
        @if (r.status === 'confirmed') {
          <div id="pay-action">
            @if (actionError()) {
              <p class="cta-error">{{ actionError() }}</p>
            }
            <button class="btn btn-secondary" type="button" (click)="cancel()">Cancelar dorsal</button>
          </div>
        }
      }
    </main>
  `,
})
export class MyRunDetailPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly sanitizer = inject(DomSanitizer);
  readonly run = signal<RunItem | null>(null);
  readonly qr = signal<SafeHtml | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly actionError = signal('');
  readonly money = money;
  readonly timer = timer;
  readonly madridAt = madridAt;
  readonly statusLabel = statusLabel;

  ngOnInit(): void {
    this.fetch();
  }

  fetch(): void {
    const code = this.route.snapshot.paramMap.get('code') || '';
    this.api.byCode(code).subscribe({
      next: (r) => {
        this.run.set(r);
        if (r.qrSvg) this.qr.set(this.sanitizer.bypassSecurityTrustHtml(r.qrSvg));
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  cancel(): void {
    const r = this.run();
    if (!r) return;
    this.actionError.set('');
    this.api.cancel(r.code).subscribe({
      next: (updated) => this.run.set(updated),
      error: (err) => this.actionError.set(humanizeApiError(err)),
    });
  }
}
