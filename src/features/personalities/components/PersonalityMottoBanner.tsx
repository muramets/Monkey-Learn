import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { usePersonalityStore } from '../../../stores/personalityStore';

export function PersonalityMottoBanner() {
    const { activePersonalityId } = usePersonalityStore();

    // Use the key prop to force remount when personality changes, 
    // allowing us to read localStorage in the initial state safely without effects.
    return <PersonalityMottoBannerContent key={activePersonalityId} />;
}

function PersonalityMottoBannerContent() {
    const { personalities, activePersonalityId, activeContext } = usePersonalityStore();
    const activePersonality = personalities.find(p => p.id === activePersonalityId);

    const [isHovered, setIsHovered] = useState(false);
    const [isClosedForToday, setIsClosedForToday] = useState(() => {
        if (!activePersonalityId) return false;
        const today = new Date().toISOString().split('T')[0];
        const storageKey = `motto_closed_${activePersonalityId}`;
        return localStorage.getItem(storageKey) === today;
    });

    const handleClose = () => {
        if (!activePersonalityId) return;

        const today = new Date().toISOString().split('T')[0];
        const storageKey = `motto_closed_${activePersonalityId}`;
        localStorage.setItem(storageKey, today);
        setIsClosedForToday(true);
    };

    // Listen for reset events from settings modal
    useEffect(() => {
        const handleReset = (event: Event) => {
            const customEvent = event as CustomEvent;
            if (customEvent.detail?.personalityId === activePersonalityId) {
                setIsClosedForToday(false);
            }
        };

        window.addEventListener('personality-motto-reset', handleReset);
        return () => window.removeEventListener('personality-motto-reset', handleReset);
    }, [activePersonalityId]);

    // Only render if:
    // 1. Not in viewer mode (ViewerBanner takes precedence / is different context)
    // 2. We have an active personality
    // 3. Motto is set and enabled
    // 4. Not closed for today
    if (activeContext?.type === 'viewer') return null;

    // Find active motto
    const activeMotto = activePersonality?.mottos?.find(m => m.isActive) ||
        // Fallback for migration if mottos is empty but legacy motto exists
        (activePersonality?.showMotto && activePersonality?.motto ? { text: activePersonality.motto, isActive: true } : null);

    if (!activeMotto?.text) return null;
    if (isClosedForToday) return null;

    // Use a contrasting color for text based on brightness if possible, 
    // but typically "Coach Mode" banner uses main-color bg and bg-color text.
    // Here we use the personality color (iconColor).
    const backgroundColor = activePersonality?.iconColor || 'var(--main-color)';

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: '32px' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="w-full font-mono text-xs leading-none flex items-center justify-center relative shadow-sm z-50 group/banner"
                style={{
                    backgroundColor: backgroundColor,
                    color: 'var(--bg-color)', // Text color that matches the app background (usually creates high contrast with bright accents)
                    height: '32px'
                }}
            >
                {/* Centered Content Container */}
                <div
                    className="flex items-center justify-center w-full h-full px-8 overflow-hidden relative"
                    style={{ maxWidth: '1200px', margin: '0 auto' }}
                >
                    <ScrollableMotto text={activeMotto.text} backgroundColor={backgroundColor} />
                </div>

                {/* Exit Button - Absolute Right of the BANNER (viewport), not the inner container */}
                <button
                    onClick={handleClose}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center gap-2 transition-opacity hover:opacity-100 opacity-70 z-50 p-2"
                >
                    <span className="text-[10px] uppercase font-bold tracking-wider opacity-0 group-hover/banner:opacity-100 transition-opacity duration-200">
                        close for today
                    </span>
                    <FontAwesomeIcon
                        icon={faTimes}
                        className="text-sm"
                        style={{
                            color: isHovered ? 'var(--text-color)' : 'var(--bg-color)',
                            opacity: isHovered ? 1 : 0.8,
                        }}
                    />
                </button>
            </motion.div>
        </AnimatePresence >
    );
}

