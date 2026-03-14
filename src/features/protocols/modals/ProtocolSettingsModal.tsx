import React, { Suspense } from 'react';
import { Modal } from '../../../components/ui/molecules/Modal';
import { Input } from '../../../components/ui/molecules/Input';
import { Button } from '../../../components/ui/atoms/Button';
import { ConfirmButton } from '../../../components/ui/molecules/ConfirmButton';
import { AppIcon } from '../../../components/ui/atoms/AppIcon';

import { useProtocolForm } from '../hooks/useProtocolForm';
import { ColorPicker } from '../../../components/ui/molecules/ColorPicker';
import { IconPicker } from '../../../components/ui/molecules/IconPicker';
import { EntitySelector } from '../../../components/ui/molecules/EntitySelector';
import { ProtocolGroupSelector } from '../components/ProtocolGroupSelector';
import { ProtocolXpSelector } from '../components/ProtocolXpSelector';
import { ProtocolInstructionInput } from '../components/ProtocolInstructionInput';

const RichTextEditor = React.lazy(() =>
    import('../../../components/ui/RichTextEditor/RichTextEditor').then(m => ({ default: m.RichTextEditor }))
);

interface ProtocolSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    protocolId?: number | string | null;
}

const InputLabel = ({ label }: { label: string }) => (
    <label className="text-[10px] text-main font-mono font-bold uppercase tracking-[0.2em] opacity-90 px-1">
        {label}
    </label>
);

export function ProtocolSettingsModal({ isOpen, onClose, protocolId }: ProtocolSettingsModalProps) {
    // Custom hook to manage the form state and logic for creating/editing protocols
    const {
        formState,
        availableGroups,
        innerfaces,
        groupsMetadata,
        handleSubmit,
        handleDelete,
        handleUpdateGroupMetadata
    } = useProtocolForm({ protocolId, onClose, isOpen });

    const {
        title, setTitle,
        description, setDescription,
        hover, setHover,
        group, setGroup,
        icon, setIcon,
        xp, setXp,
        targets, setTargets,
        color, setColor,
        instruction, setInstruction,
        hasInstruction, setHasInstruction
    } = formState;

    const onToggleTarget = (id: string) => {
        // Simple toggle logic matching the original:
        const existing = targets.find(t => t.toString() === id);
        if (existing) {
            setTargets(prev => prev.filter(t => t.toString() !== id));
        } else {
            const innerface = innerfaces.find(i => i.id.toString() === id);
            if (innerface) {
                setTargets(prev => [...prev, innerface.id]);
            }
        }
    };

    const entitySelectItems = innerfaces
        .map(i => ({
            id: i.id.toString(),
            title: i.name,
            description: i.description,
            quickNote: i.hover,
            group: i.group,
            icon: <AppIcon id={i.icon} />,
            color: i.color,
            isDeleted: !!i.deletedAt
        }));


    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={protocolId ? 'Edit Action' : 'Add Action'}
            onSubmit={handleSubmit}
            footer={
                <>
                    {protocolId ? (
                        <ConfirmButton
                            onConfirm={handleDelete}
                        />
                    ) : <div />}

                    <div className="flex items-center gap-2">
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
                            variant="primary"
                            size="sm"
                            className="font-bold px-6 py-2 rounded-lg text-[10px] uppercase tracking-wider shadow-[0_0_10px_rgba(226,183,20,0.2)]"
                        >
                            {protocolId ? 'Update' : 'Create'}
                        </Button>
                    </div>
                </>
            }
        >
            <div className="flex flex-col gap-5 max-h-[60vh] overflow-y-auto custom-scrollbar overscroll-contain px-1">
                <div className="flex flex-col gap-1.5">
                    <InputLabel label="Title" />
                    <Input
                        type="text"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="e.g. Morning Meditation"
                        required
                    />
                </div>

                <div className="flex flex-col gap-1.5">
                    <InputLabel label="Description" />
                    <Input
                        type="text"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="e.g. 10 minutes of mindfulness"
                    />
                </div>

                <div className="flex gap-4">
                    <div className="flex-1 flex flex-col gap-1.5 relative">
                        <InputLabel label="Color" />
                        <ColorPicker
                            color={color}
                            onChange={setColor}
                            width="w-full"
                            height="h-[42px]"
                        />
                    </div>
                    <div className="flex-1 flex flex-col gap-1.5 relative">
                        <InputLabel label="Icon" />
                        <IconPicker
                            icon={icon}
                            onChange={setIcon}
                            color={color}
                            width="w-full"
                            height="h-[42px]"
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-1.5">
                    <InputLabel label="Quick Note" />
                    <Suspense fallback={<div className="h-32 animate-pulse bg-sub-alt/50 rounded-lg" />}>
                        <RichTextEditor
                            value={hover}
                            onChange={setHover}
                            placeholder="Short note shown on tap/hover..."
                            className="min-h-[100px] max-h-[300px] overflow-hidden"
                        />
                    </Suspense>
                </div>

                <ProtocolInstructionInput
                    instruction={instruction}
                    setInstruction={setInstruction}
                    hasInstruction={hasInstruction}
                    setHasInstruction={setHasInstruction}
                />

                {/* Group Selector */}
                <ProtocolGroupSelector
                    group={group}
                    setGroup={setGroup}
                    availableGroups={availableGroups}
                    groupsMetadata={groupsMetadata}
                    onUpdateMetadata={handleUpdateGroupMetadata}

                />

                <div className="flex flex-col gap-5">
                    {/* XP Reward Selector */}
                    <ProtocolXpSelector xp={xp} onChange={setXp} />
                </div>

                <div className="flex flex-col gap-2">
                    <InputLabel label="Affects Powers" />
                    <EntitySelector
                        items={entitySelectItems}
                        selectedIds={new Set(targets.map(t => t.toString()))}
                        onToggle={onToggleTarget}
                        searchPlaceholder="Search powers..."
                        emptyMessage="Created powers will be visible here"
                        height="h-[300px]"
                    />
                </div>
            </div>
        </Modal >
    );
}
