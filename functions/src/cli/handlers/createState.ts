import { CreateStateInput } from '../schemas';
import { resolvePersonality } from '../lib/context';
import { getDb } from '../lib/firestore';

/**
 * Create a new State (composite dimension).
 * The app computes `score` as the average of referenced powers/states at read time,
 * so we do not seed a score here.
 */
export async function createState(raw: unknown): Promise<unknown> {
    const input = CreateStateInput.parse(raw);
    const { uid, id: pid } = await resolvePersonality(input);
    const db = getDb();

    const col = db.collection(`users/${uid}/personalities/${pid}/states`);
    const ref = col.doc();

    const doc: Record<string, unknown> = {
        name: input.name,
    };
    if (input.icon !== undefined) doc.icon = input.icon;
    if (input.subtext !== undefined) doc.subtext = input.subtext;
    if (input.description !== undefined) doc.description = input.description;
    if (input.hover !== undefined) doc.hover = input.hover;
    if (input.color !== undefined) doc.color = input.color;
    if (input.innerfaceIds !== undefined) doc.innerfaceIds = input.innerfaceIds;
    if (input.stateIds !== undefined) doc.stateIds = input.stateIds;

    await ref.set(doc);

    return { ok: true, id: ref.id, personalityId: pid, state: { id: ref.id, ...doc } };
}
