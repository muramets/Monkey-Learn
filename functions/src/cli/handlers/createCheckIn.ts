import { CreateCheckInInput } from '../schemas';
import { resolvePersonality } from '../lib/context';
import { getDb, FieldValue } from '../lib/firestore';
import { notFound } from '../lib/errors';
import {
    computeCheckinScore,
    weightToXp,
    planStatsForCheckin,
} from '../../../../src/utils/checkinCalculations';
import type { Protocol } from '../../../../src/features/protocols/types';
import type { Innerface } from '../../../../src/features/innerfaces/types';
import type { Personality } from '../../../../src/types/personality';

/**
 * Record a check-in. Admin-SDK mirror of `historyStore.addCheckin`.
 *
 * Five-step transaction (same as the app):
 *   1. Read all target power docs (for score baseline).
 *   2. Read personality doc (for stats).
 *   3. Write history record.
 *   4. Update each target's currentScore + lastCheckInDate.
 *   5. Update personality stats (atomic increments, day/month rollover).
 *
 * `weight` override — if supplied, replaces action.weight for this one
 * check-in. Use it to fire a negative on a normally-positive action
 * ("Kept the flow" → -0.2 when flow actually broke) without defining
 * a mirror action. Protocol attribution (protocolId / protocolName /
 * protocolIcon) remains the same — history shows "Kept the flow -0.2".
 *
 * `idempotencyKey` — when provided, used as the history doc id. Re-runs
 * return `alreadyApplied: true` without side effects.
 */
export async function createCheckIn(raw: unknown): Promise<unknown> {
    const input = CreateCheckInInput.parse(raw);
    const { uid, id: pid } = await resolvePersonality(input);
    const db = getDb();

    const now = input.timestamp ? new Date(input.timestamp) : new Date();
    const isoTimestamp = now.toISOString();

    const actionRef = db.doc(`users/${uid}/personalities/${pid}/protocols/${input.actionId}`);
    const personalityRef = db.doc(`users/${uid}/personalities/${pid}`);
    const historyRef = input.idempotencyKey
        ? db.doc(`users/${uid}/personalities/${pid}/history/${input.idempotencyKey}`)
        : db.collection(`users/${uid}/personalities/${pid}/history`).doc();

    const result = await db.runTransaction(async (tx) => {
        // Idempotency short-circuit — if the same key already produced a
        // record, skip re-applying side effects and return the existing id.
        if (input.idempotencyKey) {
            const existing = await tx.get(historyRef);
            if (existing.exists) {
                return { alreadyApplied: true, id: historyRef.id };
            }
        }

        // READ: Action
        const actionSnap = await tx.get(actionRef);
        if (!actionSnap.exists) {
            throw notFound(`Action not found: ${input.actionId}`);
        }
        const action = actionSnap.data() as Protocol;
        const effectiveWeight = input.weight ?? action.weight;

        // READ: Personality
        const personalitySnap = await tx.get(personalityRef);
        if (!personalitySnap.exists) {
            throw notFound(`Personality not found: ${pid}`);
        }
        const personalityData = personalitySnap.data() as Personality;

        // READ: Each target power (serial — Firestore transactions prohibit
        // reads after the first write and we need data for score compute).
        const targetIds = action.targets.map((t) => String(t));
        const innerfaceUpdates: { ref: FirebaseFirestore.DocumentReference; newScore: number; id: string }[] = [];
        for (const tid of targetIds) {
            const ref = db.doc(`users/${uid}/personalities/${pid}/innerfaces/${tid}`);
            const snap = await tx.get(ref);
            if (!snap.exists) continue;
            const data = snap.data() as Innerface;
            const newScore = computeCheckinScore(data, effectiveWeight);
            innerfaceUpdates.push({ ref, newScore, id: tid });
        }

        const changes: Record<string, number> = {};
        for (const upd of innerfaceUpdates) changes[upd.id] = effectiveWeight;

        const recordXp = weightToXp(effectiveWeight);
        const statsPlan = planStatsForCheckin(personalityData.stats, recordXp, now);

        // WRITES
        const record: Record<string, unknown> = {
            type: 'protocol',
            protocolId: input.actionId,
            protocolName: action.title,
            protocolIcon: action.icon,
            timestamp: isoTimestamp,
            weight: effectiveWeight,
            targets: action.targets,
            changes,
            serverTimestamp: FieldValue.serverTimestamp(),
        };
        if (input.comment) record.comment = input.comment;

        tx.set(historyRef, record);

        for (const upd of innerfaceUpdates) {
            tx.update(upd.ref, {
                currentScore: upd.newScore,
                lastCheckInDate: isoTimestamp,
            });
        }

        if (statsPlan.mode === 'initialize') {
            tx.update(personalityRef, { stats: statsPlan.stats });
        } else {
            const statsUpdate: Record<string, unknown> = { ...statsPlan.resets };
            for (const [p, delta] of Object.entries(statsPlan.increments)) {
                statsUpdate[p] = FieldValue.increment(delta);
            }
            tx.update(personalityRef, statsUpdate);
        }

        return { alreadyApplied: false, id: historyRef.id };
    });

    return {
        ok: true,
        id: result.id,
        alreadyApplied: result.alreadyApplied,
        actionId: input.actionId,
        timestamp: isoTimestamp,
        personalityId: pid,
    };
}
