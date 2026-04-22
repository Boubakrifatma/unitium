import {
  Component, OnInit, inject, signal, computed, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  CdkDragDrop, DragDropModule,
  moveItemInArray, transferArrayItem
} from '@angular/cdk/drag-drop';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';

/* ── Domain models ──────────────────────────────────────────── */
export interface StickyNote {
  id: string;
  text: string;
  color: string;
  x: number;
  y: number;
  rotation: number;
  editMode: boolean;
}

export interface MatrixTask {
  id: string;
  title: string;
  priority: 'low' | 'medium' | 'high';
  quadrant: 'q1' | 'q2' | 'q3' | 'q4';
}

/* ── Color palette ──────────────────────────────────────────── */
const NOTE_COLORS: { key: string; bg: string; label: string }[] = [
  { key: 'yellow', bg: '#fef08a', label: 'Yellow' },
  { key: 'blue',   bg: '#bae6fd', label: 'Blue'   },
  { key: 'green',  bg: '#bbf7d0', label: 'Green'  },
  { key: 'pink',   bg: '#fbcfe8', label: 'Pink'   },
  { key: 'purple', bg: '#e9d5ff', label: 'Purple' },
];

const COLOR_MAP: Record<string, string> = {
  yellow: '#fef08a',
  blue:   '#bae6fd',
  green:  '#bbf7d0',
  pink:   '#fbcfe8',
  purple: '#e9d5ff',
};

const STORAGE_NOTES_KEY  = 'brainstorm-notes';
const STORAGE_MATRIX_KEY = 'brainstorm-matrix';

