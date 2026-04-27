import {
    Component, OnInit, OnDestroy,
    signal, computed, ChangeDetectionStrategy, ElementRef, ViewChild, AfterViewInit, Renderer2
} from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatBadgeModule } from '@angular/material/badge';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { trigger, style, animate, transition, state, query, stagger } from '@angular/animations';
import { Subscription } from 'rxjs';
import { ChatMessageService, SentimentStats } from './chat-message.service';
import { PageRightComponent } from '../../../../components/page-right/pageright.component';

@Component({
    selector: 'app-chat-sentiment-stats',
    standalone: true,
    imports: [
        CommonModule, FormsModule, DecimalPipe,
        MatCardModule, MatIconModule, MatButtonModule,
        MatProgressBarModule, MatProgressSpinnerModule,
        MatTooltipModule, MatChipsModule, MatDividerModule,
        MatTableModule, MatTabsModule, MatBadgeModule, MatSelectModule,
        MatSlideToggleModule,
        PageRightComponent,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    animations: [
        trigger('fadeIn', [
            transition(':enter', [
                style({ opacity: 0, transform: 'translateY(-8px)' }),
                animate('500ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' })),
            ]),
        ]),
        trigger('slideInUp', [
            transition(':enter', [
                style({ opacity: 0, transform: 'translateY(20px)' }),
                animate('600ms cubic-bezier(0.34, 1.56, 0.64, 1)', style({ opacity: 1, transform: 'translateY(0)' })),
            ]),
        ]),
        trigger('staggerAnimation', [
            transition(':enter', [
                query(':enter', [
                    style({ opacity: 0, transform: 'translateY(12px)' }),
                    stagger(80, [
                        animate('500ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' })),
                    ]),
                ], { optional: true }),
            ]),
        ]),
        trigger('pulseAnimation', [
            state('active', style({ opacity: 1 })),
            transition('* => active', [
                animate('1.2s ease-in-out', style({ opacity: 0.7 })),
                animate('1.2s ease-in-out', style({ opacity: 1 })),
            ]),
        ]),
    ],
    template: `
<!-- ══ ANIMATED BACKGROUND ════════════════════════════════════════════ -->
<div class="css-bg-blur"></div>

<!-- ══ HEADER ═════════════════════════════════════════════════════════ -->
<div class="container-fluid" @fadeIn>
    <div class="css-header-glass">
        <div class="css-header-content">
            <div class="css-header-left">
                <div class="css-header-icon-wrap">
                    <div class="css-icon-glow"></div>
                    <mat-icon>analytics</mat-icon>
                </div>
                <div class="css-header-text">
                    <h1 class="css-header-title">Conversation Intelligence Hub</h1>
                    <p class="css-header-subtitle">Global sentiment analysis across all chatrooms</p>
                </div>
            </div>
            <div class="css-header-actions">
                <button mat-icon-button (click)="load()" [disabled]="loading()" matTooltip="Refresh Dashboard" class="css-refresh-btn">
                    <mat-icon [class.css-spin]="loading()">refresh</mat-icon>
                </button>
                <button mat-stroked-button class="css-back-btn" (click)="goBack()">
                    <mat-icon style="font-size:16px;width:16px;height:16px">arrow_back</mat-icon>
                    Back
                </button>
                <app-page-right></app-page-right>
            </div>
        </div>
    </div>
</div>

@if (loading()) {
    <div class="css-loading-container" @fadeIn>
        <div class="css-loader-pulse">
            <mat-spinner diameter="56"></mat-spinner>
        </div>
        <p class="css-loading-text">Analyzing conversation sentiments…</p>
        <p class="css-loading-subtext">Building your intelligence dashboard</p>
    </div>
} @else if (error()) {
    <div class="container-fluid" @fadeIn>
        <div class="css-error-container">
            <div class="css-error-icon">
                <mat-icon>warning_amber</mat-icon>
            </div>
            <h3 class="css-error-title">Unable to Load Dashboard</h3>
            <p class="css-error-message">{{ error() }}</p>
            <button mat-raised-button color="primary" (click)="load()" class="css-retry-btn">
                <mat-icon>refresh</mat-icon> Retry
            </button>
        </div>
    </div>
} @else if (stats()) {
    <div class="container-fluid css-dashboard-body">

        <!-- ── PREMIUM KPI CARDS ──────────────────────────────────── -->
        <div class="css-kpi-section" @staggerAnimation>
            <div class="css-kpi-card css-kpi-positive" @slideInUp>
                <div class="css-kpi-header">
                    <div class="css-kpi-icon-wrap css-icon-positive">
                        <mat-icon>sentiment_very_satisfied</mat-icon>
                    </div>
                    <span class="css-kpi-badge">POSITIVE</span>
                </div>
                <div class="css-kpi-value">{{ stats()!.distribution.POSITIVE | number }}</div>
                <div class="css-kpi-percentage" [style.color]="'#4CAF50'">{{ positivePercent() | number:'1.1-1' }}%</div>
                <div class="css-kpi-bar">
                    <div class="css-kpi-bar-fill" [style.width.%]="positivePercent()" style="background: linear-gradient(90deg, #4CAF50, #66BB6A);"></div>
                </div>
            </div>
            <div class="css-kpi-card css-kpi-neutral" @slideInUp style="animation-delay: 80ms;">
                <div class="css-kpi-header">
                    <div class="css-kpi-icon-wrap css-icon-neutral">
                        <mat-icon>sentiment_neutral</mat-icon>
                    </div>
                    <span class="css-kpi-badge">NEUTRAL</span>
                </div>
                <div class="css-kpi-value">{{ stats()!.distribution.NEUTRAL | number }}</div>
                <div class="css-kpi-percentage" [style.color]="'#2196F3'">{{ neutralPercent() | number:'1.1-1' }}%</div>
                <div class="css-kpi-bar">
                    <div class="css-kpi-bar-fill" [style.width.%]="neutralPercent()" style="background: linear-gradient(90deg, #2196F3, #64B5F6);"></div>
                </div>
            </div>
            <div class="css-kpi-card css-kpi-negative" @slideInUp style="animation-delay: 160ms;">
                <div class="css-kpi-header">
                    <div class="css-kpi-icon-wrap css-icon-negative">
                        <mat-icon>sentiment_very_dissatisfied</mat-icon>
                    </div>
                    <span class="css-kpi-badge">NEGATIVE</span>
                </div>
                <div class="css-kpi-value">{{ stats()!.distribution.NEGATIVE | number }}</div>
                <div class="css-kpi-percentage" [style.color]="'#FF6B6B'">{{ negativePercent() | number:'1.1-1' }}%</div>
                <div class="css-kpi-bar">
                    <div class="css-kpi-bar-fill" [style.width.%]="negativePercent()" style="background: linear-gradient(90deg, #FF6B6B, #FF8787);"></div>
                </div>
            </div>
            <div class="css-kpi-card css-kpi-total" @slideInUp style="animation-delay: 240ms;">
                <div class="css-kpi-header">
                    <div class="css-kpi-icon-wrap css-icon-total">
                        <mat-icon>chat_bubble</mat-icon>
                    </div>
                    <span class="css-kpi-badge">TOTAL</span>
                </div>
                <div class="css-kpi-value">{{ stats()!.total | number }}</div>
                <div class="css-kpi-subtitle">messages analyzed</div>
                <div class="css-kpi-health">{{ getHealthStatus() }}</div>
            </div>
        </div>

        <!-- ── DISTRIBUTION VISUALIZATION ─────────────────────────── -->
        <div class="css-grid-2col" @slideInUp>
            <mat-card class="css-premium-card css-distribution-card">
                <div class="css-card-header">
                    <div class="css-card-icon">
                        <mat-icon>donut_large</mat-icon>
                    </div>
                    <h3 class="css-card-title">Sentiment Composition</h3>
                </div>
                <div class="css-dist-bar-container">
                    <div class="css-dist-bar-animated">
                        @if (positivePercent() > 0) {
                            <div class="css-dist-segment css-seg-positive-gradient"
                                 [style.flex]="positivePercent()"
                                 [matTooltip]="positivePercent() | number:'1.1-1' + '% Positive Messages'"
                                 class="css-hover-lift">
                                <span class="css-segment-label">{{ positivePercent() | number:'1.0-0' }}%</span>
                            </div>
                        }
                        @if (neutralPercent() > 0) {
                            <div class="css-dist-segment css-seg-neutral-gradient"
                                 [style.flex]="neutralPercent()"
                                 [matTooltip]="neutralPercent() | number:'1.1-1' + '% Neutral Messages'"
                                 class="css-hover-lift">
                                <span class="css-segment-label">{{ neutralPercent() | number:'1.0-0' }}%</span>
                            </div>
                        }
                        @if (negativePercent() > 0) {
                            <div class="css-dist-segment css-seg-negative-gradient"
                                 [style.flex]="negativePercent()"
                                 [matTooltip]="negativePercent() | number:'1.1-1' + '% Negative Messages'"
                                 class="css-hover-lift">
                                <span class="css-segment-label">{{ negativePercent() | number:'1.0-0' }}%</span>
                            </div>
                        }
                    </div>
                    <div class="css-legend-enhanced">
                        <div class="css-legend-item">
                            <span class="css-legend-indicator css-positive"></span>
                            <span class="css-legend-text">Positive</span>
                            <span class="css-legend-count">{{ stats()!.distribution.POSITIVE }}</span>
                        </div>
                        <div class="css-legend-item">
                            <span class="css-legend-indicator css-neutral"></span>
                            <span class="css-legend-text">Neutral</span>
                            <span class="css-legend-count">{{ stats()!.distribution.NEUTRAL }}</span>
                        </div>
                        <div class="css-legend-item">
                            <span class="css-legend-indicator css-negative"></span>
                            <span class="css-legend-text">Negative</span>
                            <span class="css-legend-count">{{ stats()!.distribution.NEGATIVE }}</span>
                        </div>
                    </div>
                </div>
            </mat-card>

            <!-- ── HEALTH INDICATOR ────────────────────────────────── -->
            <mat-card class="css-premium-card css-health-card">
                <div class="css-card-header">
                    <div class="css-card-icon">
                        <mat-icon>favorite</mat-icon>
                    </div>
                    <h3 class="css-card-title">Sentiment Health</h3>
                </div>
                <div class="css-health-gauge">
                    <div class="css-gauge-circle" [style.--health-value]="getHealthScore() + '%'">
                        <div class="css-gauge-content">
                            <div class="css-gauge-value">{{ getHealthScore() | number:'1.0-0' }}%</div>
                            <div class="css-gauge-label">{{ getHealthStatus() }}</div>
                        </div>
                    </div>
                </div>
                <div class="css-health-insights">
                    <div class="css-insight-item" [class.insight-positive]="getHealthScore() > 70">
                        <mat-icon>{{ getHealthScore() > 70 ? 'check_circle' : 'info' }}</mat-icon>
                        <span>{{ getHealthInsight() }}</span>
                    </div>
                </div>
            </mat-card>
        </div>

        <!-- ── DAILY TREND TIMELINE ──────────────────────────────── -->
        @if (stats()!.dailyTrend.length > 0) {
            <mat-card class="css-premium-card css-trend-card" @slideInUp>
                <div class="css-card-header">
                    <div class="css-card-icon">
                        <mat-icon>trending_up</mat-icon>
                    </div>
                    <h3 class="css-card-title">Sentiment Trend Timeline</h3>
                    <span class="css-card-subtitle">Last 30 Days</span>
                </div>
                <div class="css-trend-grid">
                    @for (day of stats()!.dailyTrend; track day.date; let i = $index) {
                        <div class="css-trend-item" [style.animation-delay]="(i * 30) + 'ms'">
                            <div class="css-trend-date">{{ formatDate(day.date) }}</div>
                            <div class="css-trend-bars">
                                @if ((day.positive + day.neutral + day.negative) > 0) {
                                    <div class="css-trend-bar-container">
                                        @if (day.positive > 0) {
                                            <div class="css-trend-bar css-bar-positive"
                                                 [style.height.%]="(day.positive / getTrendMax()) * 100"
                                                 [matTooltip]="day.positive + ' Positive'"></div>
                                        }
                                        @if (day.neutral > 0) {
                                            <div class="css-trend-bar css-bar-neutral"
                                                 [style.height.%]="(day.neutral / getTrendMax()) * 100"
                                                 [matTooltip]="day.neutral + ' Neutral'"></div>
                                        }
                                        @if (day.negative > 0) {
                                            <div class="css-trend-bar css-bar-negative"
                                                 [style.height.%]="(day.negative / getTrendMax()) * 100"
                                                 [matTooltip]="day.negative + ' Negative'"></div>
                                        }
                                    </div>
                                }
                            </div>
                            <div class="css-trend-total">{{ day.positive + day.neutral + day.negative }}</div>
                        </div>
                    }
                </div>
            </mat-card>
        }

        <!-- ── CHANNEL ANALYTICS ─────────────────────────────────── -->
        @if (stats()!.roomBreakdown.length > 0) {
            <mat-card class="css-premium-card css-rooms-card" @slideInUp>
                <div class="css-card-header">
                    <div class="css-card-icon">
                        <mat-icon>forum</mat-icon>
                    </div>
                    <h3 class="css-card-title">Channel Sentiment Breakdown</h3>
                </div>
                <div class="css-rooms-list">
                    @for (room of stats()!.roomBreakdown; track room.roomId; let i = $index) {
                        <div class="css-room-card" [style.animation-delay]="(i * 50) + 'ms'">
                            <div class="css-room-header">
                                <div class="css-room-name-icon">
                                    <mat-icon class="css-room-icon-badge">forum</mat-icon>
                                    <span class="css-room-name">{{ room.roomName }}</span>
                                </div>
                                <div class="css-room-meta">
                                    <span class="css-room-count">{{ room.total }} messages</span>
                                </div>
                            </div>
                            <div class="css-room-content">
                                <div class="css-room-stats">
                                    <div class="css-room-stat css-stat-positive">
                                        <span class="css-stat-icon">😊</span>
                                        <span class="css-stat-number">{{ room.positive }}</span>
                                        <span class="css-stat-label">Positive</span>
                                    </div>
                                    <div class="css-room-stat css-stat-neutral">
                                        <span class="css-stat-icon">😐</span>
                                        <span class="css-stat-number">{{ room.neutral }}</span>
                                        <span class="css-stat-label">Neutral</span>
                                    </div>
                                    <div class="css-room-stat css-stat-negative">
                                        <span class="css-stat-icon">😞</span>
                                        <span class="css-stat-number">{{ room.negative }}</span>
                                        <span class="css-stat-label">Negative</span>
                                    </div>
                                </div>
                                <div class="css-room-bar-animated">
                                    @if (room.positive > 0) {
                                        <div class="css-bar-segment css-seg-positive-gradient" [style.flex]="room.positive" [matTooltip]="room.positive + ' Positive'"></div>
                                    }
                                    @if (room.neutral > 0) {
                                        <div class="css-bar-segment css-seg-neutral-gradient" [style.flex]="room.neutral" [matTooltip]="room.neutral + ' Neutral'"></div>
                                    }
                                    @if (room.negative > 0) {
                                        <div class="css-bar-segment css-seg-negative-gradient" [style.flex]="room.negative" [matTooltip]="room.negative + ' Negative'"></div>
                                    }
                                </div>
                            </div>
                        </div>
                    }
                </div>
            </mat-card>
        }

        <!-- ── SENTIMENT INSIGHTS ────────────────────────────────── -->
        @if (stats()!.topFlaggedUsers.length > 0) {
            <mat-card class="css-premium-card css-insights-card" @slideInUp>
                <div class="css-card-header">
                    <div class="css-card-icon">
                        <mat-icon>insights</mat-icon>
                    </div>
                    <h3 class="css-card-title">Conversation Insights</h3>
                    <span class="css-card-subtitle">Monitor & Support Recommendations</span>
                </div>
                <div class="css-insights-warning">
                    <mat-icon>info</mat-icon>
                    <p>Users with higher negative sentiment may benefit from additional support or mentoring.</p>
                </div>
                <div class="css-flagged-leaderboard">
                    @for (u of stats()!.topFlaggedUsers; track u.userName; let i = $index) {
                        <div class="css-flagged-item" [class.css-top-3]="i < 3" [style.animation-delay]="(i * 40) + 'ms'">
                            <div class="css-flagged-rank-badge" [class]="'css-rank-' + (i < 3 ? 'top' : 'other')">
                                {{ i + 1 }}
                                @if (i === 0) {
                                    <mat-icon class="css-rank-icon">star</mat-icon>
                                }
                            </div>
                            <div class="css-flagged-user-info">
                                <div class="css-user-avatar">{{ u.userName.charAt(0).toUpperCase() }}</div>
                                <div class="css-user-details">
                                    <span class="css-user-name">{{ u.userName }}</span>
                                    <span class="css-user-status">{{ u.negativeCount }} negative messages</span>
                                </div>
                            </div>
                            <div class="css-flagged-indicator">
                                <div class="css-sentiment-bar">
                                    <div class="css-sentiment-fill" [style.width.%]="(u.negativeCount / getMaxNegativeCount()) * 100"></div>
                                </div>
                                <span class="css-indicator-text">{{ (u.negativeCount / getMaxNegativeCount()) * 100 | number:'1.0-0' }}%</span>
                            </div>
                        </div>
                    }
                </div>
            </mat-card>
        }

        @if (stats()!.total === 0) {
            <mat-card class="css-empty-card">
                <div class="css-empty-content">
                    <mat-icon class="css-empty-icon">sentiment_dissatisfied</mat-icon>
                    <h3>No Data Yet</h3>
                    <p>Send some messages with the sentiment service running to populate this dashboard.</p>
                </div>
            </mat-card>
        }

    </div><!-- /container-fluid -->
}
    `,
    styles: [`
:host { display: block; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); min-height: 100vh; }

/* ═══════════════════════════════════════════════════════════════ */
/* ANIMATED BACKGROUND & LOADING */
/* ═══════════════════════════════════════════════════════════════ */
.css-bg-blur {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: radial-gradient(circle at 20% 50%, rgba(99, 102, 241, 0.1) 0%, transparent 50%),
                radial-gradient(circle at 80% 80%, rgba(168, 85, 247, 0.1) 0%, transparent 50%);
    pointer-events: none; z-index: -1;
}

.css-loading-container {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 20px; padding: 100px 20px; min-height: 60vh;
}
.css-loader-pulse {
    animation: pulse-scale 2s ease-in-out infinite;
}
.css-loading-text {
    font-size: 1.2rem; font-weight: 600; color: #2c3e50;
    animation: fadeIn 0.6s ease;
}
.css-loading-subtext {
    font-size: 0.95rem; color: #7f8c8d;
    animation: fadeIn 0.8s ease 0.2s both;
}

@keyframes pulse-scale {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.08); opacity: 0.8; }
}

/* ═══════════════════════════════════════════════════════════════ */
/* HEADER - GLASS MORPHISM */
/* ═══════════════════════════════════════════════════════════════ */
.css-header-glass {
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 16px;
    padding: 20px 24px;
    margin-bottom: 24px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
    animation: slideInDown 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.css-header-content {
    display: flex; align-items: center; justify-content: space-between;
    flex-wrap: wrap; gap: 16px;
}

.css-header-left {
    display: flex; align-items: center; gap: 16px;
}

.css-header-icon-wrap {
    position: relative;
    width: 56px; height: 56px;
    border-radius: 14px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
}

.css-icon-glow {
    position: absolute; inset: -4px; border-radius: 14px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    opacity: 0.3; filter: blur(8px); z-index: -1;
}

.css-header-icon-wrap mat-icon {
    color: #fff; font-size: 28px;
    animation: pulse 3s ease-in-out infinite;
}

.css-header-text {
    display: flex; flex-direction: column; gap: 4px;
}

.css-header-title {
    font-size: 1.5rem; font-weight: 700; margin: 0;
    background: linear-gradient(135deg, #667eea, #764ba2);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

.css-header-subtitle {
    font-size: 0.9rem; color: #7f8c8d; margin: 0;
}

.css-header-actions {
    display: flex; gap: 8px; align-items: center;
}

.css-refresh-btn {
    transition: all 0.3s ease;
}

.css-back-btn {
    border-radius: 10px; font-weight: 600; transition: all 0.3s ease;
}

/* ═══════════════════════════════════════════════════════════════ */
/* KPI CARDS - PREMIUM DESIGN */
/* ═══════════════════════════════════════════════════════════════ */
.css-dashboard-body {
    padding-bottom: 48px;
}

.css-kpi-section {
    display: grid; grid-template-columns: repeat(4, 1fr);
    gap: 16px; margin-bottom: 28px;
}

@media (max-width: 1200px) {
    .css-kpi-section { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 600px) {
    .css-kpi-section { grid-template-columns: 1fr; }
}

.css-kpi-card {
    background: white;
    border-radius: 16px;
    padding: 24px 20px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
    border: 1px solid rgba(0, 0, 0, 0.05);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative; overflow: hidden;
}

.css-kpi-card::before {
    content: ''; position: absolute; inset: 0;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.5) 0%, transparent 100%);
    pointer-events: none;
}

.css-kpi-card:hover {
    transform: translateY(-6px);
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.15);
    border-color: rgba(0, 0, 0, 0.1);
}

.css-kpi-header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 14px;
}

.css-kpi-icon-wrap {
    width: 42px; height: 42px;
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
}

.css-icon-positive { background: rgba(76, 175, 80, 0.15); }
.css-icon-positive mat-icon { color: #4CAF50; }

.css-icon-neutral { background: rgba(33, 150, 243, 0.15); }
.css-icon-neutral mat-icon { color: #2196F3; }

.css-icon-negative { background: rgba(255, 107, 107, 0.15); }
.css-icon-negative mat-icon { color: #FF6B6B; }

.css-icon-total { background: rgba(156, 39, 176, 0.15); }
.css-icon-total mat-icon { color: #9C27B0; }

.css-kpi-badge {
    font-size: 0.7rem; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.05em;
    color: #7f8c8d; opacity: 0.8;
}

.css-kpi-value {
    font-size: 2.2rem; font-weight: 800; line-height: 1;
    margin-bottom: 6px; color: #2c3e50;
}

.css-kpi-percentage {
    font-size: 1rem; font-weight: 700; margin-bottom: 10px;
}

.css-kpi-subtitle {
    font-size: 0.8rem; color: #95a5a6; margin-bottom: 8px;
}

.css-kpi-health {
    font-size: 0.85rem; font-weight: 600;
    color: #27ae60; background: rgba(39, 174, 96, 0.1);
    padding: 4px 8px; border-radius: 6px; display: inline-block;
}

.css-kpi-bar {
    width: 100%; height: 6px;
    background: rgba(0, 0, 0, 0.05); border-radius: 3px;
    overflow: hidden;
}

.css-kpi-bar-fill {
    height: 100%; border-radius: 3px;
    animation: slideInLeft 1.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* ═════════════════════════════════════════════════════════════ */
/* GRID & PREMIUM CARDS */
/* ═════════════════════════════════════════════════════════════ */
.css-grid-2col {
    display: grid; grid-template-columns: repeat(2, 1fr);
    gap: 20px; margin-bottom: 24px;
}

@media (max-width: 1000px) {
    .css-grid-2col { grid-template-columns: 1fr; }
}

.css-premium-card {
    background: white;
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
    border: 1px solid rgba(0, 0, 0, 0.05);
    transition: all 0.4s ease;
}

.css-premium-card:hover {
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
    transform: translateY(-4px);
}

.css-card-header {
    display: flex; align-items: center; gap: 12px; margin-bottom: 20px;
}

.css-card-icon {
    width: 40px; height: 40px;
    border-radius: 10px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex; align-items: center; justify-content: center;
}

.css-card-icon mat-icon { color: white; font-size: 20px; }

.css-card-title {
    font-size: 1.1rem; font-weight: 700; margin: 0;
    color: #2c3e50;
}

.css-card-subtitle {
    font-size: 0.75rem; color: #95a5a6;
    margin-left: auto; text-transform: uppercase; letter-spacing: 0.05em;
}

/* ═════════════════════════════════════════════════════════════ */
/* DISTRIBUTION & LEGEND */
/* ═════════════════════════════════════════════════════════════ */
.css-dist-bar-container {
    padding: 8px 0;
}

.css-dist-bar-animated {
    display: flex; height: 32px;
    border-radius: 8px; overflow: hidden;
    gap: 2px; margin-bottom: 16px;
}

.css-dist-segment {
    display: flex; align-items: center; justify-content: center;
    font-size: 0.75rem; font-weight: 700; color: white;
    transition: all 0.4s ease;
    position: relative;
}

.css-seg-positive-gradient {
    background: linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%);
}

.css-seg-neutral-gradient {
    background: linear-gradient(135deg, #2196F3 0%, #64B5F6 100%);
}

.css-seg-negative-gradient {
    background: linear-gradient(135deg, #FF6B6B 0%, #FF8787 100%);
}

.css-segment-label {
    font-weight: 700; opacity: 0.9;
}

.css-hover-lift:hover {
    transform: scaleY(1.3);
}

.css-legend-enhanced {
    display: grid; grid-template-columns: repeat(3, 1fr);
    gap: 12px;
}

@media (max-width: 600px) {
    .css-legend-enhanced { grid-template-columns: 1fr; }
}

.css-legend-item {
    display: flex; flex-direction: column; gap: 6px;
    padding: 12px; border-radius: 10px;
    background: rgba(0, 0, 0, 0.02);
    border: 1px solid rgba(0, 0, 0, 0.05);
    align-items: center; text-align: center;
}

.css-legend-indicator {
    width: 14px; height: 14px;
    border-radius: 50%;
}

.css-positive { background: #4CAF50; }
.css-neutral { background: #2196F3; }
.css-negative { background: #FF6B6B; }

.css-legend-text {
    font-size: 0.9rem; font-weight: 600; color: #2c3e50;
}

.css-legend-count {
    font-size: 0.75rem; color: #95a5a6;
}

/* ═════════════════════════════════════════════════════════════ */
/* HEALTH GAUGE */
/* ═════════════════════════════════════════════════════════════ */
.css-health-gauge {
    display: flex; justify-content: center; margin: 24px 0;
}

.css-gauge-circle {
    width: 160px; height: 160px;
    border-radius: 50%;
    background: conic-gradient(
        from 0deg,
        #4CAF50 0deg,
        #FFC107 calc(var(--health-value) * 3.6deg),
        rgba(0, 0, 0, 0.08) calc(var(--health-value) * 3.6deg)
    );
    display: flex; align-items: center; justify-content: center;
    box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.1);
}

.css-gauge-content {
    width: 142px; height: 142px;
    border-radius: 50%;
    background: white;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 4px;
}

.css-gauge-value {
    font-size: 2rem; font-weight: 800;
    background: linear-gradient(135deg, #667eea, #764ba2);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.css-gauge-label {
    font-size: 0.8rem; color: #95a5a6;
    text-transform: uppercase; letter-spacing: 0.05em;
}

.css-health-insights {
    margin-top: 16px;
}

.css-insight-item {
    display: flex; align-items: center; gap: 8px;
    font-size: 0.9rem; color: #2c3e50;
    padding: 10px 12px; border-radius: 8px;
    background: rgba(0, 0, 0, 0.02);
    border-left: 3px solid #2196F3;
}

.css-insight-item.insight-positive {
    border-left-color: #4CAF50;
    background: rgba(76, 175, 80, 0.05);
    color: #27ae60;
}

.css-insight-item mat-icon {
    font-size: 18px;
}

/* ═════════════════════════════════════════════════════════════ */
/* TREND TIMELINE */
/* ═════════════════════════════════════════════════════════════ */
.css-trend-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(65px, 1fr));
    gap: 8px; min-height: 220px;
}

.css-trend-item {
    display: flex; flex-direction: column; align-items: center; gap: 8px;
    padding: 12px 8px;
    border-radius: 10px;
    background: rgba(0, 0, 0, 0.02);
    transition: all 0.3s ease;
    animation: slideInUp 0.6s ease both;
}

.css-trend-item:hover {
    background: rgba(102, 126, 234, 0.1);
    transform: translateY(-4px);
}

.css-trend-date {
    font-size: 0.7rem; color: #95a5a6;
    font-weight: 600; text-transform: uppercase;
}

.css-trend-bars {
    flex: 1; width: 100%;
    display: flex; align-items: flex-end; justify-content: center; gap: 3px;
    height: 80px;
}

.css-trend-bar-container {
    display: flex; align-items: flex-end; gap: 2px; height: 100%;
}

.css-trend-bar {
    width: 8px; border-radius: 2px;
    transition: all 0.3s ease;
}

.css-bar-positive { background: linear-gradient(180deg, #4CAF50, #66BB6A); }
.css-bar-neutral { background: linear-gradient(180deg, #2196F3, #64B5F6); }
.css-bar-negative { background: linear-gradient(180deg, #FF6B6B, #FF8787); }

.css-trend-bar:hover { transform: scaleY(1.2); }

.css-trend-total {
    font-size: 0.75rem; font-weight: 700; color: #2c3e50;
}

/* ═════════════════════════════════════════════════════════════ */
/* ROOMS/CHANNELS */
/* ═════════════════════════════════════════════════════════════ */
.css-rooms-list {
    display: flex; flex-direction: column; gap: 12px;
}

.css-room-card {
    border-radius: 12px; padding: 16px;
    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 0.1);
    border: 1px solid rgba(0, 0, 0, 0.05);
    transition: all 0.3s ease;
    animation: slideInUp 0.6s ease both;
}

.css-room-card:hover {
    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 0.15);
    transform: translateX(4px);
}

.css-room-header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 12px;
}

.css-room-name-icon {
    display: flex; align-items: center; gap: 8px;
    font-weight: 700; color: #2c3e50;
}

.css-room-icon-badge {
    color: #667eea; font-size: 20px;
}

.css-room-meta {
    font-size: 0.8rem; color: #95a5a6;
}

.css-room-content {
    display: flex; flex-direction: column; gap: 12px;
}

.css-room-stats {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;
}

.css-room-stat {
    display: flex; flex-direction: column; align-items: center; gap: 4px;
    padding: 8px; border-radius: 8px;
}

.css-stat-positive { background: rgba(76, 175, 80, 0.1); }
.css-stat-neutral { background: rgba(33, 150, 243, 0.1); }
.css-stat-negative { background: rgba(255, 107, 107, 0.1); }

.css-stat-icon { font-size: 1.5rem; }
.css-stat-number { font-weight: 700; font-size: 0.95rem; }
.css-stat-label { font-size: 0.7rem; color: #95a5a6; }

.css-room-bar-animated {
    display: flex; height: 8px;
    border-radius: 4px; overflow: hidden; gap: 1px;
}

.css-bar-segment {
    border-radius: 0; transition: all 0.3s ease;
}

.css-bar-segment:hover { filter: brightness(1.15); }

/* ═════════════════════════════════════════════════════════════ */
/* INSIGHTS & FLAGGED */
/* ═════════════════════════════════════════════════════════════ */
.css-insights-warning {
    display: flex; align-items: flex-start; gap: 10px;
    padding: 12px 14px; border-radius: 10px;
    background: rgba(33, 150, 243, 0.08);
    border-left: 3px solid #2196F3;
    margin-bottom: 16px;
}

.css-insights-warning mat-icon {
    color: #2196F3; flex-shrink: 0; margin-top: 2px;
}

.css-insights-warning p {
    margin: 0; font-size: 0.9rem; color: #34495e;
}

.css-flagged-leaderboard {
    display: flex; flex-direction: column; gap: 10px;
}

.css-flagged-item {
    display: flex; align-items: center; gap: 12px;
    padding: 14px;
    border-radius: 10px;
    background: rgba(0, 0, 0, 0.02);
    border: 1px solid rgba(0, 0, 0, 0.05);
    transition: all 0.3s ease;
    animation: slideInLeft 0.6s ease both;
}

.css-flagged-item:hover {
    background: rgba(102, 126, 234, 0.08);
    transform: translateX(4px);
}

.css-flagged-item.css-top-3 {
    background: linear-gradient(135deg, #fff9c4 0%, #ffecb3 100%);
    border-color: #ffd54f;
}

.css-flagged-rank-badge {
    width: 32px; height: 32px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 0.9rem;
    background: #667eea; color: white;
    flex-shrink: 0; position: relative;
}

.css-rank-top { background: linear-gradient(135deg, #FFD700, #FFC700); color: #856404; }
.css-rank-other { background: #bbb; color: white; }

.css-rank-icon {
    position: absolute; font-size: 14px;
}

.css-flagged-user-info {
    display: flex; align-items: center; gap: 10px; flex: 1;
}

.css-user-avatar {
    width: 36px; height: 36px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
}

.css-user-details {
    display: flex; flex-direction: column; gap: 2px;
}

.css-user-name {
    font-weight: 600; color: #2c3e50; font-size: 0.95rem;
}

.css-user-status {
    font-size: 0.8rem; color: #95a5a6;
}

.css-flagged-indicator {
    display: flex; align-items: center; gap: 8px; min-width: 120px;
}

.css-sentiment-bar {
    flex: 1; height: 6px;
    background: rgba(0, 0, 0, 0.1); border-radius: 3px; overflow: hidden;
}

.css-sentiment-fill {
    height: 100%; background: linear-gradient(90deg, #FF6B6B, #FF8787);
    border-radius: 3px; animation: slideInLeft 0.8s ease;
}

.css-indicator-text {
    font-size: 0.8rem; font-weight: 700; color: #FF6B6B;
    min-width: 35px; text-align: right;
}

/* ═════════════════════════════════════════════════════════════ */
/* EMPTY STATE */
/* ═════════════════════════════════════════════════════════════ */
.css-empty-card {
    display: flex; justify-content: center; padding: 60px 20px;
    border-radius: 16px; background: rgba(0, 0, 0, 0.02);
    border: 2px dashed rgba(0, 0, 0, 0.1);
}

.css-empty-content {
    display: flex; flex-direction: column; align-items: center; gap: 12px;
    text-align: center; color: #95a5a6;
}

.css-empty-icon {
    font-size: 56px; opacity: 0.5;
}

/* ═════════════════════════════════════════════════════════════ */
/* ERROR STATE */
/* ═════════════════════════════════════════════════════════════ */
.css-error-container {
    display: flex; flex-direction: column; align-items: center; gap: 16px;
    padding: 48px 20px;
    border-radius: 16px;
    background: rgba(255, 107, 107, 0.08);
    border: 2px solid rgba(255, 107, 107, 0.2);
}

.css-error-icon {
    width: 64px; height: 64px;
    border-radius: 50%;
    background: rgba(255, 107, 107, 0.2);
    display: flex; align-items: center; justify-content: center;
}

.css-error-icon mat-icon {
    color: #FF6B6B; font-size: 32px;
}

.css-error-title {
    font-size: 1.3rem; font-weight: 700; color: #2c3e50; margin: 0;
}

.css-error-message {
    font-size: 0.95rem; color: #34495e; margin: 0;
}

.css-retry-btn {
    border-radius: 8px; font-weight: 600;
    animation: slideInUp 0.6s ease;
}

/* ═════════════════════════════════════════════════════════════ */
/* GLOBAL ANIMATIONS */
/* ═════════════════════════════════════════════════════════════ */
@keyframes slideInDown {
    from { opacity: 0; transform: translateY(-16px); }
    to { opacity: 1; transform: translateY(0); }
}

@keyframes slideInUp {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
}

@keyframes slideInLeft {
    from { opacity: 0; transform: translateX(-12px); }
    to { opacity: 1; transform: translateX(0); }
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.8; transform: scale(1.05); }
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

/* Mobile optimizations */
@media (max-width: 768px) {
    .css-header-content { flex-direction: column; }
    .css-header-actions { width: 100%; justify-content: space-between; }
    .css-trend-grid { grid-template-columns: repeat(auto-fill, minmax(55px, 1fr)); }
    .css-room-stats { grid-template-columns: 1fr; }
}
    `],
})
export class ChatSentimentStatsComponent implements OnInit, OnDestroy {

