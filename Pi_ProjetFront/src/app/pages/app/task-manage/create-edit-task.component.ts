import { Component, Inject, OnInit, signal, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { AbstractControl, FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule, FormControl, ValidationErrors, ValidatorFn } from "@angular/forms";
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from "@angular/material/dialog";
import { MatButtonModule } from "@angular/material/button";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatIconModule } from "@angular/material/icon";
import { MatChipsModule } from "@angular/material/chips";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { MatNativeDateModule } from "@angular/material/core";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { MatTooltipModule } from "@angular/material/tooltip";
import { TaskDependencyService } from "../../../services/TaskService/taskDepdendencyService";

export interface DialogData {
  projectName: string;
  projectId: string | number;
  members: { id: number | null; name: string; title: string; avatarUrl?: string }[];
  parentTasks?: { taskId: number; title: string }[];
  availableTasks?: { taskId: number; title: string }[];
  task?: any; // Pour le mode édition
}

@Component({
  selector: "app-create-edit-task",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatChipsModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSlideToggleModule,
    MatTooltipModule,
  ],
  templateUrl: "./create-edit-task.component.html",
  styleUrls: ["./create-edit-task.component.scss"]
})
export class CreateEditTaskComponent implements OnInit {

  dialogRef = inject(MatDialogRef<CreateEditTaskComponent>);
  fb = inject(FormBuilder);
  data: DialogData = inject(MAT_DIALOG_DATA);
  dependencyService = inject(TaskDependencyService);

  isEdit = signal(false);
  taskForm: FormGroup;
  dependencyTypeControl = new FormControl<'finish_to_start' | 'start_to_start' | 'finish_to_finish'>('finish_to_start');
  selectedDependencies = signal<{ taskId: number; type: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' }[]>([]);

  taskTypes = ["task", "bug", "epic", "story", "subtask"];
  taskPriorities = ["Low", "Medium", "High", "Critical"];
  dependencyTypes = ["finish_to_start", "start_to_start", "finish_to_finish"];

  constructor() {
    this.taskForm = this.fb.group({
      title: ["", [Validators.required, Validators.minLength(3), CreateEditTaskComponent.minWordsValidator(3)]],
      description: ["", [Validators.required, Validators.minLength(10)]],
      type: ["task", Validators.required],
      priority: ["Medium", Validators.required],
      status: ["todo"],
      assignedTo: [null, Validators.required],
      parentTaskId: [null],
      startDate: [""],
      dueDate: [""],
      assignHours: [8, [Validators.required, Validators.min(0)]],
      actualHours: [0, Validators.min(0)],
      dependsOnTaskId: [null],
      isVisibleToAssignees: [true]
    }, { validators: [CreateEditTaskComponent.descriptionRelatedToTitle()] });
  }

  static minWordsValidator(min: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = (control.value ?? "").toString().trim();
      if (!value) return null;
      const words = value.split(/\s+/).filter((w: string) => w.length > 0);
      return words.length < min ? { minWords: { required: min, actual: words.length } } : null;
    };
  }

  static descriptionRelatedToTitle(): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
      const title = (group.get("title")?.value ?? "").toString().toLowerCase();
      const description = (group.get("description")?.value ?? "").toString().toLowerCase();
      if (!title || !description) return null;

      const stopWords = new Set([
        "the","a","an","and","or","but","de","du","des","la","le","les","un","une",
        "of","to","for","in","on","with","by","is","are","be","at","as","et","ou",
        "dans","pour","avec","sur","par","son","sa","ses","ce","cet","cette"
      ]);
      const titleWords = title
        .split(/[^a-zà-ÿ0-9]+/i)
        .filter((w: string) => w.length >= 4 && !stopWords.has(w));

      if (titleWords.length === 0) return null;

      const descText = description;
      const hasMatch = titleWords.some((w: string) => descText.includes(w));
      return hasMatch ? null : { descriptionUnrelated: true };
    };
  }

  ngOnInit() {
    if (this.data.task) {
      this.isEdit.set(true);
      this.populateFormForEdit(this.data.task);
    }
  }

  private populateFormForEdit(task: any) {
    this.taskForm.patchValue({
      title: task.title,
      description: task.description || "",
      type: task.type || "task",
      priority: task.priority || "Medium",
      status: task.status || "todo",
      assignedTo: task.assignedToId || null,
      parentTaskId: task.parentTaskId || null,
      startDate: task.startDate ? task.startDate.split('T')[0] : "",
      dueDate: task.dueDate ? task.dueDate.split('T')[0] : "",
      assignHours: task.assignHours || 8,
      actualHours: task.loggedHours || 0,
      isVisibleToAssignees: task.isVisibleToAssignees !== false
    });
  }

  getTypeIcon(type: string): string {
    const icons: any = {
      task: "task_alt",
      bug: "bug_report",
      epic: "flag",
      story: "description",
      subtask: "subdirectory_arrow_right"
    };
    return icons[type] || "task_alt";
  }

  getInitials(name: string): string {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2);
  }

  getMemberName(id: number | null): string {
    if (!id) return "Non assigné";
    const member = this.data.members.find(m => m.id === id);
    return member?.name || "Non assigné";
  }

  onSubmit() {
    if (this.taskForm.valid) {
      const formValue = this.taskForm.value;
      const result = {
        ...formValue,
        dependencies: this.selectedDependencies()
      };
      this.dialogRef.close(result);
    }
  }

  addDependency() {
    const dependsOnTaskId = this.taskForm.get('dependsOnTaskId')?.value;
    const dependencyType = this.dependencyTypeControl.value;
    if (dependsOnTaskId && dependencyType) {
      const alreadyAdded = this.selectedDependencies().some(d => d.taskId === dependsOnTaskId);
      if (!alreadyAdded) {
        const newDependencies = [
          ...this.selectedDependencies(),
          {
            taskId: dependsOnTaskId,
            type: dependencyType
          }
        ];
        this.selectedDependencies.set(newDependencies);
        this.taskForm.patchValue({ dependsOnTaskId: null });
      }
    }
  }

  removeDependency(taskId: number) {
    const filtered = this.selectedDependencies().filter(d => d.taskId !== taskId);
    this.selectedDependencies.set(filtered);
  }

  getDependencyTaskTitle(taskId: number): string {
    if (!this.data.availableTasks) return `Tâche #${taskId}`;
    const task = this.data.availableTasks.find(t => t.taskId === taskId);
    return task ? `#${taskId} - ${task.title}` : `Tâche #${taskId}`;
  }

  cancel() {
    this.dialogRef.close();
  }
}
