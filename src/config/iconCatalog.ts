/**
 * Pure icon metadata: id + category + keywords. No FontAwesome imports,
 * so this module is importable from both the app (client) and the CLI
 * (Node admin SDK, via functions/tsconfig include).
 *
 * The accompanying module `iconRegistry.ts` joins this catalog with
 * FontAwesome IconDefinitions for rendering in the UI.
 *
 * Single source of truth for icon IDs. If you add an icon:
 *   1. Add its entry here (id + category + keywords)
 *   2. Add its FA import + ID_TO_FA map entry in iconRegistry.ts
 * The two files stay in sync via the `icons are in sync` test.
 */

export type IconCategory =
    | 'common'
    | 'productivity'
    | 'finance'
    | 'health'
    | 'nature'
    | 'lifestyle'
    | 'social'
    | 'tech'
    | 'travel'
    | 'food'
    | 'education'
    | 'media'
    | 'development'
    | 'tools'
    | 'arrows';

export interface CategoryMeta {
    id: IconCategory;
    label: string;
}

export interface IconCatalogEntry {
    id: string;
    category: IconCategory;
    keywords: string[];
}

export const ICON_CATEGORIES: CategoryMeta[] = [
    { id: 'common', label: 'Common' },
    { id: 'productivity', label: 'Productivity' },
    { id: 'media', label: 'Media' },
    { id: 'development', label: 'Dev' },
    { id: 'finance', label: 'Finance' },
    { id: 'health', label: 'Health' },
    { id: 'nature', label: 'Nature' },
    { id: 'lifestyle', label: 'Lifestyle' },
    { id: 'social', label: 'Social' },
    { id: 'travel', label: 'Travel' },
    { id: 'food', label: 'Food' },
    { id: 'education', label: 'Education' },
    { id: 'tech', label: 'Tech' },
    { id: 'tools', label: 'Tools' },
    { id: 'arrows', label: 'Arrows' },
];

