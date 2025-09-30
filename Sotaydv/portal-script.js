// ===================================================================
// DÁN URL ỨNG DỤNG WEB CỦA BẠN VÀO ĐÂY
// (Sao chép từ file script.js của trang nhập liệu)
// ===================================================================
const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxfvE3oRILvgdQ7NSmU7m-UjRpyrrQ2qAUWud6qsSXDZg0n0sv9LV1cH40HJaBfa0eznA/exec";
// Biến toàn cục để lưu trữ dữ liệu và biểu đồ
let trainingData = [];
let myChart = null;
const chartCanvas = document.getElementById("top10Chart");
const chartContainer = document.querySelector(".chart-container");

// HÀM VẼ/CẬP NHẬT BIỂU ĐỒ
function createChart(chartData) {
  // Chuẩn bị dữ liệu
  const labels = chartData.map((row) => row[1]); // Tên đơn vị
  const values = chartData.map((row) => Number(row[2])); // Số người

  // Nếu đã có biểu đồ cũ, hãy hủy nó đi trước khi vẽ biểu đồ mới
  if (myChart) {
    myChart.destroy();
  }

  // Vẽ biểu đồ mới
  myChart = new Chart(chartCanvas.getContext("2d"), {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Số người tập huấn",
          data: values,
          backgroundColor: "rgba(200, 16, 46, 0.6)",
          borderColor: "rgba(200, 16, 46, 1)",
          borderWidth: 1,
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: "Thống kê số người tham gia tập huấn",
        },
      },
      scales: { x: { beginAtZero: true } },
    },
  });
}

// HÀM CHÍNH: CẬP NHẬT BIỂU ĐỒ DỰA VÀO BỘ LỌC
function updateChart() {
  const chartType = document.getElementById("chartTypeSelect").value;
  const topFilter = document.getElementById("topSelect").value;

  chartContainer.innerHTML = ""; // Xóa thông báo cũ
  chartContainer.appendChild(chartCanvas); // Thêm lại canvas

  if (chartType === "tap-huan") {
    if (trainingData.length === 0) {
      chartContainer.innerHTML = "<p>Chưa có dữ liệu tập huấn.</p>";
      return;
    }

    // Lọc dữ liệu hợp lệ
    let validData = trainingData.filter(
      (row) => row && row[2] && !isNaN(Number(row[2]))
    );

    // Sắp xếp dựa vào bộ lọc "Top"
    if (topFilter === "top-cao-nhat") {
      validData.sort((a, b) => Number(b[2]) - Number(a[2])); // Sắp xếp giảm dần
    } else {
      // top-thap-nhat
      validData.sort((a, b) => Number(a[2]) - Number(b[2])); // Sắp xếp tăng dần
    }

    // Lấy 10 dòng đầu tiên và vẽ biểu đồ
    const chartData = validData.slice(0, 10);
    createChart(chartData);
  } else if (chartType === "cai-dat") {
    // Xóa biểu đồ cũ và hiển thị thông báo
    if (myChart) myChart.destroy();
    chartContainer.innerHTML =
      '<p>Chức năng thống kê "Về cài đặt ứng dụng" đang được phát triển.</p>';
  }
}

// CHẠY SAU KHI TRANG ĐÃ TẢI XONG
document.addEventListener("DOMContentLoaded", () => {
  const chartTypeSelect = document.getElementById("chartTypeSelect");
  const topSelect = document.getElementById("topSelect");

  // 1. Tải dữ liệu từ Google Sheet một lần duy nhất
  fetch(`${SCRIPT_URL}?action=getData`)
    .then((response) => response.json())
    .then((result) => {
      if (result.status === "success") {
        trainingData = result.data; // Lưu dữ liệu vào biến toàn cục
        updateChart(); // Vẽ biểu đồ lần đầu tiên
      } else {
        throw new Error(result.message);
      }
    })
    .catch((error) => {
      console.error("Lỗi khi tải dữ liệu:", error);
      chartContainer.innerHTML = "<p>Đã xảy ra lỗi khi tải dữ liệu.</p>";
    });

  // 2. Gắn sự kiện "change" cho các dropdown
  chartTypeSelect.addEventListener("change", updateChart);
  topSelect.addEventListener("change", updateChart);
});
