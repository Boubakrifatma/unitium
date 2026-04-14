import { Component, Inject, ChangeDetectionStrategy, ChangeDetectorRef, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatSnackBar } from "@angular/material/snack-bar";
import { MilestoneService } from "../../../services/mileStoneService/milestone.service";

export interface SuggestedTask {
  title: string;
  description: string;
  selected: boolean;
}

@Component({
  selector: "app-suggest-tasks-dialog",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title class="dlg-title">
      <mat-icon>auto_awesome</mat-icon>
      Tâches suggérées par l'IA
    </h2>

    <mat-dialog-content class="dlg-content">
      <p class="milestone-label">
        Pour le jalon : <strong>{{ data.milestoneName }}</strong>
      </p>

      <div *ngIf="loading()" class="loading">
        <mat-spinner diameter="40"></mat-spinner>
        <p>Génération des suggestions en cours...</p>
      </div>

      <div *ngIf="!loading() && suggestions().length === 0" class="empty">
        <mat-icon>info</mat-icon>
        <p>Aucune suggestion disponible.</p>
      </div>

      <div *ngIf="!loading() && suggestions().length > 0" class="list">
        <div class="list-header">
          <mat-checkbox
            [checked]="allSelected()"
            [indeterminate]="someSelected()"
            (change)="toggleAll($event.checked)">
            Tout sélectionner
          </mat-checkbox>
          <button mat-button color="primary" (click)="regenerate()" [disabled]="loading()">
            <mat-icon>refresh</mat-icon>
            Régénérer
          </button>
        </div>

        <div class="suggestion-card" *ngFor="let s of suggestions(); let i = index">
          <mat-checkbox [(ngModel)]="s.selected" (change)="onToggle()">
            <div class="suggestion-body">
              <div class="suggestion-title">{{ s.title }}</div>
              <div class="suggestion-desc">{{ s.description }}</div>
            </div>
          </mat-checkbox>
        </div>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">Annuler</button>
      <button mat-raised-button color="primary"
              [disabled]="loading() || selectedCount() === 0"
              (click)="confirm()">
        <mat-icon>add_task</mat-icon>
        Créer {{ selectedCount() }} tâche{{ selectedCount() > 1 ? 's' : '' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dlg-title {
      display: flex;
      align-items: center;
      gap: 10px;
      color: #0ea5e9;
    }
    .dlg-content {
      min-width: 500px;
      max-width: 640px;
      min-height: 200px;
    }
    .milestone-label {
      color: #6b7280;
      margin-bottom: 16px;
    }
    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 40px 0;
      color: #6b7280;
    }
    .empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 40px 0;
      color: #6b7280;
    }
    .empty mat-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
    }
    .list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .list-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 10px;
      border-bottom: 1px solid #e5e7eb;
      margin-bottom: 6px;
    }
    .suggestion-card {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 12px;
      transition: border-color 0.2s, background 0.2s;
    }
    .suggestion-card:hover {
      border-color: #0ea5e9;
      background: #f0f9ff;
    }
    .suggestion-body {
      display: inline-block;
      margin-left: 6px;
      vertical-align: top;
    }
    .suggestion-title {
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 4px;
    }
    .suggestion-desc {
      font-size: 0.85rem;
      color: #6b7280;
      line-height: 1.4;
    }
    ::ng-deep .suggestion-card .mat-mdc-checkbox label {
      display: flex !important;
      align-items: flex-start;
    }
  `]
})
export class SuggestTasksDialogComponent {
  suggestions = signal<SuggestedTask[]>([]);
  loading = signal<boolean>(true);

  constructor(
    private dialogRef: MatDialogRef<SuggestTasksDialogComponent>,
    private milestoneService: MilestoneService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) public data: { milestoneName: string }
  ) {
    this.fetchSuggestions();
  }

  fetchSuggestions() {
    this.loading.set(true);
    this.suggestions.set([]);
    this.cdr.markForCheck();

    this.milestoneService.suggestTasks(this.data.milestoneName).subscribe({
      next: (res) => {
        const list = (res?.suggestions || []).map(s => ({
          title: s.title,
          description: s.description,
          selected: true
        }));
        this.suggestions.set(list);
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading.set(false);
        this.cdr.markForCheck();
        this.snackBar.open("Échec de la génération IA", "OK", { duration: 4000 });
      }
    });
  }

  regenerate() {
    this.fetchSuggestions();
  }

  selectedCount(): number {
    return this.suggestions().filter(s => s.selected).length;
  }

  allSelected(): boolean {
    const list = this.suggestions();
    return list.length > 0 && list.every(s => s.selected);
  }

  someSelected(): boolean {
    const list = this.suggestions();
    const count = list.filter(s => s.selected).length;
    return count > 0 && count < list.length;
  }

  toggleAll(checked: boolean) {
    const list = this.suggestions().map(s => ({ ...s, selected: checked }));
    this.suggestions.set(list);
    this.cdr.markForCheck();
  }

  onToggle() {
    // Trigger recomputation for template bindings
    this.suggestions.set([...this.suggestions()]);
    this.cdr.markForCheck();
  }

  cancel() {
    this.dialogRef.close();
  }

  confirm() {
    const picked = this.suggestions()
      .filter(s => s.selected)
      .map(s => ({ title: s.title, description: s.description }));
    this.dialogRef.close(picked);
  }
}
