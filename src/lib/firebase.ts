import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  // TODO: 環境変数から設定を読み込む
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

console.log('Firebase Config:', {
  ...firebaseConfig,
  apiKey: firebaseConfig.apiKey ? '***' : undefined,
});

// Initialize Firebase
let app;
if (getApps().length === 0) {
  console.log('Initializing new Firebase app');
  app = initializeApp(firebaseConfig);
} else {
  console.log('Using existing Firebase app');
  app = getApps()[0];
}

const auth = getAuth(app);
const db = getFirestore(app);

console.log('Firebase initialized with:', {
  app: app.name,
  auth: auth.app.name,
  db: db.app.name,
});

export { auth, db }; 