import { ListStatesInput } from '../schemas';
import { resolvePersonality } from '../lib/context';
import { getDb } from '../lib/firestore';

/**
 * List active states (dimensions) for a personality.
 */
export async function listStates(raw: unknown): Promise<unknown> {
    const input = ListStatesInput.parse(raw);
    const { uid, id: pid } = await resolvePersonality(input);

    const snap = await getDb()
        .collection(`users/${uid}/personalities/${pid}/states`)
        .get();

    type Row = { id: string; [key: string]: unknown };
    const items: Row[] = snap.docs
        .map((d): Row => ({ ...(d.data() as Record<string, unknown>), id: d.id }))
        .filter((i) => !i.deletedAt);

    items.sort((a, b) => {
        const ao = (a.order as number | undefined) ?? Number.POSITIVE_INFINITY;
        const bo = (b.order as number | undefined) ?? Number.POSITIVE_INFINITY;
        if (ao !== bo) return ao - bo;
        return String(a.name ?? '').localeCompare(String(b.name ?? ''));
    });

    return { items, count: items.length, personalityId: pid };
}
