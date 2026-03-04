import { useEffect } from 'react';
import { usePersonalityStore } from '../../stores/personalityStore';
import { useRoleStore } from '../../stores/team';
import { setTheme, getCurrentTheme } from '../../utils/themeManager';

export function ThemeController() {
    const { activeContext, personalities } = usePersonalityStore();
    const { roles } = useRoleStore();

    useEffect(() => {
        let targetTheme: string | undefined;

        if (activeContext?.type === 'personality') {
            const personality = personalities.find(p => p.id === activeContext.pid);
            targetTheme = personality?.currentTheme;
        } else if (activeContext?.type === 'role') {
            const teamRoles = roles[activeContext.teamId] || [];
            const role = teamRoles.find(r => r.id === activeContext.roleId);
            targetTheme = role?.currentTheme;
        }

        if (targetTheme && getCurrentTheme() !== targetTheme) {
            console.debug(`[ThemeController] Switching to theme: ${targetTheme}`);
            setTheme(targetTheme);
        }
    }, [activeContext, personalities, roles]);

    return null;
}
