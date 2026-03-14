import React, { useMemo, useState } from 'react';
import { usePlanningStore } from '../../../stores/planningStore';
import { useScoreContext } from '../../../contexts/ScoreContext';
import { AppIcon } from '../../../components/ui/atoms/AppIcon';
import { getWeeklyProgress, getDailyCheckIns } from '../../../utils/weeklyProgressUtils';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCrown } from '@fortawesome/free-solid-svg-icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../components/ui/atoms/Tooltip';
import type { Protocol } from '../../protocols/types';
import type { HistoryRecord } from '../../../types/history';
import type { PlanningGoal } from '../../planning/types';
import type { Innerface } from '../../innerfaces/types';

const ITEMS_PER_PAGE = 4;
const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const FullDayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface WeeklyFocusRowProps {
    protocol: Protocol;
    planned: number;
    completed: number;
    bonus: number;
    isCapped: boolean; // Custom logic: True if target > 7 but capped at 7 for UI
    isLowFrequency: boolean;
    periodLabel?: string;
    realTarget: number;
    linkedGoals?: Array<{ title: string; count: number }>;
    history: HistoryRecord[];
    goals: Record<string, PlanningGoal>;
    innerfaces: Innerface[];
    setHoveredDayIndex: (index: number | null) => void;
}

/**
 * Renders a single protocol's weekly progress row.
 * Includes:
 * - Icon with hover tooltip (showing goal details, frequency, and progress).
 * - Micro-calendar (7 checkmarks).
 * - Progress counter with crown for completion.
 */
