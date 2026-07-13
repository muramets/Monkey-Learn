import { useMemo } from 'react';
import { Chart } from 'react-chartjs-2';
import { parseISO, format } from 'date-fns';
import type { ChartData, ChartOptions, ScriptableContext, TooltipItem } from 'chart.js';
import '../chartSetup';
import type { DailyXp } from '../types';
import { useChartTheme, withAlpha } from '../hooks/useChartTheme';
import { createExternalTooltip } from '../utils/chartTooltip';

interface Props {
    daily: DailyXp[];
}

/**
 * MonkeyType "activity and progress" chart, ported 1:1: XP-per-day bars in
 * the theme accent with a dotted sub-colored trendline, plus a check-ins
 * line on a second axis in the sub color. 200px tall, vertical grid only —
 * both y axes drop their grids exactly like MT's daily activity chart.
 */
export function DailyXpBars({ daily }: Props) {
    const theme = useChartTheme();

    const { data, options } = useMemo(() => {
        const labels = daily.map((d) => parseISO(d.dateISO).getTime());

        const chartData: ChartData<'bar', number[]> = {
            labels,
            datasets: [
                {
                    type: 'bar' as const,
                    yAxisID: 'xp',
                    label: 'xp',
                    data: daily.map((d) => d.xp),
                    // MT paints activity bars in the theme accent; we keep
                    // error color for negative days so lost XP stays legible.
                    backgroundColor: (ctx: ScriptableContext<'bar'>) =>
                        (ctx.raw as number) < 0 ? theme.error : theme.main,
                    order: 3,
                    trendlineLinear: {
                        colorMin: theme.sub,
                        colorMax: theme.sub,
                        lineStyle: 'dotted',
                        width: 2,
                    },
                } as never,
                // Chart.js mixed-type dataset — typed as never because the
                // ChartData generic is pinned to 'bar'.
                {
                    type: 'line' as const,
                    yAxisID: 'checkins',
                    label: 'check-ins',
                    data: daily.map((d) => d.checkins),
                    borderColor: theme.sub,
                    pointBackgroundColor: theme.sub,
                    pointBorderColor: theme.sub,
                    pointRadius: 2,
                    borderWidth: 2,
                    tension: 0,
                    fill: false,
                    order: 2,
                } as never,
            ],
        };

        const chartOptions: ChartOptions<'bar'> = {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 0 },
            hover: { mode: 'nearest', intersect: false },
            interaction: { mode: 'index', intersect: false, axis: 'x' },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day',
                        displayFormats: { day: 'd MMM' },
                    },
                    bounds: 'ticks',
                    offset: true,
                    grid: { color: withAlpha(theme.subAltRgb, 0.65), drawTicks: false },
                    border: { display: false },
                    ticks: {
                        color: theme.sub,
                        maxRotation: 0,
                        autoSkip: true,
                        autoSkipPadding: 20,
                    },
                },
                xp: {
                    axis: 'y',
                    position: 'left',
                    beginAtZero: true,
                    grid: { display: false, drawTicks: false },
                    border: { display: false },
                    ticks: { color: theme.sub, padding: 8, precision: 0, autoSkipPadding: 20 },
                    title: { display: true, text: 'xp earned', color: theme.sub },
                },
                checkins: {
                    axis: 'y',
                    position: 'right',
                    beginAtZero: true,
                    grid: { display: false, drawTicks: false },
                    border: { display: false },
                    ticks: { color: theme.sub, padding: 8, precision: 0, stepSize: 1, autoSkipPadding: 20 },
                    title: { display: true, text: 'check-ins', color: theme.sub },
                },
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    enabled: false,
                    filter: (item) => item.datasetIndex === 0,
                    external: createExternalTooltip<'bar'>((items: TooltipItem<'bar'>[]) => {
                        const idx = items[0].dataIndex;
                        const day = daily[idx];
                        if (!day) return { title: '', rows: [] };
                        return {
                            title: format(parseISO(day.dateISO), 'EEEE, dd MMM yyyy'),
                            rows: [
                                { label: 'xp earned', value: String(day.xp) },
                                { label: 'check-ins', value: String(day.checkins) },
                            ],
                        };
                    }),
                },
            },
        };

        return { data: chartData, options: chartOptions };
    }, [daily, theme]);

    if (daily.length === 0) return null;

    return (
        <div className="relative h-[200px]">
            <Chart type="bar" data={data} options={options} />
        </div>
    );
}
