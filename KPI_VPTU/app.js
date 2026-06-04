// ==========================================
// 1. IMPORT & KẾT NỐI FIREBASE
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  where,
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
// 2. LOGIC ĐĂNG NHẬP & PHÂN QUYỀN (RBAC)
// ==========================================
let currentUser = null;

async function initDefaultAdmin() {
  try {
    const q = query(
      collection(db, "tai_khoan"),
      where("username", "==", "admin"),
    );
    const snap = await getDocs(q);
    if (snap.empty) {
      await addDoc(collection(db, "tai_khoan"), {
        username: "admin",
        password: "123",
        role: "admin",
        ho_ten: "Quản trị viên Hệ thống",
      });
    }
  } catch (e) {
    console.error(e);
  }
}

document.getElementById("formLogin").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector("button");
  btn.innerText = "Đang xác thực...";
  btn.disabled = true;
  const u = document.getElementById("loginUsername").value.trim();
  const p = document.getElementById("loginPassword").value.trim();

  try {
    const q = query(
      collection(db, "tai_khoan"),
      where("username", "==", u),
      where("password", "==", p),
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const userData = snap.docs[0].data();
      sessionStorage.setItem("kpiUser", JSON.stringify(userData));
      checkLoginState();
      showToast(`Chào mừng đồng chí ${userData.ho_ten} đăng nhập thành công!`);
    } else {
      showToast("Sai tên đăng nhập hoặc mật khẩu!", "error");
    }
  } catch (err) {
    showToast("Lỗi kết nối máy chủ!", "error");
  }
  btn.innerText = "Đăng nhập";
  btn.disabled = false;
});

document.getElementById("btnDangXuat").addEventListener("click", () => {
  sessionStorage.removeItem("kpiUser");
  checkLoginState();
});

function checkLoginState() {
  const userStr = sessionStorage.getItem("kpiUser");
  if (userStr) {
    currentUser = JSON.parse(userStr);
    document.getElementById("loginContainer").style.display = "none";
    document.getElementById("appContainer").style.display = "block";
    document.getElementById("currentUserDisplay").innerText =
      currentUser.ho_ten;

    // 1. Áp dụng ẩn/hiện menu chính dựa trên quyền mới
    applyPermissions();

    // 2. ÉP HỆ THỐNG VẼ LẠI TOÀN BỘ CÁC BẢNG THEO QUYỀN MỚI NGAY LẬP TỨC
    if (typeof loadDanhSachTaiKhoan === "function") loadDanhSachTaiKhoan();
    if (typeof loadDanhSachGiaoViec === "function") loadDanhSachGiaoViec();
    if (typeof loadDuLieuBaoCao === "function") loadDuLieuBaoCao();
    if (typeof loadDanhMucChuan === "function") loadDanhMucChuan();
    if (typeof loadDanhMucQuyDoi === "function") loadDanhMucQuyDoi();
    if (typeof loadDanhSachCanBo === "function") loadDanhSachCanBo();
  } else {
    // 3. ĐẶC BIỆT QUAN TRỌNG: Xóa sạch bộ nhớ quyền tài khoản cũ khi đăng xuất
    currentUser = null;

    document.getElementById("loginContainer").style.display = "flex";
    document.getElementById("appContainer").style.display = "none";
    document.getElementById("formLogin").reset();
  }
}

function applyPermissions() {
  const isAdmin = currentUser && currentUser.role === "admin";
  const isViewer = currentUser && currentUser.role === "viewer";

  // Nhóm có quyền xem các menu điều hành chung (Admin và Viewer)
  const canViewAll = isAdmin || isViewer;

  // 1. Phân quyền hiển thị Menu chính cho Admin và Viewer
  document.getElementById("menuGiaoViec").style.display = canViewAll
    ? "block"
    : "none";
  document.getElementById("menuDanhMuc").style.display = canViewAll
    ? "block"
    : "none";
  document.getElementById("menuQuyDoi").style.display = canViewAll
    ? "block"
    : "none";
  document.getElementById("menuCanBo").style.display = canViewAll
    ? "block"
    : "none";

  // 2. ĐẶC BIỆT: Chỉ duy nhất Admin mới được hiển thị Menu Quản lý tài khoản (Tab 6)
  // Tài khoản Viewer và User thông thường sẽ bị ẩn hoàn toàn menu này
  const menuTaiKhoan = document.getElementById("menuTaiKhoan");
  if (menuTaiKhoan) {
    menuTaiKhoan.style.display = isAdmin ? "block" : "none";
  }

  // 3. Tự động ẩn/hiện các Form nhập liệu trên toàn bộ các Tab theo quyền Admin
  const adminForms = document.querySelectorAll(
    "#formGiaoViec, #formThemDanhMuc, #formThemQuyDoi, #formThemCanBo, #formThemTaiKhoan",
  );
  adminForms.forEach((form) => {
    form.style.display = isAdmin ? "block" : "none";
  });
}