    readonly loading = signal(true);
    readonly error   = signal<string | null>(null);
    readonly stats   = signal<SentimentStats | null>(null);

    readonly positivePercent = computed(() => {
        const s = this.stats();
        if (!s || s.total === 0) return 0;
        return (s.distribution.POSITIVE / s.total) * 100;
    });

    readonly neutralPercent = computed(() => {
        const s = this.stats();
        if (!s || s.total === 0) return 0;
        return (s.distribution.NEUTRAL / s.total) * 100;
    });

    readonly negativePercent = computed(() => {
        const s = this.stats();
        if (!s || s.total === 0) return 0;
        return (s.distribution.NEGATIVE / s.total) * 100;
    });

    private subs = new Subscription();

    constructor(
        private chatMessageService: ChatMessageService,
        private router: Router,
    ) {}

    ngOnInit(): void {
        this.load();
    }

    ngOnDestroy(): void {
        this.subs.unsubscribe();
    }

    load(): void {
        this.loading.set(true);
        this.error.set(null);
        this.subs.add(
            this.chatMessageService.getSentimentStats().subscribe({
                next: (data) => {
                    this.stats.set(data);
                    this.loading.set(false);
                },
                error: (err) => {
                    this.error.set(err?.error?.message ?? 'Failed to load sentiment stats. Make sure you are a Manager or Tutor.');
                    this.loading.set(false);
                },
            })
        );
    }

