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
    "https://tthcdang-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "tthcdang",
  storageBucket: "tthcdang.firebasestorage.app",
  messagingSenderId: "362559187523",
  appId: "1:362559187523:web:736535db17553be2ff82f6",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

// --- TÍNH NĂNG ĐĂNG NHẬP CHUẨN HOÁ & BẪY LỖI SAI MẬT KHẨU ---
const loginForm = document.getElementById("form-login");
if (loginForm) {
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("password").value;

    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        const user = userCredential.user;

        // Đọc phân quyền tài khoản từ Database
        get(ref(database, "users/" + user.uid))
          .then((snapshot) => {
            if (snapshot.exists()) {
              const userData = snapshot.val();
              sessionStorage.setItem("userRole", userData.role || "user");
            } else {
              // Nếu chưa được phân quyền trong Database, mặc định cấp quyền user thường
              sessionStorage.setItem("userRole", "user");
            }

            // Thông báo đăng nhập thành công mượt mà
            Swal.fire({
              icon: "success",
              title: "ĐĂNG NHẬP THÀNH CÔNG",
              text: "Hệ thống đang chuyển hướng vào trang quản trị...",
              showConfirmButton: false,
              timer: 1500,
            });

            setTimeout(() => {
              window.location.href = "index.html";
            }, 1500);
          })
          .catch((err) => {
            console.error(err);
            window.location.href = "index.html";
          });
      })
      .catch((error) => {
        console.error("Mã lỗi xác thực từ Firebase Auth:", error.code);

        // Chuẩn hóa câu thông báo lỗi sang Tiếng Việt hành chính
        let msg = "Đăng nhập thất bại. Vui lòng kiểm tra lại tài khoản!";
        if (
          error.code === "auth/invalid-credential" ||
          error.code === "auth/wrong-password" ||
          error.code === "auth/user-not-found"
        ) {
          msg = "Mật khẩu hoặc tài khoản không chính xác. Vui lòng thử lại!";
        } else if (error.code === "auth/invalid-email") {
          msg = "Địa chỉ Email nhập vào không đúng định dạng!";
        } else if (error.code === "auth/too-many-requests") {
          msg =
            "Tài khoản bị tạm khóa do nhập sai quá nhiều lần. Vui lòng thử lại sau ít phút!";
        }

        // Hiện hộp thoại rung lắc cảnh báo lỗi của SweetAlert2
        Swal.fire({
          icon: "error",
          title: "LỖI ĐĂNG NHẬP",
          text: msg,
          confirmButtonColor: "#003366",
          confirmButtonText: "Thử lại",
        });
      });
  });
}

// --- TÍNH NĂNG ẨN / HIỆN MẬT KHẨU (BỌC TRONG ĐIỀU KIỆN DOM ĐỂ CHỐNG LỖI TREO TRANG) ---
document.addEventListener("DOMContentLoaded", () => {
  const passwordInput = document.getElementById("password");
  const togglePasswordIcon = document.getElementById("toggle-password");

  if (togglePasswordIcon && passwordInput) {
    togglePasswordIcon.addEventListener("click", function () {
      const type =
        passwordInput.getAttribute("type") === "password" ? "text" : "password";
      passwordInput.setAttribute("type", type);

      // Thay đổi hình dáng icon con mắt
      if (type === "text") {
        this.classList.remove("fa-eye");
        this.classList.add("fa-eye-slash");
      } else {
        this.classList.remove("fa-eye-slash");
        this.classList.add("fa-eye");
      }
    });
  }
});
