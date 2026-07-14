import { Sparkles, Layers, Inbox } from 'lucide-react';

export const CATEGORY_CONFIG = {
    skill: {
        label: 'Skills',
        icon: Sparkles,
        hoverColor: 'group-hover/category:text-blue-400'
    },
    foundation: {
        label: 'Core',
        icon: Layers,
        hoverColor: 'group-hover/category:text-green-400'
    },
    uncategorized: {
        label: 'Uncategorized',
        icon: Inbox,
        hoverColor: 'group-hover/category:text-sub'
    }
} as const;
