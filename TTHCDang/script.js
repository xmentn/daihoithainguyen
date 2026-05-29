// Dán URL Web App chuẩn xác của anh vào đây
const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxyuvhGbONlWW9VWoZoIk-NpqLOA1peWPfaXdPiov35_Do4CAkq1ac-NH2NUlE8QY3w/exec";

let myChart;
let allData = { list: [], kehoach: [], taphuan: [] };

$(document).ready(function () {
  // 1. Tải dữ liệu
  loadAllData();

  // 2. Kích hoạt Select2 (Bọc try/catch phòng trình duyệt chặn)
  try {
    $(".select2-db").select2();
  } catch (error) {
    console.warn("Select2 error:", error);
  }

  // 3. Logic: Ẩn/Hiện ô nhập liệu ngày tháng
  $('input[name="trangThai"]').change(function () {
    const isCo = $(this).val() === "Có ban hành";
    $("#soHieu, #ngayVanBan").prop("disabled", !isCo).prop("required", isCo);
  });

  // 4. Logic: Tự điền dữ liệu Tab Kế Hoạch
  $('#kehoachForm select[name="tenDangBo"]').on("change", function () {
    const entry = allData.kehoach.find((k) => k.ten === $(this).val());
    if (entry) {
      $(`input[name="trangThai"][value="${entry.status}"]`)
        .prop("checked", true)
        .trigger("change");
      $("#soHieu").val(entry.soHieu);
      $("#ngayVanBan").val(formatDateForInput(entry.ngay));
    } else {
      // Chỉ xóa trắng các ô Trạng thái, Số hiệu, Ngày tháng (Tuyệt đối không dùng reset form)
      $('input[name="trangThai"]').prop("checked", false);
      $("#soHieu").val("").prop("disabled", true).prop("required", false);
      $("#ngayVanBan").val("").prop("disabled", true).prop("required", false);
    }
  });

  // 5. Logic: Tự điền dữ liệu Tab Tập Huấn
  $('#taphuanForm select[name="tenDangBo"]').on("change", function () {
    const entry = allData.taphuan.find((k) => k.ten === $(this).val());
    if (entry) {
      $("#soNguoi").val(entry.soLuong);
    } else {
      $("#soNguoi").val("");
    }
  });
});

// Hàm đồng bộ chuyển Tab (Cả trái và phải)
function showTab(name) {
  // Chuyển nút Tab và Form bên phải
  $(".tab-content").removeClass("active");
  $(`#tab-${name}`).addClass("active");
  $(".tab-btn").removeClass("active");
  $(`button[onclick="showTab('${name}')"]`).addClass("active");

  // Chuyển Khung hiển thị bên trái
  $(".left-content").removeClass("active");
  $(`#left-${name}`).addClass("active");
}

