// Tham chiếu cơ sở dữ liệu Firebase
const dangBoRef = database.ref("dang_bo");
const tasksRefHome = database.ref("tasks");

// Lưu trữ đối tượng các Chart để hủy khi vẽ lại
let chartChinhLy, chartKySo, chartPhanMem, chartHoAnThanh, timeLineChartObj;
let ageChartObj, admissionChartObj;
let knDoughnutChartInstance = null; // Biểu đồ vành khăn Kết nạp
let map;
let geojsonLayer;
let fullDataList = []; // Chứa toàn bộ bản ghi dữ liệu phục vụ bộ lọc/sắp xếp
let globalAgeData = [0, 0, 0, 0]; // Biến toàn cục lưu dữ liệu độ tuổi hiện tại

// 1. KHỞI TẠO TẤT CẢ CÁC SỰ KIỆN KHI TRANG TẢI XONG
document.addEventListener("DOMContentLoaded", () => {
  initMap();
  loadDangBoList();
  fetchStatistics();
  fetchTasksData();
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

  // Lắng nghe sự kiện tìm kiếm trên bảng
  const tableSearch = document.getElementById("table-search");
  if (tableSearch) {
    tableSearch.addEventListener("input", (e) => {
      renderTable(e.target.value);
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
firebase.auth().onAuthStateChanged((user) => {
  const sessionEmail = document.getElementById("session-email");
  const sessionRole = document.getElementById("session-role");
  const dropdownMenu = document.getElementById("user-dropdown-menu");
  const dropdownIcon = document.getElementById("user-dropdown-icon");

  if (user) {
    if (sessionEmail) sessionEmail.textContent = user.email.split("@")[0];
    if (sessionRole) sessionRole.textContent = "Quản trị hệ thống";

    if (dropdownIcon) dropdownIcon.style.display = "inline-block";
    if (dropdownMenu) dropdownMenu.style.display = "";
  } else {
    if (sessionEmail) sessionEmail.textContent = "Guest";
    if (sessionRole) sessionRole.textContent = "";

    if (dropdownIcon) dropdownIcon.style.display = "none";
    if (dropdownMenu) dropdownMenu.style.display = "none";
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
  const thaiNguyenCenter = [21.59, 105.84];
  const mapElement = document.getElementById("map");
  if (!mapElement) return;

  map = L.map("map", {
    center: thaiNguyenCenter,
    zoom: 9,
    minZoom: 6,
    maxZoom: 12,
    maxBounds: L.latLngBounds([20.7, 105.0], [22.5, 106.8]),
  });

  fetch("ThaiNguyen_xaphuong.geojson")
    .then((res) => res.json())
    .then((data) => {
      const worldCoords = [
        [-90, -180],
        [-90, 180],
        [90, 180],
        [90, -180],
      ];

      const provincialBoundaries = data.features.map(
        (f) => f.geometry.coordinates,
      );

      L.polygon([worldCoords, ...provincialBoundaries], {
        color: "none",
        fillColor: "#f1f3f6",
        fillOpacity: 1,
        interactive: false,
      }).addTo(map);

      geojsonLayer = L.geoJSON(data, {
        style: styleFeature,
        onEachFeature: onEachFeatureMap,
      }).addTo(map);

      map.fitBounds(geojsonLayer.getBounds());
    })
    .catch((err) => console.error("Lỗi tải bản đồ ranh giới: ", err));
}

function styleFeature(feature) {
  const colors = ["#2ecc71", "#f1c40f", "#e67e22", "#e74c3c"];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];
  return {
    fillColor: randomColor,
    weight: 1,
    color: "#fff",
    fillOpacity: 0.6,
  };
}

function onEachFeatureMap(feature, layer) {
  if (feature.properties) {
    const name = feature.properties.ten_xa || "Xã/Phường";
    layer.bindTooltip(`<b>Đơn vị:</b> ${name}`, { sticky: true });
  }
}

// 3. NẠP DANH SÁCH ĐẢNG BỘ VÀO BỘ LỌC DROPDOWN
function loadDangBoList() {
  const dropdown = document.getElementById("select-dangbo");
  if (!dropdown) return;

  dangBoRef.once("value", (snapshot) => {
    dropdown.innerHTML =
      '<option value="ALL">ĐẢNG BỘ TỈNH THÁI NGUYÊN</option>';
    snapshot.forEach((childSnapshot) => {
      const data = childSnapshot.val();
      const option = document.createElement("option");
      option.value = childSnapshot.key;
      option.textContent = data.ten;
      dropdown.appendChild(option);
    });
  });
}

// 4. ĐỌC DỮ LIỆU TỪ FIREBASE & CẬP NHẬT DASHBOARD
function fetchStatistics(selectedKey = "ALL") {
  dangBoRef.on("value", (snapshot) => {
    fullDataList = [];

    let tCanSoHoa = 0,
      tChinhLy = 0,
      tKySo = 0,
      tPhanMem = 0;
    let tSoTccs = 0,
      tSoChiBo = 0,
      tTongDv = 0,
      tDvChinhThuc = 0,
      tDvDuBi = 0;
    let tU30 = 0,
      t30to45 = 0,
      t46to60 = 0,
      tO60 = 0;

    snapshot.forEach((childSnapshot) => {
      const data = childSnapshot.val();
      const item = {
        key: childSnapshot.key,
        ten: data.ten,
        tongHoSo: Number(data.tongHoSo || 0),
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

    if (selectedKey === "ALL") {
      updateDashboard(tCanSoHoa, tChinhLy, tKySo, tPhanMem);
      updateTcDangDashboard(tSoTccs, tSoChiBo, tTongDv, tDvChinhThuc, tDvDuBi);
      globalAgeData = [tU30, t30to45, t46to60, tO60];
    } else {
      const target = fullDataList.find((x) => x.key === selectedKey);
      if (target) {
        updateDashboard(
          target.tongHoSo,
          target.daChinhLy,
          target.daKySo,
          target.daCapNhat,
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
    renderLineChart();
    renderTcDangVienCharts(globalAgeData);
    renderKetNapDashboard(snapshot); // Đồng thời tính toán Dashboard Kết nạp
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

// CẬP NHẬT 5 THẺ SỐ LIỆU PHÂN HỆ TỔ CHỨC ĐẢNG
function updateTcDangDashboard(soTccs, soChiBo, tongDv, dvChinhThuc, dvDuBi) {
  const elTccs = document.getElementById("val-tc-tccs");
  const elChiBo = document.getElementById("val-tc-chibo");
  const elTongDv = document.getElementById("val-tc-tong-dv");
  const elChinhThuc = document.getElementById("val-tc-dv-chinhthuc");
  const elDuBi = document.getElementById("val-tc-dv-dubi");

  if (elTccs) elTccs.textContent = Number(soTccs).toLocaleString("vi-VN");
  if (elChiBo) elChiBo.textContent = Number(soChiBo).toLocaleString("vi-VN");
  if (elTongDv) elTongDv.textContent = Number(tongDv).toLocaleString("vi-VN");
  if (elChinhThuc)
    elChinhThuc.textContent = Number(dvChinhThuc).toLocaleString("vi-VN");
  if (elDuBi) elDuBi.textContent = Number(dvDuBi).toLocaleString("vi-VN");

  const pChinhThuc = tongDv ? ((dvChinhThuc / tongDv) * 100).toFixed(1) : 0;
  const pDuBi = tongDv ? ((dvDuBi / tongDv) * 100).toFixed(1) : 0;

  const pctChinhThuc = document.getElementById("pct-tc-dv-chinhthuc");
  const pctDuBi = document.getElementById("pct-tc-dv-dubi");
  if (pctChinhThuc) pctChinhThuc.textContent = pChinhThuc + "%";
  if (pctDuBi) pctDuBi.textContent = pDuBi + "%";
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

// 6. VẼ BIỂU ĐỒ ĐƯỜNG TIMELINE
function renderLineChart() {
  const canvas = document.getElementById("timeLineChart");
  if (!canvas) return;
  if (timeLineChartObj) timeLineChartObj.destroy();

  const ctx = canvas.getContext("2d");
  timeLineChartObj = new Chart(ctx, {
    type: "line",
    data: {
      labels: [
        "01/2026",
        "02/2026",
        "03/2026",
        "04/2026",
        "05/2026",
        "06/2026",
        "07/2026",
      ],
      datasets: [
        {
          label: "Đã chuẩn hóa",
          data: [200, 600, 1000, 1500, 2000, 2250, 2327],
          borderColor: "#ea580c",
          backgroundColor: "#ea580c",
          tension: 0.3,
          borderWidth: 2,
        },
        {
          label: "Đã ký số",
          data: [100, 400, 700, 1100, 1400, 1600, 1690],
          borderColor: "#9333ea",
          backgroundColor: "#9333ea",
          tension: 0.3,
          borderWidth: 2,
        },
        {
          label: "Đã đưa lên phần mềm",
          data: [50, 250, 500, 800, 1100, 1350, 1500],
          borderColor: "#16a34a",
          backgroundColor: "#16a34a",
          tension: 0.3,
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
          labels: { boxWidth: 12, font: { size: 10 } },
        },
      },
      scales: {
        y: { grid: { color: "#f1f5f9" }, ticks: { font: { size: 10 } } },
        x: { grid: { display: false }, ticks: { font: { size: 10 } } },
      },
    },
  });
}

// 7. XỬ LÝ BẢNG THỐNG KÊ CHI TIẾT SỐ HÓA
function renderTable(searchTerm = "") {
  const tbody = document.getElementById("main-report-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const filtered = fullDataList.filter((item) =>
    item.ten.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  let sumCanSoHoa = 0,
    sumChinhLy = 0,
    sumKySo = 0,
    sumPhanMem = 0;

  filtered.forEach((item, index) => {
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
    sumChinhLy += item.daChinhLy;
    sumKySo += item.daKySo;
    sumPhanMem += item.daCapNhat;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td class="text-center">${index + 1}</td>
      <td><b>${item.ten}</b></td>
      <td class="text-right">${item.tongHoSo.toLocaleString()}</td>
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
  const topListContainer = document.getElementById("rank-top-list");
  const lowListContainer = document.getElementById("rank-low-list");

  if (!topListContainer || !lowListContainer) return;

  const sortedList = fullDataList.map((item) => {
    const percent = item.tongHoSo ? (item.daCapNhat / item.tongHoSo) * 100 : 0;
    return { ...item, percent: percent };
  });

  const sortedTop = [...sortedList]
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 5);
  const sortedLow = [...sortedList]
    .sort((a, b) => a.percent - b.percent)
    .slice(0, 5);

  topListContainer.innerHTML = "";
  sortedTop.forEach((item, index) => {
    const div = document.createElement("div");
    div.className = "rank-item";
    div.innerHTML = `
      <div class="rank-item-info">
        <span class="rank-number top-rank-num">${index + 1}</span>
        <span class="rank-name">${item.ten}</span>
      </div>
      <span class="rank-percent text-green">${item.percent.toFixed(1)}%</span>
    `;
    topListContainer.appendChild(div);
  });

  lowListContainer.innerHTML = "";
  sortedLow.forEach((item, index) => {
    const div = document.createElement("div");
    div.className = "rank-item";
    div.innerHTML = `
      <div class="rank-item-info">
        <span class="rank-number low-rank-num">${index + 1}</span>
        <span class="rank-name">${item.ten}</span>
      </div>
      <span class="rank-percent text-down">${item.percent.toFixed(1)}%</span>
    `;
    lowListContainer.appendChild(div);
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
    const labels = chartData.map((d) => d.ten);
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

// 10. TÍNH TOÁN VÀ RENDER DASHBOARD KẾT NẠP ĐẢNG VIÊN (CHUẨN INFOGRAPHIC)
// CẬP NHẬT: TÍNH TOÁN VÀ RENDER DASHBOARD KẾT NẠP THEO ĐƠN VỊ ĐƯỢC CHỌN
function renderKetNapDashboard(snapshot) {
  if (!snapshot.exists()) return;

  const selectDangBo = document.getElementById("select-dangbo");
  const selectedKey = selectDangBo ? selectDangBo.value : "ALL";

  // Lấy tên đơn vị đang chọn từ Dropdown
  let selectedUnitName = "ĐẢNG BỘ TỈNH THÁI NGUYÊN";
  if (selectDangBo && selectDangBo.selectedIndex >= 0) {
    selectedUnitName = selectDangBo.options[selectDangBo.selectedIndex].text;
  }

  // Cập nhật tên đơn vị lên banner màu đỏ
  const elUnitDisplay = document.getElementById("kn-unit-display");
  if (elUnitDisplay) {
    elUnitDisplay.textContent = `— Đơn vị: ${selectedUnitName}`;
  }

  // Biến cố định TỔNG SỐ ĐẢNG VIÊN TOÀN TỈNH
  let provinceTotalDV = 0;

  // Biến tính toán theo ĐƠN VỊ ĐƯỢC CHỌN (hoặc toàn tỉnh)
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
    const d = child.val();
    const ten = d.ten || `Đảng bộ ${key}`;

    const ct = Number(d.chiTieuKetNap || 0);
    const kn = Number(d.daKetNap || 0);
    const dv = Number(d.tongDangVien || 0);

    // Luôn cộng dồn Tổng số Đảng viên TOÀN TỈNH (không phụ thuộc bộ lọc)
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

    // Chỉ cộng dồn các chỉ số Kết nạp theo đúng đơn vị chọn (hoặc tất cả nếu chọn ALL)
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
    }

    // Render Bảng chi tiết bên dưới
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
        <td style="${cellStyle} text-align: right;">${tonGiao.toLocaleString()}</td>
      `;
      tbody.appendChild(tr);
    }
  });

  // 1. Ô TỔNG SỐ ĐẢNG VIÊN: Luôn gán tổng toàn tỉnh
  if (document.getElementById("kn-val-tong-dv")) {
    document.getElementById("kn-val-tong-dv").textContent =
      provinceTotalDV.toLocaleString();
  }

  // 2. Gán các chỉ số Kết nạp theo đơn vị được chọn
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
  if (document.getElementById("kn-text-sub-dn"))
    document.getElementById("kn-text-sub-dn").textContent =
      `Trong đó DN ngoài NN: ${sumDnNgoaiNN.toLocaleString()}`;

  if (document.getElementById("kn-val-dtts"))
    document.getElementById("kn-val-dtts").textContent =
      sumDtts.toLocaleString();
  if (document.getElementById("kn-pct-dtts"))
    document.getElementById("kn-pct-dtts").textContent =
      (sumDaKetNap > 0 ? ((sumDtts / sumDaKetNap) * 100).toFixed(2) : "0.00") +
      "% số đã kết nạp";

  if (document.getElementById("kn-val-ton-giao"))
    document.getElementById("kn-val-ton-giao").textContent =
      sumTonGiao.toLocaleString();
  if (document.getElementById("kn-pct-ton-giao"))
    document.getElementById("kn-pct-ton-giao").textContent =
      (sumDaKetNap > 0
        ? ((sumTonGiao / sumDaKetNap) * 100).toFixed(2)
        : "0.00") + "% số đã kết nạp";

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

// 11. ĐỌC DỮ LIỆU NHIỆM VỤ NỘI BỘ
function fetchTasksData() {
  tasksRefHome.on("value", (snapshot) => {
    const tbody = document.getElementById("task-report-tbody");
    if (!tbody) return;

    tbody.innerHTML = "";

    let total = 0,
      done = 0,
      doing = 0,
      late = 0;

    if (!snapshot.exists()) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 20px; color:#94a3b8;">Chưa có dữ liệu nhiệm vụ nội bộ.</td></tr>`;
      updateTaskMetrics(0, 0, 0, 0);
      return;
    }

    let index = 1;
    snapshot.forEach((child) => {
      const task = child.val();
      total++;

      if (task.status === "Đã hoàn thành") done++;
      else if (task.status === "Chậm tiến độ") late++;
      else doing++;

      let statusBadge = `<span style="background:#0284c7; color:#fff; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:bold;"><i class="fa-solid fa-spinner"></i> Đang thực hiện</span>`;
      if (task.status === "Đã hoàn thành") {
        statusBadge = `<span style="background:#16a34a; color:#fff; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:bold;"><i class="fa-solid fa-check"></i> Đã hoàn thành</span>`;
      } else if (task.status === "Chậm tiến độ") {
        statusBadge = `<span style="background:#dc2626; color:#fff; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:bold;"><i class="fa-solid fa-triangle-exclamation"></i> Chậm tiến độ</span>`;
      }

      const progressBar = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="flex:1; background:#e2e8f0; height:8px; border-radius:4px; overflow:hidden;">
            <div style="width:${task.progress || 0}%; background:${task.progress >= 100 ? "#16a34a" : "#0284c7"}; height:100%;"></div>
          </div>
          <span style="font-size:12px; font-weight:bold;">${task.progress || 0}%</span>
        </div>
      `;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="text-center">${index++}</td>
        <td><b>${task.name}</b></td>
        <td><i class="fa-solid fa-user-gear" style="color:#64748b;"></i> ${task.assignee}</td>
        <td class="text-center"><i class="fa-solid fa-calendar-day" style="color:#64748b;"></i> ${task.deadline || "—"}</td>
        <td>${progressBar}</td>
        <td class="text-center">${statusBadge}</td>
        <td style="color:#475569;">${task.note || "—"}</td>
      `;
      tbody.appendChild(tr);
    });

    updateTaskMetrics(total, done, doing, late);
  });
}

function updateTaskMetrics(total, done, doing, late) {
  const elTotal = document.getElementById("val-task-total");
  const elDone = document.getElementById("val-task-done");
  const elDoing = document.getElementById("val-task-doing");
  const elLate = document.getElementById("val-task-late");

  if (elTotal) elTotal.textContent = total;
  if (elDone) elDone.textContent = done;
  if (elDoing) elDoing.textContent = doing;
  if (elLate) elLate.textContent = late;
}
// Hàm trả về màu tương ứng với Tỷ lệ hoàn thành số hóa
function getColorByRatio(ratio) {
  return ratio >= 80
    ? "#16a34a" // Xanh lá đậm (Tốt)
    : ratio >= 60
      ? "#84cc16" // Xanh lá nhạt/Vàng xanh (Khá)
      : ratio >= 40
        ? "#f97316" // Cam (Trung bình)
        : "#ef4444"; // Đỏ (Yếu / Chưa đạt)
}
