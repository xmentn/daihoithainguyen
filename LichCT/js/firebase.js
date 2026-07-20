import { initializeApp } from
    "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";

import { getFirestore } from
    "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import { getAuth } from
    "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyACP_C_A5eDHi8mNqBuchOFWoTtQi1T1qI",
    authDomain: "lichcongtac-2d45c.firebaseapp.com",
    projectId: "lichcongtac-2d45c",
    storageBucket: "lichcongtac-2d45c.firebasestorage.app",
    messagingSenderId: "1039349409310",
    appId: "1:1039349409310:web:84b94be2aed99cdc72b00f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
