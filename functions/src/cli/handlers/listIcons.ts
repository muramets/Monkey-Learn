import { ListIconsInput } from '../schemas';
import { ICON_CATALOG, ICON_CATEGORIES } from '../../../../src/config/iconCatalog';

/**
 * List available icon ids grouped by category. Returns the same
 * metadata the app renders in its icon picker, minus the FontAwesome
 * IconDefinitions (which are useless outside the browser anyway).
 *
 * Filters:
 *   - `category` — exact category id match (e.g. "media")
 *   - `query`    — case-insensitive substring match against id and keywords
 */
export async function listIcons(raw: unknown): Promise<unknown> {
    const input = ListIconsInput.parse(raw);
    let items = ICON_CATALOG.map((e) => ({ id: e.id, category: e.category, keywords: e.keywords }));

    if (input.category) {
        items = items.filter((i) => i.category === input.category);
    }

    if (input.query) {
        const q = input.query.toLowerCase().trim();
        if (q) {
            items = items.filter(
                (i) => i.id.includes(q) || i.keywords.some((kw) => kw.toLowerCase().includes(q))
            );
        }
    }

    return {
        items,
        count: items.length,
        categories: ICON_CATEGORIES,
    };
}
