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

// ==========================================
// HỆ THỐNG THÔNG BÁO CHUYÊN NGHIỆP
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
// 2. CHUYỂN MENU 4 TAB
// ==========================================
document.getElementById("btnHuongDan").addEventListener("click", () => {
  const content = `
        <ul style="padding-left: 20px;">
            <li style="margin-bottom: 8px;"><b>Điểm Số lượng:</b> Tỷ lệ % = (Khối lượng thực tế / Khối lượng giao) * 100.</li>
            <li style="margin-bottom: 8px;"><b>Điểm Chất lượng & Tiến độ:</b> Điểm chuẩn là 100%. Trừ 25% cho mỗi lần phát sinh lỗi chuyên môn hoặc nộp chậm.</li>
            <li style="margin-bottom: 8px;"><b>Tổng điểm tháng:</b> Điểm tiêu chí chung + (Điểm Thực hiện nhiệm vụ * 70%) + Điểm cộng phát sinh.</li>
        </ul>
        <p style="color: #2e7d32; font-weight: bold; font-style: italic;">* Lưu ý: Cán bộ phụ trách sẽ được chỉ định tự động từ Phiếu giao việc.</p>
    `;
  showModal("Hướng dẫn nghiệp vụ (Quy định 870)", content);
});

const menuGiaoViec = document.getElementById("menuGiaoViec");
const menuBaoCao = document.getElementById("menuBaoCao");
const menuDanhMuc = document.getElementById("menuDanhMuc");
const menuCanBo = document.getElementById("menuCanBo");

const phanGiaoViec = document.getElementById("phanGiaoViec");
const phanBaoCao = document.getElementById("phanBaoCao");
const phanDanhMuc = document.getElementById("phanDanhMuc");
const phanCanBo = document.getElementById("phanCanBo");

function hideAllTabs() {
  menuGiaoViec.classList.remove("active");
  menuBaoCao.classList.remove("active");
  menuDanhMuc.classList.remove("active");
  menuCanBo.classList.remove("active");
  phanGiaoViec.style.display = "none";
  phanBaoCao.style.display = "none";
  phanDanhMuc.style.display = "none";
  phanCanBo.style.display = "none";
}

menuGiaoViec.addEventListener("click", () => {
  hideAllTabs();
  menuGiaoViec.classList.add("active");
  phanGiaoViec.style.display = "block";
  loadDanhMucChuan();
  loadDanhSachGiaoViec();
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
  resetFormDanhMuc();
});
menuCanBo.addEventListener("click", () => {
  hideAllTabs();
  menuCanBo.classList.add("active");
  phanCanBo.style.display = "block";
  loadDanhSachCanBo();
  resetFormCanBo();
});

// ==========================================
// 3. LOGIC QUẢN LÝ DANH MỤC CHUẨN (TAB 3)
// ==========================================
document.getElementById("themNhom").addEventListener("change", function () {
  const maxScores = { N1: 100, N2: 200, N3: 300, N4: 400, N5: 500 };
  document.getElementById("themKhungDiem").value = maxScores[this.value] || 100;
});
function calculateHeSo() {
  let diemDanhGia =
    parseFloat(document.getElementById("themTongDiem").value) || 0;
  let diemChuan =
    parseFloat(document.getElementById("diemCongViecChuan").value) || 0;
  document.getElementById("themHeSo").value =
    diemChuan > 0 ? (diemDanhGia / diemChuan).toFixed(2) : 0;
}
document
  .querySelectorAll(".calc-tc")
  .forEach((input) => input.addEventListener("input", calculateHeSo));
