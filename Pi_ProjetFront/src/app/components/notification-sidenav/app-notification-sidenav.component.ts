import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatListModule } from "@angular/material/list";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatTabsModule } from "@angular/material/tabs";
import { MatBadgeModule } from "@angular/material/badge";
import { NotificationService } from "../../services/notification.service";

@Component({
    selector: "app-notification-sidenav",
    standalone: true,
    imports: [CommonModule, MatListModule, MatIconModule, MatBadgeModule, MatTabsModule, MatButtonModule],
    template: `
        <div class="sidebar height-dynamic" style="--h-dynamic: calc(100% - 64px); overflow-y:auto">

            <!-- Header avec badge -->
            <div class="d-flex justify-content-between align-items-center px-3 pt-3 pb-2">
                <div class="d-flex align-items-center gap-2">
                    <mat-icon>notifications</mat-icon>
                    <span class="fw-bold fs-6">Notifications</span>
                    @if (notifService.unreadCount() > 0) {
                        <span class="badge rounded-pill bg-danger" style="font-size:11px">
                            {{ notifService.unreadCount() }} non lue(s)
                        </span>
                    }
                </div>
                @if (notifService.unreadCount() > 0) {
                    <button mat-button class="button-sm" (click)="notifService.markAllAsRead()">
                        Tout marquer lu
                    </button>
                }
            </div>

            <mat-tab-group>
                <!-- Onglet Non lues -->
                <mat-tab>
                    <ng-template mat-tab-label>
                        Non lues
                        @if (notifService.unreadCount() > 0) {
                            <span class="badge rounded-pill bg-danger ms-1" style="font-size:10px">
                                {{ notifService.unreadCount() }}
                            </span>
                        }
                    </ng-template>
                    <mat-list>
                        @if (notifService.unreadNotifications().length === 0) {
                            <div class="text-center py-4 opacity-50 small">
                                <mat-icon style="font-size:32px;height:32px;width:32px">notifications_none</mat-icon>
                                <p class="mt-1">Aucune notification non lue</p>
                            </div>
                        }
                        @for (n of notifService.unreadNotifications(); track n.id) {
                            <mat-list-item (click)="notifService.markAsRead(n.id)" style="cursor:pointer; height:auto">
                                <div class="row gx-2 align-items-start py-2 w-100">
                                    <div class="col-auto">
                                        <div class="avatar avatar-36 rounded-circle d-flex align-items-center justify-content-center"
                                             [style.background]="iconBg(n.eventType)">
                                            <mat-icon style="font-size:18px;height:18px;width:18px;color:#fff">
                                                {{ iconFor(n.eventType) }}
                                            </mat-icon>
                                        </div>
                                    </div>
                                    <div class="col">
                                        <div class="fw-bold small">{{ n.title }}</div>
                                        <div class="small opacity-75 text-wrap">{{ n.message }}</div>
                                        <div class="small opacity-50 mt-1">{{ n.createdAt | date:'dd/MM/yyyy HH:mm' }}</div>
                                    </div>
                                    <div class="col-auto">
                                        <span class="rounded-circle bg-primary d-block"
                                              style="width:8px;height:8px;margin-top:6px"></span>
                                    </div>
                                </div>
                            </mat-list-item>
                        }
                    </mat-list>
                </mat-tab>

                <!-- Onglet Toutes -->
                <mat-tab label="Toutes">
                    <mat-list>
                        @if (notifService.notifications().length === 0) {
                            <div class="text-center py-4 opacity-50 small">
                                <mat-icon style="font-size:32px;height:32px;width:32px">notifications_none</mat-icon>
                                <p class="mt-1">Aucune notification</p>
                            </div>
                        }
                        @for (n of notifService.notifications(); track n.id) {
                            <mat-list-item (click)="!n.isRead && notifService.markAsRead(n.id)"
                                           [style.cursor]="!n.isRead ? 'pointer' : 'default'"
                                           [style.background]="!n.isRead ? 'rgba(99,102,241,0.05)' : 'transparent'"
                                           style="height:auto">
                                <div class="row gx-2 align-items-start py-2 w-100">
                                    <div class="col-auto">
                                        <div class="avatar avatar-36 rounded-circle d-flex align-items-center justify-content-center"
                                             [style.background]="iconBg(n.eventType)"
                                             [style.opacity]="n.isRead ? '0.5' : '1'">
                                            <mat-icon style="font-size:18px;height:18px;width:18px;color:#fff">
                                                {{ iconFor(n.eventType) }}
                                            </mat-icon>
                                        </div>
                                    </div>
                                    <div class="col">
                                        <div [class.fw-bold]="!n.isRead" class="small">{{ n.title }}</div>
                                        <div class="small opacity-75 text-wrap">{{ n.message }}</div>
                                        <div class="small opacity-50 mt-1">{{ n.createdAt | date:'dd/MM/yyyy HH:mm' }}</div>
                                    </div>
                                    @if (!n.isRead) {
                                        <div class="col-auto">
                                            <span class="rounded-circle bg-primary d-block"
                                                  style="width:8px;height:8px;margin-top:6px"></span>
                                        </div>
                                    }
                                </div>
                            </mat-list-item>
                        }
                    </mat-list>
                </mat-tab>
            </mat-tab-group>
        </div>
    `,
    styles: [`
        mat-list mat-list-item {
            border-bottom: 1px dashed rgba(180, 180, 180, 0.5);
        }
    `],
})
export class NotificationSidenavComponent {
    constructor(public notifService: NotificationService) {}

    iconFor(eventType: string): string {
        switch (eventType) {
            case 'SUBMITTED_TO_MANAGER':         return 'upload_file';
            case 'MANAGER_VIEWED':               return 'visibility';
            case 'ACCEPTED_BY_MANAGER':          return 'check_circle';
            case 'REVISION_REQUIRED_BY_MANAGER': return 'edit_note';
            case 'VALIDATED_BY_PO':              return 'verified';
            case 'VALIDATED_EMPLOYEE':           return 'emoji_events';
            case 'REJECTED_BY_PO':               return 'cancel';
            case 'REVISION_REQUIRED_BY_PO':      return 'replay';
            default:                             return 'notifications';
        }
    }

    iconBg(eventType: string): string {
        switch (eventType) {
            case 'SUBMITTED_TO_MANAGER':         return '#6366f1';
            case 'MANAGER_VIEWED':               return '#8b5cf6';
            case 'ACCEPTED_BY_MANAGER':          return '#22c55e';
            case 'REVISION_REQUIRED_BY_MANAGER': return '#f59e0b';
            case 'VALIDATED_BY_PO':              return '#06b6d4';
            case 'VALIDATED_EMPLOYEE':           return '#10b981';
            case 'REJECTED_BY_PO':               return '#ef4444';
            case 'REVISION_REQUIRED_BY_PO':      return '#f97316';
            default:                             return '#6366f1';
        }
    }
}
