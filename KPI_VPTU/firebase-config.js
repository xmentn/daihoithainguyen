// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDaXML8B1NALTDL5W0au_xja-2OV34_K-A",

  authDomain: "kpi-vptu.firebaseapp.com",

  projectId: "kpi-vptu",

  storageBucket: "kpi-vptu.firebasestorage.app",

  messagingSenderId: "439455157334",

  appId: "1:439455157334:web:29b59127ca383a1df13ff7",
};

// Khởi tạo ứng dụng và kết nối Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
