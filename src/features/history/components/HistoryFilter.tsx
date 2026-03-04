import { useState, useMemo } from 'react';
import { getGroupConfig } from '../../../constants/common';
import { getIcon } from '../../../config/iconRegistry';
import { AppIcon } from '../../../components/ui/atoms/AppIcon';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faFilter,
    faCalendarAlt,
    faHistory,
    faBolt,
    faLayerGroup,
    faList,
    faChartBar,
} from '@fortawesome/free-solid-svg-icons';
import type { Protocol } from '../../protocols/types';
import type { Innerface } from '../../innerfaces/types';
import type { StateData } from '../../dashboard/types';
import { FilterDropdown } from '../../../components/ui/molecules/FilterDropdown';
import { faMap } from '@fortawesome/free-solid-svg-icons';

export type TimeFilter = 'All time' | 'Today' | 'This week' | 'This month';
export type TypeFilter = 'All types' | 'Actions' | 'Manual' | 'System' | 'Decay';
export type EffectFilter = 'All effects' | 'Positive' | 'Negative';

type FilterView = 'root' | 'protocol_groups' | 'protocols_list' | 'innerface_groups' | 'innerfaces' | 'states';

interface HistoryFilterProps {
    timeFilter: TimeFilter;
    setTimeFilter: (val: TimeFilter) => void;
    typeFilter: TypeFilter;
    setTypeFilter: (val: TypeFilter) => void;
    effectFilter: EffectFilter;
    setEffectFilter: (val: EffectFilter) => void;
    selectedProtocolIds: string[];
    setSelectedProtocolIds: (val: string[]) => void;
    selectedInnerfaceIds: string[];
    setSelectedInnerfaceIds: (val: string[]) => void;
    protocols: Protocol[];
    innerfaces: Innerface[];
    states: StateData[];
    hasActiveFilters: boolean;
    clearFilters: () => void;
}

