import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth'; // Adicionado GoogleAuthProvider
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAQSdhDE1j2A2VdLW9i2LvicpO_lUFKEbs",
  authDomain: "poker-vision-ai.firebaseapp.com",
  projectId: "poker-vision-ai",
  storageBucket: "poker-vision-ai.firebasestorage.app",
  messagingSenderId: "168580259823",
  appId: "1:168580259823:web:fc7b9432b5ad12735b201a",
  measurementId: "G-XH3NVL13DH"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Ativamos o provedor do Google
export const googleProvider = new GoogleAuthProvider();
