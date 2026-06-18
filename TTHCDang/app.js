import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  set,
  onValue,
  push,
  remove,
  get,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBQf87uHhZkcnyVLCxMYSetDoeqjfUVphY",
  authDomain: "tthcdang.firebaseapp.com",
  databaseURL:
    "https://tthcdang-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "tthcdang",
  storageBucket: "tthcdang.firebasestorage.app",
  messagingSenderId: "362559187523",
  appId: "1:362559187523:web:736535db17553be2ff82f6",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

// --- CÁC HÀM TRỢ GIÚP CHUẨN HOÁ HỆ THỐNG ---
function cleanFirebaseKey(str) {
  if (!str) return "";
  return str.replace(/[^a-zA-Z0-9]/g, "_");
}

function formatDate(dateString) {
  if (!dateString || dateString === "Chưa nhập") return "Chưa nhập";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

let currentRole = "user"; // Hỗ trợ 3 vai trò: admin, edit, user
let danhSachDangBoGoc = [];
let thongTinTapHuanLan2HienTai = {};
let thongTinKeHoachHienTai = {};
let thongTinDangPhiHienTai = {};
let filterXValue = null; // Biến toàn cục lưu trữ ngưỡng tỷ lệ x% phục vụ bộ lọc nâng cao

if (typeof window.myChartHigh === "undefined") window.myChartHigh = null;
if (typeof window.myChartLow === "undefined") window.myChartLow = null;
if (typeof window.myChartDangPhiTron === "undefined")
  window.myChartDangPhiTron = null;

// ========================================================
// --- BỘ LỌC SEARCHABLE DROPDOWN ĐỘNG THỜI GIAN THỰC ---
// ========================================================
function initSearchableDropdown(
  containerId,
  hiddenInputId,
  placeholder,
  itemsList,
) {
  const container = document.getElementById(containerId);
  const hiddenInput = document.getElementById(hiddenInputId);
  if (!container || !hiddenInput) return;

  container.innerHTML = `
    <div class="dropdown-select-box">
      <span class="selected-text" style="color: #666;">${hiddenInput.value || placeholder}</span>
      <i class="fa-solid fa-chevron-down" style="font-size:0.8rem; color:#999;"></i>
    </div>
    <div class="dropdown-menu-list">
      <input type="text" class="dropdown-search-input" placeholder="Gõ từ khóa để tìm kiếm nhanh...">
      <div class="dropdown-options-container"></div>
    </div>
  `;

  const selectBox = container.querySelector(".dropdown-select-box");
  const menuList = container.querySelector(".dropdown-menu-list");
  const searchInput = container.querySelector(".dropdown-search-input");
  const optionsContainer = container.querySelector(
    ".dropdown-options-container",
  );
  const selectedText = container.querySelector(".selected-text");

  if (hiddenInput.value) {
    selectedText.style.color = "#333";
    selectedText.style.fontWeight = "600";
  }

  function renderOptions(filteredItems) {
    optionsContainer.innerHTML = "";
    if (filteredItems.length === 0) {
      optionsContainer.innerHTML = `<div class="dropdown-item-option no-result" style="padding: 10px; color: #999; font-style: italic; text-align: center;">Không tìm thấy đơn vị phù hợp</div>`;
      return;
    }
    filteredItems.forEach((item) => {
      const optionDiv = document.createElement("div");
      optionDiv.className = "dropdown-item-option";
      optionDiv.innerText = item;

      optionDiv.addEventListener("click", (e) => {
        e.stopPropagation();
        selectedText.innerText = item;
        selectedText.style.color = "#333";
        selectedText.style.fontWeight = "600";
        hiddenInput.value = item;
        menuList.style.display = "none";
        hiddenInput.dispatchEvent(new Event("change"));
      });
      optionsContainer.appendChild(optionDiv);
    });
  }

  renderOptions(itemsList);

  selectBox.addEventListener("click", (e) => {
    e.stopPropagation();
    const isVisible = menuList.style.display === "block";
    document
      .querySelectorAll(".dropdown-menu-list")
      .forEach((el) => (el.style.display = "none"));
    menuList.style.display = isVisible ? "none" : "block";
    if (!isVisible) {
      searchInput.value = "";
      renderOptions(itemsList);
      setTimeout(() => searchInput.focus(), 50);
    }
  });

  searchInput.addEventListener("click", (e) => e.stopPropagation());

  searchInput.addEventListener("input", () => {
    const keyword = searchInput.value.toLowerCase().trim();
    const filtered = itemsList.filter((item) => {
      const cleanItem = item
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      const cleanKeyword = keyword
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      return (
        item.toLowerCase().includes(keyword) || cleanItem.includes(cleanKeyword)
      );
    });
    renderOptions(filtered);
  });
}

document.addEventListener("click", () => {
  document
    .querySelectorAll(".dropdown-menu-list")
    .forEach((el) => (el.style.display = "none"));
});

// ========================================================
// --- TỰ ĐỘNG SINH KỲ BÁO CÁO ĐỘNG THEO THỜI GIAN THỰC ---
// ========================================================
function khoiTaoKyBaoCaoTuDong() {
  const ngayHienTai = new Date();
  const namHienTai = ngayHienTai.getFullYear();
  const thangHienTai = ngayHienTai.getMonth() + 1;

  const selectDangPhiKy = document.getElementById("select-dangphi-ky");
  const filterDangPhiKy = document.getElementById("filter-dangphi-ky");
  const lookupDangPhiKy = document.getElementById("lookup-dangphi-ky");

  let htmlOptions = "";
  for (let t = 1; t <= thangHienTai; t++) {
    const chuoiThang = String(t).padStart(2, "0");
    const giaTriKy = `Tháng ${chuoiThang}/${namHienTai}`;
    const thuocTinhSelected = t === thangHienTai ? "selected" : "";
    htmlOptions += `<option value="${giaTriKy}" ${thuocTinhSelected}>${giaTriKy}</option>`;
  }

  if (selectDangPhiKy) selectDangPhiKy.innerHTML = htmlOptions;
  if (filterDangPhiKy) filterDangPhiKy.innerHTML = htmlOptions;
  if (lookupDangPhiKy) lookupDangPhiKy.innerHTML = htmlOptions;
}

khoiTaoKyBaoCaoTuDong();

// ========================================================
// --- CƠ CHẾ TỰ ĐỘNG ĐĂNG XUẤT SAU 15 PHÚT BỎ QUÊN ---
// ========================================================
const THOI_GIAN_CHO_PHUT = 15;
const THOI_GIAN_CHO_MS = THOI_GIAN_CHO_PHUT * 60 * 1000;

function capNhatThoiGianTuongTacCuoi() {
  localStorage.setItem("lastActivityTime", Date.now().toString());
}

function kiemTraThoiGianBaoQuen() {
  const lastActivity = localStorage.getItem("lastActivityTime");
  if (lastActivity) {
    const thoiGianDaQua = Date.now() - parseInt(lastActivity);
    if (thoiGianDaQua >= THOI_GIAN_CHO_MS) {
      clearInterval(window.intervalKiemTraPhiens);
      localStorage.removeItem("lastActivityTime");
      sessionStorage.clear();

      Swal.fire({
        icon: "warning",
        title: "HẾT PHIÊN LÀM VIỆC",
        text: `Tài khoản tự động đăng xuất do đã quá ${THOI_GIAN_CHO_PHUT} phút bạn không tương tác với hệ thống!`,
        confirmButtonColor: "#003366",
        confirmButtonText: "Đăng nhập lại",
        allowOutsideClick: false,
      }).then(() => {
        signOut(auth).then(() => {
          window.location.href = "login.html";
        });
      });
    }
  }
}

// --- 1. XÁC THỰC TRẠNG THÁI & PHÂN QUYỀN ĐĂNG NHẬP ---
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
  } else {
    if (document.getElementById("current-user")) {
      document.getElementById("current-user").innerText = user.email;
    }

    let savedRole = sessionStorage.getItem("userRole") || "user";
    currentRole = savedRole.trim().toLowerCase();

    get(ref(database, "users/" + user.uid))
      .then((snapshot) => {
        if (snapshot.exists()) {
          const uData = snapshot.val();
          if (uData && uData.role) {
            currentRole = uData.role.trim().toLowerCase();
            sessionStorage.setItem("userRole", currentRole);
          }
        }
        capNhatHienThiTabTheoQuyen();
      })
      .catch(() => {
        capNhatHienThiTabTheoQuyen();
      });
  }
});

