import { ListPersonalitiesInput } from '../schemas';
import { resolveUid } from '../lib/context';
import { getDb } from '../lib/firestore';

/**
 * List all personalities for the resolved user.
 * Default sort: most recently active first.
 */
export async function listPersonalities(raw: unknown): Promise<unknown> {
    ListPersonalitiesInput.parse(raw);
    const uid = await resolveUid();
    const snap = await getDb().collection(`users/${uid}/personalities`).get();

    const items = snap.docs.map((d) => {
        const data = d.data() as Record<string, unknown>;
        return {
            id: d.id,
            name: data.name,
            description: data.description,
            icon: data.icon,
            lastActiveAt: data.lastActiveAt,
            createdAt: data.createdAt,
            stats: data.stats,
            sourceTeamId: data.sourceTeamId,
            sourceRoleId: data.sourceRoleId,
        };
    });

    items.sort((a, b) => {
        const aAt = (a.lastActiveAt as number | undefined) ?? 0;
        const bAt = (b.lastActiveAt as number | undefined) ?? 0;
        return bAt - aAt;
    });

    return { items, count: items.length };
}
