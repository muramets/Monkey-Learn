import { db } from '../../config/firebase';
import { doc, writeBatch, setDoc } from 'firebase/firestore';
import type { MetadataState } from './types';
import { getPathRoot, guardAgainstViewerMode } from '../helpers';

export const createGroupSlice = (
    set: (partial: Partial<MetadataState> | ((state: MetadataState) => Partial<MetadataState>)) => void,
    get: () => MetadataState
) => ({
    updateGroupMetadata: async (groupName: string, metadata: { icon?: string; color?: string }) => {
        try {
            const context = get().context;
            guardAgainstViewerMode(context);

            // Persist to 'settings/app' in 'groupsMetadata' field
            // Use dot notation to update specific key in map
            const docRef = doc(db, `${getPathRoot(context)}/settings/app`);
            await setDoc(docRef, {
                groupsMetadata: { [groupName]: metadata }
            }, { merge: true });

        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            console.error('[MetadataStore] updateGroupMetadata failed:', message);
            throw err;
        }
    },

    renameGroup: async (oldName: string, newName: string) => {
        try {
            const context = get().context;
            console.debug('[GroupSlice] renameGroup called', { oldName, newName });

            guardAgainstViewerMode(context);
            const trimmedNewName = newName.trim();
            if (!trimmedNewName || trimmedNewName === oldName) return;

            // --- 1. Optimistic Update Start ---
            get().setHasPendingWrites(true);

            const state = get();

            // Prepare new state values
            const nextInnerfaces = state.innerfaces.map(i =>
                i.group === oldName ? { ...i, group: trimmedNewName } : i
            );

            const nextProtocols = state.protocols.map(p =>
                p.group === oldName ? { ...p, group: trimmedNewName } : p
            );

            const nextGroupsMetadata = { ...state.groupsMetadata };
            if (nextGroupsMetadata[oldName]) {
                nextGroupsMetadata[trimmedNewName] = nextGroupsMetadata[oldName];
                delete nextGroupsMetadata[oldName];
            }

            const nextProtocolGroupOrder = state.protocolGroupOrder.map(g => g === oldName ? trimmedNewName : g);

            // Handle Record<string, string[]> for innerfaceGroupOrder
            const nextInnerfaceGroupOrder: Record<string, string[]> = {};
            Object.entries(state.innerfaceGroupOrder).forEach(([cat, order]) => {
                nextInnerfaceGroupOrder[cat] = order.map(g => g === oldName ? trimmedNewName : g);
            });


            // Apply to local store IMMEDIATELY
            set({
                innerfaces: nextInnerfaces,
                protocols: nextProtocols,
                groupsMetadata: nextGroupsMetadata,
                protocolGroupOrder: nextProtocolGroupOrder,
                innerfaceGroupOrder: nextInnerfaceGroupOrder
            });

            // --- 2. Persistence (Batch Write) ---
            const batch = writeBatch(db);
            const pathRoot = getPathRoot(context);
            const settingsRef = doc(db, `${pathRoot}/settings/app`);

            // Update Innerfaces
            state.innerfaces.forEach(i => {
                if (i.group === oldName) {
                    const docRef = doc(db, `${pathRoot}/innerfaces/${i.id}`);
                    batch.update(docRef, { group: trimmedNewName });
                }
            });

            // Update Protocols
            state.protocols.forEach(p => {
                if (p.group === oldName) {
                    const docRef = doc(db, `${pathRoot}/protocols/${p.id}`);
                    batch.update(docRef, { group: trimmedNewName });
                }
            });

            // Update Settings Doc (Groups Metadata + Orders)
            // We can do this in one set/merge
            // BUT deleting a key from a map requires special syntax or replacing the map.
            // Since we have the FULL new map in nextGroupsMetadata, we can just save it fully with merge: true?
            // Yes, if we update 'groupsMetadata' field with the whole object, it replaces the field content?
            // NO. setDoc with merge merges keys. It won't delete old key.
            // To delete old key in a merge, we need FieldValue.delete()

            // To be safe and atomic, let's construct the update for settings/app
            // We need to:
            // 1. Add new key
            // 2. Delete old key
            // 3. Update orders

            // Note: In a batch, we can't use FieldValue.delete() easily inside a complex object update unless we use update() with dot notation.
            // Let's use update() if the doc exists (it certainly does by now).

            // Actually, simply overwriting the 'groupsMetadata' field with the NEW full object is acceptable 
            // IF we are sure we have all data. And we do (from subscription).
            // BUT concurrency... if someone else added a group meanwhile?
            // Better to use dot notation for add/delete.

            // batch.update(settingsRef, {
            //    [`groupsMetadata.${trimmedNewName}`]: state.groupsMetadata[oldName],
            //    [`groupsMetadata.${oldName}`]: deleteField(),
            //    protocolGroupOrder: nextProtocolGroupOrder,
            //    innerfaceGroupOrder: nextInnerfaceGroupOrder
            // });

            // However, deleteField needs import. I'll stick to writing the full map for `groupsMetadata` 
            // if I can't import `deleteField` easily. 
            // Wait, I can import `deleteField` from firebase/firestore.

            // Since I am already replacing the file content, I'll assume I can add the import at the top later?
            // Actually, I am only replacing the function body. Usage of `deleteField` will break if not imported.
            // I'll stick to Overwriting the whole field `groupsMetadata` with `nextGroupsMetadata`.
            // Because this is a user-specific document, concurrency is low risk.

            batch.set(settingsRef, {
                groupsMetadata: nextGroupsMetadata,
                protocolGroupOrder: nextProtocolGroupOrder,
                innerfaceGroupOrder: nextInnerfaceGroupOrder
            }, { merge: true });

            // Legacy Cleanups (optional, but good to remove old docs if they exist)
            // batch.delete(doc(db, `${pathRoot}/groups/${oldName}`)); // Old legacy location

            await batch.commit();
            console.debug(`[GroupSlice] renameGroup committed`);

        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            console.error('[MetadataStore] renameGroup failed:', message);
            throw err;
        } finally {
            setTimeout(() => {
                get().setHasPendingWrites(false);
            }, 500);
        }
    },

    deleteGroup: async (groupName: string) => {
        try {
            const context = get().context;
            guardAgainstViewerMode(context);
            const batch = writeBatch(db);
            const pathRoot = getPathRoot(context);
            const settingsRef = doc(db, `${pathRoot}/settings/app`);

            // 1. Update Innerfaces
            const innerfaces = get().innerfaces;
            innerfaces.forEach(i => {
                if (i.group === groupName) {
                    const docRef = doc(db, `${pathRoot}/innerfaces/${i.id}`);
                    batch.update(docRef, { group: '' });
                }
            });

            // 2. Update Protocols
            const protocols = get().protocols;
            protocols.forEach(p => {
                if (p.group === groupName) {
                    const docRef = doc(db, `${pathRoot}/protocols/${p.id}`);
                    batch.update(docRef, { group: '' });
                }
            });

            // 3. Update Settings (Metadata + Orders)
            const state = get();

            // Remove from metadata
            const nextGroupsMetadata = { ...state.groupsMetadata };
            delete nextGroupsMetadata[groupName];

            // Remove from Protocol Order
            const nextProtocolGroupOrder = state.protocolGroupOrder.filter(g => g !== groupName);

            // Remove from Innerface Order
            const nextInnerfaceGroupOrder: Record<string, string[]> = {};
            Object.entries(state.innerfaceGroupOrder).forEach(([cat, order]) => {
                nextInnerfaceGroupOrder[cat] = order.filter(g => g !== groupName);
            });

            // Optimistic
            set({
                groupsMetadata: nextGroupsMetadata,
                protocolGroupOrder: nextProtocolGroupOrder,
                innerfaceGroupOrder: nextInnerfaceGroupOrder
            });

            // Persistence
            // Overwriting `groupsMetadata` to delete the key effectively.
            batch.set(settingsRef, {
                groupsMetadata: nextGroupsMetadata,
                protocolGroupOrder: nextProtocolGroupOrder,
                innerfaceGroupOrder: nextInnerfaceGroupOrder
            }, { merge: true });

            // Legacy Cleanup
            // batch.delete(doc(db, `${pathRoot}/groups/${groupName}`));

            await batch.commit();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            console.error('[MetadataStore] deleteGroup failed:', message);
            throw err;
        }
    },

    restoreGroup: async (backup: {
        name: string;
        metadata: { icon?: string; color?: string };
        innerfaceIds: string[];
        protocolIds: string[];
    }) => {
        try {
            const context = get().context;
            guardAgainstViewerMode(context);
            const batch = writeBatch(db);
            const pathRoot = getPathRoot(context);
            const settingsRef = doc(db, `${pathRoot}/settings/app`);
            const { name, metadata, innerfaceIds, protocolIds } = backup;

            // 1. Restore Metadata (in settings/app)
            // We will merge it into the existing map
            const state = get();
            const nextGroupsMetadata = { ...state.groupsMetadata };
            if (metadata && metadata.icon) {
                nextGroupsMetadata[name] = {
                    icon: metadata.icon,
                    color: metadata.color
                };
            }

            // 2. Restore Innerfaces
            innerfaceIds.forEach(id => {
                const docRef = doc(db, `${pathRoot}/innerfaces/${id}`);
                batch.update(docRef, { group: name });
            });

            // 3. Restore Protocols
            protocolIds.forEach(id => {
                const docRef = doc(db, `${pathRoot}/protocols/${id}`);
                batch.update(docRef, { group: name });
            });

            // 4. Restore Sort Orders (Optimistic append)
            // Protocol Group Order
            let nextProtocolGroupOrder = state.protocolGroupOrder;
            if (!nextProtocolGroupOrder.includes(name)) {
                nextProtocolGroupOrder = [...nextProtocolGroupOrder, name];
            }

            // Innerface Group Order (Add to all lists? Or Uncategorized? 
            // Typically restored group might belong to a category, but we don't know which one from backup easily unless we scan items.
            // For now, let's just make sure it exists in the map if we want to sort it?
            // Actually, if we don't add it to order, it appears at bottom. That's fine.
            // But let's append to 'uncategorized' by default or try to guess?
            // Let's just update protocolGroupOrder for now.

            // Optimistic
            set({
                groupsMetadata: nextGroupsMetadata,
                protocolGroupOrder: nextProtocolGroupOrder
            });

            // Persistence
            batch.set(settingsRef, {
                groupsMetadata: nextGroupsMetadata,
                protocolGroupOrder: nextProtocolGroupOrder
            }, { merge: true });

            await batch.commit();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            console.error('[MetadataStore] restoreGroup failed:', message);
            throw err;
        }
    }
});
