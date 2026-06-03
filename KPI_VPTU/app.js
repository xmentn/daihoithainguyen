// ==========================================
// 1. IMPORT & KẾT NỐI FIREBASE
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
  deleteDoc,
  doc,
  updateDoc,
  setDoc,
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

window.db = db;
window.deleteDoc = deleteDoc;
window.doc = doc;
window.updateDoc = updateDoc;
window.setDoc = setDoc;

// ==========================================
// HỆ THỐNG THÔNG BÁO (TOAST & MODAL)
// ==========================================
function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.textContent = message;
  toast.style.position = "fixed";
  toast.style.bottom = "20px";
  toast.style.right = "20px";
  toast.style.padding = "15px 25px";
  toast.style.borderRadius = "4px";
  toast.style.color = "white";
  toast.style.fontWeight = "bold";
  toast.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
  toast.style.zIndex = "9999";
  toast.style.transition = "opacity 0.3s ease-in-out";
  toast.style.backgroundColor = type === "success" ? "#2e7d32" : "#d32f2f";
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function showModal(title, contentHTML) {
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.backgroundColor = "rgba(0,0,0,0.6)";
  overlay.style.zIndex = "10000";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  const modal = document.createElement("div");
  modal.style.backgroundColor = "white";
  modal.style.padding = "25px";
  modal.style.borderRadius = "6px";
  modal.style.minWidth = "450px";
  modal.style.maxWidth = "600px";
  modal.style.boxShadow = "0 4px 15px rgba(0,0,0,0.2)";
  const h3 = document.createElement("h3");
  h3.textContent = title;
  h3.style.marginTop = "0";
  h3.style.color = "#0d47a1";
  h3.style.borderBottom = "1px solid #ccc";
  h3.style.paddingBottom = "10px";
  const body = document.createElement("div");
  body.innerHTML = contentHTML;
  body.style.lineHeight = "1.6";
  body.style.marginBottom = "20px";
  body.style.fontSize = "15px";
  const btnClose = document.createElement("button");
  btnClose.textContent = "Đóng thông báo";
  btnClose.className = "btn-primary";
  btnClose.style.width = "100%";
  btnClose.onclick = () => overlay.remove();
  modal.appendChild(h3);
  modal.appendChild(body);
  modal.appendChild(btnClose);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

function showConfirm(message, callback) {
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.backgroundColor = "rgba(0,0,0,0.6)";
  overlay.style.zIndex = "10000";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  const modal = document.createElement("div");
  modal.style.backgroundColor = "white";
  modal.style.padding = "25px";
  modal.style.borderRadius = "6px";
  modal.style.minWidth = "350px";
  modal.style.textAlign = "center";
  modal.style.boxShadow = "0 4px 15px rgba(0,0,0,0.2)";
  const text = document.createElement("p");
  text.textContent = message;
  text.style.fontWeight = "bold";
  text.style.fontSize = "16px";
  text.style.marginBottom = "25px";
  const btnContainer = document.createElement("div");
  btnContainer.style.display = "flex";
  btnContainer.style.gap = "10px";
  btnContainer.style.justifyContent = "center";
  const btnCancel = document.createElement("button");
  btnCancel.textContent = "Hủy bỏ";
  btnCancel.className = "btn-primary";
  btnCancel.style.backgroundColor = "#757575";
  btnCancel.onclick = () => overlay.remove();
  const btnOk = document.createElement("button");
  btnOk.textContent = "Đồng ý";
  btnOk.className = "btn-primary";
  btnOk.style.backgroundColor = "#d32f2f";
  btnOk.onclick = () => {
    overlay.remove();
    callback();
  };
  btnContainer.appendChild(btnCancel);
  btnContainer.appendChild(btnOk);
  modal.appendChild(text);
  modal.appendChild(btnContainer);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

// ==========================================
// 2. CHUYỂN MENU 5 TAB
// ==========================================
document.getElementById("btnHuongDan").addEventListener("click", () => {
  const content = `
        <ul style="padding-left: 20px;">
            <li style="margin-bottom: 8px;"><b>% Số lượng:</b> SL hoàn thành (quy đổi) / SL giao (quy đổi).</li>
            <li style="margin-bottom: 8px;"><b>% Chất lượng/Tiến độ:</b> Đánh giá trên số công việc đã hoàn thành. Trừ 25% điểm cho mỗi lần lỗi/chậm.</li>
            <li style="margin-bottom: 8px;"><b>Lọc dữ liệu:</b> Sử dụng thanh thả xuống (Dropdown) để lọc kết quả theo từng Cán bộ cụ thể.</li>
        </ul>
    `;
  showModal("Hướng dẫn nghiệp vụ (Quy định 870 / Phụ lục 2)", content);
});

const menus = [
  "menuGiaoViec",
  "menuBaoCao",
  "menuDanhMuc",
  "menuQuyDoi",
  "menuCanBo",
];
const phans = [
  "phanGiaoViec",
  "phanBaoCao",
  "phanDanhMuc",
  "phanQuyDoi",
  "phanCanBo",
];

function hideAllTabs() {
  menus.forEach((m) => document.getElementById(m).classList.remove("active"));
  phans.forEach((p) => (document.getElementById(p).style.display = "none"));
}

document.getElementById("menuGiaoViec").addEventListener("click", () => {
  hideAllTabs();
  document.getElementById("menuGiaoViec").classList.add("active");
  document.getElementById("phanGiaoViec").style.display = "block";
  loadNhiemVuGiaoViec();
  loadDanhSachGiaoViec();
});
document.getElementById("menuBaoCao").addEventListener("click", () => {
  hideAllTabs();
  document.getElementById("menuBaoCao").classList.add("active");
  document.getElementById("phanBaoCao").style.display = "block";
  loadDuLieuBaoCao();
});
document.getElementById("menuDanhMuc").addEventListener("click", () => {
  hideAllTabs();
  document.getElementById("menuDanhMuc").classList.add("active");
  document.getElementById("phanDanhMuc").style.display = "block";
  loadDanhMucChuan();
  resetFormDanhMuc();
});
document.getElementById("menuQuyDoi").addEventListener("click", () => {
  hideAllTabs();
  document.getElementById("menuQuyDoi").classList.add("active");
  document.getElementById("phanQuyDoi").style.display = "block";
  loadDanhMucChuan();
  loadDanhMucQuyDoi();
  resetFormQuyDoi();
});
document.getElementById("menuCanBo").addEventListener("click", () => {
  hideAllTabs();
  document.getElementById("menuCanBo").classList.add("active");
  document.getElementById("phanCanBo").style.display = "block";
  loadDanhSachCanBo();
  resetFormCanBo();
});

// Lắng nghe sự kiện BỘ LỌC CÁN BỘ
document
  .getElementById("locCanBoGiaoViec")
  .addEventListener("change", loadDanhSachGiaoViec);
document.getElementById("locCanBoBaoCao").addEventListener("change", () => {
  renderBangChiTiet();
  renderBangTongHop();
});

// ==========================================
// TỔNG HỢP NHIỆM VỤ GIAO VIỆC (TAB 1)
// ==========================================
async function loadNhiemVuGiaoViec() {
  const selectNhiemVu = document.getElementById("chonNhiemVu");
  if (!selectNhiemVu) return;
  selectNhiemVu.innerHTML =
    '<option value="">-- Đang tải dữ liệu... --</option>';

  try {
    let optionsHTML =
      '<option value="">-- Chọn công việc (Chuẩn / Quy đổi) --</option>';

    const snapChuan = await getDocs(collection(db, "danh_muc_chuan"));
    if (!snapChuan.empty) {
      optionsHTML += '<optgroup label="--- DANH MỤC CHUẨN ---">';
      snapChuan.forEach((doc) => {
        const d = doc.data();
        optionsHTML += `<option value="${d.ten_cong_viec}" data-heso="${d.he_so}">[${d.nhom}] ${d.ten_cong_viec}</option>`;
      });
      optionsHTML += "</optgroup>";
    }

    const snapQuyDoi = await getDocs(collection(db, "danh_muc_quy_doi"));
    if (!snapQuyDoi.empty) {
      optionsHTML += '<optgroup label="--- DANH MỤC QUY ĐỔI ---">';
      snapQuyDoi.forEach((doc) => {
        const d = doc.data();
        optionsHTML += `<option value="${d.ten_cong_viec}" data-heso="${d.he_so}">[${d.nhom}] ${d.ten_cong_viec}</option>`;
      });
      optionsHTML += "</optgroup>";
    }

    selectNhiemVu.innerHTML = optionsHTML;

    if (!selectNhiemVu.hasAttribute("data-bound")) {
      selectNhiemVu.addEventListener("change", function () {
        document.getElementById("heSoQuyDoi").value =
          this.value !== ""
            ? this.options[this.selectedIndex].dataset.heso
            : "";
      });
      selectNhiemVu.setAttribute("data-bound", "true");
    }
  } catch (err) {
    selectNhiemVu.innerHTML =
      '<option value="">-- Lỗi tải danh mục --</option>';
  }
}

// ==========================================
// 3. LOGIC QUẢN LÝ DANH MỤC CHUẨN (TAB 3)
// ==========================================
document.getElementById("themNhom").addEventListener("change", function () {
  const maxScores = { N1: 100, N2: 200, N3: 300, N4: 400, N5: 500 };
  document.getElementById("themKhungDiem").value = maxScores[this.value] || 100;
});
function calculateHeSoChuan() {
  let diemDanhGia =
    parseFloat(document.getElementById("themTongDiem").value) || 0;
  let diemChuan =
    parseFloat(document.getElementById("diemCongViecChuan").value) || 0;
  document.getElementById("themHeSo").value =
    diemChuan > 0 ? (diemDanhGia / diemChuan).toFixed(2) : 0;
}
document
  .querySelectorAll(".calc-tc")
  .forEach((input) => input.addEventListener("input", calculateHeSoChuan));

function resetFormDanhMuc() {
  document.getElementById("formThemDanhMuc").reset();
  document.getElementById("editDocId").value = "";
  document.getElementById("tieuDeFormDanhMuc").textContent =
    "Khởi tạo Danh mục Chuẩn";
  document.getElementById("btnSubmitDanhMuc").textContent =
    "Lưu Danh mục Chuẩn";
  document.getElementById("btnCancelEdit").style.display = "none";
  document.getElementById("themKhungDiem").value = 100;
}
document
  .getElementById("btnCancelEdit")
  .addEventListener("click", resetFormDanhMuc);

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
      khung_diem: parseInt(document.getElementById("themKhungDiem").value),
      diem_chuan: parseFloat(
        document.getElementById("diemCongViecChuan").value,
      ),
      tong_diem: parseFloat(document.getElementById("themTongDiem").value),
      he_so: parseFloat(document.getElementById("themHeSo").value),
    };
    try {
      if (editId) {
        await updateDoc(doc(db, "danh_muc_chuan", editId), dataObj);
        showToast("Cập nhật danh mục thành công!");
      } else {
        await addDoc(collection(db, "danh_muc_chuan"), dataObj);
        showToast("Đã lưu Công việc chuẩn thành công!");
      }
      resetFormDanhMuc();
      loadDanhMucChuan();
    } catch (error) {
      showToast("Lỗi kết nối CSDL.", "error");
    } finally {
      btnSubmit.disabled = false;
    }
  });

