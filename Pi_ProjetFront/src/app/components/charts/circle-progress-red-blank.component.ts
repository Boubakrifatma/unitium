import { Component, AfterViewInit, ChangeDetectorRef } from "@angular/core";
import { Location } from "@angular/common";
import { NgCircleProgressModule, CircleProgressOptions } from "ng-circle-progress";

@Component({
    selector: "app-circle-progress-red-blank",
    standalone: true,
    imports: [NgCircleProgressModule],
    providers: [
        {
            provide: CircleProgressOptions,
        },
    ],
    template: `<circle-progress class="avatar avatar-60" [percent]="65" [space]="-4" [radius]="30" [outerStrokeWidth]="4" [innerStrokeWidth]="4" [outerStrokeColor]="'rgba(192, 1, 0, 1)'" [innerStrokeColor]="'rgba(192, 1, 0, 0.15)'" [animation]="true" [showSubtitle]="false" [showTitle]="false" [showUnits]="false" [animationDuration]="300"></circle-progress>`,
})
export class CircleProgressRedBlankComponent implements AfterViewInit {
    constructor(private cdr: ChangeDetectorRef) {}
    ngAfterViewInit() {
        setTimeout(() => {
            window.dispatchEvent(new Event("scroll"));
            window.dispatchEvent(new Event("resize"));
            this.cdr.detectChanges();
        }, 300);
    }
}
