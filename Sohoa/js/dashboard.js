import { db, auth } from "./firebase-config.js";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

window.logoutUser = function () {
  signOut(auth).then(() => {
    window.location.reload();
  });
};

Chart.register(ChartDataLabels);
let scanChart, clChart, pmChart, trendChart;
let allLogs = [];
let currentFilteredLogs = []; // Lưu trữ các mốc ngày của riêng đợt đang chọn
let debounceTimer; // Bộ đếm thời gian trễ phục vụ thao tác kéo slider

function checkUserStatus() {
  onAuthStateChanged(auth, async (user) => {
    const nameContainer = document.getElementById("admin-name");
    const adminLink = document.getElementById("btn-admin-link");
    const logoutBtn = document.getElementById("btn-logout-main");
    if (user) {
      if (logoutBtn) logoutBtn.style.display = "inline-flex";
      if (adminLink) {
        adminLink.href = "admin.html";
        adminLink.innerHTML =
          "<i class='fa-solid fa-sliders'></i> Quản trị số liệu";
      }
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (
        userDoc.exists() &&
        userDoc.data().role === "admin" &&
        userDoc.data().fullName &&
        nameContainer
      ) {
        nameContainer.innerHTML = `<i class='fa-solid fa-user-shield'></i> ${userDoc.data().fullName}`;
        nameContainer.style.display = "inline-flex";
      }
    }
  });
}

function loadDashboardData() {
  checkUserStatus();

  const historyQuery = query(
    collection(db, "progress_history"),
    orderBy("timestamp", "asc"),
  );
  onSnapshot(historyQuery, (querySnapshot) => {
    allLogs = [];
    const campaignSet = new Set();

    querySnapshot.forEach((docSnap) => {
      const log = docSnap.data();
      log.id = docSnap.id;
      allLogs.push(log);
      if (log.campaignName) campaignSet.add(log.campaignName);
    });

    const selectBox = document.getElementById("select-campaign");
    if (!selectBox) return;
    const currentSelection = selectBox.value;
    selectBox.innerHTML = "";

    if (campaignSet.size === 0) {
      selectBox.innerHTML = "<option value=''>Chưa có đợt dữ liệu nào</option>";
      return;
    }

    campaignSet.forEach((camp) => {
      const opt = document.createElement("option");
      opt.value = camp;
      opt.innerText = camp;
      selectBox.appendChild(opt);
    });

    if (currentSelection && campaignSet.has(currentSelection)) {
      selectBox.value = currentSelection;
    } else {
      selectBox.value = Array.from(campaignSet).pop();
    }

    setupCampaignView(selectBox.value);
  });

  document.getElementById("select-campaign").addEventListener("change", (e) => {
    setupCampaignView(e.target.value);
  });

  // KHỞI TẠO BỘ LẮNG NGHE SỰ KIỆN KÉO THANH TRƯỢT TIMELINE
  const slider = document.getElementById("timelineRange");
  if (slider) {
    slider.addEventListener("input", (e) => {
      const index = parseInt(e.target.value);
      if (!currentFilteredLogs[index]) return;

      const selectedLog = currentFilteredLogs[index];
      const isLatest = index === currentFilteredLogs.length - 1;

      // Thay đổi nhãn thông báo mốc thời gian tức thì khi kéo
      document.getElementById("txt-slider-date-status").innerText =
        `Đang xem ngày: ${selectedLog.dateLabel} ${isLatest ? "(Mới nhất)" : "(Cũ hơn)"}`;

      // Cơ chế hoãn (Debounce) 1.5 giây: Dừng hẳn tay kéo mới vẽ lại biểu đồ và số liệu
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        renderStateData(selectedLog);
      }, 1200);
    });
  }
}

function setupCampaignView(campaignName) {
  if (!campaignName) return;

  // Lọc danh sách mốc lịch sử báo cáo của đợt được chọn
  currentFilteredLogs = allLogs.filter(
    (log) => log.campaignName === campaignName,
  );
  if (currentFilteredLogs.length === 0) return;

  // Cấu hình thanh trượt dựa theo số lượng mốc ghi nhận
  const slider = document.getElementById("timelineRange");
  if (slider) {
    const totalSteps = currentFilteredLogs.length - 1;
    slider.min = 0;
    slider.max = totalSteps;
    slider.value = totalSteps; // Mặc định nhảy tới mốc hiện tại/mới nhất ở cuối cùng
    slider.disabled = totalSteps <= 0; // Vô hiệu hóa nếu đợt chỉ có 1 bản ghi

    document.getElementById("txt-slider-start").innerText =
      `Bắt đầu (${currentFilteredLogs[0].dateLabel})`;
    document.getElementById("txt-slider-end").innerText =
      `Mới nhất (${currentFilteredLogs[totalSteps].dateLabel})`;
    document.getElementById("txt-slider-date-status").innerText =
      `Đang xem: Mới nhất (${currentFilteredLogs[totalSteps].dateLabel})`;
  }

  // Vẽ biểu đồ xu hướng đường dưới cùng trước (Biểu đồ này hiển thị cố định toàn đợt)
  const labels = currentFilteredLogs.map((l) => l.dateLabel || "");
  const scans = currentFilteredLogs.map((l) => l.soHoaDaScan || 0);
  const chuẩnHoas = currentFilteredLogs.map((l) => l.soHoaChuanHoa || 0);
  const phanMems = currentFilteredLogs.map((l) => l.soHoaPhanMem || 0);
  const chinhLys = currentFilteredLogs.map((l) => l.chinhLyDaXong || 0);
  updateTrendChart(labels, scans, chuẩnHoas, phanMems, chinhLys);

  // Đổ số liệu của bản ghi mới nhất lên các ô nhanh và 3 biểu đồ phía trên
  renderStateData(currentFilteredLogs[currentFilteredLogs.length - 1]);
}

