import { useCallback, useMemo } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { db } from '../../../config/firebase';
import { collection, doc } from 'firebase/firestore';
import { useHistoryStore } from '../../../stores/historyStore';
import { useMetadataStore } from '../../../stores/metadataStore';
import { usePersonalityStore } from '../../../stores/personalityStore';
import { useUIStore } from '../../../stores/uiStore';
import type { HistoryRecord } from '../../../types/history';
import {
    getInnerfaceScore,
    calculateStateScore,
    calculateInnerfaceScoreAtDate,
    calculateStateScoreAtDate,
} from '../../../utils/scoreUtils';

export type { HistoryRecord as Checkin };

export function useScores() {
    const { user } = useAuth();
    const { history, addCheckin, deleteCheckin, isLoading: isHistoryLoading } = useHistoryStore();
    const { innerfaces, protocols, states, isLoading: isMetadataLoading, loadedCount: metadataLoadedCount } = useMetadataStore();
    const { activePersonalityId } = usePersonalityStore();

    const isLoading = isHistoryLoading || isMetadataLoading;
    const historyProgress = isHistoryLoading ? 0 : 20;
    const metadataProgress = (metadataLoadedCount || 0) * 20;
    const loadingProgress = historyProgress + metadataProgress;

    // --- Score Calculations (delegated to pure utils) ---

    const getScore = useCallback((innerfaceId: number | string) => {
        const innerface = innerfaces.find(i => i.id.toString() === innerfaceId.toString());
        if (!innerface) return 0;
        return getInnerfaceScore(innerface);
    }, [innerfaces]);

    const innerfacesWithScores = useMemo(() =>
        innerfaces.map(innerface => ({
            ...innerface,
            currentScore: getInnerfaceScore(innerface)
        })),
    [innerfaces]);

    const getScoreAtDate = useCallback((innerfaceId: number | string, date: Date) => {
        const innerface = innerfaces.find(i => i.id.toString() === innerfaceId.toString());
        if (!innerface) return 0;
        return calculateInnerfaceScoreAtDate(innerface, date, history);
    }, [innerfaces, history]);

    const statesWithScores = useMemo(() => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        return states.map(state => {
            const validInnerfaceIds = (state.innerfaceIds || []).filter(id =>
                innerfaces.some(i => i.id.toString() === id.toString())
            );
            return {
                ...state,
                innerfaceIds: validInnerfaceIds,
                score: calculateStateScore(state.id, states, getScore),
                yesterdayScore: calculateStateScoreAtDate(state.id, yesterday, states, getScoreAtDate),
            };
        });
    }, [states, innerfaces, getScore, getScoreAtDate]);

    // --- Mutations ---

    const applyProtocol = useCallback(async (protocolId: number | string, direction: '+' | '-' = '+') => {
        const protocol = protocols.find(p => p.id === protocolId);
        if (!protocol) return;

        if (!user || !activePersonalityId) {
            console.warn('Cannot apply protocol: No user logged in or no active personality');
            return;
        }

        const weight = direction === '+' ? protocol.weight : -protocol.weight;
        const changes: Record<string | number, number> = {};
        protocol.targets.forEach(targetId => { changes[targetId] = weight; });

        const newRecord: Omit<HistoryRecord, 'id'> = {
            type: 'protocol',
            protocolId: protocol.id,
            protocolName: protocol.title,
            protocolIcon: protocol.icon,
            timestamp: new Date().toISOString(),
            weight: Number(weight.toFixed(4)),
            targets: protocol.targets,
            changes
        };

        // Optimistic UI
        const collectionRef = collection(db, 'users', user.uid, 'personalities', activePersonalityId, 'history');
        const optimisticId = doc(collectionRef).id;

        const { optimisticUpdateStats } = usePersonalityStore.getState();
        const recordXp = Math.round(weight * 100);
        optimisticUpdateStats(activePersonalityId, 1, recordXp);

        const { showToast, openCommentOverlay } = useUIStore.getState();
        showToast('Check-in Successful', 'success', 'Add Comment [Enter]', () => openCommentOverlay(optimisticId));

        try {
            await addCheckin(user.uid, activePersonalityId, newRecord, true, optimisticId);
        } catch (error) {
            console.error("Optimistic check-in failed:", error);
            optimisticUpdateStats(activePersonalityId, -1, -recordXp);
            const { closeCommentOverlay } = useUIStore.getState();
            closeCommentOverlay();
            showToast('Check-in failed to save', 'error');
        }
    }, [user, activePersonalityId, protocols, addCheckin]);

    const deleteEvent = useCallback(async (id: string) => {
        if (!user || !activePersonalityId) return;
        await deleteCheckin(user.uid, activePersonalityId, id);
    }, [user, activePersonalityId, deleteCheckin]);

    return useMemo(() => ({
        history,
        applyProtocol,
        deleteEvent,
        innerfaces: innerfacesWithScores,
        protocols,
        states: statesWithScores,
        isLoading,
        loadingProgress,
        resetHistory: () => console.warn('Reset history not implemented yet for Firestore'),
    }), [history, applyProtocol, deleteEvent, innerfacesWithScores, protocols, statesWithScores, isLoading, loadingProgress]);
}
