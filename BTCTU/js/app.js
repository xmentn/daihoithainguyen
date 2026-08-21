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
    updateTaskMetrics(0, 0, 0, 0, 0);
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

  if (document.getElementById("kn-val-hssv"))
    document.getElementById("kn-val-hssv").textContent =
      sumTongHSSV.toLocaleString();
  if (document.getElementById("kn-pct-hssv"))
    document.getElementById("kn-pct-hssv").textContent =
      (sumDaKetNap > 0
        ? ((sumTongHSSV / sumDaKetNap) * 100).toFixed(2)
        : "0.00") + "% số đã kết nạp";

  if (document.getElementById("kn-val-dn"))
    document.getElementById("kn-val-dn").textContent =
      sumTongDN.toLocaleString();
  if (document.getElementById("kn-pct-dn"))
    document.getElementById("kn-pct-dn").textContent =
      (sumDaKetNap > 0
        ? ((sumTongDN / sumDaKetNap) * 100).toFixed(2)
        : "0.00") + "% số đã kết nạp";

  const sumGroupNgoaiNN = sumDnNgoaiNN + sumNldKdc + sumHtx;
  if (document.getElementById("kn-text-sub-dn"))
    document.getElementById("kn-text-sub-dn").textContent =
      `Trong đó DN ngoài NN: ${sumGroupNgoaiNN.toLocaleString()}`;

  if (document.getElementById("kn-val-dtts"))
    document.getElementById("kn-val-dtts").textContent =
      sumDtts.toLocaleString();
  if (document.getElementById("kn-pct-dtts"))
    document.getElementById("kn-pct-dtts").textContent =
      (sumDaKetNap > 0 ? ((sumDtts / sumDaKetNap) * 100).toFixed(2) : "0.00") +
      "% số đã kết nạp";

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
      updateTaskMetrics(0, 0, 0, 0, 0);
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

// HÀM RENDER VÀ LỌC TÌM KIẾM NHIỆM VỤ NỘI BỘ VỚI ĐẦY ĐỦ CÁC CỘT DỮ LIỆU
function renderTasksTable() {
  const tbody =
    document.getElementById("public-task-body") ||
    document.getElementById("task-report-tbody");
  const thAction = document.getElementById("th-task-action");

  if (!tbody) return;
  tbody.innerHTML = "";

  if (!canAccessHomeNoiBo()) {
    updateTaskMetrics(0, 0, 0, 0, 0);
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
    const isLate = t.status === "Chậm tiến độ" || (diffDays !== null && diffDays < 0);

    if (isDone) {
      done++;
    } else if (isLate) {
      late++;
    } else {
      doing++;
      // Sắp đến hạn là tập con của các nhiệm vụ đang thực hiện: còn từ 0 đến 3 ngày.
      if (diffDays !== null && diffDays >= 0 && diffDays <= 3) upcoming++;
    }
  });

  updateTaskMetrics(total, done, doing, upcoming, late);

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

function updateTaskMetrics(total, done, doing, upcoming, late) {
  const elTotal = document.getElementById("val-task-total");
  const elDone = document.getElementById("val-task-done");
  const elDoing = document.getElementById("val-task-doing");
  const elUpcoming = document.getElementById("val-task-upcoming");
  const elLate = document.getElementById("val-task-late");

  if (elTotal) elTotal.textContent = total;
  if (elDone) elDone.textContent = done;
  if (elDoing) elDoing.textContent = doing;
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
