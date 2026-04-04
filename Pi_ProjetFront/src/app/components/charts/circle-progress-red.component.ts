import { Component, AfterViewInit, ChangeDetectorRef } from "@angular/core";
import { Location } from "@angular/common";
import { NgCircleProgressModule, CircleProgressOptions } from "ng-circle-progress";

@Component({
    selector: "app-circle-progress-red",
    standalone: true,
    imports: [NgCircleProgressModule],
    providers: [
        {
            provide: CircleProgressOptions,
        },
    ],
    template: `<circle-progress class="avatar avatar-80" [percent]="65" [space]="-6" [radius]="40" [outerStrokeWidth]="6" [innerStrokeWidth]="6" [outerStrokeColor]="'#c00100'" [innerStrokeColor]="'rgba(255, 180, 171, 0.25)'" [animation]="true" [showSubtitle]="false" [titleFontSize]="'26px'" [unitsFontSize]="'20px'" [titleColor]="'#c00100'" [unitsColor]="'#c00100'" [animationDuration]="300"></circle-progress>`,
})
export class CircleProgressRedComponent implements AfterViewInit {
    constructor(private cdr: ChangeDetectorRef) {}
    ngAfterViewInit() {
        setTimeout(() => {
            window.dispatchEvent(new Event("scroll"));
            window.dispatchEvent(new Event("resize"));
            this.cdr.detectChanges();
        }, 300);
    }
}


