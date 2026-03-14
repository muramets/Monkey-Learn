import { create } from 'zustand';
import { db } from '../config/firebase';
import {
    collection,
    doc,
    setDoc,
    deleteDoc,
    query,
    onSnapshot
} from 'firebase/firestore';
import type { PlanningGoal } from '../features/planning/types';
import type { PathContext } from './metadata/types';
import { getCollectionPath } from './helpers';

interface PlanningState {
    goals: Record<string, PlanningGoal>; // Keyed by innerfaceId
    isLoading: boolean;
    error: string | null;

    // Actions
    setGoal: (context: PathContext, goal: Omit<PlanningGoal, 'createdAt' | 'updatedAt'>) => Promise<void>;
    deleteGoal: (context: PathContext, innerfaceId: string | number) => Promise<void>;
    subscribeToGoals: (context: PathContext) => () => void;
    clearGoals: () => void;
}

export const usePlanningStore = create<PlanningState>((set) => ({
    goals: {},
    isLoading: true,
    error: null,

    clearGoals: () => set({ goals: {}, isLoading: false, error: null }),

    setGoal: async (context, goalData) => {
        try {
            const goalId = String(goalData.innerfaceId);
            const collectionPath = getCollectionPath(context, 'goals');
            const docRef = doc(db, collectionPath, goalId);

            const now = Date.now();
            const payload = {
                ...goalData,
                updatedAt: now,
            };

            await setDoc(docRef, {
                ...payload,
                createdAt: now
            }, { merge: true });

        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            console.error('Error setting goal:', err);
            set({ error: message });
        }
    },

    deleteGoal: async (context, innerfaceId) => {
        try {
            const goalId = String(innerfaceId);
            const collectionPath = getCollectionPath(context, 'goals');
            const docRef = doc(db, collectionPath, goalId);
            await deleteDoc(docRef);

            set(state => {
                const newGoals = { ...state.goals };
                delete newGoals[goalId];
                return { goals: newGoals };
            });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            console.error('Error deleting goal:', err);
            set({ error: message });
        }
    },

    subscribeToGoals: (context) => {
        set({ isLoading: true });
        const collectionPath = getCollectionPath(context, 'goals');
        const goalsRef = collection(db, collectionPath);

        const unsubscribe = onSnapshot(query(goalsRef), (snapshot) => {
            const goalsMap: Record<string, PlanningGoal> = {};
            snapshot.forEach((doc) => {
                goalsMap[doc.id] = doc.data() as PlanningGoal;
            });
            set({ goals: goalsMap, isLoading: false });
        }, (err) => {
            console.error('Firestore goals subscription error:', err);
            set({ error: err.message, isLoading: false });
        });

        return unsubscribe;
    }
}));
