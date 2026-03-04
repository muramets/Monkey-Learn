/**
 * JoinTeamModal Component
 * 
 * Modal for joining a team using an invite code/link.
 * User enters or pastes the invite code, validates it,
 * and joins the team.
 */

import { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/molecules/Modal';
import { Input } from '../../../components/ui/molecules/Input';
import { Button } from '../../../components/ui/atoms/Button';
import { useAuth } from '../../../contexts/AuthContext';
import { useInviteStore } from '../../../stores/team';
import { usePersonalityStore } from '../../../stores/personalityStore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLink, faCheck, faSpinner, faExclamationCircle } from '@fortawesome/free-solid-svg-icons';
import { getIcon } from '../../../config/iconRegistry';

interface JoinTeamModalProps {
    isOpen: boolean;
    onClose: () => void;
}

// Moved outside to avoid recreating on each render
const InputLabel = ({ label }: { label: string }) => (
    <label className="text-[10px] text-main font-mono font-bold uppercase tracking-[0.2em] opacity-90 px-1">
        {label}
    </label>
);

export function JoinTeamModal({ isOpen, onClose }: JoinTeamModalProps) {
    const { user } = useAuth();
    const { getInviteInfo, joinTeam } = useInviteStore();
    const { switchPersonality } = usePersonalityStore();

    const [inviteCode, setInviteCode] = useState('');
    const [isValidating, setIsValidating] = useState(false);
    const [isJoining, setIsJoining] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [previewData, setPreviewData] = useState<{
        teamName: string;
        teamIcon?: string;
        teamColor?: string;
        roleName: string;
        roleIcon?: string;
        roleColor?: string;
    } | null>(null);

    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setInviteCode('');
            setIsValidating(false);
            setIsJoining(false);
            setError(null);
            setPreviewData(null);
        }
    }, [isOpen]);

    // Extract invite code from URL or raw input
    const extractCode = (input: string): string => {
        // Handle full URL: https://domain.com/invite/abc12xyz
        const urlMatch = input.match(/\/invite\/([a-z0-9]{8})/i);
        if (urlMatch) return urlMatch[1].toLowerCase();

        // Handle raw code
        const trimmed = input.trim().toLowerCase();
        if (/^[a-z0-9]{8}$/.test(trimmed)) return trimmed;

        return trimmed;
    };

    const handleValidate = async () => {
        const code = extractCode(inviteCode);
        if (!code || code.length !== 8) {
            setError('Please enter a valid 8-character invite code');
            return;
        }

        setIsValidating(true);
        setError(null);
        setPreviewData(null);

        try {
            const info = await getInviteInfo(code);
            if (!info) {
                setError('Invalid or expired invite code');
                return;
            }

            setPreviewData({
                teamName: info.team.name,
                teamIcon: info.team.icon,
                teamColor: info.team.iconColor,
                roleName: info.role.name,
                roleIcon: info.role.icon,
                roleColor: info.role.iconColor
            });
        } catch {
            setError('Failed to validate invite code');
        } finally {
            setIsValidating(false);
        }
    };

    const handleJoin = async () => {
        if (!user || !previewData) return;

        const code = extractCode(inviteCode);
        setIsJoining(true);
        setError(null);

        try {
            const personalityId = await joinTeam(user.uid, code);
            // Switch to the new personality
            await switchPersonality(user.uid, personalityId);
            onClose();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to join team';
            setError(message);
        } finally {
            setIsJoining(false);
        }
    };

    const teamIconDef = previewData?.teamIcon ? getIcon(previewData.teamIcon) : null;
    const roleIconDef = previewData?.roleIcon ? getIcon(previewData.roleIcon) : null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Join Team"
            footer={
                <div className="flex items-center justify-end gap-2 w-full">
                    <Button
                        type="button"
                        variant="neutral"
                        size="sm"
                        onClick={onClose}
                        className="text-[10px] uppercase tracking-wider font-bold px-4 py-2"
                    >
                        Cancel
                    </Button>
                    {previewData ? (
                        <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={handleJoin}
                            disabled={isJoining}
                            leftIcon={isJoining ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faCheck} />}
                            className="font-bold px-6 py-2 rounded-lg text-[10px] uppercase tracking-wider"
                        >
                            {isJoining ? 'Joining...' : 'Join Team'}
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={handleValidate}
                            disabled={isValidating || !inviteCode.trim()}
                            leftIcon={isValidating ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faLink} />}
                            className="font-bold px-6 py-2 rounded-lg text-[10px] uppercase tracking-wider"
                        >
                            {isValidating ? 'Checking...' : 'Validate'}
                        </Button>
                    )}
                </div>
            }
        >
            <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto custom-scrollbar px-1">
                {/* Invite Code Input */}
                <div className="flex flex-col gap-1.5">
                    <InputLabel label="Invite Code or Link" />
                    <Input
                        type="text"
                        value={inviteCode}
                        onChange={e => {
                            setInviteCode(e.target.value);
                            setError(null);
                            setPreviewData(null);
                        }}
                        placeholder="Paste invite link or enter 8-character code"
                        autoFocus
                    />
                </div>

                {/* Error Message */}
                {error && (
                    <div className="flex items-center gap-2 text-error text-sm">
                        <FontAwesomeIcon icon={faExclamationCircle} />
                        <span>{error}</span>
                    </div>
                )}

                {/* Preview Card */}
                {previewData && (
                    <div className="bg-sub-alt rounded-xl p-4 flex flex-col gap-3">
                        <span className="text-[10px] text-sub font-mono uppercase tracking-wider">
                            You're joining:
                        </span>

                        <div className="flex items-center gap-3">
                            {/* Team Icon */}
                            <div
                                className="w-10 h-10 rounded-lg bg-bg-primary flex items-center justify-center"
                                style={{ color: previewData.teamColor || 'var(--text-color)' }}
                            >
                                {teamIconDef ? (
                                    <FontAwesomeIcon icon={teamIconDef} className="text-lg" />
                                ) : (
                                    <span className="text-lg">{previewData.teamIcon || '🏢'}</span>
                                )}
                            </div>

                            <div className="flex flex-col">
                                <span className="font-semibold text-text-primary">
                                    {previewData.teamName}
                                </span>
                                <div className="flex items-center gap-1.5 text-sm text-sub">
                                    <span>as</span>
                                    {roleIconDef ? (
                                        <FontAwesomeIcon
                                            icon={roleIconDef}
                                            style={{ color: previewData.roleColor }}
                                            className="text-xs"
                                        />
                                    ) : (
                                        <span>{previewData.roleIcon || '👤'}</span>
                                    )}
                                    <span style={{ color: previewData.roleColor }}>
                                        {previewData.roleName}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}