@Component({
  selector: 'app-brainstorming',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule, RouterLink,
    DragDropModule,
    MatCardModule, MatIconModule, MatButtonModule,
    MatInputModule, MatFormFieldModule,
    MatSnackBarModule, MatTooltipModule,
  ],
  template: `
<!-- ══════════════════════════════════════════════════════════════
     PAGE HEADER
══════════════════════════════════════════════════════════════ -->
<div class="bs-page-header">
  <div class="bs-header-inner">
    <div class="bs-header-title-group">
      <div class="bs-header-icon">
        <mat-icon class="material-icons-outlined">psychology</mat-icon>
      </div>
      <div>
        <h2 class="bs-page-title">Brainstorming Workspace</h2>
        <p class="bs-breadcrumb">
          <span routerLink="/app/dashboard" class="bs-bc-link">
            <mat-icon class="material-icons-outlined bs-bc-icon">house</mat-icon> Home
          </span>
          <mat-icon class="material-icons-outlined bs-bc-sep">chevron_right</mat-icon>
          <span class="bs-bc-current">Brainstorming</span>
        </p>
      </div>
    </div>
  </div>
</div>

<!-- ══════════════════════════════════════════════════════════════
     MAIN WORKSPACE
══════════════════════════════════════════════════════════════ -->
<div class="bs-workspace">

  <!-- ─────────────────────────────────────────────────────────
       LEFT PANEL — Sticky Notes Board (60%)
  ───────────────────────────────────────────────────────────── -->
  <div class="bs-panel bs-panel-notes">

    <!-- Panel header -->
    <div class="bs-panel-header">
      <div class="bs-panel-title-row">
        <mat-icon class="material-icons-outlined bs-panel-icon" style="color:#f59e0b">sticky_note_2</mat-icon>
        <h3 class="bs-panel-title">Sticky Notes</h3>
        <span class="bs-panel-count">{{ notes().length }}</span>
      </div>

      <!-- Controls: color picker + add button -->
      <div class="bs-notes-controls">
        <div class="bs-color-chips">
          @for (c of noteColors; track c.key) {
            <button
              class="bs-color-chip"
              [style.background]="c.bg"
              [class.bs-color-chip-active]="selectedColor === c.key"
              [matTooltip]="c.label"
              (click)="selectedColor = c.key">
              @if (selectedColor === c.key) {
                <mat-icon class="material-icons-outlined bs-chip-check">check</mat-icon>
              }
            </button>
          }
        </div>
        <button mat-flat-button class="bs-add-note-btn" (click)="addNote()">
          <mat-icon class="material-icons-outlined">add</mat-icon>
          Note
        </button>
      </div>
    </div>

    <!-- Notes board (free-position drag area) -->
    <div class="bs-notes-board" #noteBoard>

      @if (notes().length === 0) {
        <div class="bs-notes-empty">
          <mat-icon class="material-icons-outlined bs-empty-icon">sticky_note_2</mat-icon>
          <p>Aucune note. Cliquez sur <strong>+ Note</strong> pour commencer.</p>
        </div>
      }

      @for (note of notes(); track note.id) {
        <div
          class="bs-sticky"
          cdkDrag
          cdkDragBoundary=".bs-notes-board"
          [style.left.px]="note.x"
          [style.top.px]="note.y"
          [style.background]="getNoteColor(note.color)"
          [style.transform]="'rotate(' + note.rotation + 'deg)'"
          (cdkDragEnded)="onNoteDragEnd($event, note.id)"
          (dblclick)="deleteNote(note.id)">

          <!-- Note controls -->
          <div class="bs-sticky-toolbar">
            <span class="bs-sticky-drag-handle" cdkDragHandle>
              <mat-icon class="material-icons-outlined" style="font-size:14px">drag_indicator</mat-icon>
            </span>
            <button class="bs-sticky-delete" (click)="deleteNote(note.id)" matTooltip="Supprimer (double-clic aussi)">
              <mat-icon class="material-icons-outlined" style="font-size:14px">close</mat-icon>
            </button>
          </div>

          <!-- Note content -->
          @if (note.editMode) {
            <textarea
              class="bs-sticky-textarea"
              [ngModel]="note.text"
              (ngModelChange)="updateNote(note.id, $event)"
              (blur)="exitEditMode(note.id)"
              placeholder="Écrivez votre idée..."
              rows="4"
              autofocus>
            </textarea>
          } @else {
            <div class="bs-sticky-text"
                 (click)="enterEditMode(note.id)">
              {{ note.text || 'Cliquez pour éditer…' }}
            </div>
          }

        </div>
      }

    </div><!-- /.bs-notes-board -->
  </div><!-- /.bs-panel-notes -->

  <!-- ─────────────────────────────────────────────────────────
       RIGHT PANEL — Eisenhower Matrix (40%)
  ───────────────────────────────────────────────────────────── -->
  <div class="bs-panel bs-panel-matrix">

    <!-- Panel header -->
    <div class="bs-panel-header">
      <div class="bs-panel-title-row">
        <mat-icon class="material-icons-outlined bs-panel-icon" style="color:#6366f1">grid_view</mat-icon>
        <h3 class="bs-panel-title">Eisenhower Matrix</h3>
        <span class="bs-panel-count">{{ matrixTasks().length }}</span>
      </div>

      <!-- Add task to matrix -->
      <div class="bs-matrix-add-row">
        <mat-form-field appearance="outline" class="bs-matrix-input">
          <mat-label>Nouvelle tâche</mat-label>
          <input matInput
                 [(ngModel)]="newTaskTitle"
                 placeholder="Ex: Préparer la démo..."
                 (keydown.enter)="addToMatrix()" />
          <mat-icon matPrefix class="material-icons-outlined">add_task</mat-icon>
        </mat-form-field>
        <button mat-flat-button class="bs-matrix-add-btn" (click)="addToMatrix()"
                [disabled]="!newTaskTitle.trim()">
          <mat-icon class="material-icons-outlined">add</mat-icon>
          Ajouter
        </button>
      </div>
    </div>

    <!-- 2×2 grid -->
    <div class="bs-matrix-grid" cdkDropListGroup>

      <!-- Q1: DO NOW (Urgent + Important) -->
      <div class="bs-quadrant bs-q1">
        <div class="bs-quadrant-label">
          <mat-icon class="material-icons-outlined bs-q-icon">flash_on</mat-icon>
          <div>
            <span class="bs-q-title">DO NOW</span>
            <span class="bs-q-sub">Urgent + Important</span>
          </div>
        </div>
        <div class="bs-drop-zone"
             cdkDropList
             id="q1"
             [cdkDropListData]="getTasksForQuadrant('q1')"
             [cdkDropListConnectedTo]="['q2','q3','q4']"
             (cdkDropListDropped)="moveInMatrix($event, 'q1')">
          @for (task of getTasksForQuadrant('q1'); track task.id) {
            <ng-container *ngTemplateOutlet="taskCard; context: { $implicit: task }"></ng-container>
          }
          @if (getTasksForQuadrant('q1').length === 0) {
            <div class="bs-drop-hint">Déposez ici</div>
          }
        </div>
      </div>

      <!-- Q2: SCHEDULE (Not Urgent + Important) -->
      <div class="bs-quadrant bs-q2">
        <div class="bs-quadrant-label">
          <mat-icon class="material-icons-outlined bs-q-icon">calendar_month</mat-icon>
          <div>
            <span class="bs-q-title">SCHEDULE</span>
            <span class="bs-q-sub">Pas urgent + Important</span>
          </div>
        </div>
        <div class="bs-drop-zone"
             cdkDropList
             id="q2"
             [cdkDropListData]="getTasksForQuadrant('q2')"
             [cdkDropListConnectedTo]="['q1','q3','q4']"
             (cdkDropListDropped)="moveInMatrix($event, 'q2')">
          @for (task of getTasksForQuadrant('q2'); track task.id) {
            <ng-container *ngTemplateOutlet="taskCard; context: { $implicit: task }"></ng-container>
          }
          @if (getTasksForQuadrant('q2').length === 0) {
            <div class="bs-drop-hint">Déposez ici</div>
          }
        </div>
      </div>

      <!-- Q3: DELEGATE (Urgent + Not Important) -->
      <div class="bs-quadrant bs-q3">
        <div class="bs-quadrant-label">
          <mat-icon class="material-icons-outlined bs-q-icon">people</mat-icon>
          <div>
            <span class="bs-q-title">DELEGATE</span>
            <span class="bs-q-sub">Urgent + Pas important</span>
          </div>
        </div>
        <div class="bs-drop-zone"
             cdkDropList
             id="q3"
             [cdkDropListData]="getTasksForQuadrant('q3')"
             [cdkDropListConnectedTo]="['q1','q2','q4']"
             (cdkDropListDropped)="moveInMatrix($event, 'q3')">
          @for (task of getTasksForQuadrant('q3'); track task.id) {
            <ng-container *ngTemplateOutlet="taskCard; context: { $implicit: task }"></ng-container>
          }
          @if (getTasksForQuadrant('q3').length === 0) {
            <div class="bs-drop-hint">Déposez ici</div>
          }
        </div>
      </div>

      <!-- Q4: ELIMINATE (Not Urgent + Not Important) -->
      <div class="bs-quadrant bs-q4">
        <div class="bs-quadrant-label">
          <mat-icon class="material-icons-outlined bs-q-icon">delete_sweep</mat-icon>
          <div>
            <span class="bs-q-title">ELIMINATE</span>
            <span class="bs-q-sub">Pas urgent + Pas important</span>
          </div>
        </div>
        <div class="bs-drop-zone"
             cdkDropList
             id="q4"
             [cdkDropListData]="getTasksForQuadrant('q4')"
             [cdkDropListConnectedTo]="['q1','q2','q3']"
             (cdkDropListDropped)="moveInMatrix($event, 'q4')">
          @for (task of getTasksForQuadrant('q4'); track task.id) {
            <ng-container *ngTemplateOutlet="taskCard; context: { $implicit: task }"></ng-container>
          }
          @if (getTasksForQuadrant('q4').length === 0) {
            <div class="bs-drop-hint">Déposez ici</div>
          }
        </div>
      </div>

    </div><!-- /.bs-matrix-grid -->
  </div><!-- /.bs-panel-matrix -->

</div><!-- /.bs-workspace -->

<!-- ── Shared task card template ─────────────────────────────── -->
<ng-template #taskCard let-task>
  <div class="bs-task-card" cdkDrag>
    <div class="bs-task-card-header">
      <div class="bs-priority-dot" [attr.data-priority]="task.priority"></div>
      <span class="bs-task-title">{{ task.title }}</span>
      <button class="bs-task-delete" (click)="removeFromMatrix(task.id)" matTooltip="Supprimer">
        <mat-icon class="material-icons-outlined" style="font-size:13px">close</mat-icon>
      </button>
    </div>
    <div class="bs-task-actions">
      <span class="bs-task-priority-badge" [attr.data-priority]="task.priority">
        {{ task.priority | titlecase }}
      </span>
      <div class="d-flex gap-1">
        <button class="bs-prio-btn" (click)="cyclePriority(task.id)" matTooltip="Changer priorité">
          <mat-icon class="material-icons-outlined" style="font-size:12px">swap_vert</mat-icon>
        </button>
        <button class="bs-create-task-btn" (click)="requestCreateTask(task)" matTooltip="Créer la tâche">
          <mat-icon class="material-icons-outlined" style="font-size:12px">add_circle</mat-icon>
          Créer
        </button>
      </div>
    </div>
  </div>
</ng-template>
  `,
  styles: [`
    /* ══════════════════════════════════════════════════════════
       HOST
    ══════════════════════════════════════════════════════════ */
    :host { display: block; font-family: 'Inter', sans-serif; }

    /* ══════════════════════════════════════════════════════════
       PAGE HEADER
    ══════════════════════════════════════════════════════════ */
    .bs-page-header {
      background: #fff;
      border-bottom: 1px solid #e2e8f0;
      padding: 14px 20px 12px;
      margin-bottom: 0;
    }
    .bs-header-inner { max-width: 100%; }
    .bs-header-title-group {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .bs-header-icon {
      width: 44px; height: 44px;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      color: #fff;
      flex-shrink: 0;
    }
    .bs-header-icon mat-icon { font-size: 22px; }
    .bs-page-title {
      margin: 0;
      font-size: 1.15rem;
      font-weight: 700;
      color: #1e293b;
    }
    .bs-breadcrumb {
      margin: 2px 0 0;
      font-size: 0.78rem;
      color: #94a3b8;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .bs-bc-link {
      display: flex; align-items: center; gap: 3px;
      color: #6366f1; cursor: pointer; text-decoration: none;
      &:hover { text-decoration: underline; }
    }
    .bs-bc-icon { font-size: 14px !important; width: 14px !important; height: 14px !important; }
    .bs-bc-sep  { font-size: 14px !important; width: 14px !important; height: 14px !important; color: #cbd5e1; }
    .bs-bc-current { color: #64748b; }

    /* ══════════════════════════════════════════════════════════
       WORKSPACE LAYOUT
    ══════════════════════════════════════════════════════════ */
    .bs-workspace {
      display: flex;
      gap: 0;
      height: calc(100vh - 120px);
      overflow: hidden;
    }

    /* ══════════════════════════════════════════════════════════
       PANELS
    ══════════════════════════════════════════════════════════ */
    .bs-panel {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    }
    .bs-panel-notes  { flex: 0 0 60%; border-right: 2px solid #e2e8f0; background: #f8fafc; }
    .bs-panel-matrix { flex: 0 0 40%; background: #fff; }

    .bs-panel-header {
      padding: 14px 16px 10px;
      background: #fff;
      border-bottom: 1px solid #e2e8f0;
      flex-shrink: 0;
    }
    .bs-panel-title-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 10px;
    }
    .bs-panel-icon {
      font-size: 20px !important; width: 20px !important; height: 20px !important;
    }
    .bs-panel-title {
      font-size: 1rem;
      font-weight: 700;
      color: #1e293b;
      margin: 0;
    }
    .bs-panel-count {
      background: #f1f5f9;
      color: #64748b;
      font-size: 0.72rem;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 10px;
    }

    /* ══════════════════════════════════════════════════════════
       NOTES CONTROLS
    ══════════════════════════════════════════════════════════ */
    .bs-notes-controls {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .bs-color-chips {
      display: flex;
      gap: 6px;
    }
    .bs-color-chip {
      width: 26px; height: 26px;
      border-radius: 50%;
      border: 2px solid transparent;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: border-color 0.15s, transform 0.15s;
      &:hover { transform: scale(1.15); }
    }
    .bs-color-chip-active { border-color: #1e293b; transform: scale(1.1); }
    .bs-chip-check {
      font-size: 14px !important; width: 14px !important; height: 14px !important;
      color: #1e293b;
    }
    .bs-add-note-btn {
      background: #6366f1 !important;
      color: #fff !important;
      border-radius: 8px !important;
      font-size: 0.8rem !important;
      height: 34px !important;
      line-height: 34px !important;
      padding: 0 14px !important;
    }

    /* ══════════════════════════════════════════════════════════
       NOTES BOARD
    ══════════════════════════════════════════════════════════ */
    .bs-notes-board {
      flex: 1;
      position: relative;
      overflow: hidden;
      min-height: 300px;
    }
    .bs-notes-empty {
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      color: #94a3b8;
    }
    .bs-empty-icon {
      font-size: 48px !important; width: 48px !important; height: 48px !important;
      color: #cbd5e1;
      margin-bottom: 8px;
    }

    /* ── Sticky note ──────────────────────────────────────────── */
    .bs-sticky {
      position: absolute;
      width: 180px;
      min-height: 140px;
      border-radius: 4px 4px 4px 0;
      box-shadow:
        3px 3px 8px rgba(0,0,0,0.12),
        0 1px 2px rgba(0,0,0,0.08);
      padding: 8px;
      cursor: move;
      transition: box-shadow 0.2s;
      z-index: 1;

      &:hover {
        box-shadow:
          5px 5px 16px rgba(0,0,0,0.18),
          0 2px 4px rgba(0,0,0,0.1);
        z-index: 10;
      }

      /* folded corner */
      &::after {
        content: '';
        position: absolute;
        bottom: 0; right: 0;
        width: 0; height: 0;
        border-style: solid;
        border-width: 0 0 14px 14px;
        border-color: transparent transparent rgba(0,0,0,0.12) transparent;
      }
    }

    .bs-sticky-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 6px;
      opacity: 0.4;
      transition: opacity 0.15s;

      .bs-sticky:hover & { opacity: 1; }
    }

    .bs-sticky-drag-handle {
      cursor: grab;
      display: flex; align-items: center;
      color: rgba(0,0,0,0.5);
    }

    .bs-sticky-delete {
      background: none;
      border: none;
      cursor: pointer;
      display: flex; align-items: center;
      color: rgba(0,0,0,0.5);
      padding: 0;
      border-radius: 4px;
      &:hover { color: #ef4444; background: rgba(239,68,68,0.1); }
    }

    .bs-sticky-text {
      font-family: 'Caveat', 'Comic Sans MS', cursive, sans-serif;
      font-size: 0.95rem;
      line-height: 1.5;
      color: #1e293b;
      cursor: text;
      min-height: 80px;
      word-break: break-word;
      white-space: pre-wrap;
    }

    .bs-sticky-textarea {
      width: 100%;
      background: transparent;
      border: none;
      outline: none;
      resize: none;
      font-family: 'Caveat', 'Comic Sans MS', cursive, sans-serif;
      font-size: 0.95rem;
      line-height: 1.5;
      color: #1e293b;
      min-height: 80px;
    }

    /* ══════════════════════════════════════════════════════════
       MATRIX CONTROLS
    ══════════════════════════════════════════════════════════ */
    .bs-matrix-add-row {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .bs-matrix-input {
      flex: 1;
      font-size: 0.82rem;
    }
    .bs-matrix-add-btn {
      background: #6366f1 !important;
      color: #fff !important;
      border-radius: 8px !important;
      font-size: 0.8rem !important;
      height: 40px !important;
      line-height: 40px !important;
      padding: 0 14px !important;
      white-space: nowrap;
      flex-shrink: 0;
    }

    /* ══════════════════════════════════════════════════════════
       MATRIX GRID
    ══════════════════════════════════════════════════════════ */
    .bs-matrix-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr 1fr;
      flex: 1;
      overflow: hidden;
    }

    .bs-quadrant {
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border: 1px solid rgba(0,0,0,0.06);
    }

    .bs-q1 { background: #fff1f2; } /* red tint — DO NOW */
    .bs-q2 { background: #eff6ff; } /* blue tint — SCHEDULE */
    .bs-q3 { background: #fffbeb; } /* amber tint — DELEGATE */
    .bs-q4 { background: #f8fafc; } /* gray tint — ELIMINATE */

    .bs-quadrant-label {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 10px 6px;
      border-bottom: 1px solid rgba(0,0,0,0.06);
      flex-shrink: 0;
    }
    .bs-q-icon {
      font-size: 18px !important; width: 18px !important; height: 18px !important;
    }
    .bs-q1 .bs-q-icon { color: #ef4444; }
    .bs-q2 .bs-q-icon { color: #3b82f6; }
    .bs-q3 .bs-q-icon { color: #f59e0b; }
    .bs-q4 .bs-q-icon { color: #94a3b8; }

    .bs-q-title {
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      display: block;
    }
    .bs-q1 .bs-q-title { color: #b91c1c; }
    .bs-q2 .bs-q-title { color: #1d4ed8; }
    .bs-q3 .bs-q-title { color: #a16207; }
    .bs-q4 .bs-q-title { color: #475569; }

    .bs-q-sub {
      font-size: 0.67rem;
      color: #94a3b8;
      font-weight: 400;
    }

    /* Drop zone inside each quadrant */
    .bs-drop-zone {
      flex: 1;
      overflow-y: auto;
      padding: 6px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-height: 60px;
      transition: background 0.15s;
    }

    .bs-drop-zone::-webkit-scrollbar { width: 4px; }
    .bs-drop-zone::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 2px; }

    .bs-drop-zone.cdk-drop-list-dragging { background: rgba(99,102,241,0.05); }

    .bs-drop-hint {
      font-size: 0.72rem;
      color: #cbd5e1;
      text-align: center;
      padding: 10px 0;
      border: 1px dashed #e2e8f0;
      border-radius: 6px;
    }

    /* ── Task card in matrix ─────────────────────────────────── */
    .bs-task-card {
      background: #fff;
      border-radius: 7px;
      box-shadow: 0 1px 3px rgba(15,23,42,0.08);
      padding: 7px 8px;
      cursor: grab;
      transition: box-shadow 0.15s, transform 0.15s;
      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 10px rgba(15,23,42,0.12);
      }
    }

    .bs-task-card-header {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 5px;
    }

    .bs-priority-dot {
      width: 8px; height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
      &[data-priority="high"]     { background: #f97316; }
      &[data-priority="medium"]   { background: #f59e0b; }
      &[data-priority="low"]      { background: #10b981; }
    }

    .bs-task-title {
      font-size: 0.78rem;
      font-weight: 600;
      color: #1e293b;
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .bs-task-delete {
      background: none; border: none; cursor: pointer;
      display: flex; align-items: center;
      color: #cbd5e1; padding: 0;
      border-radius: 4px;
      &:hover { color: #ef4444; }
    }

    .bs-task-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .bs-task-priority-badge {
      font-size: 0.63rem;
      font-weight: 700;
      text-transform: uppercase;
      padding: 1px 6px;
      border-radius: 8px;
      &[data-priority="high"]   { background: rgba(249,115,22,0.12); color: #c2410c; }
      &[data-priority="medium"] { background: rgba(245,158,11,0.12); color: #a16207; }
      &[data-priority="low"]    { background: rgba(16,185,129,0.12); color: #047857; }
    }

    .bs-prio-btn, .bs-create-task-btn {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 5px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 2px;
      font-size: 0.68rem;
      font-weight: 600;
      color: #475569;
      padding: 2px 6px;
      transition: background 0.15s, color 0.15s;
      &:hover { background: #e2e8f0; }
    }

    .bs-create-task-btn {
      background: rgba(99,102,241,0.08);
      border-color: rgba(99,102,241,0.3);
      color: #4f46e5;
      &:hover { background: #6366f1; color: #fff; }
    }

    /* CDK ghost */
    ::ng-deep .cdk-drag-preview.bs-task-card {
      box-shadow: 0 16px 32px rgba(15,23,42,0.2) !important;
      transform: rotate(1deg) scale(1.02);
    }
    ::ng-deep .cdk-drag-preview.bs-sticky {
      box-shadow: 6px 6px 20px rgba(0,0,0,0.2) !important;
    }
    ::ng-deep .cdk-drag-animating {
      transition: transform 200ms cubic-bezier(0,0,0.2,1);
    }
  `],
})
export class BrainstormingComponent implements OnInit {

