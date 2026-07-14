export const DND_SENSORS_CONFIG = {
    mouse: {
        activationConstraint: {
            distance: 10 // Requires 10px movement to start drag (prevents accidental drags on clicks). Increased from 2px for better UX.
        }
    },
    touch: {
        activationConstraint: {
            delay: 250, // Press and hold for 250ms to start drag
            tolerance: 5 // If moved more than 5px during delay, cancel drag (it's a scroll)
        }
    }
} as const;
