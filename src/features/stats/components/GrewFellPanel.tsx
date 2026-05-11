import type { TodayDelta } from '../types';

interface ColumnProps {
    title: string;
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
        <div className="flex items-center justify-between py-2 border-b border-bg-primary last:border-b-0">
            <div className="flex items-center gap-3 min-w-0">
                <span className="text-base leading-none shrink-0">{entry.innerface.icon || '·'}</span>
                <span className="text-sm text-text-primary font-mono truncate">
                    {entry.innerface.name}
                </span>
            </div>
            <div className="flex items-center gap-3 shrink-0 font-mono">
                <span className="text-xs text-text-secondary">×{entry.checkinCount}</span>
                <span className={`text-sm ${deltaClass}`}>
                    {sign}
                    {entry.delta.toFixed(2)}
                </span>
            </div>
        </div>
    );
}

function Column({ title, entries, accent, emptyLabel }: ColumnProps) {
    return (
        <div className="bg-bg-secondary rounded-lg p-6 flex flex-col">
            <div className="text-xs uppercase tracking-wider text-text-secondary font-mono mb-4">
                {title}
            </div>
            {entries.length === 0 ? (
                <div className="text-sm text-text-secondary font-mono py-6 text-center">
                    {emptyLabel}
                </div>
            ) : (
                <div className="flex flex-col">
                    {entries.map((e) => (
                        <DeltaRow key={String(e.innerface.id)} entry={e} accent={accent} />
                    ))}
                </div>
            )}
        </div>
    );
}

interface Props {
    grew: TodayDelta[];
    fell: TodayDelta[];
}

export function GrewFellPanel({ grew, fell }: Props) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Column
                title="grew today"
                entries={grew}
                accent="grew"
                emptyLabel="no growth yet today"
            />
            <Column
                title="fell today"
                entries={fell}
                accent="fell"
                emptyLabel="nothing lost today"
            />
        </div>
    );
}
