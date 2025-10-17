// Dán URL Web App mới nhất của bạn vào đây (phải giống với file script.js)
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

async function loadTableData() {
  const dataTable = document.getElementById("dataTable");
  const dataTableBody = document.getElementById("dataTableBody");
  const filterType = document.querySelector(
    'input[name="filterType"]:checked'
  ).value;

  dataTableBody.innerHTML =
    '<tr><td colspan="11" class="text-center">Đang tải dữ liệu...</td></tr>';

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
      const startDate = document.getElementById("startDate").value;
      const endDate = document.getElementById("endDate").value;
      if (!startDate || !endDate) {
        dataTableBody.innerHTML =
          '<tr><td colspan="11" class="text-center">Vui lòng chọn đủ "Từ ngày" và "Đến ngày".</td></tr>';
        return;
      }
      data = await callApiGet("getTongHopRange", { startDate, endDate });
    }

    dataTableBody.innerHTML = "";
    if (!data || data.length === 0) {
      dataTableBody.innerHTML =
        '<tr><td colspan="11" class="text-center">Không có dữ liệu cho lựa chọn này.</td></tr>';
      return;
    }

    const totals = new Array(11).fill(0);

    data.forEach((row, rowIndex) => {
      const tr = dataTableBody.insertRow();
      const sttCell = tr.insertCell();
      sttCell.textContent = rowIndex + 1;

      for (let i = 1; i < row.length; i++) {
        const cell = row[i];
        const td = tr.insertCell();
        td.textContent = cell;

        if (i >= 2 && i <= 10) {
          totals[i] += Number(cell) || 0;
        }
      }
    });

    const tfoot = dataTable.createTFoot();
    const footerRow = tfoot.insertRow();

    const totalLabelCell = footerRow.insertCell();
    totalLabelCell.colSpan = 2;
    totalLabelCell.textContent = "Tổng cộng";

    for (let i = 2; i < totals.length; i++) {
      const totalCell = footerRow.insertCell();
      totalCell.textContent = totals[i].toLocaleString("vi-VN");
    }
  } catch (error) {
    dataTableBody.innerHTML = `<tr><td colspan="11" class="text-center text-danger">Lỗi khi tải dữ liệu!</td></tr>`;
  }
}

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

/**
 * Hàm mới để xuất dữ liệu ra file Excel
 */
function exportToExcel() {
  const table = document.getElementById("dataTable");

  const firstRow = document.getElementById("dataTableBody").rows[0];
  if (!firstRow || firstRow.cells.length <= 1) {
    Swal.fire("Thông báo", "Không có dữ liệu để xuất file Excel.", "info");
    return;
  }

  const filterType = document.querySelector(
    'input[name="filterType"]:checked'
  ).value;
  let datePart = "";
  if (filterType === "single") {
    datePart = document
      .getElementById("filterDate")
      ._flatpickr.altInput.value.replace(/\//g, "-");
  } else {
    const start = document
      .getElementById("startDate")
      ._flatpickr.altInput.value.replace(/\//g, "-");
    const end = document
      .getElementById("endDate")
      ._flatpickr.altInput.value.replace(/\//g, "-");
    datePart = `Tu_${start}_Den_${end}`;
  }
  const fileName = `BaoCao_TongHop_${datePart}.xlsx`;

  const wb = XLSX.utils.table_to_book(table, { sheet: "Báo cáo tổng hợp" });
  XLSX.writeFile(wb, fileName);
}

// --- Chạy các hàm sau khi trang đã tải xong ---
document.addEventListener("DOMContentLoaded", () => {
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

  document.querySelectorAll('input[name="filterType"]').forEach((radio) => {
    radio.addEventListener("change", (event) => {
      const isSingle = event.target.value === "single";
      document.getElementById("singleDayFilter").style.display = isSingle
        ? "flex"
        : "none";
      document.getElementById("dateRangeFilter").style.display = isSingle
        ? "none"
        : "flex";
    });
  });

  setTimeout(loadTableData, 100);
  document
    .getElementById("filterButton")
    .addEventListener("click", loadTableData);
  document
    .getElementById("checkUnreportedBtn")
    .addEventListener("click", checkUnreportedUnits);
  // Gắn sự kiện cho nút xuất Excel
  document.getElementById("exportBtn").addEventListener("click", exportToExcel);
});
