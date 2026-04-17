import { CreateActionInput } from '../schemas';
import { resolvePersonality } from '../lib/context';
import { getDb } from '../lib/firestore';
import { notFound, validationError } from '../lib/errors';

/**
 * Create a new Action (protocol) under the active personality.
 *
 * All `targets` must reference existing, non-deleted powers. `weight`
 * is the signed score delta applied per check-in (app displays XP as
 * `weight * 100`).
 */
export async function createAction(raw: unknown): Promise<unknown> {
    const input = CreateActionInput.parse(raw);
    const { uid, id: pid } = await resolvePersonality(input);
    const db = getDb();

    // Validate all target powers exist and aren't soft-deleted.
    const targetSnaps = await Promise.all(
        input.targets.map((tid) =>
            db.doc(`users/${uid}/personalities/${pid}/innerfaces/${tid}`).get()
        )
    );
    const missing: string[] = [];
    const deleted: string[] = [];
    targetSnaps.forEach((snap, i) => {
        const tid = input.targets[i];
        if (!snap.exists) {
            missing.push(tid);
        } else if ((snap.data() as { deletedAt?: string }).deletedAt) {
            deleted.push(tid);
        }
    });
    if (missing.length > 0) {
        throw notFound(`Targets not found: ${missing.join(', ')}`, { missing });
    }
    if (deleted.length > 0) {
        throw validationError(`Targets are deleted: ${deleted.join(', ')}`, { deleted });
    }

    const col = db.collection(`users/${uid}/personalities/${pid}/protocols`);
    const ref = col.doc();

    const doc: Record<string, unknown> = {
        title: input.title,
        description: input.description,
        icon: input.icon ?? '',
        weight: input.weight,
        targets: input.targets,
    };
    if (input.color !== undefined) doc.color = input.color;
    if (input.hover !== undefined) doc.hover = input.hover;
    if (input.instruction !== undefined) doc.instruction = input.instruction;
    if (input.group !== undefined) doc.group = input.group;

    await ref.set(doc);

    return { ok: true, id: ref.id, personalityId: pid, action: { id: ref.id, ...doc } };
}
