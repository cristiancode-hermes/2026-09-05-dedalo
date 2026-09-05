import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { ThemeService } from '../core/theme.service';
import { humanizeApiError } from '../shared/models';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-minimal">
      <button
        class="theme-toggle"
        type="button"
        (click)="theme.toggle()"
        [attr.aria-label]="theme.isDark() ? 'Activar tema claro' : 'Activar tema oscuro'"
      >
        {{ theme.isDark() ? '☀' : '☾' }}
      </button>
      <p class="kicker">El hilo se sigue</p>
      <h1>Dédalo</h1>
      <p class="muted">Entra al pasillo. El laberinto no se retiene: se corre.</p>
      <form class="auth-form" (ngSubmit)="submit()">
        <label class="form-field underline">
          Usuario o email
          <input name="identifier" [ngModel]="identifier()" (ngModelChange)="identifier.set($event)" autocomplete="off" required />
        </label>
        <label class="form-field underline">
          Contraseña
          <input type="password" name="password" [ngModel]="password()" (ngModelChange)="password.set($event)" autocomplete="new-password" required />
        </label>
        @if (error()) {
          <p class="cta-error">{{ error() }}</p>
        }
        <button class="btn btn-primary" type="submit" [disabled]="auth.loading()">Entrar</button>
        <p><a routerLink="/registro">Crear cuenta</a></p>
        <div class="auth-demo">
          <p>Cuenta de prueba</p>
          <p><code>demo@dedalo.dev</code> · <code>demo1234</code></p>
          <p>Staff</p>
          <p><code>staff@dedalo.dev</code> · <code>demo1234</code></p>
        </div>
      </form>
    </div>
  `,
})
export class LoginPage {
  readonly auth = inject(AuthService);
  readonly theme = inject(ThemeService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly identifier = signal('');
  readonly password = signal('');
  readonly error = signal('');

  submit(): void {
    this.error.set('');
    this.auth.login({ identifier: this.identifier(), password: this.password() }).subscribe({
      next: () => {
        this.auth.revalidateSession();
        const ret = this.route.snapshot.queryParamMap.get('returnUrl') || '/';
        void this.router.navigateByUrl(ret);
      },
      error: (err) => this.error.set(humanizeApiError(err)),
    });
  }
}
