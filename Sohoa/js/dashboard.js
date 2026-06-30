import { db, auth } from './firebase-config.js';
import { collection, query, orderBy, onSnapshot, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

window.logoutUser = function () {
  signOut(auth).then(() => { window.location.reload(); });
};

Chart.register(ChartDataLabels);
// Khai báo thêm biến chứa đối tượng biểu đồ phần mềm toàn cục
let scanChart, clChart, pmChart, trendChart;
let allLogs = [];

function checkUserStatus() {
  onAuthStateChanged(auth, async (user) => {
    const nameContainer = document.getElementById('admin-name');
    const adminLink = document.getElementById('btn-admin-link');
    const logoutBtn = document.getElementById('btn-logout-main');
    if (user) {
      if (logoutBtn) logoutBtn.style.display = "inline-flex";
      if (adminLink) {
        adminLink.href = "admin.html";
        adminLink.innerHTML = "<i class='fa-solid fa-sliders'></i> Quản trị số liệu";
      }
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists() && userDoc.data().role === "admin" && userDoc.data().fullName && nameContainer) {
        nameContainer.innerHTML = `<i class='fa-solid fa-user-shield'></i> ${userDoc.data().fullName}`;
        nameContainer.style.display = "inline-flex";
      }
    }
  });
}

function loadDashboardData() {
  checkUserStatus();

  // Lắng nghe dữ liệu lịch sử từ Firebase
  const historyQuery = query(collection(db, "progress_history"), orderBy("timestamp", "asc"));
  onSnapshot(historyQuery, (querySnapshot) => {
    allLogs = [];
    const campaignSet = new Set();

    querySnapshot.forEach((docSnap) => {
      const log = docSnap.data();
      log.id = docSnap.id;
      allLogs.push(log);
      if (log.campaignName) campaignSet.add(log.campaignName);
    });

    const selectBox = document.getElementById('select-campaign');
    if (!selectBox) return;
    const currentSelection = selectBox.value;
    selectBox.innerHTML = "";

    if (campaignSet.size === 0) {
      selectBox.innerHTML = "<option value=''>Chưa có đợt dữ liệu nào</option>";
      return;
    }

    campaignSet.forEach(camp => {
      const opt = document.createElement('option');
      opt.value = camp;
      opt.innerText = camp;
      selectBox.appendChild(opt);
    });

    if (currentSelection && campaignSet.has(currentSelection)) {
      selectBox.value = currentSelection;
    } else {
      selectBox.value = Array.from(campaignSet).pop();
    }

    renderCampaignData(selectBox.value);
  });

  document.getElementById('select-campaign').addEventListener('change', (e) => {
    renderCampaignData(e.target.value);
  });
}

