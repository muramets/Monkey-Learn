import { useNavigate } from 'react-router-dom';
import { usePersonalityStore } from '../../../stores/personalityStore';
import { format } from 'date-fns';

export function UserStats() {
    const navigate = useNavigate();
    const { personalities, activePersonalityId, activeContext } = usePersonalityStore();

    // Determine current personality stats
    let activePersonality;

    if (activeContext?.type !== 'role' && activeContext?.type !== 'viewer') {
        activePersonality = personalities.find(p => p.id === activePersonalityId);
    }

    // Check-ins today/month from Personality Stats
    const stats = { checkinsToday: 0, xpToday: 0, checkinsMonth: 0, xpMonth: 0 };

    // We only have stats for Personalities, not Roles (yet)
    if (activeContext?.type !== 'role' && activePersonality?.stats) {
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const monthStr = format(new Date(), 'yyyy-MM');

        if (activePersonality.stats.lastDailyUpdate === todayStr) {
            stats.checkinsToday = activePersonality.stats.dailyCheckins || 0;
            stats.xpToday = activePersonality.stats.dailyXp || 0;
        }



        if (activePersonality.stats.lastMonthlyUpdate === monthStr) {
            stats.checkinsMonth = activePersonality.stats.monthlyCheckins || 0;
            stats.xpMonth = activePersonality.stats.monthlyXp || 0;
        }
    }

    const handleNavigateToHistory = (timeFilter?: string) => {
        navigate('/history', { state: { filterTime: timeFilter } });
    };

    const renderXP = (xp: number, isTotal = false) => {
        if (xp === 0) return <span className="text-xs text-sub font-mono">0 XP</span>;
        const isPositive = xp > 0;
        return (
            <span
                className="text-xs font-mono"
                style={{ color: isPositive ? 'var(--correct-color)' : 'var(--error-color)' }}
            >
                {isPositive ? '+' : ''}{xp} XP{isTotal ? ' total' : ''}
            </span>
        );
    };

    return (
        <div className="flex gap-8 md:mt-0">
            <div
                onClick={() => handleNavigateToHistory('Today')}
                className="flex flex-col items-center gap-2 p-2 rounded-lg cursor-pointer transition-[transform,background-color] duration-200 hover:-translate-y-[2px] hover:bg-[rgba(255,255,255,0.02)] group"
            >
                <span className="text-[10px] font-mono text-sub uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity duration-300">
                    Check-ins today
                </span>
                <div className="flex flex-col items-center gap-1">
                    <span className="text-[1.5rem] font-medium font-mono text-text-primary leading-none">
                        {stats.checkinsToday}
                    </span>
                    {renderXP(stats.xpToday)}
                </div>
            </div>

            <div
                onClick={() => handleNavigateToHistory('This month')}
                className="flex flex-col items-center gap-2 p-2 rounded-lg cursor-pointer transition-[transform,background-color] duration-200 hover:-translate-y-[2px] hover:bg-[rgba(255,255,255,0.02)] group"
            >
                <span className="text-[10px] font-mono text-sub uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity duration-300">
                    Check-ins this month
                </span>
                <div className="flex flex-col items-center gap-1">
                    <span className="text-[1.5rem] font-medium font-mono text-text-primary leading-none">
                        {stats.checkinsMonth}
                    </span>
                    {renderXP(stats.xpMonth, true)}
                </div>
            </div>
        </div>
    );
}
