import { create } from 'zustand';
import { db } from '../config/firebase';
import {
    collection,
    addDoc,
    query,
    onSnapshot,
    doc,
    orderBy,
    Timestamp,
    runTransaction,
    where,
    DocumentReference,
    increment,
    updateDoc
} from 'firebase/firestore';
import type { HistoryRecord } from '../types/history';
import type { Personality } from '../types/personality';
import {
    computeCheckinScore,
    computeRevertedScore,
    weightToXp,
    planStatsForCheckin,
    planStatsForDelete,
} from '../utils/checkinCalculations';

/**
 * History Store
 * 
 * Manages the immutable log of user actions ("Check-ins").
 * 
 * Logic:
 * - Each action (using a Protocol, completing a Quick Action) creates a record.
 * - Records are appended-only (log).
 * - Queries are ordered by timestamp (newest first).
 * - Real-time sync ensures that if a user checks in on mobile, the web dashboard updates instantly.
 * - Scoped by PERSONALITY ({uid}/personalities/{pid}/history).
 */
interface HistoryState {
    history: HistoryRecord[];
    isLoading: boolean;
    error: string | null;
    pendingCheckins: Set<string>; // Track check-ins being saved

    // Actions
    addCheckin: (uid: string, pid: string, record: Omit<HistoryRecord, 'id'>, applyToScore?: boolean, customId?: string) => Promise<string>;
    updateCheckin: (uid: string, pid: string, id: string, data: Partial<HistoryRecord>) => Promise<void>;
    addSystemEvent: (uid: string, pid: string, message: string, details?: Record<string, unknown>) => Promise<void>;
    deleteCheckin: (uid: string, pid: string, id: string) => Promise<void>;
    subscribeToHistory: (uid: string, pid: string) => () => void;
    clearHistory: () => void;
}

