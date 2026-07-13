import React, { useState } from 'react';
import { usePersonalityStore } from '../../../stores/personalityStore';
import { useAuth } from '../../../contexts/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCog, faPlus, faCheck, faPen, faEye } from '@fortawesome/free-solid-svg-icons';
import { PersonalitySettingsModal } from '../modals/PersonalitySettingsModal';
import { Avatar } from '../../../components/ui/atoms/Avatar';

import { useRoleStore } from '../../../stores/team';
import type { TeamRole } from '../../../types/team';
import { resolveEntityColor } from '../../../utils/entityColor';

export function PersonalityDropdown() {
    const { user } = useAuth();
    const { personalities, activePersonalityId, switchPersonality, activeContext } = usePersonalityStore();
    const { roles } = useRoleStore();

    // UI Local State
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [editingPersonalityId, setEditingPersonalityId] = useState<string | null>(null);

    // Determine Active Display Item
    let activeItem: { name: string; icon?: string; iconColor?: string; avatar?: string } | null | undefined = personalities.find(p => p.id === activePersonalityId);
    let isDesignMode = false;
    let isViewerMode = false;

    if (activeContext?.type === 'role') {
        isDesignMode = true;
        // Find the role in team store
        const role = roles[activeContext.teamId]?.find((r: TeamRole) => r.id === activeContext.roleId);
        if (role) {
            activeItem = role;
        }
    } else if (activeContext?.type === 'viewer') {
        isViewerMode = true;
        activeItem = {
            name: activeContext.displayName || 'Participant',
            icon: 'user'
        };
    }

    const handleEdit = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setEditingPersonalityId(id);
        setIsSettingsModalOpen(true);
    };

    const handleCreate = () => {
        setEditingPersonalityId(null);
        setIsSettingsModalOpen(true);
    };

    return (
        <>
            <div className="relative group z-50 font-mono lowercase">
                {/* Trigger Button - Exact MonkeyType Account Button Replica */}
                <button
                    className="grid grid-flow-col items-center gap-[0.33em] outline-none leading-none transition-colors duration-150 text-[1rem]"
                    style={{ color: 'var(--sub-color)' }}
                >
                    <div
                        className="flex items-center justify-center transition-colors duration-150 group-hover:text-[var(--text-color)]"
                        style={{
                            width: '1.4em',
                            height: '1.4em'
                        }}
                    >
                        {/* Avatar / Icon */}
                        <Avatar
                            src={activeItem?.avatar}
                            fallbackIcon={activeItem?.icon || 'user'}
                            className="w-full h-full rounded-full"
                            style={{
                                color: activeItem?.avatar ? 'transparent' : 'var(--sub-color)',
                                fontSize: '0.9em'
                            }}
                        />
                    </div>

                    <span className="mt-[0.1em] transition-colors duration-150 group-hover:text-[var(--text-color)] max-[850px]:hidden" style={{ fontSize: '0.75em' }}>
                        {(activeItem?.name || 'loading...').toLowerCase()}
                    </span>

                    {/* Personality Count Badge OR Role Mode Indicator OR Viewer Mode Indicator */}
                    {isDesignMode ? (
                        <div
                            className="flex items-center justify-center transition-colors duration-150 bg-[var(--main-color)] text-[var(--bg-color)] gap-[0.4em]"
                            style={{
                                fontSize: '0.6em',
                                lineHeight: '0.65em',
                                padding: '0.35em 0.5em',
                                borderRadius: '2px',
                                alignSelf: 'center',
                                width: 'max-content',
                                fontWeight: 'bold'
                            }}
                        >
                            <FontAwesomeIcon icon={faPen} style={{ fontSize: '0.9em' }} />
                            ROLE
                        </div>
                    ) : isViewerMode ? (
                        <div
                            className="flex items-center justify-center transition-colors duration-150 bg-[var(--main-color)] text-[var(--bg-color)] gap-[0.4em]"
                            style={{
                                fontSize: '0.6em',
                                lineHeight: '0.65em',
                                padding: '0.35em 0.5em',
                                borderRadius: '2px',
                                alignSelf: 'center',
                                width: 'max-content',
                                fontWeight: 'bold'
                            }}
                        >
                            <FontAwesomeIcon icon={faEye} style={{ fontSize: '0.9em' }} />
                            COACH
                        </div>
                    ) : (
                        <div
                            className="flex items-center justify-center transition-colors duration-150 bg-[var(--sub-color)] group-hover:bg-[var(--text-color)] group-hover:text-[var(--bg-color)]"
                            style={{
                                fontSize: '0.65em',
                                lineHeight: '0.65em',
                                padding: '0.3em 0.45em',
                                borderRadius: '4px',
                                color: 'var(--bg-color)',
                                alignSelf: 'center',
                                width: 'max-content'
                            }}
                        >
                            {personalities.length}
                        </div>
                    )}
                </button>

                {/* Dropdown Menu - Exact MonkeyType Replica */}
                <div className="absolute top-full right-0 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-[opacity,visibility] duration-150 min-w-[23ch] z-[100] text-[0.75rem] pt-2">
                    <div
                        className="flex flex-col rounded-[0.5rem] overflow-hidden"
                        style={{
                            backgroundColor: 'var(--sub-alt-color)',
                            boxShadow: '0 0 0 0.5em var(--bg-color)',
                            gap: '0.25em'
                        }}
                    >
                        {/* Switch Header if in Design/Viewer Mode */}
                        {(isDesignMode || isViewerMode) && (
                            <div className="px-3 pt-2 pb-1 flex flex-col gap-1 opacity-70">
                                <span className="text-[0.9em] font-bold text-[var(--sub-color)]">Back to personality:</span>
                                <div className="h-[1px] bg-[var(--sub-color)] opacity-30 w-full" />
                            </div>
                        )}

                        {/* Personalities List */}
                        {personalities.map((p, index) => {
                            const isActive = !isDesignMode && p.id === activePersonalityId;

                            return (
                                <div
                                    key={p.id}
                                    onClick={() => switchPersonality(user?.uid || '', p.id)}
                                    className={`
                                        group/item relative flex items-center justify-start text-left cursor-pointer transition-colors duration-100 leading-none
                                        text-[var(--text-color)] hover:text-[var(--bg-color)] hover:bg-[var(--text-color)]
                                        ${index === 0 && !isDesignMode ? 'rounded-t-[0.5rem]' : ''}
                                    `}
                                    style={{ padding: '0.5em 0' }}
                                >
                                    {/* Avatar / Icon */}
                                    <div
                                        className={`w-[1em] h-[1em] flex items-center justify-center shrink-0 transition-colors opacity-80 group-hover/item:opacity-100 text-[var(--text-color)] group-hover/item:text-[var(--hover-color)]`}
                                        style={{
                                            marginLeft: '0.9em',
                                            marginRight: '0.7em',
                                            '--hover-color': p.iconColor ? resolveEntityColor(p.iconColor) : 'inherit'
                                        } as React.CSSProperties}
                                    >
                                        <Avatar
                                            src={p.avatar}
                                            fallbackIcon={p.icon || 'user'}
                                            className="w-full h-full rounded-full text-inherit"
                                            style={{
                                                fontSize: '0.8em',
                                                color: 'inherit'
                                            }}
                                        />
                                    </div>

                                    {/* Name */}
                                    <div className="flex-1 truncate pt-[0.1em] mr-2">
                                        {p.name.toLowerCase()}
                                    </div>

                                    {/* Actions Container (Gear + Checkmark) */}
                                    <div className="flex items-center shrink-0 mr-[0.9em]">
                                        {/* Settings Gear - Always present but hidden, fixed width */}
                                        <div className="w-[1.5em] flex justify-center">
                                            <button
                                                onClick={(e) => handleEdit(e, p.id)}
                                                className="opacity-0 group-hover/item:opacity-100 transition-[opacity,color] hover:!text-[var(--main-color)]"
                                                style={{ color: 'var(--bg-color)' }}
                                            >
                                                <FontAwesomeIcon icon={faCog} className="text-[0.8em]" />
                                            </button>
                                        </div>

                                        {/* Active Checkmark Indicator (Fixed width slot) */}
                                        <div className="w-[1em] flex justify-center ml-1">
                                            {isActive && (
                                                <FontAwesomeIcon icon={faCheck} className="text-[0.7em]" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Separator */}
                        <div
                            className="h-[1px] mx-0 opacity-10 shrink-0"
                            style={{ backgroundColor: 'var(--sub-color)' }}
                        />

                        {/* Create New - Treated as just another item */}
                        <button
                            onClick={handleCreate}
                            className="group flex items-center justify-start text-left w-full leading-none text-[var(--text-color)] hover:text-[var(--bg-color)] hover:bg-[var(--text-color)] rounded-b-[0.5rem]"
                            style={{ padding: '0.5em 0' }}
                        >
                            <div
                                className="w-[1em] h-[1em] flex items-center justify-center shrink-0 opacity-80 group-hover:opacity-100"
                                style={{
                                    marginLeft: '0.9em',
                                    marginRight: '0.7em'
                                }}
                            >
                                <FontAwesomeIcon icon={faPlus} className="text-[1em]" />
                            </div>
                            <span className="truncate pt-[0.1em]">create new</span>
                        </button>
                    </div>
                </div>
            </div>

            <PersonalitySettingsModal
                isOpen={isSettingsModalOpen}
                onClose={() => setIsSettingsModalOpen(false)}
                personalityId={editingPersonalityId}
            />
        </>
    );
}