window.suaDanhMuc = function (id, dataStr) {
  const data = JSON.parse(decodeURIComponent(dataStr));
  document.getElementById("editDocId").value = id;
  document.getElementById("themTenCongViec").value = data.ten_cong_viec;
  document.getElementById("themSanPhamDauRa").value =
    data.san_pham_dau_ra || "";
  document.getElementById("themNhom").value = data.nhom || "N1";
  document.getElementById("themKhungDiem").value = data.khung_diem || 100;
  document.getElementById("diemCongViecChuan").value = data.diem_chuan || 5;
  document.getElementById("themTongDiem").value = data.tong_diem || 0;
  document.getElementById("themHeSo").value = data.he_so;
  document.getElementById("tieuDeFormDanhMuc").textContent =
    "Cập nhật Danh mục Chuẩn";
  document.getElementById("btnSubmitDanhMuc").textContent = "Lưu thay đổi";
  document.getElementById("btnCancelEdit").style.display = "inline-block";
  document.getElementById("phanDanhMuc").scrollIntoView({ behavior: "smooth" });
};
window.xoaDanhMuc = function (id) {
  showConfirm("Đồng chí có chắc chắn xóa Danh mục chuẩn này?", async () => {
    try {
      await deleteDoc(doc(db, "danh_muc_chuan", id));
      showToast("Đã xóa danh mục!", "success");
      loadDanhMucChuan();
    } catch (error) {
      showToast("Lỗi hệ thống khi xóa!", "error");
    }
  });
};