    goBack(): void {
        this.router.navigate(['/app/chat']);
    }

    getHealthScore(): number {
        const s = this.stats();
        if (!s || s.total === 0) return 0;
        const positive = s.distribution.POSITIVE;
        const negative = s.distribution.NEGATIVE;
        const total = s.total;
        const score = (positive / total) * 100 - (negative / total) * 10;
        return Math.min(100, Math.max(0, score));
    }

    getHealthStatus(): string {
        const score = this.getHealthScore();
        if (score >= 75) return 'Excellent';
        if (score >= 50) return 'Good';
        if (score >= 25) return 'Fair';
        return 'Needs Attention';
    }

    getHealthInsight(): string {
        const score = this.getHealthScore();
        if (score >= 75) return 'Conversation sentiment is very positive. Keep up the great communication!';
        if (score >= 50) return 'Overall positive sentiment. Consider addressing a few negative messages.';
        if (score >= 25) return 'Mixed sentiment detected. Encourage supportive interactions.';
        return 'Sentiment needs improvement. Consider team support initiatives.';
    }

    formatDate(dateStr: string): string {
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } catch {
            return dateStr.slice(5, 10);
        }
    }

    getTrendMax(): number {
        const s = this.stats();
        if (!s || s.dailyTrend.length === 0) return 1;
        return Math.max(
            ...s.dailyTrend.map(d => d.positive + d.neutral + d.negative)
        );
    }

    getMaxNegativeCount(): number {
        const s = this.stats();
        if (!s || s.topFlaggedUsers.length === 0) return 1;
        return Math.max(...s.topFlaggedUsers.map(u => u.negativeCount));
    }
}
