import { useEffect, useMemo, useRef, useState } from 'react';
import { Line } from 'react-chartjs-2';
import type { ChartData, ChartOptions, Plugin, TooltipItem, Chart as ChartJS } from 'chart.js';
import { format } from 'date-fns';
import '../chartSetup';
import type { InnerfaceSeries } from '../types';
import { useChartTheme, withAlpha } from '../hooks/useChartTheme';
import { colorForSeries } from '../utils/seriesPalette';
import { createExternalTooltip } from '../utils/chartTooltip';

const BIRTH_FADE_PX = 60;

/**
 * Fades the opening 60px of every line into transparency via a
 * `destination-out` gradient stroke — lines appear to emerge from nothing
 * at their birth anchor. Fade is static (no hover reveal) so there's no
 * per-frame recomputation to jitter.
 */
const birthFadePlugin: Plugin<'line'> = {
    id: 'birthFade',
    afterDatasetsDraw(chart) {
        const ctx = chart.ctx;
        chart.data.datasets.forEach((ds, dsIdx) => {
            const meta = chart.getDatasetMeta(dsIdx);
            if (meta.hidden) return;
            const els = meta.data;
            if (els.length < 2) return;
            const p0 = els[0] as unknown as { x: number; y: number };
            const p1 = els[1] as unknown as { x: number; y: number };
            const dx = p1.x - p0.x;
            const dy = p1.y - p0.y;
            const len = Math.hypot(dx, dy);
            if (len === 0) return;

            const fadeLen = Math.min(BIRTH_FADE_PX, len);
            const fx = p0.x + (dx * fadeLen) / len;
            const fy = p0.y + (dy * fadeLen) / len;
            const baseWidth = typeof ds.borderWidth === 'number' ? ds.borderWidth : 2;

            ctx.save();
            ctx.globalCompositeOperation = 'destination-out';
            const grad = ctx.createLinearGradient(p0.x, p0.y, fx, fy);
            grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.strokeStyle = grad;
            ctx.lineWidth = baseWidth + 3;
            // `butt` keeps the fade endpoint flush with the gradient end;
            // `round` leaves a half-disc of erase that can read as a dot.
            ctx.lineCap = 'butt';
            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(fx, fy);
            ctx.stroke();
            ctx.restore();
        });
    },
};

interface Props {
    series: InnerfaceSeries[];
    days: number;
}

const SPOTLIGHT_RADIUS_PX = 180;
const SPOTLIGHT_PARKED_X = -10000;
const SPOTLIGHT_PARKED_Y = -10000;

/**
 * Spotlight state — tracked imperatively through refs and a requestAnimationFrame
 * loop so the chart can ease toward the cursor over ~300ms (matching the
 * decay timing of the `ProtocolRow` hover glow) without triggering React
 * re-renders.
 */
interface SpotlightState {
    // Smoothed (animated) position. Drawn each frame. When the cursor
    // isn't over the chart this eases toward a parked off-canvas point
    // so the spotlight uniformly desaturates every line (= grey default).
    x: number;
    y: number;
}

/**
 * Pixel-accurate spotlight. Chart.js draws lines in their true hues; this
 * plugin then desaturates them selectively around the cursor.
 *
 * Implementation detail: a naive `globalCompositeOperation: 'saturation'`
 * fill leaks opaque grey into the chart's transparent pixels (the blend
 * has no "destination colour" to blend with, so the source wins). To
 * keep the page background visible through those pixels we bounce the
 * blend through an offscreen canvas and then re-mask by the original
 * canvas' alpha channel via `destination-in`. Result: saturated lines,
 * untouched transparent background.
 */