async function loadDanhMucChuan() {
  const bangDanhMuc = document.getElementById("bangDanhMuc");
  const chonCongViecChuan = document.getElementById("chonCongViecChuan");

  try {
    const querySnapshot = await getDocs(collection(db, "danh_muc_chuan"));
    if (chonCongViecChuan)
      chonCongViecChuan.innerHTML =
        '<option value="">-- Chọn nhóm công việc chuẩn --</option>';
    if (bangDanhMuc) bangDanhMuc.innerHTML = "";

    if (querySnapshot.empty) {
      if (bangDanhMuc)
        bangDanhMuc.innerHTML =
          '<tr><td colspan="7" style="text-align:center;">Chưa có dữ liệu</td></tr>';
      return;
    }

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();

      if (chonCongViecChuan) {
        const option = document.createElement("option");
        option.value = data.ten_cong_viec;
        option.dataset.diem = data.tong_diem;
        option.text = `[${data.nhom}] ${data.ten_cong_viec} (Tử số: ${data.tong_diem})`;
        chonCongViecChuan.appendChild(option);
      }

      if (bangDanhMuc) {
        const dataStr = encodeURIComponent(JSON.stringify(data));
        const tr = document.createElement("tr");
        tr.innerHTML = `
                    <td style="text-align: left;">${data.ten_cong_viec}</td><td>${data.san_pham_dau_ra || ""}</td>
                    <td><strong>${data.nhom || ""}</strong></td>
                    <td style="color:#d32f2f; font-weight:bold">${data.diem_chuan || "-"}</td>
                    <td style="color:blue; font-weight:bold">${data.tong_diem || 0}</td>
                    <td style="color:red; font-weight:bold">${data.he_so}</td>
                    <td>
                        <button class="btn-sm" style="background-color: #f57c00; margin-bottom: 5px;" onclick="suaDanhMuc('${docSnap.id}', '${dataStr}')">Sửa</button>
                        <button class="btn-sm" style="background-color: #d32f2f;" onclick="xoaDanhMuc('${docSnap.id}')">Xóa</button>
                    </td>`;
        bangDanhMuc.appendChild(tr);
      }
    });
  } catch (error) {
    console.error("Lỗi:", error);
  }
}

// ==========================================
// 4. LOGIC QUẢN LÝ DANH MỤC QUY ĐỔI (TAB 4)
// ==========================================
document
  .getElementById("themNhomQuyDoi")
  .addEventListener("change", function () {
    const maxScores = { N1: 100, N2: 200, N3: 300, N4: 400, N5: 500 };
    document.getElementById("themKhungDiemQuyDoi").value =
      maxScores[this.value] || 100;
  });

document
  .getElementById("chonCongViecChuan")
  .addEventListener("change", function () {
    const diemChuanLamMau =
      this.options[this.selectedIndex]?.dataset?.diem || "";
    document.getElementById("diemCongViecChuanQuyDoi").value = diemChuanLamMau;
    calculateHeSoQuyDoi();
  });

document
  .querySelectorAll(".calc-qd")
  .forEach((input) => input.addEventListener("input", calculateHeSoQuyDoi));

function calculateHeSoQuyDoi() {
  let tuSo =
    parseFloat(document.getElementById("themTongDiemQuyDoi").value) || 0;
  let mauSo =
    parseFloat(document.getElementById("diemCongViecChuanQuyDoi").value) || 0;
  document.getElementById("themHeSoQuyDoi").value =
    mauSo > 0 ? (tuSo / mauSo).toFixed(2) : 0;
}

function resetFormQuyDoi() {
  document.getElementById("formThemQuyDoi").reset();
  document.getElementById("editQuyDoiId").value = "";
  document.getElementById("tieuDeFormQuyDoi").textContent =
    "Khởi tạo Danh mục Quy đổi";
  document.getElementById("btnSubmitQuyDoi").textContent =
    "Lưu Danh mục Quy đổi";
  document.getElementById("btnCancelEditQuyDoi").style.display = "none";
  document.getElementById("themKhungDiemQuyDoi").value = 100;
}
document
  .getElementById("btnCancelEditQuyDoi")
  .addEventListener("click", resetFormQuyDoi);

