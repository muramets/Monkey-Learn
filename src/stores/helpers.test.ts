import type { PathContext } from './metadata/types';
import { getPathRoot, getCollectionPath, isViewerMode, guardAgainstViewerMode } from './helpers';

const personalityCtx: PathContext = { type: 'personality', uid: 'u1', pid: 'p1' };
const roleCtx: PathContext = { type: 'role', teamId: 't1', roleId: 'r1' };
const viewerCtx: PathContext = { type: 'viewer', targetUid: 'tu1', personalityId: 'pp1' };

// ---------------------------------------------------------------------------
// getPathRoot
// ---------------------------------------------------------------------------
describe('getPathRoot', () => {
    it('returns correct path for personality context', () => {
        expect(getPathRoot(personalityCtx)).toBe('users/u1/personalities/p1');
    });

    it('returns correct path for role context', () => {
        expect(getPathRoot(roleCtx)).toBe('teams/t1/roles/r1');
    });

    it('returns correct path for viewer context', () => {
        expect(getPathRoot(viewerCtx)).toBe('users/tu1/personalities/pp1');
    });

    it('throws when context is null', () => {
        expect(() => getPathRoot(null)).toThrow('No active context');
    });
});

// ---------------------------------------------------------------------------
// getCollectionPath
// ---------------------------------------------------------------------------
describe('getCollectionPath', () => {
    it('appends collection to personality path', () => {
        expect(getCollectionPath(personalityCtx, 'protocols')).toBe(
            'users/u1/personalities/p1/protocols',
        );
    });

    it('appends collection to personality path (goals)', () => {
        expect(getCollectionPath(personalityCtx, 'goals')).toBe(
            'users/u1/personalities/p1/goals',
        );
    });

    it('appends collection to role path', () => {
        expect(getCollectionPath(roleCtx, 'innerfaces')).toBe(
            'teams/t1/roles/r1/innerfaces',
        );
    });
});

// ---------------------------------------------------------------------------
// isViewerMode
// ---------------------------------------------------------------------------
describe('isViewerMode', () => {
    it('returns true for viewer context', () => {
        expect(isViewerMode(viewerCtx)).toBe(true);
    });

    it('returns false for personality context', () => {
        expect(isViewerMode(personalityCtx)).toBe(false);
    });

    it('returns false for role context', () => {
        expect(isViewerMode(roleCtx)).toBe(false);
    });

    it('returns false for null context', () => {
        expect(isViewerMode(null)).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// guardAgainstViewerMode
// ---------------------------------------------------------------------------
describe('guardAgainstViewerMode', () => {
    it('throws in viewer mode without allowInCoachMode', () => {
        expect(() => guardAgainstViewerMode(viewerCtx)).toThrow();
    });

    it('does NOT throw in viewer mode when allowInCoachMode is true', () => {
        expect(() => guardAgainstViewerMode(viewerCtx, true)).not.toThrow();
    });

    it('does NOT throw for personality context', () => {
        expect(() => guardAgainstViewerMode(personalityCtx)).not.toThrow();
    });

    it('does NOT throw for role context', () => {
        expect(() => guardAgainstViewerMode(roleCtx)).not.toThrow();
    });

    it('does NOT throw for null context', () => {
        expect(() => guardAgainstViewerMode(null)).not.toThrow();
    });
});
