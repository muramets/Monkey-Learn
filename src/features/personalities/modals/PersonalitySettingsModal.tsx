import { Modal } from '../../../components/ui/molecules/Modal';
import { Input } from '../../../components/ui/molecules/Input';
import { Button } from '../../../components/ui/atoms/Button';
import { Avatar } from '../../../components/ui/atoms/Avatar';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faExclamationTriangle, faUser } from '@fortawesome/free-solid-svg-icons';
import { ColorPicker } from '../../../components/ui/molecules/ColorPicker';
import { ImageCropper } from '../../../components/ui/molecules/ImageCropper';
import { usePersonalityForm } from '../hooks/usePersonalityForm';

// Moved outside to avoid recreating on each render
const InputLabel = ({ label }: { label: string }) => (
    <label className="text-[10px] text-main font-mono font-bold uppercase tracking-[0.2em] opacity-90 px-1">
        {label}
    </label>
);

interface PersonalitySettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    personalityId: string | null;
}

export function PersonalitySettingsModal({ isOpen, onClose, personalityId }: PersonalitySettingsModalProps) {
    const {
        formState,
        uiState,
        refs,
        handlers
    } = usePersonalityForm({ personalityId, onClose, isOpen });

    const {
        name, setName,
        description, setDescription,
        color, setColor,
        avatar, setAvatar,
    } = formState;

    const {
        isConfirmingDelete,
        isCropping,
        tempImage,
        isSubmitting
    } = uiState;

    const { fileInputRef } = refs;

    const {
        handleSubmit,
        handleDelete,
        handleFileSelect,
        handleCropComplete,
        handleCancelCrop
    } = handlers;


    // If cropping, show the cropper instead of the normal form
    if (isCropping && tempImage) {
        return (
            <Modal
                isOpen={isOpen}
                onClose={handleCancelCrop}
                title="Adjust Avatar"
                className="max-w-md"
                footer={
                    <div className="flex items-center justify-end gap-3 w-full">
                        <Button
                            type="button"
                            variant="neutral"
                            size="sm"
                            onClick={handleCancelCrop}
                            className="text-[10px] uppercase tracking-wider font-bold px-4 py-2"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={() => {
                                // Trigger save from cropper - we need a ref or callback
                                const event = new CustomEvent('cropper-save');
                                document.dispatchEvent(event);
                            }}
                            className="font-bold px-6 py-2 rounded-lg text-[10px] uppercase tracking-wider shadow-[0_0_10px_rgba(226,183,20,0.2)] hover:shadow-[0_0_10px_rgba(209,208,197,0.3)] transition-shadow"
                        >
                            Save
                        </Button>
                    </div>
                }
            >
                <ImageCropper
                    imageSrc={tempImage}
                    onCrop={handleCropComplete}
                    onCancel={handleCancelCrop}
                />
            </Modal>
        );
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={personalityId ? 'Personality Settings' : 'Create Personality'}
            onSubmit={handleSubmit}
            footer={
                <>
                    {personalityId ? (
                        <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            onClick={handleDelete}
                            leftIcon={<FontAwesomeIcon icon={isConfirmingDelete ? faExclamationTriangle : faTrash} />}
                            className="text-[10px] uppercase tracking-wider font-bold px-3 py-2 transition-all duration-200"
                        >
                            {isConfirmingDelete ? 'Confirm Delete' : 'Delete'}
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
                            disabled={!name.trim() || isSubmitting}
                            isLoading={isSubmitting}
                            className="font-bold px-6 py-2 rounded-lg text-[10px] uppercase tracking-wider shadow-[0_0_10px_rgba(226,183,20,0.2)]"
                        >
                            {personalityId ? 'Save' : 'Create'}
                        </Button>
                    </div>
                </>
            }
        >
            <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto custom-scrollbar px-1">
                {/* Avatar Section - Centered and Large */}
                <div className="flex flex-col items-center gap-2">
                    <InputLabel label="Profile Picture" />
                    <div className="group relative">
                        <div
                            className="relative w-[80px] h-[80px] rounded-full bg-sub-alt cursor-pointer transition-all duration-150 shadow-lg flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-text-primary/50"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleFileSelect}
                            />

                            <Avatar
                                src={avatar}
                                alt="Avatar"
                                fallbackIcon={faUser}
                                className="w-full h-full text-sub text-3xl group-hover:brightness-110"
                            />
                        </div>

                        {/* Delete Button */}
                        {avatar && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setAvatar('');
                                }}
                                className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-error text-bg-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 hover:scale-110 shadow-md"
                                title="Remove avatar"
                            >
                                <FontAwesomeIcon icon={faTrash} className="text-[10px]" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex gap-4 items-start">
                    {/* Name (Larger width) */}
                    <div className="flex-1 flex flex-col gap-1.5">
                        <InputLabel label="Name" />
                        <Input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="e.g. Work, Gaming..."
                            autoFocus
                            required
                        />
                    </div>

                    {/* Color */}
                    <div className="w-[60px] flex flex-col gap-1.5 relative">
                        <InputLabel label="Color" />
                        <ColorPicker
                            color={color}
                            onChange={setColor}
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-1.5 w-full">
                    <InputLabel label="Description" />
                    <textarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="Brief description..."
                        className="w-full h-14 bg-sub-alt border border-transparent rounded-lg px-3 py-4 text-sm text-text-primary placeholder:text-sub font-mono focus:outline-none focus:border-white/10 focus:bg-sub transition-colors resize-none"
                    />
                </div>

                <div className="flex flex-col gap-3 w-full">
                    <div className="flex items-center justify-between">
                        <InputLabel label="Mottos" />
                        <button
                            type="button"
                            onClick={handlers.addMotto}
                            className="text-[10px] uppercase font-bold text-main hover:text-white transition-colors flex items-center gap-1"
                        >
                            <span>+ Add Motto</span>
                        </button>
                    </div>

                    <div className="flex flex-col gap-3">
                        {formState.mottos.map((mottoItem) => (
                            <div key={mottoItem.id} className="flex gap-4 items-start w-full group/motto animate-in fade-in slide-in-from-top-2 duration-300">
                                {/* Motto Textarea (Larger width) */}
                                <div className="flex-1 flex flex-col gap-1.5">
                                    <textarea
                                        value={mottoItem.text}
                                        onChange={e => {
                                            handlers.updateMotto(mottoItem.id, e.target.value);
                                            // Auto-resize
                                            e.target.style.height = 'auto'; // Reset to calculate height
                                            e.target.style.height = `${Math.max(80, e.target.scrollHeight)}px`;
                                        }}
                                        ref={(el) => {
                                            if (el) {
                                                // Initial resize on mount
                                                el.style.height = 'auto';
                                                el.style.height = `${Math.max(80, el.scrollHeight)}px`;
                                            }
                                        }}
                                        placeholder="e.g. Focus on the process..."
                                        className="w-full min-h-[80px] bg-sub-alt border border-transparent rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-sub font-mono focus:outline-none focus:border-white/10 focus:bg-sub transition-colors resize-none overflow-hidden"
                                    />
                                </div>

                                {/* Controls Container */}
                                <div className="flex flex-col gap-2 items-center w-[120px]">
                                    {/* Show Toggle */}
                                    <div className="w-full bg-sub-alt rounded-lg p-1 flex gap-1 h-[32px]">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (mottoItem.isActive) {
                                                    handlers.handleMottoToggle(mottoItem.id);
                                                }
                                            }}
                                            className={`flex-1 rounded-md text-[10px] font-mono uppercase font-bold transition-all ${!mottoItem.isActive
                                                ? 'bg-sub text-text-primary shadow-sm'
                                                : 'text-sub hover:text-text-primary'}`}
                                        >
                                            Off
                                        </button>
                                        <button
                                            type="button"
                                            disabled={!mottoItem.text.trim()}
                                            onClick={() => {
                                                if (!mottoItem.isActive && mottoItem.text.trim()) {
                                                    handlers.handleMottoToggle(mottoItem.id);
                                                    // Reset "Close for today" state so banner reappears
                                                    if (personalityId) {
                                                        localStorage.removeItem(`motto_closed_${personalityId}`);
                                                        window.dispatchEvent(new CustomEvent('personality-motto-reset', {
                                                            detail: { personalityId }
                                                        }));
                                                    }
                                                }
                                            }}
                                            className={`flex-1 rounded-md text-[10px] font-mono uppercase font-bold transition-all ${mottoItem.isActive
                                                ? 'bg-main text-black shadow-sm'
                                                : 'text-sub'
                                                } ${!mottoItem.text.trim()
                                                    ? 'opacity-50 cursor-not-allowed'
                                                    : mottoItem.isActive ? '' : 'hover:text-text-primary'
                                                }`}
                                        >
                                            On
                                        </button>
                                    </div>

                                    {/* Delete Button (only if more than 1?) Or always allowed? Plan says "Delete Button". */}
                                    <button
                                        type="button"
                                        onClick={() => handlers.deleteMotto(mottoItem.id)}
                                        className="text-[10px] uppercase font-bold text-sub hover:text-error transition-colors opacity-0 group-hover/motto:opacity-100"
                                    >
                                        <FontAwesomeIcon icon={faTrash} className="mr-1" />
                                        Remove
                                    </button>
                                </div>
                            </div>
                        ))}

                        {formState.mottos.length === 0 && (
                            <div className="text-center py-4 border-2 border-dashed border-sub-alt rounded-lg">
                                <span className="text-xs text-sub font-mono">No mottos added.</span>
                            </div>
                        )}
                    </div>
                </div>

            </div>

        </Modal >
    );
}
