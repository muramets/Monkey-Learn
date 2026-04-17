import * as admin from 'firebase-admin';

/**
 * Lazy singleton for the admin SDK. Uses Application Default Credentials
 * (run `gcloud auth application-default login` once) and the project id
 * from GOOGLE_CLOUD_PROJECT. Safe to call multiple times per process.
 */
let app: admin.app.App | undefined;

export function getApp(): admin.app.App {
    if (app) return app;
    if (admin.apps.length > 0) {
        app = admin.apps[0] as admin.app.App;
        return app;
    }
    const projectId = process.env.GOOGLE_CLOUD_PROJECT;
    if (!projectId) {
        throw new Error('GOOGLE_CLOUD_PROJECT env var is required');
    }
    app = admin.initializeApp({ projectId });
    return app;
}

export function getDb(): admin.firestore.Firestore {
    return getApp().firestore();
}

export const FieldValue = admin.firestore.FieldValue;
