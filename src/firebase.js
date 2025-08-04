// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore"; // <-- Add this

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBp9piWUcgb-UrSW1tsfmiFc0Wo7wNckdw",
  authDomain: "network-inventory-23432.firebaseapp.com",
  projectId: "network-inventory-23432",
  storageBucket: "network-inventory-23432.firebasestorage.app",
  messagingSenderId: "873251414273",
  appId: "1:873251414273:web:ce55927cdcc46a40b77b00",
  measurementId: "G-HFY1ZGB13Y"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firestore and export it
const db = getFirestore(app);

export { db };