export const useHistoryStore = create<HistoryState>((set) => ({
    history: [],
    isLoading: true,
    error: null,
    pendingCheckins: new Set<string>(),

    clearHistory: () => set({ history: [], isLoading: false, error: null }),

    addCheckin: async (uid, pid, record, applyToScore = true, customId) => {
        // Use custom ID if provided (for Optimistic UI), otherwise generate one
        const historyRef = customId
            ? doc(db, 'users', uid, 'personalities', pid, 'history', customId)
            : doc(collection(db, 'users', uid, 'personalities', pid, 'history'));

        const historyId = historyRef.id;

        // Track pending operation
        set(state => ({
            pendingCheckins: new Set([...state.pendingCheckins, historyId])
        }));

        try {
            console.log("Adding check-in", { uid, pid, protocol: record.protocolName, applyToScore, customId });

            await runTransaction(db, async (transaction) => {
                // 1. Prepare Reads (Refs & Data)
                // historyRef is already created above
                const personalityRef = doc(db, 'users', uid, 'personalities', pid);

                // READ: Personality
                // We only need personality doc if updating stats
                let personalityDoc;
                if (applyToScore) {
                    personalityDoc = await transaction.get(personalityRef);
                }

                // READ: Innerfaces
                // We must read the doc to correctly initialize currentScore from initialScore if it's missing.
                // Blind atomic increments caused a bug where the first check-in would start from 0, ignoring the base level.
                const innerfaceUpdates: { ref: DocumentReference, newScore: number }[] = [];
                if (record.changes) {
                    for (const [innerfaceId, weight] of Object.entries(record.changes)) {
                        const innerfaceRef = doc(db, 'users', uid, 'personalities', pid, 'innerfaces', innerfaceId);
                        const innerfaceDoc = await transaction.get(innerfaceRef);

                        if (innerfaceDoc.exists()) {
                            const newScore = computeCheckinScore(innerfaceDoc.data(), Number(weight));
                            innerfaceUpdates.push({ ref: innerfaceRef, newScore });
                        }
                    }
                }

                // 2. Writes (Must happen AFTER all reads)

                // WRITE: History Record
                transaction.set(historyRef, {
                    ...record,
                    serverTimestamp: Timestamp.now()
                });

                console.debug("Transaction: Record created", { protocol: record.protocolName });

                if (applyToScore) {
                    // WRITE: Innerface Updates
                    for (const update of innerfaceUpdates) {
                        transaction.update(update.ref, {
                            currentScore: update.newScore,
                            lastCheckInDate: record.timestamp
                        });
                    }

                    // WRITE: Personality Stats
                    if (personalityDoc && personalityDoc.exists()) {
                        const pData = personalityDoc.data() as Personality;
                        const recordXp = weightToXp(record.weight);
                        const plan = planStatsForCheckin(pData.stats, recordXp, new Date());

                        if (plan.mode === 'initialize') {
                            transaction.update(personalityRef, { stats: plan.stats });
                        } else {
                            // Atomic increments for thread safety under rapid clicking.
                            // Reset fields (day/month rollover) use plain values, not increment().
                            const statsUpdate: Record<string, unknown> = { ...plan.resets };
                            for (const [path, delta] of Object.entries(plan.increments)) {
                                statsUpdate[path] = increment(delta);
                            }
                            transaction.update(personalityRef, statsUpdate);
                        }
                    }
                }
            });

            return historyId;
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            console.error('Error adding checkin (Transaction):', err);
            set({ error: message });
            throw err; // Re-throw so caller knows it failed
        } finally {
            // Always cleanup pending state
            set(state => {
                const updated = new Set(state.pendingCheckins);
                updated.delete(historyId);
                return { pendingCheckins: updated };
            });
        }
    },

    updateCheckin: async (uid, pid, id, data) => {
        const historyRef = doc(db, 'users', uid, 'personalities', pid, 'history', id);
        const maxRetries = 3;
        const baseDelay = 100; // ms

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                console.debug("Updating check-in", { uid, pid, id, data, attempt });

                // Simple updateDoc is sufficient for non-critical fields like comments
                // No need for transaction since we're not modifying scores/stats
                await updateDoc(historyRef, data);

                return; // Success
            } catch (err: unknown) {
                const isLastAttempt = attempt === maxRetries - 1;

                // Check if document doesn't exist (race condition with addCheckin)
                if (err instanceof Error && err.message.includes('No document to update')) {
                    if (!isLastAttempt) {
                        // Exponential backoff: 100ms, 200ms, 400ms
                        const delay = baseDelay * Math.pow(2, attempt);
                        console.debug(`Document not found, retrying in ${delay}ms...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        continue; // Retry
                    }
                }

                // On last attempt or other errors, log and set error state
                const message = err instanceof Error ? err.message : 'Unknown error';
                console.error('Error updating checkin:', err);
                set({ error: message });

                if (isLastAttempt) {
                    throw err; // Re-throw on final failure
                }
            }
        }
    },

    addSystemEvent: async (uid, pid, message, details = {}) => {
        try {
            console.log("Adding system event", { uid, pid, message });
            const historyRef = collection(db, 'users', uid, 'personalities', pid, 'history');
            await addDoc(historyRef, {
                type: 'system',
                protocolId: 'SYSTEM',
                protocolName: message,
                protocolIcon: 'gear',
                timestamp: new Date().toISOString(),
                weight: 0,
                targets: [],
                changes: {},
                details, // New field for metadata
                serverTimestamp: Timestamp.now()
            });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            console.error('Error adding system event:', err);
            set({ error: message });
        }
    },

    deleteCheckin: async (uid, pid, id) => {
        try {
            console.log("Deleting check-in", { uid, pid, id });
            await runTransaction(db, async (transaction) => {
                // 1. ALL READS FIRST
                const historyRef = doc(db, 'users', uid, 'personalities', pid, 'history', id);
                const historyDoc = await transaction.get(historyRef);

                if (!historyDoc.exists()) {
                    throw new Error("Document does not exist!");
                }

                const record = historyDoc.data() as HistoryRecord;

                // Read Innerfaces to revert
                const innerfaceReads: { ref: DocumentReference, currentScore: number }[] = [];
                if (record.changes) {
                    for (const innerfaceId of Object.keys(record.changes)) {
                        const innerfaceRef = doc(db, 'users', uid, 'personalities', pid, 'innerfaces', innerfaceId);
                        const innerfaceDoc = await transaction.get(innerfaceRef);
                        if (innerfaceDoc.exists()) {
                            const data = innerfaceDoc.data();
                            innerfaceReads.push({
                                ref: innerfaceRef,
                                currentScore: data.currentScore ?? data.initialScore ?? 0
                            });
                        }
                    }
                }

                // Read Personality for Stats
                const personalityRef = doc(db, 'users', uid, 'personalities', pid);
                const personalityDoc = await transaction.get(personalityRef);

                // 2. ALL WRITES AFTER

                // Revert Innerface Scores
                if (record.changes) {
                    // Optimization: Map for O(1) lookup
                    const scoreMap = new Map<string, number>();
                    innerfaceReads.forEach(r => scoreMap.set(r.ref.id, r.currentScore));

                    for (const [innerfaceId, weight] of Object.entries(record.changes)) {
                        const innerfaceRef = doc(db, 'users', uid, 'personalities', pid, 'innerfaces', innerfaceId); // Re-create ref to match key
                        const currentScore = scoreMap.get(innerfaceId);

                        if (currentScore !== undefined) {
                            const newScore = computeRevertedScore(currentScore, Number(weight));
                            transaction.update(innerfaceRef, { currentScore: newScore });
                        }
                    }
                }

                // Update Personality Stats (SKIP for System Events)
                if (record.type !== 'system' && personalityDoc.exists()) {
                    const pData = personalityDoc.data() as Personality;
                    const recordXp = weightToXp(record.weight);
                    const plan = planStatsForDelete(pData.stats, recordXp, record.timestamp);

                    if (plan) {
                        const statsUpdate: Record<string, unknown> = {};
                        for (const [path, delta] of Object.entries(plan.decrements)) {
                            statsUpdate[path] = increment(delta);
                        }
                        transaction.update(personalityRef, statsUpdate);
                    }
                }

                // Delete History Record
                transaction.delete(historyRef);
            });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            console.error('Error deleting checkin (Transaction):', err);
            set({ error: message });
        }
    },

    subscribeToHistory: (uid, pid) => {
        set({ isLoading: true });
        const historyRef = collection(db, 'users', uid, 'personalities', pid, 'history');

        // Optimization: Fetch only THIS WEEK's history for the Dashboard widgets (Weekly Focus).
        // This is much more efficient than "Last 100" if activity is low, and matches the UI need.
        // UserProfile now uses atomic counters on the Personality doc, so it doesn't need this full history.
        const startOfCurrentWeek = new Date();
        startOfCurrentWeek.setDate(startOfCurrentWeek.getDate() - 7); // Rough "last 7 days" or "start of week"
        startOfCurrentWeek.setHours(0, 0, 0, 0);

        const q = query(
            historyRef,
            where('timestamp', '>=', startOfCurrentWeek.toISOString()),
            orderBy('timestamp', 'desc')
        );

        console.debug("Subscribing to history (last 7 days)", { uid, pid });

        const unsubscribe = onSnapshot(q, (snapshot) => {
            console.debug("History snapshot received", { count: snapshot.size, source: snapshot.metadata.fromCache ? 'cache' : 'server' });
            const records: HistoryRecord[] = [];
            snapshot.forEach((doc) => {
                records.push({ id: doc.id, ...doc.data() } as HistoryRecord);
            });
            set({ history: records, isLoading: false });
        }, (err) => {
            console.error('Firestore subscription error:', err);
            set({ error: err.message, isLoading: false });
        });

        return unsubscribe;
    }
}));
