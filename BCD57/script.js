// ======= THAY ĐƯỜNG LINK WEB APP CỦA BẠN VÀO ĐÂY =======
const API_URL =
  "https://script.google.com/macros/s/AKfycbxALJo-ZR06f9-Z0EELJR5JQcODOwONORWkd9ClwaaZwx83y6THxmhy9kBu2kTQYODn/exec";

let appData = { canbo: [], donvi: [], tonghop: [], huongdan: "" };

document.addEventListener("DOMContentLoaded", () => {
  loadData();
  setupLogicBanChiDao(); // Kích hoạt bộ lắng nghe ẩn/hiện trường
});

// ================= TẢI DỮ LIỆU TỪ GOOGLE SHEET =================
async function loadData() {
  showLoading("Đang tải dữ liệu từ máy chủ...");
  try {
    const response = await fetch(API_URL);
    appData = await response.json();

    initDropdowns();
    renderTable();
  } catch (error) {
    Swal.fire({
      icon: "error",
      title: "Lỗi kết nối",
      text: "Không thể tải dữ liệu! Hãy kiểm tra lại đường link Web App.",
    });
  } finally {
    hideLoading();
  }
}

function initDropdowns() {
  const donviSelect = document.getElementById("donvi");
  donviSelect.innerHTML =
    '<option value="" disabled selected>-- Chọn đơn vị --</option>';
  appData.donvi.forEach((dv) => {
    donviSelect.innerHTML += `<option value="${dv.ten}">${dv.ten}</option>`;
  });

  const filterCanBo = document.getElementById("filterCanBo");
  filterCanBo.innerHTML = '<option value="all">-- Tất cả cán bộ --</option>';
  appData.canbo.forEach((cb) => {
    filterCanBo.innerHTML += `<option value="${cb.ma}">${cb.ten}</option>`;
  });
}

// ================= RENDER BẢNG DỮ LIỆU CHÍNH =================
function renderTable() {
  const tbody = document.getElementById("dataTableBody");
  tbody.innerHTML = "";

  if (appData.tonghop.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">Chưa có dữ liệu nào được nhập.</td></tr>`;
    return;
  }

  appData.tonghop.forEach((item) => {
    let actionButtons = `<button class="btn btn-sm btn-warning fw-bold text-dark me-2 shadow-sm" onclick="editRecord('${item.donvi}')">✏️ Sửa</button>`;
    if (item.noidungdotpha === "Có") {
      actionButtons += `<button class="btn btn-sm btn-info fw-bold text-white shadow-sm" onclick="viewDetails('${item.donvi}')">👁️ Xem</button>`;
    }

    // Căn giữa số thành viên, để trống nếu không có ban chỉ đạo
    const truongBanText =
      item.banchidao === "Không có Ban Chỉ đạo"
        ? `<i class="text-muted">-</i>`
        : item.truongban;
    const soTvText =
      item.banchidao === "Không có Ban Chỉ đạo"
        ? `<i class="text-muted">-</i>`
        : item.sothanhvien;

    tbody.innerHTML += `
            <tr>
                <td class="fw-bold text-primary">${item.donvi}</td>
                <td class="text-center">${truongBanText}</td>
                <td class="text-center">${soTvText}</td>
                <td class="text-center"><span class="badge ${item.noidungdotpha === "Có" ? "bg-success" : "bg-secondary"} px-2 py-1">${item.noidungdotpha}</span></td>
                <td class="text-center">${actionButtons}</td>
            </tr>
        `;
  });
}

// ================= LOGIC ẨN/HIỆN TRƯỜNG DỮ LIỆU =================
function setupLogicBanChiDao() {
  const selectBCD = document.getElementById("banchidao");
  const inputTruongBan = document.getElementById("truongban");
  const inputSoTV = document.getElementById("sothanhvien");

  selectBCD.addEventListener("change", function () {
    if (this.value === "Không có Ban Chỉ đạo") {
      inputTruongBan.disabled = true;
      inputSoTV.disabled = true;
      inputTruongBan.removeAttribute("required");
      inputSoTV.removeAttribute("required");
      inputTruongBan.value = "";
      inputSoTV.value = "";
    } else {
      inputTruongBan.disabled = false;
      inputSoTV.disabled = false;
      inputTruongBan.setAttribute("required", "true");
      inputSoTV.setAttribute("required", "true");
    }
  });
}

