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
  const criteriaSelect = document.getElementById("chartCriteria");
  const rankingSelect = document.getElementById("chartRanking");
  const criteria = criteriaSelect.value;
  const ranking = rankingSelect.value;

  const chartContainer = document.querySelector(".chart-container");
  chartContainer.innerHTML = '<canvas id="topUnitsChart"></canvas>';
  const ctx = document.getElementById("topUnitsChart").getContext("2d");

  if (topUnitsChartInstance) {
    topUnitsChartInstance.destroy();
  }

  let apiParams = { criteria, ranking, filterType };
  let chartTitle = `${
    rankingSelect.options[rankingSelect.selectedIndex].text
  } về ${criteriaSelect.options[criteriaSelect.selectedIndex].text}`;
  let dataLabel = "";

  if (filterType === "single") {
    const selectedDate = document.getElementById("dashboardDate").value;
    if (!selectedDate) {
      chartContainer.innerHTML =
        '<p class="text-center">Vui lòng chọn ngày để xem biểu đồ.</p>';
      return;
    }
    apiParams.date = selectedDate;
    chartTitle += ` (Ngày ${
      document.getElementById("dashboardDate")._flatpickr.altInput.value
    })`;
  } else {
    // 'range'
    const startDate = document.getElementById("startDate").value;
    const endDate = document.getElementById("endDate").value;
    if (!startDate || !endDate) {
      chartContainer.innerHTML =
        '<p class="text-center">Vui lòng chọn đủ "Từ ngày" và "Đến ngày".</p>';
      return;
    }
    apiParams.startDate = startDate;
    apiParams.endDate = endDate;
    chartTitle += ` (Từ ${
      document.getElementById("startDate")._flatpickr.altInput.value
    } đến ${document.getElementById("endDate")._flatpickr.altInput.value})`;
  }

  if (criteria === "on_time_rate") {
    dataLabel = "Tỷ lệ đúng hạn (%)";
  } else if (criteria === "overdue_rate") {
    dataLabel = "Tỷ lệ quá hạn (%)";
  } else {
    dataLabel = "Số lượng";
  }

  try {
    const chartData = await callApiGet("getDashboardChartData", apiParams);

    if (!chartData || chartData.length === 0) {
      chartContainer.innerHTML = `<p class="text-center">Không có dữ liệu cho lựa chọn này.</p>`;
      return;
    }

    const labels = chartData.map((item) => item.unit);
    const dataPoints = chartData.map((item) => item.value);

    Chart.register(ChartDataLabels);

    topUnitsChartInstance = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: dataLabel,
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
          title: { display: true, text: chartTitle, font: { size: 16 } },
          datalabels: {
            anchor: "end",
            align: "right",
            offset: 8,
            color: "#333",
            font: { weight: "bold" },
            formatter: (value) => {
              let formattedValue = value.toLocaleString("vi-VN", {
                maximumFractionDigits: 2,
              });
              if (criteria === "on_time_rate" || criteria === "overdue_rate") {
                return `${formattedValue} %`;
              }
              return formattedValue;
            },
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

  document
    .getElementById("viewDashboardBtn")
    .addEventListener("click", renderTopUnitsChart);
  setTimeout(renderTopUnitsChart, 100);
});
