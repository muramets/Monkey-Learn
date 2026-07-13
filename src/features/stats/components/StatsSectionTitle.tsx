import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

/**
 * MonkeyType H3 port: icon + lowercase label in sub color above a section.
 */
export function StatsSectionTitle({ icon, text }: { icon: IconDefinition; text: string }) {
    return (
        <h3 className="flex items-center gap-[0.5em] pb-[0.5em] text-[1em] text-sub">
            <FontAwesomeIcon icon={icon} fixedWidth />
            {text}
        </h3>
    );
}
