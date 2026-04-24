import { Component, ViewChild, ElementRef } from "@angular/core";
import { Location } from "@angular/common";
import { Chart, registerables } from "chart.js/auto";
Chart.register(...registerables);

@Component({
    selector: "app-polararea-chartjs-180",
    standalone: true,
    imports: [],
    providers: [],
    template: `<canvas #chartCanvas></canvas>`,
})
export class PolarAreaChartjs180Component {
    @ViewChild("chartCanvas") chartCanvas!: ElementRef<HTMLCanvasElement>;
    mypolarArea180Chart!: Chart;

    ngAfterViewInit() {
        this.polarArea180chart();
    }

    /* chart  */
    polarArea180chart() {
        const areachartpolarArea180 = this.chartCanvas.nativeElement;
        const ctxpolarArea180 = areachartpolarArea180.getContext("2d"); // Get the 2D rendering context
        if (ctxpolarArea180) {
            this.mypolarArea180Chart = new Chart(areachartpolarArea180, {
                type: "polarArea",
                data: {
                    labels: ["Food", "Transport", "Children", "Home", "Other"],
                    datasets: [
                        {
                            label: "Expense categories",
                            data: [40, 10, 15, 25, 10],
                            backgroundColor: ["rgba(234, 234, 0, 0.65)", "rgb(8, 160, 70, 0.55)", "rgb(200, 0, 54, 0.60)", "rgba(52, 61, 255, 0.65)", "rgb(0, 73, 232, 0.40)"],
                            borderWidth: 0,
                        },
                    ],
                },
                options: {
                    responsive: true,
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
