// Tham chiếu cơ sở dữ liệu Firebase
const dangBoRef = database.ref("dang_bo");
const tasksRefHome = database.ref("tasks");

// Lưu trữ đối tượng các Chart để hủy khi vẽ lại
let chartChinhLy, chartKySo, chartPhanMem, chartHoAnThanh;
let ageChartObj, admissionChartObj;
let knDoughnutChartInstance = null; // Biểu đồ vành khăn Kết nạp
let map;
let geojsonLayer;
let fullDataList = []; // Chứa toàn bộ bản ghi dữ liệu phục vụ bộ lọc/sắp xếp
let globalAgeData = [0, 0, 0, 0]; // Biến toàn cục lưu dữ liệu độ tuổi hiện tại
let homeTasksCache = []; // Mảng toàn cục lưu danh sách nhiệm vụ nội bộ
let isTasksListenerAttached = false; // Tránh gắn lặp listener Firebase cho nhánh tasks
let taskUnitDashboardData = []; // Thống kê nhiệm vụ theo từng cơ quan/đơn vị chủ trì
let taskUnitDashboardCharts = {
  best: null,
  attention: null,
  selected: null,
};

// =================================================================
// 1. KHỞI TẠO TẤT CẢ CÁC SỰ KIỆN KHI TRANG TẢI XONG
// =================================================================
document.addEventListener("DOMContentLoaded", () => {
  initMap();
  loadDangBoList();
  fetchStatistics();
  initTcHomeSubTabs(); // Khởi tạo tab phụ ở Phân hệ 2
  initTabSwitchers(); // Khởi tạo tab chính toàn trang
  initLogoutEvents(); // Khởi tạo sự kiện đăng xuất

  // Xử lý sự kiện thay đổi đơn vị trên dropdown bộ lọc
  const selectDangBo = document.getElementById("select-dangbo");
  if (selectDangBo) {
    selectDangBo.addEventListener("change", (e) => {
      fetchStatistics(e.target.value);
    });
  }

  // Sự kiện làm mới dữ liệu
  const btnReload = document.getElementById("btn-reload-data");
  if (btnReload) {
    btnReload.addEventListener("click", () => {
      fetchStatistics(document.getElementById("select-dangbo").value);
      Swal.fire({
        icon: "success",
        title: "Đã cập nhật",
        text: "Số liệu hệ thống vừa được tải lại thời gian thực.",
        timer: 1200,
        showConfirmButton: false,
      });
    });
  }

  // Lắng nghe sự kiện tìm kiếm trên bảng Số hóa
  const tableSearch = document.getElementById("table-search");
  if (tableSearch) {
    tableSearch.addEventListener("input", (e) => {
      renderTable(e.target.value);
    });
  }

  // MỚI: Lắng nghe sự kiện tìm kiếm trên bảng Nhiệm vụ nội bộ
  const taskSearch =
    document.getElementById("public-task-search") ||
    document.getElementById("task-search");
  if (taskSearch) {
    taskSearch.addEventListener("input", () => {
      renderTasksTable();
    });
  }

  // Dashboard nhiệm vụ theo đơn vị: đổi đơn vị được lựa chọn
  const taskUnitDashboardSelect = document.getElementById(
    "task-unit-dashboard-select",
  );
  if (taskUnitDashboardSelect) {
    taskUnitDashboardSelect.addEventListener("change", () => {
      renderSelectedTaskUnitDashboard();
    });
  }
});

// LOGIC CHUYỂN TAB PHỤ (1. Số liệu chung - 2. Kết nạp đảng viên)
function initTcHomeSubTabs() {
  const btns = document.querySelectorAll(".sub-tc-home-btn");
  const contents = document.querySelectorAll(".tc-home-tab-content");

  btns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-tc-home-tab");

      btns.forEach((b) => {
        b.classList.remove("active");
        b.style.borderBottomColor = "transparent";
        b.style.color = "#64748b";
      });

      btn.classList.add("active");
      btn.style.borderBottomColor = "#16a34a";
      btn.style.color = "#16a34a";

      contents.forEach((c) => {
        if (c.id === target) {
          c.style.display = "block";
        } else {
          c.style.display = "none";
        }
      });
    });
  });
}

// KHỞI TẠO CHUYỂN TAB CHÍNH TOÀN TRANG
function initTabSwitchers() {
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetTab = btn.getAttribute("data-tab");

      if (targetTab === "tab-quan-ly-noi-bo" && !canAccessHomeNoiBo()) {
        return;
      }

      tabBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      tabContents.forEach((content) => {
        if (content.id === targetTab) {
          content.classList.add("active");
        } else {
          content.classList.remove("active");
        }
      });

      if (targetTab === "tab-so-hoa" && map) {
        setTimeout(() => {
          map.invalidateSize();
        }, 200);
      }

      if (targetTab === "tab-tc-dang-vien") {
        renderTcDangVienCharts(globalAgeData);
      }
    });
  });
}

// KIỂM TRA TRẠNG THÁI ĐĂNG NHẬP TẠI BANNER
let homeUserRole = "guest";
let homeUserEmail = "";
const VIEW_ONLY_HOME_EMAIL = "btc.tn@gmail.com";

function canAccessHomeNoiBo() {
  // Có quyền XEM Quản lý nội bộ trên trang chủ:
  // - admin: toàn quyền
  // - nhap_lieu_btc: tài khoản nhập liệu Ban Tổ chức
  // - xem_noi_bo: tài khoản chỉ xem Quản lý nội bộ (btc.tn@gmail.com)
  return (
    homeUserRole === "admin" ||
    homeUserRole === "nhap_lieu_btc" ||
    homeUserRole === "xem_noi_bo"
  );
}

function canEditHomeNoiBo() {
  // Chỉ Admin và tài khoản nhập liệu BTC được sửa trạng thái nhiệm vụ.
  // btc.tn@gmail.com luôn là chỉ-xem, kể cả khi Firebase vô tình gán nhầm role.
  if (homeUserEmail === VIEW_ONLY_HOME_EMAIL) return false;
  return homeUserRole === "admin" || homeUserRole === "nhap_lieu_btc";
}

function applyHomeRolePermissions() {
  const btnNoiBo = document.getElementById("tab-btn-quan-ly-noi-bo");
  const tabNoiBo = document.getElementById("tab-quan-ly-noi-bo");
  const btnSoHoa = document.querySelector('[data-tab="tab-so-hoa"]');
  const tabSoHoa = document.getElementById("tab-so-hoa");
  const allowed = canAccessHomeNoiBo();

  if (btnNoiBo) btnNoiBo.style.display = allowed ? "inline-flex" : "none";

  if (!allowed) {
    // Nếu vừa đăng xuất khi đang ở Quản lý nội bộ thì đưa về phân hệ Số hóa.
    if (tabNoiBo?.classList.contains("active")) {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
      btnSoHoa?.classList.add("active");
      tabSoHoa?.classList.add("active");
      if (map) setTimeout(() => map.invalidateSize(), 200);
    }

    stopTasksListener();
    homeTasksCache = [];
    updateTaskMetrics(0, 0, 0, 0, 0, 0);
  } else {
    fetchTasksData();
  }
}


firebase.auth().onAuthStateChanged((user) => {
  const sessionEmail = document.getElementById("session-email");
  const sessionRole = document.getElementById("session-role");
  const dropdownMenu = document.getElementById("user-dropdown-menu");
  const dropdownIcon = document.getElementById("user-dropdown-icon");

  if (user) {
    database.ref("users/" + user.uid).once("value", (snapshot) => {
      const userData = snapshot.val();
      homeUserEmail = (user.email || "").trim().toLowerCase();

      // Lớp phòng vệ giao diện: btc.tn luôn được coi là role chỉ-xem.
      // Firebase Rules vẫn là lớp quyết định quyền dữ liệu thực sự.
      homeUserRole =
        homeUserEmail === VIEW_ONLY_HOME_EMAIL
          ? "xem_noi_bo"
          : userData
            ? userData.role
            : "guest";

      if (sessionEmail) sessionEmail.textContent = user.email.split("@")[0];
      if (sessionRole) {
        sessionRole.textContent =
          homeUserRole === "admin"
            ? "Quản trị viên (Admin)"
            : homeUserRole === "nhap_lieu_btc"
              ? "Cán bộ Ban Tổ chức (Nhập liệu)"
              : homeUserRole === "xem_noi_bo"
                ? "Ban Tổ chức (Chỉ xem nội bộ)"
                : "Cán bộ Nhập liệu";
      }

      if (dropdownIcon) dropdownIcon.style.display = "inline-block";
      if (dropdownMenu) dropdownMenu.style.display = "";

      // Áp dụng quyền hiển thị Phân hệ Quản lý nội bộ sau khi đã xác định role
      applyHomeRolePermissions();
    });
  } else {
    homeUserRole = "guest";
    homeUserEmail = "";
    if (sessionEmail) sessionEmail.textContent = "Guest";
    if (sessionRole) sessionRole.textContent = "";

    if (dropdownIcon) dropdownIcon.style.display = "none";
    if (dropdownMenu) dropdownMenu.style.display = "none";

    applyHomeRolePermissions();
  }
});

// NÚT ĐĂNG XUẤT TRÊN BANNER
function initLogoutEvents() {
  const btnHomeLogout = document.getElementById("btn-home-logout");
  if (btnHomeLogout) {
    btnHomeLogout.addEventListener("click", () => {
      Swal.fire({
        title: "Xác nhận đăng xuất?",
        text: "Phiên quản trị sẽ kết thúc.",
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#e74c3c",
        cancelButtonColor: "#95a5a6",
        confirmButtonText: "Đăng xuất",
        cancelButtonText: "Hủy",
      }).then((result) => {
        if (result.isConfirmed) {
          firebase
            .auth()
            .signOut()
            .then(() => {
              Swal.fire({
                icon: "success",
                title: "Đã đăng xuất",
                timer: 1200,
                showConfirmButton: false,
              });
            });
        }
      });
    });
  }
}

// 2. KHỞI TẠO BẢN ĐỒ NỀN LEAFLET
function initMap() {
  const mapElement = document.getElementById("map");
  if (!mapElement) return;

  map = L.map("map", {
    zoomControl: true,
    scrollWheelZoom: true,
    doubleClickZoom: true,
    dragging: true,
    minZoom: 6,
    maxZoom: 16,
    worldCopyJump: false,
  });

  fetch("ThaiNguyen_xaphuong.geojson")
    .then((res) => res.json())
    .then((data) => {
      geojsonLayer = L.geoJSON(data, {
        style: styleFeature,
        onEachFeature: onEachFeatureMap,
      }).addTo(map);

      const bounds = geojsonLayer.getBounds();
      map.fitBounds(bounds, { padding: [20, 20] });

      // THÊM ĐOẠN CODE NÀY: Tô màu ngay khi bản đồ load xong nếu dữ liệu đã sẵn sàng
      if (currentSoHoaSnapshot) {
        renderMapBySelectedStep();
      }
    })
    .catch((err) => console.error("Lỗi tải bản đồ ranh giới: ", err));
}

function styleFeature(feature) {
  return {
    fillColor: "#e2e8f0",
    weight: 1,
    color: "#ffffff",
    fillOpacity: 0.7,
  };
}

function onEachFeatureMap(feature, layer) {
  if (feature.properties) {
    const name = feature.properties.ten_xa || "Xã/Phường";
    layer.bindTooltip(`<b>Đơn vị:</b> ${name}`, { sticky: true });
  }
}

let currentSoHoaSnapshot = null;

function updateMapWithSoHoaData(snapshot) {
  if (!snapshot || !snapshot.exists()) return;
  currentSoHoaSnapshot = snapshot;
  renderMapBySelectedStep();
}

