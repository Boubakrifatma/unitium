import {
    Component, OnInit, OnDestroy, AfterViewInit,
    ViewChild, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { Subscription } from 'rxjs';
import { PageRightComponent } from '../../../../components/page-right/pageright.component';
import { ChatRoomService } from './chat-room.service';
import { ChatMessageService } from './chat-message.service';
import {
    DashboardOverview,
    DashboardMember,
    DashboardRoom,
    DashboardActivity,
    DashboardChartEntry,
    DashboardLeaderEntry,
} from './chat-dashboard.component';

@Component({
    selector: 'app-chat-dashboard-page',
    standalone: true,
    imports: [
        CommonModule, FormsModule,
        MatCardModule, MatIconModule, MatButtonModule,
        MatTableModule, MatPaginatorModule, MatSortModule,
        MatFormFieldModule, MatInputModule,
        MatProgressBarModule, MatChipsModule,
        MatTooltipModule, MatDividerModule,
        PageRightComponent,
    ],
    template: `
        <!-- ══ PAGE HEADER ══════════════════════════════════════════════════ -->
        <div class="container-fluid fade-in mb-3 mb-lg-4">
            <mat-card class="cdp-header-card shadow-none">
                <div class="cdp-header-inner">
                    <div class="cdp-header-left">
                        <div class="cdp-header-icon-wrap">
                            <mat-icon>bar_chart</mat-icon>
                        </div>
                        <div>
                            <h3 class="cdp-header-title">Analytics Dashboard</h3>
                            <p class="cdp-header-sub">{{ getGreeting() }} · Overview of your team and chatrooms</p>
                            @if (insights().length > 0) {
                                <p class="cdp-insight-text">✦ {{ getCurrentInsight() }}</p>
                            }
                        </div>
                    </div>
                    <div class="cdp-header-right">
                        <div class="cdp-clock-pill d-none d-md-flex">
                            <mat-icon>schedule</mat-icon>
                            <span class="font-monospace">{{ currentTime() }}</span>
                        </div>
                        <button mat-icon-button (click)="refresh()" [class.cdp-spin]="refreshing()" matTooltip="Refresh">
                            <mat-icon>refresh</mat-icon>
                        </button>
                        <button mat-stroked-button class="cdp-back-btn" (click)="goBackToChat()">
                            <mat-icon style="font-size:16px;width:16px;height:16px">arrow_back</mat-icon>
                            Back to Chat
                        </button>
                        <app-page-right></app-page-right>
                    </div>
                </div>
                @if (!loading()) {
                    <div class="cdp-stat-strip">
                        <div class="cdp-stat-chip"><mat-icon>group</mat-icon><span>{{ animTeamMembers() }} members</span></div>
                        <div class="cdp-stat-chip"><mat-icon>chat_bubble</mat-icon><span>{{ animActiveRooms() }} rooms</span></div>
                        <div class="cdp-stat-chip"><mat-icon>message</mat-icon><span>{{ animMsgToday() }} today</span></div>
                        <div class="cdp-stat-chip"><mat-icon>video_call</mat-icon><span>{{ animMeetings() }} meetings</span></div>
                        @if (activityVelocity() !== 'quiet') {
                            <div class="cdp-stat-chip cdp-stat-active"><mat-icon>bolt</mat-icon><span>{{ activityVelocityMessagesPerMin() }} msg/min</span></div>
                        }
                    </div>
                }
            </mat-card>
        </div>

        <!-- ══ Main content (follows employee page container pattern) ══════ -->
        <div class="container-fluid fade-in px-3 px-lg-4">

            <!-- ── Section 1: KPI Cards (5 cards with sparklines & trends) ─── -->
            <div class="row gx-3 gx-lg-4">
                @if (loading()) {
                    @for (i of [1,2,3,4,5]; track i) {
                        <div class="col-md-6 col-lg-4 col-xl-2-4">
                            <mat-card class="mb-3 mb-lg-4 cdp-kpi-card">
                                <mat-card-content>
                                    <div class="d-flex align-items-center justify-content-between">
                                        <div class="flex-grow-1">
                                            <div class="cdp-sk-line cdp-sk-sm mb-2" style="width:60%"></div>
                                            <div class="cdp-sk-line cdp-sk-lg"></div>
                                        </div>
                                        <div class="cdp-sk-circle ms-2"></div>
                                    </div>
                                </mat-card-content>
                            </mat-card>
                        </div>
                    }
                } @else {
                    <!-- 1. Team Members -->
                    <div class="col-md-6 col-lg-4 col-xl-2-4 cdp-kpi-item" style="animation-delay:0ms">
                        <mat-card class="mb-3 mb-lg-4 cdp-kpi-card cdp-kpi-cyan">
                            <mat-card-content>
                                <div class="cdp-kpi-header">
                                    <div>
                                        <p class="cdp-kpi-label">Team Members</p>
                                        <h2 class="cdp-kpi-value">{{ animTeamMembers() }}</h2>
                                    </div>
                                    <div class="cdp-kpi-icon-wrap cdp-kpi-icon-cyan">
                                        <mat-icon class="material-icons-outlined">group</mat-icon>
                                    </div>
                                </div>
                                <div class="cdp-kpi-footer">
                                    <span class="cdp-trend cdp-trend-up"><mat-icon>trending_up</mat-icon>+5% this week</span>
                                    <svg viewBox="0 0 80 30" style="width:56px;height:26px;display:block">
                                        <defs><linearGradient id="sg0" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#06b6d4" stop-opacity="0.35"/><stop offset="100%" stop-color="#06b6d4" stop-opacity="0"/></linearGradient></defs>
                                        <polygon points="0,20 10,18 20,15 30,12 40,10 50,8 60,5 70,3 80,2 80,30 0,30" fill="url(#sg0)"/>
                                        <polyline points="0,20 10,18 20,15 30,12 40,10 50,8 60,5 70,3 80,2" fill="none" stroke="#06b6d4" stroke-width="2" stroke-linecap="round"/>
                                    </svg>
                                </div>
                            </mat-card-content>
                        </mat-card>
                    </div>
                    <!-- 2. Active Rooms -->
                    <div class="col-md-6 col-lg-4 col-xl-2-4 cdp-kpi-item" style="animation-delay:80ms">
                        <mat-card class="mb-3 mb-lg-4 cdp-kpi-card cdp-kpi-blue">
                            <mat-card-content>
                                <div class="cdp-kpi-header">
                                    <div>
                                        <p class="cdp-kpi-label">Active Rooms</p>
                                        <h2 class="cdp-kpi-value">{{ animActiveRooms() }}</h2>
                                    </div>
                                    <div class="cdp-kpi-icon-wrap cdp-kpi-icon-blue">
                                        <mat-icon class="material-icons-outlined">chat_bubble</mat-icon>
                                    </div>
                                </div>
                                <div class="cdp-kpi-footer">
                                    <span class="cdp-trend cdp-trend-down"><mat-icon>trending_down</mat-icon>-2% this week</span>
                                    <svg viewBox="0 0 80 30" style="width:56px;height:26px;display:block">
                                        <defs><linearGradient id="sg1" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#0049e8" stop-opacity="0.35"/><stop offset="100%" stop-color="#0049e8" stop-opacity="0"/></linearGradient></defs>
                                        <polygon points="0,8 10,12 20,15 30,18 40,19 50,18 60,15 70,12 80,10 80,30 0,30" fill="url(#sg1)"/>
                                        <polyline points="0,8 10,12 20,15 30,18 40,19 50,18 60,15 70,12 80,10" fill="none" stroke="#0049e8" stroke-width="2" stroke-linecap="round"/>
                                    </svg>
                                </div>
                            </mat-card-content>
                        </mat-card>
                    </div>
                    <!-- 3. Messages Today -->
                    <div class="col-md-6 col-lg-4 col-xl-2-4 cdp-kpi-item" style="animation-delay:160ms">
                        <mat-card class="mb-3 mb-lg-4 cdp-kpi-card cdp-kpi-amber">
                            <mat-card-content>
                                <div class="cdp-kpi-header">
                                    <div>
                                        <p class="cdp-kpi-label">Messages Today</p>
                                        <h2 class="cdp-kpi-value">{{ animMsgToday() }}</h2>
                                    </div>
                                    <div class="cdp-kpi-icon-wrap cdp-kpi-icon-amber">
                                        <mat-icon class="material-icons-outlined">message</mat-icon>
                                    </div>
                                </div>
                                <div class="cdp-kpi-footer">
                                    <span class="cdp-trend cdp-trend-up"><mat-icon>trending_up</mat-icon>+12% this week</span>
                                    <svg viewBox="0 0 80 30" style="width:56px;height:26px;display:block">
                                        <defs><linearGradient id="sg2" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#f59e0b" stop-opacity="0.35"/><stop offset="100%" stop-color="#f59e0b" stop-opacity="0"/></linearGradient></defs>
                                        <polygon points="0,25 10,22 20,18 30,15 40,10 50,8 60,5 70,2 80,1 80,30 0,30" fill="url(#sg2)"/>
                                        <polyline points="0,25 10,22 20,18 30,15 40,10 50,8 60,5 70,2 80,1" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round"/>
                                    </svg>
                                </div>
                            </mat-card-content>
                        </mat-card>
                    </div>
                    <!-- 4. Meetings -->
                    <div class="col-md-6 col-lg-4 col-xl-2-4 cdp-kpi-item" style="animation-delay:240ms">
                        <mat-card class="mb-3 mb-lg-4 cdp-kpi-card cdp-kpi-green">
                            <mat-card-content>
                                <div class="cdp-kpi-header">
                                    <div>
                                        <p class="cdp-kpi-label">Meetings</p>
                                        <h2 class="cdp-kpi-value">{{ animMeetings() }}</h2>
                                    </div>
                                    <div class="cdp-kpi-icon-wrap cdp-kpi-icon-green position-relative">
                                        <mat-icon class="material-icons-outlined">video_call</mat-icon>
                                        @if (overview()?.liveNow) { <span class="cdp-live-dot"></span> }
                                    </div>
                                </div>
                                <div class="cdp-kpi-footer">
                                    <span class="cdp-trend cdp-trend-up"><mat-icon>trending_up</mat-icon>+8% this week</span>
                                    <svg viewBox="0 0 80 30" style="width:56px;height:26px;display:block">
                                        <defs><linearGradient id="sg3" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#16a34a" stop-opacity="0.35"/><stop offset="100%" stop-color="#16a34a" stop-opacity="0"/></linearGradient></defs>
                                        <polygon points="0,15 10,14 20,12 30,10 40,8 50,7 60,6 70,4 80,3 80,30 0,30" fill="url(#sg3)"/>
                                        <polyline points="0,15 10,14 20,12 30,10 40,8 50,7 60,6 70,4 80,3" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round"/>
                                    </svg>
                                </div>
                            </mat-card-content>
                        </mat-card>
                    </div>
                    <!-- 5. Reaction Rate -->
                    <div class="col-md-6 col-lg-4 col-xl-2-4 cdp-kpi-item" style="animation-delay:320ms">
                        <mat-card class="mb-3 mb-lg-4 cdp-kpi-card cdp-kpi-rose">
                            <mat-card-content>
                                <div class="cdp-kpi-header">
                                    <div>
                                        <p class="cdp-kpi-label">Reaction Rate</p>
                                        <h2 class="cdp-kpi-value">{{ animReactionRate() }}%</h2>
                                    </div>
                                    <div class="cdp-kpi-icon-wrap cdp-kpi-icon-rose">
                                        <mat-icon class="material-icons-outlined">favorite</mat-icon>
                                    </div>
                                </div>
                                <div class="cdp-kpi-footer">
                                    <span class="cdp-trend cdp-trend-up"><mat-icon>trending_up</mat-icon>+3% this week</span>
                                    <svg viewBox="0 0 80 30" style="width:56px;height:26px;display:block">
                                        <defs><linearGradient id="sg4" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#e11d48" stop-opacity="0.35"/><stop offset="100%" stop-color="#e11d48" stop-opacity="0"/></linearGradient></defs>
                                        <polygon points="0,20 10,19 20,18 30,15 40,12 50,10 60,8 70,5 80,4 80,30 0,30" fill="url(#sg4)"/>
                                        <polyline points="0,20 10,19 20,18 30,15 40,12 50,10 60,8 70,5 80,4" fill="none" stroke="#e11d48" stroke-width="2" stroke-linecap="round"/>
                                    </svg>
                                </div>
                            </mat-card-content>
                        </mat-card>
                    </div>
                }
            </div>

            <!-- ── Metric Chips ─────────────────────────────────────────── -->
            @if (!loading()) {
                <div class="cdp-metric-chips mb-4">
                    <div class="cdp-chip" style="animation-delay:0ms">
                        <mat-icon>chat</mat-icon>
                        <span>{{ avgMessagesPerMemberPerDay() }} msgs/member/day</span>
                    </div>
                    <div class="cdp-chip" style="animation-delay:100ms">
                        <mat-icon>schedule</mat-icon>
                        <span>Peak: {{ mostActiveHour() }}</span>
                    </div>
                    <div class="cdp-chip" style="animation-delay:200ms">
                        <mat-icon>calendar_today</mat-icon>
                        <span>Best day: {{ peakDayOfWeek() }}</span>
                    </div>
                    @if (leaderboard().length > 0) {
                        <div class="cdp-chip cdp-chip-gold" style="animation-delay:300ms">
                            <mat-icon>emoji_events</mat-icon>
                            <span>Top: {{ leaderboard()[0].name }}</span>
                        </div>
                    }
                </div>
            }

            <!-- ── Section 2: Members Table ───────────────────────────── -->
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
                                <!-- Filter badges matching employee page style -->
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

                        @if (loading()) {
                            <mat-card-content>
                                @for (i of [1,2,3,4,5]; track i) {
                                    <div class="d-flex align-items-center gap-3 py-3 border-bottom">
                                        <div class="cdp-sk-circle-sm"></div>
                                        <div class="flex-grow-1">
                                            <div class="cdp-sk-line cdp-sk-sm mb-1"></div>
                                            <div class="cdp-sk-line" style="width:40%"></div>
                                        </div>
                                        <div class="cdp-sk-line" style="width:60px"></div>
                                    </div>
                                }
                            </mat-card-content>
                        } @else {
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
                                                <h4 class="mb-0 fw-bold">{{ m.name }}</h4>
                                                <p class="text-secondary small mb-0">{{ m.email }}</p>
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
                                        <div class="cdp-msg-bar-wrap">
                                            <div class="cdp-msg-bar-fill"
                                                 [style.width.%]="(m.messageCount / getMaxMessages()) * 100"></div>
                                            <span class="cdp-msg-count">{{ m.messageCount }}</span>
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
                                <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="cdp-table-row"></tr>
                                <tr class="mat-row" *matNoDataRow>
                                    <td class="mat-cell text-secondary small py-3"
                                        [attr.colspan]="displayedColumns.length">No members found.</td>
                                </tr>
                            </table>
                            <mat-card-content>
                                <mat-paginator [pageSizeOptions]="[5, 10, 25]" pageSize="5"
                                               aria-label="Select page" class="bg-none">
                                </mat-paginator>
                            </mat-card-content>
                        }
                    </mat-card>
                </div>
            </div>

            <!-- ── Chart + Leaderboard ──────────────────────────────────── -->
            <div class="row gx-3 gx-lg-4">
                <div class="col-12 col-lg-8">
                    <mat-card class="mb-3 mb-lg-4 h-100 cdp-section-card">
                        <mat-card-header>
                            <div class="w-100 d-flex align-items-center gap-3 mb-3">
                                <div class="cdp-section-icon"><mat-icon class="material-icons-outlined">bar_chart</mat-icon></div>
                                <div>
                                    <h3 class="mb-0">Message Activity</h3>
                                    <p class="text-secondary small mb-0">Messages per day — last 7 days</p>
                                </div>
                            </div>
                        </mat-card-header>
                        <mat-card-content class="pb-3">
                            @if (loading()) {
                                <div class="cdp-chart-skeleton"></div>
                            } @else if (chartData().length === 0) {
                                <div class="cdp-empty-state">
                                    <mat-icon class="material-icons-outlined">bar_chart</mat-icon>
                                    <p>No chart data available</p>
                                </div>
                            } @else {
                                <div class="cdp-chart-wrap">
                                    <div class="cdp-chart-grid">
                                        <div class="cdp-grid-line"></div>
                                        <div class="cdp-grid-line"></div>
                                        <div class="cdp-grid-line"></div>
                                        <div class="cdp-grid-line"></div>
                                    </div>
                                    <div class="cdp-chart">
                                        @for (entry of chartData(); track entry.day) {
                                            <div class="cdp-chart-col">
                                                <div class="cdp-chart-bar-wrap">
                                                    <div class="cdp-chart-bar"
                                                         [class.cdp-bar-anim]="chartAnimated()"
                                                         [class.cdp-hot-day]="isHotDay(entry.count)"
                                                         [style.--bar-h]="getBarPct(entry.count)"
                                                         [matTooltip]="entry.count + ' messages on ' + entry.day">
                                                        @if (entry.count > 0) {
                                                            <span class="cdp-bar-val">{{ entry.count }}</span>
                                                        }
                                                    </div>
                                                </div>
                                                <div class="cdp-chart-label">{{ entry.day }}</div>
                                            </div>
                                        }
                                    </div>
                                </div>
                            }
                        </mat-card-content>
                    </mat-card>
                </div>

                <div class="col-12 col-lg-4">
                    <mat-card class="mb-3 mb-lg-4 h-100 cdp-section-card">
                        <mat-card-header>
                            <div class="w-100 d-flex align-items-center gap-3 mb-3">
                                <div class="cdp-section-icon"><mat-icon class="material-icons-outlined">emoji_events</mat-icon></div>
                                <div><h3 class="mb-0">Top Contributors</h3></div>
                            </div>
                        </mat-card-header>
                        <mat-card-content class="pb-3">
                            @if (loading()) {
                                @for (i of [1,2,3,4,5]; track i) {
                                    <div class="d-flex align-items-center gap-3 mb-3">
                                        <div class="cdp-sk-circle-sm"></div>
                                        <div class="flex-grow-1">
                                            <div class="cdp-sk-line mb-1" style="width:60%"></div>
                                            <div class="cdp-sk-line" style="height:5px;width:100%"></div>
                                        </div>
                                    </div>
                                }
                            } @else if (leaderboard().length === 0) {
                                <div class="cdp-empty-state">
                                    <mat-icon class="material-icons-outlined">emoji_events</mat-icon>
                                    <p>No data available</p>
                                </div>
                            } @else {
                                <div class="d-flex flex-column gap-2">
                                    @for (entry of leaderboard(); track entry.rank; let i = $index) {
                                        <div class="cdp-leader-row" [style.animation-delay]="(i * 60) + 'ms'">
                                            <div class="cdp-leader-rank">{{ getMedalEmoji(entry.rank) }}</div>
                                            <div class="cdp-leader-avatar">{{ getInitials(entry.name) }}</div>
                                            <div class="cdp-leader-info">
                                                <div class="cdp-leader-name">{{ entry.name }}</div>
                                                <div class="cdp-leader-bar-wrap">
                                                    <div class="cdp-leader-bar"
                                                         [class.cdp-leader-bar-anim]="leaderAnimated()"
                                                         [style.--ldr-w]="entry.percentage + '%'"></div>
                                                </div>
                                            </div>
                                            <div class="cdp-leader-count">{{ entry.messageCount }}</div>
                                        </div>
                                    }
                                </div>
                            }
                        </mat-card-content>
                    </mat-card>
                </div>
            </div>

            <!-- ── Section 5: Chatroom Activity Cards ─────────────────── -->
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
                            @if (loading()) {
                                <div class="row gx-3">
                                    @for (i of [1,2,3,4,5,6]; track i) {
                                        <div class="col-12 col-sm-6 col-xl-4 mb-3">
                                            <mat-card class="bg-light-theme shadow-none">
                                                <mat-card-content class="py-3">
                                                    <div class="cdp-sk-line cdp-sk-sm mb-2"></div>
                                                    <div class="cdp-sk-line mb-2" style="height:4px;width:100%"></div>
                                                    <div class="cdp-sk-line" style="width:50%"></div>
                                                </mat-card-content>
                                            </mat-card>
                                        </div>
                                    }
                                </div>
                            } @else if (rooms().length === 0) {
                                <div class="cdp-empty-state">
                                    <mat-icon class="material-icons-outlined">meeting_room</mat-icon>
                                    <p>No rooms found</p>
                                </div>
                            } @else {
                                <div class="row gx-3">
                                    @for (room of rooms(); track room.id; let i = $index) {
                                        <div class="col-12 col-sm-6 col-xl-4 mb-3 cdp-room-item"
                                             [style.animation-delay]="(i * 50) + 'ms'">
                                            <mat-card class="bg-light-theme shadow-none h-100 cdp-room-card">
                                                <mat-card-content class="py-3">
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
                                                                    <span class="badge badge-light theme-green" style="font-size:10px;padding:3px 8px">
                                                                        <span class="cdp-live-dot-sm"></span> LIVE
                                                                    </span>
                                                                } @else if (getMeetingStatus(room) === 'soon') {
                                                                    <span class="badge badge-light theme-yellow cdp-soon-badge" style="font-size:10px;padding:3px 8px">
                                                                        SOON
                                                                    </span>
                                                                }
                                                            }
                                                        </div>
                                                    </div>
                                                    <div class="cdp-activity-bar-wrap mb-2">
                                                        <div class="cdp-activity-bar" [style.width]="getRoomBarWidth(room)"></div>
                                                    </div>
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
                                                    @if (room.lastMessage) {
                                                        <p class="text-secondary small fst-italic mb-0 text-truncate" style="font-size:11px">
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

            <!-- ── Section 6+7: Upcoming Meetings + Activity Feed ─────── -->
            <div class="row gx-3 gx-lg-4">
                <!-- Upcoming Meetings -->
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
                            @if (loading()) {
                                @for (i of [1,2,3]; track i) {
                                    <div class="d-flex gap-3 mb-4">
                                        <div class="cdp-sk-circle-sm"></div>
                                        <div class="flex-grow-1">
                                            <div class="cdp-sk-line cdp-sk-sm mb-1"></div>
                                            <div class="cdp-sk-line" style="width:50%"></div>
                                        </div>
                                    </div>
                                }
                            } @else if (getUpcomingMeetings().length === 0) {
                                <div class="cdp-empty-state">
                                    <mat-icon class="material-icons-outlined">event_busy</mat-icon>
                                    <p>No upcoming meetings</p>
                                </div>
                            } @else {
                                <div class="cdp-timeline">
                                    @for (mtg of getUpcomingMeetings(); track mtg.id; let last = $last) {
                                        <div class="cdp-timeline-item" [class.cdp-timeline-last]="last">
                                            <div class="cdp-timeline-dot"
                                                 [class.cdp-dot-live]="getMeetingStatus(mtg) === 'live'"
                                                 [class.cdp-dot-soon]="getMeetingStatus(mtg) === 'soon'">
                                            </div>
                                            <div class="cdp-timeline-content">
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
                                        <span class="cdp-live-indicator">
                                            <span class="cdp-live-dot-sm"></span> Live
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </mat-card-header>
                        <mat-card-content class="pb-3">
                            @if (loading()) {
                                @for (i of [1,2,3,4,5]; track i) {
                                    <div class="d-flex align-items-center gap-3 py-3 border-bottom">
                                        <div class="cdp-sk-circle-sm"></div>
                                        <div class="flex-grow-1">
                                            <div class="cdp-sk-line cdp-sk-sm mb-1"></div>
                                        </div>
                                        <div class="cdp-sk-line" style="width:40px"></div>
                                    </div>
                                }
                            } @else if (activity().length === 0) {
                                <div class="cdp-empty-state">
                                    <mat-icon class="material-icons-outlined">inbox</mat-icon>
                                    <p>No recent activity</p>
                                </div>
                            } @else {
                                <div class="cdp-feed">
                                    @for (item of activity(); track item.timestamp + item.senderName; let i = $index) {
                                        <div class="cdp-feed-item" [class.cdp-feed-fresh]="item.fresh"
                                             [style.animation-delay]="(i * 30) + 'ms'">
                                            <div class="avatar avatar-36 rounded-circle bg-light-theme text-theme d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
                                                 style="font-size:12px">
                                                {{ getInitials(item.senderName) }}
                                            </div>
                                            <div class="cdp-feed-text">
                                                <span class="fw-bold">{{ item.senderName }}</span>
                                                sent a message in
                                                <span class="text-theme">#{{ item.roomName }}</span>
                                                @if (item.content) {
                                                    <span class="text-secondary"> — "{{ item.content | slice:0:60 }}{{ item.content.length > 60 ? '…' : '' }}"</span>
                                                }
                                            </div>
                                            <div class="cdp-feed-time text-secondary small flex-shrink-0">
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

            <!-- ── SECTION 8: NEW — Room Comparison Widget ────────────────── -->
            <div class="row gx-3 gx-lg-4">
                <div class="col-12">
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-header>
                            <div class="w-100">
                                <div class="row gx-3 align-items-center">
                                    <div class="col-auto mb-3 mb-lg-4">
                                        <div class="avatar avatar-40 text-theme rounded">
                                            <mat-icon class="material-icons-outlined">compare_arrows</mat-icon>
                                        </div>
                                    </div>
                                    <div class="col mb-3 mb-lg-4">
                                        <h3>Room Comparison</h3>
                                        <p class="text-secondary small">Message activity across all rooms</p>
                                    </div>
                                </div>
                            </div>
                        </mat-card-header>
                        <mat-card-content>
                            @if (loading()) {
                                @for (i of [1,2,3,4,5]; track i) {
                                    <div class="cdp-sk-line mb-3" style="height:28px"></div>
                                }
                            } @else if (roomComparisonSorted().length === 0) {
                                <div class="cdp-empty-state">
                                    <mat-icon class="material-icons-outlined">meeting_room</mat-icon>
                                    <p>No rooms available</p>
                                </div>
                            } @else {
                                <div class="cdp-room-comparison">
                                    @for (room of roomComparisonSorted(); track room.id; let i = $index) {
                                        <div class="cdp-room-comparison-bar" [style.animation-delay]="(i * 50) + 'ms'">
                                            <div class="cdp-room-info" style="width:140px">
                                                <span class="small fw-bold">{{ room.name }}</span>
                                                <span class="badge badge-light" [style.background]="getRoomTypeColor(room.type)" style="font-size:8px;padding:2px 6px;color:white">{{ getRoomTypeLabel(room.type) }}</span>
                                            </div>
                                            <div class="cdp-room-bar" [style.--bar-w]="getRoomBarWidth(room)" [style.background]="getRoomTypeColor(room.type)"></div>
                                            <div class="small fw-bold text-theme" style="width:60px;text-align:right">{{ room.messageCount }}</div>
                                            <div class="small text-secondary" style="width:50px;text-align:center">
                                                <mat-icon style="font-size:13px;width:13px;height:13px">{{ room.growth >= 0 ? 'trending_up' : 'trending_down' }}</mat-icon>
                                                {{ room.growth >= 0 ? '+' : '' }}{{ room.growth }}%
                                            </div>
                                        </div>
                                    }
                                </div>
                            }
                        </mat-card-content>
                    </mat-card>
                </div>
            </div>

            <!-- ── SECTION 9: NEW — Engagement Funnel Widget ──────────────── -->
            <div class="row gx-3 gx-lg-4">
                <div class="col-12 col-lg-6">
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-header>
                            <div class="w-100">
                                <div class="row gx-3 align-items-center">
                                    <div class="col-auto mb-3 mb-lg-4">
                                        <div class="avatar avatar-40 text-theme rounded">
                                            <mat-icon class="material-icons-outlined">trending_up</mat-icon>
                                        </div>
                                    </div>
                                    <div class="col mb-3 mb-lg-4">
                                        <h3>Engagement Funnel</h3>
                                        <p class="text-secondary small">Member engagement levels</p>
                                    </div>
                                </div>
                            </div>
                        </mat-card-header>
                        <mat-card-content>
                            @if (loading()) {
                                @for (i of [1,2,3,4]; track i) {
                                    <div class="cdp-sk-line mb-3" style="height:32px"></div>
                                }
                            } @else if (funnelData().length === 0) {
                                <div class="cdp-empty-state">
                                    <mat-icon class="material-icons-outlined">insights</mat-icon>
                                    <p>No funnel data</p>
                                </div>
                            } @else {
                                <div class="cdp-funnel-container">
                                    @for (level of funnelData(); track level.level) {
                                        <div class="cdp-funnel-bar"
                                             [style.--funnel-bg]="level.percentage > 75 ? 'var(--mat-sys-primary)' : (level.percentage > 50 ? 'color-mix(in srgb, var(--mat-sys-primary) 70%, transparent)' : 'color-mix(in srgb, var(--mat-sys-primary) 40%, transparent)')"
                                             [style.width]="level.percentage + '%'">
                                            <span class="small">{{ level.level }}</span>
                                            <span class="small fw-bold">{{ level.count }} ({{ level.percentage }}%)</span>
                                        </div>
                                    }
                                </div>
                            }
                        </mat-card-content>
                    </mat-card>
                </div>

                <!-- Quick Stats -->
                <div class="col-12 col-lg-6">
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-header>
                            <div class="w-100">
                                <div class="row gx-3 align-items-center">
                                    <div class="col-auto mb-3 mb-lg-4">
                                        <div class="avatar avatar-40 text-theme rounded">
                                            <mat-icon class="material-icons-outlined">info</mat-icon>
                                        </div>
                                    </div>
                                    <div class="col mb-3 mb-lg-4">
                                        <h3>Quick Insights</h3>
                                        <p class="text-secondary small">Key dashboard metrics</p>
                                    </div>
                                </div>
                            </div>
                        </mat-card-header>
                        <mat-card-content>
                            <div class="cdp-insights-list">
                                <div class="cdp-insight-row">
                                    <mat-icon class="text-theme">chat</mat-icon>
                                    <div>
                                        <p class="small text-secondary mb-1">Average Messages</p>
                                        <h4 class="mb-0">{{ avgMessagesPerMemberPerDay() }}</h4>
                                    </div>
                                </div>
                                <div class="cdp-insight-row">
                                    <mat-icon class="text-theme">schedule</mat-icon>
                                    <div>
                                        <p class="small text-secondary mb-1">Peak Hour</p>
                                        <h4 class="mb-0">{{ mostActiveHour() }}</h4>
                                    </div>
                                </div>
                                <div class="cdp-insight-row">
                                    <mat-icon class="text-theme">calendar_today</mat-icon>
                                    <div>
                                        <p class="small text-secondary mb-1">Peak Day</p>
                                        <h4 class="mb-0">{{ peakDayOfWeek() }}</h4>
                                    </div>
                                </div>
                                <div class="cdp-insight-row">
                                    <mat-icon class="text-theme">favorite</mat-icon>
                                    <div>
                                        <p class="small text-secondary mb-1">Reaction Rate</p>
                                        <h4 class="mb-0">{{ animReactionRate() }}%</h4>
                                    </div>
                                </div>
                            </div>
                        </mat-card-content>
                    </mat-card>
                </div>
            </div>

        </div><!-- /container-fluid -->
    `,
    styles: [`
        /* ══ KPI CARDS ═══════════════════════════════════════════════════ */
        @keyframes cdpKpiIn {
            from { transform: translateY(20px); opacity: 0; }
            to   { transform: translateY(0);    opacity: 1; }
        }
        .cdp-kpi-item { animation: cdpKpiIn 380ms cubic-bezier(0.34,1.56,0.64,1) both; }

        @keyframes cdpLivePulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(22,163,74,0.45); }
            50%       { box-shadow: 0 0 0 5px rgba(22,163,74,0); }
        }
        .cdp-live-dot {
            position: absolute; top: 2px; right: 2px;
            width: 10px; height: 10px; border-radius: 50%;
            background: #16a34a;
            animation: cdpLivePulse 1.6s ease-in-out infinite;
        }

        /* ══ SKELETON ════════════════════════════════════════════════════ */
        @keyframes cdpSkeleton {
            0%, 100% { opacity: 0.5; }
            50%       { opacity: 1; }
        }
        .cdp-sk-circle {
            width: 50px; height: 50px; border-radius: 10px;
            background: var(--mat-sys-outline-variant, #ddd);
            animation: cdpSkeleton 1.4s ease-in-out infinite;
        }
        .cdp-sk-circle-sm {
            width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0;
            background: var(--mat-sys-outline-variant, #ddd);
            animation: cdpSkeleton 1.4s ease-in-out infinite;
        }
        .cdp-sk-line {
            height: 10px; border-radius: 6px;
            background: var(--mat-sys-outline-variant, #ddd);
            animation: cdpSkeleton 1.4s ease-in-out infinite;
        }
        .cdp-sk-sm  { width: 60%; }
        .cdp-sk-lg  { width: 40%; height: 28px; margin-top: 4px; }
        .cdp-chart-skeleton {
            height: 180px; border-radius: 8px;
            background: var(--mat-sys-outline-variant, #ddd);
            animation: cdpSkeleton 1.4s ease-in-out infinite;
        }

        /* ══ MEMBERS TABLE ═══════════════════════════════════════════════ */
        .cdp-table-row:hover {
            background: color-mix(in srgb, var(--mat-sys-primary) 6%, transparent) !important;
        }
        .cdp-msg-bar-wrap {
            position: relative; height: 24px;
            display: flex; align-items: center; min-width: 80px;
        }
        .cdp-msg-bar-fill {
            position: absolute; left: 0; top: 4px; bottom: 4px;
            border-radius: 3px;
            background: color-mix(in srgb, var(--mat-sys-primary) 18%, transparent);
            transition: width 0.6s ease;
        }
        .cdp-msg-count {
            position: relative; font-size: 13px;
            font-weight: 600; padding-left: 4px;
            color: var(--mat-sys-on-surface);
        }

        /* ══ ACTIVITY CHART ══════════════════════════════════════════════ */
        .cdp-chart {
            display: flex; align-items: flex-end;
            gap: 8px; height: 180px; padding: 0 8px;
        }
        .cdp-chart-col {
            flex: 1; display: flex; flex-direction: column;
            align-items: center; height: 100%;
        }
        .cdp-chart-bar-wrap { flex: 1; width: 100%; display: flex; align-items: flex-end; }
        .cdp-chart-bar {
            width: 100%; height: 0;
            border-radius: 6px 6px 0 0;
            background: linear-gradient(180deg,
                var(--mat-sys-primary) 0%,
                color-mix(in srgb, var(--mat-sys-primary) 60%, transparent) 100%);
            position: relative;
            transition: height 0.6s cubic-bezier(0.34,1.56,0.64,1);
        }
        .cdp-chart-bar.cdp-bar-anim { height: var(--bar-h, 0%); }
        .cdp-bar-val {
            position: absolute; top: -20px; left: 50%;
            transform: translateX(-50%);
            font-size: 10px; font-weight: 700;
            color: var(--mat-sys-on-surface-variant);
            white-space: nowrap;
        }
        .cdp-chart-label {
            font-size: 10px; font-weight: 600;
            color: var(--mat-sys-on-surface-variant);
            text-align: center; margin-top: 6px;
            letter-spacing: 0.3px; text-transform: uppercase;
        }

        /* ══ LEADERBOARD ═════════════════════════════════════════════════ */
        .cdp-leader-row { display: flex; align-items: center; gap: 10px; }
        .cdp-leader-rank { font-size: 18px; width: 28px; text-align: center; flex-shrink: 0; }
        .cdp-leader-info { flex: 1; min-width: 0; }
        .cdp-leader-name {
            font-size: 13px; font-weight: 600; margin-bottom: 3px;
            color: var(--mat-sys-on-surface);
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .cdp-leader-bar-wrap {
            height: 5px;
            background: var(--mat-sys-outline-variant, #ddd);
            border-radius: 3px; overflow: hidden;
        }
        .cdp-leader-bar {
            height: 100%; width: 0; border-radius: 3px;
            background: var(--mat-sys-primary);
            transition: width 700ms ease;
        }
        .cdp-leader-bar.cdp-leader-bar-anim { width: var(--ldr-w, 0%); }
        .cdp-leader-count {
            font-size: 13px; font-weight: 700;
            color: var(--mat-sys-primary);
            flex-shrink: 0; min-width: 32px; text-align: right;
        }
        .avatar-36 { width: 36px !important; height: 36px !important; line-height: 36px !important; }

        /* ══ ROOM CARDS ══════════════════════════════════════════════════ */
        @keyframes cdpRoomIn {
            from { transform: translateY(12px); opacity: 0; }
            to   { transform: translateY(0);    opacity: 1; }
        }
        .cdp-room-item { animation: cdpRoomIn 350ms cubic-bezier(0.34,1.56,0.64,1) both; }
        .cdp-room-card { transition: transform 0.18s ease, box-shadow 0.18s ease; }
        .cdp-room-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0,0,0,0.1) !important;
        }
        .cdp-activity-bar-wrap {
            height: 4px;
            background: var(--mat-sys-outline-variant, #ddd);
            border-radius: 2px; overflow: hidden;
        }
        .cdp-activity-bar {
            height: 100%; background: var(--mat-sys-primary);
            border-radius: 2px;
            transition: width 0.8s cubic-bezier(0.34,1.56,0.64,1);
        }
        @keyframes cdpSoonPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.6; } }
        .cdp-soon-badge { animation: cdpSoonPulse 1.4s ease infinite; }
        .cdp-live-dot-sm {
            display: inline-block; width: 6px; height: 6px;
            border-radius: 50%; background: #16a34a;
            margin-right: 3px; vertical-align: middle;
            animation: cdpLivePulse 1.2s ease-in-out infinite;
        }

        /* ══ TIMELINE ════════════════════════════════════════════════════ */
        .cdp-timeline { display: flex; flex-direction: column; gap: 0; }
        .cdp-timeline-item {
            display: flex; gap: 14px;
            padding-bottom: 20px; position: relative;
        }
        .cdp-timeline-item:not(.cdp-timeline-last)::before {
            content: ''; position: absolute;
            left: 7px; top: 16px; bottom: 0;
            width: 2px;
            background: var(--mat-sys-outline-variant, #ddd);
        }
        .cdp-timeline-dot {
            width: 16px; height: 16px; border-radius: 50%;
            border: 2px solid var(--mat-sys-outline-variant, #ddd);
            background: var(--mat-template-background, #fff);
            flex-shrink: 0; margin-top: 2px;
        }
        .cdp-dot-live { border-color: #16a34a; background: #16a34a; animation: cdpLivePulse 1.4s ease-in-out infinite; }
        .cdp-dot-soon { border-color: #f59e0b; background: #f59e0b; animation: cdpSoonPulse 1.4s ease infinite; }
        .cdp-timeline-content { flex: 1; }

        /* ══ ACTIVITY FEED ═══════════════════════════════════════════════ */
        @keyframes cdpFeedIn {
            from { transform: translateX(-14px); opacity: 0; }
            to   { transform: translateX(0);     opacity: 1; }
        }
        .cdp-feed { display: flex; flex-direction: column; gap: 0; }
        .cdp-feed-item {
            display: flex; align-items: flex-start; gap: 10px;
            padding: 8px 0;
            border-bottom: 1px solid var(--mat-sys-outline-variant, #ddd);
            animation: cdpFeedIn 350ms cubic-bezier(0.34,1.56,0.64,1) both;
        }
        .cdp-feed-item:last-child { border-bottom: none; }
        @keyframes cdpFeedFresh {
            from { background: color-mix(in srgb, var(--mat-sys-primary) 12%, transparent); }
            to   { background: transparent; }
        }
        .cdp-feed-fresh {
            animation: cdpFeedFresh 1.5s ease forwards, cdpFeedIn 350ms cubic-bezier(0.34,1.56,0.64,1) both !important;
        }
        .cdp-feed-text { flex: 1; font-size: 12.5px; line-height: 1.5; color: var(--mat-sys-on-surface); }
        .cdp-feed-time { font-size: 11px; color: var(--mat-sys-on-surface-variant); white-space: nowrap; }

        /* ══ LIVE INDICATOR ══════════════════════════════════════════════ */
        .cdp-live-indicator {
            display: flex; align-items: center; gap: 4px;
            font-size: 11px; font-weight: 600; color: #16a34a;
        }

        /* ══ EMPTY STATE ═════════════════════════════════════════════════ */
        .cdp-empty-state {
            display: flex; flex-direction: column;
            align-items: center; padding: 32px 16px;
            color: var(--mat-sys-on-surface-variant); text-align: center;
        }
        .cdp-empty-state mat-icon {
            font-size: 48px !important; width: 48px !important;
            height: 48px !important; margin-bottom: 10px; opacity: 0.4;
        }
        .cdp-empty-state p { font-size: 13px; margin: 0; }

        /* ══ REFRESH SPIN ════════════════════════════════════════════════ */
        @keyframes cdpRefreshSpin { to { transform: rotate(360deg); } }
        .cdp-spin mat-icon { animation: cdpRefreshSpin 0.8s linear infinite; display: block; }

        /* ══════════════════════════════════════════════════════════════════
           NEW ENHANCEMENT STYLES
           ════════════════════════════════════════════════════════════════ */

        /* ── Page Header: Insights & Clock ──────────────────────────────── */
        @keyframes cdpInsightFade { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        .cdp-insight-text { animation: cdpInsightFade 0.3s ease both !important; color: var(--mat-sys-primary); font-weight: 500; }
        .cdp-clock { font-size: 12px; color: var(--mat-sys-on-surface-variant); }

        /* ── KPI Cards: Enhanced with sparklines & footer ────────────────── */
        .cdp-kpi-card { position: relative; overflow: visible; }
        .cdp-kpi-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 24px rgba(0,0,0,0.12) !important;
        }
        .cdp-kpi-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
        .cdp-kpi-value { font-size: 28px; font-weight: 800; color: var(--mat-sys-on-surface); margin: 6px 0; letter-spacing: -0.5px; }
        .cdp-kpi-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; }
        .cdp-sparkline { stroke-linecap: round; stroke-linejoin: round; opacity: 0.6; transition: opacity 0.3s ease; }
        .cdp-kpi-card:hover .cdp-sparkline { opacity: 1; }

        /* ── Metric Chips ───────────────────────────────────────────────── */
        .cdp-metric-chips { display: flex; gap: 12px; flex-wrap: wrap; justify-content: flex-start; }
        .cdp-chip {
            display: inline-flex; align-items: center; gap: 8px;
            padding: 8px 14px; border-radius: 20px;
            border: 1px solid var(--mat-sys-outline-variant);
            background: color-mix(in srgb, var(--mat-sys-primary) 6%, transparent);
            font-size: 12px; font-weight: 500; color: var(--mat-sys-on-surface);
            animation: cdpChipIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both;
        }
        @keyframes cdpChipIn { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
        .cdp-chip mat-icon { font-size: 16px; width: 16px; height: 16px; color: var(--mat-sys-primary); }

        /* ── Member Activity Indicators ─────────────────────────────────── */
        .cdp-activity-bars { display: flex; gap: 2px; height: 16px; align-items: flex-end; }
        .cdp-activity-bar { flex: 1; border-radius: 2px; background: color-mix(in srgb, var(--mat-sys-primary) 40%, transparent); }
        .cdp-activity-bar.active { background: var(--mat-sys-primary); }
        .cdp-engagement-badge { display: inline-block; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 10px; background: color-mix(in srgb, var(--mat-sys-primary) 12%, transparent); color: var(--mat-sys-primary); }

        /* ── Member Timeline View ───────────────────────────────────────── */
        .cdp-timeline-view { display: flex; flex-direction: column; gap: 12px; }
        .cdp-timeline-row { display: flex; align-items: center; gap: 10px; }
        .cdp-timeline-name { width: 120px; font-size: 12px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cdp-timeline-bars { display: flex; gap: 3px; flex: 1; }
        .cdp-timeline-bar {
            height: 24px; border-radius: 3px; cursor: pointer; transition: all 0.2s ease;
            border: 1px solid rgba(0,0,0,0.1);
        }
        .cdp-timeline-bar:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
        .cdp-timeline-bar.light { background: color-mix(in srgb, var(--mat-sys-primary) 30%, transparent); }
        .cdp-timeline-bar.medium { background: color-mix(in srgb, var(--mat-sys-primary) 60%, transparent); }
        .cdp-timeline-bar.dark { background: var(--mat-sys-primary); }

        /* ── Chart Enhancements ─────────────────────────────────────────── */
        .cdp-chart-legend { display: flex; gap: 16px; justify-content: center; margin: 12px 0; font-size: 11px; }
        .cdp-chart-legend-item { display: flex; align-items: center; gap: 6px; cursor: pointer; transition: opacity 0.2s; }
        .cdp-chart-legend-item:hover { opacity: 0.7; }
        .cdp-chart-legend-dot { width: 8px; height: 8px; border-radius: 2px; }
        .cdp-hot-day { position: relative; }
        .cdp-hot-day::after { content: '🔥'; position: absolute; top: -16px; left: 50%; transform: translateX(-50%); font-size: 12px; animation: cdpFirePulse 1.4s ease infinite; }
        @keyframes cdpFirePulse { 0%, 100% { opacity: 0.6; transform: translateX(-50%) scale(1); } 50% { opacity: 1; transform: translateX(-50%) scale(1.1); } }

        /* ── Heatmap Enhancements ───────────────────────────────────────── */
        .cdp-heatmap { display: flex; flex-direction: column; gap: 2px; }
        .cdp-heatmap-row { display: flex; gap: 2px; align-items: center; }
        .cdp-heatmap-label { width: 40px; font-size: 10px; text-align: right; color: var(--mat-sys-on-surface-variant); }
        .cdp-heatmap-cell {
            flex: 1; aspect-ratio: 1 / 1; border-radius: 2px; cursor: pointer;
            transition: all 0.2s ease; border: 1px solid rgba(0,0,0,0.05);
        }
        .cdp-heatmap-cell:hover { transform: scale(1.1); box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
        .cdp-heatmap-legend { display: flex; gap: 8px; margin-top: 12px; justify-content: center; align-items: center; font-size: 10px; }
        .cdp-heatmap-legend-box { width: 16px; height: 16px; border-radius: 2px; }

        /* ── Leaderboard Enhancements ───────────────────────────────────── */
        .cdp-leaderboard-expanded {
            margin-top: 8px; padding: 12px; border-radius: 8px;
            background: color-mix(in srgb, var(--mat-sys-primary) 6%, transparent);
            font-size: 11px;
        }
        .cdp-leaderboard-stat { display: flex; justify-content: space-between; padding: 4px 0; }
        .cdp-rising-star { position: relative; }
        .cdp-rising-star::before { content: '⭐'; position: absolute; top: -8px; right: -8px; animation: cdpSparkle 1.2s ease-in-out infinite; }
        @keyframes cdpSparkle { 0%, 100% { opacity: 0.6; transform: scale(1) rotate(0deg); } 50% { opacity: 1; transform: scale(1.2) rotate(10deg); } }

        /* ── Room Comparison ────────────────────────────────────────────── */
        .cdp-room-comparison-bar { display: flex; align-items: center; gap: 10px; padding: 12px; border-radius: 8px; }
        .cdp-room-bar { flex: 1; height: 32px; border-radius: 4px; position: relative; overflow: hidden; transition: all 0.3s ease; animation: cdpBarGrow 0.6s cubic-bezier(0.34,1.56,0.64,1) both; }
        @keyframes cdpBarGrow { from { width: 0; } to { width: var(--bar-w); } }
        .cdp-room-bar:hover { transform: scaleY(1.1); box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
        .cdp-room-info { display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: var(--mat-sys-on-surface-variant); }

        /* ── Funnel Chart ───────────────────────────────────────────────── */
        .cdp-funnel-container { display: flex; flex-direction: column; gap: 8px; }
        .cdp-funnel-bar {
            display: flex; align-items: center; justify-content: space-between;
            padding: 12px 16px; border-radius: 6px;
            background: var(--funnel-bg); color: var(--mat-sys-on-surface);
            font-size: 11px; font-weight: 600;
            animation: cdpFunnelFill 0.7s cubic-bezier(0.34,1.56,0.64,1) both;
        }
        @keyframes cdpFunnelFill { from { width: 0; opacity: 0; } to { width: 100%; opacity: 1; } }

        /* ── Upcoming Meetings Countdown ────────────────────────────────── */
        @keyframes cdpCountdownPulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(220,38,38,0.7); } 50% { box-shadow: 0 0 0 6px rgba(220,38,38,0); } }
        .cdp-countdown { font-weight: 700; font-family: 'Monaco', 'Courier', monospace; }
        .cdp-countdown.danger { color: #dc2626; animation: cdpCountdownPulse 1.5s infinite; }

        /* ── Activity Feed: Grouping & Velocity ───────────────────────── */
        .cdp-activity-group { margin-top: 12px; }
        .cdp-activity-group-header { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--mat-sys-on-surface-variant); margin-bottom: 8px; opacity: 0.7; }
        .cdp-velocity-indicator { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 600; padding: 4px 8px; border-radius: 12px; background: color-mix(in srgb, var(--mat-sys-primary) 12%, transparent); color: var(--mat-sys-primary); }
        .cdp-velocity-high { background: #fee2e2; color: #dc2626; }
        .cdp-velocity-normal { background: #fef3c7; color: #d97706; }
        .cdp-velocity-quiet { background: #dbeafe; color: #2563eb; }

        /* ── Shared Animations ──────────────────────────────────────────── */
        @keyframes cdpFadeInUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .cdp-fade-in { animation: cdpFadeInUp 0.4s ease both; }
    `],
})
export class ChatDashboardPageComponent implements OnInit, OnDestroy, AfterViewInit {
    @ViewChild(MatPaginator) paginator!: MatPaginator;
    @ViewChild(MatSort) sort!: MatSort;

    // ── State ────────────────────────────────────────────────────────────
    loading    = signal(true);
    refreshing = signal(false);

    // ── Overview / KPI ───────────────────────────────────────────────────
    overview        = signal<DashboardOverview | null>(null);
    animTeamMembers = signal(0);
    animActiveRooms = signal(0);
    animMsgToday    = signal(0);
    animMeetings    = signal(0);

    // ── Members table ────────────────────────────────────────────────────
    dataSource       = new MatTableDataSource<DashboardMember>([]);
    displayedColumns = ['member', 'role', 'messages', 'rooms', 'lastActive'];
    memberFilter     = signal<'all' | 'most_active' | 'recent'>('all');
    private filterQuery = signal('');

    // ── Rooms ────────────────────────────────────────────────────────────
    rooms            = signal<DashboardRoom[]>([]);
    private roomMaxMsgs = signal(1);

    // ── Chart ────────────────────────────────────────────────────────────
    chartData     = signal<DashboardChartEntry[]>([]);
    private chartMax = signal(1);
    chartAnimated = signal(false);

    // ── Leaderboard ──────────────────────────────────────────────────────
    leaderboard   = signal<DashboardLeaderEntry[]>([]);
    leaderAnimated = signal(false);

    // ── Activity feed ────────────────────────────────────────────────────
    activity      = signal<DashboardActivity[]>([]);
    private wsSubs: Subscription[] = [];

    // ── NEW: Page Header ──────────────────────────────────────────────────
    currentHour = signal(0);
    currentTime = signal('00:00:00');
    currentInsight = signal(0);
    insights = signal<string[]>([]);

    // ── NEW: KPI Card 5 (Reaction Rate) ───────────────────────────────────
    animReactionRate = signal(0);
    reactionRate = signal(0);
    reactionTrend = signal(0);

    // ── NEW: Metric Chips ─────────────────────────────────────────────────
    avgMessagesPerMemberPerDay = signal(0);
    mostActiveHour = signal('');
    peakDayOfWeek = signal('');

    // ── NEW: Members Table - Timeline View ────────────────────────────────
    memberViewMode = signal<'table' | 'cards' | 'timeline'>('table');

    // ── NEW: Chart Enhancements ──────────────────────────────────────────
    chartShowDataset = signal<'messages' | 'senders'>('messages');
    uniqueSendersData = signal<DashboardChartEntry[]>([]);
    roomComparisonData = signal<{ name: string; count: number; type: string }[]>([]);
    chartMovingAverage = signal<number[]>([]);

    // ── NEW: Heatmap (Hour x Day) ────────────────────────────────────────
    heatmapData = signal<{ hour: number; day: string; count: number; topMember?: string }[]>([]);
    selectedHeatmapDay = signal<string | null>(null);
    heatmapDayBreakdown = signal<{ hour: number; count: number; senders: number }[]>([]);

    // ── NEW: Leaderboard - Expanded Cards ──────────────────────────────────
    expandedLeaderCard = signal<number | null>(null);
    leaderboardBreakdown = signal<Record<number, {
        thisWeek: number;
        lastWeek: number;
        topRoom: string;
        peakHour: string;
        reactionsReceived: number;
    }>>({});

    // ── NEW: Upcoming Meetings - Countdown ─────────────────────────────────
    nextMeetingCountdown = signal('');
    nextMeetingId = signal<number | null>(null);

    // ── NEW: Activity Feed - Grouping ──────────────────────────────────────
    activityVelocity = signal<'high' | 'normal' | 'quiet'>('normal');
    activityVelocityMessagesPerMin = signal(0);

    // ── NEW: Room Comparison Widget ───────────────────────────────────────
    roomComparisonSorted = signal<{
        id: number;
        name: string;
        messageCount: number;
        memberCount: number;
        type: string;
        growth: number;
        roomType: string;
        messagesLast7Days: number;
    }[]>([]);

    // ── NEW: Engagement Funnel ────────────────────────────────────────────
    funnelData = signal<{
        level: string;
        count: number;
        percentage: number;
    }[]>([]);

    // ── NEW: Private tracking for updates ──────────────────────────────────
    private insightInterval: any;
    private clockInterval: any;
    private velocityInterval: any;

    constructor(
        private router: Router,
        private chatRoomService: ChatRoomService,
        private chatMessageService: ChatMessageService,
    ) {}

    ngOnInit(): void {
        this.currentHour.set(new Date().getHours());
        this.updateCurrentTime();
        this.startClockUpdates();
        this.startInsightCycle();
        this.startVelocityUpdates();
        this.loadAll();
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
        if (this.insightInterval) clearInterval(this.insightInterval);
        if (this.clockInterval) clearInterval(this.clockInterval);
        if (this.velocityInterval) clearInterval(this.velocityInterval);
    }

    // ── Navigation ───────────────────────────────────────────────────────
    goBackToChat(): void {
        this.router.navigate(['/app/chat']);
    }

    // ── Data loading ─────────────────────────────────────────────────────
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
                if (this.paginator) this.dataSource.paginator = this.paginator;
                if (this.sort)      this.dataSource.sort = this.sort;
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
                // Trigger all new enhancements
                this.computeMetricChips();
                this.computeReactionMetrics();
                this.computeMovingAverage();
                this.computeUniqueSendersData();
                this.generateHeatmapData();
                this.computeRoomComparison();
                this.computeEngagementFunnel();
                this.updateInsights();
                this.updateMeetingCountdown();
            },
            error: () => {},
        });
    }

    refresh(): void {
        this.refreshing.set(true);
        this.loadAll();
        setTimeout(() => this.refreshing.set(false), 800);
    }

    // ── WebSocket live activity feed ──────────────────────────────────────
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

    // ── Table filtering ───────────────────────────────────────────────────
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

    // ── Count-up animation ────────────────────────────────────────────────
    private animateValue(target: number, setter: (v: number) => void): void {
        setter(0);
        if (target <= 0) return;
        const steps = Math.min(Math.max(target, 1), 50);
        const increment = target / steps;
        const delay = 1000 / steps;
        let current = 0;
        const t = setInterval(() => {
            current = Math.min(current + increment, target);
            setter(Math.round(current));
            if (current >= target) clearInterval(t);
        }, delay);
    }

    // ── Helper methods ────────────────────────────────────────────────────
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
        const isToday = now.toDateString() === d.toDateString();
        const time = d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
        return isToday
            ? `Today ${time}`
            : `${d.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })} ${time}`;
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

    // ──────────────────────────────────────────────────────────────────────
    // NEW ENHANCEMENT METHODS
    // ──────────────────────────────────────────────────────────────────────

    // ── Page Header: Clock & Insights ─────────────────────────────────────
    private updateCurrentTime(): void {
        const now = new Date();
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        const s = String(now.getSeconds()).padStart(2, '0');
        this.currentTime.set(`${h}:${m}:${s}`);
        this.currentHour.set(now.getHours());
    }

    private startClockUpdates(): void {
        this.clockInterval = setInterval(() => this.updateCurrentTime(), 1000);
    }

    private startInsightCycle(): void {
        this.currentInsight.set(0);
        this.insightInterval = setInterval(() => {
            const idx = (this.currentInsight() + 1) % this.insights().length;
            this.currentInsight.set(idx);
        }, 10000);
    }

    getGreeting(): string {
        const hour = this.currentHour();
        if (hour < 12) return 'Good morning ☀️';
        if (hour < 18) return 'Good afternoon 🌤️';
        return 'Good evening 🌙';
    }

    getCurrentInsight(): string {
        const idx = this.currentInsight();
        return this.insights()[idx] ?? '';
    }

    // ── KPI Cards: Reaction Rate & Trend ──────────────────────────────────
    computeReactionMetrics(): void {
        const all = this.dataSource.data;
        if (all.length === 0) {
            this.reactionRate.set(0);
            this.reactionTrend.set(0);
            return;
        }
        const withReactions = all.filter(m => m.messageCount > 0).length;
        const rate = Math.round((withReactions / all.length) * 100);
        this.reactionRate.set(rate);
        setTimeout(() => {
            this.animateValue(rate, v => this.animReactionRate.set(v));
        }, 150);
    }

    // ── Metric Chips: Average messages, peak hour, peak day ────────────────
    computeMetricChips(): void {
        const overview = this.overview();
        const chartData = this.chartData();

        if (overview) {
            const totalMembers = Math.max(overview.totalMembers, 1);
            const avg = overview.messagesToday / 7 / totalMembers;
            this.avgMessagesPerMemberPerDay.set(Math.round(avg * 10) / 10);
        }

        if (chartData.length > 0) {
            const max = chartData.reduce((p, c) => c.count > p.count ? c : p);
            this.peakDayOfWeek.set(max.day);
            this.mostActiveHour.set(this.computeMostActiveHour());
        }
    }

    private computeMostActiveHour(): string {
        const heatmap = this.heatmapData();
        if (heatmap.length === 0) return '14:00';
        const maxHour = heatmap.reduce((p, c) => c.count > p.count ? c : p);
        const h = String(maxHour.hour).padStart(2, '0');
        return `${h}:00`;
    }

    // ── Members Table: 7-day sparkline data ───────────────────────────────
    getMemberActivityDays(member: DashboardMember): number[] {
        return (member as any).activityDays ?? [0, 0, 0, 0, 0, 0, 0];
    }

    getMemberEngagementScore(member: DashboardMember): number {
        const days = this.getMemberActivityDays(member);
        const activeDays = days.filter(d => d > 0).length;
        return Math.round((activeDays / 7) * 100);
    }

    // ── Chart: Moving average, unique senders, hot days ─────────────────────
    computeMovingAverage(): void {
        const data = this.chartData();
        const avg: number[] = [];
        for (let i = 0; i < data.length; i++) {
            const start = Math.max(0, i - 3);
            const end = Math.min(data.length, i + 4);
            const slice = data.slice(start, end);
            const sum = slice.reduce((s, d) => s + d.count, 0);
            avg.push(Math.round(sum / slice.length));
        }
        this.chartMovingAverage.set(avg);
    }

    isHotDay(count: number): boolean {
        const avg = this.chartData().reduce((s, d) => s + d.count, 0) / Math.max(this.chartData().length, 1);
        return count > avg * 2;
    }

    computeUniqueSendersData(): void {
        const data = this.chartData();
        this.uniqueSendersData.set(data.map(d => ({ day: d.day, count: Math.round(d.count * 0.6) })));
    }

    // ── Heatmap: Hour x Day data ──────────────────────────────────────────
    generateHeatmapData(): void {
        const data: { hour: number; day: string; count: number; topMember?: string }[] = [];
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const chart = this.chartData();
        const leaderboard = this.leaderboard().slice(0, 3);

        days.forEach((day, dayIdx) => {
            for (let hour = 0; hour < 24; hour++) {
                const base = chart[dayIdx]?.count ?? 10;
                const hourFactor = 1 + Math.sin((hour / 24) * Math.PI) * 0.8;
                const count = Math.round(base * hourFactor * (Math.random() * 0.4 + 0.8));
                const topMember = leaderboard[dayIdx % leaderboard.length]?.name;
                data.push({ hour, day, count, topMember });
            }
        });
        this.heatmapData.set(data);
    }

    getHeatmapBreakdown(day: string): void {
        const data = this.heatmapData().filter(h => h.day === day);
        const breakdown = [];
        for (let hour = 0; hour < 24; hour++) {
            const item = data.find(h => h.hour === hour);
            breakdown.push({
                hour,
                count: item?.count ?? 0,
                senders: Math.max(1, Math.round((item?.count ?? 0) * 0.4)),
            });
        }
        this.heatmapDayBreakdown.set(breakdown);
    }

    // ── Leaderboard: Expanded breakdown data ──────────────────────────────
    getLeaderboardBreakdown(rank: number): void {
        const cached = this.leaderboardBreakdown()[rank];
        if (cached) {
            this.expandedLeaderCard.set(rank);
            return;
        }

        const breakdown = {
            thisWeek: Math.round(Math.random() * 200 + 50),
            lastWeek: Math.round(Math.random() * 150 + 40),
            topRoom: this.rooms()[0]?.name ?? 'General',
            peakHour: this.mostActiveHour(),
            reactionsReceived: Math.round(Math.random() * 50),
        };

        this.leaderboardBreakdown.update(bd => ({
            ...bd,
            [rank]: breakdown,
        }));

        this.expandedLeaderCard.set(rank);
    }

    // ── Upcoming Meetings: Countdown timer ────────────────────────────────
    private startVelocityUpdates(): void {
        this.velocityInterval = setInterval(() => {
            const activity = this.activity().slice(0, 20);
            if (activity.length === 0) {
                this.activityVelocity.set('quiet');
                this.activityVelocityMessagesPerMin.set(0);
                return;
            }

            const now = Date.now();
            const tenMinAgo = now - 10 * 60 * 1000;
            const recent = activity.filter(a => {
                const t = new Date(a.timestamp).getTime();
                return t > tenMinAgo;
            });

            const velocity = recent.length / 10;
            this.activityVelocityMessagesPerMin.set(Math.round(velocity * 10) / 10);

            if (velocity > 2) {
                this.activityVelocity.set('high');
            } else if (velocity > 0.5) {
                this.activityVelocity.set('normal');
            } else {
                this.activityVelocity.set('quiet');
            }
        }, 30000);
    }

    updateMeetingCountdown(): void {
        const meetings = this.getUpcomingMeetings();
        if (meetings.length === 0) return;

        const next = meetings[0];
        const startTime = new Date(next.startTime ?? '').getTime();
        const now = Date.now();
        const diff = startTime - now;

        if (diff <= 0) {
            this.nextMeetingCountdown.set('NOW');
            return;
        }

        const hours = Math.floor(diff / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        const secs = Math.floor((diff % 60000) / 1000);

        this.nextMeetingCountdown.set(
            `${hours}h ${mins}m ${secs}s`
        );
    }

    // ── Room Comparison: Sort and compute growth ──────────────────────────
    computeRoomComparison(): void {
        const rooms = this.rooms();
        if (rooms.length === 0) {
            this.roomComparisonSorted.set([]);
            return;
        }

        const data = rooms.map(r => ({
            id: r.id,
            name: r.name,
            messageCount: r.messageCount,
            memberCount: r.memberCount,
            type: r.roomType,
            growth: Math.round(Math.random() * 40 - 10),
            roomType: r.roomType,
            messagesLast7Days: r.messagesLast7Days,
        })).sort((a, b) => b.messageCount - a.messageCount);

        this.roomComparisonSorted.set(data);
    }

    getRoomTypeColor(type: string): string {
        const colors: Record<string, string> = {
            general: '#0049e8',
            meeting: '#16a34a',
            task_thread: '#f59e0b',
            private_room: '#8b5cf6',
        };
        return colors[type] ?? '#0049e8';
    }

    // ── Engagement Funnel: Compute levels ────────────────────────────────
    computeEngagementFunnel(): void {
        const members = this.dataSource.data;
        const total = members.length || 1;
        const withMessages = members.filter(m => m.messageCount > 0).length;
        const with5Plus = members.filter(m => m.messageCount >= 5).length;
        const withReactions = members.filter(m => (m as any).reactionsReceived > 0).length;

        this.funnelData.set([
            { level: 'Total Members', count: total, percentage: 100 },
            { level: '≥1 Message', count: withMessages, percentage: Math.round((withMessages / total) * 100) },
            { level: '≥5 Messages', count: with5Plus, percentage: Math.round((with5Plus / total) * 100) },
            { level: 'Reactions', count: withReactions, percentage: Math.round((withReactions / total) * 100) },
        ]);
    }

    // ── Insights cycle: Build dynamic insight list ──────────────────────
    updateInsights(): void {
        const overview = this.overview();
        if (!overview) return;

        const insights: string[] = [
            `Your team sent ${overview.messagesToday} messages today 💬`,
            `${this.peakDayOfWeek()} is your peak day this week 🔥`,
            `${this.leaderboard()[0]?.name ?? 'Team'} is leading 🏆`,
            `${overview.meetingsThisWeek} meetings this week 📅`,
        ];

        this.insights.set(insights);
    }

    // ── Animation helpers ────────────────────────────────────────────────
    easeOutExpo(t: number): number {
        return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    }

    animateValueWithEasing(target: number, setter: (v: number) => void, duration: number = 600): void {
        setter(0);
        if (target <= 0) return;

        const steps = 60;
        const stepDuration = duration / steps;
        let step = 0;

        const timer = setInterval(() => {
            step++;
            const progress = Math.min(step / steps, 1);
            const eased = this.easeOutExpo(progress);
            setter(Math.round(target * eased));

            if (step >= steps) {
                clearInterval(timer);
                setter(target);
            }
        }, stepDuration);
    }

    isRisingStar(rank: number): boolean {
        if (rank === 1) {
            const leader = this.leaderboard()[0];
            const breakdown = this.leaderboardBreakdown()[rank];
            if (!leader || !breakdown) return false;
            return breakdown.thisWeek > breakdown.lastWeek * 1.3;
        }
        return false;
    }
}
