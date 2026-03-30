import { Component, inject } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatSnackBar, MatSnackBarAction, MatSnackBarActions, MatSnackBarLabel, MatSnackBarRef } from "@angular/material/snack-bar";

@Component({
    selector: "app-snackbar-success",
    imports: [MatButtonModule, MatIconModule, MatSnackBarLabel, MatSnackBarActions, MatSnackBarAction],
    template: `<div class="row gx-3 align-items-center">
        <div class="col">
            <p matSnackBarLabel>Booking SMS sent to customer</p>
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
}
