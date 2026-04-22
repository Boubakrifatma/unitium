import { Component, Input, signal, inject, computed } from "@angular/core";
import { CommonModule, NgFor, NgIf } from "@angular/common";
import { LiveAnnouncer } from "@angular/cdk/a11y";
import { COMMA, ENTER } from "@angular/cdk/keycodes";
import { MatListModule } from "@angular/material/list";
import { MatIconModule } from "@angular/material/icon";
import { RouterModule } from "@angular/router";
import { MatExpansionModule } from "@angular/material/expansion";
import { MatDrawer, MatSidenavModule } from "@angular/material/sidenav";
import { MatButtonModule } from "@angular/material/button";
import { MatTabsModule } from "@angular/material/tabs";
import { MatBadge, MatBadgeModule } from "@angular/material/badge";
import { MatButtonToggleModule } from "@angular/material/button-toggle";
import { MatChipEditedEvent, MatChipInputEvent, MatChipsModule } from "@angular/material/chips";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatStepperModule } from "@angular/material/stepper";
import { MatCardModule } from "@angular/material/card";
import { MatSelect, MatSelectModule } from "@angular/material/select";

export interface Keywords {
    name: string;
}

@Component({
    selector: "app-notification-sidenav",
    standalone: true,
    imports: [CommonModule, MatListModule, MatIconModule, RouterModule, MatSidenavModule, MatButtonToggleModule, MatSelectModule, MatCardModule, MatStepperModule, MatFormFieldModule, MatChipsModule, MatInputModule, MatBadgeModule, MatTabsModule, MatButtonModule, MatExpansionModule],
    template: `
        <div class="sidebar height-dynamic" style="--h-dynamic: calc(100% - 64px)">
            <mat-tab-group>
                <mat-tab label="All">
                    <mat-list>
                        @for (notification of allNotifications(); track notification.id) {
                        <mat-list-item>
                            <div class="row gx-3">
                                <div class="col-auto">
                                    <div class="avatar avatar-40 bg-light-theme text-theme rounded" [ngClass]="{ 'theme-red': notification.type === 'system', 'theme-yellow': notification.type === 'comment', 'theme-blue': notification.type === 'sale', 'theme-green': notification.type === 'taskStatus' }">
                                        <mat-icon matListItemIcon>{{ notification.icon }}</mat-icon>
                                    </div>
                                </div>
                                <div class="col maxwidth-dynamic" style="--mw-dynamic:calc(100% - 40px - 1rem)">
                                    <h4 matListItemTitle class="fw-bold mb-0">{{ notification.title }}</h4>
                                    <p matListItemLine class="mb-0">{{ notification.text }}</p>
                                    <div matListItemLine class="small opacity-75 mb-3">{{ notification.timestamp | date : "shortTime" }}</div>
                                    @if (notification.type === 'sale') {
                                    <div matListItemActions class="mb-3">
                                        <button matButton="filled" class="button-sm">Approve</button>
                                        <button matButton class="theme-red mx-1 button-sm">Reject</button>
                                    </div>
                                    } @else if (notification.type === 'comment') {
                                    <div matListItemActions class="mb-3">
                                        <button matButton="filled" class="button-sm">Reply</button>
                                    </div>
                                    } @else if (notification.type === 'request') {
                                    <div matListItemActions class="mb-3">
                                        <button matButton="filled" class="button-sm">Approve</button>
                                        <button mat-button class="theme-red button-sm">Reject</button>
                                    </div>
                                    }
                                </div>
                            </div>
                        </mat-list-item>
                        }
                    </mat-list>
                </mat-tab>
                <mat-tab [label]="'Unread (' + unreadNotifications().length + ')'">
                    <mat-list>
                        @for (notification of unreadNotifications(); track notification.id) {
                        <mat-list-item>
                            <div class="row gx-3 flex-nowrap">
                                <div class="col-auto">
                                    <div class="avatar avatar-40 bg-light-theme text-theme rounded" [ngClass]="{ 'theme-red': notification.type === 'system', 'theme-yellow': notification.type === 'comment', 'theme-blue': notification.type === 'sale', 'theme-green': notification.type === 'taskStatus' }">
                                        <mat-icon matListItemIcon>{{ notification.icon }}</mat-icon>
                                    </div>
                                </div>
                                <div class="col">
                                    <h4 matListItemTitle class="fw-bold mb-0">{{ notification.title }}</h4>
                                    <div matListItemLine>{{ notification.text }}</div>
                                    <div matListItemLine class="small opacity-75 mb-3">{{ notification.timestamp | date : "shortTime" }}</div>
                                    @if (notification.type === 'sale') {
                                    <div matListItemActions class="mb-3">
                                        <button matButton="filled" class="button-sm">Approve</button>
                                        <button mat-button class="theme-red button-sm">Reject</button>
                                    </div>
                                    } @else if (notification.type === 'comment') {
                                    <div matListItemActions class="mb-3">
                                        <button matButton="filled" class="button-sm">Reply</button>
                                    </div>
                                    } @else if (notification.type === 'request') {
                                    <div matListItemActions class="mb-3">
                                        <button matButton="filled" class="button-sm">Approve</button>
                                        <button mat-button class="theme-red button-sm">Reject</button>
                                    </div>
                                    }
                                </div>
                            </div>
                        </mat-list-item>
                        }
                    </mat-list>
                </mat-tab>
                <mat-tab label="Systems">
                    <mat-list>
                        @for (notification of systemNotifications(); track notification.id) {
                        <mat-list-item>
                            <div class="row gx-3">
                                <div class="col-auto">
                                    <div class="avatar avatar-40 bg-light-theme text-theme rounded" [ngClass]="{ 'theme-red': notification.type === 'system', 'theme-yellow': notification.type === 'comment', 'theme-blue': notification.type === 'sale' }">
                                        <mat-icon matListItemIcon>{{ notification.icon }}</mat-icon>
                                    </div>
                                </div>
                                <div class="col">
                                    <h4 matListItemTitle class="fw-bold mb-0">{{ notification.title }}</h4>
                                    <div matListItemLine>{{ notification.text }}</div>
                                    <div matListItemLine class="small opacity-75 mb-3">{{ notification.timestamp | date : "shortTime" }}</div>
                                </div>
                            </div>
                        </mat-list-item>
                        }
                    </mat-list>
                </mat-tab>
            </mat-tab-group>
        </div>
    `,
    styles: [
        `
            mat-list mat-list-item {
                border-bottom: 1px dashed rgba(180, 180, 180, 0.5);
            }
        `,
    ],
})
export class NotificationSidenavComponent {
    value = "";
    // notifications data
    private notifications = signal([
        { id: 1, type: "taskStatus", title: "Task Moved", text: "#021 moved to ready-to-test by Jia Doe.", icon: "assignment", timestamp: new Date(), read: false },
        { id: 2, type: "request", title: "Leave request", text: "Leave request raised by by Liana Doe.", icon: "event", timestamp: new Date(), read: false },
        { id: 3, type: "sale", title: "New Sale!", text: "Order #12345 has been placed.", icon: "attach_money", timestamp: new Date(), read: false },
        { id: 4, type: "comment", title: "New Comment", text: "Someone commented on your latest post.", icon: "comment", timestamp: new Date(Date.now() - 60000), read: false },
        { id: 5, type: "system", title: "System Update", text: "A new feature has been deployed.", icon: "system_update", timestamp: new Date(Date.now() - 120000), read: true },
        { id: 6, type: "sale", title: "Sale Completed", text: "Order #12344 has been shipped.", icon: "shopping_bag", timestamp: new Date(Date.now() - 180000), read: true },
        { id: 7, type: "system", title: "System Downtime", text: "Scheduled maintenance from 2-4 AM.", icon: "warning", timestamp: new Date(Date.now() - 240000), read: false },
    ]);

