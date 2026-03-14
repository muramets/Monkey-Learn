import {
    XP_PER_LEVEL,
    PRIORITY_WEIGHTS,
    calculateLevel,
    scoreToXP,
    xpToScore,
    calculateWeightedLevel,
} from './xpUtils';

describe('constants', () => {
    it('XP_PER_LEVEL is 100', () => {
        expect(XP_PER_LEVEL).toBe(100);
    });

    it('PRIORITY_WEIGHTS has correct values', () => {
        expect(PRIORITY_WEIGHTS).toEqual({
            low: 1,
            medium: 3,
            high: 10,
        });
    });
});

describe('calculateLevel', () => {
    it('returns level 0 for 0 XP', () => {
        expect(calculateLevel(0)).toEqual({
            level: 0,
            currentLevelXP: 0,
            progress: 0,
            totalXP: 0,
        });
    });

    it('returns level 0 with 99 XP', () => {
        expect(calculateLevel(99)).toEqual({
            level: 0,
            currentLevelXP: 99,
            progress: 99,
            totalXP: 99,
        });
    });

    it('returns level 1 at exactly 100 XP', () => {
        expect(calculateLevel(100)).toEqual({
            level: 1,
            currentLevelXP: 0,
            progress: 0,
            totalXP: 100,
        });
    });

    it('returns level 5 with 45 currentLevelXP for 545 XP', () => {
        expect(calculateLevel(545)).toEqual({
            level: 5,
            currentLevelXP: 45,
            progress: 45,
            totalXP: 545,
        });
    });

    it('clamps negative XP to 0', () => {
        expect(calculateLevel(-50)).toEqual({
            level: 0,
            currentLevelXP: 0,
            progress: 0,
            totalXP: 0,
        });
    });

    it('handles large XP values', () => {
        const result = calculateLevel(10000);
        expect(result.level).toBe(100);
        expect(result.currentLevelXP).toBe(0);
        expect(result.totalXP).toBe(10000);
    });
});

describe('scoreToXP', () => {
    it('converts 0 to 0', () => {
        expect(scoreToXP(0)).toBe(0);
    });

    it('converts 5.45 to 545', () => {
        expect(scoreToXP(5.45)).toBe(545);
    });

    it('converts 0.01 to 1', () => {
        expect(scoreToXP(0.01)).toBe(1);
    });

    it('rounds 0.005 to 1 via Math.round', () => {
        expect(scoreToXP(0.005)).toBe(1);
    });
});

describe('xpToScore', () => {
    it('converts 0 to 0', () => {
        expect(xpToScore(0)).toBe(0);
    });

    it('converts 545 to 5.45', () => {
        expect(xpToScore(545)).toBe(5.45);
    });

    it('converts 1 to 0.01', () => {
        expect(xpToScore(1)).toBe(0.01);
    });
});

describe('calculateWeightedLevel', () => {
    it('returns level 0 for empty array', () => {
        expect(calculateWeightedLevel([])).toEqual({
            level: 0,
            currentLevelXP: 0,
            progress: 0,
            totalXP: 0,
        });
    });

    it('calculates level for a single medium-priority innerface', () => {
        const result = calculateWeightedLevel([
            { currentScore: 5, priority: 'medium' },
        ]);
        expect(result.level).toBe(5);
        expect(result.totalXP).toBe(500);
    });

    it('calculates weighted average across mixed priorities', () => {
        const result = calculateWeightedLevel([
            { currentScore: 10, priority: 'high' },
            { currentScore: 0, priority: 'low' },
        ]);
        // weighted avg = (10*10 + 0*1) / (10+1) = 100/11 ≈ 9.0909...
        // XP = Math.round(9.0909... * 100) = 909
        expect(result.totalXP).toBe(909);
        expect(result.level).toBe(9);
        expect(result.currentLevelXP).toBe(9);
    });

    it('filters out deleted innerfaces', () => {
        const result = calculateWeightedLevel([
            { currentScore: 5, priority: 'medium', deletedAt: '2024-01-01' },
        ]);
        expect(result).toEqual({
            level: 0,
            currentLevelXP: 0,
            progress: 0,
            totalXP: 0,
        });
    });

    it('treats undefined currentScore as 0', () => {
        const result = calculateWeightedLevel([
            { priority: 'high' },
        ]);
        expect(result.level).toBe(0);
        expect(result.totalXP).toBe(0);
    });

    it('defaults undefined priority to medium', () => {
        const result = calculateWeightedLevel([
            { currentScore: 5 },
        ]);
        // weight = 3 (medium), score = 5 → weighted avg = (5*3)/3 = 5 → XP = 500
        expect(result.totalXP).toBe(500);
        expect(result.level).toBe(5);
    });

    it('includes active and excludes deleted innerfaces in calculation', () => {
        const result = calculateWeightedLevel([
            { currentScore: 10, priority: 'high' },
            { currentScore: 8, priority: 'medium', deletedAt: '2024-06-15' },
            { currentScore: 2, priority: 'low' },
        ]);
        // Only active: high(10, w10) + low(2, w1)
        // weighted avg = (10*10 + 2*1) / (10+1) = 102/11 ≈ 9.2727...
        // XP = Math.round(9.2727... * 100) = 927
        expect(result.totalXP).toBe(927);
        expect(result.level).toBe(9);
        expect(result.currentLevelXP).toBe(27);
    });
});
