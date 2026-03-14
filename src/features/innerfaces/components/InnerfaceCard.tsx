import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { MARKDOWN_TOOLTIP_COMPONENTS } from '../../../utils/markdownComponents';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../../components/ui/atoms/Card';
import type { Innerface } from '../types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCog, faHistory, faArrowUp, faArrowDown, faBullseye } from '@fortawesome/free-solid-svg-icons';
import { getTierColor } from '../../../utils/colorUtils';
import { calculateLevel, scoreToXP } from '../../../utils/xpUtils';
import { PowerIcon } from './PowerIcon';
import { useTouchDevice } from '../../../hooks/useTouchDevice';
import { useTruncation } from '../../../hooks/useTruncation';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../components/ui/atoms/Tooltip';

interface InnerfaceCardProps {
    innerface: Innerface;
    onEdit?: () => void;
    onPlanning?: () => void;
    forceHover?: boolean;
    hasGoal?: boolean;
}

export const InnerfaceCard = React.memo(function InnerfaceCard({ innerface, onEdit, onPlanning, forceHover, hasGoal }: InnerfaceCardProps) {
    const navigate = useNavigate();

    const [isTapped, setIsTapped] = React.useState(false);
    const isTouchDevice = useTouchDevice();

    // Truncation detection
    const { ref: titleRef, isTruncated: isTitleTruncated } = useTruncation();
    const { ref: descRef, isTruncated: isDescTruncated } = useTruncation();

    // Show hover state if forceHover is true or tapped on mobile
    const shouldShowHover = forceHover || isTapped;

    /**
     * Touch Handling Logic
     * Explicitly handles the "Tap to Reveal" behavior on touch devices.
     * Toggling `isTapped` reveals the edit/history buttons that are normally hover-only.
     */
    const handleCardClick = () => {
        if (isTouchDevice) {
            setIsTapped(!isTapped);
        }
    };

    // XP Calculation
    const currentScore = innerface.currentScore || innerface.initialScore || 0;
    const totalXP = scoreToXP(currentScore);

    // Business Logic: Level Calculation
    // Uses the central utility to derive level, remaining XP, and progress % from total XP.
    // This drives the visual progress bar and tier coloring.
    const { level, currentLevelXP, progress } = calculateLevel(totalXP);
    const tierColor = getTierColor(level);

    /**
     * Action Handlers
     * preventPropagation ensures that clicking an action button doesn't 
     * trigger the card's main click handler (which might toggle "tapped" state).
     */
    const handleHistory = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigate('/history', { state: { filterInnerfaceId: String(innerface.id) } });
    };

    const handleEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        onEdit?.();
    };

    const handlePlan = (e: React.MouseEvent) => {
        e.stopPropagation();
        onPlanning?.();
    };

    return (
        <Card
            onClick={handleCardClick}
            className={`group relative overflow-hidden p-4 flex flex-col justify-between min-h-[105px] transition-[transform,box-shadow] duration-300 border border-transparent text-left select-none cursor-grab active:cursor-grabbing ${shouldShowHover ? '-translate-y-[2px] shadow-lg' : '[@media(hover:hover)]:hover:-translate-y-[2px] [@media(hover:hover)]:hover:shadow-lg'}`}
        >
            {/* 1. Dynamic Gradient from Tier Color */}
            <div
                className={`absolute -right-10 -bottom-10 w-48 h-48 blur-[60px] transition-opacity duration-500 opacity-[0.10] ${shouldShowHover ? 'opacity-[0.20]' : '[@media(hover:hover)]:group-hover:opacity-[0.20]'}`}
                style={{
                    background: `radial-gradient(circle, ${tierColor} 0%, transparent 70%)`
                }}
            />

            {/* Focused Glow */}
            <div
                className={`absolute inset-x-0 top-0 h-24 opacity-0 transition-opacity duration-500 ease-out pointer-events-none ${shouldShowHover ? 'opacity-[0.05]' : '[@media(hover:hover)]:group-hover:opacity-[0.05]'}`}
                style={{
                    background: `linear-gradient(to bottom, ${tierColor}, transparent)`
                }}
            />

            {/* Header: Icon & Title */}
            <div className="flex items-start justify-between relative z-10 w-full mb-1">
                <div className="flex items-start gap-3 w-full pr-1">
                    {/* Icon */}
                    <PowerIcon
                        icon={innerface.icon}
                        color={innerface.color}
                        category={innerface.category}
                        size="w-10 h-10"
                        className={`transition-transform duration-300 ${shouldShowHover ? 'scale-105' : '[@media(hover:hover)]:group-hover:scale-105'}`}
                    />

                    {/* Title */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="flex flex-col min-w-0 pt-0.5 flex-1 pr-2 pointer-events-auto">
                                <h3
                                    ref={titleRef}
                                    className="font-lexend font-medium text-sm leading-tight text-text-primary truncate w-full"
                                >
                                    {innerface.name}
                                </h3>
                                {innerface.description && (
                                    <p
                                        ref={descRef}
                                        className={`text-[10px] text-sub font-mono uppercase tracking-wider opacity-60 truncate mt-0.5 transition-[opacity,color] duration-300 w-full ${shouldShowHover ? 'opacity-100 text-text-primary' : '[@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-hover:text-text-primary'}`}
                                    >
                                        {innerface.description}
                                    </p>
                                )}
                            </div>
                        </TooltipTrigger>
                        {/* Tooltip Content Logic */}
                        {(isTitleTruncated || isDescTruncated || innerface.hover) && (
                            <TooltipContent side="top" align="center" className="max-w-[300px] break-words z-[100]">
                                {/* Truncated Content */}
                                {(isTitleTruncated || isDescTruncated) && (
                                    <div className={`flex flex-col ${innerface.hover ? 'border-b border-sub/50 pb-1 mb-1' : ''}`}>
                                        {isTitleTruncated && <div className="font-bold text-center">{innerface.name}</div>}
                                        {isDescTruncated && <div className="text-center text-xs">{innerface.description}</div>}
                                    </div>
                                )}

                                {/* Quick Note */}
                                {innerface.hover && (
                                    <div className="rich-text-viewer text-left text-xs">
                                        <ReactMarkdown
                                            rehypePlugins={[rehypeRaw]}
                                            components={MARKDOWN_TOOLTIP_COMPONENTS}>
                                            {innerface.hover}
                                        </ReactMarkdown>
                                    </div>
                                )}
                            </TooltipContent>
                        )}
                    </Tooltip>
                </div>
            </div>

            {/* Middle: Actions & Level Display */}
            <div className="relative z-10 mt-auto mb-2 flex items-end justify-between w-full">
                {/* Left: Actions */}
                <div className="flex flex-row gap-0 items-center ml-1">
                    {/* Target - always visible when goal set, otherwise on hover */}
                    <button
                        onClick={handlePlan}
                        className={`w-7 h-7 flex items-center justify-start transition-[opacity,color] duration-200
                            ${hasGoal
                                ? 'opacity-100 text-main hover:text-white'
                                : `opacity-0 text-sub hover:text-main ${shouldShowHover ? 'opacity-100' : '[@media(hover:hover)]:group-hover:opacity-100'}`
                            }`}
                        title={hasGoal ? "View Goal" : "Set Goal"}
                    >
                        <FontAwesomeIcon icon={faBullseye} className="text-xs" />
                    </button>
                    {/* History - only on hover */}
                    <button
                        onClick={handleHistory}
                        className={`w-7 h-7 flex items-center justify-start text-sub hover:text-main transition-[opacity,color] duration-200 opacity-0 ${shouldShowHover ? 'opacity-100' : '[@media(hover:hover)]:group-hover:opacity-100'}`}
                        title="View History"
                    >
                        <FontAwesomeIcon icon={faHistory} className="text-xs" />
                    </button>
                    {/* Settings - only on hover */}
                    <button
                        onClick={handleEdit}
                        className={`w-7 h-7 flex items-center justify-start text-sub hover:text-main transition-[opacity,color] duration-200 opacity-0 ${shouldShowHover ? 'opacity-100' : '[@media(hover:hover)]:group-hover:opacity-100'}`}
                        title="Settings"
                    >
                        <FontAwesomeIcon icon={faCog} className="text-xs" />
                    </button>
                </div>

                {/* Right: Big Level Number */}
                <div className="flex flex-col items-end h-[42px] justify-end">
                    <div className="flex items-baseline gap-1">
                        <div className="flex flex-col items-center justify-end relative">
                            {currentScore !== innerface.initialScore && (
                                <span className={`absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold leading-none ${currentScore > innerface.initialScore ? 'text-correct' : 'text-error'}`}>
                                    <FontAwesomeIcon icon={currentScore > innerface.initialScore ? faArrowUp : faArrowDown} />
                                </span>
                            )}
                            <span className={`text-[9px] font-mono text-sub uppercase tracking-widest opacity-40 mb-1 transition-[opacity,color] duration-300 block ${shouldShowHover ? 'text-text-primary opacity-100' : '[@media(hover:hover)]:group-hover:text-text-primary [@media(hover:hover)]:group-hover:opacity-100'}`}>
                                Lvl
                            </span>
                        </div>
                        <div
                            className="font-medium font-mono leading-none tracking-tight transition-colors duration-300"
                            style={{
                                color: tierColor,
                                fontSize: innerface.priority === 'low' ? '1.5rem' : (innerface.priority === 'high' ? '3.4rem' : '2.2rem'),
                                lineHeight: '0.8'
                            }}
                        >
                            {level}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom: Progress Bar (XP to next level) */}
            <div className="relative z-10 w-full flex flex-col gap-0.5">
                <div className={`text-[9px] font-mono text-sub ml-1 opacity-50 transition-[opacity,color] duration-300 ${shouldShowHover ? 'opacity-100 text-text-primary' : '[@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-hover:text-text-primary'}`}>
                    {100 - currentLevelXP} XP to next level
                </div>
                <div className="h-[4px] bg-bg-primary/50 w-full rounded-full overflow-hidden my-0.5">
                    <div
                        className="h-full transition-[width] duration-300 ease-out rounded-full"
                        style={{
                            width: `${progress}%`,
                            backgroundColor: tierColor
                        }}
                    />
                </div>
                {/* XP Detail (Visible on hover or always small) */}
                <div className={`flex justify-between items-center text-[9px] font-mono text-sub ml-1 opacity-50 transition-[opacity,color] duration-200 ${shouldShowHover ? 'opacity-100 text-text-primary' : '[@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-hover:text-text-primary'}`}>
                    <span>{currentLevelXP} / 100 XP</span>
                    <span>{totalXP} Total</span>
                </div>
            </div>

        </Card>
    );
});
