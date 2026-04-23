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
    renderChart(allData.taphuan);
    renderTableTaphuan(allData.taphuan);
  } catch (err) {
    Swal.fire("Lỗi tải dữ liệu", err.message, "error");
  }
}

function renderChart(data) {
  const ctx = document.getElementById("taphuanChart").getContext("2d");
  if (myChart) myChart.destroy();

  const sorted = [...data].sort((a, b) => b.soLuong - a.soLuong).slice(0, 10);

  myChart = new Chart(ctx, {
    type: "bar",
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
