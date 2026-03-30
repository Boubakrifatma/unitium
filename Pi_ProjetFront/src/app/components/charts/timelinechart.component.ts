import { Component, ViewChild, ElementRef } from "@angular/core";
import { Location } from "@angular/common";
import { Chart, registerables } from "chart.js/auto";
Chart.register(...registerables);

@Component({
    selector: "app-timeline-chart",
    standalone: true,
    imports: [],
    providers: [],
    template: `<canvas #chartCanvas></canvas>`,
})
export class TimelineChartComponent {
    @ViewChild("chartCanvas") chartCanvas!: ElementRef<HTMLCanvasElement>;
    myinventoryBannerChartChart!: Chart;

    ngAfterViewInit() {
        this.inventoryBannerChartchart();
    }

    /* chart  */

    inventoryBannerChartchart() {
        const areachartinventoryBannerChart = this.chartCanvas.nativeElement;
        const ctxinventoryBannerChart = areachartinventoryBannerChart.getContext("2d"); // Get the 2D rendering context
        if (ctxinventoryBannerChart) {
            var gradientgreen1 = ctxinventoryBannerChart.createLinearGradient(0, 0, 0, 190);
            gradientgreen1.addColorStop(0, "rgba(71, 223, 132, 1)");
            gradientgreen1.addColorStop(1, "rgba(8, 160, 70, 0.1)");
            var gradientred1 = ctxinventoryBannerChart.createLinearGradient(0, 0, 0, 200);
            gradientred1.addColorStop(0, "rgba(255, 68, 68, 1)");
            gradientred1.addColorStop(1, "rgba(200, 0, 54, 0.0)");
            var gradientyellow1 = ctxinventoryBannerChart.createLinearGradient(0, 0, 0, 140);
            gradientyellow1.addColorStop(0, "rgba(129, 214, 218, 0.5)");
            gradientyellow1.addColorStop(1, "rgba(59, 174, 180, 0.0)");

            this.myinventoryBannerChartChart = new Chart(areachartinventoryBannerChart, {
                type: "bar",
                data: {
                    labels: ["1/10", "2/10", "3/10", "4/10", "5/10", "6/10", "7/10", "8/10", "9/10"],
                    datasets: [
                        {
                            label: "Productive",
                            data: [6, 5, 4, 6, 5, 4.5, 5, 4, 3],
                            radius: 2,
                            backgroundColor: "rgba(43, 124, 255, 0.75)",
                            borderColor: "transparent",
                            borderWidth: 2,
                            borderRadius: 5,
                            fill: true,
                            tension: 0.0,
                        } as any,
                        {
                            label: "Learning",
                            data: [1, 1.5, 2, 1, 2, 2, 2.2, 3, 3],
                            radius: 2,
                            backgroundColor: "rgba(36, 200, 254, 0.75)",
                            borderColor: "transparent",
                            borderWidth: 2,
                            borderRadius: 5,
                            fill: true,
                            tension: 0.0,
                        } as any,
                        {
                            label: "Unproductive",
                            data: [1, 1.5, 2, 2, 1, 1.5, 1, 2, 2],
                            radius: 2,
                            backgroundColor: "rgba(195, 255, 105, 0.75)",
                            borderColor: "transparent",
                            borderWidth: 2,
                            borderRadius: 5,
                            fill: true,
                            tension: 0.0,
                        } as any,
                    ],
                },
                options: {
                    maintainAspectRatio: false,
                    layout: {
                        padding: {
                            left: 0,
                        },
                    },
                    plugins: {
                        legend: {
                            display: false,
                        },
                    },
                    scales: {
                        y: {
                            stacked: true,
                            display: true,
                            grid: {
                                display: false,
                            },
                            beginAtZero: true,
                        },
                        x: {
                            stacked: true,
                            ticks: {
                                maxTicksLimit: 7,
                            },
                            display: true,
                            grid: {
                                display: false,
                            },
                        },
                    },
                },
            });
        }
    }
}