function renderCampaignData(campaignName) {
  if (!campaignName) return;

  const campLogs = allLogs.filter(log => log.campaignName === campaignName);
  if (campLogs.length === 0) return;

  // Lấy mốc báo cáo mới nhất của đợt này
  const latest = campLogs[campLogs.length - 1];

  // Lấy chỉ tiêu tổng cố định
  const tongMet = latest.tongChinhLy || 0;
  const tongTrang = latest.tongSoCanScan || 0;

  document.getElementById('show-ten-dot').innerText = campaignName;
  document.getElementById('show-tong-met').innerText = tongMet;
  document.getElementById('show-tong-trang').innerText = tongTrang.toLocaleString();

  // 1. Tính toán khối Chỉnh lý mét
  const clXong = latest.chinhLyDaXong || 0;
  const clConLai = tongMet - clXong;
  const clPercent = tongMet > 0 ? ((clXong / tongMet) * 100).toFixed(1) : 0;

  document.getElementById('cl-da-xong').innerText = clXong;
  document.getElementById('cl-con-lai').innerText = clConLai > 0 ? clConLai.toFixed(1) : 0;
  document.getElementById('cl-xong-percent').innerText = clPercent;
  document.getElementById('bar-cl-xong').style.width = clPercent + '%';

  // 2. Tính toán khối Đã Scan trang
  const shScan = latest.soHoaDaScan || 0;
  const scanConLai = tongTrang - shScan;
  const scanPercent = tongTrang > 0 ? ((shScan / tongTrang) * 100).toFixed(1) : 0;

  document.getElementById('sh-da-scan').innerText = shScan.toLocaleString();
  document.getElementById('sh-scan-conlai').innerText = scanConLai > 0 ? scanConLai.toLocaleString() : 0;
  document.getElementById('sh-scan-percent').innerText = scanPercent;
  document.getElementById('bar-sh-scan').style.width = scanPercent + '%';

  // 3. Tính toán khối Chuẩn hóa trang
  const shChuanHoa = latest.soHoaChuanHoa || 0;
  const chuanHoaPercent = tongTrang > 0 ? ((shChuanHoa / tongTrang) * 100).toFixed(1) : 0;
  const chuanhoaConLai = tongTrang - shChuanHoa;
  if (document.getElementById('sh-chuanhoa-conlai')) {
    document.getElementById('sh-chuanhoa-conlai').innerText = chuanhoaConLai > 0 ? chuanhoaConLai.toLocaleString() : 0;
  }
  document.getElementById('sh-chuan-hoa').innerText = shChuanHoa.toLocaleString();
  document.getElementById('sh-chuanhoa-percent').innerText = chuanHoaPercent;
  document.getElementById('bar-sh-chuanhoa').style.width = chuanHoaPercent + '%';

  // 4. Tính toán khối Đã đưa lên phần mềm
  const shPhanMem = latest.soHoaPhanMem || 0;
  const pmConLai = tongTrang - shPhanMem;
  const pmPercent = tongTrang > 0 ? ((shPhanMem / tongTrang) * 100).toFixed(1) : 0;

  document.getElementById('sh-len-phan-mem').innerText = shPhanMem.toLocaleString();
  document.getElementById('sh-pm-conlai').innerText = pmConLai > 0 ? pmConLai.toLocaleString() : 0;
  document.getElementById('sh-pm-percent').innerText = pmPercent;
  document.getElementById('bar-sh-pm').style.width = pmPercent + '%';

  // Gọi hàm cập nhật các biểu đồ vòng tròn bao gồm cả biểu đồ Phần mềm mới
  updateStaticCharts(latest, tongMet, tongTrang);

  // Cập nhật biểu đồ xu hướng đường chạy dài ở dưới cùng
  const labels = campLogs.map(l => l.dateLabel || "");
  const scans = campLogs.map(l => l.soHoaDaScan || 0);
  const chuẩnHoas = campLogs.map(l => l.soHoaChuanHoa || 0);
  const phanMems = campLogs.map(l => l.soHoaPhanMem || 0);
  const chinhLys = campLogs.map(l => l.chinhLyDaXong || 0);
  updateTrendChart(labels, scans, chuẩnHoas, phanMems, chinhLys);
}

