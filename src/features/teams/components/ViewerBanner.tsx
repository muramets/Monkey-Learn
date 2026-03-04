/**
 * ViewerBanner Component
 * 
 * Displays a persistent banner when admin is viewing a participant's progress.
 * Shows the participant's name and provides an exit button to return to own context.
 * 
 * Premium minimalist styling following MonkeyType design language.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faTimes } from '@fortawesome/free-solid-svg-icons';
import { usePersonalityStore } from '../../../stores/personalityStore';

export function ViewerBanner() {
    const { activeContext, exitViewerMode } = usePersonalityStore();
    const [isHovered, setIsHovered] = useState(false);

    // Only render if in viewer mode
    if (activeContext?.type !== 'viewer') return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: '47px' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="w-full font-mono text-sm leading-none flex items-center justify-center relative shadow-md"
                style={{
                    backgroundColor: 'var(--main-color)',
                    color: 'var(--bg-color)',
                    height: '47px', // ~35.5pt
                    zIndex: 9999
                }}
            >
                <div
                    className="flex items-center justify-between w-full h-full px-8"
                    style={{ maxWidth: '1200px', margin: '0 auto' }}
                >
                    {/* Empty left side for balance */}
                    <div className="w-[20px]" />

                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-main/20 flex items-center justify-center text-main animate-pulse">
                            <FontAwesomeIcon icon={faEye} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-semibold" style={{ color: 'var(--bg-color)' }}>Coaching: {activeContext.displayName}</span>
                        </div>
                    </div>
                    {/* Exit Button */}
                    <button
                        onClick={exitViewerMode}
                        onMouseEnter={() => setIsHovered(true)}
                        onMouseLeave={() => setIsHovered(false)}
                        className="flex items-center justify-center gap-2 transition-opacity hover:opacity-100"
                        title="Exit Viewer Mode"
                    >
                        <FontAwesomeIcon
                            icon={faTimes}
                            className="text-sm"
                            style={{
                                color: isHovered ? 'var(--text-color)' : 'var(--bg-color)',
                                opacity: isHovered ? 1 : 0.7,
                                stroke: 'currentColor',
                                strokeWidth: 40
                            }}
                        />
                        <span className="text-xs" style={{ color: isHovered ? 'var(--text-color)' : 'var(--bg-color)' }}>exit</span>
                    </button>
                </div>
            </motion.div>
        </AnimatePresence >
    );
}
