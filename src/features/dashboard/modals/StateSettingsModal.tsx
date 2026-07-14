
import { Modal } from '../../../components/ui/molecules/Modal';
import { Input } from '../../../components/ui/molecules/Input';
import { Button } from '../../../components/ui/atoms/Button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { useStateForm } from '../hooks/useStateForm';
import { ColorPicker } from '../../../components/ui/molecules/ColorPicker';
import { IconPicker } from '../../../components/ui/molecules/IconPicker';
import { EntitySelector } from '../../../components/ui/molecules/EntitySelector';
import { AppIcon } from '../../../components/ui/atoms/AppIcon';

interface StateSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    stateId?: string | null;
}

const InputLabel = ({ label }: { label: string }) => (
    <label className="text-[10px] text-main font-mono font-bold uppercase tracking-[0.2em] opacity-90 px-1">
        {label}
    </label>
);

export function StateSettingsModal({ isOpen, onClose, stateId }: StateSettingsModalProps) {
    const {
        formState,
        uiState,
        data,
        handlers
    } = useStateForm({ stateId, onClose, isOpen });

    const {
        name, setName,
        description, setDescription,
        icon, setIcon,
        color, setColor,
        innerfaceIds
    } = formState;

    const {
        isConfirmingDelete
    } = uiState;

    const { innerfaces } = data;
    const { handleSubmit, handleDelete, toggleInnerface } = handlers;

    // Prepare items for EntitySelector
    // Prepare items for EntitySelector
    const innerfaceItems = innerfaces
        .map(i => ({
            id: i.id,
            title: i.name,
            description: i.hover || '',
            group: i.group || 'ungrouped',
            icon: <AppIcon id={i.icon} />,
            color: i.color,
            isDeleted: !!i.deletedAt
        }));

    const innerfaceIdsSet = new Set(innerfaceIds.map(id => id.toString()));

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={stateId ? 'Edit Door' : 'Add Door'}
            onSubmit={handleSubmit}
            footer={
                <>
                    {stateId ? (
                        <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            onClick={handleDelete}
                            leftIcon={<FontAwesomeIcon icon={isConfirmingDelete ? faExclamationTriangle : faTrash} />}
                            className="text-[10px] uppercase tracking-wider font-bold px-3 py-2 transition-colors duration-200"
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
                            className="text-[10px] uppercase tracking-wider font-bold px-4 py-2"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            size="sm"
                            className="font-bold px-6 py-2 rounded-lg text-[10px] uppercase tracking-wider shadow-[0_0_10px_rgba(202,71,84,0.2)]"
                        >
                            {stateId ? 'Update' : 'Create'}
                        </Button>
                    </div>
                </>
            }
        >
            <div className="flex flex-col gap-5 max-h-[60vh] overflow-y-auto custom-scrollbar px-1">
                <div className="flex flex-col gap-1.5">
                    <InputLabel label="Name" />
                    <Input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="e.g. Harmony"
                        required
                    />
                </div>

                <div className="flex flex-col gap-1.5">
                    <InputLabel label="Description" />
                    <Input
                        type="text"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="e.g. You're in the right place"
                    />
                </div>

                <div className="flex flex-col gap-1.5">
                    <InputLabel label="Quick Note" />
                    <Input
                        type="text"
                        value={formState.hover}
                        onChange={e => formState.setHover(e.target.value)}
                        placeholder="e.g. Focus on mindfulness"
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

                {/* Composition Area */}
                <div className="flex flex-col gap-2">
                    <InputLabel label="Composition (Skills)" />

                    <EntitySelector
                        items={innerfaceItems}
                        selectedIds={innerfaceIdsSet}
                        onToggle={toggleInnerface}
                        searchPlaceholder="Search skills..."
                        emptyMessage="Created skills will be visible here"
                        height="h-[300px]"
                    />
                </div>
            </div>
        </Modal>
    );
}
