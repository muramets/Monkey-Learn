import { useState, useEffect, useRef, useCallback } from 'react';
import { Modal as UIModal } from '../../../components/ui/molecules/Modal';
import { Input } from '../../../components/ui/molecules/Input';
import { Button } from '../../../components/ui/atoms/Button';
import { AppIcon } from '../../../components/ui/atoms/AppIcon';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faExclamationTriangle, faLink, faCopy, faCheck } from '@fortawesome/free-solid-svg-icons';
import { useRoleForm } from '../hooks/useRoleForm';
import { ColorPicker } from '../../../components/ui/molecules/ColorPicker';
import { IconPicker } from '../../../components/ui/molecules/IconPicker';
import { EntitySelector } from '../../../components/ui/molecules/EntitySelector';
import * as Tabs from '@radix-ui/react-tabs';

interface RoleSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    teamId: string | null;
    roleId: string | null;
}

const InputLabel = ({ label }: { label: string }) => (
    <label className="text-[10px] text-main font-mono font-bold uppercase tracking-[0.2em] opacity-90 px-1">
        {label}
    </label>
);

export function RoleSettingsModal({ isOpen, onClose, teamId, roleId }: RoleSettingsModalProps) {
    const {
        formState,
        uiState,
        mergedProtocols,
        mergedInnerfaces,
        mergedStates,
        sourceContext,
        isSynced,
        handleSubmit,
        handleDelete,
        handleGenerateInvite,
        handlePersonalitySync,
        toggleItem
    } = useRoleForm({ teamId, roleId, onClose, isOpen });

    const {
        name, setName,
        description, setDescription,
        icon, setIcon,
        color, setColor,
        selectedInnerfaces,
        selectedProtocols,
        selectedStates
    } = formState;

    const {
        isConfirmingDelete,
        isLoading,
        inviteLink,
        isGeneratingInvite,
        isOwner
    } = uiState;

    const [copied, setCopied] = useState(false);
    const wasGeneratingRef = useRef(false);

    const copyInvite = useCallback(() => {
        if (inviteLink) {
            navigator.clipboard.writeText(inviteLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }, [inviteLink]);

    // Auto-copy only when invite link is generated (not when loading existing one)
    useEffect(() => {
        if (inviteLink && wasGeneratingRef.current && !isGeneratingInvite) {
            // Defer the state update (inside copyInvite) to next tick to avoid "setState in effect" warning
            setTimeout(() => copyInvite(), 0);
        }
        wasGeneratingRef.current = isGeneratingInvite;
    }, [inviteLink, isGeneratingInvite, copyInvite]);



    // Prepare EntitySelector Items
    const protocolItems = mergedProtocols.map(p => ({
        id: p.id,
        title: p.title,
        description: p.description,
        group: p.group || 'ungrouped',
        icon: <AppIcon id={p.icon} />,
        color: p.color
    }));

    const innerfaceItems = mergedInnerfaces.map(i => ({
        id: i.id,
        title: i.name,
        description: i.hover || '',
        group: i.group || 'ungrouped',
        icon: <AppIcon id={i.icon} />,
        color: i.color
    }));

    const stateItems = mergedStates.map(s => ({
        id: s.id,
        title: s.name,
        description: s.description || '',
        group: 'States',
        icon: <AppIcon id={s.icon || 'circle'} />,
        color: s.color
    }));

    return (
        <UIModal
            isOpen={isOpen}
            onClose={onClose}
            title={roleId ? 'Edit Role' : 'Create Role'}
            onSubmit={handleSubmit}
            footer={
                <>
                    {roleId ? (
                        <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            onClick={handleDelete}
                            disabled={isLoading}
                            leftIcon={<FontAwesomeIcon icon={isConfirmingDelete ? faExclamationTriangle : faTrash} />}
                            className="text-[10px] uppercase tracking-wider font-bold px-3 py-2 transition-all duration-200"
                        >
                            {isConfirmingDelete ? 'Are you sure?' : 'Delete'}
                        </Button>
                    ) : <div />}

                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="neutral"
                            size="sm"
                            onClick={onClose}
                            disabled={isLoading}
                            className="text-[10px] uppercase tracking-wider font-bold px-4 py-2"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            size="sm"
                            isLoading={isLoading}
                            className="font-bold px-6 py-2 rounded-lg text-[10px] uppercase tracking-wider shadow-[0_0_10px_rgba(226,183,20,0.2)]"
                        >
                            {roleId ? 'Update' : 'Create'}
                        </Button>
                    </div>
                </>
            }
        >
            <div className="flex flex-col gap-6 max-h-[70vh] overflow-y-auto custom-scrollbar px-1">
                {/* Basic Info */}
                <div className="flex flex-col gap-5">
                    <div className="flex gap-4">
                        <div className="flex-1 flex flex-col gap-1.5">
                            <InputLabel label="Role Name" />
                            <Input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="e.g. Healer, Tank, Scout..."
                                required
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <InputLabel label="Description" />
                        <Input
                            type="text"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Brief description of the role's purpose..."
                        />
                    </div>

                    <div className="flex gap-4">
                        <div className="flex-1 flex flex-col gap-1.5 relative">
                            <InputLabel label="Color" />
                            <ColorPicker
                                color={color}
                                onChange={setColor}
                            />
                        </div>
                        <div className="flex-1 flex flex-col gap-1.5 relative">
                            <InputLabel label="Icon" />
                            <IconPicker
                                icon={icon}
                                onChange={setIcon}
                                color={color}
                                width="w-full"
                            />
                        </div>
                    </div>
                </div>



                {/* Template Configuration */}
                <div className="flex flex-col gap-3 pt-2 border-t border-white/10">
                    <div className="flex flex-col gap-3">
                        <InputLabel label="Role Template" />

                        {/* Source Info */}
                        {sourceContext && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-sub-alt/30 rounded-lg">
                                <div
                                    className="w-1.5 h-1.5 rounded-full"
                                    style={{ backgroundColor: sourceContext.color }}
                                />
                                <span className="text-[10px] uppercase font-bold tracking-wider text-sub">
                                    Source: {sourceContext.name}
                                </span>
                            </div>
                        )}

                        {/* Sync Button */}
                        <Button
                            type="button"
                            variant={isSynced ? "primary" : "secondary"}
                            size="sm"
                            onClick={handlePersonalitySync}
                            className="w-full justify-center"
                        >
                            {isSynced ? 'Synced All' : 'Sync All'}
                        </Button>
                    </div>

                    <Tabs.Root defaultValue="protocols" className="flex flex-col gap-4">
                        <Tabs.List className="flex gap-2 p-1 bg-sub-alt/50 rounded-lg border border-white/5">
                            {['protocols', 'innerfaces', 'states'].map(tab => (
                                <Tabs.Trigger
                                    key={tab}
                                    value={tab}
                                    className="flex-1 px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-sub rounded-md transition-all data-[state=active]:bg-main data-[state=active]:text-bg-primary data-[state=active]:font-bold data-[state=active]:shadow-lg hover:text-text-primary outline-none"
                                >
                                    {tab}
                                </Tabs.Trigger>
                            ))}
                        </Tabs.List>

                        <Tabs.Content value="protocols" className="outline-none">
                            <EntitySelector
                                items={protocolItems}
                                selectedIds={selectedProtocols}
                                onToggle={(id) => toggleItem(id, 'protocols')}
                                searchPlaceholder="Search protocols..."
                                emptyMessage="No protocols found"
                                height="h-[300px]"
                            />
                        </Tabs.Content>

                        <Tabs.Content value="innerfaces" className="outline-none">
                            <EntitySelector
                                items={innerfaceItems}
                                selectedIds={selectedInnerfaces}
                                onToggle={(id) => toggleItem(id, 'innerfaces')}
                                searchPlaceholder="Search innerfaces..."
                                emptyMessage="No innerfaces found"
                                height="h-[300px]"
                            />
                        </Tabs.Content>

                        <Tabs.Content value="states" className="outline-none">
                            <EntitySelector
                                items={stateItems}
                                selectedIds={selectedStates}
                                onToggle={(id) => toggleItem(id, 'states')}
                                searchPlaceholder="Search states..."
                                emptyMessage="No states found"
                                height="h-[300px]"
                            />
                        </Tabs.Content>
                    </Tabs.Root>
                </div>

                {/* Invite Link Section (Only for existing roles and owners) */}
                {roleId && isOwner && (
                    <div className="flex flex-col gap-3 pt-4 border-t border-white/10">
                        <div className="flex items-center justify-between">
                            <InputLabel label="Invite Link" />
                            {inviteLink && (
                                <button
                                    type="button"
                                    onClick={copyInvite}
                                    className="text-[10px] text-main hover:text-white transition-colors flex items-center gap-1.5"
                                >
                                    <FontAwesomeIcon icon={copied ? faCheck : faCopy} />
                                    <span>{copied ? 'Copied' : 'Copy'}</span>
                                </button>
                            )}
                        </div>

                        {inviteLink ? (
                            <Input
                                type="text"
                                value={inviteLink}
                                readOnly
                                className="font-mono text-xs"
                            />
                        ) : (
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={handleGenerateInvite}
                                isLoading={isGeneratingInvite}
                                leftIcon={<FontAwesomeIcon icon={faLink} />}
                                className="w-full justify-center"
                            >
                                Generate Invite Link
                            </Button>
                        )}
                        <p className="text-sm text-sub font-mono">
                            Share this link to invite users directly to this role.
                        </p>
                    </div>
                )}
            </div>
        </UIModal>
    );
}
