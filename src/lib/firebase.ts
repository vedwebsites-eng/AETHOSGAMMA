import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
// Helper to clean up configuration and prevent common errors
const sanitizeConfig = (config: any) => {
    if (!config) return null;
    
    // Pattern detection: App IDs for web always contain colons and start with 1:
    const rawDbId = config.firestoreDatabaseId;
    const isAppId = rawDbId && (rawDbId.includes(':') || rawDbId.startsWith('1:'));
    
    if (isAppId) {
        console.warn(`Firebase: Detected App ID '${rawDbId}' being used as Database ID. Falling back to '(default)'.`);
        return {
            ...config,
            firestoreDatabaseId: '(default)'
        };
    }
    
    // Ensure we always have a database ID
    if (!config.firestoreDatabaseId) {
        return {
            ...config,
            firestoreDatabaseId: '(default)'
        };
    }
    
    return config;
};

// Fallback configuration for AI Studio environment
// In local/production environments, use VITE_ environment variables
const getFirebaseConfig = () => {
    let config: any = null;
    let configSource = "NONE";

    // 1. Check environment variables
    const envApiKey = import.meta.env.VITE_FIREBASE_API_KEY;
    const envProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
    
    const isVercelId = envProjectId && envProjectId.startsWith('prj_');

    if (envApiKey && envApiKey !== "" && envApiKey !== "undefined" && !isVercelId) {
        config = sanitizeConfig({
            apiKey: envApiKey,
            authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
            projectId: envProjectId,
            storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
            messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
            appId: import.meta.env.VITE_FIREBASE_APP_ID,
            measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
            firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID
        });
        configSource = "ENVIRONMENT_VARIABLES";
    }

    // 2. Search for configuration files (can override or supplement env vars)
    // We look for any config file and prefer those with a specific (non-default) database ID
    const allConfigs = import.meta.glob([
        '/firebase-applet-config.json',
        '../firebase-applet-config.json',
        '../../firebase-applet-config.json',
        '../../../firebase-applet-config.json'
    ], { eager: true });
    
    for (const path in allConfigs) {
        const module: any = allConfigs[path];
        const val = module?.default || module;

        if (val && val.apiKey && val.apiKey !== "MISSING_CONFIG") {
            const sanitized = sanitizeConfig(val);
            const isSpecificDbId = sanitized.firestoreDatabaseId && sanitized.firestoreDatabaseId !== '(default)';
            const currentIsDefault = !config || config.firestoreDatabaseId === '(default)';

            // Prefer file config if:
            // - No config found yet
            // - File has a specific DB ID and current one is default
            // - File has same Project ID as env but adds a DB ID
            if (!config || (isSpecificDbId && currentIsDefault)) {
                config = sanitized;
                configSource = `FILE:${path}`;
                if (isSpecificDbId) break; // Found a good one
            }
        }
    }

    console.log(`Firebase: Selected configuration from ${configSource}`);

    if (config) {
        return config;
    }

    // 3. Fallback
    console.warn("Firebase: No valid configuration found.");
    return {
        apiKey: "MISSING_CONFIG",
        authDomain: "MISSING_CONFIG",
        projectId: "MISSING_CONFIG",
        firestoreDatabaseId: '(default)'
    };
};

const firebaseConfig = getFirebaseConfig();
console.log("Firebase: Initializing with Project:", firebaseConfig.projectId, "Database:", firebaseConfig.firestoreDatabaseId);

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle() {
  try {
    console.log("Firebase: Initiating sign-in with Google...");
    const result = await signInWithPopup(auth, googleProvider);
    console.log("Firebase: Sign-in successful for user:", result.user.uid);
    return result.user;
  } catch (error: any) {
    console.error('Firebase Auth Error:', {
      code: error.code,
      message: error.message,
      customData: error.customData,
      domain: window.location.hostname
    });
    
    // Provide user-friendly hints for common AI Studio errors
    if (error.code === 'auth/operation-not-allowed') {
      console.error("HINT: Google Sign-In is likely not enabled in the Firebase Console under Authentication > Sign-in method.");
    } else if (error.code === 'auth/unauthorized-domain') {
      console.error(`HINT: The domain '${window.location.hostname}' is not authorized in the Firebase Console under Authentication > Settings > Authorized domains.`);
    }
    
    throw error;
  }
}

