import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SystemFooterComponent } from '../shared/system-footer.component';
import { UiIconComponent } from '../shared/ui-icon.component';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [CommonModule, SystemFooterComponent, UiIconComponent],
  template: `
    <div class="public-shell">
      <main class="public-main">
        <section class="panel landing-shell">
          <header class="marketing-nav">
            <div class="brand-lockup">
              <div class="brand-mark">F</div>
              <div>
                <strong>FleetCar</strong>
                <span>Rental control</span>
              </div>
            </div>

            <div class="marketing-actions">
              <button type="button" class="nav-button ghost" (click)="goToLogin()">
                <app-ui-icon name="login" [size]="16" />
                <span>Sign in</span>
              </button>
              <button type="button" class="nav-button solid" (click)="goToRequestAccess()">
                <app-ui-icon name="signup" [size]="16" />
                <span>Sign up</span>
              </button>
            </div>
          </header>

          <section class="landing-grid">
            <div class="landing-copy">
              <p class="eyebrow">FleetCar car rental management system</p>
              <h1>Manage bookings, fleet and payments from one workspace.</h1>
              <p class="hero-copy">
                Built for multi-office car rental teams in Zimbabwe with office-scoped operations, reporting and
                payment tracking.
              </p>

              <div class="button-row">
                <button type="button" class="button button-primary" (click)="goToLogin()">
                  <app-ui-icon name="login" [size]="16" />
                  <span>Open staff portal</span>
                </button>
                <button type="button" class="button button-warning" (click)="goToRequestAccess()">
                  <app-ui-icon name="signup" [size]="16" />
                  <span>Request access</span>
                </button>
              </div>

              <div class="landing-tags">
                <span class="status-pill"><app-ui-icon name="office" [size]="15" /> Multi-office</span>
                <span class="status-pill"><app-ui-icon name="reports" [size]="15" /> PDF reporting</span>
                <span class="status-pill"><app-ui-icon name="payments" [size]="15" /> Payment control</span>
              </div>
            </div>

            <div class="landing-visual">
              <div class="hero-orbit orbit-a"></div>
              <div class="hero-orbit orbit-b"></div>
              <img src="hero-sports-car.svg" alt="FleetCar vehicle" class="hero-car-image" />
            </div>
          </section>
        </section>
      </main>

      <app-system-footer />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LandingPageComponent {
  private readonly router = inject(Router);

  goToLogin() {
    void this.router.navigate(['/login']);
  }

  goToRequestAccess() {
    void this.router.navigate(['/request-access']);
  }
}
