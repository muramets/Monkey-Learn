import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { getDb } from './firestore';
import { notFound } from './errors';

/**
 * Context resolution for the MonkeyLearn CLI.
 *
 * - `uid` is resolved from an email address (default: the repo owner).
 * - `personality` is resolved by explicit id, or by name (default:
 *   "youtube-producer v.0.0.2"). Name matches are case-sensitive.
 *
 * Results are cached in ~/.monkeylearn-cli/cache.json so subsequent calls
 * skip the auth + lookup round trips. Cache invalidates automatically
 * when the requested identifier no longer matches.
 */

export const DEFAULT_USER_EMAIL = 'muramets007@gmail.com';
export const DEFAULT_PERSONALITY_NAME = 'youtube-producer v.0.0.2';

const CACHE_DIR = path.join(os.homedir(), '.monkeylearn-cli');
const CACHE_FILE = path.join(CACHE_DIR, 'cache.json');

interface Cache {
    uid?: string;
    email?: string;
    personalityId?: string;
    personalityName?: string;
}

function loadCache(): Cache {
    try {
        return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')) as Cache;
    } catch {
        return {};
    }
}

function saveCache(patch: Cache): void {
    const merged = { ...loadCache(), ...patch };
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(merged, null, 2));
}

export interface PersonalityContextInput {
    personalityId?: string;
    personalityName?: string;
}

export async function resolveUid(email?: string): Promise<string> {
    // Explicit override short-circuits email resolution entirely (useful for
    // headless environments where Firebase Auth lookups aren't available).
    const uidOverride = process.env.MONKEYLEARN_UID;
    if (uidOverride) return uidOverride;

    const targetEmail =
        email ||
        process.env.MONKEYLEARN_USER_EMAIL ||
        loadCache().email ||
        DEFAULT_USER_EMAIL;

    const cache = loadCache();
    if (cache.uid && cache.email === targetEmail) return cache.uid;

    // Resolve uid from the `users` collection (profile doc carries `email`).
    // Avoids Firebase Auth's identitytoolkit API which requires a separate
    // quota-project enablement that admin SDK doesn't always pick up.
    const snap = await getDb()
        .collection('users')
        .where('email', '==', targetEmail)
        .limit(1)
        .get();
    if (snap.empty) {
        throw notFound(
            `User not found for email: ${targetEmail}. Set MONKEYLEARN_UID env if you know it.`
        );
    }
    const uid = snap.docs[0].id;
    saveCache({ uid, email: targetEmail });
    return uid;
}

export interface ResolvedPersonality {
    uid: string;
    id: string;
    name: string;
}

export async function resolvePersonality(
    input?: PersonalityContextInput,
    email?: string
): Promise<ResolvedPersonality> {
    const uid = await resolveUid(email);
    const db = getDb();

    if (input?.personalityId) {
        const snap = await db.doc(`users/${uid}/personalities/${input.personalityId}`).get();
        if (!snap.exists) {
            throw notFound(`Personality not found: ${input.personalityId}`);
        }
        const data = snap.data() as { name?: string };
        return { uid, id: input.personalityId, name: data.name ?? '' };
    }

    const targetName =
        input?.personalityName ||
        process.env.MONKEYLEARN_PERSONALITY ||
        loadCache().personalityName ||
        DEFAULT_PERSONALITY_NAME;

    const cache = loadCache();
    if (cache.personalityId && cache.personalityName === targetName) {
        const snap = await db.doc(`users/${uid}/personalities/${cache.personalityId}`).get();
        const data = snap.exists ? (snap.data() as { name?: string }) : undefined;
        if (snap.exists && data?.name === targetName) {
            return { uid, id: cache.personalityId, name: targetName };
        }
    }

    const q = await db
        .collection(`users/${uid}/personalities`)
        .where('name', '==', targetName)
        .limit(1)
        .get();

    if (q.empty) {
        throw notFound(`Personality not found by name: "${targetName}"`);
    }

    const doc = q.docs[0];
    saveCache({ personalityId: doc.id, personalityName: targetName });
    return { uid, id: doc.id, name: targetName };
}
