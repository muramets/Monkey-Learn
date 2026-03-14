import { useState, useMemo, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faThumbtack, faCheck } from '@fortawesome/free-solid-svg-icons';
import { useMetadataStore } from '../../../stores/metadataStore';
import { AppIcon } from '../../../components/ui/atoms/AppIcon';
import { Input } from '../../../components/ui/molecules/Input';
import { Button } from '../../../components/ui/atoms/Button';
import { Modal } from '../../../components/ui/molecules/Modal';
import { CollapsibleSection } from '../../../components/ui/molecules/CollapsibleSection';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../components/ui/atoms/Tooltip';

interface AddQuickActionModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AddQuickActionModal({ isOpen, onClose }: AddQuickActionModalProps) {
    // const { user } = useAuth(); // Unused
    const { protocols, pinnedProtocolIds, togglePinnedProtocol } = useMetadataStore();
    // const { activePersonalityId } = usePersonalityStore(); // Unused
    const [searchQuery, setSearchQuery] = useState('');

    const filteredProtocols = useMemo(() => {
        const activeDefaults = protocols.filter(p => !p.deletedAt);
        if (!searchQuery.trim()) return activeDefaults;
        return activeDefaults.filter(p =>
            p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.group?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [protocols, searchQuery]);

    const handleTogglePin = (protocolId: string | number) => {
        togglePinnedProtocol(protocolId.toString());
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Add Quick Action"
            className="!bg-bg-primary"
        >
            <div className="flex flex-col max-h-[60vh]">
                <p className="text-sm text-sub font-mono -mt-2 mb-4">Pin your most used actions for quick access.</p>

                {/* Search */}
                {protocols.length > 0 && (
                    <div className="bg-bg-primary pt-1 pb-3">
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search actions..."
                            icon={faSearch}
                            fullWidth
                            autoFocus
                            className="!bg-transparent !border-sub-alt/20 focus:!border-sub-alt/50"
                        />
                    </div>
                )}

                {/* List */}
                <div
                    className="overflow-y-auto flex-1 space-y-4 custom-scrollbar pr-1 pb-2"
                    style={{ transform: 'translateZ(0)' }}
                >
                    {protocols.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-sub font-mono text-sm">
                            Created actions will appear here
                        </div>
                    ) : filteredProtocols.length === 0 ? (
                        <div className="py-12 text-center text-sub font-mono text-sm italic">
                            No matching actions found
                        </div>
                    ) : (
                        (() => {
                            // Group protocols
                            const groups: Record<string, typeof protocols> = {};
                            const noGroup: typeof protocols = [];

                            filteredProtocols.forEach(p => {
                                if (p.group) {
                                    if (!groups[p.group]) groups[p.group] = [];
                                    groups[p.group].push(p);
                                } else {
                                    noGroup.push(p);
                                }
                            });

                            const sortedGroupNames = Object.keys(groups).sort();

                            return (
                                <>
                                    {/* Render Groups */}
                                    {sortedGroupNames.map(groupName => (
                                        <CollapsibleSection
                                            key={groupName}
                                            title={<span className="text-sm font-mono font-bold text-sub uppercase tracking-wider">{groupName}</span>}
                                            defaultOpen={true}
                                        >
                                            <div className="flex flex-col gap-2">
                                                {groups[groupName].map(protocol => (
                                                    <ProtocolItem
                                                        key={protocol.id}
                                                        protocol={protocol}
                                                        isPinned={pinnedProtocolIds.includes(protocol.id.toString())}
                                                        onToggle={() => handleTogglePin(protocol.id)}
                                                    />
                                                ))}
                                            </div>
                                        </CollapsibleSection>
                                    ))}

                                    {/* Render No Group */}
                                    {noGroup.length > 0 && (
                                        <CollapsibleSection
                                            title={<span className="text-sm font-mono font-bold text-sub uppercase tracking-wider">Uncategorized</span>}
                                            defaultOpen={true}
                                        >
                                            <div className="flex flex-col gap-2">
                                                {noGroup.map(protocol => (
                                                    <ProtocolItem
                                                        key={protocol.id}
                                                        protocol={protocol}
                                                        isPinned={pinnedProtocolIds.includes(protocol.id.toString())}
                                                        onToggle={() => handleTogglePin(protocol.id)}
                                                    />
                                                ))}
                                            </div>
                                        </CollapsibleSection>
                                    )}
                                </>
                            );
                        })()
                    )}
                </div>

                {/* Footer - Moved inside to control spacing/separator interaction */}
                <div className="w-full pt-4 mt-2 border-t border-white/5 text-xs text-sub text-center font-mono">
                    Selected actions will appear on your dashboard.
                </div>
            </div>
        </Modal>
    );
}


// Helper Component for Truncated Text
const TruncatedText = ({ text, className }: { text: string; className?: string }) => {
    const textRef = useRef<HTMLDivElement>(null);
    const [isTruncated, setIsTruncated] = useState(false);

    useEffect(() => {
        const checkTruncation = () => {
            if (textRef.current) {
                setIsTruncated(textRef.current.scrollWidth > textRef.current.clientWidth);
            }
        };

        checkTruncation();
        window.addEventListener('resize', checkTruncation);
        return () => window.removeEventListener('resize', checkTruncation);
    }, [text]);

    const content = (
        <div ref={textRef} className={className}>
            {text}
        </div>
    );

    if (!isTruncated) return content;

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                {content}
            </TooltipTrigger>
            <TooltipContent side="bottom" align="start" className="pointer-events-none">
                <span className="font-mono text-xs max-w-[200px] block">
                    {text}
                </span>
            </TooltipContent>
        </Tooltip>
    );
};

