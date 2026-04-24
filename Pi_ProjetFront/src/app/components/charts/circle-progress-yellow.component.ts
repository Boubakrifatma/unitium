import { Component, AfterViewInit, ChangeDetectorRef } from "@angular/core";
import { Location } from "@angular/common";
import { NgCircleProgressModule, CircleProgressOptions } from "ng-circle-progress";

@Component({
    selector: "app-circle-progress-yellow",
    standalone: true,
    imports: [NgCircleProgressModule],
    providers: [
        {
            provide: CircleProgressOptions,
        },
    ],
    template: `<circle-progress class="avatar avatar-80" [percent]="65" [space]="-6" [radius]="40" [outerStrokeWidth]="6" [innerStrokeWidth]="6" [outerStrokeColor]="'#964900'" [innerStrokeColor]="'rgba(241, 157, 0, 0.15)'" [animation]="true" [showSubtitle]="false" [titleFontSize]="'26px'" [unitsFontSize]="'20px'" [titleColor]="'#964900'" [unitsColor]="'#964900'" [animationDuration]="300"></circle-progress>`,
})
export class CircleProgressYellowComponent implements AfterViewInit {
    constructor(private cdr: ChangeDetectorRef) {}
    ngAfterViewInit() {
        setTimeout(() => {
            window.dispatchEvent(new Event("scroll"));
            window.dispatchEvent(new Event("resize"));
            this.cdr.detectChanges();
        }, 300);
    }
}