document
  .getElementById("formThemQuyDoi")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const btnSubmit = document.getElementById("btnSubmitQuyDoi");
    btnSubmit.disabled = true;
    const editId = document.getElementById("editQuyDoiId").value;
    const dataObj = {
      ten_cong_viec: document.getElementById("themTenCongViecQuyDoi").value,
      san_pham_dau_ra: document.getElementById("themSanPhamDauRaQuyDoi").value,
      nhom: document.getElementById("themNhomQuyDoi").value,
      khung_diem: parseInt(
        document.getElementById("themKhungDiemQuyDoi").value,
      ),
      cong_viec_chuan: document.getElementById("chonCongViecChuan").value,
      diem_chuan: parseFloat(
        document.getElementById("diemCongViecChuanQuyDoi").value,
      ),
      tong_diem: parseFloat(
        document.getElementById("themTongDiemQuyDoi").value,
      ),
      he_so: parseFloat(document.getElementById("themHeSoQuyDoi").value),
    };
    try {
      if (editId) {
        await updateDoc(doc(db, "danh_muc_quy_doi", editId), dataObj);
        showToast("Cập nhật quy đổi thành công!");
      } else {
        await addDoc(collection(db, "danh_muc_quy_doi"), dataObj);
        showToast("Đã lưu Công việc quy đổi thành công!");
      }
      resetFormQuyDoi();
      loadDanhMucQuyDoi();
    } catch (error) {
      showToast("Lỗi kết nối CSDL.", "error");
    } finally {
      btnSubmit.disabled = false;
    }
  });

window.suaQuyDoi = function (id, dataStr) {
  const data = JSON.parse(decodeURIComponent(dataStr));
  document.getElementById("editQuyDoiId").value = id;
  document.getElementById("themTenCongViecQuyDoi").value = data.ten_cong_viec;
  document.getElementById("themSanPhamDauRaQuyDoi").value =
    data.san_pham_dau_ra || "";
  document.getElementById("themNhomQuyDoi").value = data.nhom || "N1";
  document.getElementById("themKhungDiemQuyDoi").value = data.khung_diem || 100;
  document.getElementById("chonCongViecChuan").value =
    data.cong_viec_chuan || "";
  document.getElementById("diemCongViecChuanQuyDoi").value =
    data.diem_chuan || 0;
  document.getElementById("themTongDiemQuyDoi").value = data.tong_diem || 0;
  document.getElementById("themHeSoQuyDoi").value = data.he_so;

  document.getElementById("tieuDeFormQuyDoi").textContent =
    "Cập nhật Danh mục Quy đổi";
  document.getElementById("btnSubmitQuyDoi").textContent = "Lưu thay đổi";
  document.getElementById("btnCancelEditQuyDoi").style.display = "inline-block";
  document.getElementById("phanQuyDoi").scrollIntoView({ behavior: "smooth" });
};

window.xoaQuyDoi = function (id) {
  showConfirm("Đồng chí có chắc chắn xóa Danh mục Quy đổi này?", async () => {
    try {
      await deleteDoc(doc(db, "danh_muc_quy_doi", id));
      showToast("Đã xóa thành công!", "success");
      loadDanhMucQuyDoi();
    } catch (error) {
      showToast("Lỗi hệ thống khi xóa!", "error");
    }
  });
};

async function loadDanhMucQuyDoi() {
  const bangQuyDoi = document.getElementById("bangQuyDoi");
  try {
    const querySnapshot = await getDocs(collection(db, "danh_muc_quy_doi"));
    bangQuyDoi.innerHTML = "";
    if (querySnapshot.empty) {
      bangQuyDoi.innerHTML =
        '<tr><td colspan="8" style="text-align:center;">Chưa có dữ liệu</td></tr>';
      return;
    }
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const dataStr = encodeURIComponent(JSON.stringify(data));
      const tr = document.createElement("tr");
      tr.innerHTML = `
                <td style="text-align: left;">${data.ten_cong_viec}</td><td>${data.san_pham_dau_ra || ""}</td>
                <td><strong>${data.nhom || ""}</strong></td>
                <td><span style="font-style:italic; font-size: 13px;">${data.cong_viec_chuan || "-"}</span></td>
                <td style="color:#d32f2f; font-weight:bold">${data.diem_chuan || 0}</td>
                <td style="color:blue; font-weight:bold">${data.tong_diem || 0}</td>
                <td style="color:red; font-weight:bold">${data.he_so}</td>
                <td>
                    <button class="btn-sm" style="background-color: #f57c00; margin-bottom: 5px;" onclick="suaQuyDoi('${docSnap.id}', '${dataStr}')">Sửa</button>
                    <button class="btn-sm" style="background-color: #d32f2f;" onclick="xoaQuyDoi('${docSnap.id}')">Xóa</button>
                </td>`;
      bangQuyDoi.appendChild(tr);
    });
  } catch (error) {
    console.error("Lỗi tải DM Quy đổi:", error);
  }
}

// ==========================================
// 5. LOGIC QUẢN LÝ CÁN BỘ
// ==========================================
function resetFormCanBo() {
  document.getElementById("formThemCanBo").reset();
  document.getElementById("editCanBoId").value = "";
  document.getElementById("tieuDeFormCanBo").textContent =
    "Thêm mới Cán bộ / Chuyên viên";
  document.getElementById("btnSubmitCanBo").textContent = "Lưu Cán bộ";
  document.getElementById("btnCancelEditCanBo").style.display = "none";
}
document
  .getElementById("btnCancelEditCanBo")
  .addEventListener("click", resetFormCanBo);

document
  .getElementById("formThemCanBo")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const btnSubmit = document.getElementById("btnSubmitCanBo");
    btnSubmit.disabled = true;
    const editId = document.getElementById("editCanBoId").value;
    const dataObj = {
      ho_ten: document.getElementById("themTenCanBo").value,
      chuc_vu: document.getElementById("themChucVu").value,
    };
    try {
      if (editId) {
        await updateDoc(doc(db, "danh_sach_can_bo", editId), dataObj);
        showToast("Đã cập nhật thông tin cán bộ!");
      } else {
        await addDoc(collection(db, "danh_sach_can_bo"), dataObj);
        showToast("Đã thêm cán bộ mới thành công!");
      }
      resetFormCanBo();
      loadDanhSachCanBo();
    } catch (error) {
      showToast("Lỗi kết nối CSDL.", "error");
    } finally {
      btnSubmit.disabled = false;
    }
  });

async function loadDanhSachCanBo() {
  const bangCanBo = document.getElementById("bangCanBo");
  const selectCanBoGiaoViec = document.getElementById("chonCanBoGiaoViec");
  const filterGiaoViec = document.getElementById("locCanBoGiaoViec");
  const filterBaoCao = document.getElementById("locCanBoBaoCao");

  if (bangCanBo)
    bangCanBo.innerHTML =
      '<tr><td colspan="4" style="text-align:center;">Đang tải...</td></tr>';
  try {
    const querySnapshot = await getDocs(collection(db, "danh_sach_can_bo"));

    // Reset nội dung dropdown
    if (selectCanBoGiaoViec)
      selectCanBoGiaoViec.innerHTML =
        '<option value="">-- Chọn cán bộ --</option>';
    if (filterGiaoViec)
      filterGiaoViec.innerHTML =
        '<option value="">-- Tất cả nhân sự --</option>';
    if (filterBaoCao)
      filterBaoCao.innerHTML = '<option value="">-- Toàn bộ Phòng --</option>';

    if (querySnapshot.empty) {
      if (bangCanBo)
        bangCanBo.innerHTML =
          '<tr><td colspan="4" style="text-align:center;">Chưa có dữ liệu cán bộ.</td></tr>';
      return;
    }

    if (bangCanBo) bangCanBo.innerHTML = "";
    let stt = 1;
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();

      // Đổ tên vào các Dropdown (Giao việc, Lọc Tab 1, Lọc Tab 2)
      if (selectCanBoGiaoViec)
        selectCanBoGiaoViec.innerHTML += `<option value="${data.ho_ten}">${data.ho_ten}</option>`;
      if (filterGiaoViec)
        filterGiaoViec.innerHTML += `<option value="${data.ho_ten}">${data.ho_ten}</option>`;
      if (filterBaoCao)
        filterBaoCao.innerHTML += `<option value="${data.ho_ten}">${data.ho_ten}</option>`;

      if (bangCanBo) {
        const dataStr = encodeURIComponent(JSON.stringify(data));
        const tr = document.createElement("tr");
        tr.innerHTML = `
                    <td>${stt++}</td><td style="text-align: left; font-weight: bold;">${data.ho_ten}</td><td>${data.chuc_vu}</td>
                    <td>
                        <button class="btn-sm" style="background-color: #f57c00; margin-right: 5px;" onclick="suaCanBo('${docSnap.id}', '${dataStr}')">Sửa</button>
                        <button class="btn-sm" style="background-color: #d32f2f;" onclick="xoaCanBo('${docSnap.id}')">Xóa</button>
                    </td>`;
        bangCanBo.appendChild(tr);
      }
    });
  } catch (error) {
    if (bangCanBo)
      bangCanBo.innerHTML =
        '<tr><td colspan="4" style="text-align:center; color:red;">Lỗi dữ liệu!</td></tr>';
  }
}

window.suaCanBo = function (id, dataStr) {
  const data = JSON.parse(decodeURIComponent(dataStr));
  document.getElementById("editCanBoId").value = id;
  document.getElementById("themTenCanBo").value = data.ho_ten;
  document.getElementById("themChucVu").value = data.chuc_vu;
  document.getElementById("tieuDeFormCanBo").textContent =
    "Cập nhật thông tin Cán bộ";
  document.getElementById("btnSubmitCanBo").textContent = "Lưu thay đổi";
  document.getElementById("btnCancelEditCanBo").style.display = "inline-block";
  document.getElementById("phanCanBo").scrollIntoView({ behavior: "smooth" });
};
window.xoaCanBo = function (id) {
  showConfirm(
    "Đồng chí có chắc chắn xóa nhân sự này khỏi danh sách?",
    async () => {
      try {
        await deleteDoc(doc(db, "danh_sach_can_bo", id));
        showToast("Đã xóa cán bộ!", "success");
        loadDanhSachCanBo();
      } catch (error) {
        showToast("Lỗi hệ thống khi xóa!", "error");
      }
    },
  );
};

// ==========================================
// 6. LOGIC GIAO VIỆC (TAB 1) - TÍCH HỢP BỘ LỌC
// ==========================================
function resetFormGiaoViec() {
  document.getElementById("formGiaoViec").reset();
  document.getElementById("editGiaoViecId").value = "";
  document.getElementById("tieuDeFormGiaoViec").textContent =
    "Phiếu giao việc hằng tháng";
  document.getElementById("btnSubmitGiaoViec").textContent = "Lưu Nhiệm Vụ";
  document.getElementById("btnCancelEditGiaoViec").style.display = "none";
}
document
  .getElementById("btnCancelEditGiaoViec")
  .addEventListener("click", resetFormGiaoViec);

