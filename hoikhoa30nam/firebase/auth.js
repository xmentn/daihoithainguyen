// firebase/auth.js

import { auth, db } from "./firebase-config.js";

import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

/* =========================================
   ĐĂNG NHẬP
========================================= */

async function login(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password,
    );

    return userCredential.user;
  } catch (error) {
    console.error("Lỗi đăng nhập:", error);

    throw error;
  }
}

/* =========================================
   ĐĂNG XUẤT
========================================= */

async function logout() {
  await signOut(auth);
}

/* =========================================
   LẤY THÔNG TIN NGƯỜI DÙNG TỪ FIRESTORE
========================================= */

async function getUserProfile(uid) {
  const userRef = doc(db, "users", uid);

  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
}

/* =========================================
   THEO DÕI TRẠNG THÁI ĐĂNG NHẬP
========================================= */

function watchAuth(callback) {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      callback(null);

      return;
    }

    const profile = await getUserProfile(user.uid);

    callback({
      authUser: user,
      profile,
    });
  });
}

export { login, logout, getUserProfile, watchAuth };
