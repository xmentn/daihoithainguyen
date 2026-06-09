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

let currentRole = "user";
let danhSachDangBoGoc = [];
let thongTinTapHuanHienTai = {};

if (typeof window.myChartHigh === "undefined") window.myChartHigh = null;
if (typeof window.myChartLow === "undefined") window.myChartLow = null;

// --- 1. XÁC THỰC TRẠNG THÁI & PHÂN QUYỀN ---
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
  } else {
    document.getElementById("current-user").innerText = user.email;
    currentRole = sessionStorage.getItem("userRole") || "user";

    if (currentRole === "admin") {
      document.getElementById("current-role").innerText =
        "Quản trị viên (Admin)";
      document.getElementById("nav-admin-only").style.display = "block";
      document.getElementById("btn-save-kehoach").style.display = "block";
      if (document.getElementById("upload-taphuan-container"))
        document.getElementById("upload-taphuan-container").style.display =
          "block";
    } else {
      document.getElementById("current-role").innerText =
        "Người dùng (Xem báo cáo)";
      document.getElementById("nav-admin-only").style.display = "none";
      document.getElementById("btn-save-kehoach").style.display = "none";
      if (document.getElementById("upload-taphuan-container"))
        document.getElementById("upload-taphuan-container").style.display =
          "none";
      document
        .querySelectorAll("#form-ke-hoach input, #form-ke-hoach select")
        .forEach((elem) => (elem.disabled = true));
    }
  }
});
// ========================================================
// --- CƠ CHẾ TỰ ĐỘNG ĐĂNG XUẤT SAU 15 PHÚT KHÔNG SỬ DỤNG ---
// ========================================================
const THOI_GIAN_CHO_PHUT = 15; // Anh có thể sửa số 15 này thành số phút anh muốn (ví dụ: 5, 10, 30)
const THOI_GIAN_CHO_MS = THOI_GIAN_CHO_PHUT * 60 * 1000;

// Hàm cập nhật mốc thời gian tương tác cuối cùng của người dùng
function capNhatThoiGianTuongTacCuoi() {
  localStorage.setItem("lastActivityTime", Date.now().toString());
}

// Hàm kiểm tra xem người dùng đã "bỏ quên" trang web quá lâu chưa
function kiemTraThoiGianBaoQuen() {
  const lastActivity = localStorage.getItem("lastActivityTime");

  if (lastActivity) {
    const thoiGianDaQua = Date.now() - parseInt(lastActivity);

    // Nếu thời gian không sử dụng vượt quá mức cho phép
    if (thoiGianDaQua >= THOI_GIAN_CHO_MS) {
      clearInterval(window.intervalKiemTraPhiens); // Xóa đồng hồ đếm ngầm
      localStorage.removeItem("lastActivityTime");
      sessionStorage.clear();

      // Hiển thị thông báo cưỡng chế đăng xuất bằng SweetAlert2
      Swal.fire({
        icon: "warning",
        title: "HẾT PHIÊN LÀM VIỆC",
        text: `Tài khoản tự động đăng xuất do đã quá ${THOI_GIAN_CHO_PHUT} phút bạn không tương tác với hệ thống!`,
        confirmButtonColor: "#003366",
        confirmButtonText: "Đăng nhập lại",
        allowOutsideClick: false, // Không cho bấm ra ngoài để trốn thông báo
      }).then(() => {
        signOut(auth).then(() => {
          window.location.href = "login.html";
        });
      });
    }
  }
}

// KÍCH HOẠT THEO DÕI KHI NGƯỜI DÙNG ĐÃ ĐĂNG NHẬP HỢP LỆ
onAuthStateChanged(auth, (user) => {
  if (user) {
    // 1. Khởi tạo mốc thời gian ngay khi vừa tải trang
    capNhatThoiGianTuongTacCuoi();

    // 2. Lắng nghe các hành động tương tác phổ biến trên trình duyệt
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

    // 3. Thiết lập đồng hồ chạy ngầm kiểm tra định kỳ cứ sau mỗi 30 giây (30000ms)
    if (window.intervalKiemTraPhiens)
      clearInterval(window.intervalKiemTraPhiens);
    window.intervalKiemTraPhiens = setInterval(kiemTraThoiGianBaoQuen, 30000);
  }
});
document.getElementById("btn-logout").addEventListener("click", () => {
  signOut(auth).then(() => {
    sessionStorage.clear();
    window.location.href = "login.html";
  });
});

