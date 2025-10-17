// !!! DÁN URL WEB APP MỚI NHẤT CỦA BẠN VÀO ĐÂY
const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwHWKyt9xsIPSkfJGvAJ22TZoPoTbF13tm9M_eaNbA-0l0tIYrR3F7re4L77NFJb8SMLg/exec";

// --- DOM Elements ---
const donViSelect = document.getElementById("tenDonVi");
const ngayBaoCaoInput = document.getElementById("ngayBaoCao");
const dataForm = document.getElementById("dataForm");
const submitButton = document.getElementById("submitButton");

/**
 * Hàm gọi API backend bằng phương thức GET, có thể gửi nhiều tham số.
 * @param {string} action - Tên hành động cần thực hiện.
 * @param {object} params - Các tham số gửi kèm (ví dụ: { unit: 'Phường A', date: '2025-10-17' }).
 */
async function callApiGet(action, params = {}) {
  try {
    const url = new URL(SCRIPT_URL);
    url.searchParams.append("action", action);
    // Vòng lặp để thêm tất cả các tham số vào URL
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
    console.error(`Lỗi khi gọi API GET:`, e);
    throw e;
  }
}

/**
 * Hàm gọi API backend bằng phương thức POST để ghi dữ liệu.
 * @param {string} action - Tên hành động.
 * @param {object} payload - Dữ liệu cần gửi.
 */
async function callApiPost(action, payload) {
  try {
    const res = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, payload }),
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const result = await res.json();
    if (!result.success && !result.exists) throw new Error(result.message); // Ném lỗi nếu không phải là lỗi "exists"
    return result; // Trả về toàn bộ kết quả để xử lý lỗi "exists"
  } catch (e) {
    console.error(`Lỗi khi gọi API POST:`, e);
    throw e;
  }
}

/**
 * Xóa trắng các ô nhập liệu số liệu trên form.
 */
function clearFormInputs() {
  document.getElementById("slVanBanDang").value = "";
  document.getElementById("slVanBanCQ").value = "";
  document.getElementById("donThu").value = "";
  document.getElementById("hsTiepNhan").value = "";
  document.getElementById("hsGQDungHan").value = "";
  document.getElementById("hsGQQuaHan").value = "";
  document.getElementById("hsDangGQ").value = "";
  document.getElementById("hsChuaGQ").value = "";
  document.getElementById("hsChuaGQQuaHan").value = "";
}

/**
 * Tải dữ liệu đã có và điền vào các ô trên form.
 */
async function fetchAndBindData() {
  const unitName = donViSelect.value;
  const dateStr = ngayBaoCaoInput.value;

  if (!unitName || !dateStr) {
    clearFormInputs();
    return;
  }

  try {
    const reportData = await callApiGet("getSingleReportData", {
      unit: unitName,
      date: dateStr,
    });

    if (reportData && reportData.length > 0) {
      const data = reportData[0];
      document.getElementById("slVanBanDang").value = data[2] || "";
      document.getElementById("slVanBanCQ").value = data[3] || "";
      document.getElementById("donThu").value = data[4] || "";
      document.getElementById("hsTiepNhan").value = data[5] || "";
      document.getElementById("hsGQDungHan").value = data[6] || "";
      document.getElementById("hsGQQuaHan").value = data[7] || "";
      document.getElementById("hsDangGQ").value = data[8] || "";
      document.getElementById("hsChuaGQ").value = data[9] || "";
      document.getElementById("hsChuaGQQuaHan").value = data[10] || "";
    } else {
      clearFormInputs();
    }
  } catch (error) {
    console.error("Lỗi khi tải dữ liệu để binding:", error);
    clearFormInputs();
  }
}

/**
 * Tải danh sách đơn vị và điền vào dropdown.
 */
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

/**
 * Xử lý sự kiện khi người dùng nhấn nút "Lưu Dữ Liệu".
 * @param {Event} event - Sự kiện submit của form.
 * @param {boolean} forceOverwrite - Cờ cho biết có ghi đè dữ liệu hay không.
 */
async function handleFormSubmit(event, forceOverwrite = false) {
  event.preventDefault();
  submitButton.disabled = true;
  submitButton.textContent = "Đang xử lý...";

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
    forceOverwrite: forceOverwrite,
  };

  try {
    const result = await callApiPost("appendData", payload);

    if (result.success) {
      Swal.fire({
        icon: "success",
        title: "Thành công!",
        text: result.data,
        timer: 2000,
        showConfirmButton: false,
      }).then(() => {
        window.location.href = "display.html";
      });
    } else if (result.exists) {
      Swal.fire({
        title: "Dữ liệu đã tồn tại",
        text: result.message,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Có, ghi đè!",
        cancelButtonText: "Không, hủy bỏ",
      }).then((dialogResult) => {
        if (dialogResult.isConfirmed) {
          handleFormSubmit(event, true);
        }
      });
    } else {
      throw new Error(result.message || "Lỗi không xác định từ server.");
    }
  } catch (error) {
    Swal.fire({
      icon: "error",
      title: "Lỗi!",
      text: "Không thể lưu dữ liệu. " + error.message,
    });
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Lưu Dữ Liệu";
  }
}

// --- Chạy các hàm sau khi trang đã tải xong ---
document.addEventListener("DOMContentLoaded", () => {
  flatpickr("#ngayBaoCao", {
    altInput: true,
    altFormat: "d/m/Y",
    dateFormat: "Y-m-d",
    defaultDate: "today",
    onChange: function (selectedDates, dateStr, instance) {
      fetchAndBindData();
    },
  });

  loadDonVi();

  donViSelect.addEventListener("change", fetchAndBindData);
  dataForm.addEventListener("submit", handleFormSubmit);
});
