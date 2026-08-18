// ======================================================
// INDEX-AUTH.JS
//
// Trang chủ:
//
// Chưa đăng nhập:
//     - Hiện Đăng nhập
//
// Admin:
//     - Hiện tên người dùng
//     - Hiện Quản trị
//
// Đơn vị:
//     - Hiện tên đơn vị
//     - Hiện Nhập số liệu
//
// ======================================================

import { auth, db } from "./firebase-config.js";

import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

// ======================================================
// HTML
// ======================================================

const loginButton = document.getElementById("loginButton");

const userMenu = document.getElementById("userMenu");

const currentUserName = document.getElementById("currentUserName");

const currentUserEmail = document.getElementById("currentUserEmail");

const homeLogoutButton = document.getElementById("homeLogoutButton");

const adminNavButton = document.getElementById("adminNavButton");

const communeDataNavButton = document.getElementById("communeDataNavButton");

// ======================================================
// 1. THEO DÕI TRẠNG THÁI ĐĂNG NHẬP
// ======================================================

onAuthStateChanged(
  auth,

  async function (user) {
    // ==============================================
    // Reset giao diện trước
    // ==============================================

    hideAdminButton();

    hideCommuneButton();

    // ==============================================
    // CHƯA ĐĂNG NHẬP
    // ==============================================

    if (!user) {
      console.log("Trang chủ: chưa đăng nhập.");

      showGuestInterface();

      return;
    }

    // ==============================================
    // ĐÃ ĐĂNG NHẬP
    // ==============================================

    console.log("Trang chủ: đã đăng nhập:", user.email);

    try {
      // ==========================================
      // ĐỌC users/{uid}
      // ==========================================

      const userRef = doc(db, "users", user.uid);

      const userSnap = await getDoc(userRef);

      // ==========================================
      // KHÔNG CÓ HỒ SƠ
      // ==========================================

      if (!userSnap.exists()) {
        console.warn("Không tìm thấy hồ sơ người dùng.");

        showLoggedInInterface(user.email, user.email);

        return;
      }

      const userData = userSnap.data();

      console.log("Hồ sơ người dùng:", userData);

      // ==========================================
      // TÀI KHOẢN BỊ KHÓA
      // ==========================================

      if (userData.active === false) {
        await signOut(auth);

        showGuestInterface();

        alert("Tài khoản đã bị khóa.");

        return;
      }

      // ==========================================
      // TÊN HIỂN THỊ
      // ==========================================

      const displayName =
        userData.unitName || userData.displayName || user.email || "Người dùng";

      showLoggedInInterface(displayName, user.email);

      // ==========================================
      // ADMIN
      // ==========================================

      if (userData.role === "admin") {
        console.log("Trang chủ: quyền ADMIN");

        showAdminButton();

        return;
      }

      // ==========================================
      // TÀI KHOẢN ĐƠN VỊ
      // ==========================================

      if (userData.role === "commune" && userData.unitId) {
        console.log("Trang chủ: quyền ĐƠN VỊ");

        console.log("Đơn vị:", userData.unitName);

        console.log("Unit ID:", userData.unitId);

        showCommuneButton();

        return;
      }
    } catch (error) {
      console.error("Lỗi kiểm tra quyền trang chủ:", error);

      // Auth vẫn đăng nhập nhưng không hiện
      // các chức năng đặc quyền.
      showLoggedInInterface(user.email, user.email);
    }
  },
);

// ======================================================
// 2. GIAO DIỆN CHƯA ĐĂNG NHẬP
// ======================================================

function showGuestInterface() {
  if (loginButton) {
    loginButton.style.display = "inline-flex";
  }

  if (userMenu) {
    userMenu.style.display = "none";
  }

  hideAdminButton();

  hideCommuneButton();
}

// ======================================================
// 3. GIAO DIỆN ĐÃ ĐĂNG NHẬP
// ======================================================

function showLoggedInInterface(displayName, email) {
  // Ẩn Đăng nhập
  if (loginButton) {
    loginButton.style.display = "none";
  }

  // Hiện menu người dùng
  if (userMenu) {
    userMenu.style.display = "flex";
  }

  if (currentUserName) {
    currentUserName.textContent = displayName;
  }

  if (currentUserEmail) {
    currentUserEmail.textContent = email || "";
  }
}

// ======================================================
// 4. ADMIN BUTTON
// ======================================================

function showAdminButton() {
  if (adminNavButton) {
    adminNavButton.style.display = "inline-flex";
  }
}

function hideAdminButton() {
  if (adminNavButton) {
    adminNavButton.style.display = "none";
  }
}

// ======================================================
// 5. NHẬP SỐ LIỆU BUTTON
// ======================================================

function showCommuneButton() {
  if (communeDataNavButton) {
    communeDataNavButton.style.display = "inline-flex";
  }
}

function hideCommuneButton() {
  if (communeDataNavButton) {
    communeDataNavButton.style.display = "none";
  }
}

// ======================================================
// 6. ĐĂNG XUẤT
// ======================================================

if (homeLogoutButton) {
  homeLogoutButton.addEventListener(
    "click",

    async function () {
      const confirmed = confirm("Bạn có chắc chắn muốn đăng xuất?");

      if (!confirmed) {
        return;
      }

      try {
        homeLogoutButton.disabled = true;

        homeLogoutButton.textContent = "Đang đăng xuất...";

        await signOut(auth);

        window.location.href = "index.html";
      } catch (error) {
        console.error("Lỗi đăng xuất:", error);

        alert("Không thể đăng xuất.");

        homeLogoutButton.disabled = false;

        homeLogoutButton.textContent = "Đăng xuất";
      }
    },
  );
}
