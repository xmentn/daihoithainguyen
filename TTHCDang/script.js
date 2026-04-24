const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw5Cb8xP6L8Hk90tU29m1jJifZNHoYoPwMc3P0JrT7m-kRN_C2lS4rD3hEjWG6krGiN/exec";

let myChart;
let allData = { list: [], kehoach: [], taphuan: [] };

$(document).ready(function () {
  loadAllData();

  try {
    $(".select2-db").select2();
  } catch (e) { console.warn("Select2 error:", e); }

  // Logic enable/disable ô nhập kế hoạch
  $('input[name="trangThai"]').change(function () {
    const isCo = $(this).val() === "Có ban hành";
    $("#soHieu, #ngayVanBan").prop("disabled", !isCo).prop("required", isCo);
  });

  // Tự động điền dữ liệu khi chọn Đảng bộ
  $('#kehoachForm select[name="tenDangBo"]').on("change", function () {
    const entry = allData.kehoach.find((k) => k.ten === $(this).val());
    if (entry) {
      $(`input[name="trangThai"][value="${entry.status}"]`).prop("checked", true).trigger("change");
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
    const opts = '<option value="">-- Chọn đảng bộ --</option>' +
      allData.list.map((n) => `<option value="${n}">${n}</option>`).join("");
    $(".select2-db").html(opts).select2().trigger('change');

    // Thống kê Kế hoạch
    const co = allData.kehoach.filter(k => k.status === "Có ban hành").map(k => k.ten);
    const khong = allData.list.filter(db => !co.includes(db));

    $("#countCo").text(co.length);
    $("#countKhong").text(khong.length);
    $("#listCo").html(co.map(n => `<li><i class="fas fa-check text-success"></i> ${n}</li>`).join(""));
    $("#listKhong").html(khong.map(n => `<li><i class="fas fa-times text-danger"></i> ${n}</li>`).join(""));

    // Mặc định hiện Top 5 cao nhất
    applyFilter('top5high');
  } catch (err) { Swal.fire("Lỗi", "Không thể tải dữ liệu.", "error"); }
}

function applyFilter(filterType) {
  $('.filter-btn').removeClass('active');
  $(`button[onclick="applyFilter('${filterType}')"]`).addClass('active');

  let data = [...allData.taphuan];
  let color = "#003366";

  if (filterType === 'top5high') {
    data = data.sort((a, b) => b.soLuong - a.soLuong).slice(0, 5);
    color = "#003366";
  } else {
    data = data.sort((a, b) => a.soLuong - b.soLuong).slice(0, 5);
    color = "#fd7e14";
  }

  renderChart(data, color);
  renderTableTaphuan(data);
}

function renderChart(data, barColor) {
  const ctx = document.getElementById("taphuanChart").getContext("2d");
  if (myChart) myChart.destroy();

  myChart = new Chart(ctx, {
    type: "bar",
    plugins: [ChartDataLabels],
    data: {
      labels: data.map(d => d.ten),
      datasets: [{
        data: data.map(d => d.soLuong),
        backgroundColor: barColor,
        borderRadius: 5
      }]
    },
    options: {
      indexAxis: "y",
      maintainAspectRatio: false,
      layout: { padding: { right: 40 } },
      plugins: {
        legend: { display: false },
        datalabels: { color: barColor, anchor: 'end', align: 'right', font: { weight: 'bold', size: 14 } }
      },
      scales: { x: { beginAtZero: true } }
    }
  });
}

function renderTableTaphuan(data) {
  let html = "";
  let total = 0;
  data.forEach((item, i) => {
    total += Number(item.soLuong);
    html += `<tr><td style="text-align:center">${i + 1}</td><td>${item.ten}</td><td style="text-align:center; font-weight:bold">${item.soLuong}</td></tr>`;
  });
  $("#tableTaphuan tbody").html(html);
  $("#sumTaphuan").text(total);
}

// Xem đơn vị chưa báo cáo tập huấn
$(document).on('click', '#btnChuaBaoCaoTaphuan', function () {
  const daBao = allData.taphuan.map(t => t.ten);
  const chuaBao = allData.list.filter(db => !daBao.includes(db));
  Swal.fire({
    title: `Chưa báo cáo (${chuaBao.length})`,
    html: `<div style="text-align:left; max-height:300px; overflow-y:auto"><ul>${chuaBao.map(n => `<li>${n}</li>`).join("")}</ul></div>`,
    confirmButtonColor: '#003366'
  });
});

// Gửi dữ liệu
$("form").submit(async function (e) {
  e.preventDefault();
  const formData = $(this).serializeArray().reduce((obj, item) => ({ ...obj, [item.name]: item.value }), {});
  formData.action = $(this).attr("id") === "taphuanForm" ? "taphuan" : "kehoach";

  Swal.showLoading();
  try {
    const res = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(formData)
    });
    const resData = await res.json();
    if (resData.status === "success") {
      Swal.fire("Thành công", "Dữ liệu đã được lưu!", "success");
      loadAllData();
    }
  } catch (err) { Swal.fire("Lỗi", "Không thể kết nối máy chủ.", "error"); }
});

function formatDateForInput(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return isNaN(d) ? "" : d.toISOString().split("T")[0];
}