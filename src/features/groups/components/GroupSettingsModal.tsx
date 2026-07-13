import { useState } from 'react';
import type { FormEvent } from 'react';
import { Modal } from '../../../components/ui/molecules/Modal';
import { Input } from '../../../components/ui/molecules/Input';
import { Button } from '../../../components/ui/atoms/Button';
import { useAuth } from '../../../contexts/AuthContext';
import { useMetadataStore } from '../../../stores/metadataStore';
import { usePersonalityStore } from '../../../stores/personalityStore';

import { getGroupConfig } from '../../../constants/common';
import { useUIStore } from '../../../stores/uiStore';
import { ColorPicker } from '../../../components/ui/molecules/ColorPicker';
import { IconPicker } from '../../../components/ui/molecules/IconPicker';
import { ConfirmButton } from '../../../components/ui/molecules/ConfirmButton';
import { DEFAULT_ENTITY_COLOR } from '../../../utils/entityColor';



interface GroupSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    groupName: string;
}

const InputLabel = ({ label }: { label: string }) => (
    <label className="text-[10px] text-main font-mono font-bold uppercase tracking-[0.2em] opacity-90 px-1">
        {label}
    </label>
);

export function GroupSettingsModal({ isOpen, onClose, groupName }: GroupSettingsModalProps) {
    const { user } = useAuth();
    const { activePersonalityId } = usePersonalityStore();
    const { updateGroupMetadata, renameGroup, deleteGroup, restoreGroup, groupsMetadata, protocols, innerfaces } = useMetadataStore();
    const { showToast } = useUIStore();

    // --- LIFTED STATE ---
    // Capture initial values for comparison
    const [initialValues] = useState(() => {
        const metadata = groupsMetadata[groupName];
        const config = getGroupConfig(groupName);
        return {
            name: groupName,
            icon: metadata?.icon || config?.icon || 'brain',
            color: metadata?.color || config?.color || DEFAULT_ENTITY_COLOR
        };
    });

    const [name, setName] = useState(initialValues.name);
    const [icon, setIcon] = useState(initialValues.icon);
    const [color, setColor] = useState(initialValues.color);

    const hasChanges =
        name.trim() !== initialValues.name ||
        icon !== initialValues.icon ||
        color !== initialValues.color;

    const handleDelete = async () => {
        // Collect backup data
        const backup = {
            name: groupName,
            metadata: groupsMetadata[groupName],
            innerfaceIds: innerfaces.filter(i => i.group === groupName).map(i => i.id.toString()),
            protocolIds: protocols.filter(p => p.group === groupName).map(p => p.id.toString())
        };

        onClose();
        try {
            await deleteGroup(groupName);
            showToast(
                'Group deleted',
                'success',
                'Undo',
                async () => {
                    await restoreGroup(backup);
                }
            );
        } catch (error) {
            console.error('Failed to delete group:', error);
            showToast('Failed to delete group', 'error');
        }
    };

    const handleSave = async (e: FormEvent) => {
        e.preventDefault();
        if (!user || !activePersonalityId) return;

        // Optimistic Close: Close immediately to prevent UI lag
        onClose();

        try {
            // 1. Rename if changed
            if (name.trim() !== groupName && name.trim() !== '') {
                await renameGroup(groupName, name.trim());
            }

            // 2. Update Metadata
            // If we renamed, the group name has changed, so we use the new name
            const targetName = name.trim() !== '' ? name.trim() : groupName;

            // Only update metadata if it actually changed
            if (icon !== initialValues.icon || color !== initialValues.color || targetName !== groupName) {
                await updateGroupMetadata(targetName, {
                    icon,
                    color
                });
            }
        } catch (error) {
            console.error("Failed to save group settings:", error);
        }
    };

    const formId = `group-settings-form-${groupName}`;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Edit Group: ${groupName}`}
            footer={
                <div className="flex items-center justify-between w-full">
                    <ConfirmButton
                        onConfirm={handleDelete}
                    />

                    <div className="flex items-center gap-2 ml-auto">
                        <Button
                            type="button"
                            variant="neutral"
                            size="sm"
                            onClick={onClose}
                            className="text-[10px] uppercase tracking-wider font-bold px-4 py-2"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            form={formId}
                            variant="primary"
                            size="sm"
                            disabled={!hasChanges}
                            className={`font-bold px-6 py-2 rounded-lg text-[10px] uppercase tracking-wider shadow-[0_0_10px_rgba(var(--main-color-rgb),0.2)] ${!hasChanges ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            Save Changes
                        </Button>
                    </div>
                </div>
            }
        >
            {isOpen && (
                <GroupSettingsForm
                    formId={formId}
                    name={name}
                    setName={setName}
                    icon={icon}
                    setIcon={setIcon}
                    color={color}
                    setColor={setColor}
                    handleSave={handleSave}
                />
            )}
        </Modal>
    );
}

interface GroupSettingsFormProps {
    formId: string;
    name: string;
    setName: (name: string) => void;
    icon: string;
    setIcon: (icon: string) => void;
    color: string;
    setColor: (color: string) => void;
    handleSave: (e: FormEvent) => void;
}

function GroupSettingsForm({
    formId,
    name,
    setName,
    icon,
    setIcon,
    color,
    setColor,
    handleSave,
}: GroupSettingsFormProps) {
    return (
        <form id={formId} onSubmit={handleSave} className="contents">
            <div className="flex flex-col gap-5 max-h-[60vh] overflow-y-auto custom-scrollbar px-1">
                {/* Name Input */}
                <div className="flex flex-col gap-1.5">
                    <InputLabel label="Group Name" />
                    <Input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="e.g. Health"
                        required
                    />
                    <p className="text-[10px] text-sub italic px-1">
                        Renaming will update all associated protocols and innerfaces.
                    </p>
                </div>

                <div className="flex gap-4">
                    {/* Color Picker */}
                    <div className="w-24 flex flex-col gap-1.5 relative">
                        <InputLabel label="Color" />
                        <ColorPicker
                            color={color}
                            onChange={setColor}
                            width="w-full"
                            height="h-[42px]"
                            align="start"
                        />
                    </div>

                    {/* Icon Input & Picker */}
                    <div className="w-24 flex flex-col gap-1.5 relative">
                        <InputLabel label="Icon" />
                        <IconPicker
                            icon={icon}
                            onChange={setIcon}
                            color={color}
                            width="w-full"
                            height="h-[42px]"
                            align="start"
                        />
                    </div>
                </div>
            </div>
        </form>
    );
}
