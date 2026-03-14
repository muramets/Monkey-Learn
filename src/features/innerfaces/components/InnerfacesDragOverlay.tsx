import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBan, faGripVertical } from '@fortawesome/free-solid-svg-icons';
import { InnerfaceCard } from './InnerfaceCard';
import { getGroupConfig } from '../../../constants/common';
import { getIcon } from '../../../config/iconRegistry';
import { CATEGORY_CONFIG } from '../constants';
import type { Innerface } from '../types';
import type { PlanningGoal } from '../../planning/types';

interface InnerfacesDragOverlayProps {
    innerface?: Innerface | null;
    groupName?: string | null;
    categoryName?: string | null;
    goals?: Record<string, PlanningGoal>;
    groupsMetadata?: Record<string, { icon: string; color?: string }>;
    isValidDrop?: boolean;
}

export const InnerfacesDragOverlay = React.memo(({
    innerface,
    groupName,
    categoryName,
    goals = {},
    groupsMetadata = {},
    isValidDrop = true
}: InnerfacesDragOverlayProps) => {
    if (innerface) {
        return (
            <div className={`w-full h-full shadow-2xl z-50 pointer-events-none ${!isValidDrop ? 'scale-95' : 'opacity-90 cursor-grabbing'}`}>
                <InnerfaceCard
                    innerface={innerface}
                    forceHover={true}
                    hasGoal={Boolean(innerface.id && goals?.[innerface.id])}
                />
                {!isValidDrop && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50 rounded-xl overflow-hidden">
                        <div className="absolute inset-0 bg-red-500/10" />
                        <div
                            className="relative z-10 bg-bg-primary/90 rounded-full w-12 h-12 flex items-center justify-center animate-in zoom-in duration-200"
                            style={{
                                color: 'var(--error-color)',
                                borderColor: 'color-mix(in srgb, var(--error-color) 20%, transparent)',
                                borderWidth: '1px',
                                boxShadow: '0 0 20px color-mix(in srgb, var(--error-color) 30%, transparent)'
                            }}
                        >
                            <FontAwesomeIcon icon={faBan} className="text-xl" />
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (groupName) {
        const staticConfig = getGroupConfig(groupName);
        const storeMeta = groupsMetadata[groupName];

        let icon = getIcon(staticConfig.icon);
        let color = staticConfig.color;

        if (storeMeta) {
            if (storeMeta.icon) {
                const mapped = getIcon(storeMeta.icon);
                if (mapped) icon = mapped;
            }
            if (storeMeta.color) color = storeMeta.color;
        }

        return (
            <div className={`w-full relative shadow-2xl z-50 pointer-events-none rounded-lg overflow-hidden ${!isValidDrop ? 'scale-95' : 'opacity-90 cursor-grabbing'}`}>
                <div className={`w-full [@media(hover:hover)]:backdrop-blur-sm rounded-lg flex items-center py-2 pr-4 ${!isValidDrop ? 'bg-error/20 border border-error/50' : 'bg-sub-alt [@media(hover:hover)]:bg-sub-alt/80'}`}>
                    {/* Handle Placeholder */}
                    <div className="w-10 flex items-center justify-center opacity-70">
                        <FontAwesomeIcon icon={faGripVertical} className="text-sm" />
                    </div>
                    <div className="flex items-center gap-3">
                        <FontAwesomeIcon icon={icon} style={{ color: !isValidDrop ? 'var(--error-color)' : color }} className="text-lg opacity-80" />
                        <span className={`text-2xl font-bold lowercase ${!isValidDrop ? 'text-error' : 'text-sub'}`}>{groupName}</span>
                    </div>
                </div>
                {!isValidDrop && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
                        <div className="bg-bg-primary/90 rounded-full w-10 h-10 flex items-center justify-center border border-error/30 shadow-lg animate-in zoom-in duration-200">
                            <FontAwesomeIcon icon={faBan} className="text-lg text-error" />
                        </div>
                    </div>
                )}
            </div>
        )
    }

    if (categoryName) {
        // Safe cast as we know the keys match the type
        const config = CATEGORY_CONFIG[categoryName as keyof typeof CATEGORY_CONFIG];
        if (!config) return null;
        const Icon = config.icon;
        return (
            <div className={`w-full relative shadow-2xl z-50 pointer-events-none rounded-lg overflow-hidden ${!isValidDrop ? 'scale-95' : 'opacity-90 cursor-grabbing'}`}>
                <div className={`w-full [@media(hover:hover)]:backdrop-blur-sm rounded-lg flex items-center py-2 pr-4 ${!isValidDrop ? 'bg-error/20 border border-error/50' : 'bg-sub-alt [@media(hover:hover)]:bg-sub-alt/80'}`}>
                    {/* Handle Placeholder */}
                    <div className="w-10 flex items-center justify-center opacity-70">
                        <FontAwesomeIcon icon={faGripVertical} className="text-sm" />
                    </div>
                    <div className="flex items-center gap-3">
                        <Icon className={`w-6 h-6 ${!isValidDrop ? 'text-error' : 'text-sub'}`} />
                        <span className={`text-2xl font-bold lowercase ${!isValidDrop ? 'text-error' : 'text-sub'}`}>{config.label}</span>
                    </div>
                </div>
                {!isValidDrop && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
                        <div className="bg-bg-primary/90 rounded-full w-10 h-10 flex items-center justify-center border border-error/30 shadow-lg animate-in zoom-in duration-200">
                            <FontAwesomeIcon icon={faBan} className="text-lg text-error" />
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return null;
});
