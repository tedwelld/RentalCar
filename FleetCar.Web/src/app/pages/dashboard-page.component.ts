import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { Booking, DashboardSummary, Office, Payment, RevenueBreakdown, UtilizationReport } from '../core/models';
import { UiIconComponent } from '../shared/ui-icon.component';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule, UiIconComponent],
  template: `
    <section class="page dashboard-hero">
      <div class="page-header panel">
        <div>
          <p class="eyebrow">{{ isAdmin() ? 'Admin dashboard' : 'Office dashboard' }}</p>
          <h2>{{ isAdmin() ? 'Cross-office visual metrics' : 'Operational visual metrics' }}</h2>
          <p class="muted">
            {{ isAdmin() ? 'Monitor revenue, fleet use and outstanding balances across visible offices.' : 'Track today\\'s bookings, available fleet and payment flow for your office.' }}
          </p>
        </div>

        <label>
          <span>Office scope</span>
          <select [value]="selectedOfficeId()" (change)="changeOffice($event)">
            <option value="">All visible offices</option>
            @for (office of offices(); track office.id) {
              <option [value]="office.id">{{ office.name }}</option>
            }
          </select>
        </label>
      </div>

      <div class="dashboard-card-grid">
        <button type="button" class="dashboard-link-card" (click)="go('/reports')">
          <span class="muted-label">Revenue</span>
          <strong>{{ summary()?.totalRevenue ?? 0 | currency: 'USD' }}</strong>
          <div class="muted">Open revenue reports</div>
        </button>
        <button type="button" class="dashboard-link-card" (click)="go('/bookings')">
          <span class="muted-label">Active Bookings</span>
          <strong>{{ summary()?.activeBookings ?? 0 }}</strong>
          <div class="muted">Open bookings module</div>
        </button>
        <button type="button" class="dashboard-link-card" (click)="go('/fleet')">
          <span class="muted-label">Available Cars</span>
          <strong>{{ summary()?.availableCars ?? 0 }}</strong>
          <div class="muted">Open fleet module</div>
        </button>
        <button type="button" class="dashboard-link-card" (click)="go('/payments')">
          <span class="muted-label">Outstanding</span>
          <strong>{{ summary()?.outstandingBalances ?? 0 | currency: 'USD' }}</strong>
          <div class="muted">Open payments module</div>
        </button>
      </div>

      <div class="toolbar">
        <section class="panel chart-card dashboard-panel-link" (click)="go('/reports')">
          <div class="page-header">
            <div>
              <p class="eyebrow">Revenue mix</p>
              <h3>Bar graph by office</h3>
            </div>
          </div>

          <div class="bar-chart">
            @for (row of revenueChart(); track row.officeName) {
              <div class="bar-row">
                <header>
                  <span>{{ row.officeName }}</span>
                  <strong>{{ row.revenue | currency: 'USD' }}</strong>
                </header>
                <div class="bar-track">
                  <div class="bar-fill" [style.width.%]="row.percent"></div>
                </div>
              </div>
            } @empty {
              <p class="muted">No revenue data available.</p>
            }
          </div>
        </section>

        <section class="panel chart-card dashboard-panel-link" (click)="go('/fleet')">
          <div class="page-header">
            <div>
              <p class="eyebrow">Fleet utilization</p>
              <h3>Bar graph by office</h3>
            </div>
          </div>

          <div class="bar-chart">
            @for (row of utilizationChart(); track row.officeName) {
              <div class="bar-row">
                <header>
                  <span>{{ row.officeName }}</span>
                  <strong>{{ row.utilizationPercent }}%</strong>
                </header>
                <div class="bar-track">
                  <div class="bar-fill orange" [style.width.%]="row.utilizationPercent"></div>
                </div>
              </div>
            } @empty {
              <p class="muted">No utilization data available.</p>
            }
          </div>
        </section>
      </div>

      <div class="toolbar">
        <section class="panel dashboard-panel-link" (click)="go('/bookings')">
          <div class="page-header">
            <div>
              <p class="eyebrow">Recent Bookings</p>
              <h3>Latest reservations</h3>
            </div>
            <button type="button" class="button button-success" (click)="go('/bookings')">
              <app-ui-icon name="bookings" [size]="16" />
              <span>Manage bookings</span>
            </button>
          </div>
          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Customer</th>
                  <th>Vehicle</th>
                  <th>Status</th>
                  <th>Return</th>
                </tr>
              </thead>
              <tbody>
                @for (booking of recentBookings(); track booking.id) {
                  <tr>
                    <td>{{ booking.reference }}</td>
                    <td>{{ booking.customerName }}</td>
                    <td>{{ booking.carDisplayName }}</td>
                    <td><span class="chip">{{ booking.status }}</span></td>
                    <td>{{ booking.returnDateUtc | date: 'mediumDate' }}</td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="5" class="muted">No bookings available.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>

        <section class="panel dashboard-panel-link" (click)="go('/payments')">
          <div class="page-header">
            <div>
              <p class="eyebrow">Latest Payments</p>
              <h3>Recent transactions</h3>
            </div>
            <button type="button" class="button button-primary" (click)="go('/payments')">
              <app-ui-icon name="payments" [size]="16" />
              <span>Capture payments</span>
            </button>
          </div>
          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Booking</th>
                  <th>Method</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                @for (payment of recentPayments(); track payment.id) {
                  <tr>
                    <td>{{ payment.reference }}</td>
                    <td>{{ payment.bookingReference }}</td>
                    <td>{{ payment.method }}</td>
                    <td>{{ payment.amount | currency: payment.currency }}</td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="4" class="muted">No payments available.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly offices = signal<Office[]>([]);
  readonly selectedOfficeId = signal('');
  readonly summary = signal<DashboardSummary | null>(null);
  readonly recentBookings = signal<Booking[]>([]);
  readonly recentPayments = signal<Payment[]>([]);
  readonly revenue = signal<RevenueBreakdown[]>([]);
  readonly utilization = signal<UtilizationReport[]>([]);
  readonly isAdmin = computed(() => this.auth.user()?.role === 'Admin');
  readonly revenueChart = computed(() => {
    const data = this.revenue();
    const max = Math.max(...data.map((item) => item.revenue), 1);
    return data.map((item) => ({ ...item, percent: Math.round((item.revenue / max) * 100) }));
  });
  readonly utilizationChart = computed(() => this.utilization());

  ngOnInit() {
    this.api.getOffices().subscribe((offices) => {
      this.offices.set(offices);
      this.loadData();
    });
  }

  changeOffice(event: Event) {
    this.selectedOfficeId.set((event.target as HTMLSelectElement).value);
    this.loadData();
  }

  go(path: string) {
    void this.router.navigate([path]);
  }

  private loadData() {
    const officeId = this.selectedOfficeId() || undefined;
    forkJoin({
      summary: this.api.getDashboard(officeId),
      bookings: this.api.getBookings(officeId),
      payments: this.api.getPayments(officeId),
      revenue: this.api.getRevenueReport(officeId),
      utilization: this.api.getUtilizationReport(officeId)
    }).subscribe(({ summary, bookings, payments, revenue, utilization }) => {
      this.summary.set(summary);
      this.recentBookings.set(bookings.slice(0, 5));
      this.recentPayments.set(payments.slice(0, 5));
      this.revenue.set(revenue);
      this.utilization.set(utilization);
    });
  }
}
