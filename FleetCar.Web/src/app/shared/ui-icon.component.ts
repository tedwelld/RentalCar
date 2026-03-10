import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type UiIconName =
  | 'dashboard'
  | 'fleet'
  | 'bookings'
  | 'payments'
  | 'agents'
  | 'customers'
  | 'cashup'
  | 'reports'
  | 'logout'
  | 'login'
  | 'signup'
  | 'home'
  | 'map-pin'
  | 'phone'
  | 'mail'
  | 'car'
  | 'calendar'
  | 'filter'
  | 'export'
  | 'search'
  | 'refresh'
  | 'plus'
  | 'close'
  | 'office'
  | 'edit'
  | 'view'
  | 'delete'
  | 'menu'
  | 'print'
  | 'document';

@Component({
  selector: 'app-ui-icon',
  standalone: true,
  template: `
    <svg
      class="ui-icon"
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="1.9"
      aria-hidden="true">
      @switch (name()) {
        @case ('dashboard') {
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="4" rx="1.5" />
          <rect x="14" y="10" width="7" height="11" rx="1.5" />
          <rect x="3" y="13" width="7" height="8" rx="1.5" />
        }
        @case ('fleet') {
          <path d="M3 14h18" />
          <path d="M5 14l2-5h10l2 5" />
          <circle cx="7.5" cy="17.5" r="1.5" />
          <circle cx="16.5" cy="17.5" r="1.5" />
        }
        @case ('bookings') {
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M8 3v4M16 3v4M3 10h18" />
        }
        @case ('payments') {
          <path d="M12 2v20" />
          <path d="M17 6.5c0-1.93-2.24-3.5-5-3.5S7 4.57 7 6.5 9.24 10 12 10s5 1.57 5 3.5S14.76 17 12 17s-5-1.57-5-3.5" />
        }
        @case ('agents') {
          <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
          <circle cx="9.5" cy="7" r="4" />
          <path d="M17 11a4 4 0 0 1 0 8" />
          <path d="M21 21v-2a4 4 0 0 0-3-3.87" />
        }
        @case ('customers') {
          <circle cx="9" cy="8" r="4" />
          <path d="M3 20a6 6 0 0 1 12 0" />
          <circle cx="18" cy="9" r="2.5" />
          <path d="M15.5 19a4.5 4.5 0 0 1 5-4" />
        }
        @case ('cashup') {
          <path d="M4 7h16" />
          <path d="M6 7v11a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7" />
          <path d="M9 11h6" />
          <path d="M9 15h4" />
          <path d="M9 3v4M15 3v4" />
        }
        @case ('reports') {
          <path d="M5 19V9" />
          <path d="M12 19V5" />
          <path d="M19 19v-8" />
          <path d="M3 19h18" />
        }
        @case ('logout') {
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <path d="M16 17l5-5-5-5" />
          <path d="M21 12H9" />
        }
        @case ('login') {
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
          <path d="M10 17l5-5-5-5" />
          <path d="M15 12H3" />
        }
        @case ('signup') {
          <circle cx="9" cy="8" r="4" />
          <path d="M3 20a6 6 0 0 1 12 0" />
          <path d="M19 8v6" />
          <path d="M16 11h6" />
        }
        @case ('home') {
          <path d="M3 11.5 12 4l9 7.5" />
          <path d="M5 10.5V20h14v-9.5" />
        }
        @case ('map-pin') {
          <path d="M12 21s6-5.14 6-11a6 6 0 1 0-12 0c0 5.86 6 11 6 11z" />
          <circle cx="12" cy="10" r="2.5" />
        }
        @case ('phone') {
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.86 19.86 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.86 19.86 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.77.63 2.61a2 2 0 0 1-.45 2.11L8 9.73a16 16 0 0 0 6.27 6.27l1.29-1.29a2 2 0 0 1 2.11-.45c.84.3 1.71.51 2.61.63A2 2 0 0 1 22 16.92z" />
        }
        @case ('mail') {
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m4 7 8 6 8-6" />
        }
        @case ('car') {
          <path d="M3 14h18" />
          <path d="M5 14l2-5h10l2 5" />
          <circle cx="7.5" cy="17.5" r="1.5" />
          <circle cx="16.5" cy="17.5" r="1.5" />
          <path d="M8 9h8" />
        }
        @case ('calendar') {
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M8 3v4M16 3v4M3 10h18M8 14h3M13 14h3M8 18h3" />
        }
        @case ('filter') {
          <path d="M4 5h16" />
          <path d="M7 12h10" />
          <path d="M10 19h4" />
        }
        @case ('export') {
          <path d="M12 3v12" />
          <path d="m7 10 5 5 5-5" />
          <path d="M5 21h14" />
        }
        @case ('search') {
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        }
        @case ('refresh') {
          <path d="M21 12a9 9 0 0 1-15.36 6.36" />
          <path d="M3 12A9 9 0 0 1 18.36 5.64" />
          <path d="M3 17v-5h5" />
          <path d="M21 7v5h-5" />
        }
        @case ('plus') {
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        }
        @case ('close') {
          <path d="M6 6l12 12" />
          <path d="M18 6 6 18" />
        }
        @case ('edit') {
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
        }
        @case ('view') {
          <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" />
          <circle cx="12" cy="12" r="2.8" />
        }
        @case ('delete') {
          <path d="M3 6h18" />
          <path d="M8 6V4h8v2" />
          <path d="M19 6l-1 14H6L5 6" />
          <path d="M10 10v6M14 10v6" />
        }
        @case ('menu') {
          <path d="M4 7h16" />
          <path d="M4 12h16" />
          <path d="M4 17h16" />
        }
        @case ('print') {
          <path d="M7 8V3h10v5" />
          <rect x="5" y="14" width="14" height="7" rx="1.5" />
          <rect x="3" y="8" width="18" height="8" rx="2" />
          <path d="M17 12h.01" />
        }
        @case ('document') {
          <path d="M7 3h7l5 5v13H7z" />
          <path d="M14 3v5h5" />
          <path d="M9 13h6M9 17h6" />
        }
        @default {
          <path d="M3 12h18" />
          <path d="M12 3v18" />
        }
      }
    </svg>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UiIconComponent {
  readonly name = input.required<UiIconName>();
  readonly size = input(18);
}
