import { Component, ViewChild, ElementRef, OnDestroy } from "@angular/core";
import { Location } from "@angular/common";
import { Chart, registerables } from "chart.js/auto";
Chart.register(...registerables);

@Component({
    selector: "app-bar-blue-chartjs-100-hori",
    standalone: true,
    imports: [],
    providers: [],
    template: `<canvas #chartCanvas></canvas>`,
})
export class BarBlueChartjs100HoriComponent implements OnDestroy {
    @ViewChild("chartCanvas") chartCanvas!: ElementRef<HTMLCanvasElement>;
    mybar100HoriChart!: Chart;
    private intervalId: number | null = null;

    ngAfterViewInit() {
        this.bar100Horichart();

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
    bar100Horichart() {
        const areachartbar100Hori = this.chartCanvas.nativeElement;
        const ctxbar100Hori = areachartbar100Hori.getContext("2d"); // Get the 2D rendering context
        if (ctxbar100Hori) {
            this.mybar100HoriChart = new Chart(areachartbar100Hori, {
                type: "bar",
                data: {
                    labels: ["Jan", "Feb", "Mar", "Apr", "May"],
                    datasets: [
                        {
                            label: "# of Votes",
                            data: this.generateRandomData(),
                            backgroundColor: "rgba(119, 162, 255, 0.3)",
                            borderWidth: 0,
                            borderRadius: 8,
                            borderSkipped: false,
                            barThickness: 12,
                        } as any,
                        {
                            label: "# of Votes",
                            data: this.generateRandomData(),
                            backgroundColor: "#0088FF",
                            borderWidth: 0,
                            borderRadius: 8,
                            borderSkipped: false,
                            barThickness: 12,
                        } as any,
                    ],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: "y",
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
                            grid: {
                                display: false,
                            },
                        },
                        x: {
                            display: false,
                            grid: {
                                display: false,
                            },
                        },
                    },
                },
            });
        }
    }
    randomizeChart() {
        if (this.mybar100HoriChart) {
            this.mybar100HoriChart.data.datasets.forEach((dataset) => {
                dataset.data = this.generateRandomData();
            });
            this.mybar100HoriChart.update();
        }
    }

    ngOnDestroy(): void {
        if (this.intervalId !== null) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
}
