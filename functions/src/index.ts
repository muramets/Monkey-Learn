import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {
    shouldDecay,
    computeDecayedScore,
    buildDecayHistoryPayload,
} from "../../src/utils/decayCalculations";
import type { Innerface } from "../../src/features/innerfaces/types";

// Lazy init — don't touch admin at module load or the firebase-tools
// deploy analyzer's 10s discovery timeout will fire.
function getDb(): admin.firestore.Firestore {
    if (admin.apps.length === 0) admin.initializeApp();
    return admin.firestore();
}

export const checkInnerfaceDecay = functions.pubsub.schedule('every 24 hours').onRun(async () => {
    console.log('Running Innerface Decay Check');
    const db = getDb();

    const querySnapshot = await db.collectionGroup('innerfaces')
        .where('decaySettings.enabled', '==', true)
        .get();

    console.log(`Found ${querySnapshot.size} innerfaces with decay enabled.`);

    let batch = db.batch();
    let batchCount = 0;
    const MAX_BATCH_SIZE = 450;

    const now = new Date();

    for (const doc of querySnapshot.docs) {
        const innerface = doc.data() as Innerface;
        const decaySettings = innerface.decaySettings;

        if (!decaySettings) continue;

        const lastActivityDateStr =
            innerface.lastCheckInDate ||
            decaySettings.lastDecayDate ||
            innerface.createdAt ||
            null;

        if (!shouldDecay(decaySettings, lastActivityDateStr, now)) continue;

        const currentScore = innerface.currentScore ?? innerface.initialScore ?? 0;
        const newScore = computeDecayedScore(innerface, decaySettings.amount);

        // Skip when already at floor and no change would result.
        if (currentScore === 0 && newScore === 0) continue;

        console.log(
            `Decaying Innerface ${doc.id} (${innerface.name}): ${currentScore} -> ${newScore}`
        );

        const innerfaceRef = doc.ref;
        batch.update(innerfaceRef, {
            currentScore: newScore,
            'decaySettings.lastDecayDate': now.toISOString(),
        });

        const personalityRef = innerfaceRef.parent.parent;
        if (personalityRef) {
            const newHistoryRef = personalityRef.collection('history').doc();
            const historyRecord = {
                ...buildDecayHistoryPayload(doc.id, decaySettings.amount, now),
                serverTimestamp: admin.firestore.FieldValue.serverTimestamp(),
            };
            batch.set(newHistoryRef, historyRecord);
        }

        batchCount++;
        if (batchCount >= MAX_BATCH_SIZE) {
            await batch.commit();
            batch = db.batch();
            batchCount = 0;
        }
    }

    if (batchCount > 0) {
        await batch.commit();
        console.log(`Final commit: ${batchCount} updates.`);
    }

    return null;
});
