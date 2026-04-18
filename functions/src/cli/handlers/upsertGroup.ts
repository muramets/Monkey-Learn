import { UpsertGroupInput } from '../schemas';
import { resolvePersonality } from '../lib/context';
import { getDb } from '../lib/firestore';
import { validationError } from '../lib/errors';
import {
    insertIntoOrder,
    upsertInnerfaceOrder,
    type InnerfaceOrderCategory,
} from '../../../../src/utils/groupOrderHelpers';
import { ICON_CATALOG } from '../../../../src/config/iconCatalog';

const VALID_ICON_IDS = new Set(ICON_CATALOG.map((e) => e.id));

/**
 * Create or update a group: sets `groupsMetadata[name]` (icon + color),
 * and optionally inserts/moves the group in the relevant order array(s).
 *
 * `kind` (optional):
 *   - omitted      → metadata-only update. Order arrays are untouched,
 *                    which is what you want when tweaking icon/color on
 *                    an existing group without reordering it.
 *   - 'protocol'   → touches `protocolGroupOrder`
 *   - 'innerface'  → touches `innerfaceGroupOrder[category]` (category required)
 *   - 'both'       → touches both arrays (category required for innerface bucket)
 *
 * `position` (optional, requires `kind`):
 *   - omitted: group gets appended if not yet in order; otherwise its
 *     existing position is preserved (no accidental moves).
 *   - provided: group moves to that 0-based position (or appended if
 *     position >= length).
 *
 * `icon` must be a known id from the icon catalog. Use `listIcons` to
 * discover valid ids.
 *
 * Existing powers / actions referencing this group by name keep their
 * references — this handler does not rename or move items.
 */
export async function upsertGroup(raw: unknown): Promise<unknown> {
    const input = UpsertGroupInput.parse(raw);

    if (input.icon !== undefined && !VALID_ICON_IDS.has(input.icon)) {
        throw validationError(`Unknown icon id: ${input.icon}. Use listIcons to discover valid ids.`);
    }

    const { uid, id: pid } = await resolvePersonality(input);
    const db = getDb();
    const settingsRef = db.doc(`users/${uid}/personalities/${pid}/settings/app`);
    const settingsSnap = await settingsRef.get();
    const settings = (settingsSnap.data() as {
        groupsMetadata?: Record<string, { icon?: string; color?: string }>;
        protocolGroupOrder?: string[];
        innerfaceGroupOrder?: Record<string, string[]>;
    }) ?? {};

    const metadata: { icon?: string; color?: string } = {
        ...(settings.groupsMetadata?.[input.name] ?? {}),
    };
    if (input.icon !== undefined) metadata.icon = input.icon;
    if (input.color !== undefined) metadata.color = input.color;

    // With set({ merge: true }), dot-notation keys become literal top-level
    // fields — not nested paths. So we build the patch as a nested object:
    // { groupsMetadata: { [name]: metadata } } and let Firestore deep-merge.
    const patch: Record<string, unknown> = {
        groupsMetadata: { [input.name]: metadata },
    };

    const touchProtocol = input.kind === 'protocol' || input.kind === 'both';
    const touchInnerface = input.kind === 'innerface' || input.kind === 'both';

    if (touchProtocol) {
        const currentOrder = settings.protocolGroupOrder ?? [];
        const alreadyAt = currentOrder.indexOf(input.name);
        // Preserve existing position if the caller didn't ask for a move.
        const targetPosition = input.position ?? (alreadyAt >= 0 ? alreadyAt : undefined);
        patch.protocolGroupOrder = insertIntoOrder(currentOrder, input.name, targetPosition);
    }

    if (touchInnerface) {
        const category = input.category as InnerfaceOrderCategory;
        const bucket = settings.innerfaceGroupOrder?.[category] ?? [];
        const alreadyAt = bucket.indexOf(input.name);
        const targetPosition = input.position ?? (alreadyAt >= 0 ? alreadyAt : undefined);
        patch.innerfaceGroupOrder = upsertInnerfaceOrder(
            settings.innerfaceGroupOrder ?? {},
            category,
            input.name,
            targetPosition
        );
    }

    await settingsRef.set(patch, { merge: true });

    return {
        ok: true,
        personalityId: pid,
        name: input.name,
        kind: input.kind,
        category: input.category,
        metadata,
        protocolGroupOrder: patch.protocolGroupOrder,
        innerfaceGroupOrder: patch.innerfaceGroupOrder,
    };
}
