import type { PathContext } from './metadata/types';

/**
 * Resolves the Firestore document path root for the active context.
 * Single source of truth — replaces 5 duplicate definitions across store slices.
 */
export const getPathRoot = (context: PathContext | null): string => {
    if (!context) throw new Error('No active context for metadata operation');
    if (context.type === 'personality') return `users/${context.uid}/personalities/${context.pid}`;
    if (context.type === 'viewer') return `users/${context.targetUid}/personalities/${context.personalityId}`;
    return `teams/${context.teamId}/roles/${context.roleId}`;
};

/**
 * Builds a full Firestore collection path for the given context + collection name.
 */
export const getCollectionPath = (context: PathContext, collection: string): string => {
    return `${getPathRoot(context)}/${collection}`;
};

export const isViewerMode = (context: PathContext | null): boolean =>
    context?.type === 'viewer';

/**
 * Throws if the active context is viewer/coach mode (read-only).
 * @param allowInCoachMode If true, viewer mode mutations are allowed (for role-level edits).
 */
export const guardAgainstViewerMode = (context: PathContext | null, allowInCoachMode = false): void => {
    if (isViewerMode(context) && !allowInCoachMode) {
        console.warn('[MetadataStore] Blocked mutation in viewer/coach mode');
        throw new Error('Cannot modify data in coach/viewer mode');
    }
};