// ==========================================
// 3. CHUYỂN MENU TAB
// ==========================================
document.getElementById("btnHuongDan").addEventListener("click", () => {
  const content = `
        <ul style="padding-left: 20px;">
            <li style="margin-bottom: 8px;"><b>Quyền Admin:</b> Toàn quyền cấu hình, giao việc, khóa/mở điểm KPI.</li>
            <li style="margin-bottom: 8px;"><b>Quyền Chuyên viên:</b> Chỉ được xem kết quả KPI của cá nhân mình đã được chốt.</li>
            <li style="margin-bottom: 8px;"><b>Công thức chuẩn (PL2):</b> Đánh giá CL và TĐ lấy Mẫu số là Số lượng GIAO. Trừ 25% điểm cho mỗi lần lỗi/chậm.</li>
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
  "menuTaiKhoan",
];
const phans = [
  "phanGiaoViec",
  "phanBaoCao",
  "phanDanhMuc",
  "phanQuyDoi",
  "phanCanBo",
  "phanTaiKhoan",
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
});
document.getElementById("menuQuyDoi").addEventListener("click", () => {
  hideAllTabs();
  document.getElementById("menuQuyDoi").classList.add("active");
  document.getElementById("phanQuyDoi").style.display = "block";
  loadDanhMucChuan();
  loadDanhMucQuyDoi();
});
document.getElementById("menuCanBo").addEventListener("click", () => {
  hideAllTabs();
  document.getElementById("menuCanBo").classList.add("active");
  document.getElementById("phanCanBo").style.display = "block";
  loadDanhSachCanBo();
});
document.getElementById("menuTaiKhoan").addEventListener("click", () => {
  hideAllTabs();
  document.getElementById("menuTaiKhoan").classList.add("active");
  document.getElementById("phanTaiKhoan").style.display = "block";
  loadDanhSachCanBoTaiKhoan();
  loadDanhSachTaiKhoan();
});

document
  .getElementById("locCanBoGiaoViec")
  .addEventListener("change", loadDanhSachGiaoViec);
document.getElementById("locCanBoBaoCao").addEventListener("change", () => {
  renderBangChiTiet();
  renderBangTongHop();
});

// ==========================================
// LOAD DỮ LIỆU CHUNG
// ==========================================
async function loadNhiemVuGiaoViec() {
  const select = document.getElementById("chonNhiemVu");
  if (!select) return;
  try {
    let h = '<option value="">-- Chọn công việc (Chuẩn / Quy đổi) --</option>';
    const snapC = await getDocs(collection(db, "danh_muc_chuan"));
    if (!snapC.empty) {
      h += '<optgroup label="--- DANH MỤC CHUẨN ---">';
      snapC.forEach((d) => {
        const data = d.data();
        h += `<option value="${data.ten_cong_viec}" data-heso="${data.he_so}">[${data.nhom}] ${data.ten_cong_viec}</option>`;
      });
      h += "</optgroup>";
    }
    const snapQ = await getDocs(collection(db, "danh_muc_quy_doi"));
    if (!snapQ.empty) {
      h += '<optgroup label="--- DANH MỤC QUY ĐỔI ---">';
      snapQ.forEach((d) => {
        const data = d.data();
        h += `<option value="${data.ten_cong_viec}" data-heso="${data.he_so}">[${data.nhom}] ${data.ten_cong_viec}</option>`;
      });
      h += "</optgroup>";
    }
    select.innerHTML = h;
    if (!select.hasAttribute("bound")) {
      select.addEventListener("change", function () {
        document.getElementById("heSoQuyDoi").value =
          this.options[this.selectedIndex]?.dataset.heso || "";
      });
      select.setAttribute("bound", "true");
    }
  } catch (e) {}
}

async function loadDanhSachCanBo() {
  const b = document.getElementById("bangCanBo");
  const cbG = document.getElementById("chonCanBoGiaoViec");
  const lG = document.getElementById("locCanBoGiaoViec");
  const lB = document.getElementById("locCanBoBaoCao");

  // 1. PHẢI RESET TRƯỚC KHI LOAD LẠI
  if (cbG) cbG.innerHTML = '<option value="">-- Chọn cán bộ --</option>';
  if (lG) lG.innerHTML = '<option value="">-- Tất cả nhân sự --</option>';
  if (lB) lB.innerHTML = '<option value="">-- Toàn bộ Phòng --</option>';
  if (b) b.innerHTML = "";

  // Kiểm tra quyền Admin để ẩn/hiện form thêm cán bộ
  const isAdmin = currentUser && currentUser.role === "admin";
  const formThemCanBo = document.getElementById("formThemCanBo");
  if (formThemCanBo) {
    formThemCanBo.style.display = isAdmin ? "block" : "none";
  }

  try {
    const snap = await getDocs(collection(db, "danh_sach_can_bo"));
    let stt = 1;

    snap.forEach((d) => {
      const data = d.data();
      const name = data.ho_ten;
      const dStr = encodeURIComponent(JSON.stringify(data));

      // 2. Đổ dữ liệu vào các ô Dropdown lựa chọn cán bộ
      if (cbG) cbG.innerHTML += `<option value="${name}">${name}</option>`;
      if (lG) lG.innerHTML += `<option value="${name}">${name}</option>`;
      if (lB) lB.innerHTML += `<option value="${name}">${name}</option>`;

      // 3. Tiến hành vẽ dữ liệu ra bảng Danh sách Cán bộ (Tab 5)
      if (b) {
        const tr = document.createElement("tr");

        // Phân quyền cột hành động: Chỉ Admin mới có nút Sửa/Xóa. Viewer/User chỉ xem
        const hanhDongHTML = isAdmin
          ? `<button class="btn-sm" style="background-color:#f57c00; margin-right: 5px; color:white; border:none; border-radius:3px;" onclick="suaCanBo('${d.id}', '${dStr}')">Sửa</button>
             <button class="btn-sm" style="background-color:#d32f2f; color:white; border:none; border-radius:3px;" onclick="xoaCanBo('${d.id}')">Xóa</button>`
          : `<span style="color:#757575; font-size:13px; font-style:italic;">Chỉ xem</span>`;

        tr.innerHTML = `
          <td>${stt++}</td>
          <td style="font-weight:bold;">${name}</td>
          <td>${data.chuc_vu || ""}</td>
          <td>${hanhDongHTML}</td>
        `;
        b.appendChild(tr);
      }
    });
  } catch (e) {
    console.error("Lỗi khi load danh sách cán bộ:", e);
    showToast("Không thể tải danh sách cán bộ!", "error");
  }
}

// ==========================================
// XỬ LÝ FORM: DANH MỤC CHUẨN (TAB 3) - ĐÃ PHÂN QUYỀN
// ==========================================
document.getElementById("themNhom").addEventListener("change", function () {
  const m = { N1: 100, N2: 200, N3: 300, N4: 400, N5: 500 };
  document.getElementById("themKhungDiem").value = m[this.value] || 100;
});

document.querySelectorAll(".calc-tc").forEach((input) =>
  input.addEventListener("input", () => {
    let t = parseFloat(document.getElementById("themTongDiem").value) || 0;
    let m = parseFloat(document.getElementById("diemCongViecChuan").value) || 0;
    document.getElementById("themHeSo").value = m > 0 ? (t / m).toFixed(2) : 0;
  }),
);

document
  .getElementById("formThemDanhMuc")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    // CHẶN BẢO MẬT: Nếu không phải admin thì không cho phép lưu hoặc cập nhật
    if (!currentUser || currentUser.role !== "admin") {
      showToast(
        "Tài khoản của bạn không có quyền thực hiện chức năng này!",
        "error",
      );
      return;
    }

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
        showToast("Cập nhật thành công!");
      } else {
        await addDoc(collection(db, "danh_muc_chuan"), dataObj);
        showToast("Lưu thành công!");
      }
      document.getElementById("formThemDanhMuc").reset();
      document.getElementById("editDocId").value = "";
      document.getElementById("btnCancelEdit").style.display = "none";
      loadDanhMucChuan();
    } catch (error) {
      showToast("Lỗi CSDL", "error");
    }
  });

document.getElementById("btnCancelEdit").addEventListener("click", () => {
  document.getElementById("formThemDanhMuc").reset();
  document.getElementById("editDocId").value = "";
  document.getElementById("btnCancelEdit").style.display = "none";
});

window.suaDanhMuc = function (id, dataStr) {
  // CHẶN BẢO MẬT: Chặn kích hoạt chức năng sửa danh mục nếu không phải admin
  if (!currentUser || currentUser.role !== "admin") {
    showToast("Bạn không có quyền chỉnh sửa danh mục chuẩn!", "error");
    return;
  }

  const d = JSON.parse(decodeURIComponent(dataStr));
  document.getElementById("editDocId").value = id;
  document.getElementById("themTenCongViec").value = d.ten_cong_viec;
  document.getElementById("themSanPhamDauRa").value = d.san_pham_dau_ra;
  document.getElementById("themNhom").value = d.nhom;
  document.getElementById("themKhungDiem").value = d.khung_diem;
  document.getElementById("diemCongViecChuan").value = d.diem_chuan;
  document.getElementById("themTongDiem").value = d.tong_diem;
  document.getElementById("themHeSo").value = d.he_so;
  document.getElementById("btnCancelEdit").style.display = "inline-block";

  const phanDanhMuc = document.getElementById("phanDanhMuc");
  if (phanDanhMuc) phanDanhMuc.scrollIntoView({ behavior: "smooth" });
};

window.xoaDanhMuc = function (id) {
  // CHẶN BẢO MẬT: Chặn thực thi lệnh xóa danh mục nếu không phải admin
  if (!currentUser || currentUser.role !== "admin") {
    showToast("Bạn không có quyền xóa danh mục chuẩn!", "error");
    return;
  }

  showConfirm("Xóa Danh mục này?", async () => {
    await deleteDoc(doc(db, "danh_muc_chuan", id));
    loadDanhMucChuan();
  });
};

async function loadDanhMucChuan() {
  const b = document.getElementById("bangDanhMuc");
  const s = document.getElementById("chonCongViecChuan");

  // Xác định quyền Admin
  const isAdmin = currentUser && currentUser.role === "admin";

  // 1. TỰ ĐỘNG ẨN/HIỆN PHẦN FORM NHẬP LIỆU DANH MỤC CHUẨN
  // Nếu là Viewer hoặc User thường, ẩn toàn bộ form nhập liệu phía trên đi
  const formThemDanhMuc = document.getElementById("formThemDanhMuc");
  if (formThemDanhMuc) {
    formThemDanhMuc.style.display = isAdmin ? "block" : "none";
  }

  try {
    const snap = await getDocs(collection(db, "danh_muc_chuan"));
    if (s) s.innerHTML = '<option value="">-- Chọn nhóm tham chiếu --</option>';
    if (b) b.innerHTML = "";

    snap.forEach((d) => {
      const data = d.data();
      const dStr = encodeURIComponent(JSON.stringify(data));

      if (s) {
        const opt = document.createElement("option");
        opt.value = data.ten_cong_viec;
        opt.dataset.diem = data.tong_diem;
        opt.text = `[${data.nhom}] ${data.ten_cong_viec} (Tử: ${data.tong_diem})`;
        s.appendChild(opt);
      }

      if (b) {
        const tr = document.createElement("tr");

        // 2. TỰ ĐỘNG ẨN/HIỆN NÚT "SỬA / XÓA" TRONG BẢNG DANH MỤC
        // Nếu là Admin thì sinh ra nút, nếu là Viewer/User thì hiện chữ "Chỉ xem"
        const hanhDongHTML = isAdmin
          ? `<button class="btn-sm" style="background-color:#f57c00; margin-bottom: 5px; color:white; border:none; border-radius:3px;" onclick="suaDanhMuc('${d.id}', '${dStr}')">Sửa</button>
             <button class="btn-sm" style="background-color:#d32f2f; color:white; border:none; border-radius:3px;" onclick="xoaDanhMuc('${d.id}')">Xóa</button>`
          : `<span style="color:#757575; font-size:13px; font-style:italic;">Chỉ xem</span>`;

        tr.innerHTML = `
          <td style="text-align:left;">${data.ten_cong_viec}</td>
          <td>${data.san_pham_dau_ra}</td>
          <td>${data.nhom}</td>
          <td style="color:red; font-weight:bold;">${data.diem_chuan}</td>
          <td style="color:blue; font-weight:bold;">${data.tong_diem}</td>
          <td style="font-weight:bold;">${data.he_so}</td>
          <td>${hanhDongHTML}</td>
        `;
        b.appendChild(tr);
      }
    });
  } catch (e) {
    console.error("Lỗi tải danh mục chuẩn:", e);
  }
}
// ==========================================
// XỬ LÝ FORM: DANH MỤC QUY ĐỔI (TAB 4) - ĐÃ PHÂN QUYỀN
// ==========================================
document
  .getElementById("themNhomQuyDoi")
  .addEventListener("change", function () {
    const m = { N1: 100, N2: 200, N3: 300, N4: 400, N5: 500 };
    document.getElementById("themKhungDiemQuyDoi").value = m[this.value] || 100;
  });

document
  .getElementById("chonCongViecChuan")
  .addEventListener("change", function () {
    document.getElementById("diemCongViecChuanQuyDoi").value =
      this.options[this.selectedIndex]?.dataset?.diem || 0;
    calculateHeSoQuyDoi();
  });

document
  .querySelectorAll(".calc-qd")
  .forEach((input) => input.addEventListener("input", calculateHeSoQuyDoi));

function calculateHeSoQuyDoi() {
  let t = parseFloat(document.getElementById("themTongDiemQuyDoi").value) || 0;
  let m =
    parseFloat(document.getElementById("diemCongViecChuanQuyDoi").value) || 0;
  document.getElementById("themHeSoQuyDoi").value =
    m > 0 ? (t / m).toFixed(2) : 0;
}

document
  .getElementById("formThemQuyDoi")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    // CHẶN BẢO MẬT: Nếu không phải admin thì không cho phép lưu hoặc cập nhật danh mục quy đổi
    if (!currentUser || currentUser.role !== "admin") {
      showToast(
        "Tài khoản của bạn không có quyền thực hiện chức năng này!",
        "error",
      );
      return;
    }

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
        showToast("Cập nhật quy đổi!");
      } else {
        await addDoc(collection(db, "danh_muc_quy_doi"), dataObj);
        showToast("Lưu quy đổi!");
      }
      document.getElementById("formThemQuyDoi").reset();
      document.getElementById("editQuyDoiId").value = "";
      document.getElementById("btnCancelEditQuyDoi").style.display = "none";
      loadDanhMucQuyDoi();
    } catch (e) {
      showToast("Lỗi CSDL", "error");
    }
  });

document.getElementById("btnCancelEditQuyDoi").addEventListener("click", () => {
  document.getElementById("formThemQuyDoi").reset();
  document.getElementById("editQuyDoiId").value = "";
  document.getElementById("btnCancelEditQuyDoi").style.display = "none";
});

window.suaQuyDoi = function (id, dataStr) {
  // CHẶN BẢO MẬT: Chặn mở chức năng sửa danh mục quy đổi nếu không phải admin
  if (!currentUser || currentUser.role !== "admin") {
    showToast("Bạn không có quyền chỉnh sửa danh mục quy đổi!", "error");
    return;
  }

  const d = JSON.parse(decodeURIComponent(dataStr));
  document.getElementById("editQuyDoiId").value = id;
  document.getElementById("themTenCongViecQuyDoi").value = d.ten_cong_viec;
  document.getElementById("themSanPhamDauRaQuyDoi").value = d.san_pham_dau_ra;
  document.getElementById("themNhomQuyDoi").value = d.nhom;
  document.getElementById("themKhungDiemQuyDoi").value = d.khung_diem;
  document.getElementById("chonCongViecChuan").value = d.cong_viec_chuan;
  document.getElementById("diemCongViecChuanQuyDoi").value = d.diem_chuan;
  document.getElementById("themTongDiemQuyDoi").value = d.tong_diem;
  document.getElementById("themHeSoQuyDoi").value = d.he_so;
  document.getElementById("btnCancelEditQuyDoi").style.display = "inline-block";

  const phanQuyDoi = document.getElementById("phanQuyDoi");
  if (phanQuyDoi) phanQuyDoi.scrollIntoView();
};

window.xoaQuyDoi = function (id) {
  // CHẶN BẢO MẬT: Chặn thực thi lệnh xóa danh mục quy đổi nếu không phải admin
  if (!currentUser || currentUser.role !== "admin") {
    showToast("Bạn không có quyền xóa danh mục quy đổi!", "error");
    return;
  }

  showConfirm("Xóa Quy đổi này?", async () => {
    await deleteDoc(doc(db, "danh_muc_quy_doi", id));
    loadDanhMucQuyDoi();
  });
};

async function loadDanhMucQuyDoi() {
  const b = document.getElementById("bangQuyDoi");
  if (!b) return;
  b.innerHTML = "";

  // Xác định quyền Admin
  const isAdmin = currentUser && currentUser.role === "admin";

  // 1. TỰ ĐỘNG ẨN/HIỆN PHẦN FORM NHẬP LIỆU DANH MỤC QUY ĐỔI
  // Nếu là Viewer hoặc User thường, ẩn toàn bộ form thêm quy đổi đi
  const formThemQuyDoi = document.getElementById("formThemQuyDoi");
  if (formThemQuyDoi) {
    formThemQuyDoi.style.display = isAdmin ? "block" : "none";
  }

  try {
    const snap = await getDocs(collection(db, "danh_muc_quy_doi"));
    snap.forEach((d) => {
      const data = d.data();
      const dStr = encodeURIComponent(JSON.stringify(data));
      const tr = document.createElement("tr");

      // 2. TỰ ĐỘNG ẨN/HIỆN NÚT "SỬA / XÓA" TRONG BẢNG QUY ĐỔI
      // Nếu là Admin thì hiện nút, nếu là Viewer/User thì hiện chữ "Chỉ xem"
      const hanhDongHTML = isAdmin
        ? `<button class="btn-sm" style="background-color:#f57c00; margin-bottom: 5px; color:white; border:none; border-radius:3px;" onclick="suaQuyDoi('${d.id}', '${dStr}')">Sửa</button>
           <button class="btn-sm" style="background-color:#d32f2f; color:white; border:none; border-radius:3px;" onclick="xoaQuyDoi('${d.id}')">Xóa</button>`
        : `<span style="color:#757575; font-size:13px; font-style:italic;">Chỉ xem</span>`;

      tr.innerHTML = `
        <td style="text-align:left;">${data.ten_cong_viec}</td>
        <td>${data.san_pham_dau_ra}</td>
        <td>${data.nhom}</td>
        <td><i>${data.cong_viec_chuan}</i></td>
        <td style="color:red; font-weight:bold;">${data.diem_chuan}</td>
        <td style="color:blue; font-weight:bold;">${data.tong_diem}</td>
        <td style="font-weight:bold;">${data.he_so}</td>
        <td>${hanhDongHTML}</td>
      `;
      b.appendChild(tr);
    });
  } catch (e) {
    console.error("Lỗi tải danh mục quy đổi:", e);
  }
}

// ==========================================
// XỬ LÝ FORM: CÁN BỘ (TAB 5) - ĐÃ PHÂN QUYỀN
// ==========================================
document
  .getElementById("formThemCanBo")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    // CHẶN BẢO MẬT: Nếu không phải admin thì không cho phép lưu hoặc cập nhật thông tin cán bộ
    if (!currentUser || currentUser.role !== "admin") {
      showToast(
        "Tài khoản của bạn không có quyền thực hiện chức năng này!",
        "error",
      );
      return;
    }

    const editId = document.getElementById("editCanBoId").value;
    const dataObj = {
      ho_ten: document.getElementById("themTenCanBo").value,
      chuc_vu: document.getElementById("themChucVu").value,
    };
    if (editId) {
      await updateDoc(doc(db, "danh_sach_can_bo", editId), dataObj);
      showToast("Đã cập nhật!");
    } else {
      await addDoc(collection(db, "danh_sach_can_bo"), dataObj);
      showToast("Đã thêm!");
    }
    document.getElementById("formThemCanBo").reset();
    // Dòng này cực kỳ quan trọng để cập nhật lại tất cả Dropdown
    await loadDanhSachCanBo();
    document.getElementById("formThemCanBo").reset();
    document.getElementById("editCanBoId").value = "";
    document.getElementById("btnCancelEditCanBo").style.display = "none";
    loadDanhSachCanBo();
  });

document.getElementById("btnCancelEditCanBo").addEventListener("click", () => {
  document.getElementById("formThemCanBo").reset();
  document.getElementById("editCanBoId").value = "";
  document.getElementById("btnCancelEditCanBo").style.display = "none";
});

window.suaCanBo = function (id, dataStr) {
  // CHẶN BẢO MẬT: Chặn mở chức năng sửa cán bộ nếu không phải admin
  if (!currentUser || currentUser.role !== "admin") {
    showToast("Bạn không có quyền chỉnh sửa thông tin cán bộ!", "error");
    return;
  }

  const d = JSON.parse(decodeURIComponent(dataStr));
  document.getElementById("editCanBoId").value = id;
  document.getElementById("themTenCanBo").value = d.ho_ten;
  document.getElementById("themChucVu").value = d.chuc_vu;
  document.getElementById("btnCancelEditCanBo").style.display = "inline-block";

  const phanCanBo = document.getElementById("phanCanBo");
  if (phanCanBo) phanCanBo.scrollIntoView();
};

window.xoaCanBo = function (id) {
  // CHẶN BẢO MẬT: Chặn thực thi lệnh xóa cán bộ nếu không phải admin
  if (!currentUser || currentUser.role !== "admin") {
    showToast("Bạn không có quyền xóa cán bộ khỏi hệ thống!", "error");
    return;
  }

  showConfirm("Xóa Cán bộ này?", async () => {
    await deleteDoc(doc(db, "danh_sach_can_bo", id));
    loadDanhSachCanBo();
  });
};

// ==========================================
// XỬ LÝ FORM: TÀI KHOẢN (TAB 6)
// ==========================================
async function loadDanhSachCanBoTaiKhoan() {
  const sel = document.getElementById("tkHoTen");
  if (!sel) return;
  sel.innerHTML = '<option value="">-- Chọn cán bộ --</option>';
  const snap = await getDocs(collection(db, "danh_sach_can_bo"));
  snap.forEach((d) => {
    sel.innerHTML += `<option value="${d.data().ho_ten}">${d.data().ho_ten}</option>`;
  });
}
async function loadDanhSachTaiKhoan() {
  const b = document.getElementById("bangTaiKhoan");
  if (!b) return;
  b.innerHTML = "";
  const snap = await getDocs(collection(db, "tai_khoan"));
  let stt = 1;

  // Xác định xem người đang xem danh sách này có phải Admin không
  const isAdmin = currentUser && currentUser.role === "admin";

  snap.forEach((d) => {
    const data = d.data();

    // 1. Cập nhật hiển thị tên Phân quyền cho cả 3 loại tài khoản
    let pText = "Chuyên viên (User)";
    let pColor = "blue";

    if (data.role === "admin") {
      pText = "Trưởng phòng (Admin)";
      pColor = "red";
    } else if (data.role === "viewer") {
      pText = "Viewer (Xem dữ liệu)";
      pColor = "purple"; // Màu tím để dễ phân biệt tài khoản Viewer
    }

    const tr = document.createElement("tr");

    // 2. Kiểm tra quyền: Chỉ Admin mới hiện nút Xóa, Viewer/User sẽ ẩn nút Xóa tài khoản
    const hanhDongHTML = isAdmin
      ? `<button class="btn-sm" style="background-color:#d32f2f;" onclick="xoaTaiKhoan('${d.id}')">Xóa</button>`
      : `<span style="color:#757575; font-size:13px;">Không có quyền</span>`;

    tr.innerHTML = `
      <td>${stt++}</td>
      <td style="font-weight:bold;">${data.username}</td>
      <td>${data.ho_ten}</td>
      <td style="color:${pColor}; font-weight:500;">${pText}</td>
      <td>***</td>
      <td>${hanhDongHTML}</td>
    `;
    b.appendChild(tr);
  });
}

document
  .getElementById("formThemTaiKhoan")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    // Code lấy giá trị tự động chạy tốt khi bạn đã thêm <option value="viewer"> vào HTML
    await addDoc(collection(db, "tai_khoan"), {
      ho_ten: document.getElementById("tkHoTen").value,
      username: document.getElementById("tkUsername").value,
      password: document.getElementById("tkPassword").value,
      role: document.getElementById("tkRole").value,
    });

    showToast("Tạo tài khoản thành công!");
    document.getElementById("formThemTaiKhoan").reset();
    loadDanhSachTaiKhoan();
  });

window.xoaTaiKhoan = function (id) {
  // Chặn bảo mật tầng sâu: Nếu không phải admin thì không cho thực hiện hành động xóa
  if (!currentUser || currentUser.role !== "admin") {
    showToast("Bạn không có quyền thực hiện hành động này!", "error");
    return;
  }

  showConfirm("Xóa tài khoản này?", async () => {
    await deleteDoc(doc(db, "tai_khoan", id));
    loadDanhSachTaiKhoan();
  });
};

// ==========================================
// ==========================================
// XỬ LÝ FORM: GIAO VIỆC (TAB 1) - ĐÃ PHÂN QUYỀN
// ==========================================
document
  .getElementById("formGiaoViec")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    // CHẶN BẢO MẬT: Nếu không phải admin thì không cho lưu/cập nhật dữ liệu
    if (!currentUser || currentUser.role !== "admin") {
      showToast(
        "Tài khoản của bạn không có quyền thực hiện chức năng này!",
        "error",
      );
      return;
    }

    const editId = document.getElementById("editGiaoViecId").value;
    const dataObj = {
      ten_nhiem_vu: document.getElementById("chonNhiemVu").value,
      can_bo: document.getElementById("chonCanBoGiaoViec").value,
      thang_danh_gia: document.getElementById("thangDanhGia").value,
      he_so_quy_doi: parseFloat(document.getElementById("heSoQuyDoi").value),
      khoi_luong_giao: parseInt(document.getElementById("khoiLuong").value),
    };
    if (editId) {
      await updateDoc(doc(db, "nhiem_vu_danh_gia", editId), dataObj);
      showToast("Đã cập nhật!");
    } else {
      dataObj.ngay_tao = serverTimestamp();
      await addDoc(collection(db, "nhiem_vu_danh_gia"), dataObj);
      showToast("Giao việc thành công!");
    }
    document.getElementById("formGiaoViec").reset();
    document.getElementById("editGiaoViecId").value = "";
    document.getElementById("btnCancelEditGiaoViec").style.display = "none";
    loadDanhSachGiaoViec();
  });

document
  .getElementById("btnCancelEditGiaoViec")
  .addEventListener("click", () => {
    document.getElementById("formGiaoViec").reset();
    document.getElementById("editGiaoViecId").value = "";
    document.getElementById("btnCancelEditGiaoViec").style.display = "none";
  });

window.suaGiaoViec = function (id, dataStr) {
  // CHẶN BẢO MẬT: Viewer bấm vào nút sửa (nếu có) sẽ bị chặn
  if (!currentUser || currentUser.role !== "admin") {
    showToast("Bạn không có quyền chỉnh sửa nhiệm vụ!", "error");
    return;
  }

  const d = JSON.parse(decodeURIComponent(dataStr));
  document.getElementById("editGiaoViecId").value = id;
  document.getElementById("chonNhiemVu").value = d.ten_nhiem_vu;
  document.getElementById("chonCanBoGiaoViec").value = d.can_bo;
  document.getElementById("thangDanhGia").value = d.thang_danh_gia;
  document.getElementById("heSoQuyDoi").value = d.he_so_quy_doi;
  document.getElementById("khoiLuong").value = d.khoi_luong_giao;
  document.getElementById("btnCancelEditGiaoViec").style.display =
    "inline-block";

  const phanGiaoViec = document.getElementById("phanGiaoViec");
  if (phanGiaoViec) phanGiaoViec.scrollIntoView();
};

window.xoaGiaoViec = function (id) {
  // CHẶN BẢO MẬT: Viewer bấm vào nút xóa (nếu có) sẽ bị chặn
  if (!currentUser || currentUser.role !== "admin") {
    showToast("Bạn không có quyền hủy giao việc này!", "error");
    return;
  }

  showConfirm("Hủy giao việc này?", async () => {
    await deleteDoc(doc(db, "nhiem_vu_danh_gia", id));
    loadDanhSachGiaoViec();
  });
};

async function loadDanhSachGiaoViec() {
  const b = document.getElementById("bangGiaoViec");
  const f = document.getElementById("locCanBoGiaoViec")?.value || "";
  if (!b) return;
  b.innerHTML = "";

  // Kiểm tra quyền Admin
  const isAdmin = currentUser && currentUser.role === "admin";

  // 1. TỰ ĐỘNG ẨN/HIỆN PHẦN FORM NHẬP LIỆU ("Phiếu giao việc hàng tháng")
  // Nếu là Viewer hoặc User thường, ẩn toàn bộ form nhập liệu đi
  const formGiaoViec = document.getElementById("formGiaoViec");
  if (formGiaoViec) {
    formGiaoViec.style.display = isAdmin ? "block" : "none";
  }

  try {
    const snap = await getDocs(collection(db, "nhiem_vu_danh_gia"));
    let stt = 1;
    snap.forEach((d) => {
      const data = d.data();
      if (f !== "" && data.can_bo !== f) return;
      const dStr = encodeURIComponent(JSON.stringify(data));
      const tr = document.createElement("tr");

      // 2. TỰ ĐỘNG ẨN/HIỆN NÚT "SỬA / XÓA" TRONG BẢNG DỮ LIỆU
      // Nếu là Admin thì hiện 2 nút, nếu là Viewer/User thì hiện chữ "Không có quyền" (hoặc để trống)
      const hanhDongHTML = isAdmin
        ? `<button class="btn-sm" style="background-color:#f57c00; margin-right:5px;" onclick="suaGiaoViec('${d.id}', '${dStr}')">Sửa</button>
           <button class="btn-sm" style="background-color:#d32f2f;" onclick="xoaGiaoViec('${d.id}')">Xóa</button>`
        : `<span style="color:#757575; font-size:13px; font-style:italic;">Chỉ xem</span>`;

      tr.innerHTML = `
        <td>${stt++}</td>
        <td style="text-align:left;">${data.ten_nhiem_vu}</td>
        <td style="font-weight:bold; color:#d32f2f;">${data.can_bo}</td>
        <td>${data.thang_danh_gia}</td>
        <td>${data.he_so_quy_doi}</td>
        <td>${data.khoi_luong_giao}</td>
        <td>${hanhDongHTML}</td>
      `;
      b.appendChild(tr);
    });
  } catch (e) {
    console.error("Lỗi tải danh sách giao việc:", e);
  }
}

// ==========================================
// THUẬT TOÁN CHỐT & CHẤM KPI (TAB 2) - ĐÃ PHÂN QUYỀN
// ==========================================
let currentTasks = [];
window.kpiSummaryData = {};
window.kpiEditMode = {};

async function loadDuLieuBaoCao() {
  const tbodyChiTiet = document.getElementById("duLieuChiTiet");
  if (!tbodyChiTiet) return;
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
  } catch (e) {
    console.error("Lỗi load dữ liệu báo cáo KPI:", e);
  }
}

function renderBangChiTiet() {
  const tbody = document.getElementById("duLieuChiTiet");
  if (!tbody) return;
  tbody.innerHTML = "";
  const filterLocCanBo = document.getElementById("locCanBoBaoCao")?.value || "";

  // Phân tách quyền rõ ràng
  const isAdmin = currentUser && currentUser.role === "admin";
  const isViewer = currentUser && currentUser.role === "viewer";
  const canViewAll = isAdmin || isViewer; // Admin và Viewer được xem tất cả

  currentTasks.forEach((task) => {
    // Nếu không có quyền xem tất cả và tên cán bộ không khớp với user đăng nhập -> Bỏ qua
    if (!canViewAll && task.can_bo !== currentUser.ho_ten) return;
    // Nếu có quyền xem tất cả và đang chọn lọc theo cán bộ cụ thể -> Lọc dữ liệu
    if (canViewAll && filterLocCanBo !== "" && task.can_bo !== filterLocCanBo)
      return;

    let safeCbId = (task.can_bo || "").replace(/\s+/g, "");
    let isEdit = window.kpiEditMode[safeCbId] !== false;

    // Chỉ ADMIN và đang trong chế độ BẬT SỬA mới mở khóa input nhập liệu
    let disabledAttr = isAdmin && isEdit ? "" : "disabled";

    const tr = document.createElement("tr");
    tr.innerHTML = `
        <td style="text-align:left;">${task.ten_nhiem_vu}</td>
        <td style="font-weight:bold;">${task.can_bo}</td>
        <td>${task.he_so_quy_doi}</td>
        <td>${task.khoi_luong_giao}</td>
        <td><input type="number" class="input-calc" data-id="${task.id}" data-type="hoan_thanh" style="width:50px" min="0" value="${task.sl_hoan_thanh}" ${disabledAttr}></td>
        <td><input type="number" class="input-calc" data-id="${task.id}" data-type="loi" style="width:50px" min="0" value="${task.so_loi}" ${disabledAttr}></td>
        <td><input type="number" class="input-calc" data-id="${task.id}" data-type="cham" style="width:50px" min="0" value="${task.so_cham}" ${disabledAttr}></td>
    `;
    tbody.appendChild(tr);
  });

  document.querySelectorAll(".input-calc").forEach((inp) => {
    inp.addEventListener("input", (e) => {
      // Chặn bảo mật tầng sâu: Nếu không phải Admin sửa form thì không cập nhật mảng tạm
      if (!currentUser || currentUser.role !== "admin") return;

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
  if (!tbody) return;
  tbody.innerHTML = "";
  const filterLocCanBo = document.getElementById("locCanBoBaoCao")?.value || "";

  const isAdmin = currentUser && currentUser.role === "admin";
  const isViewer = currentUser && currentUser.role === "viewer";
  const canViewAll = isAdmin || isViewer;

  let currentInputs = {};
  document.querySelectorAll(".input-dc, .input-dcong").forEach((inp) => {
    currentInputs[inp.id] = inp.value;
  });

  let groupedData = {};
  currentTasks.forEach((t) => {
    if (!canViewAll && t.can_bo !== currentUser.ho_ten) return;
    if (canViewAll && filterLocCanBo !== "" && t.can_bo !== filterLocCanBo)
      return;
    let cb = t.can_bo || "Chưa phân công";
    if (!groupedData[cb]) groupedData[cb] = [];
    groupedData[cb].push(t);
  });

  for (let cb in groupedData) {
    let tasks = groupedData[cb];
    let tGiao = 0;
    let tHT = 0;
    let tLoi = 0;
    let tCham = 0;

    tasks.forEach((t) => {
      let hs = parseFloat(t.he_so_quy_doi) || 1;
      tGiao += (t.khoi_luong_giao || 0) * hs;
      tHT += (t.sl_hoan_thanh || 0) * hs;
      tLoi += (t.so_loi || 0) * 0.25 * hs;
      tCham += (t.so_cham || 0) * 0.25 * hs;
    });

    let pSL = tGiao > 0 ? (tHT / tGiao) * 100 : 0;
    if (pSL > 100) pSL = 100;
    let pCL = tGiao > 0 ? (Math.max(0, tHT - tLoi) / tGiao) * 100 : 0;
    let pTD = tGiao > 0 ? (Math.max(0, tHT - tCham) / tGiao) * 100 : 0;
    let pTB = (pSL + pCL + pTD) / 3;

    let safeCbId = cb.replace(/\s+/g, "");
    let isEdit = window.kpiEditMode[safeCbId] !== false;

    // Ô nhập điểm chung, điểm cộng chỉ mở khóa khi là Admin và đang bật Edit
    let disabledAttr = isAdmin && isEdit ? "" : "disabled";

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

    // Phân quyền hiển thị ô Thao tác: Chỉ Admin mới có nút Sửa/Lưu. Viewer nhìn thấy chữ "Chỉ xem"
    let btnThaoTac = isAdmin
      ? `<td style="display:table-cell"><button class="btn-sm" style="background-color: ${isEdit ? "#2e7d32" : "#f57c00"}; width: 70px; color:white; border:none; border-radius:3px;" onclick="thaoTacKPI('${cb}', '${safeCbId}', event)">${isEdit ? "Lưu" : "Sửa"}</button></td>`
      : `<td style="color:#757575; font-size:13px; font-style:italic;">Chỉ xem</td>`;

    tr.innerHTML = `
        <td style="font-weight:bold; text-align:left; cursor:pointer; color:#0d47a1; text-decoration:underline;" onclick="showDashboard('${cb}', ${pSL}, ${pCL}, ${pTD}, ${pTB}, '${safeCbId}')" title="Nhấn để xem biểu đồ KPI">${cb}</td>
        <td>${pSL.toFixed(1)}</td>
        <td>${pCL.toFixed(1)}</td>
        <td>${pTD.toFixed(1)}</td>
        <td style="font-weight:bold; color:#f57c00;">${pTB.toFixed(2)}</td>
        <td><input type="number" id="${dcId}" class="input-dc" style="width:45px" value="${dcVal}" oninput="calcTongDiem('${safeCbId}', ${pTB})" ${disabledAttr}></td>
        <td><input type="number" id="${dcongId}" class="input-dcong" style="width:45px" value="${dcongVal}" oninput="calcTongDiem('${safeCbId}', ${pTB})" ${disabledAttr}></td>
        <td id="tong_${safeCbId}" style="font-weight:bold; color:red; font-size:16px;">-</td>
        <td id="loai_${safeCbId}" style="font-weight:bold; color:blue;">-</td>
        ${btnThaoTac}
    `;
    tbody.appendChild(tr);
    setTimeout(() => window.calcTongDiem(safeCbId, pTB), 10);
  }
}

