import { auth, db } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Hàm đăng nhập
window.loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password,
    );
    const user = userCredential.user;

    // Kiểm tra quyền admin trong Firestore
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists() && userDoc.data().role === "admin") {
      window.location.href = "admin.html";
    } else {
      window.location.href = "index.html"; // User thường chỉ xem dashboard
    }
  } catch (error) {
    alert("Đăng nhập thất bại: " + error.message);
  }
};

// Hàm đăng xuất
window.logoutUser = () => {
  signOut(auth).then(() => {
    window.location.href = "index.html";
  });
};

// Kiểm tra quyền truy cập cho trang Admin
window.checkAdminAccess = () => {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "login.html";
    } else {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists() || userDoc.data().role !== "admin") {
        alert("Bạn không có quyền truy cập vùng này!");
        window.location.href = "index.html";
      }
    }
  });
};
