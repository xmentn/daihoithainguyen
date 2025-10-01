const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxfvE3oRILvgdQ7NSmU7m-UjRpyrrQ2qAUWud6qsSXDZg0n0sv9LV1cH40HJaBfa0eznA/exec";

// Biến toàn cục
let trainingData = [];
let installationData = [];
let myChart = null;
const chartCanvas = document.getElementById("top10Chart");
const chartContainer = document.querySelector(".chart-container");
Chart.register(ChartDataLabels);
// HÀM VẼ BIỂU ĐỒ (ĐÃ NÂNG CẤP VỚI PLUGIN DATALABELS)
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
        // CẤU HÌNH CHO PLUGIN HIỂN THỊ SỐ LIỆU
        datalabels: {
          anchor: "end", // Vị trí của số liệu: ở cuối thanh
          align: "end", // Căn lề: ở cuối thanh (bên ngoài)
          color: "#555", // Màu chữ
          font: {
            weight: "500", // Độ đậm của chữ
          },
          // Định dạng lại số liệu (thêm '%' cho biểu đồ tỷ lệ)
          formatter: function (value) {
            if (datasetLabel.includes("%")) {
              return value + "%";
            }
            return value;
          },
        },
      },
      scales: { x: { beginAtZero: true } },
    },
  });
}

// HÀM CHÍNH: CẬP NHẬT BIỂU ĐỒ DỰA VÀO BỘ LỌC
function updateChart() {
  // ... (Hàm này không có gì thay đổi)
  const chartType = document.getElementById("chartTypeSelect").value;
  const topFilter = document.getElementById("topSelect").value;

  chartContainer.innerHTML = "";
  chartContainer.appendChild(chartCanvas);

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
      chartData.map((row) => row[1]),
      chartData.map((row) => Number(row[2])),
      "Số người tập huấn",
      "Top 10 đơn vị về số người tham gia tập huấn"
    );
  } else if (chartType === "cai-dat") {
    if (installationData.length === 0) {
      chartContainer.innerHTML = "<p>Chưa có dữ liệu cài đặt.</p>";
      return;
    }
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

    if (topFilter === "top-cao-nhat") {
      processedData.sort((a, b) => b.percentage - a.percentage);
    } else {
      processedData.sort((a, b) => a.percentage - b.percentage);
    }
    const chartData = processedData.slice(0, 10);
    createChart(
      chartData.map((item) => item.name),
      chartData.map((item) => item.percentage.toFixed(1)),
      "Tỷ lệ cài đặt (%)",
      "Top 10 đơn vị về tỷ lệ cài đặt ứng dụng (%)"
    );
  }
}

// CHẠY SAU KHI TRANG ĐÃ TẢI XONG
document.addEventListener("DOMContentLoaded", () => {
  // ... (Phần này không có gì thay đổi)
  const chartTypeSelect = document.getElementById("chartTypeSelect");
  const topSelect = document.getElementById("topSelect");
  chartContainer.innerHTML = "<p>Đang tải dữ liệu...</p>";
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
      updateChart();
    })
    .catch((error) => {
      console.error("Lỗi nghiêm trọng khi tải dữ liệu:", error);
      chartContainer.innerHTML = "<p>Đã xảy ra lỗi khi tải dữ liệu.</p>";
    });
  chartTypeSelect.addEventListener("change", updateChart);
  topSelect.addEventListener("change", updateChart);
});
