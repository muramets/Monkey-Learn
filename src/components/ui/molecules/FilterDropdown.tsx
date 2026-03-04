import React, { useState, useRef, useEffect } from 'react';
import type { ReactNode } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faChevronRight,
    faChevronLeft,
    faSearch,
    faTrash,
    faCheck
} from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '../atoms/Tooltip';

interface FilterDropdownProps {
    trigger: (isOpen: boolean, hasActiveFilters: boolean) => ReactNode;
    children: ReactNode;
    className?: string;
    width?: string;
    hasActiveFilters?: boolean;
    // Controlled state props
    isOpen?: boolean;
    onOpenChange?: (isOpen: boolean) => void;
    // Styling overrides
    placement?: string; // e.g. "top-full left-0 origin-top-left"
    maxHeight?: string;
}

export function FilterDropdown({
    trigger,
    children,
    className = "",
    width = "w-64",
    hasActiveFilters = false,
    isOpen: controlledIsOpen,
    onOpenChange,
    placement = "top-full right-0 origin-top-right",
    maxHeight = "max-h-[60vh]"
}: FilterDropdownProps) {
    const [internalIsOpen, setInternalIsOpen] = useState(false);
    const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const isControlled = controlledIsOpen !== undefined;
    const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

    useEffect(() => {
        return () => {
            if (closeTimeoutRef.current) {
                clearTimeout(closeTimeoutRef.current);
            }
        };
    }, []);

    const handleMouseEnter = () => {
        if (isControlled) return;
        if (closeTimeoutRef.current) {
            clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = null;
        }
        setInternalIsOpen(true);
        onOpenChange?.(true);
    };

    const handleMouseLeave = () => {
        if (isControlled) return;
        closeTimeoutRef.current = setTimeout(() => {
            setInternalIsOpen(false);
            onOpenChange?.(false);
        }, 300);
    };

    return (
        <div
            className={`relative ${className}`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {trigger(isOpen, hasActiveFilters)}

            <div className={`absolute ${placement} mt-3 ${width} bg-sub-alt rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-300 z-50 px-1 py-1 transform border border-white/5 divide-y divide-white/5 overflow-hidden ${isOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'}`}>
                <div className={`${maxHeight} overflow-y-auto custom-scrollbar`}>
                    {children}
                </div>
            </div>
        </div>
    );
}

// --- Sub-components ---

interface SectionProps {
    title: string;
    icon: IconDefinition;
    children: ReactNode;
}

function Section({ title, icon, children }: SectionProps) {
    return (
        <div className="flex flex-col gap-1 py-2 first:pt-0 last:pb-1">
            <div className="px-3 py-2 flex items-center gap-2 text-[10px] text-main font-mono font-bold uppercase tracking-[0.2em] opacity-90">
                <FontAwesomeIcon icon={icon} className="text-[0.9em]" />
                {title}
            </div>
            <div className="h-px bg-white/10 mb-1 mx-3"></div>
            <div className="flex flex-col gap-0.5">
                {children}
            </div>
        </div>
    );
}

interface ItemProps {
    label: string;
    isActive: boolean;
    onClick: () => void;
    onIndicatorClick?: (e: React.MouseEvent) => void;
    onIconClick?: () => void;
    icon?: ReactNode;
    style?: React.CSSProperties;
    showIndicator?: boolean; // Dot indicator on the left
    showCheck?: boolean;    // Check icon on the right
    className?: string;
    indicatorColor?: string; // Custom color for the dot
}

export function Item({ label, isActive, onClick, onIndicatorClick, onIconClick, icon, style, showIndicator = true, showCheck = false, className = "", indicatorColor, description }: ItemProps & { description?: string }) {
    const textRef = useRef<HTMLSpanElement>(null);
    const [isTruncated, setIsTruncated] = useState(false);

    useEffect(() => {
        const checkTruncation = () => {
            if (textRef.current) {
                setIsTruncated(textRef.current.scrollWidth > textRef.current.clientWidth);
            }
        };

        checkTruncation();
        // Check on hover just in case, or resize? Mostly static here.
        // A simpler way usually suffices for dropdowns.
    }, [label]);


    const showTooltip = isTruncated || !!description;
    const tooltipContent = (
        <div className="flex flex-col gap-1 max-w-[320px] w-fit">
            {isTruncated && (
                <span className="font-bold">{label}</span>
            )}
            {isTruncated && description && (
                <div className="h-px bg-white/10 w-full" />
            )}
            {description && (
                <span className="opacity-80 leading-normal">{description}</span>
            )}
        </div>
    );

    return (
        <div
            className={`flex items-center transition-all group/item-container rounded-lg mx-1 pl-3 ${isActive ? 'bg-sub/30 text-text-primary' : 'text-sub hover:bg-sub/20 hover:text-text-primary'} ${className}`}
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
                    className="w-4 h-6 flex items-center justify-center transition-all shrink-0 group/indicator cursor-default"
                >
                    <div className="w-4 h-4 rounded-full flex items-center justify-center transition-all">
                        <div
                            className={`w-2 h-2 rounded-full transition-all ${isActive
                                ? 'bg-main shadow-[0_0_8px_var(--main-color)] scale-125'
                                : 'bg-sub/20 border border-transparent group-hover/item-container:border-sub/40'
                                }`}
                            style={!isActive && indicatorColor ? { backgroundColor: indicatorColor, opacity: 0.8 } : (isActive && indicatorColor ? { backgroundColor: indicatorColor, boxShadow: `0 0 10px ${indicatorColor}` } : undefined)}
                        />
                    </div>
                </button>
            )}

            <button
                onClick={onClick}
                type="button"
                className={`flex-1 flex items-center gap-3 py-3 min-w-0 ${showIndicator ? 'pr-2 pl-3' : 'px-2'}`}
            >
                <TooltipProvider delayDuration={500}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span ref={textRef} className="flex-1 text-left truncate font-mono text-[11px]">{label}</span>
                        </TooltipTrigger>
                        {showTooltip && (
                            <TooltipContent side="top" className="text-[10px] font-mono p-2">
                                {tooltipContent}
                            </TooltipContent>
                        )}
                    </Tooltip>
                </TooltipProvider>

                {icon && (
                    <div
                        className="min-w-[40px] flex items-center justify-center transition-colors shrink-0"
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

interface NavButtonProps {
    title: string;
    icon: IconDefinition | ReactNode;
    value: string;
    onClick: () => void;
    active: boolean;
    style?: React.CSSProperties;
}

export function NavButton({ title, icon, value, onClick, active, style }: NavButtonProps) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center justify-between px-3 py-3 rounded-lg text-[11px] font-mono transition-all group/nav ${active ? 'bg-sub/30 text-text-primary' : 'text-sub hover:bg-sub/20 hover:text-text-primary'}`}
            style={style}
        >
            <div className="flex items-center gap-3">
                <div className={`w-4 flex justify-center items-center transition-colors ${active ? 'text-main' : 'opacity-70 group-hover/nav:text-[var(--hover-color)]'}`}>
                    {typeof icon === 'object' && icon !== null && 'icon' in icon ? (
                        <FontAwesomeIcon icon={icon as IconDefinition} />
                    ) : (
                        icon as ReactNode
                    )}
                </div>
                <div className="flex flex-col items-start gap-0.5">
                    <span className="tracking-wider font-bold opacity-90">{title}</span>
                    <span className="text-[10px] opacity-60 lowercase">{value}</span>
                </div>
            </div>
            <FontAwesomeIcon icon={faChevronRight} className="text-[9px] opacity-50 group-hover/nav:translate-x-0.5 transition-transform" />
        </button>
    );
}

interface SearchHeaderProps {
    title: string;
    showSearch: boolean;
    searchQuery: string;
    onSearchChange: (val: string) => void;
    onBack: () => void;
    placeholder?: string;
}

function SearchHeader({ title, showSearch, searchQuery, onSearchChange, onBack, placeholder = "Filter list..." }: SearchHeaderProps) {
    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (showSearch && searchInputRef.current) {
            setTimeout(() => searchInputRef.current?.focus(), 50);
        }
    }, [showSearch]);

    return (
        <div className="pb-1 border-b border-white/5 mb-1 sticky top-0 bg-sub-alt z-10">
            <div className="flex items-center gap-2 px-1 py-1">
                <button
                    onClick={onBack}
                    className="w-6 h-6 flex items-center justify-center rounded hover:bg-sub/20 text-sub hover:text-text-primary transition-colors"
                >
                    <FontAwesomeIcon icon={faChevronLeft} className="text-xs" />
                </button>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-text-primary translate-y-[1px]">{title}</span>
            </div>
            {showSearch && (
                <div className="px-1">
                    <div className="relative group/search">
                        <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-sub/50 text-[10px]" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder={placeholder}
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className="w-full bg-sub/10 rounded-lg pl-8 pr-3 py-1.5 text-[11px] font-mono text-text-primary placeholder:text-sub/40 outline-none focus:bg-sub/20 transition-colors"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

interface FooterProps {
    label: string;
    onClick: () => void;
    icon?: IconDefinition;
    variant?: 'danger' | 'default';
}

function Footer({ label, onClick, icon = faTrash, variant = 'danger' }: FooterProps) {
    return (
        <button
            onClick={onClick}
            className={`w-full py-3 text-[10px] font-mono font-bold uppercase tracking-[0.2em] transition-colors flex items-center justify-center gap-2 ${variant === 'danger' ? 'text-error hover:bg-error/10' : 'text-sub hover:bg-sub/10'
                }`}
        >
            <FontAwesomeIcon icon={icon} className="text-[9px]" />
            {label}
        </button>
    );
}

FilterDropdown.Section = Section;
FilterDropdown.Item = Item;
FilterDropdown.NavButton = NavButton;
FilterDropdown.SearchHeader = SearchHeader;
FilterDropdown.Footer = Footer;
