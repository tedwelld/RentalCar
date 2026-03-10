import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { PdfExportService } from '../core/pdf-export.service';
import { AgentCommissionReport, Booking, Car, Office, Payment, RevenueBreakdown, UtilizationReport } from '../core/models';
import { UiIconComponent } from '../shared/ui-icon.component';

type ExportDataset = 'revenue' | 'utilization' | 'commissions' | 'bookings' | 'payments' | 'fleet';

@Component({
  selector: 'app-reports-page',
  standalone: true,
  imports: [CommonModule, UiIconComponent],
  template: `
    <section class="page">
      <div class="page-header panel">
        <div>
          <p class="eyebrow">Reports and exports</p>
          <h2>Generate filtered PDF reports</h2>
        </div>

        <div class="toolbar report-toolbar">
          <label>
            <span>Dataset</span>
            <select [value]="selectedDataset()" (change)="selectedDataset.set($any($event.target).value)">
              <option value="revenue">Revenue</option>
              <option value="utilization">Utilization</option>
              <option value="commissions">Agent commissions</option>
              <option value="bookings">Bookings</option>
              <option value="payments">Payments</option>
              <option value="fleet">Fleet</option>
            </select>
          </label>

          <label>
            <span>Office scope</span>
            <select [value]="selectedOfficeId()" (change)="selectedOfficeId.set($any($event.target).value); loadReports()">
              <option value="">All visible offices</option>
              @for (office of offices(); track office.id) {
                <option [value]="office.id">{{ office.name }}</option>
              }
            </select>
          </label>

          <button type="button" class="button button-warning" (click)="loadReports()">
            <app-ui-icon name="filter" [size]="16" />
            <span>Generate report</span>
          </button>

          <button type="button" class="button button-primary" (click)="exportCurrent()">
            <app-ui-icon name="export" [size]="16" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      <section class="panel">
        @switch (selectedDataset()) {
          @case ('revenue') {
            <div class="table-wrapper">
              <table class="data-table">
                <thead><tr><th>Office</th><th>Payments</th><th>Revenue</th></tr></thead>
                <tbody>
                  @for (row of revenue(); track row.officeName) {
                    <tr><td>{{ row.officeName }}</td><td>{{ row.paymentsCount }}</td><td>{{ row.revenue | currency: 'USD' }}</td></tr>
                  } @empty {
                    <tr><td colspan="3" class="muted">No revenue data available.</td></tr>
                  }
                </tbody>
              </table>
            </div>
          }
          @case ('utilization') {
            <div class="table-wrapper">
              <table class="data-table">
                <thead><tr><th>Office</th><th>Total Cars</th><th>Rented</th><th>Reserved</th><th>Utilization</th></tr></thead>
                <tbody>
                  @for (row of utilization(); track row.officeName) {
                    <tr><td>{{ row.officeName }}</td><td>{{ row.totalCars }}</td><td>{{ row.rentedCars }}</td><td>{{ row.reservedCars }}</td><td>{{ row.utilizationPercent }}%</td></tr>
                  } @empty {
                    <tr><td colspan="5" class="muted">No utilization data available.</td></tr>
                  }
                </tbody>
              </table>
            </div>
          }
          @case ('commissions') {
            <div class="table-wrapper">
              <table class="data-table">
                <thead><tr><th>Agent</th><th>Bookings</th><th>Gross</th><th>Commission</th></tr></thead>
                <tbody>
                  @for (row of commissions(); track row.agentCode) {
                    <tr><td>{{ row.companyName }}</td><td>{{ row.bookingsCount }}</td><td>{{ row.grossValue | currency: 'USD' }}</td><td>{{ row.commissionAmount | currency: 'USD' }}</td></tr>
                  } @empty {
                    <tr><td colspan="4" class="muted">No commission data available.</td></tr>
                  }
                </tbody>
              </table>
            </div>
          }
          @case ('bookings') {
            <div class="table-wrapper">
              <table class="data-table">
                <thead><tr><th>Reference</th><th>Office</th><th>Customer</th><th>Status</th><th>Total</th></tr></thead>
                <tbody>
                  @for (row of bookings(); track row.id) {
                    <tr><td>{{ row.reference }}</td><td>{{ row.officeName }}</td><td>{{ row.customerName }}</td><td>{{ row.status }}</td><td>{{ row.totalAmount | currency: row.currency }}</td></tr>
                  } @empty {
                    <tr><td colspan="5" class="muted">No bookings data available.</td></tr>
                  }
                </tbody>
              </table>
            </div>
          }
          @case ('payments') {
            <div class="table-wrapper">
              <table class="data-table">
                <thead><tr><th>Reference</th><th>Office</th><th>Method</th><th>Amount</th><th>Date</th></tr></thead>
                <tbody>
                  @for (row of payments(); track row.id) {
                    <tr><td>{{ row.reference }}</td><td>{{ row.officeName }}</td><td>{{ row.method }}</td><td>{{ row.amount | currency: row.currency }}</td><td>{{ row.paidAtUtc | date: 'mediumDate' }}</td></tr>
                  } @empty {
                    <tr><td colspan="5" class="muted">No payment data available.</td></tr>
                  }
                </tbody>
              </table>
            </div>
          }
          @default {
            <div class="table-wrapper">
              <table class="data-table">
                <thead><tr><th>Vehicle</th><th>Office</th><th>Status</th><th>Rate</th></tr></thead>
                <tbody>
                  @for (row of fleet(); track row.id) {
                    <tr><td>{{ row.make }} {{ row.model }}</td><td>{{ row.officeName }}</td><td>{{ row.status }}</td><td>{{ row.dailyRate | currency: 'USD' }}</td></tr>
                  } @empty {
                    <tr><td colspan="4" class="muted">No fleet data available.</td></tr>
                  }
                </tbody>
              </table>
            </div>
          }
        }
      </section>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReportsPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly pdfExport = inject(PdfExportService);

  readonly offices = signal<Office[]>([]);
  readonly selectedOfficeId = signal('');
  readonly selectedDataset = signal<ExportDataset>('revenue');
  readonly revenue = signal<RevenueBreakdown[]>([]);
  readonly utilization = signal<UtilizationReport[]>([]);
  readonly commissions = signal<AgentCommissionReport[]>([]);
  readonly bookings = signal<Booking[]>([]);
  readonly payments = signal<Payment[]>([]);
  readonly fleet = signal<Car[]>([]);
  readonly officeLabel = computed(
    () => this.offices().find((office) => office.id === this.selectedOfficeId())?.name ?? 'All visible offices'
  );
  readonly exportDefinition = computed(() => {
    switch (this.selectedDataset()) {
      case 'revenue':
        return {
          title: 'Revenue',
          headers: ['Office', 'Payments', 'Revenue'],
          rows: this.revenue().map((row) => [row.officeName, row.paymentsCount, `$${row.revenue.toFixed(2)}`])
        };
      case 'utilization':
        return {
          title: 'Utilization',
          headers: ['Office', 'Total Cars', 'Rented', 'Reserved', 'Utilization'],
          rows: this.utilization().map((row) => [
            row.officeName,
            row.totalCars,
            row.rentedCars,
            row.reservedCars,
            `${row.utilizationPercent}%`
          ])
        };
      case 'commissions':
        return {
          title: 'Agent Commissions',
          headers: ['Agent', 'Bookings', 'Gross', 'Commission'],
          rows: this.commissions().map((row) => [
            row.companyName,
            row.bookingsCount,
            `$${row.grossValue.toFixed(2)}`,
            `$${row.commissionAmount.toFixed(2)}`
          ])
        };
      case 'bookings':
        return {
          title: 'Bookings',
          headers: ['Reference', 'Office', 'Customer', 'Status', 'Total'],
          rows: this.bookings().map((row) => [
            row.reference,
            row.officeName,
            row.customerName,
            row.status,
            `${row.currency} ${row.totalAmount.toFixed(2)}`
          ])
        };
      case 'payments':
        return {
          title: 'Payments',
          headers: ['Reference', 'Office', 'Method', 'Amount', 'Date'],
          rows: this.payments().map((row) => [
            row.reference,
            row.officeName,
            row.method,
            `${row.currency} ${row.amount.toFixed(2)}`,
            new Date(row.paidAtUtc).toLocaleDateString()
          ])
        };
      default:
        return {
          title: 'Fleet',
          headers: ['Vehicle', 'Office', 'Status', 'Rate'],
          rows: this.fleet().map((row) => [
            `${row.make} ${row.model}`,
            row.officeName,
            row.status,
            `$${row.dailyRate.toFixed(2)}`
          ])
        };
    }
  });

  ngOnInit() {
    this.api.getOffices().subscribe((offices) => {
      this.offices.set(offices);
      this.loadReports();
    });
  }

  loadReports() {
    const officeId = this.selectedOfficeId() || undefined;
    forkJoin({
      revenue: this.api.getRevenueReport(officeId),
      utilization: this.api.getUtilizationReport(officeId),
      commissions: this.api.getAgentCommissionReport(officeId),
      bookings: this.api.getBookings(officeId),
      payments: this.api.getPayments(officeId),
      fleet: this.api.getCars(officeId)
    }).subscribe(({ revenue, utilization, commissions, bookings, payments, fleet }) => {
      this.revenue.set(revenue);
      this.utilization.set(utilization);
      this.commissions.set(commissions);
      this.bookings.set(bookings);
      this.payments.set(payments);
      this.fleet.set(fleet);
    });
  }

  exportCurrent() {
    const definition = this.exportDefinition();
    if (definition.rows.length === 0) {
      return;
    }

    this.pdfExport.exportTable({
      dataset: definition.title,
      officeLabel: this.officeLabel(),
      headers: definition.headers,
      rows: definition.rows,
      generatedBy: this.auth.user()?.username
    });
  }
}
