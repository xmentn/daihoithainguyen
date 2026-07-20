import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

/**
 * Chỉ cho phép tài khoản có users/{uid}.role = "admin".
 * Hàm trả về thông tin người đăng nhập nếu hợp lệ.
 */
export function requireAdmin() {
    return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            unsubscribe();

            if (!user) {
                redirectToLogin();
                return;
            }

            try {
                const userDocument = await getDoc(doc(db, "users", user.uid));

                const userData = userDocument.exists()
                    ? userDocument.data()
                    : null;

                const isAdmin =
                    userData &&
                    userData.role === "admin" &&
                    userData.active !== false;

                if (!isAdmin) {
                    window.location.replace("./index.html");
                    return;
                }

                resolve({
                    firebaseUser: user,
                    profile: userData
                });
            } catch (error) {
                console.error("Không kiểm tra được quyền admin:", error);
                redirectToLogin();
            }
        });
    });
}

function redirectToLogin() {
    const returnUrl = encodeURIComponent(
        window.location.pathname.split("/").pop() || "admin.html"
    );

    window.location.replace(`./login.html?returnUrl=${returnUrl}`);
}
