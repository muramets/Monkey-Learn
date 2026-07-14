import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useOnboardingStore } from '../store/onboardingStore';
import { markTourSeen } from '../utils/onboardingSeen';
import { placePanel, spotlightRect, type Rect } from '../utils/tourGeometry';
import { TOURS } from '../steps/tours';
import { TourPanel } from './TourPanel';

const PANEL_ESTIMATE = { width: 320, height: 170 };

function findTarget(name: string): HTMLElement | null {
    return document.querySelector<HTMLElement>(`[data-tour="${name}"]`);
}

/**
 * Spotlight layer: dims the page with a box-shadow "hole" around the current
 * step's target and renders the blue TourPanel next to it. Target geometry
 * is re-measured on scroll/resize; steps whose targets are missing on the
 * page (empty states) are skipped automatically.
 */
export function TourOverlay() {
    const { user } = useAuth();
    const location = useLocation();
    const { activeTourId, stepIndex, nextStep, prevStep, stopTour } = useOnboardingStore();
    const [targetRect, setTargetRect] = useState<Rect | null>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const [panelSize, setPanelSize] = useState(PANEL_ESTIMATE);

    const tour = activeTourId ? TOURS[activeTourId] : null;

    // A tour belongs to its route — navigating away ends it.
    useEffect(() => {
        if (tour && location.pathname !== tour.route) stopTour();
    }, [tour, location.pathname, stopTour]);

    // Skip steps whose targets aren't rendered (empty lists, hidden panels).
    const visibleSteps = useMemo(
        () => (tour ? tour.steps.filter((s) => findTarget(s.target) !== null) : []),
        // Re-evaluate per step change: DOM may have changed between steps.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [tour, stepIndex, location.pathname]
    );
    const step = visibleSteps[stepIndex] ?? null;

    const measure = useCallback(() => {
        if (!step) return;
        const el = findTarget(step.target);
        if (!el) {
            setTargetRect(null);
            return;
        }
        const r = el.getBoundingClientRect();
        setTargetRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    }, [step]);

    // Scroll the target into view on step change, then measure.
    useLayoutEffect(() => {
        if (!step) return;
        const el = findTarget(step.target);
        el?.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior });
        measure();
    }, [step, measure]);

    // Track live geometry while the tour is open.
    useEffect(() => {
        if (!step) return;
        const onUpdate = () => measure();
        window.addEventListener('resize', onUpdate);
        window.addEventListener('scroll', onUpdate, true);
        return () => {
            window.removeEventListener('resize', onUpdate);
            window.removeEventListener('scroll', onUpdate, true);
        };
    }, [step, measure]);

    // Measure the real panel height once rendered so placement is exact.
    useLayoutEffect(() => {
        const el = panelRef.current;
        if (!el) return;
        const { width, height } = el.getBoundingClientRect();
        if (width && height && (width !== panelSize.width || height !== panelSize.height)) {
            setPanelSize({ width, height });
        }
    }, [step, panelSize.width, panelSize.height]);

    // Escape ends the tour.
    useEffect(() => {
        if (!tour) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                stopTour();
            }
        };
        window.addEventListener('keydown', onKey, { capture: true });
        return () => window.removeEventListener('keydown', onKey, { capture: true });
    }, [tour, stopTour]);

    if (!tour || !step || !targetRect) return null;

    const hole = spotlightRect(targetRect);
    const panelPos = placePanel(
        targetRect,
        panelSize,
        { width: window.innerWidth, height: window.innerHeight },
        step.placement
    );

    const finish = () => {
        if (user) markTourSeen(user.uid, tour.id);
        nextStep(visibleSteps.length);
    };

    return createPortal(
        <div className="fixed inset-0 z-[800]" role="presentation">
            {/* Spotlight hole: the giant shadow dims everything around it. */}
            <div
                className="absolute rounded-xl transition-[top,left,width,height] duration-200 ease-out"
                style={{
                    top: hole.top,
                    left: hole.left,
                    width: hole.width,
                    height: hole.height,
                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.65)',
                    outline: '2px solid var(--tour-accent)',
                    outlineOffset: '-1px',
                }}
            />
            <TourPanel
                ref={panelRef}
                title={step.title}
                body={step.body}
                stepIndex={stepIndex}
                totalSteps={visibleSteps.length}
                style={{ top: panelPos.top, left: panelPos.left }}
                onNext={() => {
                    if (stepIndex + 1 >= visibleSteps.length) finish();
                    else nextStep(visibleSteps.length);
                }}
                onPrev={prevStep}
                onSkip={() => {
                    if (user) markTourSeen(user.uid, tour.id);
                    stopTour();
                }}
            />
        </div>,
        document.body
    );
}
