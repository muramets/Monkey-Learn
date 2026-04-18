/**
 * Pure helpers for manipulating group-order arrays in settings/app.
 *
 * Groups are ordered by two structures:
 *   - `protocolGroupOrder: string[]`
 *   - `innerfaceGroupOrder: Record<category, string[]>`
 *     where category ∈ {'skill', 'foundation', 'uncategorized'}
 *
 * These helpers compute the next array shape; callers persist via their
 * own Firestore SDK.
 */

export type InnerfaceOrderCategory = 'skill' | 'foundation' | 'uncategorized';

/**
 * Insert (or move) a group name into an ordered list.
 *
 * - If `name` already exists, it is first removed from its current spot.
 * - If `position` is undefined, >= list length, or negative, the group is
 *   appended to the end.
 * - Otherwise the group lands at exactly `position` (0-based).
 *
 * Pure — does not mutate `current`.
 */
export function insertIntoOrder(
    current: readonly string[],
    name: string,
    position?: number
): string[] {
    const filtered = current.filter((g) => g !== name);
    if (position === undefined || position < 0 || position >= filtered.length) {
        return [...filtered, name];
    }
    return [...filtered.slice(0, position), name, ...filtered.slice(position)];
}

/**
 * Compute the next `innerfaceGroupOrder` after inserting/moving a group
 * name under a specific category. Other categories are preserved.
 */
export function upsertInnerfaceOrder(
    current: Readonly<Record<string, readonly string[]>>,
    category: InnerfaceOrderCategory,
    name: string,
    position?: number
): Record<string, string[]> {
    const next: Record<string, string[]> = {};
    for (const [cat, order] of Object.entries(current)) {
        next[cat] = [...order];
    }
    next[category] = insertIntoOrder(current[category] ?? [], name, position);
    return next;
}
