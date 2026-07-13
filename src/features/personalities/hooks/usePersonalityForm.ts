import { useState, useEffect, useRef } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { usePersonalityStore } from '../../../stores/personalityStore';
import { uploadAvatar } from '../../../utils/storageUtils';
import { resizeImage } from '../../../utils/imageUtils';
import type { Motto } from '../../../types/personality';
import { DEFAULT_ENTITY_COLOR } from '../../../utils/entityColor';


interface UsePersonalityFormProps {
    personalityId: string | null;
    onClose: () => void;
    isOpen: boolean;
}

export function usePersonalityForm({ personalityId, onClose, isOpen }: UsePersonalityFormProps) {
    const { user } = useAuth();
    const { personalities, updatePersonality, deletePersonality, addPersonality, switchPersonality } = usePersonalityStore();

    // Form State
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [icon, setIcon] = useState('user');
    const [color, setColor] = useState(DEFAULT_ENTITY_COLOR);
    const [avatar, setAvatar] = useState('');
    const [mottos, setMottos] = useState<Motto[]>([]);

    // UI State
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
    const [tempImage, setTempImage] = useState<string | null>(null);
    const [isCropping, setIsCropping] = useState(false);
    const [avatarFile, setAvatarFile] = useState<Blob | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initialize/Reset Form
    const prevIsOpen = useRef(isOpen);
    const prevId = useRef(personalityId);

    // Initialize/Reset Form
    useEffect(() => {
        const hasOpened = isOpen && !prevIsOpen.current;
        const idChanged = personalityId !== prevId.current;

        if (isOpen && (hasOpened || idChanged)) {
            if (personalityId) {
                const p = personalities.find(p => p.id === personalityId);
                if (p) {
                    setName(p.name);
                    setDescription(p.description || '');
                    setIcon(p.icon || 'user');
                    setColor(p.iconColor || DEFAULT_ENTITY_COLOR);
                    setAvatar(p.avatar || '');

                    // Migration Logic: String -> Array
                    if (p.mottos && p.mottos.length > 0) {
                        setMottos(p.mottos);
                    } else if (p.motto) {
                        // Migrate legacy motto to first item
                        setMottos([{
                            id: Date.now().toString(),
                            text: p.motto,
                            isActive: p.showMotto || false
                        }]);
                    } else {
                        setMottos([]);
                    }
                }
            } else {
                // New Mode
                setName('');
                setDescription('');
                setIcon('user');
                setColor(DEFAULT_ENTITY_COLOR);
                setAvatar('');
                setMottos([]);
            }
            setIsConfirmingDelete(false);
            setTempImage(null);
            setIsCropping(false);
            setAvatarFile(null);
        }

        prevIsOpen.current = isOpen;
        prevId.current = personalityId;
    }, [isOpen, personalityId, personalities]);

    // Motto Handlers
    const addMotto = () => {
        setMottos([...mottos, {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            text: '',
            isActive: false
        }]);
    };

    const updateMotto = (id: string, text: string) => {
        setMottos(mottos.map(m => m.id === id ? { ...m, text } : m));
    };

    const deleteMotto = (id: string) => {
        setMottos(mottos.filter(m => m.id !== id));
    };

    // Simplified Toggle Logic
    const handleMottoToggle = (id: string) => {
        setMottos(prev => {
            const target = prev.find(m => m.id === id);
            if (!target) return prev;

            const willBeActive = !target.isActive;

            return prev.map(m => {
                if (m.id === id) {
                    return { ...m, isActive: willBeActive };
                }
                // If we are activating a new one, all others must be false
                if (willBeActive) {
                    return { ...m, isActive: false };
                }
                // If we differ deactivating, others remain as they were (which should be false anyway if only 1 allowed)
                return m;
            });
        });
    };


    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!user || !name.trim()) return;

        setIsSubmitting(true);
        try {
            let finalAvatarUrl = avatar;

            // If we have a new file to upload
            if (avatarFile) {
                // Upload to Storage
                finalAvatarUrl = await uploadAvatar(user.uid, avatarFile);
            }

            // Determine legacy fields for backward compatibility (optional, but good for safety)
            const activeMotto = mottos.find(m => m.isActive);

            const data = {
                name,
                description,
                icon,
                iconColor: color,
                avatar: finalAvatarUrl,
                mottos,
                // Legacy sync
                motto: activeMotto ? activeMotto.text : (mottos.length > 0 ? mottos[0].text : ''),
                showMotto: !!activeMotto
            };

            if (personalityId) {
                await updatePersonality(user.uid, personalityId, data);
            } else {
                const newId = await addPersonality(user.uid, name, data);
                await switchPersonality(user.uid, newId);
            }
            onClose();
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!personalityId || !user) return;

        if (!isConfirmingDelete) {
            setIsConfirmingDelete(true);
            setTimeout(() => setIsConfirmingDelete(false), 3000);
            return;
        }

        await deletePersonality(user.uid, personalityId);
        onClose();
    };

    const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = () => {
                setTempImage(reader.result as string);
                setIsCropping(true);
            };
            reader.readAsDataURL(file);
            // Reset input so same file can be selected again
            e.target.value = '';
        }
    };

    const handleCropComplete = async (croppedImage: string) => {
        // Update UI preview immediately
        setAvatar(croppedImage);

        // Prepare file blob for storage upload
        const res = await fetch(croppedImage);
        const blob = await res.blob();

        // Resize image before setting it for upload (max 512x512)
        try {
            const resizedBlob = await resizeImage(blob, 512, 512);
            setAvatarFile(resizedBlob);
        } catch (error) {
            console.error('Failed to resize image:', error);
            // Fallback to original blob if resize fails
            setAvatarFile(blob);
        }

        setIsCropping(false);
        setTempImage(null);
    };

    const handleCancelCrop = () => {
        setIsCropping(false);
        setTempImage(null);
    };

    return {
        formState: {
            name, setName,
            description, setDescription,
            icon, setIcon,
            color, setColor,
            avatar, setAvatar,
            mottos, setMottos
        },
        uiState: {
            isConfirmingDelete,
            isCropping,
            tempImage,
            isSubmitting
        },
        refs: {
            fileInputRef
        },
        handlers: {
            handleSubmit,
            handleDelete,
            handleFileSelect,
            handleCropComplete,
            handleCancelCrop,
            addMotto,
            updateMotto,
            deleteMotto,
            handleMottoToggle
        }
    };
}
