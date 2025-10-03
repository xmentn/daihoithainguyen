const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxfvE3oRILvgdQ7NSmU7m-UjRpyrrQ2qAUWud6qsSXDZg0n0sv9LV1cH40HJaBfa0eznA/exec";

// Biến toàn cục
let myChart = null;
const chartCanvas = document.getElementById("top10Chart");
const chartContainer = document.querySelector(".chart-container");
let overallPercentageStatEl, statsGridEl, dateFilterContainer, endDateFilter;

// Đăng ký plugin hiển thị số liệu (CHỈ MỘT LẦN)
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
  const endDate = endDateFilter.value;

  if (chartType === "cai-dat") {
    statsGridEl.style.display = "flex";
    dateFilterContainer.style.display = "flex";
  } else {
    statsGridEl.style.display = "none";
    dateFilterContainer.style.display = "none";
  }

  chartContainer.innerHTML = "<p>Đang tải dữ liệu...</p>";

  let url = SCRIPT_URL;
  if (chartType === "tap-huan") {
    url += "?action=getDataTapHuan";
  } else if (chartType === "cai-dat") {
    url += "?action=getDataCaiDat";
    if (endDate) {
      url += `&endDate=${endDate}`;
    }
  } else {
    // Nếu không có loại chart nào được chọn, không làm gì cả
    chartContainer.innerHTML = "<p>Vui lòng chọn loại biểu đồ.</p>";
    return;
  }

  fetch(url)
    .then((response) => response.json())
    .then((result) => {
      if (result.status !== "success") throw new Error(result.message);

      chartContainer.innerHTML = "";
      chartContainer.appendChild(chartCanvas);
      const data = result.data;

      if (chartType === "tap-huan") {
        if (data.length === 0) {
          chartContainer.innerHTML = "<p>Chưa có dữ liệu tập huấn.</p>";
          return;
        }
        let validData = data.filter(
          (row) => row && row[2] && !isNaN(Number(row[2]))
        );
        validData.sort((a, b) =>
          topFilter === "top-cao-nhat"
            ? Number(b[2]) - Number(a[2])
            : Number(a[2]) - Number(b[2])
        );
        const chartData = validData.slice(0, 10);
        createChart(
          chartData.map((row) => row[1]),
          chartData.map((row) => Number(row[2])),
          "Số người tập huấn",
          "Top 10 đơn vị về số người tham gia tập huấn"
        );
      } else if (chartType === "cai-dat") {
        if (data.length > 0 && overallPercentageStatEl) {
          const totalMembers = data.reduce(
            (sum, row) => sum + Number(row[2] || 0),
            0
          );
          const totalInstalled = data.reduce(
            (sum, row) => sum + Number(row[3] || 0),
            0
          );
          const overallPercentage =
            totalMembers > 0
              ? ((totalInstalled / totalMembers) * 100).toFixed(1)
              : 0;
          overallPercentageStatEl.textContent = `${overallPercentage}%`;
        }

        if (data.length === 0) {
          chartContainer.innerHTML = "<p>Chưa có dữ liệu cài đặt.</p>";
          return;
        }
        let processedData = data
          .map((row) => {
            const totalMembers = Number(row[2] || 0);
            const installedMembers = Number(row[3] || 0);
            const percentage =
              totalMembers > 0 ? (installedMembers / totalMembers) * 100 : 0;
            return { name: row[1], percentage: percentage };
          })
          .filter((item) => !isNaN(item.percentage));
        processedData.sort((a, b) =>
          topFilter === "top-cao-nhat"
            ? b.percentage - a.percentage
            : a.percentage - b.percentage
        );
        const chartData = processedData.slice(0, 10);
        createChart(
          chartData.map((item) => item.name),
          chartData.map((item) => item.percentage.toFixed(1)),
          "Tỷ lệ cài đặt (%)",
          "Top 10 đơn vị về tỷ lệ cài đặt ứng dụng (%)"
        );
      }
    })
    .catch((error) => {
      console.error("Lỗi khi tải dữ liệu:", error);
      chartContainer.innerHTML = "<p>Đã xảy ra lỗi khi tải dữ liệu.</p>";
    });
}

document.addEventListener("DOMContentLoaded", () => {
  const chartTypeSelect = document.getElementById("chartTypeSelect");
  const topSelect = document.getElementById("topSelect");
  overallPercentageStatEl = document.getElementById("overallPercentageStat");
  statsGridEl = document.querySelector(".stats-grid");
  dateFilterContainer = document.getElementById("dateFilterContainer");
  endDateFilter = document.getElementById("endDateFilter");

  endDateFilter.valueAsDate = new Date();
  updateChart();

  chartTypeSelect.addEventListener("change", updateChart);
  topSelect.addEventListener("change", updateChart);
  endDateFilter.addEventListener("change", updateChart);
});
