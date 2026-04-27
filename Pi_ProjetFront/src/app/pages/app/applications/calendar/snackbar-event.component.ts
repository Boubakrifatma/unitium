import { Component, inject, Inject, Optional } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatSnackBarAction, MatSnackBarActions, MatSnackBarLabel, MatSnackBarRef, MAT_SNACK_BAR_DATA } from "@angular/material/snack-bar";

@Component({
    selector: "app-snackbar-success",
    imports: [MatButtonModule, MatIconModule, MatSnackBarLabel, MatSnackBarActions, MatSnackBarAction],
    template: `<div class="row gx-3 align-items-center">
        <div class="col">
            <p matSnackBarLabel>{{ message }}</p>
        </div>
        <div class="col-auto">
            <span matSnackBarActions>
                <button matIconButton matSnackBarAction (click)="snackBarRef.dismissWithAction()"><mat-icon class="material-icons-outlined">check</mat-icon></button>
            </span>
        </div>
    </div>`,
    styles: `
    `,
})
export class SnackbarSuccessComponent {
    snackBarRef = inject(MatSnackBarRef);
    message: string;

    constructor(@Optional() @Inject(MAT_SNACK_BAR_DATA) data: string | null) {
        this.message = data ?? 'Booking SMS sent to customer';
    }
}
