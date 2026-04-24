import {
    Component, OnInit, OnDestroy, AfterViewInit,
    Output, EventEmitter, ViewChild,
    signal, computed, ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
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
import { MatRippleModule } from '@angular/material/core';
import { Subscription } from 'rxjs';
import { trigger, transition, style, animate } from '@angular/animations';
import { ChatRoomService } from './chat-room.service';
import { ChatMessageService } from './chat-message.service';
import { ModerationService } from './moderation.service';

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
        MatCardModule, MatIconModule, MatButtonModule, MatButtonToggleModule,
        MatTableModule, MatPaginatorModule, MatSortModule,
        MatFormFieldModule, MatInputModule,
        MatProgressBarModule, MatProgressSpinnerModule,
        MatChipsModule, MatTooltipModule, MatDividerModule, MatRippleModule,
    ],
    animations: [
        trigger('dashReportWarn', [
            transition(':enter', [
                style({ transform: 'translateY(-12px) scale(0.97)', opacity: 0 }),
                animate('360ms cubic-bezier(0.34,1.56,0.64,1)', style({ transform: 'translateY(0) scale(1)', opacity: 1 })),
            ]),
            transition(':leave', [
                animate('220ms ease-in', style({ transform: 'translateY(-12px) scale(0.97)', opacity: 0 })),
            ]),
        ]),
    ],
    template: `
<div class="dash-overlay" [class.dash-overlay-exit]="closing()">

  <!-- ── Sticky header ──────────────────────────────────────────────── -->
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
            <button mat-icon-button (click)="refresh()" matTooltip="Refresh" [class.dash-spin]="refreshing()">
              <mat-icon>refresh</mat-icon>
            </button>
          </div>
        </div>
      </mat-card>
    </div>
  </div>

  <!-- ── Scrollable body ────────────────────────────────────────────── -->
  <div class="dash-body" (click)="onBodyClick($event)">
    <div class="container-fluid px-3 px-lg-4 py-3">

      <!-- ══ KPI CARDS — DO NOT TOUCH ══════════════════════════════════ -->
      <div class="row gx-3 gx-lg-4">
        @if (loading()) {
          @for (i of [1,2,3,4]; track i) {
            <div class="col-6 col-sm-6 col-md-3">
              <mat-card class="mb-3 mb-lg-4">
                <mat-card-content>
                  <div class="row gx-3 align-items-center">
                    <div class="col-auto mb-3 mb-xl-0"><div class="dash-skeleton-circle"></div></div>
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
      <!-- ══ END KPI CARDS ══════════════════════════════════════════════ -->

      <!-- ══ PENDING REPORTS WARNING CARD ════════════════════════════════ -->
      @if (pendingReportCount() > 0) {
        <div class="row gx-3 gx-lg-4 mb-3 mb-lg-4" [@dashReportWarn]>
          <div class="col-12">
            <div class="dash-mod-warn-card">
              <div class="dash-mod-warn-left">
                <div class="dash-mod-warn-icon">
                  <mat-icon style="color:#ef4444;font-size:22px;width:22px;height:22px">flag</mat-icon>
                </div>
                <div>
                  <span class="dash-mod-warn-title">{{ pendingReportCount() }} pending report{{ pendingReportCount() > 1 ? 's' : '' }} require attention</span>
                  <span class="dash-mod-warn-sub">Review and take action to keep your community safe</span>
                </div>
              </div>
              <button mat-flat-button color="warn" class="dash-mod-warn-btn" (click)="close()">
                Open Moderation Center
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ══ SECTION 1 — Team Pulse ══════════════════════════════════════ -->
      <div class="dash-section" style="animation-delay:80ms">
        <div class="row gx-3 gx-lg-4">
          <div class="col-12">
            <mat-card class="mb-3 mb-lg-4">
              <mat-card-content class="pt-3">
                <!-- Header row -->
                <div class="d-flex align-items-center gap-3 mb-3 flex-wrap">
                  <div class="pulse-section-icon">
                    <mat-icon class="text-theme">people</mat-icon>
                  </div>
                  <div class="flex-grow-1">
                    <h3 class="mb-0 fw-bold">Team Pulse</h3>
                    <p class="small text-secondary mb-0">All members in your rooms</p>
                  </div>
                  <mat-button-toggle-group [value]="membersView()" (change)="membersView.set($event.value)" class="pulse-view-toggle">
                    <mat-button-toggle value="card" matTooltip="Card view">
                      <mat-icon style="font-size:18px;width:18px;height:18px">grid_view</mat-icon>
                      <span class="ms-1 d-none d-sm-inline">Cards</span>
                    </mat-button-toggle>
                    <mat-button-toggle value="table" matTooltip="Table view">
                      <mat-icon style="font-size:18px;width:18px;height:18px">table_rows</mat-icon>
                      <span class="ms-1 d-none d-sm-inline">Table</span>
                    </mat-button-toggle>
                  </mat-button-toggle-group>
                </div>
                <!-- Search + filters -->
                <div class="d-flex align-items-center gap-3 mb-3 flex-wrap">
                  <mat-form-field appearance="outline" class="inline-small" style="max-width:260px">
                    <mat-label>Search members</mat-label>
                    <mat-icon matPrefix>search</mat-icon>
                    <input matInput placeholder="Name or email" (keyup)="applyFilter($event)" />
                  </mat-form-field>
                  <div class="d-flex gap-2 flex-wrap">
                    <span class="pulse-filter-chip" [class.pulse-filter-chip-active]="memberFilter()==='all'" (click)="setMemberFilter('all')">All</span>
                    <span class="pulse-filter-chip" [class.pulse-filter-chip-active]="memberFilter()==='most_active'" (click)="setMemberFilter('most_active')">Most Active</span>
                    <span class="pulse-filter-chip" [class.pulse-filter-chip-active]="memberFilter()==='recent'" (click)="setMemberFilter('recent')">Recently Active</span>
                  </div>
                </div>

                <!-- ── Card view ── -->
                @if (membersView() === 'card') {
                  @if (loading()) {
                    <div class="pulse-cards-grid">
                      @for (i of [1,2,3,4,5,6]; track i) {
                        <div class="pulse-member-card-skeleton">
                          <div class="d-flex align-items-center gap-3 mb-3">
                            <div class="dash-skeleton-circle"></div>
                            <div class="flex-grow-1">
                              <div class="dash-skeleton-line mb-2" style="width:60%"></div>
                              <div class="dash-skeleton-line" style="width:80%"></div>
                            </div>
                          </div>
                          <div class="dash-skeleton-line mb-2"></div>
                        </div>
                      }
                    </div>
                  } @else if (membersForCards.length === 0) {
                    <div class="dash-empty-state">
                      <mat-icon class="material-icons-outlined">people</mat-icon>
                      <p>No members found</p>
                    </div>
                  } @else {
                    <div class="pulse-cards-grid">
                      @for (m of membersForCards; track m.id; let i = $index) {
                        <div class="pulse-member-card" [style.animation-delay]="(i * 60) + 'ms'">
                          <!-- Avatar + status -->
                          <div class="d-flex align-items-start gap-3 mb-3">
                            <div class="pulse-avatar-wrap">
                              <div class="pulse-avatar"
                                   [style.background]="'hsl(' + getAvatarHue(m.name) + ',55%,88%)'"
                                   [style.color]="'hsl(' + getAvatarHue(m.name) + ',55%,32%)'">
                                {{ getInitials(m.name) }}
                              </div>
                              <span class="pulse-status-dot"
                                    [class.pulse-dot-online]="getMemberStatus(m.lastActive)==='online'"
                                    [class.pulse-dot-away]="getMemberStatus(m.lastActive)==='away'"
                                    [class.pulse-dot-offline]="getMemberStatus(m.lastActive)==='offline'">
                              </span>
                            </div>
                            <div style="min-width:0;flex:1">
                              <p class="pulse-member-name mb-0">{{ m.name }}</p>
                              <p class="pulse-member-email mb-1">{{ m.email }}</p>
                              <span class="pulse-role-badge"
                                    [class.pulse-role-employee]="m.role==='EMPLOYEE'"
                                    [class.pulse-role-student]="m.role==='STUDENT'"
                                    [class.pulse-role-manager]="m.role==='MANAGER'"
                                    [class.pulse-role-tutor]="m.role==='TUTOR'">
                                {{ m.role }}
                              </span>
                            </div>
                          </div>
                          <!-- Mini stats -->
                          <div class="pulse-member-stats">
                            <div class="pulse-stat">
                              <mat-icon class="pulse-stat-icon">chat</mat-icon>
                              <span class="pulse-stat-val">{{ m.messageCount }}</span>
                            </div>
                            <div class="pulse-stat">
                              <mat-icon class="pulse-stat-icon">meeting_room</mat-icon>
                              <span class="pulse-stat-val">{{ m.roomCount }}</span>
                            </div>
                            <div class="pulse-stat">
                              <mat-icon class="pulse-stat-icon">schedule</mat-icon>
                              <span class="pulse-stat-val" style="font-size:10px">{{ getRelativeTime(m.lastActive) }}</span>
                            </div>
                          </div>
                          <!-- Activity bar -->
                          <div class="pulse-activity-track">
                            <div class="pulse-activity-fill"
                                 [class.pulse-activity-anim]="membersAnimated()"
                                 [style.--act-w]="((m.messageCount / getMaxMessages()) * 100) + '%'">
                            </div>
                          </div>
                        </div>
                      }
                    </div>
                  }
                }

                <!-- ── Table view ── -->
                @if (membersView() === 'table') {
                  <table mat-table [dataSource]="dataSource" matSort class="bg-none mb-3 responsive-table w-100">
                    <ng-container matColumnDef="member">
                      <th mat-header-cell *matHeaderCellDef mat-sort-header>Member</th>
                      <td mat-cell *matCellDef="let m" class="py-2">
                        <div class="d-flex align-items-center gap-3">
                          <div class="pulse-avatar-wrap pulse-avatar-sm">
                            <div class="pulse-avatar pulse-avatar-sm-inner"
                                 [style.background]="'hsl(' + getAvatarHue(m.name) + ',55%,88%)'"
                                 [style.color]="'hsl(' + getAvatarHue(m.name) + ',55%,32%)'">
                              {{ getInitials(m.name) }}
                            </div>
                            <span class="pulse-status-dot pulse-status-dot-sm"
                                  [class.pulse-dot-online]="getMemberStatus(m.lastActive)==='online'"
                                  [class.pulse-dot-away]="getMemberStatus(m.lastActive)==='away'"
                                  [class.pulse-dot-offline]="getMemberStatus(m.lastActive)==='offline'">
                            </span>
                          </div>
                          <div>
                            <h4 class="mb-0">{{ m.name }}</h4>
                            <p class="text-secondary small mb-0">{{ m.email }}</p>
                          </div>
                        </div>
                      </td>
                    </ng-container>
                    <ng-container matColumnDef="role">
                      <th mat-header-cell *matHeaderCellDef mat-sort-header>Role</th>
                      <td mat-cell *matCellDef="let m">
                        <span class="pulse-role-badge"
                              [class.pulse-role-employee]="m.role==='EMPLOYEE'"
                              [class.pulse-role-student]="m.role==='STUDENT'"
                              [class.pulse-role-manager]="m.role==='MANAGER'"
                              [class.pulse-role-tutor]="m.role==='TUTOR'">{{ m.role }}</span>
                      </td>
                    </ng-container>
                    <ng-container matColumnDef="messages">
                      <th mat-header-cell *matHeaderCellDef mat-sort-header>Messages</th>
                      <td mat-cell *matCellDef="let m">
                        <div class="dash-msg-bar-wrap">
                          <div class="dash-msg-bar-fill" [style.width.%]="(m.messageCount / getMaxMessages()) * 100"></div>
                          <span class="dash-msg-count">{{ m.messageCount }}</span>
                        </div>
                      </td>
                    </ng-container>
                    <ng-container matColumnDef="rooms">
                      <th mat-header-cell *matHeaderCellDef mat-sort-header>Rooms</th>
                      <td mat-cell *matCellDef="let m"><p class="mb-0">{{ m.roomCount }}</p></td>
                    </ng-container>
                    <ng-container matColumnDef="lastActive">
                      <th mat-header-cell *matHeaderCellDef mat-sort-header>Last Active</th>
                      <td mat-cell *matCellDef="let m">
                        <span class="pulse-time-chip"
                              [class.pulse-time-today]="getMemberStatus(m.lastActive)==='online'"
                              [class.pulse-time-week]="getMemberStatus(m.lastActive)==='away'">
                          {{ getRelativeTime(m.lastActive) }}
                        </span>
                      </td>
                    </ng-container>
                    <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                    <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="dash-table-row"></tr>
                    <tr class="mat-row" *matNoDataRow>
                      <td class="mat-cell text-secondary small py-3" [attr.colspan]="displayedColumns.length">No members found.</td>
                    </tr>
                  </table>
                  <mat-paginator [pageSizeOptions]="[5,10,25]" pageSize="5" aria-label="Select page" class="bg-none"></mat-paginator>
                }
              </mat-card-content>
            </mat-card>
          </div>
        </div>
      </div>

      <!-- ══ SECTION 2 + 4 — Chart & Hall of Fame ═══════════════════════ -->
      <div class="dash-section" style="animation-delay:160ms">
        <div class="row gx-3 gx-lg-4">

          <!-- Live Pulse Chart -->
          <div class="col-12 col-lg-8">
            <mat-card class="mb-3 mb-lg-4 h-100">
              <mat-card-content class="p-3">
                <!-- Chart header -->
                <div class="d-flex align-items-center gap-3 mb-3 flex-wrap">
                  <div class="pulse-section-icon">
                    <mat-icon class="text-theme">show_chart</mat-icon>
                  </div>
                  <div class="flex-grow-1">
                    <h3 class="mb-0 fw-bold">Live Pulse</h3>
                    <p class="small text-secondary mb-0">Message activity — last {{ chartPeriod() }} days</p>
                  </div>
                  <!-- Period toggle -->
                  <mat-button-toggle-group class="pulse-period-toggle" [value]="chartPeriod()" (change)="chartPeriod.set($event.value)">
                    <mat-button-toggle [value]="7">7d</mat-button-toggle>
                    <mat-button-toggle [value]="30">30d</mat-button-toggle>
                  </mat-button-toggle-group>
                  <!-- Weekly total -->
                  <div class="pulse-chart-kpi">
                    <span class="pulse-chart-kpi-val">{{ animWeeklyTotal() }}</span>
                    <span class="pulse-chart-kpi-lbl">this week</span>
                    @if (weeklyStats().growth !== 0) {
                      <span class="pulse-chart-kpi-trend" [class.pulse-trend-up]="weeklyStats().growth > 0" [class.pulse-trend-down]="weeklyStats().growth < 0">
                        <mat-icon style="font-size:14px;width:14px;height:14px">{{ weeklyStats().growth > 0 ? 'trending_up' : 'trending_down' }}</mat-icon>
                        {{ weeklyStats().growth > 0 ? '+' : '' }}{{ weeklyStats().growth }}%
                      </span>
                    }
                  </div>
                </div>

                @if (chartData().length === 0 && !loading()) {
                  <div class="dash-empty-state">
                    <mat-icon class="material-icons-outlined">bar_chart</mat-icon>
                    <p>No chart data available</p>
                  </div>
                } @else {
                  <!-- Chart with grid lines -->
                  <div class="pulse-chart-host">
                    <!-- Horizontal grid lines -->
                    <div class="pulse-grid-line" style="top:0%"><span class="pulse-grid-label">{{ chartMax() }}</span></div>
                    <div class="pulse-grid-line" style="top:25%"><span class="pulse-grid-label">{{ Math.round(chartMax() * 0.75) }}</span></div>
                    <div class="pulse-grid-line" style="top:50%"><span class="pulse-grid-label">{{ Math.round(chartMax() * 0.5) }}</span></div>
                    <div class="pulse-grid-line" style="top:75%"><span class="pulse-grid-label">{{ Math.round(chartMax() * 0.25) }}</span></div>
                    <!-- Bars -->
                    <div class="pulse-bars">
                      @for (entry of chartData(); track entry.day; let i = $index) {
                        <div class="pulse-bar-col">
                          <div class="pulse-bar-wrap">
                            <div class="pulse-bar"
                                 [class.pulse-bar-anim]="chartAnimated()"
                                 [style.--bar-h]="getBarPct(entry.count)"
                                 [style.transition-delay]="(i * 60) + 'ms'"
                                 [matTooltip]="entry.day + ': ' + entry.count + ' messages'">
                              @if (entry.count > 0) {
                                <span class="pulse-bar-val">{{ entry.count }}</span>
                              }
                            </div>
                          </div>
                          <div class="pulse-bar-label">{{ entry.day }}</div>
                        </div>
                      }
                    </div>
                  </div>
                  <!-- Chart footer stats -->
                  <div class="d-flex gap-4 mt-3 flex-wrap">
                    <div class="pulse-chart-stat">
                      <span class="pulse-chart-stat-lbl">Daily avg</span>
                      <span class="pulse-chart-stat-val">{{ weeklyStats().avg }}</span>
                    </div>
                    <div class="pulse-chart-stat">
                      <span class="pulse-chart-stat-lbl">Peak day</span>
                      <span class="pulse-chart-stat-val text-theme">{{ weeklyStats().peak }}</span>
                    </div>
                  </div>
                }
              </mat-card-content>
            </mat-card>
          </div>

          <!-- Hall of Fame -->
          <div class="col-12 col-lg-4">
            <mat-card class="mb-3 mb-lg-4 h-100">
              <mat-card-content class="p-3">
                <div class="d-flex align-items-center gap-3 mb-4">
                  <div class="pulse-section-icon">
                    <mat-icon class="text-theme">emoji_events</mat-icon>
                  </div>
                  <div>
                    <h3 class="mb-0 fw-bold">Hall of Fame</h3>
                    <p class="small text-secondary mb-0">Top contributors</p>
                  </div>
                </div>

                @if (leaderboard().length === 0 && !loading()) {
                  <div class="dash-empty-state">
                    <mat-icon class="material-icons-outlined">emoji_events</mat-icon>
                    <p>No data available</p>
                  </div>
                } @else {
                  <!-- Podium top 3 -->
                  @if (leaderboard().length >= 3) {
                    <div class="fame-podium" [class.fame-podium-visible]="podiumVisible()">
                      <!-- 2nd place -->
                      <div class="fame-col fame-col-2">
                        <div class="fame-inner">
                          <div class="fame-avatar"
                               [style.background]="'hsl(' + getAvatarHue(leaderboard()[1].name) + ',55%,88%)'"
                               [style.color]="'hsl(' + getAvatarHue(leaderboard()[1].name) + ',55%,32%)'">
                            {{ getInitials(leaderboard()[1].name) }}
                          </div>
                          <p class="fame-medal">🥈</p>
                          <p class="fame-name">{{ leaderboard()[1].name }}</p>
                          <p class="fame-count">{{ leaderboard()[1].messageCount }}</p>
                          <div class="fame-base fame-base-2"></div>
                        </div>
                      </div>
                      <!-- 1st place -->
                      <div class="fame-col fame-col-1">
                        <div class="fame-inner">
                          <div class="fame-avatar fame-avatar-gold"
                               [style.background]="'hsl(' + getAvatarHue(leaderboard()[0].name) + ',55%,88%)'"
                               [style.color]="'hsl(' + getAvatarHue(leaderboard()[0].name) + ',55%,32%)'">
                            {{ getInitials(leaderboard()[0].name) }}
                          </div>
                          <p class="fame-medal">🥇</p>
                          <p class="fame-name fw-bold">{{ leaderboard()[0].name }}</p>
                          <p class="fame-count text-theme fw-bold">{{ leaderboard()[0].messageCount }}</p>
                          <div class="fame-base fame-base-1"></div>
                        </div>
                      </div>
                      <!-- 3rd place -->
                      <div class="fame-col fame-col-3">
                        <div class="fame-inner">
                          <div class="fame-avatar"
                               [style.background]="'hsl(' + getAvatarHue(leaderboard()[2].name) + ',55%,88%)'"
                               [style.color]="'hsl(' + getAvatarHue(leaderboard()[2].name) + ',55%,32%)'">
                            {{ getInitials(leaderboard()[2].name) }}
                          </div>
                          <p class="fame-medal">🥉</p>
                          <p class="fame-name">{{ leaderboard()[2].name }}</p>
                          <p class="fame-count">{{ leaderboard()[2].messageCount }}</p>
                          <div class="fame-base fame-base-3"></div>
                        </div>
                      </div>
                    </div>
                  }
                  <!-- Ranks 4+ -->
                  @if (leaderboard().length > 3) {
                    <div class="fame-list">
                      @for (e of leaderboard().slice(3); track e.rank; let i = $index) {
                        <div class="fame-list-row" [style.animation-delay]="(700 + i * 80) + 'ms'">
                          <span class="fame-list-rank">{{ e.rank }}</span>
                          <div class="fame-list-av"
                               [style.background]="'hsl(' + getAvatarHue(e.name) + ',55%,88%)'"
                               [style.color]="'hsl(' + getAvatarHue(e.name) + ',55%,32%)'">
                            {{ getInitials(e.name) }}
                          </div>
                          <div class="fame-list-info">
                            <span class="fame-list-name">{{ e.name }}</span>
                            <div class="fame-list-bar-track">
                              <div class="fame-list-bar"
                                   [class.fame-bar-anim]="leaderAnimated()"
                                   [style.--ldr-w]="e.percentage + '%'">
                              </div>
                            </div>
                          </div>
                          <span class="fame-list-count">{{ e.messageCount }}</span>
                        </div>
                      }
                    </div>
                  }
                  <!-- Compact list if less than 4 total -->
                  @if (leaderboard().length <= 3 && leaderboard().length > 0) {
                    <div class="fame-list">
                      @for (e of leaderboard(); track e.rank; let i = $index) {
                        <div class="fame-list-row" [style.animation-delay]="(i * 80) + 'ms'">
                          <span class="fame-list-rank">{{ getMedalEmoji(e.rank) }}</span>
                          <div class="fame-list-av"
                               [style.background]="'hsl(' + getAvatarHue(e.name) + ',55%,88%)'"
                               [style.color]="'hsl(' + getAvatarHue(e.name) + ',55%,32%)'">
                            {{ getInitials(e.name) }}
                          </div>
                          <div class="fame-list-info">
                            <span class="fame-list-name">{{ e.name }}</span>
                            <div class="fame-list-bar-track">
                              <div class="fame-list-bar" [class.fame-bar-anim]="leaderAnimated()" [style.--ldr-w]="e.percentage + '%'"></div>
                            </div>
                          </div>
                          <span class="fame-list-count">{{ e.messageCount }}</span>
                        </div>
                      }
                    </div>
                  }
                }
              </mat-card-content>
            </mat-card>
          </div>
        </div>
      </div>

      <!-- ══ SECTION 7 — Activity Heatmap ══════════════════════════════ -->
      <div class="dash-section" style="animation-delay:200ms">
        <div class="row gx-3 gx-lg-4">
          <div class="col-12">
            <mat-card class="mb-3 mb-lg-4">
              <mat-card-content class="p-3">
                <div class="d-flex align-items-center gap-3 mb-4">
                  <div class="pulse-section-icon">
                    <mat-icon class="text-theme">grid_on</mat-icon>
                  </div>
                  <div>
                    <h3 class="mb-0 fw-bold">Activity Heatmap</h3>
                    <p class="small text-secondary mb-0">When your team is most active</p>
                  </div>
                </div>
                @if (heatmapData().length === 0) {
                  <div class="dash-empty-state">
                    <mat-icon class="material-icons-outlined">grid_on</mat-icon>
                    <p>No heatmap data yet</p>
                  </div>
                } @else {
                  <div class="heat-scroll">
                    <div class="heat-outer">
                      <!-- Corner -->
                      <div class="heat-corner"></div>
                      <!-- Hour labels -->
                      @for (lbl of heatmapHourLabels; track $index) {
                        <div class="heat-hour-lbl">{{ lbl }}</div>
                      }
                      <!-- Day rows -->
                      @for (row of heatmapData(); track $index; let di = $index) {
                        <div class="heat-day-lbl">{{ getDayLabel(di) }}</div>
                        @for (count of row; track $index; let hi = $index) {
                          <div class="heat-cell"
                               [class.heat-cell-anim]="heatmapAnimated()"
                               [style.opacity]="getCellOpacity(count)"
                               [style.animation-delay]="heatmapAnimated() ? (di * 24 + hi) * 2 + 'ms' : '0ms'"
                               [matTooltip]="getDayLabel(di) + ' ' + getHourLabel(hi) + ' — ' + count + ' messages'">
                          </div>
                        }
                      }
                    </div>
                  </div>
                }
              </mat-card-content>
            </mat-card>
          </div>
        </div>
      </div>

      <!-- ══ SECTION 3 — Room Intelligence ══════════════════════════════ -->
      <div class="dash-section" style="animation-delay:240ms">
        <div class="row gx-3 gx-lg-4">
          <div class="col-12">
            <mat-card class="mb-3 mb-lg-4">
              <mat-card-content class="p-3">
                <div class="d-flex align-items-center gap-3 mb-4">
                  <div class="pulse-section-icon">
                    <mat-icon class="text-theme">meeting_room</mat-icon>
                  </div>
                  <div>
                    <h3 class="mb-0 fw-bold">Room Intelligence</h3>
                    <p class="small text-secondary mb-0">Activity across all chatrooms</p>
                  </div>
                </div>

                @if (rooms().length === 0 && !loading()) {
                  <div class="dash-empty-state">
                    <mat-icon class="material-icons-outlined">meeting_room</mat-icon>
                    <p>No rooms found</p>
                  </div>
                } @else {
                  <div class="room-layout">
                    <!-- Left: room cards -->
                    <div class="room-cards-col">
                      <div class="row gx-3">
                        @for (room of rooms(); track room.id; let i = $index) {
                          <div class="col-12 col-sm-6 mb-3">
                            <div class="room-card" matRipple
                                 [class.room-card-selected]="selectedRoomId() === room.id"
                                 [class.room-card-high]="room.messagesLast7Days > 10"
                                 [class.room-card-mid]="room.messagesLast7Days >= 3 && room.messagesLast7Days <= 10"
                                 [style.animation-delay]="(i * 50) + 'ms'"
                                 (click)="selectRoom(room.id)">
                              <!-- Header -->
                              <div class="d-flex align-items-center justify-content-between mb-2">
                                <div class="d-flex align-items-center gap-2" style="min-width:0">
                                  <mat-icon class="text-theme" style="font-size:16px;width:16px;height:16px;flex-shrink:0">tag</mat-icon>
                                  <span class="room-card-name">{{ room.name }}</span>
                                </div>
                                <div class="d-flex align-items-center gap-1 flex-shrink-0">
                                  <span class="room-type-badge {{ getRoomTypeTheme(room.roomType) }}">{{ getRoomTypeLabel(room.roomType) }}</span>
                                  @if (room.roomType === 'meeting') {
                                    @if (getMeetingStatus(room) === 'live') {
                                      <span class="room-status-badge room-status-live">● LIVE</span>
                                    } @else if (getMeetingStatus(room) === 'soon') {
                                      <span class="room-status-badge room-status-soon">SOON</span>
                                    }
                                  }
                                </div>
                              </div>
                              <!-- Sparkline -->
                              <div class="room-sparkline mb-2">
                                @for (v of getRoomSparkline(room); track $index; let si = $index) {
                                  <div class="room-spark-bar"
                                       [style.height.%]="getSparklinePct(v, room)"
                                       [style.animation-delay]="(i * 50 + si * 40) + 'ms'"
                                       [class.room-spark-anim]="membersAnimated()">
                                  </div>
                                }
                              </div>
                              <!-- Stats row -->
                              <div class="d-flex align-items-center gap-3">
                                <span class="room-stat">
                                  <mat-icon style="font-size:12px;width:12px;height:12px">message</mat-icon>
                                  {{ room.messageCount }}
                                </span>
                                <span class="room-stat">
                                  <mat-icon style="font-size:12px;width:12px;height:12px">group</mat-icon>
                                  {{ room.memberCount }}
                                </span>
                                @if (room.lastMessageAt) {
                                  <span class="room-stat ms-auto">{{ getRelativeTime(room.lastMessageAt) }}</span>
                                }
                                @if (room.roomType === 'meeting' && getMeetingStatus(room) === 'live' && room.meetingLink) {
                                  <a [href]="room.meetingLink" target="_blank" rel="noopener"
                                     class="badge badge-light theme-green ms-auto"
                                     style="font-size:10px;padding:3px 8px;text-decoration:none"
                                     (click)="$event.stopPropagation()">Join</a>
                                }
                              </div>
                            </div>
                          </div>
                        }
                      </div>
                    </div>

                    <!-- Right: detail panel -->
                    <div class="room-detail-panel" [class.room-detail-visible]="getSelectedRoom() !== null">
                      @if (getSelectedRoom(); as room) {
                        <div class="room-detail-content">
                          <div class="d-flex align-items-start justify-content-between mb-3">
                            <div>
                              <div class="d-flex align-items-center gap-2 mb-1">
                                <mat-icon class="text-theme" style="font-size:18px;width:18px;height:18px">tag</mat-icon>
                                <h3 class="mb-0 fw-bold">{{ room.name }}</h3>
                              </div>
                              <span class="room-type-badge {{ getRoomTypeTheme(room.roomType) }}">{{ getRoomTypeLabel(room.roomType) }}</span>
                            </div>
                            <button mat-icon-button (click)="selectRoom(null)" class="flex-shrink-0">
                              <mat-icon>close</mat-icon>
                            </button>
                          </div>
                          <mat-divider class="mb-3"></mat-divider>
                          <!-- Stats -->
                          <div class="row gx-3 mb-3">
                            <div class="col-6">
                              <div class="room-detail-stat">
                                <span class="room-detail-stat-val text-theme">{{ room.messageCount }}</span>
                                <span class="room-detail-stat-lbl">Total Messages</span>
                              </div>
                            </div>
                            <div class="col-6">
                              <div class="room-detail-stat">
                                <span class="room-detail-stat-val text-theme">{{ room.memberCount }}</span>
                                <span class="room-detail-stat-lbl">Members</span>
                              </div>
                            </div>
                            <div class="col-6 mt-2">
                              <div class="room-detail-stat">
                                <span class="room-detail-stat-val">{{ room.messagesLast7Days }}</span>
                                <span class="room-detail-stat-lbl">This Week</span>
                              </div>
                            </div>
                            @if (room.startTime) {
                              <div class="col-6 mt-2">
                                <div class="room-detail-stat">
                                  <span class="room-detail-stat-val" style="font-size:13px">{{ formatMeetingTime(room.startTime) }}</span>
                                  <span class="room-detail-stat-lbl">Meeting Time</span>
                                </div>
                              </div>
                            }
                          </div>
                          <!-- Recent activity -->
                          @if (getSelectedRoomActivity().length > 0) {
                            <h4 class="mb-2 text-secondary" style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px">Recent Messages</h4>
                            <div class="d-flex flex-column gap-2">
                              @for (act of getSelectedRoomActivity(); track act.timestamp) {
                                <div class="room-detail-msg">
                                  <div class="room-detail-av"
                                       [style.background]="'hsl(' + getAvatarHue(act.senderName) + ',55%,88%)'"
                                       [style.color]="'hsl(' + getAvatarHue(act.senderName) + ',55%,32%)'">
                                    {{ getInitials(act.senderName) }}
                                  </div>
                                  <div style="flex:1;min-width:0">
                                    <span class="fw-bold" style="font-size:12px">{{ act.senderName }}</span>
                                    <p class="text-secondary small mb-0 text-truncate" style="font-size:11px">{{ act.content | slice:0:60 }}</p>
                                  </div>
                                  <span class="text-secondary" style="font-size:10px;flex-shrink:0">{{ getRelativeTime(act.timestamp) }}</span>
                                </div>
                              }
                            </div>
                          }
                          <button mat-stroked-button class="w-100 mt-3" (click)="close()">
                            <mat-icon>open_in_new</mat-icon>
                            Open in Chat
                          </button>
                          @if (room.roomType === 'meeting' && getMeetingStatus(room) === 'live' && room.meetingLink) {
                            <a [href]="room.meetingLink" target="_blank" rel="noopener" class="mt-2 w-100 d-block text-center" style="text-decoration:none">
                              <button mat-flat-button class="w-100">
                                <mat-icon>video_call</mat-icon>
                                Join Meeting
                              </button>
                            </a>
                          }
                        </div>
                      } @else {
                        <div class="room-detail-empty">
                          <mat-icon class="material-icons-outlined" style="font-size:40px;width:40px;height:40px;opacity:0.3">chat_bubble_outline</mat-icon>
                          <p class="text-secondary small mt-2 mb-0">Select a room to see details</p>
                        </div>
                      }
                    </div>
                  </div>
                }
              </mat-card-content>
            </mat-card>
          </div>
        </div>
      </div>

      <!-- ══ SECTION 5 + 6 — Launch Pad & Mission Feed ═════════════════ -->
      <div class="dash-section" style="animation-delay:280ms">
        <div class="row gx-3 gx-lg-4">

          <!-- Launch Pad -->
          <div class="col-12 col-lg-5">
            <mat-card class="mb-3 mb-lg-4 h-100">
              <mat-card-content class="p-3">
                <div class="d-flex align-items-center gap-3 mb-3">
                  <div class="pulse-section-icon">
                    <mat-icon class="text-theme">rocket_launch</mat-icon>
                  </div>
                  <div>
                    <h3 class="mb-0 fw-bold">Launch Pad</h3>
                    <p class="small text-secondary mb-0">Upcoming meetings</p>
                  </div>
                </div>

                @if (getUpcomingMeetings().length === 0) {
                  <div class="dash-empty-state">
                    <mat-icon class="material-icons-outlined" style="font-size:48px;width:48px;height:48px;opacity:0.3">rocket_launch</mat-icon>
                    <p class="mt-2">No upcoming meetings</p>
                    <p class="text-secondary small">Schedule one from the chat page</p>
                  </div>
                } @else {
                  <div class="pad-scroll">
                    <!-- Today marker -->
                    <div class="pad-today-marker">
                      <div class="pad-today-line"></div>
                      <span class="pad-today-label">Today</span>
                    </div>
                    <!-- Track line -->
                    <div class="pad-track-line"></div>
                    <div class="pad-stations">
                      @for (mtg of getUpcomingMeetings(); track mtg.id; let i = $index) {
                        <div class="pad-station" [class.pad-station-below]="i % 2 === 1"
                             [style.animation-delay]="(i * 80) + 'ms'">
                          <!-- Card (above or below track) -->
                          <div class="pad-card"
                               [class.pad-card-live]="getMeetingStatus(mtg) === 'live'"
                               [class.pad-card-soon]="getMeetingStatus(mtg) === 'soon'">
                            <div class="d-flex align-items-center justify-content-between mb-1">
                              <span class="pad-card-name">{{ mtg.name }}</span>
                              @if (getMeetingStatus(mtg) === 'live') {
                                <span class="pad-badge pad-badge-live">● LIVE</span>
                              } @else if (getMeetingStatus(mtg) === 'soon') {
                                <span class="pad-badge pad-badge-soon">SOON</span>
                              } @else {
                                <span class="pad-badge pad-badge-upcoming">UPCOMING</span>
                              }
                            </div>
                            <div class="d-flex align-items-center gap-2 mb-1">
                              <mat-icon style="font-size:11px;width:11px;height:11px;opacity:0.6">schedule</mat-icon>
                              <span style="font-size:11px;color:var(--mat-sys-on-surface-variant)">{{ mtg.startTime ? formatMeetingTime(mtg.startTime) : '—' }}</span>
                            </div>
                            <div class="d-flex align-items-center gap-2">
                              <mat-icon style="font-size:11px;width:11px;height:11px;opacity:0.6">group</mat-icon>
                              <span style="font-size:11px;color:var(--mat-sys-on-surface-variant)">{{ mtg.memberCount }} members</span>
                            </div>
                            @if (countdownMap().get(mtg.id)) {
                              <div class="pad-countdown">{{ countdownMap().get(mtg.id) }}</div>
                            }
                            @if (getMeetingStatus(mtg) === 'live' && mtg.meetingLink) {
                              <a [href]="mtg.meetingLink" target="_blank" rel="noopener" style="text-decoration:none" class="d-block mt-2">
                                <button mat-flat-button class="w-100 pad-join-btn">
                                  <mat-icon>video_call</mat-icon>
                                  Join Now
                                </button>
                              </a>
                            }
                          </div>
                          <!-- Connector -->
                          <div class="pad-connector"></div>
                          <!-- Dot on track -->
                          <div class="pad-dot"
                               [class.pad-dot-live]="getMeetingStatus(mtg) === 'live'"
                               [class.pad-dot-soon]="getMeetingStatus(mtg) === 'soon'"
                               [class.pad-dot-upcoming]="getMeetingStatus(mtg) === 'upcoming' || !getMeetingStatus(mtg)">
                          </div>
                        </div>
                      }
                    </div>
                  </div>
                }
              </mat-card-content>
            </mat-card>
          </div>

          <!-- Mission Feed -->
          <div class="col-12 col-lg-7">
            <mat-card class="mb-3 mb-lg-4 h-100 mission-feed-card">
              <mat-card-content class="p-3">
                <div class="d-flex align-items-center gap-3 mb-3">
                  <div class="pulse-section-icon mission-feed-icon">
                    <mat-icon>fiber_manual_record</mat-icon>
                  </div>
                  <div class="flex-grow-1">
                    <h3 class="mb-0 fw-bold mission-feed-title">Mission Feed</h3>
                    <p class="small mb-0 mission-feed-subtitle">Real-time activity from your rooms</p>
                  </div>
                  <div class="mission-live-badge">
                    <span class="mission-live-dot"></span>
                    <span>LIVE</span>
                  </div>
                </div>
                <mat-divider class="mb-3 mission-feed-divider"></mat-divider>

                @if (activity().length === 0) {
                  <div class="dash-empty-state mission-feed-empty">
                    <mat-icon class="material-icons-outlined">inbox</mat-icon>
                    <p>No recent activity</p>
                  </div>
                } @else {
                  <div class="mission-feed">
                    @for (item of activity().slice(0,15); track item.timestamp + item.senderName; let i = $index) {
                      <div class="mission-item"
                           [class.mission-item-fresh]="item.fresh"
                           [class.mission-item-old]="isOldActivity(item.timestamp)"
                           [style.animation-delay]="(i * 30) + 'ms'">
                        <div class="mission-av"
                             [style.background]="'hsl(' + getAvatarHue(item.senderName) + ',55%,88%)'"
                             [style.color]="'hsl(' + getAvatarHue(item.senderName) + ',55%,32%)'">
                          {{ getInitials(item.senderName) }}
                        </div>
                        <div class="mission-text">
                          <span class="mission-name">{{ item.senderName }}</span>
                          <span class="mission-action"> sent a message in </span>
                          <span class="mission-room">#{{ item.roomName }}</span>
                          @if (item.content) {
                            <span class="mission-preview"> — "{{ item.content | slice:0:50 }}{{ item.content.length > 50 ? '…' : '' }}"</span>
                          }
                        </div>
                        <span class="mission-time">{{ getRelativeTime(item.timestamp) }}</span>
                      </div>
                    }
                  </div>
                }
              </mat-card-content>
            </mat-card>
          </div>
        </div>
      </div>

    </div><!-- /container-fluid -->
  </div><!-- /dash-body -->

  <!-- ══ SECTION 8 — Quick Actions FAB ══════════════════════════════════ -->
  <div class="fab-container" [class.fab-open]="fabOpen()">
    <!-- Action items -->
    <div class="fab-actions">
      <div class="fab-action" [class.fab-action-visible]="fabOpen()" style="transition-delay:160ms">
        <span class="fab-action-label">AI Summary</span>
        <button mat-mini-fab class="fab-action-btn" (click)="close()" matTooltip="AI Summary">
          <mat-icon>auto_awesome</mat-icon>
        </button>
      </div>
      <div class="fab-action" [class.fab-action-visible]="fabOpen()" style="transition-delay:120ms">
        <span class="fab-action-label">Schedule Meeting</span>
        <button mat-mini-fab class="fab-action-btn" (click)="close()" matTooltip="Schedule Meeting">
          <mat-icon>event</mat-icon>
        </button>
      </div>
      <div class="fab-action" [class.fab-action-visible]="fabOpen()" style="transition-delay:80ms">
        <span class="fab-action-label">Add Member</span>
        <button mat-mini-fab class="fab-action-btn" (click)="close()" matTooltip="Add Member">
          <mat-icon>person_add</mat-icon>
        </button>
      </div>
      <div class="fab-action" [class.fab-action-visible]="fabOpen()" style="transition-delay:40ms">
        <span class="fab-action-label">Broadcast</span>
        <button mat-mini-fab class="fab-action-btn" (click)="close()" matTooltip="Broadcast">
          <mat-icon>campaign</mat-icon>
        </button>
      </div>
    </div>
    <!-- Main FAB -->
    <button class="fab-main" [class.fab-main-open]="fabOpen()" (click)="toggleFab()" matRipple>
      <mat-icon>add</mat-icon>
    </button>
  </div>

</div><!-- /dash-overlay -->
    `,
    styles: [`
/* ══ OVERLAY ════════════════════════════════════════════════════════════ */
@keyframes dashSlideIn  { from { transform:translateX(100%); } to { transform:translateX(0); } }
@keyframes dashSlideOut { from { transform:translateX(0); }   to { transform:translateX(100%); } }
.dash-overlay {
    position:fixed; top:0; right:0; width:100vw; height:100vh;
    z-index:9000;
    background:var(--mat-sys-surface,#fff);
    display:flex; flex-direction:column;
    animation:dashSlideIn 400ms cubic-bezier(0.16,1,0.3,1) both;
    overflow:hidden;
}
.dash-overlay-exit { animation:dashSlideOut 300ms ease-in both !important; }

.dash-sticky-header { position:sticky; top:0; z-index:10; flex-shrink:0; }
.dash-body { flex:1; overflow-y:auto; overflow-x:hidden; scroll-behavior:smooth; }

/* ══ SECTION ENTRANCE ═══════════════════════════════════════════════════ */
@keyframes sectionUp {
    from { transform:translateY(24px); opacity:0; }
    to   { transform:translateY(0);    opacity:1; }
}
.dash-section { animation:sectionUp 500ms cubic-bezier(0.16,1,0.3,1) both; }

/* ══ KPI CARDS ══════════════════════════════════════════════════════════ */
@keyframes kpiCardIn {
    from { transform:translateY(20px); opacity:0; }
    to   { transform:translateY(0);    opacity:1; }
}
.dash-kpi-item { animation:kpiCardIn 380ms cubic-bezier(0.34,1.56,0.64,1) both; }

@keyframes dashLivePulse {
    0%,100% { box-shadow:0 0 0 0 rgba(22,163,74,0.45); }
    50%      { box-shadow:0 0 0 5px rgba(22,163,74,0); }
}
.dash-live-dot {
    position:absolute; top:2px; right:2px;
    width:10px; height:10px; border-radius:50%; background:#16a34a;
    animation:dashLivePulse 1.6s ease-in-out infinite;
}

/* ══ SKELETON ═══════════════════════════════════════════════════════════ */
@keyframes dashSkeleton { 0%,100%{opacity:0.45;} 50%{opacity:1;} }
.dash-skeleton-circle {
    width:50px; height:50px; border-radius:10px;
    background:var(--mat-sys-outline-variant,#ddd);
    animation:dashSkeleton 1.4s ease-in-out infinite;
}
.dash-skeleton-line {
    height:10px; border-radius:6px;
    background:var(--mat-sys-outline-variant,#ddd);
    animation:dashSkeleton 1.4s ease-in-out infinite;
    width:100%;
}
.dash-sk-sm { width:60%; }
.dash-sk-lg { width:40%; height:28px; margin-top:4px; }

/* ══ SHARED ELEMENTS ════════════════════════════════════════════════════ */
.pulse-section-icon {
    width:40px; height:40px; border-radius:12px;
    background:color-mix(in srgb,var(--mat-sys-primary) 12%,transparent);
    display:flex; align-items:center; justify-content:center;
    flex-shrink:0;
}
.pulse-section-icon mat-icon { font-size:20px; width:20px; height:20px; }

.dash-empty-state {
    display:flex; flex-direction:column; align-items:center;
    padding:32px 16px; color:var(--mat-sys-on-surface-variant); text-align:center;
}
.dash-empty-state mat-icon { font-size:48px !important; width:48px !important; height:48px !important; margin-bottom:10px; opacity:0.35; }
.dash-empty-state p { font-size:13px; margin:0; }

@keyframes dashRefreshSpin { to { transform:rotate(360deg); } }
.dash-spin mat-icon { animation:dashRefreshSpin 0.8s linear infinite; display:block; }

/* Interactive press state */
mat-card { transition:box-shadow 150ms ease, transform 100ms ease !important; }
mat-card:active { transform:scale(0.995); }

/* ══ SECTION 1 — TEAM PULSE ════════════════════════════════════════════ */
.pulse-view-toggle .mat-button-toggle { border-radius:20px !important; }

.pulse-filter-chip {
    display:inline-flex; align-items:center;
    padding:5px 14px; border-radius:20px;
    font-size:12px; font-weight:600; cursor:pointer;
    background:var(--mat-sys-surface-container);
    color:var(--mat-sys-on-surface-variant);
    border:1px solid var(--mat-sys-outline-variant);
    transition:all 150ms ease; user-select:none;
}
.pulse-filter-chip:hover { background:color-mix(in srgb,var(--mat-sys-primary) 8%,var(--mat-sys-surface-container)); }
.pulse-filter-chip-active {
    background:color-mix(in srgb,var(--mat-sys-primary) 15%,transparent);
    color:var(--mat-sys-primary);
    border-color:color-mix(in srgb,var(--mat-sys-primary) 40%,transparent);
}

/* Member card grid */
.pulse-cards-grid {
    display:grid;
    grid-template-columns:repeat(auto-fill,minmax(220px,1fr));
    gap:16px;
}

@keyframes memberCardIn {
    from { transform:translateY(16px); opacity:0; }
    to   { transform:translateY(0);    opacity:1; }
}
.pulse-member-card {
    background:var(--mat-sys-surface-container-low);
    border-radius:16px;
    border:1px solid var(--mat-sys-outline-variant);
    padding:18px;
    position:relative;
    overflow:hidden;
    cursor:default;
    transition:transform 200ms cubic-bezier(0.34,1.56,0.64,1),
               box-shadow 200ms cubic-bezier(0.34,1.56,0.64,1);
    animation:memberCardIn 400ms cubic-bezier(0.34,1.56,0.64,1) both;
}
.pulse-member-card:hover {
    transform:translateY(-4px);
    box-shadow:0 10px 30px rgba(0,0,0,0.1),0 3px 8px rgba(0,0,0,0.06) !important;
}
.pulse-member-card:active { transform:translateY(-2px) scale(0.98); }

.pulse-member-card-skeleton {
    background:var(--mat-sys-surface-container-low);
    border-radius:16px;
    border:1px solid var(--mat-sys-outline-variant);
    padding:18px;
}

/* Avatar with status */
.pulse-avatar-wrap { position:relative; flex-shrink:0; }
.pulse-avatar {
    width:46px; height:46px; border-radius:50%;
    display:flex; align-items:center; justify-content:center;
    font-weight:700; font-size:15px;
    transition:transform 200ms cubic-bezier(0.34,1.56,0.64,1);
}
.pulse-member-card:hover .pulse-avatar { transform:scale(1.08); }
.pulse-avatar-sm .pulse-avatar-sm-inner {
    width:36px; height:36px;
    border-radius:50%;
    display:flex; align-items:center; justify-content:center;
    font-weight:700; font-size:12px;
}

.pulse-status-dot {
    position:absolute; bottom:1px; right:1px;
    width:10px; height:10px; border-radius:50%;
    border:2px solid var(--mat-sys-surface,#fff);
}
.pulse-status-dot-sm { width:8px; height:8px; bottom:0; right:0; }
.pulse-dot-online { background:#16a34a; }
.pulse-dot-away   { background:#f59e0b; }
.pulse-dot-offline{ background:var(--mat-sys-outline-variant); }

.pulse-member-name { font-size:14px; font-weight:700; color:var(--mat-sys-on-surface); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.pulse-member-email { font-size:11px; color:var(--mat-sys-on-surface-variant); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

.pulse-role-badge {
    display:inline-block; padding:2px 10px; border-radius:20px;
    font-size:10px; font-weight:700; letter-spacing:0.5px; text-transform:uppercase;
    background:var(--mat-sys-surface-container-high);
    color:var(--mat-sys-on-surface-variant);
}
.pulse-role-employee { background:color-mix(in srgb,#16a34a 15%,transparent); color:#16a34a; }
.pulse-role-student  { background:color-mix(in srgb,#0088ff 15%,transparent); color:#0088ff; }
.pulse-role-manager  { background:color-mix(in srgb,#dc2626 15%,transparent); color:#dc2626; }
.pulse-role-tutor    { background:color-mix(in srgb,#d97706 15%,transparent); color:#d97706; }

.pulse-member-stats { display:flex; gap:8px; margin:12px 0 10px; }
.pulse-stat { display:flex; align-items:center; gap:4px; flex:1; }
.pulse-stat-icon { font-size:12px !important; width:12px !important; height:12px !important; color:var(--mat-sys-on-surface-variant); }
.pulse-stat-val { font-size:12px; font-weight:600; color:var(--mat-sys-on-surface); }

/* Activity bar */
.pulse-activity-track {
    position:absolute; bottom:0; left:0; right:0; height:3px;
    background:var(--mat-sys-outline-variant);
}
.pulse-activity-fill {
    height:100%; width:0;
    background:linear-gradient(90deg,var(--mat-sys-primary),color-mix(in srgb,var(--mat-sys-primary) 70%,transparent));
    border-radius:0 2px 0 0;
    transition:width 700ms ease;
}
.pulse-activity-anim { width:var(--act-w,0%); }

/* Table improvements */
.dash-table-row { transition:background 150ms ease; }
.dash-table-row:hover { background:color-mix(in srgb,var(--mat-sys-primary) 5%,transparent) !important; }
.dash-msg-bar-wrap { position:relative; height:24px; display:flex; align-items:center; min-width:80px; }
.dash-msg-bar-fill { position:absolute; left:0; top:4px; bottom:4px; border-radius:3px; background:color-mix(in srgb,var(--mat-sys-primary) 18%,transparent); transition:width 0.6s ease; }
.dash-msg-count { position:relative; font-size:13px; font-weight:600; padding-left:4px; color:var(--mat-sys-on-surface); }
.pulse-time-chip { font-size:12px; color:var(--mat-sys-on-surface-variant); }
.pulse-time-today { color:#16a34a; font-weight:600; }
.pulse-time-week  { color:#d97706; font-weight:600; }

/* ══ SECTION 2 — LIVE PULSE CHART ════════════════════════════════════ */
.pulse-period-toggle {
    height:30px !important;
    border-radius:20px !important;
    border:1.5px solid var(--mat-sys-outline-variant) !important;
    overflow:hidden;
}
.pulse-period-toggle .mat-button-toggle {
    height:30px !important; line-height:30px !important;
    font-size:11px !important; font-weight:700 !important;
    padding:0 10px !important;
}
.pulse-period-toggle .mat-button-toggle-checked {
    background:var(--mat-sys-primary) !important;
    color:var(--mat-sys-on-primary) !important;
}

.pulse-chart-kpi { display:flex; flex-direction:column; align-items:flex-end; }
.pulse-chart-kpi-val { font-size:28px; font-weight:800; color:var(--mat-sys-on-surface); line-height:1; }
.pulse-chart-kpi-lbl { font-size:11px; color:var(--mat-sys-on-surface-variant); text-transform:uppercase; letter-spacing:0.5px; }
.pulse-chart-kpi-trend { display:flex; align-items:center; gap:2px; font-size:12px; font-weight:700; margin-top:2px; }
.pulse-trend-up   { color:#16a34a; }
.pulse-trend-down { color:#dc2626; }

.pulse-chart-host {
    position:relative; height:200px; padding-top:10px;
    margin:0 -4px;
}
.pulse-grid-line {
    position:absolute; left:0; right:0;
    border-top:1px dashed var(--mat-sys-outline-variant);
    opacity:0.4;
}
.pulse-grid-label {
    position:absolute; left:4px; top:-10px;
    font-size:9px; color:var(--mat-sys-on-surface-variant);
}
.pulse-bars {
    position:absolute; inset:0;
    display:flex; align-items:flex-end; gap:6px; padding:0 4px;
}
.pulse-bar-col { flex:1; display:flex; flex-direction:column; align-items:center; height:100%; }
.pulse-bar-wrap { flex:1; width:100%; display:flex; align-items:flex-end; }
.pulse-bar {
    width:100%; height:0; border-radius:8px 8px 0 0;
    background:linear-gradient(180deg,var(--mat-sys-primary) 0%,color-mix(in srgb,var(--mat-sys-primary) 55%,transparent) 100%);
    position:relative;
    transition:height 600ms cubic-bezier(0.34,1.56,0.64,1);
    cursor:default;
}
.pulse-bar.pulse-bar-anim { height:var(--bar-h,0%); }
.pulse-bar:hover { filter:brightness(1.1); }
.pulse-bar-val { position:absolute; top:-18px; left:50%; transform:translateX(-50%); font-size:10px; font-weight:700; color:var(--mat-sys-on-surface-variant); white-space:nowrap; }
.pulse-bar-label { font-size:10px; font-weight:600; color:var(--mat-sys-on-surface-variant); text-align:center; margin-top:6px; text-transform:uppercase; letter-spacing:0.3px; }

.pulse-chart-stat { display:flex; flex-direction:column; }
.pulse-chart-stat-lbl { font-size:10px; text-transform:uppercase; letter-spacing:0.5px; color:var(--mat-sys-on-surface-variant); }
.pulse-chart-stat-val { font-size:18px; font-weight:700; color:var(--mat-sys-on-surface); }

/* ══ SECTION 4 — HALL OF FAME ════════════════════════════════════════ */
@keyframes podiumRise {
    from { transform:translateY(60px); opacity:0; }
    to   { transform:translateY(0);    opacity:1; }
}
.fame-podium {
    display:flex; align-items:flex-end; justify-content:center;
    gap:8px; margin-bottom:20px;
}
.fame-col { flex:1; display:flex; flex-direction:column; align-items:center; opacity:0; }
.fame-podium-visible .fame-col { animation:podiumRise 600ms cubic-bezier(0.34,1.56,0.64,1) both; }
.fame-podium-visible .fame-col-2 { animation-delay:0ms; }
.fame-podium-visible .fame-col-3 { animation-delay:100ms; }
.fame-podium-visible .fame-col-1 { animation-delay:200ms; }
.fame-inner { display:flex; flex-direction:column; align-items:center; width:100%; }

.fame-avatar {
    width:52px; height:52px; border-radius:50%;
    display:flex; align-items:center; justify-content:center;
    font-weight:700; font-size:17px; border:3px solid transparent;
}
@keyframes goldGlow {
    0%,100% { box-shadow:0 0 8px rgba(245,158,11,0.4),0 0 18px rgba(245,158,11,0.2); }
    50%      { box-shadow:0 0 16px rgba(245,158,11,0.7),0 0 36px rgba(245,158,11,0.3); }
}
.fame-avatar-gold { border-color:#F59E0B; animation:goldGlow 2.2s ease-in-out infinite; }
.fame-medal { font-size:18px; margin:4px 0 2px; }
.fame-name { font-size:11px; font-weight:700; text-align:center; margin:0; max-width:70px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:var(--mat-sys-on-surface); }
.fame-count { font-size:11px; color:var(--mat-sys-on-surface-variant); margin:1px 0 0; }
.fame-base { width:100%; border-radius:6px 6px 0 0; margin-top:6px; }
.fame-base-1 { height:72px; background:color-mix(in srgb,var(--mat-sys-primary) 28%,var(--mat-sys-surface-container)); }
.fame-base-2 { height:52px; background:color-mix(in srgb,var(--mat-sys-primary) 18%,var(--mat-sys-surface-container)); }
.fame-base-3 { height:36px; background:color-mix(in srgb,var(--mat-sys-primary) 12%,var(--mat-sys-surface-container)); }

@keyframes fameListIn {
    from { transform:translateX(-16px); opacity:0; }
    to   { transform:translateX(0);     opacity:1; }
}
.fame-list { display:flex; flex-direction:column; gap:0; }
.fame-list-row {
    display:flex; align-items:center; gap:10px; padding:8px 0;
    border-bottom:1px solid var(--mat-sys-outline-variant);
    animation:fameListIn 400ms cubic-bezier(0.34,1.56,0.64,1) both;
}
.fame-list-row:last-child { border-bottom:none; }
.fame-list-rank { width:22px; text-align:center; font-size:14px; flex-shrink:0; }
.fame-list-av { width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; flex-shrink:0; }
.fame-list-info { flex:1; min-width:0; }
.fame-list-name { font-size:13px; font-weight:600; color:var(--mat-sys-on-surface); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:block; margin-bottom:3px; }
.fame-list-bar-track { height:4px; background:var(--mat-sys-outline-variant); border-radius:2px; overflow:hidden; }
.fame-list-bar { height:100%; width:0; background:var(--mat-sys-primary); border-radius:2px; transition:width 500ms ease; }
.fame-bar-anim { width:var(--ldr-w,0%); }
.fame-list-count { font-size:13px; font-weight:700; color:var(--mat-sys-primary); flex-shrink:0; min-width:28px; text-align:right; }

/* ══ SECTION 7 — HEATMAP ════════════════════════════════════════════ */
.heat-scroll { overflow-x:auto; padding-bottom:8px; }
.heat-outer {
    display:grid;
    grid-template-columns:34px repeat(24,minmax(12px,1fr));
    gap:3px;
    min-width:520px;
}
.heat-corner { }
.heat-hour-lbl { font-size:9px; color:var(--mat-sys-on-surface-variant); text-align:center; padding-bottom:4px; }
.heat-day-lbl { font-size:10px; font-weight:600; color:var(--mat-sys-on-surface-variant); display:flex; align-items:center; }
@keyframes cellPop { from { transform:scale(0); } to { transform:scale(1); } }
.heat-cell {
    height:14px; border-radius:3px;
    background:var(--mat-sys-primary);
    transform:scale(0);
    cursor:default;
    transition:filter 150ms ease;
}
.heat-cell-anim { animation:cellPop 250ms cubic-bezier(0.34,1.56,0.64,1) both; }
.heat-cell:hover { filter:brightness(1.2); }

/* ══ SECTION 3 — ROOM INTELLIGENCE ═════════════════════════════════ */
.room-layout { display:flex; gap:16px; align-items:flex-start; }
.room-cards-col { flex:1; min-width:0; }
.room-detail-panel {
    width:0; overflow:hidden;
    transition:width 350ms cubic-bezier(0.16,1,0.3,1);
    flex-shrink:0;
    border-left:1px solid transparent;
}
.room-detail-visible {
    width:280px;
    border-left-color:var(--mat-sys-outline-variant);
    padding-left:16px;
}
@media (max-width:767px) { .room-layout { flex-direction:column; } .room-detail-panel.room-detail-visible { width:100%; border-left:none; padding-left:0; border-top:1px solid var(--mat-sys-outline-variant); padding-top:16px; } }

@keyframes roomCardIn { from { transform:translateY(10px); opacity:0; } to { transform:translateY(0); opacity:1; } }
.room-card {
    border-radius:14px;
    border:2px solid var(--mat-sys-outline-variant);
    padding:14px;
    cursor:pointer;
    background:var(--mat-sys-surface-container-low);
    border-left:4px solid var(--mat-sys-outline-variant);
    transition:transform 180ms ease,box-shadow 180ms ease,border-color 180ms ease;
    animation:roomCardIn 380ms cubic-bezier(0.34,1.56,0.64,1) both;
}
.room-card:hover { transform:translateY(-3px); box-shadow:0 8px 24px rgba(0,0,0,0.09) !important; }
.room-card:active { transform:scale(0.98); }
.room-card-selected { border-color:var(--mat-sys-primary) !important; background:color-mix(in srgb,var(--mat-sys-primary) 6%,var(--mat-sys-surface-container-low)); }
.room-card-high  { border-left-color:#16a34a; }
.room-card-mid   { border-left-color:#f59e0b; }
.room-card-name  { font-size:13px; font-weight:700; color:var(--mat-sys-on-surface); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.room-type-badge { display:inline-block; padding:2px 8px; border-radius:20px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.4px; background:var(--mat-sys-surface-container-high); color:var(--mat-sys-on-surface-variant); }
.room-type-badge.theme-cyan   { background:color-mix(in srgb,#06b6d4 15%,transparent); color:#0e7490; }
.room-type-badge.theme-blue   { background:color-mix(in srgb,#3b82f6 15%,transparent); color:#1d4ed8; }
.room-type-badge.theme-yellow { background:color-mix(in srgb,#f59e0b 15%,transparent); color:#b45309; }
.room-type-badge.theme-violet { background:color-mix(in srgb,#8b5cf6 15%,transparent); color:#6d28d9; }
.room-type-badge.theme-green  { background:color-mix(in srgb,#22c55e 15%,transparent); color:#15803d; }
@keyframes dashSoonPulse { 0%,100%{opacity:1;} 50%{opacity:0.55;} }
.room-status-badge { display:inline-block; padding:2px 7px; border-radius:20px; font-size:10px; font-weight:700; }
.room-status-live { background:color-mix(in srgb,#16a34a 15%,transparent); color:#15803d; animation:dashSoonPulse 0.9s ease infinite; }
.room-status-soon { background:color-mix(in srgb,#f59e0b 15%,transparent); color:#b45309; animation:dashSoonPulse 1.4s ease infinite; }
.room-stat { display:flex; align-items:center; gap:3px; font-size:11px; color:var(--mat-sys-on-surface-variant); }

/* Sparkline */
.room-sparkline { display:flex; align-items:flex-end; gap:2px; height:22px; }
@keyframes sparkBarIn { from { transform:scaleY(0); } to { transform:scaleY(1); } }
.room-spark-bar { flex:1; min-height:2px; border-radius:2px 2px 0 0; background:var(--mat-sys-primary); opacity:0.55; transform:scaleY(0); transform-origin:bottom; }
.room-spark-anim { animation:sparkBarIn 350ms cubic-bezier(0.34,1.56,0.64,1) both; }

/* Room detail panel */
.room-detail-content { padding:4px 0; }
.room-detail-stat { display:flex; flex-direction:column; }
.room-detail-stat-val { font-size:22px; font-weight:800; line-height:1; color:var(--mat-sys-on-surface); }
.room-detail-stat-lbl { font-size:10px; text-transform:uppercase; letter-spacing:0.4px; color:var(--mat-sys-on-surface-variant); }
.room-detail-msg { display:flex; align-items:flex-start; gap:8px; padding:8px 0; border-bottom:1px solid var(--mat-sys-outline-variant); }
.room-detail-msg:last-child { border-bottom:none; }
.room-detail-av { width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:700; flex-shrink:0; }
.room-detail-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:32px 0; }

/* ══ SECTION 5 — LAUNCH PAD ════════════════════════════════════════ */
.pad-scroll { overflow-x:auto; padding:8px 0 16px; position:relative; }
.pad-today-marker {
    position:absolute; left:0; top:0; bottom:0; width:2px;
    display:flex; flex-direction:column; align-items:center; z-index:2; pointer-events:none;
}
.pad-today-line {
    width:2px; height:100%;
    background:var(--mat-sys-primary);
    opacity:0.7;
}
.pad-today-label {
    position:absolute; top:4px; left:4px;
    font-size:10px; font-weight:700; letter-spacing:0.5px; text-transform:uppercase;
    color:var(--mat-sys-primary);
    background:color-mix(in srgb,var(--mat-sys-primary) 12%,transparent);
    padding:1px 6px; border-radius:8px;
    white-space:nowrap;
}
.pad-track-line {
    position:absolute; left:0; right:0; top:50%; height:2px;
    background:var(--mat-sys-outline-variant); transform:translateY(-50%);
    animation:trackDraw 1000ms cubic-bezier(0.16,1,0.3,1) both 300ms;
    transform-origin:left center;
}
@keyframes trackDraw { from { transform:translateY(-50%) scaleX(0); } to { transform:translateY(-50%) scaleX(1); } }
.pad-stations { display:flex; gap:20px; padding:0 12px; min-width:max-content; align-items:center; min-height:240px; }
@keyframes stationPop { from { transform:scale(0); opacity:0; } to { transform:scale(1); opacity:1; } }
.pad-station {
    display:flex; flex-direction:column; align-items:center; width:160px; flex-shrink:0;
    animation:stationPop 400ms cubic-bezier(0.34,1.56,0.64,1) both;
}
.pad-station-below { flex-direction:column-reverse; }
.pad-card {
    width:150px; border-radius:12px; padding:12px;
    background:var(--mat-sys-surface-container);
    border:1.5px solid var(--mat-sys-outline-variant);
    font-size:12px;
    transition:border-color 200ms ease,box-shadow 200ms ease;
}
@keyframes liveBorderPulse { 0%,100%{border-color:#16a34a;} 50%{border-color:rgba(22,163,74,0.3);} }
@keyframes soonBorderPulse { 0%,100%{border-color:#f59e0b;} 50%{border-color:rgba(245,158,11,0.3);} }
.pad-card-live { animation:liveBorderPulse 1.4s ease infinite; }
.pad-card-soon { animation:soonBorderPulse 1.4s ease infinite; }
.pad-card-name { font-size:13px; font-weight:700; color:var(--mat-sys-on-surface); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100px; display:block; }
.pad-badge { display:inline-block; padding:2px 7px; border-radius:20px; font-size:10px; font-weight:700; }
.pad-badge-live     { background:color-mix(in srgb,#16a34a 15%,transparent); color:#15803d; animation:dashSoonPulse 0.9s ease infinite; }
.pad-badge-soon     { background:color-mix(in srgb,#f59e0b 15%,transparent); color:#b45309; animation:dashSoonPulse 1.4s ease infinite; }
.pad-badge-upcoming { background:var(--mat-sys-surface-container-high); color:var(--mat-sys-on-surface-variant); }
.pad-countdown { font-size:11px; font-weight:700; color:#f59e0b; margin-top:6px; }
.pad-join-btn { background:var(--mat-sys-primary) !important; color:var(--mat-sys-on-primary) !important; font-size:11px !important; padding:0 8px !important; height:28px !important; min-height:28px !important; }
.pad-connector { width:1px; height:16px; background:var(--mat-sys-outline-variant); }
.pad-dot { width:14px; height:14px; border-radius:50%; border:2px solid var(--mat-sys-surface,#fff); flex-shrink:0; }
.pad-dot-live     { background:#dc2626; border-color:#dc2626; animation:dashLivePulse 1.2s ease-in-out infinite; }
.pad-dot-soon     { background:#f59e0b; border-color:#f59e0b; animation:dashSoonPulse 1.4s ease infinite; }
.pad-dot-upcoming { background:var(--mat-sys-outline-variant); border-color:var(--mat-sys-outline-variant); }

/* ══ SECTION 6 — MISSION FEED ═══════════════════════════════════════ */
.mission-feed-card {
    background:var(--mat-sys-inverse-surface) !important;
}
.mission-feed-icon mat-icon { color:color-mix(in srgb,var(--mat-sys-inverse-on-surface) 80%,transparent); }
.mission-feed-icon { background:color-mix(in srgb,var(--mat-sys-inverse-on-surface) 10%,transparent); }
.mission-feed-title  { color:var(--mat-sys-inverse-on-surface); }
.mission-feed-subtitle { color:color-mix(in srgb,var(--mat-sys-inverse-on-surface) 65%,transparent); }
.mission-feed-divider { border-color:color-mix(in srgb,var(--mat-sys-inverse-on-surface) 15%,transparent) !important; }
.mission-feed-empty mat-icon { color:color-mix(in srgb,var(--mat-sys-inverse-on-surface) 35%,transparent); }
.mission-feed-empty p { color:color-mix(in srgb,var(--mat-sys-inverse-on-surface) 60%,transparent); }
.mission-live-badge {
    display:flex; align-items:center; gap:5px;
    font-size:11px; font-weight:700; letter-spacing:0.5px;
    color:#4ade80;
}
@keyframes missionLivePulse { 0%,100%{opacity:1;} 50%{opacity:0.4;} }
.mission-live-dot {
    width:7px; height:7px; border-radius:50%; background:#4ade80;
    animation:missionLivePulse 1.2s ease infinite;
}

.mission-feed { display:flex; flex-direction:column; max-height:320px; overflow-y:auto; }
@keyframes missionItemIn { from { transform:translateY(-12px); opacity:0; } to { transform:translateY(0); opacity:1; } }
.mission-item {
    display:flex; align-items:flex-start; gap:10px; padding:9px 0;
    border-bottom:1px solid color-mix(in srgb,var(--mat-sys-inverse-on-surface) 10%,transparent);
    animation:missionItemIn 300ms cubic-bezier(0.34,1.56,0.64,1) both;
    border-left:3px solid color-mix(in srgb,var(--mat-sys-primary) 40%,transparent);
    padding-left:10px; margin-left:-10px;
}
.mission-item:last-child { border-bottom:none; }
.mission-item-old { opacity:0.75; }

@keyframes missionFresh { from { background:color-mix(in srgb,var(--mat-sys-primary) 18%,transparent); } to { background:transparent; } }
.mission-item-fresh { animation:missionFresh 2s ease forwards, missionItemIn 300ms cubic-bezier(0.34,1.56,0.64,1) both !important; }

.mission-av { width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; flex-shrink:0; }
.mission-text { flex:1; font-size:12.5px; line-height:1.5; color:color-mix(in srgb,var(--mat-sys-inverse-on-surface) 85%,transparent); }
.mission-name    { font-weight:700; color:var(--mat-sys-inverse-on-surface); }
.mission-action  { color:color-mix(in srgb,var(--mat-sys-inverse-on-surface) 60%,transparent); }
.mission-room    { color:var(--mat-sys-primary); font-weight:600; }
.mission-preview { color:color-mix(in srgb,var(--mat-sys-inverse-on-surface) 50%,transparent); font-style:italic; }
.mission-time    { font-size:11px; color:color-mix(in srgb,var(--mat-sys-inverse-on-surface) 50%,transparent); white-space:nowrap; flex-shrink:0; }

/* ══ SECTION 8 — FAB ════════════════════════════════════════════════ */
.fab-container {
    position:fixed; bottom:24px; right:24px; z-index:8990;
    display:flex; flex-direction:column; align-items:center; gap:12px;
}
.fab-actions { display:flex; flex-direction:column; align-items:flex-end; gap:10px; }
.fab-action {
    display:flex; align-items:center; gap:10px;
    opacity:0; transform:translateY(16px) scale(0.7);
    pointer-events:none;
    transition:opacity 200ms ease, transform 250ms cubic-bezier(0.34,1.56,0.64,1);
}
.fab-action-visible { opacity:1; transform:translateY(0) scale(1); pointer-events:auto; }
.fab-action-label {
    background:var(--mat-sys-surface-container-highest);
    color:var(--mat-sys-on-surface);
    padding:4px 12px; border-radius:8px;
    font-size:12px; font-weight:600; white-space:nowrap;
    box-shadow:0 2px 6px rgba(0,0,0,0.12);
}
.fab-action-btn {
    background:var(--mat-sys-surface-container-high) !important;
    color:var(--mat-sys-on-surface) !important;
    box-shadow:0 2px 8px rgba(0,0,0,0.15) !important;
    transition:background 150ms ease,box-shadow 150ms ease !important;
}
.fab-action-btn:hover {
    background:color-mix(in srgb,var(--mat-sys-primary) 14%,var(--mat-sys-surface-container-high)) !important;
    box-shadow:0 4px 12px rgba(0,0,0,0.2) !important;
}
.fab-main {
    width:56px; height:56px; border-radius:50%;
    background:var(--mat-sys-primary);
    color:var(--mat-sys-on-primary);
    border:none; cursor:pointer;
    display:flex; align-items:center; justify-content:center;
    box-shadow:0 4px 16px rgba(0,0,0,0.28);
    transition:transform 200ms cubic-bezier(0.34,1.56,0.64,1),box-shadow 200ms ease;
    outline:none;
}
.fab-main:hover { transform:scale(1.06); box-shadow:0 8px 24px rgba(0,0,0,0.35); }
.fab-main mat-icon { transition:transform 300ms cubic-bezier(0.34,1.56,0.64,1); }
.fab-main-open mat-icon { transform:rotate(45deg); }

/* ══ MODERATION WARNING CARD ════════════════════════════════════════ */
.dash-mod-warn-card {
    display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;
    padding:16px 20px; border-radius:14px;
    background:color-mix(in srgb,#ef4444 8%,var(--mat-sys-surface-container,#f8fafc));
    border:1.5px solid color-mix(in srgb,#ef4444 25%,transparent);
    animation:warnCardGlow 2s ease-in-out infinite;
}
@keyframes warnCardGlow {
    0%,100%{ box-shadow:0 0 0 0 rgba(239,68,68,0); }
    50%     { box-shadow:0 0 12px 4px rgba(239,68,68,0.15); }
}
.dash-mod-warn-left { display:flex; align-items:center; gap:14px; }
.dash-mod-warn-icon {
    width:44px; height:44px; border-radius:50%; flex-shrink:0;
    background:color-mix(in srgb,#ef4444 15%,transparent);
    display:flex; align-items:center; justify-content:center;
}
.dash-mod-warn-title { display:block; font-size:14px; font-weight:700; color:var(--mat-sys-on-surface); }
.dash-mod-warn-sub   { display:block; font-size:12px; color:var(--mat-sys-on-surface-variant,#64748b); margin-top:2px; }
.dash-mod-warn-btn   { font-size:12px !important; }

/* ══ RESPONSIVE ══════════════════════════════════════════════════════ */
@media (max-width:599px) {
    .pulse-cards-grid { grid-template-columns:1fr; }
    .pulse-chart-kpi-val { font-size:22px; }
    .fab-container { bottom:16px; right:16px; }
}
@media (max-width:991px) {
    .room-detail-panel.room-detail-visible { width:100%; }
    .room-layout { flex-direction:column; }
}

/* ══ REDUCED MOTION ══════════════════════════════════════════════════ */
@media (prefers-reduced-motion:reduce) {
    .dash-overlay,.dash-section,.dash-kpi-item,.pulse-member-card,
    .fame-col,.room-card,.pad-station,.mission-item,.heat-cell,
    .fab-action,.fab-main { animation:none !important; transition:none !important; }
    .pulse-bar,.pulse-activity-fill,.dash-msg-bar-fill,.fame-list-bar { transition:none !important; }
}
    `],
})
export class ChatDashboardPanelComponent implements OnInit, OnDestroy, AfterViewInit {
    @Output() closed = new EventEmitter<void>();
    @ViewChild(MatPaginator) paginator!: MatPaginator;
    @ViewChild(MatSort) sort!: MatSort;

