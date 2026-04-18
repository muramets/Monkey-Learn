import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
    faStar, faHeart, faFlag, faCheck, faBell, faUser, faHome, faCog,
    faTrash, faPen, faSearch, faPlus, faMinus, faEye, faEyeSlash,
    faLink, faCopy, faBookmark, faCircle, faBan, faScaleBalanced, faGavel, faQuestion,

    faCalendar, faClock, faFire, faTrophy, faListCheck, faChartLine,
    faRocket, faBolt, faBatteryFull, faLightbulb, faBrain, faBullseye,
    faChartBar, faClipboard, faFolder, faFile, faEnvelope, faInbox,
    faBook, faBookOpen, faPenToSquare, faAward, faCrown, faMedal,

    faCreditCard, faWallet, faCoins, faChartPie, faTag, faStore,
    faSackDollar, faMoneyBill, faReceipt, faPercent, faHandHoldingDollar,

    faHeartPulse, faDumbbell, faAppleWhole, faBed, faPersonRunning,
    faDroplet, faSpa, faPersonWalking, faPersonSwimming, faLungs,
    faBowlFood, faPills, faBandage, faWeight, faMoon, faBath,
    faHotTubPerson, faYinYang, faShoePrints,

    faTree, faLeaf, faSun, faCloud, faSnowflake, faWind, faMountain,
    faWater, faSeedling, faEarth,

    faGamepad, faPalette, faPuzzlePiece, faDice, faBaseball, faFootball,
    faGift, faCake, faSmoking, faHandRock, faMasksTheater,

    faComments, faUsers, faUserGroup, faShareNodes, faThumbsUp, faThumbsDown,
    faMessage, faHandshake, faPhone,

    faMobile, faWifi, faRobot, faGlobe, faLock, faUnlock, faKey,
    faShield, faMagnet,

    faPlane, faMap, faLocationDot, faSuitcase, faPassport, faHotel, faTrain,
    faBus, faShip, faAnchor, faCar, faBicycle, faCampground, faUmbrellaBeach,

    faUtensils, faMugHot, faWineGlass, faMartiniGlass, faBeerMugEmpty,
    faBurger, faPizzaSlice, faIceCream, faCookie, faBacon, faFish, faWheatAwn,

    faGraduationCap, faSchool, faChalkboardUser,

    faWrench, faHammer, faScrewdriverWrench, faPaintRoller, faBrush, faCameraRetro,
    faBox, faTruck,

    faClapperboard, faFilm, faVideo, faSliders, faMicrophone, faBroadcastTower,
    faRecordVinyl, faMusic, faHeadphones, faDrum, faGuitar, faVolumeHigh, faCamera,

    faCode, faCodeFork, faTerminal, faKeyboard, faMicrochip, faNetworkWired,
    faDiagramProject, faBug, faLaptop, faDesktop, faDatabase, faServer,

    faArrowRight, faArrowLeft, faArrowUp, faArrowDown, faRotate, faShuffle,
    faRepeat, faAnglesRight, faAnglesLeft,
} from '@fortawesome/free-solid-svg-icons';
import {
    ICON_CATALOG,
    ICON_CATEGORIES,
    type IconCategory,
    type IconCatalogEntry,
    type CategoryMeta,
} from './iconCatalog';

/**
 * Re-export metadata types/values from the pure catalog so existing
 * app imports keep working unchanged.
 */
export { ICON_CATEGORIES };
export type { IconCategory, CategoryMeta };

export interface IconEntry extends IconCatalogEntry {
    icon: IconDefinition;
}

/**
 * Map from catalog id → FontAwesome icon definition.
 * Single source of FA-binding. If you add an icon, add its import above
 * AND a row here; the catalog test will fail if the two drift apart.
 */