function cleanUnitName(str) {
  if (!str) return "";
  let cleanStr = str.toString().toLowerCase().trim();

  // 1. Cắt bỏ lớp tiền tố tổ chức (Đảng bộ, Đảng ủy)
  cleanStr = cleanStr.replace(/^(đảng bộ|đảng ủy)\s+/g, "").trim();

  // 2. Cắt bỏ tiếp lớp tiền tố hành chính (Phường, Xã, Huyện, Thành phố...)
  cleanStr = cleanStr
    .replace(/^(phường|xã|thị trấn|huyện|thành phố|thị xã|tp)\s+/g, "")
    .trim();

  return cleanStr;
}
window.renderMapBySelectedStep = function () {
  if (!currentSoHoaSnapshot || !geojsonLayer) return;

  const stepSelect = document.getElementById("map-step-select");
  const selectedStepField = stepSelect ? stepSelect.value : "daCapNhat";

  let stepLabel = "Hoàn thành số hóa";
  if (selectedStepField === "daChinhLy") stepLabel = "Đã chuẩn hóa";
  else if (selectedStepField === "daKySo") stepLabel = "Đã ký số";

  const ratioMapByName = {};

  currentSoHoaSnapshot.forEach((childSnapshot) => {
    const key = childSnapshot.key;
    const data = childSnapshot.val() || {};

    const canSoHoa = Number(data.tongHoSo || 0);
    const countByStep = Number(data[selectedStepField] || 0);
    const ratio = canSoHoa > 0 ? (countByStep / canSoHoa) * 100 : 0;

    ratioMapByName[key] = ratio;
    if (data.ten) {
      const cleanName = cleanUnitName(data.ten);
      ratioMapByName[cleanName] = ratio;
    }
  });

  geojsonLayer.eachLayer((layer) => {
    if (!layer.feature || !layer.feature.properties) return;

    const properties = layer.feature.properties;
    const rawGeoName = properties.ten_xa || properties.ten || "";
    const cleanGeoName = cleanUnitName(rawGeoName);
    const unitKey = properties.id || properties.ma_xa || properties.key;

    let ratio = 0;
    if (ratioMapByName[unitKey] !== undefined) {
      ratio = ratioMapByName[unitKey];
    } else if (ratioMapByName[cleanGeoName] !== undefined) {
      ratio = ratioMapByName[cleanGeoName];
    }

    const fillColor = getColorByRatio(ratio);

    layer.setStyle({
      fillColor: fillColor,
      fillOpacity: 0.85,
      weight: 1,
      color: "#ffffff",
      dashArray: "2",
    });

    layer.bindTooltip(
      `<b>Đơn vị:</b> ${rawGeoName}<br/>Tỷ lệ ${stepLabel}: <b>${ratio.toFixed(1)}%</b>`,
      { sticky: true },
    );
  });
};

// 3. NẠP DANH SÁCH ĐẢNG BỘ VÀO BỘ LỌC DROPDOWN
function loadDangBoList() {
  const dropdown = document.getElementById("select-dangbo");
  if (!dropdown) return;

  dangBoRef.once("value", (snapshot) => {
    dropdown.innerHTML =
      '<option value="ALL">ĐẢNG BỘ TỈNH THÁI NGUYÊN</option>';
    snapshot.forEach((childSnapshot) => {
      if (childSnapshot.key === "tinh_thai_nguyen") return;
      const data = childSnapshot.val() || {};
      const option = document.createElement("option");
      option.value = childSnapshot.key;
      option.textContent = data.ten || childSnapshot.key;
      dropdown.appendChild(option);
    });
  });
}

// 4. ĐỌC DỮ LIỆU TỪ FIREBASE & CẬP NHẬT DASHBOARD
function fetchStatistics(selectedKey = "ALL") {
  dangBoRef.on("value", (snapshot) => {
    try {
      fullDataList = [];

      let tCanSoHoa = 0,
        tChinhLy = 0,
        tKySo = 0,
        tPhanMem = 0,
        tThieuTaiLieu = 0;
      let tSoTccs = 0,
        tSoChiBo = 0,
        tTongDv = 0,
        tDvChinhThuc = 0,
        tDvDuBi = 0;
      let tU30 = 0,
        t30to45 = 0,
        t46to60 = 0,
        tO60 = 0;

      let provincialRecord = null;

      if (!snapshot.exists()) return;

      snapshot.forEach((childSnapshot) => {
        const data = childSnapshot.val() || {};
        const key = childSnapshot.key;

        if (key === "tinh_thai_nguyen") {
          provincialRecord = {
            soTccsDang: Number(data.soTccsDang || 0),
            soChiBo: Number(data.soChiBo || 0),
            tongDangVien: Number(data.tongDangVien || 0),
            dvChinhThuc: Number(data.dvChinhThuc || 0),
            dvDuBi: Number(data.dvDuBi || 0),
            tuoiUnder30: Number(data.tuoiUnder30 || 0),
            tuoi30to45: Number(data.tuoi30to45 || 0),
            tuoi46to60: Number(data.tuoi46to60 || 0),
            tuoiOver60: Number(data.tuoiOver60 || 0),
          };
          return;
        }

        const item = {
          key: key,
          ten: data.ten || key || "Chưa đặt tên",
          tongHoSo: Number(data.tongHoSo || 0),
          soHsThieuTaiLieuCoBan: Number(data.soHsThieuTaiLieuCoBan || 0),
          daChinhLy: Number(data.daChinhLy || 0),
          daKySo: Number(data.daKySo || 0),
          daCapNhat: Number(data.daCapNhat || 0),
          soTccsDang: Number(data.soTccsDang || 0),
          soChiBo: Number(data.soChiBo || 0),
          tongDangVien: Number(data.tongDangVien || 0),
          dvChinhThuc: Number(data.dvChinhThuc || 0),
          dvDuBi: Number(data.dvDuBi || 0),
          tuoiUnder30: Number(data.tuoiUnder30 || 0),
          tuoi30to45: Number(data.tuoi30to45 || 0),
          tuoi46to60: Number(data.tuoi46to60 || 0),
          tuoiOver60: Number(data.tuoiOver60 || 0),
        };
        fullDataList.push(item);

        tCanSoHoa += item.tongHoSo;
        tChinhLy += item.daChinhLy;
        tKySo += item.daKySo;
        tPhanMem += item.daCapNhat;
        tThieuTaiLieu += item.soHsThieuTaiLieuCoBan;

        tSoTccs += item.soTccsDang;
        tSoChiBo += item.soChiBo;
        tTongDv += item.tongDangVien;
        tDvChinhThuc += item.dvChinhThuc;
        tDvDuBi += item.dvDuBi;

        tU30 += item.tuoiUnder30;
        t30to45 += item.tuoi30to45;
        t46to60 += item.tuoi46to60;
        tO60 += item.tuoiOver60;
      });

      if (selectedKey === "ALL" || selectedKey === "tinh_thai_nguyen") {
        updateDashboard(tCanSoHoa, tChinhLy, tKySo, tPhanMem);
        renderBottleneckDashboard(
          tCanSoHoa,
          tChinhLy,
          tKySo,
          tPhanMem,
          tThieuTaiLieu,
        );

        if (provincialRecord) {
          updateTcDangDashboard(
            provincialRecord.soTccsDang,
            provincialRecord.soChiBo,
            provincialRecord.tongDangVien,
            provincialRecord.dvChinhThuc,
            provincialRecord.dvDuBi,
          );
          globalAgeData = [
            provincialRecord.tuoiUnder30,
            provincialRecord.tuoi30to45,
            provincialRecord.tuoi46to60,
            provincialRecord.tuoiOver60,
          ];
        } else {
          updateTcDangDashboard(
            tSoTccs,
            tSoChiBo,
            tTongDv,
            tDvChinhThuc,
            tDvDuBi,
          );
          globalAgeData = [tU30, t30to45, t46to60, tO60];
        }
      } else {
        const target = fullDataList.find((x) => x.key === selectedKey);
        if (target) {
          updateDashboard(
            target.tongHoSo,
            target.daChinhLy,
            target.daKySo,
            target.daCapNhat,
          );
          renderBottleneckDashboard(
            target.tongHoSo,
            target.daChinhLy,
            target.daKySo,
            target.daCapNhat,
            target.soHsThieuTaiLieuCoBan,
          );
          updateTcDangDashboard(
            target.soTccsDang,
            target.soChiBo,
            target.tongDangVien,
            target.dvChinhThuc,
            target.dvDuBi,
          );
          globalAgeData = [
            target.tuoiUnder30,
            target.tuoi30to45,
            target.tuoi46to60,
            target.tuoiOver60,
          ];
        }
      }

      renderTable();
      renderRankings();
      renderTcDangVienCharts(globalAgeData);
      renderKetNapDashboard(snapshot);
      updateMapWithSoHoaData(snapshot);
    } catch (err) {
      console.error("Lỗi xử lý dữ liệu Firebase:", err);
    }
  });
}

// 5. CẬP NHẬT DASHBOARD PHÂN HỆ SỐ HÓA
function updateDashboard(canSoHoa, chinhLy, kySo, phanMem) {
  const pChinhLy = canSoHoa ? ((chinhLy / canSoHoa) * 100).toFixed(1) : 0;
  const pKySo = canSoHoa ? ((kySo / canSoHoa) * 100).toFixed(1) : 0;
  const pPhanMem = canSoHoa ? ((phanMem / canSoHoa) * 100).toFixed(1) : 0;
  const pHoanThanh = pPhanMem;

  if (document.getElementById("val-can-so-hoa"))
    document.getElementById("val-can-so-hoa").textContent =
      canSoHoa.toLocaleString("vi-VN");
  if (document.getElementById("val-da-chinh-ly"))
    document.getElementById("val-da-chinh-ly").textContent =
      chinhLy.toLocaleString("vi-VN");
  if (document.getElementById("val-da-ky-so"))
    document.getElementById("val-da-ky-so").textContent =
      kySo.toLocaleString("vi-VN");
  if (document.getElementById("val-da-phan-mem"))
    document.getElementById("val-da-phan-mem").textContent =
      phanMem.toLocaleString("vi-VN");
  if (document.getElementById("val-ty-le-hoan-thanh"))
    document.getElementById("val-ty-le-hoan-thanh").textContent =
      pHoanThanh + "%";

  if (document.getElementById("pct-chinh-ly"))
    document.getElementById("pct-chinh-ly").textContent = pChinhLy + "%";
  if (document.getElementById("pct-ky-so"))
    document.getElementById("pct-ky-so").textContent = pKySo + "%";
  if (document.getElementById("pct-phan-mem"))
    document.getElementById("pct-phan-mem").textContent = pPhanMem + "%";
  if (document.getElementById("pct-hoan-thanh"))
    document.getElementById("pct-hoan-thanh").textContent = pHoanThanh + "%";

  if (document.getElementById("ratio-chinh-ly"))
    document.getElementById("ratio-chinh-ly").textContent =
      `${chinhLy.toLocaleString()} / ${canSoHoa.toLocaleString()}`;
  if (document.getElementById("ratio-ky-so"))
    document.getElementById("ratio-ky-so").textContent =
      `${kySo.toLocaleString()} / ${canSoHoa.toLocaleString()}`;
  if (document.getElementById("ratio-phan-mem"))
    document.getElementById("ratio-phan-mem").textContent =
      `${phanMem.toLocaleString()} / ${canSoHoa.toLocaleString()}`;
  if (document.getElementById("ratio-hoan-thanh"))
    document.getElementById("ratio-hoan-thanh").textContent =
      `${phanMem.toLocaleString()} / ${canSoHoa.toLocaleString()}`;

  if (document.getElementById("chart-chinh-ly"))
    drawCircularChart(
      "chart-chinh-ly",
      pChinhLy,
      "#ea580c",
      chartChinhLy,
      (c) => (chartChinhLy = c),
    );
  if (document.getElementById("chart-ky-so"))
    drawCircularChart(
      "chart-ky-so",
      pKySo,
      "#9333ea",
      chartKySo,
      (c) => (chartKySo = c),
    );
  if (document.getElementById("chart-phan-mem"))
    drawCircularChart(
      "chart-phan-mem",
      pPhanMem,
      "#16a34a",
      chartPhanMem,
      (c) => (chartPhanMem = c),
    );
  if (document.getElementById("chart-hoan-thanh"))
    drawCircularChart(
      "chart-hoan-thanh",
      pHoanThanh,
      "#dc2626",
      chartHoAnThanh,
      (c) => (chartHoAnThanh = c),
    );
}

