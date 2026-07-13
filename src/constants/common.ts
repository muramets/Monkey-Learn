import { DEFAULT_ENTITY_COLOR } from '../utils/entityColor';

export const GROUP_CONFIG: Record<string, { icon: string; color: string }> = {
    Body: { icon: 'person-walking', color: '#98c379' },
    Mind: { icon: 'yin-yang', color: '#e6934a' },
    Growth: { icon: 'chart-line', color: DEFAULT_ENTITY_COLOR },
    Rest: { icon: 'umbrella-beach', color: '#7fb3d3' },
    Substances: { icon: 'smoking', color: '#ca4754' },
    Ungrouped: { icon: 'circle', color: '#d1d0c5' },
    Business: { icon: 'list-check', color: '#e06c75' },
};

export const DEFAULT_GROUPS_ORDER = [
    'Body',
    'Mind',
    'Growth',
    'Business',
    'Rest',
    'Substances',
    'Ungrouped',
];

export const getGroupConfig = (name?: string | null) => {
    if (!name) return GROUP_CONFIG['Ungrouped'];
    const key = Object.keys(GROUP_CONFIG).find(k => k.toLowerCase() === name.toLowerCase());
    return key ? GROUP_CONFIG[key] : GROUP_CONFIG['Ungrouped'];
};

export const PRESET_COLORS = [
    DEFAULT_ENTITY_COLOR, // Theme accent (stored as legacy serika yellow, rendered as var(--main-color))
    '#ca4754', // Red
    '#98c379', // Green
    '#7fb3d3', // Blue 
    '#e6934a', // Orange
    '#c678dd', // Purple
    '#d19a66', // Light Orange
    '#56b6c2', // Cyan
    '#d1d0c5', // Gray
    '#abb2bf', // Light Gray
    '#e06c75', // Light Red
    '#be5046', // Dark Red
    '#61afef', // Sky Blue
    '#b4babe', // Gray Blue
    '#81bf91', // Pale Green
];

export const DEFAULT_STATE_COLOR = '#7fb3d3'; // Blue 
