import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  projectId: "gen-lang-client-0404328444",
  appId: "1:418928659042:web:de95911fc4a694402a5f3b",
  apiKey: "AIzaSyAVWTtJH9urWU10fnIPSQjbsjfcbrtrDKA",
  authDomain: "gen-lang-client-0404328444.firebaseapp.com",
  storageBucket: "gen-lang-client-0404328444.firebasestorage.app",
  messagingSenderId: "418928659042"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Use custom firestoreDatabaseId if provided, otherwise default
const databaseId = "ai-studio-b03a51f1-2012-4908-837d-d9c3b21bfa25";
const db = getFirestore(app, databaseId);

export { app, db };
