import { auth, db } from './firebase-config.js';
import {
  signInWithEmailAndPassword,
  signOut,
  setPersistence,
  browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// HÀM HIỆN THÔNG BÁO LỖI LÊN GIAO DIỆN
function showLoginError(message) {
  const errContainer = document.getElementById('error-message');
  const errText = document.getElementById('error-text');
  if (errContainer) {
    if (errText) {
      errText.innerText = message;
    } else {
      errContainer.innerText = message;
    }
    errContainer.style.display = "block";
  } else {
    alert(message);
  }
}

// HÀM ĐĂNG NHẬP HỆ THỐNG
window.loginUser = async function (e) {
  if (e) e.preventDefault();

  // Tìm kiếm các ô nhập liệu Email và Mật khẩu trên Form
  const emailInput = document.getElementById('email') || document.getElementById('login-email');
  const passwordInput = document.getElementById('password') || document.getElementById('login-password');

  // Tìm nút bấm Đăng nhập
  const btnLogin = document.querySelector('.btn-login') || document.querySelector('.btn-submit') || document.querySelector('button[type="submit"]');

  if (!emailInput || !passwordInput) {
    showLoginError("Lỗi hệ thống: Không tìm thấy ô nhập Email hoặc Mật khẩu trên giao diện!");
    return;
  }

  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const originalText = btnLogin ? btnLogin.innerHTML : "Đăng nhập";

  if (!email || !password) {
    showLoginError("Vui lòng nhập đầy đủ Email công vụ và Mật khẩu!");
    return;
  }

  // Cập nhật trạng thái nút bấm đang xử lý
  if (btnLogin) {
    btnLogin.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Đang xác thực...";
    btnLogin.disabled = true;
  }

  try {
    // Duy trì phiên đăng nhập trong Session (Xóa ngay khi đóng tab)
    await setPersistence(auth, browserSessionPersistence);

    // Tiến hành xác thực với Firebase Auth
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // ----------------------------------------------------
    // LUỒNG 1: TÀI KHOẢN NHẬP LIỆU CHUYÊN DỤNG (ĐƠN VỊ TRỰC THUỘC)
    // ----------------------------------------------------
    if (user.email === "nhaplieu.sohoatn@gmail.com") {
      const errContainer = document.getElementById('error-message');
      if (errContainer) errContainer.style.display = "none";

      if (btnLogin) {
        btnLogin.innerHTML = "<i class='fa-solid fa-circle-check'></i> Đăng nhập thành công!";
        btnLogin.style.backgroundColor = "#27ae60";
      }

      // Chuyển hướng về trang chủ để thực hiện cập nhật tiến độ
      setTimeout(() => {
        window.location.href = "index.html";
      }, 800);
      return;
    }

    // ----------------------------------------------------
    // LUỒNG 2: TÀI KHOẢN QUẢN TRỊ (ADMIN)
    // ----------------------------------------------------
    const userDoc = await getDoc(doc(db, "users", user.uid));

    if (userDoc.exists() && userDoc.data().role === "admin") {
      const errContainer = document.getElementById('error-message');
      if (errContainer) errContainer.style.display = "none";

      if (btnLogin) {
        btnLogin.innerHTML = "<i class='fa-solid fa-circle-check'></i> Đăng nhập Quản trị!";
        btnLogin.style.backgroundColor = "#27ae60";
      }

      // Chuyển hướng thẳng vào trang Quản trị hệ thống
      setTimeout(() => {
        window.location.href = "admin.html";
      }, 800);
    } else {
      // Nếu không phải tài khoản nhaplieu và cũng không phải Admin -> Đăng xuất
      await signOut(auth);
      if (btnLogin) {
        btnLogin.innerHTML = originalText;
        btnLogin.disabled = false;
      }
      showLoginError("Tài khoản của bạn không có quyền truy cập vào hệ thống!");
    }

  } catch (error) {
    if (btnLogin) {
      btnLogin.innerHTML = originalText;
      btnLogin.disabled = false;
    }
    console.error("Lỗi đăng nhập hệ thống:", error);

    // Bắt và dịch các mã lỗi từ Firebase Auth
    if (
      error.code === "auth/invalid-credential" ||
      error.code === "auth/user-not-found" ||
      error.code === "auth/wrong-password"
    ) {
      showLoginError("Mật khẩu hoặc tài khoản công vụ không chính xác!");
    } else if (error.code === "auth/invalid-email") {
      showLoginError("Định dạng địa chỉ Email không hợp lệ!");
    } else {
      showLoginError("Lỗi kết nối máy chủ: " + error.message);
    }
  }
};

// HÀM ĐĂNG XUẤT HỆ THỐNG
window.logoutUser = function () {
  signOut(auth).then(() => {
    window.location.href = "login.html";
  }).catch((error) => {
    alert("Lỗi đăng xuất: " + error.message);
  });
};
