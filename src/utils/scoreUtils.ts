import type { Innerface } from '../features/innerfaces/types';
import type { HistoryRecord } from '../types/history';

interface StateData {
    id: string;
    innerfaceIds?: (string | number)[];
    stateIds?: string[];
}

/**
 * Returns the effective score for an innerface.
 * Uses currentScore if available, falls back to initialScore.
 */
export function getInnerfaceScore(innerface: Pick<Innerface, 'currentScore' | 'initialScore'>): number {
    if (innerface.currentScore !== undefined) {
        return innerface.currentScore;
    }
    return Math.max(0, innerface.initialScore);
}

/**
 * Calculates the average score of a state by recursively averaging
 * its child innerfaces and child states.
 * Includes cycle detection to prevent infinite loops.
 */
export function calculateStateScore(
    stateId: string,
    states: StateData[],
    innerfaceScoreFn: (id: string | number) => number,
    visited = new Set<string>()
): number {
    if (visited.has(stateId)) return 0;
    visited.add(stateId);

    const state = states.find(s => s.id === stateId);
    if (!state) return 0;

    let total = 0;
    let count = 0;

    if (state.innerfaceIds) {
        state.innerfaceIds.forEach(id => {
            total += innerfaceScoreFn(id);
            count++;
        });
    }

    if (state.stateIds) {
        state.stateIds.forEach(id => {
            total += calculateStateScore(id, states, innerfaceScoreFn, visited);
            count++;
        });
    }

    return count > 0 ? total / count : 0;
}

/**
 * Calculates what an innerface's score was at the end of a given date
 * by reversing history records that occurred after that date.
 */
export function calculateInnerfaceScoreAtDate(
    innerface: Pick<Innerface, 'id' | 'currentScore' | 'initialScore'>,
    date: Date,
    history: HistoryRecord[]
): number {
    let simulatedScore = innerface.currentScore ?? innerface.initialScore;

    const targetEndTime = new Date(date);
    targetEndTime.setHours(23, 59, 59, 999);

    for (const record of history) {
        const recordDate = new Date(record.timestamp);
        if (recordDate <= targetEndTime) break;

        if (record.changes && record.changes[innerface.id] !== undefined) {
            simulatedScore -= record.changes[innerface.id];
        }
    }

    return Math.max(0, simulatedScore);
}

/**
 * Calculates a state's score at a given date by recursively averaging
 * historical innerface and child state scores.
 */
export function calculateStateScoreAtDate(
    stateId: string,
    date: Date,
    states: StateData[],
    innerfaceScoreAtDateFn: (id: string | number, date: Date) => number,
    visited = new Set<string>()
): number {
    if (visited.has(stateId)) return 0;
    visited.add(stateId);

    const state = states.find(s => s.id === stateId);
    if (!state) return 0;

    let total = 0;
    let count = 0;

    if (state.innerfaceIds) {
        state.innerfaceIds.forEach(id => {
            total += innerfaceScoreAtDateFn(id, date);
            count++;
        });
    }

    if (state.stateIds) {
        state.stateIds.forEach(id => {
            total += calculateStateScoreAtDate(id, date, states, innerfaceScoreAtDateFn, visited);
            count++;
        });
    }

    return count > 0 ? total / count : 0;
}
