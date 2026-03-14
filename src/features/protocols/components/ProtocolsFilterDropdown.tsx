import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faFilter,
} from '@fortawesome/free-solid-svg-icons';
import { getGroupConfig } from '../../../constants/common';
import { getIcon } from '../../../config/iconRegistry';

interface ProtocolsFilterDropdownProps {
    activeFilters: string[];
    protocolGroups: string[];
    groupsMetadata: Record<string, { icon: string; color?: string }>;
    hasUngrouped: boolean;
    onToggleFilter: (filter: string) => void;
}

/**
 * Компонент dropdown меню для фильтрации протоколов по группам
 */
export function ProtocolsFilterDropdown({
    activeFilters,
    protocolGroups,
    groupsMetadata,
    hasUngrouped,
    onToggleFilter,
}: ProtocolsFilterDropdownProps) {
    const getGroupVisuals = (groupName: string) => {
        const staticConfig = getGroupConfig(groupName);
        const storeMeta = groupsMetadata[groupName];

        let icon = staticConfig ? getIcon(staticConfig.icon) : getIcon('circle');
        let color = staticConfig?.color || '#d1d0c5';

        if (storeMeta) {
            if (storeMeta.icon) {
                const mapped = getIcon(storeMeta.icon);
                if (mapped) icon = mapped;
            }
            if (storeMeta.color) color = storeMeta.color;
        }

        return { icon, color };
    };

    return (
        <div className="relative group">
            {/* Кнопка фильтра с badge количества */}
            <button
                className={`h-[46px] w-[36px] flex items-center justify-center rounded-lg transition-colors cursor-pointer ${activeFilters.length > 0 ? 'text-text-primary' : 'text-sub hover:text-text-primary'
                    }`}
            >
                <div className="relative">
                    <FontAwesomeIcon icon={faFilter} className="text-xl" />
                    {/* Badge с количеством активных фильтров */}
                    {activeFilters.length > 0 && (
                        <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-main rounded-full flex items-center justify-center text-[9px] text-bg-primary font-bold border border-bg-primary">
                            {activeFilters.length}
                        </div>
                    )}
                </div>
            </button>

            {/* Dropdown меню (показывается при hover) */}
            <div className="absolute top-full right-0 mt-2 w-48 bg-sub-alt rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-[opacity,visibility] duration-200 z-50 p-2 transform origin-top-right border border-white/5">
                <div className="flex flex-col">
                    {/* Опция "All actions" - сбрасывает все фильтры */}
                    <button
                        onClick={() => onToggleFilter('all')}
                        className={`flex items-center gap-2 w-full text-left px-3 py-2.5 rounded-md transition-colors group/item ${activeFilters.length === 0 ? 'bg-sub/30' : 'hover:bg-sub/20'
                            }`}
                    >
                        <div className="w-4 flex items-center justify-center opacity-70">
                            <FontAwesomeIcon icon={faFilter} className="text-[10px]" />
                        </div>
                        <span className="text-xs font-mono lowercase text-text-primary">all actions</span>
                        {/* Индикатор активности */}
                        {activeFilters.length === 0 && (
                            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-main shadow-[0_0_8px_rgba(226,183,20,0.5)]"></div>
                        )}
                    </button>

                    {/* Разделитель - показываем только если есть другие пункты */}
                    {(protocolGroups.length > 0 || hasUngrouped) && (
                        <div className="h-px bg-white/5 my-1 mx-2"></div>
                    )}

                    {protocolGroups.map(group => {
                        const { icon, color } = getGroupVisuals(group);
                        const isActive = activeFilters.includes(group);
                        return (
                            <button
                                key={group}
                                onClick={() => onToggleFilter(group)}
                                className={`flex items-center gap-2 w-full text-left px-3 py-2.5 rounded-md transition-colors group/item ${isActive ? 'bg-sub/30' : 'hover:bg-sub/20'
                                    }`}
                            >
                                {/* Иконка группы */}
                                <div className="w-4 flex items-center justify-center">
                                    <FontAwesomeIcon
                                        icon={icon}
                                        style={{ color }}
                                        className="text-[10px]"
                                    />
                                </div>
                                <span
                                    className={`text-xs font-mono lowercase ${isActive ? 'text-text-primary' : 'text-sub'
                                        }`}
                                >
                                    {group}
                                </span>
                                {/* Индикатор активности */}
                                {isActive && (
                                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-main shadow-[0_0_8px_rgba(226,183,20,0.5)]"></div>
                                )}
                            </button>
                        );
                    })}

                    {/* Опция "Ungrouped" - протоколы без группы */}
                    {hasUngrouped && (
                        <button
                            onClick={() => onToggleFilter('ungrouped')}
                            className={`flex items-center gap-2 w-full text-left px-3 py-2.5 rounded-md transition-colors group/item ${activeFilters.includes('ungrouped') ? 'bg-sub/30' : 'hover:bg-sub/20'
                                }`}
                        >
                            <div className="w-4 flex items-center justify-center">
                                {(() => {
                                    const { icon, color } = getGroupVisuals('ungrouped');
                                    return <FontAwesomeIcon icon={icon} style={{ color }} className="text-[10px]" />;
                                })()}
                            </div>
                            <span
                                className={`text-xs font-mono lowercase ${activeFilters.includes('ungrouped') ? 'text-text-primary' : 'text-sub'
                                    }`}
                            >
                                ungrouped
                            </span>
                            {/* Индикатор активности */}
                            {activeFilters.includes('ungrouped') && (
                                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-main shadow-[0_0_8px_rgba(226,183,20,0.5)]"></div>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
