import { db, auth } from './firebase-config.js';
import { collection, addDoc, doc, setDoc, getDoc, query, orderBy, onSnapshot, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// ĐĂNG KÝ HÀM ĐĂNG XUẤT TOÀN CỤC NGAY LẬP TỨC ĐỂ THẺ HTML ONCLICK KHÔNG BỊ "NOT DEFINED"
window.logoutUser = function () {
  signOut(auth).then(() => {
    window.location.href = "login.html";
  }).catch((error) => {
    alert("Lỗi đăng xuất hệ thống: " + error.message);
  });
};

// Hàm nạp số liệu tiến độ cũ vào Form và lắng nghe lịch sử đổ ra bảng bên phải
async function setupAdminData() {
  // 1. Tự động gán mốc thời gian ngày hôm nay cho ô Date Input
  const today = new Date();
  const inputDateEl = document.getElementById('input-date');
  if (inputDateEl) {
    inputDateEl.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  }

  // 2. Lấy số liệu trạng thái hiện tại (current_state) điền sẵn vào các ô nhập
  try {
    const docSnap = await getDoc(doc(db, "progress", "current_state"));
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (document.getElementById('input-cl-xong')) document.getElementById('input-cl-xong').value = data.chinhLyDaXong || 0;
      if (document.getElementById('input-cl-conlai')) document.getElementById('input-cl-conlai').value = data.chinhLyConLai || 0;
      if (document.getElementById('input-sh-scan')) document.getElementById('input-sh-scan').value = data.soHoaDaScan || 0;
      if (document.getElementById('input-tong-scan')) document.getElementById('input-tong-scan').value = data.tongSoCanScan || 0;
      if (document.getElementById('input-sh-chuanhoa')) document.getElementById('input-sh-chuanhoa').value = data.soHoaChuanHoa || 0;
      if (document.getElementById('input-tong-chuanhoa')) document.getElementById('input-tong-chuanhoa').value = data.tongSoCanChuanHoa || 0;
    }
  } catch (e) {
    console.error("Lỗi kết nối database progress:", e);
  }

  // 3. Lắng nghe thời gian thực (Realtime) bảng lịch sử, xếp đợt mới lên đầu
  const historyQuery = query(collection(db, "progress_history"), orderBy("timestamp", "desc"));
  onSnapshot(historyQuery, (querySnapshot) => {
    const tableBody = document.getElementById('history-table-body');
    if (tableBody) {
      tableBody.innerHTML = "";
      querySnapshot.forEach((docSnap) => {
        const log = docSnap.data();
        const docId = docSnap.id;
        const row = document.createElement('tr');
        row.style.borderBottom = "1px solid #f1f5f9";
        row.innerHTML = `
                    <td style="padding: 12px 10px; font-weight: 600; color: #1e293b;">${log.dateLabel || 'Chưa rõ'}</td>
                    <td style="padding: 12px 10px;">${log.chinhLyDaXong || 0} / ${(log.chinhLyDaXong || 0) + (log.chinhLyConLai || 0)} m</td>
                    <td style="padding: 12px 10px;">${(log.soHoaDaScan || 0).toLocaleString()} trang</td>
                    <td style="padding: 12px 10px; text-align: center;">
                        <button class="btn-edit-action" onclick="startEdit('${docId}')" style="background: #e0f2fe; color: #0369a1; border: none; padding: 5px 10px; border-radius: 4px; font-weight: 600; cursor: pointer; font-size: 12.5px;">
                            <i class="fa-solid fa-pen-to-square"></i> Sửa
                        </button>
                    </td>
                `;
        tableBody.appendChild(row);
      });
    }
  });
}

// Kiểm tra quyền hạn tài khoản khi vừa vào trang quản trị
function initAdminPage() {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      const nameContainer = document.getElementById('admin-name');
      if (nameContainer) {
        nameContainer.innerHTML = `<i class='fa-solid fa-user-shield' style='color: #0056b3; margin-right: 5px;'></i> Đang xác thực quyền...`;
      }

      try {
        // Truy vấn quyền từ Firestore
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists() && userDoc.data().role === "admin") {
          if (userDoc.data().fullName && nameContainer) {
            nameContainer.innerHTML = `<i class='fa-solid fa-user-shield' style='color: #0056b3; margin-right: 5px;'></i> Xin chào, ${userDoc.data().fullName}`;
          }
          // Đúng quyền quản trị -> Load dữ liệu lên trang
          setupAdminData();
        } else {
          alert("Tài khoản của bạn không có quyền truy cập vùng Quản trị!");
          window.location.href = "index.html";
        }
      } catch (error) {
        console.error("Lỗi đồng bộ dữ liệu tài khoản:", error);
        setupAdminData(); // Phương án thoát hiểm dự phòng nếu lỗi kết nối
      }
    } else {
      // Chưa đăng nhập -> Đá thẳng về login.html
      window.location.href = "login.html";
    }
  });
}

