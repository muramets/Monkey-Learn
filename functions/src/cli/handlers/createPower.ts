import { CreatePowerInput } from '../schemas';
import { resolvePersonality } from '../lib/context';
import { getDb } from '../lib/firestore';

/**
 * Create a new Power (innerface) under the active personality.
 *
 * `initialScore` defaults to 0. When `decay` is provided, the standard
 * {enabled, amount, frequency, interval?} block is persisted; the
 * scheduled Cloud Function picks it up on the next cron tick.
 */
export async function createPower(raw: unknown): Promise<unknown> {
    const input = CreatePowerInput.parse(raw);
    const { uid, id: pid } = await resolvePersonality(input);
    const db = getDb();

    const col = db.collection(`users/${uid}/personalities/${pid}/innerfaces`);
    const ref = col.doc();

    const doc: Record<string, unknown> = {
        name: input.name,
        icon: input.icon ?? '',
        initialScore: input.initialScore ?? 0,
        createdAt: new Date().toISOString(),
    };
    if (input.description !== undefined) doc.description = input.description;
    if (input.hover !== undefined) doc.hover = input.hover;
    if (input.color !== undefined) doc.color = input.color;
    if (input.category !== undefined) doc.category = input.category;
    if (input.priority !== undefined) doc.priority = input.priority;
    if (input.group !== undefined) doc.group = input.group;
    if (input.decay !== undefined) {
        doc.decaySettings = { ...input.decay, interval: input.decay.interval ?? 1 };
    }

    await ref.set(doc);

    return { ok: true, id: ref.id, personalityId: pid, power: { id: ref.id, ...doc } };
}
