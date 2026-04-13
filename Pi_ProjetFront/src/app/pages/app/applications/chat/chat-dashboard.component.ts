import {
    Component, OnInit, OnDestroy, AfterViewInit,
    Output, EventEmitter, ViewChild, signal, ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { Subscription } from 'rxjs';
import { ChatRoomService } from './chat-room.service';
import { ChatMessageService } from './chat-message.service';

/* ── Interfaces ─────────────────────────────────────────────────────── */
export interface DashboardOverview {
    totalMembers: number;
    activeChatrooms: number;
    messagesToday: number;
    meetingsThisWeek: number;
    liveNow: boolean;
}

export interface DashboardMember {
    id: number;
    name: string;
    email: string;
    role: string;
    messageCount: number;
    roomCount: number;
    lastActive: string;
}

export interface DashboardRoom {
    id: number;
    name: string;
    roomType: string;
    messageCount: number;
    memberCount: number;
    messagesLast7Days: number;
    lastMessage?: string;
    lastMessageAt?: string;
    status?: string;
    startTime?: string;
    meetingLink?: string;
}

export interface DashboardActivity {
    senderName: string;
    roomName: string;
    content: string;
    timestamp: string;
    fresh?: boolean;
}

export interface DashboardChartEntry {
    day: string;
    count: number;
}

export interface DashboardLeaderEntry {
    rank: number;
    name: string;
    messageCount: number;
    percentage: number;
}

/* ══ Dashboard Panel Component ══════════════════════════════════════════ */
@Component({
    selector: 'app-chat-dashboard',
    standalone: true,
    encapsulation: ViewEncapsulation.None,
    imports: [
        CommonModule, FormsModule,
        MatCardModule, MatIconModule, MatButtonModule,
        MatTableModule, MatPaginatorModule, MatSortModule,
        MatFormFieldModule, MatInputModule,
        MatProgressBarModule, MatProgressSpinnerModule,
        MatChipsModule, MatTooltipModule, MatDividerModule,
    ],
    template: `
        <!-- ══ Full-screen overlay ══════════════════════════════════════ -->
        <div class="dash-overlay" [class.dash-overlay-exit]="closing()">

            <!-- ── Sticky header bar ───────────────────────────────── -->
            <div class="dash-sticky-header">
                <div class="container-fluid">
                    <mat-card class="bg-light-theme shadow-none py-2 px-3">
                        <div class="row gx-3 align-items-center">
                            <div class="col-auto">
                                <button mat-icon-button (click)="close()" matTooltip="Back to Chat">
                                    <mat-icon>arrow_back</mat-icon>
                                </button>
                            </div>
                            <div class="col py-1">
                                <h3 class="mb-0 d-flex align-items-center gap-2 fw-bold">
                                    <mat-icon class="text-theme" style="font-size:22px;width:22px;height:22px;vertical-align:middle">bar_chart</mat-icon>
                                    My Dashboard
                                </h3>
                                <p class="small opacity-50 mb-0">Overview of your team and chatrooms</p>
                            </div>
                            <div class="col-auto">
                                <button mat-icon-button (click)="refresh()" matTooltip="Refresh"
                                        [class.dash-spin]="refreshing()">
                                    <mat-icon>refresh</mat-icon>
                                </button>
                            </div>
                        </div>
                    </mat-card>
                </div>
            </div>

            <!-- ── Scrollable body ──────────────────────────────────── -->
            <div class="dash-body">
                <div class="container-fluid px-3 px-lg-4 py-3">

                    <!-- ── KPI Cards ──────────────────────────────── -->
                    <div class="row gx-3 gx-lg-4">
                        @if (loading()) {
                            @for (i of [1,2,3,4]; track i) {
                                <div class="col-6 col-sm-6 col-md-3">
                                    <mat-card class="mb-3 mb-lg-4">
                                        <mat-card-content>
                                            <div class="row gx-3 align-items-center">
                                                <div class="col-auto mb-3 mb-xl-0">
                                                    <div class="dash-skeleton-circle"></div>
                                                </div>
                                                <div class="col-12 col-xl">
                                                    <div class="dash-skeleton-line dash-sk-sm mb-2"></div>
                                                    <div class="dash-skeleton-line dash-sk-lg"></div>
                                                </div>
                                            </div>
                                        </mat-card-content>
                                    </mat-card>
                                </div>
                            }
                        } @else {
                            <!-- Team Members -->
                            <div class="col-6 col-sm-6 col-md-3 dash-kpi-item" style="animation-delay:0ms">
                                <mat-card class="mb-3 mb-lg-4">
                                    <mat-card-content>
                                        <div class="row gx-3 align-items-center">
                                            <div class="col-auto mb-3 mb-xl-0">
                                                <div class="avatar avatar-50 bg-light-theme text-theme rounded theme-cyan">
                                                    <mat-icon class="material-icons-outlined">group</mat-icon>
                                                </div>
                                            </div>
                                            <div class="col-12 col-xl">
                                                <p class="small text-secondary mb-1">Team Members</p>
                                                <h2>{{ animTeamMembers() }}</h2>
                                            </div>
                                        </div>
                                    </mat-card-content>
                                </mat-card>
                            </div>
                            <!-- Active Rooms -->
                            <div class="col-6 col-sm-6 col-md-3 dash-kpi-item" style="animation-delay:80ms">
                                <mat-card class="mb-3 mb-lg-4">
                                    <mat-card-content>
                                        <div class="row gx-3 align-items-center">
                                            <div class="col-auto mb-3 mb-xl-0">
                                                <div class="avatar avatar-50 bg-light-theme text-theme rounded theme-blue">
                                                    <mat-icon class="material-icons-outlined">chat_bubble</mat-icon>
                                                </div>
                                            </div>
                                            <div class="col-12 col-xl">
                                                <p class="small text-secondary mb-1">Active Rooms</p>
                                                <h2>{{ animActiveRooms() }}</h2>
                                            </div>
                                        </div>
                                    </mat-card-content>
                                </mat-card>
                            </div>
                            <!-- Messages Today -->
                            <div class="col-6 col-sm-6 col-md-3 dash-kpi-item" style="animation-delay:160ms">
                                <mat-card class="mb-3 mb-lg-4">
                                    <mat-card-content>
                                        <div class="row gx-3 align-items-center">
                                            <div class="col-auto mb-3 mb-xl-0">
                                                <div class="avatar avatar-50 bg-light-theme text-theme rounded theme-yellow">
                                                    <mat-icon class="material-icons-outlined">message</mat-icon>
                                                </div>
                                            </div>
                                            <div class="col-12 col-xl">
                                                <p class="small text-secondary mb-1">Messages Today</p>
                                                <h2>{{ animMsgToday() }}</h2>
                                            </div>
                                        </div>
                                    </mat-card-content>
                                </mat-card>
                            </div>
                            <!-- Meetings This Week -->
                            <div class="col-6 col-sm-6 col-md-3 dash-kpi-item" style="animation-delay:240ms">
                                <mat-card class="mb-3 mb-lg-4">
                                    <mat-card-content>
                                        <div class="row gx-3 align-items-center">
                                            <div class="col-auto mb-3 mb-xl-0">
                                                <div class="avatar avatar-50 bg-light-theme text-theme rounded theme-green position-relative">
                                                    <mat-icon class="material-icons-outlined">video_call</mat-icon>
                                                    @if (overview()?.liveNow) {
                                                        <span class="dash-live-dot"></span>
                                                    }
                                                </div>
                                            </div>
                                            <div class="col-12 col-xl">
                                                <p class="small text-secondary mb-1">Meetings This Week</p>
                                                <h2>{{ animMeetings() }}</h2>
                                            </div>
                                        </div>
                                    </mat-card-content>
                                </mat-card>
                            </div>
                        }
                    </div>

                    <!-- ── Members Table ──────────────────────────── -->
                    <div class="row gx-3 gx-lg-4">
                        <div class="col-12">
                            <mat-card class="mb-3 mb-lg-4">
                                <mat-card-header>
                                    <div class="w-100">
                                        <div class="row gx-3 align-items-center">
                                            <div class="col-auto mb-3">
                                                <div class="avatar avatar-40 text-theme rounded">
                                                    <mat-icon class="material-icons-outlined">people</mat-icon>
                                                </div>
                                            </div>
                                            <div class="col mb-3">
                                                <h3 class="mb-1">Team Members</h3>
                                                <p class="text-secondary small">All members in your rooms</p>
                                            </div>
                                            <div class="col-12 col-md-6 col-lg-4 col-xl-3 mb-3">
                                                <mat-form-field appearance="outline" class="w-100 inline-small">
                                                    <mat-label>Search</mat-label>
                                                    <mat-icon matPrefix>search</mat-icon>
                                                    <input matInput placeholder="Search by name" (keyup)="applyFilter($event)" />
                                                </mat-form-field>
                                            </div>
                                        </div>
                                        <!-- Filter chips -->
                                        <div class="d-flex gap-2 mb-3 flex-wrap">
                                            <span class="badge badge-light"
                                                  [class.theme-blue]="memberFilter() === 'all'"
                                                  style="cursor:pointer;padding:6px 14px;font-size:12px"
                                                  (click)="setMemberFilter('all')">All</span>
                                            <span class="badge badge-light"
                                                  [class.theme-blue]="memberFilter() === 'most_active'"
                                                  style="cursor:pointer;padding:6px 14px;font-size:12px"
                                                  (click)="setMemberFilter('most_active')">Most Active</span>
                                            <span class="badge badge-light"
                                                  [class.theme-blue]="memberFilter() === 'recent'"
                                                  style="cursor:pointer;padding:6px 14px;font-size:12px"
                                                  (click)="setMemberFilter('recent')">Recently Active</span>
                                        </div>
                                    </div>
                                </mat-card-header>

                                <table mat-table [dataSource]="dataSource" matSort class="bg-none mb-3 responsive-table w-100">

                                    <!-- Member column -->
                                    <ng-container matColumnDef="member">
                                        <th mat-header-cell *matHeaderCellDef mat-sort-header>Member</th>
                                        <td mat-cell *matCellDef="let m" class="py-2">
                                            <div class="row gx-3 align-items-center">
                                                <div class="col-auto">
                                                    <div class="avatar avatar-40 rounded-circle bg-light-theme text-theme d-flex align-items-center justify-content-center fw-bold"
                                                         style="font-size:14px">
                                                        {{ getInitials(m.name) }}
                                                    </div>
                                                </div>
                                                <div class="col">
                                                    <h4 class="mb-0">{{ m.name }}</h4>
                                                    <p class="text-secondary small">{{ m.email }}</p>
                                                </div>
                                            </div>
                                        </td>
                                    </ng-container>

                                    <!-- Role column -->
                                    <ng-container matColumnDef="role">
                                        <th mat-header-cell *matHeaderCellDef mat-sort-header>Role</th>
                                        <td mat-cell *matCellDef="let m">
                                            <div class="badge badge-light d-inline-block"
                                                 [class.theme-green]="m.role === 'EMPLOYEE'"
                                                 [class.theme-blue]="m.role === 'STUDENT'"
                                                 [class.theme-red]="m.role === 'MANAGER'"
                                                 [class.theme-yellow]="m.role === 'TUTOR'">
                                                <h4 class="px-1">{{ m.role }}</h4>
                                            </div>
                                        </td>
                                    </ng-container>

                                    <!-- Messages column -->
                                    <ng-container matColumnDef="messages">
                                        <th mat-header-cell *matHeaderCellDef mat-sort-header>Messages</th>
                                        <td mat-cell *matCellDef="let m">
                                            <div class="dash-msg-bar-wrap">
                                                <div class="dash-msg-bar-fill"
                                                     [style.width.%]="(m.messageCount / getMaxMessages()) * 100"></div>
                                                <span class="dash-msg-count">{{ m.messageCount }}</span>
                                            </div>
                                        </td>
                                    </ng-container>

                                    <!-- Rooms column -->
                                    <ng-container matColumnDef="rooms">
                                        <th mat-header-cell *matHeaderCellDef mat-sort-header>Rooms</th>
                                        <td mat-cell *matCellDef="let m">
                                            <p class="mb-0">{{ m.roomCount }}</p>
                                        </td>
                                    </ng-container>

                                    <!-- Last Active column -->
                                    <ng-container matColumnDef="lastActive">
                                        <th mat-header-cell *matHeaderCellDef mat-sort-header>Last Active</th>
                                        <td mat-cell *matCellDef="let m">
                                            <p class="text-secondary small mb-0">{{ getRelativeTime(m.lastActive) }}</p>
                                        </td>
                                    </ng-container>

                                    <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                                    <tr mat-row *matRowDef="let row; columns: displayedColumns;"
                                        class="dash-table-row"></tr>
                                    <tr class="mat-row" *matNoDataRow>
                                        <td class="mat-cell text-secondary small py-3" [attr.colspan]="displayedColumns.length">
                                            No members found.
                                        </td>
                                    </tr>
                                </table>
                                <mat-card-content>
                                    <mat-paginator [pageSizeOptions]="[5, 10, 25]"
                                                   pageSize="5"
                                                   aria-label="Select page"
                                                   class="bg-none"></mat-paginator>
                                </mat-card-content>
                            </mat-card>
                        </div>
                    </div>

                    <!-- ── Activity Chart + Leaderboard ────────────── -->
                    <div class="row gx-3 gx-lg-4">
                        <!-- Bar chart -->
                        <div class="col-12 col-lg-8">
                            <mat-card class="mb-3 mb-lg-4 h-100">
                                <mat-card-header>
                                    <div class="w-100">
                                        <div class="row gx-3 align-items-center">
                                            <div class="col-auto mb-3 mb-lg-4">
                                                <div class="avatar avatar-40 text-theme rounded">
                                                    <mat-icon class="material-icons-outlined">bar_chart</mat-icon>
                                                </div>
                                            </div>
                                            <div class="col mb-3 mb-lg-4">
                                                <h3>Message Activity</h3>
                                                <p class="text-secondary small">Messages per day — last 7 days</p>
                                            </div>
                                        </div>
                                    </div>
                                </mat-card-header>
                                <mat-card-content class="pb-3">
                                    @if (chartData().length === 0) {
                                        <div class="dash-empty-state">
                                            <mat-icon class="material-icons-outlined">bar_chart</mat-icon>
                                            <p>No chart data available</p>
                                        </div>
                                    } @else {
                                        <div class="dash-chart">
                                            @for (entry of chartData(); track entry.day) {
                                                <div class="dash-chart-col">
                                                    <div class="dash-chart-bar-wrap">
                                                        <div class="dash-chart-bar"
                                                             [class.dash-bar-anim]="chartAnimated()"
                                                             [style.--bar-h]="getBarPct(entry.count)"
                                                             [matTooltip]="entry.count + ' messages'">
                                                            @if (entry.count > 0) {
                                                                <span class="dash-bar-val">{{ entry.count }}</span>
                                                            }
                                                        </div>
                                                    </div>
                                                    <div class="dash-chart-label">{{ entry.day }}</div>
                                                </div>
                                            }
                                        </div>
                                    }
                                </mat-card-content>
                            </mat-card>
                        </div>

                        <!-- Leaderboard -->
                        <div class="col-12 col-lg-4">
                            <mat-card class="mb-3 mb-lg-4 h-100">
                                <mat-card-header>
                                    <div class="w-100">
                                        <div class="row gx-3 align-items-center">
                                            <div class="col-auto mb-3 mb-lg-4">
                                                <div class="avatar avatar-40 text-theme rounded">
                                                    <mat-icon class="material-icons-outlined">emoji_events</mat-icon>
                                                </div>
                                            </div>
                                            <div class="col mb-3 mb-lg-4">
                                                <h3>Top Contributors</h3>
                                            </div>
                                        </div>
                                    </div>
                                </mat-card-header>
                                <mat-card-content class="pb-3">
                                    @if (leaderboard().length === 0) {
                                        <div class="dash-empty-state">
                                            <mat-icon class="material-icons-outlined">emoji_events</mat-icon>
                                            <p>No data available</p>
                                        </div>
                                    } @else {
                                        <div class="d-flex flex-column gap-3">
                                            @for (entry of leaderboard(); track entry.rank) {
                                                <div class="dash-leader-row">
                                                    <div class="dash-leader-rank">{{ getMedalEmoji(entry.rank) }}</div>
                                                    <div class="dash-leader-avatar avatar avatar-36 rounded-circle bg-light-theme text-theme d-flex align-items-center justify-content-center fw-bold" style="font-size:12px;flex-shrink:0">
                                                        {{ getInitials(entry.name) }}
                                                    </div>
                                                    <div class="dash-leader-info">
                                                        <div class="dash-leader-name">{{ entry.name }}</div>
                                                        <div class="dash-leader-bar-wrap">
                                                            <div class="dash-leader-bar"
                                                                 [class.dash-leader-bar-anim]="leaderAnimated()"
                                                                 [style.--ldr-w]="entry.percentage + '%'"></div>
                                                        </div>
                                                    </div>
                                                    <div class="dash-leader-count">{{ entry.messageCount }}</div>
                                                </div>
                                            }
                                        </div>
                                    }
                                </mat-card-content>
                            </mat-card>
                        </div>
                    </div>

                    <!-- ── Room Cards ─────────────────────────────── -->
                    <div class="row gx-3 gx-lg-4">
                        <div class="col-12">
                            <mat-card class="mb-3 mb-lg-4">
                                <mat-card-header>
                                    <div class="w-100">
                                        <div class="row gx-3 align-items-center mb-0">
                                            <div class="col-auto mb-3 mb-lg-4">
                                                <div class="avatar avatar-40 text-theme rounded">
                                                    <mat-icon class="material-icons-outlined">meeting_room</mat-icon>
                                                </div>
                                            </div>
                                            <div class="col mb-3 mb-lg-4">
                                                <h3>Chatroom Activity</h3>
                                                <p class="text-secondary small">Messages in the last 7 days</p>
                                            </div>
                                        </div>
                                    </div>
                                </mat-card-header>
                                <mat-card-content>
                                    @if (rooms().length === 0 && !loading()) {
                                        <div class="dash-empty-state">
                                            <mat-icon class="material-icons-outlined">meeting_room</mat-icon>
                                            <p>No rooms found</p>
                                        </div>
                                    } @else {
                                        <div class="row gx-3">
                                            @for (room of rooms(); track room.id; let i = $index) {
                                                <div class="col-12 col-sm-6 col-xl-4 mb-3 dash-room-item"
                                                     [style.animation-delay]="(i * 50) + 'ms'">
                                                    <mat-card class="bg-light-theme shadow-none h-100 dash-room-card">
                                                        <mat-card-content class="py-3">
                                                            <!-- Room header -->
                                                            <div class="d-flex align-items-center justify-content-between mb-2">
                                                                <div class="d-flex align-items-center gap-2">
                                                                    <mat-icon class="text-theme" style="font-size:18px;width:18px;height:18px">tag</mat-icon>
                                                                    <h4 class="mb-0 fw-bold">{{ room.name }}</h4>
                                                                </div>
                                                                <div class="d-flex align-items-center gap-2">
                                                                    <span class="badge badge-light d-inline-block {{ getRoomTypeTheme(room.roomType) }}"
                                                                          style="font-size:10px;padding:3px 8px">
                                                                        {{ getRoomTypeLabel(room.roomType) }}
                                                                    </span>
                                                                    @if (room.roomType === 'meeting') {
                                                                        @if (getMeetingStatus(room) === 'live') {
                                                                            <span class="badge badge-light theme-green dash-live-badge" style="font-size:10px;padding:3px 8px">
                                                                                <span class="dash-live-dot-sm"></span> LIVE
                                                                            </span>
                                                                        } @else if (getMeetingStatus(room) === 'soon') {
                                                                            <span class="badge badge-light theme-yellow dash-soon-badge" style="font-size:10px;padding:3px 8px">
                                                                                SOON
                                                                            </span>
                                                                        }
                                                                    }
                                                                </div>
                                                            </div>

                                                            <!-- Activity bar -->
                                                            <div class="dash-activity-bar-wrap mb-2">
                                                                <div class="dash-activity-bar"
                                                                     [style.width]="getRoomBarWidth(room)"></div>
                                                            </div>

                                                            <!-- Stats row -->
                                                            <div class="d-flex align-items-center gap-3 mb-2">
                                                                <span class="text-secondary small d-flex align-items-center gap-1">
                                                                    <mat-icon style="font-size:13px;width:13px;height:13px">message</mat-icon>
                                                                    {{ room.messageCount }}
                                                                </span>
                                                                <span class="text-secondary small d-flex align-items-center gap-1">
                                                                    <mat-icon style="font-size:13px;width:13px;height:13px">group</mat-icon>
                                                                    {{ room.memberCount }}
                                                                </span>
                                                                @if (room.roomType === 'meeting' && getMeetingStatus(room) === 'live' && room.meetingLink) {
                                                                    <a [href]="room.meetingLink" target="_blank" rel="noopener"
                                                                       class="ms-auto badge badge-light theme-green"
                                                                       style="font-size:11px;padding:4px 10px;text-decoration:none">
                                                                        Join
                                                                    </a>
                                                                }
                                                            </div>

                                                            <!-- Last message preview -->
                                                            @if (room.lastMessage) {
                                                                <p class="text-secondary small fst-italic mb-0 text-truncate"
                                                                   style="font-size:11px">
                                                                    "{{ room.lastMessage }}"
                                                                    @if (room.lastMessageAt) {
                                                                        <span class="ms-1">· {{ getRelativeTime(room.lastMessageAt) }}</span>
                                                                    }
                                                                </p>
                                                            }
                                                        </mat-card-content>
                                                    </mat-card>
                                                </div>
                                            }
                                        </div>
                                    }
                                </mat-card-content>
                            </mat-card>
                        </div>
                    </div>

                    <!-- ── Upcoming Meetings + Activity Feed ─────── -->
                    <div class="row gx-3 gx-lg-4">
                        <!-- Upcoming Meetings Timeline -->
                        <div class="col-12 col-lg-5">
                            <mat-card class="mb-3 mb-lg-4">
                                <mat-card-header>
                                    <div class="w-100">
                                        <div class="row gx-3 align-items-center">
                                            <div class="col-auto mb-3 mb-lg-4">
                                                <div class="avatar avatar-40 text-theme rounded">
                                                    <mat-icon class="material-icons-outlined">calendar_today</mat-icon>
                                                </div>
                                            </div>
                                            <div class="col mb-3 mb-lg-4">
                                                <h3>Upcoming Meetings</h3>
                                            </div>
                                        </div>
                                    </div>
                                </mat-card-header>
                                <mat-card-content class="pb-3">
                                    @if (getUpcomingMeetings().length === 0) {
                                        <div class="dash-empty-state">
                                            <mat-icon class="material-icons-outlined">event_busy</mat-icon>
                                            <p>No upcoming meetings</p>
                                        </div>
                                    } @else {
                                        <div class="dash-timeline">
                                            @for (mtg of getUpcomingMeetings(); track mtg.id; let i = $index; let last = $last) {
                                                <div class="dash-timeline-item" [class.dash-timeline-last]="last">
                                                    <div class="dash-timeline-dot"
                                                         [class.dash-dot-live]="getMeetingStatus(mtg) === 'live'"
                                                         [class.dash-dot-soon]="getMeetingStatus(mtg) === 'soon'">
                                                    </div>
                                                    <div class="dash-timeline-content">
                                                        <div class="d-flex align-items-center justify-content-between mb-1">
                                                            <h4 class="mb-0">{{ mtg.name }}</h4>
                                                            @if (getMeetingStatus(mtg) === 'live') {
                                                                <span class="badge badge-light theme-green" style="font-size:10px;padding:3px 8px">LIVE</span>
                                                            } @else if (getMeetingStatus(mtg) === 'soon') {
                                                                <span class="badge badge-light theme-yellow" style="font-size:10px;padding:3px 8px">SOON</span>
                                                            } @else {
                                                                <span class="badge badge-light" style="font-size:10px;padding:3px 8px">UPCOMING</span>
                                                            }
                                                        </div>
                                                        <p class="text-secondary small mb-1">
                                                            <mat-icon style="font-size:12px;width:12px;height:12px;vertical-align:middle">schedule</mat-icon>
                                                            {{ mtg.startTime ? formatMeetingTime(mtg.startTime) : '—' }}
                                                            <span class="ms-2">
                                                                <mat-icon style="font-size:12px;width:12px;height:12px;vertical-align:middle">group</mat-icon>
                                                                {{ mtg.memberCount }}
                                                            </span>
                                                        </p>
                                                        @if (getMeetingStatus(mtg) === 'live' && mtg.meetingLink) {
                                                            <a [href]="mtg.meetingLink" target="_blank" rel="noopener"
                                                               class="badge badge-light theme-green"
                                                               style="font-size:11px;padding:4px 12px;text-decoration:none">
                                                                Join Meeting
                                                            </a>
                                                        }
                                                    </div>
                                                </div>
                                            }
                                        </div>
                                    }
                                </mat-card-content>
                            </mat-card>
                        </div>

                        <!-- Activity Feed -->
                        <div class="col-12 col-lg-7">
                            <mat-card class="mb-3 mb-lg-4">
                                <mat-card-header>
                                    <div class="w-100">
                                        <div class="row gx-3 align-items-center">
                                            <div class="col-auto mb-3 mb-lg-4">
                                                <div class="avatar avatar-40 text-theme rounded">
                                                    <mat-icon class="material-icons-outlined">feed</mat-icon>
                                                </div>
                                            </div>
                                            <div class="col mb-3 mb-lg-4">
                                                <h3>Recent Activity</h3>
                                                <p class="text-secondary small">Live feed from your rooms</p>
                                            </div>
                                            <div class="col-auto mb-3 mb-lg-4">
                                                <span class="dash-live-indicator">
                                                    <span class="dash-live-dot-sm"></span> Live
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </mat-card-header>
                                <mat-card-content class="pb-3">
                                    @if (activity().length === 0) {
                                        <div class="dash-empty-state">
                                            <mat-icon class="material-icons-outlined">inbox</mat-icon>
                                            <p>No recent activity</p>
                                        </div>
                                    } @else {
                                        <div class="dash-feed">
                                            @for (item of activity(); track item.timestamp + item.senderName; let i = $index) {
                                                <div class="dash-feed-item" [class.dash-feed-fresh]="item.fresh"
                                                     [style.animation-delay]="(i * 30) + 'ms'">
                                                    <div class="avatar avatar-36 rounded-circle bg-light-theme text-theme d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
                                                         style="font-size:12px">
                                                        {{ getInitials(item.senderName) }}
                                                    </div>
                                                    <div class="dash-feed-text">
                                                        <span class="fw-bold">{{ item.senderName }}</span>
                                                        sent a message in
                                                        <span class="text-theme">#{{ item.roomName }}</span>
                                                        @if (item.content) {
                                                            <span class="text-secondary"> — "{{ item.content | slice:0:60 }}{{ item.content.length > 60 ? '…' : '' }}"</span>
                                                        }
                                                    </div>
                                                    <div class="dash-feed-time text-secondary small flex-shrink-0">
                                                        {{ getRelativeTime(item.timestamp) }}
                                                    </div>
                                                </div>
                                            }
                                        </div>
                                    }
                                </mat-card-content>
                            </mat-card>
                        </div>
                    </div>

                </div><!-- /container-fluid -->
            </div><!-- /dash-body -->

        </div><!-- /dash-overlay -->
    `,
    styles: [`
        /* ══ OVERLAY ENTRANCE / EXIT ═══════════════════════════════════════ */
        @keyframes dashSlideIn {
            from { transform: translateX(100%); }
            to   { transform: translateX(0); }
        }
        @keyframes dashSlideOut {
            from { transform: translateX(0); }
            to   { transform: translateX(100%); }
        }
        .dash-overlay {
            position: fixed;
            top: 0; right: 0;
            width: 100vw; height: 100vh;
            z-index: 9000;
            background: var(--mat-template-background, #fff);
            display: flex;
            flex-direction: column;
            animation: dashSlideIn 400ms cubic-bezier(0.16, 1, 0.3, 1) both;
            overflow: hidden;
        }
        .dash-overlay-exit {
            animation: dashSlideOut 300ms ease-in both !important;
        }

        /* ── Sticky header ── */
        .dash-sticky-header {
            position: sticky;
            top: 0;
            z-index: 10;
            flex-shrink: 0;
        }

        /* ── Scrollable body ── */
        .dash-body {
            flex: 1;
            overflow-y: auto;
            overflow-x: hidden;
        }

        /* ══ KPI CARDS ═══════════════════════════════════════════════════ */
        @keyframes kpiCardIn {
            from { transform: translateY(20px); opacity: 0; }
            to   { transform: translateY(0);    opacity: 1; }
        }
        .dash-kpi-item {
            animation: kpiCardIn 380ms cubic-bezier(0.34,1.56,0.64,1) both;
        }

        /* Live dot on KPI card */
        @keyframes dashLivePulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(22,163,74,0.45); }
            50%       { box-shadow: 0 0 0 5px rgba(22,163,74,0); }
        }
        .dash-live-dot {
            position: absolute;
            top: 2px; right: 2px;
            width: 10px; height: 10px;
            border-radius: 50%;
            background: #16a34a;
            animation: dashLivePulse 1.6s ease-in-out infinite;
        }

        /* ══ SKELETON LOADING ════════════════════════════════════════════ */
        @keyframes dashSkeleton {
            0%, 100% { opacity: 0.5; }
            50%       { opacity: 1;   }
        }
        .dash-skeleton-circle {
            width: 50px; height: 50px; border-radius: 10px;
            background: var(--mat-sys-outline-variant, #ddd);
            animation: dashSkeleton 1.4s ease-in-out infinite;
        }
        .dash-skeleton-line {
            height: 10px; border-radius: 6px;
            background: var(--mat-sys-outline-variant, #ddd);
            animation: dashSkeleton 1.4s ease-in-out infinite;
        }
        .dash-sk-sm { width: 60%; }
        .dash-sk-lg { width: 40%; height: 28px; margin-top: 4px; }

        /* ══ MEMBERS TABLE ═══════════════════════════════════════════════ */
        .dash-table-row:hover { background: color-mix(in srgb, var(--mat-sys-primary) 6%, transparent) !important; }

        /* Messages bar inside table */
        .dash-msg-bar-wrap {
            position: relative;
            height: 24px;
            display: flex;
            align-items: center;
            min-width: 80px;
        }
        .dash-msg-bar-fill {
            position: absolute;
            left: 0; top: 4px; bottom: 4px;
            border-radius: 3px;
            background: color-mix(in srgb, var(--mat-sys-primary) 18%, transparent);
            transition: width 0.6s ease;
        }
        .dash-msg-count {
            position: relative;
            font-size: 13px;
            font-weight: 600;
            padding-left: 4px;
            color: var(--mat-sys-on-surface);
        }

        /* ══ ACTIVITY CHART ══════════════════════════════════════════════ */
        .dash-chart {
            display: flex;
            align-items: flex-end;
            gap: 8px;
            height: 180px;
            padding: 0 8px;
        }
        .dash-chart-col {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            height: 100%;
        }
        .dash-chart-bar-wrap {
            flex: 1;
            width: 100%;
            display: flex;
            align-items: flex-end;
        }
        .dash-chart-bar {
            width: 100%;
            height: 0;
            border-radius: 6px 6px 0 0;
            background: linear-gradient(180deg,
                var(--mat-sys-primary) 0%,
                color-mix(in srgb, var(--mat-sys-primary) 60%, transparent) 100%);
            position: relative;
            transition: height 0.7s cubic-bezier(0.34,1.56,0.64,1);
            cursor: default;
        }
        .dash-chart-bar.dash-bar-anim {
            height: var(--bar-h, 0%);
        }
        .dash-bar-val {
            position: absolute;
            top: -20px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 10px;
            font-weight: 700;
            color: var(--mat-sys-on-surface-variant);
            white-space: nowrap;
        }
        .dash-chart-label {
            font-size: 10px;
            font-weight: 600;
            color: var(--mat-sys-on-surface-variant);
            text-align: center;
            margin-top: 6px;
            letter-spacing: 0.3px;
            text-transform: uppercase;
        }

        /* ══ LEADERBOARD ═════════════════════════════════════════════════ */
        .dash-leader-row {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .dash-leader-rank {
            font-size: 18px;
            width: 28px;
            text-align: center;
            flex-shrink: 0;
        }
        .dash-leader-info {
            flex: 1;
            min-width: 0;
        }
        .dash-leader-name {
            font-size: 13px;
            font-weight: 600;
            margin-bottom: 3px;
            color: var(--mat-sys-on-surface);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .dash-leader-bar-wrap {
            height: 5px;
            background: var(--mat-sys-outline-variant, #ddd);
            border-radius: 3px;
            overflow: hidden;
        }
        .dash-leader-bar {
            height: 100%;
            width: 0;
            border-radius: 3px;
            background: var(--mat-sys-primary);
            transition: width 700ms ease;
        }
        .dash-leader-bar.dash-leader-bar-anim {
            width: var(--ldr-w, 0%);
        }
        .dash-leader-count {
            font-size: 13px;
            font-weight: 700;
            color: var(--mat-sys-primary);
            flex-shrink: 0;
            min-width: 32px;
            text-align: right;
        }

        /* ══ ROOM CARDS ══════════════════════════════════════════════════ */
        @keyframes roomCardIn {
            from { transform: translateY(12px); opacity: 0; }
            to   { transform: translateY(0);    opacity: 1; }
        }
        .dash-room-item {
            animation: roomCardIn 350ms cubic-bezier(0.34,1.56,0.64,1) both;
        }
        .dash-room-card {
            transition: transform 0.18s ease, box-shadow 0.18s ease;
        }
        .dash-room-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0,0,0,0.1) !important;
        }
        /* Activity bar inside room card */
        .dash-activity-bar-wrap {
            height: 4px;
            background: var(--mat-sys-outline-variant, #ddd);
            border-radius: 2px;
            overflow: hidden;
        }
        .dash-activity-bar {
            height: 100%;
            background: var(--mat-sys-primary);
            border-radius: 2px;
            transition: width 0.8s cubic-bezier(0.34,1.56,0.64,1);
        }

        /* Live / soon room badges */
        @keyframes dashSoonPulse {
            0%,100% { opacity: 1; }
            50%      { opacity: 0.6; }
        }
        .dash-soon-badge { animation: dashSoonPulse 1.4s ease infinite; }
        .dash-live-badge { animation: dashSoonPulse 0.9s ease infinite; }
        .dash-live-dot-sm {
            display: inline-block;
            width: 6px; height: 6px;
            border-radius: 50%;
            background: #16a34a;
            margin-right: 3px;
            vertical-align: middle;
            animation: dashLivePulse 1.2s ease-in-out infinite;
        }

        /* ══ UPCOMING MEETINGS TIMELINE ══════════════════════════════════ */
        .dash-timeline {
            display: flex;
            flex-direction: column;
            gap: 0;
        }
        .dash-timeline-item {
            display: flex;
            gap: 14px;
            padding-bottom: 20px;
            position: relative;
        }
        .dash-timeline-item:not(.dash-timeline-last)::before {
            content: '';
            position: absolute;
            left: 7px;
            top: 16px;
            bottom: 0;
            width: 2px;
            background: var(--mat-sys-outline-variant, #ddd);
        }
        .dash-timeline-dot {
            width: 16px; height: 16px;
            border-radius: 50%;
            border: 2px solid var(--mat-sys-outline-variant, #ddd);
            background: var(--mat-template-background, #fff);
            flex-shrink: 0;
            margin-top: 2px;
        }
        .dash-dot-live {
            border-color: #16a34a;
            background: #16a34a;
            animation: dashLivePulse 1.4s ease-in-out infinite;
        }
        .dash-dot-soon {
            border-color: #f59e0b;
            background: #f59e0b;
            animation: dashSoonPulse 1.4s ease infinite;
        }
        .dash-timeline-content { flex: 1; }

        /* ══ ACTIVITY FEED ═══════════════════════════════════════════════ */
        @keyframes feedItemIn {
            from { transform: translateX(-14px); opacity: 0; }
            to   { transform: translateX(0);     opacity: 1; }
        }
        .dash-feed { display: flex; flex-direction: column; gap: 0; }
        .dash-feed-item {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            padding: 8px 0;
            border-bottom: 1px solid var(--mat-sys-outline-variant, #ddd);
            animation: feedItemIn 350ms cubic-bezier(0.34,1.56,0.64,1) both;
        }
        .dash-feed-item:last-child { border-bottom: none; }
        @keyframes feedFreshIn {
            from { background: color-mix(in srgb, var(--mat-sys-primary) 12%, transparent); }
            to   { background: transparent; }
        }
        .dash-feed-fresh { animation: feedFreshIn 1.5s ease forwards, feedItemIn 350ms cubic-bezier(0.34,1.56,0.64,1) both !important; }
        .dash-feed-text {
            flex: 1;
            font-size: 12.5px;
            line-height: 1.5;
            color: var(--mat-sys-on-surface);
        }
        .dash-feed-time {
            font-size: 11px;
            color: var(--mat-sys-on-surface-variant);
            white-space: nowrap;
        }

        /* ══ LIVE INDICATOR ══════════════════════════════════════════════ */
        .dash-live-indicator {
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 11px;
            font-weight: 600;
            color: #16a34a;
        }

        /* ══ EMPTY STATE ═════════════════════════════════════════════════ */
        .dash-empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 32px 16px;
            color: var(--mat-sys-on-surface-variant);
            text-align: center;
        }
        .dash-empty-state mat-icon {
            font-size: 48px !important;
            width: 48px !important;
            height: 48px !important;
            margin-bottom: 10px;
            opacity: 0.4;
        }
        .dash-empty-state p { font-size: 13px; margin: 0; }

        /* ══ REFRESH SPIN ════════════════════════════════════════════════ */
        @keyframes dashRefreshSpin { to { transform: rotate(360deg); } }
        .dash-spin mat-icon { animation: dashRefreshSpin 0.8s linear infinite; display: block; }

        /* ══ AVATAR 36 ═══════════════════════════════════════════════════ */
        .avatar-36 { width: 36px !important; height: 36px !important; line-height: 36px !important; }
    `],
})
export class ChatDashboardPanelComponent implements OnInit, OnDestroy, AfterViewInit {
    @Output() closed = new EventEmitter<void>();
    @ViewChild(MatPaginator) paginator!: MatPaginator;
    @ViewChild(MatSort) sort!: MatSort;

    // ── State ────────────────────────────────────────────────
    closing    = signal(false);
    loading    = signal(true);
    refreshing = signal(false);

    // ── Overview / KPI ──────────────────────────────────────
    overview         = signal<DashboardOverview | null>(null);
    animTeamMembers  = signal(0);
    animActiveRooms  = signal(0);
    animMsgToday     = signal(0);
    animMeetings     = signal(0);

    // ── Members table ────────────────────────────────────────
    dataSource       = new MatTableDataSource<DashboardMember>([]);
    displayedColumns = ['member', 'role', 'messages', 'rooms', 'lastActive'];
    memberFilter     = signal<'all' | 'most_active' | 'recent'>('all');
    private filterQuery = signal('');

    // ── Rooms ────────────────────────────────────────────────
    rooms            = signal<DashboardRoom[]>([]);
    private roomMaxMsgs = signal(1);

    // ── Chart ────────────────────────────────────────────────
    chartData        = signal<DashboardChartEntry[]>([]);
    private chartMax = signal(1);
    chartAnimated    = signal(false);

    // ── Leaderboard ──────────────────────────────────────────
    leaderboard      = signal<DashboardLeaderEntry[]>([]);
    leaderAnimated   = signal(false);

    // ── Activity feed ────────────────────────────────────────
    activity         = signal<DashboardActivity[]>([]);
    private wsSubs: Subscription[] = [];

    constructor(
        private chatRoomService: ChatRoomService,
        private chatMessageService: ChatMessageService,
    ) {}

    ngOnInit(): void { this.loadAll(); }

    ngAfterViewInit(): void {
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
        this.dataSource.sortingDataAccessor = (item, col) => {
            switch (col) {
                case 'member':     return item.name;
                case 'role':       return item.role;
                case 'messages':   return item.messageCount;
                case 'rooms':      return item.roomCount;
                case 'lastActive': return item.lastActive;
                default:           return '';
            }
        };
    }

    ngOnDestroy(): void {
        this.wsSubs.forEach(s => s.unsubscribe());
    }

    // ── Data loading ─────────────────────────────────────────

    loadAll(): void {
        this.loading.set(true);

        this.chatRoomService.getDashboardOverview().subscribe({
            next: (data: DashboardOverview) => {
                this.overview.set(data);
                setTimeout(() => {
                    this.animateValue(data.totalMembers,    v => this.animTeamMembers.set(v));
                    this.animateValue(data.activeChatrooms, v => this.animActiveRooms.set(v));
                    this.animateValue(data.messagesToday,   v => this.animMsgToday.set(v));
                    this.animateValue(data.meetingsThisWeek, v => this.animMeetings.set(v));
                }, 150);
            },
            error: () => {},
        });

        this.chatRoomService.getDashboardMembers().subscribe({
            next: (data: DashboardMember[]) => {
                this.dataSource.data = data;
                this.dataSource.paginator = this.paginator;
                this.dataSource.sort = this.sort;
                this.loading.set(false);
            },
            error: () => { this.loading.set(false); },
        });

        this.chatRoomService.getDashboardRooms().subscribe({
            next: (data: DashboardRoom[]) => {
                this.rooms.set(data);
                const max = Math.max(...data.map(d => d.messagesLast7Days), 1);
                this.roomMaxMsgs.set(max);
                this.wsSubs.forEach(s => s.unsubscribe());
                this.wsSubs = [];
                this.subscribeToRoomsWs(data.map(r => r.id).slice(0, 6));
            },
            error: () => {},
        });

        this.chatRoomService.getDashboardChart().subscribe({
            next: (data: DashboardChartEntry[]) => {
                this.chartData.set(data);
                this.chartMax.set(Math.max(...data.map(d => d.count), 1));
                this.chartAnimated.set(false);
                setTimeout(() => this.chartAnimated.set(true), 250);
            },
            error: () => {},
        });

        this.chatRoomService.getDashboardLeaderboard().subscribe({
            next: (data: DashboardLeaderEntry[]) => {
                this.leaderboard.set(data);
                this.leaderAnimated.set(false);
                setTimeout(() => this.leaderAnimated.set(true), 350);
            },
            error: () => {},
        });

        this.chatRoomService.getDashboardActivity().subscribe({
            next: (data: DashboardActivity[]) => {
                this.activity.set(data.slice(0, 20));
            },
            error: () => {},
        });
    }

    refresh(): void {
        this.refreshing.set(true);
        this.loadAll();
        setTimeout(() => this.refreshing.set(false), 800);
    }

    close(): void {
        this.closing.set(true);
        setTimeout(() => this.closed.emit(), 300);
    }

    // ── WebSocket live feed ──────────────────────────────────

    private subscribeToRoomsWs(roomIds: number[]): void {
        roomIds.forEach(id => {
            const roomName = this.rooms().find(r => r.id === id)?.name ?? String(id);
            const sub = this.chatMessageService.subscribeToRoom(id).subscribe(msg => {
                const item: DashboardActivity = {
                    senderName: msg.senderName,
                    roomName,
                    content: msg.contentText ?? msg.fileName ?? '(attachment)',
                    timestamp: new Date().toISOString(),
                    fresh: true,
                };
                this.activity.update(feed => [item, ...feed].slice(0, 20));
                // clear the "fresh" flag after the animation
                setTimeout(() => {
                    this.activity.update(feed =>
                        feed.map((f, i) => i === 0 ? { ...f, fresh: false } : f)
                    );
                }, 1600);
            });
            this.wsSubs.push(sub);
        });
    }

    // ── Helpers ──────────────────────────────────────────────

    private animateValue(target: number, setter: (v: number) => void): void {
        setter(0);
        if (target <= 0) return;
        const steps = Math.min(Math.max(target, 1), 60);
        const increment = target / steps;
        const delay = 1000 / steps;
        let current = 0;
        const t = setInterval(() => {
            current = Math.min(current + increment, target);
            setter(Math.round(current));
            if (current >= target) clearInterval(t);
        }, delay);
    }

    applyFilter(event: Event): void {
        const q = (event.target as HTMLInputElement).value.trim().toLowerCase();
        this.filterQuery.set(q);
        this.updateFilter();
    }

    setMemberFilter(f: 'all' | 'most_active' | 'recent'): void {
        this.memberFilter.set(f);
        this.updateFilter();
    }

    private updateFilter(): void {
        const q = this.filterQuery();
        const f = this.memberFilter();
        this.dataSource.filterPredicate = (data: DashboardMember) => {
            const nameMatch = !q || data.name.toLowerCase().includes(q)
                                 || data.email.toLowerCase().includes(q);
            if (!nameMatch) return false;
            if (f === 'most_active') return data.messageCount > 5;
            if (f === 'recent') {
                const d = new Date(data.lastActive);
                if (isNaN(d.getTime())) return true;
                const cutoff = new Date();
                cutoff.setDate(cutoff.getDate() - 7);
                return d >= cutoff;
            }
            return true;
        };
        this.dataSource.filter = q + f;
    }

    getInitials(name: string): string {
        if (!name) return '?';
        return name.split(' ').map(n => n[0] ?? '').filter(Boolean).slice(0, 2).join('').toUpperCase();
    }

    getRelativeTime(dateStr: string): string {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '—';
        const diff = Math.floor((Date.now() - d.getTime()) / 1000);
        if (diff < 60)     return 'Just now';
        if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`;
        if (diff < 172800) return 'Yesterday';
        return `${Math.floor(diff / 86400)}d ago`;
    }

    formatMeetingTime(dateStr: string): string {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '—';
        const now = new Date();
        const today = now.toDateString() === d.toDateString();
        const time = d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
        return today ? `Today ${time}` : `${d.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })} ${time}`;
    }

    getRoomTypeLabel(type: string): string {
        const map: Record<string, string> = {
            general: 'General', task_thread: 'Task',
            deliverable_review: 'Review', private_room: 'Private', meeting: 'Meeting',
        };
        return map[type] ?? type;
    }

    getRoomTypeTheme(type: string): string {
        const map: Record<string, string> = {
            general: 'theme-cyan', task_thread: 'theme-blue',
            deliverable_review: 'theme-yellow', private_room: 'theme-violet', meeting: 'theme-green',
        };
        return map[type] ?? '';
    }

    getMeetingStatus(room: DashboardRoom): 'live' | 'soon' | 'upcoming' | null {
        if (!room.startTime) return null;
        const diff = (new Date(room.startTime).getTime() - Date.now()) / 60000;
        if (diff <= 0 && diff > -120) return 'live';
        if (diff > 0 && diff <= 15)  return 'soon';
        if (diff > 15)               return 'upcoming';
        return null;
    }

    getUpcomingMeetings(): DashboardRoom[] {
        return this.rooms()
            .filter(r => r.roomType === 'meeting')
            .sort((a, b) => {
                const ta = a.startTime ? new Date(a.startTime).getTime() : Infinity;
                const tb = b.startTime ? new Date(b.startTime).getTime() : Infinity;
                return ta - tb;
            })
            .slice(0, 6);
    }

    getBarPct(count: number): string {
        return `${Math.round((count / this.chartMax()) * 100)}%`;
    }

    getRoomBarWidth(room: DashboardRoom): string {
        return `${Math.round((room.messagesLast7Days / this.roomMaxMsgs()) * 100)}%`;
    }

    getMaxMessages(): number {
        return Math.max(...this.dataSource.data.map(m => m.messageCount), 1);
    }

    getMedalEmoji(rank: number): string {
        if (rank === 1) return '🥇';
        if (rank === 2) return '🥈';
        if (rank === 3) return '🥉';
        return String(rank);
    }
}
