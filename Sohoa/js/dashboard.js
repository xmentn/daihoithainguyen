import { db } from './firebase-config.js';
import { collection, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Đăng ký bộ tiện ích hiển thị số liệu lên các khối màu biểu đồ
Chart.register(ChartDataLabels);

let scanChart, clChart, trendChart;

function loadDashboardData() {
  // TỐI ƯU: Chỉ cần lắng nghe duy nhất bảng lịch sử 'progress_history' sắp xếp theo thời gian tăng dần
  const historyQuery = query(collection(db, "progress_history"), orderBy("timestamp", "asc"));

  onSnapshot(historyQuery, (querySnapshot) => {
    const labelsDates = [];
    const dataScanList = [];
    const dataChuanHoaList = [];
    const dataChinhLyList = [];

    let latestData = null; // Biến lưu trữ đợt dữ liệu gần ngày hiện tại nhất

    querySnapshot.forEach((docSnap) => {
      const log = docSnap.data();
      labelsDates.push(log.dateLabel || "");
      dataScanList.push(log.soHoaDaScan || 0);
      dataChuanHoaList.push(log.soHoaChuanHoa || 0);
      dataChinhLyList.push(log.chinhLyDaXong || 0);

      // Vì danh sách đã xếp tăng dần (asc), phần tử cuối cùng được duyệt sẽ luôn là đợt mới nhất theo thời gian
      latestData = log;
    });

    // --- 1. NẾU CÓ DỮ LIỆU, TIẾN HÀNH ĐỔ SỐ LIỆU ĐỢT MỚI NHẤT LÊN CÁC THẺ CARD ---
    if (latestData) {
      // Xử lý số liệu khối Chỉnh lý (mét) của đợt mới nhất
      const clXong = latestData.chinhLyDaXong || 0;
      const clConLai = latestData.chinhLyConLai || 0;
      const totalCl = clXong + clConLai;

      const clXongPercent = totalCl > 0 ? ((clXong / totalCl) * 100).toFixed(1) : 0;
      const clConLaiPercent = totalCl > 0 ? ((clConLai / totalCl) * 100).toFixed(1) : 0;

      document.getElementById('cl-da-xong').innerText = clXong;
      document.getElementById('cl-con-lai').innerText = clConLai;
      document.getElementById('cl-xong-percent').innerText = clXongPercent;
      document.getElementById('cl-conlai-percent').innerText = clConLaiPercent;
      document.getElementById('bar-cl-xong').style.width = clXongPercent + '%';
      document.getElementById('bar-cl-conlai').style.width = clConLaiPercent + '%';

      // Xử lý số liệu khối Số hóa (trang) của đợt mới nhất
      const shScan = latestData.soHoaDaScan || 0;
      const totalScan = latestData.tongSoCanScan || 1;
      const shChuanHoa = latestData.soHoaChuanHoa || 0;
      const totalChuanHoa = latestData.tongSoCanChuanHoa || 1;

      const scanPercent = ((shScan / totalScan) * 100).toFixed(1);
      const chuanHoaPercent = ((shChuanHoa / totalChuanHoa) * 100).toFixed(1);

      document.getElementById('sh-da-scan').innerText = shScan.toLocaleString();
      document.getElementById('sh-chuan-hoa').innerText = shChuanHoa.toLocaleString();
      document.getElementById('sh-scan-percent').innerText = scanPercent;
      document.getElementById('sh-chuanhoa-percent').innerText = chuanHoaPercent;
      document.getElementById('bar-sh-scan').style.width = scanPercent + '%';
      document.getElementById('bar-sh-chuanhoa').style.width = chuanHoaPercent + '%';

      // Vẽ lại 2 biểu đồ tĩnh phía trên dựa theo số liệu của đợt mới nhất này
      updateStaticCharts(latestData, totalCl);
    }

    // --- 2. VẼ BIỂU ĐỒ XU HƯỚNG THEO TOÀN BỘ LỊCH SỬ QUA CÁC ĐỢT ---
    updateTrendChart(labelsDates, dataScanList, dataChuanHoaList, dataChinhLyList);
  });
}

// Hàm vẽ biểu đồ cột và biểu đồ tròn tĩnh phía trên
function updateStaticCharts(data, totalCl) {
  const ctxScan = document.getElementById('scanChart').getContext('2d');
  const ctxCl = document.getElementById('clChart').getContext('2d');

  if (scanChart) scanChart.destroy();
  if (clChart) clChart.destroy();

  // Biểu đồ cột mảng Số hóa tài liệu (Đợt mới nhất)
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

  // Biểu đồ tròn tỷ lệ Chỉnh lý tài liệu (Đợt mới nhất)
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
        legend: { display: false }, // Ẩn chú thích gốc của Chart.js, sử dụng hàng chú thích HTML tự tạo
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

// Hàm vẽ biểu đồ đường diễn biến xu hướng toàn diện
function updateTrendChart(labels, scans, chuẩnHoas, chinhLys) {
  const ctxTrend = document.getElementById('trendChart').getContext('2d');
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