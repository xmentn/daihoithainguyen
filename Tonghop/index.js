// !!! QUAN TRỌNG: Dán URL Web App mới nhất của bạn vào đây
const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwHWKyt9xsIPSkfJGvAJ22TZoPoTbF13tm9M_eaNbA-0l0tIYrR3F7re4L77NFJb8SMLg/exec";

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

/**
 * Lấy dữ liệu và vẽ biểu đồ Top 10 đơn vị
 */
async function renderTopUnitsChart() {
  try {
    const chartData = await callApiGet("getDashboardData");

    // Tách dữ liệu thành labels (tên đơn vị) và dataPoints (số liệu)
    const labels = chartData.map((item) => item.unit);
    const dataPoints = chartData.map((item) => item.total);

    const ctx = document.getElementById("topUnitsChart").getContext("2d");
    new Chart(ctx, {
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
        indexAxis: "y", // Biến biểu đồ thành dạng bar ngang
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false, // Ẩn chú thích trên đầu
          },
          title: {
            display: true,
            text: "Top 10 đơn vị có số hồ sơ tiếp nhận nhiều nhất",
            font: {
              size: 16,
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
          },
        },
      },
    });
  } catch (error) {
    document.querySelector(".chart-container").innerHTML =
      '<p class="text-danger text-center">Lỗi khi tải dữ liệu biểu đồ.</p>';
  }
}

// Chạy hàm vẽ biểu đồ khi trang đã tải xong
document.addEventListener("DOMContentLoaded", renderTopUnitsChart);
