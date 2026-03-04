import { useState, useEffect, useRef, useCallback } from 'react';
import { useUIStore } from '../../../stores/uiStore';
import { useHistoryStore } from '../../../stores/historyStore';
import { useAuth } from '../../../contexts/AuthContext';
import { usePersonalityStore } from '../../../stores/personalityStore';
import { faComment } from '@fortawesome/free-solid-svg-icons';
import { createPortal } from 'react-dom';
import { Input } from '../../../components/ui/molecules/Input';

export function CommentInputOverlay() {
    const { commentOverlay, closeCommentOverlay, showToast } = useUIStore();
    const { updateCheckin } = useHistoryStore();
    const { user } = useAuth();
    const { activePersonalityId } = usePersonalityStore();

    const [comment, setComment] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    // Maintain focus aggressively while open
    useEffect(() => {
        if (commentOverlay.isOpen) {
            // Force blur any other element (like the QuickAction button) to prevent "Space" from triggering it
            if (document.activeElement && document.activeElement !== inputRef.current && document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
            }
            // Ensure focus is kept/restored on every render or update
            inputRef.current?.focus();
        }
    }); // No dependency array intended: keep focus alive

    // Initialize state on open
    useEffect(() => {
        if (commentOverlay.isOpen) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setComment(commentOverlay.initialComment || '');
        }
    }, [commentOverlay.isOpen, commentOverlay.initialComment]);

    const handleSave = useCallback(() => {
        if (!user || !activePersonalityId || !commentOverlay.checkinId) return;

        // Optimistic UI: Close overlay and show success immediately
        showToast('Comment saved', 'success');
        closeCommentOverlay();

        // Perform update in background
        updateCheckin(user.uid, activePersonalityId, commentOverlay.checkinId, {
            comment: comment.trim()
        }).catch((error) => {
            console.error('Failed to save comment:', error);
            showToast('Failed to save comment', 'error');
        });
    }, [user, activePersonalityId, commentOverlay.checkinId, comment, showToast, closeCommentOverlay, updateCheckin]);

    if (!commentOverlay.isOpen) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-300"
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    closeCommentOverlay();
                }
            }}
        >
            <div
                className="w-full max-w-[600px] mx-4 relative animate-scale-in"
                onClick={e => e.stopPropagation()}
            >
                <div className="bg-[var(--bg-color)] rounded-[var(--roundness,0.5rem)] overflow-hidden">
                    <Input
                        ref={inputRef}
                        autoFocus
                        icon={faComment}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        onKeyDown={(e) => {
                            // Handle shortcuts locally since we stop propagation
                            if (e.key === 'Escape') {
                                closeCommentOverlay();
                                e.stopPropagation();
                                return;
                            }
                            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                handleSave();
                                e.stopPropagation();
                                return;
                            }

                            // Stop propagation of all other keys (like Space) to prevent 
                            // bubbling to the app and causing unwanted interactions
                            e.stopPropagation();
                        }}
                        placeholder="Type to add a comment..."
                        noIconHighlight
                        className="!bg-[var(--bg-color)] !text-[var(--text-color)] placeholder:!text-[var(--sub-color)] caret-[var(--caret-color)] selection:bg-[var(--caret-color)] selection:text-[var(--bg-color)] border-none shadow-none !py-4 text-base"
                    />
                </div>
            </div>

            <div className="fixed bottom-12 left-0 right-0 text-center animate-scale-in">
                <div className="text-[var(--sub-color)] text-xs flex gap-6 justify-center items-center font-mono">
                    <span className="flex items-center gap-2">
                        <span className="bg-[var(--sub-color)] text-[var(--bg-color)] px-[0.4em] py-[0.2em] rounded-[0.25em] text-[0.75em] font-bold min-w-[1.5em] text-center">
                            {navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? 'cmd' : 'ctrl'}
                        </span>
                        +
                        <span className="bg-[var(--sub-color)] text-[var(--bg-color)] px-[0.4em] py-[0.2em] rounded-[0.25em] text-[0.75em] font-bold min-w-[1.5em] text-center">
                            enter
                        </span>
                        <span>to save</span>
                    </span>
                    <span className="flex items-center gap-2">
                        <span className="bg-[var(--sub-color)] text-[var(--bg-color)] px-[0.4em] py-[0.2em] rounded-[0.25em] text-[0.75em] font-bold min-w-[1.5em] text-center">
                            esc
                        </span>
                        <span>to cancel</span>
                    </span>
                </div>
            </div>

            <style>{`
                @keyframes scale-in {
                    0% { opacity: 0; transform: scale(0.98); }
                    100% { opacity: 1; transform: scale(1); }
                }
                .animate-scale-in {
                    animation: scale-in 0.15s ease-out forwards;
                }
            `}</style>
        </div>,
        document.body
    );
}
