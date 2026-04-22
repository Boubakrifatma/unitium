import { Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";

@Component({
    selector: "app-full-layout",
    standalone: true,
    imports: [RouterOutlet],
    template: `
        <div class="container vh-100">
            <router-outlet></router-outlet>
        </div>
    `,
    styles: [``],
})
export class FullLayoutComponent {}
