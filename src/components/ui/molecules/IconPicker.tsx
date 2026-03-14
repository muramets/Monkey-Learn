import React, { useState, useMemo, useEffect } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { Input } from './Input';
import {
    ICON_REGISTRY,
    ICON_CATEGORIES,
    getIcon,
    getIconsByCategory,
    searchIcons,
    type IconCategory,
    type IconEntry
} from '../../../config/iconRegistry';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../../components/ui/atoms/Tooltip';

interface IconPickerProps {
    icon: string;
    onChange: (icon: string) => void;
    color?: string;
    align?: 'start' | 'center' | 'end';
    sideOffset?: number;
    className?: string;
    triggerContent?: React.ReactNode;
    width?: string;
    height?: string;
}

export function IconPicker({
    icon,
    onChange,
    color,
    align = 'start',
    sideOffset = 5,
    className = '',
    triggerContent,
    width = 'w-[80px]',
    height = 'h-[42px]'
}: IconPickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState<IconCategory>('common');
    const [showScrollArrow, setShowScrollArrow] = useState(false);

    // Determine which icons to show
    const displayedIcons = useMemo<IconEntry[]>(() => {
        if (searchQuery.trim()) {
            return searchIcons(searchQuery);
        }
        return getIconsByCategory(activeCategory);
    }, [searchQuery, activeCategory]);

    // Use a callback ref to handle the dynamic mounting of the popover content
    const [tabsContainer, setTabsContainer] = useState<HTMLDivElement | null>(null);

    // Check if tabs container is scrollable
    useEffect(() => {
        if (!tabsContainer) return;

        const checkScrollable = () => {
            const isScrollable = tabsContainer.scrollWidth > tabsContainer.clientWidth;
            // Use a small buffer (2px) to handle fractional pixel rendering differences
            const isAtEnd = Math.ceil(tabsContainer.scrollLeft + tabsContainer.clientWidth) >= tabsContainer.scrollWidth - 2;
            setShowScrollArrow(isScrollable && !isAtEnd);
        };

        // Initial check
        checkScrollable();

        // Listen for scroll events
        tabsContainer.addEventListener('scroll', checkScrollable);

        // Observe resize events (handles window resize and initial mounting layout shifts)
        const resizeObserver = new ResizeObserver(checkScrollable);
        resizeObserver.observe(tabsContainer);

        return () => {
            tabsContainer.removeEventListener('scroll', checkScrollable);
            resizeObserver.disconnect();
        };
    }, [tabsContainer, searchQuery, activeCategory]); // Re-run when these change to ensure accuracy

    // Scroll active tab into view
    useEffect(() => {
        if (!tabsContainer || !activeCategory) return;

        const activeTab = tabsContainer.querySelector(`[data-category="${activeCategory}"]`);
        if (activeTab) {
            activeTab.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center'
            });
        }
    }, [tabsContainer, activeCategory]);

    const handleSelect = (iconId: string) => {
        onChange(iconId);
        setIsOpen(false);
        setSearchQuery('');
    };

    const handleNextCategory = () => {
        const currentIndex = ICON_CATEGORIES.findIndex(cat => cat.id === activeCategory);
        if (currentIndex < ICON_CATEGORIES.length - 1) {
            setActiveCategory(ICON_CATEGORIES[currentIndex + 1].id);
        }
    };

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
        if (open) {
            // Auto-select category when opening
            if (!searchQuery) {
                const currentEntry = ICON_REGISTRY.find(e => e.id === icon);
                if (currentEntry) {
                    setActiveCategory(currentEntry.category);
                }
            }
        } else {
            setSearchQuery('');
        }
    };

    // Handle swipe/scroll gestures on category tabs
    const handleTabsWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        // Horizontal scroll from trackpad/magic mouse
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
            // Let the natural scroll happen
            return;
        }

        // Convert vertical scroll to category switching
        if (Math.abs(e.deltaY) > 10) {
            e.preventDefault();
            const currentIndex = ICON_CATEGORIES.findIndex(cat => cat.id === activeCategory);

            if (e.deltaY > 0 && currentIndex < ICON_CATEGORIES.length - 1) {
                // Scroll down -> next category
                setActiveCategory(ICON_CATEGORIES[currentIndex + 1].id);
            } else if (e.deltaY < 0 && currentIndex > 0) {
                // Scroll up -> previous category
                setActiveCategory(ICON_CATEGORIES[currentIndex - 1].id);
            }
        }
    };

    return (
        <Popover.Root open={isOpen} onOpenChange={handleOpenChange} modal={true}>
            <Popover.Trigger asChild>
                <div
                    className={`relative group/icon ${isOpen ? 'bg-sub' : 'bg-sub-alt'} rounded-lg ${height} ${width} transition-colors duration-200 hover:bg-sub focus-within:bg-sub border border-transparent focus-within:border-white/5 cursor-pointer flex items-center justify-center ${className}`}
                    onClick={() => setIsOpen(true)}
                >
                    {triggerContent ? triggerContent : (
                        <div
                            className="absolute inset-0 flex items-center justify-center pointer-events-none transition-colors duration-200"
                            style={{ color: color }}
                        >
                            <FontAwesomeIcon icon={getIcon(icon)} className="text-xl" />
                        </div>
                    )}
                </div>
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Content
                    className="z-[100] p-3 bg-sub-alt border border-white/10 rounded-xl shadow-2xl flex flex-col gap-2 w-[320px] animate-in fade-in zoom-in-95 duration-200"
                    sideOffset={sideOffset}
                    align={align}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-sub uppercase tracking-wider">Select Icon</span>
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="text-sub hover:text-text-primary transition-colors cursor-pointer p-1"
                        >
                            <FontAwesomeIcon icon={faTimes} className="text-xs" />
                        </button>
                    </div>

                    {/* Search */}
                    <Input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search icons..."
                        className="text-sm"
                    />

                    {/* Category Tabs (hidden when searching) */}
                    {!searchQuery.trim() && (
                        <div className="relative">
                            <div
                                ref={setTabsContainer}
                                className="flex gap-1 overflow-x-auto scrollbar-none"
                                onWheel={handleTabsWheel}
                                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                            >
                                {ICON_CATEGORIES.map(cat => (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        data-category={cat.id}
                                        onClick={() => setActiveCategory(cat.id)}
                                        className={`px-2.5 py-1 text-[10px] font-medium rounded-md whitespace-nowrap transition-colors cursor-pointer ${activeCategory === cat.id
                                            ? 'bg-white/10 text-text-primary'
                                            : 'text-sub hover:text-text-primary hover:bg-white/5'
                                            }`}
                                    >
                                        {cat.label}
                                    </button>
                                ))}
                            </div>
                            {/* Scroll Arrow Indicator */}
                            {showScrollArrow && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleNextCategory();
                                    }}
                                    className="absolute right-0 top-0 bottom-0 w-8 flex items-center justify-end group/arrow cursor-pointer bg-gradient-to-l from-sub-alt/95 via-sub-alt/80 to-transparent hover:from-sub-alt border-none outline-none"
                                >
                                    <FontAwesomeIcon
                                        icon={faChevronRight}
                                        className="text-[10px] text-sub group-hover/arrow:text-text-primary group-hover/arrow:translate-x-0.5 transition-[color,transform] animate-pulse mr-1"
                                    />
                                </button>
                            )}
                        </div>
                    )}

                    {/* Icon Grid */}
                    <TooltipProvider delayDuration={500} skipDelayDuration={0}>
                        <div className="grid grid-cols-7 gap-1.5 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                            {displayedIcons.length > 0 ? (
                                displayedIcons.map((entry) => (
                                    <Tooltip key={entry.id}>
                                        <TooltipTrigger asChild>
                                            <button
                                                type="button"
                                                onClick={() => handleSelect(entry.id)}
                                                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-[color,transform,filter] cursor-pointer ${icon === entry.id
                                                    ? 'text-text-primary scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]'
                                                    : 'text-sub hover:text-text-primary'
                                                    }`}
                                                style={{ color: icon === entry.id ? color : undefined }}
                                            >
                                                <FontAwesomeIcon icon={entry.icon} className="text-sm" />
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent className="z-[110]">
                                            <span className="capitalize">{entry.id.replace(/-/g, ' ')}</span>
                                        </TooltipContent>
                                    </Tooltip>
                                ))
                            ) : (
                                <div className="col-span-7 py-4 text-center text-sub text-xs">
                                    No icons found
                                </div>
                            )}
                        </div>
                    </TooltipProvider>

                    <Popover.Arrow className="fill-current text-white/10" />
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
}
