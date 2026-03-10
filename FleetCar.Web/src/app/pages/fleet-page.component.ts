import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { Car, CreateCarRequest, Office, UpdateCarRequest } from '../core/models';
import { UiIconComponent } from '../shared/ui-icon.component';

type FleetModalMode = 'create' | 'edit' | 'view';

@Component({
  selector: 'app-fleet-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, UiIconComponent],
  template: `
    <section class="page management-stack">
      <section class="panel management-card">
        <div class="table-title-row">
          <div>
            <p class="eyebrow">Fleet</p>
            <h2>Vehicle inventory and compliance</h2>
          </div>
          <div class="crud-actions">
            <button type="button" class="button button-warning" (click)="reload()">
              <app-ui-icon name="refresh" [size]="16" />
              <span>Refresh</span>
            </button>
            <button type="button" class="button button-success" (click)="openCreate()">
              <app-ui-icon name="plus" [size]="16" />
              <span>Add vehicle</span>
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
              <option value="Available">Available</option>
              <option value="Reserved">Reserved</option>
              <option value="Rented">Rented</option>
              <option value="Maintenance">Maintenance</option>
            </select>
          </label>

          <label>
            <span>Search</span>
            <input type="text" [value]="searchTerm()" (input)="searchTerm.set($any($event.target).value)" placeholder="Registration, make, model" />
          </label>
        </div>
      </section>

      <section class="panel management-card">
        <div class="table-title-row">
          <div>
            <p class="eyebrow">Fleet register</p>
            <h3>Vehicles by office</h3>
          </div>
          <div class="table-meta">
            <div class="table-stat">
              <p class="muted-label">Visible fleet</p>
              <strong>{{ filteredCars().length }}</strong>
            </div>
            <div class="table-stat">
              <p class="muted-label">Available</p>
              <strong>{{ availableCount() }}</strong>
            </div>
          </div>
        </div>

        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Actions</th>
                <th>Vehicle</th>
                <th>Office</th>
                <th>Status</th>
                <th>Fuel</th>
                <th>Mileage</th>
                <th>Daily rate</th>
                <th>Insurance</th>
              </tr>
            </thead>
            <tbody>
              @for (car of filteredCars(); track car.id) {
                <tr>
                  <td class="table-action-cell">
                    <div class="row-actions">
                      <button type="button" class="button button-info button-small" (click)="openView(car)">
                        <app-ui-icon name="view" [size]="14" />
                        <span>View</span>
                      </button>
                      <button type="button" class="button button-warning button-small" (click)="openEdit(car)">
                        <app-ui-icon name="edit" [size]="14" />
                        <span>Edit</span>
                      </button>
                      <button type="button" class="button button-danger button-small" (click)="remove(car)">
                        <app-ui-icon name="delete" [size]="14" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </td>
                  <td><strong>{{ car.make }} {{ car.model }}</strong><div class="muted">{{ car.registrationNumber }} - {{ car.category }}</div></td>
                  <td>{{ car.officeName }}<div class="muted">{{ car.currentLocationName }}</div></td>
                  <td><span class="chip" [class.status-green]="car.status === 'Available'" [class.status-blue]="car.status === 'Reserved' || car.status === 'Rented'" [class.status-yellow]="car.status === 'Maintenance'">{{ car.status }}</span></td>
                  <td>{{ car.fuelLevelPercent }}%</td>
                  <td>{{ car.mileageKm | number }} km</td>
                  <td>{{ car.dailyRate | currency: 'USD' }}</td>
                  <td>{{ car.insuranceExpiryDateUtc | date: 'mediumDate' }}</td>
                </tr>
              } @empty {
                <tr><td colspan="8" class="muted">No vehicles found for the current filters.</td></tr>
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
                <p class="eyebrow">Fleet</p>
                <h3>{{ modalMode() === 'create' ? 'Add vehicle' : modalMode() === 'edit' ? 'Edit vehicle' : 'Vehicle details' }}</h3>
              </div>
              <button type="button" class="button button-danger" (click)="closeModal()">
                <app-ui-icon name="close" [size]="16" />
                <span>Close</span>
              </button>
            </div>

            @if (modalMode() === 'view' && activeCar()) {
              <div class="detail-grid">
                <div class="detail-item"><span class="muted-label">Registration</span><strong>{{ activeCar()!.registrationNumber }}</strong></div>
                <div class="detail-item"><span class="muted-label">Vehicle</span><strong>{{ activeCar()!.make }} {{ activeCar()!.model }}</strong></div>
                <div class="detail-item"><span class="muted-label">Office</span><strong>{{ activeCar()!.officeName }}</strong></div>
                <div class="detail-item"><span class="muted-label">Location</span><strong>{{ activeCar()!.currentLocationName }}</strong></div>
                <div class="detail-item"><span class="muted-label">Status</span><strong>{{ activeCar()!.status }}</strong></div>
                <div class="detail-item"><span class="muted-label">Rate</span><strong>{{ activeCar()!.dailyRate | currency: 'USD' }}</strong></div>
                <div class="detail-item"><span class="muted-label">Fuel</span><strong>{{ activeCar()!.fuelLevelPercent }}%</strong></div>
                <div class="detail-item"><span class="muted-label">Mileage</span><strong>{{ activeCar()!.mileageKm | number }} km</strong></div>
                <div class="detail-item"><span class="muted-label">Transmission</span><strong>{{ activeCar()!.transmission }}</strong></div>
                <div class="detail-item"><span class="muted-label">Seats</span><strong>{{ activeCar()!.seats }}</strong></div>
                <div class="detail-item"><span class="muted-label">Insurance</span><strong>{{ activeCar()!.insuranceExpiryDateUtc | date: 'mediumDate' }}</strong></div>
                <div class="detail-item"><span class="muted-label">Registration expiry</span><strong>{{ activeCar()!.registrationExpiryDateUtc | date: 'mediumDate' }}</strong></div>
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
                  <span>Location</span>
                  <select formControlName="currentLocationId">
                    @for (location of selectedLocations(); track location.id) {
                      <option [value]="location.id">{{ location.name }}</option>
                    }
                  </select>
                </label>

                <label>
                  <span>Status</span>
                  <select formControlName="status">
                    <option value="Available">Available</option>
                    <option value="Reserved">Reserved</option>
                    <option value="Rented">Rented</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </label>

                <label>
                  <span>Registration</span>
                  <input type="text" formControlName="registrationNumber" />
                </label>

                <label>
                  <span>Make</span>
                  <input type="text" formControlName="make" />
                </label>

                <label>
                  <span>Model</span>
                  <input type="text" formControlName="model" />
                </label>

                <label>
                  <span>Category</span>
                  <input type="text" formControlName="category" />
                </label>

                <label>
                  <span>Year</span>
                  <input type="number" min="2000" step="1" formControlName="year" />
                </label>

                <label>
                  <span>Daily rate</span>
                  <input type="number" min="1" step="0.01" formControlName="dailyRate" />
                </label>

                <label>
                  <span>Fuel level</span>
                  <input type="number" min="0" max="100" step="1" formControlName="fuelLevelPercent" />
                </label>

                <label>
                  <span>Mileage</span>
                  <input type="number" min="0" step="1" formControlName="mileageKm" />
                </label>

                <label>
                  <span>Transmission</span>
                  <input type="text" formControlName="transmission" />
                </label>

                <label>
                  <span>Seats</span>
                  <input type="number" min="2" step="1" formControlName="seats" />
                </label>

                <label>
                  <span>Color</span>
                  <input type="text" formControlName="color" />
                </label>

                <label>
                  <span>Insurance expiry</span>
                  <input type="date" formControlName="insuranceExpiryDateUtc" />
                </label>

                <label>
                  <span>Registration expiry</span>
                  <input type="date" formControlName="registrationExpiryDateUtc" />
                </label>

                @if (error()) {
                  <p class="form-error" style="grid-column: 1 / -1;">{{ error() }}</p>
                }

                <div class="crud-actions" style="grid-column: 1 / -1;">
                  <button type="submit" class="button button-success" [disabled]="form.invalid || submitting()">
                    <app-ui-icon [name]="modalMode() === 'create' ? 'plus' : 'edit'" [size]="16" />
                    <span>{{ submitting() ? 'Saving...' : modalMode() === 'create' ? 'Add vehicle' : 'Save changes' }}</span>
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
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FleetPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);

  readonly offices = signal<Office[]>([]);
  readonly cars = signal<Car[]>([]);
  readonly filterOfficeId = signal('');
  readonly filterStatus = signal('');
  readonly searchTerm = signal('');
  readonly showModal = signal(false);
  readonly modalMode = signal<FleetModalMode>('create');
  readonly activeCar = signal<Car | null>(null);
  readonly error = signal('');
  readonly submitting = signal(false);
  readonly form = this.fb.nonNullable.group({
    officeId: ['', Validators.required],
    currentLocationId: ['', Validators.required],
    registrationNumber: ['', Validators.required],
    make: ['', Validators.required],
    model: ['', Validators.required],
    category: ['', Validators.required],
    year: [2024, [Validators.required, Validators.min(2000)]],
    dailyRate: [50, [Validators.required, Validators.min(1)]],
    status: ['Available', Validators.required],
    fuelLevelPercent: [100, [Validators.required, Validators.min(0), Validators.max(100)]],
    mileageKm: [0, [Validators.required, Validators.min(0)]],
    insuranceExpiryDateUtc: [this.toDateInput(new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)), Validators.required],
    registrationExpiryDateUtc: [this.toDateInput(new Date(Date.now() + 240 * 24 * 60 * 60 * 1000)), Validators.required],
    transmission: ['Automatic', Validators.required],
    seats: [5, [Validators.required, Validators.min(2)]],
    color: ['White', Validators.required]
  });
  readonly selectedLocations = computed(
    () => this.offices().find((office) => office.id === this.form.controls.officeId.value)?.locations ?? []
  );
  readonly filteredCars = computed(() => {
    const officeId = this.filterOfficeId();
    const status = this.filterStatus().toLowerCase();
    const search = this.searchTerm().trim().toLowerCase();

    return this.cars().filter((car) => {
      const officeMatch = !officeId || car.officeId === officeId;
      const statusMatch = !status || car.status.toLowerCase() === status;
      const searchMatch =
        !search ||
        car.registrationNumber.toLowerCase().includes(search) ||
        car.make.toLowerCase().includes(search) ||
        car.model.toLowerCase().includes(search) ||
        car.category.toLowerCase().includes(search);

      return officeMatch && statusMatch && searchMatch;
    });
  });
  readonly availableCount = computed(() =>
    this.filteredCars().filter((car) => car.status === 'Available').length
  );

  ngOnInit() {
    this.form.controls.officeId.valueChanges.subscribe((officeId) => {
      const office = this.offices().find((item) => item.id === officeId);
      const locationId = office?.locations[0]?.id ?? '';
      if (locationId && !this.form.controls.currentLocationId.value) {
        this.form.patchValue({ currentLocationId: locationId });
      }
    });
    this.reload();
  }

  reload() {
    this.api.getOffices().subscribe((offices) => {
      this.offices.set(offices);
      this.api.getCars().subscribe((cars) => this.cars.set(cars));
      if (!this.form.controls.officeId.value && offices.length > 0) {
        this.form.patchValue({
          officeId: offices[0].id,
          currentLocationId: offices[0].locations[0]?.id ?? ''
        });
      }
    });
  }

  openCreate() {
    const office = this.offices()[0];
    this.activeCar.set(null);
    this.modalMode.set('create');
    this.showModal.set(true);
    this.error.set('');
    this.form.reset({
      officeId: this.filterOfficeId() || office?.id || '',
      currentLocationId: office?.locations[0]?.id || '',
      registrationNumber: '',
      make: '',
      model: '',
      category: '',
      year: 2024,
      dailyRate: 50,
      status: 'Available',
      fuelLevelPercent: 100,
      mileageKm: 0,
      insuranceExpiryDateUtc: this.toDateInput(new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)),
      registrationExpiryDateUtc: this.toDateInput(new Date(Date.now() + 240 * 24 * 60 * 60 * 1000)),
      transmission: 'Automatic',
      seats: 5,
      color: 'White'
    });
  }

  openView(car: Car) {
    this.activeCar.set(car);
    this.modalMode.set('view');
    this.showModal.set(true);
  }

  openEdit(car: Car) {
    this.activeCar.set(car);
    this.modalMode.set('edit');
    this.showModal.set(true);
    this.error.set('');
    this.form.patchValue({
      officeId: car.officeId,
      currentLocationId: car.currentLocationId,
      registrationNumber: car.registrationNumber,
      make: car.make,
      model: car.model,
      category: car.category,
      year: car.year,
      dailyRate: car.dailyRate,
      status: car.status,
      fuelLevelPercent: car.fuelLevelPercent,
      mileageKm: car.mileageKm,
      insuranceExpiryDateUtc: this.toDateInput(new Date(car.insuranceExpiryDateUtc)),
      registrationExpiryDateUtc: this.toDateInput(new Date(car.registrationExpiryDateUtc)),
      transmission: car.transmission,
      seats: car.seats,
      color: car.color
    });
  }

  closeModal() {
    this.showModal.set(false);
    this.activeCar.set(null);
    this.error.set('');
  }

  submit() {
    if (this.form.invalid || this.submitting()) {
      return;
    }

    this.submitting.set(true);
    this.error.set('');
    const value = this.form.getRawValue();
    const payload: CreateCarRequest | UpdateCarRequest = {
      officeId: value.officeId,
      currentLocationId: value.currentLocationId,
      registrationNumber: value.registrationNumber,
      make: value.make,
      model: value.model,
      category: value.category,
      year: Number(value.year),
      dailyRate: Number(value.dailyRate),
      status: value.status,
      fuelLevelPercent: Number(value.fuelLevelPercent),
      mileageKm: Number(value.mileageKm),
      insuranceExpiryDateUtc: new Date(value.insuranceExpiryDateUtc).toISOString(),
      registrationExpiryDateUtc: new Date(value.registrationExpiryDateUtc).toISOString(),
      transmission: value.transmission,
      seats: Number(value.seats),
      color: value.color
    };

    if (this.modalMode() === 'create') {
      this.api.createCar(payload as CreateCarRequest).subscribe({
        next: () => this.handleSaved(),
        error: (response) => this.handleError(response?.error?.error ?? 'Vehicle creation failed.')
      });
      return;
    }

    const car = this.activeCar();
    if (!car) {
      this.handleError('Vehicle details are missing.');
      return;
    }

    this.api.updateCar(car.id, payload as UpdateCarRequest).subscribe({
      next: () => this.handleSaved(),
      error: (response) => this.handleError(response?.error?.error ?? 'Vehicle update failed.')
    });
  }

  remove(car: Car) {
    if (!window.confirm(`Delete vehicle ${car.registrationNumber}?`)) {
      return;
    }

    this.api.deleteCar(car.id).subscribe({
      next: () => this.reload(),
      error: (response) => this.error.set(response?.error?.error ?? 'Vehicle deletion failed.')
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

  private toDateInput(value: Date) {
    return value.toISOString().slice(0, 10);
  }
}