document
  .getElementById("formGiaoViec")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const btnSubmit = document.getElementById("btnSubmitGiaoViec");
    btnSubmit.disabled = true;
    const editId = document.getElementById("editGiaoViecId").value;
    const tenNhiemVu = document.getElementById("chonNhiemVu").value;
    const tenCanBo = document.getElementById("chonCanBoGiaoViec").value;

    if (!tenNhiemVu || !tenCanBo) {
      showToast("Đề nghị chọn đầy đủ Nhiệm vụ và Cán bộ phụ trách!", "error");
      btnSubmit.disabled = false;
      return;
    }

    const dataObj = {
      ten_nhiem_vu: tenNhiemVu,
      can_bo: tenCanBo,
      thang_danh_gia: document.getElementById("thangDanhGia").value,
      he_so_quy_doi: parseFloat(document.getElementById("heSoQuyDoi").value),
      khoi_luong_giao: parseInt(document.getElementById("khoiLuong").value),
    };

    try {
      if (editId) {
        await updateDoc(doc(db, "nhiem_vu_danh_gia", editId), dataObj);
        showToast("Cập nhật nhiệm vụ thành công!");
      } else {
        dataObj.ngay_tao = serverTimestamp();
        await addDoc(collection(db, "nhiem_vu_danh_gia"), dataObj);
        showToast("Đã giao nhiệm vụ mới thành công!");
      }
      resetFormGiaoViec();
      loadDanhSachGiaoViec();
    } catch (error) {
      showToast("Lỗi kết nối lưu trữ dữ liệu!", "error");
    } finally {
      btnSubmit.disabled = false;
    }
  });

async function loadDanhSachGiaoViec() {
  const bangGiaoViec = document.getElementById("bangGiaoViec");
  const filterLocCanBo =
    document.getElementById("locCanBoGiaoViec")?.value || "";

  if (!bangGiaoViec) return;
  bangGiaoViec.innerHTML =
    '<tr><td colspan="7" style="text-align:center;">Đang tải...</td></tr>';

  try {
    const querySnapshot = await getDocs(collection(db, "nhiem_vu_danh_gia"));
    if (querySnapshot.empty) {
      bangGiaoViec.innerHTML =
        '<tr><td colspan="7" style="text-align:center;">Chưa có nhiệm vụ nào được giao.</td></tr>';
      return;
    }

    bangGiaoViec.innerHTML = "";
    let stt = 1;
    let taskCount = 0;

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      // Nếu có bộ lọc và tên không khớp thì bỏ qua
      if (filterLocCanBo !== "" && data.can_bo !== filterLocCanBo) return;

      taskCount++;
      const dataStr = encodeURIComponent(JSON.stringify(data));
      const tr = document.createElement("tr");
      tr.innerHTML = `
                <td>${stt++}</td><td style="text-align: left;">${data.ten_nhiem_vu}</td>
                <td style="font-weight: bold; color: #d32f2f;">${data.can_bo || "Chưa gắn"}</td>
                <td>${data.thang_danh_gia}</td><td>${data.he_so_quy_doi}</td><td>${data.khoi_luong_giao}</td>
                <td>
                    <button class="btn-sm" style="background-color: #f57c00; margin-right: 5px;" onclick="suaGiaoViec('${docSnap.id}', '${dataStr}')">Sửa</button>
                    <button class="btn-sm" style="background-color: #d32f2f;" onclick="xoaGiaoViec('${docSnap.id}')">Xóa</button>
                </td>`;
      bangGiaoViec.appendChild(tr);
    });

    // Nếu lọc xong mà rỗng (Nhân viên này chưa được giao việc)
    if (taskCount === 0) {
      bangGiaoViec.innerHTML = `<tr><td colspan="7" style="text-align:center;">Đồng chí ${filterLocCanBo} hiện chưa có nhiệm vụ nào.</td></tr>`;
    }
  } catch (error) {
    bangGiaoViec.innerHTML =
      '<tr><td colspan="7" style="text-align:center; color:red;">Lỗi kết nối dữ liệu!</td></tr>';
  }
}

window.suaGiaoViec = function (id, dataStr) {
  const data = JSON.parse(decodeURIComponent(dataStr));
  document.getElementById("editGiaoViecId").value = id;
  document.getElementById("chonNhiemVu").value = data.ten_nhiem_vu;
  document.getElementById("chonCanBoGiaoViec").value = data.can_bo || "";
  document.getElementById("thangDanhGia").value = data.thang_danh_gia;
  document.getElementById("heSoQuyDoi").value = data.he_so_quy_doi;
  document.getElementById("khoiLuong").value = data.khoi_luong_giao;
  document.getElementById("tieuDeFormGiaoViec").textContent =
    "Cập nhật Phiếu giao việc";
  document.getElementById("btnSubmitGiaoViec").textContent = "Lưu thay đổi";
  document.getElementById("btnCancelEditGiaoViec").style.display =
    "inline-block";
  document
    .getElementById("phanGiaoViec")
    .scrollIntoView({ behavior: "smooth" });
};
window.xoaGiaoViec = function (id) {
  showConfirm(
    "Đồng chí có chắc chắn muốn hủy bỏ nhiệm vụ đã giao này?",
    async () => {
      try {
        await deleteDoc(doc(db, "nhiem_vu_danh_gia", id));
        showToast("Đã hủy nhiệm vụ giao việc!");
        loadDanhSachGiaoViec();
      } catch (error) {
        showToast("Lỗi hệ thống khi xóa!", "error");
      }
    },
  );
};

// ==========================================
// 7. BÁO CÁO & CHẤM KPI (TAB 2) - TÍCH HỢP BỘ LỌC
// ==========================================
let currentTasks = [];
window.kpiSummaryData = {};
window.kpiEditMode = {};

