import { ListCheckInsInput } from '../schemas';
import { resolvePersonality } from '../lib/context';
import { getDb } from '../lib/firestore';
import type { HistoryRecord } from '../../../../src/types/history';

/**
 * List check-ins (history records) from newest to oldest.
 * Supports filtering by time range, by action, by target power, and
 * by record type (protocol / decay / manual_adjustment / system).
 */
export async function listCheckIns(raw: unknown): Promise<unknown> {
    const input = ListCheckInsInput.parse(raw);
    const { uid, id: pid } = await resolvePersonality(input);
    const db = getDb();

    let query: FirebaseFirestore.Query = db.collection(
        `users/${uid}/personalities/${pid}/history`
    );

    if (input.since) query = query.where('timestamp', '>=', input.since);
    if (input.until) query = query.where('timestamp', '<=', input.until);
    query = query.orderBy('timestamp', 'desc');
    query = query.limit(input.limit ?? 100);

    const snap = await query.get();
    type Row = { id: string; [key: string]: unknown };
    let items: Row[] = snap.docs.map((d) => ({ ...(d.data() as Record<string, unknown>), id: d.id }));

    if (input.types && input.types.length > 0) {
        items = items.filter((r) => input.types!.includes(r.type as HistoryRecord['type']));
    }
    if (input.actionId) {
        items = items.filter((r) => String(r.protocolId) === input.actionId);
    }
    if (input.powerId) {
        items = items.filter((r) => {
            const changes = r.changes as Record<string, unknown> | undefined;
            return changes !== undefined && input.powerId! in changes;
        });
    }

    return { items, count: items.length, personalityId: pid };
}
