import {
    Component, OnInit, signal, computed,
    Renderer2, Inject, DOCUMENT, CUSTOM_ELEMENTS_SCHEMA
} from "@angular/core";
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
import { ChatRoomService, ChatRoom, ChatRoomPayload, RoomType, ProjectDTO } from "./chat-room.service";
import { ChatRoomMemberService, RoomMemberDTO } from "./chat-room-member.service";
import { AuthService } from "../../../../auth/auth.service";
import { UserService, UserDTO } from "../../../../users/user.service";

interface LocalMessage {
    sender: "user" | "other";
    content: string;
    time: string;
    status: string;
}

@Component({
    selector: "app-chat",
    standalone: true,
    imports: [
        CommonModule, FormsModule,
        MatListModule, MatMenuModule, MatIconModule,
        MatInputModule, MatFormFieldModule, MatCardModule,
        MatToolbarModule, MatButtonModule,
        MatSelectModule, MatProgressSpinnerModule,
        MatSnackBarModule,
    ],
    template: `
        <div class="container-fluid fade-in mb-3 mb-lg-4">
            <mat-card class="bg-light-theme shadow-none pt-3 pb-lg-3 px-3">
                <div class="row gx-3 align-items-center">
                    <div class="col mb-3 mb-xl-0 py-1">
                        <h3 class="mb-1">Chat Rooms</h3>
                        <p class="text-secondary small">Manage and communicate in your rooms</p>
                    </div>
                    <div class="col-auto mb-3 mb-xl-0">
                        <app-page-right></app-page-right>
                    </div>
                </div>
            </mat-card>
        </div>

        <div class="container">
            <div class="inner-sidebar-wrap">

                <!-- LEFT: room list / form -->
                <div class="inner-sidebar px-0">
                    <div class="p-3">
                        <div class="row gx-2 align-items-center mb-2">
                            <div class="col-auto d-lg-none">
                                <button matIconButton (click)="innersidebar()" aria-label="Back">
                                    <mat-icon class="material-icons-outlined">arrow_back</mat-icon>
                                </button>
                            </div>
                            <div class="col">
                                <span class="fw-semibold">Rooms</span>
                            </div>
                            @if (!showForm()) {
                                <div class="col-auto">
                                    <button matIconButton (click)="openCreate()" title="New room">
                                        <mat-icon>add</mat-icon>
                                    </button>
                                    <button matIconButton (click)="loadRooms()" title="Refresh" [disabled]="loading()">
                                        <mat-icon class="material-icons-outlined">refresh</mat-icon>
                                    </button>
                                </div>
                            }
                        </div>

                        @if (!showForm()) {
                            <mat-form-field appearance="outline" class="w-100 inline-small">
                                <mat-label>Search rooms...</mat-label>
                                <input matInput
                                       [ngModel]="searchQuery()"
                                       (ngModelChange)="searchQuery.set($event)"
                                       placeholder="Search..." />
                                <mat-icon matSuffix>search</mat-icon>
                            </mat-form-field>
                        }
                    </div>

                    <!-- Global error -->
                    @if (error()) {
                        <div class="chat-error px-3 py-2 mb-1">
                            <mat-icon class="material-icons-outlined" style="font-size:16px;width:16px;height:16px">error_outline</mat-icon>
                            {{ error() }}
                        </div>
                    }

                    <!-- Create / Edit form -->
                    @if (showForm()) {
                        <div class="p-3">
                            <h6 class="mb-3">{{ editingRoom() ? 'Edit Room' : 'New Room' }}</h6>

                            @if (formError) {
                                <div class="chat-error mb-2 p-2">{{ formError }}</div>
                            }

                            <mat-form-field appearance="outline" class="w-100 mb-2">
                                <mat-label>Project *</mat-label>
                                <mat-select [(ngModel)]="formProjectId">
                                    @for (p of projects; track p.id) {
                                        <mat-option [value]="p.id">{{ p.name }}</mat-option>
                                    }
                                </mat-select>
                            </mat-form-field>

                            <mat-form-field appearance="outline" class="w-100 mb-2">
                                <mat-label>Name *</mat-label>
                                <input matInput [(ngModel)]="formName" />
                            </mat-form-field>

                            <mat-form-field appearance="outline" class="w-100 mb-2">
                                <mat-label>Description</mat-label>
                                <textarea matInput [(ngModel)]="formDescription" rows="2"></textarea>
                            </mat-form-field>

                            <mat-form-field appearance="outline" class="w-100 mb-3">
                                <mat-label>Room Type</mat-label>
                                <mat-select [(ngModel)]="formRoomType">
                                    @for (t of roomTypes; track t.value) {
                                        <mat-option [value]="t.value">{{ t.label }}</mat-option>
                                    }
                                </mat-select>
                            </mat-form-field>

                            <div class="row gx-2">
                                <div class="col">
                                    <button matButton="filled" color="primary" class="w-100"
                                            (click)="saveRoom()" [disabled]="saving()">
                                        {{ saving() ? 'Saving...' : (editingRoom() ? 'Update' : 'Create') }}
                                    </button>
                                </div>
                                <div class="col-auto">
                                    <button matButton (click)="cancelForm()" [disabled]="saving()">Cancel</button>
                                </div>
                            </div>
                        </div>
                    }

                    <!-- Rooms list -->
                    @if (!showForm()) {
                        <div class="overflow-y-auto height-dynamic" style="--h-dynamic:calc(100vh - 340px)">
                            @if (loading()) {
                                <div class="text-center py-4">
                                    <mat-spinner diameter="28"></mat-spinner>
                                </div>
                            } @else {
                                <mat-nav-list class="contact-list">
                                    @for (room of filteredRooms(); track room.id) {
                                        <mat-list-item (click)="selectRoom(room)"
                                                       [class.active-contact]="activeRoom()?.id === room.id">
                                            <div class="w-100 py-1">
                                                @if (deleteConfirmId() === room.id) {
                                                    <p class="small mb-2">Delete <strong>{{ room.name }}</strong>?</p>
                                                    <div class="row gx-2">
                                                        <div class="col">
                                                            <button matButton="filled" color="warn" class="w-100"
                                                                    (click)="doDelete(room.id, $event)">
                                                                Delete
                                                            </button>
                                                        </div>
                                                        <div class="col-auto">
                                                            <button matButton (click)="cancelDelete($event)">Cancel</button>
                                                        </div>
                                                    </div>
                                                } @else {
                                                    <div class="row gx-2 align-items-center">
                                                        <div class="col overflow-hidden">
                                                            <p class="mb-0 fw-medium text-truncate">{{ room.name }}</p>
                                                            <p class="opacity-75 small mb-0 text-truncate">
                                                                <span class="room-type-pill">{{ getRoomTypeLabel(room.roomType) }}</span>
                                                                @if (room.description) {
                                                                    &nbsp;{{ room.description }}
                                                                }
                                                            </p>
                                                        </div>
                                                        <div class="col-auto room-actions">
                                                            <button matIconButton (click)="openEdit(room, $event)" title="Edit">
                                                                <mat-icon class="material-icons-outlined" style="font-size:18px;width:18px;height:18px">edit</mat-icon>
                                                            </button>
                                                            <button matIconButton (click)="confirmDelete(room.id, $event)" title="Delete">
                                                                <mat-icon class="material-icons-outlined theme-red" style="font-size:18px;width:18px;height:18px">delete</mat-icon>
                                                            </button>
                                                        </div>
                                                    </div>
                                                }
                                            </div>
                                        </mat-list-item>
                                    } @empty {
                                        <p class="px-3 py-2 opacity-75 small">
                                            {{ searchQuery() ? 'No rooms match your search.' : 'No rooms yet. Click + to create one.' }}
                                        </p>
                                    }
                                </mat-nav-list>
                            }
                        </div>
                    }
                </div>

                <!-- RIGHT: room detail + messages -->
                <div class="inner-sidebar-content pb-1">
                    <mat-card *ngIf="activeRoom()" class="w-100 height-dynamic" style="--h-dynamic:calc(100vh - 250px)">
                        <mat-card-header>
                            <div class="w-100">
                                <div class="row gx-3 align-items-center mb-3">
                                    <div class="col-auto">
                                        <button matIconButton (click)="innersidebar()" aria-label="Rooms list">
                                            <mat-icon class="material-icons-outlined">notes</mat-icon>
                                        </button>
                                    </div>
                                    <div class="col">
                                        <p class="mb-0 fw-bold">{{ activeRoom()?.name }}</p>
                                        <p class="opacity-75 small mb-0">
                                            <span class="room-type-pill">{{ getRoomTypeLabel(activeRoom()?.roomType ?? '') }}</span>
                                            &nbsp;by {{ activeRoom()?.createdByName }}
                                        </p>
                                    </div>
                                    <div class="col-auto">
                                        <button matIconButton (click)="toggleSearch()">
                                            @if (isSearchVisible()) {
                                                <mat-icon class="material-icons-outlined">close</mat-icon>
                                            } @else {
                                                <mat-icon class="material-icons-outlined">search</mat-icon>
                                            }
                                        </button>
                                    </div>
                                    <div class="col-auto">
                                        <button matIconButton [matMenuTriggerFor]="actionsMenu"
                                                (click)="$event.stopPropagation()">
                                            <mat-icon class="material-icons-outlined">more_vert</mat-icon>
                                        </button>
                                        <mat-menu #actionsMenu="matMenu" xPosition="before">
                                            <button mat-menu-item (click)="openEdit(activeRoom()!, $event)">
                                                <mat-icon class="material-icons-outlined">edit</mat-icon>
                                                <span>Edit Room</span>
                                            </button>
                                            <button mat-menu-item (click)="confirmDelete(activeRoom()!.id, $event)"
                                                    class="theme-red">
                                                <mat-icon class="material-icons-outlined">delete</mat-icon>
                                                <span>Delete Room</span>
                                            </button>
                                        </mat-menu>
                                    </div>
                                </div>

                                @if (activeRoom()?.description) {
                                    <p class="text-secondary small mb-3 px-1">{{ activeRoom()?.description }}</p>
                                }

                                @if (activeRoom()?.projectId) {
                                    <p class="text-secondary small mb-3 px-1">
                                        <span class="fw-semibold">Project:</span>
                                        {{ getProjectName(activeRoom()!.projectId) }}
                                    </p>
                                }

                                <!-- ── Members panel (MANAGER / TUTOR only) ─────────────── -->
                                @if (canManageMembers) {
                                    <div class="members-section border-top pt-3 mb-3">
                                        <div class="row gx-2 align-items-center mb-2">
                                            <div class="col">
                                                <span class="fw-semibold small">
                                                    <mat-icon class="material-icons-outlined align-middle me-1"
                                                              style="font-size:16px;width:16px;height:16px">group</mat-icon>
                                                    Room Members
                                                </span>
                                                @if (members().length > 0) {
                                                    <span class="badge bg-secondary ms-1">{{ members().length }}</span>
                                                }
                                            </div>
                                            <div class="col-auto">
                                                @if (!showAddMemberForm()) {
                                                    <button matButton color="primary"
                                                            style="font-size:12px;line-height:28px;padding:0 8px"
                                                            (click)="openAddMemberForm()">
                                                        <mat-icon class="material-icons-outlined align-middle"
                                                                  style="font-size:16px;width:16px;height:16px;margin-right:4px">person_add</mat-icon>
                                                        Add Member
                                                    </button>
                                                }
                                            </div>
                                        </div>

                                        @if (membersError()) {
                                            <div class="chat-error mb-2 px-2 py-1 small">
                                                <mat-icon class="material-icons-outlined" style="font-size:14px;width:14px;height:14px">error_outline</mat-icon>
                                                {{ membersError() }}
                                            </div>
                                        }

                                        <!-- Add member inline form -->
                                        @if (showAddMemberForm()) {
                                            <div class="border rounded p-2 mb-2 bg-light-theme">
                                                <p class="small fw-semibold mb-2">
                                                    Add a {{ allowedTargetRole }} to this room
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
                                                            <mat-option [value]="null" disabled>
                                                                No eligible users found
                                                            </mat-option>
                                                        }
                                                    </mat-select>
                                                </mat-form-field>
                                                <div class="row gx-2">
                                                    <div class="col">
                                                        <button matButton="filled" color="primary" class="w-100"
                                                                [disabled]="!selectedUserId || addMemberLoading()"
                                                                (click)="confirmAddMember()">
                                                            {{ addMemberLoading() ? 'Adding...' : 'Confirm' }}
                                                        </button>
                                                    </div>
                                                    <div class="col-auto">
                                                        <button matButton (click)="cancelAddMemberForm()"
                                                                [disabled]="addMemberLoading()">
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        }

                                        <!-- Members list -->
                                        @if (membersLoading()) {
                                            <div class="text-center py-2">
                                                <mat-spinner diameter="20"></mat-spinner>
                                            </div>
                                        } @else if (members().length > 0) {
                                            <div class="overflow-x-auto">
                                                <table class="table table-sm table-hover mb-0 small">
                                                    <thead>
                                                        <tr>
                                                            <th>Full Name</th>
                                                            <th>Email</th>
                                                            <th>Role</th>
                                                            <th>Joined At</th>
                                                            <th></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        @for (member of members(); track member.id) {
                                                            <tr>
                                                                <td>{{ member.userFullName }}</td>
                                                                <td class="text-secondary">{{ member.userEmail }}</td>
                                                                <td>
                                                                    <span class="room-type-pill">{{ member.userRole }}</span>
                                                                </td>
                                                                <td class="text-secondary text-nowrap">
                                                                    {{ formatJoinedAt(member.joinedAt) }}
                                                                </td>
                                                                <td>
                                                                    <button matIconButton color="warn"
                                                                            title="Remove member"
                                                                            (click)="removeMember(member)">
                                                                        <mat-icon class="material-icons-outlined"
                                                                                  style="font-size:16px;width:16px;height:16px">
                                                                            person_remove
                                                                        </mat-icon>
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        }
                                                    </tbody>
                                                </table>
                                            </div>
                                        } @else {
                                            <p class="small opacity-75 mb-0">No members yet.</p>
                                        }
                                    </div>
                                }
                                <!-- ── /Members panel ──────────────────────────────────── -->

                                @if (isSearchVisible()) {
                                    <mat-form-field appearance="outline" class="w-100 inline-small border-light mb-3">
                                        <mat-label>Search in Chat</mat-label>
                                        <input matInput placeholder="Search in Chat..." />
                                        <mat-icon matSuffix>search</mat-icon>
                                    </mat-form-field>
                                }
                            </div>
                        </mat-card-header>

                        <mat-card-content class="flex-grow-1 overflow-y-auto height-dynamic"
                                          style="--h-dynamic:calc(100% - 144px)">
                            <div class="chat-list">
                                @for (message of localMessages; track $index) {
                                    <div [class.justify-content-end]="message.sender === 'user'"
                                         class="row gx-3 mb-3">
                                        <div class="col-auto">
                                            <mat-card [class.theme-cyan]="message.sender === 'user'"
                                                      [class.theme-violet]="message.sender === 'other'"
                                                      class="bg-light-theme mb-1 shadow-none">
                                                <mat-card-content>{{ message.content }}</mat-card-content>
                                            </mat-card>
                                            <p [class.text-end]="message.sender === 'user'"
                                               class="text-secondary small">
                                                @if (message.status === 'read') {
                                                    <mat-icon class="text-theme theme-cyan align-middle">done_all</mat-icon>
                                                } @else if (message.status === 'sent') {
                                                    <mat-icon class="align-middle text-secondary">done_all</mat-icon>
                                                } @else {
                                                    <mat-icon class="align-middle">check</mat-icon>
                                                }
                                                {{ message.time }}
                                            </p>
                                        </div>
                                    </div>
                                }
                            </div>
                        </mat-card-content>

                        <mat-card-actions>
                            <div class="w-100">
                                <mat-form-field appearance="fill" class="bg-none w-100 mb-0">
                                    <button matIconButton matPrefix>
                                        <mat-icon class="material-icons-outlined">attach_file</mat-icon>
                                    </button>
                                    <mat-label>Type a message</mat-label>
                                    <input matInput [(ngModel)]="messageInput"
                                           placeholder="Type a message..."
                                           (keyup.enter)="sendMessage()" />
                                    <button matIconButton (click)="sendMessage()" matSuffix>
                                        <mat-icon class="material-icons-outlined">send</mat-icon>
                                    </button>
                                </mat-form-field>
                            </div>
                        </mat-card-actions>
                    </mat-card>

                    <mat-card *ngIf="!activeRoom()" class="text-center height-dynamic"
                              style="--h-dynamic:calc(100vh - 250px)">
                        <mat-card-content>
                            <div class="row gx-3 align-items-center mb-3">
                                <div class="col-auto">
                                    <button matIconButton (click)="innersidebar()" aria-label="Rooms list">
                                        <mat-icon class="material-icons-outlined">notes</mat-icon>
                                    </button>
                                </div>
                            </div>
                            <img src="assets/img/nomessage.png" alt="" class="width-300 mt-4 mt-lg-5" />
                            <h3 class="mb-1">No room selected</h3>
                            <p class="text-secondary">Select a room from the list or create a new one</p>
                        </mat-card-content>
                    </mat-card>
                </div>

            </div>
        </div>
    `,
    styles: [`
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
        .room-type-pill {
            display: inline-block;
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            padding: 1px 6px;
            border-radius: 20px;
            background: var(--bs-light, #f3f4f6);
            color: var(--bs-secondary-color, #6b7280);
        }
        .room-actions { opacity: 0; transition: opacity 0.15s; }
        mat-list-item:hover .room-actions { opacity: 1; }
        .active-contact .room-actions { opacity: 1; }
        .members-section table th { font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #6b7280; }
        .members-section table td { vertical-align: middle; }
    `],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ChatComponent implements OnInit {

    // ── API state ──────────────────────────────────────────────────
    rooms = signal<ChatRoom[]>([]);
    loading = signal(false);
    error = signal('');

    // ── Selected room ──────────────────────────────────────────────
    activeRoom = signal<ChatRoom | null>(null);

    // ── Search ─────────────────────────────────────────────────────
    searchQuery = signal('');
    filteredRooms = computed(() => {
        const q = this.searchQuery().toLowerCase();
        if (!q) return this.rooms();
        return this.rooms().filter(r =>
            r.name.toLowerCase().includes(q) ||
            (r.description ?? '').toLowerCase().includes(q)
        );
    });

    // ── Create/edit form ───────────────────────────────────────────
    showForm = signal(false);
    editingRoom = signal<ChatRoom | null>(null);
    saving = signal(false);
    formProjectId = '';
    formName = '';
    formDescription = '';
    formRoomType: RoomType = 'general';
    formError = '';

    // ── Delete confirmation ────────────────────────────────────────
    deleteConfirmId = signal<number | null>(null);

    // ── Room type options ──────────────────────────────────────────
    readonly roomTypes = [
        { value: 'general',             label: 'General'            },
        { value: 'task_thread',         label: 'Task Thread'        },
        { value: 'deliverable_review',  label: 'Deliverable Review' },
        { value: 'private_room',        label: 'Private Room'       },
        { value: 'meeting',             label: 'Meeting'            },
    ];

    // ── Projects (for room form dropdown) ─────────────────────────
    projects: ProjectDTO[] = [];

    // ── Local message state (cosmetic) ─────────────────────────────
    isSearchVisible = signal(false);
    localMessages: Array<{ sender: 'user' | 'other'; content: string; time: string; status: string }> = [];
    messageInput = '';

    // ── Members panel ──────────────────────────────────────────────
    members = signal<RoomMemberDTO[]>([]);
    membersLoading = signal(false);
    membersError = signal('');
    showAddMemberForm = signal(false);
    addMemberLoading = signal(false);
    allUsers: UserDTO[] = [];
    filteredUsers: UserDTO[] = [];
    selectedUserId: number | null = null;

    constructor(
        private chatRoomService: ChatRoomService,
        private memberService: ChatRoomMemberService,
        private authService: AuthService,
        private userService: UserService,
        private snackBar: MatSnackBar,
        private renderer: Renderer2,
        @Inject(DOCUMENT) private document: Document,
    ) {}

    ngOnInit(): void {
        this.loadRooms();
        this.chatRoomService.getProjects().subscribe({
            next: (projects) => { this.projects = projects; },
            error: () => { /* non-blocking — form still usable if projects fail */ },
        });
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

    // ── Form helpers ───────────────────────────────────────────────

    openCreate(): void {
        this.editingRoom.set(null);
        this.formProjectId = '';
        this.formName = '';
        this.formDescription = '';
        this.formRoomType = 'general';
        this.formError = '';
        this.showForm.set(true);
    }

    openEdit(room: ChatRoom, event: Event): void {
        event.stopPropagation();
        this.editingRoom.set(room);
        this.formProjectId = room.projectId ?? '';
        this.formName = room.name;
        this.formDescription = room.description ?? '';
        this.formRoomType = (room.roomType?.toLowerCase() as RoomType) ?? 'general';
        this.formError = '';
        this.showForm.set(true);
        this.deleteConfirmId.set(null);
    }

    cancelForm(): void {
        this.showForm.set(false);
    }

    saveRoom(): void {
        if (!this.formProjectId.trim()) {
            this.formError = 'Project ID is required.';
            return;
        }
        if (!this.formName.trim()) {
            this.formError = 'Name is required.';
            return;
        }
        const payload: ChatRoomPayload = {
            projectId: this.formProjectId.trim(),
            name: this.formName.trim(),
            description: this.formDescription.trim(),
            roomType: this.formRoomType,
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
                this.saving.set(false);
                this.showForm.set(false);
            },
            error: (err) => {
                this.formError = this.formatError(err);
                this.saving.set(false);
            },
        });
    }

    // ── Delete ─────────────────────────────────────────────────────

    confirmDelete(id: number, event: Event): void {
        event.stopPropagation();
        this.deleteConfirmId.set(id);
        this.showForm.set(false);
    }

    cancelDelete(event: Event): void {
        event.stopPropagation();
        this.deleteConfirmId.set(null);
    }

    doDelete(id: number, event: Event): void {
        event.stopPropagation();
        this.chatRoomService.deleteRoom(id).subscribe({
            next: () => {
                this.rooms.update(list => list.filter(r => r.id !== id));
                if (this.activeRoom()?.id === id) this.activeRoom.set(null);
                this.deleteConfirmId.set(null);
            },
            error: (err) => {
                this.error.set(this.formatError(err));
                this.deleteConfirmId.set(null);
            },
        });
    }

    // ── Room selection ─────────────────────────────────────────────

    selectRoom(room: ChatRoom): void {
        this.activeRoom.set(room);
        this.deleteConfirmId.set(null);
        this.showAddMemberForm.set(false);
        this.membersError.set('');
        if (this.canManageMembers) {
            this.loadMembers(room.id);
        }
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
        const roomId = this.activeRoom()?.id;
        if (!roomId) return;
        this.memberService.removeMember(roomId, member.userId).subscribe({
            next: () => {
                this.members.update(list => list.filter(m => m.id !== member.id));
            },
            error: (err) => {
                this.notify(this.formatMemberError(err, err?.status), true);
            },
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
        if (text) {
            this.localMessages = [...this.localMessages, { sender: 'user', content: text, time: 'now', status: 'sending' }];
            this.messageInput = '';
        }
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
