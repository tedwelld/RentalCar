import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { SafeResourceUrl } from '@angular/platform-browser';
import { UiIconComponent } from './ui-icon.component';

@Component({
  selector: 'app-document-preview',
  standalone: true,
  imports: [UiIconComponent],
  template: `
    <div class="modal-backdrop" (click)="closed.emit()">
      <section class="panel modal-card document-preview-card" (click)="$event.stopPropagation()">
        <div class="table-title-row">
          <div>
            <p class="eyebrow">Document preview</p>
            <h3>{{ title() }}</h3>
          </div>
          <div class="crud-actions">
            <button type="button" class="button button-info" (click)="printed.emit()">
              <app-ui-icon name="print" [size]="16" />
              <span>Print</span>
            </button>
            <button type="button" class="button button-danger" (click)="closed.emit()">
              <app-ui-icon name="close" [size]="16" />
              <span>Close</span>
            </button>
          </div>
        </div>

        <iframe class="document-frame" [src]="url()" title="Document preview"></iframe>
      </section>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DocumentPreviewComponent {
  readonly title = input.required<string>();
  readonly url = input.required<SafeResourceUrl>();
  readonly printed = output<void>();
  readonly closed = output<void>();
}
