// ======================================================
// CẤU HÌNH FIREBASE
// ======================================================

import { initializeApp }
    from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";

import { getAuth }
    from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

import { getFirestore }
    from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";


// ======================================================
// THÔNG TIN FIREBASE PROJECT
// ======================================================

const firebaseConfig = {

    apiKey: "AIzaSyC127ENtkDRMdG6RiwGOYxcdb3nNOpULeU",

    authDomain:
        "gpmb-thai-nguyen---cao-bang.firebaseapp.com",

    projectId:
        "gpmb-thai-nguyen---cao-bang",

    storageBucket:
        "gpmb-thai-nguyen---cao-bang.firebasestorage.app",

    messagingSenderId:
        "878758271241",

    appId:
        "1:878758271241:web:b4f9f0a90cc747ba37dbd8"

};


// ======================================================
// KHỞI TẠO FIREBASE
// ======================================================

const app = initializeApp(firebaseConfig);


// ======================================================
// KHỞI TẠO AUTHENTICATION
// ======================================================

const auth = getAuth(app);


// ======================================================
// KHỞI TẠO FIRESTORE
// ======================================================

const db = getFirestore(app);


// ======================================================
// EXPORT ĐỂ CÁC FILE KHÁC SỬ DỤNG
// ======================================================

export {
    app,
    auth,
    db
};