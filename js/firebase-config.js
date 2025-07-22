// js/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyBiWpYR_q0syMyQY_nuKTi1_FVU8XkpGdk",
    authDomain: "costelaria-bd.firebaseapp.com",
    projectId: "costelaria-bd",
    storageBucket: "costelaria-bd.appspot.com",
    messagingSenderId: "711377156244",
    appId: "1:711377156244:web:0ff1d54be1d5fee4511c81",
    measurementId: "G-16FGB9X1Y6"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };