import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MetadataState, PathContext } from './types';
import type { Protocol } from '../../features/protocols/types';

// --- Firestore mocks ---

const mockBatch = {
    set: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
};

vi.mock('firebase/firestore', () => ({
    collection: vi.fn((...args: unknown[]) => args.join('/')),
    doc: vi.fn((...args: unknown[]) => ({ id: args[args.length - 1] || 'auto-id' })),
    addDoc: vi.fn().mockResolvedValue({ id: 'new-doc-id' }),
    updateDoc: vi.fn().mockResolvedValue(undefined),
    writeBatch: vi.fn(() => mockBatch),
    setDoc: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../config/firebase', () => ({ db: 'mock-db' }));

const mockShowToast = vi.fn();
vi.mock('../uiStore', () => ({
    useUIStore: { getState: vi.fn(() => ({ showToast: mockShowToast })) },
}));

const mockAddSystemEvent = vi.fn();
vi.mock('../historyStore', () => ({
    useHistoryStore: { getState: vi.fn(() => ({ addSystemEvent: mockAddSystemEvent })) },
}));

// --- Import slice after mocks ---
import { createProtocolSlice } from './protocolSlice';
import { addDoc, updateDoc, doc, collection } from 'firebase/firestore';

// --- Test helpers ---

const makeProtocols = (): Protocol[] => [
    { id: 'proto1', title: 'Run', description: '', icon: '🏃', weight: 0.05, targets: ['if1'], order: 0 },
    { id: 'proto2', title: 'Read', description: '', icon: '📖', weight: 0.03, targets: [], order: 1 },
];

const makeState = (overrides: Partial<MetadataState> = {}): MetadataState => ({
    context: { type: 'personality', uid: 'u1', pid: 'p1' } as PathContext,
    protocols: makeProtocols(),
    innerfaces: [
        { id: 'if1', name: 'Fitness', icon: '💪', initialScore: 5 },
        { id: 'if2', name: 'Knowledge', icon: '📚', initialScore: 3 },
    ],
    pinnedProtocolIds: ['proto1'],
    // Remaining fields are not used by the slice under test but satisfy the type
    ...overrides,
} as unknown as MetadataState);

// --- Suite ---

describe('protocolSlice', () => {
    type SetFn = (partial: Partial<MetadataState> | ((state: MetadataState) => Partial<MetadataState>)) => void;
    type GetFn = (() => MetadataState) & ReturnType<typeof vi.fn>;

    let mockSet: SetFn;
    let mockGet: GetFn;
    let state: MetadataState;
    let slice: ReturnType<typeof createProtocolSlice>;

    beforeEach(() => {
        vi.clearAllMocks();
        mockBatch.set.mockClear();
        mockBatch.update.mockClear();
        mockBatch.delete.mockClear();
        mockBatch.commit.mockResolvedValue(undefined);

        state = makeState();
        mockSet = vi.fn() as unknown as SetFn;
        mockGet = vi.fn(() => state) as unknown as GetFn;
        slice = createProtocolSlice(mockSet, mockGet);
    });

    // ---------------------------------------------------------------
    // addProtocol
    // ---------------------------------------------------------------
    describe('addProtocol', () => {
        const newProtocol: Omit<Protocol, 'id'> = {
            title: 'Swim',
            description: 'Go swim',
            icon: '🏊',
            weight: 0.02,
            targets: ['if1'],
        };

        it('calls addDoc with correct collection path', async () => {
            await slice.addProtocol(newProtocol);
            expect(collection).toHaveBeenCalledWith('mock-db', 'users/u1/personalities/p1/protocols');
            expect(addDoc).toHaveBeenCalledWith(
                expect.anything(),
                newProtocol,
            );
        });

        it('does not create system events (moved to form hooks)', async () => {
            await slice.addProtocol(newProtocol);
            expect(mockAddSystemEvent).not.toHaveBeenCalled();
        });

        it('throws (caught) in viewer mode', async () => {
            state = makeState({ context: { type: 'viewer', targetUid: 'tu1', personalityId: 'pp1' } });
            mockGet.mockReturnValue(state);
            slice = createProtocolSlice(mockSet, mockGet);

            await expect(slice.addProtocol(newProtocol)).rejects.toThrow('Cannot modify data in coach/viewer mode');
            expect(addDoc).not.toHaveBeenCalled();
        });
    });

    // ---------------------------------------------------------------
    // updateProtocol
    // ---------------------------------------------------------------
    describe('updateProtocol', () => {
        it('calls updateDoc with correct path and data', async () => {
            await slice.updateProtocol('proto1', { title: 'Sprint' });

            expect(doc).toHaveBeenCalledWith('mock-db', 'users/u1/personalities/p1/protocols/proto1');
            expect(updateDoc).toHaveBeenCalledWith(
                expect.objectContaining({ id: 'users/u1/personalities/p1/protocols/proto1' }),
                { title: 'Sprint' },
            );
        });

        it('allows updates in viewer mode (allowInCoachMode=true)', async () => {
            state = makeState({ context: { type: 'viewer', targetUid: 'tu1', personalityId: 'pp1' } });
            mockGet.mockReturnValue(state);
            slice = createProtocolSlice(mockSet, mockGet);

            await slice.updateProtocol('proto1', { title: 'Sprint' });

            // Should NOT show error toast — viewer mode is allowed for updateProtocol
            expect(mockShowToast).not.toHaveBeenCalled();
            expect(updateDoc).toHaveBeenCalled();
        });

        it('does not create system events (moved to form hooks)', async () => {
            await slice.updateProtocol('proto1', { targets: ['if2'] });
            expect(mockAddSystemEvent).not.toHaveBeenCalled();
        });

        it('does not create system events when targets unchanged', async () => {
            await slice.updateProtocol('proto1', { targets: ['if1'] });
            expect(mockAddSystemEvent).not.toHaveBeenCalled();
        });

        it('does not create system events for non-personality context', async () => {
            state = makeState({ context: { type: 'role', teamId: 't1', roleId: 'r1' } });
            mockGet.mockReturnValue(state);
            slice = createProtocolSlice(mockSet, mockGet);

            await slice.updateProtocol('proto1', { targets: ['if2'] });
            expect(mockAddSystemEvent).not.toHaveBeenCalled();
        });
    });

    // ---------------------------------------------------------------
    // deleteProtocol
    // ---------------------------------------------------------------
    describe('deleteProtocol', () => {
        it('soft deletes by setting deletedAt', async () => {
            await slice.deleteProtocol('proto1');
            expect(mockBatch.update).toHaveBeenCalledWith(
                expect.objectContaining({ id: 'users/u1/personalities/p1/protocols/proto1' }),
                expect.objectContaining({ deletedAt: expect.any(String) }),
            );
            expect(mockBatch.commit).toHaveBeenCalled();
        });

        it('removes from pinned if pinned', async () => {
            await slice.deleteProtocol('proto1');

            // proto1 is in pinnedProtocolIds, so settings doc should be batch.set
            expect(mockBatch.set).toHaveBeenCalledWith(
                expect.objectContaining({ id: 'users/u1/personalities/p1/settings/app' }),
                { pinnedProtocolIds: [] },
                { merge: true },
            );
            // Optimistic local update
            expect(mockSet).toHaveBeenCalledWith({ pinnedProtocolIds: [] });
        });

        it('does NOT remove unpinned from pinned list', async () => {
            await slice.deleteProtocol('proto2');

            // proto2 is not pinned — no settings update
            expect(mockBatch.set).not.toHaveBeenCalled();
            expect(mockSet).not.toHaveBeenCalled();
        });

        it('blocks in viewer mode', async () => {
            state = makeState({ context: { type: 'viewer', targetUid: 'tu1', personalityId: 'pp1' } });
            mockGet.mockReturnValue(state);
            slice = createProtocolSlice(mockSet, mockGet);

            await expect(slice.deleteProtocol('proto1')).rejects.toThrow('Cannot modify data in coach/viewer mode');
            expect(mockBatch.update).not.toHaveBeenCalled();
        });
    });

    // ---------------------------------------------------------------
    // restoreProtocol
    // ---------------------------------------------------------------
    describe('restoreProtocol', () => {
        const deletedProtocol: Protocol = {
            id: 'proto1',
            title: 'Run',
            description: '',
            icon: '🏃',
            weight: 0.05,
            targets: ['if1'],
            order: 0,
            deletedAt: '2026-01-01T00:00:00.000Z',
        };

        it('clears deletedAt via updateDoc', async () => {
            await slice.restoreProtocol(deletedProtocol);

            expect(doc).toHaveBeenCalledWith('mock-db', 'users/u1/personalities/p1/protocols/proto1');
            expect(updateDoc).toHaveBeenCalledWith(
                expect.objectContaining({ id: 'users/u1/personalities/p1/protocols/proto1' }),
                { deletedAt: null },
            );
        });

        it('blocks in viewer mode', async () => {
            state = makeState({ context: { type: 'viewer', targetUid: 'tu1', personalityId: 'pp1' } });
            mockGet.mockReturnValue(state);
            slice = createProtocolSlice(mockSet, mockGet);

            await expect(slice.restoreProtocol(deletedProtocol)).rejects.toThrow('Cannot modify data in coach/viewer mode');
            expect(updateDoc).not.toHaveBeenCalled();
        });
    });

    // ---------------------------------------------------------------
    // reorderProtocols
    // ---------------------------------------------------------------
    describe('reorderProtocols', () => {
        it('updates local state and fires batch write', async () => {
            await slice.reorderProtocols(['proto2', 'proto1']);

            // Optimistic local update via set()
            expect(mockSet).toHaveBeenCalledWith(
                expect.objectContaining({
                    protocols: expect.arrayContaining([
                        expect.objectContaining({ id: 'proto2', order: 0 }),
                        expect.objectContaining({ id: 'proto1', order: 1 }),
                    ]),
                }),
            );

            // Firestore batch writes — one per id
            expect(mockBatch.update).toHaveBeenCalledTimes(2);
            expect(mockBatch.update).toHaveBeenCalledWith(
                expect.objectContaining({ id: 'users/u1/personalities/p1/protocols/proto2' }),
                { order: 0 },
            );
            expect(mockBatch.update).toHaveBeenCalledWith(
                expect.objectContaining({ id: 'users/u1/personalities/p1/protocols/proto1' }),
                { order: 1 },
            );
            expect(mockBatch.commit).toHaveBeenCalled();
        });

        it('blocks in viewer mode', async () => {
            state = makeState({ context: { type: 'viewer', targetUid: 'tu1', personalityId: 'pp1' } });
            mockGet.mockReturnValue(state);
            slice = createProtocolSlice(mockSet, mockGet);

            await expect(slice.reorderProtocols(['proto2', 'proto1'])).rejects.toThrow('Cannot modify data in coach/viewer mode');
            expect(mockBatch.update).not.toHaveBeenCalled();
        });
    });

    // ---------------------------------------------------------------
    // path resolution
    // ---------------------------------------------------------------
    describe('path resolution', () => {
        it('personality context builds users/{uid}/personalities/{pid} path', async () => {
            await slice.addProtocol({ title: 'X', description: '', icon: '', weight: 0, targets: [] });
            expect(collection).toHaveBeenCalledWith('mock-db', 'users/u1/personalities/p1/protocols');
        });

        it('role context builds teams/{teamId}/roles/{roleId} path', async () => {
            state = makeState({ context: { type: 'role', teamId: 't1', roleId: 'r1' } });
            mockGet.mockReturnValue(state);
            slice = createProtocolSlice(mockSet, mockGet);

            await slice.addProtocol({ title: 'X', description: '', icon: '', weight: 0, targets: [] });
            expect(collection).toHaveBeenCalledWith('mock-db', 'teams/t1/roles/r1/protocols');
        });

        it('viewer context builds users/{targetUid}/personalities/{personalityId} path but blocks mutation', async () => {
            state = makeState({ context: { type: 'viewer', targetUid: 'tu1', personalityId: 'pp1' } });
            mockGet.mockReturnValue(state);
            slice = createProtocolSlice(mockSet, mockGet);

            await expect(slice.deleteProtocol('proto1')).rejects.toThrow('Cannot modify data in coach/viewer mode');
            expect(mockBatch.commit).not.toHaveBeenCalled();
        });

        it('viewer context path is used for updateProtocol (allowInCoachMode)', async () => {
            state = makeState({
                context: { type: 'viewer', targetUid: 'tu1', personalityId: 'pp1' },
            });
            mockGet.mockReturnValue(state);
            slice = createProtocolSlice(mockSet, mockGet);

            await slice.updateProtocol('proto1', { title: 'New' });

            expect(doc).toHaveBeenCalledWith(
                'mock-db',
                'users/tu1/personalities/pp1/protocols/proto1',
            );
            expect(updateDoc).toHaveBeenCalled();
        });
    });
});
