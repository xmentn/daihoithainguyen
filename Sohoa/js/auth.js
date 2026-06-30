import { auth, db } from './firebase-config.js';
import { signInWithEmailAndPassword, signOut, setPersistence, browserSessionPersistence } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ĐỂ LẠI HÀM HIỆN LỖI LÊN ĐẦU FILE ĐỂ ĐẢM BẢO LUÔN ĐƯỢC GỌI KHI CÓ LỖI CHỮA CHÁY
function showLoginError(message) {
  const errContainer = document.getElementById('error-message');
  const errText = document.getElementById('error-text');
  if (errContainer && errText) {
    errText.innerText = message;
    errContainer.style.display = "block";
  } else {
    // Phương án dự phòng nếu thẻ hiển thị lỗi HTML chưa sẵn sàng
    alert(message);
  }
}

// ĐẨY HÀM ĐĂNG NHẬP RA TOÀN CỤC
window.loginUser = async function (e) {
  e.preventDefault();

  // GIẢI PHÁP THÔNG MINH: Quét cả 2 trường hợp ID 'email' hoặc 'login-email' để chống lỗi Null tuyệt đối
  const emailInput = document.getElementById('email') || document.getElementById('login-email');
  const passwordInput = document.getElementById('password') || document.getElementById('login-password');

  // Quét tìm nút bấm Đăng nhập theo class hoặc cấu trúc có sẵn
  const btnLogin = document.querySelector('.btn-login') || document.querySelector('.btn-submit');

  if (!emailInput || !passwordInput) {
    showLoginError("Lỗi hệ thống: Form không tìm thấy ô nhập Email hoặc Mật khẩu trên giao diện HTML!");
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
    // CẤU HÌNH BẢO MẬT: Ép hệ thống xóa session đăng nhập ngay khi tắt tab/trình duyệt
    await setPersistence(auth, browserSessionPersistence);

    // Tiến hành đăng nhập Firebase
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Truy vấnFirestore kiểm tra quyền Admin
    const userDoc = await getDoc(doc(db, "users", user.uid));

    if (userDoc.exists() && userDoc.data().role === "admin") {
      const errContainer = document.getElementById('error-message');
      if (errContainer) errContainer.style.display = "none";

      if (btnLogin) {
        btnLogin.innerHTML = "<i class='fa-solid fa-circle-check'></i> Đăng nhập thành công!";
        btnLogin.style.backgroundColor = "#27ae60";
      }

      // Dẫn thẳng vào trang quản trị dữ liệu
      setTimeout(() => {
        window.location.href = "admin.html";
      }, 1000);
    } else {
      // Nếu không có quyền, đăng xuất ngay lập tức
      await signOut(auth);
      if (btnLogin) {
        btnLogin.innerHTML = originalText;
        btnLogin.disabled = false;
      }
      showLoginError("Tài khoản của bạn không có quyền truy cập vùng Quản trị!");
    }
  } catch (error) {
    if (btnLogin) {
      btnLogin.innerHTML = originalText;
      btnLogin.disabled = false;
    }
    console.error("Lỗi đăng nhập hệ thống:", error);

    // Phân loại lỗi và hiển thị tiếng Việt chuyên nghiệp trực tiếp lên form
    if (error.code === "auth/invalid-credential" || error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
      showLoginError("Mật khẩu hoặc tài khoản Admin công vụ không chính xác!");
    } else if (error.code === "auth/invalid-email") {
      showLoginError("Định dạng địa chỉ Email công vụ không hợp lệ!");
    } else {
      showLoginError("Lỗi kết nối máy chủ: " + error.message);
    }
  }
};

// ĐẨY HÀM ĐĂNG XUẤT RA TOÀN CỤC ĐỒNG BỘ
window.logoutUser = function () {
  signOut(auth).then(() => {
    window.location.href = "login.html";
  }).catch((error) => {
    alert("Lỗi đăng xuất: " + error.message);
  });
};