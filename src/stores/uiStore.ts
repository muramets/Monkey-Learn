import { create } from 'zustand';

interface ToastState {
    message: string;
    type: 'success' | 'error';
    isVisible: boolean;
    actionLabel?: string;
    onAction?: () => void;
}

interface UIState {
    toast: ToastState;
    showToast: (message: string, type?: 'success' | 'error', actionLabel?: string, onAction?: () => void) => void;
    hideToast: () => void;
    commentOverlay: {
        isOpen: boolean;
        checkinId: string | null;
        initialComment?: string;
    };
    openCommentOverlay: (checkinId: string, initialComment?: string) => void;
    closeCommentOverlay: () => void;
}

export const useUIStore = create<UIState>((set) => ({
    toast: {
        message: '',
        type: 'success',
        isVisible: false,
        actionLabel: undefined,
        onAction: undefined,
    },
    commentOverlay: {
        isOpen: false,
        checkinId: null,
    },

    showToast: (message, type = 'success', actionLabel, onAction) => set({
        toast: { message, type, isVisible: true, actionLabel, onAction }
    }),

    hideToast: () => set((state) => ({
        toast: { ...state.toast, isVisible: false }
    })),

    openCommentOverlay: (checkinId, initialComment) => set({
        commentOverlay: { isOpen: true, checkinId, initialComment }
    }),

    closeCommentOverlay: () => set({
        commentOverlay: { isOpen: false, checkinId: null, initialComment: undefined }
    }),
}));
