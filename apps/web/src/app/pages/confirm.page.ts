import { Component, inject, OnInit, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { RunItem, madridAt, money, statusLabel, timer } from '../shared/models';

@Component({
  selector: 'app-confirm',
  imports: [RouterLink],
  template: `
    <main class="wrap">
      @if (loading()) {
        <div class="skeleton-page"><div class="sk sk-hero"></div></div>
      } @else if (error()) {
        <section class="state-screen">
          <h2>No encontramos ese dorsal</h2>
          <p class="muted">Revisa el código o vuelve a tus carreras.</p>
          <a class="btn btn-primary" routerLink="/mis-carreras">Mis carreras</a>
        </section>
      } @else if (run(); as r) {
        <p class="kicker">Confirmada</p>
        <h1>Dorsal {{ r.code }}</h1>
        <p>{{ r.mazeName }} · {{ r.teamSize }} · {{ money(r.totalCents) }}</p>
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
        <a class="btn btn-secondary" [routerLink]="['/carrera', r.code]">Seguimiento público</a>
        <a class="btn btn-ghost" [routerLink]="['/mis-carreras', r.code]">Ficha</a>
      }
    </main>
  `,
})
export class ConfirmPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly sanitizer = inject(DomSanitizer);
  readonly run = signal<RunItem | null>(null);
  readonly qr = signal<SafeHtml | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly money = money;
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
