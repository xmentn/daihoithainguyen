import { db } from "./firebase-config.js";
import {
  doc,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

function loadDashboardData() {
  onSnapshot(doc(db, "progress", "current_state"), (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();

      // --- 1. Xử lý số liệu Chỉnh lý tài liệu (mét) ---
      const clXong = data.chinhLyDaXong || 0;
      const clConLai = data.chinhLyConLai || 0;
      const totalCl = clXong + clConLai;

      const clXongPercent =
        totalCl > 0 ? ((clXong / totalCl) * 100).toFixed(1) : 0;
      const clConLaiPercent =
        totalCl > 0 ? ((clConLai / totalCl) * 100).toFixed(1) : 0;

      // CHỈ ĐỔ PHẦN SỐ (Bỏ phần chèn chữ "mét" bằng code JS)
      document.getElementById("cl-da-xong").innerText = clXong;
      document.getElementById("cl-con-lai").innerText = clConLai;

      document.getElementById("cl-xong-percent").innerText = clXongPercent;
      document.getElementById("cl-conlai-percent").innerText = clConLaiPercent;
      document.getElementById("bar-cl-xong").style.width = clXongPercent + "%";
      document.getElementById("bar-cl-conlai").style.width =
        clConLaiPercent + "%";

      // --- 2. Xử lý số liệu Số hóa tài liệu (trang) ---
      const shScan = data.soHoaDaScan || 0;
      const totalScan = data.tongSoCanScan || 1;
      const shChuanHoa = data.soHoaChuanHoa || 0;
      const totalChuanHoa = data.tongSoCanChuanHoa || 1;

      const scanPercent = ((shScan / totalScan) * 100).toFixed(1);
      const chuanHoaPercent = ((shChuanHoa / totalChuanHoa) * 100).toFixed(1);

      // CHỈ ĐỔ PHẦN SỐ (Bỏ phần chèn chữ "trang" bằng code JS)
      document.getElementById("sh-da-scan").innerText = shScan.toLocaleString();
      document.getElementById("sh-chuan-hoa").innerText =
        shChuanHoa.toLocaleString();

      document.getElementById("sh-scan-percent").innerText = scanPercent;
      document.getElementById("sh-chuanhoa-percent").innerText =
        chuanHoaPercent;
      document.getElementById("bar-sh-scan").style.width = scanPercent + "%";
      document.getElementById("bar-sh-chuanhoa").style.width =
        chuanHoaPercent + "%";

      // 3. Cập nhật biểu đồ đồ họa
      updateCharts(data);
    }
  });
}

let scanChart, clChart;
function updateCharts(data) {
  const ctxScan = document.getElementById("scanChart").getContext("2d");
  const ctxCl = document.getElementById("clChart").getContext("2d");

  if (scanChart) scanChart.destroy();
  if (clChart) clChart.destroy();

  // Biểu đồ cột Tiến độ số hóa
  scanChart = new Chart(ctxScan, {
    type: "bar",
    data: {
      labels: ["Đã Scan", "Đã Chuẩn hóa"],
      datasets: [
        {
          label: "Số lượng (Trang)",
          data: [data.soHoaDaScan || 0, data.soHoaChuanHoa || 0],
          backgroundColor: ["#2ecc71", "#9b59b6"],
        },
      ],
    },
    options: { responsive: true },
  });

  // Biểu đồ tròn Tỷ lệ chỉnh lý
  clChart = new Chart(ctxCl, {
    type: "pie",
    data: {
      labels: ["Đã chỉnh lý xong", "Còn lại sơ bộ"],
      datasets: [
        {
          data: [data.chinhLyDaXong || 0, data.chinhLyConLai || 0],
          backgroundColor: ["#2b78e4", "#f27a1a"],
        },
      ],
    },
    options: { responsive: true, radius: "75%" },
  });
}

document.addEventListener("DOMContentLoaded", loadDashboardData);