async function loadDuLieuBaoCao() {
  const tbodyChiTiet = document.getElementById("duLieuChiTiet");
  if (!tbodyChiTiet) return;
  tbodyChiTiet.innerHTML =
    '<tr><td colspan="7" style="text-align:center;">Đang truy xuất dữ liệu...</td></tr>';

  try {
    const kpiSnap = await getDocs(collection(db, "ket_qua_kpi"));
    window.kpiSummaryData = {};
    window.kpiEditMode = {};

    kpiSnap.forEach((doc) => {
      window.kpiSummaryData[doc.id] = doc.data();
      window.kpiEditMode[doc.id] = false;
    });

    const querySnapshot = await getDocs(collection(db, "nhiem_vu_danh_gia"));
    currentTasks = [];
    if (querySnapshot.empty) {
      tbodyChiTiet.innerHTML =
        '<tr><td colspan="7" style="text-align:center;">Chưa có dữ liệu nhiệm vụ.</td></tr>';
      document.getElementById("duLieuTongHop").innerHTML = "";
      return;
    }

    querySnapshot.forEach((docSnap) => {
      let data = docSnap.data();
      data.id = docSnap.id;
      data.sl_hoan_thanh = data.sl_hoan_thanh || 0;
      data.so_loi = data.so_loi || 0;
      data.so_cham = data.so_cham || 0;
      currentTasks.push(data);
    });

    renderBangChiTiet();
    renderBangTongHop();
  } catch (error) {
    console.error(error);
    tbodyChiTiet.innerHTML =
      '<tr><td colspan="7" style="text-align:center; color:red;">Lỗi kết nối Firebase!</td></tr>';
  }
}

function renderBangChiTiet() {
  const tbody = document.getElementById("duLieuChiTiet");
  const filterLocCanBo = document.getElementById("locCanBoBaoCao")?.value || "";
  tbody.innerHTML = "";

  let renderedCount = 0;

  currentTasks.forEach((task) => {
    // Áp dụng bộ lọc
    if (filterLocCanBo !== "" && task.can_bo !== filterLocCanBo) return;
    renderedCount++;

    let safeCbId = (task.can_bo || "Chưa phân công").replace(/\s+/g, "");
    let isEdit = window.kpiEditMode[safeCbId] !== false;
    let disabledAttr = isEdit ? "" : "disabled";

    const tr = document.createElement("tr");
    tr.innerHTML = `
            <td style="text-align:left;">${task.ten_nhiem_vu}</td>
            <td style="font-weight:bold;">${task.can_bo || "Chưa phân công"}</td>
            <td>${task.he_so_quy_doi}</td>
            <td>${task.khoi_luong_giao}</td>
            <td><input type="number" class="input-calc" data-id="${task.id}" data-type="hoan_thanh" style="width:50px" min="0" value="${task.sl_hoan_thanh}" ${disabledAttr}></td>
            <td><input type="number" class="input-calc" data-id="${task.id}" data-type="loi" style="width:50px" min="0" value="${task.so_loi}" ${disabledAttr}></td>
            <td><input type="number" class="input-calc" data-id="${task.id}" data-type="cham" style="width:50px" min="0" value="${task.so_cham}" ${disabledAttr}></td>
        `;
    tbody.appendChild(tr);
  });

  if (renderedCount === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">Không có dữ liệu chi tiết cho cán bộ này.</td></tr>`;
  }

  document.querySelectorAll(".input-calc").forEach((inp) => {
    inp.addEventListener("input", (e) => {
      const id = e.target.dataset.id;
      const type = e.target.dataset.type;
      const val = parseFloat(e.target.value) || 0;
      const taskIndex = currentTasks.findIndex((t) => t.id === id);
      if (taskIndex > -1) {
        if (type === "hoan_thanh") currentTasks[taskIndex].sl_hoan_thanh = val;
        if (type === "loi") currentTasks[taskIndex].so_loi = val;
        if (type === "cham") currentTasks[taskIndex].so_cham = val;
      }
      renderBangTongHop();
    });
  });
}

