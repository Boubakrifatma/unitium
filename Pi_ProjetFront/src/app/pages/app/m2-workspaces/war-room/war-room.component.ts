import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin, catchError, of } from 'rxjs';
import { HeatmapDay, WarRoomEvent, WarRoomSnapshot } from './war-room.models';
import { WarRoomService } from './war-room.service';

interface IntelRec {
  level: 'danger' | 'warning' | 'success' | 'info';
  icon: string;
  title: string;
  detail: string;
}

@Component({
  selector: 'app-war-room',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    MatCardModule, MatIconModule, MatButtonModule,
    MatProgressSpinnerModule, MatTooltipModule,
  ],
  template: `
    <!-- ── HEADER ────────────────────────────────────────────────── -->
    <div class="container-fluid fade-in mb-3 mb-lg-4">
      <mat-card class="bg-light-theme shadow-none pt-3 pb-lg-3 px-3">
        <div class="row gx-3 align-items-center">
          <div class="col-12 col-md mb-3 mb-xl-0 py-1">
            <h3 class="mb-1">Workspace Pulse · {{ snapshot()?.workspaceName || workspaceName() }}</h3>
            <p class="small mb-0">
              <span routerLink="/app/dashboard" class="me-2 text-theme style-none">
                <mat-icon class="material-icons-outlined align-middle text-sm">house</mat-icon> Home
              </span>
              <mat-icon class="material-icons-outlined align-middle text-sm me-2">chevron_right</mat-icon>
              <span routerLink="/app/workspaces" class="me-2 text-theme style-none">Workspaces</span>
              <mat-icon class="material-icons-outlined align-middle text-sm me-2">chevron_right</mat-icon>
              <span [routerLink]="['/app/workspaces', workspaceId()]" class="me-2 text-theme style-none">
                {{ snapshot()?.workspaceName || workspaceName() }}
              </span>
              <mat-icon class="material-icons-outlined align-middle text-sm me-2">chevron_right</mat-icon>
              Workspace Pulse
            </p>
          </div>
          <div class="col-auto mb-3 mb-xl-0">
            <button matButton [routerLink]="['/app/workspaces', workspaceId()]">
              <mat-icon class="material-icons-outlined">arrow_back</mat-icon> Back
            </button>
          </div>
        </div>
      </mat-card>
    </div>

    <div class="container-fluid px-3 pb-5">
      @if (loading()) {
        <div class="d-flex flex-column align-items-center justify-content-center" style="min-height:320px;gap:16px">
          <mat-spinner diameter="44"></mat-spinner>
          <span style="font-size:13px;color:var(--text-color-secondary)">Loading workspace intelligence…</span>
        </div>
      } @else {

        <!-- ── DATA WARNING BANNER ──────────────────────────────── -->
        @if (warningsVisible() && snapshot()?.dataWarnings?.length) {
          <div class="wr-alert mb-3">
            <mat-icon class="wr-alert-icon">warning_amber</mat-icon>
            <div style="flex:1">
              <strong style="font-size:13px">Limited data available</strong>
              <ul class="mb-0 mt-1 ps-3" style="font-size:12px">
                @for (w of snapshot()!.dataWarnings; track w) { <li>{{ w }}</li> }
              </ul>
            </div>
            <button matIconButton (click)="dismissWarnings()"><mat-icon>close</mat-icon></button>
          </div>
        }

        <div class="wr-grid">

          <!-- ══════════════════════════════════════════════════════ -->
          <!-- ROW 1 — KPI STRIP (full width)                        -->
          <!-- ══════════════════════════════════════════════════════ -->
          <div class="wr-panel wr-full wr-panel--accent">
            <div class="wr-panel-head">
              <div class="d-flex align-items-center gap-2">
                <mat-icon class="wr-panel-icon">dashboard</mat-icon>
                <span class="wr-panel-title">Workspace Overview</span>
              </div>
              <div class="d-flex align-items-center gap-2">
                <div class="live-ring"><div class="live-dot"></div></div>
                <span style="font-size:11px;color:var(--text-color-secondary)">Live</span>
              </div>
            </div>

            <div class="kpi-strip">
              <div class="kpi-card"
                   matTooltip="Total projects in this workspace (all statuses)"
                   matTooltipPosition="above">
                <mat-icon class="kpi-icon" style="color:var(--wr-blue)">folder_open</mat-icon>
                <div class="kpi-val">{{ snapshot()?.totalProjects ?? 0 }}</div>
                <div class="kpi-lbl">Projects</div>
              </div>

              <div class="kpi-sep"></div>

              <div class="kpi-card"
                   matTooltip="Open tasks across all projects. Requires Task module integration for live data."
                   matTooltipPosition="above">
                <mat-icon class="kpi-icon" style="color:var(--wr-purple)">assignment</mat-icon>
                <div class="kpi-val">{{ snapshot()?.openTaskCount ?? 0 }}</div>
                <div class="kpi-lbl">Open Tasks</div>
              </div>

              <div class="kpi-sep"></div>

              <div class="kpi-card"
                   matTooltip="Active workspace members with a confirmed seat"
                   matTooltipPosition="above">
                <mat-icon class="kpi-icon" style="color:var(--wr-teal)">group</mat-icon>
                <div class="kpi-val">{{ snapshot()?.memberCount ?? 0 }}</div>
                <div class="kpi-lbl">Members</div>
              </div>

              <div class="kpi-sep"></div>

              <div class="kpi-card"
                   matTooltip="% of projects with ACTIVE or COMPLETED status — a delivery health proxy"
                   matTooltipPosition="above">
                <mat-icon class="kpi-icon" style="color:var(--wr-green)">trending_up</mat-icon>
                <div class="kpi-val">{{ snapshot()?.onTrackPercentage?.toFixed(0) ?? 0 }}<span class="kpi-unit">%</span></div>
                <div class="kpi-lbl">On Track</div>
              </div>

              <div class="kpi-sep"></div>

              <div class="kpi-card"
                   matTooltip="Members with estimated workload above 85% — high values signal burnout risk"
                   matTooltipPosition="above">
                <mat-icon class="kpi-icon"
                          [style.color]="(snapshot()?.overloadedMemberCount ?? 0) > 0 ? 'var(--wr-red)' : 'var(--wr-muted)'">
                  person_alert
                </mat-icon>
                <div class="kpi-val"
                     [style.color]="(snapshot()?.overloadedMemberCount ?? 0) > 0 ? 'var(--wr-red)' : 'inherit'">
                  {{ snapshot()?.overloadedMemberCount ?? 0 }}
                </div>
                <div class="kpi-lbl">Overloaded</div>
              </div>
            </div>
          </div>

          <!-- ══════════════════════════════════════════════════════ -->
          <!-- ROW 2 — INTELLIGENCE DIGEST (unique métier avancé)    -->
          <!-- ══════════════════════════════════════════════════════ -->
          @if (intel()) {
            <div class="wr-panel wr-full intel-panel">
              <div class="wr-panel-head mb-3">
                <div class="d-flex align-items-center gap-2">
                  <mat-icon class="wr-panel-icon" style="color:var(--wr-purple)">auto_awesome</mat-icon>
                  <span class="wr-panel-title">Workspace Intelligence Digest</span>
                  <span class="badge-new">AI-Ready</span>
                </div>
                <span class="wr-muted" style="font-size:11px">Auto-generated from workspace data</span>
              </div>

              <div class="intel-body">
                <!-- Score Ring -->
                <div class="intel-score-block">
                  <div class="score-ring-wrap"
                       [matTooltip]="'Composite health score — average across all project dimensions. Grade: ' + intel()!.grade"
                       matTooltipPosition="above">
                    <svg viewBox="0 0 80 80" width="80" height="80" class="score-ring-svg">
                      <circle cx="40" cy="40" r="30" fill="none"
                              stroke="var(--wr-border)" stroke-width="7"/>
                      <circle cx="40" cy="40" r="30" fill="none"
                              [attr.stroke]="gradeColor(intel()!.grade)"
                              stroke-width="7"
                              stroke-linecap="round"
                              [attr.stroke-dasharray]="scoreArc(intel()!.score)"
                              transform="rotate(-90 40 40)"
                              class="score-arc"/>
                    </svg>
                    <div class="score-center">
                      <span class="score-num" [style.color]="gradeColor(intel()!.grade)">{{ intel()!.score }}</span>
                      <span class="score-label">/ 100</span>
                    </div>
                  </div>
                  <div class="mt-2 text-center">
                    <span class="grade-badge" [style.background]="gradeColor(intel()!.grade) + '22'"
                          [style.color]="gradeColor(intel()!.grade)"
                          [style.border-color]="gradeColor(intel()!.grade) + '55'"
                          [matTooltip]="gradeLabel(intel()!.grade)"
                          matTooltipPosition="above">
                      Grade {{ intel()!.grade }}
                    </span>
                  </div>
                  <p class="intel-briefing mt-3">{{ intel()!.briefing }}</p>
                </div>

                <!-- Recommendations -->
                <div class="intel-recs">
                  @for (rec of intel()!.recs; track rec.title) {
                    <div class="intel-rec" [class]="'intel-rec--' + rec.level">
                      <mat-icon class="intel-rec-icon material-icons-outlined">{{ rec.icon }}</mat-icon>
                      <div class="intel-rec-body">
                        <strong class="intel-rec-title">{{ rec.title }}</strong>
                        <p class="intel-rec-detail">{{ rec.detail }}</p>
                      </div>
                    </div>
                  }
                  @if (!intel()!.recs.length) {
                    <div class="intel-rec intel-rec--success">
                      <mat-icon class="intel-rec-icon material-icons-outlined">check_circle</mat-icon>
                      <div class="intel-rec-body">
                        <strong class="intel-rec-title">All systems nominal</strong>
                        <p class="intel-rec-detail">No critical issues detected. Keep up the good work.</p>
                      </div>
                    </div>
                  }
                </div>
              </div>
            </div>
          }

          <!-- ══════════════════════════════════════════════════════ -->
          <!-- ROW 3 — HEATMAP | TICKER + SPARKLINES                 -->
          <!-- ══════════════════════════════════════════════════════ -->
          <div class="wr-panel">
            <div class="wr-panel-head">
              <div class="d-flex align-items-center gap-2">
                <mat-icon class="wr-panel-icon" style="color:var(--wr-teal)">grid_view</mat-icon>
                <span class="wr-panel-title">Activity Heatmap</span>
                @if (displayHeatmap().simulated) { <span class="sim-badge">simulated</span> }
              </div>
              <mat-icon class="info-btn material-icons-outlined"
                        matTooltip="Each cell = one day. Green intensity = completions. Red = overdue spike. Covers 12 weeks."
                        matTooltipPosition="left">info_outline</mat-icon>
            </div>
            <div class="heatmap-grid">
              @for (day of displayHeatmap().days; track day.date) {
                <div class="heatmap-cell"
                     [style.background]="heatmapCellColor(day)"
                     [matTooltip]="formatHeatmapTooltip(day)">
                </div>
              }
            </div>
            <div class="heatmap-legend">
              <span class="wr-muted" style="font-size:10px">Less</span>
              <div class="legend-cell" style="background:rgba(29,158,117,.22)"></div>
              <div class="legend-cell" style="background:rgba(29,158,117,.48)"></div>
              <div class="legend-cell" style="background:rgba(29,158,117,.72)"></div>
              <div class="legend-cell" style="background:rgba(29,158,117,.95)"></div>
              <span class="wr-muted" style="font-size:10px">More</span>
              <div class="legend-sep"></div>
              <div class="legend-cell" style="background:rgba(226,75,74,.7)"></div>
              <span class="wr-muted" style="font-size:10px">Overdue</span>
            </div>
          </div>

          <div class="wr-panel">
            <!-- Ticker -->
            <div class="wr-panel-head">
              <div class="d-flex align-items-center gap-2">
                <mat-icon class="wr-panel-icon" style="color:var(--wr-blue)">bolt</mat-icon>
                <span class="wr-panel-title">Live Event Stream</span>
                @if (displayEvents().simulated) { <span class="sim-badge">simulated</span> }
              </div>
              <mat-icon class="info-btn material-icons-outlined"
                        matTooltip="Real-time events via SSE. Shows project creations, member joins and task updates as they happen."
                        matTooltipPosition="left">info_outline</mat-icon>
            </div>
            <div class="ticker-list">
              @for (event of displayEvents().events; track event.timestamp) {
                <div class="ticker-row">
                  <div class="ticker-dot" [style.background]="eventDotColor(event.type)"></div>
                  <span class="ticker-msg">{{ event.message }}</span>
                  <span class="wr-muted ticker-time">{{ formatTime(event.timestamp) }}</span>
                </div>
              }
            </div>

            <!-- Throughput sparklines -->
            <div class="wr-divider"></div>
            <div class="wr-panel-head mt-2">
              <div class="d-flex align-items-center gap-2">
                <mat-icon class="wr-panel-icon" style="color:var(--wr-purple)">stacked_bar_chart</mat-icon>
                <span class="wr-panel-title">Throughput / Project</span>
              </div>
              <mat-icon class="info-btn material-icons-outlined"
                        matTooltip="Daily task completions over the last 10 days per project. Taller bars = more productive days."
                        matTooltipPosition="left">info_outline</mat-icon>
            </div>
            @if (snapshot()?.projectThroughputs?.length) {
              @for (proj of snapshot()!.projectThroughputs.slice(0, 5); track proj.projectId) {
                <div class="sparkline-row"
                     [matTooltip]="'10-day completion trend for ' + proj.name"
                     matTooltipPosition="above">
                  <span class="sparkline-name">{{ proj.name }}</span>
                  <div class="sparkline-wrap">
                    <div class="sparkline-bars">
                      @for (val of proj.last10DayCompletions; track $index) {
                        <div class="sparkline-bar"
                             [style.height]="sparklineBarHeight(val, proj.last10DayCompletions) + 'px'"
                             [style.background]="val > 0 ? 'var(--wr-teal)' : 'var(--wr-border-solid)'">
                        </div>
                      }
                    </div>
                  </div>
                  <span class="sparkline-val">{{ proj.last10DayCompletions[proj.last10DayCompletions.length - 1] || 0 }}</span>
                </div>
              }
            } @else {
              <div class="wr-empty-small">No throughput data yet</div>
            }
          </div>

          <!-- ══════════════════════════════════════════════════════ -->
          <!-- ROW 4 — WORKLOAD BARS | TOPOLOGY                      -->
          <!-- ══════════════════════════════════════════════════════ -->
          <div class="wr-panel">
            <div class="wr-panel-head">
              <div class="d-flex align-items-center gap-2">
                <mat-icon class="wr-panel-icon" style="color:var(--wr-amber)">speed</mat-icon>
                <span class="wr-panel-title">Member Workload</span>
              </div>
              <mat-icon class="info-btn material-icons-outlined"
                        matTooltip="Estimated workload per member. Amber = 70–85%, Red = above 85% (burnout risk)."
                        matTooltipPosition="left">info_outline</mat-icon>
            </div>
            @if (snapshot()?.memberWorkloads?.length) {
              @for (m of snapshot()!.memberWorkloads; track m.memberId) {
                <div class="workload-row"
                     [matTooltip]="m.displayName + ' — ' + m.loadPercentage + '% load' + (m.loadPercentage > 85 ? ' ⚠ Overloaded' : m.loadPercentage > 70 ? ' · High load' : ' · Healthy')"
                     matTooltipPosition="above">
                  <div class="workload-avatar"
                       [style.background]="workloadAvatarBg(m.loadPercentage)">
                    {{ memberInitials(m.displayName) }}
                  </div>
                  <div style="flex:1;min-width:0">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                      <span class="workload-name">{{ m.displayName }}</span>
                      <span class="workload-pct" [style.color]="workloadColor(m.loadPercentage)">
                        {{ m.loadPercentage }}%
                      </span>
                    </div>
                    <div class="workload-track">
                      <div class="workload-fill"
                           [style.width]="m.loadPercentage + '%'"
                           [style.background]="workloadColor(m.loadPercentage)">
                      </div>
                    </div>
                  </div>
                </div>
              }
            } @else {
              <div class="wr-empty-state">
                <mat-icon class="material-icons-outlined">bar_chart</mat-icon>
                <span>Workload snapshots not yet available</span>
              </div>
            }
          </div>

          <div class="wr-panel">
            <div class="wr-panel-head">
              <div class="d-flex align-items-center gap-2">
                <mat-icon class="wr-panel-icon" style="color:var(--wr-purple)">hub</mat-icon>
                <span class="wr-panel-title">Collaboration Topology</span>
              </div>
              <mat-icon class="info-btn material-icons-outlined"
                        matTooltip="Member pairs sharing projects. Stronger line = more shared projects. Identifies collaboration clusters."
                        matTooltipPosition="left">info_outline</mat-icon>
            </div>
            @if (snapshot()?.collaborationEdges?.length) {
              <div class="topology-list">
                @for (edge of snapshot()!.collaborationEdges.slice(0, 8); track edge.memberAId) {
                  <div class="topology-edge"
                       [matTooltip]="edge.nameA + ' & ' + edge.nameB + ' — ' + edge.sharedProjectCount + ' shared project' + (edge.sharedProjectCount !== 1 ? 's' : '')"
                       matTooltipPosition="above">
                    <span class="topo-node topo-node--left">{{ memberInitials(edge.nameA) }}</span>
                    <span class="topo-label topo-label--left">{{ edge.nameA }}</span>
                    <div class="topo-link">
                      <div class="topo-line" [style.opacity]="Math.min(1, .3 + edge.sharedProjectCount * .2)"></div>
                      <span class="topo-count">{{ edge.sharedProjectCount }}</span>
                    </div>
                    <span class="topo-label topo-label--right">{{ edge.nameB }}</span>
                    <span class="topo-node topo-node--right">{{ memberInitials(edge.nameB) }}</span>
                  </div>
                }
              </div>
              <p class="wr-muted mt-3 mb-0" style="font-size:11px">
                {{ snapshot()!.memberWorkloads.length }} members ·
                {{ snapshot()!.collaborationEdges.length }} connections
              </p>
            } @else {
              <div class="wr-empty-state">
                <mat-icon class="material-icons-outlined">device_hub</mat-icon>
                <span>No cross-project collaboration yet</span>
                <span class="wr-muted" style="font-size:11px;text-align:center">
                  Assign members to multiple projects to see connections
                </span>
              </div>
            }
          </div>

          <!-- ══════════════════════════════════════════════════════ -->
          <!-- ROW 5 — PROJECT HEALTH MATRIX (full width)            -->
          <!-- ══════════════════════════════════════════════════════ -->
          <div class="wr-panel wr-full">
            <div class="wr-panel-head mb-3">
              <div class="d-flex align-items-center gap-2">
                <mat-icon class="wr-panel-icon" style="color:var(--wr-teal)">grid_on</mat-icon>
                <span class="wr-panel-title">Project Health Matrix</span>
              </div>
              <mat-icon class="info-btn material-icons-outlined"
                        matTooltip="Scores each project on 4 dimensions (0–100). Green ≥ 80, Amber ≥ 50, Red < 50."
                        matTooltipPosition="left">info_outline</mat-icon>
            </div>
            @if (snapshot()?.healthMatrix?.projectNames?.length) {
              <div class="matrix-wrap">
                <table class="matrix-table">
                  <thead>
                    <tr>
                      <th class="matrix-th matrix-th--name">Project</th>
                      <th class="matrix-th">
                        <span class="matrix-th-inner"
                              matTooltip="Estimated % completion based on project status: COMPLETED=100, ACTIVE=60, PLANNING=20, ON_HOLD=30"
                              matTooltipPosition="above">
                          <mat-icon class="matrix-col-icon" style="color:var(--wr-teal)">adjust</mat-icon>
                          Progress
                        </span>
                      </th>
                      <th class="matrix-th">
                        <span class="matrix-th-inner"
                              matTooltip="Recency score — newer projects score higher. Projects older than 100 days without completion score near 0."
                              matTooltipPosition="above">
                          <mat-icon class="matrix-col-icon" style="color:var(--wr-blue)">timeline</mat-icon>
                          Activity
                        </span>
                      </th>
                      <th class="matrix-th">
                        <span class="matrix-th-inner"
                              matTooltip="Team coverage: number of assigned members × 20, capped at 100. Zero members = immediate risk."
                              matTooltipPosition="above">
                          <mat-icon class="matrix-col-icon" style="color:var(--wr-purple)">people</mat-icon>
                          Members
                        </span>
                      </th>
                      <th class="matrix-th">
                        <span class="matrix-th-inner"
                              matTooltip="Risk score = 100 − Progress. High risk means the project is unlikely to be completed soon."
                              matTooltipPosition="above">
                          <mat-icon class="matrix-col-icon" style="color:var(--wr-red)">report_problem</mat-icon>
                          Risk
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (name of snapshot()!.healthMatrix.projectNames; track name; let i = $index) {
                      <tr class="matrix-row">
                        <td class="matrix-td matrix-td--name">
                          <div class="d-flex align-items-center gap-2">
                            <div class="proj-dot"
                                 [style.background]="rowHealthColor(snapshot()!.healthMatrix.scores[i])">
                            </div>
                            {{ name }}
                          </div>
                        </td>
                        @for (score of snapshot()!.healthMatrix.scores[i]; track score; let j = $index) {
                          <td class="matrix-td">
                            <span class="health-pill"
                                  [class.hp-green]="score >= 80"
                                  [class.hp-amber]="score >= 50 && score < 80"
                                  [class.hp-red]="score < 50"
                                  [matTooltip]="matrixColLabel(j) + ': ' + score + '/100 — ' + healthScoreLabel(score)"
                                  matTooltipPosition="above">
                              {{ score }}
                            </span>
                          </td>
                        }
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            } @else {
              <div class="wr-empty-state">
                <mat-icon class="material-icons-outlined">table_chart</mat-icon>
                <span>No projects found in workspace</span>
              </div>
            }
          </div>

        </div><!-- /wr-grid -->
      }
    </div>
  `,
  styles: [`
    :host { display: block; }

    /* ── Design tokens ────────────────────────────────────────────── */
    :host {
      --wr-green:    #1D9E75;
      --wr-teal:     #0d9488;
      --wr-amber:    #EF9F27;
      --wr-red:      #E24B4A;
      --wr-purple:   #7F77DD;
      --wr-blue:     #3B82F6;
      --wr-muted:    var(--text-color-secondary, #64748b);
      --wr-text:     var(--text-color, #1e293b);
      --wr-surface:  var(--surface-card, #ffffff);
      --wr-ground:   var(--surface-ground, #f8fafc);
      --wr-border:   var(--surface-border, rgba(0,0,0,.1));
      --wr-border-solid: rgba(203,213,225,1);
      --wr-shadow:   0 1px 6px rgba(0,0,0,.07), 0 0 0 0.5px rgba(0,0,0,.06);
      --wr-shadow-hover: 0 4px 16px rgba(0,0,0,.10);
    }

    /* ── Grid ─────────────────────────────────────────────────────── */
    .wr-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

    /* ── Panel base ───────────────────────────────────────────────── */
    .wr-panel {
      background: var(--wr-surface);
      border-radius: 14px;
      padding: 16px 18px;
      box-shadow: var(--wr-shadow);
      transition: box-shadow .2s;
      overflow: hidden;
    }
    .wr-panel:hover { box-shadow: var(--wr-shadow-hover); }
    .wr-full { grid-column: 1 / -1; }
    .wr-panel--accent { border-top: 3px solid var(--wr-teal); }

    .wr-panel-head {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 12px;
    }
    .wr-panel-icon {
      font-size: 16px !important; width: 16px !important; height: 16px !important;
    }
    .wr-panel-title {
      font-size: 11px; font-weight: 600; letter-spacing: .07em;
      text-transform: uppercase; color: var(--wr-muted);
    }
    .info-btn {
      font-size: 15px !important; width: 15px !important; height: 15px !important;
      color: var(--wr-muted); opacity: .5; cursor: help;
    }
    .wr-muted { color: var(--wr-muted); }
    .wr-divider { height: 1px; background: var(--wr-border); margin: 12px -18px; }
    .wr-empty-small { font-size: 12px; color: var(--wr-muted); padding: 8px 0; }

    /* ── Live dot ─────────────────────────────────────────────────── */
    .live-ring { width: 14px; height: 14px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(34,197,94,.12); }
    .live-dot { width: 6px; height: 6px; border-radius: 50%; background: #22c55e; animation: live-pulse 1.4s ease infinite; }
    @keyframes live-pulse { 0%,100%{opacity:1} 50%{opacity:.35} }

    /* ── KPI Strip ────────────────────────────────────────────────── */
    .kpi-strip { display: flex; align-items: center; gap: 0; }
    .kpi-card {
      flex: 1; display: flex; flex-direction: column; align-items: center;
      padding: 10px 8px; border-radius: 10px; cursor: default;
      transition: background .15s;
    }
    .kpi-card:hover { background: var(--wr-ground); }
    .kpi-icon { font-size: 18px !important; width: 18px !important; height: 18px !important; margin-bottom: 4px; }
    .kpi-val { font-size: 22px; font-weight: 700; line-height: 1; color: var(--wr-text); }
    .kpi-unit { font-size: 14px; font-weight: 400; color: var(--wr-muted); }
    .kpi-lbl { font-size: 10px; color: var(--wr-muted); margin-top: 3px; font-weight: 500; letter-spacing: .04em; text-transform: uppercase; }
    .kpi-sep { width: 1px; height: 40px; background: var(--wr-border); flex-shrink: 0; margin: 0 4px; }

    /* ── Simulated badge ──────────────────────────────────────────── */
    .sim-badge {
      font-size: 9px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase;
      padding: 1px 6px; border-radius: 10px;
      background: rgba(239,159,39,.15); color: var(--wr-amber);
      border: 1px solid rgba(239,159,39,.3);
    }
    .badge-new {
      font-size: 9px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase;
      padding: 1px 6px; border-radius: 10px;
      background: rgba(127,119,221,.15); color: var(--wr-purple);
      border: 1px solid rgba(127,119,221,.3);
    }

    /* ── Intelligence Digest ──────────────────────────────────────── */
    .intel-panel { border-left: 3px solid var(--wr-purple); }
    .intel-body { display: flex; gap: 24px; align-items: flex-start; }

    .intel-score-block { flex-shrink: 0; width: 200px; display: flex; flex-direction: column; align-items: center; }
    .score-ring-wrap { position: relative; display: inline-flex; align-items: center; justify-content: center; }
    .score-ring-svg { display: block; }
    .score-arc { transition: stroke-dasharray .8s cubic-bezier(.4,0,.2,1); }
    .score-center {
      position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%);
      text-align: center; line-height: 1;
    }
    .score-num { display: block; font-size: 20px; font-weight: 700; }
    .score-label { font-size: 10px; color: var(--wr-muted); }
    .grade-badge {
      display: inline-block; padding: 2px 12px; border-radius: 20px;
      font-size: 12px; font-weight: 700; border: 1px solid;
    }
    .intel-briefing {
      font-size: 12px; color: var(--wr-muted); text-align: center;
      line-height: 1.5; margin: 0;
    }

    .intel-recs { flex: 1; display: flex; flex-direction: column; gap: 8px; }
    .intel-rec {
      display: flex; align-items: flex-start; gap: 12px;
      padding: 12px 14px; border-radius: 10px; border-left: 3px solid;
    }
    .intel-rec--danger  { background: rgba(226,75,74,.08);  border-color: var(--wr-red);    }
    .intel-rec--warning { background: rgba(239,159,39,.08); border-color: var(--wr-amber);  }
    .intel-rec--success { background: rgba(29,158,117,.08); border-color: var(--wr-green);  }
    .intel-rec--info    { background: rgba(59,130,246,.08); border-color: var(--wr-blue);   }
    .intel-rec-icon {
      font-size: 18px !important; width: 18px !important; height: 18px !important;
      flex-shrink: 0; margin-top: 1px;
    }
    .intel-rec--danger  .intel-rec-icon { color: var(--wr-red); }
    .intel-rec--warning .intel-rec-icon { color: var(--wr-amber); }
    .intel-rec--success .intel-rec-icon { color: var(--wr-green); }
    .intel-rec--info    .intel-rec-icon { color: var(--wr-blue); }
    .intel-rec-body { flex: 1; min-width: 0; }
    .intel-rec-title { font-size: 12px; font-weight: 600; color: var(--wr-text); display: block; }
    .intel-rec-detail { font-size: 11px; color: var(--wr-muted); margin: 2px 0 0; line-height: 1.4; }

    /* ── Warning alert ────────────────────────────────────────────── */
    .wr-alert {
      background: rgba(239,159,39,.1); border-left: 3px solid var(--wr-amber);
      border-radius: 8px; padding: 12px 14px;
      display: flex; align-items: flex-start; gap: 10px;
    }
    .wr-alert-icon { color: var(--wr-amber); flex-shrink: 0; }

    /* ── Heatmap ──────────────────────────────────────────────────── */
    .heatmap-grid { display: flex; flex-wrap: wrap; gap: 3px; }
    .heatmap-cell { width: 11px; height: 11px; border-radius: 2px; cursor: default; }
    .heatmap-legend { display: flex; align-items: center; gap: 4px; margin-top: 10px; }
    .legend-cell { width: 11px; height: 11px; border-radius: 2px; }
    .legend-sep { width: 8px; }

    /* ── Ticker ───────────────────────────────────────────────────── */
    .ticker-list { min-height: 72px; }
    .ticker-row {
      display: flex; align-items: center; gap: 8px; padding: 5px 0;
      border-bottom: 1px solid var(--wr-border);
      animation: ticker-in .35s ease;
    }
    .ticker-row:last-child { border-bottom: none; }
    @keyframes ticker-in { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:none} }
    .ticker-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
    .ticker-msg { flex: 1; font-size: 12px; color: var(--wr-text); }
    .ticker-time { font-size: 11px; white-space: nowrap; }

    /* ── Sparklines ───────────────────────────────────────────────── */
    .sparkline-row { display: flex; align-items: center; gap: 8px; padding: 4px 0; cursor: default; }
    .sparkline-name { width: 84px; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--wr-text); }
    .sparkline-wrap { flex: 1; height: 24px; display: flex; align-items: flex-end; }
    .sparkline-bars { display: flex; align-items: flex-end; gap: 2px; width: 100%; height: 24px; }
    .sparkline-bar { flex: 1; min-height: 2px; border-radius: 1px 1px 0 0; transition: height .3s ease; }
    .sparkline-val { width: 24px; text-align: right; font-size: 11px; font-weight: 600; color: var(--wr-text); }

    /* ── Workload ─────────────────────────────────────────────────── */
    .workload-row { display: flex; align-items: center; gap: 10px; padding: 5px 0; cursor: default; }
    .workload-avatar {
      width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      font-size: 10px; font-weight: 700; color: #fff; opacity: .85;
    }
    .workload-name { font-size: 12px; font-weight: 500; color: var(--wr-text); }
    .workload-track { height: 6px; background: var(--wr-border); border-radius: 3px; overflow: hidden; }
    .workload-fill { height: 100%; border-radius: 3px; transition: width .8s cubic-bezier(.4,0,.2,1); }
    .workload-pct { font-size: 11px; font-weight: 700; }

    /* ── Topology ─────────────────────────────────────────────────── */
    .topology-list { display: flex; flex-direction: column; gap: 8px; }
    .topology-edge { display: flex; align-items: center; gap: 6px; cursor: default; }
    .topo-node {
      width: 24px; height: 24px; border-radius: 50%; flex-shrink: 0;
      background: var(--wr-ground); border: 1.5px solid var(--wr-border);
      display: flex; align-items: center; justify-content: center;
      font-size: 9px; font-weight: 700; color: var(--wr-muted);
    }
    .topo-label { font-size: 11px; color: var(--wr-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 60px; }
    .topo-label--left { text-align: right; }
    .topo-label--right { text-align: left; }
    .topo-link { flex: 1; display: flex; align-items: center; gap: 4px; }
    .topo-line { flex: 1; height: 1.5px; background: linear-gradient(90deg, var(--wr-teal), var(--wr-purple)); border-radius: 1px; }
    .topo-count {
      font-size: 10px; font-weight: 700; color: var(--wr-surface);
      background: var(--wr-purple); min-width: 16px; height: 16px;
      border-radius: 8px; display: flex; align-items: center; justify-content: center;
    }

    /* ── Health Matrix ────────────────────────────────────────────── */
    .matrix-wrap { overflow-x: auto; }
    .matrix-table { width: 100%; font-size: 12px; border-collapse: separate; border-spacing: 0; }
    .matrix-th {
      padding: 6px 10px; color: var(--wr-muted); font-weight: 500;
      text-align: left; white-space: nowrap; border-bottom: 1.5px solid var(--wr-border);
    }
    .matrix-th--name { min-width: 140px; }
    .matrix-th-inner {
      display: inline-flex; align-items: center; gap: 4px;
      cursor: help; white-space: nowrap;
    }
    .matrix-col-icon {
      font-size: 13px !important; width: 13px !important; height: 13px !important;
    }
    .matrix-td { padding: 7px 10px; border-bottom: 1px solid var(--wr-border); }
    .matrix-row:last-child .matrix-td { border-bottom: none; }
    .matrix-row:hover .matrix-td { background: var(--wr-ground); }
    .matrix-td--name { font-weight: 500; color: var(--wr-text); }
    .proj-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .health-pill {
      display: inline-flex; align-items: center; justify-content: center;
      min-width: 36px; padding: 3px 10px; border-radius: 20px;
      font-size: 11px; font-weight: 700; cursor: default;
    }
    .hp-green { background: rgba(29,158,117,.18); color: #0d7a5f; border: 1px solid rgba(29,158,117,.25); }
    .hp-amber { background: rgba(239,159,39,.18);  color: #b36b00; border: 1px solid rgba(239,159,39,.3);  }
    .hp-red   { background: rgba(226,75,74,.18);   color: #b52a28; border: 1px solid rgba(226,75,74,.25); }

    /* Dark mode overrides for health pills */
    @media (prefers-color-scheme: dark) {
      .hp-green { color: #4ade80; border-color: rgba(74,222,128,.3); }
      .hp-amber { color: #fbbf24; border-color: rgba(251,191,36,.3);  }
      .hp-red   { color: #f87171; border-color: rgba(248,113,113,.3); }
    }

    /* ── Empty states ─────────────────────────────────────────────── */
    .wr-empty-state {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; padding: 24px 0; gap: 6px;
      color: var(--wr-muted);
    }
    .wr-empty-state mat-icon { font-size: 32px !important; opacity: .25; margin-bottom: 4px; }
    .wr-empty-state span { font-size: 12px; }
  `],
})
export class WarRoomComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly warRoomService = inject(WarRoomService);
  private sseStream: EventSource | null = null;

  readonly snapshot      = signal<WarRoomSnapshot | null>(null);
  readonly heatmapDays   = signal<HeatmapDay[]>([]);
  readonly liveEvents    = signal<WarRoomEvent[]>([]);
  readonly loading        = signal(true);
  readonly warningsVisible = signal(true);
  readonly Math = Math;

  readonly workspaceId   = computed(() => this.route.snapshot.paramMap.get('workspaceId') ?? '');
  readonly workspaceName = computed(() => this.snapshot()?.workspaceName ?? '');

  // ── Intelligence Digest ─────────────────────────────────────────────
  readonly intel = computed(() => {
    const snap = this.snapshot();
    if (!snap) return null;

    // Composite score
    let score = 50;
    if (snap.healthMatrix?.scores?.length) {
      const all: number[] = snap.healthMatrix.scores.flat();
      score = Math.round(all.reduce((a, b) => a + b, 0) / all.length);
    }
    // Penalise overloaded members
    if (snap.memberCount > 0) {
      score = Math.round(score * (1 - (snap.overloadedMemberCount / snap.memberCount) * 0.35));
    }
    score = Math.max(0, Math.min(100, score));

    const grade = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 58 ? 'C' : score >= 42 ? 'D' : 'F';

    // Recommendations
    const recs: IntelRec[] = [];
    const overloaded = snap.memberWorkloads.filter(m => m.loadPercentage > 85);
    if (overloaded.length) {
      recs.push({
        level: 'danger', icon: 'warning',
        title: `${overloaded.length} member${overloaded.length > 1 ? 's' : ''} at overload risk`,
        detail: `${overloaded.map(m => m.displayName).join(', ')} exceed${overloaded.length === 1 ? 's' : ''} 85% workload. Redistribute tasks to prevent burnout.`,
      });
    }
    if (snap.onTrackPercentage < 50 && snap.totalProjects > 0) {
      recs.push({
        level: 'warning', icon: 'trending_down',
        title: 'Delivery health below 50%',
        detail: `Only ${snap.onTrackPercentage.toFixed(0)}% of projects are active or completed. Review stalled projects and unblock the team.`,
      });
    }
    if (snap.memberCount > 1 && !snap.collaborationEdges.length) {
      recs.push({
        level: 'info', icon: 'hub',
        title: 'No cross-project collaboration detected',
        detail: 'Members work in isolated silos. Consider cross-team assignments to improve knowledge transfer and resilience.',
      });
    }
    if (snap.openTaskCount === 0 && snap.totalProjects > 0) {
      recs.push({
        level: 'info', icon: 'link_off',
        title: 'Task module not connected',
        detail: 'Open task counts require the Task module. Wire TaskDataPort for real data in this dashboard.',
      });
    }
    if (snap.onTrackPercentage >= 80 && overloaded.length === 0 && snap.totalProjects > 0) {
      recs.push({
        level: 'success', icon: 'check_circle',
        title: 'Workspace performing well',
        detail: `${snap.onTrackPercentage.toFixed(0)}% on-track rate and no overloaded members. Excellent execution momentum.`,
      });
    }

    const briefing = this.buildBriefing(snap, score);
    return { score, grade, recs, briefing };
  });

  // ── Simulated data ─────────────────────────────────────────────────
  readonly displayHeatmap = computed<{ days: HeatmapDay[]; simulated: boolean }>(() => {
    const days = this.heatmapDays();
    const allEmpty = !days.length || days.every(d => d.completions === 0 && d.overdueCount === 0);
    return allEmpty
      ? { days: this.makeSimulatedHeatmap(84), simulated: true }
      : { days, simulated: false };
  });

  readonly displayEvents = computed<{ events: WarRoomEvent[]; simulated: boolean }>(() => {
    if (this.loading()) return { events: [], simulated: false };
    if (this.liveEvents().length) return { events: this.liveEvents(), simulated: false };
    return { events: this.makeSimulatedEvents(), simulated: true };
  });

  // ── Lifecycle ──────────────────────────────────────────────────────
  ngOnInit(): void {
    const id = this.workspaceId();
    if (!id) return;
    const at = this.route.snapshot.queryParamMap.get('at') || undefined;
    forkJoin({
      snapshot: this.warRoomService.getSnapshot(id, at).pipe(catchError(() => of(null))),
      heatmap:  this.warRoomService.getHeatmap(id, 12, at).pipe(catchError(() => of([]))),
    }).subscribe(({ snapshot, heatmap }) => {
      this.snapshot.set(snapshot);
      this.heatmapDays.set(heatmap ?? []);
      this.loading.set(false);
    });

    // Only open live SSE when not viewing historical snapshot
    if (!at) this.openSse(id);
  }

  ngOnDestroy(): void {
    this.sseStream?.close();
    this.sseStream = null;
  }

  private openSse(id: string): void {
    try {
      this.sseStream = this.warRoomService.openStream(id);
      this.sseStream.onmessage = (e) => {
        try {
          const ev = JSON.parse(e.data) as WarRoomEvent;
          this.liveEvents.update(arr => [ev, ...arr].slice(0, 50));
        } catch { /* ignore */ }
      };
      this.sseStream.onerror = () => this.sseStream?.close();
    } catch { /* unavailable */ }
  }

  // ── Simulated generators ───────────────────────────────────────────
  private makeSimulatedHeatmap(days: number): HeatmapDay[] {
    const out: HeatmapDay[] = [];
    const base = new Date();
    base.setDate(base.getDate() - days + 1);
    for (let i = 0; i < days; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const r = Math.random();
      const weekend = d.getDay() === 0 || d.getDay() === 6;
      const completions = weekend ? (r > .65 ? Math.ceil(r * 3) : 0) : (r > .3 ? Math.ceil(r * 9) : 0);
      const overdueCount = completions === 0 && r > .88 ? 1 : 0;
      out.push({ date: d.toISOString().split('T')[0], completions, overdueCount });
    }
    return out;
  }

  private makeSimulatedEvents(): WarRoomEvent[] {
    const now = Date.now();
    const names = ['Nassim', 'Ahmed', 'Rima', 'Sara', 'Khalil'];
    const p = (a: string[]) => a[Math.floor(Math.random() * a.length)];
    return [
      { type: 'PROJECT_CREATED', message: 'Project "Sprint Alpha" was created',       actorDisplayName: p(names), timestamp: new Date(now -  2*60000).toISOString() },
      { type: 'MEMBER_JOINED',   message: `${p(names)} joined the workspace`,          actorDisplayName: p(names), timestamp: new Date(now -  7*60000).toISOString() },
      { type: 'TASK_COMPLETED',  message: 'Task "Design review" marked complete',     actorDisplayName: p(names), timestamp: new Date(now - 14*60000).toISOString() },
      { type: 'PROJECT_CREATED', message: 'Milestone updated — 75% progress reached', actorDisplayName: p(names), timestamp: new Date(now - 22*60000).toISOString() },
      { type: 'TASK_OVERDUE',    message: 'Task "API integration" is 2 days overdue', actorDisplayName: 'System', timestamp: new Date(now - 35*60000).toISOString() },
    ];
  }

  // ── Intelligence helpers ───────────────────────────────────────────
  private buildBriefing(snap: WarRoomSnapshot, score: number): string {
    const pw = snap.totalProjects === 1 ? 'project' : 'projects';
    const mw = snap.memberCount === 1 ? 'member' : 'members';
    const status = score >= 75 ? 'in good health' : score >= 50 ? 'showing mixed signals' : 'at risk';
    const overloaded = snap.memberWorkloads.filter(m => m.loadPercentage > 85);
    let s = `${snap.totalProjects} ${pw} across ${snap.memberCount} ${mw} — workspace is ${status} (${score}/100).`;
    if (overloaded.length) {
      s += ` Immediate attention: ${overloaded.map(m => m.displayName).slice(0, 2).join(' & ')} ${overloaded.length === 1 ? 'is' : 'are'} overloaded.`;
    } else if (snap.onTrackPercentage > 0) {
      s += ` ${snap.onTrackPercentage.toFixed(0)}% of projects are on track.`;
    }
    return s;
  }

  scoreArc(score: number): string {
    const c = 2 * Math.PI * 30; // r=30 → circumference ≈ 188.5
    return `${(score / 100) * c} ${c}`;
  }

  gradeColor(grade: string): string {
    const m: Record<string, string> = { A: '#1D9E75', B: '#3B82F6', C: '#EF9F27', D: '#F97316', F: '#E24B4A' };
    return m[grade] ?? '#94a3b8';
  }

  gradeLabel(grade: string): string {
    const m: Record<string, string> = { A: 'Excellent', B: 'Good', C: 'Fair', D: 'Needs improvement', F: 'Critical' };
    return m[grade] ?? grade;
  }

  rowHealthColor(scores: number[]): string {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    if (avg >= 75) return '#1D9E75';
    if (avg >= 50) return '#EF9F27';
    return '#E24B4A';
  }

  matrixColLabel(j: number): string {
    return ['Progress', 'Activity', 'Members', 'Risk'][j] ?? `Col ${j}`;
  }

  healthScoreLabel(score: number): string {
    if (score >= 80) return 'Healthy';
    if (score >= 50) return 'Needs attention';
    return 'At risk';
  }

  // ── Colour helpers ─────────────────────────────────────────────────
  heatmapCellColor(day: HeatmapDay): string {
    if (day.overdueCount > 0) return `rgba(226,75,74,${Math.min(.92, .35 + day.overdueCount * .15)})`;
    if (!day.completions)      return 'var(--wr-border)';
    return `rgba(29,158,117,${Math.min(.95, .22 + day.completions * .1)})`;
  }

  formatHeatmapTooltip(day: HeatmapDay): string {
    const c = day.completions;
    const o = day.overdueCount;
    return `${day.date} · ${c} completion${c !== 1 ? 's' : ''}${o ? ' · ' + o + ' overdue' : ''}`;
  }

  eventDotColor(type: string): string {
    return ({ PROJECT_CREATED: '#7F77DD', MEMBER_JOINED: '#3B82F6', TASK_COMPLETED: '#1D9E75', TASK_OVERDUE: '#E24B4A', COMMENT: '#F59E0B' } as Record<string,string>)[type] ?? '#94a3b8';
  }

  formatTime(ts: string): string {
    try { return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }); }
    catch { return ''; }
  }

  workloadColor(pct: number): string {
    if (pct >= 90) return '#E24B4A';
    if (pct >= 70) return '#EF9F27';
    return '#1D9E75';
  }

  workloadAvatarBg(pct: number): string {
    if (pct >= 90) return '#E24B4A';
    if (pct >= 70) return '#EF9F27';
    return '#1D9E75';
  }

  memberInitials(name: string): string {
    return (name ?? '?').split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
  }

  sparklineBarHeight(val: number, all: number[]): number {
    const max = Math.max(...all, 1);
    return Math.round((val / max) * 20) + 2;
  }

  dismissWarnings(): void { this.warningsVisible.set(false); }
}
