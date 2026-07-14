import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { PersonalityDropdown } from '../../features/personalities/components/PersonalityDropdown';
import { TeamsDropdown } from '../../features/teams/components/TeamsDropdown';

import { LogOut, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { TourButton } from '../../features/onboarding/components/TourButton';

export function Header() {
    const { user, logout } = useAuth();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    return (
        <header className="grid grid-cols-[auto_1fr] items-center gap-2 select-none h-auto w-full">
            {/* Logo */}
            <Link to="/" className="cursor-pointer flex items-center gap-2 no-underline text-text-primary p-[0.35rem_0.25rem] rounded outline-none focus-visible:ring-2 focus-visible:ring-text-primary group w-max">
                <div className="w-10 h-6 text-main flex items-center justify-center">
                    {/* Exact MonkeyType SVG */}
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="-680 -1030 300 180"
                        className="w-full h-full fill-current block"
                    >
                        <g>
                            <path d="M -430 -910 L -430 -910 C -424.481 -910 -420 -905.519 -420 -900 L -420 -900 C -420 -894.481 -424.481 -890 -430 -890 L -430 -890 C -435.519 -890 -440 -894.481 -440 -900 L -440 -900 C -440 -905.519 -435.519 -910 -430 -910 Z" />
                            <path d="M -570 -910 L -510 -910 C -504.481 -910 -500 -905.519 -500 -900 L -500 -900 C -500 -894.481 -504.481 -890 -510 -890 L -570 -890 C -575.519 -890 -580 -894.481 -580 -900 L -580 -900 C -580 -905.519 -575.519 -910 -570 -910 Z" />
                            <path d="M -590 -970 L -590 -970 C -584.481 -970 -580 -965.519 -580 -960 L -580 -940 C -580 -934.481 -584.481 -930 -590 -930 L -590 -930 C -595.519 -930 -600 -934.481 -600 -940 L -600 -960 C -600 -965.519 -595.519 -970 -590 -970 Z" />
                            <path d="M -639.991 -960.515 C -639.72 -976.836 -626.385 -990 -610 -990 L -610 -990 C -602.32 -990 -595.31 -987.108 -590 -982.355 C -584.69 -987.108 -577.68 -990 -570 -990 L -570 -990 C -553.615 -990 -540.28 -976.836 -540.009 -960.515 C -540.001 -960.345 -540 -960.172 -540 -960 L -540 -960 L -540 -940 C -540 -934.481 -544.481 -930 -550 -930 L -550 -930 C -555.519 -930 -560 -934.481 -560 -940 L -560 -960 L -560 -960 C -560 -965.519 -564.481 -970 -570 -970 C -575.519 -970 -580 -965.519 -580 -960 L -580 -960 L -580 -960 L -580 -940 C -580 -934.481 -584.481 -930 -590 -930 L -590 -930 C -595.519 -930 -600 -934.481 -600 -940 L -600 -960 L -600 -960 L -600 -960 L -600 -960 L -600 -960 L -600 -960 L -600 -960 L -600 -960 C -600 -965.519 -604.481 -970 -610 -970 C -615.519 -970 -620 -965.519 -620 -960 L -620 -960 L -620 -940 C -620 -934.481 -624.481 -930 -630 -930 L -630 -930 C -635.519 -930 -640 -934.481 -640 -940 L -640 -960 L -640 -960 C -640 -960.172 -639.996 -960.344 -639.991 -960.515 Z" />
                            <path d="M -460 -930 L -460 -900 C -460 -894.481 -464.481 -890 -470 -890 L -470 -890 C -475.519 -890 -480 -894.481 -480 -900 L -480 -930 L -508.82 -930 C -514.99 -930 -520 -934.481 -520 -940 L -520 -940 C -520 -945.519 -514.99 -950 -508.82 -950 L -431.18 -950 C -425.01 -950 -420 -945.519 -420 -940 L -420 -940 C -420 -934.481 -425.01 -930 -431.18 -930 L -460 -930 Z" />
                            <path d="M -470 -990 L -430 -990 C -424.481 -990 -420 -985.519 -420 -980 L -420 -980 C -420 -974.481 -424.481 -970 -430 -970 L -470 -970 C -475.519 -970 -480 -974.481 -480 -980 L -480 -980 C -480 -985.519 -475.519 -990 -470 -990 Z" />
                            <path d="M -630 -910 L -610 -910 C -604.481 -910 -600 -905.519 -600 -900 L -600 -900 C -600 -894.481 -604.481 -890 -610 -890 L -630 -890 C -635.519 -890 -640 -894.481 -640 -900 L -640 -900 C -640 -905.519 -635.519 -910 -630 -910 Z" />
                            <path d="M -515 -990 L -510 -990 C -504.481 -990 -500 -985.519 -500 -980 L -500 -980 C -500 -974.481 -504.481 -970 -510 -970 L -515 -970 C -520.519 -970 -525 -974.481 -525 -980 L -525 -980 C -525 -985.519 -520.519 -990 -515 -990 Z" />
                            <path d="M -660 -910 L -680 -910 L -680 -980 C -680 -1007.596 -657.596 -1030 -630 -1030 L -430 -1030 C -402.404 -1030 -380 -1007.596 -380 -980 L -380 -900 C -380 -872.404 -402.404 -850 -430 -850 L -630 -850 C -657.596 -850 -680 -872.404 -680 -900 L -680 -920 L -660 -920 L -660 -900 C -660 -883.443 -646.557 -870 -630 -870 L -430 -870 C -413.443 -870 -400 -883.443 -400 -900 L -400 -980 C -400 -996.557 -413.443 -1010 -430 -1010 L -630 -1010 C -646.557 -1010 -660 -996.557 -660 -980 L -660 -910 Z" />
                        </g>
                    </svg>
                </div>
                <div
                    className="relative text-[2rem] leading-8 text-text-primary mt-[-0.23em] tracking-normal max-[720px]:hidden"
                    id="logo"
                    style={{ fontFamily: '"Lexend Deca", sans-serif', fontWeight: 400 }}
                >
                    <div
                        className="absolute left-[3.6px] text-[10.4px] leading-[0.325em] text-text-secondary top-0 whitespace-nowrap font-normal"
                        style={{ fontFamily: '"Lexend Deca", sans-serif' }}
                    >
                        monkey try
                    </div>
                    monkeylearn
                </div>
            </Link>

            {/* Navigation and User Actions */}
            <nav className="flex items-center justify-between w-full h-9 text-text-secondary text-base">
                {/* Layout Note: gap-2 (8px) is standard, but gap-4 (16px) is used here to match user preference for wider spacing. */}
                <div className="flex items-center gap-2">
                    <Link to="/settings" className="text-text-secondary hover:text-text-primary transition-colors p-2">
                        <Settings className="w-4 h-4" />
                    </Link>
                    <TourButton />
                </div>

                <div className="flex items-center gap-4 relative">
                    {/* Teams Dropdown - Before Personality for team management */}
                    <TeamsDropdown />

                    {/* Personal Personalities */}
                    <PersonalityDropdown />

                    <div
                        className="relative"
                        onMouseEnter={() => setIsDropdownOpen(true)}
                        onMouseLeave={() => setIsDropdownOpen(false)}
                    >
                        <button
                            className="bg-none border-none text-text-secondary p-0 w-9 h-9 flex items-center justify-center rounded cursor-pointer transition-colors hover:text-text-primary focus:outline-none"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>

                        {/* Dropdown Menu */}
                        <div className={`absolute top-full right-0 bg-sub-alt rounded-lg py-2 min-w-[180px] shadow-[0_4px_12px_rgba(0,0,0,0.3)] transition-[opacity,transform,visibility] duration-125 z-50 mt-1
                    ${isDropdownOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-[10px]'}`}
                        >
                            <div className="px-4 py-2 text-text-primary text-sm font-mono opacity-50 border-b border-border mb-1">
                                {user?.email}
                            </div>
                            <button
                                onClick={logout}
                                className="w-full flex items-center gap-2 px-3 py-2 text-left text-text-primary hover:bg-bg-primary hover:text-error transition-colors font-mono text-xs group"
                            >
                                <LogOut className="w-3 h-3 text-text-secondary group-hover:text-error" />
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </nav>
        </header >
    );
}