function renderBangTongHop() {
  const tbody = document.getElementById("duLieuTongHop");
  const filterLocCanBo = document.getElementById("locCanBoBaoCao")?.value || "";

  let currentInputs = {};
  document.querySelectorAll(".input-dc, .input-dcong").forEach((inp) => {
    currentInputs[inp.id] = inp.value;
  });

  tbody.innerHTML = "";
  let groupedData = {};
  currentTasks.forEach((t) => {
    // Áp dụng bộ lọc
    if (filterLocCanBo !== "" && t.can_bo !== filterLocCanBo) return;

    let cb = t.can_bo || "Chưa phân công";
    if (!groupedData[cb]) groupedData[cb] = [];
    groupedData[cb].push(t);
  });

  if (Object.keys(groupedData).length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;">Không có dữ liệu tổng hợp.</td></tr>`;
    return;
  }

  for (let cb in groupedData) {
    let tasks = groupedData[cb];
    let totalGiaoQuyDoi = 0;
    let totalHoanThanhQuyDoi = 0;
    let totalLoiTru = 0;
    let totalChamTru = 0;

    tasks.forEach((t) => {
      let heSo = parseFloat(t.he_so_quy_doi) || 1;
      let giao = parseInt(t.khoi_luong_giao) || 0;
      let ht = parseFloat(t.sl_hoan_thanh) || 0;
      let loi = parseInt(t.so_loi) || 0;
      let cham = parseInt(t.so_cham) || 0;

      totalGiaoQuyDoi += giao * heSo;
      totalHoanThanhQuyDoi += ht * heSo;
      totalLoiTru += loi * 0.25 * heSo;
      totalChamTru += cham * 0.25 * heSo;
    });

    let pSL =
      totalGiaoQuyDoi > 0 ? (totalHoanThanhQuyDoi / totalGiaoQuyDoi) * 100 : 0;
    if (pSL > 100) pSL = 100;

    let pCL = 0;
    if (totalHoanThanhQuyDoi > 0) {
      let cl = totalHoanThanhQuyDoi - totalLoiTru;
      pCL = (Math.max(0, cl) / totalHoanThanhQuyDoi) * 100;
    }

    let pTD = 0;
    if (totalHoanThanhQuyDoi > 0) {
      let td = totalHoanThanhQuyDoi - totalChamTru;
      pTD = (Math.max(0, td) / totalHoanThanhQuyDoi) * 100;
    }

    let pTB = (pSL + pCL + pTD) / 3;
    let safeCbId = cb.replace(/\s+/g, "");

    let isEdit = window.kpiEditMode[safeCbId] !== false;
    let disabledAttr = isEdit ? "" : "disabled";
    let btnText = isEdit ? "Lưu" : "Sửa";
    let btnColor = isEdit ? "#2e7d32" : "#f57c00";

    let dcId = `dc_${safeCbId}`;
    let dcongId = `dcong_${safeCbId}`;
    let dcVal =
      currentInputs[dcId] !== undefined
        ? currentInputs[dcId]
        : (window.kpiSummaryData[safeCbId]?.diem_chung ?? 30);
    let dcongVal =
      currentInputs[dcongId] !== undefined
        ? currentInputs[dcongId]
        : (window.kpiSummaryData[safeCbId]?.diem_cong ?? 0);

    const tr = document.createElement("tr");
    tr.innerHTML = `
            <td style="font-weight:bold; text-align:left;">${cb}</td>
            <td>${pSL.toFixed(1)}</td>
            <td>${pCL.toFixed(1)}</td>
            <td>${pTD.toFixed(1)}</td>
            <td style="font-weight:bold; color:#f57c00;">${pTB.toFixed(2)}</td>
            <td><input type="number" id="${dcId}" class="input-dc" style="width:45px" value="${dcVal}" oninput="calcTongDiem('${safeCbId}', ${pTB})" ${disabledAttr}></td>
            <td><input type="number" id="${dcongId}" class="input-dcong" style="width:45px" value="${dcongVal}" oninput="calcTongDiem('${safeCbId}', ${pTB})" ${disabledAttr}></td>
            <td id="tong_${safeCbId}" style="font-weight:bold; color:red; font-size:16px;">-</td>
            <td id="loai_${safeCbId}" style="font-weight:bold; color:blue;">-</td>
            <td><button class="btn-sm" style="background-color: ${btnColor}; width: 70px;" onclick="thaoTacKPI('${cb}', '${safeCbId}', event)">${btnText}</button></td>
        `;
    tbody.appendChild(tr);
    setTimeout(() => window.calcTongDiem(safeCbId, pTB), 10);
  }
}

window.calcTongDiem = function (cbId, percentTrungBinh) {
  let diemChung = parseFloat(document.getElementById(`dc_${cbId}`).value) || 0;
  let diemCong =
    parseFloat(document.getElementById(`dcong_${cbId}`).value) || 0;

  let tongDiem = diemChung + percentTrungBinh * 0.7 + diemCong;
  document.getElementById(`tong_${cbId}`).innerText = tongDiem.toFixed(1);

  let xepLoai = "";
  if (tongDiem >= 90) xepLoai = "Tốt (A)";
  else if (tongDiem >= 70) xepLoai = "Khá (B)";
  else if (tongDiem >= 50) xepLoai = "Đạt (C)";
  else xepLoai = "Không đạt (D)";
  document.getElementById(`loai_${cbId}`).innerText = xepLoai;
};

window.thaoTacKPI = async function (cb, safeCbId, event) {
  let isEdit = window.kpiEditMode[safeCbId] !== false;

  if (!isEdit) {
    window.kpiEditMode[safeCbId] = true;
    renderBangChiTiet();
    renderBangTongHop();
    return;
  }

  const btn = event.target;
  btn.innerText = "Đang lưu...";
  btn.disabled = true;

  try {
    let tasks = currentTasks.filter((t) => t.can_bo === cb);
    for (let t of tasks) {
      await updateDoc(doc(db, "nhiem_vu_danh_gia", t.id), {
        sl_hoan_thanh: parseFloat(t.sl_hoan_thanh) || 0,
        so_loi: parseInt(t.so_loi) || 0,
        so_cham: parseInt(t.so_cham) || 0,
      });
    }
    let diemChung =
      parseFloat(document.getElementById(`dc_${safeCbId}`).value) || 0;
    let diemCong =
      parseFloat(document.getElementById(`dcong_${safeCbId}`).value) || 0;
    let tongDiem =
      parseFloat(document.getElementById(`tong_${safeCbId}`).innerText) || 0;
    let xepLoai = document.getElementById(`loai_${safeCbId}`).innerText;

    await setDoc(doc(db, "ket_qua_kpi", safeCbId), {
      can_bo: cb,
      diem_chung: diemChung,
      diem_cong: diemCong,
      tong_diem: tongDiem,
      xep_loai: xepLoai,
      ngay_cap_nhat: serverTimestamp(),
    });

    window.kpiSummaryData[safeCbId] = {
      diem_chung: diemChung,
      diem_cong: diemCong,
    };
    window.kpiEditMode[safeCbId] = false;

    showToast(`Đã chốt kết quả đánh giá cho ${cb}!`, "success");
    renderBangChiTiet();
    renderBangTongHop();
  } catch (error) {
    console.error(error);
    showToast("Lỗi khi lưu dữ liệu lên máy chủ!", "error");
    btn.innerText = "Lưu";
    btn.disabled = false;
  }
};

document.addEventListener("DOMContentLoaded", () => {
  loadDanhSachCanBo();
  loadDanhMucChuan();
  loadDanhMucQuyDoi();
  loadNhiemVuGiaoViec();
  loadDanhSachGiaoViec();
});
