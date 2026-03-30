import { Component, ViewChild, ElementRef, OnDestroy } from "@angular/core";
import { Location } from "@angular/common";
import { Chart, registerables } from "chart.js/auto";
Chart.register(...registerables);

@Component({
    selector: "app-area-red-chartjs-200",
    standalone: true,
    imports: [],
    providers: [],
    template: `<canvas #chartCanvas></canvas>`,
})
export class AreaRedChartjs200Component implements OnDestroy {
    @ViewChild("chartCanvas") chartCanvas!: ElementRef<HTMLCanvasElement>;
    myred200Chart!: Chart;
    private intervalId: number | null = null;

    ngAfterViewInit() {
        this.red200chart();

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
    red200chart() {
        const areachartred200 = this.chartCanvas.nativeElement;
        const ctxred200 = areachartred200.getContext("2d"); // Get the 2D rendering context
        if (ctxred200) {
            this.myred200Chart = new Chart(areachartred200, {
                type: "bar",
                data: {
                    labels: ["10:30", "11:00", "11:30", "12:00", "12:30", "01:00", "01:30"],
                    datasets: [
                        {
                            label: "# of Votes",
                            data: this.generateRandomData(),
                            radius: 0,
                            backgroundColor: "rgba(43, 124, 255, 0.75)",
                            borderColor: "rgba(43, 124, 255, 1)",
                            borderWidth: 2,
                            borderRadius: 3,
                            fill: true,
                            tension: 0.45,
                        } as any,
                    ],
                },
                options: {
                    maintainAspectRatio: false,
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
    randomizeChart() {
        if (this.myred200Chart) {
            this.myred200Chart.data.datasets.forEach((dataset) => {
                dataset.data = this.generateRandomData();
            });
            this.myred200Chart.update();
        }
    }

    ngOnDestroy(): void {
        if (this.intervalId !== null) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
}
