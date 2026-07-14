import { forwardRef } from 'react';

interface TourPanelProps {
    title: string;
    body: string;
    stepIndex: number;
    totalSteps: number;
    onNext: () => void;
    onPrev: () => void;
    onSkip: () => void;
    style?: React.CSSProperties;
}

/**
 * The blue guide callout. Deliberately theme-independent (--tour-accent):
 * the guide layer should read as "the game talking to you", distinct from
 * the app content in any theme.
 */
export const TourPanel = forwardRef<HTMLDivElement, TourPanelProps>(function TourPanel(
    { title, body, stepIndex, totalSteps, onNext, onPrev, onSkip, style },
    ref
) {
    const isLast = stepIndex + 1 >= totalSteps;
    return (
        <div
            ref={ref}
            style={style}
            className="fixed z-[810] w-[320px] max-w-[calc(100vw-24px)] rounded-lg bg-[var(--tour-accent)] p-4 font-mono text-[#26282b] shadow-2xl"
            role="dialog"
            aria-label={`Tour step ${stepIndex + 1} of ${totalSteps}: ${title}`}
        >
            <div className="mb-1 flex items-baseline justify-between gap-3">
                <div className="text-sm font-bold lowercase">{title}</div>
                <div className="shrink-0 text-[10px] opacity-60">
                    {stepIndex + 1} / {totalSteps}
                </div>
            </div>
            <p className="mb-3 text-xs leading-relaxed">{body}</p>
            <div className="flex items-center justify-between">
                <button
                    type="button"
                    onClick={onSkip}
                    className="cursor-pointer text-[10px] uppercase tracking-wider opacity-60 transition-opacity hover:opacity-100"
                >
                    skip
                </button>
                <div className="flex items-center gap-2">
                    {stepIndex > 0 && (
                        <button
                            type="button"
                            onClick={onPrev}
                            className="cursor-pointer rounded bg-black/15 px-3 py-1.5 text-xs font-bold transition-colors hover:bg-black/25"
                        >
                            back
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onNext}
                        className="cursor-pointer rounded bg-black/25 px-3 py-1.5 text-xs font-bold transition-colors hover:bg-black/40"
                    >
                        {isLast ? 'done' : 'next'}
                    </button>
                </div>
            </div>
        </div>
    );
});
