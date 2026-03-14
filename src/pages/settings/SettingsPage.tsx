import { useState, useMemo, useEffect } from 'react';
import { setTheme, getCurrentTheme, hexToHSL, getFavorites, toggleFavorite, getAllThemes } from '../../utils/themeManager';
import type { Theme } from '../../utils/themeManager';
import { ThemeButton } from './components/ThemeButton';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faPalette } from '@fortawesome/free-solid-svg-icons';
import { Input } from '../../components/ui/molecules/Input';
import { CollapsibleSection } from '../../components/ui/molecules/CollapsibleSection';
import { usePersonalityStore } from '../../stores/personalityStore';
import { useRoleStore } from '../../stores/team';
import { useAuth } from '../../contexts/AuthContext';
import type { Personality } from '../../types/personality';
import type { User } from 'firebase/auth';
import type { ActiveContext } from '../../stores/personalityStore';
import type { TeamRole } from '../../types/team';

export function SettingsPage() {
    const { user } = useAuth();
    const { activeContext, personalities, updatePersonality } = usePersonalityStore();
    const { roles, updateRole } = useRoleStore();

    // Derive active entity (Personality or Role)
    const { activePersonality, activeRole } = useMemo(() => {
        if (activeContext?.type === 'personality') {
            return {
                activePersonality: personalities.find(p => p.id === activeContext.pid) || null,
                activeRole: null
            };
        } else if (activeContext?.type === 'role') {
            const teamRoles = roles[activeContext.teamId] || [];
            return {
                activePersonality: null,
                activeRole: teamRoles.find(r => r.id === activeContext.roleId) || null
            };
        }
        return { activePersonality: null, activeRole: null };
    }, [activeContext, personalities, roles]);

    // Unified entity for theme data
    const themeEntity = activePersonality || activeRole;

    // Use a key to force re-mounting when the active entity changes,
    // which allows us to initialize state directly from the new entity data.
    const entityKey = themeEntity ? (activePersonality ? `p-${activePersonality.id}` : `r-${activeRole?.id}`) : 'guest';

    return (
        <SettingsContent
            key={entityKey}
            themeEntity={themeEntity}
            user={user}
            activePersonality={activePersonality}
            activeRole={activeRole}
            activeContext={activeContext}
            updatePersonality={updatePersonality}
            updateRole={updateRole}
        />
    );
}

interface SettingsContentProps {
    themeEntity: { currentTheme?: string; favThemes?: string[] } | null;
    user: User | null;
    activePersonality: Personality | null;
    activeRole: TeamRole | null;
    activeContext: ActiveContext | null;
    updatePersonality: (uid: string, pid: string, data: Partial<Personality>) => Promise<void>;
    updateRole: (teamId: string, roleId: string, data: Partial<TeamRole>) => Promise<void>;
}

