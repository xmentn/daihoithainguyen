import { db, auth } from './firebase-config.js';
import { collection, query, orderBy, onSnapshot, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// ĐĂNG KÝ HÀM ĐĂNG XUẤT TOÀN CỤC NGAY TẠI TRANG CHỦ CHỐNG LỖI NOT DEFINED
window.logoutUser = function () {
  signOut(auth).then(() => {
    window.location.reload(); // Đăng xuất xong tải lại trang chủ để cập nhật giao diện ẩn/hiện nút
  }).catch((error) => {
    alert("Lỗi đăng xuất: " + error.message);
  });
};

Chart.register(ChartDataLabels);
let scanChart, clChart, trendChart;
// Hàm kiểm tra trạng thái đăng nhập để cấu hình lại các nút bấm trên thanh Header Trang chủ
function checkUserStatus() {
  onAuthStateChanged(auth, async (user) => {
    const nameContainer = document.getElementById('admin-name');
    const adminLink = document.getElementById('btn-admin-link');
    const logoutBtn = document.getElementById('btn-logout-main');

    if (user) {
      // --- TRƯỜNG HỢP: ADMIN ĐÃ ĐĂNG NHẬP ---
      if (logoutBtn) logoutBtn.style.display = "inline-flex"; // Hiện nút Đăng xuất

      // ĐỔI TÍNH NĂNG NÚT QUẢN TRỊ: Dẫn thẳng vào trang nhập liệu số liệu thay vì trang login
      if (adminLink) {
        adminLink.style.display = "inline-flex";
        adminLink.href = "admin.html"; // Đổi link sang trang quản trị dữ liệu
        adminLink.innerHTML = "<i class='fa-solid fa-sliders' style='margin-right: 5px;'></i> Quản trị số liệu"; // Đổi chữ cho chuyên nghiệp
        adminLink.style.background = "#e0f2fe";
        adminLink.style.color = "#0369a1";
        adminLink.style.borderColor = "#bae6fd";
      }

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists() && userDoc.data().fullName && nameContainer) {
          nameContainer.innerHTML = `<i class='fa-solid fa-user-shield' style='color: #0056b3; margin-right: 5px;'></i> ${userDoc.data().fullName}`;
          nameContainer.style.display = "inline-flex";
        }
      } catch (e) {
        console.error("Lỗi lấy tên user:", e);
      }
    } else {
      // --- TRƯỜNG HỢP: KHÁCH VÃNG LAI (CHƯA ĐĂNG NHẬP) ---
      if (nameContainer) nameContainer.style.display = "none";
      if (logoutBtn) logoutBtn.style.display = "none";

      // Khôi phục nút về trạng thái dẫn tới trang Đăng nhập mặc định
      if (adminLink) {
        adminLink.style.display = "inline-flex";
        adminLink.href = "login.html";
        adminLink.innerHTML = "Khu vực Quản trị";
        adminLink.style.background = ""; // Reset về css mặc định trong file style.css
        adminLink.style.color = "";
        adminLink.style.borderColor = "";
      }
    }
  });
}
function loadDashboardData() {
  // Gọi hàm kiểm tra giao diện đăng nhập
  checkUserStatus();

  // Lắng nghe trục lịch sử tiến độ sắp xếp tăng dần
  const historyQuery = query(collection(db, "progress_history"), orderBy("timestamp", "asc"));

  onSnapshot(historyQuery, (querySnapshot) => {
    const labelsDates = [];
    const dataScanList = [];
    const dataChuanHoaList = [];
    const dataChinhLyList = [];
    let latestData = null;

    querySnapshot.forEach((docSnap) => {
      const log = docSnap.data();
      labelsDates.push(log.dateLabel || "");
      dataScanList.push(log.soHoaDaScan || 0);
      dataChuanHoaList.push(log.soHoaChuanHoa || 0);
      dataChinhLyList.push(log.chinhLyDaXong || 0);
      latestData = log; // Phần tử cuối cùng là đợt mới nhất theo thời gian
    });

    // --- ĐỔ DỮ LIỆU ĐỢT MỚI NHẤT LÊN CÁC THẺ CARD TIẾN ĐỘ ---
    if (latestData) {
      const clXong = latestData.chinhLyDaXong || 0;
      const clConLai = latestData.chinhLyConLai || 0;
      const totalCl = clXong + clConLai;

      const clXongPercent = totalCl > 0 ? ((clXong / totalCl) * 100).toFixed(1) : 0;
      const clConLaiPercent = totalCl > 0 ? ((clConLai / totalCl) * 100).toFixed(1) : 0;

      if (document.getElementById('cl-da-xong')) document.getElementById('cl-da-xong').innerText = clXong;
      if (document.getElementById('cl-con-lai')) document.getElementById('cl-con-lai').innerText = clConLai;
      if (document.getElementById('cl-xong-percent')) document.getElementById('cl-xong-percent').innerText = clXongPercent;
      if (document.getElementById('cl-conlai-percent')) document.getElementById('cl-conlai-percent').innerText = clConLaiPercent;
      if (document.getElementById('bar-cl-xong')) document.getElementById('bar-cl-xong').style.width = clXongPercent + '%';
      if (document.getElementById('bar-cl-conlai')) document.getElementById('bar-cl-conlai').style.width = clConLaiPercent + '%';

      const shScan = latestData.soHoaDaScan || 0;
      const totalScan = latestData.tongSoCanScan || 1;
      const shChuanHoa = latestData.soHoaChuanHoa || 0;
      const totalChuanHoa = latestData.tongSoCanChuanHoa || 1;

      const scanPercent = ((shScan / totalScan) * 100).toFixed(1);
      const chuanHoaPercent = ((shChuanHoa / totalChuanHoa) * 100).toFixed(1);

      if (document.getElementById('sh-da-scan')) document.getElementById('sh-da-scan').innerText = shScan.toLocaleString();
      if (document.getElementById('sh-chuan-hoa')) document.getElementById('sh-chuan-hoa').innerText = shChuanHoa.toLocaleString();
      if (document.getElementById('sh-scan-percent')) document.getElementById('sh-scan-percent').innerText = scanPercent;
      if (document.getElementById('sh-chuanhoa-percent')) document.getElementById('sh-chuanhoa-percent').innerText = chuanHoaPercent;
      if (document.getElementById('bar-sh-scan')) document.getElementById('bar-sh-scan').style.width = scanPercent + '%';
      if (document.getElementById('bar-sh-chuanhoa')) document.getElementById('bar-sh-chuanhoa').style.width = chuanHoaPercent + '%';

      updateStaticCharts(latestData, totalCl);
    } else {
      // Trường hợp DB trống trơn chưa có đợt nào, xóa chữ "Đang tải..."
      const cards = ['cl-da-xong', 'cl-con-lai', 'sh-da-scan', 'sh-chuan-hoa'];
      cards.forEach(id => { if (document.getElementById(id)) document.getElementById(id).innerText = "0"; });
    }

    // VẼ BIỂU ĐỒ XU HƯỚNG
    updateTrendChart(labelsDates, dataScanList, dataChuanHoaList, dataChinhLyList);
  }, (error) => {
    console.error("Lỗi Firebase lắng nghe tiến độ:", error);
  });
}

