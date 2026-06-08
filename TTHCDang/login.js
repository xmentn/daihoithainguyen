import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  get,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// Sử dụng hằng số cấu hình dự án TTHCDang của anh
const firebaseConfig = {
  apiKey: "AIzaSyBQf87uHhZkcnyVLCxMYSetDoeqjfUVphY",
  authDomain: "tthcdang.firebaseapp.com",
  databaseURL:
    "https://tthcdang-default-rtdb.asia-southeast1.firebasedatabase.app/", // <-- Anh đã tự thêm dòng này vào đây
  projectId: "tthcdang",
  storageBucket: "tthcdang.firebasestorage.app",
  messagingSenderId: "362559187523",
  appId: "1:362559187523:web:736535db17553be2ff82f6",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

document.getElementById("form-login").addEventListener("submit", (e) => {
  e.preventDefault();
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;
  const errorDiv = document.getElementById("login-error");

  errorDiv.style.display = "none";

  signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      const uid = userCredential.user.uid;
      // Kiểm tra phân quyền từ Database
      get(ref(database, "users/" + uid)).then((snapshot) => {
        if (snapshot.exists()) {
          const userData = snapshot.val();
          // Lưu vai trò vào sessionStorage tạm thời để tối ưu hóa điều hướng
          sessionStorage.setItem("userRole", userData.role);
          sessionStorage.setItem("userEmail", userData.email);
          window.location.href = "index.html";
        } else {
          errorDiv.innerText =
            "Tài khoản chưa được cấu hình phân quyền trên hệ thống.";
          errorDiv.style.display = "block";
        }
      });
    })
    .catch((error) => {
      // Gọi hàm hiển thị thông báo lỗi mượt mà của SweetAlert2
      showToast("Email hoặc mật khẩu không chính xác!", "error");
      console.error(error);
    });
});
// --- CẤU HÌNH HÀM THÔNG BÁO CHUYÊN NGHIỆP BẰNG THƯ VIỆN SWEETALERT2 ---
// icon gồm các loại: 'success' (thành công), 'error' (lỗi), 'warning' (cảnh báo), 'info' (thông tin)
window.showToast = function (message, iconType = "success") {
  Swal.fire({
    toast: true, // Chuyển sang chế độ hộp nổi nhỏ (Toast) thay vì hiện giữa màn hình
    position: "top-end", // Hiển thị ở góc trên bên phải màn hình
    icon: iconType, // Loại icon hiển thị (màu sắc tự thay đổi theo loại)
    title: message, // Nội dung thông báo
    showConfirmButton: false, // Ẩn nút "OK" của hệ thống
    timer: 3000, // Tự động ẩn sau 3 giây (3000ms)
    timerProgressBar: true, // Hiển thị thanh chạy thời gian đếm ngược phía dưới hộp thoại
    didOpen: (toast) => {
      toast.addEventListener("mouseenter", Swal.stopTimer);
      toast.addEventListener("mouseleave", Swal.resumeTimer);
    },
  });
};
