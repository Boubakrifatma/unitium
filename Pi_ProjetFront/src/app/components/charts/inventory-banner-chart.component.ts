import { Component, ViewChild, ElementRef } from "@angular/core";
import { Location } from "@angular/common";
import { Chart, registerables } from "chart.js/auto";
Chart.register(...registerables);

@Component({
    selector: "app-inventory-banner-chart",
    standalone: true,
    imports: [],
    providers: [],
    template: `<canvas #chartCanvas></canvas>`,
})
export class InventoryBannerChartComponent {
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
            this.myinventoryBannerChartChart = new Chart(areachartinventoryBannerChart, {
                type: "line",
                data: {
                    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"],
                    datasets: [
                        {
                            label: "Expense",
                            data: [2510, 2300, 2410, 2158, 2460, 2254, 1524, 2546, 2465],
                            radius: 2,
                            pointBackgroundColor: "#ffffff",
                            backgroundColor: "rgba(43, 124, 255, 0.75)",
                            borderColor: "rgba(43, 124, 255, 0.65)",
                            borderWidth: 2,
                            borderRadius: 15,
                            fill: true,
                            tension: 0.0,
                        } as any,
                        {
                            label: "Profit",
                            data: [3810, 2860, 3295, 2852, 3225, 3346, 2445, 3158, 3058],
                            radius: 2,
                            pointBackgroundColor: "#ffffff",
                            backgroundColor: "rgba(36, 200, 254, 0.75)",
                            borderColor: "rgba(36, 200, 254, 1)",
                            borderWidth: 2,
                            borderRadius: 15,
                            fill: true,
                            tension: 0.0,
                        } as any,
                        {
                            label: "Revenue",
                            data: [5000, 4500, 4200, 5200, 4800, 4521, 3824, 5165, 5100],
                            radius: 2,
                            pointBackgroundColor: "#ffffff",
                            backgroundColor: "rgba(195, 255, 105, 0.75)",
                            borderColor: "rgba(154, 253, 68, 1)",
                            borderWidth: 2,
                            borderRadius: 15,
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
                            display: true,
                            beginAtZero: true,
                        },
                        x: {
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
