// Tham chiếu cơ sở dữ liệu Firebase
const dangBoRef = database.ref("dang_bo");
const tasksRefHome = database.ref("tasks");
// Lưu trữ đối tượng các Chart để hủy khi vẽ lại
let chartChinhLy, chartKySo, chartPhanMem, chartHoAnThanh, timeLineChartObj;
let ageChartObj, admissionChartObj;
let map;
let geojsonLayer;
let fullDataList = []; // Chứa toàn bộ bản ghi dữ liệu phục vụ bộ lọc/sắp xếp
let globalAgeData = [0, 0, 0, 0]; // Biến toàn cục lưu dữ liệu độ tuổi hiện tại

document.addEventListener("DOMContentLoaded", () => {
  initMap();
  loadDangBoList();
  fetchStatistics();

  // Xử lý sự kiện thay đổi đơn vị trên dropdown bộ lọc
  document.getElementById("select-dangbo").addEventListener("change", (e) => {
    fetchStatistics(e.target.value);
  });

  // Sự kiện làm mới dữ liệu
  document.getElementById("btn-reload-data").addEventListener("click", () => {
    fetchStatistics(document.getElementById("select-dangbo").value);
    Swal.fire({
      icon: "success",
      title: "Đã cập nhật",
      text: "Số liệu hệ thống vừa được tải lại thời gian thực.",
      timer: 1200,
      showConfirmButton: false,
    });
  });

  // Lắng nghe sự kiện tìm kiếm trên bảng
  document.getElementById("table-search").addEventListener("input", (e) => {
    renderTable(e.target.value);
  });
});

// 1. Kiểm tra trạng thái đăng nhập để hiển thị phiên tại banner
firebase.auth().onAuthStateChanged((user) => {
  const sessionEmail = document.getElementById("session-email");
  const sessionRole = document.getElementById("session-role");
  const dropdownMenu = document.getElementById("user-dropdown-menu");
  const dropdownIcon = document.getElementById("user-dropdown-icon");

  if (user) {
    // Trường hợp ĐÃ ĐĂNG NHẬP
    sessionEmail.textContent = user.email.split("@")[0];
    sessionRole.textContent = "Quản trị hệ thống";

    if (dropdownIcon) dropdownIcon.style.display = "inline-block";
    if (dropdownMenu) dropdownMenu.style.display = "";
  } else {
    // Trường hợp CHƯA ĐĂNG NHẬP
    sessionEmail.textContent = "Guest";
    sessionRole.textContent = "";

    if (dropdownIcon) dropdownIcon.style.display = "none";
    if (dropdownMenu) dropdownMenu.style.display = "none";
  }
});

// Xử lý nút Đăng xuất trên banner trang chủ
document.addEventListener("DOMContentLoaded", () => {
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
});

