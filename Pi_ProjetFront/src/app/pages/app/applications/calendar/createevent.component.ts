import { Component, OnInit, AfterViewInit, signal, inject } from "@angular/core";
import { CommonModule, AsyncPipe } from "@angular/common";
import { FormControl, ReactiveFormsModule } from "@angular/forms";
import { provideNativeDateAdapter } from "@angular/material/core";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatChipsModule } from "@angular/material/chips";
import { MatAutocompleteModule } from "@angular/material/autocomplete";
import { MatSnackBar, MatSnackBarAction, MatSnackBarActions, MatSnackBarLabel, MatSnackBarRef } from "@angular/material/snack-bar";
import { MatDatepickerInputEvent, MatCalendarCellClassFunction, MatDatepickerModule } from "@angular/material/datepicker";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { startWith, map, Observable } from "rxjs";
import { MatDividerModule } from "@angular/material/divider";
import { MatDialog, MatDialogActions, MatDialogClose, MatDialogContent, MatDialogTitle } from "@angular/material/dialog";
import { MatCardModule } from "@angular/material/card";
import { SnackbarSuccessComponent } from "./snackbar-event.component";

export interface chList {
    Name: string;
    Profession: string;
    Image: string;
}
export interface timeList {
    Timestamp: string;
}
export interface Appointment {
    id: string;
    BookedName: string;
    CoachName: string;
    profession: string;
    date: Date;
    time: string;
    location: string;
    confirmationCode: string;
    notes?: string;
}

@Component({
    selector: "app-createevent",
    standalone: true,
    providers: [provideNativeDateAdapter()],
    imports: [CommonModule, MatDividerModule, MatAutocompleteModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatChipsModule, MatDatepickerModule, ReactiveFormsModule, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose, MatButtonModule],
    template: `
        <h3 mat-dialog-title>Book an Appointment</h3>
        <mat-dialog-content class="pt-2 mat-typography">
            <div class="book-appointment" *ngIf="bookappointment()">
                <mat-form-field appearance="outline" class="w-100">
                    <mat-label>Book for</mat-label>
                    <input type="text" matInput [formControl]="searchControl" [matAutocomplete]="auto" />
                    <mat-autocomplete #auto="matAutocomplete">
                        @for (option of filteredOptions | async; track option) {
                        <mat-option [value]="option">
                            {{ option }}
                        </mat-option>
                        }
                    </mat-autocomplete>
                </mat-form-field>

                <h4 class="mb-3">Select Coach</h4>
                <mat-chip-listbox class="mb-3 doclist" aria-label="Doctors">
                    @for (coach of coachList; track coach.Name) {
                    <mat-chip-option class="px-1">
                        <img matChipAvatar [src]="coach.Image" alt="Profile picture of {{ coach.Name }}" class="" />
                        <div class="">
                            <p class="mb-0">{{ coach.Name }}</p>
                            <p class="text-secondary small fw-normal">{{ coach.Profession }}</p>
                        </div>
                    </mat-chip-option>
                    }
                </mat-chip-listbox>

                <div class="row gx-3">
                    <!-- inline calendar -->
                    <div class="col-12 col-sm-6 col-xl-12 mb-2">
                        <h4 class="mb-3">Select Date</h4>
                        <mat-form-field class="w-100" appearance="outline">
                            <mat-label>Choose a date</mat-label>
                            <input matInput [matDatepicker]="picker" />
                            <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
                            <mat-datepicker [dateClass]="dateClass" #picker></mat-datepicker>
                        </mat-form-field>
                    </div>
                    <!-- appointment timings -->
                    <div class="col-12 col-sm-6 col-xl-12">
                        <h4 class="mb-3">Select Time</h4>
                        <mat-chip-listbox class=" mb-3" aria-label="timeavailable">
                            @for (time of originaltimeList; track time.Timestamp ) {
                            <mat-chip-option class="px-1">
                                {{ time.Timestamp }}
                            </mat-chip-option>
                            }
                        </mat-chip-listbox>
                    </div>
                </div>
            </div>
            <div class="book-appointment" *ngIf="!bookappointment()">
                <mat-card class="bg-light-theme text-theme mb-3 mb-lg-4 theme-green shadow-none">
                    <mat-card-content>
                        <div class="row gx-3 align-items-center">
                            <div class="col-auto"><mat-icon class="material-icons-outlined">check_circle</mat-icon></div>
                            <div class="col">
                                <h4 class="mb-1">Appointment Confirmed</h4>
                            </div>
                        </div>
                    </mat-card-content>
                </mat-card>
                <mat-card class="mb-3 mb-lg-4">
                    <mat-card-content>
                        <div class="row gx-3 align-items-center mb-3 mb-lg-4">
                            <div class="col-auto">
                                <div class="avatar avatar-60 rounded-circle ">
                                    <img src="assets/img/user-2.jpg" alt="" />
                                </div>
                            </div>
                            <div class="col">
                                <h4 class="mb-1">{{ appointment.BookedName }}</h4>
                                <p class="text-secondary small">32 year</p>
                            </div>
                        </div>
                        <div class="row gx-3 mb-3">
                            <div class="col-auto">
                                <div class="avatar avatar-40 bg-light-theme text-theme theme-red rounded">
                                    <mat-icon class="material-icons-outlined">local_hospital</mat-icon>
                                </div>
                            </div>
                            <div class="col">
                                <h4 class="mb-1">{{ appointment.CoachName }}</h4>
                                <p class="text-secondary small">{{ appointment.profession }}</p>
                            </div>
                        </div>

                        <div class="row gx-3 mb-3">
                            <div class="col text-secondary">Date</div>
                            <div class="col-auto text-end">{{ appointment.date | date : "mediumDate" }}</div>
                        </div>

                        <div class="row gx-3 mb-3">
                            <div class="col text-secondary">Time</div>
                            <div class="col-auto text-end">{{ appointment.time }}</div>
                        </div>
                        <div class="row gx-3 mb-3">
                            <div class="col text-secondary">Code</div>
                            <div class="col-auto text-end">{{ appointment.confirmationCode }}</div>
                        </div>
                        <div class="row gx-3 mb-3">
                            <div class="col-3 text-secondary">Location</div>
                            <div class="col text-end">{{ appointment.location }}</div>
                        </div>

                        <div class="text-center">
                            <div class="avatar avatar-100 rounded">
                                <img src="assets/img/qr-code.png" alt="QR Code" />
                            </div>
                        </div>
                    </mat-card-content>
                </mat-card>
            </div>
        </mat-dialog-content>
        <mat-dialog-actions>
            <div class="col">
                <button matButton="elevated" (click)="openSnackBar()" *ngIf="!bookappointment()"><mat-icon class="material-icons-outlined">sms</mat-icon> Send</button>
                <button matButton="filled" (click)="appointmentBooked()" *ngIf="!bookappointment()"><mat-icon class="material-icons-outlined">event</mat-icon> Book New</button>
                <button matButton="filled" (click)="appointmentBooked()" *ngIf="bookappointment()"><mat-icon class="material-icons-outlined">event</mat-icon> Book now</button>
            </div>
            <div class="col-auto">
                <button matButton mat-dialog-close class="theme-red">Cancel</button>
            </div>
        </mat-dialog-actions>
    `,
    styles: [
        `
            .doclist {
                --mat-chip-container-height: 44px;
                --mat-chip-with-avatar-avatar-size: 30px;
                --mat-chip-with-icon-icon-size: 30px;
            }
        `,
    ],
})
export class CreateEventModal {
    // snackbar
    private _snackBar = inject(MatSnackBar);
    durationInSeconds = 5;