// HÀM CHUYÊN TRÁCH ĐỔ SỐ LIỆU VÀ VẼ LẠI 3 BIỂU ĐỒ TRÊN THEO MỐC GHI NHẬN ĐƯỢC CHỌN
function renderStateData(logRecord) {
  if (!logRecord) return;

  const tongMet = logRecord.tongChinhLy || 0;
  const tongTrang = logRecord.tongSoCanScan || 0;

  document.getElementById("show-ten-dot").innerText =
    logRecord.campaignName || "";
  document.getElementById("show-tong-met").innerText = tongMet;
  document.getElementById("show-tong-trang").innerText =
    tongTrang.toLocaleString();

  // 1. Khối Chỉnh lý mét
  const clXong = logRecord.chinhLyDaXong || 0;
  const clConLai = tongMet - clXong;
  const clPercent = tongMet > 0 ? ((clXong / tongMet) * 100).toFixed(1) : 0;

  document.getElementById("cl-da-xong").innerText = clXong;
  document.getElementById("cl-con-lai").innerText =
    clConLai > 0 ? clConLai.toFixed(1) : 0;
  document.getElementById("cl-xong-percent").innerText = clPercent;
  document.getElementById("bar-cl-xong").style.width = clPercent + "%";

  // 2. Khối Đã Scan trang
  const shScan = logRecord.soHoaDaScan || 0;
  const scanConLai = tongTrang - shScan;
  const scanPercent =
    tongTrang > 0 ? ((shScan / tongTrang) * 100).toFixed(1) : 0;

  document.getElementById("sh-da-scan").innerText = shScan.toLocaleString();
  document.getElementById("sh-scan-conlai").innerText =
    scanConLai > 0 ? scanConLai.toLocaleString() : 0;
  document.getElementById("sh-scan-percent").innerText = scanPercent;
  document.getElementById("bar-sh-scan").style.width = scanPercent + "%";

  // 3. Khối Chuẩn hóa trang
  const shChuanHoa = logRecord.soHoaChuanHoa || 0;
  const chuanHoaPercent =
    tongTrang > 0 ? ((shChuanHoa / tongTrang) * 100).toFixed(1) : 0;
  const chuanhoaConLai = tongTrang - shChuanHoa;

  document.getElementById("sh-chuan-hoa").innerText =
    shChuanHoa.toLocaleString();
  document.getElementById("sh-chuanhoa-percent").innerText = chuanHoaPercent;
  document.getElementById("bar-sh-chuanhoa").style.width =
    chuanHoaPercent + "%";
  if (document.getElementById("sh-chuanhoa-conlai")) {
    document.getElementById("sh-chuanhoa-conlai").innerText =
      chuanhoaConLai > 0 ? chuanhoaConLai.toLocaleString() : 0;
  }

  // 4. Khối Đã đưa lên phần mềm
  const shPhanMem = logRecord.soHoaPhanMem || 0;
  const pmConLai = tongTrang - shPhanMem;
  const pmPercent =
    tongTrang > 0 ? ((shPhanMem / tongTrang) * 100).toFixed(1) : 0;

  document.getElementById("sh-len-phan-mem").innerText =
    shPhanMem.toLocaleString();
  document.getElementById("sh-pm-percent").innerText = pmPercent;
  document.getElementById("sh-pm-conlai").innerText =
    pmConLai > 0 ? pmConLai.toLocaleString() : 0;
  document.getElementById("bar-sh-pm").style.width = pmPercent + "%";

  // Làm mới cấu trúc đồ họa hiển thị của 3 biểu đồ khuyên trên theo ngày đang chọn
  updateStaticCharts(logRecord, tongMet, tongTrang);
}

