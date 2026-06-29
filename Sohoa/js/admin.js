import { db } from "./firebase-config.js";
import {
  doc,
  updateDoc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Tự động điền số liệu cũ từ Firebase vào các ô nhập khi Admin mở trang
async function initAdminForm() {
  const docSnap = await getDoc(doc(db, "progress", "current_state"));
  if (docSnap.exists()) {
    const data = docSnap.data();
    document.getElementById("input-cl-xong").value = data.chinhLyDaXong || 0;
    document.getElementById("input-cl-conlai").value = data.chinhLyConLai || 0;
    document.getElementById("input-sh-scan").value = data.soHoaDaScan || 0;
    document.getElementById("input-tong-scan").value = data.tongSoCanScan || 0;
    document.getElementById("input-sh-chuanhoa").value =
      data.soHoaChuanHoa || 0;
    document.getElementById("input-tong-chuanhoa").value =
      data.tongSoCanChuanHoa || 0;
  }
}
import { db } from "./firebase-config.js";
import {
  doc,
  updateDoc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Tự động điền số liệu cũ từ Firebase vào các ô nhập khi Admin mở trang
async function initAdminForm() {
  const docSnap = await getDoc(doc(db, "progress", "current_state"));
  if (docSnap.exists()) {
    const data = docSnap.data();
    document.getElementById("input-cl-xong").value = data.chinhLyDaXong || 0;
    document.getElementById("input-cl-conlai").value = data.chinhLyConLai || 0;
    document.getElementById("input-sh-scan").value = data.soHoaDaScan || 0;
    document.getElementById("input-tong-scan").value = data.tongSoCanScan || 0;
    document.getElementById("input-sh-chuanhoa").value =
      data.soHoaChuanHoa || 0;
    document.getElementById("input-tong-chuanhoa").value =
      data.tongSoCanChuanHoa || 0;
  }
}

window.updateData = async (e) => {
  e.preventDefault();

  // Lấy đối tượng nút bấm để xử lý hiệu ứng trực quan chuyên nghiệp
  const btnSave = document.querySelector(".btn-save");
  const originalText = btnSave.innerText;

  // Thay đổi trạng thái nút khi đang xử lý kết nối Firebase
  btnSave.innerText = "Đang kết nối dữ liệu...";
  btnSave.style.opacity = "0.7";
  btnSave.disabled = true;

  const chinhLyDaXong = parseFloat(
    document.getElementById("input-cl-xong").value,
  );
  const chinhLyConLai = parseFloat(
    document.getElementById("input-cl-conlai").value,
  );
  const soHoaDaScan = parseInt(document.getElementById("input-sh-scan").value);
  const tongSoCanScan = parseInt(
    document.getElementById("input-tong-scan").value,
  );
  const soHoaChuanHoa = parseInt(
    document.getElementById("input-sh-chuanhoa").value,
  );
  const tongSoCanChuanHoa = parseInt(
    document.getElementById("input-tong-chuanhoa").value,
  );

  try {
    await updateDoc(doc(db, "progress", "current_state"), {
      chinhLyDaXong,
      chinhLyConLai,
      soHoaDaScan,
      tongSoCanScan,
      soHoaChuanHoa,
      tongSoCanChuanHoa,
      lastUpdated: new Date(),
    });

    // Hiển thị trạng thái thành công trực tiếp trên nút thay vì bật hộp thoại alert thô sơ
    btnSave.innerText = "✓ Cập nhật thành công!";
    btnSave.style.backgroundColor = "#27ae60"; // Đổi sang màu xanh lá cây đậm nét hơn

    // Chờ 1.2 giây để người dùng kịp quan sát thông báo thành công rồi tự chuyển về trang chủ
    setTimeout(() => {
      window.location.href = "index.html";
    }, 1200);
  } catch (error) {
    btnSave.innerText = originalText;
    btnSave.style.opacity = "1";
    btnSave.style.backgroundColor = "#e74c3c"; // Nếu lỗi đổi nút sang màu đỏ cảnh báo
    btnSave.disabled = false;
    alert("Lỗi hệ thống: " + error.message);
  }
};

document.addEventListener("DOMContentLoaded", initAdminForm);