    allNotifications = this.notifications.asReadonly();

    unreadNotifications = computed(() => this.notifications().filter((n) => !n.read));

    systemNotifications = computed(() => this.notifications().filter((n) => n.type === "system"));

    // button group
    hideSingleSelectionIndicator = signal(false);
    toggleSingleSelectionIndicator() {
        this.hideSingleSelectionIndicator.update((value) => !value);
    }

    // mat chips
    readonly addOnBlur = true;
    readonly separatorKeysCodes = [ENTER, COMMA] as const;
    readonly Keywords = signal<Keywords[]>([{ name: "Transaction" }, { name: "Income" }, { name: "Expense" }]);
    readonly announcer = inject(LiveAnnouncer);

    add(event: MatChipInputEvent): void {
        const value = (event.value || "").trim();

        // Add our Keyword
        if (value) {
            this.Keywords.update((Keywords) => [...Keywords, { name: value }]);
        }

        // Clear the input value
        event.chipInput!.clear();
    }

    remove(Keyword: Keywords): void {
        this.Keywords.update((Keywords) => {
            const index = Keywords.indexOf(Keyword);
            if (index < 0) {
                return Keywords;
            }

            Keywords.splice(index, 1);
            this.announcer.announce(`Removed ${Keyword.name}`);
            return [...Keywords];
        });
    }

    edit(Keyword: Keywords, event: MatChipEditedEvent) {
        const value = event.value.trim();

        // Remove Keyword if it no longer has a name
        if (!value) {
            this.remove(Keyword);
            return;
        }

        // Edit existing Keyword
        this.Keywords.update((Keywords) => {
            const index = Keywords.indexOf(Keyword);
            if (index >= 0) {
                Keywords[index].name = value;
                return [...Keywords];
            }
            return Keywords;
        });
    }
}
