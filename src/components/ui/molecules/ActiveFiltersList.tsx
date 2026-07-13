import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { resolveEntityColor } from '../../../utils/entityColor';

interface FilterItem {
    id: string;
    label: string;
    icon?: IconDefinition;
    color?: string;
    onRemove: () => void;
}

interface ActiveFiltersListProps {
    label?: string;
    filters: FilterItem[];
    onClearAll?: () => void;
    className?: string;
}

export function ActiveFiltersList({
    label = "Active:",
    filters,
    onClearAll,
    className = ""
}: ActiveFiltersListProps) {
    if (filters.length === 0) return null;

    return (
        <div className={`flex flex-wrap items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300 ${className}`}>
            <span className="text-[10px] text-sub font-mono uppercase tracking-widest opacity-40 ml-1">{label}</span>

            {filters.map(filter => (
                <div
                    key={filter.id}
                    className="flex items-center gap-2 bg-sub-alt px-3 py-1.5 rounded-lg text-text-primary font-mono text-[10px] shadow-sm"
                >
                    {filter.icon && (
                        <FontAwesomeIcon
                            icon={filter.icon}
                            style={{ color: filter.color ? resolveEntityColor(filter.color) : undefined }}
                            className="text-[9px]"
                        />
                    )}
                    <span className="lowercase opacity-90">{filter.label}</span>
                    <button
                        onClick={filter.onRemove}
                        className="ml-1 text-sub hover:text-error transition-colors cursor-pointer flex items-center justify-center w-3 h-3"
                        title={`Remove ${filter.label} filter`}
                    >
                        <FontAwesomeIcon icon={faXmark} className="text-[10px]" />
                    </button>
                </div>
            ))}

            {onClearAll && (
                <button
                    onClick={onClearAll}
                    className="ml-2 text-sub hover:text-text-primary font-mono text-[10px] uppercase tracking-wider transition-colors"
                >
                    Clear All
                </button>
            )}
        </div>
    );
}
