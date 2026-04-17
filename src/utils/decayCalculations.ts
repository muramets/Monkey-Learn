/**
 * Pure decay calculations shared between the scheduled Cloud Function
 * (admin SDK) and the CLI / any future client. No Firestore, no I/O.
 *
 * Callers perform the actual Firestore reads/writes; these helpers only
 * decide WHETHER to decay, by HOW MUCH, and build the history record
 * payload.
 */

export interface DecaySettings {
    enabled: boolean;
    amount: number;
    frequency: 'day' | 'week' | 'month';
    interval?: number;
    lastDecayDate?: string;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Convert a frequency + interval pair into the minimum inactive days
 * required before decay fires. `interval` defaults to 1.
 *
 * Month is approximated as 30 days — same approximation used by the
 * existing scheduled function.
 */
export function thresholdDays(frequency: DecaySettings['frequency'], interval?: number): number {
    const n = interval || 1;
    switch (frequency) {
        case 'day': return n * 1;
        case 'week': return n * 7;
        case 'month': return n * 30;
    }
}

/**
 * Decide whether decay should apply right now.
 *
 * `lastActivityDateStr` should be the best available activity marker:
 * innerface.lastCheckInDate ?? decaySettings.lastDecayDate ?? innerface.createdAt
 * (resolved by the caller).
 */
export function shouldDecay(
    settings: DecaySettings | undefined | null,
    lastActivityDateStr: string | undefined | null,
    now: Date
): boolean {
    if (!settings || !settings.enabled) return false;
    if (!lastActivityDateStr) return false;

    const lastActivity = new Date(lastActivityDateStr);
    if (Number.isNaN(lastActivity.getTime())) return false;

    const diffDays = (now.getTime() - lastActivity.getTime()) / MS_PER_DAY;
    return diffDays >= thresholdDays(settings.frequency, settings.interval);
}

/**
 * Compute the post-decay score, floored at 0. Mirrors behavior in
 * functions/src/index.ts (checkInnerfaceDecay).
 */
export function computeDecayedScore(
    snapshot: { currentScore?: number; initialScore?: number },
    amount: number
): number {
    const currentScore = snapshot.currentScore ?? snapshot.initialScore ?? 0;
    return Math.max(0, currentScore - amount);
}

/**
 * Shape of a decay history record, SDK-agnostic. The caller adds the
 * serverTimestamp field using its SDK's server-timestamp primitive.
 */
export interface DecayHistoryPayload {
    type: 'decay';
    protocolId: string;
    protocolName: string;
    protocolIcon: string;
    timestamp: string;
    weight: number;
    targets: string[];
    changes: Record<string, number>;
}

/**
 * Build the payload for a decay history record. Canonical naming
 * ('Inactivity Decay' + 'hourglass-half') matches the scheduled function
 * so both CLI-initiated and cron-initiated decays look identical in UI.
 */
export function buildDecayHistoryPayload(
    innerfaceId: string,
    amount: number,
    now: Date
): DecayHistoryPayload {
    return {
        type: 'decay',
        protocolId: 'system-decay',
        protocolName: 'Inactivity Decay',
        protocolIcon: 'hourglass-half',
        timestamp: now.toISOString(),
        weight: -amount,
        targets: [innerfaceId],
        changes: { [innerfaceId]: -amount },
    };
}
