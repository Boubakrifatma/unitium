import { Component, ChangeDetectionStrategy, computed, signal, CUSTOM_ELEMENTS_SCHEMA } from "@angular/core";
import { CommonModule } from "@angular/common";
import { provideNativeDateAdapter } from "@angular/material/core";
import { MatFormField, MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatDividerModule } from "@angular/material/divider";
import { FormsModule } from "@angular/forms";

interface Employee {
    id: number;
    name: string;
    avatarUrl: string; // Placeholder URL
    title: string;
}

@Component({
    selector: "app-employee-select",
    standalone: true,
    imports: [MatSelectModule, MatInputModule, MatDividerModule, MatSelectModule, FormsModule],
    template: ` <mat-form-field class="w-100 inline-small" appearance="outline">
        <mat-select [ngModel]="getMatSelectValue()" (ngModelChange)="handleSelectionChange($event)" multiple placeholder="Select (0/{{ employeeList.length }})">
            <mat-select-trigger>
                @if (selectedEmployees().length> 0 ) {
                <span> {{ getSelectedNames() }} </span>
                }
            </mat-select-trigger>
            <mat-option [value]="ALL_ID" [selected]="isAllSelected()" class="mat-option-all">
                <div class="flex items-center space-x-3 p-1 font-extrabold text-indigo-600 bg-indigo-50 rounded-md">
                    <span class="">
                        {{ isAllSelected() ? "Deselect" : "All" }}
                    </span>
                    <span class="small text-secondary">({{ selectedEmployees().length }}/{{ employeeList.length }})</span>
                </div>
            </mat-option>
            <mat-divider></mat-divider>

            @for (employee of employeeList; track employee.id) {
            <mat-option [value]="employee.id" style="min-height: 54px;">
                <div class="row gx-2 align-items-center">
                    <div class="col-auto">
                        <img [src]="employee.avatarUrl" alt="{{ employee.name }} avatar" class="rounded-circle avatar avatar-30" onerror="this.onerror=null; this.src='https://placehold.co/40x40/ccc/black?text=NA'" />
                    </div>
                    <div class="col maxwidth-dynamic" style="--mw-dynamic:calc(100% - 30px - 0.5rem)">
                        <p class="mb-0 text-truncated">{{ employee.name }}</p>
                        <p class="small text-secondary text-truncated">{{ employee.title }}</p>
                    </div>
                </div>
            </mat-option>
            }
        </mat-select>
    </mat-form-field>`,
    providers: [],
    styles: [``],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class EmployeeSelectComponent {
    // employee list dd
    readonly ALL_ID = 0;
    public employeeList: Employee[] = [
        { id: 1, name: "Ava Johnson", avatarUrl: "assets/img/user-1.jpg", title: "Software Engineer" },
        { id: 2, name: "Ben Smith", avatarUrl: "assets/img/user-3.jpg", title: "Product Manager" },
        { id: 3, name: "Chloe Lee", avatarUrl: "assets/img/user-2.jpg", title: "UX Designer" },
        { id: 4, name: "David Chen", avatarUrl: "assets/img/user-5.jpg", title: "Data Analyst" },
        { id: 5, name: "Ella Garcia", avatarUrl: "assets/img/user-4.jpg", title: "Marketing Specialist" },
        { id: 6, name: "Finn O'Connell", avatarUrl: "assets/img/user-7.jpg", title: "Sales Director" },
        { id: 7, name: "Grace Kim", avatarUrl: "assets/img/user-6.jpg", title: "HR Coordinator" },
        { id: 8, name: "Henry Davis", avatarUrl: "assets/img/user-9.jpg", title: "DevOps Engineer" },
        { id: 9, name: "Ivy Ross", avatarUrl: "assets/img/user-8.jpg", title: "Financial Controller" },
        { id: 10, name: "Jack Miller", avatarUrl: "assets/img/user-9.jpg", title: "CTO" },
    ];
    employeeIds = computed(() => this.employeeList.map((e) => e.id));

    selectedEmployees = signal<number[]>(this.employeeIds());

    isAllSelected = computed(() => this.selectedEmployees().length === this.employeeList.length);
    getMatSelectValue = computed(() => {
        const selected = this.selectedEmployees();
        if (this.isAllSelected()) {
            return [this.ALL_ID, ...selected];
        }
        return selected;
    });

    getSelectedNames(): string {
        const selectedIds = this.selectedEmployees();
        const names = selectedIds.map((id) => this.employeeList.find((e) => e.id === id)?.name);
        return names.join(", ");
    }
    handleSelectionChange(newSelection: number[]) {
        const isAllInNewSelection = newSelection.includes(this.ALL_ID);
        const wasAllSelected = this.isAllSelected();

        if (isAllInNewSelection) {
            this.selectedEmployees.set(this.employeeIds());
        } else if (wasAllSelected && !isAllInNewSelection) {
            this.selectedEmployees.set([]);
        } else {
            const employeeIdsOnly = newSelection.filter((id) => id !== this.ALL_ID);
            this.selectedEmployees.set(employeeIdsOnly);
        }
    }
}
