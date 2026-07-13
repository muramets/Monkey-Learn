import React, { useState, useRef, useMemo, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { MARKDOWN_TOOLTIP_COMPONENTS } from '../../../utils/markdownComponents';
import type { Protocol } from '../types';
import type { Innerface } from '../../innerfaces/types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faMinus, faCog, faHistory, faChevronUp, faInfoCircle } from '@fortawesome/free-solid-svg-icons';

import { AppIcon } from '../../../components/ui/atoms/AppIcon';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../components/ui/atoms/Tooltip';
import { useTouchDevice } from '../../../hooks/useTouchDevice';
import { useTruncation } from '../../../hooks/useTruncation';
import { resolveEntityColor } from '../../../utils/entityColor';
import { ProtocolInstructionViewer } from './ProtocolInstructionViewer';

// Set to true to visualize layout containers during development/debugging
const DEBUG_LAYOUT = false;

interface ProtocolRowProps {
    protocol: Protocol;
    innerfaces: Innerface[];
    onLevelUp: (id: string | number) => void;
    onLevelDown: (id: string | number) => void;
    onEdit: (id: string | number) => void;
    isDisabled?: boolean; // For Dragging: disable ALL interactions
    isReadOnly?: boolean; // For Role Mode: disable Check-ins, but allow Hover/Edit
    isOverlay?: boolean; // For Drag Overlay: optimize rendering (disable layout animations)
    isGrabbing?: boolean; // For Dragging: visuals only
}

/**
 * ProtocolRow Component
 * Displays a single protocol with interactive +/- buttons and contextual actions.
 * Adheres to touch-first design principles with specific logic for mouse vs touch.
 */
export const ProtocolRow = React.memo(function ProtocolRow({ protocol, innerfaces, onLevelUp, onLevelDown, onEdit, isDisabled, isReadOnly, isOverlay = false, isGrabbing = false }: ProtocolRowProps) {
    const navigate = useNavigate();
    const isTouchDevice = useTouchDevice();
    const [hoverSide, setHoverSide] = useState<'left' | 'right' | null>(null);
    const [feedbackType, setFeedbackType] = useState<'plus' | 'minus' | null>(null);
    const [shake, setShake] = useState<'left' | 'right' | null>(null);
    const rowRef = useRef<HTMLDivElement>(null);
    const [isHovered, setIsHovered] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    // Truncation detection
    const { ref: titleRef, isTruncated: isTitleTruncated } = useTruncation();
    const { ref: descRef, isTruncated: isDescTruncated } = useTruncation();

    const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Derived states to avoid double-renders on drag start
    const effectiveHoverSide = (isDisabled || isReadOnly) ? null : hoverSide;
    const effectiveFeedbackType = (isDisabled || isReadOnly) ? null : feedbackType;
    const effectiveShake = (isDisabled || isReadOnly) ? null : shake;

    // Resolve targets with memoization to avoid lookups on every render
    const targetInnerfaces = useMemo(() => {
        return protocol.targets
            .map(id => innerfaces.find(i => i.id.toString() === id.toString()))
            .filter((i): i is Innerface => i !== undefined);
    }, [protocol.targets, innerfaces]);

    /**
     * BUSINESS LOGIC: ACTION HANDLING
     * Manages the +/- interactions for the protocol.
     * Triggers visual feedback (shake, color pulse) and executes the level change callback.
     */
    const handleAction = (direction: '+' | '-') => {
        if (isDisabled || isReadOnly) return;
        setHoverSide(direction === '+' ? 'right' : 'left');
        setShake(direction === '+' ? 'right' : 'left');
        setTimeout(() => setShake(null), 300);
        setFeedbackType(direction === '+' ? 'plus' : 'minus');
        setTimeout(() => setFeedbackType(null), 500);

        if (direction === '+') onLevelUp(protocol.id);
        else onLevelDown(protocol.id);
    };

    /**
     * INTERACTIONS: TOUCH
     * Encapsulates all tap behavior for touch devices.
     * - Edges: Trigger actions (-/+).
     * - Center: Toggles hover state (to show Edit/History buttons).
     */
    const handleTouchTap = (x: number, width: number) => {
        const deadZone = 60; // Larger hit area for touch

        if (x < deadZone) {
            handleAction('-');
        } else if (x > width - deadZone) {
            handleAction('+');
        } else {
            // Center tap: Toggle actions visibility
            setIsHovered(!isHovered);
        }
    };

    /**
     * INTERACTIONS: MOUSE
     * Encapsulates click behavior for desktop/mouse users.
     * - Edges: Trigger actions (-/+).
     * - Center: No click action (hover is handled by onMouseEnter).
     */
    const handleMouseClick = (x: number, width: number) => {
        const deadZone = 60;

        if (x < deadZone) {
            handleAction('-');
        } else if (x > width - deadZone) {
            handleAction('+');
        }
    };

    /**
     * MOUSE MOVE LOGIC
     * Handles hover zone calculations for desktop users.
     * Triggers gradients everywhere EXCEPT the center 20% (10% left/right of center).
     */
    const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
        if (isDisabled || isReadOnly || feedbackType || !rowRef.current) return;
        if (!window.matchMedia('(hover: hover)').matches) return;

        // Restore hover state if coming back from instruction
        if (!isHovered) {
            if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
            setIsHovered(true);
        }

        const rect = rowRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const width = rect.width;

        const center = width / 2;
        const neutralZoneHalfWidth = width * 0.1; // 10% from center to either side

        if (x < center - neutralZoneHalfWidth) setHoverSide('left');
        else if (x > center + neutralZoneHalfWidth) setHoverSide('right');
        else setHoverSide(null);
    };

    const handleMouseLeave = () => {
        // Debounce leave to prevent flickering when interacting with tooltips/portals
        hoverTimeoutRef.current = setTimeout(() => {
            setHoverSide(null);
            setIsHovered(false);
        }, 150);
    };

    const handleMouseEnter = () => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        if (!isDisabled && window.matchMedia('(hover: hover)').matches) {
            setIsHovered(true);
        }
    };

    /**
     * MAIN CLICK HANDLER
     * Delegates to specific handlers based on input device type.
     */
    const handleClick = (e: React.MouseEvent) => {
        if (isDisabled || isReadOnly) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const width = rect.width;

        if (isTouchDevice) {
            handleTouchTap(x, width);
        } else {
            handleMouseClick(x, width);
        }
    };

    /**
     * RENDER HELPER: BACKGROUND LAYERS
     */
    const renderBackgroundLayers = () => (
        <>
            <div className={`absolute inset-0 bg-[radial-gradient(circle_at_100%_50%,_rgba(152,195,121,0.15),_transparent_60%)] transition-opacity duration-300 pointer-events-none z-0 ${effectiveHoverSide === 'right' || effectiveFeedbackType === 'plus' ? 'opacity-100' : 'opacity-0'}`} />
            <div className={`absolute inset-0 bg-[radial-gradient(circle_at_0%_50%,_rgba(202,71,84,0.15),_transparent_60%)] transition-opacity duration-300 pointer-events-none z-0 ${effectiveHoverSide === 'left' || effectiveFeedbackType === 'minus' ? 'opacity-100' : 'opacity-0'}`} />

            {!isDisabled && (
                <>
                    <div className={`absolute inset-0 pointer-events-none transition-opacity duration-500 ease-out z-0 ${effectiveFeedbackType === 'plus' ? 'opacity-100' : 'opacity-0'}`}
                        style={{ background: `radial-gradient(circle at 100% 50%, rgba(152, 195, 121, 0.3) 0%, transparent 70%)` }} />
                    <div className={`absolute inset-0 pointer-events-none transition-opacity duration-500 ease-out z-0 ${effectiveFeedbackType === 'minus' ? 'opacity-100' : 'opacity-0'}`}
                        style={{ background: `radial-gradient(circle at 0% 50%, rgba(202, 71, 84, 0.3) 0%, transparent 70%)` }} />
                </>
            )}
        </>
    );

    /**
     * RENDER HELPER: ACTION INDICATORS (+/- icons)
     */
    const renderActionIndicators = () => (
        <>
            <div className="absolute inset-y-0 left-0 w-8 flex items-center justify-center pointer-events-none z-20">
                <FontAwesomeIcon icon={faMinus} className={`transition-[opacity,transform,color] duration-300 ${isTouchDevice && !isDisabled && !isReadOnly ? 'animate-pulse-soft' : ''} ${effectiveFeedbackType === 'minus' ? 'opacity-100 text-error scale-150' : (effectiveHoverSide === 'left' || (isTouchDevice && !isDisabled && !isReadOnly)) ? 'opacity-100 -translate-x-0 text-error' : 'opacity-0 -translate-x-4'}`} />
            </div>
            <div className="absolute inset-y-0 right-0 w-8 flex items-center justify-center pointer-events-none z-20">
                <FontAwesomeIcon icon={faPlus} className={`transition-[opacity,transform,color] duration-300 ${isTouchDevice && !isDisabled && !isReadOnly ? 'animate-pulse-soft' : ''} ${effectiveFeedbackType === 'plus' ? 'opacity-100 text-correct scale-150' : (effectiveHoverSide === 'right' || (isTouchDevice && !isDisabled && !isReadOnly)) ? 'opacity-100 translate-x-0 text-correct' : 'opacity-0 translate-x-4'}`} />
            </div>
        </>
    );

    /**
     * RENDER HELPER: MAIN CONTENT
     */
    const renderMainContent = () => (
        <motion.div /* layout removed for perf */ className="relative z-10 grid grid-cols-[1.2fr_auto_1fr] items-center gap-4 px-4 h-full py-2">
            {renderBackgroundLayers()}
            {renderActionIndicators()}

            {/* Identity Group */}
            <motion.div /* layout removed for perf */ className={`flex items-center gap-3 min-w-0 pointer-events-none ${DEBUG_LAYOUT ? 'border border-blue-500' : ''}`}>
                <motion.div                    className="flex items-center justify-center w-10 h-10 rounded-lg text-xl shrink-0"
                    animate={{ marginLeft: (isHovered || (isTouchDevice && !isDisabled && !isReadOnly)) ? 16 : 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    style={{
                        backgroundColor: `color-mix(in srgb, ${resolveEntityColor(protocol.color)} 20%, transparent)`,
                        color: resolveEntityColor(protocol.color),
                        boxShadow: `0 0 15px color-mix(in srgb, ${resolveEntityColor(protocol.color)} 8%, transparent)`
                    }}
                >
                    <AppIcon id={protocol.icon} />
                </motion.div>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="flex flex-col min-w-0 flex-grow mr-2 overflow-hidden pointer-events-auto">
                            <div className="flex items-center gap-2 max-w-full">
                                <h3
                                    ref={titleRef}
                                    className={`font-lexend text-base font-medium truncate transition-colors duration-300 ${effectiveFeedbackType === 'plus' ? 'text-correct' : effectiveFeedbackType === 'minus' ? 'text-error' : effectiveHoverSide === 'right' ? 'text-correct' : effectiveHoverSide === 'left' ? 'text-error' : 'text-text-primary'}`}
                                >
                                    {protocol.title}
                                </h3>
                            </div>
                            {protocol.description && (
                                <p
                                    ref={descRef}
                                    className={`text-[10px] text-sub font-mono transition-[opacity,color] duration-300 truncate block ${isHovered ? 'opacity-100 text-text-primary' : 'opacity-60'}`}
                                >
                                    {protocol.description}
                                </p>
                            )}
                        </div>
                    </TooltipTrigger>
                    {/* Tooltip Content Logic */}
                    {(isTitleTruncated || isDescTruncated || protocol.hover) && (
                        <TooltipContent side="top" align="center" className="max-w-[300px] break-words z-[100]">
                            {/* Truncated Content */}
                            {(isTitleTruncated || isDescTruncated) && (
                                <div className={`flex flex-col ${protocol.hover ? 'border-b border-sub/50 pb-1 mb-1' : ''}`}>
                                    {isTitleTruncated && <div className="font-bold text-center">{protocol.title}</div>}
                                    {isDescTruncated && <div className="text-center text-xs">{protocol.description}</div>}
                                </div>
                            )}

                            {/* Quick Note */}
                            {protocol.hover && (
                                <div className="rich-text-viewer text-left text-xs">
                                    <ReactMarkdown
                                        rehypePlugins={[rehypeRaw]}
                                        components={MARKDOWN_TOOLTIP_COMPONENTS}>
                                        {protocol.hover}
                                    </ReactMarkdown>
                                </div>
                            )}
                        </TooltipContent>
                    )}
                </Tooltip>
            </motion.div>

            {/* Weight Indicator */}
            <motion.div /* layout removed for perf */ className={`flex flex-col items-center justify-center pointer-events-none gap-1 ${DEBUG_LAYOUT ? 'border border-yellow-500' : ''}`}>
                <span className={`font-lexend text-xs font-bold tracking-wider transition-[opacity,transform,color] duration-300 ${effectiveFeedbackType === 'plus' ? 'text-correct opacity-100 scale-125' : effectiveFeedbackType === 'minus' ? 'text-error opacity-100 scale-125' : effectiveHoverSide === 'right' ? 'text-correct opacity-100 scale-110' : effectiveHoverSide === 'left' ? 'text-error opacity-100 scale-110' : isHovered ? 'text-text-primary opacity-100' : 'text-sub opacity-30'}`}>
                    {Math.round(protocol.weight * 100)} XP
                </span>
                {protocol.instruction && (
                    <Tooltip delayDuration={500}>
                        <TooltipTrigger asChild>
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                                className={`w-5 h-5 [@media(pointer:coarse)]:min-w-[44px] [@media(pointer:coarse)]:min-h-[44px] flex items-center justify-center rounded-full transition-[color,background-color,box-shadow] duration-200 cursor-pointer ${isDisabled ? 'pointer-events-none' : 'pointer-events-auto'} ${isExpanded ? 'text-main bg-main/10' : 'text-sub/50 hover:text-main hover:bg-sub-alt shadow-sm'}`}
                            >
                                <FontAwesomeIcon icon={isExpanded ? faChevronUp : faInfoCircle} className="text-[10px]" />
                            </button>
                        </TooltipTrigger>
                        {!isDisabled && (
                            <TooltipContent side="top">
                                {isExpanded ? "Collapse Instructions" : "Expand Instructions"}
                            </TooltipContent>
                        )}
                    </Tooltip>
                )}
            </motion.div>

            {/* Targets & Actions Group */}
            <motion.div /* layout removed for perf */ className={`flex items-center justify-end gap-3 pointer-events-none w-full h-full text-right ${DEBUG_LAYOUT ? 'border border-green-500' : ''}`}>
                <motion.div
                                       className={`flex flex-wrap justify-end content-center pointer-events-auto min-w-0 max-h-[40px] overflow-hidden transition-[gap] duration-200 ${(isHovered && targetInnerfaces.length >= 3) ? 'gap-1' : 'gap-1.5'
                        }`}
                >
                    <AnimatePresence mode='popLayout'>
                        {targetInnerfaces
                            .sort((a, b) => (a.currentScore || 0) - (b.currentScore || 0)) // Sort by score (weakest first)
                            .slice(0, (isHovered && targetInnerfaces.length > 8) ? 8 : (targetInnerfaces.length > 4 && isHovered) ? 10 : 12) // Smart truncation
                            .map((innerface: Innerface) => {
                                // Determine compact mode based on hover & count
                                // FIX: >= 3 items must be compact so 2 rows fit in 40px (18+18+4 = 40)
                                const isCompact = isHovered && targetInnerfaces.length >= 3;

                                const InnerfaceIcon = (
                                    <motion.div
                                                                               initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0.5, opacity: 0 }}
                                        className={`rounded-md flex items-center justify-center shrink-0 transition-[transform,width,height] hover:scale-110 duration-200 pointer-events-auto
                                            ${isCompact ? 'w-[18px] h-[18px]' : 'w-6 h-6'}`}
                                        style={{
                                            backgroundColor: `color-mix(in srgb, ${resolveEntityColor(innerface.color)} 10%, transparent)`,
                                            color: resolveEntityColor(innerface.color),
                                            boxShadow: `0 0 10px color-mix(in srgb, ${resolveEntityColor(innerface.color)} 5%, transparent)`
                                        }}
                                    >
                                        <div className={`transition-[font-size] duration-200 ${isCompact ? "text-[0.55rem]" : "text-[0.7rem]"}`}> <AppIcon id={innerface.icon} /> </div>
                                    </motion.div>
                                );

                                return (
                                    <motion.div /* layout removed for perf */ key={innerface.id} className="pointer-events-none">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div className={isDisabled ? 'pointer-events-none' : 'pointer-events-auto'}>
                                                    {InnerfaceIcon}
                                                </div>
                                            </TooltipTrigger>
                                            {!isDisabled && (
                                                <TooltipContent side="top">
                                                    <span className="font-lexend text-xs">{innerface.name} · {innerface.currentScore ?? 0}</span>
                                                </TooltipContent>
                                            )}
                                        </Tooltip>
                                    </motion.div>
                                );
                            })}
                    </AnimatePresence>
                </motion.div>

                {/* Edit/History buttons revealed on hover/tap */}
                <motion.div
                                       className="flex flex-col items-center gap-1 pointer-events-auto overflow-hidden shrink-0"
                    style={{
                        opacity: isHovered ? 1 : 0,
                        width: isHovered ? 32 : 0,
                        marginRight: isHovered ? 8 : 0,
                        pointerEvents: isHovered ? 'auto' : 'none',
                        transition: 'opacity 0.2s ease, width 0.2s ease, margin-right 0.2s ease'
                    }}
                >
                    <button onClick={(e) => { e.stopPropagation(); navigate(`/history?protocolId=${protocol.id}`); }}
                        className="w-6 h-6 [@media(pointer:coarse)]:min-w-[44px] [@media(pointer:coarse)]:min-h-[44px] flex items-center justify-center rounded text-sub hover:text-main transition-colors cursor-pointer" title="History">
                        <FontAwesomeIcon icon={faHistory} className="text-[10px]" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onEdit(protocol.id); }}
                        className="w-6 h-6 [@media(pointer:coarse)]:min-w-[44px] [@media(pointer:coarse)]:min-h-[44px] flex items-center justify-center rounded text-sub hover:text-main transition-colors cursor-pointer" title="Edit">
                        <FontAwesomeIcon icon={faCog} className="text-[10px]" />
                    </button>
                </motion.div>
            </motion.div>
        </motion.div>
    );

    const handleInstructionEnter = React.useCallback(() => {
        setHoverSide(null);
        setIsHovered(false);
    }, []);

    return (
        <motion.div
            layout={!isOverlay}
            ref={rowRef}
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
            className={`group relative bg-sub-alt border border-transparent rounded-xl overflow-hidden select-none 
                ${isGrabbing ? 'cursor-grabbing opacity-90' : isDisabled ? 'cursor-default opacity-90' : isReadOnly ? 'cursor-default' : 'cursor-pointer'} 
                ${!isDisabled ? 'transition-[transform,background-color] duration-200 [@media(hover:hover)]:hover:scale-[1.002] [@media(hover:hover)]:hover:bg-[var(--sub-alt-color)]' : ''}
                ${effectiveShake === 'left' ? 'animate-tilt-left' : effectiveShake === 'right' ? 'animate-tilt-right' : ''}
                ${DEBUG_LAYOUT ? 'border-dashed border-red-500' : ''}`}
            transition={{
                layout: { duration: 0.3, type: "spring", stiffness: 400, damping: 40 }
            }}
        >
            {renderMainContent()}

            <div
                className="relative z-20 cursor-auto"
                onMouseMove={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
            >
                <ProtocolInstructionViewer
                    instruction={protocol.instruction}
                    isExpanded={isExpanded}
                    onInteractionEnter={handleInstructionEnter}
                />
            </div>
        </motion.div>
    );
});
