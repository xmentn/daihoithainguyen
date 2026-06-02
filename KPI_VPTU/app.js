// ==========================================
// 1. IMPORT & KẾT NỐI FIREBASE
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
// Bổ sung các lệnh deleteDoc, doc, updateDoc
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
  deleteDoc,
  doc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDaXML8B1NALTDL5W0au_xja-2OV34_K-A",
  authDomain: "kpi-vptu.firebaseapp.com",
  projectId: "kpi-vptu",
  storageBucket: "kpi-vptu.firebasestorage.app",
  messagingSenderId: "439455157334",
  appId: "1:439455157334:web:29b59127ca383a1df13ff7",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Đưa các hàm ra biến toàn cục để HTML có thể gọi được
window.db = db;
window.deleteDoc = deleteDoc;
window.doc = doc;
window.updateDoc = updateDoc;

// ==========================================
// 2. LOGIC NÚT HƯỚNG DẪN & CHUYỂN MENU (3 TAB)
// ==========================================
document.getElementById("btnHuongDan").addEventListener("click", () => {
  alert(
    `HƯỚNG DẪN QUY ĐỊNH 870:\n- Tỷ lệ % Số lượng = (SL thực tế / SL giao) * 100.\n- Chất lượng & Tiến độ: Trừ 25% mỗi lần lỗi/chậm.\n- TỔNG ĐIỂM = Điểm chung + (Điểm NV * 70%) + Điểm cộng.\n* Cán bộ phụ trách phân công tại khâu báo cáo.`,
  );
});

const menuGiaoViec = document.getElementById("menuGiaoViec");
const menuBaoCao = document.getElementById("menuBaoCao");
const menuDanhMuc = document.getElementById("menuDanhMuc");

const phanGiaoViec = document.getElementById("phanGiaoViec");
const phanBaoCao = document.getElementById("phanBaoCao");
const phanDanhMuc = document.getElementById("phanDanhMuc");

function hideAllTabs() {
  menuGiaoViec.classList.remove("active");
  menuBaoCao.classList.remove("active");
  menuDanhMuc.classList.remove("active");
  phanGiaoViec.style.display = "none";
  phanBaoCao.style.display = "none";
  phanDanhMuc.style.display = "none";
}

menuGiaoViec.addEventListener("click", () => {
  hideAllTabs();
  menuGiaoViec.classList.add("active");
  phanGiaoViec.style.display = "block";
  loadDanhMucChuan();
});

menuBaoCao.addEventListener("click", () => {
  hideAllTabs();
  menuBaoCao.classList.add("active");
  phanBaoCao.style.display = "block";
  loadDuLieuBaoCao();
});

menuDanhMuc.addEventListener("click", () => {
  hideAllTabs();
  menuDanhMuc.classList.add("active");
  phanDanhMuc.style.display = "block";
  loadDanhMucChuan();
  resetFormDanhMuc(); // Hủy trạng thái đang sửa (nếu có) khi bấm chuyển tab
});

// ==========================================
// 3. LOGIC QUẢN LÝ DANH MỤC (Thêm, Sửa, Xóa)
// ==========================================
// Hàm làm mới biểu mẫu Danh mục
function resetFormDanhMuc() {
  document.getElementById("formThemDanhMuc").reset();
  document.getElementById("editDocId").value = "";
  document.getElementById("tieuDeFormDanhMuc").textContent =
    "Khởi tạo Đơn vị sản phẩm / Công việc chuẩn";
  document.getElementById("btnSubmitDanhMuc").textContent = "Lưu Danh mục";
  document.getElementById("btnCancelEdit").style.display = "none";
  document.getElementById("themDiemChuan").value = 100;
}

// Bắt sự kiện Hủy sửa
document
  .getElementById("btnCancelEdit")
  .addEventListener("click", resetFormDanhMuc);