window.calcTongDiem = function (cbId, pTB) {
  const elDc = document.getElementById(`dc_${cbId}`);
  const elDcong = document.getElementById(`dcong_${cbId}`);
  if (!elDc || !elDcong) return;

  let dc = parseFloat(elDc.value) || 0;
  let dcong = parseFloat(elDcong.value) || 0;
  let t = dc + pTB * 0.7 + dcong;

  const elTong = document.getElementById(`tong_${cbId}`);
  const elLoai = document.getElementById(`loai_${cbId}`);
  if (elTong) elTong.innerText = t.toFixed(1);
  if (elLoai) {
    elLoai.innerText =
      t >= 90
        ? "Xuất sắc (A)"
        : t >= 70
          ? "Tốt (B)"
          : t >= 50
            ? "Hoàn thành (C)"
            : "Không hoàn thành (D)";
  }
};

window.thaoTacKPI = async function (cb, safeCbId, event) {
  // CHẶN BẢO MẬT: Nếu không phải Admin bấm vào hàm này thì dừng lại luôn
  if (!currentUser || currentUser.role !== "admin") {
    showToast("Tài khoản của bạn không có quyền chấm điểm KPI!", "error");
    return;
  }

  if (window.kpiEditMode[safeCbId] === false) {
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

    let dc = parseFloat(document.getElementById(`dc_${safeCbId}`).value) || 0;
    let dcong =
      parseFloat(document.getElementById(`dcong_${safeCbId}`).value) || 0;

    await setDoc(doc(db, "ket_qua_kpi", safeCbId), {
      can_bo: cb,
      diem_chung: dc,
      diem_cong: dcong,
      tong_diem:
        parseFloat(document.getElementById(`tong_${safeCbId}`).innerText) || 0,
      xep_loai: document.getElementById(`loai_${safeCbId}`).innerText,
      ngay_cap_nhat: serverTimestamp(),
    });
    window.kpiSummaryData[safeCbId] = { diem_chung: dc, diem_cong: dcong };
    window.kpiEditMode[safeCbId] = false;
    showToast(`Đã chốt KPI cho ${cb}!`);
    renderBangChiTiet();
    renderBangTongHop();
  } catch (e) {
    showToast("Lỗi lưu DB!", "error");
    btn.innerText = "Lưu";
    btn.disabled = false;
  }
};

