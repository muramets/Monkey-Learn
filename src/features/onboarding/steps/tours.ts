import type { TourDefinition, TourId } from '../types';

/**
 * Tour copy rules: plain second-person voice about the app (no "i"),
 * bottom line up front, lowercase like the rest of the UI, no thought-leader
 * phrasing. The frame: you're a character — skills grow through actions and
 * open doors to life opportunities. This app is the map.
 */
export const TOURS: Record<TourId, TourDefinition> = {
    dashboard: {
        id: 'dashboard',
        route: '/',
        steps: [
            {
                target: 'profile',
                title: 'your character sheet',
                body: "level and xp add up from every check-in across all skills. one number for the whole build — your health bar.",
            },
            {
                target: 'doors',
                title: 'doors',
                body: "each door is a life opportunity you want open. it watches a set of skills — grow them and the door score climbs.",
            },
            {
                target: 'quick-actions',
                title: 'quick actions',
                body: 'one tap = one rep. right side checks in, left side undoes. xp lands instantly.',
            },
            {
                target: 'weekly-focus',
                title: 'weekly focus',
                body: 'the few actions that matter this week. set them once and let the checkmarks pull you through.',
            },
            {
                target: 'personality',
                title: 'personalities',
                body: 'separate builds for separate lives — each with its own skills, doors and actions. switch here.',
            },
            {
                target: 'nav',
                title: 'keep moving',
                body: 'actions is where the reps happen. open it and hit ? up top to continue the walkthrough.',
            },
        ],
    },
    actions: {
        id: 'actions',
        route: '/actions',
        steps: [
            {
                target: 'actions-list',
                title: 'actions',
                body: 'an action is a small repeatable move. hover a card: click the right side for +, the left for −. after a check-in, hit enter to attach a comment.',
            },
            {
                target: 'actions-row',
                title: 'xp weight',
                body: "every action has an xp weight — what one rep is worth. the xp flows into the skills the action is linked to.",
            },
            {
                target: 'actions-groups',
                title: 'groups',
                body: "actions cluster by life area. drag to reorder, collapse what's off-season.",
            },
            {
                target: 'actions-add',
                title: 'add your own',
                body: "start with 3-5 actions you already do. the map grows as you walk it.",
            },
        ],
    },
    skills: {
        id: 'skills',
        route: '/skills',
        steps: [
            {
                target: 'skills-list',
                title: 'skills',
                body: "a skill is anything you're leveling. the score grows from linked actions — 100 xp per level, no caps.",
            },
            {
                target: 'skills-card',
                title: 'decay',
                body: 'skills rust when ignored: scores drift down over time. showing up regularly beats showing up hard.',
            },
            {
                target: 'skills-category',
                title: 'skills vs core',
                body: 'skills belong to the personality you’re playing. core is what you grow no matter the role — health, focus, honesty.',
            },
            {
                target: 'skills-add',
                title: 'add a skill',
                body: 'name it, pick a color, link actions to it. the graph starts drawing itself from the first check-in.',
            },
        ],
    },
    stats: {
        id: 'stats',
        route: '/stats',
        steps: [
            {
                target: 'stats-filters',
                title: 'scope',
                body: 'date range and skill groups — every chart and number below follows the filter.',
            },
            {
                target: 'stats-growth',
                title: 'growth chart',
                body: 'skill trajectories over the window. hover a line to highlight it, click to pin — pin several to compare.',
            },
            {
                target: 'stats-daily',
                title: 'daily activity',
                body: "xp per day with the check-ins line. the dotted trend is the honest answer to whether you're actually moving.",
            },
            {
                target: 'stats-tiles',
                title: 'the receipts',
                body: 'streaks, best days, averages. proof of showing up — or a nudge that you stopped.',
            },
            {
                target: 'stats-table',
                title: 'every rep',
                body: 'the raw check-in log for the selected range, newest first.',
            },
        ],
    },
    history: {
        id: 'history',
        route: '/history',
        steps: [
            {
                target: 'history-feed',
                title: 'the journal',
                body: 'every check-in lands here with its xp and the skills it touched. comments too.',
            },
            {
                target: 'history-filter',
                title: 'find anything',
                body: 'filter by action, skill, door or date. swipe a row left to delete a mistake.',
            },
        ],
    },
};

export function tourForRoute(pathname: string): TourDefinition | null {
    return Object.values(TOURS).find((t) => t.route === pathname) ?? null;
}
