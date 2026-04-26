import { Component, ChangeDetectionStrategy } from "@angular/core";
import { provideNativeDateAdapter } from "@angular/material/core";
import { MatButtonModule } from "@angular/material/button";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from "@angular/forms";

const today = new Date();
const month = today.getMonth();
const year = today.getFullYear();

@Component({
    selector: "app-page-right",
    standalone: true,
    imports: [MatFormFieldModule, MatDatepickerModule, MatButtonModule, FormsModule, ReactiveFormsModule],
    template: `<mat-form-field class="w-100 inline-small" appearance="outline">
        <mat-label>Date Range</mat-label>
        <mat-date-range-input [formGroup]="campaignOne" [rangePicker]="campaignOnePicker">
            <input matStartDate placeholder="Start date" formControlName="start" />
            <input matEndDate placeholder="End date" formControlName="end" />
        </mat-date-range-input>
        <mat-datepicker-toggle matIconSuffix [for]="campaignOnePicker"></mat-datepicker-toggle>
        <mat-date-range-picker #campaignOnePicker></mat-date-range-picker>
    </mat-form-field> `,
    providers: [
        // ... other providers
        provideNativeDateAdapter(),
    ],
    styles: [``],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageRightComponent {
    readonly campaignOne = new FormGroup({
        start: new FormControl(new Date(year, month, 13)),
        end: new FormControl(new Date(year, month, 19)),
    });
}
