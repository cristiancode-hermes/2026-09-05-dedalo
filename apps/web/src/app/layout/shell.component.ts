import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { ThemeService } from '../core/theme.service';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink],
  template: `
    <header class="site-header">
      <a class="brand" routerLink="/">Dédalo</a>
      <div class="drawer-backdrop" [class.open]="open()" (click)="open.set(false)"></div>
      <nav class="nav-links" [class.open]="open()">
        <a routerLink="/laberintos" (click)="open.set(false)">Circuitos</a>
        <a routerLink="/clasificacion" (click)="open.set(false)">Tiempos</a>
        @if (auth.user(); as sessionUser) {
          <a routerLink="/mis-carreras" (click)="open.set(false)">Mis carreras</a>
          @if (sessionUser.role === 'staff' || sessionUser.role === 'admin') {
            <a routerLink="/staff" (click)="open.set(false)">Pasillo</a>
          }
          @if (sessionUser.role === 'admin') {
            <a routerLink="/admin" (click)="open.set(false)">Admin</a>
          }
          <button class="btn btn-ghost" type="button" (click)="auth.logout(); open.set(false)">Salir</button>
        } @else {
          <a class="btn btn-primary" routerLink="/login" (click)="open.set(false)">Entrar</a>
        }
      </nav>
      <div class="header-tools">
        <button
          class="theme-toggle"
          type="button"
          (click)="theme.toggle()"
          [attr.aria-label]="theme.isDark() ? 'Activar tema claro' : 'Activar tema oscuro'"
        >
          {{ theme.isDark() ? '☀' : '☾' }}
        </button>
        <button class="hamburger" type="button" (click)="open.set(!open())" [attr.aria-expanded]="open()" aria-label="Abrir menú">☰</button>
      </div>
    </header>
    <router-outlet />
  `,
})
export class ShellComponent {
  readonly auth = inject(AuthService);
  readonly theme = inject(ThemeService);
  readonly open = signal(false);
}
