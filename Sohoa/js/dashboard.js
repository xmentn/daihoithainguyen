import { db } from "./firebase-config.js";
import {
  doc,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Lắng nghe dữ liệu thời gian thực từ Firestore
function loadDashboardData() {
  onSnapshot(doc(db, "progress", "current_state"), (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();

      // Cập nhật số liệu text lên UI
      document.getElementById("cl-da-xong").innerText =
        data.chinhLyDaXong + " mét";
      document.getElementById("cl-con-lai").innerText =
        data.chinhLyConLai + " mét";
      document.getElementById("sh-da-scan").innerText =
        data.soHoaDaScan.toLocaleString() + " trang";
      document.getElementById("sh-chuan-hoa").innerText =
        data.soHoaChuanHoa.toLocaleString() + " trang";

      // Vẽ/Cập nhật biểu đồ số hóa
      updateCharts(data);
    } else {
      console.log("Chưa có dữ liệu khởi tạo trên Firestore.");
    }
  });
}

let scanChart, clChart;
function updateCharts(data) {
  const ctxScan = document.getElementById("scanChart").getContext("2d");
  const ctxCl = document.getElementById("clChart").getContext("2d");

  if (scanChart) scanChart.destroy();
  if (clChart) clChart.destroy();

  // Biểu đồ Tiến độ số hóa (trang) [cite: 3]
  scanChart = new Chart(ctxScan, {
    type: "bar",
    data: {
      labels: ["Đã Scan", "Đã Biên mục & Chuẩn hóa"],
      datasets: [
        {
          label: "Số lượng (Trang)",
          data: [data.soHoaDaScan, data.soHoaChuanHoa],
          backgroundColor: ["#3498db", "#2ecc71"],
        },
      ],
    },
    options: { responsive: true },
  });

  // Biểu đồ Chỉnh lý tài liệu (mét) [cite: 2]
  clChart = new Chart(ctxCl, {
    type: "pie",
    data: {
      labels: ["Đã chỉnh lý xong", "Còn lại sơ bộ"],
      datasets: [
        {
          data: [data.chinhLyDaXong, data.chinhLyConLai],
          backgroundColor: ["#2ecc71", "#e74c3c"],
        },
      ],
    },
    options: { responsive: true },
  });
}

document.addEventListener("DOMContentLoaded", loadDashboardData);
