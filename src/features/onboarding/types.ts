export type TourId = 'dashboard' | 'actions' | 'skills' | 'stats' | 'history';

export interface TourStep {
    /** Matches a `data-tour` attribute somewhere on the page. */
    target: string;
    title: string;
    body: string;
    /** Preferred panel side; falls back automatically when space is tight. */
    placement?: 'top' | 'bottom' | 'left' | 'right';
}

export interface TourDefinition {
    id: TourId;
    /** Route this tour belongs to — the "?" button starts the tour matching the current route. */
    route: string;
    steps: TourStep[];
}
