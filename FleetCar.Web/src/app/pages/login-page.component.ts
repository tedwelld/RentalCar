import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { SystemFooterComponent } from '../shared/system-footer.component';
import { UiIconComponent } from '../shared/ui-icon.component';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SystemFooterComponent, UiIconComponent],
  template: `
    <div class="public-shell">
      <main class="public-main simple-login-page">
        <div class="login-ambient" aria-hidden="true">
          <span class="ambient-line line-a"></span>
          <span class="ambient-line line-b"></span>
          <span class="ambient-line line-c"></span>
          <span class="ambient-orb orb-a"></span>
          <span class="ambient-orb orb-b"></span>
          <span class="ambient-orb orb-c"></span>
        </div>

        <section class="login-card panel clean-login-card">
          <div class="brand-lockup">
            <div class="brand-mark">F</div>
            <div>
              <strong>FleetCar</strong>
              <span>Staff portal</span>
            </div>
          </div>

          <div class="clean-login-copy">
            <p class="eyebrow">Sign in</p>
            <h1>Access the workspace</h1>
            <p class="muted">Use your assigned credentials to continue.</p>
          </div>

          <form [formGroup]="form" class="auth-form" (ngSubmit)="submit()">
            <label>
              <span>Username</span>
              <input type="text" formControlName="username" placeholder="Enter username" />
            </label>

            <label>
              <span>Password</span>
              <input type="password" formControlName="password" placeholder="Enter password" />
            </label>

            @if (error()) {
              <p class="form-error">{{ error() }}</p>
            }

            <button type="submit" class="button button-primary" [disabled]="form.invalid || submitting()">
              <app-ui-icon name="login" [size]="16" />
              <span>{{ submitting() ? 'Signing in...' : 'Sign in' }}</span>
            </button>
          </form>

          <div class="login-actions">
            <button type="button" class="text-action" (click)="goHome()">Back to landing page</button>
            <button type="button" class="text-action" (click)="goToRequestAccess()">Need an account?</button>
          </div>
        </section>
      </main>

      <app-system-footer />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required]
  });
  readonly submitting = signal(false);
  readonly error = signal('');

  submit() {
    if (this.form.invalid || this.submitting()) {
      return;
    }

    this.submitting.set(true);
    this.error.set('');

    this.auth.login(this.form.getRawValue().username, this.form.getRawValue().password).subscribe({
      next: () => {
        this.submitting.set(false);
        void this.router.navigate(['/dashboard']);
      },
      error: (response) => {
        this.submitting.set(false);
        this.error.set(response?.error?.error ?? 'Sign-in failed. Check the API and credentials.');
      }
    });
  }

  goHome() {
    void this.router.navigate(['/']);
  }

  goToRequestAccess() {
    void this.router.navigate(['/request-access']);
  }
}
