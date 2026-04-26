import { Component, ViewChild, ElementRef } from "@angular/core";
import { Location } from "@angular/common";
import { Chart, registerables } from "chart.js/auto";
Chart.register(...registerables);

@Component({
    selector: "app-dashboard-chart",
    standalone: true,
    imports: [],
    providers: [],
    template: `<canvas #chartCanvas></canvas>`,
})
export class DashboardChartComponent {
    @ViewChild("chartCanvas") chartCanvas!: ElementRef<HTMLCanvasElement>;
    mybankBannerChart!: Chart;

    ngAfterViewInit() {
        this.summarychart();
    }

    /* chart  */

    summarychart() {
        const bankBannerChart = this.chartCanvas.nativeElement;
        const ctxBankBanner = bankBannerChart.getContext("2d"); // Get the 2D rendering context
        if (ctxBankBanner) {
            var gradientblue1 = ctxBankBanner.createLinearGradient(0, 0, 0, 220);
            gradientblue1.addColorStop(0, "rgba(0, 73, 232, 0.35)");
            gradientblue1.addColorStop(1, "rgba(0, 73, 232, 0)");
            var gradientred1 = ctxBankBanner.createLinearGradient(0, 0, 0, 220);
            gradientred1.addColorStop(0, "rgba(200, 0, 54, 0.35)");
            gradientred1.addColorStop(1, "rgba(200, 0, 54, 0)");
            var gradientcyan1 = ctxBankBanner.createLinearGradient(0, 0, 0, 220);
            gradientcyan1.addColorStop(0, "rgba(1, 187, 208, 0.45)");
            gradientcyan1.addColorStop(1, "rgba(3, 138, 152, 0)");
            this.mybankBannerChart = new Chart(bankBannerChart, {
                type: "line",
                data: {
                    labels: ["7:00", "8:00", "9:00", "10:00", "11:00", "12:00", "1:00", "2:00", "3:00", "4:00", "5:00", "6:00", "7:00", "8:00", "9:00", "10:00", "11:00", "12:00", "1:00", "2:00", "3:00", "4:00", "5:00", "6:00"],
                    datasets: [
                        {
                            label: "Generation (kW)",
                            data: [0, 0, 0.5, 0.25, 0.5, 1, 2, 3, 3, 3.1, 3, 2.5, 2.8, 2.2, 2, 1.5, 0.85, 0.5, 0, 0, 0, 0, 0, 0],
                            radius: 1,
                            pointBackgroundColor: "#ffffff",
                            backgroundColor: gradientcyan1,
                            borderColor: "rgba(0, 194, 216, 0.75)",
                            borderWidth: 2,
                            fill: true,
                            tension: 0.3,
                        } as any,
                        {
                            label: "Usage (kWh)",
                            data: [1, 1, 1, 1.25, 2.5, 2.2, 1.2, 1.0, 1.5, 1.8, 2, 2.2, 3.0, 3.2, 3.5, 4.2, 4, 3.5, 3, 1, 1.5, 1.2, 1, 1],
                            radius: 1,
                            pointBackgroundColor: "#ffffff",
                            backgroundColor: gradientred1,
                            borderColor: "rgba(200, 0, 54, 0.15)",
                            borderWidth: 2,
                            fill: true,
                            tension: 0.3,
                        } as any,
                        {
                            label: "Bill (USD)",
                            data: [0.1, 0.1, 0.5, 0.25, 1.2, 0.8, 0.2, 0.0, 0.5, 0.8, 1, 1.2, 2.0, 2.2, 2.5, 2.8, 2.6, 2.1, 2, 0.8, 0.95, 0.85, 0.5, 0.3],
                            radius: 1,
                            pointBackgroundColor: "#ffffff",
                            backgroundColor: gradientblue1,
                            borderColor: "rgba(0, 73, 232, 0.45)",
                            borderWidth: 2,
                            fill: true,
                            tension: 0.3,
                        } as any,
                    ],
                },
                options: {
                    layout: {
                        padding: 0,
                    },
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false,
                        },
                        tooltip: {
                            enabled: true,
                        },
                    },
                    scales: {
                        y: {
                            display: false,
                            beginAtZero: true,
                            grid: {
                                display: false,
                            },
                        },
                        x: {
                            display: true,
                            beginAtZero: true,
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
