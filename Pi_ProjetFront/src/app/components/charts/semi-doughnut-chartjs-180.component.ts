import { Component, ViewChild, ElementRef } from "@angular/core";
import { Location } from "@angular/common";
import { Chart, registerables } from "chart.js/auto";
Chart.register(...registerables);

@Component({
    selector: "app-semi-doughnut-chartjs-180",
    standalone: true,
    imports: [],
    providers: [],
    template: `<canvas #chartCanvas class="width-200 height-200 d-inline-flex justify-content-center align-items-center mt--25 position-relative"></canvas>`,
})
export class SemiDoughnutChartjs180Component {
    @ViewChild("chartCanvas") chartCanvas!: ElementRef<HTMLCanvasElement>;
    mysemidoughnut180Chart!: Chart;

    ngAfterViewInit() {
        this.semidoughnut180chart();
    }

    /* chart  */
    semidoughnut180chart() {
        const areachartsemidoughnut180 = this.chartCanvas.nativeElement;
        const ctxsemidoughnut180 = areachartsemidoughnut180.getContext("2d"); // Get the 2D rendering context
        if (ctxsemidoughnut180) {
            this.mysemidoughnut180Chart = new Chart(areachartsemidoughnut180, {
                type: "doughnut",
                data: {
                    labels: ["Food", "Transport", "Children", "Home", "Other"],
                    datasets: [
                        {
                            label: "Expense categories",
                            data: [40, 10, 15, 25, 10],
                            backgroundColor: ["#fdc9c1ff", "#b6f7b5ff", "#b2f7f7ff", "#cac5faff", "#cae1f7ff"],
                            borderColor: ["#ffac9fff", "#83e881ff", "#71e8e8ff", "#a198f6ff", "#9ac6f2ff"],
                            borderWidth: 2,
                            borderRadius: 10,
                        },
                    ],
                },
                options: {
                    circumference: 180,
                    rotation: -90,
                    responsive: true,
                    cutout: 85,
                    plugins: {
                        legend: {
                            display: false,
                            position: "top",
                        },
                        title: {
                            display: false,
                            text: "",
                        },
                    },
                },
            });
        }
    }
}