    // ── Original state ────────────────────────────────────
    closing    = signal(false);
    loading    = signal(true);
    refreshing = signal(false);

    // ── KPI ───────────────────────────────────────────────
    overview        = signal<DashboardOverview | null>(null);
    animTeamMembers = signal(0);
    animActiveRooms = signal(0);
    animMsgToday    = signal(0);
    animMeetings    = signal(0);

    // ── Members ───────────────────────────────────────────
    dataSource       = new MatTableDataSource<DashboardMember>([]);
    displayedColumns = ['member', 'role', 'messages', 'rooms', 'lastActive'];
    memberFilter     = signal<'all' | 'most_active' | 'recent'>('all');
    private filterQuery = signal('');

    // ── Rooms ─────────────────────────────────────────────
    rooms       = signal<DashboardRoom[]>([]);
    private roomMaxMsgs = signal(1);

    // ── Chart ─────────────────────────────────────────────
    chartData     = signal<DashboardChartEntry[]>([]);
    chartMax = signal(1);
    chartAnimated = signal(false);
    chartPeriod   = signal<7 | 30>(7);

    // ── Leaderboard ───────────────────────────────────────
    leaderboard    = signal<DashboardLeaderEntry[]>([]);
    leaderAnimated = signal(false);

    // ── Activity feed ─────────────────────────────────────
    activity  = signal<DashboardActivity[]>([]);
    private wsSubs: Subscription[] = [];

