import { useState, useEffect, useMemo } from 'react';
import { useMetadataStore } from '../../../stores/metadataStore';
import { usePersonalityStore } from '../../../stores/personalityStore';
import { useUIStore } from '../../../stores/uiStore';
import { getGroupConfig } from '../../../constants/common';
import { useHistoryStore } from '../../../stores/historyStore';
import type { PowerCategory } from '../types';

interface UseInnerfaceFormProps {
    innerfaceId?: number | string | null;
    onClose: () => void;
    isOpen: boolean;
}

export function useInnerfaceForm({ innerfaceId, onClose, isOpen }: UseInnerfaceFormProps) {
    const { addCheckin } = useHistoryStore();
    const {
        innerfaces,
        protocols,
        groupsMetadata,
        addInnerface,
        updateInnerface,
        deleteInnerface,
        restoreInnerface,
        updateProtocol,
        updateGroupMetadata,
        deleteGroup,
        context
    } = useMetadataStore();

    const { activeContext } = usePersonalityStore();
    const { showToast } = useUIStore();
    const isCoachMode = activeContext?.type === 'viewer';

    const currentInnerface = useMemo(() =>
        innerfaces.find(i => i.id.toString() === innerfaceId?.toString()),
        [innerfaces, innerfaceId]);

    // Bidirectional Protocol Sync Logic (Now SSOT from protocols)
    const initialProtocolIds = useMemo(() => {
        if (!innerfaceId) return [];
        return protocols
            .filter(p => p.targets?.some(t => t.toString() === innerfaceId.toString()))
            .map(p => p.id.toString());
    }, [protocols, innerfaceId]);

    // Form State
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [group, setGroup] = useState('');
    const [initialScore, setInitialScore] = useState('0');
    const [color, setColor] = useState('var(--main-color)');
    const [icon, setIcon] = useState('bullseye');
    const [hover, setHover] = useState('');
    const [protocolIds, setProtocolIds] = useState<string[]>([]);
    const [category, setCategory] = useState<PowerCategory>(null);
    const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');

    // Decay Settings
    const [decayEnabled, setDecayEnabled] = useState(false);
    const [decayAmount, setDecayAmount] = useState('1');
    const [decayFrequency, setDecayFrequency] = useState<'day' | 'week' | 'month'>('day');
    const [decayInterval, setDecayInterval] = useState('1'); // String for better input control

    // UI/Flow State
    // UI/Flow State
    // const [isSubmitting, setIsSubmitting] = useState(false); // Optimistic close removes need for loading state


    // Group Dropdown State
    const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false);

    // Available Groups Calculation
    const availableGroups = useMemo(() => {
        const groups = new Set<string>();
        Object.keys(groupsMetadata).forEach(g => groups.add(g));
        innerfaces.forEach(i => { if (i.group) groups.add(i.group); });
        protocols.forEach(p => { if (p.group) groups.add(p.group); });
        return Array.from(groups).sort();
    }, [groupsMetadata, innerfaces, protocols]);

    // Reset/Load Effect
    useEffect(() => {
        if (isOpen) {
            if (currentInnerface) {
                setName(currentInnerface.name);
                setDescription(currentInnerface.description || '');
                setGroup(currentInnerface.group || '');
                setInitialScore((currentInnerface.initialScore || 0).toString());
                setColor(currentInnerface.color || 'var(--main-color)');
                setIcon(currentInnerface.icon || 'bullseye');
                setHover(currentInnerface.hover || '');
                setProtocolIds(initialProtocolIds);
                setCategory(currentInnerface.category || null);
                setPriority(currentInnerface.priority || 'medium');

                if (currentInnerface.decaySettings) {
                    setDecayEnabled(currentInnerface.decaySettings.enabled);
                    // Convert DB weight (e.g. 0.01) to UI XP (e.g. 1)
                    setDecayAmount((currentInnerface.decaySettings.amount * 100).toString());
                    setDecayFrequency(currentInnerface.decaySettings.frequency);
                    setDecayInterval((currentInnerface.decaySettings.interval || 1).toString());
                } else {
                    setDecayEnabled(false);
                    setDecayAmount('1');
                    setDecayFrequency('day');
                    setDecayInterval('1');
                }
            } else {
                // Reset
                setName('');
                setDescription('');
                setGroup('');
                setInitialScore('0');
                setColor('var(--main-color)');
                setIcon('bullseye');
                setHover('');
                setProtocolIds([]);
                setCategory(null);
                setPriority('medium');
            }

            setIsGroupDropdownOpen(false);
        }
    }, [isOpen, currentInnerface, initialProtocolIds]);

    const toggleProtocol = (pId: string | number) => {
        const idStr = pId.toString();
        setProtocolIds(prev =>
            prev.includes(idStr)
                ? prev.filter(id => id !== idStr)
                : [...prev, idStr]
        );
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!name.trim()) return;

        // ✨ Instant close
        onClose();

        // No need for loading state since we closed
        // setIsSubmitting(true); 

        try {
            const innerfaceData = {
                name,
                description,
                group,
                initialScore: parseFloat(initialScore) || 0,
                color,
                icon,
                hover,

                category,
                priority,
                decaySettings: {
                    enabled: decayEnabled,
                    // Convert UI XP (e.g. 1) to DB weight (e.g. 0.01)
                    amount: (parseFloat(decayAmount) || 0) / 100,
                    frequency: decayFrequency,
                    interval: parseInt(decayInterval) || 1 // Parse string to number, default to 1
                }
            };

            let targetId: string | number = innerfaceId || '';

            // History Event Logic for Manual Score Adjustments
            if (innerfaceId && currentInnerface) {
                const oldScore = currentInnerface.initialScore || 0;
                const newScore = innerfaceData.initialScore;
                const delta = newScore - oldScore;

                if (delta !== 0 && context && (context.type === 'personality' || context.type === 'viewer')) {
                    const uid = context.type === 'personality' ? context.uid : context.targetUid;
                    const pid = context.type === 'personality' ? context.pid : context.personalityId;

                    // Fire and forget history event (don't await to block UI or other updates)
                    addCheckin(uid, pid, {
                        type: 'manual_adjustment', // Maps to 'Manual' filter
                        protocolId: 'MANUAL_ADJUST',
                        protocolName: 'Manual Score Adjustment',
                        protocolIcon: icon,
                        timestamp: new Date().toISOString(),
                        weight: delta,
                        targets: [innerfaceId],
                        changes: {
                            [innerfaceId]: delta
                        }
                    }, false).catch((err: unknown) => console.error("Failed to log manual adjustment:", err));
                }

                // Update currentScore to reflect the Base Level change
                // Since currentScore is persistent, we must shift it by the same delta
                // Calculate delta and round to avoid floating point artifacts (e.g. -0.100000000005)
                const rawDelta = innerfaceData.initialScore - (currentInnerface.initialScore || 0);
                const roundedDelta = Number(rawDelta.toFixed(4));
                if (roundedDelta !== 0) {
                    const currentVal = currentInnerface.currentScore ?? currentInnerface.initialScore ?? 0;
                    const newCurrentScore = Math.max(0, currentVal + roundedDelta);
                    Object.assign(innerfaceData, { currentScore: newCurrentScore });
                }
            }

            if (innerfaceId && currentInnerface) {
                // Update existing Innerface
                await updateInnerface(innerfaceId, innerfaceData);
            } else {
                // Create new Innerface and capture the generated ID
                targetId = await addInnerface(innerfaceData);
            }

            // Sync Protocols (SSOT: Protocol targets are the source of truth)
            // Ensure bidirectional consistency by updating Protocol documents
            if (targetId) {
                const finalProtocolIds = new Set(protocolIds.map(String));
                const protocolUpdates = protocols.map(async (p) => {
                    const isSelected = finalProtocolIds.has(p.id.toString());
                    const currentTargets = (p.targets || []).map(String);
                    const isLinked = currentTargets.includes(targetId.toString());

                    // Add linkage if selected but not yet linked
                    if (isSelected && !isLinked) {
                        await updateProtocol(p.id, {
                            targets: [...(p.targets || []), targetId]
                        });
                    }
                    // Remove linkage if deselected but currently linked
                    else if (!isSelected && isLinked) {
                        await updateProtocol(p.id, {
                            targets: (p.targets || []).filter(t => t.toString() !== targetId.toString())
                        });
                    }
                });
                await Promise.all(protocolUpdates);
            }

        } catch (error) {
            console.error('Failed to save innerface:', error);
            showToast('Failed to save skill', 'error'); // Ensure user gets feedback
        } finally {
            // setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!innerfaceId) return;


        // Save innerface copy for undo
        const innerfaceCopy = innerfaces.find(i => i.id === innerfaceId);
        if (!innerfaceCopy) return;

        // ✨ Instant close
        onClose();

        // Delete innerface
        try {
            await deleteInnerface(innerfaceId);

            // Show undo toast
            showToast(
                'Skill deleted',
                'success',
                'Undo',
                async () => {
                    await restoreInnerface(innerfaceCopy);
                }
            );
        } catch (error) {
            console.error('Failed to delete innerface:', error);
        }
    };

    // Group Metadata Helpers
    const getGroupColor = (g: string) =>
        groupsMetadata[g]?.color || getGroupConfig(g)?.color || 'var(--main-color)';

    const getGroupIcon = (g: string) =>
        groupsMetadata[g]?.icon || getGroupConfig(g)?.icon || 'brain';

    return {
        formState: {
            name, setName,
            description, setDescription,
            group, setGroup,
            initialScore, setInitialScore,
            color, setColor,
            icon, setIcon,
            hover, setHover,
            protocolIds, setProtocolIds,
            category, setCategory,
            priority, setPriority,
            decayEnabled, setDecayEnabled,
            decayAmount, setDecayAmount,
            decayFrequency, setDecayFrequency,
            decayInterval, setDecayInterval // NEW: expose interval state
        },
        uiState: {
            // isSubmitting,

            isGroupDropdownOpen, setIsGroupDropdownOpen,
            isCoachMode
        },
        data: {
            availableGroups,
            protocols, // Passed for EntitySelector
            groupsMetadata
        },
        handlers: {
            handleSubmit,
            handleDelete,
            handleDeleteGroup: deleteGroup,
            toggleProtocol,
            updateGroupMetadata
        },
        utils: {
            getGroupColor,
            getGroupIcon
        }
    };
}
