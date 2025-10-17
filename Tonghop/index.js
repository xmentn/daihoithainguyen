// !!! QUAN TRỌNG: Dán URL Web App mới nhất của bạn vào đây
const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwHWKyt9xsIPSkfJGvAJ22TZoPoTbF13tm9M_eaNbA-0l0tIYrR3F7re4L77NFJb8SMLg/exec";
let topUnitsChartInstance = null;

async function callApiGet(action, params = {}) {
  try {
    const url = new URL(SCRIPT_URL);
    url.searchParams.append("action", action);
    for (const key in params) {
      if (params[key]) {
        url.searchParams.append(key, params[key]);
      }
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const result = await res.json();
    if (!result.success) throw new Error(result.message);
    return result.data;
  } catch (e) {
    console.error(`Lỗi khi gọi API:`, e);
    throw e;
  }
}

async function renderTopUnitsChart() {
  const filterType = document.querySelector(
    'input[name="dashboardFilterType"]:checked'
  ).value;
  const chartContainer = document.querySelector(".chart-container");
  chartContainer.innerHTML = '<canvas id="topUnitsChart"></canvas>';
  const ctx = document.getElementById("topUnitsChart").getContext("2d");

  if (topUnitsChartInstance) {
    topUnitsChartInstance.destroy();
  }

  let chartData;
  let chartTitle = "Top 10 đơn vị có số hồ sơ tiếp nhận nhiều nhất";

  try {
    if (filterType === "single") {
      const selectedDate = document.getElementById("dashboardDate").value;
      if (!selectedDate) {
        chartContainer.innerHTML =
          '<p class="text-center">Vui lòng chọn ngày để xem biểu đồ.</p>';
        return;
      }
      chartData = await callApiGet("getDashboardData", { date: selectedDate });
      chartTitle += ` (Ngày ${
        document.getElementById("dashboardDate")._flatpickr.altInput.value
      })`;
    } else {
      // filterType === 'range'
      const startDate = document.getElementById("startDate").value;
      const endDate = document.getElementById("endDate").value;
      if (!startDate || !endDate) {
        chartContainer.innerHTML =
          '<p class="text-center">Vui lòng chọn đủ "Từ ngày" và "Đến ngày".</p>';
        return;
      }
      chartData = await callApiGet("getDashboardDataRange", {
        startDate,
        endDate,
      });
      chartTitle += ` (Từ ${
        document.getElementById("startDate")._flatpickr.altInput.value
      } đến ${document.getElementById("endDate")._flatpickr.altInput.value})`;
    }

    if (chartData.length === 0) {
      chartContainer.innerHTML = `<p class="text-center">Không có dữ liệu cho lựa chọn này.</p>`;
      return;
    }

    const labels = chartData.map((item) => item.unit);
    const dataPoints = chartData.map((item) => item.total);
    Chart.register(ChartDataLabels);
    topUnitsChartInstance = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Số hồ sơ tiếp nhận",
            data: dataPoints,
            backgroundColor: "rgba(54, 162, 235, 0.6)",
            borderColor: "rgba(54, 162, 235, 1)",
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
            font: { size: 16 },
          },
          datalabels: {
            anchor: "end",
            align: "right",
            offset: 8,
            color: "#333",
            font: { weight: "bold" },
            formatter: (value) => value.toLocaleString("vi-VN"),
          },
        },
        scales: {
          x: { beginAtZero: true },
        },
      },
    });
  } catch (error) {
    chartContainer.innerHTML =
      '<p class="text-danger text-center">Lỗi khi tải dữ liệu biểu đồ.</p>';
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // SỬA LỖI: THÊM PHẦN KHỞI TẠO FLATPICKR BỊ THIẾU
  const today = new Date();
  flatpickr("#dashboardDate", {
    altInput: true,
    altFormat: "d/m/Y",
    dateFormat: "Y-m-d",
    defaultDate: today,
  });
  flatpickr("#startDate", {
    altInput: true,
    altFormat: "d/m/Y",
    dateFormat: "Y-m-d",
    defaultDate: today,
  });
  flatpickr("#endDate", {
    altInput: true,
    altFormat: "d/m/Y",
    dateFormat: "Y-m-d",
    defaultDate: today,
  });

  // --- Quản lý hiển thị bộ lọc ---
  const radioButtons = document.querySelectorAll(
    'input[name="dashboardFilterType"]'
  );
  const singleDayFilter = document.getElementById("singleDayFilter");
  const dateRangeFilter = document.getElementById("dateRangeFilter");
  radioButtons.forEach((radio) => {
    radio.addEventListener("change", (event) => {
      const isSingle = event.target.value === "single";
      singleDayFilter.style.display = isSingle ? "flex" : "none";
      dateRangeFilter.style.display = isSingle ? "none" : "flex";
    });
  });

  // --- Gắn sự kiện và tải dữ liệu ban đầu ---
  document
    .getElementById("viewDashboardBtn")
    .addEventListener("click", renderTopUnitsChart);
  setTimeout(renderTopUnitsChart, 100);
});
