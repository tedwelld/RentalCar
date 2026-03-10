import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { Customer, UpdateCustomerRequest } from '../core/models';
import { UiIconComponent } from '../shared/ui-icon.component';

type CustomerModalMode = 'create' | 'edit';

@Component({
  selector: 'app-customers-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, UiIconComponent],
  template: `
    <section class="page management-stack">
      <section class="panel management-card">
        <div class="table-title-row">
          <div>
            <p class="eyebrow">Customers</p>
            <h2>Customer administration</h2>
          </div>
          <div class="crud-actions">
            <button type="button" class="button button-warning" (click)="reload()">
              <app-ui-icon name="refresh" [size]="16" />
              <span>Refresh</span>
            </button>
            <button type="button" class="button button-success" (click)="openCreate()">
              <app-ui-icon name="plus" [size]="16" />
              <span>New customer</span>
            </button>
          </div>
        </div>

        <div class="management-strip">
          <label>
            <span>Status</span>
            <select [value]="statusFilter()" (change)="statusFilter.set($any($event.target).value); pageIndex.set(0)">
              <option value="">All customers</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>

          <label>
            <span>Type</span>
            <select [value]="typeFilter()" (change)="typeFilter.set($any($event.target).value); pageIndex.set(0)">
              <option value="">All</option>
              <option value="local">Local</option>
              <option value="international">International</option>
            </select>
          </label>

          <label>
            <span>Search</span>
            <input type="text" [value]="searchTerm()" (input)="searchTerm.set($any($event.target).value); pageIndex.set(0)" placeholder="Name, email, phone, license" />
          </label>
        </div>
      </section>

      <section class="panel management-card">
        <div class="table-title-row">
          <div>
            <p class="eyebrow">Customer register</p>
            <h3>Active and inactive profiles</h3>
          </div>
          <div class="table-meta">
            <div class="table-stat">
              <p class="muted-label">Visible rows</p>
              <strong>{{ filteredCustomers().length }}</strong>
            </div>
            <div class="table-stat">
              <p class="muted-label">Page</p>
              <strong>{{ pageIndex() + 1 }} / {{ totalPages() }}</strong>
            </div>
          </div>
        </div>

        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Actions</th>
                <th>Name</th>
                <th>Contact</th>
                <th>Country</th>
                <th>Type</th>
                <th>Status</th>
                <th>Driver license</th>
              </tr>
            </thead>
            <tbody>
              @for (customer of pagedCustomers(); track customer.id) {
                <tr>
                  <td class="table-action-cell">
                    <div class="row-actions">
                      <button type="button" class="button button-warning button-small" (click)="openEdit(customer)">
                        <app-ui-icon name="edit" [size]="14" />
                        <span>Edit</span>
                      </button>
                      @if (customer.isActive) {
                        <button type="button" class="button button-danger button-small" (click)="disable(customer)">
                          <app-ui-icon name="close" [size]="14" />
                          <span>Disable</span>
                        </button>
                      } @else {
                        <button type="button" class="button button-success button-small" (click)="activate(customer)">
                          <app-ui-icon name="plus" [size]="14" />
                          <span>Activate</span>
                        </button>
                      }
                      <button type="button" class="button button-danger button-small" (click)="remove(customer)">
                        <app-ui-icon name="delete" [size]="14" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </td>
                  <td>{{ customer.firstName }} {{ customer.lastName }}</td>
                  <td>
                    {{ customer.email }}
                    <div class="muted">{{ customer.phone }}</div>
                  </td>
                  <td>{{ customer.country }}</td>
                  <td><span class="chip" [class.status-blue]="!customer.isInternational" [class.status-yellow]="customer.isInternational">{{ customer.isInternational ? 'International' : 'Local' }}</span></td>
                  <td><span class="chip" [class.status-green]="customer.isActive" [class.status-red]="!customer.isActive">{{ customer.isActive ? 'Active' : 'Disabled' }}</span></td>
                  <td>{{ customer.driverLicenseNumber }}</td>
                </tr>
              } @empty {
                <tr><td colspan="7" class="muted">No customers match the current filters.</td></tr>
              }
            </tbody>
          </table>
        </div>

        <div class="table-pagination">
          <button type="button" class="button button-small button-warning" (click)="previousPage()" [disabled]="pageIndex() === 0">Previous</button>
          <button type="button" class="button button-small button-warning" (click)="nextPage()" [disabled]="pageIndex() >= totalPages() - 1">Next</button>
        </div>
      </section>

      @if (showModal()) {
        <div class="modal-backdrop" (click)="closeModal()">
          <section class="panel modal-card management-card" (click)="$event.stopPropagation()">
            <div class="table-title-row">
              <div>
                <p class="eyebrow">Customers</p>
                <h3>{{ modalMode() === 'create' ? 'Create customer' : 'Edit customer' }}</h3>
              </div>
              <button type="button" class="button button-danger" (click)="closeModal()">
                <app-ui-icon name="close" [size]="16" />
                <span>Close</span>
              </button>
            </div>

            <form [formGroup]="form" class="form-grid" (ngSubmit)="submit()">
              <label>
                <span>First name</span>
                <input type="text" formControlName="firstName" />
              </label>
              <label>
                <span>Last name</span>
                <input type="text" formControlName="lastName" />
              </label>
              <label>
                <span>Email</span>
                <input type="email" formControlName="email" />
              </label>
              <label>
                <span>Phone</span>
                <input type="text" formControlName="phone" />
              </label>
              <label>
                <span>National ID</span>
                <input type="text" formControlName="nationalId" />
              </label>
              <label>
                <span>Driver license</span>
                <input type="text" formControlName="driverLicenseNumber" />
              </label>
              <label>
                <span>Country</span>
                <input type="text" formControlName="country" />
              </label>
              <label>
                <span>Customer type</span>
                <select formControlName="isInternational">
                  <option [ngValue]="false">Local</option>
                  <option [ngValue]="true">International</option>
                </select>
              </label>
              @if (modalMode() === 'edit') {
                <label>
                  <span>Status</span>
                  <select formControlName="isActive">
                    <option [ngValue]="true">Active</option>
                    <option [ngValue]="false">Disabled</option>
                  </select>
                </label>
              }

              @if (error()) {
                <p class="form-error" style="grid-column: 1 / -1;">{{ error() }}</p>
              }

              <div class="crud-actions" style="grid-column: 1 / -1;">
                <button type="submit" class="button button-success" [disabled]="form.invalid || submitting()">
                  <app-ui-icon [name]="modalMode() === 'create' ? 'plus' : 'edit'" [size]="16" />
                  <span>{{ submitting() ? 'Saving...' : modalMode() === 'create' ? 'Create customer' : 'Save changes' }}</span>
                </button>
                <button type="button" class="button button-danger" (click)="closeModal()">
                  <app-ui-icon name="close" [size]="16" />
                  <span>Cancel</span>
                </button>
              </div>
            </form>
          </section>
        </div>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustomersPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);

  readonly customers = signal<Customer[]>([]);
  readonly searchTerm = signal('');
  readonly statusFilter = signal('');
  readonly typeFilter = signal('');
  readonly pageIndex = signal(0);
  readonly pageSize = 10;
  readonly showModal = signal(false);
  readonly modalMode = signal<CustomerModalMode>('create');
  readonly activeCustomer = signal<Customer | null>(null);
  readonly error = signal('');
  readonly submitting = signal(false);
  readonly form = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', Validators.required],
    nationalId: ['', Validators.required],
    driverLicenseNumber: ['', Validators.required],
    country: ['Zimbabwe', Validators.required],
    isInternational: [false, Validators.required],
    isActive: [true, Validators.required]
  });

  readonly filteredCustomers = computed(() => {
    const search = this.searchTerm().trim().toLowerCase();
    const status = this.statusFilter();
    const type = this.typeFilter();

    return this.customers().filter((customer) => {
      const statusMatch = !status || (status === 'active' ? customer.isActive : !customer.isActive);
      const typeMatch =
        !type || (type === 'international' ? customer.isInternational : !customer.isInternational);
      const searchMatch =
        !search ||
        `${customer.firstName} ${customer.lastName}`.toLowerCase().includes(search) ||
        customer.email.toLowerCase().includes(search) ||
        customer.phone.toLowerCase().includes(search) ||
        customer.driverLicenseNumber.toLowerCase().includes(search);

      return statusMatch && typeMatch && searchMatch;
    });
  });
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredCustomers().length / this.pageSize)));
  readonly pagedCustomers = computed(() => {
    const start = this.pageIndex() * this.pageSize;
    return this.filteredCustomers().slice(start, start + this.pageSize);
  });

  ngOnInit() {
    this.reload();
  }

  reload() {
    this.api.getCustomers().subscribe((customers) => this.customers.set(customers));
  }

  openCreate() {
    this.modalMode.set('create');
    this.activeCustomer.set(null);
    this.error.set('');
    this.showModal.set(true);
    this.form.reset({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      nationalId: '',
      driverLicenseNumber: '',
      country: 'Zimbabwe',
      isInternational: false,
      isActive: true
    });
  }

  openEdit(customer: Customer) {
    this.modalMode.set('edit');
    this.activeCustomer.set(customer);
    this.error.set('');
    this.showModal.set(true);
    this.form.patchValue({
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone,
      nationalId: customer.nationalId,
      driverLicenseNumber: customer.driverLicenseNumber,
      country: customer.country,
      isInternational: customer.isInternational,
      isActive: customer.isActive
    });
  }

  closeModal() {
    this.showModal.set(false);
    this.activeCustomer.set(null);
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
      this.api.createCustomer(value).subscribe({
        next: () => this.handleSaved(),
        error: (response) => this.handleError(response?.error?.error ?? 'Customer creation failed.')
      });
      return;
    }

    const customer = this.activeCustomer();
    if (!customer) {
      this.handleError('Customer details are missing.');
      return;
    }

    const payload: UpdateCustomerRequest = value;
    this.api.updateCustomer(customer.id, payload).subscribe({
      next: () => this.handleSaved(),
      error: (response) => this.handleError(response?.error?.error ?? 'Customer update failed.')
    });
  }

  activate(customer: Customer) {
    this.api.activateCustomer(customer.id).subscribe(() => this.reload());
  }

  disable(customer: Customer) {
    this.api.disableCustomer(customer.id).subscribe(() => this.reload());
  }

  remove(customer: Customer) {
    if (!window.confirm(`Delete customer ${customer.firstName} ${customer.lastName}?`)) {
      return;
    }

    this.api.deleteCustomer(customer.id).subscribe({
      next: () => this.reload(),
      error: (response) => this.error.set(response?.error?.error ?? 'Customer deletion failed.')
    });
  }

  previousPage() {
    if (this.pageIndex() > 0) {
      this.pageIndex.update((value) => value - 1);
    }
  }

  nextPage() {
    if (this.pageIndex() < this.totalPages() - 1) {
      this.pageIndex.update((value) => value + 1);
    }
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
}
