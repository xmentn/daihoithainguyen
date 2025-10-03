const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxfvE3oRILvgdQ7NSmU7m-UjRpyrrQ2qAUWud6qsSXDZg0n0sv9LV1cH40HJaBfa0eznA/exec";
// Biến toàn cục
let trainingData = [];
let installationData = [];
let myChart = null;
const chartCanvas = document.getElementById("top10Chart");
const chartContainer = document.querySelector(".chart-container");
let overallPercentageStatEl;
let statsGridEl; // Thêm biến cho cả khối thống kê

// Đăng ký plugin hiển thị số liệu với Chart.js
Chart.register(ChartDataLabels);

// HÀM VẼ BIỂU ĐỒ
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
        title: { display: true, text: chartTitle },
        datalabels: {
          anchor: "end",
          align: "end",
          color: "#555",
          font: { weight: "500" },
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

// HÀM CẬP NHẬT BIỂU ĐỒ
function updateChart() {
  const chartType = document.getElementById("chartTypeSelect").value;
  const topFilter = document.getElementById("topSelect").value;
  chartContainer.innerHTML = "";
  chartContainer.appendChild(chartCanvas);

  // LOGIC ẨN/HIỆN THẺ THỐNG KÊ
  if (chartType === "cai-dat") {
    statsGridEl.style.display = "flex"; // Hiện thẻ
  } else {
    statsGridEl.style.display = "none"; // Ẩn thẻ
  }

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
  const chartTypeSelect = document.getElementById("chartTypeSelect");
  const topSelect = document.getElementById("topSelect");
  overallPercentageStatEl = document.getElementById("overallPercentageStat");
  statsGridEl = document.querySelector(".stats-grid");

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

        if (installationData.length > 0 && overallPercentageStatEl) {
          const totalMembers = installationData.reduce(
            (sum, row) => sum + Number(row[2] || 0),
            0
          );
          const totalInstalled = installationData.reduce(
            (sum, row) => sum + Number(row[3] || 0),
            0
          );
          const overallPercentage =
            totalMembers > 0
              ? ((totalInstalled / totalMembers) * 100).toFixed(1)
              : 0;
          overallPercentageStatEl.textContent = `${overallPercentage}%`;
        }
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
