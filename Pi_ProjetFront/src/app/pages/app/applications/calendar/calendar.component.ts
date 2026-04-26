import { Component, OnInit, AfterViewInit, OnDestroy, signal, inject } from "@angular/core";
import { CommonModule, AsyncPipe } from "@angular/common";
import { FormControl, ReactiveFormsModule } from "@angular/forms";
import { provideNativeDateAdapter } from "@angular/material/core";
import { FullCalendarModule } from "@fullcalendar/angular";
import { CalendarOptions } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listGridPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import dayjs from "dayjs";
import { MatCardModule } from "@angular/material/card";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatChipsModule } from "@angular/material/chips";
import { MatAutocompleteModule } from "@angular/material/autocomplete";
import { MatSnackBar, MatSnackBarAction, MatSnackBarActions, MatSnackBarLabel, MatSnackBarRef } from "@angular/material/snack-bar";
import { MatDialog, MatDialogActions, MatDialogClose, MatDialogContent, MatDialogTitle } from "@angular/material/dialog";
import { MatDatepickerInputEvent, MatCalendarCellClassFunction, MatDatepickerModule } from "@angular/material/datepicker";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { startWith, map, Observable } from "rxjs";
import { MatDividerModule } from "@angular/material/divider";
import { CreateEventModal } from "./createevent.component";
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
    selector: "app-calendar",
    standalone: true,
    providers: [provideNativeDateAdapter()],
    imports: [CommonModule, FullCalendarModule, MatCardModule, MatDividerModule, MatAutocompleteModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatChipsModule, MatDatepickerModule, ReactiveFormsModule],
    template: `
        <div class="container-fluid fade-in mb-3 mb-lg-4">
            <mat-card class="bg-light-theme shadow-none pt-3 pb-lg-3 px-3">
                <div class="row gx-3 align-items-center">
                    <div class="col mb-3 mb-xl-0 py-1">
                        <h3 class="mb-1">Calendar</h3>
                        <p class="text-secondary small">Manage and create appointments</p>
                    </div>

                    <div class="col-auto mb-3 mb-xl-0">
                        <button matButton="filled" (click)="openDialog()"><mat-icon class="material-icons-outlined">edit_calendar</mat-icon> Book</button>
                    </div>
                </div>
            </mat-card>
        </div>

        <!-- content -->
        <div class="container fade-in">
            <!-- full calendar view -->
            <div class="row mb-4">
                <div class="col-12 col-md-12 col-xl">
                    <div class="row gx-3 gx-lg-4">
                        <!-- Total bookings -->
                        <div class="col-6 col-sm-3 col-lg-3 col-xl-3">
                            <mat-card class="bg-light-theme mb-3 mb-lg-4 theme-cyan">
                                <mat-card-content>
                                    <div class="row gx-3">
                                        <div class="col-auto">
                                            <div class="avatar avatar-40 text-center rounded text-white bg-theme">
                                                <mat-icon class="material-icons-outlined">event</mat-icon>
                                            </div>
                                        </div>
                                        <div class="col">
                                            <h4 class="mb-1">1320</h4>
                                            <p class="text-secondary small">Booking</p>
                                        </div>
                                    </div>
                                </mat-card-content>
                            </mat-card>
                        </div>
                        <!-- Total Staff -->
                        <div class="col-6 col-sm-3 col-lg-3 col-xl-3">
                            <mat-card class="bg-light-theme mb-3 mb-lg-4 theme-orange">
                                <mat-card-content>
                                    <div class="row gx-3">
                                        <div class="col-auto">
                                            <div class="avatar avatar-40 text-center rounded text-white bg-theme">
                                                <mat-icon class="material-icons-outlined">account_balance</mat-icon>
                                            </div>
                                        </div>
                                        <div class="col">
                                            <h4 class="mb-1">20</h4>
                                            <p class="text-secondary small">Funds</p>
                                        </div>
                                    </div>
                                </mat-card-content>
                            </mat-card>
                        </div>
                        <!-- Total Rooms occupied -->
                        <div class="col-6 col-sm-3 col-lg-3 col-xl-3">
                            <mat-card class="bg-light-theme mb-3 mb-lg-4 theme-violet">
                                <mat-card-content>
                                    <div class="row gx-3">
                                        <div class="col-auto">
                                            <div class="avatar avatar-40 text-center rounded text-white bg-theme">
                                                <mat-icon class="material-icons-outlined">group</mat-icon>
                                            </div>
                                        </div>
                                        <div class="col">
                                            <h4 class="mb-1">1320</h4>
                                            <p class="text-secondary small">Clients</p>
                                        </div>
                                    </div>
                                </mat-card-content>
                            </mat-card>
                        </div>
                        <!-- Total online appointment -->
                        <div class="col-6 col-sm-3 col-lg-3 col-xl-3">
                            <div class="card adminuiux-card">
                                <mat-card class="bg-light-theme mb-3 mb-lg-4 theme-blue">
                                    <mat-card-content>
                                        <div class="row gx-3">
                                            <div class="col-auto">
                                                <div class="avatar avatar-40 text-center rounded text-white bg-theme">
                                                    <mat-icon class="material-icons-outlined">apartment</mat-icon>
                                                </div>
                                            </div>
                                            <div class="col">
                                                <h4 class="mb-1">820</h4>
                                                <p class="text-secondary small">Partners</p>
                                            </div>
                                        </div>
                                    </mat-card-content>
                                </mat-card>
                            </div>
                        </div>
                    </div>
                    <!-- Calendar Third party -->
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-content>
                            <full-calendar [options]="calendarOptions"></full-calendar>
                        </mat-card-content>
                    </mat-card>
                </div>
                <!-- book appointment and summary -->
                <div class="col-12 col-md-12 col-xl-3 ">
                    <div class="book-appointment" *ngIf="bookappointment()">
                        <h4 class="mb-3">Book an appointment</h4>
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
                        <mat-chip-listbox class="mat-mdc-chip-set-stacked mb-3 doclist" aria-label="Doctors">
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
                            <div class="col-12 col-sm-6 col-xl-12 mb-0 mb-lg-1">
                                <h4 class="mb-3">Select Date</h4>
                                <mat-form-field class="w-100 mb-3" appearance="outline">
                                    <mat-label>Choose a date</mat-label>
                                    <input matInput [matDatepicker]="picker" />
                                    <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
                                    <mat-datepicker [dateClass]="dateClass" #picker></mat-datepicker>
                                </mat-form-field>
                            </div>
                            <!-- appointment timings -->
                            <div class="col-12 col-sm-6 col-xl-12 mb-3 mb-lg-4">
                                <h4 class="mb-3">Select Time</h4>
                                <mat-chip-listbox class=" mb-3" aria-label="timeavailable">
                                    @for (time of originaltimeList; track time.Timestamp ) {
                                    <mat-chip-option class="px-1">
                                        {{ time.Timestamp }}
                                    </mat-chip-option>
                                    }
                                </mat-chip-listbox>
                                <!-- create button -->
                                <button matButton="filled" class="w-100" (click)="appointmentBooked()"><mat-icon class="material-icons-outlined">event</mat-icon> Book now</button>
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
                                <div class="text-center mb-3 mb-lg-4">
                                    <div class="avatar avatar-100 rounded-circle mb-3">
                                        <img src="assets/img/user-2.jpg" alt="" />
                                    </div>
                                    <h4 class="mb-1">{{ appointment.BookedName }}</h4>
                                    <p class="text-secondary small">32 year</p>
                                </div>

                                <mat-divider class="mb-3 mb-lg-4"></mat-divider>

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
                        <div class="row gx-3 mb-3 mb-lg-4">
                            <div class="col">
                                <button matButton="elevated" (click)="openSnackBar()" class="w-100"><mat-icon class="material-icons-outlined">sms</mat-icon> Send</button>
                            </div>
                            <div class="col">
                                <!-- re-create button -->
                                <button matButton="filled" class="w-100" (click)="appointmentBooked()"><mat-icon class="material-icons-outlined">event</mat-icon> Book New</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
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
export class CalendarComponent implements OnDestroy {
    // snackbar
    private _snackBar = inject(MatSnackBar);
    durationInSeconds = 5;

    // dialog
    readonly dialog = inject(MatDialog);
    private clickTimeout: any = null;

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

    //fullcalaendar
    currentday = dayjs().get("date");
    thismonth = dayjs().format("MM");
    thisyear = dayjs().format("YYYY");
    calendarOptions: CalendarOptions = {
        plugins: [dayGridPlugin, interactionPlugin, timeGridPlugin, listGridPlugin],
        initialView: "dayGridMonth",
        height: "auto",
        headerToolbar: {
            // left: 'prev,next myCustomButton',
            left: "title",
            center: "",
            right: "today dayGridMonth,timeGridWeek,timeGridDay prev,next",
        },
        weekends: true,
        events: [
            {
                title: "All Day Event",
                className: "bg-light-theme text-theme theme-green",
                date: this.thisyear + "-" + this.thismonth + "-01",
                description: "Lecture",
            },
            {
                title: "Long Event",
                className: "bg-light-theme text-theme theme-green",
                date: this.thisyear + "-" + this.thismonth + "-07",
                end: this.thisyear + "-" + this.thismonth + "-10",
            },
            {
                className: "bg-theme text-white theme-blue",
                title: '<p class="mb-1 small">16:00 am <span class="badge badge-small theme-green m-1">Paid</span ></p><div class="row gx-2 mb-1"><div class="col-auto mb-1"><img src="assets/img/user-4.jpg" class="avatar avatar-20 rounded-circle" alt=""> <img src="https://i.pravatar.cc/300" class="avatar avatar-20 rounded-circle" alt=""></div> <div class="col">Will Johnson</div></div><p class="mb-0 opacity-75 small text-truncated" >Investment Module understanding</p>',
                date: this.thisyear + "-" + this.thismonth + "-09T16:00:00",
            },
            {
                title: "Repeating Event",
                className: "bg-cyan-subtle",
                date: this.thisyear + "-" + this.thismonth + "-16T16:00:00",
            },
            {
                title: '<p class="mb-1 small">09:00 am - 12:00 pm </p><div class="row gx-2 mb-1 align-items-center"><div class="col-auto"><mat-icon class="material-icons">apartment</mat-icon></div><div class="col"><h4>Evolution of era</h4></div></div><p class="mb-0 opacity-75 small text-truncated" >Conference</p>',
                className: "bg-light-theme theme-orange",
                date: this.thisyear + "-" + this.thismonth + "-11",
                end: this.thisyear + "-" + this.thismonth + "-13",
            },
            {
                title: "Meeting",
                className: "bg-theme text-white theme-red",
                date: this.thisyear + "-" + this.thismonth + "-12T10:30:00",
                end: this.thisyear + "-" + this.thismonth + "-10T12:30:00",
            },
            {
                title: "Lunch",
                className: "bg-purple-subtle",
                date: this.thisyear + "-" + this.thismonth + "-" + this.currentday + "T04:00:00",
            },
            {
                title: '<p class="mb-1 small">10:30 am, 2hr</p><div class="row gx-2 mb-1 align-items-center"><div class="col-auto"><mat-icon class="material-icons">apartment</mat-icon></div><div class="col">Evolution of era</div></div><p class="mb-0 opacity-75 small text-truncated" >Meeting</p>',
                className: "bg-light-theme text-theme theme-orange",
                date: this.thisyear + "-" + this.thismonth + "-" + this.currentday + "T10:30:00",
            },
            {
                title: "Happy Hour",
                className: "bg-green-subtle",
                date: this.thisyear + "-" + this.thismonth + "-" + this.currentday + "T12:30:00",
            },
            {
                title: '<p class="mb-1 small">16:00 am</p><div class="row gx-2 mb-1"><div class="col-auto"><img src="assets/img/user-6.jpg" class="avatar avatar-20 rounded-circle" alt=""> </div> <div class="col">Will Johnson</div></div><p class="mb-0 opacity-75 small text-truncated" >Investment Module understanding</p>',
                className: "bg-light-theme theme-cyan",
                date: this.thisyear + "-" + this.thismonth + "-10T20:00:00",
            },
            {
                title: '<span class="position-absolute top-0 end-0 badge bg-danger p-1 m-1"><small>Unpaid</small></span ><p class="mb-1 small">7:00 am</p><div class="row gx-2"><div  class="col-auto"><img src="assets/img/user-7.jpg" class="avatar avatar-20 rounded-circle" alt=""> </div> <div class="col">Rickie Birthday</div></div><p class="mb-0 opacity-75 small text-truncated" >Birthday Celebration</p>',
                className: "bg-theme text-white theme-red",
                date: this.thisyear + "-" + this.thismonth + "-" + this.currentday + "T07:00:00",
            },
            {
                title: "Click for Google",
                className: "bg-primary-subtle",
                url: "http://google.com/",
                date: this.thisyear + "-" + this.thismonth + "-28",
            },
        ],
        eventContent: function (info) {
            return {
                html: info.event.title,
            };
        },
        dateClick: this.handleDateClick.bind(this), // Handle date clicks
    };

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

    openDialog() {
        this.dialog.open(CreateEventModal, {
            width: "450px",
            panelClass: "custom-dialog-container",
            autoFocus: false,
        });
    }

    openSnackBar(): void {
        this._snackBar.openFromComponent(SnackbarSuccessComponent, {
            duration: this.durationInSeconds * 1000,
            horizontalPosition: "end",
            verticalPosition: "top",
            panelClass: ["theme-green"],
        });
    }

    // calendar cell click
    handleDateClick(arg: any) {
        // console.log("date click! " + arg.dateStr);
        if (this.clickTimeout) {
            clearTimeout(this.clickTimeout);
            this.clickTimeout = null;
            this.dialog.open(CreateEventModal, {
                width: "450px",
                panelClass: "custom-dialog-container",
                autoFocus: false,
            });
        } else {
            this.clickTimeout = setTimeout(() => {
                this.clickTimeout = null;
            }, 250);
        }
    }

    ngOnDestroy(): void {
        if (this.clickTimeout !== null) {
            clearTimeout(this.clickTimeout);
        }
    }
}
