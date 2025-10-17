// Dán URL Web App mới nhất của bạn vào đây (phải giống với file script.js)
const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwHWKyt9xsIPSkfJGvAJ22TZoPoTbF13tm9M_eaNbA-0l0tIYrR3F7re4L77NFJb8SMLg/exec";
/**
 * Hàm chung để gọi API backend bằng phương thức GET.
 * @param {string} action - Tên hành động cần thực hiện.
 * @param {object} params - Các tham số gửi kèm (ví dụ: { date: '2025-10-17' }).
 */
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
    throw e; // Ném lỗi ra để các hàm khác có thể xử lý
  }
}

/**
 * Tải dữ liệu từ backend dựa trên lựa chọn của người dùng và hiển thị lên bảng.
 */
async function loadTableData() {
  const dataTable = document.getElementById("dataTable"); // Lấy cả thẻ table
  const dataTableBody = document.getElementById("dataTableBody");
  const filterType = document.querySelector(
    'input[name="filterType"]:checked'
  ).value;

  dataTableBody.innerHTML =
    '<tr><td colspan="11" class="text-center">Đang tải dữ liệu...</td></tr>';

  // Xóa dòng tổng cộng cũ (nếu có) trước mỗi lần tải lại
  const existingTfoot = dataTable.querySelector("tfoot");
  if (existingTfoot) {
    existingTfoot.remove();
  }

  let data;

  try {
    if (filterType === "single") {
      const selectedDate = document.getElementById("filterDate").value;
      if (!selectedDate) {
        dataTableBody.innerHTML =
          '<tr><td colspan="11" class="text-center">Vui lòng chọn ngày để xem báo cáo.</td></tr>';
        return;
      }
      data = await callApiGet("getTongHop", { date: selectedDate });
    } else {
      // filterType === 'range'
      const startDate = document.getElementById("startDate").value;
      const endDate = document.getElementById("endDate").value;
      if (!startDate || !endDate) {
        dataTableBody.innerHTML =
          '<tr><td colspan="11" class="text-center">Vui lòng chọn đủ "Từ ngày" và "Đến ngày".</td></tr>';
        return;
      }
      data = await callApiGet("getTongHopRange", { startDate, endDate });
    }

    // --- Hiển thị dữ liệu ---
    dataTableBody.innerHTML = "";
    if (!data || data.length === 0) {
      dataTableBody.innerHTML =
        '<tr><td colspan="11" class="text-center">Không có dữ liệu cho lựa chọn này.</td></tr>';
      return;
    }

    // Khởi tạo mảng để lưu tổng các cột (11 cột)
    const totals = new Array(11).fill(0);

    data.forEach((row) => {
      const tr = dataTableBody.insertRow();
      row.forEach((cell, index) => {
        const td = tr.insertCell();
        td.textContent = cell;

        // Cộng dồn các cột số liệu (từ cột thứ 3 đến cột 11, tương ứng index 2 đến 10)
        if (index >= 2 && index <= 10) {
          totals[index] += Number(cell) || 0;
        }
      });
    });

    // --- Tạo và thêm dòng tổng cộng (tfoot) ---
    const tfoot = dataTable.createTFoot();
    const footerRow = tfoot.insertRow();

    // Ô "Tổng cộng" chiếm 2 cột đầu tiên (STT và Tên đơn vị)
    const totalLabelCell = footerRow.insertCell();
    totalLabelCell.colSpan = 2;
    totalLabelCell.textContent = "Tổng cộng";
    totalLabelCell.style.textAlign = "center";

    // Thêm các ô tổng số cho các cột còn lại
    for (let i = 2; i < totals.length; i++) {
      const totalCell = footerRow.insertCell();
      totalCell.textContent = totals[i].toLocaleString("vi-VN");
    }
  } catch (error) {
    dataTableBody.innerHTML = `<tr><td colspan="11" class="text-center text-danger">Lỗi khi tải dữ liệu!</td></tr>`;
  }
}

/**
 * Kiểm tra và hiển thị danh sách các đơn vị chưa báo cáo trong ngày đã chọn.
 */
async function checkUnreportedUnits() {
  const selectedDateInput = document.getElementById("filterDate");
  const selectedDate = selectedDateInput.value;

  if (!selectedDate) {
    Swal.fire("Thông báo", "Vui lòng chọn ngày để kiểm tra.", "info");
    return;
  }

  Swal.fire({
    title: "Đang kiểm tra...",
    text: "Vui lòng chờ trong giây lát.",
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    },
  });

  try {
    const unreportedUnits = await callApiGet("getUnreportedUnits", {
      date: selectedDate,
    });
    Swal.close();

    if (unreportedUnits.length === 0) {
      Swal.fire(
        "Hoàn tất",
        "Tất cả các đơn vị đã báo cáo trong ngày đã chọn.",
        "success"
      );
    } else {
      const displayDate = selectedDateInput._flatpickr.altInput.value;

      // ========================================================
      // === SỬA LỖI TẠI ĐÂY: Thêm (index + 1) vào đầu mỗi dòng ===
      // ========================================================
      const unitListHtml =
        '<ul class="list-group text-start">' +
        unreportedUnits
          .map(
            (unit, index) =>
              `<li class="list-group-item">${index + 1}. ${unit}</li>`
          )
          .join("") +
        "</ul>";

      Swal.fire({
        // Thêm số lượng vào tiêu đề
        title: `Có ${unreportedUnits.length} đơn vị chưa báo cáo ngày ${displayDate}`,
        html: unitListHtml,
        icon: "warning",
        width: "50em",
      });
    }
  } catch (error) {
    Swal.fire("Lỗi", "Không thể kiểm tra dữ liệu. Vui lòng thử lại.", "error");
  }
}

// --- Chạy các hàm sau khi trang đã tải xong ---
document.addEventListener("DOMContentLoaded", () => {
  // --- Khởi tạo Flatpickr cho các ô chọn ngày ---
  const today = new Date();

  flatpickr("#filterDate", {
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

  // --- Quản lý hiển thị các bộ lọc ---
  const radioButtons = document.querySelectorAll('input[name="filterType"]');
  const singleDayFilter = document.getElementById("singleDayFilter");
  const dateRangeFilter = document.getElementById("dateRangeFilter");

  radioButtons.forEach((radio) => {
    radio.addEventListener("change", (event) => {
      const isSingleDay = event.target.value === "single";
      singleDayFilter.style.display = isSingleDay ? "flex" : "none";
      dateRangeFilter.style.display = isSingleDay ? "none" : "flex";
    });
  });

  // --- Tải dữ liệu ban đầu và gắn sự kiện cho các nút ---
  // Dùng setTimeout để đảm bảo Flatpickr đã kịp khởi tạo và điền ngày mặc định
  setTimeout(loadTableData, 100);

  document
    .getElementById("filterButton")
    .addEventListener("click", loadTableData);
  document
    .getElementById("checkUnreportedBtn")
    .addEventListener("click", checkUnreportedUnits);
});