function updateStaticCharts(data, totalCl) {
  const ctxScan = document.getElementById('scanChart')?.getContext('2d');
  const ctxCl = document.getElementById('clChart')?.getContext('2d');

  if (!ctxScan || !ctxCl) return;

  if (scanChart) scanChart.destroy();
  if (clChart) clChart.destroy();

  scanChart = new Chart(ctxScan, {
    type: 'bar',
    data: {
      labels: ['Đã Scan', 'Đã Chuẩn hóa'],
      datasets: [{
        data: [data.soHoaDaScan || 0, data.soHoaChuanHoa || 0],
        backgroundColor: ['#2ecc71', '#9b59b6']
      }]
    },
    options: {
      responsive: true,
      scales: {
        x: { display: true, grid: { display: false } },
        y: { beginAtZero: true, grace: '15%' }
      },
      plugins: {
        legend: { display: false },
        datalabels: {
          anchor: 'end', align: 'top',
          formatter: (val) => val.toLocaleString() + " trang",
          font: { weight: 'bold', size: 11 },
          color: '#2d3748'
        }
      }
    }
  });

  clChart = new Chart(ctxCl, {
    type: 'pie',
    data: {
      labels: ['Đã chỉnh lý xong', 'Còn lại sơ bộ'],
      datasets: [{
        data: [data.chinhLyDaXong || 0, data.chinhLyConLai || 0],
        backgroundColor: ['#2b78e4', '#f27a1a']
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: true, radius: '100%',
      plugins: {
        legend: { display: false },
        datalabels: {
          formatter: (value) => {
            let percent = totalCl > 0 ? ((value / totalCl) * 100).toFixed(1) : 0;
            return percent + '%';
          },
          color: '#ffffff', font: { weight: 'bold', size: 13 }
        }
      }
    }
  });
}

function updateTrendChart(labels, scans, chuẩnHoas, chinhLys) {
  const ctxTrend = document.getElementById('trendChart')?.getContext('2d');
  if (!ctxTrend) return;
  if (trendChart) trendChart.destroy();

  trendChart = new Chart(ctxTrend, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Tiến độ Đã Scan (Trang)',
          data: scans,
          borderColor: '#2ecc71',
          backgroundColor: 'rgba(46, 204, 113, 0.1)',
          tension: 0.3,
          yAxisID: 'y'
        },
        {
          label: 'Tiến độ Chuẩn hóa (Trang)',
          data: chuẩnHoas,
          borderColor: '#9b59b6',
          backgroundColor: 'rgba(155, 89, 182, 0.1)',
          tension: 0.3,
          yAxisID: 'y'
        },
        {
          label: 'Đã Chỉnh lý (Mét)',
          data: chinhLys,
          borderColor: '#2b78e4',
          backgroundColor: 'rgba(43, 120, 228, 0.1)',
          tension: 0.3,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          type: 'linear', display: true, position: 'left',
          title: { display: true, text: 'Số lượng Số hóa (Trang)', font: { weight: 'bold' } }
        },
        y1: {
          type: 'linear', display: true, position: 'right',
          title: { display: true, text: 'Khối lượng Chỉnh lý (Mét)', font: { weight: 'bold' } },
          grid: { drawOnChartArea: false }
        }
      },
      plugins: {
        legend: { position: 'bottom' },
        datalabels: {
          align: 'top',
          font: { size: 10, weight: '500' },
          formatter: (val) => val.toLocaleString()
        }
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', loadDashboardData);