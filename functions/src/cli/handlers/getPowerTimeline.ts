import { GetPowerTimelineInput } from '../schemas';
import { resolvePersonality } from '../lib/context';
import { getDb } from '../lib/firestore';
import { notFound } from '../lib/errors';
import type { Innerface } from '../../../../src/features/innerfaces/types';
import type { HistoryRecord } from '../../../../src/types/history';

interface TimelinePoint {
    date: string;
    score: number;
    weight: number;
    type: 'start' | HistoryRecord['type'] | 'now';
    eventId: string;
    protocolName?: string;
    comment?: string;
}

/**
 * Raw score timeseries for a power. Intended for decay-graph rendering.
 *
 * Reconstructs the score trajectory by walking the check-in log in order
 * and replaying `changes[powerId]` deltas. The start point is computed by
 * subtracting the window's total delta from the current score, so the
 * series is exact even when older events fall outside the window.
 *
 * Returns array of { date, score, weight, type, eventId, protocolName? }
 * including synthetic `start` and `now` anchors bookending the window.
 */
export async function getPowerTimeline(raw: unknown): Promise<unknown> {
    const input = GetPowerTimelineInput.parse(raw);
    const { uid, id: pid } = await resolvePersonality(input);
    const db = getDb();

    const powerRef = db.doc(`users/${uid}/personalities/${pid}/innerfaces/${input.powerId}`);
    const powerSnap = await powerRef.get();
    if (!powerSnap.exists) {
        throw notFound(`Power not found: ${input.powerId}`);
    }
    const power = powerSnap.data() as Innerface;

    const days = input.days ?? 30;
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const historySnap = await db
        .collection(`users/${uid}/personalities/${pid}/history`)
        .where('timestamp', '>=', since.toISOString())
        .orderBy('timestamp', 'asc')
        .get();

    const events = historySnap.docs
        .map((d) => ({ ...(d.data() as HistoryRecord), id: d.id }))
        .filter((r) => {
            if (!r.changes) return false;
            return (
                input.powerId in r.changes ||
                Number(input.powerId) in r.changes
            );
        });

    const currentScore = power.currentScore ?? power.initialScore ?? 0;
    const totalDelta = events.reduce((acc, e) => {
        const delta = e.changes[input.powerId] ?? e.changes[Number(input.powerId)] ?? 0;
        return acc + Number(delta);
    }, 0);
    const startScore = Math.max(0, currentScore - totalDelta);

    const points: TimelinePoint[] = [];
    points.push({
        date: since.toISOString(),
        score: Number(startScore.toFixed(4)),
        weight: 0,
        type: 'start',
        eventId: 'start',
    });

    let running = startScore;
    for (const e of events) {
        const weight = Number(
            e.changes[input.powerId] ?? e.changes[Number(input.powerId)] ?? 0
        );
        running = Math.max(0, Number((running + weight).toFixed(4)));
        points.push({
            date: e.timestamp,
            score: running,
            weight,
            type: e.type,
            eventId: e.id,
            protocolName: e.protocolName,
            comment: e.comment,
        });
    }

    points.push({
        date: new Date().toISOString(),
        score: Number(currentScore.toFixed(4)),
        weight: 0,
        type: 'now',
        eventId: 'now',
    });

    return {
        power: {
            id: input.powerId,
            name: power.name,
            currentScore,
            initialScore: power.initialScore,
            decaySettings: power.decaySettings,
            lastCheckInDate: power.lastCheckInDate,
            category: power.category,
            priority: power.priority,
        },
        windowDays: days,
        since: since.toISOString(),
        now: new Date().toISOString(),
        points,
        eventCount: events.length,
        personalityId: pid,
    };
}
