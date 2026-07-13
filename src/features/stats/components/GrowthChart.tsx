import { useMemo, useState } from 'react';
import { Line } from 'react-chartjs-2';
import type { ChartData, ChartOptions, TooltipItem } from 'chart.js';
import { format } from 'date-fns';
import '../chartSetup';
import type { InnerfaceSeries } from '../types';
import { useChartTheme, withAlpha } from '../hooks/useChartTheme';
import { colorForSeries } from '../utils/seriesPalette';
import { createExternalTooltip } from '../utils/chartTooltip';

interface Props {
    series: InnerfaceSeries[];
    beginAtZero?: boolean;
}

/**
 * MonkeyType-style history chart. Interaction model ported from the MT
 * account page: hovering a line highlights the whole line (nearest-mode,
 * solid hover dot on the closest point, single-series tooltip); clicking
 * pins it — pinned lines stay emphasised with visible points while the
 * rest dim, and any number of lines can be pinned at once.
 */
export function GrowthChart({ series, beginAtZero = false }: Props) {
    const theme = useChartTheme();
    // Multiple lines can be pinned simultaneously — click toggles each one
    // independently. Empty set = nothing pinned.
    const [pinnedIds, setPinnedIds] = useState<Set<string | number>>(new Set());
    const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
    const hasSelection = pinnedIds.size > 0;

    const togglePin = (id: string | number) =>
        setPinnedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });

    // Resolve colour per series once — referenced both by Chart.js datasets
    // and the HTML legend so swatches match the line they represent.
    const coloured = useMemo(
        () => series.map((s, idx) => ({ ...s, color: colorForSeries(s.innerface, idx, theme.main) })),
        [series, theme.main]
    );

    const { data, options } = useMemo(() => {
        const dimmed = withAlpha(theme.subRgb, 0.35);

        const datasets = coloured.map((s, idx) => {
            const isPinned = pinnedIds.has(s.innerface.id);
            const isHovered = hoveredIdx === idx;

            // Hover always lifts a line to full colour — even one dimmed by
            // an active selection — so more lines can be found and pinned.
            const emphasised = isPinned || isHovered;
            const strokeColor = emphasised || !hasSelection ? s.color : dimmed;

            return {
                label: s.innerface.name,
                data: s.points.map((p) => ({ x: p.t, y: p.score })),
                borderColor: strokeColor,
                backgroundColor: strokeColor,
                borderWidth: emphasised ? 3 : hasSelection ? 1 : 2,
                pointRadius: isPinned ? 2.5 : 0,
                pointBackgroundColor: strokeColor,
                pointBorderColor: strokeColor,
                // MT hover dot: solid, no ring, eased in via the radius
                // animation configured below.
                pointHoverRadius: 4,
                pointHoverBackgroundColor: s.color,
                pointHoverBorderWidth: 0,
                pointHoverBorderColor: s.color,
                pointHitRadius: 12,
                fill: false,
                tension: 0.5,
                spanGaps: true,
                order: isPinned ? 0 : isHovered ? 1 : 10,
            };
        });

        const chartData: ChartData<'line', { x: number; y: number }[]> = { datasets };

        const chartOptions: ChartOptions<'line'> = {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 0 },
            // Per-property animation: the hover radius toggle eases over
            // 200ms so hover dots fade in smoothly instead of popping.
            animations: {
                radius: { duration: 200, easing: 'easeOutCubic' },
            },
            // MT account chart interaction: nearest line under the cursor,
            // no intersect requirement.
            interaction: { mode: 'nearest', intersect: false },
            hover: { mode: 'nearest', intersect: false },
            onClick: (_evt, elements) => {
                const hit = elements[0];
                if (!hit) return;
                const id = coloured[hit.datasetIndex]?.innerface.id;
                if (id !== undefined) togglePin(id);
            },
            onHover: (_evt, elements, chart) => {
                const idx = elements.length > 0 ? elements[0].datasetIndex : null;
                setHoveredIdx((prev) => (prev === idx ? prev : idx));
                (chart.canvas.style as CSSStyleDeclaration).cursor = elements.length
                    ? 'pointer'
                    : 'default';
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day',
                        displayFormats: { day: 'd MMM', hour: 'HH:mm' },
                        tooltipFormat: 'dd MMM yyyy HH:mm',
                    },
                    grid: { display: false, drawTicks: false },
                    border: { display: false },
                    ticks: { color: theme.sub, maxRotation: 0, autoSkipPadding: 16 },
                },
                y: {
                    beginAtZero,
                    grid: { color: theme.subAlt, drawTicks: false, lineWidth: 1 },
                    border: { display: false },
                    ticks: { color: theme.sub, padding: 8 },
                    title: { display: true, text: 'score', color: theme.sub },
                },
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    enabled: false,
                    external: createExternalTooltip<'line'>((items: TooltipItem<'line'>[]) => {
                        // Nearest mode — a single point of a single line.
                        const it = items[0];
                        const s = coloured[it.datasetIndex];
                        const p = it.raw as { x: number; y: number };
                        return {
                            title: format(new Date(p.x), 'd MMM yyyy · HH:mm'),
                            rows: [
                                {
                                    label: s?.innerface.name ?? it.dataset.label ?? '',
                                    value: p.y.toFixed(2),
                                    dotColor: s?.color ?? theme.main,
                                },
                            ],
                        };
                    }),
                },
            },
        };

        return { data: chartData, options: chartOptions };
    }, [coloured, pinnedIds, hasSelection, hoveredIdx, theme, beginAtZero]);

    const empty = coloured.length === 0 || coloured.every((s) => s.points.length < 2);

    return (
        <section>
            <div className="flex items-baseline justify-end mb-2 px-1">
                <div className="text-xs text-sub font-mono">
                    {hasSelection
                        ? `${pinnedIds.size} pinned · click to toggle`
                        : 'hover to highlight · click to pin'}
                </div>
            </div>

            {empty ? (
                <div className="text-sub font-mono text-sm py-16 text-center">
                    no check-ins yet — apply a protocol to start your graph
                </div>
            ) : (
                <>
                    <div
                        className="relative h-[400px]"
                        onMouseLeave={() => setHoveredIdx(null)}
                    >
                        <Line data={data} options={options} />
                    </div>
                    <Legend
                        items={coloured}
                        pinnedIds={pinnedIds}
                        hasSelection={hasSelection}
                        onToggle={togglePin}
                        onHover={(idx) => setHoveredIdx(idx)}
                    />
                </>
            )}
        </section>
    );
}

