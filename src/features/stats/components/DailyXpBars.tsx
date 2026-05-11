import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { parseISO, format } from 'date-fns';
import type { ChartData, ChartOptions, ScriptableContext, TooltipItem } from 'chart.js';
import '../chartSetup';
import type { DailyXp } from '../types';
import { useChartTheme, withAlpha } from '../hooks/useChartTheme';
import { createExternalTooltip } from '../utils/chartTooltip';

interface Props {
    daily: DailyXp[];
}

export function DailyXpBars({ daily }: Props) {
    const theme = useChartTheme();

    const { data, options } = useMemo(() => {
        const points = daily.map((d) => ({ x: parseISO(d.dateISO).getTime(), y: d.xp, checkins: d.checkins }));

        const chartData: ChartData<'bar', { x: number; y: number; checkins: number }[]> = {
            datasets: [
                {
                    label: 'xp',
                    data: points,
                    // Bar colours follow the same "green = gained XP, red =
                    // lost XP" scheme used elsewhere on the page, so the
                    // eye learns one visual shorthand for all XP numbers.
                    backgroundColor: (ctx: ScriptableContext<'bar'>) => {
                        const raw = ctx.raw as { y: number } | undefined;
                        if (!raw || raw.y < 0) return theme.error;
                        return theme.correct;
                    },
                    hoverBackgroundColor: (ctx: ScriptableContext<'bar'>) => {
                        const raw = ctx.raw as { y: number } | undefined;
                        if (!raw || raw.y < 0) return theme.error;
                        return theme.correct;
                    },
                    borderRadius: 3,
                    borderSkipped: false,
                    // Trendline visualises the weekly slope even when daily
                    // bars bounce around — same idea as MT's accountActivity.
                    trendlineLinear: {
                        colorMin: withAlpha(theme.subRgb, 0.5),
                        colorMax: withAlpha(theme.subRgb, 0.5),
                        lineStyle: 'dotted',
                        width: 1.5,
                    },
                } as never,
            ],
        };

        const chartOptions: ChartOptions<'bar'> = {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 0 },
            interaction: {
                mode: 'index',
                intersect: false,
                axis: 'x',
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day',
                        displayFormats: { day: 'd MMM' },
                        tooltipFormat: 'dd MMM yyyy',
                    },
                    offset: true,
                    grid: { display: false, drawTicks: false },
                    border: { display: false },
                    ticks: {
                        color: theme.sub,
                        maxRotation: 0,
                        autoSkipPadding: 16,
                    },
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: withAlpha(theme.subAltRgb, 0.65),
                        drawTicks: false,
                        lineWidth: 1,
                    },
                    border: { display: false },
                    ticks: {
                        color: theme.sub,
                        padding: 8,
                        precision: 0,
                    },
                    title: {
                        display: true,
                        text: 'xp',
                        color: theme.sub,
                    },
                },
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    enabled: false,
                    external: createExternalTooltip<'bar'>((items: TooltipItem<'bar'>[]) => {
                        const raw = items[0].raw as { x: number; y: number; checkins: number };
                        return {
                            title: format(new Date(raw.x), 'EEEE, d MMM'),
                            rows: [
                                { label: 'xp', value: String(raw.y) },
                                { label: 'check-ins', value: String(raw.checkins) },
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
        <section className="py-2">
            <div className="text-xs uppercase tracking-wider text-text-secondary font-mono mb-4 px-1">
                xp per day (last {daily.length} days)
            </div>
            <div className="relative h-[220px]">
                <Bar data={data} options={options} />
            </div>
        </section>
    );
}
