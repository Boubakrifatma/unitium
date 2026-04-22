import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";

@Component({
    selector: "app-incrementor",
    standalone: true,
    imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatIconModule, MatButtonModule],
    template: `
        <mat-form-field appearance="outline" class="incrementor inline-small border-light rounded">
            <button matIconButton matPrefix (click)="decrement()"><mat-icon>remove</mat-icon></button>
            <input matInput placeholder="" value="0" [(ngModel)]="count" [min]="0" />
            <button matIconButton matSuffix (click)="increment()"><mat-icon>add</mat-icon></button>
        </mat-form-field>
    `,
    styles: [``],
})
export class IncrementorComponent {
    count: number = 0;

    ngOnInit() {
        this.count = 0;
    }

    increment() {
        this.count++;
    }

    decrement() {
        if (this.count > 0) {
            this.count--;
        }
    }
}
