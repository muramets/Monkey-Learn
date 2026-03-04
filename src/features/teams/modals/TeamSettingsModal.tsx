/**
 * TeamSettingsModal Component
 * 
 * Modal for creating/editing team settings (name, icon, color).
 * Includes members list view and delete functionality for owners.
 */

import { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/molecules/Modal';
import { Input } from '../../../components/ui/molecules/Input';
import { Button } from '../../../components/ui/atoms/Button';
import { useAuth } from '../../../contexts/AuthContext';
import { useTeamStore } from '../../../stores/team';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faExclamationTriangle, faUsers } from '@fortawesome/free-solid-svg-icons';
import { ColorPicker } from '../../../components/ui/molecules/ColorPicker';
import { IconPicker } from '../../../components/ui/molecules/IconPicker';
import { getIcon } from '../../../config/iconRegistry';

interface TeamSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    teamId: string | null;
}

// Moved outside to avoid recreating on each render
const InputLabel = ({ label }: { label: string }) => (
    <label className="text-[10px] text-main font-mono font-bold uppercase tracking-[0.2em] opacity-90 px-1">
        {label}
    </label>
);

export function TeamSettingsModal({ isOpen, onClose, teamId }: TeamSettingsModalProps) {
    const { user } = useAuth();
    const { teams, createTeam, updateTeam, deleteTeam } = useTeamStore();

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [icon, setIcon] = useState('users');
    const [color, setColor] = useState('#e2b714');

    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const team = teamId ? teams.find(t => t.id === teamId) : null;
    const isOwner = team ? team.ownerId === user?.uid : true;

    useEffect(() => {
        if (isOpen && teamId && team) {
            setName(team.name);
            setDescription(team.description || '');
            setIcon(team.icon || 'users');
            setColor(team.iconColor || '#e2b714');
        } else if (isOpen && !teamId) {
            // Create mode
            setName('');
            setDescription('');
            setIcon('users');
            setColor('#e2b714');
        }
        setIsConfirmingDelete(false);
    }, [isOpen, teamId, team]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !name.trim()) return;

        setIsLoading(true);
        try {
            const data = {
                name: name.trim(),
                description: description.trim(),
                icon,
                iconColor: color
            };

            if (teamId) {
                await updateTeam(teamId, data);
            } else {
                await createTeam(user.uid, data);
            }
            onClose();
        } catch (err) {
            console.error('Failed to save team:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!teamId || !user) return;

        if (!isConfirmingDelete) {
            setIsConfirmingDelete(true);
            setTimeout(() => setIsConfirmingDelete(false), 3000);
            return;
        }

        setIsLoading(true);
        try {
            await deleteTeam(user.uid, teamId);
            onClose();
        } catch (err) {
            console.error('Failed to delete team:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const iconDef = getIcon(icon);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={teamId ? 'Team Settings' : 'Create Team'}
            onSubmit={handleSubmit}
            footer={
                <>
                    {teamId && isOwner ? (
                        <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            onClick={handleDelete}
                            disabled={isLoading}
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
                            disabled={!name.trim() || isLoading}
                            className="font-bold px-6 py-2 rounded-lg text-[10px] uppercase tracking-wider shadow-[0_0_10px_rgba(var(--main-color-rgb),0.2)]"
                        >
                            {teamId ? 'Save' : 'Create'}
                        </Button>
                    </div>
                </>
            }
        >
            <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto custom-scrollbar px-1">
                {/* Icon Preview */}
                <div className="flex flex-col items-center gap-2">
                    <div
                        className="w-[60px] h-[60px] rounded-full bg-sub-alt flex items-center justify-center shadow-lg"
                        style={{ color }}
                    >
                        {iconDef ? (
                            <FontAwesomeIcon icon={iconDef} className="text-2xl" />
                        ) : (
                            <FontAwesomeIcon icon={faUsers} className="text-2xl" />
                        )}
                    </div>
                </div>

                <div className="flex gap-4 items-start">
                    {/* Name */}
                    <div className="flex-1 flex flex-col gap-1.5">
                        <InputLabel label="Team Name" />
                        <Input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="e.g. Engineering, Marketing..."
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

                    {/* Icon Picker (New) */}
                    <div className="w-[60px] flex flex-col gap-1.5 relative">
                        <InputLabel label="Icon" />
                        <IconPicker
                            icon={icon}
                            onChange={setIcon}
                            color={color}
                            width="w-full"
                        />
                    </div>
                </div>

                {/* Description */}
                <div className="flex flex-col gap-1.5">
                    <InputLabel label="Description (Optional)" />
                    <Input
                        type="text"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="What's this team about?"
                    />
                </div>

                {/* Members Count (Edit mode only) */}
                {teamId && team && (
                    <div className="flex items-center gap-2 text-sub text-sm mt-2">
                        <FontAwesomeIcon icon={faUsers} className="text-xs opacity-60" />
                        <span>{team.memberUids.length} member{team.memberUids.length !== 1 ? 's' : ''}</span>
                    </div>
                )}
            </div>
        </Modal>
    );
}
