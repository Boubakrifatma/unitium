import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { OrganizationDTO } from './organization.service';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const COUNTRY_PATTERN = /^[A-Za-z]{2}$/;
const VAT_PATTERN = /^[A-Z0-9\-]{0,20}$/;

@Component({
  selector: 'app-org-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon class="material-icons-outlined align-middle me-2">
        {{ data.mode === 'create' ? 'add_business' : 'edit' }}
      </mat-icon>
      {{ data.mode === 'create' ? 'New Organization' : 'Edit Organization' }}
    </h2>

    <mat-dialog-content style="min-width:480px">
      <form [formGroup]="form" class="pt-2">
        <div class="row gx-3">

          <!-- Name -->
          <div class="col-12 mb-1">
            <mat-form-field appearance="outline" class="w-100">
              <mat-label>Organization Name</mat-label>
              <mat-icon matPrefix class="material-icons-outlined">business</mat-icon>
              <input matInput formControlName="name" placeholder="Acme Corp" />
              <mat-hint>2–100 characters</mat-hint>
              <mat-error *ngIf="f['name'].hasError('required')">Name is required</mat-error>
              <mat-error *ngIf="f['name'].hasError('minlength')">At least 2 characters</mat-error>
              <mat-error *ngIf="f['name'].hasError('maxlength')">100 characters maximum</mat-error>
            </mat-form-field>
          </div>

          <!-- Slug (create only) -->
          <div class="col-12 mb-1" *ngIf="data.mode === 'create'">
            <mat-form-field appearance="outline" class="w-100">
              <mat-label>Slug</mat-label>
              <mat-icon matPrefix class="material-icons-outlined">link</mat-icon>
              <input matInput formControlName="slug" placeholder="acme-corp"
                     (input)="autoSlug($event)" />
              <mat-hint>Unique identifier — lowercase, no spaces (e.g. acme-corp)</mat-hint>
              <mat-error *ngIf="f['slug'].hasError('required')">Slug is required</mat-error>
              <mat-error *ngIf="f['slug'].hasError('pattern')">Only lowercase letters, numbers and hyphens</mat-error>
              <mat-error *ngIf="f['slug'].hasError('maxlength')">50 characters maximum</mat-error>
            </mat-form-field>
          </div>

          <!-- Owner ID (create only) -->
          <div class="col-12 col-md-6 mb-1" *ngIf="data.mode === 'create'">
            <mat-form-field appearance="outline" class="w-100">
              <mat-label>Owner ID</mat-label>
              <mat-icon matPrefix class="material-icons-outlined">person</mat-icon>
              <input matInput type="number" formControlName="ownerId" placeholder="1" min="1" />
              <mat-error *ngIf="f['ownerId'].hasError('required')">Owner ID is required</mat-error>
              <mat-error *ngIf="f['ownerId'].hasError('min')">Must be a positive number</mat-error>
            </mat-form-field>
          </div>

          <!-- Type -->
          <div class="col-12 col-md-6 mb-1">
            <mat-form-field appearance="outline" class="w-100">
              <mat-label>Type</mat-label>
              <mat-icon matPrefix class="material-icons-outlined">category</mat-icon>
              <mat-select formControlName="orgType">
                <mat-option value="ENTERPRISE">Enterprise</mat-option>
                <mat-option value="ACADEMIC">Academic</mat-option>
              </mat-select>
              <mat-error *ngIf="f['orgType'].hasError('required')">Type is required</mat-error>
            </mat-form-field>
          </div>

          <!-- Billing Email -->
          <div class="col-12 col-md-6 mb-1">
            <mat-form-field appearance="outline" class="w-100">
              <mat-label>Billing Email</mat-label>
              <mat-icon matPrefix class="material-icons-outlined">receipt</mat-icon>
              <input matInput type="email" formControlName="billingEmail"
                     placeholder="billing@acme.com" />
              <mat-error *ngIf="f['billingEmail'].hasError('email')">Enter a valid email address</mat-error>
              <mat-error *ngIf="f['billingEmail'].hasError('maxlength')">150 characters maximum</mat-error>
            </mat-form-field>
          </div>

          <!-- Country -->
          <div class="col-12 col-md-6 mb-1">
            <mat-form-field appearance="outline" class="w-100">
              <mat-label>Country (2-letter code)</mat-label>
              <mat-icon matPrefix class="material-icons-outlined">flag</mat-icon>
              <input matInput formControlName="billingCountry" placeholder="TN"
                     maxlength="2" style="text-transform:uppercase" />
              <mat-hint>ISO code — e.g. TN, FR, US</mat-hint>
              <mat-error *ngIf="f['billingCountry'].hasError('pattern')">Enter a 2-letter country code (e.g. TN)</mat-error>
            </mat-form-field>
          </div>

          <!-- VAT Number -->
          <div class="col-12 mb-1">
            <mat-form-field appearance="outline" class="w-100">
              <mat-label>VAT Number</mat-label>
              <mat-icon matPrefix class="material-icons-outlined">tag</mat-icon>
              <input matInput formControlName="vatNumber" placeholder="TN12345678"
                     style="text-transform:uppercase" />
              <mat-hint>Optional — alphanumeric, 20 chars max</mat-hint>
              <mat-error *ngIf="f['vatNumber'].hasError('maxlength')">20 characters maximum</mat-error>
              <mat-error *ngIf="f['vatNumber'].hasError('pattern')">Only letters, numbers and hyphens</mat-error>
            </mat-form-field>
          </div>

        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end" class="px-3 pb-3 gap-2">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid" (click)="submit()">
        <mat-icon class="material-icons-outlined me-1">
          {{ data.mode === 'create' ? 'add' : 'save' }}
        </mat-icon>
        {{ data.mode === 'create' ? 'Create' : 'Save Changes' }}
      </button>
    </mat-dialog-actions>
  `
})
export class OrgDialogComponent {
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<OrgDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { mode: 'create' | 'edit'; org?: OrganizationDTO }
  ) {
    const isCreate = data.mode === 'create';
    this.form = this.fb.group({
      name:           [data.org?.name ?? '',          [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      slug:           [data.org?.slug ?? '',           isCreate ? [Validators.required, Validators.pattern(SLUG_PATTERN), Validators.maxLength(50)] : []],
      ownerId:        [data.org?.ownerId ?? null,      isCreate ? [Validators.required, Validators.min(1)] : []],
      orgType:        [data.org?.orgType ?? 'ENTERPRISE', Validators.required],
      billingEmail:   [data.org?.billingEmail ?? '',   [Validators.email, Validators.maxLength(150)]],
      billingCountry: [data.org?.billingCountry ?? '', [Validators.pattern(COUNTRY_PATTERN)]],
      vatNumber:      [data.org?.vatNumber ?? '',      [Validators.maxLength(20), Validators.pattern(VAT_PATTERN)]],
    });
  }

  /** Shortcut to access form controls */
  get f() { return this.form.controls; }

  /** Auto-uppercase country as user types */
  autoSlug(event: Event): void {
    const input = event.target as HTMLInputElement;
    const val = input.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    this.form.get('slug')?.setValue(val, { emitEvent: false });
    input.value = val;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const val = { ...this.form.value };
    if (val.billingCountry) val.billingCountry = val.billingCountry.toUpperCase();
    if (val.vatNumber)      val.vatNumber      = val.vatNumber.toUpperCase();
    this.dialogRef.close(val);
  }
}
