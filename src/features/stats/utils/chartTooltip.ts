import type { Chart, TooltipItem, TooltipModel } from 'chart.js';

/**
 * Factory that produces a Chart.js `external` tooltip renderer matching the
 * app's Radix `TooltipContent` look (`bg-[#101010]/95`, rounded-md, text-xs,
 * shadow-xl). Keeps hover feedback visually continuous with the rest of the
 * app instead of the default Chart.js card.
 *
 * The tooltip DOM lives outside the chart's clip path (attached to body) so
 * it never gets cropped at the canvas edge.
 */

export type TooltipRow = { label: string; value: string; dotColor?: string };
export type RenderRows<TType extends 'line' | 'bar' | 'scatter'> = (
    items: TooltipItem<TType>[]
) => { title: string; rows: TooltipRow[] };

const TOOLTIP_ID = 'ml-chartjs-tooltip';

function getOrCreateTooltipEl(): HTMLDivElement {
    let el = document.getElementById(TOOLTIP_ID) as HTMLDivElement | null;
    if (el) return el;

    el = document.createElement('div');
    el.id = TOOLTIP_ID;
    // Match Radix TooltipContent classes. Kept as inline styles so a chart
    // can render tooltips before Tailwind JIT picks up new class combos.
    Object.assign(el.style, {
        position: 'absolute',
        pointerEvents: 'none',
        background: 'rgba(16, 16, 16, 0.95)',
        color: '#ffffff',
        fontFamily: 'Roboto Mono, ui-monospace, monospace',
        fontSize: '12px',
        lineHeight: '1.4',
        padding: '8px 12px',
        borderRadius: '6px',
        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.3), 0 8px 10px -6px rgb(0 0 0 / 0.3)',
        opacity: '0',
        transform: 'translate(-50%, calc(-100% - 8px))',
        // Position transition makes the tooltip glide between data points
        // instead of snapping — reads as a cursor magnet. Kept short so
        // fast horizontal sweeps don't leave it lagging visibly behind.
        transition: 'opacity 150ms ease-out, left 120ms cubic-bezier(0.25, 0.46, 0.45, 0.94), top 120ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        zIndex: '9999',
        whiteSpace: 'nowrap',
    } satisfies Partial<CSSStyleDeclaration>);
    document.body.appendChild(el);
    return el;
}

function renderContent(title: string, rows: TooltipRow[]): string {
    const rowHtml = rows
        .map(
            (r) => `
                <div style="display:flex;align-items:center;gap:8px;justify-content:space-between;">
                    <span style="display:flex;align-items:center;gap:6px;color:rgba(255,255,255,0.75);">
                        ${r.dotColor ? `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${r.dotColor};"></span>` : ''}
                        <span>${r.label}</span>
                    </span>
                    <span style="color:#fff;font-weight:500;">${r.value}</span>
                </div>`
        )
        .join('');

    return `
        ${title ? `<div style="font-size:11px;color:rgba(255,255,255,0.55);margin-bottom:4px;text-transform:uppercase;letter-spacing:0.05em;">${title}</div>` : ''}
        <div style="display:flex;flex-direction:column;gap:4px;min-width:140px;">${rowHtml}</div>
    `;
}

export function createExternalTooltip<TType extends 'line' | 'bar' | 'scatter'>(
    render: RenderRows<TType>
) {
    return (context: { chart: Chart; tooltip: TooltipModel<TType> }): void => {
        const el = getOrCreateTooltipEl();
        const { tooltip, chart } = context;

        if (tooltip.opacity === 0) {
            el.style.opacity = '0';
            return;
        }

        const items = tooltip.dataPoints as TooltipItem<TType>[];
        if (!items || items.length === 0) {
            el.style.opacity = '0';
            return;
        }

        const { title, rows } = render(items);
        el.innerHTML = renderContent(title, rows);

        const canvasRect = chart.canvas.getBoundingClientRect();
        const x = canvasRect.left + window.scrollX + tooltip.caretX;
        const y = canvasRect.top + window.scrollY + tooltip.caretY;
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        el.style.opacity = '1';
    };
}
