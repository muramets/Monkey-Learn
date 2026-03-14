import React from 'react';
import { format, parseISO } from 'date-fns';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClock, faTrash, faGear, faComment, faHourglassHalf } from '@fortawesome/free-solid-svg-icons';
import { AppIcon } from '../../../components/ui/atoms/AppIcon';
import { PowerIcon } from '../../innerfaces/components/PowerIcon';
import type { HistoryRecord } from '../../../types/history';
import type { Innerface } from '../../innerfaces/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../../components/ui/atoms/Tooltip';
import { motion, useAnimation, type PanInfo, useMotionValue, useTransform } from 'framer-motion';

interface HistoryEventProps {
    event: HistoryRecord;
    innerfaces: Innerface[];
    protocolColor?: string;
    onDelete: (id: string) => void;
    onFilterInnerface: (id: string) => void;
    onFilterProtocol: (id: string) => void;
}

export const HistoryEvent = React.memo(function HistoryEvent({ event, innerfaces, protocolColor, onDelete, onFilterInnerface, onFilterProtocol }: HistoryEventProps) {
    const isPositive = event.weight > 0;
    const isSystem = event.type === 'system';
    const isDecay = event.type === 'decay';

    // Swipe Logic
    const controls = useAnimation();
    const x = useMotionValue(0);

    // Constants
    const DELETE_THRESHOLD = -50;
    const DEEP_DELETE_THRESHOLD = -225; // Requires significant swipe to delete
    const OPEN_X = -70; // Position when swiped open
    const WARNING_COLOR_THRESHOLD = -180; // Point where color changes to warning red

    // Dynamic styles based on swipe distance
    const iconScale = useTransform(x, [OPEN_X, DEEP_DELETE_THRESHOLD], [1, 1.5]);
    // Sync color change to roughly 80% of the way to the delete threshold
    const iconColor = useTransform(x, [OPEN_X, WARNING_COLOR_THRESHOLD], ['rgb(107, 114, 128)', 'rgb(239, 68, 68)']);
    const iconRotate = useTransform(x, [OPEN_X, DEEP_DELETE_THRESHOLD], [0, 15]);
    const backgroundColor = useTransform(x, [OPEN_X, DEEP_DELETE_THRESHOLD], ['rgb(44, 46, 49)', 'rgba(239, 68, 68, 0.2)']);

    const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const currentX = x.get();

        if (currentX < DEEP_DELETE_THRESHOLD) {
            // Trigger delete immediately if pulled far enough
            onDelete(event.id);
        } else if (info.offset.x < DELETE_THRESHOLD) {
            // Standard swipe: Snap to open
            controls.start({ x: OPEN_X });
        } else {
            // Snap back closed
            controls.start({ x: 0 });
        }
    };

    // System events use neutral gray
    const effectiveColor = isSystem
        ? 'var(--sub-color)'
        : (protocolColor || (isPositive ? 'var(--correct-color)' : 'var(--error-color)'));

    // Replicate ProtocolRow style: color with 0.15 opacity for base gradient
    const gradientColor = isSystem
        ? 'transparent'
        : (isPositive ? 'rgba(152,195,121,0.15)' : 'rgba(202,71,84,0.15)');

    const hoverGradientColor = isSystem
        ? 'rgba(255,255,255,0.05)'
        : (isPositive ? 'rgba(152,195,121,0.25)' : 'rgba(202,71,84,0.25)');

    return (
        <div className="relative group overflow-hidden rounded-2xl">
            {/* 1. Underlying Action Layer (Delete Button) */}
            <div className="absolute right-0 top-0 bottom-0 w-[70px] flex items-center justify-center z-0">
                <motion.button
                    onClick={() => onDelete(event.id)}
                    whileHover={{
                        scale: 1.1,
                        rotate: 15,
                        color: "rgb(239, 68, 68)",
                        backgroundColor: "rgba(239, 68, 68, 0.2)"
                    }}
                    transition={{ duration: 0.2 }}
                    style={{
                        scale: iconScale,
                        rotate: iconRotate,
                        color: iconColor,
                        backgroundColor
                    }}
                    className="w-10 h-10 flex items-center justify-center rounded-xl cursor-pointer"
                >
                    <FontAwesomeIcon
                        icon={faTrash}
                        className="text-lg"
                    />
                </motion.button>
            </div>

            {/* 2. Draggable Content Layer */}
            {/* 
             * TOUCH DEVICE INTERACTION LOGIC
             * -----------------------------
             * We apply `touch-action: pan-y` (via tailwind 'touch-pan-y') to this element.
             * 
             * Business Logic:
             * On touch devices, users often scroll vertically through the list.
             * Without this directive, a horizontal swipe gesture might be interpreted by the
             * browser as an attempt to scroll the page vertically if the finger drifts slightly.
             * 
             * `pan-y` explicitly tells the browser: "Handle vertical scrolls yourself, but
             * yield control to the application (us) for horizontal gestures."
             * This ensures the swipe-to-delete action feels native, responsive, and
             * does not accidentally trigger page scrolling.
             */}
            <motion.div
                drag="x"
                dragConstraints={{ left: OPEN_X, right: 0 }}
                dragElastic={{ right: 0, left: 0.4 }}
                onDragEnd={handleDragEnd}
                animate={controls}
                style={{ x }}
                whileTap={{ cursor: "grabbing" }}
                className="relative z-10 flex items-center gap-6 p-5 bg-sub-alt border border-transparent cursor-grab active:cursor-grabbing shadow-sm hover:shadow-xl rounded-2xl transition-colors duration-300 touch-pan-y"
            >
                {/* Dynamic Background Gradient (Right side) */}
                <div
                    className="absolute inset-0 transition-opacity duration-500 pointer-events-none opacity-80 rounded-2xl"
                    style={{
                        background: `radial-gradient(circle at 100% 50%, ${gradientColor}, transparent 60%)`
                    }}
                />
                {/* Hover Gradient Overlay */}
                <div
                    className={`absolute inset-0 transition-opacity duration-300 pointer-events-none opacity-0 group-hover:opacity-100 rounded-2xl`}
                    style={{
                        background: `radial-gradient(circle at 100% 50%, ${hoverGradientColor}, transparent 70%)`
                    }}
                />

                {/* Icon Wrapper */}
                {event.type === 'manual_adjustment' && event.targets && event.targets.length > 0 ? (
                    (() => {
                        const targetId = event.targets![0];
                        const targetInnerface = innerfaces.find(i => i.id == targetId);
                        return (
                            <div className="relative z-10 group-hover:scale-105 transition-transform duration-500">
                                <PowerIcon
                                    icon={event.protocolIcon}
                                    color={targetInnerface?.color || effectiveColor}
                                    category={targetInnerface?.category}
                                    size="w-14 h-14"
                                    glowSize="20px"
                                />
                            </div>
                        );
                    })()
                ) : (
                    <TooltipProvider delayDuration={300}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onFilterProtocol(String(event.protocolId));
                                    }}
                                    className="relative w-14 h-14 flex items-center justify-center rounded-2xl text-2xl shrink-0 transition-[transform,box-shadow] duration-500 z-10 group-hover:scale-105 cursor-pointer hover:shadow-lg"
                                    style={{
                                        backgroundColor: `color-mix(in srgb, ${effectiveColor} 20%, transparent)`,
                                        color: effectiveColor,
                                        boxShadow: `0 0 20px color-mix(in srgb, ${effectiveColor} 8%, transparent)`
                                    }}
                                >
                                    <div
                                        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-500"
                                        style={{ backgroundColor: effectiveColor }}
                                    />
                                    {isSystem ? <FontAwesomeIcon icon={faGear} /> : isDecay ? <FontAwesomeIcon icon={faHourglassHalf} /> : <AppIcon id={event.protocolIcon} />}
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                <span className="font-mono text-xs">Filter by {event.protocolName}</span>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}

                {/* Main Content Area */}
                <div className="relative flex-1 flex flex-col lg:flex-row lg:items-center justify-between min-w-0 z-10 gap-4">
                    <div className="flex flex-col gap-1 min-w-0">
                        <div className="flex items-center gap-4">
                            <h3 className="text-lg font-lexend font-bold text-text-primary truncate transition-colors group-hover:text-text-primary">
                                {event.protocolName}
                            </h3>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-sub font-mono uppercase tracking-[0.15em] opacity-60 group-hover:opacity-100 transition-opacity">
                            <div className="flex items-center gap-1.5">
                                <FontAwesomeIcon icon={faClock} className="text-[0.8em]" />
                                {format(parseISO(event.timestamp), 'HH:mm')}
                            </div>
                            <span className="opacity-20">•</span>
                            <span>
                                {event.type === 'protocol' ? 'check-in' :
                                    event.type === 'manual_adjustment' ? 'manual adjustment' :
                                        'system event'}
                            </span>
                            {isSystem && event.details?.from !== undefined && event.details?.to !== undefined && (
                                <>
                                    <span className="opacity-20">•</span>
                                    <span className="text-sub">
                                        {event.details.from.toFixed(2)} → <span className="text-text-primary">{event.details.to.toFixed(2)}</span>
                                    </span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Innerface Changes Grid */}
                    <div className="flex flex-wrap justify-start lg:justify-end gap-2 max-w-full">
                        {Object.entries(event.changes).map(([innerfaceId, change]) => {
                            const iface = innerfaces.find(i => i.id == innerfaceId);
                            const isHistorical = iface?.versionTimestamp && event.timestamp <= iface.versionTimestamp;
                            const xpChange = Math.round(change * 100);

                            return (
                                <TooltipProvider key={innerfaceId} delayDuration={300}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <button
                                                onClick={() => onFilterInnerface(innerfaceId)}
                                                className={`flex items-center gap-3 px-3 py-2 rounded-xl bg-black/20 hover:bg-black/30 transition-[color,background-color,border-color,opacity,transform] border border-transparent hover:border-white/5 active:scale-95 group/iface cursor-pointer ${isHistorical ? 'opacity-30 grayscale-[0.5] hover:opacity-60 scale-[0.98]' : ''}`}
                                            >
                                                <div
                                                    className="w-1.5 h-1.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]"
                                                    style={{ backgroundColor: iface?.color || 'gray', boxShadow: `0 0 10px ${iface?.color || 'gray'}40` }}
                                                />
                                                <span className="text-[10px] font-mono font-bold text-text-primary uppercase tracking-tight opacity-70 group-hover/iface:opacity-100 transition-opacity">
                                                    {iface ? iface.name : innerfaceId}
                                                    {isHistorical && <span className="ml-2 opacity-50 text-[7px] font-black tracking-widest uppercase bg-white/5 px-1 rounded-sm">Archived</span>}
                                                    {!isHistorical && iface?.deletedAt && <span className="ml-2 opacity-50 text-[7px] font-black tracking-widest uppercase bg-error/10 text-error px-1 rounded-sm">Deleted</span>}
                                                </span>
                                                <div className="h-3 w-px bg-white/5" />
                                                <span className={`text-[10px] font-mono font-black ${change > 0 ? 'text-correct' : 'text-error'}`}>
                                                    {change > 0 ? '+' : ''}{xpChange} XP
                                                </span>
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <span className="font-mono text-xs">
                                                {isHistorical
                                                    ? `Archived: This entry belonged to a previous "Starting Point".`
                                                    : iface?.deletedAt
                                                        ? `This power has been deleted, but its history contributes to your score.`
                                                        : `Filter by ${iface?.name || innerfaceId}`}
                                            </span>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            );
                        })}
                        {event.comment && (
                            <TooltipProvider delayDuration={200}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="group/comment relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-main/20 to-main/10 hover:from-main/30 hover:to-main/20 transition-[background,transform,box-shadow] duration-300 cursor-pointer hover:scale-110 hover:shadow-lg hover:shadow-main/20">
                                            <FontAwesomeIcon
                                                icon={faComment}
                                                className="text-main text-base group-hover/comment:scale-110 transition-transform duration-300"
                                            />
                                            <div className="absolute inset-0 rounded-xl bg-main/0 group-hover/comment:bg-main/5 transition-colors duration-300" />
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-xs">
                                        <div className="space-y-1">
                                            <div className="text-[10px] uppercase tracking-wider text-sub font-bold">Comment</div>
                                            <div className="font-mono text-xs text-text-primary whitespace-pre-wrap break-words">
                                                {event.comment}
                                            </div>
                                        </div>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
});