    // ── NEW signals ───────────────────────────────────────
    membersView     = signal<'card' | 'table'>('card');
    membersAnimated = signal(false);
    selectedRoomId  = signal<number | null>(null);
    fabOpen         = signal(false);
    podiumVisible   = signal(false);
    heatmapData     = signal<number[][]>([]);
    heatmapAnimated = signal(false);
    animWeeklyTotal = signal(0);
    animDailyAvg    = signal(0);
    countdownMap    = signal<Map<number, string>>(new Map());

    private countdownInterval: any = null;

    // ── NEW computed ──────────────────────────────────────
    readonly weeklyStats = computed(() => {
        const data = this.chartData();
        if (!data.length) return { total: 0, avg: 0, peak: '', growth: 0 };
        const total = data.reduce((s, d) => s + d.count, 0);
        const avg   = Math.round(total / data.length);
        const peak  = data.reduce((a, b) => b.count > a.count ? b : a, data[0]);
        const half  = Math.floor(data.length / 2);
        const fh    = data.slice(0, half).reduce((s, d) => s + d.count, 0) || 1;
        const sh    = data.slice(half).reduce((s, d) => s + d.count, 0);
        const growth = Math.round((sh - fh) / fh * 100);
        return { total, avg, peak: peak?.day ?? '', growth };
    });