function capNhatHienThiTabTheoQuyen() {
  const navQuanTriBtn =
    document.querySelector(".tab-btn[onclick*='tab-quan-tri']") ||
    document.getElementById("nav-admin-only");

  if (document.getElementById("current-role")) {
    if (currentRole === "admin") {
      document.getElementById("current-role").innerText = "admin";
    } else if (currentRole === "edit") {
      document.getElementById("current-role").innerText = "edit";
    } else {
      document.getElementById("current-role").innerText = "user";
    }
  }

  if (currentRole === "admin") {
    if (navQuanTriBtn)
      navQuanTriBtn.style.setProperty("display", "block", "important");
    if (document.getElementById("upload-taphuan-container"))
      document
        .getElementById("upload-taphuan-container")
        .style.setProperty("display", "block", "important");
  } else {
    if (navQuanTriBtn)
      navQuanTriBtn.style.setProperty("display", "none", "important");
    if (document.getElementById("upload-taphuan-container"))
      document
        .getElementById("upload-taphuan-container")
        .style.setProperty("display", "none", "important");
  }

  const selTrangThai = document.getElementById("kehoach-trang-thai");
  if (selTrangThai) selTrangThai.disabled = false;

  if (typeof window.handleTrangThaiKeHoachChange === "function") {
    window.handleTrangThaiKeHoachChange();
  }

  // KHỞI TẠO KHUNG GIAO DIỆN LỌC PHẦN TRĂM TRƯỚC ĐỂ TRÁNH LỖI PHỤ THUỘC ĐỒNG BỘ DOM
  khoiTaoKhungBoLocThongKeX();
  renderTableDangPhi();

  capNhatThoiGianTuongTacCuoi();
  const cacSuKien = [
    "click",
    "mousemove",
    "mousedown",
    "keypress",
    "scroll",
    "touchstart",
  ];
  cacSuKien.forEach((suKien) => {
    window.addEventListener(suKien, capNhatThoiGianTuongTacCuoi, {
      passive: true,
    });
  });
  if (window.intervalKiemTraPhiens) clearInterval(window.intervalKiemTraPhiens);
  window.intervalKiemTraPhiens = setInterval(kiemTraThoiGianBaoQuen, 30000);
}

if (document.getElementById("btn-logout")) {
  document.getElementById("btn-logout").addEventListener("click", () => {
    signOut(auth).then(() => {
      sessionStorage.clear();
      window.location.href = "login.html";
    });
  });
}

// --- 2. LUỒNG ĐIỀU HƯỚNG TABS ---
window.switchTab = function (evt, tabId) {
  const tabContents = document.getElementsByClassName("tab-content");
  for (let content of tabContents) {
    content.classList.remove("active");
  }

  const tabBtns = document.getElementsByClassName("tab-btn");
  for (let btn of tabBtns) {
    btn.classList.remove("active");
  }

  const targetTab = document.getElementById(tabId);
  if (targetTab) {
    targetTab.classList.add("active");
  }
  if (evt && evt.currentTarget) {
    evt.currentTarget.classList.add("active");
  }

  const dashboardKeHoach = document.getElementById("sidebar-dashboard-kehoach");
  const dashboardTapHuan = document.getElementById("sidebar-dashboard-taphuan");
  const dashboardDangPhi = document.getElementById("sidebar-dashboard-dangphi");

  if (dashboardKeHoach)
    dashboardKeHoach.style.setProperty("display", "none", "important");
  if (dashboardTapHuan)
    dashboardTapHuan.style.setProperty("display", "none", "important");
  if (dashboardDangPhi)
    dashboardDangPhi.style.setProperty("display", "none", "important");

  if (tabId === "tab-tap-huan") {
    if (dashboardTapHuan)
      dashboardTapHuan.style.setProperty("display", "block", "important");
  } else if (tabId === "tab-cai-dat") {
    if (dashboardDangPhi) {
      dashboardDangPhi.style.setProperty("display", "block", "important");
      tinhToanVaVeDashboardTongQuan();
      thuThiTraCuuDangPhiSidebar();
    }
  } else {
    if (dashboardKeHoach)
      dashboardKeHoach.style.setProperty("display", "block", "important");
  }
};

// --- 3. QUẢN LÝ DANH MỤC ĐẢNG BỘ ĐƠN VỊ GỐC (94 ĐƠN VỊ) ---
const dbRefDangBoGoc = ref(database, "danhmuc_dangbo");
onValue(dbRefDangBoGoc, (snapshot) => {
  danhSachDangBoGoc = [];
  const adminDangBoList = document.getElementById("admin-dangbo-list");

  if (adminDangBoList) adminDangBoList.innerHTML = "";

  const data = snapshot.val();
  if (data) {
    Object.keys(data).forEach((key) => {
      const db = data[key];
      if (db.ten && db.ten !== "undefined" && db.ten.trim() !== "") {
        danhSachDangBoGoc.push(db.ten.trim());

        if (adminDangBoList) {
          const itemDiv = document.createElement("div");
          itemDiv.className = "data-item";
          itemDiv.style.cssText =
            "display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px dashed #eee; align-items:center;";
          itemDiv.innerHTML = `<span>${db.ten}</span>${currentRole === "admin" ? `<button class="btn-delete-dangbo" data-id="${key}" style="background:none; border:none; color:#dc3545; cursor:pointer;"><i class="fa-solid fa-trash-can"></i> Xóa</button>` : ""}`;
          adminDangBoList.appendChild(itemDiv);
        }
      }
    });

    document.querySelectorAll(".btn-delete-dangbo").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const idXoa = e.currentTarget.getAttribute("data-id");
        if (confirm("Xác nhận xóa đảng bộ này khỏi danh mục?")) {
          remove(ref(database, "danhmuc_dangbo/" + idXoa));
        }
      });
    });
  }

  danhSachDangBoGoc.sort((a, b) => a.localeCompare(b, "vi"));

  tinhToanThongKeKeHoach();
  capNhatDropdownDangBoChuaTapHuan();
  capNhatDropdownDangBoTabKeHoach();
  capNhatDropdownDangBoChuaNopDangPhi();
  napDanhSachLookupSidebarTraCuu();
});

if (document.getElementById("form-add-dangbo")) {
  document.getElementById("form-add-dangbo").addEventListener("submit", (e) => {
    e.preventDefault();
    if (currentRole !== "admin") return;
    const tenMoi = document.getElementById("input-new-dangbo").value.trim();
    if (tenMoi) {
      const newRef = push(ref(database, "danhmuc_dangbo"));
      set(newRef, { id: newRef.key, ten: tenMoi }).then(() => {
        document.getElementById("input-new-dangbo").value = "";
      });
    }
  });
}

if (document.getElementById("btn-import-excel")) {
  document.getElementById("btn-import-excel").addEventListener("click", () => {
    if (currentRole !== "admin") return;
    const fileInput = document.getElementById("excel-file-input");
    const file = fileInput.files[0];
    if (!file) {
      showToast("Vui lòng chọn file Excel danh mục trước!", "warning");
      return;
    }
    const reader = new FileReader();
    reader.onload = function (e) {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      let importCount = 0;
      jsonData.forEach((row) => {
        let tenDonVi = "";
        for (let key in row) {
          if (
            key.toLowerCase().includes("tên đơn vị") ||
            key.toLowerCase().includes("tên đảng bộ") ||
            key.toLowerCase().includes("dang bo")
          ) {
            tenDonVi = row[key] ? row[key].toString().trim() : "";
            break;
          }
        }
        if (tenDonVi && tenDonVi !== "undefined") {
          const newRef = push(ref(database, "danhmuc_dangbo"));
          set(newRef, { id: newRef.key, ten: tenDonVi });
          importCount++;
        }
      });
      showToast(`Đã nạp thành công ${importCount} đơn vị danh mục!`, "success");
      fileInput.value = "";
    };
    reader.readAsArrayBuffer(file);
  });
}

