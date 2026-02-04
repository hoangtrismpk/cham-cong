// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDsCndrOZUcpRaDTuNfut6rVU_uuzCHqN0",
    authDomain: "cham-cong-62e5a.firebaseapp.com",
    projectId: "cham-cong-62e5a",
    storageBucket: "cham-cong-62e5a.firebasestorage.app",
    messagingSenderId: "19738197573",
    appId: "1:19738197573:web:ec2abdb829cbd2be7d2d2c"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const messaging = async () => {
    const isSupported = await import('firebase/messaging').then(
        (mod) => mod.isSupported
    );
    if (await isSupported()) {
        return getMessaging(app);
    }
    return null;
};

export const VAPID_KEY = 'BJdv2HB6je79eUCBbjqSAdnQX88BQHu8fxVxmAmRJ4ljyY_nwQI46lhFyQ0hjANRGRht4RdumZVOEIetUMFKnQM';
export { app, getToken, onMessage };