    // toggle booking
    bookappointment = signal(true);

    // prebook dates
    dateClass: MatCalendarCellClassFunction<Date> = (cellDate, view) => {
        // Only highligh dates inside the month view.
        if (view === "month") {
            const date = cellDate.getDate();
            // Highlight the 1st and 20th day of each month.
            return date === 1 || date === 20 ? "bg-light-theme text-white theme-orange rounded-circle" : "";
        }

        return "";
    };

    // coach list data
    readonly coachList: chList[] = [
        { Name: "Ms. Renny Seth", Profession: "Business Professional", Image: "assets/img/user-6.jpg" },
        { Name: "Mrs. Jane Smith", Profession: "CEO, Ananata Devloper", Image: "assets/img/user-5.jpg" },
        { Name: "Mr. Sam Wilson", Profession: "Owner and Business Coach", Image: "assets/img/user-3.jpg" },
    ];
    // available time stamps
    readonly originaltimeList: timeList[] = [{ Timestamp: "9:30 AM" }, { Timestamp: "10:30 AM" }, { Timestamp: "11:30 AM" }, { Timestamp: "12:30 PM" }, { Timestamp: "01:30 PM" }, { Timestamp: "02:30 PM" }, { Timestamp: "04:30 PM" }, { Timestamp: "05:00 PM" }, { Timestamp: "05:30 PM" }, { Timestamp: "06:00 PM" }];

    // people contact list
    searchControl = new FormControl("");
    options: string[] = ["John Doe", "Jane Smith", "Michael Johnson", "Emily Davis", "David Wilson", "Sarah Brown", "James Taylor", "Jessica Miller", "Daniel Moore", "Linda Garcia", "Robert Rodriguez", "Susan Martinez"];
    filteredOptions: Observable<string[]>;

    // appointment list
    appointment: Appointment = {
        id: "TICKET-2026-589",
        BookedName: "Michael Johnson",
        CoachName: "Ms. Renny Seth",
        profession: "CEO, Ananata Devloper",
        date: new Date(2025, 6, 15), // July 15, 2025
        time: "10:30 AM",
        location: "Central City Mall, Room 204",
        confirmationCode: "BOOK-42981-A",
    };

    constructor() {
        this.filteredOptions = this.searchControl.valueChanges.pipe(
            startWith(""),
            map((value) => this._filter(value || ""))
        );
    }

    // toggle book appointment view
    appointmentBooked(): void {
        this.bookappointment.update((currentValue) => !currentValue);
    }

    // auto-complete
    private _filter(value: string): string[] {
        const filterValue = value.toLowerCase();
        return this.options.filter((option) => option.toLowerCase().includes(filterValue));
    }
    openSnackBar(): void {
        this._snackBar.openFromComponent(SnackbarSuccessComponent, {
            duration: this.durationInSeconds * 1000,
            horizontalPosition: "end",
            verticalPosition: "top",
            panelClass: ["theme-green"],
        });
    }
}
