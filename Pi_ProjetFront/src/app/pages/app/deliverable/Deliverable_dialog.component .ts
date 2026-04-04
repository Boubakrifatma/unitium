import {
  Component, OnInit, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { DeliverableService } from '../../../services/Deliverable.service';
import { MatBadgeModule } from '@angular/material/badge';   // ← Important !
export interface DeliverableFormData {
  mode: 'create' | 'edit';
  deliverable: any;
  tasks: any[];
  users: any[];
  projects: any[];
  currentUserId: number;
  currentProjectId: string;
}

@Component({
  selector: 'app-deliverable-dialog',
  standalone: true,
  templateUrl: './deliverable-dialog.component.html',
  styleUrls: ['./deliverable-dialog.component.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatCardModule,
    MatBadgeModule
  ],
})
export class DeliverableDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private deliverableService = inject(DeliverableService);
  readonly dialogRef = inject(MatDialogRef<DeliverableDialogComponent>);
  readonly data: DeliverableFormData = inject(MAT_DIALOG_DATA);

  form!: FormGroup;
  loading = false;
  error = '';
  submitted = false;

  constructor() {
    this.form = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      taskId: ['', Validators.required],
      projectId: ['', Validators.required],
      submittedById: ['', Validators.required],
      fileUrl: [''],
      fileType: [''],
      fileSizeKb: [''],
      status: ['draft', Validators.required],
    });
  }

  ngOnInit() {
    // Set defaults for create mode
    const firstTask = this.data.tasks && this.data.tasks.length > 0 ? this.data.tasks[0].id : null;
    
    this.form.patchValue({
      taskId: firstTask,
      projectId: this.data.currentProjectId,
      submittedById: this.data.currentUserId,
      status: 'submitted', // ✅ Default to draft
    });
  }

  onSubmit() {
    this.submitted = true;
    this.error = '';

    if (this.form.invalid) {
      this.error = 'Veuillez remplir tous les champs obligatoires.';
      return;
    }

    this.loading = true;

    const formData = {
      ...this.form.value,
      taskId: Number(this.form.value.taskId),
      submittedById: Number(this.form.value.submittedById),
      fileSizeKb: this.form.value.fileSizeKb ? Number(this.form.value.fileSizeKb) : null,
    };

    this.deliverableService.createDeliverable(formData).subscribe({
      next: (response) => {
        this.loading = false;
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Une erreur est survenue. Veuillez réessayer.';
        console.error('Error:', err);
      },
    });
  }

  onCancel() {
    this.dialogRef.close(false);
  }

  getTaskTitle(taskId: string): string {
    const task = this.data.tasks.find(t => t.id.toString() === taskId);
    return task ? task.title : '';
  }

  getUserName(userId: number): string {
    const user = this.data.users.find(u => u.id === userId);
    return user ? user.fullName || user.name : '';
  }
}