// ================= FORM XỬ LÝ (THÊM / SỬA) =================
function showForm() {
  document.getElementById("formSection").style.display = "block";
  document.getElementById("dataForm").reset();
  document.getElementById("donvi").disabled = false;

  // Kích hoạt Event change để mở khóa lại các ô
  document.getElementById("banchidao").dispatchEvent(new Event("change"));

  document.getElementById("action").value = "add";
  document.getElementById("rowIdx").value = "";
  document.getElementById("formTitle").innerText = "Nhập dữ liệu mới";
  document.getElementById("formSection").scrollIntoView();
}

function hideForm() {
  document.getElementById("formSection").style.display = "none";
}

function showHuongDan() {
  const content = appData.huongdan
    ? appData.huongdan.replace(/\n/g, "<br>")
    : "Chưa có nội dung hướng dẫn trên hệ thống.";

  Swal.fire({
    title: "💡 Hướng dẫn nhập liệu",
    html: `<div style="text-align: left; font-size: 15.5px; line-height: 1.6; color: #333;">${content}</div>`,
    icon: "info",
    confirmButtonText: "Đã hiểu",
    confirmButtonColor: "#0d6efd",
    width: "600px",
  });
}

function viewDetails(tenDonVi) {
  const record = appData.tonghop.find((item) => item.donvi === tenDonVi);
  if (!record) return;

  document.getElementById("detailModalTitle").innerText =
    `Chi tiết Đơn vị: ${record.donvi}`;
  document.getElementById("detBanChiDao").innerText = record.banchidao;
  document.getElementById("detTruongBan").innerText =
    record.banchidao === "Không có Ban Chỉ đạo" ? "Không có" : record.truongban;
  document.getElementById("detSoThanhVien").innerText =
    record.banchidao === "Không có Ban Chỉ đạo"
      ? "Không có"
      : record.sothanhvien;

  const motaText = record.mota
    ? record.mota
    : "Không có thông tin mô tả/minh chứng.";
  document.getElementById("detMoTa").innerText = motaText;

  const modal = new bootstrap.Modal(document.getElementById("detailModal"));
  modal.show();
}

function editRecord(tenDonVi) {
  const record = appData.tonghop.find((item) => item.donvi === tenDonVi);
  if (!record) return;

  showForm();
  document.getElementById("formTitle").innerText = "Sửa thông tin: " + tenDonVi;
  document.getElementById("action").value = "update";
  document.getElementById("rowIdx").value = record.rowIdx;

  document.getElementById("donvi").value = record.donvi;
  document.getElementById("donvi").disabled = true;

  document.getElementById("banchidao").value = record.banchidao;
  // Bắn sự kiện change để UI tự khóa/mở 2 ô tùy theo dữ liệu
  document.getElementById("banchidao").dispatchEvent(new Event("change"));

  if (record.banchidao === "Có Ban Chỉ đạo") {
    document.getElementById("truongban").value = record.truongban;
    document.getElementById("sothanhvien").value = record.sothanhvien;
  }

  document.getElementById("noidungdotpha").value = record.noidungdotpha;
  document.getElementById("mota").value = record.mota;
}

// Xử lý Gửi Form
document
  .getElementById("dataForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    const donviElement = document.getElementById("donvi");
    const donvi =
      donviElement.value ||
      donviElement.options[donviElement.selectedIndex].value;
    const action = document.getElementById("action").value;

    if (
      action === "add" &&
      appData.tonghop.some((item) => item.donvi === donvi)
    ) {
      Swal.fire({
        icon: "warning",
        title: "Trùng lặp",
        text: "Đơn vị này đã được nhập liệu!",
      });
      return;
    }

    const confirmResult = await Swal.fire({
      title: "Xác nhận lưu?",
      text: `Lưu thông tin cho đơn vị: ${donvi}`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#0d6efd",
      confirmButtonText: "Đồng ý",
      cancelButtonText: "Hủy",
    });

    if (!confirmResult.isConfirmed) return;

    showLoading("Đang lưu dữ liệu...");

    // Ép rỗng 2 giá trị nếu Không có BCĐ
    const isKhongCoBCD =
      document.getElementById("banchidao").value === "Không có Ban Chỉ đạo";

    const payload = {
      action: action,
      rowIdx: document.getElementById("rowIdx").value,
      donvi: donvi,
      banchidao: document.getElementById("banchidao").value,
      truongban: isKhongCoBCD ? "" : document.getElementById("truongban").value,
      sothanhvien: isKhongCoBCD
        ? ""
        : document.getElementById("sothanhvien").value,
      noidungdotpha: document.getElementById("noidungdotpha").value,
      mota: document.getElementById("mota").value,
    };

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (result.status === "success") {
        hideForm();
        loadData();
        Swal.fire({
          icon: "success",
          title: "Thành công!",
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Lỗi máy chủ",
          text: result.message,
        });
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Lỗi lưu dữ liệu",
        text: "Vui lòng kiểm tra lại kết nối mạng.",
      });
    } finally {
      hideLoading();
    }
  });

