import { ListColorsInput } from '../schemas';
import { PRESET_COLORS, DEFAULT_STATE_COLOR } from '../../../../src/constants/common';

/**
 * Canonical palette used by the app's ColorPicker. No Firestore access.
 * Coach is free to pass any hex to createPower/createAction/upsertGroup,
 * but these 15 are the ones the UI ships with named swatches.
 */
export async function listColors(raw: unknown): Promise<unknown> {
    ListColorsInput.parse(raw);

    const labels: Record<string, string> = {
        '#e2b714': 'Yellow',
        '#ca4754': 'Red',
        '#98c379': 'Green',
        '#7fb3d3': 'Blue',
        '#e6934a': 'Orange',
        '#c678dd': 'Purple',
        '#d19a66': 'Light Orange',
        '#56b6c2': 'Cyan',
        '#d1d0c5': 'Gray',
        '#abb2bf': 'Light Gray',
        '#e06c75': 'Light Red',
        '#be5046': 'Dark Red',
        '#61afef': 'Sky Blue',
        '#b4babe': 'Gray Blue',
        '#81bf91': 'Pale Green',
    };

    return {
        items: PRESET_COLORS.map((hex) => ({ hex, label: labels[hex] ?? hex })),
        count: PRESET_COLORS.length,
        defaultStateColor: DEFAULT_STATE_COLOR,
    };
}
