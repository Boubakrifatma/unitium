import {
    Component, OnInit, OnDestroy,
    signal, computed,
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
import { Subscription } from 'rxjs';
import { ChatMessageService, SentimentStats } from './chat-message.service';
import { PageRightComponent } from '../../../../components/page-right/pageright.component';

/* ═══════════════════════════════════════════════════════════════════════════
   Chat Sentiment Stats Page (Manager / Tutor)
   Route: /app/chat/sentiment-stats
   ═══════════════════════════════════════════════════════════════════════════ */
@Component({
    selector: 'app-chat-sentiment-stats',
    standalone: true,
    imports: [
        CommonModule, FormsModule, DecimalPipe,
        MatCardModule, MatIconModule, MatButtonModule,
        MatProgressBarModule, MatProgressSpinnerModule,
        MatTooltipModule, MatChipsModule, MatDividerModule,
        MatTableModule, MatTabsModule, MatBadgeModule, MatSelectModule,
        PageRightComponent,
    ],
    template: `
<!-- ══ HEADER ══════════════════════════════════════════════════════════ -->
<div class="container-fluid fade-in mb-3 mb-lg-4">
    <mat-card class="css-header-card shadow-none">
        <div class="css-header-inner">
            <div class="css-header-left">
                <div class="css-header-icon-wrap">
                    <mat-icon>sentiment_very_dissatisfied</mat-icon>
                </div>
                <div>
                    <h3 class="css-header-title">Message Sentiment Analytics</h3>
                    <p class="css-header-sub">AI-powered mood analysis of all chat messages</p>
                </div>
            </div>
            <div class="css-header-right">
                <button mat-icon-button (click)="load()" [disabled]="loading()" matTooltip="Refresh">
                    <mat-icon [class.css-spin]="loading()">refresh</mat-icon>
                </button>
                <button mat-stroked-button class="css-back-btn" (click)="goBack()">
                    <mat-icon style="font-size:16px;width:16px;height:16px">arrow_back</mat-icon>
                    Back to Chat
                </button>
                <app-page-right></app-page-right>
            </div>
        </div>
    </mat-card>
</div>

@if (loading()) {
    <div class="css-center-spin">
        <mat-spinner diameter="48"></mat-spinner>
        <p class="css-loading-txt">Loading sentiment data…</p>
    </div>
} @else if (error()) {
    <div class="css-error-card container-fluid">
        <mat-icon>error_outline</mat-icon>
        <p>{{ error() }}</p>
        <button mat-flat-button color="primary" (click)="load()">Retry</button>
    </div>
} @else if (stats()) {
    <div class="container-fluid css-body">

        <!-- ── KPI strip ─────────────────────────────────────────────── -->
        <div class="css-kpi-row">
            <mat-card class="css-kpi-card css-kpi-positive">
                <mat-icon>sentiment_very_satisfied</mat-icon>
                <div class="css-kpi-num">{{ stats()!.distribution.POSITIVE | number }}</div>
                <div class="css-kpi-lbl">Positive</div>
                <div class="css-kpi-pct">{{ positivePercent() | number:'1.1-1' }}%</div>
            </mat-card>
            <mat-card class="css-kpi-card css-kpi-neutral">
                <mat-icon>sentiment_neutral</mat-icon>
                <div class="css-kpi-num">{{ stats()!.distribution.NEUTRAL | number }}</div>
                <div class="css-kpi-lbl">Neutral</div>
                <div class="css-kpi-pct">{{ neutralPercent() | number:'1.1-1' }}%</div>
            </mat-card>
            <mat-card class="css-kpi-card css-kpi-negative">
                <mat-icon>sentiment_very_dissatisfied</mat-icon>
                <div class="css-kpi-num">{{ stats()!.distribution.NEGATIVE | number }}</div>
                <div class="css-kpi-lbl">Negative</div>
                <div class="css-kpi-pct">{{ negativePercent() | number:'1.1-1' }}%</div>
            </mat-card>
            <mat-card class="css-kpi-card css-kpi-total">
                <mat-icon>chat_bubble_outline</mat-icon>
                <div class="css-kpi-num">{{ stats()!.total | number }}</div>
                <div class="css-kpi-lbl">Total analysed</div>
                <div class="css-kpi-pct">&nbsp;</div>
            </mat-card>
        </div>

        <!-- ── Overall distribution bar ──────────────────────────────── -->
        <mat-card class="css-section-card">
            <div class="css-section-title">
                <mat-icon>donut_small</mat-icon> Overall Distribution
            </div>
            <div class="css-dist-bar-wrap">
                <div class="css-dist-bar">
                    @if (positivePercent() > 0) {
                        <div class="css-dist-seg css-seg-positive"
                             [style.width.%]="positivePercent()"
                             [matTooltip]="'Positive: ' + (positivePercent() | number:'1.1-1') + '%'">
                            {{ positivePercent() | number:'1.0-0' }}%
                        </div>
                    }
                    @if (neutralPercent() > 0) {
                        <div class="css-dist-seg css-seg-neutral"
                             [style.width.%]="neutralPercent()"
                             [matTooltip]="'Neutral: ' + (neutralPercent() | number:'1.1-1') + '%'">
                            {{ neutralPercent() | number:'1.0-0' }}%
                        </div>
                    }
                    @if (negativePercent() > 0) {
                        <div class="css-dist-seg css-seg-negative"
                             [style.width.%]="negativePercent()"
                             [matTooltip]="'Negative: ' + (negativePercent() | number:'1.1-1') + '%'">
                            {{ negativePercent() | number:'1.0-0' }}%
                        </div>
                    }
                </div>
                <div class="css-dist-legend">
                    <span class="css-legend-dot css-dot-positive"></span> Positive
                    <span class="css-legend-dot css-dot-neutral"></span> Neutral
                    <span class="css-legend-dot css-dot-negative"></span> Negative
                </div>
            </div>
        </mat-card>

        <!-- ── Daily trend ────────────────────────────────────────────── -->
        @if (stats()!.dailyTrend.length > 0) {
            <mat-card class="css-section-card">
                <div class="css-section-title">
                    <mat-icon>show_chart</mat-icon> Daily Sentiment Trend (Last 30 Days)
                </div>
                <div class="css-trend-table-wrap">
                    <table class="css-trend-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th class="css-col-pos">Positive</th>
                                <th class="css-col-neu">Neutral</th>
                                <th class="css-col-neg">Negative</th>
                                <th>Breakdown</th>
                            </tr>
                        </thead>
                        <tbody>
                            @for (day of stats()!.dailyTrend; track day.date) {
                                <tr>
                                    <td class="css-date-cell">{{ day.date }}</td>
                                    <td class="css-col-pos">{{ day.positive }}</td>
                                    <td class="css-col-neu">{{ day.neutral }}</td>
                                    <td class="css-col-neg">{{ day.negative }}</td>
                                    <td class="css-bar-cell">
                                        @if ((day.positive + day.neutral + day.negative) > 0) {
                                            <div class="css-mini-bar">
                                                @if (day.positive > 0) {
                                                    <div class="css-mini-seg css-seg-positive"
                                                         [style.flex]="day.positive"
                                                         [matTooltip]="'Positive: ' + day.positive"></div>
                                                }
                                                @if (day.neutral > 0) {
                                                    <div class="css-mini-seg css-seg-neutral"
                                                         [style.flex]="day.neutral"
                                                         [matTooltip]="'Neutral: ' + day.neutral"></div>
                                                }
                                                @if (day.negative > 0) {
                                                    <div class="css-mini-seg css-seg-negative"
                                                         [style.flex]="day.negative"
                                                         [matTooltip]="'Negative: ' + day.negative"></div>
                                                }
                                            </div>
                                        }
                                    </td>
                                </tr>
                            }
                        </tbody>
                    </table>
                </div>
            </mat-card>
        }

        <!-- ── Room breakdown ─────────────────────────────────────────── -->
        @if (stats()!.roomBreakdown.length > 0) {
            <mat-card class="css-section-card">
                <div class="css-section-title">
                    <mat-icon>forum</mat-icon> Per-Room Breakdown
                </div>
                <div class="css-room-list">
                    @for (room of stats()!.roomBreakdown; track room.roomId) {
                        <div class="css-room-row">
                            <div class="css-room-name">
                                <mat-icon class="css-room-icon">tag</mat-icon>
                                {{ room.roomName }}
                            </div>
                            <div class="css-room-chips">
                                <span class="css-chip css-chip-pos" matTooltip="Positive">
                                    <mat-icon>sentiment_satisfied</mat-icon> {{ room.positive }}
                                </span>
                                <span class="css-chip css-chip-neu" matTooltip="Neutral">
                                    <mat-icon>sentiment_neutral</mat-icon> {{ room.neutral }}
                                </span>
                                <span class="css-chip css-chip-neg" matTooltip="Negative">
                                    <mat-icon>sentiment_dissatisfied</mat-icon> {{ room.negative }}
                                </span>
                            </div>
                            <div class="css-room-bar-wrap">
                                <div class="css-mini-bar">
                                    @if (room.positive > 0) {
                                        <div class="css-mini-seg css-seg-positive"
                                             [style.flex]="room.positive"
                                             [matTooltip]="'Positive: ' + room.positive"></div>
                                    }
                                    @if (room.neutral > 0) {
                                        <div class="css-mini-seg css-seg-neutral"
                                             [style.flex]="room.neutral"
                                             [matTooltip]="'Neutral: ' + room.neutral"></div>
                                    }
                                    @if (room.negative > 0) {
                                        <div class="css-mini-seg css-seg-negative"
                                             [style.flex]="room.negative"
                                             [matTooltip]="'Negative: ' + room.negative"></div>
                                    }
                                </div>
                            </div>
                            <div class="css-room-total">{{ room.total }} msg</div>
                        </div>
                    }
                </div>
            </mat-card>
        }

        <!-- ── Top flagged users ──────────────────────────────────────── -->
        @if (stats()!.topFlaggedUsers.length > 0) {
            <mat-card class="css-section-card">
                <div class="css-section-title">
                    <mat-icon>flag</mat-icon> Most Negative Messages — Top Users
                </div>
                <p class="css-section-hint">
                    Users with the highest number of messages flagged as negative by the AI model.
                    This does not constitute a violation — it is an analytical indicator only.
                </p>
                <div class="css-flagged-list">
                    @for (u of stats()!.topFlaggedUsers; track u.userName; let i = $index) {
                        <div class="css-flagged-row" [class.css-flagged-top]="i < 3">
                            <div class="css-flagged-rank">{{ i + 1 }}</div>
                            <div class="css-flagged-name">
                                <mat-icon class="css-avatar-icon">person</mat-icon>
                                {{ u.userName }}
                            </div>
                            <div class="css-flagged-count">
                                <mat-icon style="color:#e64a19;font-size:16px;vertical-align:middle">warning_amber</mat-icon>
                                {{ u.negativeCount }} negative
                            </div>
                        </div>
                    }
                </div>
            </mat-card>
        }

        @if (stats()!.total === 0) {
            <mat-card class="css-empty-card">
                <mat-icon>mood</mat-icon>
                <p>No analysed messages yet. Send some messages with the sentiment service running to populate this dashboard.</p>
            </mat-card>
        }

    </div><!-- /container-fluid -->
}
    `,
    styles: [`
:host { display: block; }
.fade-in { animation: fadeIn .4s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }

/* ── Header ── */
.css-header-card { border-radius: 12px; padding: 12px 16px; }
.css-header-inner { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.css-header-left { display: flex; align-items: center; gap: 14px; }
.css-header-icon-wrap {
    width: 46px; height: 46px; border-radius: 12px;
    background: linear-gradient(135deg, #e53935 0%, #e64a19 100%);
    display: flex; align-items: center; justify-content: center;
}
.css-header-icon-wrap mat-icon { color: #fff; font-size: 24px; }
.css-header-title { font-size: 1.1rem; font-weight: 700; margin: 0; }
.css-header-sub { font-size: 0.8rem; color: #888; margin: 2px 0 0; }
.css-header-right { display: flex; align-items: center; gap: 8px; }
.css-back-btn { border-radius: 20px; font-size: .8rem; }
.css-spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Loading / Error ── */
.css-center-spin { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; padding: 60px 0; }
.css-loading-txt { color: #888; font-size: .9rem; }
.css-error-card { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 48px; color: #c62828; }

/* ── Body ── */
.css-body { padding-bottom: 48px; }

/* ── KPI row ── */
.css-kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 18px; }
@media (max-width: 900px) { .css-kpi-row { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 500px) { .css-kpi-row { grid-template-columns: 1fr; } }
.css-kpi-card {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 20px 12px; border-radius: 14px; text-align: center; gap: 4px;
}
.css-kpi-card mat-icon { font-size: 30px; width: 30px; height: 30px; }
.css-kpi-num { font-size: 2rem; font-weight: 800; line-height: 1; }
.css-kpi-lbl { font-size: 0.75rem; text-transform: uppercase; letter-spacing: .07em; color: #555; }
.css-kpi-pct { font-size: 0.85rem; font-weight: 600; }
.css-kpi-positive { background: #e8f5e9; } .css-kpi-positive mat-icon { color: #2e7d32; } .css-kpi-positive .css-kpi-num { color: #1b5e20; } .css-kpi-positive .css-kpi-pct { color: #2e7d32; }
.css-kpi-neutral  { background: #e3f2fd; } .css-kpi-neutral  mat-icon { color: #1565c0; } .css-kpi-neutral  .css-kpi-num { color: #0d47a1; } .css-kpi-neutral  .css-kpi-pct { color: #1565c0; }
.css-kpi-negative { background: #fce4ec; } .css-kpi-negative mat-icon { color: #c62828; } .css-kpi-negative .css-kpi-num { color: #b71c1c; } .css-kpi-negative .css-kpi-pct { color: #c62828; }
.css-kpi-total    { background: #f3e5f5; } .css-kpi-total    mat-icon { color: #6a1b9a; } .css-kpi-total    .css-kpi-num { color: #4a148c; }

/* ── Section cards ── */
.css-section-card { border-radius: 14px; padding: 18px 20px; margin-bottom: 16px; }
.css-section-title { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: .95rem; margin-bottom: 14px; }
.css-section-title mat-icon { color: #555; font-size: 20px; }
.css-section-hint { font-size: .8rem; color: #888; margin: -8px 0 12px; }

/* ── Distribution bar ── */
.css-dist-bar-wrap { padding: 4px 0; }
.css-dist-bar { display: flex; height: 36px; border-radius: 8px; overflow: hidden; }
.css-dist-seg { display: flex; align-items: center; justify-content: center; font-size: .8rem; font-weight: 700; color: #fff; transition: flex .4s ease; min-width: 0; overflow: hidden; }
.css-seg-positive { background: #43a047; }
.css-seg-neutral  { background: #1e88e5; }
.css-seg-negative { background: #e53935; }
.css-dist-legend { display: flex; gap: 18px; margin-top: 10px; font-size: .8rem; color: #555; align-items: center; }
.css-legend-dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 4px; }
.css-dot-positive { background: #43a047; }
.css-dot-neutral  { background: #1e88e5; }
.css-dot-negative { background: #e53935; }

/* ── Trend table ── */
.css-trend-table-wrap { overflow-x: auto; }
.css-trend-table { width: 100%; border-collapse: collapse; font-size: .85rem; }
.css-trend-table th { text-align: left; padding: 6px 10px; border-bottom: 2px solid #eee; font-size: .75rem; text-transform: uppercase; color: #888; }
.css-trend-table td { padding: 6px 10px; border-bottom: 1px solid #f3f3f3; }
.css-date-cell { font-family: monospace; color: #333; }
.css-col-pos { color: #2e7d32; font-weight: 600; }
.css-col-neu { color: #1565c0; font-weight: 600; }
.css-col-neg { color: #c62828; font-weight: 600; }
.css-bar-cell { min-width: 120px; }

/* ── Mini bar ── */
.css-mini-bar { display: flex; height: 12px; border-radius: 6px; overflow: hidden; gap: 1px; }
.css-mini-seg { border-radius: 0; transition: flex .3s; }

/* ── Room list ── */
.css-room-list { display: flex; flex-direction: column; gap: 10px; }
.css-room-row { display: flex; align-items: center; gap: 12px; padding: 8px 4px; border-bottom: 1px solid #f5f5f5; }
.css-room-name { display: flex; align-items: center; gap: 6px; font-weight: 600; font-size: .9rem; min-width: 140px; }
.css-room-icon { font-size: 16px; color: #888; }
.css-room-chips { display: flex; gap: 8px; }
.css-chip { display: flex; align-items: center; gap: 3px; font-size: .78rem; font-weight: 600; padding: 2px 8px; border-radius: 12px; }
.css-chip mat-icon { font-size: 14px; width: 14px; height: 14px; }
.css-chip-pos { background: #e8f5e9; color: #2e7d32; }
.css-chip-neu { background: #e3f2fd; color: #1565c0; }
.css-chip-neg { background: #fce4ec; color: #c62828; }
.css-room-bar-wrap { flex: 1; min-width: 80px; }
.css-room-total { font-size: .78rem; color: #888; white-space: nowrap; }

/* ── Flagged users ── */
.css-flagged-list { display: flex; flex-direction: column; gap: 8px; }
.css-flagged-row { display: flex; align-items: center; gap: 12px; padding: 8px 12px; border-radius: 8px; background: #fafafa; }
.css-flagged-top { background: #fff3e0; }
.css-flagged-rank { font-size: 1.1rem; font-weight: 800; color: #ff6f00; min-width: 28px; text-align: center; }
.css-flagged-name { display: flex; align-items: center; gap: 6px; flex: 1; font-size: .9rem; font-weight: 500; }
.css-avatar-icon { font-size: 20px; color: #9e9e9e; }
.css-flagged-count { font-size: .85rem; color: #c62828; font-weight: 600; }

/* ── Empty ── */
.css-empty-card { display: flex; flex-direction: column; align-items: center; padding: 48px; gap: 12px; color: #aaa; border-radius: 14px; }
.css-empty-card mat-icon { font-size: 48px; width: 48px; height: 48px; }
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
}