export function HistoryFilter({
    timeFilter,
    setTimeFilter,
    typeFilter,
    setTypeFilter,
    effectFilter,
    setEffectFilter,
    selectedProtocolIds,
    setSelectedProtocolIds,
    selectedInnerfaceIds,
    setSelectedInnerfaceIds,
    selectedStateIds,
    setSelectedStateIds,
    protocols,
    innerfaces,
    states,
    hasActiveFilters,
    clearFilters,
    groupsMetadata
}: HistoryFilterProps & {
    selectedStateIds: string[];
    setSelectedStateIds: (val: string[]) => void;
    groupsMetadata: Record<string, { icon: string; color?: string }>;
}) {
    const [view, setView] = useState<FilterView>('root');
    const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Helper to switch view and reset search
    const changeView = (newView: FilterView) => {
        setView(newView);
        setSearchQuery('');
    };

    // Group protocols
    const protocolGroups = useMemo(() => {
        const groups = new Set<string>();
        // Only add groups that have protocols
        protocols.forEach(p => {
            if (p.group) groups.add(p.group);
            else groups.add('ungrouped');
        });
        return Array.from(groups).sort();
    }, [protocols]);

    // Group innerfaces
    const innerfaceGroups = useMemo(() => {
        const groups = new Set<string>();
        innerfaces.forEach(i => {
            if (i.group) groups.add(i.group);
            else groups.add('ungrouped');
        });
        return Array.from(groups).sort();
    }, [innerfaces]);

    const filteredProtocols = useMemo(() => {
        if (!selectedGroup) return [];
        return protocols.filter(p =>
            (p.group || 'ungrouped') === selectedGroup &&
            p.title.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [protocols, selectedGroup, searchQuery]);

    const filteredInnerfaces = useMemo(() => {
        if (!selectedGroup) return [];
        return innerfaces.filter(i =>
            (i.group || 'ungrouped') === selectedGroup &&
            i.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [innerfaces, selectedGroup, searchQuery]);

    const getProtocolLabel = (ids: string[]) => {
        if (ids.length === 0) return 'All actions Check-ins';
        if (ids.length === 1) return protocols.find(p => p.id.toString() === ids[0])?.title || ids[0];
        return `${ids.length} selected`;
    };

    const getInnerfaceLabel = (ids: string[]) => {
        if (ids.length === 0) return 'All powers';
        if (ids.length === 1) return innerfaces.find(i => i.id.toString() === ids[0])?.name || ids[0];
        return `${ids.length} selected`;
    };

    const getStateLabel = (ids: string[]) => {
        if (ids.length === 0) return 'All dimensions';
        if (ids.length === 1) return states.find(s => s.id === ids[0])?.name || ids[0];
        return `${ids.length} selected`;
    };

    const toggleProtocol = (id: string) => {
        if (selectedProtocolIds.includes(id)) {
            setSelectedProtocolIds(selectedProtocolIds.filter(pid => pid !== id));
        } else {
            setSelectedProtocolIds([...selectedProtocolIds, id]);
        }
    };

    const toggleInnerface = (id: string) => {
        if (selectedInnerfaceIds.includes(id)) {
            setSelectedInnerfaceIds(selectedInnerfaceIds.filter(iid => iid !== id));
        } else {
            setSelectedInnerfaceIds([...selectedInnerfaceIds, id]);
        }
    };

    const toggleState = (id: string) => {
        if (selectedStateIds.includes(id)) {
            setSelectedStateIds(selectedStateIds.filter(sid => sid !== id));
        } else {
            setSelectedStateIds([...selectedStateIds, id]);
        }
    };

    return (
        <FilterDropdown
            hasActiveFilters={hasActiveFilters}
            trigger={(isOpen, active) => (
                <button className={`h-[46px] w-[36px] flex items-center justify-center rounded-lg transition-all cursor-pointer ${active ? 'text-main' : isOpen ? 'text-text-primary' : 'text-sub hover:text-text-primary'}`}>
                    <div className="relative">
                        <FontAwesomeIcon icon={faFilter} className="text-xl" />
                        {active && (
                            <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-main rounded-full flex items-center justify-center text-[9px] text-bg-primary font-bold border border-bg-primary">
                                !
                            </div>
                        )}
                    </div>
                </button>
            )}
        >
            {view === 'root' && (
                <div className="animate-in slide-in-from-left-4 duration-200">
                    <FilterDropdown.Section title="Specifics" icon={faLayerGroup}>
                        <div className="flex flex-col gap-1 px-1">
                            <FilterDropdown.NavButton
                                title="Dimension"
                                icon={faMap} // Using faMap for State/Territory metaphor
                                value={getStateLabel(selectedStateIds)}
                                onClick={() => changeView('states')}
                                active={selectedStateIds.length > 0}
                            />
                            <FilterDropdown.NavButton
                                title="Action"
                                icon={faList}
                                value={getProtocolLabel(selectedProtocolIds)}
                                onClick={() => changeView('protocol_groups')}
                                active={selectedProtocolIds.length > 0}
                            />
                            <FilterDropdown.NavButton
                                title="Power"
                                icon={faChartBar}
                                value={getInnerfaceLabel(selectedInnerfaceIds)}
                                onClick={() => { setSelectedGroup(null); changeView('innerface_groups'); }}
                                active={selectedInnerfaceIds.length > 0}
                            />
                        </div>
                    </FilterDropdown.Section>

                    <FilterDropdown.Section title="Time Period" icon={faCalendarAlt}>
                        {['All time', 'Today', 'This week', 'This month'].map(opt => (
                            <FilterDropdown.Item
                                key={opt}
                                label={opt}
                                isActive={timeFilter === opt}
                                onClick={() => setTimeFilter(opt as TimeFilter)}
                            />
                        ))}
                    </FilterDropdown.Section>

                    <FilterDropdown.Section title="Type" icon={faHistory}>
                        {[
                            { id: 'All types', label: 'All types' },
                            { id: 'Actions', label: 'Check-ins' },
                            { id: 'Manual', label: 'Manual Score Adjustments' },
                            { id: 'System', label: 'System Events' },
                            { id: 'Decay', label: 'Inactivity Decay' }
                        ].map(opt => (
                            <FilterDropdown.Item
                                key={opt.id}
                                label={opt.label}
                                isActive={typeFilter === opt.id}
                                onClick={() => setTypeFilter(opt.id as TypeFilter)}
                            />
                        ))}
                    </FilterDropdown.Section>

                    <FilterDropdown.Section title="Effect" icon={faBolt}>
                        {['All effects', 'Positive', 'Negative'].map(opt => (
                            <FilterDropdown.Item
                                key={opt}
                                label={opt}
                                isActive={effectFilter === opt}
                                onClick={() => setEffectFilter(opt as EffectFilter)}
                            />
                        ))}
                    </FilterDropdown.Section>

                    {hasActiveFilters && (
                        <FilterDropdown.Footer
                            label="Clear All Filters"
                            onClick={clearFilters}
                        />
                    )}
                </div>
            )}

            {view === 'protocol_groups' && (
                <div className="animate-in slide-in-from-right-4 duration-200 h-full flex flex-col">
                    <FilterDropdown.SearchHeader
                        title="Select Group"
                        showSearch={false}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        onBack={() => changeView('root')}
                    />

                    <FilterDropdown.Item
                        label="ALL ACTIONS"
                        isActive={selectedProtocolIds.length === 0}
                        onClick={() => { setSelectedProtocolIds([]); changeView('root'); }}
                        className="mx-1 mt-1 font-bold tracking-wider"
                    />

                    <div className="flex flex-col gap-0.5 mt-2 px-1">
                        {protocolGroups.map(group => {
                            const config = getGroupConfig(group);
                            const meta = groupsMetadata[group];

                            // Resolve color: Metadata > Config > Default
                            const color = meta?.color || config?.color;

                            return (
                                <FilterDropdown.NavButton
                                    key={group}
                                    title={group.toLowerCase()}
                                    icon={
                                        meta?.icon ? (
                                            <div style={{ color: color }}><AppIcon id={meta.icon} /></div>
                                        ) : (
                                            config ? <FontAwesomeIcon icon={getIcon(config.icon)} /> : <div className="w-1.5 h-1.5 rounded-full bg-sub/50" />
                                        )
                                    }
                                    value={""}
                                    onClick={() => { setSelectedGroup(group); changeView('protocols_list'); }}
                                    active={false}
                                    style={color ? { '--hover-color': color } as React.CSSProperties : undefined}
                                />
                            );
                        })}
                    </div>
                </div>
            )}

            {view === 'protocols_list' && (
                <div className="animate-in slide-in-from-right-4 duration-200 h-full flex flex-col">
                    <FilterDropdown.SearchHeader
                        title={selectedGroup || 'Actions'}
                        showSearch={filteredProtocols.length > 5}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        onBack={() => changeView('protocol_groups')}
                    />

                    <div className="flex flex-col gap-0.5 mt-1 px-1">
                        {filteredProtocols.map(p => {
                            const isSelected = selectedProtocolIds.includes(p.id.toString());
                            return (
                                <FilterDropdown.Item
                                    key={p.id}
                                    label={p.title}
                                    isActive={isSelected}
                                    onClick={() => toggleProtocol(p.id.toString())}
                                    icon={<div style={{ color: p.color }}><AppIcon id={p.icon} /></div>}
                                    showIndicator={true}
                                    showCheck={false}
                                    style={p.color ? { '--hover-color': p.color } as React.CSSProperties : undefined}
                                    description={p.hover || p.description}
                                />
                            );
                        })}
                        {filteredProtocols.length === 0 && (
                            <div className="p-4 text-center text-sub/50 text-xs font-mono">No actions found</div>
                        )}
                    </div>
                </div>
            )}

            {view === 'innerface_groups' && (
                <div className="animate-in slide-in-from-right-4 duration-200 h-full flex flex-col">
                    <FilterDropdown.SearchHeader
                        title="Select Group"
                        showSearch={false}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        onBack={() => changeView('root')}
                    />

                    <FilterDropdown.Item
                        label="ALL POWERS"
                        isActive={selectedInnerfaceIds.length === 0}
                        onClick={() => { setSelectedInnerfaceIds([]); changeView('root'); }}
                        className="mx-1 mt-1 font-bold tracking-wider"
                    />

                    <div className="flex flex-col gap-0.5 mt-2 px-1">
                        {innerfaceGroups.map(group => {
                            const config = getGroupConfig(group);
                            const meta = groupsMetadata[group];
                            const color = meta?.color || config?.color;

                            return (
                                <FilterDropdown.NavButton
                                    key={group}
                                    title={group.toLowerCase()}
                                    icon={
                                        meta?.icon ? (
                                            <div style={{ color: color }}><AppIcon id={meta.icon} /></div>
                                        ) : (
                                            config ? <FontAwesomeIcon icon={getIcon(config.icon)} /> : <div className="w-1.5 h-1.5 rounded-full bg-sub/50" />
                                        )
                                    }
                                    value={""}
                                    onClick={() => { setSelectedGroup(group); changeView('innerfaces'); }}
                                    active={false}
                                    style={color ? { '--hover-color': color } as React.CSSProperties : undefined}
                                />
                            );
                        })}
                    </div>
                </div>
            )}

            {view === 'innerfaces' && (
                <div className="animate-in slide-in-from-right-4 duration-200 h-full flex flex-col">
                    <FilterDropdown.SearchHeader
                        title={selectedGroup || 'Powers'}
                        showSearch={filteredInnerfaces.length > 10}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        onBack={() => changeView('innerface_groups')}
                    />

                    <div className="flex flex-col gap-0.5 mt-1 px-1">
                        {filteredInnerfaces.map(i => {
                            const isSelected = selectedInnerfaceIds.includes(i.id.toString());
                            return (
                                <FilterDropdown.Item
                                    key={i.id}
                                    label={i.name}
                                    isActive={isSelected}
                                    onClick={() => toggleInnerface(i.id.toString())}
                                    icon={<div style={{ color: i.color }}><AppIcon id={i.icon} /></div>}
                                    showIndicator={true}
                                    showCheck={false}
                                    style={i.color ? { '--hover-color': i.color } as React.CSSProperties : undefined}
                                    description={i.hover || i.description}
                                />
                            );
                        })}
                        {filteredInnerfaces.length === 0 && (
                            <div className="p-4 text-center text-sub/50 text-xs font-mono">No powers found</div>
                        )}
                    </div>
                </div>
            )}

            {view === 'states' && (
                <div className="animate-in slide-in-from-right-4 duration-200">
                    <FilterDropdown.SearchHeader
                        title="Select Dimension"
                        showSearch={states.length > 10}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        onBack={() => changeView('root')}
                    />

                    <FilterDropdown.Item
                        label="ALL DIMENSIONS"
                        isActive={selectedStateIds.length === 0}
                        onClick={() => { setSelectedStateIds([]); changeView('root'); }}
                        className="mx-1 mt-1 font-bold tracking-wider"
                    />

                    <div className="flex flex-col gap-0.5 mt-2 px-1">
                        {states
                            .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
                            .map(s => {
                                const isSelected = selectedStateIds.includes(s.id);
                                return (
                                    <FilterDropdown.Item
                                        key={s.id}
                                        label={s.name}
                                        isActive={isSelected}
                                        onClick={() => toggleState(s.id)}
                                        icon={<div style={{ color: s.color }}><AppIcon id={s.icon || 'question'} /></div>}
                                        showIndicator={false}
                                        showCheck={true}
                                        style={s.color ? { '--hover-color': s.color } as React.CSSProperties : undefined}
                                        description={s.description || s.subtext}
                                    />
                                );
                            })}
                        {states.length === 0 && (
                            <div className="p-4 text-center text-sub/50 text-xs font-mono">No dimensions found</div>
                        )}
                    </div>
                </div>
            )}
        </FilterDropdown>
    );
}