import type { Protocol } from '../../protocols/types';

// Helper Component for Item Rendering
function ProtocolItem({ protocol, isPinned, onToggle }: { protocol: Protocol, isPinned: boolean, onToggle: () => void }) {
    const baseColor = protocol.color || 'var(--correct-color)';

    return (
        <div
            className={`flex items-center justify-between p-3 rounded-xl transition-colors group border ${isPinned
                ? 'bg-sub-alt border-transparent'
                : 'hover:bg-sub-alt border-transparent'
                }`}
        >
            {/* Left: Icon + Info */}
            <div className="flex items-center gap-4 min-w-0">
                {/* Icon Box */}
                <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shadow-sm"
                    style={{
                        backgroundColor: `color-mix(in srgb, ${baseColor} 8%, transparent)`,
                        color: baseColor
                    }}
                >
                    <span className="flex items-center justify-center opacity-90 text-sm">
                        <AppIcon id={protocol.icon} />
                    </span>
                </div>

                {/* Text Info */}
                <div className="flex flex-col min-w-0 gap-0.5">
                    <div className="flex items-center gap-2">
                        <span className={`font-bold font-mono text-sm tracking-tight ${isPinned ? 'text-main' : 'text-text-primary'}`}>
                            {protocol.title}
                        </span>
                    </div>
                    <TruncatedText
                        text={protocol.description || "No description"}
                        className="text-[10px] text-sub truncate font-mono cursor-default max-w-[200px]"
                    />
                </div>
            </div>

            {/* Right: Action Button */}
            <Button
                type="button"
                size="sm"
                onClick={onToggle}
                variant="primary"
                className={`min-w-[80px] h-[32px] text-[10px] uppercase font-bold tracking-wider transition-[opacity,transform] duration-200 !focus:ring-0 !focus:outline-none ${!isPinned && 'opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0'
                    }`}
                leftIcon={<FontAwesomeIcon icon={isPinned ? faCheck : faThumbtack} />}
            >
                {isPinned ? 'Added' : 'Add'}
            </Button>
        </div>
    );
}
