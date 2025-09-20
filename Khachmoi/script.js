const WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbzQyMARvTRvIYOcwfmQqVBHXGGaEiu7MImVtnHhl6LqjgO-kRJ0--DcmrXPZMHJp9hJ/exec";

const tableElement = document.getElementById("delegate-table");
const tableHead = document.querySelector("#delegate-table thead");
const tableBody = document.querySelector("#delegate-table tbody");
const loadingMessage = document.getElementById("loading-message");
const filterButtons = document.querySelectorAll(".filter-btn");
const orgFilterSelect = document.getElementById("org-filter");
let allDelegates = [];
let currentStatusFilter = "all";
let currentOrgFilter = "all";

// --- CẬP NHẬT TIÊU ĐỀ BẢNG (THÊM "VỊ TRÍ GHẾ") ---
const fullHeader = `<tr><th rowspan="2">STT</th><th rowspan="2">Họ và Tên</th><th rowspan="2">Xác nhận</th><th rowspan="2">Vị trí ghế</th><th rowspan="2">Đầu mối liên hệ</th><th colspan="2">Người đi cùng (số lượng)</th><th colspan="2">Thời gian lưu trú</th></tr><tr><th>Cán bộ</th><th>Lái xe</th><th>Từ ngày</th><th>Đến ngày</th></tr>`;
const simpleHeader = `<tr><th>STT</th><th>Họ và Tên</th><th>Xác nhận</th><th>Đầu mối liên hệ</th></tr>`;

function renderTable(data) {
  // Thêm 'uyvien' vào danh sách các bộ lọc dùng giao diện đầy đủ
  const viewType =
    currentStatusFilter === "all" ||
    currentStatusFilter === "Có dự" ||
    currentStatusFilter === "uyvien"
      ? "full"
      : "simple";
  tableHead.innerHTML = viewType === "full" ? fullHeader : simpleHeader;
  tableElement.className = viewType === "full" ? "full-view" : "simple-view";

  tableBody.innerHTML = "";
  const colspan = viewType === "simple" ? 4 : 9; // Cập nhật colspan
  if (data.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="${colspan}" style="text-align:center;">Không có dữ liệu phù hợp.</td></tr>`;
    return;
  }

  data.forEach((delegate, index) => {
    const row = document.createElement("tr");
    let rowContent = "";

    if (viewType === "simple") {
      // Chế độ xem rút gọn không có cột Vị trí ghế
      rowContent = `<td>${index + 1}</td><td>${delegate.daiBieu}</td><td>${
        delegate.xacNhan || "Chưa xác nhận"
      }</td><td>${delegate.dauMoi}</td>`;
    } else {
      // Chế độ xem đầy đủ
      if (delegate.xacNhan === "Có dự") {
        // Thêm ô dữ liệu "Vị trí ghế" để khớp với tiêu đề
        rowContent = `<td>${index + 1}</td><td>${delegate.daiBieu}</td><td>${
          delegate.xacNhan
        }</td><td>${delegate.viTriGhe}</td><td>${delegate.dauMoi}</td><td>${
          delegate.canBo
        }</td><td>${delegate.laiXe}</td><td>${delegate.tuNgay}</td><td>${
          delegate.denNgay
        }</td>`;
      } else {
        // Gộp các cột còn lại
        rowContent = `<td>${index + 1}</td><td>${delegate.daiBieu}</td><td>${
          delegate.xacNhan || "Chưa xác nhận"
        }</td><td colspan="6">${delegate.dauMoi}</td>`;
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

function populateOrgFilter(data) {
  const orgs = [...new Set(data.map((item) => item.donViMoi).filter(Boolean))];
  orgFilterSelect.innerHTML = '<option value="all">Tất cả đơn vị</option>';
  orgs.sort().forEach((org) => {
    const option = document.createElement("option");
    option.value = org;
    option.textContent = org;
    orgFilterSelect.appendChild(option);
  });
}

function applyFiltersAndRender() {
  let filteredData = allDelegates;
  if (currentOrgFilter !== "all") {
    filteredData = filteredData.filter((d) => d.donViMoi === currentOrgFilter);
  }
  updateSummary(filteredData);

  if (currentStatusFilter === "pending") {
    filteredData = filteredData.filter(
      (d) => d.xacNhan === "" || d.xacNhan === null
    );
  } else if (currentStatusFilter === "uyvien") {
    filteredData = filteredData.filter(
      (d) =>
        d.xacNhan === "Có dự" &&
        ((d.daiBieu.includes("Ủy viên Ban Chấp hành Trung ương Đảng") &&
          !d.daiBieu.includes(
            "nguyên Ủy viên Ban Chấp hành Trung ương Đảng"
          )) ||
          d.daiBieu.includes("dự khuyết"))
    );
  } else if (currentStatusFilter !== "all") {
    filteredData = filteredData.filter(
      (d) => d.xacNhan === currentStatusFilter
    );
  }

  renderTable(filteredData);
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    filterButtons.forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active");
    currentStatusFilter = button.dataset.filter;
    applyFiltersAndRender();
  });
});

orgFilterSelect.addEventListener("change", (e) => {
  currentOrgFilter = e.target.value;
  applyFiltersAndRender();
});

document.addEventListener("DOMContentLoaded", () => {
  fetch(WEB_APP_URL)
    .then((response) => response.json())
    .then((data) => {
      allDelegates = data;
      loadingMessage.style.display = "none";
      populateOrgFilter(allDelegates);
      applyFiltersAndRender();
    })
    .catch((error) => {
      console.error("Lỗi khi lấy dữ liệu:", error);
      loadingMessage.textContent = "Đã xảy ra lỗi khi tải dữ liệu.";
    });
});