// 2. Khởi tạo bản đồ nền Leaflet
function initMap() {
  const thaiNguyenCenter = [21.59, 105.84];

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

      const provincialBoundaries = data.features.map((f) => {
        return f.geometry.coordinates;
      });

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

// 3. Nạp danh sách Đảng bộ vào bộ lọc Dropdown
function loadDangBoList() {
  const dropdown = document.getElementById("select-dangbo");
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

// 4. Đọc dữ liệu từ Firebase & Cập nhật Dashboard cả 2 Phân hệ
function fetchStatistics(selectedKey = "ALL") {
  dangBoRef.once("value", (snapshot) => {
    fullDataList = [];

    // Biến cộng dồn Phân hệ 1: Số hóa hồ sơ
    let tCanSoHoa = 0,
      tChinhLy = 0,
      tKySo = 0,
      tPhanMem = 0;

    // Biến cộng dồn Phân hệ 2: Tổ chức đảng & Đảng viên
    let tSoTccs = 0,
      tSoChiBo = 0,
      tTongDv = 0,
      tDvChinhThuc = 0,
      tDvDuBi = 0;

    // Biến cộng dồn Độ tuổi Toàn tỉnh
    let tU30 = 0,
      t30to45 = 0,
      t46to60 = 0,
      tO60 = 0;

    snapshot.forEach((childSnapshot) => {
      const data = childSnapshot.val();
      const item = {
        key: childSnapshot.key,
        ten: data.ten,
        // Phân hệ 1
        tongHoSo: Number(data.tongHoSo || 0),
        daChinhLy: Number(data.daChinhLy || 0),
        daKySo: Number(data.daKySo || 0),
        daCapNhat: Number(data.daCapNhat || 0),
        // Phân hệ 2
        soTccsDang: Number(data.soTccsDang || 0),
        soChiBo: Number(data.soChiBo || 0),
        tongDangVien: Number(data.tongDangVien || 0),
        dvChinhThuc: Number(data.dvChinhThuc || 0),
        dvDuBi: Number(data.dvDuBi || 0),
        // Cơ cấu độ tuổi
        tuoiUnder30: Number(data.tuoiUnder30 || 0),
        tuoi30to45: Number(data.tuoi30to45 || 0),
        tuoi46to60: Number(data.tuoi46to60 || 0),
        tuoiOver60: Number(data.tuoiOver60 || 0),
      };
      fullDataList.push(item);

      // Cộng dồn Phân hệ 1
      tCanSoHoa += item.tongHoSo;
      tChinhLy += item.daChinhLy;
      tKySo += item.daKySo;
      tPhanMem += item.daCapNhat;

      // Cộng dồn Phân hệ 2
      tSoTccs += item.soTccsDang;
      tSoChiBo += item.soChiBo;
      tTongDv += item.tongDangVien;
      tDvChinhThuc += item.dvChinhThuc;
      tDvDuBi += item.dvDuBi;

      // Cộng dồn độ tuổi
      tU30 += item.tuoiUnder30;
      t30to45 += item.tuoi30to45;
      t46to60 += item.tuoi46to60;
      tO60 += item.tuoiOver60;
    });

    if (selectedKey === "ALL") {
      // Đổ số liệu Toàn tỉnh
      updateDashboard(tCanSoHoa, tChinhLy, tKySo, tPhanMem);
      updateTcDangDashboard(tSoTccs, tSoChiBo, tTongDv, tDvChinhThuc, tDvDuBi);
      globalAgeData = [tU30, t30to45, t46to60, tO60];
    } else {
      // Đổ số liệu đơn vị cụ thể
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
    renderTcDangVienCharts(globalAgeData); // Vẽ lại biểu đồ thực tế từ mảng globalAgeData
  });
}

// 5. Cập nhật Dashboard Phân hệ Số hóa
function updateDashboard(canSoHoa, chinhLy, kySo, phanMem) {
  const pChinhLy = canSoHoa ? ((chinhLy / canSoHoa) * 100).toFixed(1) : 0;
  const pKySo = canSoHoa ? ((kySo / canSoHoa) * 100).toFixed(1) : 0;
  const pPhanMem = canSoHoa ? ((phanMem / canSoHoa) * 100).toFixed(1) : 0;
  const pHoanThanh = pPhanMem;

  document.getElementById("val-can-so-hoa").textContent =
    canSoHoa.toLocaleString("vi-VN");
  document.getElementById("val-da-chinh-ly").textContent =
    chinhLy.toLocaleString("vi-VN");
  document.getElementById("val-da-ky-so").textContent =
    kySo.toLocaleString("vi-VN");
  document.getElementById("val-da-phan-mem").textContent =
    phanMem.toLocaleString("vi-VN");
  document.getElementById("val-ty-le-hoan-thanh").textContent =
    pHoanThanh + "%";

  document.getElementById("pct-chinh-ly").textContent = pChinhLy + "%";
  document.getElementById("pct-ky-so").textContent = pKySo + "%";
  document.getElementById("pct-phan-mem").textContent = pPhanMem + "%";
  document.getElementById("pct-hoan-thanh").textContent = pHoanThanh + "%";

  document.getElementById("ratio-chinh-ly").textContent =
    `${chinhLy.toLocaleString()} / ${canSoHoa.toLocaleString()}`;
  document.getElementById("ratio-ky-so").textContent =
    `${kySo.toLocaleString()} / ${canSoHoa.toLocaleString()}`;
  document.getElementById("ratio-phan-mem").textContent =
    `${phanMem.toLocaleString()} / ${canSoHoa.toLocaleString()}`;
  document.getElementById("ratio-hoan-thanh").textContent =
    `${phanMem.toLocaleString()} / ${canSoHoa.toLocaleString()}`;

  drawCircularChart(
    "chart-chinh-ly",
    pChinhLy,
    "#ea580c",
    chartChinhLy,
    (c) => (chartChinhLy = c),
  );
  drawCircularChart(
    "chart-ky-so",
    pKySo,
    "#9333ea",
    chartKySo,
    (c) => (chartKySo = c),
  );
  drawCircularChart(
    "chart-phan-mem",
    pPhanMem,
    "#16a34a",
    chartPhanMem,
    (c) => (chartPhanMem = c),
  );
  drawCircularChart(
    "chart-hoan-thanh",
    pHoanThanh,
    "#dc2626",
    chartHoAnThanh,
    (c) => (chartHoAnThanh = c),
  );
}

// Cập nhật 5 thẻ số liệu Phân hệ Tổ chức Đảng & Đảng viên
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
  if (chartObj) chartObj.destroy();

  const ctx = document.getElementById(canvasId).getContext("2d");
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

// 6. Vẽ Biểu đồ đường Timeline
function renderLineChart() {
  if (timeLineChartObj) timeLineChartObj.destroy();

  const ctx = document.getElementById("timeLineChart").getContext("2d");
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

// 7. Xử lý Bảng thống kê chi tiết
function renderTable(searchTerm = "") {
  const tbody = document.getElementById("main-report-tbody");
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

  document.getElementById("foot-can-so-hoa").textContent =
    sumCanSoHoa.toLocaleString();
  document.getElementById("foot-sl-chinh-ly").textContent =
    sumChinhLy.toLocaleString();
  document.getElementById("foot-sl-ky-so").textContent =
    sumKySo.toLocaleString();
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

  document.getElementById("foot-tl-chinh-ly").textContent = totChinhLyPct + "%";
  document.getElementById("foot-tl-ky-so").textContent = totKySoPct + "%";
  document.getElementById("foot-tl-phan-mem").textContent = totPhanMemPct + "%";
  document.getElementById("foot-tl-hoan-thanh").textContent =
    totPhanMemPct + "%";
}

// 8. Kết xuất bảng xếp hạng TOP DẪN ĐẦU & CẦN ĐÔN ĐỐC
function renderRankings() {
  const topListContainer = document.getElementById("rank-top-list");
  const lowListContainer = document.getElementById("rank-low-list");

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

// 9. Chuyển đổi giữa các phân hệ (Tab Switcher)
document.addEventListener("DOMContentLoaded", () => {
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

      // Khi chuyển sang Tab Tổ chức đảng, vẽ biểu đồ với mảng globalAgeData thời gian thực
      if (targetTab === "tab-tc-dang-vien") {
        renderTcDangVienCharts(globalAgeData);
      }
    });
  });
});

// 10. Hàm vẽ Biểu đồ Phân hệ Tổ chức Đảng & Đảng viên (Fix lỗi mặt buồn & hỗ trợ cuộn ngang)
function renderTcDangVienCharts(ageData = [0, 0, 0, 0]) {
  // 10.1 Biểu đồ cơ cấu độ tuổi (Hình tròn)
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

  // 10.2 Biểu đồ cột Tổng số Đảng viên theo đơn vị (Cố định chuẩn 10 - 12 đơn vị/khung nhìn)
  const canvasAdmission = document.getElementById("admissionChart");
  const chartContainer = document.getElementById("bar-chart-container");

  if (canvasAdmission && chartContainer) {
    if (admissionChartObj) admissionChartObj.destroy();

    const chartData =
      fullDataList && fullDataList.length > 0 ? fullDataList : [];
    const labels = chartData.map((d) => d.ten);
    const dataTongDV = chartData.map((d) => d.tongDangVien || 0);

    // BỘ TÍNH KÍCH THƯỚC CHUẨN:
    // Lấy chiều rộng hiện tại của khung chứa
    const wrapper = chartContainer.parentElement;
    const viewWidth = wrapper ? wrapper.clientWidth : 600;

    // Cấu hình hiển thị đúng 10 đơn vị trên 1 màn hình
    const visibleItems = 10;

    if (labels.length > visibleItems) {
      // Chiều rộng mỗi cột + khoảng trống = (Chiều rộng khung nhìn / 10)
      const itemWidth = viewWidth / visibleItems;
      // Tổng chiều rộng container = Số lượng đơn vị x Chiều rộng mỗi cột
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
            barPercentage: 0.5, // Độ rộng cột vừa vặn, cân đối
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
              maxRotation: 45, // Xoay nghiêng chữ 45 độ vừa đủ đọc
              minRotation: 30,
              autoSkip: false, // Bắt buộc hiển thị đầy đủ tên từng đơn vị ở màn hình đang cuộn
            },
          },
        },
      },
    });
  }
}
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

      // Thanh tiến độ nhỏ gọn (Progress bar)
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

// Khởi chạy khi tải trang
document.addEventListener("DOMContentLoaded", () => {
  fetchTasksData();
});
