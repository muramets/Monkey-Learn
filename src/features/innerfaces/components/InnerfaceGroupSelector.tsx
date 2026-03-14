import { useState, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faTimes, faPlus } from '@fortawesome/free-solid-svg-icons';
import * as Popover from '@radix-ui/react-popover';
import { GroupDropdown } from '../../groups/components/GroupDropdown';
import { Input } from '../../../components/ui/molecules/Input';
import { getIcon } from '../../../config/iconRegistry';
import { DEFAULT_GROUPS_ORDER, PRESET_COLORS, getGroupConfig } from '../../../constants/common';
import { IconPicker } from '../../../components/ui/molecules/IconPicker';

interface InnerfaceGroupSelectorProps {
    group: string;
    setGroup: (group: string) => void;
    availableGroups: string[];
    groupsMetadata: Record<string, { icon?: string; color?: string }>;
    onUpdateMetadata: (groupName: string, data: { icon?: string; color?: string }) => Promise<void>;
}

const InputLabel = ({ label }: { label: string }) => (
    <label className="text-[10px] text-main font-mono font-bold uppercase tracking-[0.2em] opacity-90 px-1">
        {label}
    </label>
);

export function InnerfaceGroupSelector({
    group,
    setGroup,
    availableGroups,
    groupsMetadata,
    onUpdateMetadata
}: InnerfaceGroupSelectorProps) {

    // Local UI State
    const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false);
    const [editingGroupColor, setEditingGroupColor] = useState<string | null>(null);
    const [tempGroupIcon, setTempGroupIcon] = useState('');
    const [tempGroupColor, setTempGroupColor] = useState('');
    const [isGroupColorPickerOpen, setIsGroupColorPickerOpen] = useState(false);
    const [popupAnchor, setPopupAnchor] = useState<HTMLElement | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleUpdateGroupIcon = async (groupName: string, icon: string) => {
        await onUpdateMetadata(groupName, { icon });
    };

    const handleUpdateGroupColor = async (groupName: string, color: string) => {
        await onUpdateMetadata(groupName, { color });
        setEditingGroupColor(null);
        setIsGroupColorPickerOpen(false);
    };

    const getGroupIconStr = (g: string) => {
        return groupsMetadata[g]?.icon || getGroupConfig(g)?.icon || 'brain';
    };

    const renderGroupIconContent = (g: string) => {
        const iconStr = groupsMetadata[g]?.icon || getGroupConfig(g)?.icon || 'brain';
        const colorStr = groupsMetadata[g]?.color || getGroupConfig(g)?.color || 'var(--main-color)';

        return <FontAwesomeIcon icon={getIcon(iconStr)} className="text-sm" style={{ color: colorStr }} />;
    };

    return (
        <div className="flex flex-col gap-1.5 relative">
            <InputLabel label="Group" />
            <GroupDropdown
                isOpen={isGroupDropdownOpen}
                onOpenChange={setIsGroupDropdownOpen}
                width="w-full"
                maxHeight="max-h-80"
                trigger={(isOpen) => (
                    <div className="relative w-full" onClick={(e) => {
                        e.stopPropagation();
                        setIsGroupDropdownOpen(true);
                        inputRef.current?.focus();
                    }}>
                        <Input
                            ref={inputRef}
                            type="text"
                            value={group}
                            onChange={e => {
                                setGroup(e.target.value);
                                setIsGroupDropdownOpen(true);
                            }}
                            onFocus={(e) => {
                                setIsGroupDropdownOpen(true);
                                // Move cursor to end
                                const val = e.target.value;
                                e.target.setSelectionRange(val.length, val.length);
                            }}
                            placeholder="no group"
                            className="pr-8"
                            leftIcon={
                                group && availableGroups.some(g => g.toLowerCase() === group.toLowerCase()) ? (
                                    <div
                                        className="w-2 h-2 rounded-full"
                                        style={{
                                            backgroundColor: groupsMetadata[group]?.color || getGroupConfig(group)?.color || 'var(--main-color)',
                                            boxShadow: `0 0 8px ${groupsMetadata[group]?.color || getGroupConfig(group)?.color || 'var(--main-color)'}`
                                        }}
                                    />
                                ) : undefined
                            }
                        />
                        <div className={`absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-4 h-4 transition-transform duration-200 text-sub/50 pointer-events-none ${isOpen ? 'rotate-180' : ''}`}>
                            <FontAwesomeIcon icon={faChevronDown} className="text-[10px]" />
                        </div>
                    </div>
                )}
            >
                <div className="p-1">
                    {(() => {
                        const defaultGroups = DEFAULT_GROUPS_ORDER.filter(g => availableGroups.includes(g));
                        const otherGroups = availableGroups.filter(g => !DEFAULT_GROUPS_ORDER.includes(g)).sort();

                        // Filter by search query
                        const filterFn = (g: string) => g.toLowerCase().includes(group.toLowerCase());
                        const filteredDefault = defaultGroups.filter(filterFn);
                        const filteredOther = otherGroups.filter(filterFn);

                        const renderGroupItem = (g: string) => {
                            const metadata = groupsMetadata[g];
                            const config = getGroupConfig(g);
                            const gColor = metadata?.color || config?.color || 'var(--main-color)';
                            const isActiveGroup = group === g;
                            const isColorPickerOpen = isGroupColorPickerOpen && editingGroupColor === g;

                            return (
                                <div key={g} className="relative">
                                    <GroupDropdown.Item
                                        label={g}
                                        isActive={isActiveGroup}
                                        showTooltip={false}
                                        isLowercase={false}
                                        onMouseDown={(e) => {
                                            if (!editingGroupColor) e.preventDefault();
                                        }}
                                        onClick={() => {
                                            if (!editingGroupColor) {
                                                setGroup(g);
                                                setIsGroupDropdownOpen(false);
                                            }
                                        }}
                                        onIndicatorClick={(e) => {
                                            if (isGroupColorPickerOpen && editingGroupColor === g) {
                                                setIsGroupColorPickerOpen(false);
                                                setEditingGroupColor(null);
                                            } else {
                                                setEditingGroupColor(g);
                                                setPopupAnchor(e.currentTarget as HTMLElement);
                                                setIsGroupColorPickerOpen(true);
                                            }
                                        }}
                                        indicatorColor={gColor}
                                        isIndicatorActive={isColorPickerOpen}
                                        icon={
                                            <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                                                <IconPicker
                                                    icon={getGroupIconStr(g)}
                                                    color={gColor}
                                                    onChange={(icon) => handleUpdateGroupIcon(g, icon)}
                                                    width="w-8"
                                                    height="h-8"
                                                    className={`${isColorPickerOpen ? 'bg-sub' : 'bg-sub-alt/60'} hover:!bg-sub data-[state=open]:!bg-sub hover:scale-105 border border-white/5 hover:border-white/20 transition-colors duration-200`}
                                                    triggerContent={
                                                        <div className="flex items-center justify-center w-full h-full">
                                                            {renderGroupIconContent(g)}
                                                        </div>
                                                    }
                                                />
                                            </div>
                                        }
                                    />
                                </div>
                            );
                        };

                        const renderSectionHeader = (label: string) => (
                            <div className="flex items-center px-2 py-2 mt-1">
                                <span className="text-[10px] font-bold text-sub/40 uppercase tracking-widest">{label}</span>
                                <div className="h-px bg-white/5 flex-1 ml-3" />
                            </div>
                        );

                        return (
                            <>
                                {filteredDefault.length > 0 && renderSectionHeader('Default')}
                                {filteredDefault.map(renderGroupItem)}

                                {filteredOther.length > 0 && renderSectionHeader('Custom')}
                                {filteredOther.map(renderGroupItem)}
                            </>
                        );
                    })()}

                    {/* Add New Option */}
                    {group.trim() !== '' && !availableGroups.some(g => g.toLowerCase() === group.toLowerCase()) && (
                        <>
                            <GroupDropdown.Item
                                label={
                                    <span>
                                        <span className="text-sub opacity-70 mr-1.5">create:</span>
                                        <span className="text-text-primary font-bold">{group}</span>
                                    </span>
                                }
                                tooltipText={`Create group: ${group}`}
                                isActive={false}
                                isLowercase={false}
                                indicatorColor={tempGroupColor}
                                onIndicatorClick={(e) => {
                                    if (isGroupColorPickerOpen && editingGroupColor === 'NEW') {
                                        setIsGroupColorPickerOpen(false);
                                        setEditingGroupColor(null);
                                    } else {
                                        setEditingGroupColor('NEW');
                                        setPopupAnchor(e.currentTarget as HTMLElement);
                                        setIsGroupColorPickerOpen(true);
                                        if (!tempGroupColor) setTempGroupColor('#e2b714');
                                    }
                                }}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                    if (tempGroupIcon.trim()) {
                                        handleUpdateGroupIcon(group, tempGroupIcon);
                                        if (tempGroupColor) handleUpdateGroupColor(group, tempGroupColor);
                                    }
                                    setGroup(group);
                                    setIsGroupDropdownOpen(false);
                                }}
                                icon={
                                    <div onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                    }} onMouseDown={(e) => {
                                        // Prevent acquiring focus from the input if clicked outside
                                        e.stopPropagation();
                                    }}>
                                        <IconPicker
                                            icon={tempGroupIcon}
                                            color={tempGroupColor}
                                            onChange={(icon) => setTempGroupIcon(icon)}
                                            width="w-8"
                                            height="h-8"
                                            className="bg-main/10 border border-main/20 hover:bg-main hover:text-bg-primary transition-colors pb-0.5"
                                            triggerContent={
                                                tempGroupIcon ? (
                                                    <div
                                                        className="flex items-center justify-center w-full h-full"
                                                        style={{ color: tempGroupColor || undefined }}
                                                    >
                                                        <FontAwesomeIcon icon={getIcon(tempGroupIcon)} className="text-sm" />
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-center w-full h-full text-text-primary">
                                                        <FontAwesomeIcon icon={faPlus} className="text-sm" />
                                                    </div>
                                                )
                                            }
                                        />
                                    </div>
                                }
                            />
                        </>
                    )}

                    {availableGroups.filter(g => g.toLowerCase().includes(group.toLowerCase())).length === 0 && group.trim() === '' && (
                        <div className="px-3 py-2 text-[10px] text-sub italic">No groups found</div>
                    )}

                    <Popover.Root open={isGroupColorPickerOpen} onOpenChange={setIsGroupColorPickerOpen}>
                        {popupAnchor && <Popover.Anchor virtualRef={{ current: popupAnchor }} />}
                        <Popover.Portal>
                            <Popover.Content
                                className="z-[100] p-2 bg-sub-alt border border-white/10 rounded-xl shadow-2xl flex flex-col gap-2 min-w-[124px] animate-in fade-in zoom-in-95 duration-200"
                                sideOffset={5}
                                align="start"
                                onInteractOutside={(e) => {
                                    if (popupAnchor && popupAnchor.contains(e.target as Node)) {
                                        e.preventDefault();
                                    }
                                }}
                            >
                                <div className="flex items-center justify-between px-1">
                                    <span className="text-[9px] font-mono text-sub uppercase">Color</span>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsGroupColorPickerOpen(false);
                                            setEditingGroupColor(null);
                                        }}
                                        className="text-sub hover:text-text-primary transition-colors cursor-pointer"
                                    >
                                        <FontAwesomeIcon icon={faTimes} className="text-[10px]" />
                                    </button>
                                </div>
                                <div className="grid grid-cols-4 gap-1.5">
                                    {PRESET_COLORS.map(c => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => {
                                                if (editingGroupColor === 'NEW') {
                                                    setTempGroupColor(c);
                                                } else if (editingGroupColor) {
                                                    handleUpdateGroupColor(editingGroupColor, c);
                                                }
                                                setIsGroupColorPickerOpen(false);
                                            }}
                                            className={`w-5 h-5 rounded-full transition-transform hover:scale-125 hover:ring-2 hover:ring-white/30 cursor-pointer ${(editingGroupColor === 'NEW' ? tempGroupColor : (editingGroupColor ? (groupsMetadata[editingGroupColor]?.color || getGroupConfig(editingGroupColor)?.color) : '')) === c
                                                ? 'ring-2 ring-white/50'
                                                : ''
                                                }`}
                                            style={{ backgroundColor: c }}
                                        />
                                    ))}
                                </div>
                                <Popover.Arrow className="fill-current text-white/10" />
                            </Popover.Content>
                        </Popover.Portal>
                    </Popover.Root>
                </div>
            </GroupDropdown>
        </div>
    );
}
