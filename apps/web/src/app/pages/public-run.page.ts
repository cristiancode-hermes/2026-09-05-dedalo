import { Component, inject, OnInit, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { RunItem, madridAt, statusLabel, timer } from '../shared/models';

@Component({
  selector: 'app-public-run',
  imports: [RouterLink],
  template: `
    <main class="wrap">
      @if (loading()) {
        <div class="skeleton-page"><div class="sk sk-hero"></div></div>
      } @else if (error()) {
        <section class="state-screen">
          <h2>Dorsal no encontrado</h2>
          <p class="muted">Quien espera fuera necesita el código correcto.</p>
          <a class="btn btn-primary" routerLink="/">Inicio</a>
        </section>
      } @else if (run(); as r) {
        <p class="kicker">Seguimiento</p>
        <h1>{{ r.mazeName }} · {{ r.code }}</h1>
        <p class="badge">{{ statusLabel(r.status) }}</p>
        @if (r.status === 'running' && r.elapsedSec != null) {
          <p class="timer">{{ timer(r.elapsedSec) }}</p>
        }
        @if (r.status === 'finished') {
          <p class="timer">{{ timer(r.elapsedSec) }}</p>
        }
        @if (qr()) {
          <div class="qr" [innerHTML]="qr()"></div>
        }
        <ol class="timeline">
          @for (e of r.events; track e.at + e.status) {
            <li>
              <strong>{{ statusLabel(e.status) }}</strong>
              <span class="muted">{{ madridAt(e.at) }}</span>
              @if (e.note) { <span>{{ e.note }}</span> }
            </li>
          }
        </ol>
      }
    </main>
  `,
})
export class PublicRunPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly sanitizer = inject(DomSanitizer);
  readonly run = signal<RunItem | null>(null);
  readonly qr = signal<SafeHtml | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly timer = timer;
  readonly madridAt = madridAt;
  readonly statusLabel = statusLabel;

  ngOnInit(): void {
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
}
