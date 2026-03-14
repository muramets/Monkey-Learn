import { create } from 'zustand';
import { db } from '../config/firebase';
import {
    collection,
    onSnapshot,
    doc,
} from 'firebase/firestore';
import type { Protocol } from '../features/protocols/types';
import type { Innerface } from '../features/innerfaces/types';
import type { StateData } from '../features/dashboard/types';

import { createInnerfaceSlice } from './metadata/innerfaceSlice';
import { createProtocolSlice } from './metadata/protocolSlice';
import { createStateSlice } from './metadata/stateSlice';
import { createGroupSlice } from './metadata/groupSlice';
import type { MetadataState, PathContext } from './metadata/types';
import { getPathRoot } from './helpers';

export const useMetadataStore = create<MetadataState>((set, get) => ({
    // --- Initial State ---
    innerfaces: [],
    protocols: [],
    states: [],
    pinnedProtocolIds: [],
    groupsMetadata: {},
    protocolGroupOrder: [],
    innerfaceGroupOrder: {},
    isDimensionsCollapsed: false,
    categoryOrder: [],
    isLoading: true,
    loadedCount: 0,
    error: null,
    hasPendingWrites: false, // Initial state
    setHasPendingWrites: (hasPending) => set({ hasPendingWrites: hasPending }),
    context: null,
    setContext: (context) => set({ context }),

    // --- Compose Slices ---
    ...createInnerfaceSlice(set, get),
    ...createProtocolSlice(set, get),
    ...createStateSlice(set, get),
    ...createGroupSlice(set, get),

    // --- Shared Subscription Logic ---
    subscribeToMetadata: (context: PathContext) => {
        const pathRoot = getPathRoot(context);

        set({
            innerfaces: [],
            protocols: [],
            states: [],
            groupsMetadata: {},
            protocolGroupOrder: [],
            innerfaceGroupOrder: {},
            categoryOrder: [],
            isDimensionsCollapsed: false,
            pinnedProtocolIds: [],
            isLoading: true,
            loadedCount: 0
        });

        const loadedSources = new Set<string>();
        const markLoaded = (source: string) => {
            loadedSources.add(source);
            set({ loadedCount: loadedSources.size });
            // We expect 4 sources: innerfaces, protocols, states, settings/app
            if (loadedSources.size >= 4) {
                set({ isLoading: false });
            }
        };

        const handleSnapshotError = (err: Error, source: string) => {
            console.error(`[MetadataStore] Error loading ${source}:`, err);
            set({ error: err.message });
            markLoaded(source);
        };

        const unsubIfaces = onSnapshot(
            collection(db, `${pathRoot}/innerfaces`),
            (snap) => {
                if (get().hasPendingWrites) {
                    console.debug('[MetadataStore] Skipping innerfaces snapshot due to pending writes');
                    return;
                }
                const innerfaces = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Innerface));
                innerfaces.sort((a, b) => (a.order || 0) - (b.order || 0));
                set({ innerfaces });
                markLoaded('innerfaces');
            },
            (err) => handleSnapshotError(err, 'innerfaces')
        );

        const unsubProtocols = onSnapshot(
            collection(db, `${pathRoot}/protocols`),
            (snap) => {
                if (get().hasPendingWrites) {
                    console.debug('[MetadataStore] Skipping protocols snapshot due to pending writes');
                    return;
                }
                const protocols = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Protocol));
                set({ protocols });
                markLoaded('protocols');
            },
            (err) => handleSnapshotError(err, 'protocols')
        );

        const unsubStates = onSnapshot(
            collection(db, `${pathRoot}/states`),
            (snap) => {
                if (get().hasPendingWrites) {
                    console.debug('[MetadataStore] Skipping states snapshot due to pending writes');
                    return;
                }
                const states = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as StateData));
                states.sort((a, b) => {
                    const orderA = a.order ?? 9999;
                    const orderB = b.order ?? 9999;
                    return orderA - orderB;
                });
                set({ states });
                markLoaded('states');
            },
            (err) => handleSnapshotError(err, 'states')
        );

        // Consolidated Settings Listener & Automatic Migration
        const unsubAppSettings = onSnapshot(
            doc(db, `${pathRoot}/settings/app`),
            async (snap) => {
                if (get().hasPendingWrites) {
                    console.debug('[MetadataStore] Skipping app settings snapshot due to pending writes');
                    return;
                }

                if (snap.exists()) {
                    const data = snap.data();
                    set({
                        groupsMetadata: data.groupsMetadata || {},
                        protocolGroupOrder: data.protocolGroupOrder || [],
                        innerfaceGroupOrder: data.innerfaceGroupOrder || {},
                        categoryOrder: data.categoryOrder || [],
                        isDimensionsCollapsed: data.isDimensionsCollapsed ?? false,
                        pinnedProtocolIds: data.pinnedProtocolIds || []
                    });
                } else {
                    // Default state for new personalities
                    set({
                        groupsMetadata: {},
                        protocolGroupOrder: [],
                        innerfaceGroupOrder: {},
                        categoryOrder: [],
                        isDimensionsCollapsed: false,
                        pinnedProtocolIds: []
                    });
                }
                markLoaded('settings/app');
            },
            (err) => handleSnapshotError(err, 'settings/app')
        );

        return () => {
            unsubIfaces();
            unsubProtocols();
            unsubStates();
            unsubAppSettings();
        };
    }
}));
