import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  viewChild,
} from '@angular/core';
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  ChartConfiguration,
  LinearScale,
  Plugin,
  Tooltip,
} from 'chart.js';

import { ActivityView } from '../../../core/models';

// Only the four pieces this chart needs are registered, rather than the whole
// Chart.js bundle, so the lazy administration chunk stays small.
Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

/** Colours taken from the application's design tokens. */
const COLOR_TAKEN = '#4a7a6d'; // --color-primary-600
const COLOR_TRACK = '#dfeae5'; // --color-primary-100, a lighter step of the same ramp
const COLOR_SURFACE = '#ffffff';
const COLOR_GRID = '#e2e7e1'; // --color-line
const COLOR_INK = '#637069'; // --color-ink-500

/** Pixels of chart height per activity, plus room for the axis. */
const ROW_HEIGHT = 34;
const AXIS_ALLOWANCE = 48;

/**
 * Slot utilisation across the Service Day programme (Use Case 4).
 *
 * A horizontal bar per activity, read as a meter: the solid portion is the
 * slots taken and the pale portion the slots still free, so both the absolute
 * numbers and the proportion are visible in one glance. The bars are sorted by
 * how full each activity is, which puts the ones needing volunteers at the
 * bottom of the list.
 *
 * Design decisions worth noting: one data colour and therefore no legend (the
 * heading names what is plotted); the pale remainder is a lighter step of the
 * same colour ramp, so it reads as the same meter rather than as a second
 * series; a two-pixel gap in the surface colour separates the two portions; and
 * each bar carries its own value at the tip, so the chart can be read without
 * hovering. The table beneath it is the accessible equivalent of this chart.
 */
@Component({
  selector: 'app-utilisation-chart',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './utilisation-chart.component.html',
  styleUrl: './utilisation-chart.component.css',
})
export class UtilisationChartComponent {
  private readonly destroyRef = inject(DestroyRef);

  readonly activities = input.required<ActivityView[]>();

  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  private chart?: Chart;

  /** Published activities, fullest first. */
  readonly rows = computed(() =>
    this.activities()
      .filter((activity) => activity.status === 'published')
      .slice()
      .sort((a, b) => b.availability.fillRate - a.availability.fillRate),
  );

  readonly chartHeight = computed(() => this.rows().length * ROW_HEIGHT + AXIS_ALLOWANCE);

  /** Spoken summary for screen readers, since a canvas has no readable content. */
  readonly summaryLabel = computed(() => {
    const rows = this.rows();
    const taken = rows.reduce((total, activity) => total + activity.slotsTaken, 0);
    const offered = rows.reduce((total, activity) => total + activity.maxEmployees, 0);
    return (
      `Bar chart of slot utilisation for ${rows.length} activities: ` +
      `${taken} of ${offered} slots taken in total. The table below lists the same figures.`
    );
  });

  constructor() {
    effect(() => {
      const canvas = this.canvasRef()?.nativeElement;
      const rows = this.rows();
      if (!canvas || rows.length === 0) {
        return;
      }

      if (this.chart) {
        this.chart.data = this.buildData(rows);
        this.chart.update();
      } else {
        this.chart = new Chart(canvas, this.buildConfiguration(rows));
      }
    });

    this.destroyRef.onDestroy(() => this.chart?.destroy());
  }

  private buildData(rows: ActivityView[]): ChartConfiguration<'bar'>['data'] {
    return {
      labels: rows.map((activity) => activity.activityTitle),
      datasets: [
        {
          label: 'Slots taken',
          data: rows.map((activity) => activity.slotsTaken),
          backgroundColor: COLOR_TAKEN,
          // A 2px border in the surface colour is what creates the gap
          // between the filled portion and the remainder.
          borderColor: COLOR_SURFACE,
          borderWidth: { top: 0, right: 2, bottom: 0, left: 0 },
          borderSkipped: false,
          borderRadius: { topLeft: 0, bottomLeft: 0, topRight: 2, bottomRight: 2 },
          barThickness: 18,
          maxBarThickness: 24,
        },
        {
          label: 'Slots remaining',
          data: rows.map((activity) => activity.availability.slotsRemaining),
          backgroundColor: COLOR_TRACK,
          borderWidth: 0,
          // Rounded data-end at the right, square where it meets the fill.
          borderRadius: { topLeft: 0, bottomLeft: 0, topRight: 4, bottomRight: 4 },
          barThickness: 18,
          maxBarThickness: 24,
        },
      ],
    };
  }

  private buildConfiguration(rows: ActivityView[]): ChartConfiguration<'bar'> {
    return {
      type: 'bar',
      data: this.buildData(rows),
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        // Room on the right for the value printed at each bar tip.
        layout: { padding: { right: 64, top: 4 } },
        scales: {
          x: {
            stacked: true,
            beginAtZero: true,
            title: { display: true, text: 'Volunteer slots', color: COLOR_INK },
            ticks: { color: COLOR_INK, precision: 0 },
            grid: { color: COLOR_GRID, lineWidth: 1, drawTicks: false },
            border: { color: COLOR_GRID },
          },
          y: {
            stacked: true,
            ticks: { color: COLOR_INK, autoSkip: false, crossAlign: 'far' },
            grid: { display: false },
            border: { color: COLOR_GRID },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1b2a26',
            padding: 10,
            displayColors: false,
            callbacks: {
              title: (items) => String(items[0]?.label ?? ''),
              label: (item) => {
                const activity = this.rows()[item.dataIndex];
                if (!activity) {
                  return '';
                }
                return [
                  `${activity.ngoName}`,
                  `${activity.slotsTaken} of ${activity.maxEmployees} slots taken (${activity.availability.fillRate}%)`,
                  `${activity.availability.slotsRemaining} still available`,
                ];
              },
            },
          },
        },
      },
      plugins: [this.tipLabelPlugin()],
    };
  }

  /**
   * Prints `taken / capacity` just past the end of each bar. Written inline
   * rather than pulling in a data-label package for one line of drawing.
   */
  private tipLabelPlugin(): Plugin<'bar'> {
    return {
      id: 'tipLabels',
      afterDatasetsDraw: (chart) => {
        const rows = this.rows();
        const meta = chart.getDatasetMeta(1);
        const { ctx } = chart;

        ctx.save();
        ctx.font = '600 11px Inter, system-ui, sans-serif';
        ctx.fillStyle = COLOR_INK;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        meta.data.forEach((element, index) => {
          const activity = rows[index];
          if (!activity) {
            return;
          }
          const { x, y } = element.getProps(['x', 'y'], true);
          ctx.fillText(`${activity.slotsTaken}/${activity.maxEmployees}`, x + 8, y);
        });

        ctx.restore();
      },
    };
  }
}