// --- 2. ĐIỀU HƯỚNG TABS & HOÁN ĐỔI DASHBOARD ---
window.switchTab = function (evt, tabId) {
  const tabContents = document.getElementsByClassName("tab-content");
  for (let content of tabContents) content.classList.remove("active");
  const tabBtns = document.getElementsByClassName("tab-btn");
  for (let btn of tabBtns) btn.classList.remove("active");

  document.getElementById(tabId).classList.add("active");
  evt.currentTarget.classList.add("active");

  const dashboardKeHoach = document.getElementById("sidebar-dashboard-kehoach");
  const dashboardTapHuan = document.getElementById("sidebar-dashboard-taphuan");

  if (dashboardKeHoach && dashboardTapHuan) {
    if (tabId === "tab-tap-huan") {
      dashboardKeHoach.style.display = "none";
      dashboardTapHuan.style.display = "block";
    } else {
      dashboardKeHoach.style.display = "block";
      dashboardTapHuan.style.display = "none";
    }
  }
};

// --- 3. QUẢN LÝ DANH MỤC ĐẢNG BỘ ĐƠN VỊ ---
const dbRefDangBoGoc = ref(database, "danhmuc_dangbo");
onValue(dbRefDangBoGoc, (snapshot) => {
  danhSachDangBoGoc = [];
  const selectDangBo = document.getElementById("ten-dang-bo");
  const adminDangBoList = document.getElementById("admin-dangbo-list");

  selectDangBo.innerHTML =
    '<option value="">-- Chọn đảng bộ trực thuộc --</option>';
  adminDangBoList.innerHTML = "";

  const data = snapshot.val();
  if (data) {
    Object.keys(data).forEach((key) => {
      const db = data[key];
      if (db.ten && db.ten !== "undefined" && db.ten.trim() !== "") {
        danhSachDangBoGoc.push(db.ten.trim());

        const option = document.createElement("option");
        option.value = db.ten;
        option.innerText = db.ten;
        selectDangBo.appendChild(option);

        const itemDiv = document.createElement("div");
        itemDiv.className = "data-item";
        itemDiv.style.cssText =
          "display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px dashed #eee;";
        itemDiv.innerHTML = `<span>${db.ten}</span>${currentRole === "admin" ? `<button class="btn-delete-dangbo" data-id="${key}" style="background:none; border:none; color:#dc3545; cursor:pointer;"><i class="fa-solid fa-trash-can"></i> Xóa</button>` : ""}`;
        adminDangBoList.appendChild(itemDiv);
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
  capNhatDropdownDangBoChuaTapHuan();
  // Đặt dòng này nằm dưới hàm capNhatDropdownDangBoChuaTapHuan(); ở nhánh danhmuc_dangbo gốc
  if (typeof capNhatDropdownDangBoChuaNopDangPhi === "function") {
    capNhatDropdownDangBoChuaNopDangPhi();
  }
});

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

// --- 4. HÀM LỌC DROPDOWN ĐẢNG BỘ CHƯA TẬP HUÂN (ĐẶT NGOÀI ONVALUE) ---
function capNhatDropdownDangBoChuaTapHuan() {
  const selectDropdown = document.getElementById("select-taphuan-dangbo");
  if (!selectDropdown) return;

  const danhSachGocChuan = [...new Set(danhSachDangBoGoc)].filter(
    (ten) => ten && ten !== "undefined",
  );
  const danhSachTenDaTapHuan = [];

  Object.keys(thongTinTapHuanHienTai).forEach((key) => {
    const item = thongTinTapHuanHienTai[key];
    if (item && item.ten_dang_bo && item.ten_dang_bo !== "undefined") {
      danhSachTenDaTapHuan.push(item.ten_dang_bo.trim().toLowerCase());
    }
  });

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

// Lắng nghe nút Lưu biểu mẫu nhập thủ công tập huấn
document.getElementById("form-taphuan-new").addEventListener("submit", (e) => {
  e.preventDefault();
  const selectDangBo = document.getElementById("select-taphuan-dangbo");
  const inputSoNguoi = document.getElementById("input-taphuan-songuoi");
  const tenDangBo = selectDangBo.value;
  const soNguoi = parseInt(inputSoNguoi.value) || 0;

  if (!tenDangBo) {
    showToast("Vui lòng chọn một Đảng bộ!", "warning");
    return;
  }

  const soDonViDaNhap = Object.keys(thongTinTapHuanHienTai).filter(
    (k) =>
      thongTinTapHuanHienTai[k].ten_dang_bo &&
      thongTinTapHuanHienTai[k].ten_dang_bo !== "undefined",
  ).length;
  const safeKey = tenDangBo.replace(/[^a-zA-Z0-9]/g, "_");

  set(ref(database, "tap_huan/" + safeKey), {
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

// --- 5. LẮNG NGHE NHÁNH TẬP HUÂN & VẼ BIỂU ĐỒ REALTIME ---
const dbRefTapHuan = ref(database, "tap_huan");
onValue(dbRefTapHuan, (snapshot) => {
  const tableBody = document.getElementById("table-taphuan-body");
  thongTinTapHuanHienTai = snapshot.val() || {};

  capNhatDropdownDangBoChuaTapHuan();

  if (!snapshot.exists()) {
    tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 15px; color: #999;">Chưa có dữ liệu tập huấn.</td></tr>`;
    return;
  }

  const sortedList = [];
  const listDashboard = [];
  let tongSoNguoi = 0;

  Object.keys(thongTinTapHuanHienTai).forEach((key) => {
    const item = thongTinTapHuanHienTai[key];
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
  if (thActions)
    thActions.style.display = currentRole === "admin" ? "table-cell" : "none";

  let htmlContent = "";
  sortedList.forEach((item, index) => {
    const safeKey = item.ten_dang_bo.replace(/[^a-zA-Z0-9]/g, "_");
    const badgeStyle =
      item.so_nguoi_tham_gia > 0
        ? "background-color: #d4edda; color: #155724; padding: 4px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: bold;"
        : "background-color: #f8d7da; color: #721c24; padding: 4px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: bold;";

    htmlContent += `<tr style="border-bottom: 1px solid #dee2e6;">
        <td style="padding: 10px; border: 1px solid #dee2e6; text-align: center; color: #666;">${index + 1}</td>
        <td style="padding: 10px; border: 1px solid #dee2e6;"><strong>${item.ten_dang_bo}</strong></td>
        <td style="padding: 10px; border: 1px solid #dee2e6; text-align: center; font-weight: bold; color: #003366; font-size: 0.95rem;">${item.so_nguoi_tham_gia}</td>
        <td style="padding: 10px; border: 1px solid #dee2e6; text-align: center;"><span style="${badgeStyle}">${item.trang_thai}</span></td>
        ${
          currentRole === "admin"
            ? `<td style="padding: 10px; border: 1px solid #dee2e6; text-align: center;">
            <button class="btn-edit-taphuan" data-name="${item.ten_dang_bo}" data-count="${item.so_nguoi_tham_gia}" style="background:none; border:none; color:#003366; cursor:pointer; font-weight:bold; margin-right:8px;"><i class="fa-solid fa-pen-to-square"></i> Sửa</button>
            <button class="btn-delete-taphuan" data-key="${safeKey}" style="background:none; border:none; color:#dc3545; cursor:pointer; font-weight:bold;"><i class="fa-solid fa-trash"></i> Xóa</button>
        </td>`
            : ""
        }</tr>`;
  });

  htmlContent += `<tr style="background-color: #e6f2ff; font-weight: bold; border-top: 2px solid #003366;">
        <td colspan="2" style="padding: 12px; border: 1px solid #dee2e6; text-align: right; color: #003366; font-size: 0.95rem;">TỔNG SỐ NGƯỜI THAM GIA TẬP HUẤN TOÀN TỈNH:</td>
        <td style="padding: 12px; border: 1px solid #dee2e6; text-align: center; color: #dc3545; font-size: 1.1rem; font-weight: bold;">${tongSoNguoi.toLocaleString()}</td>
        <td colspan="${currentRole === "admin" ? 2 : 1}" style="border: 1px solid #dee2e6; background-color: #e6f2ff;"></td>
    </tr>`;

  tableBody.innerHTML = htmlContent;

  // --- VẼ HOẶC CẬP NHẬT BIỂU ĐỒ CỘT NẰM NGANG ---
  const dsCaoNhat = [...listDashboard]
    .sort((a, b) => b.soNguoi - a.soNguoi)
    .slice(0, 5);
  const ctxHigh = document.getElementById("chartTopHigh");
  if (ctxHigh) {
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
  if (ctxLow) {
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

  // Khởi tạo sự kiện Xóa/Sửa cho Admin
  if (currentRole === "admin") {
    document.querySelectorAll(".btn-delete-taphuan").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const keyXoa = e.currentTarget.getAttribute("data-key");
        Swal.fire({
          title: "Xác nhận xóa?",
          text: "Số liệu tập huấn đơn vị này sẽ bị gỡ bỏ!",
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#003366",
          confirmButtonText: "Xóa",
        }).then((result) => {
          if (result.isConfirmed) remove(ref(database, "tap_huan/" + keyXoa));
        });
      });
    });

    document.querySelectorAll(".btn-edit-taphuan").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const btnEl = e.currentTarget;
        document.getElementById("edit-taphuan-name").value =
          btnEl.getAttribute("data-name");
        document.getElementById("edit-taphuan-count").value =
          btnEl.getAttribute("data-count");
        document.getElementById("form-edit-taphuan-container").style.display =
          "block";
      });
    });
  }
});

// Nạp file Excel tập huấn (Admin)
document.getElementById("btn-import-taphuan").addEventListener("click", () => {
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
        if (lowerKey.includes("stt")) stt = row[key] ? parseInt(row[key]) : stt;
        else if (lowerKey.includes("đảng bộ") || lowerKey.includes("dang bo"))
          tenDangBo = row[key] ? row[key].toString().trim() : "";
        else if (
          lowerKey.includes("số người") ||
          lowerKey.includes("so nguoi") ||
          lowerKey.includes("tham gia")
        )
          soNguoi = row[key] ? parseInt(row[key]) : 0;
      }
      if (tenDangBo && tenDangBo !== "undefined") {
        const databaseKey = tenDangBo.replace(/[^a-zA-Z0-9]/g, "_");
        set(ref(database, "tap_huan/" + databaseKey), {
          stt: stt,
          ten_dang_bo: tenDangBo,
          so_nguoi_tham_gia: soNguoi,
          trang_thai: soNguoi > 0 ? "Đã tập huấn" : "Chưa tập huấn",
          ngay_cap_nhat: new Date().toISOString(),
        });
        importCount++;
      }
    });
    showToast(`Đã nạp thành công ${importCount} đơn vị từ Excel!`, "success");
    fileInput.value = "";
  };
  reader.readAsArrayBuffer(file);
});

document
  .getElementById("btn-cancel-edit-taphuan")
  .addEventListener("click", () => {
    document.getElementById("form-edit-taphuan-container").style.display =
      "none";
  });
document
  .getElementById("btn-save-edit-taphuan")
  .addEventListener("click", () => {
    const tenDangBo = document.getElementById("edit-taphuan-name").value;
    const soNguoiMoi =
      parseInt(document.getElementById("edit-taphuan-count").value) || 0;
    if (!tenDangBo) return;

    const dbKey = tenDangBo.replace(/[^a-zA-Z0-9]/g, "_");
    get(ref(database, "tap_huan/" + dbKey + "/stt")).then((snapshot) => {
      const sttHienTai = snapshot.exists() ? snapshot.val() : 1;
      set(ref(database, "tap_huan/" + dbKey), {
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

// --- 6. PHẦN BỔ SUNG: QUẢN LÝ TÀI KHOẢN NGƯỜI DÙNG & TIẾN ĐỘ KẾ HOẠCH (GIỮ NGUYÊN) ---
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
      const roleBadge =
        u.role === "admin"
          ? '<span style="background:#fff3cd; color:#856404; padding:2px 6px; border-radius:3px; font-size:0.75rem; font-weight:bold;">Admin</span>'
          : '<span style="background:#e2e3e5; color:#383d41; padding:2px 6px; border-radius:3px; font-size:0.75rem;">User</span>';
      itemDiv.innerHTML = `<div><strong>${u.email}</strong> ${roleBadge}<br><small style="color:#6c757d; font-size:0.75rem;">UID: ${uid}</small></div>
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

document.getElementById("form-manage-user").addEventListener("submit", (e) => {
  e.preventDefault();
  if (currentRole !== "admin") return;
  const uid = document.getElementById("user-uid-input").value.trim();
  const email = document.getElementById("user-email-input").value.trim();
  const role = document.getElementById("user-role-input").value;
  if (!uid || !email) return;
  set(ref(database, "users/" + uid), { email: email, role: role }).then(() => {
    showToast("Cập nhật quyền tài khoản thành công!", "success");
    document.getElementById("form-manage-user").reset();
    document.getElementById("user-uid-input").disabled = false;
    if (document.getElementById("btn-cancel-user-edit"))
      document.getElementById("btn-cancel-user-edit").style.display = "none";
    document.getElementById("btn-submit-user").innerHTML =
      '<i class="fa-solid fa-user-plus"></i> Lưu Tài Khoản';
  });
});

const formKeHoach = document.getElementById("form-ke-hoach");
formKeHoach.addEventListener("submit", (e) => {
  e.preventDefault();
  if (currentRole !== "admin") return;
  const tenDangBo = document.getElementById("ten-dang-bo").value;
  const trangThaiKH = document.querySelector(
    'input[name="trang-thai-kh"]:checked',
  ).value;
  const soHieu = document.getElementById("so-hieu").value || "Không có";
  const ngayBanHanh =
    document.getElementById("ngay-ban-hanh").value || "Chưa nhập";
  set(
    ref(database, "ke_hoach/" + btoa(unescape(encodeURIComponent(tenDangBo)))),
    {
      ten_dang_bo: tenDangBo,
      trang_thai: trangThaiKH,
      so_hieu: soHieu,
      ngay_ban_hanh: ngayBanHanh,
      thoi_gian_cap_nhat: new Date().toISOString(),
    },
  ).then(() => {
    showToast("Cập nhật dữ liệu kế hoạch thành công!", "success");
    formKeHoach.reset();
  });
});

const dbRefKeHoach = ref(database, "ke_hoach");
onValue(dbRefKeHoach, (snapshot) => {
  const data = snapshot.val();
  let countDaBanHanh = 0,
    countChuaBanHanh = 0;
  let htmlDaBanHanh = "",
    htmlChuaBanHanh = "";
  if (data) {
    Object.keys(data).forEach((key) => {
      const item = data[key];
      if (item.trang_thai === "co") {
        countDaBanHanh++;
        htmlDaBanHanh += `<div class="data-item"><span><strong>${item.ten_dang_bo}</strong></span><span class="text-success">Số: ${item.so_hieu} (${formatDate(item.ngay_ban_hanh)})</span></div>`;
      } else {
        countChuaBanHanh++;
        htmlChuaBanHanh += `<div class="data-item"><span><strong>${item.ten_dang_bo}</strong></span><span class="text-danger">Chưa ban hành</span></div>`;
      }
    });
  }
  if (document.getElementById("count-da-ban-hanh"))
    document.getElementById("count-da-ban-hanh").innerText = countDaBanHanh;
  if (document.getElementById("count-chua-ban-hanh"))
    document.getElementById("count-chua-ban-hanh").innerText = countChuaBanHanh;
  if (document.getElementById("list-da-ban-hanh"))
    document.getElementById("list-da-ban-hanh").innerHTML =
      htmlDaBanHanh || '<span class="loading-text">Chưa có dữ liệu.</span>';
  if (document.getElementById("list-chua-ban-hanh"))
    document.getElementById("list-chua-ban-hanh").innerHTML =
      htmlChuaBanHanh || '<span class="loading-text">Chưa có dữ liệu.</span>';
});

function formatDate(dateString) {
  if (!dateString || dateString === "Chưa nhập") return "Chưa nhập";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

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
// ========================================================
// --- 7. QUẢN LÝ THỦ TỤC: THU NỘP ĐẢNG PHÍ TRỰC TUYẾN ---
// ========================================================
let thongTinDangPhiHienTai = {};

// Hàm lọc Dropdown Đảng bộ cho Đảng phí (Phụ thuộc vào Kỳ báo cáo được chọn)
function capNhatDropdownDangBoChuaNopDangPhi() {
  const selectDangBoDP = document.getElementById("select-dangphi-dangbo");
  const selectKyDP = document.getElementById("select-dangphi-ky");
  if (!selectDangBoDP || !selectKyDP) return;

  const kyDuocChon = selectKyDP.value;
  const danhSachGocChuan = [...new Set(danhSachDangBoGoc)].filter(
    (ten) => ten && ten !== "undefined",
  );

  // Lọc ra danh sách các đơn vị ĐÃ nộp báo cáo trong Kỳ này
  const danhSachTenDaNopKyNay = [];
  Object.keys(thongTinDangPhiHienTai).forEach((key) => {
    const item = thongTinDangPhiHienTai[key];
    if (item && item.ky_bao_cao === kyDuocChon && item.ten_dang_bo) {
      danhSachTenDaNopKyNay.push(item.ten_dang_bo.trim().toLowerCase());
    }
  });

  // Lấy phần bù: Đơn vị chưa nộp trong Kỳ này
  const danhSachChuaNop = danhSachGocChuan.filter((tenDonVi) => {
    return !danhSachTenDaNopKyNay.includes(tenDonVi.trim().toLowerCase());
  });

  danhSachChuaNop.sort((a, b) => a.localeCompare(b, "vi"));
  selectDangBoDP.innerHTML = "";

  if (danhSachChuaNop.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.innerText = `-- Tất cả đơn vị đã nạp báo cáo ${kyDuocChon} --`;
    selectDangBoDP.appendChild(option);
  } else {
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.innerText = `-- Chọn đơn vị (${danhSachChuaNop.length} đơn vị chưa báo cáo ${kyDuocChon}) --`;
    selectDangBoDP.appendChild(defaultOption);

    danhSachChuaNop.forEach((tenDonVi) => {
      const option = document.createElement("option");
      option.value = tenDonVi;
      option.innerText = tenDonVi;
      selectDangBoDP.appendChild(option);
    });
  }
}

// Bắt sự kiện thay đổi Kỳ báo cáo trên Form -> Tự động tính lại Dropdown đơn vị còn lại
document.getElementById("select-dangphi-ky").addEventListener("change", () => {
  capNhatDropdownDangBoChuaNopDangPhi();
});

// Xử lý gửi biểu mẫu nạp báo cáo Đảng phí trực tuyến
document.getElementById("form-dangphi-new").addEventListener("submit", (e) => {
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
    showToast("Vui lòng chọn Đảng bộ đơn vị cần báo cáo!", "warning");
    return;
  }
  if (trucTuyenDV > tongDV) {
    showToast(
      "Số đảng viên nộp trực tuyến không thể lớn hơn Tổng số đảng viên!",
      "warning",
    );
    return;
  }

  // Tạo khóa lưu trữ duy nhất kết hợp giữa Tên Đảng Bộ và Kỳ Báo Cáo
  const uniqueString = `${tenDangBo}_${kyBaoCao}`;
  const dbKey = uniqueString.replace(/[^a-zA-Z0-9]/g, "_");

  set(ref(database, "dang_phi/" + dbKey), {
    ky_bao_cao: kyBaoCao,
    ten_dang_bo: tenDangBo,
    tong_dang_vien: tongDV,
    nop_truc_tuyen: trucTuyenDV,
    ngay_nop: new Date().toISOString(),
  })
    .then(() => {
      showToast(
        `Đã lưu báo cáo đảng phí ${kyBaoCao} cho ${tenDangBo}!`,
        "success",
      );
      inputTong.value = "";
      inputTrucTuyen.value = "";
    })
    .catch((err) => {
      console.error(err);
      showToast("Lỗi đồng bộ cơ sở dữ liệu!", "error");
    });
});

// LẮNG NGHE REALTIME NHÁNH DANG_PHI VÀ HIỂN THỊ BẢNG
const dbRefDangPhi = ref(database, "dang_phi");
const filterKyDP = document.getElementById("filter-dangphi-ky");

onValue(dbRefDangPhi, (snapshot) => {
  thongTinDangPhiHienTai = snapshot.val() || {};

  // Đồng bộ lại Dropdown nhập liệu
  capNhatDropdownDangBoChuaNopDangPhi();
  renderTableDangPhi();
});

// Hàm lọc xem bảng theo kỳ
if (filterKyDP) {
  filterKyDP.addEventListener("change", () => {
    renderTableDangPhi();
  });
}

function renderTableDangPhi() {
  const tableBody = document.getElementById("table-dangphi-body");
  const filterValue = document.getElementById("filter-dangphi-ky").value;
  if (!tableBody) return;

  if (Object.keys(thongTinDangPhiHienTai).length === 0) {
    tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 15px; color: #999;">Chưa có dữ liệu báo cáo đảng phí.</td></tr>`;
    return;
  }

  // Ẩn hiện quyền Thao tác cột dựa trên quyền tài khoản
  const thActions = document.getElementById("th-dangphi-actions");
  if (thActions)
    thActions.style.display = currentRole === "admin" ? "table-cell" : "none";

  let htmlContent = "";
  let indexSTT = 1;

  Object.keys(thongTinDangPhiHienTai).forEach((key) => {
    const item = thongTinDangPhiHienTai[key];
    if (item && item.ten_dang_bo) {
      // Nếu bộ lọc khác "Tất cả", kiểm tra xem có khớp kỳ báo cáo không
      if (filterValue !== "Tất cả" && item.ky_bao_cao !== filterValue) {
        return;
      }

      const tong = parseInt(item.tong_dang_vien || 0);
      const trucTuyen = parseInt(item.nop_truc_tuyen || 0);
      const tyLe = tong > 0 ? ((trucTuyen / tong) * 100).toFixed(1) : "0.0";

      htmlContent += `
        <tr style="border-bottom: 1px solid #dee2e6;">
          <td style="padding: 10px; border: 1px solid #dee2e6; text-align: center; color: #666; white-space: nowrap;">${indexSTT++}</td>
          <td style="padding: 10px; border: 1px solid #dee2e6; text-align: center; font-weight: bold; color: #003366; white-space: nowrap;">${item.ky_bao_cao}</td>
          <td style="padding: 10px; border: 1px solid #dee2e6; text-align: left;"><strong>${item.ten_dang_bo}</strong></td>
          <td style="padding: 10px; border: 1px solid #dee2e6; text-align: center; font-weight: bold; white-space: nowrap;">${tong.toLocaleString()}</td>
          <td style="padding: 10px; border: 1px solid #dee2e6; text-align: center; font-weight: bold; color: #28a745; white-space: nowrap;">${trucTuyen.toLocaleString()}</td>
          <td style="padding: 10px; border: 1px solid #dee2e6; text-align: center; font-weight: bold; color: #dc3545; white-space: nowrap;">${tyLe}%</td>
          ${
            currentRole === "admin"
              ? `
          <td style="padding: 10px; border: 1px solid #dee2e6; text-align: center; white-space: nowrap;">
              <button class="btn-delete-dangphi" data-key="${key}" style="background:none; border:none; color:#dc3545; cursor:pointer; font-weight:bold;"><i class="fa-solid fa-trash"></i> Xóa</button>
          </td>`
              : ""
          }
        </tr>
      `;
    }
  });

  tableBody.innerHTML =
    htmlContent ||
    `<tr><td colspan="7" style="text-align: center; padding: 15px; color: #999;">Không có dữ liệu cho kỳ báo cáo này.</td></tr>`;

  // Đính kèm sự kiện xóa bản ghi dành riêng cho Admin
  if (currentRole === "admin") {
    document.querySelectorAll(".btn-delete-dangphi").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const keyXoa = e.currentTarget.getAttribute("data-key");
        Swal.fire({
          title: "Xác nhận xóa?",
          text: "Báo cáo nộp đảng phí của đơn vị này trong kỳ sẽ bị gỡ bỏ!",
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#003366",
          confirmButtonText: "Xóa",
        }).then((result) => {
          if (result.isConfirmed) {
            remove(ref(database, "dang_phi/" + keyXoa));
          }
        });
      });
    });
  }
}
