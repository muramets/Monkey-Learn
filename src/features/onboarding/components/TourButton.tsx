import { useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleQuestion } from '@fortawesome/free-solid-svg-icons';
import { useOnboardingStore } from '../store/onboardingStore';
import { tourForRoute } from '../steps/tours';

/**
 * The "?" in the header: replays the guided tour of the current page.
 * Hidden on routes that have no tour (settings, invite).
 */
export function TourButton() {
    const location = useLocation();
    const startTour = useOnboardingStore((s) => s.startTour);
    const tour = tourForRoute(location.pathname);

    if (!tour) return null;

    return (
        <button
            type="button"
            onClick={() => startTour(tour.id)}
            className="cursor-pointer p-2 text-text-secondary transition-colors hover:text-text-primary"
            aria-label="Show page walkthrough"
            title="how this page works"
        >
            <FontAwesomeIcon icon={faCircleQuestion} className="h-4 w-4" />
        </button>
    );
}
