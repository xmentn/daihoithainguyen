// firebase/firebase-config.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
const firebaseConfig = {
  apiKey: "AIzaSyDCWkb2Sn36UbGzCshO4eunn5GozW3Ht7E",

  authDomain: "hoikhoa30nam-phubinh.firebaseapp.com",

  projectId: "hoikhoa30nam-phubinh",

  storageBucket: "hoikhoa30nam-phubinh.firebasestorage.app",

  messagingSenderId: "846652212175",

  appId: "1:846652212175:web:8cd1c15087b991d6ee48ba",
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);

export { app, auth, db };
