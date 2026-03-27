import {
    Component, OnInit, OnDestroy, AfterViewChecked,
    ViewChild, ElementRef, HostListener,
    signal, computed,
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
import { MatDividerModule } from "@angular/material/divider";
import { MatTooltipModule } from "@angular/material/tooltip";
import { ChatRoomService, ChatRoom, ChatRoomPayload, RoomType, ProjectDTO } from "./chat-room.service";
import { ChatRoomMemberService, RoomMemberDTO } from "./chat-room-member.service";
import { AuthService } from "../../../../auth/auth.service";
import { UserService, UserDTO } from "../../../../users/user.service";
import { Subscription } from 'rxjs';
import { ChatMessageService, MessageDTO, ReactionDTO } from './chat-message.service';
import {
    trigger, style, transition, animate, state,
} from '@angular/animations';
import { QuillModule } from 'ngx-quill';

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
        MatDividerModule, MatTooltipModule,
        QuillModule,
    ],
    template: `
        <!-- ══ Page breadcrumb header ══════════════════════════════════════ -->
        <div class="container-fluid fade-in mb-3 mb-lg-4">
            <mat-card class="bg-light-theme shadow-none pt-3 pb-lg-3 px-3">
                <div class="row gx-3 align-items-center">
                    <div class="col mb-3 mb-xl-0 py-1">
                        <h3 class="mb-1 fw-bold">Chat Rooms</h3>
                        <p class="text-secondary small mb-0">Real-time collaboration across your workspace</p>
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

                    <!-- Sidebar top bar -->
                    <div class="sidebar-top px-3 pt-3 pb-2">
                        <div class="row gx-2 align-items-center">
                            <div class="col-auto d-lg-none">
                                <button matIconButton (click)="innersidebar()" aria-label="Back"
                                        matTooltip="Back">
                                    <mat-icon class="material-icons-outlined">arrow_back</mat-icon>
                                </button>
                            </div>
                            <div class="col">
                                <span class="fw-bold" style="font-size:15px;letter-spacing:-0.01em;">Channels</span>
                            </div>
                            @if (!showForm() && canManageMembers) {
                                <div class="col-auto d-flex gap-1">
                                    <button matIconButton (click)="openCreate()" matTooltip="New channel"
                                            style="width:32px;height:32px;">
                                        <mat-icon style="font-size:20px;width:20px;height:20px;">add</mat-icon>
                                    </button>
                                    <button matIconButton (click)="loadRooms()" matTooltip="Refresh"
                                            [disabled]="loading()" style="width:32px;height:32px;">
                                        <mat-icon class="material-icons-outlined" style="font-size:20px;width:20px;height:20px;">refresh</mat-icon>
                                    </button>
                                </div>
                            }
                        </div>
                    </div>

                    <!-- Search -->
                    @if (!showForm()) {
                        <div class="px-3 pb-2">
                            <mat-form-field appearance="outline" class="w-100 inline-small">
                                <mat-icon matPrefix class="material-icons-outlined"
                                          style="font-size:18px;width:18px;height:18px;color:var(--mat-sys-on-surface-variant)">search</mat-icon>
                                <input matInput
                                       [ngModel]="searchQuery()"
                                       (ngModelChange)="searchQuery.set($event)"
                                       placeholder="Find a channel…" />
                            </mat-form-field>
                        </div>
                    }

                    <!-- Global error -->
                    @if (error()) {
                        <div class="chat-error mx-3 mb-2 px-3 py-2">
                            <mat-icon class="material-icons-outlined" style="font-size:15px;width:15px;height:15px">error_outline</mat-icon>
                            {{ error() }}
                        </div>
                    }

                    <!-- Create / Edit form -->
                    @if (showForm() && canManageMembers) {
                        <div class="sidebar-form px-3 pb-3" [@fadeSlide]>
                            <div class="sidebar-form-header mb-3">
                                <mat-icon class="material-icons-outlined form-header-icon">
                                    {{ editingRoom() ? 'edit_note' : 'add_circle_outline' }}
                                </mat-icon>
                                <span class="fw-semibold">{{ editingRoom() ? 'Edit Channel' : 'New Channel' }}</span>
                            </div>

                            @if (formError) {
                                <div class="chat-error mb-3 px-3 py-2 small">{{ formError }}</div>
                            }

                            <mat-form-field appearance="outline" class="w-100 mb-1">
                                <mat-label>Project *</mat-label>
                                <mat-icon matPrefix class="material-icons-outlined" style="font-size:18px;width:18px;height:18px">folder_open</mat-icon>
                                <mat-select [(ngModel)]="formProjectId">
                                    @for (p of projects; track p.id) {
                                        <mat-option [value]="p.id">{{ p.name }}</mat-option>
                                    }
                                </mat-select>
                            </mat-form-field>

                            <mat-form-field appearance="outline" class="w-100 mb-1">
                                <mat-label>Channel Name *</mat-label>
                                <mat-icon matPrefix style="font-size:18px;width:18px;height:18px">tag</mat-icon>
                                <input matInput [(ngModel)]="formName" placeholder="e.g. design-feedback" />
                            </mat-form-field>

                            <mat-form-field appearance="outline" class="w-100 mb-1">
                                <mat-label>Description</mat-label>
                                <textarea matInput [(ngModel)]="formDescription" rows="2"
                                          placeholder="What's this channel about?"></textarea>
                            </mat-form-field>

                            <mat-form-field appearance="outline" class="w-100 mb-3">
                                <mat-label>Channel Type</mat-label>
                                <mat-icon matPrefix class="material-icons-outlined" style="font-size:18px;width:18px;height:18px">category</mat-icon>
                                <mat-select [(ngModel)]="formRoomType">
                                    @for (t of roomTypes; track t.value) {
                                        <mat-option [value]="t.value">{{ t.label }}</mat-option>
                                    }
                                </mat-select>
                            </mat-form-field>

                            <div class="row gx-2">
                                <div class="col">
                                    <button mat-flat-button color="primary" class="w-100"
                                            (click)="saveRoom()" [disabled]="saving()">
                                        @if (saving()) {
                                            <mat-spinner diameter="16" style="display:inline-block;margin-right:6px"></mat-spinner>
                                        }
                                        {{ saving() ? 'Saving…' : (editingRoom() ? 'Update Channel' : 'Create Channel') }}
                                    </button>
                                </div>
                                <div class="col-auto">
                                    <button matButton (click)="cancelForm()" [disabled]="saving()">Cancel</button>
                                </div>
                            </div>
                        </div>
                    }

                    <!-- Channel groups list -->
                    @if (!showForm()) {
                        <div class="sidebar-channels overflow-y-auto height-dynamic"
                             style="--h-dynamic:calc(100vh - 320px)">

                            @if (loading()) {
                                <div class="text-center py-5">
                                    <mat-spinner diameter="28"></mat-spinner>
                                    <p class="small text-secondary mt-2 mb-0">Loading channels…</p>
                                </div>
                            } @else {

                                @for (group of roomsByType(); track group.type) {
                                    <!-- Section header -->
                                    <div class="channel-section-header px-3 pt-3 pb-1">
                                        <mat-icon class="material-icons-outlined section-type-icon">
                                            {{ getRoomTypeIcon(group.type) }}
                                        </mat-icon>
                                        <span class="section-type-label">{{ getRoomTypeLabel(group.type) }}</span>
                                        <span class="section-count">{{ group.rooms.length }}</span>
                                    </div>

                                    @for (room of group.rooms; track room.id) {
                                        <div class="channel-item"
                                             [class.channel-item-active]="activeRoom()?.id === room.id"
                                             (click)="selectRoom(room)"
                                             [@channelItemEnter]>

                                            @if (deleteConfirmId() === room.id) {
                                                <!-- Inline delete confirm -->
                                                <div class="delete-confirm px-3 py-2" (click)="$event.stopPropagation()">
                                                    <p class="small mb-2 fw-medium">
                                                        Delete <strong>{{ room.name }}</strong>?
                                                    </p>
                                                    <div class="row gx-2">
                                                        <div class="col">
                                                            <button mat-flat-button color="warn" class="w-100 button-sm"
                                                                    (click)="doDelete(room.id, $event)">
                                                                Delete
                                                            </button>
                                                        </div>
                                                        <div class="col-auto">
                                                            <button matButton class="button-sm"
                                                                    (click)="cancelDelete($event)">Cancel</button>
                                                        </div>
                                                    </div>
                                                </div>
                                            } @else {
                                                <div class="channel-item-inner px-3 py-2">
                                                    <div class="channel-item-icon">
                                                        <mat-icon class="material-icons-outlined"
                                                                  style="font-size:17px;width:17px;height:17px">
                                                            {{ getRoomTypeIcon(room.roomType ?? 'general') }}
                                                        </mat-icon>
                                                    </div>
                                                    <div class="channel-item-text">
                                                        <p class="mb-0 fw-medium text-truncate channel-name">{{ room.name }}</p>
                                                        @if (room.description) {
                                                            <p class="mb-0 small text-truncate channel-desc">{{ room.description }}</p>
                                                        }
                                                    </div>
                                                    @if (canManageMembers) {
                                                        <div class="channel-item-actions">
                                                            <button matIconButton
                                                                    style="width:26px;height:26px;line-height:26px"
                                                                    matTooltip="Edit"
                                                                    (click)="openEdit(room, $event)">
                                                                <mat-icon class="material-icons-outlined"
                                                                          style="font-size:15px;width:15px;height:15px">edit</mat-icon>
                                                            </button>
                                                            <button matIconButton
                                                                    style="width:26px;height:26px;line-height:26px"
                                                                    matTooltip="Delete"
                                                                    (click)="confirmDelete(room.id, $event)">
                                                                <mat-icon class="material-icons-outlined theme-red"
                                                                          style="font-size:15px;width:15px;height:15px">delete</mat-icon>
                                                            </button>
                                                        </div>
                                                    }
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
                                            {{ searchQuery() ? 'No channels match your search.' : (canManageMembers ? 'No channels yet. Click + to create one.' : 'You have not been added to any channels yet.') }}
                                        </p>
                                    </div>
                                }
                            }
                        </div>
                    }
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
                                <h4 class="fw-bold mb-2">Pick a channel</h4>
                                <p class="text-secondary small mb-0">Select a channel from the sidebar to start chatting with your team.</p>
                            </div>
                        </div>
                    }

                    <!-- ── Active room ──────────────────────────────────── -->
                    @if (activeRoom()) {
                        <div class="chat-room-wrap height-dynamic" style="--h-dynamic:calc(100vh - 250px)">

                            <!-- Chat header -->
                            <div class="chat-header px-3 py-2">
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

                                @if (isSearchVisible()) {
                                    <div class="mt-2" [@fadeSlide]>
                                        <mat-form-field appearance="outline" class="w-100 inline-small">
                                            <mat-icon matPrefix class="material-icons-outlined"
                                                      style="font-size:18px;width:18px;height:18px">search</mat-icon>
                                            <mat-label>Search in channel…</mat-label>
                                            <input matInput placeholder="Type to search messages…" />
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
                                                <p class="pp-empty">No pinned messages yet.</p>
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
                                                            <mat-option [value]="null" disabled>No eligible users found</mat-option>
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
                                                        <div class="member-avatar">
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
                                                <p class="small text-secondary text-center py-4 mb-0">No members yet.</p>
                                            }
                                        </div>
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
                                                             [matTooltip]="message.senderName">
                                                            {{ getInitials(message.senderName) }}
                                                        </div>
                                                    } @else {
                                                        <div class="msg-avatar-spacer"></div>
                                                    }
                                                }

                                                <div class="msg-content-wrap"
                                                     [class.msg-content-wrap-own]="message.senderId === currentUser?.id">

                                                    <!-- Hover action bar -->
                                                    <div class="msg-hover-actions"
                                                         [class.msg-hover-actions-own]="message.senderId === currentUser?.id">
                                                        <button class="hover-action-btn"
                                                                (click)="toggleEmojiPicker(message.id, $event)"
                                                                matTooltip="React">
                                                            <mat-icon class="material-icons-outlined" style="font-size:15px;width:15px;height:15px;line-height:15px">add_reaction</mat-icon>
                                                        </button>
                                                        <button class="hover-action-btn"
                                                                (click)="pinOrUnpin(message)"
                                                                [matTooltip]="message.isPinned ? 'Unpin' : 'Pin'">
                                                            <mat-icon class="material-icons-outlined" style="font-size:15px;width:15px;height:15px;line-height:15px">push_pin</mat-icon>
                                                        </button>
                                                    </div>

                                                    @if (message.isPinned) {
                                                        <div class="pin-badge" [@pinBadgeEnter] title="Pinned">📌</div>
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
                                                            <div class="msg-text" [innerHTML]="message.contentText"></div>
                                                        }

                                                        <!-- File attachment -->
                                                        @if (message.fileUrl) {
                                                            <div class="file-attachment mt-2">
                                                                @if (isImage(message.fileType)) {
                                                                    <img [src]="getFileDownloadUrl(message.fileUrl)"
                                                                         class="attachment-image"
                                                                         [alt]="message.fileName ?? 'attachment'">
                                                                } @else {
                                                                    <a [href]="getFileDownloadUrl(message.fileUrl)"
                                                                       target="_blank"
                                                                       class="file-download-link">
                                                                        📎 {{ message.fileName }}
                                                                        @if (message.fileSize) {
                                                                            <span class="file-size">({{ formatBytes(message.fileSize) }})</span>
                                                                        }
                                                                    </a>
                                                                }
                                                            </div>
                                                        }

                                                        <!-- Timestamp -->
                                                        <span class="msg-time">{{ formatMessageTime(message.createdAt) }}</span>
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
                                                        <button class="reaction-trigger"
                                                                (click)="toggleEmojiPicker(message.id, $event)"
                                                                matTooltip="Add reaction">
                                                            <mat-icon class="material-icons-outlined"
                                                                      style="font-size:13px;width:13px;height:13px;line-height:13px">
                                                                add_reaction
                                                            </mat-icon>
                                                        </button>
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
                                                </div>
                                            </div>
                                        }

                                        @if (messages().length === 0 && !historyError()) {
                                            <div class="msgs-empty-state" [@fadeSlide]>
                                                <div class="msgs-empty-icon">
                                                    <mat-icon class="material-icons-outlined">chat_bubble_outline</mat-icon>
                                                </div>
                                                <p class="msgs-empty-title">No messages yet</p>
                                                <p class="msgs-empty-sub">Be the first to say something in <strong>#{{ activeRoom()?.name }}</strong></p>
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

                                <!-- Input card -->
                                <div class="input-card"
                                     [class.input-card-disabled]="!activeRoom()"
                                     [class.input-card-has-file]="!!selectedFile"
                                     (keydown.control.enter)="sendRichMessage()">

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
                                        </div>

                                        <div class="input-right-actions">
                                            <span class="input-hint-text">Ctrl+Enter</span>
                                            <button class="send-fab"
                                                    [disabled]="!activeRoom() || (!hasText && !selectedFile)"
                                                    (click)="sendRichMessage()"
                                                    matTooltip="Send message">
                                                <mat-icon style="font-size:20px;width:20px;height:20px">send</mat-icon>
                                            </button>
                                        </div>
                                    </div>
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
    `,
    styles: [`
        /* ── Layout ─────────────────────────────────────────────────── */
        .chat-layout {
            --inner-sidebar-width: 270px;
            gap: 14px !important;
            align-items: stretch !important;
        }
        .chat-sidebar {
            background: #ffffff;
            border: 1px solid var(--mat-sys-outline-variant);
            border-radius: 16px;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            box-shadow: 0 2px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04);
        }
        .chat-main {
            display: flex;
            flex-direction: column;
            background: #ffffff;
            min-height: 0;
            border: 1px solid var(--mat-sys-outline-variant);
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 2px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04);
        }

        /* ── Sidebar top ─────────────────────────────────────────────── */
        .sidebar-top {
            border-bottom: 1px solid var(--mat-sys-outline-variant);
            background: linear-gradient(180deg,
                color-mix(in srgb, var(--mat-sys-primary-container) 14%, #ffffff) 0%,
                #ffffff 100%);
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
        .channel-name { font-size: 13.5px; color: var(--mat-sys-on-surface); }
        .channel-desc { font-size: 11px; color: var(--mat-sys-on-surface-variant); }
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
            background: var(--mat-sys-surface-container-lowest);
        }
        .sidebar-form-header {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            padding-top: 12px;
        }
        .form-header-icon {
            font-size: 18px !important;
            width: 18px !important;
            height: 18px !important;
            color: var(--mat-sys-primary);
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
            background: #ffffff;
        }
        .messages-scroll {
            flex: 1;
            overflow-y: auto;
            background: #ffffff;
            /* subtle dot pattern */
            background-image: radial-gradient(circle, rgba(0,0,0,0.045) 1px, transparent 1px);
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
            margin-bottom: 10px;
            padding: 3px 16px;
            border-radius: 10px;
            transition: background 0.12s ease;
            position: relative;
        }
        .msg-row:hover {
            background: rgba(0,0,0,0.018);
        }
        .msg-consecutive {
            margin-top: -6px;
            margin-bottom: 2px;
        }
        .msg-row-own {
            flex-direction: row-reverse;
        }
        .msg-avatar {
            width: 34px;
            height: 34px;
            border-radius: 50%;
            background: linear-gradient(135deg, var(--mat-sys-primary), color-mix(in srgb, var(--mat-sys-tertiary) 70%, var(--mat-sys-secondary)));
            color: var(--mat-sys-on-primary);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11.5px;
            font-weight: 700;
            flex-shrink: 0;
            letter-spacing: -0.5px;
            box-shadow: 0 0 0 2px color-mix(in srgb, var(--mat-sys-primary) 25%, transparent);
            transition: box-shadow 0.2s, transform 0.15s;
        }
        .msg-avatar:hover {
            box-shadow: 0 0 0 3px color-mix(in srgb, var(--mat-sys-primary) 40%, transparent);
            transform: scale(1.08);
        }
        .msg-avatar-spacer {
            width: 34px;
            flex-shrink: 0;
        }
        .msg-content-wrap {
            max-width: 72%;
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: flex-start;
        }
        .msg-content-wrap-own {
            align-items: flex-end;
        }

        /* Hover action bar */
        .msg-hover-actions {
            position: absolute;
            top: -28px;
            right: 4px;
            display: flex;
            align-items: center;
            gap: 2px;
            background: var(--mat-sys-surface);
            border: 1px solid var(--mat-sys-outline-variant);
            border-radius: 20px;
            padding: 2px 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.12);
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.15s ease;
            z-index: 10;
        }
        .msg-hover-actions-own {
            right: auto;
            left: 4px;
        }
        .msg-row:hover .msg-hover-actions {
            opacity: 1;
            pointer-events: auto;
        }
        .hover-action-btn {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            border: none;
            background: transparent;
            cursor: pointer;
            color: var(--mat-sys-on-surface-variant);
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.1s, color 0.1s;
            padding: 0;
        }
        .hover-action-btn:hover {
            background: var(--mat-sys-primary-container);
            color: var(--mat-sys-primary);
        }

        .msg-bubble {
            border-radius: 18px;
            padding: 10px 15px 7px;
            position: relative;
            word-break: break-word;
            line-height: 1.55;
            transition: transform 0.12s cubic-bezier(0.34,1.56,0.64,1);
        }
        .msg-row:hover .msg-bubble {
            transform: translateY(-1px);
        }

        /* Own message — right side, coloured tail */
        .msg-bubble-own {
            background: linear-gradient(140deg,
                var(--mat-sys-primary-container) 0%,
                color-mix(in srgb, var(--mat-sys-primary-container) 50%, var(--mat-sys-tertiary-container)) 100%);
            color: var(--mat-sys-on-surface);
            border-bottom-right-radius: 4px;
            box-shadow:
                0 3px 12px color-mix(in srgb, var(--mat-sys-primary) 18%, transparent),
                0 1px 3px rgba(0,0,0,0.06);
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
            background: #f5f5f7;
            color: var(--mat-sys-on-surface);
            border-bottom-left-radius: 4px;
            border: 1px solid rgba(0,0,0,0.07);
            box-shadow: 0 1px 4px rgba(0,0,0,0.07);
        }
        .msg-bubble-other::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: -7px;
            width: 14px;
            height: 14px;
            background: #f5f5f7;
            clip-path: polygon(100% 0, 0 100%, 100% 100%);
            border-bottom-left-radius: 2px;
            border-left: 1px solid rgba(0,0,0,0.07);
        }

        /* Consecutive bubbles — no tail */
        .msg-consecutive .msg-bubble-own { border-bottom-right-radius: 18px; }
        .msg-consecutive .msg-bubble-own::after { display: none; }
        .msg-consecutive .msg-bubble-other { border-bottom-left-radius: 18px; }
        .msg-consecutive .msg-bubble-other::after { display: none; }

        .msg-sender-name {
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.02em;
            background: linear-gradient(90deg, var(--mat-sys-primary), var(--mat-sys-tertiary));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 4px !important;
        }
        .msg-text {
            font-size: 14px;
            line-height: 1.55;
        }
        .msg-time {
            display: block;
            font-size: 10px;
            color: var(--mat-sys-on-surface-variant);
            margin-top: 5px;
            text-align: right;
            opacity: 0;
            transition: opacity 0.15s ease;
            letter-spacing: 0.01em;
        }
        .msg-row:hover .msg-time { opacity: 0.65; }
        .msg-bubble-other .msg-time { text-align: left; }

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
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.05em;
            text-transform: uppercase;
            background: linear-gradient(135deg, var(--mat-sys-primary), var(--mat-sys-tertiary));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            padding: 2px 10px;
            border-radius: 20px;
            border: 1px solid color-mix(in srgb, var(--mat-sys-primary) 25%, var(--mat-sys-outline-variant));
            white-space: nowrap;
            letter-spacing: 0.03em;
            padding: 2px 10px;
            background: var(--mat-sys-surface-container);
            border-radius: 20px;
            border: 1px solid var(--mat-sys-outline-variant);
        }

        /* ── Members panel ───────────────────────────────────────────── */
        .members-panel {
            position: absolute;
            top: 0;
            right: 0;
            bottom: 0;
            width: 300px;
            background: var(--mat-card-elevated-container-color, var(--mat-sys-surface));
            border-left: 1px solid var(--mat-sys-outline-variant);
            box-shadow: -4px 0 24px rgba(0,0,0,0.08);
            display: flex;
            flex-direction: column;
            z-index: 110;
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
            background: #ffffff;
            flex-shrink: 0;
            padding: 0 16px 16px;
            position: relative;
        }

        /* The card */
        .input-card {
            background: #ffffff;
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
            background: color-mix(in srgb, var(--mat-sys-primary-container) 10%, #ffffff);
            transition: max-height 0.28s cubic-bezier(0.4,0,0.2,1), opacity 0.2s;
        }
        .quill-format-wrap ::ng-deep .ql-container {
            border: none;
            font-size: 14px;
            font-family: inherit;
        }
        .quill-format-wrap ::ng-deep .ql-editor {
            min-height: 48px;
            max-height: 160px;
            overflow-y: auto;
            padding: 12px 16px 4px;
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
            padding: 5px 8px 5px 6px;
            border-top: 1px solid var(--mat-sys-outline-variant);
            background: linear-gradient(90deg,
                #fafafa 0%,
                color-mix(in srgb, var(--mat-sys-primary-container) 6%, #fafafa) 100%);
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
        .send-fab:not(:disabled):hover {
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
            background: color-mix(in srgb, var(--mat-sys-primary-container) 60%, #ffffff);
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
            max-height: 170px;
            border-radius: 8px;
            display: block;
        }
        .file-download-link {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            color: var(--mat-sys-primary);
            text-decoration: none;
            font-size: 13px;
        }
        .file-download-link:hover { text-decoration: underline; }
        .file-size { color: var(--mat-sys-on-surface-variant); font-size: 12px; }

        /* ── Pin badge ───────────────────────────────────────────────── */
        .pin-badge {
            position: absolute;
            top: -8px;
            right: -6px;
            font-size: 13px;
            line-height: 1;
            filter: drop-shadow(0 1px 2px rgba(0,0,0,0.18));
            z-index: 2;
            pointer-events: none;
        }
        .msg-content-wrap-own .pin-badge { right: auto; left: -6px; }
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
                rgba(234,179,8,0.14) 0%,
                rgba(251,191,36,0.07) 60%,
                rgba(217,119,6,0.04) 100%);
            border-bottom: 1px solid rgba(234,179,8,0.35);
            padding: 7px 14px;
            cursor: pointer;
            transition: background 0.2s, box-shadow 0.2s;
            user-select: none;
            flex-shrink: 0;
            box-shadow: 0 1px 4px rgba(234,179,8,0.12);
        }
        .pin-banner:hover {
            background: linear-gradient(90deg, rgba(234,179,8,0.22) 0%, rgba(251,191,36,0.14) 100%);
            box-shadow: 0 2px 8px rgba(234,179,8,0.2);
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
            background: var(--mat-card-elevated-container-color, var(--mat-sys-surface));
            border-left: 1px solid rgba(234,179,8,0.3);
            box-shadow: -4px 0 20px rgba(0,0,0,0.1);
            display: flex;
            flex-direction: column;
            z-index: 100;
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
            margin-top: 3px;
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
                style({ transform: 'scale(0.94) translateY(14px)', opacity: 0 }),
                animate('280ms cubic-bezier(0.34,1.56,0.64,1)',
                    style({ transform: 'scale(1) translateY(0)', opacity: 1 })),
            ]),
        ]),
        trigger('channelItemEnter', [
            transition(':enter', [
                style({ transform: 'translateX(-16px)', opacity: 0 }),
                animate('250ms cubic-bezier(0.34,1.56,0.64,1)',
                    style({ transform: 'translateX(0)', opacity: 1 })),
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

    // ── Message pane scroll ────────────────────────────────────────
    @ViewChild('messagePane', { read: ElementRef }) messagePaneRef!: ElementRef;
    @ViewChild('quillRef') quillRef!: any;
    private shouldScrollToBottom = false;

    // ── Rich input ─────────────────────────────────────────────────
    richContent = '';
    selectedFile: File | null = null;
    emojiPickerOpen = signal(false);

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

    constructor(
        private chatRoomService: ChatRoomService,
        private memberService: ChatRoomMemberService,
        private authService: AuthService,
        private userService: UserService,
        private chatMessageService: ChatMessageService,
        private snackBar: MatSnackBar,
        private renderer: Renderer2,
        @Inject(DOCUMENT) private document: Document,
    ) {}

    ngOnInit(): void {
        if (this.canManageMembers) {
            this.loadRooms();
            this.chatRoomService.getProjects().subscribe({
                next: (projects) => { this.projects = projects; },
                error: () => { /* non-blocking — form still usable if projects fail */ },
            });
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
            this.closeEmojiPicker();
            this.emojiPickerOpen.set(false);
            this.contextMenu.set({ visible: false, x: 0, y: 0, message: null });
        });
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
        this.chatMessageService.disconnect();
        this.docClickUnlisten?.();
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
        if (!this.canManageMembers) return;
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
        if (!this.canManageMembers) return;
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
        this.historyError.set('');
        this.messages.set([]);
        this.pinnedMessages.set([]);
        this.pinnedPanelOpen.set(false);
        this.contextMenu.set({ visible: false, x: 0, y: 0, message: null });

        // Unsubscribe from previous room topics
        this.roomSub?.unsubscribe();
        this.roomSub = null;
        this.pinSub?.unsubscribe();
        this.pinSub = null;

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