function SettingsContent({
    themeEntity,
    user,
    activePersonality,
    activeRole,
    activeContext,
    updatePersonality,
    updateRole
}: SettingsContentProps) {
    // Initialize state directly from props. Because of the key in parent, 
    // this component remounts when entity changes, so this logic runs fresh.
    const [currentThemeName, setCurrentThemeName] = useState(() => {
        if (themeEntity?.currentTheme) return themeEntity.currentTheme;
        return getCurrentTheme();
    });

    const [searchQuery, setSearchQuery] = useState('');
    const [themesMap, setThemesMap] = useState<Record<string, Theme>>({});

    useEffect(() => {
        void getAllThemes().then(setThemesMap);
    }, []);

    const [favorites, setFavorites] = useState<string[]>(() => {
        if (themeEntity?.favThemes) return themeEntity.favThemes;
        return getFavorites();
    });

    const handleThemeChange = async (name: string) => {
        await setTheme(name);
        setCurrentThemeName(name);

        if (user && activePersonality) {
            await updatePersonality(user.uid, activePersonality.id, { currentTheme: name });
        } else if (activeRole && activeContext?.type === 'role') {
            await updateRole(activeContext.teamId, activeRole.id, { currentTheme: name });
        }
    };

    const handleFavoriteToggle = async (name: string) => {
        if (user && activePersonality) {
            const currentFavs = activePersonality.favThemes || [];
            const isFav = currentFavs.includes(name);
            const newFavs = isFav
                ? currentFavs.filter((t: string) => t !== name)
                : [...currentFavs, name];

            setFavorites(newFavs);
            await updatePersonality(user.uid, activePersonality.id, { favThemes: newFavs });
        } else if (activeRole && activeContext?.type === 'role') {
            const currentFavs = activeRole.favThemes || [];
            const isFav = currentFavs.includes(name);
            const newFavs = isFav
                ? currentFavs.filter((t: string) => t !== name)
                : [...currentFavs, name];

            setFavorites(newFavs);
            await updateRole(activeContext.teamId, activeRole.id, { favThemes: newFavs });
        } else {
            // Guest Mode: Use LocalStorage
            const newFavs = toggleFavorite(name);
            setFavorites(newFavs);
        }
    };

    const sortedthemes = useMemo(() => {
        return Object.values(themesMap).sort((a, b) => {
            const l1 = hexToHSL(a.bgColor).l;
            const l2 = hexToHSL(b.bgColor).l;
            // Descending lightness (lightest first)
            const diff = l2 - l1;
            if (diff !== 0) return diff;
            // If lightness is equal, sort alphabetically
            return a.name.localeCompare(b.name);
        });
    }, [themesMap]);

    const { favThemesList, otherThemesList } = useMemo(() => {
        const filtered = sortedthemes.filter(theme =>
            theme.name.toLowerCase().includes(searchQuery.toLowerCase())
        );

        return {
            favThemesList: filtered.filter(t => favorites.includes(t.name)),
            otherThemesList: filtered.filter(t => !favorites.includes(t.name))
        };
    }, [sortedthemes, searchQuery, favorites]);

    return (
        <div className="flex flex-col gap-4 w-full pb-32">

            {/* Navigation (Custom for Settings) */}
            <nav className="flex justify-center w-full select-none mb-8">
                <div className="flex items-stretch h-[39px] bg-sub-alt rounded-lg overflow-visible shadow-sm">
                    <button
                        className="flex items-center gap-2 px-3 h-full border-none bg-transparent cursor-pointer font-mono text-[11px] transition-colors duration-125 outline-none leading-tight select-none rounded-lg text-main hover:text-text-primary"
                        onClick={() => {
                            const el = document.getElementById('group_theme');
                            el?.scrollIntoView({ behavior: 'smooth' });
                        }}
                    >
                        <FontAwesomeIcon icon={faPalette} />
                        <span>theme</span>
                    </button>
                </div>
            </nav>

            {/* Theme Section */}
            <div id="group_theme">
                <CollapsibleSection title="Theme" icon={faPalette}>
                    <div className="flex flex-col gap-4 w-full">
                        <div className="flex flex-col gap-2">
                            <p className="text-sub-color text-sm">Select visual theme for the application.</p>
                            <div className="relative w-full">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-sub-color z-10">
                                    <FontAwesomeIcon icon={faSearch} />
                                </div>
                                <Input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search theme..."
                                    className="pl-9 w-full bg-sub-alt-color border-transparent focus:border-main-color"
                                />
                            </div>
                        </div>

                        {/* Favorites Grid */}
                        {favThemesList.length > 0 && (
                            <div className="grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] gap-2 mb-4">
                                {favThemesList.map((theme) => (
                                    <ThemeButton
                                        key={theme.name}
                                        theme={theme}
                                        isActive={currentThemeName === theme.name}
                                        isFavorite={true}
                                        onClick={handleThemeChange}
                                        onToggleFavorite={handleFavoriteToggle}
                                    />
                                ))}
                            </div>
                        )}

                        {/* All Themes Grid */}
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] gap-2">
                            {otherThemesList.map((theme) => (
                                <ThemeButton
                                    key={theme.name}
                                    theme={theme}
                                    isActive={currentThemeName === theme.name}
                                    isFavorite={false}
                                    onClick={handleThemeChange}
                                    onToggleFavorite={handleFavoriteToggle}
                                />
                            ))}
                            {otherThemesList.length === 0 && favThemesList.length === 0 && (
                                <div className="col-span-full text-center py-8 text-sub-color">
                                    No themes found matching "{searchQuery}"
                                </div>
                            )}
                        </div>
                    </div>
                </CollapsibleSection>
            </div>
        </div>
    );
}