function updateStaticCharts(data, tongMet, tongTrang) {
  const ctxScan = document.getElementById('scanChart')?.getContext('2d');
  const ctxCl = document.getElementById('clChart')?.getContext('2d');
  const ctxPm = document.getElementById('pmChart')?.getContext('2d');

  if (!ctxScan || !ctxCl) return;

  if (scanChart) scanChart.destroy();
  if (clChart) clChart.destroy();
  if (pmChart) pmChart.destroy();

  // 1. BIỂU ĐỒ CỘT: TIẾN ĐỘ SỐ HÓA (Đã được kéo giãn chiều cao đồng bộ)
  scanChart = new Chart(ctxScan, {
    type: 'bar',
    data: {
      labels: ['Đã Scan', 'Chuẩn hóa'],
      datasets: [{
        data: [data.soHoaDaScan || 0, data.soHoaChuanHoa || 0],
        backgroundColor: ['#2ecc71', '#9b59b6']
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false, // Tắt tỉ lệ mặc định để dãn theo chiều cao khung chứa
      scales: {
        y: {
          beginAtZero: true,
          grace: '15%',
          ticks: { font: { size: 11 } }
        },
        x: { grid: { display: false } }
      },
      plugins: {
        legend: { display: false },
        datalabels: { anchor: 'end', align: 'top', formatter: (v) => v.toLocaleString(), font: { weight: 'bold' } }
      },
      layout: {
        padding: { top: 30, bottom: 35 } // Căn chỉnh lề để cột cao tương đương 2 biểu đồ bên
      }
    }
  });

  // 2. BIỂU ĐỒ TRÒN: TỶ LỆ CHỈNH LÝ TÀI LIỆU
  const clXong = data.chinhLyDaXong || 0;
  const clConLai = tongMet - clXong;
  clChart = new Chart(ctxCl, {
    type: 'pie',
    data: {
      labels: ['Đã chỉnh lý xong', 'Còn lại sơ bộ'],
      datasets: [{ data: [clXong, clConLai > 0 ? clConLai : 0], backgroundColor: ['#2b78e4', '#f27a1a'] }]
    },
    options: {
      responsive: true, maintainAspectRatio: true, radius: '100%',
      plugins: {
        legend: { display: false },
        datalabels: {
          formatter: (value) => {
            let total = clXong + (clConLai > 0 ? clConLai : 0);
            return total > 0 ? ((value / total) * 100).toFixed(1) + '%' : '0%';
          },
          color: '#ffffff', font: { weight: 'bold', size: 12 }
        }
      }
    }
  });

  // 3. BIỂU ĐỒ HÌNH NHẪN (DOUGHNUT): TỶ LỆ ĐƯA LÊN PHẦN MỀM SỐ HÓA
  if (ctxPm) {
    const pmXong = data.soHoaPhanMem || 0;
    const pmConLai = tongTrang - pmXong;

    // Tính toán nhanh % đưa lên phần mềm để hiển thị ở tâm nhẫn nếu cần
    const pmPercent = tongTrang > 0 ? ((pmXong / tongTrang) * 100).toFixed(1) : '0.0';

    pmChart = new Chart(ctxPm, {
      type: 'doughnut', // CHUYỂN ĐỔI: Từ 'pie' sang 'doughnut' để tạo hình nhẫn
      data: {
        labels: ['Đã đưa lên PM', 'Chưa đưa lên'],
        datasets: [{
          data: [pmXong, pmConLai > 0 ? pmConLai : 0],
          backgroundColor: ['#16a34a', '#cbd5e1']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        radius: '100%',
        cutout: '65%', // Độ rộng khoét lỗ giữa nhẫn (65% giúp vòng nhẫn thanh thoát, đẹp mắt)
        plugins: {
          legend: { display: false },
          datalabels: {
            formatter: (value) => {
              let total = pmXong + (pmConLai > 0 ? pmConLai : 0);
              return total > 0 ? ((value / total) * 100).toFixed(1) + '%' : '0%';
            },
            color: (context) => context.dataIndex === 0 ? '#ffffff' : '#475569', // Tự đổi màu chữ theo nền nhẫn
            font: { weight: 'bold', size: 11 }
          }
        }
      }
    });
  }
}
function updateTrendChart(labels, scans, chuẩnHoas, phanMems, chinhLys) {
  const ctxTrend = document.getElementById('trendChart')?.getContext('2d');
  if (!ctxTrend) return;
  if (trendChart) trendChart.destroy();

  trendChart = new Chart(ctxTrend, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        { label: 'Đã Scan (Trang)', data: scans, borderColor: '#2ecc71', tension: 0.2, yAxisID: 'y' },
        { label: 'Chuẩn hóa (Trang)', data: chuẩnHoas, borderColor: '#9b59b6', tension: 0.2, yAxisID: 'y' },
        { label: 'Lên PM (Trang)', data: phanMems, borderColor: '#e67e22', tension: 0.2, yAxisID: 'y' },
        { label: 'Chỉnh lý (Mét)', data: chinhLys, borderColor: '#2b78e4', tension: 0.2, yAxisID: 'y1' }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: {
        y: { type: 'linear', position: 'left', title: { display: true, text: 'Số lượng Trang' } },
        y1: { type: 'linear', position: 'right', title: { display: true, text: 'Số lượng Mét' }, grid: { drawOnChartArea: false } }
      },
      plugins: { legend: { position: 'bottom' }, datalabels: { display: false } }
    }
  });
}

document.addEventListener('DOMContentLoaded', loadDashboardData);