import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronRight, faCog, faPlus } from '@fortawesome/free-solid-svg-icons';
import { getIcon } from '../../../../config/iconRegistry';
import type { Team, TeamRole, RoleMember } from '../../../../types/team';
import { RoleItem } from './RoleItem';

interface TeamItemProps {
    team: Team;
    roles: TeamRole[];
    isExpanded: boolean;
    onToggleExpand: (e: React.MouseEvent) => void;
    onEditTeam: (e: React.MouseEvent) => void;
    onCreateRole: (e: React.MouseEvent) => void;

    // Props to pass down to roles
    expandedRoles: Set<string>;
    onToggleRoleExpand: (roleId: string, e: React.MouseEvent) => void;
    getRoleMembers: (teamId: string, roleId: string) => RoleMember[];
    activeTeamRole: { teamId: string; roleId: string } | null;
    onRoleClick: (teamId: string, roleId: string) => void;
    onEditRole: (teamId: string, roleId: string, e: React.MouseEvent) => void;
    onMemberClick: (member: RoleMember, teamId: string, roleId: string) => void;

    // Style utils
    index: number;
}

export const TeamItem = ({
    team,
    roles,
    isExpanded,
    onToggleExpand,
    onEditTeam,
    onCreateRole,
    expandedRoles,
    onToggleRoleExpand,
    getRoleMembers,
    activeTeamRole,
    onRoleClick,
    onEditRole,
    onMemberClick,
    index
}: TeamItemProps) => {
    const iconDef = getIcon(team.icon || 'users');

    return (
        <div>
            {/* Team Header */}
            <div
                onClick={onToggleExpand}
                className={`
                    group/item relative flex items-center justify-start text-left cursor-pointer 
                    transition-colors duration-100 leading-none select-none
                    text-[var(--sub-color)] hover:text-[var(--text-color)]
                    ${index === 0 ? 'mt-1 mb-1' : 'mt-2 mb-2 border-t border-[var(--bg-color)] pt-3 pb-3'}
                `}
                style={{ padding: '0.25em 0 0.25em 0' }}
            >
                {/* Expand Arrow */}
                <div
                    className="w-[1em] flex items-center justify-center shrink-0 opacity-60"
                    style={{ marginLeft: '0.5em', marginRight: '0.3em' }}
                >
                    <FontAwesomeIcon
                        icon={isExpanded ? faChevronDown : faChevronRight}
                        className="text-[0.6em]"
                    />
                </div>

                {/* Team Icon */}
                <div
                    className="w-[1em] h-[1em] flex items-center justify-center shrink-0 transition-colors opacity-80 group-hover/item:opacity-100"
                    style={{
                        color: team.iconColor || 'inherit',
                        marginRight: '0.7em'
                    }}
                >
                    {iconDef ? (
                        <FontAwesomeIcon icon={iconDef} className="text-[1em]" />
                    ) : (
                        <span className="text-[1em] leading-none">{team.icon || '🏢'}</span>
                    )}
                </div>

                {/* Team Name */}
                <div className="flex-1 truncate pt-[0.1em] mr-2 opacity-80 group-hover/item:opacity-100 transition-opacity">
                    {team.name.toLowerCase()}
                </div>

                {/* Settings (owner only) */}
                <div className="flex items-center shrink-0 mr-[0.9em]">
                    <button
                        onClick={onEditTeam}
                        className="opacity-0 group-hover/item:opacity-100 transition-opacity text-[var(--text-color)]"
                    >
                        <FontAwesomeIcon icon={faCog} className="text-[0.8em]" />
                    </button>
                </div>
            </div>

            {/* Roles List */}
            {isExpanded && (
                <div className="flex flex-col">
                    {/* Separator if roles exist */}
                    {roles.length > 0 && (
                        <div className="flex justify-center mb-1">
                            <div className="h-[1px] w-32 opacity-20" style={{ backgroundColor: 'var(--sub-color)' }} />
                        </div>
                    )}

                    {roles.map(role => {
                        const memberKey = `${team.id}/${role.id}`;
                        const members = getRoleMembers(team.id, role.id);
                        const isRoleExpanded = expandedRoles.has(memberKey);
                        const isActive = activeTeamRole?.teamId === team.id && activeTeamRole?.roleId === role.id;

                        return (
                            <RoleItem
                                key={role.id}
                                teamId={team.id}
                                role={role}
                                members={members}
                                isActive={isActive}
                                isExpanded={isRoleExpanded}
                                onToggleExpand={(e) => onToggleRoleExpand(role.id, e)}
                                onRoleClick={() => onRoleClick(team.id, role.id)}
                                onEditRole={(e) => onEditRole(team.id, role.id, e)}
                                onMemberClick={(m) => onMemberClick(m, team.id, role.id)}
                            />
                        );
                    })}

                    {/* Add Role Button */}
                    <button
                        onClick={onCreateRole}
                        className="group/add flex items-center text-left transition-colors duration-100 leading-none text-[var(--sub-color)] hover:text-[var(--bg-color)] hover:bg-[var(--text-color)]"
                        style={{ padding: '0.4em 0', paddingLeft: '2em' }}
                    >
                        <div
                            className="w-[1em] h-[1em] flex items-center justify-center shrink-0 opacity-60 group-hover/add:opacity-100"
                            style={{ marginRight: '0.7em' }}
                        >
                            <FontAwesomeIcon icon={faPlus} className="text-[1em]" />
                        </div>
                        <span className="text-[0.9em]">add role</span>
                    </button>

                    {/* Separator after expanded content - handled by parent map logic usually, but here just spacing */}
                </div>
            )}
        </div>
    );
};
