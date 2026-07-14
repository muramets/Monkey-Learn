import { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useOnboardingStore } from './store/onboardingStore';
import { hasSeenTour } from './utils/onboardingSeen';
import { TourOverlay } from './components/TourOverlay';
import { WelcomeModal } from './components/WelcomeModal';

/**
 * Mounted once inside the authenticated layout: hosts the tour overlay and
 * auto-opens the welcome story for users who haven't seen it on this device.
 */
export function OnboardingRoot() {
    const { user } = useAuth();
    const openWelcome = useOnboardingStore((s) => s.openWelcome);

    useEffect(() => {
        if (user && !hasSeenTour(user.uid, 'welcome')) {
            openWelcome();
        }
    }, [user, openWelcome]);

    return (
        <>
            <WelcomeModal />
            <TourOverlay />
        </>
    );
}
