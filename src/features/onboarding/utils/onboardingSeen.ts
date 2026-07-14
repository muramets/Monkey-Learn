/**
 * Per-user "seen" flags for onboarding, kept in localStorage. Device-local
 * on purpose: a new device gets the welcome once and never again, without
 * touching the Firestore schema.
 */

const key = (uid: string) => `onboarding:${uid}`;

export function getSeenTours(uid: string): Set<string> {
    try {
        const raw = localStorage.getItem(key(uid));
        return new Set(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
        return new Set();
    }
}

export function markTourSeen(uid: string, id: string): void {
    const seen = getSeenTours(uid);
    seen.add(id);
    localStorage.setItem(key(uid), JSON.stringify([...seen]));
}

export function hasSeenTour(uid: string, id: string): boolean {
    return getSeenTours(uid).has(id);
}