// --- 4. HÀM LỌC DROPDOWN ĐẢNG BỘ CHƯA TẬP HUÂN ---
function capNhatDropdownDangBoChuaTapHuan() {
  const selectDropdown = document.getElementById("select-taphuan-dangbo");
  if (!selectDropdown) return;

  const danhSachGocChuan = [...new Set(danhSachDangBoGoc)].filter(
    (ten) => ten && ten !== "undefined",
  );
  const danhSachTenDaTapHuan = [];

  // ĐÃ ĐỔI THÀNH BIẾN ĐỢT 2 ĐỂ Ô CHỌN HIỂN THỊ CHÍNH XÁC CHO LẦN 2
  if (
    typeof thongTinTapHuanLan2HienTai !== "undefined" &&
    thongTinTapHuanLan2HienTai
  ) {
    Object.keys(thongTinTapHuanLan2HienTai).forEach((key) => {
      const item = thongTinTapHuanLan2HienTai[key];
      if (item && item.ten_dang_bo && item.ten_dang_bo !== "undefined") {
        danhSachTenDaTapHuan.push(item.ten_dang_bo.trim().toLowerCase());
      }
    });
  }
  const danhSachChuaTapHuan = danhSachGocChuan.filter((tenDonVi) => {
    return !danhSachTenDaTapHuan.includes(tenDonVi.trim().toLowerCase());
  });

  danhSachChuaTapHuan.sort((a, b) => a.localeCompare(b, "vi"));
  selectDropdown.innerHTML = "";

  if (danhSachChuaTapHuan.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.innerText = `-- Tất cả ${danhSachGocChuan.length} đơn vị đã có số liệu --`;
    selectDropdown.appendChild(option);
  } else {
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.innerText = `-- Chọn đơn vị nhập số liệu (${danhSachChuaTapHuan.length} đơn vị còn lại) --`;
    selectDropdown.appendChild(defaultOption);

    danhSachChuaTapHuan.forEach((tenDonVi) => {
      const option = document.createElement("option");
      option.value = tenDonVi;
      option.innerText = tenDonVi;
      selectDropdown.appendChild(option);
    });
  }
}

if (document.getElementById("form-taphuan-new")) {
  document
    .getElementById("form-taphuan-new")
    .addEventListener("submit", (e) => {
      e.preventDefault();
      const selectDangBo = document.getElementById("select-taphuan-dangbo");
      const inputSoNguoi = document.getElementById("input-taphuan-songuoi");
      const tenDangBo = selectDangBo.value;
      const soNguoi = parseInt(inputSoNguoi.value) || 0;

      if (!tenDangBo) {
        showToast("Vui lòng chọn một Đảng bộ!", "warning");
        return;
      }

      const soDonViDaNhap = Object.keys(thongTinTapHuanLan2HienTai).filter(
        (k) =>
          thongTinTapHuanLan2HienTai[k].ten_dang_bo &&
          thongTinTapHuanLan2HienTai[k].ten_dang_bo !== "undefined",
      ).length;
      const safeKey = cleanFirebaseKey(tenDangBo);

      set(ref(database, "tap_huan_lan_2/" + safeKey), {
        stt: soDonViDaNhap + 1,
        ten_dang_bo: tenDangBo,
        so_nguoi_tham_gia: soNguoi,
        trang_thai: soNguoi > 0 ? "Đã tập huấn" : "Chưa tập huấn",
        ngay_cap_nhat: new Date().toISOString(),
      }).then(() => {
        showToast(`Đã lưu thành công cho ${tenDangBo}!`, "success");
        inputSoNguoi.value = "";
      });
    });
}

// --- 5. LẮNG NGHE NHÁNH TẬP HUÂN VÀ VẼ BIỂU ĐỒ BAR CHART REALTIME (BẢO TOÀN TẬP HUÂN 100%) ---
const dbRefTapHuan = ref(database, "tap_huan_lan_2");
onValue(dbRefTapHuan, (snapshot) => {
  const tableBody = document.getElementById("table-taphuan-body");
  thongTinTapHuanLan2HienTai = snapshot.val() || {};

  capNhatDropdownDangBoChuaTapHuan();

  if (!snapshot.exists()) {
    if (tableBody)
      tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 15px; color: #999;">Chưa có dữ liệu tập huấn.</td></tr>`;
    return;
  }

  const sortedList = [];
  const listDashboard = [];
  let tongSoNguoi = 0;

  Object.keys(thongTinTapHuanLan2HienTai).forEach((key) => {
    const item = thongTinTapHuanLan2HienTai[key];
    if (item && item.ten_dang_bo && item.ten_dang_bo !== "undefined") {
      sortedList.push(item);
      tongSoNguoi += parseInt(item.so_nguoi_tham_gia || 0);
      listDashboard.push({
        ten: item.ten_dang_bo.replace("Đảng bộ ", ""),
        soNguoi: parseInt(item.so_nguoi_tham_gia || 0),
      });
    }
  });

  sortedList.sort((a, b) => (a.stt || 0) - (b.stt || 0));

  const thActions = document.getElementById("th-taphuan-actions");
  if (thActions) {
    thActions.style.display =
      currentRole === "admin" || currentRole === "edit" ? "table-cell" : "none";
  }

  let htmlContent = "";
  sortedList.forEach((item, index) => {
    const safeKey = cleanFirebaseKey(item.ten_dang_bo);
    const badgeStyle =
      item.so_nguoi_tham_gia > 0
        ? "background-color: #d4edda; color: #155724; padding: 4px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: bold;"
        : "background-color: #f8d7da; color: #721c24; padding: 4px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: bold;";

    let nutBamHanhDong = "";
    if (currentRole === "admin") {
      nutBamHanhDong = `
        <button class="btn-edit-taphuan" data-name="${item.ten_dang_bo}" data-count="${item.so_nguoi_tham_gia}" style="background:none; border:none; color:#003366; cursor:pointer; font-weight:bold; margin-right:8px;"><i class="fa-solid fa-pen-to-square"></i> Sửa</button>
        <button class="btn-delete-taphuan" data-key="${safeKey}" style="background:none; border:none; color:#dc3545; cursor:pointer; font-weight:bold;"><i class="fa-solid fa-trash"></i> Xóa</button>
      `;
    } else if (currentRole === "edit") {
      nutBamHanhDong = `
        <button class="btn-edit-taphuan" data-name="${item.ten_dang_bo}" data-count="${item.so_nguoi_tham_gia}" style="background:none; border:none; color:#003366; cursor:pointer; font-weight:bold; margin-right:8px;"><i class="fa-solid fa-pen-to-square"></i> Sửa</button>
      `;
    }

    htmlContent += `<tr style="border-bottom: 1px solid #dee2e6;">
        <td style="padding: 10px; border: 1px solid #dee2e6; text-align: center; color: #666;">${index + 1}</td>
        <td style="padding: 10px; border: 1px solid #dee2e6;"><strong>${item.ten_dang_bo}</strong></td>
        <td style="padding: 10px; border: 1px solid #dee2e6; text-align: center; font-weight: bold; color: #003366; font-size: 0.95rem;">${item.so_nguoi_tham_gia}</td>
        <td style="padding: 10px; border: 1px solid #dee2e6; text-align: center;"><span style="${badgeStyle}">${item.trang_thai}</span></td>
        ${
          currentRole === "admin" || currentRole === "edit"
            ? `<td style="padding: 10px; border: 1px solid #dee2e6; text-align: center;">${nutBamHanhDong}</td>`
            : ""
        }</tr>`;
  });

  if (htmlContent && tableBody) {
    htmlContent += `<tr style="background-color: #e6f2ff; font-weight: bold; border-top: 2px solid #003366;">
          <td colspan="2" style="padding: 12px; border: 1px solid #dee2e6; text-align: right; color: #003366; font-size: 0.95rem;">TỔNG SỐ NGƯỜI THAM GIA TẬP HUẤN TOÀN TỈNH:</td>
          <td style="padding: 12px; border: 1px solid #dee2e6; text-align: center; color: #dc3545; font-size: 1.1rem; font-weight: bold;">${tongSoNguoi.toLocaleString()}</td>
          <td colspan="${currentRole === "admin" || currentRole === "edit" ? 2 : 1}" style="border: 1px solid #dee2e6; background-color: #e6f2ff;"></td>
      </tr>`;
    tableBody.innerHTML = htmlContent;
  }

  document.querySelectorAll(".btn-edit-taphuan").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const name = e.currentTarget.getAttribute("data-name");
      const count = e.currentTarget.getAttribute("data-count");
      document.getElementById("edit-taphuan-name").value = name;
      document.getElementById("edit-taphuan-count").value = count;
      document.getElementById("form-edit-taphuan-container").style.display =
        "block";
    });
  });

  const dsCaoNhat = [...listDashboard]
    .sort((a, b) => b.soNguoi - a.soNguoi)
    .slice(0, 5);
  const ctxHigh = document.getElementById("chartTopHigh");
  if (ctxHigh && dsCaoNhat.length > 0) {
    if (window.myChartHigh) window.myChartHigh.destroy();
    window.myChartHigh = new Chart(ctxHigh, {
      type: "bar",
      data: {
        labels: dsCaoNhat.map((i) => i.ten),
        datasets: [
          {
            data: dsCaoNhat.map((i) => i.soNguoi),
            backgroundColor: "rgba(40, 167, 69, 0.2)",
            borderColor: "#28a745",
            borderWidth: 1.5,
            borderRadius: 4,
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { grid: { display: false } } },
      },
    });
  }

  const dsThapNhat = [...listDashboard]
    .sort((a, b) => a.soNguoi - b.soNguoi)
    .slice(0, 5);
  const ctxLow = document.getElementById("chartTopLow");
  if (ctxLow && dsThapNhat.length > 0) {
    if (window.myChartLow) window.myChartLow.destroy();
    window.myChartLow = new Chart(ctxLow, {
      type: "bar",
      data: {
        labels: dsThapNhat.map((i) => i.ten),
        datasets: [
          {
            data: dsThapNhat.map((i) => i.soNguoi),
            backgroundColor: "rgba(220, 53, 69, 0.2)",
            borderColor: "#dc3545",
            borderWidth: 1.5,
            borderRadius: 4,
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { grid: { display: false } } },
      },
    });
  }
});

