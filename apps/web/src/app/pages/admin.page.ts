import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { MazeItem, money } from '../shared/models';

@Component({
  selector: 'app-admin',
  imports: [FormsModule],
  template: `
    <main class="wrap">
      <p class="kicker">Admin</p>
      <h1>Circuitos</h1>
      @if (!mazes().length) {
        <section class="state-screen">
          <h2>Sin circuitos</h2>
          <p class="muted">Crea el primero abajo.</p>
        </section>
      }
      <ul class="run-list">
        @for (m of mazes(); track m.id) {
          <li class="card">
            <strong>{{ m.name }}</strong>
            <p class="muted">{{ m.slug }} · desde {{ money(m.fromPriceCents) }} · {{ m.freeTeamsNow }} libres</p>
          </li>
        }
      </ul>
      <h2>Nuevo circuito</h2>
      <label class="form-field">Nombre <input [ngModel]="name()" (ngModelChange)="name.set($event)" autocomplete="off" /></label>
      <label class="form-field">Slug <input [ngModel]="slug()" (ngModelChange)="slug.set($event)" autocomplete="off" /></label>
      <label class="form-field">Par (s) <input type="number" [ngModel]="parSec()" (ngModelChange)="parSec.set(+$event)" /></label>
      <label class="form-field">Duración (min) <input type="number" [ngModel]="durationMin()" (ngModelChange)="durationMin.set(+$event)" /></label>
      <label class="form-field">Equipos máx. <input type="number" [ngModel]="maxTeams()" (ngModelChange)="maxTeams.set(+$event)" /></label>
      <button class="btn btn-primary" type="button" (click)="create()">Crear</button>
      @if (msg()) { <p class="muted">{{ msg() }}</p> }
    </main>
  `,
})
export class AdminPage implements OnInit {
  private readonly api = inject(ApiService);
  readonly mazes = signal<MazeItem[]>([]);
  readonly name = signal('');
  readonly slug = signal('');
  readonly parSec = signal(240);
  readonly durationMin = signal(10);
  readonly maxTeams = signal(3);
  readonly msg = signal('');
  readonly money = money;

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.api.mazes().subscribe({ next: (m) => this.mazes.set(m) });
  }

  create(): void {
    this.msg.set('');
    this.api
      .createMaze({
        name: this.name(),
        slug: this.slug(),
        parSec: this.parSec(),
        durationMin: this.durationMin(),
        maxTeams: this.maxTeams(),
        photoUrl: '/assets/espejo-mayor.svg',
        description: this.name(),
      })
      .subscribe({
        next: () => {
          this.msg.set('Circuito creado');
          this.refresh();
        },
        error: () => this.msg.set('No se pudo crear'),
      });
  }
}
