// !!! DÁN URL WEB APP MỚI NHẤT CỦA BẠN VÀO ĐÂY
const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwHWKyt9xsIPSkfJGvAJ22TZoPoTbF13tm9M_eaNbA-0l0tIYrR3F7re4L77NFJb8SMLg/exec";
// --- DOM Elements ---
const donViSelect = document.getElementById("tenDonVi");
const dataForm = document.getElementById("dataForm");
const submitButton = document.getElementById("submitButton");

// Hàm gọi API bằng GET để lấy danh sách đơn vị
async function callApiGet(action) {
  try {
    const url = `${SCRIPT_URL}?action=${action}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const result = await res.json();
    if (!result.success) throw new Error(result.message);
    return result.data;
  } catch (e) {
    console.error(`Lỗi khi gọi GET action=${action}:`, e);
    throw e;
  }
}

// Hàm gọi API bằng POST để ghi dữ liệu
async function callApiPost(action, payload) {
  try {
    const res = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, payload }),
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const result = await res.json();
    if (!result.success) throw new Error(result.message);
    return result.data;
  } catch (e) {
    console.error(`Lỗi khi gọi POST action=${action}:`, e);
    throw e;
  }
}

// --- Các hàm logic cho form ---

async function loadDonVi() {
  try {
    const donViList = await callApiGet("getDonVi");
    donViSelect.innerHTML = '<option value="">-- Chọn đơn vị --</option>';
    donViList.forEach((donVi) => {
      donViSelect.add(new Option(donVi, donVi));
    });
  } catch (error) {
    Swal.fire({
      icon: "error",
      title: "Lỗi!",
      text: "Không thể tải danh sách đơn vị. Vui lòng thử lại.",
    });
  }
}

async function handleFormSubmit(event, forceOverwrite = false) {
  event.preventDefault();
  submitButton.disabled = true;
  submitButton.textContent = "Đang kiểm tra...";

  // Thu thập dữ liệu từ form
  const payload = {
    tenDonVi: document.getElementById("tenDonVi").value,
    ngayBaoCao: document.getElementById("ngayBaoCao").value,
    slVanBanDang: document.getElementById("slVanBanDang").value,
    slVanBanCQ: document.getElementById("slVanBanCQ").value,
    donThu: document.getElementById("donThu").value,
    hsTiepNhan: document.getElementById("hsTiepNhan").value,
    hsGQDungHan: document.getElementById("hsGQDungHan").value,
    hsGQQuaHan: document.getElementById("hsGQQuaHan").value,
    hsDangGQ: document.getElementById("hsDangGQ").value,
    hsChuaGQ: document.getElementById("hsChuaGQ").value,
    hsChuaGQQuaHan: document.getElementById("hsChuaGQQuaHan").value,
    forceOverwrite: forceOverwrite, // Thêm cờ ghi đè
  };

  try {
    const message = await callApiPost("appendData", payload);
    // Nếu thành công -> hiển thị thông báo và chuyển trang
    Swal.fire({
      icon: "success",
      title: "Thành công!",
      text: message,
      timer: 2000,
      showConfirmButton: false,
    }).then(() => {
      window.location.href = "display.html";
    });
  } catch (error) {
    // Xử lý lỗi đặc biệt: Dữ liệu đã tồn tại
    if (error.message.includes("exists: true")) {
      const parsedError = JSON.parse(
        error.message.replace("exists: true, ", "")
      );
      Swal.fire({
        title: "Dữ liệu đã tồn tại",
        text: parsedError.message,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Có, ghi đè!",
        cancelButtonText: "Không, hủy bỏ",
      }).then((result) => {
        if (result.isConfirmed) {
          // Nếu người dùng đồng ý -> gọi lại hàm với cờ ghi đè = true
          handleFormSubmit(event, true);
        }
      });
    } else {
      // Các lỗi khác
      Swal.fire({
        icon: "error",
        title: "Lỗi!",
        text: "Không thể lưu dữ liệu.",
      });
    }
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Lưu Dữ Liệu";
  }
}

// Cập nhật Event Listener
document.addEventListener("DOMContentLoaded", () => {
  // THÊM VÀO ĐỂ KHỞI TẠO FLATPICKR
  flatpickr("#ngayBaoCao", {
    altInput: true, // Hiển thị định dạng thân thiện cho người dùng
    altFormat: "d/m/Y", // Định dạng hiển thị dd/MM/yyyy
    dateFormat: "Y-m-d", // Định dạng gửi đi cho backend YYYY-MM-DD
    defaultDate: "today", // Mặc định là ngày hôm nay
  });

  loadDonVi();
});

dataForm.addEventListener("submit", handleFormSubmit);
