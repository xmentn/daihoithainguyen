// Import các thư viện Firebase từ Google CDN (Bao gồm Firestore và Auth)
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
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

// ==========================================
// CẤU HÌNH FIREBASE CHUẨN CỦA DỰ ÁN
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyCSc_lMd9m8_tNhDxB8K00XNqTlPiBujyE",
  authDomain: "hoitruong-db.firebaseapp.com",
  projectId: "hoitruong-db",
  storageBucket: "hoitruong-db.firebasestorage.app",
  messagingSenderId: "58232400004",
  appId: "1:58232400004:web:6422f76bc8d5499b22fad1",
};

// Khởi tạo ứng dụng Firebase
const app = initializeApp(firebaseConfig);

// Khởi tạo dịch vụ cơ sở dữ liệu Firestore
const db = getFirestore(app);

// Khởi tạo dịch vụ xác thực tài khoản quản trị
const auth = getAuth(app);

// Xuất các hàm để file admin.js và script.js dùng chung điều khiển hệ thống
export {
  db,
  auth,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
};
