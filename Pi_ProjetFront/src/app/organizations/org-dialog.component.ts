import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { OrganizationDTO } from './organization.service';

@Component({
  selector: 'app-org-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data.mode === 'create' ? 'New Organization' : 'Edit Organization' }}</h2>
    <mat-dialog-content>
      <div class="row gx-3">
        <div class="col-12 mb-2">
          <mat-form-field appearance="outline" class="w-100">
            <mat-label>Name</mat-label>
            <input matInput [(ngModel)]="form.name" required />
          </mat-form-field>
        </div>
        <div class="col-12 mb-2" *ngIf="data.mode === 'create'">
          <mat-form-field appearance="outline" class="w-100">
            <mat-label>Slug</mat-label>
            <input matInput [(ngModel)]="form.slug" required placeholder="unitum-corp" />
            <mat-hint>Unique, lowercase, no spaces</mat-hint>
          </mat-form-field>
        </div>
        <div class="col-12 col-md-6 mb-2" *ngIf="data.mode === 'create'">
          <mat-form-field appearance="outline" class="w-100">
            <mat-label>Owner ID</mat-label>
            <input matInput type="number" [(ngModel)]="form.ownerId" required />
          </mat-form-field>
        </div>
        <div class="col-12 col-md-6 mb-2">
          <mat-form-field appearance="outline" class="w-100">
            <mat-label>Type</mat-label>
            <mat-select [(ngModel)]="form.orgType">
              <mat-option value="ENTERPRISE">Enterprise</mat-option>
              <mat-option value="ACADEMIC">Academic</mat-option>
            </mat-select>
          </mat-form-field>
        </div>
        <div class="col-12 col-md-6 mb-2">
          <mat-form-field appearance="outline" class="w-100">
            <mat-label>Billing Email</mat-label>
            <input matInput [(ngModel)]="form.billingEmail" />
          </mat-form-field>
        </div>
        <div class="col-12 col-md-6 mb-2">
          <mat-form-field appearance="outline" class="w-100">
            <mat-label>Country (2 letters)</mat-label>
            <input matInput [(ngModel)]="form.billingCountry" maxlength="2" placeholder="TN" />
          </mat-form-field>
        </div>
        <div class="col-12 mb-2">
          <mat-form-field appearance="outline" class="w-100">
            <mat-label>VAT Number</mat-label>
            <input matInput [(ngModel)]="form.vatNumber" />
          </mat-form-field>
        </div>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" [disabled]="!isValid()" (click)="submit()">
        {{ data.mode === 'create' ? 'Create' : 'Save' }}
      </button>
    </mat-dialog-actions>
  `
})
export class OrgDialogComponent {
  form: any = { name: '', slug: '', orgType: 'ENTERPRISE', ownerId: null, billingEmail: '', billingCountry: '', vatNumber: '' };

  constructor(
    public dialogRef: MatDialogRef<OrgDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { mode: 'create' | 'edit'; org?: OrganizationDTO }
  ) {
    if (data.org) {
      this.form = { name: data.org.name, slug: data.org.slug, orgType: data.org.orgType, ownerId: data.org.ownerId, billingEmail: data.org.billingEmail ?? '', billingCountry: data.org.billingCountry ?? '', vatNumber: data.org.vatNumber ?? '' };
    }
  }

  isValid(): boolean {
    if (!this.form.name?.trim()) return false;
    if (this.data.mode === 'create' && (!this.form.slug?.trim() || !this.form.ownerId)) return false;
    return true;
  }

  submit() { this.dialogRef.close(this.form); }
}
