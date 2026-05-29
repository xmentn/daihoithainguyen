const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbw5Cb8xP6L8Hk90tU29m1jJifZNHoYoPwMc3P0JrT7m-kRN_C2lS4rD3hEjWG6krGiN/exec";

let myChart;
let allData = { list: [], kehoach: [], taphuan: [] };

$(document).ready(function () {
  loadAllData();

  try {
    $(".select2-db").select2();
  } catch (e) {
    console.warn("Select2 error:", e);
  }

  // Logic enable/disable ô nhập kế hoạch
  $('input[name="trangThai"]').change(function () {
    const isCo = $(this).val() === "Có ban hành";
    $("#soHieu, #ngayVanBan").prop("disabled", !isCo).prop("required", isCo);
  });

  // Tự động điền dữ liệu khi chọn Đảng bộ
  $('#kehoachForm select[name="tenDangBo"]').on("change", function () {
    const entry = allData.kehoach.find((k) => k.ten === $(this).val());
    if (entry) {
      $(`input[name="trangThai"][value="${entry.status}"]`)
        .prop("checked", true)
        .trigger("change");
      $("#soHieu").val(entry.soHieu);
      $("#ngayVanBan").val(formatDateForInput(entry.ngay));
    } else {
      $('input[name="trangThai"]').prop("checked", false);
      $("#soHieu, #ngayVanBan").val("").prop("disabled", true);
    }
  });

  $('#taphuanForm select[name="tenDangBo"]').on("change", function () {
    const entry = allData.taphuan.find((k) => k.ten === $(this).val());
    $("#soNguoi").val(entry ? entry.soLuong : "");
  });
});

function showTab(name) {
  $(".tab-content, .left-content").removeClass("active");
  $(`#tab-${name}, #left-${name}`).addClass("active");
  $(".tab-btn").removeClass("active");
  $(`button[onclick="showTab('${name}')"]`).addClass("active");
}

async function loadAllData() {
  try {
    const res = await fetch(SCRIPT_URL);
    allData = await res.json();

    // Cập nhật Dropdown và ép Select2 nhận dữ liệu mới
    const opts =
      '<option value="">-- Chọn đảng bộ --</option>' +
      allData.list.map((n) => `<option value="${n}">${n}</option>`).join("");
    $(".select2-db").html(opts).select2().trigger("change");

    // Tính toán Thống kê Kế hoạch
    const dsCoBanHanh = [];
    const dsKhongBanHanh = [];
    const donViDaNhapKH = allData.kehoach.map((k) => k.ten);

    allData.kehoach.forEach((k) => {
      if (k.status === "Có ban hành") dsCoBanHanh.push(k.ten);
      else dsKhongBanHanh.push(k.ten + " (Báo cáo: Không ban hành)");
    });

    allData.list.forEach((db) => {
      if (!donViDaNhapKH.includes(db))
        dsKhongBanHanh.push(db + " (Chưa báo cáo)");
    });

    // Cập nhật số lượng
    $("#countCo").text(dsCoBanHanh.length);
    $("#countKhong").text(dsKhongBanHanh.length);

    // Cập nhật Danh sách chữ
    const listCoHTML =
      dsCoBanHanh.length > 0
        ? dsCoBanHanh
            .map(
              (db) =>
                `<li><i class="fas fa-check text-success"></i> ${db}</li>`,
            )
            .join("")
        : "<li>Chưa có đảng bộ nào ban hành.</li>";

    const listKhongHTML =
      dsKhongBanHanh.length > 0
        ? dsKhongBanHanh
            .map(
              (db) => `<li><i class="fas fa-times text-danger"></i> ${db}</li>`,
            )
            .join("")
        : "<li>Tất cả đã ban hành!</li>";

    $("#listCo").html(listCoHTML);
    $("#listKhong").html(listKhongHTML);

    // Render Biểu đồ
    renderChart(allData.taphuan);
    renderTableTaphuan(allData.taphuan);
  } catch (err) {
    Swal.fire("Lỗi tải dữ liệu", err.message, "error");
  }
}

function renderChart(data) {
  const ctx = document.getElementById("taphuanChart").getContext("2d");
  if (myChart) myChart.destroy();

  myChart = new Chart(ctx, {
    type: "bar",
    plugins: [ChartDataLabels],
    data: {
      labels: sorted.map((d) => d.ten),
      datasets: [
        {
          label: "Số người tập huấn",
          data: sorted.map((d) => d.soLuong),
          backgroundColor: "#da251d",
          borderRadius: 5,
        },
      ],
    },
    options: {
      indexAxis: "y",
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
    },
  });
}

// Xem đơn vị chưa báo cáo tập huấn
$(document).on("click", "#btnChuaBaoCaoTaphuan", function () {
  const daBao = allData.taphuan.map((t) => t.ten);
  const chuaBao = allData.list.filter((db) => !daBao.includes(db));
  Swal.fire({
    title: `Chưa báo cáo (${chuaBao.length})`,
    html: `<div style="text-align:left; max-height:300px; overflow-y:auto"><ul>${chuaBao.map((n) => `<li>${n}</li>`).join("")}</ul></div>`,
    confirmButtonColor: "#003366",
  });
});

// Gửi dữ liệu
$("form").submit(async function (e) {
  e.preventDefault();
  const formData = $(this)
    .serializeArray()
    .reduce((obj, item) => ({ ...obj, [item.name]: item.value }), {});
  formData.action =
    $(this).attr("id") === "taphuanForm" ? "taphuan" : "kehoach";

  Swal.showLoading();
  try {
    const res = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(formData),
    });
    const resData = await res.json();
    if (resData.status === "success") {
      Swal.fire("Thành công", "Dữ liệu đã được lưu!", "success");
      loadAllData();
    }
  } catch (err) {
    Swal.fire("Lỗi", "Không thể kết nối máy chủ.", "error");
  }
});

function formatDateForInput(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return isNaN(d) ? "" : d.toISOString().split("T")[0];
}
// Hàm render bảng chi tiết Tập huấn
function renderTableTaphuan(data) {
  const tbody = document.querySelector("#tableTaphuan tbody");
  const tfootTotal = document.getElementById("sumTaphuan");

  // Làm sạch bảng cũ
  tbody.innerHTML = "";

  if (!data || data.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="3" style="text-align:center;">Chưa có đơn vị nào báo cáo</td></tr>';
    tfootTotal.textContent = "0";
    return;
  }

  let total = 0;
  let rowsHTML = "";

  // Sắp xếp danh sách theo Tên đơn vị (A-Z) để dễ tìm
  const sortedData = [...data].sort((a, b) => a.ten.localeCompare(b.ten));

  sortedData.forEach((item, index) => {
    const soNguoi = Number(item.soLuong) || 0;
    total += soNguoi;

    rowsHTML += `
          <tr>
              <td style="text-align: center;">${index + 1}</td>
              <td>${item.ten}</td>
              <td style="text-align: center; font-weight: bold;">${soNguoi}</td>
          </tr>
      `;
  });

  // Đổ HTML vào tbody và cập nhật ô Tổng
  tbody.innerHTML = rowsHTML;
  tfootTotal.textContent = total;
}
