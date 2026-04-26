import { Component, ViewChild, ElementRef, OnDestroy } from "@angular/core";
import { Location } from "@angular/common";
import { Chart, registerables } from "chart.js/auto";
Chart.register(...registerables);

@Component({
    selector: "app-social-banner-chart",
    standalone: true,
    imports: [],
    providers: [],
    template: `<canvas #chartCanvas></canvas>`,
})
export class SocialBannerChartComponent implements OnDestroy {
    @ViewChild("chartCanvas") chartCanvas!: ElementRef<HTMLCanvasElement>;
    mysocialBannerChart!: Chart;
    private intervalId: number | null = null;

    ngAfterViewInit() {
        this.summarychart();

        this.intervalId = window.setInterval(() => {
            this.randomizeChart();
        }, 3000);
    }

    /* chart  */
    randomScalingFactor() {
        return Math.round(Math.random() * 20);
    }
    generateRandomData() {
        return [this.randomScalingFactor(), this.randomScalingFactor(), this.randomScalingFactor(), this.randomScalingFactor(), this.randomScalingFactor(), this.randomScalingFactor(), this.randomScalingFactor()];
    }
    summarychart() {
        const socialBannerChart = this.chartCanvas.nativeElement;
        const ctxsocialBanner = socialBannerChart.getContext("2d"); // Get the 2D rendering context
        if (ctxsocialBanner) {
            var gradientsocialtrafficblue = ctxsocialBanner.createLinearGradient(0, 0, 0, 180);
            gradientsocialtrafficblue.addColorStop(0, "rgba(0, 0, 239, 0.65)");
            gradientsocialtrafficblue.addColorStop(1, "rgba(0, 0, 239, 0)");
            var gradientsocialtrafficred1 = ctxsocialBanner.createLinearGradient(0, 0, 0, 180);
            gradientsocialtrafficred1.addColorStop(0, "rgba(255, 180, 171, 0.45)");
            gradientsocialtrafficred1.addColorStop(1, "rgba(200, 0, 54, 0)");
            this.mysocialBannerChart = new Chart(socialBannerChart, {
                type: "line",
                data: {
                    labels: ["Feb", "Mar", "Apr", "May", "Jun", "Jul"],
                    datasets: [
                        {
                            label: "# of Votes",
                            data: this.generateRandomData(),
                            radius: 0,
                            backgroundColor: gradientsocialtrafficblue,
                            borderColor: "#0000ef",
                            borderWidth: 2,
                            fill: true,
                            tension: 0.35,
                        } as any,
                        {
                            label: "# of Votes",
                            data: this.generateRandomData(),
                            radius: 0,
                            backgroundColor: gradientsocialtrafficred1,
                            borderColor: "#d31d38",
                            borderWidth: 2,
                            fill: true,
                            tension: 0.35,
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
                            display: true,
                            beginAtZero: true,
                            grid: {
                                display: true,
                                color: "rgba(0,0,0,0.04)",
                                lineWidth: 1,
                            },
                        },
                        x: {
                            display: true,
                            beginAtZero: true,
                            grid: {
                                display: true,
                                color: "rgba(0,0,0,0.04)",
                                lineWidth: 1,
                            },
                        },
                    },
                },
            });
        }
    }
    randomizeChart() {
        if (this.mysocialBannerChart) {
            this.mysocialBannerChart.data.datasets.forEach((dataset) => {
                dataset.data = this.generateRandomData();
            });
            this.mysocialBannerChart.update();
        }
    }

    ngOnDestroy(): void {
        if (this.intervalId !== null) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
}
