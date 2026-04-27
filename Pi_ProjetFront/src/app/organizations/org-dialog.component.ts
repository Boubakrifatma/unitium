import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { OrganizationDTO } from './organization.service';
import { UserService, UserDTO } from '../users/user.service';

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

          <!-- Owner (create only) -->
          <div class="col-12 col-md-6 mb-1" *ngIf="data.mode === 'create'">
            <mat-form-field appearance="outline" class="w-100">
              <mat-label>Responsable de l'organisation</mat-label>
              <mat-icon matPrefix class="material-icons-outlined">person</mat-icon>
              <mat-select formControlName="ownerId">
                <mat-option *ngIf="adminUsers.length === 0" disabled>
                  Aucun admin disponible — créez d'abord un utilisateur ADMIN
                </mat-option>
                <mat-option *ngFor="let u of adminUsers" [value]="u.id">
                  {{ u.fullName }} ({{ u.role }}) — {{ u.email }}
                </mat-option>
              </mat-select>
              <mat-hint>L'admin qui gérera cette organisation</mat-hint>
              <mat-error *ngIf="f['ownerId'].hasError('required')">Veuillez choisir un responsable</mat-error>
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
      <button mat-flat-button color="primary" (click)="submit()">
        <mat-icon class="material-icons-outlined me-1">
          {{ data.mode === 'create' ? 'add' : 'save' }}
        </mat-icon>
        {{ data.mode === 'create' ? 'Create' : 'Save Changes' }}
      </button>
    </mat-dialog-actions>
  `
})
export class OrgDialogComponent implements OnInit {
  form: FormGroup;
  adminUsers: UserDTO[] = [];

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    public dialogRef: MatDialogRef<OrgDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { mode: 'create' | 'edit'; org?: OrganizationDTO }
  ) {
    const isCreate = data.mode === 'create';
    this.form = this.fb.group({
      name:           [data.org?.name ?? '',          [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      slug:           [data.org?.slug ?? '',           isCreate ? [Validators.required, Validators.pattern(SLUG_PATTERN), Validators.maxLength(50)] : []],
      ownerId:        [data.org?.ownerId ?? null,      isCreate ? [Validators.required] : []],
      orgType:        [data.org?.orgType ?? 'ENTERPRISE', Validators.required],
      billingEmail:   [data.org?.billingEmail ?? '',   [Validators.email, Validators.maxLength(150)]],
      billingCountry: [data.org?.billingCountry ?? '', [Validators.pattern(COUNTRY_PATTERN)]],
      vatNumber:      [data.org?.vatNumber ?? '',      [Validators.maxLength(20), Validators.pattern(VAT_PATTERN)]],
    });

    // Auto-generate slug from name as user types
    if (isCreate) {
      this.form.get('name')!.valueChanges.subscribe(val => {
        const slug = (val ?? '').toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        this.form.get('slug')!.setValue(slug, { emitEvent: false });
      });
    }
  }

  ngOnInit(): void {
    if (this.data.mode === 'create') {
      this.userService.getAll().subscribe({
        next: users => this.adminUsers = users.filter(u => u.role === 'ADMIN'),
        error: () => {}
      });
    }
  }

  get f() { return this.form.controls; }

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
