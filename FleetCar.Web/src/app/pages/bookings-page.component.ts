import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ApiService } from '../core/api.service';
import { PdfExportService } from '../core/pdf-export.service';
import { Agent, Booking, Car, Customer, Office, UpdateBookingRequest } from '../core/models';
import { DocumentPreviewComponent } from '../shared/document-preview.component';
import { UiIconComponent } from '../shared/ui-icon.component';

type BookingModalMode = 'create' | 'edit' | 'view';

@Component({
  selector: 'app-bookings-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, UiIconComponent, DocumentPreviewComponent],
  template: `
    <section class="page management-stack">
      <section class="panel management-card">
        <div class="table-title-row">
          <div>
            <p class="eyebrow">Reservations</p>
            <h2>Manage bookings</h2>
          </div>
          <div class="crud-actions">
            <button type="button" class="button button-warning" (click)="reload()">
              <app-ui-icon name="refresh" [size]="16" />
              <span>Refresh</span>
            </button>
            <button type="button" class="button button-success" (click)="openCreate()">
              <app-ui-icon name="plus" [size]="16" />
              <span>New booking</span>
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
            <span>Status</span>
            <select [value]="filterStatus()" (change)="filterStatus.set($any($event.target).value)">
              <option value="">All statuses</option>
              <option value="Pending">Pending</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Active">Active</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </label>

          <label>
            <span>Search</span>
            <input type="text" [value]="searchTerm()" (input)="searchTerm.set($any($event.target).value)" placeholder="Reference, customer, vehicle" />
          </label>
        </div>
      </section>

      <section class="panel management-card">
        <div class="table-title-row">
          <div>
            <p class="eyebrow">Booking register</p>
            <h3>Current reservations</h3>
          </div>
          <div class="table-meta">
            <div class="table-stat">
              <p class="muted-label">Visible rows</p>
              <strong>{{ filteredBookings().length }}</strong>
            </div>
            <div class="table-stat">
              <p class="muted-label">Outstanding</p>
              <strong>{{ outstandingTotal() | currency: 'USD' }}</strong>
            </div>
          </div>
        </div>

        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Actions</th>
                <th>Reference</th>
                <th>Customer</th>
                <th>Vehicle</th>
                <th>Channel</th>
                <th>Window</th>
                <th>Status</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              @for (booking of filteredBookings(); track booking.id) {
                <tr>
                  <td class="table-action-cell">
                    <div class="row-actions">
                      <button type="button" class="button button-info button-small" (click)="openView(booking)">
                        <app-ui-icon name="view" [size]="14" />
                        <span>View</span>
                      </button>
                      <button type="button" class="button button-info button-small" (click)="previewQuotation(booking)">
                        <app-ui-icon name="document" [size]="14" />
                        <span>Quotation</span>
                      </button>
                      <button type="button" class="button button-warning button-small" (click)="openEdit(booking)">
                        <app-ui-icon name="edit" [size]="14" />
                        <span>Edit</span>
                      </button>
                      <button type="button" class="button button-danger button-small" (click)="remove(booking)">
                        <app-ui-icon name="delete" [size]="14" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </td>
                  <td>{{ booking.reference }}<div class="muted">{{ booking.officeName }}</div></td>
                  <td>{{ booking.customerName }}</td>
                  <td>{{ booking.carDisplayName }}</td>
                  <td>{{ booking.channel }}</td>
                  <td>{{ booking.pickupDateUtc | date: 'mediumDate' }} - {{ booking.returnDateUtc | date: 'mediumDate' }}</td>
                  <td><span class="chip" [class.status-blue]="booking.status === 'Confirmed' || booking.status === 'Pending'" [class.status-green]="booking.status === 'Completed' || booking.status === 'Active'" [class.status-red]="booking.status === 'Cancelled'">{{ booking.status }}</span></td>
                  <td>{{ booking.balanceAmount | currency: booking.currency }}</td>
                </tr>
              } @empty {
                <tr><td colspan="8" class="muted">No bookings found for the current filters.</td></tr>
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
                <p class="eyebrow">Bookings</p>
                <h3>{{ modalMode() === 'create' ? 'Create booking' : modalMode() === 'edit' ? 'Edit booking' : 'Booking details' }}</h3>
              </div>
              <button type="button" class="button button-danger" (click)="closeModal()">
                <app-ui-icon name="close" [size]="16" />
                <span>Close</span>
              </button>
            </div>

            @if (modalMode() === 'view' && activeBooking()) {
              <div class="detail-grid">
                <div class="detail-item"><span class="muted-label">Reference</span><strong>{{ activeBooking()!.reference }}</strong></div>
                <div class="detail-item"><span class="muted-label">Office</span><strong>{{ activeBooking()!.officeName }}</strong></div>
                <div class="detail-item"><span class="muted-label">Customer</span><strong>{{ activeBooking()!.customerName }}</strong></div>
                <div class="detail-item"><span class="muted-label">Vehicle</span><strong>{{ activeBooking()!.carDisplayName }}</strong></div>
                <div class="detail-item"><span class="muted-label">Channel</span><strong>{{ activeBooking()!.channel }}</strong></div>
                <div class="detail-item"><span class="muted-label">Status</span><strong>{{ activeBooking()!.status }}</strong></div>
                <div class="detail-item"><span class="muted-label">Pickup</span><strong>{{ activeBooking()!.pickupLocationName }}</strong></div>
                <div class="detail-item"><span class="muted-label">Return</span><strong>{{ activeBooking()!.returnLocationName }}</strong></div>
                <div class="detail-item"><span class="muted-label">Window</span><strong>{{ activeBooking()!.pickupDateUtc | date: 'medium' }}</strong></div>
                <div class="detail-item"><span class="muted-label">Due back</span><strong>{{ activeBooking()!.returnDateUtc | date: 'medium' }}</strong></div>
                <div class="detail-item"><span class="muted-label">Total</span><strong>{{ activeBooking()!.totalAmount | currency: activeBooking()!.currency }}</strong></div>
                <div class="detail-item"><span class="muted-label">Balance</span><strong>{{ activeBooking()!.balanceAmount | currency: activeBooking()!.currency }}</strong></div>
                <div class="detail-item"><span class="muted-label">Created by</span><strong>{{ activeBooking()!.createdByUsername }}</strong></div>
                <div class="crud-actions" style="grid-column: 1 / -1;">
                  <button type="button" class="button button-info" (click)="previewQuotation(activeBooking()!)">
                    <app-ui-icon name="print" [size]="16" />
                    <span>Preview quotation</span>
                  </button>
                </div>
              </div>
            } @else {
              <form [formGroup]="form" class="form-grid" (ngSubmit)="submit()">
                <label>
                  <span>Office</span>
                  <select formControlName="officeId">
                    @for (office of offices(); track office.id) {
                      <option [value]="office.id">{{ office.name }}</option>
                    }
                  </select>
                </label>

                <label>
                  <span>Status</span>
                  <select formControlName="status">
                    <option value="Pending">Pending</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Active">Active</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </label>

                <label>
                  <span>Channel</span>
                  <select formControlName="channel">
                    <option value="Online">Online</option>
                    <option value="Counter">Counter</option>
                    <option value="Agent">Agent</option>
                  </select>
                </label>

                <label>
                  <span>Customer</span>
                  <select formControlName="customerId">
                    @for (customer of activeCustomers(); track customer.id) {
                      <option [value]="customer.id">{{ customer.firstName }} {{ customer.lastName }} - {{ customer.country }}</option>
                    }
                  </select>
                </label>

                <label>
                  <span>Agent</span>
                  <select formControlName="agentId">
                    <option value="">Direct booking</option>
                    @for (agent of officeAgents(); track agent.id) {
                      <option [value]="agent.id">{{ agent.companyName }}</option>
                    }
                  </select>
                </label>

                <label>
                  <span>Vehicle</span>
                  <select formControlName="carId">
                    @for (car of cars(); track car.id) {
                      <option [value]="car.id">{{ car.make }} {{ car.model }} - {{ car.registrationNumber }}</option>
                    }
                  </select>
                </label>

                <label>
                  <span>Pickup location</span>
                  <select formControlName="pickupLocationId">
                    @for (location of selectedLocations(); track location.id) {
                      <option [value]="location.id">{{ location.name }}</option>
                    }
                  </select>
                </label>

                <label>
                  <span>Return location</span>
                  <select formControlName="returnLocationId">
                    @for (location of selectedLocations(); track location.id) {
                      <option [value]="location.id">{{ location.name }}</option>
                    }
                  </select>
                </label>

                <label>
                  <span>Pickup date</span>
                  <input type="datetime-local" formControlName="pickupDateUtc" />
                </label>

                <label>
                  <span>Return date</span>
                  <input type="datetime-local" formControlName="returnDateUtc" />
                </label>

                <label>
                  <span>Flight number</span>
                  <input type="text" formControlName="flightNumber" placeholder="Optional airport reference" />
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
                  <span>Notes</span>
                  <textarea formControlName="notes" placeholder="Driver notes, pickup detail, partner information"></textarea>
                </label>

                <div style="grid-column: 1 / -1;" class="panel panel-accent">
                  <p class="muted-label">Optional extras</p>
                  <div class="management-strip">
                    <label><input type="checkbox" formControlName="gps" /> GPS ($15)</label>
                    <label><input type="checkbox" formControlName="childSeat" /> Child seat ($15)</label>
                    <label><input type="checkbox" formControlName="insurance" /> Additional insurance ($25)</label>
                    <label><input type="checkbox" formControlName="extraDriver" /> Extra driver ($20)</label>
                  </div>
                </div>

                @if (error()) {
                  <p class="form-error" style="grid-column: 1 / -1;">{{ error() }}</p>
                }

                <div class="crud-actions" style="grid-column: 1 / -1;">
                  <button type="submit" class="button button-success" [disabled]="form.invalid || submitting()">
                    <app-ui-icon [name]="modalMode() === 'create' ? 'plus' : 'edit'" [size]="16" />
                    <span>{{ submitting() ? 'Saving...' : modalMode() === 'create' ? 'Create booking' : 'Save changes' }}</span>
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
export class BookingsPageComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly pdfExport = inject(PdfExportService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly offices = signal<Office[]>([]);
  readonly customers = signal<Customer[]>([]);
  readonly agents = signal<Agent[]>([]);
  readonly cars = signal<Car[]>([]);
  readonly bookings = signal<Booking[]>([]);
  readonly filterOfficeId = signal('');
  readonly filterStatus = signal('');
  readonly searchTerm = signal('');
  readonly showModal = signal(false);
  readonly modalMode = signal<BookingModalMode>('create');
  readonly activeBooking = signal<Booking | null>(null);
  readonly documentPreviewTitle = signal('');
  readonly documentPreviewUrl = signal<SafeResourceUrl | null>(null);
  readonly error = signal('');
  readonly submitting = signal(false);
  readonly form = this.fb.nonNullable.group({
    officeId: ['', Validators.required],
    pickupLocationId: ['', Validators.required],
    returnLocationId: ['', Validators.required],
    carId: ['', Validators.required],
    customerId: ['', Validators.required],
    agentId: [''],
    channel: ['Counter', Validators.required],
    status: ['Confirmed', Validators.required],
    pickupDateUtc: [this.toDateTimeLocal(new Date(Date.now() + 24 * 60 * 60 * 1000)), Validators.required],
    returnDateUtc: [this.toDateTimeLocal(new Date(Date.now() + 4 * 24 * 60 * 60 * 1000)), Validators.required],
    currency: ['USD', Validators.required],
    flightNumber: [''],
    notes: [''],
    gps: [false],
    childSeat: [false],
    insurance: [false],
    extraDriver: [false]
  });
  readonly selectedLocations = computed(
    () => this.offices().find((office) => office.id === this.form.controls.officeId.value)?.locations ?? []
  );
  readonly activeCustomers = computed(() => this.customers().filter((customer) => customer.isActive));
  readonly officeAgents = computed(() => {
    const officeId = this.form.controls.officeId.value;
    return officeId ? this.agents().filter((agent) => agent.preferredOfficeId === officeId) : this.agents();
  });
  readonly filteredBookings = computed(() => {
    const officeId = this.filterOfficeId();
    const status = this.filterStatus().toLowerCase();
    const search = this.searchTerm().trim().toLowerCase();

    return this.bookings().filter((booking) => {
      const officeMatch = !officeId || booking.officeId === officeId;
      const statusMatch = !status || booking.status.toLowerCase() === status;
      const searchMatch =
        !search ||
        booking.reference.toLowerCase().includes(search) ||
        booking.customerName.toLowerCase().includes(search) ||
        booking.carDisplayName.toLowerCase().includes(search) ||
        booking.officeName.toLowerCase().includes(search);

      return officeMatch && statusMatch && searchMatch;
    });
  });
  readonly outstandingTotal = computed(() =>
    this.filteredBookings().reduce((total, booking) => total + booking.balanceAmount, 0)
  );

  ngOnInit() {
    this.form.controls.officeId.valueChanges.subscribe((officeId) => this.hydrateOfficeState(officeId));
    this.reload();
  }

  ngOnDestroy() {
    this.revokePreviewUrl();
  }

  reload() {
    forkJoin({
      offices: this.api.getOffices(),
      customers: this.api.getCustomers(),
      agents: this.api.getAgents(),
      bookings: this.api.getBookings()
    }).subscribe(({ offices, customers, agents, bookings }) => {
      this.offices.set(offices);
      this.customers.set(customers);
      this.agents.set(agents);
      this.bookings.set(bookings);

      if (!this.form.controls.officeId.value && offices.length > 0) {
        this.form.patchValue({ officeId: offices[0].id });
      }
    });
  }

  openCreate() {
    const defaultOfficeId = this.filterOfficeId() || this.offices()[0]?.id || '';
    this.activeBooking.set(null);
    this.modalMode.set('create');
    this.showModal.set(true);
    this.error.set('');
    this.form.reset({
      officeId: defaultOfficeId,
      pickupLocationId: '',
      returnLocationId: '',
      carId: '',
      customerId: this.activeCustomers()[0]?.id ?? '',
      agentId: '',
      channel: 'Counter',
      status: 'Confirmed',
      pickupDateUtc: this.toDateTimeLocal(new Date(Date.now() + 24 * 60 * 60 * 1000)),
      returnDateUtc: this.toDateTimeLocal(new Date(Date.now() + 4 * 24 * 60 * 60 * 1000)),
      currency: 'USD',
      flightNumber: '',
      notes: '',
      gps: false,
      childSeat: false,
      insurance: false,
      extraDriver: false
    });
  }

  openView(booking: Booking) {
    this.activeBooking.set(booking);
    this.modalMode.set('view');
    this.showModal.set(true);
    this.error.set('');
  }

  openEdit(booking: Booking) {
    this.activeBooking.set(booking);
    this.modalMode.set('edit');
    this.showModal.set(true);
    this.error.set('');
    this.form.patchValue({
      officeId: booking.officeId,
      pickupLocationId: booking.pickupLocationId,
      returnLocationId: booking.returnLocationId,
      carId: booking.carId,
      customerId: booking.customerId,
      agentId: booking.agentId ?? '',
      channel: booking.channel,
      status: booking.status,
      pickupDateUtc: this.toDateTimeLocal(new Date(booking.pickupDateUtc)),
      returnDateUtc: this.toDateTimeLocal(new Date(booking.returnDateUtc)),
      currency: booking.currency,
      flightNumber: booking.flightNumber ?? '',
      notes: '',
      gps: booking.extras.some((item) => item.name === 'GPS'),
      childSeat: booking.extras.some((item) => item.name.toLowerCase().includes('child')),
      insurance: booking.extras.some((item) => item.name.toLowerCase().includes('insurance')),
      extraDriver: booking.extras.some((item) => item.name.toLowerCase().includes('driver'))
    });
    this.loadCars(booking.officeId, booking.carId);
  }

  closeModal() {
    this.showModal.set(false);
    this.error.set('');
    this.activeBooking.set(null);
  }

  submit() {
    if (this.form.invalid || this.submitting()) {
      return;
    }

    this.submitting.set(true);
    this.error.set('');
    const value = this.form.getRawValue();
    const extras = [
      value.gps ? { name: 'GPS', price: 15 } : null,
      value.childSeat ? { name: 'Child Seat', price: 15 } : null,
      value.insurance ? { name: 'Additional Insurance', price: 25 } : null,
      value.extraDriver ? { name: 'Extra Driver', price: 20 } : null
    ].filter((item): item is { name: string; price: number } => item !== null);

    if (this.modalMode() === 'create') {
      this.api
        .createBooking({
          officeId: value.officeId,
          pickupLocationId: value.pickupLocationId,
          returnLocationId: value.returnLocationId,
          carId: value.carId,
          customerId: value.customerId,
          agentId: value.agentId || null,
          channel: value.channel,
          pickupDateUtc: new Date(value.pickupDateUtc).toISOString(),
          returnDateUtc: new Date(value.returnDateUtc).toISOString(),
          currency: value.currency,
          flightNumber: value.flightNumber || null,
          notes: value.notes || null,
          extras
        })
        .subscribe({
          next: () => this.handleSaved(),
          error: (response) => this.handleError(response?.error?.error ?? 'Booking creation failed.')
        });
      return;
    }

    const booking = this.activeBooking();
    if (!booking) {
      this.handleError('Booking details are missing.');
      return;
    }

    const payload: UpdateBookingRequest = {
      officeId: value.officeId,
      pickupLocationId: value.pickupLocationId,
      returnLocationId: value.returnLocationId,
      carId: value.carId,
      customerId: value.customerId,
      agentId: value.agentId || null,
      channel: value.channel,
      status: value.status,
      pickupDateUtc: new Date(value.pickupDateUtc).toISOString(),
      returnDateUtc: new Date(value.returnDateUtc).toISOString(),
      currency: value.currency,
      flightNumber: value.flightNumber || null,
      notes: value.notes || null,
      extras
    };

    this.api.updateBooking(booking.id, payload).subscribe({
      next: () => this.handleSaved(),
      error: (response) => this.handleError(response?.error?.error ?? 'Booking update failed.')
    });
  }

  remove(booking: Booking) {
    if (!window.confirm(`Delete booking ${booking.reference}?`)) {
      return;
    }

    this.api.deleteBooking(booking.id).subscribe({
      next: () => this.reload(),
      error: (response) => this.error.set(response?.error?.error ?? 'Booking deletion failed.')
    });
  }

  private hydrateOfficeState(officeId: string) {
    const office = this.offices().find((item) => item.id === officeId);
    if (!office) {
      return;
    }

    const firstLocation = office.locations[0];
    this.form.patchValue({
      pickupLocationId: this.form.controls.pickupLocationId.value || firstLocation?.id || '',
      returnLocationId: this.form.controls.returnLocationId.value || firstLocation?.id || ''
    });
    this.loadCars(officeId, this.form.controls.carId.value);
  }

  private loadCars(officeId: string, selectedCarId?: string) {
    this.api.getCars(officeId).subscribe((cars) => {
      const availableCars = cars.filter((car) => car.status !== 'Maintenance' || car.id === selectedCarId);
      this.cars.set(availableCars);
      const chosenCarId = availableCars.some((car) => car.id === selectedCarId) ? selectedCarId : availableCars[0]?.id;
      if (chosenCarId) {
        this.form.patchValue({ carId: chosenCarId });
      }
    });
  }

  previewQuotation(booking: Booking) {
    this.activeBooking.set(booking);
    this.api.getQuotation(booking.id).subscribe({
      next: (document) => this.openPreview(document.documentType, this.pdfExport.previewDocument(document)),
      error: (response) => this.error.set(response?.error?.error ?? 'Quotation preview failed.')
    });
  }

  printPreview() {
    const activeBooking = this.activeBooking();
    if (!activeBooking) {
      return;
    }

    this.api.getQuotation(activeBooking.id).subscribe((document) => {
      this.pdfExport.printDocument(document);
    });
  }

  private handleSaved() {
    this.submitting.set(false);
    this.closeModal();
    this.reload();
  }

  private handleError(message: string) {
    this.submitting.set(false);
    this.error.set(message);
  }

  private toDateTimeLocal(value: Date) {
    return new Date(value.getTime() - value.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }

  private openPreview(title: string, url: string) {
    this.revokePreviewUrl();
    this.documentPreviewTitle.set(title);
    this.documentPreviewUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
    (this as BookingsPageComponent & { previewUrl?: string }).previewUrl = url;
  }

  closePreview() {
    this.revokePreviewUrl();
    this.documentPreviewUrl.set(null);
    this.documentPreviewTitle.set('');
  }

  private revokePreviewUrl() {
    const value = (this as BookingsPageComponent & { previewUrl?: string }).previewUrl;
    if (value) {
      URL.revokeObjectURL(value);
      delete (this as BookingsPageComponent & { previewUrl?: string }).previewUrl;
    }
  }
}