function resetFormDanhMuc() {
  document.getElementById("formThemDanhMuc").reset();
  document.getElementById("editDocId").value = "";
  document.getElementById("tieuDeFormDanhMuc").textContent =
    "Khởi tạo Danh mục & Hệ số quy đổi";
  document.getElementById("btnSubmitDanhMuc").textContent = "Lưu Danh mục";
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
        showToast("Đã cập nhật danh mục thành công!");
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
    "Cập nhật Danh mục";
  document.getElementById("btnSubmitDanhMuc").textContent = "Lưu thay đổi";
  document.getElementById("btnCancelEdit").style.display = "inline-block";
  document.getElementById("phanDanhMuc").scrollIntoView({ behavior: "smooth" });
};
window.xoaDanhMuc = function (id) {
  showConfirm(
    "Đồng chí có chắc chắn muốn xóa Danh mục chuẩn này khỏi hệ thống?",
    async () => {
      try {
        await deleteDoc(doc(db, "danh_muc_chuan", id));
        showToast("Đã xóa danh mục thành công!", "success");
        loadDanhMucChuan();
      } catch (error) {
        showToast("Lỗi hệ thống khi xóa!", "error");
      }
    },
  );
};
async function loadDanhMucChuan() {
  const selectNhiemVu = document.getElementById("chonNhiemVu");
  const bangDanhMuc = document.getElementById("bangDanhMuc");
  try {
    const querySnapshot = await getDocs(collection(db, "danh_muc_chuan"));
    if (querySnapshot.empty) {
      if (selectNhiemVu)
        selectNhiemVu.innerHTML =
          '<option value="">-- Chưa có dữ liệu --</option>';
      if (bangDanhMuc)
        bangDanhMuc.innerHTML =
          '<tr><td colspan="8" style="text-align:center;">Chưa có dữ liệu</td></tr>';
      return;
    }
    if (selectNhiemVu)
      selectNhiemVu.innerHTML =
        '<option value="">-- Chọn công việc chuẩn --</option>';
    if (bangDanhMuc) bangDanhMuc.innerHTML = "";

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const nhomHienThi =
        data.nhom && data.nhom !== "undefined" ? `[${data.nhom}] ` : "";
      if (selectNhiemVu) {
        const option = document.createElement("option");
        option.value = data.ten_cong_viec;
        option.text = `${nhomHienThi}${data.ten_cong_viec}`;
        option.dataset.heso = data.he_so;
        selectNhiemVu.appendChild(option);
      }
      if (bangDanhMuc) {
        const dataStr = encodeURIComponent(JSON.stringify(data));
        const tr = document.createElement("tr");
        tr.innerHTML = `
                    <td style="text-align: left;">${data.ten_cong_viec}</td><td>${data.san_pham_dau_ra || ""}</td>
                    <td><strong>${data.nhom || ""}</strong></td><td>${data.khung_diem || 100}</td>
                    <td style="color:#d32f2f; font-weight:bold">${data.diem_chuan || "-"}</td><td style="color:blue; font-weight:bold">${data.tong_diem || 0}</td>
                    <td style="color:red; font-weight:bold">${data.he_so}</td>
                    <td>
                        <button class="btn-sm" style="background-color: #f57c00; margin-bottom: 5px;" onclick="suaDanhMuc('${docSnap.id}', '${dataStr}')">Sửa</button>
                        <button class="btn-sm" style="background-color: #d32f2f;" onclick="xoaDanhMuc('${docSnap.id}')">Xóa</button>
                    </td>`;
        bangDanhMuc.appendChild(tr);
      }
    });
    if (selectNhiemVu && !selectNhiemVu.hasAttribute("data-bound")) {
      selectNhiemVu.addEventListener("change", function () {
        document.getElementById("heSoQuyDoi").value =
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

// ==========================================
// 4. LOGIC QUẢN LÝ CÁN BỘ (TAB 4)
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
  const selectCanBoGiaoViec = document.getElementById("chonCanBoGiaoViec"); // Dùng cho Tab 1

  if (bangCanBo)
    bangCanBo.innerHTML =
      '<tr><td colspan="4" style="text-align:center;">Đang tải...</td></tr>';
  try {
    const querySnapshot = await getDocs(collection(db, "danh_sach_can_bo"));

    if (selectCanBoGiaoViec)
      selectCanBoGiaoViec.innerHTML =
        '<option value="">-- Chọn cán bộ --</option>';

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

      // Nạp dữ liệu vào Select của Form Giao việc
      if (selectCanBoGiaoViec) {
        const option = document.createElement("option");
        option.value = data.ho_ten;
        option.text = data.ho_ten;
        selectCanBoGiaoViec.appendChild(option);
      }

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
// 5. LOGIC GIAO VIỆC (TAB 1) - TÍCH HỢP TÊN CÁN BỘ
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
      showToast("Đề nghị chọn Đầy đủ Nhiệm vụ và Cán bộ phụ trách!", "error");
      btnSubmit.disabled = false;
      return;
    }

    const dataObj = {
      ten_nhiem_vu: tenNhiemVu,
      can_bo: tenCanBo, // Bổ sung trường Cán bộ vào CSDL
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
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const dataStr = encodeURIComponent(JSON.stringify(data));
      const tr = document.createElement("tr");
      tr.innerHTML = `
                <td>${stt++}</td><td style="text-align: left;">${data.ten_nhiem_vu}</td>
                <td style="font-weight: bold; color: #d32f2f;">${data.can_bo || "Chưa gắn"}</td> <!-- Hiển thị cán bộ -->
                <td>${data.thang_danh_gia}</td><td>${data.he_so_quy_doi}</td><td>${data.khoi_luong_giao}</td>
                <td>
                    <button class="btn-sm" style="background-color: #f57c00; margin-right: 5px;" onclick="suaGiaoViec('${docSnap.id}', '${dataStr}')">Sửa</button>
                    <button class="btn-sm" style="background-color: #d32f2f;" onclick="xoaGiaoViec('${docSnap.id}')">Xóa</button>
                </td>`;
      bangGiaoViec.appendChild(tr);
    });
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
// 6. BÁO CÁO & CHẤM KPI (TAB 2) - TỰ ĐỘNG ĐỌC TÊN CÁN BỘ
// ==========================================
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
                    <!-- Cán bộ được chốt cứng từ lúc giao việc, không cần Select nữa -->
                    <span style="font-weight:bold; color: #0d47a1;">${data.can_bo || "Chưa phân công"}</span>
                    <input type="hidden" id="canBo_${docSnap.id}" value="${data.can_bo || ""}">
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
    showToast(
      "Nhiệm vụ này chưa được gắn cho cán bộ nào ở khâu Giao việc.",
      "error",
    );
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

// Gọi các hàm khởi tạo khi trang web vừa bật lên
document.addEventListener("DOMContentLoaded", () => {
  loadDanhSachCanBo(); // Tải cán bộ trước để đổ vào Select Tab 1
  loadDanhMucChuan();
  loadDanhSachGiaoViec();
});