  private snackBar = inject(MatSnackBar);

  /* ── Signals ─────────────────────────────────────────────── */
  notes       = signal<StickyNote[]>([]);
  matrixTasks = signal<MatrixTask[]>([]);

  /* ── Local state ──────────────────────────────────────────── */
  newTaskTitle  = '';
  selectedColor = 'yellow';

  readonly noteColors = NOTE_COLORS;

  /* ── Lifecycle ────────────────────────────────────────────── */
  ngOnInit(): void {
    this._loadFromStorage();
  }

  /* ── Notes CRUD ───────────────────────────────────────────── */
  addNote(): void {
    const boardEl = document.querySelector('.bs-notes-board');
    const w = boardEl ? boardEl.clientWidth  : 600;
    const h = boardEl ? boardEl.clientHeight : 500;

    // scatter within the board with some margin
    const margin = 20;
    const noteW  = 180;
    const noteH  = 160;
    const x = margin + Math.random() * Math.max(0, w - noteW - margin * 2);
    const y = margin + Math.random() * Math.max(0, h - noteH - margin * 2);
    const rotation = (Math.random() * 4 - 2); // -2 to +2 degrees

    const note: StickyNote = {
      id:       this._uuid(),
      text:     '',
      color:    this.selectedColor,
      x:        Math.round(x),
      y:        Math.round(y),
      rotation: parseFloat(rotation.toFixed(1)),
      editMode: true,
    };
    this.notes.update(ns => [...ns, note]);
    this._saveNotes();
  }