document.body.addEventListener("click", (e) => {
  if (e.target.classList.contains("btn-delete-taphuan")) {
    if (currentRole !== "admin") return;
    const keyXoa = e.target.getAttribute("data-key");
    Swal.fire({
      title: "Xác nhận xóa?",
      text: "Số liệu tập huấn đơn vị này sẽ bị gỡ bỏ!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc3545",
      confirmButtonText: "Xóa",
    }).then((result) => {
      if (result.isConfirmed) remove(ref(database, "tap_huan_lan_2/" + keyXoa));
    });
  }
});

if (document.getElementById("btn-import-taphuan")) {
  document
    .getElementById("btn-import-taphuan")
    .addEventListener("click", () => {
      if (currentRole !== "admin") return;
      const fileInput = document.getElementById("excel-taphuan-input");
      const file = fileInput.files[0];
      if (!file) {
        showToast("Vui lòng chọn file Excel trước!", "warning");
        return;
      }
      const reader = new FileReader();
      reader.onload = function (e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        let importCount = 0;
        jsonData.forEach((row, index) => {
          let tenDangBo = "",
            soNguoi = 0,
            stt = index + 1;
          for (let key in row) {
            const lowerKey = key.toLowerCase().trim();
            if (lowerKey.includes("stt"))
              stt = row[key] ? parseInt(row[key]) : stt;
            else if (
              lowerKey.includes("đảng bộ") ||
              lowerKey.includes("dang bo")
            )
              tenDangBo = row[key] ? row[key].toString().trim() : "";
            else if (
              lowerKey.includes("số người") ||
              lowerKey.includes("so nguoi") ||
              lowerKey.includes("tham gia")
            )
              soNguoi = row[key] ? parseInt(row[key]) : 0;
          }
          if (tenDangBo && tenDangBo !== "undefined") {
            const databaseKey = cleanFirebaseKey(tenDangBo);
            set(ref(database, "tap_huan_lan_2/" + databaseKey), {
              stt: stt,
              ten_dang_bo: tenDangBo,
              so_nguoi_tham_gia: soNguoi,
              trang_thai: soNguoi > 0 ? "Đã tập huấn" : "Chưa tập huấn",
              ngay_cap_nhat: new Date().toISOString(),
            });
            importCount++;
          }
        });
        showToast(
          `Đã nạp thành công ${importCount} đơn vị từ Excel!`,
          "success",
        );
        fileInput.value = "";
      };
      reader.readAsArrayBuffer(file);
    });
}

if (document.getElementById("btn-cancel-edit-taphuan")) {
  document
    .getElementById("btn-cancel-edit-taphuan")
    .addEventListener("click", () => {
      document.getElementById("form-edit-taphuan-container").style.display =
        "none";
    });
}

if (document.getElementById("btn-save-edit-taphuan")) {
  document
    .getElementById("btn-save-edit-taphuan")
    .addEventListener("click", () => {
      if (currentRole !== "admin" && currentRole !== "edit") return;
      const tenDangBo = document.getElementById("edit-taphuan-name").value;
      const soNguoiMoi =
        parseInt(document.getElementById("edit-taphuan-count").value) || 0;
      if (!tenDangBo) return;

      const dbKey = cleanFirebaseKey(tenDangBo);
      get(ref(database, "tap_huan/" + dbKey + "/stt")).then((snapshot) => {
        const sttHienTai = snapshot.exists() ? snapshot.val() : 1;
        set(ref(database, "tap_huan_lan_2/" + dbKey), {
          stt: sttHienTai,
          ten_dang_bo: tenDangBo,
          so_nguoi_tham_gia: soNguoiMoi,
          trang_thai: soNguoiMoi > 0 ? "Đã tập huấn" : "Chưa tập huấn",
          ngay_cap_nhat: new Date().toISOString(),
        }).then(() => {
          showToast("Đã cập nhật số liệu thành công!", "success");
          document.getElementById("form-edit-taphuan-container").style.display =
            "none";
        });
      });
    });
}

// --- 6. QUẢN LÝ TIẾN ĐỘ BAN HÀNH KẾ HOẠCH CÔNG TÁC ---
function capNhatDropdownDangBoTabKeHoach() {
  const danhSachDaNopKeHoach = [];
  if (thongTinKeHoachHienTai) {
    Object.keys(thongTinKeHoachHienTai).forEach((key) => {
      if (
        thongTinKeHoachHienTai[key] &&
        thongTinKeHoachHienTai[key].ten_dang_bo
      ) {
        danhSachDaNopKeHoach.push(
          thongTinKeHoachHienTai[key].ten_dang_bo.trim().toLowerCase(),
        );
      }
    });
  }

  const dsChuaNop = danhSachDangBoGoc.filter(
    (tenDonVi) => !danhSachDaNopKeHoach.includes(tenDonVi.trim().toLowerCase()),
  );
  dsChuaNop.sort((a, b) => a.localeCompare(b, "vi"));

  initSearchableDropdown(
    "dropdown-kehoach-box",
    "kehoach-ten-dang-bo",
    "-- Gõ từ khóa để tìm Đảng bộ ban hành kế hoạch --",
    dsChuaNop,
  );
}

const formKeHoach = document.getElementById("form-ke-hoach");
if (formKeHoach) {
  formKeHoach.addEventListener("submit", (e) => {
    e.preventDefault();
    const tenDangBo = document.getElementById("kehoach-ten-dang-bo").value;
    const trangThaiKH = document.getElementById("kehoach-trang-thai").value;
    const soHieu =
      document.getElementById("kehoach-so-ky-hieu").value || "Không có";
    const ngayBanHanh =
      document.getElementById("kehoach-ngay-ban-hanh").value || "Chưa nhập";

    if (!tenDangBo) {
      showToast("Vui lòng tra cứu chọn Tên Đảng bộ trước khi lưu!", "warning");
      return;
    }

    set(
      ref(
        database,
        "ke_hoach/" + btoa(unescape(encodeURIComponent(tenDangBo))),
      ),
      {
        ten_dang_bo: tenDangBo,
        trang_thai: trangThaiKH === "Có ban hành" ? "co" : "khong",
        so_hieu: soHieu,
        ngay_ban_hanh: ngayBanHanh,
        thoi_gian_cap_nhat: new Date().toISOString(),
      },
    ).then(() => {
      showToast("Cập nhật dữ liệu kế hoạch thành công!", "success");
      formKeHoach.reset();
      document.getElementById("kehoach-ten-dang-bo").value = "";
      capNhatDropdownDangBoTabKeHoach();
      if (typeof window.handleTrangThaiKeHoachChange === "function")
        window.handleTrangThaiKeHoachChange();
    });
  });
}

function tinhToanThongKeKeHoach() {
  let countDaBanHanh = 0;
  let htmlDaBanHanh = "",
    htmlChuaBanHanh = "";

  const tongSoDonViGoc =
    danhSachDangBoGoc.length > 0 ? danhSachDangBoGoc.length : 94;

  if (thongTinKeHoachHienTai) {
    Object.keys(thongTinKeHoachHienTai).forEach((key) => {
      const item = thongTinKeHoachHienTai[key];
      if (item && item.trang_thai === "co") {
        countDaBanHanh++;
        htmlDaBanHanh += `<div class="data-item"><span><strong>${item.ten_dang_bo}</strong></span><span class="text-success">Số: ${item.so_hieu} (${formatDate(item.ngay_ban_hanh)})</span></div>`;
      }
    });
  }

  const countChuaBanHanh = Math.max(0, tongSoDonViGoc - countDaBanHanh);

  const danhSachTenDaBanHanh = Object.keys(thongTinKeHoachHienTai)
    .map((k) => thongTinKeHoachHienTai[k]?.ten_dang_bo?.trim().toLowerCase())
    .filter(Boolean);

  danhSachDangBoGoc.forEach((ten) => {
    if (!danhSachTenDaBanHanh.includes(ten.trim().toLowerCase())) {
      htmlChuaBanHanh += `<div class="data-item"><span><strong>${ten}</strong></span><span class="text-danger">Chưa ban hành</span></div>`;
    }
  });

  if (document.getElementById("count-da-ban-hanh"))
    document.getElementById("count-da-ban-hanh").innerText = countDaBanHanh;
  if (document.getElementById("count-chua-ban-hanh"))
    document.getElementById("count-chua-ban-hanh").innerText = countChuaBanHanh;
  if (document.getElementById("list-da-ban-hanh"))
    document.getElementById("list-da-ban-hanh").innerHTML =
      htmlDaBanHanh || '<span class="loading-text">Chưa có dữ liệu.</span>';
  if (document.getElementById("list-chua-ban-hanh"))
    document.getElementById("list-chua-ban-hanh").innerHTML =
      htmlChuaBanHanh ||
      '<span class="loading-text">Tất cả đơn vị đã ban hành.</span>';
}

const dbRefKeHoach = ref(database, "ke_hoach");
onValue(dbRefKeHoach, (snapshot) => {
  thongTinKeHoachHienTai = snapshot.val() || {};
  tinhToanThongKeKeHoach();
  capNhatDropdownDangBoTabKeHoach();
});

window.handleTrangThaiKeHoachChange = function () {
  const trangThai = document.getElementById("kehoach-trang-thai").value;
  const inputSoKyHieu = document.getElementById("kehoach-so-ky-hieu");
  const inputNgayBanHanh = document.getElementById("kehoach-ngay-ban-hanh");
  const btnHolder = document.getElementById("kehoach-btn-holder");

  if (!inputSoKyHieu || !inputNgayBanHanh || !btnHolder) return;

  if (trangThai === "Không ban hành") {
    inputSoKyHieu.disabled = true;
    inputNgayBanHanh.disabled = true;
    inputSoKyHieu.removeAttribute("required");
    inputNgayBanHanh.removeAttribute("required");
    inputSoKyHieu.value = "";
    inputNgayBanHanh.value = "";
    btnHolder.style.setProperty("display", "none", "important");
  } else {
    inputSoKyHieu.disabled = false;
    inputNgayBanHanh.disabled = false;
    inputSoKyHieu.setAttribute("required", "true");
    inputNgayBanHanh.setAttribute("required", "true");
    btnHolder.style.setProperty("display", "block", "important");
  }
};

window.showToast = function (message, iconType = "success") {
  Swal.fire({
    toast: true,
    position: "top-end",
    icon: iconType,
    title: message,
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.addEventListener("mouseenter", Swal.stopTimer);
      toast.addEventListener("mouseleave", Swal.resumeTimer);
    },
  });
};

// --- 7. QUẢN LÝ QUYỀN TÀI KHOẢN NGƯỜI DÙNG ---
const dbRefUsers = ref(database, "users");
onValue(dbRefUsers, (snapshot) => {
  const adminUserList = document.getElementById("admin-user-list");
  if (adminUserList) adminUserList.innerHTML = "";
  const data = snapshot.val();
  if (data && adminUserList) {
    Object.keys(data).forEach((uid) => {
      const u = data[uid];
      const itemDiv = document.createElement("div");
      itemDiv.className = "data-item";
      itemDiv.style.cssText =
        "display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px dashed #eee; align-items:center;";

      let hiểnThịVaiTrò = "Đơn vị cơ sở";
      if (u.role === "admin") hiểnThịVaiTrò = "Quản trị viên";
      if (u.role === "edit") hiểnThịVaiTrò = "Người biên tập (Edit)";

      itemDiv.innerHTML = `<div><strong>${hiểnThịVaiTrò}: ${u.email}</strong><br><small style="color:#6c757d; font-size:0.75rem;">UID: ${uid}</small></div>
        <div><button class="btn-edit-user" data-uid="${uid}" data-email="${u.email}" data-role="${u.role}" style="background:none; border:none; color:#003366; cursor:pointer; margin-right:10px;"><i class="fa-solid fa-user-pen"></i> Sửa</button>
        <button class="btn-delete-user" data-uid="${uid}" style="background:none; border:none; color:#dc3545; cursor:pointer;"><i class="fa-solid fa-user-minus"></i> Xóa</button></div>`;
      adminUserList.appendChild(itemDiv);
    });

    document.querySelectorAll(".btn-edit-user").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const b = e.currentTarget;
        document.getElementById("user-uid-input").value =
          b.getAttribute("data-uid");
        document.getElementById("user-uid-input").disabled = true;
        document.getElementById("user-email-input").value =
          b.getAttribute("data-email");
        document.getElementById("user-role-input").value =
          b.getAttribute("data-role");
        document.getElementById("btn-cancel-user-edit").style.display =
          "inline-block";
        document.getElementById("btn-submit-user").innerHTML =
          '<i class="fa-solid fa-user-check"></i> Cập Nhật';
      });
    });

    document.querySelectorAll(".btn-delete-user").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const uidXoa = e.currentTarget.getAttribute("data-uid");
        if (confirm("Xác nhận gỡ quyền tài khoản này?"))
          remove(ref(database, "users/" + uidXoa));
      });
    });
  }
});

if (document.getElementById("btn-cancel-user-edit")) {
  document
    .getElementById("btn-cancel-user-edit")
    .addEventListener("click", () => {
      document.getElementById("form-manage-user").reset();
      document.getElementById("user-uid-input").disabled = false;
      document.getElementById("btn-cancel-user-edit").style.display = "none";
      document.getElementById("btn-submit-user").innerHTML =
        '<i class="fa-solid fa-user-plus"></i> Lưu Tài Khoản';
    });
}

if (document.getElementById("form-manage-user")) {
  document
    .getElementById("form-manage-user")
    .addEventListener("submit", (e) => {
      e.preventDefault();
      if (currentRole !== "admin") return;
      const uid = document.getElementById("user-uid-input").value.trim();
      const email = document.getElementById("user-email-input").value.trim();
      const role = document.getElementById("user-role-input").value;
      if (!uid || !email) return;
      set(ref(database, "users/" + uid), { email: email, role: role }).then(
        () => {
          showToast("Cập nhật quyền tài khoản thành công!", "success");
          document.getElementById("form-manage-user").reset();
          document.getElementById("user-uid-input").disabled = false;
          if (document.getElementById("btn-cancel-user-edit"))
            document.getElementById("btn-cancel-user-edit").style.display =
              "none";
          document.getElementById("btn-submit-user").innerHTML =
            '<i class="fa-solid fa-user-plus"></i> Lưu Tài Khoản';
        },
      );
    });
}

// =======================================================================================
// --- 8. PHÂN HỆ: THU NỘP ĐẢNG PHÍ TRỰC TUYẾN & BỘ THỐNG KÊ NÂNG CAO DƯỚI X% XUẤT PDF ---
// =======================================================================================