// ==========================================
// DASHBOARD CHART.JS (BÊN PHẢI)
// ==========================================
let kpiChartInstance = null;

window.showDashboard = function (cbName, pSL, pCL, pTD, pTB, safeCbId) {
  document.getElementById("kpiDashboardWidget").style.display = "block";
  document.getElementById("dashBoardCanBoName").innerText = cbName;

  let tongDiem = document.getElementById(`tong_${safeCbId}`).innerText;
  let xepLoai = document.getElementById(`loai_${safeCbId}`).innerText;

  document.getElementById("dashBoardDetails").innerHTML = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span>Tổng điểm:</span>
            <span style="color:red; font-weight:bold; font-size:16px;">${tongDiem}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
            <span>Xếp loại:</span>
            <span style="color:blue; font-weight:bold; font-size:16px;">${xepLoai}</span>
        </div>
    `;

  const ctx = document.getElementById("kpiChart").getContext("2d");
  if (kpiChartInstance) {
    kpiChartInstance.destroy();
  }

  kpiChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["% SL", "% CL", "% TĐ", "% TB"],
      datasets: [
        {
          label: "Tỷ lệ đạt được",
          data: [pSL, pCL, pTD, pTB],
          backgroundColor: [
            "rgba(54, 162, 235, 0.7)",
            "rgba(255, 99, 132, 0.7)",
            "rgba(255, 206, 86, 0.7)",
            "rgba(75, 192, 192, 0.7)",
          ],
          borderColor: [
            "rgba(54, 162, 235, 1)",
            "rgba(255, 99, 132, 1)",
            "rgba(255, 206, 86, 1)",
            "rgba(75, 192, 192, 1)",
          ],
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true, max: 100, grid: { color: "#eceff1" } },
        x: { grid: { display: false } },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function (context) {
              return context.parsed.y.toFixed(1) + "%";
            },
          },
        },
      },
    },
  });
};

// ==========================================
// KHỞI CHẠY HỆ THỐNG
// ==========================================
document.addEventListener("DOMContentLoaded", async () => {
  await initDefaultAdmin();
  // Tải dữ liệu cán bộ ngay lập tức để tất cả dropdown có sẵn dữ liệu
  await loadDanhSachCanBo();
  checkLoginState();
});
