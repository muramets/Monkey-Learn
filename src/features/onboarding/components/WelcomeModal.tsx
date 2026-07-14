import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useOnboardingStore } from '../store/onboardingStore';
import { markTourSeen } from '../utils/onboardingSeen';

const WELCOME_ID = 'welcome';

/**
 * First-run framing, Witcher style: you're the character, this is the map.
 * Shown once per device per user; the "?" button can always reopen tours.
 */
export function WelcomeModal() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { welcomeOpen, closeWelcome, startTour } = useOnboardingStore();

    if (!welcomeOpen) return null;

    const dismiss = () => {
        if (user) markTourSeen(user.uid, WELCOME_ID);
        closeWelcome();
    };

    return createPortal(
        <div
            className="fixed inset-0 z-[800] flex items-center justify-center bg-black/70 p-4"
            onClick={(e) => {
                if (e.target === e.currentTarget) dismiss();
            }}
        >
            <div className="w-full max-w-[440px] rounded-xl bg-[var(--tour-accent)] p-6 font-mono text-[#26282b] shadow-2xl">
                <div className="mb-3 text-lg font-bold lowercase">you are the character</div>
                <div className="flex flex-col gap-3 text-sm leading-relaxed">
                    <p>
                        you have <b>skills</b>. skills grow through <b>actions</b> — small
                        repeatable moves. growing skills opens <b>doors</b>: the life
                        opportunities you actually want.
                    </p>
                    <p>
                        to grow, you need to know which doors to knock on — and how to
                        knock. this app is your action map, with progress you can measure.
                    </p>
                </div>
                <div className="mt-5 flex items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={dismiss}
                        className="cursor-pointer px-3 py-2 text-xs uppercase tracking-wider opacity-60 transition-opacity hover:opacity-100"
                    >
                        i'll explore myself
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            if (user) markTourSeen(user.uid, WELCOME_ID);
                            navigate('/');
                            startTour('dashboard');
                        }}
                        className="cursor-pointer rounded bg-black/25 px-4 py-2 text-xs font-bold transition-colors hover:bg-black/40"
                    >
                        show me around
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