// Thêm hoặc Cập nhật Danh mục
document
  .getElementById("formThemDanhMuc")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const btnSubmit = document.getElementById("btnSubmitDanhMuc");
    btnSubmit.disabled = true;

    const editId = document.getElementById("editDocId").value;
    const dataObj = {
      ten_cong_viec: document.getElementById("themTenCongViec").value,
      san_pham_dau_ra: document.getElementById("themSanPhamDauRa").value,
      nhom: document.getElementById("themNhom").value,
      diem_chuan: parseInt(document.getElementById("themDiemChuan").value),
      he_so: parseFloat(document.getElementById("themHeSo").value),
    };

    try {
      if (editId) {
        // Chế độ CẬP NHẬT
        await updateDoc(doc(db, "danh_muc_chuan", editId), dataObj);
        document.getElementById("msgDanhMuc").textContent =
          "Đã cập nhật danh mục thành công!";
      } else {
        // Chế độ THÊM MỚI
        await addDoc(collection(db, "danh_muc_chuan"), dataObj);
        document.getElementById("msgDanhMuc").textContent =
          "Đã lưu Công việc chuẩn thành công!";
      }
      document.getElementById("msgDanhMuc").style.color = "green";

      resetFormDanhMuc();
      loadDanhMucChuan(); // Tải lại bảng
    } catch (error) {
      console.error("Lỗi:", error);
      document.getElementById("msgDanhMuc").textContent = "Lỗi kết nối CSDL.";
      document.getElementById("msgDanhMuc").style.color = "red";
    } finally {
      btnSubmit.disabled = false;
      setTimeout(() => {
        document.getElementById("msgDanhMuc").textContent = "";
      }, 3000);
    }
  });

// Hàm hiển thị dữ liệu lên form để Sửa
window.suaDanhMuc = function (id, ten, sanPham, nhom, diem, heSo) {
  document.getElementById("editDocId").value = id;
  document.getElementById("themTenCongViec").value = ten;
  document.getElementById("themSanPhamDauRa").value =
    sanPham && sanPham !== "undefined" ? sanPham : "";
  document.getElementById("themNhom").value =
    nhom && nhom !== "undefined" ? nhom : "N1";
  document.getElementById("themDiemChuan").value = diem || 100;
  document.getElementById("themHeSo").value = heSo;

  // Đổi giao diện sang chế độ sửa
  document.getElementById("tieuDeFormDanhMuc").textContent =
    "Cập nhật Công việc chuẩn";
  document.getElementById("btnSubmitDanhMuc").textContent = "Lưu thay đổi";
  document.getElementById("btnCancelEdit").style.display = "inline-block";

  // Cuộn màn hình lên form
  document.getElementById("phanDanhMuc").scrollIntoView({ behavior: "smooth" });
};

// Hàm Xóa danh mục
window.xoaDanhMuc = async function (id) {
  if (
    confirm("Đồng chí có chắc chắn muốn xóa Công việc chuẩn này khỏi hệ thống?")
  ) {
    try {
      await deleteDoc(doc(db, "danh_muc_chuan", id));
      loadDanhMucChuan(); // Tải lại bảng sau khi xóa
    } catch (error) {
      console.error("Lỗi khi xóa:", error);
      alert("Lỗi hệ thống: Không thể xóa.");
    }
  }
};

