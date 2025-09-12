document.addEventListener("DOMContentLoaded", function () {
  // Không cần gọi API nữa, sẽ đọc từ cache
  console.log("Đang đọc dữ liệu Đoàn chủ tịch từ cache trình duyệt...");

  const cachedDataString = sessionStorage.getItem("soDoChupAnhData");
  const container = document.querySelector(".seating-chart");

  if (cachedDataString) {
    const allChupAnhData = JSON.parse(cachedDataString);
    const doanChuTichData = allChupAnhData.Doanchutich;

    if (doanChuTichData) {
      renderChart(doanChuTichData);
    } else {
      container.innerHTML = `<p style="color:red;">Không tìm thấy dữ liệu 'Doanchutich' trong cache.</p>`;
    }
  } else {
    container.innerHTML = `<p style="color:red;">Không có dữ liệu. Vui lòng quay lại trang chủ để tải lại.</p>`;
  }
});
/**
 * Hàm mới để sắp xếp các ghế theo kiểu chẵn trái, lẻ phải, số nhỏ ở giữa
 * @param {Array} delegates - Mảng đại biểu của một hàng
 * @returns {Array} - Mảng đại biểu đã được sắp xếp
 */
function sortSeatsCenterOut(delegates) {
  // Sắp xếp số chẵn GIẢM DẦN (6, 4, 2)
  const evens = delegates
    .filter((d) => d.Vitri % 2 === 0)
    .sort((a, b) => b.Vitri - a.Vitri);

  // Sắp xếp số lẻ TĂNG DẦN (1, 3, 5)
  const odds = delegates
    .filter((d) => d.Vitri % 2 !== 0)
    .sort((a, b) => a.Vitri - b.Vitri);

  // Ghép mảng chẵn vào trước, mảng lẻ vào sau
  return [...evens, ...odds];
}

function renderChart(delegates) {
  const row1Container = document.getElementById("row-1");
  const row2Container = document.getElementById("row-2");

  // 1. Lọc đại biểu cho từng hàng (chưa sắp xếp)
  const row1Data = delegates.filter((d) => d.Sohang == "1");
  const row2Data = delegates.filter((d) => d.Sohang == "2");

  // 2. Áp dụng logic sắp xếp mới cho từng hàng
  const sortedRow1 = sortSeatsCenterOut(row1Data);
  const sortedRow2 = sortSeatsCenterOut(row2Data);

  // Hàm để tạo một ghế
  const createSeatElement = (delegate) => {
    const seatDiv = document.createElement("div");
    seatDiv.className = "seat";

    if (delegate.Doituong == "1") {
      seatDiv.classList.add("highlight");
    }

    seatDiv.innerHTML = `
            <div class="seat-position">${delegate.Vitri}</div>
            <div class="seat-name">${delegate.Hoten}</div>
        `;
    return seatDiv;
  };

  // 3. Vẽ các ghế đã được sắp xếp
  sortedRow1.forEach((delegate) => {
    row1Container.appendChild(createSeatElement(delegate));
  });

  sortedRow2.forEach((delegate) => {
    row2Container.appendChild(createSeatElement(delegate));
  });
}