// Hàm tự động tạo thanh điều khiển nhập số x% ngay trên bảng dữ liệu Đảng phí công tác
function khoiTaoKhungBoLocThongKeX() {
  const tableContainer =
    document
      .getElementById("table-dangphi-body")
      ?.closest(".table-responsive") ||
    document.querySelector(".table-responsive");
  if (!tableContainer || document.getElementById("container-filter-x-dangphi"))
    return;

  const wrapperFilterX = document.createElement("div");
  wrapperFilterX.id = "container-filter-x-dangphi";
  wrapperFilterX.style.cssText =
    "background:#f8fafc; border:1px solid #e2e8f0; padding:12px 15px; border-radius:6px; margin-bottom:15px; display:flex; align-items:center; gap:12px; flex-wrap:wrap;";

  wrapperFilterX.innerHTML = `
    <div style="font-size:0.9rem; font-weight:700; color:#334155; display:flex; align-items:center; gap:6px;">
      <i class="fa-solid fa-chart-line" style="color:#b71c1c;"></i> Thống kê nâng cao:
    </div>
    <div style="display:flex; align-items:center; gap:6px;">
      <span style="font-size:0.85rem; color:#475569;">Đơn vị nộp trực tuyến dưới:</span>
      <input type="text" id="input-filter-x-percent" placeholder="Nhập số..." style="width:80px; padding:6px 8px; border:1px solid #cbd5e1; border-radius:4px; text-align:center; font-weight:700; color:#b71c1c;">
      <span style="font-size:0.85rem; font-weight:700; color:#475569;">%</span>
    </div>
    <div style="display:flex; align-items:center; gap:8px;">
      <button id="btn-trigger-filter-x" style="padding:6px 14px; background-color:#003366; color:#ffffff; border:none; border-radius:4px; font-weight:700; cursor:pointer; font-size:0.8rem; display:flex; align-items:center; gap:4px;">
        <i class="fa-solid fa-filter"></i> Lọc dữ liệu
      </button>
      <button id="btn-reset-filter-x" style="padding:6px 12px; background-color:#64748b; color:#ffffff; border:none; border-radius:4px; font-weight:600; cursor:pointer; font-size:0.8rem;">
        Hủy lọc
      </button>
      <button id="btn-export-pdf-filter-x" style="padding:6px 14px; background-color:#b71c1c; color:#ffffff; border:none; border-radius:4px; font-weight:700; cursor:pointer; font-size:0.8rem; display:flex; align-items:center; gap:4px;">
        <i class="fa-solid fa-file-pdf"></i> Xuất PDF
      </button>
    </div>
  `;

  tableContainer.parentNode.insertBefore(wrapperFilterX, tableContainer);

  const txtInputX = document.getElementById("input-filter-x-percent");
  if (txtInputX) {
    txtInputX.addEventListener("input", function () {
      this.value = this.value.replace(/[^0-9]/g, "");
      if (this.value !== "" && parseInt(this.value) > 100) this.value = "100";
    });
  }

  document
    .getElementById("btn-trigger-filter-x")
    .addEventListener("click", () => {
      const txtInput = document.getElementById("input-filter-x-percent");
      const val = txtInput ? txtInput.value.trim() : "";
      if (val === "") {
        showToast("Vui lòng nhập tỷ lệ số phần trăm x cần lọc!", "warning");
        return;
      }
      filterXValue = parseInt(val);
      renderTableDangPhi();
      showToast(
        `Đã lọc danh sách đơn vị có tỷ lệ dưới ${filterXValue}%`,
        "success",
      );
    });

  document
    .getElementById("btn-reset-filter-x")
    .addEventListener("click", () => {
      const txtInput = document.getElementById("input-filter-x-percent");
      if (txtInput) txtInput.value = "";
      filterXValue = null;
      renderTableDangPhi();
    });

  document
    .getElementById("btn-export-pdf-filter-x")
    .addEventListener("click", xuLyXuatPdfTheoNguongX);
}

function capNhatDropdownDangBoChuaNopDangPhi() {
  const selectKyDP = document.getElementById("select-dangphi-ky");
  if (!selectKyDP) return;

  const kyDuocChon = selectKyDP.value;
  const danhSachGocChuan = [...new Set(danhSachDangBoGoc)].filter(
    (ten) => ten && ten !== "undefined",
  );

  const danhSachTenDaNopKyNay = [];
  Object.keys(thongTinDangPhiHienTai).forEach((key) => {
    const item = thongTinDangPhiHienTai[key];
    if (item && item.ky_bao_cao === kyDuocChon && item.ten_dang_bo) {
      danhSachTenDaNopKyNay.push(item.ten_dang_bo.trim().toLowerCase());
    }
  });

  const danhSachChuaNop = danhSachGocChuan.filter((tenDonVi) => {
    return !danhSachTenDaNopKyNay.includes(tenDonVi.trim().toLowerCase());
  });
  danhSachChuaNop.sort((a, b) => a.localeCompare(b, "vi"));

  initSearchableDropdown(
    "dropdown-dangphi-box",
    "select-dangphi-dangbo",
    "-- Gõ từ khóa để tìm đơn vị nộp đảng phí --",
    danhSachChuaNop,
  );
}

if (document.getElementById("select-dangphi-ky")) {
  document
    .getElementById("select-dangphi-ky")
    .addEventListener("change", () => {
      capNhatDropdownDangBoChuaNopDangPhi();
    });
}

if (document.getElementById("form-dangphi-new")) {
  document
    .getElementById("form-dangphi-new")
    .addEventListener("submit", (e) => {
      e.preventDefault();
      const selectKy = document.getElementById("select-dangphi-ky");
      const selectDangBo = document.getElementById("select-dangphi-dangbo");
      const inputTong = document.getElementById("input-dangphi-tong");
      const inputTrucTuyen = document.getElementById("input-dangphi-tructuyen");

      const kyBaoCao = selectKy.value;
      const tenDangBo = selectDangBo.value;
      const tongDV = parseInt(inputTong.value) || 0;
      const trucTuyenDV = parseInt(inputTrucTuyen.value) || 0;

      if (!tenDangBo) {
        showToast(
          "Vui lòng tra cứu chọn Đảng bộ đơn vị cần báo cáo!",
          "warning",
        );
        return;
      }
      if (trucTuyenDV > tongDV) {
        showToast(
          "Số đảng viên nộp trực tuyến không thể lớn hơn Tổng số đảng viên!",
          "warning",
        );
        return;
      }

      const dbKey = cleanFirebaseKey(`${tenDangBo}_${kyBaoCao}`);

      set(ref(database, "dang_phi/" + dbKey), {
        ky_bao_cao: kyBaoCao,
        ten_dang_bo: tenDangBo,
        tong_dang_vien: tongDV,
        nop_truc_tuyen: trucTuyenDV,
        ngay_nop: new Date().toISOString(),
      }).then(() => {
        showToast(
          `Đã lưu báo cáo đảng phí ${kyBaoCao} cho ${tenDangBo}!`,
          "success",
        );
        inputTong.value = "";
        inputTrucTuyen.value = "";

        const containerDropdown = document.getElementById(
          "dropdown-dangphi-box",
        );
        if (containerDropdown) {
          const selectedText =
            containerDropdown.querySelector(".selected-text");
          if (selectedText) {
            selectedText.innerText =
              "-- Gõ từ khóa để tìm đơn vị nộp đảng phí --";
            selectedText.style.color = "#666";
            selectedText.style.fontWeight = "normal";
          }
        }
        document.getElementById("select-dangphi-dangbo").value = "";
        capNhatDropdownDangBoChuaNopDangPhi();
      });
    });
}

const dbRefDangPhi = ref(database, "dang_phi");
onValue(dbRefDangPhi, (snapshot) => {
  thongTinDangPhiHienTai = snapshot.val() || {};
  capNhatDropdownDangBoChuaNopDangPhi();
  renderTableDangPhi();

  tinhToanVaVeDashboardTongQuan();
  thuThiTraCuuDangPhiSidebar();
});

if (document.getElementById("filter-dangphi-ky")) {
  document
    .getElementById("filter-dangphi-ky")
    .addEventListener("change", renderTableDangPhi);
}