// Tải dữ liệu Danh mục
async function loadDanhMucChuan() {
  const selectNhiemVu = document.getElementById("chonNhiemVu");
  const inputHeSo = document.getElementById("heSoQuyDoi");
  const bangDanhMuc = document.getElementById("bangDanhMuc");

  try {
    const querySnapshot = await getDocs(collection(db, "danh_muc_chuan"));

    if (querySnapshot.empty) {
      if (selectNhiemVu)
        selectNhiemVu.innerHTML =
          '<option value="">-- Chưa có dữ liệu --</option>';
      if (bangDanhMuc)
        bangDanhMuc.innerHTML =
          '<tr><td colspan="7" style="text-align:center;">Chưa có danh mục nào. Hãy thiết lập Công việc chuẩn!</td></tr>';
      return;
    }

    if (selectNhiemVu)
      selectNhiemVu.innerHTML =
        '<option value="">-- Chọn công việc chuẩn --</option>';
    if (bangDanhMuc) bangDanhMuc.innerHTML = "";

    let stt = 1;
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();

      // Lọc lỗi "undefined" nếu bản ghi cũ thiếu nhóm
      const nhomHienThi =
        data.nhom && data.nhom !== "undefined" ? `[${data.nhom}] ` : "";

      // Đổ vào Dropdown Tab 1
      if (selectNhiemVu) {
        const option = document.createElement("option");
        option.value = data.ten_cong_viec;
        option.text = `${nhomHienThi}${data.ten_cong_viec}`;
        option.dataset.heso = data.he_so;
        selectNhiemVu.appendChild(option);
      }

      // Đổ vào Bảng hiển thị Tab 3 (Thêm 2 nút Sửa/Xóa)
      if (bangDanhMuc) {
        const tr = document.createElement("tr");
        tr.innerHTML = `
                    <td>${stt++}</td>
                    <td style="text-align: left;">${data.ten_cong_viec}</td>
                    <td>${data.san_pham_dau_ra && data.san_pham_dau_ra !== "undefined" ? data.san_pham_dau_ra : "Chưa xác định"}</td>
                    <td><strong>${data.nhom && data.nhom !== "undefined" ? data.nhom : ""}</strong></td>
                    <td>${data.diem_chuan || 100}</td>
                    <td>${data.he_so}</td>
                    <td>
                        <button class="btn-sm" style="background-color: #f57c00; margin-right: 5px;" 
                                onclick="suaDanhMuc('${docSnap.id}', '${data.ten_cong_viec}', '${data.san_pham_dau_ra}', '${data.nhom}', ${data.diem_chuan}, ${data.he_so})">
                            Sửa
                        </button>
                        <button class="btn-sm" style="background-color: #d32f2f;" 
                                onclick="xoaDanhMuc('${docSnap.id}')">
                            Xóa
                        </button>
                    </td>
                `;
        bangDanhMuc.appendChild(tr);
      }
    });

    if (selectNhiemVu && !selectNhiemVu.hasAttribute("data-bound")) {
      selectNhiemVu.addEventListener("change", function () {
        inputHeSo.value =
          this.value !== ""
            ? this.options[this.selectedIndex].dataset.heso
            : "";
      });
      selectNhiemVu.setAttribute("data-bound", "true");
    }
  } catch (error) {
    console.error("Lỗi tải danh mục:", error);
  }
}
document.addEventListener("DOMContentLoaded", loadDanhMucChuan);

// ==========================================
// 4. GIAO VIỆC & BÁO CÁO (Giữ nguyên)
// ==========================================
document
  .getElementById("formGiaoViec")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const btnSubmit = e.target.querySelector('button[type="submit"]');
    btnSubmit.disabled = true;

    const tenNhiemVu = document.getElementById("chonNhiemVu").value;
    if (!tenNhiemVu) {
      alert("Vui lòng chọn công việc từ danh mục!");
      btnSubmit.disabled = false;
      return;
    }

    try {
      const docRef = await addDoc(collection(db, "nhiem_vu_danh_gia"), {
        ten_nhiem_vu: tenNhiemVu,
        thang_danh_gia: document.getElementById("thangDanhGia").value,
        he_so_quy_doi: parseFloat(document.getElementById("heSoQuyDoi").value),
        khoi_luong_giao: parseInt(document.getElementById("khoiLuong").value),
        ngay_tao: serverTimestamp(),
      });
      document.getElementById("statusMessage").textContent =
        `Đã giao nhiệm vụ thành công (Mã: ${docRef.id})`;
      document.getElementById("statusMessage").style.color = "green";
      document.getElementById("formGiaoViec").reset();
    } catch (error) {
      document.getElementById("statusMessage").textContent = "Lỗi kết nối.";
      document.getElementById("statusMessage").style.color = "red";
    } finally {
      btnSubmit.disabled = false;
      setTimeout(() => {
        document.getElementById("statusMessage").textContent = "";
      }, 3500);
    }
  });