function updateStaticCharts(data, tongMet, tongTrang) {
  const ctxScan = document.getElementById("scanChart")?.getContext("2d");
  const ctxCl = document.getElementById("clChart")?.getContext("2d");
  const ctxPm = document.getElementById("pmChart")?.getContext("2d");

  if (!ctxScan || !ctxCl) return;

  if (scanChart) scanChart.destroy();
  if (clChart) clChart.destroy();
  if (pmChart) pmChart.destroy();
  // Cập nhật lại cấu hình scanChart trong js/dashboard.js
  scanChart = new Chart(ctxScan, {
    type: "bar",
    data: {
      labels: ["Đã Scan", "Chuẩn hóa"],
      datasets: [
        {
          data: [data.soHoaDaScan || 0, data.soHoaChuanHoa || 0],
          backgroundColor: ["#2ecc71", "#9b59b6"],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false, // Bắt buộc giữ false để canvas kéo dãn hết div bao ngoài
      scales: {
        y: {
          beginAtZero: true,
          grace: "10%", // Giảm bớt tỷ lệ khoảng trống thừa phía trên đỉnh cột (từ 15% xuống 10%)
          ticks: { font: { size: 11 } },
        },
        x: {
          grid: { display: false },
        },
      },
      plugins: {
        legend: { display: false },
        datalabels: {
          anchor: "end",
          align: "top",
          formatter: (v) => v.toLocaleString(),
          font: { weight: "bold" },
        },
      },
      layout: {
        padding: {
          top: 20, // Khoảng cách từ đỉnh số số liệu đến mép trên tiêu đề biểu đồ
          bottom: 0, // Đặt bằng 0 để kéo sát nhãn Đã Scan / Chuẩn hóa xuống đáy
          left: 5,
          right: 5,
        },
      },
    },
  });

  const clXong = data.chinhLyDaXong || 0;
  const clConLai = tongMet - clXong;
  clChart = new Chart(ctxCl, {
    type: "pie",
    data: {
      labels: ["Đã chỉnh lý xong", "Còn lại sơ bộ"],
      datasets: [
        {
          data: [clXong, clConLai > 0 ? clConLai : 0],
          backgroundColor: ["#2b78e4", "#f27a1a"],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      radius: "100%",
      plugins: {
        legend: { display: false },
        datalabels: {
          formatter: (value) => {
            let total = clXong + (clConLai > 0 ? clConLai : 0);
            return total > 0 ? ((value / total) * 100).toFixed(1) + "%" : "0%";
          },
          color: "#ffffff",
          font: { weight: "bold", size: 12 },
        },
      },
    },
  });

  if (ctxPm) {
    const pmXong = data.soHoaPhanMem || 0;
    const pmConLai = tongTrang - pmXong;
    pmChart = new Chart(ctxPm, {
      type: "doughnut",
      data: {
        labels: ["Đã đưa lên PM", "Chưa đưa lên"],
        datasets: [
          {
            data: [pmXong, pmConLai > 0 ? pmConLai : 0],
            backgroundColor: ["#16a34a", "#cbd5e1"],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        radius: "100%",
        cutout: "65%",
        plugins: {
          legend: { display: false },
          datalabels: {
            formatter: (value) => {
              let total = pmXong + (pmConLai > 0 ? pmConLai : 0);
              return total > 0
                ? ((value / total) * 100).toFixed(1) + "%"
                : "0%";
            },
            color: (context) =>
              context.dataIndex === 0 ? "#ffffff" : "#475569",
            font: { weight: "bold", size: 11 },
          },
        },
      },
    });
  }
}

function updateTrendChart(labels, scans, chuẩnHoas, phanMems, chinhLys) {
  const ctxTrend = document.getElementById("trendChart")?.getContext("2d");
  if (!ctxTrend) return;
  if (trendChart) trendChart.destroy();

  trendChart = new Chart(ctxTrend, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Đã Scan (Trang)",
          data: scans,
          borderColor: "#2ecc71",
          tension: 0.2,
          yAxisID: "y",
        },
        {
          label: "Chuẩn hóa (Trang)",
          data: chuẩnHoas,
          borderColor: "#9b59b6",
          tension: 0.2,
          yAxisID: "y",
        },
        {
          label: "Lên PM (Trang)",
          data: phanMems,
          borderColor: "#e67e22",
          tension: 0.2,
          yAxisID: "y",
        },
        {
          label: "Chỉnh lý (Mét)",
          data: chinhLys,
          borderColor: "#2b78e4",
          tension: 0.2,
          yAxisID: "y1",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          type: "linear",
          position: "left",
          title: { display: true, text: "Số lượng Trang" },
        },
        y1: {
          type: "linear",
          position: "right",
          title: { display: true, text: "Số lượng Mét" },
          grid: { drawOnChartArea: false },
        },
      },
      plugins: {
        legend: { position: "bottom" },
        datalabels: { display: false },
      },
    },
  });
}

document.addEventListener("DOMContentLoaded", loadDashboardData);
