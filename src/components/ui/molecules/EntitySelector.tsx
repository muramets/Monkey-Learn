import React, { useState, useMemo } from 'react';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
import { CollapsibleSection } from '../molecules/CollapsibleSection';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '../atoms/Tooltip';
import { Input } from '../molecules/Input';
import { RichTextViewer } from '../RichTextEditor/RichTextViewer';

export interface EntityItem {
    id: string | number;
    title: string;
    description?: string;
    quickNote?: string;
    group?: string;
    icon?: React.ReactNode;
    color?: string;
    isDeleted?: boolean;
}

interface EntitySelectorProps {
    items: EntityItem[];
    selectedIds: Set<string>;
    onToggle: (id: string) => void;
    searchPlaceholder?: string;
    emptyMessage?: string;
    className?: string;
    height?: string;
}

export function EntitySelector({
    items,
    selectedIds,
    onToggle,
    searchPlaceholder = "Search...",
    emptyMessage = "No items found",
    className = "",
    height = "h-[300px]"
}: EntitySelectorProps) {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredAndGroupedItems = useMemo(() => {
        // Strict filtering: Only active items
        const filtered = items
            .filter(i => !i.isDeleted)
            .filter(i => i.title.toLowerCase().includes(searchQuery.toLowerCase()));

        if (filtered.length === 0) return null;

        const grouped: Record<string, EntityItem[]> = {};
        filtered.forEach(i => {
            const g = i.group || 'ungrouped';
            if (!grouped[g]) grouped[g] = [];
            grouped[g].push(i);
        });

        const sortedGroups = Object.keys(grouped).sort((a, b) => {
            if (a === 'ungrouped') return 1;
            if (b === 'ungrouped') return -1;
            return a.localeCompare(b);
        });

        return { groups: sortedGroups, data: grouped };
    }, [items, searchQuery]);

    const showSearch = items.some(i => !i.isDeleted);



    return (
        <div className={`bg-sub-alt/30 rounded-xl p-3 border border-white/5 flex flex-col gap-3 ${height} ${className}`}>
            {/* View Mode Switcher - Only if there are deleted items */}
            {/* Removed View Mode Switcher */}

            {/* Search Input */}
            {showSearch && (
                <Input
                    type="text"
                    placeholder={searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    icon={faSearch}
                    className="!bg-sub-alt/50"
                />
            )}

            {/* Scrollable List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="flex flex-col gap-1 h-full">
                    {!filteredAndGroupedItems ? (
                        <div className="w-full h-full flex items-center justify-center text-sub text-sm font-mono">
                            {emptyMessage}
                        </div>
                    ) : (
                        filteredAndGroupedItems.groups.map(groupName => (
                            <CollapsibleSection
                                key={groupName}
                                title={groupName}
                                variant="mini"
                                defaultOpen={true}
                                className="mb-2"
                            >
                                <div className="flex flex-wrap gap-2 pt-1">
                                    {filteredAndGroupedItems.data[groupName].map(item => {
                                        const isActive = selectedIds.has(item.id.toString());
                                        const itemColor = item.color || 'var(--text-primary)';

                                        return (
                                            <div key={item.id} className="relative group/item">
                                                <TooltipProvider delayDuration={500}>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <div className="relative">
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        if (item.isDeleted) {
                                                                            e.stopPropagation();
                                                                        } else {
                                                                            onToggle(item.id.toString());
                                                                        }
                                                                    }}
                                                                    className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 transition-[color,background-color,border-color,box-shadow] font-mono text-[10px] uppercase font-bold tracking-wider relative ${isActive
                                                                        ? ''
                                                                        : 'bg-sub-alt border-transparent text-sub hover:text-text-primary hover:bg-sub'
                                                                        } ${item.isDeleted ? '' : ''}`}
                                                                    style={isActive ? {
                                                                        backgroundColor: `color-mix(in srgb, ${itemColor} 20%, transparent)`,
                                                                        color: itemColor,
                                                                        boxShadow: `0 4px 8px rgba(0,0,0,0.2)`,
                                                                        borderColor: 'transparent'
                                                                    } : undefined}
                                                                >
                                                                    <span style={{ color: isActive ? 'currentColor' : itemColor }}>
                                                                        {item.icon}
                                                                    </span>
                                                                    <span className={`truncate max-w-[120px]`}>
                                                                        {item.title.split('.')[0]}
                                                                    </span>
                                                                    {item.isDeleted && (
                                                                        <span className="absolute -top-1 -right-1 flex h-2 w-2">
                                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75"></span>
                                                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-error"></span>
                                                                        </span>
                                                                    )}
                                                                </button>
                                                            </div>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top">
                                                            <div className="flex flex-col gap-1.5 text-left p-1">
                                                                <span className="font-bold text-[10px] uppercase tracking-wider text-main">{item.title}</span>

                                                                {item.description && (
                                                                    <span className="text-[10px] opacity-80 font-mono leading-tight text-text-secondary">
                                                                        {item.description}
                                                                    </span>
                                                                )}

                                                                {item.description && item.quickNote && (
                                                                    <div className="h-px w-full bg-white/10 my-0.5" />
                                                                )}

                                                                {item.quickNote && (
                                                                    <div className="text-[10px] text-text-primary italic">
                                                                        <RichTextViewer content={item.quickNote} className="!text-[10px] [&_p]:!mb-0 [&_p]:inline" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>

                                            </div>
                                        );
                                    })}
                                </div>
                            </CollapsibleSection>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
