import React, { useMemo, useState } from 'react';
import type { Protocol } from '../../protocols/types';
import type { SmartPlannerPace } from '../types';
import { AppIcon } from '../../../components/ui/atoms/AppIcon';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import { PACE_CONFIGS, getWeeklySchedule, calculateWeeksToGoal, formatWeeksToGoal } from '../utils/paceCalculator';
import { getInterpolatedColor } from '../../../utils/colorUtils';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '../../../components/ui/atoms/Tooltip';

interface PlanningActionListProps {
    linkedProtocols: Protocol[];
    isCustomizing: boolean;
    actionCounts: Record<string, number>;
    setActionCounts: React.Dispatch<React.SetStateAction<Record<string, number>>>;
    setIsCustomizing: (value: boolean) => void;
    pointsNeeded: number;
    // New Props for State Management Lift
    deactivatedProtocols: Set<string>;
    handleProtocolToggle: (protocolId: string) => void;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface PlanningActionItemProps {
    protocol: Protocol;
    isDeactivated: boolean;
    currentPace: SmartPlannerPace;
    actionCounts: Record<string, number>;
    customSchedules: Record<string, boolean[]>;
    handleProtocolToggle: (id: string) => void;
    handlePaceChange: (id: string, pace: SmartPlannerPace) => void;
    handleDayToggle: (id: string, index: number) => void;
}

function PlanningActionItem({
    protocol,
    isDeactivated,
    currentPace,
    actionCounts,
    customSchedules,
    handleProtocolToggle,
    handlePaceChange,
    handleDayToggle
}: PlanningActionItemProps) {
    const [hoveredDayIndex, setHoveredDayIndex] = useState<number | null>(null);
    const protocolId = String(protocol.id);
    const xp = Math.round((protocol.weight || 0.1) * 100);
    const checksPerWeek = actionCounts[protocolId] || PACE_CONFIGS[currentPace].checksPerWeek;
    const weeklyXP = checksPerWeek * xp;

    // Use custom schedule if exists, otherwise use pace-based schedule
    const isCustomSchedule = !!customSchedules[protocolId];
    const schedule = customSchedules[protocolId] || getWeeklySchedule(checksPerWeek);
    const iconColor = protocol.color || 'var(--main-color)';

    return (
        <div
            key={protocol.id}
            className={`flex flex-col gap-2.5 p-3 rounded-xl bg-sub-alt ${isDeactivated
                ? ''
                : 'group transition-[transform,box-shadow] duration-300 hover:scale-[1.02] hover:shadow-lg'
                }`}
        >
            {/* Header: Icon, Title, XP */}
            <div className="flex items-center gap-3">
                <Tooltip delayDuration={300}>
                    <TooltipTrigger asChild>
                        <button
                            type="button"
                            onClick={() => handleProtocolToggle(protocolId)}
                            className={`relative w-8 h-8 flex-shrink-0 rounded-lg flex items-center justify-center cursor-pointer hover:scale-105 transition-[transform,filter] duration-300 ${isDeactivated ? 'grayscale hover:grayscale-0' : ''}`}
                            style={{
                                backgroundColor: `color-mix(in srgb, ${iconColor} 20%, transparent)`,
                                color: iconColor,
                                boxShadow: `0 0 15px color-mix(in srgb, ${iconColor} 8%, transparent)`
                            }}
                        >
                            <AppIcon id={protocol.icon} />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" align="center" className="max-w-[300px] break-words z-[100]">
                        <div className={`flex flex-col ${protocol.hover ? 'border-b border-sub/50 pb-1 mb-1' : ''}`}>
                            <div className="font-bold text-center">{protocol.title}</div>
                            {protocol.description && <div className="text-center text-xs">{protocol.description}</div>}
                        </div>

                        {/* Quick Note */}
                        {protocol.hover && (
                            <div className="text-center text-xs">
                                {protocol.hover}
                            </div>
                        )}
                    </TooltipContent>
                </Tooltip>

                <div className={`flex flex-col flex-1 min-w-0 transition-[opacity,filter] duration-300 ${isDeactivated ? 'grayscale opacity-50' : ''}`}>
                    <span className="text-xs font-medium truncate text-text-primary cursor-default">
                        {protocol.title}
                    </span>
                    <span className="text-[9px] text-sub cursor-default">
                        +{xp} XP each
                    </span>
                </div>
                <div className={`text-right transition-[opacity,filter] duration-300 ${isDeactivated ? 'grayscale opacity-50' : ''}`}>
                    <div className="text-xs font-mono font-bold text-main cursor-default">
                        +{weeklyXP}
                    </div>
                    <div className="text-[9px] text-sub cursor-default">
                        XP/week
                    </div>
                </div>
            </div>

            <div className={`${isDeactivated ? 'pointer-events-none grayscale opacity-50 transition-[opacity,filter] duration-300' : ''}`}>
                {/* Pace Selector - clickable even in custom mode */}
                <div className="flex gap-1.5 mb-2.5">
                    {(['slow', 'medium', 'fast'] as SmartPlannerPace[]).map(pace => {
                        const config = PACE_CONFIGS[pace];
                        const isActive = currentPace === pace && !isCustomSchedule;

                        return (
                            <button
                                key={pace}
                                type="button"
                                onClick={() => handlePaceChange(protocolId, pace)}
                                className={`
                                    flex-1 px-2 py-1.5 rounded-lg text-[9px] font-mono uppercase tracking-wide
                                    transition-[opacity,color,background-color] duration-200
                                    ${isCustomSchedule
                                        ? 'bg-sub-alt/30 text-sub opacity-60 hover:opacity-80 hover:text-text-primary'
                                        : isActive
                                            ? 'bg-main text-bg-primary font-bold'
                                            : 'bg-sub-alt/50 text-sub hover:bg-sub-alt hover:text-text-primary'
                                    }
                                `}
                            >
                                <div>{config.label}</div>
                                <div className="text-[8px] opacity-70">{config.checksPerWeek}/w</div>
                            </button>
                        );
                    })}
                </div>

                {/* Micro-Calendar */}
                <div className="flex flex-col gap-0.5">
                    {/* Day Labels */}
                    <div className="grid grid-cols-7 gap-[1.5px]">
                        {DAY_LABELS.map((day, i) => (
                            <span
                                key={i}
                                className={`text-[8px] font-mono text-center transition-colors duration-200 ${hoveredDayIndex === i ? 'text-main font-bold opacity-100' : 'text-sub opacity-50'}`}
                            >
                                {day}
                            </span>
                        ))}
                    </div>
                    {/* Check Marks */}
                    <div className="grid grid-cols-7 gap-[1.5px]">
                        {schedule.map((hasCheck, i) => (
                            <button
                                key={i}
                                type="button"
                                onMouseEnter={() => setHoveredDayIndex(i)}
                                onMouseLeave={() => setHoveredDayIndex(null)}
                                onClick={() => handleDayToggle(protocolId, i)}
                                className={`
                                    w-full aspect-square flex items-center justify-center
                                    transition-opacity duration-200 cursor-pointer
                                    group/check
                                    ${hasCheck
                                        ? 'opacity-100'
                                        : 'opacity-20 hover:opacity-60'
                                    }
                                `}
                                style={{
                                    color: hasCheck ? (isCustomSchedule ? 'var(--main-color)' : PACE_CONFIGS[currentPace].color) : 'var(--text-sub)'
                                }}
                            >
                                <FontAwesomeIcon
                                    icon={faCheck}
                                    className="text-[10px] transition-[transform,color] duration-200 group-hover/check:scale-[1.3] group-hover/check:text-text-primary"
                                />
                            </button>
                        ))}
                    </div>
                    {isCustomSchedule && (
                        <div className="text-[8px] text-sub/70 text-center mt-0.5">
                            Custom schedule
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export function PlanningActionList({
    linkedProtocols,
    actionCounts,
    setActionCounts,
    setIsCustomizing,
    pointsNeeded,
    // Received from parent
    deactivatedProtocols,
    handleProtocolToggle
}: PlanningActionListProps) {

    // Track pace for each protocol (default: medium)
    const [protocolPaces, setProtocolPaces] = useState<Record<string, SmartPlannerPace>>(() => {
        const initial: Record<string, SmartPlannerPace> = {};
        linkedProtocols.forEach(p => {
            initial[String(p.id)] = 'medium';
        });
        return initial;
    });

    // Track custom schedules (when user manually clicks days)
    const [customSchedules, setCustomSchedules] = useState<Record<string, boolean[]>>({});

    // REMOVED: Local deactivatedProtocols state and handleProtocolToggle
    // Now using props passed from usePlanningLogic

    // Calculate total weekly XP from all protocols
    const totalWeeklyXP = useMemo(() => {
        return linkedProtocols.reduce((sum, protocol) => {
            const protocolId = String(protocol.id);
            // Optimization: Skip calculation if protocol is deactivated
            if (deactivatedProtocols.has(protocolId)) return sum;

            const xp = Math.round((protocol.weight || 0.1) * 100);

            // Use actionCounts directly
            const checksPerWeek = actionCounts[protocolId] || 0;

            return sum + (checksPerWeek * xp);
        }, 0);
    }, [linkedProtocols, actionCounts, deactivatedProtocols]);

    // Calculate weeks needed based on totalWeeklyXP
    const weeksNeeded = useMemo(() => {
        const xpNeeded = Math.round(pointsNeeded * 100);
        return calculateWeeksToGoal(xpNeeded, totalWeeklyXP);
    }, [pointsNeeded, totalWeeklyXP]);


    // Handle pace change for a protocol
    const handlePaceChange = (protocolId: string, pace: SmartPlannerPace) => {
        setProtocolPaces(prev => ({ ...prev, [protocolId]: pace }));
        setActionCounts(prev => ({
            ...prev,
            [protocolId]: PACE_CONFIGS[pace].checksPerWeek
        }));
        // Clear custom schedule when using pace selector
        setCustomSchedules(prev => {
            const next = { ...prev };
            delete next[protocolId];
            return next;
        });
        setIsCustomizing(true);
    };

    // Handle manual day toggle
    const handleDayToggle = (protocolId: string, dayIndex: number) => {
        // Use effective counts for initial schedule if starting interaction
        const currentCount = actionCounts[protocolId] || 0;
        const currentSchedule = customSchedules[protocolId] || getWeeklySchedule(currentCount);
        const newSchedule = [...currentSchedule];
        newSchedule[dayIndex] = !newSchedule[dayIndex];

        setCustomSchedules(prev => ({ ...prev, [protocolId]: newSchedule }));

        // Update action count based on number of checked days
        const newCount = newSchedule.filter(Boolean).length;
        setActionCounts(prev => ({ ...prev, [protocolId]: newCount }));
        setIsCustomizing(true);
    };

    if (linkedProtocols.length === 0) {
        return (
            <div className="group py-8 text-center border border-dashed border-sub/30 hover:border-sub rounded-xl cursor-default select-none">
                <span className="text-sm font-mono text-sub opacity-70 group-hover:opacity-100 group-hover:text-text-primary transition-opacity">
                    <span className="font-bold text-main/80 group-hover:text-main">Tip:</span> link actions in Skill Settings
                </span>
            </div>
        );
    }

    // Sort by XP (highest first)
    const sortedProtocols = [...linkedProtocols].sort((a, b) =>
        ((b.weight || 0.1) * 100) - ((a.weight || 0.1) * 100)
    );



    return (
        <TooltipProvider>
            {/* Summary Header */}
            {/* Protocol List */}
            <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto custom-scrollbar p-1 mb-4">
                {sortedProtocols.map(protocol => (
                    <PlanningActionItem
                        key={protocol.id}
                        protocol={protocol}
                        isDeactivated={deactivatedProtocols.has(String(protocol.id))}
                        currentPace={protocolPaces[String(protocol.id)] || 'medium'}
                        actionCounts={actionCounts}
                        customSchedules={customSchedules}
                        handleProtocolToggle={handleProtocolToggle}
                        handlePaceChange={handlePaceChange}
                        handleDayToggle={handleDayToggle}
                    />
                ))}
            </div >

            {/* Compact Footer Summary */}
            <div className="bg-sub-alt/70 [@media(hover:hover)]:bg-sub-alt/40 rounded-xl p-3 flex items-center justify-between [@media(hover:hover)]:backdrop-blur-sm">
                <div className="flex flex-col gap-0.5">
                    <div className="text-[10px] text-sub font-mono uppercase tracking-wider mb-0.5">
                        Weekly Pace
                    </div>
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-sm font-mono font-bold text-main">
                            {totalWeeklyXP} XP
                        </span>
                    </div>
                </div>

                <div className="text-right">
                    <span className="text-[10px] text-sub font-mono uppercase tracking-wider block mb-0.5">
                        Time to Goal
                    </span>
                    <span
                        className={`text-sm font-mono font-bold ${totalWeeklyXP > 0
                            ? weeksNeeded < 5
                                ? 'text-correct'
                                : weeksNeeded < 13
                                    ? 'text-main'
                                    : weeksNeeded < 22
                                        ? '' // Orange (handled by style)
                                        : 'text-error'
                            : 'text-sub'
                            }`}
                        style={totalWeeklyXP > 0 && weeksNeeded >= 13 && weeksNeeded < 22 ? { color: getInterpolatedColor(4.25) } : undefined}
                    >
                        {totalWeeklyXP > 0 ? formatWeeksToGoal(weeksNeeded) : '—'}
                    </span>
                </div>
            </div>
        </TooltipProvider>
    );
}
