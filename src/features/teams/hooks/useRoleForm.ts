import { useState, useEffect, useMemo, type FormEvent } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useTeamStore, useRoleStore, useInviteStore } from '../../../stores/team';
import { useMetadataStore } from '../../../stores/metadataStore';
import { usePersonalityStore } from '../../../stores/personalityStore';
import { db } from '../../../config/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import type { RoleTemplate } from '../../../types/team';
import type { Protocol } from '../../../features/protocols/types';
import type { Innerface } from '../../../features/innerfaces/types';
import type { StateData } from '../../../features/dashboard/types';
import { DEFAULT_ENTITY_COLOR } from '../../../utils/entityColor';

interface UseRoleFormProps {
    teamId: string | null;
    roleId: string | null;
    onClose: () => void;
    isOpen: boolean;
}

export function useRoleForm({ teamId, roleId, onClose, isOpen }: UseRoleFormProps) {
    const { user } = useAuth();
    const { teams } = useTeamStore();
    const { roles, createRole, updateRole, deleteRole } = useRoleStore();
    const { generateInviteLink } = useInviteStore();
    const {
        innerfaces,
        protocols,
        states,
        groupsMetadata,
        protocolGroupOrder,
        innerfaceGroupOrder,
        pinnedProtocolIds
    } = useMetadataStore();
    const { activeContext, ensureDefaultPersonality, personalities, activePersonalityId } = usePersonalityStore();

    // Form State
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [icon, setIcon] = useState('user');
    const [color, setColor] = useState(DEFAULT_ENTITY_COLOR);

    // Selection State
    const [selectedInnerfaces, setSelectedInnerfaces] = useState<Set<string>>(new Set());
    const [selectedProtocols, setSelectedProtocols] = useState<Set<string>>(new Set());
    const [selectedStates, setSelectedStates] = useState<Set<string>>(new Set());

    // Role Data (Loaded from template/subcollections)
    const [roleInnerfaces, setRoleInnerfaces] = useState<Innerface[]>([]);
    const [roleProtocols, setRoleProtocols] = useState<Protocol[]>([]);
    const [roleStates, setRoleStates] = useState<StateData[]>([]);

    // UI State
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Invite Link State
    const [inviteLink, setInviteLink] = useState<string | null>(null);
    const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);

    const team = teamId ? teams.find(t => t.id === teamId) : null;
    const role = teamId && roleId ? roles[teamId]?.find(r => r.id === roleId) : null;
    const isOwner = team ? team.ownerId === user?.uid : true;

    // Reset on Open/Change
    useEffect(() => {
        if (isOpen) {
            setIsConfirmingDelete(false);

            if (!roleId) {
                // Create Mode
                setName('');
                setDescription('');
                setIcon('user');
                setColor(DEFAULT_ENTITY_COLOR);
                setRoleInnerfaces([]);
                setRoleProtocols([]);
                setRoleStates([]);
                setSelectedInnerfaces(new Set());
                setSelectedProtocols(new Set());
                setSelectedStates(new Set());
                setInviteLink(null);
            }
        }
    }, [isOpen, roleId]);

    // Load Role Data
    useEffect(() => {
        if (!isOpen || !roleId || !role) return;

        setName(role.name);
        setDescription(role.description || '');
        setIcon(role.icon || 'user');
        setColor(role.iconColor || DEFAULT_ENTITY_COLOR);

        // Check Invite
        if (role.activeInviteCode) {
            const baseUrl = window.location.origin;
            setInviteLink(`${baseUrl}/invite/${role.activeInviteCode}`);

            // Background check for validity (optional, but good for cleanup)
            const checkInvite = async () => {
                try {
                    const inviteDoc = await getDoc(doc(db, 'team_invites', role.activeInviteCode!));
                    if (!inviteDoc.exists()) {
                        setInviteLink(null);
                    }
                } catch (e) {
                    console.error("Failed to verify invite", e);
                }
            };
            checkInvite();
        } else {
            setInviteLink(null);
        }

        // Load Template Data
        const loadTemplate = async () => {
            if (!teamId || !roleId) return;

            if (role.templateData) {
                const template = role.templateData;
                if (template) {
                    setRoleInnerfaces(template.innerfaces || []);
                    setRoleProtocols(template.protocols || []);
                    setRoleStates(template.states || []);
                    setSelectedInnerfaces(new Set(template.innerfaces?.map(i => i.id.toString()) || []));
                    setSelectedProtocols(new Set(template.protocols?.map(p => p.id.toString()) || []));
                    setSelectedStates(new Set(template.states?.map(s => s.id) || []));
                }
                return;
            }

            try {
                const [protoSnap, ifaceSnap, stateSnap] = await Promise.all([
                    getDocs(collection(db, 'teams', teamId, 'roles', roleId, 'protocols')),
                    getDocs(collection(db, 'teams', teamId, 'roles', roleId, 'innerfaces')),
                    getDocs(collection(db, 'teams', teamId, 'roles', roleId, 'states'))
                ]);

                const pIds = new Set<string>();
                const roleProtosList: Protocol[] = [];
                protoSnap.forEach(d => {
                    pIds.add(d.id);
                    roleProtosList.push({ ...d.data(), id: d.id } as Protocol);
                });

                const iIds = new Set<string>();
                const roleIfacesList: Innerface[] = [];
                ifaceSnap.forEach(d => {
                    iIds.add(d.id);
                    roleIfacesList.push({ ...d.data(), id: d.id } as Innerface);
                });

                const sIds = new Set<string>();
                const roleStatesList: StateData[] = [];
                stateSnap.forEach(d => {
                    sIds.add(d.id);
                    roleStatesList.push({ ...d.data(), id: d.id } as StateData);
                });

                setRoleProtocols(roleProtosList);
                setRoleInnerfaces(roleIfacesList);
                setRoleStates(roleStatesList);
                setSelectedProtocols(pIds);
                setSelectedInnerfaces(iIds);
                setSelectedStates(sIds);
            } catch (err) {
                console.error("Failed to load role template data", err);
            }
        };
        loadTemplate();
    }, [isOpen, roleId, role, teamId]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!user || !name.trim() || !teamId) return;

        setIsLoading(true);
        try {
            const mergedProtocols = (() => {
                const map = new Map<string, Protocol>();
                roleProtocols.forEach(p => map.set(p.id.toString(), p));
                protocols.forEach(p => map.set(p.id.toString(), p));
                return Array.from(map.values());
            })();

            const mergedInnerfaces = (() => {
                const map = new Map<string, Innerface>();
                roleInnerfaces.forEach(i => map.set(i.id.toString(), i));
                innerfaces.forEach(i => map.set(i.id.toString(), i));
                return Array.from(map.values());
            })();

            const mergedStates = (() => {
                const map = new Map<string, StateData>();
                roleStates.forEach(s => map.set(s.id, s));
                states.forEach(s => map.set(s.id, s));
                return Array.from(map.values());
            })();

            const selectedProtocolObjs = mergedProtocols.filter(p => selectedProtocols.has(p.id.toString()));
            const selectedInnerfaceObjs = mergedInnerfaces.filter(i => selectedInnerfaces.has(i.id.toString()));

            const usedGroupNames = new Set([
                ...selectedProtocolObjs.map(p => p.group).filter(Boolean),
                ...selectedInnerfaceObjs.map(i => i.group).filter(Boolean)
            ] as string[]);

            const filteredGroupsMetadata = Object.fromEntries(
                Object.entries(groupsMetadata).filter(([name]) => usedGroupNames.has(name))
            );

            const filteredProtocolGroupOrder = protocolGroupOrder.filter(name => usedGroupNames.has(name));

            const filteredInnerfaceGroupOrder: Record<string, string[]> = {};
            Object.entries(innerfaceGroupOrder).forEach(([cat, order]) => {
                if (Array.isArray(order)) {
                    filteredInnerfaceGroupOrder[cat] = order.filter(group => usedGroupNames.has(group));
                }
            });

            const template: RoleTemplate = {
                innerfaces: selectedInnerfaceObjs,
                protocols: selectedProtocolObjs,
                states: mergedStates.filter(s => selectedStates.has(s.id)),
                groups: filteredGroupsMetadata,
                protocolGroupOrder: filteredProtocolGroupOrder,
                innerfaceGroupOrder: filteredInnerfaceGroupOrder,
                pinnedProtocolIds: pinnedProtocolIds.filter(id => selectedProtocols.has(id))
            };

            const data = {
                name: name.trim(),
                description: description.trim(),
                icon,
                iconColor: color,
                templateData: template
            };

            if (roleId) {
                await updateRole(teamId, roleId, data);
            } else {
                await createRole(teamId, data);
            }
            onClose();
        } catch (err) {
            console.error('Failed to save role:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!teamId || !roleId || !user) return;

        if (!isConfirmingDelete) {
            setIsConfirmingDelete(true);
            setTimeout(() => setIsConfirmingDelete(false), 3000);
            return;
        }

        setIsLoading(true);
        try {
            await deleteRole(teamId, roleId);
            if (activeContext?.type === 'role' && activeContext.teamId === teamId && activeContext.roleId === roleId) {
                await ensureDefaultPersonality(user.uid, true);
            }
            onClose();
        } catch (err) {
            console.error('Failed to delete role:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateInvite = async () => {
        if (!teamId || !roleId || !user) return;
        setIsGeneratingInvite(true);
        try {
            const link = await generateInviteLink(teamId, roleId, user.uid);
            setInviteLink(link);
        } catch (err) {
            console.error('Failed to generate invite:', err);
        } finally {
            setIsGeneratingInvite(false);
        }
    };

    // Source context calculation
    const sourceContext = useMemo(() => {
        if (!activePersonalityId) return null;
        const p = personalities.find(p => p.id === activePersonalityId);
        if (p) return { name: p.name, icon: p.icon, color: p.iconColor };
        if (activeContext?.type === 'role') {
            const allRoles = Object.values(roles).flat();
            const r = allRoles.find(r => r.id === activeContext.roleId);
            return r ? { name: r.name, icon: r.icon, color: r.iconColor } : { name: 'Active Role', icon: 'user', color: 'var(--text-secondary)' };
        }
        return null;
    }, [activePersonalityId, personalities, activeContext, roles]);

    const isSynced = useMemo(() => {
        if (innerfaces.length === 0 && protocols.length === 0 && states.length === 0) return false;
        return (
            innerfaces.every(i => selectedInnerfaces.has(i.id.toString())) &&
            protocols.every(p => selectedProtocols.has(p.id.toString())) &&
            states.every(s => selectedStates.has(s.id))
        );
    }, [innerfaces, protocols, states, selectedInnerfaces, selectedProtocols, selectedStates]);

    const handlePersonalitySync = () => {
        if (isSynced) {
            setSelectedInnerfaces(new Set());
            setSelectedProtocols(new Set());
            setSelectedStates(new Set());
        } else {
            setSelectedInnerfaces(new Set(innerfaces.map(i => i.id.toString())));
            setSelectedProtocols(new Set(protocols.map(p => p.id.toString())));
            setSelectedStates(new Set(states.map(s => s.id)));
        }
    };

    const toggleItem = (id: string, type: 'protocols' | 'innerfaces' | 'states') => {
        if (type === 'innerfaces') {
            const next = new Set(selectedInnerfaces);
            if (next.has(id)) next.delete(id); else next.add(id);
            setSelectedInnerfaces(next);
        } else if (type === 'protocols') {
            const next = new Set(selectedProtocols);
            if (next.has(id)) next.delete(id); else next.add(id);
            setSelectedProtocols(next);
        } else if (type === 'states') {
            const next = new Set(selectedStates);
            if (next.has(id)) next.delete(id); else next.add(id);
            setSelectedStates(next);
        }
    };

    return {
        // State
        formState: {
            name, setName,
            description, setDescription,
            icon, setIcon,
            color, setColor,
            selectedInnerfaces,
            selectedProtocols,
            selectedStates
        },
        uiState: {
            isConfirmingDelete,
            isLoading,
            inviteLink,
            isGeneratingInvite,
            isOwner
        },
        // Data
        mergedProtocols: useMemo(() => {
            const map = new Map<string, Protocol>();
            roleProtocols.forEach(p => map.set(p.id.toString(), p));
            protocols.forEach(p => map.set(p.id.toString(), p));
            return Array.from(map.values());
        }, [roleProtocols, protocols]),
        mergedInnerfaces: useMemo(() => {
            const map = new Map<string, Innerface>();
            roleInnerfaces.forEach(i => map.set(i.id.toString(), i));
            innerfaces.forEach(i => map.set(i.id.toString(), i));
            return Array.from(map.values());
        }, [roleInnerfaces, innerfaces]),
        mergedStates: useMemo(() => {
            const map = new Map<string, StateData>();
            roleStates.forEach(s => map.set(s.id, s));
            states.forEach(s => map.set(s.id, s));
            return Array.from(map.values());
        }, [roleStates, states]),
        // Computed
        sourceContext,
        isSynced,
        // Handlers
        handleSubmit,
        handleDelete,
        handleGenerateInvite,
        handlePersonalitySync,
        toggleItem
    };
}