export async function loginWithEmail(email: string, pass: string) {
  return signInWithEmailAndPassword(auth, email, pass);
}

export async function registerWithEmail(email: string, pass: string) {
  return createUserWithEmailAndPassword(auth, email, pass);
}

export async function resetPassword(email: string) {
  return sendPasswordResetEmail(auth, email);
}

// Connection test as per instructions
async function testConnection() {
  try {
    // Try to get a document from the test collection
    // We use a specific ID that we don't expect to exist, just to check reachability
    const testDoc = doc(db, 'test', 'connectivity-check');
    await getDocFromServer(testDoc);
    console.log("Firebase connection: Reached server successfully.");
  } catch (error) {
    if (error instanceof Error) {
      console.error("Firebase connection diagnostic:", {
        message: error.message,
        code: (error as any).code,
        name: error.name
      });
      
      if (error.message.includes('the client is offline')) {
        console.error("CRITICAL: Firestore client reported offline status. This usually indicates invalid API Key or Project ID.");
        console.error("Current Project ID:", firebaseConfig.projectId);
        console.error("Current Database ID:", firebaseConfig.firestoreDatabaseId);
        
        if (firebaseConfig.projectId && firebaseConfig.projectId.startsWith('prj_')) {
          console.error("HINT: Your Project ID starts with 'prj_', which looks like a Vercel Project ID. Ensure VITE_FIREBASE_PROJECT_ID is set to your Firebase Project ID (e.g. 'gen-lang-client-...').");
        }
        
        if (firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId.includes(':')) {
          console.error("HINT: Your Database ID contains ':', which looks like a Firebase App ID. Ensure VITE_FIREBASE_DATABASE_ID is set to '(default)' or a valid Firestore Database ID.");
        }
      }
    } else {
      console.error("Firebase connection test failed with unknown error:", error);
    }
  }
}
testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export let notifyError: (msg: string) => void = () => {};
export function setErrorNotifier(fn: (msg: string) => void) {
  notifyError = fn;
}

function getFriendlyErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  if (raw.includes('permission-denied') || raw.includes('insufficient permissions')) return "ACCESS_DENIED: Firestore rules blocked that action.";
  if (raw.includes('unavailable') || raw.includes('network')) return "CONNECTION_LOST: Couldn't reach the server. Check your internet.";
  if (raw.includes('not-found')) return "NOT_FOUND: That item no longer exists.";
  return "SYNC_ERROR: Something went wrong saving that. Please try again.";
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  notifyError(getFriendlyErrorMessage(error));
}

/**
 * Recursively removes all undefined fields from an object or array to prevent Firestore write errors.
 * Optional fields with undefined values are omitted entirely from the written document structure,
 * or converted to null if explicit placeholder retention is desired.
 */
export function removeUndefinedFields<T = any>(obj: T): T {
  if (obj === undefined) {
    return null as any;
  }
  if (obj === null) {
    return null as any;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefinedFields(item)) as any;
  }
  if (typeof obj === 'object') {
    // Keep specialized class instances intact (like Firestore FieldValue/Timestamp/Date)
    const isPlain = !obj.constructor || obj.constructor.name === 'Object';
    if (!isPlain) {
      return obj;
    }
    const cleaned: any = {};
    for (const key of Object.keys(obj as any)) {
      const val = (obj as any)[key];
      if (val !== undefined) {
        cleaned[key] = removeUndefinedFields(val);
      }
    }
    return cleaned;
  }
  return obj;
}
