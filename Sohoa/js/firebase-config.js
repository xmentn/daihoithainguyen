// Import các thư viện Firebase SDK từ CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// THAY THẾ CÁC THÔNG SỐ NÀY BẰNG CẤU HÌNH CỦA BẠN
const firebaseConfig = {
  apiKey: "AIzaSyBPS9z4MOtXInL0hnslj82kdINd5vxix7g",
  authDomain: "sohoa-vptu.firebaseapp.com",
  projectId: "sohoa-vptu",
  storageBucket: "sohoa-vptu.firebasestorage.app",
  messagingSenderId: "540021928540",
  appId: "1:540021928540:web:15afc22155b9087c902c99",
};

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
