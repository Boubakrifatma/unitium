import { Component } from "@angular/core";
import { Location } from "@angular/common";
import { Chart, registerables } from "chart.js/auto";
import { MatTooltipModule } from "@angular/material/tooltip";
Chart.register(...registerables);

@Component({
    selector: "app-heatmap-chart",
    standalone: true,
    imports: [MatTooltipModule],
    providers: [],
    template: `
        <div id="heatmapContainer" class="mb-3">
            <div class="row gx-0 flex-nowrap">
                <div class="col heatmap-cell-head">
                    <div class="h-100 w-100">
                        <p class="small">Hour</p>
                    </div>
                </div>
                @for (hour of hourLabels; track hour) {
                <div class="col heatmap-cell-head-data">
                    <div class="h-100 w-100">
                        {{ hour }}
                    </div>
                </div>
                }
            </div>

            @for (dayData of weeklyHourlyActivity; track dayData.day) {
            <div class="row gx-0 flex-nowrap">
                <div class="col heatmap-cell-head">
                    <div class="h-100 w-100">
                        <p class="small">{{ dayData.day }}</p>
                    </div>
                </div>

                @for (activity of dayData.data; track $index) {
                <div class="col heatmap-cell-data">
                    <div class="h-100 w-100" matTooltip="{{ dayData.day + ', ' + hourLabels[$index] + ': ' + activity + 'k Events' }}" [style]="getColorStyle(activity)">
                        <!-- <p class="small text-white">{{ activity }}</p> -->
                    </div>
                </div>
                }
            </div>
            }
        </div>

        <div class="row gx-3 align-items-center mb-3">
            <div class="col-auto"><p class="text-secondary small">Low (0k)</p></div>
            <div class="col legend-gradient"></div>
            <div class="col-auto"><p class="text-secondary small">High (100k)</p></div>
        </div>
    `,
    styles: `
    .heatmap-cell-head{
        border-right:2px solid transparent;
        border-bottom:2px solid transparent;
        line-height:26px;
        height:26px;
        vertical-align:middle;
        text-align:center;
        font-size:14px; 
        color:#666666;  
        opacity:0.85
    }

    .heatmap-cell-head-data{ 
        border-right:2px solid transparent;
        border-bottom:2px solid transparent;
        line-height:26px;
        height:26px;
        vertical-align:middle;
        text-align:center;
        font-size:12px;   
        color:#666666;  
        opacity:0.85
    }

    .heatmap-cell-data{
        border-right:2px solid transparent;
        border-bottom:2px solid transparent;
        line-height:26px;
        height:26px;
        vertical-align:middle;
        text-align:center;
        font-size:12px;

    }

    .legend-gradient {
        height: 1rem;
        flex-grow: 1;
        border-radius: 0.15rem;
        background: linear-gradient(to right, rgba(43, 124, 255, 0.1), rgba(43, 124, 255, 1.0));
    }

    @media screen and (max-width:991px){
        .heatmap-cell-head-data{ 
            line-height:20px;
            height:46px;

            & > div{
                writing-mode: sideways-lr;
                text-orientation: mixed;        
            }
        }
    }
    `,
})
export class HeatmapChartComponent {
    readonly MAX_ACTIVITY = 100;
    readonly BASE_RGB = "43, 124, 255";

    readonly weeklyHourlyActivity = [
        { day: "Mon", data: [50, 65, 75, 80, 85, 90, 88, 85, 80, 70] },
        { day: "Tue", data: [55, 70, 80, 85, 90, 95, 92, 88, 83, 72] },
        { day: "Wed", data: [52, 68, 78, 83, 88, 93, 91, 86, 81, 70] },
        { day: "Thu", data: [54, 69, 79, 84, 89, 94, 90, 87, 82, 71] },
        { day: "Fri", data: [60, 75, 85, 90, 85, 78, 70, 65, 55, 40] },
        { day: "Sat", data: [25, 30, 35, 40, 42, 40, 38, 35, 30, 25] },
        { day: "Sun", data: [20, 24, 28, 32, 35, 34, 31, 28, 24, 20] },
    ];

    readonly hourLabels = Array.from({ length: 10 }, (_, i) => String(i + 8).padStart(2, "0") + ":00");

    getColorStyle(value: number): string {
        const clampedValue = Math.min(Math.max(value, 0), this.MAX_ACTIVITY);

        const minOpacity = 0.1;
        const maxOpacity = 1.0;

        let opacity = minOpacity + (clampedValue / this.MAX_ACTIVITY) * (maxOpacity - minOpacity);

        return `background-color: rgba(${this.BASE_RGB}, ${opacity.toFixed(2)})`;
    }
}