function renderTableDangPhi() {
  const tableBody = document.getElementById("table-dangphi-body");
  const filterElement = document.getElementById("filter-dangphi-ky");
  if (!tableBody || !filterElement) return;
  const filterValue = filterElement.value;

  if (Object.keys(thongTinDangPhiHienTai).length === 0) {
    tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 15px; color: #999;">Chưa có dữ liệu báo cáo đảng phí.</td></tr>`;
    return;
  }

  const thActions = document.getElementById("th-dangphi-actions");
  if (thActions)
    thActions.style.setProperty("display", "table-cell", "important");

  let htmlContent = "";
  let indexSTT = 1;

  Object.keys(thongTinDangPhiHienTai).forEach((key) => {
    const item = thongTinDangPhiHienTai[key];
    if (item && item.ten_dang_bo) {
      if (item.ky_bao_cao !== filterValue) return;

      const tong = parseInt(item.tong_dang_vien || 0);
      const trucTuyen = parseInt(item.nop_truc_tuyen || 0);
      const tyLe =
        tong > 0 ? parseFloat(((trucTuyen / tong) * 100).toFixed(1)) : 0;

      // THỰC THI BỘ LỌC ĐỘNG X% NẾU CÓ DỮ LIỆU ĐẦU VÀO
      if (filterXValue !== null && tyLe >= filterXValue) return;

      let colHanhDong = "";
      if (currentRole === "admin") {
        colHanhDong = `
          <button class="btn-edit-dangphi" data-name="${item.ten_dang_bo}" data-tong="${tong}" data-tructuyen="${trucTuyen}" style="background:none; border:none; color:#003366; cursor:pointer; font-weight:bold; margin-right:8px;"><i class="fa-solid fa-pen-to-square"></i> Sửa</button>
          <button class="btn-delete-dangphi" data-key="${key}" style="background:none; border:none; color:#dc3545; cursor:pointer; font-weight:bold;"><i class="fa-solid fa-trash"></i> Xóa</button>
        `;
      } else if (currentRole === "edit" || currentRole === "user") {
        if (currentRole === "edit") {
          colHanhDong = `
            <button class="btn-edit-dangphi" data-name="${item.ten_dang_bo}" data-tong="${tong}" data-tructuyen="${trucTuyen}" style="background:none; border:none; color:#003366; cursor:pointer; font-weight:bold; margin-right:8px;"><i class="fa-solid fa-pen-to-square"></i> Sửa</button>
          `;
        } else {
          colHanhDong = `<span style="color:#64748b; font-size:0.8rem; font-weight:600;"><i class="fa-solid fa-circle-check text-success"></i> Đã ghi sổ</span>`;
        }
      }

      htmlContent += `<tr style="border-bottom: 1px solid #dee2e6;">
          <td style="padding: 10px; border: 1px solid #dee2e6; text-align: center; color: #666; white-space: nowrap;">${indexSTT++}</td>
          <td style="padding: 10px; border: 1px solid #dee2e6; text-align: center; font-weight: bold; color: #003366; white-space: nowrap;">${item.ky_bao_cao}</td>
          <td style="padding: 10px; border: 1px solid #dee2e6; text-align: left;"><strong>${item.ten_dang_bo}</strong></td>
          <td style="padding: 10px; border: 1px solid #dee2e6; text-align: center; font-weight: bold; white-space: nowrap;">${tong.toLocaleString()}</td>
          <td style="padding: 10px; border: 1px solid #dee2e6; text-align: center; font-weight: bold; color: #28a745; white-space: nowrap;">${trucTuyen.toLocaleString()}</td>
          <td style="padding: 10px; border: 1px solid #dee2e6; text-align: center; font-weight: bold; color: #dc3545; white-space: nowrap;">${tyLe}%</td>
          <td style="padding: 10px; border: 1px solid #dee2e6; text-align: center; white-space: nowrap;">${colHanhDong}</td>
        </tr>`;
    }
  });

  tableBody.innerHTML =
    htmlContent ||
    `<tr><td colspan="7" style="text-align: center; padding: 15px; color: #999;">Không có đơn vị nào có tiến độ dưới ngưỡng thiết lập.</td></tr>`;

  document.querySelectorAll(".btn-edit-dangphi").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const tenDonVi = e.currentTarget.getAttribute("data-name");
      const tongDV = e.currentTarget.getAttribute("data-tong");
      const trucTuyenDV = e.currentTarget.getAttribute("data-tructuyen");

      const containerDropdown = document.getElementById("dropdown-dangphi-box");
      if (containerDropdown) {
        const selectedText = containerDropdown.querySelector(".selected-text");
        if (selectedText) {
          selectedText.innerText = tenDonVi;
          selectedText.style.color = "#333";
          selectedText.style.fontWeight = "600";
        }
      }

      document.getElementById("select-dangphi-dangbo").value = tenDonVi;
      document.getElementById("input-dangphi-tong").value = tongDV;
      document.getElementById("input-dangphi-tructuyen").value = trucTuyenDV;

      document
        .getElementById("form-dangphi-new")
        .scrollIntoView({ behavior: "smooth" });
    });
  });
}

// Hàm kết xuất tệp PDF hành chính danh sách đơn vị yếu kém dưới x%

function napDanhSachLookupSidebarTraCuu() {
  const dsGocSapXep = [...new Set(danhSachDangBoGoc)].sort((a, b) =>
    a.localeCompare(b, "vi"),
  );

  initSearchableDropdown(
    "dropdown-lookup-sidebar-box",
    "lookup-dangphi-dangbo",
    "-- Gõ từ khóa tìm đơn vị... --",
    dsGocSapXep,
  );

  const selectKy = document.getElementById("lookup-dangphi-ky");
  if (selectKy) {
    selectKy.removeEventListener("change", xuLyKhiThayDoiKyDashboard);
    selectKy.addEventListener("change", xuLyKhiThayDoiKyDashboard);
  }
}

function xuLyKhiThayDoiKyDashboard() {
  tinhToanVaVeDashboardTongQuan();
  thuThiTraCuuDangPhiSidebar();
}

