import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { usePlanningStore } from './planningStore';
import type { PathContext } from './metadata/types';

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((...args: unknown[]) => args.join('/')),
  doc: vi.fn((...args: unknown[]) => ({ id: args[args.length - 1], path: args.join('/') })),
  setDoc: vi.fn().mockResolvedValue(undefined),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
  query: vi.fn(),
  onSnapshot: vi.fn(),
}));

vi.mock('../config/firebase', () => ({ db: 'mock-db' }));

beforeEach(() => {
  usePlanningStore.setState({ goals: {}, isLoading: false, error: null });
  vi.clearAllMocks();
});

describe('setGoal', () => {
  it('calls setDoc with merge and correct path for personality context', async () => {
    const context: PathContext = { type: 'personality', uid: 'u1', pid: 'p1' };
    const goal = { innerfaceId: 'if1', targetScore: 5, balance: {} };

    await usePlanningStore.getState().setGoal(context, goal);

    expect(doc).toHaveBeenCalledWith('mock-db', 'users/u1/personalities/p1/goals', 'if1');

    expect(setDoc).toHaveBeenCalledOnce();
    const [, payload, options] = vi.mocked(setDoc).mock.calls[0];
    expect(options).toEqual({ merge: true });
    expect(payload).toMatchObject({
      innerfaceId: 'if1',
      targetScore: 5,
      balance: {},
    });
    expect(payload).toHaveProperty('updatedAt');
    expect(payload).toHaveProperty('createdAt');
    expect(typeof (payload as Record<string, unknown>).updatedAt).toBe('number');
    expect(typeof (payload as Record<string, unknown>).createdAt).toBe('number');
  });

  it('calls setDoc with correct path for role context', async () => {
    const context: PathContext = { type: 'role', teamId: 't1', roleId: 'r1' };
    const goal = { innerfaceId: 'if2', targetScore: 3, balance: {} };

    await usePlanningStore.getState().setGoal(context, goal);

    expect(doc).toHaveBeenCalledWith('mock-db', 'teams/t1/roles/r1/goals', 'if2');
    expect(setDoc).toHaveBeenCalledOnce();
  });

  it('sets error state on failure', async () => {
    vi.mocked(setDoc).mockRejectedValueOnce(new Error('write failed'));

    const context: PathContext = { type: 'personality', uid: 'u1', pid: 'p1' };
    const goal = { innerfaceId: 'if1', targetScore: 5, balance: {} };

    await usePlanningStore.getState().setGoal(context, goal);

    expect(usePlanningStore.getState().error).toBe('write failed');
  });
});

describe('deleteGoal', () => {
  it('calls deleteDoc and removes from local state', async () => {
    usePlanningStore.setState({
      goals: {
        if1: {
          innerfaceId: 'if1',
          targetScore: 5,
          balance: {},
          createdAt: 1000,
          updatedAt: 1000,
        },
      },
    });

    const context: PathContext = { type: 'personality', uid: 'u1', pid: 'p1' };

    await usePlanningStore.getState().deleteGoal(context, 'if1');

    expect(deleteDoc).toHaveBeenCalledOnce();
    expect(doc).toHaveBeenCalledWith('mock-db', 'users/u1/personalities/p1/goals', 'if1');
    expect(usePlanningStore.getState().goals).not.toHaveProperty('if1');
  });

  it('sets error state on failure', async () => {
    vi.mocked(deleteDoc).mockRejectedValueOnce(new Error('delete failed'));

    const context: PathContext = { type: 'personality', uid: 'u1', pid: 'p1' };

    await usePlanningStore.getState().deleteGoal(context, 'if1');

    expect(usePlanningStore.getState().error).toBe('delete failed');
  });
});

describe('clearGoals', () => {
  it('resets goals to empty and loading to false', () => {
    usePlanningStore.setState({
      goals: {
        if1: {
          innerfaceId: 'if1',
          targetScore: 5,
          balance: {},
          createdAt: 1000,
          updatedAt: 1000,
        },
      },
      isLoading: true,
      error: 'some error',
    });

    usePlanningStore.getState().clearGoals();

    const state = usePlanningStore.getState();
    expect(state.goals).toEqual({});
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });
});
