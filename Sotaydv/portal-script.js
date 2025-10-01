const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxfvE3oRILvgdQ7NSmU7m-UjRpyrrQ2qAUWud6qsSXDZg0n0sv9LV1cH40HJaBfa0eznA/exec";

// Biến toàn cục
let trainingData = [];
let installationData = [];
let myChart = null;
const chartCanvas = document.getElementById("top10Chart");
const chartContainer = document.querySelector(".chart-container");

// HÀM VẼ BIỂU ĐỒ (ĐÃ NÂNG CẤP)
// Có thể vẽ nhiều loại biểu đồ khác nhau
function createChart(chartLabels, chartValues, datasetLabel, chartTitle) {
  if (myChart) {
    myChart.destroy();
  }

  myChart = new Chart(chartCanvas.getContext("2d"), {
    type: "bar",
    data: {
      labels: chartLabels,
      datasets: [
        {
          label: datasetLabel,
          data: chartValues,
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
          text: chartTitle,
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

  chartContainer.innerHTML = "";
  chartContainer.appendChild(chartCanvas);

  // ---- Nhánh 1: Xử lý biểu đồ TẬP HUẤN ----
  if (chartType === "tap-huan") {
    if (trainingData.length === 0) {
      chartContainer.innerHTML = "<p>Chưa có dữ liệu tập huấn.</p>";
      return;
    }

    let validData = trainingData.filter(
      (row) => row && row[2] && !isNaN(Number(row[2]))
    );

    if (topFilter === "top-cao-nhat") {
      validData.sort((a, b) => Number(b[2]) - Number(a[2]));
    } else {
      validData.sort((a, b) => Number(a[2]) - Number(b[2]));
    }

    const chartData = validData.slice(0, 10);
    createChart(
      chartData.map((row) => row[1]), // Labels (tên đơn vị)
      chartData.map((row) => Number(row[2])), // Values (số người)
      "Số người tập huấn", // Dataset Label
      "Top 10 đơn vị về số người tham gia tập huấn" // Chart Title
    );

    // ---- Nhánh 2: Xử lý biểu đồ CÀI ĐẶT ----
  } else if (chartType === "cai-dat") {
    if (installationData.length === 0) {
      chartContainer.innerHTML = "<p>Chưa có dữ liệu cài đặt.</p>";
      return;
    }

    // Tính toán tỷ lệ cho mỗi đơn vị
    let processedData = installationData
      .map((row) => {
        const unitName = row[1];
        const totalMembers = Number(row[2] || 0);
        const installedMembers = Number(row[3] || 0);
        const percentage =
          totalMembers > 0 ? (installedMembers / totalMembers) * 100 : 0;
        return { name: unitName, percentage: percentage };
      })
      .filter((item) => !isNaN(item.percentage));

    // Sắp xếp dựa trên tỷ lệ
    if (topFilter === "top-cao-nhat") {
      processedData.sort((a, b) => b.percentage - a.percentage);
    } else {
      processedData.sort((a, b) => a.percentage - b.percentage);
    }

    const chartData = processedData.slice(0, 10);
    createChart(
      chartData.map((item) => item.name), // Labels (tên đơn vị)
      chartData.map((item) => item.percentage.toFixed(1)), // Values (tỷ lệ %)
      "Tỷ lệ cài đặt (%)", // Dataset Label
      "Top 10 đơn vị về tỷ lệ cài đặt ứng dụng (%)" // Chart Title
    );
  }
}

// CHẠY SAU KHI TRANG ĐÃ TẢI XONG
document.addEventListener("DOMContentLoaded", () => {
  const chartTypeSelect = document.getElementById("chartTypeSelect");
  const topSelect = document.getElementById("topSelect");

  chartContainer.innerHTML = "<p>Đang tải dữ liệu...</p>";

  // Tải đồng thời cả 2 bộ dữ liệu
  Promise.all([
    fetch(`${SCRIPT_URL}?action=getDataTapHuan`).then((res) => res.json()),
    fetch(`${SCRIPT_URL}?action=getDataCaiDat`).then((res) => res.json()),
  ])
    .then(([tapHuanResult, caiDatResult]) => {
      if (tapHuanResult.status === "success") {
        trainingData = tapHuanResult.data;
      } else {
        console.error("Lỗi tải dữ liệu Tập huấn:", tapHuanResult.message);
      }

      if (caiDatResult.status === "success") {
        installationData = caiDatResult.data;
      } else {
        console.error("Lỗi tải dữ liệu Cài đặt:", caiDatResult.message);
      }

      // Sau khi có dữ liệu, vẽ biểu đồ lần đầu
      updateChart();
    })
    .catch((error) => {
      console.error("Lỗi nghiêm trọng khi tải dữ liệu:", error);
      chartContainer.innerHTML = "<p>Đã xảy ra lỗi khi tải dữ liệu.</p>";
    });

  // Gắn sự kiện "change" cho các dropdown
  chartTypeSelect.addEventListener("change", updateChart);
  topSelect.addEventListener("change", updateChart);
});
