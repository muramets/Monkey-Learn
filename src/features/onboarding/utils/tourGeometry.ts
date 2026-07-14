/**
 * Pure placement math for the tour spotlight and panel. Everything takes
 * plain rects so it stays unit-testable without a DOM.
 */

export interface Rect {
    top: number;
    left: number;
    width: number;
    height: number;
}

export interface Size {
    width: number;
    height: number;
}

export type Placement = 'top' | 'bottom' | 'left' | 'right';

const GAP = 14;
const VIEWPORT_PADDING = 12;

/** Expands the target rect so the spotlight hole breathes around it. */
export function spotlightRect(target: Rect, padding = 8): Rect {
    return {
        top: target.top - padding,
        left: target.left - padding,
        width: target.width + padding * 2,
        height: target.height + padding * 2,
    };
}

function fits(placement: Placement, target: Rect, panel: Size, viewport: Size): boolean {
    switch (placement) {
        case 'bottom':
            return target.top + target.height + GAP + panel.height <= viewport.height - VIEWPORT_PADDING;
        case 'top':
            return target.top - GAP - panel.height >= VIEWPORT_PADDING;
        case 'right':
            return target.left + target.width + GAP + panel.width <= viewport.width - VIEWPORT_PADDING;
        case 'left':
            return target.left - GAP - panel.width >= VIEWPORT_PADDING;
    }
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), Math.max(min, max));
}

/**
 * Positions the panel next to the target: preferred side first, then the
 * first side with room, finally centered under the viewport bottom as a
 * safe fallback (small screens). Cross-axis is centered on the target and
 * clamped into the viewport.
 */
export function placePanel(
    target: Rect,
    panel: Size,
    viewport: Size,
    preferred: Placement = 'bottom'
): { top: number; left: number; placement: Placement } {
    const order: Placement[] = [preferred, 'bottom', 'top', 'right', 'left'];
    const placement = order.find((p) => fits(p, target, panel, viewport));

    if (!placement) {
        // Tiny viewport: pin to the bottom edge, centered.
        return {
            top: viewport.height - panel.height - VIEWPORT_PADDING,
            left: clamp(
                (viewport.width - panel.width) / 2,
                VIEWPORT_PADDING,
                viewport.width - panel.width - VIEWPORT_PADDING
            ),
            placement: 'bottom',
        };
    }

    let top: number;
    let left: number;
    switch (placement) {
        case 'bottom':
            top = target.top + target.height + GAP;
            left = target.left + target.width / 2 - panel.width / 2;
            break;
        case 'top':
            top = target.top - GAP - panel.height;
            left = target.left + target.width / 2 - panel.width / 2;
            break;
        case 'right':
            top = target.top + target.height / 2 - panel.height / 2;
            left = target.left + target.width + GAP;
            break;
        case 'left':
            top = target.top + target.height / 2 - panel.height / 2;
            left = target.left - GAP - panel.width;
            break;
    }

    return {
        top: clamp(top, VIEWPORT_PADDING, viewport.height - panel.height - VIEWPORT_PADDING),
        left: clamp(left, VIEWPORT_PADDING, viewport.width - panel.width - VIEWPORT_PADDING),
        placement,
    };
}