function WeeklyFocusRow({
    protocol,
    planned,
    completed,
    bonus,
    isCapped,
    isLowFrequency,
    periodLabel,
    realTarget,
    linkedGoals,
    history,
    goals,
    innerfaces,
    setHoveredDayIndex
}: WeeklyFocusRowProps) {
    const isComplete = completed >= planned;

    // Calculate daily check-ins for micro-calendar
    // Memoized to prevent recalculation on parent re-renders unless data changes
    const dailyCheckIns = useMemo(() =>
        getDailyCheckIns(String(protocol.id), history, goals, innerfaces),
        [protocol.id, history, goals, innerfaces]
    );

    // Crown Color Logic: Gold for normal completion, Warning Orange if capped (showing "max effort")
    const crownColor = isCapped ? 'var(--warning-color, #d19a66)' : 'var(--correct-color)';

    // Find last check-in note for this protocol to display in tooltip
    const lastRecord = history.find(r =>
        (r.type === 'protocol' || r.type === 'manual_adjustment') &&
        String(r.protocolId) === String(protocol.id) &&
        r.details?.note
    );
    const lastNote = lastRecord?.details?.note as string | undefined;

    return (
        <React.Fragment>
            {/* Protocol Icon Column */}
            <div className="col-start-1 animate-fade-in flex items-center">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div
                            className={`w-6 h-6 flex items-center justify-center rounded text-xs transition-[opacity,filter] duration-300 flex-shrink-0
                                ${completed > 0 ? '' : 'grayscale opacity-50'}
                            `}
                            style={{
                                backgroundColor: `color-mix(in srgb, ${protocol.color || '#ffffff'} 20%, transparent)`,
                                color: protocol.color || 'var(--text-color)',
                                boxShadow: `0 0 10px color-mix(in srgb, ${protocol.color || '#ffffff'} 8%, transparent)`
                            }}
                        >
                            <AppIcon id={protocol.icon} />
                        </div>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-[200px]">
                        <div className="flex flex-col gap-2">
                            <div>
                                <p className="font-bold text-xs">{protocol.title}</p>
                                {protocol.description && (
                                    <p className="text-[10px] text-sub text-wrap">{protocol.description}</p>
                                )}
                            </div>

                            {/* Low Frequency Explanation */}
                            {isLowFrequency && (
                                <div className="pt-2 border-t border-white/10">
                                    <p className="text-[9px] text-sub uppercase tracking-wider mb-0.5">
                                        Frequency Goal
                                    </p>
                                    <p className="text-[10px] text-main">
                                        {planned} actions per {periodLabel}
                                    </p>
                                </div>
                            )}

                            {/* High Frequency Cap Warning */}
                            {isCapped && (
                                <div className="pt-2 border-t border-white/10">
                                    <p className="text-[9px] uppercase tracking-wider mb-0.5 font-bold" style={{ color: 'var(--warning-color, #d19a66)' }}>
                                        Maximum Effort! 🔥
                                    </p>
                                    <p className="text-[10px] text-sub">
                                        You're doing 7/7, but your ambitious deadline technically needs <b>{realTarget}/week</b>.
                                        <br />
                                        <span className="italic opacity-80">Tip: Extending your target date might make this journey more enjoyable.</span>
                                    </p>
                                </div>
                            )}

                            {/* Linked Goals Section */}
                            {linkedGoals && linkedGoals.length > 0 && (
                                <div className="pt-2 border-t border-white/10">
                                    <p className="text-[9px] text-sub uppercase tracking-wider mb-1">
                                        Contributing to:
                                    </p>
                                    <div className="flex flex-col gap-0.5">
                                        {linkedGoals.map((g, idx) => (
                                            <div key={idx} className="flex justify-between items-center text-[10px]">
                                                <span className="text-text-primary/90">{g.title}</span>
                                                <span className="text-sub font-mono">{g.count}/wk</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {lastNote && (
                                <div className="pt-2 border-t border-white/10">
                                    <p className="text-[9px] text-sub uppercase tracking-wider mb-0.5">Quick Note</p>
                                    <p className="text-[10px] italic" style={{ color: 'var(--main-color)' }}>"{lastNote}"</p>
                                </div>
                            )}

                            {/* Progress Summary in Tooltip */}
                            <div className="pt-2 border-t border-white/10 flex justify-between text-[10px] font-mono">
                                <span className="text-sub">Progress</span>
                                <span style={{ color: isComplete ? crownColor : 'var(--text-sub)' }}>
                                    {completed}/{planned} {bonus > 0 && `(+${bonus})`}
                                </span>
                            </div>
                        </div>
                    </TooltipContent>
                </Tooltip>
            </div>

            {/* Check Marks Column - Aligned with Day Labels */}
            <div className="col-start-2 grid grid-cols-7 gap-[1.5px] animate-fade-in">
                {dailyCheckIns.map((day, i) => {
                    const hasMultipleGoals = day.goalCount > 1;
                    const checkColor = day.hasCheckIn
                        ? 'var(--correct-color)'
                        : 'var(--text-sub-alt)';

                    const Checkmark = (
                        <div
                            onMouseEnter={() => setHoveredDayIndex(i)}
                            onMouseLeave={() => setHoveredDayIndex(null)}
                            className={`w-full aspect-square flex items-center justify-center rounded cursor-default checkmark-hover
                                ${day.hasCheckIn ? 'opacity-100' : 'opacity-20'}
                                ${hasMultipleGoals && day.hasCheckIn ? 'check-intense' : ''}
                            `}
                            style={{
                                '--check-color': checkColor,
                                backgroundColor: 'transparent'
                            } as React.CSSProperties}
                        >
                            <span className="text-[10px] leading-none">✓</span>
                        </div>
                    );

                    if (!day.hasCheckIn) {
                        return <React.Fragment key={i}>{Checkmark}</React.Fragment>;
                    }

                    return (
                        <Tooltip key={i} delayDuration={0}>
                            <TooltipTrigger asChild>
                                {Checkmark}
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-[10px]">
                                <div className="flex flex-col gap-0.5">
                                    <div className="flex items-center gap-1.5 pb-1 border-b border-white/10 mb-0.5">
                                        <span className="font-bold text-main">
                                            {FullDayNames[i]}
                                        </span>
                                    </div>

                                    <span className="text-sub">
                                        {day.checkInCount} check-in{day.checkInCount > 1 ? 's' : ''}
                                    </span>
                                    {day.linkedGoals.length > 0 && (
                                        <div className="pt-2 border-t border-white/10">
                                            <p className="text-[9px] text-sub uppercase tracking-wider mb-1">
                                                Contributing to:
                                            </p>
                                            <div className="flex flex-col gap-0.5">
                                                {day.linkedGoals.map((g, idx) => (
                                                    <div key={idx} className="flex justify-between items-center text-[10px]">
                                                        <span className="text-text-primary/90">{g.title}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    );
                })}
            </div>

            {/* Status Column */}
            <div className="col-start-3 flex items-center gap-1.5 animate-fade-in">
                <span className={`text-[10px] font-mono w-6 text-right ${isComplete ? 'line-through text-sub opacity-50' : 'text-sub'}`}>
                    {completed}/{planned}
                </span>
                <div className="w-3 flex justify-center">
                    {isComplete && (
                        <span className="text-[10px] animate-bounce-subtle" style={{ color: crownColor }} title="Goal Met!">
                            <FontAwesomeIcon icon={faCrown} />
                        </span>
                    )}
                </div>
            </div>
        </React.Fragment>
    );
}

export function WeeklyFocus() {
    const { goals } = usePlanningStore();
    const { protocols, history, innerfaces } = useScoreContext();
    const [currentPage, setCurrentPage] = useState(0);
    const [hoveredDayIndex, setHoveredDayIndex] = useState<number | null>(null);

    // Calculate weekly progress using memoized utility
    const weeklyProgress = useMemo(() => {
        return getWeeklyProgress(goals, history, protocols, innerfaces);
    }, [goals, history, protocols, innerfaces]);

    if (weeklyProgress.length === 0) return null;

    const totalPages = Math.ceil(weeklyProgress.length / ITEMS_PER_PAGE);
    const displayedItems = weeklyProgress.slice(
        currentPage * ITEMS_PER_PAGE,
        (currentPage + 1) * ITEMS_PER_PAGE
    );

    return (
        <div className="flex flex-col items-center gap-0.5 animate-fade-in cursor-default select-none min-h-fit md:min-h-[160px] justify-center">
            <span className="text-[10px] font-mono text-sub uppercase tracking-widest opacity-60 text-center w-full">
                Weekly Focus
            </span>

            {/* Single Grid Container for entire calendar */}
            <div
                className="grid gap-x-2 gap-y-0.5 w-full max-w-[320px] transition-opacity duration-300 items-center justify-center"
                style={{
                    gridTemplateColumns: '24px 1fr 52px',
                    gridTemplateRows: 'auto'
                }}
            >
                {/* Header Row: Icon Spacer | Day Labels | Status Spacer */}
                <div className="col-start-1" /> {/* Empty cell for icon column */}
                <div className="col-start-2 grid grid-cols-7 gap-[1.5px] mb-0">
                    {DAY_LABELS.map((day, i) => (
                        <span
                            key={i}
                            className={`text-[8px] font-mono text-center transition-colors duration-200 ${hoveredDayIndex === i ? 'text-main font-bold' : 'text-sub opacity-50'
                                }`}
                        >
                            {day}
                        </span>
                    ))}
                </div>
                <div className="col-start-3" /> {/* Empty cell for status column */}

                {/* Protocol Rows */}
                {displayedItems.map((item) => (
                    <WeeklyFocusRow
                        key={item.protocol.id}
                        {...item}
                        history={history}
                        goals={goals}
                        innerfaces={innerfaces}
                        setHoveredDayIndex={setHoveredDayIndex}
                    />
                ))}
            </div>

            {/* Pagination Dots */}
            {totalPages > 1 && (
                <div className="flex gap-1 self-center items-center h-4 pagination-dots isolate">
                    {Array.from({ length: totalPages }).map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setCurrentPage(i)}
                            className="group/dot relative flex items-center justify-center w-4 h-4 cursor-pointer outline-none focus:outline-none"
                            aria-label={`Go to page ${i + 1}`}
                        >
                            {/* Visual Dot */}
                            <div
                                className={`w-1.5 h-1.5 rounded-full transition-[background-color,transform] duration-300 ease-out
                                    ${i === currentPage
                                        ? 'bg-main scale-125'
                                        : 'bg-white/10 group-hover/dot:bg-text-primary group-hover/dot:scale-150'
                                    }
                                `}
                            />
                        </button>
                    ))}
                </div>
            )}

            <style>{`
                @keyframes bounce-subtle {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-2px); }
                }
                .animate-bounce-subtle {
                    animation: bounce-subtle 2s infinite ease-in-out;
                }
                .animate-fade-in {
                    animation: fadeIn 0.3s ease-out;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(2px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                /* Premium glow effect for multiple goals */
                .check-intense {
                    /* Removed background glow as requested */
                }
                
                /* Hover effect for checkmarks */
                .checkmark-hover {
                    color: var(--check-color);
                    transition: color 0.2s, background-color 0.2s, transform 0.2s, opacity 0.2s;
                }
                .checkmark-hover:hover,
                .checkmark-hover:hover > span {
                    color: var(--text-color) !important;
                    opacity: 1 !important;
                }
                .checkmark-hover:hover {
                    background-color: transparent !important;
                    transform: scale(1.1);
                }
            `}</style>
        </div>
    );
}
