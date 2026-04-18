import { ICON_CATALOG } from './iconCatalog';
import { FA_MAPPED_IDS, ICON_REGISTRY, getIcon, getIconsByCategory, searchIcons } from './iconRegistry';

describe('iconCatalog / iconRegistry sync', () => {
    it('every catalog id has a matching FontAwesome mapping', () => {
        const catalogIds = new Set(ICON_CATALOG.map((e) => e.id));
        const mapped = new Set(FA_MAPPED_IDS);
        const missing = [...catalogIds].filter((id) => !mapped.has(id));
        expect(missing).toEqual([]);
    });

    it('every FA mapping has a matching catalog entry', () => {
        const catalogIds = new Set(ICON_CATALOG.map((e) => e.id));
        const orphan = FA_MAPPED_IDS.filter((id) => !catalogIds.has(id));
        expect(orphan).toEqual([]);
    });

    it('ICON_REGISTRY length matches catalog', () => {
        expect(ICON_REGISTRY.length).toBe(ICON_CATALOG.length);
    });

    it('ICON_REGISTRY entries carry all catalog metadata fields', () => {
        const byId = new Map(ICON_REGISTRY.map((e) => [e.id, e]));
        for (const cat of ICON_CATALOG) {
            const entry = byId.get(cat.id);
            expect(entry).toBeDefined();
            expect(entry!.category).toBe(cat.category);
            expect(entry!.keywords).toEqual(cat.keywords);
            expect(entry!.icon).toBeTruthy();
        }
    });
});

describe('getIcon', () => {
    it('returns a defined FA icon for known id', () => {
        const icon = getIcon('star');
        expect(icon).toBeTruthy();
    });

    it('returns a fallback for unknown id', () => {
        const icon = getIcon('this-icon-does-not-exist');
        expect(icon).toBeTruthy();
    });
});

describe('getIconsByCategory', () => {
    it('filters to the requested category only', () => {
        const media = getIconsByCategory('media');
        expect(media.length).toBeGreaterThan(0);
        expect(media.every((i) => i.category === 'media')).toBe(true);
    });
});

describe('searchIcons', () => {
    it('returns full catalog on empty query', () => {
        expect(searchIcons('').length).toBe(ICON_CATALOG.length);
    });

    it('matches by id substring', () => {
        const out = searchIcons('record');
        expect(out.some((i) => i.id === 'record-vinyl')).toBe(true);
    });

    it('matches by keyword', () => {
        const out = searchIcons('youtube');
        expect(out.some((i) => i.id === 'clapperboard')).toBe(true);
    });

    it('is case-insensitive', () => {
        const lower = searchIcons('music');
        const upper = searchIcons('MUSIC');
        expect(upper.map((i) => i.id).sort()).toEqual(lower.map((i) => i.id).sort());
    });
});
