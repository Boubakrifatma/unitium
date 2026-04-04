import { Component, ViewChild, OnInit, CUSTOM_ELEMENTS_SCHEMA, Renderer2, DOCUMENT, Inject, signal, computed } from "@angular/core";
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

interface Contact {
    id: number;
    name: string;
    image: string;
    status: "online" | "offline" | "away";
}

interface Message {
    sender: "user" | "other";
    content: string;
    time: string;
    status: string;
}

@Component({
    selector: "app-chat",
    standalone: true,
    imports: [CommonModule, FormsModule, MatListModule, MatMenuModule, MatIconModule, MatInputModule, MatFormFieldModule, MatCardModule, MatToolbarModule, MatButtonModule],
    template: `
        <div class="container-fluid fade-in mb-3 mb-lg-4">
            <mat-card class="bg-light-theme shadow-none pt-3 pb-lg-3 px-3">
                <div class="row gx-3 align-items-center">
                    <div class="col mb-3 mb-xl-0 py-1">
                        <h3 class="mb-1">Chat Messages</h3>
                        <p class="text-secondary small">Communicate transparently and with ease</p>
                    </div>

                    <div class="col-auto mb-3 mb-xl-0">
                        <app-page-right></app-page-right>
                    </div>
                </div>
            </mat-card>
        </div>

        <div class="container">
            <div class="inner-sidebar-wrap">
                <div class="inner-sidebar px-0">
                    <div class="p-3">
                        <div class="row gx-3">
                            <div class="col-auto d-lg-none">
                                <button matIconButton (click)="innersidebar()" aria-label="Inner Menu">
                                    <mat-icon class="material-icons-outlined">arrow_back</mat-icon>
                                </button>
                            </div>
                            <div class="col">
                                <mat-form-field appearance="outline" class="w-100 inline-small">
                                    <mat-label>Search...</mat-label>
                                    <input matInput [(ngModel)]="searchQuery" placeholder="Search..." />
                                    <mat-icon matSuffix>search</mat-icon>
                                </mat-form-field>
                            </div>
                        </div>
                    </div>
                    <div class=" overflow-y-auto height-dynamic" style="--h-dynamic:calc(100vh - 330px)">
                        <mat-nav-list class="contact-list">
                            @for (contact of filteredContacts(); track contact.id) {
                            <mat-list-item (click)="selectContact(contact)" [class.active-contact]="activeContact()?.id === contact.id">
                                <div class="row gx-3 align-items-center">
                                    <div class="col-auto">
                                        <div class="avatar avatar-40 rounded-circle coverimg">
                                            <img [src]="contact.image" class="" />
                                        </div>
                                    </div>
                                    <div class="col">
                                        <p class="mb-0">{{ contact.name }}</p>
                                        <p class="opacity-75 small">Last Message</p>
                                    </div>
                                </div>
                            </mat-list-item>
                            } @empty {
                            <p class="">No contacts found.</p>
                            }
                        </mat-nav-list>
                    </div>
                </div>
                <div class="inner-sidebar-content pb-1">
                    <mat-card *ngIf="activeContact()" class="w-100 height-dynamic" style="--h-dynamic:calc(100vh - 250px)">
                        <mat-card-header>
                            <div class="w-100">
                                <div class="row gx-3 align-items-center mb-3">
                                    <div class="col-auto">
                                        <button matIconButton (click)="innersidebar()" aria-label="Inner Menu">
                                            <mat-icon class="material-icons-outlined">notes</mat-icon>
                                        </button>
                                    </div>
                                    <div class="col col-lg">
                                        <div class="row gx-3 align-items-center">
                                            <div class="col-auto">
                                                <img [src]="activeContact()?.image" class="avatar avatar-40 rounded-circle" />
                                            </div>
                                            <div class="col">
                                                <p class="mb-0">{{ activeContact()?.name }}</p>
                                                <p class="opacity-75 small">{{ activeContact()?.status }}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-auto">
                                        <button matIconButton (click)="toggleSearch()">
                                            @if (isSearchVisible()) {
                                            <mat-icon class="material-icons-outlined">close</mat-icon>
                                            } @else {
                                            <mat-icon class="material-icons-outlined">search</mat-icon>
                                            }
                                        </button>
                                    </div>
                                    <div class="col-auto ">
                                        <button matIconButton [matMenuTriggerFor]="actionsMenu" aria-label="Actions" (click)="$event.stopPropagation()">
                                            <mat-icon class="material-icons-outlined">more_vert</mat-icon>
                                        </button>
                                        <mat-menu #actionsMenu="matMenu" xPosition="before">
                                            <button mat-menu-item><mat-icon class="material-icons-outlined">person</mat-icon><span>View Contact</span></button>
                                            <button mat-menu-item><mat-icon class="material-icons-outlined">volume_mute</mat-icon><span>Mute Chat</span></button>
                                            <button mat-menu-item><mat-icon class="material-icons-outlined">search</mat-icon><span>Find in Chat</span></button>
                                            <button mat-menu-item><mat-icon class="material-icons-outlined">report</mat-icon><span>Report</span></button>
                                            <button mat-menu-item class="theme-red"><mat-icon class="material-icons-outlined">delete</mat-icon><span>Delete</span></button>
                                        </mat-menu>
                                    </div>
                                </div>
                                @if (isSearchVisible()) {
                                <mat-form-field appearance="outline" class="w-100 inline-small border-light mb-3">
                                    <mat-label>Search in Chat</mat-label>
                                    <input matInput placeholder="Search in Chat..." />
                                    <mat-icon matSuffix>search</mat-icon>
                                </mat-form-field>
                                }
                            </div>
                        </mat-card-header>
                        <mat-card-content class="flex-grow-1 overflow-y-auto height-dynamic" style="--h-dynamic:calc(100% - 144px)">
                            <!-- Chat Messages -->
                            <div class="chat-list">
                                @for (message of dummyMessages(); track $index) {
                                <div [class.justify-content-end]="message.sender === 'user'" class="row gx-3 mb-3">
                                    <div class="col-auto">
                                        <mat-card [class.theme-cyan]="message.sender === 'user'" [class.theme-violet]="message.sender === 'other'" class="bg-light-theme mb-1 shadow-none">
                                            <mat-card-content>
                                                {{ message.content }}
                                            </mat-card-content>
                                        </mat-card>
                                        <p [class.text-end]="message.sender === 'user'" class="text-secondary small">
                                            @if (message.status === "read") {
                                            <mat-icon class="text-theme theme-cyan align-middle">done_all</mat-icon>
                                            } @else if((message.status === "sent")) {
                                            <mat-icon class="align-middle text-secondary">done_all</mat-icon>
                                            } @else{
                                            <mat-icon class="align-middle">check</mat-icon>
                                            }
                                            {{ message.time }}
                                        </p>
                                    </div>
                                </div>
                                }
                            </div>
                        </mat-card-content>
                        <mat-card-actions>
                            <!-- Chat Input Area -->
                            <div class="w-100">
                                <mat-form-field appearance="fill" class="bg-none w-100 mb-0">
                                    <button matIconButton matPrefix>
                                        <mat-icon class="material-icons-outlined">attach_file</mat-icon>
                                    </button>
                                    <mat-label>Type a message</mat-label>
                                    <input matInput [(ngModel)]="messageInput" placeholder="Type a message..." (keyup.enter)="sendMessage()" />

                                    <button matIconButton (click)="sendMessage()" matSuffix>
                                        <mat-icon class="material-icons-outlined">send</mat-icon>
                                    </button>
                                </mat-form-field>
                            </div>
                        </mat-card-actions>
                    </mat-card>
                    <mat-card *ngIf="!activeContact()" class="text-center height-dynamic" style="--h-dynamic:calc(100vh - 250px)">
                        <mat-card-content>
                            <div class="row gx-3 align-items-center mb-3">
                                <div class="col-auto">
                                    <button matIconButton (click)="innersidebar()" aria-label="Inner Menu">
                                        <mat-icon class="material-icons-outlined">notes</mat-icon>
                                    </button>
                                </div>
                            </div>
                            <img src="assets/img/nomessage.png" alt="" class="width-300 mt-4 mt-lg-5" />
                            <h3 class="mb-1">No message</h3>
                            <p class="text-secondary">Select contact to see message</p>
                        </mat-card-content>
                    </mat-card>
                </div>
            </div>
        </div>
    `,
    styles: [``],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ChatComponent {
    // search
    isSearchVisible = signal(false);

    // contact data
    contacts: Contact[] = [
        { id: 1, name: "Alice Smith", image: "assets/img/user-1.jpg", status: "online" },
        { id: 2, name: "Bob Johnson", image: "assets/img/user-2.jpg", status: "offline" },
        { id: 3, name: "Charlie Brown", image: "assets/img/user-3.jpg", status: "online" },
        { id: 4, name: "Diana Prince", image: "assets/img/user-4.jpg", status: "away" },
        { id: 5, name: "John Doe", image: "assets/img/user-5.jpg", status: "online" },
        { id: 6, name: "Jane Doe", image: "assets/img/user-6.jpg", status: "offline" },
        { id: 7, name: "Kevin Durant", image: "assets/img/user-7.jpg", status: "online" },
        { id: 8, name: "Lebron James", image: "assets/img/user-8.jpg", status: "offline" },
        { id: 9, name: "Stephen Curry", image: "assets/img/user-9.jpg", status: "online" },
        { id: 10, name: "Kobe Bryant", image: "assets/img/user-10.jpg", status: "away" },
    ];

    // Signals management
    searchQuery = signal("");
    activeContact = signal<Contact | null>(null);
    dummyMessages = signal<Message[]>([
        { sender: "other", content: "Hey, how are you?", time: "09:15 am", status: "read" },
        { sender: "user", content: "I'm doing great, thanks for asking! How about you?", time: "09:13 am", status: "read" },
        { sender: "other", content: "I'm doing fine as well. I was just wondering if you wanted to grab a coffee this week?", time: "09:12 am", status: "sent" },
        { sender: "user", content: "Sounds great! How about Thursday at 10 AM?", time: "09:11 am", status: "sent" },
        { sender: "other", content: "Thursday at 10 AM works for me. See you then!", time: "08:08 am", status: "sending" },
    ]);
    messageInput = signal("");

    // Computed signal to filter contacts based on search query
    filteredContacts = computed(() => {
        const query = this.searchQuery().toLowerCase();
        if (!query) {
            return this.contacts;
        }
        return this.contacts.filter((contact) => contact.name.toLowerCase().includes(query));
    });

    constructor(
        private renderer: Renderer2,
        @Inject(DOCUMENT) private document: Document // Inject the DOCUMENT token
    ) {}

    ngAfterInit() {}

    // Method to handle contact selection
    selectContact(contact: Contact) {
        this.activeContact.set(contact);
    }

    sendMessage() {
        const message = this.messageInput().trim();
        if (message) {
            this.dummyMessages.update((messages) => [...messages, { sender: "user", content: message, time: "now", status: "sending" }]);
            this.messageInput.set("");
        }
    }
    // toggle search
    toggleSearch() {
        this.isSearchVisible.update((value) => !value);
    }

    // inner sidebar toggle
    innersidebar(): void {
        const body = this.document.body;
        const className = "innermenu-close";
        if (body.classList.contains(className)) {
            this.renderer.removeClass(body, className);
        } else {
            this.renderer.addClass(body, className);
        }
    }
}
