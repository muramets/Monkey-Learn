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
 * Create or update a group: sets `groupsMetadata[name]` (icon + color) and
 * inserts/moves the group in the relevant order array(s).
 *
 * `kind`:
 *   - 'protocol'   → touches `protocolGroupOrder` only
 *   - 'innerface'  → touches `innerfaceGroupOrder[category]` only (category required)
 *   - 'both'       → touches both arrays (category required for innerface bucket)
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

    const patch: Record<string, unknown> = {};

    // Merge just this one group into the map — other groups untouched.
    patch[`groupsMetadata.${input.name}`] = metadata;

    if (input.kind === 'protocol' || input.kind === 'both') {
        patch.protocolGroupOrder = insertIntoOrder(
            settings.protocolGroupOrder ?? [],
            input.name,
            input.position
        );
    }

    if (input.kind === 'innerface' || input.kind === 'both') {
        patch.innerfaceGroupOrder = upsertInnerfaceOrder(
            settings.innerfaceGroupOrder ?? {},
            input.category as InnerfaceOrderCategory,
            input.name,
            input.position
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
