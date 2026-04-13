import { Component } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatDialogModule } from "@angular/material/dialog";
import { MatIconModule } from "@angular/material/icon";

interface Integration {
    icon: string;
    iconColor: string;
    name: string;
    tagline: string;
}

@Component({
    selector: "app-integrations-coming-soon-dialog",
    standalone: true,
    imports: [MatDialogModule, MatButtonModule, MatIconModule],
    template: `
        <div class="integrations-coming-soon">

            <!-- Header -->
            <div class="ics-header">
                <div class="ics-badge">
                    <mat-icon style="font-size:13px;width:13px;height:13px;line-height:13px;">rocket_launch</mat-icon>
                    COMING SOON
                </div>

                <div class="ics-icon-wrap">
                    <mat-icon class="material-icons-outlined ics-hub-icon">hub</mat-icon>
                </div>

                <h2 class="ics-title">Workspace Integrations</h2>
                <p class="ics-subtitle">
                    Connect your workspace to the tools your team already uses —
                    sync tasks, trigger alerts, and eliminate context-switching.
                </p>
            </div>

            <!-- Integration cards -->
            <div class="ics-grid">
                @for (item of integrations; track item.name) {
                    <div class="ics-card">
                        <div class="ics-card__icon" [style.color]="item.iconColor">
                            <mat-icon class="material-icons-outlined">{{ item.icon }}</mat-icon>
                        </div>
                        <div>
                            <div class="ics-card__name">{{ item.name }}</div>
                            <div class="ics-card__tag">{{ item.tagline }}</div>
                        </div>
                    </div>
                }
            </div>

            <!-- Footer note -->
            <p class="ics-note">
                <mat-icon style="font-size:14px;width:14px;height:14px;line-height:14px;vertical-align:middle;">lock</mat-icon>
                Available on all plans · No extra charge
            </p>

            <!-- CTA -->
            <button mat-flat-button class="ics-cta" mat-dialog-close>
                Got it, can't wait!
            </button>
        </div>
    `,
    styles: [`
        .integrations-coming-soon {
            padding: 32px 28px 24px;
            max-width: 460px;
            text-align: center;
        }

        /* ── Badge ── */
        .ics-badge {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            padding: 4px 12px;
            border-radius: 999px;
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            color: #fff;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.8px;
            margin-bottom: 20px;
        }

        /* ── Central icon ── */
        .ics-icon-wrap {
            width: 72px;
            height: 72px;
            border-radius: 20px;
            background: rgba(99, 102, 241, 0.10);
            border: 1.5px solid rgba(99, 102, 241, 0.18);
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 18px;
        }
        .ics-hub-icon {
            font-size: 34px !important;
            width: 34px !important;
            height: 34px !important;
            color: #6366f1;
        }

        /* ── Text ── */
        .ics-title {
            font-size: 20px;
            font-weight: 700;
            margin: 0 0 8px;
            color: #0f172a;
        }
        .ics-subtitle {
            font-size: 13.5px;
            color: #64748b;
            line-height: 1.6;
            margin: 0 0 24px;
        }

        /* ── 2-column grid ── */
        .ics-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-bottom: 20px;
            text-align: left;
        }
        .ics-card {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 12px;
            border-radius: 10px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
        }
        .ics-card__icon {
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .ics-card__name {
            font-size: 13px;
            font-weight: 600;
            color: #1e293b;
        }
        .ics-card__tag {
            font-size: 11px;
            color: #94a3b8;
        }

        /* ── Footer note ── */
        .ics-note {
            font-size: 12px;
            color: #94a3b8;
            margin-bottom: 20px;
        }

        /* ── CTA button ── */
        .ics-cta {
            width: 100%;
            border-radius: 10px !important;
            padding: 10px !important;
            font-weight: 600 !important;
            font-size: 14px !important;
            background: linear-gradient(135deg, #6366f1, #8b5cf6) !important;
            color: #fff !important;
        }
    `],
})
export class IntegrationsComingSoonDialogComponent {
    readonly integrations: Integration[] = [
        { icon: "code",          iconColor: "#24292e", name: "GitHub",    tagline: "Link repos & pull requests" },
        { icon: "chat",          iconColor: "#4a154b", name: "Slack",     tagline: "Real-time task alerts" },
        { icon: "assignment",    iconColor: "#0052cc", name: "Jira",      tagline: "Sync issues & sprints" },
        { icon: "email",         iconColor: "#ea4335", name: "Gmail",     tagline: "Email-to-task capture" },
        { icon: "calendar_month",iconColor: "#1a73e8", name: "Google Cal",tagline: "Sync deadlines & events" },
        { icon: "webhook",       iconColor: "#e8710a", name: "Webhooks",  tagline: "Custom event triggers" },
    ];
}
