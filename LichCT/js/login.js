import { auth, db } from "./firebase.js";

import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginButton = document.getElementById("loginButton");
const loginMessage = document.getElementById("loginMessage");
const togglePassword = document.getElementById("togglePassword");

let checkingCurrentUser = true;

onAuthStateChanged(auth, async (user) => {
    if (!checkingCurrentUser || !user) {
        return;
    }

    const isAdmin = await checkAdminRole(user.uid);

    if (isAdmin) {
        window.location.replace("./admin.html");
    } else {
        await signOut(auth);
    }
});

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    loginButton.disabled = true;
    loginButton.textContent = "Đang đăng nhập...";
    hideMessage();

    try {
        checkingCurrentUser = false;

        const credential = await signInWithEmailAndPassword(
            auth,
            email,
            password
        );

        const isAdmin = await checkAdminRole(credential.user.uid);

        if (!isAdmin) {
            await signOut(auth);
            showMessage(
                "Tài khoản này không có quyền quản trị.",
                "error"
            );
            return;
        }

        window.location.replace("./admin.html");
    } catch (error) {
        console.error(error);
        showMessage(getLoginErrorMessage(error.code), "error");
    } finally {
        loginButton.disabled = false;
        loginButton.textContent = "Đăng nhập";
    }
});

togglePassword.addEventListener("click", () => {
    const isPassword = passwordInput.type === "password";
    passwordInput.type = isPassword ? "text" : "password";
    togglePassword.textContent = isPassword ? "Ẩn" : "Hiện";
});

async function checkAdminRole(uid) {
    try {
        const userDocument = await getDoc(doc(db, "users", uid));

        return (
            userDocument.exists() &&
            userDocument.data().role === "admin" &&
            userDocument.data().active !== false
        );
    } catch (error) {
        console.error(error);
        return false;
    }
}

function getLoginErrorMessage(errorCode) {
    const messages = {
        "auth/invalid-email": "Địa chỉ email không hợp lệ.",
        "auth/invalid-credential": "Email hoặc mật khẩu không đúng.",
        "auth/user-disabled": "Tài khoản đã bị khóa.",
        "auth/too-many-requests":
            "Bạn đã đăng nhập sai quá nhiều lần. Vui lòng thử lại sau.",
        "auth/network-request-failed":
            "Không thể kết nối Firebase. Hãy kiểm tra Internet."
    };

    return messages[errorCode] || "Không thể đăng nhập. Vui lòng kiểm tra lại.";
}

function showMessage(text, type) {
    loginMessage.textContent = text;
    loginMessage.className =
        type === "success"
            ? "message message-success"
            : "message message-error";
}

function hideMessage() {
    loginMessage.classList.add("hidden");
}
