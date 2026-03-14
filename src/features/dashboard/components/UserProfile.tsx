import { Card } from '../../../components/ui/atoms/Card';
import { useAuth } from '../../../contexts/AuthContext';
import { usePersonalityStore } from '../../../stores/personalityStore';
import { useRoleStore } from '../../../stores/team';
import { useScoreContext } from '../../../contexts/ScoreContext';
import { getTierColor } from '../../../utils/colorUtils';
import { calculateWeightedLevel } from '../../../utils/xpUtils';
import { WeeklyFocus } from './WeeklyFocus';
import { Avatar } from '../../../components/ui/atoms/Avatar';
import { UserStats } from './UserStats';

export function UserProfile() {
    const { user } = useAuth();
    // navigate removed if not used elsewhere (it was used in handleNavigateToHistory)
    const { personalities, activePersonalityId, activeContext } = usePersonalityStore();
    const { roles } = useRoleStore();
    const { innerfaces } = useScoreContext();

    // Determine display data based on context (Role vs Personality)
    let displayName = "Unknown";
    let displayAvatar: string | undefined;
    let displayIcon: string = 'user';

    if (activeContext?.type === 'role') {
        const teamRoles = roles[activeContext.teamId] || [];
        const role = teamRoles.find(r => r.id === activeContext.roleId);
        displayName = role?.name || "Loading Role...";
        displayIcon = role?.icon || 'user';
    } else if (activeContext?.type === 'viewer') {
        displayName = activeContext.displayName || "Participant";
        displayIcon = 'user'; // Or maybe 'eye' but 'user' is safer for general profile look
    } else {
        const activePersonality = personalities.find(p => p.id === activePersonalityId);
        displayName = activePersonality?.name || user?.displayName || user?.email?.split('@')[0] || "Unknown Player";
        displayAvatar = activePersonality?.avatar;
        displayIcon = activePersonality?.icon || 'user';
    }

    // 1. Level calculation: Weighted Average based on Priority
    const activeInnerfaces = innerfaces.filter(i => !i.deletedAt);
    const { level, currentLevelXP, progress, totalXP } = calculateWeightedLevel(activeInnerfaces);
    const tierColor = getTierColor(level);

    // Calculate next TIER color (not just next level) for a visible motivational gradient
    // Tier boundaries: 1-3 (Red), 4-6 (Gold), 7-9 (Green), 10-19 (Purple), 20+ (Blue)
    const getNextTierFirstLevel = (currentLevel: number): number => {
        if (currentLevel <= 3) return 4;   // Next tier starts at level 4
        if (currentLevel <= 6) return 7;   // Next tier starts at level 7
        if (currentLevel <= 9) return 10;  // Next tier starts at level 10
        if (currentLevel <= 19) return 20; // Next tier starts at level 20
        return currentLevel + 1;           // Already at max tier, just use next level
    };
    const nextTierFirstLevel = getNextTierFirstLevel(level);
    const nextTierColor = getTierColor(nextTierFirstLevel);

    return (
        <Card className="group flex flex-col md:flex-row items-center justify-between gap-0 md:gap-8 p-6 mb-8 bg-sub-alt rounded-lg shadow-sm border-none hover:scale-[1.02] hover:shadow-xl transition-[transform,box-shadow] duration-300 overflow-hidden">
            {/* Desktop: Group User Info + Separator closely */}
            <div className="flex md:flex-row items-center gap-6 w-full md:w-auto">
                {/* User Info Section */}
                <div className="flex md:flex-row items-center gap-4 w-full md:w-auto">
                    {/* Avatar */}
                    <div className="relative shrink-0 group/avatar">
                        {/* Premium Glow Effects */}
                        {displayAvatar && (
                            <>
                                <style>{`
                                    @keyframes avatar-glow-spin {
                                        0% { transform: rotate(0deg) scale(1); }
                                        50% { transform: rotate(180deg) scale(1.05); }
                                        100% { transform: rotate(360deg) scale(1); }
                                    }
                                    @keyframes avatar-glow-counter {
                                        0% { transform: rotate(360deg) scale(1.05); }
                                        50% { transform: rotate(180deg) scale(1); }
                                        100% { transform: rotate(0deg) scale(1.05); }
                                    }
                                    @keyframes avatar-shimmer {
                                        0% { transform: translateX(-100%) rotate(25deg); opacity: 0; }
                                        5% { opacity: 1; }
                                        10% { transform: translateX(200%) rotate(25deg); opacity: 0; }
                                        100% { transform: translateX(200%) rotate(25deg); opacity: 0; }
                                    }
                                    @keyframes avatar-pulse {
                                        0%, 100% { transform: scale(1); }
                                        50% { transform: scale(1.02); }
                                    }
                                `}</style>

                                {/* Outer Glow Layer (counter-rotation) */}
                                <div
                                    className="absolute -inset-3 rounded-full blur-[20px] opacity-15 transition-opacity duration-150 group-hover:opacity-25"
                                    style={{
                                        background: `conic-gradient(from 180deg, ${nextTierColor} 0%, ${tierColor} 50%, ${nextTierColor} 100%)`,
                                        animation: 'avatar-glow-counter 8s ease-in-out infinite'
                                    }}
                                />

                                {/* Inner Glow Layer (main rotation) */}
                                <div
                                    className="absolute -inset-1 rounded-full blur-[14px] opacity-25 transition-opacity duration-150 group-hover:opacity-40"
                                    style={{
                                        background: `conic-gradient(from 0deg, ${tierColor} 0%, ${nextTierColor} 30%, ${tierColor} 50%, ${nextTierColor} 70%, ${tierColor} 100%)`,
                                        animation: 'avatar-glow-spin 6s ease-in-out infinite'
                                    }}
                                />
                            </>
                        )}

                        {/* Avatar Container with Pulse */}
                        <Avatar
                            src={displayAvatar}
                            alt={displayName}
                            fallbackIcon={displayIcon}
                            className="w-[66px] h-[66px] rounded-full bg-bg-primary text-sub text-2xl z-10 transition-transform duration-300 group-hover/avatar:scale-105 border border-white/5"
                            style={{
                                animation: displayAvatar ? 'avatar-pulse 5s ease-in-out infinite' : 'none'
                            }}
                        />
                    </div>

                    {/* Details */}
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                        <h2 className="text-[1.75rem] leading-none font-normal text-text-primary font-mono m-0 truncate cursor-default select-none">
                            {displayName}
                        </h2>

                        {/* Level + Progress Row */}
                        <div className="flex items-center gap-3 mt-4">
                            {/* Level Number */}
                            <div className="flex flex-col items-center leading-none">
                                <span
                                    className="text-[2rem] font-medium font-mono"
                                    style={{ color: tierColor }}
                                >
                                    {level}
                                </span>
                                <span className="text-[9px] font-mono text-sub uppercase tracking-wider opacity-60 transition-[opacity,color] duration-300 group-hover:text-text-primary group-hover:opacity-100">Level</span>
                            </div>

                            {/* Progress Bar Container */}
                            <div className="flex flex-col gap-1.5 w-full max-w-[300px] min-w-[200px]">
                                <div className="w-full h-[6px] bg-bg-primary rounded-[3px] overflow-hidden">
                                    <div
                                        className="h-full transition-[width,background-color] duration-300 ease-out rounded-[3px]"
                                        style={{
                                            width: `${progress}%`,
                                            backgroundColor: tierColor
                                        }}
                                    />
                                </div>
                                {/* XP Progress Value */}
                                <div className="flex justify-between items-center text-[10px] font-mono text-sub leading-none w-full">
                                    <span className="opacity-70 transition-[opacity,color] duration-300 group-hover:text-text-primary group-hover:opacity-100">
                                        {currentLevelXP} / 100 XP
                                    </span>
                                    <span className="opacity-50 transition-[opacity,color] duration-300 tracking-wide group-hover:text-text-primary group-hover:opacity-100">
                                        {totalXP} Total
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Desktop Separator (Vertical) - inside the group for closer proximity */}
                <div className="hidden md:block w-[6px] h-24 bg-text-primary opacity-5 rounded-full shrink-0"></div>

                {/* Weekly Focus Widget (Replaces simple separator) */}
                <div className="hidden md:flex flex-col items-center justify-center px-6 shrink-0">
                    <WeeklyFocus />
                </div>
            </div>


            {/* Weekly Focus Widget (Mobile) - appears after separator */}
            <div className="flex md:hidden flex-col items-center justify-center w-full my-8">
                <WeeklyFocus />
            </div>

            {/* Stats Section */}
            <UserStats />
        </Card >
    );
}
