// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDFKzGR_ngleJ23NbZAd9VBkNuU96p3Ejw",
  authDomain: "vccion-3238f.firebaseapp.com",
  databaseURL: "https://vccion-3238f-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "vccion-3238f",
  storageBucket: "vccion-3238f.firebasestorage.app",
  messagingSenderId: "161740354944",
  appId: "1:161740354944:web:73d08d60742b356da6bd65",
  measurementId: "G-T7V0TD7LEC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const rtdb = getDatabase(app);
export const auth = getAuth(app);
