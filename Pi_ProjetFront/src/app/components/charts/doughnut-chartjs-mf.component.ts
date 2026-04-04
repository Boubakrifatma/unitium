import { Component, ViewChild, ElementRef } from "@angular/core";
import { Location } from "@angular/common";
import { Chart, registerables } from "chart.js/auto";
Chart.register(...registerables);

@Component({
    selector: "app-doughnut-chartjs-mf",
    standalone: true,
    imports: [],
    providers: [],
    template: `<canvas #chartCanvas></canvas>`,
})
export class DoughnutChartjsMFComponent {
    @ViewChild("chartCanvas") chartCanvas!: ElementRef<HTMLCanvasElement>;
    mydoughnutmfChart!: Chart;

    ngAfterViewInit() {
        this.doughnutmfchart();
    }

    /* chart  */
    doughnutmfchart() {
        const areachartdoughnutmf = this.chartCanvas.nativeElement;
        const ctxdoughnutmf = areachartdoughnutmf.getContext("2d"); // Get the 2D rendering context
        if (ctxdoughnutmf) {
            this.mydoughnutmfChart = new Chart(areachartdoughnutmf, {
                type: "doughnut",
                data: {
                    labels: ["Male", "Female", "Other"],
                    datasets: [
                        {
                            label: "Expense categories",
                            data: [40, 45, 5],
                            backgroundColor: ["#c80036", "#0000ef", "#becede"],
                            borderWidth: 0,
                        },
                    ],
                },
                options: {
                    responsive: true,
                    cutout: 62,
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