function createSpotlightPlugin(getState: () => SpotlightState): Plugin<'line'> {
    let temp: HTMLCanvasElement | null = null;
    let tctx: CanvasRenderingContext2D | null = null;

    return {
        id: 'spotlight',
        afterDatasetsDraw(chart) {
            const s = getState();
            const ctx = chart.ctx;
            const area = chart.chartArea;
            const cw = chart.canvas.width;
            const ch = chart.canvas.height;

            // Chart.js pre-applies a DPR scale on its ctx, so `chart.chartArea`
            // is in CSS pixels but `chart.canvas.width/height` are in device
            // pixels. Everything we do in the offscreen buffer happens in
            // device pixels and we temporarily reset the main ctx's
            // transform so `drawImage` aligns pixel-for-pixel.
            const dpr = ch > 0 && chart.canvas.clientHeight > 0 ? ch / chart.canvas.clientHeight : 1;
            const ax = area.left * dpr;
            const ay = area.top * dpr;
            const aw = (area.right - area.left) * dpr;
            const ah = (area.bottom - area.top) * dpr;

            if (!temp) {
                temp = document.createElement('canvas');
                tctx = temp.getContext('2d');
            }
            if (!tctx) return;
            if (temp.width !== cw) temp.width = cw;
            if (temp.height !== ch) temp.height = ch;

            // 1. Snapshot the already-drawn chart into the offscreen buffer.
            tctx.setTransform(1, 0, 0, 1, 0, 0);
            tctx.clearRect(0, 0, cw, ch);
            tctx.drawImage(chart.canvas, 0, 0);

            // 2a. Saturation pass: desaturate lines outside the spotlight.
            //     May "leak" opaque grey into transparent pixels which we
            //     undo via destination-in in step 3.
            tctx.save();
            tctx.globalCompositeOperation = 'saturation';
            const satGrad = tctx.createRadialGradient(
                s.x * dpr,
                s.y * dpr,
                0,
                s.x * dpr,
                s.y * dpr,
                SPOTLIGHT_RADIUS_PX * dpr
            );
            satGrad.addColorStop(0, 'rgba(128, 128, 128, 0)');
            satGrad.addColorStop(0.25, 'rgba(128, 128, 128, 0)');
            satGrad.addColorStop(0.6, 'rgba(128, 128, 128, 0.55)');
            satGrad.addColorStop(0.9, 'rgba(128, 128, 128, 0.95)');
            satGrad.addColorStop(1, 'rgba(128, 128, 128, 1)');
            tctx.fillStyle = satGrad;
            tctx.fillRect(ax, ay, aw, ah);
            tctx.restore();

            // 2b. Brightness pass: lift luminosity near the cursor so the
            //     low-contrast grid reads as more prominent under the
            //     "lantern" without affecting areas outside the radius.
            tctx.save();
            tctx.globalCompositeOperation = 'lighter';
            const lightGrad = tctx.createRadialGradient(
                s.x * dpr,
                s.y * dpr,
                0,
                s.x * dpr,
                s.y * dpr,
                SPOTLIGHT_RADIUS_PX * dpr
            );
            lightGrad.addColorStop(0, 'rgba(255, 255, 255, 0.09)');
            lightGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.03)');
            lightGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
            tctx.fillStyle = lightGrad;
            tctx.fillRect(ax, ay, aw, ah);
            tctx.restore();

            // 3. Re-mask offscreen by the original canvas' alpha channel:
            //    wherever the main canvas is transparent, the offscreen
            //    goes transparent too. Lines + grid keep their pixels.
            tctx.save();
            tctx.globalCompositeOperation = 'destination-in';
            tctx.drawImage(chart.canvas, 0, 0);
            tctx.restore();

            // 4. Blit the result back, working in device pixels so we're
            //    not fighting Chart.js' own scale transform.
            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(ax, ay, aw, ah);
            ctx.drawImage(temp, ax, ay, aw, ah, ax, ay, aw, ah);
            ctx.restore();
        },
    };
}

