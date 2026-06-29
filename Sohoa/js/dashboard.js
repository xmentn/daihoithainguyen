import { db } from './firebase-config.js';
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Đăng ký plugin hiển thị số liệu với Chart.js
Chart.register(ChartDataLabels);

function loadDashboardData() {
  onSnapshot(doc(db, "progress", "current_state"), (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();

      // --- 1. Xử lý số liệu Chỉnh lý tài liệu (mét) ---
      const clXong = data.chinhLyDaXong || 0;
      const clConLai = data.chinhLyConLai || 0;
      const totalCl = clXong + clConLai;

      const clXongPercent = totalCl > 0 ? ((clXong / totalCl) * 100).toFixed(1) : 0;
      const clConLaiPercent = totalCl > 0 ? ((clConLai / totalCl) * 100).toFixed(1) : 0;

      document.getElementById('cl-da-xong').innerText = clXong;
      document.getElementById('cl-con-lai').innerText = clConLai;
      document.getElementById('cl-xong-percent').innerText = clXongPercent;
      document.getElementById('cl-conlai-percent').innerText = clConLaiPercent;
      document.getElementById('bar-cl-xong').style.width = clXongPercent + '%';
      document.getElementById('bar-cl-conlai').style.width = clConLaiPercent + '%';

      // --- 2. Xử lý số liệu Số hóa tài liệu (trang) ---
      const shScan = data.soHoaDaScan || 0;
      const totalScan = data.tongSoCanScan || 1;
      const shChuanHoa = data.soHoaChuanHoa || 0;
      const totalChuanHoa = data.tongSoCanChuanHoa || 1;

      const scanPercent = ((shScan / totalScan) * 100).toFixed(1);
      const chuanHoaPercent = ((shChuanHoa / totalChuanHoa) * 100).toFixed(1);

      document.getElementById('sh-da-scan').innerText = shScan.toLocaleString();
      document.getElementById('sh-chuan-hoa').innerText = shChuanHoa.toLocaleString();
      document.getElementById('sh-scan-percent').innerText = scanPercent;
      document.getElementById('sh-chuanhoa-percent').innerText = chuanHoaPercent;
      document.getElementById('bar-sh-scan').style.width = scanPercent + '%';
      document.getElementById('bar-sh-chuanhoa').style.width = chuanHoaPercent + '%';

      // 3. Cập nhật biểu đồ đồ họa
      updateCharts(data, totalCl);
    }
  });
}

let scanChart, clChart;
function updateCharts(data, totalCl) {
  const ctxScan = document.getElementById('scanChart').getContext('2d');
  const ctxCl = document.getElementById('clChart').getContext('2d');

  if (scanChart) scanChart.destroy();
  if (clChart) clChart.destroy();
  // --- CẤU HÌNH BIỂU ĐỒ CỘT (Số lượng trang đã số hóa) ---
  scanChart = new Chart(ctxScan, {
    type: 'bar',
    data: {
      labels: ['Đã Scan', 'Đã Chuẩn hóa'],
      datasets: [{
        // Bỏ phần 'Số lượng (Trang)' ở đây để tránh tạo nhãn thừa
        data: [data.soHoaDaScan || 0, data.soHoaChuanHoa || 0],
        backgroundColor: ['#2ecc71', '#9b59b6']
      }]
    },
    options: {
      responsive: true,
      scales: {
        x: {
          display: true, // Đảm bảo trục X hiển thị chữ "Đã Scan" và "Đã Chuẩn hóa" phẳng, ngay ngắn dưới chân cột
          grid: { display: false } // Ẩn đường lưới dọc cho biểu đồ thoáng hơn
        },
        y: {
          beginAtZero: true,
          grace: '15%' // Tạo khoảng trống phía trên đỉnh cột để không bị đè chữ số dữ liệu
        }
      },
      plugins: {
        // Ẩn hoàn toàn ô nhãn chú thích thừa thô sơ ở dưới đáy sơ đồ
        legend: { display: false },
        datalabels: {
          anchor: 'end', // Đặt số liệu nổi ở trên đầu cột
          align: 'top',
          formatter: function (value) {
            return value.toLocaleString() + " trang";
          },
          font: { weight: 'bold', size: 12 },
          color: '#2d3748'
        }
      }
    }
  });

  // --- CẤU HÌNH BIỂU ĐỒ TRÒN (Tỷ lệ chỉnh lý tài liệu) ---
  // --- CẤU HÌNH BIỂU ĐỒ TRÒN (Tỷ lệ chỉnh lý tài liệu) ---
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
      responsive: true,
      maintainAspectRatio: true,
      radius: '100%',
      plugins: {
        // ẨN CHÚ THÍCH MẶC ĐỊNH BỊ BÓ BUỘC CỦA CHART.JS GÒN TRONG KHUNG ẢO
        legend: { display: false },
        datalabels: {
          formatter: (value) => {
            let percent = totalCl > 0 ? ((value / totalCl) * 100).toFixed(1) : 0;
            return percent + '%';
          },
          color: '#ffffff',
          font: { weight: 'bold', size: 14 }
        }
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', loadDashboardData);