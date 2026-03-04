import { Modal } from '../../../components/ui/molecules/Modal';
import { Input } from '../../../components/ui/molecules/Input';
import { Button } from '../../../components/ui/atoms/Button';
import { ConfirmButton } from '../../../components/ui/molecules/ConfirmButton';

import { useInnerfaceForm } from '../hooks/useInnerfaceForm';
import { ColorPicker } from '../../../components/ui/molecules/ColorPicker';
import { IconPicker } from '../../../components/ui/molecules/IconPicker';
import { EntitySelector } from '../../../components/ui/molecules/EntitySelector';
import { AppIcon } from '../../../components/ui/atoms/AppIcon';
import { InnerfaceGroupSelector } from '../components/InnerfaceGroupSelector';
import { PowerIcon } from '../components/PowerIcon';
import { RichTextEditor } from '../../../components/ui/RichTextEditor';

interface InnerfaceSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    innerfaceId?: number | string | null;
}

const InputLabel = ({ label }: { label: string }) => (
    <label className="text-[10px] text-main font-mono font-bold uppercase tracking-[0.2em] opacity-90 px-1">
        {label}
    </label>
);

export function InnerfaceSettingsModal({ isOpen, onClose, innerfaceId }: InnerfaceSettingsModalProps) {
    const {
        formState,
        uiState,
        data,
        handlers,
    } = useInnerfaceForm({ innerfaceId, onClose, isOpen });

    const {
        name, setName,
        description, setDescription,
        group, setGroup,
        initialScore, setInitialScore,
        color, setColor,
        icon, setIcon,
        hover, setHover,
        protocolIds,

        category, setCategory,
        priority, setPriority, // NEW: Priority State
        decayEnabled, setDecayEnabled,
        decayAmount, setDecayAmount,
        decayFrequency, setDecayFrequency,
        decayInterval, setDecayInterval // NEW: interval state
    } = formState;

    const {
        isCoachMode
    } = uiState;

    const { availableGroups, protocols, groupsMetadata } = data;
    const { handleSubmit, handleDelete, toggleProtocol, updateGroupMetadata } = handlers;



    // Prepare items for EntitySelector (Actions/Protocols)
    const protocolItems = protocols.map(p => ({
        id: p.id,
        title: p.title,
        description: p.description,
        quickNote: p.hover,
        group: p.group || 'ungrouped',
        icon: <AppIcon id={p.icon} />,
        color: p.color
    }));

    const protocolIdsSet = new Set(protocolIds);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={innerfaceId ? 'Edit Power' : 'New Power'}
            onSubmit={handleSubmit}
            footer={
                <>
                    {innerfaceId && !isCoachMode ? (
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
                            {innerfaceId ? 'Update' : 'Create'}
                        </Button>
                    </div>
                </>
            }
        >
            <div
                className="flex flex-col gap-5 max-h-[60vh] overflow-y-auto custom-scrollbar overscroll-contain px-1"
                style={{ transform: 'translateZ(0)', willChange: 'transform' }}
            >
                <div className="flex flex-col gap-1.5">
                    <InputLabel label="Name" />
                    <Input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="e.g. Focus"
                        required
                    />
                </div>

                <div className="flex flex-col gap-1.5">
                    <InputLabel label="Description" />
                    <Input
                        type="text"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="e.g. Attentional control"
                    />
                </div>

                <div className="flex flex-col gap-1.5">
                    <InputLabel label="Quick Note" />
                    <RichTextEditor
                        value={hover}
                        onChange={setHover}
                        placeholder="Short note shown on tap/hover..."
                        className="min-h-[100px] max-h-[300px] overflow-hidden"
                    />
                </div>

                {/* Color & Icon Selectors */}
                <div className="flex gap-4">
                    <div className="flex-1 flex flex-col gap-1.5 relative">
                        <InputLabel label="Color" />
                        <ColorPicker
                            color={color}
                            onChange={setColor}
                            width="w-full"
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

                {/* Priority Selector */}
                <div className="flex flex-col gap-1.5">
                    <InputLabel label="Impact on your personality level" />

                    <div className="bg-sub-alt rounded-lg p-1 flex gap-1">
                        <button
                            type="button"
                            onClick={() => setPriority('low')}
                            className={`flex-1 flex flex-col items-center justify-center gap-0.5 px-2 py-3 rounded-md transition-all ${priority === 'low'
                                ? 'bg-sub/50 text-text-primary shadow-sm ring-1 ring-white/10'
                                : 'text-sub hover:bg-sub/20 hover:text-text-primary'
                                }`}
                        >
                            <span className="text-[10px] font-mono uppercase font-bold">Nice to have</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setPriority('medium')}
                            className={`flex-1 flex flex-col items-center justify-center gap-0.5 px-2 py-3 rounded-md transition-all ${priority === 'medium'
                                ? 'bg-sub text-text-primary shadow-sm ring-1 ring-white/20'
                                : 'text-sub hover:bg-sub/20 hover:text-text-primary'
                                }`}
                        >
                            <span className="text-[10px] font-mono uppercase font-bold">Standard</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setPriority('high')}
                            className={`flex-1 flex flex-col items-center justify-center gap-0.5 px-2 py-3 rounded-md transition-all ${priority === 'high'
                                ? 'bg-main text-black shadow-sm shadow-main/20'
                                : 'text-sub hover:bg-sub/20 hover:text-text-primary'
                                }`}
                        >
                            <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-mono uppercase font-bold">Must Have</span>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Category Selector */}
                <div className="flex flex-col gap-1.5">
                    <InputLabel label="Category (Optional)" />
                    <div className="flex items-center gap-3">
                        {/* Live Preview Icon */}
                        <PowerIcon
                            icon={icon}
                            color={color}
                            category={category}
                            size="w-12 h-12 text-xl"
                        />

                        {/* Category Buttons */}
                        <div className="flex-1 bg-sub-alt rounded-lg p-1 flex gap-1">
                            <button
                                type="button"
                                onClick={() => setCategory(null)}
                                className={`flex-1 px-3 py-2 rounded-md text-xs font-mono uppercase font-bold transition-all ${category === null
                                    ? 'bg-sub text-text-primary shadow-sm'
                                    : 'text-sub hover:text-text-primary'
                                    }`}
                            >
                                None
                            </button>
                            <button
                                type="button"
                                onClick={() => setCategory('skill')}
                                className={`flex-1 px-3 py-2 rounded-md text-xs font-mono uppercase font-bold transition-all ${category === 'skill'
                                    ? 'bg-sub text-text-primary shadow-sm'
                                    : 'text-sub hover:text-text-primary'
                                    }`}
                            >
                                Skill
                            </button>
                            <button
                                type="button"
                                onClick={() => setCategory('foundation')}
                                className={`flex-1 px-3 py-2 rounded-md text-xs font-mono uppercase font-bold transition-all ${category === 'foundation'
                                    ? 'bg-sub text-text-primary shadow-sm'
                                    : 'text-sub hover:text-text-primary'
                                    }`}
                            >
                                Foundation
                            </button>
                        </div>
                    </div>
                </div>

                <InnerfaceGroupSelector
                    group={group}
                    setGroup={setGroup}
                    availableGroups={availableGroups}
                    groupsMetadata={groupsMetadata}
                    onUpdateMetadata={updateGroupMetadata}

                />

                <div className="flex gap-4">
                    <div className="w-32 flex flex-col gap-1.5">
                        <InputLabel label="Base Level" />
                        <Input
                            type="number"
                            value={initialScore}
                            onChange={e => setInitialScore(e.target.value)}
                            onBlur={() => {
                                const num = parseFloat(initialScore.toString());
                                if (!isNaN(num)) {
                                    setInitialScore(num.toFixed(2));
                                }
                            }}
                            step="0.01"
                            min="0"
                            max="10"
                            className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                    </div>

                </div>

                {/* Sensitive to Inactivity */}
                <div className="flex flex-col gap-1.5">
                    <InputLabel label="Sensitive to Inactivity" />
                    <div className="flex items-center gap-3">
                        {/* Toggle Buttons */}
                        <div className="flex-1 bg-sub-alt rounded-lg p-1 flex gap-1">
                            <button
                                type="button"
                                onClick={() => setDecayEnabled(false)}
                                className={`flex-1 px-3 py-2 rounded-md text-xs font-mono uppercase font-bold transition-all ${!decayEnabled
                                    ? 'bg-sub text-text-primary shadow-sm'
                                    : 'text-sub hover:text-text-primary'
                                    }`}
                            >
                                Off
                            </button>
                            <button
                                type="button"
                                onClick={() => setDecayEnabled(true)}
                                className={`flex-1 px-3 py-2 rounded-md text-xs font-mono uppercase font-bold transition-all ${decayEnabled
                                    ? 'bg-sub text-text-primary shadow-sm'
                                    : 'text-sub hover:text-text-primary'
                                    }`}
                            >
                                On
                            </button>
                        </div>
                    </div>

                    {/* Decay Configuration (shown when enabled) */}
                    {decayEnabled && (
                        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,4fr)] gap-3 mt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="flex flex-col gap-1.5">
                                <InputLabel label="XP Decay" />
                                <Input
                                    type="number"
                                    value={decayAmount}
                                    onChange={e => setDecayAmount(e.target.value)}
                                    onBlur={() => {
                                        const num = parseFloat(decayAmount);
                                        if (!isNaN(num)) {
                                            setDecayAmount(num.toFixed(2));
                                        }
                                    }}
                                    step="0.01"
                                    min="0"
                                    placeholder="1.00"
                                    className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <InputLabel label="Frequency" />
                                <div className="flex gap-2">
                                    {/* Number Input */}
                                    <div className="flex items-center gap-2 bg-sub-alt rounded-lg px-3 py-2 shrink-0">
                                        <span className="text-xs font-mono text-sub uppercase font-bold whitespace-nowrap">Every</span>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            value={decayInterval}
                                            onChange={e => {
                                                const val = e.target.value;
                                                if (val === '' || (/^\d{0,2}$/.test(val) && parseInt(val) <= 99)) {
                                                    setDecayInterval(val);
                                                }
                                            }}
                                            onBlur={e => {
                                                const val = parseInt(e.target.value);
                                                if (isNaN(val) || val < 1) {
                                                    setDecayInterval('1');
                                                } else {
                                                    setDecayInterval(val.toString());
                                                }
                                            }}
                                            className="w-8 bg-sub rounded-md px-2 py-1 text-center font-mono text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-main/50"
                                        />
                                    </div>
                                    {/* Frequency Selector */}
                                    <div className="flex-1 min-w-0 bg-sub-alt rounded-lg p-1 grid grid-cols-3 gap-1">
                                        <button
                                            type="button"
                                            onClick={() => setDecayFrequency('day')}
                                            className={`px-2 py-1.5 rounded-md text-[10px] font-mono uppercase font-bold transition-all truncate ${decayFrequency === 'day'
                                                ? 'bg-sub text-text-primary shadow-sm'
                                                : 'text-sub hover:text-text-primary'
                                                }`}
                                        >
                                            Day{parseInt(decayInterval) > 1 ? 's' : ''}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setDecayFrequency('week')}
                                            className={`px-2 py-1.5 rounded-md text-[10px] font-mono uppercase font-bold transition-all truncate ${decayFrequency === 'week'
                                                ? 'bg-sub text-text-primary shadow-sm'
                                                : 'text-sub hover:text-text-primary'
                                                }`}
                                        >
                                            Week{parseInt(decayInterval) > 1 ? 's' : ''}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setDecayFrequency('month')}
                                            className={`px-2 py-1.5 rounded-md text-[10px] font-mono uppercase font-bold transition-all truncate ${decayFrequency === 'month'
                                                ? 'bg-sub text-text-primary shadow-sm'
                                                : 'text-sub hover:text-text-primary'
                                                }`}
                                        >
                                            Month{parseInt(decayInterval) > 1 ? 's' : ''}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-2">
                    <InputLabel label="Composition (Actions)" />
                    <EntitySelector
                        items={protocolItems}
                        selectedIds={protocolIdsSet}
                        onToggle={toggleProtocol}
                        searchPlaceholder="Search actions..."
                        emptyMessage="Created actions will be visible here"
                        height="h-[300px]"
                    />
                </div>
            </div>
        </Modal>
    );
}
