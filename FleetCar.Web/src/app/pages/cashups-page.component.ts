import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { Cashup, Office } from '../core/models';
import { UiIconComponent } from '../shared/ui-icon.component';

@Component({
  selector: 'app-cashups-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, UiIconComponent],
  template: `
    <section class="page management-stack">
      <section class="panel management-card">
        <div class="table-title-row">
          <div>
            <p class="eyebrow">Cashups</p>
            <h2>Daily cashup control</h2>
          </div>
          <div class="crud-actions">
            <button type="button" class="button button-warning" (click)="reload()">
              <app-ui-icon name="refresh" [size]="16" />
              <span>Refresh</span>
            </button>
            <button type="button" class="button button-success" (click)="openCashup()" [disabled]="openCashupDisabled()">
              <app-ui-icon name="plus" [size]="16" />
              <span>Open cashup</span>
            </button>
          </div>
        </div>

        <div class="management-strip">
          <label>
            <span>Office</span>
            <select [value]="selectedOfficeId()" (change)="selectedOfficeId.set($any($event.target).value); reload()">
              <option value="">All visible offices</option>
              @for (office of offices(); track office.id) {
                <option [value]="office.id">{{ office.name }}</option>
              }
            </select>
          </label>

          <label>
            <span>Opening balance</span>
            <input type="number" min="0" step="0.01" [formControl]="openForm.controls.openingBalance" />
          </label>

          <label>
            <span>Closing balance</span>
            <input type="number" min="0" step="0.01" [formControl]="closeForm.controls.closingBalance" />
          </label>
        </div>
      </section>

      <section class="panel management-card">
        <div class="table-title-row">
          <div>
            <p class="eyebrow">Cashup register</p>
            <h3>Open and closed sessions</h3>
          </div>
          <div class="table-meta">
            <div class="table-stat">
              <p class="muted-label">Open sessions</p>
              <strong>{{ openSessions().length }}</strong>
            </div>
            <div class="table-stat">
              <p class="muted-label">Sales today</p>
              <strong>{{ salesTotal() | currency: 'USD' }}</strong>
            </div>
          </div>
        </div>

        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Actions</th>
                <th>Office</th>
                <th>Opened by</th>
                <th>Date</th>
                <th>Opening</th>
                <th>Sales</th>
                <th>Deposits</th>
                <th>Credit notes</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              @for (cashup of cashups(); track cashup.id) {
                <tr>
                  <td class="table-action-cell">
                    <div class="row-actions">
                      @if (cashup.status === 'Open') {
                        <button type="button" class="button button-danger button-small" (click)="closeCashup(cashup)">
                          <app-ui-icon name="close" [size]="14" />
                          <span>Close</span>
                        </button>
                      } @else {
                        <button type="button" class="button button-info button-small" (click)="viewNote(cashup)">
                          <app-ui-icon name="view" [size]="14" />
                          <span>View</span>
                        </button>
                      }
                    </div>
                  </td>
                  <td>{{ cashup.officeName }}</td>
                  <td>{{ cashup.openedByUsername }}</td>
                  <td>{{ cashup.sessionDateUtc | date: 'mediumDate' }}</td>
                  <td>{{ cashup.openingBalance | currency: 'USD' }}</td>
                  <td>{{ cashup.salesTotal | currency: 'USD' }}</td>
                  <td>{{ cashup.depositTotal | currency: 'USD' }}</td>
                  <td>{{ cashup.creditNotesTotal | currency: 'USD' }}</td>
                  <td><span class="chip" [class.status-green]="cashup.status === 'Closed'" [class.status-yellow]="cashup.status === 'Open'">{{ cashup.status }}</span></td>
                </tr>
              } @empty {
                <tr><td colspan="9" class="muted">No cashup data is available.</td></tr>
              }
            </tbody>
          </table>
        </div>
      </section>

      @if (selectedCashup()) {
        <div class="modal-backdrop" (click)="selectedCashup.set(null)">
          <section class="panel modal-card management-card" (click)="$event.stopPropagation()">
            <div class="table-title-row">
              <div>
                <p class="eyebrow">Cashup summary</p>
                <h3>{{ selectedCashup()!.officeName }} - {{ selectedCashup()!.sessionDateUtc | date: 'mediumDate' }}</h3>
              </div>
              <button type="button" class="button button-danger" (click)="selectedCashup.set(null)">
                <app-ui-icon name="close" [size]="16" />
                <span>Close</span>
              </button>
            </div>

            <div class="detail-grid">
              <div class="detail-item"><span class="muted-label">Opened by</span><strong>{{ selectedCashup()!.openedByUsername }}</strong></div>
              <div class="detail-item"><span class="muted-label">Closed by</span><strong>{{ selectedCashup()!.closedByUsername || 'Open' }}</strong></div>
              <div class="detail-item"><span class="muted-label">Opening balance</span><strong>{{ selectedCashup()!.openingBalance | currency: 'USD' }}</strong></div>
              <div class="detail-item"><span class="muted-label">Closing balance</span><strong>{{ selectedCashup()!.closingBalance | currency: 'USD' }}</strong></div>
              <div class="detail-item"><span class="muted-label">Sales</span><strong>{{ selectedCashup()!.salesTotal | currency: 'USD' }}</strong></div>
              <div class="detail-item"><span class="muted-label">Deposits</span><strong>{{ selectedCashup()!.depositTotal | currency: 'USD' }}</strong></div>
              <div class="detail-item"><span class="muted-label">Credit notes</span><strong>{{ selectedCashup()!.creditNotesTotal | currency: 'USD' }}</strong></div>
              <div class="detail-item"><span class="muted-label">Notes</span><strong>{{ selectedCashup()!.notes || 'N/A' }}</strong></div>
            </div>
          </section>
        </div>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CashupsPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly offices = signal<Office[]>([]);
  readonly cashups = signal<Cashup[]>([]);
  readonly selectedOfficeId = signal('');
  readonly selectedCashup = signal<Cashup | null>(null);
  readonly openForm = this.fb.nonNullable.group({
    openingBalance: [0, [Validators.required, Validators.min(0)]]
  });
  readonly closeForm = this.fb.nonNullable.group({
    closingBalance: [0, [Validators.required, Validators.min(0)]],
    notes: ['']
  });
  readonly openSessions = computed(() => this.cashups().filter((cashup) => cashup.status === 'Open'));
  readonly salesTotal = computed(() => this.cashups().reduce((total, cashup) => total + cashup.salesTotal, 0));
  readonly openCashupDisabled = computed(() => {
    const officeId = this.selectedOfficeId() || this.auth.user()?.officeId || '';
    const username = this.auth.user()?.username;
    return !officeId || this.openSessions().some((session) => session.officeId === officeId && session.openedByUsername === username);
  });

  ngOnInit() {
    this.reload();
  }

  reload() {
    const officeId = this.selectedOfficeId() || undefined;
    forkJoin({
      offices: this.api.getOffices(),
      cashups: this.api.getCashups(officeId)
    }).subscribe(({ offices, cashups }) => {
      this.offices.set(offices);
      this.cashups.set(cashups);
      if (!this.selectedOfficeId() && offices.length === 1) {
        this.selectedOfficeId.set(offices[0].id);
      }
    });
  }

  openCashup() {
    const officeId = this.selectedOfficeId() || this.auth.user()?.officeId;
    if (!officeId || this.openForm.invalid) {
      return;
    }

    this.api.openCashup({
      officeId,
      openingBalance: Number(this.openForm.controls.openingBalance.value)
    }).subscribe(() => this.reload());
  }

  closeCashup(cashup: Cashup) {
    const closingBalance = Number(this.closeForm.controls.closingBalance.value || cashup.salesTotal);
    const notes = this.closeForm.controls.notes.value || null;
    this.api.closeCashup(cashup.id, { closingBalance, notes }).subscribe(() => this.reload());
  }

  viewNote(cashup: Cashup) {
    this.selectedCashup.set(cashup);
  }
}