// ================= BÁO CÁO TỔNG HỢP =================
function showReportModal() {
  generateReportCanBo();
  generateReportDotPha();
  const modal = new bootstrap.Modal(document.getElementById("reportModal"));
  modal.show();
}

document
  .getElementById("filterCanBo")
  .addEventListener("change", generateReportCanBo);
function generateReportCanBo() {
  const maCanBo = document.getElementById("filterCanBo").value;
  let dsDonViXet = appData.donvi;
  if (maCanBo !== "all")
    dsDonViXet = appData.donvi.filter((dv) => dv.ma == maCanBo);

  let daNhap = [],
    chuaNhap = [];
  dsDonViXet.forEach((dv) => {
    appData.tonghop.find((item) => item.donvi === dv.ten)
      ? daNhap.push(dv.ten)
      : chuaNhap.push(dv.ten);
  });

  document.getElementById("countDaNhap").innerText = daNhap.length;
  document.getElementById("listDaNhap").innerHTML = daNhap.length
    ? daNhap
        .map(
          (ten) =>
            `<li class="list-group-item text-success fw-bold">✓ ${ten}</li>`,
        )
        .join("")
    : `<li class="list-group-item text-muted">Không có</li>`;
  document.getElementById("countChuaNhap").innerText = chuaNhap.length;
  document.getElementById("listChuaNhap").innerHTML = chuaNhap.length
    ? chuaNhap
        .map((ten) => `<li class="list-group-item text-danger">✗ ${ten}</li>`)
        .join("")
    : `<li class="list-group-item text-muted">Không có</li>`;
}

document
  .getElementById("filterDotPha")
  .addEventListener("change", generateReportDotPha);
function generateReportDotPha() {
  const tieuChi = document.getElementById("filterDotPha").value;
  const ketQua = appData.tonghop.filter(
    (item) => item.noidungdotpha === tieuChi,
  );

  document.getElementById("countDotPha").innerText = ketQua.length;
  document.getElementById("listDotPha").innerHTML = ketQua.length
    ? ketQua
        .map(
          (item) =>
            `<li class="list-group-item d-flex justify-content-between align-items-center">${item.donvi} <span class="badge bg-secondary rounded-pill">Trưởng ban: ${item.truongban || "-"}</span></li>`,
        )
        .join("")
    : `<li class="list-group-item text-muted text-center py-3">Không có đơn vị nào.</li>`;
}

