import React from 'react';
import type { ReactNode } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faCheck
} from '@fortawesome/free-solid-svg-icons';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '../../../components/ui/atoms/Tooltip';
import * as Popover from '@radix-ui/react-popover';

interface GroupDropdownProps {
    trigger: (isOpen: boolean) => ReactNode;
    children: ReactNode;
    className?: string;
    width?: string;
    isOpen?: boolean;
    onOpenChange?: (isOpen: boolean) => void;
    placement?: string;
    maxHeight?: string;
}

export function GroupDropdown({
    trigger,
    children,
    className = "",
    width = "w-72",
    isOpen,
    onOpenChange,
    maxHeight = "max-h-[60vh]"
}: GroupDropdownProps) {
    return (
        <Popover.Root open={isOpen} onOpenChange={onOpenChange}>
            <Popover.Trigger asChild>
                <div className={className}>
                    {trigger(!!isOpen)}
                </div>
            </Popover.Trigger>

            <Popover.Portal>
                <Popover.Content
                    side="bottom"
                    align="end"
                    sideOffset={12}
                    style={{ width: width === 'w-full' ? 'var(--radix-popover-trigger-width)' : undefined }}
                    className={`z-[100] ${width === 'w-full' ? '' : width} bg-sub-alt rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-[opacity,transform] px-1 py-2 border border-white/5 divide-y divide-white/5 overflow-hidden animate-in fade-in zoom-in-95 duration-200`}
                >
                    <div className={`${maxHeight} overflow-y-auto custom-scrollbar`}>
                        {children}
                    </div>
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
}

interface ItemProps {
    label: ReactNode;
    tooltipText?: string;
    isActive: boolean;
    onClick?: () => void;
    onMouseDown?: (e: React.MouseEvent) => void;
    onIndicatorClick?: (e: React.MouseEvent) => void;
    onIconClick?: () => void;
    icon?: ReactNode;
    style?: React.CSSProperties;
    showIndicator?: boolean;
    showCheck?: boolean;
    className?: string;
    indicatorColor?: string;
    isIndicatorActive?: boolean;
    showTooltip?: boolean;
    isLowercase?: boolean;
}

export function Item({
    label,
    tooltipText,
    isActive,
    onClick,
    onMouseDown,
    onIndicatorClick,
    onIconClick,
    icon,
    style,
    showIndicator = true,
    showCheck = false,
    className = "",
    indicatorColor,
    isIndicatorActive = false,
    showTooltip = false,
    isLowercase = true,
}: ItemProps) {
    return (
        <div
            className={`flex items-center rounded-xl transition-colors group/item-container mx-0.5 ${isActive ? 'bg-sub/30 text-text-primary' : 'text-sub hover:bg-sub/20 hover:text-text-primary'} ${className}`}
            style={style}
        >
            {showIndicator && (
                <button
                    onClick={(e) => {
                        if (onIndicatorClick) {
                            e.stopPropagation();
                            onIndicatorClick(e);
                        }
                    }}
                    type="button"
                    disabled={!onIndicatorClick}
                    className="w-8 h-8 flex items-center justify-center transition-colors shrink-0 group/indicator cursor-pointer ml-1"
                >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${isIndicatorActive ? 'bg-sub' : 'bg-sub-alt/60'} group-hover/indicator:bg-sub`}>
                        <div
                            className={`w-3.5 h-3.5 rounded-full transition-[background-color,box-shadow,border-color] ${isActive
                                ? 'bg-main shadow-[0_0_8px_var(--main-color)]'
                                : 'bg-sub/20 border border-transparent group-hover/item-container:border-sub/40'
                                }`}
                            style={!isActive && indicatorColor ? { backgroundColor: indicatorColor, opacity: 0.8 } : (isActive && indicatorColor ? { backgroundColor: indicatorColor, boxShadow: `0 0 10px ${indicatorColor}` } : undefined)}
                        />
                    </div>
                </button>
            )}

            <button
                onClick={onClick}
                onMouseDown={onMouseDown}
                type="button"
                className={`flex-1 flex items-center gap-3 py-2.5 min-w-0 ${showIndicator ? (icon ? 'pr-2 pl-1' : 'pr-3 pl-1') : (icon ? 'pr-2 pl-3' : 'px-3')}`}
            >
                {showTooltip || (tooltipText && tooltipText !== label) ? (
                    <TooltipProvider delayDuration={400}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span className={`flex-1 text-left truncate font-mono text-[11px] ${isLowercase ? 'lowercase' : ''}`}>{label}</span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-[10px] font-mono">
                                {tooltipText || (typeof label === 'string' ? label : '')}
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                ) : (
                    <span className={`flex-1 text-left truncate font-mono text-[11px] ${isLowercase ? 'lowercase' : ''}`}>{label}</span>
                )}

                {icon && (
                    <div
                        className="w-8 flex items-center justify-center transition-colors shrink-0"
                        onClick={(e) => {
                            if (onIconClick) {
                                e.stopPropagation();
                                onIconClick();
                            }
                        }}
                    >
                        {icon}
                    </div>
                )}

                {showCheck && isActive && (
                    <FontAwesomeIcon icon={faCheck} className="text-main text-[10px] shrink-0" />
                )}
            </button>
        </div>
    );
}

GroupDropdown.Item = Item;