    // ── Heatmap hour labels ───────────────────────────────
    readonly heatmapHourLabels: string[] = Array.from({ length: 24 }, (_, i) =>
        [0, 6, 12, 18, 23].includes(i) ? i.toString().padStart(2, '0') : ''
    );

    // ── Math ref for template ─────────────────────────────
    readonly Math = Math;

    // ── Moderation ────────────────────────────────────────
    pendingReportCount = signal<number>(0);

    constructor(
        private chatRoomService: ChatRoomService,
        private chatMessageService: ChatMessageService,
        private moderationService: ModerationService,
    ) {}

    ngOnInit(): void {
        this.loadAll();
        this.moderationService.getPendingReportCount().subscribe({
            next: (c) => this.pendingReportCount.set(c),
            error: () => {},
        });
    }

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
        this.stopCountdownTimer();
    }

    // ── Data loading ──────────────────────────────────────

    loadAll(): void {
        this.loading.set(true);

        this.chatRoomService.getDashboardOverview().subscribe({
            next: (data: DashboardOverview) => {
                this.overview.set(data);
                setTimeout(() => {
                    this.animateValue(data.totalMembers,     v => this.animTeamMembers.set(v));
                    this.animateValue(data.activeChatrooms,  v => this.animActiveRooms.set(v));
                    this.animateValue(data.messagesToday,    v => this.animMsgToday.set(v));
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
                setTimeout(() => this.membersAnimated.set(true), 250);
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
                this.startCountdownTimer();
            },
            error: () => {},
        });

        this.chatRoomService.getDashboardChart().subscribe({
            next: (data: DashboardChartEntry[]) => {
                this.chartData.set(data);
                this.chartMax.set(Math.max(...data.map(d => d.count), 1));
                this.chartAnimated.set(false);
                setTimeout(() => {
                    this.chartAnimated.set(true);
                    const total = data.reduce((s, d) => s + d.count, 0);
                    const avg   = Math.round(total / (data.length || 1));
                    this.animateValue(total, v => this.animWeeklyTotal.set(v));
                    this.animateValue(avg,   v => this.animDailyAvg.set(v));
                    this.computeHeatmap();
                }, 250);
            },
            error: () => {},
        });

        this.chatRoomService.getDashboardLeaderboard().subscribe({
            next: (data: DashboardLeaderEntry[]) => {
                this.leaderboard.set(data);
                this.leaderAnimated.set(false);
                setTimeout(() => {
                    this.leaderAnimated.set(true);
                    this.podiumVisible.set(true);
                }, 350);
            },
            error: () => {},
        });

        this.chatRoomService.getDashboardActivity().subscribe({
            next: (data: DashboardActivity[]) => { this.activity.set(data.slice(0, 20)); },
            error: () => {},
        });
    }

    refresh(): void {
        this.refreshing.set(true);
        this.podiumVisible.set(false);
        this.heatmapAnimated.set(false);
        this.membersAnimated.set(false);
        this.loadAll();
        setTimeout(() => this.refreshing.set(false), 800);
    }

    close(): void {
        this.closing.set(true);
        setTimeout(() => this.closed.emit(), 300);
    }

    // ── WebSocket ─────────────────────────────────────────

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
                setTimeout(() => {
                    this.activity.update(feed =>
                        feed.map((f, i) => i === 0 ? { ...f, fresh: false } : f)
                    );
                }, 1600);
            });
            this.wsSubs.push(sub);
        });
    }

    // ── Countdown timer ───────────────────────────────────

    startCountdownTimer(): void {
        this.stopCountdownTimer();
        this.updateCountdowns();
        this.countdownInterval = setInterval(() => this.updateCountdowns(), 1000);
    }

    updateCountdowns(): void {
        const map = new Map<number, string>();
        this.rooms().filter(r => r.roomType === 'meeting' && r.startTime).forEach(r => {
            const diff = (new Date(r.startTime!).getTime() - Date.now()) / 1000;
            if (diff > 0 && diff <= 3600) {
                const m = Math.floor(diff / 60);
                const s = Math.floor(diff % 60);
                map.set(r.id, m > 0 ? `in ${m}m ${s.toString().padStart(2, '0')}s` : `in ${s}s`);
            }
        });
        this.countdownMap.set(map);
    }

    stopCountdownTimer(): void {
        if (this.countdownInterval) { clearInterval(this.countdownInterval); this.countdownInterval = null; }
    }

    // ── Heatmap computation ───────────────────────────────

    computeHeatmap(): void {
        const data = this.chartData();
        if (!data.length) return;
        const hw = [0.05,0.02,0.01,0.01,0.02,0.06,0.15,0.5,0.85,1,0.95,0.9,
                    0.8,0.85,0.9,0.85,0.75,0.65,0.45,0.3,0.2,0.15,0.1,0.07];
        const tw = hw.reduce((a, b) => a + b, 0);
        const grid = data.map((day, di) =>
            hw.map((w, hi) => {
                const base = Math.round((w / tw) * day.count);
                const jitter = Math.round(base * 0.25 * ((di * 7 + hi * 3) % 10 / 10 - 0.3));
                return Math.max(0, base + jitter);
            })
        );
        this.heatmapData.set(grid);
        setTimeout(() => this.heatmapAnimated.set(true), 200);
    }

    // ── Helpers ───────────────────────────────────────────

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
            const nameMatch = !q || data.name.toLowerCase().includes(q) || data.email.toLowerCase().includes(q);
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

    // ── NEW helpers ───────────────────────────────────────

    get membersForCards(): DashboardMember[] {
        const data = this.dataSource.filteredData;
        return data.length > 0 ? data : this.dataSource.data;
    }

    getMemberStatus(lastActive: string): 'online' | 'away' | 'offline' {
        if (!lastActive) return 'offline';
        const diff = Date.now() - new Date(lastActive).getTime();
        if (diff < 86400000)  return 'online'; // < 24h
        if (diff < 604800000) return 'away';   // < 7 days
        return 'offline';
    }

    getAvatarHue(name: string): number {
        let hash = 0;
        for (let i = 0; i < name.length; i++) { hash = name.charCodeAt(i) + ((hash << 5) - hash); }
        return Math.abs(hash) % 360;
    }

    getCellOpacity(count: number): number {
        if (count === 0) return 0.06;
        if (count <= 2)  return 0.25;
        if (count <= 5)  return 0.45;
        if (count <= 10) return 0.7;
        return 1;
    }

    getDayLabel(di: number): string {
        return ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][di] ?? '';
    }

    getHourLabel(hi: number): string {
        return hi.toString().padStart(2, '0') + ':00';
    }

    getRoomSparkline(room: DashboardRoom): number[] {
        const total = room.messagesLast7Days;
        if (total === 0) return [0, 0, 0, 0, 0, 0, 0];
        const weights = [0.1, 0.12, 0.14, 0.15, 0.18, 0.16, 0.15];
        return weights.map((w, i) => {
            const base = Math.round(w * total);
            const v = base + Math.round(base * 0.3 * (((room.id * 17 + i * 13) % 20) / 20 - 0.5));
            return Math.max(0, v);
        });
    }

    getSparklinePct(v: number, room: DashboardRoom): number {
        const max = Math.max(...this.getRoomSparkline(room), 1);
        return Math.round((v / max) * 100);
    }

    selectRoom(id: number | null): void {
        this.selectedRoomId.set(this.selectedRoomId() === id ? null : id);
    }

    getSelectedRoom(): DashboardRoom | null {
        const id = this.selectedRoomId();
        if (id === null) return null;
        return this.rooms().find(r => r.id === id) ?? null;
    }

    getSelectedRoomActivity(): DashboardActivity[] {
        const room = this.getSelectedRoom();
        if (!room) return [];
        return this.activity().filter(a => a.roomName === room.name).slice(0, 3);
    }

    isOldActivity(timestamp: string): boolean {
        if (!timestamp) return false;
        return Date.now() - new Date(timestamp).getTime() > 3600000;
    }

    toggleFab(): void { this.fabOpen.update(v => !v); }

    onBodyClick(event: MouseEvent): void {
        if (this.fabOpen()) {
            const target = event.target as Element;
            if (!target.closest('.fab-container')) { this.fabOpen.set(false); }
        }
    }
}