export function GrowthChart({ series, days }: Props) {
    const theme = useChartTheme();
    // Multiple lines can be pinned simultaneously — click toggles each one
    // independently. Empty set = nothing pinned = spotlight mode is on.
    const [pinnedIds, setPinnedIds] = useState<Set<string | number>>(new Set());
    const hasSelection = pinnedIds.size > 0;

    const chartRef = useRef<ChartJS<'line'>>(null);
    // Spotlight position: a "parked" point far outside the chart is the
    // neutral state — the whole chart sits beyond the gradient's rim so
    // every line reads as grey. Hovering nudges the target onto the
    // cursor; the rAF loop eases the drawn state toward it over ~300ms,
    // giving the same decay feel as the ProtocolRow hover glow.
    const targetRef = useRef<{ x: number; y: number }>({ x: SPOTLIGHT_PARKED_X, y: SPOTLIGHT_PARKED_Y });
    const stateRef = useRef<SpotlightState>({ x: SPOTLIGHT_PARKED_X, y: SPOTLIGHT_PARKED_Y });

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
        () => series.map((s, idx) => ({ ...s, color: colorForSeries(s.innerface, idx) })),
        [series]
    );

    // Plugins run at draw time. Getter closures access the mutable refs
    // then — not during render — so ESLint's ref-in-render warning is
    // spurious here.
    /* eslint-disable react-hooks/refs */
    const plugins = useMemo(() => {
        const arr: Plugin<'line'>[] = [birthFadePlugin];
        if (!hasSelection) {
            arr.push(createSpotlightPlugin(() => stateRef.current));
        }
        return arr;
    }, [hasSelection]);
    /* eslint-enable react-hooks/refs */

    // Spotlight animation — asymmetric timing to match the feel of the
    // ProtocolRow hover glow:
    //  - Appearance (mouse enters / moves): instant snap. Users expect
    //    the spotlight to sit under the cursor with no catch-up lag.
    //  - Decay (mouse leaves): eased over ~300ms via exponential damping.
    //    Same decay character as Tailwind `duration-300` on the action
    //    cards — the lantern "turns off" gradually.
    useEffect(() => {
        if (hasSelection) return;
        const canvas = chartRef.current?.canvas;
        if (!canvas) return;

        const DAMP = 0.15;
        const EPSILON = 0.5;
        let rafId: number | null = null;

        const step = () => {
            const target = targetRef.current;
            const s = stateRef.current;
            s.x += (target.x - s.x) * DAMP;
            s.y += (target.y - s.y) * DAMP;

            const settled =
                Math.abs(target.x - s.x) < EPSILON && Math.abs(target.y - s.y) < EPSILON;

            chartRef.current?.update('none');
            rafId = settled ? null : requestAnimationFrame(step);
        };
        const kick = () => {
            if (rafId === null) rafId = requestAnimationFrame(step);
        };

        const onMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            const pos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
            targetRef.current = pos;
            // Snap state to cursor — instant appear / follow.
            stateRef.current.x = pos.x;
            stateRef.current.y = pos.y;
            // Cancel any in-flight decay animation; we're pinned to cursor.
            if (rafId !== null) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
            chartRef.current?.update('none');
        };
        const onLeave = () => {
            // Park the target far off-chart; the rAF loop eases the drawn
            // position toward it at the decay cadence.
            targetRef.current = { x: SPOTLIGHT_PARKED_X, y: SPOTLIGHT_PARKED_Y };
            kick();
        };

        canvas.addEventListener('mousemove', onMove);
        canvas.addEventListener('mouseleave', onLeave);
        // Ensure the first frame renders the parked state even before any
        // mouse event fires (otherwise lines would flash in colour on load).
        chartRef.current?.update('none');
        return () => {
            canvas.removeEventListener('mousemove', onMove);
            canvas.removeEventListener('mouseleave', onLeave);
            if (rafId !== null) cancelAnimationFrame(rafId);
        };
    }, [hasSelection]);

    const { data, options } = useMemo(() => {
        const datasets = coloured.map((s) => {
            const isPinned = pinnedIds.has(s.innerface.id);
            // In spotlight mode every line is drawn in its true colour;
            // the spotlight plugin desaturates per-pixel based on cursor
            // distance. In selection mode, pinned → colour, else → grey.
            const strokeColor = hasSelection
                ? isPinned
                    ? s.color
                    : withAlpha(theme.subRgb, 0.35)
                : s.color;

            return {
                label: s.innerface.name,
                data: s.points.map((p) => ({ x: p.t, y: p.score })),
                borderColor: strokeColor,
                backgroundColor: strokeColor,
                borderWidth: isPinned ? 3 : hasSelection ? 1 : 2,
                pointRadius: isPinned ? 2.5 : 0,
                pointBackgroundColor: strokeColor,
                pointBorderColor: strokeColor,
                pointHoverRadius: 4,
                pointHoverBackgroundColor: strokeColor,
                // No hover ring — user prefers a solid dot fading in over
                // the outline look. Radius animation (configured below)
                // eases the transition smoothly.
                pointHoverBorderWidth: 0,
                pointHoverBorderColor: strokeColor,
                fill: false,
                tension: 0.5,
                spanGaps: true,
                order: isPinned ? 0 : 10,
            };
        });

        const chartData: ChartData<'line', { x: number; y: number }[]> = { datasets };

        const chartOptions: ChartOptions<'line'> = {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 0 },
            // Per-property animation: geometric changes (including the
            // hover radius toggle) ease over 200ms so hover dots fade in
            // smoothly instead of popping. Line paths stay unanimated —
            // snappy data updates.
            animations: {
                radius: { duration: 200, easing: 'easeOutCubic' },
            },
            interaction: { mode: 'index', intersect: false, axis: 'x' },
            hover: { mode: 'nearest', intersect: false },
            onClick: (evt, _active, chart) => {
                const elements = chart.getElementsAtEventForMode(
                    evt as unknown as Event,
                    'nearest',
                    { intersect: false },
                    false
                );
                const hit = elements[0];
                if (!hit) return;
                const id = coloured[hit.datasetIndex]?.innerface.id;
                if (id !== undefined) togglePin(id);
            },
            onHover: (_evt, elements, chart) => {
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
                    // Barely-visible default (sub-alt is ~6 units brighter
                    // than bg on serika_dark). The spotlight plugin gives
                    // the grid a subtle brightness lift near the cursor.
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
                        const first = items[0];
                        const raw = first.raw as { x: number };
                        const title = format(new Date(raw.x), 'd MMM yyyy · HH:mm');
                        // When pinning, float pinned rows to the top of the
                        // tooltip so users scan their focus first.
                        const sorted = hasSelection
                            ? [...items].sort((a, b) => {
                                const aPinned = pinnedIds.has(coloured[a.datasetIndex]?.innerface.id ?? '') ? -1 : 0;
                                const bPinned = pinnedIds.has(coloured[b.datasetIndex]?.innerface.id ?? '') ? -1 : 0;
                                return aPinned - bPinned;
                            })
                            : items;
                        const rows = sorted.map((it) => {
                            const s = coloured[it.datasetIndex];
                            const p = it.raw as { x: number; y: number };
                            return {
                                label: s?.innerface.name ?? it.dataset.label ?? '',
                                value: p.y.toFixed(2),
                                dotColor: s?.color ?? theme.main,
                            };
                        });
                        return { title, rows };
                    }),
                },
            },
        };

        return { data: chartData, options: chartOptions };
    }, [coloured, pinnedIds, hasSelection, theme]);

    const empty = coloured.length === 0 || coloured.every((s) => s.points.length < 2);

    return (
        <section className="py-2">
            <div className="flex items-baseline justify-between mb-4 px-1">
                <div className="text-xs uppercase tracking-wider text-text-secondary font-mono">
                    growth (last {days} days)
                </div>
                <div className="text-xs text-text-secondary font-mono">
                    {hasSelection
                        ? `${pinnedIds.size} pinned · click to toggle`
                        : 'hover to reveal · click to pin'}
                </div>
            </div>

            {empty ? (
                <div className="text-text-secondary font-mono text-sm py-16 text-center">
                    no check-ins yet — apply a protocol to start your graph
                </div>
            ) : (
                <>
                    <div className="relative h-[360px]">
                        <Line
                            ref={chartRef}
                            data={data}
                            options={options}
                            plugins={plugins}
                        />
                    </div>
                    <Legend
                        items={coloured}
                        pinnedIds={pinnedIds}
                        hasSelection={hasSelection}
                        onToggle={togglePin}
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
}

function Legend({ items, pinnedIds, hasSelection, onToggle }: LegendProps) {
    return (
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 font-mono text-xs">
            {items.map((s) => {
                const isPinned = pinnedIds.has(s.innerface.id);
                const isDimmed = hasSelection && !isPinned;
                const sign = s.delta > 0 ? '+' : s.delta < 0 ? '' : '±';
                const deltaClass =
                    s.delta > 0 ? 'text-correct' : s.delta < 0 ? 'text-error' : 'text-text-secondary';
                return (
                    <button
                        key={String(s.innerface.id)}
                        type="button"
                        onClick={() => onToggle(s.innerface.id)}
                        className={`flex items-center gap-2 px-2 py-1 rounded-md transition-opacity duration-150 bg-transparent border-none cursor-pointer select-none ${
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