async function loadDuLieuBaoCao() {
  const tbody = document.getElementById("duLieuBaoCao");
  tbody.innerHTML =
    '<tr><td colspan="11" style="text-align:center;">Đang truy xuất dữ liệu...</td></tr>';
  try {
    const querySnapshot = await getDocs(collection(db, "nhiem_vu_danh_gia"));
    if (querySnapshot.empty) {
      tbody.innerHTML =
        '<tr><td colspan="11" style="text-align:center;">Chưa có dữ liệu.</td></tr>';
      return;
    }
    tbody.innerHTML = "";
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const tr = document.createElement("tr");
      tr.innerHTML = `
                <td style="text-align: left;">${data.ten_nhiem_vu}</td>
                <td>${data.he_so_quy_doi}</td>
                <td>${data.khoi_luong_giao}</td>
                <td>
                    <select id="canBo_${docSnap.id}" style="width: 120px;">
                        <option value="">-- Chọn --</option>
                        <option value="Xuyen">Nguyễn Hữu Xuyên</option>
                        <option value="CoYeu">Cán bộ Cơ yếu</option>
                    </select>
                </td>
                <td><input type="number" id="slHoanThanh_${docSnap.id}" style="width:40px" min="0" value="0"></td>
                <td><input type="number" id="loiNhan_${docSnap.id}" style="width:40px" min="0" value="0"></td>
                <td><input type="number" id="chamTienDo_${docSnap.id}" style="width:40px" min="0" value="0"></td>
                <td><input type="number" id="diemChung_${docSnap.id}" style="width:50px" min="0" max="30" value="30"></td>
                <td><input type="number" id="diemCong_${docSnap.id}" style="width:45px" min="0" value="0"></td>
                <td id="diemTong_${docSnap.id}" style="font-weight: bold; color: #0d47a1;">0</td>
                <td><button class="btn-sm" onclick="chamDiem('${docSnap.id}', ${data.khoi_luong_giao}, event)">Chốt</button></td>
            `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    tbody.innerHTML =
      '<tr><td colspan="11" style="text-align:center; color:red;">Lỗi kết nối Firebase!</td></tr>';
  }
}

window.chamDiem = function (docId, khoiLuongGiao, event) {
  const canBo = document.getElementById(`canBo_${docId}`).value;
  if (!canBo) {
    alert("Chỉ định Cán bộ phụ trách trước khi chốt điểm.");
    return;
  }

  let a =
    ((parseFloat(document.getElementById(`slHoanThanh_${docId}`).value) || 0) /
      khoiLuongGiao) *
    100;
  if (a > 100) a = 100;
  let b = Math.max(
    0,
    100 -
      (parseInt(document.getElementById(`loiNhan_${docId}`).value) || 0) * 25,
  );
  let c = Math.max(
    0,
    100 -
      (parseInt(document.getElementById(`chamTienDo_${docId}`).value) || 0) *
        25,
  );

  let diemNV = (a + b + c) / 3;
  let dChung =
    parseFloat(document.getElementById(`diemChung_${docId}`).value) || 0;
  let dCong =
    parseFloat(document.getElementById(`diemCong_${docId}`).value) || 0;
  let tong = dChung + diemNV * 0.7 + dCong;

  let xepLoai =
    tong >= 90 ? "(A)" : tong >= 70 ? "(B)" : tong >= 50 ? "(C)" : "(D)";
  document.getElementById(`diemTong_${docId}`).innerText =
    `${tong.toFixed(1)} ${xepLoai}`;

  event.target.style.backgroundColor = "#757575";
  event.target.innerText = "Đã chốt";
  event.target.disabled = true;
};
