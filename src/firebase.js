import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDES5cDL_QPRJqXQJjnSqkCf1pSOtgsjd8",
  authDomain: "aakash-academics.firebaseapp.com",
  projectId: "aakash-academics",
  storageBucket: "aakash-academics.firebasestorage.app",
  messagingSenderId: "337869920006",
  appId: "1:337869920006:web:9e19a81115ef66e635f087",
  measurementId: "G-KBHG2L61YK"
};

const app = initializeApp(firebaseConfig);
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db, analytics };