// ================= XUẤT FILE PDF =================
function exportPDF() {
  showLoading("Đang tạo tệp PDF...");

  const isCanBoTab = document
    .getElementById("tab-canbo")
    .classList.contains("active");
  let dataToExport = [];
  let dsChuaNhap = [];
  let reportTitle = "";

  if (isCanBoTab) {
    const selectCanBo = document.getElementById("filterCanBo");
    const maCanBo = selectCanBo.value;
    const tenCanBo = selectCanBo.options[selectCanBo.selectedIndex].text;

    reportTitle =
      maCanBo === "all"
        ? "BÁO CÁO: TẤT CẢ ĐƠN VỊ"
        : `BÁO CÁO THEO CÁN BỘ: ${tenCanBo.toUpperCase()}`;

    let dsDonViXet = appData.donvi;
    if (maCanBo !== "all") {
      dsDonViXet = appData.donvi.filter((dv) => dv.ma == maCanBo);
    }
    const tenCacDonVi = dsDonViXet.map((dv) => dv.ten);
    dataToExport = appData.tonghop.filter((item) =>
      tenCacDonVi.includes(item.donvi),
    );
    dsChuaNhap = dsDonViXet
      .filter((dv) => !appData.tonghop.find((item) => item.donvi === dv.ten))
      .map((dv) => dv.ten);
  } else {
    const selectDotPha = document.getElementById("filterDotPha");
    const tieuChi = selectDotPha.value;
    reportTitle = `BÁO CÁO: CÁC ĐƠN VỊ ${tieuChi === "Có" ? "CÓ" : "KHÔNG CÓ"} NỘI DUNG ĐỘT PHÁ`;
    dataToExport = appData.tonghop.filter(
      (item) => item.noidungdotpha === tieuChi,
    );
  }

  const pdfContainer = document.createElement("div");
  pdfContainer.style.padding = "20px";
  pdfContainer.style.fontFamily = "Arial, sans-serif";
  pdfContainer.style.color = "#000";

  let tableRows = dataToExport
    .map((item, index) => {
      const truongBan =
        item.banchidao === "Không có Ban Chỉ đạo" ? "-" : item.truongban;
      const soTV =
        item.banchidao === "Không có Ban Chỉ đạo" ? "-" : item.sothanhvien;
      return `
            <tr style="page-break-inside: avoid;">
                <td style="border: 1px solid #000; padding: 6px; text-align: center;">${index + 1}</td>
                <td style="border: 1px solid #000; padding: 6px; font-weight: bold;">${item.donvi}</td>
                <td style="border: 1px solid #000; padding: 6px;">${item.banchidao}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: center;">${truongBan}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: center;">${soTV}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: center;">${item.noidungdotpha}</td>
                <td style="border: 1px solid #000; padding: 6px;">${item.mota || ""}</td>
            </tr>
        `;
    })
    .join("");

  if (dataToExport.length === 0) {
    tableRows = `<tr><td colspan="7" style="border: 1px solid #000; padding: 15px; text-align: center; font-style: italic;">Chưa có dữ liệu nào được nhập</td></tr>`;
  }

  let htmlContent = `
        <h2 style="text-align: center; margin-bottom: 5px; color: #0d6efd;">THỐNG KÊ DỮ LIỆU BAN CHỈ ĐẠO</h2>
        <h4 style="text-align: center; margin-top: 0;">${reportTitle}</h4>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px;">
            <thead>
                <tr style="background-color: #f2f2f2;">
                    <th style="border: 1px solid #000; padding: 8px; width: 5%;">STT</th>
                    <th style="border: 1px solid #000; padding: 8px; width: 15%;">Đơn vị</th>
                    <th style="border: 1px solid #000; padding: 8px; width: 15%;">Ban Chỉ đạo</th>
                    <th style="border: 1px solid #000; padding: 8px; width: 15%;">Trưởng Ban</th>
                    <th style="border: 1px solid #000; padding: 8px; width: 8%;">Số TV</th>
                    <th style="border: 1px solid #000; padding: 8px; width: 10%;">Đột phá</th>
                    <th style="border: 1px solid #000; padding: 8px; width: 32%;">Mô tả / Minh chứng</th>
                </tr>
            </thead>
            <tbody>
                ${tableRows}
            </tbody>
        </table>
    `;

  if (isCanBoTab && dsChuaNhap.length > 0) {
    htmlContent += `
            <div style="margin-top: 25px; font-size: 14px;">
                <p style="font-weight: bold; color: #dc3545; margin-bottom: 5px;">* Các đơn vị chưa nhập thông tin (${dsChuaNhap.length} đơn vị):</p>
                <p style="font-style: italic;">${dsChuaNhap.join(", ")}</p>
            </div>
        `;
  }

  pdfContainer.innerHTML = htmlContent;

  const opt = {
    margin: 0.4,
    filename: "Bao_Cao_BCĐ.pdf",
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: "in", format: "a4", orientation: "landscape" },
  };

  html2pdf()
    .from(pdfContainer)
    .set(opt)
    .save()
    .then(() => {
      hideLoading();
      Swal.fire({
        icon: "success",
        title: "Hoàn tất",
        text: "Đã tải file PDF xuống máy của bạn!",
        timer: 2000,
        showConfirmButton: false,
      });
    })
    .catch((err) => {
      hideLoading();
      Swal.fire({
        icon: "error",
        title: "Lỗi",
        text: "Không thể xuất file PDF lúc này.",
      });
    });
}

function showLoading(text) {
  document.getElementById("loading-text").innerText = text;
  document.getElementById("loading").style.display = "flex";
}
function hideLoading() {
  document.getElementById("loading").style.display = "none";
}
