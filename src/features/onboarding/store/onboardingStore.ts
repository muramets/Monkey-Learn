import { create } from 'zustand';
import type { TourId } from '../types';

interface OnboardingState {
    activeTourId: TourId | null;
    stepIndex: number;
    welcomeOpen: boolean;
    startTour: (id: TourId) => void;
    stopTour: () => void;
    nextStep: (totalSteps: number) => void;
    prevStep: () => void;
    openWelcome: () => void;
    closeWelcome: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
    activeTourId: null,
    stepIndex: 0,
    welcomeOpen: false,

    startTour: (id) => set({ activeTourId: id, stepIndex: 0, welcomeOpen: false }),
    stopTour: () => set({ activeTourId: null, stepIndex: 0 }),
    nextStep: (totalSteps) =>
        set((s) =>
            s.stepIndex + 1 >= totalSteps
                ? { activeTourId: null, stepIndex: 0 }
                : { stepIndex: s.stepIndex + 1 }
        ),
    prevStep: () => set((s) => ({ stepIndex: Math.max(0, s.stepIndex - 1) })),
    openWelcome: () => set({ welcomeOpen: true }),
    closeWelcome: () => set({ welcomeOpen: false }),
}));
