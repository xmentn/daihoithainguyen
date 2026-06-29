import { db } from './firebase-config.js';
import { collection, addDoc, doc, setDoc, getDoc, getDocs, updateDoc, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 1. Khởi chạy hiển thị dữ liệu và danh sách lịch sử khi mở trang
async function initAdminPage() {
  // Đặt ngày mặc định hôm nay
  const today = new Date();
  document.getElementById('input-date').value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Nạp số liệu mới nhất hiện tại vào ô nhập mặc định
  const docSnap = await getDoc(doc(db, "progress", "current_state"));
  if (docSnap.exists()) {
    const data = docSnap.data();
    document.getElementById('input-cl-xong').value = data.chinhLyDaXong || 0;
    document.getElementById('input-cl-conlai').value = data.chinhLyConLai || 0;
    document.getElementById('input-sh-scan').value = data.soHoaDaScan || 0;
    document.getElementById('input-tong-scan').value = data.tongSoCanScan || 0;
    document.getElementById('input-sh-chuanhoa').value = data.soHoaChuanHoa || 0;
    document.getElementById('input-tong-chuanhoa').value = data.tongSoCanChuanHoa || 0;
  }

  // Lắng nghe danh sách lịch sử thời gian thực đổ ra bảng bên phải
  const historyQuery = query(collection(db, "progress_history"), orderBy("timestamp", "desc"));
  onSnapshot(historyQuery, (querySnapshot) => {
    const tableBody = document.getElementById('history-table-body');
    tableBody.innerHTML = ""; // Xóa bảng cũ

    querySnapshot.forEach((docSnap) => {
      const log = docSnap.data();
      const docId = docSnap.id;

      const row = document.createElement('tr');
      row.innerHTML = `
                <td style="font-weight: 600; color: #1e293b;">${log.dateLabel || 'Chưa rõ'}</td>
                <td>${log.chinhLyDaXong || 0} / ${(log.chinhLyDaXong || 0) + (log.chinhLyConLai || 0)} m</td>
                <td>${(log.soHoaDaScan || 0).toLocaleString()} trang</td>
                <td style="text-align: center;">
                    <button class="btn-edit-action" onclick="startEdit('${docId}')">
                        <i class="fa-solid fa-pen-to-square"></i> Sửa
                    </button>
                </td>
            `;
      tableBody.appendChild(row);
    });
  });
}

// 2. Hàm kích hoạt chế độ CHỈNH SỬA đợt dữ liệu cũ
window.startEdit = async (docId) => {
  try {
    const docSnap = await getDoc(doc(db, "progress_history", docId));
    if (docSnap.exists()) {
      const data = docSnap.data();

      // Đổ dữ liệu đợt cũ lên các ô input của form
      document.getElementById('editing-doc-id').value = docId;
      document.getElementById('input-cl-xong').value = data.chinhLyDaXong || 0;
      document.getElementById('input-cl-conlai').value = data.chinhLyConLai || 0;
      document.getElementById('input-sh-scan').value = data.soHoaDaScan || 0;
      document.getElementById('input-tong-scan').value = data.tongSoCanScan || 0;
      document.getElementById('input-sh-chuanhoa').value = data.soHoaChuanHoa || 0;
      document.getElementById('input-tong-chuanhoa').value = data.tongSoCanChuanHoa || 0;

      // Xử lý hiển thị ngược lại ngày lên ô input date
      if (data.timestamp) {
        const t = data.timestamp.toDate();
        document.getElementById('input-date').value = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
      }

      // Thay đổi giao diện Form sang chế độ Hiệu chỉnh số liệu
      document.getElementById('form-action-title').innerHTML = "<i class='fa-solid fa-wrench'></i> HIỆU CHỈNH SỐ LIỆU ĐÃ CẬP NHẬT";
      document.getElementById('form-action-desc').innerText = "Bạn đang sửa đổi số liệu của một đợt báo cáo cũ chưa chuẩn xác.";
      document.getElementById('btn-submit-text').innerText = "Cập nhật thay đổi";
      document.getElementById('btn-cancel-edit').style.display = "inline-flex";
      document.getElementById('btn-home-link').style.display = "none";

      // Cuộn mượt màn hình lên đầu form để admin làm việc
      document.getElementById('updateForm').scrollIntoView({ behavior: 'smooth' });
    }
  } catch (e) {
    alert("Không thể tải dữ liệu đợt sửa: " + e.message);
  }
};

// 3. Hàm hủy chế độ sửa, quay về chế độ thêm mới mặc định
window.resetToCreateMode = () => {
  document.getElementById('editing-doc-id').value = "";
  document.getElementById('form-action-title').innerHTML = "<i class='fa-solid fa-pen-to-square'></i> CẬP NHẬT TIẾN ĐỘ ĐỢT MỚI";
  document.getElementById('form-action-desc').innerText = "Vui lòng nhập số liệu báo cáo mới nhất. Hệ thống sẽ tự động thêm đợt mới.";
  document.getElementById('btn-submit-text').innerText = "Lưu đợt mới";
  document.getElementById('btn-cancel-edit').style.display = "none";
  document.getElementById('btn-home-link').style.display = "inline-flex";
  initAdminPage(); // Khởi tạo lại dữ liệu
};

// 4. Xử lý gửi Form lên Firebase (Thêm mới HOẶC Cập nhật đè đợt cũ)
window.updateData = async (e) => {
  e.preventDefault();

  const btnSave = document.querySelector('.btn-save');
  const originalText = btnSave.innerHTML;

  btnSave.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Đang xử lý cơ sở dữ liệu...";
  btnSave.disabled = true;

  const editingId = document.getElementById('editing-doc-id').value;
  const rawDateValue = document.getElementById('input-date').value;
  const dateParts = rawDateValue.split('-');
  const dateLabel = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
  const timestampDate = new Date(rawDateValue + "T12:00:00");

  const chinhLyDaXong = parseFloat(document.getElementById('input-cl-xong').value);
  const chinhLyConLai = parseFloat(document.getElementById('input-cl-conlai').value);
  const soHoaDaScan = parseInt(document.getElementById('input-sh-scan').value);
  const tongSoCanScan = parseInt(document.getElementById('input-tong-scan').value);
  const soHoaChuanHoa = parseInt(document.getElementById('input-sh-chuanhoa').value);
  const tongSoCanChuanHoa = parseInt(document.getElementById('input-tong-chuanhoa').value);

  const updatePayload = {
    chinhLyDaXong,
    chinhLyConLai,
    soHoaDaScan,
    tongSoCanScan,
    soHoaChuanHoa,
    tongSoCanChuanHoa,
    dateLabel,
    timestamp: timestampDate
  };

  try {
    if (editingId) {
      // A. CHẾ ĐỘ SỬA: Cập nhật đè trực tiếp vào tài liệu lịch sử cũ bằng lệnh updateDoc
      await updateDoc(doc(db, "progress_history", editingId), updatePayload);
    } else {
      // B. CHẾ ĐỘ THÊM MỚI: Tạo một bản ghi mới hoàn toàn vào danh sách
      await addDoc(collection(db, "progress_history"), updatePayload);
    }

    // Luôn đồng bộ đợt số liệu vừa thao tác vào current_state để trang chủ hiển thị tức thì
    await setDoc(doc(db, "progress", "current_state"), updatePayload);

    btnSave.innerHTML = "<i class='fa-solid fa-circle-check'></i> Thực hiện thành công!";
    btnSave.style.backgroundColor = "#27ae60";

    setTimeout(() => {
      window.location.href = "index.html";
    }, 1200);

  } catch (error) {
    btnSave.innerHTML = originalText;
    btnSave.style.backgroundColor = "#e74c3c";
    btnSave.disabled = false;
    alert("Lỗi hệ thống Firebase: " + error.message);
  }
};

document.addEventListener('DOMContentLoaded', initAdminPage);