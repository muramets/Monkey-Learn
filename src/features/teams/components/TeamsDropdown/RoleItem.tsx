import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronRight, faCog, faCheck } from '@fortawesome/free-solid-svg-icons';
import { getIcon } from '../../../../config/iconRegistry';
import type { TeamRole, RoleMember } from '../../../../types/team';
import { MemberItem } from './MemberItem';
import { resolveEntityColor } from '../../../../utils/entityColor';

interface RoleItemProps {
    teamId: string;
    role: TeamRole;
    members: RoleMember[];
    isActive: boolean;
    isExpanded: boolean;
    onToggleExpand: (e: React.MouseEvent) => void;
    onRoleClick: () => void;
    onEditRole: (e: React.MouseEvent) => void;
    onMemberClick: (member: RoleMember) => void;
}

export const RoleItem = ({

    role,
    members,
    isActive,
    isExpanded,
    onToggleExpand,
    onRoleClick,
    onEditRole,
    onMemberClick
}: RoleItemProps) => {
    const [isArrowHovered, setIsArrowHovered] = useState(false);

    const roleIconDef = getIcon(role.icon || 'user');
    const hasMembers = members.length > 0;

    return (
        <div>
            {/* Role Row Container */}
            <div className="flex items-center">
                {/* Expand Arrow - separate hover target */}
                <div
                    className={`w-[1.5em] h-full flex items-center justify-center shrink-0 cursor-pointer transition-colors ${hasMembers
                        ? `text-[var(--sub-color)] hover:text-[var(--text-color)] ${isArrowHovered ? 'text-[var(--text-color)] opacity-100' : 'opacity-60 hover:opacity-100'}`
                        : 'opacity-0 pointer-events-none'
                        }`}
                    style={{ marginLeft: '0.5em' }}
                    onClick={onToggleExpand}
                    onMouseEnter={() => setIsArrowHovered(true)}
                    onMouseLeave={() => setIsArrowHovered(false)}
                >
                    {hasMembers && (
                        <FontAwesomeIcon
                            icon={isExpanded ? faChevronDown : faChevronRight}
                            className="text-[0.5em]"
                        />
                    )}
                </div>

                {/* Role Row - nav item styling */}
                <div
                    onClick={onRoleClick}
                    className="group/role flex-1 flex items-center cursor-pointer transition-colors duration-100 leading-none select-none text-[var(--text-color)] hover:text-[var(--bg-color)] hover:bg-[var(--text-color)]"
                    style={{ padding: '0.4em 0.8em 0.4em 0.3em' }}
                >
                    {/* Role Icon */}
                    <div
                        className={`w-[1em] h-[1em] flex items-center justify-center shrink-0 opacity-70 group-hover/role:opacity-100 ${role.iconColor ? 'group-hover/role:!text-inherit' : ''}`}
                        style={{
                            color: role.iconColor ? resolveEntityColor(role.iconColor) : 'inherit',
                            marginRight: '0.7em'
                        }}
                    >
                        {roleIconDef ? (
                            <FontAwesomeIcon icon={roleIconDef} className="text-[1em]" />
                        ) : (
                            <span className="text-[1em]">{role.icon || '👤'}</span>
                        )}
                    </div>

                    {/* Role Name (Truncated) */}
                    <div
                        className={`truncate text-[0.95em] transition-opacity min-w-0 ${isArrowHovered ? '!opacity-100 !text-[var(--text-color)]' : 'opacity-70 group-hover/role:opacity-100'
                            }`}
                    >
                        {role.name.toLowerCase()}
                    </div>

                    {/* Member Count */}
                    {hasMembers && (
                        <span
                            className={`ml-[0.4em] text-[0.8em] transition-opacity ${isArrowHovered ? '!opacity-80' : 'opacity-50 group-hover/role:opacity-80'
                                }`}
                        >
                            ({members.length})
                        </span>
                    )}

                    {/* Actions & Active Indicator */}
                    <div className="flex items-center shrink-0 ml-auto gap-2">
                        <button
                            onClick={onEditRole}
                            className="opacity-0 group-hover/role:opacity-100 transition-[opacity,color] hover:!text-[var(--main-color)]"
                            style={{ color: 'var(--bg-color)' }}
                        >
                            <FontAwesomeIcon icon={faCog} className="text-[0.8em]" />
                        </button>
                        {isActive && (
                            <FontAwesomeIcon icon={faCheck} className="text-[0.7em]" />
                        )}
                    </div>
                </div>
            </div>

            {/* Members (expanded) */}
            {isExpanded && hasMembers && (
                <div className="flex flex-col">
                    {members.map(member => (
                        <MemberItem
                            key={member.uid}
                            member={member}
                            onClick={() => onMemberClick(member)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
