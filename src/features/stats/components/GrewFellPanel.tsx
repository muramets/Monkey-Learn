import { faArrowTrendUp, faArrowTrendDown } from '@fortawesome/free-solid-svg-icons';
import { AppIcon } from '../../../components/ui/atoms/AppIcon';
import { resolveEntityColor } from '../../../utils/entityColor';
import { StatsSectionTitle } from './StatsSectionTitle';
import type { TodayDelta } from '../types';

interface ColumnProps {
    entries: TodayDelta[];
    accent: 'grew' | 'fell';
    emptyLabel: string;
}

function DeltaRow({ entry, accent }: { entry: TodayDelta; accent: 'grew' | 'fell' }) {
    const sign = entry.delta > 0 ? '+' : '';
    // XP numbers always read as green (gained) or red (lost) so the colour
    // alone tells the story without parsing the sign.
    const deltaClass = accent === 'grew' ? 'text-correct' : 'text-error';
    return (
        <div className="flex items-center justify-between px-2 py-2 odd:bg-black/10">
            <div className="flex min-w-0 items-center gap-3">
                <span
                    className="shrink-0 text-base leading-none"
                    style={{ color: resolveEntityColor(entry.innerface.color) }}
                >
                    <AppIcon id={entry.innerface.icon} />
                </span>
                <span className="truncate text-sm text-text-primary">
                    {entry.innerface.name}
                </span>
            </div>
            <div className="flex shrink-0 items-center gap-3">
                <span className="text-xs text-sub">×{entry.checkinCount}</span>
                <span className={`text-sm ${deltaClass}`}>
                    {sign}
                    {entry.delta.toFixed(2)}
                </span>
            </div>
        </div>
    );
}

function Column({ entries, accent, emptyLabel }: ColumnProps) {
    if (entries.length === 0) {
        return <div className="py-6 text-center text-sm text-sub">{emptyLabel}</div>;
    }
    return (
        <div className="flex flex-col">
            {entries.map((e) => (
                <DeltaRow key={String(e.innerface.id)} entry={e} accent={accent} />
            ))}
        </div>
    );
}

interface Props {
    grew: TodayDelta[];
    fell: TodayDelta[];
}

export function GrewFellPanel({ grew, fell }: Props) {
    return (
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div>
                <StatsSectionTitle icon={faArrowTrendUp} text="grew today" />
                <Column entries={grew} accent="grew" emptyLabel="no growth yet today" />
            </div>
            <div>
                <StatsSectionTitle icon={faArrowTrendDown} text="fell today" />
                <Column entries={fell} accent="fell" emptyLabel="nothing lost today" />
            </div>
        </div>
    );
}