const ID_TO_FA: Record<string, IconDefinition> = {
    // Common
    'star': faStar, 'heart': faHeart, 'flag': faFlag, 'check': faCheck,
    'bell': faBell, 'user': faUser, 'home': faHome, 'cog': faCog,
    'trash': faTrash, 'pen': faPen, 'search': faSearch, 'plus': faPlus,
    'minus': faMinus, 'eye': faEye, 'eye-slash': faEyeSlash, 'link': faLink,
    'copy': faCopy, 'bookmark': faBookmark, 'circle': faCircle, 'ban': faBan,
    'question': faQuestion, 'scale-balanced': faScaleBalanced, 'gavel': faGavel,

    // Productivity
    'calendar': faCalendar, 'clock': faClock, 'fire': faFire, 'trophy': faTrophy,
    'list-check': faListCheck, 'chart-line': faChartLine, 'rocket': faRocket,
    'bolt': faBolt, 'battery-full': faBatteryFull, 'lightbulb': faLightbulb,
    'brain': faBrain, 'bullseye': faBullseye, 'chart-bar': faChartBar,
    'clipboard': faClipboard, 'folder': faFolder, 'file': faFile,
    'envelope': faEnvelope, 'inbox': faInbox, 'book': faBook, 'book-open': faBookOpen,
    'pen-to-square': faPenToSquare, 'award': faAward, 'crown': faCrown, 'medal': faMedal,

    // Media
    'clapperboard': faClapperboard, 'film': faFilm, 'video': faVideo,
    'sliders': faSliders, 'microphone': faMicrophone, 'broadcast-tower': faBroadcastTower,
    'record-vinyl': faRecordVinyl, 'music': faMusic, 'headphones': faHeadphones,
    'drum': faDrum, 'guitar': faGuitar, 'volume-high': faVolumeHigh, 'camera': faCamera,

    // Development
    'code': faCode, 'code-fork': faCodeFork, 'terminal': faTerminal,
    'keyboard': faKeyboard, 'microchip': faMicrochip, 'network-wired': faNetworkWired,
    'diagram-project': faDiagramProject, 'bug': faBug, 'laptop': faLaptop,
    'desktop': faDesktop, 'database': faDatabase, 'server': faServer,

    // Finance
    'credit-card': faCreditCard, 'wallet': faWallet, 'coins': faCoins,
    'chart-pie': faChartPie, 'tag': faTag, 'store': faStore,
    'sack-dollar': faSackDollar, 'money-bill': faMoneyBill, 'receipt': faReceipt,
    'percent': faPercent, 'hand-holding-dollar': faHandHoldingDollar,

    // Health
    'heart-pulse': faHeartPulse, 'dumbbell': faDumbbell, 'apple': faAppleWhole,
    'bed': faBed, 'person-running': faPersonRunning, 'droplet': faDroplet,
    'spa': faSpa, 'person-walking': faPersonWalking, 'person-swimming': faPersonSwimming,
    'lungs': faLungs, 'bowl-food': faBowlFood, 'pills': faPills, 'bandage': faBandage,
    'weight': faWeight, 'moon': faMoon, 'bath': faBath, 'hot-tub': faHotTubPerson,
    'yin-yang': faYinYang, 'shoe-prints': faShoePrints,

    // Nature
    'tree': faTree, 'leaf': faLeaf, 'sun': faSun, 'cloud': faCloud,
    'snowflake': faSnowflake, 'wind': faWind, 'mountain': faMountain,
    'water': faWater, 'seedling': faSeedling, 'earth': faEarth,

    // Travel
    'plane': faPlane, 'map': faMap, 'location-dot': faLocationDot,
    'suitcase': faSuitcase, 'passport': faPassport, 'hotel': faHotel,
    'train': faTrain, 'bus': faBus, 'ship': faShip, 'anchor': faAnchor,
    'car': faCar, 'bicycle': faBicycle, 'campground': faCampground,
    'umbrella-beach': faUmbrellaBeach,

    // Food
    'utensils': faUtensils, 'mug-hot': faMugHot, 'wine-glass': faWineGlass,
    'martini-glass': faMartiniGlass, 'beer-mug': faBeerMugEmpty, 'burger': faBurger,
    'pizza': faPizzaSlice, 'ice-cream': faIceCream, 'cookie': faCookie,
    'bacon': faBacon, 'fish': faFish, 'wheat': faWheatAwn,

    // Education
    'graduation-cap': faGraduationCap, 'school': faSchool, 'chalkboard-user': faChalkboardUser,

    // Lifestyle
    'gamepad': faGamepad, 'palette': faPalette, 'puzzle-piece': faPuzzlePiece,
    'dice': faDice, 'baseball': faBaseball, 'football': faFootball,
    'gift': faGift, 'cake': faCake, 'smoking': faSmoking,
    'hand-rock': faHandRock, 'masks-theater': faMasksTheater,

    // Social
    'comments': faComments, 'users': faUsers, 'user-group': faUserGroup,
    'share': faShareNodes, 'thumbs-up': faThumbsUp, 'thumbs-down': faThumbsDown,
    'message': faMessage, 'handshake': faHandshake, 'phone': faPhone,

    // Tech
    'mobile': faMobile, 'wifi': faWifi, 'robot': faRobot, 'globe': faGlobe,
    'lock': faLock, 'unlock': faUnlock, 'key': faKey, 'shield': faShield, 'magnet': faMagnet,

    // Tools
    'wrench': faWrench, 'hammer': faHammer, 'screwdriver': faScrewdriverWrench,
    'paint-roller': faPaintRoller, 'brush': faBrush, 'camera-retro': faCameraRetro,
    'box': faBox, 'truck': faTruck,

    // Arrows
    'arrow-right': faArrowRight, 'arrow-left': faArrowLeft, 'arrow-up': faArrowUp,
    'arrow-down': faArrowDown, 'rotate': faRotate, 'shuffle': faShuffle,
    'repeat': faRepeat, 'double-right': faAnglesRight, 'double-left': faAnglesLeft,
};

export const ICON_REGISTRY: IconEntry[] = ICON_CATALOG.map((entry) => ({
    ...entry,
    icon: ID_TO_FA[entry.id] ?? faQuestion,
}));

const iconMap = new Map<string, IconDefinition>();
ICON_REGISTRY.forEach((entry) => {
    iconMap.set(entry.id, entry.icon);
});

/**
 * Get FontAwesome icon definition by ID.
 * Returns faQuestion as fallback if not found.
 */
export function getIcon(id: string): IconDefinition {
    return iconMap.get(id) ?? faQuestion;
}

/**
 * Get icons filtered by category.
 */
export function getIconsByCategory(category: IconCategory): IconEntry[] {
    return ICON_REGISTRY.filter((entry) => entry.category === category);
}

/**
 * Search icons by ID or keywords.
 */
export function searchIcons(query: string): IconEntry[] {
    const q = query.toLowerCase().trim();
    if (!q) return ICON_REGISTRY;

    return ICON_REGISTRY.filter(
        (entry) =>
            entry.id.includes(q) ||
            entry.keywords.some((kw) => kw.includes(q))
    );
}

/**
 * Keys present in ID_TO_FA — exported for the catalog-sync test only.
 */
export const FA_MAPPED_IDS: readonly string[] = Object.keys(ID_TO_FA);
