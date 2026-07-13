import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartLine, faLayerGroup, faArrowDownUpAcrossLine } from '@fortawesome/free-solid-svg-icons';
import { ToggleButton } from '../../../components/ui/atoms/ToggleButton';

interface Props {
    /** Fitted XP change per day over the window; null hides the caption. */
    trendPerDay: number | null;
    topOnly: boolean;
    beginAtZero: boolean;
    onToggleTop: (topOnly: boolean) => void;
    onToggleZero: () => void;
}

/**
 * The strip under MonkeyType's history chart: a trend caption on the left
 * and the chart-mode toggle buttons on the right.
 */
export function HistoryChartFooter({ trendPerDay, topOnly, beginAtZero, onToggleTop, onToggleZero }: Props) {
    const plus = trendPerDay !== null && trendPerDay > 0 ? '+' : '';
    return (
        <div className="grid grid-cols-1 items-center lg:grid-cols-[1fr_24rem]">
            <div className="w-full p-4 text-center text-xs text-sub">
                {trendPerDay !== null &&
                    `XP change per day over this range: ${plus}${trendPerDay.toFixed(1)}`}
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs max-[475px]:grid-cols-1">
                <ToggleButton
                    icon={<FontAwesomeIcon icon={faChartLine} fixedWidth />}
                    active={topOnly}
                    onClick={() => onToggleTop(true)}
                >
                    top 5
                </ToggleButton>
                <ToggleButton
                    icon={<FontAwesomeIcon icon={faLayerGroup} fixedWidth />}
                    active={!topOnly}
                    onClick={() => onToggleTop(false)}
                >
                    all skills
                </ToggleButton>
                <ToggleButton
                    icon={<FontAwesomeIcon icon={faArrowDownUpAcrossLine} fixedWidth />}
                    active={beginAtZero}
                    onClick={onToggleZero}
                >
                    from zero
                </ToggleButton>
            </div>
        </div>
    );
}