interface LegendProps {
    items: (InnerfaceSeries & { color: string })[];
    pinnedIds: Set<string | number>;
    hasSelection: boolean;
    onToggle: (id: string | number) => void;
    onHover: (idx: number | null) => void;
}

function Legend({ items, pinnedIds, hasSelection, onToggle, onHover }: LegendProps) {
    return (
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 font-mono text-xs">
            {items.map((s, idx) => {
                const isPinned = pinnedIds.has(s.innerface.id);
                const isDimmed = hasSelection && !isPinned;
                const sign = s.delta > 0 ? '+' : s.delta < 0 ? '' : '±';
                const deltaClass =
                    s.delta > 0 ? 'text-correct' : s.delta < 0 ? 'text-error' : 'text-sub';
                return (
                    <button
                        key={String(s.innerface.id)}
                        type="button"
                        onClick={() => onToggle(s.innerface.id)}
                        onMouseEnter={() => onHover(idx)}
                        onMouseLeave={() => onHover(null)}
                        className={`flex items-center gap-2 px-2 py-1 rounded transition-opacity duration-150 bg-transparent border-none cursor-pointer select-none ${
                            isDimmed ? 'opacity-40 hover:opacity-70' : 'opacity-100'
                        }`}
                    >
                        <span
                            className="inline-block w-3 h-[3px] rounded"
                            style={{
                                background: s.color,
                                boxShadow: isPinned ? `0 0 0 1px ${s.color}` : undefined,
                            }}
                        />
                        <span className="text-text-primary">{s.innerface.name}</span>
                        <span className={deltaClass}>
                            {sign}
                            {s.delta.toFixed(2)}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
