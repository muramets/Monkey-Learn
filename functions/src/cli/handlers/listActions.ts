import { ListActionsInput } from '../schemas';
import { resolvePersonality } from '../lib/context';
import { getDb } from '../lib/firestore';

/**
 * List active actions (protocols) for a personality, ordered by `order`
 * then by title.
 */
export async function listActions(raw: unknown): Promise<unknown> {
    const input = ListActionsInput.parse(raw);
    const { uid, id: pid } = await resolvePersonality(input);

    const snap = await getDb()
        .collection(`users/${uid}/personalities/${pid}/protocols`)
        .get();

    type Row = { id: string; [key: string]: unknown };
    const items: Row[] = snap.docs
        .map((d): Row => ({ ...(d.data() as Record<string, unknown>), id: d.id }))
        .filter((i) => !i.deletedAt);

    items.sort((a, b) => {
        const ao = (a.order as number | undefined) ?? Number.POSITIVE_INFINITY;
        const bo = (b.order as number | undefined) ?? Number.POSITIVE_INFINITY;
        if (ao !== bo) return ao - bo;
        return String(a.title ?? '').localeCompare(String(b.title ?? ''));
    });

    return { items, count: items.length, personalityId: pid };
}
