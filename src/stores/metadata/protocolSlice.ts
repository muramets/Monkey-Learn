import type { Protocol } from '../../features/protocols/types';
import { db } from '../../config/firebase';
import { collection, doc, addDoc, updateDoc, writeBatch, setDoc } from 'firebase/firestore';
import type { MetadataState } from './types';
import { getPathRoot, guardAgainstViewerMode } from '../helpers';

export const createProtocolSlice = (
    set: (partial: Partial<MetadataState> | ((state: MetadataState) => Partial<MetadataState>)) => void,
    get: () => MetadataState
) => ({
    addProtocol: async (protocol: Omit<Protocol, 'id'>) => {
        try {
            const context = get().context;
            guardAgainstViewerMode(context);
            const colRef = collection(db, `${getPathRoot(context)}/protocols`);
            const docRef = await addDoc(colRef, protocol);
            return docRef.id;
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            console.error('[MetadataStore] addProtocol failed:', message);
            throw err;
        }
    },

    updateProtocol: async (id: number | string, data: Partial<Protocol>) => {
        try {
            const context = get().context;
            guardAgainstViewerMode(context, true);
            const docRef = doc(db, `${getPathRoot(context)}/protocols/${id}`);
            await updateDoc(docRef, data);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            console.error('[MetadataStore] updateProtocol failed:', message);
            throw err;
        }
    },

    deleteProtocol: async (id: number | string) => {
        try {
            const context = get().context;
            guardAgainstViewerMode(context);
            const docRef = doc(db, `${getPathRoot(context)}/protocols/${id}`);

            const batch = writeBatch(db);

            // 1. Soft Delete: Set deletedAt
            batch.update(docRef, { deletedAt: new Date().toISOString() });

            // 2. Remove from Pinned Protocols (Quick Actions)
            // Even with soft delete, we want to remove it from the active UI
            const pinnedProtocolIds = get().pinnedProtocolIds;
            if (pinnedProtocolIds.includes(id.toString())) {
                const newPinnedIds = pinnedProtocolIds.filter(pid => pid !== id.toString());
                const settingsRef = doc(db, `${getPathRoot(context)}/settings/app`);
                batch.set(settingsRef, { pinnedProtocolIds: newPinnedIds }, { merge: true });
                set({ pinnedProtocolIds: newPinnedIds }); // Optimistic update
            }

            await batch.commit();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            console.error('[MetadataStore] deleteProtocol failed:', message);
            throw err;
        }
    },

    restoreProtocol: async (protocol: Protocol) => {
        try {
            const context = get().context;
            guardAgainstViewerMode(context);
            const docRef = doc(db, `${getPathRoot(context)}/protocols/${protocol.id}`);

            // Restore by clearing deletedAt
            // Note: We use update instead of set to preserve any other changes if consistent with soft delete model
            // But since restoreProtocol in types.ts took the whole object, existing logic might re-set the whole object.
            // For soft delete restore, we just need to clear the flag.
            await updateDoc(docRef, { deletedAt: null });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            console.error('[MetadataStore] restoreProtocol failed:', message);
            throw err;
        }
    },

    togglePinnedProtocol: async (protocolId: string) => {
        try {
            const context = get().context;
            guardAgainstViewerMode(context);
            const ids = get().pinnedProtocolIds;
            const isPinned = ids.includes(protocolId);
            const newIds = isPinned
                ? ids.filter(id => id !== protocolId)
                : [...ids, protocolId];

            const docRef = doc(db, `${getPathRoot(context)}/settings/app`);
            await setDoc(docRef, { pinnedProtocolIds: newIds }, { merge: true });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            console.error('[MetadataStore] togglePinnedProtocol failed:', message);
            throw err;
        }
    },

    reorderQuickActions: async (orderedIds: string[]) => {
        try {
            const context = get().context;
            guardAgainstViewerMode(context);
            set({ pinnedProtocolIds: orderedIds });
            const docRef = doc(db, `${getPathRoot(context)}/settings/app`);
            await setDoc(docRef, { pinnedProtocolIds: orderedIds }, { merge: true });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            console.error('[MetadataStore] reorderQuickActions failed:', message);
            throw err;
        }
    },

    reorderProtocols: async (orderedIds: string[]) => {
        try {
            const context = get().context;
            guardAgainstViewerMode(context);
            const currentProtocols = get().protocols;
            const protocolsMap = new Map(currentProtocols.map(p => [p.id, p]));

            const reorderedProtocols = orderedIds
                .map((id, index) => {
                    const p = protocolsMap.get(id);
                    return p ? { ...p, order: index } : null;
                })
                .filter(Boolean) as Protocol[];

            const otherProtocols = currentProtocols.filter(p => !orderedIds.includes(p.id.toString()));

            set({ protocols: [...otherProtocols, ...reorderedProtocols] });

            const batch = writeBatch(db);
            orderedIds.forEach((id, index) => {
                const docRef = doc(db, `${getPathRoot(context)}/protocols/${id}`);
                batch.update(docRef, { order: index });
            });

            await batch.commit();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            console.error('[MetadataStore] reorderProtocols failed:', message);
            throw err;
        }
    },

    moveProtocol: async (id: string, newGroup: string, orderedIds: string[]) => {
        try {
            const context = get().context;
            guardAgainstViewerMode(context);
            const currentProtocols = get().protocols;
            const protocolsMap = new Map(currentProtocols.map(p => [String(p.id), p]));

            // 1. Optimistic Update
            // Update the moved protocol's group
            // Update orders for all affected protocols (in the target group)
            const movedProtocol = protocolsMap.get(id);
            if (!movedProtocol) throw new Error('Protocol not found');

            const otherProtocols = currentProtocols.filter(p => !orderedIds.includes(String(p.id)) && String(p.id) !== id);

            const reorderedProtocols = orderedIds
                .map((pid, index) => {
                    const p = protocolsMap.get(pid);
                    // If it's the moved protocol, update its group. Otherwise keep group as is.
                    if (String(p?.id) === id) {
                        return p ? { ...p, group: newGroup, order: index } : null;
                    }
                    return p ? { ...p, order: index } : null;
                })
                .filter(Boolean) as Protocol[];

            set({ protocols: [...otherProtocols, ...reorderedProtocols] });

            // 2. Firestore Writes
            const batch = writeBatch(db);

            // Update the moved protocol's group and order
            const movedRef = doc(db, `${getPathRoot(context)}/protocols/${id}`);
            // Note: If newGroup is empty ('ungrouped'), we typically store it as null or empty string depending on app convention.
            // Based on innerface implementation, we'll store empty string or whatever is passed.
            // But let's check how 'ungrouped' is handled. usually it's just falsy.
            // If the UI passes 'ungrouped' string, we might want to convert to empty string if that's the convention.
            // Looking at innerfaceSlice it seems to assume `group` property exists.
            // Let's assume validation happens upstream or empty string is valid.
            const groupValue = newGroup === 'ungrouped' ? '' : newGroup;
            const movedOrder = orderedIds.indexOf(id);
            batch.update(movedRef, { group: groupValue, order: movedOrder });

            // Update order for other protocols in the target group
            orderedIds.forEach((pid, index) => {
                if (pid !== id) {
                    const docRef = doc(db, `${getPathRoot(context)}/protocols/${pid}`);
                    batch.update(docRef, { order: index });
                }
            });

            await batch.commit();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            console.error('[MetadataStore] moveProtocol failed:', message);
            throw err;
        }
    },

    reorderGroups: async (orderedGroups: string[]) => {
        try {
            const context = get().context;
            guardAgainstViewerMode(context);
            set({ protocolGroupOrder: orderedGroups });
            const docRef = doc(db, `${getPathRoot(context)}/settings/app`);
            await setDoc(docRef, { protocolGroupOrder: orderedGroups }, { merge: true });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            console.error('[MetadataStore] reorderGroups failed:', message);
            throw err;
        }
    },
});
