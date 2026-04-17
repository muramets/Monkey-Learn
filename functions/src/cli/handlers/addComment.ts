import { AddCommentInput } from '../schemas';
import { resolvePersonality } from '../lib/context';
import { getDb } from '../lib/firestore';
import { notFound } from '../lib/errors';

/**
 * Set or replace the `comment` field on an existing check-in.
 * Mirrors the behavior of `historyStore.updateCheckin` for the comment
 * field specifically (no scores or stats are touched).
 */
export async function addComment(raw: unknown): Promise<unknown> {
    const input = AddCommentInput.parse(raw);
    const { uid, id: pid } = await resolvePersonality(input);
    const db = getDb();

    const ref = db.doc(`users/${uid}/personalities/${pid}/history/${input.checkInId}`);
    const snap = await ref.get();
    if (!snap.exists) {
        throw notFound(`Check-in not found: ${input.checkInId}`);
    }

    await ref.update({ comment: input.comment });

    return { ok: true, id: input.checkInId, comment: input.comment };
}
