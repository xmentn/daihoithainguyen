// ======================================================
// LOGIN.JS
// Đăng nhập + đọc quyền người dùng từ Firestore
// ======================================================


// ======================================================
// 1. IMPORT FIREBASE CONFIG
// ======================================================

import {
    auth,
    db
} from "./firebase-config.js";


// ======================================================
// 2. IMPORT FIREBASE AUTHENTICATION
// ======================================================

import {
    signInWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";


// ======================================================
// 3. IMPORT FIRESTORE
// ======================================================

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";


// ======================================================
// 4. LẤY CÁC THÀNH PHẦN TRÊN TRANG LOGIN
// ======================================================

const loginForm =
    document.getElementById("loginForm");

const emailInput =
    document.getElementById("email");

const passwordInput =
    document.getElementById("password");

const loginMessage =
    document.getElementById("loginMessage");

const submitButton =
    loginForm.querySelector(
        "button[type='submit']"
    );


// ======================================================
// 5. XỬ LÝ KHI NHẤN ĐĂNG NHẬP
// ======================================================

loginForm.addEventListener(
    "submit",
    async function (event) {

        // Không cho form reload trang
        event.preventDefault();


        // ==================================================
        // LẤY EMAIL VÀ MẬT KHẨU
        // ==================================================

        const email =
            emailInput.value.trim();

        const password =
            passwordInput.value;


        // ==================================================
        // KIỂM TRA DỮ LIỆU NHẬP
        // ==================================================

        if (!email) {

            showMessage(
                "Vui lòng nhập tài khoản.",
                "error"
            );

            emailInput.focus();

            return;
        }


        if (!password) {

            showMessage(
                "Vui lòng nhập mật khẩu.",
                "error"
            );

            passwordInput.focus();

            return;
        }


        // ==================================================
        // KHÓA NÚT KHI ĐANG ĐĂNG NHẬP
        // ==================================================

        setLoading(true);


        showMessage(
            "Đang kiểm tra tài khoản...",
            ""
        );


        try {

            // ==================================================
            // 6. ĐĂNG NHẬP FIREBASE AUTHENTICATION
            // ==================================================

            const userCredential =
                await signInWithEmailAndPassword(
                    auth,
                    email,
                    password
                );


            const user =
                userCredential.user;


            console.log(
                "Authentication thành công:",
                user.email
            );


            console.log(
                "UID:",
                user.uid
            );


            // ==================================================
            // 7. ĐỌC HỒ SƠ USER TRONG FIRESTORE
            //
            // users/{UID}
            // ==================================================

            const userDocRef =
                doc(
                    db,
                    "users",
                    user.uid
                );


            const userDocSnap =
                await getDoc(
                    userDocRef
                );


            // ==================================================
            // 8. KIỂM TRA HỒ SƠ CÓ TỒN TẠI KHÔNG
            // ==================================================

            if (!userDocSnap.exists()) {

                console.error(
                    "Không tìm thấy document users/" +
                    user.uid
                );


                // Đăng xuất khỏi Firebase
                // vì tài khoản chưa được cấp quyền hệ thống
                await signOut(auth);


                showMessage(
                    "Tài khoản chưa được cấp quyền sử dụng hệ thống.",
                    "error"
                );


                return;
            }


            // ==================================================
            // 9. LẤY DỮ LIỆU HỒ SƠ
            // ==================================================

            const userData =
                userDocSnap.data();


            console.log(
                "Thông tin người dùng:",
                userData
            );


            // ==================================================
            // 10. KIỂM TRA TÀI KHOẢN CÓ BỊ KHÓA KHÔNG
            // ==================================================

            if (userData.active === false) {

                await signOut(auth);


                showMessage(
                    "Tài khoản đã bị khóa. Vui lòng liên hệ quản trị hệ thống.",
                    "error"
                );


                return;
            }


            // ==================================================
            // 11. KIỂM TRA ROLE
            // ==================================================

            const role =
                userData.role;


            // ==================================================
            // ADMIN
            // ==================================================

            if (role === "admin") {

                console.log(
                    "Quyền người dùng: ADMIN"
                );


                showMessage(
                    "Đăng nhập quản trị thành công!",
                    "success"
                );


                // Chờ một chút để người dùng nhìn thấy thông báo
                setTimeout(
                    function () {

                        window.location.href =
                            "admin.html";

                    },
                    600
                );


                return;
            }


            // ==================================================
            // TÀI KHOẢN XÃ
            // ==================================================

            if (role === "commune") {

                console.log(
                    "Quyền người dùng: COMMUNE"
                );


                showMessage(
                    "Đăng nhập thành công!",
                    "success"
                );


                setTimeout(
                    function () {

                        window.location.href =
                            "commune.html";

                    },
                    600
                );


                return;
            }


            // ==================================================
            // ROLE KHÔNG HỢP LỆ
            // ==================================================

            console.error(
                "Role không hợp lệ:",
                role
            );


            await signOut(auth);


            showMessage(
                "Tài khoản chưa được phân quyền hợp lệ.",
                "error"
            );

        }

        catch (error) {

            // ==================================================
            // 12. XỬ LÝ LỖI
            // ==================================================

            console.error(
                "Lỗi đăng nhập:",
                error
            );


            let message =
                "Không thể đăng nhập. Vui lòng thử lại.";


            // Email không hợp lệ
            if (
                error.code ===
                "auth/invalid-email"
            ) {

                message =
                    "Địa chỉ email không hợp lệ.";

            }


            // Sai tài khoản hoặc mật khẩu
            else if (
                error.code ===
                "auth/invalid-credential"
            ) {

                message =
                    "Tài khoản hoặc mật khẩu không đúng.";

            }


            // Một số project/config cũ có thể trả mã này
            else if (
                error.code ===
                "auth/wrong-password"
            ) {

                message =
                    "Tài khoản hoặc mật khẩu không đúng.";

            }


            else if (
                error.code ===
                "auth/user-not-found"
            ) {

                message =
                    "Tài khoản hoặc mật khẩu không đúng.";

            }


            // Quá nhiều lần thử
            else if (
                error.code ===
                "auth/too-many-requests"
            ) {

                message =
                    "Bạn đã đăng nhập sai quá nhiều lần. Vui lòng thử lại sau.";

            }


            // Lỗi mạng
            else if (
                error.code ===
                "auth/network-request-failed"
            ) {

                message =
                    "Không thể kết nối Firebase. Vui lòng kiểm tra Internet.";

            }


            // Không có quyền đọc Firestore
            else if (
                error.code ===
                "permission-denied"
            ) {

                message =
                    "Không có quyền đọc thông tin tài khoản trong Firestore. Hãy kiểm tra Firestore Rules.";

            }


            showMessage(
                message,
                "error"
            );

        }

        finally {

            // ==================================================
            // 13. MỞ LẠI NÚT ĐĂNG NHẬP
            // ==================================================

            setLoading(false);

        }

    }
);


// ======================================================
// 14. HÀM HIỂN THỊ THÔNG BÁO
// ======================================================

function showMessage(
    message,
    type
) {

    loginMessage.textContent =
        message;


    loginMessage.className =
        "login-message";


    if (type) {

        loginMessage.classList.add(
            type
        );

    }

}


// ======================================================
// 15. HÀM ĐIỀU KHIỂN NÚT ĐĂNG NHẬP
// ======================================================

function setLoading(isLoading) {

    if (isLoading) {

        submitButton.disabled =
            true;


        submitButton.textContent =
            "Đang đăng nhập...";

    }

    else {

        submitButton.disabled =
            false;


        submitButton.textContent =
            "Đăng nhập";

    }

}