async function loadAllData() {
  try {
    const res = await fetch(SCRIPT_URL);
    allData = await res.json();

    if (allData.error) {
      throw new Error(allData.error);
    }

    // Đổ dữ liệu Dropdown
    const opts =
      '<option value="">-- Chọn đảng bộ --</option>' +
      allData.list.map((n) => `<option value="${n}">${n}</option>`).join("");

    // Vừa chèn dữ liệu, vừa ép Select2 cập nhật lại lõi bên trong
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
   applyFilter('top5high');
  } catch (err) {
    Swal.fire("Lỗi tải dữ liệu", err.message, "error");
  }
}
// Hàm Xử lý Lọc Dữ liệu (Top 5, Top 10, Tất cả)
function applyFilter(filterType) {
  if (!allData || !allData.taphuan) return;

  // Đổi trạng thái nút bấm
  $(".filter-btn").removeClass("active");
  $(`button[onclick="applyFilter('${filterType}')"]`).addClass("active");

  let filteredData = [...allData.taphuan];
  let chartColor = "#003366"; // Mặc định màu xanh chính (Primary)

  if (filterType === "top5high") {
    // Sắp xếp từ cao xuống thấp và lấy 5 ông đầu
    filteredData = filteredData
      .sort((a, b) => b.soLuong - a.soLuong)
      .slice(0, 5);
    chartColor = "#003366"; // Màu xanh đậm trang trọng cho đơn vị dẫn đầu
  } else if (filterType === "top5low") {
    // Sắp xếp từ thấp lên cao và lấy 5 ông đầu
    filteredData = filteredData
      .sort((a, b) => a.soLuong - b.soLuong)
      .slice(0, 5);
    chartColor = "#fd7e14"; // Màu cam cảnh báo (warning) cho đơn vị thấp
  }

  // Cập nhật biểu đồ với màu sắc tương ứng
  renderChart(filteredData, chartColor);
  renderTableTaphuan(filteredData);
}
function renderChart(dataToShow) {
function renderChart(dataToShow, barColor) {
  const ctx = document.getElementById("taphuanChart").getContext("2d");
  if (myChart) myChart.destroy();

  myChart = new Chart(ctx, {
    type: "bar",
    plugins: [ChartDataLabels],
    data: {
      labels: dataToShow.map((d) => d.ten),
      datasets: [{
        label: "Số người tập huấn",
        data: dataToShow.map((d) => d.soLuong),
        backgroundColor: barColor, // Sử dụng màu được truyền vào
        borderRadius: 5,
      }],
    },
    options: {
      indexAxis: "y",
      maintainAspectRatio: false,
      layout: { padding: { right: 50 } },
      plugins: { 
        legend: { display: false },
        datalabels: {
          color: barColor, // Số trên đầu cột cũng đổi màu theo cột
          anchor: 'end',
          align: 'right',
          font: { weight: 'bold', size: 14 }
        }
      },
      scales: { 
        x: { beginAtZero: true } 
      }
    },
  });
}

// Xử lý gửi Form lên Google Sheets
$("form").submit(async function (e) {
  e.preventDefault();
  const formId = $(this).attr("id");
  const isTaphuan = formId === "taphuanForm";
  const formData = $(this)
    .serializeArray()
    .reduce((obj, item) => ({ ...obj, [item.name]: item.value }), {});

  formData.action = isTaphuan ? "taphuan" : "kehoach";

  // Kiểm tra cảnh báo ghi đè
  const exists = (isTaphuan ? allData.taphuan : allData.kehoach).some(
    (d) => (d.ten || d.tenDangBo) === formData.tenDangBo,
  );

  if (exists) {
    const result = await Swal.fire({
      title: "Cập nhật thông tin",
      text: `Đơn vị "${formData.tenDangBo}" đã có dữ liệu. Bạn có muốn lưu thay đổi không?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#003366",
      cancelButtonColor: "#da251d",
      confirmButtonText: "Có, lưu thay đổi",
      cancelButtonText: "Hủy",
    });
    if (!result.isConfirmed) return;
    formData.overwrite = true;
  }

  Swal.showLoading();
  try {
    const res = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8", // Chống lỗi CORS
      },
      body: JSON.stringify(formData),
    });

    const resData = await res.json();

    if (resData.status === "success" || resData.status === "updated") {
      Swal.fire({
        title: "Thành công!",
        text: "Dữ liệu đã được lưu.",
        icon: "success",
        timer: 2000,
      });
      $(this)[0].reset();
      $(".select2-db").val(null).trigger("change");
      if (!isTaphuan) $("#soHieu, #ngayVanBan").prop("disabled", true);
      loadAllData(); // Load lại dữ liệu biểu đồ/danh sách mới
    } else {
      Swal.fire("Lỗi", "Có lỗi từ máy chủ: " + resData.message, "error");
    }
  } catch (err) {
    Swal.fire("Lỗi mạng", "Không thể kết nối đến máy chủ.", "error");
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
// Sự kiện khi bấm nút "Xem đơn vị chưa báo cáo" ở phần Tập huấn
$(document).on("click", "#btnChuaBaoCaoTaphuan", function () {
  if (!allData || !allData.list || !allData.taphuan) return;

  // 1. Lọc ra các đơn vị có trong danh sách tổng nhưng CHƯA CÓ trong danh sách tập huấn
  const donViDaBaoCao = allData.taphuan.map((t) => t.ten);
  const donViChuaBaoCao = allData.list.filter(
    (db) => !donViDaBaoCao.includes(db),
  );

  // 2. Nếu tất cả đã báo cáo
  if (donViChuaBaoCao.length === 0) {
    Swal.fire({
      title: "Tuyệt vời!",
      text: "Tất cả các đơn vị đều đã báo cáo tập huấn.",
      icon: "success",
      confirmButtonColor: "#003366",
    });
    return;
  }

  // 3. Nếu có đơn vị chưa báo cáo -> Tạo danh sách HTML
  const listHTML = `
      <div style="text-align: left; max-height: 350px; overflow-y: auto; padding: 10px; border: 1px solid #eee; border-radius: 5px; background: #f9f9f9;">
          <ul style="padding-left: 20px; margin: 0; line-height: 1.8;">
              ${donViChuaBaoCao.map((db) => `<li>${db}</li>`).join("")}
          </ul>
      </div>
  `;

  // 4. Hiển thị Pop-up SweetAlert2
  Swal.fire({
    title: `Chưa báo cáo (${donViChuaBaoCao.length} đơn vị)`,
    html: listHTML,
    icon: "info",
    confirmButtonColor: "#003366",
    confirmButtonText: "Đóng",
    width: "500px",
  });
});
