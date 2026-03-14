import type { StateData } from '../../features/dashboard/types';
import { db } from '../../config/firebase';
import { collection, doc, addDoc, updateDoc, writeBatch } from 'firebase/firestore';
import type { MetadataState } from './types';
import { getPathRoot, guardAgainstViewerMode } from '../helpers';

export const createStateSlice = (
    set: (partial: Partial<MetadataState> | ((state: MetadataState) => Partial<MetadataState>)) => void,
    get: () => MetadataState
) => ({
    addState: async (data: Omit<StateData, 'id'>) => {
        try {
            const context = get().context;
            guardAgainstViewerMode(context);
            const colRef = collection(db, `${getPathRoot(context)}/states`);
            await addDoc(colRef, data);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            console.error('[MetadataStore] addState failed:', message);
            throw err;
        }
    },

    updateState: async (id: string, data: Partial<StateData>) => {
        try {
            const context = get().context;
            guardAgainstViewerMode(context);
            const docRef = doc(db, `${getPathRoot(context)}/states/${id}`);
            await updateDoc(docRef, data);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            console.error('[MetadataStore] updateState failed:', message);
            throw err;
        }
    },

    deleteState: async (id: string) => {
        try {
            const context = get().context;
            guardAgainstViewerMode(context);
            // Soft Delete: Set deletedAt
            const docRef = doc(db, `${getPathRoot(context)}/states/${id}`);
            await updateDoc(docRef, { deletedAt: new Date().toISOString() });

            // Note: We used to remove ID references from other States here.
            // With Soft Deletes, we keep the references so hierarchy remains valid.
            // The UI will filter out deleted states from the active State editing view.
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            console.error('[MetadataStore] deleteState failed:', message);
            throw err;
        }
    },

    restoreState: async (state: StateData) => {
        try {
            const context = get().context;
            guardAgainstViewerMode(context);
            const docRef = doc(db, `${getPathRoot(context)}/states/${state.id}`);
            // Restore by clearing deletedAt
            await updateDoc(docRef, { deletedAt: null });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            console.error('[MetadataStore] restoreState failed:', message);
            throw err;
        }
    },

    reorderStates: async (orderedIds: string[]) => {
        try {
            const context = get().context;
            guardAgainstViewerMode(context);
            const currentStates = get().states;
            const stateMap = new Map(currentStates.map(s => [s.id, s]));

            const reorderedStates = orderedIds
                .map((id, index) => {
                    const state = stateMap.get(id);
                    return state ? { ...state, order: index } : null;
                })
                .filter(Boolean) as StateData[];

            const missingStates = currentStates
                .filter(s => !orderedIds.includes(s.id))
                .map((s, i) => ({ ...s, order: orderedIds.length + i }));

            set({ states: [...reorderedStates, ...missingStates] });

            const batch = writeBatch(db);
            orderedIds.forEach((id, index) => {
                const docRef = doc(db, `${getPathRoot(context)}/states/${id}`);
                batch.update(docRef, { order: index });
            });
            missingStates.forEach(s => {
                const docRef = doc(db, `${getPathRoot(context)}/states/${s.id}`);
                batch.update(docRef, { order: s.order });
            });

            await batch.commit();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            console.error('[MetadataStore] reorderStates failed:', message);
            throw err;
        }
    },

    setDimensionsCollapsed: async (collapsed: boolean) => {
        try {
            const context = get().context;
            guardAgainstViewerMode(context);
            const docRef = doc(db, `${getPathRoot(context)}/settings/app`);
            await updateDoc(docRef, { isDimensionsCollapsed: collapsed });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            console.error('[MetadataStore] setDimensionsCollapsed failed:', message);
            throw err;
        }
    },
});
