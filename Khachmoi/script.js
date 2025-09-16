const WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbzQyMARvTRvIYOcwfmQqVBHXGGaEiu7MImVtnHhl6LqjgO-kRJ0--DcmrXPZMHJp9hJ/exec";

// Các biến để lưu trữ DOM element và dữ liệu
const tableElement = document.getElementById("delegate-table");
const tableHead = document.querySelector("#delegate-table thead");
const tableBody = document.querySelector("#delegate-table tbody");
const loadingMessage = document.getElementById("loading-message");
const filterButtons = document.querySelectorAll(".filter-btn");
let allDelegates = [];

// --- ĐỊNH NGHĨA SẴN 2 LOẠI TIÊU ĐỀ BẢNG ---

const fullHeader = `
    <tr>
        <th rowspan="2">STT</th>
        <th rowspan="2">Họ và Tên</th>
        <th rowspan="2">Xác nhận</th>
        <th colspan="2">Người đi cùng (số lượng)</th>
        <th colspan="2">Thời gian lưu trú</th>
    </tr>
    <tr>
        <th>Cán bộ</th>
        <th>Lái xe</th>
        <th>Từ ngày</th>
        <th>Đến ngày</th>
    </tr>
`;

const simpleHeader = `
    <tr>
        <th>STT</th>
        <th>Họ và Tên</th>
        <th>Xác nhận</th>
    </tr>
`;

// --- CÁC HÀM XỬ LÝ ---

function renderTable(data, viewType) {
  tableBody.innerHTML = "";
  const colspan = viewType === "simple" ? 3 : 7;
  if (data.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="${colspan}" style="text-align:center;">Không có dữ liệu phù hợp.</td></tr>`;
    return;
  }

  data.forEach((delegate, index) => {
    const row = document.createElement("tr");
    let rowContent = "";

    if (viewType === "simple") {
      rowContent = `
                <td>${index + 1}</td>
                <td>${delegate.daiBieu}</td>
                <td>${delegate.xacNhan || "Chưa xác nhận"}</td>
            `;
    } else {
      // viewType === 'full'
      if (delegate.xacNhan === "Có dự") {
        rowContent = `
                    <td>${index + 1}</td>
                    <td>${delegate.daiBieu}</td>
                    <td>${delegate.xacNhan}</td>
                    <td>${delegate.canBo}</td>
                    <td>${delegate.laiXe}</td>
                    <td>${delegate.tuNgay}</td>
                    <td>${delegate.denNgay}</td>
                `;
      } else {
        rowContent = `
                    <td>${index + 1}</td>
                    <td>${delegate.daiBieu}</td>
                    <td colspan="5">${delegate.xacNhan || "Chưa xác nhận"}</td>
                `;
      }
    }
    row.innerHTML = rowContent;
    tableBody.appendChild(row);
  });
}

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

// --- LẮNG NGHE SỰ KIỆN ---

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    filterButtons.forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active");

    const filter = button.dataset.filter;
    let filteredData;
    let viewType;

    switch (filter) {
      case "all":
        tableHead.innerHTML = fullHeader;
        tableElement.className = "full-view";
        viewType = "full";
        filteredData = allDelegates;
        break;

      case "Có dự":
        tableHead.innerHTML = fullHeader;
        tableElement.className = "full-view";
        viewType = "full";
        filteredData = allDelegates.filter((d) => d.xacNhan === "Có dự");
        break;

      case "Không dự":
        tableHead.innerHTML = simpleHeader;
        tableElement.className = "simple-view";
        viewType = "simple";
        filteredData = allDelegates.filter((d) => d.xacNhan === "Không dự");
        break;

      case "pending":
        tableHead.innerHTML = simpleHeader;
        tableElement.className = "simple-view";
        viewType = "simple";
        filteredData = allDelegates.filter(
          (d) => d.xacNhan === "" || d.xacNhan === null
        );
        break;
    }

    renderTable(filteredData, viewType);
  });
});

document.addEventListener("DOMContentLoaded", () => {
  tableHead.innerHTML = fullHeader;
  tableElement.className = "full-view";

  fetch(WEB_APP_URL)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Lỗi mạng: ${response.statusText}`);
      }
      return response.json();
    })
    .then((data) => {
      allDelegates = data;
      loadingMessage.style.display = "none";
      renderTable(allDelegates, "full");
      updateSummary(allDelegates);
    })
    .catch((error) => {
      console.error("Lỗi khi lấy dữ liệu:", error);
      loadingMessage.textContent =
        "Đã xảy ra lỗi khi tải dữ liệu. Vui lòng kiểm tra lại URL, quyền truy cập của API hoặc nhấn F12 xem lỗi ở Console.";
      loadingMessage.style.color = "red";
    });
});
