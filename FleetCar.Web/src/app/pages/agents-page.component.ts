import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ApiService } from '../core/api.service';
import { Agent, AgentCommissionReport, CreateAgentRequest, Office, UpdateAgentRequest } from '../core/models';
import { UiIconComponent } from '../shared/ui-icon.component';

type AgentModalMode = 'create' | 'edit' | 'view';

@Component({
  selector: 'app-agents-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, UiIconComponent],
  template: `
    <section class="page management-stack">
      <section class="panel management-card">
        <div class="table-title-row">
          <div>
            <p class="eyebrow">Partners</p>
            <h2>Agent and commission management</h2>
          </div>
          <div class="crud-actions">
            <button type="button" class="button button-warning" (click)="reload()">
              <app-ui-icon name="refresh" [size]="16" />
              <span>Refresh</span>
            </button>
            <button type="button" class="button button-success" (click)="openCreate()">
              <app-ui-icon name="plus" [size]="16" />
              <span>Add agent</span>
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
            <span>Search</span>
            <input type="text" [value]="searchTerm()" (input)="searchTerm.set($any($event.target).value)" placeholder="Code or company" />
          </label>
        </div>
      </section>

      <div class="table-layout-two">
        <section class="panel management-card">
          <div class="table-title-row">
            <div>
              <p class="eyebrow">Agents</p>
              <h3>Registered partners</h3>
            </div>
            <div class="table-meta">
              <div class="table-stat">
                <p class="muted-label">Visible rows</p>
                <strong>{{ filteredAgents().length }}</strong>
              </div>
            </div>
          </div>

          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Actions</th>
                  <th>Code</th>
                  <th>Company</th>
                  <th>Office</th>
                  <th>Commission</th>
                  <th>Credit limit</th>
                </tr>
              </thead>
              <tbody>
                @for (agent of filteredAgents(); track agent.id) {
                  <tr>
                    <td class="table-action-cell">
                      <div class="row-actions">
                        <button type="button" class="button button-info button-small" (click)="openView(agent)">
                          <app-ui-icon name="view" [size]="14" />
                          <span>View</span>
                        </button>
                        <button type="button" class="button button-warning button-small" (click)="openEdit(agent)">
                          <app-ui-icon name="edit" [size]="14" />
                          <span>Edit</span>
                        </button>
                        <button type="button" class="button button-danger button-small" (click)="remove(agent)">
                          <app-ui-icon name="delete" [size]="14" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                    <td>{{ agent.code }}</td>
                    <td>{{ agent.companyName }}</td>
                    <td>{{ agent.preferredOfficeName }}</td>
                    <td>{{ agent.commissionRate }}%</td>
                    <td>{{ agent.creditLimit | currency: 'USD' }}</td>
                  </tr>
                } @empty {
                  <tr><td colspan="6" class="muted">No agents available for the current filters.</td></tr>
                }
              </tbody>
            </table>
          </div>
        </section>

        <section class="panel management-card">
          <div class="table-title-row">
            <div>
              <p class="eyebrow">Commissions</p>
              <h3>Current commission snapshot</h3>
            </div>
          </div>

          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Bookings</th>
                  <th>Gross</th>
                  <th>Commission</th>
                </tr>
              </thead>
              <tbody>
                @for (row of filteredCommissions(); track row.agentCode) {
                  <tr>
                    <td>{{ row.companyName }}<div class="muted">{{ row.agentCode }}</div></td>
                    <td>{{ row.bookingsCount }}</td>
                    <td>{{ row.grossValue | currency: 'USD' }}</td>
                    <td>{{ row.commissionAmount | currency: 'USD' }}</td>
                  </tr>
                } @empty {
                  <tr><td colspan="4" class="muted">No commission data available.</td></tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      </div>

      @if (showModal()) {
        <div class="modal-backdrop" (click)="closeModal()">
          <section class="panel modal-card management-card" (click)="$event.stopPropagation()">
            <div class="table-title-row">
              <div>
                <p class="eyebrow">Agents</p>
                <h3>{{ modalMode() === 'create' ? 'Add agent' : modalMode() === 'edit' ? 'Edit agent' : 'Agent details' }}</h3>
              </div>
              <button type="button" class="button button-danger" (click)="closeModal()">
                <app-ui-icon name="close" [size]="16" />
                <span>Close</span>
              </button>
            </div>

            @if (modalMode() === 'view' && activeAgent()) {
              <div class="detail-grid">
                <div class="detail-item"><span class="muted-label">Code</span><strong>{{ activeAgent()!.code }}</strong></div>
                <div class="detail-item"><span class="muted-label">Company</span><strong>{{ activeAgent()!.companyName }}</strong></div>
                <div class="detail-item"><span class="muted-label">Office</span><strong>{{ activeAgent()!.preferredOfficeName }}</strong></div>
                <div class="detail-item"><span class="muted-label">Commission</span><strong>{{ activeAgent()!.commissionRate }}%</strong></div>
                <div class="detail-item"><span class="muted-label">Credit limit</span><strong>{{ activeAgent()!.creditLimit | currency: 'USD' }}</strong></div>
                <div class="detail-item"><span class="muted-label">Email</span><strong>{{ activeAgent()!.email }}</strong></div>
                <div class="detail-item"><span class="muted-label">Phone</span><strong>{{ activeAgent()!.phone }}</strong></div>
              </div>
            } @else {
              <form [formGroup]="form" class="form-grid" (ngSubmit)="submit()">
                <label>
                  <span>Office</span>
                  <select formControlName="preferredOfficeId">
                    @for (office of offices(); track office.id) {
                      <option [value]="office.id">{{ office.name }}</option>
                    }
                  </select>
                </label>

                <label>
                  <span>Code</span>
                  <input type="text" formControlName="code" />
                </label>

                <label>
                  <span>Company</span>
                  <input type="text" formControlName="companyName" />
                </label>

                <label>
                  <span>Commission rate</span>
                  <input type="number" min="0" max="100" step="0.01" formControlName="commissionRate" />
                </label>

                <label>
                  <span>Credit limit</span>
                  <input type="number" min="0" step="0.01" formControlName="creditLimit" />
                </label>

                <label>
                  <span>Email</span>
                  <input type="email" formControlName="email" />
                </label>

                <label>
                  <span>Phone</span>
                  <input type="text" formControlName="phone" />
                </label>

                @if (error()) {
                  <p class="form-error" style="grid-column: 1 / -1;">{{ error() }}</p>
                }

                <div class="crud-actions" style="grid-column: 1 / -1;">
                  <button type="submit" class="button button-success" [disabled]="form.invalid || submitting()">
                    <app-ui-icon [name]="modalMode() === 'create' ? 'plus' : 'edit'" [size]="16" />
                    <span>{{ submitting() ? 'Saving...' : modalMode() === 'create' ? 'Add agent' : 'Save changes' }}</span>
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
export class AgentsPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);

  readonly offices = signal<Office[]>([]);
  readonly agents = signal<Agent[]>([]);
  readonly commissions = signal<AgentCommissionReport[]>([]);
  readonly filterOfficeId = signal('');
  readonly searchTerm = signal('');
  readonly showModal = signal(false);
  readonly modalMode = signal<AgentModalMode>('create');
  readonly activeAgent = signal<Agent | null>(null);
  readonly error = signal('');
  readonly submitting = signal(false);
  readonly form = this.fb.nonNullable.group({
    preferredOfficeId: ['', Validators.required],
    code: ['', Validators.required],
    companyName: ['', Validators.required],
    commissionRate: [10, [Validators.required, Validators.min(0), Validators.max(100)]],
    creditLimit: [0, [Validators.required, Validators.min(0)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', Validators.required]
  });
  readonly filteredAgents = computed(() => {
    const officeId = this.filterOfficeId();
    const search = this.searchTerm().trim().toLowerCase();

    return this.agents().filter((agent) => {
      const officeMatch = !officeId || agent.preferredOfficeId === officeId;
      const searchMatch =
        !search ||
        agent.code.toLowerCase().includes(search) ||
        agent.companyName.toLowerCase().includes(search) ||
        agent.preferredOfficeName.toLowerCase().includes(search);

      return officeMatch && searchMatch;
    });
  });
  readonly filteredCommissions = computed(() => {
    const officeCodes = new Set(this.filteredAgents().map((agent) => agent.code));
    if (!this.filterOfficeId() && !this.searchTerm().trim()) {
      return this.commissions();
    }

    return this.commissions().filter((row) => officeCodes.has(row.agentCode));
  });

  ngOnInit() {
    this.reload();
  }

  reload() {
    forkJoin({
      offices: this.api.getOffices(),
      agents: this.api.getAgents(),
      commissions: this.api.getAgentCommissionReport()
    }).subscribe(({ offices, agents, commissions }) => {
      this.offices.set(offices);
      this.agents.set(agents);
      this.commissions.set(commissions);
      if (!this.form.controls.preferredOfficeId.value && offices.length > 0) {
        this.form.patchValue({ preferredOfficeId: offices[0].id });
      }
    });
  }

  openCreate() {
    this.activeAgent.set(null);
    this.modalMode.set('create');
    this.showModal.set(true);
    this.error.set('');
    this.form.reset({
      preferredOfficeId: this.filterOfficeId() || this.offices()[0]?.id || '',
      code: '',
      companyName: '',
      commissionRate: 10,
      creditLimit: 0,
      email: '',
      phone: ''
    });
  }

  openView(agent: Agent) {
    this.activeAgent.set(agent);
    this.modalMode.set('view');
    this.showModal.set(true);
  }

  openEdit(agent: Agent) {
    this.activeAgent.set(agent);
    this.modalMode.set('edit');
    this.showModal.set(true);
    this.error.set('');
    this.form.patchValue({
      preferredOfficeId: agent.preferredOfficeId,
      code: agent.code,
      companyName: agent.companyName,
      commissionRate: agent.commissionRate,
      creditLimit: agent.creditLimit,
      email: agent.email,
      phone: agent.phone
    });
  }

  closeModal() {
    this.showModal.set(false);
    this.activeAgent.set(null);
    this.error.set('');
  }

  submit() {
    if (this.form.invalid || this.submitting()) {
      return;
    }

    this.submitting.set(true);
    this.error.set('');
    const value = this.form.getRawValue();
    const payload: CreateAgentRequest | UpdateAgentRequest = {
      preferredOfficeId: value.preferredOfficeId,
      code: value.code,
      companyName: value.companyName,
      commissionRate: Number(value.commissionRate),
      creditLimit: Number(value.creditLimit),
      email: value.email,
      phone: value.phone
    };

    if (this.modalMode() === 'create') {
      this.api.createAgent(payload as CreateAgentRequest).subscribe({
        next: () => this.handleSaved(),
        error: (response) => this.handleError(response?.error?.error ?? 'Agent creation failed.')
      });
      return;
    }

    const agent = this.activeAgent();
    if (!agent) {
      this.handleError('Agent details are missing.');
      return;
    }

    this.api.updateAgent(agent.id, payload as UpdateAgentRequest).subscribe({
      next: () => this.handleSaved(),
      error: (response) => this.handleError(response?.error?.error ?? 'Agent update failed.')
    });
  }

  remove(agent: Agent) {
    if (!window.confirm(`Delete agent ${agent.companyName}?`)) {
      return;
    }

    this.api.deleteAgent(agent.id).subscribe({
      next: () => this.reload(),
      error: (response) => this.error.set(response?.error?.error ?? 'Agent deletion failed.')
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
}
