import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { fleetCarBranding, fleetCarLogoDataUrl } from '../core/branding';
import { SystemFooterComponent } from '../shared/system-footer.component';
import { UiIconComponent, UiIconName } from '../shared/ui-icon.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, SystemFooterComponent, UiIconComponent],
  template: `
    <div class="shell shell-hover-nav">
      <aside class="sidebar hover-sidebar">
        <div class="sidebar-top">
          <div class="brand-lockup">
            <div class="brand-mark">F</div>
            <div class="sidebar-detail">
              <strong>FleetCar</strong>
              <span>Rental control</span>
            </div>
          </div>
        </div>

        <nav class="nav-list">
          @for (item of visibleNavItems(); track item.path) {
            <a [routerLink]="item.path" routerLinkActive="active-link" class="nav-link nav-link-compact">
              <span class="nav-icon"><app-ui-icon [name]="item.icon" [size]="18" /></span>
              <span class="sidebar-detail">
                <strong>{{ item.label }}</strong>
                <small>{{ item.caption }}</small>
              </span>
            </a>
          }
        </nav>

        <div class="sidebar-footer">
          <div class="sidebar-user sidebar-detail">
            <p class="muted-label">Signed in</p>
            <strong>{{ user()?.fullName }}</strong>
            <p>{{ user()?.role }} - {{ user()?.officeName }}</p>
          </div>
        </div>
      </aside>

      <main class="content-area">
        <header class="topbar panel">
          <div class="topbar-brand">
            <img [src]="logoUrl" [alt]="brand.name + ' logo'" class="topbar-logo" />
            <div>
              <p class="eyebrow">{{ brand.tagline }}</p>
              <h2>{{ pageTitle() }}</h2>
            </div>
          </div>

          <div class="topbar-actions">
            <div class="status-pill">
              <span class="status-dot"></span>
              {{ user()?.officeName }}
            </div>
            <button type="button" class="button button-danger" (click)="logout()">
              <app-ui-icon name="logout" [size]="16" />
              <span>Sign out</span>
            </button>
          </div>
        </header>

        <router-outlet />
        <app-system-footer />
      </main>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppShellComponent {
  private readonly auth = inject(AuthService);

  readonly brand = fleetCarBranding;
  readonly logoUrl = fleetCarLogoDataUrl;
  readonly user = this.auth.user;
  readonly navItems: Array<{ path: string; label: string; caption: string; icon: UiIconName; roles?: string[] }> = [
    { path: '/dashboard', label: 'Dashboard', caption: '', icon: 'dashboard' },
    { path: '/fleet', label: 'Fleet', caption: '', icon: 'fleet', roles: ['Admin', 'Manager', 'FleetManager'] },
    { path: '/bookings', label: 'Bookings', caption: '', icon: 'bookings', roles: ['Admin', 'Manager', 'Booker', 'Counter'] },
    { path: '/payments', label: 'Payments', caption: '', icon: 'payments', roles: ['Admin', 'Manager', 'Counter', 'FinanceManager'] },
    { path: '/customers', label: 'Customers', caption: '', icon: 'customers', roles: ['Admin', 'Manager'] },
    { path: '/cashups', label: 'Cashups', caption: '', icon: 'cashup', roles: ['Admin', 'Manager', 'Counter', 'FinanceManager'] },
    { path: '/agents', label: 'Agents', caption: '', icon: 'agents', roles: ['Admin', 'Manager', 'Booker'] },
    { path: '/reports', label: 'Reports', caption: '', icon: 'reports', roles: ['Admin', 'Manager', 'FinanceManager'] }
  ];
  readonly visibleNavItems = computed(() => {
    const role = this.user()?.role;
    return this.navItems.filter((item) => !item.roles || (!!role && item.roles.includes(role)));
  });
  readonly pageTitle = computed(() => 'FleetCar Workspace');

  logout() {
    this.auth.logout();
  }
}
