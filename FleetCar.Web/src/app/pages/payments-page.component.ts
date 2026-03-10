import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { PdfExportService } from '../core/pdf-export.service';
import { Booking, Office, Payment, UpdatePaymentRequest } from '../core/models';
import { DocumentPreviewComponent } from '../shared/document-preview.component';
import { UiIconComponent } from '../shared/ui-icon.component';

type PaymentModalMode = 'create' | 'edit' | 'view';

@Component({
  selector: 'app-payments-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, UiIconComponent, DocumentPreviewComponent],
  template: `
    <section class="page management-stack">
      <section class="panel management-card">
        <div class="table-title-row">
          <div>
            <p class="eyebrow">Payments</p>
            <h2>Cash flow and settlement management</h2>
          </div>
          <div class="crud-actions">
            <button type="button" class="button button-warning" (click)="reload()">
              <app-ui-icon name="refresh" [size]="16" />
              <span>Refresh</span>
            </button>
            <button type="button" class="button button-primary" (click)="openCreate()">
              <app-ui-icon name="payments" [size]="16" />
              <span>Capture payment</span>
            </button>
          </div>
        </div>

        <div class="management-strip">
          <label>
            <span>Office</span>
            <select [value]="filterOfficeId()" (change)="filterOfficeId.set($any($event.target).value)">
              <option value="">All visible offices</option>
              @for (office of offices(); track office.id) {
                <option [value]="office.id">{{ office.name }}</option>
              }
            </select>
          </label>

          <label>
            <span>Method</span>
            <select [value]="filterMethod()" (change)="filterMethod.set($any($event.target).value)">
              <option value="">All methods</option>
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
              <option value="Paynow">Paynow</option>
              <option value="InnBucks">InnBucks</option>
              <option value="BankTransfer">BankTransfer</option>
            </select>
          </label>

          <label>
            <span>Search</span>
            <input type="text" [value]="searchTerm()" (input)="searchTerm.set($any($event.target).value)" placeholder="Reference or booking" />
          </label>
        </div>
      </section>

      <section class="panel management-card">
        <div class="table-title-row">
          <div>
            <p class="eyebrow">Payments register</p>
            <h3>Recorded transactions</h3>
          </div>
          <div class="table-meta">
            <div class="table-stat">
              <p class="muted-label">Visible rows</p>
              <strong>{{ filteredPayments().length }}</strong>
            </div>
            <div class="table-stat">
              <p class="muted-label">Visible total</p>
              <strong>{{ visibleTotal() | currency: 'USD' }}</strong>
            </div>
          </div>
        </div>

        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Actions</th>
                <th>Reference</th>
                <th>Booking</th>
                <th>Office</th>
                <th>Method</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              @for (payment of filteredPayments(); track payment.id) {
                <tr>
                  <td class="table-action-cell">
                    <div class="row-actions">
                      <button type="button" class="button button-info button-small" (click)="openView(payment)">
                        <app-ui-icon name="view" [size]="14" />
                        <span>View</span>
                      </button>
                      <button type="button" class="button button-info button-small" (click)="previewReceipt(payment)">
                        <app-ui-icon name="document" [size]="14" />
                        <span>Receipt</span>
                      </button>
                      @if (isAdmin()) {
                        <button type="button" class="button button-warning button-small" (click)="openEdit(payment)">
                          <app-ui-icon name="edit" [size]="14" />
                          <span>Edit</span>
                        </button>
                        @if (payment.status === 'Held') {
                          <button type="button" class="button button-success button-small" (click)="process(payment)">
                            <app-ui-icon name="payments" [size]="14" />
                            <span>Process</span>
                          </button>
                        } @else {
                          <button type="button" class="button button-warning button-small" (click)="hold(payment)">
                            <app-ui-icon name="filter" [size]="14" />
                            <span>Hold</span>
                          </button>
                        }
                        <button type="button" class="button button-danger button-small" (click)="remove(payment)">
                          <app-ui-icon name="delete" [size]="14" />
                          <span>Delete</span>
                        </button>
                      }
                      @if (canManagePayments()) {
                        <button type="button" class="button button-warning button-small" (click)="openCreditNote(payment)">
                          <app-ui-icon name="document" [size]="14" />
                          <span>Credit note</span>
                        </button>
                      }
                    </div>
                  </td>
                  <td>{{ payment.reference }}</td>
                  <td>{{ payment.bookingReference }}</td>
                  <td>{{ payment.officeName }}</td>
                  <td>{{ payment.method }}</td>
                  <td>
                    <div class="row-actions">
                      <span class="chip" [class.status-yellow]="payment.isDeposit" [class.status-green]="!payment.isDeposit">{{ payment.isDeposit ? 'Deposit' : 'Balance' }}</span>
                      <span class="chip" [class.status-blue]="payment.status === 'Processed'" [class.status-red]="payment.status === 'Held'">{{ payment.status }}</span>
                    </div>
                  </td>
                  <td>{{ payment.totalAmount | currency: payment.currency }}</td>
                  <td>{{ payment.paidAtUtc | date: 'medium' }}</td>
                </tr>
              } @empty {
                <tr><td colspan="8" class="muted">No payments found for the current filters.</td></tr>
              }
            </tbody>
          </table>
        </div>
      </section>

      @if (showModal()) {
        <div class="modal-backdrop" (click)="closeModal()">
          <section class="panel modal-card management-card" (click)="$event.stopPropagation()">
            <div class="table-title-row">
              <div>
                <p class="eyebrow">Payments</p>
                <h3>{{ modalMode() === 'create' ? 'Capture payment' : modalMode() === 'edit' ? 'Edit payment' : 'Payment details' }}</h3>
              </div>
              <button type="button" class="button button-danger" (click)="closeModal()">
                <app-ui-icon name="close" [size]="16" />
                <span>Close</span>
              </button>
            </div>

            @if (modalMode() === 'view' && activePayment()) {
              <div class="detail-grid">
                <div class="detail-item"><span class="muted-label">Reference</span><strong>{{ activePayment()!.reference }}</strong></div>
                <div class="detail-item"><span class="muted-label">Booking</span><strong>{{ activePayment()!.bookingReference }}</strong></div>
                <div class="detail-item"><span class="muted-label">Office</span><strong>{{ activePayment()!.officeName }}</strong></div>
                <div class="detail-item"><span class="muted-label">Method</span><strong>{{ activePayment()!.method }}</strong></div>
                <div class="detail-item"><span class="muted-label">Status</span><strong>{{ activePayment()!.status }}</strong></div>
                <div class="detail-item"><span class="muted-label">Type</span><strong>{{ activePayment()!.isDeposit ? 'Deposit' : 'Balance' }}</strong></div>
                <div class="detail-item"><span class="muted-label">Base amount</span><strong>{{ activePayment()!.amount | currency: activePayment()!.currency }}</strong></div>
                <div class="detail-item"><span class="muted-label">Tax</span><strong>{{ activePayment()!.taxAmount | currency: activePayment()!.currency }}</strong></div>
                <div class="detail-item"><span class="muted-label">VAT</span><strong>{{ activePayment()!.vatAmount | currency: activePayment()!.currency }}</strong></div>
                <div class="detail-item"><span class="muted-label">Total charged</span><strong>{{ activePayment()!.totalAmount | currency: activePayment()!.currency }}</strong></div>
                <div class="detail-item"><span class="muted-label">Fiscal invoice</span><strong>{{ activePayment()!.fiscalInvoiceNumber || 'N/A' }}</strong></div>
                <div class="detail-item"><span class="muted-label">Paid at</span><strong>{{ activePayment()!.paidAtUtc | date: 'medium' }}</strong></div>
                <div class="detail-item"><span class="muted-label">Captured by</span><strong>{{ activePayment()!.capturedByUsername }}</strong></div>
                <div class="crud-actions" style="grid-column: 1 / -1;">
                  <button type="button" class="button button-info" (click)="previewReceipt(activePayment()!)">
                    <app-ui-icon name="print" [size]="16" />
                    <span>Preview receipt</span>
                  </button>
                </div>
              </div>
            } @else {
              <form [formGroup]="form" class="form-grid" (ngSubmit)="submit()">
                <label>
                  <span>Booking</span>
                  <select formControlName="bookingId">
                    @for (booking of bookingOptions(); track booking.id) {
                      <option [value]="booking.id">{{ booking.reference }} - {{ booking.customerName }}</option>
                    }
                  </select>
                </label>

                <label>
                  <span>Amount</span>
                  <input type="number" min="1" step="0.01" formControlName="amount" />
                </label>

                <label>
                  <span>Currency</span>
                  <select formControlName="currency">
                    <option value="USD">USD</option>
                    <option value="ZWL">ZWL</option>
                    <option value="GBP">GBP</option>
                    <option value="ZAR">ZAR</option>
                    <option value="EUR">EUR</option>
                  </select>
                </label>

                <label>
                  <span>Method</span>
                  <select formControlName="method">
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="Paynow">Paynow</option>
                    <option value="InnBucks">InnBucks</option>
                    <option value="BankTransfer">Bank Transfer</option>
                  </select>
                </label>

                @if (isAdmin()) {
                  <label>
                    <span>Status</span>
                    <select formControlName="status">
                      <option value="Processed">Processed</option>
                      <option value="Held">Held</option>
                    </select>
                  </label>
                }

                <label>
                  <span>Reference</span>
                  <input type="text" formControlName="reference" placeholder="Leave blank to auto-generate" />
                </label>

                <label>
                  <span>Fiscal invoice number</span>
                  <input type="text" formControlName="fiscalInvoiceNumber" placeholder="Optional fiscal reference" />
                </label>

                <label>
                  <span>Payment type</span>
                  <select formControlName="isDeposit">
                    <option [ngValue]="true">Deposit</option>
                    <option [ngValue]="false">Balance payment</option>
                  </select>
                </label>

                @if (error()) {
                  <p class="form-error" style="grid-column: 1 / -1;">{{ error() }}</p>
                }

                <div class="crud-actions" style="grid-column: 1 / -1;">
                  <button type="submit" class="button button-primary" [disabled]="form.invalid || submitting()">
                    <app-ui-icon [name]="modalMode() === 'create' ? 'plus' : 'edit'" [size]="16" />
                    <span>{{ submitting() ? 'Saving...' : modalMode() === 'create' ? 'Capture payment' : 'Save changes' }}</span>
                  </button>
                  <button type="button" class="button button-danger" (click)="closeModal()">
                    <app-ui-icon name="close" [size]="16" />
                    <span>Cancel</span>
                  </button>
                </div>
              </form>
            }
          </section>
        </div>
      }

      @if (showCreditNoteModal() && creditNotePayment()) {
        <div class="modal-backdrop" (click)="closeCreditNoteModal()">
          <section class="panel modal-card management-card" (click)="$event.stopPropagation()">
            <div class="table-title-row">
              <div>
                <p class="eyebrow">Credit notes</p>
                <h3>Create credit note for {{ creditNotePayment()!.reference }}</h3>
              </div>
              <button type="button" class="button button-danger" (click)="closeCreditNoteModal()">
                <app-ui-icon name="close" [size]="16" />
                <span>Close</span>
              </button>
            </div>

            <form [formGroup]="creditNoteForm" class="form-grid" (ngSubmit)="submitCreditNote()">
              <label>
                <span>Amount</span>
                <input type="number" min="1" step="0.01" formControlName="amount" />
              </label>
              <label>
                <span>Currency</span>
                <select formControlName="currency">
                  <option value="USD">USD</option>
                  <option value="ZWL">ZWL</option>
                  <option value="GBP">GBP</option>
                  <option value="ZAR">ZAR</option>
                  <option value="EUR">EUR</option>
                </select>
              </label>
              <label style="grid-column: 1 / -1;">
                <span>Reason</span>
                <textarea formControlName="reason" placeholder="Refund, pricing correction, cancelled service"></textarea>
              </label>

              <div class="crud-actions" style="grid-column: 1 / -1;">
                <button type="submit" class="button button-warning" [disabled]="creditNoteForm.invalid">
                  <app-ui-icon name="document" [size]="16" />
                  <span>Issue credit note</span>
                </button>
                <button type="button" class="button button-danger" (click)="closeCreditNoteModal()">
                  <app-ui-icon name="close" [size]="16" />
                  <span>Cancel</span>
                </button>
              </div>
            </form>
          </section>
        </div>
      }

      @if (documentPreviewUrl()) {
        <app-document-preview
          [title]="documentPreviewTitle()"
          [url]="documentPreviewUrl()!"
          (closed)="closePreview()"
          (printed)="printPreview()" />
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PaymentsPageComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly pdfExport = inject(PdfExportService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly offices = signal<Office[]>([]);
  readonly bookings = signal<Booking[]>([]);
  readonly payments = signal<Payment[]>([]);
  readonly payableBookings = signal<Booking[]>([]);
  readonly filterOfficeId = signal('');
  readonly filterMethod = signal('');
  readonly searchTerm = signal('');
  readonly showModal = signal(false);
  readonly modalMode = signal<PaymentModalMode>('create');
  readonly activePayment = signal<Payment | null>(null);
  readonly creditNotePayment = signal<Payment | null>(null);
  readonly showCreditNoteModal = signal(false);
  readonly documentPreviewTitle = signal('');
  readonly documentPreviewUrl = signal<SafeResourceUrl | null>(null);
  readonly documentPreviewKind = signal<'receipt' | 'credit-note' | null>(null);
  readonly documentPreviewEntityId = signal('');
  readonly error = signal('');
  readonly submitting = signal(false);
  readonly isAdmin = computed(() => this.auth.user()?.role === 'Admin');
  readonly canManagePayments = computed(() => ['Admin', 'Manager', 'FinanceManager'].includes(this.auth.user()?.role ?? ''));
  readonly form = this.fb.nonNullable.group({
    bookingId: ['', Validators.required],
    amount: [0, [Validators.required, Validators.min(1)]],
    currency: ['USD', Validators.required],
    method: ['Paynow', Validators.required],
    status: ['Processed', Validators.required],
    isDeposit: [true, Validators.required],
    reference: [''],
    fiscalInvoiceNumber: ['']
  });
  readonly creditNoteForm = this.fb.nonNullable.group({
    amount: [0, [Validators.required, Validators.min(1)]],
    currency: ['USD', Validators.required],
    reason: ['', Validators.required]
  });
  readonly bookingOptions = computed(() => {
    const payment = this.activePayment();
    if (this.modalMode() !== 'edit' || !payment) {
      return this.payableBookings();
    }

    const existing = this.bookings().find((booking) => booking.id === payment.bookingId);
    return existing && !this.payableBookings().some((booking) => booking.id === existing.id)
      ? [existing, ...this.payableBookings()]
      : this.payableBookings();
  });
  readonly filteredPayments = computed(() => {
    const officeId = this.filterOfficeId();
    const method = this.filterMethod().toLowerCase();
    const search = this.searchTerm().trim().toLowerCase();

    return this.payments().filter((payment) => {
      const officeMatch = !officeId || payment.officeId === officeId;
      const methodMatch = !method || payment.method.toLowerCase() === method;
      const searchMatch =
        !search ||
        payment.reference.toLowerCase().includes(search) ||
        payment.bookingReference.toLowerCase().includes(search) ||
        payment.officeName.toLowerCase().includes(search);

      return officeMatch && methodMatch && searchMatch;
    });
  });
  readonly visibleTotal = computed(() =>
    this.filteredPayments().reduce((total, payment) => total + payment.totalAmount, 0)
  );

  ngOnInit() {
    this.reload();
  }

  ngOnDestroy() {
    this.revokePreviewUrl();
  }

  reload() {
    forkJoin({
      offices: this.api.getOffices(),
      bookings: this.api.getBookings(),
      payments: this.api.getPayments()
    }).subscribe(({ offices, bookings, payments }) => {
      this.offices.set(offices);
      this.bookings.set(bookings);
      this.payments.set(payments);
      this.payableBookings.set(bookings.filter((booking) => booking.balanceAmount > 0));
      if (!this.form.controls.bookingId.value && bookings.length > 0) {
        const booking = bookings.find((item) => item.balanceAmount > 0) ?? bookings[0];
        this.form.patchValue({ bookingId: booking.id, amount: booking.balanceAmount });
      }
    });
  }

  openCreate() {
    const booking = this.payableBookings()[0];
    this.activePayment.set(null);
    this.modalMode.set('create');
    this.showModal.set(true);
    this.error.set('');
    this.form.reset({
      bookingId: booking?.id ?? '',
      amount: booking?.balanceAmount ?? 0,
      currency: booking?.currency ?? 'USD',
      method: 'Paynow',
      status: 'Processed',
      isDeposit: true,
      reference: '',
      fiscalInvoiceNumber: ''
    });
  }

  openView(payment: Payment) {
    this.activePayment.set(payment);
    this.modalMode.set('view');
    this.showModal.set(true);
  }

  openEdit(payment: Payment) {
    if (!this.isAdmin()) {
      this.error.set('Only administrators can update payments.');
      return;
    }

    this.activePayment.set(payment);
    this.modalMode.set('edit');
    this.showModal.set(true);
    this.error.set('');
    this.form.patchValue({
      bookingId: payment.bookingId,
      amount: payment.amount,
      currency: payment.currency,
      method: payment.method,
      status: payment.status,
      isDeposit: payment.isDeposit,
      reference: payment.reference,
      fiscalInvoiceNumber: payment.fiscalInvoiceNumber ?? ''
    });
  }

  closeModal() {
    this.showModal.set(false);
    this.activePayment.set(null);
    this.error.set('');
  }

  submit() {
    if (this.form.invalid || this.submitting()) {
      return;
    }

    this.submitting.set(true);
    this.error.set('');
    const value = this.form.getRawValue();

    if (this.modalMode() === 'create') {
      this.api
        .createPayment({
          bookingId: value.bookingId,
          amount: Number(value.amount),
          currency: value.currency,
          method: value.method,
          status: value.status,
          isDeposit: value.isDeposit,
          reference: value.reference || null,
          fiscalInvoiceNumber: value.fiscalInvoiceNumber || null
        })
        .subscribe({
          next: (payment) => this.handleSaved(payment),
          error: (response) => this.handleError(response?.error?.error ?? 'Payment capture failed.')
        });
      return;
    }

    const payment = this.activePayment();
    if (!payment) {
      this.handleError('Payment details are missing.');
      return;
    }

    const payload: UpdatePaymentRequest = {
      amount: Number(value.amount),
      currency: value.currency,
      method: value.method,
      status: value.status,
      isDeposit: value.isDeposit,
      reference: value.reference || null,
      fiscalInvoiceNumber: value.fiscalInvoiceNumber || null
    };

    this.api.updatePayment(payment.id, payload).subscribe({
      next: (updatedPayment) => this.handleSaved(updatedPayment),
      error: (response) => this.handleError(response?.error?.error ?? 'Payment update failed.')
    });
  }

  remove(payment: Payment) {
    if (!this.isAdmin()) {
      this.error.set('Only administrators can delete payments.');
      return;
    }

    if (!window.confirm(`Delete payment ${payment.reference}?`)) {
      return;
    }

    this.api.deletePayment(payment.id).subscribe({
      next: () => this.reload(),
      error: (response) => this.error.set(response?.error?.error ?? 'Payment deletion failed.')
    });
  }

  hold(payment: Payment) {
    if (!this.isAdmin()) {
      this.error.set('Only administrators can hold payments.');
      return;
    }

    this.api.holdPayment(payment.id).subscribe({
      next: () => this.reload(),
      error: (response) => this.error.set(response?.error?.error ?? 'Payment could not be held.')
    });
  }

  process(payment: Payment) {
    if (!this.isAdmin()) {
      this.error.set('Only administrators can process payments.');
      return;
    }

    this.api.processPayment(payment.id).subscribe({
      next: () => this.reload(),
      error: (response) => this.error.set(response?.error?.error ?? 'Payment could not be processed.')
    });
  }

  previewReceipt(payment: Payment) {
    this.activePayment.set(payment);
    this.api.getReceipt(payment.id).subscribe({
      next: (document) => this.openPreview(document.documentType, this.pdfExport.previewDocument(document), 'receipt', payment.id),
      error: (response) => this.error.set(response?.error?.error ?? 'Receipt preview failed.')
    });
  }

  openCreditNote(payment: Payment) {
    this.creditNotePayment.set(payment);
    this.showCreditNoteModal.set(true);
    this.creditNoteForm.reset({
      amount: payment.amount,
      currency: payment.currency,
      reason: ''
    });
  }

  closeCreditNoteModal() {
    this.showCreditNoteModal.set(false);
    this.creditNotePayment.set(null);
  }

  submitCreditNote() {
    const payment = this.creditNotePayment();
    if (!payment || this.creditNoteForm.invalid) {
      return;
    }

    const value = this.creditNoteForm.getRawValue();
    this.api.createCreditNote({
      bookingId: payment.bookingId,
      amount: Number(value.amount),
      currency: value.currency,
      reason: value.reason
    }).subscribe({
      next: (creditNote) => {
        this.closeCreditNoteModal();
        this.api.getCreditNoteDocument(creditNote.id).subscribe((document) => {
          this.openPreview(document.documentType, this.pdfExport.previewDocument(document), 'credit-note', creditNote.id);
        });
      },
      error: (response) => this.error.set(response?.error?.error ?? 'Credit note creation failed.')
    });
  }

  printPreview() {
    const kind = this.documentPreviewKind();
    const entityId = this.documentPreviewEntityId();
    if (!kind || !entityId) {
      return;
    }

    if (kind === 'receipt') {
      this.api.getReceipt(entityId).subscribe((document) => this.pdfExport.printDocument(document));
      return;
    }

    this.api.getCreditNoteDocument(entityId).subscribe((document) => this.pdfExport.printDocument(document));
  }

  private handleSaved(payment?: Payment) {
    this.submitting.set(false);
    this.closeModal();
    this.reload();
    if (payment) {
      this.previewReceipt(payment);
    }
  }

  private handleError(message: string) {
    this.submitting.set(false);
    this.error.set(message);
  }

  private openPreview(title: string, url: string, kind: 'receipt' | 'credit-note', entityId: string) {
    this.revokePreviewUrl();
    this.documentPreviewTitle.set(title);
    this.documentPreviewUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
    this.documentPreviewKind.set(kind);
    this.documentPreviewEntityId.set(entityId);
    (this as PaymentsPageComponent & { previewUrl?: string }).previewUrl = url;
  }

  closePreview() {
    this.revokePreviewUrl();
    this.documentPreviewUrl.set(null);
    this.documentPreviewTitle.set('');
    this.documentPreviewKind.set(null);
    this.documentPreviewEntityId.set('');
  }

  private revokePreviewUrl() {
    const value = (this as PaymentsPageComponent & { previewUrl?: string }).previewUrl;
    if (value) {
      URL.revokeObjectURL(value);
      delete (this as PaymentsPageComponent & { previewUrl?: string }).previewUrl;
    }
  }
}
