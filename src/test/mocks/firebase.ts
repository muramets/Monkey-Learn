/**
 * Shared Firebase/Firestore mock for tests.
 *
 * Usage in test files:
 *   vi.mock('firebase/firestore', () => firestoreMock());
 *   vi.mock('../../config/firebase', () => ({ db: {} }));
 */

export function firestoreMock() {
    return {
        collection: vi.fn((...args: unknown[]) => args),
        doc: vi.fn(() => ({ id: `mock-doc-${Math.random().toString(36).slice(2, 9)}` })),
        getDoc: vi.fn(),
        getDocs: vi.fn(),
        setDoc: vi.fn(),
        updateDoc: vi.fn(),
        deleteDoc: vi.fn(),
        addDoc: vi.fn(),
        writeBatch: vi.fn(() => ({
            set: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
            commit: vi.fn().mockResolvedValue(undefined),
        })),
        runTransaction: vi.fn(),
        onSnapshot: vi.fn(),
        query: vi.fn(),
        where: vi.fn(),
        orderBy: vi.fn(),
        limit: vi.fn(),
        increment: vi.fn((n: number) => ({ _increment: n })),
        Timestamp: {
            now: vi.fn(() => ({ toDate: () => new Date(), seconds: Math.floor(Date.now() / 1000) })),
            fromDate: vi.fn((d: Date) => ({ toDate: () => d, seconds: Math.floor(d.getTime() / 1000) })),
        },
        serverTimestamp: vi.fn(() => ({ _serverTimestamp: true })),
        getFirestore: vi.fn(),
    };
}
