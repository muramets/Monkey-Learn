/**
 * TeamsDropdown Feature Component
 * 
 * Orchestrates:
 * - Data subscription (Teams, Roles, Members)
 * - Modal state (Create Team, Role Settings, Join Team)
 * - Accordion expansion state
 * - Rendering TeamItem list
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { useTeamStore, useRoleStore, useRoleMembersStore } from '../../../../stores/team';
import { usePersonalityStore } from '../../../../stores/personalityStore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUsers, faPlus, faLink } from '@fortawesome/free-solid-svg-icons';
import { ADMIN_EMAILS } from '../../../../config/adminList';

// Modals
import { TeamSettingsModal } from '../../modals/TeamSettingsModal';
import { RoleSettingsModal } from '../../modals/RoleSettingsModal';
import { JoinTeamModal } from '../../modals/JoinTeamModal';

// Sub-components
import { TeamItem } from './TeamItem';

export function TeamsDropdown() {
    const { user } = useAuth();
    const { teams, subscribeToTeams } = useTeamStore();
    const { roles, loadRoles } = useRoleStore();
    const { roleMembers, subscribeToRoleMembers } = useRoleMembersStore();
    const { switchToRole, switchToViewer, activeContext } = usePersonalityStore();

    // Local state
    const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
    const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set());

    // Modals
    const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

    // Selection for Modals
    const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
    const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
    const [activeTeamId, setActiveTeamId] = useState<string | null>(null); // For creating role

    // 1. Subscribe to Teams
    useEffect(() => {
        if (!user?.uid) return;
        const unsub = subscribeToTeams(user.uid);
        return unsub;
    }, [user?.uid, subscribeToTeams]);

    // 2. Admin Check
    const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email);

    // 3. Filter Owned Teams & Load Roles
    const ownedTeams = useMemo(() => teams.filter(t => t.ownerId === user?.uid), [teams, user?.uid]);

    useEffect(() => {
        ownedTeams.forEach(team => {
            if (!roles[team.id]) {
                loadRoles(team.id);
            }
        });
    }, [ownedTeams, roles, loadRoles]);

    // 4. Eager Load Members for Roles
    useEffect(() => {
        const unsubscribes: (() => void)[] = [];
        ownedTeams.forEach(team => {
            const teamRoles = roles[team.id] || [];
            teamRoles.forEach(role => {
                const unsub = subscribeToRoleMembers(team.id, role.id);
                unsubscribes.push(unsub);
            });
        });
        return () => { unsubscribes.forEach(unsub => unsub()); };
    }, [ownedTeams, roles, subscribeToRoleMembers]);

    // Handlers
    const toggleTeamExpand = (teamId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setExpandedTeams(prev => {
            const next = new Set(prev);
            if (next.has(teamId)) next.delete(teamId); else next.add(teamId);
            return next;
        });
    };

    // Revised Handler for Composite Key (TeamItem will construct it? Or here?)
    // Let's do it like the original: toggleRoleExpand(teamId, roleId)
    const handleToggleRole = (teamId: string, roleId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const key = `${teamId}/${roleId}`;
        setExpandedRoles(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key); else next.add(key);
            return next;
        });
    };

    const activeTeamRole = useMemo(() => {
        if (activeContext?.type === 'role') {
            return { teamId: activeContext.teamId, roleId: activeContext.roleId };
        }
        return null;
    }, [activeContext]);

    // Actions
    const handleCreateTeam = () => {
        setEditingTeamId(null);
        setIsTeamModalOpen(true);
    };

    const handleEditTeam = (e: React.MouseEvent, teamId: string) => {
        e.stopPropagation();
        setEditingTeamId(teamId);
        setIsTeamModalOpen(true);
    };

    const handleCreateRole = (e: React.MouseEvent, teamId: string) => {
        e.stopPropagation();
        setActiveTeamId(teamId);
        setEditingRoleId(null); // Create mode
        setIsRoleModalOpen(true);
    };

    const handleEditRole = (teamId: string, roleId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setActiveTeamId(teamId);
        setEditingRoleId(roleId);
        setIsRoleModalOpen(true);
    };

    const handleRoleClick = (teamId: string, roleId: string) => {
        switchToRole(teamId, roleId);
    };

    const handleMemberClick = (member: { uid: string; personalityId: string; displayName: string }, teamId: string, roleId: string) => {
        switchToViewer(member.uid, member.personalityId, teamId, roleId, member.displayName);
    };

    if (!isAdmin) return null;

    return (
        <>
            <div className="relative group z-50 font-mono lowercase">
                {/* Trigger Button */}
                <button
                    className="grid grid-flow-col items-center gap-[0.33em] outline-none leading-none transition-colors duration-150 text-[1rem]"
                    style={{ color: 'var(--sub-color)' }}
                >
                    <div
                        className="flex items-center justify-center transition-colors duration-150 group-hover:text-[var(--text-color)]"
                        style={{ width: '1.4em', height: '1.4em' }}
                    >
                        <FontAwesomeIcon icon={faUsers} style={{ fontSize: '1em' }} />
                    </div>

                    <span
                        className="mt-[0.1em] transition-colors duration-150 group-hover:text-[var(--text-color)] max-[850px]:hidden"
                        style={{ fontSize: '0.75em' }}
                    >
                        teams
                    </span>

                    {/* Team Count Badge */}
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
                        {ownedTeams.length}
                    </div>
                </button>

                {/* Dropdown Menu */}
                <div className="absolute top-full right-0 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-[opacity,visibility] duration-150 min-w-[26ch] z-[100] text-[0.75rem] pt-2">
                    <div
                        className="flex flex-col rounded-[0.5rem] overflow-hidden"
                        style={{
                            backgroundColor: 'var(--sub-alt-color)',
                            boxShadow: '0 0 0 0.5em var(--bg-color)',
                        }}
                    >
                        {ownedTeams.length === 0 ? (
                            <div
                                className="flex items-center justify-center leading-none opacity-50"
                                style={{ color: 'var(--sub-color)', padding: '0.5em 0' }}
                            >
                                no teams yet
                            </div>
                        ) : (
                            ownedTeams.map((team, index) => (
                                <TeamItem
                                    key={team.id}
                                    index={index}
                                    team={team}
                                    roles={roles[team.id] || []}
                                    isExpanded={expandedTeams.has(team.id)}
                                    // Actions
                                    onToggleExpand={(e) => toggleTeamExpand(team.id, e)}
                                    onEditTeam={(e) => handleEditTeam(e, team.id)}
                                    onCreateRole={(e) => handleCreateRole(e, team.id)}
                                    // Role Props
                                    expandedRoles={expandedRoles}
                                    onToggleRoleExpand={(roleId, e) => handleToggleRole(team.id, roleId, e)}
                                    getRoleMembers={(tId, rId) => roleMembers[`${tId}/${rId}`] || []}
                                    activeTeamRole={activeTeamRole}
                                    onRoleClick={handleRoleClick}
                                    onEditRole={handleEditRole}
                                    onMemberClick={handleMemberClick}
                                />
                            ))
                        )}

                        {/* Separator */}
                        <div className="h-[1px] mx-0 opacity-10 shrink-0" style={{ backgroundColor: 'var(--sub-color)' }} />

                        {/* Create Team */}
                        <button
                            onClick={handleCreateTeam}
                            className="group flex items-center justify-start text-left w-full leading-none text-[var(--text-color)] hover:text-[var(--bg-color)] hover:bg-[var(--text-color)]"
                            style={{ padding: '0.5em 0' }}
                        >
                            <div
                                className="w-[1em] h-[1em] flex items-center justify-center shrink-0 opacity-80 group-hover:opacity-100"
                                style={{ marginLeft: '0.9em', marginRight: '0.7em' }}
                            >
                                <FontAwesomeIcon icon={faPlus} className="text-[1em]" />
                            </div>
                            <span className="truncate pt-[0.1em] opacity-80 group-hover:opacity-100 transition-opacity">create team</span>
                        </button>

                        {/* Join with Invite */}
                        <button
                            onClick={() => setIsJoinModalOpen(true)}
                            className="group flex items-center justify-start text-left w-full leading-none text-[var(--text-color)] hover:text-[var(--bg-color)] hover:bg-[var(--text-color)] rounded-b-[0.5rem]"
                            style={{ padding: '0.5em 0' }}
                        >
                            <div
                                className="w-[1em] h-[1em] flex items-center justify-center shrink-0 opacity-80 group-hover:opacity-100"
                                style={{ marginLeft: '0.9em', marginRight: '0.7em' }}
                            >
                                <FontAwesomeIcon icon={faLink} className="text-[1em]" />
                            </div>
                            <span className="truncate pt-[0.1em] opacity-80 group-hover:opacity-100 transition-opacity">join with invite</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <TeamSettingsModal
                isOpen={isTeamModalOpen}
                onClose={() => setIsTeamModalOpen(false)}
                teamId={editingTeamId}
            />

            <RoleSettingsModal
                isOpen={isRoleModalOpen}
                onClose={() => setIsRoleModalOpen(false)}
                teamId={activeTeamId}
                roleId={editingRoleId}
            />

            <JoinTeamModal
                isOpen={isJoinModalOpen}
                onClose={() => setIsJoinModalOpen(false)}
            />
        </>
    );
}
