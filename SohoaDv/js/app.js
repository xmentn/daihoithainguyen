// Tham chiếu cơ sở dữ liệu Firebase
const dangBoRef = database.ref("dang_bo");

// Lưu trữ đối tượng các Chart để hủy khi vẽ lại
let chartChinhLy, chartKySo, chartPhanMem, chartHoAnThanh, timeLineChartObj;
let map;
let geojsonLayer;
let fullDataList = []; // Chứa toàn bộ bản ghi dữ liệu phục vụ bộ lọc/sắp xếp

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
  const sessionInfo = document.getElementById("user-session-info");
  const sessionEmail = document.getElementById("session-email");
  const sessionRole = document.getElementById("session-role");

  if (user) {
    sessionEmail.textContent = user.email.split("@")[0];
    sessionRole.textContent = "Quản trị hệ thống";
    sessionInfo.style.display = "flex";
  } else {
    sessionEmail.textContent = "Nguyễn Văn A";
    sessionRole.textContent = "Khách vãng lai";
    sessionInfo.style.display = "flex";
  }
});

// 2. Khởi tạo bản đồ nền
function initMap() {
  map = L.map("map").setView([21.59, 105.84], 9.5);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

  fetch("ThaiNguyen_xaphuong.geojson")
    .then((res) => res.json())
    .then((data) => {
      geojsonLayer = L.geoJSON(data, {
        style: styleFeature,
        onEachFeature: onEachFeatureMap,
      }).addTo(map);
    })
    .catch((err) => console.error("Lỗi tải bản đồ ranh giới: ", err));
}

// Màu sắc bản đồ động theo tiến độ (%)
function styleFeature(feature) {
  // Giả lập/Phân loại màu sắc ngẫu nhiên để minh họa bản đồ phân vùng ranh giới xã phường của anh
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

// 4. Lấy dữ liệu thống kê từ Firebase
function fetchStatistics(selectedKey = "ALL") {
  dangBoRef.once("value", (snapshot) => {
    fullDataList = [];
    let tCanSoHoa = 0,
      tChinhLy = 0,
      tKySo = 0,
      tPhanMem = 0;

    snapshot.forEach((childSnapshot) => {
      const data = childSnapshot.val();
      const item = {
        key: childSnapshot.key,
        ten: data.ten,
        tongHoSo: Number(data.tongHoSo || 0),
        daChinhLy: Number(data.daChinhLy || 0),
        daKySo: Number(data.daKySo || 0),
        daCapNhat: Number(data.daCapNhat || 0),
      };
      fullDataList.push(item);

      // Tính tổng cộng dồn cả tỉnh
      tCanSoHoa += item.tongHoSo;
      tChinhLy += item.daChinhLy;
      tKySo += item.daKySo;
      tPhanMem += item.daCapNhat;
    });

    if (selectedKey === "ALL") {
      updateDashboard(tCanSoHoa, tChinhLy, tKySo, tPhanMem);
    } else {
      const target = fullDataList.find((x) => x.key === selectedKey);
      if (target) {
        updateDashboard(
          target.tongHoSo,
          target.daChinhLy,
          target.daKySo,
          target.daCapNhat,
        );
      }
    }

    renderTable();
    renderRankings();
    renderLineChart();
  });
}

// 5. Cập nhật Dashboard và Vẽ các biểu đồ tròn rỗng (Doughnut)
function updateDashboard(canSoHoa, chinhLy, kySo, phanMem) {
  // Tính toán phần trăm
  const pChinhLy = canSoHoa ? ((chinhLy / canSoHoa) * 100).toFixed(1) : 0;
  const pKySo = canSoHoa ? ((kySo / canSoHoa) * 100).toFixed(1) : 0;
  const pPhanMem = canSoHoa ? ((phanMem / canSoHoa) * 100).toFixed(1) : 0;
  const pHoanThanh = pPhanMem; // Tỷ lệ hoàn thành thực chất dựa trên khâu cuối (đã đưa lên phần mềm)

  // Cập nhật DOM các thẻ số liệu
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

  // Hiển thị phần trăm & Phân số tỉ lệ dưới các vòng tròn
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

  // Vẽ các biểu đồ tròn
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

// Hàm vẽ vòng tròn Doughnut (Chart.js)
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

// 6. Vẽ Biểu đồ đường Timeline (Tiến độ theo thời gian)
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

  // Cập nhật giá trị chân trang (Footer tổng cộng)
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

  // Tính toán tỷ lệ phần trăm cho từng đơn vị trong danh sách
  const sortedList = fullDataList.map((item) => {
    const percent = item.tongHoSo ? (item.daCapNhat / item.tongHoSo) * 100 : 0;
    return { ...item, percent: percent };
  });

  // Sắp xếp danh sách
  const sortedTop = [...sortedList]
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 5);
  const sortedLow = [...sortedList]
    .sort((a, b) => a.percent - b.percent)
    .slice(0, 5);

  // Render Top dẫn đầu
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

  // Render Cần đôn đốc
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