function ScrollableMotto({ text, backgroundColor }: { text: string, backgroundColor: string }) {

    const containerRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLSpanElement>(null);
    const [shouldScroll, setShouldScroll] = useState(false);

    // Measure carefully on mount, text change, and resize
    const [contentWidth, setContentWidth] = useState(0);

    useEffect(() => {
        const checkScroll = () => {
            if (containerRef.current && textRef.current) {
                const containerWidth = containerRef.current.offsetWidth;
                const textMeasuredWidth = textRef.current.scrollWidth;

                // If text is wider than container
                const isOverflowing = textMeasuredWidth > containerWidth;
                setShouldScroll(isOverflowing);
                setContentWidth(textMeasuredWidth);
            }
        };

        // Initial check
        checkScroll();

        // Check on resize
        const resizeObserver = new ResizeObserver(checkScroll);
        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        return () => resizeObserver.disconnect();
    }, [text]);

    // Restart animation when re-entering viewport
    const [isInView, setIsInView] = useState(false);
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsInView(entry.isIntersecting);
            },
            { threshold: 0 }
        );

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => observer.disconnect();
    }, []);

    const gap = 32; // Gap between duplicates


    // CSS Styles for marquee animation
    const marqueeStyle = `
        @keyframes marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
        }
        .animate-marquee {
            animation: marquee ${shouldScroll ? Math.max(10, contentWidth / 30) + 's' : '0s'} linear infinite;
            animation-delay: 3s;
        }
        .animate-marquee:hover {
            animation-play-state: paused;
        }
        .left-mask-fade {
            animation: fadeIn 0.5s ease-in forwards;
            animation-delay: 3s;
            opacity: 0; /* Start hidden */
        }
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
            .animate-marquee, .left-mask-fade {
                animation: none;
                transform: none; 
                opacity: 0;
            }
        }
    `;

    // Only animate if scrolling is needed AND we are in view (resets animation on re-entry)
    const isAnimating = shouldScroll && isInView;

    return (
        <div
            ref={containerRef}
            className={`flex items-center overflow-hidden max-w-[80%] relative cursor-default select-none h-full ${shouldScroll ? 'justify-start' : 'justify-center'}`}
            aria-label={shouldScroll ? text : undefined}
            role={shouldScroll ? "marquee" : undefined}
        >
            {/* Inject dynamic styles */}
            <style>{marqueeStyle}</style>

            <div
                // Key forces remount if we really wanted hard reset, but class toggle is usually enough for CSS anims
                className={`flex items-center whitespace-nowrap will-change-transform ${isAnimating ? 'animate-marquee w-fit' : 'w-full min-w-0 overflow-hidden'}`}
            >
                <span
                    ref={textRef}
                    className={`font-bold tracking-wider uppercase opacity-90 ${shouldScroll ? 'block' : 'w-full truncate block text-left'}`}
                >
                    {text}
                </span>

                {shouldScroll && (
                    <>
                        {/* First gap with separator */}
                        <div style={{ width: gap, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div className="w-1.5 h-4 bg-current opacity-20 rounded-full" />
                        </div>

                        {/* Duplicate content for loop */}
                        <span aria-hidden="true" className="font-bold tracking-wider uppercase opacity-90">
                            {text}
                        </span>

                        {/* Trailing gap allows perfect 50% shift if we treat (Text + Gap) as the unit */}
                        <div style={{ width: gap, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div className="w-1.5 h-4 bg-current opacity-20 rounded-full" />
                        </div>
                    </>
                )}
            </div>

            {/* Gradient masks - Always visible if scrolling (to show it's a window) */}
            {shouldScroll && (
                <>
                    <div
                        className={`absolute left-0 top-0 bottom-0 w-8 pointer-events-none z-10 ${isAnimating ? 'left-mask-fade' : 'opacity-0'}`}
                        style={{ background: `linear-gradient(to right, ${backgroundColor}, transparent)` }}
                    />
                    <div
                        className="absolute right-0 top-0 bottom-0 w-8 pointer-events-none z-10"
                        style={{ background: `linear-gradient(to left, ${backgroundColor}, transparent)` }}
                    />
                </>
            )}
        </div>
    );
}

