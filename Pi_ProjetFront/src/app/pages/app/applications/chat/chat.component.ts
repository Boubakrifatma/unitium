import {
    Component, OnInit, OnDestroy, AfterViewChecked,
    ViewChild, ElementRef, HostListener,
    signal, computed, effect,
    Renderer2, Inject, DOCUMENT, CUSTOM_ELEMENTS_SCHEMA
} from "@angular/core";
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatChipsModule } from '@angular/material/chips';
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MatListModule } from "@angular/material/list";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatCardModule } from "@angular/material/card";
import { MatToolbarModule } from "@angular/material/toolbar";
import { MatButtonModule } from "@angular/material/button";
import { MatMenuModule } from "@angular/material/menu";
import { MatSelectModule } from "@angular/material/select";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { MatDividerModule } from "@angular/material/divider";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { ChatRoomService, ChatRoom, ChatRoomPayload, RoomType, ProjectDTO } from "./chat-room.service";
import { ChatRoomMemberService, RoomMemberDTO } from "./chat-room-member.service";
import { AuthService } from "../../../../auth/auth.service";
import { UserService, UserDTO } from "../../../../users/user.service";
import { Subscription } from 'rxjs';
import { ChatMessageService, MessageDTO, ReactionDTO, ScheduledMessageDTO, ScheduledPayload, ScheduledNotificationEvent } from './chat-message.service';
import { ScheduledNotificationService, ScheduledNotification, ScheduledRetryRequest } from './scheduled-notification.service';
import {
    trigger, style, transition, animate, state,
} from '@angular/animations';
import { QuillModule } from 'ngx-quill';
import { SnackbarSuccessComponent } from '../calendar/snackbar-event.component';

/* ══ Room Creation / Edit Wizard Dialog ══════════════════════════════════ */
@Component({
    selector: 'app-room-wizard-dialog',
    standalone: true,
    imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule,
              MatFormFieldModule, MatInputModule, MatSelectModule,
              MatProgressSpinnerModule, MatDialogModule,
              MatDatepickerModule, MatChipsModule],
    providers: [provideNativeDateAdapter()],
    template: `
        <div class="wiz-wrap">
            <!-- X close button -->
            <button class="wiz-close-btn" mat-icon-button (click)="cancel()" aria-label="Close">
                <mat-icon>close</mat-icon>
            </button>

            <!-- Header -->
            <div class="wiz-header">
                <div class="wiz-header-icon">
                    <mat-icon class="material-icons-outlined">
                        {{ editingRoom ? 'edit_note' : 'add_circle_outline' }}
                    </mat-icon>
                </div>
                <h2 class="wiz-title">{{ editingRoom ? 'Edit Channel' : 'New Channel' }}</h2>
                <p class="wiz-subtitle">{{ stepSubtitles[formStep() - 1] }}</p>
            </div>

            <!-- Step indicator -->
            <div class="wiz-steps-row">
                @for (s of [1,2,3]; track s) {
                    <div class="wiz-step-dot"
                         [class.wiz-step-active]="formStep() >= s"
                         [class.wiz-step-current]="formStep() === s">
                        @if (formStep() > s) {
                            <mat-icon style="font-size:13px;width:13px;height:13px;line-height:13px">check</mat-icon>
                        } @else {
                            {{ s }}
                        }
                    </div>
                    @if (s < 3) {
                        <div class="wiz-step-line" [class.wiz-step-line-done]="formStep() > s"></div>
                    }
                }
            </div>

            @if (formError) {
                <div class="wiz-error" [class.wiz-shake]="formShaking()">{{ formError }}</div>
            }

            <!-- ── STEP 1: Project ────────────────────────────────── -->
            @if (formStep() === 1) {
                <p class="wiz-step-hint">Which project is this channel for?</p>
                <div [class.wiz-shake]="formShaking() && !step1Valid">
                    <mat-form-field appearance="outline" class="w-100">
                        <mat-label>Project *</mat-label>
                        <mat-icon matPrefix class="material-icons-outlined" style="font-size:18px;width:18px;height:18px">folder_open</mat-icon>
                        <mat-select [(ngModel)]="formProjectId" [disabled]="projectsLoading()">
                            @if (projectsLoading()) {
                                <mat-option disabled>Loading projects…</mat-option>
                            } @else if (projects.length === 0) {
                                <mat-option disabled>No projects found</mat-option>
                            } @else {
                                @for (p of projects; track p.id) {
                                    <mat-option [value]="p.id">{{ p.name }}</mat-option>
                                }
                            }
                        </mat-select>
                        @if (step1Valid) {
                            <mat-icon matSuffix class="field-check-icon material-icons-outlined">check_circle</mat-icon>
                        }
                    </mat-form-field>
                    @if (formTouched() && !step1Valid) {
                        <div class="wiz-inline-error">Please select a project to continue.</div>
                    }
                </div>
                <div class="wiz-actions">
                    <button mat-stroked-button class="wiz-back-btn" (click)="cancel()">Cancel</button>
                    <button mat-flat-button color="primary" class="wiz-next-btn"
                            [class.wiz-shake]="formShaking() && !step1Valid"
                            (click)="nextStep()">
                        Next <mat-icon iconPositionEnd style="font-size:18px;width:18px;height:18px">chevron_right</mat-icon>
                    </button>
                </div>
            }

            <!-- ── STEP 2: Name, Description, Type ───────────────── -->
            @if (formStep() === 2) {
                <p class="wiz-step-hint">Channel details</p>

                <div class="mb-2" [class.wiz-shake]="formShaking() && step2NameError !== null">
                    <mat-form-field appearance="outline" class="w-100">
                        <mat-label>Channel Name *</mat-label>
                        <mat-icon matPrefix style="font-size:18px;width:18px;height:18px">tag</mat-icon>
                        <input matInput [(ngModel)]="formName" placeholder="e.g. design-review, sprint-42" maxlength="50" />
                        <mat-hint align="end">{{ (formName || '').length }}/50</mat-hint>
                        @if (!step2NameError) {
                            <mat-icon matSuffix class="field-check-icon material-icons-outlined">check_circle</mat-icon>
                        }
                    </mat-form-field>
                    @if (formTouched() && step2NameError) {
                        <div class="wiz-inline-error">{{ step2NameError }}</div>
                    }
                </div>

                <div class="mb-2" [class.wiz-shake]="formShaking() && step2DescError !== null">
                    <mat-form-field appearance="outline" class="w-100">
                        <mat-label>Description *</mat-label>
                        <textarea matInput [(ngModel)]="formDescription" rows="3"
                                  placeholder="What will this channel be used for?" maxlength="200"></textarea>
                        <mat-hint align="end">{{ (formDescription || '').length }}/200</mat-hint>
                        @if (!step2DescError) {
                            <mat-icon matSuffix class="field-check-icon material-icons-outlined">check_circle</mat-icon>
                        }
                    </mat-form-field>
                    @if (formTouched() && step2DescError) {
                        <div class="wiz-inline-error">{{ step2DescError }}</div>
                    }
                </div>

                <!-- Room type pills -->
                <div class="mb-3" [class.wiz-shake]="formShaking() && !formRoomType">
                    <div class="wiz-type-label">
                        Channel Type *
                        @if (formRoomType) {
                            <mat-icon class="field-check-icon-inline material-icons-outlined">check_circle</mat-icon>
                        }
                    </div>
                    <div class="wiz-type-pills">
                        @for (t of roomTypes; track t.value) {
                            <button class="wiz-type-pill" type="button"
                                    [class.wiz-type-pill-active]="formRoomType === t.value"
                                    (click)="onRoomTypeSelect(t.value)">
                                {{ t.label }}
                            </button>
                        }
                    </div>
                    @if (formTouched() && !formRoomType) {
                        <div class="wiz-inline-error">Please select a channel type.</div>
                    }
                </div>

                <!-- ── MEETING FIELDS (premium redesign) ── -->
                @if (formRoomType === 'meeting') {
                    <div class="wiz-meeting-card">
                        <div class="wiz-meeting-card-header">
                            <mat-icon class="material-icons-outlined" style="font-size:15px;width:15px;height:15px;color:var(--mat-sys-primary)">event_available</mat-icon>
                            <span>Meeting Details</span>
                        </div>

                        <div class="wiz-meeting-two-col">
                            <!-- Left: mini calendar -->
                            <div class="wiz-meeting-col">
                                <div class="wiz-section-label">DATE</div>
                                <div class="wiz-mini-cal">
                                    <div class="wiz-mini-cal-nav">
                                        <button type="button" class="wiz-cal-nav-btn" (click)="prevCalMonth()">&#8249;</button>
                                        <span class="wiz-cal-month-label">{{ CAL_MONTHS[calDisplayMonth] }} {{ calDisplayYear }}</span>
                                        <button type="button" class="wiz-cal-nav-btn" (click)="nextCalMonth()">&#8250;</button>
                                    </div>
                                    <div class="wiz-mini-cal-grid">
                                        @for (d of CAL_DAYS_OF_WEEK; track d) {
                                            <div class="wiz-cal-dow">{{ d }}</div>
                                        }
                                        @for (cell of getCalendarGrid(); track $index) {
                                            <button type="button"
                                                    class="wiz-cal-day"
                                                    [class.wiz-cal-day-today]="cell.isToday"
                                                    [class.wiz-cal-day-selected]="cell.isSelected"
                                                    [class.wiz-cal-day-past]="cell.isPast"
                                                    [class.wiz-cal-day-empty]="!cell.date"
                                                    [disabled]="!cell.date || cell.isPast"
                                                    (click)="selectCalDate(cell.date)">
                                                {{ cell.date ? cell.date.getDate() : '' }}
                                            </button>
                                        }
                                    </div>
                                    @if (formMeetingDate) {
                                        <div class="wiz-cal-selected-label">
                                            <mat-icon class="material-icons-outlined" style="font-size:12px;width:12px;height:12px;color:#4caf50">check_circle</mat-icon>
                                            {{ formMeetingDate | date:'EEE, MMM d, y' }}
                                        </div>
                                    }
                                </div>
                            </div>

                            <!-- Right: time selection -->
                            <div class="wiz-meeting-col">
                                <div class="wiz-section-label">START TIME</div>
                                <div class="wiz-time-scroll-wrap">
                                    @for (t of meetingTimePills; track t) {
                                        <button type="button" class="wiz-time-pill-h"
                                                [class.wiz-time-pill-h-active]="formStartTime === t"
                                                (click)="formStartTime = t">
                                            @if (formStartTime === t) {
                                                <mat-icon style="font-size:11px;width:11px;height:11px;margin-right:2px">check</mat-icon>
                                            }
                                            {{ t }}
                                        </button>
                                    }
                                </div>

                                <div class="wiz-section-label" style="margin-top:10px">END TIME</div>
                                <div class="wiz-time-scroll-wrap">
                                    @for (t of meetingTimePills; track t) {
                                        <button type="button" class="wiz-time-pill-h"
                                                [class.wiz-time-pill-h-active]="formEndTime === t"
                                                (click)="formEndTime = t">
                                            @if (formEndTime === t) {
                                                <mat-icon style="font-size:11px;width:11px;height:11px;margin-right:2px">check</mat-icon>
                                            }
                                            {{ t }}
                                        </button>
                                    }
                                </div>

                                <!-- Auto-link note -->
                                <div class="wiz-auto-link-note">
                                    <mat-icon class="material-icons-outlined" style="font-size:12px;width:12px;height:12px;color:#4caf50">video_call</mat-icon>
                                    <span>Google Meet link auto-generated</span>
                                </div>
                            </div>
                        </div>

                        <!-- Participants note -->
                        <div class="wiz-meeting-participants-note">
                            <mat-icon class="material-icons-outlined" style="font-size:13px;width:13px;height:13px;color:#4caf50">group</mat-icon>
                            <span>All room members will be notified automatically</span>
                        </div>
                    </div>

                    <!-- ── Add Participants ── -->
                    <div class="wiz-participants-section">
                        <div class="wiz-participants-header">
                            <mat-icon class="material-icons-outlined" style="font-size:16px;width:16px;height:16px;color:var(--mat-sys-primary)">group_add</mat-icon>
                            <span>Add Participants</span>
                            @if (selectedParticipantIds.length > 0) {
                                <span class="wiz-participants-count">{{ selectedParticipantIds.length }} selected</span>
                            }
                        </div>

                        @if (participantsLoading()) {
                            <div style="text-align:center;padding:14px 0">
                                <mat-spinner diameter="22"></mat-spinner>
                            </div>
                        } @else if (participantUsers().length === 0) {
                            <p style="font-size:12px;color:var(--mat-sys-on-surface-variant);text-align:center;margin:8px 0 4px">No users available</p>
                        } @else {
                            @if (selectedParticipantIds.length > 0) {
                                <div class="wiz-selected-chips">
                                    @for (pid of selectedParticipantIds; track pid) {
                                        <span class="wiz-selected-chip">
                                            {{ getParticipantName(pid) }}
                                            <button type="button" class="wiz-chip-remove-btn" (click)="toggleParticipant(pid)">&#215;</button>
                                        </span>
                                    }
                                </div>
                            }
                            <div class="wiz-participant-grid">
                                @for (u of participantUsers(); track u.id) {
                                    <button type="button" class="wiz-participant-card"
                                            [class.wiz-participant-selected]="selectedParticipantIds.includes(u.id)"
                                            (click)="toggleParticipant(u.id)">
                                        <div class="wiz-participant-avatar" [ngStyle]="getParticipantAvatarStyle(u.fullName)">
                                            {{ getParticipantInitials(u.fullName) }}
                                        </div>
                                        @if (selectedParticipantIds.includes(u.id)) {
                                            <div class="wiz-participant-check">
                                                <mat-icon style="font-size:14px;width:14px;height:14px;color:#fff">check</mat-icon>
                                            </div>
                                        }
                                        <span class="wiz-participant-name">{{ u.fullName }}</span>
                                        <span class="wiz-participant-role">{{ u.role }}</span>
                                    </button>
                                }
                            </div>
                        }
                    </div>
                }

                <div class="wiz-actions">
                    <button mat-stroked-button class="wiz-back-btn" (click)="prevStep()">
                        <mat-icon style="font-size:18px;width:18px;height:18px">chevron_left</mat-icon>
                        Back
                    </button>
                    <button mat-flat-button color="primary" class="wiz-next-btn"
                            [class.wiz-shake]="formShaking() && !step2Valid"
                            (click)="nextStep()">
                        Next <mat-icon iconPositionEnd style="font-size:18px;width:18px;height:18px">chevron_right</mat-icon>
                    </button>
                    <button mat-button class="wiz-cancel-link" (click)="cancel()">Cancel</button>
                </div>
            }

            <!-- ── STEP 3: Review & Create ────────────────────────── -->
            @if (formStep() === 3) {
                <p class="wiz-step-hint">Review and {{ editingRoom ? 'update' : 'create' }}</p>
                <div class="wiz-review-card mb-3">
                    <div class="wiz-review-row">
                        <span class="wiz-review-key">Project</span>
                        <span class="wiz-review-val">{{ getProjectName(formProjectId) }}</span>
                    </div>
                    <div class="wiz-review-row">
                        <span class="wiz-review-key">Name</span>
                        <span class="wiz-review-val">#{{ formName.trim() }}</span>
                    </div>
                    <div class="wiz-review-row">
                        <span class="wiz-review-key">Description</span>
                        <span class="wiz-review-val">{{ formDescription.trim() }}</span>
                    </div>
                    <div class="wiz-review-row" [style.border-bottom]="formRoomType === 'meeting' ? undefined : 'none'">
                        <span class="wiz-review-key">Type</span>
                        <span class="wiz-review-val">{{ getRoomTypeLabel(formRoomType) }}</span>
                    </div>
                    @if (formRoomType === 'meeting' && formMeetingDate) {
                        <div class="wiz-review-row">
                            <span class="wiz-review-key">Date</span>
                            <span class="wiz-review-val">{{ formMeetingDate | date:'mediumDate' }}</span>
                        </div>
                    }
                    @if (formRoomType === 'meeting' && formStartTime) {
                        <div class="wiz-review-row">
                            <span class="wiz-review-key">Start</span>
                            <span class="wiz-review-val">{{ formStartTime }}</span>
                        </div>
                    }
                    @if (formRoomType === 'meeting' && formEndTime) {
                        <div class="wiz-review-row">
                            <span class="wiz-review-key">End</span>
                            <span class="wiz-review-val">{{ formEndTime }}</span>
                        </div>
                    }
                    @if (formRoomType === 'meeting') {
                        <div class="wiz-review-row">
                            <span class="wiz-review-key">Link</span>
                            <span class="wiz-review-val" style="font-size:11.5px;color:#4caf50">
                                <mat-icon class="material-icons-outlined" style="font-size:12px;width:12px;height:12px;vertical-align:middle">auto_awesome</mat-icon>
                                Auto-generated Google Meet
                            </span>
                        </div>
                        <div class="wiz-review-row" style="border-bottom:none">
                            <span class="wiz-review-key">Participants</span>
                            <span class="wiz-review-val">{{ selectedParticipantIds.length > 0 ? selectedParticipantIds.length + ' will be added' : 'None — add later' }}</span>
                        </div>
                        @if (participantsAdding()) {
                            <div style="padding:8px 14px;display:flex;align-items:center;gap:8px;font-size:12px;color:var(--mat-sys-on-surface-variant)">
                                <mat-spinner diameter="14"></mat-spinner>
                                Adding participants…
                            </div>
                        }
                    }
                </div>
                <div class="wiz-actions">
                    <button mat-stroked-button class="wiz-back-btn" (click)="prevStep()" [disabled]="saving()">
                        <mat-icon style="font-size:18px;width:18px;height:18px">chevron_left</mat-icon>
                        Back
                    </button>
                    <button mat-flat-button color="primary" class="wiz-submit-btn"
                            (click)="saveRoom()" [disabled]="saving()">
                        @if (saving()) {
                            <mat-spinner diameter="18" style="display:inline-block;margin-right:6px"></mat-spinner>
                            Saving…
                        } @else {
                            <mat-icon style="font-size:18px;width:18px;height:18px;margin-right:6px">
                                {{ editingRoom ? 'save' : 'add_circle' }}
                            </mat-icon>
                            {{ editingRoom ? 'Update Channel' : 'Create Channel' }}
                        }
                    </button>
                    <button mat-button class="wiz-cancel-link" (click)="cancel()" [disabled]="saving()">Cancel</button>
                </div>
            }
        </div>
    `,
    styles: [`
        ::ng-deep .wiz-spinner circle { stroke: #fff !important; }

        @keyframes wiz-shake {
            0%, 100% { transform: translateX(0); }
            20%       { transform: translateX(-5px); }
            40%       { transform: translateX(5px); }
            60%       { transform: translateX(-3px); }
            80%       { transform: translateX(3px); }
        }
        .wiz-shake { animation: wiz-shake 0.32s ease; }

        .wiz-wrap {
            position: relative;
            padding: 36px 32px 28px;
            width: 100%;
            box-sizing: border-box;
            max-height: 88vh;
            overflow-y: auto;
        }

        /* ── Close button ── */
        .wiz-close-btn {
            position: absolute;
            top: 12px;
            right: 12px;
            opacity: 0.55;
            transition: opacity 0.18s;
        }
        .wiz-close-btn:hover { opacity: 1; }

        /* ── Header ── */
        .wiz-header {
            text-align: center;
            margin-bottom: 20px;
        }
        .wiz-header-icon {
            width: 58px;
            height: 58px;
            border-radius: 16px;
            background: linear-gradient(135deg, var(--mat-sys-primary-container), var(--mat-sys-tertiary-container));
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 14px;
            box-shadow: 0 4px 18px color-mix(in srgb, var(--mat-sys-primary) 22%, transparent);
        }
        .wiz-header-icon mat-icon {
            font-size: 27px !important;
            width: 27px !important;
            height: 27px !important;
            color: var(--mat-sys-primary);
        }
        .wiz-title {
            font-size: 22px;
            font-weight: 700;
            letter-spacing: -0.03em;
            margin: 0 0 4px;
        }
        .wiz-subtitle {
            font-size: 13.5px;
            color: var(--mat-sys-on-surface-variant);
            margin: 0;
        }

        /* ── Step indicator ── */
        .wiz-steps-row {
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 22px;
        }
        .wiz-step-dot {
            width: 30px;
            height: 30px;
            border-radius: 50%;
            border: 2px solid var(--mat-sys-outline-variant);
            background: var(--mat-sys-surface-container-high);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            font-weight: 700;
            color: var(--mat-sys-on-surface-variant);
            flex-shrink: 0;
            transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1);
        }
        .wiz-step-active {
            border-color: var(--mat-sys-primary);
            background: var(--mat-sys-primary-container);
            color: var(--mat-sys-primary);
        }
        .wiz-step-current {
            background: var(--mat-sys-primary) !important;
            border-color: var(--mat-sys-primary) !important;
            color: #fff !important;
            box-shadow: 0 2px 10px color-mix(in srgb, var(--mat-sys-primary) 40%, transparent);
        }
        .wiz-step-line {
            flex: 1;
            max-width: 72px;
            height: 2px;
            background: var(--mat-sys-outline-variant);
            transition: background 0.35s ease;
        }
        .wiz-step-line-done { background: var(--mat-sys-primary); }

        /* ── Step hint label ── */
        .wiz-step-hint {
            font-size: 10.5px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.09em;
            color: var(--mat-sys-on-surface-variant);
            margin-bottom: 14px;
        }

        /* ── Error banner ── */
        .wiz-error {
            background: rgba(239,68,68,0.07);
            border: 1px solid rgba(239,68,68,0.25);
            border-radius: 10px;
            color: #ef4444;
            font-size: 12.5px;
            padding: 10px 14px;
            margin-bottom: 16px;
            line-height: 1.5;
        }

        /* ── Inline field error ── */
        .wiz-inline-error {
            font-size: 11.5px;
            color: var(--mat-sys-error, #ef4444);
            margin: -4px 0 10px 2px;
            display: block;
        }

        /* ── Field check icon ── */
        .field-check-icon {
            font-size: 16px !important;
            width: 16px !important;
            height: 16px !important;
            color: #16a34a !important;
        }
        .field-check-icon-inline {
            font-size: 14px !important;
            width: 14px !important;
            height: 14px !important;
            color: #16a34a !important;
            vertical-align: middle;
            margin-left: 4px;
        }

        /* ── Room type pills ── */
        .wiz-type-label {
            font-size: 12px;
            font-weight: 600;
            color: var(--mat-sys-on-surface-variant);
            margin-bottom: 8px;
            display: flex;
            align-items: center;
        }
        .wiz-type-pills {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }
        .wiz-type-pill {
            padding: 6px 14px;
            border-radius: 20px;
            border: 1.5px solid var(--mat-sys-outline-variant);
            background: transparent;
            font-size: 12.5px;
            font-weight: 500;
            color: var(--mat-sys-on-surface-variant);
            cursor: pointer;
            transition: all 0.18s ease;
            line-height: 1.4;
        }
        .wiz-type-pill:hover {
            border-color: var(--mat-sys-primary);
            color: var(--mat-sys-primary);
            background: color-mix(in srgb, var(--mat-sys-primary) 6%, transparent);
        }
        .wiz-type-pill-active {
            background: var(--mat-sys-primary-container) !important;
            border-color: var(--mat-sys-primary) !important;
            color: var(--mat-sys-on-primary-container) !important;
            font-weight: 600 !important;
        }

        /* ── Review card ── */
        .wiz-review-card {
            border-radius: 12px;
            border: 1px solid var(--mat-sys-outline-variant);
            background: var(--mat-sys-surface-container);
            overflow: hidden;
        }
        .wiz-review-row {
            display: flex;
            align-items: baseline;
            gap: 10px;
            padding: 10px 14px;
            border-bottom: 1px solid var(--mat-sys-outline-variant);
        }
        .wiz-review-key {
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.07em;
            color: var(--mat-sys-on-surface-variant);
            min-width: 80px;
            flex-shrink: 0;
        }
        .wiz-review-val {
            font-size: 13px;
            color: var(--mat-sys-on-surface);
            word-break: break-word;
        }

        /* ── Action buttons ── */
        .wiz-actions {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-top: 6px;
        }
        .wiz-back-btn {
            height: 44px;
            min-width: 90px;
            border-radius: 10px !important;
            font-size: 13.5px;
            flex-shrink: 0;
        }
        .wiz-next-btn, .wiz-submit-btn {
            flex: 1;
            height: 44px;
            border-radius: 10px !important;
            font-size: 13.5px;
            font-weight: 600;
            letter-spacing: 0.01em;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .wiz-cancel-link {
            flex-shrink: 0;
            font-size: 12.5px;
            opacity: 0.65;
            min-width: 0;
            padding: 0 8px;
        }

        /* ── Meeting card (premium redesign) ── */
        @keyframes wiz-meeting-slide {
            from { opacity: 0; transform: translateY(-12px) scaleY(0.9); }
            to   { opacity: 1; transform: translateY(0) scaleY(1); }
        }
        .wiz-meeting-card {
            animation: wiz-meeting-slide 340ms cubic-bezier(0.34,1.56,0.64,1) forwards;
            transform-origin: top;
            border: 1.5px solid var(--mat-sys-outline-variant);
            border-radius: 14px;
            padding: 14px 14px 10px;
            margin-bottom: 12px;
            background: color-mix(in srgb, var(--mat-sys-primary-container) 6%, var(--mat-sys-surface));
            box-shadow: 0 2px 12px color-mix(in srgb, var(--mat-sys-primary) 8%, transparent);
        }
        .wiz-meeting-card-header {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 10.5px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.09em;
            color: var(--mat-sys-primary);
            margin-bottom: 12px;
        }
        .wiz-meeting-two-col {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
        }
        @media (max-width: 400px) {
            .wiz-meeting-two-col { grid-template-columns: 1fr; }
        }
        .wiz-meeting-col { display: flex; flex-direction: column; }
        .wiz-section-label {
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.09em;
            color: var(--mat-sys-on-surface-variant);
            margin-bottom: 6px;
        }

        /* Mini inline calendar */
        .wiz-mini-cal {
            border: 1px solid var(--mat-sys-outline-variant);
            border-radius: 10px;
            overflow: hidden;
            background: var(--mat-sys-surface);
        }
        .wiz-mini-cal-nav {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 6px 8px;
            background: var(--mat-sys-surface-container);
            border-bottom: 1px solid var(--mat-sys-outline-variant);
        }
        .wiz-cal-month-label {
            font-size: 11.5px;
            font-weight: 700;
            letter-spacing: -0.01em;
        }
        .wiz-cal-nav-btn {
            width: 22px;
            height: 22px;
            border-radius: 50%;
            border: none;
            background: transparent;
            cursor: pointer;
            font-size: 16px;
            line-height: 1;
            color: var(--mat-sys-on-surface-variant);
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.15s;
        }
        .wiz-cal-nav-btn:hover { background: var(--mat-sys-surface-container-high); }
        .wiz-mini-cal-grid {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            padding: 6px 4px 4px;
            gap: 1px;
        }
        .wiz-cal-dow {
            font-size: 9.5px;
            font-weight: 700;
            text-align: center;
            color: var(--mat-sys-on-surface-variant);
            padding: 2px 0;
            opacity: 0.7;
        }
        .wiz-cal-day {
            aspect-ratio: 1;
            border: none;
            background: transparent;
            border-radius: 50%;
            font-size: 11px;
            cursor: pointer;
            color: var(--mat-sys-on-surface);
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.15s, color 0.15s;
            min-width: 0;
            padding: 0;
        }
        .wiz-cal-day:hover:not(:disabled):not(.wiz-cal-day-empty) {
            background: color-mix(in srgb, var(--mat-sys-primary) 12%, transparent);
            color: var(--mat-sys-primary);
        }
        .wiz-cal-day-today {
            outline: 2px solid var(--mat-sys-primary);
            outline-offset: -2px;
            font-weight: 700;
        }
        .wiz-cal-day-selected {
            background: var(--mat-sys-primary) !important;
            color: #fff !important;
            font-weight: 700;
        }
        .wiz-cal-day-past { opacity: 0.3; cursor: not-allowed; }
        .wiz-cal-day-empty { visibility: hidden; }
        .wiz-cal-selected-label {
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 10.5px;
            color: #4caf50;
            padding: 4px 8px 6px;
            font-weight: 600;
        }

        /* Time pills — horizontal scroll, 4 visible */
        .wiz-time-scroll-wrap {
            display: flex;
            gap: 4px;
            overflow-x: auto;
            scrollbar-width: none;
            padding-bottom: 4px;
            scroll-snap-type: x mandatory;
        }
        .wiz-time-scroll-wrap::-webkit-scrollbar { display: none; }
        .wiz-time-pill-h {
            flex-shrink: 0;
            scroll-snap-align: start;
            min-width: 66px;
            height: 28px;
            border-radius: 14px;
            border: 1.5px solid var(--mat-sys-outline-variant);
            background: transparent;
            font-size: 10.5px;
            font-weight: 500;
            color: var(--mat-sys-on-surface-variant);
            cursor: pointer;
            transition: all 0.18s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 2px;
            white-space: nowrap;
            padding: 0 8px;
        }
        .wiz-time-pill-h:hover {
            border-color: var(--mat-sys-primary);
            color: var(--mat-sys-primary);
            background: color-mix(in srgb, var(--mat-sys-primary) 6%, transparent);
        }
        .wiz-time-pill-h-active {
            background: var(--mat-sys-primary) !important;
            border-color: var(--mat-sys-primary) !important;
            color: #fff !important;
            font-weight: 600 !important;
        }
        .wiz-auto-link-note {
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 10.5px;
            color: #4caf50;
            margin-top: 10px;
            font-weight: 500;
        }
        .wiz-meeting-participants-note {
            display: flex;
            align-items: center;
            gap: 5px;
            font-size: 11px;
            color: var(--mat-sys-on-surface-variant);
            background: color-mix(in srgb, #4caf50 7%, var(--mat-sys-surface-container));
            border-radius: 8px;
            padding: 6px 10px;
            margin-top: 10px;
        }

        /* Participants section */
        @keyframes wiz-participants-slide {
            from { opacity: 0; transform: translateY(-8px); }
            to   { opacity: 1; transform: translateY(0); }
        }
        .wiz-participants-section {
            animation: wiz-participants-slide 280ms cubic-bezier(0.34,1.56,0.64,1) 60ms both;
            border: 1px solid var(--mat-sys-outline-variant);
            border-radius: 12px;
            padding: 12px 12px 10px;
            margin-bottom: 14px;
            background: var(--mat-sys-surface-container);
        }
        .wiz-participants-header {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: var(--mat-sys-on-surface-variant);
            margin-bottom: 10px;
        }
        .wiz-participants-count {
            margin-left: auto;
            background: var(--mat-sys-primary);
            color: #fff;
            font-size: 10px;
            border-radius: 10px;
            padding: 1px 7px;
            font-weight: 700;
            letter-spacing: 0;
            text-transform: none;
        }
        .wiz-selected-chips {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
            margin-bottom: 8px;
        }
        .wiz-selected-chip {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            background: var(--mat-sys-primary-container);
            color: var(--mat-sys-on-primary-container);
            border-radius: 12px;
            padding: 2px 8px 2px 10px;
            font-size: 11px;
            font-weight: 600;
        }
        .wiz-chip-remove-btn {
            border: none;
            background: none;
            cursor: pointer;
            font-size: 14px;
            line-height: 1;
            color: var(--mat-sys-on-primary-container);
            padding: 0;
            opacity: 0.7;
        }
        .wiz-chip-remove-btn:hover { opacity: 1; }
        .wiz-participant-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
            gap: 6px;
            max-height: 180px;
            overflow-y: auto;
            scrollbar-width: thin;
        }
        .wiz-participant-card {
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            padding: 10px 6px 8px;
            border-radius: 10px;
            border: 1.5px solid var(--mat-sys-outline-variant);
            background: var(--mat-sys-surface);
            cursor: pointer;
            transition: all 0.18s;
            font-family: inherit;
            text-align: center;
        }
        .wiz-participant-card:hover {
            border-color: var(--mat-sys-primary);
            box-shadow: 0 2px 8px color-mix(in srgb, var(--mat-sys-primary) 15%, transparent);
        }
        .wiz-participant-selected {
            border-color: var(--mat-sys-primary) !important;
            background: color-mix(in srgb, var(--mat-sys-primary-container) 40%, var(--mat-sys-surface)) !important;
        }
        .wiz-participant-avatar {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: 700;
            color: #fff;
            flex-shrink: 0;
        }
        .wiz-participant-check {
            position: absolute;
            top: 4px;
            right: 4px;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: var(--mat-sys-primary);
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .wiz-participant-name {
            font-size: 10.5px;
            font-weight: 600;
            color: var(--mat-sys-on-surface);
            line-height: 1.2;
            word-break: break-word;
        }
        .wiz-participant-role {
            font-size: 9.5px;
            color: var(--mat-sys-on-surface-variant);
            text-transform: uppercase;
            letter-spacing: 0.04em;
        }
    `],
})
export class RoomWizardDialogComponent {
    editingRoom: ChatRoom | null;
    rooms: ChatRoom[];
    saving        = signal(false);
    formStep      = signal<1 | 2 | 3>(1);
    formTouched   = signal<boolean>(false);
    formShaking   = signal<boolean>(false);
    formProjectId = '';
    formName      = '';
    formDescription = '';
    formRoomType: RoomType | '' = '';
    formError = '';
    formMeetingDate: Date | null = null;
    formStartTime   = '';
    formEndTime     = '';
    formMeetingLink = '';
    readonly today  = new Date();
    projects: ProjectDTO[] = [];
    projectsLoading = signal(false);

    readonly meetingTimePills: string[] = (() => {
        const times: string[] = [];
        for (let h = 8; h <= 20; h++) {
            for (const m of [0, 30]) {
                if (h === 20 && m === 30) continue;
                const hour12 = h > 12 ? h - 12 : (h === 0 ? 12 : h);
                const ampm = h < 12 ? 'AM' : 'PM';
                times.push(`${hour12}:${String(m).padStart(2, '0')} ${ampm}`);
            }
        }
        return times;
    })();

    getMeetingLinkIcon(url: string): { icon: string; color: string } {
        if (!url) return { icon: 'link', color: 'var(--mat-sys-primary)' };
        if (url.includes('meet.google.com'))      return { icon: 'video_call',        color: '#34a853' };
        if (url.includes('zoom.us'))              return { icon: 'video_camera_front', color: '#2d8cff' };
        if (url.includes('teams.microsoft.com')) return { icon: 'groups',             color: '#464eb8' };
        return { icon: 'link', color: 'var(--mat-sys-primary)' };
    }

    get meetingLinkError(): string | null {
        if (!this.formMeetingLink) return null;
        try { new URL(this.formMeetingLink); return null; } catch { return 'Please enter a valid URL (e.g. https://meet.google.com/...)'; }
    }

    // ── Mini-calendar state ────────────────────────────────────────
    calDisplayYear: number = new Date().getFullYear();
    calDisplayMonth: number = new Date().getMonth(); // 0-indexed
    readonly CAL_DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    readonly CAL_MONTHS = ['January','February','March','April','May','June',
                           'July','August','September','October','November','December'];

    getCalendarGrid(): {date: Date | null; isToday: boolean; isPast: boolean; isSelected: boolean}[] {
        const todayMidnight = new Date(); todayMidnight.setHours(0,0,0,0);
        const firstDay = new Date(this.calDisplayYear, this.calDisplayMonth, 1);
        const startOffset = firstDay.getDay(); // 0=Sun
        const daysInMonth = new Date(this.calDisplayYear, this.calDisplayMonth + 1, 0).getDate();
        const grid: {date: Date | null; isToday: boolean; isPast: boolean; isSelected: boolean}[] = [];
        for (let i = 0; i < startOffset; i++) {
            grid.push({ date: null, isToday: false, isPast: false, isSelected: false });
        }
        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(this.calDisplayYear, this.calDisplayMonth, d);
            const t = date.getTime();
            grid.push({
                date,
                isToday: t === todayMidnight.getTime(),
                isPast: date < todayMidnight,
                isSelected: !!this.formMeetingDate &&
                    t === new Date(this.formMeetingDate.getFullYear(), this.formMeetingDate.getMonth(), this.formMeetingDate.getDate()).getTime(),
            });
        }
        while (grid.length % 7 !== 0) grid.push({ date: null, isToday: false, isPast: false, isSelected: false });
        return grid;
    }

    prevCalMonth(): void {
        if (this.calDisplayMonth === 0) { this.calDisplayMonth = 11; this.calDisplayYear--; }
        else this.calDisplayMonth--;
    }

    nextCalMonth(): void {
        if (this.calDisplayMonth === 11) { this.calDisplayMonth = 0; this.calDisplayYear++; }
        else this.calDisplayMonth++;
    }

    selectCalDate(date: Date | null): void {
        if (!date) return;
        const today = new Date(); today.setHours(0,0,0,0);
        if (date < today) return;
        this.formMeetingDate = date;
    }

    generateMeetingLink(roomName: string, roomId: number): string {
        const slug = roomName.toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .substring(0, 30);
        return `https://meet.jit.si/${slug}-${roomId}`;
    }

    // ── Participant selection ──────────────────────────────────────
    participantUsers = signal<{id: number; fullName: string; role: string}[]>([]);
    participantsLoading = signal(false);
    selectedParticipantIds: number[] = [];
    participantsAdding = signal(false);

    onRoomTypeSelect(type: RoomType): void {
        this.formRoomType = type;
        if (type === 'meeting' && this.participantUsers().length === 0) {
            this.loadParticipantUsers();
        }
    }

    private loadParticipantUsers(): void {
        this.participantsLoading.set(true);
        const role = this.authService.currentUser()?.role ?? '';
        const targetRole = role === 'TUTOR' ? 'STUDENT' : 'EMPLOYEE';
        this.memberService.getUsersByRole(targetRole).subscribe({
            next: (users) => { this.participantUsers.set(users); this.participantsLoading.set(false); },
            error: () => { this.participantsLoading.set(false); },
        });
    }

    toggleParticipant(id: number): void {
        const idx = this.selectedParticipantIds.indexOf(id);
        if (idx === -1) this.selectedParticipantIds = [...this.selectedParticipantIds, id];
        else this.selectedParticipantIds = this.selectedParticipantIds.filter(i => i !== id);
    }

    getParticipantName(id: number): string {
        return this.participantUsers().find(u => u.id === id)?.fullName ?? String(id);
    }

    getParticipantInitials(name: string): string {
        if (!name) return '?';
        return name.trim().split(/\s+/).map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }

    getParticipantAvatarStyle(name: string): {[k: string]: string} {
        const hash = name.split('').reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);
        const hue = Math.abs(hash) % 360;
        return { background: `linear-gradient(135deg, hsl(${hue},62%,52%), hsl(${(hue+48)%360},58%,42%))` };
    }

    private _addMembersToRoom(roomId: number, ids: number[], onDone: () => void): void {
        if (ids.length === 0) { onDone(); return; }
        const [first, ...rest] = ids;
        this.memberService.addMember(roomId, first).subscribe({
            next: () => this._addMembersToRoom(roomId, rest, onDone),
            error: () => this._addMembersToRoom(roomId, rest, onDone),
        });
    }

    readonly stepSubtitles = [
        'Choose the project this channel belongs to',
        'Set the name, description, and type',
        'Confirm the details and save',
    ];

    readonly roomTypes: { value: RoomType; label: string }[] = [
        { value: 'general',             label: 'General'            },
        { value: 'task_thread',         label: 'Task Thread'        },
        { value: 'deliverable_review',  label: 'Deliverable Review' },
        { value: 'private_room',        label: 'Private Room'       },
        { value: 'meeting',             label: 'Meeting'            },
    ];

    get step1Valid(): boolean { return !!this.formProjectId?.trim(); }
    get step2NameError(): string | null {
        const v = (this.formName ?? '').trim();
        if (!v) return 'Channel name is required.';
        if (v.length < 3) return 'Name must be at least 3 characters.';
        if (v.length > 50) return 'Name must be at most 50 characters.';
        return null;
    }
    get step2DescError(): string | null {
        const v = (this.formDescription ?? '').trim();
        if (!v) return 'Description is required.';
        if (v.length < 10) return 'Description must be at least 10 characters.';
        if (v.length > 200) return 'Description must be at most 200 characters.';
        return null;
    }
    get step2Valid(): boolean {
        return !this.step2NameError && !this.step2DescError && !!this.formRoomType;
    }

    constructor(
        public dialogRef: MatDialogRef<RoomWizardDialogComponent>,
        @Inject(MAT_DIALOG_DATA) data: { editingRoom: ChatRoom | null; rooms: ChatRoom[] },
        private chatRoomService: ChatRoomService,
        private memberService: ChatRoomMemberService,
        private authService: AuthService,
    ) {
        this.editingRoom = data.editingRoom;
        this.rooms = data.rooms;
        if (data.editingRoom) {
            this.formProjectId  = data.editingRoom.projectId ?? '';
            this.formName       = data.editingRoom.name;
            this.formDescription = data.editingRoom.description ?? '';
            this.formRoomType   = (data.editingRoom.roomType?.toLowerCase() as RoomType) ?? 'general';
            if (data.editingRoom.startTime) this.formMeetingDate = new Date(data.editingRoom.startTime);
            if (data.editingRoom.startTime) {
                const d = new Date(data.editingRoom.startTime);
                const h = d.getHours(); const m = d.getMinutes();
                const h12 = h > 12 ? h - 12 : (h === 0 ? 12 : h);
                this.formStartTime = `${h12}:${String(m).padStart(2,'0')} ${h < 12 ? 'AM' : 'PM'}`;
            }
            if (data.editingRoom.endTime) {
                const d = new Date(data.editingRoom.endTime);
                const h = d.getHours(); const m = d.getMinutes();
                const h12 = h > 12 ? h - 12 : (h === 0 ? 12 : h);
                this.formEndTime = `${h12}:${String(m).padStart(2,'0')} ${h < 12 ? 'AM' : 'PM'}`;
            }
            this.formMeetingLink = data.editingRoom.meetingLink ?? '';
        }
        this.loadProjectsInternal();
    }

    private loadProjectsInternal(): void {
        this.projectsLoading.set(true);
        this.chatRoomService.getProjects().subscribe({
            next: (list) => { this.projects = list; this.projectsLoading.set(false); },
            error: ()     => { this.projectsLoading.set(false); },
        });
    }

    private triggerShake(): void {
        this.formShaking.set(false);
        setTimeout(() => {
            this.formShaking.set(true);
            setTimeout(() => this.formShaking.set(false), 350);
        }, 0);
    }

    getProjectName(id: string): string {
        return this.projects.find(p => p.id === id)?.name ?? id;
    }
    getRoomTypeLabel(type: string): string {
        return this.roomTypes.find(t => t.value === type?.toLowerCase())?.label ?? type ?? '';
    }

    cancel(): void { this.dialogRef.close(); }

    nextStep(): void {
        if (this.formStep() === 1) {
            if (!this.step1Valid) { this.formTouched.set(true); this.triggerShake(); return; }
            this.formTouched.set(false);
            this.formStep.set(2);
        } else if (this.formStep() === 2) {
            this.formTouched.set(true);
            if (!this.step2Valid) { this.triggerShake(); return; }
            // Duplicate detection
            const name = this.formName.trim().toLowerCase();
            const projectId = this.formProjectId.trim();
            const type = this.formRoomType;
            const isDuplicate = this.rooms.some(r => {
                if (this.editingRoom && r.id === this.editingRoom.id) return false;
                return r.projectId === projectId &&
                       (r.name ?? '').trim().toLowerCase() === name &&
                       r.roomType === type;
            });
            if (isDuplicate) {
                this.formError = 'A channel with this name and type already exists in the selected project.';
                this.triggerShake(); return;
            }
            this.formError = '';
            this.formTouched.set(false);
            this.formStep.set(3);
        }
    }

    prevStep(): void {
        if (this.formStep() > 1) {
            this.formStep.update(s => (s - 1) as 1 | 2 | 3);
            this.formTouched.set(false);
            this.formError = '';
        }
    }

    saveRoom(): void {
        const payload: ChatRoomPayload = {
            projectId:   this.formProjectId.trim(),
            name:        this.formName.trim(),
            description: this.formDescription.trim(),
            roomType:    this.formRoomType as RoomType,
        };
        if (this.formRoomType === 'meeting') {
            if (this.formMeetingDate && this.formStartTime) {
                payload.startTime = this._buildIsoFromDateAndTimePill(this.formMeetingDate, this.formStartTime);
            }
            if (this.formMeetingDate && this.formEndTime) {
                payload.endTime = this._buildIsoFromDateAndTimePill(this.formMeetingDate, this.formEndTime);
            }
            // Auto-generate link for new rooms; preserve existing link for edits
            const editing = this.editingRoom;
            if (!editing) {
                const tempId = Date.now() % 100000;
                payload.meetingLink = this.generateMeetingLink(payload.name, tempId);
            } else if (this.formMeetingLink.trim()) {
                payload.meetingLink = this.formMeetingLink.trim();
            }
        }
        this.saving.set(true);
        this.formError = '';
        const editing = this.editingRoom;
        const op = editing
            ? this.chatRoomService.updateRoom(editing.id, payload)
            : this.chatRoomService.createRoom(payload);
        op.subscribe({
            next: (saved) => {
                this.saving.set(false);
                // Add selected participants after creation (only for new meeting rooms)
                if (!editing && this.formRoomType === 'meeting' && this.selectedParticipantIds.length > 0) {
                    this.participantsAdding.set(true);
                    this._addMembersToRoom(saved.id, [...this.selectedParticipantIds], () => {
                        this.participantsAdding.set(false);
                        this.dialogRef.close({ saved, isEdit: false });
                    });
                } else {
                    this.dialogRef.close({ saved, isEdit: !!editing });
                }
            },
            error: (err) => {
                if (err?.status === 409) {
                    this.formError = 'A channel with this name and type already exists in the selected project.';
                    this.formStep.set(2);
                } else {
                    this.formError = err?.error?.message ?? 'Failed to save. Please try again.';
                }
                this.saving.set(false);
            },
        });
    }

    private _buildIsoFromDateAndTimePill(date: Date, pill: string): string {
        // pill format: "9:00 AM" or "10:30 PM"
        const [timePart, ampm] = pill.split(' ');
        const [hStr, mStr] = timePart.split(':');
        let h = parseInt(hStr, 10);
        const m = parseInt(mStr, 10);
        if (ampm === 'PM' && h !== 12) h += 12;
        if (ampm === 'AM' && h === 12) h = 0;
        const d = new Date(date);
        d.setHours(h, m, 0, 0);
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(h)}:${pad(m)}:00`;
    }
}

/* ══ Delete Room Confirmation Dialog ══════════════════════════════════════ */
@Component({
    selector: 'app-delete-room-dialog',
    standalone: true,
    imports: [CommonModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatDialogModule],
    template: `
        <div class="drd-wrap">
            <div class="drd-icon-ring">
                <mat-icon class="drd-icon">delete_forever</mat-icon>
            </div>
            <h2 class="drd-title">Delete Room</h2>
            <p class="drd-room-name">#{{ data.room.name }}</p>
            <p class="drd-subtitle">This action cannot be undone. All messages and files will be permanently lost.</p>
            @if (dialogError()) {
                <p class="drd-error">{{ dialogError() }}</p>
            }
            <div class="drd-actions">
                <button mat-stroked-button class="drd-cancel-btn" (click)="cancel()" [disabled]="deleting()">
                    Cancel
                </button>
                <button mat-flat-button class="drd-delete-btn" (click)="confirm()" [disabled]="deleting()">
                    @if (deleting()) {
                        <mat-spinner diameter="18" class="drd-spinner"></mat-spinner>
                    } @else {
                        <mat-icon style="font-size:18px;width:18px;height:18px;margin-right:6px">delete_forever</mat-icon>
                        Delete Room
                    }
                </button>
            </div>
        </div>
    `,
    styles: [`
        .drd-wrap {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 32px 28px 24px;
            text-align: center;
            min-width: 320px;
            max-width: 400px;
        }
        @keyframes drd-pulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.35); }
            50%       { box-shadow: 0 0 0 10px rgba(239,68,68,0); }
        }
        .drd-icon-ring {
            width: 64px;
            height: 64px;
            border-radius: 50%;
            background: linear-gradient(135deg, rgba(239,68,68,0.15), rgba(251,113,133,0.1));
            border: 2px solid rgba(239,68,68,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 20px;
            animation: drd-pulse 2s ease-in-out infinite;
        }
        .drd-icon {
            font-size: 30px !important;
            width: 30px !important;
            height: 30px !important;
            color: #ef4444;
        }
        .drd-title {
            font-size: 18px;
            font-weight: 700;
            margin: 0 0 6px;
            letter-spacing: -0.02em;
        }
        .drd-room-name {
            font-size: 15px;
            font-weight: 700;
            color: var(--mat-sys-primary);
            margin: 0 0 12px;
            letter-spacing: -0.01em;
        }
        .drd-subtitle {
            font-size: 13px;
            color: var(--mat-sys-on-surface-variant);
            margin: 0 0 20px;
            line-height: 1.6;
        }
        .drd-error {
            font-size: 12.5px;
            color: #ef4444;
            background: rgba(239,68,68,0.08);
            border: 1px solid rgba(239,68,68,0.25);
            border-radius: 8px;
            padding: 8px 14px;
            margin: 0 0 16px;
            width: 100%;
            box-sizing: border-box;
        }
        .drd-actions {
            display: flex;
            gap: 10px;
            width: 100%;
            justify-content: center;
        }
        .drd-cancel-btn {
            flex: 1;
            height: 40px;
        }
        .drd-delete-btn {
            flex: 1.4;
            height: 40px;
            background: #ef4444 !important;
            color: #fff !important;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 2px;
        }
        .drd-delete-btn:hover:not(:disabled) {
            background: #dc2626 !important;
        }
        .drd-spinner { display: inline-block; }
        ::ng-deep .drd-spinner circle { stroke: #fff !important; }
    `],
})
export class DeleteRoomDialogComponent {
    deleting = signal(false);
    dialogError = signal('');

    constructor(
        public dialogRef: MatDialogRef<DeleteRoomDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { room: ChatRoom },
        private chatRoomService: ChatRoomService,
    ) {}

    confirm(): void {
        this.deleting.set(true);
        this.dialogError.set('');
        this.chatRoomService.deleteRoom(this.data.room.id).subscribe({
            next: () => this.dialogRef.close({ deleted: true, id: this.data.room.id }),
            error: (err) => {
                this.deleting.set(false);
                this.dialogError.set(err?.error?.message ?? 'Failed to delete room. Please try again.');
            },
        });
    }

    cancel(): void {
        if (!this.deleting()) this.dialogRef.close();
    }
}

/* ══ Voice Send Choice Dialog ════════════════════════════════════════════ */
@Component({
    selector: 'app-voice-send-choice-dialog',
    standalone: true,
    imports: [CommonModule, MatButtonModule, MatIconModule, MatDialogModule],
    template: `
        <div class="vscd-wrap" [class.vscd-closing]="closing()">
            <!-- Header icon -->
            <div class="vscd-icon-ring">
                <mat-icon class="vscd-mic-icon">mic</mat-icon>
            </div>
            <h2 class="vscd-title">How would you like to send?</h2>
            <p class="vscd-subtitle">Your message has been recorded and transcribed</p>

            <!-- Choice cards -->
            <div class="vscd-cards">
                <!-- Voice card -->
                <button class="vscd-card vscd-card-voice"
                        (click)="choose('voice')"
                        [class.vscd-card-pressed]="pressing() === 'voice'">
                    <mat-icon class="vscd-card-icon">graphic_eq</mat-icon>
                    <div class="vscd-card-label">Send as Voice</div>
                    <div class="vscd-card-sub">Send the original audio recording</div>
                    <div class="vscd-mini-wave">
                        <span class="vscd-wave-bar"></span>
                        <span class="vscd-wave-bar"></span>
                        <span class="vscd-wave-bar"></span>
                        <span class="vscd-wave-bar"></span>
                        <span class="vscd-wave-bar"></span>
                    </div>
                </button>
                <!-- Text card -->
                <button class="vscd-card vscd-card-text"
                        (click)="choose('text')"
                        [class.vscd-card-pressed]="pressing() === 'text'">
                    <mat-icon class="vscd-card-icon vscd-text-icon">chat_bubble</mat-icon>
                    <div class="vscd-card-label">Send as Text</div>
                    <div class="vscd-card-sub">Send the transcribed message as text</div>
                    @if (data.transcript) {
                        <div class="vscd-transcript-preview">"{{ data.transcript.slice(0, 80) }}{{ data.transcript.length > 80 ? '...' : '' }}"</div>
                    }
                </button>
            </div>

            <!-- Transcript footer -->
            @if (data.transcript) {
                <div class="vscd-transcript-footer">
                    Transcript: "{{ data.transcript.slice(0, 50) }}{{ data.transcript.length > 50 ? '…' : '' }}"
                </div>
            } @else {
                <div class="vscd-transcript-footer vscd-no-transcript">No speech detected</div>
            }

            <!-- Cancel -->
            <button class="vscd-cancel-link" mat-button (click)="choose('cancel')">Cancel</button>
        </div>
    `,
    styles: [`
        @keyframes vscd-enter {
            from { transform: scale(0.8); opacity: 0; }
            to   { transform: scale(1);   opacity: 1; }
        }
        @keyframes vscd-exit {
            from { transform: scale(1);   opacity: 1; }
            to   { transform: scale(0.8); opacity: 0; }
        }
        @keyframes vscd-mic-pulse {
            0%, 100% { box-shadow: 0 0 0 0   color-mix(in srgb, var(--mat-sys-primary) 35%, transparent); }
            50%       { box-shadow: 0 0 0 12px color-mix(in srgb, var(--mat-sys-primary) 0%,  transparent); }
        }
        @keyframes vscd-wave-anim {
            0%, 100% { transform: scaleY(0.3); }
            50%       { transform: scaleY(1);   }
        }
        .vscd-wrap {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 32px 28px 24px;
            text-align: center;
            min-width: 320px;
            max-width: 480px;
            animation: vscd-enter 350ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .vscd-wrap.vscd-closing {
            animation: vscd-exit 200ms ease forwards;
        }
        .vscd-icon-ring {
            width: 64px;
            height: 64px;
            border-radius: 50%;
            background: linear-gradient(135deg,
                color-mix(in srgb, var(--mat-sys-primary) 15%, transparent),
                color-mix(in srgb, var(--mat-sys-primary) 8%, transparent));
            border: 2px solid color-mix(in srgb, var(--mat-sys-primary) 30%, transparent);
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 20px;
            animation: vscd-mic-pulse 2s ease-in-out infinite;
        }
        .vscd-mic-icon {
            font-size: 30px !important;
            width: 30px !important;
            height: 30px !important;
            color: var(--mat-sys-primary);
        }
        .vscd-title {
            font-size: 18px;
            font-weight: 700;
            margin: 0 0 6px;
            letter-spacing: -0.02em;
        }
        .vscd-subtitle {
            font-size: 13px;
            color: var(--mat-sys-on-surface-variant);
            margin: 0 0 24px;
            line-height: 1.6;
        }
        .vscd-cards {
            display: flex;
            gap: 14px;
            width: 100%;
            margin-bottom: 18px;
        }
        .vscd-card {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            padding: 18px 14px 16px;
            border-radius: 14px;
            border: 2px solid transparent;
            background: var(--mat-sys-surface-container);
            cursor: pointer;
            transition: transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease;
            text-align: center;
            font-family: inherit;
            outline: none;
        }
        .vscd-card:hover {
            transform: translateY(-3px) scale(1.03);
            box-shadow: 0 8px 24px rgba(0,0,0,0.12);
            border-color: var(--mat-sys-primary);
        }
        .vscd-card.vscd-card-pressed {
            transform: scale(0.97);
        }
        .vscd-card-icon {
            font-size: 32px !important;
            width: 32px !important;
            height: 32px !important;
            color: var(--mat-sys-primary);
        }
        .vscd-text-icon {
            color: var(--mat-sys-secondary);
        }
        .vscd-card-label {
            font-size: 14px;
            font-weight: 700;
            letter-spacing: -0.01em;
        }
        .vscd-card-sub {
            font-size: 11.5px;
            color: var(--mat-sys-on-surface-variant);
            line-height: 1.4;
        }
        .vscd-mini-wave {
            display: flex;
            align-items: center;
            gap: 3px;
            height: 20px;
            margin-top: 4px;
        }
        .vscd-wave-bar {
            width: 3px;
            border-radius: 2px;
            background: var(--mat-sys-primary);
            opacity: 0.7;
            animation: vscd-wave-anim 0.8s ease-in-out infinite;
        }
        .vscd-wave-bar:nth-child(1) { animation-delay: 0s;    height: 8px;  }
        .vscd-wave-bar:nth-child(2) { animation-delay: 0.15s; height: 14px; }
        .vscd-wave-bar:nth-child(3) { animation-delay: 0.3s;  height: 18px; }
        .vscd-wave-bar:nth-child(4) { animation-delay: 0.15s; height: 12px; }
        .vscd-wave-bar:nth-child(5) { animation-delay: 0s;    height: 8px;  }
        .vscd-transcript-preview {
            font-size: 11px;
            color: var(--mat-sys-on-surface-variant);
            font-style: italic;
            line-height: 1.4;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            margin-top: 4px;
            max-width: 100%;
        }
        .vscd-transcript-footer {
            font-size: 12px;
            color: var(--mat-sys-on-surface-variant);
            font-style: italic;
            margin-bottom: 16px;
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .vscd-no-transcript {
            color: var(--mat-sys-error);
            font-style: normal;
        }
        .vscd-cancel-link {
            font-size: 13px;
            color: var(--mat-sys-on-surface-variant);
        }
        @media (max-width: 480px) {
            .vscd-cards { flex-direction: column; }
            .vscd-wrap  { padding: 24px 18px 20px; min-width: 0; }
        }
    `],
})
export class VoiceSendChoiceDialogComponent {
    closing  = signal(false);
    pressing = signal<'voice' | 'text' | 'cancel' | null>(null);

    constructor(
        public dialogRef: MatDialogRef<VoiceSendChoiceDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { transcript: string },
    ) {}

    choose(choice: 'voice' | 'text' | 'cancel'): void {
        this.pressing.set(choice);
        this.closing.set(true);
        setTimeout(() => this.dialogRef.close({ choice }), 200);
    }
}

/* ══ Cancel Scheduled Message Confirmation Dialog ════════════════════════ */
@Component({
    selector: 'app-cancel-scheduled-dialog',
    standalone: true,
    imports: [CommonModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatDialogModule],
    template: `
        <div class="drd-wrap">
            <div class="drd-icon-ring" style="background:linear-gradient(135deg,rgba(251,146,60,0.15),rgba(249,115,22,0.1));border-color:rgba(251,146,60,0.3)">
                <mat-icon class="drd-icon" style="color:#f97316">schedule</mat-icon>
            </div>
            <h2 class="drd-title">Cancel Scheduled Message</h2>
            <p class="drd-subtitle" style="margin-top:0">This message will not be sent. This action cannot be undone.</p>
            @if (dialogError()) { <p class="drd-error">{{ dialogError() }}</p> }
            <div class="drd-actions">
                <button mat-stroked-button class="drd-cancel-btn" (click)="cancel()" [disabled]="deleting()">Keep it</button>
                <button mat-flat-button style="background:#f97316;color:#fff" (click)="confirm()" [disabled]="deleting()">
                    @if (deleting()) { <mat-spinner diameter="18" class="drd-spinner"></mat-spinner> }
                    @else { <mat-icon style="font-size:18px;width:18px;height:18px;margin-right:6px">cancel_schedule_send</mat-icon> Cancel Message }
                </button>
            </div>
        </div>
    `,
    styles: [`
        .drd-wrap{display:flex;flex-direction:column;align-items:center;padding:32px 28px 24px;text-align:center;min-width:320px;max-width:400px}
        .drd-icon-ring{width:64px;height:64px;border-radius:50%;border:2px solid;display:flex;align-items:center;justify-content:center;margin-bottom:20px}
        .drd-icon{font-size:30px!important;width:30px!important;height:30px!important}
        .drd-title{font-size:18px;font-weight:700;margin:0 0 8px}
        .drd-subtitle{font-size:13px;color:var(--mat-sys-on-surface-variant);margin-bottom:20px;line-height:1.5}
        .drd-error{color:#ef4444;font-size:13px;margin-bottom:12px}
        .drd-actions{display:flex;gap:10px;width:100%}
        .drd-cancel-btn{flex:1}
        .drd-spinner{display:inline-block}
    `],
})
export class CancelScheduledDialogComponent {
    deleting  = signal(false);
    dialogError = signal('');
    constructor(
        private dialogRef: MatDialogRef<CancelScheduledDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { item: ScheduledMessageDTO },
        private chatMessageService: ChatMessageService,
    ) {}
    cancel(): void { this.dialogRef.close({ cancelled: false }); }
    confirm(): void {
        this.deleting.set(true);
        this.chatMessageService.deleteScheduled(this.data.item.roomId, this.data.item.id).subscribe({
            next: () => this.dialogRef.close({ cancelled: true, id: this.data.item.id }),
            error: (err) => { this.dialogError.set(err?.error?.message ?? 'Failed.'); this.deleting.set(false); },
        });
    }
}

/* ══ Remove Member Confirmation Dialog ═══════════════════════════════════ */
@Component({
    selector: 'app-remove-member-dialog',
    standalone: true,
    imports: [CommonModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatDialogModule],
    template: `
        <div class="drd-wrap">
            <div class="drd-icon-ring">
                <mat-icon class="drd-icon">person_remove</mat-icon>
            </div>
            <h2 class="drd-title">Remove Member</h2>
            <p class="drd-room-name">{{ data.member.userFullName }}</p>
            <p class="drd-subtitle">Are you sure you want to remove <strong>{{ data.member.userFullName }}</strong> from this chatroom? They will lose access immediately.</p>
            @if (dialogError()) {
                <p class="drd-error">{{ dialogError() }}</p>
            }
            <div class="drd-actions">
                <button mat-stroked-button class="drd-cancel-btn" (click)="cancel()" [disabled]="removing()">
                    Cancel
                </button>
                <button mat-flat-button class="drd-remove-btn" (click)="confirm()" [disabled]="removing()">
                    @if (removing()) {
                        <mat-spinner diameter="18" class="drd-spinner"></mat-spinner>
                    } @else {
                        <mat-icon style="font-size:18px;width:18px;height:18px;margin-right:6px">person_remove</mat-icon>
                        Remove
                    }
                </button>
            </div>
        </div>
    `,
    styles: [`
        .drd-wrap {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 32px 28px 24px;
            text-align: center;
            min-width: 320px;
            max-width: 400px;
        }
        @keyframes rmd-pulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.35); }
            50%       { box-shadow: 0 0 0 10px rgba(239,68,68,0); }
        }
        .drd-icon-ring {
            width: 64px;
            height: 64px;
            border-radius: 50%;
            background: linear-gradient(135deg, rgba(239,68,68,0.15), rgba(251,113,133,0.1));
            border: 2px solid rgba(239,68,68,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 20px;
            animation: rmd-pulse 2s ease-in-out infinite;
        }
        .drd-icon {
            font-size: 30px !important;
            width: 30px !important;
            height: 30px !important;
            color: #ef4444;
        }
        .drd-title {
            font-size: 18px;
            font-weight: 700;
            margin: 0 0 6px;
            letter-spacing: -0.02em;
        }
        .drd-room-name {
            font-size: 15px;
            font-weight: 700;
            color: var(--mat-sys-primary);
            margin: 0 0 12px;
            letter-spacing: -0.01em;
        }
        .drd-subtitle {
            font-size: 13px;
            color: var(--mat-sys-on-surface-variant);
            margin: 0 0 20px;
            line-height: 1.6;
        }
        .drd-error {
            font-size: 12.5px;
            color: #ef4444;
            background: rgba(239,68,68,0.08);
            border: 1px solid rgba(239,68,68,0.25);
            border-radius: 8px;
            padding: 8px 14px;
            margin: 0 0 16px;
            width: 100%;
            box-sizing: border-box;
        }
        .drd-actions {
            display: flex;
            gap: 10px;
            width: 100%;
            justify-content: center;
        }
        .drd-cancel-btn {
            flex: 1;
            height: 40px;
        }
        .drd-remove-btn {
            flex: 1.4;
            height: 40px;
            background: #ef4444 !important;
            color: #fff !important;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 2px;
        }
        .drd-remove-btn:hover:not(:disabled) {
            background: #dc2626 !important;
        }
        .drd-spinner { display: inline-block; }
        ::ng-deep .drd-spinner circle { stroke: #fff !important; }
    `],
})
export class RemoveMemberDialogComponent {
    removing    = signal(false);
    dialogError = signal('');

    constructor(
        public dialogRef: MatDialogRef<RemoveMemberDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { member: RoomMemberDTO; roomId: number },
        private memberService: ChatRoomMemberService,
    ) {}

    confirm(): void {
        this.removing.set(true);
        this.dialogError.set('');
        this.memberService.removeMember(this.data.roomId, this.data.member.userId).subscribe({
            next: () => this.dialogRef.close({ removed: true, memberId: this.data.member.id }),
            error: (err) => {
                this.removing.set(false);
                this.dialogError.set(err?.error?.message ?? 'Failed to remove member. Please try again.');
            },
        });
    }

    cancel(): void {
        if (!this.removing()) this.dialogRef.close();
    }
}

@Component({
    selector: "app-chat",
    standalone: true,
    providers: [provideNativeDateAdapter()],
    imports: [
        CommonModule, FormsModule,
        MatListModule, MatMenuModule, MatIconModule,
        MatInputModule, MatFormFieldModule, MatCardModule,
        MatToolbarModule, MatButtonModule,
        MatSelectModule, MatProgressSpinnerModule,
        MatSnackBarModule,
        MatDividerModule, MatTooltipModule,
        MatDialogModule,
        MatDatepickerModule, MatChipsModule,
        MatCheckboxModule,
        QuillModule,
        RoomWizardDialogComponent,
        DeleteRoomDialogComponent,
        CancelScheduledDialogComponent,
        RemoveMemberDialogComponent,
        VoiceSendChoiceDialogComponent,
        SnackbarSuccessComponent,
    ],
    template: `
        <!-- ══ Page breadcrumb header ══════════════════════════════════════ -->
        <div class="container-fluid fade-in mb-3 mb-lg-4">
            <mat-card class="bg-light-theme shadow-none pt-3 pb-lg-3 px-3">
                <div class="row gx-3 align-items-center">
                    <div class="col mb-3 mb-xl-0 py-1">
                        <h3 class="mb-1 fw-bold">Chat Rooms</h3>
                        <p class="text-secondary small mb-0">Collaborate with your team in real time</p>
                    </div>
                    <div class="col-auto mb-3 mb-xl-0">
                        <app-page-right></app-page-right>
                    </div>
                </div>
            </mat-card>
        </div>

        <!-- ══ Main chat layout ════════════════════════════════════════════ -->
        <div class="container-fluid px-3 px-lg-4">
            <div class="inner-sidebar-wrap chat-layout">

                <!-- ══ LEFT: Channel sidebar ══════════════════════════════ -->
                <div class="inner-sidebar chat-sidebar px-0">

                    <!-- ── WhatsApp-style top bar ── -->
                    <div class="wa-sidebar-top">
                        <div class="wa-sidebar-top-left">
                            <button matIconButton class="wa-icon-btn d-lg-none me-1"
                                    (click)="innersidebar()" matTooltip="Back">
                                <mat-icon class="material-icons-outlined">arrow_back</mat-icon>
                            </button>
                            <span class="wa-sidebar-title">Channels</span>
                        </div>
                        <div class="wa-sidebar-actions">
                            @if (canManageMembers) {
                                <button matIconButton class="wa-icon-btn"
                                        (click)="openMeetingCalendar()" matTooltip="Meeting calendar">
                                    <mat-icon>calendar_month</mat-icon>
                                </button>
                                <button matIconButton class="wa-icon-btn"
                                        (click)="openCreate()" matTooltip="New channel">
                                    <mat-icon>add_circle_outline</mat-icon>
                                </button>
                            }
                            <button matIconButton class="wa-icon-btn"
                                    [matMenuTriggerFor]="sidebarMoreMenu"
                                    matTooltip="More options">
                                <mat-icon>more_vert</mat-icon>
                            </button>
                            <mat-menu #sidebarMoreMenu="matMenu" xPosition="before">
                                <button mat-menu-item (click)="loadRooms()">
                                    <mat-icon class="material-icons-outlined">refresh</mat-icon>
                                    <span>Refresh</span>
                                </button>
                                @if (canManageMembers) {
                                    <mat-divider></mat-divider>
                                    <button mat-menu-item (click)="openCreate()">
                                        <mat-icon class="material-icons-outlined">add_circle_outline</mat-icon>
                                        <span>New channel</span>
                                    </button>
                                }
                            </mat-menu>
                        </div>
                    </div>

                    <!-- ── WhatsApp-style search bar ── -->
                    <div class="wa-search-wrap">
                        <div class="wa-search-box">
                            <mat-icon class="wa-search-icon material-icons-outlined">search</mat-icon>
                            <input class="wa-search-input"
                                   [ngModel]="searchQuery()"
                                   (ngModelChange)="searchQuery.set($event)"
                                   placeholder="Search or start a discussion" />
                            @if (searchQuery()) {
                                <button class="wa-search-clear" (click)="searchQuery.set('')" type="button">
                                    <mat-icon style="font-size:16px;width:16px;height:16px">close</mat-icon>
                                </button>
                            }
                        </div>
                    </div>

                    <!-- ── Filter chips ── -->
                    <div class="wa-chips-row">
                        <button class="wa-chip" type="button"
                                [class.wa-chip-active]="activeFilter() === 'all'"
                                (click)="activeFilter.set('all')">All</button>
                        <button class="wa-chip" type="button"
                                [class.wa-chip-active]="activeFilter() === 'unread'"
                                (click)="activeFilter.set('unread')">
                            Unread
                            @if (totalUnread() > 0) {
                                <span class="wa-chip-badge">{{ totalUnread() }}</span>
                            }
                        </button>
                        <button class="wa-chip" type="button"
                                [class.wa-chip-active]="activeFilter() === 'favorites'"
                                (click)="activeFilter.set('favorites')">Favorites</button>
                    </div>

                    <!-- Global error -->
                    @if (error()) {
                        <div class="chat-error mx-3 mb-2 px-3 py-2">
                            <mat-icon class="material-icons-outlined" style="font-size:15px;width:15px;height:15px">error_outline</mat-icon>
                            {{ error() }}
                        </div>
                    }

                    <!-- wizard moved to MatDialog (RoomWizardDialogComponent) -->

                    <!-- ── WhatsApp-style room list ── -->
                        <div class="wa-rooms-scroll">

                            @if (loading()) {
                                <div class="text-center py-5">
                                    <mat-spinner diameter="28"></mat-spinner>
                                    <p class="small text-secondary mt-2 mb-0">Fetching channels…</p>
                                </div>
                            } @else {

                                @for (group of roomsByType(); track group.type) {
                                    <!-- Section divider label -->
                                    <div class="wa-section-header">
                                        <span class="wa-section-label">{{ getRoomTypeLabel(group.type).toUpperCase() }}</span>
                                    </div>

                                    @for (room of group.rooms; track room.id; let i = $index) {
                                        <div class="wa-room-item"
                                             [class.wa-room-active]="activeRoom()?.id === room.id"
                                             (click)="selectRoom(room)"
                                             [@channelItemEnter]
                                             [style.--wa-item-delay]="i * 40 + 'ms'">

                                            <!-- Avatar -->
                                            <div class="wa-avatar"
                                                 [ngStyle]="getAvatarGradient(room.name)"
                                                 [class.wa-avatar-meeting-live]="room.roomType === 'meeting' && getMeetingStatus(room) === 'IN_PROGRESS'">
                                                {{ getInitials(room.name) }}
                                            </div>

                                            <!-- Main content -->
                                            <div class="wa-room-content">
                                                <div class="wa-room-top-row">
                                                    <span class="wa-room-name">{{ room.name }}</span>
                                                    @if (room.roomType === 'meeting' && room.startTime) {
                                                        <span class="wa-meeting-dot"
                                                              [class.wa-meeting-dot-live]="getMeetingStatus(room) === 'IN_PROGRESS'"
                                                              [class.wa-meeting-dot-soon]="getMeetingStatus(room) === 'STARTING_SOON'"
                                                              [class.wa-meeting-dot-ended]="getMeetingStatus(room) === 'ENDED'"
                                                              [matTooltip]="getMeetingStatus(room)">
                                                        </span>
                                                    }
                                                    <span class="wa-room-type-tag"
                                                          [class.wa-room-type-tag-unread]="(unreadCounts().get(room.id) ?? 0) > 0">
                                                        <mat-icon class="material-icons-outlined wa-type-icon">{{ getRoomTypeIcon(room.roomType ?? 'general') }}</mat-icon>
                                                    </span>
                                                </div>
                                                <div class="wa-room-bottom-row">
                                                    <span class="wa-room-preview">
                                                        @if (translatedRooms().has(room.id)) {
                                                            <span class="wa-translated-globe" title="You translated a message in this room">🌐</span>
                                                        }
                                                        {{ room.description || getRoomTypeLabel(room.roomType ?? 'general') + ' channel' }}
                                                    </span>
                                                    @if ((unreadCounts().get(room.id) ?? 0) > 0) {
                                                        <span class="wa-unread-badge" [@pillEnter]>{{ unreadCounts().get(room.id) }}</span>
                                                    }
                                                </div>
                                            </div>

                                            <!-- Manager three-dot menu (appears on hover) -->
                                            @if (canManageMembers) {
                                                <div class="wa-room-actions" (click)="$event.stopPropagation()">
                                                    <button matIconButton class="wa-action-btn"
                                                            [matMenuTriggerFor]="roomItemMenu"
                                                            matTooltip="Options">
                                                        <mat-icon style="font-size:16px;width:16px;height:16px">more_vert</mat-icon>
                                                    </button>
                                                    <mat-menu #roomItemMenu="matMenu" xPosition="before">
                                                        <button mat-menu-item (click)="openEdit(room, $event)">
                                                            <mat-icon class="material-icons-outlined">edit</mat-icon>
                                                            <span>Edit</span>
                                                        </button>
                                                        <mat-divider></mat-divider>
                                                        <button mat-menu-item (click)="confirmDelete(room.id, $event)" class="theme-red">
                                                            <mat-icon class="material-icons-outlined">delete</mat-icon>
                                                            <span>Delete</span>
                                                        </button>
                                                    </mat-menu>
                                                </div>
                                            }
                                        </div>
                                    }
                                }

                                @if (filteredRooms().length === 0) {
                                    <div class="text-center py-5 px-3">
                                        <mat-icon class="material-icons-outlined mb-2"
                                                  style="font-size:36px;width:36px;height:36px;color:var(--mat-sys-outline-variant)">
                                            forum
                                        </mat-icon>
                                        <p class="small text-secondary mb-0">
                                            {{ searchQuery() ? 'No channels matched your search.' : (canManageMembers ? 'No channels yet — click + to create one.' : 'You haven\'t been added to any channels yet.') }}
                                        </p>
                                    </div>
                                }
                            }
                        </div>
                </div>
                <!-- ══ /LEFT sidebar ══════════════════════════════════════ -->

                <!-- ══ RIGHT: Chat main area ═══════════════════════════════ -->
                <div class="inner-sidebar-content chat-main">

                    <!-- ── Empty state ──────────────────────────────────── -->
                    @if (!activeRoom()) {
                        <div class="chat-empty-state height-dynamic" style="--h-dynamic:calc(100vh - 250px)">
                            <div class="chat-empty-top">
                                <button matIconButton (click)="innersidebar()" matTooltip="Channels list"
                                        class="me-2 d-lg-none">
                                    <mat-icon class="material-icons-outlined">notes</mat-icon>
                                </button>
                            </div>
                            <div class="chat-empty-body">
                                <div class="chat-empty-icon-wrap">
                                    <mat-icon class="material-icons-outlined chat-empty-icon">forum</mat-icon>
                                </div>
                                <h4 class="chat-empty-title">Ready when you are</h4>
                                <p class="chat-empty-sub mb-3">Choose a channel from the sidebar<br>to jump into the conversation.</p>
                                <div class="chat-empty-hints">
                                    <div class="chat-empty-hint">
                                        <mat-icon class="material-icons-outlined" style="font-size:14px;width:14px;height:14px">tag</mat-icon>
                                        <span>Team discussions</span>
                                    </div>
                                    <div class="chat-empty-hint">
                                        <mat-icon class="material-icons-outlined" style="font-size:14px;width:14px;height:14px">check_circle_outline</mat-icon>
                                        <span>Task follow-ups</span>
                                    </div>
                                    <div class="chat-empty-hint">
                                        <mat-icon class="material-icons-outlined" style="font-size:14px;width:14px;height:14px">videocam</mat-icon>
                                        <span>Meeting catch-ups</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    }

                    <!-- ── Active room ──────────────────────────────────── -->
                    @if (activeRoom()) {
                        <div class="chat-room-wrap height-dynamic" style="--h-dynamic:calc(100vh - 250px)">

                            <!-- Chat header -->
                            <div class="chat-header px-3 py-2">
                                <div class="chat-header-accent-bar"></div>
                                <div class="chat-header-row">
                                    <button matIconButton (click)="innersidebar()" matTooltip="Toggle sidebar"
                                            class="me-1">
                                        <mat-icon class="material-icons-outlined">notes</mat-icon>
                                    </button>

                                    <div class="chat-header-type-icon">
                                        <mat-icon class="material-icons-outlined"
                                                  style="font-size:20px;width:20px;height:20px">
                                            {{ getRoomTypeIcon(activeRoom()?.roomType ?? 'general') }}
                                        </mat-icon>
                                    </div>

                                    <div class="chat-header-info">
                                        <div class="d-flex align-items-center gap-2">
                                            <span class="fw-bold chat-room-title">{{ activeRoom()?.name }}</span>
                                            <span class="room-type-pill">{{ getRoomTypeLabel(activeRoom()?.roomType ?? '') }}</span>
                                        </div>
                                        @if (activeRoom()?.projectId) {
                                            <span class="chat-room-subtitle text-secondary small">
                                                <mat-icon class="material-icons-outlined align-middle"
                                                          style="font-size:13px;width:13px;height:13px">folder_open</mat-icon>
                                                {{ getProjectName(activeRoom()!.projectId) }}
                                            </span>
                                        }
                                    </div>

                                    <div class="chat-header-actions ms-auto d-flex align-items-center gap-1">
                                        @if (pinnedCount() > 0) {
                                            <button matIconButton matTooltip="Pinned messages"
                                                    (click)="togglePinnedPanel()"
                                                    [class.header-btn-active]="pinnedPanelOpen()">
                                                <mat-icon style="font-size:19px;width:19px;height:19px">push_pin</mat-icon>
                                            </button>
                                        }
                                        @if (canManageMembers) {
                                            <button matIconButton matTooltip="Members"
                                                    (click)="membersPanelOpen.update(v => !v)"
                                                    [class.header-btn-active]="membersPanelOpen()">
                                                <mat-icon class="material-icons-outlined" style="font-size:19px;width:19px;height:19px">group</mat-icon>
                                            </button>
                                        }
                                        <button matIconButton matTooltip="Shared content"
                                                (click)="toggleSharedPanel()"
                                                [class.header-btn-active]="sharedPanelOpen()">
                                            <mat-icon class="material-icons-outlined" style="font-size:19px;width:19px;height:19px">perm_media</mat-icon>
                                        </button>
                                        @if (canManageMembers) {
                                            <button matIconButton matTooltip="Scheduled messages"
                                                    (click)="toggleScheduledPanel()"
                                                    [class.header-btn-active]="scheduledPanelOpen()">
                                                <mat-icon class="material-icons-outlined" style="font-size:19px;width:19px;height:19px">schedule_send</mat-icon>
                                            </button>
                                        }
                                        @if (activeRoom()?.roomType === 'meeting') {
                                            <button matIconButton matTooltip="Meeting Agenda"
                                                    (click)="toggleAgendaPanel()"
                                                    [class.header-btn-active]="agendaPanelOpen()">
                                                <mat-icon class="material-icons-outlined" style="font-size:19px;width:19px;height:19px">event_note</mat-icon>
                                            </button>
                                        }
                                        <button matIconButton matTooltip="{{ isSearchVisible() ? 'Close search' : 'Search messages' }}"
                                                (click)="toggleSearch()"
                                                [class.header-btn-active]="isSearchVisible()">
                                            <mat-icon class="material-icons-outlined" style="font-size:19px;width:19px;height:19px">
                                                {{ isSearchVisible() ? 'close' : 'search' }}
                                            </mat-icon>
                                        </button>
                                        @if (canManageMembers) {
                                            <button matIconButton [matMenuTriggerFor]="actionsMenu"
                                                    matTooltip="More actions"
                                                    (click)="$event.stopPropagation()">
                                                <mat-icon class="material-icons-outlined" style="font-size:19px;width:19px;height:19px">more_vert</mat-icon>
                                            </button>
                                            <mat-menu #actionsMenu="matMenu" xPosition="before">
                                                <button mat-menu-item (click)="openEdit(activeRoom()!, $event)">
                                                    <mat-icon class="material-icons-outlined">edit</mat-icon>
                                                    <span>Edit Channel</span>
                                                </button>
                                                <mat-divider></mat-divider>
                                                <button mat-menu-item (click)="confirmDelete(activeRoom()!.id, $event)"
                                                        class="theme-red">
                                                    <mat-icon class="material-icons-outlined">delete</mat-icon>
                                                    <span>Delete Channel</span>
                                                </button>
                                            </mat-menu>
                                        }
                                    </div>
                                </div>

                                @if (activeRoom()?.description) {
                                    <p class="chat-room-desc text-secondary small mb-0 mt-1 ps-1">
                                        {{ activeRoom()?.description }}
                                    </p>
                                }

                                <!-- ── Meeting status banner ── -->
                                @if (activeRoom()?.roomType === 'meeting' && activeRoom()?.startTime) {
                                    <div class="meeting-status-banner" [@fadeSlide]
                                         [class.meeting-status-live]="getMeetingStatus(activeRoom()!) === 'IN_PROGRESS'"
                                         [class.meeting-status-soon]="getMeetingStatus(activeRoom()!) === 'STARTING_SOON'"
                                         [class.meeting-status-ended]="getMeetingStatus(activeRoom()!) === 'ENDED'">
                                        @if (getMeetingStatus(activeRoom()!) === 'UPCOMING') {
                                            <mat-icon class="meeting-banner-icon material-icons-outlined">event</mat-icon>
                                            <span>{{ activeRoom()!.startTime | date:'MMM d' }} at {{ activeRoom()!.startTime | date:'h:mm a' }}</span>
                                        }
                                        @if (getMeetingStatus(activeRoom()!) === 'STARTING_SOON') {
                                            <mat-icon class="meeting-banner-icon material-icons-outlined">alarm</mat-icon>
                                            <span>Starts in {{ getMeetingMinutesLeft(activeRoom()!) }} min</span>
                                        }
                                        @if (getMeetingStatus(activeRoom()!) === 'IN_PROGRESS') {
                                            <span class="meeting-live-dot"></span>
                                            <span class="meeting-live-badge">LIVE</span>
                                            <span>Meeting in progress</span>
                                            @if (activeRoom()?.meetingLink) {
                                                <button class="meeting-join-btn" (click)="joinMeeting(activeRoom()!)">
                                                    <mat-icon style="font-size:16px;width:16px;height:16px">video_call</mat-icon>
                                                    Join Meeting
                                                </button>
                                            }
                                        }
                                        @if (getMeetingStatus(activeRoom()!) === 'ENDED') {
                                            <mat-icon class="meeting-banner-icon material-icons-outlined">event_busy</mat-icon>
                                            <span>Meeting ended</span>
                                        }
                                    </div>
                                }

                                <!-- ── Meeting link card ── -->
                                @if (activeRoom()?.roomType === 'meeting' && activeRoom()?.meetingLink) {
                                    <div class="meeting-link-card" [@fadeSlide]
                                         [class.meeting-link-card-live]="getMeetingStatus(activeRoom()!) === 'IN_PROGRESS'"
                                         [class.meeting-link-card-ended]="getMeetingStatus(activeRoom()!) === 'ENDED'">
                                        <div class="meeting-link-card-left">
                                            <mat-icon class="material-icons-outlined meeting-link-icon">video_call</mat-icon>
                                            <div class="meeting-link-info">
                                                @if (getMeetingStatus(activeRoom()!) === 'IN_PROGRESS') {
                                                    <span class="meeting-link-status meeting-link-status-live">🔴 LIVE — In Progress</span>
                                                } @else if (getMeetingStatus(activeRoom()!) === 'STARTING_SOON') {
                                                    <span class="meeting-link-status meeting-link-status-soon">⏰ Starts in {{ getMeetingMinutesLeft(activeRoom()!) }} min</span>
                                                } @else if (getMeetingStatus(activeRoom()!) === 'UPCOMING' && activeRoom()?.startTime) {
                                                    <span class="meeting-link-status">📅 {{ activeRoom()!.startTime | date:'EEE, MMM d' }} at {{ activeRoom()!.startTime | date:'h:mm a' }}</span>
                                                } @else if (getMeetingStatus(activeRoom()!) === 'ENDED') {
                                                    <span class="meeting-link-status" style="color:var(--mat-sys-on-surface-variant)">Meeting ended</span>
                                                }
                                                <span class="meeting-link-url-text">{{ activeRoom()!.meetingLink }}</span>
                                            </div>
                                        </div>
                                        <div class="meeting-link-card-right">
                                            @if (getMeetingStatus(activeRoom()!) !== 'ENDED') {
                                                <button mat-flat-button class="meeting-link-join-btn"
                                                        (click)="joinMeeting(activeRoom()!)">
                                                    <mat-icon style="font-size:15px;width:15px;height:15px">video_call</mat-icon>
                                                    {{ getMeetingStatus(activeRoom()!) === 'IN_PROGRESS' ? 'Join Now' : 'Join Meeting' }}
                                                </button>
                                            }
                                            <button matIconButton class="meeting-link-copy-btn"
                                                    (click)="copyMeetingLink(activeRoom()!)"
                                                    matTooltip="Copy link">
                                                <mat-icon style="font-size:16px;width:16px;height:16px">content_copy</mat-icon>
                                            </button>
                                        </div>
                                    </div>
                                }

                                @if (isSearchVisible()) {
                                    <div class="mt-2" [@fadeSlide]>
                                        <mat-form-field appearance="outline" class="w-100 inline-small">
                                            <mat-icon matPrefix class="material-icons-outlined"
                                                      style="font-size:18px;width:18px;height:18px">search</mat-icon>
                                            <mat-label>Search in channel…</mat-label>
                                            <input matInput placeholder="Search within this channel…" />
                                        </mat-form-field>
                                    </div>
                                }
                            </div>
                            <!-- /Chat header -->

                            <!-- WS error banner -->
                            @if (wsConnectionError()) {
                                <div class="chat-error px-3 py-2 mx-0 mb-0"
                                     style="border-radius:0;border-left:none;border-right:none;">
                                    <mat-icon class="material-icons-outlined" style="font-size:16px;width:16px;height:16px">wifi_off</mat-icon>
                                    {{ wsConnectionError() }}
                                </div>
                            }

                            <!-- Pinned messages banner -->
                            @if (pinnedCount() > 0) {
                                <div class="pin-banner" [@pinBannerEnter] (click)="togglePinnedPanel()">
                                    <div class="pin-banner-left">
                                        <span class="pin-banner-icon pin-wobble-el">📌</span>
                                        <div>
                                            <span class="pin-banner-title">{{ pinnedCount() }} pinned message{{ pinnedCount() > 1 ? 's' : '' }}</span>
                                            @if (pinnedMessages()[pinnedCount() - 1]?.contentText) {
                                                <span class="pin-banner-preview"
                                                      [innerHTML]="stripHtml(pinnedMessages()[pinnedCount() - 1].contentText!)">
                                                </span>
                                            }
                                        </div>
                                    </div>
                                    <mat-icon class="pin-banner-chevron"
                                              [@pinChevron]="pinnedPanelOpen() ? 'open' : 'closed'">chevron_right</mat-icon>
                                </div>
                            }

                                <!-- Shared content panel -->
                                @if (sharedPanelOpen()) {
                                    <div class="shared-panel" [@sharedPanelSlide] (click)="$event.stopPropagation()">

                                        <!-- Header -->
                                        <div class="sp-header">
                                            <div class="sp-header-left">
                                                <div class="sp-header-icon">
                                                    <mat-icon class="material-icons-outlined" style="font-size:20px;width:20px;height:20px">perm_media</mat-icon>
                                                </div>
                                                <div>
                                                    <p class="sp-title-text">Shared Content</p>
                                                    <p class="sp-title-sub">{{ sharedContent().length }} item{{ sharedContent().length !== 1 ? 's' : '' }}</p>
                                                </div>
                                            </div>
                                            <button class="pp-close-btn" (click)="sharedPanelOpen.set(false)" matTooltip="Close">
                                                <mat-icon style="font-size:18px;width:18px;height:18px">close</mat-icon>
                                            </button>
                                        </div>

                                        <!-- Tabs -->
                                        <div class="sp-tabs">
                                            <button class="sp-tab" [class.sp-tab-active]="activeSharedTab() === 'IMAGES'"
                                                    (click)="activeSharedTab.set('IMAGES')">
                                                <mat-icon class="material-icons-outlined" style="font-size:14px;width:14px;height:14px;margin-right:4px">image</mat-icon>
                                                Images
                                                @if (sharedImages().length > 0) {
                                                    <span class="sp-tab-badge">{{ sharedImages().length }}</span>
                                                }
                                            </button>
                                            <button class="sp-tab" [class.sp-tab-active]="activeSharedTab() === 'FILES'"
                                                    (click)="activeSharedTab.set('FILES')">
                                                <mat-icon class="material-icons-outlined" style="font-size:14px;width:14px;height:14px;margin-right:4px">folder_open</mat-icon>
                                                Files
                                                @if (sharedFiles().length > 0) {
                                                    <span class="sp-tab-badge">{{ sharedFiles().length }}</span>
                                                }
                                            </button>
                                            <button class="sp-tab" [class.sp-tab-active]="activeSharedTab() === 'LINKS'"
                                                    (click)="activeSharedTab.set('LINKS')">
                                                <mat-icon class="material-icons-outlined" style="font-size:14px;width:14px;height:14px;margin-right:4px">link</mat-icon>
                                                Links
                                                @if (sharedLinks().length > 0) {
                                                    <span class="sp-tab-badge">{{ sharedLinks().length }}</span>
                                                }
                                            </button>
                                        </div>

                                        <!-- Body -->
                                        <div class="sp-body">
                                            @if (sharedLoading()) {
                                                <div class="sp-loading">
                                                    <mat-spinner diameter="30"></mat-spinner>
                                                    <p class="sp-loading-text">Loading…</p>
                                                </div>
                                            } @else {

                                                <!-- ── IMAGES ── -->
                                                @if (activeSharedTab() === 'IMAGES') {
                                                    @if (sharedImages().length === 0) {
                                                        <div class="sp-empty" [@fadeScale]>
                                                            <mat-icon class="material-icons-outlined sp-empty-icon">image_not_supported</mat-icon>
                                                            <p class="sp-empty-text">No images have been shared here yet.</p>
                                                        </div>
                                                    } @else {
                                                        <div class="sp-image-grid">
                                                            @for (img of sharedImages(); track img.id) {
                                                                <div class="sp-image-cell" [@sharedItemEnter]
                                                                     (click)="lightboxItem.set(img)">
                                                                    <img [src]="'http://localhost:8084' + img.fileUrl"
                                                                         [alt]="img.fileName ?? 'image'"
                                                                         class="sp-image-thumb"
                                                                         loading="lazy">
                                                                    <div class="sp-image-overlay">
                                                                        <mat-icon class="material-icons-outlined" style="font-size:22px;width:22px;height:22px;color:#fff">zoom_in</mat-icon>
                                                                    </div>
                                                                </div>
                                                            }
                                                        </div>
                                                    }
                                                }

                                                <!-- ── FILES ── -->
                                                @if (activeSharedTab() === 'FILES') {
                                                    @if (sharedFiles().length === 0) {
                                                        <div class="sp-empty" [@fadeScale]>
                                                            <mat-icon class="material-icons-outlined sp-empty-icon">folder_off</mat-icon>
                                                            <p class="sp-empty-text">No files have been shared here yet.</p>
                                                        </div>
                                                    } @else {
                                                        <div class="sp-file-list">
                                                            @for (file of sharedFiles(); track file.id) {
                                                                <div class="sp-file-card" [@sharedItemEnter]>
                                                                    <div class="sp-file-icon-wrap" [class]="getFileIconClass(file.fileType)">
                                                                        <mat-icon class="material-icons-outlined" style="font-size:22px;width:22px;height:22px">{{ getFileIcon(file.fileType) }}</mat-icon>
                                                                    </div>
                                                                    <div class="sp-file-info">
                                                                        <p class="sp-file-name" [title]="file.fileName ?? ''">{{ file.fileName }}</p>
                                                                        <div class="sp-file-meta">
                                                                            @if (file.fileSize) {
                                                                                <span class="sp-badge-size">{{ formatFileSize(file.fileSize) }}</span>
                                                                            }
                                                                            <span class="sp-meta-dot">·</span>
                                                                            <span class="sp-meta-sender">{{ file.senderName }}</span>
                                                                            <span class="sp-meta-dot">·</span>
                                                                            <span class="sp-meta-date">{{ formatDateSep(file.createdAt) }}</span>
                                                                        </div>
                                                                    </div>
                                                                    <a [href]="'http://localhost:8084' + file.fileUrl"
                                                                       target="_blank"
                                                                       class="sp-download-btn"
                                                                       matTooltip="Download"
                                                                       (click)="$event.stopPropagation()">
                                                                        <mat-icon class="material-icons-outlined" style="font-size:17px;width:17px;height:17px">download</mat-icon>
                                                                    </a>
                                                                </div>
                                                            }
                                                        </div>
                                                    }
                                                }

                                                <!-- ── LINKS ── -->
                                                @if (activeSharedTab() === 'LINKS') {
                                                    @if (sharedLinks().length === 0) {
                                                        <div class="sp-empty" [@fadeScale]>
                                                            <mat-icon class="material-icons-outlined sp-empty-icon">link_off</mat-icon>
                                                            <p class="sp-empty-text">No links have been shared here yet.</p>
                                                        </div>
                                                    } @else {
                                                        <div class="sp-link-list">
                                                            @for (link of sharedLinks(); track link.id) {
                                                                <a class="sp-link-card" [@sharedItemEnter]
                                                                   [href]="link.extractedUrl" target="_blank" rel="noopener noreferrer"
                                                                   (click)="$event.stopPropagation()">
                                                                    <div class="sp-link-globe">
                                                                        <mat-icon class="material-icons-outlined" style="font-size:18px;width:18px;height:18px">language</mat-icon>
                                                                    </div>
                                                                    <div class="sp-link-info">
                                                                        <p class="sp-link-url" [title]="link.extractedUrl ?? ''">{{ link.extractedUrl }}</p>
                                                                        @if (link.contentText) {
                                                                            <p class="sp-link-preview">{{ stripHtml(link.contentText) }}</p>
                                                                        }
                                                                        <div class="sp-file-meta">
                                                                            <span class="sp-meta-sender">{{ link.senderName }}</span>
                                                                            <span class="sp-meta-dot">·</span>
                                                                            <span class="sp-meta-date">{{ formatDateSep(link.createdAt) }}</span>
                                                                        </div>
                                                                    </div>
                                                                    <mat-icon class="material-icons-outlined sp-link-arrow" style="font-size:14px;width:14px;height:14px">open_in_new</mat-icon>
                                                                </a>
                                                            }
                                                        </div>
                                                    }
                                                }
                                            }
                                        </div>
                                    </div>
                                }

                                <!-- Lightbox overlay -->
                                @if (lightboxItem()) {
                                    <div class="sp-lightbox" [@fadeScale] (click)="lightboxItem.set(null)">
                                        <div class="sp-lightbox-card" (click)="$event.stopPropagation()">
                                            <div class="sp-lightbox-toolbar">
                                                <span class="sp-lightbox-sender">
                                                    <mat-icon class="material-icons-outlined" style="font-size:14px;width:14px;height:14px">person</mat-icon>
                                                    {{ lightboxItem()!.senderName }}
                                                </span>
                                                <span class="sp-lightbox-date">{{ formatDateSep(lightboxItem()!.createdAt) }}</span>
                                                <button class="sp-lightbox-close" (click)="lightboxItem.set(null)">
                                                    <mat-icon style="font-size:20px;width:20px;height:20px">close</mat-icon>
                                                </button>
                                            </div>
                                            <img [src]="'http://localhost:8084' + lightboxItem()!.fileUrl"
                                                 [alt]="lightboxItem()!.fileName ?? 'image'"
                                                 class="sp-lightbox-img">
                                            @if (lightboxItem()!.fileName) {
                                                <p class="sp-lightbox-caption">{{ lightboxItem()!.fileName }}</p>
                                            }
                                        </div>
                                    </div>
                                }

                            <!-- ── Chat body ────────────────────────────── -->
                            <div class="chat-body flex-grow-1 position-relative overflow-hidden" #messagePane>

                                <!-- Context menu -->
                                @if (contextMenu().visible) {
                                    <div class="ctx-menu" [@ctxMenuEnter]
                                         [style.top.px]="contextMenu().y"
                                         [style.left.px]="contextMenu().x"
                                         (click)="$event.stopPropagation()">
                                        <button class="ctx-item" (click)="pinOrUnpin(contextMenu().message!)">
                                            <span class="ctx-icon">{{ contextMenu().message?.isPinned ? '📌' : '📍' }}</span>
                                            {{ contextMenu().message?.isPinned ? 'Unpin message' : 'Pin message' }}
                                        </button>
                                    </div>
                                }

                                <!-- Pinned panel overlay -->
                                @if (pinnedPanelOpen()) {
                                    <div class="pinned-panel" [@pinnedPanelSlide] (click)="$event.stopPropagation()">
                                        <div class="pinned-panel-header">
                                            <div class="pinned-panel-title">
                                                <span class="pp-icon">📌</span>
                                                <span>Pinned Messages</span>
                                                <span class="pp-count">{{ pinnedCount() }}</span>
                                            </div>
                                            <button class="pp-close-btn" (click)="pinnedPanelOpen.set(false)">
                                                <mat-icon style="font-size:18px;width:18px;height:18px">close</mat-icon>
                                            </button>
                                        </div>
                                        <div class="pinned-panel-body">
                                            @if (pinnedMessages().length === 0) {
                                                <p class="pp-empty">Nothing has been pinned yet.</p>
                                            }
                                            @for (pm of pinnedMessages(); track pm.id) {
                                                <div class="pp-item" [@ppItemEnter]>
                                                    <div class="pp-item-meta">
                                                        <span class="pp-sender">{{ pm.senderName }}</span>
                                                        <span class="pp-time">{{ formatMessageTime(pm.createdAt) }}</span>
                                                    </div>
                                                    @if (pm.contentText) {
                                                        <div class="pp-content" [innerHTML]="pm.contentText"></div>
                                                    }
                                                    @if (pm.fileName) {
                                                        <div class="pp-file">📎 {{ pm.fileName }}</div>
                                                    }
                                                    @if (pm.pinnedByName) {
                                                        <div class="pp-pinned-by">Pinned by {{ pm.pinnedByName }}</div>
                                                    }
                                                    <button class="pp-unpin-btn" (click)="pinOrUnpin(pm)">Unpin</button>
                                                </div>
                                            }
                                        </div>
                                    </div>
                                }

                                <!-- Members panel overlay -->
                                @if (membersPanelOpen() && canManageMembers) {
                                    <div class="members-panel" [@sidebarSlide] (click)="$event.stopPropagation()">
                                        <div class="members-panel-header">
                                            <div class="members-panel-title">
                                                <mat-icon class="material-icons-outlined"
                                                          style="font-size:18px;width:18px;height:18px">group</mat-icon>
                                                <span>Members</span>
                                                @if (members().length > 0) {
                                                    <span class="mp-count">{{ members().length }}</span>
                                                }
                                            </div>
                                            <button class="pp-close-btn" (click)="membersPanelOpen.set(false)">
                                                <mat-icon style="font-size:18px;width:18px;height:18px">close</mat-icon>
                                            </button>
                                        </div>

                                        @if (membersError()) {
                                            <div class="chat-error mx-3 mb-2 mt-2 px-2 py-1 small">
                                                <mat-icon class="material-icons-outlined"
                                                          style="font-size:14px;width:14px;height:14px">error_outline</mat-icon>
                                                {{ membersError() }}
                                            </div>
                                        }

                                        <!-- Add member form -->
                                        @if (showAddMemberForm()) {
                                            <div class="add-member-form mx-3 mb-3 mt-2" [@fadeSlide]>
                                                <p class="small fw-semibold mb-2">
                                                    Add a {{ allowedTargetRole }} to this channel
                                                </p>
                                                <mat-form-field appearance="outline" class="w-100 inline-small mb-2">
                                                    <mat-label>Select user</mat-label>
                                                    <mat-select [(ngModel)]="selectedUserId">
                                                        @for (u of filteredUsers; track u.id) {
                                                            <mat-option [value]="u.id">
                                                                {{ u.fullName }} ({{ u.email }})
                                                            </mat-option>
                                                        }
                                                        @if (filteredUsers.length === 0) {
                                                            <mat-option [value]="null" disabled>No eligible users available</mat-option>
                                                        }
                                                    </mat-select>
                                                </mat-form-field>
                                                <div class="row gx-2">
                                                    <div class="col">
                                                        <button mat-flat-button color="primary" class="w-100 button-sm"
                                                                [disabled]="!selectedUserId || addMemberLoading()"
                                                                (click)="confirmAddMember()">
                                                            {{ addMemberLoading() ? 'Adding…' : 'Confirm' }}
                                                        </button>
                                                    </div>
                                                    <div class="col-auto">
                                                        <button matButton class="button-sm"
                                                                (click)="cancelAddMemberForm()"
                                                                [disabled]="addMemberLoading()">Cancel</button>
                                                    </div>
                                                </div>
                                            </div>
                                        }

                                        <!-- Add member button -->
                                        @if (!showAddMemberForm()) {
                                            <div class="px-3 mb-3 mt-2">
                                                <button matButton color="primary" class="w-100 button-sm"
                                                        (click)="openAddMemberForm()">
                                                    <mat-icon class="material-icons-outlined align-middle me-1"
                                                              style="font-size:16px;width:16px;height:16px">person_add</mat-icon>
                                                    Add Member
                                                </button>
                                            </div>
                                        }

                                        <mat-divider></mat-divider>

                                        <!-- Members list -->
                                        <div class="members-panel-body">
                                            @if (membersLoading()) {
                                                <div class="text-center py-4">
                                                    <mat-spinner diameter="24"></mat-spinner>
                                                </div>
                                            } @else if (members().length > 0) {
                                                @for (member of members(); track member.id) {
                                                    <div class="member-row px-3 py-2">
                                                        <div class="member-avatar"
                                                             [ngStyle]="getAvatarGradient(member.userFullName)">
                                                            {{ getInitials(member.userFullName) }}
                                                        </div>
                                                        <div class="member-info">
                                                            <p class="mb-0 fw-medium small">{{ member.userFullName }}</p>
                                                            <p class="mb-0 text-secondary" style="font-size:11px">{{ member.userEmail }}</p>
                                                        </div>
                                                        <div class="member-meta ms-auto d-flex align-items-center gap-1">
                                                            <span class="room-type-pill">{{ member.userRole }}</span>
                                                            <button matIconButton color="warn"
                                                                    matTooltip="Remove member"
                                                                    style="width:28px;height:28px;line-height:28px"
                                                                    (click)="removeMember(member)">
                                                                <mat-icon class="material-icons-outlined"
                                                                          style="font-size:15px;width:15px;height:15px">
                                                                    person_remove
                                                                </mat-icon>
                                                            </button>
                                                        </div>
                                                    </div>
                                                }
                                            } @else {
                                                <p class="small text-secondary text-center py-4 mb-0">No members have been added yet.</p>
                                            }
                                        </div>
                                    </div>
                                }

                                <!-- Scheduled messages side panel -->
                                @if (scheduledPanelOpen() && canManageMembers) {
                                    <div class="members-panel sched-panel" [@scheduledPanelSlide] (click)="$event.stopPropagation()">
                                        <div class="members-panel-header">
                                            <div class="members-panel-title">
                                                <mat-icon class="material-icons-outlined" style="font-size:18px;width:18px;height:18px">schedule_send</mat-icon>
                                                <span>Scheduled Messages</span>
                                                @if (scheduledMessages().length > 0) {
                                                    <span class="mp-count">{{ scheduledMessages().length }}</span>
                                                }
                                            </div>
                                            <button class="pp-close-btn" (click)="scheduledPanelOpen.set(false)">
                                                <mat-icon style="font-size:18px;width:18px;height:18px">close</mat-icon>
                                            </button>
                                        </div>

                                        <div class="pinned-panel-body" style="overflow-y:auto;flex:1">
                                            @if (scheduledLoading()) {
                                                <div class="d-flex justify-content-center py-4">
                                                    <mat-spinner diameter="28"></mat-spinner>
                                                </div>
                                            } @else if (scheduledError()) {
                                                <p class="pp-empty" style="color:var(--mat-sys-error)">{{ scheduledError() }}</p>
                                            } @else if (scheduledMessages().length === 0) {
                                                <div class="sched-empty">
                                                    <mat-icon class="sched-empty-icon material-icons-outlined">schedule_send</mat-icon>
                                                    <p>No scheduled messages yet</p>
                                                </div>
                                            } @else {
                                                @for (item of scheduledMessages(); track item.id; let i = $index) {
                                                    <div class="sched-item" [style.animation-delay]="i * 55 + 'ms'" [@schedItemLeave]>
                                                        <div class="sched-item-preview">{{ item.content | slice:0:60 }}{{ item.content.length > 60 ? '…' : '' }}</div>
                                                        <div class="sched-item-meta">
                                                            <span class="sched-date">{{ formatScheduledDate(item.nextSendAt || item.scheduledAt) }}</span>
                                                            <span class="sched-chip" [style.background]="getRecurrenceChipStyle(item.recurrenceType)">{{ item.recurrenceType }}</span>
                                                        </div>
                                                        <div class="sched-item-countdown">{{ getScheduledCountdown(item.nextSendAt || item.scheduledAt) }}</div>
                                                        <div class="sched-item-actions">
                                                            <button class="hover-action-btn" matTooltip="Edit" (click)="editScheduled(item)">
                                                                <mat-icon style="font-size:16px;width:16px;height:16px">edit</mat-icon>
                                                            </button>
                                                            <button class="hover-action-btn" matTooltip="Cancel" (click)="confirmCancelScheduled(item)">
                                                                <mat-icon style="font-size:16px;width:16px;height:16px;color:var(--mat-sys-error)">cancel_schedule_send</mat-icon>
                                                            </button>
                                                        </div>
                                                    </div>
                                                }
                                            }
                                        </div>
                                    </div>
                                }

                                <!-- ── Agenda panel (MEETING rooms) ── -->
                                @if (agendaPanelOpen() && activeRoom()?.roomType === 'meeting') {
                                    <div class="members-panel agenda-panel" [@agendaPanelSlide] (click)="$event.stopPropagation()">
                                        <!-- Header -->
                                        <div class="members-panel-header">
                                            <div class="members-panel-title">
                                                <mat-icon class="material-icons-outlined" style="font-size:18px;width:18px;height:18px;color:var(--mat-sys-primary)">event_note</mat-icon>
                                                <span>Meeting Agenda</span>
                                                @if (agendaItems().length > 0) {
                                                    <span class="mp-count">{{ agendaItems().length }}</span>
                                                }
                                            </div>
                                            <button class="pp-close-btn" (click)="agendaPanelOpen.set(false)">
                                                <mat-icon style="font-size:18px;width:18px;height:18px">close</mat-icon>
                                            </button>
                                        </div>

                                        <!-- Meeting date/time sub-header -->
                                        @if (activeRoom()?.startTime) {
                                            <div class="agenda-date-row">
                                                <mat-icon class="material-icons-outlined" style="font-size:13px;width:13px;height:13px">schedule</mat-icon>
                                                <span>{{ activeRoom()!.startTime | date:'EEE, MMM d' }} · {{ activeRoom()!.startTime | date:'h:mm a' }} – {{ activeRoom()!.endTime | date:'h:mm a' }}</span>
                                                @if (getMeetingStatus(activeRoom()!) === 'IN_PROGRESS' && activeRoom()?.meetingLink) {
                                                    <button class="agenda-join-btn" (click)="joinMeeting(activeRoom()!)">
                                                        <mat-icon style="font-size:14px;width:14px;height:14px">video_call</mat-icon>
                                                        Join
                                                    </button>
                                                }
                                            </div>
                                        }

                                        <!-- Progress bar -->
                                        @if (agendaItems().length > 0) {
                                            <div class="agenda-progress-wrap">
                                                <div class="agenda-progress-bar">
                                                    <div class="agenda-progress-fill"
                                                         [style.width.%]="(agendaDoneCount() / agendaItems().length) * 100">
                                                    </div>
                                                </div>
                                                <span class="agenda-progress-label">{{ agendaDoneCount() }} / {{ agendaItems().length }} done</span>
                                            </div>
                                        }

                                        <!-- Items list -->
                                        <div class="pinned-panel-body" style="overflow-y:auto;flex:1">
                                            @if (agendaLoading()) {
                                                <div class="d-flex justify-content-center py-4">
                                                    <mat-spinner diameter="28"></mat-spinner>
                                                </div>
                                            } @else if (agendaItems().length === 0) {
                                                <div class="agenda-empty" [@fadeScale]>
                                                    <mat-icon class="material-icons-outlined agenda-empty-icon">assignment</mat-icon>
                                                    <p class="agenda-empty-title">No agenda items yet</p>
                                                    <p class="agenda-empty-sub">Add your first item below</p>
                                                </div>
                                            } @else {
                                                @for (item of agendaItems(); track item.id; let i = $index) {
                                                    <div class="agenda-item" [class.agenda-item-done]="item.agendaDone"
                                                         [style.animation-delay]="i * 55 + 'ms'" [@agendaItemEnter]>
                                                        <mat-checkbox [checked]="item.agendaDone ?? false"
                                                                      (change)="toggleAgendaDone(item)"
                                                                      color="primary"
                                                                      class="agenda-checkbox">
                                                        </mat-checkbox>
                                                        <div class="agenda-item-content">
                                                            <span class="agenda-item-title">{{ item.contentText }}</span>
                                                            @if (item.agendaDuration) {
                                                                <span class="agenda-item-duration">{{ item.agendaDuration }} min</span>
                                                            }
                                                        </div>
                                                    </div>
                                                }
                                            }
                                        </div>

                                        <!-- Add item form (MANAGER/TUTOR only) -->
                                        @if (canManageMembers) {
                                            <div class="agenda-add-form">
                                                <mat-form-field appearance="outline" class="agenda-add-input inline-small">
                                                    <mat-label>Agenda item</mat-label>
                                                    <input matInput [(ngModel)]="agendaTitle" placeholder="e.g. Review sprint goals" />
                                                </mat-form-field>
                                                <input class="agenda-duration-input" type="number" [(ngModel)]="agendaDurationMin"
                                                       min="1" max="240" placeholder="min" matTooltip="Duration in minutes" />
                                                <button class="agenda-add-btn" matTooltip="Add item"
                                                        [disabled]="!agendaTitle.trim() || agendaSaving()"
                                                        (click)="submitAgendaItem()">
                                                    @if (agendaSaving()) {
                                                        <mat-spinner diameter="16"></mat-spinner>
                                                    } @else {
                                                        <mat-icon style="font-size:18px;width:18px;height:18px">add</mat-icon>
                                                    }
                                                </button>
                                            </div>
                                        }
                                    </div>
                                }

                                <!-- Messages scroll area -->
                                <div class="messages-scroll overflow-y-auto h-100" #messagePane>

                                    <!-- History error -->
                                    @if (historyError()) {
                                        <div class="chat-error m-4 p-3">
                                            <mat-icon class="material-icons-outlined" style="font-size:16px;width:16px;height:16px">lock</mat-icon>
                                            {{ historyError() }}
                                        </div>
                                    }

                                    <div class="chat-list py-3">
                                        @for (message of messages(); track message.id; let i = $index) {

                                            @if (message.isSystemMessage) {
                                                <!-- System message pill -->
                                                <div class="sys-msg" [@sysMsg]>
                                                    <div class="sys-msg-pill">
                                                        <mat-icon class="sys-msg-icon material-icons-outlined">
                                                            {{ (message.contentText ?? '').includes('added') ? 'person_add' : (message.contentText ?? '').includes('removed') ? 'person_remove' : 'info' }}
                                                        </mat-icon>
                                                        <span class="sys-msg-text">{{ message.contentText }}</span>
                                                    </div>
                                                    <span class="sys-msg-time">{{ formatMessageTime(message.createdAt) }}</span>
                                                </div>
                                            } @else {

                                            <!-- Date separator -->
                                            @if (shouldShowDateSep(i)) {
                                                <div class="date-separator" [@fadeSlide]>
                                                    <span class="date-sep-line"></span>
                                                    <span class="date-sep-label">{{ formatDateSep(message.createdAt) }}</span>
                                                    <span class="date-sep-line"></span>
                                                </div>
                                            }

                                            <!-- Message row -->
                                            <div class="msg-row"
                                                 [class.msg-row-own]="message.senderId === currentUser?.id"
                                                 [class.msg-consecutive]="!shouldShowAvatar(i)"
                                                 (contextmenu)="openContextMenu($event, message)"
                                                 [@msgSlideIn]>

                                                @if (message.senderId !== currentUser?.id) {
                                                    @if (shouldShowAvatar(i)) {
                                                        <div class="msg-avatar"
                                                             [ngStyle]="getAvatarGradient(message.senderName)"
                                                             [matTooltip]="message.senderName">
                                                            {{ getInitials(message.senderName) }}
                                                        </div>
                                                    } @else {
                                                        <div class="msg-avatar-spacer"></div>
                                                    }
                                                }

                                                <div class="msg-content-wrap"
                                                     [class.msg-content-wrap-own]="message.senderId === currentUser?.id">

                                                    <!-- Message action toolbar (hover) -->
                                                    <div class="msg-hover-actions"
                                                         [class.msg-hover-actions-own]="message.senderId === currentUser?.id">
                                                        <button class="hover-action-btn"
                                                                (click)="toggleEmojiPicker(message.id, $event)"
                                                                matTooltip="React">
                                                            <mat-icon class="material-icons-outlined" style="font-size:18px;width:18px;height:18px">add_reaction</mat-icon>
                                                        </button>
                                                        <button class="hover-action-btn"
                                                                (click)="setReply(message)"
                                                                matTooltip="Reply">
                                                            <mat-icon class="material-icons-outlined" style="font-size:18px;width:18px;height:18px">reply</mat-icon>
                                                        </button>
                                                        @if (message.senderId === currentUser?.id) {
                                                            <button class="hover-action-btn"
                                                                    (click)="startEdit(message)"
                                                                    matTooltip="Edit">
                                                                <mat-icon class="material-icons-outlined" style="font-size:18px;width:18px;height:18px">edit</mat-icon>
                                                            </button>
                                                        }
                                                        @if (message.fileUrl) {
                                                            <a class="hover-action-btn"
                                                               [href]="getFileDownloadUrl(message.fileUrl)"
                                                               [attr.download]="message.fileName ?? 'file'"
                                                               matTooltip="Download">
                                                                <mat-icon style="font-size:18px;width:18px;height:18px">file_download</mat-icon>
                                                            </a>
                                                        }
                                                        <button class="hover-action-btn"
                                                                [matMenuTriggerFor]="msgMenu"
                                                                matTooltip="More">
                                                            <mat-icon style="font-size:18px;width:18px;height:18px">more_horiz</mat-icon>
                                                        </button>
                                                        <mat-menu #msgMenu="matMenu" xPosition="before">
                                                            <button mat-menu-item (click)="setReply(message)">
                                                                <mat-icon class="material-icons-outlined">reply</mat-icon>
                                                                <span>Reply</span>
                                                            </button>
                                                            @if (message.senderId === currentUser?.id || currentUser?.role === 'MANAGER' || currentUser?.role === 'TUTOR') {
                                                                <button mat-menu-item (click)="deleteMessage(message)">
                                                                    <mat-icon class="material-icons-outlined" style="color:var(--mat-sys-error)">delete</mat-icon>
                                                                    <span>Remove</span>
                                                                </button>
                                                            }
                                                            <button mat-menu-item (click)="pinOrUnpin(message)">
                                                                <mat-icon [style.color]="message.isPinned ? 'var(--mat-sys-primary)' : null">push_pin</mat-icon>
                                                                <span>{{ message.isPinned ? 'Unpin' : 'Pin' }}</span>
                                                            </button>
                                                            @if (message.contentText && !message.isSystemMessage) {
                                                                <mat-divider></mat-divider>
                                                                <button mat-menu-item (click)="translateMsg(message)">
                                                                    <mat-icon style="color:var(--mat-sys-primary)"
                                                                              [class.translate-icon-spin]="translationMap().get(message.id)?.loading">translate</mat-icon>
                                                                    <span>
                                                                        @if (translationMap().get(message.id)?.loading) {
                                                                            Translating...
                                                                        } @else if (translationMap().get(message.id)?.showTranslation) {
                                                                            Show original
                                                                        } @else {
                                                                            Translate to English
                                                                        }
                                                                    </span>
                                                                </button>
                                                            }
                                                        </mat-menu>
                                                    </div>

                                                    @if (message.isPinned) {
                                                        <div class="pin-badge" [@pinBadgeEnter] title="Pinned">
                                                            <mat-icon style="font-size:14px;width:14px;height:14px;color:#f59e0b;display:block">push_pin</mat-icon>
                                                        </div>
                                                    }

                                                    <div class="msg-bubble"
                                                         [class.msg-bubble-own]="message.senderId === currentUser?.id"
                                                         [class.msg-bubble-other]="message.senderId !== currentUser?.id"
                                                         [class.pinned-msg]="message.isPinned">

                                                        <!-- Sender name (only for others, only on first in group) -->
                                                        @if (message.senderId !== currentUser?.id && shouldShowAvatar(i)) {
                                                            <p class="msg-sender-name mb-1">{{ message.senderName }}</p>
                                                        }

                                                        <!-- Message text -->
                                                        @if (message.contentText) {
                                                            <div class="msg-text-wrap"
                                                                 [class.msg-text-loading]="translationMap().get(message.id)?.loading">
                                                                @if (translationMap().get(message.id)?.showTranslation) {
                                                                    <div class="msg-text" [@translationSwap]>{{ translationMap().get(message.id)?.translated }}</div>
                                                                } @else {
                                                                    <div class="msg-text" [innerHTML]="message.contentText" [@translationSwap]></div>
                                                                }
                                                                @if (translationMap().get(message.id)?.loading) {
                                                                    <div class="translate-bubble-overlay">
                                                                        <mat-icon class="translate-spin-icon">translate</mat-icon>
                                                                    </div>
                                                                }
                                                            </div>
                                                        }
                                                        @if (translationMap().get(message.id)?.loading) {
                                                            <div class="translate-loading-label">Translating...</div>
                                                        }

                                                        <!-- File attachment -->
                                                        @if (message.fileUrl) {
                                                            <div class="file-attachment mt-2">
                                                                @if (isImage(message.fileType)) {
                                                                    <img [src]="getFileDownloadUrl(message.fileUrl)"
                                                                         class="attachment-image"
                                                                         [alt]="message.fileName ?? 'attachment'"
                                                                         (click)="lightboxItem.set(message)"
                                                                         style="cursor:pointer">
                                                                } @else if (isAudio(message.fileType)) {
                                                                    <div class="voice-bubble"
                                                                         [class.voice-bubble-own]="message.senderId === currentUser?.id">
                                                                        <audio #voiceAudio
                                                                               style="display:none"
                                                                               preload="metadata"
                                                                               [src]="getFileDownloadUrl(message.fileUrl!)"
                                                                               (loadedmetadata)="onAudioMetadata(message.id, voiceAudio)"
                                                                               (ended)="onAudioEnded(message.id)">
                                                                        </audio>
                                                                        <button class="vb-play-btn"
                                                                                (click)="toggleAudioPlayback(message.id, voiceAudio)">
                                                                            <mat-icon style="font-size:20px;width:20px;height:20px">
                                                                                {{ playingAudioId() === message.id ? 'pause' : 'play_arrow' }}
                                                                            </mat-icon>
                                                                        </button>
                                                                        <div class="vb-waveform">
                                                                            @for (h of getWaveformHeights(message.id); track $index) {
                                                                                <span class="vb-bar"
                                                                                      [style.height.px]="h"
                                                                                      [style.animation-play-state]="playingAudioId() === message.id ? 'running' : 'paused'"
                                                                                      [style.animation-delay]="($index * 55) + 'ms'">
                                                                                </span>
                                                                            }
                                                                        </div>
                                                                        <span class="vb-time">
                                                                            {{ playingAudioId() === message.id
                                                                               ? formatAudioTime(audioCurrentTime())
                                                                               : formatAudioTime(audioDurationMap().get(message.id) ?? 0) }}
                                                                        </span>
                                                                    </div>
                                                                } @else if (isVideo(message.fileType)) {
                                                                    <!-- Video clip bubble -->
                                                                    <div class="vvb-player-wrap">
                                                                        <video #msgVideo
                                                                               class="vvb-video"
                                                                               preload="metadata"
                                                                               [src]="getFileDownloadUrl(message.fileUrl!)"
                                                                               (loadedmetadata)="onVideoMetadata(message.id, msgVideo)"
                                                                               (timeupdate)="onVideoTimeUpdate(message.id, msgVideo)"
                                                                               (ended)="onVideoEnded(message.id)">
                                                                        </video>
                                                                        <div class="vvb-overlay"
                                                                             (click)="toggleVideoPlayback(message.id, msgVideo)">
                                                                            <button class="vvb-play-btn">
                                                                                <mat-icon style="font-size:28px;width:28px;height:28px">
                                                                                    {{ playingVideoId() === message.id ? 'pause' : 'play_arrow' }}
                                                                                </mat-icon>
                                                                            </button>
                                                                        </div>
                                                                        <div class="vvb-bottom-bar">
                                                                            <div class="vvb-progress"
                                                                                 (click)="$event.stopPropagation()">
                                                                                <div class="vvb-progress-fill"
                                                                                     [style.width.%]="getVideoProgress(message.id)">
                                                                                </div>
                                                                            </div>
                                                                            <div class="vvb-times">
                                                                                <span class="vvb-current">
                                                                                    {{ formatAudioTime(videoCurrentTimeMap().get(message.id) ?? 0) }}
                                                                                </span>
                                                                                <span class="vvb-duration">
                                                                                    {{ formatAudioTime(videoDurationMap().get(message.id) ?? 0) }}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                } @else {
                                                                    <div class="msg-file-card">
                                                                        <div class="msg-file-icon-wrap" [class]="getFileIconClass(message.fileType)">
                                                                            <mat-icon class="material-icons-outlined" style="font-size:20px;width:20px;height:20px">{{ getFileIcon(message.fileType) }}</mat-icon>
                                                                        </div>
                                                                        <div class="msg-file-info">
                                                                            <span class="msg-file-name">{{ message.fileName }}</span>
                                                                            @if (message.fileSize) {
                                                                                <span class="msg-file-size">{{ formatBytes(message.fileSize) }}</span>
                                                                            }
                                                                        </div>
                                                                        <a class="msg-file-download"
                                                                           [href]="getFileDownloadUrl(message.fileUrl!)"
                                                                           [attr.download]="message.fileName ?? 'file'"
                                                                           matTooltip="Download">
                                                                            <mat-icon style="font-size:18px;width:18px;height:18px">file_download</mat-icon>
                                                                        </a>
                                                                    </div>
                                                                }
                                                            </div>
                                                        }

                                                        <!-- Timestamp -->
                                                        <span class="msg-time">{{ formatMessageTime(message.createdAt) }}</span>
                                                        @if (message.isEdited) {
                                                            <span class="msg-edited-label">(edited)</span>
                                                        }
                                                    </div>

                                                    <!-- Reaction strip -->
                                                    <div class="reaction-strip"
                                                         [class.my-msg]="message.senderId === currentUser?.id">
                                                        @for (group of groupReactions(message.reactions); track group.emoji) {
                                                            <button class="reaction-pill"
                                                                    [class.my-reaction]="group.myReaction"
                                                                    (click)="react(message.id, group.emoji)"
                                                                    [@pillEnter]>
                                                                {{ group.emoji }}
                                                                <span class="reaction-count">{{ group.count }}</span>
                                                            </button>
                                                        }
                                                        @if (reactionPickerMessageId() === message.id) {
                                                            <div class="emoji-palette" [@paletteEnter]
                                                                 (click)="$event.stopPropagation()">
                                                                @for (emoji of emojiList; track emoji) {
                                                                    <button class="emoji-btn"
                                                                            (click)="react(message.id, emoji)">
                                                                        <span class="emoji-glyph">{{ emoji }}</span>
                                                                    </button>
                                                                }
                                                            </div>
                                                        }
                                                    </div>

                                                    <!-- Translation indicator pill -->
                                                    @if (translationMap().get(message.id)?.showTranslation) {
                                                        <div class="translation-pill-wrap"
                                                             [class.my-msg]="message.senderId === currentUser?.id"
                                                             [@translationPillEnter]>
                                                            <span class="translation-pill-badge">
                                                                <span class="translation-pill-globe">🌐</span>
                                                                <span class="translation-pill-text">Translated to English</span>
                                                            </span>
                                                            <button class="translation-show-orig-btn"
                                                                    (click)="translateMsg(message)">Show original</button>
                                                        </div>
                                                    }
                                                </div>
                                            </div>
                                            } <!-- /else not system message -->
                                        }

                                        @if (messages().length === 0 && !historyError()) {
                                            <div class="msgs-empty-state" [@fadeSlide]>
                                                <div class="msgs-empty-icon">
                                                    <mat-icon class="material-icons-outlined">chat_bubble_outline</mat-icon>
                                                </div>
                                                <p class="msgs-empty-title">Start the conversation</p>
                                                <p class="msgs-empty-sub">Be the first to say something in <strong>#{{ activeRoom()?.name }}</strong> — your team is waiting.</p>
                                            </div>
                                        }
                                    </div>
                                </div>
                                <!-- /Messages scroll area -->
                            </div>
                            <!-- /Chat body -->

                            <!-- ── Chat input ───────────────────────────── -->
                            <div class="chat-input-wrap">
                                <!-- Hidden file input -->
                                <input type="file" accept="*/*" #fileInput class="d-none"
                                       (change)="onFileSelected($event)" />

                                <!-- Reply preview banner -->
                                @if (replyingTo()) {
                                    <div class="reply-preview-banner" [@fadeSlide]>
                                        <mat-icon class="material-icons-outlined rp-icon">reply</mat-icon>
                                        <div class="rp-content">
                                            <span class="rp-name">{{ replyingTo()!.senderName }}</span>
                                            <span class="rp-text">{{ stripHtml(replyingTo()!.contentText ?? replyingTo()!.fileName ?? '').slice(0, 80) }}</span>
                                        </div>
                                        <button class="rp-close" (click)="cancelReply()">
                                            <mat-icon style="font-size:16px;width:16px;height:16px">close</mat-icon>
                                        </button>
                                    </div>
                                }

                                <!-- Edit bar -->
                                @if (editingMessage()) {
                                    <div class="edit-bar" [@fadeSlide]>
                                        <div class="edit-bar-header">
                                            <mat-icon class="material-icons-outlined rp-icon">edit</mat-icon>
                                            <span class="edit-bar-label">Editing message</span>
                                            <button class="rp-close" (click)="cancelEdit()">
                                                <mat-icon style="font-size:16px;width:16px;height:16px">close</mat-icon>
                                            </button>
                                        </div>
                                        <div class="edit-bar-input-row">
                                            <mat-form-field appearance="outline" class="edit-bar-field">
                                                <input matInput
                                                       [ngModel]="editContent()"
                                                       (ngModelChange)="editContent.set($event)"
                                                       (keydown.enter)="$event.preventDefault(); saveEdit()"
                                                       (keydown.escape)="cancelEdit()"
                                                       placeholder="Edit message…" />
                                            </mat-form-field>
                                            <button mat-button (click)="cancelEdit()">Cancel</button>
                                            <button mat-flat-button color="primary"
                                                    [disabled]="!editContent() || editContent() === editingMessage()!.contentText"
                                                    (click)="saveEdit()">
                                                <mat-icon style="font-size:16px;width:16px;height:16px;margin-right:4px">check</mat-icon>
                                                Save
                                            </button>
                                        </div>
                                    </div>
                                }

                                <!-- Emoji picker overlay -->
                                @if (emojiPickerOpen()) {
                                    <div class="emoji-overlay" (click)="$event.stopPropagation()">
                                        <div class="emoji-full-picker">
                                            <div class="emoji-grid">
                                                @for (em of fullEmojiSet; track em) {
                                                    <button class="ep-emoji-btn" (click)="insertEmoji(em)" [title]="em">{{ em }}</button>
                                                }
                                            </div>
                                        </div>
                                    </div>
                                }

                                <!-- "Send Later" / "Schedule Recurring" slide-up panel -->
                                @if (scheduleFormType() !== 'none' && activeRoom()) {
                                    <div class="schedule-panel" [@schedFormSlide]>
                                        <div class="schedule-panel-header">
                                            <div class="d-flex align-items-center gap-2">
                                                <mat-icon class="material-icons-outlined" style="font-size:17px;width:17px;height:17px;color:var(--mat-sys-primary)">
                                                    {{ scheduleFormType() === 'once' ? 'schedule' : 'repeat' }}
                                                </mat-icon>
                                                <span style="font-weight:600;font-size:13px">
                                                    {{ editingScheduledId() ? 'Edit Scheduled Message' : (scheduleFormType() === 'once' ? 'Send Later' : 'Schedule Recurring') }}
                                                </span>
                                            </div>
                                            <button class="pp-close-btn" (click)="closeSchedulePanel()">
                                                <mat-icon style="font-size:16px;width:16px;height:16px">close</mat-icon>
                                            </button>
                                        </div>

                                        <div class="schedule-panel-body">
                                            <!-- Content textarea -->
                                            <mat-form-field appearance="outline" class="w-100 inline-small">
                                                <mat-label>Message</mat-label>
                                                <textarea matInput [(ngModel)]="scheduleContent" rows="2" placeholder="What do you want to say?"></textarea>
                                            </mat-form-field>

                                            <div class="d-flex gap-2">
                                                <!-- Date picker -->
                                                <mat-form-field appearance="outline" class="inline-small" style="flex:1">
                                                    <mat-label>Date</mat-label>
                                                    <input matInput [matDatepicker]="schedPicker"
                                                           [(ngModel)]="scheduleDate"
                                                           [min]="today"
                                                           placeholder="Pick date">
                                                    <mat-datepicker-toggle matIconSuffix [for]="schedPicker"></mat-datepicker-toggle>
                                                    <mat-datepicker #schedPicker></mat-datepicker>
                                                </mat-form-field>

                                                <!-- Time input -->
                                                <mat-form-field appearance="outline" class="inline-small" style="flex:1">
                                                    <mat-label>Time</mat-label>
                                                    <input matInput type="time" [(ngModel)]="scheduleTime">
                                                </mat-form-field>
                                            </div>

                                            <!-- Recurrence pills (only for recurring) -->
                                            @if (scheduleFormType() === 'recurring') {
                                                <div class="sched-recurrence-row">
                                                    @for (r of [['DAILY','Daily'],['WEEKDAYS','Weekdays'],['WEEKLY','Weekly'],['CUSTOM','Custom']]; track r[0]) {
                                                        <button class="sched-pill"
                                                                [class.sched-pill-active]="scheduleRecurrence() === r[0]"
                                                                (click)="setScheduleRecurrence(r[0])">{{ r[1] }}</button>
                                                    }
                                                </div>

                                                @if (scheduleRecurrence() === 'CUSTOM') {
                                                    <div class="sched-recurrence-row mt-1">
                                                        @for (d of DAYS_LIST; track d.key) {
                                                            <button class="sched-pill sched-day-pill"
                                                                    [class.sched-pill-active]="scheduleCustomDays().has(d.key)"
                                                                    (click)="toggleCustomDay(d.key)">{{ d.label }}</button>
                                                        }
                                                    </div>
                                                }
                                            }

                                            <!-- Validation error -->
                                            @if (scheduleFormError()) {
                                                <div class="chat-error px-2 py-1 small mt-1">{{ scheduleFormError() }}</div>
                                            }

                                            <!-- Actions -->
                                            <div class="d-flex gap-2 mt-2">
                                                <button mat-stroked-button style="flex:1;height:34px;font-size:12px"
                                                        (click)="closeSchedulePanel()">Cancel</button>
                                                <button mat-flat-button color="primary"
                                                        style="flex:1.5;height:34px;font-size:12px"
                                                        [disabled]="scheduleSaving()"
                                                        (click)="submitScheduled()">
                                                    @if (scheduleSaving()) { <mat-spinner diameter="15" style="display:inline-block"></mat-spinner> }
                                                    @else { {{ editingScheduledId() ? 'Save Changes' : 'Schedule' }} }
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                }

                                <!-- Input card -->
                                <div class="input-card"
                                     [class.input-card-disabled]="!activeRoom()"
                                     [class.input-card-has-file]="!!selectedFile"
                                     [class.input-card-video-recording]="videoPhase() !== 'idle'"
                                     (keydown.control.enter)="sendRichMessage()">

                                    @if (isRecording()) {
                                        <!-- Recording overlay -->
                                        <div class="recording-ui">
                                            <div class="recording-row">
                                                <div class="recording-left">
                                                    <span class="rec-dot"></span>
                                                    <span class="rec-duration">{{ formatRecordingDuration(recordingDuration()) }}</span>
                                                </div>
                                                <div class="recording-waveform">
                                                    @for (b of [1,2,3,4,5,6,7,8]; track b) {
                                                        <span class="wave-bar" [style.animation-delay]="(b * 0.1) + 's'"></span>
                                                    }
                                                </div>
                                                <div class="recording-right">
                                                    <button class="rec-cancel-btn" (click)="cancelRecording()" matTooltip="Cancel">
                                                        <mat-icon style="font-size:18px;width:18px;height:18px">close</mat-icon>
                                                    </button>
                                                    <button class="rec-send-btn" (click)="sendRecording()" matTooltip="Send voice message">
                                                        <mat-icon style="font-size:18px;width:18px;height:18px">send</mat-icon>
                                                    </button>
                                                </div>
                                            </div>
                                            @if (sttAvailable) {
                                                <div class="rec-transcript-area">
                                                    @if (finalTranscript() || liveTranscript()) {
                                                        <span class="rec-transcript-final">{{ finalTranscript() }}</span><span class="rec-transcript-interim">{{ liveTranscript() }}</span><span class="rec-cursor">|</span>
                                                    } @else {
                                                        <span class="rec-transcript-placeholder">Start speaking...</span>
                                                    }
                                                </div>
                                            }
                                        </div>
                                    } @else {
                                        <!-- @mention suggestions dropdown -->
                                        @if (showMentionSuggestions() && mentionSuggestions().length > 0) {
                                            <div class="mention-overlay" (click)="$event.stopPropagation()">
                                                <div class="mention-panel">
                                                    @for (m of mentionSuggestions(); track m.id; let i = $index) {
                                                        <div class="mention-item"
                                                             [class.mention-item-active]="i === activeMentionIndex()"
                                                             (mousedown)="$event.preventDefault(); selectMention(m)">
                                                            @if (m.id === 0) {
                                                                <div class="mention-avatar-everyone">
                                                                    <mat-icon style="font-size:15px;width:15px;height:15px;color:var(--mat-sys-on-primary)">groups</mat-icon>
                                                                </div>
                                                            } @else {
                                                                <div class="mention-avatar" [ngStyle]="getAvatarGradient(m.fullName)">{{ getInitials(m.fullName) }}</div>
                                                            }
                                                            <div class="mention-info">
                                                                <span class="mention-name">{{ m.fullName }}</span>
                                                                <span class="mention-sub">{{ m.id === 0 ? 'Notify all members' : m.role }}</span>
                                                            </div>
                                                            <span class="mention-role-badge mention-role-{{ m.role.toLowerCase() }}">
                                                                {{ m.id === 0 ? 'All' : m.role }}
                                                            </span>
                                                        </div>
                                                    }
                                                </div>
                                            </div>
                                        }
                                        <!-- Format toolbar always visible -->
                                        <div class="quill-format-wrap">
                                            <quill-editor
                                                [modules]="quillModules"
                                                placeholder="Message{{ activeRoom() ? ' #' + activeRoom()!.name : '' }}…"
                                                [readOnly]="!activeRoom()"
                                                (onContentChanged)="onQuillChange($event)"
                                                #quillRef>
                                            </quill-editor>
                                        </div>

                                        <!-- File preview chip -->
                                        @if (selectedFile) {
                                            <div class="file-chip" [@pillEnter]>
                                                <mat-icon class="material-icons-outlined"
                                                          style="font-size:15px;width:15px;height:15px;color:var(--mat-sys-primary)">
                                                    attach_file
                                                </mat-icon>
                                                <span class="file-chip-name">{{ selectedFile.name }}</span>
                                                <span class="file-chip-size">{{ formatBytes(selectedFile.size) }}</span>
                                                <button class="file-chip-remove" (click)="removeFile()" matTooltip="Remove">✕</button>
                                            </div>
                                        }

                                        <!-- Bottom bar: left actions + send FAB -->
                                        <div class="input-bottom-bar">
                                            <div class="input-left-actions">
                                                <button class="input-action-btn"
                                                        matTooltip="Attach file"
                                                        [disabled]="!activeRoom()"
                                                        (click)="fileInput.click()">
                                                    <mat-icon class="material-icons-outlined" style="font-size:19px;width:19px;height:19px">attach_file</mat-icon>
                                                </button>
                                                <button class="input-action-btn"
                                                        matTooltip="Emoji"
                                                        [disabled]="!activeRoom()"
                                                        (click)="emojiPickerOpen.update(v => !v); $event.stopPropagation()">
                                                    <mat-icon class="material-icons-outlined" style="font-size:19px;width:19px;height:19px">sentiment_satisfied</mat-icon>
                                                </button>
                                                <button class="input-action-btn"
                                                        matTooltip="Mention"
                                                        [disabled]="!activeRoom()"
                                                        (click)="insertMention()">
                                                    <mat-icon style="font-size:19px;width:19px;height:19px">alternate_email</mat-icon>
                                                </button>
                                                <button class="input-action-btn"
                                                        matTooltip="Record voice message"
                                                        [disabled]="!activeRoom()"
                                                        [class.input-action-btn-active]="isRecording()"
                                                        (click)="startRecording()">
                                                    <mat-icon class="material-icons-outlined" style="font-size:19px;width:19px;height:19px">mic</mat-icon>
                                                </button>
                                                <button class="input-action-btn"
                                                        matTooltip="Record video clip"
                                                        [disabled]="!activeRoom()"
                                                        [class.input-action-btn-active]="videoPhase() !== 'idle'"
                                                        (click)="startVideoRecording()">
                                                    <mat-icon class="material-icons-outlined" style="font-size:19px;width:19px;height:19px">videocam</mat-icon>
                                                </button>
                                            </div>

                                            <div class="input-right-actions">
                                                <span class="input-hint-text">Ctrl+Enter</span>
                                                @if (canManageMembers) {
                                                    <!-- Split button: Send Now (left) + expand (right) -->
                                                    <div class="send-split" [class.send-split-disabled]="!activeRoom() || (!hasText && !selectedFile)">
                                                        <button class="send-fab send-fab-main"
                                                                [disabled]="!activeRoom() || (!hasText && !selectedFile)"
                                                                (click)="sendRichMessage()"
                                                                matTooltip="Send now">
                                                            <mat-icon style="font-size:20px;width:20px;height:20px">send</mat-icon>
                                                        </button>
                                                        <button class="send-fab send-fab-arrow"
                                                                [disabled]="!activeRoom()"
                                                                [matMenuTriggerFor]="sendLaterMenu"
                                                                matTooltip="More send options">
                                                            <mat-icon style="font-size:16px;width:16px;height:16px">expand_more</mat-icon>
                                                        </button>
                                                        <mat-menu #sendLaterMenu="matMenu" xPosition="before">
                                                            <button mat-menu-item (click)="openSchedulePanel('once')">
                                                                <mat-icon>schedule</mat-icon>
                                                                <span>Send Later</span>
                                                            </button>
                                                            <button mat-menu-item (click)="openSchedulePanel('recurring')">
                                                                <mat-icon>repeat</mat-icon>
                                                                <span>Schedule Recurring</span>
                                                            </button>
                                                        </mat-menu>
                                                    </div>
                                                } @else {
                                                    <!-- Original send button for non-managers -->
                                                    <button class="send-fab"
                                                            [disabled]="!activeRoom() || (!hasText && !selectedFile)"
                                                            (click)="sendRichMessage()"
                                                            matTooltip="Send message">
                                                        <mat-icon style="font-size:20px;width:20px;height:20px">send</mat-icon>
                                                    </button>
                                                }
                                            </div>
                                        </div>
                                    }
                                </div>
                            </div>
                            <!-- /Chat input -->

                        </div>
                        <!-- /chat-room-wrap -->
                    }

                </div>
                <!-- ══ /RIGHT chat main ════════════════════════════════════ -->

            </div>
        </div>

    <!-- ══ Meeting Calendar Overlay ══════════════════════════════════════ -->
    @if (meetingCalOverlayOpen()) {
        <div class="meeting-cal-overlay" [@calOverlayEnter]>
            <div class="meeting-cal-overlay-backdrop" (click)="closeMeetingCalendar()"></div>
            <div class="meeting-cal-overlay-panel">
                <!-- Header -->
                <div class="meeting-cal-overlay-header">
                    <div>
                        <h3 class="meeting-cal-overlay-title">
                            <mat-icon class="material-icons-outlined" style="font-size:22px;width:22px;height:22px;vertical-align:middle;margin-right:6px;color:var(--mat-sys-primary)">calendar_month</mat-icon>
                            Meeting Calendar
                        </h3>
                        <p class="meeting-cal-overlay-sub">{{ meetingRooms().length }} scheduled meeting{{ meetingRooms().length !== 1 ? 's' : '' }}</p>
                    </div>
                    <button mat-icon-button (click)="closeMeetingCalendar()" style="flex-shrink:0">
                        <mat-icon>close</mat-icon>
                    </button>
                </div>

                <div class="meeting-cal-overlay-body">
                    <!-- Left: Month calendar grid -->
                    <div class="meeting-cal-grid-col">
                        <div class="meeting-cal-nav">
                            <button mat-icon-button class="meeting-cal-nav-btn" (click)="calOverlayPrevMonth()">
                                <mat-icon>chevron_left</mat-icon>
                            </button>
                            <span class="meeting-cal-nav-label">{{ CAL_MONTHS[calOverlayMonth] }} {{ calOverlayYear }}</span>
                            <button mat-icon-button class="meeting-cal-nav-btn" (click)="calOverlayNextMonth()">
                                <mat-icon>chevron_right</mat-icon>
                            </button>
                        </div>
                        <div class="meeting-cal-dow-row">
                            @for (d of CAL_OVL_DOW; track d) {
                                <span class="meeting-cal-dow">{{ d }}</span>
                            }
                        </div>
                        <div class="meeting-cal-day-grid">
                            @for (cell of calOverlayGrid(); track $index) {
                                <div class="meeting-cal-cell"
                                     [class.meeting-cal-cell-today]="cell.isToday"
                                     [class.meeting-cal-cell-other-month]="!cell.inMonth">
                                    <span class="meeting-cal-cell-num" [class.meeting-cal-cell-num-today]="cell.isToday">
                                        {{ cell.date.getDate() }}
                                    </span>
                                    @for (room of getMeetingRoomsForDate(cell.date); track room.id) {
                                        <button type="button"
                                                class="meeting-cal-event-dot"
                                                [class.meeting-cal-event-live]="getMeetingStatus(room) === 'IN_PROGRESS'"
                                                [class.meeting-cal-event-soon]="getMeetingStatus(room) === 'STARTING_SOON'"
                                                [class.meeting-cal-event-ended]="getMeetingStatus(room) === 'ENDED'"
                                                (click)="$event.stopPropagation(); openCalEventDetail(room)"
                                                [matTooltip]="room.name">
                                            {{ (room.name | slice:0:12) }}{{ room.name.length > 12 ? '…' : '' }}
                                        </button>
                                    }
                                </div>
                            }
                        </div>
                    </div>

                    <!-- Right: Event detail -->
                    <div class="meeting-cal-detail-col">
                        @if (!selectedCalEvent()) {
                            <div class="meeting-cal-detail-empty">
                                <mat-icon class="material-icons-outlined" style="font-size:40px;width:40px;height:40px;opacity:.25;margin-bottom:10px">event_note</mat-icon>
                                <p>Click a meeting to see details</p>
                            </div>
                        } @else {
                            <div class="meeting-cal-detail" [@fadeScale]>
                                <!-- Status badge -->
                                <div class="meeting-cal-detail-status"
                                     [class.meeting-cal-detail-status-live]="getMeetingStatus(selectedCalEvent()!) === 'IN_PROGRESS'"
                                     [class.meeting-cal-detail-status-soon]="getMeetingStatus(selectedCalEvent()!) === 'STARTING_SOON'"
                                     [class.meeting-cal-detail-status-ended]="getMeetingStatus(selectedCalEvent()!) === 'ENDED'">
                                    @if (getMeetingStatus(selectedCalEvent()!) === 'IN_PROGRESS') {
                                        <span class="meeting-live-dot" style="width:7px;height:7px"></span> LIVE
                                    } @else {
                                        {{ getMeetingStatus(selectedCalEvent()!) | titlecase }}
                                    }
                                </div>

                                <h4 class="meeting-cal-detail-title">{{ selectedCalEvent()!.name }}</h4>
                                @if (selectedCalEvent()!.description) {
                                    <p class="meeting-cal-detail-desc">{{ selectedCalEvent()!.description }}</p>
                                }

                                @if (selectedCalEvent()!.startTime) {
                                    <div class="meeting-cal-detail-row">
                                        <mat-icon class="material-icons-outlined" style="font-size:15px;width:15px;height:15px;flex-shrink:0;color:var(--mat-sys-primary)">schedule</mat-icon>
                                        <span>
                                            {{ selectedCalEvent()!.startTime | date:'EEE, MMM d, y' }}
                                            · {{ selectedCalEvent()!.startTime | date:'h:mm a' }}
                                            @if (selectedCalEvent()!.endTime) { – {{ selectedCalEvent()!.endTime | date:'h:mm a' }} }
                                        </span>
                                    </div>
                                }

                                @if (selectedCalEvent()!.meetingLink) {
                                    <button mat-flat-button class="meeting-cal-join-btn"
                                            (click)="openExternalLink(selectedCalEvent()!.meetingLink!)">
                                        <mat-icon style="font-size:16px;width:16px;height:16px">video_call</mat-icon>
                                        Join Meeting
                                    </button>
                                }

                                <!-- Members avatars -->
                                @if (calEventMembers().length > 0) {
                                    <div class="meeting-cal-members-row">
                                        @for (m of calEventMembers().slice(0, 6); track m.userId) {
                                            <div class="meeting-cal-member-av"
                                                 [ngStyle]="getAvatarGradient(m.userFullName)"
                                                 [matTooltip]="m.userFullName">
                                                {{ getInitials(m.userFullName) }}
                                            </div>
                                        }
                                        @if (calEventMembers().length > 6) {
                                            <div class="meeting-cal-member-more">+{{ calEventMembers().length - 6 }}</div>
                                        }
                                    </div>
                                }
                                @if (calEventMembersLoading()) {
                                    <div style="display:flex;align-items:center;gap:6px;margin:8px 0;font-size:12px;color:var(--mat-sys-on-surface-variant)">
                                        <mat-spinner diameter="14"></mat-spinner> Loading members…
                                    </div>
                                }

                                <button mat-stroked-button class="meeting-cal-open-room-btn"
                                        (click)="openRoomFromCalendar(selectedCalEvent()!)">
                                    <mat-icon style="font-size:15px;width:15px;height:15px">forum</mat-icon>
                                    Open Chatroom
                                </button>
                            </div>
                        }
                    </div>
                </div>
            </div>
        </div>
    }

    <!-- ══ Video recording overlay ═══════════════════════════════════════ -->
    <!-- Two separate position:fixed elements so no parent layout can       -->
    <!-- affect centering. Backdrop first (z 99998), card on top (z 99999). -->
    @if (videoPhase() !== 'idle') {
        <div class="vrc-backdrop-dark"></div>
        <div class="vrc-card-outer" [class.vrc-card-outer-review]="videoPhase() === 'review'">
            <div class="vrc-card">

                <!-- Camera feed — shown during preview / countdown / recording -->
                @if (videoPhase() !== 'review') {
                    <video #videoPreview class="vrc-camera"
                           [class.vrc-camera-dim]="videoPhase() === 'countdown'"
                           autoplay muted playsinline></video>
                }

                <!-- ── PREVIEW phase ─────────────────────────────────────── -->
                @if (videoPhase() === 'preview') {
                    <div class="vrc-overlay" [@fadePhase]>
                        <div class="vrc-quality-row">
                            @for (q of ['480p', '720p', '1080p']; track q) {
                                <button class="vrc-quality-pill"
                                        [class.vrc-quality-active]="videoQuality() === q"
                                        (click)="videoQuality.set($any(q))">{{ q }}</button>
                            }
                        </div>
                        <div class="vrc-preview-actions">
                            <button class="vrc-side-btn" (click)="cancelVideoRecording()" matTooltip="Cancel">
                                <mat-icon>close</mat-icon>
                                <span>Cancel</span>
                            </button>
                            <button class="vrc-start-btn" (click)="startVideoCountdown()" matTooltip="Start recording">
                                <mat-icon>fiber_manual_record</mat-icon>
                            </button>
                            <button class="vrc-side-btn" (click)="switchVideoCamera()" matTooltip="Flip camera">
                                <mat-icon>flip_camera_ios</mat-icon>
                                <span>Flip</span>
                            </button>
                        </div>
                    </div>
                }

                <!-- ── COUNTDOWN phase ───────────────────────────────────── -->
                @if (videoPhase() === 'countdown') {
                    <div class="vrc-countdown-overlay" [@fadePhase]>
                        <span class="vrc-cd-num"
                              [class.vrc-cd-2]="videoCountdown() === 2"
                              [class.vrc-cd-1]="videoCountdown() === 1"
                              [class.vrc-cd-go]="videoCountdown() === '🎬'">{{ videoCountdown() }}</span>
                    </div>
                }

                <!-- ── RECORDING phase ───────────────────────────────────── -->
                @if (videoPhase() === 'recording') {
                    <div class="vrc-overlay" [@fadePhase]>
                        <div class="vrc-rec-row">
                            <div class="vrc-rec-badge-wrap">
                                <svg class="vrc-progress-ring" viewBox="0 0 40 40">
                                    <circle cx="20" cy="20" r="18" fill="none"
                                            stroke="rgba(255,255,255,0.15)" stroke-width="3"/>
                                    <circle cx="20" cy="20" r="18" fill="none"
                                            stroke="#e53935" stroke-width="3"
                                            stroke-dasharray="113"
                                            [attr.stroke-dashoffset]="113 - (videoRecordingDuration() / 120) * 113"
                                            stroke-linecap="round"
                                            transform="rotate(-90 20 20)"/>
                                </svg>
                                <div class="vrc-rec-badge">
                                    @if (!videoIsPaused()) {
                                        <span class="vrc-rec-dot-anim"></span>
                                        <span class="vrc-badge-text">REC</span>
                                    } @else {
                                        <mat-icon class="vrc-pause-icon" style="font-size:16px;width:16px;height:16px">pause</mat-icon>
                                    }
                                </div>
                            </div>
                            <span class="vrc-rec-dur">{{ formatRecordingDuration(videoRecordingDuration()) }}</span>
                            <button class="vrc-x-btn" (click)="cancelVideoRecording()" matTooltip="Discard">
                                <mat-icon>close</mat-icon>
                            </button>
                        </div>
                        <div class="vrc-waveform">
                            @for (bar of audioBars(); track $index) {
                                <div class="vrc-audio-bar" [style.height.px]="4 + (bar / 255) * 44"></div>
                            }
                        </div>
                        <div class="vrc-rec-actions">
                            <button class="vrc-side-btn"
                                    (click)="toggleVideoPause()"
                                    [matTooltip]="videoIsPaused() ? 'Resume' : 'Pause'">
                                <mat-icon>{{ videoIsPaused() ? 'play_arrow' : 'pause' }}</mat-icon>
                                <span>{{ videoIsPaused() ? 'Resume' : 'Pause' }}</span>
                            </button>
                            <button class="vrc-stop-btn" (click)="stopVideoRecording()" matTooltip="Stop & review">
                                <mat-icon>stop</mat-icon>
                            </button>
                            <button class="vrc-side-btn vrc-side-btn-lg" (click)="stopVideoRecording()" matTooltip="Done">
                                <mat-icon>check</mat-icon>
                                <span>Done</span>
                            </button>
                        </div>
                    </div>
                }

                <!-- ── REVIEW phase ──────────────────────────────────────── -->
                @if (videoPhase() === 'review') {
                    <div class="vrc-review" [@fadePhase]>
                        <!-- Video preview with fade gradient at bottom -->
                        <div class="vrc-review-video-wrap">
                            <video class="vrc-review-video" controls [src]="recordedBlobUrl()" playsinline></video>
                            <div class="vrc-review-video-fade"></div>
                        </div>
                        <!-- Caption input -->
                        <input class="vrc-caption-input"
                               [(ngModel)]="videoCaption"
                               placeholder="Add a caption..."
                               maxlength="200">
                        <!-- Buttons row -->
                        <div class="vrc-review-actions">
                            <button class="vrc-rv-icon-btn" (click)="reRecordVideo()" matTooltip="Re-record">
                                <div class="vrc-rv-icon-circle"><mat-icon>replay</mat-icon></div>
                                <span>Re-record</span>
                            </button>
                            <button class="vrc-rv-icon-btn vrc-rv-discard-btn" (click)="cancelVideoRecording()" matTooltip="Discard">
                                <div class="vrc-rv-icon-circle"><mat-icon>delete_outline</mat-icon></div>
                                <span>Discard</span>
                            </button>
                            <button class="vrc-send-video-btn" (click)="sendReviewedVideo()">
                                <mat-icon>send</mat-icon>
                                Send Video
                            </button>
                        </div>
                    </div>
                }

            </div>
        </div>
    }
    `,
    styles: [`
        /* ── Layout ─────────────────────────────────────────────────── */
        .chat-layout {
            --inner-sidebar-width: 276px;
            gap: 14px !important;
            align-items: stretch !important;
        }
        .chat-sidebar {
            background: var(--mat-sys-surface-container-lowest);
            border: 1px solid var(--mat-sys-outline-variant);
            border-radius: 18px;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            height: calc(100vh - 250px);
            min-height: 0;
            box-shadow:
                0 1px 2px rgba(0,0,0,0.04),
                0 4px 16px rgba(0,0,0,0.06),
                0 0 0 0.5px var(--mat-sys-outline-variant);
            transition: box-shadow 0.3s ease;
        }
        .chat-sidebar:hover {
            box-shadow:
                0 1px 2px rgba(0,0,0,0.04),
                0 8px 28px rgba(0,0,0,0.09),
                0 0 0 0.5px var(--mat-sys-outline-variant);
        }
        .chat-main {
            display: flex;
            flex-direction: column;
            background: var(--mat-sys-surface-container-lowest);
            min-height: 0;
            border: 1px solid var(--mat-sys-outline-variant);
            border-radius: 18px;
            overflow: hidden;
            box-shadow:
                0 1px 2px rgba(0,0,0,0.04),
                0 6px 24px rgba(0,0,0,0.07),
                0 0 0 0.5px var(--mat-sys-outline-variant);
        }

        /* ── Sidebar brand / workspace ───────────────────────────────── */
        .sidebar-brand-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: linear-gradient(135deg, var(--mat-sys-primary), var(--mat-sys-tertiary));
            box-shadow: 0 0 0 2px color-mix(in srgb, var(--mat-sys-primary) 30%, transparent);
            animation: brand-dot-pulse 3s ease-in-out infinite;
            flex-shrink: 0;
        }
        @keyframes brand-dot-pulse {
            0%, 100% { box-shadow: 0 0 0 2px color-mix(in srgb, var(--mat-sys-primary) 30%, transparent); }
            50%       { box-shadow: 0 0 0 4px color-mix(in srgb, var(--mat-sys-primary) 15%, transparent); }
        }
        .sidebar-brand-label {
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: var(--mat-sys-on-surface-variant);
            opacity: 0.6;
        }
        .sidebar-channels-icon {
            font-size: 16px !important;
            width: 16px !important;
            height: 16px !important;
            color: var(--mat-sys-primary);
        }
        .sidebar-channels-title {
            font-size: 14.5px;
            font-weight: 700;
            letter-spacing: -0.015em;
            background: linear-gradient(135deg, var(--mat-sys-on-surface) 60%, var(--mat-sys-primary));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        .sidebar-action-btn {
            width: 30px !important;
            height: 30px !important;
            border-radius: 8px !important;
            transition: background 0.18s ease, transform 0.18s cubic-bezier(0.34,1.56,0.64,1) !important;
        }
        .sidebar-action-btn:hover {
            background: var(--mat-sys-primary-container) !important;
            color: var(--mat-sys-primary) !important;
            transform: scale(1.1) !important;
        }

        /* ── Sidebar top ─────────────────────────────────────────────── */
        .sidebar-top {
            border-bottom: 1px solid var(--mat-sys-outline-variant);
            background: linear-gradient(180deg,
                color-mix(in srgb, var(--mat-sys-primary-container) 22%, var(--mat-sys-surface-container-lowest)) 0%,
                var(--mat-sys-surface-container-lowest) 100%);
        }
        .sidebar-channels {
            scrollbar-width: thin;
            scrollbar-color: var(--mat-sys-outline-variant) transparent;
        }
        .sidebar-channels::-webkit-scrollbar { width: 4px; }
        .sidebar-channels::-webkit-scrollbar-track { background: transparent; }
        .sidebar-channels::-webkit-scrollbar-thumb {
            background: var(--mat-sys-outline-variant);
            border-radius: 10px;
        }

        /* ── Channel section headers ─────────────────────────────────── */
        .channel-section-header {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 10.5px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            margin-top: 4px;
            background: linear-gradient(90deg, var(--mat-sys-primary), var(--mat-sys-tertiary));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        .section-type-icon {
            font-size: 14px !important;
            width: 14px !important;
            height: 14px !important;
            -webkit-text-fill-color: var(--mat-sys-primary);
            color: var(--mat-sys-primary);
        }
        .section-type-label { flex: 1; }
        .section-count {
            background: linear-gradient(135deg, var(--mat-sys-primary-container), var(--mat-sys-tertiary-container));
            -webkit-text-fill-color: var(--mat-sys-primary);
            color: var(--mat-sys-primary);
            border-radius: 10px;
            font-size: 10px;
            font-weight: 700;
            padding: 0 6px;
            line-height: 18px;
            min-width: 18px;
            text-align: center;
        }

        /* ── Channel items ───────────────────────────────────────────── */
        .channel-item {
            cursor: pointer;
            border-radius: 8px;
            margin: 0 6px 1px;
            transition: background 0.15s ease, transform 0.14s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.15s;
            position: relative;
            overflow: hidden;
        }
        .channel-item::before {
            content: '';
            position: absolute;
            left: 0; top: 20%; bottom: 20%;
            width: 3px;
            border-radius: 0 3px 3px 0;
            background: var(--mat-sys-primary);
            transform: scaleY(0);
            transform-origin: center;
            transition: transform 0.22s cubic-bezier(0.34,1.56,0.64,1);
        }
        .channel-item:hover::before { transform: scaleY(0.6); opacity: 0.5; }
        .channel-item-active::before { transform: scaleY(1) !important; opacity: 1; }
        .channel-item:hover {
            background: var(--mat-sys-surface-container-high);
            transform: translateX(3px);
        }
        .channel-item-active {
            background: linear-gradient(135deg,
                color-mix(in srgb, var(--mat-sys-primary-container) 90%, var(--mat-sys-tertiary-container)) 0%,
                var(--mat-sys-primary-container) 100%) !important;
            box-shadow: 0 2px 10px color-mix(in srgb, var(--mat-sys-primary) 18%, transparent);
            transform: translateX(3px);
        }
        .channel-item-active .channel-name {
            color: var(--mat-sys-primary) !important;
            font-weight: 600 !important;
        }
        .channel-item-active .channel-item-icon { color: var(--mat-sys-primary) !important; }
        .channel-item-inner {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .channel-item-icon {
            color: var(--mat-sys-on-surface-variant);
            display: flex;
            align-items: center;
            flex-shrink: 0;
        }
        .channel-item-text { flex: 1; min-width: 0; }
        .channel-name {
            font-size: 13.5px;
            font-weight: 600;
            color: var(--mat-sys-on-surface);
            letter-spacing: -0.01em;
        }
        .channel-desc {
            font-size: 11.5px;
            color: var(--mat-sys-on-surface-variant);
            opacity: 0.8;
            margin-top: 1px;
        }
        .channel-item-actions {
            display: flex;
            align-items: center;
            gap: 2px;
            opacity: 0;
            transition: opacity 0.15s;
            flex-shrink: 0;
        }
        .channel-item:hover .channel-item-actions { opacity: 1; }
        .channel-item-active .channel-item-actions { opacity: 1; }

        /* ── Delete confirm ──────────────────────────────────────────── */
        .delete-confirm {
            border-radius: 6px;
            background: var(--mat-sys-surface-container-high);
        }

        /* ── Sidebar form ────────────────────────────────────────────── */
        .sidebar-form {
            border-top: 1px solid var(--mat-sys-outline-variant);
            border-bottom: 1px solid var(--mat-sys-outline-variant);
            background: linear-gradient(180deg,
                color-mix(in srgb, var(--mat-sys-primary-container) 8%, var(--mat-sys-surface-container-lowest)) 0%,
                var(--mat-sys-surface-container-lowest) 100%);
        }
        .sidebar-form-header {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 14px;
            padding-top: 14px;
        }
        .form-header-icon-wrap {
            width: 32px;
            height: 32px;
            border-radius: 10px;
            background: linear-gradient(135deg, var(--mat-sys-primary-container), var(--mat-sys-tertiary-container));
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }
        .form-header-icon {
            font-size: 17px !important;
            width: 17px !important;
            height: 17px !important;
            color: var(--mat-sys-primary);
        }
        .form-progress-bar {
            height: 3px;
            background: var(--mat-sys-surface-container-high);
            border-radius: 3px;
            overflow: hidden;
        }
        .form-progress-fill {
            height: 100%;
            background: linear-gradient(90deg, var(--mat-sys-primary), var(--mat-sys-tertiary));
            border-radius: 3px;
            transition: width 0.4s cubic-bezier(0.34,1.56,0.64,1);
        }

        /* ── Form wizard ─────────────────────────────────────────────── */
        @keyframes form-shake {
            0%, 100% { transform: translateX(0); }
            20%       { transform: translateX(-5px); }
            40%       { transform: translateX(5px); }
            60%       { transform: translateX(-3px); }
            80%       { transform: translateX(3px); }
        }
        .form-field-shake {
            animation: form-shake 0.32s ease;
        }
        .form-btn-shake {
            animation: form-shake 0.32s ease;
        }
        .form-step-label {
            font-size: 10.5px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.09em;
            color: var(--mat-sys-on-surface-variant);
        }
        .form-inline-error {
            font-size: 11px;
            color: var(--mat-sys-error, #ef4444);
            margin-top: -4px;
            margin-bottom: 8px;
            padding-left: 2px;
            display: flex;
            align-items: center;
            gap: 4px;
        }
        .field-check-icon {
            font-size: 16px !important;
            width: 16px !important;
            height: 16px !important;
            color: #16a34a !important;
        }
        .field-check-icon-inline {
            font-size: 14px !important;
            width: 14px !important;
            height: 14px !important;
            color: #16a34a !important;
            vertical-align: middle;
            margin-left: 4px;
        }
        .form-type-label {
            font-size: 11px;
            font-weight: 600;
            color: var(--mat-sys-on-surface-variant);
            margin-bottom: 8px;
            display: flex;
            align-items: center;
        }
        .room-type-pills {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin-bottom: 4px;
        }
        .room-type-pill-btn {
            padding: 4px 10px;
            border-radius: 16px;
            border: 1.5px solid var(--mat-sys-outline-variant);
            background: transparent;
            font-size: 11.5px;
            font-weight: 500;
            color: var(--mat-sys-on-surface-variant);
            cursor: pointer;
            transition: all 0.18s ease;
            line-height: 1.4;
        }
        .room-type-pill-btn:hover {
            border-color: var(--mat-sys-primary);
            color: var(--mat-sys-primary);
            background: color-mix(in srgb, var(--mat-sys-primary) 6%, transparent);
        }
        .room-type-pill-active {
            background: var(--mat-sys-primary-container) !important;
            border-color: var(--mat-sys-primary) !important;
            color: var(--mat-sys-on-primary-container) !important;
            font-weight: 600 !important;
        }
        .form-review-card {
            border-radius: 10px;
            border: 1px solid var(--mat-sys-outline-variant);
            background: var(--mat-sys-surface-container);
            overflow: hidden;
        }
        .form-review-row {
            display: flex;
            align-items: baseline;
            gap: 8px;
            padding: 8px 12px;
            border-bottom: 1px solid var(--mat-sys-outline-variant);
        }
        .form-review-row:last-child { border-bottom: none; }
        .form-review-key {
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.07em;
            color: var(--mat-sys-on-surface-variant);
            min-width: 72px;
            flex-shrink: 0;
        }
        .form-review-val {
            font-size: 12.5px;
            color: var(--mat-sys-on-surface);
            word-break: break-word;
        }

        /* ── Empty state ─────────────────────────────────────────────── */
        .chat-empty-state {
            display: flex;
            flex-direction: column;
        }
        .chat-empty-top {
            padding: 8px 12px;
            border-bottom: 1px solid var(--mat-sys-outline-variant);
        }
        .chat-empty-body {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 32px;
            text-align: center;
        }
        .chat-empty-icon-wrap {
            width: 84px;
            height: 84px;
            border-radius: 50%;
            background: linear-gradient(135deg, var(--mat-sys-primary-container), var(--mat-sys-tertiary-container));
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 20px;
            box-shadow:
                0 0 0 12px color-mix(in srgb, var(--mat-sys-primary) 6%, transparent),
                0 4px 20px color-mix(in srgb, var(--mat-sys-primary) 18%, transparent);
            animation: icon-float 3.5s ease-in-out infinite;
        }
        @keyframes icon-float {
            0%, 100% { transform: translateY(0); }
            50%       { transform: translateY(-6px); }
        }
        .chat-empty-icon {
            font-size: 40px !important;
            width: 40px !important;
            height: 40px !important;
            background: linear-gradient(135deg, var(--mat-sys-primary), var(--mat-sys-tertiary));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        /* ── Chat room wrap ──────────────────────────────────────────── */
        .chat-room-wrap {
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        /* ── Chat header ─────────────────────────────────────────────── */
        .chat-header {
            background: linear-gradient(135deg,
                var(--mat-sys-surface) 0%,
                color-mix(in srgb, var(--mat-sys-primary-container) 12%, var(--mat-sys-surface)) 100%);
            border-bottom: 1px solid var(--mat-sys-outline-variant);
            box-shadow: 0 1px 3px rgba(0,0,0,0.08);
            flex-shrink: 0;
        }
        .chat-header-row {
            display: flex;
            align-items: center;
            gap: 4px;
        }
        .chat-header-type-icon {
            color: var(--mat-sys-primary);
            display: flex;
            align-items: center;
            flex-shrink: 0;
        }
        .chat-header-info {
            flex: 1;
            min-width: 0;
        }
        .chat-room-title {
            font-size: 15px;
            background: linear-gradient(135deg, var(--mat-sys-primary), var(--mat-sys-tertiary));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        .chat-room-subtitle {
            display: block;
            font-size: 11px;
        }
        .chat-room-desc {
            font-size: 12px;
            padding-left: 44px;
        }
        .header-btn-active {
            background: var(--mat-sys-primary-container) !important;
            color: var(--mat-sys-primary) !important;
            border-radius: 8px;
        }

        /* ── Chat body ───────────────────────────────────────────────── */
        .chat-body {
            flex: 1;
            min-height: 0;
            display: flex;
            flex-direction: column;
            background: var(--mat-sys-surface-container-lowest);
        }
        .messages-scroll {
            flex: 1;
            overflow-y: auto;
            background: var(--mat-sys-surface-container-lowest);
            /* subtle dot pattern — theme-aware */
            background-image: radial-gradient(circle, color-mix(in srgb, var(--mat-sys-on-surface) 4%, transparent) 1px, transparent 1px);
            background-size: 24px 24px;
            scrollbar-width: thin;
            scrollbar-color: var(--mat-sys-outline-variant) transparent;
        }
        .messages-scroll::-webkit-scrollbar { width: 5px; }
        .messages-scroll::-webkit-scrollbar-track { background: transparent; }
        .messages-scroll::-webkit-scrollbar-thumb {
            background: var(--mat-sys-outline-variant);
            border-radius: 10px;
        }

        /* ── In-chat empty state ─────────────────────────────────────── */
        .msgs-empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 64px 32px;
            text-align: center;
        }
        .msgs-empty-icon {
            width: 68px;
            height: 68px;
            border-radius: 50%;
            background: linear-gradient(135deg, var(--mat-sys-primary-container), var(--mat-sys-tertiary-container));
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 18px;
            box-shadow: 0 0 0 10px color-mix(in srgb, var(--mat-sys-primary) 7%, transparent);
            animation: icon-float 3.5s ease-in-out infinite;
        }
        .msgs-empty-icon mat-icon {
            font-size: 32px !important;
            width: 32px !important;
            height: 32px !important;
            color: var(--mat-sys-primary);
        }
        .msgs-empty-title {
            font-size: 15px;
            font-weight: 700;
            color: var(--mat-sys-on-surface);
            margin: 0 0 6px;
        }
        .msgs-empty-sub {
            font-size: 13px;
            color: var(--mat-sys-on-surface-variant);
            margin: 0;
        }

        /* ── Message layout ──────────────────────────────────────────── */
        .msg-row {
            display: flex;
            align-items: flex-end;
            gap: 10px;
            margin-bottom: 12px;
            padding: 3px 18px;
            border-radius: 10px;
            transition: background 0.12s ease;
            position: relative;
        }
        .msg-row:hover {
            background: color-mix(in srgb, var(--mat-sys-on-surface) 2%, transparent);
        }
        .msg-consecutive {
            margin-top: -8px;
            margin-bottom: 2px;
        }
        .msg-row-own {
            flex-direction: row-reverse;
        }
        @keyframes msg-avatar-in {
            from { opacity: 0; transform: scale(0.7); }
            to   { opacity: 1; transform: scale(1);   }
        }
        .msg-avatar {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: linear-gradient(135deg, var(--mat-sys-primary), var(--mat-sys-tertiary));
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: 800;
            flex-shrink: 0;
            letter-spacing: -0.5px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15), 0 0 0 2px var(--mat-sys-surface-container-lowest);
            transition: transform 0.18s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.18s ease;
            animation: msg-avatar-in 0.28s cubic-bezier(0.34,1.56,0.64,1) both;
        }
        .msg-avatar:hover {
            transform: scale(1.1);
            box-shadow: 0 4px 14px rgba(0,0,0,0.2), 0 0 0 2px var(--mat-sys-surface-container-lowest);
        }
        .msg-avatar-spacer {
            width: 36px;
            flex-shrink: 0;
        }
        .msg-content-wrap {
            max-width: 68%;
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: flex-start;
        }
        .msg-content-wrap-own {
            align-items: flex-end;
        }

        /* Message action toolbar (hover) */
        .msg-hover-actions {
            position: absolute;
            top: -34px;
            right: 2px;
            display: flex;
            align-items: center;
            gap: 1px;
            background: var(--mat-sys-surface-container-low);
            border: 1px solid var(--mat-sys-outline-variant);
            border-radius: 22px;
            padding: 3px 5px;
            box-shadow: 0 4px 14px rgba(0,0,0,0.14), 0 1px 3px rgba(0,0,0,0.08);
            opacity: 0;
            transform: translateY(-4px) scale(0.95);
            pointer-events: none;
            transition: opacity 180ms cubic-bezier(0.34,1.56,0.64,1),
                        transform 180ms cubic-bezier(0.34,1.56,0.64,1);
            z-index: 20;
        }
        .msg-hover-actions-own {
            right: auto;
            left: 2px;
        }
        .msg-row:hover .msg-hover-actions {
            opacity: 1;
            transform: translateY(0) scale(1);
            pointer-events: auto;
        }
        .hover-action-btn {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            border: none;
            background: transparent;
            cursor: pointer;
            color: var(--mat-sys-on-surface-variant);
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.12s, color 0.12s, transform 0.12s cubic-bezier(0.34,1.56,0.64,1);
            padding: 0;
            text-decoration: none;
            flex-shrink: 0;
        }
        .hover-action-btn:hover {
            background: var(--mat-sys-primary-container);
            color: var(--mat-sys-primary);
            transform: scale(1.15);
        }

        .msg-bubble {
            border-radius: 18px;
            padding: 11px 16px 8px;
            position: relative;
            word-break: break-word;
            line-height: 1.65;
            transition: transform 0.18s cubic-bezier(0.34,1.56,0.64,1),
                        box-shadow 0.18s ease;
            min-width: 60px;
        }
        .msg-row:hover .msg-bubble {
            transform: translateY(-2px);
        }
        .msg-row:hover .msg-bubble-own {
            box-shadow:
                0 6px 20px color-mix(in srgb, var(--mat-sys-primary) 28%, transparent),
                0 2px 6px rgba(0,0,0,0.08),
                inset 0 1px 0 rgba(255,255,255,0.35);
        }
        .msg-row:hover .msg-bubble-other {
            box-shadow:
                0 4px 14px color-mix(in srgb, var(--mat-sys-on-surface) 9%, transparent),
                0 1px 3px rgba(0,0,0,0.06);
        }

        /* Own message — right side, coloured tail */
        .msg-bubble-own {
            background: linear-gradient(140deg,
                var(--mat-sys-primary-container) 0%,
                color-mix(in srgb, var(--mat-sys-primary-container) 50%, var(--mat-sys-tertiary-container)) 100%);
            color: var(--mat-sys-on-surface);
            border-radius: 18px 18px 4px 18px;
            box-shadow:
                0 3px 14px color-mix(in srgb, var(--mat-sys-primary) 22%, transparent),
                0 1px 4px rgba(0,0,0,0.07),
                inset 0 1px 0 rgba(255,255,255,0.35);
        }
        .msg-bubble-own::after {
            content: '';
            position: absolute;
            bottom: 0;
            right: -7px;
            width: 14px;
            height: 14px;
            background: color-mix(in srgb, var(--mat-sys-primary-container) 50%, var(--mat-sys-tertiary-container));
            clip-path: polygon(0 0, 0 100%, 100% 100%);
            border-bottom-right-radius: 2px;
        }

        /* Other message — left side, neutral tail */
        .msg-bubble-other {
            background: var(--mat-sys-surface-container);
            color: var(--mat-sys-on-surface);
            border-radius: 18px 18px 18px 4px;
            border: 1px solid var(--mat-sys-outline-variant);
            box-shadow:
                0 2px 8px color-mix(in srgb, var(--mat-sys-on-surface) 7%, transparent),
                0 1px 2px rgba(0,0,0,0.04);
        }
        .msg-bubble-other::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: -7px;
            width: 14px;
            height: 14px;
            background: var(--mat-sys-surface-container);
            clip-path: polygon(100% 0, 0 100%, 100% 100%);
            border-bottom-left-radius: 2px;
            border-left: 1px solid var(--mat-sys-outline-variant);
        }

        /* Consecutive bubbles — no tail, fully rounded */
        .msg-consecutive .msg-bubble-own  { border-radius: 18px 18px 18px 18px; }
        .msg-consecutive .msg-bubble-own::after  { display: none; }
        .msg-consecutive .msg-bubble-other { border-radius: 18px 18px 18px 18px; }
        .msg-consecutive .msg-bubble-other::after { display: none; }

        .msg-sender-name {
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.01em;
            color: var(--mat-sys-primary);
            margin-bottom: 3px !important;
        }
        .msg-text {
            font-size: 14.5px;
            line-height: 1.65;
            letter-spacing: 0.01em;
        }
        .msg-time {
            display: block;
            font-size: 10.5px;
            color: var(--mat-sys-on-surface-variant);
            margin-top: 5px;
            text-align: right;
            opacity: 0;
            max-height: 0;
            overflow: hidden;
            transition: opacity 0.22s ease, max-height 0.22s ease;
            letter-spacing: 0.02em;
            font-variant-numeric: tabular-nums;
        }
        .msg-row:hover .msg-time {
            opacity: 0.85;
            max-height: 20px;
        }
        .msg-bubble-other .msg-time { text-align: left; }

        /* ── System messages ─────────────────────────────────────────── */
        .sys-msg {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 3px;
            margin: 8px 0;
            padding: 0 18px;
        }
        .sys-msg-pill {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 14px 4px 10px;
            border-radius: 20px;
            background: color-mix(in srgb, var(--mat-sys-primary) 8%, var(--mat-sys-surface-container));
            border: 1px solid color-mix(in srgb, var(--mat-sys-primary) 14%, var(--mat-sys-outline-variant));
            max-width: 480px;
        }
        .sys-msg-icon {
            font-size: 14px !important;
            width: 14px !important;
            height: 14px !important;
            color: var(--mat-sys-primary);
            flex-shrink: 0;
        }
        .sys-msg-text {
            font-size: 12px;
            font-style: italic;
            color: var(--mat-sys-on-surface-variant);
            line-height: 1.4;
        }
        .sys-msg-time {
            font-size: 10px;
            color: var(--mat-sys-on-surface-variant);
            opacity: 0.5;
            letter-spacing: 0.02em;
        }

        /* ── Date separator ──────────────────────────────────────────── */
        .date-separator {
            display: flex;
            align-items: center;
            gap: 12px;
            margin: 16px 8px 12px;
        }
        .date-sep-line {
            flex: 1;
            height: 1px;
            background: linear-gradient(90deg,
                transparent 0%,
                color-mix(in srgb, var(--mat-sys-primary) 30%, var(--mat-sys-outline-variant)) 50%,
                transparent 100%);
        }
        .date-sep-label {
            font-size: 10.5px;
            font-weight: 700;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            white-space: nowrap;
            padding: 3px 12px;
            border-radius: 20px;
            background: var(--mat-sys-surface-container-high);
            border: 1px solid color-mix(in srgb, var(--mat-sys-primary) 20%, var(--mat-sys-outline-variant));
            color: var(--mat-sys-on-surface-variant);
            box-shadow: 0 1px 4px rgba(0,0,0,0.04);
        }

        /* ── Members panel ───────────────────────────────────────────── */
        .members-panel {
            position: absolute;
            top: 0;
            right: 0;
            bottom: 0;
            width: 300px;
            background: var(--mat-sys-surface-container-lowest);
            border-left: 1px solid var(--mat-sys-outline-variant);
            box-shadow: -8px 0 40px color-mix(in srgb, var(--mat-sys-primary) 5%, rgba(0,0,0,0.1));
            display: flex;
            flex-direction: column;
            z-index: 110;
            backdrop-filter: blur(12px);
        }
        .members-panel-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 14px;
            border-bottom: 1px solid var(--mat-sys-outline-variant);
            flex-shrink: 0;
        }
        .members-panel-title {
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 600;
            font-size: 14px;
            color: var(--mat-sys-on-surface);
        }
        .mp-count {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 20px;
            height: 20px;
            border-radius: 10px;
            background: var(--mat-sys-primary-container);
            color: var(--mat-sys-primary);
            font-size: 11px;
            font-weight: 700;
            padding: 0 5px;
        }
        .members-panel-body {
            flex: 1;
            overflow-y: auto;
        }
        .member-row {
            display: flex;
            align-items: center;
            gap: 10px;
            border-bottom: 1px solid var(--mat-sys-outline-variant);
            transition: background 0.12s;
        }
        .member-row:hover {
            background: var(--mat-sys-surface-container);
        }
        .member-avatar {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: var(--mat-sys-tertiary-container);
            color: var(--mat-sys-on-surface);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            font-weight: 700;
            flex-shrink: 0;
        }
        .member-info { flex: 1; min-width: 0; }
        .add-member-form {
            background: var(--mat-sys-surface-container);
            border-radius: 10px;
            padding: 12px;
            border: 1px solid var(--mat-sys-outline-variant);
        }

        /* ── Chat input ──────────────────────────────────────────────── */
        .chat-input-wrap {
            background: var(--mat-sys-surface-container-lowest);
            flex-shrink: 0;
            padding: 0 16px 16px;
            position: relative;
        }

        /* The card */
        .input-card {
            background: var(--mat-sys-surface-container-low);
            border: 1.5px solid var(--mat-sys-outline-variant);
            border-radius: 18px;
            box-shadow:
                0 -1px 0 rgba(0,0,0,0.04),
                0 4px 20px rgba(0,0,0,0.06),
                0 1px 4px rgba(0,0,0,0.04);
            transition: border-color 0.25s cubic-bezier(0.4,0,0.2,1),
                        box-shadow 0.25s cubic-bezier(0.4,0,0.2,1);
            overflow: hidden;
        }
        .input-card:focus-within {
            border-color: var(--mat-sys-primary);
            box-shadow:
                0 -1px 0 rgba(0,0,0,0.04),
                0 6px 28px rgba(0,0,0,0.08),
                0 0 0 3px color-mix(in srgb, var(--mat-sys-primary) 13%, transparent);
        }
        .input-card-disabled { opacity: 0.55; pointer-events: none; }

        /* Quill wrapper — toolbar visible/hidden */
        .quill-format-wrap ::ng-deep .ql-toolbar {
            border: none;
            border-bottom: 1px solid var(--mat-sys-outline-variant);
            padding: 5px 10px;
            background: color-mix(in srgb, var(--mat-sys-primary-container) 14%, var(--mat-sys-surface-container-low));
            transition: max-height 0.28s cubic-bezier(0.4,0,0.2,1), opacity 0.2s;
        }
        .quill-format-wrap ::ng-deep .ql-container {
            border: none;
            font-size: 14px;
            font-family: inherit;
        }
        .quill-format-wrap ::ng-deep .ql-editor {
            min-height: 28px;
            max-height: 160px;
            overflow-y: auto;
            padding: 7px 16px 4px;
            color: var(--mat-sys-on-surface);
            line-height: 1.55;
            scrollbar-width: thin;
            scrollbar-color: var(--mat-sys-outline-variant) transparent;
        }
        .quill-format-wrap ::ng-deep .ql-editor.ql-blank::before {
            color: var(--mat-sys-on-surface-variant);
            font-style: normal;
            opacity: 0.75;
        }
        .quill-format-wrap ::ng-deep .ql-editor::-webkit-scrollbar { width: 4px; }
        .quill-format-wrap ::ng-deep .ql-editor::-webkit-scrollbar-thumb {
            background: var(--mat-sys-outline-variant);
            border-radius: 10px;
        }

        /* Bottom bar */
        .input-bottom-bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 3px 8px 3px 6px;
            border-top: 1px solid var(--mat-sys-outline-variant);
            background: linear-gradient(90deg,
                var(--mat-sys-surface-container) 0%,
                color-mix(in srgb, var(--mat-sys-primary-container) 10%, var(--mat-sys-surface-container)) 100%);
        }
        .input-left-actions {
            display: flex;
            align-items: center;
            gap: 1px;
        }
        .input-right-actions {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .input-hint-text {
            font-size: 10px;
            color: var(--mat-sys-on-surface-variant);
            opacity: 0.55;
            user-select: none;
        }

        /* Action buttons in input bar */
        .input-action-btn {
            width: 32px;
            height: 32px;
            border-radius: 10px;
            border: none;
            background: transparent;
            cursor: pointer;
            color: var(--mat-sys-on-surface-variant);
            display: flex;
            align-items: center;
            justify-content: center;
            transition:
                background 0.15s ease,
                color 0.15s ease,
                transform 0.18s cubic-bezier(0.34,1.56,0.64,1);
            padding: 0;
            position: relative;
        }
        .input-action-btn:hover:not(:disabled) {
            background: var(--mat-sys-primary-container);
            color: var(--mat-sys-primary);
            transform: scale(1.15) translateY(-1px);
        }
        .input-action-btn:active:not(:disabled) {
            transform: scale(0.92);
        }
        .input-action-btn-active {
            background: var(--mat-sys-primary-container) !important;
            color: var(--mat-sys-primary) !important;
        }
        .input-action-btn:disabled { opacity: 0.35; cursor: not-allowed; }

        @keyframes send-pulse {
            0%, 100% { box-shadow: 0 2px 10px color-mix(in srgb, var(--mat-sys-primary) 40%, transparent), 0 1px 3px rgba(0,0,0,0.1); }
            50%       { box-shadow: 0 4px 18px color-mix(in srgb, var(--mat-sys-primary) 55%, transparent), 0 1px 3px rgba(0,0,0,0.1); }
        }

        /* Send FAB */
        .send-fab {
            width: 38px;
            height: 38px;
            border-radius: 50%;
            border: none;
            cursor: pointer;
            background: linear-gradient(135deg,
                var(--mat-sys-primary) 0%,
                color-mix(in srgb, var(--mat-sys-primary) 65%, var(--mat-sys-tertiary)) 100%);
            color: var(--mat-sys-on-primary);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            transition:
                transform 0.22s cubic-bezier(0.34,1.56,0.64,1),
                box-shadow 0.22s ease,
                opacity 0.2s ease;
            box-shadow:
                0 2px 10px color-mix(in srgb, var(--mat-sys-primary) 40%, transparent),
                0 1px 3px rgba(0,0,0,0.1);
        }
        .send-fab:not(:disabled) {
            animation: send-pulse 2.2s ease-in-out infinite;
        }
        .send-fab:not(:disabled):hover {
            animation: none;
            transform: scale(1.12) translateY(-1px);
            box-shadow:
                0 6px 20px color-mix(in srgb, var(--mat-sys-primary) 50%, transparent),
                0 2px 6px rgba(0,0,0,0.12);
        }
        .send-fab:not(:disabled):active {
            transform: scale(0.9);
            box-shadow: 0 1px 4px color-mix(in srgb, var(--mat-sys-primary) 30%, transparent);
        }
        .send-fab:disabled {
            background: var(--mat-sys-surface-container-high);
            color: var(--mat-sys-on-surface-variant);
            box-shadow: none;
            opacity: 0.55;
            cursor: not-allowed;
        }

        /* ── File chip ───────────────────────────────────────────────── */
        .file-chip {
            display: flex;
            align-items: center;
            gap: 8px;
            background: color-mix(in srgb, var(--mat-sys-primary-container) 55%, var(--mat-sys-surface-container-low));
            border: 1px solid color-mix(in srgb, var(--mat-sys-primary) 20%, var(--mat-sys-outline-variant));
            border-radius: 10px;
            padding: 5px 12px;
            margin: 0 12px 0;
            font-size: 13px;
            border-bottom: 1px solid var(--mat-sys-outline-variant);
        }
        .file-chip-name {
            font-weight: 500;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            max-width: 220px;
            color: var(--mat-sys-on-surface);
        }
        .file-chip-size { color: var(--mat-sys-on-surface-variant); font-size: 11px; }
        .file-chip-remove {
            background: none;
            border: none;
            cursor: pointer;
            color: var(--mat-sys-on-surface-variant);
            font-size: 14px;
            padding: 0 2px;
            margin-left: auto;
            line-height: 1;
        }
        .file-chip-remove:hover { color: #dc2626; }

        /* ── Emoji overlay ───────────────────────────────────────────── */
        .emoji-overlay {
            position: absolute;
            bottom: calc(100% + 8px);
            left: 16px;
            z-index: 300;
        }
        .emoji-full-picker {
            background: var(--mat-card-elevated-container-color, var(--mat-sys-surface));
            border: 1px solid var(--mat-sys-outline-variant);
            border-radius: 12px;
            padding: 8px;
            box-shadow: 0 8px 28px rgba(0,0,0,0.14);
            width: 320px;
            max-height: 260px;
            overflow-y: auto;
        }
        .emoji-grid {
            display: grid;
            grid-template-columns: repeat(10, 1fr);
            gap: 1px;
        }
        .ep-emoji-btn {
            background: transparent;
            border: none;
            cursor: pointer;
            padding: 3px;
            font-size: 20px;
            border-radius: 6px;
            line-height: 1;
            transition: background 0.1s, transform 0.12s cubic-bezier(0.34,1.56,0.64,1);
        }
        .ep-emoji-btn:hover {
            background: var(--mat-sys-surface-container-high);
            transform: scale(1.25);
        }

        /* ── File attachment ─────────────────────────────────────────── */
        .file-attachment { margin-top: 6px; }
        .attachment-image {
            max-width: 240px;
            max-height: 200px;
            border-radius: 10px;
            display: block;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            box-shadow: 0 2px 8px rgba(0,0,0,0.12);
        }
        .attachment-image:hover {
            transform: scale(1.02);
            box-shadow: 0 6px 20px rgba(0,0,0,0.18);
        }

        /* Rich file card inside bubble */
        .msg-file-card {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-top: 8px;
            padding: 9px 12px;
            border-radius: 12px;
            background: color-mix(in srgb, var(--mat-sys-surface-container-highest) 60%, transparent);
            border: 1px solid var(--mat-sys-outline-variant);
            max-width: 260px;
        }
        .msg-bubble-own .msg-file-card {
            background: color-mix(in srgb, var(--mat-sys-surface-container-highest) 40%, transparent);
            border-color: color-mix(in srgb, var(--mat-sys-primary) 20%, var(--mat-sys-outline-variant));
        }
        .msg-file-icon-wrap {
            width: 36px;
            height: 36px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }
        .msg-file-info {
            flex: 1;
            min-width: 0;
            display: flex;
            flex-direction: column;
            gap: 2px;
        }
        .msg-file-name {
            font-size: 12.5px;
            font-weight: 600;
            color: var(--mat-sys-on-surface);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            max-width: 140px;
        }
        .msg-file-size {
            font-size: 10.5px;
            color: var(--mat-sys-on-surface-variant);
        }
        .msg-file-download {
            width: 30px;
            height: 30px;
            border-radius: 8px;
            background: var(--mat-sys-primary-container);
            color: var(--mat-sys-primary);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            text-decoration: none;
            transition: background 0.15s, transform 0.15s cubic-bezier(0.34,1.56,0.64,1);
        }
        .msg-file-download:hover {
            background: var(--mat-sys-primary);
            color: var(--mat-sys-on-primary);
            transform: scale(1.1);
        }
        .file-size { color: var(--mat-sys-on-surface-variant); font-size: 12px; }

        /* ── Pin badge ───────────────────────────────────────────────── */
        .pin-badge {
            position: absolute;
            top: -9px;
            right: -7px;
            width: 22px;
            height: 22px;
            border-radius: 50%;
            background: color-mix(in srgb, #f59e0b 18%, var(--mat-sys-surface-container-lowest));
            border: 1.5px solid rgba(245,158,11,0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 6px rgba(245,158,11,0.25);
            z-index: 2;
            pointer-events: none;
        }
        .msg-content-wrap-own .pin-badge { right: auto; left: -7px; }
        .pinned-msg {
            border: 1.5px solid rgba(234,179,8,0.55) !important;
            box-shadow: 0 0 0 3px rgba(234,179,8,0.1) !important;
        }

        /* ── Pinned banner ───────────────────────────────────────────── */
        .pin-banner {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: linear-gradient(90deg,
                color-mix(in srgb, var(--mat-sys-primary-container) 30%, rgba(234,179,8,0.14)) 0%,
                rgba(251,191,36,0.07) 60%,
                rgba(217,119,6,0.03) 100%);
            border-bottom: 1px solid rgba(234,179,8,0.3);
            padding: 8px 14px;
            cursor: pointer;
            transition: background 0.2s ease, box-shadow 0.2s ease;
            user-select: none;
            flex-shrink: 0;
            box-shadow: 0 1px 4px rgba(234,179,8,0.1), 0 1px 0 rgba(234,179,8,0.08);
        }
        .pin-banner:hover {
            background: linear-gradient(90deg,
                color-mix(in srgb, var(--mat-sys-primary-container) 45%, rgba(234,179,8,0.18)) 0%,
                rgba(251,191,36,0.12) 100%);
            box-shadow: 0 2px 10px rgba(234,179,8,0.18);
        }
        .pin-banner-left {
            display: flex;
            align-items: center;
            gap: 10px;
            min-width: 0;
        }
        .pin-banner-icon { font-size: 16px; flex-shrink: 0; }
        .pin-wobble-el { animation: pin-wobble 3s ease-in-out infinite; display: inline-block; }
        .pin-banner-title {
            display: block;
            font-size: 12px;
            font-weight: 700;
            background: linear-gradient(90deg, #92400e, #b45309);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        .pin-banner-preview {
            display: block;
            font-size: 11px;
            color: #b45309;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 300px;
            opacity: 0.8;
        }
        .pin-banner-chevron {
            color: #b45309;
            font-size: 20px !important;
            width: 20px !important;
            height: 20px !important;
            flex-shrink: 0;
        }

        /* ── Pinned side panel ───────────────────────────────────────── */
        .pinned-panel {
            position: absolute;
            top: 0;
            right: 0;
            bottom: 0;
            width: 300px;
            background: var(--mat-sys-surface-container-lowest);
            border-left: 1px solid rgba(234,179,8,0.3);
            box-shadow: -8px 0 40px rgba(0,0,0,0.1), -2px 0 0 rgba(234,179,8,0.12);
            display: flex;
            flex-direction: column;
            z-index: 100;
            backdrop-filter: blur(12px);
        }
        .pinned-panel-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 14px;
            border-bottom: 1px solid rgba(234,179,8,0.25);
            background: linear-gradient(135deg, rgba(234,179,8,0.1) 0%, rgba(251,191,36,0.05) 100%);
            flex-shrink: 0;
        }
        .pinned-panel-title {
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 600;
            font-size: 14px;
        }
        .pp-icon { font-size: 16px; }
        .pp-count {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 20px;
            height: 20px;
            border-radius: 10px;
            background: rgba(234,179,8,0.3);
            color: #92400e;
            font-size: 11px;
            font-weight: 700;
            padding: 0 5px;
        }
        .pp-close-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            background: none;
            border: none;
            cursor: pointer;
            color: var(--mat-sys-on-surface-variant);
            padding: 4px;
            border-radius: 6px;
            transition: background 0.15s, color 0.15s;
        }
        .pp-close-btn:hover { background: var(--mat-sys-surface-container-high); color: var(--mat-sys-on-surface); }
        .pinned-panel-body {
            flex: 1;
            overflow-y: auto;
            padding: 10px;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .pp-empty { font-size: 13px; color: var(--mat-sys-on-surface-variant); text-align: center; margin-top: 24px; }
        .pp-item {
            background: var(--mat-sys-surface-container);
            border: 1px solid rgba(234,179,8,0.25);
            border-radius: 10px;
            padding: 10px 12px;
            position: relative;
            transition: box-shadow 0.2s;
        }
        .pp-item:hover { box-shadow: 0 2px 10px rgba(234,179,8,0.15); }
        .pp-item-meta {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 5px;
        }
        .pp-sender { font-size: 12px; font-weight: 600; color: var(--mat-sys-on-surface); }
        .pp-time { font-size: 10px; color: var(--mat-sys-on-surface-variant); }
        .pp-content {
            font-size: 13px;
            line-height: 1.45;
            overflow: hidden;
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            color: var(--mat-sys-on-surface);
        }
        .pp-file { font-size: 12px; color: var(--mat-sys-on-surface-variant); margin-top: 4px; }
        .pp-pinned-by { font-size: 10px; color: #b45309; margin-top: 6px; opacity: 0.8; }
        .pp-unpin-btn {
            margin-top: 8px;
            background: none;
            border: 1px solid rgba(234,179,8,0.4);
            border-radius: 6px;
            padding: 2px 10px;
            font-size: 11px;
            color: #92400e;
            cursor: pointer;
            transition: background 0.15s, border-color 0.15s;
        }
        .pp-unpin-btn:hover { background: rgba(234,179,8,0.15); border-color: rgba(234,179,8,0.7); }

        /* ── Context menu ────────────────────────────────────────────── */
        .ctx-menu {
            position: fixed;
            z-index: 9999;
            background: var(--mat-card-elevated-container-color, var(--mat-sys-surface));
            border: 1px solid var(--mat-sys-outline-variant);
            border-radius: 10px;
            box-shadow: 0 8px 30px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08);
            min-width: 180px;
            overflow: hidden;
            padding: 4px;
        }
        .ctx-item {
            display: flex;
            align-items: center;
            gap: 10px;
            width: 100%;
            background: none;
            border: none;
            padding: 9px 14px;
            font-size: 13px;
            cursor: pointer;
            border-radius: 7px;
            color: var(--mat-sys-on-surface);
            transition: background 0.12s, color 0.12s;
            text-align: left;
        }
        .ctx-item:hover { background: var(--mat-sys-primary-container); color: var(--mat-sys-primary); }
        .ctx-icon { font-size: 16px; line-height: 1; }

        /* ── Reaction strip ──────────────────────────────────────────── */
        .reaction-strip {
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 4px;
            margin-top: 4px;
            padding: 0 2px;
            position: relative;
        }
        .reaction-strip.my-msg { justify-content: flex-end; }
        .reaction-pill {
            display: inline-flex;
            align-items: center;
            gap: 3px;
            padding: 1px 8px 1px 6px;
            border-radius: 20px;
            background: var(--mat-sys-surface-container-high);
            border: 1px solid transparent;
            font-size: 13px;
            line-height: 1.6;
            cursor: pointer;
            transition: background 0.15s, border-color 0.15s, transform 0.12s cubic-bezier(0.34,1.56,0.64,1);
        }
        .reaction-pill:hover {
            background: var(--mat-sys-surface-container-highest);
            transform: scale(1.1);
        }
        .reaction-pill.my-reaction {
            background: var(--mat-sys-primary-container);
            border-color: var(--mat-sys-primary);
        }
        .reaction-count {
            font-size: 11px;
            font-weight: 600;
            color: var(--mat-sys-on-surface-variant);
        }
        .reaction-trigger {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 22px;
            height: 22px;
            border-radius: 50%;
            border: 1px dashed var(--mat-sys-outline-variant);
            background: transparent;
            cursor: pointer;
            opacity: 0;
            transition: opacity 0.15s, background 0.15s, border-color 0.15s;
            color: var(--mat-sys-on-surface-variant);
            padding: 0;
        }
        .msg-row:hover .reaction-trigger { opacity: 1; }
        .reaction-strip:not(:empty) .reaction-trigger { opacity: 0.6; }
        .reaction-trigger:hover {
            background: var(--mat-sys-surface-container-high);
            border-style: solid;
            opacity: 1 !important;
        }
        .emoji-palette {
            position: absolute;
            bottom: calc(100% + 6px);
            left: 0;
            display: flex;
            gap: 1px;
            background: var(--mat-card-elevated-container-color, var(--mat-sys-surface));
            border: 1px solid var(--mat-sys-outline-variant);
            border-radius: 24px;
            padding: 4px 8px;
            box-shadow: 0 6px 20px rgba(0,0,0,0.13);
            z-index: 200;
            white-space: nowrap;
        }
        .reaction-strip.my-msg .emoji-palette { left: auto; right: 0; }
        .emoji-btn {
            background: transparent;
            border: none;
            cursor: pointer;
            padding: 3px 4px;
            border-radius: 8px;
            font-size: 18px;
            line-height: 1;
            transition: background 0.1s, transform 0.15s;
        }
        .emoji-btn:hover { background: var(--mat-sys-surface-container-high); }
        .emoji-glyph { display: inline-block; }
        .emoji-btn:hover .emoji-glyph {
            animation: emoji-bounce 0.38s cubic-bezier(0.34,1.56,0.64,1) both;
        }
        @keyframes emoji-bounce {
            0%   { transform: translateY(0)   scale(1); }
            45%  { transform: translateY(-6px) scale(1.28); }
            72%  { transform: translateY(2px)  scale(0.93); }
            100% { transform: translateY(0)   scale(1); }
        }

        /* ── Error ───────────────────────────────────────────────────── */
        .chat-error {
            display: flex;
            align-items: center;
            gap: 6px;
            background: #fef2f2;
            border: 1px solid #fecaca;
            color: #dc2626;
            border-radius: 6px;
            font-size: 13px;
        }

        /* ── Room type pill ──────────────────────────────────────────── */
        .room-type-pill {
            display: inline-block;
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            padding: 2px 9px;
            border-radius: 20px;
            background: linear-gradient(135deg, var(--mat-sys-primary-container), var(--mat-sys-tertiary-container));
            color: var(--mat-sys-primary);
            border: 1px solid color-mix(in srgb, var(--mat-sys-primary) 20%, transparent);
            box-shadow: 0 1px 4px color-mix(in srgb, var(--mat-sys-primary) 12%, transparent);
        }

        /* ── Send button shimmer ─────────────────────────────────────── */
        ::ng-deep .mat-mdc-raised-button[color="primary"],
        ::ng-deep .mat-mdc-flat-button[color="primary"] {
            position: relative;
            overflow: hidden;
        }
        ::ng-deep .mat-mdc-raised-button[color="primary"]::after,
        ::ng-deep .mat-mdc-flat-button[color="primary"]::after {
            content: '';
            position: absolute;
            top: 0; left: -60%;
            width: 40%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
            transform: skewX(-20deg);
            opacity: 0;
            transition: none;
        }
        ::ng-deep .mat-mdc-flat-button[color="primary"]:not(:disabled):hover::after {
            animation: btn-shimmer 0.6s ease forwards;
        }
        @keyframes btn-shimmer {
            0%   { left: -60%; opacity: 1; }
            100% { left: 120%; opacity: 0; }
        }

        /* ── WS connection banner ─────────────────────────────────────── */
        .ws-banner {
            animation: banner-pulse 2s ease-in-out infinite;
        }
        @keyframes banner-pulse {
            0%, 100% { opacity: 1; }
            50%       { opacity: 0.7; }
        }

        /* ── New message pop ──────────────────────────────────────────── */
        @keyframes msg-pop {
            0%   { transform: scale(0.92) translateY(10px); opacity: 0; }
            60%  { transform: scale(1.02) translateY(-2px); opacity: 1; }
            100% { transform: scale(1)    translateY(0);    opacity: 1; }
        }

        /* ── Typing dots ─────────────────────────────────────────────── */
        .typing-dot {
            display: inline-block;
            width: 6px; height: 6px;
            border-radius: 50%;
            background: var(--mat-sys-primary);
            animation: typing-bounce 1.4s ease-in-out infinite;
        }
        .typing-dot:nth-child(1) { animation-delay: 0s; }
        .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes typing-bounce {
            0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
            30%            { transform: translateY(-5px); opacity: 1; }
        }

        /* ── Avatar gradient shift ───────────────────────────────────── */
        @keyframes avatar-glow {
            0%, 100% { box-shadow: 0 0 0 2px color-mix(in srgb, var(--mat-sys-primary) 25%, transparent); }
            50%       { box-shadow: 0 0 0 4px color-mix(in srgb, var(--mat-sys-primary) 45%, transparent); }
        }

        /* ── Pinned banner pulse ─────────────────────────────────────── */
        .pin-banner-icon {
            animation: pin-wobble 2.5s ease-in-out infinite;
            display: inline-block;
        }
        @keyframes pin-wobble {
            0%, 100% { transform: rotate(0deg) scale(1); }
            20%       { transform: rotate(-12deg) scale(1.15); }
            40%       { transform: rotate(10deg) scale(1.1); }
            60%       { transform: rotate(-6deg) scale(1.05); }
            80%       { transform: rotate(3deg) scale(1); }
        }

        /* ════════════════════════════════════════════════════════════════
           ── Shared Content Panel ───────────────────────────────────────
           ════════════════════════════════════════════════════════════════ */
        .shared-panel {
            position: absolute;
            top: 0; right: 0; bottom: 0;
            width: 320px;
            background: var(--mat-sys-surface-container-lowest);
            border-left: 1px solid var(--mat-sys-outline-variant);
            box-shadow: -8px 0 40px color-mix(in srgb, var(--mat-sys-primary) 6%, rgba(0,0,0,0.12));
            display: flex;
            flex-direction: column;
            z-index: 115;
            border-radius: 0 16px 16px 0;
            backdrop-filter: blur(12px);
        }

        /* Header */
        .sp-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 14px 14px 12px;
            border-bottom: 1px solid var(--mat-sys-outline-variant);
            background: linear-gradient(135deg,
                color-mix(in srgb, var(--mat-sys-primary-container) 18%, var(--mat-sys-surface-container-lowest)) 0%,
                var(--mat-sys-surface-container-lowest) 100%);
            flex-shrink: 0;
        }
        .sp-header-left {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .sp-header-icon {
            width: 36px;
            height: 36px;
            border-radius: 10px;
            background: linear-gradient(135deg, var(--mat-sys-primary-container), var(--mat-sys-tertiary-container));
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--mat-sys-primary);
            flex-shrink: 0;
        }
        .sp-title-text {
            font-size: 14px;
            font-weight: 700;
            color: var(--mat-sys-on-surface);
            margin: 0 0 1px;
            background: linear-gradient(90deg, var(--mat-sys-primary), var(--mat-sys-tertiary));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        .sp-title-sub {
            font-size: 11px;
            color: var(--mat-sys-on-surface-variant);
            margin: 0;
        }

        /* Tabs */
        .sp-tabs {
            display: flex;
            padding: 8px 10px 0;
            gap: 4px;
            border-bottom: 1px solid var(--mat-sys-outline-variant);
            flex-shrink: 0;
            background: var(--mat-sys-surface-container-lowest);
        }
        .sp-tab {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 3px;
            padding: 7px 4px 9px;
            border: none;
            background: transparent;
            cursor: pointer;
            font-size: 12px;
            font-weight: 600;
            color: var(--mat-sys-on-surface-variant);
            border-radius: 8px 8px 0 0;
            transition: color 0.18s, background 0.18s;
            position: relative;
        }
        .sp-tab::after {
            content: '';
            position: absolute;
            bottom: 0; left: 8px; right: 8px;
            height: 2.5px;
            border-radius: 3px 3px 0 0;
            background: var(--mat-sys-primary);
            transform: scaleX(0);
            transition: transform 0.22s cubic-bezier(0.34,1.56,0.64,1);
        }
        .sp-tab-active {
            color: var(--mat-sys-primary);
            background: color-mix(in srgb, var(--mat-sys-primary-container) 30%, transparent);
        }
        .sp-tab-active::after { transform: scaleX(1); }
        .sp-tab:hover:not(.sp-tab-active) {
            background: color-mix(in srgb, var(--mat-sys-surface-container-high) 60%, transparent);
            color: var(--mat-sys-on-surface);
        }
        .sp-tab-badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 17px;
            height: 17px;
            border-radius: 9px;
            background: linear-gradient(135deg, var(--mat-sys-primary), var(--mat-sys-tertiary));
            color: var(--mat-sys-on-primary);
            font-size: 10px;
            font-weight: 700;
            padding: 0 4px;
            margin-left: 2px;
        }

        /* Body */
        .sp-body {
            flex: 1;
            overflow-y: auto;
            scrollbar-width: thin;
            scrollbar-color: var(--mat-sys-outline-variant) transparent;
        }
        .sp-body::-webkit-scrollbar { width: 4px; }
        .sp-body::-webkit-scrollbar-thumb { background: var(--mat-sys-outline-variant); border-radius: 10px; }

        /* Loading */
        .sp-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 48px 24px;
            gap: 14px;
        }
        .sp-loading-text {
            font-size: 13px;
            color: var(--mat-sys-on-surface-variant);
            margin: 0;
        }

        /* Empty state */
        .sp-empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 48px 24px;
            text-align: center;
        }
        .sp-empty-icon {
            font-size: 44px !important;
            width: 44px !important;
            height: 44px !important;
            color: var(--mat-sys-outline-variant);
            margin-bottom: 14px;
        }
        .sp-empty-text {
            font-size: 13px;
            color: var(--mat-sys-on-surface-variant);
            margin: 0;
        }

        /* ── Images grid ── */
        .sp-image-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 3px;
            padding: 10px;
        }
        .sp-image-cell {
            aspect-ratio: 1;
            overflow: hidden;
            border-radius: 8px;
            cursor: pointer;
            position: relative;
            background: var(--mat-sys-surface-container-high);
        }
        .sp-image-thumb {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.3s ease;
            display: block;
        }
        .sp-image-overlay {
            position: absolute;
            inset: 0;
            background: rgba(0,0,0,0.45);
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: opacity 0.2s ease;
        }
        .sp-image-cell:hover .sp-image-thumb { transform: scale(1.08); }
        .sp-image-cell:hover .sp-image-overlay { opacity: 1; }

        /* ── File list ── */
        .sp-file-list {
            display: flex;
            flex-direction: column;
            gap: 6px;
            padding: 10px;
        }
        .sp-file-card {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 12px;
            border-radius: 12px;
            background: var(--mat-sys-surface-container);
            border: 1px solid var(--mat-sys-outline-variant);
            transition: background 0.15s, box-shadow 0.15s, transform 0.14s cubic-bezier(0.34,1.56,0.64,1);
        }
        .sp-file-card:hover {
            background: color-mix(in srgb, var(--mat-sys-primary-container) 20%, var(--mat-sys-surface-container));
            box-shadow: 0 3px 14px color-mix(in srgb, var(--mat-sys-primary) 8%, rgba(0,0,0,0.06));
            transform: translateY(-2px);
        }
        .sp-file-icon-wrap {
            width: 40px;
            height: 40px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }
        .fi-pdf   { background: linear-gradient(135deg, #fef2f2, #fee2e2); color: #dc2626; }
        .fi-word  { background: linear-gradient(135deg, #eff6ff, #dbeafe); color: #2563eb; }
        .fi-excel { background: linear-gradient(135deg, #f0fdf4, #dcfce7); color: #16a34a; }
        .fi-ppt   { background: linear-gradient(135deg, #fff7ed, #fed7aa); color: #ea580c; }
        .fi-zip   { background: linear-gradient(135deg, #faf5ff, #ede9fe); color: #7c3aed; }
        .fi-audio { background: linear-gradient(135deg, #fdf4ff, #fae8ff); color: #a21caf; }
        .fi-video { background: linear-gradient(135deg, #eff6ff, #dbeafe); color: #1d4ed8; }
        .fi-default { background: linear-gradient(135deg, var(--mat-sys-surface-container), var(--mat-sys-surface-container-high)); color: var(--mat-sys-on-surface-variant); }
        .sp-file-info { flex: 1; min-width: 0; }
        .sp-file-name {
            font-size: 12.5px;
            font-weight: 600;
            color: var(--mat-sys-on-surface);
            margin: 0 0 3px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .sp-file-meta {
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 4px;
            font-size: 10.5px;
            color: var(--mat-sys-on-surface-variant);
        }
        .sp-badge-size {
            background: var(--mat-sys-primary-container);
            color: var(--mat-sys-primary);
            border-radius: 6px;
            padding: 0 5px;
            font-size: 10px;
            font-weight: 700;
        }
        .sp-meta-dot { opacity: 0.4; }
        .sp-meta-sender { font-weight: 600; color: var(--mat-sys-on-surface); }
        .sp-meta-date { opacity: 0.7; }
        .sp-download-btn {
            width: 32px;
            height: 32px;
            border-radius: 8px;
            background: var(--mat-sys-primary-container);
            color: var(--mat-sys-primary);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            transition: background 0.15s, transform 0.15s cubic-bezier(0.34,1.56,0.64,1);
            text-decoration: none;
        }
        .sp-download-btn:hover {
            background: var(--mat-sys-primary);
            color: var(--mat-sys-on-primary);
            transform: scale(1.1);
        }

        /* ── Link list ── */
        .sp-link-list {
            display: flex;
            flex-direction: column;
            gap: 6px;
            padding: 10px;
        }
        .sp-link-card {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            padding: 10px 12px;
            border-radius: 12px;
            background: var(--mat-sys-surface-container);
            border: 1px solid var(--mat-sys-outline-variant);
            text-decoration: none;
            transition: background 0.15s, box-shadow 0.15s, transform 0.14s cubic-bezier(0.34,1.56,0.64,1);
            cursor: pointer;
        }
        .sp-link-card:hover {
            background: color-mix(in srgb, var(--mat-sys-tertiary-container) 20%, var(--mat-sys-surface-container));
            box-shadow: 0 3px 14px color-mix(in srgb, var(--mat-sys-tertiary) 8%, rgba(0,0,0,0.06));
            transform: translateY(-2px);
        }
        .sp-link-globe {
            width: 34px;
            height: 34px;
            border-radius: 10px;
            background: linear-gradient(135deg, var(--mat-sys-tertiary-container), var(--mat-sys-primary-container));
            color: var(--mat-sys-tertiary);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            margin-top: 1px;
        }
        .sp-link-info { flex: 1; min-width: 0; }
        .sp-link-url {
            font-size: 12px;
            font-weight: 600;
            color: var(--mat-sys-primary);
            margin: 0 0 3px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .sp-link-preview {
            font-size: 11.5px;
            color: var(--mat-sys-on-surface-variant);
            margin: 0 0 4px;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }
        .sp-link-arrow {
            color: var(--mat-sys-on-surface-variant);
            flex-shrink: 0;
            margin-top: 2px;
            transition: color 0.15s, transform 0.15s;
        }
        .sp-link-card:hover .sp-link-arrow {
            color: var(--mat-sys-primary);
            transform: translate(2px, -2px);
        }

        /* ── Lightbox ── */
        .sp-lightbox {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.82);
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            backdrop-filter: blur(6px);
        }
        .sp-lightbox-card {
            background: #111;
            border-radius: 16px;
            overflow: hidden;
            max-width: 90vw;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 24px 80px rgba(0,0,0,0.6);
        }
        .sp-lightbox-toolbar {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 14px;
            background: rgba(255,255,255,0.06);
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .sp-lightbox-sender {
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 12px;
            color: rgba(255,255,255,0.8);
            font-weight: 600;
        }
        .sp-lightbox-date {
            font-size: 11px;
            color: rgba(255,255,255,0.45);
            margin-right: auto;
        }
        .sp-lightbox-close {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            border: none;
            background: rgba(255,255,255,0.1);
            color: #fff;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.15s;
        }
        .sp-lightbox-close:hover { background: rgba(255,255,255,0.2); }
        .sp-lightbox-img {
            max-width: 86vw;
            max-height: 78vh;
            object-fit: contain;
            display: block;
        }
        .sp-lightbox-caption {
            font-size: 12px;
            color: rgba(255,255,255,0.5);
            text-align: center;
            padding: 8px 16px;
            margin: 0;
            background: rgba(0,0,0,0.3);
        }

        /* ── Voice recording UI ──────────────────────────────────────── */
        .recording-ui {
            display: flex;
            flex-direction: column;
            gap: 0;
            padding: 10px 14px 8px;
            min-height: 60px;
        }
        .recording-row {
            display: flex;
            align-items: center;
            gap: 12px;
            width: 100%;
        }
        .recording-left {
            display: flex;
            align-items: center;
            gap: 10px;
            flex-shrink: 0;
        }
        .rec-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: #ef4444;
            box-shadow: 0 0 0 0 rgba(239,68,68,0.5);
            animation: rec-pulse 1.4s ease-in-out infinite;
            flex-shrink: 0;
        }
        @keyframes rec-pulse {
            0%   { box-shadow: 0 0 0 0   rgba(239,68,68,0.55); }
            50%  { box-shadow: 0 0 0 8px rgba(239,68,68,0);    }
            100% { box-shadow: 0 0 0 0   rgba(239,68,68,0);    }
        }
        .rec-duration {
            font-size: 13px;
            font-weight: 600;
            font-variant-numeric: tabular-nums;
            color: var(--mat-sys-on-surface);
            letter-spacing: 0.04em;
            min-width: 36px;
        }
        .recording-waveform {
            display: flex;
            align-items: center;
            gap: 3px;
            flex: 1;
            justify-content: center;
            height: 28px;
        }
        .wave-bar {
            width: 3px;
            border-radius: 2px;
            background: var(--mat-sys-primary);
            animation: wave-bounce 0.9s ease-in-out infinite alternate;
            opacity: 0.75;
        }
        .wave-bar:nth-child(1)  { animation-delay: 0s;    height: 8px;  }
        .wave-bar:nth-child(2)  { animation-delay: 0.1s;  height: 14px; }
        .wave-bar:nth-child(3)  { animation-delay: 0.2s;  height: 20px; }
        .wave-bar:nth-child(4)  { animation-delay: 0.3s;  height: 26px; }
        .wave-bar:nth-child(5)  { animation-delay: 0.15s; height: 22px; }
        .wave-bar:nth-child(6)  { animation-delay: 0.25s; height: 16px; }
        .wave-bar:nth-child(7)  { animation-delay: 0.05s; height: 10px; }
        .wave-bar:nth-child(8)  { animation-delay: 0.35s; height: 6px;  }
        @keyframes wave-bounce {
            from { transform: scaleY(0.25); opacity: 0.5; }
            to   { transform: scaleY(1);    opacity: 1;   }
        }
        .recording-right {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-shrink: 0;
        }
        .rec-cancel-btn {
            width: 34px;
            height: 34px;
            border-radius: 50%;
            border: 1.5px solid var(--mat-sys-outline-variant);
            background: var(--mat-sys-surface-container);
            color: var(--mat-sys-on-surface-variant);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: background 0.18s ease, transform 0.18s ease;
            padding: 0;
        }
        .rec-cancel-btn:hover { background: var(--mat-sys-error-container); color: var(--mat-sys-error); transform: scale(1.1); }
        .rec-send-btn {
            width: 38px;
            height: 38px;
            border-radius: 50%;
            border: none;
            background: linear-gradient(135deg, var(--mat-sys-primary) 0%, color-mix(in srgb, var(--mat-sys-primary) 80%, var(--mat-sys-tertiary)) 100%);
            color: var(--mat-sys-on-primary);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: transform 0.18s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.18s ease;
            box-shadow: 0 2px 10px color-mix(in srgb, var(--mat-sys-primary) 40%, transparent);
            padding: 0;
        }
        .rec-send-btn:hover { transform: scale(1.12) translateY(-1px); box-shadow: 0 6px 20px color-mix(in srgb, var(--mat-sys-primary) 50%, transparent); }
        .rec-send-btn:active { transform: scale(0.9); }

        /* ── @mention autocomplete ───────────────────────────────────── */
        @keyframes mention-enter {
            from { transform: translateY(8px); opacity: 0; }
            to   { transform: translateY(0);   opacity: 1; }
        }
        .mention-overlay {
            position: absolute;
            bottom: calc(100% + 4px);
            left: 16px;
            right: 16px;
            z-index: 300;
            animation: mention-enter 180ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .mention-panel {
            background: var(--mat-card-elevated-container-color, var(--mat-sys-surface));
            border: 1px solid var(--mat-sys-outline-variant);
            border-radius: 12px;
            box-shadow: 0 4px 24px rgba(0,0,0,0.14), 0 1px 4px rgba(0,0,0,0.08);
            max-height: 220px;
            overflow-y: auto;
            padding: 4px;
        }
        .mention-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 7px 10px;
            border-radius: 8px;
            cursor: pointer;
            transition: background 150ms ease;
            border-left: 3px solid transparent;
        }
        .mention-item:hover,
        .mention-item-active {
            background: color-mix(in srgb, var(--mat-sys-primary) 10%, transparent);
            border-left-color: var(--mat-sys-primary);
        }
        .mention-avatar {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            font-weight: 700;
            color: #fff;
            flex-shrink: 0;
        }
        .mention-avatar-everyone {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background: var(--mat-sys-primary);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }
        .mention-info {
            flex: 1;
            min-width: 0;
            display: flex;
            flex-direction: column;
            gap: 1px;
        }
        .mention-name {
            font-size: 13px;
            font-weight: 600;
            color: var(--mat-sys-on-surface);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .mention-sub {
            font-size: 11px;
            color: var(--mat-sys-on-surface-variant);
        }
        .mention-role-badge {
            font-size: 10px;
            font-weight: 700;
            padding: 2px 7px;
            border-radius: 20px;
            text-transform: uppercase;
            letter-spacing: 0.03em;
            flex-shrink: 0;
        }
        .mention-role-manager   { background: color-mix(in srgb, var(--mat-sys-primary)   20%, transparent); color: var(--mat-sys-primary);   }
        .mention-role-tutor     { background: color-mix(in srgb, var(--mat-sys-secondary)  20%, transparent); color: var(--mat-sys-secondary);  }
        .mention-role-employee  { background: rgba(76,175,80,0.15);  color: #388e3c; }
        .mention-role-student   { background: rgba(255,152,0,0.15);  color: #e65100; }
        .mention-role-all       { background: color-mix(in srgb, var(--mat-sys-tertiary)   20%, transparent); color: var(--mat-sys-tertiary);   }

        /* mention chip in message content */
        ::ng-deep .mention-chip {
            display: inline-block;
            background: color-mix(in srgb, var(--mat-sys-primary) 15%, transparent);
            color: var(--mat-sys-primary);
            border-radius: 4px;
            padding: 0 4px;
            font-weight: 600;
        }

        /* ── Live transcript area ────────────────────────────────────── */
        @keyframes rec-glow-pulse {
            0%, 100% { box-shadow: 0 0 0 0   color-mix(in srgb, var(--mat-sys-primary) 20%, transparent); }
            50%       { box-shadow: 0 0 0 4px color-mix(in srgb, var(--mat-sys-primary) 0%,  transparent); }
        }
        @keyframes rec-cursor-blink {
            0%, 100% { opacity: 1; }
            50%       { opacity: 0; }
        }
        .rec-transcript-area {
            margin-top: 7px;
            padding: 6px 10px;
            border-radius: 8px;
            border: 1px solid color-mix(in srgb, var(--mat-sys-primary) 30%, transparent);
            background: color-mix(in srgb, var(--mat-sys-primary) 5%, transparent);
            font-size: 12.5px;
            line-height: 1.5;
            min-height: 28px;
            word-break: break-word;
            animation: rec-glow-pulse 2s ease-in-out infinite;
        }
        .rec-transcript-final {
            color: var(--mat-sys-on-surface);
            opacity: 1;
        }
        .rec-transcript-interim {
            color: var(--mat-sys-on-surface-variant);
            font-style: italic;
            opacity: 0.55;
        }
        .rec-cursor {
            display: inline-block;
            color: var(--mat-sys-primary);
            font-weight: 700;
            animation: rec-cursor-blink 900ms step-start infinite;
            margin-left: 1px;
        }
        .rec-transcript-placeholder {
            color: var(--mat-sys-on-surface-variant);
            font-style: italic;
            opacity: 0.6;
            font-size: 12px;
        }

        /* ── Inline audio player ─────────────────────────────────────── */
        .audio-player-wrap {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 6px 4px 2px;
        }
        .audio-player-wrap audio {
            height: 32px;
            border-radius: 999px;
            outline: none;
            max-width: 220px;
            width: 100%;
            accent-color: var(--mat-sys-primary);
            filter: drop-shadow(0 1px 3px rgba(0,0,0,0.12));
        }
        .audio-player-wrap audio::-webkit-media-controls-panel {
            border-radius: 999px;
            background: color-mix(in srgb, var(--mat-sys-surface-container-high) 80%, transparent);
        }

        /* ── Reply preview banner ───────────────────────────────────── */
        .reply-preview-banner {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 16px;
            background: color-mix(in srgb, var(--mat-sys-primary-container) 35%, var(--mat-sys-surface-container));
            border-left: 3px solid var(--mat-sys-primary);
            flex-shrink: 0;
        }
        .rp-icon {
            font-size: 16px !important;
            width: 16px !important;
            height: 16px !important;
            color: var(--mat-sys-primary);
            flex-shrink: 0;
        }
        .rp-content {
            flex: 1;
            min-width: 0;
            display: flex;
            flex-direction: column;
            gap: 1px;
        }
        .rp-name {
            font-size: 11.5px;
            font-weight: 700;
            color: var(--mat-sys-primary);
        }
        .rp-text {
            font-size: 12px;
            color: var(--mat-sys-on-surface-variant);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .rp-close {
            border: none;
            background: transparent;
            padding: 3px;
            cursor: pointer;
            color: var(--mat-sys-on-surface-variant);
            display: flex;
            align-items: center;
            border-radius: 6px;
            transition: background 0.15s, color 0.15s;
            flex-shrink: 0;
        }
        .rp-close:hover { background: var(--mat-sys-surface-container-high); color: var(--mat-sys-on-surface); }

        /* ── Edit bar ───────────────────────────────────────────────── */
        .edit-bar {
            border-left: 3px solid var(--mat-sys-primary);
            background: color-mix(in srgb, var(--mat-sys-primary-container) 35%, var(--mat-sys-surface-container));
            flex-shrink: 0;
        }
        .edit-bar-header {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 16px 4px;
        }
        .edit-bar-label {
            flex: 1;
            font-size: 11.5px;
            font-weight: 700;
            color: var(--mat-sys-primary);
        }
        .edit-bar-input-row {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 0 8px 8px;
        }
        .edit-bar-field {
            flex: 1;
        }
        .edit-bar-field ::ng-deep .mat-mdc-form-field-subscript-wrapper { display: none; }

        /* ── Edited indicator ────────────────────────────────────────── */
        .msg-edited-label {
            font-size: 10px;
            font-style: italic;
            color: var(--mat-sys-on-surface-variant);
            margin-left: 4px;
            opacity: 0.75;
        }

        /* ── Voice message bubble ────────────────────────────────────── */
        .voice-bubble {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 9px 14px 9px 10px;
            border-radius: 24px;
            min-width: 200px;
            max-width: 280px;
            background: var(--mat-sys-surface-container);
            border: 1px solid var(--mat-sys-outline-variant);
        }
        .voice-bubble-own {
            background: linear-gradient(140deg,
                var(--mat-sys-primary-container) 0%,
                color-mix(in srgb, var(--mat-sys-primary-container) 50%, var(--mat-sys-tertiary-container)) 100%);
            border: none;
            box-shadow: 0 2px 10px color-mix(in srgb, var(--mat-sys-primary) 16%, transparent);
        }
        .vb-play-btn {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            border: none;
            background: var(--mat-sys-primary);
            color: var(--mat-sys-on-primary);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            flex-shrink: 0;
            padding: 0;
            transition: transform 0.15s cubic-bezier(0.34,1.56,0.64,1),
                        box-shadow 0.15s ease;
            box-shadow: 0 2px 8px color-mix(in srgb, var(--mat-sys-primary) 35%, transparent);
        }
        .vb-play-btn:hover {
            transform: scale(1.1);
            box-shadow: 0 4px 14px color-mix(in srgb, var(--mat-sys-primary) 45%, transparent);
        }
        .vb-waveform {
            display: flex;
            align-items: center;
            gap: 2px;
            flex: 1;
            height: 28px;
        }
        .vb-bar {
            width: 3px;
            border-radius: 3px;
            background: var(--mat-sys-primary);
            opacity: 0.6;
            animation: vb-wave 0.75s ease-in-out infinite alternate;
            animation-play-state: paused;
        }
        .voice-bubble-own .vb-bar {
            background: color-mix(in srgb, var(--mat-sys-primary) 70%, var(--mat-sys-on-surface));
            opacity: 0.75;
        }
        @keyframes vb-wave {
            from { transform: scaleY(0.25); opacity: 0.4; }
            to   { transform: scaleY(1);    opacity: 1;   }
        }
        .vb-time {
            font-size: 11px;
            font-weight: 600;
            font-variant-numeric: tabular-nums;
            color: var(--mat-sys-on-surface-variant);
            white-space: nowrap;
            min-width: 30px;
            text-align: right;
            letter-spacing: 0.02em;
        }
        .voice-bubble-own .vb-time { color: var(--mat-sys-on-surface); }

        /* ── Video recording experience ──────────────────────────────── */
        /* Two separate position:fixed elements.                         */
        /* top:50%+left:50%+translate(-50%,-50%) centers the card in    */
        /* the viewport regardless of any parent layout or sidebar.      */
        .vrc-backdrop-dark {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            z-index: 99998;
            background: rgba(0, 0, 0, 0.75);
        }
        .vrc-card-outer {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 99999;
            width: 640px;
            height: 420px;
        }
        .vrc-card-outer.vrc-card-outer-review {
            height: auto;
            max-height: 90vh;
        }
        /* In review mode the card must size to its content, not 100% of an auto parent */
        .vrc-card-outer.vrc-card-outer-review .vrc-card {
            height: auto;
        }
        @media (max-width: 680px) {
            .vrc-card-outer {
                top: 0;
                left: 0;
                transform: none;
                width: 100vw;
                height: 100dvh;
            }
        }
        .vrc-card {
            position: relative;
            width: 100%;
            height: 100%;
            border-radius: 20px;
            overflow: hidden;
            background: #0d0d0d;
            box-shadow: 0 24px 64px rgba(0,0,0,0.5);
            border: 1.5px solid color-mix(in srgb, var(--mat-sys-primary) 35%, transparent);
            animation: vrc-card-enter 350ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        @keyframes vrc-card-enter {
            from { transform: scale(0.85); opacity: 0; }
            to   { transform: scale(1);    opacity: 1; }
        }
        @keyframes vrc-card-exit {
            from { transform: scale(1);   opacity: 1; }
            to   { transform: scale(0.9); opacity: 0; }
        }

        /* camera feed */
        .vrc-camera {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
            transition: opacity 0.4s ease;
        }
        .vrc-camera-dim { opacity: 0.6; }

        /* overlays */
        .vrc-overlay {
            position: absolute;
            inset: 0;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            pointer-events: none;
        }
        .vrc-overlay > * { pointer-events: auto; }

        /* quality selector */
        .vrc-quality-row {
            display: flex;
            gap: 6px;
            justify-content: flex-end;
            padding: 14px 16px 0;
        }
        .vrc-quality-pill {
            border: 1.5px solid rgba(255,255,255,0.35);
            background: rgba(0,0,0,0.45);
            color: #fff;
            border-radius: 20px;
            padding: 3px 12px;
            font-size: 11px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.15s, border-color 0.15s, transform 0.15s cubic-bezier(0.34,1.56,0.64,1);
        }
        .vrc-quality-pill:hover { background: rgba(255,255,255,0.15); }
        .vrc-quality-active {
            background: var(--mat-sys-primary) !important;
            border-color: var(--mat-sys-primary) !important;
            color: var(--mat-sys-on-primary);
            transform: scale(1.06);
        }

        /* bottom preview actions */
        .vrc-preview-actions {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 24px;
            padding: 0 0 24px;
        }
        .vrc-side-btn {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            border: none;
            background: rgba(0,0,0,0.5);
            color: #fff;
            border-radius: 14px;
            padding: 10px 16px;
            font-size: 11px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.15s cubic-bezier(0.34,1.56,0.64,1), background 0.15s;
        }
        .vrc-side-btn mat-icon { font-size: 22px; width: 22px; height: 22px; }
        .vrc-side-btn:hover { background: rgba(255,255,255,0.18); transform: scale(1.06); }
        .vrc-side-btn-lg { padding: 12px 22px; font-size: 13px; }

        /* big red record button */
        .vrc-start-btn {
            width: 72px;
            height: 72px;
            border-radius: 50%;
            border: 3px solid rgba(255,255,255,0.8);
            background: #e53935;
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            animation: vrc-start-pulse 1.8s ease-in-out infinite;
            transition: transform 0.15s cubic-bezier(0.34,1.56,0.64,1);
            box-shadow: 0 0 0 0 rgba(229,57,53,0.6);
        }
        .vrc-start-btn mat-icon { font-size: 32px; width: 32px; height: 32px; }
        .vrc-start-btn:hover { transform: scale(1.1); animation: none; box-shadow: 0 0 24px rgba(229,57,53,0.7); }
        @keyframes vrc-start-pulse {
            0%,100% { box-shadow: 0 0 0 0 rgba(229,57,53,0.6); }
            50%      { box-shadow: 0 0 0 14px rgba(229,57,53,0); }
        }

        /* countdown overlay */
        .vrc-countdown-overlay {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .vrc-cd-num {
            font-size: 120px;
            font-weight: 900;
            line-height: 1;
            color: #fff;
            text-shadow: 0 4px 32px rgba(0,0,0,0.7);
            animation: vrc-cd-pop 0.9s cubic-bezier(0.34,1.56,0.64,1) both;
        }
        @keyframes vrc-cd-pop {
            0%   { transform: scale(2);   opacity: 0; }
            40%  { transform: scale(1);   opacity: 1; }
            85%  { transform: scale(1);   opacity: 1; }
            100% { transform: scale(0.5); opacity: 0; }
        }
        .vrc-cd-2 { color: #ffd54f; }
        .vrc-cd-1 { color: #ef5350; }
        .vrc-cd-go { font-size: 80px; color: var(--mat-sys-primary); }

        /* recording top bar */
        .vrc-rec-row {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 14px 16px 0;
        }
        .vrc-rec-badge-wrap {
            position: relative;
            width: 40px;
            height: 40px;
            flex-shrink: 0;
        }
        .vrc-progress-ring {
            position: absolute;
            inset: 0;
            width: 40px;
            height: 40px;
            transition: stroke-dashoffset 1s linear;
        }
        .vrc-rec-badge {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 2px;
        }
        .vrc-rec-dot-anim {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: #ff4444;
            animation: vrc-blink 1s step-start infinite;
        }
        @keyframes vrc-blink {
            0%, 100% { opacity: 1; }
            50%       { opacity: 0; }
        }
        .vrc-badge-text {
            font-size: 9px;
            font-weight: 800;
            color: #ff4444;
            letter-spacing: 0.08em;
        }
        .vrc-badge-paused { color: #ffb300; }
        .vrc-pause-icon { color: #ffb300; }
        .vrc-rec-dur {
            flex: 1;
            font-size: 14px;
            font-weight: 700;
            color: #fff;
            font-variant-numeric: tabular-nums;
            letter-spacing: 0.06em;
            text-shadow: 0 1px 4px rgba(0,0,0,0.8);
        }
        .vrc-x-btn {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            border: none;
            background: rgba(0,0,0,0.5);
            color: rgba(255,255,255,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: background 0.15s, transform 0.15s;
        }
        .vrc-x-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }
        .vrc-x-btn:hover { background: rgba(255,255,255,0.2); transform: scale(1.1); }

        /* audio waveform */
        .vrc-waveform {
            display: flex;
            align-items: flex-end;
            justify-content: center;
            gap: 3px;
            height: 48px;
            padding: 0 20px;
        }
        .vrc-audio-bar {
            width: 5px;
            min-height: 4px;
            border-radius: 3px;
            background: linear-gradient(to top, var(--mat-sys-primary), rgba(255,255,255,0.9));
            transition: height 0.05s ease;
        }

        /* recording bottom actions */
        .vrc-rec-actions {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 28px;
            padding: 0 0 24px;
        }
        .vrc-stop-btn {
            width: 64px;
            height: 64px;
            border-radius: 50%;
            border: 3px solid rgba(255,255,255,0.8);
            background: #e53935;
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: transform 0.15s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.15s;
        }
        .vrc-stop-btn mat-icon { font-size: 28px; width: 28px; height: 28px; }
        .vrc-stop-btn:hover { transform: scale(1.1); box-shadow: 0 0 24px rgba(229,57,53,0.7); }

        /* ── Review phase ────────────────────────────────────────── */
        /* position: relative (not absolute) so .vrc-card auto-height works */
        .vrc-review {
            position: relative;
            width: 100%;
            display: flex;
            flex-direction: column;
            background: #0d0d0d;
            border-radius: 20px;
            overflow: hidden;
        }

        /* video container */
        .vrc-review-video-wrap {
            position: relative;
            flex-shrink: 0;
            width: 100%;
            overflow: hidden;
            border-radius: 20px 20px 0 0;
            background: #000;
            line-height: 0;
        }
        .vrc-review-video {
            width: 100%;
            max-height: 360px;
            object-fit: cover;
            display: block;
        }
        /* cinematic fade at bottom of the video */
        .vrc-review-video-fade {
            position: absolute;
            bottom: 0; left: 0; right: 0;
            height: 72px;
            background: linear-gradient(to bottom, transparent, rgba(13,13,13,0.9));
            pointer-events: none;
        }

        /* caption input */
        .vrc-caption-input {
            flex-shrink: 0;
            background: rgba(255,255,255,0.07);
            border: none;
            border-top: 1px solid rgba(255,255,255,0.07);
            border-bottom: 1px solid rgba(255,255,255,0.06);
            color: #fff;
            padding: 16px 20px;
            font-size: 14px;
            outline: none;
            font-family: inherit;
            letter-spacing: 0.01em;
            transition: background 0.2s ease;
        }
        .vrc-caption-input:focus { background: rgba(255,255,255,0.10); }
        .vrc-caption-input::placeholder { color: rgba(255,255,255,0.32); font-style: italic; }

        /* actions bar */
        .vrc-review-actions {
            display: flex;
            flex-shrink: 0;
            align-items: center;
            gap: 12px;
            padding: 16px 20px 20px;
            background: #111;
            border-top: 1px solid rgba(255,255,255,0.06);
        }

        /* circular icon buttons (Re-record / Discard) */
        .vrc-rv-icon-btn {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 6px;
            border: none;
            background: transparent;
            color: rgba(255,255,255,0.75);
            font-size: 10px;
            font-weight: 600;
            letter-spacing: 0.02em;
            text-transform: uppercase;
            cursor: pointer;
            padding: 4px 6px;
            transition: transform 0.18s cubic-bezier(0.34,1.56,0.64,1), color 0.18s ease;
        }
        .vrc-rv-icon-btn:hover { transform: scale(1.08); color: #fff; }
        .vrc-rv-icon-circle {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: rgba(255,255,255,0.09);
            border: 1.5px solid rgba(255,255,255,0.16);
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.18s ease, border-color 0.18s ease,
                        box-shadow 0.18s ease;
        }
        .vrc-rv-icon-circle mat-icon { font-size: 22px; width: 22px; height: 22px; }
        .vrc-rv-icon-btn:hover .vrc-rv-icon-circle {
            background: rgba(255,255,255,0.18);
            border-color: rgba(255,255,255,0.32);
            box-shadow: 0 0 12px rgba(255,255,255,0.08);
        }

        /* discard = red accent */
        .vrc-rv-discard-btn { color: rgba(239,83,80,0.8); }
        .vrc-rv-discard-btn:hover { color: #ef5350; }
        .vrc-rv-discard-btn .vrc-rv-icon-circle {
            background: rgba(239,83,80,0.1);
            border-color: rgba(239,83,80,0.25);
        }
        .vrc-rv-discard-btn .vrc-rv-icon-circle mat-icon { color: #ef5350; }
        .vrc-rv-discard-btn:hover .vrc-rv-icon-circle {
            background: rgba(239,83,80,0.2);
            border-color: rgba(239,83,80,0.45);
            box-shadow: 0 0 14px rgba(239,83,80,0.2);
        }

        /* Send Video — pill button */
        .vrc-send-video-btn {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            border: none;
            border-radius: 50px;
            padding: 14px 24px;
            background: var(--mat-sys-primary);
            color: var(--mat-sys-on-primary);
            font-size: 14px;
            font-weight: 700;
            letter-spacing: 0.02em;
            cursor: pointer;
            transition: transform 0.18s cubic-bezier(0.34,1.56,0.64,1),
                        filter 0.18s ease,
                        box-shadow 0.18s ease;
            box-shadow: 0 4px 18px color-mix(in srgb, var(--mat-sys-primary) 45%, transparent);
        }
        .vrc-send-video-btn mat-icon { font-size: 20px; width: 20px; height: 20px; }
        .vrc-send-video-btn:hover {
            transform: scale(1.02);
            filter: brightness(1.12);
            box-shadow: 0 6px 24px color-mix(in srgb, var(--mat-sys-primary) 55%, transparent);
        }

        /* ── Input card dim when video recording overlay is active ──── */
        .input-card-video-recording {
            opacity: 0.45;
            pointer-events: none;
        }

        /* ── Video message bubble ─────────────────────────────────────── */
        .vvb-player-wrap {
            position: relative;
            width: 260px;
            border-radius: 12px;
            overflow: hidden;
            background: #000;
            box-shadow: 0 3px 14px rgba(0,0,0,0.3);
        }
        .vvb-video {
            width: 100%;
            max-height: 180px;
            object-fit: cover;
            display: block;
        }
        .vvb-overlay {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            background: rgba(0,0,0,0.18);
            transition: background 0.15s;
        }
        .vvb-overlay:hover { background: rgba(0,0,0,0.30); }
        .vvb-play-btn {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            border: none;
            background: rgba(255,255,255,0.88);
            color: #111;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            padding: 0;
            transition: transform 0.15s cubic-bezier(0.34,1.56,0.64,1),
                        box-shadow 0.15s;
            box-shadow: 0 2px 12px rgba(0,0,0,0.35);
        }
        .vvb-play-btn:hover { transform: scale(1.1); }
        .vvb-bottom-bar {
            padding: 5px 10px 7px;
            background: rgba(0,0,0,0.72);
        }
        .vvb-progress {
            height: 3px;
            border-radius: 3px;
            background: rgba(255,255,255,0.25);
            margin-bottom: 4px;
            overflow: hidden;
        }
        .vvb-progress-fill {
            height: 100%;
            border-radius: 3px;
            background: var(--mat-sys-primary);
            transition: width 0.25s linear;
        }
        .vvb-times {
            display: flex;
            justify-content: space-between;
        }
        .vvb-current,
        .vvb-duration {
            font-size: 10px;
            font-weight: 600;
            color: rgba(255,255,255,0.8);
            font-variant-numeric: tabular-nums;
        }

        /* ── Chat header accent bar ──────────────────────────────────── */
        .chat-header-accent-bar {
            height: 3px;
            margin: -8px -12px 8px;
            background: linear-gradient(90deg,
                var(--mat-sys-primary) 0%,
                var(--mat-sys-tertiary) 60%,
                transparent 100%);
            border-radius: 0 0 4px 0;
            opacity: 0.7;
        }

        /* ── Enhanced chat header depth ──────────────────────────────── */
        .chat-header {
            background: linear-gradient(135deg,
                var(--mat-sys-surface) 0%,
                color-mix(in srgb, var(--mat-sys-primary-container) 16%, var(--mat-sys-surface)) 100%) !important;
            border-bottom: 1px solid var(--mat-sys-outline-variant);
            box-shadow:
                0 1px 0 var(--mat-sys-outline-variant),
                0 4px 16px color-mix(in srgb, var(--mat-sys-primary) 6%, rgba(0,0,0,0.06));
        }

        /* ── No-room empty state ─────────────────────────────────────── */
        .chat-empty-title {
            font-size: 18px;
            font-weight: 800;
            background: linear-gradient(135deg, var(--mat-sys-primary), var(--mat-sys-tertiary));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin: 0 0 6px;
            letter-spacing: -0.01em;
        }
        .chat-empty-sub {
            font-size: 13px;
            color: var(--mat-sys-on-surface-variant);
            line-height: 1.6;
            margin: 0;
        }
        .chat-empty-hints {
            display: flex;
            flex-direction: column;
            gap: 8px;
            width: 100%;
            max-width: 260px;
        }
        .chat-empty-hint {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 14px;
            border-radius: 12px;
            background: var(--mat-sys-surface-container);
            border: 1px solid var(--mat-sys-outline-variant);
            font-size: 12.5px;
            color: var(--mat-sys-on-surface-variant);
            font-weight: 500;
            transition: background 0.18s, transform 0.18s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.18s;
        }
        .chat-empty-hint:hover {
            background: color-mix(in srgb, var(--mat-sys-primary-container) 30%, var(--mat-sys-surface-container));
            color: var(--mat-sys-on-surface);
            transform: translateX(4px);
            box-shadow: 0 2px 10px color-mix(in srgb, var(--mat-sys-primary) 10%, transparent);
        }
        .chat-empty-hint mat-icon {
            color: var(--mat-sys-primary);
            flex-shrink: 0;
        }

        /* ══════════════════════════════════════════════════════════════
           WhatsApp-style Left Column Redesign
        ══════════════════════════════════════════════════════════════ */

        /* ── Top bar ── */
        .wa-sidebar-top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 14px 12px 12px;
            border-bottom: 1px solid var(--mat-sys-outline-variant);
            background: linear-gradient(180deg,
                color-mix(in srgb, var(--mat-sys-primary-container) 18%, var(--mat-sys-surface-container-lowest)) 0%,
                var(--mat-sys-surface-container-lowest) 100%);
            flex-shrink: 0;
        }
        .wa-sidebar-top-left {
            display: flex;
            align-items: center;
            gap: 4px;
        }
        .wa-sidebar-title {
            font-size: 19px;
            font-weight: 800;
            letter-spacing: -0.02em;
            color: var(--mat-sys-on-surface);
        }
        .wa-sidebar-actions {
            display: flex;
            align-items: center;
            gap: 2px;
        }
        .wa-icon-btn {
            color: var(--mat-sys-on-surface-variant) !important;
            transition: color 0.15s, background 0.15s !important;
        }
        .wa-icon-btn:hover {
            color: var(--mat-sys-on-surface) !important;
            background: color-mix(in srgb, var(--mat-sys-primary) 10%, transparent) !important;
        }

        /* ── Search bar ── */
        .wa-search-wrap {
            padding: 8px 10px 6px;
            flex-shrink: 0;
        }
        .wa-search-box {
            display: flex;
            align-items: center;
            gap: 6px;
            background: var(--mat-sys-surface-container);
            border-radius: 24px;
            padding: 6px 10px 6px 12px;
            border: 1.5px solid transparent;
            transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
        }
        .wa-search-box:focus-within {
            border-color: var(--mat-sys-primary);
            background: var(--mat-sys-surface-container-low);
            box-shadow: 0 0 0 3px color-mix(in srgb, var(--mat-sys-primary) 12%, transparent);
        }
        .wa-search-icon {
            font-size: 18px !important;
            width: 18px !important;
            height: 18px !important;
            color: var(--mat-sys-on-surface-variant);
            flex-shrink: 0;
        }
        .wa-search-input {
            flex: 1;
            border: none;
            background: transparent;
            outline: none;
            font-size: 13.5px;
            color: var(--mat-sys-on-surface);
            font-family: inherit;
        }
        .wa-search-input::placeholder {
            color: var(--mat-sys-on-surface-variant);
            opacity: 0.8;
        }
        .wa-search-clear {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 20px;
            height: 20px;
            border: none;
            background: var(--mat-sys-surface-container-high);
            border-radius: 50%;
            cursor: pointer;
            color: var(--mat-sys-on-surface-variant);
            padding: 0;
            flex-shrink: 0;
            transition: background 0.15s, color 0.15s;
        }
        .wa-search-clear:hover {
            background: var(--mat-sys-outline-variant);
            color: var(--mat-sys-on-surface);
        }

        /* ── Filter chips row ── */
        .wa-chips-row {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 4px 10px 8px;
            overflow-x: auto;
            flex-shrink: 0;
            scrollbar-width: none;
        }
        .wa-chips-row::-webkit-scrollbar { display: none; }
        .wa-chip {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 5px 14px;
            border-radius: 20px;
            border: 1.5px solid var(--mat-sys-outline-variant);
            background: transparent;
            color: var(--mat-sys-on-surface-variant);
            font-size: 12.5px;
            font-weight: 500;
            cursor: pointer;
            white-space: nowrap;
            flex-shrink: 0;
            transition: background 0.18s, color 0.18s, border-color 0.18s, transform 0.18s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.18s;
        }
        .wa-chip:hover:not(.wa-chip-active) {
            background: var(--mat-sys-surface-container);
            border-color: var(--mat-sys-outline);
            color: var(--mat-sys-on-surface);
        }
        .wa-chip-active {
            background: var(--mat-sys-primary) !important;
            border-color: var(--mat-sys-primary) !important;
            color: var(--mat-sys-on-primary) !important;
            box-shadow: 0 2px 8px color-mix(in srgb, var(--mat-sys-primary) 35%, transparent);
            transform: scale(1.04);
        }
        .wa-chip-badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 16px;
            height: 16px;
            border-radius: 8px;
            background: rgba(255,255,255,0.30);
            color: inherit;
            font-size: 10px;
            font-weight: 700;
            padding: 0 4px;
        }
        .wa-chip-active .wa-chip-badge {
            background: rgba(255,255,255,0.35);
        }

        /* ── Room list scroll container ── */
        .wa-rooms-scroll {
            flex: 1;
            min-height: 0;
            overflow-y: auto;
            scrollbar-width: thin;
            scrollbar-color: color-mix(in srgb, var(--mat-sys-primary) 35%, transparent) transparent;
        }
        .wa-rooms-scroll::-webkit-scrollbar { width: 4px; }
        .wa-rooms-scroll::-webkit-scrollbar-track { background: transparent; }
        .wa-rooms-scroll::-webkit-scrollbar-thumb {
            background: color-mix(in srgb, var(--mat-sys-primary) 35%, transparent);
            border-radius: 4px;
            transition: background 0.2s ease;
        }
        .wa-rooms-scroll::-webkit-scrollbar-thumb:hover {
            background: color-mix(in srgb, var(--mat-sys-primary) 65%, transparent);
        }

        /* ── Section divider ── */
        .wa-section-header {
            padding: 10px 16px 4px;
            display: flex;
            align-items: center;
        }
        .wa-section-label {
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.07em;
            color: var(--mat-sys-on-surface-variant);
            opacity: 0.6;
        }

        /* ── Room item ── */
        .wa-room-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px 12px 10px 14px;
            cursor: pointer;
            position: relative;
            transition: background 0.15s ease;
            animation: wa-item-enter 0.32s cubic-bezier(0.34,1.56,0.64,1) both;
            animation-delay: var(--wa-item-delay, 0ms);
        }
        @keyframes wa-item-enter {
            from { transform: translateY(8px); opacity: 0; }
            to   { transform: translateY(0);   opacity: 1; }
        }
        .wa-room-item::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 72px;
            right: 0;
            height: 1px;
            background: var(--mat-sys-outline-variant);
            opacity: 0.5;
        }
        .wa-room-item:hover {
            background: color-mix(in srgb, var(--mat-sys-on-surface) 4%, transparent);
        }
        .wa-room-active {
            background: color-mix(in srgb, var(--mat-sys-primary-container) 55%, var(--mat-sys-surface-container-lowest)) !important;
        }
        .wa-room-active:hover {
            background: color-mix(in srgb, var(--mat-sys-primary-container) 65%, var(--mat-sys-surface-container-lowest)) !important;
        }
        .wa-room-active::before {
            content: '';
            position: absolute;
            left: 0; top: 10%; bottom: 10%;
            width: 3px;
            border-radius: 0 3px 3px 0;
            background: var(--mat-sys-primary);
        }

        /* ── Avatar ── */
        .wa-avatar {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            font-weight: 800;
            color: #fff;
            flex-shrink: 0;
            letter-spacing: -0.5px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.18);
            transition: transform 0.18s cubic-bezier(0.34,1.56,0.64,1);
            user-select: none;
        }
        .wa-room-item:hover .wa-avatar {
            transform: scale(1.06);
        }

        /* ── Content column ── */
        .wa-room-content {
            flex: 1;
            min-width: 0;
            display: flex;
            flex-direction: column;
            gap: 3px;
        }
        .wa-room-top-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 6px;
        }
        .wa-room-name {
            font-size: 14px;
            font-weight: 600;
            color: var(--mat-sys-on-surface);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            flex: 1;
            min-width: 0;
            letter-spacing: -0.01em;
        }
        .wa-room-active .wa-room-name {
            color: var(--mat-sys-primary);
        }
        .wa-room-type-tag {
            display: flex;
            align-items: center;
            flex-shrink: 0;
            color: var(--mat-sys-on-surface-variant);
        }
        .wa-room-type-tag-unread {
            color: var(--mat-sys-primary);
        }
        .wa-type-icon {
            font-size: 14px !important;
            width: 14px !important;
            height: 14px !important;
        }
        .wa-room-bottom-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 6px;
        }
        .wa-room-preview {
            font-size: 12.5px;
            color: var(--mat-sys-on-surface-variant);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            flex: 1;
            min-width: 0;
        }
        .wa-room-active .wa-room-preview {
            color: color-mix(in srgb, var(--mat-sys-primary) 60%, var(--mat-sys-on-surface-variant));
        }

        /* ── Unread badge ── */
        .wa-unread-badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 20px;
            height: 20px;
            border-radius: 10px;
            background: var(--mat-sys-primary);
            color: var(--mat-sys-on-primary);
            font-size: 11px;
            font-weight: 700;
            padding: 0 5px;
            flex-shrink: 0;
        }

        /* ── Three-dot manager actions (visible on hover) ── */
        .wa-room-actions {
            display: flex;
            align-items: center;
            opacity: 0;
            flex-shrink: 0;
            transition: opacity 0.15s;
        }
        .wa-room-item:hover .wa-room-actions {
            opacity: 1;
        }
        .wa-room-active .wa-room-actions {
            opacity: 1;
        }
        .wa-action-btn {
            width: 28px !important;
            height: 28px !important;
            line-height: 28px !important;
            color: var(--mat-sys-on-surface-variant) !important;
            transition: color 0.15s, background 0.15s !important;
        }
        .wa-action-btn:hover {
            color: var(--mat-sys-on-surface) !important;
            background: var(--mat-sys-surface-container-high) !important;
        }

        /* ── Translation feature ────────────────────────────────────── */
        @keyframes translate-spin {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
        }
        @keyframes translation-border-pulse {
            0%   { box-shadow: 0 0 0 0 color-mix(in srgb, var(--mat-sys-primary) 45%, transparent); }
            50%  { box-shadow: 0 0 0 4px color-mix(in srgb, var(--mat-sys-primary) 0%, transparent); }
            100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--mat-sys-primary) 0%, transparent); }
        }

        .translate-icon-spin {
            animation: translate-spin 1s linear infinite;
        }

        /* Wrap around msg-text to hold loading overlay */
        .msg-text-wrap {
            position: relative;
        }
        .msg-text-loading .msg-text {
            opacity: 0.3;
            transition: opacity 0.25s ease;
        }
        .translate-bubble-overlay {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            pointer-events: none;
        }
        .translate-bubble-overlay .translate-spin-icon {
            font-size: 22px;
            width: 22px;
            height: 22px;
            color: var(--mat-sys-primary);
            animation: translate-spin 1s linear infinite;
        }

        /* "Translating…" label below bubble */
        .translate-loading-label {
            font-size: 11px;
            font-style: italic;
            color: var(--mat-sys-on-surface-variant);
            margin-top: 4px;
            margin-bottom: 2px;
            opacity: 0.8;
            animation: fadeInDown 0.25s ease;
        }
        @keyframes fadeInDown {
            from { opacity: 0; transform: translateY(-4px); }
            to   { opacity: 0.8; transform: translateY(0); }
        }

        /* Translation pill indicator */
        .translation-pill-wrap {
            display: flex;
            align-items: center;
            gap: 6px;
            margin-top: 4px;
            flex-wrap: nowrap;
        }
        .translation-pill-wrap.my-msg {
            justify-content: flex-end;
        }
        .translation-pill-badge {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            padding: 3px 10px 3px 8px;
            border-radius: 20px;
            background: color-mix(in srgb, var(--mat-sys-primary) 10%, var(--mat-sys-surface));
            border: 1.5px solid color-mix(in srgb, var(--mat-sys-primary) 35%, transparent);
            animation: translation-border-pulse 2.4s ease-in-out infinite;
            font-size: 11.5px;
            white-space: nowrap;
            line-height: 1;
        }
        .translation-pill-globe {
            font-size: 12px;
            line-height: 1;
        }
        .translation-pill-text {
            color: var(--mat-sys-primary);
            font-weight: 600;
            font-size: 11px;
            letter-spacing: 0.01em;
        }
        .translation-show-orig-btn {
            background: none;
            border: none;
            padding: 2px 4px;
            cursor: pointer;
            font-size: 11px;
            font-weight: 600;
            color: var(--mat-sys-primary);
            opacity: 0.75;
            border-radius: 4px;
            transition: opacity 0.15s, background 0.15s;
            white-space: nowrap;
        }
        .translation-show-orig-btn:hover {
            opacity: 1;
            background: color-mix(in srgb, var(--mat-sys-primary) 10%, transparent);
        }

        /* Tiny 🌐 globe in room list preview */
        .wa-translated-globe {
            font-size: 11px;
            margin-right: 2px;
            line-height: 1;
            opacity: 0.7;
        }

        /* ── Scheduled Messages ─────────────────────────────────── */
        @keyframes schedItemFadeIn {
            from { transform: translateY(10px); opacity: 0; }
            to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes schedPulse {
            0%, 100% { opacity: 0.5; transform: scale(1); }
            50%       { opacity: 1;   transform: scale(1.06); }
        }

        /* Split send button */
        .send-split {
            display: flex;
            align-items: stretch;
            border-radius: 50px;
        }
        .send-split-disabled {
            opacity: 0.5;
            pointer-events: none;
        }
        .send-fab-main {
            border-radius: 50px 0 0 50px !important;
            padding-right: 10px !important;
        }
        .send-fab-arrow {
            border-radius: 0 50px 50px 0 !important;
            padding-left: 4px !important;
            padding-right: 4px !important;
            border-left: 1px solid rgba(255,255,255,0.25) !important;
            min-width: 28px !important;
        }

        /* Slide-up schedule panel */
        .schedule-panel {
            background: var(--mat-sys-surface-container);
            border: 1px solid var(--mat-sys-outline-variant);
            border-radius: 14px;
            margin-bottom: 8px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        .schedule-panel-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 14px 8px;
            border-bottom: 1px solid var(--mat-sys-outline-variant);
            background: var(--mat-sys-surface-container-high);
        }
        .schedule-panel-body {
            padding: 14px;
        }

        /* Recurrence pills */
        .sched-recurrence-row {
            display: flex;
            gap: 6px;
            flex-wrap: wrap;
            margin-bottom: 6px;
        }
        .sched-pill {
            padding: 4px 12px;
            border-radius: 20px;
            border: 1.5px solid var(--mat-sys-outline-variant);
            background: var(--mat-sys-surface);
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            transition: background 0.15s, border-color 0.15s, color 0.15s;
            color: var(--mat-sys-on-surface-variant);
        }
        .sched-pill-active {
            background: var(--mat-sys-primary) !important;
            border-color: var(--mat-sys-primary) !important;
            color: var(--mat-sys-on-primary) !important;
        }
        .sched-day-pill {
            padding: 3px 9px;
            font-size: 11px;
        }

        /* Scheduled side panel */
        .sched-panel {
            width: 320px;
        }
        .sched-item {
            padding: 10px 14px;
            border-bottom: 1px solid var(--mat-sys-outline-variant);
            animation: schedItemFadeIn 220ms cubic-bezier(0.34,1.56,0.64,1) both;
        }
        .sched-item:last-child { border-bottom: none; }
        .sched-item-preview {
            font-size: 12.5px;
            font-weight: 500;
            color: var(--mat-sys-on-surface);
            margin-bottom: 5px;
            line-height: 1.4;
        }
        .sched-item-meta {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 3px;
        }
        .sched-date {
            font-size: 11px;
            color: var(--mat-sys-on-surface-variant);
        }
        .sched-chip {
            font-size: 10px;
            font-weight: 700;
            color: #fff;
            padding: 2px 7px;
            border-radius: 10px;
            letter-spacing: 0.3px;
        }
        .sched-item-countdown {
            font-size: 11px;
            font-weight: 600;
            color: var(--mat-sys-primary);
            margin-bottom: 4px;
        }
        .sched-item-actions {
            display: flex;
            gap: 4px;
            justify-content: flex-end;
        }
        .sched-empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 32px 16px;
            text-align: center;
            color: var(--mat-sys-on-surface-variant);
        }
        .sched-empty-icon {
            font-size: 56px !important;
            width: 56px !important;
            height: 56px !important;
            margin-bottom: 12px;
            animation: schedPulse 2.5s ease-in-out infinite;
            color: var(--mat-sys-outline);
        }
        .sched-empty p { font-size: 13px; margin: 0; }

        /* ══ MEETING STATUS ══════════════════════════════════════════ */
        @keyframes meeting-live-pulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(22,163,74,0.45); }
            50%       { box-shadow: 0 0 0 8px rgba(22,163,74,0); }
        }
        @keyframes meeting-glow-room {
            0%, 100% { box-shadow: 0 0 0 0 rgba(22,163,74,0.35), 0 2px 10px color-mix(in srgb,var(--mat-sys-primary) 25%,transparent); }
            50%       { box-shadow: 0 0 0 8px rgba(22,163,74,0), 0 4px 18px rgba(22,163,74,0.35); }
        }
        .wa-meeting-dot {
            display: inline-block;
            width: 8px; height: 8px;
            border-radius: 50%;
            background: var(--mat-sys-outline-variant);
            flex-shrink: 0;
            margin-right: 2px;
        }
        .wa-meeting-dot-live {
            background: #16a34a;
            animation: meeting-live-pulse 1.8s ease-in-out infinite;
        }
        .wa-meeting-dot-soon { background: #f59e0b; }
        .wa-meeting-dot-ended { background: var(--mat-sys-outline-variant); opacity: 0.5; }
        .wa-avatar-meeting-live {
            animation: meeting-glow-room 2s ease-in-out infinite;
        }

        /* ── Meeting status banner ── */
        .meeting-status-banner {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 11.5px;
            font-weight: 600;
            padding: 5px 12px 5px 48px;
            background: color-mix(in srgb, var(--mat-sys-surface-container-high) 80%, transparent);
            border-top: 1px solid var(--mat-sys-outline-variant);
            color: var(--mat-sys-on-surface-variant);
            flex-wrap: wrap;
        }
        .meeting-status-live {
            background: color-mix(in srgb, #16a34a 10%, var(--mat-sys-surface));
            color: #16a34a;
            border-top-color: rgba(22,163,74,0.2);
            animation: meeting-live-pulse 2s ease-in-out infinite;
        }
        .meeting-status-soon {
            background: color-mix(in srgb, #f59e0b 10%, var(--mat-sys-surface));
            color: #b45309;
            border-top-color: rgba(245,158,11,0.2);
        }
        .meeting-status-ended {
            opacity: 0.6;
        }
        .meeting-banner-icon {
            font-size: 14px !important;
            width: 14px !important;
            height: 14px !important;
        }
        .meeting-live-dot {
            width: 8px; height: 8px;
            border-radius: 50%;
            background: #16a34a;
            animation: meeting-live-pulse 1.5s ease-in-out infinite;
            flex-shrink: 0;
        }
        .meeting-live-badge {
            font-size: 9px;
            font-weight: 800;
            letter-spacing: 0.1em;
            color: #fff;
            background: #16a34a;
            border-radius: 4px;
            padding: 1px 5px;
        }
        .meeting-join-btn {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 4px 10px;
            border-radius: 20px;
            border: none;
            background: var(--mat-sys-primary);
            color: var(--mat-sys-on-primary);
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            margin-left: 4px;
            transition: filter 0.15s, transform 0.15s cubic-bezier(0.34,1.56,0.64,1);
        }
        .meeting-join-btn:hover { filter: brightness(1.1); transform: scale(1.04); }

        /* ══ AGENDA PANEL ════════════════════════════════════════════ */
        .agenda-panel {
            border-top: 3px solid var(--mat-sys-primary) !important;
        }
        .agenda-date-row {
            display: flex;
            align-items: center;
            gap: 5px;
            font-size: 11.5px;
            color: var(--mat-sys-on-surface-variant);
            padding: 6px 14px;
            border-bottom: 1px solid var(--mat-sys-outline-variant);
            background: color-mix(in srgb, var(--mat-sys-primary-container) 8%, var(--mat-sys-surface-container-lowest));
        }
        .agenda-join-btn {
            display: inline-flex;
            align-items: center;
            gap: 3px;
            margin-left: auto;
            padding: 3px 8px;
            border-radius: 12px;
            border: none;
            background: var(--mat-sys-primary);
            color: var(--mat-sys-on-primary);
            font-size: 11px;
            font-weight: 600;
            cursor: pointer;
            transition: filter 0.15s;
        }
        .agenda-join-btn:hover { filter: brightness(1.1); }
        .agenda-progress-wrap {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 14px;
            border-bottom: 1px solid var(--mat-sys-outline-variant);
        }
        .agenda-progress-bar {
            flex: 1;
            height: 5px;
            border-radius: 3px;
            background: var(--mat-sys-outline-variant);
            overflow: hidden;
        }
        .agenda-progress-fill {
            height: 100%;
            border-radius: 3px;
            background: linear-gradient(90deg, var(--mat-sys-primary), var(--mat-sys-tertiary));
            transition: width 0.45s cubic-bezier(0.34,1.56,0.64,1);
        }
        .agenda-progress-label {
            font-size: 11px;
            font-weight: 600;
            color: var(--mat-sys-on-surface-variant);
            white-space: nowrap;
        }
        .agenda-item {
            display: flex;
            align-items: flex-start;
            gap: 8px;
            padding: 10px 14px;
            border-bottom: 1px solid var(--mat-sys-outline-variant);
            transition: background 0.15s, opacity 0.25s;
        }
        .agenda-item:hover { background: color-mix(in srgb, var(--mat-sys-surface-container-high) 50%, transparent); }
        .agenda-item-done { opacity: 0.55; }
        .agenda-item-done .agenda-item-title { text-decoration: line-through; }
        .agenda-checkbox { flex-shrink: 0; margin-top: 1px; }
        .agenda-item-content { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
        .agenda-item-title {
            font-size: 13px;
            font-weight: 600;
            color: var(--mat-sys-on-surface);
            line-height: 1.4;
        }
        .agenda-item-duration {
            display: inline-block;
            font-size: 10.5px;
            font-weight: 600;
            color: var(--mat-sys-on-surface-variant);
            background: var(--mat-sys-surface-container-high);
            border-radius: 6px;
            padding: 1px 6px;
            width: fit-content;
        }
        .agenda-empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 40px 20px;
            text-align: center;
        }
        .agenda-empty-icon {
            font-size: 44px !important;
            width: 44px !important;
            height: 44px !important;
            color: var(--mat-sys-outline-variant);
            margin-bottom: 12px;
            animation: icon-float 3.5s ease-in-out infinite;
        }
        .agenda-empty-title {
            font-size: 14px;
            font-weight: 700;
            color: var(--mat-sys-on-surface);
            margin: 0 0 4px;
        }
        .agenda-empty-sub {
            font-size: 12px;
            color: var(--mat-sys-on-surface-variant);
            margin: 0;
        }
        .agenda-add-form {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 10px 12px;
            border-top: 1px solid var(--mat-sys-outline-variant);
            background: var(--mat-sys-surface-container-lowest);
            flex-shrink: 0;
        }
        .agenda-add-input { flex: 1; }
        .agenda-duration-input {
            width: 52px;
            padding: 6px 8px;
            border: 1.5px solid var(--mat-sys-outline-variant);
            border-radius: 8px;
            background: var(--mat-sys-surface-container);
            color: var(--mat-sys-on-surface);
            font-size: 12px;
            text-align: center;
            outline: none;
            transition: border-color 0.15s;
            flex-shrink: 0;
        }
        .agenda-duration-input:focus { border-color: var(--mat-sys-primary); }
        .agenda-add-btn {
            width: 36px; height: 36px;
            border-radius: 10px;
            border: none;
            background: var(--mat-sys-primary);
            color: var(--mat-sys-on-primary);
            display: flex; align-items: center; justify-content: center;
            cursor: pointer;
            flex-shrink: 0;
            transition: filter 0.15s, transform 0.15s cubic-bezier(0.34,1.56,0.64,1);
        }
        .agenda-add-btn:hover:not(:disabled) { filter: brightness(1.1); transform: scale(1.06); }
        .agenda-add-btn:disabled { opacity: 0.45; cursor: not-allowed; }

        /* ── Meeting link card ─────────────────────────────────────── */
        .meeting-link-card {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            background: color-mix(in srgb, #4caf50 6%, var(--mat-sys-surface-container));
            border: 1px solid color-mix(in srgb, #4caf50 25%, var(--mat-sys-outline-variant));
            border-radius: 10px;
            padding: 8px 12px;
            margin-top: 8px;
            transition: box-shadow 0.3s, border-color 0.3s;
        }
        .meeting-link-card-live {
            border-color: #4caf50 !important;
            animation: meeting-card-pulse 2.5s ease-in-out infinite;
        }
        @keyframes meeting-card-pulse {
            0%,100% { box-shadow: 0 0 0 0 rgba(76,175,80,0.25); }
            50%      { box-shadow: 0 0 0 6px rgba(76,175,80,0); }
        }
        .meeting-link-card-ended {
            opacity: 0.6;
            border-color: var(--mat-sys-outline-variant) !important;
        }
        .meeting-link-card-left {
            display: flex;
            align-items: flex-start;
            gap: 8px;
            flex: 1;
            min-width: 0;
        }
        .meeting-link-icon {
            color: #4caf50;
            flex-shrink: 0;
            font-size: 20px !important;
            width: 20px !important;
            height: 20px !important;
            margin-top: 1px;
        }
        .meeting-link-info {
            display: flex;
            flex-direction: column;
            min-width: 0;
        }
        .meeting-link-status {
            font-size: 11.5px;
            font-weight: 600;
            color: var(--mat-sys-on-surface);
            white-space: nowrap;
        }
        .meeting-link-status-live { color: #4caf50; }
        .meeting-link-status-soon { color: #f59e0b; }
        .meeting-link-url-text {
            font-size: 10.5px;
            color: var(--mat-sys-on-surface-variant);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            max-width: 260px;
        }
        .meeting-link-card-right {
            display: flex;
            align-items: center;
            gap: 4px;
            flex-shrink: 0;
        }
        .meeting-link-join-btn {
            height: 30px !important;
            font-size: 12px !important;
            background: #4caf50 !important;
            color: #fff !important;
            border-radius: 8px !important;
            display: flex !important;
            align-items: center !important;
            gap: 3px !important;
        }
        .meeting-link-copy-btn {
            width: 30px !important;
            height: 30px !important;
            line-height: 30px !important;
            color: var(--mat-sys-on-surface-variant) !important;
        }

        /* ── Meeting Calendar Overlay ─────────────────────────────── */
        .meeting-cal-overlay {
            position: fixed;
            inset: 0;
            z-index: 9000;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .meeting-cal-overlay-backdrop {
            position: absolute;
            inset: 0;
            background: rgba(0,0,0,0.5);
            backdrop-filter: blur(4px);
        }
        .meeting-cal-overlay-panel {
            position: relative;
            z-index: 1;
            width: 90vw;
            max-width: 900px;
            max-height: 88vh;
            background: var(--mat-sys-surface);
            border-radius: 20px;
            box-shadow: 0 24px 80px rgba(0,0,0,0.28);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            animation: cal-panel-enter 300ms cubic-bezier(0.34,1.56,0.64,1) forwards;
        }
        @keyframes cal-panel-enter {
            from { transform: scale(0.95); opacity: 0; }
            to   { transform: scale(1);    opacity: 1; }
        }
        .meeting-cal-overlay-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 20px 24px 16px;
            border-bottom: 1px solid var(--mat-sys-outline-variant);
            flex-shrink: 0;
        }
        .meeting-cal-overlay-title {
            font-size: 18px;
            font-weight: 700;
            letter-spacing: -0.02em;
            margin: 0 0 2px;
            display: flex;
            align-items: center;
        }
        .meeting-cal-overlay-sub {
            font-size: 12.5px;
            color: var(--mat-sys-on-surface-variant);
            margin: 0;
        }
        .meeting-cal-overlay-body {
            display: grid;
            grid-template-columns: 1fr 280px;
            gap: 0;
            flex: 1;
            overflow: hidden;
        }
        @media (max-width: 640px) {
            .meeting-cal-overlay-body { grid-template-columns: 1fr; }
        }
        /* Calendar grid column */
        .meeting-cal-grid-col {
            padding: 16px 20px;
            display: flex;
            flex-direction: column;
            overflow-y: auto;
        }
        .meeting-cal-nav {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 12px;
        }
        .meeting-cal-nav-label {
            font-size: 15px;
            font-weight: 700;
            letter-spacing: -0.01em;
        }
        .meeting-cal-nav-btn {
            width: 32px !important;
            height: 32px !important;
        }
        .meeting-cal-dow-row {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            margin-bottom: 4px;
        }
        .meeting-cal-dow {
            text-align: center;
            font-size: 10.5px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: var(--mat-sys-on-surface-variant);
            padding: 4px 0;
            opacity: 0.6;
        }
        .meeting-cal-day-grid {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            gap: 2px;
            flex: 1;
        }
        .meeting-cal-cell {
            min-height: 72px;
            border-radius: 8px;
            padding: 4px;
            border: 1px solid transparent;
            display: flex;
            flex-direction: column;
            gap: 2px;
            cursor: default;
            transition: background 0.15s;
        }
        .meeting-cal-cell:hover { background: var(--mat-sys-surface-container); }
        .meeting-cal-cell-today {
            border-color: var(--mat-sys-primary) !important;
            background: color-mix(in srgb, var(--mat-sys-primary-container) 20%, var(--mat-sys-surface));
        }
        .meeting-cal-cell-other-month { opacity: 0.35; }
        .meeting-cal-cell-num {
            font-size: 12px;
            font-weight: 500;
            color: var(--mat-sys-on-surface-variant);
            padding: 0 2px;
            line-height: 1.6;
        }
        .meeting-cal-cell-num-today {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 22px;
            height: 22px;
            border-radius: 50%;
            background: var(--mat-sys-primary);
            color: #fff !important;
            font-weight: 700;
            font-size: 11px;
        }
        .meeting-cal-event-dot {
            border: none;
            border-radius: 4px;
            padding: 1px 5px;
            font-size: 10px;
            font-weight: 500;
            cursor: pointer;
            text-align: left;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            max-width: 100%;
            background: color-mix(in srgb, var(--mat-sys-primary) 15%, var(--mat-sys-surface-container));
            color: var(--mat-sys-primary);
            transition: background 0.15s;
        }
        .meeting-cal-event-dot:hover { background: color-mix(in srgb, var(--mat-sys-primary) 25%, var(--mat-sys-surface-container)); }
        .meeting-cal-event-live { background: rgba(76,175,80,0.18) !important; color: #388e3c !important; }
        .meeting-cal-event-soon { background: rgba(245,158,11,0.18) !important; color: #b45309 !important; }
        .meeting-cal-event-ended { opacity: 0.5; }
        /* Detail column */
        .meeting-cal-detail-col {
            border-left: 1px solid var(--mat-sys-outline-variant);
            padding: 20px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
        }
        .meeting-cal-detail-empty {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: var(--mat-sys-on-surface-variant);
            text-align: center;
        }
        .meeting-cal-detail-empty p { font-size: 13px; margin: 0; }
        .meeting-cal-detail { display: flex; flex-direction: column; gap: 10px; }
        .meeting-cal-detail-status {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            background: var(--mat-sys-surface-container);
            color: var(--mat-sys-on-surface-variant);
            border-radius: 12px;
            padding: 3px 10px;
            align-self: flex-start;
        }
        .meeting-cal-detail-status-live { background: rgba(76,175,80,0.15); color: #388e3c; }
        .meeting-cal-detail-status-soon { background: rgba(245,158,11,0.15); color: #b45309; }
        .meeting-cal-detail-status-ended { opacity: 0.5; }
        .meeting-cal-detail-title {
            font-size: 17px;
            font-weight: 700;
            letter-spacing: -0.02em;
            margin: 0;
            line-height: 1.3;
        }
        .meeting-cal-detail-desc {
            font-size: 12.5px;
            color: var(--mat-sys-on-surface-variant);
            margin: 0;
            line-height: 1.5;
        }
        .meeting-cal-detail-row {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 12.5px;
            color: var(--mat-sys-on-surface);
        }
        .meeting-cal-join-btn {
            background: var(--mat-sys-primary) !important;
            color: var(--mat-sys-on-primary) !important;
            border-radius: 10px !important;
            height: 36px !important;
            font-size: 13px !important;
            font-weight: 600 !important;
            display: flex !important;
            align-items: center !important;
            gap: 4px !important;
        }
        .meeting-cal-members-row {
            display: flex;
            align-items: center;
            gap: -4px;
        }
        .meeting-cal-member-av {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            font-size: 10px;
            font-weight: 700;
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid var(--mat-sys-surface);
            margin-right: -6px;
            flex-shrink: 0;
        }
        .meeting-cal-member-more {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background: var(--mat-sys-surface-container-high);
            font-size: 10px;
            font-weight: 700;
            color: var(--mat-sys-on-surface-variant);
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid var(--mat-sys-surface);
            margin-right: -6px;
        }
        .meeting-cal-open-room-btn {
            border-radius: 10px !important;
            height: 34px !important;
            font-size: 12px !important;
            display: flex !important;
            align-items: center !important;
            gap: 4px !important;
            margin-top: auto;
        }

    `],
    animations: [
        trigger('pillEnter', [
            transition(':enter', [
                style({ transform: 'scale(0.55)', opacity: 0 }),
                animate('220ms cubic-bezier(0.34,1.56,0.64,1)',
                    style({ transform: 'scale(1)', opacity: 1 })),
            ]),
        ]),
        trigger('paletteEnter', [
            transition(':enter', [
                style({ transform: 'scale(0.8) translateY(6px)', opacity: 0 }),
                animate('190ms cubic-bezier(0.34,1.56,0.64,1)',
                    style({ transform: 'scale(1) translateY(0)', opacity: 1 })),
            ]),
            transition(':leave', [
                animate('120ms cubic-bezier(0.4,0,1,1)',
                    style({ transform: 'scale(0.82) translateY(6px)', opacity: 0 })),
            ]),
        ]),
        trigger('pinBannerEnter', [
            transition(':enter', [
                style({ transform: 'translateY(-100%)', opacity: 0 }),
                animate('280ms cubic-bezier(0.34,1.56,0.64,1)',
                    style({ transform: 'translateY(0)', opacity: 1 })),
            ]),
            transition(':leave', [
                animate('180ms ease-in',
                    style({ transform: 'translateY(-100%)', opacity: 0 })),
            ]),
        ]),
        trigger('pinChevron', [
            state('closed', style({ transform: 'rotate(0deg)' })),
            state('open',   style({ transform: 'rotate(90deg)' })),
            transition('closed <=> open', animate('220ms cubic-bezier(0.4,0,0.2,1)')),
        ]),
        trigger('pinnedPanelSlide', [
            transition(':enter', [
                style({ transform: 'translateX(100%)', opacity: 0 }),
                animate('300ms cubic-bezier(0.34,1.56,0.64,1)',
                    style({ transform: 'translateX(0)', opacity: 1 })),
            ]),
            transition(':leave', [
                animate('200ms cubic-bezier(0.4,0,1,1)',
                    style({ transform: 'translateX(100%)', opacity: 0 })),
            ]),
        ]),
        trigger('ppItemEnter', [
            transition(':enter', [
                style({ transform: 'translateX(20px)', opacity: 0 }),
                animate('240ms cubic-bezier(0.34,1.56,0.64,1)',
                    style({ transform: 'translateX(0)', opacity: 1 })),
            ]),
        ]),
        trigger('ctxMenuEnter', [
            transition(':enter', [
                style({ transform: 'scale(0.88) translateY(-6px)', opacity: 0 }),
                animate('160ms cubic-bezier(0.34,1.56,0.64,1)',
                    style({ transform: 'scale(1) translateY(0)', opacity: 1 })),
            ]),
            transition(':leave', [
                animate('100ms ease-in',
                    style({ transform: 'scale(0.88) translateY(-4px)', opacity: 0 })),
            ]),
        ]),
        trigger('pinBadgeEnter', [
            transition(':enter', [
                style({ transform: 'scale(0) rotate(-45deg)', opacity: 0 }),
                animate('350ms cubic-bezier(0.34,1.56,0.64,1)',
                    style({ transform: 'scale(1) rotate(0deg)', opacity: 1 })),
            ]),
        ]),
        trigger('msgSlideIn', [
            transition(':enter', [
                style({ transform: 'translateY(12px)', opacity: 0 }),
                animate('250ms cubic-bezier(0.34,1.56,0.64,1)',
                    style({ transform: 'translateY(0)', opacity: 1 })),
            ]),
        ]),
        trigger('channelItemEnter', [
            transition(':enter', [
                style({ transform: 'translateX(-16px)', opacity: 0 }),
                animate('250ms cubic-bezier(0.34,1.56,0.64,1)',
                    style({ transform: 'translateX(0)', opacity: 1 })),
            ]),
            transition(':leave', [
                animate('220ms cubic-bezier(0.4,0,1,1)',
                    style({ transform: 'translateX(-24px)', opacity: 0, height: 0, marginBottom: 0 })),
            ]),
        ]),
        trigger('sharedPanelSlide', [
            transition(':enter', [
                style({ transform: 'translateX(100%)', opacity: 0 }),
                animate('320ms cubic-bezier(0.34,1.56,0.64,1)',
                    style({ transform: 'translateX(0)', opacity: 1 })),
            ]),
            transition(':leave', [
                animate('200ms cubic-bezier(0.4,0,1,1)',
                    style({ transform: 'translateX(100%)', opacity: 0 })),
            ]),
        ]),
        trigger('fadeScale', [
            transition(':enter', [
                style({ transform: 'scale(0.90)', opacity: 0 }),
                animate('220ms cubic-bezier(0.34,1.56,0.64,1)',
                    style({ transform: 'scale(1)', opacity: 1 })),
            ]),
            transition(':leave', [
                animate('140ms ease-in',
                    style({ transform: 'scale(0.90)', opacity: 0 })),
            ]),
        ]),
        trigger('sharedItemEnter', [
            transition(':enter', [
                style({ transform: 'translateY(14px) scale(0.96)', opacity: 0 }),
                animate('260ms cubic-bezier(0.34,1.56,0.64,1)',
                    style({ transform: 'translateY(0) scale(1)', opacity: 1 })),
            ]),
        ]),
        trigger('sidebarSlide', [
            transition(':enter', [
                style({ transform: 'translateX(100%)', opacity: 0 }),
                animate('280ms cubic-bezier(0.34,1.56,0.64,1)',
                    style({ transform: 'translateX(0)', opacity: 1 })),
            ]),
            transition(':leave', [
                animate('180ms cubic-bezier(0.4,0,1,1)',
                    style({ transform: 'translateX(100%)', opacity: 0 })),
            ]),
        ]),
        trigger('fadeSlide', [
            transition(':enter', [
                style({ transform: 'translateY(-8px)', opacity: 0 }),
                animate('200ms cubic-bezier(0.34,1.56,0.64,1)',
                    style({ transform: 'translateY(0)', opacity: 1 })),
            ]),
            transition(':leave', [
                animate('130ms ease-in',
                    style({ transform: 'translateY(-6px)', opacity: 0 })),
            ]),
        ]),
        trigger('sysMsg', [
            transition(':enter', [
                style({ transform: 'scale(0.9)', opacity: 0 }),
                animate('200ms ease-out',
                    style({ transform: 'scale(1)', opacity: 1 })),
            ]),
        ]),
        trigger('videoCardEnter', [
            transition(':enter', [
                style({ opacity: 0 }),
                animate('350ms cubic-bezier(0.34, 1.56, 0.64, 1)', style({ opacity: 1 })),
            ]),
            transition(':leave', [
                animate('200ms ease-in', style({ opacity: 0 })),
            ]),
        ]),
        trigger('fadePhase', [
            transition(':enter', [
                style({ opacity: 0 }),
                animate('250ms ease', style({ opacity: 1 })),
            ]),
            transition(':leave', [
                animate('250ms ease', style({ opacity: 0 })),
            ]),
        ]),
        trigger('scheduledPanelSlide', [
            transition(':enter', [
                style({ transform: 'translateX(100%)', opacity: 0 }),
                animate('300ms cubic-bezier(0.34,1.56,0.64,1)',
                    style({ transform: 'translateX(0)', opacity: 1 })),
            ]),
            transition(':leave', [
                animate('200ms cubic-bezier(0.4,0,1,1)',
                    style({ transform: 'translateX(100%)', opacity: 0 })),
            ]),
        ]),
        trigger('schedItemLeave', [
            transition(':leave', [
                animate('280ms cubic-bezier(0.4,0,1,1)',
                    style({ transform: 'translateY(-8px)', opacity: 0, height: '0px', marginBottom: '0px', paddingTop: '0px', paddingBottom: '0px' })),
            ]),
        ]),
        trigger('schedFormSlide', [
            transition(':enter', [
                style({ transform: 'translateY(-10px)', opacity: 0 }),
                animate('220ms cubic-bezier(0.34,1.56,0.64,1)',
                    style({ transform: 'translateY(0)', opacity: 1 })),
            ]),
            transition(':leave', [
                animate('150ms ease-in',
                    style({ transform: 'translateY(-8px)', opacity: 0 })),
            ]),
        ]),
        trigger('translationSwap', [
            transition(':enter', [
                style({ opacity: 0, transform: 'translateY(-6px) scale(0.97)' }),
                animate('350ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                    style({ opacity: 1, transform: 'translateY(0) scale(1)' })),
            ]),
            transition(':leave', [
                animate('200ms ease-in',
                    style({ opacity: 0, transform: 'translateY(6px) scale(0.97)' })),
            ]),
        ]),
        trigger('translationPillEnter', [
            transition(':enter', [
                style({ opacity: 0, transform: 'translateY(4px)' }),
                animate('250ms cubic-bezier(0.34,1.56,0.64,1)',
                    style({ opacity: 1, transform: 'translateY(0)' })),
            ]),
            transition(':leave', [
                animate('180ms ease-in',
                    style({ opacity: 0, transform: 'translateY(4px)' })),
            ]),
        ]),
        trigger('agendaPanelSlide', [
            transition(':enter', [
                style({ transform: 'translateX(100%)', opacity: 0 }),
                animate('300ms cubic-bezier(0.34,1.56,0.64,1)',
                    style({ transform: 'translateX(0)', opacity: 1 })),
            ]),
            transition(':leave', [
                animate('200ms cubic-bezier(0.4,0,1,1)',
                    style({ transform: 'translateX(100%)', opacity: 0 })),
            ]),
        ]),
        trigger('agendaItemEnter', [
            transition(':enter', [
                style({ transform: 'translateX(16px)', opacity: 0 }),
                animate('260ms cubic-bezier(0.34,1.56,0.64,1)',
                    style({ transform: 'translateX(0)', opacity: 1 })),
            ]),
        ]),
        trigger('calOverlayEnter', [
            transition(':enter', [
                style({ opacity: 0 }),
                animate('300ms cubic-bezier(0.34,1.56,0.64,1)', style({ opacity: 1 })),
            ]),
            transition(':leave', [
                animate('180ms ease-in', style({ opacity: 0 })),
            ]),
        ]),
    ],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {

    // ── API state ──────────────────────────────────────────────────
    rooms = signal<ChatRoom[]>([]);
    loading = signal(false);
    error = signal('');

    // ── Selected room ──────────────────────────────────────────────
    activeRoom = signal<ChatRoom | null>(null);

    // ── Search ─────────────────────────────────────────────────────
    searchQuery = signal('');

    // ── Filter chips ───────────────────────────────────────────────
    activeFilter = signal<'all' | 'unread' | 'favorites'>('all');

    // ── Unread counts (incremented by incoming WS msgs for inactive rooms) ──
    unreadCounts = signal<Map<number, number>>(new Map());
    totalUnread = computed(() => {
        let sum = 0;
        this.unreadCounts().forEach(v => sum += v);
        return sum;
    });

    filteredRooms = computed(() => {
        const q = this.searchQuery().toLowerCase();
        const filter = this.activeFilter();
        let rooms = this.rooms();
        if (q) {
            rooms = rooms.filter(r =>
                r.name.toLowerCase().includes(q) ||
                (r.description ?? '').toLowerCase().includes(q)
            );
        }
        if (filter === 'unread') {
            const counts = this.unreadCounts();
            rooms = rooms.filter(r => (counts.get(r.id) ?? 0) > 0);
        }
        return rooms;
    });

    // ── Create/edit form ───────────────────────────────────────────
    showForm = signal(false);
    editingRoom = signal<ChatRoom | null>(null);
    saving = signal(false);
    projectsLoading = signal(false);
    formStep = signal<1 | 2 | 3>(1);
    formTouched = signal<boolean>(false);
    formShaking = signal<boolean>(false);
    formProjectId = '';
    formName = '';
    formDescription = '';
    formRoomType: RoomType | '' = '';
    formError = '';

    get step1Valid(): boolean {
        return !!this.formProjectId?.trim();
    }
    get step2NameError(): string | null {
        const v = (this.formName ?? '').trim();
        if (!v) return 'Channel name is required.';
        if (v.length < 3) return 'Name must be at least 3 characters.';
        if (v.length > 50) return 'Name must be at most 50 characters.';
        return null;
    }
    get step2DescError(): string | null {
        const v = (this.formDescription ?? '').trim();
        if (!v) return 'Description is required.';
        if (v.length < 10) return 'Description must be at least 10 characters.';
        if (v.length > 200) return 'Description must be at most 200 characters.';
        return null;
    }
    get step2Valid(): boolean {
        return !this.step2NameError && !this.step2DescError && !!this.formRoomType;
    }

    private triggerShake(): void {
        this.formShaking.set(false);
        setTimeout(() => {
            this.formShaking.set(true);
            setTimeout(() => this.formShaking.set(false), 350);
        }, 0);
    }

    // ── Delete confirmation ────────────────────────────────────────
    deleteConfirmId = signal<number | null>(null);

    // ── Room type options ──────────────────────────────────────────
readonly roomTypes: { value: RoomType; label: string }[] = [
    { value: 'general',             label: 'General'            },
    { value: 'task_thread',         label: 'Task Thread'        },
    { value: 'deliverable_review',  label: 'Deliverable Review' },
    { value: 'private_room',        label: 'Private Room'       },
    { value: 'meeting',             label: 'Meeting'            },
];

    // ── Projects (for room form dropdown) ─────────────────────────
    projects: ProjectDTO[] = [];

    // ── Message pane scroll ────────────────────────────────────────
    @ViewChild('messagePane', { read: ElementRef }) messagePaneRef!: ElementRef;
    @ViewChild('quillRef') quillRef!: any;
    @ViewChild('videoPreview') videoPreviewRef!: ElementRef<HTMLVideoElement>;
    private shouldScrollToBottom = false;

    // ── Rich input ─────────────────────────────────────────────────
    richContent = '';
    selectedFile: File | null = null;
    emojiPickerOpen = signal(false);

    // ── Voice recording ────────────────────────────────────────────
    isRecording       = signal<boolean>(false);
    recordingDuration = signal<number>(0);
    private mediaRecorder: MediaRecorder | null = null;
    private audioChunks: Blob[] = [];
    private recordingInterval: ReturnType<typeof setInterval> | null = null;

    // ── Speech-to-Text ──────────────────────────────────────────────
    liveTranscript    = signal<string>('');
    finalTranscript   = signal<string>('');
    sttAvailable      = false;
    private speechRecognition: any = null;
    private pendingAudioFile: File | null = null;

    // ── @mention autocomplete ───────────────────────────────────────
    roomMembers            = signal<{id: number, fullName: string, role: string}[]>([]);
    mentionSuggestions     = signal<{id: number, fullName: string, role: string}[]>([]);
    showMentionSuggestions = signal<boolean>(false);
    mentionQuery           = signal<string>('');
    activeMentionIndex     = signal<number>(0);
    private mentionFetchSub: Subscription | null = null;

    // ── Video recording ────────────────────────────────────────────
    videoPhase             = signal<'idle' | 'preview' | 'countdown' | 'recording' | 'review'>('idle');
    videoRecordingDuration = signal<number>(0);
    videoQuality           = signal<'480p' | '720p' | '1080p'>('720p');
    videoIsPaused          = signal<boolean>(false);
    videoCameraFacing      = signal<'user' | 'environment'>('user');
    audioBars              = signal<number[]>(new Array(16).fill(0));
    videoCaption           = '';
    recordedBlobUrl        = signal<string>('');
    videoCountdown         = signal<number | string>(3);
    private videoMediaRecorder: MediaRecorder | null = null;
    private videoChunks: Blob[] = [];
    private videoRecordingInterval: ReturnType<typeof setInterval> | null = null;
    private videoStream: MediaStream | null = null;
    private audioCtx: AudioContext | null = null;
    private audioAnalyser: AnalyserNode | null = null;
    private audioAnimFrame: number | null = null;
    private videoCountdownTimeouts: ReturnType<typeof setTimeout>[] = [];
    // Legacy signal: true when recording or previewing (drives input-card dim class)
    isRecordingVideo = signal<boolean>(false);

    // ── Reply ──────────────────────────────────────────────────────
    replyingTo = signal<MessageDTO | null>(null);

    // ── Edit ───────────────────────────────────────────────────────
    editingMessage = signal<MessageDTO | null>(null);
    editContent    = signal<string>('');

    // ── Delete (UI-only holding slot) ──────────────────────────────
    deletingMessageId = signal<number | null>(null);

    // ── Scheduled Messages ─────────────────────────────────────────
    scheduledPanelOpen   = signal(false);
    scheduledMessages    = signal<ScheduledMessageDTO[]>([]);
    scheduledLoading     = signal(false);
    scheduledError       = signal('');
    /** 'none' = closed, 'once' = one-time, 'recurring' = recurring */
    scheduleFormType     = signal<'none' | 'once' | 'recurring'>('none');
    scheduleDate: Date | null = null;
    scheduleTime         = '';
    scheduleContent      = '';
    scheduleRecurrence   = signal<'DAILY' | 'WEEKDAYS' | 'WEEKLY' | 'CUSTOM'>('DAILY');
    scheduleCustomDays   = signal<Set<string>>(new Set());
    scheduleSaving       = signal(false);
    scheduleFormError    = signal('');
    editingScheduledId   = signal<number | null>(null);
    /** Countdown display; refreshed every 60 s */
    private scheduledNow = signal(new Date());
    private scheduledNowInterval: ReturnType<typeof setInterval> | null = null;
    private scheduledRoomSub: Subscription | null = null;
    private userNotifSub: Subscription | null = null;
    private pendingSound: (() => void) | null = null;
    private availableVoices: SpeechSynthesisVoice[] = [];
    private ttsKeyHandler: ((e: KeyboardEvent) => void) | null = null;
    private ttsKeyTimeout: ReturnType<typeof setTimeout> | null = null;

    readonly DAYS_LIST = [
        { key: 'MONDAY', label: 'Mon' }, { key: 'TUESDAY',   label: 'Tue' },
        { key: 'WEDNESDAY', label: 'Wed' }, { key: 'THURSDAY', label: 'Thu' },
        { key: 'FRIDAY', label: 'Fri' }, { key: 'SATURDAY',  label: 'Sat' },
        { key: 'SUNDAY', label: 'Sun' },
    ];

    // ── Translation ─────────────────────────────────────────────────
    translationMap = signal<Map<number, { translated: string; showTranslation: boolean; loading: boolean }>>(new Map());
    translatedRooms = signal<Set<number>>(new Set());

    // ── Audio player ───────────────────────────────────────────────
    playingAudioId   = signal<number | null>(null);
    audioCurrentTime = signal<number>(0);
    audioDurationMap = signal<Map<number, number>>(new Map());
    private audioMap             = new Map<number, HTMLAudioElement>();
    private audioProgressInterval: ReturnType<typeof setInterval> | null = null;

    // ── Video player ───────────────────────────────────────────────
    playingVideoId      = signal<number | null>(null);
    videoDurationMap    = signal<Map<number, number>>(new Map());
    videoCurrentTimeMap = signal<Map<number, number>>(new Map());

    // A comprehensive emoji set for the built-in full picker
    readonly fullEmojiSet = [
        // Faces & emotion
        '😀','😁','😂','🤣','😃','😄','😅','😆','😇','😊','😋','😌','😍','🤩','😘','😗','😙','😚',
        '🙂','🤗','🤔','😐','😑','😶','🙄','😏','😣','😥','😮','🤐','😯','😪','😫','😴','😌','😛',
        '😜','😝','🤤','😒','😓','😔','😕','🙃','🤑','😲','🙁','😖','😞','😟','😤','😢','😭','😦',
        '😧','😨','😩','🤯','😬','😰','😱','😳','🤪','😵','😡','😠','🤬','😷','🤒','🤕','🤧',
        // Gestures
        '👍','👎','👌','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','☝️','✋','🤚','🖐','🖖',
        '👋','🤏','💪','🦾','🙏','🤝','👏','🙌','🤲','🤜','🤛',
        // Hearts & symbols
        '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','💕','💞','💓','💗','💖','💘','💝','💯',
        '🔥','⭐','✨','💫','🌟','💥','🎉','🎊','🎈','🎁','🏆','🥇','✅','❌','⚠️','💡','🔔','💬',
    ];

    readonly quillModules = {
        toolbar: [
            ['bold', 'italic', 'underline', 'strike'],
            [{ list: 'ordered' }, { list: 'bullet' }],
            [{ indent: '-1' }, { indent: '+1' }],
            ['code-block'],
            ['clean'],
        ],
        keyboard: {
            bindings: {
                'mention-enter': {
                    key: 13,
                    handler: () => {
                        if (this.showMentionSuggestions()) {
                            this.selectMention(this.mentionSuggestions()[this.activeMentionIndex()]);
                            return false;
                        }
                        return true;
                    },
                },
                'mention-up': {
                    key: 38,
                    handler: () => {
                        if (this.showMentionSuggestions()) {
                            this.activeMentionIndex.update(i => (i - 1 + this.mentionSuggestions().length) % this.mentionSuggestions().length);
                            return false;
                        }
                        return true;
                    },
                },
                'mention-down': {
                    key: 40,
                    handler: () => {
                        if (this.showMentionSuggestions()) {
                            this.activeMentionIndex.update(i => (i + 1) % this.mentionSuggestions().length);
                            return false;
                        }
                        return true;
                    },
                },
                'mention-escape': {
                    key: 27,
                    handler: () => {
                        if (this.showMentionSuggestions()) {
                            this.showMentionSuggestions.set(false);
                            return false;
                        }
                        return true;
                    },
                },
            },
        },
    };

    // ── Real-time messages ─────────────────────────────────────────
    isSearchVisible = signal(false);
    messages = signal<MessageDTO[]>([]);
    messageInput = '';
    historyError = signal('');
    wsConnectionError = signal('');

    // ── WebSocket subscriptions ────────────────────────────────────
    private roomSub: Subscription | null = null;
    private wsErrSub: Subscription | null = null;

    // ── Emoji reactions ────────────────────────────────────────────
    reactionPickerMessageId = signal<number | null>(null);
    readonly emojiList = ['👍', '❤️', '😂', '😮', '😢', '😡', '👏', '🎉'];
    private docClickUnlisten: (() => void) | null = null;

    // ── Pin messages ───────────────────────────────────────────────
    pinnedMessages = signal<MessageDTO[]>([]);
    pinnedPanelOpen = signal(false);
    pinnedCount = computed(() => this.pinnedMessages().length);
    contextMenu = signal<{ visible: boolean; x: number; y: number; message: MessageDTO | null }>({
        visible: false, x: 0, y: 0, message: null,
    });
    private pinSub: Subscription | null = null;

    // ── Members panel ──────────────────────────────────────────────
    members = signal<RoomMemberDTO[]>([]);
    membersLoading = signal(false);
    membersError = signal('');
    showAddMemberForm = signal(false);
    addMemberLoading = signal(false);
    allUsers: UserDTO[] = [];
    filteredUsers: UserDTO[] = [];
    selectedUserId: number | null = null;

    // new for redesign
    membersPanelOpen = signal(false);
    sharedPanelOpen  = signal(false);
    sharedContent    = signal<MessageDTO[]>([]);
    sharedLoading    = signal(false);
    activeSharedTab  = signal<'IMAGES' | 'FILES' | 'LINKS'>('IMAGES');
    lightboxItem     = signal<MessageDTO | null>(null);
    sharedImages     = computed(() => this.sharedContent().filter(m => m.category === 'IMAGE'));
    sharedFiles      = computed(() => this.sharedContent().filter(m => m.category === 'FILE'));
    sharedLinks      = computed(() => this.sharedContent().filter(m => m.category === 'LINK'));

    // ── Meeting & Agenda ──────────────────────────────────────────
    agendaPanelOpen  = signal(false);
    agendaItems      = signal<MessageDTO[]>([]);
    agendaLoading    = signal(false);
    agendaSaving     = signal(false);
    agendaTitle      = '';
    agendaDurationMin: number = 15;
    agendaDoneCount  = computed(() => this.agendaItems().filter(i => i.agendaDone).length);
    /** Ticks every 30 s to keep meeting status badges live. */
    private meetingStatusNow = signal(new Date());
    private meetingStatusInterval: ReturnType<typeof setInterval> | null = null;
    private agendaRoomSub: Subscription | null = null;

    // ── Meeting Calendar Overlay ───────────────────────────────────
    meetingCalOverlayOpen  = signal(false);
    selectedCalEvent       = signal<ChatRoom | null>(null);
    calEventMembers        = signal<RoomMemberDTO[]>([]);
    calEventMembersLoading = signal(false);
    calOverlayYear         = new Date().getFullYear();
    calOverlayMonth        = new Date().getMonth(); // 0-indexed
    readonly CAL_MONTHS    = ['January','February','March','April','May','June',
                               'July','August','September','October','November','December'];
    readonly CAL_OVL_DOW   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    meetingRooms = computed(() => this.rooms().filter(r => r.roomType === 'meeting' && r.startTime));
    roomsByType = computed(() => {
        const rooms = this.filteredRooms();
        const groups = new Map<string, ChatRoom[]>();
        for (const room of rooms) {
            const t = room.roomType ?? 'general';
            if (!groups.has(t)) groups.set(t, []);
            groups.get(t)!.push(room);
        }
        return Array.from(groups.entries()).map(([type, rooms]) => ({ type, rooms }));
    });

    getRoomTypeIcon(type: string): string {
        const icons: Record<string, string> = {
            general: 'tag', task_thread: 'check_circle_outline',
            deliverable_review: 'rate_review', private_room: 'lock_outline', meeting: 'videocam',
        };
        return icons[type?.toLowerCase()] ?? 'chat_bubble_outline';
    }

    getInitials(name: string): string {
        if (!name) return '?';
        return name.trim().split(/\s+/).map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }

    /** Returns a deterministic per-sender gradient derived from the name string. */
    getAvatarGradient(name: string): { [key: string]: string } {
        if (!name) return {};
        const hash = name.split('').reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);
        const hue  = Math.abs(hash) % 360;
        const hue2 = (hue + 48) % 360;
        return { background: `linear-gradient(135deg, hsl(${hue},62%,52%), hsl(${hue2},58%,42%))` };
    }

    shouldShowAvatar(index: number): boolean {
        const msgs = this.messages();
        if (index === 0) return true;
        const prev = msgs[index - 1];
        const curr = msgs[index];
        if (prev.senderId !== curr.senderId) return true;
        // Group consecutive messages within 5 minutes
        const prevTime = new Date(prev.createdAt).getTime();
        const currTime = new Date(curr.createdAt).getTime();
        return (currTime - prevTime) > 5 * 60 * 1000;
    }

    shouldShowDateSep(index: number): boolean {
        const msgs = this.messages();
        if (index === 0) return true;
        const prev = new Date(msgs[index - 1].createdAt).toDateString();
        const curr = new Date(msgs[index].createdAt).toDateString();
        return prev !== curr;
    }

    formatDateSep(dateStr: string): string {
        const d = new Date(dateStr);
        const today = new Date();
        if (d.toDateString() === today.toDateString()) return 'Today';
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    }

    toggleSharedPanel(): void {
        if (this.sharedPanelOpen()) {
            this.sharedPanelOpen.set(false);
            return;
        }
        this.sharedPanelOpen.set(true);
        const room = this.activeRoom();
        if (!room) return;
        this.sharedLoading.set(true);
        this.chatMessageService.getSharedContent(room.id).subscribe({
            next: (items) => {
                this.sharedContent.set(items);
                this.sharedLoading.set(false);
            },
            error: () => { this.sharedLoading.set(false); },
        });
    }

    // ── Meeting status helpers ──────────────────────────────────────

    getMeetingStatus(room: ChatRoom): 'UPCOMING' | 'STARTING_SOON' | 'IN_PROGRESS' | 'ENDED' {
        if (!room.startTime) return 'UPCOMING';
        // Read meetingStatusNow so Angular re-evaluates on each tick
        const now = this.meetingStatusNow();
        const start = new Date(room.startTime);
        const end = room.endTime ? new Date(room.endTime) : new Date(start.getTime() + 60 * 60 * 1000);
        if (now > end) return 'ENDED';
        if (now >= start) return 'IN_PROGRESS';
        const diffMin = (start.getTime() - now.getTime()) / 60000;
        if (diffMin <= 60) return 'STARTING_SOON';
        return 'UPCOMING';
    }

    getMeetingMinutesLeft(room: ChatRoom): number {
        if (!room.startTime) return 0;
        const now = new Date();
        return Math.max(0, Math.round((new Date(room.startTime).getTime() - now.getTime()) / 60000));
    }

    joinMeeting(room: ChatRoom): void {
        if (room.meetingLink) window.open(room.meetingLink, '_blank');
    }

    openExternalLink(url: string): void {
        window.open(url, '_blank', 'noopener');
    }

    copyMeetingLink(room: ChatRoom): void {
        if (!room.meetingLink) return;
        navigator.clipboard?.writeText(room.meetingLink).then(() => {
            this.snackBar.open('Meeting link copied!', '', { duration: 2000, horizontalPosition: 'end' });
        }).catch(() => {/* ignore — clipboard not available */});
    }

    // ── Meeting Calendar Overlay ───────────────────────────────────

    openMeetingCalendar(): void {
        this.selectedCalEvent.set(null);
        this.calEventMembers.set([]);
        this.calOverlayYear  = new Date().getFullYear();
        this.calOverlayMonth = new Date().getMonth();
        this.meetingCalOverlayOpen.set(true);
    }

    closeMeetingCalendar(): void {
        this.meetingCalOverlayOpen.set(false);
    }

    calOverlayPrevMonth(): void {
        if (this.calOverlayMonth === 0) { this.calOverlayMonth = 11; this.calOverlayYear--; }
        else this.calOverlayMonth--;
    }

    calOverlayNextMonth(): void {
        if (this.calOverlayMonth === 11) { this.calOverlayMonth = 0; this.calOverlayYear++; }
        else this.calOverlayMonth++;
    }

    calOverlayGrid(): {date: Date; inMonth: boolean; isToday: boolean}[] {
        const year  = this.calOverlayYear;
        const month = this.calOverlayMonth;
        const today = new Date(); today.setHours(0,0,0,0);
        const firstDay = new Date(year, month, 1);
        const startOffset = firstDay.getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const cells: {date: Date; inMonth: boolean; isToday: boolean}[] = [];
        // Previous month trailing days
        const prevDays = new Date(year, month, 0).getDate();
        for (let i = startOffset - 1; i >= 0; i--) {
            cells.push({ date: new Date(year, month - 1, prevDays - i), inMonth: false, isToday: false });
        }
        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(year, month, d);
            cells.push({ date, inMonth: true, isToday: date.getTime() === today.getTime() });
        }
        while (cells.length % 7 !== 0) {
            cells.push({ date: new Date(year, month + 1, cells.length - daysInMonth - startOffset + 1), inMonth: false, isToday: false });
        }
        return cells;
    }

    getMeetingRoomsForDate(date: Date): ChatRoom[] {
        return this.meetingRooms().filter(r => {
            if (!r.startTime) return false;
            const sd = new Date(r.startTime);
            return sd.getFullYear() === date.getFullYear() &&
                   sd.getMonth()    === date.getMonth() &&
                   sd.getDate()     === date.getDate();
        });
    }

    openCalEventDetail(room: ChatRoom): void {
        this.selectedCalEvent.set(room);
        this.calEventMembers.set([]);
        this.calEventMembersLoading.set(true);
        this.memberService.getMembers(room.id).subscribe({
            next: (members) => { this.calEventMembers.set(members); this.calEventMembersLoading.set(false); },
            error: () => { this.calEventMembersLoading.set(false); },
        });
    }

    openRoomFromCalendar(room: ChatRoom): void {
        this.closeMeetingCalendar();
        this.selectRoom(room);
    }

    // ── Agenda panel ───────────────────────────────────────────────

    toggleAgendaPanel(): void {
        if (this.agendaPanelOpen()) {
            this.agendaPanelOpen.set(false);
            return;
        }
        this.agendaPanelOpen.set(true);
        const room = this.activeRoom();
        if (!room) return;
        this.loadAgendaItems(room.id);
    }

    private loadAgendaItems(roomId: number): void {
        this.agendaLoading.set(true);
        this.chatMessageService.getAgendaItems(roomId).subscribe({
            next: (items) => {
                this.agendaItems.set(items.sort((a, b) => (a.agendaOrder ?? 0) - (b.agendaOrder ?? 0)));
                this.agendaLoading.set(false);
            },
            error: () => { this.agendaLoading.set(false); },
        });
    }

    toggleAgendaDone(item: MessageDTO): void {
        const room = this.activeRoom();
        if (!room) return;
        // Optimistic update
        this.agendaItems.update(list => list.map(i =>
            i.id === item.id ? { ...i, agendaDone: !i.agendaDone } : i
        ));
        this.chatMessageService.toggleAgendaDone(room.id, item.id).subscribe({
            error: () => {
                // Revert on failure
                this.agendaItems.update(list => list.map(i =>
                    i.id === item.id ? { ...i, agendaDone: item.agendaDone } : i
                ));
            },
        });
    }

    submitAgendaItem(): void {
        const room = this.activeRoom();
        if (!room || !this.agendaTitle.trim()) return;
        this.agendaSaving.set(true);
        const payload: any = {
            content: this.agendaTitle.trim(),
            isAgendaItem: true,
            agendaDuration: this.agendaDurationMin ?? 15,
            agendaOrder: this.agendaItems().length + 1,
        };
        this.chatMessageService.uploadMessage(room.id, (() => {
            const fd = new FormData();
            fd.append('content', payload.content);
            fd.append('isAgendaItem', 'true');
            fd.append('agendaDuration', String(payload.agendaDuration));
            fd.append('agendaOrder', String(payload.agendaOrder));
            return fd;
        })()).subscribe({
            next: (msg) => {
                this.agendaItems.update(list => [...list, msg]);
                this.agendaTitle = '';
                this.agendaSaving.set(false);
            },
            error: () => {
                // Fallback: send via STOMP if REST fails
                this.chatMessageService.sendMessage(room.id,
                    JSON.stringify({ content: payload.content, isAgendaItem: true,
                                     agendaDuration: payload.agendaDuration, agendaOrder: payload.agendaOrder }));
                this.agendaTitle = '';
                this.agendaSaving.set(false);
            },
        });
    }

    getFileIcon(fileType?: string): string {
        if (!fileType) return 'insert_drive_file';
        const t = fileType.toLowerCase();
        if (t.includes('pdf'))                             return 'picture_as_pdf';
        if (t.includes('word') || t.includes('doc'))       return 'description';
        if (t.includes('excel') || t.includes('sheet') || t.includes('csv')) return 'table_chart';
        if (t.includes('powerpoint') || t.includes('presentation')) return 'slideshow';
        if (t.includes('zip') || t.includes('rar'))        return 'folder_zip';
        if (t.includes('audio'))                           return 'audio_file';
        if (t.includes('video'))                           return 'video_file';
        if (t.includes('text') || t.includes('txt'))       return 'text_snippet';
        return 'insert_drive_file';
    }

    getFileIconClass(fileType?: string): string {
        if (!fileType) return 'fi-default';
        const t = fileType.toLowerCase();
        if (t.includes('pdf'))                             return 'fi-pdf';
        if (t.includes('word') || t.includes('doc'))       return 'fi-word';
        if (t.includes('excel') || t.includes('sheet') || t.includes('csv')) return 'fi-excel';
        if (t.includes('powerpoint') || t.includes('presentation')) return 'fi-ppt';
        if (t.includes('zip') || t.includes('rar'))        return 'fi-zip';
        if (t.includes('audio'))                           return 'fi-audio';
        if (t.includes('video'))                           return 'fi-video';
        return 'fi-default';
    }

    formatFileSize(bytes?: number): string {
        if (!bytes && bytes !== 0) return '';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    constructor(
        private chatRoomService: ChatRoomService,
        private memberService: ChatRoomMemberService,
        private authService: AuthService,
        private userService: UserService,
        private chatMessageService: ChatMessageService,
        private snackBar: MatSnackBar,
        private renderer: Renderer2,
        private dialog: MatDialog,
        readonly notifService: ScheduledNotificationService,
        @Inject(DOCUMENT) private document: Document,
    ) {
        // Load room members for @mention autocomplete whenever active room changes
        effect(() => {
            const room = this.activeRoom();
            this.mentionFetchSub?.unsubscribe();
            this.mentionFetchSub = null;
            if (!room) { this.roomMembers.set([]); return; }
            this.mentionFetchSub = this.memberService.getRoomMemberSuggestions(room.id).subscribe({
                next: (members) => {
                    const everyone = { id: 0, fullName: 'everyone', role: 'ALL' };
                    this.roomMembers.set([everyone, ...members]);
                },
                error: () => { this.roomMembers.set([{ id: 0, fullName: 'everyone', role: 'ALL' }]); },
            });
        });

        // Watch retry requests from the notification panel and pre-fill the schedule form
        effect(() => {
            const req = this.notifService.retryRequest();
            if (req) {
                const type = req.recurrenceType === 'ONCE' ? 'once' : 'recurring';
                this.openSchedulePanel(type);
                this.scheduleContent = req.content;
                if (req.scheduledAt) {
                    const d = new Date(req.scheduledAt);
                    this.scheduleDate = d;
                    this.scheduleTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                }
                if (type === 'recurring' && req.recurrenceType) {
                    this.scheduleRecurrence.set(req.recurrenceType as any);
                    if (req.recurrenceDays?.length) {
                        this.scheduleCustomDays.set(new Set(req.recurrenceDays));
                    }
                }
                this.notifService.clearRetry();
            }
        });
    }

    ngOnInit(): void {
        if (this.canManageMembers) {
            this.loadRooms();
        } else if (this.isMember) {
            this.loadMyRooms();
        }

        const token = this.authService.getToken();
        if (token) {
            this.chatMessageService.connect(token);
            this.wsErrSub = this.chatMessageService.connectionError$.subscribe(err => {
                this.wsConnectionError.set(err);
            });
        }

        this.docClickUnlisten = this.renderer.listen('document', 'click', () => {
            if (this.pendingSound) { this.pendingSound(); this.pendingSound = null; }
            this.closeEmojiPicker();
            this.emojiPickerOpen.set(false);
            this.contextMenu.set({ visible: false, x: 0, y: 0, message: null });
        });

        // Load TTS voices (async in some browsers)
        if ('speechSynthesis' in window) {
            this.availableVoices = window.speechSynthesis.getVoices();
            window.speechSynthesis.onvoiceschanged = () => {
                this.availableVoices = window.speechSynthesis.getVoices();
            };
        }

        // Subscribe to personal notifications for all users
        // MANAGER/TUTOR receive SCHEDULED_* events; ALL users receive MENTION/ADDED_TO_ROOM/REMOVED_FROM_ROOM
        {
            const userId = this.authService.currentUser()?.id;
            if (userId) {
                this.userNotifSub = this.chatMessageService
                    .subscribeToUserNotifications(userId)
                    .subscribe((event: any) => this.handleScheduledNotificationEvent(event));
            }
        }

        // Refresh the countdown every 60 s
        this.scheduledNowInterval = setInterval(() => this.scheduledNow.set(new Date()), 60_000);

        // Refresh meeting status badges every 30 s
        this.meetingStatusInterval = setInterval(() => this.meetingStatusNow.set(new Date()), 30_000);
    }

    ngAfterViewChecked(): void {
        if (this.shouldScrollToBottom && this.messagePaneRef) {
            const el: HTMLElement = this.messagePaneRef.nativeElement;
            el.scrollTop = el.scrollHeight;
            this.shouldScrollToBottom = false;
        }
    }

    ngOnDestroy(): void {
        this.roomSub?.unsubscribe();
        this.wsErrSub?.unsubscribe();
        this.pinSub?.unsubscribe();
        this.scheduledRoomSub?.unsubscribe();
        this.userNotifSub?.unsubscribe();
        this.mentionFetchSub?.unsubscribe();
        this.showMentionSuggestions.set(false);
        if (this.scheduledNowInterval) clearInterval(this.scheduledNowInterval);
        if (this.meetingStatusInterval) clearInterval(this.meetingStatusInterval);
        this.agendaRoomSub?.unsubscribe();
        if (this.ttsKeyHandler) { document.removeEventListener('keydown', this.ttsKeyHandler); this.ttsKeyHandler = null; }
        if (this.ttsKeyTimeout) { clearTimeout(this.ttsKeyTimeout); this.ttsKeyTimeout = null; }
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        if (this.speechRecognition) { try { this.speechRecognition.stop(); } catch { /* ignore */ } this.speechRecognition = null; }
        this.chatMessageService.disconnect();
        this.docClickUnlisten?.();
        this.cancelRecording();
        this.cancelVideoRecording();
        this._cleanupVideoAudio();
        this._revokeRecordedUrl();
        if (this.audioProgressInterval) { clearInterval(this.audioProgressInterval); }
        this.audioMap.get(this.playingAudioId() ?? -1)?.pause();
    }

    // ── Data loading ───────────────────────────────────────────────

    loadRooms(): void {
        this.loading.set(true);
        this.error.set('');
        this.chatRoomService.getRooms().subscribe({
            next: (rooms) => {
                this.rooms.set(rooms);
                this.loading.set(false);
            },
            error: (err) => {
                this.error.set(this.formatError(err));
                this.loading.set(false);
            },
        });
    }

    loadMyRooms(): void {
        this.loading.set(true);
        this.error.set('');
        this.chatRoomService.getMyRooms().subscribe({
            next: (rooms) => {
                this.rooms.set(rooms);
                this.loading.set(false);
            },
            error: (err) => {
                this.error.set(err?.error?.message ?? 'Failed to load your rooms.');
                this.loading.set(false);
            },
        });
    }

    // ── Form helpers ───────────────────────────────────────────────

    private loadProjects(): void {
        this.projectsLoading.set(true);
        this.chatRoomService.getProjects().subscribe({
            next: (projects) => {
                this.projects = projects;
                this.projectsLoading.set(false);
            },
            error: () => {
                this.formError = 'Failed to load projects. Please try again.';
                this.projectsLoading.set(false);
            },
        });
    }

    openCreate(): void {
        const dialogRef = this.dialog.open(RoomWizardDialogComponent, {
            data: { editingRoom: null, rooms: this.rooms() },
            width: '520px',
            maxWidth: '95vw',
            maxHeight: '92vh',
            panelClass: 'delete-room-dialog-panel',
            enterAnimationDuration: '0ms',
            exitAnimationDuration: '0ms',
        });
        dialogRef.afterClosed().subscribe((result: { saved: ChatRoom; isEdit: boolean } | undefined) => {
            if (result?.saved) {
                this.rooms.update(list => [...list, result.saved]);
                this.snackBar.openFromComponent(SnackbarSuccessComponent, {
                    duration: 4000, horizontalPosition: 'end', verticalPosition: 'top',
                    panelClass: ['theme-green'], data: 'Chatroom created successfully.',
                });
            }
        });
    }

    openEdit(room: ChatRoom, event: Event): void {
        event.stopPropagation();
        this.deleteConfirmId.set(null);
        const dialogRef = this.dialog.open(RoomWizardDialogComponent, {
            data: { editingRoom: room, rooms: this.rooms() },
            width: '520px',
            maxWidth: '95vw',
            maxHeight: '92vh',
            panelClass: 'delete-room-dialog-panel',
            enterAnimationDuration: '0ms',
            exitAnimationDuration: '0ms',
        });
        dialogRef.afterClosed().subscribe((result: { saved: ChatRoom; isEdit: boolean } | undefined) => {
            if (result?.saved) {
                this.rooms.update(list => list.map(r => r.id === result.saved.id ? result.saved : r));
                if (this.activeRoom()?.id === result.saved.id) this.activeRoom.set(result.saved);
                this.snackBar.openFromComponent(SnackbarSuccessComponent, {
                    duration: 4000, horizontalPosition: 'end', verticalPosition: 'top',
                    panelClass: ['theme-green'], data: 'Chatroom updated successfully.',
                });
            }
        });
    }

    cancelForm(): void {
        this.formStep.set(1);
        this.formTouched.set(false);
        this.formShaking.set(false);
        this.showForm.set(false);
    }

    nextStep(): void {
        if (this.formStep() === 1) {
            if (!this.step1Valid) {
                this.formTouched.set(true);
                this.triggerShake();
                return;
            }
            this.formTouched.set(false);
            this.formStep.set(2);
        } else if (this.formStep() === 2) {
            this.formTouched.set(true);
            if (!this.step2Valid) {
                this.triggerShake();
                return;
            }
            // Duplicate detection
            const name = this.formName.trim().toLowerCase();
            const projectId = this.formProjectId.trim();
            const type = this.formRoomType;
            const editing = this.editingRoom();
            const isDuplicate = this.rooms().some(r => {
                if (editing && r.id === editing.id) return false;
                return r.projectId === projectId &&
                       (r.name ?? '').trim().toLowerCase() === name &&
                       r.roomType === type;
            });
            if (isDuplicate) {
                this.formError = 'A channel with this name and type already exists in the selected project.';
                this.triggerShake();
                return;
            }
            this.formError = '';
            this.formTouched.set(false);
            this.formStep.set(3);
        }
    }

    prevStep(): void {
        if (this.formStep() > 1) {
            this.formStep.update(s => (s - 1) as 1 | 2 | 3);
            this.formTouched.set(false);
            this.formError = '';
        }
    }

    saveRoom(): void {
        if (!this.canManageMembers) return;
        const payload: ChatRoomPayload = {
            projectId: this.formProjectId.trim(),
            name: this.formName.trim(),
            description: this.formDescription.trim(),
            roomType: this.formRoomType as RoomType,
        };
        this.saving.set(true);
        this.formError = '';
        const editing = this.editingRoom();
        const op = editing
            ? this.chatRoomService.updateRoom(editing.id, payload)
            : this.chatRoomService.createRoom(payload);

        op.subscribe({
            next: (saved) => {
                if (editing) {
                    this.rooms.update(list => list.map(r => r.id === saved.id ? saved : r));
                    if (this.activeRoom()?.id === saved.id) this.activeRoom.set(saved);
                } else {
                    this.rooms.update(list => [...list, saved]);
                }
                this.snackBar.openFromComponent(SnackbarSuccessComponent, {
                    duration: 4000,
                    horizontalPosition: 'end',
                    verticalPosition: 'top',
                    panelClass: ['theme-green'],
                    data: editing ? 'Chatroom updated successfully.' : 'Chatroom created successfully.',
                });
                this.saving.set(false);
                this.showForm.set(false);
            },
            error: (err) => {
                if (err?.status === 409) {
                    this.formError = 'A channel with this name and type already exists in the selected project.';
                    this.formStep.set(2);
                } else {
                    this.formError = this.formatError(err);
                }
                this.saving.set(false);
            },
        });
    }

    // ── Delete ─────────────────────────────────────────────────────

    confirmDelete(id: number, event: Event): void {
        event.stopPropagation();
        if (!this.canManageMembers) return;
        const room = this.rooms().find(r => r.id === id);
        if (!room) return;
        this.showForm.set(false);
        const dialogRef = this.dialog.open(DeleteRoomDialogComponent, {
            data: { room },
            width: '420px',
            maxWidth: '95vw',
            panelClass: 'delete-room-dialog-panel',
            disableClose: true,
            enterAnimationDuration: '0ms',
            exitAnimationDuration: '0ms',
        });
        dialogRef.afterClosed().subscribe((result: { deleted: boolean; id: number } | undefined) => {
            if (result?.deleted) {
                this.rooms.update(list => list.filter(r => r.id !== result.id));
                if (this.activeRoom()?.id === result.id) this.activeRoom.set(null);
            }
        });
    }

    // ── Room selection ─────────────────────────────────────────────

    selectRoom(room: ChatRoom): void {
        this.activeRoom.set(room);
        this.unreadCounts.update(m => { const n = new Map(m); n.set(room.id, 0); return n; });
        this.deleteConfirmId.set(null);
        this.showAddMemberForm.set(false);
        this.membersError.set('');
        this.historyError.set('');
        this.messages.set([]);
        this.pinnedMessages.set([]);
        this.pinnedPanelOpen.set(false);
        this.sharedPanelOpen.set(false);
        this.sharedContent.set([]);
        this.activeSharedTab.set('IMAGES');
        this.lightboxItem.set(null);
        this.contextMenu.set({ visible: false, x: 0, y: 0, message: null });

        // Unsubscribe from previous room topics
        this.roomSub?.unsubscribe();
        this.roomSub = null;
        this.pinSub?.unsubscribe();
        this.pinSub = null;
        this.scheduledRoomSub?.unsubscribe();
        this.scheduledRoomSub = null;
        this.scheduledMessages.set([]);
        this.scheduledPanelOpen.set(false);
        this.scheduleFormType.set('none');
        this.agendaPanelOpen.set(false);
        this.agendaItems.set([]);

        // Subscribe to real-time scheduled-message cancellations for this room
        if (this.canManageMembers) {
            this.scheduledRoomSub = this.chatMessageService
                .subscribeToScheduled(room.id)
                .subscribe(event => {
                    if (event.type === 'CANCELLED') {
                        this.scheduledMessages.update(list =>
                            list.filter(m => m.id !== event.scheduledMessageId)
                        );
                    }
                });
        }

        // Load pinned messages for this room
        this.chatMessageService.getPinnedMessages(room.id).subscribe({
            next: (pinned) => this.pinnedMessages.set(pinned),
            error: () => { /* non-critical */ },
        });

        // Subscribe to real-time pin updates
        this.pinSub = this.chatMessageService.subscribeToPinUpdates(room.id).subscribe(msg => {
            this.pinnedMessages.update(list => {
                if (msg.isPinned) {
                    // Add or update in pinned list
                    const idx = list.findIndex(m => m.id === msg.id);
                    if (idx !== -1) { const u = [...list]; u[idx] = msg; return u; }
                    return [...list, msg];
                } else {
                    // Remove from pinned list
                    return list.filter(m => m.id !== msg.id);
                }
            });
            // Also update isPinned flag in main message list
            this.messages.update(list => {
                const idx = list.findIndex(m => m.id === msg.id);
                if (idx === -1) return list;
                const u = [...list];
                u[idx] = { ...u[idx], isPinned: msg.isPinned, pinnedAt: msg.pinnedAt, pinnedById: msg.pinnedById, pinnedByName: msg.pinnedByName };
                return u;
            });
        });

        if (this.canManageMembers) {
            this.loadMembers(room.id);
        }

        // Load history; on success subscribe to live topic
        this.chatMessageService.getHistory(room.id).subscribe({
            next: (msgs) => {
                this.messages.set(msgs);
                this.shouldScrollToBottom = true;
                // Subscribe to live WebSocket updates for this room
                this.roomSub = this.chatMessageService.subscribeToRoom(room.id).subscribe(msg => {
                    // Agenda items: upsert in agenda list if panel is open
                    if (msg.isAgendaItem) {
                        this.agendaItems.update(list => {
                            const idx = list.findIndex(m => m.id === msg.id);
                            if (idx !== -1) {
                                const updated = [...list];
                                updated[idx] = msg;
                                return updated;
                            }
                            return [...list, msg].sort((a, b) => (a.agendaOrder ?? 0) - (b.agendaOrder ?? 0));
                        });
                        return; // Don't add agenda items to main message stream
                    }
                    if (msg.deleted) {
                        this.messages.update(list => list.filter(m => m.id !== msg.id));
                        return;
                    }
                    const isNew = !this.messages().some(m => m.id === msg.id);
                    this.messages.update(list => {
                        const idx = list.findIndex(m => m.id === msg.id);
                        if (idx !== -1) {
                            const updated = [...list];
                            updated[idx] = msg;
                            return updated;
                        }
                        return [...list, msg];
                    });
                    if (isNew) this.shouldScrollToBottom = true;
                });
            },
            error: (err) => {
                if (err?.status === 403) {
                    this.historyError.set('You are not a member of this room.');
                } else {
                    this.historyError.set(err?.error?.message ?? 'Failed to load messages.');
                }
            },
        });
    }

    // ── Members management ─────────────────────────────────────────

    get currentUserRole(): string {
        return this.authService.currentUser()?.role
            ?? (typeof localStorage !== 'undefined' ? localStorage.getItem('role') : null)
            ?? '';
    }

    get canManageMembers(): boolean {
        const role = this.currentUserRole;
        return role === 'MANAGER' || role === 'TUTOR';
    }

    get isMember(): boolean {
        const role = this.currentUserRole;
        return role === 'EMPLOYEE' || role === 'STUDENT';
    }

    get allowedTargetRole(): string {
        return this.currentUserRole === 'TUTOR' ? 'STUDENT' : 'EMPLOYEE';
    }

    loadMembers(roomId: number): void {
        this.membersLoading.set(true);
        this.membersError.set('');
        this.memberService.getMembers(roomId).subscribe({
            next: (list) => {
                this.members.set(list);
                this.membersLoading.set(false);
            },
            error: (err) => {
                this.membersError.set(this.formatMemberError(err));
                this.membersLoading.set(false);
            },
        });
    }

    openAddMemberForm(): void {
        this.selectedUserId = null;
        this.filteredUsers = [];
        this.showAddMemberForm.set(true);
        this.userService.getAll().subscribe({
            next: (users) => {
                const target = this.allowedTargetRole;
                this.allUsers = users;
                this.filteredUsers = users.filter(u => u.role === target);
            },
            error: () => {
                this.notify('Failed to load users.', true);
            },
        });
    }

    cancelAddMemberForm(): void {
        this.showAddMemberForm.set(false);
        this.selectedUserId = null;
    }

    confirmAddMember(): void {
        if (!this.canManageMembers) return;
        const roomId = this.activeRoom()?.id;
        if (!roomId || !this.selectedUserId) return;
        this.addMemberLoading.set(true);
        this.memberService.addMember(roomId, this.selectedUserId).subscribe({
            next: (newMember) => {
                this.members.update(list => [newMember, ...list]);
                this.addMemberLoading.set(false);
                this.showAddMemberForm.set(false);
                this.selectedUserId = null;
                this.notify('Member added successfully.');
            },
            error: (err) => {
                this.addMemberLoading.set(false);
                const msg = this.formatMemberError(err, err?.status);
                this.notify(msg, true);
            },
        });
    }

    removeMember(member: RoomMemberDTO): void {
        if (!this.canManageMembers) return;
        const roomId = this.activeRoom()?.id;
        if (!roomId) return;
        const dialogRef = this.dialog.open(RemoveMemberDialogComponent, {
            data: { member, roomId },
            width: '420px',
            maxWidth: '95vw',
            panelClass: 'delete-room-dialog-panel',
            disableClose: true,
            enterAnimationDuration: '0ms',
            exitAnimationDuration: '0ms',
        });
        dialogRef.afterClosed().subscribe((result: { removed: boolean; memberId: number } | undefined) => {
            if (result?.removed) {
                this.members.update(list => list.filter(m => m.id !== result.memberId));
                this.notify('Member removed successfully.');
            }
        });
    }

    formatJoinedAt(dateStr: string): string {
        if (!dateStr) return '';
        try {
            const d = new Date(dateStr);
            return d.toLocaleString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
            });
        } catch {
            return dateStr;
        }
    }

    private formatMemberError(err: any, status?: number): string {
        if (status === 400 || err?.status === 400) return 'This user has the wrong role.';
        if (status === 409 || err?.status === 409) return 'User is already a member of this room.';
        if (status === 404 || err?.status === 404) return 'User or room not found.';
        if (status === 403 || err?.status === 403) return 'You are not authorized to perform this action.';
        return err?.error?.message ?? 'An unexpected error occurred.';
    }

    private notify(message: string, isError = false): void {
        this.snackBar.open(message, 'Close', {
            duration: 4000,
            panelClass: isError ? ['snack-error'] : ['snack-success'],
        });
    }

    // ── Helpers ────────────────────────────────────────────────────

    getRoomTypeLabel(type: string): string {
        return this.roomTypes.find(t => t.value === type?.toLowerCase())?.label ?? type ?? '';
    }

    getProjectName(id: string): string {
        return this.projects.find(p => p.id === id)?.name ?? id;
    }

    private formatError(err: any): string {
        if (err?.status === 403) return 'Access denied (403) — only MANAGER and TUTOR can manage rooms.';
        if (err?.status === 404) return 'Room not found (404).';
        return err?.error?.message ?? 'An unexpected error occurred.';
    }

    // ── UI helpers ─────────────────────────────────────────────────

    toggleSearch(): void {
        this.isSearchVisible.update(v => !v);
    }

    sendMessage(): void {
        const text = this.messageInput.trim();
        const roomId = this.activeRoom()?.id;
        if (!text || !roomId) return;
        this.chatMessageService.sendMessage(roomId, text);
        this.messageInput = '';
        // Do NOT append locally — wait for the WebSocket echo from the server
    }

    get currentUser() {
        return this.authService.currentUser();
    }

    formatMessageTime(dateStr: string): string {
        if (!dateStr) return '';
        try {
            const d = new Date(dateStr);
            return d.toLocaleTimeString('en-US', {
                hour: '2-digit', minute: '2-digit', hour12: false,
            });
        } catch {
            return dateStr;
        }
    }

    // ── Emoji reactions ────────────────────────────────────────────

    toggleEmojiPicker(messageId: number, event: Event): void {
        event.stopPropagation();
        this.reactionPickerMessageId.update(id => id === messageId ? null : messageId);
    }

    closeEmojiPicker(): void {
        this.reactionPickerMessageId.set(null);
    }

    react(messageId: number, emoji: string): void {
        const roomId = this.activeRoom()?.id;
        if (!roomId) return;
        this.chatMessageService.toggleReaction(roomId, messageId, emoji).subscribe();
        this.closeEmojiPicker();
    }

    // ── Pin messages ───────────────────────────────────────────────

    openContextMenu(event: MouseEvent, message: MessageDTO): void {
        event.preventDefault();
        event.stopPropagation();
        this.contextMenu.set({ visible: true, x: event.clientX, y: event.clientY, message });
    }

    @HostListener('document:contextmenu', ['$event'])
    onDocContextMenu(event: MouseEvent): void {
        // Close context menu if clicking outside a message bubble
        if (this.contextMenu().visible) {
            event.preventDefault();
        }
    }

    togglePinnedPanel(): void {
        this.pinnedPanelOpen.update(v => !v);
    }

    deleteMessage(message: MessageDTO): void {
        const roomId = this.activeRoom()?.id;
        if (!roomId) return;
        this.chatMessageService.deleteMessage(roomId, message.id).subscribe({
            next: () => this.messages.update(list => list.filter(m => m.id !== message.id)),
            error: (err) => this.error.set(this.formatError(err)),
        });
    }

    pinOrUnpin(message: MessageDTO): void {
        const roomId = this.activeRoom()?.id;
        if (!roomId) return;
        this.contextMenu.set({ visible: false, x: 0, y: 0, message: null });

        const op = message.isPinned
            ? this.chatMessageService.unpinMessage(roomId, message.id)
            : this.chatMessageService.pinMessage(roomId, message.id);

        op.subscribe({
            next: () => {
                // Optimistic update — WS event will confirm
                const pinned = !message.isPinned;
                this.messages.update(list => list.map(m =>
                    m.id === message.id ? { ...m, isPinned: pinned } : m
                ));
                if (pinned) {
                    this.pinnedMessages.update(list =>
                        list.some(m => m.id === message.id) ? list : [...list, { ...message, isPinned: true }]
                    );
                } else {
                    this.pinnedMessages.update(list => list.filter(m => m.id !== message.id));
                }
            },
            error: (err) => this.notify(err?.error?.message ?? 'Failed to update pin.', true),
        });
    }

    // ── Scheduled Messages ──────────────────────────────────────────────────

    get today(): Date { return new Date(); }

    toggleScheduledPanel(): void {
        const open = !this.scheduledPanelOpen();
        this.scheduledPanelOpen.set(open);
        if (open) {
            const roomId = this.activeRoom()?.id;
            if (roomId) this.loadScheduledMessages(roomId);
        }
    }

    loadScheduledMessages(roomId: number): void {
        this.scheduledLoading.set(true);
        this.scheduledError.set('');
        this.chatMessageService.getScheduledMessages(roomId).subscribe({
            next: list => { this.scheduledMessages.set(list); this.scheduledLoading.set(false); },
            error: err => { this.scheduledError.set(err?.error?.message ?? 'Failed to load scheduled messages.'); this.scheduledLoading.set(false); },
        });
    }

    openSchedulePanel(type: 'once' | 'recurring'): void {
        this.scheduleFormType.set(type);
        this.scheduleDate = null;
        this.scheduleTime = '';
        this.scheduleContent = this.richContent ? this.stripHtml(this.richContent) : '';
        this.scheduleRecurrence.set('DAILY');
        this.scheduleCustomDays.set(new Set());
        this.scheduleFormError.set('');
        this.editingScheduledId.set(null);
    }

    closeSchedulePanel(): void {
        this.scheduleFormType.set('none');
        this.scheduleFormError.set('');
        this.editingScheduledId.set(null);
    }

    setScheduleRecurrence(value: string): void {
        this.scheduleRecurrence.set(value as 'DAILY' | 'WEEKDAYS' | 'WEEKLY' | 'CUSTOM');
    }

    editScheduled(item: ScheduledMessageDTO): void {
        const type = item.recurrenceType === 'ONCE' ? 'once' : 'recurring';
        this.scheduleFormType.set(type);
        this.scheduleContent = item.content;
        const d = new Date(item.scheduledAt);
        this.scheduleDate = d;
        this.scheduleTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        this.scheduleRecurrence.set(item.recurrenceType as any);
        this.scheduleCustomDays.set(new Set(item.recurrenceDays ?? []));
        this.scheduleFormError.set('');
        this.editingScheduledId.set(item.id);
        this.scheduledPanelOpen.set(true);
    }

    toggleCustomDay(day: string): void {
        this.scheduleCustomDays.update(s => {
            const n = new Set(s);
            n.has(day) ? n.delete(day) : n.add(day);
            return n;
        });
    }

    submitScheduled(): void {
        const roomId = this.activeRoom()?.id;
        if (!roomId) return;

        if (!this.scheduleContent.trim()) {
            this.scheduleFormError.set('Message content is required.'); return;
        }
        if (!this.scheduleDate) {
            this.scheduleFormError.set('Please pick a date.'); return;
        }
        if (!this.scheduleTime) {
            this.scheduleFormError.set('Please enter a time (HH:MM).'); return;
        }
        const [hh, mm] = this.scheduleTime.split(':').map(Number);
        const dt = new Date(this.scheduleDate);
        dt.setHours(hh, mm, 0, 0);
        if (dt <= new Date()) {
            this.scheduleFormError.set('Scheduled time must be in the future.'); return;
        }

        const recType = this.scheduleFormType() === 'once' ? 'ONCE' : this.scheduleRecurrence();
        if (recType === 'CUSTOM' && this.scheduleCustomDays().size === 0) {
            this.scheduleFormError.set('Select at least one day for Custom recurrence.'); return;
        }

        const body: ScheduledPayload = {
            content: this.scheduleContent.trim(),
            scheduledAt: this.formatIso(dt),
            recurrenceType: recType,
            ...(recType === 'CUSTOM' ? { recurrenceDays: [...this.scheduleCustomDays()] } : {}),
        };

        this.scheduleSaving.set(true);
        this.scheduleFormError.set('');
        const editId = this.editingScheduledId();
        const req$ = editId
            ? this.chatMessageService.updateScheduled(roomId, editId, body)
            : this.chatMessageService.createScheduled(roomId, body);

        req$.subscribe({
            next: (dto) => {
                this.scheduledMessages.update(list => {
                    const idx = list.findIndex(m => m.id === dto.id);
                    if (idx !== -1) { const u = [...list]; u[idx] = dto; return u; }
                    return [dto, ...list];
                });
                this.scheduleSaving.set(false);
                this.closeSchedulePanel();
                this.clearInput();
                this.notify('Message scheduled!');
            },
            error: err => { this.scheduleFormError.set(err?.error?.message ?? 'Failed to save.'); this.scheduleSaving.set(false); },
        });
    }

    confirmCancelScheduled(item: ScheduledMessageDTO): void {
        const ref = this.dialog.open(CancelScheduledDialogComponent, {
            data: { item },
            width: '420px',
            maxWidth: '95vw',
            panelClass: 'delete-room-dialog-panel',
            disableClose: true,
            enterAnimationDuration: '0ms',
            exitAnimationDuration: '0ms',
        });
        ref.afterClosed().subscribe((result: { cancelled: boolean; id: number } | undefined) => {
            if (result?.cancelled) {
                this.scheduledMessages.update(list => list.filter(m => m.id !== result.id));
            }
        });
    }

    getScheduledCountdown(isoStr: string): string {
        const now = this.scheduledNow();
        const diff = Math.floor((new Date(isoStr).getTime() - now.getTime()) / 1000);
        if (diff < 60)  return 'Sending soon…';
        if (diff < 3600) return `Sends in ${Math.floor(diff / 60)}m`;
        const h = Math.floor(diff / 3600);
        const m = Math.floor((diff % 3600) / 60);
        return `Sends in ${h}h ${m}m`;
    }

    formatScheduledDate(isoStr: string): string {
        try {
            return new Date(isoStr).toLocaleString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
                hour: '2-digit', minute: '2-digit', hour12: false,
            }).replace(',', '').replace(/(\d{4}), (\d)/, '$1 at $2');
        } catch { return isoStr; }
    }

    getRecurrenceChipStyle(type: string): string {
        const map: Record<string, string> = {
            ONCE: '#78909c', DAILY: '#1976d2', WEEKDAYS: '#00897b',
            WEEKLY: '#7b1fa2', CUSTOM: '#e65100',
        };
        return map[type] ?? '#78909c';
    }

    private formatIso(d: Date): string {
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
    }

    private handleScheduledNotificationEvent(event: any): void {
        // Dispatch new notification types
        if (event.type === 'MENTION') { this._handleMentionNotif(event); return; }
        if (event.type === 'MEETING_REMINDER') { this._handleMeetingReminderNotif(event); return; }
        if (event.type === 'ADDED_TO_ROOM') { this._handleAddedToRoomNotif(event); return; }
        if (event.type === 'REMOVED_FROM_ROOM') { this._handleRemovedFromRoomNotif(event); return; }

        let notif: ScheduledNotification;
        if (event.type === 'SCHEDULED_SENT') {
            notif = {
                id: crypto.randomUUID(), type: 'SCHEDULED_SENT',
                icon: 'check_circle', iconColor: '#4caf50',
                message: `Your scheduled message was sent to #${event.roomName}`,
                roomId: event.roomId, roomName: event.roomName,
                timestamp: new Date(), read: false,
            };
        } else if (event.type === 'SCHEDULED_REMINDER') {
            notif = {
                id: crypto.randomUUID(), type: 'SCHEDULED_REMINDER',
                icon: 'alarm', iconColor: '#ff9800',
                message: `⏰ Sending in 15 min to #${event.roomName} — ${event.messagePreview}`,
                roomId: event.roomId, roomName: event.roomName,
                timestamp: new Date(), read: false,
                nextSendAt: event.nextSendAt,
            };
            this.snackBar.open(`Sending in 15 min to #${event.roomName}`, 'View Room', {
                duration: 6000,
                panelClass: ['snack-success'],
                horizontalPosition: 'end',
            });
        } else {
            notif = {
                id: crypto.randomUUID(), type: 'SCHEDULED_FAILED',
                icon: 'error', iconColor: '#f44336',
                message: `❌ Scheduled message failed in #${event.roomName}`,
                roomId: event.roomId, roomName: event.roomName,
                timestamp: new Date(), read: false,
                originalContent: event.messagePreview,
                recurrenceType: 'ONCE',
            };
        }
        this.notifService.push(notif);
        this.announceNotificationTTS(event);
    }

    private _voiceAnnounce(shortText: string, fullText: string): void {
        const userId = this.authService.currentUser()?.id;
        if (!userId) return;
        if (localStorage.getItem(`chat_notifications_muted_${userId}`) === 'true') return;
        if (!('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();
        if (this.ttsKeyHandler) { document.removeEventListener('keydown', this.ttsKeyHandler); this.ttsKeyHandler = null; }
        if (this.ttsKeyTimeout) { clearTimeout(this.ttsKeyTimeout); this.ttsKeyTimeout = null; }
        const makeU = (t: string): SpeechSynthesisUtterance => {
            const u = new SpeechSynthesisUtterance(t);
            u.rate = 1.1; u.pitch = 1.0; u.volume = 0.8; u.lang = 'en-US';
            const pref = this.availableVoices.find(v => v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Karen'));
            if (pref) u.voice = pref;
            return u;
        };
        const ann = makeU(shortText);
        ann.onend = () => {
            const prompt = makeU('Press R to hear the full notification or dismiss');
            prompt.onend = () => {
                this.ttsKeyHandler = (e: KeyboardEvent) => {
                    if (e.key !== 'r' && e.key !== 'R') return;
                    if (this.ttsKeyHandler) { document.removeEventListener('keydown', this.ttsKeyHandler); this.ttsKeyHandler = null; }
                    if (this.ttsKeyTimeout) { clearTimeout(this.ttsKeyTimeout); this.ttsKeyTimeout = null; }
                    window.speechSynthesis.speak(makeU(fullText));
                };
                document.addEventListener('keydown', this.ttsKeyHandler);
                this.ttsKeyTimeout = setTimeout(() => {
                    if (this.ttsKeyHandler) { document.removeEventListener('keydown', this.ttsKeyHandler); this.ttsKeyHandler = null; }
                    this.ttsKeyTimeout = null;
                }, 5000);
            };
            window.speechSynthesis.speak(prompt);
        };
        window.speechSynthesis.speak(ann);
    }

    private _handleMentionNotif(event: any): void {
        const msg = event.isEveryone
            ? `${event.senderName} mentioned everyone in #${event.roomName}`
            : `${event.senderName} mentioned you in #${event.roomName}`;
        const notif = {
            id: crypto.randomUUID(), type: 'MENTION' as any,
            icon: 'alternate_email', iconColor: 'var(--mat-sys-primary)',
            message: msg, roomId: event.roomId, roomName: event.roomName,
            timestamp: new Date(), read: false,
            originalContent: event.messagePreview ?? '',
            senderName: event.senderName,
            isEveryone: event.isEveryone ?? false,
        } as unknown as ScheduledNotification;
        this.notifService.push(notif);
        const shortText = event.isEveryone
            ? `${event.senderName} mentioned everyone in ${event.roomName}`
            : `${event.senderName} mentioned you in ${event.roomName}`;
        const fullText = `${event.senderName} said: ${(event.messagePreview ?? '').slice(0, 80)}`;
        this._voiceAnnounce(shortText, fullText);
    }

    private _handleAddedToRoomNotif(event: any): void {
        const notif = {
            id: crypto.randomUUID(), type: 'ADDED_TO_ROOM' as any,
            icon: 'person_add', iconColor: '#4caf50',
            message: `You were added to #${event.roomName} by ${event.addedByName}`,
            roomId: event.roomId, roomName: event.roomName,
            timestamp: new Date(), read: false, originalContent: '',
            addedByName: event.addedByName,
        } as unknown as ScheduledNotification;
        this.notifService.push(notif);
        this.snackBar.open(`You have been added to #${event.roomName}`, 'Open', {
            duration: 6000, panelClass: ['snack-success'], horizontalPosition: 'end',
        });
        if (this.canManageMembers) { this.loadRooms(); } else { this.loadMyRooms(); }
        const shortText = `You have been added to the chatroom ${event.roomName} by ${event.addedByName}`;
        const fullText = `${event.addedByName} added you to the chatroom ${event.roomName}. Open the chatroom to start messaging.`;
        this._voiceAnnounce(shortText, fullText);
    }

    private _handleRemovedFromRoomNotif(event: any): void {
        const notif = {
            id: crypto.randomUUID(), type: 'REMOVED_FROM_ROOM' as any,
            icon: 'person_remove', iconColor: '#f44336',
            message: `You were removed from #${event.roomName} by ${event.removedByName}`,
            roomId: event.roomId, roomName: event.roomName,
            timestamp: new Date(), read: false, originalContent: '',
            removedByName: event.removedByName,
        } as unknown as ScheduledNotification;
        this.notifService.push(notif);
        if (this.activeRoom()?.id === event.roomId) {
            this.activeRoom.set(null);
            this.messages.set([]);
            this.snackBar.open('You have been removed from this chatroom', 'Dismiss', {
                duration: 8000, panelClass: ['snack-error'], horizontalPosition: 'center',
            });
        }
        if (this.canManageMembers) { this.loadRooms(); } else { this.loadMyRooms(); }
        const shortText = `You have been removed from the chatroom ${event.roomName} by ${event.removedByName}`;
        const fullText = `${event.removedByName} removed you from the chatroom ${event.roomName}. You no longer have access to this chatroom.`;
        this._voiceAnnounce(shortText, fullText);
    }

    private _handleMeetingReminderNotif(event: any): void {
        const minsText = event.minutesBefore ? `in ${event.minutesBefore} minutes` : 'soon';
        const notif = {
            id: crypto.randomUUID(), type: 'MEETING_REMINDER' as any,
            icon: 'video_call', iconColor: '#4caf50',
            message: `Meeting #${event.roomName} starts ${minsText}`,
            roomId: event.roomId, roomName: event.roomName,
            timestamp: new Date(), read: false,
            originalContent: event.meetingLink ?? '',
            meetingLink: event.meetingLink,
        } as unknown as ScheduledNotification;
        this.notifService.push(notif);
        this.snackBar.open(`Meeting ${event.roomName} starts ${minsText}`, 'Join', {
            duration: 10000, panelClass: ['snack-success'], horizontalPosition: 'end',
        }).onAction().subscribe(() => {
            if (event.meetingLink) window.open(event.meetingLink, '_blank');
        });
        const shortText = `Reminder: meeting ${event.roomName} starts ${minsText}. Your meeting link is ready.`;
        const fullText  = `Your meeting ${event.roomName} starts ${minsText}. Click join in the notification panel to open the meeting link.`;
        this._voiceAnnounce(shortText, fullText);
    }

    private announceNotificationTTS(event: ScheduledNotificationEvent): void {
        const userId = this.authService.currentUser()?.id;
        if (!userId) return;
        if (localStorage.getItem(`chat_notifications_muted_${userId}`) === 'true') return;

        if (!('speechSynthesis' in window)) {
            this.playFallbackBeep(event.type);
            return;
        }

        // Cancel any in-progress speech and pending R-key listener
        window.speechSynthesis.cancel();
        if (this.ttsKeyHandler) { document.removeEventListener('keydown', this.ttsKeyHandler); this.ttsKeyHandler = null; }
        if (this.ttsKeyTimeout) { clearTimeout(this.ttsKeyTimeout); this.ttsKeyTimeout = null; }

        const makeUtterance = (text: string): SpeechSynthesisUtterance => {
            const u = new SpeechSynthesisUtterance(text);
            u.rate = 1.1;
            u.pitch = 1.0;
            u.volume = 0.8;
            u.lang = 'en-US';
            const preferred = this.availableVoices.find(v =>
                v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Karen'));
            if (preferred) u.voice = preferred;
            return u;
        };

        const shortText = this.getTTSShortText(event.type, event.roomName);
        const fullText  = this.getTTSFullText(event.type, event.roomName, event.messagePreview ?? '');

        const announcement = makeUtterance(shortText);
        announcement.onend = () => {
            const prompt = makeUtterance('Press R to hear the full notification or dismiss');
            prompt.onend = () => {
                this.ttsKeyHandler = (e: KeyboardEvent) => {
                    if (e.key !== 'r' && e.key !== 'R') return;
                    if (this.ttsKeyHandler) { document.removeEventListener('keydown', this.ttsKeyHandler); this.ttsKeyHandler = null; }
                    if (this.ttsKeyTimeout) { clearTimeout(this.ttsKeyTimeout); this.ttsKeyTimeout = null; }
                    window.speechSynthesis.speak(makeUtterance(fullText));
                };
                document.addEventListener('keydown', this.ttsKeyHandler);
                this.ttsKeyTimeout = setTimeout(() => {
                    if (this.ttsKeyHandler) { document.removeEventListener('keydown', this.ttsKeyHandler); this.ttsKeyHandler = null; }
                    this.ttsKeyTimeout = null;
                }, 5000);
            };
            window.speechSynthesis.speak(prompt);
        };
        window.speechSynthesis.speak(announcement);
    }

    private getTTSShortText(type: string, roomName: string): string {
        if (type === 'SCHEDULED_SENT')     return `New notification: your scheduled message was sent to ${roomName}`;
        if (type === 'SCHEDULED_REMINDER') return `New notification: reminder, your message sends in 15 minutes in ${roomName}`;
        return `New notification: your scheduled message failed in ${roomName}`;
    }

    private getTTSFullText(type: string, roomName: string, preview: string): string {
        const p    = preview.slice(0, 40);
        const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        if (type === 'SCHEDULED_SENT')     return `Your message ${p} was successfully sent to the chatroom ${roomName} at ${time}`;
        if (type === 'SCHEDULED_REMINDER') return `Reminder: your message ${p} is scheduled to be sent to ${roomName} in 15 minutes`;
        return `Your scheduled message ${p} in ${roomName} has failed to send. Please retry from the notification panel`;
    }

    private playFallbackBeep(type: 'SCHEDULED_SENT' | 'SCHEDULED_REMINDER' | 'SCHEDULED_FAILED'): void {
        const playBeep = (freq: number): void => {
            const ctx = new AudioContext();
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);
            oscillator.frequency.setValueAtTime(freq, ctx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(freq / 2, ctx.currentTime + 0.1);
            gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + 0.4);
        };
        const freq = type === 'SCHEDULED_REMINDER' ? 1100 : 880;
        const doPlay = () => {
            playBeep(freq);
            if (type === 'SCHEDULED_FAILED') setTimeout(() => playBeep(freq), 300);
        };
        const testCtx = new AudioContext();
        const suspended = testCtx.state === 'suspended';
        testCtx.close();
        if (!suspended) { doPlay(); } else { this.pendingSound = doPlay; }
    }

    translateMsg(message: MessageDTO): void {
        const state = this.translationMap().get(message.id);
        if (state?.translated) {
            // Already translated — just toggle visibility
            const m = new Map(this.translationMap());
            m.set(message.id, { ...state, showTranslation: !state.showTranslation });
            this.translationMap.set(m);
            return;
        }
        // First time: fetch translation
        const m = new Map(this.translationMap());
        m.set(message.id, { translated: '', showTranslation: false, loading: true });
        this.translationMap.set(m);

        const text = this.stripHtml(message.contentText ?? '');
        this.chatMessageService.translateMessage(text).subscribe({
            next: (translated) => {
                const m2 = new Map(this.translationMap());
                m2.set(message.id, { translated, showTranslation: true, loading: false });
                this.translationMap.set(m2);
                const roomId = this.activeRoom()?.id;
                if (roomId != null) {
                    this.translatedRooms.update(s => new Set([...s, roomId]));
                }
            },
            error: (err: any) => {
                console.error('[Translation] failed:', err);
                const m2 = new Map(this.translationMap());
                m2.delete(message.id);
                this.translationMap.set(m2);
                this.notify('Translation failed, please try again', true);
            },
        });
    }

    stripHtml(html: string): string {
        return html?.replace(/<[^>]*>/g, '') ?? '';
    }

    groupReactions(reactions: ReactionDTO[] | undefined): { emoji: string; count: number; myReaction: boolean }[] {
        if (!reactions?.length) return [];
        const myId = this.currentUser?.id;
        const map = new Map<string, { count: number; myReaction: boolean }>();
        for (const r of reactions) {
            const entry = map.get(r.emoji) ?? { count: 0, myReaction: false };
            entry.count++;
            if (r.userId === myId) entry.myReaction = true;
            map.set(r.emoji, entry);
        }
        return Array.from(map.entries()).map(([emoji, v]) => ({ emoji, count: v.count, myReaction: v.myReaction }));
    }

    // ── Rich input ─────────────────────────────────────────────────

    onQuillChange(event: any): void {
        this.richContent = event.html ?? '';
        if (event.source === 'user') {
            this._detectMention(event.quill ?? this.quillRef?.quillEditor);
        }
    }

    private _detectMention(quill: any): void {
        if (!quill) return;
        const sel = quill.getSelection();
        if (!sel) return;
        const text = quill.getText(0, sel.index);
        const lastSpaceIdx = Math.max(text.lastIndexOf(' '), text.lastIndexOf('\n'));
        const currentWord = lastSpaceIdx === -1 ? text : text.slice(lastSpaceIdx + 1);
        if (currentWord.startsWith('@')) {
            const query = currentWord.slice(1);
            this.mentionQuery.set(query);
            const filtered = this.roomMembers().filter(m =>
                m.fullName.toLowerCase().includes(query.toLowerCase())
            );
            this.mentionSuggestions.set(filtered);
            this.showMentionSuggestions.set(filtered.length > 0);
            this.activeMentionIndex.set(0);
        } else {
            this.showMentionSuggestions.set(false);
        }
    }

    selectMention(member: {id: number, fullName: string, role: string} | undefined): void {
        if (!member) return;
        const quill = this.quillRef?.quillEditor;
        if (!quill) return;
        const sel = quill.getSelection();
        if (!sel) return;
        const text = quill.getText(0, sel.index);
        const lastSpaceIdx = Math.max(text.lastIndexOf(' '), text.lastIndexOf('\n'));
        const wordStart = lastSpaceIdx === -1 ? 0 : lastSpaceIdx + 1;
        const atWordLen = sel.index - wordStart;
        // Delete the @query text
        quill.deleteText(wordStart, atWordLen, 'user');
        // Insert the mention as colored text with a mention-chip marker
        const mentionText = `@${member.fullName}`;
        quill.insertText(wordStart, mentionText, { 'color': 'var(--mat-sys-primary)' }, 'user');
        quill.insertText(wordStart + mentionText.length, ' ', { 'color': false }, 'user');
        quill.setSelection(wordStart + mentionText.length + 1, 0, 'user');
        this.showMentionSuggestions.set(false);
        this.mentionQuery.set('');
        this.activeMentionIndex.set(0);
    }

    get hasText(): boolean {
        const stripped = this.richContent?.replace(/<[^>]*>/g, '').trim();
        return (stripped?.length ?? 0) > 0;
    }

    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;
        if (file.size > 40 * 1024 * 1024) {
            this.notify('File exceeds 40 MB limit.', true);
            return;
        }
        this.selectedFile = file;
        // reset input so same file can be re-selected if removed
        input.value = '';
    }

    removeFile(): void {
        this.selectedFile = null;
    }

    formatBytes(bytes: number): string {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    insertEmoji(emoji: string): void {
        const quill = this.quillRef?.quillEditor;
        if (!quill) return;
        const range = quill.getSelection(true);
        quill.insertText(range.index, emoji);
        quill.setSelection(range.index + emoji.length);
        this.emojiPickerOpen.set(false);
    }

    insertMention(): void {
        const quill = this.quillRef?.quillEditor;
        if (!quill) return;
        const range = quill.getSelection(true);
        quill.insertText(range.index, '@');
        quill.setSelection(range.index + 1);
        quill.focus();
    }

    async sendRichMessage(): Promise<void> {
        const roomId = this.activeRoom()?.id;
        if (!roomId) return;
        if (!this.hasText && !this.selectedFile) return;

        if (this.selectedFile) {
            const formData = new FormData();
            if (this.richContent) formData.append('content', this.richContent);
            formData.append('file', this.selectedFile);
            this.chatMessageService.uploadMessage(roomId, formData).subscribe({
                next: () => this.clearInput(),
                error: (err) => this.notify(err?.error?.message ?? 'Upload failed.', true),
            });
        } else {
            this.chatMessageService.sendMessage(roomId, this.richContent);
            this.clearInput();
        }
    }

    private clearInput(): void {
        this.richContent = '';
        this.selectedFile = null;
        try { this.quillRef?.quillEditor?.setContents([]); } catch { /* view not ready */ }
    }

    isImage(mimeType?: string | null): boolean {
        return !!mimeType?.startsWith('image/');
    }

    isAudio(fileType?: string): boolean {
        return !!fileType && fileType.startsWith('audio/');
    }

    isVideo(fileType?: string): boolean {
        return !!fileType && fileType.startsWith('video/');
    }

    // ── Reply ───────────────────────────────────────────────────────
    setReply(message: MessageDTO): void {
        this.replyingTo.set(message);
    }
    cancelReply(): void {
        this.replyingTo.set(null);
    }

    // ── Edit ────────────────────────────────────────────────────────
    startEdit(message: MessageDTO): void {
        this.editingMessage.set(message);
        this.editContent.set(message.contentText ?? '');
    }
    cancelEdit(): void {
        this.editingMessage.set(null);
        this.editContent.set('');
    }
    saveEdit(): void {
        const msg = this.editingMessage();
        const content = this.editContent();
        const roomId = this.activeRoom()?.id;
        if (!msg || !content || !roomId || content === msg.contentText) return;
        this.chatMessageService.editMessage(roomId, msg.id, content).subscribe({
            next: () => {
                this.editingMessage.set(null);
                this.editContent.set('');
            },
            error: (err) => this.notify(err?.error?.message ?? 'Failed to edit message.', true),
        });
    }

    // ── Audio player ────────────────────────────────────────────────
    onAudioMetadata(id: number, el: HTMLAudioElement): void {
        this.audioMap.set(id, el);
        const m = new Map(this.audioDurationMap());
        m.set(id, isFinite(el.duration) ? el.duration : 0);
        this.audioDurationMap.set(m);
    }

    toggleAudioPlayback(messageId: number, el: HTMLAudioElement): void {
        const current = this.playingAudioId();
        if (this.audioProgressInterval) {
            clearInterval(this.audioProgressInterval);
            this.audioProgressInterval = null;
        }
        if (current !== null && current !== messageId) {
            this.audioMap.get(current)?.pause();
        }
        if (current === messageId) {
            el.pause();
            this.playingAudioId.set(null);
        } else {
            this.audioMap.set(messageId, el);
            el.play().catch(() => {});
            this.playingAudioId.set(messageId);
            this.audioCurrentTime.set(el.currentTime);
            this.audioProgressInterval = setInterval(() => {
                this.audioCurrentTime.set(el.currentTime);
            }, 500);
        }
    }

    onAudioEnded(messageId: number): void {
        if (this.audioProgressInterval) {
            clearInterval(this.audioProgressInterval);
            this.audioProgressInterval = null;
        }
        if (this.playingAudioId() === messageId) {
            this.playingAudioId.set(null);
            this.audioCurrentTime.set(0);
        }
    }

    getWaveformHeights(messageId: number): number[] {
        const result: number[] = [];
        let s = messageId;
        for (let i = 0; i < 20; i++) {
            s = (s * 1664525 + 1013904223) & 0xffffffff;
            result.push(4 + (Math.abs(s) % 20));
        }
        return result;
    }

    formatAudioTime(seconds: number): string {
        if (!isFinite(seconds) || seconds <= 0) return '0:00';
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    formatRecordingDuration(seconds: number): string {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    async startRecording(): Promise<void> {
        if (!this.activeRoom()) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.audioChunks = [];
            this.mediaRecorder = new MediaRecorder(stream);
            this.mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) this.audioChunks.push(e.data);
            };
            this.mediaRecorder.start();
            this.isRecording.set(true);
            this.recordingDuration.set(0);
            this.recordingInterval = setInterval(() => {
                this.recordingDuration.update(d => d + 1);
            }, 1000);

            // Start SpeechRecognition in parallel if available
            const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognitionCtor) {
                this.sttAvailable = true;
                this.liveTranscript.set('');
                this.finalTranscript.set('');
                this.speechRecognition = new SpeechRecognitionCtor();
                this.speechRecognition.continuous = true;
                this.speechRecognition.interimResults = true;
                this.speechRecognition.lang = 'en-US';
                this.speechRecognition.onresult = (event: any) => {
                    let interim = '';
                    let final = '';
                    for (let i = event.resultIndex; i < event.results.length; i++) {
                        if (event.results[i].isFinal) {
                            final += event.results[i][0].transcript;
                        } else {
                            interim += event.results[i][0].transcript;
                        }
                    }
                    this.liveTranscript.set(interim);
                    if (final) this.finalTranscript.update(prev => prev + final);
                };
                this.speechRecognition.onerror = () => { /* ignore recognition errors silently */ };
                try { this.speechRecognition.start(); } catch { /* ignore */ }
            } else {
                this.sttAvailable = false;
            }
        } catch {
            this.snackBar.open('Microphone permission denied.', 'Dismiss', { duration: 3000 });
        }
    }

    cancelRecording(): void {
        if (this.speechRecognition) {
            try { this.speechRecognition.stop(); } catch { /* ignore */ }
            this.speechRecognition = null;
        }
        this._stopRecorderAndStream();
        this.audioChunks = [];
        this.pendingAudioFile = null;
        this._resetRecordingState();
        this.finalTranscript.set('');
    }

    sendRecording(): void {
        if (!this.mediaRecorder) return;
        // Stop SpeechRecognition before stopping the recorder
        if (this.speechRecognition) {
            try { this.speechRecognition.stop(); } catch { /* ignore */ }
            this.speechRecognition = null;
        }
        const hadStt = this.sttAvailable;
        this.mediaRecorder.onstop = () => {
            const mimeType = this.mediaRecorder?.mimeType ?? 'audio/webm';
            const ext = mimeType.includes('ogg') ? '.ogg' : mimeType.includes('mp4') ? '.mp4' : '.webm';
            const blob = new Blob(this.audioChunks, { type: mimeType });
            const file = new File([blob], `voice-message${ext}`, { type: mimeType });
            this.audioChunks = [];
            this._resetRecordingState();
            if (hadStt) {
                // STT available — let user choose how to send
                this.pendingAudioFile = file;
                this._openSttChoiceModal();
            } else {
                // No STT — upload audio directly as before
                const formData = new FormData();
                formData.append('file', file);
                formData.append('content', '');
                this.chatMessageService.uploadMessage(this.activeRoom()!.id, formData).subscribe({
                    error: () => this.snackBar.open('Failed to send voice message.', 'Dismiss', { duration: 3000 }),
                });
            }
        };
        this._stopRecorderAndStream();
    }

    private _stopRecorderAndStream(): void {
        if (this.recordingInterval) { clearInterval(this.recordingInterval); this.recordingInterval = null; }
        if (this.mediaRecorder) {
            this.mediaRecorder.stream?.getTracks().forEach(t => t.stop());
            if (this.mediaRecorder.state !== 'inactive') this.mediaRecorder.stop();
        }
    }

    private _resetRecordingState(): void {
        this.isRecording.set(false);
        this.recordingDuration.set(0);
        this.mediaRecorder = null;
        this.liveTranscript.set('');
    }

    private _openSttChoiceModal(): void {
        const ref = this.dialog.open(VoiceSendChoiceDialogComponent, {
            data: { transcript: this.finalTranscript() },
            width: '520px',
            maxWidth: '95vw',
            panelClass: 'delete-room-dialog-panel',
            disableClose: true,
            enterAnimationDuration: '0ms',
            exitAnimationDuration: '0ms',
        });
        ref.afterClosed().subscribe((result: { choice: 'voice' | 'text' | 'cancel' } | undefined) => {
            if (!result || result.choice === 'cancel') {
                this.pendingAudioFile = null;
                this.finalTranscript.set('');
                return;
            }
            if (result.choice === 'voice') {
                this._sendPendingVoice();
            } else if (result.choice === 'text') {
                this._sendTranscriptAsText();
            }
        });
    }

    private _sendPendingVoice(): void {
        if (!this.pendingAudioFile || !this.activeRoom()) return;
        const formData = new FormData();
        formData.append('file', this.pendingAudioFile);
        formData.append('content', '');
        this.chatMessageService.uploadMessage(this.activeRoom()!.id, formData).subscribe({
            error: () => this.snackBar.open('Failed to send voice message.', 'Dismiss', { duration: 3000 }),
        });
        this.pendingAudioFile = null;
        this.finalTranscript.set('');
    }

    private _sendTranscriptAsText(): void {
        const text = this.finalTranscript().trim();
        if (!text || !this.activeRoom()) return;
        this.chatMessageService.sendMessage(this.activeRoom()!.id, text);
        this.pendingAudioFile = null;
        this.finalTranscript.set('');
    }

    // ── Video recording ─────────────────────────────────────────────
    /** Open camera preview — entry point from the video button. */
    async startVideoRecording(): Promise<void> {
        if (!this.activeRoom()) return;
        try {
            const constraints = this._videoConstraints();
            this.videoStream = await navigator.mediaDevices.getUserMedia(constraints);
            this.videoPhase.set('preview');
            this.isRecordingVideo.set(true);
            this._attachCameraPreview();
        } catch {
            this.snackBar.open('Camera/microphone permission denied.', 'Dismiss', { duration: 3000 });
        }
    }

    /** Switch between front and rear camera while in preview. */
    async switchVideoCamera(): Promise<void> {
        const newFacing: 'user' | 'environment' =
            this.videoCameraFacing() === 'user' ? 'environment' : 'user';
        this.videoCameraFacing.set(newFacing);
        if (this.videoStream) {
            this.videoStream.getTracks().forEach(t => t.stop());
        }
        try {
            const constraints = this._videoConstraints();
            this.videoStream = await navigator.mediaDevices.getUserMedia(constraints);
            this._attachCameraPreview();
        } catch { /* ignore if rear cam unavailable */ }
    }

    /** Start the 3-2-1-🎬 countdown before recording. */
    startVideoCountdown(): void {
        this.videoPhase.set('countdown');
        this.videoCountdownTimeouts.forEach(t => clearTimeout(t));
        this.videoCountdownTimeouts = [];
        const steps: (number | string)[] = [3, 2, 1, '🎬'];
        steps.forEach((val, i) => {
            const t = setTimeout(() => {
                this.videoCountdown.set(val);
                if (i === steps.length - 1) {
                    const t2 = setTimeout(() => this._startActualRecording(), 700);
                    this.videoCountdownTimeouts.push(t2);
                }
            }, i * 900);
            this.videoCountdownTimeouts.push(t);
        });
        this.videoCountdown.set(3);
    }

    /** Cancel at any phase — stops stream and closes the card. */
    cancelVideoRecording(): void {
        this._cleanupVideoAudio();
        this._stopVideoRecorderAndStream();
        this.videoChunks = [];
        this._revokeRecordedUrl();
        this._resetVideoRecordingState();
    }

    /** Toggle pause/resume during recording. */
    toggleVideoPause(): void {
        if (!this.videoMediaRecorder) return;
        if (this.videoMediaRecorder.state === 'recording') {
            this.videoMediaRecorder.pause();
            this.videoIsPaused.set(true);
            if (this.videoRecordingInterval) { clearInterval(this.videoRecordingInterval); this.videoRecordingInterval = null; }
            if (this.audioAnimFrame) { cancelAnimationFrame(this.audioAnimFrame); this.audioAnimFrame = null; }
        } else if (this.videoMediaRecorder.state === 'paused') {
            this.videoMediaRecorder.resume();
            this.videoIsPaused.set(false);
            this.videoRecordingInterval = setInterval(() => this.videoRecordingDuration.update(d => d + 1), 1000);
            this._runAudioLoop();
        }
    }

    /** Stop recording, build blob URL, transition to REVIEW. */
    stopVideoRecording(): void {
        if (!this.videoMediaRecorder) return;
        if (this.videoRecordingInterval) { clearInterval(this.videoRecordingInterval); this.videoRecordingInterval = null; }
        this._cleanupVideoAudio();
        const finalize = () => {
            const mimeType = this.videoMediaRecorder?.mimeType ?? 'video/webm';
            const blob = new Blob(this.videoChunks, { type: mimeType });
            const url = URL.createObjectURL(blob);
            this.recordedBlobUrl.set(url);
            this.videoPhase.set('review');
            // Stop camera tracks now — preview is done
            if (this.videoStream) { this.videoStream.getTracks().forEach(t => t.stop()); this.videoStream = null; }
        };
        if (this.videoMediaRecorder.state !== 'inactive') {
            this.videoMediaRecorder.onstop = finalize;
            this.videoMediaRecorder.stop();
        } else {
            // Recorder already stopped (e.g. auto-stopped at 2 min) — finalize directly
            finalize();
        }
    }

    /** Discard current recording, go back to preview with camera open. */
    async reRecordVideo(): Promise<void> {
        this._revokeRecordedUrl();
        this.videoChunks = [];
        this.videoCaption = '';
        this.videoIsPaused.set(false);
        this.videoRecordingDuration.set(0);
        this.videoMediaRecorder = null;
        try {
            this.videoStream = await navigator.mediaDevices.getUserMedia(this._videoConstraints());
            this.videoPhase.set('preview');
            this._attachCameraPreview();
        } catch {
            this.snackBar.open('Camera/microphone permission denied.', 'Dismiss', { duration: 3000 });
            this._resetVideoRecordingState();
        }
    }

    /** Upload the reviewed video blob via the existing upload endpoint. */
    sendReviewedVideo(): void {
        const url = this.recordedBlobUrl();
        if (!url || !this.activeRoom()) return;
        fetch(url).then(r => r.blob()).then(blob => {
            const ext = blob.type.includes('mp4') ? '.mp4' : '.webm';
            const file = new File([blob], `video-message${ext}`, { type: blob.type });
            const formData = new FormData();
            formData.append('file', file);
            formData.append('content', this.videoCaption.trim());
            this.chatMessageService.uploadMessage(this.activeRoom()!.id, formData).subscribe({
                next: () => this.snackBar.open('Video sent!', undefined, { duration: 2000 }),
                error: () => this.snackBar.open('Failed to send video.', 'Dismiss', { duration: 3000 }),
            });
            this._revokeRecordedUrl();
            this.videoChunks = [];
            this.videoCaption = '';
            this._resetVideoRecordingState();
        });
    }

    /** Set up Web Audio AnalyserNode and start the animation loop. */
    setupAudioAnalyser(stream: MediaStream): void {
        try {
            this.audioCtx = new AudioContext();
            const source = this.audioCtx.createMediaStreamSource(stream);
            this.audioAnalyser = this.audioCtx.createAnalyser();
            this.audioAnalyser.fftSize = 64;
            source.connect(this.audioAnalyser);
            this._runAudioLoop();
        } catch { /* not critical */ }
    }

    private _runAudioLoop(): void {
        if (!this.audioAnalyser) return;
        const dataArray = new Uint8Array(this.audioAnalyser.frequencyBinCount);
        const update = () => {
            this.audioAnalyser!.getByteFrequencyData(dataArray);
            this.audioBars.set(Array.from(dataArray.slice(0, 16)));
            if (this.videoPhase() === 'recording' && !this.videoIsPaused()) {
                this.audioAnimFrame = requestAnimationFrame(update);
            }
        };
        update();
    }

    private _startActualRecording(): void {
        if (!this.videoStream) return;
        this.videoChunks = [];
        this.videoMediaRecorder = new MediaRecorder(this.videoStream);
        this.videoMediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) this.videoChunks.push(e.data);
        };
        this.videoMediaRecorder.start();
        this.videoPhase.set('recording');
        this.videoIsPaused.set(false);
        this.videoRecordingDuration.set(0);
        this.videoRecordingInterval = setInterval(() => {
            this.videoRecordingDuration.update(d => d + 1);
            // Auto-stop at 2 minutes
            if (this.videoRecordingDuration() >= 120) this.stopVideoRecording();
        }, 1000);
        this.setupAudioAnalyser(this.videoStream);
    }

    private _videoConstraints(): MediaStreamConstraints {
        const q = this.videoQuality();
        const w = q === '1080p' ? 1920 : q === '720p' ? 1280 : 854;
        const h = q === '1080p' ? 1080 : q === '720p' ? 720  : 480;
        return { video: { facingMode: this.videoCameraFacing(), width: { ideal: w }, height: { ideal: h } }, audio: true };
    }

    private _attachCameraPreview(): void {
        setTimeout(() => {
            if (this.videoPreviewRef?.nativeElement && this.videoStream) {
                this.videoPreviewRef.nativeElement.srcObject = this.videoStream;
            }
        }, 50);
    }

    private _cleanupVideoAudio(): void {
        if (this.audioAnimFrame) { cancelAnimationFrame(this.audioAnimFrame); this.audioAnimFrame = null; }
        if (this.audioCtx) { this.audioCtx.close().catch(() => {}); this.audioCtx = null; }
        this.audioAnalyser = null;
        this.audioBars.set(new Array(16).fill(0));
        this.videoCountdownTimeouts.forEach(t => clearTimeout(t));
        this.videoCountdownTimeouts = [];
    }

    private _revokeRecordedUrl(): void {
        const url = this.recordedBlobUrl();
        if (url) { URL.revokeObjectURL(url); this.recordedBlobUrl.set(''); }
    }

    private _stopVideoRecorderAndStream(): void {
        if (this.videoRecordingInterval) { clearInterval(this.videoRecordingInterval); this.videoRecordingInterval = null; }
        if (this.videoStream) { this.videoStream.getTracks().forEach(t => t.stop()); this.videoStream = null; }
        if (this.videoMediaRecorder && this.videoMediaRecorder.state !== 'inactive') {
            this.videoMediaRecorder.stop();
        }
    }

    private _resetVideoRecordingState(): void {
        this.videoPhase.set('idle');
        this.isRecordingVideo.set(false);
        this.videoRecordingDuration.set(0);
        this.videoIsPaused.set(false);
        this.videoMediaRecorder = null;
    }

    // ── Video playback ──────────────────────────────────────────────
    onVideoMetadata(msgId: number, el: HTMLVideoElement): void {
        if (isFinite(el.duration) && el.duration > 0) {
            this.videoDurationMap.update(m => { const n = new Map(m); n.set(msgId, el.duration); return n; });
        }
    }

    onVideoTimeUpdate(msgId: number, el: HTMLVideoElement): void {
        this.videoCurrentTimeMap.update(m => { const n = new Map(m); n.set(msgId, el.currentTime); return n; });
    }

    onVideoEnded(msgId: number): void {
        this.playingVideoId.set(null);
    }

    toggleVideoPlayback(msgId: number, el: HTMLVideoElement): void {
        if (el.paused) {
            el.play();
            this.playingVideoId.set(msgId);
        } else {
            el.pause();
            this.playingVideoId.set(null);
        }
    }

    getVideoProgress(msgId: number): number {
        const duration = this.videoDurationMap().get(msgId) ?? 0;
        const current  = this.videoCurrentTimeMap().get(msgId) ?? 0;
        if (!duration) return 0;
        return (current / duration) * 100;
    }

    getFileDownloadUrl(fileUrl: string): string {
        return `http://localhost:8084${fileUrl}`;
    }

    innersidebar(): void {
        const body = this.document.body;
        const cls = 'innermenu-close';
        if (body.classList.contains(cls)) {
            this.renderer.removeClass(body, cls);
        } else {
            this.renderer.addClass(body, cls);
        }
    }
}
