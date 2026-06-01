// Import các thư viện Firebase từ Google CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// ==========================================
// 🔴 BẠN DÁN CẤU HÌNH FIREBASE CỦA BẠN VÀO ĐÂY
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyCSc_lMd9m8_tNhDxB8K00XNqTlPiBujyE",

  authDomain: "hoitruong-db.firebaseapp.com",

  projectId: "hoitruong-db",

  storageBucket: "hoitruong-db.firebasestorage.app",

  messagingSenderId: "58232400004",

  appId: "1:58232400004:web:6422f76bc8d5499b22fad1",
};

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Xuất các hàm để file admin.js và script.js dùng chung
export { db, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot };
