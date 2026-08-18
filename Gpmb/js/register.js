// ======================================================
// REGISTER.JS
//
// Đơn vị:
// - Nhập email đã được Admin cấp
// - Tự đặt mật khẩu
// - Firebase tạo Authentication account
// - Gửi email xác minh
// - Sau đó đăng xuất
//
// Hồ sơ Firestore users/{uid} sẽ được tạo
// ở bước đăng nhập sau khi email đã xác minh.
//
// ======================================================

import { auth } from "./firebase-config.js";

import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

// ======================================================
// LẤY HTML
// ======================================================

const registerForm = document.getElementById("registerForm");

const emailInput = document.getElementById("registerEmail");

const passwordInput = document.getElementById("registerPassword");

const confirmPasswordInput = document.getElementById("confirmPassword");

const registerMessage = document.getElementById("registerMessage");

const registerButton = document.getElementById("registerButton");

// ======================================================
// XỬ LÝ ĐĂNG KÝ
// ======================================================

registerForm.addEventListener(
  "submit",

  async function (event) {
    event.preventDefault();

    const email = emailInput.value.trim().toLowerCase();

    const password = passwordInput.value;

    const confirmPassword = confirmPasswordInput.value;

    // ==================================================
    // KIỂM TRA
    // ==================================================

    if (!email) {
      showMessage("Vui lòng nhập email.", "error");

      emailInput.focus();

      return;
    }

    if (password.length < 6) {
      showMessage("Mật khẩu phải có ít nhất 6 ký tự.", "error");

      passwordInput.focus();

      return;
    }

    if (password !== confirmPassword) {
      showMessage("Hai mật khẩu chưa trùng nhau.", "error");

      confirmPasswordInput.focus();

      return;
    }

    setLoading(true);

    showMessage("Đang tạo tài khoản...", "");

    try {
      // ==================================================
      // 1. TẠO AUTHENTICATION ACCOUNT
      // ==================================================

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );

      const user = userCredential.user;

      console.log("Đã tạo Authentication:", user.uid, user.email);

      // ==================================================
      // 2. GỬI EMAIL XÁC MINH
      // ==================================================

      auth.languageCode = "vi";

      await sendEmailVerification(user);

      console.log("Đã gửi email xác minh.");

      // ==================================================
      // 3. ĐĂNG XUẤT NGAY
      //
      // Người dùng phải xác minh email trước
      // rồi mới đăng nhập.
      // ==================================================

      await signOut(auth);

      // ==================================================
      // 4. THÔNG BÁO
      // ==================================================

      showMessage(
        "Đăng ký thành công. Hệ thống đã gửi email xác minh. Vui lòng mở email và bấm liên kết xác minh trước khi đăng nhập.",
        "success",
      );

      registerForm.reset();

      registerButton.textContent = "Đã gửi email xác minh";

      registerButton.disabled = true;

      // Sau 4 giây chuyển về đăng nhập
      setTimeout(function () {
        window.location.href = "login.html";
      }, 4000);
    } catch (error) {
      console.error("Lỗi đăng ký:", error);

      let message = "Không thể đăng ký tài khoản.";

      // ==================================================
      // EMAIL ĐÃ TỒN TẠI
      // ==================================================

      if (error.code === "auth/email-already-in-use") {
        message =
          "Email này đã có tài khoản. Vui lòng sử dụng chức năng đăng nhập.";
      }

      // ==================================================
      // EMAIL SAI ĐỊNH DẠNG
      // ==================================================
      else if (error.code === "auth/invalid-email") {
        message = "Địa chỉ email không hợp lệ.";
      }

      // ==================================================
      // MẬT KHẨU YẾU
      // ==================================================
      else if (error.code === "auth/weak-password") {
        message = "Mật khẩu chưa đủ mạnh.";
      }

      // ==================================================
      // LỖI MẠNG
      // ==================================================
      else if (error.code === "auth/network-request-failed") {
        message = "Không thể kết nối Firebase. Vui lòng kiểm tra Internet.";
      }

      showMessage(message, "error");

      setLoading(false);
    }
  },
);

// ======================================================
// HÀM THÔNG BÁO
// ======================================================

function showMessage(message, type) {
  registerMessage.textContent = message;

  registerMessage.className = "login-message";

  if (type) {
    registerMessage.classList.add(type);
  }
}

// ======================================================
// HÀM LOADING
// ======================================================

function setLoading(isLoading) {
  registerButton.disabled = isLoading;

  registerButton.textContent = isLoading
    ? "Đang đăng ký..."
    : "Đăng ký tài khoản";
}
