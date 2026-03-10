import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { fleetCarBranding, fleetCarLogoDataUrl } from '../core/branding';
import { UiIconComponent } from './ui-icon.component';

@Component({
  selector: 'app-system-footer',
  standalone: true,
  imports: [CommonModule, UiIconComponent],
  template: `
    <footer class="system-footer panel">
      <div class="footer-brand">
        <img [src]="logoUrl" alt="FleetCar logo" class="footer-logo" />
        <div>
          <strong>{{ brand.name }}</strong>
          <p>{{ brand.tagline }}</p>
        </div>
      </div>

      <div class="footer-contact">
        <span><app-ui-icon name="map-pin" [size]="16" /> {{ brand.address }}</span>
        <span><app-ui-icon name="phone" [size]="16" /> {{ brand.phone }}</span>
        <span><app-ui-icon name="mail" [size]="16" /> {{ brand.email }}</span>
      </div>
    </footer>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SystemFooterComponent {
  readonly brand = fleetCarBranding;
  readonly logoUrl = fleetCarLogoDataUrl;
}