function updateTcDangDashboard(soTccs, soChiBo, tongDv, dvChinhThuc, dvDuBi) {
  const elTccs = document.getElementById("val-tc-tccs");
  const elChiBo = document.getElementById("val-tc-chibo");
  const elTongDv = document.getElementById("val-tc-tong-dv");

  if (elTccs) elTccs.textContent = Number(soTccs).toLocaleString("vi-VN");
  if (elChiBo) elChiBo.textContent = Number(soChiBo).toLocaleString("vi-VN");
  if (elTongDv) elTongDv.textContent = Number(tongDv).toLocaleString("vi-VN");
}

function drawCircularChart(canvasId, percent, color, chartObj, setChartObj) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  if (chartObj) chartObj.destroy();

  const ctx = canvas.getContext("2d");
  const val = parseFloat(percent);
  const remaining = 100 - val > 0 ? 100 - val : 0;

  const newChartObj = new Chart(ctx, {
    type: "doughnut",
    data: {
      datasets: [
        {
          data: [val, remaining],
          backgroundColor: [color, "#e2e8f0"],
          borderWidth: 0,
        },
      ],
    },
    options: {
      cutout: "78%",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
      },
    },
  });
  setChartObj(newChartObj);
}

// 6. HIỂN THỊ ĐIỂM NGHẼN TRONG QUY TRÌNH SỐ HÓA
function renderBottleneckDashboard(
  canSoHoa,
  chinhLy,
  kySo,
  phanMem,
  thieuTaiLieu,
) {
  const total = Math.max(Number(canSoHoa || 0), 0);
  const standardized = Math.max(Number(chinhLy || 0), 0);
  const signed = Math.max(Number(kySo || 0), 0);
  const uploaded = Math.max(Number(phanMem || 0), 0);
  const missingDocs = Math.max(Number(thieuTaiLieu || 0), 0);

  // Dùng Math.max để dữ liệu bất thường không tạo ra số âm trên dashboard.
  const bottlenecks = [
    {
      key: "not-standardized",
      label: "Chưa chuẩn hóa",
      value: Math.max(total - standardized, 0),
    },
    {
      key: "not-signed",
      label: "Đã chuẩn hóa, chưa ký số",
      value: Math.max(standardized - signed, 0),
    },
    {
      key: "not-uploaded",
      label: "Đã ký số, chưa đưa lên PM",
      value: Math.max(signed - uploaded, 0),
    },
    {
      key: "missing-docs",
      label: "HS thiếu tài liệu cơ bản",
      value: missingDocs,
    },
  ];

  bottlenecks.forEach((item) => {
    const percent = total > 0 ? (item.value / total) * 100 : 0;
    const valueEl = document.getElementById(`bn-${item.key}`);
    const pctEl = document.getElementById(`bn-${item.key}-pct`);
    const barEl = document.getElementById(`bn-${item.key}-bar`);

    if (valueEl) valueEl.textContent = item.value.toLocaleString("vi-VN");
    if (pctEl) pctEl.textContent = `${percent.toFixed(1)}% tổng HS`;
    if (barEl) barEl.style.width = `${Math.min(percent, 100)}%`;
  });

  // Điểm nghẽn vận hành chỉ xét 3 bước chuyển tiếp chính;
  // hồ sơ thiếu tài liệu được giữ như một chỉ báo nguyên nhân riêng.
  const processBottlenecks = bottlenecks.slice(0, 3);
  const largest = processBottlenecks.reduce(
    (maxItem, item) => (item.value > maxItem.value ? item : maxItem),
    processBottlenecks[0],
  );

  const summaryEl = document.getElementById("bn-summary");
  if (summaryEl) {
    if (total <= 0) {
      summaryEl.innerHTML = `<i class="fa-solid fa-magnifying-glass-chart"></i> <strong>Điểm nghẽn lớn nhất:</strong> Chưa có dữ liệu.`;
    } else {
      const largestPct = ((largest.value / total) * 100).toFixed(1);
      summaryEl.innerHTML = `<i class="fa-solid fa-magnifying-glass-chart"></i> <strong>Điểm nghẽn lớn nhất:</strong> ${largest.label} — <b>${largest.value.toLocaleString("vi-VN")} HS</b> (${largestPct}% tổng HS).`;
    }
  }
}