  deleteNote(id: string): void {
    this.notes.update(ns => ns.filter(n => n.id !== id));
    this._saveNotes();
  }

  updateNote(id: string, text: string): void {
    this.notes.update(ns => ns.map(n => n.id === id ? { ...n, text } : n));
    this._saveNotes();
  }

  enterEditMode(id: string): void {
    this.notes.update(ns => ns.map(n => ({ ...n, editMode: n.id === id })));
  }

  exitEditMode(id: string): void {
    this.notes.update(ns => ns.map(n => n.id === id ? { ...n, editMode: false } : n));
    this._saveNotes();
  }

  onNoteDragEnd(event: any, id: string): void {
    const el = event.source.element.nativeElement as HTMLElement;
    const transform = el.style.transform;
    // Extract the CDK translate values from the element's transform matrix
    // CDK DragDrop sets an absolute position via the element; we need the final offset.
    // After drag end, CDK resets the element's transform but fires the event with .distance
    const dx = event.distance.x;
    const dy = event.distance.y;

    this.notes.update(ns => ns.map(n => {
      if (n.id !== id) return n;
      return {
        ...n,
        x: Math.max(0, Math.round(n.x + dx)),
        y: Math.max(0, Math.round(n.y + dy)),
      };
    }));
    this._saveNotes();
  }

