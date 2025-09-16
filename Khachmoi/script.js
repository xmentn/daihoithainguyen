// ✅ QUAN TRỌNG: Dán URL ứng dụng web bạn đã sao chép ở Bước 1 vào đây
const WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbzQyMARvTRvIYOcwfmQqVBHXGGaEiu7MImVtnHhl6LqjgO-kRJ0--DcmrXPZMHJp9hJ/exec";

// Các biến để lưu trữ DOM element và dữ liệu
const tableBody = document.querySelector("#delegate-table tbody");
const loadingMessage = document.getElementById("loading-message");
const filterButtons = document.querySelectorAll(".filter-btn");
let allDelegates = []; // Mảng để lưu trữ toàn bộ dữ liệu gốc

// Hàm để hiển thị dữ liệu lên bảng
function renderTable(data) {
  tableBody.innerHTML = ""; // Xóa dữ liệu cũ
  if (data.length === 0) {
    tableBody.innerHTML =
      '<tr><td colspan="7" style="text-align:center;">Không có dữ liệu phù hợp.</td></tr>';
    return;
  }
  data.forEach((delegate) => {
    const row = document.createElement("tr");
    row.innerHTML = `
            <td>${delegate.stt}</td>
            <td>${delegate.daiBieu}</td>
            <td>${delegate.xacNhan}</td>
            <td>${delegate.canBo}</td>
            <td>${delegate.laiXe}</td>
            <td>${delegate.tuNgay}</td>
            <td>${delegate.denNgay}</td>
        `;
    tableBody.appendChild(row);
  });
}

// Hàm để tính toán và cập nhật các chỉ số tổng hợp
function updateSummary(data) {
  document.getElementById("total-invited").textContent = data.length;
  document.getElementById("total-confirmed").textContent = data.filter(
    (d) => d.xacNhan === "Có dự"
  ).length;
  document.getElementById("total-not-attending").textContent = data.filter(
    (d) => d.xacNhan === "Không dự"
  ).length;
  document.getElementById("total-pending").textContent = data.filter(
    (d) => d.xacNhan === "" || d.xacNhan === null
  ).length;
}

// Lắng nghe sự kiện click trên các nút lọc
filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    // Bỏ active tất cả các nút
    filterButtons.forEach((btn) => btn.classList.remove("active"));
    // Thêm active cho nút được click
    button.classList.add("active");

    const filter = button.dataset.filter;
    let filteredData;

    if (filter === "all") {
      filteredData = allDelegates;
    } else if (filter === "pending") {
      filteredData = allDelegates.filter(
        (d) => d.xacNhan === "" || d.xacNhan === null
      );
    } else {
      filteredData = allDelegates.filter((d) => d.xacNhan === filter);
    }
    renderTable(filteredData);
  });
});

// Lấy dữ liệu từ Google Sheet API khi trang được tải
document.addEventListener("DOMContentLoaded", () => {
  fetch(WEB_APP_URL)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      allDelegates = data; // Lưu dữ liệu gốc
      loadingMessage.style.display = "none"; // Ẩn thông báo tải
      renderTable(allDelegates); // Hiển thị toàn bộ danh sách ban đầu
      updateSummary(allDelegates); // Cập nhật các chỉ số
    })
    .catch((error) => {
      console.error("Lỗi khi lấy dữ liệu:", error);
      loadingMessage.textContent =
        "Đã xảy ra lỗi khi tải dữ liệu. Vui lòng kiểm tra lại URL hoặc thử lại sau.";
      loadingMessage.style.color = "red";
    });
});
