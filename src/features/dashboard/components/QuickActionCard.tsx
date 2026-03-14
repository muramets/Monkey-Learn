import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { MARKDOWN_TOOLTIP_COMPONENTS } from '../../../utils/markdownComponents';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faMinus, faPlus } from '@fortawesome/free-solid-svg-icons';
import { motion, AnimatePresence } from 'framer-motion';
import type { Protocol } from '../../protocols/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, TooltipPortal } from '../../../components/ui/atoms/Tooltip';
import { AppIcon } from '../../../components/ui/atoms/AppIcon';
import { useTouchDevice } from '../../../hooks/useTouchDevice';

export const QuickActionCard = React.memo(function QuickActionCard({ action, onAction, onDelete, isDisabled, isDragging }: { action: Protocol; onAction?: (direction: '+' | '-') => void; onDelete?: () => void; isDisabled?: boolean; isDragging?: boolean }) {
    const isTouchDevice = useTouchDevice();
    const [hoverSide, setHoverSide] = useState<'left' | 'right' | null>(null);
    const [feedbackType, setFeedbackType] = useState<'plus' | 'minus' | null>(null);
    const [contentFeedbackType, setContentFeedbackType] = useState<'plus' | 'minus' | null>(null);
    const [shake, setShake] = useState<'left' | 'right' | null>(null);
    const titleRef = useRef<HTMLSpanElement>(null);
    const [isTruncated, setIsTruncated] = useState(false);

    const checkTruncation = () => {
        const element = titleRef.current;
        if (element) {
            setIsTruncated(element.scrollWidth > element.clientWidth);
        }
    };

    useEffect(() => {
        checkTruncation();
        window.addEventListener('resize', checkTruncation);
        return () => window.removeEventListener('resize', checkTruncation);
    }, [action.title]);

    // Derived states to avoid sticking/double-renders (matching ProtocolRow pattern)
    // If disabled or dragging, we suppress all hover and feedback effects
    const effectiveHoverSide = (isDisabled || isDragging) ? null : hoverSide;
    const effectiveFeedbackType = (isDisabled || isDragging) ? null : feedbackType;
    const effectiveContentFeedbackType = (isDisabled || isDragging) ? null : contentFeedbackType;
    const effectiveShake = (isDisabled || isDragging) ? null : shake;

    /**
     * Business Logic: Action Handling
     * Manages visual feedback hierarchy:
     * 1. Shake (300ms) - Immediate physical feedback
     * 2. Color/Scale Feedback (500ms) - Visual confirmation of action type
     * 3. Content Feedback (800ms) - Shows XP gain instead of description
     */
    const handleAction = (direction: '+' | '-') => {
        if (isDisabled) return;
        // Trigger shake
        setShake(direction === '+' ? 'right' : 'left');
        setTimeout(() => setShake(null), 300);

        // Trigger feedback (Scale/Colors) - 500ms
        setFeedbackType(direction === '+' ? 'plus' : 'minus');
        setTimeout(() => setFeedbackType(null), 500);

        // Trigger content (Icon -> XP) - 800ms (500ms + 300ms transition)
        setContentFeedbackType(direction === '+' ? 'plus' : 'minus');
        setTimeout(() => setContentFeedbackType(null), 800);

        onAction?.(direction);
    };

    /**
     * TOUCH EVENT HANDLERS
     * Separate handlers for touch interactions to prevent ghost clicks and ensure clean tap targets.
     */
    const handleTouchAction = (e: React.MouseEvent | React.TouchEvent, direction: '+' | '-') => {
        // Prevent default browser behavior (zoom, scroll) when interacting with buttons
        e.stopPropagation();
        handleAction(direction);
    };

    /**
     * Delete Handler
     * Explicitly prevents propagation to avoid triggering card actions
     */
    const handleDelete = (e: React.MouseEvent | React.TouchEvent) => {
        e.stopPropagation();
        onDelete?.();
    };

    // Determine colors based on action state
    // Use correct green/red for feedback, otherwise use hover side colors, or fallback to default
    const getButtonColor = (side: 'left' | 'right') => {
        const isPlus = side === 'right';
        const feedbackMatch = isPlus ? effectiveFeedbackType === 'plus' : effectiveFeedbackType === 'minus';
        const failColor = '#ca4754';
        const successColor = '#98c379';

        if (feedbackMatch) return isPlus ? successColor : failColor;

        // Touch device fallback: colored icons if not disabled
        if (isTouchDevice && !isDisabled && !isDragging) {
            return isPlus ? successColor : failColor;
        }

        if (effectiveHoverSide === side) return isPlus ? successColor : failColor;

        return undefined;
    };

    return (
        <TooltipProvider>
            {/* Main Card Container - Handles Hover Scale ONLY */}
            <div className={`group relative h-[70px] ${!isDragging ? 'transition-[transform,opacity] duration-300' : ''} select-none ${isDisabled ? 'cursor-default opacity-90' : isDragging ? 'cursor-grabbing' : 'hover:scale-[1.03] cursor-pointer'}`}>

                {/* Inner Animation Container - Handles Tilt, Background, & Shadows */}
                <div className={`w-full h-full relative bg-sub-alt rounded-lg overflow-hidden shadow-sm ${!isDragging ? 'hover:shadow-md transition-shadow duration-300' : ''} ${effectiveShake === 'left' ? 'animate-tilt-left' : effectiveShake === 'right' ? 'animate-tilt-right' : ''
                    }`}>

                    <style>{`
                        @keyframes tilt-left {
                            0%, 100% { transform: rotate(0deg); }
                            25% { transform: rotate(-1deg); }
                            75% { transform: rotate(0.5deg); }
                        }
                        @keyframes tilt-right {
                            0%, 100% { transform: rotate(0deg); }
                            25% { transform: rotate(1deg); }
                            75% { transform: rotate(-0.5deg); }
                        }
                        .animate-tilt-left { animation: tilt-left 0.3s ease-in-out; }
                        .animate-tilt-right { animation: tilt-right 0.3s ease-in-out; }
                        
                        /* Pulse Animation for Touch Devices */
                        @keyframes pulse-soft {
                            0%, 100% { opacity: 0.8; transform: scale(1); }
                            50% { opacity: 1; transform: scale(1.1); }
                        }
                        .animate-pulse-soft { animation: pulse-soft 2s infinite ease-in-out; }
                    `}</style>

                    <div
                        className={`absolute inset-0 ${!isDragging ? 'transition-opacity duration-300' : ''}`}
                        style={{
                            background: `radial-gradient(circle at 100% 50%, rgba(152, 195, 121, 0.15), transparent 70%)`,
                            opacity: effectiveHoverSide === 'right' ? 1 : 0
                        }}
                    />
                    <div
                        className={`absolute inset-0 ${!isDragging ? 'transition-opacity duration-300' : ''}`}
                        style={{
                            background: `radial-gradient(circle at 0% 50%, rgba(202,71,84,0.15), transparent 70%)`,
                            opacity: effectiveHoverSide === 'left' ? 1 : 0
                        }}
                    />

                    {/* 2. Interaction Layer: Buttons (Underneath Visuals) */}
                    <div className="absolute inset-0 flex z-10">
                        {/* Left Button (Decrease) - Minus */}
                        <button
                            className={`flex-1 flex items-center justify-start pl-5 text-sub focus:outline-none ${!isDragging ? 'transition-colors duration-150' : ''}`}
                            style={{
                                color: getButtonColor('left'),
                            }}
                            onMouseEnter={() => !isTouchDevice && setHoverSide('left')}
                            onMouseLeave={() => !isTouchDevice && setHoverSide(null)}
                            onClick={(e) => handleTouchAction(e, '-')}
                        >
                            <div className={`${!isDragging ? 'transition-transform duration-300' : ''} transform ${effectiveFeedbackType === 'minus' ? 'scale-150' : ''} ${isTouchDevice && !isDisabled && !isDragging ? 'animate-pulse-soft' : ''}`}>
                                <FontAwesomeIcon
                                    icon={faMinus}
                                    className={`text-sm ${!isDragging ? 'transition-colors duration-300' : ''} ${effectiveFeedbackType === 'minus' ? 'text-[#ca4754]' : ''}`}
                                    // Remove mouse events from icon to prevent double firing, let button handle it
                                    pointerEvents="none"
                                />
                            </div>
                        </button>
                        {/* Right Button (Increase/Primary) - Plus */}
                        <button
                            className={`flex-1 flex items-center justify-end pr-5 text-sub focus:outline-none ${!isDragging ? 'transition-colors duration-150' : ''}`}
                            style={{
                                color: getButtonColor('right'),
                            }}
                            onMouseEnter={() => !isTouchDevice && setHoverSide('right')}
                            onMouseLeave={() => !isTouchDevice && setHoverSide(null)}
                            onClick={(e) => handleTouchAction(e, '+')}
                        >
                            <div className={`${!isDragging ? 'transition-transform duration-300' : ''} transform ${effectiveFeedbackType === 'plus' ? 'scale-150' : ''} ${isTouchDevice && !isDisabled && !isDragging ? 'animate-pulse-soft' : ''}`}>
                                <FontAwesomeIcon
                                    icon={faPlus}
                                    className={`text-sm ${!isDragging ? 'transition-colors duration-300' : ''} ${effectiveFeedbackType === 'plus' ? 'text-[#98c379]' : ''}`}
                                    pointerEvents="none"
                                />
                            </div>
                        </button>
                    </div>

                    {/* 3. Visual Layer: Text Content (Centered, Wide, Pointer Events None) */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20">
                        <motion.div
                                                        animate={{
                                scale: effectiveFeedbackType ? 1.25 : 1,
                                y: effectiveFeedbackType ? -4 : 0
                            }}
                            transition={{
                                type: "spring",
                                stiffness: 500,
                                damping: 30
                            }}
                            className="w-[180px] flex items-center justify-center gap-3 text-text-primary font-mono text-[0.8rem] font-bold tracking-tight"
                        >
                            <motion.div
                                                                initial={false}
                                animate={{
                                    backgroundColor: `color-mix(in srgb, ${action.color || '#ffffff'} 20%, transparent)`,
                                    boxShadow: `0 0 10px color-mix(in srgb, ${action.color || '#ffffff'} 8%, transparent)`,
                                    color: action.color || 'var(--text-primary)'
                                }}
                                transition={{
                                    type: "spring",
                                    stiffness: 500,
                                    damping: 30
                                }}
                                className={`rounded-md flex items-center justify-center shrink-0 relative z-20 h-6 w-6`}
                            >
                                <span className={`text-[0.65rem] opacity-90 flex items-center justify-center`}>
                                    <AppIcon id={action.icon} />
                                </span>
                            </motion.div>

                            <motion.span
                                                                ref={titleRef}
                                className={`truncate text-center origin-left ${!isDragging ? 'transition-colors duration-300' : ''}`}
                            >
                                {action.title}
                            </motion.span>
                        </motion.div>

                        <div
                            className={`text-[0.7rem] font-mono uppercase tracking-wide truncate max-w-[160px] ${!isDragging ? 'transition-colors duration-300 text-text-secondary opacity-80 group-hover:text-text-primary group-hover:opacity-100' : 'text-text-primary opacity-100'}`}
                        >
                            {/* Show description or group */}
                            {isDragging ? (
                                <span className="block">
                                    {action.group || action.description}
                                </span>
                            ) : (
                                <AnimatePresence mode="wait" initial={false}>
                                    {effectiveContentFeedbackType ? (
                                        <motion.span
                                            key="xp-feedback"
                                            initial={{ opacity: 0, y: 5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -5 }}
                                            transition={{ duration: 0.2 }}
                                            className={`font-bold ${effectiveContentFeedbackType === 'plus' ? 'text-[#98c379]' : 'text-[#ca4754]'}`}
                                        >
                                            {effectiveContentFeedbackType === 'plus' ? '+' : ''}{Math.round(action.weight * 100)} XP
                                        </motion.span>
                                    ) : (
                                        <motion.span
                                            key="group-name"
                                            initial={{ opacity: 0, y: -5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 5 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            {action.group || action.description}
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            )}
                        </div>
                    </div>

                    {/* Success/Error Ripple Effect Overlay - SPLIT into two to avoid flash */}
                    <div
                        className={`absolute inset-0 pointer-events-none transition-opacity duration-500 ease-out z-0 ${effectiveFeedbackType === 'plus' ? 'opacity-100' : 'opacity-0'}`}
                        style={{
                            background: `radial-gradient(circle at 85% 50%, rgba(152, 195, 121, 0.2) 0%, transparent 60%)`
                        }}
                    />
                    <div
                        className={`absolute inset-0 pointer-events-none transition-opacity duration-500 ease-out z-0 ${effectiveFeedbackType === 'minus' ? 'opacity-100' : 'opacity-0'}`}
                        style={{
                            background: `radial-gradient(circle at 15% 50%, rgba(202, 71, 84, 0.2) 0%, transparent 60%)`
                        }}
                    />

                    {/* 4. Neutral Zone Layer: Central Interaction for Tooltip */}
                    <Tooltip delayDuration={1000}>
                        <TooltipTrigger asChild>
                            <div
                                className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-[40px] z-30"
                                onMouseEnter={checkTruncation}
                            // "Dead zone" for clicks to allow tooltip hover
                            />
                        </TooltipTrigger>
                        {/* ... tooltip content */}
                        {(action.hover || action.description || isTruncated) && !isDragging && (
                            <TooltipPortal>
                                <TooltipContent sideOffset={5} className="z-[100] max-w-[300px] break-words">
                                    <div className="font-bold border-b border-sub/50 pb-1 mb-1 text-center">
                                        {action.title}
                                    </div>
                                    {action.hover ? (
                                        <div className="rich-text-viewer text-left text-xs">
                                            <ReactMarkdown
                                                rehypePlugins={[rehypeRaw]}
                                                components={MARKDOWN_TOOLTIP_COMPONENTS}>
                                                {action.hover}
                                            </ReactMarkdown>
                                        </div>
                                    ) : (
                                        <div className="text-center text-xs">{action.description}</div>
                                    )}
                                </TooltipContent>
                            </TooltipPortal>
                        )}
                    </Tooltip>

                    {/* 5. Delete/Unpin Zone */}
                    {onDelete && (
                        <div className="absolute top-0 right-0 w-8 h-8 z-50 flex items-start justify-end p-1 group/delete pointer-events-auto">
                            <button
                                className={`w-5 h-5 [@media(pointer:coarse)]:min-w-[44px] [@media(pointer:coarse)]:min-h-[44px] flex items-center justify-center rounded text-sub/50 hover:text-red-500 hover:bg-bg-primary/80 transition-[opacity,color,background-color] opacity-0 ${isDisabled ? 'group-hover:opacity-100' : 'group-hover/delete:opacity-100'}`}
                                onClick={handleDelete}
                                title="Unpin"
                            >
                                <FontAwesomeIcon icon={faTimes} size="xs" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </TooltipProvider >
    );
});
