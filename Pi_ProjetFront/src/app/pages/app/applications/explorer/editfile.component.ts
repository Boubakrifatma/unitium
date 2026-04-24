import { Component, Inject, signal, inject, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";
import { MatFormField, MatInputModule } from "@angular/material/input";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatCard, MatCardModule } from "@angular/material/card";
import { FileData } from "./explorer.component"; // Import the interface
import { MatSelectModule } from "@angular/material/select";

@Component({
    selector: "app-edit-file-dialog",
    imports: [CommonModule, MatDialogModule, MatInputModule, MatIconModule, MatSelectModule, MatButtonModule, MatCardModule, FormsModule, MatFormFieldModule, ReactiveFormsModule],
    template: `<h4 mat-dialog-title>Edit File</h4>
        <mat-dialog-content>
            <form [formGroup]="fileForm" class="pt-2">
                <div class="row gx-3">
                    <div class="col-12 col-lg-4 text-center mb-3 mb-lg-4">
                        <div class="avatar avatar-200 coverimg rounded mb-3 mb-lg-4" style="background-image:url('{{ data.fileImage }}')">
                            <img [src]="data.fileImage" alt="File Type: {{ data.fileImage }}" class="d-none" />
                        </div>
                        <p class="text-secondary small mb-1">File Name</p>
                        <p>{{ data.fileName }}</p>
                        <span [class.theme-green]="data.isActive" [class.theme-red]="!data.isActive" class="badge">
                            {{ data.isActive ? "Active" : "Inactive" }}
                        </span>
                    </div>
                    <div class="col-12 col-lg">
                        <div class="row gx-3">
                            <div class="col-12 col-md-6">
                                <mat-form-field appearance="outline" class="w-100">
                                    <mat-label>File Name</mat-label>
                                    <input matInput formControlName="fileName" />
                                </mat-form-field>
                            </div>
                            <div class="col-12 col-md-6">
                                <mat-form-field appearance="outline" class="w-100">
                                    <mat-label>Share Status</mat-label>
                                    <mat-select formControlName="shareStatus">
                                        <mat-option value="shared">Shared</mat-option>
                                        <mat-option value="restricted">Restricted</mat-option>
                                        <mat-option value="notshared">Not Shared</mat-option>
                                    </mat-select>
                                </mat-form-field>
                            </div>
                            <div class="col-12 col-md-6">
                                <mat-form-field appearance="outline" class="w-100">
                                    <mat-label>Date Modified</mat-label>
                                    <input matInput formControlName="dateModified" />
                                </mat-form-field>
                            </div>
                            <div class="col-12 col-md-6">
                                <mat-form-field appearance="outline" class="w-100">
                                    <mat-label>Modified By</mat-label>
                                    <input matInput formControlName="modifiedBy" />
                                </mat-form-field>
                            </div>
                            <div class="col-12 col-md-6">
                                <mat-form-field appearance="outline" class="w-100">
                                    <mat-label>Upload By</mat-label>
                                    <input matInput formControlName="uploadBy" />
                                </mat-form-field>
                            </div>
                            <div class="col-12 col-md-6">
                                <mat-form-field appearance="outline" class="w-100">
                                    <mat-label>File Size</mat-label>
                                    <input matInput formControlName="fileSize" />
                                </mat-form-field>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </mat-dialog-content>

        <mat-dialog-actions>
            <button matButton="filled" color="primary" (click)="saveChanges()">Save</button>
            <button matButton (click)="dialogRef.close(false)" class="ms-auto theme-red">Cancel</button>
        </mat-dialog-actions>`,
    styles: [``],
})
export class EditFileDialogComponent {
    // edit data
    fileForm = new FormGroup({
        // Editable fields
        fileName: new FormControl(this.data.fileName, Validators.required),
        shareStatus: new FormControl(this.data.shareStatus),

        // Read-only fields (set disabled: true on creation)
        uploadBy: new FormControl({ value: this.data.uploadBy, disabled: true }),
        fileSize: new FormControl({ value: this.data.fileSize, disabled: true }),
        dateModified: new FormControl({ value: this.data.dateModified, disabled: true }),
        modifiedBy: new FormControl({ value: this.data.modifiedBy, disabled: true }),

        // Include other required FileData properties
        fileImage: new FormControl(this.data.fileImage),
        dateCreated: new FormControl(this.data.dateCreated),
        time: new FormControl(this.data.time),
        action: new FormControl(this.data.action),
        isActive: new FormControl(this.data.isActive),
    });

    constructor(public dialogRef: MatDialogRef<EditFileDialogComponent>, @Inject(MAT_DIALOG_DATA) public data: FileData) {
        this.fileForm.patchValue(data);
    }

    onCancel(): void {
        this.dialogRef.close();
    }
    onSave(): void {
        if (this.fileForm.valid) {
            this.dialogRef.close(this.fileForm.value);
        }
    }

    // drag drop
    isDragging = signal(false);
    images = signal<{ name: string; src: string }[]>([]);

    onDragOver(event: DragEvent) {
        event.preventDefault();
        this.isDragging.set(true);
    }

    onDragLeave(event: DragEvent) {
        this.isDragging.set(false);
    }

    onDrop(event: DragEvent) {
        event.preventDefault();
        this.isDragging.set(false);
        if (event.dataTransfer?.files) {
            this.processFiles(event.dataTransfer.files);
        }
    }

    onFileSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        if (input.files) {
            this.processFiles(input.files);
        }
    }

    processFiles(files: FileList) {
        Array.from(files).forEach((file) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.images.update((imgs) => [...imgs, { name: file.name, src: e.target?.result as string }]);
            };
            reader.readAsDataURL(file);
        });
    }

    removeImage(imageToRemove: { name: string; src: string }) {
        this.images.update((imgs) => imgs.filter((img) => img.src !== imageToRemove.src));
    }

    saveChanges(): void {
        if (this.fileForm.valid) {
            this.dialogRef.close(this.fileForm.value);
        }
    }
}
