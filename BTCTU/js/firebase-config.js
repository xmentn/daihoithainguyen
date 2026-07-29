// Cấu hình Firebase của bạn (Lấy từ Firebase Console)
const firebaseConfig = {
  apiKey: "AIzaSyCpoQhsLSPPnzR1bUtrmTCq6qiEmahRkoM",
  authDomain: "sohoahosodangvien.firebaseapp.com",
  databaseURL:
    "https://sohoahosodangvien-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sohoahosodangvien",
  storageBucket: "sohoahosodangvien.firebasestorage.app",
  messagingSenderId: "200357328311",
  appId: "1:200357328311:web:5718f153a677771e956432",
};

// Khởi tạo Firebase nếu chưa tồn tại
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Khai báo các dịch vụ sử dụng toàn cục
const db = firebase.database(); // Phục vụ cho các code mới của anh
const database = firebase.database(); // Đảm bảo app.js và admin.js cũ chạy mượt mà, không bị lỗi "undefined"

const auth = firebase.auth();
