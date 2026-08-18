// ======================================================
// LOGIN.JS
//
// - Đăng nhập Firebase Authentication
// - Kiểm tra hồ sơ users/{uid}
// - Admin: đăng nhập bình thường
// - Đơn vị lần đầu:
//      + Phải xác minh email
//      + Tìm đơn vị được Admin cấp email
//      + Tự tạo users/{uid}
//      + Gắn unitId
// - Sau đăng nhập đều quay về index.html
//
// ======================================================

import { auth, db } from "./firebase-config.js";

// ======================================================
// FIREBASE AUTH
// ======================================================

import {
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

// ======================================================
// FIRESTORE
// ======================================================

import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  limit,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

// ======================================================
// LẤY CÁC PHẦN TỬ HTML
// ======================================================

const loginForm = document.getElementById("loginForm");

const emailInput = document.getElementById("email");

const passwordInput = document.getElementById("password");

const loginMessage = document.getElementById("loginMessage");

const submitButton = loginForm.querySelector("button[type='submit']");

// ======================================================
// XỬ LÝ ĐĂNG NHẬP
// ======================================================

loginForm.addEventListener(
  "submit",

  async function (event) {
    event.preventDefault();

    const email = emailInput.value.trim().toLowerCase();

    const password = passwordInput.value;

    // ==================================================
    // KIỂM TRA INPUT
    // ==================================================

    if (!email) {
      showMessage("Vui lòng nhập tài khoản.", "error");

      emailInput.focus();

      return;
    }

    if (!password) {
      showMessage("Vui lòng nhập mật khẩu.", "error");

      passwordInput.focus();

      return;
    }

    setLoading(true);

    showMessage("Đang kiểm tra tài khoản...", "");

    try {
      // ==================================================
      // 1. ĐĂNG NHẬP AUTHENTICATION
      // ==================================================

      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );

      let user = userCredential.user;

      // ==================================================
      // 2. LÀM MỚI THÔNG TIN USER
      //
      // Quan trọng sau khi người dùng
      // vừa xác minh email.
      // ==================================================

      await user.reload();

      user = auth.currentUser;

      // Làm mới ID token để Firestore Rules
      // nhận đúng email_verified
      await user.getIdToken(true);

      console.log("Đăng nhập Authentication thành công:");

      console.log("Email:", user.email);

      console.log("UID:", user.uid);

      console.log("Email verified:", user.emailVerified);

      // ==================================================
      // 3. KIỂM TRA users/{uid} ĐÃ CÓ CHƯA
      // ==================================================

      const userRef = doc(db, "users", user.uid);

      const userSnap = await getDoc(userRef);

      // ==================================================
      // 4. ĐÃ CÓ HỒ SƠ USER
      // ==================================================

      if (userSnap.exists()) {
        const userData = userSnap.data();

        console.log("Hồ sơ người dùng:", userData);

        // ----------------------------------------------
        // TÀI KHOẢN BỊ KHÓA
        // ----------------------------------------------

        if (userData.active === false) {
          await signOut(auth);

          showMessage(
            "Tài khoản đã bị khóa. Vui lòng liên hệ quản trị hệ thống.",
            "error",
          );

          return;
        }

        // ----------------------------------------------
        // ADMIN
        // ----------------------------------------------

        if (userData.role === "admin") {
          console.log("Quyền: ADMIN");

          showMessage("Đăng nhập thành công!", "success");

          redirectHome();

          return;
        }

        // ----------------------------------------------
        // ĐƠN VỊ
        // ----------------------------------------------

        if (userData.role === "commune") {
          // Đơn vị bắt buộc xác minh email
          if (!user.emailVerified) {
            await signOut(auth);

            showMessage(
              "Email chưa được xác minh. Vui lòng mở email và bấm liên kết xác minh trước khi đăng nhập.",
              "error",
            );

            return;
          }

          console.log("Quyền: ĐƠN VỊ");

          console.log("Unit ID:", userData.unitId);

          showMessage("Đăng nhập thành công!", "success");

          redirectHome();

          return;
        }

        // ----------------------------------------------
        // ROLE KHÔNG HỢP LỆ
        // ----------------------------------------------

        await signOut(auth);

        showMessage("Tài khoản chưa được phân quyền hợp lệ.", "error");

        return;
      }

      // ==================================================
      // 5. CHƯA CÓ users/{uid}
      //
      // Đây là trường hợp tài khoản đơn vị
      // đăng nhập lần đầu tiên.
      // ==================================================

      // ==================================================
      // PHẢI XÁC MINH EMAIL
      // ==================================================

      if (!user.emailVerified) {
        await signOut(auth);

        showMessage(
          "Email chưa được xác minh. Vui lòng mở email và bấm liên kết xác minh trước khi đăng nhập.",
          "error",
        );

        return;
      }

      // ==================================================
      // 6. TÌM ĐƠN VỊ ĐƯỢC ADMIN CẤP EMAIL
      // ==================================================

      const loginEmail = user.email.trim().toLowerCase();

      console.log("Đang tìm đơn vị theo email:", loginEmail);

      const unitQuery = query(
        collection(db, "units"),

        where("loginEmail", "==", loginEmail),

        where("accountEnabled", "==", true),

        where("active", "==", true),

        limit(2),
      );

      const unitSnapshot = await getDocs(unitQuery);

      // ==================================================
      // KHÔNG TÌM THẤY ĐƠN VỊ
      // ==================================================

      if (unitSnapshot.empty) {
        await signOut(auth);

        showMessage(
          "Email này chưa được quản trị viên cấp quyền cho đơn vị nào.",
          "error",
        );

        return;
      }

      // ==================================================
      // NẾU 1 EMAIL BỊ GÁN CHO NHIỀU ĐƠN VỊ
      // ==================================================

      if (unitSnapshot.size > 1) {
        await signOut(auth);

        showMessage(
          "Email đang được gán cho nhiều đơn vị. Vui lòng liên hệ quản trị hệ thống.",
          "error",
        );

        return;
      }

      // ==================================================
      // 7. LẤY ĐƠN VỊ
      // ==================================================

      const unitDocument = unitSnapshot.docs[0];

      const unitData = unitDocument.data();

      const unitId = unitDocument.id;

      console.log("Đã xác định đơn vị:");

      console.log("Tên đơn vị:", unitData.name);

      console.log("Unit ID:", unitId);

      // ==================================================
      // 8. TẠO USERS/{UID}
      // ==================================================

      await setDoc(
        userRef,

        {
          displayName: unitData.name || loginEmail,

          // Dùng đúng email Firebase Auth
          // để khớp với Security Rules
          email: user.email,

          role: "commune",

          unitId: unitId,

          unitName: unitData.name || "",

          unitCode: unitData.code || "",

          active: true,

          createdAt: serverTimestamp(),

          updatedAt: serverTimestamp(),
        },
      );

      console.log("Đã tạo hồ sơ users/" + user.uid);

      console.log("Đã liên kết tài khoản với:", unitData.name);

      // ==================================================
      // 9. ĐĂNG NHẬP THÀNH CÔNG
      // ==================================================

      showMessage(
        "Đăng nhập thành công! Tài khoản đã được liên kết với " +
          (unitData.name || "đơn vị") +
          ".",
        "success",
      );

      redirectHome();
    } catch (error) {
      console.error("Lỗi đăng nhập:", error);

      let message = "Không thể đăng nhập. Vui lòng thử lại.";

      // ==================================================
      // AUTH
      // ==================================================

      if (error.code === "auth/invalid-credential") {
        message = "Tài khoản hoặc mật khẩu không đúng.";
      } else if (error.code === "auth/invalid-email") {
        message = "Địa chỉ email không hợp lệ.";
      } else if (error.code === "auth/too-many-requests") {
        message = "Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau.";
      } else if (error.code === "auth/network-request-failed") {
        message = "Không thể kết nối Firebase. Vui lòng kiểm tra Internet.";
      }

      // ==================================================
      // FIRESTORE
      // ==================================================
      else if (error.code === "permission-denied") {
        message =
          "Không có quyền truy cập dữ liệu. Vui lòng kiểm tra Firestore Rules hoặc quyền tài khoản.";
      } else if (error.code === "failed-precondition") {
        message =
          "Firestore cần bổ sung chỉ mục cho truy vấn. Hãy kiểm tra Console để xem hướng dẫn tạo index.";
      }

      showMessage(message, "error");
    } finally {
      setLoading(false);
    }
  },
);

// ======================================================
// CHUYỂN VỀ TRANG CHỦ
// ======================================================

function redirectHome() {
  setTimeout(function () {
    window.location.href = "index.html";
  }, 700);
}

// ======================================================
// HIỂN THỊ THÔNG BÁO
// ======================================================

function showMessage(message, type) {
  loginMessage.textContent = message;

  loginMessage.className = "login-message";

  if (type) {
    loginMessage.classList.add(type);
  }
}

// ======================================================
// LOADING
// ======================================================

function setLoading(isLoading) {
  submitButton.disabled = isLoading;

  submitButton.textContent = isLoading ? "Đang đăng nhập..." : "Đăng nhập";
}
