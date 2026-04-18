import { insertIntoOrder, upsertInnerfaceOrder } from './groupOrderHelpers';

describe('insertIntoOrder', () => {
    it('appends when list is empty', () => {
        expect(insertIntoOrder([], 'new')).toEqual(['new']);
    });

    it('appends when position is undefined', () => {
        expect(insertIntoOrder(['a', 'b'], 'new')).toEqual(['a', 'b', 'new']);
    });

    it('inserts at position 0', () => {
        expect(insertIntoOrder(['a', 'b'], 'new', 0)).toEqual(['new', 'a', 'b']);
    });

    it('inserts in the middle', () => {
        expect(insertIntoOrder(['a', 'b', 'c'], 'new', 1)).toEqual(['a', 'new', 'b', 'c']);
    });

    it('appends when position exceeds length', () => {
        expect(insertIntoOrder(['a', 'b'], 'new', 99)).toEqual(['a', 'b', 'new']);
    });

    it('appends when position is negative', () => {
        expect(insertIntoOrder(['a', 'b'], 'new', -1)).toEqual(['a', 'b', 'new']);
    });

    it('moves an existing group to a new position', () => {
        expect(insertIntoOrder(['a', 'b', 'c'], 'c', 0)).toEqual(['c', 'a', 'b']);
    });

    it('is idempotent when re-inserting at the same position', () => {
        const once = insertIntoOrder(['a', 'b', 'c'], 'b', 1);
        expect(once).toEqual(['a', 'b', 'c']);
        const twice = insertIntoOrder(once, 'b', 1);
        expect(twice).toEqual(['a', 'b', 'c']);
    });

    it('does not mutate input', () => {
        const input = ['a', 'b'];
        insertIntoOrder(input, 'c', 0);
        expect(input).toEqual(['a', 'b']);
    });
});

describe('upsertInnerfaceOrder', () => {
    it('creates the category bucket if missing', () => {
        const out = upsertInnerfaceOrder({}, 'skill', 'Group A');
        expect(out).toEqual({ skill: ['Group A'] });
    });

    it('appends to an existing bucket', () => {
        const out = upsertInnerfaceOrder({ skill: ['A'] }, 'skill', 'B');
        expect(out).toEqual({ skill: ['A', 'B'] });
    });

    it('inserts at a specific position', () => {
        const out = upsertInnerfaceOrder({ skill: ['A', 'B', 'C'] }, 'skill', 'X', 1);
        expect(out.skill).toEqual(['A', 'X', 'B', 'C']);
    });

    it('preserves other categories untouched', () => {
        const input = {
            skill: ['A'],
            foundation: ['F1', 'F2'],
            uncategorized: ['U'],
        };
        const out = upsertInnerfaceOrder(input, 'skill', 'B');
        expect(out.foundation).toEqual(['F1', 'F2']);
        expect(out.uncategorized).toEqual(['U']);
    });

    it('does not mutate input map', () => {
        const input = { skill: ['A'] };
        upsertInnerfaceOrder(input, 'skill', 'B');
        expect(input).toEqual({ skill: ['A'] });
    });
});