function tinhToanVaVeDashboardTongQuan() {
  const kyDuocChon = document.getElementById("lookup-dangphi-ky")?.value;
  const statsContainer = document.getElementById("tongquan-dangphi-stats");
  const chartHolder = document.getElementById("chart-dangphi-holder");

  if (!kyDuocChon || !thongTinDangPhiHienTai) return;

  if (chartHolder) {
    chartHolder.style.setProperty("display", "block", "important");
  }

  let tongDangVienToanTinh = 0;
  let tongNopTrucTuyenToanTinh = 0;
  let soDonViDaNhapLieu = 0;
  const danhSachTenDaBaoCao = [];

  Object.keys(thongTinDangPhiHienTai).forEach((key) => {
    const item = thongTinDangPhiHienTai[key];
    if (item && item.ky_bao_cao === kyDuocChon) {
      const dv = parseInt(item.tong_dang_vien || 0);
      const nop = parseInt(item.nop_truc_tuyen || 0);

      if (item.ten_dang_bo) {
        danhSachTenDaBaoCao.push(item.ten_dang_bo.trim().toLowerCase());
      }

      if (dv > 0) {
        tongDangVienToanTinh += dv;
        tongNopTrucTuyenToanTinh += nop;
        soDonViDaNhapLieu++;
      }
    }
  });

  const danhSachChuaBaoCaoKyNay = danhSachDangBoGoc.filter((tenDonVi) => {
    return !danhSachTenDaBaoCao.includes(tenDonVi.trim().toLowerCase());
  });
  danhSachChuaBaoCaoKyNay.sort((a, b) => a.localeCompare(b, "vi"));

  const tongChuaNopToanTinh = tongDangVienToanTinh - tongNopTrucTuyenToanTinh;
  const tyLeNop =
    tongDangVienToanTinh > 0
      ? parseFloat(
          ((tongNopTrucTuyenToanTinh / tongDangVienToanTinh) * 100).toFixed(1),
        )
      : 0;
  const tyLeChua =
    tongDangVienToanTinh > 0
      ? parseFloat(
          ((tongChuaNopToanTinh / tongDangVienToanTinh) * 100).toFixed(1),
        )
      : 0;

  if (statsContainer) {
    statsContainer.innerHTML = `
      <div style="margin-bottom:4px;">Kỳ báo cáo: <strong style="color:#b71c1c;">${kyDuocChon}</strong></div>
      <div style="margin-bottom:4px;">Số đảng bộ đã nhập dữ liệu: <strong>${soDonViDaNhapLieu} Đơn vị</strong></div>
      <div style="margin-bottom:4px;">Tổng số đảng viên: <strong style="color:#0f172a;">${tongDangVienToanTinh.toLocaleString()}</strong></div>
      <div style="margin-bottom:4px; color:#16a34a;">Đã nộp trực tuyến: <strong>${tongNopTrucTuyenToanTinh.toLocaleString()} (${tyLeNop}%)</strong></div>
      <div style="margin-bottom:8px; color:#dc2626;">Chưa nộp trực tuyến: <strong>${tongChuaNopToanTinh.toLocaleString()} (${tyLeChua}%)</strong></div>
      
      <button id="btn-show-unreported-dangphi" style="width:100%; padding:8px 10px; background-color:#b71c1c; color:#ffffff; border:none; border-radius:4px; font-weight:700; cursor:pointer; font-size:0.8rem; display:flex; align-items:center; justify-content:center; gap:6px; box-shadow:0 2px 4px rgba(0,0,0,0.1); margin-top:8px;">
        <i class="fa-solid fa-clipboard-list"></i> 📋 Xem các đơn vị chưa báo cáo trong kỳ (${danhSachChuaBaoCaoKyNay.length})
      </button>
    `;

    if (btnShowUnreported) {
      btnShowUnreported.addEventListener("click", () => {
        if (danhSachChuaBaoCaoKyNay.length === 0) {
          Swal.fire({
            title: "HOÀN THÀNH BÁO CÁO",
            text: `Tất cả ${danhSachDangBoGoc.length} đơn vị cơ sở đã nộp đủ báo cáo đảng phí trong ${kyDuocChon}!`,
            icon: "success",
            confirmButtonColor: "#003366",
            confirmButtonText: "Đóng",
          });
          return;
        }

        danhSachChuaBaoCaoKyNay.forEach((ten, idx) => {
          listHtml += `<div style="padding: 8px 0; border-bottom: 1px dashed #e2e8f0; font-size: 0.9rem; color: #334155; display: flex; gap: 6px;">
            <strong style="color: #b71c1c;">${idx + 1}.</strong> <span>${ten}</span>
          </div>`;
        });
        listHtml += `</div>`;

        Swal.fire({
          title: `<span style="font-size:1.15rem; color:#b71c1c; font-weight:800; text-transform:uppercase;">Đơn Vị Chưa Báo Cáo ${kyDuocChon}</span>`,
          html: `
            <div style="font-size:0.85rem; color:#475569; margin-bottom:12px; text-align:left;">
              Phát hiện hệ thống có <strong>${danhSachChuaBaoCaoKyNay.length} / ${danhSachDangBoGoc.length}</strong> đơn vị chưa ghi sổ số liệu:
            </div>
            ${listHtml}
            <button id="btn-export-pdf-unreported" style="width:100%; padding:10px; background-color:#b71c1c; color:#ffffff; border:none; border-radius:4px; font-weight:700; cursor:pointer; font-size:0.85rem; display:flex; align-items:center; justify-content:center; gap:6px; box-shadow:0 2px 4px rgba(0,0,0,0.1);">
              <i class="fa-solid fa-file-pdf"></i> XUẤT FILE PDF DANH SÁCH NÀY
            </button>
          `,
          showConfirmButton: true,
          confirmButtonColor: "#003366",
          confirmButtonText: "Đóng cửa sổ",
        });
      });
    }
  }
  const ctxTron = document.getElementById("chartDangPhiTron");
  if (ctxTron) {
    if (window.myChartDangPhiTron) window.myChartDangPhiTron.destroy();

    if (tongDangVienToanTinh === 0) {
      window.myChartDangPhiTron = new Chart(ctxTron, {
        type: "doughnut",
        data: {
          labels: ["Chưa có dữ liệu kỳ này"],
          datasets: [{ data: [1], backgroundColor: ["#e2e8f0"] }],
        },
        options: { responsive: true, maintainAspectRatio: false },
      });
      return;
    }

    window.myChartDangPhiTron = new Chart(ctxTron, {
      type: "doughnut",
      data: {
        labels: ["Đã nộp trực tuyến (%)", "Chưa nộp trực tuyến (%)"],
        datasets: [
          {
            data: [tyLeNop, tyLeChua],
            backgroundColor: ["#16a34a", "#dc2626"],
            borderColor: "#ffffff",
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              boxWidth: 12,
              font: { size: 11, weight: "bold" },
              padding: 10,
            },
          },
        },
      },
    });
  }
}

function thuThiTraCuuDangPhiSidebar() {
  const selectDangBo = document.getElementById("lookup-dangphi-dangbo");
  const selectKy = document.getElementById("lookup-dangphi-ky");
  const resultContainer = document.getElementById("lookup-dangphi-result");

  if (!selectDangBo || !selectKy || !resultContainer) return;

  const dangBoDuocChon = selectDangBo.value;
  const kyDuocChon = selectKy.value;

  if (!dangBoDuocChon) {
    resultContainer.innerHTML = `<div style="text-align: center; padding: 15px; color: #94a3b8; font-style: italic; font-size: 0.85rem;">Vui lòng chọn đơn vị để xem dữ liệu phân tích.</div>`;
    return;
  }

  let banGhiKhop = null;
  Object.keys(thongTinDangPhiHienTai).forEach((key) => {
    const item = thongTinDangPhiHienTai[key];
    if (
      item &&
      item.ten_dang_bo === dangBoDuocChon &&
      item.ky_bao_cao === kyDuocChon
    ) {
      banGhiKhop = item;
    }
  });

  if (!banGhiKhop) {
    resultContainer.innerHTML = `<div style="border-left: 4px solid #ef4444; background: #fef2f2; padding: 12px; border-radius: 4px; font-size: 0.85rem; color: #991b1b; font-weight: 500;"><i class="fa-solid fa-circle-exclamation"></i> <strong>${dangBoDuocChon}</strong> chưa nhập số liệu báo cáo của <strong>${kyDuocChon}</strong>.</div>`;
    return;
  }

  const tongDV = parseInt(banGhiKhop.tong_dang_vien || 0);
  const nopTT = parseInt(banGhiKhop.nop_truc_tuyen || 0);
  const chuaNopTT = tongDV - nopTT;

  const tyLeNopTT = tongDV > 0 ? ((nopTT / tongDV) * 100).toFixed(1) : "0.0";
  const tyLeChuaNopTT =
    tongDV > 0 ? ((chuaNopTT / tongDV) * 100).toFixed(1) : "0.0";

  resultContainer.innerHTML = `<div style="display: flex; flex-direction: column; gap: 10px; margin-top: 10px;">
      <div style="font-size: 0.85rem; background: #e6f2ff; padding: 8px 10px; border-radius: 4px; border: 1px solid #cbd5e1; font-weight: 600; color: #002855;">Đơn vị: <span style="color: #b71c1c;">${banGhiKhop.ten_dang_bo}</span></div>
      <div style="background: #ffffff; border: 1px solid #dee2e6; padding: 8px 10px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center;"><span style="font-size: 0.8rem; font-weight: bold; color: #475569;"><i class="fa-users fa-solid text-primary"></i> Tổng số đảng viên:</span><span style="font-size: 1rem; font-weight: 800; color: #002855;">${tongDV.toLocaleString()}</span></div>
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 8px 10px; border-radius: 4px; display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: bold; color: #166534;"><span><i class="fa-solid fa-circle-check"></i> Đã nộp trực tuyến:</span><span>${nopTT.toLocaleString()} ĐV (${tyLeNopTT}%)</span></div>
      <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 8px 10px; border-radius: 4px; display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: bold; color: #991b1b;"><span><i class="fa-solid fa-circle-xmark"></i> Chưa nộp trực tuyến:</span><span>${chuaNopTT.toLocaleString()} ĐV (${tyLeChuaNopTT}%)</span></div>
    </div>`;
}

document.addEventListener("DOMContentLoaded", () => {
  const lDangBo = document.getElementById("lookup-dangphi-dangbo");
  const lKy = document.getElementById("lookup-dangphi-ky");
  if (lDangBo) lDangBo.addEventListener("change", thuThiTraCuuDangPhiSidebar);
  if (lKy) lKy.addEventListener("change", thuThiTraCuuDangPhiSidebar);
});