export const ICON_CATALOG: IconCatalogEntry[] = [
    // ── Common ──
    { id: 'star', category: 'common', keywords: ['favorite', 'rate'] },
    { id: 'heart', category: 'common', keywords: ['love', 'like'] },
    { id: 'flag', category: 'common', keywords: ['mark', 'goal'] },
    { id: 'check', category: 'common', keywords: ['done', 'complete'] },
    { id: 'bell', category: 'common', keywords: ['notification', 'alert'] },
    { id: 'user', category: 'common', keywords: ['person', 'profile'] },
    { id: 'home', category: 'common', keywords: ['house', 'main'] },
    { id: 'cog', category: 'common', keywords: ['settings', 'gear'] },
    { id: 'trash', category: 'common', keywords: ['delete', 'remove'] },
    { id: 'pen', category: 'common', keywords: ['edit', 'write'] },
    { id: 'search', category: 'common', keywords: ['find', 'lookup'] },
    { id: 'plus', category: 'common', keywords: ['add', 'new'] },
    { id: 'minus', category: 'common', keywords: ['remove', 'subtract'] },
    { id: 'eye', category: 'common', keywords: ['view', 'visible'] },
    { id: 'eye-slash', category: 'common', keywords: ['hide', 'invisible'] },
    { id: 'link', category: 'common', keywords: ['url', 'chain'] },
    { id: 'copy', category: 'common', keywords: ['duplicate', 'clipboard'] },
    { id: 'bookmark', category: 'common', keywords: ['save', 'mark'] },
    { id: 'circle', category: 'common', keywords: ['dot', 'bullet'] },
    { id: 'ban', category: 'common', keywords: ['prohibit', 'stop', 'no'] },
    { id: 'question', category: 'common', keywords: ['help', 'unknown'] },
    { id: 'scale-balanced', category: 'common', keywords: ['justice', 'balance', 'law'] },
    { id: 'gavel', category: 'common', keywords: ['law', 'judge', 'court'] },

    // ── Productivity ──
    { id: 'calendar', category: 'productivity', keywords: ['date', 'schedule'] },
    { id: 'clock', category: 'productivity', keywords: ['time', 'timer'] },
    { id: 'fire', category: 'productivity', keywords: ['hot', 'streak', 'trending'] },
    { id: 'trophy', category: 'productivity', keywords: ['win', 'achievement'] },
    { id: 'list-check', category: 'productivity', keywords: ['todo', 'tasks'] },
    { id: 'chart-line', category: 'productivity', keywords: ['graph', 'analytics', 'growth'] },
    { id: 'rocket', category: 'productivity', keywords: ['launch', 'fast', 'startup'] },
    { id: 'bolt', category: 'productivity', keywords: ['energy', 'power', 'flash'] },
    { id: 'battery-full', category: 'productivity', keywords: ['power', 'charge'] },
    { id: 'lightbulb', category: 'productivity', keywords: ['idea', 'insight'] },
    { id: 'brain', category: 'productivity', keywords: ['think', 'mind', 'mental'] },
    { id: 'bullseye', category: 'productivity', keywords: ['target', 'goal', 'focus'] },
    { id: 'chart-bar', category: 'productivity', keywords: ['stats', 'metrics'] },
    { id: 'clipboard', category: 'productivity', keywords: ['paste', 'notes'] },
    { id: 'folder', category: 'productivity', keywords: ['directory', 'organize'] },
    { id: 'file', category: 'productivity', keywords: ['document', 'page'] },
    { id: 'envelope', category: 'productivity', keywords: ['email', 'mail', 'message'] },
    { id: 'inbox', category: 'productivity', keywords: ['messages', 'queue'] },
    { id: 'book', category: 'productivity', keywords: ['read', 'learning'] },
    { id: 'book-open', category: 'productivity', keywords: ['reading', 'study'] },
    { id: 'pen-to-square', category: 'productivity', keywords: ['edit', 'write', 'compose'] },
    { id: 'award', category: 'productivity', keywords: ['achievement', 'prize'] },
    { id: 'crown', category: 'productivity', keywords: ['king', 'leader', 'best'] },
    { id: 'medal', category: 'productivity', keywords: ['achievement', 'award'] },

    // ── Media ──
    { id: 'clapperboard', category: 'media', keywords: ['movie', 'film', 'video', 'youtube'] },
    { id: 'film', category: 'media', keywords: ['movie', 'video', 'cinema'] },
    { id: 'video', category: 'media', keywords: ['record', 'camera', 'youtube'] },
    { id: 'sliders', category: 'media', keywords: ['settings', 'mix', 'audio', 'music'] },
    { id: 'microphone', category: 'media', keywords: ['audio', 'record', 'voice'] },
    { id: 'broadcast-tower', category: 'media', keywords: ['radio', 'signal', 'stream'] },
    { id: 'record-vinyl', category: 'media', keywords: ['music', 'dj', 'album'] },
    { id: 'music', category: 'media', keywords: ['audio', 'song'] },
    { id: 'headphones', category: 'media', keywords: ['audio', 'listen', 'music'] },
    { id: 'drum', category: 'media', keywords: ['music', 'instrument', 'beat'] },
    { id: 'guitar', category: 'media', keywords: ['music', 'instrument', 'string'] },
    { id: 'volume-high', category: 'media', keywords: ['sound', 'audio', 'loud'] },
    { id: 'camera', category: 'media', keywords: ['photo', 'picture', 'video'] },

    // ── Development ──
    { id: 'code', category: 'development', keywords: ['programming', 'dev', 'html'] },
    { id: 'code-fork', category: 'development', keywords: ['git', 'branch', 'version'] },
    { id: 'terminal', category: 'development', keywords: ['console', 'cli', 'command'] },
    { id: 'keyboard', category: 'development', keywords: ['type', 'input', 'computer'] },
    { id: 'microchip', category: 'development', keywords: ['cpu', 'processor', 'hardware'] },
    { id: 'network-wired', category: 'development', keywords: ['ethernet', 'connection', 'internet'] },
    { id: 'diagram-project', category: 'development', keywords: ['chart', 'graph', 'plan'] },
    { id: 'bug', category: 'development', keywords: ['error', 'issue', 'debug'] },
    { id: 'laptop', category: 'development', keywords: ['computer', 'work'] },
    { id: 'desktop', category: 'development', keywords: ['computer', 'monitor'] },
    { id: 'database', category: 'development', keywords: ['data', 'storage', 'sql'] },
    { id: 'server', category: 'development', keywords: ['host', 'backend'] },

    // ── Finance ──
    { id: 'credit-card', category: 'finance', keywords: ['payment', 'card'] },
    { id: 'wallet', category: 'finance', keywords: ['money', 'cash'] },
    { id: 'coins', category: 'finance', keywords: ['money', 'currency'] },
    { id: 'chart-pie', category: 'finance', keywords: ['budget', 'allocation'] },
    { id: 'tag', category: 'finance', keywords: ['price', 'label', 'discount'] },
    { id: 'store', category: 'finance', keywords: ['shop', 'market'] },
    { id: 'sack-dollar', category: 'finance', keywords: ['money', 'savings'] },
    { id: 'money-bill', category: 'finance', keywords: ['cash', 'payment'] },
    { id: 'receipt', category: 'finance', keywords: ['invoice', 'bill'] },
    { id: 'percent', category: 'finance', keywords: ['discount', 'rate'] },
    { id: 'hand-holding-dollar', category: 'finance', keywords: ['donate', 'pay'] },

    // ── Health ──
    { id: 'heart-pulse', category: 'health', keywords: ['heartbeat', 'cardio'] },
    { id: 'dumbbell', category: 'health', keywords: ['gym', 'workout', 'exercise'] },
    { id: 'apple', category: 'health', keywords: ['fruit', 'nutrition', 'diet'] },
    { id: 'bed', category: 'health', keywords: ['sleep', 'rest'] },
    { id: 'person-running', category: 'health', keywords: ['run', 'jog', 'cardio'] },
    { id: 'droplet', category: 'health', keywords: ['water', 'hydration'] },
    { id: 'spa', category: 'health', keywords: ['relax', 'meditation', 'wellness'] },
    { id: 'person-walking', category: 'health', keywords: ['walk', 'steps'] },
    { id: 'person-swimming', category: 'health', keywords: ['swim', 'pool'] },
    { id: 'lungs', category: 'health', keywords: ['breathing', 'respiratory'] },
    { id: 'bowl-food', category: 'health', keywords: ['meal', 'eat', 'nutrition'] },
    { id: 'pills', category: 'health', keywords: ['medicine', 'medication'] },
    { id: 'bandage', category: 'health', keywords: ['injury', 'healing'] },
    { id: 'weight', category: 'health', keywords: ['scale', 'mass'] },
    { id: 'moon', category: 'health', keywords: ['night', 'sleep'] },
    { id: 'bath', category: 'health', keywords: ['shower', 'clean', 'relax'] },
    { id: 'hot-tub', category: 'health', keywords: ['sauna', 'relax', 'spa'] },
    { id: 'yin-yang', category: 'health', keywords: ['balance', 'harmony', 'meditation'] },
    { id: 'shoe-prints', category: 'health', keywords: ['steps', 'walk', 'footprints'] },

    // ── Nature ──
    { id: 'tree', category: 'nature', keywords: ['forest', 'plant'] },
    { id: 'leaf', category: 'nature', keywords: ['plant', 'eco', 'green'] },
    { id: 'sun', category: 'nature', keywords: ['day', 'bright', 'weather'] },
    { id: 'cloud', category: 'nature', keywords: ['weather', 'sky'] },
    { id: 'snowflake', category: 'nature', keywords: ['winter', 'cold'] },
    { id: 'wind', category: 'nature', keywords: ['air', 'breeze'] },
    { id: 'mountain', category: 'nature', keywords: ['hiking', 'peak'] },
    { id: 'water', category: 'nature', keywords: ['ocean', 'wave'] },
    { id: 'seedling', category: 'nature', keywords: ['grow', 'plant', 'eco'] },
    { id: 'earth', category: 'nature', keywords: ['globe', 'world', 'planet'] },

    // ── Travel ──
    { id: 'plane', category: 'travel', keywords: ['fly', 'flight', 'airport'] },
    { id: 'map', category: 'travel', keywords: ['location', 'directions'] },
    { id: 'location-dot', category: 'travel', keywords: ['pin', 'place', 'marker'] },
    { id: 'suitcase', category: 'travel', keywords: ['baggage', 'luggage', 'trip'] },
    { id: 'passport', category: 'travel', keywords: ['id', 'border', 'document'] },
    { id: 'hotel', category: 'travel', keywords: ['stay', 'room', 'bed'] },
    { id: 'train', category: 'travel', keywords: ['rail', 'transport'] },
    { id: 'bus', category: 'travel', keywords: ['public', 'transport'] },
    { id: 'ship', category: 'travel', keywords: ['boat', 'sea', 'cruise'] },
    { id: 'anchor', category: 'travel', keywords: ['port', 'nautical'] },
    { id: 'car', category: 'travel', keywords: ['drive', 'vehicle'] },
    { id: 'bicycle', category: 'travel', keywords: ['bike', 'cycling'] },
    { id: 'campground', category: 'travel', keywords: ['camping', 'outdoor', 'tent'] },
    { id: 'umbrella-beach', category: 'travel', keywords: ['beach', 'vacation'] },

    // ── Food ──
    { id: 'utensils', category: 'food', keywords: ['restaurant', 'eat', 'dinner'] },
    { id: 'mug-hot', category: 'food', keywords: ['coffee', 'tea', 'drink'] },
    { id: 'wine-glass', category: 'food', keywords: ['wine', 'alcohol', 'drink'] },
    { id: 'martini-glass', category: 'food', keywords: ['cocktail', 'alcohol', 'drink'] },
    { id: 'beer-mug', category: 'food', keywords: ['beer', 'alcohol', 'drink'] },
    { id: 'burger', category: 'food', keywords: ['fastfood', 'sandwich'] },
    { id: 'pizza', category: 'food', keywords: ['fastfood', 'italian'] },
    { id: 'ice-cream', category: 'food', keywords: ['dessert', 'sweet'] },
    { id: 'cookie', category: 'food', keywords: ['dessert', 'sweet', 'biscuit'] },
    { id: 'bacon', category: 'food', keywords: ['breakfast', 'meat'] },
    { id: 'fish', category: 'food', keywords: ['seafood', 'meat'] },
    { id: 'wheat', category: 'food', keywords: ['grain', 'bread', 'farm'] },

    // ── Education ──
    { id: 'graduation-cap', category: 'education', keywords: ['education', 'learn', 'degree'] },
    { id: 'school', category: 'education', keywords: ['building', 'students'] },
    { id: 'chalkboard-user', category: 'education', keywords: ['teacher', 'class', 'present'] },

    // ── Lifestyle ──
    { id: 'gamepad', category: 'lifestyle', keywords: ['game', 'play', 'console'] },
    { id: 'palette', category: 'lifestyle', keywords: ['art', 'paint', 'design'] },
    { id: 'puzzle-piece', category: 'lifestyle', keywords: ['game', 'solve'] },
    { id: 'dice', category: 'lifestyle', keywords: ['game', 'random', 'luck'] },
    { id: 'baseball', category: 'lifestyle', keywords: ['sport', 'ball'] },
    { id: 'football', category: 'lifestyle', keywords: ['sport', 'ball'] },
    { id: 'gift', category: 'lifestyle', keywords: ['present', 'surprise'] },
    { id: 'cake', category: 'lifestyle', keywords: ['birthday', 'celebration'] },
    { id: 'smoking', category: 'lifestyle', keywords: ['cigarette', 'tobacco'] },
    { id: 'hand-rock', category: 'lifestyle', keywords: ['rock', 'gesture'] },
    { id: 'masks-theater', category: 'lifestyle', keywords: ['drama', 'acting', 'theater'] },

    // ── Social ──
    { id: 'comments', category: 'social', keywords: ['chat', 'talk', 'conversation'] },
    { id: 'users', category: 'social', keywords: ['people', 'group', 'team'] },
    { id: 'user-group', category: 'social', keywords: ['team', 'community'] },
    { id: 'share', category: 'social', keywords: ['network', 'connect'] },
    { id: 'thumbs-up', category: 'social', keywords: ['like', 'approve', 'yes'] },
    { id: 'thumbs-down', category: 'social', keywords: ['dislike', 'disapprove', 'no'] },
    { id: 'message', category: 'social', keywords: ['sms', 'chat', 'text'] },
    { id: 'handshake', category: 'social', keywords: ['deal', 'agreement'] },
    { id: 'phone', category: 'social', keywords: ['call', 'contact'] },

    // ── Tech ──
    { id: 'mobile', category: 'tech', keywords: ['phone', 'smartphone'] },
    { id: 'wifi', category: 'tech', keywords: ['internet', 'network'] },
    { id: 'robot', category: 'tech', keywords: ['ai', 'automation', 'bot'] },
    { id: 'globe', category: 'tech', keywords: ['web', 'internet', 'world'] },
    { id: 'lock', category: 'tech', keywords: ['security', 'private'] },
    { id: 'unlock', category: 'tech', keywords: ['open', 'access'] },
    { id: 'key', category: 'tech', keywords: ['password', 'access'] },
    { id: 'shield', category: 'tech', keywords: ['security', 'protect'] },
    { id: 'magnet', category: 'tech', keywords: ['attract', 'physics'] },

    // ── Tools ──
    { id: 'wrench', category: 'tools', keywords: ['fix', 'repair', 'settings'] },
    { id: 'hammer', category: 'tools', keywords: ['build', 'construct'] },
    { id: 'screwdriver', category: 'tools', keywords: ['fix', 'repair'] },
    { id: 'paint-roller', category: 'tools', keywords: ['paint', 'color'] },
    { id: 'brush', category: 'tools', keywords: ['paint', 'art'] },
    { id: 'camera-retro', category: 'tools', keywords: ['photo', 'pic'] },
    { id: 'box', category: 'tools', keywords: ['package', 'ship'] },
    { id: 'truck', category: 'tools', keywords: ['deliver', 'ship'] },

    // ── Arrows ──
    { id: 'arrow-right', category: 'arrows', keywords: ['next', 'direction'] },
    { id: 'arrow-left', category: 'arrows', keywords: ['back', 'direction'] },
    { id: 'arrow-up', category: 'arrows', keywords: ['top', 'direction'] },
    { id: 'arrow-down', category: 'arrows', keywords: ['bottom', 'direction'] },
    { id: 'rotate', category: 'arrows', keywords: ['spin', 'turn'] },
    { id: 'shuffle', category: 'arrows', keywords: ['random', 'mix'] },
    { id: 'repeat', category: 'arrows', keywords: ['loop', 'cycle'] },
    { id: 'double-right', category: 'arrows', keywords: ['fast', 'forward'] },
    { id: 'double-left', category: 'arrows', keywords: ['fast', 'backward'] },
];