// ĐĂNG KÝ HÀM KHI NGƯỜI DÙNG BẤM "SỬA" ĐỢT LỊCH SỬ CŨ
window.startEdit = async (docId) => {
  try {
    const docSnap = await getDoc(doc(db, "progress_history", docId));
    if (docSnap.exists()) {
      const data = docSnap.data();

      // Gán dữ liệu lên form
      document.getElementById('editing-doc-id').value = docId;
      document.getElementById('input-cl-xong').value = data.chinhLyDaXong || 0;
      document.getElementById('input-cl-conlai').value = data.chinhLyConLai || 0;
      document.getElementById('input-sh-scan').value = data.soHoaDaScan || 0;
      document.getElementById('input-tong-scan').value = data.tongSoCanScan || 0;
      document.getElementById('input-sh-chuanhoa').value = data.soHoaChuanHoa || 0;
      document.getElementById('input-tong-chuanhoa').value = data.tongSoCanChuanHoa || 0;

      if (data.timestamp) {
        const t = data.timestamp.toDate();
        document.getElementById('input-date').value = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
      }

      // Thay đổi tiêu đề giao diện sang Chế độ hiệu chỉnh
      document.getElementById('form-action-title').innerHTML = "<i class='fa-solid fa-wrench' style='color: #d97706;'></i> HIỆU CHỈNH SỐ LIỆU ĐÃ CẬP NHẬT";
      document.getElementById('form-action-desc').innerText = "Bạn đang sửa đổi số liệu của một đợt báo cáo cũ chưa chuẩn xác.";
      document.getElementById('btn-submit-text').innerText = "Cập nhật thay đổi";

      // Xử lý ẩn/hiện nút (Giữ nguyên nút Trang chủ hiển thị trên đầu)
      if (document.getElementById('btn-cancel-edit')) document.getElementById('btn-cancel-edit').style.display = "inline-flex";
      if (document.getElementById('btn-home-link')) document.getElementById('btn-home-link').style.display = "inline-flex";

      // Cuộn mượt màn hình về form nhập liệu
      document.getElementById('updateForm').scrollIntoView({ behavior: 'smooth' });
    }
  } catch (e) {
    alert("Không thể tải dữ liệu đợt chỉnh sửa: " + e.message);
  }
};

// ĐĂNG KÝ HÀM ĐƯA FORM VỀ TRẠNG THÁI THÊM ĐỢT MỚI MẶC ĐỊNH (HỦY SỬA)
window.resetToCreateMode = () => {
  document.getElementById('editing-doc-id').value = "";
  document.getElementById('form-action-title').innerHTML = "<i class='fa-solid fa-pen-to-square'></i> CẬP NHẬT TIẾN ĐỘ ĐỢT MỚI";
  document.getElementById('form-action-desc').innerText = "Vui lòng nhập số liệu báo cáo mới nhất. Hệ thống sẽ tự động thêm đợt mới.";
  document.getElementById('btn-submit-text').innerText = "Lưu đợt mới";

  if (document.getElementById('btn-cancel-edit')) document.getElementById('btn-cancel-edit').style.display = "none";
  if (document.getElementById('btn-home-link')) document.getElementById('btn-home-link').style.display = "inline-flex"; // Giữ nút Trang chủ luôn hiện trên đầu

  setupAdminData();
};

// HÀM XỬ LÝ LƯU HOẶC CẬP NHẬT DỮ LIỆU KHI SUBMIT FORM
window.updateData = async (e) => {
  e.preventDefault();
  const btnSave = document.querySelector('.btn-save');
  const originalText = btnSave.innerHTML;
  btnSave.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Đang xử lý...";
  btnSave.disabled = true;

  const editingId = document.getElementById('editing-doc-id').value;
  const rawDateValue = document.getElementById('input-date').value;
  const dateParts = rawDateValue.split('-');
  const dateLabel = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
  const timestampDate = new Date(rawDateValue + "T12:00:00");

  // Đóng gói dữ liệuPayload
  const updatePayload = {
    chinhLyDaXong: parseFloat(document.getElementById('input-cl-xong').value) || 0,
    chinhLyConLai: parseFloat(document.getElementById('input-cl-conlai').value) || 0,
    soHoaDaScan: parseInt(document.getElementById('input-sh-scan').value) || 0,
    tongSoCanScan: parseInt(document.getElementById('input-tong-scan').value) || 0,
    soHoaChuanHoa: parseInt(document.getElementById('input-sh-chuanhoa').value) || 0,
    tongSoCanChuanHoa: parseInt(document.getElementById('input-tong-chuanhoa').value) || 0,
    dateLabel,
    timestamp: timestampDate
  };

  try {
    if (editingId) {
      // Nếu có ID ẩn -> Tiến hành cập nhật đợt lịch sử đó
      await updateDoc(doc(db, "progress_history", editingId), updatePayload);
    } else {
      // Nếu không có ID -> Thêm mới một đợt báo cáo vào lịch sử
      await addDoc(collection(db, "progress_history"), updatePayload);
    }

    // Luôn cập nhật đè số liệu mới nhất này lên bảng trạng thái tổng (current_state) để hiển thị Dashboard trang chủ
    await setDoc(doc(db, "progress", "current_state"), updatePayload);

    btnSave.innerHTML = "<i class='fa-solid fa-circle-check'></i> Thành công!";
    btnSave.style.backgroundColor = "#27ae60";

    // Trở về Dashboard trang chủ sau khi xử lý thành công 1.2 giây
    setTimeout(() => { window.location.href = "index.html"; }, 1200);
  } catch (error) {
    btnSave.innerHTML = originalText;
    btnSave.style.backgroundColor = "#e74c3c";
    btnSave.disabled = false;
    alert("Lỗi lưu trữ dữ liệu lên Firebase: " + error.message);
  }
};

// Đăng ký kích hoạt hàm kiểm tra quyền khi cấu trúc trang HTML tải xong
document.addEventListener('DOMContentLoaded', initAdminPage);