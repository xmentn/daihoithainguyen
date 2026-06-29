import { auth, db } from './firebase-config.js';
import { signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ĐẨY HÀM ĐĂNG NHẬP RA TOÀN CỤC
window.loginUser = async function (e) {
  e.preventDefault();

  // Đảm bảo lấy đúng ID "email" và "password" viết thường giống hệt trong file login.html của bạn
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const btnLogin = document.querySelector('.btn-login') || document.querySelector('.btn-submit');

  if (!emailInput || !passwordInput) {
    alert("Lỗi hệ thống: Không tìm thấy các ô nhập liệu email hoặc mật khẩu trên giao diện HTML!");
    return;
  }

  const email = emailInput.value;
  const password = passwordInput.value;
  const originalText = btnLogin ? btnLogin.innerHTML : "Đăng nhập";

  if (btnLogin) {
    btnLogin.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Đang xác thực...";
    btnLogin.disabled = true;
  }

  try {
    // ... (Giữ nguyên toàn bộ đoạn code xử lý đăng nhập thành công phía trên của bạn) ...
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const userDoc = await getDoc(doc(db, "users", user.uid));

    if (userDoc.exists() && userDoc.data().role === "admin") {
      // Ẩn thông báo lỗi nếu có trước đó khi thành công
      const errContainer = document.getElementById('error-message');
      if (errContainer) errContainer.style.display = "none";

      if (btnLogin) {
        btnLogin.innerHTML = "<i class='fa-solid fa-circle-check'></i> Đăng nhập thành công!";
        btnLogin.style.backgroundColor = "#27ae60";
      }
      setTimeout(() => { window.location.href = "admin.html"; }, 1000);
    } else {
      await signOut(auth);
      if (btnLogin) { btnLogin.innerHTML = originalText; btnLogin.disabled = false; }

      // THAY ALERT BẰNG THÔNG BÁO TRÊN FORM
      showLoginError("Tài khoản của bạn không có quyền truy cập vùng Quản trị!");
    }
  } catch (error) {
    if (btnLogin) { btnLogin.innerHTML = originalText; btnLogin.disabled = false; }
    console.error("Lỗi đăng nhập:", error);

    // Bắt lỗi và Việt hóa hiển thị trực quan trên form
    if (error.code === "auth/invalid-credential" || error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
      showLoginError("Mật khẩu hoặc tài khoản Admin công vụ không chính xác!");
    } else if (error.code === "auth/invalid-email") {
      showLoginError("Định dạng địa chỉ Email công vụ không hợp lệ!");
    } else {
      showLoginError("Lỗi kết hệ thống: " + error.message);
    }
  }
};

// Hàm phụ trợ xử lý hiển thị vùng thông báo lỗi mượt mà
function showLoginError(message) {
  const errContainer = document.getElementById('error-message');
  const errText = document.getElementById('error-text');
  if (errContainer && errText) {
    errText.innerText = message;
    errContainer.style.display = "block";
    // Tạo hiệu ứng rung nhẹ cảnh báo nếu muốn
    errContainer.style.animation = "shake 0.3s ease-in-out";
  }
}

// ĐẨY HÀM ĐĂNG XUẤT RA TOÀN CỤC (Đồng bộ dự phòng)
window.logoutUser = function () {
  signOut(auth).then(() => {
    window.location.href = "login.html";
  }).catch((error) => {
    alert("Lỗi đăng xuất: " + error.message);
  });
};