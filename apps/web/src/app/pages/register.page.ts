import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { humanizeApiError } from '../shared/models';

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-minimal">
      <p class="kicker">El hilo se sigue</p>
      <h1>Crear cuenta</h1>
      <form class="auth-form" (ngSubmit)="submit()">
        <label class="form-field underline">
          Usuario
          <input name="username" [ngModel]="username()" (ngModelChange)="username.set($event)" autocomplete="off" required />
        </label>
        <label class="form-field underline">
          Email
          <input name="email" [ngModel]="email()" (ngModelChange)="email.set($event)" autocomplete="off" required />
        </label>
        <label class="form-field underline">
          Contraseña
          <input type="password" name="password" [ngModel]="password()" (ngModelChange)="password.set($event)" autocomplete="new-password" required />
        </label>
        @if (error()) {
          <p class="cta-error">{{ error() }}</p>
        }
        <button class="btn btn-primary" type="submit" [disabled]="auth.loading()">Registrarme</button>
        <p><a routerLink="/login">Ya tengo cuenta</a></p>
      </form>
    </div>
  `,
})
export class RegisterPage {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly username = signal('');
  readonly email = signal('');
  readonly password = signal('');
  readonly error = signal('');

  submit(): void {
    this.error.set('');
    this.auth
      .register({ username: this.username(), email: this.email(), password: this.password() })
      .subscribe({
        next: () => {
          this.auth.revalidateSession();
          void this.router.navigateByUrl('/');
        },
        error: (err) => this.error.set(humanizeApiError(err)),
      });
  }
}
