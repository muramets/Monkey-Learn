/**
 * One-time Chart.js global registration. Mirrors the MonkeyType setup in
 * `monkeytype/frontend/src/ts/controllers/chart-controller.ts` so charts
 * imported from this folder behave identically to MT's own account charts.
 *
 * Side-effect import — one call sufficient anywhere in the bundle.
 */
import {
    BarController,
    BarElement,
    CategoryScale,
    Chart,
    Filler,
    LineController,
    LineElement,
    LinearScale,
    PointElement,
    TimeScale,
    TimeSeriesScale,
    Tooltip,
    Legend,
    type AnimationSpec,
} from 'chart.js';
import chartAnnotation from 'chartjs-plugin-annotation';
import chartTrendline from 'chartjs-plugin-trendline';
import 'chartjs-adapter-date-fns';

Chart.register(
    BarController,
    BarElement,
    CategoryScale,
    Filler,
    LinearScale,
    LineController,
    LineElement,
    PointElement,
    TimeScale,
    TimeSeriesScale,
    Tooltip,
    Legend,
    chartAnnotation,
    chartTrendline,
);

(Chart.defaults.animation as AnimationSpec<'line' | 'bar'>).duration = 0;
Chart.defaults.elements.line.tension = 0.5;
Chart.defaults.elements.line.fill = 'origin';
Chart.defaults.font.family = 'Roboto Mono, ui-monospace, monospace';
Chart.defaults.font.size = 11;