  getNoteColor(colorKey: string): string {
    return COLOR_MAP[colorKey] ?? COLOR_MAP['yellow'];
  }

  /* ── Matrix CRUD ──────────────────────────────────────────── */
  getTasksForQuadrant(q: 'q1' | 'q2' | 'q3' | 'q4'): MatrixTask[] {
    return this.matrixTasks().filter(t => t.quadrant === q);
  }

  addToMatrix(): void {
    const title = this.newTaskTitle.trim();
    if (!title) return;
    const task: MatrixTask = {
      id:       this._uuid(),
      title,
      priority: 'medium',
      quadrant: 'q1',
    };
    this.matrixTasks.update(ts => [...ts, task]);
    this.newTaskTitle = '';
    this._saveMatrix();
  }

  removeFromMatrix(id: string): void {
    this.matrixTasks.update(ts => ts.filter(t => t.id !== id));
    this._saveMatrix();
  }

  cyclePriority(id: string): void {
    const cycle: MatrixTask['priority'][] = ['low', 'medium', 'high'];
    this.matrixTasks.update(ts => ts.map(t => {
      if (t.id !== id) return t;
      const idx = cycle.indexOf(t.priority);
      return { ...t, priority: cycle[(idx + 1) % cycle.length] };
    }));
    this._saveMatrix();
  }

