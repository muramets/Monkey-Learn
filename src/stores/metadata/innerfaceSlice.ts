import type { Innerface } from '../../features/innerfaces/types';
import { db } from '../../config/firebase';
import { collection, doc, addDoc, updateDoc, writeBatch, setDoc } from 'firebase/firestore';
import type { MetadataState } from './types';
import { getPathRoot, guardAgainstViewerMode } from '../helpers';

export const createInnerfaceSlice = (
    set: (partial: Partial<MetadataState> | ((state: MetadataState) => Partial<MetadataState>)) => void,
    get: () => MetadataState
) => ({
    // Actions
    addInnerface: async (innerface: Omit<Innerface, 'id'>) => {
        try {
            const context = get().context;
            guardAgainstViewerMode(context);
            guardAgainstViewerMode(context);
            const colRef = collection(db, `${getPathRoot(context)}/innerfaces`);
            const docRef = await addDoc(colRef, { ...innerface, createdAt: new Date().toISOString() });
            return docRef.id;
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            console.error('[MetadataStore] addInnerface failed:', message);
            throw err; // Re-throw to prevent caller from proceeding with undefined ID
        }
    },

    updateInnerface: async (id: number | string, data: Partial<Innerface>) => {
        try {
            const context = get().context;
            // Optimistic update
            const currentInnerfaces = get().innerfaces;
            set({
                innerfaces: currentInnerfaces.map(i =>
                    i.id.toString() === id.toString() ? { ...i, ...data } : i
                )
            });
            // ALLOW UPDATES IN COACH MODE
            guardAgainstViewerMode(context, true);
            const docRef = doc(db, `${getPathRoot(context)}/innerfaces/${id}`);
            await updateDoc(docRef, data);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            console.error('[MetadataStore] updateInnerface failed:', message);
            throw err;
        }
    },

    deleteInnerface: async (id: number | string) => {
        try {
            const context = get().context;
            guardAgainstViewerMode(context);
            // 1. Soft Delete: Set deletedAt
            const docRef = doc(db, `${getPathRoot(context)}/innerfaces/${id}`);
            await updateDoc(docRef, { deletedAt: new Date().toISOString() });

            // Note: We used to remove ID references from States here.
            // With Soft Deletes, we keep the references so history remains valid.
            // The UI will filter out deleted innerfaces from the active State editing view.

        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            console.error('[MetadataStore] deleteInnerface failed:', message);
            throw err;
        }
    },

    restoreInnerface: async (innerface: Innerface) => {
        try {
            const context = get().context;
            guardAgainstViewerMode(context);
            const docRef = doc(db, `${getPathRoot(context)}/innerfaces/${innerface.id}`);

            // Restore by clearing deletedAt
            // Note: We use update instead of set to preserve any other changes if consistent with soft delete model
            // But since restoreInnerface in types.ts took the whole object, existing logic might re-set the whole object.
            // For soft delete restore, we just need to clear the flag.
            await updateDoc(docRef, { deletedAt: null });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            console.error('[MetadataStore] restoreInnerface failed:', message);
            throw err;
        }
    },

    /**
     * moveInnerface:
     * Moves an innerface to a different group and updates the order of all affected items.
     * Uses Batch Writes to ensure atomicity (all updates succeed or fail together).
     */
    moveInnerface: async (id: string, newGroup: string, orderedIds: string[]) => {
        try {
            const context = get().context;
            guardAgainstViewerMode(context);

            // 1. Optimistic Update (Immediate UI Feedback)
            const currentInnerfaces = get().innerfaces;
            const ifaceMap = new Map(currentInnerfaces.map(i => [i.id.toString(), i]));

            const targetItem = ifaceMap.get(id);
            if (targetItem) {
                targetItem.group = newGroup;
            }

            // Reconstruct the full list with new order
            const reorderedInnerfaces = orderedIds
                .map((oid, index) => {
                    const iface = ifaceMap.get(oid);
                    return iface ? { ...iface, order: index } : null;
                })
                .filter(Boolean) as Innerface[];

            const missingInnerfaces = currentInnerfaces
                .filter(i => !orderedIds.includes(i.id.toString()))
                .map((i, idx) => ({ ...i, order: orderedIds.length + idx }));

            set({ innerfaces: [...reorderedInnerfaces, ...missingInnerfaces] });

            // 2. Batch Write to Firebase (Atomicity)
            const batch = writeBatch(db);
            orderedIds.forEach((oid, index) => {
                const docRef = doc(db, `${getPathRoot(context)}/innerfaces/${oid}`);
                if (oid === id) {
                    // Update group depending on movement
                    batch.update(docRef, { order: index, group: newGroup });
                } else {
                    batch.update(docRef, { order: index });
                }
            });

            await batch.commit();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            console.error('[MetadataStore] moveInnerface failed:', message);
            throw err;
        }
    },

    /**
     * reorderInnerfaces:
     * Updates the order of innerfaces within their current groups.
     * Uses Batch Writes for atomicity.
     */
    reorderInnerfaces: async (orderedIds: string[]) => {
        try {
            const context = get().context;
            guardAgainstViewerMode(context);

            // 1. Optimistic Update
            const currentInnerfaces = get().innerfaces;
            const ifaceMap = new Map(currentInnerfaces.map(i => [i.id.toString(), i]));

            const reorderedInnerfaces = orderedIds
                .map((id, index) => {
                    const iface = ifaceMap.get(id);
                    return iface ? { ...iface, order: index } : null;
                })
                .filter(Boolean) as Innerface[];

            const missingInnerfaces = currentInnerfaces
                .filter(i => !orderedIds.includes(i.id.toString()))
                .map((i, idx) => ({ ...i, order: orderedIds.length + idx }));

            set({ innerfaces: [...reorderedInnerfaces, ...missingInnerfaces] });

            // 2. Batch Write
            const batch = writeBatch(db);
            orderedIds.forEach((id, index) => {
                const docRef = doc(db, `${getPathRoot(context)}/innerfaces/${id}`);
                batch.update(docRef, { order: index });
            });
            // Also update missing ones to be at the end
            missingInnerfaces.forEach(i => {
                const docRef = doc(db, `${getPathRoot(context)}/innerfaces/${i.id.toString()}`);
                batch.update(docRef, { order: i.order });
            });

            await batch.commit();
            console.debug('[MetadataStore] reorderInnerfaces success');
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            console.error('[MetadataStore] reorderInnerfaces failed:', message);
            throw err;
        }
    },

    /**
     * reorderInnerfaceGroups:
     * Persists the custom order of groups within a category or globally.
     */
    reorderInnerfaceGroups: async (orderedGroups: Record<string, string[]>) => {
        try {
            const context = get().context;
            console.debug('[MetadataStore] reorderInnerfaceGroups', { orderedGroups });

            guardAgainstViewerMode(context);

            // Optimistic Update
            set({ innerfaceGroupOrder: orderedGroups });

            // Persist to 'settings/app' document
            const docRef = doc(db, `${getPathRoot(context)}/settings/app`);
            await setDoc(docRef, { innerfaceGroupOrder: orderedGroups }, { merge: true });

            console.debug('[MetadataStore] Group Reorder success');
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            console.error('[MetadataStore] reorderInnerfaceGroups failed:', message);
            throw err;
        }
    },

    /**
     * reorderCategories:
     * Persists the custom order of high-level Categories (Skill, Foundation, etc).
     */
    reorderCategories: async (orderedCategories: string[]) => {
        try {
            const context = get().context;
            console.debug('[MetadataStore] reorderCategories', { orderedCategories });

            guardAgainstViewerMode(context);

            // Optimistic Update
            set({ categoryOrder: orderedCategories });

            // Persist to 'settings/app'
            const docRef = doc(db, `${getPathRoot(context)}/settings/app`);
            await setDoc(docRef, { categoryOrder: orderedCategories }, { merge: true });

            console.debug('[MetadataStore] Category Reorder success');
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            console.error('[MetadataStore] reorderCategories failed:', message);
            throw err;
        }
    },
});
