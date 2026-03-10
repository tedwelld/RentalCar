import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { fleetCarBranding } from '../core/branding';
import { SystemFooterComponent } from '../shared/system-footer.component';
import { UiIconComponent } from '../shared/ui-icon.component';

@Component({
  selector: 'app-request-access-page',
  standalone: true,
  imports: [CommonModule, SystemFooterComponent, UiIconComponent],
  template: `
    <div class="public-shell">
      <main class="public-main">
        <section class="panel public-card request-card">
          <div class="brand-lockup">
            <div class="brand-mark">F</div>
            <div>
              <strong>FleetCar</strong>
              <span>Access request</span>
            </div>
          </div>

          <div class="request-copy">
            <p class="eyebrow">Sign up</p>
            <h1>Request a staff account</h1>
            <p class="muted">
              FleetCar accounts are provisioned by an administrator. Use the contact details below to request
              access for your office.
            </p>
          </div>

          <div class="contact-stack">
            <div class="contact-line">
              <app-ui-icon name="map-pin" [size]="18" />
              <span>{{ brand.address }}</span>
            </div>
            <div class="contact-line">
              <app-ui-icon name="phone" [size]="18" />
              <span>{{ brand.phone }}</span>
            </div>
            <div class="contact-line">
              <app-ui-icon name="mail" [size]="18" />
              <span>{{ brand.email }}</span>
            </div>
          </div>

          <div class="button-row">
            <button type="button" class="button button-primary" (click)="goToLogin()">
              <app-ui-icon name="login" [size]="16" />
              <span>Go to sign in</span>
            </button>
            <button type="button" class="button button-warning" (click)="goHome()">
              <app-ui-icon name="home" [size]="16" />
              <span>Back to landing</span>
            </button>
          </div>
        </section>
      </main>

      <app-system-footer />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RequestAccessPageComponent {
  private readonly router = inject(Router);

  readonly brand = fleetCarBranding;

  goToLogin() {
    void this.router.navigate(['/login']);
  }

  goHome() {
    void this.router.navigate(['/']);
  }
}
