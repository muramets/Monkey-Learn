import { useState } from 'react';
import { format } from 'date-fns';
import { AppIcon } from '../../../components/ui/atoms/AppIcon';
import { ToggleButton } from '../../../components/ui/atoms/ToggleButton';
import { resolveEntityColor } from '../../../utils/entityColor';
import { weightToXp } from '../../../utils/checkinCalculations';
import { useMetadataStore } from '../../../stores/metadataStore';
import type { HistoryRecord } from '../../../types/history';

const PAGE_SIZE = 10;

interface Props {
    checkins: HistoryRecord[];
}

/**
 * MonkeyType results table port: striped full-width rows, sub-colored
 * headers, and a full-width "load more" button underneath.
 */
export function CheckinsTable({ checkins }: Props) {
    const [limit, setLimit] = useState(PAGE_SIZE);
    const innerfaces = useMetadataStore((s) => s.innerfaces);
    const protocols = useMetadataStore((s) => s.protocols);

    const nameFor = (id: string | number): string =>
        innerfaces.find((i) => String(i.id) === String(id))?.name ?? '';
    const colorFor = (id: string | number): string =>
        resolveEntityColor(protocols.find((p) => String(p.id) === String(id))?.color);

    if (checkins.length === 0) {
        return (
            <div className="grid h-32 place-items-center text-sub">
                No check-ins found. Check your filters.
            </div>
        );
    }

    const visible = checkins.slice(0, limit);

    return (
        <>
            <table className="w-full table-auto border-collapse text-xs md:text-sm">
                <thead>
                    <tr className="text-left text-sub">
                        <th className="p-2 pl-4 font-normal">action</th>
                        <th className="p-2 font-normal">xp</th>
                        <th className="hidden p-2 font-normal sm:table-cell">skills</th>
                        <th className="p-2 pr-4 text-right font-normal">date</th>
                    </tr>
                </thead>
                <tbody>
                    {visible.map((record) => {
                        const xp = weightToXp(record.weight);
                        const powerNames = (record.targets ?? [])
                            .map(nameFor)
                            .filter(Boolean)
                            .join(', ');
                        return (
                            <tr key={record.id} className="odd:bg-black/10">
                                <td className="p-2 pl-4">
                                    <span className="inline-flex items-center gap-2">
                                        <span style={{ color: colorFor(record.protocolId) }}>
                                            <AppIcon id={record.protocolIcon} />
                                        </span>
                                        <span className="text-text-primary">{record.protocolName}</span>
                                    </span>
                                </td>
                                <td className={`p-2 ${xp < 0 ? 'text-error' : 'text-text-primary'}`}>
                                    {xp >= 0 ? `+${xp}` : xp}
                                </td>
                                <td className="hidden max-w-64 truncate p-2 text-sub sm:table-cell">
                                    {powerNames || '—'}
                                </td>
                                <td className="p-2 pr-4 text-right text-sub">
                                    {format(new Date(record.timestamp), 'dd MMM yyyy HH:mm')}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            <ToggleButton
                className="w-full text-xs"
                disabled={checkins.length <= limit}
                onClick={() => setLimit((l) => l + PAGE_SIZE)}
            >
                load more
            </ToggleButton>
        </>
    );
}
