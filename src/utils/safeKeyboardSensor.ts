import { KeyboardSensor } from '@dnd-kit/core';

/**
 * dnd-kit's stock KeyboardSensor activates on any Enter/Space keydown that
 * reaches the draggable wrapper — including events *bubbling* from child
 * controls (check-in buttons, inputs). That let an Enter meant for the
 * "Add Comment" toast start a keyboard drag that nothing ever finished,
 * leaving the app stuck with a grabbing cursor and dead hover states.
 *
 * This sensor only activates when the draggable node itself is the event
 * target, which is exactly the keyboard-a11y case (Tab onto the item, then
 * Enter/Space). Bubbled keys from children never start a drag.
 */
export class SafeKeyboardSensor extends KeyboardSensor {
    static activators: (typeof KeyboardSensor)['activators'] = [
        {
            eventName: 'onKeyDown',
            handler: (event, args, context) => {
                if (event.target !== event.currentTarget) return false;
                return KeyboardSensor.activators[0].handler(event, args, context);
            },
        },
    ];
}