// 7. XỬ LÝ BẢNG THỐNG KÊ CHI TIẾT SỐ HÓA
function renderTable(searchTerm = "") {
  const tbody = document.getElementById("main-report-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const safeSearch = (searchTerm || "").toString().toLowerCase();

  const filtered = fullDataList.filter((item) => {
    const unitName = (item.ten || item.key || "").toString().toLowerCase();
    return unitName.includes(safeSearch);
  });

  let sumCanSoHoa = 0,
    sumThieuTaiLieu = 0,
    sumChinhLy = 0,
    sumKySo = 0,
    sumPhanMem = 0;

  filtered.forEach((item, index) => {
    const displayName = item.ten || item.key || "Chưa đặt tên";
    const pChinhLy = item.tongHoSo
      ? ((item.daChinhLy / item.tongHoSo) * 100).toFixed(1)
      : 0;
    const pKySo = item.tongHoSo
      ? ((item.daKySo / item.tongHoSo) * 100).toFixed(1)
      : 0;
    const pPhanMem = item.tongHoSo
      ? ((item.daCapNhat / item.tongHoSo) * 100).toFixed(1)
      : 0;

    sumCanSoHoa += item.tongHoSo;
    sumThieuTaiLieu += item.soHsThieuTaiLieuCoBan;
    sumChinhLy += item.daChinhLy;
    sumKySo += item.daKySo;
    sumPhanMem += item.daCapNhat;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td class="text-center">${index + 1}</td>
      <td><b>${displayName}</b></td>
      <td class="text-right">${item.tongHoSo.toLocaleString()}</td>
      <td class="text-right">${item.soHsThieuTaiLieuCoBan.toLocaleString()}</td>
      <td class="text-right" style="border-left: 1px solid #e2e8f0;">${item.daChinhLy.toLocaleString()}</td>
      <td class="text-center">${pChinhLy}%</td>
      <td class="text-right" style="border-left: 1px solid #e2e8f0;">${item.daKySo.toLocaleString()}</td>
      <td class="text-center">${pKySo}%</td>
      <td class="text-right" style="border-left: 1px solid #e2e8f0;">${item.daCapNhat.toLocaleString()}</td>
      <td class="text-center">${pPhanMem}%</td>
      <td class="text-center" style="border-left: 1px solid #e2e8f0; font-weight: bold; color: ${pPhanMem >= 80 ? "#16a34a" : "#ea580c"};">${pPhanMem}%</td>
    `;
    tbody.appendChild(row);
  });

  if (document.getElementById("foot-can-so-hoa"))
    document.getElementById("foot-can-so-hoa").textContent =
      sumCanSoHoa.toLocaleString();
  if (document.getElementById("foot-thieu-tai-lieu"))
    document.getElementById("foot-thieu-tai-lieu").textContent =
      sumThieuTaiLieu.toLocaleString();
  if (document.getElementById("foot-sl-chinh-ly"))
    document.getElementById("foot-sl-chinh-ly").textContent =
      sumChinhLy.toLocaleString();
  if (document.getElementById("foot-sl-ky-so"))
    document.getElementById("foot-sl-ky-so").textContent =
      sumKySo.toLocaleString();
  if (document.getElementById("foot-sl-phan-mem"))
    document.getElementById("foot-sl-phan-mem").textContent =
      sumPhanMem.toLocaleString();

  const totChinhLyPct = sumCanSoHoa
    ? ((sumChinhLy / sumCanSoHoa) * 100).toFixed(1)
    : 0;
  const totKySoPct = sumCanSoHoa
    ? ((sumKySo / sumCanSoHoa) * 100).toFixed(1)
    : 0;
  const totPhanMemPct = sumCanSoHoa
    ? ((sumPhanMem / sumCanSoHoa) * 100).toFixed(1)
    : 0;

  if (document.getElementById("foot-tl-chinh-ly"))
    document.getElementById("foot-tl-chinh-ly").textContent =
      totChinhLyPct + "%";
  if (document.getElementById("foot-tl-ky-so"))
    document.getElementById("foot-tl-ky-so").textContent = totKySoPct + "%";
  if (document.getElementById("foot-tl-phan-mem"))
    document.getElementById("foot-tl-phan-mem").textContent =
      totPhanMemPct + "%";
  if (document.getElementById("foot-tl-hoan-thanh"))
    document.getElementById("foot-tl-hoan-thanh").textContent =
      totPhanMemPct + "%";
}

// 8. BẢNG XẾP HẠNG TOP DẪN ĐẦU & CẦN ĐÔN ĐỐC
function renderRankings() {
  const completedListContainer = document.getElementById("rank-top-list");
  const rankingListContainer = document.getElementById("rank-low-list");
  const completedCountEl = document.getElementById("rank-completed-count");

  if (!completedListContainer || !rankingListContainer) return;

  // Giữ nguyên dropdown chọn giai đoạn hiện có
  const stepSelect = document.getElementById("rank-step-select");
  const selectedStepField = stepSelect ? stepSelect.value : "daCapNhat";

  // Dropdown mới: Top 10 hoặc 10 đơn vị thấp nhất
  const rangeSelect = document.getElementById("rank-range-select");
  const selectedRange = rangeSelect ? rangeSelect.value : "top10";

  const rankingData = fullDataList.map((item) => {
    const total = Number(item.tongHoSo || 0);
    const countByStep = Number(item[selectedStepField] || 0);
    const percent = total > 0 ? (countByStep / total) * 100 : 0;

    return {
      ...item,
      total,
      countByStep,
      percent,
    };
  });

  // ===============================================================
  // 1. CÁC ĐƠN VỊ ĐÃ HOÀN THÀNH
  // Chỉ tính đơn vị thực sự có hồ sơ và đạt từ 100% ở giai đoạn đang chọn.
  // Dùng >= 100 để không bỏ sót dữ liệu nếu số lượng thực tế vượt chỉ tiêu.
  // ===============================================================
  const completedUnits = rankingData
    .filter((item) => item.total > 0 && item.percent >= 100)
    .sort((a, b) => {
      // Ưu tiên tỷ lệ cao hơn; nếu bằng nhau thì sắp tên A-Z cho dễ tra cứu
      if (b.percent !== a.percent) return b.percent - a.percent;
      return (a.ten || a.key || "").localeCompare(a.ten || a.key || "", "vi");
    });

  completedListContainer.innerHTML = "";

  // Gộp số đơn vị hoàn thành / tổng số đơn vị báo cáo ngay trên dòng tiêu đề.
  // Mẫu số lấy động từ fullDataList, không ghi cứng 96.
  if (completedCountEl) {
    const totalReportingUnits = fullDataList.length;
    completedCountEl.textContent = `(${completedUnits.length}/${totalReportingUnits})`;
  }

  if (completedUnits.length === 0) {
    completedListContainer.innerHTML = `
      <div style="padding: 12px 10px; text-align: center; color: #94a3b8; background: #f8fafc; border-radius: 4px; font-size: 12px;">
        Chưa có đơn vị hoàn thành ở giai đoạn này.
      </div>
    `;
  } else {
    completedUnits.forEach((item, index) => {
      const div = document.createElement("div");
      div.className = "rank-item";
      div.innerHTML = `
        <div class="rank-item-info">
          <span class="rank-number top-rank-num">${index + 1}</span>
          <span class="rank-name">${item.ten || item.key}</span>
        </div>
        <span class="rank-percent text-green">${item.percent.toFixed(1)}%</span>
      `;
      completedListContainer.appendChild(div);
    });
  }

  // ===============================================================
  // 2. TOP 10 / BOTTOM 10 THEO LỰA CHỌN
  // Giữ cách tính tỷ lệ hiện tại: đơn vị không có tổng hồ sơ được xem là 0%.
  // ===============================================================
  let selectedRanking = [];
  let percentClass = "text-green";
  let rankNumberClass = "top-rank-num";

  if (selectedRange === "bottom10") {
    selectedRanking = [...rankingData]
      .sort((a, b) => {
        if (a.percent !== b.percent) return a.percent - b.percent;
        return (a.ten || a.key || "").localeCompare(b.ten || b.key || "", "vi");
      })
      .slice(0, 10);
    percentClass = "text-down";
    rankNumberClass = "low-rank-num";
  } else {
    selectedRanking = [...rankingData]
      .sort((a, b) => {
        if (b.percent !== a.percent) return b.percent - a.percent;
        return (a.ten || a.key || "").localeCompare(b.ten || b.key || "", "vi");
      })
      .slice(0, 10);
  }

  rankingListContainer.innerHTML = "";

  if (selectedRanking.length === 0) {
    rankingListContainer.innerHTML = `
      <div style="padding: 12px 10px; text-align: center; color: #94a3b8; background: #f8fafc; border-radius: 4px; font-size: 12px;">
        Chưa có dữ liệu xếp hạng.
      </div>
    `;
    return;
  }

  selectedRanking.forEach((item, index) => {
    const div = document.createElement("div");
    div.className = "rank-item";
    div.innerHTML = `
      <div class="rank-item-info">
        <span class="rank-number ${rankNumberClass}">${index + 1}</span>
        <span class="rank-name">${item.ten || item.key}</span>
      </div>
      <span class="rank-percent ${percentClass}">${item.percent.toFixed(1)}%</span>
    `;
    rankingListContainer.appendChild(div);
  });
}

// 9. VẼ BIỂU ĐỒ PHÂN HỆ TỔ CHỨC ĐẢNG & ĐẢNG VIÊN
function renderTcDangVienCharts(ageData = [0, 0, 0, 0]) {
  const canvasAge = document.getElementById("ageStructureChart");
  if (canvasAge) {
    if (ageChartObj) ageChartObj.destroy();
    const ctxAge = canvasAge.getContext("2d");

    ageChartObj = new Chart(ctxAge, {
      type: "pie",
      data: {
        labels: [
          "Dưới 30 tuổi",
          "Từ 30 - 45 tuổi",
          "Từ 46 - 60 tuổi",
          "Trên 60 tuổi",
        ],
        datasets: [
          {
            data: ageData,
            backgroundColor: ["#0284c7", "#16a34a", "#ea580c", "#9333ea"],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "right" },
          tooltip: {
            callbacks: {
              label: function (context) {
                const label = context.label || "";
                const value = context.raw || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage =
                  total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                return `${label}: ${value.toLocaleString("vi-VN")} đv (${percentage}%)`;
              },
            },
          },
        },
      },
    });
  }

  const canvasAdmission = document.getElementById("admissionChart");
  const chartContainer = document.getElementById("bar-chart-container");

  if (canvasAdmission && chartContainer) {
    if (admissionChartObj) admissionChartObj.destroy();

    const chartData =
      fullDataList && fullDataList.length > 0 ? fullDataList : [];
    const labels = chartData.map((d) => d.ten || d.key);
    const dataTongDV = chartData.map((d) => d.tongDangVien || 0);

    const wrapper = chartContainer.parentElement;
    const viewWidth = wrapper ? wrapper.clientWidth : 600;
    const visibleItems = 10;

    if (labels.length > visibleItems) {
      const itemWidth = viewWidth / visibleItems;
      const totalWidth = Math.max(labels.length * itemWidth, viewWidth);
      chartContainer.style.width = `${totalWidth}px`;
    } else {
      chartContainer.style.width = "100%";
    }

    const ctxAdmission = canvasAdmission.getContext("2d");
    admissionChartObj = new Chart(ctxAdmission, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Tổng số Đảng viên",
            data: dataTongDV,
            backgroundColor: "#0284c7",
            borderColor: "#0369a1",
            borderWidth: 1,
            borderRadius: 4,
            barPercentage: 0.5,
            categoryPercentage: 0.7,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
            labels: { font: { size: 11, weight: "bold" } },
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                return `Tổng số Đảng viên: ${Number(context.raw).toLocaleString("vi-VN")} đồng chí`;
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: "#f1f5f9" },
            ticks: { font: { size: 10 } },
          },
          x: {
            grid: { display: false },
            ticks: {
              font: { size: 10, weight: "500" },
              maxRotation: 45,
              minRotation: 30,
              autoSkip: false,
            },
          },
        },
      },
    });
  }
}

// 10. TÍNH TOÁN VÀ RENDER DASHBOARD KẾT NẠP ĐẢNG VIÊN
function renderKetNapDashboard(snapshot) {
  if (!snapshot || !snapshot.exists()) return;

  const selectDangBo = document.getElementById("select-dangbo");
  const selectedKey = selectDangBo ? selectDangBo.value : "ALL";

  let selectedUnitName = "ĐẢNG BỘ TỈNH THÁI NGUYÊN";
  if (selectDangBo && selectDangBo.selectedIndex >= 0) {
    selectedUnitName = selectDangBo.options[selectDangBo.selectedIndex].text;
  }

  const elUnitDisplay = document.getElementById("kn-unit-display");
  if (elUnitDisplay) {
    elUnitDisplay.textContent = `— Đơn vị: ${selectedUnitName}`;
  }

  let provinceTotalDV = 0;
  let maxTimestamp = 0;

  let sumChiTieu = 0,
    sumDaKetNap = 0;
  let sumHocSinh = 0,
    sumSinhVien = 0,
    sumTongHSSV = 0;
  let sumDnNhaNuoc = 0,
    sumDnNgoaiNN = 0,
    sumNldKdc = 0,
    sumHtx = 0,
    sumTongDN = 0;
  let sumDtts = 0,
    sumTonGiao = 0;

  const tbody = document.getElementById("home-ketnap-tbody");
  if (tbody) tbody.innerHTML = "";
  let index = 1;

  snapshot.forEach((child) => {
    const key = child.key;
    if (key === "tinh_thai_nguyen") return;

    const d = child.val() || {};
    const ten = d.ten || `Đảng bộ ${key}`;

    const ct = Number(d.chiTieuKetNap || 0);
    const kn = Number(d.daKetNap || 0);
    const dv = Number(d.tongDangVien || 0);

    provinceTotalDV += dv;

    const hs = Number(d.hocSinh || 0);
    const sv = Number(d.sinhVien || 0);
    const hssv = Number(d.tongHSSV || hs + sv);

    const dnnn = Number(d.dnNhaNuoc || 0);
    const dnnnn = Number(d.dnNgoaiNN || 0);
    const nld = Number(d.nldKdc || 0);
    const htx = Number(d.htx || 0);
    const dn = Number(d.tongDN || dnnn + dnnnn + nld + htx);

    const dtts = Number(d.dtts || 0);
    const tonGiao = Number(d.tonGiao || 0);

    if (selectedKey === "ALL" || selectedKey === key) {
      sumChiTieu += ct;
      sumDaKetNap += kn;

      sumHocSinh += hs;
      sumSinhVien += sv;
      sumTongHSSV += hssv;
      sumDnNhaNuoc += dnnn;
      sumDnNgoaiNN += dnnnn;
      sumNldKdc += nld;
      sumHtx += htx;
      sumTongDN += dn;
      sumDtts += dtts;
      sumTonGiao += tonGiao;

      if (d.updatedAt) {
        const ts =
          typeof d.updatedAt === "number"
            ? d.updatedAt
            : new Date(d.updatedAt).getTime();
        if (!isNaN(ts) && ts > maxTimestamp) {
          maxTimestamp = ts;
        }
      }
    }

    if (tbody) {
      const pct = ct > 0 ? ((kn / ct) * 100).toFixed(2) : "0.00";
      const isSelectedRow = selectedKey !== "ALL" && selectedKey === key;
      const cellStyle = "border: 1px solid #e2e8f0; padding: 6px 8px;";

      const tr = document.createElement("tr");
      if (isSelectedRow) {
        tr.style.backgroundColor = "#fef2f2";
      }

      tr.innerHTML = `
        <td style="${cellStyle} text-align: center;">${index++}</td>
        <td style="${cellStyle}"><b>${ten}</b></td>
        <td style="${cellStyle} text-align: right;">${ct.toLocaleString()}</td>
        <td style="${cellStyle} text-align: right; font-weight: bold; color: #0056b3;">${kn.toLocaleString()}</td>
        <td style="${cellStyle} text-align: center; font-weight: bold; color: ${pct >= 100 ? "#16a34a" : "#dc2626"};">${pct}%</td>
        <td style="${cellStyle} text-align: right; background: #f0f9ff; font-weight: bold;">${hssv.toLocaleString()}</td>
        <td style="${cellStyle} text-align: right;">${hs.toLocaleString()}</td>
        <td style="${cellStyle} text-align: right;">${sv.toLocaleString()}</td>
        <td style="${cellStyle} text-align: right; background: #f0fdf4; font-weight: bold;">${dn.toLocaleString()}</td>
        <td style="${cellStyle} text-align: right;">${dnnn.toLocaleString()}</td>
        <td style="${cellStyle} text-align: right;">${dnnnn.toLocaleString()}</td>
        <td style="${cellStyle} text-align: right;">${nld.toLocaleString()}</td>
        <td style="${cellStyle} text-align: right;">${htx.toLocaleString()}</td>
        <td style="${cellStyle} text-align: right;">${dtts.toLocaleString()}</td>
      `;
      tbody.appendChild(tr);
    }
  });

  if (maxTimestamp > 0) {
    const dateObj = new Date(maxTimestamp);
    const day = String(dateObj.getDate()).padStart(2, "0");
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const year = dateObj.getFullYear();
    const formattedDate = `${day}/${month}/${year}`;

    const elDateDisplay = document.getElementById("kn-date-display");
    if (elDateDisplay) {
      elDateDisplay.textContent = formattedDate;
    }
  }

  if (document.getElementById("kn-val-tong-dv")) {
    document.getElementById("kn-val-tong-dv").textContent =
      provinceTotalDV.toLocaleString();
  }

  const conLai = sumChiTieu - sumDaKetNap;
  const pctTong =
    sumChiTieu > 0 ? ((sumDaKetNap / sumChiTieu) * 100).toFixed(2) : "0.00";

  if (document.getElementById("kn-val-chi-tieu"))
    document.getElementById("kn-val-chi-tieu").textContent =
      sumChiTieu.toLocaleString();
  if (document.getElementById("kn-val-da-ket-nap"))
    document.getElementById("kn-val-da-ket-nap").textContent =
      sumDaKetNap.toLocaleString();
  if (document.getElementById("kn-val-pct"))
    document.getElementById("kn-val-pct").textContent = pctTong + "%";
  if (document.getElementById("kn-val-con-lai"))
    document.getElementById("kn-val-con-lai").textContent = (
      conLai > 0 ? conLai : 0
    ).toLocaleString();

  if (document.getElementById("kn-chart-center-pct"))
    document.getElementById("kn-chart-center-pct").textContent = pctTong + "%";
  if (document.getElementById("kn-text-ratio"))
    document.getElementById("kn-text-ratio").textContent =
      `${sumDaKetNap.toLocaleString()} / ${sumChiTieu.toLocaleString()}`;

  // Chỉ tiêu các nhóm trọng tâm áp dụng cho tổng hợp toàn tỉnh.
  // Khi người dùng lọc một Đảng bộ riêng lẻ, không áp chỉ tiêu cấp tỉnh cho đơn vị đó.
  const KN_GROUP_TARGETS = {
    hssv: 500,
    doanhNghiep: 350,
    doanhNghiepNgoaiNN: 200,
  };
  const isProvinceView = selectedKey === "ALL";
  const formatTargetLine = (actual, target) => {
    const pct = target > 0 ? (actual / target) * 100 : 0;
    return `Chỉ tiêu ${target.toLocaleString()} · Đạt ${actual.toLocaleString()}/${target.toLocaleString()} (${pct.toLocaleString("vi-VN", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%)`;
  };

  if (document.getElementById("kn-val-hssv"))
    document.getElementById("kn-val-hssv").textContent =
      sumTongHSSV.toLocaleString();
  const targetHssvEl = document.getElementById("kn-target-hssv");
  if (targetHssvEl) {
    targetHssvEl.style.display = isProvinceView ? "inline" : "none";
    if (isProvinceView) {
      targetHssvEl.textContent = formatTargetLine(
        sumTongHSSV,
        KN_GROUP_TARGETS.hssv,
      );
    }
  }

  if (document.getElementById("kn-val-dn"))
    document.getElementById("kn-val-dn").textContent =
      sumTongDN.toLocaleString();
  const targetDnEl = document.getElementById("kn-target-dn");
  if (targetDnEl) {
    targetDnEl.style.display = isProvinceView ? "inline" : "none";
    if (isProvinceView) {
      targetDnEl.textContent = formatTargetLine(
        sumTongDN,
        KN_GROUP_TARGETS.doanhNghiep,
      );
    }
  }

  const sumGroupNgoaiNN = sumDnNgoaiNN + sumNldKdc + sumHtx;
  if (document.getElementById("kn-text-sub-dn"))
    document.getElementById("kn-text-sub-dn").textContent =
      `DOANH NGHIỆP NGOÀI NHÀ NƯỚC: ${sumGroupNgoaiNN.toLocaleString()}`;
  const targetSubDnEl = document.getElementById("kn-target-sub-dn");
  if (targetSubDnEl) {
    targetSubDnEl.style.display = isProvinceView ? "block" : "none";
    if (isProvinceView) {
      targetSubDnEl.textContent = formatTargetLine(
        sumGroupNgoaiNN,
        KN_GROUP_TARGETS.doanhNghiepNgoaiNN,
      );
    }
  }

  if (document.getElementById("kn-val-dtts"))
    document.getElementById("kn-val-dtts").textContent =
      sumDtts.toLocaleString();

  renderKnDoughnutChart(sumDaKetNap, conLai > 0 ? conLai : 0);
}

function renderKnDoughnutChart(daKetNap, conLai) {
  const canvas = document.getElementById("knDoughnutChart");
  if (!canvas) return;

  if (knDoughnutChartInstance) {
    knDoughnutChartInstance.destroy();
  }

  const ctx = canvas.getContext("2d");
  knDoughnutChartInstance = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Đã kết nạp", "Còn lại so với chỉ tiêu"],
      datasets: [
        {
          data: [daKetNap, conLai],
          backgroundColor: ["#dc2626", "#e2e8f0"],
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "75%",
      plugins: {
        legend: { display: false },
        tooltip: { enabled: true },
      },
    },
  });
}

// =================================================================
// 11. ĐỌC DỮ LIỆU NHIỆM VỤ NỘI BỘ VÀ RENDER ĐẦY ĐỦ CÁC TRƯỜNG TRÊN TRANG CHỦ
// =================================================================
function stopTasksListener() {
  if (isTasksListenerAttached) {
    tasksRefHome.off("value");
    isTasksListenerAttached = false;
  }
}

function fetchTasksData() {
  if (!canAccessHomeNoiBo()) {
    stopTasksListener();
    homeTasksCache = [];
    return;
  }

  // Đảm bảo mỗi trang chỉ có một listener realtime cho tasks.
  stopTasksListener();

  tasksRefHome.on(
    "value",
    (snapshot) => {
      homeTasksCache = [];

      if (snapshot.exists()) {
        snapshot.forEach((child) => {
          const taskId = child.key;
          const task = child.val() || {};
          task.key = taskId;
          homeTasksCache.push(task);
        });
      }

      renderTasksTable();
    },
    (error) => {
      console.error("Không có quyền đọc dữ liệu nhiệm vụ nội bộ:", error);
      homeTasksCache = [];
      updateTaskMetrics(0, 0, 0, 0, 0, 0);
      renderTaskUnitDashboards();
    },
  );
  isTasksListenerAttached = true;
}

// ===== HỖ TRỢ TÍNH NGÀY NHIỆM VỤ (KHÔNG BỊ LỆCH DO MÚI GIỜ) =====
function parseTaskDateOnly(dateValue) {
  if (!dateValue) return null;
  const match = String(dateValue).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const y = Number(match[1]);
    const m = Number(match[2]);
    const d = Number(match[3]);
    const date = new Date(y, m - 1, d);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

function taskTimestampToLocalDate(timestampValue) {
  if (!timestampValue) return null;
  const raw = typeof timestampValue === "number" ? timestampValue : Number(timestampValue);
  const date = Number.isFinite(raw) ? new Date(raw) : new Date(timestampValue);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

function taskDayNumber(date) {
  if (!date) return null;
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000;
}

function taskDiffDays(fromDate, toDate) {
  const fromDay = taskDayNumber(fromDate);
  const toDay = taskDayNumber(toDate);
  if (fromDay === null || toDay === null) return null;
  return Math.round(toDay - fromDay);
}


// =================================================================
// CHẤM ĐIỂM KPI NHIỆM VỤ THEO NGUYÊN TẮC ĐƯỢC DUYỆT
// Dễ thay đổi về sau: chỉ cần sửa các hằng số bên dưới.
// =================================================================
const TASK_KPI_SCORES = Object.freeze({
  DONE_ON_TIME: 100,
  DONE_LATE_LE_3: 30,
  DONE_LATE_GT_3: 0,
  DOING_ON_TIME: 20,
  OVERDUE_LE_3: -20,
  OVERDUE_GT_3: -30,
});

function formatTaskKpiScore(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "0";
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function getTaskKpiScore(task, todayDate) {
  const status = task?.status || "Đang thực hiện";
  const deadlineDate = parseTaskDateOnly(task?.deadline);

  // Không đủ căn cứ xác định đúng hạn/quá hạn: không đưa vào mẫu số KPI.
  if (!deadlineDate) {
    return { score: 0, scorable: false, category: "missingDeadline", overdueDays: null };
  }

  if (status === "Đã hoàn thành") {
    const completedDate = taskTimestampToLocalDate(task.completedAt || task.updatedAt);
    if (!completedDate) {
      return { score: 0, scorable: false, category: "missingCompletedAt", overdueDays: null };
    }

    const overdueDays = taskDiffDays(deadlineDate, completedDate);
    if (overdueDays <= 0) {
      return { score: TASK_KPI_SCORES.DONE_ON_TIME, scorable: true, category: "doneOnTime", overdueDays: 0 };
    }
    if (overdueDays <= 3) {
      return { score: TASK_KPI_SCORES.DONE_LATE_LE_3, scorable: true, category: "doneLateLe3", overdueDays };
    }
    return { score: TASK_KPI_SCORES.DONE_LATE_GT_3, scorable: true, category: "doneLateGt3", overdueDays };
  }

  const daysUntilDeadline = taskDiffDays(todayDate, deadlineDate);
  if (daysUntilDeadline >= 0) {
    return { score: TASK_KPI_SCORES.DOING_ON_TIME, scorable: true, category: "doingOnTime", overdueDays: 0 };
  }

  const overdueDays = Math.abs(daysUntilDeadline);
  if (overdueDays <= 3) {
    return { score: TASK_KPI_SCORES.OVERDUE_LE_3, scorable: true, category: "overdueLe3", overdueDays };
  }
  return { score: TASK_KPI_SCORES.OVERDUE_GT_3, scorable: true, category: "overdueGt3", overdueDays };
}

function showTaskKpiScoringHelp() {
  const html = `
    <div style="text-align:left; font-size:13px; color:#334155;">
      <div style="overflow-x:auto; margin-bottom:12px;">
        <table style="width:100%; border-collapse:collapse; font-size:12px;">
          <thead>
            <tr style="background:#f1f5f9;">
              <th style="border:1px solid #cbd5e1; padding:7px; text-align:left;">Tình trạng nhiệm vụ</th>
              <th style="border:1px solid #cbd5e1; padding:7px; text-align:center; width:90px;">Điểm</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style="border:1px solid #cbd5e1; padding:7px;">Hoàn thành đúng hạn / trước hạn</td><td style="border:1px solid #cbd5e1; padding:7px; text-align:center; font-weight:900; color:#16a34a;">${TASK_KPI_SCORES.DONE_ON_TIME}</td></tr>
            <tr><td style="border:1px solid #cbd5e1; padding:7px;">Hoàn thành quá hạn không quá 3 ngày (≤ 3 ngày)</td><td style="border:1px solid #cbd5e1; padding:7px; text-align:center; font-weight:900; color:#7e22ce;">${TASK_KPI_SCORES.DONE_LATE_LE_3}</td></tr>
            <tr><td style="border:1px solid #cbd5e1; padding:7px;">Hoàn thành quá hạn trên 3 ngày</td><td style="border:1px solid #cbd5e1; padding:7px; text-align:center; font-weight:900;">${TASK_KPI_SCORES.DONE_LATE_GT_3}</td></tr>
            <tr><td style="border:1px solid #cbd5e1; padding:7px;">Đang thực hiện, chưa quá hạn</td><td style="border:1px solid #cbd5e1; padding:7px; text-align:center; font-weight:900; color:#d97706;">${TASK_KPI_SCORES.DOING_ON_TIME}</td></tr>
            <tr><td style="border:1px solid #cbd5e1; padding:7px;">Chậm / quá hạn không quá 3 ngày (≤ 3 ngày)</td><td style="border:1px solid #cbd5e1; padding:7px; text-align:center; font-weight:900; color:#dc2626;">${TASK_KPI_SCORES.OVERDUE_LE_3}</td></tr>
            <tr><td style="border:1px solid #cbd5e1; padding:7px;">Chậm / quá hạn trên 3 ngày</td><td style="border:1px solid #cbd5e1; padding:7px; text-align:center; font-weight:900; color:#b91c1c;">${TASK_KPI_SCORES.OVERDUE_GT_3}</td></tr>
          </tbody>
        </table>
      </div>
      <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:7px; padding:10px; margin-bottom:8px;">
        <b>Điểm trung bình của đơn vị</b> = Tổng điểm của các nhiệm vụ / Tổng số nhiệm vụ của đơn vị.
      </div>
      <div style="font-size:12px; color:#64748b; line-height:1.5;">
        <b>Đơn vị thực hiện tốt:</b> điểm trung bình cao nhất.<br>
        <b>Đơn vị cần lưu ý:</b> điểm trung bình thấp nhất.<br>
        Nhiệm vụ chưa có thời hạn hoặc nhiệm vụ đã hoàn thành nhưng chưa xác định được thời điểm hoàn thành được tạm tính 0 điểm cho đến khi bổ sung đủ dữ liệu; nhiệm vụ đó vẫn nằm trong tổng số nhiệm vụ của đơn vị.
      </div>
    </div>`;

  if (typeof Swal !== "undefined") {
    Swal.fire({
      title: "CÁCH CHẤM ĐIỂM KPI NHIỆM VỤ",
      html,
      width: 700,
      confirmButtonText: "Đóng",
      confirmButtonColor: "#2563eb",
    });
  }
}

// =================================================================
// DASHBOARD NHIỆM VỤ THEO CƠ QUAN / ĐƠN VỊ CHỦ TRÌ
// =================================================================

// Dữ liệu assignee hiện được lưu theo dạng: [DV001] Tên đơn vị hoặc [CN001] Tên cá nhân.
// Dashboard lãnh đạo chỉ tổng hợp các nhiệm vụ giao cho mã đơn vị DV...
function getTaskUnitFromAssignee(assignee) {
  const raw = String(assignee || "").trim();
  const match = raw.match(/^\[([^\]]+)\]\s*(.+)$/);
  if (!match) return null;

  const code = String(match[1] || "").trim().toUpperCase();
  const name = String(match[2] || "").trim();

  if (!code.startsWith("DV") || !name) return null;
  return { code, name };
}

function getTaskStatusBucket(task, todayDate) {
  const status = task.status || "";
  const deadlineDate = parseTaskDateOnly(task.deadline);

  // Nhiệm vụ đã hoàn thành được tách riêng thành:
  // - done: hoàn thành đúng hạn / trước hạn
  // - doneLate: hoàn thành sau thời hạn
  if (status === "Đã hoàn thành") {
    const completedDate = taskTimestampToLocalDate(task.completedAt || task.updatedAt);
    const completedOverdueDays =
      deadlineDate && completedDate ? taskDiffDays(deadlineDate, completedDate) : null;

    return completedOverdueDays !== null && completedOverdueDays > 0
      ? "doneLate"
      : "done";
  }

  const diffDays = deadlineDate ? taskDiffDays(todayDate, deadlineDate) : null;

  if (
    status === "Chậm tiến độ" ||
    (diffDays !== null && diffDays < 0)
  ) {
    return "late";
  }

  return "doing";
}

function buildTaskUnitDashboardData() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const unitMap = new Map();

  homeTasksCache.forEach((task) => {
    const unit = getTaskUnitFromAssignee(task.assignee);
    if (!unit) return;

    if (!unitMap.has(unit.code)) {
      unitMap.set(unit.code, {
        code: unit.code,
        name: unit.name,
        total: 0,
        done: 0,
        doneLate: 0,
        doing: 0,
        upcoming: 0,
        late: 0,
        kpiTotalScore: 0,
        kpiScoredTasks: 0,
        kpiUnscoredTasks: 0,
      });
    }

    const stat = unitMap.get(unit.code);
    const bucket = getTaskStatusBucket(task, today);

    stat.total++;
    stat[bucket]++;
    if (bucket === "doing") {
      const deadlineDate = parseTaskDateOnly(task.deadline);
      if (deadlineDate) {
        const diffDays = taskDiffDays(today, deadlineDate);
        if (diffDays !== null && diffDays >= 0 && diffDays <= 3) {
          stat.upcoming++;
        }
      }
    }

    const kpi = getTaskKpiScore(task, today);
    if (kpi.scorable) {
      stat.kpiTotalScore += kpi.score;
      stat.kpiScoredTasks++;
    } else {
      stat.kpiUnscoredTasks++;
    }
  });

  taskUnitDashboardData = Array.from(unitMap.values()).map((unit) => ({
    ...unit,
    doneRate: unit.total > 0 ? unit.done / unit.total : 0,
    completedRate:
      unit.total > 0 ? (unit.done + unit.doneLate) / unit.total : 0,
    doneLateRate: unit.total > 0 ? unit.doneLate / unit.total : 0,
    lateRate: unit.total > 0 ? unit.late / unit.total : 0,
    doingNormal: Math.max(0, unit.doing - unit.upcoming),
    avgScore:
      unit.total > 0
        ? unit.kpiTotalScore / unit.total
        : 0,
  }));

  return taskUnitDashboardData;
}

function buildAllAgencyTaskUnit(units) {
  const sourceUnits = Array.isArray(units) ? units : [];
  const all = {
    code: "__ALL_AGENCY__",
    name: "TOÀN BỘ CƠ QUAN",
    total: 0,
    done: 0,
    doneLate: 0,
    doing: 0,
    upcoming: 0,
    late: 0,
    kpiTotalScore: 0,
    kpiScoredTasks: 0,
    kpiUnscoredTasks: 0,
  };

  sourceUnits.forEach((unit) => {
    all.total += Number(unit.total || 0);
    all.done += Number(unit.done || 0);
    all.doneLate += Number(unit.doneLate || 0);
    all.doing += Number(unit.doing || 0);
    all.upcoming += Number(unit.upcoming || 0);
    all.late += Number(unit.late || 0);
    all.kpiTotalScore += Number(unit.kpiTotalScore || 0);
    all.kpiScoredTasks += Number(unit.kpiScoredTasks || 0);
    all.kpiUnscoredTasks += Number(unit.kpiUnscoredTasks || 0);
  });

  all.doneRate = all.total > 0 ? all.done / all.total : 0;
  all.completedRate =
    all.total > 0 ? (all.done + all.doneLate) / all.total : 0;
  all.doneLateRate = all.total > 0 ? all.doneLate / all.total : 0;
  all.lateRate = all.total > 0 ? all.late / all.total : 0;
  all.doingNormal = Math.max(0, all.doing - all.upcoming);
  // Điểm toàn cơ quan = tổng điểm của toàn bộ nhiệm vụ / tổng số nhiệm vụ.
  // Đây là bình quân gia quyền theo số nhiệm vụ, không phải trung bình cộng điểm các đơn vị.
  all.avgScore = all.total > 0 ? all.kpiTotalScore / all.total : 0;

  return all;
}

function buildTaskUnitSummaryHtml(unit) {
  const pct = (value) =>
    unit && unit.total > 0 ? ((value / unit.total) * 100).toFixed(1) : "0.0";

  const completedTotal = (unit?.done || 0) + (unit?.doneLate || 0);
  const doingNormal = unit?.doingNormal || 0;
  const upcoming = unit?.upcoming || 0;
  const late = unit?.late || 0;

  return `
    <div class="task-unit-group">
      <div class="task-unit-group-main">
        <strong style="color:#16a34a">${completedTotal}</strong>
        <span>Đã hoàn thành</span>
      </div>
      <div class="task-unit-subgrid">
        <div class="task-unit-subitem">
          <strong style="color:#16a34a">${unit?.done || 0}</strong>
          <span>Đúng hạn (${pct(unit?.done || 0)}%)</span>
        </div>
        <div class="task-unit-subitem">
          <strong style="color:#7e22ce">${unit?.doneLate || 0}</strong>
          <span>Quá hạn (${pct(unit?.doneLate || 0)}%)</span>
        </div>
      </div>
    </div>
    <div class="task-unit-group">
      <div class="task-unit-group-main">
        <strong style="color:#d97706">${unit?.doing || 0}</strong>
        <span>Đang thực hiện</span>
      </div>
      <div class="task-unit-subgrid">
        <div class="task-unit-subitem">
          <strong style="color:#0f766e">${doingNormal}</strong>
          <span>Còn > 3 ngày (${pct(doingNormal)}%)</span>
        </div>
        <div class="task-unit-subitem">
          <strong style="color:#f59e0b">${upcoming}</strong>
          <span>Sắp đến hạn (${pct(upcoming)}%)</span>
        </div>
      </div>
    </div>
    <div class="task-unit-group">
      <div class="task-unit-group-main">
        <strong style="color:#dc2626">${late}</strong>
        <span>Chậm / quá hạn</span>
      </div>
      <div class="task-unit-subgrid one-col">
        <div class="task-unit-subitem">
          <strong style="color:#dc2626">${late}</strong>
          <span>Cần đôn đốc (${pct(late)}%)</span>
        </div>
      </div>
    </div>`;
}

function setTaskUnitCardEmpty(kind, message = "Chưa có dữ liệu nhiệm vụ theo đơn vị") {
  const prefix = `task-unit-${kind}`;
  const nameEl = document.getElementById(`${prefix}-name`);
  const totalEl = document.getElementById(`${prefix}-total`);
  const summaryEl = document.getElementById(`${prefix}-summary`);
  if (nameEl) nameEl.textContent = message;
  if (totalEl) totalEl.innerHTML = `0<span>nhiệm vụ</span>`;
  if (summaryEl) summaryEl.innerHTML = buildTaskUnitSummaryHtml({ total: 0, done: 0, doneLate: 0, doing: 0, doingNormal: 0, upcoming: 0, late: 0, avgScore: 0, kpiScoredTasks: 0 });

  if (taskUnitDashboardCharts[kind]) {
    taskUnitDashboardCharts[kind].destroy();
    taskUnitDashboardCharts[kind] = null;
  }
}

function restoreTaskUnitCardDisplay(kind) {
  const prefix = `task-unit-${kind}`;
  const nameEl = document.getElementById(`${prefix}-name`);
  const canvas = document.getElementById(`${prefix}-chart`);
  const chartWrap = canvas?.closest(".task-unit-chart-wrap");
  const summaryEl = document.getElementById(`${prefix}-summary`);

  if (chartWrap) chartWrap.style.display = "block";
  if (summaryEl) summaryEl.style.display = "grid";
  if (nameEl) {
    nameEl.style.display = "block";
    nameEl.style.minHeight = "34px";
    nameEl.style.fontSize = "13px";
    nameEl.style.fontWeight = "800";
    nameEl.style.color = "#1e293b";
    nameEl.style.textAlign = "left";
    nameEl.style.alignItems = "";
    nameEl.style.justifyContent = "";
  }
}

function setTaskUnitAttentionNone() {
  const prefix = "task-unit-attention";
  const nameEl = document.getElementById(`${prefix}-name`);
  const canvas = document.getElementById(`${prefix}-chart`);
  const chartWrap = canvas?.closest(".task-unit-chart-wrap");
  const summaryEl = document.getElementById(`${prefix}-summary`);

  if (taskUnitDashboardCharts.attention) {
    taskUnitDashboardCharts.attention.destroy();
    taskUnitDashboardCharts.attention = null;
  }

  if (chartWrap) chartWrap.style.display = "none";
  if (summaryEl) summaryEl.style.display = "none";

  if (nameEl) {
    nameEl.textContent = "KHÔNG CÓ";
    nameEl.style.display = "flex";
    nameEl.style.minHeight = "205px";
    nameEl.style.alignItems = "center";
    nameEl.style.justifyContent = "center";
    nameEl.style.textAlign = "center";
    nameEl.style.fontSize = "24px";
    nameEl.style.fontWeight = "900";
    nameEl.style.color = "#16a34a";
  }
}

function renderTaskUnitDoughnut(kind, unit) {
  if (!unit) {
    setTaskUnitCardEmpty(kind);
    return;
  }

  restoreTaskUnitCardDisplay(kind);

  const prefix = `task-unit-${kind}`;
  const canvas = document.getElementById(`${prefix}-chart`);
  const nameEl = document.getElementById(`${prefix}-name`);
  const totalEl = document.getElementById(`${prefix}-total`);
  const summaryEl = document.getElementById(`${prefix}-summary`);
  if (nameEl) {
    nameEl.textContent = `${unit.name} (${formatTaskKpiScore(unit.avgScore)} điểm)`;
  }
  if (totalEl) {
    totalEl.innerHTML = `${unit.total}<span>nhiệm vụ</span>`;
  }
  if (summaryEl) {
    summaryEl.innerHTML = buildTaskUnitSummaryHtml(unit);
  }

  if (!canvas) return;

  if (taskUnitDashboardCharts[kind]) {
    taskUnitDashboardCharts[kind].destroy();
  }

  taskUnitDashboardCharts[kind] = new Chart(canvas.getContext("2d"), {
    type: "doughnut",
    data: {
      labels: [
        "Đã hoàn thành",
        "Đã hoàn thành (quá hạn)",
        "Đang thực hiện",
        "Chậm / quá hạn",
      ],
      datasets: [
        {
          data: [unit.done, unit.doneLate, unit.doing, unit.late],
          backgroundColor: ["#16a34a", "#7e22ce", "#f59e0b", "#dc2626"],
          borderColor: "#ffffff",
          borderWidth: 3,
          hoverOffset: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "72%",
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label(context) {
              const value = Number(context.raw || 0);
              const pct = unit.total > 0 ? ((value / unit.total) * 100).toFixed(1) : "0.0";
              return `${context.label}: ${value} nhiệm vụ (${pct}%)`;
            },
          },
        },
      },
    },
  });
}

function renderSelectedTaskUnitDashboard() {
  const select = document.getElementById("task-unit-dashboard-select");
  if (!select) return;

  const selectedCode = select.value;
  let selectedUnit = null;

  if (selectedCode === "__ALL_AGENCY__") {
    selectedUnit = buildAllAgencyTaskUnit(taskUnitDashboardData);
  } else {
    selectedUnit = taskUnitDashboardData.find(
      (unit) => unit.code === selectedCode,
    );
  }

  renderTaskUnitDoughnut("selected", selectedUnit || null);
}

function renderTaskUnitDashboards() {
  const section = document.getElementById("task-unit-dashboard-section");
  if (!section) return;

  if (!canAccessHomeNoiBo()) {
    section.style.display = "none";
    taskUnitDashboardData = [];
    ["best", "attention", "selected"].forEach((kind) =>
      setTaskUnitCardEmpty(kind),
    );
    return;
  }

  section.style.display = "block";
  const units = buildTaskUnitDashboardData();

  const select = document.getElementById("task-unit-dashboard-select");
  const previousSelected = select ? select.value : "";

  if (!units.length) {
    renderTaskUnitDoughnut("best", null);
    renderTaskUnitDoughnut("attention", null);
    renderTaskUnitDoughnut("selected", null);

    if (select) {
      select.innerHTML = '<option value="">-- Chưa có đơn vị có nhiệm vụ --</option>';
    }
    return;
  }

  // XẾP HẠNG ĐƠN VỊ THEO ĐIỂM TRUNG BÌNH KPI.
  // Điểm cao nhất = thực hiện tốt; điểm thấp nhất = cần lưu ý.
  // Các tiêu chí phụ chỉ dùng để phân định khi điểm trung bình bằng nhau.
  const bestUnit = [...units].sort((a, b) => {
    if (b.avgScore !== a.avgScore) return b.avgScore - a.avgScore;
    if (b.completedRate !== a.completedRate) return b.completedRate - a.completedRate;
    if (a.lateRate !== b.lateRate) return a.lateRate - b.lateRate;
    if (b.kpiScoredTasks !== a.kpiScoredTasks) return b.kpiScoredTasks - a.kpiScoredTasks;
    return a.name.localeCompare(b.name, "vi");
  })[0];

  const attentionUnit = [...units].sort((a, b) => {
    if (a.avgScore !== b.avgScore) return a.avgScore - b.avgScore;
    if (b.lateRate !== a.lateRate) return b.lateRate - a.lateRate;
    if (a.completedRate !== b.completedRate) return a.completedRate - b.completedRate;
    if (b.kpiScoredTasks !== a.kpiScoredTasks) return b.kpiScoredTasks - a.kpiScoredTasks;
    return b.name.localeCompare(a.name, "vi");
  })[0];

  renderTaskUnitDoughnut("best", bestUnit);
  renderTaskUnitDoughnut("attention", attentionUnit);

  if (select) {
    const sortedUnits = [...units].sort((a, b) =>
      a.name.localeCompare(b.name, "vi"),
    );

    const allAgency = buildAllAgencyTaskUnit(units);

    select.innerHTML =
      '<option value="">-- Chọn đơn vị để xem dashboard --</option>';

    const allOption = document.createElement("option");
    allOption.value = "__ALL_AGENCY__";
    allOption.textContent = `TOÀN BỘ CƠ QUAN (${allAgency.total} nhiệm vụ)`;
    select.appendChild(allOption);

    sortedUnits.forEach((unit) => {
      const option = document.createElement("option");
      option.value = unit.code;
      option.textContent = `${unit.name} (${unit.total} nhiệm vụ)`;
      select.appendChild(option);
    });

    const canKeepPrevious =
      previousSelected === "__ALL_AGENCY__" ||
      sortedUnits.some((unit) => unit.code === previousSelected);

    // Lần đầu mở dashboard, mặc định hiển thị toàn bộ cơ quan để làm mốc đối chiếu.
    select.value = canKeepPrevious ? previousSelected : "__ALL_AGENCY__";
  }

  renderSelectedTaskUnitDashboard();
}

// HÀM RENDER VÀ LỌC TÌM KIẾM NHIỆM VỤ NỘI BỘ VỚI ĐẦY ĐỦ CÁC CỘT DỮ LIỆU
function renderTasksTable() {
  const tbody =
    document.getElementById("public-task-body") ||
    document.getElementById("task-report-tbody");
  const thAction = document.getElementById("th-task-action");

  if (!tbody) return;
  tbody.innerHTML = "";

  if (!canAccessHomeNoiBo()) {
    updateTaskMetrics(0, 0, 0, 0, 0, 0);
    renderTaskUnitDashboards();
    return;
  }

  const canEditStatus = canEditHomeNoiBo();
  if (thAction) {
    thAction.style.display = canEditStatus ? "table-cell" : "none";
  }

  // Lấy từ khóa tìm kiếm
  const searchInput =
    document.getElementById("public-task-search") ||
    document.getElementById("task-search");
  const keyword = searchInput ? searchInput.value.trim().toLowerCase() : "";

  // Lọc nhiệm vụ theo từ khóa
  const filteredTasks = homeTasksCache.filter((task) => {
    if (!keyword) return true;
    const name = (task.name || "").toLowerCase();
    const assignee = (task.assignee || "").toLowerCase();
    const source = (task.source || "").toLowerCase();
    const product = (task.product || "").toLowerCase();
    const note = (task.note || "").toLowerCase();

    return (
      name.includes(keyword) ||
      assignee.includes(keyword) ||
      source.includes(keyword) ||
      product.includes(keyword) ||
      note.includes(keyword)
    );
  });

  let total = 0,
    done = 0,
    doneLate = 0,
    doing = 0,
    upcoming = 0,
    late = 0;

  let index = 1;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  homeTasksCache.forEach((t) => {
    total++;
    let diffDays = null;
    if (t.deadline) {
      const deadlineDate = parseTaskDateOnly(t.deadline);
      if (deadlineDate) diffDays = taskDiffDays(today, deadlineDate);
    }

    const isDone = t.status === "Đã hoàn thành";
    const isLate =
      t.status === "Chậm tiến độ" || (diffDays !== null && diffDays < 0);

    if (isDone) {
      const deadlineDate = parseTaskDateOnly(t.deadline);
      const completedDate = taskTimestampToLocalDate(t.completedAt || t.updatedAt);
      const completedOverdueDays =
        deadlineDate && completedDate
          ? taskDiffDays(deadlineDate, completedDate)
          : null;

      if (completedOverdueDays !== null && completedOverdueDays > 0) {
        doneLate++;
      } else {
        done++;
      }
    } else if (isLate) {
      late++;
    } else {
      doing++;
      // Sắp đến hạn là tập con của các nhiệm vụ đang thực hiện: còn từ 0 đến 3 ngày.
      if (diffDays !== null && diffDays >= 0 && diffDays <= 3) upcoming++;
    }
  });

  updateTaskMetrics(total, done, doneLate, doing, upcoming, late);
  renderTaskUnitDashboards();

  if (!filteredTasks || filteredTasks.length === 0) {
    tbody.innerHTML = `<tr><td colspan="11" style="text-align:center; padding: 20px; color:#94a3b8;">Không tìm thấy dữ liệu nhiệm vụ nội bộ.</td></tr>`;
    return;
  }

  filteredTasks.forEach((task) => {
    const taskId = task.key;

    let diffDays = null;
    const deadlineDate = parseTaskDateOnly(task.deadline);
    if (deadlineDate) {
      diffDays = taskDiffDays(today, deadlineDate);
    }

    // Nếu đã hoàn thành: ưu tiên mốc completedAt mới. Với dữ liệu cũ chưa có
    // completedAt, tạm dùng updatedAt làm mốc hoàn thành gần đúng.
    const completedDate =
      task.status === "Đã hoàn thành"
        ? taskTimestampToLocalDate(task.completedAt || task.updatedAt)
        : null;
    const completedOverdueDays =
      deadlineDate && completedDate ? taskDiffDays(deadlineDate, completedDate) : null;

    let badgeColor = "#0284c7";
    let iconClass = "fa-spinner";
    let timeNoticeHtml = "";

    if (task.status === "Đã hoàn thành") {
      badgeColor = "#16a34a";
      iconClass = "fa-check";
      if (completedOverdueDays !== null && completedOverdueDays > 0) {
        timeNoticeHtml = `<div style="font-size: 11px; color: #dc2626; font-weight: bold; margin-top: 3px;"><i class="fa-solid fa-clock"></i> Quá hạn ${completedOverdueDays} ngày</div>`;
      } else {
        timeNoticeHtml = `<div style="font-size: 11px; color: #16a34a; font-weight: bold; margin-top: 3px;"><i class="fa-solid fa-circle-check"></i> Đã hoàn thành</div>`;
      }
    } else if (task.status === "Chậm tiến độ") {
      badgeColor = "#dc2626";
      iconClass = "fa-triangle-exclamation";
      if (diffDays !== null && diffDays < 0) {
        timeNoticeHtml = `<div style="font-size: 11px; color: #dc2626; font-weight: bold; margin-top: 3px;"><i class="fa-solid fa-clock"></i> Quá hạn ${Math.abs(diffDays)} ngày</div>`;
      } else {
        timeNoticeHtml = `<div style="font-size: 11px; color: #dc2626; font-weight: bold; margin-top: 3px;"><i class="fa-solid fa-triangle-exclamation"></i> Cần đôn đốc</div>`;
      }
    } else {
      if (diffDays !== null) {
        if (diffDays < 0) {
          badgeColor = "#dc2626";
          iconClass = "fa-triangle-exclamation";
          timeNoticeHtml = `<div style="font-size: 11px; color: #dc2626; font-weight: bold; margin-top: 3px;"><i class="fa-solid fa-clock"></i> Quá hạn ${Math.abs(diffDays)} ngày</div>`;
        } else if (diffDays <= 3) {
          badgeColor = "#ea580c";
          iconClass = "fa-clock";
          timeNoticeHtml = `<div style="font-size: 11px; color: #ea580c; font-weight: bold; margin-top: 3px;"><i class="fa-solid fa-hourglass-half"></i> Còn ${diffDays} ngày</div>`;
        } else if (diffDays <= 7) {
          badgeColor = "#ca8a04";
          iconClass = "fa-clock";
          timeNoticeHtml = `<div style="font-size: 11px; color: #ca8a04; font-weight: bold; margin-top: 3px;"><i class="fa-solid fa-hourglass-half"></i> Còn ${diffDays} ngày</div>`;
        } else {
          badgeColor = "#0284c7";
          iconClass = "fa-spinner";
          timeNoticeHtml = `<div style="font-size: 11px; color: #0284c7; font-weight: bold; margin-top: 3px;"><i class="fa-solid fa-calendar-day"></i> Còn ${diffDays} ngày</div>`;
        }
      }
    }

    let statusHtml = "";
    if (canEditStatus) {
      statusHtml = `
        <div style="display: flex; flex-direction: column; align-items: center;">
          <select id="select-status-${taskId}" class="form-control" 
                  onchange="this.style.backgroundColor = this.options[this.selectedIndex].getAttribute('data-color')"
                  style="font-size: 11px; font-weight: bold; padding: 4px 6px; border-radius: 4px; color: #ffffff; background-color: ${badgeColor}; border: none; cursor: pointer; text-align: center;">
            <option value="Đang thực hiện" data-color="#0284c7" style="background-color: #ffffff; color: #333;" ${task.status === "Đang thực hiện" || !task.status ? "selected" : ""}>Đang thực hiện</option>
            <option value="Đã hoàn thành" data-color="#16a34a" style="background-color: #ffffff; color: #333;" ${task.status === "Đã hoàn thành" ? "selected" : ""}>Đã hoàn thành</option>
            <option value="Chậm tiến độ" data-color="#dc2626" style="background-color: #ffffff; color: #333;" ${task.status === "Chậm tiến độ" ? "selected" : ""}>Chậm tiến độ</option>
          </select>
          ${timeNoticeHtml}
        </div>
      `;
    } else {
      statusHtml = `
        <div style="display: flex; flex-direction: column; align-items: center;">
          <span style="background:${badgeColor}; color:#fff; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:bold; display:inline-flex; align-items:center; gap:5px; white-space:nowrap;">
            <i class="fa-solid ${iconClass}"></i> ${task.status || "Đang thực hiện"}
          </span>
          ${timeNoticeHtml}
        </div>
      `;
    }

    let actionHtml = "";
    if (canEditStatus) {
      actionHtml = `
        <td style="text-align: center; vertical-align: middle;">
          <button class="btn btn-primary" style="padding: 4px 8px; font-size: 11px; background-color: #16a34a; border-color: #16a34a;" onclick="updateTaskStatusDirect('${taskId}')">
            <i class="fa-solid fa-floppy-disk"></i> Lưu
          </button>
        </td>
      `;
    }

    const progressBar = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <div style="flex:1; background:#e2e8f0; height:8px; border-radius:4px; overflow:hidden;">
          <div style="width:${task.progress || 0}%; background:${task.progress >= 100 ? "#16a34a" : badgeColor}; height:100%;"></div>
        </div>
        <span style="font-size:12px; font-weight:bold;">${task.progress || 0}%</span>
      </div>
    `;
    const cleanAssignee = (task.assignee || "—").replace(/^\[[^\]]+\]\s*/, "");
    const tr = document.createElement("tr");
    tr.innerHTML = `
<td class="text-center" style="vertical-align: middle;">${index++}</td>
  <td style="vertical-align: middle;"><b>${task.name || "—"}</b></td>
  <td style="vertical-align: middle;"><i class="fa-solid fa-user-gear" style="color:#0284c7;"></i> ${cleanAssignee}</td>
      <td class="text-center" style="vertical-align: middle;">${task.startDate || "—"}</td>
      <td class="text-center" style="vertical-align: middle;">${task.deadline || "—"}</td>
      <td style="vertical-align: middle; color:#475569; font-style:italic;">${task.source || "—"}</td>
      <td style="vertical-align: middle;">${task.product || "—"}</td>
      <td style="vertical-align: middle;">${progressBar}</td>
      <td class="text-center" style="vertical-align: middle;">${statusHtml}</td>
      <td style="color:#475569; vertical-align: middle;">${task.note || "—"}</td>
      ${actionHtml}
    `;
    tbody.appendChild(tr);
  });

}

// HÀM LƯU TRỰC TIẾP TRẠNG THÁI TỪ BẢNG ĐỒNG BỘ NÊN FIREBASE
window.updateTaskStatusDirect = function (taskId) {
  // Phòng vệ phía giao diện: tài khoản chỉ xem không được phép gọi hàm cập nhật,
  // kể cả khi cố gọi trực tiếp từ Console. Firebase Rules vẫn là lớp bảo vệ chính.
  if (!canEditHomeNoiBo()) {
    Swal.fire(
      "Không có quyền",
      "Tài khoản này chỉ được xem Quản lý nội bộ, không có quyền cập nhật dữ liệu.",
      "warning",
    );
    return;
  }

  const selectEl = document.getElementById(`select-status-${taskId}`);
  if (!selectEl) return;

  const newStatus = selectEl.value;

  const currentTask = homeTasksCache.find((task) => task.key === taskId) || {};
  const oldStatus = currentTask.status || "Đang thực hiện";

  const updatePayload = {
    status: newStatus,
    updatedAt: firebase.database.ServerValue.TIMESTAMP,
  };

  if (newStatus === "Đã hoàn thành") {
    updatePayload.progress = 100;
    // Chỉ ghi thời điểm hoàn thành ở đúng thời điểm chuyển sang Đã hoàn thành.
    // Nếu bản ghi đã hoàn thành trước đó thì giữ nguyên completedAt lịch sử.
    if (oldStatus !== "Đã hoàn thành" || !currentTask.completedAt) {
      updatePayload.completedAt = firebase.database.ServerValue.TIMESTAMP;
    }
  } else if (oldStatus === "Đã hoàn thành" || currentTask.completedAt) {
    // Mở lại nhiệm vụ: xóa mốc hoàn thành cũ để lần hoàn thành sau ghi mốc mới.
    updatePayload.completedAt = null;
  }

  tasksRefHome
    .child(taskId)
    .update(updatePayload)
    .then(() => {
      Swal.fire({
        icon: "success",
        title: "Đã cập nhật",
        text: `Đã đổi trạng thái nhiệm vụ thành "${newStatus}".`,
        timer: 1300,
        showConfirmButton: false,
      });
    })
    .catch((err) => {
      console.error("Lỗi cập nhật trạng thái:", err);
      Swal.fire("Lỗi", "Không có quyền cập nhật trạng thái nhiệm vụ!", "error");
    });
};


// =================================================================
// CỬA SỔ CHI TIẾT KHI BẤM VÀO CÁC Ô THỐNG KÊ NHIỆM VỤ
// =================================================================
function escapeTaskMetricHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getTaskMetricInfo(task, todayDate) {
  const deadlineDate = parseTaskDateOnly(task.deadline);
  const bucket = getTaskStatusBucket(task, todayDate);
  const diffDays = deadlineDate ? taskDiffDays(todayDate, deadlineDate) : null;

  if (bucket === "doneLate") {
    const completedDate = taskTimestampToLocalDate(task.completedAt || task.updatedAt);
    const overdueDays =
      deadlineDate && completedDate ? taskDiffDays(deadlineDate, completedDate) : null;
    return {
      bucket,
      isUpcoming: false,
      detail:
        overdueDays !== null && overdueDays > 0
          ? `Hoàn thành quá hạn ${overdueDays} ngày`
          : "Đã hoàn thành (quá hạn)",
      color: "#7e22ce",
    };
  }

  if (bucket === "done") {
    return {
      bucket,
      isUpcoming: false,
      detail: "Đã hoàn thành đúng hạn",
      color: "#16a34a",
    };
  }

  if (bucket === "late") {
    const overdueDays = diffDays !== null && diffDays < 0 ? Math.abs(diffDays) : null;
    return {
      bucket,
      isUpcoming: false,
      detail: overdueDays ? `Quá hạn ${overdueDays} ngày` : "Chậm tiến độ",
      color: "#dc2626",
    };
  }

  const isUpcoming = diffDays !== null && diffDays >= 0 && diffDays <= 3;
  return {
    bucket: "doing",
    isUpcoming,
    detail:
      diffDays === null
        ? "Đang thực hiện"
        : diffDays === 0
          ? "Hết hạn hôm nay"
          : `Còn ${diffDays} ngày`,
    color: isUpcoming ? "#d97706" : "#ea580c",
  };
}

window.openTaskMetricModal = function (metricKey) {
  if (!canAccessHomeNoiBo()) {
    Swal.fire("Không có quyền", "Tài khoản này không được xem dữ liệu Quản lý nội bộ.", "warning");
    return;
  }

  const configs = {
    total: { title: "TỔNG SỐ NHIỆM VỤ", color: "#0284c7" },
    doneAll: { title: "ĐÃ HOÀN THÀNH", color: "#16a34a" },
    done: { title: "ĐÃ HOÀN THÀNH - ĐÚNG HẠN", color: "#16a34a" },
    doneLate: { title: "ĐÃ HOÀN THÀNH - QUÁ HẠN", color: "#7e22ce" },
    doing: { title: "ĐANG THỰC HIỆN", color: "#2563eb" },
    doingNormal: { title: "ĐANG THỰC HIỆN - CÒN TRÊN 3 NGÀY", color: "#2563eb" },
    upcoming: { title: "SẮP ĐẾN HẠN", color: "#d97706" },
    late: { title: "CHẬM TIẾN ĐỘ / QUÁ HẠN", color: "#dc2626" },
  };
  const config = configs[metricKey] || configs.total;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const rows = homeTasksCache
    .map((task) => ({ task, info: getTaskMetricInfo(task, today) }))
    .filter(({ info }) => {
      if (metricKey === "total") return true;
      if (metricKey === "doneAll") return info.bucket === "done" || info.bucket === "doneLate";
      if (metricKey === "upcoming") return info.bucket === "doing" && info.isUpcoming;
      if (metricKey === "doingNormal") return info.bucket === "doing" && !info.isUpcoming;
      return info.bucket === metricKey;
    });

  let bodyHtml = "";
  if (rows.length === 0) {
    bodyHtml = `
      <div style="padding:34px 15px; text-align:center; color:#64748b; font-weight:700;">
        Không có nhiệm vụ thuộc nhóm này.
      </div>`;
  } else {
    const tableRows = rows
      .map(({ task, info }, index) => {
        const assignee = (task.assignee || "—").replace(/^\[[^\]]+\]\s*/, "");
        return `
          <tr>
            <td style="text-align:center; width:44px;">${index + 1}</td>
            <td style="text-align:left; min-width:260px;"><b>${escapeTaskMetricHtml(task.name || "—")}</b></td>
            <td style="text-align:left; min-width:180px;">${escapeTaskMetricHtml(assignee)}</td>
            <td style="text-align:center; white-space:nowrap;">${escapeTaskMetricHtml(task.deadline || "—")}</td>
            <td style="text-align:left; min-width:150px; color:${info.color}; font-weight:800;">${escapeTaskMetricHtml(info.detail)}</td>
          </tr>`;
      })
      .join("");

    bodyHtml = `
      <div style="max-height:56vh; overflow:auto; border:1px solid #dbe3ec; border-radius:7px;">
        <table style="width:100%; border-collapse:collapse; font-size:12px;">
          <thead style="position:sticky; top:0; z-index:2; background:#f8fafc;">
            <tr>
              <th style="padding:9px 7px; border:1px solid #dbe3ec;">STT</th>
              <th style="padding:9px 7px; border:1px solid #dbe3ec;">TÊN NHIỆM VỤ / NỘI DUNG CÔNG VIỆC</th>
              <th style="padding:9px 7px; border:1px solid #dbe3ec;">ĐƠN VỊ / CÁN BỘ CHỦ TRÌ</th>
              <th style="padding:9px 7px; border:1px solid #dbe3ec;">THỜI HẠN</th>
              <th style="padding:9px 7px; border:1px solid #dbe3ec;">TÌNH TRẠNG</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>`;
  }

  Swal.fire({
    title: `${config.title} (${rows.length})`,
    html: bodyHtml,
    width: "min(1120px, 96vw)",
    confirmButtonText: "Đóng",
    confirmButtonColor: config.color,
    showCloseButton: true,
    customClass: { htmlContainer: "task-metric-modal-container" },
    didOpen: () => {
      const container = document.querySelector(".task-metric-modal-container");
      if (container) {
        container.style.margin = "0";
        container.style.textAlign = "left";
      }
      document.querySelectorAll(".task-metric-modal-container td").forEach((td) => {
        td.style.padding = "8px 7px";
        td.style.border = "1px solid #dbe3ec";
        td.style.verticalAlign = "middle";
      });
    },
  });
};

function updateTaskMetrics(total, done, doneLate, doing, upcoming, late) {
  const elTotal = document.getElementById("val-task-total");
  const elDoneTotal = document.getElementById("val-task-done-total");
  const elDone = document.getElementById("val-task-done");
  const elDoneLate = document.getElementById("val-task-done-late");
  const elDoing = document.getElementById("val-task-doing");
  const elDoingNormal = document.getElementById("val-task-doing-normal");
  const elUpcoming = document.getElementById("val-task-upcoming");
  const elLate = document.getElementById("val-task-late");

  if (elTotal) elTotal.textContent = total;
  if (elDoneTotal) elDoneTotal.textContent = done + doneLate;
  if (elDone) elDone.textContent = done;
  if (elDoneLate) elDoneLate.textContent = doneLate;
  if (elDoing) elDoing.textContent = doing;
  if (elDoingNormal) elDoingNormal.textContent = Math.max(0, doing - upcoming);
  if (elUpcoming) elUpcoming.textContent = upcoming;
  if (elLate) elLate.textContent = late;
}

function getColorByRatio(ratio) {
  return ratio >= 70
    ? "#16a34a"
    : ratio >= 50
      ? "#84cc16"
      : ratio >= 30
        ? "#f97316"
        : "#ef4444";
}


// Nút giải thích cách chấm điểm KPI và dropdown dashboard đơn vị.
document.addEventListener("DOMContentLoaded", () => {
  const scoringHelpBtn = document.getElementById("task-unit-scoring-help");
  if (scoringHelpBtn && !scoringHelpBtn.dataset.bound) {
    scoringHelpBtn.dataset.bound = "1";
    scoringHelpBtn.addEventListener("click", showTaskKpiScoringHelp);
  }
});