  moveInMatrix(event: CdkDragDrop<MatrixTask[]>, targetQuadrant: 'q1' | 'q2' | 'q3' | 'q4'): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );
      const moved = event.container.data[event.currentIndex];
      this.matrixTasks.update(ts =>
        ts.map(t => t.id === moved.id ? { ...t, quadrant: targetQuadrant } : t)
      );
    }
    this._saveMatrix();
  }

  requestCreateTask(task: MatrixTask): void {
    this.snackBar.open(
      `Task creation coming soon — "${task.title}"`,
      'OK',
      { duration: 3500, panelClass: ['bs-snack'] }
    );
  }

  /* ── Persistence ──────────────────────────────────────────── */
  private _saveNotes(): void {
    try {
      localStorage.setItem(
        STORAGE_NOTES_KEY,
        JSON.stringify(this.notes().map(n => ({ ...n, editMode: false })))
      );
    } catch (_) {}
  }

  private _saveMatrix(): void {
    try {
      localStorage.setItem(STORAGE_MATRIX_KEY, JSON.stringify(this.matrixTasks()));
    } catch (_) {}
  }

  private _loadFromStorage(): void {
    try {
      const rawNotes = localStorage.getItem(STORAGE_NOTES_KEY);
      if (rawNotes) {
        const parsed: StickyNote[] = JSON.parse(rawNotes);
        this.notes.set(parsed.map(n => ({ ...n, editMode: false })));
      }
    } catch (_) {}
    try {
      const rawMatrix = localStorage.getItem(STORAGE_MATRIX_KEY);
      if (rawMatrix) this.matrixTasks.set(JSON.parse(rawMatrix));
    } catch (_) {}
  }

  /* ── Utilities ────────────────────────────────────────────── */
  private _uuid(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }
}
